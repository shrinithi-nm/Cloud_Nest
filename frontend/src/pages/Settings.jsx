import {motion,useReducedMotion} from 'motion/react'
import {usePreferences} from '../components/preferenceContext'
import {applyPreset} from '../services/preferenceSchema'
import './Settings.css'
const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const labels={stats:'Overview',focus:'Study focus',exams:'Next exam',activity:'Recent activity',insight:'Study insight'}
export default function Settings(){
 const {preferences:p,preview,save,status,message,canSave,reload}=usePreferences();const reduced=useReducedMotion()
 const update=patch=>preview({...p,...patch})
 const study=patch=>update({study:{...p.study,...patch}})
 const toggleModule=key=>{const modules={...p.modules,[key]:!p.modules[key]};if(Object.values(modules).some(Boolean))update({modules})}
 return <motion.div className="personal-settings" initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.18}}>
  <header className="page-header"><p className="page-eyebrow">Your workspace</p><h1 className="page-title">{p.onboardingComplete?'Settings':'Make room for your routine'}</h1><p className="page-description">Choose what helps you focus. You can change these choices anytime.</p></header>
  <p role="status" aria-live="polite" className="settings-status">{message}</p>
  <div className="settings-grid" inert={status==='loading'||status==='saving'} aria-busy={status==='loading'||status==='saving'}>
   <section className="card settings-card"><h2>Start with a layout</h2><p>Presets adjust dashboard modules and your preferred planner.</p><div className="settings-options">{['Exam Focus','Daily Planner','Minimal Workspace'].map(name=><button type="button" className="secondary-button" key={name} onClick={()=>preview(applyPreset(name,p))}>{name}</button>)}</div>
    <label>Theme<select value={p.theme} onChange={e=>update({theme:e.target.value})}><option value="light">Light</option><option value="dark">Dark</option><option value="system">Use device setting</option></select></label>
    <label>Preferred planner<select value={p.preferredView} onChange={e=>update({preferredView:e.target.value})}><option value="tasks">Task list</option><option value="calendar">Calendar</option></select></label>
   </section>
   <section className="card settings-card"><h2>Dashboard modules</h2><p>Keep at least one module visible.</p><fieldset><legend className="settings-sr">Visible modules</legend>{Object.entries(labels).map(([key,label])=><label className="settings-check" key={key}><input type="checkbox" checked={p.modules[key]} disabled={p.modules[key]&&Object.values(p.modules).filter(Boolean).length===1} onChange={()=>toggleModule(key)}/>{label}</label>)}</fieldset></section>
   <section className="card settings-card"><h2>Study availability</h2><fieldset><legend>Study days</legend><div className="settings-options">{days.map((day,index)=><button type="button" key={day} aria-pressed={p.study.days.includes(index)} disabled={p.study.days.includes(index)&&p.study.days.length===1} onClick={()=>study({days:p.study.days.includes(index)?p.study.days.filter(d=>d!==index):[...p.study.days,index].sort()})}>{day}</button>)}</div></fieldset>
    <p className="settings-note">End must follow start on the same day.</p><StudyTimes key={p.study.start+':'+p.study.end} value={p.study} onApply={study}/>
    <label>Timezone<select value={p.study.timeZone} onChange={e=>study({timeZone:e.target.value})}>{[...new Set([p.study.timeZone,'Asia/Kolkata','UTC','Europe/London','America/New_York'])].map(zone=><option key={zone}>{zone}</option>)}</select></label>
   </section>
   <section className="card settings-card"><h2>Reminders</h2><label className="settings-check"><input type="checkbox" checked={p.reminders.enabled} onChange={e=>update({reminders:{...p.reminders,enabled:e.target.checked}})}/>Prefer study reminders</label><label>Reminder timing<select value={p.reminders.minutesBefore} onChange={e=>update({reminders:{...p.reminders,minutesBefore:Number(e.target.value)}})}>{[[15,'15 minutes before'],[30,'30 minutes before'],[60,'1 hour before'],[1440,'1 day before']].map(([n,label])=><option value={n} key={n}>{label}</option>)}</select></label><p className="settings-note">This records a preference. Reminder delivery is not connected yet.</p><label className="settings-check"><input type="checkbox" checked={p.onboardingComplete} onChange={e=>update({onboardingComplete:e.target.checked})}/>Finish workspace setup</label></section>
  </div>
  <footer className="settings-actions"><button type="button" className="primary-button" disabled={!canSave||status==='saved'||status==='saving'||status==='loading'} onClick={save}>{status==='saving'?'Saving...':'Save preferences'}</button><button type="button" className="secondary-button" onClick={reload} disabled={status==='loading'||status==='saving'}>Reload / retry</button><span>{canSave?'Changes can be saved to your account.':'Local preview - not saved to your account'}</span></footer>
 </motion.div>
}
import {useState} from 'react'
function StudyTimes({value,onApply}){const [start,setStart]=useState(value.start),[end,setEnd]=useState(value.end);const valid=/^\d{2}:\d{2}$/.test(start)&&/^\d{2}:\d{2}$/.test(end)&&start<end;return <div><div className="settings-options"><label>Start<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>End<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><button className="secondary-button" type="button" disabled={!valid} onClick={()=>onApply({start,end})}>Apply study hours</button>{!valid&&<p role="alert">Choose valid hours with end after start.</p>}</div>}
