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
      connections: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      debate_grades: {
        Row: {
          argument_quality: number | null
          clarity_structure: number | null
          created_at: string
          criticism: string | null
          debate_id: string
          grade_kind: string
          graded_content: string | null
          id: string
          narrative: string | null
          opposition_engagement: number | null
          overall_label: string | null
          overall_score: number | null
          participant_id: string
          resolution_label: string | null
          resolution_score: number | null
          stakes_articulation: number | null
          subtopic_id: string | null
          suggestion: string | null
          turn_index: number | null
          user_id: string
        }
        Insert: {
          argument_quality?: number | null
          clarity_structure?: number | null
          created_at?: string
          criticism?: string | null
          debate_id: string
          grade_kind?: string
          graded_content?: string | null
          id?: string
          narrative?: string | null
          opposition_engagement?: number | null
          overall_label?: string | null
          overall_score?: number | null
          participant_id: string
          resolution_label?: string | null
          resolution_score?: number | null
          stakes_articulation?: number | null
          subtopic_id?: string | null
          suggestion?: string | null
          turn_index?: number | null
          user_id: string
        }
        Update: {
          argument_quality?: number | null
          clarity_structure?: number | null
          created_at?: string
          criticism?: string | null
          debate_id?: string
          grade_kind?: string
          graded_content?: string | null
          id?: string
          narrative?: string | null
          opposition_engagement?: number | null
          overall_label?: string | null
          overall_score?: number | null
          participant_id?: string
          resolution_label?: string | null
          resolution_score?: number | null
          stakes_articulation?: number | null
          subtopic_id?: string | null
          suggestion?: string | null
          turn_index?: number | null
          user_id?: string
        }
        Relationships: []
      }
      debate_interest_messages: {
        Row: {
          body: string
          created_at: string
          debate_id: string
          id: string
          interest_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          debate_id: string
          id?: string
          interest_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          debate_id?: string
          id?: string
          interest_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_interest_messages_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "debate_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_interests: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          proposed_time: string | null
          role: string
          side_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          proposed_time?: string | null
          role?: string
          side_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          proposed_time?: string | null
          role?: string
          side_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debate_invitations: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          invite_token: string | null
          invite_token_hash: string | null
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
          invite_token_hash?: string | null
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
          invite_token_hash?: string | null
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
      debate_tags: {
        Row: {
          created_at: string
          debate_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_tags_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
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
          description: string | null
          edit_window_ends_at: string | null
          ended_at: string | null
          facilitator_type: string
          facilitator_user_id: string | null
          feedback_enabled: boolean
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
          description?: string | null
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          feedback_enabled?: boolean
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
          description?: string | null
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          feedback_enabled?: boolean
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
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          debate_id: string | null
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          debate_id?: string | null
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          debate_id?: string | null
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      live_session_tags: {
        Row: {
          created_at: string
          live_session_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          live_session_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          live_session_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_tags_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
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
          is_public: boolean
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
          is_public?: boolean
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
          is_public?: boolean
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
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          debate_id: string | null
          id: string
          interest_id: string | null
          is_read: boolean
          metadata: Json
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          debate_id?: string | null
          id?: string
          interest_id?: string | null
          is_read?: boolean
          metadata?: Json
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          debate_id?: string | null
          id?: string
          interest_id?: string | null
          is_read?: boolean
          metadata?: Json
          recipient_id?: string
          title?: string
          type?: string
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
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          debate_count: number
          description: string | null
          id: string
          is_official: boolean
          name: string
          parent_tag_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          debate_count?: number
          description?: string | null
          id?: string
          is_official?: boolean
          name: string
          parent_tag_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          debate_count?: number
          description?: string | null
          id?: string
          is_official?: boolean
          name?: string
          parent_tag_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_parent_tag_id_fkey"
            columns: ["parent_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_debate: { Args: { _debate_id: string }; Returns: boolean }
      create_debate_invitation: {
        Args: {
          _debate_id: string
          _invited_email: string
          _invited_user_id: string
          _invited_username: string
          _side_id: string
        }
        Returns: {
          id: string
          invite_token: string
        }[]
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          debate_id: string
          id: string
          invited_email: string
          invited_username: string
          side_id: string
          status: string
        }[]
      }
      get_or_create_dm_thread: {
        Args: { _debate_id?: string; _other_user: string }
        Returns: string
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          affiliation: string
          avatar_url: string
          banner_url: string
          created_at: string
          display_name: string
          is_public: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_recommended_users: {
        Args: { _limit?: number }
        Returns: {
          affiliation: string
          avatar_url: string
          display_name: string
          location: string
          mutual_count: number
          same_location: boolean
          score: number
          shared_tags: string[]
          user_id: string
        }[]
      }
      get_shared_live_session: {
        Args: { _token: string }
        Returns: {
          created_at: string
          ended_at: string
          id: string
          mode: string
          speaker_names: Json
          status: string
          subtopics: Json
          summaries: Json
          title: string
          transcript_entries: Json
        }[]
      }
      invitation_is_visible: {
        Args: {
          _inv: Database["public"]["Tables"]["debate_invitations"]["Row"]
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_dm_thread_party: { Args: { _thread_id: string }; Returns: boolean }
      is_interest_party: { Args: { _interest_id: string }; Returns: boolean }
      realtime_topic_debate_id: { Args: { _topic: string }; Returns: string }
    }
    Enums: {
      app_role: "personal" | "education" | "community" | "admin"
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
      app_role: ["personal", "education", "community", "admin"],
      debate_status: ["draft", "scheduled", "live", "completed", "archived"],
    },
  },
} as const
