import { NextResponse } from 'next/server'

// Password sign-in has been retired — the portal authenticates with Microsoft
// (Entra ID / Azure AD) only. User accounts and their stored password hashes
// are left untouched; this endpoint simply refuses to authenticate anyone by
// password, so no credential can be used here even via a direct API call.
export async function POST() {
  return NextResponse.json(
    { error: 'Password sign-in is disabled. Please sign in with Microsoft.' },
    { status: 403 },
  )
}
