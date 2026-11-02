// Recomputes relative Markdown links when a file moves, so `[x](../other/RULE.md)` keeps pointing
// at the same file (or at that file's new home when it moved too).
import {posix} from 'node:path';

const LINK = /(!?\[[^\]\n]*\]\()([^)\s]+)(\))/g;
const NOT_RELATIVE = /^(?:[a-z][\w+.-]*:|#|\/|<)/i;

/**
 * Old target path → new link text, or null to leave the link as written.
 * Only links that resolve to a moved file or an existing file inside the repo are touched;
 * anything else (root-relative style, already broken) is left for the reference rewrite.
 */
function relinkTarget(link, from, to, {moves, pathExists}) {
  if (NOT_RELATIVE.test(link)) return null;
  const [, path, suffix] = /^([^#?]*)(.*)$/.exec(link);
  if (!path) return null;
  const resolved = posix.normalize(posix.join(posix.dirname(from), path));
  if (resolved.startsWith('../')) return null;
  if (posix.dirname(from) === posix.dirname(to) && !moves.has(resolved)) return null;
  const target = moves.get(resolved) ?? (pathExists(resolved) ? resolved : null);
  if (!target) return null;
  const relative = posix.relative(posix.dirname(to), target) || posix.basename(target);
  return relative + suffix;
}

/**
 * Rewrites every relative Markdown link in `text` for a file moving from `from` to `to`.
 * @param {{moves: Map<string, string>, pathExists: (path: string) => boolean}} ctx
 */
export function relinkMarkdown(text, from, to, ctx) {
  return text.replace(LINK, (whole, open, link, close) => {
    const next = relinkTarget(link, from, to, ctx);
    return next === null ? whole : open + next + close;
  });
}
