let reminderInterval = null;

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

function showBrowserNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
    }
}

function startReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        const now = new Date();
        const notified = JSON.parse(localStorage.getItem('notified_events') || '{}');

        calendarEvents.forEach(event => {
            if (!event.reminder_minutes || event.is_recurring_instance) return;
            const reminderTime = new Date(event.start_time);
            reminderTime.setMinutes(reminderTime.getMinutes() - event.reminder_minutes);
            const diff = reminderTime - now;
            if (diff >= 0 && diff < 60000 && !notified[event.id]) {
                showBrowserNotification(
                    `Upcoming: ${event.title}`,
                    `Starts in ${event.reminder_minutes} minutes`
                );
                notified[event.id] = true;
                localStorage.setItem('notified_events', JSON.stringify(notified));
            }
        });
    }, 60000);
}

function stopReminderChecker() {
    if (reminderInterval) {
        clearInterval(reminderInterval);
        reminderInterval = null;
    }
}
