export interface AtomNode {
  method: string;
  value: string;
  ancestors: number | null;
  descendants: number | null;
  subgraph: boolean;
}

export type SelectorNode =
  | { type: "atom"; atom: AtomNode }
  | { type: "union"; operands: SelectorNode[] }
  | { type: "intersection"; operands: SelectorNode[] };
