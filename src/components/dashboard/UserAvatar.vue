<script setup>
import { useUserProfileStore } from '@/stores/userProfileStore';

const profileStore = useUserProfileStore();
</script>

<template>
  <div class="avatar-container">
    <img
      :src="`/avatars/${profileStore.selectedAvatar}`"
      alt="User Avatar"
      class="avatar-image"
    >
  </div>
</template>

<style scoped>
.avatar-container {
  cursor: pointer;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid white;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
