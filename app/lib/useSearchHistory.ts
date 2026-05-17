"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchHistoryItem } from "@/app/types";

const STORAGE_KEY = "ai-lead-finder-history";
const MAX_ITEMS = 5;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SearchHistoryItem[];
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // ignore
    }
  }, []);

  const addToHistory = useCallback((item: SearchHistoryItem) => {
    setHistory((prev) => {
      // Remove duplicate with same search params
      const filtered = prev.filter(
        (h) =>
          h.request.leadType !== item.request.leadType ||
          h.request.industry !== item.request.industry ||
          h.request.country !== item.request.country
      );
      const updated = [item, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { history, addToHistory, clearHistory };
}
