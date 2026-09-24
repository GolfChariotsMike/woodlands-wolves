import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const NOTICE_MAX = 1000

export async function GET(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const { data, error } = await supabase
    .from('woodlands_wolves_site_settings')
    .select('notice_enabled, notice_text')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    enabled: Boolean(data?.notice_enabled),
    text: data?.notice_text ?? '',
  })
}

export async function PATCH(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid notice' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid notice' }, { status: 400 })
  }

  const record = body as { enabled?: unknown; text?: unknown }
  if (typeof record.enabled !== 'boolean' || typeof record.text !== 'string') {
    return NextResponse.json({ error: 'Invalid notice' }, { status: 400 })
  }
  const text = record.text.trim()
  if (text.length > NOTICE_MAX) {
    return NextResponse.json({ error: 'Notice is too long' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const { data, error } = await supabase
    .from('woodlands_wolves_site_settings')
    .update({
      notice_enabled: record.enabled,
      notice_text: text,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('notice_enabled, notice_text')
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    enabled: Boolean(data.notice_enabled),
    text: data.notice_text ?? '',
  })
}
