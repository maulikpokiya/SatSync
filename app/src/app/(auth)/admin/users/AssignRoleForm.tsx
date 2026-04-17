'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppRole } from '@/types'

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'event_admin', label: 'Event Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

export function AssignRoleForm({ userId, currentRole }: { userId: string; currentRole: AppRole | null }) {
  const [role, setRole] = useState<AppRole | ''>(currentRole ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleAssign() {
    if (!role) return
    setSaving(true)
    const res = await fetch('/api/admin/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    const body = await res.json()
    if (!res.ok) {
      toast.error('Failed to assign role', { description: body.error })
    } else {
      toast.success(`Role updated to ${role.replace('_', ' ')}`)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleRevoke() {
    setSaving(true)
    const res = await fetch('/api/admin/assign-role', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const body = await res.json()
    if (!res.ok) {
      toast.error('Failed to revoke role', { description: body.error })
    } else {
      toast.success('Role revoked')
      setRole('')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="No role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAssign} disabled={saving || !role}>
        Assign
      </Button>
      {currentRole && (
        <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive" onClick={handleRevoke} disabled={saving}>
          Revoke
        </Button>
      )}
    </div>
  )
}
