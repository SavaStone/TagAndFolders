/**
 * Conflict Resolution Dialog - Handles file conflicts during organization
 */

import { App, Setting, Notice } from 'obsidian'
import { BaseDialog, DialogResult } from './dialog.js'
import type { ConflictResolution } from '@/types/entities.js'
import type { FileOperation } from '@/types/entities.js'
import { eventEmitter } from '@/utils/events.js'
import { sanitizeFileName, generateUniqueFileName, tagToDisplayPath } from '@/utils/path-utils.js'
import { validateFilePath } from '@/utils/validation.js'

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  /** Resolution strategy chosen by user */
  strategy: ConflictResolution['strategy']
  /** Custom action if applicable */
  customAction?: string
  /** New file name if rename strategy chosen */
  newFileName?: string
  /** Whether user confirmed the action */
  confirmed: boolean
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  /** File operation causing conflict */
  operation: FileOperation
  /** Type of conflict */
  type: 'target-exists' | 'target-read-only' | 'permission-denied' | 'path-too-long'
  /** Existing file information */
  existingFile: {
    path: string
    size: number
    modifiedAt: Date
    checksum?: string
  }
  /** New file information */
  newFile: {
    path: string
    size: number
    modifiedAt: Date
    checksum?: string
  }
  /** Additional context */
  context?: Record<string, any>
}

/**
 * Conflict Resolution Dialog
 */
export class ConflictDialog extends BaseDialog<ConflictResolutionResult> {
  private conflict: ConflictInfo
  private selectedStrategy: ConflictResolution['strategy'] = 'prompt'
  private newFileName: string = ''
  private strategyRadios: HTMLInputElement[] = []

  constructor(app: App, conflict: ConflictInfo) {
    super(app, {
      title: 'File Conflict',
      width: 700,
      height: 750,
      type: 'warning', // Back to warning for proper icon
      showCancel: true,
      buttonLabels: {
        confirm: 'Apply Resolution',
        cancel: 'Cancel Operation'
      }
    })

    this.conflict = conflict
    this.selectedStrategy = this.getDefaultStrategy()
  }

  protected createContent(): void {
    // Use the new styled container from BaseDialog
    const container = this.createContainer('conflict-resolution-modal')

    // Conflict header
    this.createConflictHeader(container)

    // File comparison
    this.createFileComparison(container)

    // Resolution options
    this.createResolutionOptions(container)

    // Additional options
    this.createAdditionalOptions(container)

    // Preview
    this.createResolutionPreview(container)
  }

  protected async onConfirm(): Promise<ConflictResolutionResult> {
    if (this.selectedStrategy === 'rename' && !this.newFileName.trim()) {
      throw new Error('Please enter a new file name for the rename strategy')
    }

        const result: ConflictResolutionResult = {
      strategy: this.selectedStrategy,
      confirmed: true
    }

    if (this.selectedStrategy === 'rename' && this.newFileName.trim()) {
      result.customAction = this.newFileName
      result.newFileName = this.newFileName
    }

    return result
  }

  /**
   * Get default resolution strategy based on conflict type
   */
  private getDefaultStrategy(): ConflictResolution['strategy'] {
    switch (this.conflict.type) {
      case 'target-exists':
        return 'rename'
      case 'target-read-only':
        return 'prompt'
      case 'permission-denied':
        return 'skip'
      case 'path-too-long':
        return 'rename'
      default:
        return 'prompt'
    }
  }

  /**
   * Create conflict header section - simplified (main header is in BaseDialog)
   */
  private createConflictHeader(containerEl: HTMLElement): void {
    // Add conflict description only if needed
    const descriptionEl = containerEl.createDiv('tagfolder-conflict-description')
    descriptionEl.innerHTML = this.getConflictDescription()
    descriptionEl.style.marginBottom = '24px'
  }

  /**
   * Create file comparison section - UPDATED WITH REFERENCE DESIGN
   */
  private createFileComparison(containerEl: HTMLElement): void {
    const comparisonEl = containerEl.createDiv('tagfolder-file-comparison')
    comparisonEl.style.marginBottom = '20px'

    // Section header with improved typography
    const headerEl = comparisonEl.createEl('h3', { text: 'File Details' })

    const filesGrid = comparisonEl.createDiv('tagfolder-files-grid')

    // Existing file card
    const existingFileEl = filesGrid.createDiv('tagfolder-file-card')
    this.createFileCard(existingFileEl, this.conflict.existingFile, 'Existing File', '📄')

    // New file card
    const newFileEl = filesGrid.createDiv('tagfolder-file-card')
    this.createFileCard(newFileEl, this.conflict.newFile, 'File Being Organized', '📝')

    // Conflict details if available
    if (this.conflict.context) {
      const contextEl = comparisonEl.createDiv('tagfolder-conflict-context')
      contextEl.style.marginTop = '16px'

      const contextHeader = contextEl.createEl('h5', { text: 'Additional Information' })
      contextHeader.style.marginBottom = '8px'
      contextHeader.style.color = 'var(--text-normal)'

      const contextWrapper = contextEl.createDiv('tagfolder-context-wrapper')
      contextWrapper.style.border = '1px solid var(--background-modifier-border)'
      contextWrapper.style.borderRadius = '4px'
      contextWrapper.style.padding = '12px'
      contextWrapper.style.backgroundColor = 'var(--background-secondary)'

      for (const [key, value] of Object.entries(this.conflict.context)) {
        const contextItem = contextWrapper.createDiv('tagfolder-context-item')
        contextItem.style.display = 'flex'
        contextItem.style.justifyContent = 'space-between'
        contextItem.style.padding = '4px 0'
        contextItem.style.borderBottom = '1px solid var(--background-modifier-border)'

        const keySpan = contextItem.createSpan({ text: `${key}:` })
        keySpan.style.fontWeight = '500'

        const valueSpan = contextItem.createSpan({
          text: String(value),
          cls: 'tagfolder-context-value'
        })
        valueSpan.style.color = 'var(--text-muted)'
      }
    }
  }

  /**
   * Create file card with details - IMPROVED WITH CONSISTENT DESIGN
   */
  private createFileCard(container: HTMLElement, file: any, title: string, icon: string): void {
    // Card header with improved styling
    const headerEl = container.createDiv('tagfolder-file-card-header')

    const fileIcon = headerEl.createDiv('tagfolder-file-icon')
    fileIcon.textContent = icon

    const titleEl = headerEl.createEl('h4', { text: title })

    // File details
    const detailsEl = container.createDiv('tagfolder-file-details')

    // File path
    const pathEl = detailsEl.createDiv('tagfolder-file-path')
    pathEl.textContent = file.path

    // File size and date in row
    const metaRow = detailsEl.createDiv('tagfolder-file-meta-row')

    const sizeEl = metaRow.createDiv('tagfolder-file-size')
    sizeEl.textContent = this.formatFileSize(file.size)

    const dateEl = metaRow.createDiv('tagfolder-file-date')
    dateEl.textContent = this.formatDate(file.modifiedAt)

    // Checksum if available
    if (file.checksum) {
      const checksumEl = detailsEl.createDiv('tagfolder-file-checksum')
      checksumEl.innerHTML = `
        <span style="color: var(--text-muted);">Checksum: </span>
        <span style="color: var(--text-normal);">${file.checksum.substring(0, 16)}...</span>
      `
    }

    // File type indicator
    const extension = file.path.split('.').pop()?.toLowerCase()
    if (extension) {
      const typeEl = detailsEl.createDiv('tagfolder-file-type')
      typeEl.textContent = extension.toUpperCase()
    }
  }

  /**
   * Create resolution options section - UPDATED WITH REFERENCE DESIGN
   */
  private createResolutionOptions(containerEl: HTMLElement): void {
    const optionsEl = containerEl.createDiv('tagfolder-resolution-options')
    optionsEl.style.marginBottom = '20px'

    const headerEl = optionsEl.createEl('h4', { text: 'Resolution Options' })
    headerEl.style.marginBottom = '12px'
    headerEl.style.color = 'var(--text-normal)'

    const strategies = this.getAvailableStrategies()

    strategies.forEach(strategy => {
      const strategyEl = optionsEl.createDiv('tagfolder-strategy-option')
      strategyEl.style.border = '1px solid var(--background-modifier-border)'
      strategyEl.style.borderRadius = '4px'
      strategyEl.style.marginBottom = '8px'
      strategyEl.style.overflow = 'hidden'
      strategyEl.style.transition = 'border-color 0.1s ease'

      // Highlight selected strategy
      if (strategy.value === this.selectedStrategy) {
        strategyEl.style.borderColor = 'var(--interactive-accent)'
        strategyEl.style.backgroundColor = 'var(--background-modifier-hover)'
      }

      // Radio button (hidden)
      const radioEl = strategyEl.createEl('input', {
        type: 'radio',
        attr: { name: 'resolution-strategy' }
      })
      radioEl.value = strategy.value
      radioEl.id = `strategy-${strategy.value}`
      radioEl.style.display = 'none'

      if (strategy.value === this.selectedStrategy) {
        radioEl.checked = true
      }

      this.strategyRadios.push(radioEl)

      // Clickable label area
      const clickableEl = strategyEl.createDiv('tagfolder-strategy-clickable')
      clickableEl.style.padding = '16px'
      clickableEl.style.cursor = 'pointer'
      clickableEl.style.display = 'flex'
      clickableEl.style.alignItems = 'flex-start'
      clickableEl.style.gap = '12px'

      // Custom radio indicator
      const radioIndicator = clickableEl.createDiv('tagfolder-radio-indicator')
      radioIndicator.style.width = '16px'
      radioIndicator.style.height = '16px'
      radioIndicator.style.border = '2px solid var(--background-modifier-border)'
      radioIndicator.style.borderRadius = '50%'
      radioIndicator.style.marginTop = '2px'
      radioIndicator.style.flexShrink = '0'

      if (strategy.value === this.selectedStrategy) {
        radioIndicator.style.borderColor = 'var(--interactive-accent)'
        radioIndicator.style.backgroundColor = 'var(--interactive-accent)'
        radioIndicator.innerHTML = '<div style="width: 6px; height: 6px; background: white; border-radius: 50%; margin: 3px;"></div>'
      }

      // Strategy content
      const contentEl = clickableEl.createDiv('tagfolder-strategy-content')
      contentEl.style.flex = '1'

      const strategyHeader = contentEl.createDiv('tagfolder-strategy-header')
      strategyHeader.style.display = 'flex'
      strategyHeader.style.justifyContent = 'space-between'
      strategyHeader.style.alignItems = 'center'
      strategyHeader.style.marginBottom = '4px'

      const titleEl = strategyHeader.createSpan('tagfolder-strategy-title')
      titleEl.textContent = strategy.title
      titleEl.style.fontWeight = '500'
      titleEl.style.color = 'var(--text-normal)'

      if (strategy.tag) {
        const tagEl = strategyHeader.createSpan('tagfolder-strategy-tag')
        tagEl.textContent = strategy.tag
        tagEl.style.fontSize = '10px'
        tagEl.style.padding = '2px 6px'
        tagEl.style.borderRadius = '3px'
        tagEl.style.fontWeight = '500'

        // Color based on tag type
        if (strategy.tag.toLowerCase().includes('recommended')) {
          tagEl.style.backgroundColor = 'var(--background-success)'
          tagEl.style.color = 'var(--text-success)'
        } else if (strategy.tag.toLowerCase().includes('destructive')) {
          tagEl.style.backgroundColor = 'var(--background-error)'
          tagEl.style.color = 'var(--text-error)'
        } else if (strategy.tag.toLowerCase().includes('safe')) {
          tagEl.style.backgroundColor = 'var(--background-info)'
          tagEl.style.color = 'var(--text-info)'
        } else {
          tagEl.style.backgroundColor = 'var(--background-modifier-border)'
          tagEl.style.color = 'var(--text-muted)'
        }
      }

      if (strategy.description) {
        const descEl = contentEl.createDiv('tagfolder-strategy-description')
        descEl.textContent = strategy.description
        descEl.style.fontSize = '12px'
        descEl.style.color = 'var(--text-muted)'
        descEl.style.marginBottom = '4px'
        descEl.style.lineHeight = '1.4'
      }

      if (strategy.risk) {
        const riskEl = contentEl.createDiv('tagfolder-strategy-risk')
        riskEl.textContent = `⚠️ ${strategy.risk}`
        riskEl.style.fontSize = '11px'
        riskEl.style.color = 'var(--text-warning)'
        riskEl.style.fontWeight = '500'
      }

      // Event handlers
      const handleSelection = () => {
        // Update radio and visual state
        radioEl.checked = true
        this.selectedStrategy = strategy.value as ConflictResolution['strategy']

        // Update all strategy visuals
        this.updateStrategyVisuals()

        // Update preview
        this.updateResolutionPreview()
      }

      clickableEl.addEventListener('click', handleSelection)
      radioEl.addEventListener('change', handleSelection)
    })
  }

  /**
   * Update visual state of all strategy options
   */
  private updateStrategyVisuals(): void {
    const allStrategies = this.contentEl.querySelectorAll('.tagfolder-strategy-option')

    allStrategies.forEach(strategyEl => {
      const radio = strategyEl.querySelector('input[type="radio"]') as HTMLInputElement
      const indicator = strategyEl.querySelector('.tagfolder-radio-indicator') as HTMLElement

      if (radio.checked) {
        // Highlight selected
        strategyEl.setAttribute('style', 'border: 1px solid var(--interactive-accent); border-radius: 4px; margin-bottom: 8px; overflow: hidden; transition: border-color 0.1s ease; background-color: var(--background-modifier-hover);')

        if (indicator) {
          indicator.setAttribute('style', 'width: 16px; height: 16px; border: 2px solid var(--interactive-accent); border-radius: 50%; margin-top: 2px; flex-shrink: 0; background-color: var(--interactive-accent);')
          indicator.innerHTML = '<div style="width: 6px; height: 6px; background: white; border-radius: 50%; margin: 3px;"></div>'
        }
      } else {
        // Unhighlight others
        strategyEl.setAttribute('style', 'border: 1px solid var(--background-modifier-border); border-radius: 4px; margin-bottom: 8px; overflow: hidden; transition: border-color 0.1s ease;')

        if (indicator) {
          indicator.setAttribute('style', 'width: 16px; height: 16px; border: 2px solid var(--background-modifier-border); border-radius: 50%; margin-top: 2px; flex-shrink: 0;')
          indicator.innerHTML = ''
        }
      }
    })
  }

  /**
   * Create additional options section - Updated structure
   */
  private createAdditionalOptions(containerEl: HTMLElement): void {
    // Add separator spacing
    const separator = containerEl.createDiv()
    separator.style.marginBottom = '32px'
  }

  /**
   * Create custom name container with proper structure - HEADER OUTSIDE CONTAINER
   */
  private createCustomNameContainer(containerEl: HTMLElement): void {
    // Header outside container - only show when rename is selected
    const headerEl = containerEl.createEl('h4', { text: 'New file name' })
    headerEl.className = 'tagfolder-custom-name-header'
    headerEl.style.display = this.selectedStrategy === 'rename' ? 'block' : 'none'
    headerEl.style.marginBottom = '20px'

    // Container only for description and input
    const customNameContainer = containerEl.createDiv('tagfolder-custom-name-container')
    customNameContainer.className = 'tagfolder-custom-name-container'
    customNameContainer.style.display = this.selectedStrategy === 'rename' ? 'block' : 'none'

    // Description with larger font size
    const descLabel = customNameContainer.createEl('div', { text: 'Enter a new name for the file (extension will be preserved)' })
    descLabel.className = 'tagfolder-setting-description'
    descLabel.style.fontSize = '14px' // Make it more readable

    // Input field
    const textInput = customNameContainer.createEl('input', { type: 'text' })
    textInput.className = 'tagfolder-text-input'

    const targetFile = this.conflict.newFile.path
    const extension = targetFile.split('.').pop() || ''
    const baseName = targetFile.split('/').pop()?.replace(`.${extension}`, '') || ''
    const uniqueName = generateUniqueFileName('', baseName, extension)

    textInput.value = uniqueName
    textInput.addEventListener('input', () => {
      this.newFileName = textInput.value
      this.updateResolutionPreview()
    })
  }

  /**
   * Create resolution preview section - Fixed structure (no box-in-box)
   */
  private createResolutionPreview(containerEl: HTMLElement): void {
    // Custom file name for rename strategy - as sibling to preview card
    this.createCustomNameContainer(containerEl)

    // Add header before preview card
    const headerEl = containerEl.createEl('h4', { text: 'Resolution Preview' })
    headerEl.className = 'tagfolder-resolution-header'

    // Create the preview card DIRECTLY - no wrapper with borders/padding
    const previewEl = containerEl.createDiv('tagfolder-preview-content')

    this.updateResolutionPreview()
  }

  
  /**
   * Update resolution preview - UPDATED WITH FIXED STRUCTURE
   */
  private updateResolutionPreview(): void {
    const existingContent = this.contentEl.querySelector('.tagfolder-preview-content')
    if (!existingContent) return

    // Clear existing content
    existingContent.empty()

    switch (this.selectedStrategy) {
      case 'skip':
        existingContent.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 20px; flex-shrink: 0;">⏭️</span>
            <div>
              <div style="font-weight: 600; color: var(--text-normal); margin-bottom: 4px;">Skip operation</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                The file will not be moved and no changes will be made.
              </div>
            </div>
          </div>
        `
        break

      case 'rename':
        const newName = this.newFileName || 'renamed-file.md'
        existingContent.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 20px; flex-shrink: 0;">✏️</span>
            <div>
              <div style="font-weight: 600; color: var(--text-normal); margin-bottom: 4px;">Rename file</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
                File will be moved with a new name:
              </div>
              <code style="background: var(--background-modifier-border); padding: 4px 8px; border-radius: 3px; font-size: 11px; color: var(--text-normal);">${newName}</code>
            </div>
          </div>
        `
        break

      case 'replace':
        existingContent.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 20px; flex-shrink: 0;">🔄</span>
            <div>
              <div style="font-weight: 600; color: var(--text-normal); margin-bottom: 4px;">Replace existing file</div>
              <div style="font-size: 12px; color: var(--text-error); line-height: 1.4;">
                ⚠️ The existing file will be overwritten and permanently lost.
              </div>
            </div>
          </div>
        `
        break

      
      default:
        existingContent.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 20px; flex-shrink: 0;">❓</span>
            <div>
              <div style="font-weight: 600; color: var(--text-normal); margin-bottom: 4px;">Custom resolution</div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                Additional information may be required.
              </div>
            </div>
          </div>
        `
    }

    // Show/hide custom name field and header
    const customNameContainer = this.contentEl.querySelector('.tagfolder-custom-name-container') as HTMLElement
    const customNameHeader = this.contentEl.querySelector('.tagfolder-custom-name-header') as HTMLElement
    if (customNameContainer && customNameHeader) {
      const shouldShow = this.selectedStrategy === 'rename'
      customNameContainer.style.display = shouldShow ? 'block' : 'none'
      customNameHeader.style.display = shouldShow ? 'block' : 'none'
    }
  }

  /**
   * Get conflict description
   */
  private getConflictDescription(): string {
    switch (this.conflict.type) {
      case 'target-exists':
        return `A file with the same name already exists at the target location.<br><strong>${this.conflict.existingFile.path}</strong>`
      case 'target-read-only':
        return `The target file is read-only and cannot be overwritten.`
      case 'permission-denied':
        return `Permission denied when trying to access the target location.`
      case 'path-too-long':
        return `The target path is too long for the file system.`
      default:
        return `A conflict occurred while trying to organize the file.`
    }
  }

  /**
   * Get available resolution strategies
   */
  private getAvailableStrategies(): Array<{
    value: string
    title: string
    description?: string
    tag?: string
    risk?: string
  }> {
    const strategies = []

    switch (this.conflict.type) {
      case 'target-exists':
        strategies.push(
          {
            value: 'rename',
            title: 'Rename file',
            description: 'Give the new file a different name to avoid conflict',
            tag: 'Recommended'
          },
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cancel this file organization and keep both files',
            tag: 'Safe'
          },
          {
            value: 'replace',
            title: 'Replace existing file',
            description: 'Overwrite the existing file with the new one',
            tag: 'Destructive',
            risk: 'The existing file will be permanently lost'
          },
          {
            value: 'subfolder',
            title: 'Move to subfolder',
            description: 'Create a conflict subfolder and move the file there',
            tag: 'Safe'
          }
        )
        break

      case 'target-read-only':
        strategies.push(
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cannot modify read-only file',
            tag: 'Only option'
          }
        )
        break

      case 'permission-denied':
        strategies.push(
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Permission denied - cannot access target',
            tag: 'Only option'
          }
        )
        break

      case 'path-too-long':
        strategies.push(
          {
            value: 'rename',
            title: 'Shorten name',
            description: 'Use a shorter file name to fit path length limits',
            tag: 'Recommended'
          },
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cannot move file due to path length',
            tag: 'Safe'
          }
        )
        break
    }

    return strategies
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