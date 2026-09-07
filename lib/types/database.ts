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
      notification_log: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_match_id: string | null
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
          error_message?: string | null
          id?: string
          lead_match_id?: string | null
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
          error_message?: string | null
          id?: string
          lead_match_id?: string | null
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
        Relationships: []
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
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          territory_claim_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          territory_claim_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          territory_claim_id?: string
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
            foreignKeyName: "subscriptions_territory_claim_id_fkey"
            columns: ["territory_claim_id"]
            isOneToOne: true
            referencedRelation: "territory_claims"
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
      browse_territory_opportunities: {
        Args: {
          p_limit?: number
          p_postcode_district: string
          p_trade_category_id: string
        }
        Returns: {
          estimated_total_project_value_high: number
          estimated_total_project_value_low: number
          estimated_trade_value_high: number
          estimated_trade_value_low: number
          id: string
          opportunity_bucket: Database["public"]["Enums"]["opportunity_bucket"]
          opportunity_score: number
          planning_status: Database["public"]["Enums"]["planning_application_status"]
          postcode_district: string
          project_type: string
          received_date: string
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
      longtransactionsenabled: { Args: never; Returns: boolean }
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
      remove_company_member: {
        Args: { p_membership_id: string }
        Returns: undefined
      }
      rescore_stale_opportunities: { Args: never; Returns: undefined }
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
    }
    Enums: {
      application_update_change_type:
        | "status_change"
        | "decision_recorded"
        | "date_updated"
        | "description_updated"
        | "other"
      classification_status: "pending" | "completed" | "failed" | "stale"
      company_member_role: "owner" | "admin" | "member"
      company_member_status: "invited" | "active" | "removed"
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
      classification_status: ["pending", "completed", "failed", "stale"],
      company_member_role: ["owner", "admin", "member"],
      company_member_status: ["invited", "active", "removed"],
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
