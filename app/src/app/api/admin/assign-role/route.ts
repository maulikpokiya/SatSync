import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail, updateUser, getUserById } from '@/lib/sheets/users'
import type { AppRole } from '@/types'

const VALID_ROLES: AppRole[] = ['super_admin', 'event_admin', 'editor', 'viewer']

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await getUserByEmail(session.user.email)
  if (user?.role !== 'super_admin') return null
  return user
}

export async function POST(request: NextRequest) {
  const actor = await requireSuperAdmin()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { userId, role } = await request.json() as { userId?: string; role?: string }
  if (!userId || !role || !VALID_ROLES.includes(role as AppRole)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const target = await getUserById(userId)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await updateUser(userId, { role: role as AppRole })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const actor = await requireSuperAdmin()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { userId } = await request.json() as { userId?: string }
  if (!userId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  await updateUser(userId, { role: undefined })
  return NextResponse.json({ ok: true })
}
