Warning: truncated output (original token count: 66757)
Total output lines: 8435

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
          trial_started_at: string | null
          trial_ends_at: string | null
          trial_lead_unlock_limit: number
          trial_lead_unlocks_used: number
          trial_lead_unlocks_used_at: string | null
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
          trial_started_at?: string | null
          trial_ends_at?: string | null
          trial_lead_unlock_limit?: number
          trial_lead_unlocks_used?: number
          trial_lead_unlocks_used_at?: string | null
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
          trial_started_at?: string | null
          trial_ends_at?: string | null
          trial_lead_unlock_limit?: number
          trial_lead_unlocks_used?: number
          trial_lead_unlocks_used_at?: string | null
          trading_name?: string
         …46757 tokens truncated…ity_id: string }
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
      refresh_opportunity_customer_matches: {
        Args: { p_opportunity_id: string }
        Returns: number
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
      sync_market_signal_to_graph: {
        Args: { p_market_signal_id: string }
        Returns: string
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
