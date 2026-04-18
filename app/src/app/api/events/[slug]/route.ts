import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getEventBySlug, updateEvent, deleteEvent } from '@/lib/sheets/events'
import { hasRole } from '@/types'

interface Ctx { params: { slug: string } }

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

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await request.json() as {
    title?: string
    slug?: string
    start_date?: string | null
    end_date?: string | null
    primary_timezone?: string
    location_id?: string | null
    status?: string
  }

  // If slug is changing, verify it's not taken by another event
  if (body.slug && body.slug !== event.slug) {
    const conflict = await getEventBySlug(body.slug)
    if (conflict && conflict.id !== event.id) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
  }

  await updateEvent(event.id, {
    title: body.title?.trim(),
    slug: body.slug?.trim(),
    start_date: body.start_date !== undefined ? body.start_date : undefined,
    end_date: body.end_date !== undefined ? body.end_date : undefined,
    primary_timezone: body.primary_timezone,
    location_id: body.location_id !== undefined ? (body.location_id || null) : undefined,
    status: body.status as 'draft' | 'published' | 'archived' | undefined,
  })

  return NextResponse.json({ ok: true, slug: body.slug?.trim() ?? event.slug })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const profile = await requireEventAdmin()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  await deleteEvent(event.id)
  return NextResponse.json({ ok: true })
}
