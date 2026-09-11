export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          granted_at: string
          granted_by: string | null
          notes: string | null
          profile_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          profile_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_enrichment_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_payload: Json
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          parsed_successfully: boolean
          planning_application_id: string
          prompt_version_id: string
          provider: string
          raw_response: Json | null
          started_at: string
          status: string
          total_tokens: number | null
          trigger_reason: string
          validation_errors: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload: Json
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          parsed_successfully: boolean
          planning_application_id: string
          prompt_version_id: string
          provider: string
          raw_response?: Json | null
          started_at: string
          status: string
          total_tokens?: number | null
          trigger_reason: string
          validation_errors?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_payload?: Json
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          parsed_successfully?: boolean
          planning_application_id?: string
          prompt_version_id?: string
          provider?: string
          raw_response?: Json | null
          started_at?: string
          status?: string
          total_tokens?: number | null
          trigger_reason?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_enrichment_runs_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_enrichment_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "ai_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_outreach_generations: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_code: string | null
          estimated_cost_usd: number | null
          generation_number: number
          id: string
          input_tokens: number | null
          model: string | null
          opportunity_id: string
          output_tokens: number | null
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          estimated_cost_usd?: number | null
          generation_number: number
          id?: string
          input_tokens?: number | null
          model?: string | null
          opportunity_id: string
          output_tokens?: number | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          estimated_cost_usd?: number | null
          generation_number?: number
          id?: string
          input_tokens?: number | null
          model?: string | null
          opportunity_id?: string
          output_tokens?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_outreach_generations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_outreach_generations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_outreach_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_versions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          model: string
          schema_version: string
          system_prompt: string
          task: string
          version: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          model: string
          schema_version: string
          system_prompt: string
          task: string
          version: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          model?: string
          schema_version?: string
          system_prompt?: string
          task?: string
          version?: string
        }
        Relationships: []
      }
      application_classifications: {
        Row: {
          ai_confidence: number | null
          ai_enrichment_run_id: string | null
          attempts: number
          classification_status: Database["public"]["Enums"]["classification_status"]
          content_hash: string | null
          created_at: string
          estimated_total_project_value_high: number | null
          estimated_total_project_value_low: number | null
          id: string
          key_facts: Json | null
          last_classified_at: string | null
          likely_start_window: string | null
          opportunity_timing: string | null
          planning_application_id: string
          project_size_category:
            | Database["public"]["Enums"]["project_size_category"]
            | null
          project_type: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_enrichment_run_id?: string | null
          attempts?: number
          classification_status?: Database["public"]["Enums"]["classification_status"]
          content_hash?: string | null
          created_at?: string
          estimated_total_project_value_high?: number | null
          estimated_total_project_value_low?: number | null
          id?: string
          key_facts?: Json | null
          last_classified_at?: string | null
          likely_start_window?: string | null
          opportunity_timing?: string | null
          planning_application_id: string
          project_size_category?:
            | Database["public"]["Enums"]["project_size_category"]
            | null
          project_type?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_enrichment_run_id?: string | null
          attempts?: number
          classification_status?: Database["public"]["Enums"]["classification_status"]
          content_hash?: string | null
          created_at?: string
          estimated_total_project_value_high?: number | null
          estimated_total_project_value_low?: number | null
          id?: string
          key_facts?: Json | null
          last_classified_at?: string | null
          likely_start_window?: string | null
          opportunity_timing?: string | null
          planning_application_id?: string
          project_size_category?:
            | Database["public"]["Enums"]["project_size_category"]
            | null
          project_type?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_classifications_ai_enrichment_run_id_fkey"
            columns: ["ai_enrichment_run_id"]
            isOneToOne: false
            referencedRelation: "ai_enrichment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_classifications_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: true
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_trade_opportunities: {
        Row: {
          ai_confidence: number | null
          application_classification_id: string
          created_at: string
          estimated_trade_value_high: number | null
          estimated_trade_value_low: number | null
          fit_score: number
          id: string
          is_active: boolean
          likely_scope: string[] | null
          match_reasons: string[] | null
          opportunity_bucket:
            | Database["public"]["Enums"]["opportunity_bucket"]
            | null
          opportunity_score: number | null
          planning_application_id: string
          postcode_district: string
          recommended_action: string | null
          recommended_contact_timing: string | null
          risk_flags: string[] | null
          score_computed_at: string | null
          score_formula_version: string | null
          trade_category_id: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          application_classification_id: string
          created_at?: string
          estimated_trade_value_high?: number | null
          estimated_trade_value_low?: number | null
          fit_score: number
          id?: string
          is_active?: boolean
          likely_scope?: string[] | null
          match_reasons?: string[] | null
          opportunity_bucket?:
            | Database["public"]["Enums"]["opportunity_bucket"]
            | null
          opportunity_score?: number | null
          planning_application_id: string
          postcode_district: string
          recommended_action?: string | null
          recommended_contact_timing?: string | null
          risk_flags?: string[] | null
          score_computed_at?: string | null
          score_formula_version?: string | null
          trade_category_id: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          application_classification_id?: string
          created_at?: string
          estimated_trade_value_high?: number | null
          estimated_trade_value_low?: number | null
          fit_score?: number
          id?: string
          is_active?: boolean
          likely_scope?: string[] | null
          match_reasons?: string[] | null
          opportunity_bucket?:
            | Database["public"]["Enums"]["opportunity_bucket"]
            | null
          opportunity_score?: number | null
          planning_application_id?: string
          postcode_district?: string
          recommended_action?: string | null
          recommended_contact_timing?: string | null
          risk_flags?: string[] | null
          score_computed_at?: string | null
          score_formula_version?: string | null
          trade_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_trade_opportuniti_application_classification_i_fkey"
            columns: ["application_classification_id"]
            isOneToOne: false
            referencedRelation: "application_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_trade_opportunities_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_trade_opportunities_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_daily_briefs: {
        Row: {
          action_items: Json
          brief_date: string
          company_id: string
          generated_at: string
          id: string
          model: string | null
          snapshot: Json
          summary: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          brief_date: string
          company_id: string
          generated_at?: string
          id?: string
          model?: string | null
          snapshot?: Json
          summary: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          brief_date?: string
          company_id?: string
          generated_at?: string
          id?: string
          model?: string | null
          snapshot?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_daily_briefs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          heading: string | null
          id: string
          search_vector: unknown
          updated_at: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          heading?: string | null
          id?: string
          search_vector?: unknown
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          heading?: string | null
          id?: string
          search_vector?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "assistant_knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_knowledge_documents: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
        }
        Relationships: []
      }
      b2b_source_eligibility_rules: {
        Row: {
          b2b_status: string
          created_at: string
          exclude_if_domestic: boolean
          id: string
          include_in_customer_opportunities: boolean
          include_in_entity_resolution: boolean
          include_in_signal_generation: boolean
          notes: string | null
          priority: number
          provider_key: string
          record_type: string
          updated_at: string
        }
        Insert: {
          b2b_status: string
          created_at?: string
          exclude_if_domestic?: boolean
          id?: string
          include_in_customer_opportunities?: boolean
          include_in_entity_resolution?: boolean
          include_in_signal_generation?: boolean
          notes?: string | null
          priority?: number
          provider_key: string
          record_type: string
          updated_at?: string
        }
        Update: {
          b2b_status?: string
          created_at?: string
          exclude_if_domestic?: boolean
          id?: string
          include_in_customer_opportunities?: boolean
          include_in_entity_resolution?: boolean
          include_in_signal_generation?: boolean
          notes?: string | null
          priority?: number
          provider_key?: string
          record_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_source_eligibility_rules_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      business_domains: {
        Row: {
          created_at: string
          domain: string
          entity_id: string
          id: string
          is_primary: boolean
          provider_key: string | null
          source_record_id: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          entity_id: string
          id?: string
          is_primary?: boolean
          provider_key?: string | null
          source_record_id?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          entity_id?: string
          id?: string
          is_primary?: boolean
          provider_key?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_domains_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_domains_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "business_domains_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entities: {
        Row: {
          b2b_eligible: boolean
          b2b_status: string
          canonical_name: string
          classification_confidence: number | null
          classification_method: string | null
          companies_house_number: string | null
          created_at: string
          domain: string | null
          entity_subtype: string | null
          entity_type: string
          id: string
          last_business_change_at: string | null
          legal_name: string | null
          origin_source_record_id: string | null
          registration_jurisdiction: string | null
          resolution_confidence: number | null
          resolution_evidence: Json
          resolution_method: string | null
          resolution_status: string
          telephone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          b2b_eligible?: boolean
          b2b_status?: string
          canonical_name: string
          classification_confidence?: number | null
          classification_method?: string | null
          companies_house_number?: string | null
          created_at?: string
          domain?: string | null
          entity_subtype?: string | null
          entity_type?: string
          id?: string
          last_business_change_at?: string | null
          legal_name?: string | null
          origin_source_record_id?: string | null
          registration_jurisdiction?: string | null
          resolution_confidence?: number | null
          resolution_evidence?: Json
          resolution_method?: string | null
          resolution_status?: string
          telephone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          b2b_eligible?: boolean
          b2b_status?: string
          canonical_name?: string
          classification_confidence?: number | null
          classification_method?: string | null
          companies_house_number?: string | null
          created_at?: string
          domain?: string | null
          entity_subtype?: string | null
          entity_type?: string
          id?: string
          last_business_change_at?: string | null
          legal_name?: string | null
          origin_source_record_id?: string | null
          registration_jurisdiction?: string | null
          resolution_confidence?: number | null
          resolution_evidence?: Json
          resolution_method?: string | null
          resolution_status?: string
          telephone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_entities_origin_source_record_id_fkey"
            columns: ["origin_source_record_id"]
            isOneToOne: true
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entity_aliases: {
        Row: {
          alias: string
          alias_type: string
          created_at: string
          entity_id: string
          id: string
          source_record_id: string | null
        }
        Insert: {
          alias: string
          alias_type?: string
          created_at?: string
          entity_id: string
          id?: string
          source_record_id?: string | null
        }
        Update: {
          alias?: string
          alias_type?: string
          created_at?: string
          entity_id?: string
          id?: string
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_entity_aliases_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_entity_aliases_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entity_financials: {
        Row: {
          accounts_period_end: string | null
          employee_count: number | null
          entity_id: string
          financial_data: Json
          financial_status: string | null
          provider_key: string | null
          source_record_id: string | null
          turnover: number | null
          turnover_currency: string
          updated_at: string
        }
        Insert: {
          accounts_period_end?: string | null
          employee_count?: number | null
          entity_id: string
          financial_data?: Json
          financial_status?: string | null
          provider_key?: string | null
          source_record_id?: string | null
          turnover?: number | null
          turnover_currency?: string
          updated_at?: string
        }
        Update: {
          accounts_period_end?: string | null
          employee_count?: number | null
          entity_id?: string
          financial_data?: Json
          financial_status?: string | null
          provider_key?: string | null
          source_record_id?: string | null
          turnover?: number | null
          turnover_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_entity_financials_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_entity_financials_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "business_entity_financials_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entity_identifiers: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          identifier_type: string
          identifier_value: string
          is_primary: boolean
          provider_key: string | null
          source_record_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          identifier_type: string
          identifier_value: string
          is_primary?: boolean
          provider_key?: string | null
          source_record_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          identifier_type?: string
          identifier_value?: string
          is_primary?: boolean
          provider_key?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_entity_identifiers_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_entity_identifiers_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "business_entity_identifiers_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entity_profiles: {
        Row: {
          description: string | null
          employee_count: number | null
          employee_count_at: string | null
          entity_id: string
          industry: string | null
          profile: Json
          provider_key: string | null
          sic_codes: string[]
          source_record_id: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          employee_count?: number | null
          employee_count_at?: string | null
          entity_id: string
          industry?: string | null
          profile?: Json
          provider_key?: string | null
          sic_codes?: string[]
          source_record_id?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          employee_count?: number | null
          employee_count_at?: string | null
          entity_id?: string
          industry?: string | null
          profile?: Json
          provider_key?: string | null
          sic_codes?: string[]
          source_record_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_entity_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_entity_profiles_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "business_entity_profiles_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entity_properties: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string
          property_id: string
          relationship: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id: string
          property_id: string
          relationship?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string
          property_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_entity_properties_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_entity_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "business_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address_text: string | null
          county: string | null
          created_at: string
          entity_id: string | null
          full_postcode: string | null
          id: string
          latitude: number | null
          local_authority: string | null
          location: unknown
          longitude: number | null
          origin_source_record_id: string | null
          postcode_area: string | null
          postcode_district: string | null
          region: string | null
          resolution_confidence: number | null
          resolution_evidence: Json
          resolution_method: string | null
          resolution_status: string
          town_city: string | null
          updated_at: string
          uprn: string | null
        }
        Insert: {
          address_text?: string | null
          county?: string | null
          created_at?: string
          entity_id?: string | null
          full_postcode?: string | null
          id?: string
          latitude?: number | null
          local_authority?: string | null
          location?: unknown
          longitude?: number | null
          origin_source_record_id?: string | null
          postcode_area?: string | null
          postcode_district?: string | null
          region?: string | null
          resolution_confidence?: number | null
          resolution_evidence?: Json
          resolution_method?: string | null
          resolution_status?: string
          town_city?: string | null
          updated_at?: string
          uprn?: string | null
        }
        Update: {
          address_text?: string | null
          county?: string | null
          created_at?: string
          entity_id?: string | null
          full_postcode?: string | null
          id?: string
          latitude?: number | null
          local_authority?: string | null
          location?: unknown
          longitude?: number | null
          origin_source_record_id?: string | null
          postcode_area?: string | null
          postcode_district?: string | null
          region?: string | null
          resolution_confidence?: number | null
          resolution_evidence?: Json
          resolution_method?: string | null
          resolution_status?: string
          town_city?: string | null
          updated_at?: string
          uprn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_locations_origin_source_record_id_fkey"
            columns: ["origin_source_record_id"]
            isOneToOne: true
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      business_properties: {
        Row: {
          address_text: string | null
          created_at: string
          id: string
          is_commercial: boolean
          occupancy_status: string | null
          postcode: string | null
          property_type: string | null
          provider_key: string | null
          source_record_id: string | null
          title_relationship: Json
          uprn: string | null
        }
        Insert: {
          address_text?: string | null
          created_at?: string
          id?: string
          is_commercial?: boolean
          occupancy_status?: string | null
          postcode?: string | null
          property_type?: string | null
          provider_key?: string | null
          source_record_id?: string | null
          title_relationship?: Json
          uprn?: string | null
        }
        Update: {
          address_text?: string | null
          created_at?: string
          id?: string
          is_commercial?: boolean
          occupancy_status?: string | null
          postcode?: string | null
          property_type?: string | null
          provider_key?: string | null
          source_record_id?: string | null
          title_relationship?: Json
          uprn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_properties_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
          {
            foreignKeyName: "business_properties_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string
          city: string | null
          companies_house_number: string | null
          created_at: string
          deleted_at: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postcode: string | null
          stripe_customer_id: string | null
          trading_name: string
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email: string
          city?: string | null
          companies_house_number?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postcode?: string | null
          stripe_customer_id?: string | null
          trading_name: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string
          city?: string | null
          companies_house_number?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postcode?: string | null
          stripe_customer_id?: string | null
          trading_name?: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_email: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_email?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: Database["public"]["Enums"]["company_member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_email?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: Database["public"]["Enums"]["company_member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_people: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string
          id: string
          is_decision_maker: boolean
          person_id: string
          relationship: string | null
          source_record_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id: string
          id?: string
          is_decision_maker?: boolean
          person_id: string
          relationship?: string | null
          source_record_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          is_decision_maker?: boolean
          person_id?: string
          relationship?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_people_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_people_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      company_trade_profiles: {
        Row: {
          certifications: string[] | null
          company_id: string
          created_at: string
          id: string
          is_primary_trade: boolean
          service_radius_miles: number | null
          trade_category_id: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          certifications?: string[] | null
          company_id: string
          created_at?: string
          id?: string
          is_primary_trade?: boolean
          service_radius_miles?: number | null
          trade_category_id: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          certifications?: string[] | null
          company_id?: string
          created_at?: string
          id?: string
          is_primary_trade?: boolean
          service_radius_miles?: number | null
          trade_category_id?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_trade_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_trade_profiles_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enrichment_lookups: {
        Row: {
          company_id: string
          completed_at: string | null
          error_code: string | null
          id: string
          planning_application_id: string
          provider: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          error_code?: string | null
          id?: string
          planning_application_id: string
          provider?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          error_code?: string | null
          id?: string
          planning_application_id?: string
          provider?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_lookups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_lookups_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_lookups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enrichment_records: {
        Row: {
          collected_at: string
          company_id: string
          contact_role: string
          created_at: string
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          is_public_source: boolean
          lawful_basis: string
          organisation: string | null
          phone: string | null
          planning_application_id: string
          provenance: Json
          purpose: string
          source_name: string
          source_record_id: string | null
          source_url: string | null
          suppressed_at: string | null
          suppression_reason: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          collected_at?: string
          company_id: string
          contact_role: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_public_source?: boolean
          lawful_basis?: string
          organisation?: string | null
          phone?: string | null
          planning_application_id: string
          provenance?: Json
          purpose?: string
          source_name: string
          source_record_id?: string | null
          source_url?: string | null
          suppressed_at?: string | null
          suppression_reason?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          collected_at?: string
          company_id?: string
          contact_role?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_public_source?: boolean
          lawful_basis?: string
          organisation?: string | null
          phone?: string | null
          planning_application_id?: string
          provenance?: Json
          purpose?: string
          source_name?: string
          source_record_id?: string | null
          source_url?: string | null
          suppressed_at?: string | null
          suppression_reason?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_records_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enrichment_requests: {
        Row: {
          company_id: string
          completed_at: string | null
          estimated_cost: number | null
          id: string
          metadata: Json
          opportunity_id: string
          provider_key: string | null
          requested_at: string
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json
          opportunity_id: string
          provider_key?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json
          opportunity_id?: string
          provider_key?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_requests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enrichment_results: {
        Row: {
          confidence: number | null
          expires_at: string | null
          id: string
          opportunity_id: string
          provider_key: string
          request_id: string
          result: Json
          retrieved_at: string
          rights_snapshot: Json
          source_record_id: string | null
        }
        Insert: {
          confidence?: number | null
          expires_at?: string | null
          id?: string
          opportunity_id: string
          provider_key: string
          request_id: string
          result?: Json
          retrieved_at?: string
          rights_snapshot?: Json
          source_record_id?: string | null
        }
        Update: {
          confidence?: number | null
          expires_at?: string | null
          id?: string
          opportunity_id?: string
          provider_key?: string
          request_id?: string
          result?: Json
          retrieved_at?: string
          rights_snapshot?: Json
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_results_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_results_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "contact_enrichment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_enrichment_results_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enrichment_usage: {
        Row: {
          company_id: string
          lookup_count: number
          monthly_limit: number
          period_start: string
          updated_at: string
        }
        Insert: {
          company_id: string
          lookup_count?: number
          monthly_limit?: number
          period_start: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          lookup_count?: number
          monthly_limit?: number
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_enrichment_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_intelligence_records: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string
          email: string | null
          entity_type: string
          expires_at: string | null
          id: string
          job_title: string | null
          lawful_basis: string | null
          opportunity_id: string
          organisation_name: string | null
          person_name: string | null
          phone: string | null
          planning_application_id: string
          provider: string
          purpose: string | null
          raw_payload: Json
          retrieved_at: string
          source_url: string | null
          suppression_status: string
          website: string | null
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string
          email?: string | null
          entity_type: string
          expires_at?: string | null
          id?: string
          job_title?: string | null
          lawful_basis?: string | null
          opportunity_id: string
          organisation_name?: string | null
          person_name?: string | null
          phone?: string | null
          planning_application_id: string
          provider: string
          purpose?: string | null
          raw_payload?: Json
          retrieved_at?: string
          source_url?: string | null
          suppression_status?: string
          website?: string | null
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string
          email?: string | null
          entity_type?: string
          expires_at?: string | null
          id?: string
          job_title?: string | null
          lawful_basis?: string | null
          opportunity_id?: string
          organisation_name?: string | null
          person_name?: string | null
          phone?: string | null
          planning_application_id?: string
          provider?: string
          purpose?: string | null
          raw_payload?: Json
          retrieved_at?: string
          source_url?: string | null
          suppression_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_intelligence_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_intelligence_records_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_intelligence_records_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_permissions: {
        Row: {
          channels: string[]
          company_id: string
          created_at: string
          granted_at: string
          id: string
          opportunity_id: string
          permission_text: string
          permission_text_version: string
          permission_type: string
          quote_request_id: string
          response_link_id: string
          source: string
          withdrawn_at: string | null
        }
        Insert: {
          channels?: string[]
          company_id: string
          created_at?: string
          granted_at?: string
          id?: string
          opportunity_id: string
          permission_text: string
          permission_text_version: string
          permission_type?: string
          quote_request_id: string
          response_link_id: string
          source?: string
          withdrawn_at?: string | null
        }
        Update: {
          channels?: string[]
          company_id?: string
          created_at?: string
          granted_at?: string
          id?: string
          opportunity_id?: string
          permission_text?: string
          permission_text_version?: string
          permission_type?: string
          quote_request_id?: string
          response_link_id?: string
          source?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_permissions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_permissions_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_permissions_response_link_id_fkey"
            columns: ["response_link_id"]
            isOneToOne: false
            referencedRelation: "outreach_response_links"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_points: {
        Row: {
          confidence: number | null
          contact_type: string
          data_rights: Json
          display_allowed: boolean
          entity_id: string | null
          export_allowed: boolean
          id: string
          is_professional: boolean
          last_verified_at: string | null
          person_id: string | null
          provider_key: string | null
          retrieved_at: string
          source_record_id: string | null
          suppression_status: string
          value: string
          verification_status: string
        }
        Insert: {
          confidence?: number | null
          contact_type: string
          data_rights?: Json
          display_allowed?: boolean
          entity_id?: string | null
          export_allowed?: boolean
          id?: string
          is_professional?: boolean
          last_verified_at?: string | null
          person_id?: string | null
          provider_key?: string | null
          retrieved_at?: string
          source_record_id?: string | null
          suppression_status?: string
          value: string
          verification_status?: string
        }
        Update: {
          confidence?: number | null
          contact_type?: string
          data_rights?: Json
          display_allowed?: boolean
          entity_id?: string | null
          export_allowed?: boolean
          id?: string
          is_professional?: boolean
          last_verified_at?: string | null
          person_id?: string | null
          provider_key?: string | null
          retrieved_at?: string
          source_record_id?: string | null
          suppression_status?: string
          value?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_points_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_points_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_points_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          postcode_district: string | null
          request_type: string
          status: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          postcode_district?: string | null
          request_type: string
          status?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          postcode_district?: string | null
          request_type?: string
          status?: string
        }
        Relationships: []
      }
      contact_suppressions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          opportunity_id: string | null
          reason: string
          response_link_id: string | null
          revoked_at: string | null
          scope: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          reason: string
          response_link_id?: string | null
          revoked_at?: string | null
          scope?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          reason?: string
          response_link_id?: string | null
          revoked_at?: string | null
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_suppressions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_suppressions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_suppressions_response_link_id_fkey"
            columns: ["response_link_id"]
            isOneToOne: false
            referencedRelation: "outreach_response_links"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_area_postcodes: {
        Row: {
          coverage_area_id: string
          created_at: string
          postcode_district: string
        }
        Insert: {
          coverage_area_id: string
          created_at?: string
          postcode_district: string
        }
        Update: {
          coverage_area_id?: string
          created_at?: string
          postcode_district?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_area_postcodes_coverage_area_id_fkey"
            columns: ["coverage_area_id"]
            isOneToOne: false
            referencedRelation: "coverage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_area_postcodes_postcode_district_fkey"
            columns: ["postcode_district"]
            isOneToOne: false
            referencedRelation: "postcode_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_areas: {
        Row: {
          area_type: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          area_type?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          area_type?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coverage_plan_items: {
        Row: {
          coverage_plan_id: string
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          postcode_district: string
          status: Database["public"]["Enums"]["coverage_plan_item_status"]
          territory_claim_id: string
          unit_monthly_price_pence: number
          updated_at: string
        }
        Insert: {
          coverage_plan_id: string
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          postcode_district: string
          status?: Database["public"]["Enums"]["coverage_plan_item_status"]
          territory_claim_id: string
          unit_monthly_price_pence: number
          updated_at?: string
        }
        Update: {
          coverage_plan_id?: string
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          postcode_district?: string
          status?: Database["public"]["Enums"]["coverage_plan_item_status"]
          territory_claim_id?: string
          unit_monthly_price_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_plan_items_coverage_plan_id_fkey"
            columns: ["coverage_plan_id"]
            isOneToOne: false
            referencedRelation: "coverage_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_plan_items_postcode_district_fkey"
            columns: ["postcode_district"]
            isOneToOne: false
            referencedRelation: "postcode_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_plan_items_territory_claim_id_fkey"
            columns: ["territory_claim_id"]
            isOneToOne: true
            referencedRelation: "territory_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_plans: {
        Row: {
          billing_mode: Database["public"]["Enums"]["coverage_billing_mode"]
          cancel_at_period_end: boolean
          cancelled_at: string | null
          company_id: string
          coverage_area_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_price_pence: number
          status: Database["public"]["Enums"]["coverage_plan_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trade_category_id: string
          updated_at: string
        }
        Insert: {
          billing_mode?: Database["public"]["Enums"]["coverage_billing_mode"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          company_id: string
          coverage_area_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_price_pence: number
          status?: Database["public"]["Enums"]["coverage_plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trade_category_id: string
          updated_at?: string
        }
        Update: {
          billing_mode?: Database["public"]["Enums"]["coverage_billing_mode"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          company_id?: string
          coverage_area_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_price_pence?: number
          status?: Database["public"]["Enums"]["coverage_plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trade_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_plans_coverage_area_id_fkey"
            columns: ["coverage_area_id"]
            isOneToOne: false
            referencedRelation: "coverage_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_plans_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_geographies: {
        Row: {
          company_id: string
          created_at: string
          criteria: Json
          geography_type: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          criteria?: Json
          geography_type: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          criteria?: Json
          geography_type?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_geographies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_markets: {
        Row: {
          company_id: string
          created_at: string
          ends_at: string | null
          exclusive: boolean
          geography_id: string | null
          id: string
          market_id: string
          starts_at: string | null
          status: string
          supplier_category_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          ends_at?: string | null
          exclusive?: boolean
          geography_id?: string | null
          id?: string
          market_id: string
          starts_at?: string | null
          status?: string
          supplier_category_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          ends_at?: string | null
          exclusive?: boolean
          geography_id?: string | null
          id?: string
          market_id?: string
          starts_at?: string | null
          status?: string
          supplier_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_markets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_markets_geography_id_fkey"
            columns: ["geography_id"]
            isOneToOne: false
            referencedRelation: "customer_geographies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_markets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "opportunity_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_markets_supplier_category_id_fkey"
            columns: ["supplier_category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          alert_channels: string[]
          company_id: string
          created_at: string
          id: string
          market_id: string | null
          minimum_score: number | null
          require_verified_contact: boolean
          temperatures: string[]
          updated_at: string
        }
        Insert: {
          alert_channels?: string[]
          company_id: string
          created_at?: string
          id?: string
          market_id?: string | null
          minimum_score?: number | null
          require_verified_contact?: boolean
          temperatures?: string[]
          updated_at?: string
        }
        Update: {
          alert_channels?: string[]
          company_id?: string
          created_at?: string
          id?: string
          market_id?: string | null
          minimum_score?: number | null
          require_verified_contact?: boolean
          temperatures?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "opportunity_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profile_terms: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string
          id: string
          source: string
          term: string
          term_type: string
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          source?: string
          term: string
          term_type: string
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          source?: string
          term?: string
          term_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profile_terms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          company_id: string
          created_at: string
          exclusions: string | null
          ideal_customer: string | null
          normalization_error: string | null
          normalization_provider: string | null
          normalization_status: string
          normalized_at: string | null
          normalized_profile: Json
          profile_version: number
          updated_at: string
          updated_by: string | null
          what_do_you_sell: string
          where_do_you_sell: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          exclusions?: string | null
          ideal_customer?: string | null
          normalization_error?: string | null
          normalization_provider?: string | null
          normalization_status?: string
          normalized_at?: string | null
          normalized_profile?: Json
          profile_version?: number
          updated_at?: string
          updated_by?: string | null
          what_do_you_sell: string
          where_do_you_sell?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          exclusions?: string | null
          ideal_customer?: string | null
          normalization_error?: string | null
          normalization_provider?: string | null
          normalization_status?: string
          normalized_at?: string | null
          normalized_profile?: Json
          profile_version?: number
          updated_at?: string
          updated_by?: string | null
          what_do_you_sell?: string
          where_do_you_sell?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_accounts: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      epc_intelligence_records: {
        Row: {
          air_conditioning: boolean | null
          built_form: string | null
          certificate_number: string
          certificate_scope: string
          co2_emissions_current: number | null
          company_id: string
          construction_age_band: string | null
          current_band: string | null
          current_efficiency: number | null
          energy_consumption_current: number | null
          energy_mix: string | null
          expires_at: string | null
          floor_area: number | null
          fuel_sources: string[]
          has_heat_pump: boolean | null
          has_solar_pv: boolean | null
          id: string
          improvement_signals: string[]
          main_fuel: string | null
          main_heating_description: string | null
          mains_gas: boolean | null
          match_confidence: number
          matched_address: string | null
          opportunity_id: string
          other_fuel_description: string | null
          planning_application_id: string
          postcode: string | null
          potential_band: string | null
          potential_efficiency: number | null
          property_type: string | null
          registration_date: string | null
          renewable_sources: string[]
          retrieved_at: string
          roof_description: string | null
          signal_summary: string | null
          solar_water_heating: boolean | null
          updated_at: string
          uprn: string | null
          walls_description: string | null
          windows_description: string | null
        }
        Insert: {
          air_conditioning?: boolean | null
          built_form?: string | null
          certificate_number: string
          certificate_scope?: string
          co2_emissions_current?: number | null
          company_id: string
          construction_age_band?: string | null
          current_band?: string | null
          current_efficiency?: number | null
          energy_consumption_current?: number | null
          energy_mix?: string | null
          expires_at?: string | null
          floor_area?: number | null
          fuel_sources?: string[]
          has_heat_pump?: boolean | null
          has_solar_pv?: boolean | null
          id?: string
          improvement_signals?: string[]
          main_fuel?: string | null
          main_heating_description?: string | null
          mains_gas?: boolean | null
          match_confidence?: number
          matched_address?: string | null
          opportunity_id: string
          other_fuel_description?: string | null
          planning_application_id: string
          postcode?: string | null
          potential_band?: string | null
          potential_efficiency?: number | null
          property_type?: string | null
          registration_date?: string | null
          renewable_sources?: string[]
          retrieved_at?: string
          roof_description?: string | null
          signal_summary?: string | null
          solar_water_heating?: boolean | null
          updated_at?: string
          uprn?: string | null
          walls_description?: string | null
          windows_description?: string | null
        }
        Update: {
          air_conditioning?: boolean | null
          built_form?: string | null
          certificate_number?: string
          certificate_scope?: string
          co2_emissions_current?: number | null
          company_id?: string
          construction_age_band?: string | null
          current_band?: string | null
          current_efficiency?: number | null
          energy_consumption_current?: number | null
          energy_mix?: string | null
          expires_at?: string | null
          floor_area?: number | null
          fuel_sources?: string[]
          has_heat_pump?: boolean | null
          has_solar_pv?: boolean | null
          id?: string
          improvement_signals?: string[]
          main_fuel?: string | null
          main_heating_description?: string | null
          mains_gas?: boolean | null
          match_confidence?: number
          matched_address?: string | null
          opportunity_id?: string
          other_fuel_description?: string | null
          planning_application_id?: string
          postcode?: string | null
          potential_band?: string | null
          potential_efficiency?: number | null
          property_type?: string | null
          registration_date?: string | null
          renewable_sources?: string[]
          retrieved_at?: string
          roof_description?: string | null
          signal_summary?: string | null
          solar_water_heating?: boolean | null
          updated_at?: string
          uprn?: string | null
          walls_description?: string | null
          windows_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epc_intelligence_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epc_intelligence_records_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epc_intelligence_records_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      event_evidence: {
        Row: {
          created_at: string
          event_id: string
          evidence_type: string
          excerpt: string | null
          id: string
          metadata: Json
          source_record_id: string
          source_url: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          evidence_type?: string
          excerpt?: string | null
          id?: string
          metadata?: Json
          source_record_id: string
          source_url?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          evidence_type?: string
          excerpt?: string | null
          id?: string
          metadata?: Json
          source_record_id?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_evidence_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          b2b_status: string
          commercial_relevance: number | null
          confidence: number
          created_at: string
          customer_eligible: boolean
          dedupe_key: string
          entity_id: string
          event_type: string
          factual_data: Json
          id: string
          is_factual: boolean
          location_id: string | null
          observed_at: string
          occurred_at: string
          source_record_id: string
        }
        Insert: {
          b2b_status?: string
          commercial_relevance?: number | null
          confidence?: number
          created_at?: string
          customer_eligible?: boolean
          dedupe_key: string
          entity_id: string
          event_type: string
          factual_data?: Json
          id?: string
          is_factual?: boolean
          location_id?: string | null
          observed_at?: string
          occurred_at: string
          source_record_id: string
        }
        Update: {
          b2b_status?: string
          commercial_relevance?: number | null
          confidence?: number
          created_at?: string
          customer_eligible?: boolean
          dedupe_key?: string
          entity_id?: string
          event_type?: string
          factual_data?: Json
          id?: string
          is_factual?: boolean
          location_id?: string | null
          observed_at?: string
          occurred_at?: string
          source_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          applications_created: number
          applications_fetched: number
          applications_unchanged: number
          applications_updated: number
          created_at: string
          cursor_from: Json | null
          cursor_to: Json | null
          error_details: Json | null
          errors_count: number
          finished_at: string | null
          id: string
          provider: string
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          applications_created?: number
          applications_fetched?: number
          applications_unchanged?: number
          applications_updated?: number
          created_at?: string
          cursor_from?: Json | null
          cursor_to?: Json | null
          error_details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          provider?: string
          run_type: string
          started_at?: string
          status?: string
        }
        Update: {
          applications_created?: number
          applications_fetched?: number
          applications_unchanged?: number
          applications_updated?: number
          created_at?: string
          cursor_from?: Json | null
          cursor_to?: Json | null
          error_details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          provider?: string
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      intelligence_ingestion_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_summary: string | null
          id: string
          metadata: Json
          opportunities_created: number
          provider_key: string
          records_accepted: number
          records_failed: number
          records_rejected: number
          records_seen: number
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          metadata?: Json
          opportunities_created?: number
          provider_key: string
          records_accepted?: number
          records_failed?: number
          records_rejected?: number
          records_seen?: number
          run_type: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_summary?: string | null
          id?: string
          metadata?: Json
          opportunities_created?: number
          provider_key?: string
          records_accepted?: number
          records_failed?: number
          records_rejected?: number
          records_seen?: number
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_ingestion_runs_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      intelligence_signal_rules: {
        Row: {
          can_qualify_existing_business: boolean
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          minimum_confidence: number
          provider_key: string | null
          rule_key: string
          signal_family: string
          signal_type: string
          updated_at: string
        }
        Insert: {
          can_qualify_existing_business?: boolean
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          minimum_confidence?: number
          provider_key?: string | null
          rule_key: string
          signal_family: string
          signal_type: string
          updated_at?: string
        }
        Update: {
          can_qualify_existing_business?: boolean
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          minimum_confidence?: number
          provider_key?: string | null
          rule_key?: string
          signal_family?: string
          signal_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_signal_rules_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      lead_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["lead_action_type"]
          company_id: string
          contract_value_gbp: number | null
          created_at: string
          created_by: string | null
          id: string
          lead_match_id: string
          note: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["lead_action_type"]
          company_id: string
          contract_value_gbp?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_match_id: string
          note?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["lead_action_type"]
          company_id?: string
          contract_value_gbp?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_match_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_actions_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "lead_actions_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_match_id: string
          note: string | null
          notified_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          lead_match_id: string
          note?: string | null
          notified_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          lead_match_id?: string
          note?: string | null
          notified_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "lead_follow_ups_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_matches: {
        Row: {
          application_trade_opportunity_id: string
          company_id: string
          created_at: string
          id: string
          matched_at: string
          notification_channel: string | null
          notified_at: string | null
          territory_claim_id: string
          viewed_at: string | null
        }
        Insert: {
          application_trade_opportunity_id: string
          company_id: string
          created_at?: string
          id?: string
          matched_at?: string
          notification_channel?: string | null
          notified_at?: string | null
          territory_claim_id: string
          viewed_at?: string | null
        }
        Update: {
          application_trade_opportunity_id?: string
          company_id?: string
          created_at?: string
          id?: string
          matched_at?: string
          notification_channel?: string | null
          notified_at?: string | null
          territory_claim_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_matches_application_trade_opportunity_id_fkey"
            columns: ["application_trade_opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_matches_territory_claim_id_fkey"
            columns: ["territory_claim_id"]
            isOneToOne: false
            referencedRelation: "territory_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_unlocks: {
        Row: {
          amount_pence: number
          application_trade_opportunity_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          lead_match_id: string | null
          market_signal_trade_match_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          amount_pence?: number
          application_trade_opportunity_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_pence?: number
          application_trade_opportunity_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_unlocks_application_trade_opportunity_id_fkey"
            columns: ["application_trade_opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_unlocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_unlocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_unlocks_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "lead_unlocks_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signal_company_states: {
        Row: {
          company_id: string
          contacted_at: string | null
          contract_value_gbp: number | null
          created_at: string
          current_action: string
          first_viewed_at: string | null
          id: string
          lost_at: string | null
          market_signal_trade_match_id: string
          note: string | null
          quoted_at: string | null
          updated_at: string
          won_at: string | null
        }
        Insert: {
          company_id: string
          contacted_at?: string | null
          contract_value_gbp?: number | null
          created_at?: string
          current_action?: string
          first_viewed_at?: string | null
          id?: string
          lost_at?: string | null
          market_signal_trade_match_id: string
          note?: string | null
          quoted_at?: string | null
          updated_at?: string
          won_at?: string | null
        }
        Update: {
          company_id?: string
          contacted_at?: string | null
          contract_value_gbp?: number | null
          created_at?: string
          current_action?: string
          first_viewed_at?: string | null
          id?: string
          lost_at?: string | null
          market_signal_trade_match_id?: string
          note?: string | null
          quoted_at?: string | null
          updated_at?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_company_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_company_states_market_signal_trade_match_id_fkey"
            columns: ["market_signal_trade_match_id"]
            isOneToOne: false
            referencedRelation: "market_signal_trade_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signal_fetch_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          processed_at: string | null
          provider: string
          request_id: number
          request_url: string
          requested_limit: number
          response_status: number | null
          since_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          provider: string
          request_id: number
          request_url: string
          requested_limit?: number
          response_status?: number | null
          since_at: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          provider?: string
          request_id?: number
          request_url?: string
          requested_limit?: number
          response_status?: number | null
          since_at?: string
          status?: string
        }
        Relationships: []
      }
      market_signal_trade_matches: {
        Row: {
          ai_confidence: number | null
          created_at: string
          estimated_trade_value_high: number | null
          estimated_trade_value_low: number | null
          fit_score: number | null
          id: string
          is_active: boolean
          match_method: string
          match_reasons: string[]
          opportunity_bucket: string | null
          recommended_action: string | null
          scored_at: string | null
          signal_id: string
          trade_category_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          estimated_trade_value_high?: number | null
          estimated_trade_value_low?: number | null
          fit_score?: number | null
          id?: string
          is_active?: boolean
          match_method?: string
          match_reasons?: string[]
          opportunity_bucket?: string | null
          recommended_action?: string | null
          scored_at?: string | null
          signal_id: string
          trade_category_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          estimated_trade_value_high?: number | null
          estimated_trade_value_low?: number | null
          fit_score?: number | null
          id?: string
          is_active?: boolean
          match_method?: string
          match_reasons?: string[]
          opportunity_bucket?: string | null
          recommended_action?: string | null
          scored_at?: string | null
          signal_id?: string
          trade_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_signal_trade_matches_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "market_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_signal_trade_matches_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signals: {
        Row: {
          buyer_identifier: string | null
          buyer_name: string | null
          contact: Json
          content_hash: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          cpv_codes: string[]
          created_at: string
          deadline_at: string | null
          delivery_postcodes: string[]
          delivery_regions: string[]
          estimated_project_value_high: number | null
          estimated_project_value_low: number | null
          external_ocid: string | null
          id: string
          is_active: boolean
          latitude: number | null
          location_confidence: string
          location_text: string | null
          longitude: number | null
          notice_type: string | null
          postcode_district: string | null
          procurement_stage: string | null
          published_at: string | null
          raw_payload: Json
          signal_type: string
          source: string
          source_signal_id: string
          source_updated_at: string | null
          source_url: string | null
          summary: string | null
          supplier_name: string | null
          title: string
          updated_at: string
          value_currency: string
        }
        Insert: {
          buyer_identifier?: string | null
          buyer_name?: string | null
          contact?: Json
          content_hash?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cpv_codes?: string[]
          created_at?: string
          deadline_at?: string | null
          delivery_postcodes?: string[]
          delivery_regions?: string[]
          estimated_project_value_high?: number | null
          estimated_project_value_low?: number | null
          external_ocid?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_confidence?: string
          location_text?: string | null
          longitude?: number | null
          notice_type?: string | null
          postcode_district?: string | null
          procurement_stage?: string | null
          published_at?: string | null
          raw_payload?: Json
          signal_type: string
          source: string
          source_signal_id: string
          source_updated_at?: string | null
          source_url?: string | null
          summary?: string | null
          supplier_name?: string | null
          title: string
          updated_at?: string
          value_currency?: string
        }
        Update: {
          buyer_identifier?: string | null
          buyer_name?: string | null
          contact?: Json
          content_hash?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          cpv_codes?: string[]
          created_at?: string
          deadline_at?: string | null
          delivery_postcodes?: string[]
          delivery_regions?: string[]
          estimated_project_value_high?: number | null
          estimated_project_value_low?: number | null
          external_ocid?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_confidence?: string
          location_text?: string | null
          longitude?: number | null
          notice_type?: string | null
          postcode_district?: string | null
          procurement_stage?: string | null
          published_at?: string | null
          raw_payload?: Json
          signal_type?: string
          source?: string
          source_signal_id?: string
          source_updated_at?: string | null
          source_url?: string | null
          summary?: string | null
          supplier_name?: string | null
          title?: string
          updated_at?: string
          value_currency?: string
        }
        Relationships: []
      }
      need_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          market_id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          market_id: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          market_id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "need_categories_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "opportunity_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          company_id: string | null
          created_at: string
          email_html: string | null
          error_message: string | null
          id: string
          lead_match_id: string | null
          metadata: Json | null
          notification_type: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email_html?: string | null
          error_message?: string | null
          id?: string
          lead_match_id?: string | null
          metadata?: Json | null
          notification_type: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email_html?: string | null
          error_message?: string | null
          id?: string
          lead_match_id?: string | null
          metadata?: Json | null
          notification_type?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "notification_log_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          approval_alerts_enabled: boolean
          channel_email: boolean
          company_id: string
          created_at: string
          digest_frequency: string
          digest_min_score: number
          id: string
          instant_alert_min_score: number
          nearby_opportunity_alerts_enabled: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_alerts_enabled?: boolean
          channel_email?: boolean
          company_id: string
          created_at?: string
          digest_frequency?: string
          digest_min_score?: number
          id?: string
          instant_alert_min_score?: number
          nearby_opportunity_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_alerts_enabled?: boolean
          channel_email?: boolean
          company_id?: string
          created_at?: string
          digest_frequency?: string
          digest_min_score?: number
          id?: string
          instant_alert_min_score?: number
          nearby_opportunity_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          b2b_eligible: boolean
          buying_window_end: string | null
          buying_window_start: string | null
          created_at: string
          customer_visible: boolean
          detected_at: string
          eligibility_reason: string | null
          entity_id: string
          id: string
          last_scored_at: string | null
          legacy_application_trade_opportunity_id: string | null
          likely_requirements: Json
          location_id: string | null
          market_id: string
          qualification_method: string | null
          score: number | null
          source_attribution: Json
          status: string
          supplier_category_id: string
          temperature: string | null
          title: string
          updated_at: string
          why_now: string | null
        }
        Insert: {
          b2b_eligible?: boolean
          buying_window_end?: string | null
          buying_window_start?: string | null
          created_at?: string
          customer_visible?: boolean
          detected_at?: string
          eligibility_reason?: string | null
          entity_id: string
          id?: string
          last_scored_at?: string | null
          legacy_application_trade_opportunity_id?: string | null
          likely_requirements?: Json
          location_id?: string | null
          market_id: string
          qualification_method?: string | null
          score?: number | null
          source_attribution?: Json
          status?: string
          supplier_category_id: string
          temperature?: string | null
          title: string
          updated_at?: string
          why_now?: string | null
        }
        Update: {
          b2b_eligible?: boolean
          buying_window_end?: string | null
          buying_window_start?: string | null
          created_at?: string
          customer_visible?: boolean
          detected_at?: string
          eligibility_reason?: string | null
          entity_id?: string
          id?: string
          last_scored_at?: string | null
          legacy_application_trade_opportunity_id?: string | null
          likely_requirements?: Json
          location_id?: string | null
          market_id?: string
          qualification_method?: string | null
          score?: number | null
          source_attribution?: Json
          status?: string
          supplier_category_id?: string
          temperature?: string | null
          title?: string
          updated_at?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_legacy_application_trade_opportunity_id_fkey"
            columns: ["legacy_application_trade_opportunity_id"]
            isOneToOne: true
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "opportunity_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_supplier_category_id_fkey"
            columns: ["supplier_category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_activity_events: {
        Row: {
          channel: string | null
          company_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          lead_match_id: string | null
          market_signal_trade_match_id: string | null
          metadata: Json
          occurred_at: string
          opportunity_id: string | null
          provider: string | null
          provider_reference: string | null
        }
        Insert: {
          channel?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          metadata?: Json
          occurred_at?: string
          opportunity_id?: string | null
          provider?: string | null
          provider_reference?: string | null
        }
        Update: {
          channel?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          metadata?: Json
          occurred_at?: string
          opportunity_id?: string | null
          provider?: string | null
          provider_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activity_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activity_events_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "opportunity_activity_events_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activity_events_market_signal_trade_match_id_fkey"
            columns: ["market_signal_trade_match_id"]
            isOneToOne: false
            referencedRelation: "market_signal_trade_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activity_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_contacts: {
        Row: {
          contact_point_id: string | null
          created_at: string
          id: string
          opportunity_id: string
          person_id: string | null
          priority: number
          reason: string | null
          unlocked: boolean
        }
        Insert: {
          contact_point_id?: string | null
          created_at?: string
          id?: string
          opportunity_id: string
          person_id?: string | null
          priority?: number
          reason?: string | null
          unlocked?: boolean
        }
        Update: {
          contact_point_id?: string | null
          created_at?: string
          id?: string
          opportunity_id?: string
          person_id?: string | null
          priority?: number
          reason?: string | null
          unlocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_contacts_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_customer_matches: {
        Row: {
          company_id: string
          created_at: string
          id: string
          legacy_lead_match_id: string | null
          match_reasons: Json
          match_score: number | null
          matched_at: string
          opportunity_id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          legacy_lead_match_id?: string | null
          match_reasons?: Json
          match_score?: number | null
          matched_at?: string
          opportunity_id: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          legacy_lead_match_id?: string | null
          match_reasons?: Json
          match_score?: number | null
          matched_at?: string
          opportunity_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_customer_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_customer_matches_legacy_lead_match_id_fkey"
            columns: ["legacy_lead_match_id"]
            isOneToOne: true
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "opportunity_customer_matches_legacy_lead_match_id_fkey"
            columns: ["legacy_lead_match_id"]
            isOneToOne: true
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_customer_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_feedback: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          opportunity_id: string
          outcome: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          opportunity_id: string
          outcome: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          opportunity_id?: string
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_feedback_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_markets: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_needs: {
        Row: {
          created_at: string
          evidence: Json
          need_category_id: string
          opportunity_id: string
          relevance: number
        }
        Insert: {
          created_at?: string
          evidence?: Json
          need_category_id: string
          opportunity_id: string
          relevance?: number
        }
        Update: {
          created_at?: string
          evidence?: Json
          need_category_id?: string
          opportunity_id?: string
          relevance?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_needs_need_category_id_fkey"
            columns: ["need_category_id"]
            isOneToOne: false
            referencedRelation: "need_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_needs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_research_reports: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          expires_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          input_hash: string | null
          model: string | null
          opportunity_id: string
          report: Json
          sources: Json
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          input_hash?: string | null
          model?: string | null
          opportunity_id: string
          report?: Json
          sources?: Json
          status: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          input_hash?: string | null
          model?: string | null
          opportunity_id?: string
          report?: Json
          sources?: Json
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_research_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_research_reports_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_score_factors: {
        Row: {
          contribution: number
          created_at: string
          factor_key: string
          id: string
          opportunity_score_id: string
          raw_value: number
          weight: number
        }
        Insert: {
          contribution: number
          created_at?: string
          factor_key: string
          id?: string
          opportunity_score_id: string
          raw_value: number
          weight: number
        }
        Update: {
          contribution?: number
          created_at?: string
          factor_key?: string
          id?: string
          opportunity_score_id?: string
          raw_value?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_score_factors_opportunity_score_id_fkey"
            columns: ["opportunity_score_id"]
            isOneToOne: false
            referencedRelation: "opportunity_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_scores: {
        Row: {
          computed_at: string
          formula_version: string
          id: string
          inputs: Json
          opportunity_id: string
          score: number
          temperature: string
        }
        Insert: {
          computed_at?: string
          formula_version: string
          id?: string
          inputs?: Json
          opportunity_id: string
          score: number
          temperature: string
        }
        Update: {
          computed_at?: string
          formula_version?: string
          id?: string
          inputs?: Json
          opportunity_id?: string
          score?: number
          temperature?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_scores_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_signals: {
        Row: {
          created_at: string
          opportunity_id: string
          relationship: string
          signal_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          relationship?: string
          signal_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          relationship?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_signals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_deliveries: {
        Row: {
          audience_type: string | null
          channel: string
          company_id: string
          content_snapshot: string | null
          cost_pence: number | null
          created_at: string
          created_by: string | null
          currency: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          lead_match_id: string | null
          market_signal_trade_match_id: string | null
          opportunity_id: string | null
          provider: string | null
          provider_job_id: string | null
          recipient_address: Json | null
          recipient_name: string | null
          sent_at: string | null
          status: string
          strategy_key: string | null
          template_key: string | null
          template_version: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          audience_type?: string | null
          channel: string
          company_id: string
          content_snapshot?: string | null
          cost_pence?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          opportunity_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          recipient_address?: Json | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          strategy_key?: string | null
          template_key?: string | null
          template_version?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          audience_type?: string | null
          channel?: string
          company_id?: string
          content_snapshot?: string | null
          cost_pence?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          opportunity_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          recipient_address?: Json | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          strategy_key?: string | null
          template_key?: string | null
          template_version?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_deliveries_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "outreach_deliveries_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_deliveries_market_signal_trade_match_id_fkey"
            columns: ["market_signal_trade_match_id"]
            isOneToOne: false
            referencedRelation: "market_signal_trade_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_deliveries_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_response_events: {
        Row: {
          company_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          opportunity_id: string
          response_link_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          opportunity_id: string
          response_link_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          opportunity_id?: string
          response_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_response_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_response_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_response_events_response_link_id_fkey"
            columns: ["response_link_id"]
            isOneToOne: false
            referencedRelation: "outreach_response_links"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_response_links: {
        Row: {
          audience_type: string
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          first_opened_at: string | null
          id: string
          last_opened_at: string | null
          market_signal_trade_match_id: string | null
          open_count: number
          opportunity_id: string | null
          outreach_delivery_id: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          audience_type: string
          channel: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          market_signal_trade_match_id?: string | null
          open_count?: number
          opportunity_id?: string | null
          outreach_delivery_id?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          market_signal_trade_match_id?: string | null
          open_count?: number
          opportunity_id?: string | null
          outreach_delivery_id?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_response_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_response_links_market_signal_trade_match_id_fkey"
            columns: ["market_signal_trade_match_id"]
            isOneToOne: false
            referencedRelation: "market_signal_trade_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_response_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_response_links_outreach_delivery_id_fkey"
            columns: ["outreach_delivery_id"]
            isOneToOne: false
            referencedRelation: "outreach_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          family_name: string | null
          full_name: string
          given_name: string | null
          id: string
          job_title: string | null
          profile_url: string | null
          resolution_confidence: number | null
          resolution_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_name?: string | null
          full_name: string
          given_name?: string | null
          id?: string
          job_title?: string | null
          profile_url?: string | null
          resolution_confidence?: number | null
          resolution_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_name?: string | null
          full_name?: string
          given_name?: string | null
          id?: string
          job_title?: string | null
          profile_url?: string | null
          resolution_confidence?: number | null
          resolution_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      planning_application_updates: {
        Row: {
          change_type: Database["public"]["Enums"]["application_update_change_type"]
          created_at: string
          detected_at: string
          diff: Json | null
          id: string
          new_status:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          planning_application_id: string
          previous_status:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          source_event_at: string | null
          triggered_notification: boolean
          triggered_rescore: boolean
        }
        Insert: {
          change_type: Database["public"]["Enums"]["application_update_change_type"]
          created_at?: string
          detected_at?: string
          diff?: Json | null
          id?: string
          new_status?:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          planning_application_id: string
          previous_status?:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          source_event_at?: string | null
          triggered_notification?: boolean
          triggered_rescore?: boolean
        }
        Update: {
          change_type?: Database["public"]["Enums"]["application_update_change_type"]
          created_at?: string
          detected_at?: string
          diff?: Json | null
          id?: string
          new_status?:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          planning_application_id?: string
          previous_status?:
            | Database["public"]["Enums"]["planning_application_status"]
            | null
          source_event_at?: string | null
          triggered_notification?: boolean
          triggered_rescore?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "planning_application_updates_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_applications: {
        Row: {
          address_text: string | null
          agent_company: string | null
          appeal_status: string | null
          applicant_name: string | null
          application_type: string | null
          content_hash: string
          created_at: string
          decision_date: string | null
          decision_due_date: string | null
          decision_outcome_raw: string | null
          dwelling_count: number | null
          estimated_value_gbp: number | null
          first_seen_at: string
          floorspace_sqm: number | null
          graph_source_record_id: string | null
          id: string
          is_commercial: boolean | null
          last_seen_at: string
          latitude: number | null
          local_planning_authority: string | null
          local_planning_authority_code: string | null
          location: unknown
          longitude: number | null
          planning_reference: string
          postcode: string | null
          postcode_district: string | null
          proposal_description: string | null
          provider: string
          provider_application_id: string
          provider_changed_at: string | null
          raw_provider_payload: Json | null
          received_date: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["planning_application_status"]
          status_raw: string | null
          updated_at: string
          validated_date: string | null
        }
        Insert: {
          address_text?: string | null
          agent_company?: string | null
          appeal_status?: string | null
          applicant_name?: string | null
          application_type?: string | null
          content_hash: string
          created_at?: string
          decision_date?: string | null
          decision_due_date?: string | null
          decision_outcome_raw?: string | null
          dwelling_count?: number | null
          estimated_value_gbp?: number | null
          first_seen_at?: string
          floorspace_sqm?: number | null
          graph_source_record_id?: string | null
          id?: string
          is_commercial?: boolean | null
          last_seen_at?: string
          latitude?: number | null
          local_planning_authority?: string | null
          local_planning_authority_code?: string | null
          location?: unknown
          longitude?: number | null
          planning_reference: string
          postcode?: string | null
          postcode_district?: string | null
          proposal_description?: string | null
          provider?: string
          provider_application_id: string
          provider_changed_at?: string | null
          raw_provider_payload?: Json | null
          received_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["planning_application_status"]
          status_raw?: string | null
          updated_at?: string
          validated_date?: string | null
        }
        Update: {
          address_text?: string | null
          agent_company?: string | null
          appeal_status?: string | null
          applicant_name?: string | null
          application_type?: string | null
          content_hash?: string
          created_at?: string
          decision_date?: string | null
          decision_due_date?: string | null
          decision_outcome_raw?: string | null
          dwelling_count?: number | null
          estimated_value_gbp?: number | null
          first_seen_at?: string
          floorspace_sqm?: number | null
          graph_source_record_id?: string | null
          id?: string
          is_commercial?: boolean | null
          last_seen_at?: string
          latitude?: number | null
          local_planning_authority?: string | null
          local_planning_authority_code?: string | null
          location?: unknown
          longitude?: number | null
          planning_reference?: string
          postcode?: string | null
          postcode_district?: string | null
          proposal_description?: string | null
          provider?: string
          provider_application_id?: string
          provider_changed_at?: string | null
          raw_provider_payload?: Json | null
          received_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["planning_application_status"]
          status_raw?: string | null
          updated_at?: string
          validated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_applications_graph_source_record_id_fkey"
            columns: ["graph_source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      postcode_districts: {
        Row: {
          centroid: unknown
          country: string | null
          created_at: string
          household_estimate: number | null
          id: string
          post_town: string | null
          postcode_area: string
          region: string | null
        }
        Insert: {
          centroid?: unknown
          country?: string | null
          created_at?: string
          household_estimate?: number | null
          id: string
          post_town?: string | null
          postcode_area: string
          region?: string | null
        }
        Update: {
          centroid?: unknown
          country?: string | null
          created_at?: string
          household_estimate?: number | null
          id?: string
          post_town?: string | null
          postcode_area?: string
          region?: string | null
        }
        Relationships: []
      }
      product_events: {
        Row: {
          company_id: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json
          route: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          route?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          route?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_intelligence_records: {
        Row: {
          avm_confidence: number | null
          bathrooms: number | null
          bedrooms: number | null
          company_id: string
          created_at: string
          estimated_value_gbp: number | null
          expires_at: string | null
          garden: boolean | null
          id: string
          last_transaction_date: string | null
          last_transaction_price_gbp: number | null
          latest_trigger_date: string | null
          latest_trigger_type: string | null
          likely_to_sell_percentile: number | null
          match_confidence: number
          match_method: string
          matched_address: string | null
          opportunity_id: string
          parking: boolean | null
          planning_application_id: string
          planning_history: Json
          postcode: string | null
          provider: string
          retrieved_at: string
          timing_reasons: Json
          timing_signal: string
          transaction_history: Json
          trigger_history: Json
          updated_at: string
          uprn: string
          value_max_gbp: number | null
          value_min_gbp: number | null
        }
        Insert: {
          avm_confidence?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          company_id: string
          created_at?: string
          estimated_value_gbp?: number | null
          expires_at?: string | null
          garden?: boolean | null
          id?: string
          last_transaction_date?: string | null
          last_transaction_price_gbp?: number | null
          latest_trigger_date?: string | null
          latest_trigger_type?: string | null
          likely_to_sell_percentile?: number | null
          match_confidence?: number
          match_method?: string
          matched_address?: string | null
          opportunity_id: string
          parking?: boolean | null
          planning_application_id: string
          planning_history?: Json
          postcode?: string | null
          provider: string
          retrieved_at?: string
          timing_reasons?: Json
          timing_signal?: string
          transaction_history?: Json
          trigger_history?: Json
          updated_at?: string
          uprn: string
          value_max_gbp?: number | null
          value_min_gbp?: number | null
        }
        Update: {
          avm_confidence?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          company_id?: string
          created_at?: string
          estimated_value_gbp?: number | null
          expires_at?: string | null
          garden?: boolean | null
          id?: string
          last_transaction_date?: string | null
          last_transaction_price_gbp?: number | null
          latest_trigger_date?: string | null
          latest_trigger_type?: string | null
          likely_to_sell_percentile?: number | null
          match_confidence?: number
          match_method?: string
          matched_address?: string | null
          opportunity_id?: string
          parking?: boolean | null
          planning_application_id?: string
          planning_history?: Json
          postcode?: string | null
          provider?: string
          retrieved_at?: string
          timing_reasons?: Json
          timing_signal?: string
          transaction_history?: Json
          trigger_history?: Json
          updated_at?: string
          uprn?: string
          value_max_gbp?: number | null
          value_min_gbp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_intelligence_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_intelligence_records_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_intelligence_records_planning_application_id_fkey"
            columns: ["planning_application_id"]
            isOneToOne: false
            referencedRelation: "planning_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_config: {
        Row: {
          adapter_key: string
          b2b_only: boolean
          config: Json
          cost_model: string | null
          created_at: string
          crm_export_allowed: boolean
          customer_display_allowed: boolean
          daily_request_limit: number | null
          display_name: string
          enabled: boolean
          environment: string
          essential: boolean
          health_status: string
          last_successful_run: string | null
          monthly_budget: number | null
          priority: number
          provider_category: string | null
          provider_key: string
          request_cost: number | null
          supports_company_enrichment: boolean
          supports_contact_enrichment: boolean
          supports_events: boolean
          supports_jobs: boolean
          supports_property: boolean
          supports_technographics: boolean
          updated_at: string
        }
        Insert: {
          adapter_key: string
          b2b_only?: boolean
          config?: Json
          cost_model?: string | null
          created_at?: string
          crm_export_allowed?: boolean
          customer_display_allowed?: boolean
          daily_request_limit?: number | null
          display_name: string
          enabled?: boolean
          environment?: string
          essential?: boolean
          health_status?: string
          last_successful_run?: string | null
          monthly_budget?: number | null
          priority?: number
          provider_category?: string | null
          provider_key: string
          request_cost?: number | null
          supports_company_enrichment?: boolean
          supports_contact_enrichment?: boolean
          supports_events?: boolean
          supports_jobs?: boolean
          supports_property?: boolean
          supports_technographics?: boolean
          updated_at?: string
        }
        Update: {
          adapter_key?: string
          b2b_only?: boolean
          config?: Json
          cost_model?: string | null
          created_at?: string
          crm_export_allowed?: boolean
          customer_display_allowed?: boolean
          daily_request_limit?: number | null
          display_name?: string
          enabled?: boolean
          environment?: string
          essential?: boolean
          health_status?: string
          last_successful_run?: string | null
          monthly_budget?: number | null
          priority?: number
          provider_category?: string | null
          provider_key?: string
          request_cost?: number | null
          supports_company_enrichment?: boolean
          supports_contact_enrichment?: boolean
          supports_events?: boolean
          supports_jobs?: boolean
          supports_property?: boolean
          supports_technographics?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      provider_data_rights: {
        Row: {
          attribution_required: boolean
          cache_allowed: boolean
          created_at: string
          crm_export_allowed: boolean
          customer_display_allowed: boolean
          customer_export_allowed: boolean
          field_key: string
          id: string
          internal_use_only: boolean
          notes: string | null
          provider_key: string
          retention_period_days: number | null
        }
        Insert: {
          attribution_required?: boolean
          cache_allowed?: boolean
          created_at?: string
          crm_export_allowed?: boolean
          customer_display_allowed?: boolean
          customer_export_allowed?: boolean
          field_key?: string
          id?: string
          internal_use_only?: boolean
          notes?: string | null
          provider_key: string
          retention_period_days?: number | null
        }
        Update: {
          attribution_required?: boolean
          cache_allowed?: boolean
          created_at?: string
          crm_export_allowed?: boolean
          customer_display_allowed?: boolean
          customer_export_allowed?: boolean
          field_key?: string
          id?: string
          internal_use_only?: boolean
          notes?: string | null
          provider_key?: string
          retention_period_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_data_rights_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      provider_usage: {
        Row: {
          credits_used: number | null
          customer_revenue_pence: number | null
          endpoint: string | null
          estimated_cost: number | null
          id: string
          ingestion_run_id: string | null
          metadata: Json
          operation: string
          provider_key: string
          records_failed: number
          records_matched: number
          requested_at: string
          succeeded: boolean
          units: number
        }
        Insert: {
          credits_used?: number | null
          customer_revenue_pence?: number | null
          endpoint?: string | null
          estimated_cost?: number | null
          id?: string
          ingestion_run_id?: string | null
          metadata?: Json
          operation: string
          provider_key: string
          records_failed?: number
          records_matched?: number
          requested_at?: string
          succeeded?: boolean
          units?: number
        }
        Update: {
          credits_used?: number | null
          customer_revenue_pence?: number | null
          endpoint?: string | null
          estimated_cost?: number | null
          id?: string
          ingestion_run_id?: string | null
          metadata?: Json
          operation?: string
          provider_key?: string
          records_failed?: number
          records_matched?: number
          requested_at?: string
          succeeded?: boolean
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_usage_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "intelligence_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_usage_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "provider_config"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      quote_requests: {
        Row: {
          audience_type: string
          company_id: string
          email: string | null
          id: string
          lead_match_id: string | null
          market_signal_trade_match_id: string | null
          message: string | null
          name: string
          opportunity_id: string | null
          phone: string | null
          preferred_contact_method: string
          response_link_id: string
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          audience_type: string
          company_id: string
          email?: string | null
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          message?: string | null
          name: string
          opportunity_id?: string | null
          phone?: string | null
          preferred_contact_method: string
          response_link_id: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          company_id?: string
          email?: string | null
          id?: string
          lead_match_id?: string | null
          market_signal_trade_match_id?: string | null
          message?: string | null
          name?: string
          opportunity_id?: string | null
          phone?: string | null
          preferred_contact_method?: string
          response_link_id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_match_current_state"
            referencedColumns: ["lead_match_id"]
          },
          {
            foreignKeyName: "quote_requests_lead_match_id_fkey"
            columns: ["lead_match_id"]
            isOneToOne: false
            referencedRelation: "lead_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_market_signal_trade_match_id_fkey"
            columns: ["market_signal_trade_match_id"]
            isOneToOne: false
            referencedRelation: "market_signal_trade_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_response_link_id_fkey"
            columns: ["response_link_id"]
            isOneToOne: false
            referencedRelation: "outreach_response_links"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          id: string
          identifier: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          scope: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          scope?: string
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          created_at: string
          factor_key: string
          formula_version: string
          id: string
          is_active: boolean
          market_id: string | null
          max_value: number
          min_value: number
          weight: number
        }
        Insert: {
          created_at?: string
          factor_key: string
          formula_version: string
          id?: string
          is_active?: boolean
          market_id?: string | null
          max_value?: number
          min_value?: number
          weight: number
        }
        Update: {
          created_at?: string
          factor_key?: string
          formula_version?: string
          id?: string
          is_active?: boolean
          market_id?: string | null
          max_value?: number
          min_value?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "opportunity_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_evidence: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rationale: string | null
          signal_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rationale?: string | null
          signal_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rationale?: string | null
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_evidence_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          b2b_status: string
          buying_window_end: string | null
          buying_window_start: string | null
          commercial_relevance: number | null
          confidence: number | null
          created_at: string
          customer_eligible: boolean
          dedupe_key: string
          entity_id: string
          first_detected_at: string
          generation_method: string
          generation_version: string
          id: string
          interpretation: Json
          last_confirmed_at: string
          location_id: string | null
          signal_family: string | null
          signal_type: string
          status: string
          updated_at: string
        }
        Insert: {
          b2b_status?: string
          buying_window_end?: string | null
          buying_window_start?: string | null
          commercial_relevance?: number | null
          confidence?: number | null
          created_at?: string
          customer_eligible?: boolean
          dedupe_key: string
          entity_id: string
          first_detected_at?: string
          generation_method?: string
          generation_version?: string
          id?: string
          interpretation?: Json
          last_confirmed_at?: string
          location_id?: string | null
          signal_family?: string | null
          signal_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          b2b_status?: string
          buying_window_end?: string | null
          buying_window_start?: string | null
          commercial_relevance?: number | null
          confidence?: number | null
          created_at?: string
          customer_eligible?: boolean
          dedupe_key?: string
          entity_id?: string
          first_detected_at?: string
          generation_method?: string
          generation_version?: string
          id?: string
          interpretation?: Json
          last_confirmed_at?: string
          location_id?: string | null
          signal_family?: string | null
          signal_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_record_links: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string | null
          event_id: string | null
          id: string
          link_type: string
          location_id: string | null
          metadata: Json
          opportunity_id: string | null
          signal_id: string | null
          source_record_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          event_id?: string | null
          id?: string
          link_type: string
          location_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          signal_id?: string | null
          source_record_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          event_id?: string | null
          id?: string
          link_type?: string
          location_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          signal_id?: string | null
          source_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_record_links_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "business_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_record_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_record_links_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_record_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_record_links_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_record_links_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      source_records: {
        Row: {
          b2b_status: string
          commercial_relevance: number | null
          content_hash: string | null
          external_id: string
          first_seen_at: string
          id: string
          include_in_customer_opportunities: boolean
          include_in_entity_resolution: boolean
          include_in_signal_generation: boolean
          ingestion_run_id: string | null
          is_consumer_record: boolean
          is_fixture: boolean
          last_seen_at: string
          payload: Json
          provider_key: string
          record_type: string
          retrieved_at: string
          rights_snapshot: Json
          source_published_at: string | null
          source_url: string | null
        }
        Insert: {
          b2b_status?: string
          commercial_relevance?: number | null
          content_hash?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          include_in_customer_opportunities?: boolean
          include_in_entity_resolution?: boolean
          include_in_signal_generation?: boolean
          ingestion_run_id?: string | null
          is_consumer_record?: boolean
          is_fixture?: boolean
          last_seen_at?: string
          payload?: Json
          provider_key: string
          record_type: string
          retrieved_at?: string
          rights_snapshot?: Json
          source_published_at?: string | null
          source_url?: string | null
        }
        Update: {
          b2b_status?: string
          commercial_relevance?: number | null
          content_hash?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          include_in_customer_opportunities?: boolean
          include_in_entity_resolution?: boolean
          include_in_signal_generation?: boolean
          ingestion_run_id?: string | null
          is_consumer_record?: boolean
          is_fixture?: boolean
          last_seen_at?: string
          payload?: Json
          provider_key?: string
          record_type?: string
          retrieved_at?: string
          rights_snapshot?: Json
          source_published_at?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_records_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "intelligence_ingestion_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          payload: Json
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          company_id: string
          coverage_plan_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          territory_claim_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id: string
          coverage_plan_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          territory_claim_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string
          coverage_plan_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          territory_claim_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_coverage_plan_id_fkey"
            columns: ["coverage_plan_id"]
            isOneToOne: false
            referencedRelation: "coverage_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_territory_claim_id_fkey"
            columns: ["territory_claim_id"]
            isOneToOne: true
            referencedRelation: "territory_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          source_trade_category_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          source_trade_category_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          source_trade_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_categories_source_trade_category_id_fkey"
            columns: ["source_trade_category_id"]
            isOneToOne: true
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_need_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          match_method: string
          match_weight: number
          need_category_id: string
          supplier_category_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_method?: string
          match_weight?: number
          need_category_id: string
          supplier_category_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          match_method?: string
          match_weight?: number
          need_category_id?: string
          supplier_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_need_mappings_need_category_id_fkey"
            columns: ["need_category_id"]
            isOneToOne: false
            referencedRelation: "need_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_need_mappings_supplier_category_id_fkey"
            columns: ["supplier_category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          monthly_price_pence: number
          postcode_district: string
          trade_category_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          monthly_price_pence: number
          postcode_district: string
          trade_category_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          monthly_price_pence?: number
          postcode_district?: string
          trade_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territories_postcode_district_fkey"
            columns: ["postcode_district"]
            isOneToOne: false
            referencedRelation: "postcode_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territories_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_claims: {
        Row: {
          activated_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          reserved_at: string
          reserved_expires_at: string | null
          status: Database["public"]["Enums"]["territory_claim_status"]
          stripe_checkout_session_id: string | null
          stripe_subscription_id: string | null
          suspended_at: string | null
          territory_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reserved_at?: string
          reserved_expires_at?: string | null
          status?: Database["public"]["Enums"]["territory_claim_status"]
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          territory_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reserved_at?: string
          reserved_expires_at?: string | null
          status?: Database["public"]["Enums"]["territory_claim_status"]
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_claims_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_market_events: {
        Row: {
          company_id: string
          event_type: string
          id: string
          occurred_at: string
          postcode_district: string
          source_claim_id: string
          territory_id: string
          trade_category_id: string
        }
        Insert: {
          company_id: string
          event_type: string
          id?: string
          occurred_at?: string
          postcode_district: string
          source_claim_id: string
          territory_id: string
          trade_category_id: string
        }
        Update: {
          company_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          postcode_district?: string
          source_claim_id?: string
          territory_id?: string
          trade_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_market_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_market_events_source_claim_id_fkey"
            columns: ["source_claim_id"]
            isOneToOne: false
            referencedRelation: "territory_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_market_events_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_market_events_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_waitlist: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notified_at: string | null
          postcode_district: string
          trade_category_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          postcode_district: string
          trade_category_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          postcode_district?: string
          trade_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_waitlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_trade_category_id_fkey"
            columns: ["trade_category_id"]
            isOneToOne: false
            referencedRelation: "trade_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_categories: {
        Row: {
          ai_detection_hints: Json | null
          created_at: string
          default_monthly_price_pence: number
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          ai_detection_hints?: Json | null
          created_at?: string
          default_monthly_price_pence: number
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          ai_detection_hints?: Json | null
          created_at?: string
          default_monthly_price_pence?: number
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      lead_match_current_state: {
        Row: {
          application_trade_opportunity_id: string | null
          company_id: string | null
          current_action: Database["public"]["Enums"]["lead_action_type"] | null
          current_action_at: string | null
          current_contract_value_gbp: number | null
          lead_match_id: string | null
          matched_at: string | null
          viewed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_matches_application_trade_opportunity_id_fkey"
            columns: ["application_trade_opportunity_id"]
            isOneToOne: false
            referencedRelation: "application_trade_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_company_invite: {
        Args: { p_company_id: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_email: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "company_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      auth_company_ids: { Args: never; Returns: string[] }
      browse_b2b_preview_feed: {
        Args: {
          p_limit?: number
          p_postcode_district: string
          p_profile?: Json
        }
        Returns: {
          access_level: string
          buyer_name: string
          deadline_at: string
          estimated_project_value_high: number
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          headline: string
          opportunity_bucket: string
          profile_match: number
          published_at: string
          recommended_action: string
          score: number
          source_kind: string
          source_record_id: string
          source_url: string
          stage: string
          summary: string
        }[]
      }
      browse_data_coverage: {
        Args: never
        Returns: {
          application_count: number
          authority_code: string
          authority_name: string
          district_count: number
          first_received_date: string
          latest_received_date: string
          latest_seen_at: string
          provider: string
        }[]
      }
      browse_data_coverage_snapshot: {
        Args: never
        Returns: {
          application_count: number
          authority_count: number
          district_count: number
          latest_created: number
          latest_errors: number
          latest_fetched: number
          latest_ingest_at: string
          latest_ingest_status: string
          latest_updated: number
          provider: string
        }[]
      }
      browse_intelligence_feed_coverage: {
        Args: never
        Returns: {
          award_count: number
          commercial_count: number
          latest_record_at: string
          pipeline_count: number
          record_count: number
          source_key: string
          source_kind: string
          source_label: string
          tender_count: number
        }[]
      }
      browse_market_signal_map: {
        Args: { p_limit?: number; p_trade_slug?: string }
        Returns: {
          access_level: string
          buyer_name: string
          deadline_at: string
          delivery_postcode: string
          delivery_regions: string[]
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          fit_score: number
          latitude: number
          location_label: string
          location_scope: string
          longitude: number
          market_signal_trade_match_id: string
          opportunity_bucket: string
          postcode_district: string
          signal_type: string
          source_url: string
          title: string
          trade_category_id: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_nearby_opportunities: {
        Args: { p_limit?: number }
        Returns: {
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          monthly_price_pence: number
          opportunity_count: number
          post_town: string
          postcode_district: string
          teaser_estimated_trade_value_high: number
          teaser_estimated_trade_value_low: number
          teaser_project_type: string
          teaser_status: string
          territory_status: string
          trade_category_name: string
          trade_category_slug: string
        }[]
      }
      browse_nearby_opportunities_for_company: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          monthly_price_pence: number
          opportunity_count: number
          post_town: string
          postcode_district: string
          teaser_estimated_trade_value_high: number
          teaser_estimated_trade_value_low: number
          teaser_project_type: string
          teaser_status: string
          territory_status: string
          trade_category_name: string
          trade_category_slug: string
        }[]
      }
      browse_opportunity_map: {
        Args: { p_limit?: number; p_trade_slug?: string }
        Returns: {
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          latitude: number
          longitude: number
          monthly_price_pence: number
          opportunity_count: number
          post_town: string
          postcode_district: string
          teaser_estimated_trade_value_high: number
          teaser_estimated_trade_value_low: number
          teaser_project_type: string
          teaser_status: string
          territory_status: string
          trade_category_id: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_opportunity_map_v2: {
        Args: { p_limit?: number; p_trade_slug?: string }
        Returns: {
          commercial_estimated_trade_value_high: number
          commercial_estimated_trade_value_low: number
          commercial_opportunity_count: number
          commercial_teaser_estimated_trade_value_high: number
          commercial_teaser_estimated_trade_value_low: number
          commercial_teaser_project_type: string
          commercial_teaser_status: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          latitude: number
          longitude: number
          monthly_price_pence: number
          opportunity_count: number
          post_town: string
          postcode_district: string
          teaser_estimated_trade_value_high: number
          teaser_estimated_trade_value_low: number
          teaser_project_type: string
          teaser_status: string
          territory_status: string
          trade_category_id: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_opportunity_teaser: {
        Args: { p_opportunity_id: string }
        Returns: {
          estimated_total_project_value_high: number
          estimated_total_project_value_low: number
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          id: string
          monthly_price_pence: number
          opportunity_bucket: Database["public"]["Enums"]["opportunity_bucket"]
          opportunity_score: number
          planning_status: Database["public"]["Enums"]["planning_application_status"]
          postcode_district: string
          project_type: string
          received_date: string
          territory_status: string
          trade_category_id: string
          trade_category_name: string
          trade_category_slug: string
        }[]
      }
      browse_owned_market_signals: {
        Args: { p_limit?: number }
        Returns: {
          buyer_name: string
          current_action: string
          deadline_at: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          fit_score: number
          market_signal_trade_match_id: string
          opportunity_bucket: string
          postcode_district: string
          procurement_stage: string
          published_at: string
          recommended_action: string
          signal_type: string
          source_url: string
          title: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_owned_market_signals_v2: {
        Args: { p_limit?: number }
        Returns: {
          buyer_name: string
          current_action: string
          deadline_at: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          fit_score: number
          location_label: string
          location_scope: string
          market_signal_trade_match_id: string
          opportunity_bucket: string
          postcode_district: string
          procurement_stage: string
          published_at: string
          recommended_action: string
          signal_type: string
          source_url: string
          title: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_recent_territory_market_events: {
        Args: { p_limit?: number }
        Returns: {
          event_id: string
          event_type: string
          occurred_at: string
          postcode_district: string
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_territory_teaser: {
        Args: { p_postcode_district: string; p_trade_slug: string }
        Returns: {
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          planning_status: Database["public"]["Enums"]["planning_application_status"]
          project_type: string
        }[]
      }
      browse_territory_trade_intelligence: {
        Args: { p_postcode_district: string; p_trade_slug: string }
        Returns: {
          commercial_development_count: number
          contract_award_count: number
          estimated_trade_value_gbp: number
          owns_territory: boolean
          planning_count: number
          postcode_district: string
          public_pipeline_count: number
          tender_count: number
          total_opportunity_count: number
          trade_name: string
          trade_slug: string
        }[]
      }
      browse_territory_trade_signal_feed: {
        Args: {
          p_limit?: number
          p_postcode_district: string
          p_trade_slug: string
        }
        Returns: {
          access_level: string
          buyer_name: string
          deadline_at: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          headline: string
          opportunity_bucket: string
          published_at: string
          recommended_action: string
          score: number
          source_kind: string
          source_record_id: string
          source_url: string
          stage: string
          summary: string
        }[]
      }
      cancel_lead_follow_up: {
        Args: { p_follow_up_id: string }
        Returns: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_match_id: string
          note: string | null
          notified_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lead_follow_ups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_coverage_plan: {
        Args: { p_coverage_plan_id: string; p_postcode_districts: string[] }
        Returns: {
          coverage_plan_id: string
          monthly_price_pence: number
          postcode_count: number
        }[]
      }
      check_territory_availability: {
        Args: { p_postcode_district: string; p_trade_slug: string }
        Returns: {
          applications_last_30d: number
          estimated_construction_activity_gbp: number
          estimated_trade_value_gbp: number
          high_priority_count: number
          monthly_price_pence: number
          territory_status: string
        }[]
      }
      claim_classification_batch: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          id: string
          planning_application_id: string
          previous_status: Database["public"]["Enums"]["classification_status"]
        }[]
      }
      company_has_market_signal_access: {
        Args: { p_company_id: string; p_match_id: string }
        Returns: boolean
      }
      complete_contact_enrichment_lookup: {
        Args: { p_error_code?: string; p_lookup_id: string; p_status: string }
        Returns: undefined
      }
      complete_lead_follow_up: {
        Args: { p_follow_up_id: string }
        Returns: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_match_id: string
          note: string | null
          notified_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lead_follow_ups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_outreach_generation: {
        Args: {
          p_error_code?: string
          p_estimated_cost_usd?: number
          p_generation_id: string
          p_input_tokens?: number
          p_model?: string
          p_output_tokens?: number
          p_status: string
        }
        Returns: undefined
      }
      compute_opportunity_score: {
        Args: {
          p_ai_confidence: number
          p_decision_date: string
          p_fit_score: number
          p_project_size: Database["public"]["Enums"]["project_size_category"]
          p_received_date: string
          p_status: Database["public"]["Enums"]["planning_application_status"]
          p_trade_value_high: number
        }
        Returns: {
          bucket: Database["public"]["Enums"]["opportunity_bucket"]
          score: number
        }[]
      }
      coverage_plan_price: {
        Args: {
          p_billing_mode?: Database["public"]["Enums"]["coverage_billing_mode"]
          p_discount_percent?: number
          p_postcode_count: number
        }
        Returns: number
      }
      coverage_unit_price: { Args: { p_position: number }; Returns: number }
      create_company_and_claim_ownership: {
        Args: { p_billing_email: string; p_trading_name: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string
          city: string | null
          companies_house_number: string | null
          created_at: string
          deleted_at: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postcode: string | null
          stripe_customer_id: string | null
          trading_name: string
          updated_at: string
          verified: boolean
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_lead_follow_up: {
        Args: { p_due_at: string; p_lead_match_id: string; p_note?: string }
        Returns: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_match_id: string
          note: string | null
          notified_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lead_follow_ups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_market_signal_fetches: {
        Args: { p_limit?: number; p_since?: string }
        Returns: number
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_stale_territory_reservations: { Args: never; Returns: undefined }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_conversion_learning_benchmarks: {
        Args: { p_min_platform_sample?: number }
        Returns: {
          audience_type: string
          channel: string
          opened_count: number
          quote_count: number
          quote_rate: number
          response_count: number
          response_rate: number
          sample_size: number
          scope: string
          source_type: string
          trade_name: string
          win_rate: number
          won_count: number
          won_value_gbp: number
        }[]
      }
      get_outreach_generation_status: {
        Args: { p_opportunity_id: string }
        Returns: {
          daily_remaining: number
          daily_used: number
          monthly_remaining: number
          monthly_used: number
          remaining_generations: number
          used_generations: number
        }[]
      }
      get_owned_market_signal: {
        Args: { p_match_id: string }
        Returns: {
          buyer_identifier: string
          buyer_name: string
          contact: Json
          contract_end_date: string
          contract_start_date: string
          cpv_codes: string[]
          current_action: string
          deadline_at: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          external_ocid: string
          fit_score: number
          location_text: string
          market_signal_trade_match_id: string
          match_reasons: string[]
          notice_type: string
          opportunity_bucket: string
          postcode_district: string
          procurement_stage: string
          project_value_high: number
          project_value_low: number
          published_at: string
          recommended_action: string
          signal_id: string
          signal_type: string
          source: string
          source_url: string
          summary: string
          supplier_name: string
          title: string
          trade_name: string
          trade_slug: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_lead_match: {
        Args: { target_application_id: string }
        Returns: boolean
      }
      has_active_lead_match_for_opportunity: {
        Args: { target_opportunity_id: string }
        Returns: boolean
      }
      invite_company_member: {
        Args: {
          p_company_id: string
          p_invited_email: string
          p_role?: Database["public"]["Enums"]["company_member_role"]
        }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_email: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "company_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_company_admin: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      list_lead_follow_ups: {
        Args: { p_lead_match_id: string }
        Returns: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_match_id: string
          note: string | null
          notified_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "lead_follow_ups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      market_signal_is_current: {
        Args: { p_deadline: string; p_published: string; p_type: string }
        Returns: boolean
      }
      normalise_market_signal_region: {
        Args: { p_region: string }
        Returns: string
      }
      opt_out_quote_link: {
        Args: { p_reason?: string; p_token_hash: string }
        Returns: {
          already_opted_out: boolean
          company_id: string
          opportunity_id: string
          response_link_id: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      prune_rate_limit_events: { Args: never; Returns: undefined }
      queue_public_market_signal_fetch: {
        Args: { p_url: string }
        Returns: number
      }
      read_public_market_signal_fetch: {
        Args: { p_request_id: number }
        Returns: {
          content: string
          error_msg: string
          status_code: number
          timed_out: boolean
        }[]
      }
      remove_company_member: {
        Args: { p_membership_id: string }
        Returns: undefined
      }
      replace_customer_profile_terms: {
        Args: { p_company_id: string; p_terms: Json }
        Returns: undefined
      }
      rescore_stale_opportunities: { Args: never; Returns: undefined }
      reserve_contact_enrichment_lookup: {
        Args: { p_planning_application_id: string }
        Returns: {
          allowed: boolean
          company_id: string
          lookup_id: string
          reason: string
          remaining: number
        }[]
      }
      reserve_coverage_plan: {
        Args: {
          p_billing_mode?: Database["public"]["Enums"]["coverage_billing_mode"]
          p_coverage_area_id?: string
          p_postcode_districts: string[]
          p_trade_category_id: string
        }
        Returns: {
          coverage_plan_id: string
          first_territory_claim_id: string
          monthly_price_pence: number
          postcode_count: number
        }[]
      }
      reserve_outreach_generation: {
        Args: { p_opportunity_id: string }
        Returns: {
          allowed: boolean
          generation_count: number
          generation_id: string
          reason: string
          remaining_generations: number
        }[]
      }
      reserve_territory: {
        Args: { p_postcode_district: string; p_trade_category_id: string }
        Returns: {
          activated_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          reserved_at: string
          reserved_expires_at: string | null
          status: Database["public"]["Enums"]["territory_claim_status"]
          stripe_checkout_session_id: string | null
          stripe_subscription_id: string | null
          suspended_at: string | null
          territory_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "territory_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      score_opportunity_factors: {
        Args: {
          p_factors: Json
          p_formula_version?: string
          p_market_id: string
        }
        Returns: {
          formula_version: string
          score: number
          temperature: string
        }[]
      }
      search_assistant_knowledge: {
        Args: {
          p_match_count?: number
          p_query: string
          p_query_embedding?: string
        }
        Returns: {
          category: string
          content: string
          document_slug: string
          document_title: string
          heading: string
          relevance: number
        }[]
      }
      search_market_trade_signals: {
        Args: {
          p_limit?: number
          p_location: string
          p_signal_type?: string
          p_trade_slug?: string
        }
        Returns: {
          access_level: string
          buyer_name: string
          deadline_at: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          fit_score: number
          market_signal_trade_match_id: string
          post_town: string
          postcode_district: string
          procurement_stage: string
          recommended_action: string
          signal_type: string
          source_url: string
          title: string
          total_matches: number
          trade_name: string
          trade_slug: string
        }[]
      }
      search_opportunity_teasers: {
        Args: {
          p_limit?: number
          p_location: string
          p_status?: string
          p_trade_slug?: string
        }
        Returns: {
          access_level: string
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          monthly_price_pence: number
          opportunity_bucket: string
          opportunity_id: string
          opportunity_score: number
          planning_status: string
          post_town: string
          postcode_district: string
          project_type: string
          recommended_action: string
          summary: string
          territory_status: string
          total_matches: number
          trade_name: string
          trade_slug: string
        }[]
      }
      set_market_signal_action: {
        Args: {
          p_action: string
          p_contract_value_gbp?: number
          p_match_id: string
          p_note?: string
        }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      submit_quote_link_response: {
        Args: {
          p_email: string
          p_message: string
          p_name: string
          p_permission_text: string
          p_permission_text_version: string
          p_phone: string
          p_preferred_contact_method: string
          p_token_hash: string
        }
        Returns: {
          already_submitted: boolean
          audience_type: string
          company_id: string
          lead_match_id: string
          opportunity_id: string
          quote_request_id: string
        }[]
      }
      sync_application_trade_opportunity_to_graph: {
        Args: { p_legacy_opportunity_id: string }
        Returns: string
      }
      sync_legacy_lead_match_to_graph: {
        Args: { p_lead_match_id: string }
        Returns: undefined
      }
      sync_planning_application_to_graph: {
        Args: { p_planning_application_id: string }
        Returns: string
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_company_notification_preferences: {
        Args: {
          p_approval_alerts_enabled: boolean
          p_channel_email: boolean
          p_company_id: string
          p_digest_frequency: string
          p_digest_min_score: number
          p_instant_alert_min_score: number
          p_nearby_opportunity_alerts_enabled: boolean
        }
        Returns: {
          approval_alerts_enabled: boolean
          channel_email: boolean
          company_id: string
          created_at: string
          digest_frequency: string
          digest_min_score: number
          id: string
          instant_alert_min_score: number
          nearby_opportunity_alerts_enabled: boolean
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_planning_application: {
        Args: { p_application: Json }
        Returns: {
          id: string
          is_changed: boolean
          is_new: boolean
        }[]
      }
    }
    Enums: {
      application_update_change_type:
        | "status_change"
        | "decision_recorded"
        | "date_updated"
        | "description_updated"
        | "other"
      classification_status:
        | "pending"
        | "completed"
        | "failed"
        | "stale"
        | "processing"
      company_member_role: "owner" | "admin" | "member"
      company_member_status: "invited" | "active" | "removed"
      coverage_billing_mode: "custom" | "county"
      coverage_plan_item_status:
        | "active"
        | "pending_add"
        | "pending_remove"
        | "removed"
        | "expired"
      coverage_plan_status:
        | "reserved"
        | "active"
        | "pending_change"
        | "suspended"
        | "cancelled"
        | "expired"
      lead_action_type:
        | "viewed"
        | "saved"
        | "contacted"
        | "quoted"
        | "won"
        | "lost"
      opportunity_bucket: "hot" | "strong" | "possible" | "low"
      planning_application_status:
        | "submitted"
        | "validated"
        | "under_consideration"
        | "decision_expected"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "appeal_lodged"
        | "unknown"
      project_size_category: "small" | "medium" | "large" | "major"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
      territory_claim_status:
        | "reserved"
        | "active"
        | "suspended"
        | "expired"
        | "cancelled"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_update_change_type: [
        "status_change",
        "decision_recorded",
        "date_updated",
        "description_updated",
        "other",
      ],
      classification_status: [
        "pending",
        "completed",
        "failed",
        "stale",
        "processing",
      ],
      company_member_role: ["owner", "admin", "member"],
      company_member_status: ["invited", "active", "removed"],
      coverage_billing_mode: ["custom", "county"],
      coverage_plan_item_status: [
        "active",
        "pending_add",
        "pending_remove",
        "removed",
        "expired",
      ],
      coverage_plan_status: [
        "reserved",
        "active",
        "pending_change",
        "suspended",
        "cancelled",
        "expired",
      ],
      lead_action_type: [
        "viewed",
        "saved",
        "contacted",
        "quoted",
        "won",
        "lost",
      ],
      opportunity_bucket: ["hot", "strong", "possible", "low"],
      planning_application_status: [
        "submitted",
        "validated",
        "under_consideration",
        "decision_expected",
        "approved",
        "rejected",
        "withdrawn",
        "appeal_lodged",
        "unknown",
      ],
      project_size_category: ["small", "medium", "large", "major"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
      ],
      territory_claim_status: [
        "reserved",
        "active",
        "suspended",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
