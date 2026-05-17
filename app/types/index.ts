export type LeadType =
  | "buyers"
  | "influencers"
  | "distributors"
  | "partners"
  | "investors"
  | "custom";

export type MatchLevel = "High" | "Medium" | "Low";

export interface Lead {
  id: number;
  name: string;
  type: string;
  country: string;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  email: string | null;
  followers: string | null;
  score: number;
  legitimacy: number;
  relevance: number;
  reach: number;
  accessibility: number;
  verified: boolean;
  verification_note?: string;
  match: MatchLevel;
  why_good: string;
  current_focus: string;
  estimated_value: string;
  how_to_approach: string;
  best_message: string;
  red_flags: string;
}

export interface SearchFilters {
  // Buyers / Distributors
  minOrderSize?: "$1K+" | "$5K+" | "$10K+" | "$50K+";
  businessType?: "Retail" | "Wholesale" | "Both";
  // Influencers / Creators — follower count range
  followerRange?: "0-1K" | "1K-10K" | "10K-100K" | "100K-1M" | "1M+";
  contentType?: "Reviews" | "Tutorials" | "Lifestyle" | "Any";
  // Investors
  stage?: "Pre-seed" | "Seed" | "Series A" | "Any";
  checkSize?: "$100K" | "$500K" | "$1M+" | "Any";
}

export interface SearchRequest {
  leadType: LeadType;
  customType: string;
  industry: string;
  product: string;
  country: string;
  platform: string;
  filters: SearchFilters;
  count: number;
  language: string;
}

export interface SearchResponse {
  leads: Lead[];
  totalFound: number;
  avgScore: number;
  highlyRecommended: number;
  generatedIn: number;
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  request: SearchRequest;
  response: SearchResponse;
}

export interface FilterState {
  score: string;
  country: string;
  type: string;
  verifiedOnly: boolean;
  sortBy: "score" | "name" | "match";
}
