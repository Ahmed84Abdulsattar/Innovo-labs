// Shared idea constants used by the Ideas list, submit form, and detail page.

// "How will your idea benefit Innovo's business" — value drivers + units.
export const BENEFIT_DRIVERS = [
  { key: 'Cost Saving', unit: 'AED/month', field: 'benefitCostSaving' },
  { key: 'Time Saving', unit: 'hrs/month', field: 'benefitTimeSaving' },
  { key: 'Quality',     unit: 'AED/month', field: 'benefitQuality' },
  { key: 'Safety',      unit: '%',         field: 'benefitSafety' },
  { key: 'ESG',         unit: 'CO₂/month', field: 'benefitEsg' },
] as const

export const IDEA_STATUSES = [
  'Submitted', 'Pending', 'Under Review', 'Accepted', 'Declined', 'Converted to Initiative',
] as const

// Statuses an admin can move an idea to (excludes the automatic 'Submitted').
export const IDEA_REVIEW_STATUSES = [
  'Pending', 'Under Review', 'Accepted', 'Declined', 'Converted to Initiative',
] as const

export const IDEA_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'Submitted':            { bg: 'var(--su-blue-bg)',   text: 'var(--su-blue-tx)' },
  'Pending':              { bg: 'var(--gray-100)',     text: 'var(--text-secondary)' },
  'Under Review':         { bg: 'var(--su-amber-bg)',  text: 'var(--su-amber-tx)' },
  'Accepted':             { bg: 'var(--su-green-bg)',  text: 'var(--su-green-tx)' },
  'Declined':             { bg: 'var(--su-red-bg2)',   text: 'var(--su-red-tx)' },
  'Converted to Initiative': { bg: 'var(--aqua-light)',   text: 'var(--accent)' },
}
