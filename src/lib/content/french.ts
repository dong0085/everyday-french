// Small French text helpers shared by the server and the browser.

/** French typography: keep ? ! : ; » glued to the word before, and « to the word after. */
export function frType(s: string): string {
  return s.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
}

/** Lowercase and strip accents, for search. Matches Postgres lower(unaccent()) for French text. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/** Count words in a French line (elided words like j' count with the next word). */
export function wordCount(s: string): number {
  return s
    .replace(/[’']/g, "' ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\d]/u.test(w) && !/^[\p{L}]'$/u.test(w)).length;
}
