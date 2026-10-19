import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The Supabase client, or null when the site was built without its address and key.
 * The chart generator works either way; only login and saved embroideries need it.
 */
export const supabase = url && key ? createClient(url, key) : null
