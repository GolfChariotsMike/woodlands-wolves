import { NextResponse } from 'next/server'
import { toFormField } from '@/lib/fields'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const [settingsResult, fieldsResult] = await Promise.all([
    supabase
      .from('woodlands_wolves_site_settings')
      .select('notice_enabled, notice_text')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('woodlands_wolves_form_fields')
      .select('id, label, field_key, field_type, options, required, enabled, sort_order')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (settingsResult.error || fieldsResult.error) {
    console.error(settingsResult.error ?? fieldsResult.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    notice: {
      enabled: Boolean(settingsResult.data?.notice_enabled),
      text: settingsResult.data?.notice_text ?? '',
    },
    fields: (fieldsResult.data ?? []).map(toFormField),
  })
}
