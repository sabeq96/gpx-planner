import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Pin } from '../types'

export interface PinDraft {
  /** null = a new pin being created, not yet saved. */
  id: string | null
  lat: number
  lon: number
  title: string
  note: string
  createdAt: string
}

interface PinEditorSheetProps {
  draft: PinDraft | null
  onSave: (pin: Pin) => void
  onDelete: (pinId: string) => void
  onClose: () => void
}

// A fresh `key` per draft (below) means this component remounts whenever a
// different pin is opened, so its form state can just be initialized once
// from `draft` rather than synchronized via an effect.
export default function PinEditorSheet({ draft, onSave, onDelete, onClose }: PinEditorSheetProps) {
  if (!draft) return null
  return (
    <PinEditorDialog key={draft.id ?? `${draft.lat},${draft.lon}`} draft={draft} onSave={onSave} onDelete={onDelete} onClose={onClose} />
  )
}

interface PinEditorDialogProps {
  draft: PinDraft
  onSave: (pin: Pin) => void
  onDelete: (pinId: string) => void
  onClose: () => void
}

function PinEditorDialog({ draft, onSave, onDelete, onClose }: PinEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(draft.title)
  const [note, setNote] = useState(draft.note)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      id: draft.id ?? crypto.randomUUID(),
      lat: draft.lat,
      lon: draft.lon,
      title: title.trim() || 'Untitled pin',
      note,
      createdAt: draft.createdAt,
    })
  }

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box">
        <h3 className="text-lg font-bold">{draft.id ? 'Edit pin' : 'New pin'}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <fieldset className="fieldset">
            <label className="label" htmlFor="pin-title">
              Title
            </label>
            <input id="pin-title" className="input w-full" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </fieldset>
          <fieldset className="fieldset">
            <label className="label" htmlFor="pin-note">
              Note
            </label>
            <textarea id="pin-note" className="textarea w-full" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </fieldset>
          <div className="modal-action">
            {draft.id && (
              <button type="button" className="btn btn-error btn-outline" onClick={() => onDelete(draft.id!)}>
                Delete
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save pin
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  )
}
