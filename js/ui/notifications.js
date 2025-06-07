// js/ui/notifications.js
import { DOM } from './domElements.js';
import { achievements } from '../data/achievements.js';

/**
 * Zeigt eine allgemeine Nachricht oder eine Auszeichnung im Pop-up an.
 * @param {string} text Der anzuzeigende Text.
 * @param {string} [iconClass=''] Die FontAwesome-Icon-Klasse für das Icon.
 */
export function showMessage(text, iconClass = '') {
    const iconContainer = document.getElementById('achievement-toast-icon');
    if (DOM.messageText && DOM.messageBox && iconContainer) {
        DOM.messageText.textContent = text;
        if (iconClass) {
            iconContainer.innerHTML = `<i class="${iconClass} text-2xl text-amber-500"></i>`;
            iconContainer.classList.remove('hidden');
        } else {
            iconContainer.classList.add('hidden');
            iconContainer.innerHTML = '';
        }
        DOM.messageBox.classList.remove('hidden');
    } else {
        alert(text);
        console.error("Message box elements not found for: ", text);
    }
}

/**
 * Zeigt eine spezielle Benachrichtigung für eine neue Auszeichnung an.
 * @param {object} achievement Das Auszeichnungsobjekt aus achievements.js
 */
export function showAchievementToast(achievement) {
    if (!achievement) return;
    const message = `Neue Auszeichnung! ${achievement.title}`;
    showMessage(message, achievement.icon);
}
