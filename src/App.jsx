import { useState, useEffect, useCallback } from 'react';
import Fretboard from './Fretboard';
import { api } from './api';
import { getFlatNote, STRING_NOTES, WHOLE_NOTES, positionKey } from './notes';

const MODE_LABELS = {
  noteToPosition: 'Find the note',
  positionToNote: 'Name the note',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentNote, setCurrentNote] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [practiceMode, setPracticeMode] = useState('noteToPosition');
  const [stats, setStats] = useState({ total_practice: 0, correct_today: 0, streak: 0, cards_due: 0, cards_learned: 0 });
  const [settings, setSettings] = useState({ wholeNotesOnly: true, strings: [1,2,3,4,5,6], maxFret: 12 });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const init = async () => {
      if (api.isAuthenticated()) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          await loadData();
        } catch (e) {
          api.clearToken();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [statsData, settingsData] = await Promise.all([
        api.getStats(),
        api.getSettings(),
      ]);
      setStats(statsData);
      setSettings({
        wholeNotesOnly: settingsData.whole_notes_only,
        strings: settingsData.strings,
        maxFret: settingsData.max_fret,
        practiceMode: settingsData.practice_mode,
      });
      setPracticeMode(settingsData.practice_mode);
      await pickNewCard();
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, []);

  const pickNewCard = useCallback(async () => {
    try {
      const card = await api.getRandomCard();
      setCurrentCard(card);
      const [note] = card.position_key.split('_');
      setCurrentNote(note);
    } catch (e) {
      console.error('Failed to pick card:', e);
    }
    setSelectedPosition(null);
    setShowResult(false);
    setLastResult(null);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await api.login(loginForm.username, loginForm.password);
      } else {
        await api.register(loginForm.username, loginForm.password);
        // Initialize cards for new user
        await api.initializeCards();
      }
      const userData = await api.getMe();
      setUser(userData);
      await loadData();
    } catch (e) {
      setAuthError(e.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentCard(null);
    setStats({ total_practice: 0, correct_today: 0, streak: 0, cards_due: 0, cards_learned: 0 });
  };

  const handlePositionClick = async (stringNum, fret) => {
    if (showResult) return;

    const key = positionKey(stringNum, fret);
    setSelectedPosition({ string: stringNum, fret });

    if (practiceMode === 'noteToPosition') {
      // Check if this position has the target note
      const targetNote = currentCard?.position_key.split('_')[0];
      const clickedNote = getNoteAtPosition(stringNum, fret);
      const isCorrect = clickedNote === targetNote;

      try {
        await api.answerCard(key, isCorrect ? 4 : 1);
        setShowResult(true);
        setLastResult(isCorrect ? 'correct' : 'wrong');

        // Update stats
        const newStats = await api.getStats();
        setStats(newStats);

        setTimeout(() => pickNewCard(), 1200);
      } catch (e) {
        console.error('Failed to answer:', e);
      }
    }
  };

  const handleNoteAnswer = async (answer) => {
    if (!currentCard || !currentNote) return;

    const correctNote = currentNote;
    const isCorrect = answer === correctNote || getFlatNote(answer) === getFlatNote(correctNote);

    try {
      await api.answerCard(currentCard.position_key, isCorrect ? 4 : 1);
      setShowResult(true);
      setLastResult(isCorrect ? 'correct' : 'wrong');

      const newStats = await api.getStats();
      setStats(newStats);

      setTimeout(() => pickNewCard(), 1200);
    } catch (e) {
      console.error('Failed to answer:', e);
    }
  };

  const handleModeChange = async (mode) => {
    setPracticeMode(mode);
    try {
      await api.updateSettings({ ...settings, practiceMode: mode });
      setSettings({ ...settings, practiceMode: mode });
      await pickNewCard();
    } catch (e) {
      console.error('Failed to update mode:', e);
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await api.updateSettings(newSettings);
      await loadData();
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  };

  const getNoteAtPosition = (stringNum, fret) => {
    const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const openNote = STRING_NOTES[stringNum - 1];
    const openIndex = ALL_NOTES.indexOf(openNote);
    return ALL_NOTES[(openIndex + fret) % 12];
  };

  if (loading) {
    return <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center">Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-center mb-8">🎸 Fretty</h1>
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg font-semibold transition"
              >
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-400">
              {authMode === 'login' ? (
                <>Don't have an account? <button onClick={() => setAuthMode('register')} className="text-indigo-400 hover:underline">Sign up</button></>
              ) : (
                <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-indigo-400 hover:underline">Login</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - main app
  const targetNote = currentCard?.position_key.split('_')[0];
  const notesToPractice = settings.wholeNotesOnly ? WHOLE_NOTES : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">🎸 Fretty</h1>
        <div className="flex gap-4 items-center text-sm">
          <span className="text-gray-400">🔥 {stats.streak}</span>
          <span className="text-gray-400">✅ {stats.correct_today}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white">Logout</button>
          <button onClick={() => setShowConfig(!showConfig)} className="p-2 hover:bg-white/10 rounded-lg transition">⚙️</button>
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
                  className={`px-4 py-2 rounded-lg transition ${practiceMode === 'noteToPosition' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  Find the Note
                </button>
                <button
                  onClick={() => handleModeChange('positionToNote')}
                  className={`px-4 py-2 rounded-lg transition ${practiceMode === 'positionToNote' ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
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
                onChange={(e) => handleSettingChange('wholeNotesOnly', e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="wholeNotes" className="text-sm">Whole notes only (no sharps/flats)</label>
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
                      if (strings.length > 0) handleSettingChange('strings', strings);
                    }}
                    className={`w-10 h-10 rounded-lg transition font-mono ${settings.strings.includes(s) ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20'}`}
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
                onChange={(e) => handleSettingChange('maxFret', parseInt(e.target.value))}
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
            <p className="text-5xl font-mono font-bold text-indigo-400">{getFlatNote(targetNote)}</p>
          </div>
        )}

        {practiceMode === 'positionToNote' && currentCard && (
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-1">What note is at:</p>
            <p className="text-lg font-mono">String {currentCard.position_key.split('_')[0]}, Fret {currentCard.position_key.split('_')[1]}</p>
            {showResult && (
              <p className="text-3xl font-mono font-bold text-indigo-400 mt-2">{getFlatNote(targetNote)}</p>
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
          getNoteAt={getNoteAtPosition}
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
          <div className={`text-center py-4 rounded-xl mt-4 ${lastResult === 'correct' ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
            <p className={`text-2xl font-bold ${lastResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
              {lastResult === 'correct' ? '✓ Correct!' : `✗ Wrong - it was ${getFlatNote(targetNote)}`}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-gray-400 text-sm space-y-1">
          <p>Total practice sessions: {stats.total_practice}</p>
          <p>Cards learned: {stats.cards_learned}</p>
          <p>Cards due for review: {stats.cards_due}</p>
        </div>
      </div>
    </div>
  );
}
