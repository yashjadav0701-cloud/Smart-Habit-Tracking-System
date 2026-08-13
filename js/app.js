(() => {
/* ==========================================================================
   1. CONFIGURATION & SUPABASE INIT
   ========================================================================== */
const SUPABASE_URL = 'https://cqanyrhcdqdnnhtitsot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxYW55cmhjZHFkbm5odGl0c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MjIzNTAsImV4cCI6MjA4NTQ5ODM1MH0.n-TMWsbEQz418ZmikiKYFY_1O7l-U2TnWlXPCRWQEwU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================================
   2. AUTHENTICATION SERVICES
   ========================================================================== */
async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) {
        console.error("Error logging in:", error.message);
        throw error;
    }
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
        throw error;
    }
    window.location.reload();
}

async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error.message);
        return null;
    }
    return data.session;
}

function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

/* ==========================================================================
   3. API & DATA SERVICES (Backend Logic)
   ========================================================================== */

// --- Habits Service ---
async function getHabits() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const { data, error } = await supabase
        .from('habits').select('*').eq('user_id', sessionData.session.user.id).eq('status', 'active')
        .order('display_order', { ascending: true }).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function getArchivedHabits() {
    const { data: sessionData } = await supabase.auth.getSession();
    
    // ADD THIS LINE: Verify the session exists before trying to read the user ID
    if (!sessionData.session) throw new Error("User not logged in");
    
    const { data, error } = await supabase
        .from('habits').select('*').eq('user_id', sessionData.session.user.id).eq('status', 'archived')
        .order('updated_at', { ascending: false });
        
    if (error) throw error;
    return data;
}

async function createHabit(habitData) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('habits').insert([{
        user_id: sessionData.session.user.id,
        name: habitData.name.trim(),
        icon: habitData.icon || 'fa-bullseye',
        priority: habitData.priority || 'Medium',
        type: habitData.type || 'boolean',
        target: habitData.target || 1,
        unit: habitData.unit || '',
        frequency: habitData.frequency || 'daily'
    }]).select().single();
    if (error) throw error;
    
    if (habitData.goal_id) {
        await supabase.from('goal_habits').insert([{ goal_id: habitData.goal_id, habit_id: data.id, user_id: sessionData.session.user.id }]);
    }
    return data;
}

async function updateHabit(habitId, habitData) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('habits').update({
        name: habitData.name, icon: habitData.icon, priority: habitData.priority, type: habitData.type, target: habitData.target, unit: habitData.unit, frequency: habitData.frequency, updated_at: new Date().toISOString()
    }).eq('id', habitId).select().single();
    if (error) throw error;
    
    await supabase.from('goal_habits').delete().eq('habit_id', habitId);
    if (habitData.goal_id) {
        await supabase.from('goal_habits').insert([{ goal_id: habitData.goal_id, habit_id: habitId, user_id: sessionData.session.user.id }]);
    }
    return data;
}

async function archiveHabit(habitId) {
    const { error } = await supabase.from('habits').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', habitId);
    if (error) throw error;
    return true;
}

async function deleteHabitPermanently(habitId) {
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) throw error;
    return true;
}

// --- Goal Linking Service ---
async function updateGoalProgressFromHabit(habitId, valueAdded) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    const { data: links } = await supabase.from('goal_habits').select('goal_id').eq('habit_id', habitId).eq('user_id', userId);
    if (links && links.length > 0) {
        for (const link of links) {
            const { data: goal } = await supabase.from('goals').select('current_value, target_value').eq('id', link.goal_id).single();
            if (goal) {
                let newVal = parseFloat(goal.current_value) + parseFloat(valueAdded);
                if (newVal < 0) newVal = 0;
                let status = newVal >= parseFloat(goal.target_value) ? 'completed' : 'active';
                await supabase.from('goals').update({ current_value: newVal, status: status }).eq('id', link.goal_id);
            }
        }
    }
}

// --- Completion Service ---
async function getDailyHabits(dateString) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const userId = sessionData.session.user.id;
    
    const { data: habits, error: habitsError } = await supabase.from('habits').select('*').eq('user_id', userId).eq('status', 'active').order('display_order', { ascending: true }).order('created_at', { ascending: false });
    if (habitsError) throw habitsError;
    
    const { data: completions, error: compError } = await supabase.from('habit_completions').select('*').eq('user_id', userId).eq('completion_date', dateString);
    if (compError) throw compError;
    
    const targetDate = new Date(dateString + 'T00:00:00'); 
    const dayOfWeek = targetDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const scheduledHabits = habits.filter(habit => {
        if (habit.frequency === 'weekdays' && isWeekend) return false;
        if (habit.frequency === 'weekends' && !isWeekend) return false;
        return true; 
    });

    return scheduledHabits.map(habit => {
        const completionRecord = completions.find(c => c.habit_id === habit.id);
        return { 
            ...habit, 
            is_completed: completionRecord ? completionRecord.completed : false,
            completion_value: completionRecord ? completionRecord.value : null
        };
    });
}

async function toggleHabitCompletion(habitId, dateString, isCompleted) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    if (isCompleted) {
        const { error } = await supabase.from('habit_completions').upsert({ habit_id: habitId, user_id: userId, completion_date: dateString, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'habit_id, completion_date' });
        if (error) throw error;
        await updateGoalProgressFromHabit(habitId, 1);
    } else {
        const { error } = await supabase.from('habit_completions').delete().match({ habit_id: habitId, completion_date: dateString, user_id: userId });
        if (error) throw error;
        await updateGoalProgressFromHabit(habitId, -1);
    }
}

async function logNumericProgress(habitId, dateString, value, target, previousValue = 0) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    const isCompleted = parseFloat(value) >= parseFloat(target);
    const valueDifference = parseFloat(value) - parseFloat(previousValue);
    
    if (parseFloat(value) > 0) {
        const { error } = await supabase.from('habit_completions').upsert({ 
            habit_id: habitId, user_id: userId, completion_date: dateString, 
            completed: isCompleted, value: value, completed_at: new Date().toISOString() 
        }, { onConflict: 'habit_id, completion_date' });
        if (error) throw error;
    } else {
        const { error } = await supabase.from('habit_completions').delete().match({ habit_id: habitId, completion_date: dateString, user_id: userId });
        if (error) throw error;
    }
    await updateGoalProgressFromHabit(habitId, valueDifference);
}

// --- History Service ---
async function getMonthlyCompletions(startDate, endDate) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('habit_completions').select('completion_date, habit_id').eq('user_id', sessionData.session.user.id).eq('completed', true).gte('completion_date', startDate).lte('completion_date', endDate);
    if (error) throw error;
    return data || [];
}

// --- Insights Service ---
async function getInsightStats() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    const { count: totalHabits } = await supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active');
    const { count: totalCompletions } = await supabase.from('habit_completions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true);
    return { totalHabits: totalHabits || 0, totalCompletions: totalCompletions || 0 };
}

async function getWeeklyTrend() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    const trendData = {};
    const today = new Date();
    const pastWeek = new Date(today);
    pastWeek.setDate(pastWeek.getDate() - 6);
    const startDateStr = `${pastWeek.getFullYear()}-${String(pastWeek.getMonth() + 1).padStart(2, '0')}-${String(pastWeek.getDate()).padStart(2, '0')}`;
    
    for(let i=0; i<=6; i++) {
        const d = new Date(pastWeek);
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        trendData[dateStr] = 0;
    }
    const { data, error } = await supabase.from('habit_completions').select('completion_date').eq('user_id', userId).eq('completed', true).gte('completion_date', startDateStr);
    if (!error && data) {
        data.forEach(record => {
            if(trendData[record.completion_date] !== undefined) trendData[record.completion_date]++;
        });
    }
    return trendData;
}

// --- Goals Service ---
async function getGoals() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    const { data, error } = await supabase.from('goals').select('*').eq('user_id', sessionData.session.user.id).order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

async function createGoal(title, targetValue = 100) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('goals').insert([{ 
        user_id: sessionData.session.user.id, 
        title: title,
        status: 'active',
        current_value: 0,
        target_value: targetValue
    }]).select().single();
    if (error) throw error;
    return data;
}

async function toggleGoalCompletion(goalId, isCompleted) {
    const { data: goal } = await supabase.from('goals').select('target_value').eq('id', goalId).single();
    const newStatus = isCompleted ? 'completed' : 'active';
    const newValue = isCompleted ? (goal ? goal.target_value : 100) : 0;
    const { error } = await supabase.from('goals').update({ 
        status: newStatus,
        current_value: newValue,
        updated_at: new Date().toISOString()
    }).eq('id', goalId);
    if (error) throw error;
}

async function deleteGoal(goalId) {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (error) throw error;
}

// --- Reflections Service ---
async function getDailyReflection(dateString) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("User not logged in");
    
    const { data, error } = await supabase
        .from('daily_reflections')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('reflection_date', dateString)
        .maybeSingle(); 
        
    if (error) throw error;
    return data;
}

async function saveDailyReflection(dateString, mood, note) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;
    
    // Check if an entry already exists for today
    const { data: existing } = await supabase.from('daily_reflections').select('id').eq('user_id', userId).eq('reflection_date', dateString).maybeSingle();

    if (existing) {
        // Update existing entry
        const { error } = await supabase.from('daily_reflections').update({ mood: mood, note: note, updated_at: new Date().toISOString() }).eq('id', existing.id);
        if (error) throw error;
    } else {
        // Create new entry
        const { error } = await supabase.from('daily_reflections').insert([{ user_id: userId, reflection_date: dateString, mood: mood, note: note }]);
        if (error) throw error;
    }
}


/* ==========================================================================
   4. UI COMPONENTS (Toast & Modals)
   ========================================================================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

function showConfirmDialog(title, message, onConfirm) {
    const modalContainer = document.getElementById('modals-container');
    modalContainer.innerHTML = `
        <div id="confirm-modal" class="modal-overlay active">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <h3 style="margin-bottom: 12px; font-size: 20px;">${title}</h3>
                <p class="text-muted" style="margin-bottom: 24px;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="btn-dialog-cancel" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white; width: 50%;">Cancel</button>
                    <button id="btn-dialog-confirm" class="btn btn-primary" style="width: 50%;">Confirm</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('btn-dialog-cancel').addEventListener('click', () => modalContainer.innerHTML = '');
    document.getElementById('btn-dialog-confirm').addEventListener('click', () => {
        modalContainer.innerHTML = '';
        if (onConfirm) onConfirm();
    });
}

async function openHabitModal(onSuccessCallback, existingHabit = null) {
    const modalContainer = document.getElementById('modals-container');
    const isEdit = !!existingHabit;
    
    let linkedGoalId = null;
    let availableGoals = [];
    try {
        availableGoals = await getGoals();
        if (isEdit) {
            const { data: sessionData } = await supabase.auth.getSession();
            const { data: linkData } = await supabase.from('goal_habits').select('goal_id').eq('habit_id', existingHabit.id).eq('user_id', sessionData.session.user.id).maybeSingle();
            if (linkData) linkedGoalId = linkData.goal_id;
        }
    } catch (e) { console.error(e); }
    
    const icons = [
        { class: 'fa-bullseye', name: 'Focus / Goals' }, { class: 'fa-dumbbell', name: 'Exercise' }, 
        { class: 'fa-book', name: 'Reading / Study' }, { class: 'fa-droplet', name: 'Hydration' }, 
        { class: 'fa-person-running', name: 'Cardio' }, { class: 'fa-bed', name: 'Sleep' }, 
        { class: 'fa-apple-whole', name: 'Nutrition' }, { class: 'fa-brain', name: 'Mindfulness' }, 
        { class: 'fa-code', name: 'Coding / Work' }, { class: 'fa-wallet', name: 'Finance' }, 
        { class: 'fa-heart', name: 'Health / Self-Care' }, { class: 'fa-music', name: 'Creative' }
    ];

    let selectedIcon = isEdit ? existingHabit.icon : icons[0].class;
    
    let goalOptions = '<option value="">-- No Linked Goal --</option>';
    availableGoals.forEach(g => {
        goalOptions += `<option value="${g.id}" ${linkedGoalId === g.id ? 'selected' : ''}>${g.title}</option>`;
    });

    modalContainer.innerHTML = `
        <div id="habit-modal" class="modal-overlay" style="pointer-events: auto;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit Habit' : 'Create New Habit'}</h2>
                    <button id="btn-close-modal" class="btn-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form id="habit-form">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Habit Name</label>
                        <input type="text" id="habit-name" autocomplete="off" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., Drink 2L Water..." value="${isEdit ? existingHabit.name.replace(/"/g, '&quot;') : ''}" required>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Choose Icon</label>
                        <div class="icon-selector" id="icon-selector">
                            ${icons.map(iconObj => `<div class="icon-option ${selectedIcon === iconObj.class ? 'selected' : ''}" data-icon="${iconObj.class}" title="${iconObj.name}"><i class="fa-solid ${iconObj.class}"></i></div>`).join('')}
                        </div>
                    </div>
                    
                    try {
            const habitData = {
                name: document.getElementById('habit-name').value,
                icon: selectedIcon,
                priority: document.getElementById('habit-priority').value,
                type: document.getElementById('habit-type').value,
                target: parseFloat(document.getElementById('habit-target').value) || 1,
                unit: document.getElementById('habit-unit').value.trim(),
                frequency: document.getElementById('habit-frequency').value
            };
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Habit Type</label>
                        <select id="habit-type" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm); cursor: pointer;" onchange="document.getElementById('numeric-fields').style.display = this.value === 'numeric' ? 'block' : 'none'">
                            <option value="boolean" ${!isEdit || existingHabit.type === 'boolean' ? 'selected' : ''}>Yes/No (Check-off)</option>
                            <option value="numeric" ${isEdit && existingHabit.type === 'numeric' ? 'selected' : ''}>Numeric Target</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Link to a Goal (Optional)</label>
                        <select id="habit-goal-link" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm); cursor: pointer;">
                            ${goalOptions}
                        </select>
                    </div>
                    
                    <div id="numeric-fields" style="display: ${isEdit && existingHabit.type === 'numeric' ? 'block' : 'none'}; margin-bottom: 32px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1;">
                                <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Target Goal</label>
                                <input type="number" id="habit-target" autocomplete="off" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., 5" value="${isEdit ? existingHabit.target : '1'}">
                            </div>
                            <div style="flex: 2;">
                                <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Unit</label>
                                <input type="text" id="habit-unit" autocomplete="off" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., Liters, Pages, Hours..." value="${isEdit ? (existingHabit.unit || '') : ''}">
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="btn-cancel-modal" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;">Cancel</button>
                        <button type="submit" id="btn-save-modal" class="btn btn-primary">${isEdit ? 'Update Habit' : 'Save Habit'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modal = document.getElementById('habit-modal');
    setTimeout(() => modal.classList.add('active'), 10);

    document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', (e) => {
            document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            selectedIcon = e.currentTarget.dataset.icon; 
        });
    });

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => { modalContainer.innerHTML = ''; }, 300); 
    };

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    document.getElementById('habit-form').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const btnSave = document.getElementById('btn-save-modal');
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btnSave.disabled = true;

        try {
            const habitData = {
                name: document.getElementById('habit-name').value,
                icon: selectedIcon,
                priority: document.getElementById('habit-priority').value,
                type: document.getElementById('habit-type').value,
                target: parseFloat(document.getElementById('habit-target').value) || 1,
                unit: document.getElementById('habit-unit').value.trim(),
                frequency: 'daily',
                goal_id: document.getElementById('habit-goal-link').value || null
            };

            if (isEdit) {
                await updateHabit(existingHabit.id, habitData);
                showToast("Habit updated successfully!", "success");
            } else {
                await createHabit(habitData);
                showToast("Habit created!", "success");
            }
            
            closeModal();
            if (onSuccessCallback) onSuccessCallback();
        } catch (error) {
            showToast("Failed to save habit: " + error.message, "error");
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
}

/* ==========================================================================
   5. PAGE RENDERING LOGIC
   ========================================================================== */

// --- Dashboard ---
async function renderDashboardPage(container) {
    const today = new Date();
    const displayDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div><h1>Dashboard</h1><p class="text-muted" style="margin-top: 4px;"><i class="fa-regular fa-calendar"></i> ${displayDate}</p></div>
            <div style="text-align: right;">
                <div id="progress-text" style="font-size: 32px; font-weight: 800; font-family: var(--font-heading); color: var(--primary);">0/0</div>
                <div class="text-muted" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Completed Today</div>
            </div>
        </div>
        
        <div id="dashboard-banner" class="glass-panel" style="display: none; margin-bottom: 24px; padding: 16px 24px; border-left: 4px solid var(--primary); background: linear-gradient(90deg, rgba(99,102,241,0.1) 0%, transparent 100%); transition: all 0.3s ease;">
            <h3 id="banner-title" style="margin-bottom: 4px; font-size: 18px; color: var(--text-main);">Ready to start your day?</h3>
            <p id="banner-text" class="text-muted" style="font-size: 14px;">Let's knock out those habits and build some momentum.</p>
        </div>

        <div id="daily-habits-container" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="glass-panel" style="text-align: center; padding: 40px;"><p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading today's habits...</p></div>
        </div>
    `;

    await loadDailyHabitsUI(dateString);

    document.getElementById('daily-habits-container').addEventListener('click', async (e) => {
        const card = e.target.closest('.daily-habit-card');
        if (!card) return; 

        const habitId = card.dataset.id;
        const habitType = card.dataset.type;

        // Handle Numeric Logging
        if (habitType === 'numeric') {
            if (e.target.closest('.btn-log')) {
                const inputEl = card.querySelector('.numeric-input');
                const val = parseFloat(inputEl.value) || 0;
                const target = parseFloat(card.dataset.target);
                const prevVal = parseFloat(inputEl.defaultValue) || 0;
                
                const btnLog = card.querySelector('.btn-log');
                btnLog.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                
                try { 
                    await logNumericProgress(habitId, dateString, val, target, prevVal); 
                    if (val >= target) showToast("Target reached! Excellent.", "success");
                    else showToast("Progress logged.", "info");
                    await loadDailyHabitsUI(dateString); 
                } 
                catch (error) { alert("Network error: Could not log progress."); await loadDailyHabitsUI(dateString); }
            }
            return; // Exit early so clicking a numeric card doesn't toggle it
        }

        // Handle Boolean Toggling
        if (habitType === 'boolean') {
            const newState = !card.classList.contains('completed'); 
            card.classList.toggle('completed', newState);
            const checkIcon = card.querySelector('.check-icon');
            
            if (newState) {
                checkIcon.classList.replace('fa-circle', 'fa-circle-check');
                checkIcon.style.color = 'var(--primary)';
                showToast("Habit completed! Great job.", "success");
            } else {
                checkIcon.classList.replace('fa-circle-check', 'fa-circle');
                checkIcon.style.color = 'var(--text-muted)';
                showToast("Habit unmarked.", "info");
            }
            
            updateProgressDisplay(); 
            try { await toggleHabitCompletion(habitId, dateString, newState); } 
            catch (error) { alert("Network error: Could not save progress."); await loadDailyHabitsUI(dateString); }
        }
    });
}

async function loadDailyHabitsUI(dateString) {
    const container = document.getElementById('daily-habits-container');
    try {
        const habits = await getDailyHabits(dateString);
        if (habits.length === 0) {
            container.innerHTML = `
                <div class="glass-panel" style="text-align: center; padding: 40px;">
                    <i class="fa-solid fa-mug-hot" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">You're all clear!</h3>
                    <p class="text-muted">No habits active for today. Check your Habits tab.</p>
                </div>`;
            updateProgressDisplay(0, 0);
            return;
        }

        container.innerHTML = habits.map(habit => {
            const isNumeric = habit.type === 'numeric';
            const currValue = habit.completion_value || '';
            
            return `
            <div class="daily-habit-card ${habit.is_completed ? 'completed' : ''}" data-id="${habit.id}" data-type="${habit.type}" data-target="${habit.target}" style="display: flex; align-items: center; padding: 20px; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); ${isNumeric ? '' : 'cursor: pointer;'} transition: all 0.2s ease;">
                
                ${!isNumeric ? `
                <div style="margin-right: 20px; font-size: 26px;">
                    <i class="fa-regular ${habit.is_completed ? 'fa-circle-check' : 'fa-circle'} check-icon" style="color: ${habit.is_completed ? 'var(--primary)' : 'var(--text-muted)'}; transition: color 0.2s;"></i>
                </div>
                ` : ''}

                <div style="flex: 1;">
                    <h3 class="habit-title" style="margin-bottom: 4px; font-size: 18px; transition: all 0.2s ease;">${habit.name}</h3>
                    <div class="text-muted" style="font-size: 13px;"><i class="fa-solid ${habit.icon}"></i> ${habit.priority} Priority</div>
                </div>

                ${isNumeric ? `
                <div class="habit-numeric-control" style="margin-left: 12px;">
                    <input type="number" class="numeric-input" value="${currValue}" placeholder="0">
                    <span class="numeric-unit">/ ${habit.target} ${habit.unit || ''}</span>
                    <button class="btn-log"><i class="fa-solid fa-floppy-disk"></i></button>
                </div>
                ` : ''}
            </div>
        `}).join('');
        updateProgressDisplay();
    } catch (error) { container.innerHTML = `<p class="text-danger">Failed to load habits: ${error.message}</p>`; }
}

function updateProgressDisplay(completedOverride, totalOverride) {
    const textEl = document.getElementById('progress-text');
    if (!textEl) return;
    
    let completed = completedOverride;
    let total = totalOverride;
    
    if (completed === undefined || total === undefined) {
        const cards = document.querySelectorAll('.daily-habit-card');
        completed = document.querySelectorAll('.daily-habit-card.completed').length;
        total = cards.length;
        
        cards.forEach(card => {
            const title = card.querySelector('.habit-title');
            if (card.classList.contains('completed')) {
                title.style.textDecoration = 'line-through'; title.style.color = 'var(--text-muted)'; card.style.borderColor = 'var(--border-color)'; card.style.opacity = '0.7';
            } else {
                title.style.textDecoration = 'none'; title.style.color = 'var(--text-main)'; card.style.opacity = '1';
            }
            card.onmouseenter = () => { if(!card.classList.contains('completed')) card.style.borderColor = 'var(--primary)'; };
            card.onmouseleave = () => { card.style.borderColor = 'var(--border-color)'; };
        });
    }
    
    textEl.textContent = `${completed}/${total}`;

    // Dynamic Banner Logic
    const banner = document.getElementById('dashboard-banner');
    const bannerTitle = document.getElementById('banner-title');
    const bannerText = document.getElementById('banner-text');
    
    if (banner && bannerTitle && bannerText) {
        if (total === 0) {
            banner.style.display = 'none';
        } else {
            banner.style.display = 'block';
            const percentage = completed / total;
            if (percentage === 1) {
                bannerTitle.textContent = "All clear! 🎉";
                bannerText.textContent = "Excellent work today. Take some time to relax, study, or crochet!";
                banner.style.borderLeftColor = "var(--success)";
            } else if (percentage >= 0.5) {
                bannerTitle.textContent = "Halfway there! 🚀";
                bannerText.textContent = "You are doing great. Keep up the pace!";
                banner.style.borderLeftColor = "var(--warning)";
            } else {
                bannerTitle.textContent = "Ready to start your day? 🌅";
                bannerText.textContent = "Let's knock out those habits and build some momentum.";
                banner.style.borderLeftColor = "var(--primary)";
            }
        }
    }
}

// --- Calendar ---
let currentDate = new Date();
async function renderCalendarPage(container) {
    container.innerHTML = `
        <div class="dashboard-header"><div><h1>Calendar</h1><p class="text-muted">Review your historical progress.</p></div></div>
        <div class="calendar-controls">
            <button id="btn-prev-month" class="btn-icon"><i class="fa-solid fa-chevron-left"></i></button>
            <h2 id="calendar-month-year">Loading...</h2>
            <button id="btn-next-month" class="btn-icon"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="calendar-grid" id="calendar-grid"></div>
    `;
    document.getElementById('btn-prev-month').addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() - 1); await updateCalendar(); });
    document.getElementById('btn-next-month').addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() + 1); await updateCalendar(); });
    await updateCalendar();
}

async function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); 
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
    const grid = document.getElementById('calendar-grid');
    
    let gridHtml = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-day-name">${d}</div>`).join('');
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    let completions = [];
    try { completions = await getMonthlyCompletions(startDateStr, endDateStr); } catch (e) { console.error(e); }

    const completionCounts = {};
    completions.forEach(record => { completionCounts[record.completion_date] = (completionCounts[record.completion_date] || 0) + 1; });

    for (let i = 0; i < firstDay.getDay(); i++) gridHtml += `<div class="calendar-day empty-day"></div>`;

    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const isToday = (i === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dotCount = completionCounts[dateString] || 0;
        let dotsHtml = '';
        for (let d = 0; d < dotCount; d++) dotsHtml += `<div class="dot"></div>`;
        gridHtml += `<div class="calendar-day ${isToday ? 'is-today' : ''}"><div class="day-number">${i}</div><div class="day-dots">${dotsHtml}</div></div>`;
    }
    grid.innerHTML = gridHtml;
}

// --- Manage Habits ---
let showingArchived = false;
let currentHabitsData = []; // Store habits globally for filtering

async function renderHabitsPage(container) {
    showingArchived = false; 
    container.innerHTML = `
        <div class="habits-header-actions">
            <div><h1 id="habits-page-title">Habits</h1><p id="habits-page-subtitle" class="text-muted">Manage your routines and objectives.</p></div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btn-toggle-archive" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;"><i class="fa-solid fa-box-archive"></i> <span id="archive-btn-text">Archived</span></button>
                <button id="btn-create-habit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Create Habit</button>
            </div>
        </div>
        
        <div id="habit-filters" style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
            <input type="text" id="filter-search" placeholder="Search habits..." style="flex: 1; min-width: 200px; padding: 10px 16px; background: var(--surface); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);">
            <select id="filter-priority" style="padding: 10px 16px; background: var(--surface); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm); cursor: pointer;">
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
            </select>
        </div>

        <div id="habits-list-container" class="habit-manage-list"><p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading habits...</p></div>
    `;

    document.getElementById('filter-search').addEventListener('input', renderFilteredHabits);
    document.getElementById('filter-priority').addEventListener('change', renderFilteredHabits);

    await loadHabitsUI();
    document.getElementById('btn-create-habit').addEventListener('click', () => openHabitModal(loadHabitsUI));

    document.getElementById('btn-toggle-archive').addEventListener('click', async () => {
        showingArchived = !showingArchived;
        const titleEl = document.getElementById('habits-page-title');
        const subtitleEl = document.getElementById('habits-page-subtitle');
        const btnTextEl = document.getElementById('archive-btn-text');
        const createBtn = document.getElementById('btn-create-habit');
        if (showingArchived) {
            titleEl.textContent = 'Archived Habits'; subtitleEl.textContent = 'View or permanently delete past routines.'; btnTextEl.textContent = 'Active Habits'; createBtn.style.display = 'none';
        } else {
            titleEl.textContent = 'Habits'; subtitleEl.textContent = 'Manage your routines and objectives.'; btnTextEl.textContent = 'Archived'; createBtn.style.display = 'block';
        }
        await loadHabitsUI();
    });

    document.getElementById('habits-list-container').addEventListener('click', async (e) => {
        const archiveBtn = e.target.closest('.btn-archive');
        if (archiveBtn) {
            showConfirmDialog("Archive Habit?", "Are you sure you want to archive this habit?", async () => {
                try {
                    archiveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await archiveHabit(archiveBtn.dataset.id);
                    showToast("Habit archived.", "info");
                    await loadHabitsUI(); 
                } catch (error) { showToast("Error archiving habit.", "error"); await loadHabitsUI(); }
            });
        }
        const deleteBtn = e.target.closest('.btn-delete-permanent');
        if (deleteBtn) {
            showConfirmDialog("Delete Permanently?", "This action cannot be undone.", async () => {
                try {
                    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await deleteHabitPermanently(deleteBtn.dataset.id);
                    showToast("Habit permanently deleted.", "success");
                    await loadHabitsUI(); 
                } catch (error) { showToast("Error deleting habit.", "error"); await loadHabitsUI(); }
            });
        }
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const habitData = {
                id: editBtn.dataset.id,
                name: editBtn.dataset.name,
                icon: editBtn.dataset.icon,
                priority: editBtn.dataset.priority,
                type: editBtn.dataset.type,
                target: editBtn.dataset.target,
                unit: editBtn.dataset.unit,
                frequency: editBtn.dataset.frequency
            };
            openHabitModal(loadHabitsUI, habitData);
        }
    });
}

function renderFilteredHabits() {
    const container = document.getElementById('habits-list-container');
    const searchQuery = document.getElementById('filter-search').value.toLowerCase();
    const priorityFilter = document.getElementById('filter-priority').value;

    const filtered = currentHabitsData.filter(habit => {
        const matchesSearch = habit.name.toLowerCase().includes(searchQuery);
        const matchesPriority = priorityFilter === 'All' || habit.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="glass-panel" style="text-align: center; padding: 40px;">
                <i class="fa-solid fa-filter-circle-xmark" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px;">No matches found</h3>
                <p class="text-muted">Try adjusting your search or filters.</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(habit => `
        <div class="habit-manage-card">
            <div class="habit-manage-info">
                <div class="habit-icon"><i class="fa-solid ${habit.icon}"></i></div>
                <div>
                    <h3 style="margin-bottom: 4px; font-size: 16px;">${habit.name}</h3>
                    <div class="habit-meta" style="font-size: 13px; color: var(--text-muted); display: flex; gap: 10px; align-items: center;">
                        <span class="badge ${habit.priority === 'High' ? 'badge-high' : (habit.priority === 'Medium' ? 'badge-medium' : 'badge-low')}">${habit.priority}</span>
                        <span style="text-transform: capitalize;">${habit.frequency.replace('_', ' ')}</span>
                    </div>
                </div>
            </div>
            <div class="habit-manage-actions">
                    ${showingArchived ? `<button class="btn-icon text-danger btn-delete-permanent" data-id="${habit.id}"><i class="fa-solid fa-trash"></i></button>` 
                : `<button class="btn-icon btn-edit" data-id="${habit.id}" data-name="${habit.name.replace(/"/g, '&quot;')}" data-icon="${habit.icon}" data-priority="${habit.priority}" data-type="${habit.type}" data-target="${habit.target}" data-unit="${habit.unit || ''}" data-frequency="${habit.frequency || 'daily'}"><i class="fa-solid fa-pencil"></i></button>
                   <button class="btn-icon text-danger btn-archive" data-id="${habit.id}"><i class="fa-solid fa-box-archive"></i></button>`}
            </div>
        </div>
    `).join('');
}

async function loadHabitsUI() {
    const container = document.getElementById('habits-list-container');
    try {
        currentHabitsData = showingArchived ? await getArchivedHabits() : await getHabits();
        if (currentHabitsData.length === 0) {
            container.innerHTML = `
                <div class="glass-panel" style="text-align: center; padding: 40px;">
                    <i class="fa-solid ${showingArchived ? 'fa-box-archive' : 'fa-list-check'}" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">${showingArchived ? 'No archived habits' : 'No habits yet'}</h3>
                </div>`;
            return;
        }
        
        renderFilteredHabits();
    } catch (error) { container.innerHTML = `<p class="text-danger">Error loading habits: ${error.message}</p>`; }
}

// --- Insights ---
async function renderInsightsPage(container) {
    container.innerHTML = `
        <div class="dashboard-header"><div><h1>Insights</h1><p class="text-muted">Analyze your discipline and consistency.</p></div></div>
        
        <div id="ai-insight-container">
            <div class="glass-panel" style="padding: 24px; text-align: center;"><p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Generating smart insights...</p></div>
        </div>

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-label">7-Day Consistency</div>
                <div class="stat-value" id="stat-completion-rate">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Active Habits</div>
                <div class="stat-value" id="stat-total-habits">-</div>
            </div>
        </div>
        <div class="insights-grid">
            <div class="chart-container">
                <h3>Last 7 Days Progress</h3>
                <div class="chart-wrapper"><canvas id="weekly-trend-chart"></canvas></div>
            </div>
        </div>
    `;

    try {
        const stats = await getInsightStats();
        const trendData = await getWeeklyTrend();
        const dates = Object.keys(trendData);
        const completionCounts = Object.values(trendData);
        
        // 1. Calculate the Completion Rate (Red/Yellow/Green logic)
        const totalPossibleCompletions = stats.totalHabits * 7;
        const actualCompletionsThisWeek = completionCounts.reduce((sum, count) => sum + count, 0);
        let completionPercentage = 0;
        
        if (totalPossibleCompletions > 0) {
            completionPercentage = Math.round((actualCompletionsThisWeek / totalPossibleCompletions) * 100);
        }

        let rateColor = 'var(--danger)'; // Red
        if (completionPercentage >= 75) rateColor = 'var(--success)'; // Green
        else if (completionPercentage >= 40) rateColor = 'var(--warning)'; // Yellow

        document.getElementById('stat-completion-rate').innerHTML = `<span style="color: ${rateColor}; text-shadow: 0 0 10px ${rateColor}40;">${completionPercentage}%</span>`;
        document.getElementById('stat-total-habits').textContent = stats.totalHabits;

        // 2. Generate Local "AI Insights" Text
        let insightMessage = "";
        if (stats.totalHabits === 0) {
            insightMessage = "You haven't set up any active habits yet! Head over to the Habits tab to start building your routine.";
        } else if (completionPercentage >= 80) {
            insightMessage = "Incredible consistency! You are crushing your goals this week. Keep protecting this momentum, especially with your pharmacy study blocks and creative crochet time.";
        } else if (completionPercentage >= 50) {
            insightMessage = "You're holding a steady pace. You've completed a good chunk of your habits, but there's room to push a little harder on your daily routine. Make sure you are balancing your studies with your craft breaks!";
        } else if (actualCompletionsThisWeek > 0) {
            insightMessage = "It's been a challenging week for your routines, but every step counts. Don't be too hard on yourself. Pick one core habit to focus on tomorrow and rebuild your streak.";
        } else {
            insightMessage = "We're waiting for your first completion this week! Remember why you started—take just 15 minutes today to check off a quick habit like hydration or a short study block.";
        }

        document.getElementById('ai-insight-container').innerHTML = `
            <div class="ai-insight-box">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <div class="ai-insight-text">
                    <h3>Smart Insight</h3>
                    <p>${insightMessage}</p>
                </div>
            </div>
        `;

        // 3. Render Chart
        const chartLabels = dates.map(dateStr => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }));
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';
        
        new Chart(document.getElementById('weekly-trend-chart').getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Habits Completed', data: completionCounts, borderColor: primaryColor, backgroundColor: primaryColor + '33', borderWidth: 3, pointBackgroundColor: '#0f172a', pointBorderColor: primaryColor, pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.4 
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
            }
        });
    } catch (error) { document.getElementById('ai-insight-container').innerHTML = `<p class="text-danger" style="margin-top: 20px;">Failed to load analytics: ${error.message}</p>`; }
}

// --- Goals ---
async function renderGoalsPage(container) {
    container.innerHTML = `
        <div class="dashboard-header"><div><h1>Goals</h1><p class="text-muted">Long-term objectives and milestones.</p></div><button id="btn-add-goal" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Goal</button></div>
        <div id="goals-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;"><p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading goals...</p></div>
    `;
    
    await renderGoalsListUI();

    document.getElementById('btn-add-goal').addEventListener('click', () => {
        const modalContainer = document.getElementById('modals-container');
        modalContainer.innerHTML = `
            <div id="goal-modal" class="modal-overlay active" style="pointer-events: auto;">
                <div class="modal-content" style="max-width: 400px;">
                    <h3 style="margin-bottom: 12px; font-size: 20px;">Add New Goal</h3>
                    <p class="text-muted" style="margin-bottom: 16px;">Enter your new long-term objective.</p>
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Goal Name</label>
                    <input type="text" id="goal-input-name" autocomplete="off" style="width: 100%; padding: 12px; margin-bottom: 16px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., Run a marathon...">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Target Value (e.g., 100 points, 50 hours)</label>
                    <input type="number" id="goal-input-target" autocomplete="off" style="width: 100%; padding: 12px; margin-bottom: 24px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="100" value="100">
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="btn-goal-cancel" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;">Cancel</button>
                        <button id="btn-goal-save" class="btn btn-primary">Save Goal</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('goal-input-name').focus();
        document.getElementById('btn-goal-cancel').addEventListener('click', () => modalContainer.innerHTML = '');
        
        document.getElementById('btn-goal-save').addEventListener('click', async () => {
            const goalName = document.getElementById('goal-input-name').value;
            const targetVal = parseFloat(document.getElementById('goal-input-target').value) || 100;
            if (goalName && goalName.trim() !== "") {
                try {
                    const btnSave = document.getElementById('btn-goal-save');
                    btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await createGoal(goalName.trim(), targetVal);
                    showToast("Goal added!", "success");
                    await renderGoalsListUI();
                    modalContainer.innerHTML = '';
                } catch (error) {
                    showToast("Failed to save goal.", "error");
                }
            } else showToast("Please enter a goal name", "error");
        });
    });

    // Event delegation for checkboxes and delete buttons
    const listContainer = document.getElementById('goals-list');
    listContainer.addEventListener('change', async (e) => {
        if (e.target.classList.contains('goal-checkbox')) {
            const goalId = e.target.dataset.id;
            const isChecked = e.target.checked;
            try {
                await toggleGoalCompletion(goalId, isChecked);
                if(isChecked) showToast("Goal achieved! Incredible work.", "success");
                await renderGoalsListUI();
            } catch (error) {
                showToast("Error updating goal.", "error");
                e.target.checked = !isChecked; // Revert UI
            }
        }
    });

    listContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete-goal');
        if (deleteBtn) {
            const goalId = deleteBtn.dataset.id;
            showConfirmDialog("Delete Goal?", "Are you sure you want to remove this goal?", async () => {
                try {
                    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await deleteGoal(goalId);
                    showToast("Goal removed.", "info");
                    await renderGoalsListUI();
                } catch (error) {
                    showToast("Error deleting goal.", "error");
                    await renderGoalsListUI();
                }
            });
        }
    });
}

async function renderGoalsListUI() {
    const list = document.getElementById('goals-list');
    try {
        const goals = await getGoals();
        if (goals.length === 0) {
            list.innerHTML = `<div class="glass-panel" style="text-align: center; padding: 40px;"><i class="fa-solid fa-bullseye" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i><h3 style="margin-bottom: 8px;">No goals set</h3></div>`;
            return;
        }
        
        list.innerHTML = goals.map(goal => {
            const isCompleted = goal.status === 'completed';
            const progress = (parseFloat(goal.current_value) / parseFloat(goal.target_value)) * 100;
            const displayProgress = Math.min(Math.max(progress, 0), 100).toFixed(0);

            return `
            <div class="glass-panel" style="display: flex; flex-direction: column; gap: 12px; padding: 20px; ${isCompleted ? 'opacity: 0.7;' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <input type="checkbox" class="goal-checkbox" data-id="${goal.id}" ${isCompleted ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-size: 18px; font-weight: 600; ${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${goal.title}</span>
                    </div>
                    <button class="btn-icon text-danger btn-delete-goal" data-id="${goal.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-left: 36px;">
                    <div style="flex: 1; height: 8px; background: var(--bg-deep); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div style="width: ${displayProgress}%; height: 100%; background: var(--primary); transition: width 0.3s ease;"></div>
                    </div>
                    <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${displayProgress}%</span>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        list.innerHTML = `<p class="text-danger">Error loading goals: ${error.message}</p>`;
    }
}

// --- Journal / Reflections ---
async function renderJournalPage(container) {
    const today = new Date();
    const displayDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <div class="dashboard-header">
            <div><h1>Daily Journal</h1><p class="text-muted"><i class="fa-regular fa-calendar"></i> ${displayDate}</p></div>
        </div>
        <div class="glass-panel" style="margin-top: 24px; padding: 32px;">
            <p class="text-muted" id="journal-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading today's entry...</p>
            
            <div id="journal-content" style="display: none;">
                <div style="margin-bottom: 32px;">
                    <label style="display: block; margin-bottom: 12px; color: var(--text-muted); font-size: 14px; font-weight: 600;">How are you feeling today?</label>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;" id="mood-selector">
                        <button class="btn-icon mood-btn" data-mood="Great" style="width: 50px; height: 50px; font-size: 24px;" title="Great">😁</button>
                        <button class="btn-icon mood-btn" data-mood="Good" style="width: 50px; height: 50px; font-size: 24px;" title="Good">🙂</button>
                        <button class="btn-icon mood-btn" data-mood="Okay" style="width: 50px; height: 50px; font-size: 24px;" title="Okay">😐</button>
                        <button class="btn-icon mood-btn" data-mood="Stressed" style="width: 50px; height: 50px; font-size: 24px;" title="Stressed">😫</button>
                        <button class="btn-icon mood-btn" data-mood="Bad" style="width: 50px; height: 50px; font-size: 24px;" title="Bad">😔</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px; font-weight: 600;">Daily Notes & Ideas</label>
                    <textarea id="journal-note" rows="8" placeholder="Brain dump your thoughts, study notes, or new pipe cleaner flower designs here..." style="width: 100%; padding: 16px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm); resize: vertical; font-family: var(--font-ui); line-height: 1.6;"></textarea>
                </div>
                
                <div style="text-align: right;">
                    <button id="btn-save-journal" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Entry</button>
                </div>
            </div>
        </div>
    `;

    try {
        const reflection = await getDailyReflection(dateString);
        document.getElementById('journal-loading').style.display = 'none';
        document.getElementById('journal-content').style.display = 'block';

        let selectedMood = reflection ? reflection.mood : null;
        const noteInput = document.getElementById('journal-note');
        const moodBtns = document.querySelectorAll('.mood-btn');
        
        if (reflection && reflection.note) noteInput.value = reflection.note;

        const updateMoodUI = () => {
            moodBtns.forEach(btn => {
                if (btn.dataset.mood === selectedMood) {
                    btn.style.background = 'var(--primary-glow)';
                    btn.style.borderColor = 'var(--primary)';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.borderColor = 'transparent';
                }
            });
        };
        updateMoodUI(); // Run once on load

        moodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectedMood = e.currentTarget.dataset.mood;
                updateMoodUI();
            });
        });

        document.getElementById('btn-save-journal').addEventListener('click', async () => {
            const btnSave = document.getElementById('btn-save-journal');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btnSave.disabled = true;

            try {
                await saveDailyReflection(dateString, selectedMood, noteInput.value.trim());
                showToast("Journal entry saved!", "success");
            } catch (error) {
                showToast("Failed to save entry.", "error");
            } finally {
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
            }
        });

    } catch (error) {
        document.getElementById('journal-loading').innerHTML = `<span class="text-danger">Failed to load journal: ${error.message}</span>`;
    }
}

// --- Profile ---
async function renderProfilePage(container) {
    const session = await getSession();
    const user = session?.user;
    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.full_name || 'Habit Tracker User';
    const userAvatar = user?.user_metadata?.avatar_url || '';

    container.innerHTML = `
        <div class="dashboard-header"><div><h1>Profile & Account</h1><p class="text-muted">Manage your identity and app preferences.</p></div></div>
        <div class="glass-panel" style="max-width: 500px; margin-top: 24px; padding: 32px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" style="width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--primary);">` : `<div style="width: 72px; height: 72px; border-radius: 50%; background: var(--primary-glow); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--primary); font-weight: 700;">${userName.charAt(0)}</div>`}
                <div><h2 style="font-size: 20px; margin-bottom: 4px;">${userName}</h2><p class="text-muted" style="font-size: 14px;">${userEmail}</p></div>
            </div>
            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 24px 0;">
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div><label class="text-muted" style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Authentication Method</label><p style="margin-top: 4px; font-weight: 500;"><i class="fa-brands fa-google" style="color: #4285F4; margin-right: 8px;"></i> Google OAuth</p></div>
                <div style="margin-top: 12px;"><button id="btn-logout" class="btn" style="width: 100%; background: var(--danger); border-color: var(--danger); color: white; display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</button></div>
            </div>
        </div>
    `;
    document.getElementById('btn-logout').addEventListener('click', async () => await signOut());
}

/* ==========================================================================
   6. APP INITIALIZATION & ROUTER
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const viewContainer = document.getElementById('view-container');
    const authScreen = document.getElementById('auth-screen');
    const btnLogin = document.getElementById('btn-login');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            try {
                btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
                await signInWithGoogle();
            } catch (error) {
                btnLogin.innerHTML = '<i class="fa-brands fa-google"></i> Continue with Google';
                alert("Login failed: " + error.message);
            }
        });
    }

    const session = await getSession();
    if (session) authScreen.classList.add('hidden');
    else authScreen.classList.remove('hidden');

    onAuthStateChange((event, newSession) => {
        if (newSession) authScreen.classList.add('hidden');
        else authScreen.classList.remove('hidden');
    });

    function navigateTo(route) {
        navLinks.forEach(link => {
            if (link.dataset.route === route) link.classList.add('active');
            else link.classList.remove('active');
        });

        viewContainer.classList.add('fade-out');

        setTimeout(() => {
            if (route === 'dashboard') renderDashboardPage(viewContainer);
            else if (route === 'habits') renderHabitsPage(viewContainer);
            else if (route === 'calendar') renderCalendarPage(viewContainer);
            else if (route === 'goals') renderGoalsPage(viewContainer);
            else if (route === 'journal') renderJournalPage(viewContainer);
            else if (route === 'insights') renderInsightsPage(viewContainer);
            else if (route === 'profile') renderProfilePage(viewContainer);
            else viewContainer.innerHTML = `<h1>404</h1><p>Coming Soon.</p>`;
            
            void viewContainer.offsetWidth; 
            viewContainer.classList.remove('fade-out');
        }, 250); 
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const route = link.dataset.route;
            window.location.hash = route; 
            navigateTo(route);
        });
    });

    const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(initialRoute);
});

})();