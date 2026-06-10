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
      ai_usage_log: {
        Row: {
          cost_usd: number
          created_at: string
          function_name: string
          id: string
          input_tokens: number
          model: string | null
          output_tokens: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      argument_units: {
        Row: {
          anatomy: Json
          created_at: string
          id: string
          is_standalone_concession: boolean
          pass_kind: string
          relates_to: string | null
          relationship_note: string | null
          relationship_tag: string
          session_id: string
          session_kind: string
          source_text: string
          speaker_label: string | null
          speaker_side: string | null
          subtopic_id: string | null
          subtopic_title: string | null
          thread_id: string
          turn_index: number
          updated_at: string
        }
        Insert: {
          anatomy?: Json
          created_at?: string
          id?: string
          is_standalone_concession?: boolean
          pass_kind?: string
          relates_to?: string | null
          relationship_note?: string | null
          relationship_tag: string
          session_id: string
          session_kind: string
          source_text: string
          speaker_label?: string | null
          speaker_side?: string | null
          subtopic_id?: string | null
          subtopic_title?: string | null
          thread_id: string
          turn_index?: number
          updated_at?: string
        }
        Update: {
          anatomy?: Json
          created_at?: string
          id?: string
          is_standalone_concession?: boolean
          pass_kind?: string
          relates_to?: string | null
          relationship_note?: string | null
          relationship_tag?: string
          session_id?: string
          session_kind?: string
          source_text?: string
          speaker_label?: string | null
          speaker_side?: string | null
          subtopic_id?: string | null
          subtopic_title?: string | null
          thread_id?: string
          turn_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "argument_units_relates_to_fkey"
            columns: ["relates_to"]
            isOneToOne: false
            referencedRelation: "argument_units"
            referencedColumns: ["id"]
          },
        ]
      }
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
      backup_runs: {
        Row: {
          artifact: string | null
          bytes: number | null
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          started_at: string
          status: string
        }
        Insert: {
          artifact?: string | null
          bytes?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          started_at?: string
          status: string
        }
        Update: {
          artifact?: string | null
          bytes?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_type: string
          fee_cents: number | null
          id: string
          raw: Json | null
          stripe_event_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          fee_cents?: number | null
          id?: string
          raw?: Json | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          fee_cents?: number | null
          id?: string
          raw?: Json | null
          stripe_event_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      club_audit_log: {
        Row: {
          action: string
          actor_id: string
          club_id: string
          created_at: string
          id: string
          snapshot: Json | null
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          action: string
          actor_id: string
          club_id: string
          created_at?: string
          id?: string
          snapshot?: Json | null
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          club_id?: string
          created_at?: string
          id?: string
          snapshot?: Json | null
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_audit_log_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          mode: string
          recurrence_rule: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          mode?: string
          recurrence_rule?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          mode?: string
          recurrence_rule?: string | null
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
          deleted_at: string | null
          deleted_by: string | null
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
      club_pinned_items: {
        Row: {
          club_id: string
          created_at: string
          id: string
          kind: string
          pinned_by: string
          sort_order: number
          target_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          kind: string
          pinned_by: string
          sort_order?: number
          target_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          kind?: string
          pinned_by?: string
          sort_order?: number
          target_id?: string
        }
        Relationships: []
      }
      club_tags: {
        Row: {
          club_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          tag_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          tag_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          location: string | null
          name: string
          primary_tag_id: string | null
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          location?: string | null
          name: string
          primary_tag_id?: string | null
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          location?: string | null
          name?: string
          primary_tag_id?: string | null
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_primary_tag_id_fkey"
            columns: ["primary_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
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
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          severity: number
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Relationships: []
      }
      content_sanctions: {
        Row: {
          appeal_note: string | null
          appeal_status: string | null
          appealed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          issued_by: string
          kind: Database["public"]["Enums"]["sanction_kind"]
          reason: string | null
          related_report_id: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          appeal_note?: string | null
          appeal_status?: string | null
          appealed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by: string
          kind: Database["public"]["Enums"]["sanction_kind"]
          reason?: string | null
          related_report_id?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          appeal_note?: string | null
          appeal_status?: string | null
          appealed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string
          kind?: Database["public"]["Enums"]["sanction_kind"]
          reason?: string | null
          related_report_id?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sanctions_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_alerts: {
        Row: {
          alert_type: string
          fired_at: string
          id: string
          period_key: string
          source: string | null
          threshold: number | null
        }
        Insert: {
          alert_type: string
          fired_at?: string
          id?: string
          period_key: string
          source?: string | null
          threshold?: number | null
        }
        Update: {
          alert_type?: string
          fired_at?: string
          id?: string
          period_key?: string
          source?: string | null
          threshold?: number | null
        }
        Relationships: []
      }
      daily_costs: {
        Row: {
          cost_usd: number
          created_at: string
          date: string
          id: string
          source: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          date: string
          id?: string
          source: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          date?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      debate_access_requests: {
        Row: {
          created_at: string
          debate_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "debate_access_requests_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
        ]
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
          active_host_heartbeat_at: string | null
          active_host_user_id: string | null
          community_tag: string | null
          continuation_index: number
          continuation_root_id: string | null
          continued_from_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          current_speaker_side_id: string | null
          current_subtopic_index: number
          current_turn: number
          deletion_scheduled_at: string | null
          description: string | null
          edit_window_ends_at: string | null
          ended_at: string | null
          facilitator_type: string
          facilitator_user_id: string | null
          feedback_enabled: boolean
          forked_at: string | null
          forked_from_id: string | null
          format: string
          grading_enabled: boolean
          id: string
          imported_source_kind: string | null
          imported_source_url: string | null
          institution_tag: string | null
          is_public: boolean
          is_verified: boolean
          join_code: string | null
          location: string | null
          max_speakers_per_side: number
          pause_reason: string | null
          pause_remaining_seconds: number | null
          paused_at: string | null
          prep_duration_seconds: number | null
          prep_phase_active: boolean
          prep_phase_started_at: string | null
          prep_side1_ready: boolean
          prep_side2_ready: boolean
          prep_time_max: string
          prep_time_min: string
          scheduled_at: string | null
          speaker_pause_owner_id: string | null
          speaker_pause_used_turn_key: string | null
          speaker_paused_at: string | null
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
          active_host_heartbeat_at?: string | null
          active_host_user_id?: string | null
          community_tag?: string | null
          continuation_index?: number
          continuation_root_id?: string | null
          continued_from_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          current_speaker_side_id?: string | null
          current_subtopic_index?: number
          current_turn?: number
          deletion_scheduled_at?: string | null
          description?: string | null
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          feedback_enabled?: boolean
          forked_at?: string | null
          forked_from_id?: string | null
          format?: string
          grading_enabled?: boolean
          id?: string
          imported_source_kind?: string | null
          imported_source_url?: string | null
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          max_speakers_per_side?: number
          pause_reason?: string | null
          pause_remaining_seconds?: number | null
          paused_at?: string | null
          prep_duration_seconds?: number | null
          prep_phase_active?: boolean
          prep_phase_started_at?: string | null
          prep_side1_ready?: boolean
          prep_side2_ready?: boolean
          prep_time_max?: string
          prep_time_min?: string
          scheduled_at?: string | null
          speaker_pause_owner_id?: string | null
          speaker_pause_used_turn_key?: string | null
          speaker_paused_at?: string | null
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
          active_host_heartbeat_at?: string | null
          active_host_user_id?: string | null
          community_tag?: string | null
          continuation_index?: number
          continuation_root_id?: string | null
          continued_from_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          current_speaker_side_id?: string | null
          current_subtopic_index?: number
          current_turn?: number
          deletion_scheduled_at?: string | null
          description?: string | null
          edit_window_ends_at?: string | null
          ended_at?: string | null
          facilitator_type?: string
          facilitator_user_id?: string | null
          feedback_enabled?: boolean
          forked_at?: string | null
          forked_from_id?: string | null
          format?: string
          grading_enabled?: boolean
          id?: string
          imported_source_kind?: string | null
          imported_source_url?: string | null
          institution_tag?: string | null
          is_public?: boolean
          is_verified?: boolean
          join_code?: string | null
          location?: string | null
          max_speakers_per_side?: number
          pause_reason?: string | null
          pause_remaining_seconds?: number | null
          paused_at?: string | null
          prep_duration_seconds?: number | null
          prep_phase_active?: boolean
          prep_phase_started_at?: string | null
          prep_side1_ready?: boolean
          prep_side2_ready?: boolean
          prep_time_max?: string
          prep_time_min?: string
          scheduled_at?: string | null
          speaker_pause_owner_id?: string | null
          speaker_pause_used_turn_key?: string | null
          speaker_paused_at?: string | null
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
            foreignKeyName: "debates_continuation_root_id_fkey"
            columns: ["continuation_root_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debates_continued_from_id_fkey"
            columns: ["continued_from_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debates_current_speaker_side_id_fkey"
            columns: ["current_speaker_side_id"]
            isOneToOne: false
            referencedRelation: "debate_sides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debates_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "debates"
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
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
      founder_settings: {
        Row: {
          budget_ai_usd: number
          budget_cloud_usd: number
          budget_speech_usd: number
          budget_stripe_usd: number
          id: string
          monthly_revenue_goal_usd: number | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          budget_ai_usd?: number
          budget_cloud_usd?: number
          budget_speech_usd?: number
          budget_stripe_usd?: number
          id?: string
          monthly_revenue_goal_usd?: number | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          budget_ai_usd?: number
          budget_cloud_usd?: number
          budget_speech_usd?: number
          budget_stripe_usd?: number
          id?: string
          monthly_revenue_goal_usd?: number | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      imported_records: {
        Row: {
          argument_map: Json
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          progress: Json
          share_token: string | null
          source_kind: string
          source_url: string | null
          status: string
          subtopics: Json
          title: string
          transcript_entries: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          argument_map?: Json
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          progress?: Json
          share_token?: string | null
          source_kind: string
          source_url?: string | null
          status?: string
          subtopics?: Json
          title: string
          transcript_entries?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          argument_map?: Json
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          progress?: Json
          share_token?: string | null
          source_kind?: string
          source_url?: string | null
          status?: string
          subtopics?: Json
          title?: string
          transcript_entries?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      launch_config: {
        Row: {
          id: boolean
          is_public_launched: boolean
          launched_at: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          is_public_launched?: boolean
          launched_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          is_public_launched?: boolean
          launched_at?: string | null
          updated_at?: string
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
          continuation_index: number
          continuation_root_id: string | null
          continued_from_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          echo_guard: boolean
          ended_at: string | null
          forked_at: string | null
          forked_from_id: string | null
          id: string
          is_public: boolean
          join_code: string | null
          mode: string
          paused_at: string | null
          share_token: string | null
          speaker_names: Json
          status: string
          subtopics: Json
          summaries: Json
          title: string | null
          transcript_entries: Json
        }
        Insert: {
          continuation_index?: number
          continuation_root_id?: string | null
          continued_from_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          echo_guard?: boolean
          ended_at?: string | null
          forked_at?: string | null
          forked_from_id?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
          mode?: string
          paused_at?: string | null
          share_token?: string | null
          speaker_names?: Json
          status?: string
          subtopics?: Json
          summaries?: Json
          title?: string | null
          transcript_entries?: Json
        }
        Update: {
          continuation_index?: number
          continuation_root_id?: string | null
          continued_from_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          echo_guard?: boolean
          ended_at?: string | null
          forked_at?: string | null
          forked_from_id?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
          mode?: string
          paused_at?: string | null
          share_token?: string | null
          speaker_names?: Json
          status?: string
          subtopics?: Json
          summaries?: Json
          title?: string | null
          transcript_entries?: Json
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_continuation_root_id_fkey"
            columns: ["continuation_root_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_continued_from_id_fkey"
            columns: ["continued_from_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mic_connections: {
        Row: {
          avatar_url: string | null
          created_at: string
          device_id: string | null
          display_name: string
          id: string
          last_audio_rms: number
          last_seen_at: string
          mode: string
          session_id: string
          session_kind: string
          slot_key: string
          status: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          device_id?: string | null
          display_name: string
          id?: string
          last_audio_rms?: number
          last_seen_at?: string
          mode?: string
          session_id: string
          session_kind: string
          slot_key: string
          status?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          device_id?: string | null
          display_name?: string
          id?: string
          last_audio_rms?: number
          last_seen_at?: string
          mode?: string
          session_id?: string
          session_kind?: string
          slot_key?: string
          status?: string
          user_id?: string | null
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
      performance_annotations: {
        Row: {
          attribute_group: Database["public"]["Enums"]["perf_group"] | null
          char_end: number | null
          char_start: number | null
          cited_entry_ids: string[] | null
          created_at: string
          explanation: string
          id: string
          participant_id: string | null
          pass_kind: Database["public"]["Enums"]["perf_pass"]
          polarity: string | null
          recommendation: string | null
          session_id: string
          session_kind: string
          severity: Database["public"]["Enums"]["perf_severity"] | null
          span_text: string | null
          sub_attribute: string | null
          subtopic_id: string | null
          tag_label: string | null
          transcript_entry_id: string | null
        }
        Insert: {
          attribute_group?: Database["public"]["Enums"]["perf_group"] | null
          char_end?: number | null
          char_start?: number | null
          cited_entry_ids?: string[] | null
          created_at?: string
          explanation: string
          id?: string
          participant_id?: string | null
          pass_kind: Database["public"]["Enums"]["perf_pass"]
          polarity?: string | null
          recommendation?: string | null
          session_id: string
          session_kind: string
          severity?: Database["public"]["Enums"]["perf_severity"] | null
          span_text?: string | null
          sub_attribute?: string | null
          subtopic_id?: string | null
          tag_label?: string | null
          transcript_entry_id?: string | null
        }
        Update: {
          attribute_group?: Database["public"]["Enums"]["perf_group"] | null
          char_end?: number | null
          char_start?: number | null
          cited_entry_ids?: string[] | null
          created_at?: string
          explanation?: string
          id?: string
          participant_id?: string | null
          pass_kind?: Database["public"]["Enums"]["perf_pass"]
          polarity?: string | null
          recommendation?: string | null
          session_id?: string
          session_kind?: string
          severity?: Database["public"]["Enums"]["perf_severity"] | null
          span_text?: string | null
          sub_attribute?: string | null
          subtopic_id?: string | null
          tag_label?: string | null
          transcript_entry_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          affiliation: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          deletion_initiated_at: string | null
          deletion_status: string | null
          display_name: string | null
          email_prefs: Json
          friend_code: string
          id: string
          invite_credits: number
          is_public: boolean
          last_export_at: string | null
          locale: string
          location: string | null
          role: Database["public"]["Enums"]["app_role"]
          timezone: string | null
          tos_accepted_at: string | null
          tos_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_initiated_at?: string | null
          deletion_status?: string | null
          display_name?: string | null
          email_prefs?: Json
          friend_code: string
          id?: string
          invite_credits?: number
          is_public?: boolean
          last_export_at?: string | null
          locale?: string
          location?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_initiated_at?: string | null
          deletion_status?: string | null
          display_name?: string | null
          email_prefs?: Json
          friend_code?: string
          id?: string
          invite_credits?: number
          is_public?: boolean
          last_export_at?: string | null
          locale?: string
          location?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          timezone?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
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
      record_change_proposals: {
        Row: {
          change_type: Database["public"]["Enums"]["record_change_type"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          payload: Json
          proposed_by: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          status: Database["public"]["Enums"]["record_change_status"]
        }
        Insert: {
          change_type: Database["public"]["Enums"]["record_change_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          payload?: Json
          proposed_by: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          status?: Database["public"]["Enums"]["record_change_status"]
        }
        Update: {
          change_type?: Database["public"]["Enums"]["record_change_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          payload?: Json
          proposed_by?: string
          record_id?: string
          record_type?: Database["public"]["Enums"]["shareable_record_type"]
          status?: Database["public"]["Enums"]["record_change_status"]
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
      record_qa_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          record_id: string
          record_type: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          record_id: string
          record_type: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          record_id?: string
          record_type?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      record_share_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invite_token_hash: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          revoked_at: string | null
          role: Database["public"]["Enums"]["record_share_role"]
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          invite_token_hash: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          revoked_at?: string | null
          role: Database["public"]["Enums"]["record_share_role"]
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invite_token_hash?: string
          record_id?: string
          record_type?: Database["public"]["Enums"]["shareable_record_type"]
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["record_share_role"]
        }
        Relationships: []
      }
      record_shares: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          role: Database["public"]["Enums"]["record_share_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          role: Database["public"]["Enums"]["record_share_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          record_id?: string
          record_type?: Database["public"]["Enums"]["shareable_record_type"]
          role?: Database["public"]["Enums"]["record_share_role"]
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
      round_summary_item_edits: {
        Row: {
          created_at: string
          debate_id: string
          edited_by: string
          edited_content: string
          id: string
          item_index: number
          original_content: string
          round_summary_id: string
          side_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          debate_id: string
          edited_by: string
          edited_content: string
          id?: string
          item_index: number
          original_content: string
          round_summary_id: string
          side_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          debate_id?: string
          edited_by?: string
          edited_content?: string
          id?: string
          item_index?: number
          original_content?: string
          round_summary_id?: string
          side_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_leads: {
        Row: {
          contact_email: string
          contact_name: string | null
          created_at: string
          id: string
          org_name: string
          resolved_at: string | null
          resolved_by: string | null
          seat_count: number | null
          status: string
          tier_requested: Database["public"]["Enums"]["subscription_tier"]
          use_case: string | null
        }
        Insert: {
          contact_email: string
          contact_name?: string | null
          created_at?: string
          id?: string
          org_name: string
          resolved_at?: string | null
          resolved_by?: string | null
          seat_count?: number | null
          status?: string
          tier_requested: Database["public"]["Enums"]["subscription_tier"]
          use_case?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          org_name?: string
          resolved_at?: string | null
          resolved_by?: string | null
          seat_count?: number | null
          status?: string
          tier_requested?: Database["public"]["Enums"]["subscription_tier"]
          use_case?: string | null
        }
        Relationships: []
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
          forked_at: string | null
          forked_from_id: string | null
          id: string
          my_take: string | null
          publish_caption: string | null
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
          forked_at?: string | null
          forked_from_id?: string | null
          id?: string
          my_take?: string | null
          publish_caption?: string | null
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
          forked_at?: string | null
          forked_from_id?: string | null
          id?: string
          my_take?: string | null
          publish_caption?: string | null
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
          {
            foreignKeyName: "session_notebooks_forked_from_id_fkey"
            columns: ["forked_from_id"]
            isOneToOne: false
            referencedRelation: "session_notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_usage_log: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          minutes: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          id?: string
          minutes?: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          minutes?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      takes: {
        Row: {
          author_id: string
          body: string
          club_id: string | null
          comment_count: number
          created_at: string
          id: string
          is_public: boolean
          like_count: number
          location: string | null
          parent_take_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          club_id?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          is_public?: boolean
          like_count?: number
          location?: string | null
          parent_take_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          club_id?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          is_public?: boolean
          like_count?: number
          location?: string | null
          parent_take_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takes_parent_take_id_fkey"
            columns: ["parent_take_id"]
            isOneToOne: false
            referencedRelation: "takes"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ai_calls: number
          created_at: string
          id: string
          import_minutes: number
          notebooks_created: number
          period_start: string
          sessions_created: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_calls?: number
          created_at?: string
          id?: string
          import_minutes?: number
          notebooks_created?: number
          period_start: string
          sessions_created?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_calls?: number
          created_at?: string
          id?: string
          import_minutes?: number
          notebooks_created?: number
          period_start?: string
          sessions_created?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string | null
          position: number
          referrer: string | null
          source: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          position?: number
          referrer?: string | null
          source?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          position?: number
          referrer?: string | null
          source?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _parse_time_to_seconds: { Args: { t: string }; Returns: number }
      accept_share_invitation: {
        Args: { _token: string }
        Returns: {
          fork_id: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          role: Database["public"]["Enums"]["record_share_role"]
        }[]
      }
      anonymize_expired_accounts: { Args: never; Returns: number }
      can_preview_debate: { Args: { _debate_id: string }; Returns: boolean }
      can_view_club: { Args: { _club_id: string }; Returns: boolean }
      can_view_debate: { Args: { _debate_id: string }; Returns: boolean }
      can_view_imported_record: { Args: { _id: string }; Returns: boolean }
      can_view_live_session: { Args: { _session_id: string }; Returns: boolean }
      can_view_lobby: { Args: { _id: string; _kind: string }; Returns: boolean }
      can_view_record: {
        Args: { _record_id: string; _record_type: string }
        Returns: boolean
      }
      cancel_account_deletion: { Args: never; Returns: undefined }
      claim_debate_host: { Args: { _debate_id: string }; Returns: boolean }
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
      continue_debate: {
        Args: { _bring_participants?: boolean; _source_id: string }
        Returns: string
      }
      continue_live_session: {
        Args: { _bring_participants?: boolean; _source_id: string }
        Returns: string
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
      create_record_share_invitation: {
        Args: {
          _id: string
          _role: Database["public"]["Enums"]["record_share_role"]
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: {
          id: string
          invite_token: string
        }[]
      }
      debate_host_heartbeat: {
        Args: { _debate_id: string }
        Returns: undefined
      }
      debate_tag_count: { Args: { _debate_id: string }; Returns: number }
      decide_record_change: {
        Args: { _approve: boolean; _proposal_id: string; _reason?: string }
        Returns: {
          change_type: Database["public"]["Enums"]["record_change_type"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          payload: Json
          proposed_by: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          status: Database["public"]["Enums"]["record_change_status"]
        }
        SetofOptions: {
          from: "*"
          to: "record_change_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evict_live_participant: {
        Args: { _device_id: string; _session_id: string }
        Returns: boolean
      }
      featured_records: {
        Args: { p_limit?: number; p_scope?: string; p_viewer?: string }
        Returns: {
          comment_count: number
          cover_image_url: string
          created_at: string
          created_by: string
          id: string
          kind: string
          participant_count: number
          score: number
          status: string
          topic: string
        }[]
      }
      fork_record_for_user: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
          _user: string
        }
        Returns: string
      }
      generate_friend_code: { Args: never; Returns: string }
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
      get_or_create_usage_counter: {
        Args: { _user_id: string }
        Returns: {
          ai_calls: number
          created_at: string
          id: string
          import_minutes: number
          notebooks_created: number
          period_start: string
          sessions_created: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "usage_counters"
          isOneToOne: true
          isSetofReturn: false
        }
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
          record_type: string
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
          record_type: string
          session_created_at: string
          session_id: string
          session_title: string
          thoughts: Json
          updated_at: string
        }[]
      }
      get_user_tier: { Args: { _user_id: string }; Returns: string }
      increment_usage: {
        Args: { _metric: string; _user_id: string }
        Returns: undefined
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
      is_record_co_owner: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: boolean
      }
      is_record_creator: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: boolean
      }
      is_record_viewer: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: boolean
      }
      is_session_owner: {
        Args: { _id: string; _kind: string }
        Returns: boolean
      }
      is_user_silenced: { Args: { _user_id: string }; Returns: boolean }
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
      lookup_debate_by_join_code: {
        Args: { _code: string }
        Returns: {
          format: string
          id: string
          max_speakers_per_side: number
          status: string
          topic: string
        }[]
      }
      pause_debate: {
        Args: { _debate_id: string; _remaining_seconds: number }
        Returns: undefined
      }
      pause_speaker_pause: {
        Args: {
          _debate_id: string
          _remaining_seconds: number
          _turn_key: string
        }
        Returns: undefined
      }
      promote_lobby_to_participants: {
        Args: { _debate_id: string }
        Returns: number
      }
      propose_record_change: {
        Args: {
          _change_type: Database["public"]["Enums"]["record_change_type"]
          _id: string
          _payload: Json
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: {
          change_type: Database["public"]["Enums"]["record_change_type"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          payload: Json
          proposed_by: string
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          status: Database["public"]["Enums"]["record_change_status"]
        }
        SetofOptions: {
          from: "*"
          to: "record_change_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purge_stale_live_participants: {
        Args: { _session_id: string }
        Returns: undefined
      }
      realtime_topic_debate_id: { Args: { _topic: string }; Returns: string }
      record_creator: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: string
      }
      record_is_completed: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["shareable_record_type"]
        }
        Returns: boolean
      }
      request_account_deletion: { Args: never; Returns: undefined }
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
      resume_debate: { Args: { _debate_id: string }; Returns: undefined }
      resume_speaker_pause: { Args: { _debate_id: string }; Returns: undefined }
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
      share_record_with_user: {
        Args: {
          _id: string
          _role: Database["public"]["Enums"]["record_share_role"]
          _type: Database["public"]["Enums"]["shareable_record_type"]
          _user_id: string
        }
        Returns: {
          accepted_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          record_id: string
          record_type: Database["public"]["Enums"]["shareable_record_type"]
          role: Database["public"]["Enums"]["record_share_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "record_shares"
          isOneToOne: true
          isSetofReturn: false
        }
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
      debate_status:
        | "draft"
        | "scheduled"
        | "live"
        | "completed"
        | "archived"
        | "pending_deletion"
      perf_group:
        | "argumentative_integrity"
        | "rhetorical_effectiveness"
        | "engagement_quality"
        | "cognitive_depth"
      perf_pass: "live" | "deep"
      perf_severity: "green" | "orange" | "red"
      record_change_status: "pending" | "approved" | "rejected" | "withdrawn"
      record_change_type:
        | "edit_metadata"
        | "edit_content"
        | "invite_user"
        | "remove_user"
        | "toggle_publish"
        | "propose_delete"
        | "propose_transfer"
      record_share_role: "viewer" | "co_owner"
      report_reason:
        | "spam"
        | "harassment"
        | "hate"
        | "sexual"
        | "violence"
        | "misinformation"
        | "self_harm"
        | "other"
      report_status: "open" | "triaged" | "actioned" | "dismissed"
      report_target_type:
        | "message"
        | "transcript_entry"
        | "debate"
        | "live_session"
        | "change_my_mind"
        | "profile"
        | "club"
        | "club_event"
        | "notebook"
        | "my_take"
        | "comment"
      sanction_kind: "warning" | "mute_24h" | "mute_7d" | "suspend" | "ban"
      shareable_record_type:
        | "debate"
        | "change_my_mind"
        | "live_session"
        | "notebook"
        | "imported_record"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "trialing"
        | "unpaid"
      subscription_tier: "free" | "pro" | "education" | "civic"
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
      debate_status: [
        "draft",
        "scheduled",
        "live",
        "completed",
        "archived",
        "pending_deletion",
      ],
      perf_group: [
        "argumentative_integrity",
        "rhetorical_effectiveness",
        "engagement_quality",
        "cognitive_depth",
      ],
      perf_pass: ["live", "deep"],
      perf_severity: ["green", "orange", "red"],
      record_change_status: ["pending", "approved", "rejected", "withdrawn"],
      record_change_type: [
        "edit_metadata",
        "edit_content",
        "invite_user",
        "remove_user",
        "toggle_publish",
        "propose_delete",
        "propose_transfer",
      ],
      record_share_role: ["viewer", "co_owner"],
      report_reason: [
        "spam",
        "harassment",
        "hate",
        "sexual",
        "violence",
        "misinformation",
        "self_harm",
        "other",
      ],
      report_status: ["open", "triaged", "actioned", "dismissed"],
      report_target_type: [
        "message",
        "transcript_entry",
        "debate",
        "live_session",
        "change_my_mind",
        "profile",
        "club",
        "club_event",
        "notebook",
        "my_take",
        "comment",
      ],
      sanction_kind: ["warning", "mute_24h", "mute_7d", "suspend", "ban"],
      shareable_record_type: [
        "debate",
        "change_my_mind",
        "live_session",
        "notebook",
        "imported_record",
      ],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "trialing",
        "unpaid",
      ],
      subscription_tier: ["free", "pro", "education", "civic"],
    },
  },
} as const
