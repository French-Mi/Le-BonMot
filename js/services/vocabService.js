// js/services/vocabService.js

// NEU: Importiere die Vokabeldaten aus den neuen Modulen
import { structuredVocabData } from '../data/index.js';

// lektuerenData kommt weiterhin aus dem globalen Skript in index.html
export function getMergedVocabData() {
    return {
        ...structuredVocabData, // Dies kommt jetzt aus dem Import
        ...(typeof lektuerenData !== 'undefined' ? lektuerenData : {})
    };
}