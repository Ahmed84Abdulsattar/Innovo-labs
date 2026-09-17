import 'server-only' // Build fails if this module is ever imported into a client bundle.
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
  redact: ['password', 'password_hash', 'token', 'code', 'otp'],
})

export default logger
