/** @type {import('next').NextConfig} */

// Baseline HTTP security headers applied to every response. These are the
// "safe" set that don't require per-page tuning; a strict Content-Security-Policy
// is intentionally deferred (the app uses inline styles + a theme no-flash
// script, so a CSP needs testing before it can be enabled without breakage).
const securityHeaders = [
  // Stop the site being framed by other origins (clickjacking).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Don't let browsers MIME-sniff responses into a different content type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the origin (not the full path) on cross-origin navigations.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Force HTTPS for two years, including subdomains (Vercel serves over TLS).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable powerful features the portal doesn't use.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  typedRoutes: false,
  devIndicators: false,
  allowedDevOrigins: ['10.1.136.92', '10.1.136.132', '10.1.136.240'],
  serverExternalPackages: ['pino', 'pino-pretty'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
module.exports = nextConfig
