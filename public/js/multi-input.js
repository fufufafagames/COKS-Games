/**
 * Multi-Input Handler
 * Handles dynamic addition/removal of tags and categories
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all multi-input containers
    const containers = document.querySelectorAll('.multi-input-container');

    containers.forEach(container => {
        const input = container.querySelector('input[type="text"]'); // The typing input
        const hiddenInput = container.querySelector('input[type="hidden"]'); // The actual form data
        const addBtn = container.querySelector('.add-btn');
        const itemsContainer = container.querySelector('.selected-items');
        
        // Load initial values
        let items = [];
        if (hiddenInput.value) {
            // Split by comma and trim
            items = hiddenInput.value.split(',').map(item => item.trim()).filter(item => item);
            renderItems();
        }

        function addItem(value) {
            const trimmedValue = value.trim();
            if (trimmedValue && !items.includes(trimmedValue)) {
                items.push(trimmedValue);
                renderItems();
                updateHiddenInput();
                input.value = '';
            }
        }

        function removeItem(value) {
            items = items.filter(item => item !== value);
            renderItems();
            updateHiddenInput();
        }

        function updateHiddenInput() {
            hiddenInput.value = items.join(',');
        }

        function renderItems() {
            itemsContainer.innerHTML = '';
            items.forEach(item => {
                const badge = document.createElement('div');
                badge.className = 'badge bg-aqua text-white me-2 mb-2 p-2 d-flex align-items-center';
                badge.style.fontSize = '0.9rem';
                
                const span = document.createElement('span');
                span.textContent = item;
                
                const removeBtn = document.createElement('i');
                removeBtn.className = 'fas fa-times ms-2 cursor-pointer';
                removeBtn.style.cursor = 'pointer';
                removeBtn.onclick = () => removeItem(item);
                
                badge.appendChild(span);
                badge.appendChild(removeBtn);
                itemsContainer.appendChild(badge);
            });
        }

        // Event Listeners
        addBtn.addEventListener('click', () => {
            addItem(input.value);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                addItem(input.value);
            }
        });
        
        // Optional: Datalist support
        if (input.list) {
            input.addEventListener('change', () => {
               // If the value is in the datalist, add it immediately? 
               // Or wait for user to press add/enter. 
               // Let's wait for explicit action to avoid accidental adds while typing.
            });
        }
    });
});
