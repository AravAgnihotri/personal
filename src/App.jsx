import { useRef, useEffect, useLayoutEffect, useState, Suspense, useCallback } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import PresenterModel from './PresenterModel'
import SteamField from './SteamField'
import { publicUrl } from './publicUrl'
import './App.css'

const PHRASES = [
  { text: 'Innovator at The Knowledge Society.', side: 'left'  },
  { text: "Building what doesn't exist yet.",    side: 'right' },
  { text: 'Exploring Agentic AI.',               side: 'left'  },
]

const PROJECTS = [
  {
    id: 1,
    lines: ['AGENTIC', 'E-COMMERCE'],
    status: 'Published',
    tags: 'AI · Medium',
    bg: '#0a0a0a',
    color: '#fff',
    link: 'https://medium.com/@aravagnihotriofficial/agentic-e-commerce-how-smpl-powered-ai-agents-will-revolutionize-retail-shopping-d53d736ec470',
    cover: publicUrl('agentic-ecommerce-cover.png'),
  },
  {
    id: 2,
    lines: ['FUTURE', 'SUMMIT 25'],
    status: 'Live',
    tags: 'Summit · Innovation',
    bg: '#0d0d0d',
    color: '#555',
    link: '/future-summit',
    cover: publicUrl('future-summit-cover.png'),
  },
  {
    id: 3,
    lines: ['SHELFIE'],
    status: 'Testing',
    tags: 'AI · Book Discovery',
    bg: '#1a0e00',
    color: '#f5c87a',
    link: 'https://shelfie-arav-agnihotri.replit.app/auth',
    cover: publicUrl('shelfie-cover.png'),
  },
  {
    id: 4,
    lines: ['AI', 'WEATHER'],
    status: 'Completed',
    tags: 'n8n · OpenAI',
    bg: '#020c1b',
    color: '#64b5f6',
    link: 'https://medium.com/@aravagnihotriofficial/how-my-ai-weather-email-agent-works-55dd18c88ac4',
    cover: publicUrl('ai-weather-cover.png'),
  },
  {
    id: 5,
    lines: ['3D BODY', 'VIEWER'],
    status: 'Completed',
    tags: 'SMPL-X · Three.js',
    bg: '#0a0f1e',
    color: '#80cbc4',
    link: 'https://3d-model-arav-agnihotri.replit.app/',
    cover: publicUrl('3d-body-viewer-cover.png'),
  },
  {
    id: 6,
    lines: ['TKS', 'HACKATHON'],
    status: '🏆 Winner',
    tags: 'TKS · Hackathon',
    bg: '#120d00',
    color: '#ffd700',
    link: '/tks-hackathon',
    cover: publicUrl('tks-hackathon/poster.png'),
  },
  {
    id: 7,
    lines: ['DEMO', 'DAY 25'],
    status: 'Story',
    tags: 'TKS · Presentation',
    bg: '#0d0d0d',
    color: '#e8e6e3',
    link: '/demo-day',
    cover: publicUrl('demo-day/photo-1.png'),
  },
  {
    id: 8,
    lines: ['STUDY', 'TYPE'],
    status: 'Live',
    tags: 'React · Productivity',
    bg: '#121214',
    color: '#d8ccf5',
    link: 'https://studytype.vercel.app/',
    cover: publicUrl('studytype-cover.png'),
  },
  {
    id: 9,
    lines: ['JR', 'MUN'],
    status: 'Completed',
    tags: 'Model UN · School',
    bg: '#101828',
    color: '#c8d6ef',
    link: null,
    cover: publicUrl('jr-mun/cover.png'),
  },
]

/** Viewport heights: 3 phrase steps + this handoff after the last phrase (keep in sync with .phrase-track in App.css) */
const PHRASE_STEPS_VH = PHRASES.length
const HANDOFF_VH = 0.52
/** Wheel/trackpad: dampen input and cap how much can move per frame so you can’t scroll the page quickly. */
const MAX_WHEEL_DELTA_PX = 96
const WHEEL_SCROLL_MULTIPLIER = 0.88
const MAX_SCROLL_PER_FRAME_PX = 18
const FUTURE_SUMMIT_PHOTOS = [
  publicUrl('future-summit/photo-1.png'),
  publicUrl('future-summit/photo-2.png'),
  publicUrl('future-summit/photo-3.png'),
  publicUrl('future-summit/photo-4.png'),
  publicUrl('future-summit/photo-5.png'),
]

const DEMO_DAY_COVER = publicUrl('demo-day/photo-1.png')
const DEMO_DAY_PHOTOS = [
  publicUrl('demo-day/photo-1.png'),
  publicUrl('demo-day/photo-2.png'),
  publicUrl('demo-day/photo-3.png'),
  publicUrl('demo-day/photo-4.png'),
]

/** Usable width for the horizontal strip (viewport clientWidth includes horizontal padding). */
function projectsStripLaneInnerWidth(vp) {
  if (!vp || typeof window === 'undefined') return 0
  const cs = window.getComputedStyle(vp)
  const padX =
    (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
  return Math.max(0, vp.clientWidth - padX)
}

/** Home without #work; return-to-projects uses `markReturnToProjects` + referrer / short-lived session timestamp. */
const HOME_HREF = import.meta.env.BASE_URL

const RETURN_TO_PROJECTS_STORAGE = 'aa:returnToProjectsTs'
const RETURN_TO_PROJECTS_MAX_AGE_MS = 120_000

function markReturnToProjects() {
  try {
    sessionStorage.setItem(RETURN_TO_PROJECTS_STORAGE, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function referrerIsProjectSubpage() {
  try {
    const ref = document.referrer
    if (!ref) return false
    const u = new URL(ref)
    if (u.origin !== window.location.origin) return false
    return /^\/(demo-day|future-summit|tks-hackathon)\/?$/.test(u.pathname)
  } catch {
    return false
  }
}

function readReturnToProjectsIntent() {
  if (typeof window === 'undefined') return false
  if (window.location.hash === '#work') return true
  if (referrerIsProjectSubpage()) return true

  try {
    const raw = sessionStorage.getItem(RETURN_TO_PROJECTS_STORAGE)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts) || ts <= 0) {
      sessionStorage.removeItem(RETURN_TO_PROJECTS_STORAGE)
      return false
    }
    if (Date.now() - ts > RETURN_TO_PROJECTS_MAX_AGE_MS) {
      sessionStorage.removeItem(RETURN_TO_PROJECTS_STORAGE)
      return false
    }
    return true
  } catch {
    return false
  }
}

function clearReturnToProjectsIntent() {
  try {
    sessionStorage.removeItem(RETURN_TO_PROJECTS_STORAGE)
  } catch {
    /* ignore */
  }
}

/** Document Y of an element’s top (not `offsetTop`, which is offsetParent-relative). */
function elementDocumentTop(el) {
  if (!el || typeof window === 'undefined') return 0
  return el.getBoundingClientRect().top + window.scrollY
}

function Scene({ scrollY, fadeEndRef }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={1.8} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#c8d0e0" />
      <Environment preset="city" />
      <Suspense fallback={null}>
        <SteamField scrollY={scrollY} fadeEndRef={fadeEndRef} />
        <PresenterModel scrollY={scrollY} phraseCount={PHRASES.length} />
      </Suspense>
    </>
  )
}

function PortfolioHome() {
  const scrollY            = useRef(0)
  const projectsSectionEl  = useRef(null)  // DOM ref for the fixed section (no offsetTop)
  const projectsSentinelRef = useRef(null) // in-flow sentinel — provides offsetTop + scroll space
  const fadeEndRef         = useRef(1)
  const [active, setActive] = useState(-1) // -1 = none, 0/1/2 = phrase index
  /** Staggered handoff: phrase out first, then projects + page tint (smoother, no overlap) */
  const [handoff, setHandoff] = useState({ phrase: 1, projects: 0, pageMix: 0 })
  const scrollRafRef = useRef(null)
  const wheelAccRef = useRef(0)
  const wheelFlushRafRef = useRef(null)
  const musicRef = useRef(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  /** Cold load: show splash first. Skip when landing on #work / return-from-project flows (see readReturnToProjectsIntent). */
  const [siteEntered, setSiteEntered] = useState(() => readReturnToProjectsIntent())
  const [splashMounted, setSplashMounted] = useState(() => !readReturnToProjectsIntent())
  const [splashExiting, setSplashExiting] = useState(false)
  const splashExitDoneRef = useRef(readReturnToProjectsIntent())
  const projectsStripViewportRef = useRef(null)
  const projectsStripTrackRef = useRef(null)
  const maxStripShiftRef = useRef(0)
  const didInitialHomeScrollRef = useRef(false)

  const measureProjectsStrip = useCallback(() => {
    const vp = projectsStripViewportRef.current
    const tr = projectsStripTrackRef.current
    if (!vp || !tr) return
    const laneW = projectsStripLaneInnerWidth(vp)
    maxStripShiftRef.current = Math.max(0, tr.scrollWidth - laneW + 1)
    const el = projectsSentinelRef.current
    if (!el || typeof window === 'undefined') return
    const vh = window.innerHeight
    const pad = vh * 1.4
    const minH = vh * 2.2
    el.style.height = `${Math.max(minH, Math.round(maxStripShiftRef.current + pad))}px`
  }, [])

  const syncFadeEnd = useCallback(() => {
    const el = projectsSentinelRef.current
    const vh = window.innerHeight
    const docTop = elementDocumentTop(el)
    fadeEndRef.current =
      el && docTop > 0 ? docTop : vh * (1 + (PHRASE_STEPS_VH + HANDOFF_VH))
  }, [])

  useLayoutEffect(() => {
    syncFadeEnd()
  }, [syncFadeEnd])

  /** Must run in layout (not useEffect): unlock before scroll-to-projects in the same commit. */
  useLayoutEffect(() => {
    document.body.style.overflow = siteEntered ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [siteEntered])

  const runScrollFrame = useCallback(() => {
    syncFadeEnd()
    const y = window.scrollY
    scrollY.current = y
    const vhUnit = window.innerHeight
    const sen = projectsSentinelRef.current
    const projectsTop =
      sen != null
        ? elementDocumentTop(sen)
        : vhUnit * (1 + (PHRASE_STEPS_VH + HANDOFF_VH))

    invalidate()

    const phraseEndScroll = vhUnit * (PHRASES.length + 0.4)

    let nextActive = -1
    if (y < vhUnit) {
      nextActive = -1
    } else if (y >= projectsTop) {
      nextActive = -1
    } else if (y < phraseEndScroll) {
      nextActive = Math.min(
        PHRASES.length - 1,
        Math.floor((y - vhUnit) / vhUnit)
      )
    } else {
      nextActive = PHRASES.length - 1
    }
    setActive(nextActive)

    const span = Math.max(1, projectsTop - phraseEndScroll)
    /** First ~48% of handoff: phrase only. Rest: projects + page warm to white. */
    const PHRASE_OUT = 0.48
    let phraseT = 1
    let projectsT = 0
    let pageMix = 0

    if (y >= phraseEndScroll && y < projectsTop) {
      const u = (y - phraseEndScroll) / span
      pageMix = u * u * (3 - 2 * u)

      if (u < PHRASE_OUT) {
        const t = u / PHRASE_OUT
        phraseT = 1 - t * t * (3 - 2 * t)
        projectsT = 0
      } else {
        phraseT = 0
        const t = (u - PHRASE_OUT) / (1 - PHRASE_OUT)
        projectsT = t * t * (3 - 2 * t)
      }
    } else if (y >= projectsTop) {
      phraseT = 0
      projectsT = 1
      pageMix = 1
    }

    setHandoff((prev) => {
      if (
        Math.abs(prev.phrase - phraseT) < 0.003 &&
        Math.abs(prev.projects - projectsT) < 0.003 &&
        Math.abs(prev.pageMix - pageMix) < 0.003
      ) {
        return prev
      }
      return { phrase: phraseT, projects: projectsT, pageMix }
    })

    // Horizontal strip: scroll maps directly to translateX
    const stripEl = projectsStripTrackRef.current
    const sentinelEl = projectsSentinelRef.current
    const stripVp = projectsStripViewportRef.current
    if (stripEl && sentinelEl) {
      if (maxStripShiftRef.current === 0 && stripVp) {
        const laneW = projectsStripLaneInnerWidth(stripVp)
        if (stripEl.scrollWidth > laneW) measureProjectsStrip()
      }
      const sh = sentinelEl.offsetHeight
      // Align with max scroll through sentinel (sh − viewport); smaller denominators never reach stripT = 1.
      const range = Math.max(1, sh - vhUnit)
      let stripT =
        y < projectsTop ? 0 : Math.min(1, Math.max(0, (y - projectsTop) / range))
      const scrollMax = Math.max(
        0,
        (typeof document !== 'undefined'
          ? document.documentElement.scrollHeight
          : 0) - vhUnit
      )
      if (
        scrollMax > 0 &&
        y >= scrollMax - 2 &&
        y >= projectsTop &&
        projectsTop > 0
      ) {
        stripT = 1
      }
      const mx = maxStripShiftRef.current
      const x = -(mx * stripT)
      stripEl.style.transform =
        y < projectsTop ? 'translate3d(0,0,0)' : `translate3d(${x}px,0,0)`
    }
  }, [syncFadeEnd, measureProjectsStrip])

  /**
   * Once per mount: hero top, or projects sentinel when coming from a project link / #work / fresh referrer.
   * Timestamp in sessionStorage expires so cold loads don’t jump.
   */
  useLayoutEffect(() => {
    if (!siteEntered) return
    if (didInitialHomeScrollRef.current) return
    didInitialHomeScrollRef.current = true

    const toProjects = readReturnToProjectsIntent()
    if (toProjects) {
      const el = projectsSentinelRef.current
      if (el) {
        const top = Math.max(0, elementDocumentTop(el))
        window.scrollTo({ left: 0, top, behavior: 'auto' })
      }
      runScrollFrame()
      const t = window.setTimeout(() => clearReturnToProjectsIntent(), 0)
      return () => window.clearTimeout(t)
    }

    window.scrollTo({ left: 0, top: 0, behavior: 'auto' })
    runScrollFrame()
  }, [siteEntered, runScrollFrame])

  const scheduleScroll = useCallback(() => {
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      runScrollFrame()
    })
  }, [runScrollFrame])

  useEffect(() => {
    if (!siteEntered) return
    const tr = projectsStripTrackRef.current
    const vp = projectsStripViewportRef.current
    if (!tr || !vp) return

    const ro = new ResizeObserver(() => {
      measureProjectsStrip()
      runScrollFrame()
    })
    ro.observe(tr)
    ro.observe(vp)
    measureProjectsStrip()
    runScrollFrame()

    return () => {
      ro.disconnect()
    }
  }, [siteEntered, measureProjectsStrip, runScrollFrame])

  useEffect(() => {
    const onScroll = () => scheduleScroll()
    const onResize = () => {
      measureProjectsStrip()
      runScrollFrame()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    runScrollFrame()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [scheduleScroll, runScrollFrame, measureProjectsStrip])

  useEffect(() => {
    const el = musicRef.current
    if (!el) return
    const onPlay = () => setMusicPlaying(true)
    const onPause = () => setMusicPlaying(false)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    if (!siteEntered) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const multiplier = WHEEL_SCROLL_MULTIPLIER
    const WHEEL_ACC_EPS = 0.01
    const flushWheel = () => {
      wheelFlushRafRef.current = null
      const acc = wheelAccRef.current
      if (Math.abs(acc) < WHEEL_ACC_EPS) {
        wheelAccRef.current = 0
        return
      }
      if (Math.abs(acc) < MAX_SCROLL_PER_FRAME_PX) {
        wheelAccRef.current = 0
        window.scrollBy({ top: acc, left: 0, behavior: 'auto' })
        return
      }
      const step =
        Math.sign(acc) * Math.min(Math.abs(acc), MAX_SCROLL_PER_FRAME_PX)
      wheelAccRef.current = acc - step
      window.scrollBy({ top: step, left: 0, behavior: 'auto' })
      if (Math.abs(wheelAccRef.current) >= WHEEL_ACC_EPS) {
        wheelFlushRafRef.current = requestAnimationFrame(flushWheel)
      }
    }

    const onWheel = (e) => {
      if (e.ctrlKey) return

      const vh = window.innerHeight
      const sen = projectsSentinelRef.current
      const mx = maxStripShiftRef.current
      const y = window.scrollY

      let inStripZone = false
      let range = 1
      let projectsTop = 0
      if (sen && mx > 0) {
        projectsTop = elementDocumentTop(sen)
        const sh = sen.offsetHeight
        range = Math.max(1, sh - vh)
        inStripZone = y >= projectsTop && y <= projectsTop + range
      }

      if (e.shiftKey && !inStripZone) return

      let dx = e.deltaX
      let dy = e.deltaY
      if (inStripZone && e.shiftKey) {
        dx += dy
        dy = 0
      }

      if (e.deltaMode === 1) {
        dx *= 16
        dy *= 16
      } else if (e.deltaMode === 2) {
        dx *= vh
        dy *= vh
      }

      const cappedY = Math.sign(dy) * Math.min(Math.abs(dy), MAX_WHEEL_DELTA_PX)
      const cappedX = Math.sign(dx) * Math.min(Math.abs(dx), MAX_WHEEL_DELTA_PX)

      let horizontalDy = 0
      if (inStripZone && mx > 0) {
        horizontalDy = (range / mx) * cappedX * multiplier
      }

      const totalDy = cappedY * multiplier + horizontalDy

      e.preventDefault()
      wheelAccRef.current += totalDy
      if (wheelFlushRafRef.current == null) {
        wheelFlushRafRef.current = requestAnimationFrame(flushWheel)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (wheelFlushRafRef.current != null) {
        cancelAnimationFrame(wheelFlushRafRef.current)
        wheelFlushRafRef.current = null
      }
      wheelAccRef.current = 0
    }
  }, [siteEntered])

  const finishSplashExit = useCallback(() => {
    if (splashExitDoneRef.current) return
    splashExitDoneRef.current = true
    setSplashMounted(false)
    setSiteEntered(true)
  }, [])

  const enterSite = useCallback(() => {
    if (splashExiting) return
    void musicRef.current?.play()
    setSplashExiting(true)
  }, [splashExiting])

  const onSplashAnimationEnd = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return
      if (e.animationName !== 'siteSplashOut') return
      finishSplashExit()
    },
    [finishSplashExit]
  )

  useEffect(() => {
    if (!splashExiting) return
    const t = window.setTimeout(finishSplashExit, 1300)
    return () => window.clearTimeout(t)
  }, [splashExiting, finishSplashExit])


  const toggleMusic = useCallback(() => {
    const el = musicRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
    } else {
      el.pause()
    }
  }, [])

  return (
    <div
      className="site"
      style={{
        '--handoff-phrase': String(handoff.phrase),
        '--handoff-projects': String(handoff.projects),
        '--page-mix': String(handoff.pageMix),
        background: `color-mix(in srgb, #f5f4f1 ${(1 - handoff.pageMix) * 100}%, #ffffff ${handoff.pageMix * 100}%)`,
      }}
    >
      <audio
        ref={musicRef}
        src="/14-days.mp3"
        loop
        preload="auto"
      />

      {splashMounted && (
        <div
          className={`site-splash${splashExiting ? ' site-splash--exit' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Arav Agnihotri portfolio"
          onAnimationEnd={onSplashAnimationEnd}
        >
          <div className="site-splash-inner">
            <div className="site-splash-brand">
              <div className="site-splash-flourish" aria-hidden="true">
                <span className="site-splash-flourish-line" />
                <span className="site-splash-flourish-dot" />
                <span className="site-splash-flourish-line" />
              </div>
              <h2 className="site-splash-title">
                <span className="site-splash-title-line site-splash-title-line--name">
                  Arav Agnihotri&rsquo;s
                </span>
                <span className="site-splash-title-line site-splash-title-line--word">Portfolio</span>
              </h2>
            </div>
            <button
              type="button"
              className="site-splash-start"
              onClick={enterSite}
              disabled={splashExiting}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {siteEntered && (
        <div className="music-dock">
          <button
            type="button"
            className="music-toggle"
            onClick={toggleMusic}
            aria-pressed={musicPlaying}
            aria-label={musicPlaying ? 'Pause music' : 'Play music'}
          >
            <span className="music-toggle-icon" aria-hidden>
              {musicPlaying ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
            <span className="music-toggle-label">14 Days</span>
          </button>
        </div>
      )}

      {/* ── Fixed model — lives behind ARAV, revealed when ARAV scrolls away ── */}
      <div className="model-fixed">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
        >
          <Scene scrollY={scrollY} fadeEndRef={fadeEndRef} />
        </Canvas>
      </div>

      {/* ── ARAV hero — solid bg covers model, scrolls off naturally ── */}
      <section className="arav-hero">
        <nav>
          <div className="nav-logo">ARAV</div>
          <ul className="nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#work">Work</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>

        <div className="arav-text"><span>ARAV</span></div>

        {/* Bottom-left: surname */}
        <div className="arav-sub">Agnihotri</div>

        {/* Bottom-right: social logos — symmetrical to Agnihotri */}
        <div className="arav-socials">
          <a href="https://www.linkedin.com/in/arav-agnihotri-a4910b386/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a href="https://github.com/AravAgnihotri" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://medium.com/@aravagnihotriofficial" target="_blank" rel="noreferrer" aria-label="Medium">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>
          </a>
        </div>

        <div className="scroll-cue">
          <div className="scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── Scroll track — transparent so model shows through ── */}
      <div className="phrase-track" />

      {/* ── Fixed phrase overlays — appear on left/right after ARAV ── */}
      {PHRASES.map((p, i) => (
        <div
          key={i}
          className={`phrase phrase-${p.side} ${
            active === i && handoff.phrase > 0.04 ? 'phrase-active' : ''
          }`}
        >
          <p>{p.text}</p>
        </div>
      ))}

      {/* ── Sentinel: in-flow scroll driver for projects strip + handoff anchor (#work must live here: fixed .projects-section has no document scroll position) ── */}
      <div ref={projectsSentinelRef} id="work" className="projects-sentinel" />

      {/* ── Projects section — fixed like the canvas, can never be scrolled past ── */}
      <section ref={projectsSectionEl} className="projects-section" aria-label="Work">
        <div
          className={`projects-inner${handoff.projects > 0.02 ? ' projects-inner--interactive' : ''}`}
        >
          <div className="projects-cards-container">
            <div ref={projectsStripViewportRef} className="projects-cards-viewport">
              <div ref={projectsStripTrackRef} className="projects-cards-track">
                {PROJECTS.map((p, i) => {
                  const CardEl = p.link ? 'a' : 'div'
                  const isInternalLink = typeof p.link === 'string' && p.link.startsWith('/')
                  const linkProps = p.link
                    ? (isInternalLink
                      ? { href: p.link }
                      : { href: p.link, target: '_blank', rel: 'noreferrer' })
                    : {}
                  return (
                    <CardEl
                      key={p.id}
                      {...linkProps}
                      className={`project-card project-card-${i + 1}${p.cover ? ' project-card--has-cover' : ''}`}
                      style={{ background: p.bg }}
                    >
                      {p.cover && (
                        <>
                          <div className="project-card-painting">
                            <img
                              src={p.cover}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onLoad={measureProjectsStrip}
                            />
                          </div>
                          <div className="project-card-cover-fade" aria-hidden />
                        </>
                      )}
                      <div className="project-card-inner">
                        <div className="project-card-status" style={{ color: p.color }}>{p.status}</div>
                        <div className="project-card-title" style={{ color: p.color }}>
                          {p.lines.map((line, j) => <span key={j}>{line}</span>)}
                        </div>
                        <div className="project-card-sub" style={{ color: p.color }}>{p.tags}</div>
                      </div>
                    </CardEl>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="projects-tagline">Here is some of my work</p>
          <div className="projects-heading">PROJECTS</div>
        </div>
      </section>

    </div>
  )
}

const TKS_HACK_POSTER = publicUrl('tks-hackathon/poster.png')
const TKS_HACK_VIDEO = publicUrl('tks-hackathon/emergiq.mp4')

function TksHackathonHeroMedia() {
  const [useVideo, setUseVideo] = useState(false)
  useEffect(() => {
    let alive = true
    fetch(TKS_HACK_VIDEO, { method: 'HEAD' })
      .then((r) => {
        if (alive && r.ok) setUseVideo(true)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!useVideo) {
    return (
      <img
        src={TKS_HACK_POSTER}
        alt="Collaborating at the TKS Hackathon"
        className="tks-hackathon-media tks-hackathon-media--still"
      />
    )
  }
  return (
    <video
      className="tks-hackathon-media tks-hackathon-media--video"
      controls
      playsInline
      preload="metadata"
      poster={TKS_HACK_POSTER}
      src={TKS_HACK_VIDEO}
      onError={() => setUseVideo(false)}
    />
  )
}

function TksHackathonPage() {
  useEffect(() => {
    document.title = 'TKS Hackathon — EmergIQ — Arav Agnihotri'
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevBodyBg = document.body.style.background
    meta?.setAttribute('content', '#1a1408')
    document.body.style.background = '#141008'
    return () => {
      document.title = 'Arav'
      meta?.setAttribute('content', '#f5f4f1')
      document.body.style.background = prevBodyBg
    }
  }, [])

  return (
    <div className="tks-hackathon-site">
      <a href="#tks-hackathon-main" className="tks-hackathon-skip">
        Skip to content
      </a>

      <header className="tks-hackathon-topbar" role="banner">
        <div className="tks-hackathon-brand">
          <span className="tks-hackathon-mark" aria-hidden>
            <span />
          </span>
          <div className="tks-hackathon-brand-text">
            <span className="tks-hackathon-brand-title">TKS Hackathon</span>
            <span className="tks-hackathon-brand-sub">EmergIQ · Winner</span>
          </div>
        </div>
        <nav className="tks-hackathon-topnav" aria-label="TKS Hackathon">
          <a href={HOME_HREF} className="tks-hackathon-back" onClick={markReturnToProjects}>
            ← Projects
          </a>
        </nav>
      </header>

      <main id="tks-hackathon-main" className="tks-hackathon-page">
        <section className="tks-hackathon-media-wrap" aria-label="Hackathon video">
          <TksHackathonHeroMedia />
        </section>

        <article className="tks-hackathon-copy">
          <p className="tks-hackathon-lede">
            Emergency responders arrive without fully knowing what they are walking into.
          </p>
          <p>
            Last week I took part in the TKS Hackathon. The goal was to bring together everyone&apos;s
            different strengths and build something meaningful.
          </p>
          <p>
            Our team worked on an idea around helping first responders understand a situation before they
            arrive, and we ended up winning the hackathon.
          </p>
          <p>
            We designed and built EmergIQ. A system where a bystander could record the scene on their phone
            while the app guides them on what to capture. From that, the system would build a 3D view of
            the scene, analyze possible injuries, and allow responders to see everything live and guide the
            person if needed.
          </p>
          <p>
            The information gathered would be turned into a clear report that paramedics could use on the
            way to a scene.
          </p>
          <p>
            An interesting insight was that building the prototype wasn&apos;t the hardest part. The real
            challenge was deciding what to build. Once we committed to a clear direction, progress
            accelerated rapidly.
          </p>
        </article>
      </main>

      <footer className="tks-hackathon-footer">
        <p>Arav Agnihotri</p>
        <a href={HOME_HREF} onClick={markReturnToProjects}>
          Return to projects
        </a>
      </footer>
    </div>
  )
}

function DemoDayPage() {
  useEffect(() => {
    document.title = 'Demo Day — Arav Agnihotri'
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevBodyBg = document.body.style.background
    meta?.setAttribute('content', '#ede6dc')
    document.body.style.background = '#e8e2d8'
    return () => {
      document.title = 'Arav'
      meta?.setAttribute('content', '#f5f4f1')
      document.body.style.background = prevBodyBg
    }
  }, [])

  return (
    <div className="demo-day-site">
      <a href="#demo-day-main" className="demo-day-skip">
        Skip to story
      </a>

      <header className="demo-day-topbar" role="banner">
        <div className="demo-day-brand">
          <span className="demo-day-mark" aria-hidden>
            <span />
          </span>
          <div className="demo-day-brand-text">
            <span className="demo-day-brand-title">Demo Day</span>
            <span className="demo-day-brand-sub">A short story from the stage</span>
          </div>
        </div>
        <nav className="demo-day-topnav" aria-label="Demo Day">
          <a href={HOME_HREF} className="demo-day-back" onClick={markReturnToProjects}>
            ← Projects
          </a>
        </nav>
      </header>

      <main id="demo-day-main" className="demo-day-page">
      <section className="demo-day-hero" aria-label="Demo Day cover">
        <img
          src={DEMO_DAY_COVER}
          alt="On stage at Demo Day, presenting to an audience"
          className="demo-day-hero-img"
        />
        <div className="demo-day-hero-scrim" aria-hidden />
        <div className="demo-day-hero-overlay">
          <p className="demo-day-hero-eyebrow">The Knowledge Society</p>
          <h1>Demo Day</h1>
          <p className="demo-day-hero-kicker">Presentation · 2025</p>
        </div>
      </section>

      <article className="demo-day-copy">
        <p>I walked into Demo Day feeling like an imposter.</p>
        <p>
          I was the youngest speaker in the room, and honestly? I was terrified.
        </p>
        <p>
          Surrounded by brilliant minds with polished, ambitious ideas, it was hard not to question if I
          actually belonged there.
        </p>
        <p>
          I was presenting my work on agentic e-commerce, and the pressure felt heavy.
        </p>
        <p>But here is what I learned:</p>
        <ol className="demo-day-lessons">
          <li>
            <strong>Preparation is the antidote to fear.</strong>
            <span>
              Because I prepared thoroughly, I was able to stand my ground and communicate my vision
              clearly, even though my nerves were running high.
            </span>
          </li>
          <li>
            <strong>Age is just a number.</strong>
            <span>
              Seeing the level of talent around me didn&apos;t diminish my work; it showed me the level
              I&apos;m working toward.
            </span>
          </li>
        </ol>
        <p>
          This experience reinforced a massive lesson for me: Feeling uncertain doesn&apos;t mean you
          don&apos;t belong. It means you are learning, stretching, and exactly where you need to be.
        </p>
      </article>

      <section className="demo-day-gallery" aria-label="Demo Day photos">
        {DEMO_DAY_PHOTOS.map((src, index) => (
          <figure key={src} className="demo-day-photo-wrap">
            <img
              src={src}
              alt={`Demo Day photo ${index + 1}`}
              className="demo-day-photo"
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </figure>
        ))}
      </section>
      </main>

      <footer className="demo-day-footer">
        <p>Arav Agnihotri</p>
        <a href={HOME_HREF} onClick={markReturnToProjects}>
          Return to projects
        </a>
      </footer>
    </div>
  )
}

function FutureSummitPage() {
  useEffect(() => {
    document.title = 'Future Summit — Arav Agnihotri'
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevBodyBg = document.body.style.background
    meta?.setAttribute('content', '#07080a')
    document.body.style.background = '#07080a'
    return () => {
      document.title = 'Arav'
      meta?.setAttribute('content', '#f5f4f1')
      document.body.style.background = prevBodyBg
    }
  }, [])

  return (
    <div className="future-summit-site">
      <a href="#future-summit-main" className="future-summit-skip">
        Skip to content
      </a>

      <header className="future-summit-dock" role="banner">
        <div className="future-summit-dock-inner">
          <div className="future-summit-lockup">
            <span className="future-summit-badge">Live report</span>
            <span className="future-summit-wordmark">Future Summit</span>
          </div>
          <nav className="future-summit-dock-nav" aria-label="Future Summit">
            <a href={HOME_HREF} className="future-summit-back" onClick={markReturnToProjects}>
              Back to projects
            </a>
          </nav>
        </div>
      </header>

      <main id="future-summit-main" className="future-summit-page">
      <section className="future-summit-hero" aria-label="Introduction">
        <div className="future-summit-hero-inner">
          <h1 className="future-summit-hero-title">Future Summit</h1>
          <p className="future-summit-hero-lede">
            Notes from my first innovation conference — sessions, people, and what stuck.
          </p>
        </div>
      </section>

      <section className="future-summit-gallery" aria-label="Future Summit photos">
        {FUTURE_SUMMIT_PHOTOS.map((src, index) => (
          <figure key={src} className="future-summit-photo-wrap">
            <img src={src} alt={`Future Summit photo ${index + 1}`} className="future-summit-photo" />
          </figure>
        ))}
      </section>

      <article className="future-summit-copy">
        <h2>The Future Belongs to Those Who Build It.</h2>
        <p>
          Future Summit was the first conference of my life, and it set a high standard for what an innovation event should feel like.
          The summit brought together work from many fields such as AI, healthtech, energy, business, and more. I explored a range of sessions,
          but I spent most of my time in the AI rooms, listening to how builders are approaching the next stage of development and real-world implementation.
        </p>
        <p>
          The most valuable part of the experience was the networking. I met founders, operators, students, and people who think seriously about the problems they are working on.
          Every conversation sharpened how I look at my own projects and reminded me of the importance of staying around people who build with intent.
        </p>
        <p>
          I want to thank Josh Rainbow for making this opportunity possible and for creating an event that brings together people who are pushing meaningful innovation forward.
          Josh is an amazing person, and even with a full schedule, he took time to talk with me about my path toward building agentic e-commerce. He shared clear guidance,
          thoughtful questions, and resources that will influence the next steps of my journey. I appreciated that he made time for that conversation despite everything he was managing during the summit.
        </p>
        <p>
          I also want to thank Azar Chatur for helping make this happen through The Knowledge Society (TKS).
        </p>
        <p>
          Being surrounded by ambitious people across different fields expanded how I think about what is possible and helped me understand the level I want to operate.
          I left with more clarity, more momentum, and a stronger idea of where I want to go next.
        </p>
      </article>
      </main>

      <footer className="future-summit-footer">
        <span>Future Summit recap</span>
        <a href={HOME_HREF} onClick={markReturnToProjects}>
          Back to projects
        </a>
      </footer>
    </div>
  )
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (path === '/future-summit') {
    return <FutureSummitPage />
  }

  if (path === '/tks-hackathon') {
    return <TksHackathonPage />
  }

  if (path === '/demo-day') {
    return <DemoDayPage />
  }

  return <PortfolioHome />
}
