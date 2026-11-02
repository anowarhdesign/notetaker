import { Eye, EyeOff, Laptop, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { MODELS } from '../lib/models'
import { speechSupported } from '../lib/recorder'
import { actions, setSettings, useSettings } from '../store'
import type { Settings } from '../types'
import { toast } from './Toast'

const LANGS = [
  ['en-US', 'English (US)'],
  ['en-GB', 'English (UK)'],
  ['bn-BD', 'বাংলা (Bangla)'],
  ['hi-IN', 'हिन्दी (Hindi)'],
  ['es-ES', 'Español'],
  ['fr-FR', 'Français'],
  ['de-DE', 'Deutsch'],
  ['pt-BR', 'Português (BR)'],
  ['ja-JP', '日本語'],
  ['ar-SA', 'العربية'],
]

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const [key, setKey] = useState(s.apiKey)
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)

  const saveKey = async () => {
    const k = key.trim()
    if (!k) {
      setSettings({ apiKey: '' })
      toast('Claude disconnected — using the on-device engine.')
      return
    }
    setTesting(true)
    try {
      const { testKey } = await import('../lib/claudeEngine')
      await testKey(k, s.model)
      setSettings({ apiKey: k })
      toast('Claude connected ✦')
    } catch (e) {
      toast(`Couldn’t connect: ${(e as Error).message.slice(0, 80)}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-label="Settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="display-sm">Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <section className="field">
          <div className="field-label">Appearance</div>
          <div className="seg wide">
            {(
              [
                ['system', 'System', <Laptop size={14} key="l" />],
                ['light', 'Light', <Sun size={14} key="s" />],
                ['dark', 'Dark', <Moon size={14} key="m" />],
              ] as const
            ).map(([v, label, icon]) => (
              <button key={v} className={s.theme === v ? 'on' : ''} onClick={() => setSettings({ theme: v as Settings['theme'] })}>
                {icon} {label}
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <div className="field-label">Transcription language</div>
          <select className="input" value={s.lang} onChange={(e) => setSettings({ lang: e.target.value })}>
            {!LANGS.some(([v]) => v === s.lang) && <option value={s.lang}>{s.lang}</option>}
            {LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <p className="help">
            {speechSupported
              ? 'Uses your browser’s built-in speech recognition. Audio is never stored by Murmur.'
              : 'This browser has no speech recognition. Use Chrome, Edge or Safari for live transcripts.'}
          </p>
        </section>

        <section className="field">
          <div className="field-label">
            AI engine <span className={`engine-dot ${s.apiKey ? 'on' : ''}`} /> {s.apiKey ? 'Claude' : 'On-device'}
          </div>
          <p className="help">
            Murmur works fully offline with its on-device summariser. Add an Anthropic API key for richer, abstractive
            summaries and conversational answers from Claude.
          </p>
          <div className="key-row">
            <input
              className="input mono"
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              aria-label="Anthropic API key"
            />
            <button className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide key' : 'Show key'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="btn btn-primary" onClick={saveKey} disabled={testing}>
              {testing ? 'Testing…' : key.trim() ? 'Save' : 'Disconnect'}
            </button>
          </div>
          <select className="input" value={s.model} onChange={(e) => setSettings({ model: e.target.value })} aria-label="Claude model">
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="help privacy">
            <ShieldCheck size={13} /> Your key is stored only in this browser and sent only to api.anthropic.com.
          </p>
        </section>

        <section className="field">
          <div className="field-label">Data</div>
          <p className="help">Everything lives in this browser’s local storage.</p>
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              if (confirm('Replace all notes with the sample notes? This cannot be undone.')) {
                actions.resetAll()
                location.hash = '#/'
                onClose()
              }
            }}
          >
            Reset to sample notes
          </button>
        </section>
      </div>
    </div>
  )
}
