import { createHash } from 'node:crypto'
export const MAX_MESSAGE_BYTES = 131072
export class InvalidMail extends Error { constructor(code) { super(code); this.code=code } }
export function identity(connectionId, uidValidity, uid) {
 if (!/^[A-Za-z0-9_-]{1,100}$/.test(connectionId) || !/^\d+$/.test(String(uidValidity)) || !Number.isSafeInteger(uid) || uid<1) throw new InvalidMail('INVALID_IDENTITY')
 return createHash('sha256').update(JSON.stringify(['imap-v1',connectionId,String(uidValidity),uid])).digest('hex')
}
export function parseTask({subject,text='',size=0}) {
 if(size>MAX_MESSAGE_BYTES || Buffer.byteLength(text)>MAX_MESSAGE_BYTES) throw new InvalidMail('MESSAGE_TOO_LARGE')
 if(typeof subject!=='string' || !subject.startsWith('[CloudNest Task]')) return null
 const title=subject.slice(16).trim()
 if(title.length<1 || title.length>160 || /[\x00-\x1f\x7f]/.test(title)) throw new InvalidMail('INVALID_TITLE')
 const lines=text.replace(/\r\n/g,'\n').split('\n'); const fields={};let description='';let inDescription=false
 for(const line of lines){
  if(inDescription){description+=line+'\n';continue}
  if(!line.trim())continue
  const m=/^(Subject-Code|Due|Priority|Description):[ \t]*(.*)$/.exec(line)
  if(!m || Object.hasOwn(fields,m[1]))throw new InvalidMail('INVALID_FIELDS')
  fields[m[1]]=m[2].trim()
  if(m[1]==='Description'){inDescription=true;description=m[2]+'\n'}
 }
 if(!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(fields['Subject-Code']??''))throw new InvalidMail('INVALID_SUBJECT_CODE')
 const due=fields.Due??''
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(due)
 if(!m)throw new InvalidMail('TIMEZONE_REQUIRED')
 const [,y,mo,d,h,mi,s,zone]=m;const days=new Date(Date.UTC(+y,+mo,0)).getUTCDate()
 if(+y<2000 || +mo<1||+mo>12||+d<1||+d>days||+h>23||+mi>59||+s>59|| (zone!=='Z' && (+zone.slice(1,3)>14 || +zone.slice(4)>59 || (+zone.slice(1,3)===14&&+zone.slice(4)!==0))) || !Number.isFinite(Date.parse(due)))throw new InvalidMail('INVALID_DEADLINE')
 if(!['low','medium','high'].includes(fields.Priority))throw new InvalidMail('INVALID_PRIORITY')
 description=description.trim()
 if(description.length>4000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(description))throw new InvalidMail('INVALID_DESCRIPTION')
 return {title,subjectCode:fields['Subject-Code'],dueAt:new Date(due).toISOString(),priority:fields.Priority,description,visibility:'personal'}
}
