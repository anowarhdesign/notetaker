import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { actions, useMeetings } from '../store'

/** Every action item from every enhanced note, grouped by the meeting it came from. */
export function FollowUpsPage({ go }: { go: (hash: string) => void }) {
  const meetings = useMeetings()
  const [show, setShow] = useState<'open' | 'done'>('open')

  const counts = useMemo(() => {
    let open = 0
    let done = 0
    for (const m of meetings)
      for (const a of m.enhanced?.actionItems ?? []) {
        if (a.done) done++
        else open++
      }
    return { open, done }
  }, [meetings])

  const groups = useMemo(
    () =>
      [...meetings]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((m) => ({ m, items: (m.enhanced?.actionItems ?? []).filter((a) => a.done === (show === 'done')) }))
        .filter((g) => g.items.length),
    [meetings, show],
  )

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="eyebrow">From your enhanced notes</p>
          <h1 className="display-sm">Follow-ups</h1>
        </div>
        <div className="seg" role="tablist" aria-label="Show">
          <button role="tab" aria-selected={show === 'open'} className={show === 'open' ? 'on' : ''} onClick={() => setShow('open')}>
            Open · {counts.open}
          </button>
          <button role="tab" aria-selected={show === 'done'} className={show === 'done' ? 'on' : ''} onClick={() => setShow('done')}>
            Done · {counts.done}
          </button>
        </div>
      </header>

      <div className="fu-list">
        {groups.map(({ m, items }) => (
          <section key={m.id} className="fu-group">
            <h2>
              <button className="fu-src" onClick={() => go(`#/n/${m.id}`)}>
                {m.title || 'Untitled note'}
              </button>
              <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </h2>
            {items.map((a) => (
              <div key={a.id} className={`action ${a.done ? 'done' : ''}`}>
                <button
                  className="check"
                  aria-label={a.done ? `Mark “${a.text}” not done` : `Mark “${a.text}” done`}
                  onClick={() => actions.toggleAction(m.id, a.id)}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <span className="action-text">{a.text}</span>
                {a.owner && <span className="owner">{a.owner}</span>}
                {a.due && <span className="due">{a.due}</span>}
              </div>
            ))}
          </section>
        ))}
      </div>
      {!groups.length && (
        <div className="empty">
          <p className="display-sm">{show === 'open' ? 'All caught up.' : 'Nothing ticked off yet.'}</p>
          <p className="muted">
            {show === 'open'
              ? 'When you enhance a note, the action items it finds land here.'
              : 'Items you check off show up here.'}
          </p>
        </div>
      )}
    </div>
  )
}
