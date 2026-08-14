import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Level, type ListenChooseQuestion, type LookChooseQuestion, type PronunciationQuestion, type Unit } from './api'
import { applyMenuCardBackgrounds, LOGO_URL } from './assetsConfig'
import { buildSidebarUnitItems, type SidebarUnitItem } from './sidebarUnits'
import { getMicPanelCopy } from './speechRecognition'
import { usePronunciationSpeech } from './usePronunciationSpeech'

const CATCH_FRAME_MS = 1000 / 30
const CARD_TONES = ['game-option-tone-1', 'game-option-tone-2', 'game-option-tone-3', 'game-option-tone-4']
const GAME_SUCCESS_MESSAGES = ['Excellent!', 'Great job!', 'Awesome!', 'Well done!', 'Amazing!', 'Super!']

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  kindergarten: {
    pre11: 'Pre 1.1',
    pre12: 'Pre 1.2',
    pre2: 'Pre 2',
    pre3: 'Pre 3',
  },
  starters: {
    pre11: 'Lesson 1',
    pre12: 'Lesson 2',
    pre2: 'Lesson 3',
    pre3: 'Lesson 4',
  },
}

function getLevelDisplayText(levelKey: string, game: string, levels: Level[]): string {
  const level = levels.find((item) => item.key === levelKey)
  if (!level) return levelKey

  const normalizedGame = game === 'starters' ? 'starters' : 'kindergarten'
  const label = LEVEL_LABELS[normalizedGame]?.[levelKey] || level.title
  return normalizedGame === 'starters' ? label : `${label}: ${level.ageLabel}`
}

export type GameType = 'catching' | 'listenchoose' | 'lookchoose' | 'pronunciation'

type CatchItem = {
  element: HTMLDivElement
  x: number
  y: number
  size: number
  speed: number
  data: PronunciationQuestion
}

export function LegacyHomeLayout({
  game,
  level,
  week,
  levels,
  units,
  unitSlug,
  unitName,
  unitParam,
  onBack,
  onChooseSidebarItem,
  children,
}: {
  game: string
  level: string
  week: string
  levels: Level[]
  units: Unit[]
  unitSlug: string
  unitName: string
  unitParam: string
  onBack: () => void
  onChooseSidebarItem: (item: SidebarUnitItem) => void
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarItems = useMemo(() => buildSidebarUnitItems({
    units,
    game,
    level,
    week,
    unitSlug,
    unitParam,
  }), [units, game, level, week, unitSlug, unitParam])

  return (
    <div className="home-shell bg-pink-50 text-gray-900 flex flex-col min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-gradient-to-r from-[#16a34a] via-[#15803d] to-[#16a34a] flex items-center px-4 sm:px-6 shadow-lg">
        <div className="flex items-center justify-between w-full max-w-8xl mx-auto gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Mở menu unit"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white text-2xl font-black shadow-sm transition active:scale-95"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <img src={LOGO_URL} alt="AnSchool Logo" className="h-14 sm:h-16 w-auto object-contain" width={224} height={64} fetchPriority="high" />
          </div>
        </div>
      </nav>

      <div
        id="sidebar-backdrop"
        className={`fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] md:hidden ${sidebarOpen ? '' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="flex flex-1 pt-20 min-h-[calc(100vh-5rem)] overflow-x-hidden app-shell">
        <aside
          id="unit-sidebar"
          className={`app-sidebar fixed top-0 left-0 z-[60] flex flex-col h-screen bg-pink-50 border-r border-pink-200 p-4 shadow-2xl transition-transform duration-300 ease-out md:sticky md:top-20 md:z-40 md:h-[calc(100vh-5rem)] md:translate-x-0 md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        >
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-pink-200 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">📚</div>
              <div className="sidebar-brand-copy min-w-0">
                <p className="text-sm font-extrabold text-green-800">Kids Book</p>
                <p className="text-[10px] text-green-600">{sidebarItems.length} unit</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng menu unit"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-700 shadow-sm transition active:scale-95"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav id="sidebar-menu" className="sidebar-menu flex-1 space-y-2 overflow-y-auto pr-1">
            {units.length === 0 && (
              <div className="p-4 text-center text-green-500 text-xs italic animate-pulse">Đang tải danh sách...</div>
            )}
            {sidebarItems.length === 0 && units.length > 0 && (
              <div className="p-4 text-center text-amber-600 text-xs font-semibold">Chưa có unit phù hợp với cấp bậc này.</div>
            )}
            {sidebarItems.map((item) => (
              <button
                key={item.sidebarKey}
                type="button"
                className={`sidebar-item w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-transparent transition active:scale-[0.99] ${item.unit.slug === unitSlug ? 'active-unit' : 'bg-white/70 hover:bg-white/80 text-green-800'}`}
                onClick={() => { onChooseSidebarItem(item); setSidebarOpen(false) }}
              >
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl">{item.unit.icon || '📘'}</div>
                <div className="sidebar-unit-label text-left min-w-0 flex-1">
                  <span className="text-sm font-extrabold leading-snug block line-clamp-2">{item.unit.name}</span>
                  <span className="block text-[10px] font-bold text-green-500 mt-1 uppercase tracking-wide">{item.weekLabel}</span>
                </div>
              </button>
            ))}
          </nav>

          <button
            id="sidebar-toggle-footer"
            type="button"
            className="mt-4 hidden md:flex w-full items-center justify-center gap-2 py-2 bg-green-100 text-green-800 rounded-xl text-xs font-bold shadow-sm transition hover:bg-green-200 active:scale-95"
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <span className="sidebar-footer-text">Thu gọn / mở rộng</span>
          </button>
        </aside>

        <main className="relative flex-1 min-w-0 bg-gradient-to-b from-green-50 to-emerald-100 p-4 sm:p-6 md:p-10 game-bg-frame">
          <button
            type="button"
            aria-label="Quay lại trang trước"
            className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-4 py-2.5 text-sm font-extrabold text-emerald-700 shadow-md backdrop-blur transition hover:bg-white hover:shadow-lg active:scale-95"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span>
            <span>Quay lại</span>
          </button>
          <div className="flex justify-center mb-8 pt-12 sm:pt-4">
            <nav className="inline-flex flex-wrap items-center gap-2 px-5 py-2 bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-sm text-sm font-semibold">
              <span id="breadcrumb-level" className="text-amber-600 uppercase">🎯 {getLevelDisplayText(level, game, levels)}</span>
              <span className="text-gray-300">•</span>
              <span id="breadcrumb-unit" className="text-green-600 uppercase">📖 {unitName}</span>
            </nav>
          </div>
          {children}
        </main>
      </div>

      <footer className="bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white p-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <img src={LOGO_URL} alt="AnSchool Logo" className="h-12 w-auto bg-white p-1 rounded mb-4 mx-auto md:mx-0 object-contain" width={192} height={48} loading="lazy" />
            <p className="text-xs text-blue-100 uppercase font-bold">An&apos;s School Education</p>
            <p className="text-[10px] text-blue-200 mt-2 italic">AN&apos;S SCHOOL BỨT PHÁ TIẾNG ANH – VƯƠN TẦM THẾ GIỚI 🌏</p>
          </div>
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-xl text-xs">
              <p className="text-green-200 font-bold">Địa chỉ</p>
              <p>2/72B Lê Thị Hà, Ấp Đình, Xã Tân Xuân, Huyện Hóc Môn, Hồ Chí Minh</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl text-xs">
              <p className="text-green-200 font-bold">Điện thoại</p>
              <p>02888898683</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function LegacyMenuView({
  unitName,
  menuBackgroundMap,
  onStartGame,
}: {
  unitName: string
  menuBackgroundMap?: Record<string, string>
  onStartGame: (game: GameType) => void
}) {
  useEffect(() => {
    applyMenuCardBackgrounds(menuBackgroundMap)
  }, [menuBackgroundMap])

  return (
    <div id="menu-game-view" className="block animate-fade-in">
      <div className="text-center mb-10">
        <h1 id="main-title" className="text-4xl md:text-5xl font-extrabold text-green-900 mb-4 uppercase">{unitName}</h1>
        <p className="text-gray-600 font-medium">Chọn một trò chơi để bắt đầu khám phá!</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 md:gap-10 max-w-6xl mx-auto px-4 lg:px-8">
        <button type="button" data-menu-key="catching" aria-label="Catch Vocabulary" className="menu-game-card game-card group relative bg-white rounded-[24px] sm:rounded-[36px] shadow-xl border-4 border-transparent hover:border-amber-400 transition-all text-center aspect-[21/9] w-full overflow-hidden" onClick={() => onStartGame('catching')}>
          <span className="sr-only">Catch Vocabulary</span>
        </button>
        <button type="button" data-menu-key="listenchoose" aria-label="Listen and Choose" className="menu-game-card game-card group relative bg-white rounded-[24px] sm:rounded-[36px] shadow-xl border-4 border-transparent hover:border-blue-400 transition-all text-center aspect-[21/9] w-full overflow-hidden" onClick={() => onStartGame('listenchoose')}>
          <span className="sr-only">Listen & Choose</span>
        </button>
        <button type="button" data-menu-key="lookchoose" aria-label="Look and Choose" className="menu-game-card game-card group relative bg-white rounded-[24px] sm:rounded-[36px] shadow-xl border-4 border-transparent hover:border-purple-400 transition-all text-center aspect-[21/9] w-full overflow-hidden" onClick={() => onStartGame('lookchoose')}>
          <span className="sr-only">Look & Choose</span>
        </button>
        <button type="button" data-menu-key="pronunciation" aria-label="Pronunciation" className="menu-game-card game-card group relative bg-white rounded-[24px] sm:rounded-[36px] shadow-xl border-4 border-transparent hover:border-green-400 transition-all text-center aspect-[21/9] w-full overflow-hidden" onClick={() => onStartGame('pronunciation')}>
          <span className="sr-only">Pronunciation</span>
        </button>
      </div>
    </div>
  )
}

function LegacyGameBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 sm:mb-6 inline-flex items-center gap-2 bg-white border-4 border-green-400 text-green-800 font-black text-base sm:text-lg px-6 py-3 rounded-full shadow-[0_8px_20px_rgba(34,197,94,0.28)] hover:bg-green-50 hover:border-green-500 hover:shadow-[0_12px_25px_rgba(34,197,94,0.34)] transform hover:-translate-y-1 transition-all active:scale-95 group w-fit relative z-[70]"
    >
      <span className="inline-block group-hover:-translate-x-1 transition-transform text-xl sm:text-2xl leading-none">←</span>
      Quay lại Menu Game
    </button>
  )
}

export function LegacyListenChooseGame({ questions, onBack, onComplete }: { questions: ListenChooseQuestion[]; onBack: () => void; onComplete: (score: number, correct: number, total: number) => void }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [answerState, setAnswerState] = useState<{ selected: string; ok: boolean } | null>(null)
  const question = questions[index]

  useEffect(() => {
    if (question?.audio) playAudio(question.audio)
  }, [index, question?.audio])

  function answer(selected: string) {
    if (!question || locked) return
    setLocked(true)
    const ok = selected === question.correct
    const nextScore = score + (ok ? 100 : 0)
    const nextCorrect = correct + (ok ? 1 : 0)
    setAnswerState({ selected, ok })
    if (ok) {
      const successText = GAME_SUCCESS_MESSAGES[Math.max(0, nextCorrect - 1) % GAME_SUCCESS_MESSAGES.length]
      setFeedback(successText)
      playChildFeedback(true, successText)
    } else {
      playChildFeedback(false)
    }
    window.setTimeout(() => {
      setFeedback('')
      setAnswerState(null)
      setLocked(false)
      if (index >= questions.length - 1) onComplete(nextScore, nextCorrect, questions.length)
      else {
        setScore(nextScore)
        setCorrect(nextCorrect)
        setIndex(index + 1)
      }
    }, ok ? 1000 : 800)
  }

  function optionClass(imgUrl: string) {
    if (!answerState) return ''
    if (answerState.ok && imgUrl === question?.correct) {
      return 'border-green-500 bg-green-50 ring-4 ring-green-200 scale-105 z-10'
    }
    if (!answerState.ok && imgUrl === answerState.selected) {
      return 'animate-shake border-red-500 bg-red-50'
    }
    return ''
  }

  if (!questions.length) {
    return (
      <div id="game-play-view" className="animate-slide-up w-full">
        <LegacyGameBackButton onBack={onBack} />
        <p className="text-center text-green-700 font-bold py-20">Chưa có dữ liệu cho game này.</p>
      </div>
    )
  }

  return (
    <div id="game-play-view" className="animate-slide-up w-full">
      <div className="w-full mx-auto px-2 sm:px-4">
        <LegacyGameBackButton onBack={onBack} />
        <section className="bg-white/95 rounded-[28px] sm:rounded-[36px] md:rounded-[40px] border border-green-100 shadow-2xl p-4 sm:p-6 md:p-8 text-center game-section relative">
          <div id="game-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 text-center font-black text-lg sm:text-xl">
            <div className="bg-green-50 py-4 rounded-3xl text-green-700 shadow-sm">⭐ Điểm: <span id="game-score">{score}</span></div>
            <div className="bg-emerald-50 py-4 rounded-3xl text-emerald-700 shadow-sm">📚 Từ: <span id="game-progress">{index + 1}/{questions.length}</span></div>
            <div className="bg-lime-50 py-4 rounded-3xl text-lime-700 shadow-sm">✅ Đúng: <span id="game-correct-count">{correct}</span></div>
          </div>

          {!question ? (
            <div id="game-loading" className="py-16 sm:py-20 text-green-500 font-bold text-lg sm:text-xl animate-pulse">Đang chuẩn bị câu hỏi...</div>
          ) : (
            <div id="game-content">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 sm:mb-8">Nghe và chọn hình đúng</h2>
              <button
                type="button"
                onClick={() => playAudio(question.audio)}
                className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition-transform active:scale-90 flex items-center justify-center mx-auto mb-8 sm:mb-12"
              >
                <span className="text-4xl sm:text-5xl">🔊</span>
              </button>
              <div id="options-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
                {question.options.map((imgUrl, i) => (
                  <button
                    key={`${imgUrl}-${i}`}
                    type="button"
                    disabled={locked}
                    className={`group ${CARD_TONES[i % CARD_TONES.length]} p-2 sm:p-3 md:p-4 rounded-[20px] sm:rounded-[28px] border-4 border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.10)] hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 min-h-[8rem] sm:min-h-[10rem] md:min-h-[12rem] flex items-center justify-center ${optionClass(imgUrl)}`}
                    onClick={() => answer(imgUrl)}
                  >
                    <img src={imgUrl} alt="" className="w-full h-24 sm:h-32 md:h-40 object-contain rounded-2xl" loading="eager" decoding="async" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div id="game-feedback-layer" className={`${feedback ? 'flex' : 'hidden'} absolute inset-0 z-50 items-center justify-center pointer-events-none px-6`}>
            {feedback && <div className="game-success-badge">✨ {feedback} ✨</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

export function LegacyLookChooseGame({ questions, onBack, onComplete }: { questions: LookChooseQuestion[]; onBack: () => void; onComplete: (score: number, correct: number, total: number) => void }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [locked, setLocked] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [answerState, setAnswerState] = useState<{ selected: string; ok: boolean } | null>(null)
  const question = questions[index]

  function answer(selected: string) {
    if (!question || locked) return
    setLocked(true)
    const ok = selected === question.correct
    const nextScore = score + (ok ? 100 : 0)
    const nextCorrect = correct + (ok ? 1 : 0)
    setAnswerState({ selected, ok })
    if (ok) {
      const successText = GAME_SUCCESS_MESSAGES[Math.max(0, nextCorrect - 1) % GAME_SUCCESS_MESSAGES.length]
      setFeedback(successText)
      playChildFeedback(true, successText)
    } else {
      playChildFeedback(false)
    }
    window.setTimeout(() => {
      setFeedback('')
      setAnswerState(null)
      setLocked(false)
      if (index >= questions.length - 1) onComplete(nextScore, nextCorrect, questions.length)
      else {
        setScore(nextScore)
        setCorrect(nextCorrect)
        setIndex(index + 1)
      }
    }, ok ? 1000 : 800)
  }

  function optionClass(text: string) {
    if (!answerState) return ''
    if (answerState.ok && text === question?.correct) {
      return 'border-green-500 bg-green-50 ring-4 ring-green-200 scale-105 z-10'
    }
    if (!answerState.ok && text === answerState.selected) {
      return 'animate-shake border-red-500 bg-red-50'
    }
    return ''
  }

  if (!questions.length) {
    return (
      <div id="game-play-view" className="animate-slide-up w-full">
        <LegacyGameBackButton onBack={onBack} />
        <p className="text-center text-green-700 font-bold py-20">Chưa có dữ liệu cho game này.</p>
      </div>
    )
  }

  return (
    <div id="game-play-view" className="animate-slide-up w-full">
      <div className="w-full mx-auto px-2 sm:px-4">
        <LegacyGameBackButton onBack={onBack} />
        <section className="bg-white/95 rounded-[28px] sm:rounded-[36px] md:rounded-[40px] border border-green-100 shadow-2xl p-4 sm:p-6 md:p-8 text-center game-section relative">
          <div id="game-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 text-center font-black text-lg sm:text-xl">
            <div className="bg-green-50 py-4 rounded-3xl text-green-700 shadow-sm">⭐ Điểm: <span>{score}</span></div>
            <div className="bg-emerald-50 py-4 rounded-3xl text-emerald-700 shadow-sm">📚 Từ: <span>{index + 1}/{questions.length}</span></div>
            <div className="bg-lime-50 py-4 rounded-3xl text-lime-700 shadow-sm">✅ Đúng: <span>{correct}</span></div>
          </div>

          {question && (
            <div id="game-content">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-5 sm:mb-6">Nhìn hình và chọn từ đúng</h2>
              <div className="mb-6 animate-fade-in">
                <img src={question.image} alt={question.correct} className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 object-contain mx-auto rounded-3xl shadow-lg border-[6px] border-white bg-gradient-to-br from-sky-50 via-white to-indigo-100 p-2" loading="eager" decoding="async" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
                {question.options.map((text) => (
                  <button
                    key={text}
                    type="button"
                    disabled={locked}
                    className={`bg-white py-4 sm:py-5 md:py-6 px-4 sm:px-6 rounded-[20px] sm:rounded-[28px] border-4 border-gray-100 text-lg sm:text-xl md:text-2xl font-black text-blue-800 shadow-lg hover:border-purple-400 hover:bg-purple-50 transition-all active:scale-95 min-h-[4rem] sm:min-h-[5rem] flex items-center justify-center text-center ${optionClass(text)}`}
                    onClick={() => answer(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div id="game-feedback-layer" className={`${feedback ? 'flex' : 'hidden'} absolute inset-0 z-50 items-center justify-center pointer-events-none px-6`}>
            {feedback && <div className="game-success-badge">✨ {feedback} ✨</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

export function LegacyPronunciationGame({ questions, onBack, onComplete }: {
  questions: PronunciationQuestion[]
  unitSlug?: string
  level?: string
  week?: string
  onBack: () => void
  onComplete: (score: number, correct: number, total: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [questionLocked, setQuestionLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const advanceTimerRef = useRef<number | null>(null)
  const question = questions[index]

  const successMessage = useMemo(
    () => GAME_SUCCESS_MESSAGES[Math.max(0, correct) % GAME_SUCCESS_MESSAGES.length],
    [correct],
  )

  const handleMatch = useCallback(() => {
    setQuestionLocked(true)
    const nextScore = score + 100
    const nextCorrect = correct + 1

    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
    }

    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      if (index >= questions.length - 1) {
        onComplete(nextScore, nextCorrect, questions.length)
        return
      }
      setScore(nextScore)
      setCorrect(nextCorrect)
      setIndex(index + 1)
      setQuestionLocked(false)
    }, 2000)
  }, [correct, index, onComplete, questions.length, score])

  const {
    status,
    recording,
    recordDisabled,
    micPanelState,
    startRecording,
    requestMicAccess,
    abortRecognition,
    resetForQuestion,
  } = usePronunciationSpeech({
    targetText: question?.en || '',
    questionLocked,
    onMatch: handleMatch,
    successMessage,
  })

  const micPanel = getMicPanelCopy(micPanelState)
  const showMicPanel = micPanelState !== 'granted' && micPanelState !== 'hidden'

  useEffect(() => {
    setLoading(false)
  }, [questions])

  useEffect(() => {
    resetForQuestion()
    setQuestionLocked(false)
  }, [index, resetForQuestion])

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
    }
    abortRecognition(true)
  }, [abortRecognition])

  function nextQuestion() {
    abortRecognition(true)
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setQuestionLocked(false)
    if (index >= questions.length - 1) onComplete(score, correct, questions.length)
    else setIndex(index + 1)
  }

  const recordButtonClass = recording
    ? 'flex items-center justify-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-[28px] sm:rounded-[32px] text-xl sm:text-2xl font-black shadow-[0_15px_30px_rgba(225,29,72,0.3)] ring-4 ring-red-300 animate-pulse transition-all active:scale-95 group opacity-80 cursor-not-allowed'
    : 'flex items-center justify-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-[28px] sm:rounded-[32px] text-xl sm:text-2xl font-black shadow-[0_15px_30px_rgba(225,29,72,0.3)] hover:-translate-y-1 hover:shadow-xl transition-all animate-pulse active:scale-95 group'

  if (!questions.length) {
    return (
      <div id="pronunciation-game-view" className="animate-slide-up w-full">
        <LegacyGameBackButton onBack={onBack} />
        <p className="text-center text-green-700 font-bold py-20">Chưa có dữ liệu cho game này.</p>
      </div>
    )
  }

  return (
    <div id="pronunciation-game-view" className="animate-slide-up w-full">
      <div className="w-full mx-auto px-2 sm:px-4">
        <LegacyGameBackButton onBack={() => { abortRecognition(true); onBack() }} />
        <section className="bg-white/95 rounded-[36px] sm:rounded-[48px] md:rounded-[60px] border border-blue-100 shadow-2xl overflow-hidden w-full flex flex-col relative game-section">
          {loading || !question ? (
            <div id="speech-loading" role="status" aria-live="polite" className="min-h-[30vh] sm:min-h-[40vh] flex flex-col items-center justify-center gap-4 px-6 py-14 sm:py-16 text-center">
              <div className="h-16 w-16 rounded-full border-4 border-green-200 border-t-green-500 animate-spin" />
              <div className="text-green-600 font-black text-lg sm:text-xl md:text-2xl animate-pulse">Đang chuẩn bị câu hỏi...</div>
            </div>
          ) : (
            <div id="speech-content" className="flex flex-col">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-6 md:p-8 bg-gradient-to-b from-green-50/50 to-transparent text-center font-black text-sm sm:text-lg md:text-xl">
                <div className="bg-white/80 backdrop-blur border border-green-100 py-3 sm:py-4 rounded-2xl text-green-700 shadow-sm">⭐ <span id="speech-score" className="text-xl sm:text-2xl drop-shadow-sm">{score}</span></div>
                <div className="bg-white/80 backdrop-blur border border-emerald-100 py-3 sm:py-4 rounded-2xl text-emerald-700 shadow-sm">📚 <span id="speech-progress" className="text-xl sm:text-2xl drop-shadow-sm">{index + 1}/{questions.length}</span></div>
                <div className="bg-white/80 backdrop-blur border border-green-100 py-3 sm:py-4 rounded-2xl text-green-700 shadow-sm">✅ <span id="speech-correct-count" className="text-xl sm:text-2xl drop-shadow-sm">{correct}</span></div>
              </div>

              <div className="flex-1 p-4 sm:p-6 md:p-8 text-center flex flex-col justify-center items-center relative overflow-hidden min-h-[30vh] sm:min-h-[40vh]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 z-0">
                  <div className="absolute w-40 h-40 sm:w-64 sm:h-64 bg-green-300 rounded-full mix-blend-multiply filter blur-[40px] animate-pulse" />
                  <div className="absolute w-40 h-40 sm:w-64 sm:h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-[40px] animate-pulse" style={{ animationDelay: '2s', transform: 'translateX(30px)' }} />
                </div>
                <div className="relative z-10 mb-6 sm:mb-8 md:mb-10 group">
                  <div className="absolute inset-0 bg-green-100/50 rounded-[32px] sm:rounded-[44px] transform rotate-3 scale-105 transition-transform group-hover:rotate-6" />
                  {question.image ? (
                    <img id="speech-img" src={question.image} alt={question.en} className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain bg-white rounded-[32px] sm:rounded-[44px] p-4 sm:p-6 md:p-8 shadow-[0_20px_50px_rgba(59,130,246,0.15)] border-4 border-white transition-transform hover:-translate-y-2" />
                  ) : (
                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 bg-white rounded-[32px] flex items-center justify-center text-gray-400 font-bold">No image</div>
                  )}
                </div>
                <h2 id="speech-en" className="relative z-10 text-4xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-emerald-600 drop-shadow-sm uppercase">{question.en}</h2>
                <div className="relative z-10 px-8 sm:px-10 py-3 bg-white/70 backdrop-blur-md rounded-full text-lg md:text-2xl font-bold border-2 border-green-50 shadow-inner text-gray-600 inline-block">
                  <span id="speech-vi">{question.vi}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 md:p-8 flex flex-wrap justify-center items-center gap-3 sm:gap-6 bg-gradient-to-t from-gray-50 to-white relative z-20">
                <button type="button" onClick={() => playAudio(question.audio)} className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white text-green-600 rounded-[24px] text-lg sm:text-xl font-black border-4 border-green-100 shadow-md hover:bg-green-50 hover:border-green-300 transition-all active:scale-95 group">
                  <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">🔊</span> Nghe
                </button>
                <button
                  id="btn-record"
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={recordDisabled || recording || questionLocked}
                  className={`${recordButtonClass} ${recordDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  aria-disabled={recordDisabled || recording || questionLocked}
                >
                  <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">{recording ? '🎙' : '🎤'}</span>
                  {recording ? 'Đang nghe...' : 'Ghi âm'}
                </button>
                <button type="button" onClick={nextQuestion} className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white text-green-600 rounded-[24px] text-lg sm:text-xl font-black border-4 border-green-100 shadow-md hover:bg-green-50 hover:border-green-300 transition-all active:scale-95 group">
                  Tới ➜
                </button>
              </div>

              {showMicPanel && (
                <div id="speech-mic-panel" className="mx-4 sm:mx-6 md:mx-8 mb-4 sm:mb-6 rounded-[28px] border-2 border-amber-200 bg-amber-50/95 px-4 py-4 sm:px-6 sm:py-5 shadow-lg">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-left">
                      <p id="speech-mic-title" className="text-amber-900 font-black text-lg sm:text-xl">{micPanel.title}</p>
                      <p id="speech-mic-detail" className="text-amber-800 text-sm sm:text-base font-semibold">{micPanel.detail}</p>
                    </div>
                    <button
                      id="btn-enable-mic"
                      type="button"
                      onClick={() => void requestMicAccess()}
                      disabled={micPanel.buttonDisabled}
                      className={`self-start sm:self-center px-5 py-3 rounded-[20px] bg-amber-500 text-white font-black text-base sm:text-lg shadow-lg hover:bg-amber-600 transition-all active:scale-95 ${micPanel.buttonDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {micPanel.buttonText}
                    </button>
                  </div>
                </div>
              )}

              <div id="speech-status" role="status" aria-live="polite" className="px-4 py-5 sm:py-6 bg-gradient-to-r from-green-100 via-emerald-50 to-green-100 text-green-800 text-center font-black text-lg sm:text-xl md:text-2xl border-t border-green-100 relative z-20 shadow-inner">
                {status}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export function LegacyCatchGame({ questions, onBack, onComplete }: { questions: PronunciationQuestion[]; onBack: () => void; onComplete: (score: number, correct: number, total: number) => void }) {
  const areaRef = useRef<HTMLDivElement>(null)
  const basketRef = useRef<HTMLDivElement>(null)
  const catchItemsRef = useRef<CatchItem[]>([])
  const metricsRef = useRef({
    areaLeft: 0,
    areaWidth: 0,
    areaHeight: 0,
    basketHalfWidth: 0,
    basketX: 0,
    basketLeft: 0,
    basketRight: 0,
    basketTop: 0,
    basketBottom: 0,
    groundLimit: 0,
    lastFrameTime: 0,
    pendingPointerX: null as number | null,
    pointerRafId: 0,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [timer, setTimer] = useState(60)
  const [basketBounce, setBasketBounce] = useState(false)
  const [scorePopKey, setScorePopKey] = useState(0)
  const correctRef = useRef(0)
  const scoreRef = useRef(0)
  const remainingRef = useRef(60)

  const refreshMetrics = useCallback(() => {
    const area = areaRef.current
    const basket = basketRef.current
    const m = metricsRef.current
    if (!area || !basket) return
    const areaRect = area.getBoundingClientRect()
    m.areaLeft = areaRect.left
    m.areaWidth = area.clientWidth
    m.areaHeight = area.clientHeight
    m.basketHalfWidth = basket.offsetWidth / 2
    m.groundLimit = m.areaHeight * 0.88
    m.basketTop = m.groundLimit - basket.offsetHeight
    m.basketBottom = m.basketTop + basket.offsetHeight
    m.basketX = Math.max(m.basketHalfWidth, Math.min(m.areaWidth - m.basketHalfWidth, m.basketX || m.areaWidth / 2))
    m.basketLeft = m.basketX - m.basketHalfWidth
    m.basketRight = m.basketX + m.basketHalfWidth
    if (basket) {
      basket.style.left = '0px'
      basket.style.transform = `translate3d(${m.basketLeft}px, 0, 0)`
    }
  }, [])

  const stopLoop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (spawnRef.current) clearTimeout(spawnRef.current)
    cancelAnimationFrame(animRef.current)
    if (metricsRef.current.pointerRafId) cancelAnimationFrame(metricsRef.current.pointerRafId)
    catchItemsRef.current.forEach((item) => item.element.remove())
    catchItemsRef.current = []
  }, [])

  useEffect(() => {
    if (!questions.length) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all(questions.map((q) => (q.image ? preloadImage(q.image) : Promise.resolve()))).finally(() => setLoading(false))
    return () => stopLoop()
  }, [questions, stopLoop])

  useEffect(() => {
    if (!started) return
    refreshMetrics()
    const onResize = () => refreshMetrics()
    window.addEventListener('resize', onResize)

    const tickTimer = () => {
      remainingRef.current -= 1
      setTimer(remainingRef.current)
      if (remainingRef.current <= 0) {
        stopLoop()
        onComplete(scoreRef.current, correctRef.current, correctRef.current)
      } else {
        timerRef.current = setTimeout(tickTimer, 1000)
      }
    }
    timerRef.current = setTimeout(tickTimer, 1000)

    const spawn = () => {
      if (remainingRef.current <= 0) return
      const area = areaRef.current
      if (!area || !questions.length) return
      const q = questions[Math.floor(Math.random() * questions.length)]
      const size = window.innerWidth < 480 ? 60 : window.innerWidth < 768 ? 80 : 110
      const m = metricsRef.current
      const areaWidth = m.areaWidth || area.clientWidth
      const x = Math.max(8, Math.min(areaWidth - size - 8, Math.random() * areaWidth))
      const el = document.createElement('div')
      el.className = 'absolute pointer-events-none catch-falling-item'
      el.style.width = `${size}px`
      el.style.height = `${size}px`
      el.style.left = `${x}px`
      el.style.top = '0px'
      el.style.transform = `translate3d(0, ${-size}px, 0)`
      el.innerHTML = `<img src="${q.image}" class="w-full h-full object-contain pointer-events-none" loading="eager" decoding="async" style="border-radius:12px;">`
      area.appendChild(el)
      const baseSpeed = window.innerHeight < 600 ? 1.5 : window.innerHeight < 800 ? 2 : 2.5
      catchItemsRef.current.push({ element: el, x, y: -size, size, speed: baseSpeed + Math.random() * 1.5, data: q })
      spawnRef.current = setTimeout(spawn, 1500 + Math.random() * 2000)
    }
    spawn()

    const loop = (timestamp = 0) => {
      const area = areaRef.current
      const m = metricsRef.current
      if (!area) return
      if (!m.areaWidth || !m.areaHeight || !m.basketHalfWidth) refreshMetrics()
      const frameDelta = m.lastFrameTime ? timestamp - m.lastFrameTime : CATCH_FRAME_MS
      if (frameDelta < CATCH_FRAME_MS) {
        animRef.current = requestAnimationFrame(loop)
        return
      }
      const frameScale = Math.min(frameDelta, 50) / CATCH_FRAME_MS
      m.lastFrameTime = timestamp

      for (let i = catchItemsRef.current.length - 1; i >= 0; i--) {
        const item = catchItemsRef.current[i]
        item.y += item.speed * frameScale
        item.element.style.transform = `translate3d(0, ${item.y}px, 0)`
        const itemCenterX = item.x + item.size / 2
        const itemCenterY = item.y + item.size / 2
        const touching = item.y + item.size >= m.basketTop + 10
        const above = itemCenterY < m.basketBottom
        const inside = itemCenterX > m.basketLeft && itemCenterX < m.basketRight
        if (touching && above && inside) {
          correctRef.current += 1
          scoreRef.current += 10
          setScore(scoreRef.current)
          setScorePopKey((key) => key + 1)
          setBasketBounce(true)
          window.setTimeout(() => setBasketBounce(false), 400)
          playAudio(item.data.audio)
          if (area) {
            showCatchFloatingText(area, item.data.en, item.x, item.y)
            spawnCatchSparkles(area, item.x + item.size / 2, item.y + item.size / 2)
          }
          item.element.style.transition = 'transform 0.2s, opacity 0.2s'
          item.element.style.transform = `translate3d(0, ${item.y}px, 0) scale(1.3)`
          item.element.style.opacity = '0'
          window.setTimeout(() => item.element.remove(), 200)
          catchItemsRef.current.splice(i, 1)
          continue
        }
        if (item.y > m.groundLimit) {
          item.element.style.transition = 'opacity 0.3s, transform 0.3s'
          item.element.style.opacity = '0'
          window.setTimeout(() => item.element.remove(), 300)
          catchItemsRef.current.splice(i, 1)
        }
      }
      if (remainingRef.current > 0) animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', onResize)
      stopLoop()
    }
  }, [started, onComplete, questions, refreshMetrics, stopLoop])

  function handlePointerMove(e: React.PointerEvent) {
    const m = metricsRef.current
    if (!m.areaWidth || !m.basketHalfWidth) refreshMetrics()
    m.pendingPointerX = e.clientX - m.areaLeft
    if (m.pointerRafId) return
    m.pointerRafId = requestAnimationFrame(() => {
      m.pointerRafId = 0
      if (m.pendingPointerX === null) return
      m.basketX = m.pendingPointerX
      m.pendingPointerX = null
      m.basketLeft = m.basketX - m.basketHalfWidth
      m.basketRight = m.basketX + m.basketHalfWidth
      if (basketRef.current) {
        basketRef.current.style.transform = `translate3d(${m.basketLeft}px, 0, 0)`
      }
    })
  }

  function startGame() {
    correctRef.current = 0
    scoreRef.current = 0
    remainingRef.current = 60
    setScore(0)
    setTimer(60)
    setStarted(true)
    metricsRef.current.basketX = areaRef.current ? areaRef.current.clientWidth / 2 : 0
    refreshMetrics()
  }

  if (!questions.length) {
    return (
      <div id="catch-game-view" className="animate-slide-up w-full h-full">
        <LegacyGameBackButton onBack={onBack} />
        <p className="text-center text-green-700 font-bold py-20">Chưa có dữ liệu cho game này.</p>
      </div>
    )
  }

  return (
    <div id="catch-game-view" className="animate-slide-up w-full h-full">
      <div className="w-full mx-auto px-2 sm:px-4 h-full flex flex-col">
        <LegacyGameBackButton onBack={() => { stopLoop(); onBack() }} />
        <section className="bg-white/90 backdrop-blur-sm rounded-[20px] sm:rounded-[28px] md:rounded-[36px] border-2 border-green-100/80 shadow-[0_8px_40px_rgba(34,197,94,0.10),0_2px_8px_rgba(0,0,0,0.05)] p-2.5 sm:p-4 md:p-5 text-center game-section relative flex flex-col overflow-hidden min-h-[calc(100vh-12rem)] sm:min-h-[calc(100vh-14rem)]">
          <div id="catch-stats" className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 shrink-0 z-10 w-full">
            <div className="catch-stat-card flex flex-col items-center justify-center gap-0.5">
              <span className="catch-stat-icon text-xl sm:text-2xl">⭐</span>
              <span key={scorePopKey} id="catch-score" className={`catch-stat-value font-black text-green-600 tabular-nums ${scorePopKey > 0 ? 'catch-score-pop' : ''}`}>{score}</span>
              <span className="catch-stat-label text-xs font-bold text-green-800/60 uppercase tracking-wider">Điểm</span>
            </div>
            <div id="catch-timer-card" className="catch-stat-card flex flex-col items-center justify-center gap-0.5">
              <span className="catch-stat-icon text-xl sm:text-2xl">⏱️</span>
              <div className="flex items-baseline gap-0.5">
                <span id="catch-timer" className={`catch-stat-value font-black tabular-nums ${timer <= 10 ? 'text-red-600' : timer <= 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{timer}</span>
                <span className="text-xs font-bold text-emerald-500">s</span>
              </div>
              <span className="catch-stat-label text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Thời gian</span>
            </div>
          </div>

          {loading && (
            <div id="catch-loading" className="flex-1 flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-green-200 border-t-green-500 animate-spin" />
              <p className="text-green-500 font-bold text-base sm:text-lg">Đang chuẩn bị màn chơi...</p>
            </div>
          )}

          {!loading && (
            <div
              id="catch-game-area"
              ref={areaRef}
              className="relative flex-1 w-full catch-sky-bg rounded-[14px] sm:rounded-[20px] md:rounded-[24px] border-2 border-green-200/60 overflow-hidden cursor-crosshair touch-none shadow-inner"
              style={{ minHeight: 'max(45vh, 280px)' }}
              onPointerMove={handlePointerMove}
            >
              <div className="catch-sun" />
              <div className="catch-ground" />
              {!started && (
                <div id="catch-start-overlay" className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/20 to-green-50/30 backdrop-blur-[1px] z-[100] flex flex-col items-center justify-center gap-4 sm:gap-6">
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-2 animate-bounce">🧺</div>
                  <button type="button" onClick={startGame} className="catch-start-btn">
                    <span className="text-2xl sm:text-3xl">▶</span> BẮT ĐẦU
                  </button>
                  <p className="text-sm sm:text-base text-gray-500 font-semibold mt-1">Di chuột / kéo tay để hứng từ vựng!</p>
                </div>
              )}
              <div
                id="catch-basket"
                ref={basketRef}
                className={`absolute bottom-[12%] left-0 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 select-none flex items-center justify-center catch-basket-glow ${basketBounce ? 'catch-basket-bounce' : ''}`}
                style={{ touchAction: 'none', pointerEvents: 'none', zIndex: 50 }}
              >
                <span className="catch-basket-icon text-5xl sm:text-7xl md:text-8xl leading-none" style={{ pointerEvents: 'none' }}>🧺</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export function LegacySummaryView({ summary, onMenu, onReplay }: { summary: { score: number; correct: number; total: number }; onMenu: () => void; onReplay: () => void }) {
  return (
    <div id="game-summary-view" className="animate-slide-up w-full">
      <div className="w-full max-w-2xl mx-auto px-4 mt-8 sm:mt-12">
        <section className="bg-white/95 rounded-[36px] sm:rounded-[48px] border border-yellow-200 shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-green-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }} />
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-6 drop-shadow-sm uppercase">Chúc mừng bé!</h2>
          <p className="text-lg sm:text-xl text-gray-600 font-bold mb-8">Bé đã hoàn thành xuất sắc trò chơi 🏆</p>
          <div className="bg-yellow-50 border-4 border-yellow-200 rounded-3xl p-6 mb-8 shadow-inner max-w-sm mx-auto">
            <div className="text-5xl sm:text-7xl font-black text-yellow-500 mb-2 drop-shadow-md" id="summary-score">{summary.score}</div>
            <div className="text-sm sm:text-base font-bold text-yellow-700 uppercase tracking-wide">Điểm Khám Phá</div>
          </div>
          <div className="flex justify-center gap-4 sm:gap-6 mb-10 text-sm sm:text-lg font-bold">
            <div className="bg-green-100 text-green-700 px-4 sm:px-6 py-3 rounded-2xl shadow-sm border border-green-200 flex items-center gap-2">
              <span className="text-xl">✅</span> <span id="summary-correct">{summary.correct}</span> Đúng
            </div>
            <div className="bg-green-100 text-green-700 px-4 sm:px-6 py-3 rounded-2xl shadow-sm border border-green-200 flex items-center gap-2">
              <span className="text-xl">🎯</span> <span id="summary-total">{summary.total}</span> Câu
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={onReplay} className="py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-[24px] text-lg sm:text-xl font-black shadow-[0_10px_20px_rgba(34,197,94,0.28)] hover:-translate-y-1 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">🔄 Chơi lại nhé</button>
            <button type="button" onClick={onMenu} className="py-4 px-6 bg-white text-green-600 border-4 border-green-100 rounded-[24px] text-lg sm:text-xl font-black shadow-lg hover:border-green-300 hover:bg-green-50 transition-all active:scale-95 flex items-center justify-center gap-2">🎮 Chọn Game Khác</button>
          </div>
        </section>
      </div>
    </div>
  )
}

let activeAudio: HTMLAudioElement | null = null

function stopActiveAudio() {
  if (!activeAudio) return
  try {
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    // Do not call load() here — it can abort the next play() in some browsers.
  } catch {
    // ignore cleanup errors
  }
  activeAudio = null
}

/** Keep a live Audio reference so the browser cannot GC it mid-play (causes intermittent silence). */
function playAudio(url: string) {
  if (!url) return

  // Avoid TTS + MP3 fighting for the same audio output.
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }

  stopActiveAudio()

  const audio = new Audio()
  activeAudio = audio
  audio.preload = 'auto'
  audio.src = url

  const tryPlay = () => {
    if (activeAudio !== audio) return
    void audio.play().catch(() => undefined)
  }

  // If metadata is already ready, play immediately (preserves user-gesture unlock).
  if (audio.readyState >= 2) tryPlay()
  else {
    audio.addEventListener('canplay', tryPlay, { once: true })
    tryPlay()
  }
}

function playChildFeedback(success: boolean, text = '') {
  if (!window.speechSynthesis) return
  stopActiveAudio()
  const utterance = new SpeechSynthesisUtterance(success ? (text || 'Excellent!') : 'Oops!')
  utterance.lang = 'en-US'
  utterance.rate = 0.95
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function showCatchFloatingText(area: HTMLElement, text: string, x: number, y: number) {
  const el = document.createElement('div')
  el.className = 'absolute pointer-events-none animate-float-up z-50'
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.innerHTML = `<div style="background: linear-gradient(135deg, #ff9800, #ff5722); color: white; font-weight: 900; font-size: clamp(0.9rem, 2.5vw, 1.4rem); padding: 0.3rem 0.8rem; border-radius: 9999px; box-shadow: 0 4px 16px rgba(255,87,34,0.35); white-space: nowrap;">+10 ${text}</div>`
  area.appendChild(el)
  window.setTimeout(() => el.remove(), 1400)
}

function spawnCatchSparkles(area: HTMLElement, cx: number, cy: number) {
  const sparkles = ['✨', '⭐', '💫', '🌟']
  for (let i = 0; i < 4; i++) {
    const sp = document.createElement('div')
    sp.className = 'catch-sparkle'
    sp.innerText = sparkles[i % sparkles.length]
    sp.style.left = `${cx + (Math.random() - 0.5) * 60}px`
    sp.style.top = `${cy + (Math.random() - 0.5) * 60}px`
    sp.style.fontSize = `${16 + Math.random() * 16}px`
    area.appendChild(sp)
    window.setTimeout(() => sp.remove(), 600)
  }
}

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}
