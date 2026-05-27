import type { SkillSummary } from '../types';
import { Wrench } from 'lucide-react';

interface Props {
  skills: SkillSummary[];
}

export function SkillsSection({ skills }: Props) {
  if (skills.length === 0) return null;

  return (
    <section className="skills-section">
      <h3 className="skills-section__title">Skills</h3>
      <div className="skills-section__grid">
        {skills.map((skill) => (
          <div key={skill.id} className="skills-section__card">
            <Wrench size={16} />
            <span className="skills-section__name">{skill.name}</span>
            <p className="skills-section__desc">{skill.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
