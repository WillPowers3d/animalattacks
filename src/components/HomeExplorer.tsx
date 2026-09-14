"use client";

import { useCallback, useMemo, useState } from "react";
import { IncidentCard } from "@/components/IncidentCard";
import { IncidentFilters } from "@/components/IncidentFilters";
import { IncidentMap, type MapCountry } from "@/components/IncidentMap";
import type { ExplorerIncident } from "@/lib/explorer";
import type { IncidentQuery } from "@/lib/filters";
import { incidentLocation } from "@/lib/explorer";
import { sourceBadge } from "@/lib/source-badge";
import type { Species } from "@/lib/types";

function countryFromQuery(query: IncidentQuery): MapCountry {
  const c = (query.country ?? "").toUpperCase();
  if (c === "US" || c === "CA") return c;
  return "ALL";
}

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
  const [country, setCountry] = useState<MapCountry>(() => countryFromQuery(query));

  const visibleIncidents = useMemo(
    () =>
      incidents.filter((i) => {
        if (hidden.includes(i.species)) return false;
        if (country === "ALL") return true;
        return i.country.toUpperCase() === country;
      }),
    [incidents, hidden, country],
  );

  const syncUrl = useCallback((nextHidden: string[], nextCountry: MapCountry) => {
    const url = new URL(window.location.href);
    if (nextHidden.length) url.searchParams.set("hide", nextHidden.join(","));
    else url.searchParams.delete("hide");
    if (nextCountry === "ALL") url.searchParams.delete("country");
    else url.searchParams.set("country", nextCountry);
    url.searchParams.delete("species");
    window.history.replaceState(null, "", url);
  }, []);

  const toggleSpecies = useCallback(
    (species: Species) => {
      setHidden((prev) => {
        const next = prev.includes(species)
          ? prev.filter((s) => s !== species)
          : [...prev, species];
        syncUrl(next, country);
        return next;
      });
    },
    [syncUrl, country],
  );

  const changeCountry = useCallback(
    (next: MapCountry) => {
      setCountry(next);
      syncUrl(hidden, next);
    },
    [hidden, syncUrl],
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
          country: i.country,
          sourceLabel: sourceBadge(i).label,
        }))}
        hiddenSpecies={hidden}
        onToggleSpecies={toggleSpecies}
        country={country}
        onCountryChange={changeCountry}
      />

      <IncidentFilters
        value={{
          ...query,
          hide: hidden.join(","),
          country: country === "ALL" ? undefined : country,
        }}
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
            : "Nothing plotted. Toggle a country or animal on the map to show attacks again."}
        </p>
      )}
    </div>
  );
}
