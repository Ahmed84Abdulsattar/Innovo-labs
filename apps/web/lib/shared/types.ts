export type Role = 'super_admin' | 'innovation_admin' | 'contributor' | 'viewer'

export type Department =
  | 'Build' | 'MEP' | 'Development' | 'Infrastructure'
  | 'Digital Innovation' | 'IMS/Corporate'
  | 'Steel Fabrication' | 'Concrete Manufacturing'

export type CollaborationStatus =
  | 'Identified' | 'Assessed' | 'Business Review'
  | 'Pilot' | 'Onboarded' | 'Rejected'

export type Priority        = 'Low' | 'Medium' | 'High'
export type ProductMaturity = 'Early Stage' | 'Market Ready' | 'Scaling' | 'Mature'
export type Rating          = 'Underwhelming' | 'Has Potential' | 'Promising' | 'Impressive'
export type NextSteps       = 'Assess' | 'Deploy' | 'Hold' | 'Pilot' | 'Scale' | 'Archive'
export type Source          = 'noa' | 'Brick & Mortar' | 'Innovo VC' | 'Event/ Conference' | 'Internal Recommendation' | 'Partner/ University' | 'Startup Outreach' | 'Others'

// BuildDepartment type is defined in constants.ts

export interface TimelineEvent {
  id: string; status: CollaborationStatus; date: string
  rating?: Rating; feedback?: string; createdBy: string; createdByName: string
}

export interface KeyContact { id: string; name: string; email: string }

// ── Cyber Security Review (from Vendor Security Questionnaire + Minimum Baseline) ──
export interface CyberSecurityReview {
  // Section 1: Vendor Org
  legalCompanyName?: string; registeredAddress?: string; countryOfIncorporation?: string
  securityContact?: string; hasDedicatedSecurity?: boolean; hasSecurityPolicies?: boolean
  // Section 2: Certifications
  iso27001?: boolean; soc2?: boolean; otherCertifications?: string
  lastAuditDate?: string; reportsUnderNDA?: boolean
  // Section 3: IAM
  federatedSSO?: boolean; scimProvisioning?: boolean; mfaEnforced?: boolean
  rbac?: boolean; customerAdminSeparation?: boolean
  // Section 4: Data Protection
  encryptionInTransit?: boolean; encryptionAtRest?: boolean
  customerDataOwnership?: boolean; secureDataDeletion?: boolean
  dataResidencyOptions?: boolean; countriesDataProcessed?: string
  // Section 5: App & Infra Security
  secureSDLC?: boolean; vulnerabilityScanning?: boolean; penTested?: boolean
  vaptFrequency?: string; cloudProviders?: string
  // Section 6: Logging & IR
  userActivityLogging?: boolean; adminActivityLogging?: boolean
  logsExportable?: boolean; monitoring24x7?: boolean
  documentedIRP?: boolean; breachNotificationSLA?: string
  // Section 7: Sub-processors
  usesSubProcessors?: boolean; subProcessorsAssessed?: boolean
  customersNotifiedOfChanges?: boolean; subProcessorListAvailable?: boolean
  // Section 8: BCP/DR
  documentedBCPDR?: boolean; backupFrequency?: string
  rpo?: string; rto?: string; drTestedAnnually?: boolean
  // Section 9: Minimum Baseline — Go-Live Gate
  saasModel?: 'Multi-Tenant' | 'Single-Tenant'
  primaryHostingRegion?: string; backupDRRegion?: string
  identityIntegration?: string; dpaExecuted?: boolean
  dataProcessingAgreement?: boolean; regulatoryConstraints?: string
  exitAndPortabilityDefined?: boolean; breachNotificationSLAHours?: string
  // Risk & Sign-off
  overallRiskLevel?: 'Low' | 'Medium' | 'High' | 'Critical'
  goLiveDecision?: 'Approved' | 'Approved with Conditions' | 'Not Approved'
  riskMitigationNotes?: string
  reviewedBy?: string; reviewedDate?: string
  approvedBy?: string; approvedDate?: string; notes?: string
  completedDate?: string; completedBy?: string
}

// ── Attached documents (NDA, Legal) ──
export interface AttachedDocument {
  id: string; name: string; uploadedBy: string; uploadedByName: string
  uploadedAt: string; fileSize?: string; note?: string; url?: string
  dataUrl?: string   // base64 data URL for in-browser view/download
  mimeType?: string  // e.g. 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

// ── Video links ──
export interface VideoLink {
  id: string; title: string; url: string; description?: string
  addedBy: string; addedByName: string; addedAt: string
  isLocal?: boolean       // uploaded from PC
  localDataUrl?: string  // base64 data URL for browser playback
  fileName?: string
}

// ── Costs ──
export interface CostEntry {
  id: string; description: string; amount: number; currency: string
  year: number; notes?: string
}
export interface StartupCosts {
  capex: CostEntry[]
  opex:  CostEntry[]
  roiDescription?: string; roiEstimatedMonths?: number; roiNotes?: string
}

// ── Idea / Problem submission ──
export interface IdeaSubmission {
  id: string; ideaRef?: string; submittedBy: string; submittedByName: string; submittedByDept: string; createdAt: string
  problemTitle: string; problemDescription: string; currentProcess?: string
  impactIfSolved?: string; estimatedTimeSaved?: string; affectedTeams?: string[]
  urgency: 'Low' | 'Medium' | 'High' | 'Critical'
  suggestedSolution?: string; hasTriedBefore?: boolean; triedBeforeDetails?: string
  expectedBenefits?: string; anyBudgetInMind?: string
  // Value tracker — "How will your idea benefit Innovo's business"
  benefitDrivers?: string[]
  benefitCostSaving?: number | null; benefitTimeSaving?: number | null; benefitQuality?: number | null
  benefitSafety?: number | null; benefitEsg?: number | null
  // Which business function will benefit
  benefitBusinessUnits?: string[]; benefitDepartments?: string[]
  status: 'Submitted' | 'Pending' | 'Under Review' | 'Accepted' | 'Declined' | 'Converted to Initiative'
  linkedStartupId?: string; reviewNotes?: string
  // Users assigned to this idea by a super admin (mirrors initiatives.contributors)
  contributors?: IdeaContributor[]
}

export interface IdeaContributor { id: string; name: string; email: string; role: string }

export interface IdeaStatusHistory {
  id: string
  ideaId: string
  fromStatus?: string | null
  toStatus: string
  changedBy?: string
  changedByName?: string
  changedByEmail?: string
  note?: string | null
  createdAt: string
}

export interface User {
  id: string; name: string; email: string; department: Department
  role: Role; profilePhoto?: string; lastLogin?: string; departmentUnassigned?: boolean
  username?: string          // display name
}

export interface Startup {
  id: string; startupId?: string; departmentId: Department; createdBy: string
  company: string; source: Source; sector: string
  technologies: string[]; businessUnits: string[]; departments: string[]
  product: string; description: string
  solutionDetails?: string
  commercialModel?: string
  problemStatement?: string
  productMaturity?: ProductMaturity; priority: Priority
  collaborationStatus: CollaborationStatus; rating?: Rating
  strategicFit?: 'Excellent Fit' | 'Good Fit' | 'Not fit'
  whatsGreat?: string; whatsLacking?: string; nextSteps?: NextSteps
  starEngagement?: boolean; website?: string; documentsLink?: string
  keywords?: string; keyContacts: KeyContact[]
  hqCountry?: string
  timeline: TimelineEvent[]
  cyberSecurityReview?: CyberSecurityReview
  cyberSecurityStatus?: 'Pending' | 'Ongoing' | 'Completed'
  cyberSecurityReviewFile?: AttachedDocument
  saasFile?: AttachedDocument
  ndaDocuments?: AttachedDocument[]
  legalDocuments?: AttachedDocument[]
  videos?: VideoLink[]
  costs?: StartupCosts
  // Framework fields
  valueDrivers?: string[]
  potentialCostSaving?: number | null    // AED/year
  potentialTimeSaving?: number | null    // hours/year
  potentialQualitySaving?: number | null // AED saved by re-work
  potentialSafetyImpact?: number | null  // injuries prevented
  potentialEsgOffset?: number | null     // kg CO2 offset
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
  createdAt: string; updatedAt: string
}

export interface UserRating {
  userId: string; userName: string; startupId: string
  rating: number; createdAt: string; updatedAt: string
}

export interface Comment {
  id: string; startupId: string; userId: string; userName: string
  body: string; createdAt: string
}

export interface AuditEntry {
  id: string; userId: string; userName: string; startupId?: string
  companyName?: string; action: string; oldValue?: string; newValue?: string; createdAt: string
}

export interface Notification {
  id: string; message: string; type: 'status' | 'comment' | 'user' | 'info'
  read: boolean; createdAt: string
}
