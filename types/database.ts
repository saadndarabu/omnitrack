// Hand-authored Supabase schema types — run `supabase gen types typescript` to regenerate from a live project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRoleDb   = "admin" | "member" | "viewer"

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
          id:         string
          name:       string
          email:      string
          initials:   string
          role:       UserRoleDb
          created_at: string
        }
        Insert: {
          id:          string
          name:        string
          email:       string
          initials:    string
          role?:       UserRoleDb
          created_at?: string
        }
        Update: {
          name?:       string
          email?:      string
          initials?:   string
          role?:       UserRoleDb
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
