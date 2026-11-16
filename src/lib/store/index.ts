import { supabase } from '../supabase'
import { localStore } from './localStore'
import { supabaseStore } from './supabaseStore'
import type { DataStore } from './types'

export const store: DataStore = supabase ? supabaseStore : localStore
export const isDemo = !supabase
export * from './types'
