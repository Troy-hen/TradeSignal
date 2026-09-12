import "server-only";

import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type KnowledgeHit = {
  document_slug: string;
  document_title: string;
  category: string;
  heading: string | null;
  content: string;
  relevance: number;
};

export type OpportunityTeaser = {
  opportunity_id: string;
  total_matches: number;
  postcode_district: string;
  post_town: string | null;
  trade_name: string;
  trade_slug: string;
  project_type: string | null;
  planning_status: string;
  estimated_trade_value_low: number | null;
  estimated_trade_value_high: number | null;
  access_level: "full" | "teaser";
  opportunity_score: number | null;
  opportunity_bucket: string | null;
  summary: string | null;
  recommended_action: string | null;
  territory_status: "owned" | "claimed" | "available" | string;
  monthly_price_pence: number;
};

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export function getAssistantOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function retrieveKnowledge(query: string, limit = 6): Promise<KnowledgeHit[]> {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const openai = getAssistantOpenAI();
  let queryEmbedding: number[] | null = null;

  if (openai) {
    try {
      await ensureKnowledgeEmbeddings(openai);
      const embedding = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: query, dimensions: 1536 });
      queryEmbedding = embedding.data[0]?.embedding ?? null;
    } catch (error) {
      console.warn("Ask MyTradeBox semantic retrieval unavailable; falling back to full-text retrieval", error);
    }
  }

  const { data, error } = await db.rpc("search_assistant_knowledge", {
    p_query: query,
    p_query_embedding: queryEmbedding,
    p_match_count: limit,
  });
  if (error) {
    console.error("Ask MyTradeBox knowledge retrieval failed", error);
    return [];
  }
  return (data ?? []) as KnowledgeHit[];
}

export async function searchOpportunityTeasers({
  location,
  tradeSlug,
  status,
  limit = 12,
}: {
  location: string;
  tradeSlug?: string | null;
  status?: string | null;
  limit?: number;
}): Promise<OpportunityTeaser[]> {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { data, error } = await db.rpc("search_opportunity_teasers", {
    p_location: location,
    p_trade_slug: tradeSlug ?? null,
    p_status: status ?? null,
    p_limit: limit,
  });
  if (error) {
    console.error("Ask MyTradeBox opportunity retrieval failed", error);
    return [];
  }
  return (data ?? []) as OpportunityTeaser[];
}

export async function resolveTradeSlug(trade: string | null | undefined): Promise<string | null> {
  if (!trade?.trim()) return null;
  const supabase = await createClient();
  const needle = trade.trim().toLowerCase();
  const { data } = await supabase.from("trade_categories").select("slug, name").eq("is_active", true);
  const match = (data ?? []).find((row) => row.slug.toLowerCase() === needle || row.name.toLowerCase() === needle)
    ?? (data ?? []).find((row) => row.name.toLowerCase().includes(needle) || needle.includes(row.name.toLowerCase()));
  return match?.slug ?? null;
}

async function ensureKnowledgeEmbeddings(openai: OpenAI) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: missing, error } = await admin
    .from("assistant_knowledge_chunks")
    .select("id, heading, content")
    .is("embedding", null)
    .limit(64);

  if (error || !missing?.length) return;

  const inputs = missing.map((row: { heading: string | null; content: string }) => `${row.heading ?? ""}\n${row.content}`.trim());
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: inputs, dimensions: 1536 });

  await Promise.all(
    missing.map((row: { id: string }, index: number) => {
      const embedding = response.data[index]?.embedding;
      if (!embedding) return Promise.resolve();
      return admin.from("assistant_knowledge_chunks").update({ embedding }).eq("id", row.id);
    }),
  );
}
