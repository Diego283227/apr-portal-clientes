/**
 * Utilidades para validación de RUT chileno
 */

/**
 * Limpia el RUT de puntos y guiones
 */
export function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').trim();
}

/**
 * Formatea un RUT limpio al formato XX.XXX.XXX-X
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);

  if (cleaned.length < 2) return cleaned;

  const dv = cleaned.slice(-1);
  const numbers = cleaned.slice(0, -1);

  // Agregar puntos cada 3 dígitos desde la derecha
  const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}-${dv}`;
}

/**
 * Calcula el dígito verificador de un RUT
 */
export function calculateDV(rut: string): string {
  const cleaned = cleanRut(rut);
  const numbers = cleaned.slice(0, -1);

  let sum = 0;
  let multiplier = 2;

  // Recorrer de derecha a izquierda
  for (let i = numbers.length - 1; i >= 0; i--) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = 11 - remainder;

  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
}

/**
 * Valida que el dígito verificador sea correcto
 */
export function isValidDV(rut: string): boolean {
  const cleaned = cleanRut(rut).toUpperCase();

  if (cleaned.length < 2) return false;

  const providedDV = cleaned.slice(-1);
  const calculatedDV = calculateDV(cleaned);

  return providedDV === calculatedDV;
}

/**
 * Detecta RUTs con dígitos repetidos (11.111.111-1, 22.222.222-2, etc.)
 */
export function isRepeatedDigitsRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  const numbers = cleaned.slice(0, -1);

  // Verificar si todos los dígitos son iguales
  const firstDigit = numbers[0];
  return numbers.split('').every(digit => digit === firstDigit);
}

/**
 * Detecta RUTs secuenciales PERFECTOS (12.345.678, 98.765.432, etc.)
 * Solo rechaza secuencias completas de 7-8 dígitos, no secuencias parciales
 */
export function isPerfectSequentialRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  const numbers = cleaned.slice(0, -1);

  // Solo verificar RUTs de 7-8 dígitos (los más comunes)
  if (numbers.length < 7) return false;

  // Verificar secuencia ascendente PERFECTA
  let isAscending = true;
  for (let i = 1; i < numbers.length; i++) {
    if (parseInt(numbers[i]) !== parseInt(numbers[i - 1]) + 1) {
      isAscending = false;
      break;
    }
  }

  // Verificar secuencia descendente PERFECTA
  let isDescending = true;
  for (let i = 1; i < numbers.length; i++) {
    if (parseInt(numbers[i]) !== parseInt(numbers[i - 1]) - 1) {
      isDescending = false;
      break;
    }
  }

  return isAscending || isDescending;
}

/**
 * Lista de RUTs conocidos como inválidos o de prueba
 * Solo incluye RUTs con dígitos repetidos que son obviamente falsos
 */
const INVALID_RUTS = [
  '11111111-1',
  '22222222-2',
  '33333333-3',
  '44444444-4',
  '55555555-5',
  '66666666-6',
  '77777777-7',
  '88888888-8',
  '99999999-9',
  '00000000-0',
];

/**
 * Valida completamente un RUT chileno
 */
export interface RutValidation {
  isValid: boolean;
  errors: string[];
  formatted?: string;
}

export function validateRut(rut: string): RutValidation {
  const errors: string[] = [];

  if (!rut || rut.trim() === '') {
    errors.push('El RUT es requerido');
    return { isValid: false, errors };
  }

  const cleaned = cleanRut(rut).toUpperCase();

  // Validar longitud mínima y máxima
  if (cleaned.length < 2) {
    errors.push('El RUT es demasiado corto');
  } else if (cleaned.length > 10) {
    errors.push('El RUT es demasiado largo');
  }

  // Validar que contenga solo números y posiblemente K
  const rutRegex = /^\d{1,8}[0-9K]$/;
  if (!rutRegex.test(cleaned)) {
    errors.push('El RUT contiene caracteres inválidos');
  }

  // Validar dígito verificador
  if (!isValidDV(cleaned)) {
    errors.push('El dígito verificador es incorrecto');
  }

  // Validar que no sea un RUT de dígitos repetidos
  if (isRepeatedDigitsRut(cleaned)) {
    errors.push('El RUT no puede tener todos los dígitos iguales');
  }

  // Validar que no sea un RUT secuencial PERFECTO (12.345.678, 98.765.432)
  // RUTs como 21.001.667 o 12.709.794 son válidos porque no son secuencias perfectas
  if (isPerfectSequentialRut(cleaned)) {
    errors.push('El RUT no puede ser una secuencia numérica perfecta');
  }

  // Validar que no esté en la lista de RUTs inválidos conocidos
  const cleanedWithDash = `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  if (INVALID_RUTS.includes(cleanedWithDash)) {
    errors.push('Este RUT no es válido');
  }

  // Validar rango razonable (entre 1.000.000 y 50.000.000)
  const rutNumber = parseInt(cleaned.slice(0, -1));
  if (rutNumber < 1000000) {
    errors.push('El RUT es demasiado bajo para ser válido');
  } else if (rutNumber > 50000000) {
    errors.push('El RUT es demasiado alto para ser válido');
  }

  return {
    isValid: errors.length === 0,
    errors,
    formatted: errors.length === 0 ? formatRut(cleaned) : undefined
  };
}

/**
 * Hook de React para validación de RUT en tiempo real
 */
export function useRutValidation(rut: string) {
  const validation = validateRut(rut);

  return {
    ...validation,
    formatted: validation.formatted || (rut ? formatRut(rut) : '')
  };
}
