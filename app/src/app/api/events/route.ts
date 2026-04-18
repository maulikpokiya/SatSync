import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { createEvent, getEventBySlug, slugify } from '@/lib/sheets/events'
import { hasRole } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'event_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as {
    title?: string
    slug?: string
    start_date?: string | null
    end_date?: string | null
    primary_timezone?: string
    location_id?: string | null
    status?: string
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const slug = body.slug?.trim() || slugify(body.title.trim())
  if (!slug) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })

  // Check slug uniqueness
  const existing = await getEventBySlug(slug)
  if (existing) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })

  const event = await createEvent({
    title: body.title.trim(),
    slug,
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    primary_timezone: body.primary_timezone || 'America/Chicago',
    location_id: body.location_id || null,
    status: (body.status as 'draft' | 'published' | 'archived') || 'draft',
    created_by: profile!.id,
  })

  return NextResponse.json(event, { status: 201 })
}
