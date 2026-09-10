"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPoint = {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  species: string;
  severity: string;
  dateDisplay?: string | null;
};

const SPECIES_COLOR: Record<string, string> = {
  bear: "#c45c26",
  mountain_lion: "#d4a017",
  elk: "#c4a574",
  moose: "#6b8a6f",
  other: "#93b197",
};

export function IncidentMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-105, 50],
      zoom: 2.6,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const markers: maplibregl.Marker[] = [];
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "1px";
      el.style.background = SPECIES_COLOR[p.species] ?? "#93b197";
      el.style.border = "1px solid #f0e6d0";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<a href="/incidents/${p.slug}" style="color:#e4d4b4;text-decoration:none">
          <strong>${escapeHtml(p.title)}</strong><br/>
          <span style="color:#93b197;font-size:11px">${escapeHtml(p.dateDisplay ?? "")} · ${escapeHtml(p.severity)}</span>
        </a>`,
      );
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map));
    }

    if (points.length) {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of points) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, { padding: 48, maxZoom: 6, duration: 0 });
    }

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [points]);

  return (
    <div className="relative overflow-hidden border border-kraft-500/30">
      <div ref={ref} className="h-[420px] w-full sm:h-[520px]" />
      <div className="pointer-events-none absolute bottom-3 left-3 border border-kraft-500/40 bg-moss-950/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-kraft-300">
        {points.length} plotted
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
