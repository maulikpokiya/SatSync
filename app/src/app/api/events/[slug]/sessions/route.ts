import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getEventBySlug } from '@/lib/sheets/events'
import { createSession } from '@/lib/sheets/sessions'
import { hasRole } from '@/types'
import type { AudienceType, CategoryId, SessionStatus } from '@/types'

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
    color_override?: string | null
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const newSession = await createSession({
    event_id: event.id,
    title: body.title.trim(),
    description: body.description ?? null,
    objectives: body.objectives ?? null,
    prerequisites: body.prerequisites ?? null,
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    category: body.category ?? null,
    audience_type: body.audience_type ?? 'all',
    audience_values: body.audience_values ?? [],
    room: body.room ?? null,
    virtual_link: body.virtual_link ?? null,
    status: body.status ?? 'draft',
    is_common: body.is_common ?? true,
    color_override: body.color_override ?? null,
    sort_order: 0,
    created_by: profile!.id,
  })

  return NextResponse.json(newSession, { status: 201 })
}
