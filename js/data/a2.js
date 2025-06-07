// Diese Datei importiert alle A2-Kapitel und setzt sie zu einem Objekt zusammen.

import { vergangenheit1Vocab } from './a2/vergangenheit1.js';
import { vergangenheit2Vocab } from './a2/vergangenheit2.js'; // NEU
import { dingeUndOrteVocab } from './a2/dinge_und_orte.js';
import { fortbewegungsmittelVocab } from './a2/fortbewegungsmittel.js';
import { vergangenheit3Vocab } from './a2/vergangenheit3.js';

export const a2Data = {
    "Vergangenheit (1)": vergangenheit1Vocab,
    "Vergangenheit (2)": vergangenheit2Vocab, // NEU EINGEFÜGT
    "Dinge und Orte näher beschreiben": dingeUndOrteVocab,
    "Fortbewegungsmittel": fortbewegungsmittelVocab,
    "Vergangenheit (3)": vergangenheit3Vocab
};