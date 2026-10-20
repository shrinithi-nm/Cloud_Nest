import {createContext,useContext} from 'react'
export const PreferenceContext=createContext(null)
export function usePreferences(){const context=useContext(PreferenceContext);if(!context)throw Error('PreferencesProvider missing');return context}
