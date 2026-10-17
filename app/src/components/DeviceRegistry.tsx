import Drawer, { DrawerFooter, drawerSaved } from './Drawer';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import SearchableSelect from './SearchableSelect';
import { assets } from '../../../shared/src/contract';
export default function DeviceRegistry() {
  const cache = useQueryClient(),
    rows = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 30000 });
  const [open, setOpen] = useState(false),
    [id, setId] = useState(''),
    [asset, setAsset] = useState('S1'),
    [part, setPart] = useState('inlet'),
    [mount, setMount] = useState(1),
    [crest, setCrest] = useState(0.25),
    [offset, setOffset] = useState(0),
    [interval, setInterval] = useState(900),
    [rise, setRise] = useState(0.15),
    [stuck, setStuck] = useState(4),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Commissioned devices</h2>
          <p className="small">
            Design-level, bench test pending. Register the installed mounting height and reference
            checks before accepting readings.
          </p>
        </div>
        <button onClick={() => setOpen(!open)}>
          {open ? 'Cancel registration' : 'Register device'}
        </button>
      </div>
      {rows.error && <p role="alert">{rows.error.message}</p>}
      {!rows.data?.length && <p>Register a device after recording its mounting height and reference checks.</p>}
      {open && (
        <Drawer title="Commission a device" onClose={() => setOpen(false)}><form id="device-commission"
          className="device-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await api.commission({
                id,
                assetId: asset as (typeof assets)[number],
                part: part as 'inlet',
                mountingHeightM: mount,
                overflowLevelM: crest,
                calibrationOffsetM: offset,
                intervalSeconds: interval,
                maxRiseMPerMin: rise,
                stuckReports: stuck,
              });
              await cache.invalidateQueries();
              drawerSaved();
              setOpen(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Device EUI · 16 hexadecimal characters
            <input
              required
              pattern="[a-fA-F0-9]{16}"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </label>
          <label className="field">
            Asset
            <SearchableSelect
              label="Device asset"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              {assets.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </SearchableSelect>
          </label>
          <label className="field">
            Mounted part
            <SearchableSelect
              label="Mounted part"
              value={part}
              onChange={(e) => setPart(e.target.value)}
            >
              {(asset === 'I1' || asset === 'R1'
                ? ['inlet', 'outfall']
                : ['inlet', 'drainage', 'underdrain', 'outfall']
              ).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SearchableSelect>
          </label>
          <label className="field">
            Mounting height above datum (m)
            <input
              required
              type="number"
              min=".3"
              max="6"
              step=".01"
              value={mount}
              onChange={(e) => setMount(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Highest measured / overflow level (m)
            <input
              required
              type="number"
              min="0"
              max="5"
              step=".01"
              value={crest}
              onChange={(e) => setCrest(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Reference calibration offset (m)
            <input
              type="number"
              min="-.2"
              max=".2"
              step=".001"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Normal interval (seconds)
            <input
              type="number"
              min="60"
              max="3600"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Suspect change threshold (m/min)
            <input
              type="number"
              min=".001"
              max="2"
              step=".001"
              value={rise}
              onChange={(e) => setRise(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Identical reports before suspect
            <input
              type="number"
              min="3"
              max="30"
              value={stuck}
              onChange={(e) => setStuck(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>
              <input required type="checkbox" /> I recorded two tape-measure reference levels and
              checked the clear beam and blind zone.
            </span>
          </label>
          {error && <p role="alert">{error}</p>}
          <DrawerFooter><button form="device-commission" className="primary" disabled={busy}>
            {busy ? 'Registering…' : 'Record commissioning'}
          </button></DrawerFooter>
        </form></Drawer>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Device</th>
              <th>Asset / part</th>
              <th>Mount</th>
              <th>Trust</th>
              <th>Commissioned</th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((d,index) => (
              <tr key={d.id}>
                <td><details><summary>{d.part==='inlet'?'Inlet':'Outlet'} level sensor {index+1}</summary><p>{d.id}</p></details></td>
                <td>
                  {d.assetId} · {d.part}
                </td>
                <td>{d.mountingHeightM} m</td>
                <td>
                  {d.status === 'offline'
                    ? 'Offline'
                    : d.trustReasons?.length
                      ? d.trustReasons.join(', ')
                      : 'Awaiting / trusted readings'}
                </td>
                <td>
                  {d.commissionedBy} · {new Date(d.commissionedAt).toLocaleDateString('en-MY')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
