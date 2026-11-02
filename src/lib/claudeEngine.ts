/**
 * Optional Claude engine. The key the user pastes in Settings stays in their
 * browser (localStorage) and is sent only to api.anthropic.com.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { Enhanced, Meeting } from '../types'
import { templateById } from './templates'
import { clock, uid } from './util'

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

function transcriptText(m: Meeting) {
  return m.transcript.map((s) => `[${clock(s.t)}] ${s.speaker ? s.speaker + ': ' : ''}${s.text}`).join('\n')
}

function context(m: Meeting) {
  return [
    `Meeting title: ${m.title || 'Untitled'}`,
    `Date: ${new Date(m.createdAt).toDateString()}`,
    m.attendees.length ? `Attendees: ${m.attendees.join(', ')}` : '',
    `<user_notes>\n${m.notes.trim() || '(none)'}\n</user_notes>`,
    `<transcript>\n${transcriptText(m) || '(no transcript)'}\n</transcript>`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Request params shared by every call: Opus/Sonnet 5.5 get server-side refusal fallbacks. */
function base(model: string) {
  const fallback = model === 'claude-haiku-5-5' ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
  return { model, max_tokens: 16000, output_config: { effort: 'medium' }, ...fallback }
}

export async function enhanceClaude(m: Meeting, apiKey: string, model: string): Promise<Enhanced> {
  const tpl = templateById(m.template)
  const system = `You are Murmur, an expert meeting note-taker. You turn a user's rough notes plus a raw transcript into crisp, scannable meeting notes.
Rules:
- The user's own notes are the backbone. Keep every line the user wrote (lightly cleaned up) as a bullet with "source":"you", grouped under the user's own headings when they used "#" headings, and add short clarifying sub-bullets from the transcript with "source":"ai".
- Then add sections for this template: ${tpl.sections.map((s) => s.heading).join(', ')}. Only include a section if the transcript supports it. Those bullets have "source":"ai".
- Bullets are short (max ~20 words), concrete, and keep names, numbers and dates. No filler.
- Never invent facts not present in the notes or transcript.
Return ONLY a JSON object, no prose and no code fence, with this exact shape:
{"tldr": string (2-3 sentences), "topics": string[] (3-6 short title-case topics), "blocks": [{"heading": string, "items": [{"text": string, "source": "you"|"ai", "children": [{"text": string, "source": "you"|"ai"}]}]}], "actionItems": [{"text": string, "owner": string|null, "due": string|null}], "decisions": string[], "questions": string[] (unresolved questions)}`

  const res = await client(apiKey)
    .beta.messages.stream({
      ...base(model),
      system,
      messages: [{ role: 'user', content: context(m) }],
    } as never)
    .finalMessage()

  if (res.stop_reason === 'refusal') throw new Error('Claude declined to summarise this meeting.')
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  let data: {
    tldr?: string
    topics?: string[]
    blocks?: Enhanced['blocks']
    actionItems?: { text: string; owner?: string | null; due?: string | null }[]
    decisions?: string[]
    questions?: string[]
  }
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Claude returned an unexpected format. Try again.')
  }
  return {
    tldr: data.tldr ?? '',
    topics: data.topics ?? [],
    blocks: (data.blocks ?? []).map((b) => ({
      heading: b.heading,
      items: (b.items ?? []).map((i) => ({
        text: i.text,
        source: i.source === 'you' ? 'you' : 'ai',
        children: i.children?.map((c) => ({ text: c.text, source: c.source === 'you' ? 'you' : 'ai' })),
      })),
    })),
    actionItems: (data.actionItems ?? []).map((a) => ({
      id: uid(),
      text: a.text,
      owner: a.owner ?? undefined,
      due: a.due ?? undefined,
      done: false,
    })),
    decisions: data.decisions ?? [],
    questions: data.questions ?? [],
    engine: 'claude',
    generatedAt: Date.now(),
  }
}

export async function askClaude(
  m: Meeting,
  question: string,
  apiKey: string,
  model: string,
  onDelta: (full: string) => void,
): Promise<string> {
  const history = m.chat.slice(-8).map((c) => ({ role: c.role, content: c.text }))
  const stream = client(apiKey).beta.messages.stream({
    ...base(model),
    system: `You are Murmur, answering questions about one meeting. Ground every answer in the notes and transcript below; quote timestamps like [12:04] when useful. If the answer isn't there, say so. Be concise and use plain text with "•" bullets when listing.\n\n${context(m)}`,
    messages: [...history, { role: 'user', content: question }],
  } as never)
  let full = ''
  stream.on('text', (d: string) => {
    full += d
    onDelta(full)
  })
  const res = await stream.finalMessage()
  if (res.stop_reason === 'refusal') return 'Claude declined to answer that question.'
  return full
}

export async function testKey(apiKey: string, model: string) {
  const res = await client(apiKey).messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
  })
  return res.content.some((b) => b.type === 'text')
}
