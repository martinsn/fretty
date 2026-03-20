/**
 * SM-2 Spaced Repetition Algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export function createCard() {
  return {
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: Date.now(),
  };
}

/**
 * Process a quality rating (0-5)
 * 0 - Complete blackout
 * 1 - Incorrect, but recognized
 * 2 - Incorrect, but easy to recall
 * 3 - Correct with difficulty
 * 4 - Correct with hesitation  
 * 5 - Perfect response
 */
export function sm2(card, quality) {
  const newCard = { ...card };
  
  if (quality >= 3) {
    // Correct response
    if (newCard.repetitions === 0) {
      newCard.interval = 1;
    } else if (newCard.repetitions === 1) {
      newCard.interval = 6;
    } else {
      newCard.interval = Math.round(newCard.interval * newCard.easiness);
    }
    newCard.repetitions += 1;
  } else {
    // Incorrect - reset
    newCard.repetitions = 0;
    newCard.interval = 1;
  }
  
  // Update easiness factor
  newCard.easiness = Math.max(
    1.3,
    newCard.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  // Set next review time
  newCard.nextReview = Date.now() + newCard.interval * 24 * 60 * 60 * 1000;
  
  return newCard;
}

/**
 * Get cards that are due for review
 */
export function getDueCards(cards, settings) {
  const now = Date.now();
  return Object.entries(cards)
    .filter(([key, card]) => card.nextReview <= now)
    .map(([key, card]) => ({ key, ...card }));
}

/**
 * Pick a random card from due cards, weighted by urgency
 */
export function pickDueCard(dueCards) {
  if (dueCards.length === 0) return null;
  return dueCards[Math.floor(Math.random() * dueCards.length)];
}
