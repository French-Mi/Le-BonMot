<script setup>
import { useRouter } from 'vue-router';
import UserAvatar from '@/components/dashboard/UserAvatar.vue';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

// Diese Funktion navigiert zum Dashboard
const navigateToDashboard = () => {
  router.push('/dashboard');
};
</script>

<template>
  <header class="app-header">
    <div class="logo-container" @click="goHome" style="cursor: pointer;">
      <svg class="header-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M85 22.0001C85 18.1341 81.866 15.0001 78 15.0001H22C18.134 15.0001 15 18.1341 15 22.0001V62.0001C15 65.8661 18.134 69.0001 22 69.0001H35V81.0001L50.5 69.0001H78C81.866 69.0001 85 65.8661 85 62.0001V22.0001Z" fill="white"></path><rect x="25" y="25.0001" width="16.6667" height="34" fill="#0055A4"></rect><rect x="41.6667" y="25.0001" width="16.6666" height="34" fill="white"></rect><rect x="58.3333" y="25.0001" width="16.6667" height="34" fill="#EF4135"></rect></svg>
      <h1>le BonMot</h1>
    </div>
    <div class="user-menu" @click="navigateToDashboard" style="cursor: pointer;">
      <UserAvatar />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: var(--header-blue);
  color: white;
  border-radius: 0 0 12px 12px;
}
.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-logo-svg {
  width: 40px;
  height: 40px;
}
h1 {
  font-size: 1.75rem;
  font-weight: 700;
}
.user-menu {
  display: flex;
  align-items: center;
}
</style>
