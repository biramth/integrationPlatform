const { PDFParse } = require('pdf-parse');
const sharp = require('sharp');
const { createWorker, PSM } = require('tesseract.js');
const { DEPARTMENT_LABELS } = require('../constants/departments');

// Seuil sous lequel on considère qu'une page n'a pas de couche texte exploitable
// (PDF scanné) : les vrais PDF texte ont largement plus que ça par page, un PDF
// scanné (image plein cadre par page) ressort à ~0.
const MIN_CHARS_PER_PAGE = 40;

// Documents réels observés (listes d'admission ESP Dakar) : des scans (Xerox/Visioneer),
// sans aucune couche texte. On bascule alors sur l'OCR page par page. L'entête et les
// titres de section ("Département X", "LISTE PRINCIPALE...") ressortent fiables à l'OCR ;
// les lignes du tableau, elles, restent imparfaites (grille qui traverse les caractères) —
// la relecture/correction avant import reste indispensable, ce n'est pas juste une sécurité.
async function extractTextViaOcr(parser, totalPages) {
  const worker = await createWorker('fra');
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' });
    let fullText = '';
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const images = await parser.getImage({ first: pageNum, last: pageNum, imageBuffer: true });
      const pageImages = images.pages[0]?.images || [];
      for (const image of pageImages) {
        const processed = await sharp(Buffer.from(image.data))
          .grayscale()
          .normalize()
          .threshold(170)
          .png()
          .toBuffer();
        const { data } = await worker.recognize(processed);
        fullText += `${data.text}\n`;
      }
    }
    return fullText;
  } finally {
    await worker.terminate();
  }
}

async function extractText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const avgCharsPerPage = textResult.text.replace(/\s/g, '').length / Math.max(textResult.total, 1);
    if (avgCharsPerPage >= MIN_CHARS_PER_PAGE) {
      return textResult.text;
    }
    return await extractTextViaOcr(parser, textResult.total);
  } finally {
    await parser.destroy();
  }
}

function detectDepartment(text) {
  const match = text.match(/D[ée]partement\s*:?\s*([A-ZÉÈÀÂÎÔÛÇa-zéèàâîôûç' ]+)/);
  if (!match) return null;
  const raw = match[1].trim().toLowerCase();
  for (const [code, label] of Object.entries(DEPARTMENT_LABELS)) {
    if (raw.startsWith(label.toLowerCase()) || label.toLowerCase().startsWith(raw)) {
      return code;
    }
  }
  return null;
}

function normalizeDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

// Une ligne de tableau du PDF admis : # | Prénom(s) Nom (bloc concaténé) | Date de
// naissance (JJ/MM/AAAA) | Lieu de Naissance | Série BAC | Mention. On ancre sur les
// motifs les plus fiables (rang, date, série) pour isoler les colonnes ; toute ligne
// hors tableau (en-têtes, "Arrêté la liste...", signatures) ne matche naturellement pas.
const ROW_RE = /^(\d{1,4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(S\d[A-Z0-9]?)\b/;

// Prénom(s) et Nom sont concaténés sans séparateur fiable. Heuristique : le plus long
// suffixe de mots entièrement en majuscules est le Nom, le reste le Prénom — vérifiée
// correcte sur la majorité des lignes d'un exemple réel, mais pas fiable à 100 % (un
// prénom parfois aussi en majuscules) : la relecture admin avant confirmation corrige
// les rares erreurs.
function splitNameBlock(block) {
  const words = block.trim().split(/\s+/);
  const isUpperWord = (w) => w === w.toUpperCase() && /[A-ZÀ-ÝŸ]/.test(w);

  let splitIdx = words.length;
  for (let i = words.length - 1; i >= 0; i--) {
    if (isUpperWord(words[i])) {
      splitIdx = i;
    } else {
      break;
    }
  }
  if (splitIdx === 0 || splitIdx === words.length) {
    splitIdx = Math.max(words.length - 1, 1);
  }

  return {
    firstName: words.slice(0, splitIdx).join(' '),
    lastName: words.slice(splitIdx).join(' '),
  };
}

function parseAdmittedStudentsList(text) {
  const detectedDepartment = detectDepartment(text);
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let currentListType = null;
  const candidates = [];
  let unrecognizedLineCount = 0;

  for (const line of lines) {
    if (/LISTE\s+PRINCIPALE/i.test(line)) {
      currentListType = 'principale';
      continue;
    }
    if (/LISTE\s+D.ATTENTE/i.test(line)) {
      currentListType = 'attente';
      continue;
    }

    const m = line.match(ROW_RE);
    if (!m) continue;
    if (!currentListType) {
      unrecognizedLineCount++;
      continue;
    }

    const [, rankStr, nameBlock, birthDate, birthPlace] = m;
    const { firstName, lastName } = splitNameBlock(nameBlock);
    if (!firstName || !lastName) {
      unrecognizedLineCount++;
      continue;
    }

    candidates.push({
      rank: Number(rankStr),
      firstName,
      lastName,
      birthDate: normalizeDate(birthDate),
      birthPlace: birthPlace.trim(),
      listType: currentListType,
    });
  }

  return { detectedDepartment, candidates, unrecognizedLineCount };
}

// Pas d'exemple réel fourni pour ce type de document : heuristique générique sur un
// motif "label genre capacité [bâtiment]" par ligne. La relecture admin avant
// confirmation absorbe les écarts avec un format inconnu.
const ROOM_ROW_RE = /^([A-Za-z0-9][A-Za-z0-9\-]{0,9})\s+([MFmf])\s+(\d{1,3})(?:\s+(.+))?$/;

function parseRoomsList(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const candidates = [];
  let unrecognizedLineCount = 0;

  for (const line of lines) {
    const m = line.match(ROOM_ROW_RE);
    if (!m) {
      unrecognizedLineCount++;
      continue;
    }
    candidates.push({
      label: m[1],
      gender: m[2].toUpperCase(),
      capacity: Number(m[3]),
      building: m[4] ? m[4].trim() : null,
    });
  }

  return { candidates, unrecognizedLineCount };
}

module.exports = { extractText, parseAdmittedStudentsList, parseRoomsList };
