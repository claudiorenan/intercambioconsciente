/**
 * Intercâmbio Consciente — Supabase Client Init
 * Credentials loaded from AppConfig (config.json or __IC_CONFIG__)
 */

let supabaseClient = null;

async function initSupabase() {
    await AppConfig.load();

    const url = AppConfig.supabaseUrl;
    const key = AppConfig.supabaseAnonKey;

    if (url && key && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(url, key);
    } else {
        console.warn('[IC] Supabase not configured. Set credentials in config.json or __IC_CONFIG__.');
    }

    window.supabaseClient = supabaseClient;
    return supabaseClient;
}

window.initSupabase = initSupabase;
window.supabaseClient = supabaseClient;
