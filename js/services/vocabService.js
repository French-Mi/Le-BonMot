// js/services/vocabService.js
import { structuredVocabData } from '../data/index.js';

// Die Funktion gibt jetzt einfach das komplett zusammengesetzte Objekt zurück.
export function getMergedVocabData() {
    return structuredVocabData;
}