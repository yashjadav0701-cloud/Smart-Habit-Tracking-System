/* js/config/supabase.js */

// 🛑 STOP: Replace these placeholder strings with your actual Supabase credentials.
// These specific variables (URL and Anon Key) are SAFE to put in your frontend code.
// NEVER put your "service_role" secret key here.

const SUPABASE_URL = 'https://cqanyrhcdqdnnhtitsot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxYW55cmhjZHFkbm5odGl0c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MjIzNTAsImV4cCI6MjA4NTQ5ODM1MH0.n-TMWsbEQz418ZmikiKYFY_1O7l-U2TnWlXPCRWQEwU';

// Initialize the Supabase client
// We use window.supabase because we loaded the library in index.html via CDN
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);