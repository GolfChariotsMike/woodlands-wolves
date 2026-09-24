import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessAdmin } from '@/lib/admin'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = rejectUnlessAdmin(req)
  if (denied) return denied

  const { id } = await ctx.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid registration' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const { data, error } = await supabase
    .from('woodlands_wolves_have_a_go_registrations')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
  if (!data?.length) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
