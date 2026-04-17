import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail, updateUser } from '@/lib/sheets/users'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { display_name, home_timezone } = await request.json()

  const profile = await getUserByEmail(session.user.email)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await updateUser(profile.id, {
    display_name: display_name ?? null,
    home_timezone: home_timezone ?? profile.home_timezone,
  })

  return NextResponse.json({ ok: true })
}
