import 'server-only' // Build fails if this module is ever imported into a client bundle.
import { queryOne } from '@/lib/server/db/client'
import logger from '@/lib/server/logger'

interface AuditParams {
  userId: string
  userName: string
  action: string
  entityName?: string
  oldValue?: string
  newValue?: string
}

export async function logAudit(p: AuditParams): Promise<void> {
  try {
    await queryOne(
      `INSERT INTO audit_entries (user_id, user_name, company_name, action, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.userId, p.userName, p.entityName || null, p.action, p.oldValue || null, p.newValue || null]
    )
  } catch (err) {
    // non-fatal — audit failures must not break the main request
    logger.warn({ err }, 'Failed to write audit log')
  }
}
