document.addEventListener('DOMContentLoaded', () => {
    const notificationBadge = document.getElementById('notification-badge');
    
    // Function to check notifications
    const checkNotifications = async () => {
        try {
            const response = await fetch('/api/notifications/count');
            if (response.ok) {
                const data = await response.json();
                updateBadge(data.count);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Function to update badge UI
    const updateBadge = (count) => {
        if (!notificationBadge) return;
        
        if (count > 0) {
            notificationBadge.textContent = count > 99 ? '99+' : count;
            notificationBadge.style.display = 'block';
        } else {
            notificationBadge.style.display = 'none';
        }
    };

    // Initial check
    checkNotifications();

    // Poll every 30 seconds
    setInterval(checkNotifications, 30000);

    // Mark as read when notification icon is clicked (simplified for now)
    // Ideally this would open a dropdown first
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async (e) => {
            // Prevent default action if it's a link
            e.preventDefault();
            
            // TODO: Open dropdown/modal showing actual notifications
            alert('Notifications clicked! Marking all as read for demo.');

            try {
                await fetch('/api/notifications/mark-read', { method: 'POST' });
                updateBadge(0);
            } catch (error) {
                console.error('Error marking read:', error);
            }
        });
    }
});
