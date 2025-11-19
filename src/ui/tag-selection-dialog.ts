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
  private currentNotePath: string | undefined
  private dialogOptions: TagSelectionDialogOptions
  private selectedTag: string | null = null
  private tagListEl!: HTMLDivElement
  private previewEl!: HTMLDivElement
  private createFolderToggle!: HTMLInputElement
  private updateLinksToggle!: HTMLInputElement
  private createBackupToggle!: HTMLInputElement
  private confirmButton!: HTMLButtonElement

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
    this.dialogOptions = options
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
      this.selectTag(this.tagMappings[0]?.tag || '')
    } else if (this.dialogOptions.defaultTag) {
      this.selectTag(this.dialogOptions.defaultTag)
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

  protected override createHeader(): void {
    super.createHeader()

    // Add description
    const { contentEl } = this
    const descriptionEl = contentEl.createDiv('tagfolder-dialog-description')
    descriptionEl.textContent = 'Choose a tag to organize your note. The note will be moved to the corresponding folder.'
  }

  /**
   * Create file information section - COMPACT VERSION
   */
  private createFileInfo(containerEl: HTMLElement): void {
    const fileInfoEl = containerEl.createDiv('tagfolder-file-info-compact')

    const fileName = this.currentNotePath?.split('/').pop() || 'Current Note'

    // Иконка и имя файла в одну строку
    const headerRow = fileInfoEl.createDiv('tagfolder-file-header')
    headerRow.createEl('span', { cls: 'tagfolder-file-icon-compact', text: '📄' })
    headerRow.createEl('span', { text: fileName, cls: 'tagfolder-filename' })

    if (this.currentNotePath) {
      const locationRow = fileInfoEl.createDiv('tagfolder-file-location')
      locationRow.createEl('span', { text: '📍', cls: 'tagfolder-location-icon' })
      locationRow.createEl('span', {
        text: `${this.currentNotePath}`,
        cls: 'tagfolder-location-text'
      })
    }
  }

  /**
   * Create tag selection list - COMPACT VERSION
   */
  private createTagList(containerEl: HTMLElement): void {
    const tagListContainer = containerEl.createDiv('tagfolder-tag-list-container-compact')

    // Заголовок с иконкой и количеством
    const headerEl = tagListContainer.createDiv('tagfolder-list-header-compact')
    headerEl.createEl('span', { cls: 'tagfolder-list-icon', text: '🏷️' })
    headerEl.createEl('span', { text: 'Available tags', cls: 'tagfolder-list-title' })
    headerEl.createEl('span', {
      text: `${this.tagMappings.length}`,
      cls: 'tagfolder-list-count'
    })

    this.tagListEl = tagListContainer.createDiv('tagfolder-tag-list-compact')

    if (this.tagMappings.length === 0) {
      const noTagsEl = this.tagListEl.createDiv('tagfolder-no-tags-compact')
      noTagsEl.createEl('span', { cls: 'tagfolder-no-tags-icon', text: '🔍' })
      noTagsEl.createEl('span', { text: 'No tags found', cls: 'tagfolder-no-tags-text' })
    } else {
      // Сортируем по иерархии (более вложенные теги выше)
      const sortedMappings = [...this.tagMappings].sort((a, b) => {
        const aNesting = (a.tag.match(/\//g) || []).length
        const bNesting = (b.tag.match(/\//g) || []).length
        return bNesting - aNesting
      })

      sortedMappings.forEach((mapping, index) => {
        this.createTagItemCompact(mapping, index)
      })
    }
  }

  /**
   * Create compact tag item like in the screenshot
   */
  private createTagItemCompact(mapping: PathMappingResult, index: number): HTMLElement {
    const tagItemEl = this.tagListEl.createDiv('tagfolder-tag-item-compact')

    // Определяем уровень иерархии
    const nestingLevel = (mapping.tag.match(/\//g) || []).length
    const folderIcon = nestingLevel > 0 ? '📁' : '🏷️'

    // Скрытый radio button
    const radioEl = tagItemEl.createEl('input', {
      type: 'radio',
      attr: { name: 'tag-selection' }
    })
    radioEl.value = mapping.tag
    radioEl.id = `tag-${index}`
    radioEl.style.display = 'none'

    // Контейнер для клика
    const clickContainer = tagItemEl.createDiv('tagfolder-tag-click-area')

    // Радио кнопка
    const radioCircle = clickContainer.createDiv('tagfolder-radio-circle')
    const radioInner = radioCircle.createDiv('tagfolder-radio-inner')

    // Иконка папки
    clickContainer.createEl('span', {
      cls: 'tagfolder-folder-icon-compact',
      text: folderIcon
    })

    // Название тега
    clickContainer.createEl('span', {
      text: mapping.tag,
      cls: 'tagfolder-tag-name-compact'
    })

    // Стрелка и путь
    const pathContainer = clickContainer.createDiv('tagfolder-path-container')
    pathContainer.createEl('span', {
      text: '→',
      cls: 'tagfolder-arrow'
    })
    pathContainer.createEl('span', {
      text: mapping.path,
      cls: 'tagfolder-path-compact'
    })

    // Set initial selection
    if (index === 0 && !this.dialogOptions.defaultTag) {
      radioEl.checked = true
      this.selectedTag = mapping.tag
      tagItemEl.addClass('selected')
      radioCircle.addClass('selected')
    }

    if (this.dialogOptions.defaultTag && mapping.tag === this.dialogOptions.defaultTag) {
      radioEl.checked = true
      this.selectedTag = mapping.tag
      tagItemEl.addClass('selected')
      radioCircle.addClass('selected')
    }

    // Event handlers
    const handleClick = () => {
      radioEl.checked = true
      this.selectTag(mapping.tag)
      this.updateCompactSelection(tagItemEl, radioCircle)
    }

    clickContainer.addEventListener('click', handleClick)
    radioEl.addEventListener('change', () => {
      if (radioEl.checked) {
        this.updateCompactSelection(tagItemEl, radioCircle)
      }
    })

    return tagItemEl
  }

  /**
   * Update compact visual selection
   */
  private updateCompactSelection(tagItemEl: HTMLElement, radioCircle: HTMLElement): void {
    // Remove previous selection
    this.tagListEl.querySelectorAll('.tagfolder-tag-item-compact.selected').forEach(el => {
      el.removeClass('selected')
    })
    this.tagListEl.querySelectorAll('.tagfolder-radio-circle.selected').forEach(el => {
      el.removeClass('selected')
    })

    // Add selection to current item
    tagItemEl.addClass('selected')
    radioCircle.addClass('selected')
  }

  /**
   * Create individual tag item with beautiful UI (legacy)
   */
  private createTagItem(mapping: PathMappingResult, index: number): HTMLElement {
    const tagItemEl = this.tagListEl.createDiv('tagfolder-tag-item')

    // Определяем уровень иерархии для визуального отображения
    const nestingLevel = (mapping.tag.match(/\//g) || []).length
    const isNested = nestingLevel > 0
    const folderIcon = nestingLevel > 1 ? '📁' : (nestingLevel > 0 ? '📂' : '🏷️')

    // Создаем иерархический отступ
    const indent = nestingLevel * 24
    tagItemEl.style.paddingLeft = `${indent + 8}px`

    // Main container with hover effects
    const tagContentEl = tagItemEl.createDiv('tagfolder-tag-content')

    // Tag radio button (скрытый, используем кастомный дизайн)
    const radioEl = tagItemEl.createEl('input', {
      type: 'radio',
      attr: { name: 'tag-selection' }
    })
    radioEl.value = mapping.tag
    radioEl.id = `tag-${index}`
    radioEl.style.display = 'none'

    // Кастомный radio button с красивым дизайном
    const customRadioEl = tagContentEl.createDiv('tagfolder-custom-radio')
    const radioInnerEl = customRadioEl.createDiv('tagfolder-radio-inner')

    // Tag info container
    const tagInfoEl = tagContentEl.createDiv('tagfolder-tag-info')

    // Tag header with icon and name
    const tagHeaderEl = tagInfoEl.createDiv('tagfolder-tag-header')

    // Иконка папки
    tagHeaderEl.createEl('span', {
      cls: 'tagfolder-folder-icon',
      text: folderIcon
    })

    // Tag name с цветовой индикацией иерархии
    const tagNameEl = tagHeaderEl.createEl('span', {
      cls: 'tagfolder-tag-name',
      text: mapping.tag
    })

    // Добавляем цветовую метку для вложенных тегов
    if (isNested) {
      const nestedBadge = tagHeaderEl.createEl('span', {
        cls: 'tagfolder-nested-badge',
        text: 'nested'
      })
    }

    // Tag path visualization
    const tagPathEl = tagInfoEl.createDiv('tagfolder-tag-path')
    tagPathEl.createEl('span', { cls: 'tagfolder-path-arrow', text: '→' })
    tagPathEl.createEl('code', {
      text: `${mapping.path}/`,
      cls: 'tagfolder-path-display'
    })

    // Priority indicator (если есть)
    if (mapping.priority > 0) {
      const priorityEl = tagInfoEl.createDiv('tagfolder-priority')
      const stars = '⭐'.repeat(Math.min(mapping.priority, 3))
      priorityEl.createEl('span', {
        cls: 'tagfolder-priority-stars',
        text: stars
      })
    }

    // Set initial selection
    if (index === 0 && !this.dialogOptions.defaultTag) {
      radioEl.checked = true
      customRadioEl.addClass('selected')
      this.selectedTag = mapping.tag
      tagItemEl.addClass('selected')
    }

    if (this.dialogOptions.defaultTag && mapping.tag === this.dialogOptions.defaultTag) {
      radioEl.checked = true
      customRadioEl.addClass('selected')
      this.selectedTag = mapping.tag
      tagItemEl.addClass('selected')
    }

    // Event handlers
    radioEl.addEventListener('change', () => {
      if (radioEl.checked) {
        this.selectTag(mapping.tag)
        this.updateVisualSelection(tagItemEl, customRadioEl)
      }
    })

    // Click handler for the entire item (принцип Нильсена: большие области клика)
    tagContentEl.addEventListener('click', (e) => {
      e.preventDefault()
      radioEl.checked = true
      this.selectTag(mapping.tag)
      this.updateVisualSelection(tagItemEl, customRadioEl)
    })

    // Keyboard accessibility
    tagContentEl.setAttribute('tabindex', '0')
    tagContentEl.setAttribute('role', 'radio')
    tagContentEl.setAttribute('aria-checked', radioEl.checked ? 'true' : 'false')
    tagContentEl.setAttribute('aria-label', `Tag: ${mapping.tag}, Path: ${mapping.path}`)

    tagContentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        radioEl.checked = true
        this.selectTag(mapping.tag)
        this.updateVisualSelection(tagItemEl, customRadioEl)
      }
    })

    return tagItemEl
  }

  /**
   * Update visual selection state
   */
  private updateVisualSelection(tagItemEl: HTMLElement, customRadioEl: HTMLElement): void {
    // Remove previous selection
    this.tagListEl.querySelectorAll('.tagfolder-tag-item.selected').forEach(el => {
      el.removeClass('selected')
    })
    this.tagListEl.querySelectorAll('.tagfolder-custom-radio.selected').forEach(el => {
      el.removeClass('selected')
    })

    // Add selection to current item
    tagItemEl.addClass('selected')
    customRadioEl.addClass('selected')
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
        toggle.setValue(true)
        // Access toggle element through alternative method
        setTimeout(() => {
          this.createFolderToggle = createFolderSetting.settingEl.querySelector('input[type="checkbox"]') as HTMLInputElement
        }, 0)
      })

    // Update links after moving
    const updateLinksSetting = new Setting(optionsContainer)
      .setName('Update links')
      .setDesc('Update all links to this note in other files')
      .addToggle(toggle => {
        toggle.setValue(true)
        setTimeout(() => {
          this.updateLinksToggle = updateLinksSetting.settingEl.querySelector('input[type="checkbox"]') as HTMLInputElement
        }, 0)
      })

    // Create backup before operation
    const createBackupSetting = new Setting(optionsContainer)
      .setName('Create backup')
      .setDesc('Create a backup of the note before moving it')
      .addToggle(toggle => {
        toggle.setValue(true)
        setTimeout(() => {
          this.createBackupToggle = createBackupSetting.settingEl.querySelector('input[type="checkbox"]') as HTMLInputElement
        }, 0)
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

  protected override createFooter(): void {
    super.createFooter()
    this.updateConfirmButton()
  }
}