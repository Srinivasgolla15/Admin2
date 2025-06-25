// utils/auditLogger.ts
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export const PlatformAuditLog = async ({
  actionType,
  actor,
  targetEntityId,
  targetEntityType,
  targetEntityDescription,
  actionDescription,
  details,
}: {
  actionType: string;
  actor: any;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityDescription: string;
  actionDescription: string;
  details: any;
}) => {
  await addDoc(collection(db, 'platformAuditLogs'), {
    timestamp: Timestamp.now(),
    actionType,
    actorUserName: actor.name,
    actorUserEmail: actor.email,
    actorUserRole: actor.role,
    targetEntityId,
    targetEntityType,
    targetEntityDescription,
    actionDescription,
    source: 'Platform Audit',
    details,
  });
};
