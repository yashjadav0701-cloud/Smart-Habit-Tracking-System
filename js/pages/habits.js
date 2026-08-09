/* js/pages/habits.js */
import { getHabits, archiveHabit } from '../services/habit.service.js';
import { openHabitModal } from '../components/habitModal.js'; 
import { showToast, showConfirmDialog } from '../components/toast.js'; // Use our new UI! 

export async function renderHabitsPage(container) {
    // 1. Inject the structural HTML
    container.innerHTML = `
        <div class="habits-header-actions">
            <div>
                <h1>Habits</h1>
                <p class="text-muted">Manage your routines and objectives.</p>
            </div>
            <button id="btn-create-habit" class="btn btn-primary">
                <i class="fa-solid fa-plus"></i> Create Habit
            </button>
        </div>
        <div id="habits-list-container" class="habit-manage-list">
            <p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading habits...</p>
        </div>
    `;

    // 2. Load the data
    await loadHabits();

    // 3. Create Button listener
    document.getElementById('btn-create-habit').addEventListener('click', () => {
        openHabitModal(loadHabits);
    });

    // 4. Action Buttons (Edit / Archive) listener using Event Delegation
    const listContainer = document.getElementById('habits-list-container');
    
    listContainer.addEventListener('click', async (e) => {
        // Find if the clicked element (or its parent) is the archive button
        const archiveBtn = e.target.closest('.btn-archive');
        if (archiveBtn) {
            const habitId = archiveBtn.dataset.id;
            
            // Use custom gorgeous dialog instead of ugly browser confirm!
            showConfirmDialog("Archive Habit?", "Are you sure you want to archive this habit? Past completion data will be kept.", async () => {
                try {
                    archiveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await archiveHabit(habitId);
                    showToast("Habit archived.", "info");
                    await loadHabits(); 
                } catch (error) {
                    showToast("Error archiving habit.", "error");
                    await loadHabits(); 
                }
            });
        }
        
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            showToast('Edit functionality coming in V2!', 'info');
        }
    });
}

async function loadHabits() {
    const container = document.getElementById('habits-list-container');
    try {
        const habits = await getHabits();
        
        if (habits.length === 0) {
            container.innerHTML = `
                <div class="glass-panel" style="text-align: center; padding: 40px;">
                    <i class="fa-solid fa-list-check" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">No habits yet</h3>
                    <p class="text-muted">Click "Create Habit" to start building your discipline.</p>
                </div>
            `;
            return;
        }

        // Map habits and embed the 'data-id' into the buttons so we know which one to archive
        container.innerHTML = habits.map(habit => `
            <div class="habit-manage-card">
                <div class="habit-manage-info">
                    <div class="habit-icon"><i class="fa-solid ${habit.icon}"></i></div>
                    <div>
                        <h3 style="margin-bottom: 4px; font-size: 16px;">${habit.name}</h3>
                        <div class="habit-meta" style="font-size: 13px; color: var(--text-muted); display: flex; gap: 10px; align-items: center;">
                            <span class="badge ${getPriorityClass(habit.priority)}">${habit.priority}</span>
                            <span style="text-transform: capitalize;">${habit.frequency.replace('_', ' ')}</span>
                        </div>
                    </div>
                </div>
                <div class="habit-manage-actions">
                    <button class="btn-icon btn-edit" data-id="${habit.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-icon text-danger btn-archive" data-id="${habit.id}"><i class="fa-solid fa-box-archive"></i></button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `<p class="text-danger">Error loading habits: ${error.message}</p>`;
    }
}

function getPriorityClass(priority) {
    if (priority === 'High') return 'badge-high';
    if (priority === 'Medium') return 'badge-medium';
    return 'badge-low';
}