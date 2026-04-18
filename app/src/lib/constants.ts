import type { CategoryId, AudienceType, RegionId } from '@/types'

export interface Category {
  id: CategoryId
  label: string
  color: string   // border / accent color
  bg: string      // card background
  text: string    // card text color
}

export const CATEGORIES: Category[] = [
  { id: 'adhyatmik',    label: 'Adhyatmik',    color: '#5DCAA5', bg: '#E1F5EE', text: '#085041' },
  { id: 'vyavharik',    label: 'Vyavharik',    color: '#85B7EB', bg: '#E6F1FB', text: '#0C447C' },
  { id: 'free_time',    label: 'Free Time',    color: '#EF9F27', bg: '#FAEEDA', text: '#633806' },
  { id: 'aaram',        label: 'Aaram',        color: '#ED93B1', bg: '#FBEAF0', text: '#72243E' },
  { id: 'meals',        label: 'Meals',        color: '#97C459', bg: '#EAF3DE', text: '#27500A' },
  { id: 'announcements',label: 'Announcements',color: '#B4B2A9', bg: '#F1EFE8', text: '#444441' },
  { id: 'travel',       label: 'Travel',       color: '#A9A9A9', bg: '#F5F5F5', text: '#333333' },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>

export const AUDIENCE_GROUPS: Record<Exclude<AudienceType, 'all' | 'custom'>, string[]> = {
  age:    ['Vadil', 'Yuva', 'Kishor', 'Balak'],
  gender: ['Vadil Bhaio', 'Mahila', 'Yuvati', 'Kishor', 'Kishori'],
  region: ['Chicago', 'NJ', 'Canada', 'UK', 'Australia', 'Remote'],
}

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: 'chicago',  label: 'Chicago' },
  { id: 'houston',  label: 'Houston' },
  { id: 'nj-east',  label: 'NJ-East' },
  { id: 'nj-west',  label: 'NJ-West' },
  { id: 'atlanta',  label: 'Atlanta' },
  { id: 'london',   label: 'London' },
  { id: 'toronto',  label: 'Toronto' },
  { id: 'global',   label: 'Global' },
]

export const REGION_MAP = Object.fromEntries(
  REGIONS.map((r) => [r.id, r])
) as Record<RegionId, { id: RegionId; label: string }>

export const TIMEZONES = [
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
