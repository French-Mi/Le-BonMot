// js/ui/views/commonComponents.js
import { state } from '../../state.js';
import { speakFrench } from '../../services/speechService.js';
import { calculateLevelInfo } from '../../services/levelingService.js';
import { achievements } from '../../data/achievements.js';

const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;

export function renderStreak(streakTrackerDiv) {
    if (!streakTrackerDiv) return;
    const currentStreak = state.learningProgress.streak.current || 0;
    if (currentStreak > 0) {
        streakTrackerDiv.innerHTML = `🔥 Aktueller Streak: <strong>${currentStreak} ${currentStreak === 1 ? 'Tag' : 'Tage'}</strong>!`;
        streakTrackerDiv.className = 'streak-active';
    } else {
        streakTrackerDiv.innerHTML = `Starte heute eine neue Lernserie!`;
        streakTrackerDiv.className = 'streak-inactive';
    }
}

export function renderProgressTracker() {
    const { totalXp, achievements: unlockedAchievements } = state.learningProgress;
    const { level, currentLevelXp, xpForNextLevel, progressPercentage } = calculateLevelInfo(totalXp);

    const unlockedAchievementDetails = unlockedAchievements
        .map(id => ({ id, ...achievements[id] }))
        .filter(a => a.title);

    return `
        <div id="progress-tracker-container" class="mt-10 pt-6 border-t border-gray-300">
            <h3 class="text-xl font-semibold text-slate-700 mb-4">Dein Fortschritt</h3>
            <div class="mb-4">
                <div class="flex justify-between items-end mb-1">
                    <span class="text-lg font-bold text-blue-600">Level ${level}</span>
                    <span class="text-sm text-gray-500">${currentLevelXp} / ${xpForNextLevel} XP</span>
                </div>
                <div class="progress-bar-bg w-full bg-gray-200 rounded-full h-4"><div class="progress-fill bg-blue-500 h-4 rounded-full" style="width: ${progressPercentage}%"></div></div>
            </div>
            <div id="achievements-container">
                <h4 class="text-md font-semibold text-slate-600 mb-3">Auszeichnungen</h4>
                ${unlockedAchievementDetails.length > 0 ? `
                    <div class="flex flex-wrap gap-4 justify-center">
                        ${unlockedAchievementDetails.map(ach => `
                            <div class="flex flex-col items-center text-center w-20" title="${ach.description}">
                                <i class="${ach.icon} ${ach.color || 'text-gray-600'} text-4xl mb-1"></i>
                                <span class="text-xs font-medium text-gray-700">${ach.title}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `<p class="text-sm text-gray-500 italic">Lerne weiter, um deine ersten Auszeichnungen freizuschalten!</p>`}
            </div>
        </div>
    `;
}

export function renderProgressBar() {
    const { currentQuestionIndex, initialQuizWordCount } = state;
    const progress = initialQuizWordCount > 0 ? ((currentQuestionIndex + 1) / initialQuizWordCount) * 100 : 0;
    return `<div class="mb-3"><div class="flex justify-between mb-1"><span class="text-sm font-medium text-blue-700">Fortschritt</span><span class="text-sm font-medium text-blue-700">${currentQuestionIndex + 1} / ${initialQuizWordCount}</span></div><div class="progress-bar-bg"><div class="progress-fill" style="width: ${progress}%"></div></div></div>`;
}

export function createVocabCelebrationAnimationHTML() {
    let confettiHtml = '';
    const colors = ['#ffc107', '#4A90E2', '#EF4135', '#FFFFFF', '#a855f7', '#22c55e'];
    for (let i = 0; i < 50; i++) {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const animDuration = 1.0 + Math.random() * 0.8;
        const delay = Math.random() * 0.6;
        const rotationStart = Math.random() * 360;
        confettiHtml += `<div class="confetti-vocab" style="left: ${left}%; background-color: ${color}; animation-duration: ${animDuration}s; animation-delay: ${delay}s; transform: rotateZ(${rotationStart}deg) translateY(-20px);"></div>`;
    }
    const logoHtml = `<div class="celebrating-logo-vocab"><div class="speech-bubble-body-vocab"><div class="flag-icon-vocab"><div class="flag-blue-vocab"></div><div class="flag-white-vocab"></div><div class="flag-red-vocab"></div></div></div><div class="speech-bubble-tail-vocab"></div></div>`;
    return `<div class="vocab-celebration-container">${logoHtml}${confettiHtml}</div>`;
}

export function renderExampleSentence(vocabItem, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (vocabItem && typeof vocabItem === 'object' && vocabItem.exampleFrench && vocabItem.exampleGerman) {
        container.innerHTML = `<div class="example-sentence-box"><p class="mb-1"><strong>FR:</strong> ${vocabItem.exampleFrench} <span class="speaker-icon-clickable-area" data-text="${vocabItem.exampleFrench}"> ${speakerIconSvgContent} </span></p><p><strong>DE:</strong> ${vocabItem.exampleGerman}</p></div>`;
        const speakerIcon = container.querySelector('.speaker-icon-clickable-area');
        if (speakerIcon) {
            speakerIcon.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e);
        }
        container.classList.remove('hidden');
    } else {
        container.innerHTML = `<p class="text-gray-500 italic">Kein vollständiger Beispielsatz verfügbar.</p>`;
        container.classList.remove('hidden');
    }
}

export function toggleExample(button, containerId) {
    const exampleContainer = document.getElementById(containerId);
    if (!exampleContainer) return;

    const vocabIndex = button.dataset.vocabIndex ? parseInt(button.dataset.vocabIndex, 10) : undefined;
    let vocabItem;

    if (state.currentView === 'vocabList' && vocabIndex !== undefined) {
        const currentVocabList = state.selectedMainChapter
            ? state.vocabDataGlobal[state.selectedLevel]?.[state.selectedMainChapter]?.[state.selectedChapter]
            : state.vocabDataGlobal[state.selectedLevel]?.[state.selectedChapter];
        if (currentVocabList) vocabItem = currentVocabList[vocabIndex];
    } else if (state.quizWords && state.quizWords.length > 0) {
        vocabItem = state.quizWords[state.currentQuestionIndex];
    }

    if (!vocabItem) {
        exampleContainer.innerHTML = "<p class='text-red-500 italic'>Fehler: Vokabeldaten konnten nicht geladen werden.</p>";
        exampleContainer.classList.remove('hidden');
        return;
    }

    if (exampleContainer.classList.contains('hidden')) {
        renderExampleSentence(vocabItem, containerId);
        button.textContent = 'Verbergen';
    } else {
        exampleContainer.classList.add('hidden');
        exampleContainer.innerHTML = '';
        button.textContent = 'Beispiel';
    }
}