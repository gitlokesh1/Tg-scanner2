/**
 * db.js — Supabase Database Integration
 */

// 👇 Yahan apna asli Supabase Project URL aur Anon Key daalein
const SUPABASE_URL = 'https://vgbosvselqlzeznnadxb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYm9zdnNlbHFsemV6bm5hZHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzQyNDEsImV4cCI6MjA5MTIxMDI0MX0.O6lZJmjEQgWwEpCLmKwvagdSH807PARVL1bonSwnlyY';

// window.supabase CDN se aayega (index.html mein add kiya gaya hai)
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Save user session to Supabase
 */
export async function saveSessionToDB(phone, sessionStr, name) {
  const { error } = await supabase
    .from('telegram_sessions')
    .upsert({ 
      phone: phone, 
      session_string: sessionStr, 
      name: name,
      updated_at: new Date()
    });
    
  if (error) {
    console.error('[DB] Error saving session:', error);
  } else {
    console.info('[DB] Session saved successfully for', phone);
  }
}

/**
 * Load all user sessions from Supabase
 */
export async function loadSessionsFromDB() {
  const { data, error } = await supabase
    .from('telegram_sessions')
    .select('*');
    
  if (error) {
    console.error('[DB] Error loading sessions:', error);
    return [];
  }
  return data || [];
}
