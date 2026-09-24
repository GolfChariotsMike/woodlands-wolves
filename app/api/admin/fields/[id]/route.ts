import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { toFormField, validateFieldDraft, type FormField } from '@/lib/fields'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function readId(params: Promise<{ id: string }>) {
  const { id } = await params
  return UUID_RE.test(id) ? id : null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const id = await readId(ctx.params)
  if (!id) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const existingResult = await supabase
    .from('woodlands_wolves_form_fields')
    .select('id, label, field_key, field_type, options, required, enabled, sort_order')
    .eq('id', id)
    .maybeSingle()

  if (existingResult.error) {
    console.error(existingResult.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!existingResult.data) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

  const existing = toFormField(existingResult.data)
  const record = body as Partial<Pick<FormField, 'label' | 'field_type' | 'options' | 'required' | 'enabled'>>
  const parsed = validateFieldDraft({
    label: record.label ?? existing.label,
    field_type: record.field_type ?? existing.field_type,
    options: record.options ?? existing.options,
    required: typeof record.required === 'boolean' ? record.required : existing.required,
    enabled: typeof record.enabled === 'boolean' ? record.enabled : existing.enabled,
  })
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabase
    .from('woodlands_wolves_form_fields')
    .update({
      label: parsed.draft.label,
      field_type: parsed.draft.field_type,
      options: parsed.draft.options,
      required: parsed.draft.required,
      enabled: parsed.draft.enabled,
    })
    .eq('id', id)
    .select('id, label, field_key, field_type, options, required, enabled, sort_order')
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json(toFormField(data))
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const id = await readId(ctx.params)
  if (!id) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const { data, error } = await supabase
    .from('woodlands_wolves_form_fields')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!data?.length) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
