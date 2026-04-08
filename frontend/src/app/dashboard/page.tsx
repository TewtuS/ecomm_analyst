"use client";
/**
 * Main Dashboard – KPI cards + overview charts for all three segments.
 * KPI cards are clickable and reveal a drill-down detail panel.
 */
import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, ShoppingBag, RotateCcw, MousePointerClick,
  Eye, ShoppingCart, ThumbsUp, ThumbsDown, X, Star,
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { dashboardApi, salesApi, engagementApi, commentsApi } from "@/lib/api";

const COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

type KpiType = "revenue" | "orders" | "returns" | "ctr" | "visits" | "cart" | "positive" | "negative" | null;

const KPI_META: Record<string, { label: string; color: string; unit?: string }> = {
  revenue:  { label: "Revenue",          color: "#4f6ef7", unit: "$" },
  orders:   { label: "Orders",           color: "#10b981" },
  returns:  { label: "Returns",          color: "#f59e0b" },
  ctr:      { label: "Avg CTR",          color: "#8b5cf6", unit: "%" },
  visits:   { label: "Page Visits",      color: "#06b6d4" },
  cart:     { label: "Cart Adds",        color: "#6366f1" },
  positive: { label: "Positive Reviews", color: "#10b981" },
  negative: { label: "Negative Reviews", color: "#ef4444" },
};

function formatValue(kpi: string, val: number): string {
  if (kpi === "revenue") return `$${val.toLocaleString()}`;
  if (kpi === "ctr") return `${val}%`;
  return val.toLocaleString();
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [salesTrend, setSalesTrend] = useState([]);
  const [sentiment, setSentiment] = useState([]);
  const [engagementTrend, setEngagementTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drill-down state
  const [activeKpi, setActiveKpi] = useState<KpiType>(null);
  const [drillData, setDrillData] = useState<Record<string, unknown> | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboardApi.summary(),
      salesApi.trends(30),
      commentsApi.sentimentSummary(),
      engagementApi.trends(14),
    ]).then(([s, st, sent, et]) => {
      setSummary(s.data);
      setSalesTrend(st.data.slice(-14));
      setSentiment(sent.data);
      setEngagementTrend(et.data.slice(-14));
      setLoading(false);
    });
  }, []);

  const handleKpiClick = useCallback(
    (kpi: KpiType) => {
      if (activeKpi === kpi) {
        setActiveKpi(null);
        setDrillData(null);
        return;
      }
      setActiveKpi(kpi);
      setDrillData(null);
      setDrillLoading(true);
      dashboardApi
        .kpiDetail(kpi!)
        .then((res) => setDrillData(res.data))
        .finally(() => setDrillLoading(false));
    },
    [activeKpi]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  const meta = activeKpi ? KPI_META[activeKpi] : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your store performance across all marketplaces"
      />

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          title="Total Revenue"
          value={`$${summary.total_revenue?.toLocaleString()}`}
          icon={DollarSign}
          iconColor="bg-brand-500"
          trend={summary.revenue_trend != null ? { value: summary.revenue_trend, label: "vs last 30 days" } : undefined}
          onClick={() => handleKpiClick("revenue")}
          active={activeKpi === "revenue"}
        />
        <KpiCard
          title="Total Orders"
          value={summary.total_orders}
          icon={ShoppingBag}
          iconColor="bg-emerald-500"
          trend={summary.orders_trend != null ? { value: summary.orders_trend, label: "vs last 30 days" } : undefined}
          onClick={() => handleKpiClick("orders")}
          active={activeKpi === "orders"}
        />
        <KpiCard
          title="Returns"
          value={summary.total_returns}
          icon={RotateCcw}
          iconColor="bg-amber-500"
          onClick={() => handleKpiClick("returns")}
          active={activeKpi === "returns"}
        />
        <KpiCard
          title="Avg CTR"
          value={`${summary.avg_ctr}%`}
          icon={MousePointerClick}
          iconColor="bg-purple-500"
          trend={summary.ctr_trend != null ? { value: summary.ctr_trend, label: "vs last 30 days" } : undefined}
          onClick={() => handleKpiClick("ctr")}
          active={activeKpi === "ctr"}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Page Visits"
          value={summary.total_page_visits?.toLocaleString()}
          icon={Eye}
          iconColor="bg-cyan-500"
          onClick={() => handleKpiClick("visits")}
          active={activeKpi === "visits"}
        />
        <KpiCard
          title="Cart Adds"
          value={summary.total_cart_adds?.toLocaleString()}
          icon={ShoppingCart}
          iconColor="bg-indigo-500"
          onClick={() => handleKpiClick("cart")}
          active={activeKpi === "cart"}
        />
        <KpiCard
          title="Positive Reviews"
          value={summary.positive_comments}
          icon={ThumbsUp}
          iconColor="bg-emerald-500"
          onClick={() => handleKpiClick("positive")}
          active={activeKpi === "positive"}
        />
        <KpiCard
          title="Negative Reviews"
          value={summary.negative_comments}
          icon={ThumbsDown}
          iconColor="bg-red-500"
          onClick={() => handleKpiClick("negative")}
          active={activeKpi === "negative"}
        />
      </div>

      {/* ── Drill-down Panel ── */}
      {activeKpi && (
        <div className="card mb-6 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              {meta?.label} — Breakdown
            </h2>
            <button
              onClick={() => { setActiveKpi(null); setDrillData(null); }}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {drillLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
          ) : drillData ? (
            <DrillDownContent kpi={activeKpi} data={drillData} meta={meta!} />
          ) : null}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Revenue – Last 14 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`$${v}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#4f6ef7" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Pie */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Sentiment Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={sentiment}
                dataKey="count"
                nameKey="sentiment"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {sentiment.map((entry: { sentiment: string }, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.sentiment === "positive"
                        ? "#10b981"
                        : entry.sentiment === "negative"
                        ? "#ef4444"
                        : "#f59e0b"
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Trend */}
      <div className="card mt-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Engagement – Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={engagementTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="visits" name="Page Visits" fill="#4f6ef7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cart_adds" name="Cart Adds" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Drill-Down Content Component ────────────────────────────────────────────

type DrillData = Record<string, unknown>;
type MetaInfo = { label: string; color: string; unit?: string };

function DrillDownContent({ kpi, data, meta }: { kpi: KpiType; data: DrillData; meta: MetaInfo }) {
  const byMarketplace = (data.by_marketplace as { name: string; value: number }[]) || [];
  const topProducts = (data.top_products as { name: string; value: number }[]) || [];
  const byCategory = (data.by_category as { name: string; value: number }[]) || [];
  const sampleComments = (data.sample_comments as { text: string; rating: number; product: string }[]) || [];

  const formatVal = (v: number) => {
    if (kpi === "revenue") return `$${v.toLocaleString()}`;
    if (kpi === "ctr") return `${v}%`;
    return v.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Marketplace Bar Chart */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-3">By Marketplace</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byMarketplace} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatVal(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v: number) => [formatVal(v), meta.label]} />
            <Bar dataKey="value" fill={meta.color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Right panel: top products table or returns details or sample comments */}
      <div>
        {/* Returns special: show rate + marketplace table */}
        {kpi === "returns" && (
          <>
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div>
                <p className="text-xs text-amber-600 font-medium uppercase">Return Rate</p>
                <p className="text-2xl font-bold text-amber-700">{String(data.return_rate)}%</p>
              </div>
              <div className="text-xs text-amber-600">
                {String(data.total_returns)} returned out of {String(data.total_orders)} orders
              </div>
            </div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Most Returned Products</h3>
            <div className="space-y-2">
              {(data.top_returned_products as { name: string; value: number }[])?.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate max-w-[65%]">{p.name}</span>
                  <span className="font-semibold text-amber-600">{p.value} returns</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Sample comments for sentiment KPIs */}
        {(kpi === "positive" || kpi === "negative") && sampleComments.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-slate-500 mb-3">Sample Reviews</h3>
            <div className="space-y-3">
              {sampleComments.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500 truncate">{c.product}</span>
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      {Array.from({ length: c.rating }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Top products for non-returns/non-sentiment KPIs, and for sentiment too */}
        {kpi !== "returns" && topProducts.length > 0 && sampleComments.length === 0 && (
          <>
            <h3 className="text-sm font-medium text-slate-500 mb-3">
              Top Products by {meta.label}
            </h3>
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate max-w-[65%]">{p.name}</span>
                      <span className="text-sm font-semibold text-slate-800">{formatVal(p.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((p.value / topProducts[0].value) * 100)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Top products for positive/negative (shown under comments) */}
        {(kpi === "positive" || kpi === "negative") && topProducts.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-slate-500 mt-4 mb-2">Top Products</h3>
            <div className="space-y-1">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate max-w-[70%]">{p.name}</span>
                  <span className="font-medium" style={{ color: meta.color }}>{p.value} reviews</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* By category for orders */}
        {kpi === "orders" && byCategory.length > 0 && (
          <>
            <h3 className="text-sm font-medium text-slate-500 mb-3">By Category</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Orders" fill={meta.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
