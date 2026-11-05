import { FileText, House, ListChecks, Mic, NotebookText, Moon, PlayCircle, Plus, Search, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMeetings } from '../store'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

export function CommandPalette({
  onClose,
  go,
  onNew,
  onStart,
  onSettings,
  onTheme,
}: {
  onClose: () => void
  go: (h: string) => void
  onNew: () => void
  onStart: (source: 'mic' | 'demo') => void
  onSettings: () => void
  onTheme: () => void
}) {
  const meetings = useMeetings()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  const items: PaletteAction[] = useMemo(() => {
    const base: PaletteAction[] = [
      { id: 'new', label: 'New note', hint: 'Ctrl/⌘ N', icon: <Plus size={15} />, run: onNew },
      { id: 'listen', label: 'New note & start listening', icon: <Mic size={15} />, run: () => onStart('mic') },
      { id: 'demo', label: 'Play a demo call', icon: <PlayCircle size={15} />, run: () => onStart('demo') },
      { id: 'home', label: 'Go home', icon: <House size={15} />, run: () => go('#/') },
      { id: 'notes', label: 'All notes', icon: <NotebookText size={15} />, run: () => go('#/notes') },
      { id: 'follow-ups', label: 'Follow-ups', icon: <ListChecks size={15} />, run: () => go('#/follow-ups') },
      { id: 'theme', label: 'Toggle light / dark', icon: <Moon size={15} />, run: onTheme },
      { id: 'settings', label: 'Settings & Claude key', icon: <Settings2 size={15} />, run: onSettings },
    ]
    const notes: PaletteAction[] = meetings.map((m) => ({
      id: m.id,
      label: m.title || 'Untitled note',
      hint: new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      icon: <FileText size={15} />,
      run: () => go(`#/n/${m.id}`),
    }))
    const s = q.trim().toLowerCase()
    if (!s) return [...base, ...notes.slice(0, 6)]
    const hay = (m: (typeof meetings)[number]) =>
      [m.title, m.notes, m.attendees.join(' '), m.transcript.map((t) => t.text).join(' ')].join(' ').toLowerCase()
    return [
      ...base.filter((a) => a.label.toLowerCase().includes(s)),
      ...notes.filter((_, idx) => hay(meetings[idx]!).includes(s)),
    ]
  }, [q, meetings, go, onNew, onStart, onSettings, onTheme])

  const run = (a?: PaletteAction) => {
    if (!a) return
    onClose()
    a.run()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setI((x) => Math.min(items.length - 1, x + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setI((x) => Math.max(0, x - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            run(items[i])
          } else if (e.key === 'Escape') onClose()
        }}
      >
        <label className="palette-input">
          <Search size={17} />
          <input ref={input} value={q} onChange={(e) => {
              setQ(e.target.value)
              setI(0)
            }} placeholder="Search notes, transcripts or actions…" />
          <kbd>esc</kbd>
        </label>
        <div className="palette-list">
          {items.map((a, idx) => (
            <button key={a.id} className={`palette-item ${idx === i ? 'on' : ''}`} onMouseEnter={() => setI(idx)} onClick={() => run(a)}>
              <span className="pi-icon">{a.icon}</span>
              <span className="pi-label">{a.label}</span>
              {a.hint && <span className="pi-hint">{a.hint}</span>}
            </button>
          ))}
          {!items.length && <p className="muted small pad">No results for “{q}”.</p>}
        </div>
      </div>
    </div>
  )
}
