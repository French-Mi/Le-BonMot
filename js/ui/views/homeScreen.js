// js/ui/views/homeScreen.js
import { state, setState } from '../../state.js';
import { DOM } from '../domElements.js';
import { startGlobalReview } from '../../quiz/quizManager.js';
import { renderApp } from '../renderer.js';
import { renderProgressTracker } from './commonComponents.js';

export function renderHomeScreen() {
    const { vocabDataGlobal } = state;
    const levels = Object.keys(vocabDataGlobal);
    
    DOM.appDiv.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold text-slate-800 mb-2">Willkommen bei le BonMot!</h2>
            <p class="text-slate-600 mb-6">Bitte wähle dein Niveau aus, um zu starten.</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${levels.map(level => `<button class="btn text-lg py-4 btn-level" data-level="${level}">${level}</button>`).join('')}
            </div>
            <div id="review-errors-container" class="mt-10 pt-6 border-t border-gray-300">
                <h3 class="text-xl font-semibold text-slate-700 mb-4">Fehler wiederholen</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button id="review24h" class="btn btn-secondary">Fehler der letzten 24h</button>
                    <button id="review7d" class="btn btn-secondary">Fehler der letzten 7 Tage</button>
                </div>
            </div>
            ${renderProgressTracker()}
        </div>`;

    DOM.appDiv.querySelectorAll('[data-level]').forEach(button => {
        button.onclick = () => {
            setState({ selectedLevel: button.dataset.level, currentView: 'levelChapterSelection' });
            renderApp();
        };
    });
    document.getElementById('review24h').onclick = () => startGlobalReview(1);
    document.getElementById('review7d').onclick = () => startGlobalReview(7);
}