import { FilterActions } from "@/components/FilterActions";
import type { IncidentQuery } from "@/lib/filters";
import {
  FIREARM_LABELS,
  FIREARM_TYPES,
  SEVERITIES,
  SEVERITY_LABELS,
  SPECIES,
  SPECIES_LABELS,
} from "@/lib/types";

const CALIBERS = [
  ".22 LR",
  ".22 Magnum",
  "9mm",
  ".38 Special",
  ".357 Magnum",
  ".40 S&W",
  "10mm",
  ".41 Magnum",
  ".44 Magnum",
  ".45 ACP",
  ".45 Colt",
  ".454 Casull",
  ".500 S&W",
  "Unknown handgun",
];

export function IncidentFilters({
  value,
  states,
  action = "/",
  hideSpeciesSelect = false,
}: {
  value: IncidentQuery;
  states: string[];
  action?: string;
  hideSpeciesSelect?: boolean;
}) {
  return (
    <form
      action={action}
      method="get"
      className="grid gap-3 border border-kraft-500/25 bg-moss-900/70 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {value.hide ? (
        <input type="hidden" name="hide" key={value.hide} defaultValue={value.hide} />
      ) : null}
      {!hideSpeciesSelect && (
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
          Species
          <select name="species" defaultValue={value.species ?? ""} className="field-input">
            <option value="">All species</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {SPECIES_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Region / state
        <select name="state" defaultValue={value.state ?? ""} className="field-input">
          <option value="">All regions</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        From
        <input type="date" name="from" defaultValue={value.from ?? ""} className="field-input" />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        To
        <input type="date" name="to" defaultValue={value.to ?? ""} className="field-input" />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Severity
        <select name="severity" defaultValue={value.severity ?? ""} className="field-input">
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Firearm type
        <select name="firearmType" defaultValue={value.firearmType ?? ""} className="field-input">
          <option value="">Any / none</option>
          {FIREARM_TYPES.map((s) => (
            <option key={s} value={s}>
              {FIREARM_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Caliber
        <select name="caliber" defaultValue={value.caliber ?? ""} className="field-input">
          <option value="">All calibers</option>
          {CALIBERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Search text
        <input
          name="q"
          defaultValue={value.q ?? ""}
          placeholder="place, name, keyword"
          className="field-input"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-moss-300">
        Geography
        <select name="naOnly" defaultValue={value.naOnly === "0" ? "0" : "1"} className="field-input">
          <option value="1">North America only (US / CA / MX)</option>
          <option value="0">All documented countries</option>
        </select>
      </label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
        <button
          type="submit"
          className="border border-rust-500 bg-rust-600 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white hover:bg-rust-500"
        >
          Apply filters
        </button>
        <a
          href={action}
          className="border border-moss-500 px-4 py-2 font-mono text-xs uppercase tracking-widest text-moss-200 hover:bg-moss-700"
        >
          Reset
        </a>
        <FilterActions query={value} />
      </div>
    </form>
  );
}
