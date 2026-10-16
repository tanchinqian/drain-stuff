import { useQuery } from '@tanstack/react-query';
import { api, isMock, showDataNotice } from '../api/client';
import { QueryState } from '../components/QueryState';
export default function About() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const sensors=useQuery({queryKey:['provenance-sensors'],queryFn:()=>api.sensors()});
  return (
    <QueryState loading={config.isPending} error={config.error}>
      <div className="page-heading">
        <h1>Data and limits</h1>
      </div>
      <section className="panel limits-copy">
        <h2>What the pilot can tell us</h2>
        <p>
          This pilot compares untreated soil, loosened soil and soil loosened with compost at the
          same marked spots. Repeat field tests establish the measured differences. A small pilot
          cannot establish a flood-reduction percentage or prove that compost works in every soil.
        </p>
        <h2>Model limits</h2>
        <p>
          The shared storm clock runs a reduced-order storage and drainage model. Entered
          conductivity and test records control infiltration. The recorded compost dose does not
          change conductivity automatically. The model needs local calibration and is not a forecast
          or an engineering design.
        </p>
        <p>
          Inlet, forebay and sock share a modelled path level. Soil shading and the wetting contour
          use the cached saturation field. Pipe fill follows stored pipe volume and discharge.
          Reverse river flow, sediment transport, mulch loss and biological fault causes are not
          fully solved. The compost model view presents the batch record and its checks.
        </p>
        <h2>Field checks matter</h2>
        <p>
          Check indirect sensors against a reference measurement. Human squeeze, smell, intake and
          maturity checks remain necessary. Offline readings stay unavailable. Thresholds and layer
          dimensions require practitioner confirmation against MSMA and the local authority before
          field use.
        </p>
        <p>
          Soil and compost moisture probes measure relative wetness. These readings do not establish
          nutrient safety, compost maturity, gas concentration or odour. Oxygen and ammonia probes
          are excluded; human smell checks remain.
        </p>
        <h2>Data</h2>
        <p>Sensor nodes are a design with a working ingest path and simulator. No hardware has been built, bench-tested or deployed. Battery life is an unmeasured estimate; coverage, frequency allocation and equipment approval remain unverified.</p>
        <p>Latest registered readings: {sensors.data?.filter(s=>s.readingSource==='simulated').length??0} from the device simulator; {sensors.data?.filter(s=>s.readingSource==='device').length??0} from authenticated device integrations. The database retains this source on every ingested reading. A device integration label alone is not evidence of field validation.</p>
        {config.data?.synthetic && (
          <p>
            This database includes seeded demonstration records. No field hardware is connected in
            this stage.
          </p>
        )}
        {!isMock && (
          <p>
            Connected records are saved to the local database. People using the shared operator
            token enter their own name; individual identities are not verified.
          </p>
        )}
        {showDataNotice() && (
          <p className="small">
            {isMock
              ? 'This environment uses generated local records, deterministic rainfall and browser-local saved changes.'
              : 'This environment reads and saves records through the configured API.'}
          </p>
        )}
        <p>
          Map footprints use credited OpenStreetMap geometry. Household assignments, heights and
          drain locations require a site survey. Record the same marked points, a baseline, the
          batch and labelled dose, the responsible person and follow-up checks.
        </p>
      </section>
    </QueryState>
  );
}
