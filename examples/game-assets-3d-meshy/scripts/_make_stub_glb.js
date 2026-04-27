#!/usr/bin/env node
/**
 * One-time helper: emit a tiny valid GLB containing a single colored cube.
 * Run once to populate vendor/stub-cube.glb. Not part of the playbook.
 *
 * Why this is here at all: the stub backends need *some* valid GLB to copy.
 * We don't want to vendor a binary asset of unknown provenance, so we emit
 * one ourselves from a known-good geometry definition. Single triangle would
 * be enough for "valid GLB" but a cube actually renders meaningfully in the
 * gallery and play scene.
 */

import { writeFileSync, mkdirSync } from 'fs';

// glTF 2.0 cube — 8 vertices, 12 triangles, indexed
const positions = new Float32Array([
  -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3,    // front
  1, 5, 6, 1, 6, 2,    // right
  5, 4, 7, 5, 7, 6,    // back
  4, 0, 3, 4, 3, 7,    // left
  3, 2, 6, 3, 6, 7,    // top
  4, 5, 1, 4, 1, 0,    // bottom
]);

// Pad each buffer to a 4-byte boundary
function pad4(n) { return (4 - (n % 4)) % 4; }

const posBytes = Buffer.from(positions.buffer);
const idxBytes = Buffer.from(indices.buffer);
const idxPad   = Buffer.alloc(pad4(idxBytes.length));

const bin = Buffer.concat([posBytes, idxBytes, idxPad]);

const json = {
  asset: { version: '2.0', generator: 'converge stub' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{
    pbrMetallicRoughness: { baseColorFactor: [0.6, 0.6, 0.6, 1.0], metallicFactor: 0.1, roughnessFactor: 0.7 },
    name: 'stub',
  }],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: posBytes.length, byteLength: idxBytes.length, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.5,-0.5,-0.5], max: [0.5,0.5,0.5] },
    { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
};

const jsonStr = JSON.stringify(json);
const jsonBuf = Buffer.from(jsonStr);
const jsonPad = Buffer.alloc(pad4(jsonBuf.length), 0x20); // pad with spaces
const jsonChunkBody = Buffer.concat([jsonBuf, jsonPad]);

// Chunk: [length:u32][type:u32][body...]
function chunk(typeFourCC, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(body.length, 0);
  // Type: 'JSON' = 0x4E4F534A, 'BIN\0' = 0x004E4942
  const t = typeFourCC === 'JSON' ? 0x4E4F534A : 0x004E4942;
  head.writeUInt32LE(t, 4);
  return Buffer.concat([head, body]);
}

const jsonChunk = chunk('JSON', jsonChunkBody);
const binChunk  = chunk('BIN\0', bin);

// Header: magic 'glTF' + version 2 + total length
const total = 12 + jsonChunk.length + binChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);  // 'glTF'
header.writeUInt32LE(2, 4);           // version
header.writeUInt32LE(total, 8);

const glb = Buffer.concat([header, jsonChunk, binChunk]);

mkdirSync('vendor', { recursive: true });
writeFileSync('vendor/stub-cube.glb', glb);
console.log(`✓ vendor/stub-cube.glb (${glb.length} bytes)`);
