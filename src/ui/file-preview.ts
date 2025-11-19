/**
 * File Preview Component - Shows file information and content preview
 */

import { App, TFile, Notice } from 'obsidian'
import { joinPath, getBaseName, getExtension, formatFileSize } from '@/utils/path-utils.js'
import { eventEmitter } from '@/utils/events.js'

/**
 * File preview options
 */
export interface FilePreviewOptions {
  /** File to preview */
  file: string | TFile
  /** Preview height */
  height?: number
  /** Show full content or just metadata */
  showContent?: boolean
  /** Max lines of content to show */
  maxContentLines?: number
  /** Highlight file sections */
  highlightSections?: string[]
  /** Custom title */
  title?: string
}

/**
 * File preview data
 */
export interface FilePreviewData {
  /** File path */
  path: string
  /** File name */
  name: string
  /** File extension */
  extension: string
  /** File size in bytes */
  size: number
  /** Last modified date */
  modifiedAt: Date
  /** Created date */
  createdAt: Date
  /** File content preview */
  content?: string
  /** File metadata */
  metadata?: Record<string, any>
  /** Frontmatter if available */
  frontmatter?: Record<string, any>
  /** Tags found in file */
  tags?: string[]
}

/**
 * File Preview Component
 */
export class FilePreview {
  private containerEl: HTMLElement
  private options: Required<FilePreviewOptions>
  private previewData: FilePreviewData | null = null

  constructor(
    private app: App,
    container: HTMLElement,
    options: FilePreviewOptions
  ) {
    this.containerEl = container
    this.options = {
      height: 300,
      showContent: true,
      maxContentLines: 20,
      highlightSections: [],
      ...options
    } as Required<FilePreviewOptions>

    this.render()
  }

  /**
   * Update preview with new file
   */
  async updateFile(file: string | TFile): Promise<void> {
    this.options.file = file
    await this.loadPreviewData()
    this.render()
  }

  /**
   * Update preview options
   */
  updateOptions(options: Partial<FilePreviewOptions>): void {
    this.options = { ...this.options, ...options } as Required<FilePreviewOptions>
    this.render()
  }

  /**
   * Get current preview data
   */
  getPreviewData(): FilePreviewData | null {
    return this.previewData
  }

  /**
   * Destroy preview component
   */
  destroy(): void {
    this.containerEl.empty()
  }

  /**
   * Render the preview
   */
  private async render(): Promise<void> {
    this.containerEl.empty()
    this.containerEl.addClass('tagfolder-file-preview')

    await this.loadPreviewData()

    if (!this.previewData) {
      this.renderError('File not found or cannot be accessed')
      return
    }

    this.renderHeader()
    this.renderMetadata()
    this.renderContent()
    this.renderFooter()
  }

  /**
   * Load preview data
   */
  private async loadPreviewData(): Promise<void> {
    try {
      let filePath: string
      let tFile: TFile | null = null

      if (typeof this.options.file === 'string') {
        filePath = this.options.file
        tFile = this.app.vault.getAbstractFileByPath(filePath) as TFile
      } else {
        tFile = this.options.file
        filePath = tFile.path
      }

      if (!tFile) {
        this.previewData = null
        return
      }

      const content = tFile instanceof TFile ? await this.app.vault.read(tFile) : ''

      this.previewData = {
        path: filePath,
        name: getBaseName(filePath),
        extension: getExtension(filePath),
        size: tFile.stat.size,
        modifiedAt: new Date(tFile.stat.mtime),
        createdAt: new Date(tFile.stat.ctime),
        content,
        metadata: {
          size: tFile.stat.size,
          mtime: tFile.stat.mtime,
          ctime: tFile.stat.ctime
        }
      }

      // Extract frontmatter and tags
      if (content) {
        this.previewData.frontmatter = this.extractFrontmatter(content)
        this.previewData.tags = this.extractTags(content)
      }

    } catch (error) {
      console.error('Failed to load file preview:', error)
      this.previewData = null
    }
  }

  /**
   * Render preview header
   */
  private renderHeader(): void {
    const headerEl = this.containerEl.createDiv('tagfolder-preview-header')

    const titleEl = headerEl.createDiv('tagfolder-preview-title')
    const iconEl = titleEl.createSpan('tagfolder-preview-icon')
    iconEl.textContent = this.getFileIcon(this.previewData!.extension)

    const nameEl = titleEl.createSpan('tagfolder-preview-name')
    nameEl.textContent = this.options.title || this.previewData!.name

    if (this.previewData!.extension) {
      const extensionEl = titleEl.createSpan('tagfolder-preview-extension')
      extensionEl.textContent = `.${this.previewData!.extension}`
    }
  }

  /**
   * Render file metadata
   */
  private renderMetadata(): void {
    const metadataEl = this.containerEl.createDiv('tagfolder-preview-metadata')

    const infoGrid = metadataEl.createDiv('tagfolder-preview-info-grid')

    // File size
    this.createInfoItem(infoGrid, 'Size', this.formatFileSize(this.previewData!.size))

    // Modified date
    this.createInfoItem(infoGrid, 'Modified', this.formatDate(this.previewData!.modifiedAt))

    // Created date
    this.createInfoItem(infoGrid, 'Created', this.formatDate(this.previewData!.createdAt))

    // File path
    this.createInfoItem(infoGrid, 'Path', this.previewData!.path, true)

    // Tags if present
    if (this.previewData!.tags && this.previewData!.tags.length > 0) {
      const tagsEl = metadataEl.createDiv('tagfolder-preview-tags')
      tagsEl.createSpan('tagfolder-preview-label').textContent = 'Tags: '

      const tagsContainer = tagsEl.createDiv('tagfolder-preview-tags-container')
      this.previewData!.tags.forEach(tag => {
        const tagEl = tagsContainer.createSpan('tagfolder-preview-tag')
        tagEl.textContent = tag
      })
    }

    // Frontmatter if present
    if (this.previewData!.frontmatter && Object.keys(this.previewData!.frontmatter).length > 0) {
      const frontmatterEl = metadataEl.createDiv('tagfolder-preview-frontmatter')
      frontmatterEl.createSpan('tagfolder-preview-label').textContent = 'Frontmatter: '

      const frontmatterContainer = frontmatterEl.createDiv('tagfolder-preview-frontmatter-container')
      Object.entries(this.previewData!.frontmatter).forEach(([key, value]) => {
        if (key !== 'tags') { // Tags are shown separately
          const itemEl = frontmatterContainer.createDiv('tagfolder-preview-frontmatter-item')
          itemEl.createSpan('tagfolder-preview-frontmatter-key').textContent = `${key}: `
          itemEl.createSpan('tagfolder-preview-frontmatter-value').textContent = String(value)
        }
      })
    }
  }

  /**
   * Render file content
   */
  private renderContent(): void {
    if (!this.options.showContent || !this.previewData!.content) {
      return
    }

    const contentEl = this.containerEl.createDiv('tagfolder-preview-content')
    contentEl.style.maxHeight = `${this.options.height}px`

    const contentHeaderEl = contentEl.createDiv('tagfolder-preview-content-header')
    contentHeaderEl.createSpan('tagfolder-preview-label').textContent = 'Content Preview'

    if (this.previewData!.content.length > this.options.maxContentLines! * 100) {
      const truncateInfoEl = contentHeaderEl.createSpan('tagfolder-preview-truncate-info')
      truncateInfoEl.textContent = `(First ${this.options.maxContentLines} lines)`
    }

    const contentTextEl = contentEl.createDiv('tagfolder-preview-content-text')

    const lines = this.previewData!.content.split('\n')
    const maxLines = Math.min(lines.length, this.options.maxContentLines!)
    const displayLines = lines.slice(0, maxLines)

    displayLines.forEach((line, index) => {
      const lineEl = contentTextEl.createDiv('tagfolder-preview-line')
      lineEl.setAttribute('data-line', String(index + 1))

      // Line number
      const lineNumberEl = lineEl.createSpan('tagfolder-preview-line-number')
      lineNumberEl.textContent = String(index + 1).padStart(3, ' ')

      // Line content
      const lineContentEl = lineEl.createSpan('tagfolder-preview-line-content')
      lineContentEl.textContent = line

      // Highlight sections if specified
      if (this.options.highlightSections.length > 0) {
        this.highlightSectionsInLine(lineContentEl, line, index + 1)
      }
    })

    if (lines.length > maxLines) {
      const truncatedEl = contentTextEl.createDiv('tagfolder-preview-truncated')
      truncatedEl.textContent = `... (${lines.length - maxLines} more lines not shown)`
    }
  }

  /**
   * Render preview footer
   */
  private renderFooter(): void {
    const footerEl = this.containerEl.createDiv('tagfolder-preview-footer')

    // File type indicator
    const typeEl = footerEl.createDiv('tagfolder-preview-type')
    typeEl.createSpan('tagfolder-preview-label').textContent = 'Type: '
    typeEl.createSpan('tagfolder-preview-type-value').textContent = this.getFileTypeDescription()

    // Action buttons
    const actionsEl = footerEl.createDiv('tagfolder-preview-actions')

    // Open file button
    const openButton = actionsEl.createEl('button', { cls: 'tagfolder-preview-action-button' })
    openButton.textContent = 'Open in Editor'
    openButton.addEventListener('click', () => {
      this.openFileInEditor()
    })

    // Copy path button
    const copyButton = actionsEl.createEl('button', { cls: 'tagfolder-preview-action-button' })
    copyButton.textContent = 'Copy Path'
    copyButton.addEventListener('click', () => {
      this.copyFilePath()
    })
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    const errorEl = this.containerEl.createDiv('tagfolder-preview-error')

    const errorIcon = errorEl.createDiv('tagfolder-preview-error-icon')
    errorIcon.textContent = '❌'

    const errorMessage = errorEl.createDiv('tagfolder-preview-error-message')
    errorMessage.textContent = message
  }

  /**
   * Create info item for metadata
   */
  private createInfoItem(container: HTMLElement, label: string, value: string, isPath = false): void {
    const itemEl = container.createDiv('tagfolder-preview-info-item')

    itemEl.createSpan('tagfolder-preview-label').textContent = `${label}: `

    const valueEl = itemEl.createSpan('tagfolder-preview-value')
    if (isPath) {
      valueEl.addClass('tagfolder-preview-path')
    }
    valueEl.textContent = value
  }

  /**
   * Get file icon based on extension
   */
  private getFileIcon(extension: string): string {
    const icons: Record<string, string> = {
      md: '📝',
      txt: '📄',
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      xls: '📗',
      xlsx: '📗',
      ppt: '📙',
      pptx: '📙',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      svg: '🎨',
      mp3: '🎵',
      wav: '🎵',
      mp4: '🎬',
      mov: '🎬',
      zip: '📦',
      rar: '📦',
      json: '📋',
      yaml: '📋',
      yml: '📋',
      xml: '📋',
      html: '🌐',
      css: '🎨',
      js: '⚡',
      ts: '⚡'
    }

    return icons[extension.toLowerCase()] || '📄'
  }

  /**
   * Get file type description
   */
  private getFileTypeDescription(): string {
    if (!this.previewData!.extension) {
      return 'File'
    }

    const descriptions: Record<string, string> = {
      md: 'Markdown Document',
      txt: 'Text File',
      pdf: 'PDF Document',
      doc: 'Word Document',
      docx: 'Word Document',
      xls: 'Excel Spreadsheet',
      xlsx: 'Excel Spreadsheet',
      ppt: 'PowerPoint Presentation',
      pptx: 'PowerPoint Presentation',
      jpg: 'JPEG Image',
      jpeg: 'JPEG Image',
      png: 'PNG Image',
      gif: 'GIF Image',
      svg: 'SVG Vector Image',
      mp3: 'MP3 Audio',
      wav: 'WAV Audio',
      mp4: 'MP4 Video',
      mov: 'QuickTime Video',
      zip: 'ZIP Archive',
      rar: 'RAR Archive',
      json: 'JSON Data',
      yaml: 'YAML Data',
      yml: 'YAML Data',
      xml: 'XML Data',
      html: 'HTML Document',
      css: 'CSS Stylesheet',
      js: 'JavaScript',
      ts: 'TypeScript'
    }

    return descriptions[this.previewData!.extension.toLowerCase()] || `${this.previewData!.extension.toUpperCase()} File`
  }

  /**
   * Extract frontmatter from content
   */
  private extractFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return {}

    try {
      // Simple YAML parsing - in real implementation, use a proper YAML parser
      const frontmatterText = frontmatterMatch[1]
      if (!frontmatterText) return {}

      const frontmatter: Record<string, any> = {}

      const lines = frontmatterText.split('\n')
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '')
          frontmatter[key] = value
        }
      }

      return frontmatter
    } catch (error) {
      return {}
    }
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags: string[] = []

    // Extract from frontmatter
    const frontmatter = this.extractFrontmatter(content)
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags.push(...frontmatter.tags)
      } else if (typeof frontmatter.tags === 'string') {
        tags.push(frontmatter.tags)
      }
    }

    // Extract hashtags
    const hashtagMatches = content.matchAll(/#([a-zA-Z0-9_\-\u0080-\uFFFF]+)/g)
    for (const match of hashtagMatches) {
      tags.push(`#${match[1]}`)
    }

    // Remove duplicates and return
    return [...new Set(tags)]
  }

  /**
   * Highlight sections in a line
   */
  private highlightSectionsInLine(lineEl: HTMLElement, line: string, lineNumber: number): void {
    for (const section of this.options.highlightSections) {
      const sectionMatch = section.match(/^(\d+):(\d+)-(\d+)$/)
      if (sectionMatch) {
        const sectionLine = parseInt(sectionMatch[1] || '0')
        const startCol = parseInt(sectionMatch[2] || '0')
        const endCol = parseInt(sectionMatch[3] || '0')

        if (sectionLine === lineNumber) {
          // In a real implementation, this would highlight the specific characters
          lineEl.addClass('tagfolder-preview-highlighted')
        }
      }
    }
  }

  /**
   * Open file in editor
   */
  private async openFileInEditor(): Promise<void> {
    if (!this.previewData) return

    try {
      const file = this.app.vault.getAbstractFileByPath(this.previewData.path)
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file)
      }
    } catch (error) {
      console.error('Failed to open file:', error)
      new Notice('Failed to open file in editor')
    }
  }

  /**
   * Copy file path to clipboard
   */
  private async copyFilePath(): Promise<void> {
    if (!this.previewData) return

    try {
      await navigator.clipboard.writeText(this.previewData.path)
      new Notice('File path copied to clipboard')
    } catch (error) {
      console.error('Failed to copy path:', error)
      new Notice('Failed to copy file path')
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
}