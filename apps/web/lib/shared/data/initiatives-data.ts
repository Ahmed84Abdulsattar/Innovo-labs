export type ValueDriver =
  | 'Cost Saving'
  | 'Time Saving'
  | 'Site Safety'
  | 'Quality'
  | 'ESG'

export const VALUE_DRIVERS: ValueDriver[] = [
  'Cost Saving', 'Time Saving', 'Site Safety', 'Quality', 'ESG',
]

export type IdentifiedSolution = 'Inhouse' | 'Commercial Solution' | 'Startup Solution' | 'Custom Development'
export const IDENTIFIED_SOLUTIONS: IdentifiedSolution[] = [
  'Inhouse', 'Commercial Solution', 'Startup Solution', 'Custom Development',
]

export type InitiativeStatus = 'Not Started' | 'Pre-Evaluation' | 'In Progress' | 'Pilot' | 'Live' | 'Closed' | 'On Hold'
export const INITIATIVE_STATUSES: InitiativeStatus[] = [
  'Not Started', 'Pre-Evaluation', 'In Progress', 'Pilot', 'Live', 'Closed', 'On Hold',
]

export type InitiativePriority = 'Low' | 'Medium' | 'High'
export const INITIATIVE_PRIORITIES: InitiativePriority[] = ['Low', 'Medium', 'High']

export const INITIATIVE_BUSINESS_UNITS = [
  'Build', 'Innovo MEP', 'Development', 'Infrastructure',
  'Digital Innovation', 'IMS/Corporate',
]

export const INITIATIVE_DEPARTMENTS = [
  'Procurement', 'Safety', 'Estimation & Tendering', 'Planning',
  'Operations', 'Quality & Handover', 'Cost Control', 'ESG',
  'Technical', 'MEP Build', 'Design',
  'Digital Innovation', 'Finance', 'HR', 'Legal', 'Contracts',
]

export interface InnoDocument {
  id: string
  name: string
  dataUrl: string
  mimeType: string
  fileSize?: string
  note?: string
  uploadedAt: string
  uploadedBy: string
}

export interface BUEvaluation {
  businessUnit: string
  status: InitiativeStatus
  progress: string
  nextSteps: string
  lessonsLearnt: string
  updatedAt: string
  updatedBy: string
}

export interface Initiative {
  id: string
  initiativeId: string          // short human-readable ID
  name: string
  description: string
  problemStatement: string
  proposedSolution: string
  valueDrivers: ValueDriver[]
  potentialCostSaving?: number | null    // AED/year
  potentialTimeSaving?: number | null    // hours/year
  potentialQualitySaving?: number | null // AED saved by re-work
  potentialSafetyImpact?: number | null  // injuries prevented
  potentialEsgOffset?: number | null     // kg CO2 offset
  identifiedSolution?: IdentifiedSolution
  linkedStartup?: string        // name or URL when solution = Startup Solution
  businessUnits: string[]
  departments: string[]
  priority: InitiativePriority
  status: InitiativeStatus
  progress: string
  nextSteps: string
  lessonsLearnt: string
  documents: InnoDocument[]
  evaluations: BUEvaluation[]   // one per applicable business unit
  secondaryValueDrivers?: string[]
  applicableStakeholders?: string[]
  projectLifecycleStages?: string[]
  projectTypes?: string[]
  projectLocation?: string[]
  applicableProjectSize?: string[]
  applicableProjectValue?: string[]
  technologyCategory?: string[]
  implementationComplexity?: string | null
  investmentLevel?: string | null
  changeManagementEffort?: string | null
  deploymentType?: string[]
  visibility?: string | null
  projectComplexity?: string | null
  contributors: { id: string; name: string; email: string; role: string }[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const STATUS_STYLE: Record<InitiativeStatus, { bg: string; text: string; dot: string; border: string }> = {
  'Not Started':    { bg: '#f0f4f5', text: '#5a7a82', dot: '#b0c4c9', border: '#e2eaec' },
  'Pre-Evaluation': { bg: '#fef3c7', text: '#92400e', dot: '#d97706', border: '#fde68a' },
  'In Progress':    { bg: '#dbeafe', text: '#1e40af', dot: '#2563eb', border: '#bfdbfe' },
  'Pilot':          { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed', border: '#ddd6fe' },
  'Live':           { bg: '#d1fae5', text: '#065f46', dot: '#059669', border: '#a7f3d0' },
  'Closed':         { bg: '#f3f4f6', text: '#374151', dot: '#6b7280', border: '#e5e7eb' },
  'On Hold':        { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626', border: '#fecaca' },
}

export const PRIORITY_STYLE: Record<InitiativePriority, { bg: string; text: string }> = {
  'Low':    { bg: '#f0f4f5', text: '#5a7a82' },
  'Medium': { bg: '#fef3c7', text: '#92400e' },
  'High':   { bg: '#fee2e2', text: '#991b1b' },
}

export const VALUE_DRIVER_STYLE: Record<ValueDriver, { bg: string; text: string }> = {
  'Cost Saving':  { bg: '#d1fae5', text: '#065f46' },
  'Time Saving':  { bg: '#dbeafe', text: '#1e40af' },
  'Site Safety':  { bg: '#fef3c7', text: '#92400e' },
  'Quality':      { bg: '#e0faf8', text: '#0f5c58' },
  'ESG':          { bg: '#dcfce7', text: '#166534' },
}
