import { NextRequest, NextResponse } from "next/server";

type GeocodingResult = {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
};

const forecastWindowDays = 16;

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function describeWeather(code?: number) {
  if (code === undefined) return "Weather data unavailable";
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain likely";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow likely";
  if ([95, 96, 99].includes(code)) return "Thunderstorm risk";
  return "Mixed weather";
}

function buildRecommendations(
  maxRainProbability: number,
  currentTemperature?: number,
) {
  const recommendations = [
    "Check the forecast again on the morning of travel before locking outdoor plans.",
  ];
  const alternateActivities = [
    "Keep a museum, food market, cafe, or indoor cultural stop as a backup.",
  ];

  if (maxRainProbability >= 60) {
    recommendations.push("Carry a compact umbrella or rain jacket.");
    recommendations.push("Plan outdoor sightseeing earlier in the day if skies are clearer.");
    alternateActivities.push("Swap long walking routes for covered markets, galleries, malls, or short guided indoor experiences.");
  } else if (maxRainProbability >= 35) {
    recommendations.push("Keep outdoor plans flexible because showers are possible.");
    alternateActivities.push("Choose attractions near transit so you can move indoors quickly if rain starts.");
  } else {
    recommendations.push("Outdoor walking plans look reasonable, but keep hydration and sun protection in mind.");
  }

  if (currentTemperature !== undefined && currentTemperature >= 32) {
    recommendations.push("Schedule demanding outdoor activities for morning or late afternoon.");
    alternateActivities.push("Use midday for air-conditioned restaurants, museums, or rest time.");
  }

  if (currentTemperature !== undefined && currentTemperature <= 8) {
    recommendations.push("Layer clothing and plan shorter outdoor stops.");
    alternateActivities.push("Prioritize warm indoor meals, museums, and shorter transit-connected routes.");
  }

  return { recommendations, alternateActivities };
}

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get("destination")?.trim();
  const requestedStartDate = request.nextUrl.searchParams.get("startDate");
  const requestedEndDate = request.nextUrl.searchParams.get("endDate");

  if (!destination) {
    return NextResponse.json(
      { error: "Destination is required for weather." },
      { status: 400 },
    );
  }

  try {
    const startDate = parseDate(requestedStartDate);
    const endDate = parseDate(requestedEndDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxForecastDate = addDays(today, forecastWindowDays - 1);
    const hasTravelDates = Boolean(requestedStartDate && requestedEndDate);
    const canUseTravelDates =
      startDate !== null &&
      endDate !== null &&
      endDate >= startDate &&
      startDate >= today &&
      endDate <= maxForecastDate;
    const selectedDatesAreTooFarAhead =
      startDate !== null && endDate !== null && startDate > maxForecastDate;
    const selectedDatesArePartlyUnavailable =
      startDate !== null &&
      endDate !== null &&
      startDate <= maxForecastDate &&
      endDate > maxForecastDate;

    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.searchParams.set("name", destination);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", "en");
    geocodeUrl.searchParams.set("format", "json");

    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = (await geocodeResponse.json()) as GeocodingResponse;
    const place = geocodeData.results?.[0];

    if (!place) {
      return NextResponse.json(
        { error: "Weather location was not found." },
        { status: 404 },
      );
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(place.latitude));
    forecastUrl.searchParams.set("longitude", String(place.longitude));
    forecastUrl.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m",
    );
    forecastUrl.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    if (canUseTravelDates && startDate && endDate) {
      forecastUrl.searchParams.set("start_date", toDateOnly(startDate));
      forecastUrl.searchParams.set("end_date", toDateOnly(endDate));
    } else {
      forecastUrl.searchParams.set("forecast_days", "5");
    }
    forecastUrl.searchParams.set("timezone", place.timezone || "auto");

    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      return NextResponse.json(
        { error: "Weather forecast is unavailable right now." },
        { status: forecastResponse.status },
      );
    }

    const forecastData = (await forecastResponse.json()) as ForecastResponse;
    const daily = forecastData.daily;
    const forecast =
      daily?.time?.map((date, index) => ({
        date,
        summary: describeWeather(daily.weather_code?.[index]),
        maxTemp: daily.temperature_2m_max?.[index],
        minTemp: daily.temperature_2m_min?.[index],
        rainProbability: daily.precipitation_probability_max?.[index] ?? 0,
      })) ?? [];
    const maxRainProbability = Math.max(
      0,
      ...forecast.map((day) => day.rainProbability),
    );
    const currentTemperature = forecastData.current?.temperature_2m;
    const recommendations = buildRecommendations(
      maxRainProbability,
      currentTemperature,
    );
    const forecastNote =
      canUseTravelDates && startDate && endDate
        ? `Showing current weather plus forecast for your selected travel dates: ${toDateOnly(startDate)} to ${toDateOnly(endDate)}.`
        : selectedDatesAreTooFarAhead
          ? `Showing current weather and the nearest available forecast. Your selected travel dates are beyond the free live forecast window, which supports about ${forecastWindowDays} days ahead. Check again closer to the trip for exact weather.`
          : selectedDatesArePartlyUnavailable
            ? `Showing current weather and the nearest available forecast. Part of your selected travel date range is beyond the ${forecastWindowDays}-day live forecast window.`
            : hasTravelDates
              ? "Showing current weather and the nearest available forecast because the selected travel dates could not be used for live forecast lookup."
              : "Showing current weather plus the next 5 days of forecast. Select travel dates to check that travel window when it is close enough.";
    const forecastLabel =
      canUseTravelDates && startDate && endDate
        ? "selected travel dates"
        : "available forecast";

    return NextResponse.json({
      location: {
        name: place.name,
        region: place.admin1,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
      },
      current: {
        temperature: currentTemperature,
        feelsLike: forecastData.current?.apparent_temperature,
        windSpeed: forecastData.current?.wind_speed_10m,
        precipitation: forecastData.current?.precipitation,
        rain: forecastData.current?.rain,
        summary: describeWeather(forecastData.current?.weather_code),
      },
      forecastNote,
      forecast,
      summary:
        maxRainProbability >= 60
          ? "Rain may affect outdoor plans during this trip window."
          : "Weather looks manageable for a balanced travel plan.",
      rainAlert:
        maxRainProbability >= 60
          ? `Rain alert: up to ${maxRainProbability}% chance in the ${forecastLabel}.`
          : maxRainProbability >= 35
            ? `Light rain watch: up to ${maxRainProbability}% chance in the ${forecastLabel}.`
            : `No major rain alert in the ${forecastLabel}.`,
      alternateActivities: recommendations.alternateActivities,
      travelRecommendations: recommendations.recommendations,
    });
  } catch (error) {
    console.error("Weather lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load weather intelligence right now." },
      { status: 500 },
    );
  }
}
