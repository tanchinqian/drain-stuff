// Standalone TTN/ChirpStack formatter. Canonical contract: shared/src/iot.ts.
export function decodeUplink(input) {
  const b=input.bytes;
  if(!Array.isArray(b)||b.length!==12||b[0]!==1||b[1]>15||b.some(v=>!Number.isInteger(v)||v<0||v>255)) return {errors:['Unsupported payload size, version or flags']};
  const temperatureC=b[6]>127?b[6]-256:b[6];
  if(temperatureC< -40||temperatureC>85)return {errors:['Temperature outside payload range']};
  return {data:{version:1,flags:b[1],offsetMinutes:b[2]*256+b[3],distanceMm:b[4]*256+b[5],temperatureC,batteryMv:b[7]*256+b[8],counter:b[9]*65536+b[10]*256+b[11]}};
}
// Remove the `export` keyword when pasting into an integration's script editor.
