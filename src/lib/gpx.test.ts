// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseGpxFile } from './gpx'

const fixturePath = join(import.meta.dirname, '__fixtures__/sample.gpx')
const sampleGpx = readFileSync(fixturePath, 'utf-8')
const realRideGpx = readFileSync(join(import.meta.dirname, '__fixtures__/real-ride.gpx'), 'utf-8')

describe('parseGpxFile', () => {
  it('extracts all trackpoints with lat/lon/elevation/time', () => {
    const result = parseGpxFile(sampleGpx)

    expect(result.points).toHaveLength(4)
    expect(result.points[0]).toEqual({
      lat: 50.0,
      lon: 19.9,
      elevation: 200,
      time: '2026-01-01T10:00:00.000Z',
      distanceKm: 0,
    })
    expect(result.points[3].distanceKm).toBeCloseTo(result.distanceKm, 5)
  })

  it('computes total distance from GPS coordinates', () => {
    const result = parseGpxFile(sampleGpx)

    // Three ~0.001deg-latitude segments along the same longitude, ~111m each.
    expect(result.distanceKm).toBeGreaterThan(0.3)
    expect(result.distanceKm).toBeLessThan(0.35)
  })

  it('computes elevation gain as the sum of positive elevation deltas', () => {
    const result = parseGpxFile(sampleGpx)

    // 200 -> 210 (+10), 210 -> 205 (-5, ignored), 205 -> 220 (+15) = 25
    expect(result.elevGainM).toBe(25)
  })

  it('throws when the GPX has no track', () => {
    const noTrackGpx = '<?xml version="1.0"?><gpx version="1.1"></gpx>'

    expect(() => parseGpxFile(noTrackGpx)).toThrow('GPX file has no track')
  })

  it('handles a real device-recorded ride (3000+ points, dense whitespace-mashed XML)', () => {
    const result = parseGpxFile(realRideGpx)

    expect(result.points.length).toBeGreaterThan(3000)
    // ~50 minutes at cycling pace over rolling terrain near Kraków.
    expect(result.distanceKm).toBeGreaterThan(15)
    expect(result.distanceKm).toBeLessThan(18)
    expect(result.elevGainM).toBeGreaterThan(50)
    expect(result.elevGainM).toBeLessThan(100)
    expect(result.points[0].time).toBe('2026-08-16T10:59:29.000Z')
  })
})
