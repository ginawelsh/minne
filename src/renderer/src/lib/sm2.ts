import type { Card } from '../types'

/**
 * SM-2 spaced repetition algorithm
 * Quality: 0=Again, 1=Hard, 2=Good, 3=Easy
 */
export function reviewCard(card: Card, quality: 0 | 1 | 2 | 3): Card {
  const now = Date.now()
  let { interval, repetitions, easeFactor, lapses } = card

  const MIN_EASE = 1.3
  const MAX_EASE = 2.5

  if (quality === 0) {
    // Again: reset
    repetitions = 0
    interval = 1
    lapses += 1
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2)
  } else if (quality === 1) {
    // Hard: short interval, decrease ease
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15)
    if (repetitions === 0) {
      interval = 1
    } else {
      interval = Math.max(1, Math.round(interval * 1.2))
    }
    repetitions += 1
  } else if (quality === 2) {
    // Good: standard SM-2
    easeFactor = Math.min(MAX_EASE, Math.max(MIN_EASE, easeFactor))
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  } else if (quality === 3) {
    // Easy: longer interval, increase ease
    easeFactor = Math.min(MAX_EASE, easeFactor + 0.1)
    if (repetitions === 0) {
      interval = 4
    } else if (repetitions === 1) {
      interval = 10
    } else {
      interval = Math.round(interval * easeFactor * 1.3)
    }
    repetitions += 1
  }

  const dueDate = now + interval * 24 * 60 * 60 * 1000

  return {
    ...card,
    interval,
    repetitions,
    easeFactor,
    dueDate,
    lapses
  }
}

export function isDue(card: Card): boolean {
  return Date.now() >= card.dueDate
}

export function getDueCards(cards: Card[], deckId: string): Card[] {
  return cards.filter((c) => c.deckId === deckId && isDue(c))
}

export function getAllDueCards(cards: Card[]): Card[] {
  return cards.filter((c) => isDue(c))
}

export function createNewCard(
  id: string,
  deckId: string,
  front: string,
  back: string
): Card {
  return {
    id,
    deckId,
    front,
    back,
    createdAt: Date.now(),
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: Date.now(),
    lapses: 0
  }
}
