"use server";

import { createClient } from "@/lib/supabase/server";

export interface OutreachContent {
  intro_letter: string;
  phone_opener: string;
  doorstep_script: string;
}

/**
 * Invokes generate-outreach with the caller's own session (supabase-js
 * forwards it automatically) — RLS on the Edge Function's own queries is
 * what actually gates this to opportunities the company holds an active
 * claim for, not anything checked here.
 */
export async function generateOutreach(opportunityId: string): Promise<{ data?: OutreachContent; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke("generate-outreach", {
    body: { opportunity_id: opportunityId },
  });

  if (error) return { error: "Could not generate outreach copy. Please try again." };

  if (!data?.ok) {
    const message =
      data?.error === "provider_not_configured"
        ? "The outreach assistant isn't configured yet."
        : data?.error === "not_found"
          ? "Could not find this opportunity."
          : "Could not generate outreach copy. Please try again.";
    return { error: message };
  }

  return {
    data: {
      intro_letter: data.intro_letter,
      phone_opener: data.phone_opener,
      doorstep_script: data.doorstep_script,
    },
  };
}
