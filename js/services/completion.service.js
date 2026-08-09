/* js/services/completion.service.js */
import { supabase } from '../config/supabase.js';

/**
 * Fetches all active habits and merges them with their completion status for a specific date.
 * @param {string} dateString - The date to fetch (Format: 'YYYY-MM-DD')
 */
export async function getDailyHabits(dateString) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const userId = sessionData.session.user.id;

    // 1. Get all active habits
    const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (habitsError) {
        console.error("Error fetching habits:", habitsError.message);
        throw habitsError;
    }

    // 2. Get completions strictly for the requested date
    const { data: completions, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('completion_date', dateString);

    if (completionsError) {
        console.error("Error fetching completions:", completionsError.message);
        throw completionsError;
    }

    // 3. Merge them together so the frontend knows what is checked/unchecked
    const dailyHabits = habits.map(habit => {
        const completionRecord = completions.find(c => c.habit_id === habit.id);
        return {
            ...habit,
            is_completed: completionRecord ? completionRecord.completed : false,
            completion_id: completionRecord ? completionRecord.id : null
        };
    });

    return dailyHabits;
}

/**
 * Toggles a habit's completion status.
 * If true, it saves a completion record. If false, it deletes the completion record.
 */
export async function toggleHabitCompletion(habitId, dateString, isCompleted) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;

    if (isCompleted) {
        // Mark as DONE (Upsert prevents duplicates if user clicks rapidly)
        const { data, error } = await supabase
            .from('habit_completions')
            .upsert({
                habit_id: habitId,
                user_id: userId,
                completion_date: dateString,
                completed: true,
                completed_at: new Date().toISOString()
            }, { onConflict: 'habit_id, completion_date' })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    } else {
        // Mark as UNDONE (Delete the completion record for this date)
        const { error } = await supabase
            .from('habit_completions')
            .delete()
            .match({ habit_id: habitId, completion_date: dateString, user_id: userId });
            
        if (error) throw error;
        return null;
    }
}