type ClassValue = string | number | boolean | undefined | null;

export function cn(...inputs: (ClassValue | ClassValue[])[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string") {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    }
  }

  // Basic Tailwind merge - removes conflicting classes (last one wins)
  const merged: string[] = [];
  const seen = new Set<string>();

  for (let i = classes.length - 1; i >= 0; i--) {
    const parts = classes[i].split(/\s+/);
    for (const part of parts) {
      if (!part) continue;
      const base = part.split("-")[0];
      if (!seen.has(base)) {
        merged.unshift(part);
        seen.add(base);
      }
    }
  }

  return merged.join(" ");
}
