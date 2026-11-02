import { Check, CircleHelp, Diamond, RefreshCw } from 'lucide-react'
import { relativeTime } from '../lib/util'
import { actions } from '../store'
import type { Meeting } from '../types'

export function EnhancedView({ m, onRegenerate }: { m: Meeting; onRegenerate: () => void }) {
  const e = m.enhanced!
  const toggle = (id: string) =>
    actions.update(m.id, (x) => ({
      enhanced: x.enhanced && {
        ...x.enhanced,
        actionItems: x.enhanced.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
      },
    }))

  return (
    <article className="enhanced">
      <div className="enh-legend">
        <span>
          <i className="sw you" /> Your notes
        </span>
        <span>
          <i className="sw ai" /> Added by Murmur
        </span>
        <span className="enh-engine">
          {e.engine === 'claude' ? 'Claude' : 'On-device'} · {relativeTime(e.generatedAt)}
          <button className="link-btn" onClick={onRegenerate}>
            <RefreshCw size={12} /> Regenerate
          </button>
        </span>
      </div>

      <section className="tldr reveal">
        <span className="tldr-tag">TL;DR</span>
        <p>{e.tldr}</p>
        {!!e.topics.length && (
          <div className="topics">
            {e.topics.map((t) => (
              <span key={t} className="topic">
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

      {e.blocks.map((b, bi) => (
        <section key={bi} className="enh-block reveal" style={{ animationDelay: `${80 + bi * 70}ms` }}>
          <h3>{b.heading}</h3>
          <ul>
            {b.items.map((i, ii) => (
              <li key={ii} className={i.source}>
                {i.text}
                {!!i.children?.length && (
                  <ul>
                    {i.children.map((c, ci) => (
                      <li key={ci} className={c.source}>
                        {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!!e.decisions.length && (
        <section className="enh-block reveal">
          <h3>Decisions</h3>
          <ul className="plain">
            {e.decisions.map((d, i) => (
              <li key={i} className="decision">
                <Diamond size={13} className="decision-icon" />
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!e.actionItems.length && (
        <section className="enh-block reveal">
          <h3>Action items</h3>
          <ul className="plain">
            {e.actionItems.map((a) => (
              <li key={a.id} className={`action ${a.done ? 'done' : ''}`}>
                <button className="check" aria-label={a.done ? 'Mark not done' : 'Mark done'} onClick={() => toggle(a.id)}>
                  <Check size={12} strokeWidth={3} />
                </button>
                <span className="action-text">{a.text}</span>
                {a.owner && <span className="owner">{a.owner}</span>}
                {a.due && <span className="due">{a.due}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!e.questions.length && (
        <section className="enh-block reveal">
          <h3>Open questions</h3>
          <ul className="plain">
            {e.questions.map((q, i) => (
              <li key={i} className="question">
                <CircleHelp size={14} className="q-icon" />
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
