import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npvmvqminzgbuxibonta.supabase.co';
const supabaseAnonKey = 'sb_publishable_8K9RXXg66ppXrYKgcVSElA_QzM0lhLK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
