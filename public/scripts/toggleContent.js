function toggleContent(id) {
    const content = document.getElementById(id);
    const button = content.nextElementSibling;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        button.textContent = 'Leer más';
    } else {
        content.classList.add('expanded');
        button.textContent = 'Leer menos';
    }
}

// Function to initialize the visibility of the "Leer más" button
function initializeContent(id) {
    const content = document.getElementById(id);
    const button = content.nextElementSibling;
    
    // Check if content exceeds 5 lines
    const originalHeight = content.clientHeight;
    content.classList.add('expanded'); // Temporarily expand to get full height
    const fullHeight = content.scrollHeight;
    content.classList.remove('expanded'); // Collapse back

    // Hide the "Leer más" button if the content is not exceeding the original height
    if (fullHeight <= originalHeight) {
        button.style.display = 'none';
    }
}

// Initialize content on page load
document.addEventListener("DOMContentLoaded", function() {
    const descriptions = document.querySelectorAll('.description');
    const specifications = document.querySelectorAll('.especificaciones');
    descriptions.forEach(description => {
        initializeContent(description.id);
    });
    specifications.forEach(specification => {
        initializeContent(specification.id);
    });
});
