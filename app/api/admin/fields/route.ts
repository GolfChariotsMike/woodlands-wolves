import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { toFormField, uniqueFieldKey, validateFieldDraft } from '@/lib/fields'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

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

export async function POST(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }

  const record = body as {
    label?: unknown
    field_type?: unknown
    options?: unknown
    required?: unknown
    enabled?: unknown
  }
  const parsed = validateFieldDraft({
    label: record.label,
    field_type: record.field_type,
    options: record.options,
    required: record.required === true,
    enabled: record.enabled !== false,
  })
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const [keysResult, orderResult] = await Promise.all([
    supabase.from('woodlands_wolves_form_fields').select('field_key'),
    supabase
      .from('woodlands_wolves_form_fields')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (keysResult.error || orderResult.error) {
    console.error(keysResult.error ?? orderResult.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const field_key = uniqueFieldKey(
    parsed.draft.label,
    (keysResult.data ?? []).map((row) => row.field_key),
  )
  const sort_order = (orderResult.data?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('woodlands_wolves_form_fields')
    .insert({
      label: parsed.draft.label,
      field_key,
      field_type: parsed.draft.field_type,
      options: parsed.draft.options,
      required: parsed.draft.required,
      enabled: parsed.draft.enabled,
      sort_order,
    })
    .select('id, label, field_key, field_type, options, required, enabled, sort_order')
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json(toFormField(data), { status: 201 })
}
