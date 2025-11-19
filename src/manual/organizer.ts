/**
 * Manual Organizer - Orchestrates the complete manual organization workflow
 */

import { App, TFile, Notice } from 'obsidian'
import type { FileOperation } from '@/types/entities.js'
import type { PluginSettings } from '@/types/settings.js'
import type { PathMappingResult } from '@/scanning/path-mapper.js'
import { TagScanner } from '@/scanning/tag-scanner.js'
import { PathMapper } from '@/scanning/path-mapper.js'
import { FileMover, FileOperationOptions } from '@/file-ops/file-mover.js'
import { LinkUpdater } from '@/file-ops/link-updater.js'
import type { LinkUpdateConfig } from '@/types/entities.js'
import { TagSelectionDialog, TagSelectionDialogOptions } from '@/ui/tag-selection-dialog.js'
import { ConflictDialog } from '@/ui/conflict-dialog.js'
import { ProgressIndicator, ProgressManager } from '@/ui/progress.js'
import { DialogFactory } from '@/ui/dialog.js'
import { eventEmitter } from '@/utils/events.js'
import { FileOperationError, CancellationError } from '@/utils/errors.js'
import { joinPath, normalizePath } from '@/utils/path-utils.js'

/**
 * Convert LinkUpdaterSettings to LinkUpdateConfig
 */
function convertToLinkUpdateConfig(settings: PluginSettings['linkUpdater']): LinkUpdateConfig {
  return {
    linkTypes: settings.linkTypes,
    updateEmbeddedFiles: settings.updateSettings.updateEmbeddedFiles,
    updateAliases: settings.updateSettings.updateAliases,
    normalizePaths: settings.updateSettings.normalizePaths,
    preserveWhitespace: settings.updateSettings.preserveWhitespace,
    createBackups: settings.updateSettings.createBackups,
    conflictResolution: 'skip' // Default strategy
  }
}

/**
 * Manual organization result
 */
export interface ManualOrganizationResult {
  /** Whether organization was successful */
  success: boolean
  /** Source file path */
  sourcePath: string
  /** Target path */
  targetPath: string
  /** Selected tag */
  selectedTag: string
  /** File operations performed */
  operations: FileOperation[]
  /** Links updated count */
  linksUpdated: number
  /** Files modified count */
  filesModified: number
  /** Operation duration in milliseconds */
  duration: number
  /** Error if any */
  error?: string
  /** Whether user cancelled */
  cancelled: boolean
}

/**
 * Manual organization options
 */
export interface ManualOrganizationOptions {
  /** Current file to organize */
  currentFile?: string | TFile
  /** Force skip dialogs (for testing) */
  skipDialogs?: boolean
  /** Default tag selection */
  defaultTag?: string
  /** Show progress indicators */
  showProgress?: boolean
  /** Custom progress container */
  progressContainer?: HTMLElement
}

/**
 * Manual Organizer Implementation
 */
export class ManualOrganizer {
  private tagScanner: TagScanner
  private pathMapper: PathMapper
  private fileMover: FileMover
  private linkUpdater: LinkUpdater
  private dialogFactory: DialogFactory
  private progressManager!: ProgressManager

  constructor(
    private app: App,
    private settings: PluginSettings,
    private progressContainer?: HTMLElement
  ) {
    // Initialize components
    this.tagScanner = new TagScanner(this.app, this.settings.scanner.tagExtraction)
    this.pathMapper = new PathMapper()
    this.fileMover = new FileMover({
      timeout: this.settings.organizer.operationTimeout,
      createParents: this.settings.organizer.createParentDirectories,
      preserveTimestamps: this.settings.organizer.preserveTimestamps,
      createBackup: this.settings.organizer.safety.enableBackups
    })
    this.linkUpdater = new LinkUpdater({
      linkTypes: this.settings.linkUpdater.linkTypes,
      updateEmbeddedFiles: true,
      updateAliases: true,
      normalizePaths: true,
      preserveWhitespace: true,
      createBackups: false,
      conflictResolution: 'prompt'
    })
    this.dialogFactory = new DialogFactory(app)

    // Initialize progress manager
    if (this.progressContainer) {
      this.progressManager = new ProgressManager(app, this.progressContainer)
    }

    // Load tag mappings
    this.pathMapper.updateTagMappings(this.settings.tagMappings)
  }

  /**
   * Organize the current note manually
   */
  async organizeCurrentNote(options: ManualOrganizationOptions = {}): Promise<ManualOrganizationResult> {
    const startTime = Date.now()

    try {
      // Get current file
      const currentFile = await this.getCurrentFile(options.currentFile)
      if (!currentFile) {
        throw new Error('No active file to organize')
      }

      // Show loading
      const loadingDialog = this.dialogFactory.showLoading('Scanning file for tags...')

      try {
        // Scan file for tags
        const scanResult = await this.tagScanner.scanFile(currentFile.path)
        if (!scanResult.success || scanResult.tags.length === 0) {
          loadingDialog.close()
          await this.dialogFactory.showInfo(
            'No Tags Found',
            `The file "${currentFile.basename}" doesn't contain any tags. Add some tags to organize it.`
          )
          return {
            success: false,
            sourcePath: currentFile.path,
            targetPath: currentFile.path,
            selectedTag: '',
            operations: [],
            linksUpdated: 0,
            filesModified: 0,
            duration: Date.now() - startTime,
            error: 'No tags found in file',
            cancelled: false
          }
        }

        // Get path mappings for tags
        const tagMappings = this.pathMapper.getTargetPaths(scanResult.tags)

        if (tagMappings.length === 0) {
          loadingDialog.close()
          throw new Error('No valid path mappings found for tags')
        }

        // Close loading dialog
        loadingDialog.close()

        // Show tag selection dialog
        const tagSelection = await this.showTagSelectionDialog(
          currentFile.path,
          tagMappings,
          options
        )

        if (!tagSelection.confirmed) {
          return {
            success: false,
            sourcePath: currentFile.path,
            targetPath: currentFile.path,
            selectedTag: '',
            operations: [],
            linksUpdated: 0,
            filesModified: 0,
            duration: Date.now() - startTime,
            error: 'User cancelled tag selection',
            cancelled: true
          }
        }

        // Execute organization
        const result = await this.executeOrganization(
          currentFile.path,
          tagSelection.data!,
          options.showProgress
        )

        // Show success notification
        if (result.success) {
          new Notice(`Successfully organized "${currentFile.basename}" to ${result.targetPath}`)
        }

        return result

      } finally {
        loadingDialog.close()
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      console.error('Manual organization failed:', error)
      new Notice(`Failed to organize note: ${errorMessage}`)

      return {
        success: false,
        sourcePath: options.currentFile instanceof TFile ? options.currentFile.path : (options.currentFile || ''),
        targetPath: '',
        selectedTag: '',
        operations: [],
        linksUpdated: 0,
        filesModified: 0,
        duration,
        error: errorMessage,
        cancelled: error instanceof CancellationError
      }
    }
  }

  /**
   * Get organization paths preview for a file
   */
  async getOrganizationPathsPreview(file: TFile): Promise<Array<{tag: string, path: string}>> {
    try {
      // Scan file for tags
      const fileTagInfo = await this.tagScanner.scanFile(file.path)

      if (!fileTagInfo.success || fileTagInfo.tags.length === 0) {
        return []
      }

      // Get path mappings for each tag
      const pathMappings: Array<{tag: string, path: string}> = []

      for (const tag of fileTagInfo.tags) {
        const mappingResult = this.pathMapper.getTargetPath(tag)

        if (mappingResult.valid) {
          pathMappings.push({
            tag,
            path: mappingResult.path
          })
        }
      }

      // Sort by tag specificity (nested tags first)
      pathMappings.sort((a, b) => {
        const aNesting = (a.tag.match(/\//g) || []).length
        const bNesting = (b.tag.match(/\//g) || []).length
        return bNesting - aNesting // More nested tags first
      })

      return pathMappings

    } catch (error) {
      console.error('Failed to get organization paths preview:', error)
      return []
    }
  }

  /**
   * Update settings
   */
  updateSettings(settings: PluginSettings): void {
    this.settings = settings

    // Update component configurations
    this.pathMapper.updateTagMappings(settings.tagMappings)
    this.tagScanner = new TagScanner(this.app, settings.scanner.tagExtraction)
    this.fileMover = new FileMover({
      timeout: settings.organizer.operationTimeout,
      createParents: settings.organizer.createParentDirectories,
      preserveTimestamps: settings.organizer.preserveTimestamps,
      createBackup: settings.organizer.safety.enableBackups
    })
    this.linkUpdater = new LinkUpdater(convertToLinkUpdateConfig(settings.linkUpdater))
  }

  /**
   * Get current file
   */
  private async getCurrentFile(currentFile?: string | TFile): Promise<TFile | null> {
    if (currentFile) {
      if (currentFile instanceof TFile) {
        return currentFile
      } else {
        return this.app.vault.getAbstractFileByPath(currentFile) as TFile
      }
    }

    // Get active file in workspace
    const activeFile = this.app.workspace.getActiveFile()
    return activeFile
  }

  /**
   * Show tag selection dialog
   */
  private async showTagSelectionDialog(
    filePath: string,
    tagMappings: PathMappingResult[],
    options: ManualOrganizationOptions
  ): Promise<{ confirmed: boolean; data?: any }> {
    if (options.skipDialogs && tagMappings.length > 0) {
      // Auto-select first mapping for testing
      return {
        confirmed: true,
        data: {
          selectedTag: tagMappings[0]?.tag || '',
          targetPath: tagMappings[0]?.path || '',
          createFolder: true,
          updateLinks: true,
          createBackup: true
        }
      }
    }

    const dialogOptions: TagSelectionDialogOptions = {
      tagMappings,
      currentNotePath: filePath
    }

    if (options.defaultTag !== undefined) {
      dialogOptions.defaultTag = options.defaultTag
    }

    const dialog = new TagSelectionDialog(this.app, dialogOptions)

    dialog.open()
    return await dialog.getResult()
  }

  /**
   * Execute the organization workflow
   */
  private async executeOrganization(
    sourcePath: string,
    selection: any,
    showProgress: boolean = true
  ): Promise<ManualOrganizationResult> {
    const startTime = Date.now()
    let progressIndicator: ProgressIndicator | null = null

    try {
      // Create progress indicator
      if (showProgress && this.progressManager) {
        progressIndicator = this.progressManager.createProgress('organize-note', 'bar', {
          title: 'Organizing Note',
          total: 4, // Scan, Move, Update Links, Finalize
          showCount: true,
          showTimeRemaining: true,
          cancellable: true
        })
      }

      // Step 1: Validate and prepare target path
      progressIndicator?.updateProgress(25, { current: 'Preparing target location...' })

      const targetPath = await this.prepareTargetPath(selection.targetPath, selection.createFolder)

      // Step 2: Create file operation
      progressIndicator?.updateProgress(50, { current: 'Moving file...' })

      const fileOperation = await this.createFileOperation(sourcePath, targetPath)

      // Step 3: Execute file operation
      const moveResult = await this.executeFileOperation(fileOperation, selection.createBackup)

      // Step 4: Update links if enabled
      let linksUpdated = 0
      let filesModified = 0

      if (selection.updateLinks) {
        progressIndicator?.updateProgress(75, { current: 'Updating links...' })

        const linkUpdateResult = await this.updateLinksAfterMove([fileOperation])
        linksUpdated = linkUpdateResult.linksUpdated
        filesModified = linkUpdateResult.filesModified
      }

      // Complete
      progressIndicator?.updateProgress(100, {
        current: 'Organization complete',
        status: 'completed'
      })

      const duration = Date.now() - startTime

      // Emit organization completed event
      eventEmitter.emit('organization-completed', {
        sessionId: `org_${Date.now()}`,
        result: {
          success: true,
          operations: [fileOperation],
          linksUpdated,
          filesModified,
          duration
        }
      })

      return {
        success: true,
        sourcePath,
        targetPath,
        selectedTag: selection.selectedTag,
        operations: [fileOperation],
        linksUpdated,
        filesModified,
        duration,
        cancelled: false
      }

    } catch (error) {
      progressIndicator?.setError(error instanceof Error ? error.message : 'Unknown error')

      // Handle conflicts
      if (error instanceof FileOperationError && await this.handleConflict(error)) {
        // Retry operation with conflict resolution
        return await this.executeOrganization(sourcePath, selection, showProgress)
      }

      throw error

    } finally {
      if (progressIndicator?.hide) {
        setTimeout(() => {
          progressIndicator?.hide()
        }, 2000)
      }
    }
  }

  /**
   * Prepare target path
   */
  private async prepareTargetPath(targetPath: string, createFolder: boolean): Promise<string> {
    const normalizedPath = normalizePath(targetPath)

    if (createFolder) {
      // In a real implementation, this would create the folder
      console.log(`Would create folder: ${normalizedPath}`)
    }

    return normalizedPath
  }

  /**
   * Create file operation
   */
  private async createFileOperation(sourcePath: string, targetPath: string): Promise<FileOperation> {
    return {
      id: `move_${Date.now()}`,
      type: 'move',
      source: sourcePath,
      target: targetPath,
      status: 'pending',
      createdAt: new Date(),
      associatedTags: []
    }
  }

  /**
   * Execute file operation
   */
  private async executeFileOperation(
    operation: FileOperation,
    createBackup: boolean
  ): Promise<any> {
    const options: FileOperationOptions = {
      createBackup,
      createParents: this.settings.organizer.createParentDirectories,
      preserveTimestamps: this.settings.organizer.preserveTimestamps
    }

    return await this.fileMover.executeOperation(operation, options)
  }

  /**
   * Update links after file move
   */
  private async updateLinksAfterMove(operations: FileOperation[]): Promise<any> {
    if (!this.settings.linkUpdater.updateSettings.createBackups) {
      // Only update links that the user has enabled
      return await this.linkUpdater.updateLinks(operations, {
        linkTypes: this.settings.linkUpdater.linkTypes,
        createBackup: this.settings.linkUpdater.updateSettings.createBackups
      })
    }

    return {
      linksUpdated: 0,
      filesModified: 0
    }
  }

  /**
   * Handle file conflicts
   */
  private async handleConflict(error: FileOperationError): Promise<boolean> {
    if (error.code !== 'FILE_OPERATION_ERROR') {
      return false
    }

    try {
      // In a real implementation, this would detect the actual conflict
      const conflictInfo = {
        operation: {
          id: 'conflict-op-' + Date.now(),
          type: 'move' as const,
          source: error.filePath,
          target: error.filePath,
          status: 'pending' as const,
          createdAt: new Date(),
          associatedTags: []
        },
        type: 'target-exists' as const,
        existingFile: {
          path: error.filePath,
          size: 1024,
          modifiedAt: new Date()
        },
        newFile: {
          path: error.filePath,
          size: 1024,
          modifiedAt: new Date()
        }
      }

      const conflictDialog = new ConflictDialog(this.app, conflictInfo)
      conflictDialog.open()

      const result = await conflictDialog.getResult()

      if (result.confirmed) {
        // Apply conflict resolution
        console.log('Conflict resolution:', result.data?.strategy)
        return true
      }

    } catch (conflictError) {
      console.error('Conflict resolution failed:', conflictError)
    }

    return false
  }

  /**
   * Get organization statistics
   */
  getStatistics(): {
    totalTagMappings: number
    customTagMappings: number
    backupCount: number
    lastOperation?: any
  } {
    const stats = this.pathMapper.getStatistics()
    const backups = this.fileMover.getAllBackups()

    return {
      totalTagMappings: stats.totalMappings,
      customTagMappings: stats.customMappings,
      backupCount: backups.length,
      lastOperation: undefined // Would track last operation in real implementation
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.progressManager?.hideAll()
    // Clean up other resources if needed
  }
}