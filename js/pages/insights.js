/* js/pages/insights.js */
import { getInsightStats, getWeeklyTrend } from '../services/insights.service.js';

export async function renderInsightsPage(container) {
    // 1. Inject structural HTML with placeholders for data
    container.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h1>Insights</h1>
                <p class="text-muted">Analyze your discipline and consistency.</p>
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-label">Total Active Habits</div>
                <div class="stat-value" id="stat-total-habits">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Lifetime Completions</div>
                <div class="stat-value" id="stat-total-completions">-</div>
            </div>
        </div>

        <div class="insights-grid">
            <div class="chart-container">
                <h3>Last 7 Days Progress</h3>
                <div class="chart-wrapper">
                    <canvas id="weekly-trend-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    // 2. Fetch the data from our service
    try {
        const stats = await getInsightStats();
        const trendData = await getWeeklyTrend();

        // 3. Update the Top Stats Cards
        document.getElementById('stat-total-habits').textContent = stats.totalHabits;
        document.getElementById('stat-total-completions').textContent = stats.totalCompletions;

        // 4. Prepare data for Chart.js
        const dates = Object.keys(trendData); // e.g., ['2026-08-04', '2026-08-05', ...]
        const completionCounts = Object.values(trendData); // e.g., [1, 3, 0, 2, ...]

        // Convert raw YYYY-MM-DD dates to short weekday names (e.g., 'Mon', 'Tue')
        const chartLabels = dates.map(dateStr => {
            const dateObj = new Date(dateStr);
            return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        });

        // 5. Render the Chart
        const ctx = document.getElementById('weekly-trend-chart').getContext('2d');
        
        // Use the primary CSS variable color for the chart line
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#6366f1';

        new Chart(ctx, {
            type: 'line', // Sleek line graph
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Habits Completed',
                    data: completionCounts,
                    borderColor: primaryColor,
                    backgroundColor: primaryColor + '33', // Add transparency for the fill
                    borderWidth: 3,
                    pointBackgroundColor: '#0f172a',
                    pointBorderColor: primaryColor,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true, // Fills the area under the line
                    tension: 0.4 // Gives the line a smooth, curved aesthetic
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // Hide legend for a cleaner look
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: '#334155', drawBorder: false }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false, drawBorder: false }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error loading insights:", error);
        container.innerHTML += `<p class="text-danger" style="margin-top: 20px;">Failed to load analytics: ${error.message}</p>`;
    }
}