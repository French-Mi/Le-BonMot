// js/services/speechService.js
// KORRIGIERTER IMPORT: Importiert jetzt aus dem neuen 'notifications'-Modul.
import { showMessage } from '../ui/notifications.js';

const synth = window.speechSynthesis;
let frenchVoices = [];

/**
 * Lädt die verfügbaren französischen Stimmen für die Sprachsynthese.
 */
export function loadVoices() {
    if (!synth) return;
    try {
        const setVoices = () => {
            let availableVoices = synth.getVoices();
            frenchVoices = availableVoices.filter(v => v.lang.startsWith('fr'));
            console.log("Französische Stimmen geladen:", frenchVoices.length);
             if (frenchVoices.length === 0 && availableVoices.length > 0) {
                 console.warn("Keine spezifischen fr-Stimmen gefunden. Fallback auf Browser-Standard.");
             }
        };

        setVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = setVoices;
        }
    } catch (e) {
        console.error("Fehler beim Laden der Stimmen:", e);
        showMessage("Fehler beim Laden der Sprachausgabe-Stimmen.");
    }
}

/**
 * Spricht einen französischen Text aus.
 * @param {string} textToSpeak Der auszusprechende Text.
 * @param {Event} [event] Das auslösende Event, um die Propagation zu stoppen.
 */
export function speakFrench(textToSpeak, event) {
    if (event) event.stopPropagation();
    
    if (!synth) {
        showMessage("Sprachausgabe wird von diesem Browser nicht unterstützt.");
        return;
    }
    if (synth.speaking) {
        synth.cancel();
    }

    let cleanedText = String(textToSpeak).replace(/\(.*\)/gi, '').replace(/\b(qc|qn)\b\.?/gi, '').trim();
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    if (frenchVoices.length > 0) {
        let voice = frenchVoices.find(v => v.name.toLowerCase().includes('amelie') || v.name.toLowerCase().includes('thomas') || v.name.toLowerCase().includes('natural')) ||
                    frenchVoices.find(v => v.lang === 'fr-FR' && v.default) ||
                    frenchVoices.find(v => v.lang === 'fr-FR') ||
                    frenchVoices[0];
        if (voice) utterance.voice = voice;
    }

    utterance.onerror = (e) => {
        console.error("Fehler bei der Sprachsynthese:", e.error);
        showMessage(`Fehler bei Sprachausgabe: ${e.error}.`);
    };

    try {
        synth.speak(utterance);
    } catch (e) {
        console.error("Fehler beim Aufruf von synth.speak:", e);
        showMessage("Konnte Sprachausgabe nicht starten.");
    }
}
