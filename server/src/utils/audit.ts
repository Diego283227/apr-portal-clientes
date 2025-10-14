import mongoose from 'mongoose';

// Audit log interface
export interface AuditLogData {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'UPDATE_BOLETA_STATUS' | 'DOWNLOAD' | 'RESTORE' | 'ARCHIVE';
  entity?: string;
  entityId?: string;
  userId: string;
  details?: any;
  ipAddress?: string;
}

// Simple audit log function (you can expand this to save to database if needed)
export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  try {
    // For now, just console.log the audit data
    // You can implement database storage later if needed
    console.log(`🔍 AUDIT LOG: ${data.action} ${data.entity} (ID: ${data.entityId}) by user ${data.userId}`, data.details);
    
    // Optional: Save to database
    // const auditLog = new AuditLog(data);
    // await auditLog.save();
    
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};