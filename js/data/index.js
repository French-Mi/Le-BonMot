// Dies ist der Haupt-Verteiler für die Vokabeldaten.

// 1. Die Daten für jedes Niveau werden aus der jeweiligen Datei importiert.
// Die Namen in den { Klammern } entsprechen jetzt exakt Ihren export-Anweisungen.
import { grundlagenVocab } from './grundlagen.js';
import { a1Vocab } from './a1.js';
import { a2Vocab } from './a2.js';

// 2. Die importierten Objekte werden zu einem einzigen Objekt zusammengefügt.
const combinedData = {
    "Grundlagen": grundlagenVocab,
    "A1": a1Vocab,
    "A2": a2Vocab
};

// 3. Das finale Objekt wird für den Rest der App exportiert.
export const structuredVocabData = combinedData;