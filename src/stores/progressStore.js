import { defineStore } from 'pinia';
import { achievements } from '@/data/achievements.js';

export const useProgressStore = defineStore('progress', {
  state: () => ({
    totalXp: 0,
    streak: { current: 0, lastLearnedDate: null },
    unlockedAchievements: [],
    completedChapters: {},
    startedChapters: {},
    dailyVocabCount: {},
    weeklyStats: {},
    // NEU: Hinzugefügt, um die täglichen Modi für einen Erfolg zu speichern
    dailyStats: { date: null, modesUsed: [] }
  }),
  getters: {
    level(state) {
        const xp = state.totalXp;
        let level = 1;
        let xpForNext = 100;
        let xpForCurrentLevel = 0;

        while (xp >= xpForCurrentLevel + xpForNext) {
            xpForCurrentLevel += xpForNext;
            level++;
        }
        return level;
    },
    levelInfo(state) {
      const xp = state.totalXp;
      let level = 1, xpForNext = 100, xpForCurrentLevel = 0;
      while (xp >= xpForCurrentLevel + xpForNext) {
        xpForCurrentLevel += xpForNext;
        level++;
      }
      const currentLevelXp = xp - xpForCurrentLevel;
      const progressPercentage = xpForNext > 0 ? Math.floor((currentLevelXp / xpForNext) * 100) : 0;
      return { level, xp: currentLevelXp, xpForNextLevel: xpForNext, progressPercentage };
    },
    unlockedAchievementsData(state) {
        return state.unlockedAchievements.map(id => achievements[id]).filter(Boolean);
    },
    currentStreak: (state) => state.streak.current || 0,
  },
  actions: {
    saveProgress() {
      try {
        const dataToSave = {
          totalXp: this.totalXp, streak: this.streak,
          unlockedAchievements: this.unlockedAchievements, completedChapters: this.completedChapters,
          startedChapters: this.startedChapters, dailyVocabCount: this.dailyVocabCount, weeklyStats: this.weeklyStats,
          dailyStats: this.dailyStats // NEU
        };
        localStorage.setItem('leBonMotProgress', JSON.stringify(dataToSave));
      } catch (e) { console.error('Fehler beim Speichern:', e); }
    },
    loadProgress() {
      try {
        const savedData = JSON.parse(localStorage.getItem('leBonMotProgress') || '{}');
        this.totalXp = savedData.totalXp || 0;
        this.streak = savedData.streak || { current: 0, lastLearnedDate: null };
        this.unlockedAchievements = savedData.unlockedAchievements || [];
        this.completedChapters = savedData.completedChapters || {};
        this.startedChapters = savedData.startedChapters || {};
        this.dailyVocabCount = savedData.dailyVocabCount || {};
        this.weeklyStats = savedData.weeklyStats || {};
        this.dailyStats = savedData.dailyStats || { date: null, modesUsed: [] }; // NEU
        this.updateStreak();
      } catch (e) { console.error('Fehler beim Laden:', e); }
    },
    updateStreak() {
        if (!this.streak) {
            this.streak = { current: 0, lastLearnedDate: null };
        }
        const today = new Date().toDateString();
        if (this.streak.lastLearnedDate && (new Date(today) - new Date(this.streak.lastLearnedDate)) / 864e5 > 1) {
            this.streak.current = 0;
        }
        this.saveProgress();
    },
  },
});
