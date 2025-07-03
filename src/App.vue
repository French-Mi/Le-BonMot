<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import NotificationToast from '@/components/NotificationToast.vue';
import { useAppStore } from './stores/appStore';

const appStore = useAppStore();
const isLoading = ref(true);

let timeoutId = null;

const endLoading = () => {
  if (isLoading.value) {
    isLoading.value = false;
    window.removeEventListener('keydown', endLoading);
    clearTimeout(timeoutId);
  }
};

onMounted(() => {
  // KORREKTUR: Dauer auf 1 Sekunde verkürzt
  timeoutId = setTimeout(endLoading, 1000);
  window.addEventListener('keydown', endLoading);
});

onUnmounted(() => {
  window.removeEventListener('keydown', endLoading);
  clearTimeout(timeoutId);
});
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <div class="logo-container">
      <svg class="loading-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M85 22.0001C85 18.1341 81.866 15.0001 78 15.0001H22C18.134 15.0001 15 18.1341 15 22.0001V62.0001C15 65.8661 18.134 69.0001 22 69.0001H35V81.0001L50.5 69.0001H78C81.866 69.0001 85 65.8661 85 62.0001V22.0001Z" fill="white"></path><rect x="25" y="25.0001" width="16.6667" height="34" fill="#0055A4"></rect><rect x="41.6667" y="25.0001" width="16.6666" height="34" fill="white"></rect><rect x="58.3333" y="25.0001" width="16.6667" height="34" fill="#EF4135"></rect></svg>
      <div>
        <h1>le BonMot</h1>
        <p class="subtitle-trainer">Vokabeltrainer</p>
      </div>
    </div>
  </div>

  <div v-else class="app-container">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
    <NotificationToast
      :notification="appStore.notification"
    />
  </div>
</template>

<style>
/* Basis-Styling, das überall gilt */
:root {
  --header-blue: #3B82F6;
  --primary-blue: #3B82F6;
  --light-blue: #DBEAFE;
  --xp-color: #FBBF24;
  --streak-bg: #FFF7ED;
  --streak-text: #9A3412;
  --streak-icon: #F97316;
  --dark-text: #1F2937;
  --muted-text: #6B7280;
  --card-background: #FFFFFF;
  --border-color: #E5E7EB;
  --page-background: #F9FAFB;
  --success-color: #10B981;
  --error-color: #EF4444;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--page-background);
  color: var(--dark-text);
}

.view-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background-color: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.btn-primary {
    background-color: var(--primary-blue);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}
.btn-primary:hover {
    background-color: #2563eb;
}
.btn-primary:disabled {
    background-color: #e2e8f0;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
}

/* Styling für den Ladebildschirm */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--header-blue);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-screen .logo-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  color: white;
}

.loading-screen .loading-logo-svg {
  width: 80px;
  height: 80px;
}

.loading-screen h1 {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
}

/* KORREKTUR: Styling für den neuen Untertitel */
.loading-screen .subtitle-trainer {
  font-family: serif;
  font-style: italic;
  font-size: 1.5rem;
  text-align: right;
  margin-top: -0.5rem;
  color: rgba(255, 255, 255, 0.9);
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  animation: fadeIn 0.5s ease-in-out;
}

.main-content {
  flex-grow: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
