import type { Meeting } from '../types'
import { clock, humanDuration } from './util'

export function toMarkdown(m: Meeting, includeTranscript = false) {
  const lines: string[] = [`# ${m.title || 'Untitled meeting'}`, '']
  const meta = [new Date(m.createdAt).toLocaleString(), humanDuration(m.durationSec)]
  if (m.attendees.length) meta.push(m.attendees.join(', '))
  lines.push(`_${meta.join(' · ')}_`, '')
  const e = m.enhanced
  if (e) {
    lines.push('## TL;DR', e.tldr, '')
    for (const b of e.blocks) {
      lines.push(`## ${b.heading}`)
      for (const i of b.items) {
        lines.push(`- ${i.text}`)
        i.children?.forEach((c) => lines.push(`  - ${c.text}`))
      }
      lines.push('')
    }
    if (e.decisions.length) lines.push('## Decisions', ...e.decisions.map((d) => `- ${d}`), '')
    if (e.actionItems.length)
      lines.push(
        '## Action items',
        ...e.actionItems.map((a) => `- [${a.done ? 'x' : ' '}] ${a.text}${a.owner ? ` — **${a.owner}**` : ''}${a.due ? ` _(${a.due})_` : ''}`),
        '',
      )
    if (e.questions.length) lines.push('## Open questions', ...e.questions.map((q) => `- ${q}`), '')
  } else if (m.notes.trim()) {
    lines.push(m.notes.trim(), '')
  }
  if (includeTranscript && m.transcript.length) {
    lines.push('## Transcript', ...m.transcript.map((s) => `**[${clock(s.t)}]${s.speaker ? ' ' + s.speaker : ''}:** ${s.text}`), '')
  }
  lines.push('—', '_Captured with Murmur_')
  return lines.join('\n')
}

export function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const slug = (s: string) =>
  (s || 'meeting')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
