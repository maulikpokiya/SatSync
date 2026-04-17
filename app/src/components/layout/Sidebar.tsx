'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  UserCircle,
  Settings,
  LogOut,
  Shield,
  Sun,
  Moon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import type { User, AppRole } from '@/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: User
  globalRole: AppRole | null
  eventSlug?: string
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: UserCircle },
]

const ADMIN_ITEMS = [
  { href: '/admin/users', label: 'Users & Roles', icon: Shield },
]

export function Sidebar({ user, globalRole, eventSlug }: SidebarProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' })
  }

  const initials = (user.display_name ?? user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-bold text-sidebar-primary-foreground">S</span>
        </div>
        <div>
          <p className="text-sm font-semibold">SatSync</p>
          <p className="text-xs text-sidebar-foreground/60">Event Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {globalRole === 'super_admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Administration
              </p>
            </div>
            {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Theme toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {mounted && resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name ?? ''} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium">{user.display_name ?? 'User'}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
