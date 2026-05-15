export type UserRole = "admin" | "member" | "viewer"

export type UserArea =
  | "frontend"
  | "backend"
  | "automation"
  | "agents"
  | "sara"
  | "omnimap"
  | "llm"
  | "devops"
  | "rag"

export const USER_AREA_LABELS: Record<UserArea, string> = {
  frontend:   "Front End",
  backend:    "Backend (Go)",
  automation: "Automation",
  agents:     "Agents",
  sara:       "SARA",
  omnimap:    "OmniMap",
  llm:        "LLM",
  devops:     "DevOps",
  rag:        "RAG",
}

export type User = {
  id: string
  name: string
  email: `${string}@sirp.io`
  initials: string
  role: UserRole
  areas: UserArea[]
  avatarUrl: string | null
  githubUsername: string | null
  githubEmail: string | null
  githubConnectedAt: string | null
}

export function isAdmin(user: User): boolean {
  return user.role === "admin"
}

export function isMember(user: User): boolean {
  return user.role === "admin" || user.role === "member"
}

export function isViewer(user: User): boolean {
  return true // every role can view
}
