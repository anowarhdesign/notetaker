import { useSyncExternalStore } from 'react'
import type { Meeting, Segment, Settings, TemplateId } from './types'
import { seedMeetings } from './lib/demo'
import { uid } from './lib/util'

const KEY = 'murmur.meetings.v1'
const SKEY = 'murmur.settings.v1'

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    /* storage unavailable or corrupt — start fresh */
  }
  return fallback()
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private mode — keep working in memory */
  }
}

/* ---------- meetings ---------- */

let meetings: Meeting[] = load(KEY, seedMeetings)
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function emit() {
  listeners.forEach((l) => l())
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => save(KEY, meetings), 250)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useMeetings = () => useSyncExternalStore(subscribe, () => meetings)
export const useMeeting = (id: string | null) =>
  useSyncExternalStore(subscribe, () => (id ? meetings.find((m) => m.id === id) : undefined))

export const getMeeting = (id: string) => meetings.find((m) => m.id === id)

export const actions = {
  create(template: TemplateId = 'general'): Meeting {
    const now = Date.now()
    const m: Meeting = {
      id: uid(),
      title: '',
      createdAt: now,
      updatedAt: now,
      durationSec: 0,
      attendees: [],
      template,
      notes: '',
      transcript: [],
      chat: [],
    }
    meetings = [m, ...meetings]
    emit()
    return m
  },
  update(id: string, patch: Partial<Meeting> | ((m: Meeting) => Partial<Meeting>)) {
    meetings = meetings.map((m) =>
      m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch), updatedAt: Date.now() } : m,
    )
    emit()
  },
  appendSegment(id: string, seg: Segment) {
    actions.update(id, (m) => ({ transcript: [...m.transcript, seg] }))
  },
  remove(id: string) {
    meetings = meetings.filter((m) => m.id !== id)
    emit()
  },
  restore(m: Meeting) {
    meetings = [m, ...meetings.filter((x) => x.id !== m.id)].sort((a, b) => b.createdAt - a.createdAt)
    emit()
  },
  resetAll() {
    meetings = seedMeetings()
    emit()
  },
}

/* ---------- settings ---------- */

let settings: Settings = {
  apiKey: '',
  model: 'claude-opus-5-5',
  lang: navigator.language || 'en-US',
  theme: 'system',
  ...load<Partial<Settings>>(SKEY, () => ({})),
}
const sListeners = new Set<() => void>()

export const useSettings = () =>
  useSyncExternalStore(
    (l) => {
      sListeners.add(l)
      return () => sListeners.delete(l)
    },
    () => settings,
  )

export const getSettings = () => settings

export function setSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  save(SKEY, settings)
  sListeners.forEach((l) => l())
}
