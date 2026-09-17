import { NextResponse } from 'next/server'
import { query, queryOneAsUser } from '@/lib/server/db/client'
import { CreateNewsSchema } from '@/lib/shared/validate'
import { defineRoute } from '@/lib/server/api/handler'
import { signImages, canonicalImageUrl } from '@/lib/server/storage'
import { logAudit } from '@/lib/server/audit'
import { serverCache } from '@/lib/server/server-cache'

function toArticle(row: any) {
  return {
    id:               row.id,
    title:            row.title,
    excerpt:          row.excerpt,
    content:          row.content,
    categories:       row.categories || [],
    thumbnailUrl:     row.thumbnail_url,
    thumbnailDataUrl: row.thumbnail_data_url,
    articleImages:    row.article_images || [],
    videoDataUrl:     row.video_data_url,
    source:           row.source,
    author:           row.author,
    publishedAt:      row.published_at,
    createdAt:        row.created_at,
    isCustom:         row.is_custom,
  }
}

export const GET = defineRoute({ errorMessage: 'Failed to fetch news' }, async () => {
  // News is global content. Cache the mapped list with CANONICAL thumbnail refs;
  // sign per request (signed URLs are short-lived and must not be cached). Build
  // fresh copies rather than mutating the cached array.
  let articles = await serverCache.get<any[]>('news:list')
  if (!articles) {
    const rows = await query(
      `SELECT id, title, excerpt, categories, thumbnail_url, thumbnail_data_url,
              source, author, published_at, created_at, is_custom
       FROM news_articles ORDER BY published_at DESC`
    )
    articles = rows.map(toArticle)
    await serverCache.set('news:list', articles, 60)
  }
  const signed = await signImages(articles.map((a: any) => a.thumbnailUrl))
  const out = articles.map((a: any, i: number) => ({ ...a, thumbnailUrl: signed[i] }))
  return NextResponse.json(
    { articles: out },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
  )
})

export const POST = defineRoute({
  roles: ['super_admin', 'innovation_admin'],
  forbiddenMessage: 'Only admins can create articles.',
  schema: CreateNewsSchema,
  rateLimit: { limit: 20, window: 60_000 },
  errorMessage: 'Failed to create article',
}, async ({ user: me, body: b }) => {
  const row = await queryOneAsUser(me,
    `INSERT INTO news_articles
      (title, excerpt, content, categories, thumbnail_url, thumbnail_data_url,
       article_images, video_data_url, source, author, published_at, is_custom, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12)
     RETURNING *`,
    [
      b.title, b.excerpt || null, b.content || null, b.categories,
      b.thumbnailUrl || null, b.thumbnailDataUrl || null,
      JSON.stringify(b.articleImages || []),
      canonicalImageUrl(b.videoDataUrl), b.source || null, b.author || null,
      b.publishedAt || new Date().toISOString(),
      me.id,
    ]
  )
  await logAudit({ userId: me.id, userName: me.name || me.username, action: 'created', entityName: `News: ${b.title}` })
  await serverCache.delPrefix('news:')
  const article = toArticle(row)
  article.thumbnailUrl = (await signImages([article.thumbnailUrl]))[0]
  return NextResponse.json({ article }, { status: 201 })
})
