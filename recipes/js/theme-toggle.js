// Default to light mode
let isDarkMode = false;

// Toggle between light and dark modes
function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Attach toggle functionality to the button
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('dark-mode-toggle');
    toggleButton.addEventListener('click', toggleTheme);
});
