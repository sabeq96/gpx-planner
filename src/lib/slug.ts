function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'trip'
}

export function generateTripSlug(title: string): string {
  const suffix = crypto.randomUUID().slice(0, 6)
  return `${slugifyTitle(title)}-${suffix}`
}
