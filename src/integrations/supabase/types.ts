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
      club_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "club_events"
            referencedColumns: ["id"]
          },
        ]
      }
      club_events: {
        Row: {
          capacity: number | null
          club_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          mode: string
          session_id: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          capacity?: number | null
          club_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          mode?: string
          session_id?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          capacity?: number | null
          club_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          mode?: string
          session_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tags: {
        Row: {
          club_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_tags_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cmm_queue: {
        Row: {
          created_at: string
          debate_id: string
          ended_at: string | null
          id: string
          position_text: string
          preferred_subtopic_id: string | null
          queue_index: number
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          ended_at?: string | null
          id?: string
          position_text: string
          preferred_subtopic_id?: string | null
          queue_index?: number
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          ended_at?: string | null
          id?: string
          position_text?: string
          preferred_subtopic_id?: string | null
          queue_index?: number
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
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
      debate_notify_subscriptions: {
        Row: {
          created_at: string
          debate_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
          format: string
          grading_enabled: boolean
          id: string
          institution_tag: string | null
          is_public: boolean
          is_verified: boolean
          join_code: string | null
          location: string | null
          max_speakers_per_side: number
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
          format?: string
          grading_enabled?: boolean
          id?: string
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          max_speakers_per_side?: number
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
          format?: string
          grading_enabled?: boolean
          id?: string
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          max_speakers_per_side?: number
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
          metadata: Json
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
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
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_id?: string
        }
        Relationships: []
      }
      live_session_entries: {
        Row: {
          client_ts: string
          created_at: string
          device_id: string
          id: string
          session_id: string
          speaker_name: string
          speaker_slot: number
          text: string
          user_id: string | null
          words: Json
        }
        Insert: {
          client_ts: string
          created_at?: string
          device_id: string
          id?: string
          session_id: string
          speaker_name: string
          speaker_slot: number
          text: string
          user_id?: string | null
          words?: Json
        }
        Update: {
          client_ts?: string
          created_at?: string
          device_id?: string
          id?: string
          session_id?: string
          speaker_name?: string
          speaker_slot?: number
          text?: string
          user_id?: string | null
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "live_session_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_participants: {
        Row: {
          avatar_url: string | null
          device_id: string
          display_name: string
          joined_at: string
          last_seen_at: string
          session_id: string
          speaker_slot: number
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          device_id: string
          display_name: string
          joined_at?: string
          last_seen_at?: string
          session_id: string
          speaker_slot: number
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          device_id?: string
          display_name?: string
          joined_at?: string
          last_seen_at?: string
          session_id?: string
          speaker_slot?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          cover_image_url: string | null
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          is_public: boolean
          join_code: string | null
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
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
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
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
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
      notebook_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebook_reader_notes: {
        Row: {
          anchor_char_end: number | null
          anchor_char_start: number | null
          anchor_excerpt: string | null
          anchor_kind: string | null
          body: string
          created_at: string
          dismissed_from_thoughts: boolean
          dm_thread_id: string | null
          id: string
          notebook_id: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          anchor_char_end?: number | null
          anchor_char_start?: number | null
          anchor_excerpt?: string | null
          anchor_kind?: string | null
          body: string
          created_at?: string
          dismissed_from_thoughts?: boolean
          dm_thread_id?: string | null
          id?: string
          notebook_id: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          anchor_char_end?: number | null
          anchor_char_start?: number | null
          anchor_excerpt?: string | null
          anchor_kind?: string | null
          body?: string
          created_at?: string
          dismissed_from_thoughts?: boolean
          dm_thread_id?: string | null
          id?: string
          notebook_id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_reader_notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "session_notebooks"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      record_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          record_id: string
          record_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          record_id: string
          record_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          record_id?: string
          record_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "record_comments"
            referencedColumns: ["id"]
          },
        ]
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
      session_annotations: {
        Row: {
          char_end: number | null
          char_start: number | null
          created_at: string
          excerpt: string
          id: string
          node_id: string
          node_kind: string
          note: string
          record_id: string
          record_type: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          created_at?: string
          excerpt: string
          id?: string
          node_id: string
          node_kind: string
          note?: string
          record_id: string
          record_type?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          created_at?: string
          excerpt?: string
          id?: string
          node_id?: string
          node_kind?: string
          note?: string
          record_id?: string
          record_type?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_citations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          session_id: string
          summary_node_id: string
          text: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          session_id: string
          summary_node_id: string
          text: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          session_id?: string
          summary_node_id?: string
          text?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_citations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_cross_refs: {
        Row: {
          confidence: number | null
          created_at: string
          from_node: string
          id: string
          kind: string
          session_id: string
          to_node: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          from_node: string
          id?: string
          kind: string
          session_id: string
          to_node: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          from_node?: string
          id?: string
          kind?: string
          session_id?: string
          to_node?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_cross_refs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notebooks: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_title: string | null
          folder_id: string | null
          id: string
          my_take: string | null
          published: boolean
          published_at: string | null
          record_id: string
          record_type: string
          session_id: string | null
          share_token: string | null
          sort_index: number
          thoughts: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_title?: string | null
          folder_id?: string | null
          id?: string
          my_take?: string | null
          published?: boolean
          published_at?: string | null
          record_id: string
          record_type?: string
          session_id?: string | null
          share_token?: string | null
          sort_index?: number
          thoughts?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_title?: string | null
          folder_id?: string | null
          id?: string
          my_take?: string | null
          published?: boolean
          published_at?: string | null
          record_id?: string
          record_type?: string
          session_id?: string | null
          share_token?: string | null
          sort_index?: number
          thoughts?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notebooks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "notebook_folders"
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
      can_view_club: { Args: { _club_id: string }; Returns: boolean }
      can_view_debate: { Args: { _debate_id: string }; Returns: boolean }
      can_view_live_session: { Args: { _session_id: string }; Returns: boolean }
      can_view_record: {
        Args: { _record_id: string; _record_type: string }
        Returns: boolean
      }
      cmm_end_round: {
        Args: { _debate_id: string; _outcome?: string }
        Returns: {
          created_at: string
          debate_id: string
          ended_at: string | null
          id: string
          position_text: string
          preferred_subtopic_id: string | null
          queue_index: number
          started_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cmm_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cmm_join_queue: {
        Args: {
          _debate_id: string
          _position: string
          _preferred_subtopic?: string
        }
        Returns: {
          created_at: string
          debate_id: string
          ended_at: string | null
          id: string
          position_text: string
          preferred_subtopic_id: string | null
          queue_index: number
          started_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cmm_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cmm_start_next: {
        Args: { _debate_id: string }
        Returns: {
          created_at: string
          debate_id: string
          ended_at: string | null
          id: string
          position_text: string
          preferred_subtopic_id: string | null
          queue_index: number
          started_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cmm_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      debate_tag_count: { Args: { _debate_id: string }; Returns: number }
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
      get_profile_card: {
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
          follow_status: string
          is_public: boolean
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
      get_shared_notebook: {
        Args: { _token: string }
        Returns: {
          display_title: string
          id: string
          my_take: string
          published: boolean
          published_at: string
          session_created_at: string
          session_id: string
          session_title: string
          thoughts: Json
          updated_at: string
        }[]
      }
      get_shared_notebook_for_reader: {
        Args: { _token: string }
        Returns: {
          display_title: string
          id: string
          my_notes: Json
          my_take: string
          owner_id: string
          published: boolean
          published_at: string
          session_created_at: string
          session_id: string
          session_title: string
          thoughts: Json
          updated_at: string
        }[]
      }
      invitation_is_visible: {
        Args: {
          _inv: Database["public"]["Tables"]["debate_invitations"]["Row"]
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_club_admin: { Args: { _club_id: string }; Returns: boolean }
      is_club_member: { Args: { _club_id: string }; Returns: boolean }
      is_club_owner: { Args: { _club_id: string }; Returns: boolean }
      is_dm_thread_party: { Args: { _thread_id: string }; Returns: boolean }
      is_follower_of: { Args: { _owner: string }; Returns: boolean }
      is_interest_party: { Args: { _interest_id: string }; Returns: boolean }
      is_live_session_host: { Args: { _session_id: string }; Returns: boolean }
      is_notebook_owner: { Args: { _notebook_id: string }; Returns: boolean }
      join_debate_in_person: {
        Args: { _code: string; _side_id: string }
        Returns: {
          became_audience: boolean
          debate_id: string
          side_id: string
        }[]
      }
      join_live_session: {
        Args: {
          _avatar_url?: string
          _code: string
          _device_id: string
          _display_name: string
        }
        Returns: {
          host_user_id: string
          mode: string
          session_id: string
          speaker_slot: number
          title: string
        }[]
      }
      live_session_heartbeat: {
        Args: { _device_id: string; _session_id: string }
        Returns: undefined
      }
      purge_stale_live_participants: {
        Args: { _session_id: string }
        Returns: undefined
      }
      realtime_topic_debate_id: { Args: { _topic: string }; Returns: string }
      request_follow: {
        Args: { _target: string }
        Returns: {
          status: string
        }[]
      }
      respond_follow_request: {
        Args: { _accept: boolean; _request_id: string }
        Returns: {
          status: string
        }[]
      }
      search_profile_cards: {
        Args: { _limit?: number; _q: string }
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
      submit_reader_note: {
        Args: {
          _anchor_char_end?: number
          _anchor_char_start?: number
          _anchor_excerpt?: string
          _anchor_kind?: string
          _body: string
          _token: string
        }
        Returns: {
          anchor_char_end: number | null
          anchor_char_start: number | null
          anchor_excerpt: string | null
          anchor_kind: string | null
          body: string
          created_at: string
          dismissed_from_thoughts: boolean
          dm_thread_id: string | null
          id: string
          notebook_id: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notebook_reader_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
