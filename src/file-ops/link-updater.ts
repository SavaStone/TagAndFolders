/**
 * Link Updater - Preserves and updates all links during file operations
 */

import type { ILinkUpdater, FileOperation, UpdateOptions, UpdateResult, WikiLink, LinkType } from '@/types/entities.js'
import type { FoundLink, LinkUpdate, LinkLocation } from '@/types/contracts/link-updater.contract.js'
import { eventEmitter } from '@/utils/events.js'
import { normalizePath, relativePath, getBaseName, getExtension } from '@/utils/path-utils.js'
import { validateFilePath } from '@/utils/validation.js'
import { ScannerError, FileOperationError } from '@/utils/errors.js'

/**
 * Link update configuration
 */
export interface LinkUpdateConfig {
  /** Types of links to update */
  linkTypes: LinkType[]
  /** Update embedded files */
  updateEmbeddedFiles: boolean
  /** Update aliases */
  updateAliases: boolean
  /** Normalize paths */
  normalizePaths: boolean
  /** Preserve whitespace */
  preserveWhitespace: boolean
  /** Create backups before updating */
  createBackups: boolean
  /** Conflict resolution strategy */
  conflictResolution?: 'skip' | 'overwrite' | 'prompt'
}

/**
 * Link pattern definitions
 */
const LINK_PATTERNS = {
  // [[File Name]]
  wikiLink: /\[\[([^\[\]#\|]+)(?:#([^\[\]#\|]+))?(?:\|([^\[\]#\|]+))?\]\]/g,

  // ![[File Name]] (embedded)
  wikiLinkBlock: /!\[\[([^\[\]#\|]+)(?:#([^\[\]#\|]+))?(?:\|([^\[\]#\|]+))?\]\]/g,

  // [text](path)
  markdownLink: /\[([^\]]*)\]\(([^)]+)\)/g,

  // [text][reference] followed by [reference]: path
  markdownReference: /\[([^\]]+)\]\[([^\]]+)\]/g,

  // Direct file paths
  attachment: /(?:src|href)=["']([^"']+)["']/g
} as const

/**
 * Link Updater Implementation
 */
export class LinkUpdater implements ILinkUpdater {
  private updating = false
  private currentSessionId: string | null = null

  constructor(
    private readonly config: LinkUpdateConfig,
    private readonly vaultPath: string = ''
  ) {}

  get isUpdating(): boolean {
    return this.updating
  }

  cancelUpdates(): void {
    if (this.updating && this.currentSessionId) {
      this.updating = false
      eventEmitter.emit('updates-cancelled', { sessionId: this.currentSessionId })
    }
  }

  /**
   * Update links after file operations
   */
  async updateLinks(
    fileOperations: FileOperation[],
    options: UpdateOptions = {}
  ): Promise<UpdateResult> {
    const sessionId = `update_${Date.now()}`
    this.currentSessionId = sessionId
    this.updating = true

    const startTime = Date.now()

    try {
      // Emit updates started event
      eventEmitter.emit('updates-started', { sessionId })

      // Build file move mappings
      const fileMappings = new Map<string, string>()
      for (const operation of fileOperations) {
        if (operation.type === 'move' || operation.type === 'rename') {
          fileMappings.set(operation.source, operation.target)
        }
      }

      // Find all files that might need updates
      const filesToUpdate = await this.findFilesContainingLinks(fileMappings, options)

      const updateResults: any[] = []
      let totalLinksFound = 0
      let linksUpdated = 0
      let filesModified = 0
      let failedUpdates = 0
      const unprocessableFiles: string[] = []

      // Process each file
      for (const filePath of filesToUpdate) {
        try {
          const result = await this.updateLinksInFile(filePath, fileMappings, options)

          if (result.success) {
            updateResults.push(result)
            filesModified++
            linksUpdated += result.updatedCount
            totalLinksFound += result.foundCount

            // Emit link updated event
            eventEmitter.emit('link-updated', {
              operationId: sessionId,
              linkId: `batch_${filePath}`,
              sourceFile: filePath
            })

          } else {
            unprocessableFiles.push(filePath)
          }

        } catch (error) {
          failedUpdates++

          eventEmitter.emit('error-occurred', {
            error: error instanceof Error ? error : new Error(`Failed to update links in ${filePath}`),
            context: { operation: 'update-links', filePath }
          })
        }

        // Check for cancellation
        if (!this.updating) {
          throw new Error('Link updates cancelled')
        }
      }

      const processingTime = Date.now() - startTime

      const statistics: any = {
          updatesByType: this.calculateUpdateStatistics(updateResults),
          processingTime,
          averageLinksPerFile: filesModified > 0 ? totalLinksFound / filesModified : 0
        }

        // Only add optional properties if they exist
        const largestFile = this.findLargestFile(updateResults)
        if (largestFile) {
          statistics.largestFile = largestFile
        }

        const mostCommonLinkType = this.findMostCommonLinkType(updateResults)
        if (mostCommonLinkType) {
          statistics.mostCommonLinkType = mostCommonLinkType
        }

        const result: UpdateResult = {
          sessionId,
          totalLinksFound,
          linksProcessed: totalLinksFound,
          linksUpdated,
          filesModified,
          failedUpdates,
          unprocessableFiles,
          statistics,
          startedAt: new Date(startTime),
          completedAt: new Date()
        }

      // Emit completion event
      eventEmitter.emit('updates-completed', {
        sessionId,
        result
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      eventEmitter.emit('updates-failed', {
        error: error instanceof Error ? error : new Error(errorMessage),
        sessionId
      })

      throw new ScannerError(`Link update failed: ${errorMessage}`, undefined, 'high', true, {
        sessionId,
        fileOperations: fileOperations.length
      })

    } finally {
      this.updating = false
      this.currentSessionId = null
    }
  }

  /**
   * Find all links to a specific file
   */
  async findLinksToFile(
    filePath: string,
    options: any = {}
  ): Promise<FoundLink[]> {
    const links: FoundLink[] = []

    try {
      // In a real implementation, this would search the entire vault
      // For now, we'll return a mock result
      const mockLinks: FoundLink[] = [
        {
          id: 'link_1',
          sourceFile: '/test/note1.md',
          targetFile: filePath,
          linkText: 'Reference to file',
          type: 'wiki-link',
          location: {
            line: 1,
            column: 1,
            length: filePath.length,
            context: {
              before: 'Link to ',
              after: ' in content',
              fullLine: `Link to [[${filePath}]] in content`
            }
          },
          isValid: true
        }
      ]

      return mockLinks

    } catch (error) {
      throw new ScannerError(
        `Failed to find links to file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        'medium',
        true
      )
    }
  }

  /**
   * Update links in a specific file
   */
  async updateLinksInFile(
    sourceFile: string,
    updates: LinkUpdate[] | Map<string, string>,
    options: any = {}
  ): Promise<any> {
    try {
      // In a real implementation, this would:
      // 1. Read the file content
      // 2. Find all links in the file
      // 3. Update links that match the file mappings
      // 4. Write the updated content back

      const content = await this.getFileContent(sourceFile)
      let updatedContent = content
      let updateCount = 0

      if (updates instanceof Map) {
        // Convert Map to LinkUpdate array
        const linkUpdates: LinkUpdate[] = []
        for (const [originalTarget, newTarget] of updates.entries()) {
          linkUpdates.push({
            id: `update_${originalTarget}_${Date.now()}`,
            originalText: originalTarget,
            newText: newTarget,
            type: 'wiki-link',
            originalTarget,
            newTarget,
            location: {
              line: 0,
              column: 0,
              length: originalTarget.length,
              context: {
                before: '',
                after: '',
                fullLine: ''
              }
            },
            reason: 'file-moved'
          })
        }

        updatedContent = await this.applyLinkUpdates(content, linkUpdates)
        updateCount = linkUpdates.length
      } else {
        updatedContent = await this.applyLinkUpdates(content, updates)
        updateCount = updates.length
      }

      // Write updated content back (in real implementation)
      const result = {
        success: true,
        sourceFile,
        foundCount: this.countLinksInContent(content),
        updatedCount: updateCount,
        content: updatedContent
      }

      return result

    } catch (error) {
      throw new ScannerError(
        `Failed to update links in file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceFile,
        'medium',
        true
      )
    }
  }

  /**
   * Validate links across the vault
   */
  async validateLinks(options: any = {}): Promise<any> {
    // In a real implementation, this would validate all links in the vault
    return {
      validationId: `validate_${Date.now()}`,
      filesChecked: 0,
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: [],
      unresolvedLinks: [],
      summary: {
        validLinksRatio: 1.0,
        mostCommonError: null
      },
      validatedAt: new Date()
    }
  }

  /**
   * Generate link update preview
   */
  async previewUpdates(fileOperations: FileOperation[], options: any = {}): Promise<any> {
    const sessionId = `preview_${Date.now()}`

    // Build file move mappings
    const fileMappings = new Map<string, string>()
    for (const operation of fileOperations) {
      if (operation.type === 'move' || operation.type === 'rename') {
        fileMappings.set(operation.source, operation.target)
      }
    }

    // Find files that would need updates
    const filesToModify = await this.findFilesContainingLinks(fileMappings, options)

    // Count total updates that would be made
    let totalUpdates = 0
    for (const filePath of filesToModify) {
      const content = await this.getFileContent(filePath)
      totalUpdates += this.countLinkUpdates(content, fileMappings)
    }

    return {
      previewId: sessionId,
      fileOperations,
      totalUpdates,
      filesToModify,
      riskAssessment: {
        level: totalUpdates > 100 ? 'high' : totalUpdates > 10 ? 'medium' : 'low',
        factors: totalUpdates > 100 ? ['Large number of updates'] : [],
        recommendations: totalUpdates > 100
          ? ['Consider batching the operation', 'Create backups before proceeding']
          : []
      },
      timestamp: new Date()
    }
  }

  /**
   * Find files that might need link updates
   */
  private async findFilesContainingLinks(
    fileMappings: Map<string, string>,
    options: any
  ): Promise<string[]> {
    // In a real implementation, this would search the vault for files containing links
    // to the moved files. For now, return a mock list.
    return Array.from(fileMappings.keys()).map(path => `${path}-linked.md`)
  }

  /**
   * Apply link updates to content
   */
  private async applyLinkUpdates(
    content: string,
    updates: LinkUpdate[]
  ): Promise<string> {
    let updatedContent = content

    for (const update of updates) {
      // Update wiki-links [[file]] -> [[newfile]]
      if (this.config.linkTypes.includes('wiki-link')) {
        updatedContent = updatedContent.replace(
          new RegExp(`\\[\\[${this.escapeRegExp(update.originalTarget)}\\]\\]`, 'g'),
          `[[${update.newTarget}]]`
        )

        // Update wiki-links with aliases [[file|alias]] -> [[newfile|alias]]
        updatedContent = updatedContent.replace(
          new RegExp(`\\[\\[${this.escapeRegExp(update.originalTarget)}\\|([^\\]]+)\\]\\]`, 'g'),
          `[[${update.newTarget}|$1]]`
        )

        // Update wiki-links with headings [[file#heading]] -> [[newfile#heading]]
        updatedContent = updatedContent.replace(
          new RegExp(`\\[\\[${this.escapeRegExp(update.originalTarget)}#([^\\]]+)\\]\\]`, 'g'),
          `[[${update.newTarget}#$1]]`
        )
      }

      // Update embedded files ![[file]] -> ![[newfile]]
      if (this.config.linkTypes.includes('wiki-link-block') && this.config.updateEmbeddedFiles) {
        updatedContent = updatedContent.replace(
          new RegExp(`!\\[\\[${this.escapeRegExp(update.originalTarget)}\\]\\]`, 'g'),
          `![[${update.newTarget}]]`
        )
      }

      // Update markdown links [text](path) -> [text](newpath)
      if (this.config.linkTypes.includes('markdown-link')) {
        updatedContent = updatedContent.replace(
          new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegExp(update.originalTarget)}\\)`, 'g'),
          `[$1](${update.newTarget})`
        )
      }
    }

    return updatedContent
  }

  /**
   * Count links in content
   */
  private countLinksInContent(content: string): number {
    let count = 0

    if (this.config.linkTypes.includes('wiki-link')) {
      const wikiLinks = content.match(LINK_PATTERNS.wikiLink)
      count += wikiLinks ? wikiLinks.length : 0
    }

    if (this.config.linkTypes.includes('wiki-link-block')) {
      const wikiBlocks = content.match(LINK_PATTERNS.wikiLinkBlock)
      count += wikiBlocks ? wikiBlocks.length : 0
    }

    if (this.config.linkTypes.includes('markdown-link')) {
      const markdownLinks = content.match(LINK_PATTERNS.markdownLink)
      count += markdownLinks ? markdownLinks.length : 0
    }

    return count
  }

  /**
   * Count potential link updates
   */
  private countLinkUpdates(content: string, fileMappings: Map<string, string>): number {
    let count = 0

    for (const [oldPath, newPath] of fileMappings.entries()) {
      if (this.config.linkTypes.includes('wiki-link')) {
        const wikiLinks = content.match(new RegExp(`\\[\\[${this.escapeRegExp(oldPath)}\\]\\]`, 'g'))
        count += wikiLinks ? wikiLinks.length : 0
      }

      if (this.config.linkTypes.includes('markdown-link')) {
        const markdownLinks = content.match(new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegExp(oldPath)}\\)`, 'g'))
        count += markdownLinks ? markdownLinks.length : 0
      }
    }

    return count
  }

  /**
   * Calculate update statistics
   */
  private calculateUpdateStatistics(results: any[]): Record<string, number> {
    const stats: Record<string, number> = {}

    for (const result of results) {
      stats[result.linkType] = (stats[result.linkType] || 0) + result.updatedCount
    }

    return stats
  }

  /**
   * Find largest file in results
   */
  private findLargestFile(results: any[]): string | undefined {
    let largest = { path: '', linkCount: 0 }

    for (const result of results) {
      if (result.foundCount > largest.linkCount) {
        largest = { path: result.sourceFile, linkCount: result.foundCount }
      }
    }

    return largest.path || undefined
  }

  /**
   * Find most common link type
   */
  private findMostCommonLinkType(results: any[]): string | undefined {
    const typeCounts: Record<string, number> = {}

    for (const result of results) {
      typeCounts[result.linkType] = (typeCounts[result.linkType] || 0) + 1
    }

    let mostCommon = 'wiki-link'
    let maxCount = 0

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostCommon = type
      }
    }

    return mostCommon || undefined
  }

  /**
   * Get file content (mock implementation)
   */
  private async getFileContent(filePath: string): Promise<string> {
    // In a real implementation, this would use Obsidian's file API
    return `Content of ${filePath}\n\nThis file contains links to other notes:\n- [[example-note]]\n- [[another-note|With Alias]]\n- [Markdown Link](another-note.md)\n- ![[embedded-note]]`
  }

  /**
   * Escape regex special characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}