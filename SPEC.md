# Fretty - Guitar Fretboard Trainer

## Concept & Vision
A minimalist guitar fretboard trainer that feels like a native app. Clean, focused, distraction-free. The interface is the fretboard itself - everything else fades away. Spaced repetition ensures efficient memorization.

## Design Language
- **Aesthetic**: Dark mode, minimal, guitar-inspired
- **Colors**: 
  - Background: `#1a1a2e` (dark blue-black)
  - Fretboard: `#2d1810` (dark rosewood)
  - Frets: `#c0c0c0` (silver)
  - Strings: `#d4af37` (gold/nickel)
  - Markers: `#f5f5dc` (cream/pearl dots)
  - Accent: `#4f46e5` (indigo - like gym app)
  - Success: `#22c55e`
  - Error: `#ef4444`
- **Typography**: System fonts, monospace for notes
- **Motion**: Subtle transitions, instant feedback

## Features

### Fretboard Visualization
- 6 strings (E-A-D-G-B-E from bottom to top)
- 12 frets + open strings (fret 0)
- Realistic marker dots at frets 3, 5, 7, 9, 12 (double)
- Clickable positions for answering

### Practice Modes
- Note → Position: A random note is shown, find all positions
- Position → Note: A position is highlighted, identify the note

### Configuration
- Toggle: Whole notes only OR include sharps/flats
- Select: Which strings to practice (1-6, any combination)
- Select: Max fret (1-12)

### Spaced Repetition (SM-2)
- Each note/position combo has:
  - `easiness` (default 2.5)
  - `interval` (days until next review)
  - `repetitions` (consecutive correct answers)
  - `nextReview` (timestamp)
- Correct answer → increase interval
- Wrong answer → reset repetitions

### Progress
- Track which notes you know
- Show streak/consecutive correct
- Simple stats page

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- localStorage for persistence
- PWA (installable)

## Data Model
```javascript
{
  notes: {
    "C": { easiness: 2.5, interval: 1, repetitions: 0, nextReview: timestamp },
    // ... all notes
  },
  positions: {
    "E_0": { easiness: 2.5, interval: 1, repetitions: 0, nextReview: timestamp },
    "E_3": { ... },
    // string_fret format
  },
  settings: {
    wholeNotesOnly: true,
    strings: [1,2,3,4,5,6],
    maxFret: 12
  }
}
```

## Components
1. **Fretboard** - Main visualization, clickable frets
2. **NoteDisplay** - Shows current note to find
3. **ConfigPanel** - Settings UI
4. **StatsPanel** - Progress overview
