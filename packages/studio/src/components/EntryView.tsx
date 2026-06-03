import { useState } from "react";
import type {
  PlaybookSummary,
  SkillSummary,
  ProviderInfo,
  StudioConfig,
  EntryHomeView,
} from "../types";
import { useRoute, navigate } from "../router";
import { EntryShell } from "./EntryShell";
import { HomeView } from "./HomeView";
import { WorkspacesView } from "./WorkspacesView";
import { BookOpen, Play, Wrench, Server, Plus, Loader2 } from "lucide-react";

interface Props {
  playbooks: PlaybookSummary[];
  skills: SkillSummary[];
  providers: ProviderInfo[];
  config: StudioConfig;
  loading: boolean;
}

export function EntryView({
  playbooks,
  skills,
  providers,
  config,
  loading,
}: Props) {
  const route = useRoute();
  const view: EntryHomeView = route.kind === "home" ? route.view : "home";

  function changeView(next: EntryHomeView) {
    navigate({ kind: "home", view: next });
  }

  return (
    <EntryShell view={view} onViewChange={changeView}>
      <div className="entry-view">
        <div className="entry-view__content">
          {loading ? (
            <div className="entry-view__loading">
              <Loader2 className="entry-view__spinner" size={24} />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {view === "home" ? (
                <HomeView
                  playbooks={playbooks}
                  onOpenPlaybook={(name) =>
                    navigate({
                      kind: "playbook",
                      playbookName: name,
                      taskId: null,
                    })
                  }
                  onViewAllPlaybooks={() => changeView("playbooks")}
                />
              ) : null}

              {view === "workspaces" ? <WorkspacesView /> : null}

              {view === "playbooks" ? (
                <div className="entry-section">
                  <header className="entry-section__head">
                    <h1 className="entry-section__title">Playbooks</h1>
                  </header>
                  {playbooks.length === 0 ? (
                    <div className="entry-section__empty">
                      <BookOpen size={32} />
                      <p>No playbooks yet. Create one to get started.</p>
                    </div>
                  ) : (
                    <div className="entry-section__grid">
                      {playbooks.map((pb) => (
                        <button
                          key={pb.name}
                          type="button"
                          className="entry-card"
                          onClick={() =>
                            navigate({
                              kind: "playbook",
                              playbookName: pb.name,
                              taskId: null,
                            })
                          }
                        >
                          <div className="entry-card__head">
                            <BookOpen size={16} />
                            <span className="entry-card__title">{pb.name}</span>
                          </div>
                          <p className="entry-card__desc">{pb.description}</p>
                          <div className="entry-card__meta">
                            <span className="entry-card__badge">
                              {pb.status}
                            </span>
                            <span>{pb.taskCount} tasks</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {view === "runs" ? (
                <div className="entry-section">
                  <header className="entry-section__head">
                    <h1 className="entry-section__title">Runs</h1>
                  </header>
                  <div className="entry-section__empty">
                    <Play size={32} />
                    <p>
                      No active runs. Start a playbook to see execution runs
                      here.
                    </p>
                  </div>
                </div>
              ) : null}

              {view === "skills" ? (
                <div className="entry-section">
                  <header className="entry-section__head">
                    <h1 className="entry-section__title">Skills</h1>
                  </header>
                  {skills.length === 0 ? (
                    <div className="entry-section__empty">
                      <Wrench size={32} />
                      <p>No skills registered.</p>
                    </div>
                  ) : (
                    <div className="entry-section__grid">
                      {skills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          className="entry-card"
                          onClick={() =>
                            navigate({
                              kind: "skill-detail",
                              skillId: skill.id,
                            })
                          }
                        >
                          <div className="entry-card__head">
                            <Wrench size={16} />
                            <span className="entry-card__title">
                              {skill.name}
                            </span>
                          </div>
                          <p className="entry-card__desc">
                            {skill.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {view === "providers" ? (
                <div className="entry-section">
                  <header className="entry-section__head">
                    <h1 className="entry-section__title">Providers</h1>
                  </header>
                  {providers.length === 0 ? (
                    <div className="entry-section__empty">
                      <Server size={32} />
                      <p>No providers configured.</p>
                    </div>
                  ) : (
                    <div className="entry-section__grid">
                      {providers.map((prov) => (
                        <div key={prov.id} className="entry-card">
                          <div className="entry-card__head">
                            <Server size={16} />
                            <span className="entry-card__title">
                              {prov.name}
                            </span>
                            <span
                              className={`entry-card__dot ${
                                prov.available
                                  ? "entry-card__dot--ok"
                                  : "entry-card__dot--off"
                              }`}
                            />
                          </div>
                          {prov.model ? (
                            <p className="entry-card__desc">
                              Model: {prov.model}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </EntryShell>
  );
}
