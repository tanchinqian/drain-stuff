import {existsSync,mkdtempSync,renameSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {resolve,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {Repository} from '../server/src/db';
if(existsSync('server/.env')) loadEnvFile('server/.env');
if(existsSync('.env.local')) loadEnvFile('.env.local');
const selfTest=process.argv.includes('--self-test'),root=process.cwd(),
  owned=selfTest?mkdtempSync(join(tmpdir(),'drain-reset-check-')):root,
  path=resolve(owned,selfTest?'fixture.sqlite':process.env.DB_PATH??'data/drain.sqlite');
if(relative(owned,path).startsWith('..')||relative(owned,path).includes(':')) throw new Error('Demo reset is limited to a database inside this project.');
if(!selfTest) {
  const start=Number(process.env.PORT??8080);
  const running=await Promise.all(Array.from({length:20},async(_,i)=>{
    try {const response=await fetch(`http://127.0.0.1:${start+i}/health`,{signal:AbortSignal.timeout(400)});const data=await response.json();return data.ok&&typeof data.contractVersion==='string';} catch {return false;}
  }));
  if(running.some(Boolean)) throw new Error('Stop the local API with Ctrl+C before resetting the demonstration.');
}
if(selfTest) {
  const old=new Repository(path);old.seed();const state=old.load();state.faults[0].status='closed';state.faults[0].workOrder={state:'closed'};old.save(state);old.close();
}
const suffix=randomUUID(),next=path+'.reset-'+suffix+'.sqlite',backup=path+'.backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';
const fresh=new Repository(next);fresh.seed();fresh.close();
if(existsSync(path)) {
  const old=new Database(path);await old.backup(backup);old.close();
}
renameSync(next,path);
if(selfTest) {
  const current=new Repository(path),previous=new Database(backup,{readonly:true});
  assert.equal(current.load().faults.find(f=>f.id==='F-001')!.workOrder?.state,'confirmed');
  assert.equal(JSON.parse(previous.prepare('SELECT body FROM app_state').get().body).faults[0].status,'closed');
  current.close();previous.close();console.log('SELF TEST PASS: fresh seed restored and prior records backed up in an isolated temporary folder.');
} else console.log(`Demo reset complete. Prior records: ${existsSync(backup)?backup:'no previous database'}. Restart npm run dev:all and reload the app; run a new storm to replace old saved results.`);
