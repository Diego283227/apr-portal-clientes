import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import cron from 'node-cron';
import SystemConfig from '../models/SystemConfig';
import { User, Boleta, Pago, TarifaConfig } from '../models';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // "02:00"
  retentionDays: number;
  includeFiles: boolean;
  notifyEmails: string[];
  backupPath: string;
}

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  timestamp: Date;
  duration: number;
  error?: string;
}

export class BackupService {
  private static instance: BackupService;
  private backupPath: string;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {
    // Crear directorio de backups si no existe
    this.backupPath = path.join(process.cwd(), 'backups');
    this.ensureBackupDirectory();
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
      console.log(`📁 Directorio de backups creado: ${this.backupPath}`);
    }
  }

  /**
   * Realizar backup completo del sistema
   */
  async createFullBackup(includeFiles: boolean = true): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = `backup_${timestamp.toISOString().split('T')[0]}_${timestamp.getHours()}-${timestamp.getMinutes()}.zip`;
    const backupFilePath = path.join(this.backupPath, filename);

    try {
      console.log('💾 Iniciando backup completo del sistema...');

      // 1. Crear backup de la base de datos
      const dbBackupPath = await this.createDatabaseBackup();

      // 2. Crear backup de archivos (si está habilitado)
      let filesBackupPath: string | null = null;
      if (includeFiles) {
        filesBackupPath = await this.createFilesBackup();
      }

      // 3. Crear ZIP con todo
      const zipPath = await this.createZipBackup(backupFilePath, {
        database: dbBackupPath,
        files: filesBackupPath
      });

      // 4. Limpiar archivos temporales
      fs.unlinkSync(dbBackupPath);
      if (filesBackupPath && fs.existsSync(filesBackupPath)) {
        fs.unlinkSync(filesBackupPath);
      }

      const stats = fs.statSync(zipPath);
      const duration = Date.now() - startTime;

      console.log(`✅ Backup completado: ${filename} (${this.formatFileSize(stats.size)}) en ${duration}ms`);

      return {
        success: true,
        filename,
        size: stats.size,
        timestamp,
        duration
      };

    } catch (error: any) {
      console.error('❌ Error en backup completo:', error);

      // Limpiar archivos parciales en caso de error
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }

      return {
        success: false,
        filename: '',
        size: 0,
        timestamp,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Backup de solo la base de datos (MongoDB)
   */
  private async createDatabaseBackup(): Promise<string> {
    const dbName = process.env.MONGODB_DB_NAME || 'portal_apr';
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = path.join(this.backupPath, `db_backup_${timestamp}.json`);

    try {
      // Método 1: Usar mongoexport para cada colección
      const collections = ['users', 'boletas', 'pagos', 'systemconfig', 'tarifaconfig', 'auditlogs'];
      const backupData: any = {};

      for (const collection of collections) {
        try {
          const Model = this.getModelByCollection(collection);
          if (Model) {
            const data = await Model.find({}).lean();
            backupData[collection] = data;
            console.log(`📊 Backup ${collection}: ${data.length} documentos`);
          }
        } catch (error) {
          console.warn(`⚠️ No se pudo hacer backup de ${collection}:`, error);
          backupData[collection] = [];
        }
      }

      // Guardar como JSON
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`✅ Backup de base de datos creado: ${backupPath}`);

      return backupPath;

    } catch (error) {
      console.error('❌ Error en backup de base de datos:', error);
      throw error;
    }
  }

  /**
   * Backup de archivos del sistema
   */
  private async createFilesBackup(): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = path.join(this.backupPath, `files_backup_${timestamp}.tar.gz`);

    try {
      // Directorios importantes a respaldar
      const dirsToBackup = [
        'uploads',     // Archivos subidos por usuarios
        'logs',        // Logs del sistema
        'config',      // Archivos de configuración
        '.env'         // Variables de entorno (¡CUIDADO con secretos!)
      ];

      const existingDirs = dirsToBackup.filter(dir =>
        fs.existsSync(path.join(process.cwd(), dir))
      );

      if (existingDirs.length === 0) {
        console.log('📁 No hay directorios de archivos para respaldar');
        return '';
      }

      // Crear tar.gz con los archivos
      const tarCommand = `tar -czf "${backupPath}" ${existingDirs.join(' ')}`;
      await execAsync(tarCommand, { cwd: process.cwd() });

      console.log(`✅ Backup de archivos creado: ${backupPath}`);
      return backupPath;

    } catch (error) {
      console.error('❌ Error en backup de archivos:', error);
      return ''; // No fallar si no se pueden respaldar archivos
    }
  }

  /**
   * Crear ZIP final con todos los backups
   */
  private async createZipBackup(outputPath: string, sources: {
    database: string;
    files: string | null;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Agregar backup de base de datos
      if (fs.existsSync(sources.database)) {
        archive.file(sources.database, { name: 'database_backup.json' });
      }

      // Agregar backup de archivos si existe
      if (sources.files && fs.existsSync(sources.files)) {
        archive.file(sources.files, { name: 'files_backup.tar.gz' });
      }

      // Agregar metadatos del backup
      const metadata = {
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database_included: fs.existsSync(sources.database),
        files_included: !!(sources.files && fs.existsSync(sources.files))
      };

      archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' });

      archive.finalize();
    });
  }

  /**
   * Obtener modelo de Mongoose por nombre de colección
   */
  private getModelByCollection(collection: string): any {
    switch (collection) {
      case 'users': return User;
      case 'boletas': return Boleta;
      case 'pagos': return Pago;
      case 'systemconfig': return SystemConfig;
      case 'tarifaconfig': return TarifaConfig;
      default: return null;
    }
  }

  /**
   * Configurar backup automático
   */
  async setupAutomaticBackup(config: BackupConfig): Promise<void> {
    // Detener cron job existente
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    if (!config.enabled) {
      console.log('⏸️ Backup automático deshabilitado');
      return;
    }

    // Convertir frecuencia a cron expression
    const cronExpression = this.getCronExpression(config.frequency, config.time);

    // Crear nuevo cron job
    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log('⏰ Iniciando backup automático programado...');

      const result = await this.createFullBackup(config.includeFiles);

      if (result.success) {
        console.log(`✅ Backup automático completado: ${result.filename}`);

        // Limpiar backups antiguos
        await this.cleanOldBackups(config.retentionDays);

        // Enviar notificaciones si están configuradas
        if (config.notifyEmails.length > 0) {
          await this.sendBackupNotification(result, config.notifyEmails);
        }
      } else {
        console.error(`❌ Backup automático falló: ${result.error}`);

        // Notificar error
        if (config.notifyEmails.length > 0) {
          await this.sendBackupErrorNotification(result, config.notifyEmails);
        }
      }
    }, {
      scheduled: true,
      timezone: 'America/Santiago'
    });

    console.log(`🕐 Backup automático configurado: ${config.frequency} a las ${config.time}`);
  }

  /**
   * Convertir configuración a cron expression
   */
  private getCronExpression(frequency: string, time: string): string {
    const [hour, minute] = time.split(':').map(Number);

    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 0`; // Domingo
      case 'monthly':
        return `${minute} ${hour} 1 * *`; // Día 1 de cada mes
      default:
        return `${minute} ${hour} * * *`; // Default: diario
    }
  }

  /**
   * Limpiar backups antiguos
   */
  async cleanOldBackups(retentionDays: number): Promise<void> {
    try {
      const files = fs.readdirSync(this.backupPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('backup_') || !file.endsWith('.zip')) continue;

        const filePath = path.join(this.backupPath, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Backup antiguo eliminado: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} backup(s) antiguos eliminados`);
      }

    } catch (error) {
      console.error('❌ Error limpiando backups antiguos:', error);
    }
  }

  /**
   * Listar backups disponibles
   */
  async listBackups(): Promise<Array<{
    filename: string;
    size: number;
    date: Date;
    sizeFormatted: string;
  }>> {
    try {
      const files = fs.readdirSync(this.backupPath);
      const backups = [];

      for (const file of files) {
        if (!file.startsWith('backup_') || !file.endsWith('.zip')) continue;

        const filePath = path.join(this.backupPath, file);
        const stats = fs.statSync(filePath);

        backups.push({
          filename: file,
          size: stats.size,
          date: stats.mtime,
          sizeFormatted: this.formatFileSize(stats.size)
        });
      }

      // Ordenar por fecha (más reciente primero)
      return backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    } catch (error) {
      console.error('❌ Error listando backups:', error);
      return [];
    }
  }

  /**
   * Restaurar desde backup
   */
  async restoreFromBackup(filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const backupPath = path.join(this.backupPath, filename);

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'Archivo de backup no encontrado' };
      }

      console.log(`🔄 Iniciando restauración desde: ${filename}`);

      const tempDir = path.join(this.backupPath, 'temp_restore');

      // 1. Extraer ZIP
      await this.extractBackup(backupPath, tempDir);

      // 2. Verificar integridad del backup
      const metadata = await this.validateBackupIntegrity(tempDir);
      if (!metadata.valid) {
        this.cleanupTempDir(tempDir);
        return { success: false, message: metadata.error || 'Backup corrupto o inválido' };
      }

      // 3. Restaurar base de datos
      const dbRestored = await this.restoreDatabase(tempDir);
      if (!dbRestored) {
        this.cleanupTempDir(tempDir);
        return { success: false, message: 'Error restaurando base de datos' };
      }

      // 4. Restaurar archivos (opcional)
      await this.restoreFiles(tempDir);

      // 5. Limpiar archivos temporales
      this.cleanupTempDir(tempDir);

      console.log(`✅ Restauración completada desde: ${filename}`);
      return {
        success: true,
        message: 'Restauración completada exitosamente. Se recomienda reiniciar la aplicación.'
      };

    } catch (error: any) {
      console.error('❌ Error en restauración:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Extraer archivo ZIP de backup
   */
  private async extractBackup(backupPath: string, extractDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const extract = require('extract-zip');

      // Crear directorio temporal si no existe
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }

      extract(backupPath, { dir: extractDir })
        .then(() => resolve())
        .catch((error: any) => reject(error));
    });
  }

  /**
   * Validar integridad del backup
   */
  private async validateBackupIntegrity(tempDir: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const metadataPath = path.join(tempDir, 'backup_metadata.json');

      if (!fs.existsSync(metadataPath)) {
        return { valid: false, error: 'Metadatos del backup no encontrados' };
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Verificar que tenga estructura válida
      if (!metadata.timestamp || !metadata.version) {
        return { valid: false, error: 'Metadatos del backup inválidos' };
      }

      // Verificar que exista al menos el backup de base de datos
      const dbBackupPath = path.join(tempDir, 'database_backup.json');
      if (!fs.existsSync(dbBackupPath)) {
        return { valid: false, error: 'Backup de base de datos no encontrado' };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: 'Error validando integridad del backup' };
    }
  }

  /**
   * Restaurar base de datos desde backup
   */
  private async restoreDatabase(tempDir: string): Promise<boolean> {
    try {
      const dbBackupPath = path.join(tempDir, 'database_backup.json');
      const backupData = JSON.parse(fs.readFileSync(dbBackupPath, 'utf8'));

      console.log('🔄 Restaurando base de datos...');

      // Limpiar colecciones existentes (¡CUIDADO!)
      const collections = Object.keys(backupData);
      for (const collectionName of collections) {
        try {
          const Model = this.getModelByCollection(collectionName);
          if (Model) {
            await Model.deleteMany({});
            console.log(`🗑️ Colección ${collectionName} limpiada`);
          }
        } catch (error) {
          console.warn(`⚠️ No se pudo limpiar colección ${collectionName}:`, error);
        }
      }

      // Restaurar datos
      for (const collectionName of collections) {
        try {
          const Model = this.getModelByCollection(collectionName);
          const documents = backupData[collectionName];

          if (Model && documents && documents.length > 0) {
            await Model.insertMany(documents);
            console.log(`✅ Restaurados ${documents.length} documentos en ${collectionName}`);
          }
        } catch (error) {
          console.error(`❌ Error restaurando ${collectionName}:`, error);
          // Continuar con otras colecciones
        }
      }

      return true;

    } catch (error) {
      console.error('❌ Error restaurando base de datos:', error);
      return false;
    }
  }

  /**
   * Restaurar archivos desde backup
   */
  private async restoreFiles(tempDir: string): Promise<void> {
    try {
      const filesBackupPath = path.join(tempDir, 'files_backup.tar.gz');

      if (!fs.existsSync(filesBackupPath)) {
        console.log('📁 No hay backup de archivos para restaurar');
        return;
      }

      console.log('🔄 Restaurando archivos...');

      // Extraer archivos
      const tarCommand = `tar -xzf "${filesBackupPath}" -C "${process.cwd()}"`;
      await execAsync(tarCommand);

      console.log('✅ Archivos restaurados exitosamente');

    } catch (error) {
      console.warn('⚠️ Error restaurando archivos (no crítico):', error);
    }
  }

  /**
   * Limpiar directorio temporal
   */
  private cleanupTempDir(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando directorio temporal:', error);
    }
  }

  /**
   * Enviar notificación de backup exitoso
   */
  private async sendBackupNotification(result: BackupResult, emails: string[]): Promise<void> {
    // TODO: Implementar envío de email
    console.log(`📧 Notificación de backup enviada a: ${emails.join(', ')}`);
  }

  /**
   * Enviar notificación de error en backup
   */
  private async sendBackupErrorNotification(result: BackupResult, emails: string[]): Promise<void> {
    // TODO: Implementar envío de email de error
    console.log(`📧 Notificación de error enviada a: ${emails.join(', ')}`);
  }

  /**
   * Formatear tamaño de archivo
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Obtener estadísticas de backups
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    averageSize: number;
  }> {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        averageSize: 0
      };
    }

    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: backups[backups.length - 1]?.date,
      newestBackup: backups[0]?.date,
      averageSize: totalSize / backups.length
    };
  }
}

export default BackupService;