import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import type { Pin, TrackPoint } from '../../types'

// Leaflet's default marker icon paths don't resolve correctly through a
// bundler; point them at the actual built asset URLs instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

interface TrackMapProps {
  points: TrackPoint[]
  pins: Pin[]
  onMapClick: (lat: number, lon: number) => void
  onPinClick: (pinId: string) => void
  /** Index into `points` to highlight, driven by elevation-chart hover. */
  hoverIndex?: number | null
}

export default function TrackMap({ points, pins, onMapClick, onPinClick, hoverIndex }: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const trackLayerRef = useRef<L.Polyline | null>(null)
  const pinMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map())
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null)

  // Callbacks are read through refs so the map-init effect never has to
  // depend on (and re-run for) new callback identities from the parent.
  // Updated in an effect (not during render) since mutating a ref while
  // rendering isn't safe under React's rules.
  const onMapClickRef = useRef(onMapClick)
  const onPinClickRef = useRef(onPinClick)
  useEffect(() => {
    onMapClickRef.current = onMapClick
    onPinClickRef.current = onPinClick
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current)
    mapRef.current = map
    const pinMarkers = pinMarkersRef.current

    const openStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })
    const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
      maxZoom: 17,
    })

    openStreetMap.addTo(map)
    L.control.layers({ OpenStreetMap: openStreetMap, OpenTopoMap: openTopoMap }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onMapClickRef.current(event.latlng.lat, event.latlng.lng)
    })

    // The container's real size often isn't known yet at this point (it's
    // sized by a flex layout that settles after this effect runs), so
    // Leaflet's first measurement can be stale. Watch for the container
    // actually changing size and re-measure whenever it does.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      // Any cached layers below refer to this now-destroyed map (relevant
      // under StrictMode, which tears down and recreates the map once in
      // dev) — clear them so the next effect run re-adds everything to
      // whichever map instance replaces this one.
      trackLayerRef.current = null
      pinMarkers.clear()
      hoverMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    trackLayerRef.current?.remove()
    trackLayerRef.current = null

    if (points.length === 0) return

    // The container may not have had its final layout size yet when the map
    // was constructed; re-measure before fitting bounds so the computed
    // zoom/view isn't based on a stale (possibly zero) size.
    map.invalidateSize()

    const latLngs: [number, number][] = points.map((point) => [point.lat, point.lon])
    const polyline = L.polyline(latLngs, { color: '#7c3aed', weight: 4 }).addTo(map)
    trackLayerRef.current = polyline
    map.fitBounds(polyline.getBounds(), { padding: [24, 24] })
  }, [points])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const existing = pinMarkersRef.current
    const seen = new Set<string>()

    for (const pin of pins) {
      seen.add(pin.id)
      let marker = existing.get(pin.id)
      if (!marker) {
        marker = L.marker([pin.lat, pin.lon])
        marker.on('click', () => onPinClickRef.current(pin.id))
        marker.addTo(map)
        existing.set(pin.id, marker)
      } else {
        marker.setLatLng([pin.lat, pin.lon])
      }
      marker.bindTooltip(pin.title || 'Untitled pin')
    }

    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        marker.remove()
        existing.delete(id)
      }
    }
  }, [pins])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    hoverMarkerRef.current?.remove()
    hoverMarkerRef.current = null

    if (hoverIndex == null) return
    const point = points[hoverIndex]
    if (!point) return

    hoverMarkerRef.current = L.circleMarker([point.lat, point.lon], {
      radius: 7,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 1,
    }).addTo(map)
  }, [hoverIndex, points])

  return <div ref={containerRef} className="min-h-0 w-full flex-1" />
}
