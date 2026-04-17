import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSessionById, updateSession, deleteSession } from '@/lib/sheets/sessions'
import { hasRole } from '@/types'
import type { AudienceType, CategoryId, SessionStatus } from '@/types'

interface Ctx { params: { slug: string; id: string } }

async function requireEditor(email: string) {
  const profile = await getUserByEmail(email)
  if (!hasRole(profile?.role, 'editor')) return null
  return profile
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await requireEditor(session.user.email)
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const existing = await getSessionById(params.id)
  if (!existing || existing.event_id !== event.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await request.json() as {
    title?: string
    description?: string | null
    objectives?: string | null
    prerequisites?: string | null
    start_time?: string | null
    end_time?: string | null
    category?: CategoryId | null
    audience_type?: AudienceType
    audience_values?: string[]
    room?: string | null
    virtual_link?: string | null
    status?: SessionStatus
    is_common?: boolean
  }

  await updateSession(params.id, {
    title: body.title?.trim(),
    description: body.description,
    objectives: body.objectives,
    prerequisites: body.prerequisites,
    start_time: body.start_time,
    end_time: body.end_time,
    category: body.category,
    audience_type: body.audience_type,
    audience_values: body.audience_values,
    room: body.room,
    virtual_link: body.virtual_link,
    status: body.status,
    is_common: body.is_common,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await requireEditor(session.user.email)
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const existing = await getSessionById(params.id)
  if (!existing || existing.event_id !== event.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await deleteSession(params.id)
  return NextResponse.json({ ok: true })
}
