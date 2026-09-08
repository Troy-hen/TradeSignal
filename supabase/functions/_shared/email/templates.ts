/**
 * Plain, professional, trade-audience copy — no generic SaaS tone. Each
 * template links straight to the relevant page. Kept to simple inline-styled
 * markup (no grid/flexbox) for broad email-client compatibility.
 */

const ORANGE = "#FF6A00";
const CHARCOAL = "#1F2937";
const SLATE = "#64748B";
const LIGHT_GREY = "#E5E7EB";
const SOFT_SURFACE = "#F8FAFC";

function shell(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${SOFT_SURFACE};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:${SOFT_SURFACE};">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT_SURFACE};padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:${CHARCOAL};padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">Trade<span style="color:${ORANGE};">Signal</span></span>
          </td></tr>
          <tr><td style="padding:32px;color:${CHARCOAL};font-size:15px;line-height:1.5;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid ${LIGHT_GREY};color:${SLATE};font-size:12px;">
            MyTradeBox — UK planning opportunity intelligence for trade businesses.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${ORANGE};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px;margin-top:16px;">${text}</a>`;
}

function scoreBadgeColor(bucket: string | null): string {
  switch (bucket) {
    case "hot":
      return ORANGE;
    case "strong":
      return "#16A34A";
    case "possible":
      return "#D97706";
    default:
      return SLATE;
  }
}

export interface MatchSummary {
  district: string;
  tradeName: string;
  projectType: string | null;
  score: number | null;
  bucket: string | null;
  valueLow: number | null;
  valueHigh: number | null;
  detailUrl: string;
}

function formatGbp(value: number | null): string {
  if (value === null) return "—";
  return value >= 1000 ? `£${Math.round(value / 1000)}k` : `£${Math.round(value)}`;
}

function matchRow(match: MatchSummary): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${LIGHT_GREY};">
      <span style="display:inline-block;background:${scoreBadgeColor(match.bucket)}1a;color:${scoreBadgeColor(match.bucket)};font-weight:700;font-size:12px;padding:3px 8px;border-radius:999px;margin-right:8px;">
        ${match.score !== null ? Math.round(match.score) : "—"} ${(match.bucket ?? "low").toUpperCase()}
      </span>
      <strong>${match.projectType ?? "Planning application"}</strong> — ${match.district} (${match.tradeName})<br/>
      <span style="color:${SLATE};font-size:13px;">Est. trade value: ${formatGbp(match.valueLow)}–${formatGbp(match.valueHigh)}</span>
      &nbsp;·&nbsp;<a href="${match.detailUrl}" style="color:${ORANGE};font-size:13px;">View opportunity →</a>
    </td>
  </tr>`;
}

export function newLeadInstantEmail(params: { companyName: string; matches: MatchSummary[] }): { subject: string; html: string } {
  const subject =
    params.matches.length === 1
      ? `High-priority opportunity detected in ${params.matches[0].district}`
      : `${params.matches.length} high-priority opportunities detected`;

  const body = `
    <p>Hi ${params.companyName},</p>
    <p>MyTradeBox just detected ${params.matches.length === 1 ? "a high-priority opportunity" : `${params.matches.length} high-priority opportunities`} in your territory:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${params.matches.map(matchRow).join("")}</table>
    <p style="color:${SLATE};font-size:13px;margin-top:16px;">All estimates are indicative — not a formal valuation.</p>
  `;
  return { subject, html: shell(subject, body) };
}

export function digestEmail(params: {
  companyName: string;
  matches: MatchSummary[];
  periodLabel: "today" | "this week";
  dashboardUrl: string;
}): { subject: string; html: string } {
  const subject = `${params.matches.length} new opportunit${params.matches.length === 1 ? "y" : "ies"} ${params.periodLabel}`;
  const body = `
    <p>Hi ${params.companyName},</p>
    <p>Here's your ${params.periodLabel === "today" ? "daily" : "weekly"} MyTradeBox summary — ${params.matches.length} new opportunit${params.matches.length === 1 ? "y" : "ies"} matched to your territories ${params.periodLabel}:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${params.matches.map(matchRow).join("")}</table>
    ${button("Open your dashboard", params.dashboardUrl)}
    <p style="color:${SLATE};font-size:13px;margin-top:16px;">All estimates are indicative — not a formal valuation.</p>
  `;
  return { subject, html: shell(subject, body) };
}

export function approvalAlertEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  projectType: string | null;
  detailUrl: string;
}): { subject: string; html: string } {
  const subject = `Planning approved — ${params.district} (${params.tradeName})`;
  const body = `
    <p>Hi ${params.companyName},</p>
    <p><strong>${params.projectType ?? "A planning application"}</strong> in ${params.district} has just been <strong>approved</strong> — this is often the best window to approach before the homeowner or developer has lined up trades.</p>
    ${button("View opportunity", params.detailUrl)}
  `;
  return { subject, html: shell(subject, body) };
}

export function paymentFailedEmail(params: { companyName: string; billingPortalUrl: string }): { subject: string; html: string } {
  const subject = "Action needed: your MyTradeBox payment failed";
  const body = `
    <p>Hi ${params.companyName},</p>
    <p>We weren't able to process your latest MyTradeBox subscription payment. Your territory access will be suspended until this is resolved.</p>
    ${button("Update payment details", params.billingPortalUrl)}
  `;
  return { subject, html: shell(subject, body) };
}

export function territoryAvailableEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  claimUrl: string;
}): { subject: string; html: string } {
  const subject = `${params.district} (${params.tradeName}) is now available`;
  const body = `
    <p>Hi ${params.companyName},</p>
    <p>The territory you were waiting on — <strong>${params.district} (${params.tradeName})</strong> — has just become available. Territories are exclusive and go to whoever claims first.</p>
    ${button(`Claim ${params.district}`, params.claimUrl)}
  `;
  return { subject, html: shell(subject, body) };
}
