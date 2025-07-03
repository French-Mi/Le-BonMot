import { defineStore } from 'pinia';

export const useUserProfileStore = defineStore('userProfile', {
  state: () => ({
    selectedAvatar: 'default.png',
    unlockedAvatars: ['default.png'],
  }),
  actions: {
    loadProfile() {
      try {
        const saved = localStorage.getItem('leBonMotUserProfile');
        if (saved) {
          const profile = JSON.parse(saved);
          this.selectedAvatar = profile.selectedAvatar || 'default.png';
          // Stelle sicher, dass der Default-Avatar immer freigeschaltet ist
          const unlocked = new Set(profile.unlockedAvatars || []);
          unlocked.add('default.png');
          this.unlockedAvatars = Array.from(unlocked);
        }
      } catch (e) {
        console.error("Fehler beim Laden des User-Profils:", e);
      }
    },
    saveProfile() {
      try {
        localStorage.setItem('leBonMotUserProfile', JSON.stringify({
          selectedAvatar: this.selectedAvatar,
          unlockedAvatars: this.unlockedAvatars,
        }));
      } catch (e) {
        console.error("Fehler beim Speichern des User-Profils:", e);
      }
    },
    selectAvatar(avatarFilename) {
      if (this.unlockedAvatars.includes(avatarFilename)) {
        this.selectedAvatar = avatarFilename;
        this.saveProfile();
      }
    },
    unlockReward(reward) {
      if (reward.type === 'avatar' && !this.unlockedAvatars.includes(reward.value)) {
        this.unlockedAvatars.push(reward.value);
        this.saveProfile();
      }
    },
  },
});
