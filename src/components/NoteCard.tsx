import { ArrowUpRight, Clock3 } from 'lucide-react'
import { hueOf, humanDuration, initials } from '../lib/util'
import type { Meeting } from '../types'

/** One row in a list of notes: title, a one-line summary and the meta line. */
export function NoteCard({ m, go }: { m: Meeting; go: (hash: string) => void }) {
  const open = m.enhanced?.actionItems.filter((a) => !a.done).length ?? 0
  return (
    <button className="note-card" onClick={() => go(`#/n/${m.id}`)}>
      <div className="note-card-top">
        <span className="note-glyph">{m.emoji ?? '○'}</span>
        <span className="note-title">{m.title || 'Untitled note'}</span>
        <ArrowUpRight size={16} className="note-arrow" />
      </div>
      <p className="note-snippet">{m.enhanced?.tldr || m.notes.replace(/^#+\s*/gm, '').slice(0, 160) || 'Empty note'}</p>
      <div className="note-meta">
        <span>
          {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
          {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
        <span className="dot-sep" />
        <span>
          <Clock3 size={12} /> {humanDuration(m.durationSec)}
        </span>
        {m.enhanced && (
          <>
            <span className="dot-sep" />
            <span className="enh-badge">✦ Enhanced</span>
          </>
        )}
        {open > 0 && (
          <>
            <span className="dot-sep" />
            <span>
              {open} open follow-up{open === 1 ? '' : 's'}
            </span>
          </>
        )}
        <span className="avatars">
          {m.attendees.slice(0, 4).map((a) => (
            <span key={a} className="avatar" style={{ ['--h' as string]: hueOf(a) }} title={a}>
              {initials(a)}
            </span>
          ))}
        </span>
      </div>
    </button>
  )
}
