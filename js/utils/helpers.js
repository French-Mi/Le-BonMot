// js/utils/helpers.js

/**
 * Mischt die Elemente eines Arrays zufällig.
 * @param {Array} array Das zu mischende Array.
 * @returns {Array} Ein neues, gemischtes Array.
 */
export function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * KORRIGIERTE VERSION
 * Normalisiert eine Antwort für allgemeine Vergleiche.
 * Entfernt jetzt beide Arten von Apostrophen (' und ’).
 * @param {string} answer Die zu normalisierende Antwort.
 * @returns {string} Die normalisierte Antwort.
 */
export function normalizeAnswerGeneral(answer) {
    if (typeof answer !== 'string') return '';
    // Die Regex wurde um beide Apostroph-Typen ' und ’ erweitert.
    return answer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’]/g, "").replace(/\s+/g, ' ').trim();
}

/**
 * Normalisiert eine deutsche Antwort für Vergleiche, ignoriert dabei Artikel.
 * @param {string} answer Die zu normalisierende deutsche Antwort.
 * @returns {string} Die normalisierte Antwort.
 */
export function normalizeGermanAnswerForComparison(answer) {
    if (typeof answer !== 'string') return '';
    let normalized = answer.toLowerCase().trim();
    const articles = /\b(der|die|das|ein|eine|einen|einem|einer)\b\s*/gi;
    normalized = normalized.replace(articles, '').trim();
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"'’]/g, "");
    return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Ermittelt die Kalenderwoche für ein gegebenes Datum.
 * @param {Date} d Das Datum.
 * @returns {string} Die Kalenderwoche im Format 'YYYY-WXX'.
 */
export function getWeekNumber(d) {
    try {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return d.getUTCFullYear() + '-W' + weekNo;
    } catch (e) {
        console.error("Error in getWeekNumber:", e);
        return new Date().getFullYear() + '-W01';
    }
}