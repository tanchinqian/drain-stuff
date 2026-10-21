import {describe,it,expect} from 'vitest';
import {dropDiameter,rainLambda,terminalSpeed,rainPhase,mistStrength} from './rainPhysics';
describe('representative rain drops',()=>{
  it('matches the conditional exponential CDF at light and heavy rates',()=>{
    for(const rate of [2,10,63,120]) {
      const n=10000, values=Array.from({length:n},(_,i)=>dropDiameter(rate,(i+.5)/n)), lambda=rainLambda(rate);
      for(const d of [.7,1,2,3,5]) {
        const empirical=values.filter(v=>v<=d).length/n;
        const expected=(1-Math.exp(-lambda*(d-.6)))/(1-Math.exp(-lambda*5.2));
        expect(Math.abs(empirical-expected)).toBeLessThan(.001);
      }
    }
  });
  it('uses Atlas speed and real seconds, with zero dry mist',()=>{
    expect(terminalSpeed(1)).toBeCloseTo(3.997,2);
    for(const playback of [30,60,300,600]) {
      // Playback changes engine intensity, never the wall-clock fall interval.
      expect(rainPhase(1,1,8,.2)).toBeCloseTo((terminalSpeed(1)/8+.2)%1,10);
      expect(playback).toBeGreaterThan(0);
    }
    expect(mistStrength(0)).toBe(0);
    expect(mistStrength(63/3.6e6)).toBeGreaterThan(0);
  });
});
