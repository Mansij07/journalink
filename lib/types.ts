// Shared domain types. These mirror the Supabase schema described in the
// "Manual Supabase Changes Required" section of the project plan.

export type Role = "Student" | "Prof"

export interface Profile {
  id: string
  username: string | null
  role: Role | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  branch: string | null
  year: number | null
  skills: string[] | null
  links: Record<string, string> | null
}

export type ProjectStatus = "Open" | "Closed"

export interface Project {
  id: number
  professor_id: string
  title: string
  type: string | null
  status: ProjectStatus | string
  description: string | null
  requirements: string | null
  skills: string[] | null
  slots: number | null
  deadline: string | null
  resume_required: boolean
  created_at: string | null
}

/** A project row joined with its owning professor profile. */
export interface ProjectWithProfessor extends Project {
  profiles: Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "role"> | null
}

export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "confirmed"
  | "declined"
  | "left"

export interface Application {
  id: string
  project_id: number
  applicant_id: string
  message: string | null
  decision_message: string | null
  resume_url: string | null
  status: ApplicationStatus
  leave_requested: boolean
  created_at: string
  updated_at: string
}

export type NotificationType =
  | "like"
  | "follow"
  | "comment"
  | "application_new"
  | "application_accepted"
  | "application_rejected"
  | "mention"

export interface NotificationRow {
  id: string
  recipient_id: string
  actor_id: string
  type: NotificationType
  post_id: number | null
  project_id: number | null
  application_id: string | null
  read: boolean
  created_at: string
}
