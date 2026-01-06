// src/utils/notifications.js
export const NOTIF_GREEN = "green";
export const NOTIF_RED = "red";
export const NOTIF_ORANGE = "orange";

let notifTime;

export function showNotif(notification, message, color, duration = 3000) {
    
    if (!notification) return;

    clearTimeout(notifTime);

    notification.textContent = message;

    notification.classList.remove('notif-hides');
    void notification.offsetWidth;

    notification.classList.remove('notif-good', 'notif-bad', 'notif-orange');

    if (color == NOTIF_RED) {
        notification.classList.add('notif-bad');
    } else if (color == NOTIF_GREEN) {
        notification.classList.add('notif-good');
    } else if (color == NOTIF_ORANGE) {
        notification.classList.add('notif-orange');
    }

    notification.classList.add('notif-shows');

    notifTime = setTimeout(() => {
        notification.classList.remove('notif-shows');
        notification.classList.add('notif-hides');
    }, duration);
}