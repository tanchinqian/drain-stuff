import type { Dispatch, SetStateAction } from 'react';
import type { PartId } from '../api/types';
import type { Assembly, Offsets, ViewMode } from '../three/DrainScene';
export interface ControlProps {
  selected: PartId;
  mode: ViewMode;
  setMode: Dispatch<SetStateAction<ViewMode>>;
  assembly: Assembly;
  setAssembly: Dispatch<SetStateAction<Assembly>>;
  explode: number;
  setExplode: Dispatch<SetStateAction<number>>;
  cutAxis: 'X' | 'Z';
  setCutAxis: Dispatch<SetStateAction<'X' | 'Z'>>;
  cutPosition: number;
  setCutPosition: Dispatch<SetStateAction<number>>;
  offsets: Offsets;
  setOffsets: Dispatch<SetStateAction<Offsets>>;
  move: boolean;
  setMove: Dispatch<SetStateAction<boolean>>;
  isolate: boolean;
  setIsolate: Dispatch<SetStateAction<boolean>>;
  hidden: PartId[];
  setHidden: Dispatch<SetStateAction<PartId[]>>;
  labels: boolean;
  setLabels: Dispatch<SetStateAction<boolean>>;
  wireframe: boolean;
  setWireframe: Dispatch<SetStateAction<boolean>>;
  edges: boolean;
  setEdges: Dispatch<SetStateAction<boolean>>;
  reset: number;
  setReset: Dispatch<SetStateAction<number>>;
  showSensors: boolean;
  setShowSensors: Dispatch<SetStateAction<boolean>>;
}
export function AssemblyControls({
  mode,
  assembly,
  setAssembly,
  explode,
  setExplode,
  cutAxis,
  setCutAxis,
  cutPosition,
  setCutPosition,
  labels,
  setLabels,
  wireframe,
  setWireframe,
  edges,
  setEdges,
  showSensors,
  setShowSensors,
}: ControlProps) {
  return (
    <>
      <div className="segments">
        {(['exploded', 'assembled', 'section'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={assembly === value}
            onClick={() => {
              setAssembly(value);
              if (value === 'assembled') setExplode(0);
              if (value === 'exploded' && !explode) setExplode(65);
            }}
          >
            {value === 'exploded'
              ? 'Exploded'
              : value === 'assembled'
                ? 'Assembled'
                : 'Cross-section'}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="explode">
          Explode <output>{explode}%</output>
        </label>
        <input
          id="explode"
          aria-label="Explode assembly"
          type="range"
          min="0"
          max="100"
          value={explode}
          onChange={(e) => {
            setExplode(Number(e.target.value));
            setAssembly('exploded');
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="cut-axis">Section axis</label>
        <select
          id="cut-axis"
          value={cutAxis}
          onChange={(e) => {
            setCutAxis(e.target.value as 'X' | 'Z');
            setAssembly('section');
          }}
        >
          <option>X</option>
          <option>Z</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="cut-position">Cut position</label>
        <input
          id="cut-position"
          aria-label="Section cut position"
          type="range"
          min="-3.5"
          max="5.5"
          step=".1"
          value={cutPosition}
          onChange={(e) => {
            setCutPosition(Number(e.target.value));
            setAssembly('section');
          }}
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={showSensors}
          onChange={(e) => setShowSensors(e.target.checked)}
        />
        Sensors
      </label>
      <label className="check">
        <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
        Part labels
      </label>
      {mode === 'Debug' && (
        <div className="inline">
          <label className="check">
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
            />
            Wireframe
          </label>
          <label className="check">
            <input type="checkbox" checked={edges} onChange={(e) => setEdges(e.target.checked)} />
            Edges
          </label>
          <p className="small">Part bounds are illustrative; units are schematic metres.</p>
        </div>
      )}
    </>
  );
}
export function PartControls({
  selected,
  offsets,
  setOffsets,
  move,
  setMove,
  isolate,
  setIsolate,
  setHidden,
  setReset,
}: ControlProps) {
  return (
    <>
      {' '}
      <div className="actions">
        <button aria-pressed={move} onClick={() => setMove(!move)}>
          Move part
        </button>
        <button aria-pressed={isolate} onClick={() => setIsolate(!isolate)}>
          Isolate part
        </button>
        <button onClick={() => setHidden((values) => [...values, selected])}>Hide part</button>
        <button
          onClick={() => {
            setHidden([]);
            setIsolate(false);
          }}
        >
          Show all
        </button>
        <button
          onClick={() => {
            setOffsets({});
            setHidden([]);
            setIsolate(false);
          }}
        >
          Reset parts
        </button>
        <button onClick={() => setReset((v) => v + 1)}>Reset view</button>
      </div>
      <div className="coordinate-grid">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <label className="field" key={axis}>
            Part shift {axis}
            <input
              type="number"
              step=".1"
              min="-5"
              max="5"
              value={(offsets[selected] || [0, 0, 0])[i]}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  const next: [number, number, number] = [...(offsets[selected] || [0, 0, 0])];
                  next[i] = Math.max(-5, Math.min(5, value));
                  setOffsets((current) => ({ ...current, [selected]: next }));
                }
              }}
            />
          </label>
        ))}
      </div>
      <p className="scene-caption">
        Drag to orbit · Scroll to zoom · In Move part, drag a mesh. Geometry and dimensions are
        illustrative.
      </p>
    </>
  );
}
