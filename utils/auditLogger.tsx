// src/utils/auditLogger.ts
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';

interface AuditLogParams {
  actionType: string;
  actor: User | null;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityDescription: string;
  actionDescription: string;
  details: any;
  timestamp?: Timestamp;
}

export const PlatformAuditLog = async ({
  actionType,
  actor,
  targetEntityId,
  targetEntityType,
  targetEntityDescription,
  actionDescription,
  details,
  timestamp = Timestamp.now(),
}: AuditLogParams) => {
  if (!actor) {
    console.warn('[AuditLogger] Skipped logging — actor missing');
    return;
  }

  // Recursively replace undefined with null (Firestore rejects undefined in any nested field)
  const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (value instanceof Date) return Timestamp.fromDate(value);
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = sanitizeForFirestore(v);
      }
      return result;
    }
    return value;
  };

  try {
    await addDoc(collection(db, 'platformAuditLogs'), {
      timestamp,
      actionType,
      actorUserId: actor.id,
      actorUserName: actor.name || 'Unknown User',
      actorUserEmail: actor.email || 'N/A',
      actorUserRole: actor.role || 'N/A',
      targetEntityId,
      targetEntityType,
      targetEntityDescription,
      actionDescription,
      source: 'Platform Audit',
      details: sanitizeForFirestore(details),
    });

    console.log('[AuditLogger] Audit log recorded.');
  } catch (error) {
    console.error('[AuditLogger] Failed to log audit:', error);
  }
};
