import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names safely for Tailwind. Unlike plain string concatenation,
 * this guarantees that a later conflicting utility (e.g. a custom `bg-black/50`
 * passed via `className`) always wins over an earlier one (e.g. a variant's
 * default `bg-transparent`) — regardless of how Tailwind happens to order
 * the generated CSS in dev vs. a production build.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
