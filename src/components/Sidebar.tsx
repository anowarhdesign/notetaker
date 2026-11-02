import { Command, House, Plus, Settings2, Sparkles, X } from 'lucide-react'
import { useMemo } from 'react'
import { useRecorder } from '../lib/recorder'
import { clock } from '../lib/util'
import { useMeetings, useSettings } from '../store'
import { Orb } from './Orb'

interface Props {
  route: { view: 'home' } | { view: 'note'; id: string }
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
  const recent = useMemo(() => [...meetings].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12), [meetings])
  const activeId = route.view === 'note' ? route.id : null
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
          <button className={`nav-item ${route.view === 'home' ? 'active' : ''}`} onClick={() => go('#/')}>
            <House size={16} /> Home
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
