/**
 * Murmur's on-device engine: a fast, private, extractive summarizer.
 * No network, no key — it scores transcript sentences against the meeting's
 * own vocabulary and the user's notes, then pattern-matches commitments,
 * decisions and open questions.
 */
import type { ActionItem, Block, Bullet, Enhanced, Meeting, Segment } from '../types'
import { templateById } from './templates'
import { clock, uid } from './util'

const STOP = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further get got gonna had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just know let let's like lot maybe me mean more most mustn't my myself no nor not now of off ok okay on once one only or other ought our ours ourselves out over own pretty probably quite really right same say says shan't she she'd she'll she's should shouldn't so some something such sure than that that's the their theirs them themselves then there there's these they they'd they'll they're they've thing things think this those though through to too um uh under until up us very want was wasn't we we'd we'll we're we've well were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't yeah yes yep you you'd you'll you're you've your yours yourself yourselves also actually basically going go kind sort stuff way need see look make go thanks thank hey hi great good cool awesome guess bit one two three four five six seven eight nine ten eleven twelve fifteen twenty thirty forty fifty hundred dollar dollars`.split(
    /\s+/,
  ),
)

interface Sentence {
  text: string
  t: number
  speaker?: string
  tokens: string[]
  score: number
  used?: boolean
}

const stem = (w: string) => w.replace(/'s$/, '').replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1')

export function tokenize(s: string) {
  return (s.toLowerCase().match(/[a-z0-9'%$]+/g) ?? [])
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem)
}

const FILLER = /^(?:(?:so|and|but|then|okay|ok|yeah|yes|alright|right|um+|uh+|well|like|anyway|honestly|basically|i mean)[,\s]+)+/i

export function tidy(s: string) {
  let t = s.trim().replace(/\s+/g, ' ').replace(FILLER, '')
  if (!t) return ''
  t = t[0]!.toUpperCase() + t.slice(1)
  t = t.replace(/,?\s+then([.!?]?)$/i, '$1')
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}

function splitSentences(segments: Segment[]): Sentence[] {
  const out: Sentence[] = []
  for (const seg of segments) {
    const parts = seg.text.split(/(?<=[.!?])\s+/)
    for (const p of parts) {
      const text = tidy(p)
      if (text.split(' ').length < 4) continue
      out.push({ text, t: seg.t, speaker: seg.speaker, tokens: tokenize(text), score: 0 })
    }
  }
  return out
}

function overlap(a: string[], b: Set<string>) {
  let n = 0
  for (const w of new Set(a)) if (b.has(w)) n++
  return n
}

const DAYS = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|today|next week|next month|end of (?:the )?(?:day|week|month|quarter)|eod|eow|this week|the \\w+ (?:of|st|nd|rd|th))'
const DUE_RE = new RegExp(`\\b(?:by|before|on|until|due|for)?\\s*(${DAYS})\\b`, 'i')
const ACTION_RE =
  /\b(i'll|i will|i can take|i'm going to|i need to|we'll|we will|we need to|we should|let's|let me|action item|follow up|follow-up|to-do|todo|can you|could you|will send|will share|will set up|will draft|is going to|take the action|owns?|next step)\b/i
const ASK_RE = /^([A-Z][a-z]+),?\s+(?:can|could|would) you\b/
const NOT_ACTION = /^(leave|wait|skip|park|move on|get going|go|keep going|wrap|talk|think|see|try to remember)\b/i
const DECISION_RE =
  /\b(we decided|decided to|we agreed|agreed (?:to|that|on)|decision is|we're going with|we are going with|let's go with|going with|we'll go with|final answer|settled on|approved|signed off|locked in|we're doing|the plan is)\b/i

function toAction(s: Sentence): ActionItem | null {
  let text = s.text.replace(/[.!?]+$/, '').replace(/^(yes|sure|okay|ok|great|perfect)[.,!]\s+/i, '')
  let owner: string | undefined
  const ask = text.match(/^([A-Z][a-z]+),?\s+(?:can|could|would) you\s+(.*)$/)
  const will = text.match(/^([A-Z][a-z]+)\s+(?:will|is going to|to|owns?)\s+(.*)$/)
  if (ask) {
    owner = ask[1]
    text = ask[2]!
  } else if (will && !STOP.has(will[1]!.toLowerCase())) {
    owner = will[1]
    text = will[2]!
  } else if (/^(i'll|i will|i can take|i'm going to|i need to|let me)\b/i.test(text)) {
    owner = s.speaker && s.speaker !== 'Room' ? s.speaker : 'You'
    text = text.replace(/^(i'll|i will|i can take|i'm going to|i need to|let me)\s+/i, '')
  } else {
    text = text.replace(/^(we'll|we will|we need to|we should|let's|so let's|action item[:,]?|next step is to|next step[:,]?)\s+/i, '')
    if (/^(can|could) you\s+/i.test(text)) text = text.replace(/^(can|could) you\s+/i, '')
  }
  text = text.replace(/^(also|then|just|probably|definitely)\s+/i, '').trim()
  if (text.split(' ').length < 3 || NOT_ACTION.test(text)) return null
  const due = text.match(DUE_RE)?.[1]
  return {
    id: uid(),
    text: text[0]!.toUpperCase() + text.slice(1),
    owner,
    due: due ? due[0]!.toUpperCase() + due.slice(1) : undefined,
    done: false,
  }
}

function topicsOf(sentences: Sentence[], noteTokens: string[]) {
  const uni = new Map<string, number>()
  const bi = new Map<string, number>()
  for (const s of sentences) {
    s.tokens.forEach((w, i) => {
      uni.set(w, (uni.get(w) ?? 0) + 1)
      const n = s.tokens[i + 1]
      if (n && n !== w) bi.set(`${w} ${n}`, (bi.get(`${w} ${n}`) ?? 0) + 1)
    })
  }
  for (const w of noteTokens) uni.set(w, (uni.get(w) ?? 0) + 2)
  const topics: string[] = []
  ;[...bi.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([k]) => topics.push(k))
  ;[...uni.entries()]
    .filter(([w, c]) => c >= 2 && !/^\d+$/.test(w) && !topics.some((t) => t.split(' ').includes(w)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6 - topics.length)
    .forEach(([k]) => topics.push(k))
  // keep acronyms (CRM, SOC) the way people said them
  const caps = new Set(sentences.flatMap((s) => s.text.match(/\b[A-Z]{2,}\b/g) ?? []).map((w) => w.toLowerCase()))
  const title = (t: string) =>
    t
      .split(' ')
      .map((w) => (caps.has(w) ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
      .join(' ')
  return { topics: topics.map(title), freq: uni }
}

function parseNotes(notes: string) {
  const blocks: { heading: string | null; lines: string[] }[] = [{ heading: null, lines: [] }]
  for (const raw of notes.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const h = line.match(/^#{1,3}\s+(.*)$/)
    if (h) blocks.push({ heading: h[1]!.trim(), lines: [] })
    else blocks[blocks.length - 1]!.lines.push(line.replace(/^[-*•]\s+|^\d+[.)]\s+|^\[\s?[xX]?\]\s+/, ''))
  }
  return blocks.filter((b) => b.lines.length || b.heading)
}

const listJoin = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

export function enhanceLocal(m: Meeting): Enhanced {
  const tpl = templateById(m.template)
  const sentences = splitSentences(m.transcript)
  const noteTokens = tokenize(m.notes)
  const noteSet = new Set(noteTokens)
  const { topics, freq } = topicsOf(sentences, noteTokens)

  sentences.forEach((s, i) => {
    const uniq = new Set(s.tokens)
    let sc = 0
    for (const w of uniq) sc += Math.log(1 + (freq.get(w) ?? 0))
    sc /= Math.sqrt(s.tokens.length + 2)
    if (/\d/.test(s.text)) sc *= 1.25
    sc += overlap(s.tokens, noteSet) * 0.6
    if (i < 3) sc *= 0.9 // openings are usually small talk
    s.score = sc
  })

  // commitments & decisions first so they don't get repeated as discussion points
  const actionItems: ActionItem[] = []
  const decisions: string[] = []
  const questions: string[] = []
  for (const s of sentences) {
    if (DECISION_RE.test(s.text)) {
      decisions.push(s.text.replace(/^(so\s+)?/i, ''))
      s.used = true
    } else if (ASK_RE.test(s.text) || (ACTION_RE.test(s.text) && !/\?$/.test(s.text))) {
      const a = toAction(s)
      if (a) {
        actionItems.push(a)
        s.used = true
      }
    }
  }
  for (const s of sentences) {
    if (!s.used && /\?$/.test(s.text) && s.tokens.length >= 3) questions.push(s.text)
  }

  const pick = (pred: (s: Sentence) => boolean, n: number) => {
    const chosen = sentences
      .filter((s) => !s.used && !/\?$/.test(s.text) && pred(s))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
    chosen.forEach((s) => (s.used = true))
    return chosen.sort((a, b) => a.t - b.t)
  }

  const blocks: Block[] = []

  // 1. The user's own notes, each line expanded with the most relevant thing said
  for (const nb of parseNotes(m.notes)) {
    const items: Bullet[] = nb.lines.map((line) => {
      const lt = tokenize(line)
      const ls = new Set(lt)
      let best: Sentence | undefined
      let bestScore = 0
      for (const s of sentences) {
        if (s.used || s.text.endsWith('?')) continue
        const o = overlap(s.tokens, ls)
        const sc = o + s.score * 0.05
        if (o > 0 && sc > bestScore) {
          best = s
          bestScore = sc
        }
      }
      const bullet: Bullet = { text: line, source: 'you' }
      if (best) {
        best.used = true
        bullet.children = [{ text: best.text, source: 'ai' }]
      }
      return bullet
    })
    blocks.push({ heading: nb.heading ?? 'Your notes', items })
  }

  // 2. Template sections, filled from the transcript
  for (const sec of tpl.sections) {
    const cues = sec.cues.map((c) => c.toLowerCase())
    const chosen = cues.length
      ? pick((s) => s.tokens.length >= 4 && cues.some((c) => s.text.toLowerCase().includes(c)), 3)
      : pick(() => true, 5)
    if (chosen.length) blocks.push({ heading: sec.heading, items: chosen.map((s) => ({ text: s.text, source: 'ai' })) })
  }

  // 3. TL;DR
  let tldr: string
  if (!sentences.length) {
    tldr = m.notes.trim()
      ? 'Notes only — no transcript was captured for this meeting, so Murmur organised what you wrote.'
      : 'Nothing to summarise yet. Start listening or jot a few notes, then enhance.'
  } else {
    const top = [...sentences].sort((a, b) => b.score - a.score)[0]!
    const lead = topics.length ? `A conversation about ${listJoin(topics.slice(0, 3).map((t) => t.replace(/\b(?![A-Z]{2,}\b)\w+/g, (w) => w.toLowerCase())))}.` : ''
    const decided = decisions[0]
      ? ` Key decision: ${decisions[0]
          .replace(/^(?:we\s+|so\s+we\s+)?(?:have\s+)?(?:decided|agreed)\s+(?:to|that|on)\s+/i, '')
          .replace(/[.!?]$/, '')}.`
      : ` ${top.text}`
    const follow = actionItems.length ? ` ${actionItems.length} follow-up${actionItems.length > 1 ? 's' : ''} captured.` : ''
    tldr = `${lead}${decided}${follow}`.trim()
  }

  return {
    tldr,
    topics: sentences.length ? topics : [],
    blocks,
    actionItems: actionItems.slice(0, 8),
    decisions: decisions.slice(0, 6),
    questions: questions.slice(0, 4),
    engine: 'local',
    generatedAt: Date.now(),
  }
}

/** Answer a question about the meeting by retrieving the most relevant moments. */
export function askLocal(m: Meeting, question: string): string {
  const q = question.toLowerCase()
  const e = m.enhanced ?? enhanceLocal(m)
  if (/\b(action|todo|to-do|follow|next step|task)/.test(q)) {
    if (!e.actionItems.length) return "I didn't catch any explicit follow-ups in this meeting."
    return 'Here are the follow-ups I found:\n' + e.actionItems.map((a) => `• ${a.text}${a.owner ? ` — ${a.owner}` : ''}${a.due ? ` (${a.due})` : ''}`).join('\n')
  }
  if (/\b(decid|decision|agree)/.test(q)) {
    if (!e.decisions.length) return 'No firm decisions were stated out loud in this meeting.'
    return 'Decisions made:\n' + e.decisions.map((d) => `• ${d}`).join('\n')
  }
  if (/\b(summar|tl;?dr|recap|overview|what happened|gist)/.test(q)) return e.tldr

  const qt = new Set(tokenize(question))
  const sentences = splitSentences(m.transcript)
  const ranked = sentences
    .map((s) => ({ s, o: overlap(s.tokens, qt) }))
    .filter((x) => x.o > 0)
    .sort((a, b) => b.o - a.o || a.s.t - b.s.t)
    .slice(0, 3)
    .sort((a, b) => a.s.t - b.s.t)
  if (!ranked.length) return "I couldn't find anything about that in the transcript. Try different words, or connect Claude in Settings for deeper answers."
  return 'Here’s what was said:\n' + ranked.map(({ s }) => `• [${clock(s.t)}] ${s.speaker ? s.speaker + ': ' : ''}${s.text}`).join('\n')
}
