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
      knowledge_assets: {
        Row: { id: string; workspace_id: string; academic_year_id: string | null; asset_kind: string; source_provider: string; source_locator: string | null; original_name: string | null; original_text: string | null; mime_type: string | null; byte_size: number | null; sha256: string | null; processing_status: string; source_metadata: Json; captured_at: string; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; workspace_id: string; academic_year_id?: string | null; asset_kind: string; source_provider: string; source_locator?: string | null; original_name?: string | null; original_text?: string | null; mime_type?: string | null; byte_size?: number | null; sha256?: string | null; processing_status?: string; source_metadata?: Json; captured_at?: string; created_by: string; created_at?: string; updated_at?: string }
        Update: { academic_year_id?: string | null; original_name?: string | null; original_text?: string | null; mime_type?: string | null; byte_size?: number | null; processing_status?: string; source_metadata?: Json; captured_at?: string; updated_at?: string }
        Relationships: []
      }
      knowledge_documents: {
        Row: { id: string; asset_id: string; workspace_id: string; title: string | null; document_type: string; language: string; normalized_text: string | null; normalized_markdown: string | null; summary: string | null; extracted_data: Json; processing_version: string; search_vector: unknown; created_at: string; updated_at: string }
        Insert: { id?: string; asset_id: string; workspace_id: string; title?: string | null; document_type?: string; language?: string; normalized_text?: string | null; normalized_markdown?: string | null; summary?: string | null; extracted_data?: Json; processing_version?: string; created_at?: string; updated_at?: string }
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
