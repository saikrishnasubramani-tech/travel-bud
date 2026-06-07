"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapMarker = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  color: string;
  description: string;
  openingHours: string;
  visitDuration: string;
};

type MapData = {
  center: {
    latitude: number;
    longitude: number;
    label: string;
  };
  markers: MapMarker[];
};

type InteractiveTravelMapProps = {
  mapData: MapData | null;
  isLoading: boolean;
  error: string;
  selectedLanguage: string;
  languages: {
    code: string;
    label: string;
  }[];
  onLanguageChange: (language: string) => void;
  onLoadMap: () => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  bindPopup?: (content: string) => LeafletLayer;
};

type LeafletMap = {
  eachLayer: (callback: (layer: LeafletLayer) => void) => void;
  removeLayer: (layer: LeafletLayer) => void;
  remove: () => void;
  setView: (coordinates: [number, number], zoom: number) => void;
};

type LeafletGlobal = {
  divIcon: (options: {
    className: string;
    html: string;
    iconAnchor: [number, number];
    iconSize: [number, number];
  }) => LeafletLayer;
  map: (element: HTMLDivElement, options: { scrollWheelZoom: boolean }) => LeafletMap;
  marker: (
    coordinates: [number, number],
    options: { icon: LeafletLayer },
  ) => LeafletLayer;
  tileLayer: (
    url: string,
    options: {
      attribution: string;
      maxZoom: number;
    },
  ) => LeafletLayer;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const mapViews = [
  {
    id: "road",
    label: "Road",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors",
  },
  {
    id: "light",
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  {
    id: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors, SRTM, OpenTopoMap',
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
];

let leafletPromise: Promise<void> | null = null;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const existingStylesheet = document.querySelector(
      'link[data-travel-bud-leaflet="true"]',
    );

    if (!existingStylesheet) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.travelBudLeaflet = "true";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load map library."));
    document.body.appendChild(script);
  });

  return leafletPromise;
}

export function InteractiveTravelMap({
  mapData,
  isLoading,
  error,
  selectedLanguage,
  languages,
  onLanguageChange,
  onLoadMap,
}: InteractiveTravelMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const [mapView, setMapView] = useState("road");
  const [mapLoadError, setMapLoadError] = useState("");
  const selectedMarker = mapData?.markers[0];
  const selectedMapView = useMemo(
    () => mapViews.find((view) => view.id === mapView) ?? mapViews[0],
    [mapView],
  );

  useEffect(() => {
    if (!mapData || !mapElementRef.current) return;

    let isMounted = true;

    async function renderMap() {
      try {
        await loadLeaflet();

        if (!isMounted || !window.L || !mapElementRef.current) return;

        if (!leafletMapRef.current) {
          leafletMapRef.current = window.L.map(mapElementRef.current, {
            scrollWheelZoom: true,
          });
        }

        const map = leafletMapRef.current;
        map.eachLayer((layer) => map.removeLayer(layer));
        map.setView([mapData.center.latitude, mapData.center.longitude], 12);

        window.L.tileLayer(selectedMapView.url, {
          attribution: selectedMapView.attribution,
          maxZoom: 19,
        }).addTo(map);

        mapData.markers.forEach((marker) => {
          const icon = window.L?.divIcon({
            className: "travel-bud-map-marker",
            html: `<span style="background:${marker.color}"></span>`,
            iconAnchor: [12, 12],
            iconSize: [24, 24],
          });

          if (!icon || !window.L) return;

          const markerLayer = window.L.marker(
            [marker.latitude, marker.longitude],
            { icon },
          );

          markerLayer.addTo(map);
          markerLayer.bindPopup?.(
            `<strong>${escapeHtml(marker.name)}</strong><br />${escapeHtml(marker.category)}<br />${escapeHtml(marker.visitDuration)}`,
          );
        });

        setMapLoadError("");
      } catch {
        setMapLoadError("Unable to load the interactive map. Please try again.");
      }
    }

    void renderMap();

    return () => {
      isMounted = false;
    };
  }, [mapData, selectedMapView]);

  useEffect(() => {
    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  return (
    <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f8b8d]">
            Interactive travel map
          </p>
          <h3 className="mt-2 text-lg font-bold text-[#111827]">
            Explore nearby places
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-[160px_170px_auto] sm:items-end">
          <label className="grid gap-1" htmlFor="map-language">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Map language
            </span>
            <select
              suppressHydrationWarning
              id="map-language"
              value={selectedLanguage}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="h-11 rounded-md border border-[#cfd9e5] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1" htmlFor="map-view">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
              Map view
            </span>
            <select
              suppressHydrationWarning
              id="map-view"
              value={mapView}
              onChange={(event) => setMapView(event.target.value)}
              className="h-11 rounded-md border border-[#cfd9e5] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#0f8b8d] focus:ring-4 focus:ring-[#0f8b8d]/15"
            >
              {mapViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.label}
                </option>
              ))}
            </select>
          </label>

          <button
            suppressHydrationWarning
            type="button"
            onClick={onLoadMap}
            disabled={isLoading}
            className="h-11 rounded-md bg-[#12343b] px-4 text-sm font-bold text-white transition hover:bg-[#1f4a53] disabled:cursor-not-allowed disabled:bg-[#5b7480]"
          >
            {isLoading ? "Loading map..." : "Load Map"}
          </button>
        </div>
      </div>

      {(error || mapLoadError) && (
        <div className="mt-4 rounded-md border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#be123c]">
          {error || mapLoadError}
        </div>
      )}

      {!mapData ? (
        <div className="mt-4 rounded-md border border-dashed border-[#cfd9e5] bg-[#f9fbfd] p-5 text-sm leading-6 text-[#64748b]">
          Select a destination and load the map to see attractions, hidden gems,
          food stops, hotels, and transport hubs.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-md border border-[#d9e2ec] bg-[#eef2f7]">
            <div ref={mapElementRef} className="h-[390px] w-full" />
          </div>

          <div className="grid gap-3">
            <p className="rounded-md bg-[#f9fbfd] px-3 py-2 text-xs leading-5 text-[#64748b]">
              Marker cards use your selected language when map data provides
              it. The Road view is the clearest default for streets and place
              context.
            </p>
            <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1">
              {mapData.markers.length === 0 ? (
                <p className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-3 text-sm text-[#64748b]">
                  No nearby map places were returned. Try a larger nearby city
                  or more specific destination name.
                </p>
              ) : (
                mapData.markers.map((marker) => (
                  <details
                    key={marker.id}
                    className="rounded-md border border-[#d9e2ec] bg-[#f9fbfd] p-3"
                    open={selectedMarker?.id === marker.id}
                  >
                    <summary className="cursor-pointer text-sm font-bold text-[#111827]">
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: marker.color }}
                      />
                      {marker.name}
                    </summary>
                    <dl className="mt-3 grid gap-2 text-sm leading-6 text-[#475569]">
                      <div>
                        <dt className="inline font-bold text-[#111827]">
                          Type:{" "}
                        </dt>
                        <dd className="inline">{marker.category}</dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#111827]">
                          Description:{" "}
                        </dt>
                        <dd className="inline">{marker.description}</dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#111827]">
                          Opening hours:{" "}
                        </dt>
                        <dd className="inline">{marker.openingHours}</dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#111827]">
                          Visit duration:{" "}
                        </dt>
                        <dd className="inline">{marker.visitDuration}</dd>
                      </div>
                    </dl>
                  </details>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
