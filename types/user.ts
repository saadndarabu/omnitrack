export type UserRole = "admin" | "member" | "viewer"

export type User = {
  id: string
  name: string
  email: `${string}@sirp.io`
  initials: string
  role: UserRole
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
