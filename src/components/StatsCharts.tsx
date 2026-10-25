"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#c45c26", "#c4a574", "#6b8a6f", "#d4a017", "#93b197", "#e07a3a"];

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-kraft-500/25 bg-moss-900/50 p-4">
      <h3 className="stamp mb-3 text-[10px] text-kraft-400">{title}</h3>
      <div className="h-72">{children}</div>
    </section>
  );
}

export function SpeciesChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartFrame title="Incidents by species">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(196,165,116,0.12)" vertical={false} />
          <XAxis dataKey="name" stroke="#93b197" fontSize={12} />
          <YAxis stroke="#93b197" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#121a15", border: "1px solid #c4a574" }} />
          <Bar dataKey="count">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RegionChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartFrame title="Top regions">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid stroke="rgba(196,165,116,0.12)" horizontal={false} />
          <XAxis type="number" stroke="#93b197" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="name" stroke="#93b197" fontSize={11} width={48} />
          <Tooltip contentStyle={{ background: "#121a15", border: "1px solid #c4a574" }} />
          <Bar dataKey="count" fill="#c4a574" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function TrendChart({ data }: { data: { year: string; count: number }[] }) {
  return (
    <ChartFrame title="Trend by year">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(196,165,116,0.12)" />
          <XAxis dataKey="year" stroke="#93b197" fontSize={11} />
          <YAxis stroke="#93b197" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#121a15", border: "1px solid #c4a574" }} />
          <Line type="monotone" dataKey="count" stroke="#c45c26" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CaliberChart({
  data,
}: {
  data: { caliber: string; success: number; failure: number; indeterminate: number }[];
}) {
  return (
    <ChartFrame title="Handgun caliber outcomes (where recorded)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(196,165,116,0.12)" vertical={false} />
          <XAxis dataKey="caliber" stroke="#93b197" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
          <YAxis stroke="#93b197" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#121a15", border: "1px solid #c4a574" }} />
          <Legend />
          <Bar dataKey="success" stackId="a" fill="#6b8a6f" />
          <Bar dataKey="failure" stackId="a" fill="#c45c26" />
          <Bar dataKey="indeterminate" stackId="a" fill="#d4a017" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
