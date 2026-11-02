const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const HEX_LITERAL = /\b0x[0-9a-f]+\b/gi;
const NUMBER = /\d+/g;
/** Chrome and Safari frames start with "at "; Firefox frames look like "fn@url:line:col". */
const CHROME_FRAME = /^\s*at\s/;
const FIREFOX_FRAME = /^\S*@\S+:\d+(?::\d+)?$/;
const ORIGIN = /https?:\/\/[^\s/)]+/g;
const LINE_AND_COLUMN = /:\d+(?::\d+)?/g;
/** Vite appends a content hash to asset names (`index-AbCdEf12.js`); it changes on every deploy. */
const ASSET_HASH = /-[\w-]{6,}(?=\.(?:js|mjs|css)\b)/g;

/** Message with numbers and ids removed, so "User 12 failed" and "User 99 failed" cluster together. */
const normalizeMessage = (message: string): string =>
  message
    .replace(UUID, "#")
    .replace(HEX_LITERAL, "#")
    .replace(NUMBER, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

/** First stack frame without origin, line numbers and asset hashes, so it survives a redeploy. */
const normalizeTopFrame = (stack: string | undefined): string => {
  const frame = stack
    ?.split("\n")
    .find((line) => CHROME_FRAME.test(line) || FIREFOX_FRAME.test(line.trim()));
  if (!frame) {
    return "";
  }
  return frame.trim().replace(ORIGIN, "").replace(LINE_AND_COLUMN, "").replace(ASSET_HASH, "");
};

/** 53-bit string hash (cyrb53): fast, synchronous, no dependency. Not for security. */
const cyrb53 = (input: string): number => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Cluster key for one kind of error: the same bug gives the same hash across users, page loads
 * and deploys. 14 hex characters, within the 8 to 128 the database accepts.
 */
export const getErrorHash = (message: string, stack: string | undefined): string =>
  cyrb53(`${normalizeMessage(message)}\n${normalizeTopFrame(stack)}`)
    .toString(16)
    .padStart(14, "0");
