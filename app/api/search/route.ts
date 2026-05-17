import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildLeadsFromSearchItems,
  filterAndRankInfluencerSearchResults,
  formatInfluencerResultForGpt,
  normalizeInfluencerLead,
  validateInfluencerLeads,
} from "@/app/lib/influencerProfiles";
import { Lead, SearchRequest, SearchResponse } from "@/app/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const APIFY_GOOGLE_SEARCH_ACTOR = "apify~google-search-scraper";

interface WebSearchItem {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface ApifyOrganicResult {
  title?: string;
  url?: string;
  description?: string;
  snippet?: string;
}

interface ApifySearchPage {
  organicResults?: ApifyOrganicResult[];
  title?: string;
  url?: string;
  description?: string;
}

// ─── Follower range helpers ───────────────────────────────────────────────────

function followerRangeSearchTerms(range?: string): string {
  switch (range) {
    case "0-1K":
      return "micro influencer nano influencer under 1000 followers 0-1000";
    case "1K-10K":
      return "micro influencer 1000-10000 followers";
    case "10K-100K":
      return "influencer 10000-100000 followers";
    case "100K-1M":
      return "influencer 100000-1000000 followers";
    case "1M+":
      return "macro influencer 1 million followers";
    default:
      return "micro influencer";
  }
}

function followerRangePromptLine(range?: string): string {
  switch (range) {
    case "0-1K":
      return "Follower range: 0–1,000 (micro/nano influencers only — do NOT include accounts with more than 1,000 followers)";
    case "1K-10K":
      return "Follower range: 1,000–10,000 followers";
    case "10K-100K":
      return "Follower range: 10,000–100,000 followers";
    case "100K-1M":
      return "Follower range: 100,000–1,000,000 followers";
    case "1M+":
      return "Follower range: 1,000,000+ followers";
    default:
      return "";
  }
}

// ─── Query builder ────────────────────────────────────────────────────────────

function buildQueries(req: SearchRequest): string[] {
  const { leadType, customType, industry, product, country, platform, filters } = req;
  const followerTerms =
    leadType === "influencers" ? followerRangeSearchTerms(filters.followerRange) : "";

  const base: Record<string, string[]> = {
    buyers: [
      `${industry} wholesale buyer importer ${country} B2B`,
      `${industry} distributor ${country} purchase ${product}`,
      `${industry} retailer ${country} supplier contact`,
    ],
    influencers: [
      `${industry} ${followerTerms} ${country} ${platform !== "All platforms" ? platform : "Instagram"} influencer ${product}`,
      `${industry} micro influencer ${country} instagram ${followerTerms}`,
      `${industry} ${platform !== "All platforms" ? platform : "TikTok"} creator ${country} ${followerTerms}`,
      `site:instagram.com ${industry} ${country} influencer`,
      `${country} ${industry} beauty lifestyle creator instagram`,
    ],
    distributors: [
      `${industry} distributor ${country} wholesale`,
      `${product} wholesale distributor ${country} B2B`,
      `${industry} wholesaler supplier ${country} contact`,
    ],
    partners: [
      `${industry} business partner reseller ${country}`,
      `${product} reseller affiliate partner ${country}`,
      `${industry} channel partner distribution ${country}`,
    ],
    investors: [
      `${industry} investor venture capital ${country}`,
      `${industry} angel investor ${country} funding`,
      `${industry} startup VC fund ${country}`,
    ],
    custom: [
      `${customType} ${industry} ${country}`,
      `${customType} ${product} ${country}`,
      `${customType} ${industry} contact ${country}`,
    ],
  };

  return (base[leadType] ?? base.custom).map((q) => q.replace(/\s+/g, " ").trim());
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Map target country to Google locale for Apify scraper */
function apifyLocaleFromCountry(country: string): {
  countryCode?: string;
  languageCode?: string;
} {
  const c = country.toLowerCase();
  if (c.includes("korea") || c.includes("korean") || c === "kr" || c.includes("seoul")) {
    return { countryCode: "kr", languageCode: "ko" };
  }
  if (c.includes("japan") || c.includes("japanese")) {
    return { countryCode: "jp", languageCode: "ja" };
  }
  if (c.includes("usa") || c.includes("united states") || c === "us") {
    return { countryCode: "us", languageCode: "en" };
  }
  if (c.includes("uk") || c.includes("united kingdom") || c.includes("britain")) {
    return { countryCode: "gb", languageCode: "en" };
  }
  return {};
}

// ─── Apify Google Search Scraper ──────────────────────────────────────────────

function parseApifyDatasetItems(items: unknown[]): WebSearchItem[] {
  const results: WebSearchItem[] = [];

  for (const raw of items) {
    const page = raw as ApifySearchPage;
    const organic = page.organicResults ?? [];

    if (organic.length > 0) {
      for (const r of organic) {
        if (r.url && r.title) {
          results.push({
            title: r.title,
            url: r.url,
            snippet: r.description ?? r.snippet ?? "",
            domain: domainFromUrl(r.url),
          });
        }
      }
    } else if (page.url && page.title) {
      results.push({
        title: page.title,
        url: page.url,
        snippet: page.description ?? "",
        domain: domainFromUrl(page.url),
      });
    }
  }

  return results;
}

async function apifyGoogleSearch(
  queries: string[],
  country: string
): Promise<WebSearchItem[]> {
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is not set. Get your token at https://console.apify.com/account/integrations"
    );
  }

  const locale = apifyLocaleFromCountry(country);
  const url = `https://api.apify.com/v2/acts/${APIFY_GOOGLE_SEARCH_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      queries: queries.join("\n"),
      maxPagesPerQuery: 1,
      resultsPerPage: 15,
      mobileResults: false,
      ...locale,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const items: unknown = await res.json();

  if (!Array.isArray(items)) {
    throw new Error("Apify returned unexpected response format");
  }

  return parseApifyDatasetItems(items);
}

// ─── Format search results for GPT-4o ─────────────────────────────────────────

function formatSearchResults(items: WebSearchItem[], leadType?: SearchRequest["leadType"]): string {
  return items
    .map((item, i) =>
      leadType === "influencers"
        ? formatInfluencerResultForGpt(item, i)
        : `[${i + 1}] Title: ${item.title}
    URL: ${item.url}
    Domain: ${item.domain}
    Content: ${item.snippet}`
    )
    .join("\n\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(req: SearchRequest): string {
  const { leadType, customType, industry, product, country, platform, filters, language } = req;

  const leadLabel =
    leadType === "custom"
      ? customType
      : leadType.charAt(0).toUpperCase() + leadType.slice(1);

  const filterNotes = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return `You are a lead generation analyst. You have been given REAL live Google search results (via Apify).
Your job is to identify the best leads from these results and score them.

Target: ${leadLabel}
Industry: ${industry || "General"}
Product/Brand: ${product || "Not specified"}
Region: ${country || "Worldwide"}
${platform && platform !== "All platforms" ? `Platform: ${platform}` : ""}
${filterNotes ? `Filters: ${filterNotes}` : ""}
${req.leadType === "influencers" ? followerRangePromptLine(req.filters.followerRange) : ""}
${language !== "Any" ? `Language: ${language}` : ""}
${
  req.leadType === "influencers"
    ? `
INFLUENCER RULES:
- Each lead MUST map to one numbered search result — do not invent creators not listed above
- Use the "Profile URL for this creator" line as website when provided
- If only a Handle is shown, set instagram to that handle and website to the matching profile URL shown
- Never invent @handles, emails, or follower counts not in that result
- Default verified: false (true only for direct profile/channel URLs in results)
- Skip listicles and brand pages — only individual creators
- Turn EACH numbered result that has a Profile URL or Handle into one lead (do not skip valid creators)
- Aim to return as many valid creators as requested — one lead per search result when possible
`
    : ""
}

RULES:
1. Only include leads that directly match a numbered search result — DO NOT invent companies or people
2. website must be a URL that appears in that result (Confirmed profile URL or Source URL for businesses)
3. Never invent email addresses — null unless explicitly in the snippet
4. Never invent follower counts — null unless a number appears in the snippet
5. For micro range (0–1K): only if follower count in snippet is under 1,000 or clearly described as nano/micro
6. verified: true ONLY when you are confident the profile/company exists in the search result; otherwise false
7. If uncertain about any field, use null and verified: false

SCORING (1-10):
- legitimacy: Is this clearly a real, active entity based on the search result?
- relevance: How well do they match what the user needs?
- reach: How large/influential are they?
- accessibility: Can we contact them? (website present = higher score)
- score: weighted avg (relevance×0.35 + legitimacy×0.25 + reach×0.2 + accessibility×0.2)

Respond with ONLY a valid JSON object — no markdown:
{
  "leads": [
    {
      "id": 1,
      "name": "Company or Person Name",
      "type": "Specific type e.g. K-beauty Distributor",
      "country": "Country from result",
      "website": "profile or channel URL only (NOT a video/post link)",
      "instagram": "@handle — required when platform is Instagram; build from profile URL if needed",
      "linkedin": "LinkedIn URL if in results or null",
      "email": "email if in content or null",
      "followers": "number/range if mentioned or null",
      "score": 8,
      "legitimacy": 9,
      "relevance": 8,
      "reach": 7,
      "accessibility": 8,
      "verified": true,
      "match": "High",
      "why_good": "2-3 sentences based on what the search result shows",
      "current_focus": "What they do — from the search content",
      "estimated_value": "Realistic estimate",
      "how_to_approach": "Specific advice based on their website/profile",
      "best_message": "Personalized 3-4 sentence opener",
      "red_flags": "None or any concerns from the result"
    }
  ]
}`;
}

// ─── GPT-4o analysis of real search results ───────────────────────────────────

async function analyzeWithGPT(
  searchResults: string,
  req: SearchRequest,
  targetCount: number
): Promise<Lead[]> {
  const systemPrompt = buildSystemPrompt(req);

  const influencerTarget =
    req.leadType === "influencers"
      ? `Return up to ${targetCount} influencer leads — ideally one per numbered result that has a profile or handle.`
      : `Identify up to ${targetCount} leads from them.`;

  const userPrompt = `Here are real live web search results. ${influencerTarget}

${searchResults}

Extract leads ONLY from these numbered results. Do not invent people not listed above.
Return a JSON object with a "leads" key and a "leads" array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("GPT parse error:", e, "\nContent:", content.slice(0, 400));
    return [];
  }

  if (Array.isArray(parsed.leads)) return parsed.leads as Lead[];
  const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
  if (firstArray) return firstArray as Lead[];

  console.error("No leads array in GPT response. Keys:", Object.keys(parsed));
  return [];
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateLeads(leads: Lead[], leadType?: SearchRequest["leadType"]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key =
      leadType === "influencers"
        ? (lead.instagram ?? lead.website ?? lead.name ?? "").toLowerCase().trim()
        : (lead.website ?? lead.name ?? "").toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SearchRequest = await req.json();
    const { count = 20 } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }
    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json(
        {
          error:
            "APIFY_API_TOKEN is not configured. Get your token at https://console.apify.com/account/integrations",
        },
        { status: 500 }
      );
    }

    const queries = buildQueries(body);
    console.log("Apify Google search queries:", queries);

    // ── Step 1: Apify Google search (parallel per query = more results) ───
    let allItems: WebSearchItem[] = [];
    try {
      const runs = await Promise.allSettled(
        queries.map((q) => apifyGoogleSearch([q], body.country))
      );
      runs.forEach((result, i) => {
        if (result.status === "fulfilled") {
          console.log(`Apify query ${i + 1}: ${result.value.length} results`);
          allItems.push(...result.value);
        } else {
          console.error(`Apify query ${i + 1} failed:`, result.reason);
        }
      });
    } catch (e) {
      console.error("Apify search failed:", e);
      const message = e instanceof Error ? e.message : "Apify search failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const seenUrls = new Set<string>();
    allItems = allItems.filter((item) => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    if (body.leadType === "influencers") {
      allItems = filterAndRankInfluencerSearchResults(allItems);
    }

    const itemsForGpt = allItems.slice(0, 45);

    console.log(`Total unique Apify results: ${allItems.length}, sending ${itemsForGpt.length} to GPT`);

    if (allItems.length === 0) {
      return NextResponse.json(
        {
          error:
            "Google search returned no results. Check your APIFY_API_TOKEN and Apify account credits.",
        },
        { status: 500 }
      );
    }

    // ── Step 2: Build leads from search + GPT enrichment ───────────────────
    let merged: Lead[] = [];

    if (body.leadType === "influencers") {
      // Grounded base: one lead per Google hit with a profile/handle
      const searchLeads = buildLeadsFromSearchItems(itemsForGpt, count);
      console.log(`Search-derived leads: ${searchLeads.length}`);

      const gptInput = formatSearchResults(itemsForGpt, body.leadType);
      const gptLeads = gptInput.trim()
        ? await analyzeWithGPT(gptInput, body, count)
        : [];
      console.log(`GPT leads: ${gptLeads.length}`);

      const validatedGpt = validateInfluencerLeads(
        gptLeads.map((l) => normalizeInfluencerLead(l)),
        itemsForGpt
      );
      console.log(`GPT after validation: ${gptLeads.length} → ${validatedGpt.length}`);

      merged = deduplicateLeads([...validatedGpt, ...searchLeads], "influencers");

      if (merged.length < count) {
        const extra = buildLeadsFromSearchItems(itemsForGpt, count * 2).filter((lead) => {
          const key = (lead.instagram ?? lead.website ?? "").toLowerCase();
          return !merged.some(
            (m) =>
              (m.instagram ?? m.website ?? "").toLowerCase() === key && key.length > 0
          );
        });
        merged = deduplicateLeads([...merged, ...extra], "influencers").slice(0, count);
        console.log(`Topped up to ${merged.length} leads from search URLs/handles`);
      }
    } else {
      const mid = Math.ceil(itemsForGpt.length / 2);
      const [batch1, batch2] = await Promise.all([
        analyzeWithGPT(formatSearchResults(itemsForGpt.slice(0, mid), body.leadType), body, count),
        itemsForGpt.length > mid
          ? analyzeWithGPT(formatSearchResults(itemsForGpt.slice(mid), body.leadType), body, count)
          : Promise.resolve([]),
      ]);
      console.log(`GPT batch 1: ${batch1.length}, batch 2: ${batch2.length}`);
      merged = deduplicateLeads([...batch1, ...batch2]);
    }

    const numbered = merged.map((lead, i) => ({ ...lead, id: i + 1 }));
    const sorted = numbered.sort((a, b) => b.score - a.score);
    const topLeads = sorted.slice(0, count);

    const avgScore =
      topLeads.length > 0
        ? Math.round((topLeads.reduce((s, l) => s + l.score, 0) / topLeads.length) * 10) / 10
        : 0;
    const highlyRecommended = topLeads.filter((l) => l.score >= 8).length;
    const generatedIn = Math.round((Date.now() - startTime) / 1000);

    console.log(`Returning ${topLeads.length} leads in ${generatedIn}s`);

    const response: SearchResponse = {
      leads: topLeads,
      totalFound: topLeads.length,
      avgScore,
      highlyRecommended,
      generatedIn,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Search API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Search failed: ${message}` }, { status: 500 });
  }
}
