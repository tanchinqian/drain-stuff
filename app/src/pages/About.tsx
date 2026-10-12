import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { api, isMock } from '../api/client';
import { QueryState } from '../components/QueryState';
export default function About() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config }),
    context = useOutletContext<{ demo: boolean } | undefined>();
  return (
    <QueryState loading={config.isPending} error={config.error}>
      <div className="page-heading">
        <div>
          <h1>What this pilot can tell us</h1>
          <p className="sub">About and limits · Synthetic demonstration</p>
        </div>
      </div>
      <section className="panel limits-copy">
        <h2>Feature scale, small sample</h2>
        <p style={{ marginTop: 12 }}>
          This console tracks a controlled comparison of local soil treatments, ponding and drain
          upkeep. The control, decompaction and decompaction + compost arms are measured at the same
          marked points.
        </p>
        <div className="notice">
          Pilot, small sample, not proof. No treatment verdict is inferred from these synthetic
          readings.
        </div>
        <h2>Limits of the claim</h2>
        <ul>
          <li>
            Measured at feature scale only. The console does not establish effects on river
            overflow, pond capacity or cross-boundary runoff.
          </li>
          <li>
            The team’s project brief reports: Malaysian compost-in-swale trials not found in its
            evidence pack. Verify that evidence gap before presenting the search as exhaustive.
          </li>
          <li>Foreign evidence, mostly from temperate US settings, is not Malaysian proof.</li>
          <li>The effect can fade, so re-tests are scheduled.</li>
          <li>
            Soil type changes the effect and compost may have negative effects in some soils. That
            is why the control arm exists.
          </li>
          <li>
            All thresholds labelled as placeholders require practitioner confirmation. Mature
            compost and a baseline are required before allocation.
          </li>
        </ul>
        <h2>Schematic and sensor limits</h2>
        <p>
          {config.data?.schematic.label}. Layer-depth defaults are illustrative and informed by
          foreign guidance, including temperate-climate examples. They are not verified Malaysian
          standard dimensions.
        </p>
        <ul>
          <li>
            Soil moisture and temperature provide an indirect infiltration proxy. The manual
            fixed-point test is the trial outcome.
          </li>
          <li>
            Level sensors can drift and need recalibration. A suspect sensor can cause an alert.
          </li>
          <li>
            Cheap capacitive compost moisture sensors read relatively, not absolutely; calibrate
            against the human squeeze test.
          </li>
          <li>The model is a schematic, not a design drawing.</li>
        </ul>
        <h3>Reference guidance</h3>
        <ul>
          <li>
            <a
              href="https://www.melbournewater.com.au/building-and-works/developer-guides-and-resources/standards-and-specifications/biofiltration"
              target="_blank"
              rel="noreferrer"
            >
              Melbourne Water biofiltration guidance
            </a>{' '}
            - Australian context.
          </li>
          <li>
            <a
              href="https://www.epa.gov/sites/default/files/2016-11/documents/final_gi_maintenance_508.pdf"
              target="_blank"
              rel="noreferrer"
            >
              US EPA green-infrastructure inspection guidance
            </a>{' '}
            - Foreign inspection prompts, including prolonged ponding.
          </li>
          <li>
            <a
              href="https://redac.eng.usm.my/index.php/sustainability-redac/bioecods-information/introduction"
              target="_blank"
              rel="noreferrer"
            >
              USM BIOECODS description
            </a>{' '}
            - Malaysian drainage-system context; not evidence of this compost trial.
          </li>
        </ul>
        <h3>Sensors excluded from this pilot</h3>
        <ul>
          <li>
            Oxygen probe: excluded by the project brief because moisture can damage the proposed
            probe.
          </li>
          <li>
            Ammonia gas sensor: excluded because the team has not established usable low-cost
            evidence. Human smell records are retained.
          </li>
        </ul>
        <h2>What is synthetic</h2>
        <p>
          Every house, sensor reading, fault, trial, compost batch and forecast displayed here is
          invented demonstration data. The Bandar Bukit Raja Phase 1 inspired scene is schematic,
          not a survey. This is an original hackathon console, not an official township system.
        </p>
        <h2>Data contract and sensor mapping</h2>
        <p>
          Contract version: {config.data?.contractVersion}. Current data source:{' '}
          {isMock
            ? 'browser-local deterministic mock'
            : 'configured HTTP API, expecting labelled synthetic payloads'}
          .
        </p>
        <p>
          Real feeds map a stable feature and sensor ID, an ISO timestamp, metric, numeric value,
          unit and sample count into the reading contract. Offline or missing readings remain
          unavailable, rather than zero. The backend owner supplies the configuration and enforces
          the same allocation gates.
        </p>
        <p>
          The current interface keeps its synthetic label. Real-data use requires a reviewed
          data-source label and validated thresholds before rollout.
        </p>
      </section>
      {context?.demo && (
        <section className="panel limits-copy" style={{ marginTop: 18 }}>
          <h2>Questions for the team · demo only</h2>
          <h3 style={{ marginTop: 15 }}>Mentor questions</h3>
          <ul>
            <li>Which swale or bioretention assets does the township operator still maintain?</li>
            <li>Where do landscape trimmings currently go?</li>
            <li>Which precinct could host a controlled pilot?</li>
            <li>Are infiltration and ponding already tracked?</li>
          </ul>
          <h3>Practitioner questions</h3>
          <ul>
            <li>Which maturity tests should be used?</li>
            <li>Which temperature, moisture and dose thresholds fit tropical conditions?</li>
            <li>Who owns each feature after handover?</li>
          </ul>
        </section>
      )}
    </QueryState>
  );
}
