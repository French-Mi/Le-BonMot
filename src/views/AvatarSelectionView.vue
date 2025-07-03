<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProgressStore } from '@/stores/progressStore';
import { useUserProfileStore } from '@/stores/userProfileStore';
import { appRewards } from '@/data/rewards';

const progressStore = useProgressStore();
const profileStore = useUserProfileStore();
const router = useRouter();

const allAvatarRewardsForDisplay = computed(() => {
  const defaultAvatar = {
    id: 'avatar-default',
    name: 'Standard',
    description: 'Dein Start-Avatar.',
    requiredLevels: 0,
    type: 'avatar',
    value: 'default.png',
    isUnlocked: true
  };

  const allOtherAvatars = appRewards
    .filter(reward => reward.type === 'avatar')
    .map(reward => ({
      ...reward,
      isUnlocked: progressStore.level >= reward.requiredLevels
    }))
    // KORREKTUR: Die Avatare werden jetzt nach dem benötigten Level sortiert
    .sort((a, b) => a.requiredLevels - b.requiredLevels);

  allOtherAvatars.forEach(avatar => {
      if (avatar.isUnlocked && !profileStore.unlockedAvatars.includes(avatar.value)) {
          profileStore.unlockReward(avatar);
      }
  });

  return [defaultAvatar, ...allOtherAvatars];
});

function selectAvatar(avatar) {
  if (avatar.isUnlocked) {
    profileStore.selectAvatar(avatar.value);
    router.push('/dashboard');
  }
}
</script>

<template>
  <div class="view-container">
    <h1 class="page-title">Wähle deinen Avatar</h1>
    <div class="avatar-grid">
      <div
        v-for="avatar in allAvatarRewardsForDisplay"
        :key="avatar.id"
        class="avatar-card card"
        :class="{
          'selected': profileStore.selectedAvatar === avatar.value,
          'locked': !avatar.isUnlocked
        }"
        @click="selectAvatar(avatar)"
      >
        <div class="tooltip-wrapper">
          <span class="tooltip-text">
            {{ avatar.isUnlocked ? avatar.name : `Level ${avatar.requiredLevels} benötigt` }}
          </span>
          <img :src="`/avatars/${avatar.value}`" :alt="avatar.name" class="avatar-image">
          <div v-if="!avatar.isUnlocked" class="lock-overlay">
             <i class="bi bi-lock-fill"></i>
          </div>
        </div>
      </div>
    </div>
    <button @click="router.push('/dashboard')" class="btn-back">Zurück zum Dashboard</button>
  </div>
</template>

<style scoped>
.page-title { text-align: center; font-size: 2rem; margin-bottom: 2rem; color: var(--header-blue); }
.avatar-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1.5rem; }
.avatar-card {
  padding: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  text-align: center;
  border: 4px solid transparent;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-card:not(.locked) {
  cursor: pointer;
}
.avatar-card:not(.locked):hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}
.avatar-card.selected {
  border-color: var(--primary-blue);
  box-shadow: 0 0 15px rgba(13, 110, 253, 0.4);
}
.avatar-card.locked {
  cursor: not-allowed;
}
.tooltip-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tooltip-text {
  visibility: hidden;
  width: max-content;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 10px;
  position: absolute;
  z-index: 1;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.avatar-card:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}
.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #343a40;
  border-radius: 8px;
}
.btn-back { display: block; width: fit-content; margin: 2rem auto 0; padding: 0.75rem 2rem; border-radius: 8px; background-color: var(--muted-text); color: white; border: none; cursor: pointer; transition: background-color 0.2s; }
.btn-back:hover { background-color: #5a6268; }
</style>
