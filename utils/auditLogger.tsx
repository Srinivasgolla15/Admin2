import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';

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
  actor: User | null;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityDescription: string;
  actionDescription: string;
  timestamp?: Timestamp;
  details: any;
}) => {
  console.log('[DEBUG] AuditLogger: Logging audit with actor:', actor);
  await addDoc(collection(db, 'platformAuditLogs'), {
    timestamp: Timestamp.now(),
    actionType,
    actorUserName: actor?.name || 'Unknown User', // Fallback for missing name
    actorUserEmail: actor?.email || 'N/A', // Fallback for missing email
    actorUserRole: actor?.role || 'N/A', // Fallback for missing role
    targetEntityId,
    targetEntityType,
    targetEntityDescription,
    actionDescription,
    source: 'Platform Audit',
    details,
  });
  console.log('[DEBUG] AuditLogger: Audit log saved successfully');
};