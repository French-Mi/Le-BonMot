// js/ui/views/chapterScreens.js
import { state, setState } from '../../state.js';
import { DOM } from '../domElements.js';
import { showMessage } from '../notifications.js';
import { renderApp } from '../renderer.js';
import { startQuiz } from '../../quiz/quizManager.js';
import { isChapterCompleted, isChapterStarted } from '../../services/progressService.js';

export function renderLevelChapterSelectionScreen() {
    const { selectedLevel, vocabDataGlobal } = state;
    if (!selectedLevel || !vocabDataGlobal[selectedLevel]) {
        showMessage("Fehler: Kein gültiges Level ausgewählt.");
        setState({ currentView: 'home' });
        renderApp();
        return;
    }
    const chapters = Object.keys(vocabDataGlobal[selectedLevel]);
    DOM.appDiv.innerHTML = `
        <div>
            <h2 class="text-2xl font-bold text-slate-800 mb-4">Level: ${selectedLevel}</h2>
            <p class="text-slate-600 mb-6">Wähle ein Kapitel aus.</p>
            <div class="space-y-3">
                ${chapters.map(chapter => {
                    const isMainChapter = !Array.isArray(vocabDataGlobal[selectedLevel][chapter]);
                    const subChapters = isMainChapter ? Object.keys(vocabDataGlobal[selectedLevel][chapter]) : [];
                    const completedCount = isMainChapter ? subChapters.filter(sc => isChapterCompleted(selectedLevel, sc, chapter)).length : 0;
                    const startedCount = isMainChapter ? subChapters.filter(sc => isChapterStarted(selectedLevel, sc, chapter)).length : 0;
                    const totalSubChapters = isMainChapter ? subChapters.length : 0;
                    let buttonClass = 'bg-white hover:bg-gray-100';
                    let progressText = '';
                    let checkMark = '';
                    if (isMainChapter) {
                        if (totalSubChapters > 0) {
                            progressText = ` (${completedCount}/${totalSubChapters})`;
                            if (completedCount === totalSubChapters) {
                                buttonClass = 'btn-chapter-completed';
                                checkMark = ' ✓';
                            } else if (completedCount > 0 || startedCount > 0) {
                                buttonClass = 'btn-chapter-started';
                            }
                        }
                    } else {
                        if (isChapterCompleted(selectedLevel, chapter)) {
                            buttonClass = 'btn-chapter-completed';
                            checkMark = ' ✓';
                        } else if (isChapterStarted(selectedLevel, chapter)) {
                            buttonClass = 'btn-chapter-started';
                        }
                    }
                    return `<button class="w-full text-left p-4 rounded-lg shadow-sm transition-colors duration-200 ${buttonClass}" data-chapter="${chapter}">${chapter} <span class="text-xs text-gray-500">${progressText}</span>${checkMark}</button>`;
                }).join('')}
            </div>
            <button id="backToHomeBtn" class="btn btn-neutral mt-6">Zurück zur Niveauauswahl</button>
        </div>`;
    DOM.appDiv.querySelectorAll('[data-chapter]').forEach(button => {
        button.onclick = () => {
            const chapterName = button.dataset.chapter;
            const chapterData = vocabDataGlobal[selectedLevel][chapterName];
            if (Array.isArray(chapterData)) {
                setState({ selectedChapter: chapterName, selectedMainChapter: null, currentView: 'chapterMenu' });
            } else {
                setState({ selectedMainChapter: chapterName, currentView: 'subChapterSelection' });
            }
            renderApp();
        };
    });
    document.getElementById('backToHomeBtn').onclick = () => {
        setState({ currentView: 'home', selectedLevel: null });
        renderApp();
    };
}

export function renderSubChapterSelectionScreen() {
    const { selectedLevel, selectedMainChapter, vocabDataGlobal } = state;
    if (!selectedLevel || !selectedMainChapter || !vocabDataGlobal[selectedLevel][selectedMainChapter]) {
        showMessage("Fehler: Kein gültiges Hauptkapitel ausgewählt.");
        setState({ currentView: 'levelChapterSelection' });
        renderApp();
        return;
    }
    const subChapters = Object.keys(vocabDataGlobal[selectedLevel][selectedMainChapter]);
    DOM.appDiv.innerHTML = `
        <div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Hauptkapitel: ${selectedMainChapter}</h2>
            <p class="text-slate-600 mb-6">Wähle ein Unterkapitel aus.</p>
            <div class="space-y-3">
                ${subChapters.map(subChapter => {
                    const completed = isChapterCompleted(selectedLevel, subChapter, selectedMainChapter);
                    const started = isChapterStarted(selectedLevel, subChapter, selectedMainChapter);
                    let buttonClass = 'bg-white hover:bg-gray-100';
                    let checkMark = '';
                    if (completed) {
                        buttonClass = 'btn-chapter-completed';
                        checkMark = ' ✓';
                    } else if (started) {
                        buttonClass = 'btn-chapter-started';
                    }
                    return `<button class="w-full text-left p-4 rounded-lg shadow-sm transition-colors duration-200 ${buttonClass}" data-subchapter="${subChapter}">${subChapter}${checkMark}</button>`;
                }).join('')}
            </div>
            <button id="backToLevelsBtn" class="btn btn-neutral mt-6">Zurück zur Kapitelauswahl</button>
        </div>`;
    DOM.appDiv.querySelectorAll('[data-subchapter]').forEach(button => {
        button.onclick = () => {
            setState({ selectedChapter: button.dataset.subchapter, currentView: 'chapterMenu' });
            renderApp();
        };
    });
    document.getElementById('backToLevelsBtn').onclick = () => {
        setState({ currentView: 'levelChapterSelection', selectedMainChapter: null });
        renderApp();
    };
}

export function renderChapterMenuScreen() {
    const { selectedLevel, selectedChapter, selectedMainChapter } = state;
    if (!selectedLevel || !selectedChapter) {
        showMessage("Fehler: Kein Kapitel ausgewählt.");
        setState({ currentView: 'levelChapterSelection' });
        renderApp();
        return;
    }
    const chapterTitle = selectedMainChapter ? `${selectedMainChapter}: ${selectedChapter}` : selectedChapter;
    DOM.appDiv.innerHTML = ` 
        <div class="text-center"> 
            <h2 class="text-2xl font-bold text-slate-800 mb-4">${chapterTitle}</h2> 
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6"> 
                <button id="showVocabListBtn" class="btn btn-cm-vocablist btn-chapter-menu-item">Vokabelliste anzeigen</button> 
                <button id="startLearningBtn" class="btn btn-cm-learn btn-chapter-menu-item">Lernen starten</button> 
            </div> 
            <button id="backToChapterSelectionBtn" class="btn btn-cm-back btn-chapter-menu-item btn-full-width">Zurück zur Kapitelauswahl</button> 
        </div>`;
    document.getElementById('showVocabListBtn').onclick = () => { setState({ currentView: 'vocabList' }); renderApp(); };
    document.getElementById('startLearningBtn').onclick = () => { setState({ currentView: 'learnOptions' }); renderApp(); };
    document.getElementById('backToChapterSelectionBtn').onclick = () => {
        const nextView = state.selectedMainChapter ? 'subChapterSelection' : 'levelChapterSelection';
        const newState = { currentView: nextView };
        if (!state.selectedMainChapter) {
            newState.selectedChapter = null;
        }
        setState(newState);
        renderApp();
    };
}

export function renderLearnOptionsScreen() {
    const { selectedLevel, selectedMainChapter, selectedChapter, vocabDataGlobal } = state;
    const vocab = selectedMainChapter ? vocabDataGlobal[selectedLevel][selectedMainChapter][selectedChapter] : vocabDataGlobal[selectedLevel][selectedChapter];
    const totalVocabCount = Array.isArray(vocab) ? vocab.length : 0;
    if (totalVocabCount === 0) {
        showMessage("Keine Vokabeln in diesem Kapitel zum Lernen verfügbar.");
        setState({ currentView: 'chapterMenu' });
        renderApp();
        return;
    }

    DOM.appDiv.innerHTML = ` 
        <div class="text-center"> 
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Lernmodus auswählen</h2> 
            <div class="bg-white p-4 rounded-lg shadow-md mb-6"> 
                <label for="vocabCount" class="block text-sm font-medium text-gray-700 mb-2">Wie viele Vokabeln möchtest du lernen?</label> 
                <select id="vocabCount" class="w-full p-2 border border-gray-300 rounded-md"> 
                    <option value="10" ${totalVocabCount < 10 && totalVocabCount > 0 ? 'disabled' : ''}>${Math.min(10, totalVocabCount)} Vokabeln</option> 
                    <option value="20" ${totalVocabCount < 20 && totalVocabCount > 0 ? 'disabled' : ''}>${Math.min(20, totalVocabCount)} Vokabeln</option> 
                    <option value="0" selected>Alle (${totalVocabCount})</option> 
                </select> 
            </div> 
            <div class="bg-white p-4 rounded-lg shadow-md mb-6"> 
                <p class="block text-sm font-medium text-gray-700 mb-2">In welche Richtung?</p> 
                <div class="flex justify-center space-x-2"> 
                    <button id="directionFrDe" class="btn-direction-base btn-direction-active">FR → DE</button> 
                    <button id="directionDeFr" class="btn-direction-base btn-direction-inactive">DE → FR</button> 
                </div> 
            </div> 
            <div class="grid grid-cols-1 gap-4"> 
                <button data-quiz-type="flashcards" class="btn btn-learn-method btn-learn-method-flashcards">Karteikarten</button> 
                <button data-quiz-type="multipleChoice" class="btn btn-learn-method btn-learn-method-mc">Multiple Choice</button> 
                <button data-quiz-type="manualInput" class="btn btn-learn-method btn-learn-method-manual">Manuelle Eingabe</button> 
            </div> 
            <button id="backToMenuFromOptionsBtn" class="btn btn-neutral mt-8 w-full">Zurück zum Kapitelmenü</button> 
        </div>`;

    const directionFrDe = document.getElementById('directionFrDe');
    const directionDeFr = document.getElementById('directionDeFr');
    directionFrDe.onclick = () => {
        setState({ currentQuizDirection: 'frToDe' });
        directionFrDe.classList.replace('btn-direction-inactive', 'btn-direction-active');
        directionDeFr.classList.replace('btn-direction-active', 'btn-direction-inactive');
    };
    directionDeFr.onclick = () => {
        setState({ currentQuizDirection: 'deToFr' });
        directionDeFr.classList.replace('btn-direction-inactive', 'btn-direction-active');
        directionFrDe.classList.replace('btn-direction-active', 'btn-direction-inactive');
    };
    DOM.appDiv.querySelectorAll('[data-quiz-type]').forEach(button => {
        button.onclick = () => {
            const quizType = button.dataset.quizType;
            setState({ desiredVocabCount: parseInt(document.getElementById('vocabCount').value, 10) });
            startQuiz(quizType);
        };
    });
    document.getElementById('backToMenuFromOptionsBtn').onclick = () => { setState({ currentView: 'chapterMenu' }); renderApp(); };
}