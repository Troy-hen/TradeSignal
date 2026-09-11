import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentCompany } from "@/lib/auth/get-current-company";
import { saveCustomerProfile } from "@/lib/data/customer-profile";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  what_do_you_sell: z.string().trim().min(2).max(500),
  ideal_customer: z.string().trim().max(500).nullable().optional(),
  exclusions: z.string().trim().max(500).nullable().optional(),
  where_do_you_sell: z.string().trim().max(500).nullable().optional(),
  normalized_profile: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: Request) {
  const company = await getCurrentCompany();
  if (!company) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const saved = await saveCustomerProfile({
    company_id: company.id,
    what_do_you_sell: parsed.data.what_do_you_sell,
    ideal_customer: parsed.data.ideal_customer ?? null,
    exclusions: parsed.data.exclusions ?? null,
    where_do_you_sell: parsed.data.where_do_you_sell ?? null,
    normalized_profile: parsed.data.normalized_profile as never,
    updated_by: auth.user.id,
  });
  if (!saved) return NextResponse.json({ error: "profile_save_failed" }, { status: 500 });
  return NextResponse.json({ profile: saved });
}
