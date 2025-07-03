<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProgressStore } from '@/stores/progressStore';
import { useDailySummaryStore } from '@/stores/dailySummaryStore';
import ProgressChart from '@/components/ProgressChart.vue';
import { achievements } from '@/data/achievements';
import AchievementIcon from '@/components/AchievementIcon.vue';
import UserAvatar from '@/components/dashboard/UserAvatar.vue';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const progressStore = useProgressStore();
const dailySummaryStore = useDailySummaryStore();
const router = useRouter();

const unlockedAchievements = computed(() => {
  return progressStore.unlockedAchievements
    .map(id => achievements[id])
    .filter(Boolean);
});

const preparePdfData = () => {
  const dataByChapter = {};
  const wordsToRepeat = new Set();

  dailySummaryStore.summaries.forEach(summary => {
    const chapterTitle = summary.chapterTitle || "Unbekanntes Kapitel";
    if (!dataByChapter[chapterTitle]) {
      dataByChapter[chapterTitle] = {
        vocabs: {},
        quizType: summary.quizType,
        maxAttempts: 0
      };
    }

    summary.results.forEach(result => {
      const vocabKey = result.question.french;
      if (!dataByChapter[chapterTitle].vocabs[vocabKey]) {
        dataByChapter[chapterTitle].vocabs[vocabKey] = {
          french: result.question.french,
          german: result.question.german,
          attempts: []
        };
      }

      const currentAttempts = dataByChapter[chapterTitle].vocabs[vocabKey].attempts;
      currentAttempts.push(result);

      if (currentAttempts.some(attempt => !attempt.isCorrect)) {
        wordsToRepeat.add(JSON.stringify(result.question));
      }
    });
  });

  for (const chapter in dataByChapter) {
      let max = 0;
      for (const vocab in dataByChapter[chapter].vocabs) {
          const attemptCount = dataByChapter[chapter].vocabs[vocab].attempts.length;
          if (attemptCount > max) {
              max = attemptCount;
          }
      }
      dataByChapter[chapter].maxAttempts = max;
  }
  return { dataByChapter, wordsToRepeat: Array.from(wordsToRepeat).map(s => JSON.parse(s)) };
};

const downloadDailySummary = () => {
  const { dataByChapter, wordsToRepeat } = preparePdfData();

  if (Object.keys(dataByChapter).length === 0) {
    alert("Heute wurden noch keine Übungen abgeschlossen.");
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  const margin = 25;

  let isFirstPage = true;

  for (const chapterTitle in dataByChapter) {
    if (!isFirstPage) {
      doc.addPage('a4', 'landscape');
    }
    isFirstPage = false;

    const { vocabs, maxAttempts, quizType } = dataByChapter[chapterTitle];

    doc.setFontSize(16);
    doc.text(chapterTitle, margin, margin - 10);

    const modeMap = {
        'flashcards': 'Karteikarten',
        'multipleChoice': 'Multiple Choice',
        'manualInput': 'Manuelle Eingabe'
    };
    const modeText = modeMap[quizType] || 'Vokabelquiz';

    const head = [['Französisch', 'Deutsch', 'Trainingsmodus']];
    for (let i = 1; i <= maxAttempts; i++) {
      head[0].push(`${i}. Durchg.`);
    }

    const correctCountsPerAttempt = new Array(maxAttempts).fill(0);
    const totalVocabs = Object.keys(vocabs).length;

    const body = Object.values(vocabs).map(v => {
      const attemptsResult = [];
      for(let i = 0; i < maxAttempts; i++) {
          const attempt = v.attempts[i];
          if(attempt) {
              if (quizType === 'flashcards') {
                  if (attempt.userInput === 'sure') {
                      attemptsResult.push('richtig');
                      correctCountsPerAttempt[i]++;
                  } else if (attempt.userInput === 'unsure') {
                      attemptsResult.push('unsicher');
                  } else {
                      attemptsResult.push('ahnungslos');
                  }
              } else {
                  if (attempt.isCorrect) {
                      attemptsResult.push('richtig');
                      correctCountsPerAttempt[i]++;
                  } else {
                      attemptsResult.push(attempt.userInput || '❌');
                  }
              }
          } else {
              attemptsResult.push('');
          }
      }
      return [v.french, v.german, modeText, ...attemptsResult];
    });

    const summaryRow = [{ content: 'Korrekt:', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }];
    correctCountsPerAttempt.forEach(count => {
        summaryRow.push({ content: `${count} / ${totalVocabs}`, styles: { halign: 'center' } });
    });
    body.push(summaryRow);

    autoTable(doc, {
      head,
      body,
      startY: margin,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      headStyles: { fillColor: [74, 144, 226] },
      didParseCell: (data) => {
        data.cell.styles.font = 'Helvetica';
        if (data.column.index >= 3) {
          data.cell.styles.halign = 'center';
          if (data.cell.raw === 'richtig') {
            data.cell.styles.textColor = '#198754';
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'unsicher') {
            data.cell.styles.textColor = '#ff9800';
          } else if (data.cell.raw === 'ahnungslos' || data.cell.raw === '❌') {
            data.cell.styles.textColor = '#dc3545';
          } else if (data.cell.raw) {
            data.cell.styles.textColor = '#dc3545';
            data.cell.styles.fontStyle = 'italic';
          }
        }
      }
    });
  }

  if (wordsToRepeat.length > 0) {
      doc.addPage('a4', 'landscape');
      doc.setFontSize(16);
      doc.text("Vokabeln zum Wiederholen", margin, margin - 10);
      autoTable(doc, {
          head: [['Französisch', 'Deutsch']],
          body: wordsToRepeat.map(v => [v.french, v.german]),
          startY: margin,
          margin: { top: margin, right: margin, bottom: margin, left: margin },
      });
  }

  doc.save(`lebonmot-uebersicht-${new Date().toISOString().slice(0, 10)}.pdf`);
};

</script>

<template>
    <div class="view-container">
        <h1>Dashboard</h1>
        <p class="subtitle">Willkommen zurück! Hier ist eine Übersicht deines Fortschritts.</p>

        <div class="dashboard-grid">
          <div class="card chart-card">
            <h3>XP pro Tag (Letzte 7 Tage)</h3>
            <ProgressChart :chart-data="progressStore.dailyVocabCount" time-frame="week" />
          </div>

          <div class="card avatar-card" @click="router.push('/avatar-selection')" style="cursor: pointer;">
            <h3>Dein Avatar</h3>
            <div class="avatar-wrapper">
              <UserAvatar />
            </div>
            <p class="avatar-hint">Klicke auf den Avatar, um einen neuen auszuwählen.</p>
          </div>

          <div class="card achievements-card">
            <h3>Erfolge</h3>
            <div v-if="unlockedAchievements.length > 0" class="achievements-grid">
              <AchievementIcon v-for="achievement in unlockedAchievements" :key="achievement.id" :achievement="achievement"/>
            </div>
            <p v-else class="text-gray-500 text-center">Noch keine Erfolge freigeschaltet. Leg los!</p>
          </div>

          <div class="card summary-card">
            <h3>Tagesübersicht</h3>
            <button @click="downloadDailySummary" :disabled="!dailySummaryStore.hasSummaries" class="btn btn-warning">
              Lernübersicht als PDF
            </button>
            <p class="summary-hint">
              Lade eine PDF-Zusammenfassung aller heutigen Übungen herunter.
            </p>
          </div>
        </div>
        <button @click="router.push('/')" class="btn-back">Zurück zur Startseite</button>
    </div>
</template>

<style scoped>
.subtitle { margin-top: -0.5rem; margin-bottom: 2rem; color: var(--muted-text); }
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  grid-template-areas:
    "chart avatar"
    "achievements summary";
}
.card {
  padding: 1.5rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}
.card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
}
.chart-card { grid-area: chart; }
.avatar-card { grid-area: avatar; align-items: center; text-align: center; }
.avatar-wrapper { transform: scale(1.5); margin: 1.5rem 0; }
.avatar-hint { font-size: 0.9rem; color: var(--muted-text); }
.achievements-card { grid-area: achievements; }
.achievements-grid { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
.summary-card { grid-area: summary; text-align: center; justify-content: flex-start; }
.summary-card .btn-warning { margin-bottom: 0.75rem; }
.summary-card p.summary-hint {
  flex-grow: 0;
  margin-top: 0;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--muted-text);
}
.btn-back { display: block; width: fit-content; margin: 2rem auto 0; padding: 0.75rem 2rem; border-radius: 8px; background-color: var(--muted-text); color: white; border: none; cursor: pointer; transition: background-color 0.2s; }
.btn-back:hover { background-color: #5a6268; }

.btn-warning {
  background-color: #ffc107;
  color: #212529;
  border: 1px solid #e0a800;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
}
.btn-warning:hover {
  background-color: #e0a800;
}
.btn-warning:disabled {
  background-color: #fff3cd;
  color: #664d03;
  border-color: #ffc107;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "chart"
      "avatar"
      "achievements"
      "summary";
  }
}
</style>
