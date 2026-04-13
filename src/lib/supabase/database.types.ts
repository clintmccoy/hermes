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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
