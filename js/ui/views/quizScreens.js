// js/ui/views/quizScreens.js
import { state, setState } from '../../state.js';
import { DOM } from '../domElements.js';
import { showMessage } from '../notifications.js';
import { renderApp } from '../renderer.js';
import { speakFrench } from '../../services/speechService.js';
import { shuffleArray, normalizeAnswerGeneral, normalizeGermanAnswerForComparison } from '../../utils/helpers.js';
import { startQuiz } from '../../quiz/quizManager.js';
import { logIncorrectWord, completeLearningSession, markChapterAsCompleted, checkAndAwardAchievements } from '../../services/progressService.js';
import { renderProgressBar, createVocabCelebrationAnimationHTML, toggleExample } from './commonComponents.js';

export function renderFlashcardsScreen() {
    const { quizWords, currentQuestionIndex, initialQuizWordCount, isCardFlipped } = state;
    if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; }

    const { sureCount, unsureCount, noIdeaCount, currentQuizDirection, selectedLevel, isReviewRound } = state;
    const currentWord = quizWords[currentQuestionIndex];
    const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german;
    const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french;
    const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;
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

export function renderMultipleChoiceScreen() {
    const { quizWords, currentQuestionIndex, initialQuizWordCount } = state;
    if (currentQuestionIndex >= initialQuizWordCount) { renderQuizEndScreen(); return; }

    const { roundCorrectCount, roundIncorrectCount, currentQuizDirection, selectedLevel, isReviewRound, chapterVocab, vocabDataGlobal, selectedChapter } = state;
    const currentWord = quizWords[currentQuestionIndex];
    const questionText = currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german;
    const answerText = currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french;
    const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;
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

export function renderManualInputScreen() {
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

export function renderQuizEndScreen() {
    const { currentQuizType, sureCount, roundCorrectCount, initialQuizWordCount, isReviewRound, roundIncorrectCount, learningProgress } = state;
    const { selectedLevel, incorrectlyAnsweredWordsGlobal } = state;
    
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