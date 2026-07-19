export interface InvoiceMaterialCandidate {
  name: string;
  quantity: number;
  unit: string;
}

const KNOWN_UNITS = ['un', 'unid', 'und', 'pc', 'pç', 'kg', 'g', 'l', 'ml', 'm', 'm2', 'm²', 'm3', 'm³', 'sc', 'sac', 'cx', 'rl', 'pct', 'ton', 'mil', 'par', 'jg'];

/**
 * Executa OCR (reconhecimento de texto) numa imagem de nota fiscal usando
 * Tesseract.js, 100% no dispositivo (nada é enviado pra fora).
 */
export async function extractInvoiceText(imageDataUrl: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  try {
    const { data } = await worker.recognize(imageDataUrl);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

function toNumber(raw: string): number {
  // Números em nota fiscal BR: milhar com ponto, decimal com vírgula (1.234,56)
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

/**
 * ==========================================================================
 * FORMATO PADRÃO ESPERADO — Nota Fiscal / DANFE (tabela de itens)
 * ==========================================================================
 * Cada linha de item segue esta ordem fixa de colunas, separadas por
 * espaços (o layout mais comum em DANFE de materiais de construção):
 *
 *   CÓDIGO   DESCRIÇÃO DO PRODUTO         NCM      CST  CFOP  UN   QTD      VL.UNIT   VL.TOTAL
 *   001      CIMENTO CP II 32 50KG        25232900 060  5102  SC   50,000   32,50     1.625,00
 *   002      AREIA MEDIA LAVADA           25059000 060  5102  M3   10,000   85,00     850,00
 *   003      TIJOLO CERAMICO 9 FUROS      69041000 060  5102  MIL  5,000    680,00    3.400,00
 *   004      VERGALHAO CA-50 10MM         72142000 060  5102  UN   120,000  18,90     2.268,00
 *
 * Essa é a estrutura que o parser abaixo tenta casar primeiro (mais
 * precisa). Se a nota não seguir esse layout, cai automaticamente no modo
 * genérico (heurística por "quantidade + unidade + descrição" em qualquer
 * ordem). Em ambos os casos, o usuário sempre revisa antes de importar.
 * ==========================================================================
 */
const unitPattern = KNOWN_UNITS.join('|');

// CÓDIGO  DESCRIÇÃO  NCM(7-8)  CST(2-3)  CFOP(4)  UN  QTD  VL.UNIT  VL.TOTAL
const DANFE_ITEM_PATTERN = new RegExp(
  `^\\s*(\\d{2,6})\\s+(.{3,60}?)\\s+(\\d{7,8})\\s+(\\d{2,3})\\s+(\\d{4})\\s+(${unitPattern})\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s*$`,
  'i'
);

// Variante mais curta, sem NCM/CST/CFOP legível (comum quando o OCR perde colunas):
// CÓDIGO  DESCRIÇÃO  UN  QTD  VL.UNIT  VL.TOTAL
const DANFE_ITEM_PATTERN_SHORT = new RegExp(
  `^\\s*(\\d{2,6})\\s+(.{3,60}?)\\s+(${unitPattern})\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s*$`,
  'i'
);

function parseDanfeFormat(lines: string[]): InvoiceMaterialCandidate[] {
  const candidates: InvoiceMaterialCandidate[] = [];

  for (const line of lines) {
    let match = line.match(DANFE_ITEM_PATTERN);
    if (match) {
      const quantity = toNumber(match[7]);
      if (!isNaN(quantity) && quantity > 0) {
        candidates.push({ name: match[2].trim(), quantity, unit: match[6].toLowerCase() });
        continue;
      }
    }

    match = line.match(DANFE_ITEM_PATTERN_SHORT);
    if (match) {
      const quantity = toNumber(match[4]);
      if (!isNaN(quantity) && quantity > 0) {
        candidates.push({ name: match[2].trim(), quantity, unit: match[3].toLowerCase() });
      }
    }
  }

  return candidates;
}

/**
 * Modo genérico (fallback): tenta achar "quantidade + unidade + descrição"
 * em qualquer ordem, para notas que não seguem o layout DANFE padrão.
 */
function parseGenericFormat(lines: string[]): InvoiceMaterialCandidate[] {
  const patternQtyFirst = new RegExp(`^([\\d.,]+)\\s*(${unitPattern})\\b\\s+(.{3,})$`, 'i');
  const patternQtyLast = new RegExp(`^(.{3,}?)\\s+([\\d.,]+)\\s*(${unitPattern})\\b`, 'i');

  const candidates: InvoiceMaterialCandidate[] = [];

  for (const line of lines) {
    let match = line.match(patternQtyFirst);
    if (match) {
      const quantity = toNumber(match[1]);
      if (!isNaN(quantity) && quantity > 0) {
        candidates.push({ quantity, unit: match[2].toLowerCase(), name: match[3].trim() });
        continue;
      }
    }

    match = line.match(patternQtyLast);
    if (match) {
      const quantity = toNumber(match[2]);
      if (!isNaN(quantity) && quantity > 0) {
        candidates.push({ quantity, unit: match[3].toLowerCase(), name: match[1].trim() });
      }
    }
  }

  return candidates;
}

/**
 * Extrai os materiais da nota fiscal. Primeiro tenta o formato padrão
 * DANFE (mais preciso); se não encontrar nada nesse formato, cai no modo
 * genérico. Sempre remove duplicados óbvios.
 */
export function parseInvoiceMaterials(rawText: string): InvoiceMaterialCandidate[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  let candidates = parseDanfeFormat(lines);
  if (candidates.length === 0) {
    candidates = parseGenericFormat(lines);
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.name.toLowerCase()}-${c.quantity}-${c.unit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
