import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { AppRole } from '@/types'

const VALID_ROLES: AppRole[] = ['super_admin', 'event_admin', 'editor', 'viewer']

async function requireSuperAdmin(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .is('event_id', null)
    .maybeSingle()

  if (data?.role !== 'super_admin') return null
  return user
}

/** POST /api/admin/assign-role — assign or update a global role */
export async function POST(request: NextRequest) {
  const actor = await requireSuperAdmin(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, role } = body as { userId?: string; role?: string }

  if (!userId || !role || !VALID_ROLES.includes(role as AppRole)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const adminClient = createServiceClient()

  // Upsert: remove any existing global role for this user first, then insert
  const { error: deleteErr } = await adminClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .is('event_id', null)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  const { error: insertErr } = await adminClient.from('user_roles').insert({
    user_id: userId,
    role: role as AppRole,
    event_id: null,
  })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Write audit log
  await adminClient.from('audit_log').insert({
    user_id: actor.id,
    action: 'role_assigned',
    entity_type: 'user_roles',
    entity_id: userId,
    new_value: { role, event_id: null, target_user_id: userId },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE /api/admin/assign-role — revoke all global roles */
export async function DELETE(request: NextRequest) {
  const actor = await requireSuperAdmin(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const adminClient = createServiceClient()

  const { error } = await adminClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .is('event_id', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient.from('audit_log').insert({
    user_id: actor.id,
    action: 'role_revoked',
    entity_type: 'user_roles',
    entity_id: userId,
    new_value: { target_user_id: userId },
  })

  return NextResponse.json({ ok: true })
}
