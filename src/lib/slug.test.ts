import { describe, expect, it } from 'vitest'
import { generateTripSlug } from './slug'

describe('generateTripSlug', () => {
  it('lowercases and dasherizes the title', () => {
    const slug = generateTripSlug('Morning Loop!')
    expect(slug).toMatch(/^morning-loop-[a-f0-9]{6}$/)
  })

  it('collapses non-alphanumeric runs and trims leading/trailing dashes', () => {
    const slug = generateTripSlug('  --Café & Bike Ride--  ')
    expect(slug).toMatch(/^caf-bike-ride-[a-f0-9]{6}$/)
  })

  it('falls back to "trip" when the title has no alphanumeric characters', () => {
    const slug = generateTripSlug('!!!')
    expect(slug).toMatch(/^trip-[a-f0-9]{6}$/)
  })

  it('produces a different suffix on each call for the same title', () => {
    const a = generateTripSlug('Same Title')
    const b = generateTripSlug('Same Title')
    expect(a).not.toBe(b)
  })
})
