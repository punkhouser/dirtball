// Naked Truth — client-side JavaScript

function confirmDelete(form) {
    const input = form.querySelector('input[name="confirm"]');
    if (!input || input.value !== 'DELETE') {
        alert('Type "DELETE" to confirm deletion.');
        return false;
    }
    return confirm('Are you sure you want to delete this ticket? This cannot be undone.');
}

// Generic: set up flash message auto-dismiss
document.addEventListener('DOMContentLoaded', function() {
    const flashes = document.querySelectorAll('.flash');
    flashes.forEach(f => {
        setTimeout(() => {
            f.style.transition = 'opacity 0.5s';
            f.style.opacity = '0';
            setTimeout(() => f.remove(), 500);
        }, 5000);
    });
});