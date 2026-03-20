import { createCard } from './sm2';
import { getAllPositions, positionKey, STRING_NOTES } from './notes';

const STORAGE_KEY = 'fretty_data';

const DEFAULT_SETTINGS = {
  wholeNotesOnly: true,
  strings: [1, 2, 3, 4, 5, 6],
  maxFret: 12,
  practiceMode: 'noteToPosition', // 'noteToPosition' or 'positionToNote'
};

function createInitialData() {
  const positions = getAllPositions(DEFAULT_SETTINGS);
  const cards = {};
  
  for (const pos of positions) {
    const key = positionKey(pos.string, pos.fret);
    cards[key] = createCard();
  }
  
  return {
    cards,
    stats: {
      totalPractice: 0,
      correctToday: 0,
      streak: 0,
      lastPracticeDate: null,
    },
    settings: DEFAULT_SETTINGS,
  };
}

export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = createInitialData();
      saveData(initial);
      return initial;
    }
    
    const data = JSON.parse(stored);
    
    // Ensure all positions exist if settings changed
    const positions = getAllPositions(data.settings);
    for (const pos of positions) {
      const key = positionKey(pos.string, pos.fret);
      if (!data.cards[key]) {
        data.cards[key] = createCard();
      }
    }
    
    return data;
  } catch (e) {
    console.error('Failed to load data:', e);
    return createInitialData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function updateCard(data, key, card) {
  data.cards[key] = card;
  
  // Update stats
  const today = new Date().toDateString();
  if (data.stats.lastPracticeDate !== today) {
    data.stats.lastPracticeDate = today;
    data.stats.correctToday = 0;
  }
  
  saveData(data);
}

export function incrementStat(data, correct) {
  data.stats.totalPractice++;
  if (correct) {
    data.stats.correctToday++;
    data.stats.streak++;
  } else {
    data.stats.streak = 0;
  }
  
  const today = new Date().toDateString();
  data.stats.lastPracticeDate = today;
  
  saveData(data);
}

export function updateSettings(data, newSettings) {
  // Get all positions for new settings
  const positions = getAllPositions(newSettings);
  const newCards = {};
  
  // Keep existing card data for positions that still exist
  for (const pos of positions) {
    const key = positionKey(pos.string, pos.fret);
    newCards[key] = data.cards[key] || createCard();
  }
  
  data.cards = newCards;
  data.settings = newSettings;
  
  saveData(data);
}
