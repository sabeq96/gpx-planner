import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reads every `<tripsDir>/<slug>/meta.json` and returns a flat manifest of
 * trip summaries, newest first. Skips directories with no meta.json.
 */
export function buildManifest(tripsDir) {
  if (!existsSync(tripsDir)) return []

  return readdirSync(tripsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const metaPath = join(tripsDir, entry.name, 'meta.json')
      if (!existsSync(metaPath)) return null

      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      return {
        slug: entry.name,
        title: meta.title,
        date: meta.date,
        distanceKm: meta.distanceKm,
        elevGainM: meta.elevGainM,
      }
    })
    .filter((trip) => trip !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}

function main() {
  const rootDir = fileURLToPath(new URL('..', import.meta.url))
  const tripsDir = join(rootDir, 'public', 'trips')
  const outDir = join(rootDir, 'src', 'generated')
  const outFile = join(outDir, 'tripsManifest.json')

  const manifest = buildManifest(tripsDir)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`build-trips-manifest: wrote ${manifest.length} trip(s) to ${outFile}`)
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) main()
