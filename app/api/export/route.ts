import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Lead, SearchRequest } from "@/app/types";

interface ExportRequest {
  leads: Lead[];
  searchRequest: SearchRequest;
}

// IMPROVEMENT 4: Verified, Verification Note, Manual Check Required columns
// + Priority column as visual color indicator (xlsx free tier doesn't support cell fill,
//   so we use a text-based "Priority" column instead)
function formatLeadRow(lead: Lead) {
  const priority =
    lead.score >= 8 && lead.verified
      ? "🟢 HIGH — Verified & Strong"
      : lead.score >= 5 && lead.verified
      ? "🟡 MEDIUM — Verified"
      : lead.verified
      ? "🔴 LOW — Verified but weak score"
      : "⚪ UNVERIFIED — Check manually";

  return {
    "#": lead.id,
    Priority: priority,
    "Name / Company": lead.name,
    Type: lead.type,
    Country: lead.country,
    Website: lead.website ?? "",
    Email: lead.email ?? "",
    Instagram: lead.instagram ?? "",
    LinkedIn: lead.linkedin ?? "",
    Followers: lead.followers ?? "",
    "Overall Score": lead.score,
    Legitimacy: lead.legitimacy,
    Relevance: lead.relevance,
    Reach: lead.reach,
    Accessibility: lead.accessibility,
    Match: lead.match,
    // IMPROVEMENT 4 — new columns
    Verified: lead.verified ? "YES" : "NO",
    "Verification Note": lead.verification_note ?? "",
    "Manual Check Required": lead.verified ? "NO" : "YES — Verify before outreach",
    "Why This Lead": lead.why_good,
    "Current Focus": lead.current_focus,
    "Estimated Value": lead.estimated_value,
    "How to Approach": lead.how_to_approach,
    "Red Flags": lead.red_flags,
  };
}

function formatOutreachRow(lead: Lead) {
  const subjectLine =
    lead.type.toLowerCase().includes("influencer") || lead.type.toLowerCase().includes("creator")
      ? `Collaboration opportunity — ${lead.name}`
      : lead.type.toLowerCase().includes("investor")
      ? `Investment opportunity in ${lead.current_focus}`
      : `Partnership inquiry — let's work together`;

  return {
    "#": lead.id,
    "⚠️ Verify First": lead.verified ? "✓ Verified" : "❌ VERIFY BEFORE SENDING",
    "Name / Company": lead.name,
    Type: lead.type,
    Country: lead.country,
    "Current Focus": lead.current_focus,
    Score: lead.score,
    "Suggested Subject Line": subjectLine,
    "Opening Message Draft": lead.best_message,
    "Approach Strategy": lead.how_to_approach,
    Email: lead.email ?? "Not found",
    LinkedIn: lead.linkedin ?? "Not found",
    Instagram: lead.instagram ?? "Not found",
    "Verification Note": lead.verification_note ?? "",
  };
}

function autoWidthWorksheet(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const colWidths: number[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell?.v) {
        maxWidth = Math.min(Math.max(maxWidth, String(cell.v).length + 2), 60);
      }
    }
    colWidths.push(maxWidth);
  }
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequest = await req.json();
    const { leads, searchRequest } = body;

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No leads to export" }, { status: 400 });
    }

    const wb = XLSX.utils.book_new();
    const today = new Date();

    // ── Sheet 1: All Leads ──────────────────────────────────────────────────
    const ws1 = XLSX.utils.json_to_sheet(leads.map(formatLeadRow));
    autoWidthWorksheet(ws1);
    XLSX.utils.book_append_sheet(wb, ws1, "All Leads");

    // ── Sheet 2: Top Leads — IMPROVEMENT 4: verified + score 7+ only ───────
    const topLeads = leads.filter((l) => l.verified && l.score >= 7);
    const ws2 = XLSX.utils.json_to_sheet(
      topLeads.length > 0
        ? topLeads.map(formatLeadRow)
        : [{ Note: "No verified leads scored 7 or above" }]
    );
    autoWidthWorksheet(ws2);
    XLSX.utils.book_append_sheet(wb, ws2, "Top Leads (Verified 7+)");

    // ── Sheet 3: Outreach Templates — IMPROVEMENT 4: disclaimer note ────────
    const outreachLeads = leads.filter((l) => l.score >= 6);
    const disclaimerRow = {
      "#": "⚠️ IMPORTANT",
      "⚠️ Verify First": "Verify ALL contact info before sending. AI may make mistakes. Check each website manually.",
      "Name / Company": "",
      Type: "",
      Country: "",
      "Current Focus": "",
      Score: "",
      "Suggested Subject Line": "",
      "Opening Message Draft": "",
      "Approach Strategy": "",
      Email: "",
      LinkedIn: "",
      Instagram: "",
      "Verification Note": "",
    };

    const ws3 = XLSX.utils.json_to_sheet(
      outreachLeads.length > 0
        ? [disclaimerRow, ...outreachLeads.map(formatOutreachRow)]
        : [disclaimerRow, { Note: "No leads scored 6 or above" }]
    );
    autoWidthWorksheet(ws3);
    XLSX.utils.book_append_sheet(wb, ws3, "Outreach Templates");

    // ── Sheet 4: Search Summary ─────────────────────────────────────────────
    const verifiedCount = leads.filter((l) => l.verified).length;
    const summaryData = [
      { Field: "Lead Type",                Value: searchRequest.leadType },
      { Field: "Industry",                 Value: searchRequest.industry },
      { Field: "Product / Brand",          Value: searchRequest.product },
      { Field: "Target Country",           Value: searchRequest.country },
      { Field: "Platform",                 Value: searchRequest.platform || "N/A" },
      { Field: "Total Results",            Value: leads.length },
      { Field: "Verified Leads",           Value: verifiedCount },
      { Field: "Unverified Leads",         Value: leads.length - verifiedCount },
      { Field: "Average Score (all)",
        Value: leads.length > 0
          ? (leads.reduce((s, l) => s + l.score, 0) / leads.length).toFixed(1)
          : 0 },
      { Field: "Average Score (verified)",
        Value: verifiedCount > 0
          ? (leads.filter((l) => l.verified).reduce((s, l) => s + l.score, 0) / verifiedCount).toFixed(1)
          : "N/A" },
      { Field: "High Priority (verified + 8+)", Value: leads.filter((l) => l.verified && l.score >= 8).length },
      { Field: "Export Date",
        Value: today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
      { Field: "⚠️ Reminder",             Value: "Always verify contact information before outreach" },
    ];
    const ws4 = XLSX.utils.json_to_sheet(summaryData);
    autoWidthWorksheet(ws4);
    XLSX.utils.book_append_sheet(wb, ws4, "Search Summary");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `LeadFinder_${searchRequest.leadType}_${today.toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Export API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Export failed: ${message}` }, { status: 500 });
  }
}
