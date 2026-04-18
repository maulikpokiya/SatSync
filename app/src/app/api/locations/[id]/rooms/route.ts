import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getLocationById } from '@/lib/sheets/locations'
import { createRoom } from '@/lib/sheets/rooms'
import { hasRole } from '@/types'

interface Ctx { params: { id: string } }

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'event_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const location = await getLocationById(params.id)
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const body = await request.json() as {
    name?: string
    capacity?: number | null
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const room = await createRoom({
    location_id: location.id,
    name: body.name.trim(),
    capacity: body.capacity ?? null,
  })
  return NextResponse.json(room, { status: 201 })
}
