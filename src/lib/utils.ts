import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const prepositions = ['e', 'da', 'de', 'do', 'das', 'dos'];

export function formatName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
