/**
 * Utilities for validating and working with Chilean RUT (Rol Único Tributario)
 * 
 * RUT format: 12345678-9 (8 digits + dash + 1 digit/K)
 * The last digit is a check digit (dígito verificador)
 */

/**
 * Remove all non-alphanumeric characters from RUT and convert to uppercase
 */
export function cleanRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Calculate the check digit (dígito verificador) for a RUT number
 * 
 * Algorithm:
 * 1. Reverse the RUT number (without check digit)
 * 2. Multiply each digit by its position in a sequence (2,3,4,5,6,7,2,3,4...)
 * 3. Sum all products
 * 4. Calculate remainder when divided by 11
 * 5. Subtract from 11
 * 6. If result is 11, return 0; if 10, return 'K'; otherwise return the number
 * 
 * @param rutNumber - RUT number without check digit (e.g., "12345678")
 * @returns Check digit as string ('0'-'9' or 'K')
 */
export function calculateCheckDigit(rutNumber: string): string {
  const cleaned = cleanRUT(rutNumber);
  const numbers = cleaned.replace(/[kK]$/, ''); // Remove existing check digit if present
  
  if (!numbers || !/^\d+$/.test(numbers)) {
    throw new Error('RUT number must contain only digits');
  }

  let sum = 0;
  let multiplier = 2;

  // Process from right to left (reversed)
  for (let i = numbers.length - 1; i >= 0; i--) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit === 11) return '0';
  if (checkDigit === 10) return 'K';
  return checkDigit.toString();
}

/**
 * Validate RUT format (must match pattern: digits-digits-verifier)
 */
export function isValidRUTFormat(rut: string): boolean {
  // Pattern: 7-8 digits, dash, 1 digit or K
  const rutPattern = /^\d{7,8}-[\dkK]$/;
  return rutPattern.test(rut);
}

/**
 * Validate RUT by checking format and verifying the check digit
 * 
 * @param rut - Full RUT with check digit (e.g., "12345678-9")
 * @returns true if RUT is valid, false otherwise
 */
export function validateRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  // Check format
  if (!isValidRUTFormat(rut)) {
    return false;
  }

  // Extract number and check digit
  const cleaned = cleanRUT(rut);
  const number = cleaned.slice(0, -1);
  const providedCheckDigit = cleaned.slice(-1).toUpperCase();

  // Calculate expected check digit
  const expectedCheckDigit = calculateCheckDigit(number);

  // Compare
  return providedCheckDigit === expectedCheckDigit;
}

/**
 * Format RUT with dots and dash (e.g., "12.345.678-9")
 * 
 * @param rut - RUT string (with or without formatting)
 * @returns Formatted RUT string
 */
export function formatRUT(rut: string): string {
  const cleaned = cleanRUT(rut);
  
  if (cleaned.length < 2) {
    return rut; // Return original if too short
  }

  const number = cleaned.slice(0, -1);
  const checkDigit = cleaned.slice(-1);

  // Add dots every 3 digits from right to left
  const formattedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedNumber}-${checkDigit}`;
}

/**
 * Extract and validate RUT from various input formats
 * Useful for processing user input that may have different formats
 * 
 * @param input - RUT input in any format
 * @returns Cleaned and validated RUT string, or null if invalid
 */
export function extractAndValidateRUT(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove all non-alphanumeric except K
  const cleaned = cleanRUT(input);
  
  // Must have at least 8 characters (7 digits + 1 check digit minimum)
  if (cleaned.length < 8 || cleaned.length > 9) {
    return null;
  }

  // Reconstruct with dash
  const number = cleaned.slice(0, -1);
  const checkDigit = cleaned.slice(-1);
  const rutWithDash = `${number}-${checkDigit}`;

  // Validate
  if (validateRUT(rutWithDash)) {
    return formatRUT(rutWithDash);
  }

  return null;
}

