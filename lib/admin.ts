import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_PIN } from './pin'

export function rejectUnlessAdmin(req: NextRequest) {
  if (req.headers.get('x-admin-pin') !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
