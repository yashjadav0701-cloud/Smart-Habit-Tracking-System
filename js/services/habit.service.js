/* js/services/habit.service.js */
import { supabase } from '../config/supabase.js';

/**
 * Fetches all active habits for the currently logged-in user.
 */
export async function getHabits() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching habits:", error.message);
        throw error;
    }

    return data;
}

/**
 * Creates a new habit in the database.
 */
export async function createHabit(habitData) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
        .from('habits')
        .insert([{
            user_id: userId,
            name: habitData.name.trim(),
            icon: habitData.icon || 'fa-bullseye',
            priority: habitData.priority || 'Medium',
            type: habitData.type || 'boolean',
            frequency: habitData.frequency || 'daily'
        }])
        .select()
        .single();

    if (error) {
        console.error("Error creating habit:", error.message);
        throw error;
    }

    return data;
}

/**
 * Updates an existing habit.
 */
export async function updateHabit(habitId, habitData) {
    const { data, error } = await supabase
        .from('habits')
        .update({
            name: habitData.name,
            icon: habitData.icon,
            priority: habitData.priority,
            updated_at: new Date().toISOString()
        })
        .eq('id', habitId)
        .select()
        .single();

    if (error) {
        console.error("Error updating habit:", error.message);
        throw error;
    }

    return data;
}

/**
 * Archives a habit (soft delete) so historical completion data isn't lost.
 */
export async function archiveHabit(habitId) {
    const { error } = await supabase
        .from('habits')
        .update({ 
            status: 'archived',
            updated_at: new Date().toISOString()
        })
        .eq('id', habitId);

    if (error) {
        console.error("Error archiving habit:", error.message);
        throw error;
    }
    
    return true;
}

/**
 * Fetches all archived habits for the currently logged-in user.
 */
export async function getArchivedHabits() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'archived')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Error fetching archived habits:", error.message);
        throw error;
    }

    return data;
}

/**
 * Permanently deletes a habit from the database.
 */
export async function deleteHabitPermanently(habitId) {
    const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

    if (error) {
        console.error("Error permanently deleting habit:", error.message);
        throw error;
    }
    
    return true;
}