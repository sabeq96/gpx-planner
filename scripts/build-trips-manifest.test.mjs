import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildManifest } from './build-trips-manifest.mjs'

let tripsDir

function writeTrip(slug, meta) {
  const dir = join(tripsDir, slug)
  mkdirSync(dir, { recursive: true })
  if (meta) writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta))
}

beforeEach(() => {
  tripsDir = mkdtempSync(join(tmpdir(), 'gpx-planner-trips-'))
})

afterEach(() => {
  rmSync(tripsDir, { recursive: true, force: true })
})

describe('buildManifest', () => {
  it('returns an empty array when the trips directory does not exist', () => {
    expect(buildManifest(join(tripsDir, 'nonexistent'))).toEqual([])
  })

  it('returns an empty array when the trips directory is empty', () => {
    expect(buildManifest(tripsDir)).toEqual([])
  })

  it('extracts a summary from each trip folder with a meta.json', () => {
    writeTrip('morning-loop-a1b2c3', {
      title: 'Morning Loop',
      date: '2026-08-16',
      distanceKm: 16.46,
      elevGainM: 70.7,
      pins: [],
    })

    const manifest = buildManifest(tripsDir)

    expect(manifest).toEqual([
      {
        slug: 'morning-loop-a1b2c3',
        title: 'Morning Loop',
        date: '2026-08-16',
        distanceKm: 16.46,
        elevGainM: 70.7,
      },
    ])
  })

  it('skips directories with no meta.json', () => {
    writeTrip('incomplete-trip', null)
    writeTrip('complete-trip', { title: 'Complete', date: '2026-08-01', distanceKm: 5, elevGainM: 10 })

    const manifest = buildManifest(tripsDir)

    expect(manifest).toHaveLength(1)
    expect(manifest[0].slug).toBe('complete-trip')
  })

  it('sorts trips newest date first', () => {
    writeTrip('older', { title: 'Older', date: '2026-01-01', distanceKm: 1, elevGainM: 1 })
    writeTrip('newer', { title: 'Newer', date: '2026-06-01', distanceKm: 1, elevGainM: 1 })

    const manifest = buildManifest(tripsDir)

    expect(manifest.map((t) => t.slug)).toEqual(['newer', 'older'])
  })
})
