import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface ToolUse {
  name: string;
  input?: Record<string, unknown>;
}

interface ToolResult {
  output?: string;
  isError?: boolean;
}

interface Props {
  use: ToolUse;
  result?: ToolResult;
  runStreaming?: boolean;
}

export function ToolCard({ use, result, runStreaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = result != null;
  const isError = result?.isError;

  return (
    <div className={`tool-card${isError ? " tool-card--error" : ""}`}>
      <button
        type="button"
        className="tool-card__header"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="tool-card__name">{use.name}</span>
        <span className="tool-card__status">
          {runStreaming && !hasResult ? (
            <Loader2 size={12} className="tool-card__spinner" />
          ) : isError ? (
            <XCircle size={12} />
          ) : hasResult ? (
            <CheckCircle size={12} />
          ) : null}
        </span>
      </button>
      {expanded ? (
        <div className="tool-card__body">
          {use.input ? (
            <pre className="tool-card__input">
              {JSON.stringify(use.input, null, 2)}
            </pre>
          ) : null}
          {result?.output ? (
            <pre className="tool-card__output">{result.output}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface TodoCardProps {
  items: TodoItem[];
}

export function TodoCard({ items }: TodoCardProps) {
  return (
    <div className="todo-card">
      {items.map((item) => (
        <div
          key={item.id}
          className={`todo-card__item${item.done ? " todo-card__item--done" : ""}`}
        >
          <span className="todo-card__check">{item.done ? "✓" : "○"}</span>
          <span className="todo-card__text">{item.text}</span>
        </div>
      ))}
    </div>
  );
}
