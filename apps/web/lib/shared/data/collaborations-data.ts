export type CollabType = 'University' | 'Embassy' | 'Industry peer' | 'Client' | 'Others'
export type CollabStatus = 'Not Started' | 'Ongoing' | 'Finished'

export interface CollabImage {
  id: string
  dataUrl: string
  caption?: string
}

// Hard cap enforced by the API (lib/validate.ts) and mirrored in the UI.
// Images are stored as base64 in the row, so an unbounded array would blow
// past serverless request-body limits.
export const MAX_COLLAB_IMAGES = 12

export interface Collaboration {
  id: string
  partner: string
  type: CollabType
  description: string
  focusArea: string
  status: CollabStatus
  detailedOverview?: string
  currentStatus?: string
  nextSteps?: string
  images?: CollabImage[]
  imageCount?: number   // list endpoint sends only the first image + this count
  createdAt: string
  createdBy: string
}

export const COLLAB_TYPES: CollabType[] = ['University', 'Embassy', 'Industry peer', 'Client', 'Others']
export const COLLAB_STATUSES: CollabStatus[] = ['Not Started', 'Ongoing', 'Finished']

export const STATUS_STYLE: Record<CollabStatus, { bg: string; text: string; border: string }> = {
  'Not Started': { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  'Ongoing':     { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'Finished':    { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
}

export const TYPE_STYLE: Record<CollabType, { bg: string; text: string }> = {
  'University':    { bg: '#ede9fe', text: '#5b21b6' },
  'Embassy':       { bg: '#fef3c7', text: '#92400e' },
  'Industry peer': { bg: '#dbeafe', text: '#1e40af' },
  'Client':        { bg: '#d1fae5', text: '#065f46' },
  'Others':        { bg: '#f3f4f6', text: '#374151' },
}
