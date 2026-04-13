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
      absorption_schedules: {
        Row: {
          created_at: string
          id: string
          org_id: string
          period_date: string
          price_per_unit_assumption: number
          sale_product_id: string
          units_sold_assumption: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          period_date: string
          price_per_unit_assumption: number
          sale_product_id: string
          units_sold_assumption?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          period_date?: string
          price_per_unit_assumption?: number
          sale_product_id?: string
          units_sold_assumption?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absorption_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absorption_schedules_sale_product_id_fkey"
            columns: ["sale_product_id"]
            isOneToOne: false
            referencedRelation: "sale_products"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          emitted_at: string
          event_type: string
          id: string
          job_id: string
          payload: Json | null
          sequence_number: number
        }
        Insert: {
          emitted_at?: string
          event_type: string
          id?: string
          job_id: string
          payload?: Json | null
          sequence_number: number
        }
        Update: {
          emitted_at?: string
          event_type?: string
          id?: string
          job_id?: string
          payload?: Json | null
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          advisor_invocation_count: number | null
          advisor_model: string
          advisor_tokens_used: number | null
          analysis_depth: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          credit_cost: number | null
          credits_deducted_at: string | null
          deal_id: string | null
          error_message: string | null
          executor_model: string
          executor_tokens_used: number | null
          failed_at: string | null
          id: string
          job_type: string
          org_id: string
          started_at: string | null
          status: string
          trigger_dev_job_id: string | null
        }
        Insert: {
          advisor_invocation_count?: number | null
          advisor_model: string
          advisor_tokens_used?: number | null
          analysis_depth?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          credit_cost?: number | null
          credits_deducted_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          executor_model: string
          executor_tokens_used?: number | null
          failed_at?: string | null
          id?: string
          job_type?: string
          org_id: string
          started_at?: string | null
          status?: string
          trigger_dev_job_id?: string | null
        }
        Update: {
          advisor_invocation_count?: number | null
          advisor_model?: string
          advisor_tokens_used?: number | null
          analysis_depth?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credit_cost?: number | null
          credits_deducted_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          executor_model?: string
          executor_tokens_used?: number | null
          failed_at?: string | null
          id?: string
          job_type?: string
          org_id?: string
          started_at?: string | null
          status?: string
          trigger_dev_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          building_name: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string
          deal_id: string
          id: string
          latitude: number | null
          longitude: number | null
          num_floors: number | null
          org_id: string
          parking_spaces: number | null
          postal_code: string | null
          state_province: string | null
          street_address: string | null
          total_gsf: number | null
          total_rsf: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          building_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by: string
          deal_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          num_floors?: number | null
          org_id: string
          parking_spaces?: number | null
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          total_gsf?: number | null
          total_rsf?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          building_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          deal_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          num_floors?: number | null
          org_id?: string
          parking_spaces?: number | null
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          total_gsf?: number | null
          total_rsf?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_spend_lines: {
        Row: {
          actual_costs_to_date: number | null
          budget_amount: number
          capex_category: string
          created_at: string
          deal_id: string
          description: string | null
          id: string
          org_id: string
          sort_order: number
          spend_schedule: Json | null
          updated_at: string
        }
        Insert: {
          actual_costs_to_date?: number | null
          budget_amount: number
          capex_category: string
          created_at?: string
          deal_id: string
          description?: string | null
          id?: string
          org_id: string
          sort_order?: number
          spend_schedule?: Json | null
          updated_at?: string
        }
        Update: {
          actual_costs_to_date?: number | null
          budget_amount?: number
          capex_category?: string
          created_at?: string
          deal_id?: string
          description?: string | null
          id?: string
          org_id?: string
          sort_order?: number
          spend_schedule?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capex_spend_lines_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_spend_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_sources: {
        Row: {
          capital_type: Database["public"]["Enums"]["capital_type_enum"]
          committed_amount: number | null
          created_at: string
          created_by: string
          deal_id: string
          effective_date: string | null
          exit_date: string | null
          funded_amount: number | null
          id: string
          is_recourse: boolean
          lender_investor_name: string | null
          org_id: string
          position: number
          source_name: string
          updated_at: string
        }
        Insert: {
          capital_type: Database["public"]["Enums"]["capital_type_enum"]
          committed_amount?: number | null
          created_at?: string
          created_by: string
          deal_id: string
          effective_date?: string | null
          exit_date?: string | null
          funded_amount?: number | null
          id?: string
          is_recourse?: boolean
          lender_investor_name?: string | null
          org_id: string
          position?: number
          source_name: string
          updated_at?: string
        }
        Update: {
          capital_type?: Database["public"]["Enums"]["capital_type_enum"]
          committed_amount?: number | null
          created_at?: string
          created_by?: string
          deal_id?: string
          effective_date?: string | null
          exit_date?: string | null
          funded_amount?: number | null
          id?: string
          is_recourse?: boolean
          lender_investor_name?: string | null
          org_id?: string
          position?: number
          source_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_sources_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      carry_costs: {
        Row: {
          carry_cost_calculated: Json | null
          carry_cost_override: number | null
          carry_cost_override_at: string | null
          carry_cost_override_by: string | null
          carry_cost_override_note: string | null
          created_at: string
          deal_id: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          carry_cost_calculated?: Json | null
          carry_cost_override?: number | null
          carry_cost_override_at?: string | null
          carry_cost_override_by?: string | null
          carry_cost_override_note?: string | null
          created_at?: string
          deal_id: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          carry_cost_calculated?: Json | null
          carry_cost_override?: number | null
          carry_cost_override_at?: string | null
          carry_cost_override_by?: string | null
          carry_cost_override_note?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carry_costs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carry_costs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_refs: {
        Row: {
          conversation_session_id: string
          created_at: string
          id: string
          message_excerpt: string | null
          message_index: number
          source_quality: string
        }
        Insert: {
          conversation_session_id: string
          created_at?: string
          id?: string
          message_excerpt?: string | null
          message_index: number
          source_quality?: string
        }
        Update: {
          conversation_session_id?: string
          created_at?: string
          id?: string
          message_excerpt?: string | null
          message_index?: number
          source_quality?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_refs_conversation_session_id_fkey"
            columns: ["conversation_session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          created_by: string
          deal_id: string | null
          id: string
          last_active_at: string
          metadata: Json | null
          org_id: string
          started_at: string
          status: string
        }
        Insert: {
          created_by: string
          deal_id?: string | null
          id?: string
          last_active_at?: string
          metadata?: Json | null
          org_id: string
          started_at?: string
          status?: string
        }
        Update: {
          created_by?: string
          deal_id?: string | null
          id?: string
          last_active_at?: string
          metadata?: Json | null
          org_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          analysis_job_id: string | null
          balance_after: number
          created_at: string
          deal_id: string | null
          description: string
          entry_type: string
          id: string
          idempotency_key: string | null
          org_id: string
        }
        Insert: {
          amount: number
          analysis_job_id?: string | null
          balance_after: number
          created_at?: string
          deal_id?: string | null
          description: string
          entry_type: string
          id?: string
          idempotency_key?: string | null
          org_id: string
        }
        Update: {
          amount?: number
          analysis_job_id?: string | null
          balance_after?: number
          created_at?: string
          deal_id?: string | null
          description?: string
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activity_log: {
        Row: {
          actor_id: string | null
          created_at: string
          deal_id: string
          entity_id: string | null
          entity_type: string | null
          event_type: Database["public"]["Enums"]["deal_activity_event_type_enum"]
          id: string
          metadata: Json | null
          org_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          deal_id: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: Database["public"]["Enums"]["deal_activity_event_type_enum"]
          id?: string
          metadata?: Json | null
          org_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          deal_id?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: Database["public"]["Enums"]["deal_activity_event_type_enum"]
          id?: string
          metadata?: Json | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activity_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deal_id: string
          deleted_at: string | null
          edited_at: string | null
          entity_id: string | null
          entity_type: string | null
          field_name: string | null
          id: string
          mentions: string[]
          org_id: string
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deal_id: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          mentions?: string[]
          org_id: string
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deal_id?: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          mentions?: string[]
          org_id?: string
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "deal_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          deal_id: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["deal_member_role_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          deal_id: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["deal_member_role_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["deal_member_role_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_members_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_model_compositions: {
        Row: {
          analysis_job_id: string
          composition_status: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          deal_id: string
          id: string
          modules_selected: Json
          override_notes: string | null
        }
        Insert: {
          analysis_job_id: string
          composition_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deal_id: string
          id?: string
          modules_selected?: Json
          override_notes?: string | null
        }
        Update: {
          analysis_job_id?: string
          composition_status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          modules_selected?: Json
          override_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_model_compositions_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_model_compositions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_revenue_allocations: {
        Row: {
          allocation_pct: number
          created_at: string
          deal_id: string
          display_order: number
          id: string
          label: string | null
          notes: string | null
          revenue_mechanism: string
        }
        Insert: {
          allocation_pct: number
          created_at?: string
          deal_id: string
          display_order?: number
          id?: string
          label?: string | null
          notes?: string | null
          revenue_mechanism: string
        }
        Update: {
          allocation_pct?: number
          created_at?: string
          deal_id?: string
          display_order?: number
          id?: string
          label?: string | null
          notes?: string | null
          revenue_mechanism?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_revenue_allocations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          asset_class: string
          city: string | null
          country: string
          created_at: string
          created_by: string
          id: string
          latitude: number | null
          longitude: number | null
          market: string | null
          name: string
          operator_managed: boolean
          org_id: string
          ownership_structure: string | null
          parent_deal_id: string | null
          postal_code: string | null
          primary_revenue_mechanism: string
          rsf: number | null
          state_province: string | null
          status: string
          street_address: string | null
          updated_at: string
        }
        Insert: {
          asset_class: string
          city?: string | null
          country?: string
          created_at?: string
          created_by: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          market?: string | null
          name: string
          operator_managed?: boolean
          org_id: string
          ownership_structure?: string | null
          parent_deal_id?: string | null
          postal_code?: string | null
          primary_revenue_mechanism: string
          rsf?: number | null
          state_province?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          asset_class?: string
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          market?: string | null
          name?: string
          operator_managed?: boolean
          org_id?: string
          ownership_structure?: string | null
          parent_deal_id?: string | null
          postal_code?: string | null
          primary_revenue_mechanism?: string
          rsf?: number | null
          state_province?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_covenants: {
        Row: {
          capital_source_id: string
          covenant_type: Database["public"]["Enums"]["covenant_type_enum"]
          created_at: string
          description: string | null
          grace_period_days: number | null
          id: string
          org_id: string
          test_frequency: Database["public"]["Enums"]["covenant_test_frequency_enum"]
          threshold_value: number
          updated_at: string
        }
        Insert: {
          capital_source_id: string
          covenant_type: Database["public"]["Enums"]["covenant_type_enum"]
          created_at?: string
          description?: string | null
          grace_period_days?: number | null
          id?: string
          org_id: string
          test_frequency?: Database["public"]["Enums"]["covenant_test_frequency_enum"]
          threshold_value: number
          updated_at?: string
        }
        Update: {
          capital_source_id?: string
          covenant_type?: Database["public"]["Enums"]["covenant_type_enum"]
          created_at?: string
          description?: string | null
          grace_period_days?: number | null
          id?: string
          org_id?: string
          test_frequency?: Database["public"]["Enums"]["covenant_test_frequency_enum"]
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_covenants_capital_source_id_fkey"
            columns: ["capital_source_id"]
            isOneToOne: false
            referencedRelation: "capital_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_terms: {
        Row: {
          amortization_years: number | null
          capital_source_id: string
          created_at: string
          extension_options: number | null
          extension_term_months: number | null
          future_advance_terms: Json | null
          future_funding_capex_pct: number | null
          future_funding_max_amount: number | null
          future_funding_ti_lc_pct: number | null
          index_rate: string | null
          interest_rate_pct: number | null
          io_period_months: number
          loan_term_months: number | null
          maturity_date: string | null
          org_id: string
          origination_fee_pct: number | null
          rate_type: Database["public"]["Enums"]["debt_rate_type_enum"]
          spread_bps: number | null
          updated_at: string
        }
        Insert: {
          amortization_years?: number | null
          capital_source_id: string
          created_at?: string
          extension_options?: number | null
          extension_term_months?: number | null
          future_advance_terms?: Json | null
          future_funding_capex_pct?: number | null
          future_funding_max_amount?: number | null
          future_funding_ti_lc_pct?: number | null
          index_rate?: string | null
          interest_rate_pct?: number | null
          io_period_months?: number
          loan_term_months?: number | null
          maturity_date?: string | null
          org_id: string
          origination_fee_pct?: number | null
          rate_type?: Database["public"]["Enums"]["debt_rate_type_enum"]
          spread_bps?: number | null
          updated_at?: string
        }
        Update: {
          amortization_years?: number | null
          capital_source_id?: string
          created_at?: string
          extension_options?: number | null
          extension_term_months?: number | null
          future_advance_terms?: Json | null
          future_funding_capex_pct?: number | null
          future_funding_max_amount?: number | null
          future_funding_ti_lc_pct?: number | null
          index_rate?: string | null
          interest_rate_pct?: number | null
          io_period_months?: number
          loan_term_months?: number | null
          maturity_date?: string | null
          org_id?: string
          origination_fee_pct?: number | null
          rate_type?: Database["public"]["Enums"]["debt_rate_type_enum"]
          spread_bps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_terms_capital_source_id_fkey"
            columns: ["capital_source_id"]
            isOneToOne: true
            referencedRelation: "capital_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          confidence_score: number | null
          created_at: string
          extracted_text: string | null
          id: string
          page_number: number
          processing_job_id: string
          raw_gdai_storage_path: string | null
          tables: Json | null
          uploaded_file_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          page_number: number
          processing_job_id: string
          raw_gdai_storage_path?: string | null
          tables?: Json | null
          uploaded_file_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          page_number?: number
          processing_job_id?: string
          raw_gdai_storage_path?: string | null
          tables?: Json | null
          uploaded_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "document_processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_pages_uploaded_file_id_fkey"
            columns: ["uploaded_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_at: string | null
          gdai_operation_name: string | null
          gdai_processor_id: string
          id: string
          pages_processed: number | null
          started_at: string | null
          status: string
          uploaded_file_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          gdai_operation_name?: string | null
          gdai_processor_id: string
          id?: string
          pages_processed?: number | null
          started_at?: string | null
          status?: string
          uploaded_file_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_at?: string | null
          gdai_operation_name?: string | null
          gdai_processor_id?: string
          id?: string
          pages_processed?: number | null
          started_at?: string | null
          status?: string
          uploaded_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_jobs_uploaded_file_id_fkey"
            columns: ["uploaded_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      document_refs: {
        Row: {
          created_at: string
          document_type: string | null
          effective_date: string | null
          id: string
          source_quality: string | null
          updated_at: string
          uploaded_file_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          effective_date?: string | null
          id?: string
          source_quality?: string | null
          updated_at?: string
          uploaded_file_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          effective_date?: string | null
          id?: string
          source_quality?: string | null
          updated_at?: string
          uploaded_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_refs_uploaded_file_id_fkey"
            columns: ["uploaded_file_id"]
            isOneToOne: true
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_terms: {
        Row: {
          capital_account_basis: number | null
          capital_source_id: string
          created_at: string
          org_id: string
          ownership_pct: number
          pref_is_cumulative: boolean
          preferred_return_pct: number | null
          updated_at: string
        }
        Insert: {
          capital_account_basis?: number | null
          capital_source_id: string
          created_at?: string
          org_id: string
          ownership_pct: number
          pref_is_cumulative?: boolean
          preferred_return_pct?: number | null
          updated_at?: string
        }
        Update: {
          capital_account_basis?: number | null
          capital_source_id?: string
          created_at?: string
          org_id?: string
          ownership_pct?: number
          pref_is_cumulative?: boolean
          preferred_return_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_terms_capital_source_id_fkey"
            columns: ["capital_source_id"]
            isOneToOne: true
            referencedRelation: "capital_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_inputs: {
        Row: {
          advisor_invoked: boolean
          analysis_job_id: string
          confidence_score: number | null
          created_at: string
          deal_id: string
          extracted_value: Json
          extraction_model: string
          field_name: string
          id: string
          org_id: string
          source_conversation_ref_id: string | null
          source_document_ref_id: string | null
          source_page_number: number | null
          source_quality_override: string | null
          source_text_excerpt: string | null
          unit: string | null
          user_override_at: string | null
          user_override_by: string | null
          user_override_value: Json | null
        }
        Insert: {
          advisor_invoked?: boolean
          analysis_job_id: string
          confidence_score?: number | null
          created_at?: string
          deal_id: string
          extracted_value: Json
          extraction_model: string
          field_name: string
          id?: string
          org_id: string
          source_conversation_ref_id?: string | null
          source_document_ref_id?: string | null
          source_page_number?: number | null
          source_quality_override?: string | null
          source_text_excerpt?: string | null
          unit?: string | null
          user_override_at?: string | null
          user_override_by?: string | null
          user_override_value?: Json | null
        }
        Update: {
          advisor_invoked?: boolean
          analysis_job_id?: string
          confidence_score?: number | null
          created_at?: string
          deal_id?: string
          extracted_value?: Json
          extraction_model?: string
          field_name?: string
          id?: string
          org_id?: string
          source_conversation_ref_id?: string | null
          source_document_ref_id?: string | null
          source_page_number?: number | null
          source_quality_override?: string | null
          source_text_excerpt?: string | null
          unit?: string | null
          user_override_at?: string | null
          user_override_by?: string | null
          user_override_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_inputs_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_inputs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_inputs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_inputs_source_conversation_ref_id_fkey"
            columns: ["source_conversation_ref_id"]
            isOneToOne: false
            referencedRelation: "conversation_refs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_inputs_source_document_ref_id_fkey"
            columns: ["source_document_ref_id"]
            isOneToOne: false
            referencedRelation: "document_refs"
            referencedColumns: ["id"]
          },
        ]
      }
      field_review_events: {
        Row: {
          action: string
          extracted_input_id: string
          id: string
          job_id: string
          review_notes: string | null
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          action: string
          extracted_input_id: string
          id?: string
          job_id: string
          review_notes?: string | null
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          action?: string
          extracted_input_id?: string
          id?: string
          job_id?: string
          review_notes?: string | null
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_review_events_extracted_input_id_fkey"
            columns: ["extracted_input_id"]
            isOneToOne: false
            referencedRelation: "extracted_inputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_review_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_module_registry: {
        Row: {
          asset_classes: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          module_key: string
          revenue_mechanisms: Json
          updated_at: string
          version: number
        }
        Insert: {
          asset_classes?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          module_key: string
          revenue_mechanisms?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          asset_classes?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          module_key?: string
          revenue_mechanisms?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      gate_config_entries: {
        Row: {
          analysis_depths: Json
          created_at: string
          gate_name: string
          gate_sequence: number
          id: string
          is_skippable: boolean
          profile_id: string
        }
        Insert: {
          analysis_depths: Json
          created_at?: string
          gate_name: string
          gate_sequence: number
          id?: string
          is_skippable?: boolean
          profile_id: string
        }
        Update: {
          analysis_depths?: Json
          created_at?: string
          gate_name?: string
          gate_sequence?: number
          id?: string
          is_skippable?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_config_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "gate_config_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_config_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_config_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          from_address: string
          from_name: string | null
          id: string
          message_id: string
          org_id: string | null
          raw_payload_path: string | null
          received_at: string
          subject: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          from_address: string
          from_name?: string | null
          id?: string
          message_id: string
          org_id?: string | null
          raw_payload_path?: string | null
          received_at?: string
          subject?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          from_address?: string
          from_name?: string | null
          id?: string
          message_id?: string
          org_id?: string | null
          raw_payload_path?: string | null
          received_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_assumptions: {
        Row: {
          acquisition_costs_pct: number
          acquisition_price: number | null
          analysis_start_date: string | null
          created_at: string
          created_by: string
          deal_id: string
          disposition_costs_pct: number
          escalation_rate_type: Database["public"]["Enums"]["escalation_rate_type_enum"]
          exit_cap_rate_pct: number | null
          exit_cap_spread_bps: number | null
          going_in_cap_rate_pct: number | null
          hold_period_months: number
          id: string
          inflation_convention: Database["public"]["Enums"]["inflation_convention_enum"]
          org_id: string
          updated_at: string
        }
        Insert: {
          acquisition_costs_pct?: number
          acquisition_price?: number | null
          analysis_start_date?: string | null
          created_at?: string
          created_by: string
          deal_id: string
          disposition_costs_pct?: number
          escalation_rate_type?: Database["public"]["Enums"]["escalation_rate_type_enum"]
          exit_cap_rate_pct?: number | null
          exit_cap_spread_bps?: number | null
          going_in_cap_rate_pct?: number | null
          hold_period_months?: number
          id?: string
          inflation_convention?: Database["public"]["Enums"]["inflation_convention_enum"]
          org_id: string
          updated_at?: string
        }
        Update: {
          acquisition_costs_pct?: number
          acquisition_price?: number | null
          analysis_start_date?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          disposition_costs_pct?: number
          escalation_rate_type?: Database["public"]["Enums"]["escalation_rate_type_enum"]
          exit_cap_rate_pct?: number | null
          exit_cap_spread_bps?: number | null
          going_in_cap_rate_pct?: number | null
          hold_period_months?: number
          id?: string
          inflation_convention?: Database["public"]["Enums"]["inflation_convention_enum"]
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_assumptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_assumptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_gate_corrections: {
        Row: {
          corrected_at: string
          corrected_by: string
          corrected_value: Json
          correction_reason: string | null
          extracted_input_id: string | null
          field_name: string
          gate_id: string
          id: string
          job_id: string
          original_value: Json
        }
        Insert: {
          corrected_at?: string
          corrected_by: string
          corrected_value: Json
          correction_reason?: string | null
          extracted_input_id?: string | null
          field_name: string
          gate_id: string
          id?: string
          job_id: string
          original_value: Json
        }
        Update: {
          corrected_at?: string
          corrected_by?: string
          corrected_value?: Json
          correction_reason?: string | null
          extracted_input_id?: string | null
          field_name?: string
          gate_id?: string
          id?: string
          job_id?: string
          original_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_gate_corrections_extracted_input_id_fkey"
            columns: ["extracted_input_id"]
            isOneToOne: false
            referencedRelation: "extracted_inputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_gate_corrections_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "job_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_gate_corrections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_gates: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          gate_name: string
          gate_sequence: number
          id: string
          job_id: string
          skipped_at: string | null
          skipped_by: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gate_name: string
          gate_sequence: number
          id?: string
          job_id: string
          skipped_at?: string | null
          skipped_by?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gate_name?: string
          gate_sequence?: number
          id?: string
          job_id?: string
          skipped_at?: string | null
          skipped_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_gates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_renewal_options: {
        Row: {
          contraction_sf: number | null
          created_at: string
          exercise_deadline: string | null
          exercised_at: string | null
          expansion_sf: number | null
          fixed_rent_psf: number | null
          fmv_cap_psf: number | null
          fmv_floor_psf: number | null
          id: string
          is_exercised: boolean
          lease_id: string
          notes: string | null
          notice_period_months: number | null
          option_number: number
          option_type: Database["public"]["Enums"]["lease_option_type_enum"]
          org_id: string
          purchase_price: number | null
          purchase_price_notes: string | null
          rent_determination_type:
            | Database["public"]["Enums"]["rent_determination_type_enum"]
            | null
          surrender_premium_psf: number | null
          term_months: number | null
          updated_at: string
        }
        Insert: {
          contraction_sf?: number | null
          created_at?: string
          exercise_deadline?: string | null
          exercised_at?: string | null
          expansion_sf?: number | null
          fixed_rent_psf?: number | null
          fmv_cap_psf?: number | null
          fmv_floor_psf?: number | null
          id?: string
          is_exercised?: boolean
          lease_id: string
          notes?: string | null
          notice_period_months?: number | null
          option_number?: number
          option_type: Database["public"]["Enums"]["lease_option_type_enum"]
          org_id: string
          purchase_price?: number | null
          purchase_price_notes?: string | null
          rent_determination_type?:
            | Database["public"]["Enums"]["rent_determination_type_enum"]
            | null
          surrender_premium_psf?: number | null
          term_months?: number | null
          updated_at?: string
        }
        Update: {
          contraction_sf?: number | null
          created_at?: string
          exercise_deadline?: string | null
          exercised_at?: string | null
          expansion_sf?: number | null
          fixed_rent_psf?: number | null
          fmv_cap_psf?: number | null
          fmv_floor_psf?: number | null
          id?: string
          is_exercised?: boolean
          lease_id?: string
          notes?: string | null
          notice_period_months?: number | null
          option_number?: number
          option_type?: Database["public"]["Enums"]["lease_option_type_enum"]
          org_id?: string
          purchase_price?: number | null
          purchase_price_notes?: string | null
          rent_determination_type?:
            | Database["public"]["Enums"]["rent_determination_type_enum"]
            | null
          surrender_premium_psf?: number | null
          term_months?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_renewal_options_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_rent_steps: {
        Row: {
          created_at: string
          effective_date: string
          escalation_type: Database["public"]["Enums"]["rent_step_escalation_type_enum"]
          escalation_value: number | null
          id: string
          lease_id: string
          new_rent_psf: number | null
          notes: string | null
          org_id: string
          step_number: number
        }
        Insert: {
          created_at?: string
          effective_date: string
          escalation_type: Database["public"]["Enums"]["rent_step_escalation_type_enum"]
          escalation_value?: number | null
          id?: string
          lease_id: string
          new_rent_psf?: number | null
          notes?: string | null
          org_id: string
          step_number: number
        }
        Update: {
          created_at?: string
          effective_date?: string
          escalation_type?: Database["public"]["Enums"]["rent_step_escalation_type_enum"]
          escalation_value?: number | null
          id?: string
          lease_id?: string
          new_rent_psf?: number | null
          notes?: string | null
          org_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_rent_steps_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_spaces: {
        Row: {
          created_at: string
          id: string
          lease_id: string
          org_id: string
          sf_allocated: number | null
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lease_id: string
          org_id: string
          sf_allocated?: number | null
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lease_id?: string
          org_id?: string
          sf_allocated?: number | null
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_spaces_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_spaces_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_master"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_gross: {
        Row: {
          base_year: number | null
          created_at: string
          expense_stop_psf: number | null
          included_expenses: string[] | null
          lease_id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          base_year?: number | null
          created_at?: string
          expense_stop_psf?: number | null
          included_expenses?: string[] | null
          lease_id: string
          org_id: string
          updated_at?: string
        }
        Update: {
          base_year?: number | null
          created_at?: string
          expense_stop_psf?: number | null
          included_expenses?: string[] | null
          lease_id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_gross_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_ground: {
        Row: {
          created_at: string
          escalation_schedule: Json | null
          ground_rent_initial_psf: number | null
          landowner_reversionary_notes: string | null
          lease_id: string
          org_id: string
          purchase_option_price: number | null
          reversion_year: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_schedule?: Json | null
          ground_rent_initial_psf?: number | null
          landowner_reversionary_notes?: string | null
          lease_id: string
          org_id: string
          purchase_option_price?: number | null
          reversion_year?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_schedule?: Json | null
          ground_rent_initial_psf?: number | null
          landowner_reversionary_notes?: string | null
          lease_id?: string
          org_id?: string
          purchase_option_price?: number | null
          reversion_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_ground_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_hotel_mgmt: {
        Row: {
          agreement_term_years: number | null
          brand_flag: string | null
          created_at: string
          incentive_fee_basis: string | null
          incentive_fee_pct: number | null
          incentive_fee_threshold: number | null
          lease_id: string
          management_fee_pct: number
          org_id: string
          updated_at: string
        }
        Insert: {
          agreement_term_years?: number | null
          brand_flag?: string | null
          created_at?: string
          incentive_fee_basis?: string | null
          incentive_fee_pct?: number | null
          incentive_fee_threshold?: number | null
          lease_id: string
          management_fee_pct: number
          org_id: string
          updated_at?: string
        }
        Update: {
          agreement_term_years?: number | null
          brand_flag?: string | null
          created_at?: string
          incentive_fee_basis?: string | null
          incentive_fee_pct?: number | null
          incentive_fee_threshold?: number | null
          lease_id?: string
          management_fee_pct?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_hotel_mgmt_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_license: {
        Row: {
          auto_renew: boolean
          created_at: string
          lease_id: string
          notice_to_terminate_days: number | null
          org_id: string
          permitted_use: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          lease_id: string
          notice_to_terminate_days?: number | null
          org_id: string
          permitted_use: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          lease_id?: string
          notice_to_terminate_days?: number | null
          org_id?: string
          permitted_use?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_license_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_membership: {
        Row: {
          access_hours: string | null
          created_at: string
          lease_id: string
          membership_tier: string | null
          monthly_rate: number
          org_id: string
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          access_hours?: string | null
          created_at?: string
          lease_id: string
          membership_tier?: string | null
          monthly_rate: number
          org_id: string
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          access_hours?: string | null
          created_at?: string
          lease_id?: string
          membership_tier?: string | null
          monthly_rate?: number
          org_id?: string
          unit_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_membership_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_modified_gross: {
        Row: {
          created_at: string
          lease_id: string
          org_id: string
          tenant_pays: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          lease_id: string
          org_id: string
          tenant_pays?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          lease_id?: string
          org_id?: string
          tenant_pays?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_modified_gross_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_nnn: {
        Row: {
          admin_fee_pct: number
          cam_cap_pct: number | null
          cam_psf_base: number | null
          created_at: string
          expense_stop_psf: number | null
          insurance_base_year: number | null
          lease_id: string
          org_id: string
          tax_base_year: number | null
          updated_at: string
        }
        Insert: {
          admin_fee_pct?: number
          cam_cap_pct?: number | null
          cam_psf_base?: number | null
          created_at?: string
          expense_stop_psf?: number | null
          insurance_base_year?: number | null
          lease_id: string
          org_id: string
          tax_base_year?: number | null
          updated_at?: string
        }
        Update: {
          admin_fee_pct?: number
          cam_cap_pct?: number | null
          cam_psf_base?: number | null
          created_at?: string
          expense_stop_psf?: number | null
          insurance_base_year?: number | null
          lease_id?: string
          org_id?: string
          tax_base_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_nnn_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_percentage_rent: {
        Row: {
          artificial_breakpoint: number | null
          breakpoint_type: Database["public"]["Enums"]["percentage_rent_breakpoint_type_enum"]
          created_at: string
          exclusion_categories: string[] | null
          lease_id: string
          org_id: string
          overage_pct: number
          sales_reporting_cadence: Database["public"]["Enums"]["sales_reporting_cadence_enum"]
          updated_at: string
        }
        Insert: {
          artificial_breakpoint?: number | null
          breakpoint_type: Database["public"]["Enums"]["percentage_rent_breakpoint_type_enum"]
          created_at?: string
          exclusion_categories?: string[] | null
          lease_id: string
          org_id: string
          overage_pct: number
          sales_reporting_cadence?: Database["public"]["Enums"]["sales_reporting_cadence_enum"]
          updated_at?: string
        }
        Update: {
          artificial_breakpoint?: number | null
          breakpoint_type?: Database["public"]["Enums"]["percentage_rent_breakpoint_type_enum"]
          created_at?: string
          exclusion_categories?: string[] | null
          lease_id?: string
          org_id?: string
          overage_pct?: number
          sales_reporting_cadence?: Database["public"]["Enums"]["sales_reporting_cadence_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_percentage_rent_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_traits_residential: {
        Row: {
          amenity_tier: string | null
          created_at: string
          furnished: boolean
          lease_id: string
          org_id: string
          pet_policy: string | null
          security_deposit: number | null
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          amenity_tier?: string | null
          created_at?: string
          furnished?: boolean
          lease_id: string
          org_id: string
          pet_policy?: string | null
          security_deposit?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          amenity_tier?: string | null
          created_at?: string
          furnished?: boolean
          lease_id?: string
          org_id?: string
          pet_policy?: string | null
          security_deposit?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_traits_residential_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          base_rent_psf: number | null
          commencement_date: string | null
          created_at: string
          created_by: string
          deal_id: string
          expiration_date: string | null
          free_rent_applied_at_start: boolean
          free_rent_months: number
          id: string
          lease_status: Database["public"]["Enums"]["lease_status_enum"]
          lease_type: Database["public"]["Enums"]["lease_type_enum"]
          org_id: string
          rentable_sf: number | null
          space_id: string | null
          tenant_industry: string | null
          tenant_name: string | null
          ti_allowance_psf: number | null
          updated_at: string
        }
        Insert: {
          base_rent_psf?: number | null
          commencement_date?: string | null
          created_at?: string
          created_by: string
          deal_id: string
          expiration_date?: string | null
          free_rent_applied_at_start?: boolean
          free_rent_months?: number
          id?: string
          lease_status?: Database["public"]["Enums"]["lease_status_enum"]
          lease_type: Database["public"]["Enums"]["lease_type_enum"]
          org_id: string
          rentable_sf?: number | null
          space_id?: string | null
          tenant_industry?: string | null
          tenant_name?: string | null
          ti_allowance_psf?: number | null
          updated_at?: string
        }
        Update: {
          base_rent_psf?: number | null
          commencement_date?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          expiration_date?: string | null
          free_rent_applied_at_start?: boolean
          free_rent_months?: number
          id?: string
          lease_status?: Database["public"]["Enums"]["lease_status_enum"]
          lease_type?: Database["public"]["Enums"]["lease_type_enum"]
          org_id?: string
          rentable_sf?: number | null
          space_id?: string | null
          tenant_industry?: string | null
          tenant_name?: string | null
          ti_allowance_psf?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_master"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidation_tranches: {
        Row: {
          created_at: string
          deal_id: string
          disposition_cost_pct: number
          gross_proceeds: number | null
          id: string
          notes: string | null
          org_id: string
          target_sale_date: string | null
          tranche_name: string
          tranche_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          disposition_cost_pct?: number
          gross_proceeds?: number | null
          id?: string
          notes?: string | null
          org_id: string
          target_sale_date?: string | null
          tranche_name: string
          tranche_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          disposition_cost_pct?: number
          gross_proceeds?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          target_sale_date?: string | null
          tranche_name?: string
          tranche_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidation_tranches_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidation_tranches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      market_leasing_assumptions: {
        Row: {
          applies_to_space_type: Database["public"]["Enums"]["space_type"]
          created_at: string
          created_by: string
          deal_id: string
          downtime_months_new_tenant: number
          downtime_months_renewal: number
          id: string
          lc_pct_new: number | null
          lc_pct_renewal: number | null
          market_rent_growth_pct: number
          market_rent_psf: number
          new_lease_term_months: number
          org_id: string
          renewal_lease_term_months: number
          renewal_probability_pct: number
          ti_psf_new: number | null
          ti_psf_renewal: number | null
          updated_at: string
        }
        Insert: {
          applies_to_space_type: Database["public"]["Enums"]["space_type"]
          created_at?: string
          created_by: string
          deal_id: string
          downtime_months_new_tenant?: number
          downtime_months_renewal?: number
          id?: string
          lc_pct_new?: number | null
          lc_pct_renewal?: number | null
          market_rent_growth_pct?: number
          market_rent_psf: number
          new_lease_term_months?: number
          org_id: string
          renewal_lease_term_months?: number
          renewal_probability_pct?: number
          ti_psf_new?: number | null
          ti_psf_renewal?: number | null
          updated_at?: string
        }
        Update: {
          applies_to_space_type?: Database["public"]["Enums"]["space_type"]
          created_at?: string
          created_by?: string
          deal_id?: string
          downtime_months_new_tenant?: number
          downtime_months_renewal?: number
          id?: string
          lc_pct_new?: number | null
          lc_pct_renewal?: number | null
          market_rent_growth_pct?: number
          market_rent_psf?: number
          new_lease_term_months?: number
          org_id?: string
          renewal_lease_term_months?: number
          renewal_probability_pct?: number
          ti_psf_new?: number | null
          ti_psf_renewal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_leasing_assumptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_leasing_assumptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_results: {
        Row: {
          analysis_depth: string
          analysis_job_id: string
          calculation_engine_version: string
          composition_id: string
          created_at: string
          credits_consumed: number
          deal_id: string
          id: string
          is_base_case: boolean
          org_id: string
          result_data: Json
          result_summary: Json | null
          scenario_label: string | null
        }
        Insert: {
          analysis_depth: string
          analysis_job_id: string
          calculation_engine_version: string
          composition_id: string
          created_at?: string
          credits_consumed?: number
          deal_id: string
          id?: string
          is_base_case?: boolean
          org_id: string
          result_data: Json
          result_summary?: Json | null
          scenario_label?: string | null
        }
        Update: {
          analysis_depth?: string
          analysis_job_id?: string
          calculation_engine_version?: string
          composition_id?: string
          created_at?: string
          credits_consumed?: number
          deal_id?: string
          id?: string
          is_base_case?: boolean
          org_id?: string
          result_data?: Json
          result_summary?: Json | null
          scenario_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_results_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_results_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "deal_model_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_results_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_run_annual_cashflows: {
        Row: {
          capex_reserve: number | null
          cash_on_cash_pct: number | null
          created_at: string
          credit_loss: number | null
          deal_id: string
          dscr: number | null
          effective_gross_income: number | null
          gross_sale_price: number | null
          hold_year: number
          id: string
          leasing_commissions: number | null
          levered_cash_flow: number | null
          mgmt_fee: number | null
          model_result_id: string
          net_reversion: number | null
          noi: number | null
          operating_expenses: number | null
          org_id: string
          other_income: number | null
          potential_gross_income: number | null
          ti_costs: number | null
          total_capital_costs: number | null
          total_debt_service: number | null
          unlevered_cash_flow: number | null
          vacancy_loss: number | null
          year_end_date: string
          year_start_date: string
        }
        Insert: {
          capex_reserve?: number | null
          cash_on_cash_pct?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id: string
          dscr?: number | null
          effective_gross_income?: number | null
          gross_sale_price?: number | null
          hold_year: number
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id: string
          net_reversion?: number | null
          noi?: number | null
          operating_expenses?: number | null
          org_id: string
          other_income?: number | null
          potential_gross_income?: number | null
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
          year_end_date: string
          year_start_date: string
        }
        Update: {
          capex_reserve?: number | null
          cash_on_cash_pct?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id?: string
          dscr?: number | null
          effective_gross_income?: number | null
          gross_sale_price?: number | null
          hold_year?: number
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id?: string
          net_reversion?: number | null
          noi?: number | null
          operating_expenses?: number | null
          org_id?: string
          other_income?: number | null
          potential_gross_income?: number | null
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
          year_end_date?: string
          year_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_run_annual_cashflows_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_annual_cashflows_model_result_id_fkey"
            columns: ["model_result_id"]
            isOneToOne: false
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_annual_cashflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_run_kpis: {
        Row: {
          avg_cash_on_cash_pct: number | null
          cash_on_cash_yr1_pct: number | null
          created_at: string
          deal_id: string
          debt_yield_pct: number | null
          dscr_min: number | null
          dscr_year1: number | null
          egi_year1: number | null
          equity_multiple: number | null
          exit_cap_rate_pct: number | null
          going_in_cap_rate_pct: number | null
          gross_revenue_year1: number | null
          gross_sale_price: number | null
          id: string
          levered_irr_pct: number | null
          ltc_pct: number | null
          ltv_at_acquisition_pct: number | null
          ltv_at_stabilization_pct: number | null
          model_result_id: string
          net_sale_proceeds: number | null
          noi_stabilized: number | null
          noi_year1: number | null
          org_id: string
          profit_levered: number | null
          profit_unlevered: number | null
          stabilized_cap_rate_pct: number | null
          unlevered_irr_pct: number | null
          yoc_pct: number | null
        }
        Insert: {
          avg_cash_on_cash_pct?: number | null
          cash_on_cash_yr1_pct?: number | null
          created_at?: string
          deal_id: string
          debt_yield_pct?: number | null
          dscr_min?: number | null
          dscr_year1?: number | null
          egi_year1?: number | null
          equity_multiple?: number | null
          exit_cap_rate_pct?: number | null
          going_in_cap_rate_pct?: number | null
          gross_revenue_year1?: number | null
          gross_sale_price?: number | null
          id?: string
          levered_irr_pct?: number | null
          ltc_pct?: number | null
          ltv_at_acquisition_pct?: number | null
          ltv_at_stabilization_pct?: number | null
          model_result_id: string
          net_sale_proceeds?: number | null
          noi_stabilized?: number | null
          noi_year1?: number | null
          org_id: string
          profit_levered?: number | null
          profit_unlevered?: number | null
          stabilized_cap_rate_pct?: number | null
          unlevered_irr_pct?: number | null
          yoc_pct?: number | null
        }
        Update: {
          avg_cash_on_cash_pct?: number | null
          cash_on_cash_yr1_pct?: number | null
          created_at?: string
          deal_id?: string
          debt_yield_pct?: number | null
          dscr_min?: number | null
          dscr_year1?: number | null
          egi_year1?: number | null
          equity_multiple?: number | null
          exit_cap_rate_pct?: number | null
          going_in_cap_rate_pct?: number | null
          gross_revenue_year1?: number | null
          gross_sale_price?: number | null
          id?: string
          levered_irr_pct?: number | null
          ltc_pct?: number | null
          ltv_at_acquisition_pct?: number | null
          ltv_at_stabilization_pct?: number | null
          model_result_id?: string
          net_sale_proceeds?: number | null
          noi_stabilized?: number | null
          noi_year1?: number | null
          org_id?: string
          profit_levered?: number | null
          profit_unlevered?: number | null
          stabilized_cap_rate_pct?: number | null
          unlevered_irr_pct?: number | null
          yoc_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_run_kpis_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_kpis_model_result_id_fkey"
            columns: ["model_result_id"]
            isOneToOne: true
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_kpis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_run_monthly_cashflows: {
        Row: {
          capex_reserve: number | null
          created_at: string
          credit_loss: number | null
          deal_id: string
          debt_payoff: number | null
          debt_service_interest: number | null
          debt_service_principal: number | null
          disposition_costs: number | null
          effective_gross_income: number | null
          gross_sale_price: number | null
          id: string
          leasing_commissions: number | null
          levered_cash_flow: number | null
          mgmt_fee: number | null
          model_result_id: string
          net_reversion: number | null
          noi: number | null
          operating_expenses: number | null
          org_id: string
          other_income: number | null
          period_date: string
          period_month: number
          potential_gross_income: number | null
          ti_costs: number | null
          total_capital_costs: number | null
          total_debt_service: number | null
          unlevered_cash_flow: number | null
          vacancy_loss: number | null
        }
        Insert: {
          capex_reserve?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id: string
          debt_payoff?: number | null
          debt_service_interest?: number | null
          debt_service_principal?: number | null
          disposition_costs?: number | null
          effective_gross_income?: number | null
          gross_sale_price?: number | null
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id: string
          net_reversion?: number | null
          noi?: number | null
          operating_expenses?: number | null
          org_id: string
          other_income?: number | null
          period_date: string
          period_month: number
          potential_gross_income?: number | null
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
        }
        Update: {
          capex_reserve?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id?: string
          debt_payoff?: number | null
          debt_service_interest?: number | null
          debt_service_principal?: number | null
          disposition_costs?: number | null
          effective_gross_income?: number | null
          gross_sale_price?: number | null
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id?: string
          net_reversion?: number | null
          noi?: number | null
          operating_expenses?: number | null
          org_id?: string
          other_income?: number | null
          period_date?: string
          period_month?: number
          potential_gross_income?: number | null
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_run_monthly_cashflows_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_monthly_cashflows_model_result_id_fkey"
            columns: ["model_result_id"]
            isOneToOne: false
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_monthly_cashflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_run_quarterly_cashflows: {
        Row: {
          capex_reserve: number | null
          created_at: string
          credit_loss: number | null
          deal_id: string
          debt_yield_pct: number | null
          dscr: number | null
          effective_gross_income: number | null
          hold_quarter: number
          id: string
          leasing_commissions: number | null
          levered_cash_flow: number | null
          mgmt_fee: number | null
          model_result_id: string
          noi: number | null
          operating_expenses: number | null
          org_id: string
          other_income: number | null
          potential_gross_income: number | null
          quarter_end_date: string
          quarter_start_date: string
          ti_costs: number | null
          total_capital_costs: number | null
          total_debt_service: number | null
          unlevered_cash_flow: number | null
          vacancy_loss: number | null
        }
        Insert: {
          capex_reserve?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id: string
          debt_yield_pct?: number | null
          dscr?: number | null
          effective_gross_income?: number | null
          hold_quarter: number
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id: string
          noi?: number | null
          operating_expenses?: number | null
          org_id: string
          other_income?: number | null
          potential_gross_income?: number | null
          quarter_end_date: string
          quarter_start_date: string
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
        }
        Update: {
          capex_reserve?: number | null
          created_at?: string
          credit_loss?: number | null
          deal_id?: string
          debt_yield_pct?: number | null
          dscr?: number | null
          effective_gross_income?: number | null
          hold_quarter?: number
          id?: string
          leasing_commissions?: number | null
          levered_cash_flow?: number | null
          mgmt_fee?: number | null
          model_result_id?: string
          noi?: number | null
          operating_expenses?: number | null
          org_id?: string
          other_income?: number | null
          potential_gross_income?: number | null
          quarter_end_date?: string
          quarter_start_date?: string
          ti_costs?: number | null
          total_capital_costs?: number | null
          total_debt_service?: number | null
          unlevered_cash_flow?: number | null
          vacancy_loss?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_run_quarterly_cashflows_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_quarterly_cashflows_model_result_id_fkey"
            columns: ["model_result_id"]
            isOneToOne: false
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_run_quarterly_cashflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_assumptions: {
        Row: {
          cam_psf: number | null
          capex_reserve_psf: number | null
          created_at: string
          created_by: string
          credit_loss_pct: number
          deal_id: string
          id: string
          insurance_psf: number | null
          mgmt_fee_pct: number
          opex_growth_pct: number
          opex_psf: number | null
          org_id: string
          other_opex_psf: number | null
          real_estate_tax_psf: number | null
          repairs_maintenance_psf: number | null
          updated_at: string
          utilities_psf: number | null
          vacancy_rate_pct: number
        }
        Insert: {
          cam_psf?: number | null
          capex_reserve_psf?: number | null
          created_at?: string
          created_by: string
          credit_loss_pct?: number
          deal_id: string
          id?: string
          insurance_psf?: number | null
          mgmt_fee_pct?: number
          opex_growth_pct?: number
          opex_psf?: number | null
          org_id: string
          other_opex_psf?: number | null
          real_estate_tax_psf?: number | null
          repairs_maintenance_psf?: number | null
          updated_at?: string
          utilities_psf?: number | null
          vacancy_rate_pct?: number
        }
        Update: {
          cam_psf?: number | null
          capex_reserve_psf?: number | null
          created_at?: string
          created_by?: string
          credit_loss_pct?: number
          deal_id?: string
          id?: string
          insurance_psf?: number | null
          mgmt_fee_pct?: number
          opex_growth_pct?: number
          opex_psf?: number | null
          org_id?: string
          other_opex_psf?: number | null
          real_estate_tax_psf?: number | null
          repairs_maintenance_psf?: number | null
          updated_at?: string
          utilities_psf?: number | null
          vacancy_rate_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "operating_assumptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_assumptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          billing_period: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_credit_allowance: number
          org_id: string
          plan_key: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_credit_allowance?: number
          org_id: string
          plan_key: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_credit_allowance?: number
          org_id?: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          confidence_weight_config: Json | null
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          confidence_weight_config?: Json | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          confidence_weight_config?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_products: {
        Row: {
          buyer_type: Database["public"]["Enums"]["buyer_type_enum"] | null
          created_at: string
          deal_id: string
          id: string
          liquidation_tranche_id: string | null
          list_price: number | null
          notes: string | null
          org_id: string
          product_name: string
          sale_date: string | null
          sale_price: number | null
          space_id: string
          updated_at: string
        }
        Insert: {
          buyer_type?: Database["public"]["Enums"]["buyer_type_enum"] | null
          created_at?: string
          deal_id: string
          id?: string
          liquidation_tranche_id?: string | null
          list_price?: number | null
          notes?: string | null
          org_id: string
          product_name: string
          sale_date?: string | null
          sale_price?: number | null
          space_id: string
          updated_at?: string
        }
        Update: {
          buyer_type?: Database["public"]["Enums"]["buyer_type_enum"] | null
          created_at?: string
          deal_id?: string
          id?: string
          liquidation_tranche_id?: string | null
          list_price?: number | null
          notes?: string | null
          org_id?: string
          product_name?: string
          sale_date?: string | null
          sale_price?: number | null
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_products_liquidation_tranche_id_fkey"
            columns: ["liquidation_tranche_id"]
            isOneToOne: false
            referencedRelation: "liquidation_tranches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_products_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_master"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_sets: {
        Row: {
          analysis_depth: string
          base_result_id: string
          composition_id: string
          created_at: string
          created_by: string
          deal_id: string
          id: string
          name: string
        }
        Insert: {
          analysis_depth: string
          base_result_id: string
          composition_id: string
          created_at?: string
          created_by: string
          deal_id: string
          id?: string
          name: string
        }
        Update: {
          analysis_depth?: string
          base_result_id?: string
          composition_id?: string
          created_at?: string
          created_by?: string
          deal_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_sets_base_result_id_fkey"
            columns: ["base_result_id"]
            isOneToOne: false
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "deal_model_compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_sets_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      share_link_views: {
        Row: {
          id: string
          ip_address: string | null
          page_or_section: string | null
          share_link_id: string
          time_spent_seconds: number | null
          user_agent: string | null
          viewed_at: string
          viewer_email: string | null
          viewer_name: string | null
          viewer_session_id: string
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          page_or_section?: string | null
          share_link_id: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          viewed_at?: string
          viewer_email?: string | null
          viewer_name?: string | null
          viewer_session_id: string
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          page_or_section?: string | null
          share_link_id?: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          viewed_at?: string
          viewer_email?: string | null
          viewer_name?: string | null
          viewer_session_id?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_link_views_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          link_type: string
          model_result_id: string | null
          org_id: string
          password_hash: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_type: string
          model_result_id?: string | null
          org_id: string
          password_hash?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_type?: string
          model_result_id?: string | null
          org_id?: string
          password_hash?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_model_result_id_fkey"
            columns: ["model_result_id"]
            isOneToOne: false
            referencedRelation: "model_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      space_pool_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          pool_id: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          pool_id: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          pool_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "space_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_pool_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_master"
            referencedColumns: ["id"]
          },
        ]
      }
      space_pools: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string
          description: string | null
          id: string
          org_id: string
          pool_name: string
          pool_type: Database["public"]["Enums"]["space_pool_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id: string
          description?: string | null
          id?: string
          org_id: string
          pool_name: string
          pool_type: Database["public"]["Enums"]["space_pool_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string
          description?: string | null
          id?: string
          org_id?: string
          pool_name?: string
          pool_type?: Database["public"]["Enums"]["space_pool_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_pools_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_pools_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces_master: {
        Row: {
          building_id: string
          created_at: string
          created_by: string
          deal_id: string
          floor_number: number | null
          id: string
          lifecycle_status: Database["public"]["Enums"]["space_lifecycle_status"]
          notes: string | null
          org_id: string
          rsf: number | null
          space_identifier: string
          space_type: Database["public"]["Enums"]["space_type"]
          stub_only: boolean
          updated_at: string
          usf: number | null
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by: string
          deal_id: string
          floor_number?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["space_lifecycle_status"]
          notes?: string | null
          org_id: string
          rsf?: number | null
          space_identifier: string
          space_type: Database["public"]["Enums"]["space_type"]
          stub_only?: boolean
          updated_at?: string
          usf?: number | null
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string
          deal_id?: string
          floor_number?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["space_lifecycle_status"]
          notes?: string | null
          org_id?: string
          rsf?: number | null
          space_identifier?: string
          space_type?: Database["public"]["Enums"]["space_type"]
          stub_only?: boolean
          updated_at?: string
          usf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_master_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_master_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_master_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          deal_id: string | null
          duplicate_of_id: string | null
          file_name: string
          file_size_bytes: number
          id: string
          inbound_email_id: string | null
          mime_type: string
          org_id: string
          sha256_hash: string
          source: string
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          deal_id?: string | null
          duplicate_of_id?: string | null
          file_name: string
          file_size_bytes: number
          id?: string
          inbound_email_id?: string | null
          mime_type: string
          org_id: string
          sha256_hash: string
          source?: string
          status?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          deal_id?: string | null
          duplicate_of_id?: string | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          inbound_email_id?: string | null
          mime_type?: string
          org_id?: string
          sha256_hash?: string
          source?: string
          status?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_inbound_email_id_fkey"
            columns: ["inbound_email_id"]
            isOneToOne: false
            referencedRelation: "inbound_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      value_schedule_entries: {
        Row: {
          applies_to_space_type:
            | Database["public"]["Enums"]["space_type"]
            | null
          assumption_source: Database["public"]["Enums"]["value_schedule_assumption_source_enum"]
          created_at: string
          deal_id: string
          field_name: string
          id: string
          org_id: string
          period_date: string
          period_type: Database["public"]["Enums"]["value_schedule_period_type_enum"]
          value: number
        }
        Insert: {
          applies_to_space_type?:
            | Database["public"]["Enums"]["space_type"]
            | null
          assumption_source: Database["public"]["Enums"]["value_schedule_assumption_source_enum"]
          created_at?: string
          deal_id: string
          field_name: string
          id?: string
          org_id: string
          period_date: string
          period_type?: Database["public"]["Enums"]["value_schedule_period_type_enum"]
          value: number
        }
        Update: {
          applies_to_space_type?:
            | Database["public"]["Enums"]["space_type"]
            | null
          assumption_source?: Database["public"]["Enums"]["value_schedule_assumption_source_enum"]
          created_at?: string
          deal_id?: string
          field_name?: string
          id?: string
          org_id?: string
          period_date?: string
          period_type?: Database["public"]["Enums"]["value_schedule_period_type_enum"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "value_schedule_entries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      waterfall_tiers: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string
          gp_split_pct: number
          hurdle_multiple: number | null
          hurdle_rate_pct: number | null
          hurdle_type: Database["public"]["Enums"]["waterfall_hurdle_type_enum"]
          id: string
          lp_split_pct: number
          org_id: string
          tier_name: string
          tier_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id: string
          gp_split_pct: number
          hurdle_multiple?: number | null
          hurdle_rate_pct?: number | null
          hurdle_type: Database["public"]["Enums"]["waterfall_hurdle_type_enum"]
          id?: string
          lp_split_pct: number
          org_id: string
          tier_name: string
          tier_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string
          gp_split_pct?: number
          hurdle_multiple?: number | null
          hurdle_rate_pct?: number | null
          hurdle_type?: Database["public"]["Enums"]["waterfall_hurdle_type_enum"]
          id?: string
          lp_split_pct?: number
          org_id?: string
          tier_name?: string
          tier_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waterfall_tiers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waterfall_tiers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      buyer_type_enum: "investor" | "owner_occupant" | "developer" | "other"
      capital_type_enum:
        | "senior_debt"
        | "construction_loan"
        | "bridge_loan"
        | "mezzanine_debt"
        | "preferred_equity"
        | "lp_equity"
        | "gp_equity"
        | "co_gp"
        | "jv_equity"
        | "other"
      covenant_test_frequency_enum:
        | "at_funding"
        | "monthly"
        | "quarterly"
        | "annual"
      covenant_type_enum:
        | "dscr_min"
        | "ltv_max"
        | "ltc_max"
        | "debt_yield_min"
        | "occupancy_min"
        | "custom"
      deal_activity_event_type_enum:
        | "document_uploaded"
        | "document_processed"
        | "document_failed"
        | "extraction_started"
        | "extraction_completed"
        | "extraction_field_flagged"
        | "gate_opened"
        | "gate_approved"
        | "gate_corrected"
        | "gate_skipped"
        | "model_run_started"
        | "model_run_completed"
        | "model_run_failed"
        | "scenario_saved"
        | "scenario_set_created"
        | "input_overridden"
        | "input_approved"
        | "assumption_updated"
        | "member_added"
        | "member_removed"
        | "member_role_changed"
        | "share_link_created"
        | "share_link_viewed"
        | "deal_created"
        | "deal_status_changed"
        | "deal_archived"
      deal_member_role_enum: "owner" | "editor" | "reviewer" | "viewer"
      debt_rate_type_enum: "fixed" | "floating" | "hybrid"
      escalation_rate_type_enum: "effective_annual" | "nominal_monthly"
      inflation_convention_enum: "year_1" | "year_2"
      lease_option_type_enum:
        | "renewal"
        | "expansion"
        | "contraction"
        | "termination"
        | "purchase"
      lease_status_enum: "draft" | "executed" | "expired" | "terminated"
      lease_type_enum:
        | "nnn"
        | "gross"
        | "modified_gross"
        | "ground_lease"
        | "residential"
        | "hotel_management"
        | "membership"
        | "license"
      percentage_rent_breakpoint_type_enum: "natural" | "artificial"
      rent_determination_type_enum:
        | "fixed"
        | "fair_market_value"
        | "cpi_adjusted"
        | "fixed_plus_cpi_floor"
      rent_step_escalation_type_enum: "fixed_amount" | "fixed_percent" | "cpi"
      sales_reporting_cadence_enum: "monthly" | "quarterly" | "annual"
      space_lifecycle_status:
        | "occupied"
        | "vacant"
        | "under_construction"
        | "dark"
        | "demolished"
      space_pool_type: "leasing_pool" | "liquidation_pool" | "capex_pool"
      space_type:
        | "office"
        | "retail"
        | "industrial"
        | "residential_unit"
        | "hotel_key"
        | "parking"
        | "storage"
        | "common_area"
        | "land"
        | "hot_desk"
        | "private_suite"
        | "other"
      value_schedule_assumption_source_enum:
        | "market_leasing"
        | "operating"
        | "investment"
      value_schedule_period_type_enum: "monthly" | "annual"
      waterfall_hurdle_type_enum:
        | "return_of_capital"
        | "preferred_return"
        | "irr_hurdle"
        | "equity_multiple_hurdle"
        | "residual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      buyer_type_enum: ["investor", "owner_occupant", "developer", "other"],
      capital_type_enum: [
        "senior_debt",
        "construction_loan",
        "bridge_loan",
        "mezzanine_debt",
        "preferred_equity",
        "lp_equity",
        "gp_equity",
        "co_gp",
        "jv_equity",
        "other",
      ],
      covenant_test_frequency_enum: [
        "at_funding",
        "monthly",
        "quarterly",
        "annual",
      ],
      covenant_type_enum: [
        "dscr_min",
        "ltv_max",
        "ltc_max",
        "debt_yield_min",
        "occupancy_min",
        "custom",
      ],
      deal_activity_event_type_enum: [
        "document_uploaded",
        "document_processed",
        "document_failed",
        "extraction_started",
        "extraction_completed",
        "extraction_field_flagged",
        "gate_opened",
        "gate_approved",
        "gate_corrected",
        "gate_skipped",
        "model_run_started",
        "model_run_completed",
        "model_run_failed",
        "scenario_saved",
        "scenario_set_created",
        "input_overridden",
        "input_approved",
        "assumption_updated",
        "member_added",
        "member_removed",
        "member_role_changed",
        "share_link_created",
        "share_link_viewed",
        "deal_created",
        "deal_status_changed",
        "deal_archived",
      ],
      deal_member_role_enum: ["owner", "editor", "reviewer", "viewer"],
      debt_rate_type_enum: ["fixed", "floating", "hybrid"],
      escalation_rate_type_enum: ["effective_annual", "nominal_monthly"],
      inflation_convention_enum: ["year_1", "year_2"],
      lease_option_type_enum: [
        "renewal",
        "expansion",
        "contraction",
        "termination",
        "purchase",
      ],
      lease_status_enum: ["draft", "executed", "expired", "terminated"],
      lease_type_enum: [
        "nnn",
        "gross",
        "modified_gross",
        "ground_lease",
        "residential",
        "hotel_management",
        "membership",
        "license",
      ],
      percentage_rent_breakpoint_type_enum: ["natural", "artificial"],
      rent_determination_type_enum: [
        "fixed",
        "fair_market_value",
        "cpi_adjusted",
        "fixed_plus_cpi_floor",
      ],
      rent_step_escalation_type_enum: ["fixed_amount", "fixed_percent", "cpi"],
      sales_reporting_cadence_enum: ["monthly", "quarterly", "annual"],
      space_lifecycle_status: [
        "occupied",
        "vacant",
        "under_construction",
        "dark",
        "demolished",
      ],
      space_pool_type: ["leasing_pool", "liquidation_pool", "capex_pool"],
      space_type: [
        "office",
        "retail",
        "industrial",
        "residential_unit",
        "hotel_key",
        "parking",
        "storage",
        "common_area",
        "land",
        "hot_desk",
        "private_suite",
        "other",
      ],
      value_schedule_assumption_source_enum: [
        "market_leasing",
        "operating",
        "investment",
      ],
      value_schedule_period_type_enum: ["monthly", "annual"],
      waterfall_hurdle_type_enum: [
        "return_of_capital",
        "preferred_return",
        "irr_hurdle",
        "equity_multiple_hurdle",
        "residual",
      ],
    },
  },
} as const
