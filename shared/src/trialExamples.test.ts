import {test,expect} from 'vitest';
import {generateMock} from './api/mock/seed';
import {createDataStore} from './api/store';
test('old illustrative results are archived; actual entered measurements survive',()=>{
 const db=generateMock(),t=db.trials[0];
 t.tests.push({origin:'operator',t:new Date().toISOString(),phase:'baseline',pointId:t.featureId+'-P1',n:2,value:17,metric:'infiltration_mm_hr',unit:'mm/h'});
 const saved=createDataStore(db,undefined,false).snapshot();
 expect(saved.trials[0].tests).toHaveLength(1);expect(saved.trials[0].tests[0].value).toBe(17);expect(saved.exampleTrialArchive?.[t.featureId].length).toBeGreaterThan(0);
 expect(createDataStore(saved,undefined,false).snapshot().exampleTrialArchive).toEqual(saved.exampleTrialArchive);
 expect(saved.trials.every(t=>!t.tests.some(r=>r.phase==='retest'))).toBe(true);
});
