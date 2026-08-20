export interface Pin {
  id: string
  lat: number
  lon: number
  title: string
  note: string
  createdAt: string
}

export interface TripMeta {
  title: string
  date: string
  distanceKm: number
  elevGainM: number
  pins: Pin[]
  createdAt: string
  updatedAt: string
}

export interface TripSummary {
  slug: string
  title: string
  date: string
  distanceKm: number
  elevGainM: number
}

export interface TrackPoint {
  lat: number
  lon: number
  elevation: number | null
  time: string | null
  /** Cumulative distance from the start of the track, in km. */
  distanceKm: number
}

export interface ParsedTrack {
  points: TrackPoint[]
  distanceKm: number
  elevGainM: number
}
