"use client";

import { SearchHistoryItem } from "@/app/types";

const LEAD_TYPE_ICONS: Record<string, string> = {
  buyers: "🛍️",
  influencers: "🌟",
  distributors: "📦",
  partners: "🤝",
  investors: "💼",
  custom: "✏️",
};

interface Props {
  history: SearchHistoryItem[];
  onRestore: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

export default function SearchHistory({ history, onRestore, onClear }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <span>🕐</span> Recent Searches
        </h3>
        <button
          onClick={onClear}
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {history.map((item) => {
          const { request, response, timestamp } = item;
          const icon = LEAD_TYPE_ICONS[request.leadType] ?? "🔍";
          const label =
            request.leadType === "custom"
              ? request.customType || "Custom"
              : request.leadType.charAt(0).toUpperCase() + request.leadType.slice(1);
          const timeAgo = getTimeAgo(timestamp);

          return (
            <button
              key={item.id}
              onClick={() => onRestore(item)}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl glass glass-hover transition-all duration-150 text-left max-w-xs"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <div className="text-white text-sm font-medium leading-tight">
                  {label}
                  {request.industry && (
                    <span className="text-white/40"> · {request.industry}</span>
                  )}
                </div>
                <div className="text-white/30 text-xs mt-0.5">
                  {request.country || "Worldwide"} · {response.totalFound} leads · {timeAgo}
                </div>
              </div>
              <span className="text-white/20 group-hover:text-white/50 transition-colors ml-auto text-xs">
                ↩
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}
