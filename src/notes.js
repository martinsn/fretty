// Guitar string notes (standard tuning, from string 6 to string 1 / low E to high E)
// String 6 (low E) = index 0, String 1 (high E) = index 5
export const STRING_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];

// All notes in chromatic scale
export const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Whole notes (no sharps/flats) for beginners
export const WHOLE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Fret markers - which frets have dot markers on a real guitar
export const FRET_MARKERS = [3, 5, 7, 9, 12];
export const DOUBLE_MARKERS = [12]; // Double dots at 12th fret

// Maximum frets
export const MAX_FRETS = 12;

/**
 * Get the note at a specific string and fret
 * @param {number} stringIndex - 0-5 (0=low E, 5=high E)
 * @param {number} fret - 0-12 (0=open string)
 */
export function getNoteAt(stringIndex, fret) {
  const openNote = STRING_NOTES[stringIndex];
  const openNoteIndex = ALL_NOTES.indexOf(openNote);
  const noteIndex = (openNoteIndex + fret) % 12;
  return ALL_NOTES[noteIndex];
}

/**
 * Find all positions (string, fret) for a given note
 * @param {string} note - Note name like 'C', 'C#'
 * @param {Object} settings - { strings: [1-6], maxFret: 1-12, wholeNotesOnly: bool }
 */
export function findNotePositions(note, settings) {
  const positions = [];
  const { strings, maxFret } = settings;
  
  for (const string of strings) {
    const stringIndex = string - 1; // Convert 1-6 to 0-5
    for (let fret = 0; fret <= maxFret; fret++) {
      if (getNoteAt(stringIndex, fret) === note) {
        positions.push({ string, fret });
      }
    }
  }
  
  return positions;
}

/**
 * Get all playable positions based on settings
 */
export function getAllPositions(settings) {
  const positions = [];
  const { strings, maxFret, wholeNotesOnly } = settings;
  const notes = wholeNotesOnly ? WHOLE_NOTES : ALL_NOTES;
  
  for (const string of strings) {
    const stringIndex = string - 1;
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAt(stringIndex, fret);
      if (notes.includes(note)) {
        positions.push({ string, fret, note });
      }
    }
  }
  
  return positions;
}

/**
 * Format position as string key
 */
export function positionKey(string, fret) {
  return `${STRING_NOTES[string - 1]}_${fret}`;
}

/**
 * Parse position key back to string/fret
 */
export function parsePositionKey(key) {
  const [note, fret] = key.split('_');
  return {
    note,
    fret: parseInt(fret, 10),
    string: STRING_NOTES.indexOf(note) + 1
  };
}

/**
 * Get note name without sharps (for display)
 */
export function getFlatNote(note) {
  const flats = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  return flats[note] || note;
}
