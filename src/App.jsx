import { useState, useEffect, useCallback } from 'react';
import Fretboard from './Fretboard';
import { loadData, saveData, incrementStat } from './storage';
import { sm2 } from './sm2';
import { getDueCards, pickDueCard } from './sm2';
import { findNotePositions, getAllPositions, positionKey, getFlatNote, STRING_NOTES, WHOLE_NOTES } from './notes';

const MODE_LABELS = {
  noteToPosition: 'Find the note',
  positionToNote: 'Name the note',
};

export default function App() {
  const [data, setData] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentNote, setCurrentNote] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null); // 'correct' | 'wrong'
  const [showConfig, setShowConfig] = useState(false);
  const [practiceMode, setPracticeMode] = useState('noteToPosition');

  // Load data on mount
  useEffect(() => {
    const loaded = loadData();
    setData(loaded);
    setPracticeMode(loaded.settings.practiceMode || 'noteToPosition');
    pickNewCard(loaded);
  }, []);

  const pickNewCard = useCallback((appData = data) => {
    if (!appData) return;
    
    const { cards, settings } = appData;
    const positions = getAllPositions(settings);
    
    // Get due cards
    const dueCards = getDueCards(cards, settings);
    
    if (dueCards.length > 0) {
      const card = pickDueCard(dueCards);
      setCurrentCard(card);
      setCurrentNote(card.key);
    } else {
      // Pick random position to practice
      const randomPos = positions[Math.floor(Math.random() * positions.length)];
      const key = positionKey(randomPos.string, randomPos.fret);
      setCurrentCard({ key, ...cards[key] });
      setCurrentNote(randomPos.note);
    }
    
    setSelectedPosition(null);
    setShowResult(false);
    setLastResult(null);
  }, [data]);

  const handlePositionClick = (string, fret) => {
    if (showResult) return;
    
    const key = positionKey(string, fret);
    const { cards, settings } = data;
    const clickedCard = cards[key];
    const clickedNote = clickedCard ? getNoteAt(string - 1, fret) : null;
    
    setSelectedPosition({ string, fret });
    
    if (practiceMode === 'noteToPosition') {
      // User is finding positions for a note
      const targetNote = currentCard.key.split('_')[0];
      const isCorrect = clickedNote === targetNote;
      
      // Process SM-2
      const quality = isCorrect ? 4 : 1;
      const updatedCard = sm2(clickedCard || { easiness: 2.5, interval: 0, repetitions: 0, nextReview: Date.now() }, quality);
      
      const newCards = { ...cards, [key]: updatedCard };
      setData({ ...data, cards: newCards });
      saveData({ ...data, cards: newCards });
      incrementStat(data, isCorrect);
      
      setShowResult(true);
      setLastResult(isCorrect ? 'correct' : 'wrong');
      
      // Auto-advance after delay
      setTimeout(() => {
        pickNewCard({ ...data, cards: newCards });
      }, 1200);
      
    } else {
      // Position to note mode - user names the note
      // This is handled differently - they type the note
    }
  };

  const handleNoteAnswer = (answer) => {
    if (!currentCard || !currentNote) return;
    
    const correctNote = currentNote;
    const isCorrect = getFlatNote(answer) === getFlatNote(correctNote) || answer === correctNote;
    
    const updatedCard = sm2(currentCard, isCorrect ? 4 : 1);
    const newCards = { ...data.cards, [currentCard.key]: updatedCard };
    setData({ ...data, cards: newCards });
    saveData({ ...data, cards: newCards });
    incrementStat(data, isCorrect);
    
    setShowResult(true);
    setLastResult(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
      pickNewCard({ ...data, cards: newCards });
    }, 1200);
  };

  const handleModeChange = (mode) => {
    setPracticeMode(mode);
    const newData = { ...data, settings: { ...data.settings, practiceMode: mode } };
    setData(newData);
    saveData(newData);
    pickNewCard(newData);
  };

  const getNoteAt = (stringIndex, fret) => {
    const STRING_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];
    const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const openNote = STRING_NOTES[stringIndex];
    const openNoteIndex = ALL_NOTES.indexOf(openNote);
    return ALL_NOTES[(openNoteIndex + fret) % 12];
  };

  if (!data) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  const { stats, settings } = data;
  const targetNote = currentCard ? currentCard.key.split('_')[0] : null;
  const notesToPractice = settings.wholeNotesOnly ? WHOLE_NOTES : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">🎸 Fretty</h1>
        <div className="flex gap-4 items-center text-sm">
          <span className="text-gray-400">
            🔥 {stats.streak}
          </span>
          <span className="text-gray-400">
            ✅ {stats.correctToday} today
          </span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="max-w-4xl mx-auto mb-6 bg-white/5 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Settings</h2>
          
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Practice Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleModeChange('noteToPosition')}
                  className={`px-4 py-2 rounded-lg transition ${
                    practiceMode === 'noteToPosition' 
                      ? 'bg-indigo-600' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Find the Note
                </button>
                <button
                  onClick={() => handleModeChange('positionToNote')}
                  className={`px-4 py-2 rounded-lg transition ${
                    practiceMode === 'positionToNote' 
                      ? 'bg-indigo-600' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Name the Position
                </button>
              </div>
            </div>

            {/* Whole Notes Only */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="wholeNotes"
                checked={settings.wholeNotesOnly}
                onChange={(e) => {
                  const newSettings = { ...settings, wholeNotesOnly: e.target.checked };
                  setData({ ...data, settings: newSettings });
                  saveData({ ...data, settings: newSettings });
                  pickNewCard({ ...data, settings: newSettings });
                }}
                className="w-5 h-5"
              />
              <label htmlFor="wholeNotes" className="text-sm">
                Whole notes only (no sharps/flats)
              </label>
            </div>

            {/* Strings */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Strings</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      const strings = settings.strings.includes(s)
                        ? settings.strings.filter((x) => x !== s)
                        : [...settings.strings, s].sort();
                      if (strings.length > 0) {
                        const newSettings = { ...settings, strings };
                        setData({ ...data, settings: newSettings });
                        saveData({ ...data, settings: newSettings });
                        pickNewCard({ ...data, settings: newSettings });
                      }
                    }}
                    className={`w-10 h-10 rounded-lg transition font-mono ${
                      settings.strings.includes(s)
                        ? 'bg-indigo-600'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Fret */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Fret: {settings.maxFret}</label>
              <input
                type="range"
                min="3"
                max="12"
                value={settings.maxFret}
                onChange={(e) => {
                  const newSettings = { ...settings, maxFret: parseInt(e.target.value) };
                  setData({ ...data, settings: newSettings });
                  saveData({ ...data, settings: newSettings });
                  pickNewCard({ ...data, settings: newSettings });
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Note Display */}
        {practiceMode === 'noteToPosition' && targetNote && (
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-1">Find all positions for:</p>
            <p className="text-5xl font-mono font-bold text-indigo-400">
              {getFlatNote(targetNote)}
            </p>
          </div>
        )}

        {practiceMode === 'positionToNote' && currentCard && (
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-1">What note is at:</p>
            <p className="text-lg font-mono">
              String {currentCard.key.split('_')[0]}, Fret {currentCard.key.split('_')[1]}
            </p>
            {showResult && (
              <p className="text-3xl font-mono font-bold text-indigo-400 mt-2">
                {getFlatNote(currentCard.key.split('_')[0])}
              </p>
            )}
          </div>
        )}

        {/* Fretboard */}
        <Fretboard
          settings={settings}
          selectedPosition={selectedPosition}
          onPositionClick={handlePositionClick}
          showResult={showResult}
          lastResult={lastResult}
          targetNote={targetNote}
          getNoteAt={getNoteAt}
        />

        {/* Position to Note Answer Buttons */}
        {practiceMode === 'positionToNote' && !showResult && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2 text-center">Tap the correct note:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {notesToPractice.map((note) => (
                <button
                  key={note}
                  onClick={() => handleNoteAnswer(note)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-mono transition"
                >
                  {getFlatNote(note)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result Feedback */}
        {showResult && (
          <div className={`text-center py-4 rounded-xl mt-4 ${
            lastResult === 'correct' ? 'bg-green-600/20' : 'bg-red-600/20'
          }`}>
            <p className={`text-2xl font-bold ${
              lastResult === 'correct' ? 'text-green-400' : 'text-red-400'
            }`}>
              {lastResult === 'correct' ? '✓ Correct!' : `✗ Wrong - it was ${getFlatNote(currentCard.key.split('_')[0])}`}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Total practice sessions: {stats.totalPractice}</p>
          <p className="mt-1">
            Cards due for review: {getDueCards(data.cards, settings).length}
          </p>
        </div>
      </div>
    </div>
  );
}
