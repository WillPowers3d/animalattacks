"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MIXED_CLUSTER,
  SPECIES,
  SPECIES_COLOR,
  speciesColor,
  speciesLabel,
  type Species,
} from "@/lib/species-style";
import { SEVERITY_LABELS, type Severity } from "@/lib/types";

export type MapCountry = "ALL" | "US" | "CA";

export type MapPoint = {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  species: string;
  severity: string;
  dateDisplay?: string | null;
  location?: string;
  summary?: string;
  caliber?: string | null;
  firearmType?: string | null;
  country?: string | null;
  sourceLabel?: string | null;
};

type Props = {
  points: MapPoint[];
  hiddenSpecies?: string[];
  onToggleSpecies?: (species: Species) => void;
  country?: MapCountry;
  onCountryChange?: (country: MapCountry) => void;
  showLegend?: boolean;
  compact?: boolean;
};

type IncidentProps = {
  slug: string;
  title: string;
  species: string;
  severity: string;
  dateDisplay: string;
  location: string;
  summary: string;
  caliber: string;
  firearmType: string;
  country: string;
  sourceLabel: string;
};

function toFeatureCollection(points: MapPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          slug: p.slug,
          title: p.title,
          species: p.species,
          severity: p.severity,
          dateDisplay: p.dateDisplay ?? "",
          location: p.location ?? "",
          summary: (p.summary ?? "").slice(0, 220),
          caliber: p.caliber ?? "",
          firearmType: p.firearmType ?? "",
          country: p.country ?? "",
          sourceLabel: p.sourceLabel ?? "",
        } satisfies IncidentProps,
      })),
  };
}

function popupHtml(p: IncidentProps) {
  const color = speciesColor(p.species);
  const severity = SEVERITY_LABELS[p.severity as Severity] ?? p.severity;
  const gun = p.caliber
    ? `<p class="map-pop-gun">${escapeHtml(p.firearmType ? `${p.firearmType} · ${p.caliber}` : p.caliber)}</p>`
    : "";
  const summary = p.summary
    ? `<p class="map-pop-sum">${escapeHtml(p.summary)}${p.summary.length >= 220 ? "…" : ""}</p>`
    : "";
  return `<div class="map-pop">
    <div class="map-pop-kicker">
      <span class="map-pop-dot" style="background:${color}"></span>
      <span>${escapeHtml(speciesLabel(p.species))}</span>
      <span class="map-pop-sev">${escapeHtml(severity)}</span>
    </div>
    <p class="map-pop-title">${escapeHtml(p.title)}</p>
    <p class="map-pop-meta">${escapeHtml([p.dateDisplay, p.location, p.sourceLabel].filter(Boolean).join(" · "))}</p>
    ${summary}
    ${gun}
    <a class="map-pop-link" href="/incidents/${encodeURIComponent(p.slug)}">Open full report →</a>
  </div>`;
}

export function IncidentMap({
  points,
  hiddenSpecies = [],
  onToggleSpecies,
  country = "ALL",
  onCountryChange,
  showLegend = true,
  compact = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const visible = useMemo(
    () =>
      points.filter((p) => {
        if (hiddenSpecies.includes(p.species)) return false;
        if (country === "ALL") return true;
        return (p.country ?? "").toUpperCase() === country;
      }),
    [points, hiddenSpecies, country],
  );

  const countryCounts = useMemo(() => {
    const next = { ALL: 0, US: 0, CA: 0 };
    for (const p of points) {
      if (hiddenSpecies.includes(p.species)) continue;
      next.ALL += 1;
      const c = (p.country ?? "").toUpperCase();
      if (c === "US") next.US += 1;
      if (c === "CA") next.CA += 1;
    }
    return next;
  }, [points, hiddenSpecies]);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const p of points) next[p.species] = (next[p.species] ?? 0) + 1;
    return next;
  }, [points]);

  const presentSpecies = SPECIES.filter((s) => (counts[s] ?? 0) > 0);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: wrapRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-105, 50],
      zoom: 2.7,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    mapRef.current = map;
    const popup = new maplibregl.Popup({
      offset: 16,
      maxWidth: "320px",
      closeButton: true,
      closeOnClick: true,
    });
    popupRef.current = popup;

    const onLoad = () => {
      map.addSource("incidents", {
        type: "geojson",
        data: toFeatureCollection(visibleRef.current),
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 48,
        clusterProperties: {
          bear: ["+", ["case", ["==", ["get", "species"], "bear"], 1, 0]],
          mountain_lion: ["+", ["case", ["==", ["get", "species"], "mountain_lion"], 1, 0]],
          elk: ["+", ["case", ["==", ["get", "species"], "elk"], 1, 0]],
          moose: ["+", ["case", ["==", ["get", "species"], "moose"], 1, 0]],
          other: ["+", ["case", ["==", ["get", "species"], "other"], 1, 0]],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "incidents",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            allOnly("bear"),
            SPECIES_COLOR.bear,
            allOnly("mountain_lion"),
            SPECIES_COLOR.mountain_lion,
            allOnly("elk"),
            SPECIES_COLOR.elk,
            allOnly("moose"),
            SPECIES_COLOR.moose,
            allOnly("other"),
            SPECIES_COLOR.other,
            MIXED_CLUSTER,
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 8, 22, 20, 28, 50, 34],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#1a140c",
          "circle-opacity": 0.94,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "incidents",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#1a140c" },
      });

      map.addLayer({
        id: "unclustered-halo",
        type: "circle",
        source: "incidents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": speciesMatchExpr(),
          "circle-radius": 14,
          "circle-opacity": 0.22,
        },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "incidents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": speciesMatchExpr(),
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0f120e",
        },
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const clusterId = feature.properties?.cluster_id as number;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const source = map.getSource("incidents") as GeoJSONSource;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: coords, zoom, duration: 450 });
        });
      });

      map.on("click", "unclustered", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature || feature.geometry.type !== "Point") return;
        const props = feature.properties as IncidentProps;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        popup.setLngLat(coords).setHTML(popupHtml(props)).addTo(map);
      });

      fitIfNeeded(map, visibleRef.current);
    };

    map.on("load", onLoad);

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
    // Mount once; data updates go through the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("incidents")) return;
    popupRef.current?.remove();
    (map.getSource("incidents") as GeoJSONSource).setData(toFeatureCollection(visible));
  }, [visible]);

  return (
    <div className="map-shell relative overflow-hidden border border-kraft-500/35 bg-moss-950 shadow-field">
      <div
        ref={wrapRef}
        className={compact ? "h-[280px] w-full sm:h-[340px]" : "h-[min(78vh,820px)] min-h-[460px] w-full"}
      />

      {showLegend && (
        <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-2 sm:inset-x-auto sm:left-3 sm:top-3 sm:max-w-[340px] sm:p-0">
          <div className="border border-kraft-500/40 bg-moss-950/92 p-2 shadow-field backdrop-blur-md sm:p-3">
            {onCountryChange && (
              <div className="mb-2">
                <p className="stamp mb-1.5 text-[10px] text-kraft-400">Country</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["ALL", "All", countryCounts.ALL],
                      ["US", "United States", countryCounts.US],
                      ["CA", "Canada", countryCounts.CA],
                    ] as const
                  ).map(([id, label, n]) => {
                    const on = country === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onCountryChange(id)}
                        className={`inline-flex min-h-11 items-center gap-2 border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                          on
                            ? "border-kraft-400/70 bg-moss-800 text-kraft-100"
                            : "border-moss-600 bg-moss-950/70 text-moss-400"
                        }`}
                      >
                        {label}
                        <span className="text-[10px] text-moss-300">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="stamp mb-2 text-[10px] text-kraft-400">Species on the map</p>
            <div className="flex flex-wrap gap-1.5">
              {presentSpecies.map((s) => {
                const on = !hiddenSpecies.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggleSpecies?.(s)}
                    className={`inline-flex min-h-11 items-center gap-2 border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                      on
                        ? "border-kraft-400/70 bg-moss-800 text-kraft-100"
                        : "border-moss-600 bg-moss-950/70 text-moss-400 line-through decoration-moss-500"
                    }`}
                  >
                    <span
                      className="inline-block size-3 shrink-0 rounded-[2px] ring-1 ring-black/40"
                      style={{ background: SPECIES_COLOR[s], opacity: on ? 1 : 0.35 }}
                    />
                    {speciesLabel(s)}
                    <span className="text-[10px] text-moss-300">{counts[s] ?? 0}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 hidden text-[10px] leading-snug text-moss-300 sm:block">
              Circles group nearby attacks at continental zoom — tap to expand. Dots are
              color-coded by animal.
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 border border-kraft-500/40 bg-moss-950/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-kraft-300">
        {visible.length} plotted
        {hiddenSpecies.length ? ` · ${hiddenSpecies.length} hidden` : ""}
      </div>
    </div>
  );
}

function allOnly(species: Species): maplibregl.ExpressionSpecification {
  const others = SPECIES.filter((s) => s !== species);
  return [
    "all",
    [">", ["get", species], 0],
    ...others.map((s) => ["==", ["get", s], 0] as maplibregl.ExpressionSpecification),
  ];
}

function speciesMatchExpr(): maplibregl.ExpressionSpecification {
  return [
    "match",
    ["get", "species"],
    "bear",
    SPECIES_COLOR.bear,
    "mountain_lion",
    SPECIES_COLOR.mountain_lion,
    "elk",
    SPECIES_COLOR.elk,
    "moose",
    SPECIES_COLOR.moose,
    SPECIES_COLOR.other,
  ];
}

function fitIfNeeded(map: maplibregl.Map, points: MapPoint[]) {
  if (!points.length) return;
  const bounds = new maplibregl.LngLatBounds();
  for (const p of points) bounds.extend([p.lng, p.lat]);
  map.fitBounds(bounds, { padding: 56, maxZoom: 5.4, duration: 0 });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
