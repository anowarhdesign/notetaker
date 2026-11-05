import { Command, House, ListChecks, NotebookText, Plus, Settings2, Sparkles, X } from 'lucide-react'
import { useMemo } from 'react'
import { useRecorder } from '../lib/recorder'
import { clock } from '../lib/util'
import { useMeetings, useSettings } from '../store'
import type { Route } from '../App'
import { Orb } from './Orb'

interface Props {
  route: Route
  open: boolean
  onClose: () => void
  onNew: () => void
  onSettings: () => void
  onPalette: () => void
  go: (hash: string) => void
}

export function Sidebar({ route, open, onClose, onNew, onSettings, onPalette, go }: Props) {
  const meetings = useMeetings()
  const rec = useRecorder()
  const settings = useSettings()
  const recent = useMemo(() => [...meetings].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8), [meetings])
  const activeId = route.view === 'note' ? route.id : null
  const openCount = useMemo(
    () => meetings.reduce((n, m) => n + (m.enhanced?.actionItems.filter((a) => !a.done).length ?? 0), 0),
    [meetings],
  )
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Navigation">
        <div className="brand">
          <button className="brand-mark" onClick={() => go('#/')} aria-label="Murmur home">
            <span className="brand-dot" />
            <span className="brand-word">murmur</span>
          </button>
          <button className="icon-btn only-mobile" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <button className="btn btn-primary btn-block new-btn" onClick={onNew}>
          <Plus size={16} strokeWidth={2.4} />
          New note
          <kbd>{isMac ? '⌘' : 'Ctrl'} N</kbd>
        </button>

        <button className="search-trigger" onClick={onPalette}>
          <Command size={14} />
          <span>Search or jump to…</span>
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        <nav className="nav">
          <button
            className={`nav-item ${route.view === 'home' ? 'active' : ''}`}
            aria-current={route.view === 'home' ? 'page' : undefined}
            onClick={() => go('#/')}
          >
            <House size={16} /> Home
          </button>
          <button
            className={`nav-item ${route.view === 'notes' ? 'active' : ''}`}
            aria-current={route.view === 'notes' ? 'page' : undefined}
            onClick={() => go('#/notes')}
          >
            <NotebookText size={16} /> All notes
            <span className="nav-count">{meetings.length}</span>
          </button>
          <button
            className={`nav-item ${route.view === 'follow-ups' ? 'active' : ''}`}
            aria-current={route.view === 'follow-ups' ? 'page' : undefined}
            onClick={() => go('#/follow-ups')}
          >
            <ListChecks size={16} /> Follow-ups
            {openCount > 0 && <span className="nav-count">{openCount}</span>}
          </button>
        </nav>

        {rec.status !== 'idle' && rec.meetingId && (
          <button className="live-chip" onClick={() => go(`#/n/${rec.meetingId}`)}>
            <Orb size={26} active paused={rec.status === 'paused'} />
            <span>
              <strong>{rec.status === 'paused' ? 'Paused' : 'Listening'}</strong>
              <em>{clock(rec.elapsed)}</em>
            </span>
          </button>
        )}

        <div className="side-label">Recent</div>
        <div className="recent">
          {recent.map((m) => (
            <button
              key={m.id}
              className={`recent-item ${activeId === m.id ? 'active' : ''}`}
              aria-current={activeId === m.id ? 'page' : undefined}
              onClick={() => go(`#/n/${m.id}`)}
              title={m.title || 'Untitled'}
            >
              <span className="recent-glyph">{m.emoji ?? '○'}</span>
              <span className="recent-title">{m.title || 'Untitled note'}</span>
              {rec.meetingId === m.id && <span className="rec-dot" />}
            </button>
          ))}
          {!recent.length && <p className="muted small pad">No notes yet.</p>}
        </div>

        <div className="side-foot">
          <button className="engine-pill" onClick={onSettings}>
            <Sparkles size={14} />
            <span>{settings.apiKey ? 'Claude connected' : 'On-device engine'}</span>
            <span className={`engine-dot ${settings.apiKey ? 'on' : ''}`} />
          </button>
          <button className="icon-btn" onClick={onSettings} aria-label="Settings">
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
    </>
  )
}
