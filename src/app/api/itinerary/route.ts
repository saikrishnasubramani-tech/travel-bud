import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKeys } from "@/lib/gemini-keys";

type ItineraryRequest = {
  fromPlace?: unknown;
  destination?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  days?: unknown;
  budget?: unknown;
  interests?: unknown;
};

type ValidatedItineraryRequest = {
  fromPlace: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budget: string;
  interests: string[];
};

const travelPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "dailyPlan",
    "foodRecommendations",
    "transportationRecommendations",
    "travelTips",
    "hiddenGems",
    "touristScamsToAvoid",
    "localCustoms",
    "safetyAdvice",
    "emergencyInformation",
    "bestLocalFoods",
    "nearbyPlaces",
    "languageGuide",
    "budgetSummary",
  ],
  properties: {
    dailyPlan: {
      type: "array",
      description:
        "A day-wise itinerary with morning, afternoon, evening, and estimated daily budget.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "day",
          "title",
          "morningActivities",
          "afternoonActivities",
          "eveningActivities",
          "estimatedDailyBudget",
        ],
        properties: {
          day: { type: "integer" },
          title: { type: "string" },
          morningActivities: {
            type: "array",
            items: { type: "string" },
          },
          afternoonActivities: {
            type: "array",
            items: { type: "string" },
          },
          eveningActivities: {
            type: "array",
            items: { type: "string" },
          },
          estimatedDailyBudget: {
            type: "string",
            description:
              "A practical estimate for the day using the user's selected currency and budget. Avoid fake exact pricing.",
          },
        },
      },
    },
    foodRecommendations: {
      type: "array",
      description: "Food recommendations, local dishes, and meal-planning notes.",
      items: { type: "string" },
    },
    transportationRecommendations: {
      type: "array",
      description:
        "Practical transport recommendations for reaching and moving around the destination. Avoid fake live fares or availability.",
      items: { type: "string" },
    },
    travelTips: {
      type: "array",
      description:
        "Useful planning tips covering timing, safety, etiquette, documents, booking checks, and local behavior.",
      items: { type: "string" },
    },
    hiddenGems: {
      type: "array",
      description:
        "Less obvious local places or experiences worth considering. Avoid inventing obscure places if unsure.",
      items: { type: "string" },
    },
    touristScamsToAvoid: {
      type: "array",
      description:
        "Common tourist traps or scam patterns to watch for, phrased cautiously and practically.",
      items: { type: "string" },
    },
    localCustoms: {
      type: "array",
      description:
        "Local etiquette, respectful behavior, dress, tipping, and social customs when relevant.",
      items: { type: "string" },
    },
    safetyAdvice: {
      type: "array",
      description:
        "Practical safety advice for transport, neighborhoods, valuables, weather, and night travel.",
      items: { type: "string" },
    },
    emergencyInformation: {
      type: "array",
      description:
        "Emergency planning guidance, including local emergency numbers when commonly known and a reminder to verify current official details.",
      items: { type: "string" },
    },
    bestLocalFoods: {
      type: "array",
      description:
        "Destination-specific local foods, drinks, snacks, or meal experiences to try.",
      items: { type: "string" },
    },
    nearbyPlaces: {
      type: "array",
      description:
        "Nearby places around the searched destination, including temples, cultural stops, nature places, food streets, and short detours.",
      items: { type: "string" },
    },
    languageGuide: {
      type: "array",
      description:
        "Basic local language survival phrases with pronunciation for travelers.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["english", "local", "pronunciation", "usage"],
        properties: {
          english: { type: "string" },
          local: { type: "string" },
          pronunciation: { type: "string" },
          usage: { type: "string" },
        },
      },
    },
    budgetSummary: {
      type: "object",
      additionalProperties: false,
      required: [
        "overallEstimate",
        "transport",
        "food",
        "activities",
        "buffer",
      ],
      properties: {
        overallEstimate: { type: "string" },
        transport: { type: "string" },
        food: { type: "string" },
        activities: { type: "string" },
        buffer: { type: "string" },
      },
    },
  },
} as const;

const itineraryModels = ["gemini-2.5-flash"];

function getRetryDelay(message: string) {
  const retryMatch =
    message.match(/Please retry in ([\d.]+)s/) ??
    message.match(/"retryDelay":"(\d+)s"/);

  return retryMatch?.[1] ? Math.ceil(Number(retryMatch[1])) : null;
}

function getFriendlyGeminiError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown Gemini API error occurred.";
  const retryDelay = getRetryDelay(message);

  if (
    message.includes('"code":429') ||
    message.includes('"status":"RESOURCE_EXHAUSTED"') ||
    message.toLowerCase().includes("quota exceeded")
  ) {
    return {
      status: 429,
      message: retryDelay
        ? `Gemini quota is temporarily exhausted. Please wait about ${retryDelay} seconds and try again. If this keeps happening, check your Gemini API quota or billing settings.`
        : "Gemini quota is exhausted right now. Please wait and try again, or check your Gemini API quota or billing settings.",
    };
  }

  if (
    message.includes('"code":503') ||
    message.includes('"status":"UNAVAILABLE"') ||
    message.toLowerCase().includes("high demand")
  ) {
    return {
      status: 503,
      message:
        "Gemini is experiencing high demand right now. Please try again in a few minutes.",
    };
  }

  return {
    status: 500,
    message: "Unable to generate a trip plan right now. Please try again.",
  };
}

function isQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes('"code":429') ||
    message.includes('"status":"RESOURCE_EXHAUSTED"') ||
    message.toLowerCase().includes("quota exceeded")
  );
}

function isRecoverableGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    isQuotaError(error) ||
    message.includes('"code":503') ||
    message.includes('"status":"UNAVAILABLE"') ||
    message.toLowerCase().includes("high demand")
  );
}

function buildFallbackTravelPlan({
  fromPlace,
  destination,
  days,
  budget,
  interests,
}: ValidatedItineraryRequest) {
  return {
    dailyPlan: Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const primaryInterest = interests[index % interests.length] ?? "Local experiences";

      return {
        day,
        title:
          day === 1
            ? "Arrival, orientation, and easy local exploring"
            : `${primaryInterest} focused local exploration`,
        morningActivities: [
          `Start with a central neighborhood walk in ${destination}.`,
          `Choose one nearby attraction connected to ${primaryInterest}.`,
        ],
        afternoonActivities: [
          "Plan lunch near the main sightseeing area to reduce travel time.",
          "Visit one museum, market, viewpoint, beach, temple, park, or cultural stop based on your preferences.",
        ],
        eveningActivities: [
          "Keep the evening lighter with a food street, waterfront, mall, cultural area, or relaxed local walk.",
          "Use trusted transport for the return journey and avoid isolated areas late at night.",
        ],
        estimatedDailyBudget:
          "Use the selected trip budget as a daily guide. Keep a 10-20% buffer for transport, food, entry tickets, and unexpected changes.",
      };
    }),
    foodRecommendations: [
      "Try well-reviewed local restaurants near busy areas rather than empty tourist-focused places.",
      "Ask your stay host or hotel desk for current neighborhood food suggestions.",
      "Keep bottled water, light snacks, and one flexible meal slot each day.",
    ],
    transportationRecommendations: [
      fromPlace
        ? `Start by comparing practical routes from ${fromPlace} to ${destination}, including flight, train, bus, car, and local transfer options where relevant.`
        : "Compare flight, train, bus, car, and local transfer options where relevant.",
      "Use official taxis, ride-hailing apps, metro, buses, or hotel-arranged transfers where available.",
      "Check airport, railway station, or bus terminal transfer options before arrival.",
      "Group nearby places together to reduce travel time and transport cost.",
    ],
    travelTips: [
      "Verify opening hours, ticket rules, and local holidays before visiting.",
      "Start popular outdoor places early to avoid heat and crowds.",
      "Keep digital and printed copies of important bookings and IDs.",
    ],
    hiddenGems: [
      "Look for local markets, old neighborhoods, viewpoints, parks, and community food streets near the destination.",
      "Ask locals or your stay host for lesser-known places that are currently safe and easy to reach.",
    ],
    touristScamsToAvoid: [
      "Avoid unofficial guides, unclear taxi pricing, fake ticket counters, and pressure-based shopping stops.",
      "Confirm prices before accepting rides, tours, rentals, or services.",
    ],
    localCustoms: [
      "Dress respectfully at religious places and follow posted rules.",
      "Ask before photographing people, ceremonies, or private spaces.",
    ],
    safetyAdvice: [
      "Keep valuables secure in crowded areas and during public transport.",
      "Use well-lit routes at night and avoid isolated places after dark.",
      "Check local emergency numbers and save your accommodation address offline.",
    ],
    emergencyInformation: [
      "Save local emergency numbers, your accommodation contact, and nearby hospital details before travel.",
      "Verify official emergency information for the destination before departure.",
    ],
    bestLocalFoods: [
      "Prioritize regional dishes, fresh local snacks, and popular breakfast items.",
      "Use the guide chat later to ask for destination-specific foods once Gemini quota is available.",
    ],
    nearbyPlaces: [
      `Explore temples, local markets, viewpoints, parks, food streets, and cultural stops near ${destination}, not only the exact searched place.`,
      "Check nearby villages, towns, and district-level attractions that are easy to reach as short detours.",
      "Use the map section to discover nearby attractions, restaurants, hotels, and transport hubs.",
    ],
    languageGuide: [
      {
        english: "Hello",
        local: "Local greeting",
        pronunciation: "Ask locally for exact pronunciation",
        usage: "Greeting people politely.",
      },
      {
        english: "Thank you",
        local: "Local thank-you phrase",
        pronunciation: "Ask locally for exact pronunciation",
        usage: "After receiving help or service.",
      },
      {
        english: "How much is this?",
        local: "Local price question",
        pronunciation: "Ask locally for exact pronunciation",
        usage: "Shopping, taxis, and food stalls.",
      },
      {
        english: "Where is the restroom?",
        local: "Local restroom question",
        pronunciation: "Ask locally for exact pronunciation",
        usage: "Restaurants, stations, malls, and public areas.",
      },
      {
        english: "I need help",
        local: "Local help phrase",
        pronunciation: "Ask locally for exact pronunciation",
        usage: "Urgent help or confusion.",
      },
    ],
    budgetSummary: {
      overallEstimate: `Plan within ${budget}, keeping a flexible 10-20% emergency buffer.`,
      transport:
        "Reserve a clear portion for airport transfers, local transport, and occasional private rides.",
      food:
        "Mix local restaurants, cafes, and simple meals to keep spending balanced.",
      activities:
        "Keep paid attractions selective and balance them with free viewpoints, markets, beaches, parks, or cultural walks.",
      buffer:
        "Keep a backup amount for weather changes, medicine, extra transport, or last-minute booking changes.",
    },
  };
}

function validateRequest(body: ItineraryRequest) {
  const fromPlace =
    typeof body.fromPlace === "string" ? body.fromPlace.trim() : "";
  const destination =
    typeof body.destination === "string" ? body.destination.trim() : "";
  const startDate =
    typeof body.startDate === "string" ? body.startDate.trim() : "";
  const endDate = typeof body.endDate === "string" ? body.endDate.trim() : "";
  const days = Number(body.days);
  const budget = typeof body.budget === "string" ? body.budget.trim() : "";
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((item): item is string => typeof item === "string")
    : [];

  if (!destination) {
    return { error: "Destination is required." };
  }

  if ((startDate && !endDate) || (!startDate && endDate)) {
    return { error: "Both travel start date and end date are required." };
  }

  if (startDate && endDate) {
    const startTime = new Date(`${startDate}T00:00:00`).getTime();
    const endTime = new Date(`${endDate}T00:00:00`).getTime();

    if (
      Number.isNaN(startTime) ||
      Number.isNaN(endTime) ||
      endTime < startTime
    ) {
      return { error: "Travel end date must be after the start date." };
    }
  }

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return { error: "Days must be a whole number between 1 and 30." };
  }

  if (!budget) {
    return { error: "Budget is required." };
  }

  if (interests.length === 0) {
    return { error: "Select at least one interest." };
  }

  return {
    data: {
      destination,
      fromPlace,
      startDate,
      endDate,
      days,
      budget,
      interests,
    },
  };
}

export async function POST(request: NextRequest) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Create a .env.local file in the project root and add GEMINI_API_KEY=your_api_key_here, then restart npm run dev.",
      },
      { status: 500 },
    );
  }

  let fallbackRequest: ValidatedItineraryRequest | null = null;

  try {
    const body = (await request.json()) as ItineraryRequest;
    const validated = validateRequest(body);

    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { destination, startDate, endDate, days, budget, interests } =
      validated.data;
    fallbackRequest = {
      fromPlace: validated.data.fromPlace,
      destination,
      startDate,
      endDate,
      days,
      budget,
      interests,
    };

    let outputText = "";
    let lastError: unknown = null;

    for (const apiKey of apiKeys) {
      const ai = new GoogleGenAI({ apiKey });

      for (const model of itineraryModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      role: "experienced_trip_planner",
                      fromPlace: validated.data.fromPlace || null,
                      destination,
                      travelDates:
                        startDate && endDate
                          ? {
                              startDate,
                              endDate,
                            }
                          : null,
                      days,
                      budget,
                      interests,
                      instructions: [
                        "Return only the JSON object matching the provided schema.",
                        "Create a practical trip plan based only on the supplied destination, travel dates when present, days, budget, and interests.",
                        "If fromPlace is provided, include practical route planning considerations from the starting place to the destination. Do not invent live flight prices, train availability, or exact fares.",
                        "If travel dates are provided, align the day-wise plan with that travel window. Do not invent date-specific festivals, closures, live events, or seasonal facts unless they are commonly known and stable.",
                        "Include day-wise itinerary, morning activities, afternoon activities, evening activities, estimated daily budget, food recommendations, transportation recommendations, travel tips, and budget summary.",
                        "Also include hidden gems, tourist scams to avoid, local customs, safety advice, emergency information, and best local foods for the destination.",
                        "Include nearbyPlaces around the destination, especially temples, cultural places, nature spots, food areas, and short detours reachable from the searched place.",
                        "Include 15 to 20 languageGuide items for basic survival communication in the most useful local language for the destination. Include English meaning, local phrase, simple pronunciation, and when to use it.",
                        "Behave like a professional local travel guide with practical cultural knowledge, not like a generic itinerary writer.",
                        "When relevant, include historical significance, cultural insights, local etiquette, best photo locations, tourist traps to avoid, and transportation advice inside the existing response fields.",
                        "Make recommendations suitable for real travelers by considering families, children, senior citizens, accessibility needs, night safety, clothing expectations, food preferences, and local customs when relevant.",
                        "Use cautious ranges or category guidance for budget estimates instead of unsupported exact prices.",
                        "Do not invent live flight prices, hotel availability, exact exchange rates, official rules, or time-sensitive claims.",
                        "For emergency information, include commonly known numbers only when you are confident, and always advise verifying official local emergency details before travel.",
                        "For hidden gems and scams, use cautious wording and avoid naming highly specific obscure places unless they are well-known enough to be reliable.",
                        "Do not use markdown formatting such as asterisks, headings, or bullet symbols inside string values.",
                        "Avoid absolute claims such as safest, cheapest, guaranteed, or best unless the user provided verified data.",
                        "When information may change, phrase it as a planning tip and tell the traveler to verify before booking.",
                        "Do not mention Gemini, AI, model names, prompts, or that this plan was generated.",
                      ],
                    }),
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: travelPlanSchema,
            },
          });

          outputText = response.text?.trim() ?? "";

          if (outputText) {
            break;
          }
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : "";
          const quotaExceeded =
            message.includes('"code":429') ||
            message.includes('"status":"RESOURCE_EXHAUSTED"') ||
            message.toLowerCase().includes("quota exceeded");
          const canRetry =
            message.includes('"code":503') ||
            message.includes('"status":"UNAVAILABLE"') ||
            message.toLowerCase().includes("high demand");

          if (!quotaExceeded && !canRetry) {
            throw error;
          }
        }
      }

      if (outputText) {
        break;
      }
    }

    if (!outputText) {
      if (lastError) {
        throw lastError;
      }

      return NextResponse.json(
        { error: "The trip planner returned an empty plan." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      travelPlan: JSON.parse(outputText),
    });
  } catch (error) {
    console.error("Trip plan generation failed:", error);
    const friendlyError = getFriendlyGeminiError(error);

    if (fallbackRequest && isRecoverableGeminiError(error)) {
      return NextResponse.json({
        travelPlan: buildFallbackTravelPlan(fallbackRequest),
        notice: friendlyError.message,
      });
    }

    return NextResponse.json(
      {
        error: friendlyError.message,
      },
      { status: friendlyError.status },
    );
  }
}
