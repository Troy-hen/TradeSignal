import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normaliseSellingProfile } from "@/lib/profile/normalise";

const schema = z.object({
  what_do_you_sell: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "what_do_you_sell_required" }, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.from("trade_categories").select("slug, name, description").eq("is_active", true).order("display_order").limit(120);
  const profile = await normaliseSellingProfile(parsed.data.what_do_you_sell, data ?? []);
  return NextResponse.json({ profile });
}
