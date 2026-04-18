import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getEventBySlug } from '@/lib/sheets/events'
import { createSpeaker } from '@/lib/sheets/speakers'
import { hasRole } from '@/types'

interface Ctx { params: { slug: string } }

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'editor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await request.json() as { name?: string }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const speaker = await createSpeaker({ event_id: event.id, name: body.name.trim() })
  return NextResponse.json(speaker, { status: 201 })
}
