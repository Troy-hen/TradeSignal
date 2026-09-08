/** Shapes documented in Plota's API contract (https://plota.co.uk/api-docs). */

export interface PlotaAuthority {
  slug: string;
  name: string;
}

export interface PlotaCategory {
  slug: string;
  label: string;
}

export interface PlotaDecision {
  outcome: string | null;
  issued_date: string | null;
}

export interface PlotaKeyDates {
  target_decision: string | null;
}

export interface PlotaLocation {
  lat: number | null;
  lng: number | null;
}

export interface PlotaLinks {
  council: string | null;
  plota: string | null;
}

export interface PlotaApplication {
  id: string;
  reference: string;
  authority: PlotaAuthority;
  postcode: string | null;
  category: PlotaCategory | null;
  /** Normalized: 'pending' | 'decided' | 'withdrawn' (never filter on `status` instead). */
  stage: string;
  /** Verbatim council wording. */
  status: string;
  decision: PlotaDecision | null;
  date_received: string | null;
  date_validated: string | null;
  key_dates: PlotaKeyDates | null;
  location: PlotaLocation | null;
  dwelling_count: number | null;
  commercial_work: boolean | null;
  floorspace_sqm: number | null;
  /** Only present when include_contact=true was requested (never by default). */
  applicant_name?: string | null;
  agent_company?: string | null;
  proposal: string | null;
  links: PlotaLinks | null;
  /** Pro+ plan tiers only. */
  changed_at?: string | null;
  appeal_status?: string | null;
  [key: string]: unknown;
}

export interface PlotaListMeta {
  next_cursor: string | null;
}

export interface PlotaListResponse {
  data: PlotaApplication[];
  meta: PlotaListMeta;
}

export interface PlotaErrorBody {
  error: {
    type: string;
    message: string;
    param?: string;
    request_id?: string;
  };
}
