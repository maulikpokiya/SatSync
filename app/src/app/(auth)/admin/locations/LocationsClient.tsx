'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { REGIONS } from '@/lib/constants'
import type { Location, Room, RegionId } from '@/types'

interface Props {
  locations: Location[]
  rooms: Room[]
}

export function LocationsClient({ locations, rooms }: Props) {
  const router = useRouter()

  // Location dialog state
  const [locDialogOpen, setLocDialogOpen] = useState(false)
  const [editingLoc, setEditingLoc] = useState<Location | null>(null)
  const [locName, setLocName] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locRegion, setLocRegion] = useState<RegionId>('chicago')
  const [locSaving, setLocSaving] = useState(false)

  // Room dialog state
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [roomLocationId, setRoomLocationId] = useState<string>('')
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomName, setRoomName] = useState('')
  const [roomCapacity, setRoomCapacity] = useState('')
  const [roomSaving, setRoomSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const roomsByLocation = rooms.reduce<Record<string, Room[]>>((acc, r) => {
    ;(acc[r.location_id] ??= []).push(r)
    return acc
  }, {})

  // Group locations by region
  const byRegion = REGIONS.map((region) => ({
    ...region,
    locations: locations.filter((l) => l.region === region.id),
  })).filter((g) => g.locations.length > 0)

  const emptyRegions = REGIONS.filter((r) => !byRegion.some((g) => g.id === r.id))

  function toggleRegion(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Location CRUD ─────────────────────────────────────────
  function openNewLocation(regionId?: RegionId) {
    setEditingLoc(null)
    setLocName('')
    setLocAddress('')
    setLocRegion(regionId ?? 'chicago')
    setLocDialogOpen(true)
  }

  function openEditLocation(loc: Location) {
    setEditingLoc(loc)
    setLocName(loc.name)
    setLocAddress(loc.address ?? '')
    setLocRegion(loc.region)
    setLocDialogOpen(true)
  }

  async function handleSaveLocation() {
    if (!locName.trim()) return
    setLocSaving(true)

    const payload = { region: locRegion, name: locName.trim(), address: locAddress.trim() || null }
    const url = editingLoc ? `/api/locations/${editingLoc.id}` : '/api/locations'
    const method = editingLoc ? 'PATCH' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await res.json()

    if (!res.ok) {
      toast.error(editingLoc ? 'Failed to update location' : 'Failed to add location', { description: body.error })
    } else {
      toast.success(editingLoc ? 'Location updated' : 'Location added')
      setLocDialogOpen(false)
      router.refresh()
    }
    setLocSaving(false)
  }

  async function handleDeleteLocation(loc: Location) {
    if (!confirm(`Delete "${loc.name}" and all its rooms?`)) return
    setDeletingId(loc.id)
    const res = await fetch(`/api/locations/${loc.id}`, { method: 'DELETE' })
    if (!res.ok) toast.error('Failed to delete location')
    else { toast.success('Location deleted'); router.refresh() }
    setDeletingId(null)
  }

  // ── Room CRUD ─────────────────────────────────────────────
  function openNewRoom(locationId: string) {
    setEditingRoom(null)
    setRoomLocationId(locationId)
    setRoomName('')
    setRoomCapacity('')
    setRoomDialogOpen(true)
  }

  function openEditRoom(room: Room) {
    setEditingRoom(room)
    setRoomLocationId(room.location_id)
    setRoomName(room.name)
    setRoomCapacity(room.capacity != null ? String(room.capacity) : '')
    setRoomDialogOpen(true)
  }

  async function handleSaveRoom() {
    if (!roomName.trim()) return
    setRoomSaving(true)

    const payload = { name: roomName.trim(), capacity: roomCapacity ? parseInt(roomCapacity, 10) || null : null }
    const url = editingRoom
      ? `/api/locations/${roomLocationId}/rooms/${editingRoom.id}`
      : `/api/locations/${roomLocationId}/rooms`
    const method = editingRoom ? 'PATCH' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await res.json()

    if (!res.ok) {
      toast.error(editingRoom ? 'Failed to update room' : 'Failed to add room', { description: body.error })
    } else {
      toast.success(editingRoom ? 'Room updated' : 'Room added')
      setRoomDialogOpen(false)
      router.refresh()
    }
    setRoomSaving(false)
  }

  async function handleDeleteRoom(room: Room) {
    if (!confirm(`Delete room "${room.name}"?`)) return
    setDeletingId(room.id)
    const res = await fetch(`/api/locations/${room.location_id}/rooms/${room.id}`, { method: 'DELETE' })
    if (!res.ok) toast.error('Failed to delete room')
    else { toast.success('Room deleted'); router.refresh() }
    setDeletingId(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {locations.length} location{locations.length !== 1 ? 's' : ''} · {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => openNewLocation()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No locations yet</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => openNewLocation()}>
            Add first location
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {byRegion.map((group) => (
            <div key={group.id} className="rounded-lg border">
              {/* Region header */}
              <button
                onClick={() => toggleRegion(group.id)}
                className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                {collapsed.has(group.id)
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
                <span className="text-sm font-semibold">{group.label}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({group.locations.length} location{group.locations.length !== 1 ? 's' : ''})
                </span>
              </button>

              {/* Locations under this region */}
              {!collapsed.has(group.id) && (
                <div className="border-t divide-y">
                  {group.locations.map((loc) => {
                    const locRooms = roomsByLocation[loc.id] ?? []
                    return (
                      <div key={loc.id} className="px-4 py-3">
                        {/* Location row */}
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-medium">{loc.name}</p>
                            {loc.address && (
                              <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditLocation(loc)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteLocation(loc)}
                              disabled={deletingId === loc.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Rooms list */}
                        <div className="mt-2 ml-4 space-y-1">
                          {locRooms.map((room) => (
                            <div key={room.id} className="flex items-center justify-between group/room text-sm py-1 px-2 rounded hover:bg-muted/30 transition-colors">
                              <span className="text-muted-foreground">
                                {room.name}
                                {room.capacity && <span className="text-xs ml-1.5 opacity-60">({room.capacity})</span>}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover/room:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditRoom(room)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteRoom(room)}
                                  disabled={deletingId === room.id}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => openNewRoom(loc.id)}>
                            <Plus className="mr-1 h-3 w-3" />
                            Add Room
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Show empty regions as a subtle note */}
          {emptyRegions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              No locations in: {emptyRegions.map((r) => r.label).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Location Dialog */}
      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLoc ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="loc-region">Region <span className="text-destructive">*</span></Label>
              <Select value={locRegion} onValueChange={(v) => setLocRegion(v as RegionId)}>
                <SelectTrigger id="loc-region"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-name">Name <span className="text-destructive">*</span></Label>
              <Input id="loc-name" value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Swaminarayan Mandir" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-addr">Address</Label>
              <Input id="loc-addr" value={locAddress} onChange={(e) => setLocAddress(e.target.value)} placeholder="123 Main St, City, ST" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLocation} disabled={locSaving || !locName.trim()}>
              {locSaving ? 'Saving...' : editingLoc ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="rm-name">Name <span className="text-destructive">*</span></Label>
              <Input id="rm-name" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Main Hall" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rm-cap">Capacity</Label>
              <Input id="rm-cap" type="number" value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)} placeholder="e.g. 200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoom} disabled={roomSaving || !roomName.trim()}>
              {roomSaving ? 'Saving...' : editingRoom ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
