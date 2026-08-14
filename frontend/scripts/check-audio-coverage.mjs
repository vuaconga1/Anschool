import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { buildIndex, resolveAudioFile } from './media-resolver.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const audiosDir = path.join(__dirname, '../public/assets/audios')
const reportPath = path.join(rootDir, 'AUDIO_COVERAGE_REPORT.md')

async function main() {
  const audioIndex = buildIndex(audiosDir)
  const audioFiles = fs.existsSync(audiosDir)
    ? fs.readdirSync(audiosDir).filter((f) => /\.(mp3|wav|ogg)$/i.test(f))
    : []

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123123@localhost:5432/wewin',
  })
  await client.connect()

  const { rows } = await client.query(`
    SELECT "EnglishText", "AudioValue", "UnitSlug", "GameKeys", "GameType",
           "LevelKeys", "WeekKeys", COUNT(*)::int AS row_count
    FROM "GameItems"
    WHERE "GameType" IN ('listenchoose', 'lookchoose', 'pronunciation', 'catching')
    GROUP BY "EnglishText", "AudioValue", "UnitSlug", "GameKeys", "GameType", "LevelKeys", "WeekKeys"
    ORDER BY "EnglishText"
  `)

  const totalItems = await client.query('SELECT COUNT(*)::int AS c FROM "GameItems"')
  await client.end()

  const byWord = new Map()
  const brokenRefs = new Map()

  for (const row of rows) {
    const word = String(row.EnglishText || '').trim()
    if (!word) continue
    const key = word.toLowerCase()
    const file = resolveAudioFile(word, row.AudioValue, audioIndex)

    if (!byWord.has(key)) {
      byWord.set(key, {
        word,
        hasAudio: false,
        file: null,
        units: new Set(),
        games: new Set(),
        rows: 0,
      })
    }

    const entry = byWord.get(key)
    entry.rows += row.row_count
    entry.units.add(row.UnitSlug || '')
    entry.games.add(row.GameKeys || '')

    if (file) {
      entry.hasAudio = true
      entry.file = file
    }

    const av = String(row.AudioValue || '').trim()
    if (av.startsWith('/assets/audios/')) {
      const name = decodeURIComponent(av.replace('/assets/audios/', '').split('?')[0])
      if (!audioIndex.has(name.toLowerCase())) {
        brokenRefs.set(`${key}|${av}`, { word, audioValue: av, unit: row.UnitSlug })
      }
    }
  }

  const all = [...byWord.values()]
  const missing = all.filter((x) => !x.hasAudio).sort((a, b) => a.word.localeCompare(b.word))
  const present = all.filter((x) => x.hasAudio)
  const broken = [...brokenRefs.values()].sort((a, b) => a.word.localeCompare(b.word))

  console.log('\n=== KIỂM TRA AUDIO TỪ VỰNG ===\n')
  console.log(`GameItems (tổng): ${totalItems.rows[0].c}`)
  console.log(`File audio local: ${audioFiles.length}`)
  console.log(`Từ vựng unique (EnglishText): ${all.length}`)
  console.log(`Có file audio: ${present.length}`)
  console.log(`THIẾU file audio: ${missing.length}`)
  console.log(`AudioValue trỏ file không tồn tại: ${broken.length}`)

  if (missing.length) {
    console.log(`\n## Danh sách từ thiếu audio (${missing.length})\n`)
    missing.forEach((x, i) => {
      const units = [...x.units].filter(Boolean).join(', ')
      const games = [...x.games].filter(Boolean).join(', ')
      console.log(`${i + 1}. ${x.word} | units: ${units} | games: ${games}`)
    })
  }

  if (broken.length) {
    console.log(`\n## AudioValue hỏng (${broken.length})\n`)
    broken.slice(0, 100).forEach((x, i) => {
      console.log(`${i + 1}. ${x.word} → ${x.audioValue} (${x.unit})`)
    })
  }

  const lines = [
    '# Báo cáo thiếu audio',
    '',
    `- Kiểm tra lúc: ${new Date().toISOString()}`,
    `- GameItems: ${totalItems.rows[0].c}`,
    `- File mp3/wav/ogg local: ${audioFiles.length}`,
    `- Từ unique: ${all.length}`,
    `- Có audio: ${present.length}`,
    `- Thiếu audio: ${missing.length}`,
    `- AudioValue hỏng: ${broken.length}`,
    '',
  ]

  if (missing.length) {
    lines.push('## Từ thiếu file audio', '')
    missing.forEach((x, i) => {
      const units = [...x.units].filter(Boolean).join(', ')
      lines.push(`${i + 1}. **${x.word}** — ${units}`)
    })
    lines.push('')
  } else {
    lines.push('## Kết luận', '', 'Tất cả từ vựng unique đều có file audio tương ứng.', '')
  }

  if (broken.length) {
    lines.push('## AudioValue trỏ file không tồn tại', '')
    broken.forEach((x, i) => {
      lines.push(`${i + 1}. **${x.word}** → \`${x.audioValue}\` (${x.unit})`)
    })
    lines.push('')
  }

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')
  console.log(`\nWrote ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
