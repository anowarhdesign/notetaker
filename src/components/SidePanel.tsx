import { ArrowUp, ClipboardPaste, MessageCircle, ScrollText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { askLocal } from '../lib/localEngine'
import { useRecorder } from '../lib/recorder'
import { clock, hueOf, uid } from '../lib/util'
import { actions, getMeeting, useSettings } from '../store'
import type { Meeting } from '../types'
import { toast } from './Toast'

const SUGGESTIONS = ['What were the action items?', 'Summarise in 3 bullets', 'What did we decide?', 'Any risks raised?']

export function SidePanel({
  m,
  tab,
  setTab,
  onClose,
}: {
  m: Meeting
  tab: 'transcript' | 'ask'
  setTab: (t: 'transcript' | 'ask') => void
  onClose: () => void
}) {
  return (
    <aside className="panel" aria-label="Meeting side panel">
      <div className="panel-head">
        <div className="seg">
          <button className={tab === 'transcript' ? 'on' : ''} onClick={() => setTab('transcript')}>
            <ScrollText size={14} /> Transcript
          </button>
          <button className={tab === 'ask' ? 'on' : ''} onClick={() => setTab('ask')}>
            <MessageCircle size={14} /> Ask
          </button>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close panel">
          <X size={17} />
        </button>
      </div>
      {tab === 'transcript' ? <Transcript m={m} /> : <Ask m={m} />}
    </aside>
  )
}

function Transcript({ m }: { m: Meeting }) {
  const rec = useRecorder()
  const live = rec.meetingId === m.id && rec.status !== 'idle'
  const end = useRef<HTMLDivElement>(null)
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState('')

  useEffect(() => {
    if (live) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [m.transcript.length, rec.interim, live])

  const importPaste = () => {
    const lines = paste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) return
    const start = m.transcript.at(-1)?.t ?? 0
    const segs = lines.map((l, i) => {
      const sp = l.match(/^([A-Z][\w .'-]{0,24}):\s+(.*)$/)
      return { id: uid(), t: start + (i + 1) * 8, speaker: sp?.[1], text: sp ? sp[2]! : l }
    })
    actions.update(m.id, (x) => ({ transcript: [...x.transcript, ...segs], durationSec: Math.max(x.durationSec, segs.at(-1)!.t + 10) }))
    setPaste('')
    setPasting(false)
    toast(`Imported ${segs.length} lines`)
  }

  return (
    <div className="panel-body">
      <div className="transcript">
        {!m.transcript.length && !live && !pasting && (
          <div className="panel-empty">
            <p className="display-sm">No transcript yet</p>
            <p className="muted small">Start listening from the dock below, or paste a transcript from another tool.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setPasting(true)}>
              <ClipboardPaste size={14} /> Paste transcript
            </button>
          </div>
        )}
        {m.transcript.map((s, i) => {
          const prev = m.transcript[i - 1]
          const showSpeaker = s.speaker && s.speaker !== prev?.speaker
          return (
            <div key={s.id} className={`line ${showSpeaker ? 'first' : ''}`}>
              <span className="ts">{clock(s.t)}</span>
              <div>
                {showSpeaker && (
                  <span className="speaker" style={{ ['--h' as string]: hueOf(s.speaker!) }}>
                    {s.speaker}
                  </span>
                )}
                <p>{s.text}</p>
              </div>
            </div>
          )
        })}
        {live && (
          <div className="line interim">
            <span className="ts">{clock(rec.elapsed)}</span>
            <p>
              {rec.interim || <span className="muted">{rec.status === 'paused' ? 'Paused' : 'Listening…'}</span>}
              {rec.status === 'recording' && <span className="caret" />}
            </p>
          </div>
        )}
        <div ref={end} />
      </div>
      {pasting ? (
        <div className="paste-box">
          <textarea
            autoFocus
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'One line per utterance. Optional speaker:\nMaya: Let’s lock the launch date…'}
          />
          <div className="row-end">
            <button className="btn btn-ghost btn-sm" onClick={() => setPasting(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={importPaste}>
              Import
            </button>
          </div>
        </div>
      ) : (
        !!m.transcript.length && !live && (
          <button className="panel-foot-btn" onClick={() => setPasting(true)}>
            <ClipboardPaste size={13} /> Paste more
          </button>
        )
      )}
    </div>
  )
}

function Ask({ m }: { m: Meeting }) {
  const settings = useSettings()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [m.chat.length, streaming])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setQ('')
    setBusy(true)
    actions.update(m.id, (x) => ({ chat: [...x.chat, { id: uid(), role: 'user', text: question }] }))
    let answer: string
    let engine: 'local' | 'claude' = 'local'
    try {
      if (settings.apiKey) {
        engine = 'claude'
        const { askClaude } = await import('../lib/claudeEngine')
        answer = await askClaude(getMeeting(m.id)!, question, settings.apiKey, settings.model, setStreaming)
      } else {
        await new Promise((r) => setTimeout(r, 450))
        answer = askLocal(getMeeting(m.id)!, question)
      }
    } catch (err) {
      engine = 'local'
      answer = askLocal(getMeeting(m.id)!, question)
      toast(`Claude unavailable (${(err as Error).message.slice(0, 60)}). Answered on-device.`)
    }
    setStreaming('')
    actions.update(m.id, (x) => ({ chat: [...x.chat, { id: uid(), role: 'assistant', text: answer, engine }] }))
    setBusy(false)
  }

  return (
    <div className="panel-body">
      <div className="chat">
        {!m.chat.length && (
          <div className="panel-empty">
            <p className="display-sm">Ask this meeting</p>
            <p className="muted small">
              Answers come from the transcript and your notes{settings.apiKey ? ', powered by Claude' : ', on-device'}.
            </p>
            <div className="suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggest-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {m.chat.map((c) => (
          <div key={c.id} className={`bubble ${c.role}`}>
            {c.text}
          </div>
        ))}
        {busy && <div className="bubble assistant">{streaming || <span className="typing"><i /><i /><i /></span>}</div>}
        <div ref={end} />
      </div>
      <form
        className="ask-box"
        onSubmit={(e) => {
          e.preventDefault()
          send(q)
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about this meeting…" />
        <button className="send" disabled={!q.trim() || busy} aria-label="Send">
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}
