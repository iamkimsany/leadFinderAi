import { Lead } from "@/app/types";

const BLOCKED_IG_USERNAMES = new Set([
  "instagram",
  "explore",
  "reels",
  "reel",
  "p",
  "tv",
  "accounts",
  "about",
  "help",
  "media",
  "popular",
  "stories",
  "direct",
  "nametag",
]);

const JUNK_DOMAIN_FRAGMENTS = [
  "pinterest.",
  "wikipedia.",
  "amazon.",
  "ebay.",
  "quora.com",
  "reddit.com/r/",
  "facebook.com/groups",
  "facebook.com/events",
  "news.",
  "blog.",
  "medium.com",
  "tistory.com",
  "namu.wiki",
];

/** True if URL points to a single post/video, not a profile or channel */
export function isPostOrVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("youtube.com/watch") ||
    u.includes("youtu.be/") ||
    u.includes("youtube.com/shorts/") ||
    u.includes("instagram.com/p/") ||
    u.includes("instagram.com/reel/") ||
    u.includes("instagram.com/reels/") ||
    u.includes("instagram.com/tv/") ||
    (u.includes("tiktok.com/") && u.includes("/video/")) ||
    u.includes("facebook.com/watch") ||
    u.includes("fb.watch/")
  );
}

/** True if URL looks like a social profile / channel page */
export function isProfileOrChannelUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (isPostOrVideoUrl(u)) return false;

  if (u.includes("instagram.com/")) {
    try {
      const path = new URL(u.startsWith("http") ? u : `https://${u}`).pathname;
      const seg = path.split("/").filter(Boolean)[0]?.toLowerCase();
      if (seg && !BLOCKED_IG_USERNAMES.has(seg)) return true;
    } catch {
      return false;
    }
  }
  if (u.includes("tiktok.com/@") && !u.includes("/video/")) return true;
  if (
    u.includes("youtube.com/@") ||
    u.includes("youtube.com/channel/") ||
    u.includes("youtube.com/c/") ||
    u.includes("youtube.com/user/")
  ) {
    return true;
  }
  if (u.includes("linkedin.com/in/") || u.includes("linkedin.com/company/")) return true;

  return false;
}

export function isBlockedUsername(username: string): boolean {
  const u = username.replace("@", "").toLowerCase();
  return u.length < 2 || BLOCKED_IG_USERNAMES.has(u) || /^\d+$/.test(u);
}

/** Try to derive profile URL from URL path only — no guessing from text */
export function resolveProfileUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "instagram.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length === 0) return null;
      const first = parts[0].toLowerCase();
      if (BLOCKED_IG_USERNAMES.has(first)) return null;
      return `https://www.instagram.com/${parts[0]}/`;
    }

    if (host === "tiktok.com") {
      const match = parsed.pathname.match(/^\/@([^/]+)/);
      if (match && !isBlockedUsername(match[1])) {
        return `https://www.tiktok.com/@${match[1]}`;
      }
    }

    if (host.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/@")) {
        return `https://www.youtube.com/${parsed.pathname.split("/").slice(0, 2).join("/")}`;
      }
      if (
        parsed.pathname.startsWith("/channel/") ||
        parsed.pathname.startsWith("/c/") ||
        parsed.pathname.startsWith("/user/")
      ) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        return `https://www.youtube.com/${parts[0]}/${parts[1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Profile URL only when provable from the search result URL (not guessed) */
export function getConfirmedProfileUrl(item: WebSearchItemLike): string | null {
  if (isProfileOrChannelUrl(item.url)) return item.url;
  return resolveProfileUrl(item.url);
}

export function extractInstagramHandle(urlOrHandle: string): string | null {
  const s = urlOrHandle.trim();
  if (s.startsWith("@")) {
    const user = s.slice(1);
    return isBlockedUsername(user) ? null : s;
  }
  try {
    if (s.includes("instagram.com")) {
      const parts = new URL(s.startsWith("http") ? s : `https://${s}`).pathname
        .split("/")
        .filter(Boolean);
      if (parts[0] && !isBlockedUsername(parts[0])) return `@${parts[0]}`;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Extract @handle from title */
export function extractHandleFromTitle(title: string): string | null {
  const patterns = [
    /[@＠]([a-zA-Z0-9._]{2,30})\b/,
    /\(([a-zA-Z0-9._]{2,30})\)\s*on\s+instagram/i,
    /instagram\.com\/([a-zA-Z0-9._]{2,30})/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m && !isBlockedUsername(m[1])) return `@${m[1]}`;
  }
  return null;
}

/** Extract handle from snippet when it's a social result */
export function extractHandleFromSnippet(item: WebSearchItemLike): string | null {
  const text = item.snippet;
  const ig = text.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i);
  if (ig && !isBlockedUsername(ig[1])) return `@${ig[1]}`;
  const tt = text.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i);
  if (tt && !isBlockedUsername(tt[1])) return `@${tt[1]}`;
  if (item.domain.includes("instagram") || item.domain.includes("tiktok")) {
    return extractHandleFromTitle(text);
  }
  return null;
}

/** Best effort profile URL for GPT (confirmed first, then title/snippet on social domains) */
export function getSuggestedProfileUrl(item: WebSearchItemLike): string | null {
  const confirmed = getConfirmedProfileUrl(item);
  if (confirmed) return confirmed;

  const handle =
    extractHandleFromTitle(item.title) || extractHandleFromSnippet(item);
  if (!handle) return null;

  if (item.domain.includes("tiktok") || item.url.includes("tiktok.com")) {
    return `https://www.tiktok.com/@${handle.replace("@", "")}`;
  }
  return `https://www.instagram.com/${handle.replace("@", "")}/`;
}

export interface WebSearchItemLike {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export function isJunkSearchResult(item: WebSearchItemLike): boolean {
  const u = item.url.toLowerCase();
  const t = item.title.toLowerCase();
  if (JUNK_DOMAIN_FRAGMENTS.some((d) => u.includes(d))) return true;
  if (t.includes("top 10") || t.includes("top 20") || t.includes("best influencers")) return true;
  if (t.includes("how to find") || t.includes("ultimate guide")) return true;
  return false;
}

/** Drop listicles / junk; keep social profiles first */
export function filterAndRankInfluencerSearchResults<T extends WebSearchItemLike>(
  items: T[]
): T[] {
  const filtered = items.filter((item) => !isJunkSearchResult(item));

  const scored = filtered.map((item) => {
    const confirmed = getConfirmedProfileUrl(item);
    let score = 0;
    if (confirmed && isProfileOrChannelUrl(confirmed)) score = 30;
    else if (confirmed) score = 20;
    else if (isPostOrVideoUrl(item.url) && extractHandleFromTitle(item.title)) score = 8;
    else if (item.domain.includes("instagram") || item.domain.includes("tiktok")) score = 5;
    else score = 1;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Keep all non-junk results (sorted best-first); only drop obvious junk
  return scored.map((s) => s.item);
}

export function formatInfluencerResultForGpt(item: WebSearchItemLike, index: number): string {
  const suggested = getSuggestedProfileUrl(item);
  const handle =
    extractHandleFromTitle(item.title) || extractHandleFromSnippet(item);

  return `[${index + 1}] Title: ${item.title}
    Source URL: ${item.url}
    ${
      suggested
        ? `Profile URL for this creator: ${suggested}`
        : handle
        ? `Handle: ${handle}`
        : "No profile URL found"
    }
    Domain: ${item.domain}
    Snippet: ${item.snippet.slice(0, 400)}`;
}

function buildSearchCorpus(items: WebSearchItemLike[]): string {
  return items
    .map((i) => `${i.title} ${i.url} ${i.snippet}`)
    .join("\n")
    .toLowerCase();
}

function corpusContainsHandle(corpus: string, handle: string): boolean {
  const h = handle.replace("@", "").toLowerCase();
  return (
    corpus.includes(`@${h}`) ||
    corpus.includes(`instagram.com/${h}`) ||
    corpus.includes(`tiktok.com/@${h}`)
  );
}

function corpusContainsUrl(corpus: string, url: string | null): boolean {
  if (!url) return false;
  const normalized = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (corpus.includes(normalized) || corpus.includes(normalized.replace(/\/$/, ""))) {
    return true;
  }
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const segments = u.pathname.split("/").filter(Boolean).map((s) => s.toLowerCase());
    if (!corpus.includes(host)) return false;
    if (segments.length === 0) return true;
    return segments.some((seg) => seg.length >= 2 && corpus.includes(seg));
  } catch {
    return false;
  }
}

function urlsLooselyMatch(a: string, b: string): boolean {
  try {
    const na = new URL(a.startsWith("http") ? a : `https://${a}`);
    const nb = new URL(b.startsWith("http") ? b : `https://${b}`);
    if (na.hostname.replace(/^www\./, "") !== nb.hostname.replace(/^www\./, "")) return false;
    const pa = na.pathname.split("/").filter(Boolean);
    const pb = nb.pathname.split("/").filter(Boolean);
    if (pa.length === 0 && pb.length === 0) return true;
    return pa[0]?.toLowerCase() === pb[0]?.toLowerCase();
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

/** True if lead plausibly came from search results (lenient — avoids 0 results) */
function leadHasSearchAnchor(
  lead: Lead,
  corpus: string,
  items: WebSearchItemLike[]
): boolean {
  const name = lead.name?.toLowerCase().trim() ?? "";
  if (name.length >= 4 && corpus.includes(name.slice(0, Math.min(12, name.length)))) {
    return true;
  }

  if (lead.instagram && corpusContainsHandle(corpus, lead.instagram)) return true;
  if (lead.website && corpusContainsUrl(corpus, lead.website)) return true;

  for (const item of items) {
    const suggested = getSuggestedProfileUrl(item);
    if (suggested && lead.website && urlsLooselyMatch(lead.website, suggested)) return true;

    const itemHandle =
      extractHandleFromTitle(item.title) || extractHandleFromSnippet(item);
    if (itemHandle && lead.instagram?.toLowerCase() === itemHandle.toLowerCase()) {
      return true;
    }
    if (itemHandle && lead.website?.toLowerCase().includes(itemHandle.replace("@", ""))) {
      return true;
    }
  }

  return false;
}

/** Drop GPT leads that cannot be traced to search results */
export function validateInfluencerLeads(
  leads: Lead[],
  searchItems: WebSearchItemLike[]
): Lead[] {
  const corpus = buildSearchCorpus(searchItems);

  const validated: Lead[] = [];

  for (const lead of leads) {
      let website = lead.website;
      let instagram = lead.instagram;

      if (instagram) {
        const h = extractInstagramHandle(instagram);
        instagram = h;
        if (!h || !corpusContainsHandle(corpus, h)) instagram = null;
      }

      if (website) {
        if (isPostOrVideoUrl(website)) {
          website = getConfirmedProfileUrl({
            title: "",
            url: website,
            snippet: "",
            domain: "",
          });
        }
        if (website && !corpusContainsUrl(corpus, website)) {
          const h = extractInstagramHandle(website);
          if (h && corpusContainsHandle(corpus, h)) {
            website = `https://www.instagram.com/${h.replace("@", "")}/`;
            instagram = instagram ?? h;
          } else {
            website = null;
          }
        }
      }

      if (!website && instagram && corpusContainsHandle(corpus, instagram)) {
        website = `https://www.instagram.com/${instagram.replace("@", "")}/`;
      }

      // Drop only leads with no trace in search data (blocks hallucinations, keeps real hits)
      if (!leadHasSearchAnchor(lead, corpus, searchItems)) continue;

      const verified =
        !!website &&
        isProfileOrChannelUrl(website) &&
        corpusContainsUrl(corpus, website);

      validated.push({
        ...lead,
        website,
        instagram,
        verified,
        verification_note: verified
          ? "Profile URL matched search results"
          : "Handle found in search — confirm profile manually",
        red_flags:
          lead.red_flags === "None"
            ? verified
              ? "None"
              : "Unconfirmed profile — verify account exists before outreach"
            : lead.red_flags,
      });
    }

  return validated;
}

/** Fix contact fields — never invent from GPT prose */
export function normalizeInfluencerLead(lead: Lead): Lead {
  let website = lead.website;
  let instagram = lead.instagram;

  if (website && isPostOrVideoUrl(website)) {
    website = resolveProfileUrl(website);
  }

  if (instagram) {
    instagram = extractInstagramHandle(instagram);
  }

  if (website?.includes("instagram.com")) {
    const h = extractInstagramHandle(website);
    if (h) instagram = instagram ?? h;
  }

  if (website?.includes("tiktok.com")) {
    website = resolveProfileUrl(website) ?? website;
  }

  if (instagram && !instagram.startsWith("@")) {
    instagram = `@${instagram.replace(/^@/, "")}`;
  }

  return { ...lead, website, instagram, linkedin: lead.linkedin };
}

/** Build one lead per search hit that has a profile URL or handle (high volume, grounded in Google) */
export function buildLeadsFromSearchItems(
  items: WebSearchItemLike[],
  max: number
): Lead[] {
  const leads: Lead[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (leads.length >= max) break;

    const profileUrl = getSuggestedProfileUrl(item);
    if (!profileUrl) continue;

    const handle = profileUrl.includes("instagram.com")
      ? extractInstagramHandle(profileUrl)
      : null;
    const key = profileUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const nameFromTitle = item.title
      .replace(/\s*[@＠][\w.]+.*$/i, "")
      .split("|")[0]
      .split("-")[0]
      .trim()
      .slice(0, 60);
    const name = nameFromTitle || handle?.replace("@", "") || "";
    if (!name || name.length < 2) continue;

    leads.push({
      id: leads.length + 1,
      name,
      type: "Influencer / Creator",
      country: "",
      website: profileUrl,
      instagram: handle,
      linkedin: null,
      email: null,
      followers: null,
      score: 6,
      legitimacy: 7,
      relevance: 6,
      reach: 5,
      accessibility: 7,
      verified: isProfileOrChannelUrl(profileUrl),
      verification_note: isProfileOrChannelUrl(profileUrl)
        ? "Matched directly from Google search result"
        : "Handle/profile derived from search result — confirm before outreach",
      match: "Medium",
      why_good: item.snippet.slice(0, 250) || item.title,
      current_focus: item.snippet.slice(0, 180),
      estimated_value: "Micro-influencer collaboration",
      how_to_approach: "Reach out via DM on their profile platform.",
      best_message: `Hi ${name.split(" ")[0]}, I'd love to connect about a potential collaboration.`,
      red_flags: "Verify account is active before sending outreach",
    });
  }

  return leads;
}

/** @deprecated Use buildLeadsFromSearchItems */
export function buildStrictInfluencerFallbackLeads(
  items: WebSearchItemLike[],
  max: number
): Lead[] {
  return buildLeadsFromSearchItems(items, max);
}

// Legacy export used by route — redirect to strict filter
export function prioritizeInfluencerSearchResults<T extends WebSearchItemLike>(
  items: T[]
): T[] {
  return filterAndRankInfluencerSearchResults(items);
}

export function getProfileUrlForItem(item: WebSearchItemLike): string | null {
  return getSuggestedProfileUrl(item);
}
