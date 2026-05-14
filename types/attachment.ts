import type { User } from "@/types/user"

export type TicketAttachment = {
  id:                  string
  ticketId:            string
  uploadedBy:          User
  fileName:            string
  fileType:            string
  fileSize:            number
  originalFileSize:    number
  compressedFileSize:  number
  compressionRatio:    number
  storageBucket:       string
  storagePath:         string
  width:               number | null
  height:              number | null
  createdAt:           string
  /** Signed URL, populated on the client before rendering. */
  signedUrl?:          string
}
