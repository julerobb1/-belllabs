// Automatically apply theme based on system preferences
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');

// Apply the saved theme or system preference on page load
if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    enableDarkMode();
} else {
    disableDarkMode();
}

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        e.matches ? enableDarkMode() : disableDarkMode();
    }
});

// Dark mode toggle button functionality
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('dark-mode-toggle');
    toggleButton.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark-mode')) {
            disableDarkMode();
            localStorage.setItem('theme', 'light');
        } else {
            enableDarkMode();
            localStorage.setItem('theme', 'dark');
        }
    });
});

// Enable dark mode
function enableDarkMode() {
    document.documentElement.classList.add('dark-mode');
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) toggleButton.textContent = 'Light Mode'; // Update button text
}

// Disable dark mode
function disableDarkMode() {
    document.documentElement.classList.remove('dark-mode');
    const toggleButton = document.getElementById('dark-mode-toggle');
    if (toggleButton) toggleButton.textContent = 'Dark Mode'; // Update button text
}
