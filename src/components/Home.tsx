import { ArrowRight, Check, Mic, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { speechSupported } from '../lib/recorder'
import { TEMPLATES } from '../lib/templates'
import { greeting } from '../lib/util'
import { actions, useMeetings } from '../store'
import type { TemplateId } from '../types'
import { NoteCard } from './NoteCard'
import { Orb } from './Orb'

interface Props {
  go: (hash: string) => void
  onStart: (template: TemplateId, source: 'mic' | 'demo') => void
}

/** Today: start a meeting, pick up recent notes, clear follow-ups. */
export function Home({ go, onStart }: Props) {
  const meetings = useMeetings()
  const [tpl, setTpl] = useState<TemplateId>('general')
  const [today] = useState(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))

  const recent = useMemo(() => [...meetings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [meetings])
  const open = useMemo(
    () => meetings.flatMap((m) => (m.enhanced?.actionItems ?? []).filter((a) => !a.done).map((a) => ({ a, m }))),
    [meetings],
  )
  const blurb = TEMPLATES.find((t) => t.id === tpl)?.blurb

  return (
    <div className="home">
      <header className="home-head rise">
        <p className="eyebrow">{today}</p>
        <h1 className="display">
          {greeting()}.<br />
          <em>What are we listening to?</em>
        </h1>
      </header>

      <section className="start-card rise" style={{ animationDelay: '60ms' }} aria-labelledby="start-title">
        <div className="start-orb">
          <Orb size={64} />
        </div>
        <div className="start-body">
          <h2 id="start-title">Start a meeting</h2>
          <div className="tpl-row" role="radiogroup" aria-label="Template">
            {TEMPLATES.map((t) => (
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
          <p className="muted small start-blurb">{blurb}. Jot what matters; Murmur transcribes and fills in the rest.</p>
          {!speechSupported && (
            <p className="hint">Live transcription needs Chrome, Edge or Safari. The demo call works everywhere.</p>
          )}
        </div>
        <div className="start-actions">
          <button className="btn btn-primary btn-lg" onClick={() => onStart(tpl, 'mic')}>
            <Mic size={18} /> Start listening
          </button>
          <button className="btn btn-ghost" onClick={() => onStart(tpl, 'demo')}>
            <PlayCircle size={16} /> Try a demo call
          </button>
        </div>
      </section>

      <div className="home-grid">
        <section className="notes-col rise" style={{ animationDelay: '120ms' }} aria-labelledby="recent-title">
          <div className="section-head">
            <h3 id="recent-title">Recent notes</h3>
            {meetings.length > recent.length && (
              <button className="link-btn" onClick={() => go('#/notes')}>
                All {meetings.length} notes <ArrowRight size={13} />
              </button>
            )}
          </div>
          {recent.map((m) => (
            <NoteCard key={m.id} m={m} go={go} />
          ))}
          {!recent.length && (
            <div className="empty">
              <p className="display-sm">A quiet page.</p>
              <p className="muted">Start your first meeting above, or try the demo call.</p>
            </div>
          )}
        </section>

        <aside className="follow-col rise" style={{ animationDelay: '180ms' }} aria-labelledby="fu-title">
          <div className="section-head">
            <h3 id="fu-title">Follow-ups</h3>
            {open.length > 5 && (
              <button className="link-btn" onClick={() => go('#/follow-ups')}>
                All {open.length} <ArrowRight size={13} />
              </button>
            )}
          </div>
          <div className="follow-card">
            {open.length ? (
              open.slice(0, 5).map(({ a, m }) => (
                <div key={a.id} className="follow-item">
                  <button className="check" aria-label={`Mark “${a.text}” done`} onClick={() => actions.toggleAction(m.id, a.id)}>
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
              <p className="muted small">All caught up. Action items from enhanced notes land here.</p>
            )}
          </div>
          <div className="tip-card">
            <p className="eyebrow">Tip</p>
            <p>
              Write <code># Headings</code> in your notes. Murmur keeps your structure and fills in what was said under
              each one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
