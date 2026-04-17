'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User } from '@/types'

const TIMEZONES = [
  { label: 'America/Chicago (CDT/CST)', value: 'America/Chicago' },
  { label: 'America/New_York (EDT/EST)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PDT/PST)', value: 'America/Los_Angeles' },
  { label: 'America/Denver (MDT/MST)', value: 'America/Denver' },
  { label: 'America/Toronto (EDT/EST)', value: 'America/Toronto' },
  { label: 'America/Vancouver (PDT/PST)', value: 'America/Vancouver' },
  { label: 'Europe/London (BST/GMT)', value: 'Europe/London' },
  { label: 'Europe/Amsterdam (CEST/CET)', value: 'Europe/Amsterdam' },
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Australia/Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'UTC', value: 'UTC' },
]

export function ProfileForm({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [timezone, setTimezone] = useState(user.home_timezone)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName.trim() || null, home_timezone: timezone }),
    })
    if (res.ok) {
      toast.success('Profile saved')
    } else {
      const body = await res.json()
      toast.error('Failed to save', { description: body.error })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Home Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
