// Hand-authored Supabase schema types — run `supabase gen types typescript` to regenerate from a live project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRoleDb   = "admin" | "member" | "viewer"
export type UserAreaDb   = "frontend" | "backend" | "automation" | "agents" | "sara" | "omnimap" | "llm" | "devops" | "rag"

export type WorkTypeDb   = "feature" | "enhancement" | "bug" | "task"
export type StatusDb     = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "blocked"
export type PriorityDb   = "critical" | "high" | "medium" | "low"
export type ProjectDb    = "sara" | "omniscan" | "platform"
export type AreaDb       = "platform" | "product" | "integrations"
export type ComponentDb  = "tickets" | "github" | "routing" | "filters" | "state"

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id:                   string
          name:                 string
          email:                string
          initials:             string
          role:                 UserRoleDb
          areas:                UserAreaDb[]
          avatar_url:           string | null
          github_username:      string | null
          github_email:         string | null
          github_connected_at:  string | null
          created_at:           string
        }
        Insert: {
          id:                   string
          name:                 string
          email:                string
          initials:             string
          role?:                UserRoleDb
          areas?:               UserAreaDb[]
          avatar_url?:          string | null
          github_username?:     string | null
          github_email?:        string | null
          github_connected_at?: string | null
          created_at?:          string
        }
        Update: {
          name?:                string
          email?:               string
          initials?:            string
          role?:                UserRoleDb
          areas?:               UserAreaDb[]
          avatar_url?:          string | null
          github_username?:     string | null
          github_email?:        string | null
          github_connected_at?: string | null
        }
      }
      tickets: {
        Row: {
          id:                   string
          title:                string
          description:          string
          work_type:            WorkTypeDb
          status:               StatusDb
          priority:             PriorityDb
          project:              ProjectDb
          area:                 AreaDb
          component:            ComponentDb
          estimate:             string | null
          due_date:             string | null
          acceptance_criteria:  string[]
          blocker_reason:       string | null
          labels:               string[]
          branch:               string | null
          pr_number:            number | null
          assignee_id:          string | null
          parent_id:            string | null
          fb_approved:          boolean
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id:                   string
          title:                string
          description?:         string
          work_type:            WorkTypeDb
          status?:              StatusDb
          priority?:            PriorityDb
          project:              ProjectDb
          area:                 AreaDb
          component:            ComponentDb
          estimate?:            string | null
          due_date?:            string | null
          acceptance_criteria?: string[]
          blocker_reason?:      string | null
          labels?:              string[]
          branch?:              string | null
          pr_number?:           number | null
          assignee_id?:         string | null
          parent_id?:           string | null
          fb_approved?:         boolean
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          title?:               string
          description?:         string
          work_type?:           WorkTypeDb
          status?:              StatusDb
          priority?:            PriorityDb
          project?:             ProjectDb
          area?:                AreaDb
          component?:           ComponentDb
          estimate?:            string | null
          due_date?:            string | null
          acceptance_criteria?: string[]
          blocker_reason?:      string | null
          labels?:              string[]
          branch?:              string | null
          pr_number?:           number | null
          assignee_id?:         string | null
          parent_id?:           string | null
          fb_approved?:         boolean
          updated_at?:          string
        }
      }
      ticket_comments: {
        Row: {
          id:         string
          ticket_id:  string
          author_id:  string
          body:       string
          created_at: string
        }
        Insert: {
          id?:        string
          ticket_id:  string
          author_id:  string
          body:       string
          created_at?: string
        }
        Update: {
          body?: string
        }
      }
      ticket_history: {
        Row: {
          id:         string
          ticket_id:  string
          actor_id:   string
          field:      string
          old_value:  string | null
          new_value:  string | null
          created_at: string
        }
        Insert: {
          id?:        string
          ticket_id:  string
          actor_id:   string
          field:      string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }
      ticket_attachments: {
        Row:    TicketAttachmentRow
        Insert: {
          id?:                   string
          ticket_id:             string
          uploaded_by:           string
          file_name:             string
          file_type:             string
          file_size:             number
          original_file_size:    number
          compressed_file_size:  number
          compression_ratio:     number
          storage_bucket?:       string
          storage_path:          string
          width?:                number | null
          height?:               number | null
          deleted_at?:           string | null
          created_at?:           string
        }
        Update: {
          deleted_at?: string | null
        }
      }
      notifications: {
        Row: {
          id:         string
          user_id:    string
          type:       NotificationTypeDb
          ticket_id:  string
          actor_id:   string | null
          message:    string
          read:       boolean
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          type:       NotificationTypeDb
          ticket_id:  string
          actor_id?:  string | null
          message:    string
          read?:      boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      github_installations: {
        Row: {
          id:                    string
          installation_id:       number
          account_login:         string | null
          account_id:            number | null
          account_type:          string | null
          repository_selection:  string | null
          app_slug:              string | null
          installed_by_user_id:  string | null
          suspended_at:          string | null
          created_at:            string
          updated_at:            string
        }
        Insert: {
          id?:                   string
          installation_id:       number
          account_login?:        string | null
          account_id?:           number | null
          account_type?:         string | null
          repository_selection?: string | null
          app_slug?:             string | null
          installed_by_user_id?: string | null
          suspended_at?:         string | null
          created_at?:           string
          updated_at?:           string
        }
        Update: {
          account_login?:        string | null
          account_id?:           number | null
          account_type?:         string | null
          repository_selection?: string | null
          app_slug?:             string | null
          installed_by_user_id?: string | null
          suspended_at?:         string | null
          updated_at?:           string
        }
      }
      github_repositories: {
        Row: {
          id:               string
          installation_id:  number
          github_repo_id:   number
          owner:            string
          name:             string
          full_name:        string
          private:          boolean
          default_branch:   string | null
          html_url:         string | null
          enabled:          boolean
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          installation_id:  number
          github_repo_id:   number
          owner:            string
          name:             string
          full_name:        string
          private?:         boolean
          default_branch?:  string | null
          html_url?:        string | null
          enabled?:         boolean
          created_at?:      string
          updated_at?:      string
        }
        Update: {
          owner?:           string
          name?:            string
          full_name?:       string
          private?:         boolean
          default_branch?:  string | null
          html_url?:        string | null
          enabled?:         boolean
        }
      }
      github_pull_requests: {
        Row: {
          id:                  string
          ticket_id:           string | null
          installation_id:     number
          github_repo_id:      number
          repo_full_name:      string
          pr_number:           number
          pr_title:            string | null
          pr_url:              string | null
          branch_name:         string | null
          base_branch:         string | null
          state:               string | null
          merged:              boolean
          github_created_at:   string | null
          github_updated_at:   string | null
          created_by_user_id:  string | null
          created_at:          string
          updated_at:          string
        }
        Insert: {
          id?:                 string
          ticket_id?:          string | null
          installation_id:     number
          github_repo_id:      number
          repo_full_name:      string
          pr_number:           number
          pr_title?:           string | null
          pr_url?:             string | null
          branch_name?:        string | null
          base_branch?:        string | null
          state?:              string | null
          merged?:             boolean
          github_created_at?:  string | null
          github_updated_at?:  string | null
          created_by_user_id?: string | null
          created_at?:         string
          updated_at?:         string
        }
        Update: {
          ticket_id?:          string | null
          pr_title?:           string | null
          pr_url?:             string | null
          branch_name?:        string | null
          base_branch?:        string | null
          state?:              string | null
          merged?:             boolean
          github_created_at?:  string | null
          github_updated_at?:  string | null
        }
      }
      github_webhook_events: {
        Row: {
          id:              string
          delivery_id:     string
          event_type:      string
          action:          string | null
          installation_id: number | null
          github_repo_id:  number | null
          repo_full_name:  string | null
          payload:         Json
          processed:       boolean
          error:           string | null
          created_at:      string
        }
        Insert: {
          id?:              string
          delivery_id:      string
          event_type:       string
          action?:          string | null
          installation_id?: number | null
          github_repo_id?:  number | null
          repo_full_name?:  string | null
          payload:          Json
          processed?:       boolean
          error?:           string | null
          created_at?:      string
        }
        Update: {
          processed?: boolean
          error?:     string | null
        }
      }
      slack_connections: {
        Row: {
          id:                    string
          workspace_id:          string
          slack_team_id:         string
          slack_team_name:       string | null
          bot_user_id:           string | null
          bot_access_token:      string
          default_channel_id:    string | null
          default_channel_name:  string | null
          approval_channel_id:   string | null
          approval_channel_name: string | null
          connected_by:          string | null
          connected_at:          string
          updated_at:            string
        }
        Insert: {
          id?:                   string
          workspace_id:          string
          slack_team_id:         string
          slack_team_name?:      string | null
          bot_user_id?:          string | null
          bot_access_token:      string
          default_channel_id?:   string | null
          default_channel_name?: string | null
          approval_channel_id?:  string | null
          approval_channel_name?: string | null
          connected_by?:         string | null
          connected_at?:         string
          updated_at?:           string
        }
        Update: {
          slack_team_name?:      string | null
          bot_user_id?:          string | null
          bot_access_token?:     string
          default_channel_id?:   string | null
          default_channel_name?: string | null
          approval_channel_id?:  string | null
          approval_channel_name?: string | null
          connected_by?:         string | null
          updated_at?:           string
        }
      }
      slack_notification_settings: {
        Row: {
          id:           string
          workspace_id: string
          event_type:   string
          channel_id:   string
          channel_name: string | null
          enabled:      boolean
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:          string
          workspace_id: string
          event_type:   string
          channel_id:   string
          channel_name?: string | null
          enabled?:     boolean
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          channel_id?:   string
          channel_name?: string | null
          enabled?:      boolean
          updated_at?:   string
        }
      }
    }
    Enums: {
      user_role:          UserRoleDb
      user_area:          UserAreaDb
      work_type:          WorkTypeDb
      ticket_status:      StatusDb
      priority:           PriorityDb
      project:            ProjectDb
      area:               AreaDb
      component:          ComponentDb
      notification_type:  NotificationTypeDb
    }
  }
}

export type NotificationTypeDb = "assigned" | "mentioned" | "due_soon" | "comment_added"

// ── ticket_attachments ────────────────────────────────────────────────────────

export interface TicketAttachmentRow {
  id:                   string
  ticket_id:            string
  uploaded_by:          string
  file_name:            string
  file_type:            string
  file_size:            number
  original_file_size:   number
  compressed_file_size: number
  compression_ratio:    number
  storage_bucket:       string
  storage_path:         string
  width:                number | null
  height:               number | null
  deleted_at:           string | null
  created_at:           string
}
