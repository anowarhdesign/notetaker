import {
  CalendarDays,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  FileText,
  Menu,
  Mic,
  Pause,
  PanelRight,
  Play,
  PlayCircle,
  Sparkles,
  Square,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { download, slug, toMarkdown } from '../lib/exporter'
import { enhanceLocal } from '../lib/localEngine'
import { clearRecError, pauseSession, resumeSession, startSession, stopSession, useRecorder } from '../lib/recorder'
import { TEMPLATES } from '../lib/templates'
import { clock, hueOf, humanDuration, initials, sleep } from '../lib/util'
import { actions, getMeeting, useMeeting, useSettings } from '../store'
import type { TemplateId } from '../types'
import { EnhancedView } from './EnhancedView'
import { Orb } from './Orb'
import { SidePanel } from './SidePanel'
import { toast } from './Toast'

const STEPS = ['Reading the transcript', 'Lining it up with your notes', 'Pulling out decisions & follow-ups', 'Polishing']

export function NoteView({ id, go, onMenu }: { id: string; go: (h: string) => void; onMenu: () => void }) {
  const m = useMeeting(id)
  const rec = useRecorder()
  const settings = useSettings()
  const [tab, setTab] = useState<'notes' | 'enhanced'>(m?.enhanced ? 'enhanced' : 'notes')
  const [panel, setPanel] = useState<null | 'transcript' | 'ask'>(
    rec.meetingId === id && rec.status !== 'idle' ? 'transcript' : null,
  )
  const [working, setWorking] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [attendee, setAttendee] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const live = rec.meetingId === id && rec.status !== 'idle'

  // fresh note: focus the title (the view is keyed by note id, so state starts clean)
  useEffect(() => {
    if (!getMeeting(id)?.title) titleRef.current?.focus()
  }, [id])

  useEffect(() => {
    if (live) setPanel((p) => p ?? 'transcript')
  }, [live])

  // autosize the notes textarea
  useEffect(() => {
    const el = notesRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(320, el.scrollHeight) + 'px'
  }, [m?.notes, tab])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        void enhance()
      } else if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setPanel((p) => (p ? null : 'transcript'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!m) {
    return (
      <div className="empty center">
        <p className="display-sm">This note doesn’t exist anymore.</p>
        <button className="btn btn-ghost" onClick={() => go('#/')}>
          Back home
        </button>
      </div>
    )
  }

  async function enhance() {
    const cur = getMeeting(id)
    if (!cur || working !== null) return
    if (!cur.notes.trim() && !cur.transcript.length) {
      toast('Write a few notes or record something first.')
      return
    }
    setTab('enhanced')
    setWorking(0)
    const stepper = setInterval(() => setWorking((w) => (w === null ? null : Math.min(STEPS.length - 1, w + 1))), 650)
    try {
      let result
      if (settings.apiKey) {
        try {
          const { enhanceClaude } = await import('../lib/claudeEngine')
          result = await enhanceClaude(cur, settings.apiKey, settings.model)
        } catch (err) {
          toast(`Claude unavailable — ${(err as Error).message.slice(0, 70)}. Used on-device engine.`)
          result = enhanceLocal(cur)
        }
      } else {
        await sleep(2200)
        result = enhanceLocal(cur)
      }
      // keep check-state for follow-ups that survive a regenerate
      const prevDone = new Set(cur.enhanced?.actionItems.filter((a) => a.done).map((a) => a.text))
      result.actionItems = result.actionItems.map((a) => ({ ...a, done: prevDone.has(a.text) }))
      const title = cur.title || autoTitle(result.topics)
      actions.update(id, { enhanced: result, title })
    } finally {
      clearInterval(stepper)
      setWorking(null)
    }
  }

  const autoTitle = (topics: string[]) => (topics.length ? topics.slice(0, 2).join(' & ') : 'Untitled meeting')

  const start = (source: 'mic' | 'demo') => {
    clearRecError()
    void startSession(id, source)
    setPanel('transcript')
  }

  const stop = () => {
    stopSession()
    toast('Meeting ended.', { label: '✦ Enhance notes', run: () => void enhance() }, 6000)
  }

  const addAttendee = () => {
    const name = attendee.trim()
    if (!name) return
    if (!m.attendees.includes(name)) actions.update(id, { attendees: [...m.attendees, name] })
    setAttendee('')
  }

  const remove = () => {
    if (live) stopSession()
    const copy = getMeeting(id)!
    actions.remove(id)
    go('#/')
    toast('Note deleted.', { label: 'Undo', run: () => actions.restore(copy) }, 6000)
  }

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(m))
      toast('Copied as Markdown')
    } catch {
      toast('Clipboard blocked — use Download instead.')
    }
    setMenu(false)
  }

  const lastLine = m.transcript.at(-1)

  return (
    <div className={`note-layout ${panel ? 'with-panel' : ''}`}>
      <div className="note-main">
        <div className="topbar">
          <button className="icon-btn only-mobile" onClick={onMenu} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <button className="crumb" onClick={() => go('#/')}>
            Notes
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-cur">{m.title || 'Untitled'}</span>
          <div className="topbar-actions">
            <button
              className={`icon-btn ${panel ? 'on' : ''}`}
              onClick={() => setPanel((p) => (p ? null : 'transcript'))}
              title="Transcript & Ask (Ctrl/⌘ J)"
              aria-label="Toggle transcript panel"
            >
              <PanelRight size={17} />
            </button>
            <div className="menu-wrap">
              <button className="icon-btn" onClick={() => setMenu((v) => !v)} aria-label="More actions" aria-expanded={menu}>
                <Ellipsis size={18} />
              </button>
              {menu && (
                <>
                  <div className="menu-scrim" onClick={() => setMenu(false)} />
                  <div className="menu" role="menu">
                    <button onClick={copyMd}>
                      <Copy size={14} /> Copy as Markdown
                    </button>
                    <button
                      onClick={() => {
                        download(`${slug(m.title)}.md`, toMarkdown(m))
                        setMenu(false)
                      }}
                    >
                      <Download size={14} /> Download .md
                    </button>
                    <button
                      onClick={() => {
                        download(`${slug(m.title)}-with-transcript.md`, toMarkdown(m, true))
                        setMenu(false)
                      }}
                    >
                      <FileText size={14} /> Download with transcript
                    </button>
                    <hr />
                    <button className="danger" onClick={remove}>
                      <Trash2 size={14} /> Delete note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="page">
          <input
            ref={titleRef}
            className="title-input"
            value={m.title}
            placeholder="Untitled meeting"
            onChange={(e) => actions.update(id, { title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && notesRef.current?.focus()}
            aria-label="Meeting title"
          />

          <div className="meta-row">
            <span className="meta">
              <CalendarDays size={14} />
              {new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="meta">
              <Clock3 size={14} />
              {live ? clock(m.durationSec + rec.elapsed) : humanDuration(m.durationSec)}
            </span>
            <label className="meta select-meta">
              <select
                value={m.template}
                onChange={(e) => actions.update(id, { template: e.target.value as TemplateId })}
                aria-label="Template"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="people">
              {m.attendees.map((a) => (
                <span key={a} className="person" style={{ ['--h' as string]: hueOf(a) }}>
                  <span className="avatar">{initials(a)}</span>
                  {a}
                  <button
                    aria-label={`Remove ${a}`}
                    onClick={() => actions.update(id, { attendees: m.attendees.filter((x) => x !== a) })}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <label className="add-person">
                <UserPlus size={13} />
                <input
                  value={attendee}
                  onChange={(e) => setAttendee(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAttendee()}
                  onBlur={addAttendee}
                  placeholder="Add people"
                  aria-label="Add attendee"
                />
              </label>
            </div>
          </div>

          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'notes'} className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>
              My notes
            </button>
            <button
              role="tab"
              aria-selected={tab === 'enhanced'}
              className={tab === 'enhanced' ? 'on' : ''}
              onClick={() => setTab('enhanced')}
            >
              <Sparkles size={13} /> Enhanced
            </button>
            <span className="tab-ink" style={{ transform: `translateX(${tab === 'notes' ? 0 : 100}%)` }} />
          </div>

          {tab === 'notes' && (
            <textarea
              ref={notesRef}
              className="notes"
              value={m.notes}
              onChange={(e) => actions.update(id, { notes: e.target.value })}
              placeholder={
                'Write the few things that matter. Murmur fills in the rest.\n\n# Use headings to shape the summary\n- short bullets are perfect'
              }
              aria-label="Your notes"
              spellCheck
            />
          )}

          {tab === 'enhanced' &&
            (working !== null ? (
              <div className="working">
                <div className="working-orb">
                  <Orb size={72} active />
                </div>
                <ol className="steps">
                  {STEPS.map((s, i) => (
                    <li key={s} className={i < working ? 'done' : i === working ? 'cur' : ''}>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="shimmer">
                  <i style={{ width: '88%' }} />
                  <i style={{ width: '72%' }} />
                  <i style={{ width: '80%' }} />
                  <i style={{ width: '54%' }} />
                </div>
              </div>
            ) : m.enhanced ? (
              <EnhancedView m={m} onRegenerate={() => void enhance()} />
            ) : (
              <div className="enh-empty">
                <div className="enh-empty-art">✦</div>
                <p className="display-sm">Nothing enhanced yet</p>
                <p className="muted">
                  When the conversation wraps, Murmur blends your notes with the transcript into a summary, decisions and
                  follow-ups.
                </p>
                <button className="btn btn-ember" onClick={() => void enhance()}>
                  <Sparkles size={16} /> Enhance notes
                </button>
              </div>
            ))}
        </div>

        <div className="dock-wrap">
          {rec.error && rec.meetingId !== id && rec.status === 'idle' && (
            <div className="dock-error">
              {rec.error}
              <button className="link-btn" onClick={() => start('demo')}>
                Play demo
              </button>
              <button className="icon-btn sm" onClick={clearRecError} aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}
          {rec.error && live && <div className="dock-error">{rec.error}</div>}
          <div className={`dock ${live ? 'live' : ''}`}>
            {live ? (
              <>
                <button className="dock-orb" onClick={() => setPanel('transcript')} aria-label="Show transcript">
                  <Orb size={46} active paused={rec.status === 'paused'} />
                </button>
                <div className="dock-info">
                  <span className="dock-status">
                    <i className={`pulse ${rec.status}`} />
                    {rec.status === 'paused' ? 'Paused' : rec.source === 'demo' ? 'Demo call' : 'Listening'}
                    <b>{clock(rec.elapsed)}</b>
                  </span>
                  <span className="dock-caption">{rec.interim || lastLine?.text || 'Speak naturally — Murmur is transcribing.'}</span>
                </div>
                {rec.status === 'paused' ? (
                  <button className="round-btn" onClick={resumeSession} aria-label="Resume" title="Resume">
                    <Play size={16} />
                  </button>
                ) : (
                  <button className="round-btn" onClick={pauseSession} aria-label="Pause" title="Pause">
                    <Pause size={16} />
                  </button>
                )}
                <button className="round-btn stop" onClick={stop} aria-label="Stop" title="End meeting">
                  <Square size={13} fill="currentColor" />
                </button>
              </>
            ) : (
              <>
                <button className="dock-listen" onClick={() => start('mic')} title="Start listening">
                  <Orb size={34} />
                  <span>{m.transcript.length ? 'Resume listening' : 'Start listening'}</span>
                  <Mic size={15} />
                </button>
                <button className="icon-btn" onClick={() => start('demo')} title="Play a demo conversation" aria-label="Play demo conversation">
                  <PlayCircle size={18} />
                </button>
                <span className="dock-div" />
                <button className="btn btn-ember enh-btn" onClick={() => void enhance()} disabled={working !== null}>
                  <Sparkles size={15} /> {m.enhanced ? 'Re-enhance' : 'Enhance'}
                  <kbd>{/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'} E</kbd>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {panel && <SidePanel m={m} tab={panel} setTab={setPanel} onClose={() => setPanel(null)} />}
    </div>
  )
}
