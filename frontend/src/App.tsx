import { useCallback, useEffect, useState } from 'react'
import {
  getAllGameData,
  getBootstrap,
  type GameAllResponse,
  type Level,
  type Unit,
} from './api'
import { LOGO_URL, resolveGameBackground } from './assetsConfig'
import {
  LegacyCatchGame,
  LegacyHomeLayout,
  LegacyListenChooseGame,
  LegacyLookChooseGame,
  LegacyMenuView,
  LegacyPronunciationGame,
  LegacySummaryView,
  type GameType,
} from './legacyUi'
import {
  parseAppLocation,
  pushAppUrl,
  replaceAppUrl,
  resolveUnitSlug,
  type AppRoute,
  unitParamFromSlug,
} from './routing'
import type { SidebarUnitItem } from './sidebarUnits'

export function App() {
  const initial = parseAppLocation()
  const [route, setRoute] = useState<AppRoute>(initial.route)
  const [game, setGame] = useState(initial.game)
  const [week, setWeek] = useState(initial.week)
  const [levels, setLevels] = useState<Level[]>([])
  const [level, setLevel] = useState(initial.level)
  const [units, setUnits] = useState<Unit[]>([])
  const [unitSlug, setUnitSlug] = useState('')
  const [menuBackgroundMap, setMenuBackgroundMap] = useState<Record<string, string>>({})
  const [datasets, setDatasets] = useState<GameAllResponse>({ listenchoose: [], lookchoose: [], pronunciation: [] })
  const [activeGame, setActiveGame] = useState<GameType>(initial.activeGame)
  const [summary, setSummary] = useState({ score: 0, correct: 0, total: 0 })
  const [status, setStatus] = useState('')

  const selectedUnit = units.find((unit) => unit.slug === unitSlug)
  const unitParam = unitParamFromSlug(units, unitSlug)

  const navigate = useCallback((next: {
    route: AppRoute
    game?: string
    week?: string
    level?: string
    unitSlug?: string
    activeGame?: GameType
    replace?: boolean
  }) => {
    const nextGame = next.game ?? game
    const nextWeek = next.week ?? week
    const nextLevel = next.level ?? level
    const nextSlug = next.unitSlug ?? unitSlug
    const nextActiveGame = next.activeGame ?? activeGame
    const unitParam = unitParamFromSlug(units, nextSlug)

    const urlState = {
      route: next.route,
      game: nextGame,
      week: nextWeek,
      level: nextLevel,
      unitParam,
      activeGame: nextActiveGame,
    }

    if (next.replace) replaceAppUrl(urlState)
    else pushAppUrl(urlState)

    setRoute(next.route)
    setGame(nextGame)
    setWeek(nextWeek)
    setLevel(nextLevel)
    if (next.unitSlug) setUnitSlug(next.unitSlug)
    if (next.activeGame) setActiveGame(next.activeGame)
  }, [activeGame, game, level, unitSlug, units, week])

  const applyLocation = useCallback((location = parseAppLocation()) => {
    setRoute(location.route)
    setGame(location.game)
    setWeek(location.week)
    setLevel(location.level)
    setActiveGame(location.activeGame)
    setUnitSlug((current) => resolveUnitSlug(units, location.unitParam, current))
  }, [units])

  useEffect(() => {
    applyGameBackground(resolveGameBackground())
    getBootstrap(game)
      .then((data) => {
        setLevels(data.levels)
        setUnits(data.units)
        applyGameBackground(data.gameBgImageUrl || resolveGameBackground())
        setMenuBackgroundMap(data.gameMenuBackgroundMap || {})
        setStatus('')
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : 'Không tải được dữ liệu.'))
  }, [game])

  useEffect(() => {
    const file = window.location.pathname.split('/').pop()?.toLowerCase() || ''
    if (file === '' || file === 'index.html') {
      replaceAppUrl({ route: 'chooseGame', game, week, level })
    }
  }, [])

  useEffect(() => {
    if (!units.length) return
    const location = parseAppLocation()
    const slug = resolveUnitSlug(units, location.unitParam, unitSlug)
    if (slug !== unitSlug) setUnitSlug(slug)

    if (['home', 'play', 'summary'].includes(route)) {
      const unitParam = unitParamFromSlug(units, slug)
      replaceAppUrl({
        route,
        game,
        week,
        level,
        unitParam,
        activeGame,
      })
    }
  }, [units, route, game, week, level, unitSlug, activeGame])

  useEffect(() => {
    if (!unitSlug) return
    getAllGameData({ slug: unitSlug, level, week, game })
      .then((data) => {
        setDatasets(data)
        setStatus('')
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : 'Không tải được dữ liệu game.'))
  }, [game, level, unitSlug, week])

  useEffect(() => {
    const onPopState = () => applyLocation()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [applyLocation])

  function completeGame(score: number, correct: number, total: number) {
    setSummary({ score, correct, total })
    navigate({ route: 'summary', replace: false })
  }

  function startGame(gameType: GameType) {
    navigate({ route: 'play', activeGame: gameType })
  }

  function chooseSidebarItem(item: SidebarUnitItem) {
    navigate({
      route: 'home',
      game: item.gameKey,
      level: item.levelKey,
      week: item.weekKey,
      unitSlug: item.unit.slug,
      replace: true,
    })
  }

  const showHomeShell = route === 'home' || route === 'play' || route === 'summary'

  return (
    <main>
      {status && <div className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-2xl bg-white/90 px-4 py-3 text-sm font-bold text-amber-700 shadow-lg">{status}</div>}

      {route === 'chooseGame' && (
        <LegacyChooseGamePage
          selectedGame={game}
          onBack={() => window.history.back()}
          onChoose={(value) => navigate({ route: 'chooseWeek', game: value })}
        />
      )}

      {route === 'chooseWeek' && (
        <LegacyChooseWeekPage
          selectedWeek={week}
          game={game}
          onBack={() => navigate({ route: 'chooseGame' })}
          onChoose={(value) => navigate({ route: 'chooseLevel', week: value })}
        />
      )}

      {route === 'chooseLevel' && (
        <LegacyChooseLevelPage
          selectedLevel={level}
          game={game}
          week={week}
          levels={levels}
          onBack={() => navigate({ route: 'chooseWeek' })}
          onChoose={(value) => {
            const slug = resolveUnitSlug(units, '', unitSlug)
            navigate({ route: 'home', level: value, unitSlug: slug || undefined })
          }}
        />
      )}

      {showHomeShell && (
        <LegacyHomeLayout
          game={game}
          level={level}
          week={week}
          levels={levels}
          units={units}
          unitSlug={unitSlug}
          unitName={selectedUnit?.name || '...'}
          unitParam={unitParam}
          onBack={() => {
            // Luôn về trang chọn trước trong luồng (không dùng history.back → tránh nhảy unit).
            if (route === 'play' || route === 'summary') {
              navigate({ route: 'home', replace: true })
              return
            }
            navigate({ route: 'chooseLevel' })
          }}
          onChooseSidebarItem={chooseSidebarItem}
        >
          {route === 'home' && (
            <LegacyMenuView
              unitName={selectedUnit?.name || 'UNIT'}
              menuBackgroundMap={menuBackgroundMap}
              onStartGame={startGame}
            />
          )}
          {route === 'play' && activeGame === 'listenchoose' && (
            <LegacyListenChooseGame questions={datasets.listenchoose} onBack={() => navigate({ route: 'home', replace: true })} onComplete={completeGame} />
          )}
          {route === 'play' && activeGame === 'lookchoose' && (
            <LegacyLookChooseGame questions={datasets.lookchoose} onBack={() => navigate({ route: 'home', replace: true })} onComplete={completeGame} />
          )}
          {route === 'play' && activeGame === 'pronunciation' && (
            <LegacyPronunciationGame questions={datasets.pronunciation} unitSlug={unitSlug} level={level} week={week} onBack={() => navigate({ route: 'home', replace: true })} onComplete={completeGame} />
          )}
          {route === 'play' && activeGame === 'catching' && (
            <LegacyCatchGame questions={datasets.pronunciation} onBack={() => navigate({ route: 'home', replace: true })} onComplete={completeGame} />
          )}
          {route === 'summary' && (
            <LegacySummaryView
              summary={summary}
              onMenu={() => navigate({ route: 'home', replace: true })}
              onReplay={() => navigate({ route: 'play', replace: true })}
            />
          )}
        </LegacyHomeLayout>
      )}
    </main>
  )
}

function applyGameBackground(imageUrl: string) {
  const resolved = resolveGameBackground(imageUrl)
  document.documentElement.style.setProperty('--game-bg-image', `url("${resolved}")`)
}

function LegacyChooseGamePage({ selectedGame, onChoose, onBack }: { selectedGame: string; onChoose: (value: string) => void; onBack: () => void }) {
  return (
    <main className="page">
      <section className="shell">
        <button type="button" className="back-button" onClick={onBack} aria-label="Quay lại trang trước">
          <span aria-hidden="true">←</span>
          <span>Quay lại</span>
        </button>
        <div className="hero">
          <div className="brand-mark">
            <img src={LOGO_URL} alt="AnSchool Logo" className="brand-logo" />
          </div>
          <div className="eyebrow">AnSchool</div>
          <h1>Chọn chương trình học để vào game</h1>
        </div>

        <div className="grid cols-2" id="game-grid">
          <button type="button" className={`card kindergarten ${selectedGame === 'kindergarten' ? 'active' : ''}`} data-game-key="kindergarten" onClick={() => onChoose('kindergarten')}>
            <div className="badge-row"><span className="badge">K</span></div>
            <p className="title">Kindergarten</p>
          </button>
          <button type="button" className={`card starters ${selectedGame === 'starters' ? 'active' : ''}`} data-game-key="starters" onClick={() => onChoose('starters')}>
            <div className="badge-row"><span className="badge">S</span></div>
            <p className="title">Starters</p>
          </button>
        </div>
      </section>
    </main>
  )
}

function LegacyChooseWeekPage({ selectedWeek, game, onChoose, onBack }: { selectedWeek: string; game: string; onChoose: (value: string) => void; onBack: () => void }) {
  const label = (weekKey: string) => {
    if (String(game).trim().toLowerCase() === 'starters') return weekKey === '1' ? 'Week 1' : 'Week 2'
    return weekKey === '1' ? 'Week 1 & 2' : 'Week 3 & 4'
  }

  return (
    <main className="page">
      <section className="shell">
        <button type="button" className="back-button" onClick={onBack} aria-label="Quay lại trang trước">
          <span aria-hidden="true">←</span>
          <span>Quay lại</span>
        </button>
        <div className="hero">
          <div className="brand-mark">
            <img src={LOGO_URL} alt="AnSchool Logo" className="brand-logo" />
          </div>
          <div className="eyebrow">AnSchool</div>
          <h1>Chọn tuần học để vào game</h1>
        </div>

        <div className="grid cols-2" id="week-grid">
          <button type="button" className={`card pre11 ${selectedWeek === '1' ? 'active' : ''}`} data-week-key="1" onClick={() => onChoose('1')}>
            <div className="badge-row"><span className="badge">1</span></div>
            <p className="title">{label('1')}</p>
          </button>
          <button type="button" className={`card pre12 ${selectedWeek === '2' ? 'active' : ''}`} data-week-key="2" onClick={() => onChoose('2')}>
            <div className="badge-row"><span className="badge">2</span></div>
            <p className="title">{label('2')}</p>
          </button>
        </div>
      </section>
    </main>
  )
}

function LegacyChooseLevelPage({ selectedLevel, game, week, levels, onChoose, onBack }: { selectedLevel: string; game: string; week: string; levels: Level[]; onChoose: (value: string) => void; onBack: () => void }) {
  const getLabel = (levelKey: string) => {
    const normalizedGame = String(game).trim().toLowerCase() === 'starters' ? 'starters' : 'kindergarten'
    if (normalizedGame === 'starters') {
      if (levelKey === 'pre11') return 'Lesson 1'
      if (levelKey === 'pre12') return 'Lesson 2'
      if (levelKey === 'pre2') return 'Lesson 3'
      if (levelKey === 'pre3') return 'Lesson 4'
    }
    return levels.find((x) => x.key === levelKey)?.title || levelKey
  }

  return (
    <main className="page">
      <section className="shell">
        <button type="button" className="back-button" onClick={onBack} aria-label="Quay lại trang trước">
          <span aria-hidden="true">←</span>
          <span>Quay lại</span>
        </button>
        <div className="hero">
          <div className="brand-mark">
            <img src={LOGO_URL} alt="AnSchool Logo" className="brand-logo" />
          </div>
          <div className="eyebrow">AnSchool</div>
          <h1>Chọn cấp bậc để vào game</h1>
        </div>

        <div className="grid cols-4" id="level-grid">
          {(['pre11', 'pre12', 'pre2', 'pre3'] as const).map((key, idx) => (
            <button
              key={key}
              type="button"
              className={`card ${key} ${selectedLevel === key ? 'active' : ''}`}
              data-level-key={key}
              onClick={() => onChoose(key)}
              aria-label={`Chọn cấp ${getLabel(key)} (game=${game}, week=${week})`}
            >
              <div className="badge-row"><span className="badge">{idx + 1}</span></div>
              <p className="title">{getLabel(key)}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
