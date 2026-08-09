/* js/components/toast.js */

/**
 * Displays a temporary toast notification on the screen.
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'error', or 'info'
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger slide-in animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for slide-out animation to finish before removing from DOM
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

/**
 * Custom Confirmation Dialog to replace browser confirm()
 */
export function showConfirmDialog(title, message, onConfirm) {
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

    document.getElementById('btn-dialog-cancel').addEventListener('click', () => {
        modalContainer.innerHTML = '';
    });

    document.getElementById('btn-dialog-confirm').addEventListener('click', () => {
        modalContainer.innerHTML = '';
        if (onConfirm) onConfirm();
    });
}