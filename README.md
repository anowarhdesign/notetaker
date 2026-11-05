# Murmur — notes that listen

**Live:** https://murmur-notetaker.vercel.app

An AI meeting notepad. Jot the few things that matter while Murmur transcribes the room; when the meeting ends, one click weaves your notes and the conversation into a crisp summary with decisions, follow-ups and open questions.

## Features

- **Live transcription** in the browser (Web Speech API — Chrome, Edge, Safari), with an audio-reactive waveform, pause/resume, and 10+ languages.
- **Your notes stay the backbone.** Enhanced notes keep every line you wrote (in ink) and expand it with what was actually said (in graphite), Granola-style.
- **Two engines.** A private on-device summariser works offline with no key. Add an Anthropic API key in Settings to use Claude (Opus 5.5, Sonnet 5.5 or Haiku 5.5) for abstractive summaries and answers.
- **Templates** — General, 1:1, Standup, Customer call, Interview — shape the sections.
- **Ask the meeting** — chat with the transcript ("what did we decide?", "any risks?").
- **Follow-ups dashboard** across all meetings, with check-off state.
- **Command palette** (`Ctrl/⌘ K`), shortcuts (`Ctrl/⌘ N` new, `Ctrl/⌘ E` enhance, `Ctrl/⌘ J` transcript), light/dark themes, responsive down to phones.
- **Export** to Markdown (copy or download, optionally with transcript). Paste in transcripts from other tools.
- **Demo call** mode to try the full flow without a microphone.

Everything is stored in your browser's local storage. The API key is only sent to `api.anthropic.com`.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build   # outputs dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Enable it once under **Settings → Pages → Source: GitHub Actions**.

Built with React 19, TypeScript, Vite and the Anthropic TypeScript SDK.
