/* js/pages/habits.js */
import { getHabits, archiveHabit, getArchivedHabits, deleteHabitPermanently } from '../services/habit.service.js';
import { openHabitModal } from '../components/habitModal.js'; 
import { showToast, showConfirmDialog } from '../components/toast.js'; 

let showingArchived = false;

export async function renderHabitsPage(container) {
    showingArchived = false; // Reset view state on navigation

    // 1. Inject the structural HTML with Archived Toggle button
    container.innerHTML = `
        <div class="habits-header-actions">
            <div>
                <h1 id="habits-page-title">Habits</h1>
                <p id="habits-page-subtitle" class="text-muted">Manage your routines and objectives.</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-toggle-archive" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;">
                    <i class="fa-solid fa-box-archive"></i> <span id="archive-btn-text">Archived</span>
                </button>
                <button id="btn-create-habit" class="btn btn-primary">
                    <i class="fa-solid fa-plus"></i> Create Habit
                </button>
            </div>
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

    // 4. Toggle Archive View listener
    document.getElementById('btn-toggle-archive').addEventListener('click', async () => {
        showingArchived = !showingArchived;
        const titleEl = document.getElementById('habits-page-title');
        const subtitleEl = document.getElementById('habits-page-subtitle');
        const btnTextEl = document.getElementById('archive-btn-text');
        const createBtn = document.getElementById('btn-create-habit');

        if (showingArchived) {
            titleEl.textContent = 'Archived Habits';
            subtitleEl.textContent = 'View or permanently delete past routines.';
            btnTextEl.textContent = 'Active Habits';
            createBtn.style.display = 'none';
        } else {
            titleEl.textContent = 'Habits';
            subtitleEl.textContent = 'Manage your routines and objectives.';
            btnTextEl.textContent = 'Archived';
            createBtn.style.display = 'block';
        }

        await loadHabits();
    });

    // 5. Action Buttons listener using Event Delegation
    const listContainer = document.getElementById('habits-list-container');
    
    listContainer.addEventListener('click', async (e) => {
        // Handle Archive Action (Active tab)
        const archiveBtn = e.target.closest('.btn-archive');
        if (archiveBtn) {
            const habitId = archiveBtn.dataset.id;
            
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

        // Handle Permanent Delete Action (Archived tab)
        const deleteBtn = e.target.closest('.btn-delete-permanent');
        if (deleteBtn) {
            const habitId = deleteBtn.dataset.id;
            
            showConfirmDialog("Delete Permanently?", "This action cannot be undone. All history for this habit will be completely removed.", async () => {
                try {
                    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await deleteHabitPermanently(habitId);
                    showToast("Habit permanently deleted.", "success");
                    await loadHabits(); 
                } catch (error) {
                    showToast("Error deleting habit.", "error");
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
        const habits = showingArchived ? await getArchivedHabits() : await getHabits();
        
        if (habits.length === 0) {
            container.innerHTML = `
                <div class="glass-panel" style="text-align: center; padding: 40px;">
                    <i class="fa-solid ${showingArchived ? 'fa-box-archive' : 'fa-list-check'}" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">${showingArchived ? 'No archived habits' : 'No habits yet'}</h3>
                    <p class="text-muted">${showingArchived ? 'Archived habits will appear here.' : 'Click "Create Habit" to start building your discipline.'}</p>
                </div>
            `;
            return;
        }

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
                    ${showingArchived ? `
                        <button class="btn-icon text-danger btn-delete-permanent" data-id="${habit.id}" title="Delete Permanently"><i class="fa-solid fa-trash"></i></button>
                    ` : `
                        <button class="btn-icon btn-edit" data-id="${habit.id}"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-icon text-danger btn-archive" data-id="${habit.id}" title="Archive Habit"><i class="fa-solid fa-box-archive"></i></button>
                    `}
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