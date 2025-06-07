// js/main.js
import { state, setState } from './state.js';
import { DOM } from './ui/domElements.js';
import { getMergedVocabData } from './services/vocabService.js';
import { loadProgress } from './services/progressService.js';
import { loadVoices } from './services/speechService.js';
import { renderApp, showMessage } from './ui/views.js';

let splashTimeoutId = null;

function initializeApp() {
    try {
        const vocabData = getMergedVocabData();
        if (!vocabData || Object.keys(vocabData).length === 0) {
            DOM.appDiv.innerHTML = "<p class='text-red-500 p-4 text-center'><b>Fataler Fehler:</b> Vokabeldaten nicht gefunden.</p>";
            console.error("Vokabeldaten nicht gefunden!");
            return;
        }
        setState({ vocabDataGlobal: vocabData });

        if (DOM.messageOkBtn) {
            DOM.messageOkBtn.addEventListener('click', () => DOM.messageBox.classList.add('hidden'));
        }

        loadVoices();
        // Fallback-Laden der Stimmen
        setTimeout(() => {
            if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
                console.log("Erneuter Versuch, Stimmen zu laden, da die Liste leer ist.");
                loadVoices();
            }
        }, 750);

        loadProgress(); // Lädt Fortschritt und aktualisiert den State
        renderApp(); // Rendert die App basierend auf dem initialen State
    } catch (error) {
        console.error("Kritischer Fehler während initializeApp:", error);
        if (DOM.appDiv) DOM.appDiv.innerHTML = `<p class='text-red-500 p-4'>Ein kritischer Fehler ist aufgetreten: ${error.message}.</p>`;
    }
}

function hideSplashScreenAndInit() {
    if (splashTimeoutId) clearTimeout(splashTimeoutId);
    
    if (DOM.splashScreen && !DOM.splashScreen.classList.contains('hidden')) {
        DOM.splashScreen.removeEventListener('click', hideSplashScreenAndInit);
        DOM.splashScreen.classList.add('hidden');
        if (DOM.appShellContainer) {
            DOM.appShellContainer.style.display = 'flex';
            setTimeout(() => {
                DOM.appShellContainer.classList.add('visible');
            }, 50);
        }
        initializeApp();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (DOM.splashScreen && DOM.appShellContainer) {
        DOM.splashScreen.addEventListener('click', hideSplashScreenAndInit);
        splashTimeoutId = setTimeout(hideSplashScreenAndInit, 2000);
    } else {
        console.warn("Splash-Screen-Elemente nicht gefunden, initialisiere App direkt.");
        initializeApp();
    }
});