import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://slcsghpevtbesxktqqhq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY3NnaHBldnRiZXN4a3RxcWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTc4NDgsImV4cCI6MjA5NTI5Mzg0OH0.cn7q2a5eFEs910P9cOwRtWYeX5gMDlqJRlw6Ej-6nzM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

