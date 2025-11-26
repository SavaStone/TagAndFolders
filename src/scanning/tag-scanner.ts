/**
 * Tag Scanner - Extracts tags from various sources in Obsidian notes
 */

import { App, TFile } from 'obsidian'
import type { IFileScanner, FileTagInfo, ScanOptions, ScanProgress, TagLocation, FileMetadata } from '@/types/scanner.js'
import { eventEmitter } from '@/utils/events.js'
import { ScannerError, TimeoutError, CancellationError } from '@/utils/errors.js'
import { TagValidator } from '@/utils/validators.js'
import { Platform } from '@/utils/path-utils.js'

/**
 * Tag extraction configuration
 */
interface TagExtractionConfig {
  extractFromFrontmatter: boolean
  extractFromInlineTags: boolean
  extractFromWikiLinks: boolean
  extractFromHashtags: boolean
  supportTagHierarchies: boolean
  tagPrefix: string
}

/**
 * Tag extraction result
 */
interface TagExtractionResult {
  tags: string[]
  locations: TagLocation[]
  metadata: FileMetadata
}

/**
 * Tag Scanner Implementation
 */
export class TagScanner implements IFileScanner {
  private scanInProgress = false
  private currentScanId: string | null = null
  private cancellationRequested = false

  constructor(
    private readonly app: App,
    private readonly config: TagExtractionConfig,
    private readonly defaultOptions: ScanOptions = {}
  ) {}

  get isScanning(): boolean {
    return this.scanInProgress
  }

  cancelScan(): void {
    if (this.scanInProgress && this.currentScanId) {
      this.cancellationRequested = true
      eventEmitter.emit('scan-cancelled', { scanId: this.currentScanId })
    }
  }

  async scanVault(options?: ScanOptions): Promise<any> {
    // This would scan the entire vault - implementation depends on Obsidian API
    throw new Error('Vault scanning not yet implemented')
  }

  async scanFile(filePath: string): Promise<FileTagInfo> {
    const startTime = Date.now()
    this.scanInProgress = true
    this.cancellationRequested = false
    this.currentScanId = `scan_${Date.now()}`

    try {
      // Emit scan start event
      eventEmitter.emit('scan-progress', {
        scanId: this.currentScanId || 'unknown',
        progress: {
          completed: 0,
          total: 1,
          currentFile: filePath
        }
      })

      // Check for cancellation
      if (this.cancellationRequested) {
        throw new CancellationError('scan-file')
      }

      const result = await this.extractTagsFromFile(filePath)

      const scanDuration = Date.now() - startTime

      const fileTagInfo: FileTagInfo = {
        filePath,
        tags: result.tags,
        tagLocations: result.locations,
        metadata: result.metadata,
        scannedAt: new Date(),
        scanDuration,
        success: true
      }

      // Emit completion event
      eventEmitter.emit('scan-progress', {
        scanId: this.currentScanId || 'unknown',
        progress: {
          completed: 1,
          total: 1,
          currentFile: filePath
        }
      })

      return fileTagInfo

    } catch (error) {
      const scanDuration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (error instanceof CancellationError) {
        // Don't log cancellation errors
        throw error
      }

      const fileTagInfo: FileTagInfo = {
        filePath,
        tags: [],
        tagLocations: [],
        metadata: {
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
          extension: '',
          cached: false,
          binary: false
        },
        scannedAt: new Date(),
        scanDuration,
        success: false,
        error: errorMessage
      }

      // Emit error event
      eventEmitter.emit('error-occurred', {
        error: error instanceof Error ? error : new ScannerError(errorMessage, filePath),
        context: { operation: 'scan-file', filePath }
      })

      return fileTagInfo

    } finally {
      this.scanInProgress = false
      this.currentScanId = null
    }
  }

  async scanBatch(filePaths: string[], options?: any): Promise<any> {
    // Batch scanning implementation
    const results: FileTagInfo[] = []
    const startTime = Date.now()

    this.scanInProgress = true
    this.currentScanId = `batch_${Date.now()}`

    try {
      eventEmitter.emit('scan-started', { scanId: this.currentScanId, startTime: new Date() })

      for (let i = 0; i < filePaths.length; i++) {
        if (this.cancellationRequested) {
          throw new CancellationError('batch-scan')
        }

        const filePath = filePaths[i]
        if (!filePath) continue

        try {
          const result = await this.scanFile(filePath)
          results.push(result)
        } catch (error) {
          if (error instanceof CancellationError) {
            throw error
          }

          // Continue with other files even if one fails
          console.warn(`Failed to scan file ${filePath}:`, error)
        }

        // Emit progress
        const currentFile = filePaths[i]
        eventEmitter.emit('scan-progress', {
          scanId: this.currentScanId || 'unknown',
          progress: {
            completed: i + 1,
            total: filePaths.length,
            ...(currentFile && { currentFile })
          }
        })
      }

      const duration = Date.now() - startTime
      const successfulResults = results.filter(r => r.success)
      const failedResults = results.filter(r => !r.success)

      const batchResult = {
        batchId: this.currentScanId,
        totalFiles: filePaths.length,
        successCount: successfulResults.length,
        errorCount: failedResults.length,
        skippedCount: 0,
        results: results,
        errors: failedResults.map(r => ({
          id: `${r.filePath}_error`,
          filePath: r.filePath,
          type: 'scan-error' as const,
          message: r.error || 'Unknown error',
          timestamp: new Date()
        })),
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration
      }

      eventEmitter.emit('scan-completed', {
        scanId: this.currentScanId,
        result: batchResult,
        duration
      })

      return batchResult

    } catch (error) {
      if (error instanceof CancellationError) {
        throw error
      }

      eventEmitter.emit('scan-failed', {
        scanId: this.currentScanId,
        error: error instanceof Error ? error : new ScannerError('Batch scan failed')
      })
      throw error

    } finally {
      this.scanInProgress = false
      this.currentScanId = null
    }
  }

  async getFilesByTags(tags: string[], options?: any): Promise<string[]> {
    // This would search the vault for files with specific tags
    // Implementation depends on Obsidian API
    throw new Error('Tag-based file search not yet implemented')
  }

  /**
   * Extract tags from a single file
   */
  private async extractTagsFromFile(filePath: string): Promise<TagExtractionResult> {
    try {
      // In a real implementation, this would use Obsidian's file API
      // For now, we'll create a mock implementation
      const content = await this.getFileContent(filePath)
      const metadata = await this.getFileMetadata(filePath)

      const tags: string[] = []
      const locations: TagLocation[] = []

      // Extract YAML frontmatter tags
      if (this.config.extractFromFrontmatter) {
        const frontmatterTags = this.extractFrontmatterTags(content)
        tags.push(...frontmatterTags)

        frontmatterTags.forEach(tag => {
          locations.push({
            tag,
            line: 1,
            column: 1,
            context: content.split('\n')[0] || '',
            type: 'frontmatter',
            length: tag.length,
            fullLine: content.split('\n')[0] || '',
            confidence: 0.95
          })
        })
      }

      // Extract inline hashtags
      if (this.config.extractFromHashtags) {
        const hashtagTags = this.extractHashtagTags(content)
        tags.push(...hashtagTags)

        hashtagTags.forEach(tag => {
          const line = this.findTagLine(content, tag)
          locations.push({
            tag,
            line: line.line,
            column: line.column,
            context: line.context,
            type: 'hashtag',
            length: tag.length,
            fullLine: line.fullLine,
            confidence: 0.90
          })
        })
      }

      // Extract wiki-link tags
      if (this.config.extractFromWikiLinks) {
        const wikiTags = this.extractWikiLinkTags(content)
        tags.push(...wikiTags)

        wikiTags.forEach(tag => {
          const line = this.findTagLine(content, tag)
          locations.push({
            tag,
            line: line.line,
            column: line.column,
            context: line.context,
            type: 'wiki-link',
            length: tag.length,
            fullLine: line.fullLine,
            confidence: 0.85
          })
        })
      }

      // Remove duplicates while preserving order
      const uniqueTags = [...new Set(tags)]

      return {
        tags: uniqueTags,
        locations,
        metadata
      }

    } catch (error) {
      throw new ScannerError(
        `Failed to extract tags from file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        'medium',
        true,
        { originalError: error }
      )
    }
  }

  /**
   * Extract tags from YAML frontmatter
   */
  private extractFrontmatterTags(content: string): string[] {
    const tags: string[] = []

    // Check if content has YAML frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return tags

    const frontmatter = frontmatterMatch[1]

    // Extract tags from various YAML formats
    if (frontmatter && frontmatter.includes('tags:')) {
      // Format 1: tags: [tag1, tag2, tag3]
      const arrayMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/i)
      if (arrayMatch && arrayMatch[1]) {
        const tagContent = arrayMatch[1]
        const extractedTags = this.parseYamlArrayTagList(tagContent)
        tags.push(...extractedTags)
      } else {
        // Format 2: tags:\n  - tag1\n  - tag2\n  - tag3
        const listTags = this.extractYamlListTags(frontmatter, 'tags')
        tags.push(...listTags)
      }
    }

    // Also check for single tag format
    if (frontmatter && frontmatter.includes('tag:')) {
      // Format 3: tag: tag1
      const singleTagMatch = frontmatter.match(/tag:\s*(.+)/i)
      if (singleTagMatch && singleTagMatch[1]) {
        const tag = singleTagMatch[1].trim().replace(/^['"]|['"]$/g, '')
        const normalizedTag = this.normalizeTag(tag)
        if (normalizedTag) {
          tags.push(normalizedTag)
        }
      }
    }

    return tags.filter(Boolean)
  }

  /**
   * Extract tags from YAML list format (multi-line with dashes)
   */
  private extractYamlListTags(frontmatter: string, key: string): string[] {
    const tags: string[] = []

    // Find the 'tags:' key and capture all list items after it
    const lines = frontmatter.split('\n')
    let foundKey = false
    let indentLevel = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const trimmed = line.trim()

      // Check if we found the tags key
      if (trimmed.startsWith(`${key}:`)) {
        foundKey = true
        // Check if next line has list items
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (nextLine) {
            const match = nextLine.match(/^(\s*)-\s*(.+)$/)
            if (match && match[1]) {
              indentLevel = match[1].length
            }
          }
        }
        continue
      }

      // If we found the key and this is a list item
      if (foundKey && trimmed.startsWith('-')) {
        const match = line.match(/^(\s*)-\s*(.+)$/)
        if (match && match[1] && match[2] && (indentLevel === -1 || match[1].length === indentLevel)) {
          const tag = match[2].trim().replace(/^['"]|['"]$/g, '')
          if (tag) {
            const normalizedTag = this.normalizeTag(tag)
            if (normalizedTag) {
              tags.push(normalizedTag)
            }
          }
        } else if (match && match[1] && match[1].length > indentLevel) {
          // This is a nested item, skip it
          continue
        } else {
          // Different indentation level, we're done with the list
          break
        }
      } else if (foundKey && !trimmed.startsWith('-') && line.match(/^\S/)) {
        // We've reached a new key, stop processing tags
        break
      }
    }

    return tags
  }

  /**
   * Parse YAML array tag list (comma-separated or space-separated)
   */
  private parseYamlArrayTagList(content: string): string[] {
    const tags: string[] = []

    // Split by commas first
    if (content.includes(',')) {
      const items = content.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''))
      for (const item of items) {
        if (item) {
          const normalizedTag = this.normalizeTag(item)
          if (normalizedTag) {
            tags.push(normalizedTag)
          }
        }
      }
    } else {
      // Single tag without commas
      const tag = content.trim().replace(/^['"]|['"]$/g, '')
      if (tag) {
        const normalizedTag = this.normalizeTag(tag)
        if (normalizedTag) {
          tags.push(normalizedTag)
        }
      }
    }

    return tags
  }

  /**
   * Parse YAML tag list content (legacy - not used anymore)
   */
  private parseYamlTagList(content: string): string[] {
    const tags: string[] = []

    // Split by commas or newlines
    const items = content.split(/[,\\n]/).map(item => item.trim().replace(/^['"]|['"]$/g, ''))

    for (const item of items) {
      if (item.length > 0) {
        const normalizedTag = this.normalizeTag(item)
        if (normalizedTag) {
          tags.push(normalizedTag)
        }
      }
    }

    return tags
  }

  /**
   * Extract hashtag tags from content
   */
  private extractHashtagTags(content: string): string[] {
    const tags: string[] = []

    // Hashtag pattern - matches #tag or #parent/child
    const hashtagPattern = /#([a-zA-Z0-9_\-\u0080-\uFFFF]+(?:\/[a-zA-Z0-9_\-\u0080-\uFFFF]+)*)/g

    // Exclude content in code blocks
    const lines = content.split('\n')
    let inCodeBlock = false
    let inFencedBlock = false
    let fenceLanguage = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || ''

      // Handle fenced code blocks
      if (line.startsWith('```')) {
        if (!inFencedBlock) {
          inFencedBlock = true
          fenceLanguage = line.substring(3)
        } else {
          inFencedBlock = false
          fenceLanguage = ''
        }
        continue
      }

      // Skip if in code block
      if (inFencedBlock || inCodeBlock) {
        if (line === '```') {
          inFencedBlock = false
        } else if (line.includes('```')) {
          inCodeBlock = !inCodeBlock
        }
        continue
      }

      // Extract hashtags from this line
      if (!line) continue
      const matches = line.matchAll(hashtagPattern)
      for (const match of matches) {
        const tag = match[0]
        if (tag && this.isValidHashtag(tag)) {
          const normalizedTag = this.normalizeTag(tag)
          if (normalizedTag) {
            tags.push(normalizedTag)
          }
        }
      }
    }

    return tags
  }

  /**
   * Extract wiki-link tags from content
   */
  private extractWikiLinkTags(content: string): string[] {
    const tags: string[] = []

    // Wiki-link tag pattern: [[#tag]] or [[file#tag]]
    const wikiLinkPattern = /\[\[([^#\]]*#([a-zA-Z0-9_\-\u0080-\uFFFF]+(?:\/[a-zA-Z0-9_\-\u0080-\uFFFF]+)*)[^\]]*)\]\]/g

    const matches = content.matchAll(wikiLinkPattern)
    for (const match of matches) {
      const tag = match[2]
      if (tag && this.isValidTag(tag)) {
        tags.push(this.normalizeTag(`#${tag}`))
      }
    }

    return tags
  }

  /**
   * Find the line and column where a tag appears
   */
  private findTagLine(content: string, tag: string): { line: number; column: number; context: string; fullLine: string } {
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || ''
      const columnIndex = line.indexOf(tag)

      if (columnIndex !== -1) {
        return {
          line: i + 1, // 1-based line numbers
          column: columnIndex + 1, // 1-based column numbers
          context: this.getContextAroundLine(lines, i, 2),
          fullLine: line
        }
      }
    }

    // Default if not found (shouldn't happen)
    return {
      line: 1,
      column: 1,
      context: content.substring(0, 100),
      fullLine: content.split('\n')[0] || ''
    }
  }

  /**
   * Get context around a specific line
   */
  private getContextAroundLine(lines: string[], centerIndex: number, contextLines: number): string {
    const start = Math.max(0, centerIndex - contextLines)
    const end = Math.min(lines.length - 1, centerIndex + contextLines)

    return lines.slice(start, end + 1).join('\n')
  }

  /**
   * Check if a hashtag is valid
   */
  private isValidHashtag(hashtag: string): boolean {
    // Must start with # and have at least one character after
    if (!hashtag.startsWith('#') || hashtag.length <= 1) return false

    // Check for invalid patterns
    if (hashtag.includes('  ')) return false // Double spaces
    if (/[<>:"|?*()[\]{}]/.test(hashtag)) return false // Invalid characters

    return true
  }

  /**
   * Check if a tag string is valid
   */
  private isValidTag(tag: string): boolean {
    const validation = TagValidator.validateTag(tag)
    return validation.valid
  }

  /**
   * Normalize tag format
   */
  private normalizeTag(tag: string): string {
    if (!tag) return tag

    // Ensure it starts with #
    if (!tag.startsWith('#')) {
      tag = `#${tag}`
    }

    // Normalize separators
    tag = tag.replace(/\\/g, '/')

    // Remove trailing slash unless it's just #
    if (tag.length > 1 && tag.endsWith('/')) {
      tag = tag.slice(0, -1)
    }

    // Trim whitespace
    tag = tag.trim()

    return tag
  }

  /**
   * Get file content from Obsidian vault
   */
  private async getFileContent(filePath: string): Promise<string> {
    try {
      // Use Obsidian's file API to read the actual file content
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (!file || !(file instanceof TFile)) {
        throw new ScannerError(`File not found: ${filePath}`, filePath, 'high', true)
      }

      const content = await this.app.vault.read(file)
      return content
    } catch (error) {
      throw new ScannerError(
        `Failed to read file content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        'high',
        true,
        { originalError: error }
      )
    }
  }

  /**
   * Get file metadata from Obsidian vault
   */
  private async getFileMetadata(filePath: string): Promise<FileMetadata> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (!file || !(file instanceof TFile)) {
        throw new ScannerError(`File not found: ${filePath}`, filePath, 'high', true)
      }

      return {
        size: file.stat.size,
        createdAt: new Date(file.stat.ctime),
        modifiedAt: new Date(file.stat.mtime),
        extension: file.extension,
        mimeType: 'text/markdown',
        cached: false,
        binary: false
      }
    } catch (error) {
      throw new ScannerError(
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath,
        'high',
        true,
        { originalError: error }
      )
    }
  }

  /**
   * Scan content directly from string (for testing)
   */
  async scanContent(content: string): Promise<FileTagInfo> {
    const startTime = Date.now()
    this.scanInProgress = true
    this.cancellationRequested = false
    this.currentScanId = `scan_${Date.now()}`

    try {
      // Emit scan start event
      eventEmitter.emit('scan-progress', {
        scanId: this.currentScanId || 'unknown',
        progress: {
          completed: 0,
          total: 1,
          currentFile: 'content'
        }
      })

      // Check for cancellation
      if (this.cancellationRequested) {
        throw new CancellationError('scan-content')
      }

      // Extract tags from content
      const tags: string[] = []

      // Extract from frontmatter
      const frontmatterTags = this.extractFrontmatterTags(content)
      tags.push(...frontmatterTags)

      // Extract from content body
      const hashtagTags = this.extractHashtagTags(content)
      tags.push(...hashtagTags)

      // Extract wiki link tags with global regex
      const wikiLinkPattern = /\[\[([^#\]]*#([a-zA-Z0-9_\-\u0080-\uFFFF]+(?:\/[a-zA-Z0-9_\-\u0080-\uFFFF]+)*)[^\]]*)\]\]/g
      const wikiMatches = content.matchAll(wikiLinkPattern)
      for (const match of wikiMatches) {
        const tag = match[2]
        if (tag && this.isValidTag(tag)) {
          tags.push(this.normalizeTag(`#${tag}`))
        }
      }

      // Normalize and deduplicate tags
      const normalizedTags = [...new Set(tags.map(tag => this.normalizeTag(tag)))]

      const scanDuration = Date.now() - startTime
      const result: FileTagInfo = {
        filePath: 'content',
        tags: normalizedTags,
        tagLocations: [], // Could be implemented for more detailed tracking
        metadata: {
          size: content.length,
          createdAt: new Date(),
          modifiedAt: new Date(),
          extension: 'md',
          mimeType: 'text/markdown',
          cached: false,
          binary: false
        },
        scanDuration,
        scannedAt: new Date(),
        success: true
      }

      // Emit completion event
      eventEmitter.emit('scan-completed', {
        scanId: this.currentScanId || 'unknown',
        result,
        duration: scanDuration
      })

      return result

    } catch (error) {
      if (error instanceof CancellationError) {
        eventEmitter.emit('scan-cancelled', { scanId: this.currentScanId || 'unknown' })
        throw error
      }

      const scannerError = new ScannerError(
        `Failed to scan content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'medium',
        true,
        { error: error instanceof Error ? error.message : String(error) }
      )

      eventEmitter.emit('scan-failed', {
        scanId: this.currentScanId || 'unknown',
        error: scannerError
      })

      throw scannerError

    } finally {
      this.scanInProgress = false
      this.currentScanId = null
    }
  }
}