import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { CompaniesHouseAdapter } from "../_shared/providers/companies-house.ts";
import type { NormalizedProviderRecord } from "../_shared/providers/types.ts";

type AdminClient = SupabaseClient;
type IngestBody = { query?: unknown; limit?: unknown };
type RunStats = { seen: number; accepted: number; failed: number; opportunitiesCreated: number };
type EntityObservation = NonNullable<NormalizedProviderRecord["entityObservation"]>;

const PROVIDER_KEY = "companies_house";
const RUN_TYPE = "manual_company_context";

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("Authorization") !== "Bearer " + cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: IngestBody = {};
  try {
    body = await req.json() as IngestBody;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 200) {
    return json({ error: "invalid_query", message: "Provide a company-name query between 2 and 200 characters." }, 400);
  }

  const limit = boundedInteger(body.limit, 10, 1, 100);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await admin
    .from("intelligence_ingestion_runs")
    .insert({
      provider_key: PROVIDER_KEY,
      run_type: RUN_TYPE,
      metadata: { query, limit, context_only: true },
    })
    .select("id")
    .single();

  if (runError || !run) {
    return json({ error: "failed_to_start_run", message: runError?.message ?? "No ingestion run was created." }, 500);
  }

  const stats: RunStats = { seen: 0, accepted: 0, failed: 0, opportunitiesCreated: 0 };
  const errors: string[] = [];
  const adapter = new CompaniesHouseAdapter();

  try {
    const records = await adapter.fetch({ query, limit });
    stats.seen = records.length;

    for (const record of records) {
      try {
        const normalized = await adapter.normalize(record);
        await persistContext(admin, normalized, run.id);
        stats.accepted += 1;
      } catch (error) {
        stats.failed += 1;
        errors.push(record.externalId + ": " + errorMessage(error));
      }
    }

    const status = stats.failed > 0 && stats.accepted === 0 ? "failed" : stats.failed > 0 ? "partial" : "completed";
    await finishRun(admin, run.id, {
      status,
      stats,
      startedAt,
      errors,
      query,
      limit,
    });
    if (status !== "failed") {
      await admin
        .from("provider_config")
        .update({ health_status: "healthy", last_successful_run: new Date().toISOString() })
        .eq("provider_key", PROVIDER_KEY);
    }

    return json({
      ok: status !== "failed",
      runId: run.id,
      provider: PROVIDER_KEY,
      query,
      contextOnly: true,
      stats,
      errors,
    }, status === "failed" ? 500 : 200);
  } catch (error) {
    const message = errorMessage(error);
    await finishRun(admin, run.id, {
      status: "failed",
      stats,
      startedAt,
      errors: [...errors, message],
      query,
      limit,
    });
    await admin.from("provider_config").update({ health_status: "error" }).eq("provider_key", PROVIDER_KEY);
    return json({ error: "ingestion_failed", runId: run.id, message }, 500);
  }
});

async function persistContext(admin: AdminClient, normalized: NormalizedProviderRecord, runId: string) {
  const sourceId = await upsertSourceRecord(admin, normalized, runId);
  const observation = normalized.entityObservation;
  if (!observation) throw new Error("Companies House record did not contain an entity observation.");

  const entityId = await upsertBusinessEntity(admin, observation, normalized, sourceId);
  await upsertIdentifier(admin, entityId, observation.companiesHouseNumber ?? normalized.externalId, sourceId);
  await upsertProfile(admin, entityId, observation, normalized, sourceId);
  await ensureSourceRecordLink(admin, sourceId, { entityId, linkType: "entity_observation" });

  for (const event of normalized.eventObservations) {
    const eventId = await upsertEvent(admin, entityId, sourceId, normalized, event);
    await upsertEventEvidence(admin, eventId, sourceId, normalized, event);
    await ensureSourceRecordLink(admin, sourceId, { eventId, linkType: "event_observation" });
  }
  // Deliberately no signal or opportunity is created here. A registry
  // observation becomes commercially useful only when combined with an
  // independent buying signal elsewhere in the intelligence graph.
}

async function upsertSourceRecord(admin: AdminClient, normalized: NormalizedProviderRecord, runId: string): Promise<string> {
  const { data, error } = await admin
    .from("source_records")
    .upsert({
      provider_key: normalized.providerKey,
      record_type: normalized.recordType,
      external_id: normalized.externalId,
      source_url: normalized.sourceUrl ?? null,
      source_published_at: normalized.publishedAt ?? null,
      retrieved_at: normalized.retrievedAt,
      content_hash: normalized.contentHash ?? null,
      payload: normalized.payload,
      rights_snapshot: normalized.rights,
      is_fixture: normalized.isFixture,
      last_seen_at: normalized.retrievedAt,
      b2b_status: "contact_only",
      include_in_entity_resolution: true,
      include_in_signal_generation: false,
      include_in_customer_opportunities: false,
      is_consumer_record: false,
      commercial_relevance: null,
      ingestion_run_id: runId,
    }, { onConflict: "provider_key,record_type,external_id" })
    .select("id")
    .single();

  if (error || !data) throw new Error("source record upsert failed: " + (error?.message ?? "missing id"));
  return data.id;
}

async function upsertBusinessEntity(
  admin: AdminClient,
  observation: EntityObservation,
  normalized: NormalizedProviderRecord,
  sourceId: string,
): Promise<string> {
  const companyNumber = observation.companiesHouseNumber ?? normalized.externalId;
  const canonicalName = observation.name ?? observation.legalName ?? companyNumber;
  const { data: existing, error: lookupError } = await admin
    .from("business_entities")
    .select("id")
    .eq("companies_house_number", companyNumber)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error("business entity lookup failed: " + lookupError.message);

  if (existing?.id) {
    const { error } = await admin
      .from("business_entities")
      .update({
        canonical_name: canonicalName,
        legal_name: observation.legalName ?? null,
        website: observation.website ?? null,
        resolution_status: "resolved",
        resolution_method: observation.resolutionMethod,
        resolution_confidence: observation.resolutionConfidence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error("business entity update failed: " + error.message);
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("business_entities")
    .insert({
      entity_type: "business",
      entity_subtype: "registered_company",
      canonical_name: canonicalName,
      legal_name: observation.legalName ?? null,
      companies_house_number: companyNumber,
      registration_jurisdiction: "GB",
      website: observation.website ?? null,
      resolution_status: "resolved",
      resolution_method: observation.resolutionMethod,
      resolution_confidence: observation.resolutionConfidence,
      resolution_evidence: { provider: PROVIDER_KEY, source_record_id: sourceId },
      origin_source_record_id: sourceId,
      b2b_status: "review",
      b2b_eligible: false,
      classification_confidence: 1,
      classification_method: "companies_house_registry_context",
    })
    .select("id")
    .single();

  if (error || !created) throw new Error("business entity insert failed: " + (error?.message ?? "missing id"));
  return created.id;
}

async function upsertIdentifier(admin: AdminClient, entityId: string, companyNumber: string, sourceId: string) {
  const { data: existing, error: lookupError } = await admin
    .from("business_entity_identifiers")
    .select("id,entity_id")
    .eq("identifier_type", "companies_house_number")
    .eq("identifier_value", companyNumber)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error("entity identifier lookup failed: " + lookupError.message);
  if (existing && existing.entity_id !== entityId) throw new Error("Companies House number is already linked to another entity.");

  const payload = {
    entity_id: entityId,
    identifier_type: "companies_house_number",
    identifier_value: companyNumber,
    provider_key: PROVIDER_KEY,
    source_record_id: sourceId,
    is_primary: true,
  };
  const result = existing?.id
    ? await admin.from("business_entity_identifiers").update(payload).eq("id", existing.id)
    : await admin.from("business_entity_identifiers").insert(payload);
  if (result.error) throw new Error("entity identifier upsert failed: " + result.error.message);
}

async function upsertProfile(
  admin: AdminClient,
  entityId: string,
  observation: EntityObservation,
  normalized: NormalizedProviderRecord,
  sourceId: string,
) {
  const payload = normalized.payload;
  const currentResult = await admin
    .from("business_entity_profiles")
    .select("sic_codes,industry,employee_count,employee_count_at,description,profile")
    .eq("entity_id", entityId)
    .maybeSingle();
  if (currentResult.error) throw new Error("entity profile lookup failed: " + currentResult.error.message);

  const currentProfile = asRecord(currentResult.data?.profile);
  const { error } = await admin
    .from("business_entity_profiles")
    .upsert({
      entity_id: entityId,
      sic_codes: currentResult.data?.sic_codes ?? [],
      industry: currentResult.data?.industry ?? null,
      employee_count: currentResult.data?.employee_count ?? null,
      employee_count_at: currentResult.data?.employee_count_at ?? null,
      description: currentResult.data?.description ?? null,
      profile: {
        ...currentProfile,
        companies_house: {
          company_number: observation.companiesHouseNumber ?? normalized.externalId,
          name: observation.legalName ?? observation.name,
          status: payload.company_status ?? null,
          company_type: payload.company_type ?? null,
          date_of_creation: payload.date_of_creation ?? null,
          address: payload.address ?? null,
          source_url: normalized.sourceUrl ?? null,
          retrieved_at: normalized.retrievedAt,
        },
      },
      provider_key: PROVIDER_KEY,
      source_record_id: sourceId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entity_id" });
  if (error) throw new Error("entity profile upsert failed: " + error.message);
}

async function upsertEvent(
  admin: AdminClient,
  entityId: string,
  sourceId: string,
  normalized: NormalizedProviderRecord,
  event: NormalizedProviderRecord["eventObservations"][number],
): Promise<string> {
  const dedupeKey = [
    normalized.providerKey,
    normalized.recordType,
    normalized.externalId,
    event.eventType,
    normalized.contentHash ?? event.occurredAt,
  ].join(":");
  const { data, error } = await admin
    .from("events")
    .upsert({
      entity_id: entityId,
      source_record_id: sourceId,
      event_type: event.eventType,
      dedupe_key: dedupeKey,
      occurred_at: event.occurredAt,
      observed_at: normalized.retrievedAt,
      is_factual: true,
      confidence: 1,
      factual_data: event.factualData,
      b2b_status: "contact_only",
      commercial_relevance: null,
      customer_eligible: false,
    }, { onConflict: "dedupe_key" })
    .select("id")
    .single();
  if (error || !data) throw new Error("event upsert failed: " + (error?.message ?? "missing id"));
  return data.id;
}

async function upsertEventEvidence(
  admin: AdminClient,
  eventId: string,
  sourceId: string,
  normalized: NormalizedProviderRecord,
  event: NormalizedProviderRecord["eventObservations"][number],
) {
  const { error } = await admin
    .from("event_evidence")
    .upsert({
      event_id: eventId,
      source_record_id: sourceId,
      evidence_type: "source_record",
      source_url: normalized.sourceUrl ?? null,
      excerpt: typeof event.factualData.title === "string" ? event.factualData.title : normalized.externalId,
      metadata: { provider: normalized.providerKey, record_type: normalized.recordType },
    }, { onConflict: "event_id,source_record_id,evidence_type" });
  if (error) throw new Error("event evidence upsert failed: " + error.message);
}

async function ensureSourceRecordLink(
  admin: AdminClient,
  sourceId: string,
  link: { entityId?: string; eventId?: string; linkType: string },
) {
  let lookup = admin
    .from("source_record_links")
    .select("id")
    .eq("source_record_id", sourceId)
    .eq("link_type", link.linkType)
    .limit(1);
  if (link.entityId) lookup = lookup.eq("entity_id", link.entityId);
  if (link.eventId) lookup = lookup.eq("event_id", link.eventId);
  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw new Error("source record link lookup failed: " + lookupError.message);
  if (existing?.id) return;

  const { error } = await admin.from("source_record_links").insert({
    source_record_id: sourceId,
    entity_id: link.entityId ?? null,
    event_id: link.eventId ?? null,
    link_type: link.linkType,
    confidence: 1,
    metadata: { provider: PROVIDER_KEY },
  });
  if (error) throw new Error("source record link insert failed: " + error.message);
}

async function finishRun(
  admin: AdminClient,
  runId: string,
  input: {
    status: string;
    stats: RunStats;
    startedAt: string;
    errors: string[];
    query: string;
    limit: number;
  },
) {
  await admin
    .from("intelligence_ingestion_runs")
    .update({
      status: input.status,
      completed_at: new Date().toISOString(),
      records_seen: input.stats.seen,
      records_accepted: input.stats.accepted,
      records_rejected: 0,
      records_failed: input.stats.failed,
      opportunities_created: input.stats.opportunitiesCreated,
      metadata: {
        query: input.query,
        limit: input.limit,
        context_only: true,
        started_at: input.startedAt,
      },
      error_summary: input.errors.length > 0 ? input.errors.slice(0, 20).join("\n") : null,
    })
    .eq("id", runId);
}

function boundedInteger(input: unknown, fallback: number, min: number, max: number): number {
  const value = Number(input ?? fallback);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
