import { toBranchName } from "@/lib/ids"

export type BranchCreationRequest = {
  ticketId: string
  title: string
  type: "task"
}

export type BranchCreationResult = {
  branch: string
  created: boolean
}

export async function createBranchForTicket({
  ticketId,
  title,
  type
}: BranchCreationRequest): Promise<BranchCreationResult> {
  const branch = toBranchName(type, ticketId, title)

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return {
      branch,
      created: false
    }
  }

  return {
    branch,
    created: true
  }
}
