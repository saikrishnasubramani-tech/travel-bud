import { NextRequest, NextResponse } from "next/server";

type NominatimPlace = {
  lat: string;
  lon: string;
  display_name?: string;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type MapCategory =
  | "Tourist attraction"
  | "Hidden gem"
  | "Restaurant"
  | "Hotel"
  | "Transportation hub";

const categoryStyles: Record<MapCategory, { color: string; visitDuration: string }> = {
  "Tourist attraction": { color: "#f97316", visitDuration: "1-3 hours" },
  "Hidden gem": { color: "#0f8b8d", visitDuration: "45-90 minutes" },
  Restaurant: { color: "#be123c", visitDuration: "45-90 minutes" },
  Hotel: { color: "#2563eb", visitDuration: "Check-in based" },
  "Transportation hub": { color: "#334155", visitDuration: "15-45 minutes" },
};

const categoryPriority: MapCategory[] = [
  "Tourist attraction",
  "Hidden gem",
  "Restaurant",
  "Hotel",
  "Transportation hub",
];

const fallbackCategories: MapCategory[] = [
  "Tourist attraction",
  "Hidden gem",
  "Restaurant",
  "Hotel",
  "Transportation hub",
];

const fallbackNames: Record<MapCategory, string> = {
  "Tourist attraction": "Popular sightseeing area",
  "Hidden gem": "Local discovery area",
  Restaurant: "Local food area",
  Hotel: "Stay area",
  "Transportation hub": "Arrival and transport area",
};

const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function buildFallbackMarkers(
  destination: string,
  latitude: number,
  longitude: number,
) {
  return fallbackCategories.map((category, index) => ({
    id: `fallback-${category}`,
    name: `${fallbackNames[category]} near ${destination}`,
    category,
    latitude: latitude + (index - 2) * 0.012,
    longitude: longitude + (index % 2 === 0 ? 0.014 : -0.014),
    color: categoryStyles[category].color,
    description:
      category === "Hidden gem"
        ? "Use the guide chat to ask for lesser-known local places near this destination."
        : `Planning marker for ${category.toLowerCase()} options near this destination.`,
    openingHours: "Verify locally before visiting",
    visitDuration: categoryStyles[category].visitDuration,
  }));
}

function getCategory(tags: Record<string, string>): MapCategory | null {
  if (tags.amenity === "restaurant" || tags.cuisine) return "Restaurant";
  if (tags.amenity === "cafe" || tags.amenity === "food_court") return "Restaurant";
  if (tags.tourism === "hotel" || tags.tourism === "guest_house") return "Hotel";
  if (
    tags.railway === "station" ||
    tags.amenity === "bus_station" ||
    tags.public_transport === "station"
  ) {
    return "Transportation hub";
  }
  if (tags.tourism === "viewpoint" || tags.leisure === "park") return "Hidden gem";
  if (tags.natural === "beach" || tags.leisure === "beach_resort") {
    return "Tourist attraction";
  }
  if (tags.tourism || tags.historic) return "Tourist attraction";
  return null;
}

function buildDescription(category: MapCategory, tags: Record<string, string>) {
  const type = tags.tourism || tags.amenity || tags.historic || tags.railway || "place";

  if (category === "Restaurant") {
    return tags.cuisine
      ? `Local food stop with ${tags.cuisine} cuisine.`
      : "Food stop to consider near the destination.";
  }

  if (category === "Hotel") {
    return "Accommodation option found near the destination.";
  }

  if (category === "Transportation hub") {
    return "Useful transit point for arriving, leaving, or moving around.";
  }

  return `Nearby ${type.replace(/_/g, " ")} to consider while planning.`;
}

function isLatinReadable(value: string) {
  return /^[\u0000-\u024F\s.,'’&()/-]+$/.test(value);
}

function getMarkerName(tags: Record<string, string>, language: string) {
  if (language === "en") {
    const englishName =
      tags["name:en"]?.trim() ||
      tags.int_name?.trim() ||
      tags["name:latin"]?.trim();

    if (englishName) return englishName;

    const localName = tags.name?.trim();
    return localName && isLatinReadable(localName) ? localName : null;
  }

  return (
    tags[`name:${language}`]?.trim() ||
    tags["name:en"]?.trim() ||
    tags.int_name?.trim() ||
    tags["name:latin"]?.trim() ||
    tags.name?.trim() ||
    null
  );
}

async function fetchOverpassPlaces(query: string) {
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "TravelBud/0.1 local-demo",
        },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        return (await response.json()) as OverpassResponse;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function prioritizeMarkers<T extends { category: MapCategory }>(markers: T[]) {
  return categoryPriority.flatMap((category) =>
    markers.filter((marker) => marker.category === category).slice(0, 8),
  );
}

function fillMissingCategories(
  markers: ReturnType<typeof buildFallbackMarkers>,
  destination: string,
  latitude: number,
  longitude: number,
) {
  const existingCategories = new Set(markers.map((marker) => marker.category));
  const fallbackMarkers = buildFallbackMarkers(destination, latitude, longitude);
  const missingMarkers = fallbackMarkers.filter(
    (marker) => !existingCategories.has(marker.category),
  );

  return [...markers, ...missingMarkers];
}

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get("destination")?.trim();
  const language = request.nextUrl.searchParams.get("language")?.trim() || "en";

  if (!destination) {
    return NextResponse.json(
      { error: "Destination is required for map lookup." },
      { status: 400 },
    );
  }

  try {
    const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
    geocodeUrl.searchParams.set("q", destination);
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("accept-language", language);

    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "TravelBud/0.1 local-demo",
        "Accept-Language": language,
      },
    });

    if (!geocodeResponse.ok) {
      return NextResponse.json(
        { error: "Map location lookup is unavailable right now." },
        { status: geocodeResponse.status },
      );
    }

    const places = (await geocodeResponse.json()) as NominatimPlace[];
    const place = places[0];

    if (!place) {
      return NextResponse.json(
        { error: "Map location was not found." },
        { status: 404 },
      );
    }

    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    const searchRadiusMeters = 9000;

    const query = `
      [out:json][timeout:12];
      (
        node(around:${searchRadiusMeters},${latitude},${longitude})["tourism"~"attraction|museum|gallery|viewpoint|hotel|guest_house"];
        way(around:${searchRadiusMeters},${latitude},${longitude})["tourism"~"attraction|museum|gallery|viewpoint|hotel|guest_house"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["historic"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["amenity"="restaurant"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["amenity"="cafe"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["amenity"="food_court"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["amenity"="bus_station"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["railway"="station"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["leisure"="park"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["leisure"="beach_resort"];
        node(around:${searchRadiusMeters},${latitude},${longitude})["natural"="beach"];
      );
      out center 80;
    `;

    const overpassData = await fetchOverpassPlaces(query);

    if (!overpassData) {
      return NextResponse.json({
        center: {
          latitude,
          longitude,
          label: place.display_name ?? destination,
        },
        markers: buildFallbackMarkers(destination, latitude, longitude),
        note: "Live map places are unavailable right now, so planning markers are shown.",
      });
    }

    const seenNames = new Set<string>();
    const markers =
      overpassData.elements
        ?.map((element) => {
          const tags = element.tags ?? {};
          const name = getMarkerName(tags, language);
          const markerLatitude = element.lat ?? element.center?.lat;
          const markerLongitude = element.lon ?? element.center?.lon;
          const category = getCategory(tags);

          if (!name || !category || !markerLatitude || !markerLongitude) {
            return null;
          }

          const key = `${name}-${category}`;
          if (seenNames.has(key)) {
            return null;
          }
          seenNames.add(key);

          return {
            id: `${element.id}-${category}`,
            name,
            category,
            latitude: markerLatitude,
            longitude: markerLongitude,
            color: categoryStyles[category].color,
            description: buildDescription(category, tags),
            openingHours: tags.opening_hours ?? "Check locally before visiting",
            visitDuration: categoryStyles[category].visitDuration,
          };
        })
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null) ??
      [];
    const prioritizedMarkers = fillMissingCategories(
      prioritizeMarkers(markers),
      destination,
      latitude,
      longitude,
    );
    const finalMarkers = prioritizeMarkers(prioritizedMarkers).slice(0, 36);

    return NextResponse.json({
      center: {
        latitude,
        longitude,
        label: place.display_name ?? destination,
      },
      markers:
        finalMarkers.length > 0
          ? finalMarkers
          : buildFallbackMarkers(destination, latitude, longitude),
    });
  } catch (error) {
    console.error("Map lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load the destination map right now." },
      { status: 500 },
    );
  }
}
