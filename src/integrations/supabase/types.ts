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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arguments: {
        Row: {
          argument_type: string
          content: string
          created_at: string
          debate_id: string
          edited_at: string | null
          id: string
          is_edited: boolean
          original_content: string | null
          parent_argument_id: string | null
          participant_id: string | null
          subtopic_id: string | null
        }
        Insert: {
          argument_type?: string
          content: string
          created_at?: string
          debate_id: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          original_content?: string | null
          parent_argument_id?: string | null
          participant_id?: string | null
          subtopic_id?: string | null
        }
        Update: {
          argument_type?: string
          content?: string
          created_at?: string
          debate_id?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          original_content?: string | null
          parent_argument_id?: string | null
          participant_id?: string | null
          subtopic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arguments_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_parent_argument_id_fkey"
            columns: ["parent_argument_id"]
            isOneToOne: false
            referencedRelation: "arguments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "debate_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arguments_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "debate_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_invitations: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          invite_token: string | null
          invited_email: string | null
          invited_user_id: string
          invited_username: string
          side_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          invited_user_id: string
          invited_username: string
          side_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          invited_user_id?: string
          invited_username?: string
          side_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_invitations_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_invitations_side_id_fkey"
            columns: ["side_id"]
            isOneToOne: false
            referencedRelation: "debate_sides"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_participants: {
        Row: {
          debate_id: string
          id: string
          joined_at: string
          participant_role: string
          side_id: string | null
          user_id: string
        }
        Insert: {
          debate_id: string
          id?: string
          joined_at?: string
          participant_role?: string
          side_id?: string | null
          user_id: string
        }
        Update: {
          debate_id?: string
          id?: string
          joined_at?: string
          participant_role?: string
          side_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_participants_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_participants_side_id_fkey"
            columns: ["side_id"]
            isOneToOne: false
            referencedRelation: "debate_sides"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_sides: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "debate_sides_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_subtopics: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_subtopics_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          name: string
          sides: Json
          subtopics: Json
          time_per_turn: string
          topic: string
          turns_per_subtopic: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_public?: boolean
          name: string
          sides?: Json
          subtopics?: Json
          time_per_turn?: string
          topic: string
          turns_per_subtopic?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name?: string
          sides?: Json
          subtopics?: Json
          time_per_turn?: string
          topic?: string
          turns_per_subtopic?: number
          updated_at?: string
        }
        Relationships: []
      }
      debate_transcripts: {
        Row: {
          argument_map: Json
          created_at: string
          debate_id: string
          id: string
          transcript_entries: Json
          updated_at: string
        }
        Insert: {
          argument_map?: Json
          created_at?: string
          debate_id: string
          id?: string
          transcript_entries?: Json
          updated_at?: string
        }
        Update: {
          argument_map?: Json
          created_at?: string
          debate_id?: string
          id?: string
          transcript_entries?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_transcripts_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: true
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
      }
      debates: {
        Row: {
          community_tag: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          current_speaker_side_id: string | null
          current_subtopic_index: number
          current_turn: number
          edit_window_ends_at: string | null
          ended_at: string | null
          facilitator_type: string
          facilitator_user_id: string | null
          id: string
          institution_tag: string | null
          is_public: boolean
          is_verified: boolean
          join_code: string | null
          location: string | null
          prep_duration_seconds: number | null
          prep_phase_active: boolean
          prep_phase_started_at: string | null
          prep_side1_ready: boolean
          prep_side2_ready: boolean
          prep_time_max: string
          prep_time_min: string
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["debate_status"]
          time_per_turn: string
          topic: string
          topic_category: string | null
          turn_started_at: string | null
          turns_per_subtopic: number
          updated_at: string
        }
        Insert: {
          community_tag?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          current_speaker_side_id?: string | null
          current_subtopic_index?: number
          current_turn?: number
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          id?: string
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          prep_duration_seconds?: number | null
          prep_phase_active?: boolean
          prep_phase_started_at?: string | null
          prep_side1_ready?: boolean
          prep_side2_ready?: boolean
          prep_time_max?: string
          prep_time_min?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["debate_status"]
          time_per_turn?: string
          topic: string
          topic_category?: string | null
          turn_started_at?: string | null
          turns_per_subtopic?: number
          updated_at?: string
        }
        Update: {
          community_tag?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          current_speaker_side_id?: string | null
          current_subtopic_index?: number
          current_turn?: number
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          id?: string
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          prep_duration_seconds?: number | null
          prep_phase_active?: boolean
          prep_phase_started_at?: string | null
          prep_side1_ready?: boolean
          prep_side2_ready?: boolean
          prep_time_max?: string
          prep_time_min?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["debate_status"]
          time_per_turn?: string
          topic?: string
          topic_category?: string | null
          turn_started_at?: string | null
          turns_per_subtopic?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debates_current_speaker_side_id_fkey"
            columns: ["current_speaker_side_id"]
            isOneToOne: false
            referencedRelation: "debate_sides"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          mode: string
          share_token: string | null
          speaker_names: Json
          status: string
          subtopics: Json
          summaries: Json
          title: string | null
          transcript_entries: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          mode?: string
          share_token?: string | null
          speaker_names?: Json
          status?: string
          subtopics?: Json
          summaries?: Json
          title?: string | null
          transcript_entries?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          mode?: string
          share_token?: string | null
          speaker_names?: Json
          status?: string
          subtopics?: Json
          summaries?: Json
          title?: string | null
          transcript_entries?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          affiliation: string | null
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          location: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      round_summaries: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          key_arguments: Json
          subtopic_id: string
          summary: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          key_arguments?: Json
          subtopic_id: string
          summary: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          key_arguments?: Json
          subtopic_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_summaries_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_summaries_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "debate_subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "personal" | "education" | "community"
      debate_status: "draft" | "scheduled" | "live" | "completed" | "archived"
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
      app_role: ["personal", "education", "community"],
      debate_status: ["draft", "scheduled", "live", "completed", "archived"],
    },
  },
} as const
