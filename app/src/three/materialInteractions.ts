export const wetFinish=(wet:number)=>{
  const s=Math.max(0,Math.min(1,wet));return {albedo:1-s*.38,roughness:.95-s*.55};
};
export const mulchLift=(ponding:number,seed:number)=>seed>.85&&ponding>.06?ponding+.009:0;
export const damDischarge=(upstream:number,downstream:number,crest:number,width:number)=>
  1.7*Math.max(0,width)*Math.max(0,upstream-Math.max(downstream,crest))**1.5;
export const sockDarkening=(clog:number,wetness:number)=>1-.4*Math.max(0,Math.min(1,clog))-.15*Math.max(0,Math.min(1,wetness));
