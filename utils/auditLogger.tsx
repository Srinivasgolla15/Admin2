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
      details,
    });

    console.log('[AuditLogger] Audit log recorded.');
  } catch (error) {
    console.error('[AuditLogger] Failed to log audit:', error);
  }
};
