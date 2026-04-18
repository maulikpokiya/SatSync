import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSpeakerById, updateSpeaker, deleteSpeaker } from '@/lib/sheets/speakers'
import { hasRole } from '@/types'

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

  const existing = await getSpeakerById(params.id)
  if (!existing || existing.event_id !== event.id) {
    return NextResponse.json({ error: 'Speaker not found' }, { status: 404 })
  }

  const body = await request.json() as { name?: string }
  await updateSpeaker(params.id, { name: body.name?.trim() })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await requireEditor(session.user.email)
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const event = await getEventBySlug(params.slug)
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const existing = await getSpeakerById(params.id)
  if (!existing || existing.event_id !== event.id) {
    return NextResponse.json({ error: 'Speaker not found' }, { status: 404 })
  }

  await deleteSpeaker(params.id)
  return NextResponse.json({ ok: true })
}
