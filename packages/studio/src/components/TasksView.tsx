import type { PlaybookSummary } from "../types";
import { navigate } from "../router";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface Props {
  playbooks: PlaybookSummary[];
}

const STATUS_ICON: Record<string, typeof Clock> = {
  running: Play,
  complete: CheckCircle,
  error: XCircle,
};

export function TasksView({ playbooks }: Props) {
  const withRuns = playbooks.filter((pb) => pb.status !== "pending");

  return (
    <div className="tasks-view">
      <div className="tasks-view__list">
        {withRuns.length === 0 ? (
          <div className="tasks-view__empty">
            <Clock size={32} />
            <p>No runs yet. Execute a playbook to see history here.</p>
          </div>
        ) : (
          withRuns.map((pb) => {
            const Icon = STATUS_ICON[pb.status] ?? Clock;
            return (
              <button
                key={pb.name}
                type="button"
                className="tasks-view__row"
                onClick={() =>
                  navigate({
                    kind: "playbook-run",
                    playbookName: pb.name,
                    executionId: "latest",
                  })
                }
              >
                <Icon
                  size={16}
                  className={`tasks-view__status tasks-view__status--${pb.status}`}
                />
                <span className="tasks-view__name">{pb.name}</span>
                <span className="tasks-view__desc">{pb.description}</span>
                <span className="tasks-view__tasks">{pb.taskCount} tasks</span>
                <span className="tasks-view__time">
                  {new Date(pb.updatedAt).toLocaleDateString()}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
