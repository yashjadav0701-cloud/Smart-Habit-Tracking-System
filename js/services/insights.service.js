/* js/services/insights.service.js */
import { supabase } from '../config/supabase.js';

/**
 * Fetches basic lifetime statistics for the current user.
 */
export async function getInsightStats() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const userId = sessionData.session.user.id;

    // 1. Count total active habits
    const { count: habitsCount, error: habitsError } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true }) // 'head: true' returns only the count, not the data (faster)
        .eq('user_id', userId)
        .eq('status', 'active');

    if (habitsError) throw habitsError;

    // 2. Count total lifetime completions
    const { count: completionsCount, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true);

    if (completionsError) throw completionsError;

    return {
        totalHabits: habitsCount || 0,
        totalCompletions: completionsCount || 0
    };
}

/**
 * Fetches completion data for the last 7 days to build a trend chart.
 */
export async function getWeeklyTrend() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const userId = sessionData.session.user.id;

    // Calculate the date 7 days ago
    const today = new Date();
    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 6); // 7 days total (including today)

    // Format to YYYY-MM-DD
    const startDateStr = `${pastWeek.getFullYear()}-${String(pastWeek.getMonth() + 1).padStart(2, '0')}-${String(pastWeek.getDate()).padStart(2, '0')}`;
    
    // Fetch all completions from the last 7 days
    const { data, error } = await supabase
        .from('habit_completions')
        .select('completion_date')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completion_date', startDateStr);

    if (error) throw error;

    // Create an empty dictionary for the last 7 days (e.g., {'2026-08-04': 0, '2026-08-05': 0, ...})
    const trend = {};
    for (let i = 0; i <= 6; i++) {
        const d = new Date(pastWeek);
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        trend[dateStr] = 0;
    }

    // Tally up the completions for each day
    data.forEach(record => {
        if (trend[record.completion_date] !== undefined) {
            trend[record.completion_date]++;
        }
    });

    return trend; // Returns an object mapped with dates and completion counts
}