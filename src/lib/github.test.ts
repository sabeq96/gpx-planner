import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFileSha, putFile } from './github'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getFileSha', () => {
  it('returns the sha when the file exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sha: 'abc123' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sha = await getFileSha('owner', 'repo', 'public/trips/x/meta.json', 'token123')

    expect(sha).toBe('abc123')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/owner/repo/contents/public/trips/x/meta.json')
    expect(init.headers.Authorization).toBe('Bearer token123')
  })

  it('returns null when the file does not exist (404)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))

    const sha = await getFileSha('owner', 'repo', 'public/trips/x/meta.json', 'token123')

    expect(sha).toBeNull()
  })

  it('throws on other error statuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad credentials', { status: 401 })),
    )

    await expect(getFileSha('owner', 'repo', 'path', 'token')).rejects.toThrow('GitHub API error 401')
  })
})

describe('putFile', () => {
  it('base64-encodes the content and includes sha when updating', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await putFile({
      owner: 'owner',
      repo: 'repo',
      path: 'public/trips/x/meta.json',
      content: '{"title":"Café Ride"}',
      message: 'Update trip',
      token: 'token123',
      sha: 'existing-sha',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/owner/repo/contents/public/trips/x/meta.json')
    expect(init.method).toBe('PUT')

    const body = JSON.parse(init.body)
    expect(body.message).toBe('Update trip')
    expect(body.sha).toBe('existing-sha')
    expect(Buffer.from(body.content, 'base64').toString('utf-8')).toBe('{"title":"Café Ride"}')
  })

  it('omits sha when creating a new file', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await putFile({
      owner: 'owner',
      repo: 'repo',
      path: 'public/trips/x/track.gpx',
      content: '<gpx></gpx>',
      message: 'Create trip',
      token: 'token123',
    })

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.sha).toBeUndefined()
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('sha mismatch', { status: 409 })),
    )

    await expect(
      putFile({
        owner: 'owner',
        repo: 'repo',
        path: 'p',
        content: 'c',
        message: 'm',
        token: 't',
      }),
    ).rejects.toThrow('GitHub API error 409')
  })
})
