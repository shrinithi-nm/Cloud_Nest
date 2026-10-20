export const defaultPreferences={theme:'light',modules:{stats:true,focus:true,exams:true,activity:true,insight:true},preferredView:'tasks',study:{days:[1,2,3,4,5],start:'18:00',end:'20:00',timeZone:'Asia/Kolkata'},reminders:{enabled:false,minutesBefore:30},onboardingComplete:false}
const keys=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===names.length&&names.every(k=>Object.hasOwn(o,k))
export function validatePreferences(p){
 if(!keys(p,['theme','modules','preferredView','study','reminders','onboardingComplete']))throw Error('Settings fields are incomplete or unsupported.')
 if(!['light','dark','system'].includes(p.theme)||!['tasks','calendar'].includes(p.preferredView)||typeof p.onboardingComplete!=='boolean')throw Error('Choose a supported theme and planner view.')
 if(!keys(p.modules,Object.keys(defaultPreferences.modules))||!Object.values(p.modules).every(x=>typeof x==='boolean')||!Object.values(p.modules).some(Boolean))throw Error('Keep at least one dashboard module visible.')
 if(!keys(p.study,['days','start','end','timeZone'])||!Array.isArray(p.study.days)||p.study.days.length<1||p.study.days.length>7||new Set(p.study.days).size!==p.study.days.length||!p.study.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6))throw Error('Choose at least one unique study day.')
 const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/
 if(!time.test(p.study.start)||!time.test(p.study.end)||p.study.start>=p.study.end)throw Error('Study end must be after start on the same day.')
 if(typeof p.study.timeZone!=='string'||p.study.timeZone.length>64)throw Error('Choose a valid timezone.')
 try{new Intl.DateTimeFormat('en',{timeZone:p.study.timeZone})}catch{throw Error('Choose a valid timezone.')}
 if(!keys(p.reminders,['enabled','minutesBefore'])||typeof p.reminders.enabled!=='boolean'||![15,30,60,1440].includes(p.reminders.minutesBefore))throw Error('Choose a supported reminder interval.')
 return structuredClone(p)
}
export function applyPreset(name,current){const p=structuredClone(current);if(name==='Exam Focus'){p.modules={stats:true,focus:true,exams:true,activity:false,insight:false};p.preferredView='calendar'}else if(name==='Daily Planner'){p.modules={stats:true,focus:true,exams:true,activity:true,insight:false};p.preferredView='tasks'}else if(name==='Minimal Workspace'){p.modules={stats:false,focus:true,exams:false,activity:false,insight:false};p.preferredView='tasks'}else throw Error('Unknown preset');return validatePreferences(p)}
