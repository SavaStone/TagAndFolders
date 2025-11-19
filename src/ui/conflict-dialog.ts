/**
 * Conflict Resolution Dialog - Handles file conflicts during organization
 */

import { App, Setting, Notice } from 'obsidian'
import { BaseDialog, DialogResult } from './dialog.js'
import type { ConflictResolution } from '@/types/entities.js'
import type { FileOperation } from '@/types/contracts/organizer.contract.js'
import { eventEmitter } from '@/utils/events.js'
import { sanitizeFileName, generateUniqueFileName } from '@/utils/path-utils.js'
import { validateFilePath } from '@/utils/validation.js'

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  /** Resolution strategy chosen by user */
  strategy: ConflictResolution['strategy']
  /** Custom action if applicable */
  customAction?: string
  /** Whether to apply this resolution to all similar conflicts */
  applyToAll: boolean
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
  private applyToAll = false
  private strategyRadios: HTMLInputElement[] = []

  constructor(app: App, conflict: ConflictInfo) {
    super(app, {
      title: 'File Conflict',
      width: 700,
      height: 600,
      type: 'warning',
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
    const { contentEl } = this

    // Conflict header
    this.createConflictHeader(contentEl)

    // File comparison
    this.createFileComparison(contentEl)

    // Resolution options
    this.createResolutionOptions(contentEl)

    // Additional options
    this.createAdditionalOptions(contentEl)

    // Preview
    this.createResolutionPreview(contentEl)
  }

  protected async onConfirm(): Promise<ConflictResolutionResult> {
    if (this.selectedStrategy === 'rename' && !this.newFileName.trim()) {
      throw new Error('Please enter a new file name for the rename strategy')
    }

    return {
      strategy: this.selectedStrategy,
      customAction: this.selectedStrategy === 'rename' ? this.newFileName : undefined,
      newFileName: this.selectedStrategy === 'rename' ? this.newFileName : undefined,
      applyToAll: this.applyToAll,
      confirmed: true
    }
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
   * Create conflict header section
   */
  private createConflictHeader(containerEl: HTMLElement): void {
    const headerEl = containerEl.createDiv('tagfolder-conflict-header')

    const conflictIcon = headerEl.createDiv('tagfolder-conflict-icon')
    conflictIcon.textContent = '⚠️'

    const conflictMessage = headerEl.createDiv('tagfolder-conflict-message')

    const titleEl = conflictMessage.createEl('h3', { text: 'File Conflict Detected' })

    const descriptionEl = conflictMessage.createDiv('tagfolder-conflict-description')
    descriptionEl.innerHTML = this.getConflictDescription()
  }

  /**
   * Create file comparison section
   */
  private createFileComparison(containerEl: HTMLElement): void {
    const comparisonEl = containerEl.createDiv('tagfolder-file-comparison')

    comparisonEl.createEl('h4', { text: 'File Details' })

    const filesGrid = comparisonEl.createDiv('tagfolder-files-grid')

    // Existing file
    const existingFileEl = filesGrid.createDiv('tagfolder-file-card')
    this.createFileCard(existingFileEl, this.conflict.existingFile, 'Existing File', '📄')

    // New file
    const newFileEl = filesGrid.createDiv('tagfolder-file-card')
    this.createFileCard(newFileEl, this.conflict.newFile, 'File Being Organized', '📝')

    // Conflict details
    if (this.conflict.context) {
      const contextEl = comparisonEl.createDiv('tagfolder-conflict-context')
      contextEl.createEl('h5', { text: 'Additional Information' })

      for (const [key, value] of Object.entries(this.conflict.context)) {
        const contextItem = contextEl.createDiv('tagfolder-context-item')
        contextItem.createSpan({ text: `${key}: ` })
        contextItem.createSpan({ text: String(value), cls: 'tagfolder-context-value' })
      }
    }
  }

  /**
   * Create file card with details
   */
  private createFileCard(container: HTMLElement, file: any, title: string, icon: string): void {
    container.createDiv('tagfolder-file-icon').textContent = icon
    container.createEl('h5', { text: title })

    const detailsEl = container.createDiv('tagfolder-file-details')

    detailsEl.createDiv('tagfolder-file-path').textContent = file.path
    detailsEl.createDiv('tagfolder-file-size').textContent = this.formatFileSize(file.size)
    detailsEl.createDiv('tagfolder-file-date').textContent = this.formatDate(file.modifiedAt)

    if (file.checksum) {
      detailsEl.createDiv('tagfolder-file-checksum').innerHTML = `
        <span>Checksum: </span>
        <code class="tagfolder-checksum">${file.checksum.substring(0, 16)}...</code>
      `
    }

    // File type indicator
    const extension = file.path.split('.').pop()?.toLowerCase()
    if (extension) {
      const typeEl = detailsEl.createDiv('tagfolder-file-type')
      typeEl.createSpan({ text: 'Type: ' })
      typeEl.createSpan({ text: extension.toUpperCase(), cls: 'tagfolder-file-extension' })
    }
  }

  /**
   * Create resolution options section
   */
  private createResolutionOptions(containerEl: HTMLElement): void {
    const optionsEl = containerEl.createDiv('tagfolder-resolution-options')

    optionsEl.createEl('h4', { text: 'Resolution Options' })

    const strategies = this.getAvailableStrategies()

    strategies.forEach(strategy => {
      const strategyEl = optionsEl.createDiv('tagfolder-strategy-option')

      const radioEl = strategyEl.createEl('input', {
        type: 'radio',
        attr: { name: 'resolution-strategy' }
      })
      radioEl.value = strategy.value
      radioEl.id = `strategy-${strategy.value}`

      if (strategy.value === this.selectedStrategy) {
        radioEl.checked = true
      }

      this.strategyRadios.push(radioEl)

      radioEl.addEventListener('change', () => {
        if (radioEl.checked) {
          this.selectedStrategy = strategy.value as ConflictResolution['strategy']
          this.updateResolutionPreview()
        }
      })

      const labelEl = strategyEl.createEl('label', {
        attr: { for: radioEl.id }
      })

      const strategyHeader = labelEl.createDiv('tagfolder-strategy-header')
      strategyHeader.createSpan('tagfolder-strategy-title').textContent = strategy.title
      strategyHeader.createSpan('tagfolder-strategy-tag').textContent = strategy.tag

      if (strategy.description) {
        labelEl.createDiv('tagfolder-strategy-description').textContent = strategy.description
      }

      if (strategy.risk) {
        labelEl.createDiv('tagfolder-strategy-risk').textContent = `⚠️ ${strategy.risk}`
      }
    })
  }

  /**
   * Create additional options section
   */
  private createAdditionalOptions(containerEl: HTMLElement): void {
    const optionsEl = containerEl.createDiv('tagfolder-additional-options')

    // Apply to all similar conflicts
    const applyToAllSetting = new Setting(optionsEl)
      .setName('Apply to all similar conflicts')
      .setDesc('Use this resolution for all conflicts of this type in this operation')
      .addToggle(toggle => {
        toggle.setValue(this.applyToAll)
        toggle.onChange(value => {
          this.applyToAll = value
        })
      })

    // Custom file name for rename strategy
    const customNameContainer = optionsEl.createDiv('tagfolder-custom-name-container')
    customNameContainer.style.display = this.selectedStrategy === 'rename' ? 'block' : 'none'

    const customNameSetting = new Setting(customNameContainer)
      .setName('New file name')
      .setDesc('Enter a new name for the file (extension will be preserved)')
      .addText(text => {
        const targetFile = this.conflict.newFile.path
        const extension = targetFile.split('.').pop()
        const baseName = targetFile.split('/').pop()?.replace(`.${extension || ''}`, '')
        const uniqueName = generateUniqueFileName('', baseName, extension)

        text.setValue(uniqueName)
        text.inputEl.addEventListener('input', () => {
          this.newFileName = text.getValue()
          this.updateResolutionPreview()
        })
      })

    // Store container reference for showing/hiding
    (customNameContainer as any)._setting = customNameSetting
    (customNameContainer as any)._container = customNameContainer
  }

  /**
   * Create resolution preview section
   */
  private createResolutionPreview(containerEl: HTMLElement): void {
    const previewEl = containerEl.createDiv('tagfolder-resolution-preview')

    previewEl.createEl('h4', { text: 'Resolution Preview' })
    this.updateResolutionPreview()
  }

  /**
   * Update resolution preview
   */
  private updateResolutionPreview(): void {
    const previewEl = this.contentEl.querySelector('.tagfolder-resolution-preview')
    if (!previewEl) return

    const existingContent = previewEl.querySelector('div:last-child')
    if (existingContent) {
      existingContent.remove()
    }

    const previewContent = previewEl.createDiv('tagfolder-preview-content')

    switch (this.selectedStrategy) {
      case 'skip':
        previewContent.innerHTML = `
          <div class="tagfolder-preview-item">
            <span class="tagfolder-preview-icon">⏭️</span>
            <div>
              <strong>Skip operation</strong><br>
              The file will not be moved and no changes will be made.
            </div>
          </div>
        `
        break

      case 'rename':
        const newName = this.newFileName || 'renamed-file.md'
        previewContent.innerHTML = `
          <div class="tagfolder-preview-item">
            <span class="tagfolder-preview-icon">✏️</span>
            <div>
              <strong>Rename file</strong><br>
              File will be moved with a new name:<br>
              <code>${newName}</code>
            </div>
          </div>
        `
        break

      case 'replace':
        previewContent.innerHTML = `
          <div class="tagfolder-preview-item">
            <span class="tagfolder-preview-icon">🔄</span>
            <div>
              <strong>Replace existing file</strong><br>
              The existing file will be overwritten and lost.
            </div>
          </div>
        `
        break

      case 'subfolder':
        const subfolderName = new Date().toISOString().split('T')[0]
        previewContent.innerHTML = `
          <div class="tagfolder-preview-item">
            <span class="tagfolder-preview-icon">📁</span>
            <div>
              <strong>Move to subfolder</strong><br>
              File will be moved to a conflict subfolder:<br>
              <code>conflicts/${subfolderName}/</code>
            </div>
          </div>
        `
        break

      default:
        previewContent.innerHTML = `
          <div class="tagfolder-preview-item">
            <span class="tagfolder-preview-icon">❓</span>
            <div>
              <strong>Custom resolution</strong><br>
              Additional information may be required.
            </div>
          </div>
        `
    }

    // Show/hide custom name field
    const customNameContainer = this.contentEl.querySelector('.tagfolder-custom-name-container') as HTMLElement
    if (customNameContainer) {
      customNameContainer.style.display = this.selectedStrategy === 'rename' ? 'block' : 'none'
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
            tag: 'Recommended',
            risk: 'None'
          },
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cancel this file organization and keep both files',
            tag: 'Safe',
            risk: 'None'
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
            tag: 'Safe',
            risk: 'None'
          }
        )
        break

      case 'target-read-only':
        strategies.push(
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cannot modify read-only file',
            tag: 'Only option',
            risk: 'None'
          }
        )
        break

      case 'permission-denied':
        strategies.push(
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Permission denied - cannot access target',
            tag: 'Only option',
            risk: 'None'
          }
        )
        break

      case 'path-too-long':
        strategies.push(
          {
            value: 'rename',
            title: 'Shorten name',
            description: 'Use a shorter file name to fit path length limits',
            tag: 'Recommended',
            risk: 'None'
          },
          {
            value: 'skip',
            title: 'Skip operation',
            description: 'Cannot move file due to path length',
            tag: 'Safe',
            risk: 'None'
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