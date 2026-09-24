import { NextRequest, NextResponse } from 'next/server'
import { toFormField, validateCustomAnswers } from '@/lib/fields'
import { getSupabase } from '@/lib/supabase'

const ALLOWED_CHILD_GENDERS = ['Male', 'Female', 'Prefer not to say']

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const child_full_name = String(record.child_full_name ?? '').trim()
  const age = String(record.age ?? '').trim()
  const child_gender = String(record.child_gender ?? '').trim()
  const parent_name = String(record.parent_name ?? '').trim()
  const phone = String(record.phone ?? '').trim()
  const email = String(record.email ?? '').trim()

  if (
    !child_full_name ||
    !age ||
    !child_gender ||
    !parent_name ||
    !phone ||
    !email ||
    !ALLOWED_CHILD_GENDERS.includes(child_gender)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const fieldsResult = await supabase
    .from('woodlands_wolves_form_fields')
    .select('id, label, field_key, field_type, options, required, enabled, sort_order')
    .eq('enabled', true)
    .order('sort_order', { ascending: true })

  if (fieldsResult.error) {
    console.error(fieldsResult.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const answers = validateCustomAnswers(record.custom_answers, (fieldsResult.data ?? []).map(toFormField))
  if (!answers.ok) {
    return NextResponse.json({ error: answers.error }, { status: 400 })
  }

  const { error } = await supabase.from('woodlands_wolves_have_a_go_registrations').insert({
    child_full_name,
    age,
    child_gender,
    parent_name,
    phone,
    email,
    custom_answers: answers.answers,
  })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
