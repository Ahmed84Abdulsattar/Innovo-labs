// ESLint 9 flat config for Next.js 16 (`next lint` was removed in Next 16).
// eslint-config-next 16 ships native flat-config arrays, imported directly.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      // Dead code is not allowed — kept clean, so this is an error (args prefixed
      // with _ are intentionally-unused and ignored).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // ── Rules intentionally OFF (the code is correct; the rule is advisory or
      //    doesn't fit this app). Documented so the choice is explicit. ──

      // `any` is used deliberately at DB-row boundaries where the shape is dynamic;
      // typing all of them would be churn, not a real improvement.
      '@typescript-eslint/no-explicit-any': 'off',
      // Cosmetic — literal apostrophes in JSX text render fine.
      'react/no-unescaped-entities': 'off',
      // Images are dynamic (base64 data URLs / signed Supabase Storage URLs) where
      // next/image is not applicable; plain <img> is the correct choice here.
      '@next/next/no-img-element': 'off',
      // Intentional full-page navigations — e.g. window.location.href='/login' on
      // logout MUST hard-reload to clear all client/context state.
      '@next/next/no-location-assign-relative-destination': 'off',
      // Experimental React Compiler advisories — not enforced.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
  // Standalone CLI scripts (migrations, tooling) print via console by design —
  // the pino logger is for the server, not one-off scripts. Placed LAST so it
  // wins over the console rule above (flat config = last match applies).
  { files: ['scripts/**/*'], rules: { 'no-console': 'off' } },
]

export default config
