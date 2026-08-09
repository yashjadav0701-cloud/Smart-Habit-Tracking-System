/* js/auth/auth.js */
import { supabase } from '../config/supabase.js';

/**
 * Triggers the Google OAuth login flow.
 * Redirects the user to Google, and upon success, back to our app.
 */
export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Redirects back to exactly where the user is right now
            redirectTo: window.location.origin
        }
    });

    if (error) {
        console.error("Error logging in:", error.message);
        throw error;
    }
    return data;
}

/**
 * Logs the current user out and clears their local session.
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
        throw error;
    }
    // Force reload to clear application state
    window.location.reload();
}

/**
 * Checks if there is an active session (is the user currently logged in?)
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error.message);
        return null;
    }
    return data.session;
}

/**
 * Listens for changes in auth state (e.g., user logs in, logs out, or token expires)
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}