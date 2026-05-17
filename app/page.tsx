"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import LeadTypeSelector from "@/app/components/LeadTypeSelector";
import SearchForm from "@/app/components/SearchForm";
import LoadingState from "@/app/components/LoadingState";
import ResultsPanel from "@/app/components/ResultsPanel";
import SearchHistory from "@/app/components/SearchHistory";
import { useSearchHistory } from "@/app/lib/useSearchHistory";
import {
  LeadType,
  SearchFilters,
  SearchHistoryItem,
  SearchRequest,
  SearchResponse,
} from "@/app/types";

type AppState = "form" | "loading" | "results";

const DEFAULT_FILTERS: SearchFilters = {
  minOrderSize: "$1K+",
  businessType: "Both",
  followerRange: "0-1K",
  contentType: "Any",
  stage: "Any",
  checkSize: "Any",
};

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("form");
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [leadType, setLeadType] = useState<LeadType | null>(null);
  const [customType, setCustomType] = useState("");
  const [industry, setIndustry] = useState("");
  const [product, setProduct] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState("All platforms");
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [count, setCount] = useState(20);
  const [language, setLanguage] = useState("Any");

  // Results
  const [results, setResults] = useState<SearchResponse | null>(null);

  // History
  const { history, addToHistory, clearHistory } = useSearchHistory();

  const buildRequest = (): SearchRequest => ({
    leadType: leadType!,
    customType,
    industry,
    product,
    country,
    platform,
    filters,
    count,
    language,
  });

  const handleLeadTypeSelect = (type: LeadType) => {
    setLeadType(type);
    if (type === "influencers") {
      setFilters((f) => ({ ...f, followerRange: "0-1K" }));
      setCountry((c) => (c.trim() ? c : "South Korea"));
    }
  };

  const handleFormChange = (field: string, value: string | number | SearchFilters) => {
    switch (field) {
      case "industry": setIndustry(value as string); break;
      case "product": setProduct(value as string); break;
      case "country": setCountry(value as string); break;
      case "platform": setPlatform(value as string); break;
      case "filters": setFilters(value as SearchFilters); break;
      case "count": setCount(value as number); break;
      case "language": setLanguage(value as string); break;
    }
  };

  const handleSearch = async () => {
    if (!leadType) {
      setError("Please select a lead type first.");
      return;
    }
    if (leadType === "custom" && !customType.trim()) {
      setError("Please describe who you're looking for.");
      return;
    }

    setError(null);
    setAppState("loading");

    try {
      const request = buildRequest();
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Search failed");
      }

      const data: SearchResponse = await res.json();
      setResults(data);
      setAppState("results");

      // Save to history
      const historyItem: SearchHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        request,
        response: data,
      };
      addToHistory(historyItem);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setAppState("form");
    }
  };

  const handleRestoreHistory = (item: SearchHistoryItem) => {
    const req = item.request;
    setLeadType(req.leadType);
    setCustomType(req.customType);
    setIndustry(req.industry);
    setProduct(req.product);
    setCountry(req.country);
    setPlatform(req.platform);
    setFilters(req.filters);
    setCount(req.count);
    setLanguage(req.language);
    setResults(item.response);
    setAppState("results");
  };

  const handleSearchAgain = () => {
    setResults(null);
    setAppState("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Search History */}
        {appState === "form" && (
          <SearchHistory
            history={history}
            onRestore={handleRestoreHistory}
            onClear={clearHistory}
          />
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm animate-fade-in">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold">Error</div>
              <div className="text-danger/70">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger/50 hover:text-danger transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {appState === "loading" && <LoadingState />}

        {/* RESULTS */}
        {appState === "results" && results && (
          <ResultsPanel
            response={results}
            searchRequest={buildRequest()}
            onSearchAgain={handleSearchAgain}
          />
        )}

        {/* SEARCH FORM */}
        {appState === "form" && (
          <div className="space-y-8">
            {/* Step 1 card */}
            <div className="glass rounded-2xl p-6 sm:p-8 card-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <LeadTypeSelector
                selected={leadType}
                customType={customType}
                onSelect={handleLeadTypeSelect}
                onCustomChange={setCustomType}
              />
            </div>

            {/* Step 2 card — only shows when lead type selected */}
            {leadType && (
              <div className="glass rounded-2xl p-6 sm:p-8 card-glow animate-slide-up">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <SearchForm
                  leadType={leadType}
                  industry={industry}
                  product={product}
                  country={country}
                  platform={platform}
                  filters={filters}
                  count={count}
                  language={language}
                  onChange={handleFormChange}
                  onSubmit={handleSearch}
                  loading={false}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20 py-8 text-center">
        <p className="text-white/20 text-sm">
          AI Lead Finder · Apify + GPT-4o · Find anyone, analyze everything
        </p>
      </footer>
    </div>
  );
}
