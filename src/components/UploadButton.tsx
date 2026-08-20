import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { parseGpxFile } from '../lib/gpx'
import type { ParsedTrack } from '../types'

interface UploadButtonProps {
  onUpload: (rawGpx: string, track: ParsedTrack) => void
}

export default function UploadButton({ onUpload }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const rawGpx = await file.text()
      const track = parseGpxFile(rawGpx)
      setError(null)
      onUpload(rawGpx, track)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse that GPX file.')
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".gpx" className="hidden" onChange={handleChange} />
      <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
        Upload GPX file
      </button>
      {error && <p className="text-error mt-2 text-sm">{error}</p>}
    </div>
  )
}
