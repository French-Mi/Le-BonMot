document.addEventListener('DOMContentLoaded', () => {

    // --- DOM-Elemente ---
    const appDiv = document.getElementById('app');
    const messageBox = document.getElementById('message-box-custom');
    const messageText = document.getElementById('message-text-custom');
    const messageOkBtn = document.getElementById('message-ok-btn-custom');
    const streakTrackerDiv = document.getElementById('streak-tracker');

    // --- Zustand der Anwendung (State) ---
    let currentView = 'home';
    let selectedLevel = null;
    let selectedChapter = null;
    let selectedMainChapter = null;
    let vocabDataGlobal = null;
    
    let chapterVocab = [];
    let quizWords = [];
    
    let currentQuestionIndex = 0;
    
    // Zähler
    let sureCount = 0;
    let unsureCount = 0;
    let noIdeaCount = 0;
    let roundCorrectCount = 0;
    let roundIncorrectCount = 0;
    
    let incorrectlyAnsweredWordsGlobal = [];
    
    let currentQuizDirection = 'frToDe';
    let currentQuizType = '';
    let isReviewRound = false;
    let desiredVocabCount = 0;
    let initialQuizWordCount = 0;
    let isCardFlipped = false;

    let learningProgress = {
        completedChapters: {},
        startedChapters: {},
        streak: { current: 0, lastLearnedDate: null },
        weeklyStats: {}
    };
    let incorrectWordsHistory = [];

    const synth = window.speechSynthesis;
    let frenchVoices = [];
    let splashTimeoutId = null;

    const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;

    // =================================================================================
    // HILFSFUNKTIONEN
    // =================================================================================
    function getWeekNumber(d) { try { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return d.getUTCFullYear() + '-W' + weekNo; } catch (e) { console.error("Error in getWeekNumber:", e); return new Date().getFullYear() + '-W01'; } }
    function showMessage(text) { if (messageText && messageBox) { messageText.textContent = text; messageBox.classList.remove('hidden'); } else { alert(text); console.error("Message box elements not found for: ", text); } }
    
    function loadVoices() {
        if (synth) {
            try {
                let availableVoices = synth.getVoices();
                frenchVoices = availableVoices.filter(v => v.lang.startsWith('fr'));
                console.log("Verfügbare französische Stimmen:", frenchVoices.map(v => ({ name: v.name, lang: v.lang, default: v.default }) ));
                if (frenchVoices.length === 0 && availableVoices.length > 0) {
                    console.warn("Keine spezifischen französischen Stimmen gefunden. Versuche System-Standard für fr-FR.");
                } else if (availableVoices.length === 0) {
                     console.warn("synth.getVoices() hat eine leere Liste zurückgegeben. Warten auf onvoiceschanged.");
                }

                if (typeof synth.onvoiceschanged === 'function') { 
                    console.log("onvoiceschanged handler bereits vorhanden.");
                } else if (synth.onvoiceschanged !== undefined) {
                     synth.onvoiceschanged = () => {
                        console.log("onvoiceschanged Ereignis ausgelöst.");
                        availableVoices = synth.getVoices();
                        frenchVoices = availableVoices.filter(v => v.lang.startsWith('fr'));
                        console.log("Französische Stimmen nach onvoiceschanged:", frenchVoices.map(v => ({ name: v.name, lang: v.lang, default: v.default }) ));
                         if (frenchVoices.length === 0 && availableVoices.length > 0) {
                            console.warn("Keine spezifischen französischen Stimmen gefunden nach onvoiceschanged.");
                        }
                    };
                }
            } catch (e) {
                console.error("Fehler beim Laden der Stimmen:", e);
                showMessage("Fehler beim Laden der Sprachausgabe-Stimmen.");
            }
        }
    }
        
    function speakFrench(textToSpeak, event) {
        if(event) event.stopPropagation(); 
        console.log("Sprechversuch für Text:", textToSpeak);

        if (!synth) {
            showMessage("Sprachausgabe wird von diesem Browser nicht unterstützt.");
            console.error("SpeechSynthesis API nicht unterstützt.");
            return;
        }
        if (synth.speaking) {
            console.log("Sprachausgabe abgebrochen, da bereits eine lief.");
            synth.cancel();
        }

        let cleanedText = String(textToSpeak).replace(/\(.*\)/gi, '').replace(/\b(qc|qn)\b\.?/gi, '').trim();
        if (!cleanedText) {
            console.warn("Kein Text zum Sprechen nach Bereinigung für Originaltext:", textToSpeak);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9; 
        utterance.pitch = 1; 

        if (frenchVoices.length > 0) {
            let voice = frenchVoices.find(v => v.name.toLowerCase().includes('amelie') || v.name.toLowerCase().includes('thomas') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('française'));
            if (!voice) { voice = frenchVoices.find(v => v.lang === 'fr-FR' && v.default) || frenchVoices.find(v => v.lang === 'fr-FR') || frenchVoices[0];}
            if (voice) {
                utterance.voice = voice;
                // console.log("Verwendete Stimme:", voice.name, "| Sprache:", voice.lang, "| Standard:", voice.default); // Weniger Logging für Sprachausgabe
            } else {
                console.warn("Konnte keine spezifische französische Stimme zuweisen. Browser-Standard für 'fr-FR' wird verwendet (falls vorhanden).");
            }
        } else {
            console.warn("Französische Stimmliste ist leer oder nicht initialisiert. Browser-Standard für 'fr-FR' wird verwendet (falls vorhanden).");
            if (synth.getVoices().length === 0) {
                 console.log("Erneuter Versuch, Stimmen zu laden, da die Liste leer ist.");
                 loadVoices();
            }
        }

        utterance.onstart = () => { /* console.log("Sprachausgabe gestartet für:", cleanedText); */ }; // Weniger Logging
        utterance.onend = () => { /* console.log("Sprachausgabe beendet für:", cleanedText); */ }; // Weniger Logging
        utterance.onerror = (e) => {
            console.error("Fehler bei der Sprachsynthese:", e.error, "| Für Text:", cleanedText, "| Utterance-Objekt:", utterance);
            let errorMsg = `Fehler bei Sprachausgabe: ${e.error}.`;
            if (e.error === 'no-speech' || e.error === 'audio-busy' || e.error === 'audio-hardware') {
                errorMsg += ` Bitte Audioeinstellungen prüfen oder später erneut versuchen.`;
            } else if (e.error === 'language-unavailable' || e.error === 'voice-unavailable') {
                errorMsg += ` Französische Sprache/Stimme nicht verfügbar.`;
            } else if (e.error === 'synthesis-failed' || e.error === 'synthesis-unavailable') {
                 errorMsg += ` Sprachsynthese fehlgeschlagen/nicht verfügbar.`;
            } else if (e.error === 'not-allowed' || e.error === 'blocked') {
                errorMsg += ` Die Sprachausgabe wurde vom Browser blockiert. Ggf. Berechtigungen prüfen.`
            }
            showMessage(errorMsg);
        };

        try {
            synth.speak(utterance);
        } catch (e) {
            console.error("Fehler beim Aufruf von synth.speak:", e);
            showMessage("Konnte Sprachausgabe nicht starten. Fehler: " + e.message);
        }
    }

    function shuffleArray(array) { const newArray = [...array]; for (let i = newArray.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[newArray[i], newArray[j]] = [newArray[j], newArray[i]]; } return newArray; }
    function normalizeAnswerGeneral(answer) { if (typeof answer !== 'string') return ''; return answer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, "").replace(/\s+/g, ' ').trim(); }
    function normalizeGermanAnswerForComparison(answer) { if (typeof answer !== 'string') return ''; let normalized = answer.toLowerCase().trim(); const articles = /\b(der|die|das|ein|eine|einen|einem|einer)\b\s*/gi; normalized = normalized.replace(articles, '').trim(); normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, ""); return normalized.replace(/\s+/g, ' ').trim(); }
    
    // =================================================================================
    // LERNFORTSCHRITTS-FUNKTIONEN
    // =================================================================================
    function loadProgress() {
        try {
            const savedProgress = localStorage.getItem('leBonMotProgress');
            if (savedProgress) {
                learningProgress = JSON.parse(savedProgress);
                if (!learningProgress.weeklyStats) learningProgress.weeklyStats = {};
                if (!learningProgress.completedChapters) learningProgress.completedChapters = {};
                if (!learningProgress.startedChapters) learningProgress.startedChapters = {};
                if (!learningProgress.streak) learningProgress.streak = { current: 0, lastLearnedDate: null };
            }
            const savedIncorrectWords = localStorage.getItem('leBonMotIncorrectWords');
            if (savedIncorrectWords) {
                incorrectWordsHistory = JSON.parse(savedIncorrectWords);
            }
        } catch (e) {
            console.error("Error loading progress:", e);
            learningProgress = { completedChapters: {}, startedChapters: {}, streak: { current: 0, lastLearnedDate: null }, weeklyStats: {} };
            incorrectWordsHistory = [];
            saveProgress();
            saveIncorrectWordsHistory();
        }
        updateStreak();
    }

    function saveProgress() { try { localStorage.setItem('leBonMotProgress', JSON.stringify(learningProgress)); } catch (e) { console.error("Error saving progress:", e); } }
    function saveIncorrectWordsHistory() { try { localStorage.setItem('leBonMotIncorrectWords', JSON.stringify(incorrectWordsHistory)); } catch (e) { console.error("Error saving incorrect words history:", e); } }
    function logIncorrectWord(wordObject) { if (!wordObject || !wordObject.french) return; const newErrorEntry = { ...wordObject, timestamp: new Date().toISOString() }; incorrectWordsHistory.push(newErrorEntry); saveIncorrectWordsHistory(); }
    
    function updateStreak() {
        try {
            const today = (new Date()).toDateString();
            const lastLearned = learningProgress.streak.lastLearnedDate;

            if (learningProgress.streak.lastLearnedDate) { 
                const diffDays = ((new Date(today)) - (new Date(lastLearned))) / (1000 * 60 * 60 * 24);
                if (diffDays > 1) { 
                    learningProgress.streak.current = 0; 
                }
            }
            saveProgress();
            renderStreak(); 
        } catch (e) {
            console.error("Error updating streak on load:", e);
        }
    }

    function markChapterAsStarted() {
        try {
            const chapterKey = selectedMainChapter ? `${selectedMainChapter} - ${selectedChapter}` : selectedChapter;
            if (!selectedLevel || !chapterKey) return;
            if (!learningProgress.startedChapters[selectedLevel]) {
                learningProgress.startedChapters[selectedLevel] = [];
            }
            if (!isChapterCompleted(selectedLevel, selectedChapter, selectedMainChapter) && !learningProgress.startedChapters[selectedLevel].includes(chapterKey)) {
                learningProgress.startedChapters[selectedLevel].push(chapterKey);
                saveProgress();
            }
        } catch (e) {
            console.error("Error marking chapter as started:", e);
        }
    }

    function isChapterStarted(level, chapter, mainChapter = null) {
        try {
            const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
            return learningProgress.startedChapters[level]?.includes(chapterKey) && !isChapterCompleted(level, chapter, mainChapter);
        } catch (e) {
            console.error("Error checking chapter started status:", e);
            return false;
        }
    }

    function markChapterAsCompleted() {
        try {
            const chapterKey = selectedMainChapter ? `${selectedMainChapter} - ${selectedChapter}` : selectedChapter;
            if (!selectedLevel || !chapterKey) return;
            if (!learningProgress.completedChapters[selectedLevel]) {
                learningProgress.completedChapters[selectedLevel] = [];
            }
            if (!learningProgress.completedChapters[selectedLevel].includes(chapterKey)) {
                learningProgress.completedChapters[selectedLevel].push(chapterKey);
            }
            if (learningProgress.startedChapters[selectedLevel]) {
                const index = learningProgress.startedChapters[selectedLevel].indexOf(chapterKey);
                if (index > -1) {
                    learningProgress.startedChapters[selectedLevel].splice(index, 1);
                }
            }
            saveProgress();
        } catch (e) {
            console.error("Error marking chapter complete:", e);
        }
    }

    function isChapterCompleted(level, chapter, mainChapter = null) { try { const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter; return learningProgress.completedChapters[level]?.includes(chapterKey) || false; } catch (e) { console.error("Error checking chapter completion:", e); return false; } }
    
    function completeLearningSession(wordsLearnedInQuiz) {
        try {
            const today = (new Date()).toDateString();
            const lastLearned = learningProgress.streak.lastLearnedDate;

            if (lastLearned === today) {
                // Already learned today
            } else if (lastLearned && ((new Date(today)) - (new Date(lastLearned))) / (1000 * 60 * 60 * 24) === 1) {
                learningProgress.streak.current += 1; 
            } else {
                learningProgress.streak.current = 1; 
            }
            learningProgress.streak.lastLearnedDate = today;

            const weekKey = getWeekNumber(new Date());
            if (!learningProgress.weeklyStats[weekKey]) {
                learningProgress.weeklyStats[weekKey] = 0;
            }
            learningProgress.weeklyStats[weekKey] += wordsLearnedInQuiz;
            saveProgress();
            renderStreak();
        } catch (e) {
            console.error("Error completing learning session:", e);
        }
    }

    // =================================================================================
    // RENDER-FUNKTIONEN
    // =================================================================================
    function renderStreak() {
        if (!streakTrackerDiv) return;
        const currentStreak = learningProgress.streak.current || 0;
        if (currentStreak > 0) {
            streakTrackerDiv.innerHTML = `🔥 Aktueller Streak: <strong>${currentStreak} ${currentStreak === 1 ? 'Tag' : 'Tage'}</strong>!`;
            streakTrackerDiv.className = 'streak-active'; 
        } else {
            streakTrackerDiv.innerHTML = `Starte heute eine neue Lernserie!`;
            streakTrackerDiv.className = 'streak-inactive'; 
        }
    }

    function renderApp() {
        if (!appDiv) { console.error("Fatal Error: appDiv not found!"); document.body.innerHTML = "App-Container nicht gefunden. Laden abgebrochen."; return; }
        try {
            appDiv.innerHTML = '';
            appDiv.className = 'main-app-content view-animation'; 
            
            if (streakTrackerDiv) {
                 if (currentView === 'home' || currentView === 'levelChapterSelection' || currentView === 'subChapterSelection' || currentView === 'chapterMenu' || currentView === 'learnOptions') {
                    renderStreak(); 
                    streakTrackerDiv.style.display = 'block';
                } else {
                    streakTrackerDiv.style.display = 'none';
                }
            }

            switch (currentView) {
                case 'home': renderHomeScreen(); break;
                case 'levelChapterSelection': renderLevelChapterSelectionScreen(); break;
                case 'subChapterSelection': renderSubChapterSelectionScreen(); break;
                case 'chapterMenu': renderChapterMenuScreen(); break;
                case 'vocabList': renderVocabListScreen(); break;
                case 'learnOptions': renderLearnOptionsScreen(); break;
                case 'flashcards': renderFlashcardsScreen(); break;
                case 'multipleChoice': renderMultipleChoiceScreen(); break;
                case 'manualInput': renderManualInputScreen(); break;
                default: console.warn(`Unbekannte Ansicht: ${currentView}. Zeige Startbildschirm.`); renderHomeScreen();
            }
        } catch (error) {
            console.error(`Kritischer Fehler in renderApp für Ansicht "${currentView}":`, error);
            appDiv.innerHTML = `<p class='text-red-500 p-4 text-center'>Ein schwerwiegender Fehler ist aufgetreten: ${error.message}<br>Bitte prüfen Sie die Browser-Konsole.</p>`;
        }
    }

    function renderHomeScreen() {
        const levels = Object.keys(vocabDataGlobal);
        const today = new Date();
        const weekKey = getWeekNumber(today);
        const weeklyVocabCount = learningProgress.weeklyStats[weekKey] || 0;
        const streakValue = (learningProgress.streak && learningProgress.streak.current) || 0;

        appDiv.innerHTML = `
            <div class="text-center">
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Willkommen bei le BonMot!</h2>
                <p class="text-slate-600 mb-6">Bitte wähle dein Niveau aus, um zu starten.</p>
                <div id="home-stats-container" class="mb-8">
                    ${streakValue > 0 ? `<p class="stat-item mb-1">🔥 Du hast einen aktuellen Streak von <strong>${streakValue} ${streakValue === 1 ? 'Tag' : 'Tage'}</strong>!</p>` : ''}
                    <p class="stat-item">Du hast diese Woche schon <strong>${weeklyVocabCount}</strong> Vokabeln gelernt!</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    ${levels.map(level => `
                        <button class="btn text-lg py-4 btn-level" data-level="${level}">${level}</button> 
                    `).join('')}
                </div>
                <div id="review-errors-container" class="mt-10 pt-6 border-t border-gray-300">
                    <h3 class="text-xl font-semibold text-slate-700 mb-4">Fehler wiederholen</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button id="review24h" class="btn btn-secondary">Fehler der letzten 24h</button>
                        <button id="review7d" class="btn btn-secondary">Fehler der letzten 7 Tage</button>
                    </div>
                </div>
            </div>`;
        appDiv.querySelectorAll('[data-level]').forEach(button => {
            button.onclick = () => {
                selectedLevel = button.dataset.level;
                currentView = 'levelChapterSelection';
                renderApp();
            };
        });
        document.getElementById('review24h').onclick = () => startGlobalReview(1);
        document.getElementById('review7d').onclick = () => startGlobalReview(7);
    }
    
    function renderLevelChapterSelectionScreen() {
        if (!selectedLevel || !vocabDataGlobal[selectedLevel]) { showMessage("Fehler: Kein gültiges Level ausgewählt."); currentView = 'home'; renderApp(); return; }
        const chapters = Object.keys(vocabDataGlobal[selectedLevel]);
        appDiv.innerHTML = `
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
        appDiv.querySelectorAll('[data-chapter]').forEach(button => { button.onclick = () => { const chapterName = button.dataset.chapter; const chapterData = vocabDataGlobal[selectedLevel][chapterName]; if (Array.isArray(chapterData)) { selectedChapter = chapterName; selectedMainChapter = null; currentView = 'chapterMenu'; } else { selectedMainChapter = chapterName; currentView = 'subChapterSelection'; } renderApp(); }; });
        document.getElementById('backToHomeBtn').onclick = () => { currentView = 'home'; selectedLevel = null; renderApp(); };
    }

    function renderSubChapterSelectionScreen() {
        if (!selectedLevel || !selectedMainChapter || !vocabDataGlobal[selectedLevel][selectedMainChapter]) { showMessage("Fehler: Kein gültiges Hauptkapitel ausgewählt."); currentView = 'levelChapterSelection'; renderApp(); return; }
        const subChapters = Object.keys(vocabDataGlobal[selectedLevel][selectedMainChapter]);
        appDiv.innerHTML = `
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
        appDiv.querySelectorAll('[data-subchapter]').forEach(button => { button.onclick = () => { selectedChapter = button.dataset.subchapter; currentView = 'chapterMenu'; renderApp(); }; });
        document.getElementById('backToLevelsBtn').onclick = () => { currentView = 'levelChapterSelection'; selectedMainChapter = null; renderApp(); };
    }

    function renderChapterMenuScreen() { 
        if (!selectedLevel || !selectedChapter) { showMessage("Fehler: Kein Kapitel ausgewählt."); currentView = 'levelChapterSelection'; renderApp(); return; } 
        const chapterTitle = selectedMainChapter ? `${selectedMainChapter}: ${selectedChapter}` : selectedChapter; 
        appDiv.innerHTML = ` 
            <div class="text-center"> 
                <h2 class="text-2xl font-bold text-slate-800 mb-4">${chapterTitle}</h2> 
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6"> 
                    <button id="showVocabListBtn" class="btn btn-cm-vocablist btn-chapter-menu-item">Vokabelliste anzeigen</button> 
                    <button id="startLearningBtn" class="btn btn-cm-learn btn-chapter-menu-item">Lernen starten</button> 
                </div> 
                <button id="backToChapterSelectionBtn" class="btn btn-cm-back btn-chapter-menu-item btn-full-width">Zurück zur Kapitelauswahl</button> 
            </div>`; 
        document.getElementById('showVocabListBtn').onclick = () => { currentView = 'vocabList'; renderApp(); }; 
        document.getElementById('startLearningBtn').onclick = () => { currentView = 'learnOptions'; renderApp(); }; 
        document.getElementById('backToChapterSelectionBtn').onclick = () => { 
            currentView = selectedMainChapter ? 'subChapterSelection' : 'levelChapterSelection'; 
            if (!selectedMainChapter) selectedChapter = null; 
            renderApp(); 
        }; 
    }

    function renderExampleSentence(vocabItem, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error("renderExampleSentence: Container nicht gefunden für ID:", containerId);
            return;
        }
        console.log("renderExampleSentence: Aufruf mit vocabItem:", vocabItem); 
        console.log("renderExampleSentence: vocabItem.exampleFrench:", vocabItem ? vocabItem.exampleFrench : 'vocabItem ist null/undefined');
        console.log("renderExampleSentence: vocabItem.exampleGerman:", vocabItem ? vocabItem.exampleGerman : 'vocabItem ist null/undefined');

        if (vocabItem && typeof vocabItem === 'object' && vocabItem.exampleFrench && vocabItem.exampleGerman) {
            console.log("renderExampleSentence: Zeige Beispielsatz.");
            container.innerHTML = ` <div class="example-sentence-box"> <p class="mb-1"><strong>FR:</strong> ${vocabItem.exampleFrench} <span class="speaker-icon-clickable-area" data-text="${vocabItem.exampleFrench}"> ${speakerIconSvgContent} </span> </p> <p><strong>DE:</strong> ${vocabItem.exampleGerman}</p> </div>`;
            const speakerIcon = container.querySelector('.speaker-icon-clickable-area');
            if(speakerIcon) { 
                speakerIcon.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e);
            }
            container.classList.remove('hidden');
        } else {
            console.warn("renderExampleSentence: Bedingung für Anzeige nicht erfüllt. vocabItem:", vocabItem, "exampleFrench vorhanden?", !!vocabItem?.exampleFrench, "exampleGerman vorhanden?", !!vocabItem?.exampleGerman);
            container.innerHTML = `<p class="text-gray-500 italic">Kein vollständiger Beispielsatz verfügbar.</p>`;
            container.classList.remove('hidden');
        }
    }
    
    function renderVocabListScreen() { 
        const vocabList = selectedMainChapter ? vocabDataGlobal[selectedLevel][selectedMainChapter][selectedChapter] : vocabDataGlobal[selectedLevel][selectedChapter]; 
        if (!vocabList) { showMessage("Vokabeln nicht gefunden."); currentView = 'chapterMenu'; renderApp(); return; } 
        appDiv.innerHTML = ` 
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
                                    ${ ((selectedLevel === 'A1' || selectedLevel === 'A2' || selectedLevel === 'Wiederholung') && v.exampleFrench && v.exampleGerman) ? ` 
                                        <button class="btn-secondary py-1 px-2 text-xs rounded" data-vocab-index="${index}" onclick="toggleExample(this, 'vocab-${index}-example')">Beispiel</button> 
                                    ` : ''} 
                                </div> 
                                <div id="vocab-${index}-example" class="hidden mt-2"></div> 
                            </li> `).join('')} 
                    </ul> 
                </div> 
                <button id="backToMenuBtnList" class="btn btn-neutral mt-6">Zurück zum Menü</button> 
            </div>`; 
        appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); }); 
        document.getElementById('backToMenuBtnList').onclick = () => { currentView = 'chapterMenu'; renderApp(); }; 
    }

    window.toggleExample = function(button, containerId) {
        console.log("------------------------------------");
        console.log("toggleExample AUFGERUFEN. Button Klick für Container:", containerId);
        const exampleContainer = document.getElementById(containerId);
        if (!exampleContainer) {
            console.error("toggleExample FEHLER: exampleContainer NICHT GEFUNDEN für ID:", containerId);
            return;
        }

        const vocabIndexAttribute = button.dataset.vocabIndex;
        const vocabIndex = vocabIndexAttribute !== undefined ? parseInt(vocabIndexAttribute, 10) : undefined;
        console.log("toggleExample: vocabIndexAttribut vom Button:", vocabIndexAttribute, "Geparster vocabIndex:", vocabIndex);
        
        let vocabItem;

        if (currentView === 'vocabList') {
            console.log("toggleExample: Aktuelle Ansicht ist 'vocabList'.");
            if (vocabIndex !== undefined && !isNaN(vocabIndex)) {
                const currentVocabList = selectedMainChapter 
                    ? vocabDataGlobal[selectedLevel]?.[selectedMainChapter]?.[selectedChapter] 
                    : vocabDataGlobal[selectedLevel]?.[selectedChapter];
                
                if (currentVocabList && vocabIndex >= 0 && vocabIndex < currentVocabList.length) {
                    vocabItem = currentVocabList[vocabIndex];
                    console.log("toggleExample (vocabList): vocabItem ERFOLGREICH GEHOLT:", vocabItem);
                } else {
                    console.error("toggleExample (vocabList) FEHLER: currentVocabList ist undefined oder vocabIndex außerhalb des Bereichs.", "currentVocabList:", currentVocabList, "vocabIndex:", vocabIndex);
                }
            } else {
                console.error("toggleExample (vocabList) FEHLER: vocabIndex ist undefined oder NaN aus button.dataset.", vocabIndexAttribute);
            }
        } else if (quizWords && quizWords.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < quizWords.length) {
            console.log("toggleExample: Aktuelle Ansicht ist ein Quiz. currentQuestionIndex:", currentQuestionIndex);
            vocabItem = quizWords[currentQuestionIndex];
            console.log("toggleExample (Quiz): vocabItem ERFOLGREICH GEHOLT:", vocabItem);
        } else {
             console.warn("toggleExample: Weder vocabList noch Quiz-Ansicht, oder Daten nicht verfügbar. quizWords:", quizWords, "currentQuestionIndex:", currentQuestionIndex);
        }
        
        if (!vocabItem || typeof vocabItem !== 'object') {
            console.error("toggleExample FEHLER: vocabItem ist ungültig oder kein Objekt.", "vocabItem:", vocabItem, "currentView:", currentView);
            exampleContainer.innerHTML = "<p class='text-red-500 italic'>Fehler: Vokabeldaten konnten nicht geladen werden.</p>";
            exampleContainer.classList.remove('hidden');
            if (button) button.textContent = 'Beispiel'; // Reset button text
            return;
        }
        
        console.log("toggleExample: FINALES vocabItem vor Render-Entscheidung:", vocabItem);
        console.log("toggleExample: vocabItem.exampleFrench:", vocabItem.exampleFrench);
        console.log("toggleExample: vocabItem.exampleGerman:", vocabItem.exampleGerman);

        if (exampleContainer.classList.contains('hidden')) {
            console.log("toggleExample: Container war versteckt. Rufe renderExampleSentence auf.");
            renderExampleSentence(vocabItem, containerId); // renderExampleSentence macht den Container sichtbar
            // Der Text des Buttons wird basierend darauf gesetzt, ob ein Satz gerendert wurde ODER die "nicht verfügbar" Nachricht.
            // Wenn der Container jetzt sichtbar ist, sollte der Button "Verbergen" anzeigen.
            button.textContent = 'Verbergen';
        } else {
            console.log("toggleExample: Container war sichtbar. Verstecke ihn.");
            exampleContainer.classList.add('hidden');
            exampleContainer.innerHTML = '';
            button.textContent = 'Beispiel';
        }
        console.log("------------------------------------");
    }

    function renderLearnOptionsScreen() { 
        const vocab = selectedMainChapter ? vocabDataGlobal[selectedLevel][selectedMainChapter][selectedChapter] : vocabDataGlobal[selectedLevel][selectedChapter]; 
        const totalVocabCount = vocab ? vocab.length : 0;
        if (totalVocabCount === 0) {
            showMessage("Keine Vokabeln in diesem Kapitel zum Lernen verfügbar.");
            currentView = 'chapterMenu';
            renderApp();
            return;
        }

        appDiv.innerHTML = ` 
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
        directionFrDe.onclick = () => { currentQuizDirection = 'frToDe'; directionFrDe.classList.replace('btn-direction-inactive', 'btn-direction-active'); directionDeFr.classList.replace('btn-direction-active', 'btn-direction-inactive'); }; 
        directionDeFr.onclick = () => { currentQuizDirection = 'deToFr'; directionDeFr.classList.replace('btn-direction-inactive', 'btn-direction-active'); directionFrDe.classList.replace('btn-direction-active', 'btn-direction-inactive'); }; 
        appDiv.querySelectorAll('[data-quiz-type]').forEach(button => { button.onclick = () => { const quizType = button.dataset.quizType; desiredVocabCount = parseInt(document.getElementById('vocabCount').value, 10); startQuiz(quizType); }; }); 
        document.getElementById('backToMenuFromOptionsBtn').onclick = () => { currentView = 'chapterMenu'; renderApp(); }; 
    }

    function startGlobalReview(days) { 
        const now = new Date(); 
        const cutoffDate = new Date(now.setDate(now.getDate() - days)); 
        const recentErrors = incorrectWordsHistory.filter(entry => new Date(entry.timestamp) >= cutoffDate); 
        if (recentErrors.length === 0) { showMessage(`Keine Fehler in den letzten ${days} ${days > 1 ? 'Tagen' : 'Tag'} gefunden. Super!`); return; } 
        const uniqueWordsMap = new Map(); 
        recentErrors.forEach(entry => { uniqueWordsMap.set(entry.french, { french: entry.french, german: entry.german, exampleFrench: entry.exampleFrench, exampleGerman: entry.exampleGerman }); }); 
        const wordsToReview = Array.from(uniqueWordsMap.values()); 
        let reviewBatch = shuffleArray(wordsToReview);
        if (reviewBatch.length > 20) {
             reviewBatch = reviewBatch.slice(0, 20);
             showMessage(`Du hast viele Fehler zu wiederholen. Wir starten mit den ersten 20.`);
        }

        const tempLevel = 'Wiederholung';
        const tempChapter = `Fehler der letzten ${days} Tage`;

        if (!vocabDataGlobal[tempLevel]) {
            vocabDataGlobal[tempLevel] = {};
        }
        vocabDataGlobal[tempLevel][tempChapter] = reviewBatch; 

        selectedLevel = tempLevel; 
        selectedMainChapter = null; 
        selectedChapter = tempChapter; 
        
        startQuiz('manualInput', reviewBatch, true); 
    }
    
    function startQuiz(quizType, wordsForQuizOverride = null, isGlobalReviewFlag = false) {
        let levelForQuiz = selectedLevel; 
        let chapterForQuiz = selectedChapter; 
        let mainChapterForQuiz = selectedMainChapter; 

        if (isGlobalReviewFlag) {
            mainChapterForQuiz = null; 
        }

        try {
            currentQuizType = quizType;
            isReviewRound = !!wordsForQuizOverride && !isGlobalReviewFlag; 
            const isActuallyGlobalReview = isGlobalReviewFlag; 

            if (!isActuallyGlobalReview && !isReviewRound) { 
                markChapterAsStarted();
            }

            if (wordsForQuizOverride) { 
                if (wordsForQuizOverride.length === 0) {
                    showMessage("Keine Wörter für diese Runde übrig. Gut gemacht!");
                    currentView = isActuallyGlobalReview ? 'home' : 'learnOptions';
                    renderApp();
                    return;
                }
                quizWords = shuffleArray([...wordsForQuizOverride]);
            } else { 
                chapterVocab = mainChapterForQuiz 
                    ? vocabDataGlobal[levelForQuiz]?.[mainChapterForQuiz]?.[chapterForQuiz] 
                    : vocabDataGlobal[levelForQuiz]?.[chapterForQuiz];
                
                if (!Array.isArray(chapterVocab) || chapterVocab.length === 0) {
                    showMessage("Keine Vokabeln für dieses Kapitel vorhanden.");
                    currentView = 'learnOptions';
                    renderApp();
                    return;
                }
                let numVocs = desiredVocabCount > 0 ? Math.min(desiredVocabCount, chapterVocab.length) : chapterVocab.length;
                if (numVocs === 0 && chapterVocab.length > 0) numVocs = chapterVocab.length;
                quizWords = shuffleArray([...chapterVocab]).slice(0, numVocs);
            }
            
            initialQuizWordCount = quizWords.length;
            if (initialQuizWordCount === 0) {
                showMessage("Keine Vokabeln für diese Auswahl oder Runde.");
                currentView = isActuallyGlobalReview ? 'home' : 'learnOptions';
                renderApp();
                return;
            }

            currentQuestionIndex = 0;
            sureCount = 0;
            unsureCount = 0;
            noIdeaCount = 0;
            roundCorrectCount = 0;
            roundIncorrectCount = 0;
            incorrectlyAnsweredWordsGlobal = []; 
            isCardFlipped = false;
            currentView = quizType;
            renderApp();
        } catch (error) {
            console.error(`Error starting quiz type "${quizType}":`, error);
            showMessage("Fehler beim Starten des Quiz: " + error.message);
            currentView = 'learnOptions';
            renderApp();
        }
    }

    function renderProgressBar() {
        const progress = initialQuizWordCount > 0 ? ((currentQuestionIndex +1) / initialQuizWordCount) * 100 : 0;
        return `<div class="mb-3"><div class="flex justify-between mb-1"><span class="text-sm font-medium text-blue-700">Fortschritt</span><span class="text-sm font-medium text-blue-700">${currentQuestionIndex + 1} / ${initialQuizWordCount}</span></div><div class="progress-bar-bg"><div class="progress-fill" style="width: ${progress}%"></div></div></div>`;
    }

    function renderFlashcardsScreen() { 
        if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; } 
        const currentWord = quizWords[currentQuestionIndex]; 
        const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german; 
        const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french; 
        let statsHTML = `<div class="quiz-stats-text text-right mb-2 text-xs"><p class="text-green-600 inline-block mr-2">Sicher: ${sureCount}</p><p class="text-orange-500 inline-block mr-2">Unsicher: ${unsureCount}</p><p class="text-red-500 inline-block">Ahnungslos: ${noIdeaCount}</p></div>`; 
        const questionLangIsFrench = currentQuizDirection === 'frToDe'; 
        const answerLangIsFrench = currentQuizDirection === 'deToFr'; 
        const isGlobalReviewContext = selectedLevel === 'Wiederholung';

        appDiv.innerHTML = ` 
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
                        ${ ((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext) && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                            <button class="btn-secondary py-1 px-2 text-xs rounded mt-3" onclick="toggleExample(this, 'flashcard-example')">Beispiel</button> 
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
        appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); }); 
        function goToNextCardFlash() { currentQuestionIndex++; isCardFlipped = false; renderFlashcardsScreen(); } 
        if (!isCardFlipped) { 
            document.getElementById('flashcard').onclick = () => { isCardFlipped = true; renderFlashcardsScreen(); }; 
        } else { 
            document.getElementById('btnSure').onclick = () => { sureCount++; goToNextCardFlash(); }; 
            document.getElementById('btnUnsure').onclick = () => { unsureCount++; if (!incorrectlyAnsweredWordsGlobal.find(v => v.french === currentWord.french)) incorrectlyAnsweredWordsGlobal.push(currentWord); if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord); goToNextCardFlash(); }; 
            document.getElementById('btnNoIdea').onclick = () => { noIdeaCount++; if (!incorrectlyAnsweredWordsGlobal.find(v => v.french === currentWord.french)) incorrectlyAnsweredWordsGlobal.push(currentWord); if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord); goToNextCardFlash();}; 
        } 
        document.getElementById('quitQuizBtnFlash').onclick = () => { currentView = 'home'; selectedLevel = null; selectedChapter = null; selectedMainChapter = null; renderApp(); }; 
    }

    function renderMultipleChoiceScreen() { 
        if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; } 
        const currentWord = quizWords[currentQuestionIndex]; 
        const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german; 
        const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french; 
        const questionLangIsFrench = currentQuizDirection === 'frToDe'; 
        const isGlobalReviewContext = selectedLevel === 'Wiederholung';

        let vocabSourceForDistractors = chapterVocab; 
        if (isGlobalReviewContext && vocabDataGlobal[selectedLevel] && vocabDataGlobal[selectedLevel][selectedChapter]) {
             vocabSourceForDistractors = vocabDataGlobal[selectedLevel][selectedChapter]; 
        } else if (isReviewRound && incorrectlyAnsweredWordsGlobal.length > 3) { 
            vocabSourceForDistractors = incorrectlyAnsweredWordsGlobal;
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

        appDiv.innerHTML = `
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
                        ${ ((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext) && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                            <button id="mc-example-btn" class="btn-secondary py-1 px-2 text-xs rounded mt-1 hidden" onclick="toggleExample(this, 'mc-example')">Beispiel</button> 
                            <div id="mc-example" class="hidden mt-2 text-sm text-left"></div> 
                        ` : ''} 
                    </div> 
                </div> 
                <div class="mt-auto"> 
                    <button id="nextQuestionBtnMC" class="btn btn-primary mt-6 w-full hidden">Nächste Frage</button> 
                    <button id="quitQuizBtnMC" class="btn btn-neutral mt-2 w-full">Quiz abbrechen</button> 
                </div> 
            </div>`; 
        const nextButton = document.getElementById('nextQuestionBtnMC'); 
        const statsDiv = appDiv.querySelector('.quiz-stats-text'); 
        const mcExampleBtn = document.getElementById('mc-example-btn'); 
        const feedbackP = document.getElementById('feedbackMC');

        appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); }); 
        appDiv.querySelectorAll('.option-btn').forEach(button => { 
            button.onclick = (e) => { 
                appDiv.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = true; }); 
                const selectedAnswer = e.target.textContent; 
                const normalizedUserAnswer = normalizeAnswerGeneral(selectedAnswer); 
                const normalizedCorrectFullAnswer = normalizeAnswerGeneral(answerText); 
                let isCorrect = (normalizedUserAnswer === normalizedCorrectFullAnswer); 
                
                if (isCorrect) { 
                    e.target.classList.add('mc-option-button-correct'); 
                    feedbackP.textContent = "Richtig!"; 
                    feedbackP.className = 'h-6 feedback-text-correct'; 
                    roundCorrectCount++; 
                } else { 
                    e.target.classList.add('mc-option-button-incorrect'); 
                    feedbackP.textContent = `Falsch. Richtig: ${answerText}`; 
                    feedbackP.className = 'h-6 feedback-text-incorrect'; 
                    if (!incorrectlyAnsweredWordsGlobal.find(w => w.french === currentWord.french)) incorrectlyAnsweredWordsGlobal.push(currentWord); 
                    roundIncorrectCount++; 
                    if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord); 
                } 
                if (mcExampleBtn) mcExampleBtn.classList.remove('hidden'); 
                statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${roundCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${roundIncorrectCount}</p>`; 
                nextButton.classList.remove('hidden'); 
                nextButton.focus(); 
            }; 
        }); 
        nextButton.onclick = () => { currentQuestionIndex++; renderMultipleChoiceScreen(); }; 
        document.getElementById('quitQuizBtnMC').onclick = () => { currentView = 'home'; selectedLevel = null; selectedChapter = null; selectedMainChapter = null; renderApp(); }; 
    }

    function renderManualInputScreen() { 
        if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; } 
        const currentWord = quizWords[currentQuestionIndex]; 
        const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german; 
        const answerLangOriginal = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french; 
        const inputLang = currentQuizDirection === 'frToDe' ? 'de' : 'fr'; 
        const specialChars = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ô', 'û', 'ç', 'î', 'ï', 'œ', 'ù']; 
        const questionLangIsFrench = currentQuizDirection === 'frToDe'; 
        const isGlobalReviewContext = selectedLevel === 'Wiederholung';

        appDiv.innerHTML = `
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
                        ${ ((selectedLevel === 'A1' || selectedLevel === 'A2' || isGlobalReviewContext) && currentWord.exampleFrench && currentWord.exampleGerman) ? ` 
                            <button id="manual-example-btn" class="btn-secondary py-1 px-2 text-xs rounded mt-1 hidden" onclick="toggleExample(this, 'manual-example')">Beispiel</button> 
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
        const statsDiv = appDiv.querySelector('.quiz-stats-text'); 

        appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); }); 
        
        if (inputLang === 'fr') { 
            document.getElementById('specialCharsContainer').addEventListener('click', (e) => { 
                if (e.target.classList.contains('special-char-btn')) { 
                    const char = e.target.dataset.char; 
                    answerInput.value += char; 
                    answerInput.focus(); 
                } 
            }); 
        } 
        answerInput.focus(); 
        answerInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitBtn.click(); }); 
        
        submitBtn.onclick = () => { 
            markCorrectBtnManual.classList.add('hidden'); 
            const userAnswerRaw = answerInput.value.trim(); 
            const correctOriginalOptions = answerLangOriginal.split(/[\/;]\s*/); 
            const normalizeFunc = currentQuizDirection === 'frToDe' ? normalizeGermanAnswerForComparison : normalizeAnswerGeneral; 
            const userAnswerNormalized = normalizeFunc(userAnswerRaw); 
            const isCorrect = correctOriginalOptions.some(opt => normalizeFunc(opt) === userAnswerNormalized); 
            
            if (isCorrect) { 
                roundCorrectCount++; 
                feedbackP.textContent = "Richtig!"; 
                feedbackP.className = 'h-6 feedback-text-correct'; 
            } else { 
                roundIncorrectCount++; 
                if (!incorrectlyAnsweredWordsGlobal.find(w => w.french === currentWord.french)) incorrectlyAnsweredWordsGlobal.push(currentWord); 
                feedbackP.textContent = `Falsch. Richtig: ${correctOriginalOptions.join(' / ')}`; 
                feedbackP.className = 'h-6 feedback-text-incorrect'; 
                markCorrectBtnManual.classList.remove('hidden'); 
                if (selectedLevel !== 'Wiederholung') logIncorrectWord(currentWord); 
            } 
            if (manualExampleBtn) manualExampleBtn.classList.remove('hidden'); 
            submitBtn.classList.add('hidden'); 
            nextBtn.classList.remove('hidden'); 
            nextBtn.focus(); 
            answerInput.disabled = true; 
            statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${roundCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${roundIncorrectCount}</p>`; 
        }; 
        
        markCorrectBtnManual.onclick = () => { 
            roundCorrectCount++; 
            roundIncorrectCount--; 
            incorrectlyAnsweredWordsGlobal = incorrectlyAnsweredWordsGlobal.filter(w => w.french !== currentWord.french); 
            feedbackP.textContent = "Als richtig markiert!"; 
            feedbackP.className = 'h-6 feedback-text-correct'; 
            markCorrectBtnManual.classList.add('hidden'); 
            statsDiv.innerHTML = `<p class="text-green-600 inline-block mr-2">Richtig: ${roundCorrectCount}</p><p class="text-red-500 inline-block">Falsch: ${roundIncorrectCount}</p>`; 
        };
        
        nextBtn.onclick = () => { currentQuestionIndex++; renderManualInputScreen(); }; 
        document.getElementById('quitQuizBtnManual').onclick = () => { currentView = 'home'; selectedLevel = null; selectedChapter = null; selectedMainChapter = null; renderApp(); }; 
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
        let reviewOptionsHtml = '';
        const isGlobalReviewContext = selectedLevel === 'Wiederholung'; 
        const wordsForNextReview = [...new Set(incorrectlyAnsweredWordsGlobal)];
        let celebrationAnimationHtml = ''; 

        if (wordsForNextReview.length > 0) {
            reviewOptionsHtml = `
                <p class="text-md text-gray-600 my-4">Du hattest ${wordsForNextReview.length} Fehler. Möchtest du diese wiederholen?</p>
                <button id="startReviewBtn" class="btn btn-primary w-full">Die ${wordsForNextReview.length} Fehler nochmal üben</button>`;
        }

        const allCorrectInThisRound = (currentQuizType === 'flashcards' && sureCount === initialQuizWordCount && sureCount > 0 && unsureCount === 0 && noIdeaCount === 0) ||
                                     ((currentQuizType === 'multipleChoice' || currentQuizType === 'manualInput') && roundCorrectCount === initialQuizWordCount && roundCorrectCount > 0 && roundIncorrectCount === 0);

        const isMainLearningRound = !isReviewRound && !isGlobalReviewContext;

        if (isMainLearningRound) {
            let wordsActuallyLearnedThisSession = (currentQuizType === 'flashcards') ? sureCount : roundCorrectCount;
            if (wordsActuallyLearnedThisSession > 0) {
                completeLearningSession(wordsActuallyLearnedThisSession);
            }
        }
        
        if (isMainLearningRound && allCorrectInThisRound) {
            markChapterAsCompleted();
            celebrationAnimationHtml = createVocabCelebrationAnimationHTML(); 
        }

        let scoreDisplay = `${currentQuizType === 'flashcards' ? sureCount : roundCorrectCount} / ${initialQuizWordCount}`;
        let endScreenTitle = "Runde beendet!";
        if (isGlobalReviewContext) endScreenTitle = "Wiederholung beendet!";
        else if (isReviewRound) endScreenTitle = "Fehlerrunde beendet!";

        let navigationButtonsHtml = '';
        if (isGlobalReviewContext) { 
            navigationButtonsHtml = `
                <button id="backToHomeFromQuizBtn" class="btn btn-secondary w-full">Zurück zur Startseite</button>
            `;
        } else { 
            navigationButtonsHtml = `
                <button id="restartOriginalLessonBtn" class="btn btn-primary w-full">Komplette Lektion wiederholen</button>
                <button id="backToLearnOptionsBtn" class="btn btn-secondary w-full">Zurück zum Lernmodus</button>
                <button id="backToChapterSelectionBtn" class="btn btn-secondary w-full">Zurück zur Kapitelwahl</button>
                <button id="backToHomeFromQuizBtn" class="btn btn-neutral w-full">Zurück zur Startseite</button>
            `;
        }

        appDiv.innerHTML = `
            <div class="card-content w-full max-w-md mx-auto text-center flex-grow flex flex-col justify-center items-center">
                ${celebrationAnimationHtml} 
                <h2 class="text-2xl font-semibold mb-4 text-slate-700">${endScreenTitle}</h2>
                ${isMainLearningRound && allCorrectInThisRound ? '<p class="text-lg font-semibold text-green-600 mb-4">Perfekt! Kapitel abgeschlossen!</p>' : ''}
                ${(isReviewRound || isGlobalReviewContext) && allCorrectInThisRound ? '<p class="text-lg font-semibold text-green-600 mb-4">Alle Fehler korrigiert! Sehr gut!</p>' : ''}
                
                ${currentQuizType === 'flashcards' ? 
                    `<div class="quiz-stats-text text-center mb-4 text-lg">
                        <p class="text-green-600">Sicher: ${sureCount}</p>
                        <p class="text-orange-500">Unsicher: ${unsureCount}</p>
                        <p class="text-red-500">Ahnungslos: ${noIdeaCount}</p>
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

        if (document.getElementById('startReviewBtn')) {
            document.getElementById('startReviewBtn').onclick = () => {
                startQuiz(currentQuizType, wordsForNextReview, isGlobalReviewContext); 
            };
        }
        
        const restartOriginalLessonBtn = document.getElementById('restartOriginalLessonBtn');
        if (restartOriginalLessonBtn) { 
            restartOriginalLessonBtn.onclick = () => {
                startQuiz(currentQuizType, null, false); 
            };
        }
        
        const backToLearnOptionsBtn = document.getElementById('backToLearnOptionsBtn');
        if (backToLearnOptionsBtn) {
            backToLearnOptionsBtn.onclick = () => {
                currentView = 'learnOptions';
                renderApp();
            };
        }

        const backToChapterSelectionBtn = document.getElementById('backToChapterSelectionBtn');
        if (backToChapterSelectionBtn) {
            backToChapterSelectionBtn.onclick = () => {
                currentView = selectedMainChapter ? 'subChapterSelection' : 'levelChapterSelection';
                if (!selectedMainChapter) {
                    selectedChapter = null; 
                }
                renderApp();
            };
        }
        
        const backToHomeFromQuizBtn = document.getElementById('backToHomeFromQuizBtn');
        if (backToHomeFromQuizBtn) {
            backToHomeFromQuizBtn.onclick = () => {
                currentView = 'home';
                selectedLevel = null;
                selectedChapter = null;
                selectedMainChapter = null;
                renderApp();
            };
        }
    }

    // =================================================================================
    // INITIALISIERUNG & SPLASH SCREEN
    // =================================================================================
    function hideSplashScreenAndInit() {
        if(splashTimeoutId) clearTimeout(splashTimeoutId);
        const splash = document.getElementById('splashScreen');
        const appShellContainer = document.querySelector('.app-shell-container');
        if (splash && !splash.classList.contains('hidden')) {
            splash.removeEventListener('click', hideSplashScreenAndInit);
            splash.classList.add('hidden');
            if (appShellContainer) {
                 appShellContainer.style.display = 'flex';
                 setTimeout(() => { appShellContainer.classList.add('visible'); }, 50);
            }
            initializeApp();
        }
    }

    function initializeApp() {
        try {
            if (typeof structuredVocabData !== 'undefined' && structuredVocabData) {
                vocabDataGlobal = structuredVocabData;
            } else {
                if (appDiv) appDiv.innerHTML = "<p class='text-red-500 p-4 text-center'><b>Fataler Fehler:</b> Vokabeldaten nicht gefunden.</p>";
                console.error("Vokabeldaten (structuredVocabData) nicht gefunden!");
                return;
            }
            if (messageOkBtn) messageOkBtn.addEventListener('click', () => messageBox.classList.add('hidden'));
            
            loadVoices(); 
            setTimeout(() => { 
                if(synth && synth.getVoices().length > 0 && frenchVoices.length === 0) {
                    console.log("Erneuter Versuch, Stimmen zu laden nach Verzögerung, da frenchVoices noch leer ist.");
                    loadVoices();
                } else if (synth && synth.getVoices().length === 0) {
                     console.log("Browser hat nach Verzögerung immer noch keine Stimmen geladen. Warte auf onvoiceschanged.");
                }
            }, 750); 

            loadProgress(); 
            renderApp();    
        } catch (error) {
            console.error("Kritischer Fehler während initializeApp:", error);
            if (appDiv) appDiv.innerHTML = `<p class='text-red-500 p-4'>Ein kritischer Fehler ist aufgetreten: ${error.message}.</p>`;
        }
    }
    
    const splash = document.getElementById('splashScreen');
    if (splash && document.querySelector('.app-shell-container')) {
        splash.addEventListener('click', hideSplashScreenAndInit);
        splashTimeoutId = setTimeout(hideSplashScreenAndInit, 2000); 
    } else {
        console.warn("Splash-Screen-Elemente nicht gefunden, initialisiere App direkt.");
        initializeApp();
    }
});
