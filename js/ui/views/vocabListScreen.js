// js/ui/views/vocabListScreen.js
import { state, setState } from '../../state.js';
import { DOM } from '../domElements.js';
import { showMessage } from '../notifications.js';
import { renderApp } from '../renderer.js';
import { speakFrench } from '../../services/speechService.js';
import { toggleExample } from './commonComponents.js';

export function renderVocabListScreen() {
    const { selectedLevel, selectedMainChapter, selectedChapter, vocabDataGlobal } = state;
    const vocabList = selectedMainChapter ? vocabDataGlobal[selectedLevel][selectedMainChapter][selectedChapter] : vocabDataGlobal[selectedLevel][selectedChapter];
    if (!vocabList) {
        showMessage("Vokabeln nicht gefunden.");
        setState({ currentView: 'chapterMenu' });
        renderApp();
        return;
    }
    const speakerIconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle ml-1 mr-1 w-5 h-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>`;
    DOM.appDiv.innerHTML = ` 
        <div> 
            <h2 class="text-2xl font-bold text-slate-800 mb-4">Vokabeln: ${selectedChapter}</h2> 
            <div class="vocab-list-scroll-container"> 
                <ul class="divide-y divide-gray-200"> 
                    ${vocabList.map((v, index) => ` 
                        <li class="p-3"> 
                            <div class="flex justify-between items-center"> 
                                <div> 
                                    <p class="font-semibold text-gray-800">${v.french} <span class="speaker-icon-clickable-area" data-text="${v.french}"> ${speakerIconSvgContent} </span> </p> 
                                    <p class="text-gray-600">${v.german}</p> 
                                </div> 
                                ${((selectedLevel === 'A1' || selectedLevel === 'A2' || selectedLevel === 'Wiederholung' || selectedLevel === 'Lektüren') && v.exampleFrench && v.exampleGerman) ? ` 
                                    <button class="btn-secondary py-1 px-2 text-xs rounded" data-vocab-index="${index}" data-action="toggle-example" data-container-id="vocab-${index}-example">Beispiel</button> 
                                ` : ''} 
                            </div> 
                            <div id="vocab-${index}-example" class="hidden mt-2"></div> 
                        </li> `).join('')} 
                </ul> 
            </div> 
            <button id="backToMenuBtnList" class="btn btn-neutral mt-6">Zurück zum Menü</button> 
        </div>`;
    
    DOM.appDiv.querySelectorAll('.speaker-icon-clickable-area').forEach(span => { span.onclick = (e) => speakFrench(e.currentTarget.dataset.text, e); });
    DOM.appDiv.querySelectorAll('[data-action="toggle-example"]').forEach(button => {
        button.onclick = () => toggleExample(button, button.dataset.containerId);
    });
    document.getElementById('backToMenuBtnList').onclick = () => { setState({ currentView: 'chapterMenu' }); renderApp(); };
}