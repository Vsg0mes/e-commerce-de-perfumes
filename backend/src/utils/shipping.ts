/**
 * Cálculo de frete por faixa de CEP (tabela por região, origem: São Paulo/SP).
 * Para ajustar valores e prazos, edite apenas ZONES abaixo.
 */

export type ShippingZone = 'SP' | 'SUDESTE' | 'SUL' | 'CENTRO_OESTE' | 'NORDESTE' | 'NORTE';

export const ZONES: Record<ShippingZone, { label: string; amount: number; minDays: number; maxDays: number }> = {
  SP: { label: 'São Paulo', amount: 18, minDays: 2, maxDays: 4 },
  SUDESTE: { label: 'Sudeste', amount: 24, minDays: 3, maxDays: 5 },
  SUL: { label: 'Sul', amount: 28, minDays: 4, maxDays: 6 },
  CENTRO_OESTE: { label: 'Centro-Oeste', amount: 32, minDays: 5, maxDays: 7 },
  NORDESTE: { label: 'Nordeste', amount: 38, minDays: 6, maxDays: 9 },
  NORTE: { label: 'Norte', amount: 48, minDays: 8, maxDays: 12 },
};

// [início, fim, UF] — faixas oficiais de CEP por estado
const CEP_RANGES: Array<[number, number, string]> = [
  [1000000, 19999999, 'SP'],
  [20000000, 28999999, 'RJ'],
  [29000000, 29999999, 'ES'],
  [30000000, 39999999, 'MG'],
  [40000000, 48999999, 'BA'],
  [49000000, 49999999, 'SE'],
  [50000000, 56999999, 'PE'],
  [57000000, 57999999, 'AL'],
  [58000000, 58999999, 'PB'],
  [59000000, 59999999, 'RN'],
  [60000000, 63999999, 'CE'],
  [64000000, 64999999, 'PI'],
  [65000000, 65999999, 'MA'],
  [66000000, 68899999, 'PA'],
  [68900000, 68999999, 'AP'],
  [69000000, 69299999, 'AM'],
  [69300000, 69399999, 'RR'],
  [69400000, 69899999, 'AM'],
  [69900000, 69999999, 'AC'],
  [70000000, 72799999, 'DF'],
  [72800000, 76799999, 'GO'],
  [73000000, 73699999, 'DF'],
  [76800000, 76999999, 'RO'],
  [77000000, 77999999, 'TO'],
  [78000000, 78899999, 'MT'],
  [78900000, 78999999, 'RO'],
  [79000000, 79999999, 'MS'],
  [80000000, 87999999, 'PR'],
  [88000000, 89999999, 'SC'],
  [90000000, 99999999, 'RS'],
];

const UF_ZONE: Record<string, ShippingZone> = {
  SP: 'SP',
  RJ: 'SUDESTE', MG: 'SUDESTE', ES: 'SUDESTE',
  PR: 'SUL', SC: 'SUL', RS: 'SUL',
  DF: 'CENTRO_OESTE', GO: 'CENTRO_OESTE', MT: 'CENTRO_OESTE', MS: 'CENTRO_OESTE',
  BA: 'NORDESTE', SE: 'NORDESTE', PE: 'NORDESTE', AL: 'NORDESTE', PB: 'NORDESTE',
  RN: 'NORDESTE', CE: 'NORDESTE', PI: 'NORDESTE', MA: 'NORDESTE',
  PA: 'NORTE', AP: 'NORTE', AM: 'NORTE', RR: 'NORTE', AC: 'NORTE', RO: 'NORTE', TO: 'NORTE',
};

export interface ShippingQuote {
  zipCode: string; // 8 dígitos
  state: string;
  region: string;
  amount: number;
  minDays: number;
  maxDays: number;
}

/** Retorna null se o CEP for inválido ou fora das faixas conhecidas. */
export const calculateShipping = (zipCode: string): ShippingQuote | null => {
  const digits = zipCode.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const n = Number(digits);

  // Faixas mais específicas (DF dentro de GO) têm precedência: escolhe a menor faixa que contém o CEP
  let match: [number, number, string] | undefined;
  for (const r of CEP_RANGES) {
    if (n >= r[0] && n <= r[1] && (!match || r[1] - r[0] < match[1] - match[0])) match = r;
  }
  if (!match) return null;

  const zone = ZONES[UF_ZONE[match[2]]];
  return {
    zipCode: digits,
    state: match[2],
    region: zone.label,
    amount: zone.amount,
    minDays: zone.minDays,
    maxDays: zone.maxDays,
  };
};
