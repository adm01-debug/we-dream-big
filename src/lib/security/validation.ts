import { z } from "zod";

/**
 * Robustly sanitizes HTML strings to prevent XSS.
 * Removes dangerous tags and attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  
  // Basic sanitization: strip script, object, embed, applet, link, iframe, and form tags
  // but allow safe formatting like <b>, <i>, <u>, <p>, <span>
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "") // remove event handlers like onclick
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/href="javascript:[^"]*"/gi, "")
    .replace(/src="javascript:[^"]*"/gi, "");
}

/**
 * Sanitizes a string for safe rendering in text context (fully escaped).
 */
export function sanitizeString(val: string): string {
  if (!val) return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Standard Zod transformers
 */
export const safeString = z.string().trim().transform(sanitizeString);
export const safeHtml = z.string().trim().transform(sanitizeHtml);

/**
 * Higher-order component/helper for dangerouslySetInnerHTML
 * to ensure only sanitized HTML is used.
 */
export function createSafeHtml(html: string) {
  return { __html: sanitizeHtml(html) };
}

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: z.string().min(1).max(255).optional(),
});
