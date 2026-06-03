import { useState } from "react";
import { Plus } from "lucide-react";
import { navigate } from "../router";

export interface CreateInput {
  name: string;
  goal: string;
}

interface Props {
  onClose?: () => void;
}

export function NewProjectPanel({ onClose }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    navigate({ kind: "playbook", playbookName: trimmed, taskId: null });
    onClose?.();
  }

  return (
    <div className="new-project-panel">
      <label className="new-project-panel__field">
        <span>Playbook Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-playbook"
        />
      </label>
      <label className="new-project-panel__field">
        <span>Goal</span>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What should this playbook accomplish?"
          rows={3}
        />
      </label>
      <button
        type="button"
        className="new-project-panel__create"
        onClick={handleCreate}
        disabled={!name.trim()}
      >
        <Plus size={14} /> Create Playbook
      </button>
    </div>
  );
}
