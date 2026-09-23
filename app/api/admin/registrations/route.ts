import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('woodlands_wolves_have_a_go_registrations')
    .select('id, child_full_name, age, parent_name, phone, email, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  return NextResponse.json(data)
}
