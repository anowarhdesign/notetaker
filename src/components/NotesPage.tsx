import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TEMPLATES } from '../lib/templates'
import { dayBucket } from '../lib/util'
import { useMeetings } from '../store'
import type { Meeting, TemplateId } from '../types'
import { NoteCard } from './NoteCard'

/** Every note, searchable and filterable by template, grouped by day. */
export function NotesPage({ go, onNew }: { go: (hash: string) => void; onNew: () => void }) {
  const meetings = useMeetings()
  const [q, setQ] = useState('')
  const [tpl, setTpl] = useState<TemplateId | 'all'>('all')

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = [...meetings]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((m) => tpl === 'all' || m.template === tpl)
      .filter(
        (m) =>
          !s ||
          [m.title, m.notes, m.attendees.join(' '), m.enhanced?.tldr ?? '', m.transcript.map((t) => t.text).join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(s),
      )
    const g = new Map<string, Meeting[]>()
    for (const m of list) {
      const k = dayBucket(m.createdAt)
      g.set(k, [...(g.get(k) ?? []), m])
    }
    return [...g.entries()]
  }, [meetings, q, tpl])

  const used = useMemo(() => new Set(meetings.map((m) => m.template)), [meetings])

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">{meetings.length} notes</p>
          <h1 className="display-sm">All notes</h1>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          <Plus size={16} /> New note
        </button>
      </header>

      <div className="toolbar">
        <label className="search-inline wide">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, notes and transcripts" aria-label="Search notes" />
        </label>
        <div className="filter-row" role="radiogroup" aria-label="Filter by template">
          <button role="radio" aria-checked={tpl === 'all'} className={`tpl-chip ${tpl === 'all' ? 'on' : ''}`} onClick={() => setTpl('all')}>
            All
          </button>
          {TEMPLATES.filter((t) => used.has(t.id)).map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={tpl === t.id}
              className={`tpl-chip ${tpl === t.id ? 'on' : ''}`}
              onClick={() => setTpl(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {groups.map(([label, list]) => (
        <section key={label} className="group">
          <h2 className="group-label">{label}</h2>
          {list.map((m) => (
            <NoteCard key={m.id} m={m} go={go} />
          ))}
        </section>
      ))}
      {!groups.length && (
        <div className="empty">
          <p className="display-sm">{q || tpl !== 'all' ? 'Nothing matches that.' : 'A quiet page.'}</p>
          <p className="muted">{q || tpl !== 'all' ? 'Try another word or filter.' : 'Start your first note.'}</p>
        </div>
      )}
    </div>
  )
}
