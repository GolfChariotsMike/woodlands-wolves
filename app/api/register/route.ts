import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const child_full_name = String(body.child_full_name ?? '').trim()
  const age = String(body.age ?? '').trim()
  const parent_name = String(body.parent_name ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const email = String(body.email ?? '').trim()

  if (!child_full_name || !age || !parent_name || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const { error } = await supabase
    .from('woodlands_wolves_have_a_go_registrations')
    .insert({ child_full_name, age, parent_name, phone, email })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
