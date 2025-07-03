import { defineStore } from 'pinia';
import { allVocabData } from '@/data/index.js';
import { achievements } from '@/data/achievements.js';
import { appRewards } from '@/data/rewards.js';
import { getWeekNumber } from '@/utils/helpers.js';
import { useProgressStore } from './progressStore';
import { useUserProfileStore } from './userProfileStore';

export const useAppStore = defineStore('app', {
  state: () => ({
    selectedLevel: null,
    selectedChapter: null,
    selectedMainChapter: null,
    vocabDataGlobal: allVocabData,
    quizWords: [],
    currentQuestionIndex: 0,
    roundCorrectCount: 0,
    roundIncorrectCount: 0,
    sureCount: 0,
    unsureCount: 0,
    noIdeaCount: 0,
    currentQuizType: '',
    currentQuizDirection: 'frToDe',
    isReviewRound: false,
    initialQuizWordCount: 0,
    incorrectlyAnsweredWordsGlobal: [],
    notification: { show: false, title: '', description: '', icon: '' },
    incorrectWordsHistory: [],
    searchQuery: '',
    searchResults: [],
    searchPerformed: false,
  }),

  getters: {
    levelNames: (state) => Object.keys(state.vocabDataGlobal),
    currentWord: (state) => state.quizWords[state.currentQuestionIndex] || null,
    isQuizFinished: (state) => state.currentQuestionIndex >= state.initialQuizWordCount && state.initialQuizWordCount > 0,
    isChapterCompleted: () => (level, chapter, mainChapter = null) => {
      const progressStore = useProgressStore();
      const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
      return progressStore.completedChapters[level]?.includes(chapterKey) || false;
    },
    isChapterStarted: () => (level, chapter, mainChapter = null) => {
      const progressStore = useProgressStore();
      const chapterKey = mainChapter ? `${mainChapter} - ${chapter}` : chapter;
      if (progressStore.completedChapters[level]?.includes(chapterKey)) return false;
      return progressStore.startedChapters[level]?.includes(chapterKey) || false;
    },
  },

  actions: {
    selectLevel(level) { this.selectedLevel = level; },
    selectChapter(chapter) { this.selectedChapter = chapter; },
    selectMainChapter(mainChapter) { this.selectedMainChapter = mainChapter; },
    setQuizDirection(direction) { this.currentQuizDirection = direction; },

    startGlobalReview(days) {
      const errorHistory = JSON.parse(localStorage.getItem('leBonMotIncorrectWords') || '[]');
      const now = new Date();
      const cutoffDate = new Date(now.setDate(now.getDate() - days));
      const recentErrors = errorHistory.filter(entry => new Date(entry.timestamp) >= cutoffDate);
      if (recentErrors.length === 0) {
        this.showNotification({ title: 'Super!', description: `Keine Fehler in den letzten ${days} ${days > 1 ? 'Tagen' : 'Tag'} gefunden.`, icon: 'bi bi-check-circle-fill' });
        return false;
      }
      const uniqueWordsMap = new Map();
      recentErrors.forEach(entry => { uniqueWordsMap.set(entry.french, entry); });
      const wordsToReview = Array.from(uniqueWordsMap.values());
      return this.startQuiz('manualInput', { words: wordsToReview });
    },

    quitQuiz() {
      this.selectedLevel = null;
      this.selectedChapter = null;
      this.selectedMainChapter = null;
      this.quizWords = [];
      this.currentQuestionIndex = 0;
      this.initialQuizWordCount = 0;
    },

    startQuiz(quizType, options = {}) {
        if(!options.words) this.markChapterAsStarted();
        let wordsForQuiz = [];
        const isReview = Array.isArray(options.words);
        if (isReview) {
            wordsForQuiz = [...options.words].sort(() => 0.5 - Math.random());
        } else {
            let chapterVocab = this.selectedMainChapter ? this.vocabDataGlobal[this.selectedLevel][this.selectedMainChapter][this.selectedChapter] : this.vocabDataGlobal[this.selectedLevel][this.selectedChapter];
            if (!Array.isArray(chapterVocab) || chapterVocab.length === 0) return false;
            const vocabCount = options.vocabCount || 0;
            const numVocs = vocabCount > 0 ? Math.min(vocabCount, chapterVocab.length) : chapterVocab.length;
            wordsForQuiz = [...chapterVocab].sort(() => 0.5 - Math.random()).slice(0, numVocs);
        }
        if (wordsForQuiz.length === 0) return false;
        this.$patch({ quizWords: wordsForQuiz, currentQuizType: quizType, initialQuizWordCount: wordsForQuiz.length, isReviewRound: isReview, currentQuestionIndex: 0, roundCorrectCount: 0, roundIncorrectCount: 0, sureCount: 0, unsureCount: 0, noIdeaCount: 0, incorrectlyAnsweredWordsGlobal: [] });
        this.checkAndAwardAchievements('QUIZ_START');
        return true;
    },

    logIncorrectWord(word) {
      if (!word || !word.french) return;
      const incorrectWords = JSON.parse(localStorage.getItem('leBonMotIncorrectWords') || '[]');
      incorrectWords.push({ ...word, timestamp: new Date().toISOString() });
      localStorage.setItem('leBonMotIncorrectWords', JSON.stringify(incorrectWords));
    },

    nextQuestion() { if (!this.isQuizFinished) this.currentQuestionIndex++; },

    handleFlashcardFeedback(feedback) {
        if (feedback === 'sure') { this.sureCount++; } else {
            if (feedback === 'unsure') this.unsureCount++;
            if (feedback === 'noIdea') this.noIdeaCount++;
            if (!this.incorrectlyAnsweredWordsGlobal.some((v) => v.french === this.currentWord.french)) {
                this.incorrectlyAnsweredWordsGlobal.push(this.currentWord);
                this.logIncorrectWord(this.currentWord);
            }
        }
        this.nextQuestion();
    },

    submitAnswer(userAnswer) {
      const normalizeFunc = (answer) => String(answer).toLowerCase().trim().replace(/[`´’']/g, "'").replace(/[.,/#!$%^&*;:{}=\-_`~()"?¡¿!]/g, '').replace(/\s+/g, ' ').trim();
      const correctOptions = (this.currentQuizDirection === 'frToDe' ? this.currentWord.german : this.currentWord.french).split(/[;/]\s*/);
      const isCorrect = correctOptions.some((opt) => normalizeFunc(opt) === normalizeFunc(userAnswer));
      if (isCorrect) {
        this.roundCorrectCount++;
      } else {
        this.roundIncorrectCount++;
        if (!this.incorrectlyAnsweredWordsGlobal.some((v) => v.french === this.currentWord.french)) {
          this.incorrectlyAnsweredWordsGlobal.push(this.currentWord);
          this.logIncorrectWord(this.currentWord);
        }
      }
      return isCorrect;
    },

    overrideAsCorrect() {
        this.roundCorrectCount++;
        this.roundIncorrectCount--;
        this.incorrectlyAnsweredWordsGlobal.pop();
    },

    completeLearningSession() {
        const progressStore = useProgressStore();
        const correctlyLearnedCount = this.currentQuizType === 'flashcards' ? this.sureCount : this.roundCorrectCount;
        if (correctlyLearnedCount === 0 && !this.isReviewRound) return;
        const today = new Date(), todayString = today.toDateString();
        if (progressStore.streak.lastLearnedDate !== todayString) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            progressStore.streak.current = progressStore.streak.lastLearnedDate === yesterday.toDateString() ? progressStore.streak.current + 1 : 1;
            progressStore.streak.lastLearnedDate = todayString;
        }
        progressStore.totalXp += correctlyLearnedCount;
        const weekKey = getWeekNumber(today);
        if (!progressStore.weeklyStats[weekKey]) progressStore.weeklyStats[weekKey] = 0;
        progressStore.weeklyStats[weekKey] += correctlyLearnedCount;
        const year = today.getFullYear(), month = String(today.getMonth() + 1).padStart(2, '0'), day = String(today.getDate()).padStart(2, '0'), todayKey = `${year}-${month}-${day}`;
        if (!progressStore.dailyVocabCount[todayKey]) progressStore.dailyVocabCount[todayKey] = 0;
        progressStore.dailyVocabCount[todayKey] += correctlyLearnedCount;
        progressStore.saveProgress();
        this.checkAndAwardAchievements('SESSION_END');
        this.checkAndUnlockRewards();
    },

    markChapterAsStarted() {
        const progressStore = useProgressStore();
        const chapterKey = this.selectedMainChapter ? `${this.selectedMainChapter} - ${this.selectedChapter}` : this.selectedChapter;
        if (!this.selectedLevel || !chapterKey) return;
        if (!progressStore.startedChapters[this.selectedLevel]) progressStore.startedChapters[this.selectedLevel] = [];
        const isAlreadyCompleted = progressStore.completedChapters[this.selectedLevel]?.includes(chapterKey);
        const isAlreadyStarted = progressStore.startedChapters[this.selectedLevel].includes(chapterKey);
        if (!isAlreadyCompleted && !isAlreadyStarted) {
            progressStore.startedChapters[this.selectedLevel].push(chapterKey);
            progressStore.saveProgress();
        }
    },

    markChapterAsCompleted() {
        const progressStore = useProgressStore();
        const chapterKey = this.selectedMainChapter ? `${this.selectedMainChapter} - ${this.selectedChapter}` : this.selectedChapter;
        if (!this.selectedLevel || !chapterKey) return;
        if (!progressStore.completedChapters[this.selectedLevel]) progressStore.completedChapters[this.selectedLevel] = [];
        if (!progressStore.completedChapters[this.selectedLevel].includes(chapterKey)) {
          progressStore.completedChapters[this.selectedLevel].push(chapterKey);
        }
        if (progressStore.startedChapters[this.selectedLevel]) {
            const index = progressStore.startedChapters[this.selectedLevel].indexOf(chapterKey);
            if (index > -1) progressStore.startedChapters[this.selectedLevel].splice(index, 1);
        }
        progressStore.saveProgress();
        this.checkAndAwardAchievements('CHAPTER_COMPLETE');
    },

    showNotification(notification) {
        this.notification = { ...notification, show: true };
        setTimeout(() => {
            this.notification.show = false;
        }, 5000);
    },

    checkAndAwardAchievements(eventType) {
      const progressStore = useProgressStore();
      const newAchievements = [];
      for (const achievement of Object.values(achievements)) {
          if (progressStore.unlockedAchievements.includes(achievement.id)) continue;
          let unlocked = false;
          switch (achievement.id) {
              case 'DAILY_ROUTINE':       if (eventType === 'SESSION_END' && progressStore.streak.current >= 3) unlocked = true; break;
              case 'WEEKLY_CHAMPION':     if (eventType === 'SESSION_END' && progressStore.streak.current >= 7) unlocked = true; break;
              case 'PERSEVERANCE':        if (eventType === 'SESSION_END' && progressStore.streak.current >= 14) unlocked = true; break;
              case 'MONTHLY_MASTER':      if (eventType === 'SESSION_END' && progressStore.streak.current >= 30) unlocked = true; break;
              case 'VOCAB_COLLECTOR':     if (eventType === 'SESSION_END' && progressStore.totalXp >= 100) unlocked = true; break;
              case 'VOCAB_VIRTUOSO':      if (eventType === 'SESSION_END' && progressStore.totalXp >= 500) unlocked = true; break;
              case 'LEXICON_LEGEND':      if (eventType === 'SESSION_END' && progressStore.totalXp >= 1000) unlocked = true; break;
              case 'ERROR_CONQUEROR':     if (eventType === 'SESSION_END' && this.isReviewRound && this.incorrectlyAnsweredWordsGlobal.length === 0) unlocked = true; break;
              case 'LEARNING_MARATHON':   if (eventType === 'QUIZ_START' && !this.isReviewRound && this.initialQuizWordCount > 50) unlocked = true; break;
              case 'CHAPTER_GURU':        if (eventType === 'CHAPTER_COMPLETE' && Object.values(progressStore.completedChapters).flat().length >= 5) unlocked = true; break;
              case 'METHOD_MIXER':
                  if (eventType === 'QUIZ_START') {
                      const today = new Date().toDateString();
                      if (progressStore.dailyStats.date !== today) {
                          progressStore.dailyStats = { date: today, modesUsed: [] };
                      }
                      if (!progressStore.dailyStats.modesUsed.includes(this.currentQuizType)) {
                          progressStore.dailyStats.modesUsed.push(this.currentQuizType);
                      }
                      if (['flashcards', 'multipleChoice', 'manualInput'].every(mode => progressStore.dailyStats.modesUsed.includes(mode))) {
                          unlocked = true;
                      }
                  }
                  break;
              case 'LEVEL_MASTER':
                  if (eventType === 'CHAPTER_COMPLETE' && this.selectedLevel) {
                      const levelData = this.vocabDataGlobal[this.selectedLevel];
                      if (levelData) {
                          const totalChaptersInLevel = Object.keys(levelData).reduce((acc, mainChapterKey) => {
                              const mainChapter = levelData[mainChapterKey];
                              return acc + (Array.isArray(mainChapter) ? 1 : (typeof mainChapter === 'object' ? Object.keys(mainChapter).length : 0));
                          }, 0);
                          const completedChaptersInLevel = progressStore.completedChapters[this.selectedLevel]?.length || 0;
                          if (completedChaptersInLevel >= totalChaptersInLevel && totalChaptersInLevel > 0) {
                              unlocked = true;
                          }
                      }
                  }
                  break;
          }
          if (unlocked) {
              progressStore.unlockedAchievements.push(achievement.id);
              newAchievements.push(achievement);
          }
      }
      newAchievements.forEach(ach => this.showNotification(ach));
      if (newAchievements.length > 0) progressStore.saveProgress();
    },

    checkAndUnlockRewards() {
      const progressStore = useProgressStore();
      const userProfileStore = useUserProfileStore();
      const currentLevel = progressStore.level;

      appRewards.forEach(reward => {
        const isUnlocked = userProfileStore.unlockedAvatars.includes(reward.value);
        if (!isUnlocked && currentLevel >= reward.requiredLevels) {
          userProfileStore.unlockReward(reward);
          this.showNotification({
            title: 'Belohnung freigeschaltet!',
            description: `Neuer Avatar: ${reward.name}`,
            icon: 'bi bi-award-fill'
          });
        }
      });
    },

    performSearch(query) {
      this.searchQuery = query;
      this.searchPerformed = true;
      this.searchResults = [];
      if (!query || query.trim().length < 2) { return; }
      const lowerCaseQuery = query.toLowerCase();
      const results = [];
      for (const levelName in this.vocabDataGlobal) {
        for (const chapterName in this.vocabDataGlobal[levelName]) {
          const chapterData = this.vocabDataGlobal[levelName][chapterName];
          if (typeof chapterData === 'object' && !Array.isArray(chapterData)) {
            for (const subChapterName in chapterData) {
              const subChapterVocab = chapterData[subChapterName];
              if (Array.isArray(subChapterVocab)) {
                subChapterVocab.forEach(vocab => {
                  if (vocab && typeof vocab.french === 'string' && typeof vocab.german === 'string') {
                    if (vocab.french.toLowerCase().includes(lowerCaseQuery) || vocab.german.toLowerCase().includes(lowerCaseQuery)) {
                      results.push({ ...vocab, context: `${levelName} > ${chapterName} > ${subChapterName}` });
                    }
                  }
                });
              }
            }
          } else if (Array.isArray(chapterData)) {
            chapterData.forEach(vocab => {
              if (vocab && typeof vocab.french === 'string' && typeof vocab.german === 'string') {
                if (vocab.french.toLowerCase().includes(lowerCaseQuery) || vocab.german.toLowerCase().includes(lowerCaseQuery)) {
                  results.push({ ...vocab, context: `${levelName} > ${chapterName}` });
                }
              }
            });
          }
        }
      }
      this.searchResults = results;
    },
    clearSearch() {
      this.searchQuery = '';
      this.searchResults = [];
      this.searchPerformed = false;
    }
  }
});
