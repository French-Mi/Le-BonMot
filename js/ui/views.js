// js/ui/views.js
import { state, setState } from '../state.js';
import { DOM } from './domElements.js';
import { getWeekNumber, shuffleArray, normalizeAnswerGeneral, normalizeGermanAnswerForComparison } from '../utils/helpers.js';
import { isChapterCompleted, isChapterStarted, markChapterAsCompleted, completeLearningSession, logIncorrectWord, checkAndAwardAchievements } from '../services/progressService.js';
import { speakFrench } from '../services/speechService.js';
import { startQuiz, startGlobalReview } from '../quiz/quizManager.js';
import { calculateLevelInfo } from '../services/levelingService.js';
import { achievements } from '../data/achievements.js';
import { showMessage } from './notifications.js';

// --- Konstanten & Hilfsfunktionen für die UI ---

const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;

// --- Haupt-Render-Logik ---
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
                renderStreak();
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

// --- Einzelne Ansichts-Render-Funktionen ---

function renderStreak() {
    if (!DOM.streakTrackerDiv) return;
    const currentStreak = state.learningProgress.streak.current || 0;
    if (currentStreak > 0) {
        DOM.streakTrackerDiv.innerHTML = `🔥 Aktueller Streak: <strong>${currentStreak} ${currentStreak === 1 ? 'Tag' : 'Tage'}</strong>!`;
        DOM.streakTrackerDiv.className = 'streak-active';
    } else {
        DOM.streakTrackerDiv.innerHTML = `Starte heute eine neue Lernserie!`;
        DOM.streakTrackerDiv.className = 'streak-inactive';
    }
}

function renderProgressTracker() {
    const { totalXp, achievements: unlockedAchievements } = state.learningProgress;
    const { level, currentLevelXp, xpForNextLevel, progressPercentage } = calculateLevelInfo(totalXp);

    const unlockedAchievementDetails = unlockedAchievements
        .map(id => ({ id, ...achievements[id] }))
        .filter(a => a.title);

    return `
        <div id="progress-tracker-container" class="mt-10 pt-6 border-t border-gray-300">
            <h3 class="text-xl font-semibold text-slate-700 mb-4">Dein Fortschritt</h3>
            
            <div class="mb-4">
                <div class="flex justify-between items-end mb-1">
                    <span class="text-lg font-bold text-blue-600">Level ${level}</span>
                    <span class="text-sm text-gray-500">${currentLevelXp} / ${xpForNextLevel} XP</span>
                </div>
                <div class="progress-bar-bg w-full bg-gray-200 rounded-full h-4">
                    <div class="progress-fill bg-blue-500 h-4 rounded-full" style="width: ${progressPercentage}%"></div>
                </div>
            </div>

            <div id="achievements-container">
                <h4 class="text-md font-semibold text-slate-600 mb-3">Auszeichnungen</h4>
                ${unlockedAchievementDetails.length > 0 ? `
                    <div class="flex flex-wrap gap-4 justify-center">
                        ${unlockedAchievementDetails.map(ach => `
                            <div class="flex flex-col items-center text-center w-20" title="${ach.description}">
                                <i class="${ach.icon} ${ach.color || 'text-gray-600'} text-4xl mb-1"></i>
                                <span class="text-xs font-medium text-gray-700">${ach.title}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p class="text-sm text-gray-500 italic">Lerne weiter, um deine ersten Auszeichnungen freizuschalten!</p>
                `}
            </div>
        </div>
    `;
}

function renderHomeScreen() {
    const { vocabDataGlobal } = state;
    const levels = Object.keys(vocabDataGlobal);
    
    DOM.appDiv.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Willkommen bei le BonMot!</h2>
            <p class="text-slate-600 mb-6">Bitte wähle dein Niveau aus, um zu starten.</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${levels.map(level => `<button class="btn text-lg py-4 btn-level" data-level="${level}">${level}</button>`).join('')}
            </div>

            <div id="review-errors-container" class="mt-10 pt-6 border-t border-gray-300">
                <h3 class="text-xl font-semibold text-slate-700 mb-4">Fehler wiederholen</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button id="review24h" class="btn btn-secondary">Fehler der letzten 24h</button>
                    <button id="review7d" class="btn btn-secondary">Fehler der letzten 7 Tage</button>
                </div>
            </div>

            ${renderProgressTracker()}

        </div>`;

    DOM.appDiv.querySelectorAll('[data-level]').forEach(button => {
        button.onclick = () => {
            setState({ selectedLevel: button.dataset.level, currentView: 'levelChapterSelection' });
            renderApp();
        };
    });
    document.getElementById('review24h').onclick = () => startGlobalReview(1);
    document.getElementById('review7d').onclick = () => startGlobalReview(7);
}

function renderLevelChapterSelectionScreen() {
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

                    return `<button class="w-full text-left p-4 rounded-lg shadow-sm transition-colors duration-200 ${buttonClass}" data-chapter="${chapter}">
                        ${chapter} <span class="text-xs text-gray-500">${progressText}</span>${checkMark}
                    </button>`;
                }).join('')}
            </div>
            <button id="backToHomeBtn" class="btn btn-neutral mt-6">Zurück zur Niveauauswahl</button>
        </div>
    `;
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

function renderSubChapterSelectionScreen() {
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
                    return `<button class="w-full text-left p-4 rounded-lg shadow-sm transition-colors duration-200 ${buttonClass}" data-subchapter="${subChapter}">
                        ${subChapter}${checkMark}
                    </button>`;
                }).join('')}
            </div>
            <button id="backToLevelsBtn" class="btn btn-neutral mt-6">Zurück zur Kapitelauswahl</button>
        </div>
    `;
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

function renderChapterMenuScreen() {
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

function renderExampleSentence(vocabItem, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (vocabItem && typeof vocabItem === 'object' && vocabItem.exampleFrench && vocabItem.exampleGerman) {
        container.innerHTML = ` <div class="example-sentence-box"> <p class="mb-1"><strong>FR:</strong> ${vocabItem.exampleFrench} <span class="speaker-icon-clickable-area" data-text="${vocabItem.exampleFrench}"> ${speakerIconSvgContent} </span> </p> <p><strong>DE:</strong> ${vocabItem.exampleGerman}</p> </div>`;
        const speakerIcon = container.querySelector('.speaker-icon-clickable-area');
        if (speakerIcon) {
            speakerIcon.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e);
        }
        container.classList.remove('hidden');
    } else {
        container.innerHTML = `<p class="text-gray-500 italic">Kein vollständiger Beispielsatz verfügbar.</p>`;
        container.classList.remove('hidden');
    }
}

function toggleExample(button, containerId) {
    const exampleContainer = document.getElementById(containerId);
    if (!exampleContainer) return;

    const vocabIndex = button.dataset.vocabIndex ? parseInt(button.dataset.vocabIndex, 10) : undefined;
    let vocabItem;

    if (state.currentView === 'vocabList' && vocabIndex !== undefined) {
        const currentVocabList = state.selectedMainChapter
            ? state.vocabDataGlobal[state.selectedLevel]?.[state.selectedMainChapter]?.[state.selectedChapter]
            : state.vocabDataGlobal[state.selectedLevel]?.[state.selectedChapter];
        if (currentVocabList) vocabItem = currentVocabList[vocabIndex];
    } else if (state.quizWords && state.quizWords.length > 0) {
        vocabItem = state.quizWords[state.currentQuestionIndex];
    }

    if (!vocabItem) {
        exampleContainer.innerHTML = "<p class='text-red-500 italic'>Fehler: Vokabeldaten konnten nicht geladen werden.</p>";
        exampleContainer.classList.remove('hidden');
        return;
    }

    if (exampleContainer.classList.contains('hidden')) {
        renderExampleSentence(vocabItem, containerId);
        button.textContent = 'Verbergen';
    } else {
        exampleContainer.classList.add('hidden');
        exampleContainer.innerHTML = '';
        button.textContent = 'Beispiel';
    }
}

function renderVocabListScreen() {
    const { selectedLevel, selectedMainChapter, selectedChapter, vocabDataGlobal } = state;
    const vocabList = selectedMainChapter ? vocabDataGlobal[selectedLevel][selectedMainChapter][selectedChapter] : vocabDataGlobal[selectedLevel][selectedChapter];
    if (!vocabList) {
        showMessage("Vokabeln nicht gefunden.");
        setState({ currentView: 'chapterMenu' });
        renderApp();
        return;
    }
    DOM.appDiv.innerHTML = ` 
        <div> 
            <h2 class="text-2xl font-bold text-slate-800 mb-4">Vokabeln: ${selectedChapter}</h2> 
            <div class="vocab-list-scroll-container"> 
                <ul class="divide-y divide-gray-200"> 
                    ${vocabList.map((v, index) => ` 
                        <li class="p-3"> 
                            <div class="flex justify-between items-center"> 
                                <div> 
                                    <p class="font-semibold text-gray-800">${v.french} <span class="speaker-icon-clickable-area" data-text="${v.french}"> ${speakerIconSvgContent} </span> </p> 
                                    <p class="text-gray-600">${v.german}</p> 
                                </div> 
                                ${((selectedLevel === 'A1' || selectedLevel === 'A2' || selectedLevel === 'Wiederholung' || selectedLevel === 'Lektüren') && v.exampleFrench && v.exampleGerman) ? ` 
                                    <button class="btn-secondary py-1 px-2 text-xs rounded" data-vocab-index="${index}" data-action="toggle-example" data-container-id="vocab-${index}-example">Beispiel</button> 
                                ` : ''} 
                            </div> 
                            <div id="vocab-${index}-example" class="hidden mt-2"></div> 
                        </li> `).join('')} 
                </ul> 
            </div> 
            <button id="backToMenuBtnList" class="btn btn-neutral mt-6">Zurück zum Menü</button> 
        </div>`;
    
    DOM.appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); });
    DOM.appDiv.querySelectorAll('[data-action="toggle-example"]').forEach(button => {
        button.onclick = () => toggleExample(button, button.dataset.containerId);
    });
    document.getElementById('backToMenuBtnList').onclick = () => { setState({ currentView: 'chapterMenu' }); renderApp(); };
}

function renderLearnOptionsScreen() {
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

function renderProgressBar() {
    const { currentQuestionIndex, initialQuizWordCount } = state;
    const progress = initialQuizWordCount > 0 ? ((currentQuestionIndex + 1) / initialQuizWordCount) * 100 : 0;
    return `<div class="mb-3"><div class="flex justify-between mb-1"><span class="text-sm font-medium text-blue-700">Fortschritt</span><span class="text-sm font-medium text-blue-700">${currentQuestionIndex + 1} / ${initialQuizWordCount}</span></div><div class="progress-bar-bg"><div class="progress-fill" style="width: ${progress}%"></div></div></div>`;
}

function renderFlashcardsScreen() {
    const { quizWords, currentQuestionIndex, initialQuizWordCount, isCardFlipped } = state;
    if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; }

    const { sureCount, unsureCount, noIdeaCount, currentQuizDirection, selectedLevel, isReviewRound } = state;
    const currentWord = quizWords[currentQuestionIndex];
    const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german;
    const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french;
    let statsHTML = `<div class="quiz-stats-text text-right mb-2 text-xs"><p class="text-green-600 inline-block mr-2">Sicher: ${sureCount}</p><p class="text-orange-500 inline-block mr-2">Unsicher: ${unsureCount}</p><p class="text-red-500 inline-block">Ahnungslos: ${noIdeaCount}</p></div>`;
    const questionLangIsFrench = currentQuizDirection === 'frToDe';
    const answerLangIsFrench = currentQuizDirection === 'deToFr';
    const isGlobalReviewContext = selectedLevel === 'Wiederholung';

    DOM.appDiv.innerHTML = ` 
            <div class="card-content w-full max-w-lg mx-auto flex-grow flex flex-col"> 
                <div>
                    ${renderProgressBar()} 
                    <div class="flex justify-between items-center mb-1"> 
                        <h3 class="text-xl font-semibold text-slate-700">${isReviewRound ? 'Fehlerrunde: ' : (isGlobalReviewContext ? 'Globale Wiederholung: ' : '')}Karteikarten</h3> 
                        ${statsHTML} 
                    </div> 
                </div> 
                <div id="flashcard" class="bg-sky-50 rounded-lg p-6 flex-grow flex flex-col justify-center items-center text-center cursor-pointer min-h-[200px] my-3"> 
                    <div class="text-2xl md:text-3xl font-bold text-sky-800"> 
                        ${questionText} 
                        ${questionLangIsFrench ? `<span class="speaker-icon-clickable-area" data-text="${questionText}">${speakerIconSvgContent}</span>` : ''} 
                    </div> 
                    ${isCardFlipped ? ` 
                        <hr class="w-1/2 my-4 border-sky-200"> 
                        <p class="text-xl md:text-2xl text-gray-700"> 
                            ${answerText} 
                            ${answerLangIsFrench ? `<span class="speaker-icon-clickable-area" data-text="${answerText}">${speakerIconSvgContent}</span>` : ''} 
                        </p> 
                        ${((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext || selectedLevel === 'Lektüren') && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                            <button class="btn-secondary py-1 px-2 text-xs rounded mt-3" data-action="toggle-example" data-container-id="flashcard-example">Beispiel</button> 
                            <div id="flashcard-example" class="hidden mt-2 text-sm text-left w-full"></div> 
                        ` : ''} 
                    ` : '<p class="text-gray-500 mt-4 text-sm">(Klicken zum Umdrehen)</p>'} 
                </div> 
                <div id="feedbackButtons" class="mt-auto space-y-2 ${!isCardFlipped ? 'hidden' : ''}"> 
                    <div class="grid grid-cols-3 gap-2"> 
                        <button id="btnNoIdea" class="btn bg-red-500 hover:bg-red-600 w-full">Ahnungslos</button> 
                        <button id="btnUnsure" class="btn bg-orange-500 hover:bg-orange-600 w-full">Unsicher</button> 
                        <button id="btnSure" class="btn bg-green-500 hover:bg-green-600 w-full">Sicher</button> 
                    </div> 
                </div> 
                <button id="quitQuizBtnFlash" class="btn btn-neutral mt-4 w-full">Quiz abbrechen</button> 
            </div>`;

    DOM.appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); });
    DOM.appDiv.querySelectorAll('[data-action="toggle-example"]').forEach(button => { button.onclick = () => toggleExample(button, button.dataset.containerId) });

    const goToNextCardFlash = () => {
        setState({ currentQuestionIndex: state.currentQuestionIndex + 1, isCardFlipped: false });
        renderFlashcardsScreen();
    };

    if (!isCardFlipped) {
        document.getElementById('flashcard').onclick = () => {
            setState({ isCardFlipped: true });
            renderFlashcardsScreen();
        };
    } else {
        document.getElementById('btnSure').onclick = () => { setState({ sureCount: state.sureCount + 1 }); goToNextCardFlash(); };
        document.getElementById('btnUnsure').onclick = () => {
            if (!state.incorrectlyAnsweredWordsGlobal.find(v => v.french === currentWord.french)) {
                state.incorrectlyAnsweredWordsGlobal.push(currentWord);
            }
            if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord);
            setState({ unsureCount: state.unsureCount + 1 });
            goToNextCardFlash();
        };
        document.getElementById('btnNoIdea').onclick = () => {
            if (!state.incorrectlyAnsweredWordsGlobal.find(v => v.french === currentWord.french)) {
                state.incorrectlyAnsweredWordsGlobal.push(currentWord);
            }
            if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord);
            setState({ noIdeaCount: state.noIdeaCount + 1 });
            goToNextCardFlash();
        };
    }
    document.getElementById('quitQuizBtnFlash').onclick = () => {
        setState({ currentView: 'home', selectedLevel: null, selectedChapter: null, selectedMainChapter: null });
        renderApp();
    };
}

function renderMultipleChoiceScreen() {
    const { quizWords, currentQuestionIndex, initialQuizWordCount } = state;
    if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; }

    const { roundCorrectCount, roundIncorrectCount, currentQuizDirection, selectedLevel, isReviewRound, chapterVocab, vocabDataGlobal, selectedChapter } = state;
    const currentWord = quizWords[currentQuestionIndex];
    const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german;
    const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french;
    const questionLangIsFrench = currentQuizDirection === 'frToDe';
    const isGlobalReviewContext = selectedLevel === 'Wiederholung';

    let vocabSourceForDistractors = chapterVocab;
    if (isGlobalReviewContext && vocabDataGlobal[selectedLevel] && vocabDataGlobal[selectedLevel][selectedChapter]) {
        vocabSourceForDistractors = vocabDataGlobal[selectedLevel][selectedChapter];
    } else if (isReviewRound && state.incorrectlyAnsweredWordsGlobal.length > 3) {
        vocabSourceForDistractors = state.incorrectlyAnsweredWordsGlobal;
    }

    let potentialDistractors = [];
    if (vocabSourceForDistractors && vocabSourceForDistractors.length > 0) {
        potentialDistractors = vocabSourceForDistractors
            .filter(word => word.french !== currentWord.french)
            .map(v => currentQuizDirection === 'frToDe' ? v.german : v.french);
    }
    
    const distractors = shuffleArray([...new Set(potentialDistractors.filter(d => normalizeAnswerGeneral(d) !== normalizeAnswerGeneral(answerText)))]).slice(0, 3);
    let options = shuffleArray([answerText, ...distractors]);
    if (options.length === 0 || (options.length < 4 && vocabSourceForDistractors && options.length < vocabSourceForDistractors.length)) {
        let fallbackOptions = vocabDataGlobal.Grundlagen['Begrüßung und Verabschiedung']
            .map(v => currentQuizDirection === 'frToDe' ? v.german : v.french)
            .filter(d => normalizeAnswerGeneral(d) !== normalizeAnswerGeneral(answerText) && !options.includes(d));
        options.push(...shuffleArray(fallbackOptions).slice(0, 4 - options.length));
        options = shuffleArray([...new Set(options)]);
    }
    if (options.length === 1 && !options.includes(answerText)) options.push(answerText);
    if (options.length === 0) options.push(answerText);

    DOM.appDiv.innerHTML = `
        <div class="card-content w-full max-w-lg mx-auto flex-grow flex flex-col justify-between"> 
            <div>
                ${renderProgressBar()} 
                <div class="flex justify-between items-center mb-1"> 
                    <h3 class="text-xl font-semibold text-slate-700">${isReviewRound ? 'Fehlerrunde: ' : (isGlobalReviewContext ? 'Globale Wiederholung: ' : '')}Multiple Choice</h3> 
                    <div class="quiz-stats-text text-right text-xs"><p class="text-green-600 inline-block mr-2">Richtig: ${roundCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${roundIncorrectCount}</p></div> 
                </div> 
                <p class="text-gray-500 mb-4 text-sm">Wähle die richtige Übersetzung:</p> 
                <div class="text-2xl font-bold text-center my-6 p-4 bg-sky-50 rounded-lg text-sky-700 min-h-[60px] flex items-center justify-center"> 
                    ${questionText} 
                    ${questionLangIsFrench ? `<span class="speaker-icon-clickable-area" data-text="${questionText}">${speakerIconSvgContent}</span>` : ''} 
                </div> 
                <div id="optionsContainer" class="grid grid-cols-1 sm:grid-cols-2 gap-3">${options.map(option => `<button class="mc-option-button option-btn">${option}</button>`).join('')}</div> 
                <div id="feedbackArea" class="mt-4 text-center min-h-[40px]"> 
                    <p id="feedbackMC" class="h-6"></p> 
                    ${((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext || selectedLevel === 'Lektüren') && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                        <button id="mc-example-btn" class="btn-secondary py-1 px-2 text-xs rounded mt-1 hidden" data-action="toggle-example" data-container-id="mc-example">Beispiel</button> 
                        <div id="mc-example" class="hidden mt-2 text-sm text-left"></div> 
                    ` : ''} 
                </div> 
            </div> 
            <div class="mt-auto"> 
                <button id="nextQuestionBtnMC" class="btn btn-primary mt-6 w-full hidden">Nächste Frage</button> 
                <button id="quitQuizBtnMC" class="btn btn-neutral mt-2 w-full">Quiz abbrechen</button> 
            </div> 
        </div>`;
    
    DOM.appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); });
    DOM.appDiv.querySelectorAll('[data-action="toggle-example"]').forEach(button => { button.onclick = () => toggleExample(button, button.dataset.containerId) });

    const nextButton = document.getElementById('nextQuestionBtnMC');
    const statsDiv = DOM.appDiv.querySelector('.quiz-stats-text');
    const mcExampleBtn = document.getElementById('mc-example-btn');
    const feedbackP = document.getElementById('feedbackMC');

    DOM.appDiv.querySelectorAll('.option-btn').forEach(button => {
        button.onclick = (e) => {
            DOM.appDiv.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = true; });
            const selectedAnswer = e.target.textContent;
            const normalizedUserAnswer = normalizeAnswerGeneral(selectedAnswer);
            const normalizedCorrectFullAnswer = normalizeAnswerGeneral(answerText);
            let isCorrect = (normalizedUserAnswer === normalizedCorrectFullAnswer);
            
            let newCorrectCount = state.roundCorrectCount;
            let newIncorrectCount = state.roundIncorrectCount;

            if (isCorrect) {
                e.target.classList.add('mc-option-button-correct');
                feedbackP.textContent = "Richtig!";
                feedbackP.className = 'h-6 feedback-text-correct';
                newCorrectCount++;
            } else {
                e.target.classList.add('mc-option-button-incorrect');
                feedbackP.textContent = `Falsch. Richtig: ${answerText}`;
                feedbackP.className = 'h-6 feedback-text-incorrect';
                if (!state.incorrectlyAnsweredWordsGlobal.find(w => w.french === currentWord.french)) {
                    state.incorrectlyAnsweredWordsGlobal.push(currentWord);
                }
                newIncorrectCount++;
                if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord);
            }
            
            setState({ roundCorrectCount: newCorrectCount, roundIncorrectCount: newIncorrectCount });

            if (mcExampleBtn) mcExampleBtn.classList.remove('hidden');
            statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${newCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${newIncorrectCount}</p>`;
            nextButton.classList.remove('hidden');
            nextButton.focus();
        };
    });

    nextButton.onclick = () => { setState({ currentQuestionIndex: state.currentQuestionIndex + 1 }); renderMultipleChoiceScreen(); };
    document.getElementById('quitQuizBtnMC').onclick = () => {
        setState({ currentView: 'home', selectedLevel: null, selectedChapter: null, selectedMainChapter: null });
        renderApp();
    };
}

function renderManualInputScreen() {
    const { quizWords, currentQuestionIndex, initialQuizWordCount } = state;
    if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; }

    const { roundCorrectCount, roundIncorrectCount, currentQuizDirection, selectedLevel, isReviewRound } = state;
    const currentWord = quizWords[currentQuestionIndex];
    const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german;
    const answerLangOriginal = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french;
    const inputLang = currentQuizDirection === 'frToDe' ? 'de' : 'fr';
    const specialChars = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ô', 'û', 'ç', 'î', 'ï', 'œ', 'ù'];
    const questionLangIsFrench = currentQuizDirection === 'frToDe';
    const isGlobalReviewContext = selectedLevel === 'Wiederholung';

    DOM.appDiv.innerHTML = `
        <div class="card-content w-full max-w-lg mx-auto flex-grow flex flex-col justify-between"> 
            <div>
                ${renderProgressBar()} 
                <div class="flex justify-between items-center mb-1"> 
                    <h3 class="text-xl font-semibold text-slate-700">${isReviewRound ? 'Fehlerrunde: ' : (isGlobalReviewContext ? 'Globale Wiederholung: ' : '')}Manuelle Eingabe</h3> 
                    <div class="quiz-stats-text text-right text-xs"><p class="text-green-600 inline-block mr-2">Richtig: ${roundCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${roundIncorrectCount}</p></div> 
                </div> 
                <p class="text-gray-500 mb-4 text-sm">${currentQuizDirection === 'frToDe' ? 'Gib das deutsche Wort ein für:' : 'Gib das französische Wort ein für:'}</p> 
                <div class="text-2xl font-bold text-center my-6 p-4 bg-sky-50 rounded-lg text-sky-700 min-h-[60px] flex items-center justify-center"> 
                    ${questionText} 
                    ${questionLangIsFrench ? `<span class="speaker-icon-clickable-area" data-text="${questionText}">${speakerIconSvgContent}</span>` : ''} 
                </div> 
                <input type="text" id="answerInput" lang="${inputLang}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" placeholder="${currentQuizDirection === 'frToDe' ? 'Deutsches Wort...' : 'Französisches Wort...'}"> 
                ${inputLang === 'fr' ? `<div id="specialCharsContainer" class="mt-3 flex flex-wrap justify-center gap-2">${specialChars.map(char => `<button class="special-char-btn" data-char="${char}">${char}</button>`).join('')}</div>` : ''} 
                <div id="feedbackAreaManual" class="mt-4 text-center min-h-[40px]"> 
                    <p id="feedbackFill" class="h-6"></p> 
                    <button id="markCorrectBtnManual" class="mark-correct-override-btn hidden">Als richtig markieren</button> 
                    ${((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext || selectedLevel === 'Lektüren') && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                        <button id="manual-example-btn" class="btn-secondary py-1 px-2 text-xs rounded mt-1 hidden" data-action="toggle-example" data-container-id="manual-example">Beispiel</button> 
                        <div id="manual-example" class="hidden mt-2 text-sm text-left"></div> 
                    ` : ''} 
                </div> 
            </div> 
            <div class="mt-auto"> 
                <button id="submitAnswerBtn" class="btn btn-primary mt-6 w-full">Antwort prüfen</button> 
                <button id="nextQuestionBtnFill" class="btn btn-primary mt-2 w-full hidden">Nächste Frage</button> 
                <button id="quitQuizBtnManual" class="btn btn-neutral mt-2 w-full">Quiz abbrechen</button> 
            </div> 
        </div>`;

    const answerInput = document.getElementById('answerInput');
    const submitBtn = document.getElementById('submitAnswerBtn');
    const nextBtn = document.getElementById('nextQuestionBtnFill');
    const feedbackP = document.getElementById('feedbackFill');
    const markCorrectBtnManual = document.getElementById('markCorrectBtnManual');
    const manualExampleBtn = document.getElementById('manual-example-btn');
    const statsDiv = DOM.appDiv.querySelector('.quiz-stats-text');

    DOM.appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); });
    DOM.appDiv.querySelectorAll('[data-action="toggle-example"]').forEach(button => { button.onclick = () => toggleExample(button, button.dataset.containerId) });

    if (inputLang === 'fr') {
        document.getElementById('specialCharsContainer').addEventListener('click', (e) => {
            if (e.target.classList.contains('special-char-btn')) {
                answerInput.value += e.target.dataset.char;
                answerInput.focus();
            }
        });
    }

    answerInput.focus();
    answerInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitBtn.click(); });

    submitBtn.onclick = () => {
        markCorrectBtnManual.classList.add('hidden');
        const userAnswerRaw = answerInput.value.trim();
        
        // NEUE LOGIK FÜR KLAMMERN
        const initialOptions = answerLangOriginal.split(/[\/;]\s*/);
        const correctOriginalOptions = initialOptions.flatMap(opt => {
            const match = opt.match(/(.*)\((.*)\)(.*)/);
            if (!match) {
                return [opt];
            }
            const [, prefix, content, suffix] = match;
            const shortVersion = (prefix + suffix).trim().replace(/\s+/g, ' ');
            const longVersion = (prefix + content + suffix).trim().replace(/\s+/g, ' ');
            return [opt, shortVersion, longVersion];
        });
        
        const normalizeFunc = currentQuizDirection === 'frToDe' ? normalizeGermanAnswerForComparison : normalizeAnswerGeneral;
        const userAnswerNormalized = normalizeFunc(userAnswerRaw);

        const correctNormalizedOptions = new Set(correctOriginalOptions.map(opt => normalizeFunc(opt)));
        const isCorrect = correctNormalizedOptions.has(userAnswerNormalized);
        
        let newCorrectCount = state.roundCorrectCount;
        let newIncorrectCount = state.roundIncorrectCount;

        if (isCorrect) {
            newCorrectCount++;
            feedbackP.textContent = "Richtig!";
            feedbackP.className = 'h-6 feedback-text-correct';
        } else {
            newIncorrectCount++;
            if (!state.incorrectlyAnsweredWordsGlobal.find(w => w.french === currentWord.french)) {
                state.incorrectlyAnsweredWordsGlobal.push(currentWord);
            }
            feedbackP.textContent = `Falsch. Richtig: ${initialOptions.join(' / ')}`;
            feedbackP.className = 'h-6 feedback-text-incorrect';
            markCorrectBtnManual.classList.remove('hidden');
            if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord);
        }
        
        setState({ roundCorrectCount: newCorrectCount, roundIncorrectCount: newIncorrectCount });

        if (manualExampleBtn) manualExampleBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');
        nextBtn.focus();
        answerInput.disabled = true;
        statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${newCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${newIncorrectCount}</p>`;
    };

    markCorrectBtnManual.onclick = () => {
        const newCorrectCount = state.roundCorrectCount + 1;
        const newIncorrectCount = state.roundIncorrectCount - 1;
        const newIncorrectlyAnswered = state.incorrectlyAnsweredWordsGlobal.filter(w => w.french !== currentWord.french);
        
        setState({
            roundCorrectCount: newCorrectCount,
            roundIncorrectCount: newIncorrectCount,
            incorrectlyAnsweredWordsGlobal: newIncorrectlyAnswered
        });
        
        feedbackP.textContent = "Als richtig markiert!";
        feedbackP.className = 'h-6 feedback-text-correct';
        markCorrectBtnManual.classList.add('hidden');
        statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${newCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${newIncorrectCount}</p>`;
    };

    nextBtn.onclick = () => { setState({ currentQuestionIndex: state.currentQuestionIndex + 1 }); renderManualInputScreen(); };
    document.getElementById('quitQuizBtnManual').onclick = () => {
        setState({ currentView: 'home', selectedLevel: null, selectedChapter: null, selectedMainChapter: null });
        renderApp();
    };
}


function createVocabCelebrationAnimationHTML() {
    let confettiHtml = '';
    const colors = ['#ffc107', '#4A90E2', '#EF4135', '#FFFFFF', '#a855f7', '#22c55e'];
    for (let i = 0; i < 50; i++) {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const animDuration = 1.0 + Math.random() * 0.8;
        const delay = Math.random() * 0.6;
        const rotationStart = Math.random() * 360;
        confettiHtml += `<div class="confetti-vocab" style="left: ${left}%; background-color: ${color}; animation-duration: ${animDuration}s; animation-delay: ${delay}s; transform: rotateZ(${rotationStart}deg) translateY(-20px);"></div>`;
    }
    const logoHtml = `
        <div class="celebrating-logo-vocab">
            <div class="speech-bubble-body-vocab">
                <div class="flag-icon-vocab">
                    <div class="flag-blue-vocab"></div>
                    <div class="flag-white-vocab"></div>
                    <div class="flag-red-vocab"></div>
                </div>
            </div>
            <div class="speech-bubble-tail-vocab"></div>
        </div>`;
    return `<div class="vocab-celebration-container">${logoHtml}${confettiHtml}</div>`;
}

function renderQuizEndScreen() {
    const { currentQuizType, sureCount, roundCorrectCount, initialQuizWordCount, isReviewRound, roundIncorrectCount, learningProgress } = state;
    const { selectedLevel, incorrectlyAnsweredWordsGlobal, isGlobalReviewFlag } = state;
    
    const isGlobalReviewContext = selectedLevel === 'Wiederholung';
    const wordsForNextReview = [...new Set(incorrectlyAnsweredWordsGlobal)];
    let celebrationAnimationHtml = '';

    const allCorrectInThisRound = (currentQuizType === 'flashcards' && sureCount === initialQuizWordCount && sureCount > 0 && state.unsureCount === 0 && state.noIdeaCount === 0) ||
                                  ((currentQuizType === 'multipleChoice' || currentQuizType === 'manualInput') && roundCorrectCount === initialQuizWordCount && roundCorrectCount > 0 && roundIncorrectCount === 0);

    const isMainLearningRound = !isReviewRound && !isGlobalReviewContext;
    
    if (isMainLearningRound) {
        let wordsActuallyLearnedThisSession = (currentQuizType === 'flashcards') ? sureCount : roundCorrectCount;
        if (wordsActuallyLearnedThisSession > 0) {
            completeLearningSession(wordsActuallyLearnedThisSession);
        }
    }
    
    if (allCorrectInThisRound) {
        if (isGlobalReviewContext) {
            checkAndAwardAchievements('REVIEW_COMPLETE');
        }

        if (isMainLearningRound) {
            markChapterAsCompleted(); 
            celebrationAnimationHtml = createVocabCelebrationAnimationHTML();
            
            const newConsecutive = learningProgress.consecutivePerfectChapters + 1;
            setState({ learningProgress: { consecutivePerfectChapters: newConsecutive } });

            checkAndAwardAchievements('PERFECTION_CHECK');

            if(!learningProgress.hasCompletedFirstLesson) {
                setState({ learningProgress: { hasCompletedFirstLesson: true } });
            }
        }
    } else {
        if (isMainLearningRound) {
            setState({ learningProgress: { consecutivePerfectChapters: 0, hasCompletedFirstLesson: true } });
        }
    }
    
    let reviewOptionsHtml = '';
    if (wordsForNextReview.length > 0) {
        reviewOptionsHtml = `
            <p class="text-md text-gray-600 my-4">Du hattest ${wordsForNextReview.length} Fehler. Möchtest du diese wiederholen?</p>
            <button id="startReviewBtn" class="btn btn-primary w-full">Die ${wordsForNextReview.length} Fehler nochmal üben</button>`;
    }

    let scoreDisplay = `${currentQuizType === 'flashcards' ? sureCount : roundCorrectCount} / ${initialQuizWordCount}`;
    let endScreenTitle = "Runde beendet!";
    if (isGlobalReviewContext) endScreenTitle = "Wiederholung beendet!";
    else if (isReviewRound) endScreenTitle = "Fehlerrunde beendet!";

    let navigationButtonsHtml = isGlobalReviewContext ? `
        <button id="backToHomeFromQuizBtn" class="btn btn-secondary w-full">Zurück zur Startseite</button>
    ` : `
        <button id="restartOriginalLessonBtn" class="btn btn-primary w-full">Komplette Lektion wiederholen</button>
        <button id="backToLearnOptionsBtn" class="btn btn-secondary w-full">Zurück zum Lernmodus</button>
        <button id="backToChapterSelectionBtn" class="btn btn-secondary w-full">Zurück zur Kapitelwahl</button>
        <button id="backToHomeFromQuizBtn" class="btn btn-neutral w-full">Zurück zur Startseite</button>
    `;

    DOM.appDiv.innerHTML = `
        <div class="card-content w-full max-w-md mx-auto text-center flex-grow flex flex-col justify-center items-center">
            ${celebrationAnimationHtml} 
            <h2 class="text-2xl font-semibold mb-4 text-slate-700">${endScreenTitle}</h2>
            ${isMainLearningRound && allCorrectInThisRound ? '<p class="text-lg font-semibold text-green-600 mb-4">Perfekt! Kapitel abgeschlossen!</p>' : ''}
            ${(isReviewRound || isGlobalReviewContext) && allCorrectInThisRound ? '<p class="text-lg font-semibold text-green-600 mb-4">Alle Fehler korrigiert! Sehr gut!</p>' : ''}
            
            ${currentQuizType === 'flashcards' ? 
                `<div class="quiz-stats-text text-center mb-4 text-lg">
                    <p class="text-green-600">Sicher: ${sureCount}</p>
                    <p class="text-orange-500">Unsicher: ${state.unsureCount}</p>
                    <p class="text-red-500">Ahnungslos: ${state.noIdeaCount}</p>
                </div>` : 
                `<p class="text-lg text-gray-700 mb-2">Dein Ergebnis:</p>
                 <p class="text-4xl font-bold my-4 text-blue-600">${scoreDisplay}</p>`
            }
            ${reviewOptionsHtml}
            <div class="space-y-3 mt-6 w-full">
                ${navigationButtonsHtml}
            </div>
        </div>
    `;
    
    // Event Handlers
    if (document.getElementById('startReviewBtn')) {
        document.getElementById('startReviewBtn').onclick = () => {
            startQuiz(currentQuizType, wordsForNextReview, isGlobalReviewContext);
        };
    }
    
    const backToHome = () => {
        setState({ currentView: 'home', selectedLevel: null, selectedChapter: null, selectedMainChapter: null });
        renderApp();
    };

    const restartOriginalLessonBtn = document.getElementById('restartOriginalLessonBtn');
    if (restartOriginalLessonBtn) {
        restartOriginalLessonBtn.onclick = () => startQuiz(currentQuizType, null, false);
    }
    const backToLearnOptionsBtn = document.getElementById('backToLearnOptionsBtn');
    if (backToLearnOptionsBtn) {
        backToLearnOptionsBtn.onclick = () => { setState({ currentView: 'learnOptions' }); renderApp(); };
    }
    const backToChapterSelectionBtn = document.getElementById('backToChapterSelectionBtn');
    if (backToChapterSelectionBtn) {
        backToChapterSelectionBtn.onclick = () => {
            const nextView = state.selectedMainChapter ? 'subChapterSelection' : 'levelChapterSelection';
            const newState = { currentView: nextView };
            if (!state.selectedMainChapter) newState.selectedChapter = null;
            setState(newState);
            renderApp();
        };
    }
    const backToHomeFromQuizBtn = document.getElementById('backToHomeFromQuizBtn');
    if (backToHomeFromQuizBtn) {
        backToHomeFromQuizBtn.onclick = backToHome;
    }
}