import type { Db } from "./db.ts";
import { ProcessError } from "./processError.ts";

/**
 * The context a task needs, as links only: Point At stores no files (owner decision 2026-11-20).
 * A result an agent produced (a shortlist, a draft) lives elsewhere and is linked here.
 */
export interface Hyperlink {
  url: string;
  title: string;
}

/** Enough for any one task; a longer list belongs in a linked document. */
export const MAX_HYPERLINKS = 20;

/** Links as JSON on a node read (alias `n`), in the order they were given. */
export const HYPERLINKS_COLUMN = `coalesce((
    select json_agg(json_build_object('url', h.url, 'title', h.title) order by h.position, h.created_at)
    from node_hyperlinks h where h.node_id = n.id), '[]'::json) as links`;

/** A link must be an absolute http(s) URL with a short title. */
function checkHyperlink(link: Hyperlink): Hyperlink {
  const title = link.title?.trim();
  if (!title) throw new ProcessError("Give each link a short title.");
  let url: URL;
  try {
    url = new URL(link.url.trim());
  } catch {
    throw new ProcessError(`"${link.url}" is not a web address.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProcessError(`Links must start with https:// or http://, not ${url.protocol}`);
  }
  return { url: url.toString(), title: title.slice(0, 120) };
}

/** Replace a task's links with `links` (an empty list clears them). */
export async function saveHyperlinks(
  db: Db,
  input: { nodeId: string; links: Hyperlink[]; actor: string }
): Promise<void> {
  if (input.links.length > MAX_HYPERLINKS) {
    throw new ProcessError(`At most ${MAX_HYPERLINKS} links per task; link a document instead.`);
  }
  const checked = input.links.map(checkHyperlink);
  await db.query(`delete from node_hyperlinks where node_id = $1`, [input.nodeId]);
  for (const [position, link] of checked.entries()) {
    await db.query(
      `insert into node_hyperlinks (node_id, url, title, position, created_by)
       values ($1, $2, $3, $4, $5)`,
      [input.nodeId, link.url, link.title, position, input.actor]
    );
  }
}
