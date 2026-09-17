import { z } from 'zod'
import { MAX_COLLAB_IMAGES } from './data/collaborations-data'

const innovoEmail = z
  .string()
  .email('Invalid email address.')
  .refine(e => e.toLowerCase().endsWith('@innovogroup.com'), {
    message: 'Only @innovogroup.com email addresses are permitted.',
  })

// ── Auth ──────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    innovoEmail,
  password: z.string().min(1, 'Password is required.'),
})

// ── Startups ───────────────────────────────────────────────────────────

export const CreateStartupSchema = z.object({
  company:                  z.string().min(1).max(200),
  product:                  z.string().min(1).max(200),
  description:              z.string().max(5000).optional(),
  source:                   z.string().max(200).optional(),
  sector:                   z.string().max(200).optional(),
  technologies:             z.array(z.string()).optional(),
  businessUnits:            z.array(z.string()).optional(),
  departments:              z.array(z.string()).optional(),
  solutionDetails:          z.string().max(5000).optional(),
  hqCountry:                z.string().max(100).optional(),
  commercialModel:          z.string().max(100).optional(),
  problemStatement:         z.string().max(5000).optional(),
  productMaturity:          z.string().max(100).optional(),
  priority:                 z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  collaborationStatus:      z.string().max(100).optional(),
  rating:                   z.string().max(50).optional(),
  whatsGreat:               z.string().max(3000).optional(),
  whatsLacking:             z.string().max(3000).optional(),
  nextSteps:                z.string().max(3000).optional(),
  starEngagement:           z.boolean().optional(),
  // Rejects invalid URLs with a clear message instead of silently dropping
  // them. The Excel import sanitises URLs client-side before submitting, so
  // it never sends an invalid value here.
  website:                  z.string().max(500).optional()
    .transform(v => v?.trim() || undefined)
    .refine(v => {
      if (v === undefined) return true
      try { new URL(v); return true } catch { return false }
    }, 'Website must be a valid URL (including https://).'),
  documentsLink:            z.string().max(500).optional(),
  keywords:                 z.string().max(500).optional(),
  strategicFit:             z.enum(['Excellent Fit', 'Good Fit', 'Not fit']).optional(),
  keyContacts:              z.array(z.record(z.unknown())).optional(),
  costs:                    z.record(z.unknown()).optional(),
  departmentId:             z.string().optional(),
})

export const UpdateStartupSchema = CreateStartupSchema.partial().extend({
  cyberSecurityReview:      z.record(z.unknown()).optional(),
  cyberSecurityStatus:      z.enum(['Pending', 'Ongoing', 'Completed']).optional().nullable(),
  cyberSecurityReviewFile:  z.record(z.unknown()).optional().nullable(),
  saasFile:                 z.record(z.unknown()).optional().nullable(),
  ndaDocuments:             z.array(z.record(z.unknown())).optional(),
  legalDocuments:           z.array(z.record(z.unknown())).optional(),
  videos:                   z.array(z.record(z.unknown())).optional(),
  valueDrivers:             z.array(z.string()).optional(),
  potentialCostSaving:      z.number().optional().nullable(),
  potentialTimeSaving:      z.number().optional().nullable(),
  potentialQualitySaving:   z.number().optional().nullable(),
  potentialSafetyImpact:    z.number().optional().nullable(),
  potentialEsgOffset:       z.number().optional().nullable(),
  secondaryValueDrivers:    z.array(z.string()).optional(),
  applicableStakeholders:   z.array(z.string()).optional(),
  projectLifecycleStages:   z.array(z.string()).optional(),
  projectTypes:             z.array(z.string()).optional(),
  projectLocation:          z.array(z.string()).optional(),
  applicableProjectSize:    z.array(z.string()).optional(),
  applicableProjectValue:   z.array(z.string()).optional(),
  technologyCategory:       z.array(z.string()).optional(),
  implementationComplexity: z.string().optional().nullable(),
  investmentLevel:          z.string().optional().nullable(),
  changeManagementEffort:   z.string().optional().nullable(),
  deploymentType:           z.array(z.string()).optional(),
  visibility:               z.string().max(50).optional().nullable(),
  projectComplexity:        z.string().max(50).optional().nullable(),
})

// ── Ideas ─────────────────────────────────────────────────────────────────

export const CreateIdeaSchema = z.object({
  problemTitle:        z.string().min(1).max(300),
  problemDescription:  z.string().min(1).max(5000),
  currentProcess:      z.string().max(3000).optional(),
  impactIfSolved:      z.string().max(3000).optional(),
  estimatedTimeSaved:  z.string().max(200).optional(),
  affectedTeams:       z.array(z.string()).optional(),
  urgency:             z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  suggestedSolution:   z.string().max(3000).optional(),
  hasTriedBefore:      z.boolean().optional(),
  triedBeforeDetails:  z.string().max(3000).optional(),
  expectedBenefits:    z.string().max(3000).optional(),
  anyBudgetInMind:     z.string().max(500).optional(),
  // Value tracker + business function
  benefitDrivers:        z.array(z.string()).optional(),
  benefitCostSaving:     z.number().optional().nullable(),
  benefitTimeSaving:     z.number().optional().nullable(),
  benefitQuality:        z.number().optional().nullable(),
  benefitSafety:         z.number().optional().nullable(),
  benefitEsg:            z.number().optional().nullable(),
  benefitBusinessUnits:  z.array(z.string()).optional(),
  benefitDepartments:    z.array(z.string()).optional(),
})

export const UpdateIdeaSchema = z.object({
  status:              z.string().max(100).optional(),
  reviewNotes:         z.string().max(3000).optional(),
  linkedStartupId:  z.string().uuid().optional().nullable(),
  // Contributors assigned by a super admin — enforced server-side in the route.
  contributors:        z.array(z.object({
    id:    z.string().max(100),
    name:  z.string().max(300),
    email: z.string().max(300),
    role:  z.string().max(100),
  })).max(100).optional(),
})

// ── Comments ──────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  startupId: z.string().uuid().optional(),
  ideaId:    z.string().uuid().optional(),
  body:      z.string().min(1).max(5000),
}).refine(d => !!d.startupId !== !!d.ideaId, {
  message: 'Provide exactly one of startupId or ideaId',
})

export const EditCommentSchema = z.object({
  body: z.string().min(1).max(5000),
})

// ── Timeline ──────────────────────────────────────────────────────────────

export const CreateTimelineEventSchema = z.object({
  startupId: z.string().uuid(),
  status:       z.string().min(1).max(100),
  rating:       z.string().max(50).optional(),
  feedback:     z.string().max(3000).optional(),
})

// ── Users ─────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  role:                 z.enum(['super_admin', 'innovation_admin', 'contributor', 'viewer']).optional(),
  department:           z.string().max(200).optional(),
  departmentUnassigned: z.boolean().optional(),
})

// ── Collaborations ────────────────────────────────────────────────────────

// An uploaded image is referenced by a URL on our own Supabase Storage host
// (produced by /api/upload). We deliberately do NOT accept arbitrary external
// https URLs — that would let a caller store off-platform image references that
// then render in other users' browsers. Falls back to accepting any https only
// if NEXT_PUBLIC_SUPABASE_URL is unavailable, so a misconfig can't block uploads.
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host } catch { return '' }
})()

export function isSupabaseStorageUrl(v: string): boolean {
  if (!/^https:\/\//i.test(v)) return false
  if (!SUPABASE_HOST) return true
  try { return new URL(v).host === SUPABASE_HOST } catch { return false }
}

// `dataUrl` now holds a Supabase Storage URL (the client uploads each image and
// stores the returned URL). Legacy rows may still carry a base64 data URL, so
// both are accepted. The 1 MB cap only constrains the legacy data-URL path;
// Storage URLs are tiny. The count cap still bounds the array.
const CollabImageSchema = z.object({
  id:      z.string().max(100),
  dataUrl: z.string()
    .max(1_000_000, 'Image is too large — please use a smaller image.')
    .refine(
      v => isSupabaseStorageUrl(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v),
      'Images must be an uploaded image URL or a JPEG/PNG/WebP image.',
    ),
  caption: z.string().max(300).optional(),
})

export const CreateCollaborationSchema = z.object({
  partner:          z.string().min(1).max(300),
  type:             z.string().max(100).optional(),
  focusArea:        z.string().max(300).optional(),
  description:      z.string().min(1).max(5000),
  status:           z.string().max(100).optional(),
  detailedOverview: z.string().max(10000).optional().nullable(),
  currentStatus:    z.string().max(3000).optional().nullable(),
  nextSteps:        z.string().max(3000).optional().nullable(),
  images:           z.array(CollabImageSchema)
    .max(MAX_COLLAB_IMAGES, `A collaboration can have at most ${MAX_COLLAB_IMAGES} images.`)
    .optional(),
})

export const UpdateCollaborationSchema = CreateCollaborationSchema.partial().extend({
  partner:     z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(5000).optional(),
})

// ── News ──────────────────────────────────────────────────────────────────

export const CreateNewsSchema = z.object({
  title:            z.string().min(1).max(500),
  excerpt:          z.string().max(1000).optional(),
  content:          z.string().max(50000).optional(),
  categories:       z.array(z.string().max(100)).min(1, 'At least one category is required.'),
  source:           z.string().max(500).optional(),
  author:           z.string().max(200).optional(),
  publishedAt:      z.string().optional(),
  thumbnailUrl:     z.string().url().optional().or(z.literal('')).or(z.null()),
  thumbnailDataUrl: z.string().max(2_000_000).optional().nullable(),
  articleImages:    z.array(z.unknown()).optional(),
  videoDataUrl:     z.string().max(2000).optional().nullable(),
})

export const UpdateNewsSchema = CreateNewsSchema.partial().extend({
  title: z.string().min(1).max(500).optional(),
  categories: z.array(z.string().max(100)).optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────

export type ParseOk<T>   = { success: true;  data: T;    error: null }
export type ParseFail    = { success: false; data: null; error: string }
export type ParseResult<T> = ParseOk<T> | ParseFail

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.errors.map(e => e.message).join(', ')
    return { success: false, data: null, error: msg }
  }
  return { success: true, data: result.data, error: null }
}
