// Shared config + helpers for the k6 scripts.
import http from 'k6/http'
import { check } from 'k6'

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
export const SESSION = __ENV.SESSION || ''

// Cookie header sent with every request (HttpOnly session cookie value).
export const authHeaders = {
  headers: {
    Cookie: `innovo_session=${SESSION}`,
    Accept: 'application/json',
  },
}

// Read-only endpoints that represent a typical browsing session. Safe to hammer
// against a staging environment — no writes.
export const READ_ENDPOINTS = [
  '/api/ideas',
  '/api/initiatives',
  '/api/startups?page=1&limit=50',
  '/api/challenges',
  '/api/news',
  '/api/collaborations',
  '/api/auth/me',
  '/api/notifications',
]

// Perform one GET and assert it succeeded. Returns the response.
export function getAndCheck(path) {
  const res = http.get(`${BASE_URL}${path}`, authHeaders)
  check(res, {
    [`${path} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${path} not 401 (cookie valid)`]: (r) => r.status !== 401,
  })
  return res
}
