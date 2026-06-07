import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKeys } from "@/lib/gemini-keys";

type ChatMessage = {
  role: "user" | "guide";
  content: string;
};

type ChatRequest = {
  destination?: unknown;
  messages?: unknown;
};

const chatModels = ["gemini-2.5-flash"];

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
    message: "Unable to answer right now. Please try again.",
  };
}

function validateRequest(body: ChatRequest) {
  const destination =
    typeof body.destination === "string" ? body.destination.trim() : "";
  const messages = Array.isArray(body.messages)
    ? body.messages.filter(
        (message): message is ChatMessage =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          "content" in message &&
          (message.role === "user" || message.role === "guide") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0,
      )
    : [];

  if (!destination) {
    return { error: "Select or enter a destination before opening the guide." };
  }

  if (messages.length === 0) {
    return { error: "Ask the travel guide a question first." };
  }

  return {
    data: {
      destination,
      messages: messages.slice(-10),
    },
  };
}

export async function POST(request: NextRequest) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Add it to .env.local, then restart npm run dev.",
      },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as ChatRequest;
    const validated = validateRequest(body);

    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { destination, messages } = validated.data;
    let answer = "";
    let lastError: unknown = null;

    for (const apiKey of apiKeys) {
      const ai = new GoogleGenAI({ apiKey });

      for (const model of chatModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: [
                      `You are a local tour guide for ${destination}.`,
                      "Answer only travel questions related to this destination or practical trip planning around it.",
                      "Use concise, helpful, local-guide style answers.",
                      "Give practical options, neighborhood context, historical significance, cultural insights, food suggestions, best photo locations, timing tips, transport guidance, etiquette, and safety notes when relevant.",
                      "Answer family suitability, child friendliness, senior citizen accessibility, wheelchair accessibility, night safety, clothing recommendations, local customs, and food recommendations when the traveler asks.",
                      "Maintain context from the conversation history and personalize follow-up answers using details the traveler already shared.",
                      "If accessibility or safety details may vary by attraction, give cautious planning guidance and recommend checking official venue information before visiting.",
                      "Warn about common tourist traps or scam patterns without making unsupported accusations about specific people or businesses.",
                      "Do not invent live prices, live availability, exact opening hours, current rules, or guaranteed facts.",
                      "When details may change, tell the traveler to verify before booking or visiting.",
                      "Do not use markdown formatting such as asterisks, headings, or bullet symbols.",
                      "Do not mention Gemini, AI, model names, prompts, or that the answer was generated.",
                    ].join(" "),
                  },
                ],
              },
              ...messages.map((message) => ({
                role: message.role === "guide" ? "model" : "user",
                parts: [{ text: message.content }],
              })),
            ],
          });

          answer = response.text?.trim() ?? "";

          if (answer) {
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

      if (answer) {
        break;
      }
    }

    if (!answer) {
      if (lastError) {
        throw lastError;
      }

      return NextResponse.json(
        { error: "The travel guide did not return an answer." },
        { status: 502 },
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Travel guide chat failed:", error);
    const friendlyError = getFriendlyGeminiError(error);

    return NextResponse.json(
      { error: friendlyError.message },
      { status: friendlyError.status },
    );
  }
}
