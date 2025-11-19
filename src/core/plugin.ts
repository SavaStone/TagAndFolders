/**
 * TagFolder Plugin Core - Main plugin implementation
 */

import { App, Plugin, Notice, WorkspaceLeaf, TFile } from 'obsidian'
import type { PluginSettings } from '@/types/settings.js'
import { ManualOrganizer } from '@/manual/organizer.js'
import { eventEmitter } from '@/utils/events.js'
import { errorHandler } from '@/utils/errors.js'

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
      console.log('Initializing TagFolder Plugin...')

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

      console.log('TagFolder Plugin initialized successfully')

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
      console.log('Cleaning up TagFolder Plugin...')

      // Clean up manual organizer
      if (this.manualOrganizer) {
        this.manualOrganizer.cleanup()
        this.manualOrganizer = null
      }

      // Remove event listeners
      this.removeEventListeners()

      // Update state
      this.state.initialized = false

      console.log('TagFolder Plugin cleaned up successfully')

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
      throw new Error('Plugin not initialized')
    }

    if (!this.state.initialized) {
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

      // This would implement the preview functionality from User Story 2
      new Notice('Organization paths preview coming soon!')

    } catch (error) {
      console.error('Failed to show organization paths:', error)
      new Notice('Failed to show organization paths')
    }
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
      console.log('Testing TagFolder Plugin functionality...')

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
      console.log('Testing tag scanning...')
      const scanResult = await this.manualOrganizer['tagScanner'].scanFile(activeFile.path)
      console.log(`Scan result: ${scanResult.success}, tags found: ${scanResult.tags.length}`)

      // Test 5: Test path mapping
      if (scanResult.tags.length > 0) {
        console.log('Testing path mapping...')
        const pathMappings = this.manualOrganizer['pathMapper'].getTargetPaths(scanResult.tags)
        console.log(`Path mappings: ${pathMappings.length}`)
      }

      console.log('Plugin test completed successfully')
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
    console.log('TagFolder Plugin command handlers initialized')
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to operation completed events
    eventEmitter.on('operation-completed', (data) => {
      console.log('Operation completed:', data)
      this.state.stats.linksUpdated += data.result.linksUpdated || 0
    })

    // Listen to organization completed events
    eventEmitter.on('organization-completed', (data) => {
      console.log('Organization completed:', data)
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