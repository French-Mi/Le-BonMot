// js/services/levelingService.js

// Definiert, wie viele XP für das nächste Level benötigt werden.
// Level 1 -> Level 2: 100 XP
// Level 2 -> Level 3: 200 XP usw.
export const XP_PER_LEVEL = 100;

/**
 * Berechnet das aktuelle Level und den Fortschritt basierend auf den Gesamt-XP.
 * @param {number} totalXp Die gesamten Erfahrungspunkte des Benutzers.
 * @returns {{level: number, currentLevelXp: number, xpForNextLevel: number, progressPercentage: number}}
 */
export function calculateLevelInfo(totalXp) {
    if (typeof totalXp !== 'number' || totalXp < 0) {
        return { level: 1, currentLevelXp: 0, xpForNextLevel: XP_PER_LEVEL, progressPercentage: 0 };
    }

    let level = 1;
    let xpForNext = XP_PER_LEVEL;
    let xpForCurrentLevel = 0;
    
    // Berechne das aktuelle Level
    while (totalXp >= xpForCurrentLevel + xpForNext) {
        xpForCurrentLevel += xpForNext;
        level++;
        // Optional: Skalierung für höhere Level
        // xpForNext = Math.floor(xpForNext * 1.2); 
    }

    const currentLevelXp = totalXp - xpForCurrentLevel;
    const progressPercentage = Math.floor((currentLevelXp / xpForNext) * 100);

    return {
        level: level,
        currentLevelXp: currentLevelXp,
        xpForNextLevel: xpForNext,
        progressPercentage: progressPercentage
    };
}

/**
 * Fügt XP hinzu und gibt die aktualisierten Gesamt-XP zurück.
 * @param {number} currentTotalXp Die aktuellen Gesamt-XP.
 * @param {number} xpToAdd Die hinzuzufügenden XP (1 pro Vokabel).
 * @returns {number} Die neuen Gesamt-XP.
 */
export function addXp(currentTotalXp, xpToAdd) {
    return (currentTotalXp || 0) + xpToAdd;
}
