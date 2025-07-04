<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore();
const router = useRouter();

// Lokaler Zustand für die Optionen
const selectedVocabCount = ref('0'); // 0 für "Alle" als sicherer Standard
const selectedDirection = ref('frToDe');

const chapterVocab = computed(() => {
  const store = appStore;
  if (!store.selectedLevel || !store.selectedChapter) return [];
  if (store.selectedMainChapter) {
    return store.vocabDataGlobal[store.selectedLevel][store.selectedMainChapter][store.selectedChapter] || [];
  }
  return store.vocabDataGlobal[store.selectedLevel][store.selectedChapter] || [];
});

const totalVocabCount = computed(() => chapterVocab.value.length);

// KORRIGIERT: Erstellt die Optionen in 5er-Schritten korrekt
const vocabCountOptions = computed(() => {
  const options = [];
  const total = totalVocabCount.value;
  if (total > 0) {
    for (let i = 5; i <= total; i += 5) {
      options.push(i);
    }
  }
  return options;
});

// Stellt sicher, dass eine gültige Option ausgewählt ist, wenn sich die Gesamtzahl ändert
watch(totalVocabCount, (newTotal) => {
  if (parseInt(selectedVocabCount.value, 10) > newTotal) {
    selectedVocabCount.value = '0'; // Auf "Alle" zurücksetzen, wenn die Auswahl ungültig wird
  }
}, { immediate: true });


function startQuiz(quizType) {
  appStore.setQuizDirection(selectedDirection.value);
  const options = { vocabCount: parseInt(selectedVocabCount.value, 10) };
  const success = appStore.startQuiz(quizType, options);

  if (success) {
    router.push({ name: 'quiz' });
  } else {
    alert('Fehler: Für dieses Kapitel konnten keine Vokabeln geladen werden.');
  }
}

function goBack() {
  router.go(-1);
}
</script>

<template>
  <div class="text-center max-w-md mx-auto">
    <h2 class="text-2xl font-bold text-slate-800 mb-6">Lernmodus auswählen</h2>

    <div class="option-box">
      <label for="vocabCount" class="option-label">Wie viele Vokabeln?</label>
      <select id="vocabCount" v-model="selectedVocabCount" class="option-select">
        <option v-for="count in vocabCountOptions" :key="count" :value="count">
          {{ count }} Vokabeln
        </option>
        <option value="0">Alle ({{ totalVocabCount }})</option>
      </select>
    </div>

    <div class="option-box">
      <p class="option-label">In welche Richtung?</p>
      <div class="flex justify-center space-x-2">
        <button
          @click="selectedDirection = 'frToDe'"
          :class="['btn-direction', { 'btn-direction-active': selectedDirection === 'frToDe' }]">
          FR → DE
        </button>
        <button
          @click="selectedDirection = 'deToFr'"
          :class="['btn-direction', { 'btn-direction-active': selectedDirection === 'deToFr' }]">
          DE → FR
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 mt-8">
      <button @click="startQuiz('flashcards')" class="btn btn-learn-method">Karteikarten</button>
      <button @click="startQuiz('multipleChoice')" class="btn btn-learn-method">Multiple Choice</button>
      <button @click="startQuiz('manualInput')" class="btn btn-learn-method">Manuelle Eingabe</button>
    </div>

    <button @click="goBack" class="btn btn-neutral mt-8 w-full">
      Zurück zum Kapitelmenü
    </button>
  </div>
</template>

<style scoped>
.option-box {
  background-color: #fff;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
}
.option-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.75rem;
}
.option-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}
.btn-direction {
  flex-grow: 1;
  padding: 0.6rem 1.2rem;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background-color: #f9fafb;
  color: #374151;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-direction-active {
  background-color: #3A6EA5;
  color: white;
  border-color: #3A6EA5;
}
.btn-learn-method {
  color: #374151;
  background-color: #f0f9ff;
  border: 1px solid #bee3f8;
  padding: 0.75rem;
  font-weight: 500;
  border-radius: 6px;
  transition: background-color 0.2s;
}
.btn-learn-method:hover {
  background-color: #e0f2fe;
}
.btn-neutral {
  background-color: #6c757d;
  color: white;
  padding: 0.75rem;
  border-radius: 6px;
  border: none;
  transition: background-color 0.2s;
}
.btn-neutral:hover {
  background-color: #5a6268;
}
</style>
