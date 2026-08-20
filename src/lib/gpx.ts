import { parseGPX } from '@we-gold/gpxjs'
import type { ParsedTrack, TrackPoint } from '../types'

export function parseGpxFile(gpxSource: string): ParsedTrack {
  const [parsed, error] = parseGPX(gpxSource)
  if (error) throw error

  const track = parsed.tracks[0]
  if (!track) throw new Error('GPX file has no track')

  const points: TrackPoint[] = track.points.map((point, index) => ({
    lat: point.latitude,
    lon: point.longitude,
    elevation: point.elevation,
    time: point.time ? point.time.toISOString() : null,
    distanceKm: track.distance.cumulative[index] / 1000,
  }))

  return {
    points,
    distanceKm: track.distance.total / 1000,
    elevGainM: track.elevation.positive ?? 0,
  }
}
