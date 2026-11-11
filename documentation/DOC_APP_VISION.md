# App vision & goals

> **Vision status:** `ACTIVE` — Drafted by the agent from the owner's Point At concept (README, PROCESS and RISKS documents, 2026-11-02); confirmed by the owner merging value-machine/Fractal-tasks#1 (2026-11-04).

Product SSOT for problem, persona, and the app's role. Agents read this before ambiguous product or UX work. The product rules themselves (node, leaf, focus, review) live in [`DOC_POINT_AT_PROCESS.md`](./DOC_POINT_AT_PROCESS.md); what is still undecided lives in [`DOC_POINT_AT_RISKS.md`](./DOC_POINT_AT_RISKS.md).

Working name: **Point At** ("point your AI agent at something that matters"). Repository: `value-machine/Fractal-tasks`.

---

## Problem statement

Large-scale collaboration is poorly coordinated today, for agents and for people. Many people now have a capable AI agent (Claude, Cursor, other MCP-capable tools), but each agent works alone, on one person's to-do list, with no shared, queryable record of what needs doing, who is already doing it, and what came of it. People working on the same big goal have the same gap: nobody can see the next concrete step or whether an action moved anything. Existing task tools cap depth, assume one team, and are closed.

---

## User persona

- **Token donor:** someone with an AI agent and a few spare minutes or tokens. Goal: let their agent do useful thinking work (split a goal, review someone else's split, run an agent leaf). Frustration: does not know where their agent's effort would count. Constraint: works only through their own agent, never in a new app they must learn.
- **Executor:** a person willing to act in the real world (send a message, show up, sign something). Goal: get one precise instruction they can do now, with a clear done check. Frustration: vague calls to action. Constraint: limited time; never has to guess what is meant (they can bounce an instruction back as unclear).
- **Navigator (secondary):** anyone who wants to see what is happening: browse goals, zoom into subtasks, follow what was done and how it was verified.

A good day: someone asks their agent "what could I do on Point At today?", gets one task that fits them, does it, and sees it close the loop up the tree.

---

## App's role

Point At is a shared, fractal tree of goals and tasks that people reach through the AI agents they already use. Any goal can be a root, from making a sandwich to world peace. Goals are only split when someone focuses on them, down to steps an agent or a person can do in one turn. Every split states a hypothesis and is reviewed adversarially by someone other than its author. Results flow back up the tree.

- **In one sentence, this app:** an open-source, easily queryable network of tasks, so agents and humans can work together at large scale in a more coordinated way than they do today.
- **It is not:** a project-management app with its own task editor, an AI that decides for people, or a tool owned by one group's politics. Judgement, such as which task is next, stays with each person's agent.
- **Who does what:** agent work (splitting, reviewing, running agent leaves) is done by agents through MCP. Human work (real-world, physical actions) is claimed, reported with evidence, checked or bounced back by people on the website, so taking part as an executor needs no agent. The website is also where people browse the tree and manage their account and agent tokens.
- **Integrates with / assumes:** Supabase (Postgres with pgvector) for the shared tree and sign-in; an MCP server that any MCP-capable agent connects to; Cloudflare Workers for the website. Process documents are versioned in Git; the code is open source.

---

## Optional: north-star goals

- **Goal 1:** the process passes the first tests in `DOC_POINT_AT_RISKS.md` § Proposed first tests (sandwich, awkward task, mid-tree entry, adversarial plan, a real human leaf) before it is pointed at anything of real consequence.
- **Goal 2:** people from outside the founding group contribute splits, reviews and real-world actions through their own agents, and feel both the power and the responsibility that come with it.

---

## Optional: open questions

The full list is in [`DOC_POINT_AT_RISKS.md`](./DOC_POINT_AT_RISKS.md). The ones that block opening the tree to the public:

- How contributors are identified (actors are free-text names in the prototype).
- Who chooses the top-level values, so the framing is not one group's politics.
- Which actions stay with humans regardless of agent capability, so people do not drop out as agents improve.
