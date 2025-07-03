<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/appStore';
import { useDailySummaryStore } from '@/stores/dailySummaryStore';
import CelebrationAnimation from '@/components/CelebrationAnimation.vue';

const appStore = useAppStore();
const dailySummaryStore = useDailySummaryStore();
const router = useRouter();

// UI-Zustand
const isCardFlipped = ref(false);
const isAnswered = ref(false);
const selectedAnswer = ref(null);
const manualInputValue = ref('');
const wasCorrect = ref(null);
const isExampleVisible = ref(false);
let blockNextEnterSubmit = false;

// Zustand für die aktuelle Runde
const allRoundAnswers = ref([]);

// TTS Logik
const speakerIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 w-5 h-5"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;
let frenchVoices = [];
const synth = window.speechSynthesis;
function loadVoices() { if (synth) { frenchVoices = synth.getVoices().filter(v => v.lang.startsWith('fr')); } }
function speak(text, event) { if (event) event.stopPropagation(); if (!synth || !text) return; const cleanedText = String(text).replace(/\(.*\)/gi, '').replace(/\b(qc|qn|qc à qn)\b\.?/gi, '').trim(); if (!cleanedText) return; if (synth.speaking) synth.cancel(); const utterance = new SpeechSynthesisUtterance(cleanedText); utterance.lang = 'fr-FR'; utterance.rate = 1.0; if (frenchVoices.length > 0) { utterance.voice = frenchVoices.find(v => v.default) || frenchVoices.find(v => v.name.includes('Amelie') || v.name.includes('Thomas')) || frenchVoices[0]; } utterance.onerror = (e) => { console.error("Fehler bei der Sprachsynthese:", e); }; synth.speak(utterance); }
onMounted(() => { if (synth) { if (synth.getVoices().length > 0) { loadVoices(); } else if (synth.onvoiceschanged !== undefined) { synth.onvoiceschanged = loadVoices; } } window.addEventListener('keydown', handleGlobalKeyPress); });
onUnmounted(() => { window.removeEventListener('keydown', handleGlobalKeyPress); });

// Computed Properties
const currentQuizType = computed(() => appStore.currentQuizType);
const currentWord = computed(() => appStore.currentWord);
const isQuizFinished = computed(() => appStore.isQuizFinished);
const quizProgress = computed(() => ({ current: appStore.currentQuestionIndex + 1, total: appStore.initialQuizWordCount }));
const score = computed(() => ({ correct: appStore.roundCorrectCount, incorrect: appStore.roundIncorrectCount }));
const sureCount = computed(() => appStore.sureCount);
const unsureCount = computed(() => appStore.unsureCount);
const noIdeaCount = computed(() => appStore.noIdeaCount);
const incorrectWords = computed(() => appStore.incorrectlyAnsweredWordsGlobal);
const specialChars = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ô', 'û', 'ç', 'î', 'ï', 'œ', 'ù'];

const multipleChoiceOptions = computed(() => {
    if (currentQuizType.value !== 'multipleChoice' || !currentWord.value) return [];
    const correctAnswer = appStore.currentQuizDirection === 'frToDe' ? currentWord.value.german : currentWord.value.french;
    const distractorsPool = appStore.quizWords
        .map(word => appStore.currentQuizDirection === 'frToDe' ? word.german : word.french)
        .filter(text => text !== correctAnswer);
    let options = [correctAnswer, ...[...new Set(distractorsPool)]];
    if (options.length < 4) {
        const originalChapterVocab = appStore.selectedMainChapter ? appStore.vocabDataGlobal[appStore.selectedLevel][appStore.selectedMainChapter][appStore.selectedChapter] : appStore.vocabDataGlobal[appStore.selectedLevel][appStore.selectedChapter];
        if (originalChapterVocab && Array.isArray(originalChapterVocab)) {
            const fallbackPool = originalChapterVocab
                .map(word => appStore.currentQuizDirection === 'frToDe' ? word.german : word.french)
                .filter(wordText => !options.includes(wordText));
            const shuffledFallbacks = [...new Set(fallbackPool)].sort(() => 0.5 - Math.random());
            const needed = 4 - options.length;
            options.push(...shuffledFallbacks.slice(0, needed));
        }
    }
    const finalDistractors = options.filter(opt => opt !== correctAnswer).slice(0, 3);
    const finalOptions = [correctAnswer, ...finalDistractors];
    return finalOptions.sort(() => 0.5 - Math.random());
});

// Watchers
watch(() => appStore.currentQuestionIndex, async () => {
    if (appStore.currentQuestionIndex === 0) {
        allRoundAnswers.value = [];
    }
    if (currentQuizType.value === 'manualInput') {
        await nextTick();
        const inputEl = document.getElementById('answerInput');
        if (inputEl) inputEl.focus();
    }
});

watch(isQuizFinished, (isFinished) => {
  if (isFinished) {
    appStore.completeLearningSession();
    if (allRoundAnswers.value.length > 0 && !appStore.isReviewRound) {
        dailySummaryStore.addExerciseSummary({
            chapterTitle: `${appStore.selectedLevel} - ${appStore.selectedMainChapter ? appStore.selectedMainChapter + ' - ' : ''}${appStore.selectedChapter}`,
            quizType: appStore.currentQuizType,
            timestamp: Date.now(),
            results: allRoundAnswers.value
        });
    }
    if (!appStore.isReviewRound && appStore.incorrectlyAnsweredWordsGlobal.length === 0) {
      appStore.markChapterAsCompleted();
    }
  }
});


// Methoden
function handleAnswer(isCorrect, userInput, correctAnswer) {
  allRoundAnswers.value.push({
    question: JSON.parse(JSON.stringify(currentWord.value)), // tiefe Kopie
    isCorrect,
    userInput: userInput || '',
    correctAnswer: isCorrect ? '' : correctAnswer
  });
}

function quitQuiz() { appStore.quitQuiz(); router.push('/'); }

function nextQuestion() {
  appStore.nextQuestion();
  isCardFlipped.value = false;
  isAnswered.value = false;
  selectedAnswer.value = null;
  manualInputValue.value = '';
  wasCorrect.value = null;
  isExampleVisible.value = false;
}

function toggleExample() { isExampleVisible.value = !isExampleVisible.value; }
function flipCard() { if (!isCardFlipped.value) isCardFlipped.value = true; }

function handleFlashcardFeedback(feedback) {
  const isCorrect = feedback === 'sure';
  appStore.handleFlashcardFeedback(feedback);
  handleAnswer(isCorrect, feedback, appStore.currentQuizDirection === 'frToDe' ? currentWord.value.german : currentWord.value.french);
  isCardFlipped.value = false;
  isExampleVisible.value = false;
}

function handleMcSelection(answer) {
  if (isAnswered.value) return;
  isAnswered.value = true;
  selectedAnswer.value = answer;
  wasCorrect.value = appStore.submitAnswer(answer);
  handleAnswer(wasCorrect.value, answer, appStore.currentQuizDirection === 'frToDe' ? currentWord.value.german : currentWord.value.french);
}

function handleManualSubmit() {
  if (blockNextEnterSubmit) { blockNextEnterSubmit = false; return; }
  if (isAnswered.value || !manualInputValue.value) return;
  isAnswered.value = true;
  wasCorrect.value = appStore.submitAnswer(manualInputValue.value);
  handleAnswer(wasCorrect.value, manualInputValue.value, appStore.currentQuizDirection === 'frToDe' ? currentWord.value.german : currentWord.value.french);
}

function addSpecialChar(char) {
    manualInputValue.value += char;
    const inputEl = document.getElementById('answerInput');
    if (inputEl) inputEl.focus();
}

function overrideAnswer() {
  appStore.overrideAsCorrect();
  wasCorrect.value = true;
  // Letztes Ergebnis im Array korrigieren
  if (allRoundAnswers.value.length > 0) {
      allRoundAnswers.value[allRoundAnswers.value.length - 1].isCorrect = true;
  }
}

function startReview() {
  const options = { words: incorrectWords.value };
  appStore.startQuiz(currentQuizType.value, options);
}

function handleGlobalKeyPress(event) {
  if (event.key === 'Enter' && isAnswered.value && !isQuizFinished.value) {
    event.preventDefault();
    blockNextEnterSubmit = true;
    nextQuestion();
  }
}
function restartQuiz() {
  const options = { vocabCount: appStore.initialQuizWordCount };
  appStore.startQuiz(appStore.currentQuizType, options)
}
function goToLearnOptions() { router.push({ name: 'learn-options' }); }
function goToChapterSelection() { router.push({ name: 'chapter-selection', params: { levelName: appStore.selectedLevel } }); }
</script>

<template>
  <div class="w-full max-w-lg mx-auto flex-grow flex flex-col">
    <div v-if="!isQuizFinished && currentWord" >
        <div class="mb-4"><div class="flex justify-between mb-1"><span class="text-sm font-medium text-blue-700">Fortschritt</span><span class="text-sm font-medium text-blue-700">{{ quizProgress.current }} / {{ quizProgress.total }}</span></div><div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: (quizProgress.current / quizProgress.total) * 100 + '%' }"></div></div></div>
        <div v-if="currentQuizType === 'flashcards'" class="flex flex-col"><div class="flex justify-between items-center mb-1"><h3 class="text-lg font-semibold text-slate-700">Karteikarten</h3><div class="text-xs"><span class="text-green-600 mr-2">Sicher: {{ sureCount }}</span><span class="text-orange-500 mr-2">Unsicher: {{ unsureCount }}</span><span class="text-red-500">Ahnungslos: {{ noIdeaCount }}</span></div></div><div id="flashcard" class="flashcard" @click="flipCard"><div v-if="!isCardFlipped"><div class="text-3xl font-bold text-sky-800">{{ appStore.currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german }}<button v-if="appStore.currentQuizDirection === 'frToDe'" @click.stop="speak(currentWord.french, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></div><p class="text-gray-500 mt-4 text-sm">(Klicken zum Umdrehen)</p></div><div v-else><div class="text-2xl text-gray-700">{{ appStore.currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french }}<button v-if="appStore.currentQuizDirection === 'deToFr'" @click.stop="speak(currentWord.french, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></div></div></div><div v-if="isCardFlipped" class="mt-4 text-center"><button v-if="currentWord.exampleFrench" @click.stop="toggleExample" class="btn-example">{{ isExampleVisible ? 'Verbergen' : 'Beispiel' }}</button></div><div v-if="isExampleVisible && isCardFlipped" class="example-box"><p><strong>FR:</strong> {{ currentWord.exampleFrench }} <button @click.stop="speak(currentWord.exampleFrench, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></p><p><strong>DE:</strong> {{ currentWord.exampleGerman }}</p></div><div v-if="isCardFlipped" class="mt-4 space-y-2"><p class="text-center text-gray-600 mb-2">Wie gut wusstest du es?</p><div class="grid grid-cols-3 gap-2"><button @click="handleFlashcardFeedback('noIdea')" class="btn-feedback bg-red-500 hover:bg-red-600">Ahnungslos</button><button @click="handleFlashcardFeedback('unsure')" class="btn-feedback bg-orange-500 hover:bg-orange-600">Unsicher</button><button @click="handleFlashcardFeedback('sure')" class="btn-feedback bg-green-500 hover:bg-green-600">Sicher</button></div></div></div>
        <div v-else-if="currentQuizType === 'multipleChoice'" class="flex flex-col"><div class="flex justify-between items-center mb-1"><h3 class="text-lg font-semibold text-slate-700">Multiple Choice</h3><div class="text-xs"><span class="text-green-600 mr-2">Richtig: {{ score.correct }}</span><span class="text-red-500">Falsch: {{ score.incorrect }}</span></div></div><div class="text-center my-4 p-4 bg-sky-50 rounded-lg text-sky-800"><p class="text-sm text-sky-700 mb-1">Wähle die richtige Übersetzung für:</p><p class="text-2xl font-bold">{{ appStore.currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german }}<button v-if="appStore.currentQuizDirection === 'frToDe'" @click.stop="speak(currentWord.french, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></p></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><button v-for="option in multipleChoiceOptions" :key="option" @click="handleMcSelection(option)" :disabled="isAnswered" class="mc-option-button" :class="{ 'mc-correct': isAnswered && wasCorrect && selectedAnswer === option, 'mc-incorrect': isAnswered && !wasCorrect && selectedAnswer === option, 'mc-was-correct': isAnswered && !wasCorrect && option === (appStore.currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french) }">{{ option }}</button></div><div v-if="isAnswered" class="mt-4 text-center"><button v-if="currentWord.exampleFrench" @click="toggleExample" class="btn-example mb-2">{{ isExampleVisible ? 'Verbergen' : 'Beispiel' }}</button></div><div v-if="isExampleVisible && isAnswered" class="example-box"><p><strong>FR:</strong> {{ currentWord.exampleFrench }} <button @click.stop="speak(currentWord.exampleFrench, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></p><p><strong>DE:</strong> {{ currentWord.exampleGerman }}</p></div><div class="mt-4 text-center min-h-[50px]"><button v-if="isAnswered" @click="nextQuestion" class="btn-primary">Nächste Frage</button></div></div>
        <div v-else-if="currentQuizType === 'manualInput'" class="flex flex-col"><div class="flex justify-between items-center mb-1"><h3 class="text-lg font-semibold text-slate-700">Manuelle Eingabe</h3><div class="text-xs"><span class="text-green-600 mr-2">Richtig: {{ score.correct }}</span><span class="text-red-500">Falsch: {{ score.incorrect }}</span></div></div><div class="text-center my-4 p-4 bg-sky-50 rounded-lg text-sky-800"><p class="text-sm text-sky-700 mb-1">Gib die richtige Übersetzung ein für:</p><p class="text-2xl font-bold">{{ appStore.currentQuizDirection === 'frToDe' ? currentWord.french : currentWord.german }}<button v-if="appStore.currentQuizDirection === 'frToDe'" @click.stop="speak(currentWord.french, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></p></div><input type="text" id="answerInput" v-model="manualInputValue" @keyup.enter="handleManualSubmit" :disabled="isAnswered" class="manual-input" :lang="appStore.currentQuizDirection === 'deToFr' ? 'fr' : 'de'" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div v-if="appStore.currentQuizDirection === 'deToFr'" class="mt-3 flex flex-wrap justify-center gap-2"><button v-for="char in specialChars" :key="char" @click="addSpecialChar(char)" class="special-char-btn">{{ char }}</button></div><div class="mt-4 text-center min-h-[60px]"><div v-if="isAnswered"><p v-if="wasCorrect" class="feedback-correct">Richtig!</p><div v-else><p class="feedback-incorrect">Falsch. Richtig war: <strong>{{ appStore.currentQuizDirection === 'frToDe' ? currentWord.german : currentWord.french }}<button v-if="appStore.currentQuizDirection === 'deToFr'" @click.stop="speak(currentWord.french, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></strong></p><button @click="overrideAnswer" class="btn-override">Als richtig markieren</button></div><button v-if="currentWord.exampleFrench" @click="toggleExample" class="btn-example mt-2">{{ isExampleVisible ? 'Verbergen' : 'Beispiel' }}</button></div></div><div v-if="isExampleVisible && isAnswered" class="example-box"><p><strong>FR:</strong> {{ currentWord.exampleFrench }} <button @click.stop="speak(currentWord.exampleFrench, $event)" class="speaker-btn" v-html="speakerIconSvg"></button></p><p><strong>DE:</strong> {{ currentWord.exampleGerman }}</p></div><div class="mt-4 text-center"><button v-if="!isAnswered" @click="handleManualSubmit" class="btn-primary w-full">Antwort prüfen</button><button v-if="isAnswered" @click="nextQuestion" class="btn-primary w-full">Nächste Frage</button></div></div>
        <button @click="quitQuiz" class="btn-neutral mt-8 w-full">Quiz abbrechen</button>
    </div>
    <div v-else class="text-center flex-grow flex flex-col justify-center items-center">
      <h2 class="text-3xl font-bold text-slate-800 mb-4">Runde beendet!</h2>
      <div v-if="incorrectWords.length > 0" class="w-full">
        <p class="text-lg text-gray-700 mb-2">Dein Ergebnis:</p><p class="text-4xl font-bold my-2 text-blue-600">{{ score.correct }} / {{ appStore.initialQuizWordCount }}</p>
        <p class="text-lg text-gray-700 my-4">Du hattest {{ incorrectWords.length }} Fehler.</p>
      </div>
      <div v-else class="w-full">
        <CelebrationAnimation />
        <p class="text-xl font-semibold text-green-600 mb-4">Perfekt! Kapitel abgeschlossen!</p>
        <div class="score-box">
            <div v-if="currentQuizType === 'flashcards'"><p><span class="text-green-600">Sicher:</span> {{ sureCount }}</p><p><span class="text-orange-500">Unsicher:</span> {{ unsureCount }}</p><p><span class="text-red-500">Ahnungslos:</span> {{ noIdeaCount }}</p></div>
            <div v-else><p><span class="text-green-600">Richtig:</span> {{ score.correct }}</p><p><span class="text-red-500">Falsch:</span> {{ score.incorrect }}</p></div>
        </div>
      </div>
      <div class="mt-6 space-y-3 w-full max-w-sm">
          <button v-if="incorrectWords.length > 0" @click="startReview" class="btn btn-primary w-full">Die {{ incorrectWords.length }} Fehler nochmal üben</button>
          <button @click="restartQuiz" class="btn btn-primary-light w-full">Komplette Lektion wiederholen</button>
          <button @click="goToLearnOptions" class="btn btn-secondary w-full">Zurück zum Lernmodus</button>
          <button @click="goToChapterSelection" class="btn btn-secondary w-full">Zurück zur Kapitelwahl</button>
          <button @click="quitQuiz" class="btn btn-neutral w-full">Zurück zur Startseite</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.example-box { background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-top: 1rem; font-size: 0.9rem; line-height: 1.5; }
.speaker-btn { background: none; border: none; padding: 0; margin: 0 0 0 0.25rem; cursor: pointer; color: #6b7280; display: inline-flex; align-items: center; vertical-align: middle; }
.speaker-btn:hover { color: #3b82f6; }
.btn-example { background-color: #e5e7eb; color: #374151; border: 1px solid #d1d5db; padding: 0.25rem 0.75rem; font-size: 0.8rem; border-radius: 9999px; }
.flashcard { background-color: #f0f9ff; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 200px; cursor: pointer; border: 1px solid #bee3f8; user-select: none; }
.btn-feedback { color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
.btn-neutral { background-color: #6c757d; color: white; padding: 0.75rem; border-radius: 6px; border: none; transition: background-color 0.2s; font-weight: 500; }
.btn-neutral:hover { background-color: #5a6268; }
.btn-primary { background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; font-weight: 500; }
.btn-primary:hover { background-color: #2563eb; }
.btn-primary-light { background-color: #60a5fa; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; font-weight: 500; }
.btn-primary-light:hover { background-color: #3b82f6; }
.btn-secondary { background-color: #6b7280; color: white; font-weight: 500; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; }
.btn-secondary:hover { background-color: #4b5563; }
.mc-option-button { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; background-color: #fff; text-align: center; transition: all 0.2s; }
.mc-option-button:disabled { cursor: not-allowed; opacity: 0.8; }
.mc-option-button:not(:disabled):hover { background-color: #f3f4f6; border-color: #9ca3af; }
.mc-correct { background-color: #d1fae5 !important; border-color: #10b981 !important; color: #065f46 !important; font-weight: bold; }
.mc-incorrect { background-color: #fee2e2 !important; border-color: #ef4444 !important; color: #991b1b !important; }
.mc-was-correct { background-color: #d1fae5 !important; border-color: #10b981 !important; color: #065f46 !important; opacity: 0.7; }
.manual-input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1.1rem; text-align: center; }
.manual-input:disabled { background-color: #f3f4f6; }
.special-char-btn { background-color: #e5e7eb; border: 1px solid #d1d5db; padding: 0.4rem 0.8rem; border-radius: 4px; }
.special-char-btn:hover { background-color: #d1d5db; }
.feedback-correct { font-weight: bold; color: #16a34a; }
.feedback-incorrect { font-weight: bold; color: #dc2626; }
.btn-override { background: none; border: none; color: #60a5fa; text-decoration: underline; font-size: 0.8rem; cursor: pointer; margin-top: 0.25rem; }
.score-box { background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem 1.5rem; margin: 1rem auto; max-width: 250px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.score-box p { font-size: 1.1rem; line-height: 1.6; }
</style>
