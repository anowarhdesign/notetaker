export type TemplateId = 'general' | 'one-on-one' | 'standup' | 'sales' | 'interview'

export interface Segment {
  id: string
  /** seconds from the start of the recording */
  t: number
  text: string
  speaker?: string
}

export type Source = 'you' | 'ai'

export interface Bullet {
  text: string
  source: Source
  children?: { text: string; source: Source }[]
}

export interface Block {
  heading: string
  items: Bullet[]
}

export interface ActionItem {
  id: string
  text: string
  owner?: string
  due?: string
  done: boolean
}

export interface Enhanced {
  tldr: string
  topics: string[]
  blocks: Block[]
  actionItems: ActionItem[]
  decisions: string[]
  questions: string[]
  engine: 'local' | 'claude'
  generatedAt: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  engine?: 'local' | 'claude'
}

export interface Meeting {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  durationSec: number
  attendees: string[]
  template: TemplateId
  notes: string
  transcript: Segment[]
  enhanced?: Enhanced
  chat: ChatMessage[]
  emoji?: string
}

export interface Settings {
  apiKey: string
  model: string
  lang: string
  theme: 'system' | 'light' | 'dark'
}
