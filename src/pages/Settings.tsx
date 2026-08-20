import { useState } from 'react'
import type { FormEvent } from 'react'
import { clearToken, getToken, setToken } from '../lib/auth'

export default function Settings() {
  const [token, setTokenInput] = useState(() => getToken() ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setToken(token)
    setSaved(true)
  }

  function handleClear() {
    clearToken()
    setTokenInput('')
    setSaved(false)
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <fieldset className="fieldset">
          <label className="label" htmlFor="github-token">
            GitHub personal access token
          </label>
          <input
            id="github-token"
            type="password"
            className="input w-full"
            placeholder="github_pat_..."
            value={token}
            onChange={(event) => {
              setTokenInput(event.target.value)
              setSaved(false)
            }}
            autoComplete="off"
          />
        </fieldset>

        <p className="text-sm opacity-70">
          Needs a fine-grained token scoped to this repo with Contents: Read and write. Stored only in this
          browser's local storage — never sent anywhere except api.github.com.
        </p>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={!token}>
            Save
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleClear}>
            Clear
          </button>
        </div>

        {saved && <p className="text-success text-sm">Saved.</p>}
      </form>
    </div>
  )
}
