export interface TaskEnvOptions {
  currentTaskPath?: string;
  workerId?: string;
  taskDir?: string;
  taskWave?: string;
  taskWaveSource?: string;
  attemptDir?: string;
  attempt?: string;
  vars?: Record<string, unknown>;
  spawnDir?: string;
}

function applyVarEnv(env: NodeJS.ProcessEnv, vars?: Record<string, unknown>): void {
  for (const key of Object.keys(env)) {
    if (key.startsWith("CONVERGE_VAR_")) delete env[key];
  }
  if (!vars) return;
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined || value === null) continue;
    env[`CONVERGE_VAR_${key.toUpperCase()}`] = String(value);
  }
}

export function buildTaskEnv(
  baseEnv: NodeJS.ProcessEnv,
  opts: TaskEnvOptions,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...baseEnv };
  applyVarEnv(env, opts.vars);

  if (opts.currentTaskPath !== undefined) {
    env.CONVERGE_CURRENT_TASK_PATH = opts.currentTaskPath;
  } else {
    delete env.CONVERGE_CURRENT_TASK_PATH;
  }

  if (opts.workerId !== undefined) {
    env.CONVERGE_WORKER_ID = opts.workerId;
  } else {
    delete env.CONVERGE_WORKER_ID;
  }

  if (opts.taskDir !== undefined) {
    env.CONVERGE_TASK_DIR = opts.taskDir;
  } else {
    delete env.CONVERGE_TASK_DIR;
  }

  if (opts.spawnDir !== undefined) {
    env.CONVERGE_SPAWN_DIR = opts.spawnDir;
  } else if (opts.taskDir !== undefined) {
    // Default SPAWN_DIR to taskDir/spawn (per-task spawn under exec dir)
    env.CONVERGE_SPAWN_DIR = opts.taskDir + "/spawn";
  } else {
    delete env.CONVERGE_SPAWN_DIR;
  }

  if (opts.taskWave !== undefined) {
    env.CONVERGE_TASK_WAVE = opts.taskWave;
  } else {
    delete env.CONVERGE_TASK_WAVE;
  }

  if (opts.taskWaveSource !== undefined) {
    env.CONVERGE_TASK_WAVE_SOURCE = opts.taskWaveSource;
  } else {
    delete env.CONVERGE_TASK_WAVE_SOURCE;
  }

  if (opts.attemptDir !== undefined) {
    env.CONVERGE_TASK_ATTEMPT_DIR = opts.attemptDir;
  } else {
    delete env.CONVERGE_TASK_ATTEMPT_DIR;
  }

  if (opts.attempt !== undefined) {
    env.CONVERGE_TASK_ATTEMPT = opts.attempt;
  } else {
    delete env.CONVERGE_TASK_ATTEMPT;
  }

  return env;
}

