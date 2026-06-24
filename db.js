/**
 * db.js — Supabase Database Integration
 */

// 👇 Yahan apna asli Supabase Project URL aur Anon Key daalein
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
