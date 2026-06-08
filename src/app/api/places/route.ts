import { NextRequest, NextResponse } from "next/server";

type NominatimPlace = {
  place_id: number;
  display_name: string;
  name?: string;
  category?: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    province?: string;
    state_district?: string;
    state?: string;
    region?: string;
    country?: string;
  };
};

const allowedClasses = new Set([
  "place",
  "boundary",
  "tourism",
  "amenity",
  "historic",
  "natural",
  "leisure",
]);
const allowedTypes = new Set([
  "administrative",
  "archipelago",
  "attraction",
  "beach",
  "borough",
  "city",
  "continent",
  "country",
  "county",
  "district",
  "hamlet",
  "heritage",
  "hotel",
  "island",
  "locality",
  "memorial",
  "monument",
  "museum",
  "municipality",
  "neighbourhood",
  "park",
  "place_of_worship",
  "province",
  "region",
  "restaurant",
  "ruins",
  "state",
  "suburb",
  "temple",
  "town",
  "viewpoint",
  "village",
]);

function isDestinationPlace(place: NominatimPlace) {
  return (
    Boolean(place.display_name) &&
    allowedClasses.has(place.category ?? "") &&
    allowedTypes.has(place.type ?? "")
  );
}

function buildName(place: NominatimPlace) {
  const address = place.address;
  const localName =
    place.name ||
    address?.city ||
    address?.town ||
    address?.village ||
    address?.hamlet ||
    address?.municipality ||
    address?.province ||
    place.display_name.split(",")[0];
  const country = address?.country;

  return country && !localName.includes(country)
    ? `${localName}, ${country}`
    : localName;
}

function buildDescription(place: NominatimPlace) {
  const address = place.address;
  const locationParts = [
    address?.state_district,
    address?.county,
    address?.province,
    address?.state || address?.region,
    address?.country,
  ].filter(Boolean);
  const uniqueParts = Array.from(new Set(locationParts));

  if (uniqueParts.length > 0) {
    return `${formatPlaceType(place.type)} in ${uniqueParts.join(", ")}`;
  }

  return formatPlaceType(place.type);
}

function formatPlaceType(value?: string) {
  if (!value) return "Place";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "20");
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TravelBud/0.1 contact: local-development",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Place search is unavailable right now." },
        { status: response.status },
      );
    }

    const data = (await response.json()) as NominatimPlace[];
    const seenPlaces = new Set<string>();
    const places = data
      .filter(isDestinationPlace)
      .map((place) => {
        const name = buildName(place);
        const description = buildDescription(place);
        return {
          id: String(place.place_id),
          name,
          description,
        };
      })
      .filter((place) => {
        const key = `${place.name}-${place.description}`.toLowerCase();
        if (seenPlaces.has(key)) return false;
        seenPlaces.add(key);
        return true;
      });

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Place search failed:", error);
    return NextResponse.json(
      { error: "Unable to search places right now." },
      { status: 500 },
    );
  }
}
