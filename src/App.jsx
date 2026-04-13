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

// Ordered left → right so the rightmost (i=7) bounces in first, leftmost (i=0) last.
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
    link: 'https://futuresummit.ai/',
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
  { id: 6, lines: ['TKS',      'HACKATHON'],   status: '🏆 Winner',    tags: 'TKS · Hackathon',       bg: '#120d00', color: '#ffd700', link: null },
  {
    id: 7,
    lines: ['STUDY', 'TYPE'],
    status: 'Live',
    tags: 'React · Productivity',
    bg: '#121214',
    color: '#d8ccf5',
    link: 'https://studytype.vercel.app/',
    cover: publicUrl('studytype-cover.png'),
  },
  { id: 8, lines: ['DEMO',     'DAY 25'],      status: 'Coming Soon',  tags: 'TKS · Presentation',    bg: '#0d0d0d', color: '#444',    link: null },
]

/** Viewport heights: 3 phrase steps + this handoff after the last phrase (keep in sync with .phrase-track in App.css) */
const PHRASE_STEPS_VH = PHRASES.length
const HANDOFF_VH = 0.52
/** Wheel/trackpad: dampen input and cap how much can move per frame so you can’t scroll the page quickly. */
const MAX_WHEEL_DELTA_PX = 96
const WHEEL_SCROLL_MULTIPLIER = 0.88
const MAX_SCROLL_PER_FRAME_PX = 18

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

export default function App() {
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
  const [siteEntered, setSiteEntered] = useState(false)
  const [splashMounted, setSplashMounted] = useState(true)
  const [splashExiting, setSplashExiting] = useState(false)
  const splashExitDoneRef = useRef(false)
  const [cardsRevealed, setCardsRevealed] = useState(0) // 0–4, right-to-left

  const syncFadeEnd = useCallback(() => {
    const el = projectsSentinelRef.current
    const vh = window.innerHeight
    fadeEndRef.current =
      el && el.offsetTop > 0 ? el.offsetTop : vh * (1 + (PHRASE_STEPS_VH + HANDOFF_VH))
  }, [])

  useLayoutEffect(() => {
    syncFadeEnd()
  }, [syncFadeEnd])

  const runScrollFrame = useCallback(() => {
    syncFadeEnd()
    const y = window.scrollY
    scrollY.current = y
    const vhUnit = window.innerHeight
    const projectsTop =
      projectsSentinelRef.current?.offsetTop ??
      vhUnit * (1 + (PHRASE_STEPS_VH + HANDOFF_VH))

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
        Math.abs(prev.phrase - phraseT) < 0.012 &&
        Math.abs(prev.projects - projectsT) < 0.012 &&
        Math.abs(prev.pageMix - pageMix) < 0.012
      ) {
        return prev
      }
      return { phrase: phraseT, projects: projectsT, pageMix }
    })

    // Card reveal: scroll-driven through the sentinel (120vh window after projectsTop)
    if (projectsSentinelRef.current) {
      const scrollable  = vhUnit * 1.2
      const progress    = Math.min(1, Math.max(0, (y - projectsTop) / scrollable))
      // 8 cards right→left, evenly spaced 5%–88%
      const thresholds  = [0.05, 0.17, 0.30, 0.42, 0.55, 0.67, 0.80, 0.92]
      const count       = thresholds.filter(t => progress >= t).length
      setCardsRevealed(count)
    }
  }, [syncFadeEnd])

  const scheduleScroll = useCallback(() => {
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      runScrollFrame()
    })
  }, [runScrollFrame])

  useEffect(() => {
    const onScroll = () => scheduleScroll()
    const onResize = () => runScrollFrame()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    runScrollFrame()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [scheduleScroll, runScrollFrame])

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
    document.body.style.overflow = siteEntered ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [siteEntered])

  useEffect(() => {
    if (!siteEntered) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const multiplier = WHEEL_SCROLL_MULTIPLIER
    const flushWheel = () => {
      wheelFlushRafRef.current = null
      let acc = wheelAccRef.current
      if (Math.abs(acc) < 0.25) {
        wheelAccRef.current = 0
        return
      }
      const step =
        Math.sign(acc) * Math.min(Math.abs(acc), MAX_SCROLL_PER_FRAME_PX)
      wheelAccRef.current = acc - step
      window.scrollBy({ top: step, left: 0, behavior: 'auto' })
      if (Math.abs(wheelAccRef.current) > 0.25) {
        wheelFlushRafRef.current = requestAnimationFrame(flushWheel)
      }
    }

    const onWheel = (e) => {
      if (e.ctrlKey) return
      if (e.shiftKey) return
      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      else if (e.deltaMode === 2) dy *= window.innerHeight
      const capped = Math.sign(dy) * Math.min(Math.abs(dy), MAX_WHEEL_DELTA_PX)
      e.preventDefault()
      wheelAccRef.current += capped * multiplier
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

      {/* ── Sentinel: in-flow scroll driver for card reveals + handoff anchor ── */}
      <div ref={projectsSentinelRef} className="projects-sentinel" />

      {/* ── Projects section — fixed like the canvas, can never be scrolled past ── */}
      <section id="work" ref={projectsSectionEl} className="projects-section">
        <div
          className={`projects-inner${handoff.projects > 0.02 ? ' projects-inner--interactive' : ''}`}
        >
          <div className="projects-cards-container">
            {PROJECTS.map((p, i) => {
              const revealOrder = PROJECTS.length - i
              const isRevealed  = cardsRevealed >= revealOrder
              const CardEl      = p.link ? 'a' : 'div'
              const linkProps   = p.link ? { href: p.link, target: '_blank', rel: 'noreferrer' } : {}
              return (
                <CardEl
                  key={p.id}
                  {...linkProps}
                  className={`project-card project-card-${i + 1}${p.cover ? ' project-card--has-cover' : ''}${isRevealed ? ' card-revealed' : ''}`}
                  style={{ background: p.bg }}
                >
                  {p.cover && (
                    <>
                      <div
                        className="project-card-cover-img"
                        style={{ backgroundImage: `url(${p.cover})` }}
                        aria-hidden
                      />
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
          <p className="projects-tagline">Here is some of my work</p>
          <div className="projects-heading">PROJECTS</div>
        </div>
      </section>

    </div>
  )
}
