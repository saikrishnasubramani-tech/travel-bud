"use client";

type TravelPlan = {
  dailyPlan: {
    day: number;
    title: string;
  }[];
  hiddenGems: string[];
  safetyAdvice: string[];
  travelTips: string[];
  budgetSummary: {
    overallEstimate: string;
    transport: string;
    food: string;
    activities: string;
    buffer: string;
  };
};

type WeatherData = {
  summary: string;
  rainAlert: string;
  current: {
    temperature?: number;
    summary: string;
  };
};

type MapData = {
  markers: {
    id: string;
    name: string;
    category: string;
  }[];
};

type DestinationDashboardProps = {
  destination: string;
  days: string;
  budget: string;
  travelPlan: TravelPlan | null;
  weatherData: WeatherData | null;
  mapData: MapData | null;
};

export function DestinationDashboard({
  destination,
  days,
  budget,
  travelPlan,
  weatherData,
  mapData,
}: DestinationDashboardProps) {
  const attractions =
    mapData?.markers
      .filter((marker) => marker.category === "Tourist attraction")
      .slice(0, 4) ?? [];
  const hiddenGemCount =
    travelPlan?.hiddenGems.length ??
    mapData?.markers.filter((marker) => marker.category === "Hidden gem").length ??
    0;
  const safetyScore = travelPlan?.safetyAdvice.length
    ? getSafetyScore(travelPlan.safetyAdvice)
    : null;

  return (
    <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-[#f9fbfd] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
        Destination dashboard
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Destination overview"
          value={destination || "Select a destination"}
          description={`${days || "0"} days planned with ${budget || "your"} budget.`}
        />
        <DashboardCard
          title="Weather summary"
          value={
            weatherData
              ? `${formatTemperature(weatherData.current.temperature)} / ${weatherData.current.summary}`
              : "Load weather"
          }
          description={weatherData?.summary ?? "Current weather and forecast will appear here."}
        />
        <DashboardCard
          title="Safety score"
          value={safetyScore === null ? "Generate plan" : `${safetyScore}/100`}
          description={
            safetyScore === null
              ? "Safety guidance will appear after the trip plan is generated."
              : "Based on current safety guidance in the generated plan."
          }
        />
        <DashboardCard
          title="Hidden gems"
          value={String(hiddenGemCount)}
          description="Less obvious places and experiences to consider."
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
          <h3 className="font-bold text-[#111827]">Budget summary</h3>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            {travelPlan?.budgetSummary.overallEstimate ??
              "Generate a trip plan to see the budget breakdown."}
          </p>
        </article>

        <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
          <h3 className="font-bold text-[#111827]">Top attractions</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-[#475569]">
            {attractions.length > 0 ? (
              attractions.map((marker) => <li key={marker.id}>{marker.name}</li>)
            ) : (
              <li>Load the map to discover nearby attractions.</li>
            )}
          </ul>
        </article>

        <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
          <h3 className="font-bold text-[#111827]">Quick travel tips</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-[#475569]">
            {(travelPlan?.travelTips.slice(0, 3) ?? [
              "Generate a trip plan to see local planning tips.",
            ]).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-md border border-[#d9e2ec] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
        {title}
      </p>
      <p className="mt-2 text-xl font-bold text-[#111827]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{description}</p>
    </article>
  );
}

function getSafetyScore(safetyAdvice: string[]) {
  const cautionWords = ["night", "scam", "avoid", "unsafe", "theft", "crowded"];
  const cautionCount = safetyAdvice.join(" ").toLowerCase().split(/\s+/).filter(
    (word) => cautionWords.includes(word),
  ).length;

  return Math.max(55, Math.min(92, 86 - cautionCount * 3));
}

function formatTemperature(value?: number) {
  return value === undefined ? "N/A" : `${Math.round(value)}°C`;
}
