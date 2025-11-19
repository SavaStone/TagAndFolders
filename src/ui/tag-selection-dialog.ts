/**
 * Tag Selection Dialog - Allows users to select tags for organization
 */

import { App, Setting, Notice } from 'obsidian'
import { BaseDialog, DialogResult } from './dialog.js'
import type { PathMappingResult } from '@/scanning/path-mapper.js'
import { eventEmitter } from '@/utils/events.js'
import { tagToDirectoryPath } from '@/utils/path-utils.js'

/**
 * Tag selection result
 */
export interface TagSelectionResult {
  /** Selected tag */
  selectedTag: string
  /** Target path for the selected tag */
  targetPath: string
  /** Whether user wants to create folder if it doesn't exist */
  createFolder: boolean
  /** Whether to update links after moving */
  updateLinks: boolean
  /** Whether to create backup before operation */
  createBackup: boolean
}

/**
 * Tag selection dialog options
 */
export interface TagSelectionDialogOptions {
  /** Available tags with their paths */
  tagMappings: PathMappingResult[]
  /** Currently active note path */
  currentNotePath?: string
  /** Default tag to pre-select */
  defaultTag?: string
  /** Show advanced options */
  showAdvanced?: boolean
  /** Custom title */
  title?: string
}

/**
 * Tag Selection Dialog
 */
export class TagSelectionDialog extends BaseDialog<TagSelectionResult> {
  private tagMappings: PathMappingResult[]
  private currentNotePath?: string
  private selectedTag: string | null = null
  private tagListEl: HTMLDivElement
  private previewEl: HTMLDivElement
  private createFolderToggle: HTMLInputElement
  private updateLinksToggle: HTMLInputElement
  private createBackupToggle: HTMLInputElement
  private confirmButton: HTMLButtonElement

  constructor(app: App, options: TagSelectionDialogOptions) {
    super(app, {
      title: options.title || 'Select Tag for Organization',
      width: 600,
      height: 500,
      type: 'question',
      showCancel: true,
      buttonLabels: {
        confirm: 'Organize Note',
        cancel: 'Cancel'
      }
    })

    this.tagMappings = options.tagMappings
    this.currentNotePath = options.currentNotePath
  }

  protected createContent(): void {
    const { contentEl } = this

    // Current file info
    if (this.currentNotePath) {
      this.createFileInfo(contentEl)
    }

    // Tag selection list
    this.createTagList(contentEl)

    // Preview section
    this.createPreview(contentEl)

    // Advanced options
    this.createAdvancedOptions(contentEl)

    // Initial selection
    if (this.tagMappings.length > 0) {
      this.selectTag(this.tagMappings[0].tag)
    } else if (this.options.defaultTag) {
      this.selectTag(this.options.defaultTag)
    }
  }

  protected async onConfirm(): Promise<TagSelectionResult> {
    if (!this.selectedTag) {
      throw new Error('Please select a tag to organize the note')
    }

    const selectedMapping = this.tagMappings.find(m => m.tag === this.selectedTag)
    if (!selectedMapping) {
      throw new Error('Selected tag mapping not found')
    }

    return {
      selectedTag: this.selectedTag,
      targetPath: selectedMapping.path,
      createFolder: this.createFolderToggle.checked,
      updateLinks: this.updateLinksToggle.checked,
      createBackup: this.createBackupToggle.checked
    }
  }

  protected createHeader(): void {
    super.createHeader()

    // Add description
    const { contentEl } = this
    const descriptionEl = contentEl.createDiv('tagfolder-dialog-description')
    descriptionEl.textContent = 'Choose a tag to organize your note. The note will be moved to the corresponding folder.'
  }

  /**
   * Create file information section
   */
  private createFileInfo(containerEl: HTMLElement): void {
    const fileInfoEl = containerEl.createDiv('tagfolder-file-info')

    const fileName = this.currentNotePath?.split('/').pop() || 'Current Note'
    fileInfoEl.createEl('h3', { text: 'Current File' })
    fileInfoEl.createDiv('tagfolder-file-name', { text: fileName })

    if (this.currentNotePath) {
      const currentFolderEl = fileInfoEl.createDiv('tagfolder-current-folder')
      currentFolderEl.createSpan({ text: 'Current location: ' })
      currentFolderEl.createSpan({ text: this.currentNotePath, cls: 'tagfolder-path' })
    }
  }

  /**
   * Create tag selection list
   */
  private createTagList(containerEl: HTMLElement): void {
    const tagListContainer = containerEl.createDiv('tagfolder-tag-list-container')

    tagListContainer.createEl('h3', { text: 'Available Tags' })

    this.tagListEl = tagListContainer.createDiv('tagfolder-tag-list')

    if (this.tagMappings.length === 0) {
      const noTagsEl = this.tagListEl.createDiv('tagfolder-no-tags')
      noTagsEl.textContent = 'No tags found in the current note'
      noTagsEl.addClass('tagfolder-empty-state')
    } else {
      this.tagMappings.forEach((mapping, index) => {
        this.createTagItem(mapping, index)
      })
    }
  }

  /**
   * Create individual tag item
   */
  private createTagItem(mapping: PathMappingResult, index: number): HTMLElement {
    const tagItemEl = this.tagListEl.createDiv('tagfolder-tag-item')

    // Tag radio button
    const radioEl = tagItemEl.createEl('input', {
      type: 'radio',
      attr: { name: 'tag-selection' }
    })
    radioEl.value = mapping.tag
    radioEl.id = `tag-${index}`

    if (index === 0 && !this.options.defaultTag) {
      radioEl.checked = true
      this.selectedTag = mapping.tag
    }

    if (this.options.defaultTag && mapping.tag === this.options.defaultTag) {
      radioEl.checked = true
      this.selectedTag = mapping.tag
    }

    radioEl.addEventListener('change', () => {
      if (radioEl.checked) {
        this.selectTag(mapping.tag)
      }
    })

    // Tag label
    const labelEl = tagItemEl.createEl('label', {
      attr: { for: radioEl.id }
    })
    labelEl.addClass('tagfolder-tag-label')

    // Tag name with icon
    const tagIconEl = labelEl.createSpan('tagfolder-tag-icon')
    tagIconEl.textContent = '🏷️'

    const tagNameEl = labelEl.createSpan('tagfolder-tag-name')
    tagNameEl.textContent = mapping.tag

    // Mapping type badge
    const typeBadge = labelEl.createSpan('tagfolder-mapping-badge')
    typeBadge.textContent = mapping.mappingType
    typeBadge.addClass(`tagfolder-badge-${mapping.mappingType}`)

    // Priority indicator
    const priorityEl = labelEl.createSpan('tagfolder-priority')
    priorityEl.textContent = `Priority: ${mapping.priority}`

    // Target path
    const pathEl = labelEl.createDiv('tagfolder-target-path')
    pathEl.createSpan({ text: '→ ' })
    pathEl.createSpan({ text: mapping.path, cls: 'tagfolder-path' })

    // Validation warnings
    if (mapping.warnings.length > 0) {
      const warningsEl = labelEl.createDiv('tagfolder-warnings')
      mapping.warnings.forEach(warning => {
        const warningEl = warningsEl.createDiv('tagfolder-warning')
        warningEl.textContent = `⚠️ ${warning}`
      })
    }

    return tagItemEl
  }

  /**
   * Create preview section
   */
  private createPreview(containerEl: HTMLElement): void {
    const previewContainer = containerEl.createDiv('tagfolder-preview-container')

    previewContainer.createEl('h3', { text: 'Organization Preview' })

    this.previewEl = previewContainer.createDiv('tagfolder-preview')

    this.updatePreview()
  }

  /**
   * Create advanced options section
   */
  private createAdvancedOptions(containerEl: HTMLElement): void {
    const optionsContainer = containerEl.createDiv('tagfolder-advanced-options')

    optionsContainer.createEl('h3', { text: 'Options' })

    // Create folder if it doesn't exist
    const createFolderSetting = new Setting(optionsContainer)
      .setName('Create folder')
      .setDesc('Create the target folder if it doesn\'t exist')
      .addToggle(toggle => {
        this.createFolderToggle = toggle.inputEl
        toggle.setValue(true)
      })

    // Update links after moving
    const updateLinksSetting = new Setting(optionsContainer)
      .setName('Update links')
      .setDesc('Update all links to this note in other files')
      .addToggle(toggle => {
        this.updateLinksToggle = toggle.inputEl
        toggle.setValue(true)
      })

    // Create backup before operation
    const createBackupSetting = new Setting(optionsContainer)
      .setName('Create backup')
      .setDesc('Create a backup of the note before moving it')
      .addToggle(toggle => {
        this.createBackupToggle = toggle.inputEl
        toggle.setValue(true)
      })
  }

  /**
   * Select a tag
   */
  private selectTag(tag: string): void {
    this.selectedTag = tag
    this.updatePreview()
    this.updateConfirmButton()
  }

  /**
   * Update preview display
   */
  private updatePreview(): void {
    this.previewEl.empty()

    if (!this.selectedTag) {
      const emptyPreviewEl = this.previewEl.createDiv('tagfolder-empty-preview')
      emptyPreviewEl.textContent = 'Select a tag to see the organization preview'
      return
    }

    const selectedMapping = this.tagMappings.find(m => m.tag === this.selectedTag)
    if (!selectedMapping) return

    // Organization details
    const detailsEl = this.previewEl.createDiv('tagfolder-organization-details')

    const fromToEl = detailsEl.createDiv('tagfolder-from-to')
    fromToEl.createDiv('tagfolder-from').innerHTML = `
      <span class="tagfolder-label">From:</span>
      <span class="tagfolder-path">${this.currentNotePath || 'Current location'}</span>
    `
    fromToEl.createDiv('tagfolder-to').innerHTML = `
      <span class="tagfolder-label">To:</span>
      <span class="tagfolder-path">${selectedMapping.path}</span>
    `

    // Tag information
    const tagInfoEl = detailsEl.createDiv('tagfolder-tag-info')
    tagInfoEl.innerHTML = `
      <div><strong>Tag:</strong> ${selectedMapping.tag}</div>
      <div><strong>Mapping Type:</strong> ${selectedMapping.mappingType}</div>
      <div><strong>Priority:</strong> ${selectedMapping.priority}</div>
    `

    // Validation status
    if (!selectedMapping.valid) {
      const validationEl = detailsEl.createDiv('tagfolder-validation-errors')
      validationEl.innerHTML = '<strong>⚠️ Validation Issues:</strong>'
      selectedMapping.errors.forEach(error => {
        validationEl.createDiv('tagfolder-error').textContent = error
      })
    }

    // Warnings
    if (selectedMapping.warnings.length > 0) {
      const warningsEl = detailsEl.createDiv('tagfolder-validation-warnings')
      warningsEl.innerHTML = '<strong>⚠️ Warnings:</strong>'
      selectedMapping.warnings.forEach(warning => {
        warningsEl.createDiv('tagfolder-warning').textContent = warning
      })
    }

    // Emit preview event
    eventEmitter.emit('tag-selection-changed', {
      selectedTag: this.selectedTag,
      targetPath: selectedMapping.path,
      valid: selectedMapping.valid
    })
  }

  /**
   * Update confirm button state
   */
  private updateConfirmButton(): void {
    const confirmButton = this.contentEl.querySelector('.tagfolder-dialog-confirm') as HTMLButtonElement
    if (confirmButton) {
      this.confirmButton = confirmButton

      const selectedMapping = this.tagMappings.find(m => m.tag === this.selectedTag)
      const isValid = selectedMapping?.valid !== false

      confirmButton.disabled = !isValid

      if (!isValid) {
        confirmButton.textContent = 'Cannot Organize (Invalid Selection)'
      } else {
        confirmButton.textContent = 'Organize Note'
      }
    }
  }

  protected createFooter(): void {
    super.createFooter()
    this.updateConfirmButton()
  }
}