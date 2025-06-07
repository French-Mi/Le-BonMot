// Dies ist der Haupt-Verteiler für die Vokabeldaten.

// Die Import-Namen werden an die Namen angepasst, die in Ihren Dateien tatsächlich exportiert werden.
import { grundlagenVocab } from './grundlagen.js'; // Korrigiert von grundlagenData
import { a1Vocab } from './a1.js';             // Korrigiert von a1Data
import { a2Data } from './a2.js';               // Dieser Name ist bereits korrekt

// Die importierten Objekte werden zu einem einzigen Objekt zusammengefügt.
const combinedData = {
    "Grundlagen": grundlagenVocab,
    "A1": a1Vocab,
    "A2": a2Data
};

// Das finale Objekt wird für den Rest der App exportiert.
export const structuredVocabData = combinedData;