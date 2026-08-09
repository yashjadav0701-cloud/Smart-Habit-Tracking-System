/* js/app.js */
import { signInWithGoogle, getSession, onAuthStateChange, signOut } from './auth/auth.js';
import { renderHabitsPage } from './pages/habits.js'; 
import { renderDashboardPage } from './pages/dashboard.js'; 
import { renderCalendarPage } from './pages/calendar.js'; 
import { renderInsightsPage } from './pages/insights.js'; 
import { renderProfilePage } from './pages/profile.js'; 
import { renderGoalsPage } from './pages/goals.js'; 

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
    if (session) {
        authScreen.classList.add('hidden');
    } else {
        authScreen.classList.remove('hidden');
    }

    onAuthStateChange((event, newSession) => {
        if (newSession) {
            authScreen.classList.add('hidden');
        } else {
            authScreen.classList.remove('hidden');
        }
    });

    function navigateTo(route) {
        navLinks.forEach(link => {
            if (link.dataset.route === route) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Trigger animation
        viewContainer.classList.add('fade-out');

        setTimeout(() => {
            switch(route) {
                case 'dashboard':
                    renderDashboardPage(viewContainer);
                    break;
                case 'habits':
                    renderHabitsPage(viewContainer);
                    break;
                case 'calendar':
                    renderCalendarPage(viewContainer);
                    break;
                case 'goals':
                    renderGoalsPage(viewContainer);
                    break;
                case 'insights':
                    renderInsightsPage(viewContainer);
                    break;
                case 'profile':
                    renderProfilePage(viewContainer);
                    break;
                default:
                    viewContainer.innerHTML = `<h1>404</h1><p>View not found.</p>`;
            }
            
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