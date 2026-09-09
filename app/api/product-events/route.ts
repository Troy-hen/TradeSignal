import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/auth/get-current-company";

const EVENT_NAMES = [
  "territory_previewed",
  "notification_cta_clicked",
  "checkout_started",
  "checkout_completed",
] as const;

const eventSchema = z.object({
  eventName: z.enum(EVENT_NAMES),
  route: z.string().trim().max(300).optional(),
  source: z.string().trim().max(80).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const company = await getCurrentCompany();
  if (!company) return NextResponse.json({ error: "no_company" }, { status: 403 });

  const payload = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  const { error } = await supabase.from("product_events").insert({
    company_id: company.id,
    user_id: user.id,
    event_name: parsed.data.eventName,
    route: parsed.data.route ?? null,
    source: parsed.data.source ?? null,
    metadata: parsed.data.metadata ?? {},
  } as never);

  if (error) return NextResponse.json({ error: "event_write_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
