import { grundlagenVocab } from './grundlagen.js';
import { a1Vocab } from './a1.js';
import { a2Data } from './a2.js';
import { lektuerenData } from './lektueren.js';

const combinedData = {
    "Grundlagen": grundlagenVocab,
    "A1": a1Vocab,
    "A2": a2Data,
    "Lektüren": lektuerenData
};

export const structuredVocabData = combinedData;