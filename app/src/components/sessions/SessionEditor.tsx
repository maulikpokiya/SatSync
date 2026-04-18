'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { CATEGORIES, AUDIENCE_GROUPS } from '@/lib/constants'
import type { Session, AudienceType, CategoryId, SessionStatus, Room, Speaker } from '@/types'

interface SessionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventSlug: string
  eventTimezone: string
  session?: Session   // if provided, editing
  rooms: Room[]
  speakers: Speaker[]
}

const BLANK: Partial<Session> = {
  title: '', description: '', objectives: '', prerequisites: '',
  start_time: '', end_time: '', category: null,
  audience_type: 'all', audience_values: [], room_id: '', virtual_link: '',
  status: 'draft', is_common: true,
}

/** Convert UTC ISO string to local datetime-local input value in the given IANA timezone */
function toLocalInput(utcIso: string | null | undefined, tz: string): string {
  if (!utcIso) return ''
  try {
    const date = new Date(utcIso)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]))
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  } catch { return '' }
}

/** Convert datetime-local string in IANA timezone back to UTC ISO */
function toUtcIso(localValue: string, tz: string): string {
  if (!localValue) return ''
  try {
    const [datePart, timePart] = localValue.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    // Use Intl to figure out offset, then construct UTC
    const approx = new Date(Date.UTC(year, month - 1, day, hour, minute))
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const parts = Object.fromEntries(formatter.formatToParts(approx).map(({ type, value }) => [type, value]))
    const localInTz = new Date(Date.UTC(
      parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day),
      parseInt(parts.hour), parseInt(parts.minute)
    ))
    const offsetMs = approx.getTime() - localInTz.getTime()
    return new Date(approx.getTime() + offsetMs).toISOString()
  } catch { return '' }
}

export function SessionEditor({ open, onOpenChange, eventSlug, eventTimezone, session, rooms, speakers }: SessionEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [objectives, setObjectives] = useState('')
  const [prerequisites, setPrerequisites] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startClock, setStartClock] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endClock, setEndClock] = useState('')
  const [category, setCategory] = useState<CategoryId | ''>('')
  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [audienceValues, setAudienceValues] = useState<string[]>([])
  const [roomId, setRoomId] = useState('')
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([])
  const [virtualLink, setVirtualLink] = useState('')
  const [status, setStatus] = useState<SessionStatus>('draft')
  const [isCommon, setIsCommon] = useState(true)

  useEffect(() => {
    if (open) {
      setTitle(session?.title ?? '')
      setDescription(session?.description ?? '')
      setObjectives(session?.objectives ?? '')
      setPrerequisites(session?.prerequisites ?? '')
      const startLocal = toLocalInput(session?.start_time, eventTimezone)
      setStartDate(startLocal.split('T')[0] ?? '')
      setStartClock(startLocal.split('T')[1] ?? '')
      const endLocal = toLocalInput(session?.end_time, eventTimezone)
      setEndDate(endLocal.split('T')[0] ?? '')
      setEndClock(endLocal.split('T')[1] ?? '')
      setCategory((session?.category ?? '') as CategoryId | '')
      setAudienceType(session?.audience_type ?? 'all')
      setAudienceValues(session?.audience_values ?? [])
      setRoomId(session?.room_id ?? '')
      setSelectedSpeakerIds(session?.speaker_ids ?? [])
      setVirtualLink(session?.virtual_link ?? '')
      setStatus(session?.status ?? 'draft')
      setIsCommon(session?.is_common ?? true)
    }
  }, [open, session, eventTimezone])

  function toggleSpeaker(id: string) {
    setSelectedSpeakerIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  function toggleAudienceValue(val: string) {
    setAudienceValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const payload = {
      title: title.trim(), description: description || null,
      objectives: objectives || null, prerequisites: prerequisites || null,
      start_time: startDate ? toUtcIso(`${startDate}T${startClock || '00:00'}`, eventTimezone) || null : null,
      end_time: endDate ? toUtcIso(`${endDate}T${endClock || '00:00'}`, eventTimezone) || null : null,
      category: category || null, audience_type: audienceType,
      audience_values: audienceValues, room_id: roomId || null,
      virtual_link: virtualLink || null, status, is_common: isCommon,
      speaker_ids: selectedSpeakerIds,
    }

    const url = session
      ? `/api/events/${eventSlug}/sessions/${session.id}`
      : `/api/events/${eventSlug}/sessions`
    const method = session ? 'PATCH' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await res.json()

    if (!res.ok) {
      toast.error(session ? 'Failed to update session' : 'Failed to create session', { description: body.error })
    } else {
      toast.success(session ? 'Session updated' : 'Session added')
      onOpenChange(false)
      router.refresh()
    }
    setSaving(false)
  }

  const audienceOptions = audienceType !== 'all' && audienceType !== 'custom'
    ? AUDIENCE_GROUPS[audienceType as keyof typeof AUDIENCE_GROUPS] ?? []
    : []

  const selectedCat = CATEGORIES.find((c) => c.id === category)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        {/* Category color bar */}
        <div className="h-1.5 w-full transition-colors" style={{ backgroundColor: selectedCat?.color ?? 'transparent' }} />

        <div className="p-6">
          <SheetHeader className="mb-6">
            <SheetTitle>{session ? 'Edit Session' : 'New Session'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="s-title">Title <span className="text-destructive">*</span></Label>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Satsang Sabha — Katha" required />
            </div>

            <div className="space-y-2">
              <Label>Start ({eventTimezone.split('/')[1]?.replace(/_/g, ' ')})</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="time" value={startClock} onChange={(e) => setStartClock(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <Input type="time" value={endClock} onChange={(e) => setEndClock(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-cat">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryId)}>
                <SelectTrigger id="s-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-aud-type">Audience</Label>
              <Select value={audienceType} onValueChange={(v) => { setAudienceType(v as AudienceType); setAudienceValues([]) }}>
                <SelectTrigger id="s-aud-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Common)</SelectItem>
                  <SelectItem value="age">By Age Group</SelectItem>
                  <SelectItem value="gender">By Gender Group</SelectItem>
                  <SelectItem value="region">By Region</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {audienceOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {audienceOptions.map((val) => (
                    <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={audienceValues.includes(val)}
                        onCheckedChange={() => toggleAudienceValue(val)}
                      />
                      {val}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="s-common" checked={isCommon} onCheckedChange={(v) => setIsCommon(!!v)} />
              <Label htmlFor="s-common" className="cursor-pointer">Common session (visible to all tracks)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-desc">Description</Label>
              <Textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this session about?" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-obj">Objectives</Label>
              <Textarea id="s-obj" value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-prereq">Prerequisites</Label>
              <Input id="s-prereq" value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} />
            </div>

            {speakers.length > 0 && (
              <div className="space-y-2">
                <Label>Speakers</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {speakers.map((spk) => (
                    <label key={spk.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedSpeakerIds.includes(spk.id)}
                        onCheckedChange={() => toggleSpeaker(spk.id)}
                      />
                      {spk.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="s-room">Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="s-room"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-link">Virtual Link</Label>
              <Input id="s-link" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} placeholder="https://zoom.us/…" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SessionStatus)}>
                <SelectTrigger id="s-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SheetFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Saving…' : session ? 'Save Changes' : 'Add Session'}
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
