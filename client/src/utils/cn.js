// client/src/utils/cn.js
// ShadCN-style className merger — merges Tailwind classes safely
// Requires: clsx + tailwind-merge

export function cn(...inputs) {
  // Simple fallback — filters falsy values and joins
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default cn;
