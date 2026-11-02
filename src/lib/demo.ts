import type { Meeting, Segment } from '../types'
import { enhanceLocal } from './localEngine'
import { uid } from './util'

type Line = [speaker: string, text: string]

const toSegments = (lines: Line[], gap = 9): Segment[] =>
  lines.map(([speaker, text], i) => ({ id: uid(), t: 4 + i * gap + (i % 3) * 2, speaker, text }))

const LAUNCH: Line[] = [
  ['Maya', "Okay, let's get going. The goal today is to lock pricing and the launch date for the Teams plan."],
  ['Jonas', 'So the beta numbers are in. We have 1,240 active teams and weekly retention is sitting at 64 percent, which is way above what we expected.'],
  ['Priya', 'The strongest signal is that teams who connect their calendar in the first session retain almost twice as well.'],
  ['Maya', 'That tells me calendar connect should be part of onboarding, not hidden in settings.'],
  ['Jonas', "On pricing, the survey says twelve dollars per seat feels fair, but anything above fifteen and we start losing smaller teams."],
  ['Priya', "I'm a bit worried about the annual discount. If we go to twenty percent off it eats into the margin we need for transcription costs."],
  ['Maya', "Fair. So we decided to launch at twelve dollars per seat with fifteen percent off annual plans."],
  ['Jonas', 'For the launch date, engineering says the billing migration is the risk. It is blocked on the new invoicing provider.'],
  ['Maya', "Then we agreed to target November 18th and keep the 25th as a fallback if billing slips."],
  ['Priya', "I'll draft the onboarding changes for calendar connect by Friday."],
  ['Maya', 'Jonas, can you confirm the invoicing provider timeline with their account team this week?'],
  ['Jonas', 'Yes. I will also share the retention dashboard with the whole team tomorrow.'],
  ['Priya', 'One open thing: do we grandfather beta teams at the old free tier, or move them to a trial?'],
  ['Maya', "Let's leave that for Thursday. We need input from support on how many teams would be affected."],
  ['Maya', "I'll write the launch announcement and send a first draft to everyone by next week."],
]

const CRITIQUE: Line[] = [
  ['Lena', 'Thanks everyone. We are reviewing the new empty states and the recording dock today.'],
  ['Sam', 'The recording dock feels much calmer now. Moving the timer next to the orb made it easier to glance at during a call.'],
  ['Lena', 'I noticed the stop button is too close to pause. Two people in testing ended a meeting by accident.'],
  ['Sam', "Good catch. We're going with a long press for stop, plus an undo toast for five seconds."],
  ['Ravi', 'The empty state copy is strong but the illustration competes with the primary button.'],
  ['Lena', 'Could we try a quieter illustration in a single tone and make the button the hero?'],
  ['Ravi', "Yes, I'll explore two directions for the illustration by Wednesday."],
  ['Sam', 'Contrast on the muted text is failing in dark mode, it is around 3.8 to 1.'],
  ['Lena', 'We need to fix that before launch, accessibility is non negotiable.'],
  ['Sam', "I'll update the tokens and run the contrast audit tomorrow."],
  ['Ravi', 'Should the transcript panel open automatically when recording starts?'],
]

export const DEMO_LIVE: Line[] = [
  ['You', 'Thanks for making time today. I would love to understand how your team runs customer calls right now.'],
  ['Alex', 'Sure. We are about forty account managers and every call ends with someone rewriting notes into the CRM by hand.'],
  ['Alex', 'Honestly the manual note taking is the biggest pain. People spend maybe thirty minutes a day on it.'],
  ['You', 'What happens to those notes after they go into the CRM?'],
  ['Alex', 'Mostly nothing. Managers never read them because they are inconsistent and way too long.'],
  ['Alex', 'Our main concern with tools like this is security. Legal will need a SOC 2 report before any pilot.'],
  ['You', 'That makes sense. We can share the SOC 2 report and our data retention policy.'],
  ['Alex', 'Price matters too. We looked at a competitor and it was too expensive for the whole team.'],
  ['You', "We agreed to start with a pilot for ten account managers over four weeks then."],
  ['You', "I'll send the security documents and a pilot proposal by Thursday."],
  ['Alex', 'Great. I will loop in our head of sales operations for the next call.'],
  ['You', 'Perfect. Can we put a follow-up on the calendar for next week to review pilot success metrics?'],
]

function seedMeeting(partial: Partial<Meeting> & { lines: Line[]; daysAgo: number; hour: number }): Meeting {
  const d = new Date()
  d.setDate(d.getDate() - partial.daysAgo)
  d.setHours(partial.hour, 0, 0, 0)
  const transcript = toSegments(partial.lines)
  const m: Meeting = {
    id: uid(),
    title: partial.title ?? 'Untitled',
    createdAt: d.getTime(),
    updatedAt: d.getTime(),
    durationSec: transcript[transcript.length - 1]!.t + 40,
    attendees: partial.attendees ?? [],
    template: partial.template ?? 'general',
    notes: partial.notes ?? '',
    transcript,
    chat: [],
    emoji: partial.emoji,
  }
  m.enhanced = enhanceLocal(m)
  return m
}

export function seedMeetings(): Meeting[] {
  return [
    seedMeeting({
      title: 'Teams plan — pricing & launch',
      daysAgo: 1,
      hour: 10,
      attendees: ['Maya Chen', 'Jonas Weber', 'Priya Nair'],
      notes: '# Beta results\n- retention 64%\n- calendar connect matters\n\n# Pricing\n- $12 seat?\n- annual discount margin',
      lines: LAUNCH,
      emoji: '◐',
    }),
    seedMeeting({
      title: 'Design critique — recording dock',
      daysAgo: 3,
      hour: 15,
      template: 'general',
      attendees: ['Lena Park', 'Sam Okafor', 'Ravi Shah'],
      notes: '- stop vs pause too close\n- empty state illustration\n- dark mode contrast',
      lines: CRITIQUE,
      emoji: '◑',
    }),
  ]
}
