/* js/pages/dashboard.js */
import { getDailyHabits, toggleHabitCompletion } from '../services/completion.service.js';
import { showToast } from '../components/toast.js';

/**
 * Renders the Daily Dashboard view.
 */
export async function renderDashboardPage(container) {
    // 1. Get today's date formatted for display and for the database
    const today = new Date();
    const displayDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Format to YYYY-MM-DD for Supabase
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 2. Inject structural HTML
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <h1>Dashboard</h1>
                <p class="text-muted" style="margin-top: 4px;"><i class="fa-regular fa-calendar"></i> ${displayDate}</p>
            </div>
            <div style="text-align: right;">
                <div id="progress-text" style="font-size: 32px; font-weight: 800; font-family: var(--font-heading); color: var(--primary);">0/0</div>
                <div class="text-muted" style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Completed Today</div>
            </div>
        </div>
        
        <div id="daily-habits-container" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="glass-panel" style="text-align: center; padding: 40px;">
                <p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading today's habits...</p>
            </div>
        </div>
    `;

    // 3. Fetch and render data
    await loadDailyHabits(dateString);

    // 4. Set up Event Delegation for the checklist (Optimistic UI update)
    const listContainer = document.getElementById('daily-habits-container');
    listContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.daily-habit-card');
        if (!card) return; // If they clicked outside a card, do nothing

        const habitId = card.dataset.id;
        const isCurrentlyCompleted = card.classList.contains('completed');
        const newState = !isCurrentlyCompleted; // Toggle state
        
        // --- OPTIMISTIC UI UPDATE (Instant visual feedback) ---
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
        
        updateProgressDisplay(); // Instantly update the 1/3 score

        // --- BACKGROUND DATABASE UPDATE ---
        try {
            await toggleHabitCompletion(habitId, dateString, newState);
        } catch (error) {
            // Revert UI if network request fails
            alert("Network error: Could not save progress. Reverting...");
            await loadDailyHabits(dateString); 
        }
    });
}

/**
 * Fetches the daily data and builds the HTML cards.
 */
async function loadDailyHabits(dateString) {
    const container = document.getElementById('daily-habits-container');
    try {
        const habits = await getDailyHabits(dateString);
        
        if (habits.length === 0) {
            container.innerHTML = `
                <div class="glass-panel" style="text-align: center; padding: 40px;">
                    <i class="fa-solid fa-mug-hot" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">You're all clear!</h3>
                    <p class="text-muted">No habits active for today. Check your Habits tab to create some.</p>
                </div>
            `;
            updateProgressDisplay(0, 0);
            return;
        }

        // Map habits to actionable UI cards
        container.innerHTML = habits.map(habit => `
            <div class="daily-habit-card ${habit.is_completed ? 'completed' : ''}" data-id="${habit.id}" style="display: flex; align-items: center; padding: 20px; background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease;">
                
                <div style="margin-right: 20px; font-size: 26px;">
                    <i class="fa-regular ${habit.is_completed ? 'fa-circle-check' : 'fa-circle'} check-icon" style="color: ${habit.is_completed ? 'var(--primary)' : 'var(--text-muted)'}; transition: color 0.2s;"></i>
                </div>
                
                <div style="flex: 1;">
                    <h3 class="habit-title" style="margin-bottom: 4px; font-size: 18px; transition: all 0.2s ease;">${habit.name}</h3>
                    <div class="text-muted" style="font-size: 13px;">
                        <i class="fa-solid ${habit.icon}"></i> ${habit.priority} Priority
                    </div>
                </div>
                
            </div>
        `).join('');

        // Calculate score based on initial load
        updateProgressDisplay();

    } catch (error) {
        container.innerHTML = `<p class="text-danger">Failed to load habits: ${error.message}</p>`;
    }
}

/**
 * Calculates how many cards have the 'completed' class and updates the text/strikethroughs.
 */
function updateProgressDisplay(completedOverride, totalOverride) {
    const textEl = document.getElementById('progress-text');
    if (!textEl) return;

    // Handle empty states
    if (completedOverride !== undefined && totalOverride !== undefined) {
        textEl.textContent = `${completedOverride}/${totalOverride}`;
        return;
    }

    const cards = document.querySelectorAll('.daily-habit-card');
    const total = cards.length;
    const completed = document.querySelectorAll('.daily-habit-card.completed').length;
    
    textEl.textContent = `${completed}/${total}`;
    
    // Apply strikethrough effect to completed habits
    cards.forEach(card => {
        const title = card.querySelector('.habit-title');
        if (card.classList.contains('completed')) {
            title.style.textDecoration = 'line-through';
            title.style.color = 'var(--text-muted)';
            card.style.borderColor = 'var(--border-color)';
            card.style.opacity = '0.7';
        } else {
            title.style.textDecoration = 'none';
            title.style.color = 'var(--text-main)';
            card.style.opacity = '1';
        }
        
        // Hover effect helper for interactive feel
        card.onmouseenter = () => { if(!card.classList.contains('completed')) card.style.borderColor = 'var(--primary)'; };
        card.onmouseleave = () => { card.style.borderColor = 'var(--border-color)'; };
    });
}