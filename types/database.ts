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
