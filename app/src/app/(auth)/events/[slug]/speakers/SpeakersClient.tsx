'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { Speaker } from '@/types'

interface Props {
  eventSlug: string
  speakers: Speaker[]
  canEdit: boolean
}

export function SpeakersClient({ eventSlug, speakers, canEdit }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openNew() {
    setEditingSpeaker(null)
    setName('')
    setDialogOpen(true)
  }

  function openEdit(speaker: Speaker) {
    setEditingSpeaker(speaker)
    setName(speaker.name)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const url = editingSpeaker
      ? `/api/events/${eventSlug}/speakers/${editingSpeaker.id}`
      : `/api/events/${eventSlug}/speakers`
    const method = editingSpeaker ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const body = await res.json()

    if (!res.ok) {
      toast.error(editingSpeaker ? 'Failed to update speaker' : 'Failed to add speaker', { description: body.error })
    } else {
      toast.success(editingSpeaker ? 'Speaker updated' : 'Speaker added')
      setDialogOpen(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete(speaker: Speaker) {
    if (!confirm(`Delete "${speaker.name}"?`)) return
    setDeletingId(speaker.id)

    const res = await fetch(`/api/events/${eventSlug}/speakers/${speaker.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete speaker')
    } else {
      toast.success('Speaker deleted')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Speaker
          </Button>
        )}
      </div>

      {speakers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No speakers yet</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="mt-4" onClick={openNew}>
              Add first speaker
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-2.5">Name</th>
                {canEdit && <th className="w-24" />}
              </tr>
            </thead>
            <tbody>
              {speakers.map((speaker) => (
                <tr key={speaker.id} className="border-b last:border-0 group hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">{speaker.name}</td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(speaker)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(speaker)}
                          disabled={deletingId === speaker.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="spk-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="spk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Speaker name"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : editingSpeaker ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
