import { readPlaybook, writePlaybook } from "./playbooks";
import YAML from "yaml";

export interface Schedule {
  cron: string | null;
  timezone: string | null;
  enabled: boolean;
}

const CRON_REGEX = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([012]?\d|3[01])) (\*|(1[0-2]|0?[1-9])) (\*|([0-6]))$/;

function validateCron(cron: string): void {
  if (!CRON_REGEX.test(cron.trim())) {
    throw new Error(`Invalid cron expression: ${cron}`);
  }
}

export async function readSchedule(playbookName: string, root?: string): Promise<Schedule> {
  const { raw } = await readPlaybook(playbookName, root);
  const parsed = YAML.parse(raw) as Record<string, unknown>;
  const sched = parsed.schedule as Record<string, unknown> | undefined;
  return {
    cron: sched?.cron as string | null ?? null,
    timezone: (sched?.timezone as string | null) ?? null,
    enabled: (sched?.enabled as boolean) ?? false,
  };
}

export async function writeSchedule(
  playbookName: string,
  schedule: Schedule,
  root?: string
): Promise<void> {
  if (schedule.cron) {
    validateCron(schedule.cron);
  }

  const { raw } = await readPlaybook(playbookName, root);
  const parsed = YAML.parse(raw) as Record<string, unknown>;

  parsed.schedule = {
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.enabled,
  };

  await writePlaybook(playbookName, YAML.stringify(parsed), root);
}