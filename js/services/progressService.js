// js/services/progressService.js
import { state, setState } from '../state.js';
import { getWeekNumber } from '../utils/helpers.js';

function saveProgress() {
    try {
        localStorage.setItem('leBonMotProgress', JSON.stringify(state.learningProgress));
    } catch (e) {
        console.error("Error saving progress:", e);
    }
}

function saveIncorrectWordsHistory() {
    try {
        localStorage.setItem('leBonMotIncorrectWords', JSON.stringify(state.incorrectWordsHistory));
    } catch (e) {
        console.error("Error saving incorrect words history:", e);
    }
}

export function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('leBonMotProgress');
        if (savedProgress) {
            const parsedProgress = JSON.parse(savedProgress);
            // Sicherstellen, dass alle erwarteten Eigenschaften vorhanden sind
            setState({
                learningProgress: {
                    completedChapters: parsedProgress.completedChapters || {},
                    startedChapters: parsedProgress.startedChapters || {},
                    streak: parsedProgress.streak || { current: 0, lastLearnedDate: null },
                    weeklyStats: parsedProgress.weeklyStats || {}
                }
            });
        }
        const savedIncorrectWords = localStorage.getItem('leBonMotIncorrectWords');
        if (savedIncorrectWords) {
            setState({ incorrectWordsHistory: JSON.parse(savedIncorrectWords) });
        }
    } catch (e) {
        console.error("Error loading progress:", e);
        // Reset zu einem sauberen Zustand bei Fehler
        setState({ 
            learningProgress: { completedChapters: {}, startedChapters: {}, streak: { current: 0, lastLearnedDate: null }, weeklyStats: {} },
            incorrectWordsHistory: [] 
        });
        saveProgress();
        saveIncorrectWordsHistory();
    }
    updateStreak();
}

export function updateStreak() {
    const today = (new Date()).toDateString();
    const lastLearned = state.learningProgress.streak.lastLearnedDate;

    if (lastLearned) {
        const diffDays = ((new Date(today)) - (new Date(lastLearned))) / (1000 * 60 * 60 * 24);
        if (diffDays > 1) {
            state.learningProgress.streak.current = 0;
        }
    }
    saveProgress();
}

export function logIncorrectWord(wordObject) {
    if (!wordObject || !wordObject.french) return;
    const newErrorEntry = { ...wordObject, timestamp: new Date().toISOString() };
    state.incorrectWordsHistory.push(newErrorEntry);
    saveIncorrectWordsHistory();
}

export function markChapterAsStarted() {
    const { selectedLevel, selectedChapter, selectedMainChapter } = state;
    const chapterKey = selectedMainChapter ? `${selectedMainChapter} - ${selectedChapter}` : selectedChapter;
    if (!selectedLevel || !chapterKey) return;
    if (!state.learningProgress.startedChapters[selectedLevel]) {
        state.learningProgress.startedChapters[selectedLevel] = [];
    }
    if (!isChapterCompleted(selectedLevel, selectedChapter, selectedMainChapter) && !state.learningProgress.startedChapters[selectedLevel].includes(chapterKey)) {
        state.learningProgress.startedChapters[selectedLevel].push(chapterKey);
        saveProgress();
    }
}

export function isChapterStarted(level, chapter, mainChapter = null) {
    const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
    return state.learningProgress.startedChapters[level]?.includes(chapterKey) && !isChapterCompleted(level, chapter, mainChapter);
}

export function markChapterAsCompleted() {
    const { selectedLevel, selectedChapter, selectedMainChapter } = state;
    const chapterKey = selectedMainChapter ? `${selectedMainChapter} - ${selectedChapter}` : selectedChapter;
    if (!selectedLevel || !chapterKey) return;
    if (!state.learningProgress.completedChapters[selectedLevel]) {
        state.learningProgress.completedChapters[selectedLevel] = [];
    }
    if (!state.learningProgress.completedChapters[selectedLevel].includes(chapterKey)) {
        state.learningProgress.completedChapters[selectedLevel].push(chapterKey);
    }
    if (state.learningProgress.startedChapters[selectedLevel]) {
        const index = state.learningProgress.startedChapters[selectedLevel].indexOf(chapterKey);
        if (index > -1) {
            state.learningProgress.startedChapters[selectedLevel].splice(index, 1);
        }
    }
    saveProgress();
}

export function isChapterCompleted(level, chapter, mainChapter = null) {
    const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
    return state.learningProgress.completedChapters[level]?.includes(chapterKey) || false;
}

export function completeLearningSession(wordsLearnedInQuiz) {
    const today = (new Date()).toDateString();
    const lastLearned = state.learningProgress.streak.lastLearnedDate;

    if (lastLearned === today) {
        // Schon gelernt heute
    } else if (lastLearned && ((new Date(today)) - (new Date(lastLearned))) / (1000 * 60 * 60 * 24) === 1) {
        state.learningProgress.streak.current += 1;
    } else {
        state.learningProgress.streak.current = 1;
    }
    state.learningProgress.streak.lastLearnedDate = today;

    const weekKey = getWeekNumber(new Date());
    if (!state.learningProgress.weeklyStats[weekKey]) {
        state.learningProgress.weeklyStats[weekKey] = 0;
    }
    state.learningProgress.weeklyStats[weekKey] += wordsLearnedInQuiz;
    saveProgress();
}