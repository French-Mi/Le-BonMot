// js/state.js

export let state = {
    // Ansichten und Auswahl
    currentView: 'home',
    selectedLevel: null,
    selectedChapter: null,
    selectedMainChapter: null,
    
    // Globale Daten
    vocabDataGlobal: null,
    
    // Quiz-spezifischer Zustand
    chapterVocab: [],
    quizWords: [],
    currentQuestionIndex: 0,
    
    // Zähler und Statistiken
    sureCount: 0,
    unsureCount: 0,
    noIdeaCount: 0,
    roundCorrectCount: 0,
    roundIncorrectCount: 0,
    
    // Fehlerverfolgung
    incorrectlyAnsweredWordsGlobal: [],
    
    // Quiz-Konfiguration
    currentQuizDirection: 'frToDe',
    currentQuizType: '',
    isReviewRound: false,
    desiredVocabCount: 0,
    initialQuizWordCount: 0,
    isCardFlipped: false,

    // Lernfortschritt
    learningProgress: {
        completedChapters: {},
        startedChapters: {},
        streak: { current: 0, lastLearnedDate: null },
        weeklyStats: {}
    },
    incorrectWordsHistory: [],
};

// Funktion zum sicheren Setzen des Zustands
export function setState(newState) {
    state = { ...state, ...newState };
}