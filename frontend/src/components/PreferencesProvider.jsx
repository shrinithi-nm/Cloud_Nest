import {useEffect,useState} from 'react'
import {useLocation} from 'react-router-dom'
import {defaultPreferences,validatePreferences} from '../services/preferenceSchema'
import {preferenceAdapter} from '../services/preferences'
import {PreferenceContext} from './preferenceContext'
export function PreferencesProvider({children}){const {pathname}=useLocation();return <PreferenceSession key={pathname==='/login'?'signed-out':'workspace'}>{children}</PreferenceSession>}
function PreferenceSession({children}){
 const [preferences,setPreferences]=useState(()=>structuredClone(defaultPreferences))
 const [revision,setRevision]=useState(null),[status,setStatus]=useState('loading'),[message,setMessage]=useState('Loading your preferences...'),[generation,setGeneration]=useState(0)
 useEffect(()=>{let active=true;preferenceAdapter.load().then(r=>{if(active){setPreferences(r.preferences);setRevision(r.revision);setStatus('saved');setMessage('Preferences loaded.')}}).catch(()=>{if(active){setRevision(null);setStatus('preview');setMessage('Local preview. Account settings are unavailable; changes stay unsaved in this session.')}});return()=>{active=false}},[generation])
 const preview=p=>{setPreferences(validatePreferences(p));setStatus(revision?'unsaved':'preview');setMessage('Unsaved changes. Preview applied for this session.')}
 const save=async()=>{setStatus('saving');try{const r=await preferenceAdapter.save(preferences,revision);setPreferences(r.preferences);setRevision(r.revision);setStatus('saved');setMessage('Preferences saved.')}catch(e){setStatus('error');setMessage(e.message)}}
 const reload=()=>{setStatus('loading');setGeneration(n=>n+1)}
 return <PreferenceContext.Provider value={{preferences,preview,save,status,message,canSave:Boolean(revision),reload}}>{children}</PreferenceContext.Provider>
}
