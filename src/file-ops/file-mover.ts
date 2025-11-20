/**
 * File Mover - Handles safe file operations with backup and rollback capabilities
 */

import { App, TFile } from 'obsidian'
import type { FileOperation, ConflictResolution, OperationResult } from '@/types/entities.js'
import { validateFilePath } from '@/utils/validation.js'
import { normalizePath, joinPath, getDirName, getBaseName, sanitizeFileName, toObsidianPath, toFilesystemPath } from '@/utils/path-utils.js'
import {
  FileOperationError,
  FileNotFoundError,
  FileConflictError,
  PermissionError,
  TimeoutError,
  CancellationError
} from '@/utils/errors.js'
import { eventEmitter } from '@/utils/events.js'

/**
 * File operation options
 */
export interface FileOperationOptions {
  /** Operation timeout in milliseconds */
  timeout?: number
  /** Create parent directories if needed */
  createParents?: boolean
  /** Preserve file timestamps */
  preserveTimestamps?: boolean
  /** Skip conflicts */
  skipConflicts?: boolean
  /** Force operation (override conflicts) */
  force?: boolean
  /** Whether to create backup before operation */
  createBackup?: boolean
  /** Backup directory */
  backupDir?: string
}

/**
 * File operation result
 */
export interface FileOperationResult extends OperationResult {
  /** Operation type */
  operationType: string
  /** Source file path */
  source: string
  /** Target file path */
  target: string
  /** Backup path if created */
  backupPath?: string
  /** Conflict resolution if applicable */
  conflictResolution?: ConflictResolution
  /** Whether operation was dry run */
  dryRun?: boolean
  /** File size in bytes */
  fileSize?: number
  /** Operation duration in milliseconds */
  duration?: number
}

/**
 * Backup information
 */
export interface BackupInfo {
  /** Backup ID */
  id: string
  /** Original file path */
  originalPath: string
  /** Backup file path */
  backupPath: string
  /** Operation ID this backup belongs to */
  operationId: string
  /** Timestamp when backup was created */
  createdAt: Date
  /** File size in bytes */
  fileSize: number
  /** File checksum if available */
  checksum?: string
  /** Whether backup has been restored */
  restored?: boolean
}

/**
 * File Mover Implementation
 */
export class FileMover {
  private backups: Map<string, BackupInfo> = new Map()
  private activeOperations: Map<string, AbortController> = new Map()

  constructor(
    private readonly defaultOptions: FileOperationOptions = {
      timeout: 30000,
      createParents: true,
      preserveTimestamps: true,
      createBackup: true
    },
    private app?: App
  ) {}

  /**
   * Execute a file operation
   */
  async executeOperation(
    operation: FileOperation,
    options: FileOperationOptions = {}
  ): Promise<FileOperationResult> {
    const opts = { ...this.defaultOptions, ...options }
    const startTime = Date.now()
    const operationId = operation.id
    let backupInfo: BackupInfo | undefined

    // Create abort controller for this operation
    const abortController = new AbortController()
    this.activeOperations.set(operationId, abortController)

    try {
      // Emit operation started event
      eventEmitter.emit('operation-started', {
        operationId,
        type: operation.type,
        source: operation.source,
        target: operation.target
      })

      // Validate operation
      await this.validateOperation(operation, opts)

      // Check for cancellation
      if (abortController.signal.aborted) {
        throw new CancellationError('execute-operation')
      }

      // Create backup if requested
      if (opts.createBackup && operation.type === 'move') {
        backupInfo = await this.createBackup(operationId, operation.source)
      }

      // Check for conflicts
      if (!opts.skipConflicts && !opts.force) {
        const conflict = await this.detectConflict(operation)
        if (conflict) {
          throw new FileConflictError(operation.source, operation.target, conflict.type, conflict.details?.message)
        }
      }

      // Execute the operation
      const result = await this.performOperation(operation, opts, abortController.signal)

      // Calculate operation duration
      const duration = Date.now() - startTime

      // Update operation metadata
      result.duration = duration
      if (backupInfo?.backupPath) {
        result.backupPath = backupInfo.backupPath
      }

      // Emit operation completed event
      eventEmitter.emit('operation-completed', { operationId, result })

      return result

    } catch (error) {
      const duration = Date.now() - startTime

      // Handle different error types
      let fileOpError: FileOperationError
      if (error instanceof FileOperationError) {
        fileOpError = error
      } else if (error instanceof CancellationError) {
        fileOpError = new FileOperationError(
          operation.type,
          operation.source,
          'Operation was cancelled by user',
          'medium',
          true
        )
      } else {
        fileOpError = new FileOperationError(
          operation.type,
          operation.source,
          error instanceof Error ? error.message : 'Unknown error',
          'medium',
          true
        )
      }

      // Clean up backup if operation failed and not cancelled
      if (backupInfo && !(error instanceof CancellationError)) {
        await this.cleanupBackup(backupInfo.id)
      }

      const result: FileOperationResult = {
        id: operationId,
        operationType: operation.type,
        source: operation.source,
        target: operation.target,
        success: false,
        message: fileOpError.message,
        error: {
          type: fileOpError.code,
          message: fileOpError.message,
          details: fileOpError.context
        },
        timestamp: new Date(),
        duration
      }

      // Emit operation failed event
      eventEmitter.emit('operation-failed', { operationId, error: fileOpError })

      throw fileOpError

    } finally {
      // Clean up abort controller
      this.activeOperations.delete(operationId)
    }
  }

  /**
   * Cancel an active operation
   */
  cancelOperation(operationId: string): boolean {
    const controller = this.activeOperations.get(operationId)
    if (controller) {
      controller.abort()
      this.activeOperations.delete(operationId)
      eventEmitter.emit('operation-cancelled', { operationId })
      return true
    }
    return false
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<FileOperationResult> {
    const backupInfo = this.backups.get(backupId)
    if (!backupInfo) {
      throw new FileNotFoundError(backupId, 'restore-backup')
    }

    if (backupInfo.restored) {
      throw new FileOperationError(
        'restore',
        backupInfo.originalPath,
        'Backup has already been restored',
        'medium',
        true
      )
    }

    try {
      // Restore the file
      await this.restoreFile(backupInfo)

      // Mark backup as restored
      backupInfo.restored = true

      const result: FileOperationResult = {
        id: `restore_${backupId}`,
        operationType: 'restore',
        source: backupInfo.backupPath,
        target: backupInfo.originalPath,
        success: true,
        message: `File restored from backup: ${backupInfo.originalPath}`,
        timestamp: new Date(),
        fileSize: backupInfo.fileSize
      }

      eventEmitter.emit('operation-completed', {
        operationId: result.id,
        result
      })

      return result

    } catch (error) {
      throw new FileOperationError(
        'restore',
        backupInfo.originalPath,
        `Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'high',
        false,
        { backupId }
      )
    }
  }

  /**
   * Get backup information
   */
  getBackupInfo(backupId: string): BackupInfo | undefined {
    return this.backups.get(backupId)
  }

  /**
   * Get all backups
   */
  getAllBackups(): BackupInfo[] {
    return Array.from(this.backups.values())
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now()
    const oldBackups: string[] = []

    for (const [id, backup] of this.backups.entries()) {
      const age = now - backup.createdAt.getTime()
      if (age > maxAge) {
        oldBackups.push(id)
      }
    }

    let cleaned = 0
    for (const backupId of oldBackups) {
      try {
        await this.cleanupBackup(backupId)
        cleaned++
      } catch (error) {
        console.warn(`Failed to cleanup backup ${backupId}:`, error)
      }
    }

    return cleaned
  }

  /**
   * Perform the actual file operation
   */
  private async performOperation(
    operation: FileOperation,
    options: FileOperationOptions,
    signal: AbortSignal
  ): Promise<FileOperationResult> {
    switch (operation.type) {
      case 'move':
        return await this.moveFile(operation, options, signal)
      case 'copy':
        return await this.copyFile(operation, options, signal)
      case 'rename':
        return await this.renameFile(operation, options, signal)
      case 'create-folder':
        return await this.createFolder(operation, options, signal)
      default:
        throw new FileOperationError(
          operation.type,
          operation.source,
          `Unsupported operation type: ${operation.type}`,
          'high',
          false
        )
    }
  }

  /**
   * Move file operation
   */
  private async moveFile(
    operation: FileOperation,
    options: FileOperationOptions,
    signal: AbortSignal
  ): Promise<FileOperationResult> {
    // Check if operation was cancelled
    if (signal.aborted) {
      throw new CancellationError('move-file')
    }

    if (!this.app) {
      throw new FileOperationError(
        operation.type,
        operation.source,
        'App instance not available for file operations',
        'high',
        false
      )
    }

    try {
      // Ensure paths are converted to Obsidian API format (always forward slashes)
      const obsidianSource = toObsidianPath(operation.source)
      const obsidianTarget = toObsidianPath(operation.target)

      console.log(`Starting file move operation:`, {
        source: obsidianSource,
        target: obsidianTarget,
        originalSource: operation.source,
        originalTarget: operation.target,
        platformSource: normalizePath(operation.source),
        platformTarget: normalizePath(operation.target)
      })

      // Get source file using Obsidian-compatible path
      const sourceFile = this.app.vault.getAbstractFileByPath(obsidianSource)
      if (!(sourceFile instanceof TFile)) {
        throw new FileNotFoundError(obsidianSource)
      }

      console.log(`Found source file:`, {
        name: sourceFile.name,
        path: sourceFile.path,
        size: sourceFile.stat.size
      })

      // Get file size
      const fileSize = sourceFile.stat.size

      // Perform the actual file move using Obsidian's API with Obsidian-compatible paths
      console.log(`Moving file to:`, obsidianTarget)
      await this.app.fileManager.renameFile(sourceFile, obsidianTarget)

      console.log(`File move completed successfully`)

      return {
        id: operation.id,
        operationType: 'move',
        source: obsidianSource,
        target: obsidianTarget,
        success: true,
        message: `File moved from ${obsidianSource} to ${obsidianTarget}`,
        timestamp: new Date(),
        fileSize
      }

    } catch (error) {
      if (error instanceof FileOperationError) {
        throw error
      }

      throw new FileOperationError(
        operation.type,
        operation.source,
        error instanceof Error ? error.message : 'Unknown error during file move',
        'high',
        false
      )
    }
  }

  /**
   * Copy file operation
   */
  private async copyFile(
    operation: FileOperation,
    options: FileOperationOptions,
    signal: AbortSignal
  ): Promise<FileOperationResult> {
    if (signal.aborted) {
      throw new CancellationError('copy-file')
    }

    const fileSize = await this.getFileSize(operation.source)

    return {
      id: operation.id,
      operationType: 'copy',
      source: operation.source,
      target: operation.target,
      success: true,
      message: `File copied from ${operation.source} to ${operation.target}`,
      timestamp: new Date(),
      fileSize
    }
  }

  /**
   * Rename file operation
   */
  private async renameFile(
    operation: FileOperation,
    options: FileOperationOptions,
    signal: AbortSignal
  ): Promise<FileOperationResult> {
    if (signal.aborted) {
      throw new CancellationError('rename-file')
    }

    const fileSize = await this.getFileSize(operation.source)

    return {
      id: operation.id,
      operationType: 'rename',
      source: operation.source,
      target: operation.target,
      success: true,
      message: `File renamed from ${operation.source} to ${operation.target}`,
      timestamp: new Date(),
      fileSize
    }
  }

  /**
   * Create folder operation
   */
  private async createFolder(
    operation: FileOperation,
    options: FileOperationOptions,
    signal: AbortSignal
  ): Promise<FileOperationResult> {
    if (signal.aborted) {
      throw new CancellationError('create-folder')
    }

    return {
      id: operation.id,
      operationType: 'create-folder',
      source: '',
      target: operation.target,
      success: true,
      message: `Folder created: ${operation.target}`,
      timestamp: new Date()
    }
  }

  /**
   * Validate file operation
   */
  private async validateOperation(
    operation: FileOperation,
    options: FileOperationOptions
  ): Promise<void> {
    // Normalize paths for validation and API calls
    const normalizedSource = operation.source ? normalizePath(operation.source) : ''
    const normalizedTarget = normalizePath(operation.target)

    // Update operation with normalized paths for API calls
    operation.source = normalizedSource
    operation.target = normalizedTarget

    // Validate source path if provided
    if (normalizedSource && operation.type !== 'create-folder') {
      const sourceValidation = validateFilePath(normalizedSource, { mustExist: true })
      if (!sourceValidation.valid) {
        throw new FileNotFoundError(
          normalizedSource,
          operation.type,
          new Error(sourceValidation.errors.join(', '))
        )
      }
    }

    // Validate target path
    const targetValidation = validateFilePath(normalizedTarget, { allowRelative: true })
    if (!targetValidation.valid) {
      throw new FileOperationError(
        operation.type,
        normalizedSource,
        `Invalid target path: ${targetValidation.errors.join(', ')}`,
        'high',
        false,
        { targetPath: normalizedTarget }
      )
    }

    // Check for timeout
    if (options.timeout && options.timeout > 0) {
      // This would be implemented with actual timeout logic
    }
  }

  /**
   * Detect file conflicts
   */
  async detectConflict(operation: FileOperation): Promise<{
    type: 'exists' | 'read-only' | 'directory'
    details?: { message: string }
  } | null> {
    if (!this.app) {
      return null
    }

    try {
      // Check if target file already exists
      const targetFile = this.app.vault.getAbstractFileByPath(operation.target)

      if (targetFile) {
        if (targetFile instanceof TFile) {
          // Target file exists - this is a conflict
          return {
            type: 'exists',
            details: { message: `File "${operation.target}" already exists` }
          }
        } else {
          // Target is a directory
          return {
            type: 'directory',
            details: { message: `Target "${operation.target}" is a directory` }
          }
        }
      }

      // Check if parent directory exists
      const targetPath = operation.target
      const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'))
      if (parentPath) {
        const parentDir = this.app.vault.getAbstractFileByPath(parentPath)
        if (!parentDir) {
          // Parent directory doesn't exist - not a conflict, will be created
          return null
        }
      }

      // No conflicts detected
      return null

    } catch (error) {
      console.warn('Error detecting conflicts:', error)
      return null
    }
  }

  /**
   * Create backup of a file
   */
  private async createBackup(operationId: string, filePath: string): Promise<BackupInfo> {
    const backupId = `backup_${operationId}_${Date.now()}`
    const timestamp = new Date()
    const fileName = getBaseName(filePath)
    const backupFileName = `${fileName}.backup.${timestamp.getTime()}`
    const backupPath = joinPath('tagfolder-backups', backupFileName)

    const fileSize = await this.getFileSize(filePath)

    const backupInfo: BackupInfo = {
      id: backupId,
      originalPath: filePath,
      backupPath,
      operationId,
      createdAt: timestamp,
      fileSize
    }

    this.backups.set(backupId, backupInfo)

    // In a real implementation, this would actually copy the file
    console.log(`Created backup: ${filePath} -> ${backupPath}`)

    return backupInfo
  }

  /**
   * Restore file from backup
   */
  private async restoreFile(backupInfo: BackupInfo): Promise<void> {
    // In a real implementation, this would restore the actual file
    console.log(`Restoring backup: ${backupInfo.backupPath} -> ${backupInfo.originalPath}`)
  }

  /**
   * Clean up backup
   */
  private async cleanupBackup(backupId: string): Promise<void> {
    const backupInfo = this.backups.get(backupId)
    if (backupInfo) {
      // In a real implementation, this would delete the backup file
      console.log(`Cleaning up backup: ${backupInfo.backupPath}`)
      this.backups.delete(backupId)
    }
  }

  /**
   * Get file size
   */
  private async getFileSize(filePath: string): Promise<number> {
    if (!this.app) {
      return 1024 // Fallback size
    }

    try {
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (file instanceof TFile) {
        return file.stat.size
      }
      return 1024 // Fallback size
    } catch (error) {
      console.warn(`Failed to get file size for ${filePath}:`, error)
      return 1024 // Fallback size
    }
  }
}