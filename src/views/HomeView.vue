<script setup>
import { ref, computed } from 'vue';
import { useAppStore } from '@/stores/appStore';
import { useProgressStore } from '@/stores/progressStore';
import { useRouter } from 'vue-router';
import { RouterLink } from 'vue-router';
import AchievementIcon from '@/components/AchievementIcon.vue';

const appStore = useAppStore();
const progressStore = useProgressStore();
const router = useRouter();

const searchQueryLocal = ref('');
const searchPerformed = computed(() => appStore.searchPerformed);
const searchResults = computed(() => appStore.searchResults);

const unlockedAchievements = computed(() => progressStore.unlockedAchievementsData);
const levelInfo = computed(() => progressStore.levelInfo);
const streak = computed(() => progressStore.currentStreak);
const levelNames = computed(() => appStore.levelNames);

function startReview(days) {
  const quizStarted = appStore.startGlobalReview(days);
  if (quizStarted) {
    router.push({ name: 'quiz' });
  }
}
function executeSearch() { appStore.performSearch(searchQueryLocal.value); }
function clearSearch() { searchQueryLocal.value = ''; appStore.clearSearch(); }
function navigateToContext(contextString) {
  const parts = contextString.split(' > ');
  if (parts.length < 2) return;
  const level = parts[0];
  const mainChapter = parts.length === 3 ? parts[1] : null;
  const chapter = parts.length === 3 ? parts[2] : parts[1];
  appStore.selectLevel(level);
  appStore.selectMainChapter(mainChapter);
  appStore.selectChapter(chapter);
  router.push({ name: 'vocabulary-list' });
  clearSearch();
}
</script>

<template>
  <div class="view-container">
    <div class="progress-summary-card card" @click="router.push('/dashboard')" style="cursor: pointer;">
      <div class="progress-header">
        <h2 class="progress-title">Dein Fortschritt</h2>
      </div>
      <div class="progress-content">
        <div class="level-display">
          <span class="level-tag">Level {{ levelInfo.level }}</span>
          <div class="xp-bar-container">
            <div class="xp-bar-fill" :style="{ width: `${levelInfo.progressPercentage}%` }"></div>
          </div>
          <span class="xp-text">{{ levelInfo.xp }}/{{ levelInfo.xpForNextLevel }} XP</span>
        </div>
        <div class="streak-display">
          <i class="bi bi-fire streak-icon"></i>
          <p><strong>{{ streak }}</strong> Tage gelernt!</p>
        </div>
        <div class="achievements-display">
           <p v-if="!unlockedAchievements.length" class="no-achievements">Sammle Erfolge!</p>
           <AchievementIcon v-for="ach in unlockedAchievements.slice(0, 4)" :key="ach.id" :achievement="ach" />
        </div>
      </div>
    </div>

    <div class="card mb-8">
        <h3 class="utility-title">Vokabelsuche</h3>
        <div class="flex gap-2">
            <input type="text" v-model="searchQueryLocal" @keyup.enter="executeSearch" placeholder="Wort eingeben..." class="flex-grow p-2 border border-gray-300 rounded-md" />
            <button @click="executeSearch" class="btn-search">Suchen</button>
            <button v-if="searchPerformed" @click="clearSearch" class="btn-clear-search">X</button>
        </div>
        <div v-if="searchPerformed" class="mt-4">
            <div v-if="searchResults.length > 0">
                <div class="space-y-3">
                    <div v-for="(result, index) in searchResults" :key="index" class="search-result-item">
                        <p>
                            <strong class="text-blue-700">{{ result.french }}</strong> <br>
                            <span class="text-gray-700">{{ result.german }}</span>
                        </p>
                        <div class="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-2">
                            Gefunden in:
                            <button @click="navigateToContext(result.context)" class="context-link">{{ result.context }}</button>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="text-center p-2 text-gray-500">
                Keine Vokabel für "{{ appStore.searchQuery }}" gefunden.
            </div>
        </div>
    </div>

    <h1 class="page-title">Wähle dein Niveau</h1>
    <div class="topics-container">
        <RouterLink v-for="level in levelNames" :key="level" :to="`/level/${level}`" class="topic-card card">
            <h2>{{ level }}</h2>
            <p>Vokabeln und Lektionen für das Niveau {{ level }}</p>
        </RouterLink>
    </div>

    <div class="utility-section card">
      <h3 class="utility-title">Fehler wiederholen</h3>
      <div class="utility-buttons">
        <button @click="startReview(1)" class="btn-utility">Letzte 24h</button>
        <button @click="startReview(7)" class="btn-utility">Letzte 7 Tage</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { text-align: center; font-size: 2rem; margin: 2.5rem 0 1.5rem; color: var(--header-blue); }
.topics-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.topic-card { padding: 1.5rem; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; }
.topic-card:hover { transform: translateY(-5px); box-shadow: 0 8px 15px rgba(0,0,0,0.08); }
.topic-card h2 { margin-top: 0; color: var(--primary-blue); }
.progress-summary-card { margin-bottom: 2rem; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
.progress-title { margin: 0; font-size: 1.5rem; }
.progress-content { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem; align-items: center; }
.level-display { display: flex; align-items: center; gap: 1rem; }
.level-tag { background-color: var(--primary-blue); color: white; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; }
.xp-bar-container { flex-grow: 1; background-color: #e9ecef; height: 10px; border-radius: 5px; }
.xp-bar-fill { height: 100%; background-color: var(--xp-color); border-radius: 5px; transition: width 0.5s ease-out; }
.xp-text { font-size: 0.9rem; font-weight: 500; color: #6b7280; white-space: nowrap; }
.streak-display { display: flex; align-items: center; gap: 0.75rem; justify-content: center; background-color: var(--streak-bg); color: var(--streak-text); padding: 0.5rem; border-radius: 8px; }
.streak-icon { color: var(--streak-icon); font-size: 1.5rem; }
.streak-display p { margin: 0; font-weight: 500;}
.achievements-display { display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; }
.no-achievements { font-style: italic; color: var(--muted-text); font-size: 0.8rem; }
.utility-section { margin-top: 2rem; }
.utility-title { text-align: center; font-size: 1.25rem; margin-bottom: 1rem; }
.utility-buttons { display: flex; justify-content: center; gap: 1rem; }
.btn-utility { flex-grow: 1; background-color: var(--light-blue); color: var(--primary-blue); border: 1px solid var(--primary-blue); padding: 0.6rem; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; cursor: pointer; }
.btn-utility:hover { background-color: #dbeaff; }
.btn-search { background-color: var(--primary-blue); color: white; border:none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;}
.btn-clear-search { background-color: var(--muted-text); color: white; border:none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;}
.search-result-item { padding: 0.75rem; border-top: 1px solid #e5e7eb; }
.context-link { background: none; border: none; padding: 0; color: var(--primary-blue); text-decoration: underline; cursor: pointer; }
@media (max-width: 768px) {
  .progress-content { grid-template-columns: 1fr; gap: 1.5rem; }
  .achievements-display { justify-content: flex-start; }
}
</style>
