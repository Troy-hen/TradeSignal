import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CrmProvider = "generic_webhook" | "hubspot" | "pipedrive" | "salesforce" | "dynamics" | "zoho";
export type CrmConnectionStatus = "pending" | "connected" | "error" | "disconnected";
export type AlertRuleCadence = "instant" | "daily" | "weekly";

export type CrmConnection = {
  id: string;
  company_id: string;
  provider: CrmProvider;
  label: string;
  status: CrmConnectionStatus;
  external_account_id: string | null;
  external_account_name: string | null;
  scopes: string[];
  last_connected_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  /** Non-secret connection metadata used by the Settings editor. */
  webhook_url?: string | null;
  secret_ref?: string | null;
  updated_at: string;
};

export type AlertRule = {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  min_score: number;
  signal_families: string[];
  postcode_districts: string[];
  buying_windows: string[];
  channels: string[];
  cadence: AlertRuleCadence;
  max_per_digest: number;
  updated_at: string;
};

export type CrmFieldMapping = { id: string; connection_id: string; everro_field: string; remote_field: string; required: boolean };

type LooseResult = { data: unknown; error: { code?: string; message?: string } | null };
type LooseBuilder = {
  select(columns: string): LooseBuilder;
  eq(column: string, value: unknown): LooseBuilder;
  in(column: string, values: unknown[]): LooseBuilder;
  order(column: string, options?: { ascending?: boolean }): LooseBuilder;
};
type LooseClient = { from(table: string): LooseBuilder };

async function run<T>(query: LooseBuilder): Promise<{ data: T | null; error: LooseResult["error"] }> {
  return query as unknown as Promise<{ data: T | null; error: LooseResult["error"] }>;
}

/**
 * Reads connection metadata with the caller's session so company membership
 * and RLS remain the source of truth. Provider secrets never cross this API.
 */
export async function listCrmConnections(companyId: string, includeAdminDetails = false): Promise<CrmConnection[]> {
  const client = (await createClient()) as unknown as LooseClient;
  const columns = "id, company_id, provider, label, status, external_account_id, external_account_name, scopes, last_connected_at, last_synced_at, last_error, updated_at" + (includeAdminDetails ? ", config, secret_ref" : "");
  const { data, error } = await run<CrmConnection[]>(
    client
      .from("crm_connections")
      .select(columns)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
  );

  if (error) {
    console.error("CRM connection lookup failed", error);
    return [];
  }
  if (!includeAdminDetails) return data ?? [];
  return (data ?? []).map((connection) => {
    const row = connection as CrmConnection & { config?: Record<string, unknown> | null };
    return {
      ...row,
      webhook_url: typeof row.config?.webhook_url === "string" ? row.config.webhook_url : null,
      secret_ref: row.secret_ref ?? null,
    };
  });
}

export async function listAlertRules(companyId: string): Promise<AlertRule[]> {
  const client = (await createClient()) as unknown as LooseClient;
  const { data, error } = await run<AlertRule[]>(
    client
      .from("alert_rules")
      .select("id, company_id, name, enabled, min_score, signal_families, postcode_districts, buying_windows, channels, cadence, max_per_digest, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
  );

  if (error) {
    console.error("Alert rule lookup failed", error);
    return [];
  }
  return data ?? [];
}

export async function listCrmDeliveryStatuses(companyId: string): Promise<Array<{ lead_unlock_id: string; status: string; created_at: string }>> {
  const client = (await createClient()) as unknown as LooseClient;
  const { data, error } = await run<Array<{ lead_unlock_id: string; status: string; created_at: string }>>(
    client.from("crm_delivery_log").select("lead_unlock_id, status, created_at").eq("company_id", companyId).order("created_at", { ascending: false }),
  );
  if (error) {
    console.error("CRM delivery status lookup failed", error);
    return [];
  }
  return data ?? [];
}

export async function listCrmFieldMappings(connectionId: string): Promise<CrmFieldMapping[]> {
  const client = (await createClient()) as unknown as LooseClient;
  const { data, error } = await run<CrmFieldMapping[]>(
    client.from("crm_field_mappings").select("id, connection_id, everro_field, remote_field, required").eq("connection_id", connectionId).order("everro_field", { ascending: true }),
  );
  if (error) {
    console.error("CRM field mapping lookup failed", error);
    return [];
  }
  return data ?? [];
}
