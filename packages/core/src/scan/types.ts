/** Backlog scan definition (declared in TASK.md frontmatter) */
export interface BacklogDef {
  id: string;
  cmd: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
}

/** A single backlog item parsed from command output */
export interface BacklogItem {
  /** Category ID from the BacklogDef */
  backlogId: string;
  /** Raw line from command output */
  raw: string;
  /** Parsed file path (if output matches file:line pattern) */
  file?: string;
  /** Parsed line number */
  line?: number;
  /** Category description */
  description: string;
  severity: 'low' | 'medium' | 'high';
  /** ISO timestamp */
  collectedAt: string;
}
