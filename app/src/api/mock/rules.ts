import type {BatchChecks,BatchReading,Config,RuleOutput} from '../types';
export function maturityReason(checks:BatchChecks):string|null {
 if(!checks.intakeChecked)return 'Complete the intake contamination check.';
 if(checks.plasticsFound||checks.glassFound)return 'Remove and re-check contamination before release.';
 if(!checks.ambientReached)return 'Temperature has not returned to ambient.';
 if(!checks.didNotReheat)return 'Confirm the batch did not reheat after turning.';
 if(!checks.manualMaturity)return 'Manual maturity checks are pending.';
 return null;
}
export function evaluateRules(readings:BatchReading[],checks:BatchChecks,config:Config):RuleOutput[]{
 const latest=readings.at(-1);const outputs:RuleOutput[]=[];
 const add=(rule:string,action:string,why:string,severity:1|2|3)=>outputs.push({rule,action,why,severity,synthetic:true});
 if(latest){
  if(latest.tempC<config.temperature.turnBelow&&!checks.ambientReached)add('Low temperature','Turn pile','Reading is below the configured temperature band.',2);
  if(latest.tempC>config.temperature.coolAbove)add('High temperature','Turn or spread to cool','Reading exceeds the configured cooling threshold.',3);
  const goodDays=new Set(readings.filter(r=>r.tempC>=config.temperature.goodMin&&r.tempC<=config.temperature.goodMax).map(r=>r.t.slice(0,10))).size;
  if(goodDays>=config.temperature.days)add('Temperature history','Temperature band recorded','Configured band was recorded on at least three separate days; this does not establish maturity.',1);
  if(latest.moisturePct<config.moisture.min)add('Dry pile','Add water while turning','Moisture is below the configured band.',2);
  if(latest.moisturePct>config.moisture.max)add('Wet pile','Add dry carbon','Moisture is above the configured band.',2);
 }
 if(checks.rainExpected&&(!checks.bayCovered||!checks.sumpChecked))add('Leachate guard','Cover bay, hold turning, check sump','Rain is expected and cover or sump checks are incomplete.',3);
 return outputs;
}
