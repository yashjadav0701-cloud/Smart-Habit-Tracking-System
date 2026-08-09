/* js/services/history.service.js */
import { supabase } from '../config/supabase.js';

/**
 * Fetches all successful habit completions for a user within a specific date range.
 * @param {string} startDate - The beginning of the month (Format: 'YYYY-MM-DD')
 * @param {string} endDate - The end of the month (Format: 'YYYY-MM-DD')
 */
export async function getMonthlyCompletions(startDate, endDate) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    
    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
        .from('habit_completions')
        .select('completion_date, habit_id')
        .eq('user_id', userId)
        .eq('completed', true) // We only care about habits that were actually done
        .gte('completion_date', startDate) // Greater than or equal to start of month
        .lte('completion_date', endDate);  // Less than or equal to end of month

    if (error) {
        console.error("Error fetching monthly history:", error.message);
        throw error;
    }

    return data;
}