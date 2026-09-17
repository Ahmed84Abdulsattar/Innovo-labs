import 'server-only' // Build fails if this module is ever imported into a client bundle.
// ── DB row → API response serializers ─────────────────────────────────────
// Keeps the response shape identical across the list and detail endpoints.

import { signImages, canonicalImageUrl } from '@/lib/server/storage'

// The startup fields that carry uploaded-file references (documents / videos
// buckets). Each is either an array of { url, … } objects or a single such
// object. External links (e.g. a YouTube video URL) pass through untouched.
function forEachFileRef(s: any, fn: (obj: any) => void) {
  for (const f of ['ndaDocuments', 'legalDocuments', 'videos']) {
    if (Array.isArray(s?.[f])) for (const item of s[f]) if (item && typeof item === 'object') fn(item)
  }
  for (const f of ['cyberSecurityReviewFile', 'saasFile']) {
    if (s?.[f] && typeof s[f] === 'object') fn(s[f])
  }
}

// Replace every file URL across the given startups with a short-lived signed
// URL (batched into one Storage call). Mutates in place.
export async function signStartupFiles(startups: any[]): Promise<void> {
  const setters: ((v: string | null) => void)[] = []
  const urls: (string | null | undefined)[] = []
  for (const s of startups) forEachFileRef(s, (obj) => {
    if ('url' in obj) { urls.push(obj.url); setters.push(v => { obj.url = v }) }
  })
  if (!urls.length) return
  const signed = await signImages(urls)
  signed.forEach((v, i) => setters[i](v))
}

// Normalise file URLs to their stable canonical form before storing, so an edit
// never persists a (short-lived) signed URL it was shown. Mutates in place.
export function canonicalizeStartupFiles(data: any): void {
  forEachFileRef(data, (obj) => {
    if (typeof obj.url === 'string') obj.url = canonicalImageUrl(obj.url)
  })
}

export function toStartup(row: any) {
  return {
    id:                       row.id,
    startupId:                row.startup_id,
    departmentId:             row.department_id,
    createdBy:                row.created_by,
    company:                  row.company,
    product:                  row.product,
    description:              row.description,
    solutionDetails:          row.solution_details,
    commercialModel:          row.commercial_model,
    source:                   row.source,
    sector:                   row.sector,
    technologies:             row.technologies || [],
    businessUnits:            row.business_units || [],
    departments:              row.departments || [],
    hqCountry:                row.hq_country,
    productMaturity:          row.product_maturity,
    problemStatement:         row.problem_statement,
    priority:                 row.priority,
    collaborationStatus:      row.collaboration_status,
    rating:                   row.rating,
    strategicFit:             row.strategic_fit,
    whatsGreat:               row.whats_great,
    whatsLacking:             row.whats_lacking,
    nextSteps:                row.next_steps,
    starEngagement:           row.star_engagement,
    website:                  row.website,
    documentsLink:            row.documents_link,
    keywords:                 row.keywords,
    keyContacts:              row.key_contacts || [],
    cyberSecurityReview:      row.cyber_security_review,
    cyberSecurityStatus:      row.cyber_security_status,
    cyberSecurityReviewFile:  row.cyber_security_review_file,
    saasFile:                 row.saas_file,
    ndaDocuments:             row.nda_documents || [],
    legalDocuments:           row.legal_documents || [],
    videos:                   row.videos || [],
    costs:                    row.costs || { capex: [], opex: [] },
    timeline:                 row.timeline || [],
    valueDrivers:             row.value_drivers            || [],
    potentialCostSaving:      row.potential_cost_saving    != null ? Number(row.potential_cost_saving)    : null,
    potentialTimeSaving:      row.potential_time_saving    != null ? Number(row.potential_time_saving)    : null,
    potentialQualitySaving:   row.potential_quality_saving != null ? Number(row.potential_quality_saving) : null,
    potentialSafetyImpact:    row.potential_safety_impact  != null ? Number(row.potential_safety_impact)  : null,
    potentialEsgOffset:       row.potential_esg_offset     != null ? Number(row.potential_esg_offset)     : null,
    secondaryValueDrivers:    row.secondary_value_drivers  || [],
    applicableStakeholders:   row.applicable_stakeholders  || [],
    projectLifecycleStages:   row.project_lifecycle_stages || [],
    projectTypes:             row.project_types            || [],
    projectLocation:          row.project_location         || [],
    applicableProjectSize:    row.applicable_project_size  || [],
    applicableProjectValue:   row.applicable_project_value || [],
    technologyCategory:       row.technology_category      || [],
    implementationComplexity: row.implementation_complexity ?? null,
    investmentLevel:          row.investment_level         ?? null,
    changeManagementEffort:   row.change_management_effort ?? null,
    deploymentType:           row.deployment_type          || [],
    visibility:               row.visibility               ?? null,
    projectComplexity:        row.project_complexity       ?? null,
    createdAt:                row.created_at,
    updatedAt:                row.updated_at,
  }
}
