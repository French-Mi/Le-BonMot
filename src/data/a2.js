// src/data/a2.js
// Diese Datei importiert alle einzelnen A2-Kapitel und setzt sie korrekt zusammen.

import { vergangenheit1Vocab } from './a2/vergangenheit1.js';
import { orte_beschreibenVocab } from './a2/orte_beschreiben.js';
import { fortbewegungVocab } from './a2/fortbewegung.js';
import { vergangenheit2Vocab } from './a2/vergangenheit2.js';
import { vergangenheit3Vocab } from './a2/vergangenheit3.js';
import { feste1_1Vocab } from './a2/feste_1_1.js';
import { feste1_2Vocab } from './a2/feste_1_2.js';
import { feste2Vocab } from './a2/feste_2.js';
import { seineMeinungAusdrueckenVocab } from './a2/seine_meinung_ausdruecken.js';
import { adjektiveA2Vocab } from './a2/adjektive_a2.js';


export const a2Vocab = {
    "Vergangenheit (1)": vergangenheit1Vocab,
    "Dinge und Orte näher beschreiben": orte_beschreibenVocab,
    "Fortbewegungsmittel": fortbewegungVocab,
    "Vergangenheit (2)": vergangenheit2Vocab,
    "Vergangenheit (3)": vergangenheit3Vocab,
    "Feste (1.1)": feste1_1Vocab,
    "Feste (1.2)": feste1_2Vocab,
    "Feste (2)": feste2Vocab,
    "Seine Meinung ausdrücken": seineMeinungAusdrueckenVocab,
    "Adjektive": adjektiveA2Vocab,
};
