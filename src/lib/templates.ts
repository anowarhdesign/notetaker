import type { TemplateId } from '../types'

export interface TemplateSection {
  heading: string
  /** words that pull a transcript sentence into this section (local engine) */
  cues: string[]
}

export interface Template {
  id: TemplateId
  name: string
  emoji: string
  blurb: string
  sections: TemplateSection[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'general',
    name: 'General meeting',
    emoji: '◐',
    blurb: 'Discussion, key points and next steps',
    sections: [
      { heading: 'Discussion', cues: [] },
      { heading: 'Context & numbers', cues: ['percent', '%', 'revenue', 'budget', 'metric', 'data', 'number', 'users', 'week', 'month', 'quarter', 'q1', 'q2', 'q3', 'q4', 'million', 'thousand'] },
      { heading: 'Risks & concerns', cues: ['risk', 'concern', 'worried', 'blocker', 'blocked', 'issue', 'problem', 'delay', 'tricky', 'hard', 'unclear'] },
    ],
  },
  {
    id: 'one-on-one',
    name: '1:1',
    emoji: '◑',
    blurb: 'Wins, blockers, feedback, growth',
    sections: [
      { heading: 'Wins', cues: ['shipped', 'launched', 'great', 'proud', 'win', 'finished', 'done', 'landed', 'happy'] },
      { heading: 'Blockers', cues: ['blocked', 'blocker', 'stuck', 'waiting', 'slow', 'problem', 'issue', 'hard'] },
      { heading: 'Feedback', cues: ['feedback', 'suggest', 'could', 'better', 'improve', 'noticed', 'think'] },
      { heading: 'Growth', cues: ['career', 'growth', 'learn', 'goal', 'promotion', 'skill', 'mentor', 'role'] },
    ],
  },
  {
    id: 'standup',
    name: 'Standup',
    emoji: '◒',
    blurb: 'Yesterday, today, blockers',
    sections: [
      { heading: 'Yesterday', cues: ['yesterday', 'finished', 'did', 'worked', 'merged', 'shipped', 'closed'] },
      { heading: 'Today', cues: ['today', 'going to', "i'll", 'plan', 'next', 'working on', 'start'] },
      { heading: 'Blockers', cues: ['blocked', 'blocker', 'stuck', 'waiting', 'need help', 'issue', 'depends'] },
    ],
  },
  {
    id: 'sales',
    name: 'Customer call',
    emoji: '◓',
    blurb: 'Context, pain points, objections',
    sections: [
      { heading: 'Customer context', cues: ['team', 'company', 'currently', 'today we', 'using', 'process', 'stack', 'people'] },
      { heading: 'Pain points', cues: ['pain', 'frustrat', 'slow', 'manual', 'hard', 'problem', 'struggle', 'waste', 'annoying'] },
      { heading: 'Objections', cues: ['price', 'cost', 'expensive', 'security', 'concern', 'budget', 'contract', 'legal', 'competitor'] },
    ],
  },
  {
    id: 'interview',
    name: 'Interview',
    emoji: '◔',
    blurb: 'Background, strengths, concerns',
    sections: [
      { heading: 'Background', cues: ['worked', 'years', 'previously', 'role', 'company', 'experience', 'joined', 'led'] },
      { heading: 'Strengths', cues: ['strong', 'great', 'impressive', 'clear', 'built', 'shipped', 'led', 'designed'] },
      { heading: 'Concerns', cues: ['concern', 'unclear', 'gap', 'weak', 'less', 'not sure', 'risk', 'missing'] },
    ],
  },
]

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!
