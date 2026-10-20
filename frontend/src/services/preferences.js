import api from './api'
import {createPreferenceAdapter} from './preferenceClient'
let getAccessToken=()=>null
// Register the teammate's real token provider, never the local demo role/session.
export function configurePreferenceAuth(provider){if(typeof provider!=='function')throw Error('Token provider required');getAccessToken=provider}
export const preferenceAdapter=createPreferenceAdapter({transport:api,getToken:()=>getAccessToken()})
