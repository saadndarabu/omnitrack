import { toBranchName } from "@/lib/ids"
import { createGithubBranch } from "@/lib/github/oauth"

export type BranchCreationRequest = {
  ticketId: string
  title: string
  type: "task"
  repo: string
  accessToken: string
  baseBranch?: string
}

export type BranchCreationResult = {
  branch: string
  created: boolean
}

export async function createBranchForTicket({
  ticketId,
  title,
  type,
  repo,
  accessToken,
  baseBranch = "main"
}: BranchCreationRequest): Promise<BranchCreationResult> {
  const branch = toBranchName(type, ticketId, title)
  await createGithubBranch(accessToken, repo, branch, baseBranch)
  return { branch, created: true }
}
