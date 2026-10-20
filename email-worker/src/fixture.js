import { readFile } from 'node:fs/promises'
import { simpleParser } from 'mailparser'
import { ingestMessage } from './ingestion.js'
const raw=await readFile(new URL('../fixtures/task.eml',import.meta.url));const jobs=[];let point
const result=await ingestMessage({queue:{add:async(name,data)=>{jobs.push({name,data})}},checkpoint:async p=>{point=p},connectionId:'fixture-only',uidValidity:'1',message:{uid:1,size:raw.length},decode:async()=>{const p=await simpleParser(raw,{skipHtmlToText:true,skipTextToHtml:true});return {subject:p.subject,text:p.text}}})
console.log(JSON.stringify({mode:'OFFLINE FIXTURE - memory queue only; no real mailbox, Redis, ownership or backend verified',result,jobs,checkpoint:point},null,2))
