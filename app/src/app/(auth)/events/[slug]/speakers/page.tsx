import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSpeakersByEvent } from '@/lib/sheets/speakers'
import { getUserByEmail } from '@/lib/sheets/users'
import { Topbar } from '@/components/layout/Topbar'
import { hasRole } from '@/types'
import { SpeakersClient } from './SpeakersClient'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug(params.slug)
  return { title: event ? `${event.title} — Speakers` : 'Speakers' }
}

export default async function SpeakersPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const [event, profile] = await Promise.all([
    getEventBySlug(params.slug),
    getUserByEmail(session.user.email),
  ])

  if (!event) notFound()

  const speakers = await getSpeakersByEvent(event.id)
  const canEdit = hasRole(profile?.role, 'editor')

  return (
    <div className="flex flex-col h-full">
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: event.title, href: `/events/${event.slug}/agenda` },
          { label: 'Speakers' },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <SpeakersClient eventSlug={event.slug} speakers={speakers} canEdit={canEdit} />
      </div>
    </div>
  )
}
