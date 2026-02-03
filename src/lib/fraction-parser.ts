/**
 * Fraction parser utility for measurement inputs
 * Allows users to enter values like "45/2", "22 1/2", or regular decimals
 */

/**
 * Parse a fraction or mixed number string into a decimal value
 * @param value - Input string that may contain fractions
 * @returns Parsed decimal number or undefined if invalid
 * 
 * @example
 * parseFractionInput("22 1/2") // returns 22.5
 * parseFractionInput("45/2")   // returns 22.5
 * parseFractionInput("22.5")   // returns 22.5
 * parseFractionInput("")       // returns undefined
 */
export function parseFractionInput(value: string): number | undefined {
  if (!value.trim()) return undefined;

  const trimmed = value.trim();

  // Handle "22 1/2" format (mixed number: whole space numerator/denominator)
  const mixedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) return undefined;
    return whole + numerator / denominator;
  }

  // Handle "45/2" format (simple fraction)
  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    if (denominator === 0) return undefined;
    return numerator / denominator;
  }

  // Handle regular decimal or integer
  const num = parseFloat(trimmed);
  return isNaN(num) ? undefined : num;
}

/**
 * Format a number to a display string with reasonable precision
 * @param value - The numeric value
 * @param maxDecimals - Maximum decimal places to show (default 2)
 * @returns Formatted string
 */
export function formatMeasurementValue(value: number | undefined, maxDecimals: number = 2): string {
  if (value === undefined || value === null) return '';
  
  // Round to specified decimals and remove trailing zeros
  const rounded = parseFloat(value.toFixed(maxDecimals));
  return rounded.toString();
}

/**
 * Check if a string looks like a fraction input (contains /)
 * @param value - Input string to check
 * @returns True if the string contains fraction notation
 */
export function isFractionNotation(value: string): boolean {
  return value.includes('/');
}
