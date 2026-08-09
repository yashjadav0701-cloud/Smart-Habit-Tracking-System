/* js/pages/profile.js */
import { getSession, signOut } from '../auth/auth.js';

/**
 * Renders the Profile & Account view.
 */
export async function renderProfilePage(container) {
    // 1. Get current user details from active session
    const session = await getSession();
    const user = session?.user;

    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.full_name || 'Habit Tracker User';
    const userAvatar = user?.user_metadata?.avatar_url || '';

    // 2. Inject structural HTML
    container.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h1>Profile & Account</h1>
                <p class="text-muted">Manage your identity and app preferences.</p>
            </div>
        </div>

        <div class="glass-panel" style="max-width: 500px; margin-top: 24px; padding: 32px;">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                ${userAvatar 
                    ? `<img src="${userAvatar}" alt="${userName}" style="width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--primary);">`
                    : `<div style="width: 72px; height: 72px; border-radius: 50%; background: var(--primary-glow); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--primary); font-weight: 700;">${userName.charAt(0)}</div>`
                }
                <div>
                    <h2 style="font-size: 20px; margin-bottom: 4px;">${userName}</h2>
                    <p class="text-muted" style="font-size: 14px;">${userEmail}</p>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid var(--border-color); margin: 24px 0;">

            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label class="text-muted" style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Authentication Method</label>
                    <p style="margin-top: 4px; font-weight: 500;"><i class="fa-brands fa-google" style="color: #4285F4; margin-right: 8px;"></i> Google OAuth</p>
                </div>

                <div style="margin-top: 12px;">
                    <button id="btn-logout" class="btn" style="width: 100%; background: var(--danger); border-color: var(--danger); color: white; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;

    // 3. Attach logout event listener
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await signOut();
        });
    }
}