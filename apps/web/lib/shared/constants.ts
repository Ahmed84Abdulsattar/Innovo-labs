import type { Department, CollaborationStatus, Priority, ProductMaturity, Rating, NextSteps, Source } from './types'

export const DEPARTMENTS: Department[] = ['Build','MEP','Development','Infrastructure','Digital Innovation','IMS/Corporate','Steel Fabrication','Concrete Manufacturing']
export const SOURCES: Source[] = ['noa','Brick & Mortar','Innovo VC','Event/ Conference','Internal Recommendation','Partner/ University','Startup Outreach','Others']
export const SECTORS = ['Climate Tech','ConTech','Cybersecurity','FinTech','Logistics','Manufacturing','PropTech','Software Development','Urban Tech']
export const TECHNOLOGIES = ['AI & ML','3D Printing','Assets & Logistics','Data Analytics','Digital Transformation','Digital Twin','Drones & UAV','IoT','Machine Learning','Material Innovation','Modern methods of construction','Process Automation','Reality Capture','Robotics','SAAS','Surveying Tech','Sustainability','Wearable Tech']
export const BUSINESS_UNITS: string[] = ['Build','MEP','Development','Infrastructure','Digital Innovation','IMS/Corporate']
export const DEPT_OPTIONS = ['Capital Planning','Tender','Estimation','Technical','Contracts','Cost Control','HSE','Operations','Planning','Procurement','QS','Quality','SCM & Logistics','Workshop','ESG','Finance','Digital Innovation','O&M']

// Departments — matches exactly INITIATIVE_DEPARTMENTS in initiatives-data.ts
export const BUILD_DEPARTMENTS = [
  'Procurement',
  'Safety',
  'Estimation & Tendering',
  'Planning',
  'Operations',
  'Quality & Handover',
  'Cost Control',
  'ESG',
  'Technical',
  'MEP Build',
  'Design',
  'Digital Innovation',
  'Finance',
  'HR',
  'Legal',
  'Contracts',
] as const

// Maps each sidebar department → the department labels stored on startups
export const BUILD_DEPT_MAP: Record<string, string[]> = {
  'Procurement':            ['Procurement'],
  'Safety':                 ['Safety', 'HSE', 'Health & Safety'],
  'Estimation & Tendering': ['Estimation & Tendering', 'Estimation', 'Tender', 'QS'],
  'Planning':               ['Planning', 'Capital Planning'],
  'Operations':             ['Operations', 'O&M'],
  'Quality & Handover':     ['Quality & Handover', 'Quality', 'QA'],
  'Cost Control':           ['Cost Control'],
  'ESG':                    ['ESG', 'Sustainability'],
  'Technical':              ['Technical'],
  'MEP Build':              ['MEP Build', 'MEP Engineering'],
  'Design':                 ['Design', 'Architecture'],
  'Digital Innovation':     ['Digital Innovation'],
  'Finance':                ['Finance'],
  'HR':                     ['HR'],
  'Legal':                  ['Legal'],
  'Contracts':              ['Contracts'],
}

export const PRODUCT_MATURITIES: ProductMaturity[] = ['Early Stage','Market Ready','Scaling','Mature']
export const PRIORITIES: Priority[] = ['Low','Medium','High']
export const COLLABORATION_STATUSES: CollaborationStatus[] = ['Identified','Assessed','Business Review','Pilot','Onboarded','Rejected']
export const RATINGS: Rating[] = ['Underwhelming','Has Potential','Promising','Impressive']
export const NEXT_STEPS: NextSteps[] = ['Assess','Deploy','Hold','Pilot','Scale','Archive']

export const COMMERCIAL_MODELS = ['Saas/ Per user','Project/ Construction Value','Consumption based','Hardware + Software'] as const
export type CommercialModel = typeof COMMERCIAL_MODELS[number]

export const BU_TABS = ['Build','MEP','Development'] as const
export type BUTab = typeof BU_TABS[number]

// Maps sidebar BU name → all stored business_unit label variants
export const BU_FILTER_MAP: Record<string, string[]> = {
  'Build':              ['Build'],
  'MEP':                ['MEP', 'Innovo MEP'],
  'Development':        ['Development'],
  'Infrastructure':     ['Infrastructure'],
  'Digital Innovation': ['Digital Innovation'],
  'IMS/Corporate':      ['IMS/Corporate'],
}

export const TIMELINE_STEPS: { status: CollaborationStatus; label: string; hasRating: boolean; hasFeedback: boolean }[] = [
  { status: 'Identified',     label: 'Identified',        hasRating: false, hasFeedback: false },
  { status: 'Assessed',       label: 'Assessment',        hasRating: true,  hasFeedback: true  },
  { status: 'Business Review',label: 'Business Review',   hasRating: true,  hasFeedback: true  },
  { status: 'Pilot',          label: 'Pilot',             hasRating: false, hasFeedback: true  },
  { status: 'Onboarded',      label: 'Onboarded',         hasRating: false, hasFeedback: true  },
  { status: 'Rejected',       label: 'Rejected',          hasRating: true,  hasFeedback: true  },
]

export const AFFECTED_TEAMS = ['Build','MEP','Development','Infrastructure','Digital Innovation','IMS/Corporate','Finance','HR','Legal','Procurement']

// ── Construction Innovation Framework Matrix ──────────────────────────────────
// Option lists mirror the "Innovo Lab framework" Excel sheet (Startups tab).

export const VISIBILITY_OPTIONS = ['Internal', 'Global'] as const

export const PRIMARY_VALUE_DRIVERS = [
  'Cost Saving',
  'Time Saving',
  'Site Safety',
  'Quality',
  'ESG',
] as const

export const SECONDARY_VALUE_DRIVERS = [
  'Revenue Growth',
  'Customer Experience',
  'Digitalisation & Data',
  'Productivity Improvement',
  'Risk Reduction',
  'Compliance',
] as const

export const STAKEHOLDERS = [
  'Developer',
  'Consultant/Designer',
  'Contractor',
  'Asset Owner',
  'Multi-Stakeholder',
] as const

export type Stakeholder = typeof STAKEHOLDERS[number]


export const PROJECT_LIFECYCLE_STAGES = [
  'Land Acquisition',
  'Feasibility',
  'Concept Design',
  'Detailed Design',
  'Procurement',
  'Construction',
  'Commissioning',
  'Handover',
  'Operations & FM',
  'Asset Optimization',
]

// "Project Sector" in the framework sheet (previously called Project Type)
export const PROJECT_TYPES = [
  'Residential High-Rise',
  'Residential Low-Rise',
  'Villas & Communities',
  'Ultra Luxury Residences',
  'Mixed Use',
  'Retail & Commercial',
  'Hospitality',
  'Healthcare',
  'Education & Institutional',
  'Industrial & Warehouse',
  'Road & Bridges',
  'Airport',
  'Marine & Seaport',
  'Oil & Gas and Energy',
  'Data Centers',
] as const

export const PROJECT_LOCATIONS = [
  'High-Density Urban',
  'Developed Suburban',
  'Remote / Greenfield',
] as const

export const PROJECT_SIZE_OPTIONS = [
  'upto 250,000 sqm',
  '250,001 - 500,000 sqm',
  '500,001 - 750,000 sqm',
  'Over 750,000 sqm',
] as const

export const PROJECT_COMPLEXITIES = ['Simple', 'Challenging', 'Complex'] as const

export const TECHNOLOGY_CATEGORIES = [
  '3D Printing',
  'AI & Machine Learning',
  'AR/VR',
  'Assets & Logistics',
  'BIM',
  'Blockchain',
  'Computer Vision',
  'Data Analytics',
  'Drones & UAVs',
  'IoT',
  'Machine Learning',
  'Material Innovation',
  'Reality Capture & Digital Twin',
  'Robotics & Autonomy',
  'SAAS & Cloud Platforms',
  'Wearable Tech',
] as const

export const IMPLEMENTATION_COMPLEXITIES = ['Low', 'Medium', 'High', 'Transformational'] as const
export const INVESTMENT_LEVELS           = ['Low', 'Medium', 'High', 'Strategic'] as const
export const CHANGE_MANAGEMENT_EFFORTS   = ['Low', 'Medium', 'High'] as const
export const DEPLOYMENT_TYPES            = ['SaaS', 'On-Premise', 'Managed Service', 'Hardware + Software'] as const
export const URGENCY_LEVELS = ['Low','Medium','High','Critical'] as const
