// js/ui/renderer.js
import { state, setState } from '../state.js';
import { DOM } from './domElements.js';
import { renderStreak } from './views/commonComponents.js';

// Importiere alle Ansichts-Funktionen aus den neuen Unterdateien
import { renderHomeScreen } from './views/homeScreen.js';
import { renderLevelChapterSelectionScreen, renderSubChapterSelectionScreen, renderChapterMenuScreen, renderLearnOptionsScreen } from './views/chapterScreens.js';
import { renderVocabListScreen } from './views/vocabListScreen.js';
import { renderFlashcardsScreen, renderMultipleChoiceScreen, renderManualInputScreen, renderQuizEndScreen } from './views/quizScreens.js';

export function renderApp() {
    if (!DOM.appDiv) {
        console.error("Fatal Error: appDiv not found!");
        document.body.innerHTML = "App-Container nicht gefunden. Laden abgebrochen.";
        return;
    }
    try {
        DOM.appDiv.innerHTML = '';
        DOM.appDiv.className = 'main-app-content view-animation';

        const viewsWithStreak = ['home', 'levelChapterSelection', 'subChapterSelection', 'chapterMenu', 'learnOptions'];
        if (DOM.streakTrackerDiv) {
            if (viewsWithStreak.includes(state.currentView)) {
                renderStreak(DOM.streakTrackerDiv);
                DOM.streakTrackerDiv.style.display = 'block';
            } else {
                DOM.streakTrackerDiv.style.display = 'none';
            }
        }

        switch (state.currentView) {
            case 'home': renderHomeScreen(); break;
            case 'levelChapterSelection': renderLevelChapterSelectionScreen(); break;
            case 'subChapterSelection': renderSubChapterSelectionScreen(); break;
            case 'chapterMenu': renderChapterMenuScreen(); break;
            case 'vocabList': renderVocabListScreen(); break;
            case 'learnOptions': renderLearnOptionsScreen(); break;
            case 'flashcards': renderFlashcardsScreen(); break;
            case 'multipleChoice': renderMultipleChoiceScreen(); break;
            case 'manualInput': renderManualInputScreen(); break;
            case 'quizEnd': renderQuizEndScreen(); break;
            default:
                console.warn(`Unbekannte Ansicht: ${state.currentView}. Zeige Startbildschirm.`);
                setState({ currentView: 'home' });
                renderHomeScreen();
        }
    } catch (error) {
        console.error(`Kritischer Fehler in renderApp für Ansicht "${state.currentView}":`, error);
        DOM.appDiv.innerHTML = `<p class='text-red-500 p-4 text-center'>Ein schwerwiegender Fehler ist aufgetreten: ${error.message}<br>Bitte prüfen Sie die Browser-Konsole.</p>`;
    }
}