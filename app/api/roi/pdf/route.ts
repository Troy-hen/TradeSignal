import { NextResponse } from "next/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { createClient } from "@/lib/supabase/server";
import { renderSimplePdf } from "@/lib/export/simple-pdf";

export async function GET() {
  const company = await requireCurrentCompany();
  const supabase = await createClient();

  const [{ data: matchStates }, { data: activeClaims }] = await Promise.all([
    supabase
      .from("lead_match_current_state")
      .select("application_trade_opportunity_id, current_action, current_contract_value_gbp")
      .eq("company_id", company.id),
    supabase.from("territory_claims").select("territory_id").eq("company_id", company.id).eq("status", "active"),
  ]);

  const oppIds = [...new Set((matchStates ?? []).map((row) => row.application_trade_opportunity_id).filter((id): id is string => Boolean(id)))];
  let opportunityValues: { id: string; estimated_trade_value_high: number | null }[] = [];
  if (oppIds.length > 0) {
    const { data } = await supabase.from("application_trade_opportunities").select("id, estimated_trade_value_high").in("id", oppIds);
    opportunityValues = data ?? [];
  }
  const valueById = new Map(opportunityValues.map((row) => [row.id, Number(row.estimated_trade_value_high ?? 0)]));

  let pipeline = 0;
  let quoted = 0;
  let won = 0;
  let wonCount = 0;
  let quotedCount = 0;
  for (const row of matchStates ?? []) {
    if (!row.application_trade_opportunity_id) continue;
    const estimate = valueById.get(row.application_trade_opportunity_id) ?? 0;
    if (row.current_action !== "won" && row.current_action !== "lost") pipeline += estimate;
    if (row.current_action === "quoted") {
      quoted += row.current_contract_value_gbp ?? estimate;
      quotedCount += 1;
    }
    if (row.current_action === "won") {
      won += row.current_contract_value_gbp ?? estimate;
      wonCount += 1;
    }
  }

  const territoryIds = [...new Set((activeClaims ?? []).map((row) => row.territory_id))];
  let monthlySpendPence = 0;
  if (territoryIds.length > 0) {
    const { data } = await supabase.from("territories").select("monthly_price_pence").in("id", territoryIds);
    monthlySpendPence = (data ?? []).reduce((sum, row) => sum + row.monthly_price_pence, 0);
  }
  const monthlySpend = monthlySpendPence / 100;
  const roi = monthlySpend > 0 ? won / monthlySpend : null;

  const pdf = renderSimplePdf({
    title: "MyTradeBox ROI Report",
    subtitle: `${company.trading_name} · generated ${new Date().toLocaleDateString("en-GB")}`,
    sections: [
      {
        heading: "Business case",
        lines: [
          `Estimated open pipeline: ${formatGbp(pipeline)}`,
          `Quoted value: ${formatGbp(quoted)} across ${quotedCount} quoted opportunit${quotedCount === 1 ? "y" : "ies"}`,
          `Won value: ${formatGbp(won)} across ${wonCount} won opportunit${wonCount === 1 ? "y" : "ies"}`,
          `Monthly MyTradeBox spend: ${formatGbp(monthlySpend)}`,
          `Estimated ROI: ${roi !== null ? roi.toFixed(1) + "x" : "Not available yet"}`,
        ],
      },
      {
        heading: "Coverage",
        lines: [
          `Active territories: ${territoryIds.length}`,
          `Matched opportunities tracked: ${(matchStates ?? []).length}`,
        ],
      },
      {
        heading: "Method",
        lines: [
          "Pipeline uses the high end of MyTradeBox's indicative trade-value estimate for open opportunities.",
          "Quoted and won figures use the contract value recorded by the user when available, otherwise the indicative estimate.",
          "This report is a commercial performance summary, not an accounting statement or formal valuation.",
        ],
      },
    ],
  });
  const pdfBody = new Uint8Array(pdf).buffer;

  return new NextResponse(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="mytradebox-roi-report.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}

function formatGbp(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}
