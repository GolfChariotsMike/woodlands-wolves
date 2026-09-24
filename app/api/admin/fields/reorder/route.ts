import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { toFormField } from '@/lib/fields'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid field order' }, { status: 400 })
  }
  const ids = body && typeof body === 'object' && !Array.isArray(body) ? (body as { ids?: unknown }).ids : null
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
    return NextResponse.json({ error: 'Invalid field order' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const existing = await supabase.from('woodlands_wolves_form_fields').select('id')
  if (existing.error) {
    console.error(existing.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const existingIds = new Set((existing.data ?? []).map((row) => row.id))
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length || ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    return NextResponse.json({ error: 'Invalid field order' }, { status: 400 })
  }

  for (let index = 0; index < ids.length; index += 1) {
    const { error } = await supabase
      .from('woodlands_wolves_form_fields')
      .update({ sort_order: index })
      .eq('id', ids[index])
    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  const { data, error } = await supabase
    .from('woodlands_wolves_form_fields')
    .select('id, label, field_key, field_type, options, required, enabled, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map(toFormField))
}
