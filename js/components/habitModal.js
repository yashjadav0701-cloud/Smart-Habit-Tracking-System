/* js/components/habitModal.js */
import { createHabit } from '../services/habit.service.js';
import { showToast } from './toast.js';

/**
 * Opens the "Create Habit" modal.
 * @param {Function} onSuccessCallback - Function to run after a habit is successfully saved (e.g., to reload the list).
 */
export function openHabitModal(onSuccessCallback) {
    const modalContainer = document.getElementById('modals-container');

    // Enhanced icons array with readable names for the tooltips
    const icons = [
        { class: 'fa-bullseye', name: 'Focus / Goals' }, 
        { class: 'fa-dumbbell', name: 'Exercise' }, 
        { class: 'fa-book', name: 'Reading / Study' }, 
        { class: 'fa-droplet', name: 'Hydration' }, 
        { class: 'fa-person-running', name: 'Cardio' }, 
        { class: 'fa-bed', name: 'Sleep' }, 
        { class: 'fa-apple-whole', name: 'Nutrition' }, 
        { class: 'fa-brain', name: 'Mindfulness' }, 
        { class: 'fa-code', name: 'Coding / Work' }, 
        { class: 'fa-wallet', name: 'Finance' }, 
        { class: 'fa-heart', name: 'Health / Self-Care' }, 
        { class: 'fa-music', name: 'Creative' }
    ];

    // 1. Inject the modal HTML into the DOM
    modalContainer.innerHTML = `
        <div id="habit-modal" class="modal-overlay" style="pointer-events: auto;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Habit</h2>
                    <button id="btn-close-modal" class="btn-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <form id="habit-form">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Habit Name</label>
                        <input type="text" id="habit-name" autocomplete="off" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm);" placeholder="e.g., Drink 2L Water, Read 10 pages..." required>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Choose Icon</label>
                        <div class="icon-selector" id="icon-selector">
                            ${icons.map((iconObj, index) => `
                                <div class="icon-option ${index === 0 ? 'selected' : ''}" data-icon="${iconObj.class}" title="${iconObj.name}">
                                    <i class="fa-solid ${iconObj.class}"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="margin-bottom: 32px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 14px;">Priority</label>
                        <select id="habit-priority" style="width: 100%; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-color); color: white; border-radius: var(--radius-sm); cursor: pointer;">
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    <div class="modal-footer">
                        <button type="button" id="btn-cancel-modal" class="btn" style="background: transparent; border: 1px solid var(--border-color); color: white;">Cancel</button>
                        <button type="submit" id="btn-save-modal" class="btn btn-primary">Save Habit</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modal = document.getElementById('habit-modal');
    
    // Trigger CSS animation slightly after injection to create a smooth pop-in effect
    setTimeout(() => modal.classList.add('active'), 10);

    // 2. Icon Selection Logic
    let selectedIcon = icons[0].class;
    document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', (e) => {
            // Remove 'selected' highlight from all icons
            document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
            // Add 'selected' highlight to the clicked icon
            const target = e.currentTarget;
            target.classList.add('selected');
            selectedIcon = target.dataset.icon; // Store the chosen icon name
        });
    });

    // 3. Close Modal Logic
    const closeModal = () => {
        modal.classList.remove('active');
        // Wait for the fade-out animation to finish before removing HTML
        setTimeout(() => { modalContainer.innerHTML = ''; }, 300); 
    };

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

    // 4. Form Submit Logic (Saving to Supabase)
    document.getElementById('habit-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent standard browser page reload
        
        const btnSave = document.getElementById('btn-save-modal');
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btnSave.disabled = true;

        const name = document.getElementById('habit-name').value;
        const priority = document.getElementById('habit-priority').value;

        try {
            // Send data to Supabase using our service
            await createHabit({
                name: name,
                icon: selectedIcon,
                priority: priority,
                type: 'boolean',     // Keeping it simple as a true/false habit for MVP
                frequency: 'daily'   // Defaulting to daily for MVP
            });
            
            closeModal();
            
            // Refresh the habits list in the background so the new habit appears instantly
            if (onSuccessCallback) onSuccessCallback();
            
        } catch (error) {
            showToast("Failed to create habit: " + error.message, "error");
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
}