"use client";

import { useState } from "react";
import { Lead } from "@/app/types";
import { ScoreBadge } from "./ResultsPanel";

interface Props {
  lead: Lead;
  rank: number;
}

function ScoreBar({
  label,
  value,
  color = "bg-primary-500",
}: {
  label: string;
  value: number;
  color?: string;
}) {  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="text-white font-medium">{value}/10</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function MatchBadge({ match }: { match: Lead["match"] }) {
  const config = {
    High: { emoji: "🟢", cls: "bg-accent/15 text-accent border-accent/30" },
    Medium: { emoji: "🟡", cls: "bg-warning/15 text-warning border-warning/30" },
    Low: { emoji: "🔴", cls: "bg-danger/15 text-danger border-danger/30" },
  };
  const { emoji, cls } = config[match] ?? config.Medium;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cls}`}
    >
      {emoji} {match}
    </span>
  );
}

/** Renders a contact link that warns if the lead is unverified */
function ContactLink({
  href,
  label,
  icon,
  verified,
  external = true,
}: {
  href: string;
  label: string;
  icon: string;
  verified: boolean;
  external?: boolean;
}) {
  if (!verified) {
    // Unverified: show as plain text with warning, no clickable link
    return (
      <span
        title="Unverified — check manually before using"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/8 border border-warning/25 text-xs text-warning/70 cursor-default select-text"
      >
        {icon} <span className="truncate max-w-[120px]">{label}</span>
        <span className="text-warning/40 text-[10px] ml-0.5">?</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-all border border-white/10"
    >
      {icon} {label}
    </a>
  );
}

export default function LeadRow({ lead, rank }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Main row */}
      <tr
        className={`group border-b border-white/5 transition-all duration-150 cursor-pointer ${
          expanded ? "bg-primary-900/20" : "hover:bg-white/3"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <td className="px-4 py-4 text-center">
          <span className="text-white/30 text-sm font-mono">#{rank}</span>
        </td>

        {/* Name */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                lead.score >= 8
                  ? "bg-accent/20 text-accent"
                  : lead.score >= 5
                  ? "bg-warning/20 text-warning"
                  : "bg-danger/20 text-danger"
              }`}
            >
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white text-sm leading-tight flex items-center gap-2">
                {lead.name}
                {lead.verified ? (
                  <span
                    title="AI is confident this lead's contact info is accurate"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-semibold border border-accent/25"
                  >
                    ✓ verified
                  </span>
                ) : (
                  <span
                    title="Contact details may need manual verification"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning/10 text-warning/70 text-[10px] font-semibold border border-warning/20"
                  >
                    ? unverified
                  </span>
                )}
              </div>
              {lead.email && (
                <div className="text-white/30 text-xs mt-0.5 truncate max-w-[200px]">
                  {lead.verified ? (
                    lead.email
                  ) : (
                    <span className="text-warning/50">{lead.email} (unverified)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-4 hidden md:table-cell">
          <span className="text-white/60 text-sm">{lead.type}</span>
        </td>

        {/* Location */}
        <td className="px-4 py-4 hidden sm:table-cell">
          <span className="text-white/60 text-sm">{lead.country}</span>
        </td>

        {/* Contact — table row quick view */}
        <td className="px-4 py-4 hidden lg:table-cell">
          <div className="flex items-center gap-2 flex-wrap">
            {lead.website && (
              lead.verified ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                  title={lead.website}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span
                  title="Website unverified — may not exist"
                  className="text-warning/40 cursor-default"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              )
            )}
            {lead.instagram && (
              <span
                className={`text-xs font-medium ${lead.verified ? "text-pink-400" : "text-warning/50"}`}
                title={lead.verified ? lead.instagram : `${lead.instagram} — unverified`}
              >
                {lead.instagram}
              </span>
            )}
            {!lead.website && !lead.instagram && !lead.linkedin && (
              <span className="text-white/20 text-xs">No links</span>
            )}
          </div>
        </td>

        {/* Score — IMPROVEMENT 3B */}
        <td className="px-4 py-4">
          <ScoreBadge score={lead.score} verified={lead.verified} />
        </td>

        {/* Match */}
        <td className="px-4 py-4 hidden sm:table-cell">
          <MatchBadge match={lead.match} />
        </td>

        {/* Expand arrow */}
        <td className="px-4 py-4 text-center">
          <span
            className={`text-white/30 group-hover:text-white/60 transition-all duration-200 inline-block ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-primary-950/30">
          <td colSpan={8} className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">

              {/* Left: Score breakdown + contact links */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span>📊</span>
                  <span>Score Breakdown</span>
                </h4>
                <div className="space-y-3">
                  <ScoreBar label="Legitimacy"    value={lead.legitimacy}    color="bg-primary-500" />
                  <ScoreBar label="Relevance"     value={lead.relevance}     color="bg-primary-400" />
                  <ScoreBar label="Reach"         value={lead.reach}         color="bg-accent" />
                  <ScoreBar label="Accessibility" value={lead.accessibility} color="bg-warning" />
                </div>

                {/* Contact links with verification-aware display */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {lead.website && (
                    <ContactLink
                      href={lead.website}
                      label="Website"
                      icon="🔗"
                      verified={lead.verified}
                    />
                  )}
                  {lead.email && (
                    <ContactLink
                      href={`mailto:${lead.email}`}
                      label={lead.email}
                      icon="📧"
                      verified={lead.verified}
                      external={false}
                    />
                  )}
                  {lead.linkedin && (
                    <ContactLink
                      href={lead.linkedin}
                      label="LinkedIn"
                      icon="💼"
                      verified={lead.verified}
                    />
                  )}
                  {lead.instagram && (
                    <ContactLink
                      href={`https://instagram.com/${lead.instagram.replace("@", "")}`}
                      label={lead.instagram}
                      icon="📸"
                      verified={lead.verified}
                    />
                  )}
                </div>

                {/* IMPROVEMENT 3C — verified indicator + verification note */}
                {lead.verified ? (
                  <div className="flex items-center gap-1.5 text-accent text-xs font-medium">
                    <span>✓</span>
                    <span>Verified online</span>
                  </div>
                ) : (
                  <div className="text-danger/80 flex items-center gap-1.5 text-xs font-medium">
                    <span>⚠️</span>
                    <span>Not verified — check manually</span>
                  </div>
                )}

                {lead.verification_note && (
                  <p className="text-xs text-white/30 italic leading-relaxed">
                    {lead.verification_note}
                  </p>
                )}

                {/* Unverified contact warning */}
                {!lead.verified && (
                  <div className="p-3 rounded-lg bg-warning/8 border border-warning/20 text-xs text-warning/70 leading-relaxed">
                    ⚠️ Contact details are <strong>unverified</strong>. Search for this lead manually before reaching out.
                  </div>
                )}

                {lead.followers && (
                  <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                    <span className="text-white/40 text-xs">Followers: </span>
                    <span className="text-white font-semibold text-sm">
                      {lead.followers}
                      {!lead.verified && <span className="text-warning/50 text-xs ml-1">(estimate)</span>}
                    </span>
                  </div>
                )}
                {lead.estimated_value && (
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <span className="text-white/40 text-xs">Estimated value: </span>
                    <span className="text-accent font-semibold text-sm">{lead.estimated_value}</span>
                  </div>
                )}
              </div>

              {/* Middle: Why & Approach */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                    <span>💡</span>
                    <span>Why this lead?</span>
                  </h4>
                  <p className="text-white/60 text-sm leading-relaxed">{lead.why_good}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                    <span>🎯</span>
                    <span>Current focus</span>
                  </h4>
                  <p className="text-white/60 text-sm leading-relaxed">{lead.current_focus}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                    <span>📌</span>
                    <span>How to approach</span>
                  </h4>
                  <p className="text-white/60 text-sm leading-relaxed">{lead.how_to_approach}</p>
                </div>
                {lead.red_flags && lead.red_flags !== "None" && lead.red_flags !== "" && (
                  <div>
                    <h4 className="font-semibold text-warning flex items-center gap-2 mb-2">
                      <span>⚠️</span>
                      <span>Red flags</span>
                    </h4>
                    <p className="text-warning/70 text-sm leading-relaxed">{lead.red_flags}</p>
                  </div>
                )}
              </div>

              {/* Right: Message draft */}
              <div>
                <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                  <span>✉️</span>
                  <span>Opening message draft</span>
                </h4>
                <div className="p-4 rounded-xl bg-white/3 border border-white/10 text-sm text-white/70 leading-relaxed italic">
                  {lead.best_message}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(lead.best_message)}
                  className="mt-2 w-full py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition-all border border-white/10"
                >
                  📋 Copy message
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
