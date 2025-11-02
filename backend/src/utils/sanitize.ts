/**
 * Sanitization utilities to prevent XSS attacks
 * 
 * These utilities sanitize user input before storing in database
 * to prevent potential XSS vulnerabilities if the data is rendered
 * as HTML in the frontend.
 * 
 * Using a custom implementation instead of isomorphic-dompurify to avoid
 * jsdom compatibility issues with Node.js 18.x
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitize a string by removing HTML tags and potentially dangerous content
 * 
 * @param input - The string to sanitize
 * @param allowHTML - If true, allows safe HTML tags (default: false)
 * @returns Sanitized string
 */
export function sanitizeString(input: string | null | undefined, allowHTML: boolean = false): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (allowHTML) {
    // For allowing HTML, we use a more permissive regex but still remove dangerous tags
    // Remove script, iframe, object, embed, form, input, button, link, style, meta tags
    let sanitized = input.replace(/<(script|iframe|object|embed|form|input|button|link|style|meta)[^>]*>[\s\S]*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(script|iframe|object|embed|form|input|button|link|style|meta)[^>]*\/?>/gi, '');
    
    // Remove dangerous attributes (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Only allow specific safe tags and attributes
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
    const allowedAttrs = ['href', 'title'];
    
    // Remove any tag that's not in the allowed list
    sanitized = sanitized.replace(/<(\/?)(\w+)([^>]*)>/g, (match, closing, tagName, attrs) => {
      const lowerTag = tagName.toLowerCase();
      if (allowedTags.includes(lowerTag)) {
        // Remove dangerous attributes from allowed tags
        // Keep only allowed attributes
        const cleanAttrs = attrs.replace(/(\w+)\s*=\s*["']([^"']*)["']/g, (attrMatch: string, attrName: string) => {
          if (allowedAttrs.includes(attrName.toLowerCase())) {
            return attrMatch;
          }
          return '';
        });
        return `<${closing}${tagName}${cleanAttrs.trim()}>`;
      }
      return ''; // Remove disallowed tags
    });
    
    return sanitized;
  }

  // Strip all HTML tags - only return plain text
  // Remove all HTML tags and decode HTML entities
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities back to normal characters
  sanitized = sanitized.replace(/&amp;/g, '&');
  sanitized = sanitized.replace(/&lt;/g, '<');
  sanitized = sanitized.replace(/&gt;/g, '>');
  sanitized = sanitized.replace(/&quot;/g, '"');
  sanitized = sanitized.replace(/&#039;/g, "'");
  sanitized = sanitized.replace(/&nbsp;/g, ' ');
  
  // Escape any remaining special characters
  return escapeHtml(sanitized);
}

/**
 * Sanitize an object by recursively sanitizing all string values
 * Useful for sanitizing request bodies
 * 
 * @param obj - Object to sanitize
 * @param allowHTML - If true, allows safe HTML tags (default: false)
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowHTML: boolean = false
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, allowHTML) as any;
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value, allowHTML);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: any) =>
          typeof item === 'string'
            ? sanitizeString(item, allowHTML)
            : typeof item === 'object' && item !== null
            ? sanitizeObject(item, allowHTML)
            : item
        ) as any;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize an array of strings
 * 
 * @param inputs - Array of strings to sanitize
 * @param allowHTML - If true, allows safe HTML tags (default: false)
 * @returns Array of sanitized strings
 */
export function sanitizeStringArray(
  inputs: (string | null | undefined)[],
  allowHTML: boolean = false
): string[] {
  return inputs
    .filter((input): input is string => typeof input === 'string')
    .map((input) => sanitizeString(input, allowHTML));
}

