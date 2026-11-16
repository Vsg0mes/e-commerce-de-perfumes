/**
 * Valida CPF brasileiro (11 dígitos e dígitos verificadores módulo 11).
 */
export function isValidCpf(rawCpf: string): boolean {
  const digits = rawCpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos (ex.: 00000000000, 11111111111)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcDigit = (sliceLen: number): number => {
    let sum = 0;
    for (let i = 0; i < sliceLen; i++) {
      sum += Number(digits[i]) * (sliceLen + 1 - i);
    }
    const rem = (sum * 10) % 11;
    return rem === 10 ? 0 : rem;
  };

  const d1 = calcDigit(9);
  if (d1 !== Number(digits[9])) return false;

  const d2 = calcDigit(10);
  return d2 === Number(digits[10]);
}
