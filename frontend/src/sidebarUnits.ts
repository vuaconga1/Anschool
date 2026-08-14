import type { Unit } from './api'

export type SidebarUnitItem = {
  unit: Unit
  gameKey: string
  levelKey: string
  unitValue: string
  weekKey: string
  weekLabel: string
  fixed: boolean
  sidebarKey: string
}

function normalizeUnitKey(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
}

function normalizeWeekKey(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/[^0-9]/g, '')
  return digits || raw
}

export function getUnitOrderValue(unit: Unit, fallbackIndex?: number): string {
  const orderValue = unit?.order != null ? String(unit.order).trim() : ''
  if (orderValue) return orderValue
  const indexValue = Number(fallbackIndex)
  return Number.isFinite(indexValue) ? String(indexValue + 1) : ''
}

function createSidebarUnitItem(
  unit: Unit,
  options: {
    gameKey: string
    levelKey: string
    unitValue: string
    weekKey: string
    weekLabel?: string
    index: number
  },
): SidebarUnitItem | null {
  if (!unit) return null

  const gameKey = options.gameKey || 'kindergarten'
  const levelKey = options.levelKey || (unit.levels?.[0] ?? '')
  const unitValue = String(options.unitValue || getUnitOrderValue(unit, options.index) || '').trim()
  const weekKey = normalizeWeekKey(options.weekKey) || '1'
  const weekLabel = options.weekLabel || `Tuần ${weekKey}`
  const slugKey = normalizeUnitKey(unit.slug) || normalizeUnitKey(unitValue) || String(options.index)

  return {
    unit,
    gameKey,
    levelKey,
    unitValue,
    weekKey,
    weekLabel,
    fixed: false,
    // Include index so React keys stay unique even if slug/order collide in data.
    sidebarKey: `${gameKey}|${slugKey}|${unitValue}|${weekKey}|${levelKey}|${options.index}`,
  }
}

/** Show every unit for the current game — no fixed-only / current-only filtering. */
export function buildSidebarUnitItems(params: {
  units: Unit[]
  game: string
  level: string
  week: string
  unitSlug?: string
  unitParam?: string
}): SidebarUnitItem[] {
  const { game, level, week } = params
  const source = Array.isArray(params.units) ? [...params.units] : []
  const weekKey = normalizeWeekKey(week) || '1'

  source.sort((a, b) => {
    const orderA = Number(a?.order)
    const orderB = Number(b?.order)
    const safeA = Number.isFinite(orderA) ? orderA : Number.MAX_SAFE_INTEGER
    const safeB = Number.isFinite(orderB) ? orderB : Number.MAX_SAFE_INTEGER
    if (safeA !== safeB) return safeA - safeB
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'vi')
  })

  const items: SidebarUnitItem[] = []
  source.forEach((unit, index) => {
    const item = createSidebarUnitItem(unit, {
      gameKey: game,
      levelKey: level,
      unitValue: getUnitOrderValue(unit, index),
      weekKey,
      weekLabel: `Tuần ${weekKey}`,
      index,
    })
    if (item) items.push(item)
  })

  return items
}
