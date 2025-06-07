// js/ui/views.js
// Diese Datei bündelt und exportiert alle Ansichts-Funktionen aus den Unterdateien.
// So müssen andere Teile der App ihre Importe nicht ändern.

export * from './views/commonComponents.js';
export * from './views/homeScreen.js';
export * from './views/chapterScreens.js';
export * from './views/vocabListScreen.js';
export * from './views/quizScreens.js';

// Exportiere die Haupt-Render-Funktion aus dem neuen Renderer
export { renderApp } from './renderer.js';