import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// Create client only if env vars are provided so the app can work offline/local-only.
if (supabaseUrl && supabaseAnonKey) {
	client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
