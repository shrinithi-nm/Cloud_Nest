import {validatePreferences} from './preferenceSchema.js'
export function createPreferenceAdapter({transport,getToken}={}){
 async function auth(){const token=await getToken();if(typeof token!=='string'||!token.trim()||token.length>8192||/[\r\n]/.test(token))throw Error('Local preview: authenticated preferences are not connected.');return {Authorization:'Bearer '+token}}
 function decode(data){if(data?.version!==1||typeof data.revision!=='string'||data.revision.length>128)throw Error('Preferences response is incompatible.');return {preferences:validatePreferences(data.preferences),revision:data.revision}}
 return {
  async load(){const headers=await auth();return decode((await transport.get('/api/me/preferences',{headers,timeout:8000})).data)},
  async save(preferences,revision){if(!revision)throw Error('Load server preferences before saving.');const headers=await auth();try{return decode((await transport.put('/api/me/preferences',{version:1,preferences:validatePreferences(preferences)},{headers:{...headers,'If-Match':revision},timeout:8000})).data)}catch(e){if(e.response?.status===409||e.response?.status===412)throw Error('Settings changed elsewhere. Reload and review your changes.');throw Error('Settings were not saved. Check your connection and retry.')}}
 }
}
