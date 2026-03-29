import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vcvrqtqhtdltiofgxmsr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdnJxdHFodGRsdGlvZmd4bXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTA4NDgsImV4cCI6MjA5MDM4Njg0OH0.qeGrWsu8pZh5ZFvslhpMsTdW2TEF3QkFRyJDj39uw8w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = "ross"; // single user app

// Simple key-value store on top of Supabase
// Table: plan_data (user_id text, key text, value jsonb, updated_at timestamptz)

export async function dbGet(key) {
  try {
    const { data, error } = await supabase
      .from('plan_data')
      .select('value')
      .eq('user_id', USER_ID)
      .eq('key', key)
      .single();
    if (error || !data) return null;
    return data.value;
  } catch { return null; }
}

export async function dbSet(key, value) {
  try {
    const { error } = await supabase
      .from('plan_data')
      .upsert({ user_id: USER_ID, key, value, updated_at: new Date().toISOString() },
               { onConflict: 'user_id,key' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase write failed, falling back to localStorage:', e.message);
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return false;
  }
}

export async function dbGetAll() {
  try {
    const { data, error } = await supabase
      .from('plan_data')
      .select('key, value')
      .eq('user_id', USER_ID);
    if (error || !data) return {};
    return Object.fromEntries(data.map(r => [r.key, r.value]));
  } catch { return {}; }
}

// Migrate existing localStorage data to Supabase (run once)
export async function migrateFromLocalStorage() {
  const keys = ['ams_overrides', 'ams_photolog', 'ams_log', 'ams_memory', 'ams_weights'];
  const migrated = localStorage.getItem('ams_migrated');
  if (migrated) return;

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const value = JSON.parse(raw);
        await dbSet(key, value);
      } catch {}
    }
  }
  localStorage.setItem('ams_migrated', '1');
  console.log('Migrated localStorage → Supabase');
}
