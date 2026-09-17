// The Challenge shape. The built-in challenges are seeded into the database
// (migrations/032_seed_challenges.sql) and managed there — the app reads them
// from /api/challenges, so there is intentionally no static array in code.
export interface Challenge {
  id: string
  number: number
  title: string
  shortDescription: string
  overview: string
  keyChallenges: string[]
  innovationOpportunities: string[]
  businessImpact: string[]
  useCases?: string[]
  strategicFocusAreas?: string[]
  isCustom?: boolean
}
