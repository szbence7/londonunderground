import { useEffect, useMemo, useState } from 'react';
import DepartureBoard from './components/DepartureBoard';
import StationSelector from './components/StationSelector';
import { useBoardStore } from './state/boardStore';
import { useTflArrivals } from './hooks/useTflArrivals';
import { useLineStatus } from './hooks/useLineStatus';
import { groupArrivalsByPlatform } from './utils/groupArrivals';
import LineStripes from './components/LineStripes';
import './App.css';

function App() {
  const selectedStation = useBoardStore((s) => s.selectedStation);
  const setSelectedStation = useBoardStore((s) => s.setSelectedStation);

  const { arrivals, loading, error } = useTflArrivals(selectedStation?.id ?? null);
  const boards = useMemo(() => groupArrivalsByPlatform(arrivals), [arrivals]);

  const [activePlatform, setActivePlatform] = useState(0);
  useEffect(() => {
    setActivePlatform(0);
  }, [selectedStation?.id]);

  const activeBoard = boards[activePlatform] ?? boards[0] ?? null;
  const serviceMessage = useLineStatus(activeBoard?.lineIds ?? []);

  return (
    <div className="app-page">
      <h1>{selectedStation ? selectedStation.name : 'UK Train Board'}</h1>

      <div className="app-controls">
        <StationSelector onSelect={setSelectedStation} />
        {boards.length > 1 && (
          <div className="app-platform-tabs">
            {boards.map((board, i) => (
              <button
                key={board.platformLabel}
                type="button"
                className={`app-platform-tab${i === activePlatform ? ' is-active' : ''}`}
                onClick={() => setActivePlatform(i)}
              >
                <span>{board.platformLabel}</span>
                <LineStripes lineIds={board.lineIds} />
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedStation && <p className="app-hint">Search for a station above to see departures.</p>}
      {selectedStation && loading && arrivals.length === 0 && (
        <p className="app-hint">Loading arrivals&hellip;</p>
      )}
      {selectedStation && error && <p className="app-hint app-error">{error}</p>}

      {selectedStation && activeBoard && (
        <div className="app-board-group">
          {boards.length <= 1 && <p className="app-platform-label">{activeBoard.platformLabel}</p>}
          <DepartureBoard
            rows={activeBoard.rows}
            trainApproaching={activeBoard.trainApproaching}
            serviceMessage={serviceMessage}
          />
        </div>
      )}

      {selectedStation && !loading && !error && boards.length === 0 && (
        <p className="app-hint">No arrivals found for this station right now.</p>
      )}
    </div>
  );
}

export default App;
