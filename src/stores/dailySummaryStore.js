import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useDailySummaryStore = defineStore('dailySummary', () => {
  // `ref` für den State, um ihn reaktiv zu halten
  const summaries = ref([]);

  // Getter, um zu prüfen, ob Daten vorhanden sind
  const hasSummaries = computed(() => summaries.value.length > 0);

  // Lade Daten aus dem LocalStorage beim Initialisieren
  try {
    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem('leBonMotDailySummary') || '{}');
    if (saved.date === today) {
      summaries.value = saved.summaries || [];
    } else {
      // Wenn es ein neuer Tag ist, alte Daten verwerfen
      localStorage.removeItem('leBonMotDailySummary');
    }
  } catch (e) {
    console.error('Fehler beim Laden der Tagesübersicht:', e);
    summaries.value = [];
  }

  // Funktion zum Speichern der Daten
  function save() {
    try {
      const dataToSave = {
        date: new Date().toDateString(),
        summaries: summaries.value
      };
      localStorage.setItem('leBonMotDailySummary', JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Fehler beim Speichern der Tagesübersicht:', e);
    }
  }

  // Fügt das Ergebnis einer Übungsrunde hinzu
  function addExerciseSummary(summary) {
    summaries.value.push(summary);
    save();
  }

  // Setzt die Zusammenfassungen zurück
  function clearSummaries() {
      summaries.value = [];
      save();
  }

  return {
    summaries,
    hasSummaries,
    addExerciseSummary,
    clearSummaries
  };
});
