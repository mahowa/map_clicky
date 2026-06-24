/**
 * Flavor reactions shown after a guess, picked at random from a tier chosen by
 * the round's base score (0–100). Snark for misses, praise for bullseyes.
 *
 * Pure: pass your own `rng` for deterministic tests; defaults to Math.random for
 * genuinely-random UI flavor (it's cosmetic, never affects scoring).
 */

type Tier = { min: number; quips: string[] }

// Highest threshold first; pickReaction takes the first tier the score clears.
const TIERS: Tier[] = [
  {
    min: 95,
    quips: [
      'Bullseye. Were you born there?',
      'Pinpoint. Show-off.',
      'Surgical. The cartographers are nervous.',
      'Nailed it. Absolutely nailed it.',
      'Dead on — do you just have the planet memorized?',
      "Perfect drop. Chef's kiss.",
      "That's a sniper shot.",
      'Flawless. Touch grass on the correct continent.',
    ],
  },
  {
    min: 85,
    quips: [
      'So close you could smell it.',
      'Practically next door.',
      'Razor sharp — just a hair off.',
      'Almost flawless. Almost.',
      'You could walk there from your guess.',
      'Tantalizingly close.',
      'A rounding error from perfect.',
    ],
  },
  {
    min: 70,
    quips: [
      'Solid. The right neighborhood.',
      'Not bad at all.',
      'You clearly know your stuff.',
      'Respectable. The atlas approves.',
      'Right in the ballpark.',
      'Decent shot — same general area.',
      'The geography teacher nods approvingly.',
    ],
  },
  {
    min: 50,
    quips: [
      'Same continent, at least.',
      'You were in the vicinity. Loosely.',
      "Close-ish. We'll allow it.",
      'Right idea, wrong everything-else.',
      'A for effort, C for geography.',
      'You grazed it.',
      'Within driving distance. A very long drive.',
    ],
  },
  {
    min: 30,
    quips: [
      'Oof. Not your finest hemisphere.',
      'Were you... aiming for that?',
      'The right planet, anyway.',
      "That's a long taxi ride.",
      'Geography class is calling.',
      'Bold choice. Wrong, but bold.',
      'You and the answer are seeing different sunsets.',
    ],
  },
  {
    min: 0,
    quips: [
      'Did you close your eyes and spin?',
      "That's a different time zone... and continent.",
      "Three flights and a passport wouldn't get you there.",
      'Cartographically speaking: yikes.',
      "Were you guessing where it ISN'T?",
      'The ocean called — it wants its guess back.',
      'Even a dart-throwing monkey is sweating for you.',
      "That's not even close to close.",
      'Respect the confidence. Not the accuracy.',
      'Bestie, that is the wrong side of Earth.',
    ],
  },
]

/** Pick a reaction line for a round's base score (0–100). */
export function pickReaction(base: number, rng: () => number = Math.random): string {
  const tier = TIERS.find((t) => base >= t.min) ?? TIERS[TIERS.length - 1]
  return tier.quips[Math.floor(rng() * tier.quips.length)] ?? tier.quips[0]
}
