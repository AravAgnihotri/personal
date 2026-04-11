import { useRef, useEffect, useState, useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import PresenterModel from './PresenterModel'
import './App.css'

const PHRASES = [
  { text: 'Innovator at The Knowledge Society.', side: 'left'  },
  { text: "Building what doesn't exist yet.",    side: 'right' },
  { text: 'Ideas → Execution → Impact.',         side: 'left'  },
]

function Scene({ scrollY }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 5]} intensity={1.8} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#c8d0e0" />
      <Environment preset="city" />
      <Suspense fallback={null}>
        <PresenterModel scrollY={scrollY} />
      </Suspense>
    </>
  )
}

// Production: commit `public/14-days.mp3`, or set VITE_BG_AUDIO_URL on your host.
const BG_AUDIO_SRC =
  (import.meta.env.VITE_BG_AUDIO_URL?.trim() || '/14-days.mp3')
const BG_VOLUME = 0.55

export default function App() {
  const scrollY      = useRef(0)
  const bgAudioRef   = useRef(null)
  const [active, setActive] = useState(-1) // -1 = none, 0/1/2 = phrase index
  const [musicPlaying, setMusicPlaying] = useState(false)

  const toggleMusic = useCallback(() => {
    const el = bgAudioRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }, [])

  useEffect(() => {
    const el = bgAudioRef.current
    if (!el) return
    el.volume = BG_VOLUME
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
    const el = bgAudioRef.current
    if (!el) return

    const capture = true
    let unlockRemoved = false
    const removeUnlock = () => {
      if (unlockRemoved) return
      unlockRemoved = true
      document.removeEventListener('pointerdown', unlock, { capture })
      document.removeEventListener('keydown', unlock, { capture })
    }

    const attemptPlay = () =>
      el.play().then(removeUnlock).catch(() => {})

    const unlock = () => {
      void attemptPlay()
    }

    document.addEventListener('pointerdown', unlock, { capture, passive: true })
    document.addEventListener('keydown', unlock, { capture, passive: true })

    const startWhenReady = () => void attemptPlay()
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startWhenReady()
    else el.addEventListener('canplay', startWhenReady, { once: true })

    return () => {
      removeUnlock()
      el.removeEventListener('canplay', startWhenReady)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY
      const vh = window.innerHeight

      // ARAV section is first 100vh — phrases only after that
      if (window.scrollY < vh) {
        setActive(-1)
      } else {
        const idx = Math.min(
          PHRASES.length - 1,
          Math.floor((window.scrollY - vh) / vh)
        )
        setActive(idx)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="site">
      <audio
        ref={bgAudioRef}
        src={BG_AUDIO_SRC}
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* ── Fixed model — lives behind ARAV, revealed when ARAV scrolls away ── */}
      <div className="model-fixed">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <Scene scrollY={scrollY} />
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
            <li>
              <button
                type="button"
                className={`nav-sound${musicPlaying ? '' : ' nav-sound-idle'}`}
                onClick={toggleMusic}
                aria-pressed={musicPlaying}
              >
                {musicPlaying ? 'Mute' : 'Music'}
              </button>
            </li>
          </ul>
        </nav>

        <div className="arav-text"><span>ARAV</span></div>

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
          className={`phrase phrase-${p.side} ${active === i ? 'phrase-active' : ''}`}
        >
          <p>{p.text}</p>
        </div>
      ))}

    </div>
  )
}
