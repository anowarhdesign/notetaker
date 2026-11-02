/**
 * The recorder: live speech-to-text via the Web Speech API, a mic level
 * analyser for the orb, and a scripted "demo conversation" source for
 * browsers without speech recognition (or for trying Murmur out).
 */
import { useSyncExternalStore } from 'react'
import { actions, getMeeting, getSettings } from '../store'
import { DEMO_LIVE } from './demo'
import { uid } from './util'

type SR = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const SRCtor: (new () => SR) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: new () => SR }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition)
    : undefined

export const speechSupported = !!SRCtor

export type RecState = {
  meetingId: string | null
  status: 'idle' | 'recording' | 'paused'
  source: 'mic' | 'demo'
  /** seconds of this session, excludes pauses */
  elapsed: number
  interim: string
  error: string | null
}

let state: RecState = { meetingId: null, status: 'idle', source: 'mic', elapsed: 0, interim: '', error: null }
const subs = new Set<() => void>()
const set = (p: Partial<RecState>) => {
  state = { ...state, ...p }
  subs.forEach((s) => s())
}
export const useRecorder = () =>
  useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => state,
  )

/* live audio level, read by the orb on every animation frame */
export const level = { value: 0, bins: new Uint8Array(64) }

let rec: SR | null = null
let wantRunning = false
let stream: MediaStream | null = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let raf = 0
let tick: ReturnType<typeof setInterval> | undefined
let demoTimer: ReturnType<typeof setTimeout> | undefined
let demoIndex = 0
let baseOffset = 0 // transcript time offset when resuming a meeting that already has a recording

const now = () => baseOffset + state.elapsed

function pushFinal(text: string, speaker?: string) {
  const t = text.trim()
  if (!t || !state.meetingId) return
  actions.appendSegment(state.meetingId, { id: uid(), t: Math.max(0, now() - 2), text: t, speaker })
}

async function startAudio() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    audioCtx = new AudioContext()
    const src = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.8
    src.connect(analyser)
    const loop = () => {
      if (analyser) {
        analyser.getByteFrequencyData(level.bins)
        let sum = 0
        for (let i = 0; i < level.bins.length; i++) sum += level.bins[i]!
        level.value = Math.min(1, sum / level.bins.length / 90)
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return true
  } catch {
    return false
  }
}

function stopAudio() {
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  audioCtx?.close().catch(() => {})
  stream = null
  audioCtx = null
  analyser = null
  level.value = 0
  level.bins.fill(0)
}

function startRecognition() {
  if (!SRCtor) return
  rec = new SRCtor()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = getSettings().lang
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!
      if (r.isFinal) pushFinal(r[0].transcript)
      else interim += r[0].transcript
    }
    set({ interim })
  }
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wantRunning = false
      set({ error: 'Microphone access was blocked. Allow it in your browser, or try the demo conversation.' })
      stopSession()
    } else if (e.error === 'network') {
      set({ error: 'Speech service unreachable — retrying…' })
    }
  }
  // Chrome ends recognition after silence; keep it alive while recording.
  rec.onend = () => {
    if (wantRunning && state.status === 'recording') {
      try {
        rec?.start()
      } catch {
        /* already started */
      }
    }
  }
  wantRunning = true
  try {
    rec.start()
  } catch {
    /* ignore double start */
  }
}

function stopRecognition() {
  wantRunning = false
  if (state.interim) pushFinal(state.interim)
  rec?.stop()
  rec = null
}

/* ---- demo source: types each line out word by word, like live captions ---- */
function runDemo() {
  if (demoIndex >= DEMO_LIVE.length) {
    set({ interim: '' })
    return
  }
  const [speaker, text] = DEMO_LIVE[demoIndex]!
  const words = text.split(' ')
  let w = 0
  const step = () => {
    if (state.status !== 'recording') return
    w++
    set({ interim: words.slice(0, w).join(' ') })
    level.value = 0.35 + Math.random() * 0.55
    for (let i = 0; i < level.bins.length; i++) level.bins[i] = Math.random() * 200 * (1 - i / level.bins.length)
    if (w < words.length) demoTimer = setTimeout(step, 110 + Math.random() * 90)
    else {
      pushFinal(text, speaker)
      set({ interim: '' })
      level.value = 0.05
      demoIndex++
      demoTimer = setTimeout(runDemo, 900)
    }
  }
  step()
}

function startTick() {
  clearInterval(tick)
  tick = setInterval(() => set({ elapsed: state.elapsed + 1 }), 1000)
}

export async function startSession(meetingId: string, source: 'mic' | 'demo') {
  if (state.status !== 'idle') stopSession()
  const m = getMeeting(meetingId)
  baseOffset = m ? Math.max(m.durationSec, m.transcript.at(-1)?.t ?? 0) : 0
  set({ meetingId, status: 'recording', source, elapsed: 0, interim: '', error: null })
  startTick()
  if (source === 'demo') {
    demoIndex = 0
    runDemo()
    return
  }
  if (!SRCtor) {
    set({ error: 'Live transcription needs Chrome, Edge or Safari. Playing the demo conversation instead.', source: 'demo' })
    demoIndex = 0
    runDemo()
    return
  }
  const audioOk = await startAudio()
  if (!audioOk) {
    clearInterval(tick)
    set({ status: 'idle', meetingId: null, error: 'Microphone access was blocked. Allow it in your browser, or try the demo conversation.' })
    return
  }
  startRecognition()
}

export function pauseSession() {
  if (state.status !== 'recording') return
  clearInterval(tick)
  clearTimeout(demoTimer)
  if (state.source === 'mic') stopRecognition()
  level.value = 0
  set({ status: 'paused', interim: '' })
}

export function resumeSession() {
  if (state.status !== 'paused') return
  set({ status: 'recording' })
  startTick()
  if (state.source === 'demo') runDemo()
  else startRecognition()
}

export function stopSession() {
  clearInterval(tick)
  clearTimeout(demoTimer)
  if (state.source === 'mic') {
    stopRecognition()
    stopAudio()
  }
  const id = state.meetingId
  if (id) actions.update(id, (m) => ({ durationSec: Math.max(m.durationSec, baseOffset + state.elapsed) }))
  level.value = 0
  set({ status: 'idle', meetingId: null, interim: '', elapsed: 0 })
}

export const clearRecError = () => set({ error: null })
