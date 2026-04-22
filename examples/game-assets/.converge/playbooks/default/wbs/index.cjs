#!/usr/bin/env node
/**
 * wbs/index.js — WBS task spawner for game-assets playbook.
 *
 * Spawns sub-tasks per asset (character, object, background, tilemap).
 * Mirrors the pattern from cinematic-video-production/wbs/index.js.
 */

const fs = require('fs');
const path = require('path');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function getTaskContext() {
  const root = findProjectRoot(process.cwd());
  const taskId = process.env.CONVERGE_TASK_ID || '';
  return { root, taskId };
}

function findProjectRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'sprites.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Could not find project root (sprites.json not found)');
}

function spawnCharacterRefs(sprites, taskDir) {
  console.log(`Spawning character ref tasks for ${sprites.length} characters`);
  for (const sprite of sprites) {
    console.log(`  - ${sprite.id}: ${sprite.name}`);
    // In production, this would emit WBS sub-task events
    // For now, we log the intent
  }
}

function main() {
  const { root, taskId } = getTaskContext();

  console.log(`WBS task: ${taskId}`);

  // Route to appropriate sub-task spawner based on taskId
  if (taskId.includes('02-character-refs')) {
    const sprites = loadJson(path.join(root, 'sprites.json'));
    spawnCharacterRefs(sprites, root);
  } else if (taskId.includes('02-object-refs')) {
    const objects = loadJson(path.join(root, 'objects.json'));
    console.log(`Spawning object ref tasks for ${objects.length} objects`);
  } else if (taskId.includes('03-sprite-sheet-gen')) {
    const sprites = loadJson(path.join(root, 'sprites.json'));
    console.log(`Spawning sprite sheet tasks for ${sprites.length} characters`);
  }

  console.log('WBS complete');
}

main();