import { Menu } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { FollowUpsPage } from './components/FollowUpsPage'
import { Home } from './components/Home'
import { Logo } from './components/Logo'
import { NoteView } from './components/NoteView'
import { NotesPage } from './components/NotesPage'
import { SettingsModal } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { Toaster } from './components/Toast'
import { startSession } from './lib/recorder'
import { actions, setSettings, useSettings } from './store'
import type { TemplateId } from './types'

export type Route = { view: 'home' } | { view: 'notes' } | { view: 'follow-ups' } | { view: 'note'; id: string }

const parse = (): Route => {
  const m = location.hash.match(/^#\/n\/([\w-]+)/)
  if (m) return { view: 'note', id: m[1]! }
  if (location.hash.startsWith('#/notes')) return { view: 'notes' }
  if (location.hash.startsWith('#/follow-ups')) return { view: 'follow-ups' }
  return { view: 'home' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(parse)
  const [palette, setPalette] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nav, setNav] = useState(false)
  const settings = useSettings()

  useEffect(() => {
    const on = () => {
      setRoute(parse())
      setNav(false)
      document.querySelector('.main')?.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // theme
  useEffect(() => {
    const root = document.documentElement
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121418' : '#e9e5da')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  const go = useCallback((h: string) => {
    if (location.hash === h) setRoute(parse())
    else location.hash = h
  }, [])

  const newNote = useCallback(
    (template: TemplateId = 'general') => {
      const m = actions.create(template)
      go(`#/n/${m.id}`)
      return m
    },
    [go],
  )

  const startNew = useCallback(
    (template: TemplateId, source: 'mic' | 'demo') => {
      const m = newNote(template)
      if (source === 'demo') actions.update(m.id, { title: 'Discovery call — Northwind', attendees: ['Alex Rivera'], template: 'sales' })
      void startSession(m.id, source)
    },
    [newNote],
  )

  const toggleTheme = useCallback(() => {
    setSettings({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      } else if (mod && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault()
        newNote()
      } else if (e.key === 'Escape') {
        setPalette(false)
        setSettingsOpen(false)
        setNav(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newNote])

  return (
    <div className="app">
      <Sidebar
        route={route}
        open={nav}
        onClose={() => setNav(false)}
        onNew={() => newNote()}
        onSettings={() => setSettingsOpen(true)}
        onPalette={() => setPalette(true)}
        go={go}
      />
      <main className="main">
        {route.view === 'note' ? (
          <NoteView key={route.id} id={route.id} go={go} onMenu={() => setNav(true)} />
        ) : (
          <>
            <div className="mobile-bar only-mobile">
              <button className="icon-btn" onClick={() => setNav(true)} aria-label="Open menu">
                <Menu size={18} />
              </button>
              <Logo size={26} />
            </div>
            {route.view === 'home' && <Home go={go} onStart={startNew} />}
            {route.view === 'notes' && <NotesPage go={go} onNew={() => newNote()} />}
            {route.view === 'follow-ups' && <FollowUpsPage go={go} />}
          </>
        )}
      </main>
      {palette && (
        <CommandPalette
          onClose={() => setPalette(false)}
          go={go}
          onNew={() => newNote()}
          onStart={(s) => startNew('general', s)}
          onSettings={() => setSettingsOpen(true)}
          onTheme={toggleTheme}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <Toaster />
    </div>
  )
}
