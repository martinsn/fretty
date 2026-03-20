import { FRET_MARKERS, DOUBLE_MARKERS } from './notes';

export default function Fretboard({
  settings,
  selectedPosition,
  onPositionClick,
  showResult,
  lastResult,
  targetNote,
  getNoteAt,
}) {
  const { maxFret, strings } = settings;
  const numStrings = 6;
  
  // Fret positions (relative widths)
  const getFretWidth = (fret) => {
    // Frets get narrower as you go up the neck
    // This is a simplified representation
    return 1;
  };

  const handleClick = (stringNum, fret) => {
    if (!strings.includes(stringNum)) return;
    onPositionClick(stringNum, fret);
  };

  const isSelected = (stringNum, fret) => {
    return selectedPosition?.string === stringNum && selectedPosition?.fret === fret;
  };

  const isTargetNote = (stringNum, fret) => {
    if (!targetNote) return false;
    return getNoteAt(stringNum - 1, fret) === targetNote;
  };

  const getPositionClass = (stringNum, fret) => {
    if (isSelected(stringNum, fret)) {
      if (showResult) {
        return lastResult === 'correct' 
          ? 'bg-green-500 ring-4 ring-green-400' 
          : 'bg-red-500 ring-4 ring-red-400';
      }
      return 'bg-indigo-500 ring-4 ring-indigo-300';
    }
    if (showResult && isTargetNote(stringNum, fret)) {
      return 'bg-green-400/50';
    }
    if (strings.includes(stringNum)) {
      return 'bg-[#3d2820] hover:bg-[#4d3830] cursor-pointer';
    }
    return 'bg-[#2d1810]';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Nut (fret 0) */}
        <div className="flex">
          <div className="w-8 flex-shrink-0" /> {/* String labels space */}
          <div 
            className="h-2 bg-[#f5f5dc] flex-1 rounded-full"
          />
        </div>

        {/* Frets */}
        {[...Array(maxFret + 1)].map((_, fretIndex) => {
          const fret = fretIndex;
          const showMarker = FRET_MARKERS.includes(fret);
          const doubleMarker = DOUBLE_MARKERS.includes(fret);
          
          return (
            <div key={fret} className="flex">
              {/* Fret number */}
              <div className="w-8 flex-shrink-0 flex items-center justify-end pr-2">
                <span className="text-gray-500 text-xs font-mono">{fret}</span>
              </div>
              
              {/* Frets and strings */}
              <div className="flex-1 relative">
                {/* Fret bar */}
                <div 
                  className="absolute left-0 right-0 h-4 bg-[#c0c0c0] z-10"
                  style={{
                    top: '-2px',
                    transform: fret === 0 ? 'none' : 'none',
                  }}
                />
                
                {/* Strings and positions */}
                <div className="flex flex-col">
                  {[...Array(numStrings)].map((_, stringIndex) => {
                    const stringNum = stringIndex + 1;
                    const isLowE = stringNum === 6;
                    const stringColor = isLowE ? 'bg-[#d4af37]/60' : 'bg-[#d4af37]/40';
                    const stringHeight = isLowE ? 'h-1.5' : stringNum === 5 || stringNum === 4 ? 'h-1' : 'h-[2px]';
                    
                    return (
                      <div 
                        key={stringNum}
                        className={`relative ${stringHeight} ${stringColor}`}
                        style={{ marginTop: stringNum === 1 ? '2px' : '0' }}
                      >
                        {/* Clickable position area */}
                        <div
                          onClick={() => handleClick(stringNum, fret)}
                          className={`absolute inset-0 -top-1 -bottom-1 flex items-center justify-center transition-all ${getPositionClass(stringNum, fret)}`}
                          style={{ 
                            minWidth: '50px',
                            zIndex: strings.includes(stringNum) ? 5 : 1,
                          }}
                        >
                          {/* Open string indicator */}
                          {fret === 0 && (
                            <div className="absolute left-1 w-3 h-3 rounded-full bg-[#d4af37]/60" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Marker dots */}
                {showMarker && (
                  <div 
                    className="absolute left-1/2 transform -translate-x-1/2 z-20"
                    style={{ top: '50%', marginTop: doubleMarker ? '-20px' : '0' }}
                  >
                    <div 
                      className={`bg-[#f5f5dc]/80 rounded-full ${
                        doubleMarker ? 'w-4 h-4' : 'w-3 h-3'
                      }`}
                    />
                    {doubleMarker && (
                      <div 
                        className="bg-[#f5f5dc]/80 rounded-full w-3 h-3 mt-4"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom nut (after last fret) */}
        <div className="flex">
          <div className="w-8 flex-shrink-0" />
          <div className="h-2 bg-[#c0c0c0] flex-1 rounded-full" />
        </div>

        {/* String labels */}
        <div className="flex mt-2">
          <div className="w-8 flex-shrink-0" />
          <div className="flex-1 flex justify-around px-2">
            {['E', 'A', 'D', 'G', 'B', 'E'].map((note, i) => (
              <span key={i} className="text-gray-500 text-xs font-mono w-12 text-center">
                {note}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
