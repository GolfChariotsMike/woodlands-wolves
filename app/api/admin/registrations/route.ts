import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('woodlands_wolves_have_a_go_registrations')
    .select('id, child_full_name, age, child_gender, parent_name, phone, email, custom_answers, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  return NextResponse.json(data)
}
