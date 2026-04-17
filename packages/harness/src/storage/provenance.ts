/**
 * Provenance Tracking
 *
 * Tracks what created what and why, providing an audit trail for the build system.
 * Useful for debugging, understanding decisions, and migration analysis.
 */

import { FilesystemStorage } from './filesystem.ts';
import type { ProvenanceRecord } from './types.ts';

/* ------------------------------------------------------------------ */
/*  Provenance Manager                                                */
/* ------------------------------------------------------------------ */

export class ProvenanceManager {
  constructor(private storage: FilesystemStorage) {}

  /**
   * Record creation of an entity
   */
  recordCreation(params: {
    entityId: string;
    entityType: ProvenanceRecord['entityType'];
    createdBy: ProvenanceRecord['createdBy'];
    trigger?: ProvenanceRecord['trigger'];
    related?: ProvenanceRecord['related'];
  }): void {
    const record: ProvenanceRecord = {
      entityId: params.entityId,
      entityType: params.entityType,
      created: new Date().toISOString(),
      createdBy: params.createdBy,
      trigger: params.trigger,
      related: params.related,
      changes: [],
    };

    this.storage.writeProvenance(record);
  }

  /**
   * Record a change to an entity
   */
  recordChange(params: {
    entityId: string;
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
  }): void {
    const existing = this.storage.readProvenance(params.entityId);
    if (!existing) {
      throw new Error(`Cannot record change: entity ${params.entityId} not found`);
    }

    const change = {
      timestamp: new Date().toISOString(),
      field: params.field,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
    };

    const updated: ProvenanceRecord = {
      ...existing,
      changes: [...(existing.changes || []), change],
    };

    this.storage.writeProvenance(updated);
  }

  /**
   * Get provenance record for an entity
   */
  getProvenance(entityId: string): ProvenanceRecord | null {
    return this.storage.readProvenance(entityId);
  }

  /**
   * Get entities created by a specific source
   */
  getEntitiesCreatedBy(createdBy: ProvenanceRecord['createdBy']): ProvenanceRecord[] {
    const allIds = this.storage.listProvenance();
    return allIds
      .map(id => this.storage.readProvenance(id))
      .filter((record): record is ProvenanceRecord => record !== null && record.createdBy === createdBy);
  }

  /**
   * Get entities triggered by a gap
   */
  getEntitiesTriggeredByGap(gapId: string): ProvenanceRecord[] {
    const allIds = this.storage.listProvenance();
    return allIds
      .map(id => this.storage.readProvenance(id))
      .filter((record): record is ProvenanceRecord =>
        record !== null &&
        record.trigger?.type === 'gap' &&
        record.trigger?.source === gapId
      );
  }

  /**
   * Get children of an entity
   */
  getChildren(entityId: string): ProvenanceRecord[] {
    const allIds = this.storage.listProvenance();
    return allIds
      .map(id => this.storage.readProvenance(id))
      .filter((record): record is ProvenanceRecord =>
        record !== null &&
        record.related?.parent === entityId
      );
  }

  /**
   * Get change history for an entity
   */
  getChangeHistory(entityId: string): ProvenanceRecord['changes'] {
    const record = this.storage.readProvenance(entityId);
    return record?.changes || [];
  }

  /**
   * Generate provenance report (useful for debugging)
   */
  generateReport(): {
    total: number;
    byType: Record<string, number>;
    byCreator: Record<string, number>;
    byTrigger: Record<string, number>;
  } {
    const allIds = this.storage.listProvenance();
    const records = allIds
      .map(id => this.storage.readProvenance(id))
      .filter((r): r is ProvenanceRecord => r !== null);

    const byType: Record<string, number> = {};
    const byCreator: Record<string, number> = {};
    const byTrigger: Record<string, number> = {};

    for (const record of records) {
      byType[record.entityType] = (byType[record.entityType] || 0) + 1;
      byCreator[record.createdBy] = (byCreator[record.createdBy] || 0) + 1;
      if (record.trigger?.type) {
        byTrigger[record.trigger.type] = (byTrigger[record.trigger.type] || 0) + 1;
      }
    }

    return {
      total: records.length,
      byType,
      byCreator,
      byTrigger,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new provenance manager
 */
export function createProvenanceManager(storage: FilesystemStorage): ProvenanceManager {
  return new ProvenanceManager(storage);
}
