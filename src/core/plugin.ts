/**
 * TagFolder Plugin Core - Main plugin implementation
 */

import { App, Plugin, Notice, WorkspaceLeaf, TFile, Modal } from 'obsidian'
import type { PluginSettings } from '@/types/settings.js'
import { ManualOrganizer } from '@/manual/organizer.js'
import { eventEmitter } from '@/utils/events.js'
import { errorHandler } from '@/utils/errors.js'
import { tagToDisplayPath } from '@/utils/path-utils.js'

/**
 * Plugin state
 */
export interface PluginState {
  /** Whether plugin is initialized */
  initialized: boolean
  /** Plugin version */
  version: string
  /** Last error if any */
  lastError?: Error
  /** Statistics */
  stats: {
    operationsCompleted: number
    filesOrganized: number
    linksUpdated: number
    lastOperationTime?: Date
  }
}

/**
 * Main TagFolder Plugin Implementation
 */
export class TagFolderPlugin {
  private manualOrganizer: ManualOrganizer | null = null
  private state: PluginState = {
    initialized: false,
    version: '1.0.0',
    stats: {
      operationsCompleted: 0,
      filesOrganized: 0,
      linksUpdated: 0
    }
  }

  constructor(
    private app: App,
    private settings: PluginSettings
  ) {}

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    try {
      // Initialize event listeners
      this.setupEventListeners()

      // Initialize manual organizer
      this.manualOrganizer = new ManualOrganizer(this.app, this.settings)

      // Register commands
      this.registerCommands()

      // Update state
      this.state.initialized = true

      // Emit plugin loaded event
      eventEmitter.emit('plugin-loaded', { version: this.state.version })

    } catch (error) {
      this.state.lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error('Failed to initialize TagFolder Plugin:', error)
      errorHandler.handleError(this.state.lastError, { operation: 'initialize' })
      throw this.state.lastError
    }
  }

  /**
   * Clean up plugin resources
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up manual organizer
      if (this.manualOrganizer) {
        this.manualOrganizer.cleanup()
        this.manualOrganizer = null
      }

      // Remove event listeners
      this.removeEventListeners()

      // Update state
      this.state.initialized = false

    } catch (error) {
      console.error('Error during TagFolder Plugin cleanup:', error)
      throw error
    }
  }

  /**
   * Update plugin settings
   */
  async onSettingsChanged(newSettings: PluginSettings): Promise<void> {
    try {
      this.settings = newSettings

      // Update manual organizer settings
      if (this.manualOrganizer) {
        this.manualOrganizer.updateSettings(newSettings)
      }

      // Emit settings changed event
      eventEmitter.emit('settings-changed', {
        key: 'plugin-settings',
        oldValue: this.settings,
        newValue: newSettings
      })

    } catch (error) {
      console.error('Failed to update plugin settings:', error)
      throw error
    }
  }

  /**
   * Organize current note manually
   */
  async organizeCurrentNote(): Promise<void> {
    if (!this.manualOrganizer) {
      console.error('Plugin not initialized - no manualOrganizer')
      throw new Error('Plugin not initialized')
    }

    if (!this.state.initialized) {
      console.error('Plugin initialization incomplete')
      throw new Error('Plugin initialization incomplete')
    }

    try {
      // Check if there's an active file
      const activeFile = this.app.workspace.getActiveFile()
      if (!activeFile) {
        new Notice('No active file to organize')
        return
      }

      // Show organization in progress
      new Notice('Starting manual organization...')

      const result = await this.manualOrganizer.organizeCurrentNote()

      if (result.success) {
        // Update statistics
        this.state.stats.operationsCompleted++
        this.state.stats.filesOrganized++
        this.state.stats.lastOperationTime = new Date()

        new Notice(`Successfully organized "${activeFile.basename}"`)

        // Open the newly organized file
        await this.openFile(result.targetPath)

      } else if (!result.cancelled) {
        throw new Error(result.error || 'Organization failed')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Manual organization failed:', error)
      new Notice(`Organization failed: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Show organization paths preview
   */
  async showOrganizationPaths(): Promise<void> {
    if (!this.manualOrganizer) {
      throw new Error('Plugin not initialized')
    }

    try {
      // Check if there's an active file
      const activeFile = this.app.workspace.getActiveFile()
      if (!activeFile) {
        new Notice('No active file to preview')
        return
      }

      // Get organization paths preview
      const paths = await this.manualOrganizer.getOrganizationPathsPreview(activeFile)

      if (paths.length === 0) {
        // Show no tags notification
        this.showNoTagsNotification(activeFile)
        return
      }

      // Show organization paths notification
      this.showOrganizationPathsNotification(activeFile, paths)

    } catch (error) {
      console.error('Failed to show organization paths:', error)
      new Notice(`Failed to show organization paths: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Show no tags notification (not modal dialog)
   */
  private showNoTagsNotification(file: TFile): void {
    const message = `No tags found in "${file.basename}". Add tags in YAML frontmatter or use #hashtags.`
    new Notice(message, 8000) // Show for 8 seconds
  }

  /**
   * Show organization paths notification (not modal dialog)
   */
  private showOrganizationPathsNotification(file: TFile, paths: Array<{tag: string, path: string}>): void {
    const pathsText = paths
      .map(({tag}) => `• ${tagToDisplayPath(tag)}/`)
      .join('\n')

    const message = `You can move "${file.basename}" to:\n\n${pathsText}`
    new Notice(message, 10000) // Show for 10 seconds
  }

  /**
   * Show no tags dialog (legacy - not used)
   */
  private showNoTagsDialog(file: TFile): void {
    class NoTagsModal extends Modal {
      constructor(app: App, private file: TFile) {
        super(app)
      }

      override onOpen() {
        const { contentEl } = this

        // Добавляем стиль для модального окна
        contentEl.addClass('tagfolder-modal')
        contentEl.empty()

        // Заголовок с иконкой
        const headerEl = contentEl.createDiv('tagfolder-modal-header')
        headerEl.createEl('span', { cls: 'tagfolder-icon tagfolder-icon-warning', text: '⚠️' })
        headerEl.createEl('h2', { text: 'No Tags Found', cls: 'tagfolder-modal-title' })

        // Основной контент
        const bodyEl = contentEl.createDiv('tagfolder-modal-body')

        const message = bodyEl.createDiv('tagfolder-message')
        message.createEl('p', {
          text: `This note "${this.file.basename}" doesn\'t contain any tags for organization.`,
          cls: 'tagfolder-description'
        })

        // Инструкция по добавлению тегов
        const howToEl = bodyEl.createDiv('tagfolder-how-to')
        howToEl.createEl('h3', { text: '📝 How to Add Tags', cls: 'tagfolder-section-title' })

        const examplesEl = howToEl.createDiv('tagfolder-examples')

        const yamlExample = examplesEl.createDiv('tagfolder-example')
        yamlExample.createEl('h4', { text: 'YAML Frontmatter:', cls: 'tagfolder-example-title' })
        yamlExample.createEl('pre', {
          text: '---\ntags:\n  - project\n  - active\n---',
          cls: 'tagfolder-code-block'
        })

        const inlineExample = examplesEl.createDiv('tagfolder-example')
        inlineExample.createEl('h4', { text: 'Inline Tags:', cls: 'tagfolder-example-title' })
        inlineExample.createEl('p', {
          text: 'Just type #project #active anywhere in your note',
          cls: 'tagfolder-example-text'
        })

        // Кнопки
        const buttonsEl = contentEl.createDiv('tagfolder-modal-footer')
        const closeButton = buttonsEl.createEl('button', {
          text: 'Got it!',
          cls: 'tagfolder-button tagfolder-button-primary'
        })
        closeButton.onclick = () => this.close()
      }

      override onClose() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.removeClass('tagfolder-modal')
      }
    }

    new NoTagsModal(this.app, file).open()
  }

  /**
   * Show organization paths dialog
   */
  private showOrganizationPathsDialog(file: TFile, paths: Array<{tag: string, path: string}>): void {
    class PathsModal extends Modal {
      constructor(app: App, private file: TFile, private paths: Array<{tag: string, path: string}>) {
        super(app)
      }

      override onOpen() {
        const { contentEl } = this

        // Добавляем стиль для модального окна
        contentEl.addClass('tagfolder-modal')
        contentEl.empty()

        // Заголовок с иконкой
        const headerEl = contentEl.createDiv('tagfolder-modal-header')
        headerEl.createEl('span', { cls: 'tagfolder-icon tagfolder-icon-preview', text: '👁️' })
        headerEl.createEl('h2', { text: 'Organization Paths Preview', cls: 'tagfolder-modal-title' })

        // Основной контент
        const bodyEl = contentEl.createDiv('tagfolder-modal-body')

        const message = bodyEl.createDiv('tagfolder-message')
        message.createEl('p', {
          text: `You can move "${this.file.basename}" to the following paths:`,
          cls: 'tagfolder-description'
        })

        // Список путей с иерархией
        const pathsEl = bodyEl.createDiv('tagfolder-paths-list')

        this.paths.forEach(({tag, path}, index) => {
          const pathItem = pathsEl.createDiv('tagfolder-path-item')

          // Определяем уровень иерархии
          const nestingLevel = (tag.match(/\//g) || []).length
          const icon = nestingLevel > 0 ? '📁' : '📂'

          // Создаем визуальную иерархию
          const indent = nestingLevel * 20
          pathItem.style.paddingLeft = `${indent + 10}px`

          // Тег с иконкой
          const tagEl = pathItem.createDiv('tagfolder-tag')
          tagEl.createEl('span', { cls: 'tagfolder-tag-icon', text: icon })
          tagEl.createEl('span', { cls: 'tagfolder-tag-name', text: tag })

          // Путь со стрелкой
          const pathEl = pathItem.createDiv('tagfolder-path')
          pathEl.createEl('span', { cls: 'tagfolder-path-arrow', text: '→' })
          pathEl.createEl('code', {
            text: `${path}/`,
            cls: 'tagfolder-path-code'
          })
        })

        // Примечание
        const noteEl = bodyEl.createDiv('tagfolder-note')
        noteEl.createEl('p', {
          text: '💡 This is a preview only. No files will be moved.',
          cls: 'tagfolder-note-text'
        })

        // Кнопки
        const buttonsEl = contentEl.createDiv('tagfolder-modal-footer')
        const closeButton = buttonsEl.createEl('button', {
          text: 'Close',
          cls: 'tagfolder-button tagfolder-button-secondary'
        })
        closeButton.onclick = () => this.close()
      }

      override onClose() {
        const { contentEl } = this
        contentEl.empty()
        contentEl.removeClass('tagfolder-modal')
      }
    }

    new PathsModal(this.app, file, paths).open()
  }

  /**
   * Get plugin state
   */
  getState(): PluginState {
    return { ...this.state }
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): any {
    if (!this.manualOrganizer) {
      return this.state.stats
    }

    return {
      ...this.state.stats,
      ...this.manualOrganizer.getStatistics()
    }
  }

  /**
   * Test plugin functionality
   */
  async testPlugin(): Promise<boolean> {
    try {
      // Test 1: Check initialization
      if (!this.state.initialized) {
        throw new Error('Plugin not initialized')
      }

      // Test 2: Check manual organizer
      if (!this.manualOrganizer) {
        throw new Error('Manual organizer not initialized')
      }

      // Test 3: Check for active file
      const activeFile = this.app.workspace.getActiveFile()
      if (!activeFile) {
        console.warn('No active file for testing')
        return true
      }

      // Test 4: Test tag scanning
      const scanResult = await this.manualOrganizer['tagScanner'].scanFile(activeFile.path)

      // Test 5: Test path mapping
      if (scanResult.tags.length > 0) {
        const pathMappings = this.manualOrganizer['pathMapper'].getTargetPaths(scanResult.tags)
      }

      return true

    } catch (error) {
      console.error('Plugin test failed:', error)
      new Notice('Plugin test failed - check console for details')
      return false
    }
  }

  /**
   * Register plugin commands (handled by main Plugin class)
   */
  private registerCommands(): void {
    // Commands are registered in the main Plugin class (TagFolderPluginWrapper)
    // This method exists for future command handling but doesn't directly register with workspace
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to operation completed events
    eventEmitter.on('operation-completed', (data) => {
      this.state.stats.linksUpdated += data.result.linksUpdated || 0
    })

    // Listen to organization completed events
    eventEmitter.on('organization-completed', (data) => {
      this.state.stats.operationsCompleted++
      this.state.stats.filesOrganized += data.result.operations.length
    })

    // Listen to error events
    eventEmitter.on('error-occurred', (data) => {
      console.error('Plugin error:', data.error)
      this.state.lastError = data.error
    })

    // Listen to workspace events if needed
    this.registerWorkspaceEvents()
  }

  /**
   * Register workspace events
   */
  private registerWorkspaceEvents(): void {
    // Listen to file changes if needed
    this.app.vault.on('modify', (file) => {
      // Could be used for automatic features, but our plugin is manual-only
    })

    // Listen to active leaf changes
    this.app.workspace.on('active-leaf-change', (leaf) => {
      // Could update UI based on active file
    })
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Remove event listeners
    eventEmitter.removeAllListeners()
  }

  /**
   * Open file in workspace
   */
  private async openFile(filePath: string): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (file instanceof TFile) {
        const leaf = this.app.workspace.getLeaf()
        await leaf.openFile(file)
      }
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  /**
   * Get plugin version
   */
  getVersion(): string {
    return this.state.version
  }

  /**
   * Check if plugin is ready
   */
  isReady(): boolean {
    return this.state.initialized && !!this.manualOrganizer
  }

  /**
   * Get manual organizer instance
   */
  getManualOrganizer(): ManualOrganizer | null {
    return this.manualOrganizer
  }
}