import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { navigate } from '../router';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewProjectModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  if (!open) return null;

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    navigate({ kind: 'playbook', playbookName: trimmed, taskId: null });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog__header">
          <h2>New Playbook</h2>
          <button type="button" className="modal-dialog__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-dialog__body">
          <label className="modal-field">
            <span className="modal-field__label">Name</span>
            <input
              className="modal-field__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-playbook"
              autoFocus
            />
          </label>
          <label className="modal-field">
            <span className="modal-field__label">Goal</span>
            <textarea
              className="modal-field__textarea"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this playbook accomplish?"
              rows={3}
            />
          </label>
        </div>
        <div className="modal-dialog__footer">
          <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            <Plus size={14} /> Create
          </button>
        </div>
      </div>
    </div>
  );
}
