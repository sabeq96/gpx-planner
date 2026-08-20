const API_BASE = 'https://api.github.com'

function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function githubRequest(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...init?.headers,
    },
  })
}

/** Returns the file's current `sha`, or null if it doesn't exist yet. */
export async function getFileSha(
  owner: string,
  repo: string,
  path: string,
  token: string,
): Promise<string | null> {
  const response = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, token)

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${await response.text()}`)
  }

  const body = (await response.json()) as { sha: string }
  return body.sha
}

export interface PutFileParams {
  owner: string
  repo: string
  path: string
  content: string
  message: string
  token: string
  /** Required when overwriting an existing file; omit when creating a new one. */
  sha?: string
}

export async function putFile({ owner, repo, path, content, message, token, sha }: PutFileParams): Promise<void> {
  const response = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: base64Encode(content),
      ...(sha ? { sha } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${await response.text()}`)
  }
}
