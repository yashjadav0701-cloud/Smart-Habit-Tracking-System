/* js/pages/goals.js */
import { showToast } from '../components/toast.js';

export async function renderGoalsPage(container) {
    container.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h1>Goals</h1>
                <p class="text-muted">Long-term objectives and milestones.</p>
            </div>
            <button id="btn-add-goal" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Goal</button>
        </div>

        <div id="goals-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;"></div>
    `;

    renderGoalsList();

    document.getElementById('btn-add-goal').addEventListener('click', () => {
        const modalContainer = document.getElementById('modals-container');
        
        // Inject custom UI modal instead of browser prompt
        modalContainer.innerHTML = `
            <div id="goal-modal" class="modal-overlay active" style="pointer-events: auto;">
                <div class="modal-content" style="max-width: 400px;">
                    <h3 style="margin-bottom: 12px; font-size: 20px;">Add New Goal</h3>
                    <p class="text-muted" style="margin-bottom: 16px;">Enter your new long-term objective.</p>
                    <input type="text" id="goal-input-name" autocomplete="off" style="width: 100%; padding: 12px; margin-bottom: 24px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., Run a marathon...">
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="btn-goal-cancel" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;">Cancel</button>
                        <button id="btn-goal-save" class="btn btn-primary">Save Goal</button>
                    </div>
                </div>
            </div>
        `;

        const inputField = document.getElementById('goal-input-name');
        inputField.focus(); // Automatically put the cursor in the box

        const closeGoalModal = () => {
            modalContainer.innerHTML = '';
        };

        document.getElementById('btn-goal-cancel').addEventListener('click', closeGoalModal);

        document.getElementById('btn-goal-save').addEventListener('click', () => {
            const goalName = inputField.value;
            if (goalName && goalName.trim() !== "") {
                const goals = JSON.parse(localStorage.getItem('smht_goals') || '[]');
                goals.push({ id: Date.now(), text: goalName.trim(), completed: false });
                localStorage.setItem('smht_goals', JSON.stringify(goals));
                showToast("Goal added!", "success");
                renderGoalsList();
                closeGoalModal();
            } else {
                showToast("Please enter a goal name", "error");
            }
        });
    });
}

function renderGoalsList() {
    const list = document.getElementById('goals-list');
    const goals = JSON.parse(localStorage.getItem('smht_goals') || '[]');

    if (goals.length === 0) {
        list.innerHTML = `
            <div class="glass-panel" style="text-align: center; padding: 40px;">
                <i class="fa-solid fa-bullseye" style="font-size: 48px; color: var(--border-color); margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px;">No goals set</h3>
                <p class="text-muted">Set a long-term goal to give your daily habits purpose.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = goals.map(goal => `
        <div class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; ${goal.completed ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; align-items: center; gap: 16px;">
                <input type="checkbox" class="goal-checkbox" data-id="${goal.id}" ${goal.completed ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                <span style="font-size: 16px; font-weight: 500; ${goal.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${goal.text}</span>
            </div>
            <button class="btn-icon text-danger btn-delete-goal" data-id="${goal.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');

    // Attach event listeners for checkboxes and deletes
    document.querySelectorAll('.goal-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const updatedGoals = goals.map(g => g.id === id ? { ...g, completed: e.target.checked } : g);
            localStorage.setItem('smht_goals', JSON.stringify(updatedGoals));
            if(e.target.checked) showToast("Goal achieved! Incredible work.", "success");
            renderGoalsList();
        });
    });

    document.querySelectorAll('.btn-delete-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const filteredGoals = goals.filter(g => g.id !== id);
            localStorage.setItem('smht_goals', JSON.stringify(filteredGoals));
            showToast("Goal removed.", "info");
            renderGoalsList();
        });
    });
}