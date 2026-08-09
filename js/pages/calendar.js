/* js/pages/calendar.js */
import { getMonthlyCompletions } from '../services/history.service.js';

// State to keep track of which month the user is viewing
let currentDate = new Date();

/**
 * Renders the Calendar page into the provided container.
 */
export async function renderCalendarPage(container) {
    // 1. Inject the structural HTML
    container.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h1>Calendar</h1>
                <p class="text-muted">Review your historical progress.</p>
            </div>
        </div>
        
        <div class="calendar-controls">
            <button id="btn-prev-month" class="btn-icon"><i class="fa-solid fa-chevron-left"></i></button>
            <h2 id="calendar-month-year">Loading...</h2>
            <button id="btn-next-month" class="btn-icon"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        
        <div class="calendar-grid" id="calendar-grid">
            <!-- Grid will be injected here dynamically -->
        </div>
    `;

    // 2. Attach event listeners for the Prev/Next month buttons
    document.getElementById('btn-prev-month').addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await updateCalendar();
    });

    document.getElementById('btn-next-month').addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await updateCalendar();
    });

    // 3. Render the initial calendar for the current month
    await updateCalendar();
}

/**
 * Re-calculates and renders the days of the month and their completion dots.
 */
async function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
    
    // Update the Month/Year Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    
    // Reset grid HTML (keep the day names)
    let gridHtml = `
        <div class="calendar-day-name">Sun</div>
        <div class="calendar-day-name">Mon</div>
        <div class="calendar-day-name">Tue</div>
        <div class="calendar-day-name">Wed</div>
        <div class="calendar-day-name">Thu</div>
        <div class="calendar-day-name">Fri</div>
        <div class="calendar-day-name">Sat</div>
    `;

    // Calculate dates for the query
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Fetch completions from Supabase
    let completions = [];
    try {
        completions = await getMonthlyCompletions(startDateStr, endDateStr);
    } catch (error) {
        console.error("Failed to load completions for calendar:", error);
    }

    // Group completions by date so we know how many dots to show per day
    const completionCounts = {};
    completions.forEach(record => {
        const date = record.completion_date;
        completionCounts[date] = (completionCounts[date] || 0) + 1;
    });

    const startingDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, etc.
    const totalDaysInMonth = lastDay.getDate();
    const today = new Date();

    // 1. Pad the beginning of the grid with empty blocks if the month doesn't start on Sunday
    for (let i = 0; i < startingDayOfWeek; i++) {
        gridHtml += `<div class="calendar-day empty-day"></div>`;
    }

    // 2. Generate the actual days of the month
    for (let i = 1; i <= totalDaysInMonth; i++) {
        const isToday = (i === today.getDate() && month === today.getMonth() && year === today.getFullYear());
        
        // Format the current loop date to YYYY-MM-DD to match the database dictionary
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Check how many habits were done on this specific day
        const dotCount = completionCounts[dateString] || 0;
        let dotsHtml = '';
        for (let d = 0; d < dotCount; d++) {
            dotsHtml += `<div class="dot"></div>`;
        }

        gridHtml += `
            <div class="calendar-day ${isToday ? 'is-today' : ''}">
                <div class="day-number">${i}</div>
                <div class="day-dots">${dotsHtml}</div>
            </div>
        `;
    }

    grid.innerHTML = gridHtml;
}