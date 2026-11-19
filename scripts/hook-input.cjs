/**
 * Shared reader for Claude Code hook input (JSON on stdin), used by every hook script in
 * scripts/ (.claude/settings.json `hooks`). Hook contract: code.claude.com/docs/en/hooks.
 */

/**
 * @param {string} raw stdin text
 * @returns {Record<string, any> | null} parsed object, or null when empty or not JSON
 */
function parseHookInput(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {NodeJS.ReadableStream} [stream]
 * @returns {Promise<string>} full stdin text
 */
function readStdin(stream = process.stdin) {
  return new Promise((resolve) => {
    let raw = "";
    stream.on("data", (chunk) => (raw += chunk));
    stream.on("end", () => resolve(raw));
  });
}

module.exports = { parseHookInput, readStdin };
