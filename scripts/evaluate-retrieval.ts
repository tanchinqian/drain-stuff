import {referenceCases} from '../shared/src/caseLibrary';
import {retrieve} from '../shared/src/retrieval';
const rows=referenceCases.map(c=>{const top=retrieve({text:c.symptoms,assetType:c.assetType,part:c.part,ruleId:c.ruleId,sensorFlags:c.sensorFlags},referenceCases.filter(other=>other.id!==c.id));return {id:c.id,cause:c.cause,matched:top.some(r=>r.item.cause===c.cause),top3:top.map(r=>r.item.id)};});
console.log(JSON.stringify({n:rows.length,matched:rows.filter(r=>r.matched).length,rows},null,2));
