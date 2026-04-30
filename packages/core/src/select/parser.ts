import type { AtomNode, SelectorNode } from "./types.ts";

function parseAtomToken(token: string): AtomNode {
  let subgraph = false;
  let ancestors: number | null = null;
  let descendants: number | null = null;
  let rest = token;

  if (rest.startsWith("@")) {
    subgraph = true;
    rest = rest.slice(1);
  }

  const ancestorMatch = rest.match(/^(\d*)\+/);
  if (ancestorMatch) {
    ancestors =
      ancestorMatch[1] === "" ? 0 : parseInt(ancestorMatch[1], 10);
    rest = rest.slice(ancestorMatch[0].length);
  }

  const descendantMatch = rest.match(/\+(\d*)$/);
  if (descendantMatch) {
    descendants =
      descendantMatch[1] === "" ? 0 : parseInt(descendantMatch[1], 10);
    rest = rest.slice(0, rest.length - descendantMatch[0].length);
  }

  const colonIdx = rest.indexOf(":");
  if (colonIdx > 0) {
    const method = rest.slice(0, colonIdx);
    const value = rest.slice(colonIdx + 1);
    return { method, value, ancestors, descendants, subgraph };
  }

  return { method: "name", value: rest, ancestors, descendants, subgraph };
}

export function parseSelector(input: string): SelectorNode {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("empty selector");

  const groups = trimmed.split(/\s+/);

  const operands: SelectorNode[] = groups.map((group) => {
    const atoms = group.split(",").map((t) => {
      const atom = parseAtomToken(t);
      return { type: "atom" as const, atom };
    });
    if (atoms.length === 1) return atoms[0];
    return { type: "intersection", operands: atoms };
  });

  if (operands.length === 1) return operands[0];
  return { type: "union", operands };
}
