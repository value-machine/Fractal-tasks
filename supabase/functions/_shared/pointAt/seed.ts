// Example data: the sandwich test, a slice of "achieve world peace", and an unsplit UBI goal.
// Names in human leaves are placeholders, clearly marked as examples.
import type { Store } from "./store.ts";

/**
 * Seed example data into an empty tree. Returns false (and writes nothing) when roots already exist.
 * Not wired to any route: call it from a one-off script or a temporary function.
 */
export async function seed(store: Store): Promise<boolean> {
  if ((await store.listRoots()).length) return false;

  const tom = "Tom via Claude (example)";
  const other = "Reviewer agent (example)";

  // 1. The sandwich test: "Can I just do this?" Yes, so it is a leaf straight away. No bureaucracy.
  const sandwich = await store.createRoot(
    {
      title: "Make a sandwich this morning",
      done_check: "Is there a sandwich on the plate?",
      labels: ["sandwich-test"],
    },
    tom
  );
  await store.markLeaf(
    sandwich.id,
    {
      type: "human",
      who: "Me",
      what: "Cheese and tomato on brown bread",
      how: "In my kitchen, before 9:00",
    },
    tom
  );
  await store.claim(sandwich.id, tom);
  await store.report(sandwich.id, { outcome: "done", note: "Eaten.", verification_level: 1 }, tom);

  // 2. A slice of world peace, decomposed on focus.
  const peace = await store.createRoot(
    {
      title: "Achieve world peace",
      done_check: "Open values question: what counts as peace, and who decides?",
      labels: ["peace"],
    },
    tom
  );
  const { children: peaceKids } = await store.split(
    peace.id,
    {
      hypothesis:
        "Peace at large is built from reduced tension in many concrete conflicts. This branch starts local to test the process.",
      prediction: "Local branches produce repeatable methods that larger branches can reuse.",
      assumptions:
        "Local and international conflicts share enough mechanics for methods to transfer.",
      children: [
        {
          title: "Reduce tension between two neighbourhoods in Utrecht",
          done_check: "Do leaders from both sides meet regularly?",
          labels: ["peace", "Utrecht"],
        },
        {
          title: "Map international conflicts with active mediation openings",
          labels: ["peace", "international"],
        },
      ],
    },
    tom
  );
  await store.review(
    peace.id,
    {
      verdict: "accept",
      reasoning: "Starting local is cheap and reversible; the transfer assumption is flagged.",
    },
    other
  );

  const utrecht = peaceKids.find((k) => k.title.includes("Utrecht"))!;
  const { children: utrechtKids } = await store.split(
    utrecht.id,
    {
      hypothesis:
        "Direct contact between neighbourhood leaders, informed by what residents actually say, starts lowering tension.",
      prediction: "A second meeting is planned by both sides within two months of the first.",
      assumptions: "Both associations have active chairs who answer email (checked October 2026).",
      children: [
        {
          title: "Hold a shared event with leaders from both neighbourhood associations",
          done_check: "Did leaders from both sides attend?",
        },
        {
          title: "Summarise what residents on both sides say the tension is about",
          done_check: "Is there a one-page summary with sources?",
        },
      ],
    },
    tom
  );

  const event = utrechtKids.find((k) => k.title.startsWith("Hold"))!;
  const summary = utrechtKids.find((k) => k.title.startsWith("Summarise"))!;
  await store.markLeaf(summary.id, { type: "agent" }, tom);

  const { children: eventKids } = await store.split(
    event.id,
    {
      hypothesis: "Both chairs invited plus a neutral venue is enough for the event to happen.",
      children: [
        {
          title: "Invite neighbourhood association A",
          done_check: "Has the chair of association A received the invitation?",
        },
        {
          title: "Invite neighbourhood association B",
          done_check: "Has the chair of association B received the invitation?",
        },
        {
          title: "Shortlist three neutral venues for 40 people",
          done_check: "Are there three venues with capacity, price and availability?",
        },
      ],
    },
    tom
  );
  const byTitle = (prefix: string) => eventKids.find((k) => k.title.startsWith(prefix))!;
  const inviteA = byTitle("Invite neighbourhood association A");
  const inviteB = byTitle("Invite neighbourhood association B");
  const venues = byTitle("Shortlist");
  const invite = (side: string) =>
    `Dear chair of association ${side}, we would like to invite you to a shared evening with both neighbourhood associations on 5 December, 19:30, to talk about the issues residents raised this year. Will you join?`;
  await store.markLeaf(
    inviteA.id,
    {
      type: "human",
      who: "Chair, neighbourhood association A (example)",
      what: invite("A"),
      how: "Email, by 15 November",
    },
    tom
  );
  await store.markLeaf(
    inviteB.id,
    {
      type: "human",
      who: "Chair, neighbourhood association B (example)",
      what: invite("B"),
      how: "Email, by 15 November",
    },
    tom
  );
  await store.markLeaf(venues.id, { type: "agent" }, tom);
  await store.claim(venues.id, "Donor agent (example)");
  await store.report(
    venues.id,
    {
      outcome: "done",
      note: "Three venues shortlisted.",
      evidence: "Shortlist with links attached to the event node.",
      verification_level: 2,
    },
    "Donor agent (example)"
  );

  // 3. An unsplit goal, waiting for someone to focus on it.
  const ubi = await store.createRoot(
    {
      title: "Pilot a universal basic income in one municipality",
      done_check: "Is a pilot running with at least 100 participants?",
      labels: ["ubi"],
    },
    tom
  );
  await store.link(
    summary.id,
    ubi.id,
    "Residents' concerns about income feed the pilot design.",
    tom
  );
  return true;
}
