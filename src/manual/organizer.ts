/**
 * Manual Organizer - Orchestrates the complete manual organization workflow
 */

import { App, TFile, Notice } from 'obsidian'
import type { FileOperation } from '@/types/entities.js'
import type { PluginConfig } from '@/types/settings.js'
import type { PathMappingResult } from '@/scanning/path-mapper.js'
import { TagScanner } from '@/scanning/tag-scanner.js'
import { PathMapper } from '@/scanning/path-mapper.js'
import { FileMover, FileOperationOptions } from '@/file-ops/file-mover.js'
import { LinkUpdater } from '@/file-ops/link-updater.js'
import type { LinkUpdateConfig } from '@/types/entities.js'
import { TagSelectionDialog, TagSelectionDialogOptions, TagSelectionResult } from '@/ui/tag-selection-dialog.js'
import { ConflictDialog } from '@/ui/conflict-dialog.js'
import { ProgressIndicator, ProgressManager } from '@/ui/progress.js'
import { DialogFactory } from '@/ui/dialog.js'
import { eventEmitter } from '@/utils/events.js'
import { FileOperationError, CancellationError } from '@/utils/errors.js'
import { joinPath, normalizePath, getBaseName, toObsidianPath, arePathsEqual } from '@/utils/path-utils.js'

/**
 * Create hardcoded link update configuration
 */
function createLinkUpdateConfig(): LinkUpdateConfig {
  return {
    linkTypes: ['wiki-link', 'wiki-link-alias', 'wiki-link-heading', 'wiki-link-block', 'markdown-link'],
    updateEmbeddedFiles: true,
    updateAliases: true,
    normalizePaths: true,
    preserveWhitespace: true,
    createBackups: false,
    conflictResolution: 'prompt'
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
    private config: PluginConfig,
    private progressContainer?: HTMLElement
  ) {
    // Initialize components with hardcoded configuration
    this.tagScanner = new TagScanner(this.app, this.config.tagExtraction)
    this.pathMapper = new PathMapper()
    this.fileMover = new FileMover({
      timeout: this.config.fileOperations.operationTimeout,
      createParents: this.config.fileOperations.createParentDirectories,
      preserveTimestamps: this.config.fileOperations.preserveTimestamps,
      createBackup: false // No backups in first version
    }, this.app)
    this.linkUpdater = new LinkUpdater(createLinkUpdateConfig())
    this.dialogFactory = new DialogFactory(app)

    // Initialize progress manager
    if (this.progressContainer) {
      this.progressManager = new ProgressManager(app, this.progressContainer)
    }

    // Load tag mappings
    this.pathMapper.updateTagMappings(this.config.tagMappings)
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

        let tagSelection: TagSelectionResult | null

        // Auto-move logic: if only one tag mapping exists, skip dialog
        if (tagMappings.length === 1 && !options.skipDialogs) {
          tagSelection = {
            selectedTag: tagMappings[0]!.tag,
            targetPath: tagMappings[0]!.path,
            createFolder: true,
            updateLinks: true,
            createBackup: true
          }
        } else {
          // Show tag selection dialog for multiple tags or when skipDialogs is true
          tagSelection = await this.showTagSelectionDialog(
            currentFile.path,
            tagMappings,
            options
          )
        }

        if (!tagSelection) {
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

        try {
          // Execute organization
          const result = await this.executeOrganization(
            currentFile.path,
            tagSelection,
            options.showProgress
          )

  
          return result
        } catch (error) {
          console.error('Organization failed:', error)

          // Handle specific error types
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

          // Show user-friendly error notification
          if (errorMessage.includes('File not found') || errorMessage.includes('already been moved')) {
            new Notice(`⚠️ ${errorMessage}`, 8000)
          } else {
            new Notice(`Organization failed: ${errorMessage}`, 8000)
          }

          // Return error result
          return {
            success: false,
            sourcePath: currentFile.path,
            targetPath: currentFile.path,
            selectedTag: tagSelection?.selectedTag || '',
            operations: [],
            linksUpdated: 0,
            filesModified: 0,
            duration: Date.now() - startTime,
            error: errorMessage,
            cancelled: false
          }
        }

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
   * Update configuration
   */
  updateConfig(config: PluginConfig): void {
    this.config = config

    // Update component configurations
    this.pathMapper.updateTagMappings(config.tagMappings)
    this.tagScanner = new TagScanner(this.app, config.tagExtraction)
    this.fileMover = new FileMover({
      timeout: config.fileOperations.operationTimeout,
      createParents: config.fileOperations.createParentDirectories,
      preserveTimestamps: config.fileOperations.preserveTimestamps,
      createBackup: false // No backups in first version
    }, this.app)
    this.linkUpdater = new LinkUpdater(createLinkUpdateConfig())
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
  ): Promise<TagSelectionResult | null> {
    if (options.skipDialogs && tagMappings.length > 0) {
      // Auto-select first mapping for testing - return TagSelectionResult directly
      return {
        selectedTag: tagMappings[0]?.tag || '',
        targetPath: tagMappings[0]?.path || '',
        createFolder: true,
        updateLinks: true,
        createBackup: true
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
    selection: TagSelectionResult,
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

      // Step 1: Generate target path based on selected tag
      progressIndicator?.updateProgress(25, { current: 'Preparing target location...' })

      const targetPath = this.generateTargetPathForTag(selection.selectedTag)
      const preparedTargetPath = await this.prepareTargetPath(targetPath, selection.createFolder)

      // Step 2: Create file operation with explicit tag context
      progressIndicator?.updateProgress(50, { current: 'Moving file...' })

      const fileOperation = await this.createFileOperationForTag(sourcePath, preparedTargetPath, selection.selectedTag)

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

      // Special handling for no-op operations (already in correct location)
      const isNoOp = fileOperation.status === 'completed'
      const resultMessage = isNoOp
        ? `File is already in the correct location for tag "${selection.selectedTag}"`
        : `Successfully organized "${selection.selectedTag}"`

      // Show appropriate notification
      if (isNoOp) {
        // For no-op, we show a subtle info notice instead of the regular success notice
        new Notice(`${resultMessage}`, 4000)
      } else {
        // For actual file moves, show success notification
        const fileName = sourcePath.split('/').pop() || sourcePath
        new Notice(`Successfully organized "${fileName}" to ${fileOperation.target}`)
      }

      // Emit organization completed event
      eventEmitter.emit('organization-completed', {
        sessionId: `org_${Date.now()}`,
        result: {
          success: true,
          operations: [fileOperation],
          linksUpdated,
          filesModified,
          duration,
          message: resultMessage
        }
      })

      return {
        success: true,
        sourcePath,
        targetPath: fileOperation.target,
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
        // Check if we have a resolved target path from conflict resolution
        const resolvedTargetPath = (error as any).resolvedTargetPath
        if (resolvedTargetPath) {
          // Use the resolved path directly
          const newFileOperation = await this.createFileOperationDirect(sourcePath, resolvedTargetPath, selection.selectedTag)
          const moveResult = await this.executeFileOperation(newFileOperation, selection.createBackup)

          return {
            success: true,
            sourcePath,
            targetPath: resolvedTargetPath,
            selectedTag: selection.selectedTag,
            operations: [newFileOperation],
            duration: 0,
            linksUpdated: 0,
            filesModified: 0,
            cancelled: false
          }
        } else {
          // Retry operation with conflict resolution
          return await this.executeOrganization(sourcePath, selection, showProgress)
        }
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
      // Check if folder exists first
      const folder = this.app.vault.getAbstractFileByPath(normalizedPath)
      if (!folder) {
        // Create the folder if it doesn't exist
        try {
          await this.app.vault.createFolder(normalizedPath)
        } catch (error) {
          // Try to create parent folders if needed
          try {
            const parentPath = normalizedPath.split('/').slice(0, -1).join('/')
            if (parentPath && parentPath !== normalizedPath) {
              const parentFolder = this.app.vault.getAbstractFileByPath(parentPath)
              if (!parentFolder) {
                await this.app.vault.createFolder(parentPath)
                // Try again to create the target folder
                await this.app.vault.createFolder(normalizedPath)
              }
            }
          } catch (parentError) {
            console.warn(`Failed to create parent folders for ${normalizedPath}:`, parentError)
          }
        }
      }
    }

    return normalizedPath
  }

  /**
   * Generate target path for a specific tag (CRITICAL FIX)
   */
  private generateTargetPathForTag(tag: string): string {
    // Get fresh mapping for the specific tag without considering current file location
    const mapping = this.pathMapper.getTargetPath(tag)

    if (!mapping.valid) {
      throw new Error(`Invalid tag mapping for ${tag}: ${mapping.errors.join(', ')}`)
    }

    
    return mapping.path
  }

  /**
   * Create file operation with explicit tag context (CRITICAL FIX)
   */
  private async createFileOperationForTag(
    sourcePath: string,
    targetPath: string,
    selectedTag: string
  ): Promise<FileOperation> {
    // Extract filename from source path using proper path utilities
    const fileName = getBaseName(sourcePath)
    const fullTargetPath = joinPath(targetPath, fileName)

    // Ensure paths are in Obsidian format for the FileOperation
    const obsidianSource = toObsidianPath(sourcePath)
    const obsidianTarget = toObsidianPath(fullTargetPath)

    // CRITICAL FIX: Verify source file exists before creating operation
    const sourceFile = this.app.vault.getAbstractFileByPath(obsidianSource)
    if (!(sourceFile instanceof TFile)) {
      console.error(`Source file not found at path: ${obsidianSource}`)
      throw new Error(`File not found: ${obsidianSource}. The file may have been moved already. Please refresh the note and try again.`)
    }

    // Check if source and target are the same (no-op scenario)
    // File is in correct location ONLY if it's already in the exact target location
    const pathsAreEqual = arePathsEqual(obsidianSource, obsidianTarget)

    // Only consider it a no-op if the complete file paths are identical
    // This means the file is already in the exact location where it would be moved
    // IMPORTANT: User's explicit tag selection should ALWAYS be respected, even if file is in another valid tag folder
    if (pathsAreEqual) {
      // Return a "no-op" file operation that indicates success without actual move
      return {
        id: `noop_${Date.now()}`,
        type: 'move',
        source: obsidianSource,
        target: obsidianTarget,
        status: 'completed', // Mark as completed since no action needed
        createdAt: new Date(),
        associatedTags: [selectedTag]
      }
    }

    // Check for potential file conflicts before creating operation
    const targetFile = this.app.vault.getAbstractFileByPath(obsidianTarget)
    if (targetFile) {
      // File exists at target location - we need to handle this conflict
      throw new FileOperationError(
        'move',
        obsidianSource,
        `Destination file already exists: ${obsidianTarget}`,
        'medium',
        true,
        { targetPath: obsidianTarget, selectedTag }
      )
    }

    return {
      id: `move_${Date.now()}`,
      type: 'move',
      source: obsidianSource,
      target: obsidianTarget,
      status: 'pending',
      createdAt: new Date(),
      associatedTags: [selectedTag]
    }
  }

  /**
   * Create file operation (legacy method for backward compatibility)
   */
  private async createFileOperation(sourcePath: string, targetPath: string): Promise<FileOperation> {
    return this.createFileOperationForTag(sourcePath, targetPath, 'unknown-tag')
  }

  /**
   * Create file operation directly without conflict checking (for resolved conflicts)
   */
  private async createFileOperationDirect(sourcePath: string, targetPath: string, selectedTag: string): Promise<FileOperation> {
    // Ensure paths are in Obsidian format for the FileOperation
    const obsidianSource = toObsidianPath(sourcePath)
    const obsidianTarget = toObsidianPath(targetPath)

    // Verify source file exists
    const sourceFile = this.app.vault.getAbstractFileByPath(obsidianSource)
    if (!(sourceFile instanceof TFile)) {
      throw new Error(`Source file not found: ${obsidianSource}`)
    }

    return {
      id: `move_${Date.now()}`,
      type: 'move',
      source: obsidianSource,
      target: obsidianTarget,
      status: 'pending',
      createdAt: new Date(),
      associatedTags: [selectedTag]
    }
  }

  /**
   * Execute file operation
   */
  private async executeFileOperation(
    operation: FileOperation,
    createBackup: boolean
  ): Promise<any> {
    // Handle no-op operations (already in correct location)
    if (operation.status === 'completed') {
      const tagInfo = operation.associatedTags?.length > 0
        ? ` for tag "${operation.associatedTags[0]}"`
        : ''

      return {
        id: operation.id,
        operationType: operation.type,
        source: operation.source,
        target: operation.target,
        success: true,
        message: `File is already in the correct location${tagInfo}: ${operation.target}`,
        timestamp: new Date(),
        fileSize: 0,
        duration: 0,
        tagInfo: operation.associatedTags || []
      }
    }

    const options: FileOperationOptions = {
      createBackup,
      createParents: this.config.fileOperations.createParentDirectories,
      preserveTimestamps: this.config.fileOperations.preserveTimestamps
    }

    return await this.fileMover.executeOperation(operation, options)
  }

  /**
   * Update links after file move
   */
  private async updateLinksAfterMove(operations: FileOperation[]): Promise<any> {
    // Update links with hardcoded configuration
    return await this.linkUpdater.updateLinks(operations, createLinkUpdateConfig())
  }

  /**
   * Handle file conflicts
   */
  private async handleConflict(error: FileOperationError): Promise<boolean> {
    if (error.code !== 'FILE_OPERATION_ERROR') {
      return false
    }

    try {
      // Get file paths from error context
      const sourcePath = error.filePath
      const targetPath = error.context?.targetPath as string
      const selectedTag = error.context?.selectedTag as string

      if (!sourcePath || !targetPath) {
        console.warn('Cannot resolve conflict: missing file path information')
        return false
      }

      // Get file information from the vault
      const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath)
      const targetFile = this.app.vault.getAbstractFileByPath(targetPath)

      if (!(sourceFile instanceof TFile) || !(targetFile instanceof TFile)) {
        console.warn('Cannot resolve conflict: unable to access files')
        return false
      }

      // Create conflict info
      const conflictInfo = {
        operation: {
          id: 'conflict-op-' + Date.now(),
          type: 'move' as const,
          source: sourcePath,
          target: targetPath,
          status: 'pending' as const,
          createdAt: new Date(),
          associatedTags: selectedTag ? [selectedTag] : []
        },
        type: 'target-exists' as const,
        existingFile: {
          path: targetFile.path,
          size: targetFile.stat.size,
          modifiedAt: new Date(targetFile.stat.mtime)
        },
        newFile: {
          path: sourceFile.path,
          size: sourceFile.stat.size,
          modifiedAt: new Date(sourceFile.stat.mtime)
        }
      }

      const conflictDialog = new ConflictDialog(this.app, conflictInfo)
      conflictDialog.open()

      const result = await conflictDialog.getResult()

      if (result.confirmed && result.data) {
        // Apply conflict resolution based on user choice and get new target path
        const newTargetPath = await this.applyConflictResolution(
          result.data.strategy,
          sourcePath,
          targetPath,
          selectedTag,
          result.data.newFileName
        )

        // Store the resolved path for the retry
        Object.defineProperty(error, 'resolvedTargetPath', {
          value: newTargetPath,
          writable: false,
          enumerable: true,
          configurable: true
        })

        return true
      }

    } catch (conflictError) {
      console.error('Conflict resolution failed:', conflictError)
    }

    return false
  }

  private async applyConflictResolution(
    strategy: string,
    sourcePath: string,
    targetPath: string,
    selectedTag?: string,
    newFileName?: string
  ): Promise<string> {
    switch (strategy) {
      case 'replace':
        // Delete existing file and allow the move to proceed
        const existingFile = this.app.vault.getAbstractFileByPath(targetPath)
        if (existingFile instanceof TFile) {
          await this.app.vault.delete(existingFile)
        }
        return targetPath

      case 'rename':
        // Generate new filename
        if (newFileName) {
          // Use the filename provided by the dialog
          const parsedTarget = this.parsePath(targetPath)
          return `${parsedTarget.directory}/${newFileName}`
        } else {
          // Auto-generate unique filename
          return await this.generateUniqueFileName(targetPath)
        }

      case 'subfolder':
        // Create a subfolder for conflicts
        const parsedPath = this.parsePath(targetPath)
        const conflictFolder = `${parsedPath.directory}/Conflicts`
        const conflictPath = `${conflictFolder}/${parsedPath.filename}.${parsedPath.extension}`

        // Ensure conflict folder exists
        if (!this.app.vault.getAbstractFileByPath(conflictFolder)) {
          await this.app.vault.createFolder(conflictFolder)
        }

        return conflictPath

      case 'skip':
        // Cancel the operation
        throw new Error('Operation cancelled by user')

      case 'merge':
        // Merge is not implemented yet, treat as skip
        throw new Error('Merge operation not yet implemented')

      case 'prompt':
        // Prompt should not reach here as it's handled by the dialog
        throw new Error('Prompt strategy should be handled by dialog')

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`)
    }
  }

  private async generateUniqueFileName(targetPath: string): Promise<string> {
    const parsedPath = this.parsePath(targetPath)
    const directory = parsedPath.directory
    const filename = parsedPath.filename
    const extension = parsedPath.extension

    let counter = 1
    let newPath = targetPath

    while (this.app.vault.getAbstractFileByPath(newPath)) {
      newPath = `${directory}/${filename} (${counter}).${extension}`
      counter++
    }

    return newPath
  }

  private parsePath(filePath: string): { directory: string; filename: string; extension: string } {
    const parts = filePath.split('/')
    const fullFileName = parts.pop() || ''
    const directory = parts.join('/')

    const lastDotIndex = fullFileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return { directory, filename: fullFileName, extension: '' }
    }

    return {
      directory,
      filename: fullFileName.substring(0, lastDotIndex),
      extension: fullFileName.substring(lastDotIndex + 1)
    }
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