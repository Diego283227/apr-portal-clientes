import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', { 
    style: 'currency', 
    currency: 'CLP' 
  }).format(amount)
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CL')
}

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('es-CL')
}

export const formatRUT = (rut: string): string => {
  if (!rut || typeof rut !== 'string') return ''
  
  const cleanRUT = rut.replace(/[^0-9kK]/g, '')
  if (cleanRUT.length <= 1) return cleanRUT
  
  const body = cleanRUT.slice(0, -1)
  const verifier = cleanRUT.slice(-1).toUpperCase()
  
  const formattedBody = body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  return `${formattedBody}-${verifier}`
}

export const formatRUTInput = (value: string): string => {
  let cleaned = value.replace(/[^0-9kK]/g, '')
  if (cleaned.length === 0) return ''
  
  // Limit maximum length: 8 digits + 1 verifier = 9 total
  if (cleaned.length > 9) {
    cleaned = cleaned.slice(0, 9)
  }
  
  if (cleaned.length <= 8) {
    const body = cleaned
    // Format with dots but respect maximum lengths per section
    if (body.length <= 2) {
      return body
    } else if (body.length <= 5) {
      return `${body.slice(0, 2)}.${body.slice(2)}`
    } else {
      return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}`
    }
  } else {
    const body = cleaned.slice(0, -1)
    const verifier = cleaned.slice(-1).toUpperCase()
    
    // Ensure body doesn't exceed 8 digits
    const limitedBody = body.slice(0, 8)
    
    let formattedBody = ''
    if (limitedBody.length <= 2) {
      formattedBody = limitedBody
    } else if (limitedBody.length <= 5) {
      formattedBody = `${limitedBody.slice(0, 2)}.${limitedBody.slice(2)}`
    } else {
      formattedBody = `${limitedBody.slice(0, 2)}.${limitedBody.slice(2, 5)}.${limitedBody.slice(5)}`
    }
    
    return `${formattedBody}-${verifier}`
  }
}

export const validateRUT = (rut: string): boolean => {
  const cleanRUT = rut.replace(/[^0-9kK]/g, '')
  if (cleanRUT.length < 2) return false
  
  const body = cleanRUT.slice(0, -1)
  const verifier = cleanRUT.slice(-1).toUpperCase()
  
  let sum = 0
  let multiplier = 2
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const remainder = sum % 11
  const calculatedVerifier = remainder < 2 ? remainder.toString() : remainder === 10 ? 'K' : (11 - remainder).toString()
  
  return calculatedVerifier === verifier
}

export const calculateRUTVerifier = (rutBody: string): string => {
  const cleanBody = rutBody.replace(/[^0-9]/g, '')

  let sum = 0
  let multiplier = 2

  for (let i = cleanBody.length - 1; i >= 0; i--) {
    sum += parseInt(cleanBody[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = sum % 11
  const verifier = 11 - remainder

  if (verifier === 11) return '0'
  if (verifier === 10) return 'K'
  return verifier.toString()
}

export const validateStrictRUT = (rut: string): boolean => {
  if (!rut || typeof rut !== 'string') return false
  
  // Exact pattern: 1-2 digits, dot, exactly 3 digits, dot, exactly 3 digits, dash, 1 digit or K
  const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/
  if (!rutRegex.test(rut)) return false
  
  // Split and validate each part
  const parts = rut.split(/[\.\-]/)
  if (parts.length !== 4) return false
  
  const [firstPart, secondPart, thirdPart, verifierPart] = parts
  
  // First part: 1-2 digits maximum
  if (firstPart.length < 1 || firstPart.length > 2 || !/^\d+$/.test(firstPart)) return false
  
  // Second part: exactly 3 digits
  if (secondPart.length !== 3 || !/^\d+$/.test(secondPart)) return false
  
  // Third part: exactly 3 digits  
  if (thirdPart.length !== 3 || !/^\d+$/.test(thirdPart)) return false
  
  // Verifier: exactly 1 character (0-9 or K)
  if (verifierPart.length !== 1) return false
  const verifier = verifierPart.toUpperCase()
  if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'].includes(verifier)) {
    return false
  }

  // Format is valid - accept any digit 0-9 or K as verifier
  // No mathematical validation, just format validation
  return true
}

export const isOverdue = (fechaVencimiento: string): boolean => {
  return new Date(fechaVencimiento) < new Date()
}

export const getDaysUntilDue = (fechaVencimiento: string): number => {
  const today = new Date()
  const dueDate = new Date(fechaVencimiento)
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const getStatusColor = (estado: string): string => {
  switch (estado) {
    case 'pagada':
    case 'completado':
      return 'text-green-600'
    case 'pendiente':
      return 'text-yellow-600'
    case 'vencida':
    case 'fallido':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export const generateBoletaNumber = (): string => {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${month}${random}`
}

export const generateCodigoSocio = (): string => {
  const prefix = 'SOC'
  const number = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${prefix}${number}`
}

export const downloadFile = (data: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Numbers to words mapping for Chilean Spanish
const numberWords = {
  0: 'cero', 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 
  5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve',
  10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 
  15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
  20: 'veinte', 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta',
  60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa',
  100: 'cien', 200: 'doscientos', 300: 'trescientos', 400: 'cuatrocientos',
  500: 'quinientos', 600: 'seiscientos', 700: 'setecientos', 800: 'ochocientos', 900: 'novecientos',
  1000: 'mil'
}

const convertNumberToWords = (num: number): string => {
  if (num === 0) return numberWords[0];
  if (num < 20) return numberWords[num as keyof typeof numberWords] || num.toString();
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const ones = num % 10;
    if (ones === 0) return numberWords[tens as keyof typeof numberWords];
    return `${numberWords[tens as keyof typeof numberWords]} y ${numberWords[ones as keyof typeof numberWords]}`;
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100) * 100;
    const remainder = num % 100;
    if (remainder === 0) return numberWords[hundreds as keyof typeof numberWords];
    if (hundreds === 100) return `ciento ${convertNumberToWords(remainder)}`;
    return `${numberWords[hundreds as keyof typeof numberWords]} ${convertNumberToWords(remainder)}`;
  }
  if (num < 10000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    let result = thousands === 1 ? 'mil' : `${convertNumberToWords(thousands)} mil`;
    if (remainder > 0) result += ` ${convertNumberToWords(remainder)}`;
    return result;
  }
  return num.toString(); // For larger numbers, just return as string
}

export const rutToWords = (rut: string): string => {
  if (!rut || typeof rut !== 'string') return '';
  
  const cleanRUT = rut.replace(/[^0-9kK]/g, '');
  if (cleanRUT.length < 2) return rut;
  
  const body = cleanRUT.slice(0, -1);
  const verifier = cleanRUT.slice(-1).toUpperCase();
  
  try {
    const bodyNumber = parseInt(body);
    const bodyWords = convertNumberToWords(bodyNumber);
    const verifierWord = verifier === 'K' ? 'ka' : convertNumberToWords(parseInt(verifier));
    
    return `${bodyWords} guión ${verifierWord}`;
  } catch (error) {
    return rut; // Return original if conversion fails
  }
}

export const speakRUT = (rut: string): void => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(rutToWords(rut));
    utterance.lang = 'es-ES';
    utterance.rate = 0.8; // Slightly slower for clarity
    speechSynthesis.speak(utterance);
  }
}
