"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartPoint {
  day: string; // YYYY-MM-DD
  price?: number | null;
  ev?: number | null;
}

export function PriceChart({ data, evLabel }: { data: ChartPoint[]; evLabel: string }) {
  if (data.length < 2) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Not enough history yet ({data.length} data point{data.length === 1 ? "" : "s"}). A point is added each day prices are refreshed or
        updated.
      </p>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${v}`} width={56} />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="price" name="Market price" stroke="var(--foreground)" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="ev" name={evLabel} stroke="var(--good)" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
