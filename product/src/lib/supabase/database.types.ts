export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: { id: string; workspace_id: string; label: string; starts_on: string; ends_on: string; is_active: boolean; created_at: string }
        Insert: { id?: string; workspace_id: string; label: string; starts_on: string; ends_on: string; is_active?: boolean; created_at?: string }
        Update: { id?: string; workspace_id?: string; label?: string; starts_on?: string; ends_on?: string; is_active?: boolean; created_at?: string }
        Relationships: []
      }
      annual_plan_sections: {
        Row: { id: string; workspace_id: string; academic_year_id: string; grade: string; section_code: string; status: string; source_note: string | null; created_by: string; confirmed_by: string | null; confirmed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; grade: string; section_code: string; status?: string; source_note?: string | null; created_by: string; confirmed_by?: string | null; confirmed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { status?: string; source_note?: string | null; confirmed_by?: string | null; confirmed_at?: string | null; updated_at?: string }
        Relationships: []
      }
      annual_plan_block_progress: {
        Row: { id: string; section_id: string; canonical_plan_asset_id: string; canonical_generation_id: string; block_id: string; status: string; executed_on: string | null; evidence_note: string | null; updated_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; section_id: string; canonical_plan_asset_id: string; canonical_generation_id: string; block_id: string; status?: string; executed_on?: string | null; evidence_note?: string | null; updated_by: string; created_at?: string; updated_at?: string }
        Update: { status?: string; executed_on?: string | null; evidence_note?: string | null; updated_by?: string; updated_at?: string }
        Relationships: []
      }
      calendar_days: {
        Row: { id: string; workspace_id: string; academic_year_id: string; local_date: string; day_kind: string; label: string; note: string | null; source_kind: string; source_ref: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; local_date: string; day_kind: string; label: string; note?: string | null; source_kind?: string; source_ref?: string | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { day_kind?: string; label?: string; note?: string | null; source_kind?: string; source_ref?: string | null; updated_at?: string }
        Relationships: []
      }
      calendar_events: {
        Row: { id: string; workspace_id: string; academic_year_id: string; title: string; event_kind: string; starts_on: string; ends_on: string; all_day: boolean; start_time: string | null; end_time: string | null; location: string | null; note: string | null; source_kind: string; source_ref: string | null; source_knowledge_unit_id: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; title: string; event_kind?: string; starts_on: string; ends_on: string; all_day?: boolean; start_time?: string | null; end_time?: string | null; location?: string | null; note?: string | null; source_kind?: string; source_ref?: string | null; source_knowledge_unit_id?: string | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { title?: string; event_kind?: string; starts_on?: string; ends_on?: string; all_day?: boolean; start_time?: string | null; end_time?: string | null; location?: string | null; note?: string | null; source_kind?: string; source_ref?: string | null; updated_at?: string }
        Relationships: []
      }
      experience_feedback: {
        Row: { id: string; workspace_id: string; academic_year_id: string | null; surface: string; journey: string; task_intent: string; context_ref: Json; satisfaction: number; comment: string | null; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id?: string | null; surface: string; journey: string; task_intent: string; context_ref?: Json; satisfaction: number; comment?: string | null; created_by: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; academic_year_id?: string | null; surface?: string; journey?: string; task_intent?: string; context_ref?: Json; satisfaction?: number; comment?: string | null; created_by?: string; created_at?: string }
        Relationships: []
      }
      knowledge_assets: {
        Row: { id: string; workspace_id: string; academic_year_id: string | null; asset_kind: string; source_provider: string; source_locator: string | null; original_name: string | null; original_text: string | null; mime_type: string | null; byte_size: number | null; sha256: string | null; processing_status: string; source_metadata: Json; current_generation_id: string | null; content_category: string; disciplines: string[]; class_labels: string[]; context_status: string; reliability: string; captured_at: string; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id?: string | null; asset_kind: string; source_provider: string; source_locator?: string | null; original_name?: string | null; original_text?: string | null; mime_type?: string | null; byte_size?: number | null; sha256?: string | null; processing_status?: string; source_metadata?: Json; current_generation_id?: string | null; content_category?: string; disciplines?: string[]; class_labels?: string[]; context_status?: string; reliability?: string; captured_at?: string; created_by: string; created_at?: string; updated_at?: string }
        Update: { academic_year_id?: string | null; original_name?: string | null; original_text?: string | null; mime_type?: string | null; byte_size?: number | null; processing_status?: string; source_metadata?: Json; current_generation_id?: string | null; content_category?: string; disciplines?: string[]; class_labels?: string[]; context_status?: string; reliability?: string; captured_at?: string; updated_at?: string }
        Relationships: []
      }
      knowledge_processing_generations: {
        Row: { id: string; asset_id: string; workspace_id: string; generation_no: number; status: string; processor_label: string | null; started_at: string; finished_at: string | null; error_message: string | null; created_at: string }
        Insert: { id?: string; asset_id: string; workspace_id: string; generation_no: number; status: string; processor_label?: string | null; started_at?: string; finished_at?: string | null; error_message?: string | null; created_at?: string }
        Update: { status?: string; processor_label?: string | null; finished_at?: string | null; error_message?: string | null }
        Relationships: []
      }
      knowledge_documents: {
        Row: { id: string; asset_id: string; generation_id: string; workspace_id: string; title: string | null; document_type: string; language: string; normalized_text: string | null; normalized_markdown: string | null; summary: string | null; extracted_data: Json; processing_version: string; search_vector: unknown; created_at: string; updated_at: string }
        Insert: { id?: string; asset_id: string; generation_id: string; workspace_id: string; title?: string | null; document_type?: string; language?: string; normalized_text?: string | null; normalized_markdown?: string | null; summary?: string | null; extracted_data?: Json; processing_version?: string; created_at?: string; updated_at?: string }
        Update: { title?: string | null; document_type?: string; language?: string; normalized_text?: string | null; normalized_markdown?: string | null; summary?: string | null; extracted_data?: Json; processing_version?: string; updated_at?: string }
        Relationships: []
      }
      knowledge_units: {
        Row: { id: string; document_id: string; workspace_id: string; ordinal: number; unit_type: string; title: string | null; content: string; structured_data: Json; source_page: number | null; start_offset: number | null; end_offset: number | null; confidence: number | null; validation_status: string; search_vector: unknown; created_at: string; updated_at: string }
        Insert: { id?: string; document_id: string; workspace_id: string; ordinal?: number; unit_type: string; title?: string | null; content: string; structured_data?: Json; source_page?: number | null; start_offset?: number | null; end_offset?: number | null; confidence?: number | null; validation_status?: string; created_at?: string; updated_at?: string }
        Update: { ordinal?: number; unit_type?: string; title?: string | null; content?: string; structured_data?: Json; source_page?: number | null; start_offset?: number | null; end_offset?: number | null; confidence?: number | null; validation_status?: string; updated_at?: string }
        Relationships: []
      }
      knowledge_links: {
        Row: { id: string; workspace_id: string; asset_id: string | null; unit_id: string | null; relation_type: string; target_type: string; target_ref: string; metadata: Json; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; asset_id?: string | null; unit_id?: string | null; relation_type: string; target_type: string; target_ref: string; metadata?: Json; created_by: string; created_at?: string }
        Update: { relation_type?: string; target_type?: string; target_ref?: string; metadata?: Json }
        Relationships: []
      }
      knowledge_ingestion_runs: {
        Row: { id: string; workspace_id: string; asset_id: string; stage: string; status: string; processor: string; processor_version: string | null; details: Json; error_code: string | null; error_message: string | null; started_at: string | null; finished_at: string | null; created_at: string }
        Insert: { id?: string; workspace_id: string; asset_id: string; stage: string; status: string; processor: string; processor_version?: string | null; details?: Json; error_code?: string | null; error_message?: string | null; started_at?: string | null; finished_at?: string | null; created_at?: string }
        Update: { status?: string; processor_version?: string | null; details?: Json; error_code?: string | null; error_message?: string | null; started_at?: string | null; finished_at?: string | null }
        Relationships: []
      }
      planner_tasks: {
        Row: { id: string; workspace_id: string; academic_year_id: string | null; title: string; notes: string | null; status: string; priority: string; due_at: string | null; planned_for: string | null; source_kind: string; source_ref: string | null; created_by: string; completed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id?: string | null; title: string; notes?: string | null; status?: string; priority?: string; due_at?: string | null; planned_for?: string | null; source_kind?: string; source_ref?: string | null; created_by: string; completed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; workspace_id?: string; academic_year_id?: string | null; title?: string; notes?: string | null; status?: string; priority?: string; due_at?: string | null; planned_for?: string | null; source_kind?: string; source_ref?: string | null; created_by?: string; completed_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      profiles: {
        Row: { user_id: string; display_name: string | null; created_at: string; updated_at: string }
        Insert: { user_id: string; display_name?: string | null; created_at?: string; updated_at?: string }
        Update: { user_id?: string; display_name?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      teacher_workspace_settings: {
        Row: { id: string; workspace_id: string; academic_year_id: string; user_id: string; teacher_display_name: string; school_name: string; school_code: string | null; school_city: string | null; school_type: string; daily_period_count: number; school_day_start: string; default_period_minutes: number; teaching_weekdays: number[]; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; user_id: string; teacher_display_name?: string; school_name?: string; school_code?: string | null; school_city?: string | null; school_type?: string; daily_period_count?: number; school_day_start?: string; default_period_minutes?: number; teaching_weekdays?: number[]; created_at?: string; updated_at?: string }
        Update: { teacher_display_name?: string; school_name?: string; school_code?: string | null; school_city?: string | null; school_type?: string; daily_period_count?: number; school_day_start?: string; default_period_minutes?: number; teaching_weekdays?: number[]; updated_at?: string }
        Relationships: []
      }
      teaching_assignments: {
        Row: { id: string; workspace_id: string; academic_year_id: string; section_id: string; discipline_id: string; weekly_minutes: number; status: string; source_note: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; section_id: string; discipline_id: string; weekly_minutes?: number; status?: string; source_note?: string | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { weekly_minutes?: number; status?: string; source_note?: string | null; updated_at?: string }
        Relationships: []
      }
      teaching_disciplines: {
        Row: { id: string; workspace_id: string; academic_year_id: string; name: string; is_active: boolean; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; name: string; is_active?: boolean; created_by: string; created_at?: string; updated_at?: string }
        Update: { name?: string; is_active?: boolean; updated_at?: string }
        Relationships: []
      }
      timetable_versions: {
        Row: { id: string; workspace_id: string; academic_year_id: string; label: string; status: string; effective_from: string; effective_to: string | null; source_kind: string; source_ref: string | null; revision: number; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; label: string; status?: string; effective_from: string; effective_to?: string | null; source_kind?: string; source_ref?: string | null; revision?: number; created_by: string; created_at?: string; updated_at?: string }
        Update: { label?: string; status?: string; effective_from?: string; effective_to?: string | null; source_kind?: string; source_ref?: string | null; revision?: number; updated_at?: string }
        Relationships: []
      }
      timetable_slots: {
        Row: { id: string; timetable_version_id: string; weekday: number; start_time: string; end_time: string; slot_kind: string; section_id: string | null; discipline_id: string | null; teaching_assignment_id: string | null; manual_class_label: string | null; presence_kind: string | null; activity_kind: string | null; room: string | null; note: string | null; ordinal: number | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; timetable_version_id: string; weekday: number; start_time: string; end_time: string; slot_kind?: string; section_id?: string | null; discipline_id?: string | null; teaching_assignment_id?: string | null; manual_class_label?: string | null; presence_kind?: string | null; activity_kind?: string | null; room?: string | null; note?: string | null; ordinal?: number | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { weekday?: number; start_time?: string; end_time?: string; slot_kind?: string; section_id?: string | null; discipline_id?: string | null; teaching_assignment_id?: string | null; manual_class_label?: string | null; presence_kind?: string | null; activity_kind?: string | null; room?: string | null; note?: string | null; ordinal?: number | null; updated_at?: string }
        Relationships: []
      }
      timetable_import_candidates: {
        Row: { id: string; workspace_id: string; academic_year_id: string; source_fingerprint: string; source_kind: string; source_label: string; source_ref: string | null; effective_from_candidate: string | null; source_is_provisional: boolean; source_scope: string; state: string; revision: number; parser_version: string; created_by: string; created_at: string; updated_at: string; expires_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; source_fingerprint: string; source_kind?: string; source_label: string; source_ref?: string | null; effective_from_candidate?: string | null; source_is_provisional?: boolean; source_scope?: string; state?: string; revision?: number; parser_version: string; created_by: string; created_at?: string; updated_at?: string; expires_at?: string }
        Update: { source_label?: string; source_ref?: string | null; effective_from_candidate?: string | null; source_is_provisional?: boolean; source_scope?: string; state?: string; revision?: number; parser_version?: string; updated_at?: string; expires_at?: string }
        Relationships: []
      }
      timetable_import_candidate_rows: {
        Row: { id: string; candidate_id: string; candidate_revision: number; row_key: string; weekday: number | null; ordinal: number | null; start_time: string | null; end_time: string | null; source_class_label: string | null; resolved_section_id: string | null; resolved_assignment_id: string | null; proposed_slot_kind: string | null; proposed_manual_class_label: string | null; proposed_presence_kind: string | null; confidence: string; review_state: string; evidence_ref: string | null; warnings: Json; created_at: string; updated_at: string }
        Insert: { id?: string; candidate_id: string; candidate_revision: number; row_key: string; weekday?: number | null; ordinal?: number | null; start_time?: string | null; end_time?: string | null; source_class_label?: string | null; resolved_section_id?: string | null; resolved_assignment_id?: string | null; proposed_slot_kind?: string | null; proposed_manual_class_label?: string | null; proposed_presence_kind?: string | null; confidence: string; review_state: string; evidence_ref?: string | null; warnings?: Json; created_at?: string; updated_at?: string }
        Update: { candidate_revision?: number; weekday?: number | null; ordinal?: number | null; start_time?: string | null; end_time?: string | null; source_class_label?: string | null; resolved_section_id?: string | null; resolved_assignment_id?: string | null; proposed_slot_kind?: string | null; proposed_manual_class_label?: string | null; proposed_presence_kind?: string | null; confidence?: string; review_state?: string; evidence_ref?: string | null; warnings?: Json; updated_at?: string }
        Relationships: []
      }
      timetable_import_apply_receipts: {
        Row: { id: string; workspace_id: string; candidate_id: string; candidate_revision: number; confirmation_request_id: string; draft_version_id: string; expected_draft_revision: number; resulting_draft_revision: number; operations_digest: string; applied_at: string; applied_by: string }
        Insert: { id?: string; workspace_id: string; candidate_id: string; candidate_revision: number; confirmation_request_id: string; draft_version_id: string; expected_draft_revision: number; resulting_draft_revision: number; operations_digest: string; applied_at: string; applied_by: string }
        Update: { never?: never }
        Relationships: []
      }
      workspace_memberships: {
        Row: { workspace_id: string; user_id: string; role: string; created_at: string }
        Insert: { workspace_id: string; user_id: string; role: string; created_at?: string }
        Update: { workspace_id?: string; user_id?: string; role?: string; created_at?: string }
        Relationships: []
      }
      workspaces: {
        Row: { id: string; kind: string; name: string; owner_user_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; kind: string; name: string; owner_user_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; kind?: string; name?: string; owner_user_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      bootstrap_personal_workspace: { Args: { workspace_name?: string }; Returns: string }
      search_knowledge_full_text_current: {
        Args: { p_workspace_id: string; p_query: string; p_limit?: number }
        Returns: Array<{
          document_id: string
          document_asset_id: string
          document_generation_id: string
          document_workspace_id: string
          document_title: string | null
          document_type: string
          document_language: string
          document_normalized_text: string | null
          document_normalized_markdown: string | null
          document_summary: string | null
          document_extracted_data: Json
          document_processing_version: string
          document_created_at: string
          document_updated_at: string
          unit_id: string
          unit_document_id: string
          unit_workspace_id: string
          unit_ordinal: number
          unit_type: string
          unit_title: string | null
          unit_content: string
          unit_structured_data: Json
          unit_source_page: number | null
          unit_start_offset: number | null
          unit_end_offset: number | null
          unit_confidence: number | null
          unit_validation_status: string
          unit_created_at: string
          unit_updated_at: string
          rank: number
        }>
      }
      read_timetable_draft_revision_token: { Args: { p_version_id: string }; Returns: string }
      apply_confirmed_timetable_import_v1: {
        Args: {
          p_candidate_id: string
          p_candidate_revision: string
          p_expected_draft_version_id: string
          p_expected_draft_token: string
          p_confirmation_request_id: string
          p_teacher_complete_confirmed: boolean
        }
        Returns: Json
      }
      replace_timetable_import_candidate_v1: {
        Args: {
          p_workspace_id: string
          p_academic_year_id: string
          p_source_fingerprint: string
          p_source_label: string
          p_source_ref: string
          p_effective_from: string
          p_parser_version: string
          p_rows: Json
          p_replace_reviewed: boolean
        }
        Returns: Json
      }
      update_timetable_import_row_v1: {
        Args: {
          p_candidate_id: string
          p_expected_revision: string
          p_row_id: string
          p_assignment_id: string
          p_weekday: number
          p_ordinal: number
          p_start_time: string
          p_end_time: string
        }
        Returns: Json
      }
      add_timetable_import_row_v1: {
        Args: {
          p_candidate_id: string
          p_expected_revision: string
          p_assignment_id: string
          p_weekday: number
          p_ordinal: number
          p_start_time: string
          p_end_time: string
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
