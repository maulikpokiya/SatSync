import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { createLocation } from '@/lib/sheets/locations'
import { hasRole } from '@/types'
import type { RegionId } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'event_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as {
    region?: RegionId
    name?: string
    address?: string | null
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!body.region) {
    return NextResponse.json({ error: 'Region is required' }, { status: 400 })
  }

  const location = await createLocation({
    region: body.region,
    name: body.name.trim(),
    address: body.address?.trim() || null,
  })
  return NextResponse.json(location, { status: 201 })
}
