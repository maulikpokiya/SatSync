import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getLocationById, updateLocation, deleteLocation } from '@/lib/sheets/locations'
import { hasRole } from '@/types'
import type { RegionId } from '@/types'

interface Ctx { params: { id: string } }

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

  const existing = await getLocationById(params.id)
  if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const body = await request.json() as {
    region?: RegionId
    name?: string
    address?: string | null
  }

  await updateLocation(params.id, {
    region: body.region,
    name: body.name?.trim(),
    address: body.address !== undefined ? (body.address?.trim() || null) : undefined,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const profile = await requireEventAdmin()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await getLocationById(params.id)
  if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  await deleteLocation(params.id)
  return NextResponse.json({ ok: true })
}
