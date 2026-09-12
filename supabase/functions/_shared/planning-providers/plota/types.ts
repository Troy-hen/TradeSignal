/** Shapes documented in Plota's API contract (https://plota.co.uk/api-docs). */

export interface PlotaAuthority {
  slug?: string | null;
  name?: string | null;
}

export interface PlotaCategory {
  slug?: string | null;
  label?: string | null;
}

export interface PlotaDecision {
  outcome?: string | null;
  issued_date?: string | null;
  level?: string | null;
}

export interface PlotaKeyDates {
  target_decision?: string | null;
  committee?: string | null;
  consultation_end?: string | null;
  advertised?: string | null;
  statutory_expiry?: string | null;
  permission_expiry?: string | null;
}

export interface PlotaLocation {
  lat?: number | null;
  lng?: number | null;
}

export interface PlotaLinks {
  council?: string | null;
  plota?: string | null;
  associated?: string | null;
}

export interface PlotaAppeal {
  status?: string | null;
  outcome?: string | null;
  [key: string]: unknown;
}

export interface PlotaApplication {
  id: string;
  reference: string;
  authority?: PlotaAuthority | null;
  address?: string | null;
  postcode?: string | null;
  category?: PlotaCategory | null;
  categories?: PlotaCategory[];
  planning_route?: string | null;
  procedure?: string | null;
  stage?: string | null;
  status?: string | null;
  decision?: PlotaDecision | null;
  date_received?: string | null;
  date_validated?: string | null;
  date_decided?: string | null;
  key_dates?: PlotaKeyDates | null;
  location?: PlotaLocation | null;
  dwelling_count?: number | null;
  /** Current Plota contract uses commercial for the boolean flag. */
  commercial?: boolean | null;
  /** Current Plota contract uses commercial_work for the work classification string. */
  commercial_work?: string | boolean | null;
  floorspace_sqm?: number | null;
  /** Only present when include_contact=true was requested (never by default). */
  applicant_name?: string | null;
  agent_company?: string | null;
  description?: string | null;
  /** Backwards-compatible fallback for older Plota payloads. */
  proposal?: string | null;
  links?: PlotaLinks | null;
  appeal?: PlotaAppeal | string | null;
  /** Backwards-compatible fallback for older payloads. */
  appeal_status?: string | null;
  /** Pro+ plan tiers only. */
  changed_at?: string | null;
  [key: string]: unknown;
}

export interface PlotaListMeta {
  next_cursor?: string | null;
  hint?: string | null;
  count?: number;
  [key: string]: unknown;
}

export interface PlotaListResponse {
  data: PlotaApplication[];
  meta?: PlotaListMeta;
}

export interface PlotaErrorBody {
  error: {
    type: string;
    message: string;
    param?: string;
    request_id?: string;
  };
}
