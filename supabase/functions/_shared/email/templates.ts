/**
 * Branded, trade-audience email templates. The markup intentionally stays
 * table-based with inline styles so it renders consistently in Outlook and
 * mobile inboxes. All user-supplied text is escaped before it enters HTML.
 */

const ORANGE = "#FF6A00";
const CHARCOAL = "#1F2937";
const SLATE = "#64748B";
const LIGHT_GREY = "#E5E7EB";
const SOFT_SURFACE = "#F8FAFC";
const rawAppUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "";
const APP_URL = rawAppUrl.endsWith("/") ? rawAppUrl.slice(0, -1) : rawAppUrl;
const LOGO_URL = APP_URL ? APP_URL + "/brand/mytradebox-wordmark-light.png" : null;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(value: string): string {
  return value.startsWith("https://") || value.startsWith("http://") ? escapeHtml(value) : "#";
}

function shell(preheader: string, bodyHtml: string): string {
  const logo = LOGO_URL
    ? '<img src="' + escapeHtml(LOGO_URL) + '" alt="MyTradeBox" width="190" height="63" border="0" style="display:block;width:190px;height:auto;" />'
    : '<span style="color:#ffffff;font-size:20px;line-height:26px;font-weight:700;">MyTrade<span style="color:' + ORANGE + ';">Box</span></span>';

  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background-color:' + SOFT_SURFACE + ';font-family:Arial,Helvetica,sans-serif;">',
    '<span style="display:none;font-size:1px;line-height:1px;color:' + SOFT_SURFACE + ';">' + escapeHtml(preheader) + "</span>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + SOFT_SURFACE + ';padding-top:24px;padding-bottom:24px;">',
    "<tr><td align=\"center\">",
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:10px;overflow:hidden;">',
    '<tr><td bgcolor="' + CHARCOAL + '" style="background-color:' + CHARCOAL + ';padding:18px 32px;">' + logo + "</td></tr>",
    '<tr><td style="padding:32px;color:' + CHARCOAL + ';font-size:15px;line-height:23px;">' + bodyHtml + "</td></tr>",
    '<tr><td style="padding:16px 32px;border-top:1px solid ' + LIGHT_GREY + ';color:' + SLATE + ';font-size:12px;line-height:18px;">MyTradeBox — UK planning opportunity intelligence for trade businesses.</td></tr>',
    "</table></td></tr></table></body></html>",
  ].join("");
}

function button(text: string, url: string): string {
  return '<a href="' + safeUrl(url) + '" style="display:inline-block;background-color:' + ORANGE + ';color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;line-height:20px;padding:12px 24px;border-radius:7px;margin-top:10px;">' + escapeHtml(text) + "</a>";
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
  return value >= 1000 ? "£" + Math.round(value / 1000) + "k" : "£" + Math.round(value);
}

function matchRow(match: MatchSummary): string {
  const badge = scoreBadgeColor(match.bucket);
  const score = match.score !== null ? String(Math.round(match.score)) : "—";
  const bucket = (match.bucket ?? "low").toUpperCase();

  return [
    '<tr><td style="padding:10px 0;border-bottom:1px solid ' + LIGHT_GREY + ';font-size:14px;line-height:21px;">',
    '<span style="display:inline-block;background-color:' + badge + '1a;color:' + badge + ';font-weight:700;font-size:12px;line-height:17px;padding:3px 8px;border-radius:999px;margin-right:8px;">' + score + " " + bucket + "</span>",
    "<strong>" + escapeHtml(match.projectType ?? "Planning application") + "</strong> — " + escapeHtml(match.district) + " (" + escapeHtml(match.tradeName) + ")<br>",
    '<span style="color:' + SLATE + ';font-size:13px;line-height:19px;">Est. trade value: ' + formatGbp(match.valueLow) + "–" + formatGbp(match.valueHigh) + "</span>",
    ' &nbsp;·&nbsp; <a href="' + safeUrl(match.detailUrl) + '" style="color:' + ORANGE + ';font-size:13px;line-height:19px;">View opportunity →</a>',
    "</td></tr>",
  ].join("");
}

export function welcomeEmail(params: {
  companyName: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const subject = "Welcome to MyTradeBox — find the work worth chasing";
  const body = [
    "<p style=\"margin:0 0 16px;font-size:15px;line-height:23px;color:" + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Welcome to MyTradeBox. We turn planning activity into practical local opportunities, so you can spend more time chasing the right work and less time searching.</p>',
    '<p style="margin:0 0 4px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';"><strong>Start with one postcode district.</strong></p>',
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Check the opportunity volume and estimated value in your area, then add coverage as your pipeline grows.</p>',
    button("Open MyTradeBox", params.dashboardUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function newLeadInstantEmail(params: { companyName: string; matches: MatchSummary[] }): { subject: string; html: string } {
  const subject =
    params.matches.length === 1
      ? "High-priority opportunity detected in " + params.matches[0].district
      : params.matches.length + " high-priority opportunities detected";

  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">MyTradeBox just detected ' + (params.matches.length === 1 ? "a high-priority opportunity" : params.matches.length + " high-priority opportunities") + " in your territory:</p>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + params.matches.map(matchRow).join("") + "</table>",
    '<p style="margin:16px 0 0;color:' + SLATE + ';font-size:13px;line-height:19px;">All estimates are indicative — not a formal valuation.</p>',
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function digestEmail(params: {
  companyName: string;
  matches: MatchSummary[];
  periodLabel: "today" | "this week";
  dashboardUrl: string;
}): { subject: string; html: string } {
  const subject = params.matches.length + " new opportunit" + (params.matches.length === 1 ? "y" : "ies") + " " + params.periodLabel;
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Here is your ' + (params.periodLabel === "today" ? "daily" : "weekly") + " MyTradeBox summary — " + params.matches.length + " new opportunit" + (params.matches.length === 1 ? "y" : "ies") + " matched to your territories " + params.periodLabel + ":</p>",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + params.matches.map(matchRow).join("") + "</table>",
    button("Open your dashboard", params.dashboardUrl),
    '<p style="margin:16px 0 0;color:' + SLATE + ';font-size:13px;line-height:19px;">All estimates are indicative — not a formal valuation.</p>',
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function outsideTerritoryEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  score: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  previewUrl: string;
}): { subject: string; html: string } {
  const subject = "New opportunity near " + params.district;
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">A new planning opportunity has appeared outside your current coverage. It may be worth expanding into the area before another local business claims it.</p>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + SOFT_SURFACE + ';"><tr><td style="padding:16px;font-size:14px;line-height:21px;color:' + CHARCOAL + ';">',
    "<strong>" + escapeHtml(params.district) + " · " + escapeHtml(params.tradeName) + "</strong><br>",
    '<span style="color:' + SLATE + ';">Score: ' + (params.score === null ? "—" : Math.round(params.score)) + " · Est. value: " + formatGbp(params.valueLow) + "–" + formatGbp(params.valueHigh) + "</span>",
    "</td></tr></table>",
    button("Preview the area", params.previewUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function announcementEmail(params: {
  companyName: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): { subject: string; html: string } {
  const messageHtml = escapeHtml(params.message).replace(/\n/g, "<br>");
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<h1 style="margin:0 0 16px;font-size:24px;line-height:31px;color:' + CHARCOAL + ';">' + escapeHtml(params.title) + "</h1>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">' + messageHtml + "</p>",
    params.ctaLabel && params.ctaUrl ? button(params.ctaLabel, params.ctaUrl) : "",
  ].join("");
  return { subject: params.title, html: shell(params.title, body) };
}

export function approvalAlertEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  projectType: string | null;
  detailUrl: string;
}): { subject: string; html: string } {
  const subject = "Planning approved — " + params.district + " (" + params.tradeName + ")";
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';"><strong>' + escapeHtml(params.projectType ?? "A planning application") + "</strong> in " + escapeHtml(params.district) + ' has just been <strong>approved</strong> — this is often the best window to approach before the homeowner or developer has lined up trades.</p>',
    button("View opportunity", params.detailUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function followUpReminderEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  projectType: string | null;
  dueAt: string;
  note: string | null;
  detailUrl: string;
}): { subject: string; html: string } {
  const dueLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(params.dueAt));
  const subject = "Follow-up reminder — " + params.district + " (" + params.tradeName + ")";
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + '; ">A follow-up reminder is due for <strong>' + escapeHtml(params.projectType ?? "a planning opportunity") + "</strong> in " + escapeHtml(params.district) + " (" + escapeHtml(params.tradeName) + ")</p>",
    '<p style="margin:0 0 16px;color:' + SLATE + ';font-size:13px;line-height:19px;">Due: ' + escapeHtml(dueLabel) + "</p>",
    params.note
      ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + SOFT_SURFACE + ';margin-bottom:12px;"><tr><td style="padding:14px;font-size:14px;line-height:21px;color:' + CHARCOAL + ';"><strong>Your note</strong><br>' + escapeHtml(params.note) + "</td></tr></table>"
      : "",
    button("Open opportunity", params.detailUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function paymentFailedEmail(params: { companyName: string; billingPortalUrl: string }): { subject: string; html: string } {
  const subject = "Action needed: your MyTradeBox payment failed";
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">We were not able to process your latest MyTradeBox subscription payment. Your territory access will be suspended until this is resolved.</p>',
    button("Update payment details", params.billingPortalUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}

export function territoryAvailableEmail(params: {
  companyName: string;
  district: string;
  tradeName: string;
  claimUrl: string;
}): { subject: string; html: string } {
  const subject = params.district + " (" + params.tradeName + ") is now available";
  const body = [
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">Hi ' + escapeHtml(params.companyName) + ",</p>",
    '<p style="margin:0 0 16px;font-size:15px;line-height:23px;color:' + CHARCOAL + ';">The territory you were waiting on — <strong>' + escapeHtml(params.district) + " (" + escapeHtml(params.tradeName) + ")</strong> — has just become available. Territories are exclusive and go to whoever claims first.</p>",
    button("Claim " + params.district, params.claimUrl),
  ].join("");
  return { subject, html: shell(subject, body) };
}
