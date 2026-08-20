import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { GITHUB_OWNER, GITHUB_REPO } from '../config'
import ElevationChart from '../components/Elevation/ElevationChart'
import TrackMap from '../components/Map/TrackMap'
import PinEditorSheet from '../components/PinEditorSheet'
import type { PinDraft } from '../components/PinEditorSheet'
import UploadButton from '../components/UploadButton'
import { getToken } from '../lib/auth'
import { getFileSha, putFile } from '../lib/github'
import { parseGpxFile } from '../lib/gpx'
import { generateTripSlug } from '../lib/slug'
import type { ParsedTrack, Pin, TripMeta } from '../types'

export default function TripEditor() {
  const { slug: routeSlug } = useParams()
  const navigate = useNavigate()

  const [slug, setSlug] = useState<string | null>(routeSlug ?? null)
  const [rawGpx, setRawGpx] = useState<string | null>(null)
  const [track, setTrack] = useState<ParsedTrack | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString())
  const [pins, setPins] = useState<Pin[]>([])
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [editingPin, setEditingPin] = useState<PinDraft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Tracks which slug's data is currently reflected in state, so a Save
  // (which sets `slug` and navigates from /new to /trip/:slug) doesn't
  // trigger the effect below to re-fetch a trip whose files may not exist
  // in the deployed static build yet (the site only regenerates them on the
  // next rebuild — see Decision 8 in the contract).
  const loadedSlugRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!routeSlug || loadedSlugRef.current === routeSlug) return
    let cancelled = false

    async function load() {
      try {
        const base = import.meta.env.BASE_URL
        const [gpxRes, metaRes] = await Promise.all([
          fetch(`${base}trips/${routeSlug}/track.gpx`),
          fetch(`${base}trips/${routeSlug}/meta.json`),
        ])
        if (!gpxRes.ok || !metaRes.ok) throw new Error('Trip not found.')

        const gpxText = await gpxRes.text()
        const meta = (await metaRes.json()) as TripMeta
        if (cancelled) return

        setRawGpx(gpxText)
        setTrack(parseGpxFile(gpxText))
        setTitle(meta.title)
        setDate(meta.date)
        setCreatedAt(meta.createdAt)
        setPins(meta.pins)
        loadedSlugRef.current = routeSlug
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load this trip.')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [routeSlug])

  function handleUpload(gpxText: string, parsedTrack: ParsedTrack) {
    setRawGpx(gpxText)
    setTrack(parsedTrack)
    setDirty(true)
  }

  function handleMapClick(lat: number, lon: number) {
    setEditingPin({ id: null, lat, lon, title: '', note: '', createdAt: new Date().toISOString() })
  }

  function handlePinClick(pinId: string) {
    const pin = pins.find((p) => p.id === pinId)
    if (!pin) return
    setEditingPin({ id: pin.id, lat: pin.lat, lon: pin.lon, title: pin.title, note: pin.note, createdAt: pin.createdAt })
  }

  function handleSavePin(pin: Pin) {
    setPins((current) => (current.some((p) => p.id === pin.id) ? current.map((p) => (p.id === pin.id ? pin : p)) : [...current, pin]))
    setEditingPin(null)
    setDirty(true)
  }

  function handleDeletePin(pinId: string) {
    setPins((current) => current.filter((p) => p.id !== pinId))
    setEditingPin(null)
    setDirty(true)
  }

  async function handleSaveTrip() {
    if (!track || !rawGpx) return
    const token = getToken()
    if (!token) {
      setSaveState('error')
      setSaveError('Add a GitHub token in Settings before saving.')
      return
    }

    setSaveState('saving')
    setSaveError(null)

    const tripSlug = slug ?? generateTripSlug(title || 'trip')
    const now = new Date().toISOString()
    const meta: TripMeta = {
      title: title.trim() || 'Untitled trip',
      date,
      distanceKm: track.distanceKm,
      elevGainM: track.elevGainM,
      pins,
      createdAt,
      updatedAt: now,
    }
    const gpxPath = `public/trips/${tripSlug}/track.gpx`
    const metaPath = `public/trips/${tripSlug}/meta.json`
    const isExisting = Boolean(slug)

    try {
      const [gpxSha, metaSha] = isExisting
        ? await Promise.all([
            getFileSha(GITHUB_OWNER, GITHUB_REPO, gpxPath, token),
            getFileSha(GITHUB_OWNER, GITHUB_REPO, metaPath, token),
          ])
        : [undefined, undefined]

      const commitMessage = `${isExisting ? 'Update' : 'Add'} trip: ${meta.title}`

      try {
        await putFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, path: gpxPath, content: rawGpx, message: commitMessage, token, sha: gpxSha ?? undefined })
      } catch (err) {
        throw new Error(`Failed saving track.gpx: ${err instanceof Error ? err.message : String(err)}`)
      }

      try {
        await putFile({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: metaPath,
          content: JSON.stringify(meta, null, 2),
          message: commitMessage,
          token,
          sha: metaSha ?? undefined,
        })
      } catch (err) {
        // track.gpx above did commit successfully — meta.json (title, pins,
        // stats) didn't, leaving the two out of sync until a retry.
        throw new Error(`track.gpx saved, but meta.json failed: ${err instanceof Error ? err.message : String(err)}`)
      }

      setSlug(tripSlug)
      setSaveState('saved')
      setDirty(false)
      if (!routeSlug) {
        loadedSlugRef.current = tripSlug
        navigate(`/trip/${tripSlug}`, { replace: true })
      }
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    }
  }

  if (loadError) {
    return (
      <div className="p-4">
        <p className="text-error">{loadError}</p>
      </div>
    )
  }

  if (!track) {
    if (routeSlug) {
      return (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="opacity-70">Loading trip…</p>
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-xl font-bold">New Trip</h1>
        <UploadButton onUpload={handleUpload} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-base-300 p-2">
        <input
          className="input input-sm w-full"
          placeholder="Trip title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setDirty(true)
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="input input-sm"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setDirty(true)
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveTrip} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </button>
          {dirty && saveState !== 'saving' && <span className="text-warning text-xs">Unsaved changes</span>}
          {saveState === 'saved' && !dirty && <span className="text-success text-xs">Saved</span>}
          {saveState === 'error' && <span className="text-error text-xs">{saveError}</span>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <TrackMap points={track.points} pins={pins} onMapClick={handleMapClick} onPinClick={handlePinClick} hoverIndex={hoverIndex} />
      </div>
      <div className="h-56 border-t border-base-300 p-2">
        <ElevationChart points={track.points} onHoverIndexChange={setHoverIndex} />
      </div>

      <PinEditorSheet draft={editingPin} onSave={handleSavePin} onDelete={handleDeletePin} onClose={() => setEditingPin(null)} />
    </div>
  )
}
