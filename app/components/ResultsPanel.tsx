"use client";

import { useMemo, useState } from "react";
import { FilterState, SearchRequest, SearchResponse } from "@/app/types";
import LeadRow from "./LeadRow";

interface Props {
  response: SearchResponse;
  searchRequest: SearchRequest;
  onSearchAgain: () => void;
}

function SummaryBar({ response }: { response: SearchResponse }) {
  const verifiedCount = response.leads.filter((l) => l.verified).length;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { icon: "📋", value: response.totalFound,              label: "Total leads",          color: "text-white" },
        { icon: "⭐", value: response.avgScore.toFixed(1),     label: "Avg score",            color: "text-primary-400" },
        { icon: "✅", value: verifiedCount,                    label: "Verified online",      color: "text-accent" },
        { icon: "⚡", value: `${response.generatedIn}s`,       label: "Generated in",         color: "text-warning" },
      ].map((s) => (
        <div key={s.label} className="glass rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-white/40 text-xs mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// IMPROVEMENT 3A — warning banner (redesigned to match dark theme)
function WarningBanner({ totalLeads, verifiedCount }: { totalLeads: number; verifiedCount: number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-4 bg-amber-500/8 border border-amber-500/25">
      <span className="text-amber-400 text-xl flex-shrink-0 mt-0.5">⚠️</span>
      <div>
        <p className="text-amber-300 font-semibold text-sm">
          AI-generated results — always verify before outreach
        </p>
        <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
          ✓ Verified means found on web &nbsp;·&nbsp;
          {verifiedCount} of {totalLeads} leads confirmed &nbsp;·&nbsp;
          We recommend checking each website manually &nbsp;·&nbsp;
          Never send emails without confirming the contact exists
        </p>
      </div>
    </div>
  );
}

// IMPROVEMENT 3B — score badge with verification awareness
export function ScoreBadge({ score, verified }: { score: number; verified: boolean }) {
  if (!verified) {
    return (
      <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/8 text-white/40 border border-white/10">
        ?
      </span>
    );
  }
  const cls =
    score >= 8
      ? "score-high"
      : score >= 5
      ? "score-mid"
      : "score-low";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-base font-bold ${cls}`}>
      {score}
    </span>
  );
}

export default function ResultsPanel({ response, searchRequest, onSearchAgain }: Props) {
  const { leads } = response;
  const verifiedCount = leads.filter((l) => l.verified).length;

  // Default OFF — show all leads; user can toggle on to filter verified only
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    score: "All",
    country: "All",
    type: "All",
    verifiedOnly: false, // handled separately via showOnlyVerified
    sortBy: "score",
  });
  const [exporting, setExporting] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(leads.map((l) => l.country).filter(Boolean)))],
    [leads]
  );
  const types = useMemo(
    () => ["All", ...Array.from(new Set(leads.map((l) => l.type).filter(Boolean)))],
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Verified filter (IMPROVEMENT 3D)
    if (showOnlyVerified) result = result.filter((l) => l.verified);

    if (filters.score !== "All") {
      const minScore = parseInt(filters.score);
      result = result.filter((l) => l.score >= minScore);
    }
    if (filters.country !== "All") result = result.filter((l) => l.country === filters.country);
    if (filters.type !== "All") result = result.filter((l) => l.type === filters.type);

    result.sort((a, b) => {
      if (filters.sortBy === "score") return b.score - a.score;
      if (filters.sortBy === "name") return a.name.localeCompare(b.name);
      if (filters.sortBy === "match") {
        const order = { High: 0, Medium: 1, Low: 2 };
        return (order[a.match] ?? 1) - (order[b.match] ?? 1);
      }
      return 0;
    });

    return result;
  }, [leads, filters, showOnlyVerified]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: filteredLeads, searchRequest }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LeadFinder_${searchRequest.leadType}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = () => {
    const text = filteredLeads
      .map((l) => `${l.name} | ${l.type} | ${l.country} | Score: ${l.score} | ${l.website ?? ""} | ${l.email ?? ""} | ${l.phone ?? "None"}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopyMsg("Copied!");
    setTimeout(() => setCopyMsg(""), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary bar */}
      <SummaryBar response={response} />

      {/* IMPROVEMENT 3A — warning banner */}
      <WarningBanner totalLeads={leads.length} verifiedCount={verifiedCount} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Score filter */}
        <div className="relative">
          <select
            value={filters.score}
            onChange={(e) => setFilters((f) => ({ ...f, score: e.target.value }))}
            className="select-field !w-auto pr-8 text-sm"
          >
            <option value="All" className="bg-[#1a0f35]">Score: All</option>
            <option value="8"   className="bg-[#1a0f35]">Score: 8+</option>
            <option value="6"   className="bg-[#1a0f35]">Score: 6+</option>
            <option value="4"   className="bg-[#1a0f35]">Score: 4+</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</div>
        </div>

        {/* Country filter */}
        <div className="relative">
          <select
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            className="select-field !w-auto pr-8 text-sm"
          >
            {countries.map((c) => (
              <option key={c} value={c} className="bg-[#1a0f35]">Country: {c}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</div>
        </div>

        {/* Type filter */}
        <div className="relative max-w-[200px]">
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="select-field !w-auto pr-8 text-sm truncate"
          >
            {types.map((t) => (
              <option key={t} value={t} className="bg-[#1a0f35]">
                Type: {t.length > 20 ? t.slice(0, 20) + "..." : t}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</div>
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as FilterState["sortBy"] }))}
            className="select-field !w-auto pr-8 text-sm"
          >
            <option value="score" className="bg-[#1a0f35]">Sort: Score</option>
            <option value="name"  className="bg-[#1a0f35]">Sort: Name</option>
            <option value="match" className="bg-[#1a0f35]">Sort: Match</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">▾</div>
        </div>

        {/* IMPROVEMENT 3D — verified toggle (default ON) */}
        <label className="ml-auto flex items-center gap-2.5 cursor-pointer group select-none">
          <div
            onClick={() => setShowOnlyVerified((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              showOnlyVerified ? "bg-accent" : "bg-white/15"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showOnlyVerified ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
            Verified only{" "}
            <span className="text-white/35">
              ({verifiedCount} of {leads.length})
            </span>
          </span>
        </label>
      </div>

      {/* Results count */}
      <div className="text-white/40 text-sm">
        Showing <span className="text-white font-semibold">{filteredLeads.length}</span> leads
        {showOnlyVerified && (
          <span className="ml-2 text-accent/70 text-xs">· verified only</span>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/30 uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Location</th>
                <th className="px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden lg:table-cell">Contact</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/30 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Match</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="text-white/40 font-medium">No leads match your current filters</div>
                    {showOnlyVerified && leads.length > 0 && (
                      <button
                        onClick={() => setShowOnlyVerified(false)}
                        className="mt-3 text-primary-400 text-sm hover:text-primary-300 underline underline-offset-2"
                      >
                        Show all {leads.length} leads including unverified
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => (
                  <LeadRow key={lead.id} lead={lead} rank={idx + 1} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export section */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass rounded-2xl">
        <div>
          <div className="text-white font-semibold mb-1">Export Results</div>
          <div className="text-white/40 text-sm">
            Excel with 4 sheets · verified leads · outreach templates
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2 text-sm">
            {exporting ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting...</>
            ) : (
              <>📥 Download Excel</>
            )}
          </button>
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white transition-all">
            {copyMsg ? "✓ " + copyMsg : "📋 Copy to clipboard"}
          </button>
          <button onClick={onSearchAgain} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white transition-all">
            🔄 Search again
          </button>
        </div>
      </div>
    </div>
  );
}
