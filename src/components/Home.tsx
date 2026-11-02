import { ArrowUpRight, Check, Clock3, Mic, PlayCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { speechSupported } from '../lib/recorder'
import { TEMPLATES } from '../lib/templates'
import { dayBucket, greeting, hueOf, humanDuration, initials } from '../lib/util'
import { actions, useMeetings } from '../store'
import type { Meeting, TemplateId } from '../types'
import { Orb } from './Orb'

interface Props {
  go: (hash: string) => void
  onStart: (template: TemplateId, source: 'mic' | 'demo') => void
}

export function Home({ go, onStart }: Props) {
  const meetings = useMeetings()
  const [q, setQ] = useState('')
  const [tpl, setTpl] = useState<TemplateId>('general')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = [...meetings].sort((a, b) => b.createdAt - a.createdAt)
    if (!s) return list
    return list.filter((m) =>
      [m.title, m.notes, m.attendees.join(' '), m.enhanced?.tldr ?? '', m.transcript.map((t) => t.text).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(s),
    )
  }, [meetings, q])

  const groups = useMemo(() => {
    const g = new Map<string, Meeting[]>()
    for (const m of filtered) {
      const k = dayBucket(m.createdAt)
      g.set(k, [...(g.get(k) ?? []), m])
    }
    return [...g.entries()]
  }, [filtered])

  const followUps = useMemo(
    () =>
      meetings
        .flatMap((m) => (m.enhanced?.actionItems ?? []).filter((a) => !a.done).map((a) => ({ a, m })))
        .slice(0, 5),
    [meetings],
  )

  const totalMin = Math.round(meetings.reduce((s, m) => s + m.durationSec, 0) / 60)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const toggle = (m: Meeting, id: string) =>
    actions.update(m.id, (x) => ({
      enhanced: x.enhanced && {
        ...x.enhanced,
        actionItems: x.enhanced.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
      },
    }))

  return (
    <div className="home">
      <header className="home-head rise">
        <p className="eyebrow">{today}</p>
        <h1 className="display">
          {greeting()}.<br />
          <em>What are we listening to?</em>
        </h1>
      </header>

      <section className="hero-card rise" style={{ animationDelay: '60ms' }}>
        <div className="hero-orb">
          <Orb size={132} active={false} />
        </div>
        <div className="hero-body">
          <h2>Start a note. Murmur takes it from there.</h2>
          <p className="muted">
            Jot the few things that matter while Murmur transcribes the room. When you’re done, one click weaves your
            notes and the conversation into a clean summary.
          </p>
          <div className="tpl-row" role="radiogroup" aria-label="Template">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tpl === t.id}
                className={`tpl-chip ${tpl === t.id ? 'on' : ''}`}
                onClick={() => setTpl(t.id)}
                title={t.blurb}
              >
                <span className="tpl-glyph">{t.emoji}</span>
                {t.name}
              </button>
            ))}
          </div>
          <div className="hero-actions">
            <button className="btn btn-ember btn-lg" onClick={() => onStart(tpl, 'mic')}>
              <Mic size={18} /> Start listening
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => onStart(tpl, 'demo')}>
              <PlayCircle size={18} /> Try a demo call
            </button>
          </div>
          {!speechSupported && (
            <p className="hint">Live transcription needs Chrome, Edge or Safari — the demo call works everywhere.</p>
          )}
        </div>
      </section>

      <section className="stats rise" style={{ animationDelay: '120ms' }}>
        <div className="stat">
          <span className="stat-n">{meetings.length}</span>
          <span className="stat-l">notes</span>
        </div>
        <div className="stat">
          <span className="stat-n">{totalMin}</span>
          <span className="stat-l">minutes captured</span>
        </div>
        <div className="stat">
          <span className="stat-n">{meetings.reduce((s, m) => s + (m.enhanced?.actionItems.filter((a) => !a.done).length ?? 0), 0)}</span>
          <span className="stat-l">open follow-ups</span>
        </div>
      </section>

      <div className="home-grid">
        <section className="notes-col rise" style={{ animationDelay: '180ms' }}>
          <div className="section-head">
            <h3>Your notes</h3>
            <label className="search-inline">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes & transcripts" />
            </label>
          </div>
          {groups.map(([label, list]) => (
            <div key={label} className="group">
              <div className="group-label">{label}</div>
              {list.map((m) => (
                <button key={m.id} className="note-card" onClick={() => go(`#/n/${m.id}`)}>
                  <div className="note-card-top">
                    <span className="note-glyph">{m.emoji ?? '○'}</span>
                    <span className="note-title">{m.title || 'Untitled note'}</span>
                    <ArrowUpRight size={16} className="note-arrow" />
                  </div>
                  <p className="note-snippet">
                    {m.enhanced?.tldr || m.notes.replace(/^#+\s*/gm, '').slice(0, 160) || 'Empty note'}
                  </p>
                  <div className="note-meta">
                    <span>
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
                    <span className="avatars">
                      {m.attendees.slice(0, 4).map((a) => (
                        <span key={a} className="avatar" style={{ ['--h' as string]: hueOf(a) }} title={a}>
                          {initials(a)}
                        </span>
                      ))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {!groups.length && (
            <div className="empty">
              <p className="display-sm">{q ? 'Nothing matches that.' : 'A quiet page.'}</p>
              <p className="muted">{q ? 'Try a different word.' : 'Start your first note above.'}</p>
            </div>
          )}
        </section>

        <aside className="follow-col rise" style={{ animationDelay: '240ms' }}>
          <div className="section-head">
            <h3>Follow-ups</h3>
          </div>
          <div className="follow-card">
            {followUps.length ? (
              followUps.map(({ a, m }) => (
                <div key={a.id} className="follow-item">
                  <button className="check" aria-label="Mark done" onClick={() => toggle(m, a.id)}>
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <div>
                    <p>{a.text}</p>
                    <button className="follow-src" onClick={() => go(`#/n/${m.id}`)}>
                      {a.owner ? `${a.owner} · ` : ''}
                      {m.title}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted small">All caught up. Follow-ups from enhanced notes land here.</p>
            )}
          </div>
          <div className="tip-card">
            <p className="eyebrow">Tip</p>
            <p>
              Write <code># Headings</code> in your notes — Murmur keeps your structure and fills in what was said
              underneath each one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
