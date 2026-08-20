import { Link } from 'react-router'
import manifest from '../generated/tripsManifest.json'
import type { TripSummary } from '../types'

const trips = manifest as TripSummary[]

export default function Library() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Trips</h1>
        <Link to="/new" className="btn btn-primary">
          + New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="opacity-70">No trips yet. Upload a GPX file to get started.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.slug}>
              <Link to={`/trip/${trip.slug}`} className="card bg-base-200 block p-4 transition hover:bg-base-300">
                <h2 className="font-semibold">{trip.title}</h2>
                <p className="text-sm opacity-70">
                  {trip.date} · {trip.distanceKm.toFixed(1)} km · {Math.round(trip.elevGainM)} m gain
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
