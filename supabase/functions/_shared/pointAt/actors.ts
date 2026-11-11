/**
 * How an actor is named on writes: "<person> via <agent>", or just "<person>". The person part
 * is what rules about people compare (a split's author may not review it, whichever agent each
 * of them used); the agent part only says which tool acted.
 */
const VIA = " via ";

/** The actor recorded on a write: the person, plus the agent acting for them. */
export function actorFor(displayName: string, agentLabel: string | undefined): string {
  const label = agentLabel?.trim();
  return label ? `${displayName}${VIA}${label}` : displayName;
}

/** The person behind an actor name, normalised so case and spacing do not make a new person. */
export function actorPerson(actor: string): string {
  const at = actor.indexOf(VIA);
  return (at === -1 ? actor : actor.slice(0, at)).trim().replace(/\s+/g, " ").toLowerCase();
}

/** Whether a display name can be used without making the person part ambiguous. */
export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 80 && !trimmed.toLowerCase().includes(VIA);
}
