"use client";

import { LeadType, SearchFilters } from "@/app/types";

interface Props {
  leadType: LeadType | null;
  industry: string;
  product: string;
  country: string;
  platform: string;
  filters: SearchFilters;
  count: number;
  language: string;
  onChange: (field: string, value: string | number | SearchFilters) => void;
  onSubmit: () => void;
  loading: boolean;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-white/60 mb-2">
      {children}
    </label>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
            value === opt
              ? "bg-primary-600 border-primary-500 text-white shadow-md shadow-primary-600/20"
              : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SearchForm({
  leadType,
  industry,
  product,
  country,
  platform,
  filters,
  count,
  language,
  onChange,
  onSubmit,
  loading,
}: Props) {
  const isBuyerOrDistributor =
    leadType === "buyers" || leadType === "distributors";
  const isInfluencer =
    leadType === "influencers";
  const isInvestor = leadType === "investors";

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onChange("filters", { ...filters, [key]: value });
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Search Details</h2>
        <p className="text-white/40 text-sm">
          The more specific you are, the better results you&apos;ll get
        </p>
      </div>

      {/* Row 1: Industry & Product */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Industry / Niche</Label>
          <input
            type="text"
            value={industry}
            onChange={(e) => onChange("industry", e.target.value)}
            placeholder="e.g. beauty, K-beauty, wellness, fitness"
            className="input-field"
          />
        </div>
        <div>
          <Label>Product / Brand</Label>
          <input
            type="text"
            value={product}
            onChange={(e) => onChange("product", e.target.value)}
            placeholder="e.g. Salonhands — Korean hair care brand"
            className="input-field"
          />
        </div>
      </div>

      {/* Row 2: Country & Platform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Target Country / Region</Label>
          <input
            type="text"
            value={country}
            onChange={(e) => onChange("country", e.target.value)}
            placeholder={
              isInfluencer
                ? "e.g. South Korea, Seoul, Korea"
                : "e.g. USA, Europe, Worldwide, Southeast Asia"
            }
            className="input-field"
          />
        </div>
        {isInfluencer && (
          <div>
            <Label>Platform</Label>
            <div className="relative">
              <select
                value={platform}
                onChange={(e) => onChange("platform", e.target.value)}
                className="select-field"
              >
                {["All platforms", "Instagram", "YouTube", "TikTok", "LinkedIn", "Twitter/X", "Pinterest"].map(
                  (p) => (
                    <option key={p} value={p} className="bg-[#1a0f35]">
                      {p}
                    </option>
                  )
                )}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                ▾
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Conditional filters */}
      {isBuyerOrDistributor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
          <div>
            <Label>Minimum Order Size</Label>
            <ChipGroup
              options={["$1K+", "$5K+", "$10K+", "$50K+"] as const}
              value={(filters.minOrderSize as "$1K+" | "$5K+" | "$10K+" | "$50K+") ?? "$1K+"}
              onChange={(v) => updateFilter("minOrderSize", v)}
            />
          </div>
          <div>
            <Label>Business Type</Label>
            <ChipGroup
              options={["Retail", "Wholesale", "Both"] as const}
              value={(filters.businessType as "Retail" | "Wholesale" | "Both") ?? "Both"}
              onChange={(v) => updateFilter("businessType", v)}
            />
          </div>
        </div>
      )}

      {isInfluencer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
          <div>
            <Label>Follower range</Label>
            <p className="text-white/35 text-xs mb-2">
              Micro-influencers: choose 0–1K (under 1,000 followers)
            </p>
            <ChipGroup
              options={["0-1K", "1K-10K", "10K-100K", "100K-1M", "1M+"] as const}
              value={
                (filters.followerRange as
                  | "0-1K"
                  | "1K-10K"
                  | "10K-100K"
                  | "100K-1M"
                  | "1M+") ?? "0-1K"
              }
              onChange={(v) => updateFilter("followerRange", v)}
            />
          </div>
          <div>
            <Label>Content Type</Label>
            <ChipGroup
              options={["Reviews", "Tutorials", "Lifestyle", "Any"] as const}
              value={(filters.contentType as "Reviews" | "Tutorials" | "Lifestyle" | "Any") ?? "Any"}
              onChange={(v) => updateFilter("contentType", v)}
            />
          </div>
        </div>
      )}

      {isInvestor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
          <div>
            <Label>Funding Stage</Label>
            <ChipGroup
              options={["Pre-seed", "Seed", "Series A", "Any"] as const}
              value={(filters.stage as "Pre-seed" | "Seed" | "Series A" | "Any") ?? "Any"}
              onChange={(v) => updateFilter("stage", v)}
            />
          </div>
          <div>
            <Label>Check Size</Label>
            <ChipGroup
              options={["$100K", "$500K", "$1M+", "Any"] as const}
              value={(filters.checkSize as "$100K" | "$500K" | "$1M+" | "Any") ?? "Any"}
              onChange={(v) => updateFilter("checkSize", v)}
            />
          </div>
        </div>
      )}

      {/* Row 4: Count & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Number of Results</Label>
          <ChipGroup
            options={["10", "20", "30"]}
            value={String(count)}
            onChange={(v) => onChange("count", parseInt(v))}
          />
        </div>
        <div>
          <Label>Language Preference</Label>
          <ChipGroup
            options={["English", "Korean", "Any"]}
            value={language}
            onChange={(v) => onChange("language", v)}
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={loading || !leadType}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 group"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Searching...</span>
          </>
        ) : (
          <>
            <span>🔍</span>
            <span>Find Leads</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </>
        )}
      </button>
    </section>
  );
}
