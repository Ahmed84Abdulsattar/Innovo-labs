import 'client-only' // Build fails if this browser-only module is ever pulled into a server bundle.
// Uses exceljs — runs in the browser via its browser bundle
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Startup, UserRating, IdeaSubmission } from '@/lib/shared/types'
import type { Initiative } from '@/lib/shared/data/initiatives-data'

// ── helpers ────────────────────────────────────────────────────────────────

function avgRating(startupId: string, userRatings: UserRating[]) {
  const rs = userRatings.filter(r => r.startupId === startupId)
  if (!rs.length) return null
  return Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10
}

function stars(n: number) {
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)) + `  ${n.toFixed(1)}`
}

function fmt(date?: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function flatRow(ini: Startup, userRatings: UserRating[]) {
  const avg = avgRating(ini.id, userRatings)
  const ratingCount = userRatings.filter(r => r.startupId === ini.id).length
  const timelineText = (ini.timeline || []).map(e => {
    const parts = [fmt(e.date), e.status]
    if (e.rating)   parts.push(`Rating: ${e.rating}`)
    if (e.feedback) parts.push(e.feedback)
    return parts.join(' | ')
  }).join('\n')

  return {
    'ID':                   ini.id,
    'Company':              ini.company,
    'Product':              ini.product,
    'Source':               ini.source,
    'Sector':               ini.sector,
    'Technology':           (ini.technologies || []).join(', '),
    'Business Units':       (ini.businessUnits || []).join(', '),
    'Departments':          (ini.departments || []).join(', '),
    'Priority':             ini.priority,
    'Collaboration Status': ini.collaborationStatus,
    'Rating':               ini.rating || '—',
    'Avg User Rating':      avg ? stars(avg) : 'No ratings',
    'User Ratings Count':   ratingCount,
    'Star Engagement':      ini.starEngagement ? 'Yes' : 'No',
    'Product Maturity':     ini.productMaturity || '',
    'HQ Country':           ini.hqCountry || '',
    'Key Contacts':         (ini.keyContacts || []).map(c => `${c.name} (${c.email})`).join('; '),
    'Next Steps':           ini.nextSteps || '',
    'Website':              ini.website || '',
    'Keywords':             ini.keywords || '',
    "What's Great":         ini.whatsGreat || '',
    "What's Lacking":       ini.whatsLacking || '',
    'Department ID':        ini.departmentId,
    'Documents Link':       ini.documentsLink || '',
    'Timeline':             timelineText,
    'Created':              fmt(ini.createdAt),
    'Last Updated':         fmt(ini.updatedAt),
  }
}

const COL_WIDTHS = [
  6, 22, 24, 18, 16, 28, 22, 22, 10, 28,
  16, 20, 14, 10, 22, 12, 12, 16, 18, 34,
  18, 26, 20, 36, 36, 18, 22, 26, 44, 14, 14
]

const HEADER_BG = 'FF9EF3EE' // aqua
const HEADER_FG = 'FF122023' // slate

function styleHeader(row: ExcelJS.Row) {
  row.height = 22
  row.eachCell(cell => {
    cell.font    = { name: 'Arial', size: 10, bold: true, color: { argb: HEADER_FG } }
    cell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    cell.border  = {
      top: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      bottom: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      left: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      right: { style: 'thin', color: { argb: 'FFB2EDE9' } },
    }
  })
}

function styleDataRow(row: ExcelJS.Row, isAlt: boolean) {
  row.height = 40
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFF0FFFE' : 'FFFFFFFF' } }
    cell.font    = { name: 'Arial', size: 10, color: { argb: 'FF0A1214' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border  = {
      top: { style: 'thin', color: { argb: 'FFE2EAEC' } },
      bottom: { style: 'thin', color: { argb: 'FFE2EAEC' } },
      left: { style: 'thin', color: { argb: 'FFE2EAEC' } },
      right: { style: 'thin', color: { argb: 'FFE2EAEC' } },
    }
  })
}

async function buildMasterSheet(wb: ExcelJS.Workbook, startups: Startup[], userRatings: UserRating[]) {
  const ws = wb.addWorksheet('Initiatives')
  ws.views = [{ state: 'frozen', ySplit: 2 }]

  if (startups.length === 0) {
    ws.addRow(['No startups to export'])
    return
  }

  const rows = startups.map(i => flatRow(i, userRatings))
  const headers = Object.keys(rows[0])

  // Set column widths
  ws.columns = headers.map((h, i) => ({
    key: h, header: h, width: COL_WIDTHS[i] ?? 18
  }))

  // Header row
  const headerRow = ws.addRow(headers)
  styleHeader(headerRow)

  // Data rows
  rows.forEach((row, idx) => {
    const r = ws.addRow(Object.values(row))
    styleDataRow(r, idx % 2 === 1)
  })
}

async function buildSummarySheet(wb: ExcelJS.Workbook, startups: Startup[]) {
  const ws = wb.addWorksheet('Summary')
  ws.columns = [{ key: 'status', width: 34 }, { key: 'count', width: 12 }]

  const headerRow = ws.addRow(['Collaboration Status', 'Count'])
  styleHeader(headerRow)

  const statuses = [
    'To be assessed', 'Assessed', 'Business Review',
    'Pilot', 'Onboarded',
    'Rejected by Digital Innovation', 'Rejected by Business',
  ]
  statuses.forEach((s, idx) => {
    const count = startups.filter(i => i.collaborationStatus === s).length
    const r = ws.addRow([s, count])
    styleDataRow(r, idx % 2 === 1)
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Total row
  const total = ws.addRow(['TOTAL', startups.length])
  total.height = 22
  total.eachCell(cell => {
    cell.font  = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F9790' } }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0FAF8' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      bottom: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      left: { style: 'thin', color: { argb: 'FFB2EDE9' } },
      right: { style: 'thin', color: { argb: 'FFB2EDE9' } },
    }
  })
}

// ── PUBLIC: export all ─────────────────────────────────────────────────────

export async function exportAllStartups(startups: Startup[], userRatings: UserRating[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Innovo Digital Initiatives Portal'
  wb.created  = new Date()

  await buildMasterSheet(wb, startups, userRatings)
  await buildSummarySheet(wb, startups)

  const buffer = await wb.xlsx.writeBuffer()
  const date   = new Date().toISOString().slice(0, 10)
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `innovo-startups-${date}.xlsx`)
}

// ── PUBLIC: export single ──────────────────────────────────────────────────

export async function exportSingleStartup(ini: Startup, userRatings: UserRating[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Innovo Digital Initiatives Portal'
  wb.created  = new Date()

  // Sheet 1 — Details (vertical key-value)
  const ws1 = wb.addWorksheet('Startup Details')
  ws1.columns = [{ key: 'field', width: 26 }, { key: 'value', width: 54 }]

  const headerRow = ws1.addRow(['Field', 'Value'])
  styleHeader(headerRow)

  const row = flatRow(ini, userRatings)
  Object.entries(row).forEach(([key, value], idx) => {
    const r = ws1.addRow([key, String(value)])
    r.height = String(value).includes('\n') ? 60 : 20
    r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF5A7A82' } }
    r.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF0A1214' } }
    r.getCell(2).alignment = { vertical: 'middle', wrapText: true }
    r.getCell(1).fill = r.getCell(2).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF0FFFE' }
    }
    r.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2EAEC' } },
        bottom: { style: 'thin', color: { argb: 'FFE2EAEC' } },
        left: { style: 'thin', color: { argb: 'FFE2EAEC' } },
        right: { style: 'thin', color: { argb: 'FFE2EAEC' } },
      }
    })
  })

  // Sheet 2 — Timeline
  if (ini.timeline?.length) {
    const ws2 = wb.addWorksheet('Timeline')
    ws2.columns = [
      { key: 'date',    width: 16 },
      { key: 'status',  width: 30 },
      { key: 'rating',  width: 16 },
      { key: 'feedback',width: 46 },
      { key: 'by',      width: 20 },
    ]
    const th = ws2.addRow(['Date', 'Status', 'Rating', 'Feedback / Notes', 'Updated by'])
    styleHeader(th)

    ini.timeline.forEach((e, idx) => {
      const r = ws2.addRow([fmt(e.date), e.status, e.rating || '—', e.feedback || '', e.createdByName])
      styleDataRow(r, idx % 2 === 1)
      r.height = 20
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const safeName = ini.company.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `innovo-${safeName}.xlsx`)
}

// ── PUBLIC: export initiatives board ──────────────────────────────────────

export async function exportInitiativesBoard(items: Initiative[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Innovo Digital Initiatives Portal'
  wb.created  = new Date()

  const ws = wb.addWorksheet('Startups')
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const cols = [
    { key: 'initiativeId',       header: 'ID',                  width: 12 },
    { key: 'name',               header: 'Name',                width: 32 },
    { key: 'description',        header: 'Description',         width: 36 },
    { key: 'problemStatement',   header: 'Problem Statement',   width: 36 },
    { key: 'proposedSolution',   header: 'Proposed Solution',   width: 36 },
    { key: 'valueDrivers',       header: 'Value Drivers',       width: 28 },
    { key: 'potentialCostSaving',   header: 'Cost Saving (AED/yr)',   width: 20 },
    { key: 'potentialTimeSaving',   header: 'Time Saving (hrs/yr)',   width: 20 },
    { key: 'potentialSafetyImpact', header: 'Safety (Injuries)',       width: 18 },
    { key: 'potentialQualitySaving',header: 'Quality (AED Re-Work)',   width: 20 },
    { key: 'potentialEsgOffset',    header: 'ESG (kg CO2 Offset)',     width: 18 },
    { key: 'identifiedSolution', header: 'Identified Solution', width: 22 },
    { key: 'linkedStartup',      header: 'Linked Startup',      width: 20 },
    { key: 'businessUnits',      header: 'Business Units',      width: 22 },
    { key: 'departments',        header: 'Departments',         width: 22 },
    { key: 'priority',           header: 'Priority',            width: 12 },
    { key: 'status',             header: 'Status',              width: 18 },
    { key: 'progress',           header: 'Progress',            width: 28 },
    { key: 'nextSteps',          header: 'Next Steps',          width: 28 },
    { key: 'lessonsLearnt',      header: 'Lessons Learnt',      width: 28 },
    { key: 'created',            header: 'Created',             width: 14 },
    { key: 'updated',            header: 'Last Updated',        width: 14 },
  ]
  ws.columns = cols

  const headerRow = ws.getRow(1)
  headerRow.values = cols.map(c => c.header)
  styleHeader(headerRow)

  items.forEach((item, idx) => {
    const r = ws.addRow([
      item.initiativeId,
      item.name,
      item.description,
      item.problemStatement,
      item.proposedSolution,
      item.valueDrivers.join(', '),
      item.potentialCostSaving    ?? '',
      item.potentialTimeSaving    ?? '',
      item.potentialSafetyImpact  ?? '',
      item.potentialQualitySaving ?? '',
      item.potentialEsgOffset     ?? '',
      item.identifiedSolution || '',
      item.linkedStartup || '',
      item.businessUnits.join(', '),
      item.departments.join(', '),
      item.priority,
      item.status,
      item.progress,
      item.nextSteps,
      item.lessonsLearnt,
      fmt(item.createdAt),
      fmt(item.updatedAt),
    ])
    styleDataRow(r, idx % 2 === 1)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const date   = new Date().toISOString().slice(0, 10)
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `innovo-initiatives-${date}.xlsx`)
}

// ── PUBLIC: export ideas ───────────────────────────────────────────────────

export async function exportIdeas(ideas: IdeaSubmission[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Innovo Digital Initiatives Portal'
  wb.created  = new Date()

  const ws = wb.addWorksheet('Ideas')
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const cols = [
    { key: 'problemTitle',       header: 'Title',               width: 32 },
    { key: 'problemDescription', header: 'Description',         width: 40 },
    { key: 'currentProcess',     header: 'Current Process',     width: 32 },
    { key: 'impactIfSolved',     header: 'Impact If Solved',    width: 32 },
    { key: 'estimatedTimeSaved', header: 'Time Saved Estimate', width: 22 },
    { key: 'affectedTeams',      header: 'Affected Teams',      width: 24 },
    { key: 'urgency',            header: 'Urgency',             width: 12 },
    { key: 'suggestedSolution',  header: 'Suggested Solution',  width: 36 },
    { key: 'expectedBenefits',   header: 'Expected Benefits',   width: 36 },
    { key: 'anyBudgetInMind',    header: 'Budget In Mind',      width: 18 },
    { key: 'status',             header: 'Status',              width: 24 },
    { key: 'submittedBy',        header: 'Submitted By',        width: 20 },
    { key: 'department',         header: 'Department',          width: 20 },
    { key: 'created',            header: 'Submitted Date',      width: 16 },
  ]
  ws.columns = cols

  const headerRow = ws.getRow(1)
  headerRow.values = cols.map(c => c.header)
  styleHeader(headerRow)

  ideas.forEach((idea, idx) => {
    const r = ws.addRow([
      idea.problemTitle,
      idea.problemDescription,
      idea.currentProcess || '',
      idea.impactIfSolved || '',
      idea.estimatedTimeSaved || '',
      (idea.affectedTeams || []).join(', '),
      idea.urgency,
      idea.suggestedSolution || '',
      idea.expectedBenefits || '',
      idea.anyBudgetInMind || '',
      idea.status,
      idea.submittedByName,
      idea.submittedByDept,
      fmt(idea.createdAt),
    ])
    styleDataRow(r, idx % 2 === 1)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const date   = new Date().toISOString().slice(0, 10)
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `innovo-ideas-${date}.xlsx`)
}
