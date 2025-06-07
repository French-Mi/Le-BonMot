// js/services/progressService.js
import { state, setState } from '../state.js';
import { getWeekNumber } from '../utils/helpers.js';
import { addXp } from './levelingService.js';
import { achievements } from '../data/achievements.js';
// KORREKTUR: Importiert jetzt direkt aus 'notifications.js' statt 'views.js'
import { showAchievementToast } from '../ui/notifications.js';

// --- HILFSFUNKTIONEN ---

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

// --- AUSZEICHNUNGEN ---

/**
 * Überprüft, ob eine Auszeichnung bereits freigeschaltet wurde.
 * @param {string} achievementId Die ID der Auszeichnung.
 * @returns {boolean}
 */
function hasAchievement(achievementId) {
    return state.learningProgress.achievements.includes(achievementId);
}

/**
 * Fügt eine neue Auszeichnung zum Profil hinzu und zeigt eine Benachrichtigung an.
 * @param {string} achievementId Die ID der Auszeichnung.
 */
function awardAchievement(achievementId) {
    if (!hasAchievement(achievementId)) {
        const newAchievements = [...state.learningProgress.achievements, achievementId];
        setState({ learningProgress: { achievements: newAchievements } });
        saveProgress();
        showAchievementToast(achievements[achievementId]);
    }
}

/**
 * Überprüft und vergibt Auszeichnungen basierend auf dem aktuellen Zustand.
 * @param {'SESSION_END' | 'CHAPTER_COMPLETE' | 'REVIEW_COMPLETE' | 'MODE_USED'} trigger Der Auslöser für die Überprüfung.
 */
export function checkAndAwardAchievements(trigger) {
    const { learningProgress, vocabDataGlobal, selectedLevel } = state;

    // Trigger: Nach jeder Lernsitzung
    if (trigger === 'SESSION_END') {
        // Streak-Auszeichnungen
        if (learningProgress.streak.current >= 3) awardAchievement('DAILY_ROUTINE');
        if (learningProgress.streak.current >= 7) awardAchievement('WEEKLY_CHAMPION');
        if (learningProgress.streak.current >= 14) awardAchievement('PERSEVERANCE');
        if (learningProgress.streak.current >= 30) awardAchievement('MONTHLY_MASTER');

        // XP-Auszeichnungen
        if (learningProgress.totalXp >= 100) awardAchievement('VOCAB_COLLECTOR');
        if (learningProgress.totalXp >= 500) awardAchievement('VOCAB_VIRTUOSO');
        if (learningProgress.totalXp >= 1000) awardAchievement('LEXICON_LEGEND');

        // Marathon-Auszeichnung
        if (state.initialQuizWordCount > 50) awardAchievement('LEARNING_MARATHON');
    }

    // Trigger: Nach Abschluss eines Kapitels
    if (trigger === 'CHAPTER_COMPLETE') {
        const totalCompleted = Object.values(learningProgress.completedChapters).flat().length;
        if (totalCompleted >= 5) awardAchievement('CHAPTER_GURU');

        // Niveau-Meister
        const chaptersInLevel = Object.keys(vocabDataGlobal[selectedLevel] || {});
        const completedInLevel = learningProgress.completedChapters[selectedLevel] || [];
        if (chaptersInLevel.length > 0 && chaptersInLevel.every(chap => completedInLevel.includes(chap))) {
            awardAchievement('LEVEL_MASTER');
        }
    }
    
    // Trigger: Nach erfolgreicher Fehler-Wiederholung
    if(trigger === 'REVIEW_COMPLETE') {
        awardAchievement('ERROR_CONQUEROR');
    }

    // Trigger: Nach Nutzung eines Lernmodus
    if (trigger === 'MODE_USED') {
        const today = new Date().toDateString();
        // Reset, wenn ein neuer Tag beginnt
        if (learningProgress.dailyStats.date !== today) {
            learningProgress.dailyStats.date = today;
            learningProgress.dailyStats.modesUsed = [];
        }
        // Füge den aktuellen Modus hinzu, falls noch nicht vorhanden
        if (!learningProgress.dailyStats.modesUsed.includes(state.currentQuizType)) {
            learningProgress.dailyStats.modesUsed.push(state.currentQuizType);
        }
        // Überprüfe, ob alle 3 Modi genutzt wurden
        if (learningProgress.dailyStats.modesUsed.length >= 3) {
            awardAchievement('METHOD_MIXER');
        }
        saveProgress();
    }
}

// --- FORTSCHRITTSMANAGEMENT (Laden, Speichern, etc.) ---

export function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('leBonMotProgress');
        if (savedProgress) {
            const p = JSON.parse(savedProgress);
            setState({
                learningProgress: {
                    completedChapters: p.completedChapters || {},
                    startedChapters: p.startedChapters || {},
                    streak: p.streak || { current: 0, lastLearnedDate: null },
                    weeklyStats: p.weeklyStats || {},
                    totalXp: p.totalXp || 0,
                    achievements: p.achievements || [],
                    consecutivePerfectChapters: p.consecutivePerfectChapters || 0,
                    dailyStats: p.dailyStats || { date: null, modesUsed: [] },
                    hasCompletedFirstLesson: p.hasCompletedFirstLesson || false,
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
            learningProgress: {
                completedChapters: {}, startedChapters: {}, streak: { current: 0, lastLearnedDate: null },
                weeklyStats: {}, totalXp: 0, achievements: [], consecutivePerfectChapters: 0,
                dailyStats: { date: null, modesUsed: [] }, hasCompletedFirstLesson: false,
            },
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
            // Perfekte-Serie bei unterbrochenem Streak zurücksetzen
            setState({ learningProgress: { consecutivePerfectChapters: 0 }});
        }
    }
    saveProgress();
}

export function completeLearningSession(wordsLearnedInQuiz) {
    const today = (new Date()).toDateString();
    const lastLearned = state.learningProgress.streak.lastLearnedDate;

    if (lastLearned !== today) {
        if (lastLearned && ((new Date(today)) - (new Date(lastLearned))) / (1000 * 60 * 60 * 24) === 1) {
            state.learningProgress.streak.current += 1;
        } else {
            state.learningProgress.streak.current = 1;
        }
        state.learningProgress.streak.lastLearnedDate = today;
    }

    const weekKey = getWeekNumber(new Date());
    if (!state.learningProgress.weeklyStats[weekKey]) {
        state.learningProgress.weeklyStats[weekKey] = 0;
    }
    state.learningProgress.weeklyStats[weekKey] += wordsLearnedInQuiz;

    const newTotalXp = addXp(state.learningProgress.totalXp, wordsLearnedInQuiz);
    setState({ learningProgress: { totalXp: newTotalXp } });
    
    checkAndAwardAchievements('SESSION_END');
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
    
    checkAndAwardAchievements('CHAPTER_COMPLETE');
    saveProgress();
}

export function isChapterCompleted(level, chapter, mainChapter = null) {
    const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
    return state.learningProgress.completedChapters[level]?.includes(chapterKey) || false;
}