import React, { useEffect, useMemo, useRef, useState } from 'react'

// Minimal inline SVG icon set for buttons
function Icon({ name, size = 18 }: { name: 'settings' | 'play' | 'pause' | 'next' | 'prev' | 'reset' | 'sun' | 'dumbbell' | 'moon' | 'snowflake'; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'settings':
      // Use a simple sliders icon for crisp rendering at small sizes
      return (
        <svg {...common}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'play':
      return (
        <svg {...common}>
          <polygon points="8,6 8,18 18,12" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'pause':
      return (
        <svg {...common}>
          <rect x="7" y="5" width="4" height="14" fill="currentColor" stroke="none" />
          <rect x="13" y="5" width="4" height="14" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'next':
      return (
        <svg {...common}>
          <polygon points="6,6 6,18 14,12" fill="currentColor" stroke="none" />
          <rect x="16" y="6" width="2" height="12" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'prev':
      return (
        <svg {...common}>
          <polygon points="18,6 18,18 10,12" fill="currentColor" stroke="none" />
          <rect x="6" y="6" width="2" height="12" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'reset':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-3.2-6.9" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.2" y1="4.2" x2="6.4" y2="6.4" />
          <line x1="17.6" y1="17.6" x2="19.8" y2="19.8" />
          <line x1="4.2" y1="19.8" x2="6.4" y2="17.6" />
          <line x1="17.6" y1="6.4" x2="19.8" y2="4.2" />
        </svg>
      )
    case 'dumbbell':
      return (
        <svg {...common}>
          <rect x="3" y="9" width="3" height="6" />
          <rect x="18" y="9" width="3" height="6" />
          <rect x="7" y="11" width="10" height="2" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a6.5 6.5 0 0 0 9.5 9.5Z" />
        </svg>
      )
    case 'snowflake':
      return (
        <svg {...common}>
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
          <line x1="19.5" y1="4.5" x2="4.5" y2="19.5" />
        </svg>
      )
  }
}

type Phase = 'idle' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'done'

type Settings = {
  warmupSec: number
  workSec: number
  restSec: number
  intervals: number
  cooldownSec: number
  sound: 'none' | 'beep' | 'chime' | 'click' | 'wood' | 'triple'
  vibrate: boolean
}

const defaultSettings: Settings = {
  warmupSec: 60,
  workSec: 40,
  restSec: 20,
  intervals: 8,
  cooldownSec: 60,
  sound: 'beep',
  vibrate: true,
}

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    // Defer storage write to idle time to avoid blocking click handlers
    const w = window as any
    const write = () => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(write, { timeout: 500 })
      return () => { try { w.cancelIdleCallback?.(id) } catch {} }
    } else {
      const id = setTimeout(write, 0)
      return () => clearTimeout(id)
    }
  }, [key, value])
  return [value, setValue] as const
}

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function useBeep(preset: Settings['sound'], enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const ensure = () => {
    if (!enabled) return null
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctxRef.current
  }
  const playTone = (sel: Settings['sound'], type: 'short' | 'long' = 'short') => {
    if (!enabled) return
    const ctx = ensure(); if (!ctx) return
    const now = ctx.currentTime
    const playOsc = (freq: number, waveform: OscillatorType, dur: number, gainPeak = 0.2, attack = 0.02, release = 0.08) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = waveform
      o.frequency.value = freq
      g.gain.value = 0.0001
      o.connect(g).connect(ctx.destination)
      const startAt = now
      const peakAt = startAt + Math.max(0.005, attack)
      const endAt = startAt + Math.max(0.02, dur)
      const releaseStart = Math.max(peakAt + 0.005, endAt - Math.max(0.01, release))
      g.gain.exponentialRampToValueAtTime(gainPeak, peakAt)
      g.gain.exponentialRampToValueAtTime(0.00001, releaseStart)
      o.start(startAt)
      o.stop(endAt)
    }
    const playNoiseClick = (dur = 0.04) => {
      const bufferSize = Math.floor(ctx.sampleRate * dur)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      const src = ctx.createBufferSource()
      const g = ctx.createGain()
      g.gain.value = 0.3
      src.buffer = buffer
      src.connect(g).connect(ctx.destination)
      src.start(now)
      src.stop(now + dur)
    }
    const shortDur = 0.12
    const longDur = 0.5
    const dur = type === 'short' ? shortDur : longDur
    switch (sel) {
      case 'beep':
        playOsc(type === 'short' ? 880 : 440, 'sine', dur)
        break
      case 'chime':
        playOsc(type === 'short' ? 660 : 523.25, 'triangle', dur, 0.25)
        setTimeout(() => playOsc(type === 'short' ? 1320 : 784, 'sine', Math.max(0.08, dur - 0.06), 0.12), 10)
        break
      case 'click':
        playNoiseClick(0.03)
        break
      case 'wood':
        playOsc(type === 'short' ? 220 : 196, 'sine', Math.min(0.18, dur), 0.3)
        break
      case 'triple': {
        const seq = [0, 140, 280]
        seq.forEach((ms) => { setTimeout(() => playOsc(880, 'sine', 0.07, 0.2), ms) })
        break
      }
      case 'none':
      default:
        break
    }
  }
  return {
    beep: (type: 'short' | 'long' = 'short') => playTone(preset, type),
    preview: (sel: Settings['sound'], type: 'short' | 'long' = 'short') => playTone(sel, type),
  }
}

function requestVibrate(ms: number) {
  if (navigator.vibrate) navigator.vibrate(ms)
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    let wakeLock: any
    let released = false
    async function acquire() {
      try {
        // @ts-ignore
        wakeLock = await (navigator as any).wakeLock?.request?.('screen')
        wakeLock?.addEventListener?.('release', () => { released = true })
      } catch {}
    }
    if (active) acquire()
    const onVis = () => {
      if (active && document.visibilityState === 'visible' && (wakeLock == null || released)) acquire()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); try { wakeLock?.release?.() } catch {} }
  }, [active])
}

type Running = {
  phase: Phase
  intervalIndex: number // 0-based for current work/rest interval
  remaining: number // seconds
  totalForPhase: number
  startedAtMs: number
  targetEndMs: number
}

export default function App() {
  const [settings, setSettings] = useLocalStorage<Settings>('settings', defaultSettings)
  const [running, setRunning] = useState<Running | null>(null)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [showSettings, setShowSettings] = useLocalStorage<boolean>('ui.showSettings', true)
  const sysLang = (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'
  const [lang, setLang] = useLocalStorage<'en' | 'es'>('ui.lang', sysLang)
  const [theme, setTheme] = useLocalStorage<'system' | 'light' | 'dark'>('ui.theme', 'system')

  // Use beeps always on; select preset per phase below
  const { beep, preview } = useBeep('beep', true)

  // Play user-provided phase audios from public/ over beeps
  function usePhaseAudio() {
    const cacheRef = useRef<Record<Phase | 'done', HTMLAudioElement | undefined>>({
      idle: undefined,
      warmup: undefined,
      work: undefined,
      rest: undefined,
      cooldown: undefined,
      done: undefined,
    })
    useEffect(() => {
      const base = (import.meta as any).env.BASE_URL || '/'
      const sources: Partial<Record<Phase | 'done', string>> = {
        warmup: 'calentamiento.mp3',
        work: 'intenso.mp3',
        rest: 'relajado.mp3',
        cooldown: 'enfriamiento.mp3',
        done: 'final.mp3',
      }
      Object.entries(sources).forEach(([key, file]) => {
        try {
          const audio = new Audio(base + file)
          audio.preload = 'auto'
          cacheRef.current[key as keyof typeof cacheRef.current] = audio
        } catch {}
      })
    }, [])
    const play = (phase: Phase | 'done') => {
      const a = cacheRef.current[phase]
      if (!a) return
      try { a.currentTime = 0 } catch {}
      a.play()?.catch?.(() => {})
    }
    return { play }
  }
  const phaseAudio = usePhaseAudio()
  useWakeLock(!!running && !paused)

  // Apply theme class to <html>
  useEffect(() => {
    const el = document.documentElement
    el.classList.remove('theme-light', 'theme-dark')
    if (theme === 'light') el.classList.add('theme-light')
    else if (theme === 'dark') el.classList.add('theme-dark')
    // system: no class, CSS media handles it
  }, [theme])

  // Update meta theme-color to match current theme background
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!meta) return
    const apply = () => {
      const color = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#0f172a'
      meta.content = color
    }
    apply()
    // Listen to system scheme changes if theme is system
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (theme === 'system') apply() }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [theme])

  // Highly accurate tick based on target end time
  useEffect(() => {
    if (!running || paused) return
    let raf = 0
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, paused])

  const progress = useMemo(() => {
    if (!running) return 0
    const elapsed = Math.max(0, (now - running.startedAtMs) / 1000)
    const p = Math.min(1, elapsed / running.totalForPhase)
    return p
  }, [now, running])

  // Derive remaining from targetEnd for accuracy
  const remaining = running ? Math.max(0, Math.ceil((running.targetEndMs - now) / 1000)) : 0

  useEffect(() => {
    if (!running || paused) return
    if (remaining <= 0 && running.phase !== 'done') nextPhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, paused, running?.phase, running?.intervalIndex])

  function nextPhase() {
    setRunning(prev => {
      if (!prev) return prev
      if (prev.phase === 'done') return prev
      const next = computeNext(prev, settings)
      if (next.phase !== prev.phase) notifyPhase(next.phase)
      return next
    })
  }

  function notifyPhase(phase: Phase) {
    if (settings.vibrate) requestVibrate(phase === 'rest' ? 150 : 300)
    // Choose different beep style per phase
    switch (phase) {
      case 'warmup':
        preview('chime', 'short')
        phaseAudio.play('warmup')
        break
      case 'work':
        preview('triple', 'long')
        phaseAudio.play('work')
        break
      case 'rest':
        preview('click', 'short')
        phaseAudio.play('rest')
        break
      case 'cooldown':
        preview('wood', 'short')
        phaseAudio.play('cooldown')
        break
      case 'done':
        // Play final audio at the end of the routine
        phaseAudio.play('done')
        break
      default:
        break
    }
  }

  function start() {
    const first = firstPhase(settings)
    notifyPhase(first.phase)
    setRunning(first)
    setPaused(false)
  }

  function pauseResume() {
    if (!running) return
    if (!paused) {
      // Pause: freeze remaining
      setPaused(true)
      const rem = Math.max(0, Math.ceil((running.targetEndMs - Date.now()) / 1000))
      setRunning(r => r ? ({ ...r, remaining: rem }) : r)
    } else {
      // Resume: recompute target from remaining
      const newTarget = Date.now() + (running.remaining * 1000)
      setRunning(r => r ? ({ ...r, startedAtMs: Date.now(), targetEndMs: newTarget, totalForPhase: r.remaining }) : r)
      setPaused(false)
    }
  }

  function reset() {
    setRunning(null)
    setPaused(false)
  }

  function skip() {
    if (!running) return
    nextPhase()
  }

  function back() {
    if (!running) return
    setRunning(prev => prev ? computePrev(prev, settings) : prev)
  }

  const phaseClass = running?.phase ?? 'idle'
  const t = (k: keyof typeof messages['en']) => messages[lang][k]
  const phaseLabelMap: Record<Phase, string> = {
    idle: t('ready'),
    warmup: t('warmup'),
    work: t('work'),
    rest: t('rest'),
    cooldown: t('cooldown'),
    done: t('done'),
  }
  const showPhase = running ? phaseLabelMap[running.phase] : t('ready')
  const shownTime = running ? fmt(remaining) : fmt(totalDuration(settings))
  const intervalsInfo = running && running.phase !== 'idle' && running.phase !== 'warmup' && running.phase !== 'cooldown' && running.phase !== 'done'
    ? `${running.intervalIndex + 1}/${settings.intervals}`
    : ''

  return (
    <div className="container">
      <div className="header">
        <div className="title">{t('appTitle')}</div>
        <div className="row" style={{ gap: 8 }}>
          <button
            onClick={() => setShowSettings(s => !s)}
            aria-label={showSettings ? t('hideSettings') : t('showSettings')}
            title={showSettings ? t('hideSettings') : t('showSettings')}
          >
            <Icon name="settings" />
          </button>
        </div>
      </div>

      <div className="grid cols">
        <div className="card">
          <div className={`timer phase ${phaseClass}`}>
            <div className="phase">{showPhase} {intervalsInfo && <span>• {intervalsInfo}</span>}</div>
            <div className="stage-icon" aria-hidden>
              {running?.phase === 'warmup' && <img src={`${import.meta.env.BASE_URL}calentamiento.png`} alt="" />}
              {running?.phase === 'work' && <img src={`${import.meta.env.BASE_URL}intenso.png`} alt="" />}
              {running?.phase === 'rest' && <img src={`${import.meta.env.BASE_URL}relajado.png`} alt="" />}
              {running?.phase === 'cooldown' && <img src={`${import.meta.env.BASE_URL}enfriamiento.png`} alt="" />}
            </div>
            <div className="time">{shownTime}</div>
            <div className="progress" aria-hidden>
              <div className="bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              {!running && (
                <button className="primary" onClick={start} aria-label={t('start')} title={t('start')}>
                  <Icon name="play" />
                </button>
              )}
              {running && (
                <button className="primary" onClick={pauseResume} aria-label={paused ? t('resume') : t('pause')} title={paused ? t('resume') : t('pause')}>
                  {paused ? <Icon name="play" /> : <Icon name="pause" />}
                </button>
              )}
              {running && (
                <button className="warn" onClick={skip} aria-label={t('next')} title={t('next')}>
                  <Icon name="next" />
                </button>
              )}
              {running && (
                <button onClick={back} aria-label={t('previous')} title={t('previous')}>
                  <Icon name="prev" />
                </button>
              )}
              <button className="danger" onClick={reset} disabled={!running} aria-label={t('reset')} title={t('reset')}>
                <Icon name="reset" />
              </button>
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>{t('totalEstimated')}: {fmt(totalDuration(settings))}</div>
          </div>
        </div>

        {showSettings && (
        <div className="card settings-panel" role="dialog" aria-modal="true">
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="pill" onClick={() => setShowSettings(false)} aria-label={t('hideSettings')} title={t('hideSettings')}>×</button>
          </div>
          <Section title={t('settings')} subtitle={t('settingsSubtitle')} />
          <div className="grid cols">
            <TimeInput label={t('warmup')} value={settings.warmupSec} onChange={v => setSettings(s => ({ ...s, warmupSec: v }))} />
            <NumberInput label={t('intervals')} min={1} max={50} value={settings.intervals} onChange={v => setSettings(s => ({ ...s, intervals: v }))} />
            <TimeInput label={t('work')} value={settings.workSec} onChange={v => setSettings(s => ({ ...s, workSec: v }))} />
            <TimeInput label={t('rest')} value={settings.restSec} onChange={v => setSettings(s => ({ ...s, restSec: v }))} />
            <TimeInput label={t('cooldown')} value={settings.cooldownSec} onChange={v => setSettings(s => ({ ...s, cooldownSec: v }))} />
          </div>

          <div className="grid" style={{ marginTop: 8 }}>
            <div className="row">
              <label style={{ width: 140 }}>{t('vibration')}</label>
              <select value={settings.vibrate ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, vibrate: e.target.value === 'on' }))}>
                <option value="on">{t('on')}</option>
                <option value="off">{t('off')}</option>
              </select>
            </div>
            <div className="row">
              <label style={{ width: 140 }}>{t('theme')}</label>
              <select value={theme} onChange={e => setTheme(e.target.value as 'system' | 'light' | 'dark')}>
                <option value="system">{t('themeSystem')}</option>
                <option value="light">{t('themeLight')}</option>
                <option value="dark">{t('themeDark')}</option>
              </select>
            </div>
            {/* Idioma: oculto por ahora */}
          </div>
        </div>
        )}
      </div>

      {/* Congrats overlay when done */}
      {running?.phase === 'done' && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Rutina completada">
          <div className="card">
            <div className="hero">
              <img src={`${import.meta.env.BASE_URL}relajado.png`} alt="" />
              <h2 style={{ margin: '12px 0 4px' }}>{t('done')}</h2>
              <div className="subtle">{t('ready')}</div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="danger" onClick={reset}>{t('reset')}</button>
                <button className="primary" onClick={start}>{t('start')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="subtle" style={{ marginTop: 12 }}>
        {t('tipInstall')}
      </div>
    </div>
  )
}

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {subtitle && <div className="subtle">{subtitle}</div>}
    </div>
  )
}

function secondsFrom(minStr: string, secStr: string) {
  const m = Math.max(0, Number(minStr) || 0)
  const s = Math.max(0, Number(secStr) || 0)
  return Math.min(359_999, Math.round(m) * 60 + Math.round(s))
}

function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (sec: number) => void }) {
  const m = Math.floor(value / 60).toString()
  const s = (value % 60).toString()
  const [mm, setMm] = useState(m)
  const [ss, setSs] = useState(s)
  useEffect(() => { setMm(Math.floor(value / 60).toString()); setSs((value % 60).toString()) }, [value])
  useEffect(() => { onChange(secondsFrom(mm, ss)) }, [mm, ss])
  return (
    <div>
      <label>{label}</label>
      <div className="row">
        <input inputMode="numeric" pattern="[0-9]*" value={mm} onChange={e => setMm(e.target.value)} aria-label={`${label} min`} />
        <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>min</span>
        <input inputMode="numeric" pattern="[0-9]*" value={ss} onChange={e => setSs(e.target.value)} aria-label={`${label} sec`} />
        <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>sec</span>
      </div>
    </div>
  )
}

function NumberInput({ label, value, onChange, min = 1, max = 100 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))} />
    </div>
  )
}

function totalDuration(s: Settings) {
  const intervals = s.intervals > 0 ? (s.workSec + (s.restSec > 0 ? s.restSec : 0)) * s.intervals : 0
  return (s.warmupSec > 0 ? s.warmupSec : 0) + intervals + (s.cooldownSec > 0 ? s.cooldownSec : 0)
}

function firstPhase(s: Settings): Running {
  const now = Date.now()
  if (s.warmupSec > 0) return { phase: 'warmup', intervalIndex: 0, remaining: s.warmupSec, totalForPhase: s.warmupSec, startedAtMs: now, targetEndMs: now + s.warmupSec * 1000 }
  if (s.intervals > 0 && s.workSec > 0) return { phase: 'work', intervalIndex: 0, remaining: s.workSec, totalForPhase: s.workSec, startedAtMs: now, targetEndMs: now + s.workSec * 1000 }
  if (s.cooldownSec > 0) return { phase: 'cooldown', intervalIndex: 0, remaining: s.cooldownSec, totalForPhase: s.cooldownSec, startedAtMs: now, targetEndMs: now + s.cooldownSec * 1000 }
  return { phase: 'done', intervalIndex: 0, remaining: 0, totalForPhase: 0, startedAtMs: now, targetEndMs: now }
}

function computeNext(prev: Running, s: Settings): Running {
  const now = Date.now()
  const mk = (phase: Phase, secs: number, intervalIndex = prev.intervalIndex): Running => ({ phase, intervalIndex, remaining: secs, totalForPhase: secs, startedAtMs: now, targetEndMs: now + secs * 1000 })
  switch (prev.phase) {
    case 'warmup':
      if (s.intervals > 0 && s.workSec > 0) return mk('work', s.workSec, 0)
      if (s.cooldownSec > 0) return mk('cooldown', s.cooldownSec)
      return mk('done', 0)
    case 'work': {
      if (s.restSec > 0) return mk('rest', s.restSec, prev.intervalIndex)
      const nextIndex = prev.intervalIndex + 1
      if (nextIndex < s.intervals) return mk('work', s.workSec, nextIndex)
      if (s.cooldownSec > 0) return mk('cooldown', s.cooldownSec)
      return mk('done', 0)
    }
    case 'rest': {
      const nextIndex = prev.intervalIndex + 1
      if (nextIndex < s.intervals) return mk('work', s.workSec, nextIndex)
      if (s.cooldownSec > 0) return mk('cooldown', s.cooldownSec)
      return mk('done', 0)
    }
    case 'cooldown':
      return mk('done', 0)
    case 'done':
      return mk('done', 0)
    case 'idle':
    default:
      return firstPhase(s)
  }
}

function computePrev(prev: Running, s: Settings): Running {
  const now = Date.now()
  const mk = (phase: Phase, secs: number, intervalIndex = prev.intervalIndex): Running => ({ phase, intervalIndex, remaining: secs, totalForPhase: secs, startedAtMs: now, targetEndMs: now + secs * 1000 })
  switch (prev.phase) {
    case 'work': {
      if (prev.intervalIndex === 0) {
        if (s.warmupSec > 0) return mk('warmup', s.warmupSec, 0)
        return mk('work', s.workSec, 0)
      }
      // Go to previous rest if restSec>0 else previous work
      if (s.restSec > 0) return mk('rest', s.restSec, prev.intervalIndex - 1)
      return mk('work', s.workSec, prev.intervalIndex - 1)
    }
    case 'rest':
      return mk('work', s.workSec, prev.intervalIndex)
    case 'cooldown': {
      if (s.intervals > 0 && s.workSec > 0) return mk('work', s.workSec, Math.max(0, s.intervals - 1))
      if (s.warmupSec > 0) return mk('warmup', s.warmupSec, 0)
      return mk('cooldown', s.cooldownSec, 0)
    }
    case 'warmup':
      return mk('warmup', s.warmupSec, 0)
    case 'done':
    case 'idle':
    default:
      return firstPhase(s)
  }
}

const messages = {
  es: {
    appTitle: 'Temporizador de Entrenamiento',
    ready: 'Listo',
    warmup: 'Calentamiento',
    work: 'Intenso',
    rest: 'Relajado',
    cooldown: 'Enfriamiento',
    done: 'Completado',
    start: 'Iniciar',
    pause: 'Pausar',
    resume: 'Reanudar',
    next: 'Siguiente',
    previous: 'Anterior',
    reset: 'Reiniciar',
    totalEstimated: 'Total estimado',
    settings: 'Ajustes',
    settingsSubtitle: 'Duraciones y preferencias',
    sound: 'Sonido',
    alertTone: 'Tono de alerta',
    beep: 'Beep',
    silent: 'Silencio',
    toneBeep: 'Beep',
    toneChime: 'Campana',
    toneClick: 'Clic',
    toneWood: 'Madera',
    toneTriple: 'Triple beep',
    vibration: 'Vibración',
    on: 'Activada',
    off: 'Desactivada',
    theme: 'Tema',
    themeSystem: 'Sistema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    language: 'Idioma',
    tipInstall: 'Consejo: añade esta app a tu pantalla de inicio para usarla offline y mantener la pantalla activa durante tus entrenamientos.',
    showSettings: 'Mostrar ajustes',
    hideSettings: 'Ocultar ajustes',
    intervals: 'Intervalos',
  },
  en: {
    appTitle: 'Training Timer',
    ready: 'Ready',
    warmup: 'Warm-up',
    work: 'Intense',
    rest: 'Relax',
    cooldown: 'Cooldown',
    done: 'Completed',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    next: 'Next',
    previous: 'Previous',
    reset: 'Reset',
    totalEstimated: 'Estimated total',
    settings: 'Settings',
    settingsSubtitle: 'Durations and preferences',
    sound: 'Sound',
    alertTone: 'Alert tone',
    beep: 'Beep',
    silent: 'Silent',
    toneBeep: 'Beep',
    toneChime: 'Chime',
    toneClick: 'Click',
    toneWood: 'Wood',
    toneTriple: 'Triple beep',
    vibration: 'Vibration',
    on: 'On',
    off: 'Off',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    tipInstall: 'Tip: add this app to your home screen to use it offline and keep the screen awake during workouts.',
    showSettings: 'Show settings',
    hideSettings: 'Hide settings',
    intervals: 'Intervals',
  },
}
