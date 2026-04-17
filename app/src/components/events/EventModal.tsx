'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TIMEZONES } from '@/lib/constants'
import type { Event, EventStatus } from '@/types'

function slugify(title: string) {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

interface EventModalProps {
  event?: Event   // if provided, editing; otherwise creating
  trigger?: React.ReactNode
}

export function EventModal({ event, trigger }: EventModalProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState(event?.title ?? '')
  const [slug, setSlug] = useState(event?.slug ?? '')
  const [startDate, setStartDate] = useState(event?.start_date ?? '')
  const [endDate, setEndDate] = useState(event?.end_date ?? '')
  const [timezone, setTimezone] = useState(event?.primary_timezone ?? 'America/Chicago')
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'draft')
  const [slugTouched, setSlugTouched] = useState(false)

  // Auto-generate slug from title while user hasn't manually edited it
  useEffect(() => {
    if (!slugTouched && !event) setSlug(slugify(title))
  }, [title, slugTouched, event])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const payload = { title: title.trim(), slug: slug.trim(), start_date: startDate || null, end_date: endDate || null, primary_timezone: timezone, status }
    const res = event
      ? await fetch(`/api/events/${event.slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

    const body = await res.json()
    if (!res.ok) {
      toast.error(event ? 'Failed to update event' : 'Failed to create event', { description: body.error })
    } else {
      toast.success(event ? 'Event updated' : 'Event created')
      setOpen(false)
      router.refresh()
      if (!event && body.slug) router.push(`/events/${body.slug}/agenda`)
    }
    setSaving(false)
  }

  function handleOpen(val: boolean) {
    setOpen(val)
    if (val && event) {
      setTitle(event.title)
      setSlug(event.slug)
      setStartDate(event.start_date ?? '')
      setEndDate(event.end_date ?? '')
      setTimezone(event.primary_timezone)
      setStatus(event.status)
    } else if (!val && !event) {
      setTitle(''); setSlug(''); setStartDate(''); setEndDate('')
      setTimezone('America/Chicago'); setStatus('draft'); setSlugTouched(false)
    }
  }

  return (
    <>
      <span onClick={() => handleOpen(true)}>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title <span className="text-destructive">*</span></Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chicago Satsang 2025" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/events/</span>
                <Input
                  id="ev-slug" value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
                  placeholder="chicago-satsang-2025"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ev-start">Start Date</Label>
                <Input id="ev-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-end">End Date</Label>
                <Input id="ev-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-tz">Primary Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="ev-tz"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
                <SelectTrigger id="ev-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
