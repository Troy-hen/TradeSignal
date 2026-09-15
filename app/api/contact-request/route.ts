import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkEdgeRateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  company_name: z.string().trim().max(160).optional().or(z.literal("")),
  request_type: z.enum(["territory", "account", "billing", "data", "partnership", "other"]),
  postcode_district: z.string().trim().max(8).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(4000),
});

export async function POST(request: Request) {
  const parsedBody = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(parsedBody);
  if (!parsed.success) return NextResponse.json({ error: "Please complete the form with valid details." }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkEdgeRateLimit("contact-request:" + ip))) {
    return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_requests").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    company_name: parsed.data.company_name || null,
    request_type: parsed.data.request_type,
    postcode_district: parsed.data.postcode_district?.toUpperCase() || null,
    message: parsed.data.message,
  });

  if (error) {
    return NextResponse.json({ error: "We could not record your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
