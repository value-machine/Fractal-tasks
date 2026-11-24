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

  it("should refuse to move or detach a node when it already has a parent", async () => {
    const { children } = await rootWithChildren("Step one");
    const other = await store.createRoot({ title: "Other root" }, AUTHOR);
    await expect(
      db.query("update nodes set parent_id = $1 where id = $2", [other.id, children[0].id])
    ).rejects.toThrow(/parent_id cannot be changed/);
    await expect(
      db.query("update nodes set parent_id = null where id = $1", [children[0].id])
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

  it("should keep every split's hypothesis when a parent is split a second time", async () => {
    const { root } = await rootWithChildren("One");
    await store.split(
      root.id,
      { hypothesis: "Second thoughts: one more step", children: [{ title: "Two" }] },
      OTHER
    );
    const splits = await store.splits(root.id);
    expect(splits.map((x) => [x.kind, x.hypothesis, x.created_by])).toEqual([
      ["split", "These steps reach the goal", AUTHOR],
      ["split", "Second thoughts: one more step", OTHER],
    ]);
    expect(splits[1].child_ids).toHaveLength(1);
    // The node itself still shows the latest split.
    expect((await store.getNode(root.id)).split_hypothesis).toBe("Second thoughts: one more step");
    expect((await store.focus(root.id)).splits).toHaveLength(2);
  });

  it("should release the claim when a claimed leaf is unmarked to be split", async () => {
    const { children } = await rootWithChildren("One");
    const id = children[0].id;
    await store.markLeaf(id, { type: "agent", done_check: "Done?" }, AUTHOR);
    await store.claim(id, OTHER);
    const unmarked = await store.update(id, { leaf_type: null }, AUTHOR);
    expect(unmarked.claimed_by).toBeNull();
    expect(unmarked.status).toBe("proposed");
  });
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

describe("relations", () => {
  it("should refuse a blocked_by relation when it would close a loop", async () => {
    const { children } = await rootWithChildren("A", "B", "C");
    const [a, b, c] = children.map((n) => n.id);
    await store.relate({ fromId: a, toId: b, type: "blocked_by" }, AUTHOR);
    await store.relate({ fromId: b, toId: c, type: "blocked_by" }, AUTHOR);
    await expect(store.relate({ fromId: c, toId: a, type: "blocked_by" }, AUTHOR)).rejects.toThrow(
      /loop/
    );
  });

  it("should keep a human leaf out of the executor view when its blocker is still open", async () => {
    const { children } = await rootWithChildren("Draft", "Send");
    const [draft, send] = children.map((n) => n.id);
    await store.markLeaf(send, humanLeaf, AUTHOR);
    await store.relate({ fromId: send, toId: draft, type: "blocked_by" }, AUTHOR);
    expect(await store.view("executor")).toEqual([]);
    await store.overtake(draft, "Draft already exists", AUTHOR);
    expect((await store.view("executor")).map((n) => n.id)).toEqual([send]);
  });

  it("should leave a blocked open node out of the donor view when its blocker is open", async () => {
    const { children } = await rootWithChildren("Pick a town", "Find a councillor");
    const [pick, councillor] = children.map((n) => n.id);
    await store.relate({ fromId: councillor, toId: pick, type: "blocked_by" }, AUTHOR);
    const split = await store.view("donor", { kind: "split" });
    expect(split.map((n) => n.id)).toEqual([pick]);
  });

  it("should show a relation on both tasks when one is focused", async () => {
    const { children } = await rootWithChildren("Purmerend", "Borger-Odoorn");
    const [a, b] = children.map((n) => n.id);
    await store.relate({ fromId: a, toId: b, type: "alternative_to", note: "either town" }, AUTHOR);
    const fromA = (await store.focus(a)).relations;
    const fromB = (await store.focus(b)).relations;
    expect(fromA).toMatchObject([{ type: "alternative_to", direction: "out", id: b }]);
    expect(fromB).toMatchObject([{ type: "alternative_to", direction: "in", id: a }]);
  });

  it("should keep one row when a symmetric relation is recorded in both directions", async () => {
    const { children } = await rootWithChildren("X", "Y");
    const [x, y] = children.map((n) => n.id);
    await store.relate({ fromId: x, toId: y, type: "related_to" }, AUTHOR);
    await store.relate({ fromId: y, toId: x, type: "related_to" }, AUTHOR);
    expect(await store.relations(x)).toHaveLength(1);
    await store.unrelate({ fromId: y, toId: x, type: "related_to" }, AUTHOR);
    expect(await store.relations(x)).toEqual([]);
  });

  it("should refuse a relation when both ends are the same task", async () => {
    const { children } = await rootWithChildren("Only");
    await expect(
      store.relate({ fromId: children[0].id, toId: children[0].id, type: "related_to" }, AUTHOR)
    ).rejects.toThrow(ProcessError);
  });
});

describe("planning rules", () => {
  it("should refuse to split a task when it is blocked by an open task", async () => {
    const { children } = await rootWithChildren("Pick a municipality", "Find a councillor");
    const [pick, councillor] = children.map((n) => n.id);
    await store.relate({ fromId: councillor, toId: pick, type: "blocked_by" }, AUTHOR);
    const split = { hypothesis: "Steps for the councillor", children: [{ title: "Call them" }] };
    await expect(store.split(councillor, split, AUTHOR)).rejects.toThrow(/blocked by/);
    await store.overtake(pick, "Picked by the owner", AUTHOR);
    const { children: after } = await store.split(councillor, split, AUTHOR);
    expect(after.map((c) => c.title)).toEqual(["Call them"]);
  });

  it("should remind the agent not to split when a blocked task is focused", async () => {
    const { children } = await rootWithChildren("Pick", "Follow up");
    await store.relate(
      { fromId: children[1].id, toId: children[0].id, type: "blocked_by" },
      AUTHOR
    );
    const { hints } = await store.focus(children[1].id);
    expect(hints[0]).toMatch(/do not split this yet/);
  });
});

describe("overtakes", () => {
  it("should close the overtaken task and its open subtasks when the overtaking task is done", async () => {
    const park = await store.createRoot({ title: "Care for the plants on plot 3" }, AUTHOR);
    const { children: care } = await store.split(
      park.id,
      { hypothesis: "h", children: [{ title: "Water" }, { title: "Prune" }] },
      AUTHOR
    );
    await store.report(care[1].id, { outcome: "done" }, AUTHOR);
    const house = await store.createRoot({ title: "Build a house on plot 3" }, OTHER);
    await store.relate({ fromId: house.id, toId: park.id, type: "overtakes" }, OTHER);

    await store.claim(house.id, OTHER);
    expect((await store.getNode(park.id)).status).not.toBe("overtaken");

    const result = await store.report(house.id, { outcome: "done" }, OTHER);
    expect(result.overtaken?.map((n) => n.title).sort()).toEqual([
      "Care for the plants on plot 3",
      "Water",
    ]);
    expect((await store.getNode(park.id)).overtaken_note).toMatch(/Build a house on plot 3/);
    // A subtask that was already done stays done.
    expect((await store.getNode(care[1].id)).status).toBe("done");
  });

  it("should refuse an overtakes relation when one task is inside the other's subtree", async () => {
    const { root, children } = await rootWithChildren("Child");
    await expect(
      store.relate({ fromId: children[0].id, toId: root.id, type: "overtakes" }, AUTHOR)
    ).rejects.toThrow(/ancestor or descendant/);
  });

  it("should list open tasks that share a label when a new task is created", async () => {
    const care = await store.createRoot(
      { title: "Water the plants", labels: ["plot 3"] },
      AUTHOR
    );
    await store.createRoot({ title: "Unrelated", labels: ["elsewhere"] }, AUTHOR);
    const house = await store.createRoot(
      { title: "Build a house", labels: ["plot 3"] },
      OTHER
    );
    expect(house.check_overlap.map((c) => [c.id, c.shared_labels])).toEqual([
      [care.id, ["plot 3"]],
    ]);
  });
});

describe("links", () => {
  it("should keep a task's links in order when they are saved", async () => {
    const node = await store.createRoot(
      {
        title: "Write the proposal",
        links: [
          { url: "https://example.org/draft", title: "Draft" },
          { url: "http://example.org/budget", title: "Budget" },
        ],
      },
      AUTHOR
    );
    expect(node.links).toEqual([
      { url: "https://example.org/draft", title: "Draft" },
      { url: "http://example.org/budget", title: "Budget" },
    ]);
  });

  it("should refuse a link when it is not a web address", async () => {
    await expect(
      store.createRoot(
        { title: "T", links: [{ url: "file:///etc/passwd", title: "File" }] },
        AUTHOR
      )
    ).rejects.toThrow(/https:\/\//);
  });
});

describe("private goals", () => {
  const ALICE_ID = "00000000-0000-4000-8000-00000000a11c";
  const BOB_ID = "00000000-0000-4000-8000-0000000000b0";
  const as = <T,>(viewer: string | null, fn: (s: Store) => Promise<T>) => Store.as(db, viewer, fn);

  beforeEach(async () => {
    await db.query("insert into auth.users (id) values ($1), ($2) on conflict do nothing", [
      ALICE_ID,
      BOB_ID,
    ]);
  });

  async function alicesPrivateGoal() {
    return as(ALICE_ID, async (s) => {
      const root = await s.createRoot(
        { title: "Battle my own loneliness", visibility: "private" },
        "Alice via Claude"
      );
      const { children } = await s.split(
        root.id,
        { hypothesis: "Regular contact", children: [{ title: "Join the Tuesday choir" }] },
        "Alice via Claude"
      );
      await s.markLeaf(children[0].id, humanLeaf, "Alice via Claude");
      return { root, step: children[0] };
    });
  }

  it("should show a private goal and its subtasks only to their owner", async () => {
    const { root, step } = await alicesPrivateGoal();
    expect(step.visibility).toBe("private");
    await as(ALICE_ID, async (s) => {
      expect((await s.listRoots()).map((r) => r.id)).toContain(root.id);
      expect((await s.view("executor")).map((n) => n.id)).toContain(step.id);
    });
    for (const viewer of [BOB_ID, null]) {
      await as(viewer, async (s) => {
        expect((await s.listRoots()).map((r) => r.id)).not.toContain(root.id);
        expect(await s.search("loneliness")).toEqual([]);
        expect(await s.view("executor")).toEqual([]);
        await expect(s.getNode(step.id)).rejects.toThrow(/No node/);
      });
    }
    // Reads outside Store.as see only public goals: forgetting the viewer fails closed.
    expect((await store.listRoots()).map((r) => r.id)).not.toContain(root.id);
  });

  it("should refuse a private goal when nobody is signed in", async () => {
    await expect(
      as(null, (s) => s.createRoot({ title: "Secret", visibility: "private" }, "anonymous agent"))
    ).rejects.toThrow(/Sign in/);
  });

  it("should let only the owner change a goal's visibility, for its whole tree", async () => {
    const { root, step } = await alicesPrivateGoal();
    await expect(
      as(BOB_ID, (s) => s.setVisibility(root.id, "public", "Bob"))
    ).rejects.toThrow(/No node/);
    await as(ALICE_ID, (s) => s.setVisibility(root.id, "public", "Alice"));
    await as(null, async (s) => expect((await s.getNode(step.id)).visibility).toBe("public"));
    const legacy = await store.createRoot({ title: "Created without an account" }, AUTHOR);
    await expect(
      as(ALICE_ID, (s) => s.setVisibility(legacy.id, "private", "Alice"))
    ).rejects.toThrow(/owner/);
  });

  it("should count a private step toward a public goal without showing it", async () => {
    const { step } = await alicesPrivateGoal();
    const city = await store.createRoot({ title: "Battle loneliness in Utrecht" }, AUTHOR);
    await as(ALICE_ID, (s) =>
      s.relate({ fromId: step.id, toId: city.id, type: "also_serves" }, "Alice")
    );
    await as(BOB_ID, async (s) => {
      const focus = await s.focus(city.id);
      expect(focus.relations).toEqual([]);
      expect(focus.served_privately).toBe(1);
    });
    await as(ALICE_ID, async (s) => {
      expect((await s.focus(city.id)).relations.map((r) => r.id)).toEqual([step.id]);
    });
  });

  it("should refuse to adopt a private goal under a public one", async () => {
    const { root } = await alicesPrivateGoal();
    const big = await as(ALICE_ID, (s) => s.createRoot({ title: "Public goal" }, "Alice"));
    await expect(
      as(ALICE_ID, (s) => s.adopt(big.id, { hypothesis: "Part of it", rootIds: [root.id] }, "Alice"))
    ).rejects.toThrow(/visibility/);
  });

  it("should list the owner's private goals and claimed tasks in their own list", async () => {
    const { root } = await alicesPrivateGoal();
    const publicTask = await store.createRoot({ title: "Public work" }, AUTHOR);
    await as(ALICE_ID, (s) => s.claim(publicTask.id, "Alice", ALICE_ID));
    const mine = await as(ALICE_ID, (s) => s.myTasks());
    expect(mine.private_goals.map((g) => g.id)).toEqual([root.id]);
    expect(mine.claimed.map((t) => t.id)).toEqual([publicTask.id]);
  });

  it("should undo a split's partial writes when a child is refused", async () => {
    const root = await store.createRoot({ title: "Root" }, AUTHOR);
    await expect(
      as(null, (s) =>
        s.split(
          root.id,
          {
            hypothesis: "h",
            children: [
              { title: "Fine child" },
              { title: "Bad link", links: [{ url: "ftp://x", title: "x" }] },
            ],
          },
          AUTHOR
        )
      )
    ).rejects.toThrow(ProcessError);
    expect(await store.children(root.id)).toEqual([]);
    expect((await store.getNode(root.id)).split_at).toBeNull();
  });
});

describe("loop signals", () => {
  it("should report idle days and how many open tasks wait on a task when it is read", async () => {
    const { children } = await rootWithChildren("Ask the council", "Use the answer", "Unrelated");
    const [ask, use] = children.map((n) => n.id);
    await store.relate({ fromId: use, toId: ask, type: "blocked_by" }, AUTHOR);
    await db.query("update node_events set created_at = now() - interval '8 days' where node_id = $1", [ask]);
    // The guard trigger stamps updated_at on every update; switch it off to age the task.
    await db.query("alter table nodes disable trigger nodes_guard_trg");
    await db.query("update nodes set updated_at = now() - interval '8 days' where id = $1", [ask]);
    await db.query("alter table nodes enable trigger nodes_guard_trg");
    const node = await store.getNode(ask);
    expect(node.idle_days).toBe(8);
    expect(node.blocks_open).toBe(1);
  });

  it("should list a task that holds others up first when the work list is read", async () => {
    const { children } = await rootWithChildren("Free", "Blocker", "Waiting");
    const [free, blocker, waiting] = children.map((n) => n.id);
    for (const id of [free, blocker]) await store.markLeaf(id, humanLeaf, AUTHOR);
    await store.relate({ fromId: waiting, toId: blocker, type: "blocked_by" }, AUTHOR);
    expect((await store.view("executor")).map((n) => n.id)).toEqual([blocker, free]);
  });

  it("should create the follow-up and move waiting tasks onto it when a human leaf is done", async () => {
    const { children } = await rootWithChildren("Send the message", "Use the answer");
    const [send, use] = children.map((n) => n.id);
    await store.markLeaf(
      send,
      { ...humanLeaf, follow_up: "Handle the reply: yes, no, or no answer" },
      AUTHOR
    );
    await store.relate({ fromId: use, toId: send, type: "blocked_by" }, AUTHOR);

    const result = await store.report(send, { outcome: "done" }, AUTHOR);
    const followUp = result.follow_up!;
    expect(followUp.title).toBe("Handle the reply: yes, no, or no answer");
    expect(followUp.parent_id).toBe((await store.getNode(send)).parent_id);
    // "Use the answer" still waits: now on the reply, not on the sent message.
    expect((await store.relations(use)).map((r) => [r.type, r.id])).toEqual([
      ["blocked_by", followUp.id],
    ]);
    expect((await store.view("donor", { kind: "split" })).map((n) => n.id)).toContain(followUp.id);
    expect((await store.view("donor", { kind: "split" })).map((n) => n.id)).not.toContain(use);
  });

  it("should not create a follow-up when the leaf has none", async () => {
    const { children } = await rootWithChildren("Just do it");
    await store.markLeaf(children[0].id, humanLeaf, AUTHOR);
    const result = await store.report(children[0].id, { outcome: "done" }, AUTHOR);
    expect(result.follow_up).toBeUndefined();
  });
});

describe("graph", () => {
  it("should return the subtree and only the relations among its tasks when a graph is read", async () => {
    const { root, children } = await rootWithChildren("A", "B");
    const [a, b] = children.map((n) => n.id);
    const { children: grand } = await store.split(
      a,
      { hypothesis: "h", children: [{ title: "A1" }] },
      AUTHOR
    );
    const outside = await store.createRoot({ title: "Elsewhere" }, AUTHOR);
    await store.relate({ fromId: b, toId: a, type: "blocked_by" }, AUTHOR);
    await store.relate({ fromId: a, toId: outside.id, type: "also_serves" }, AUTHOR);

    const graph = await store.graph(root.id);
    // Levels come out nearest first; order within a level is not part of the contract.
    expect(graph.nodes.map((n) => n.depth)).toEqual([0, 1, 1, 2]);
    expect(graph.nodes.map((n) => n.title).sort()).toEqual(["A", "A1", "B", "Root goal"]);
    expect(graph.nodes.find((n) => n.id === grand[0].id)?.parent_id).toBe(a);
    expect(graph.edges).toEqual([{ from_id: b, to_id: a, type: "blocked_by", note: null }]);
    expect(graph.truncated).toBe(false);
  });
});

describe("claims as assignments", () => {
  it("should keep each claim in the history when a task is claimed, released and claimed again", async () => {
    const { children } = await rootWithChildren("Leaf");
    const id = children[0].id;
    await store.markLeaf(id, { type: "agent", done_check: "Done?" }, AUTHOR);
    await store.claim(id, AUTHOR);
    await store.release(id, AUTHOR);
    const claimed = await store.claim(id, OTHER);
    expect(claimed.claimed_by).toBe(OTHER);
    const { claims } = await store.focus(id);
    expect(claims.map((c) => [c.actor, c.end_reason])).toEqual([
      [OTHER, null],
      [AUTHOR, "released"],
    ]);
  });

  it("should refuse a second claimer when a task is already claimed", async () => {
    const { children } = await rootWithChildren("Leaf");
    await store.claim(children[0].id, AUTHOR);
    await expect(store.claim(children[0].id, OTHER)).rejects.toThrow(/Already claimed/);
  });

  it("should end the claim when the task is reported done", async () => {
    const { children } = await rootWithChildren("Leaf");
    const id = children[0].id;
    await store.markLeaf(id, { type: "agent", done_check: "Done?" }, AUTHOR);
    await store.claim(id, AUTHOR);
    const { node } = await store.report(id, { outcome: "done" }, AUTHOR);
    expect(node.claimed_by).toBeNull();
    expect((await store.focus(id)).claims[0].end_reason).toBe("done");
  });
});

describe("duration and requirements", () => {
  const leaf = (title: string) => ({ title });

  it("should store a leaf's duration and requirements when it is marked as a leaf", async () => {
    const { children } = await rootWithChildren("Email the clerk");
    const node = await store.markLeaf(
      children[0].id,
      {
        ...humanLeaf,
        duration: "15m",
        requirements: [
          { kind: "language", value: "Dutch" },
          { kind: "money", value: "postage", amount: 2, unit: "EUR" },
        ],
      },
      AUTHOR
    );
    expect(node.duration_minutes).toBe(15);
    expect(node.requirements).toEqual([
      { kind: "language", value: "Dutch", amount: null, unit: null },
      { kind: "money", value: "postage", amount: 2, unit: "EUR" },
    ]);
  });

  it("should replace the requirement list when it is updated", async () => {
    const { children } = await rootWithChildren("Task");
    const id = children[0].id;
    await store.update(id, { requirements: [{ kind: "skill", value: "writing" }] }, AUTHOR);
    const node = await store.update(id, { requirements: [] }, AUTHOR);
    expect(node.requirements).toEqual([]);
  });

  it("should filter the executor view by duration, cost, requirement text and excluded kinds", async () => {
    const root = await store.createRoot({ title: "Root" }, AUTHOR);
    const { children } = await store.split(
      root.id,
      {
        hypothesis: "h",
        children: [leaf("Quick Dutch email"), leaf("Day trip by car"), leaf("Unestimated")],
      },
      AUTHOR
    );
    const [quick, trip, unknown] = children.map((n) => n.id);
    await store.markLeaf(
      quick,
      { ...humanLeaf, duration: "15m", requirements: [{ kind: "language", value: "Dutch" }] },
      AUTHOR
    );
    await store.markLeaf(
      trip,
      {
        ...humanLeaf,
        duration: "day",
        requirements: [
          { kind: "material", value: "a car" },
          { kind: "money", value: "fuel", amount: 40, unit: "EUR" },
        ],
      },
      AUTHOR
    );
    await store.markLeaf(unknown, humanLeaf, AUTHOR);
    const ids = async (opts: Parameters<Store["view"]>[1]) =>
      (await store.view("executor", opts)).map((n) => n.id);

    expect(await ids({ maxDuration: "1h" })).toEqual([quick]);
    expect(await ids({ maxCost: 10 })).toEqual([quick, unknown]);
    expect(await ids({ requirement: "dutch" })).toEqual([quick]);
    expect(await ids({ excludeKinds: ["material"] })).toEqual([quick, unknown]);
  });

  it("should sum the open leaves' estimates when a parent is focused", async () => {
    const { root, children } = await rootWithChildren("A", "B", "C");
    await store.markLeaf(children[0].id, { ...humanLeaf, duration: "1h" }, AUTHOR);
    await store.markLeaf(children[1].id, { ...humanLeaf, duration: "half_day" }, AUTHOR);
    await store.markLeaf(children[2].id, humanLeaf, AUTHOR);
    expect((await store.focus(root.id)).estimate).toEqual({
      open_leaf_minutes: 300,
      open_leaves: 3,
      unestimated_leaves: 1,
    });
  });
});

describe("adopting roots", () => {
  const adoptInput = (rootIds: string[]) => ({
    hypothesis: "These goals turn out to be part of this one",
    rootIds,
  });

  it("should place existing roots under a node as children when it adopts them", async () => {
    const big = await store.createRoot({ title: "Restore democracy" }, AUTHOR);
    const small = await rootWithChildren("Draft letter");
    const { parent, adopted } = await store.adopt(big.id, adoptInput([small.root.id]), AUTHOR);

    expect(adopted.map((n) => n.parent_id)).toEqual([big.id]);
    expect(parent.status).toBe("proposed");
    expect(parent.split_hypothesis).toBe("These goals turn out to be part of this one");
    expect((await store.listRoots()).map((r) => r.id)).toEqual([big.id]);
    // The adopted root keeps its own subtree.
    expect((await store.children(small.root.id)).map((c) => c.title)).toEqual(["Draft letter"]);
  });

  it("should record an adoption in the split history when roots are adopted", async () => {
    const { root } = await rootWithChildren("Existing child");
    const orphan = await store.createRoot({ title: "Orphan" }, OTHER);
    await store.adopt(root.id, adoptInput([orphan.id]), OTHER);
    const splits = await store.splits(root.id);
    expect(splits.map((x) => x.kind)).toEqual(["split", "adopt"]);
    expect(splits[1].child_ids).toEqual([orphan.id]);
  });

  it("should send an adoption to review by someone other than the adopter", async () => {
    const big = await store.createRoot({ title: "Big" }, AUTHOR);
    const small = await store.createRoot({ title: "Small" }, OTHER);
    await store.adopt(big.id, adoptInput([small.id]), AUTHOR);
    expect((await store.view("donor", { kind: "review" })).map((n) => n.id)).toEqual([big.id]);
    await expect(
      store.review(big.id, { verdict: "accept", reasoning: "ok" }, AUTHOR)
    ).rejects.toThrow(/someone other than its author/);
  });

  it("should refuse to adopt a node when it is not a root", async () => {
    const big = await store.createRoot({ title: "Big" }, AUTHOR);
    const { children } = await rootWithChildren("Child");
    await expect(store.adopt(big.id, adoptInput([children[0].id]), AUTHOR)).rejects.toThrow(
      /not a root/
    );
  });

  it("should refuse an adoption when it would make a loop", async () => {
    const { root, children } = await rootWithChildren("Child");
    await expect(store.adopt(children[0].id, adoptInput([root.id]), AUTHOR)).rejects.toThrow(
      /loop/
    );
    await expect(store.adopt(root.id, adoptInput([root.id]), AUTHOR)).rejects.toThrow(/loop/);
  });

  it("should refuse to adopt under a node when it is a leaf or closed", async () => {
    const { children } = await rootWithChildren("Leaf", "Gone");
    const orphan = await store.createRoot({ title: "Orphan" }, AUTHOR);
    await store.markLeaf(children[0].id, { type: "agent", done_check: "Done?" }, AUTHOR);
    await store.overtake(children[1].id, "Not needed", AUTHOR);
    await expect(store.adopt(children[0].id, adoptInput([orphan.id]), AUTHOR)).rejects.toThrow(
      /marked as a leaf/
    );
    await expect(store.adopt(children[1].id, adoptInput([orphan.id]), AUTHOR)).rejects.toThrow(
      /overtaken/
    );
  });

  it("should refuse in the database a parent change when it would make a loop", async () => {
    const { root, children } = await rootWithChildren("Child");
    await expect(
      db.query("update nodes set parent_id = $1 where id = $2", [children[0].id, root.id])
    ).rejects.toThrow(/loop/);
  });
});
