export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: { id: string; workspace_id: string; label: string; starts_on: string; ends_on: string; is_active: boolean; created_at: string }
        Insert: { id?: string; workspace_id: string; label: string; starts_on: string; ends_on: string; is_active?: boolean; created_at?: string }
        Update: { id?: string; workspace_id?: string; label?: string; starts_on?: string; ends_on?: string; is_active?: boolean; created_at?: string }
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
      bootstrap_personal_workspace: {
        Args: { workspace_name?: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}