# App vision & goals

> **Vision status:** `DRAFT` — Drafted by the agent from the owner's Point At concept (README, PROCESS and RISKS documents, 2026-11-02). The owner has not confirmed it yet; change `DRAFT` to `ACTIVE` on this line once they have.

Product SSOT for problem, persona, and the app's role. Agents read this before ambiguous product or UX work. The product rules themselves (node, leaf, focus, review) live in [`DOC_POINT_AT_PROCESS.md`](./DOC_POINT_AT_PROCESS.md); what is still undecided lives in [`DOC_POINT_AT_RISKS.md`](./DOC_POINT_AT_RISKS.md).

Working name: **Point At** ("point your AI agent at something that matters"). Repository: `value-machine/Fractal-tasks`.

---

## Problem statement

Many people now have a capable AI agent (Claude, Cursor, other MCP-capable tools) and spare attention, but no shared place to point them at goals that matter beyond their own to-do list. Large public goals ("economic security", "peace") stay abstract: nobody can see the next concrete step, who is already working on what, or whether an action actually moved anything. Existing task tools cap depth, assume one team, and treat people as assignees rather than as citizens who choose what to take on. The result is that the power and the responsibility to shape shared outcomes stays with a few institutions instead of with the public.

---

## User persona

- **Token donor:** someone with an AI agent and a few spare minutes or tokens. Goal: let their agent do useful thinking work (split a goal, review someone else's split, run an agent leaf). Frustration: does not know where their agent's effort would count. Constraint: works only through their own agent, never in a new app they must learn.
- **Executor:** a person willing to act in the real world (send a message, show up, sign something). Goal: get one precise instruction they can do now, with a clear done check. Frustration: vague calls to action. Constraint: limited time; never has to guess what is meant (they can bounce an instruction back as unclear).
- **Navigator (secondary):** anyone who wants to see what is happening: browse goals, zoom into subtasks, follow what was done and how it was verified.

A good day: someone asks their agent "what could I do on Point At today?", gets one task that fits them, does it, and sees it close the loop up the tree.

---

## App's role

Point At is a shared, fractal tree of goals and tasks that people reach through the AI agents they already use. Any goal can be a root, from making a sandwich to world peace. Goals are only split when someone focuses on them, down to steps an agent or a person can do in one turn. Every split states a hypothesis and is reviewed adversarially by someone other than its author. Results flow back up the tree.

- **In one sentence, this app:** gives the public one shared, self-correcting structure for turning big goals into concrete actions, driven by people's own agents.
- **It is not:** a project-management app with its own task editor, an AI that decides for people, or a tool owned by one group's politics. Changes happen through agents (MCP); the web view is read-only navigation. Judgement, such as which task is next, stays with each person's agent.
- **Integrates with / assumes:** Supabase (Postgres with pgvector) for the shared tree; an MCP server that any MCP-capable agent connects to; Cloudflare Workers for the read-only web view. Process documents are versioned in Git.

Hard constraints never traded away for a goal: consent, freedom, reversibility.

---

## Optional: north-star goals

- **Goal 1:** the process passes the first tests in `DOC_POINT_AT_RISKS.md` § Proposed first tests (sandwich, awkward task, mid-tree entry, adversarial plan, a real human leaf) before it is pointed at anything of real consequence.
- **Goal 2:** people from outside the founding group contribute splits, reviews and real-world actions through their own agents, and feel both the power and the responsibility that come with it.

---

## Optional: open questions

The full list is in [`DOC_POINT_AT_RISKS.md`](./DOC_POINT_AT_RISKS.md). The ones that block opening the tree to the public:

- How contributors are identified (actors are free-text names in the prototype).
- Who chooses the top-level values and hard constraints, so the framing is not one group's politics.
- Which actions stay with humans regardless of agent capability, so people do not drop out as agents improve.
