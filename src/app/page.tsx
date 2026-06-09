"use client";

import { FormEvent, useMemo, useState } from "react";
import { DestinationDashboard } from "@/components/DestinationDashboard";
import { InteractiveTravelMap } from "@/components/InteractiveTravelMap";
import { currencies, destinations, type Destination } from "@/lib/travel-data";

type PlaceSuggestion = {
  id: string;
  name: string;
  description: string;
};

type TravelPlan = {
  dailyPlan: {
    day: number;
    title: string;
    morningActivities: string[];
    afternoonActivities: string[];
    eveningActivities: string[];
    estimatedDailyBudget: string;
  }[];
  foodRecommendations: string[];
  routeOptions?: {
    mode: string;
    summary: string;
    bestFor: string;
    howToCheck: string;
    bookingSource: string;
    cautions: string;
  }[];
  transportationRecommendations: string[];
  travelTips: string[];
  hiddenGems: string[];
  touristScamsToAvoid: string[];
  localCustoms: string[];
  safetyAdvice: string[];
  emergencyInformation: string[];
  bestLocalFoods: string[];
  nearbyPlaces: string[];
  languageGuide: {
    english: string;
    local: string;
    pronunciation: string;
    usage: string;
  }[];
  budgetSummary: {
    overallEstimate: string;
    transport: string;
    food: string;
    activities: string;
    buffer: string;
  };
};

type WeatherData = {
  location: {
    name: string;
    region?: string;
    country?: string;
  };
  forecastNote: string;
  current: {
    temperature?: number;
    feelsLike?: number;
    windSpeed?: number;
    precipitation?: number;
    rain?: number;
    summary: string;
  };
  forecast: {
    date: string;
    summary: string;
    maxTemp?: number;
    minTemp?: number;
    rainProbability: number;
  }[];
  summary: string;
  rainAlert: string;
  alternateActivities: string[];
  travelRecommendations: string[];
};

type MapData = {
  center: {
    latitude: number;
    longitude: number;
    label: string;
  };
  markers: {
    id: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    color: string;
    description: string;
    openingHours: string;
    visitDuration: string;
  }[];
};

type DestinationCard = {
  name: string;
  region: string;
  image: string;
  fallbackImage: string;
  summary: string;
};

type ChatMessage = {
  role: "user" | "guide";
  content: string;
};

const interests = [
  "Food",
  "Culture",
  "Nature",
  "Adventure",
  "Shopping",
  "Museums",
  "Relaxation",
  "Nightlife",
  "Family",
  "Beaches",
  "History",
  "Photography",
  "Temple visits",
  "Honeymoon",
  "Baby friendly",
  "Child friendly",
  "Senior friendly",
  "Wheelchair accessible",
  "Budget travel",
  "Luxury",
  "Solo travel",
  "Wellness",
  "Local experiences",
  "Wildlife",
  "Spiritual",
  "Road trip",
  "Eco friendly",
  "Pet friendly",
];

const mapLanguages = [
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "th", label: "Thai" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
];

const fallbackDestinationImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80";

const destinationCards: DestinationCard[] = [
  {
    name: "Phuket",
    region: "Thailand",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Patong%20Beach%20in%20Phuket.jpg?width=700",
    fallbackImage: fallbackDestinationImage,
    summary: "Beaches, islands, markets",
  },
  {
    name: "Chennai",
    region: "India",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Marina%20beach%2C%20Chennai.jpg?width=700",
    fallbackImage: fallbackDestinationImage,
    summary: "Temples, beaches, food",
  },
  {
    name: "Paris",
    region: "France",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=700&q=80",
    fallbackImage: fallbackDestinationImage,
    summary: "Museums, cafes, landmarks",
  },
];

const sortedDestinations = [...destinations].sort((first, second) => {
  const countryCompare = first.country.localeCompare(second.country);
  return countryCompare || first.city.localeCompare(second.city);
});

export default function Home() {
  const [fromPlace, setFromPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState("5");
  const [budget, setBudget] = useState("40000");
  const [currency, setCurrency] = useState("INR - Indian Rupee");
  const [adultTravellers, setAdultTravellers] = useState(2);
  const [childTravellers, setChildTravellers] = useState(0);
  const [infantTravellers, setInfantTravellers] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Food",
    "Culture",
  ]);
  const [onlineFromPlaces, setOnlineFromPlaces] = useState<PlaceSuggestion[]>(
    [],
  );
  const [onlinePlaces, setOnlinePlaces] = useState<PlaceSuggestion[]>([]);
  const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [planNotice, setPlanNotice] = useState("");
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState("");
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapLanguage, setMapLanguage] = useState("en");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "guide",
      content:
        "Ask me about neighborhoods, food, transport, timing, etiquette, or how to adjust your plan.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const filteredDestinations = useMemo<PlaceSuggestion[]>(() => {
    const searchTerm = destination.trim().toLowerCase();

    if (!searchTerm) {
      return sortedDestinations.map(destinationToSuggestion);
    }

    const localPlaces = sortedDestinations
      .filter((place) => {
        const label = `${place.city} ${place.country}`.toLowerCase();
        return label.includes(searchTerm);
      })
      .map(destinationToSuggestion);

    const mergedPlaces = [...onlinePlaces, ...localPlaces];
    const uniquePlaces = new Map<string, PlaceSuggestion>();

    mergedPlaces.forEach((place) => {
      uniquePlaces.set(`${place.name}-${place.description}`, place);
    });

    return Array.from(uniquePlaces.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [destination, onlinePlaces]);

  const filteredFromPlaces = useMemo<PlaceSuggestion[]>(() => {
    const searchTerm = fromPlace.trim().toLowerCase();

    if (!searchTerm) {
      return sortedDestinations.map(destinationToSuggestion);
    }

    const localPlaces = sortedDestinations
      .filter((place) => {
        const label = `${place.city} ${place.country}`.toLowerCase();
        return label.includes(searchTerm);
      })
      .map(destinationToSuggestion);

    const mergedPlaces = [...onlineFromPlaces, ...localPlaces];
    const uniquePlaces = new Map<string, PlaceSuggestion>();

    mergedPlaces.forEach((place) => {
      uniquePlaces.set(`${place.name}-${place.description}`, place);
    });

    return Array.from(uniquePlaces.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [fromPlace, onlineFromPlaces]);

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function searchPlaces(value: string) {
    const searchTerm = value.trim();

    if (searchTerm.length < 2) {
      setOnlinePlaces([]);
      return;
    }

    setIsSearchingPlaces(true);

    try {
      const response = await fetch(
        `/api/places?q=${encodeURIComponent(searchTerm)}`,
      );
      const data = await response.json();

      if (response.ok && Array.isArray(data.places)) {
        setOnlinePlaces(data.places);
      }
    } catch {
      setOnlinePlaces([]);
    } finally {
      setIsSearchingPlaces(false);
    }
  }

  async function searchFromPlaces(value: string) {
    const searchTerm = value.trim();

    if (searchTerm.length < 2) {
      setOnlineFromPlaces([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/places?q=${encodeURIComponent(searchTerm)}`,
      );
      const data = await response.json();

      if (response.ok && Array.isArray(data.places)) {
        setOnlineFromPlaces(data.places);
      }
    } catch {
      setOnlineFromPlaces([]);
    }
  }

  function selectDestination(place: PlaceSuggestion) {
    setDestination(place.name);
    setIsDropdownOpen(false);
    setError("");
  }

  function selectFromPlace(place: PlaceSuggestion) {
    setFromPlace(place.name);
    setIsFromDropdownOpen(false);
    setError("");
  }

  function useSuggestedDestination(card: DestinationCard) {
    setDestination(`${card.name}, ${card.region}`);
    setIsDropdownOpen(false);
    setError("");
  }

  function useSuggestedStartingPlace(card: DestinationCard) {
    setFromPlace(`${card.name}, ${card.region}`);
    setIsFromDropdownOpen(false);
    setError("");
  }

  function updateStartDate(value: string) {
    setStartDate(value);

    const tripDays = calculateTripDays(value, endDate);
    if (tripDays) {
      setDays(String(tripDays));
    }
  }

  function updateEndDate(value: string) {
    setEndDate(value);

    const tripDays = calculateTripDays(startDate, value);
    if (tripDays) {
      setDays(String(tripDays));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPlanNotice("");
    setTravelPlan(null);

    if (!destination.trim()) {
      setError("Please select or enter a destination.");
      return;
    }

    const selectedTripDays = calculateTripDays(startDate, endDate);

    if ((startDate && !endDate) || (!startDate && endDate)) {
      setError("Please select both travel start date and end date.");
      return;
    }

    if (startDate && endDate && !selectedTripDays) {
      setError("Travel end date must be the same as or after the start date.");
      return;
    }

    const tripDays = selectedTripDays ?? Number(days);

    if (!tripDays || tripDays < 1) {
      setError("Please enter at least 1 travel day.");
      return;
    }

    if (!budget || Number(budget) <= 0) {
      setError("Please enter a budget greater than 0.");
      return;
    }

    if (selectedInterests.length === 0) {
      setError("Please select at least one interest.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromPlace,
          destination,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          days: tripDays,
          budget: `${currency} ${Number(budget).toLocaleString()}`,
          travelers: {
            adults: adultTravellers,
            children: childTravellers,
            infants: infantTravellers,
          },
          interests: selectedInterests,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate a trip plan.");
      }

      setTravelPlan(data.travelPlan);
      setPlanNotice(data.notice || "");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate a trip plan right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWeatherLookup() {
    setWeatherError("");

    if (!destination.trim()) {
      setWeatherError("Select or enter a destination to load weather.");
      return;
    }

    setIsWeatherLoading(true);

    try {
      const weatherUrl = new URL("/api/weather", window.location.origin);
      weatherUrl.searchParams.set("destination", destination);

      if (startDate && endDate) {
        weatherUrl.searchParams.set("startDate", startDate);
        weatherUrl.searchParams.set("endDate", endDate);
      }

      const response = await fetch(
        `${weatherUrl.pathname}${weatherUrl.search}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load weather.");
      }

      setWeatherData(data);
    } catch (error) {
      setWeatherError(
        error instanceof Error
          ? error.message
          : "Unable to load weather right now.",
      );
    } finally {
      setIsWeatherLoading(false);
    }
  }

  async function handleMapLookup() {
    setMapError("");

    if (!destination.trim()) {
      setMapError("Select or enter a destination to load the travel map.");
      return;
    }

    setIsMapLoading(true);

    try {
      const response = await fetch(
        `/api/map?destination=${encodeURIComponent(destination)}&language=${encodeURIComponent(mapLanguage)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load map places.");
      }

      setMapData(data);
    } catch (error) {
      setMapError(
        error instanceof Error
          ? error.message
          : "Unable to load the travel map right now.",
      );
    } finally {
      setIsMapLoading(false);
    }
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChatError("");

    const question = chatInput.trim();

    if (!destination.trim()) {
      setChatError("Select or enter a destination before asking the guide.");
      return;
    }

    if (!question) {
      setChatError("Type a question for the travel guide.");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: question },
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination,
          messages: nextMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to answer right now.");
      }

      setChatMessages((current) => [
        ...current,
        { role: "guide", content: data.answer },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Unable to answer right now.",
      );
    } finally {
      setIsChatLoading(false);
    }
  }

  function handlePdfExport() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#111827]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-10 lg:py-10">
        <div className="relative flex min-h-[430px] overflow-hidden rounded-lg bg-[#12343b] p-8 text-white sm:p-10 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,52,59,0.96),rgba(18,52,59,0.58)),url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />

          <div className="relative z-10 flex max-w-xl flex-col justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
                Smart itinerary builder
              </p>
              <div className="mt-5 flex items-center gap-4">
                <div
                  className="travel-bud-globe relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/30 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0,#7dd3fc_14%,#0f8b8d_34%,#12343b_72%)] shadow-[0_18px_45px_rgba(0,0,0,0.28)] before:absolute before:inset-2 before:rounded-full before:border before:border-white/30 before:content-[''] after:absolute after:left-[-20%] after:top-[47%] after:h-1 after:w-[140%] after:rounded-full after:bg-white/35 after:content-['']"
                  aria-hidden="true"
                >
                  <span className="absolute left-5 top-2 h-12 w-5 rounded-full border-x border-white/35" />
                  <span className="absolute left-2 top-5 h-5 w-12 rounded-full border-y border-white/35" />
                  <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#f97316]" />
                </div>
                <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  Travel Bud
                </h1>
              </div>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#eef7fb] sm:text-lg">
                Search global destinations, choose your currency, and generate
                a complete trip plan for your travel style.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {destinationCards.map((card) => (
                <article
                  key={`${card.name}-${card.region}`}
                  className="group overflow-hidden rounded-md border border-white/15 bg-white/10 text-left transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <img
                    src={card.image}
                    alt={`${card.name}, ${card.region}`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = card.fallbackImage;
                    }}
                    className="h-20 w-full object-cover"
                  />
                  <span className="block px-3 py-2">
                    <span className="block text-sm font-bold text-white">
                      {card.name}
                    </span>
                    <span className="block text-xs text-[#d9eef6]">
                      {card.region} - {card.summary}
                    </span>
                    <span className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => useSuggestedStartingPlace(card)}
                        className="rounded bg-white/10 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
                      >
                        Start
                      </button>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => useSuggestedDestination(card)}
                        className="rounded bg-white px-2 py-1 text-[11px] font-bold text-[#12343b] transition hover:bg-[#d9eef6]"
                      >
                        Destination
                      </button>
                    </span>
                  </span>
                </article>
              ))}
            </div>

            <div className="grid gap-3 text-sm text-[#d9eef6] sm:grid-cols-3">
              <div>
                <span className="block text-2xl font-bold text-white">
                  Worldwide
                </span>
                Destinations
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">150+</span>
                Currencies
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">24/7</span>
                Planner
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div
            className="w-full rounded-lg border border-[#d9e2ec] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8"
          >
            <form onSubmit={handleSubmit}>
              <div className="mb-7">
                <h2 className="text-2xl font-bold sm:text-3xl">Plan your trip</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6878]">
                  Add the basics and get a practical trip plan with clear daily
                  details.
                </p>
              </div>

            <div className="grid gap-5">
              <div className="relative grid gap-2">
                <label className="text-sm font-semibold" htmlFor="from-place">
                  Starting place
                </label>
                <input
                  suppressHydrationWarning
                  id="from-place"
                  value={fromPlace}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFromPlace(value);
                    setIsFromDropdownOpen(true);
                    void searchFromPlaces(value);
                  }}
                  onFocus={() => setIsFromDropdownOpen(true)}
                  placeholder="Search your starting village, city, state, country..."
                  className="h-12 rounded-md border border-[#cfd9e5] px-4 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  autoComplete="off"
                />

                {isFromDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[76px] z-20 max-h-72 overflow-y-auto rounded-md border border-[#cfd9e5] bg-white shadow-xl">
                    {filteredFromPlaces.length > 0 ? (
                      filteredFromPlaces.map((place) => (
                        <button
                          suppressHydrationWarning
                          key={`from-${place.id}`}
                          type="button"
                          onClick={() => selectFromPlace(place)}
                          className="block w-full border-b border-[#edf2f7] px-4 py-3 text-left last:border-b-0 hover:bg-[#eefafa]"
                        >
                          <span className="block text-sm font-bold text-[#111827]">
                            {place.name}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#64748b]">
                            {place.description}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-[#64748b]">
                        No saved places found. You can still use your typed
                        starting place.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="relative grid gap-2">
                <label className="text-sm font-semibold" htmlFor="destination">
                  Destination
                </label>
                <input
                  suppressHydrationWarning
                  id="destination"
                  value={destination}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDestination(value);
                    setIsDropdownOpen(true);
                    void searchPlaces(value);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search village, city, district, state, country..."
                  className="h-12 rounded-md border border-[#cfd9e5] px-4 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  autoComplete="off"
                />

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[76px] z-20 max-h-72 overflow-y-auto rounded-md border border-[#cfd9e5] bg-white shadow-xl">
                    {isSearchingPlaces && (
                      <p className="border-b border-[#edf2f7] px-4 py-3 text-sm text-[#64748b]">
                        Searching more places...
                      </p>
                    )}

                    {filteredDestinations.length > 0 ? (
                      filteredDestinations.map((place) => (
                        <button
                          suppressHydrationWarning
                          key={place.id}
                          type="button"
                          onClick={() => selectDestination(place)}
                          className="block w-full border-b border-[#edf2f7] px-4 py-3 text-left last:border-b-0 hover:bg-[#eefafa]"
                        >
                          <span className="block text-sm font-bold text-[#111827]">
                            {place.name}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#64748b]">
                            {place.description}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-[#64748b]">
                        No saved places found. You can still use your typed
                        destination.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2" htmlFor="start-date">
                  <span className="text-sm font-semibold">
                    Travel start date
                  </span>
                  <input
                    suppressHydrationWarning
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => updateStartDate(event.target.value)}
                    className="h-12 rounded-md border border-[#cfd9e5] px-4 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  />
                </label>

                <label className="grid gap-2" htmlFor="end-date">
                  <span className="text-sm font-semibold">Travel end date</span>
                  <input
                    suppressHydrationWarning
                    id="end-date"
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(event) => updateEndDate(event.target.value)}
                    className="h-12 rounded-md border border-[#cfd9e5] px-4 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2" htmlFor="days">
                  <span className="text-sm font-semibold">Days</span>
                  <input
                    suppressHydrationWarning
                    id="days"
                    type="number"
                    min="1"
                    max="30"
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                    className="h-12 rounded-md border border-[#cfd9e5] px-4 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  />
                </label>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold" htmlFor="budget">
                    Budget
                  </label>
                  <div className="grid grid-cols-[128px_1fr] overflow-hidden rounded-md border border-[#cfd9e5] focus-within:border-[#0f8b8d] focus-within:ring-4 focus-within:ring-[#0f8b8d]/15">
                    <select
                      suppressHydrationWarning
                      aria-label="Currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="h-12 border-r border-[#cfd9e5] bg-[#f9fbfd] px-3 text-sm font-semibold outline-none"
                    >
                      {currencies.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <input
                      suppressHydrationWarning
                      id="budget"
                      type="number"
                      min="1"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      className="h-12 px-4 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Number of travellers
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">
                    Used to adjust pace, transport, stay type, safety, and
                    family-friendly planning.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <TravellerCounter
                    label="Adults"
                    helper="18+ years"
                    value={adultTravellers}
                    min={1}
                    max={20}
                    onChange={setAdultTravellers}
                  />
                  <TravellerCounter
                    label="Children"
                    helper="3 to 17 years"
                    value={childTravellers}
                    min={0}
                    max={20}
                    onChange={setChildTravellers}
                  />
                  <TravellerCounter
                    label="Infants"
                    helper="Below 3 years"
                    value={infantTravellers}
                    min={0}
                    max={10}
                    onChange={setInfantTravellers}
                  />
                </div>
              </div>

              <div className="relative grid gap-2">
                <label
                  className="text-sm font-semibold"
                  htmlFor="interest-preferences"
                >
                  Interests and preferences
                </label>
                <button
                  suppressHydrationWarning
                  id="interest-preferences"
                  type="button"
                  onClick={() => setIsInterestsOpen((current) => !current)}
                  className="flex min-h-12 w-full items-center justify-between rounded-md border border-[#cfd9e5] bg-white px-4 text-left outline-none transition hover:border-[#0f8b8d] focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  aria-expanded={isInterestsOpen}
                >
                  <span className="text-sm font-semibold text-[#334155]">
                    {selectedInterests.length > 0
                      ? `${selectedInterests.length} selected`
                      : "Select interests and preferences"}
                  </span>
                  <span className="text-lg text-[#64748b]" aria-hidden="true">
                    {isInterestsOpen ? "-" : "+"}
                  </span>
                </button>

                {selectedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-[#eefafa] px-3 py-1 text-xs font-bold text-[#0f766e]"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {isInterestsOpen && (
                  <div className="absolute left-0 right-0 top-[78px] z-20 max-h-80 overflow-y-auto rounded-md border border-[#cfd9e5] bg-white p-2 shadow-xl">
                    {interests.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);

                      return (
                        <label
                          key={interest}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-[#334155] hover:bg-[#eefafa]"
                        >
                          <input
                            suppressHydrationWarning
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleInterest(interest)}
                            className="h-4 w-4 accent-[#0f8b8d]"
                          />
                          {interest}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-md border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
                {error}
              </div>
            )}

            {planNotice && (
              <div className="mt-5 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#92400e]">
                {planNotice}
              </div>
            )}

            <button
              suppressHydrationWarning
              type="submit"
              disabled={isLoading}
              className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-md bg-[#f97316] px-5 text-sm font-bold text-white transition hover:bg-[#ea580c] focus:outline-none focus:ring-4 focus:ring-[#f97316]/20 disabled:cursor-not-allowed disabled:bg-[#fb923c]"
            >
              {isLoading && (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isLoading ? "Building your trip plan..." : "Generate Trip Plan"}
            </button>
            </form>

            <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
                    Weather intelligence
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-[#111827]">
                    Plan around the forecast
                  </h3>
                </div>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={handleWeatherLookup}
                  disabled={isWeatherLoading}
                  className="h-11 rounded-md bg-[#12343b] px-4 text-sm font-bold text-white transition hover:bg-[#1f4a53] disabled:cursor-not-allowed disabled:bg-[#5b7480]"
                >
                  {isWeatherLoading ? "Loading weather..." : "Load Weather"}
                </button>
              </div>

              {weatherError && (
                <div className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
                  {weatherError}
                </div>
              )}

              {!weatherData ? (
                <p className="mt-4 text-sm leading-6 text-[#64748b]">
                  Load the current weather and 5-day forecast for your selected
                  destination before finalizing outdoor plans.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 text-sm text-[#334155]">
                  <article className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4">
                    <h4 className="font-bold text-[#111827]">
                      {weatherData.location.name}
                      {weatherData.location.country
                        ? `, ${weatherData.location.country}`
                        : ""}
                    </h4>
                    <p className="mt-2 leading-6">{weatherData.summary}</p>
                    <p className="mt-2 rounded-md bg-white px-3 py-2 leading-6 text-[#475569]">
                      {weatherData.forecastNote}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Metric
                        label="Current"
                        value={`${formatTemperature(weatherData.current.temperature)} / ${weatherData.current.summary}`}
                      />
                      <Metric
                        label="Feels like"
                        value={formatTemperature(weatherData.current.feelsLike)}
                      />
                      <Metric
                        label="Wind"
                        value={`${weatherData.current.windSpeed ?? "N/A"} km/h`}
                      />
                    </div>
                    <p className="mt-3 rounded-md bg-white px-3 py-2 font-semibold text-[#be123c]">
                      {weatherData.rainAlert}
                    </p>
                  </article>

                  <div className="grid gap-3 sm:grid-cols-5">
                    {weatherData.forecast.map((day) => (
                      <article
                        key={day.date}
                        className="rounded-md border border-[#d9e2ec] bg-white p-3"
                      >
                        <h4 className="font-bold text-[#111827]">
                          {formatDate(day.date)}
                        </h4>
                        <p className="mt-2 leading-5">{day.summary}</p>
                        <p className="mt-2 text-xs text-[#64748b]">
                          {formatTemperature(day.minTemp)} -{" "}
                          {formatTemperature(day.maxTemp)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#0f8b8d]">
                          Rain {day.rainProbability}%
                        </p>
                      </article>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoList
                      title="Alternate activity recommendations"
                      items={weatherData.alternateActivities}
                    />
                    <InfoList
                      title="Weather-based travel recommendations"
                      items={weatherData.travelRecommendations}
                    />
                  </div>
                </div>
              )}
            </section>

            <DestinationDashboard
              destination={destination}
              days={days}
              budget={`${currency} ${Number(budget || 0).toLocaleString()}`}
              travelPlan={travelPlan}
              weatherData={weatherData}
              mapData={mapData}
            />

            <InteractiveTravelMap
              mapData={mapData}
              isLoading={isMapLoading}
              error={mapError}
              selectedLanguage={mapLanguage}
              languages={mapLanguages}
              onLanguageChange={(language) => {
                setMapLanguage(language);
                setMapData(null);
              }}
              onLoadMap={handleMapLookup}
            />

            <AccommodationSuggestions
              destination={destination}
              startDate={startDate}
              endDate={endDate}
              travelers={{
                adults: adultTravellers,
                children: childTravellers,
                infants: infantTravellers,
              }}
              mapData={mapData}
              onLoadMap={handleMapLookup}
              isMapLoading={isMapLoading}
            />

            <section
              id="travel-plan-export"
              className="mt-6 rounded-lg border border-[#d9e2ec] bg-[#f9fbfd] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
                Complete trip plan
              </p>
              <div className="hidden print:block">
                <h1 className="text-3xl font-bold text-[#111827]">
                  Travel Bud
                </h1>
                <p className="mt-2 text-sm text-[#475569]">
                  Trip plan from {fromPlace || "your starting place"} to{" "}
                  {destination || "your destination"}
                </p>
                <p className="mt-1 text-sm text-[#475569]">
                  Travellers: {adultTravellers} adult
                  {adultTravellers === 1 ? "" : "s"}, {childTravellers} child
                  {childTravellers === 1 ? "" : "ren"}, {infantTravellers} infant
                  {infantTravellers === 1 ? "" : "s"}
                </p>
              </div>

              {!travelPlan ? (
                isLoading ? (
                  <PlanSkeleton />
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-[#cfd9e5] bg-white p-4 text-sm leading-6 text-[#334155]">
                    Your generated travel plan will appear here after you
                    submit the form.
                  </p>
                )
              ) : (
                <div className="mt-4 grid gap-5 text-sm text-[#334155]">
                  <div className="flex justify-end print:hidden">
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={handlePdfExport}
                      className="rounded-md bg-[#12343b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1f4a53]"
                    >
                      Export PDF
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {travelPlan.dailyPlan.map((day) => (
                      <article
                        key={day.day}
                        className="overflow-hidden rounded-md border border-[#d9e2ec] bg-white"
                      >
                        <img
                          src={getDestinationImage(destination)}
                          alt={`${destination || "Travel"} plan image`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = fallbackDestinationImage;
                          }}
                          className="h-44 w-full object-cover"
                        />
                        <div className="p-4">
                          <h3 className="font-bold text-[#111827]">
                            Day {day.day}: {day.title}
                          </h3>
                          <PlanList
                            title="Morning"
                            items={day.morningActivities}
                          />
                          <PlanList
                            title="Afternoon"
                            items={day.afternoonActivities}
                          />
                          <PlanList
                            title="Evening"
                            items={day.eveningActivities}
                          />
                          <p className="mt-3 rounded-md bg-[#f9fbfd] px-3 py-2 leading-6">
                            <strong>Estimated daily budget:</strong>{" "}
                            {day.estimatedDailyBudget}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <RouteOptions
                    fromPlace={fromPlace}
                    destination={destination}
                    routeOptions={travelPlan.routeOptions ?? []}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoList
                      title="Food recommendations"
                      items={travelPlan.foodRecommendations}
                    />
                    <InfoList
                      title="Transportation recommendations"
                      items={travelPlan.transportationRecommendations}
                    />
                    <InfoList title="Travel tips" items={travelPlan.travelTips} />
                    <InfoList title="Hidden gems" items={travelPlan.hiddenGems} />
                    <InfoList
                      title="Tourist scams to avoid"
                      items={travelPlan.touristScamsToAvoid}
                    />
                    <InfoList
                      title="Local customs"
                      items={travelPlan.localCustoms}
                    />
                    <InfoList
                      title="Safety advice"
                      items={travelPlan.safetyAdvice}
                    />
                    <InfoList
                      title="Emergency information"
                      items={travelPlan.emergencyInformation}
                    />
                    <InfoList
                      title="Best local foods"
                      items={travelPlan.bestLocalFoods}
                    />
                    <InfoList
                      title="Nearby places to consider"
                      items={travelPlan.nearbyPlaces ?? []}
                    />
                  </div>

                  <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
                    <h3 className="font-bold text-[#111827]">
                      Basic local language guide
                    </h3>
                    <div className="mt-3 grid gap-3">
                      {(travelPlan.languageGuide ?? []).map((phrase) => (
                        <div
                          key={`${phrase.english}-${phrase.local}`}
                          className="rounded-md bg-[#f9fbfd] p-3 text-sm leading-6"
                        >
                          <p className="font-bold text-[#111827]">
                            {phrase.english}
                          </p>
                          <p>
                            <strong>Local:</strong> {phrase.local}
                          </p>
                          <p>
                            <strong>Pronunciation:</strong>{" "}
                            {phrase.pronunciation}
                          </p>
                          <p className="text-[#64748b]">{phrase.usage}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
                    <h3 className="font-bold text-[#111827]">
                      Budget summary
                    </h3>
                    <dl className="mt-3 grid gap-2 leading-6">
                      {Object.entries(travelPlan.budgetSummary).map(
                        ([label, value]) => (
                          <div key={label}>
                            <dt className="inline font-bold capitalize text-[#111827]">
                              {formatBudgetLabel(label)}:{" "}
                            </dt>
                            <dd className="inline">{value}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </article>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
                  Travel guide chat
                </p>
                <h3 className="mt-2 text-lg font-bold text-[#111827]">
                  Ask a local-style guide
                </h3>
              </div>

              <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                    className={`rounded-md px-3 py-2 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-8 bg-[#0f8b8d] text-white"
                        : "mr-8 border border-[#d9e2ec] bg-white text-[#334155]"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}

                {isChatLoading && (
                  <div className="mr-8 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-sm text-[#64748b]">
                    The guide is checking your question...
                  </div>
                )}
              </div>

              {chatError && (
                <div className="mt-3 rounded-md border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
                  {chatError}
                </div>
              )}

              <form onSubmit={handleChatSubmit} className="mt-4 grid gap-3">
                <label className="grid gap-2" htmlFor="guide-question">
                  <span className="text-sm font-semibold">
                    Ask about {destination || "your destination"}
                  </span>
                  <textarea
                    suppressHydrationWarning
                    id="guide-question"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Example: Which area is better for food and evening walks?"
                    className="min-h-24 resize-none rounded-md border border-[#cfd9e5] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
                  />
                </label>

                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={isChatLoading}
                  className="flex h-11 items-center justify-center rounded-md bg-[#12343b] px-5 text-sm font-bold text-white transition hover:bg-[#1f4a53] focus:outline-none focus:ring-4 focus:ring-[#0f8b8d]/20 disabled:cursor-not-allowed disabled:bg-[#5b7480]"
                >
                  {isChatLoading ? "Asking guide..." : "Ask Guide"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function TravellerCounter({
  label,
  helper,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  function updateValue(nextValue: number) {
    onChange(Math.min(max, Math.max(min, nextValue)));
  }

  return (
    <div className="rounded-md border border-[#d9e2ec] bg-white p-3">
      <div>
        <p className="text-sm font-bold text-[#111827]">{label}</p>
        <p className="text-xs text-[#64748b]">{helper}</p>
      </div>

      <div className="mt-3 flex h-11 items-center justify-between rounded-md border border-[#cfd9e5] bg-[#f9fbfd] px-2">
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => updateValue(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-lg font-bold text-[#12343b] shadow-sm transition hover:bg-[#eefafa] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
        >
          -
        </button>
        <span className="text-lg font-bold text-[#111827]">{value}</span>
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => updateValue(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-lg font-bold text-[#12343b] shadow-sm transition hover:bg-[#eefafa] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function AccommodationSuggestions({
  destination,
  startDate,
  endDate,
  travelers,
  mapData,
  onLoadMap,
  isMapLoading,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  mapData: MapData | null;
  onLoadMap: () => void;
  isMapLoading: boolean;
}) {
  const hotels =
    mapData?.markers
      .filter(
        (marker) =>
          marker.category.toLowerCase().includes("hotel") &&
          !marker.id.startsWith("fallback-"),
      )
      .slice(0, 6) ?? [];
  const staySearchIdeas = buildStaySearchIdeas(destination);

  return (
    <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
            Stay suggestions
          </p>
          <h3 className="mt-2 text-lg font-bold text-[#111827]">
            Nearby accommodation options
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            Suggested stays are planning leads from map data and stay-area
            searches. Always verify ratings, price, reviews, cancellation rules,
            and availability before booking.
          </p>
        </div>
        {!mapData && (
          <button
            suppressHydrationWarning
            type="button"
            onClick={onLoadMap}
            disabled={isMapLoading || !destination.trim()}
            className="h-11 rounded-md bg-[#12343b] px-4 text-sm font-bold text-white transition hover:bg-[#1f4a53] disabled:cursor-not-allowed disabled:bg-[#5b7480]"
          >
            {isMapLoading ? "Loading stays..." : "Find Stays"}
          </button>
        )}
      </div>

      {destination.trim() && (
        <div className="mt-4 rounded-md border border-[#d9e2ec] bg-[#eefafa] p-4 text-sm leading-6 text-[#334155]">
          <strong className="text-[#111827]">Traveller-aware stay filter:</strong>{" "}
          {buildTravelerStayAdvice(travelers)}
        </div>
      )}

      {!destination.trim() ? (
        <p className="mt-4 rounded-md border border-dashed border-[#cfd9e5] bg-[#f9fbfd] p-4 text-sm leading-6 text-[#64748b]">
          Select a destination to view nearby hotels and booking search
          shortcuts.
        </p>
      ) : hotels.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-[#cfd9e5] bg-[#f9fbfd] p-4 text-sm leading-6 text-[#64748b]">
          No named hotel markers were found from the free map source for this
          destination. Use the worldwide stay-search ideas below to compare
          highly rated stays near {destination}.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {hotels.map((hotel) => (
            <article
              key={hotel.id}
              className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4"
            >
              <h4 className="font-bold text-[#111827]">{hotel.name}</h4>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                {hotel.description}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                {hotel.visitDuration}
              </p>
              <BookingLinks
                destination={`${hotel.name}, ${destination}`}
                startDate={startDate}
                endDate={endDate}
              />
            </article>
          ))}
        </div>
      )}

      {destination.trim() && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {staySearchIdeas.map((idea) => (
            <article
              key={idea.title}
              className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4"
            >
              <h4 className="font-bold text-[#111827]">{idea.title}</h4>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                {idea.description}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                Search and verify top-rated stays
              </p>
              <BookingLinks
                destination={`${idea.query}, ${destination}`}
                startDate={startDate}
                endDate={endDate}
              />
            </article>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4">
        <h4 className="font-bold text-[#111827]">
          Compare stays near {destination || "your destination"}
        </h4>
        <BookingLinks
          destination={destination}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </section>
  );
}

function BookingLinks({
  destination,
  startDate,
  endDate,
}: {
  destination: string;
  startDate: string;
  endDate: string;
}) {
  const links = buildBookingLinks(destination, startDate, endDate);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-[#cfd9e5] bg-white px-3 py-2 text-xs font-bold text-[#12343b] transition hover:border-[#0f8b8d] hover:text-[#0f8b8d]"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function buildStaySearchIdeas(destination: string) {
  const normalizedDestination = destination.toLowerCase();

  if (!destination.trim()) {
    return [];
  }

  if (normalizedDestination.includes("phuket")) {
    return [
      {
        title: "Patong Beach stays",
        query: "top rated hotels Patong Beach",
        description:
          "Good for nightlife, beach access, shopping, and first-time Phuket visitors who want many hotel choices.",
      },
      {
        title: "Kata and Karon stays",
        query: "top rated hotels Kata Beach Karon Beach",
        description:
          "Good for families, couples, beaches, calmer evenings, and a balanced Phuket trip.",
      },
      {
        title: "Phuket Old Town stays",
        query: "top rated hotels Phuket Old Town",
        description:
          "Good for cafes, local food, heritage streets, markets, and a less beach-focused stay.",
      },
      {
        title: "Bang Tao and Kamala stays",
        query: "top rated resorts Bang Tao Kamala Phuket",
        description:
          "Good for resorts, quieter beach stays, honeymoon trips, and a more relaxed pace.",
      },
    ];
  }

  if (normalizedDestination.includes("chennai")) {
    return [
      {
        title: "T Nagar and Nungambakkam stays",
        query: "top rated hotels T Nagar Nungambakkam Chennai",
        description:
          "Good for shopping, restaurants, central access, and business-friendly stays.",
      },
      {
        title: "Mylapore and Marina stays",
        query: "top rated hotels Mylapore Marina Beach Chennai",
        description:
          "Good for temples, culture, beach walks, and classic Chennai experiences.",
      },
      {
        title: "Egmore and Central station stays",
        query: "top rated hotels Egmore Chennai Central",
        description:
          "Good for train access, short stays, and travelers using public transport.",
      },
      {
        title: "OMR and ECR stays",
        query: "top rated hotels OMR ECR Chennai",
        description:
          "Good for IT corridor, beach resorts, family trips, and road access toward Mahabalipuram.",
      },
    ];
  }

  if (normalizedDestination.includes("paris")) {
    return [
      {
        title: "Central Paris stays",
        query: "top rated hotels central Paris",
        description:
          "Good for first-time visitors who want easy access to museums, cafes, and major sights.",
      },
      {
        title: "Left Bank stays",
        query: "top rated hotels Latin Quarter Saint Germain Paris",
        description:
          "Good for culture, cafes, bookshops, walkability, and classic Paris neighborhoods.",
      },
      {
        title: "Eiffel Tower area stays",
        query: "top rated hotels near Eiffel Tower Paris",
        description:
          "Good for landmark views, family trips, and travelers who prefer a recognizable base.",
      },
    ];
  }

  return [
    {
      title: "Central stay options",
      query: `top rated hotels central ${destination}`,
      description:
        "Good for first-time visitors, walkability, food access, and easier local transport.",
    },
    {
      title: "Transport-friendly stays",
      query: `top rated hotels near railway station bus stand airport ${destination}`,
      description:
        "Good for travelers arriving by train, bus, or flight who want easier pickup, drop, and onward travel.",
    },
    {
      title: "Local neighborhood stays",
      query: `best hotels local neighborhood ${destination}`,
      description:
        "Good for travelers who prefer local food, markets, temples, culture, and less tourist-heavy areas.",
    },
    {
      title: "Family-friendly stays",
      query: `top rated family friendly hotels ${destination}`,
      description:
        "Good for families, children, quieter surroundings, and practical room facilities.",
    },
    {
      title: "Budget-friendly stays",
      query: `best budget hotels ${destination}`,
      description:
        "Good for affordable trips, short stays, and travelers who want to save more for activities.",
    },
    {
      title: "Premium and honeymoon stays",
      query: `top rated luxury resorts hotels ${destination}`,
      description:
        "Good for honeymoon trips, special occasions, resort stays, and comfort-focused travel.",
    },
  ];
}

function buildTravelerStayAdvice(travelers: {
  adults: number;
  children: number;
  infants: number;
}) {
  const totalTravellers = travelers.adults + travelers.children + travelers.infants;
  const notes = [
    `${totalTravellers} traveller${totalTravellers === 1 ? "" : "s"}: ${travelers.adults} adult${travelers.adults === 1 ? "" : "s"}, ${travelers.children} child${travelers.children === 1 ? "" : "ren"}, ${travelers.infants} infant${travelers.infants === 1 ? "" : "s"}.`,
  ];

  if (travelers.children > 0) {
    notes.push(
      "Prioritize family rooms, safe surroundings, breakfast options, easy transport access, and nearby parks or low-effort activities.",
    );
  }

  if (travelers.infants > 0) {
    notes.push(
      "Prefer lifts, stroller access, quiet rooms, flexible cancellation, nearby pharmacy/clinic, baby cot availability, and shorter transfers.",
    );
  }

  if (travelers.children === 0 && travelers.infants === 0) {
    notes.push(
      "Compare central, transport-friendly, budget, premium, and local neighborhood stays based on your travel style.",
    );
  }

  return notes.join(" ");
}

function buildBookingLinks(destination: string, startDate: string, endDate: string) {
  const query = encodeURIComponent(destination || "hotels");
  const bookingDates =
    startDate && endDate ? `&checkin=${startDate}&checkout=${endDate}` : "";
  const agodaDates =
    startDate && endDate ? `&checkIn=${startDate}&checkOut=${endDate}` : "";

  return [
    {
      label: "Booking.com",
      href: `https://www.booking.com/searchresults.html?ss=${query}${bookingDates}`,
    },
    {
      label: "Agoda",
      href: `https://www.agoda.com/search?textToSearch=${query}${agodaDates}`,
    },
    {
      label: "Expedia",
      href: `https://www.expedia.com/Hotel-Search?destination=${query}`,
    },
    {
      label: "Google Hotels",
      href: `https://www.google.com/travel/hotels?q=${query}`,
    },
  ];
}

function destinationToSuggestion(place: Destination): PlaceSuggestion {
  return {
    id: `${place.city}-${place.country}`,
    name: `${place.city}, ${place.country}`,
    description: place.highlight,
  };
}

function getDestinationImage(destination: string) {
  const searchValue = destination.toLowerCase();
  const matchedCard = destinationCards.find((card) =>
    searchValue.includes(card.name.toLowerCase()),
  );

  return matchedCard?.image ?? fallbackDestinationImage;
}

function calculateTripDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null;
  }

  const startTime = new Date(`${startDate}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T00:00:00`).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return null;
  }

  const dayInMilliseconds = 24 * 60 * 60 * 1000;
  return Math.round((endTime - startTime) / dayInMilliseconds) + 1;
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <h4 className="font-bold text-[#111827]">{title}</h4>
      <ul className="mt-1 list-inside list-disc space-y-1 leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RouteOptions({
  fromPlace,
  destination,
  routeOptions,
}: {
  fromPlace: string;
  destination: string;
  routeOptions: NonNullable<TravelPlan["routeOptions"]>;
}) {
  if (routeOptions.length === 0) {
    return null;
  }

  return (
    <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
            How to reach
          </p>
          <h3 className="mt-1 font-bold text-[#111827]">
            {fromPlace ? `${fromPlace} to ${destination}` : `Getting to ${destination}`}
          </h3>
        </div>
        <p className="text-xs font-semibold text-[#64748b]">
          Verify live timings, fares, and seats before booking.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {routeOptions.map((option) => (
          <section
            key={`${option.mode}-${option.summary}`}
            className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-4"
          >
            <h4 className="font-bold text-[#111827]">{option.mode}</h4>
            <p className="mt-2 text-sm leading-6 text-[#334155]">
              {option.summary}
            </p>
            <dl className="mt-3 grid gap-2 text-sm leading-6 text-[#475569]">
              <div>
                <dt className="inline font-bold text-[#111827]">Best for: </dt>
                <dd className="inline">{option.bestFor}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-[#111827]">Check: </dt>
                <dd className="inline">{option.howToCheck}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-[#111827]">
                  Booking source:{" "}
                </dt>
                <dd className="inline">{option.bookingSource}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-[#111827]">Caution: </dt>
                <dd className="inline">{option.cautions}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
      <h3 className="font-bold text-[#111827]">{title}</h3>
      <ul className="mt-2 list-inside list-disc space-y-1 leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function PlanSkeleton() {
  return (
    <div className="mt-4 grid gap-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-md border border-[#d9e2ec] bg-white p-4"
        >
          <div className="h-4 w-1/3 rounded bg-[#d9e2ec]" />
          <div className="mt-4 grid gap-2">
            <div className="h-3 rounded bg-[#e8eef5]" />
            <div className="h-3 w-5/6 rounded bg-[#e8eef5]" />
            <div className="h-3 w-2/3 rounded bg-[#e8eef5]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function formatBudgetLabel(label: string) {
  return label.replace(/([A-Z])/g, " $1").trim();
}

function formatTemperature(value?: number) {
  return value === undefined ? "N/A" : `${Math.round(value)} deg C`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
