import { expect, it } from 'vitest';
import { repairSteps } from './repairSteps';
it('keeps sensor verification, safe surface access and maturity gates explicit', () => {
  expect(Object.values(repairSteps).every((steps) => steps.length >= 3)).toBe(true);
  expect(repairSteps.blockage.join(' ')).toContain('Do not enter');
  expect(repairSteps.sensor_suspect.join(' ')).toContain('manual reference');
  expect(repairSteps.not_heating.join(' ')).toContain('allocation gates');
  expect(repairSteps.blockage.join(' ')).toContain('does not run field tests automatically');
});
