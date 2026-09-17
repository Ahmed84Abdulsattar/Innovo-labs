export type NewsCategory =
  | 'AI'
  | 'Digital Twin'
  | 'Robotics'
  | 'Digital Tools'
  | 'Emerging Technology'
  | 'Modern Methods of Construction'

export const NEWS_CATEGORIES: NewsCategory[] = [
  'AI',
  'Digital Twin',
  'Robotics',
  'Digital Tools',
  'Emerging Technology',
  'Modern Methods of Construction',
]

export const CATEGORY_STYLE: Record<NewsCategory, { bg: string; text: string; dot: string }> = {
  'AI':                              { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed' },
  'Digital Twin':                    { bg: '#dbeafe', text: '#1e40af', dot: '#2563eb' },
  'Robotics':                        { bg: '#fef3c7', text: '#92400e', dot: '#d97706' },
  'Digital Tools':                   { bg: '#d1fae5', text: '#065f46', dot: '#059669' },
  'Emerging Technology':             { bg: '#e0faf8', text: '#0f5c58', dot: '#0f9790' },
  'Modern Methods of Construction':  { bg: '#fee2e2', text: '#991b1b', dot: '#dc2626' },
}

export interface ArticleImage {
  id: string
  dataUrl: string
  caption?: string
  position?: number
}

export interface NewsArticle {
  id: string
  title: string
  excerpt: string
  content: string
  categories: NewsCategory[]
  thumbnailUrl?: string
  thumbnailDataUrl?: string
  articleImages?: ArticleImage[]
  videoDataUrl?: string
  source?: string
  author?: string
  publishedAt: string
  createdAt: string
  isCustom?: boolean
}
