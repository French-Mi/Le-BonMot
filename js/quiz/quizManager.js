// js/quiz/quizManager.js
import { state, setState } from '../state.js';
import { shuffleArray } from '../utils/helpers.js';
import { showMessage, renderApp } from '../ui/views.js';
import { markChapterAsStarted } from '../services/progressService.js';

export function startGlobalReview(days) {
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - days));
    const recentErrors = state.incorrectWordsHistory.filter(entry => new Date(entry.timestamp) >= cutoffDate);
    
    if (recentErrors.length === 0) {
        showMessage(`Keine Fehler in den letzten ${days} ${days > 1 ? 'Tagen' : 'Tag'} gefunden. Super!`);
        return;
    }
    
    const uniqueWordsMap = new Map();
    recentErrors.forEach(entry => {
        uniqueWordsMap.set(entry.french, { french: entry.french, german: entry.german, exampleFrench: entry.exampleFrench, exampleGerman: entry.exampleGerman });
    });
    
    const wordsToReview = Array.from(uniqueWordsMap.values());
    let reviewBatch = shuffleArray(wordsToReview);
    if (reviewBatch.length > 20) {
        reviewBatch = reviewBatch.slice(0, 20);
        showMessage(`Du hast viele Fehler zu wiederholen. Wir starten mit den ersten 20.`);
    }

    const tempLevel = 'Wiederholung';
    const tempChapter = `Fehler der letzten ${days} Tage`;

    if (!state.vocabDataGlobal[tempLevel]) {
        state.vocabDataGlobal[tempLevel] = {};
    }
    state.vocabDataGlobal[tempLevel][tempChapter] = reviewBatch;

    setState({
        selectedLevel: tempLevel,
        selectedMainChapter: null,
        selectedChapter: tempChapter
    });
    
    startQuiz('manualInput', reviewBatch, true);
}

export function startQuiz(quizType, wordsForQuizOverride = null, isGlobalReviewFlag = false) {
    let { selectedLevel, selectedChapter, selectedMainChapter, vocabDataGlobal, desiredVocabCount } = state;
    
    if (isGlobalReviewFlag) {
        selectedMainChapter = null;
    }

    try {
        const isReviewRound = !!wordsForQuizOverride && !isGlobalReviewFlag;
        if (!isGlobalReviewFlag && !isReviewRound) {
            markChapterAsStarted();
        }

        let wordsForQuiz = [];
        if (wordsForQuizOverride) {
            if (wordsForQuizOverride.length === 0) {
                showMessage("Keine Wörter für diese Runde übrig. Gut gemacht!");
                setState({ currentView: isGlobalReviewFlag ? 'home' : 'learnOptions' });
                renderApp();
                return;
            }
            wordsForQuiz = shuffleArray([...wordsForQuizOverride]);
        } else {
            // HIER WAR DER FEHLER: `chapterForQuiz` wurde durch `selectedChapter` ersetzt.
            const chapterVocab = selectedMainChapter
                ? vocabDataGlobal[selectedLevel]?.[selectedMainChapter]?.[selectedChapter]
                : vocabDataGlobal[selectedLevel]?.[selectedChapter];

            if (!Array.isArray(chapterVocab) || chapterVocab.length === 0) {
                showMessage("Keine Vokabeln für dieses Kapitel vorhanden.");
                setState({ currentView: 'learnOptions' });
                renderApp();
                return;
            }
            let numVocs = desiredVocabCount > 0 ? Math.min(desiredVocabCount, chapterVocab.length) : chapterVocab.length;
            if (numVocs === 0 && chapterVocab.length > 0) numVocs = chapterVocab.length;
            wordsForQuiz = shuffleArray([...chapterVocab]).slice(0, numVocs);
            setState({ chapterVocab }); // Speichere das vollständige Kapitelvokabular für die Ablenker im MC-Quiz
        }

        if (wordsForQuiz.length === 0) {
            showMessage("Keine Vokabeln für diese Auswahl oder Runde.");
            setState({ currentView: isGlobalReviewFlag ? 'home' : 'learnOptions' });
            renderApp();
            return;
        }

        // Reset state for new quiz
        setState({
            currentQuizType: quizType,
            isReviewRound: isReviewRound,
            quizWords: wordsForQuiz,
            initialQuizWordCount: wordsForQuiz.length,
            currentQuestionIndex: 0,
            sureCount: 0,
            unsureCount: 0,
            noIdeaCount: 0,
            roundCorrectCount: 0,
            roundIncorrectCount: 0,
            incorrectlyAnsweredWordsGlobal: [],
            isCardFlipped: false,
            currentView: quizType
        });

        renderApp();
    } catch (error) {
        console.error(`Error starting quiz type "${quizType}":`, error);
        showMessage("Fehler beim Starten des Quiz: " + error.message);
        setState({ currentView: 'learnOptions' });
        renderApp();
    }
}
