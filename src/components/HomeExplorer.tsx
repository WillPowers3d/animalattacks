"use client";

import { useCallback, useMemo, useState } from "react";
import { IncidentCard } from "@/components/IncidentCard";
import { IncidentFilters } from "@/components/IncidentFilters";
import { IncidentMap } from "@/components/IncidentMap";
import type { ExplorerIncident } from "@/lib/explorer";
import type { IncidentQuery } from "@/lib/filters";
import { incidentLocation } from "@/lib/explorer";
import type { Species } from "@/lib/types";

export function HomeExplorer({
  incidents,
  query,
  states,
}: {
  incidents: ExplorerIncident[];
  query: IncidentQuery;
  states: string[];
}) {
  const [hidden, setHidden] = useState<string[]>(() => {
    if (query.hide?.trim()) {
      return query.hide.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (query.species?.trim()) {
      const only = query.species.trim();
      return [...new Set(incidents.map((i) => i.species))].filter((s) => s !== only);
    }
    return [];
  });

  const visibleIncidents = useMemo(
    () => incidents.filter((i) => !hidden.includes(i.species)),
    [incidents, hidden],
  );

  const syncUrl = useCallback((nextHidden: string[]) => {
    const url = new URL(window.location.href);
    if (nextHidden.length) url.searchParams.set("hide", nextHidden.join(","));
    else url.searchParams.delete("hide");
    url.searchParams.delete("species");
    window.history.replaceState(null, "", url);
  }, []);

  const toggleSpecies = useCallback(
    (species: Species) => {
      setHidden((prev) => {
        const next = prev.includes(species)
          ? prev.filter((s) => s !== species)
          : [...prev, species];
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  return (
    <div className="space-y-6">
      <IncidentMap
        points={incidents.map((i) => ({
          slug: i.slug,
          title: i.title,
          lat: i.lat,
          lng: i.lng,
          species: i.species,
          severity: i.severity,
          dateDisplay: i.dateDisplay,
          location: incidentLocation(i),
          summary: i.summary,
          caliber: i.caliber,
          firearmType: i.firearmType,
        }))}
        hiddenSpecies={hidden}
        onToggleSpecies={toggleSpecies}
      />

      <IncidentFilters
        value={{ ...query, hide: hidden.join(",") }}
        states={states}
        hideSpeciesSelect
      />

      <div className="flex items-end justify-between gap-3">
        <h3 className="stamp text-[10px] text-kraft-400">Incident list</h3>
        <p className="font-mono text-xs text-moss-300">
          {visibleIncidents.length} on map · {incidents.length} after ledger filters
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleIncidents.map((inc) => (
          <IncidentCard key={inc.slug} incident={inc} />
        ))}
      </div>
      {visibleIncidents.length === 0 && (
        <p className="border border-dashed border-kraft-500/30 p-8 text-center text-moss-300">
          {incidents.length === 0
            ? "No incidents match these ledger filters."
            : "All species are hidden. Toggle an animal on the map to plot attacks again."}
        </p>
      )}
    </div>
  );
}
