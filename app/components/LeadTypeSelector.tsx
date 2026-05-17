"use client";

import { LeadType } from "@/app/types";

interface Props {
  selected: LeadType | null;
  customType: string;
  onSelect: (type: LeadType) => void;
  onCustomChange: (v: string) => void;
}

const LEAD_TYPES: {
  id: LeadType;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}[] = [
  {
    id: "buyers",
    icon: "🛍️",
    title: "Buyers",
    subtitle: "& Importers",
    description: "Wholesale buyers, importers, retail chains, B2B purchasers",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400/60",
  },
  {
    id: "influencers",
    icon: "🌟",
    title: "Influencers",
    subtitle: "& Creators",
    description: "Social media influencers, content creators, brand ambassadors",
    color: "from-pink-500/20 to-pink-600/10 border-pink-500/30 hover:border-pink-400/60",
  },
  {
    id: "distributors",
    icon: "📦",
    title: "Distributors",
    subtitle: "& Wholesalers",
    description: "Regional distributors, wholesale suppliers, logistics partners",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30 hover:border-orange-400/60",
  },
  {
    id: "partners",
    icon: "🤝",
    title: "Partners",
    subtitle: "& Resellers",
    description: "Business partners, resellers, affiliates, channel partners",
    color: "from-green-500/20 to-green-600/10 border-green-500/30 hover:border-green-400/60",
  },
  {
    id: "investors",
    icon: "💼",
    title: "Investors",
    subtitle: "& VCs",
    description: "Angel investors, venture capital firms, strategic investors",
    color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:border-yellow-400/60",
  },
  {
    id: "custom",
    icon: "✏️",
    title: "Custom",
    subtitle: "(type your own)",
    description: "Define exactly who you need — any lead type imaginable",
    color: "from-primary-500/20 to-primary-600/10 border-primary-500/30 hover:border-primary-400/60",
  },
];

export default function LeadTypeSelector({
  selected,
  customType,
  onSelect,
  onCustomChange,
}: Props) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          What are you looking for?
        </h2>
        <p className="text-white/40 text-sm">
          Select the type of lead you want to find
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {LEAD_TYPES.map((type) => {
          const isActive = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`
                relative group p-5 rounded-2xl border text-left transition-all duration-200
                bg-gradient-to-br ${type.color}
                ${isActive
                  ? "ring-2 ring-primary-500 ring-offset-2 ring-offset-[#0F0A1E] scale-[1.02] shadow-lg shadow-primary-600/20"
                  : "opacity-70 hover:opacity-100 hover:scale-[1.01]"
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-3">{type.icon}</div>
              <div className="font-semibold text-white leading-tight">
                {type.title}
              </div>
              <div className="text-white/50 text-sm mb-2">{type.subtitle}</div>
              <div className="text-white/40 text-xs leading-relaxed hidden sm:block">
                {type.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      {selected === "custom" && (
        <div className="animate-slide-up">
          <label className="block text-sm font-medium text-white/60 mb-2">
            Describe who you&apos;re looking for
          </label>
          <input
            type="text"
            value={customType}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="e.g. Podcast hosts in fintech, SaaS affiliate marketers, Beauty salon owners..."
            className="input-field"
          />
        </div>
      )}
    </section>
  );
}
