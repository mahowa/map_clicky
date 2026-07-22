import { describe, it, expect } from 'vitest'
import { getQuiz, QUIZZES } from '@/lib/quizzes'
import { countryAt } from '@/lib/country-lookup'

/**
 * Issue #20: "Make sure the quizzes match their category."
 * Ground truth lives HERE, independent of src/lib/quizzes.ts — the quiz data
 * cannot validate itself. If someone edits a pool to include a non-capital or
 * a wrong-continent city, these fail.
 */

// Independent list of all 50 US state capitals (capital -> state).
const TRUE_US_CAPITALS: Record<string, string> = {
  Montgomery: 'Alabama', Juneau: 'Alaska', Phoenix: 'Arizona', 'Little Rock': 'Arkansas',
  Sacramento: 'California', Denver: 'Colorado', Hartford: 'Connecticut', Dover: 'Delaware',
  Tallahassee: 'Florida', Atlanta: 'Georgia', Honolulu: 'Hawaii', Boise: 'Idaho',
  Springfield: 'Illinois', Indianapolis: 'Indiana', 'Des Moines': 'Iowa', Topeka: 'Kansas',
  Frankfort: 'Kentucky', 'Baton Rouge': 'Louisiana', Augusta: 'Maine', Annapolis: 'Maryland',
  Boston: 'Massachusetts', Lansing: 'Michigan', 'St. Paul': 'Minnesota', Jackson: 'Mississippi',
  'Jefferson City': 'Missouri', Helena: 'Montana', Lincoln: 'Nebraska', 'Carson City': 'Nevada',
  Concord: 'New Hampshire', Trenton: 'New Jersey', 'Santa Fe': 'New Mexico', Albany: 'New York',
  Raleigh: 'North Carolina', Bismarck: 'North Dakota', Columbus: 'Ohio',
  'Oklahoma City': 'Oklahoma', Salem: 'Oregon', Harrisburg: 'Pennsylvania',
  Providence: 'Rhode Island', Columbia: 'South Carolina', Pierre: 'South Dakota',
  Nashville: 'Tennessee', Austin: 'Texas', 'Salt Lake City': 'Utah', Montpelier: 'Vermont',
  Richmond: 'Virginia', Olympia: 'Washington', Charleston: 'West Virginia',
  Madison: 'Wisconsin', Cheyenne: 'Wyoming',
}

// Independent country -> capital city mapping for the world-capitals quiz.
const TRUE_WORLD_CAPITALS: Record<string, string> = {
  'United Kingdom': 'London', France: 'Paris', 'United States': 'Washington, D.C.',
  Japan: 'Tokyo', China: 'Beijing', Russia: 'Moscow', Germany: 'Berlin', Italy: 'Rome',
  Spain: 'Madrid', Canada: 'Ottawa', Australia: 'Canberra', Brazil: 'Brasília',
  Egypt: 'Cairo', India: 'New Delhi', 'South Korea': 'Seoul', Mexico: 'Mexico City',
  Argentina: 'Buenos Aires', Kenya: 'Nairobi', Thailand: 'Bangkok', Turkey: 'Ankara',
  Norway: 'Oslo', 'New Zealand': 'Wellington', Iceland: 'Reykjavik', Mongolia: 'Ulaanbaatar',
}

// Independent continent membership for every country used by a continent quiz.
const CONTINENT_OF: Record<string, string> = {
  Egypt: 'africa', Nigeria: 'africa', Kenya: 'africa', 'South Africa': 'africa',
  Morocco: 'africa', Ethiopia: 'africa', Ghana: 'africa', Senegal: 'africa',
  'DR Congo': 'africa', Sudan: 'africa', Madagascar: 'africa', Mali: 'africa',
  'United Kingdom': 'europe', France: 'europe', Germany: 'europe', Italy: 'europe',
  Spain: 'europe', Netherlands: 'europe', Austria: 'europe', Czechia: 'europe',
  Greece: 'europe', Portugal: 'europe', Sweden: 'europe', Poland: 'europe',
  Japan: 'asia', China: 'asia', 'South Korea': 'asia', Thailand: 'asia', India: 'asia',
  Singapore: 'asia', Indonesia: 'asia', Vietnam: 'asia', Nepal: 'asia',
  'Saudi Arabia': 'asia', Uzbekistan: 'asia', Philippines: 'asia',
  'United States': 'north-america', Mexico: 'north-america', Canada: 'north-america',
  Cuba: 'north-america', Guatemala: 'north-america', Panama: 'north-america',
  Jamaica: 'north-america',
  Brazil: 'south-america', Argentina: 'south-america', Colombia: 'south-america',
  Peru: 'south-america', Chile: 'south-america', Ecuador: 'south-america',
  Venezuela: 'south-america', Bolivia: 'south-america', Uruguay: 'south-america',
  Paraguay: 'south-america',
  Australia: 'oceania', 'New Zealand': 'oceania', Fiji: 'oceania',
  'Papua New Guinea': 'oceania',
}

// Metro areas over ~9M people — the big-cities pool must be a subset.
const TRUE_MEGACITIES = new Set([
  'New York', 'Los Angeles', 'São Paulo', 'Shanghai', 'Mumbai', 'Istanbul', 'Lagos',
  'Karachi', 'Jakarta', 'Dhaka', 'Rio de Janeiro', 'Sydney', 'Toronto', 'Chicago',
  'Singapore', 'Hong Kong', 'Lahore', 'Chengdu', 'Johannesburg', 'Ho Chi Minh City',
  'Tokyo', 'Delhi', 'Beijing', 'Cairo', 'Mexico City', 'Moscow', 'Osaka', 'Manila',
  'Seoul', 'London', 'Paris', 'Bangkok', 'Tehran', 'Bogotá', 'Lima', 'Buenos Aires',
])

describe('us-state-capitals matches its category', () => {
  const pool = getQuiz('us-state-capitals')!.pool

  it('contains exactly the 50 true capitals, each paired with its state', () => {
    expect(pool.length).toBe(50)
    for (const place of pool) {
      expect(TRUE_US_CAPITALS[place.name], `${place.name} is not a US state capital`).toBeDefined()
      expect(place.country, place.name).toBe(TRUE_US_CAPITALS[place.name])
    }
    // ...and no capital is missing
    expect(new Set(pool.map((p) => p.name)).size).toBe(50)
  })

  it('every capital pin is inside the United States', async () => {
    for (const place of pool) {
      const at = await countryAt({ lat: place.lat, lng: place.lng })
      expect(at, `${place.name}, ${place.country}`).toBe('United States')
    }
  })
})

describe('world-capitals matches its category', () => {
  it('every entry is the true capital of its stated country', () => {
    for (const place of getQuiz('world-capitals')!.pool) {
      expect(place.country, place.name).toBeTruthy()
      expect(
        TRUE_WORLD_CAPITALS[place.country!],
        `${place.country} missing from ground truth`,
      ).toBeDefined()
      expect(place.name, place.country!).toBe(TRUE_WORLD_CAPITALS[place.country!])
    }
  })
})

describe('continent quizzes match their category', () => {
  const CONTINENT_SLUGS = ['africa', 'europe', 'asia', 'north-america', 'south-america', 'oceania']

  it('every place sits in a country belonging to that continent', () => {
    for (const slug of CONTINENT_SLUGS) {
      for (const place of getQuiz(slug)!.pool) {
        // Honolulu is the US's Pacific outpost — the one deliberate exception.
        if (slug === 'oceania' && place.name === 'Honolulu') continue
        expect(place.country, `${slug}: ${place.name}`).toBeTruthy()
        expect(
          CONTINENT_OF[place.country!],
          `${slug}: ${place.name} (${place.country}) not in continent ground truth`,
        ).toBe(slug)
      }
    }
  })
})

describe('big-cities matches its category', () => {
  it('every entry is a true megacity', () => {
    for (const place of getQuiz('big-cities')!.pool) {
      expect(TRUE_MEGACITIES.has(place.name), `${place.name} is not a megacity`).toBe(true)
    }
  })
})

describe('coordinates agree with stated countries (polygon cross-check)', () => {
  // 110m-resolution blind spots: city-states and coastal pins the coarse
  // polygons miss (Singapore, Istanbul on the Bosphorus, Montevideo's harbor).
  const KNOWN_110M_GAPS = new Set(['Singapore', 'Istanbul', 'Montevideo'])

  it('every non-US quiz place resolves to its own country', async () => {
    for (const quiz of QUIZZES) {
      if (quiz.slug === 'us-state-capitals') continue
      for (const place of quiz.pool) {
        if (KNOWN_110M_GAPS.has(place.name)) continue
        const at = await countryAt({ lat: place.lat, lng: place.lng })
        expect(at, `${quiz.slug}: ${place.name} @ ${place.lat},${place.lng}`).toBe(place.country)
      }
    }
  })
})
