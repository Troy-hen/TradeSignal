"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/require-admin";

/**
 * Re-checks admin status independently of the page-level gate — a Server
 * Action is its own network-callable endpoint and shouldn't rely solely on
 * whichever page happened to render the button that called it.
 */
export async function reprocessApplication(planningApplicationId: string): Promise<{ error?: string; success?: boolean }> {
  await requirePlatformAdmin();

  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!cronSecret || !supabaseUrl) {
    return { error: "CRON_SECRET is not configured in this environment." };
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/classify-planning-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ planning_application_id: planningApplicationId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: body.error ?? `Reprocess failed with status ${res.status}` };
    }
  } catch {
    return { error: "Network error calling the classification function." };
  }

  revalidatePath("/admin");
  return { success: true };
}
