import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getLocationById } from '@/lib/sheets/locations'
import { getRoomById, updateRoom, deleteRoom } from '@/lib/sheets/rooms'
import { hasRole } from '@/types'

interface Ctx { params: { id: string; roomId: string } }

async function requireEventAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'event_admin')) return null
  return profile
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const profile = await requireEventAdmin()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const location = await getLocationById(params.id)
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const existing = await getRoomById(params.roomId)
  if (!existing || existing.location_id !== location.id) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const body = await request.json() as { name?: string; capacity?: number | null }
  await updateRoom(params.roomId, { name: body.name?.trim(), capacity: body.capacity })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const profile = await requireEventAdmin()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const location = await getLocationById(params.id)
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const existing = await getRoomById(params.roomId)
  if (!existing || existing.location_id !== location.id) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  await deleteRoom(params.roomId)
  return NextResponse.json({ ok: true })
}
