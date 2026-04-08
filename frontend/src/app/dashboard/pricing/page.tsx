"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingDown, TrendingUp, Tag, BarChart2, DollarSign, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import { salesApi } from "@/lib/api";
import { clsx } from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChannelId = "all" | "Taobao" | "JD" | "Shopee" | "Temu" | "Facebook Marketplace";

const CHANNELS: { id: ChannelId; label: string; color: string; logo: string }[] = [
  { id: "all",                  label: "All Channels",        color: "bg-slate-100 text-slate-700 border-slate-200",   logo: "🌐" },
  { id: "Taobao",               label: "淘宝 Taobao",          color: "bg-orange-50 text-orange-600 border-orange-200", logo: "🛍️" },
  { id: "JD",                   label: "京东 JD",              color: "bg-red-50 text-red-600 border-red-200",          logo: "🏪" },
  { id: "Shopee",               label: "Shopee",               color: "bg-orange-50 text-orange-500 border-orange-300", logo: "🟠" },
  { id: "Temu",                 label: "Temu",                 color: "bg-blue-50 text-blue-600 border-blue-200",       logo: "💰" },
  { id: "Facebook Marketplace", label: "Facebook Marketplace", color: "bg-indigo-50 text-indigo-600 border-indigo-200", logo: "📘" },
];

type CompetitorRow = {
  product_id: number;
  product_name: string;
  our_price: number;
  competitor: string;
  competitor_price: number;
  diff: number;
  marketplace: string;
};

type TrendPoint = {
  date: string;
  our_price: number;
  competitor_price: number;
};

type BreakdownRow = {
  competitor: string;
  avg_price: number;
  avg_our_price: number;
  products_tracked: number;
  undercuts_us: number;
  avg_diff: number;
};

type SortKey = "product_name" | "our_price" | "competitor_price" | "diff";

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function PriceTrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">${p.value.toFixed(2)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-slate-100 pt-2 mt-2">
          <span className="text-slate-500 text-xs">Diff: </span>
          <span className={clsx(
            "font-semibold text-xs",
            payload[0].value - payload[1].value > 0 ? "text-red-500" : "text-emerald-500"
          )}>
            {(payload[0].value - payload[1].value) >= 0 ? "+" : ""}
            ${(payload[0].value - payload[1].value).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [channel, setChannel] = useState<ChannelId>("all");
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("diff");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const mkt = channel === "all" ? undefined : channel;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      salesApi.competitorPricing(undefined, mkt),
      salesApi.priceTrends(mkt),
      salesApi.competitorBreakdown(mkt),
    ]).then(([cp, pt, bd]) => {
      setCompetitors(cp.data);
      setTrends(pt.data);
      setBreakdown(bd.data);
    }).finally(() => setLoading(false));
  }, [channel]);

  // ── Sort / Filter ────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "product_name"); }
  };

  const filtered = competitors
    .filter((c) => c.product_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const cheaper   = competitors.filter((c) => c.diff < 0).length;
  const pricier   = competitors.filter((c) => c.diff > 0).length;
  const avgDiff   = competitors.length
    ? competitors.reduce((s, c) => s + c.diff, 0) / competitors.length
    : 0;
  const trackedProducts = new Set(competitors.map((c) => c.product_id)).size;

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? <span className="ml-1 text-brand-500">{sortAsc ? "↑" : "↓"}</span>
      : <span className="ml-1 text-slate-300">↕</span>;

  // ── Trend chart tick formatter ────────────────────────────────────────────────
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div>
      <PageHeader
        title="Competitor Pricing Comparison"
        description="Track how your prices compare to competitors across all marketplaces over time"
      />

      {/* Channel Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className={clsx(
              "px-3 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
              channel === ch.id
                ? ch.color + " border-current shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            <span className="text-base">{ch.logo}</span>
            <span>{ch.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Products Tracked"
              value={trackedProducts}
              icon={Tag}
              iconColor="bg-brand-500"
            />
            <KpiCard
              title="We're Cheaper"
              value={cheaper}
              subtitle="vs competitor"
              icon={TrendingDown}
              iconColor="bg-emerald-500"
            />
            <KpiCard
              title="We're Pricier"
              value={pricier}
              subtitle="vs competitor"
              icon={TrendingUp}
              iconColor="bg-red-500"
            />
            <KpiCard
              title="Avg Price Diff"
              value={`${avgDiff >= 0 ? "+" : ""}$${Math.abs(avgDiff).toFixed(2)}`}
              subtitle={avgDiff > 0 ? "we price higher" : avgDiff < 0 ? "we price lower" : "matched"}
              icon={DollarSign}
              iconColor={avgDiff > 0 ? "bg-red-400" : "bg-emerald-500"}
            />
          </div>

          {/* Line Chart + Competitor Breakdown — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Price Trend Line Chart — takes 2/3 */}
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                <h2 className="text-base font-semibold text-slate-700">Price Trends Over Time</h2>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Daily average — our listed price vs competitor average price
              </p>
              {trends.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-slate-300 text-sm">
                  No trend data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trends} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      width={50}
                    />
                    <Tooltip content={<PriceTrendTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="our_price"
                      name="Our Price"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="competitor_price"
                      name="Competitor Avg"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Competitor Breakdown Panel — takes 1/3 */}
            <div className="card flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-brand-400" />
                <h2 className="text-base font-semibold text-slate-700">Competitor Breakdown</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4">Average diff vs each competitor</p>

              {breakdown.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
                  No data
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto">
                  {breakdown.map((b) => {
                    const isBeating = b.avg_diff >= 0;
                    return (
                      <div key={b.competitor} className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">{b.competitor}</span>
                          <span className={clsx(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            isBeating
                              ? "bg-red-50 text-red-500"
                              : "bg-emerald-50 text-emerald-600"
                          )}>
                            {isBeating ? "+" : ""}${b.avg_diff.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <span>{b.products_tracked} products</span>
                          <span>·</span>
                          <span className={b.undercuts_us > 0 ? "text-red-400" : "text-emerald-500"}>
                            {b.undercuts_us} undercut{b.undercuts_us !== 1 ? "s" : ""} us
                          </span>
                        </div>
                        {/* Mini diff bar */}
                        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "absolute top-0 h-full rounded-full transition-all",
                              isBeating ? "bg-red-400 right-1/2" : "bg-emerald-400 left-1/2"
                            )}
                            style={{
                              width: `${Math.min(Math.abs(b.avg_diff) / Math.max(...breakdown.map(x => Math.abs(x.avg_diff))) * 50, 50)}%`,
                            }}
                          />
                          <div className="absolute top-0 left-1/2 w-px h-full bg-slate-300" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Comp avg ${b.avg_price.toFixed(2)}</span>
                          <span>Ours ${b.avg_our_price.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Full Table */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-slate-700">All Competitor Records</h2>
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input text-sm py-1.5 w-full sm:w-56"
              />
            </div>

            <div className="overflow-x-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No records found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                      {(
                        [
                          { key: "product_name",     label: "Product",     align: "text-left" },
                          { key: "our_price",         label: "Our Price",   align: "text-right" },
                          { key: "competitor_price",  label: "Comp. Price", align: "text-right" },
                          { key: "diff",              label: "Diff",        align: "text-right" },
                        ] as { key: SortKey; label: string; align: string }[]
                      ).map(({ key, label, align }) => (
                        <th
                          key={key}
                          onClick={() => handleSort(key)}
                          className={clsx(
                            "py-2.5 pr-4 font-medium cursor-pointer select-none hover:text-slate-600 transition-colors",
                            align
                          )}
                        >
                          {label}
                          <SortIcon col={key} />
                        </th>
                      ))}
                      <th className="py-2.5 pr-4 text-right font-medium">Competitor</th>
                      <th className="py-2.5 text-right font-medium">Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((c, i) => {
                      const isOver = c.diff > 0;
                      const isUnder = c.diff < 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-700 max-w-[200px] truncate">
                            {c.product_name}
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-700 tabular-nums">
                            ${c.our_price.toFixed(2)}
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-500 tabular-nums">
                            ${c.competitor_price.toFixed(2)}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className={clsx(
                              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums",
                              isOver  ? "bg-red-50 text-red-500" :
                              isUnder ? "bg-emerald-50 text-emerald-600" :
                                        "bg-slate-100 text-slate-500"
                            )}>
                              {isOver ? "▲" : isUnder ? "▼" : "—"}
                              {isOver || isUnder
                                ? ` $${Math.abs(c.diff).toFixed(2)}`
                                : " Even"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-xs text-slate-500">
                            {c.competitor}
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {c.marketplace}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {filtered.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 text-right">
                Showing {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
