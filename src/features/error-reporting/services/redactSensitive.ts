const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const SUPABASE_KEY = /\bsb_(?:publishable|secret)_[\w-]+/g;
const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
/** A URL followed by a query or fragment; keeps a trailing `:line:column` from stack frames. */
const URL_QUERY_OR_FRAGMENT = /(https?:\/\/[^\s?#)]+)[?#][^\s):]*/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Removes what must not reach the error log: emails, tokens, Supabase keys, and the query string
 * or fragment of any URL (OAuth callbacks carry codes there). The order matters: tokens go first.
 */
export const redactSensitiveText = (text: string): string =>
  text
    .replace(JWT, "[token]")
    .replace(SUPABASE_KEY, "[key]")
    .replace(BEARER, "Bearer [token]")
    .replace(URL_QUERY_OR_FRAGMENT, "$1")
    .replace(EMAIL, "[email]");

/** Keeps origin and path only. Anything that is not a URL becomes a marker. */
export const sanitizeUrl = (raw: string): string => {
  try {
    const url = new URL(raw);
    const base = url.origin === "null" ? url.protocol : url.origin;
    return `${base}${url.pathname}`;
  } catch {
    return "[invalid-url]";
  }
};
