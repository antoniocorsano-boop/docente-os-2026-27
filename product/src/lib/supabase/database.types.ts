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
        Row: { id: string; workspace_id: string; academic_year_id: string; label: string; status: string; effective_from: string; effective_to: string | null; source_kind: string; source_ref: string | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id: string; label: string; status?: string; effective_from: string; effective_to?: string | null; source_kind?: string; source_ref?: string | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { label?: string; status?: string; effective_from?: string; effective_to?: string | null; source_kind?: string; source_ref?: string | null; updated_at?: string }
        Relationships: []
      }
      timetable_slots: {
        Row: { id: string; timetable_version_id: string; weekday: number; start_time: string; end_time: string; slot_kind: string; section_id: string | null; discipline_id: string | null; teaching_assignment_id: string | null; manual_class_label: string | null; presence_kind: string | null; room: string | null; note: string | null; ordinal: number | null; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; timetable_version_id: string; weekday: number; start_time: string; end_time: string; slot_kind?: string; section_id?: string | null; discipline_id?: string | null; teaching_assignment_id?: string | null; manual_class_label?: string | null; presence_kind?: string | null; room?: string | null; note?: string | null; ordinal?: number | null; created_by: string; created_at?: string; updated_at?: string }
        Update: { weekday?: number; start_time?: string; end_time?: string; slot_kind?: string; section_id?: string | null; discipline_id?: string | null; teaching_assignment_id?: string | null; manual_class_label?: string | null; presence_kind?: string | null; room?: string | null; note?: string | null; ordinal?: number | null; updated_at?: string }
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
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}