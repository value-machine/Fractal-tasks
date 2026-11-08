/**
 * The Point At process rules (documentation/DOC_POINT_AT_PROCESS.md), run against a real
 * Postgres built from our migrations. Expected behaviour comes from the process doc and the
 * migration constraints, not from re-deriving the store code.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { Db } from "./db.ts";
import { createMigratedPglite } from "./pgliteDb.ts";
import { ProcessError, Store } from "./store.ts";

let db: Db;
let reset: () => Promise<void>;
let store: Store;

beforeAll(async () => {
  ({ db, reset } = await createMigratedPglite());
  store = new Store(db);
}, 60_000);
afterAll(async () => db.close());
beforeEach(async () => reset());

const AUTHOR = "agent-a";
const OTHER = "agent-b";

async function rootWithChildren(...titles: string[]) {
  const root = await store.createRoot({ title: "Root goal", labels: ["test"] }, AUTHOR);
  const { children } = await store.split(
    root.id,
    { hypothesis: "These steps reach the goal", children: titles.map((title) => ({ title })) },
    AUTHOR
  );
  return { root, children };
}

const humanLeaf = {
  type: "human" as const,
  done_check: "Sent?",
  who: "Tom",
  what: "Send it",
  how: "By email",
};

describe("roots", () => {
  it("should list a node as a root when it was created with create_root", async () => {
    const { root, children } = await rootWithChildren("Step one");
    const roots = await store.listRoots();
    expect(roots.map((r) => r.id)).toEqual([root.id]);
    expect(root.parent_id).toBeNull();
    expect(children[0].parent_id).toBe(root.id);
  });

  it("should return each root with its own children when loading the tree", async () => {
    const a = await rootWithChildren("A1", "A2");
    const b = await store.createRoot({ title: "Second root" }, AUTHOR);
    const tree = await store.rootsWithChildren();
    expect(tree.find((r) => r.id === a.root.id)?.children.map((c) => c.title)).toEqual([
      "A1",
      "A2",
    ]);
    expect(tree.find((r) => r.id === b.id)?.children).toEqual([]);
  });

  it("should refuse to change a node's parent when the database is updated directly", async () => {
    const { children } = await rootWithChildren("Step one");
    const other = await store.createRoot({ title: "Other root" }, AUTHOR);
    await expect(
      db.query("update nodes set parent_id = $1 where id = $2", [other.id, children[0].id])
    ).rejects.toThrow(/parent_id cannot be changed/);
    await expect(
      db.query("update nodes set parent_id = $1 where id = $2", [children[0].id, other.id])
    ).rejects.toThrow(/parent_id cannot be changed/);
  });
});

describe("leaves and splits", () => {
  it("should mark a split node proposed and give children the parent's labels when splitting", async () => {
    const { root, children } = await rootWithChildren("One", "Two");
    const parent = await store.getNode(root.id);
    expect(parent.status).toBe("proposed");
    expect(parent.split_at).not.toBeNull();
    expect(parent.split_hypothesis).toBe("These steps reach the goal");
    expect(parent.child_count).toBe(2);
    expect(children.every((c) => c.labels.includes("test"))).toBe(true);
  });

  it("should refuse to mark a node as a leaf when it has children", async () => {
    const { root } = await rootWithChildren("One");
    await expect(store.markLeaf(root.id, humanLeaf, AUTHOR)).rejects.toThrow(ProcessError);
  });

  it("should refuse to split a node when it is marked as a leaf", async () => {
    const { children } = await rootWithChildren("One");
    await store.markLeaf(children[0].id, { type: "agent", done_check: "Done?" }, AUTHOR);
    await expect(
      store.split(children[0].id, { hypothesis: "h", children: [{ title: "Sub" }] }, AUTHOR)
    ).rejects.toThrow(/marked as a leaf/);
  });

  it("should allow splitting a former leaf when it is unmarked first", async () => {
    const { children } = await rootWithChildren("One");
    const id = children[0].id;
    await store.markLeaf(id, humanLeaf, AUTHOR);
    const unmarked = await store.update(id, { leaf_type: null }, AUTHOR);
    expect(unmarked.leaf_type).toBeNull();
    expect(unmarked.leaf_who).toBeNull();
    const { children: subs } = await store.split(
      id,
      { hypothesis: "Bigger than thought", children: [{ title: "Sub" }] },
      AUTHOR
    );
    expect(subs).toHaveLength(1);
  });

  it("should require a done check, and who, what and how for a human leaf, when marking a leaf", async () => {
    const { children } = await rootWithChildren("One");
    await expect(store.markLeaf(children[0].id, { type: "agent" }, AUTHOR)).rejects.toThrow(
      /done check/
    );
    await expect(
      store.markLeaf(children[0].id, { type: "human", done_check: "Sent?", who: "Tom" }, AUTHOR)
    ).rejects.toThrow(/who, what and how/);
  });

  it("should refuse to split a node when it is done or overtaken", async () => {
    const { children } = await rootWithChildren("One", "Two");
    await store.overtake(children[0].id, "No longer needed", AUTHOR);
    await expect(
      store.split(children[0].id, { hypothesis: "h", children: [{ title: "Sub" }] }, AUTHOR)
    ).rejects.toThrow(/overtaken/);
  });

  it("should refuse a split when it has no children", async () => {
    const root = await store.createRoot({ title: "Root" }, AUTHOR);
    await expect(store.split(root.id, { hypothesis: "h", children: [] }, AUTHOR)).rejects.toThrow(
      /at least one child/
    );
  });

  // Gaps found while writing these tests; they become real tests once the behaviour is decided.
  it.todo("should keep the first split's hypothesis when a parent is split a second time");
  it.todo("should release the claim when a claimed leaf is unmarked to be split");
});

describe("claims and reports", () => {
  it("should keep a claim exclusive when another actor claims or reports", async () => {
    const { children } = await rootWithChildren("One");
    const id = children[0].id;
    await store.markLeaf(id, { type: "agent", done_check: "Done?" }, AUTHOR);
    const claimed = await store.claim(id, AUTHOR);
    expect(claimed.status).toBe("in_progress");
    await expect(store.claim(id, OTHER)).rejects.toThrow(/Already claimed/);
    await expect(store.report(id, { outcome: "done" }, OTHER)).rejects.toThrow(
      /only they can report/
    );
  });

  it("should refuse to close a parent when it still has open children", async () => {
    const { root } = await rootWithChildren("One");
    await expect(store.report(root.id, { outcome: "done" }, AUTHOR)).rejects.toThrow(
      /open children/
    );
  });

  it("should point at the parent's hypothesis when its last child closes", async () => {
    const { root, children } = await rootWithChildren("One", "Two");
    const first = await store.report(children[0].id, { outcome: "done", evidence: "link" }, AUTHOR);
    expect(first.node.verification_level).toBe(2);
    expect(first.parent_check).toBeUndefined();
    const last = await store.overtake(children[1].id, "Covered by One", AUTHOR);
    expect(last.parent_check).toMatch(/Test the split's hypothesis/);
    const closed = await store.report(root.id, { outcome: "done" }, AUTHOR);
    expect(closed.node.status).toBe("done");
  });

  it("should bounce a human leaf back to the agents when it is reported unclear, until it is refined", async () => {
    const { children } = await rootWithChildren("One");
    const id = children[0].id;
    await store.markLeaf(id, humanLeaf, AUTHOR);
    await store.claim(id, "human");
    const { node } = await store.report(
      id,
      { outcome: "unclear", note: "Which address?" },
      "human"
    );
    expect(node.unclear_reason).toBe("Which address?");
    expect(node.claimed_by).toBeNull();
    expect((await store.view("donor", { kind: "refine" })).map((n) => n.id)).toEqual([id]);
    expect(await store.view("executor")).toEqual([]);
    await store.update(id, { next_action: "Use tom@example.com" }, AUTHOR);
    expect((await store.view("executor")).map((n) => n.id)).toEqual([id]);
  });
});

describe("review", () => {
  it("should refuse a review when the reviewer wrote the split", async () => {
    const { root } = await rootWithChildren("One");
    await expect(
      store.review(root.id, { verdict: "accept", reasoning: "Looks fine" }, AUTHOR)
    ).rejects.toThrow(/someone other than its author/);
  });

  it("should mark the split reviewed when another actor accepts it, and ask for a re-plan when rejected", async () => {
    const a = await rootWithChildren("One");
    const accepted = await store.review(
      a.root.id,
      { verdict: "accept", reasoning: "Sound" },
      OTHER
    );
    expect(accepted.status).toBe("reviewed");

    const b = await store.createRoot({ title: "Second" }, AUTHOR);
    await store.split(b.id, { hypothesis: "h", children: [{ title: "X" }] }, AUTHOR);
    await store.review(b.id, { verdict: "reject", reasoning: "Misses a step" }, OTHER);
    const replan = await store.view("donor", { kind: "replan" });
    expect(replan.map((n) => n.id)).toEqual([b.id]);
  });
});

describe("dependencies", () => {
  it("should refuse a dependency when it would close a loop", async () => {
    const { children } = await rootWithChildren("A", "B", "C");
    const [a, b, c] = children.map((n) => n.id);
    await store.addDependency({ nodeId: a, needsId: b }, AUTHOR);
    await store.addDependency({ nodeId: b, needsId: c }, AUTHOR);
    await expect(store.addDependency({ nodeId: c, needsId: a }, AUTHOR)).rejects.toThrow(/loop/);
  });

  it("should keep a human leaf out of the executor view when what it needs is still open", async () => {
    const { children } = await rootWithChildren("Draft", "Send");
    const [draft, send] = children.map((n) => n.id);
    await store.markLeaf(send, humanLeaf, AUTHOR);
    await store.addDependency({ nodeId: send, needsId: draft }, AUTHOR);
    expect(await store.view("executor")).toEqual([]);
    await store.overtake(draft, "Draft already exists", AUTHOR);
    expect((await store.view("executor")).map((n) => n.id)).toEqual([send]);
  });
});
