/**
 * TagFolder Plugin for Obsidian
 *
 * A manual-only file organization plugin that helps users organize their notes
 * into folders based on tags with complete user control and link preservation.
 */

import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian'
import type { PluginSettings } from '@/types/settings.js'
import { TagFolderPlugin } from '@/core/plugin.js'

const DEFAULT_SETTINGS: PluginSettings = {
  version: '1.0.0',
  general: {
    defaultConflictResolution: 'prompt',
    enableNotifications: true,
    logLevel: 'info',
    language: 'en',
    debugMode: false
  },
  scanner: {
    exclusions: ['.git/', '.obsidian/', 'node_modules/'],
    includeFileTypes: ['.md', '.txt'],
    excludeFileTypes: [],
    minFileSize: 0,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    includeHidden: false,
    scanModifiedOnly: false,
    tagExtraction: {
      extractFromFrontmatter: true,
      extractFromInlineTags: true,
      extractFromWikiLinks: true,
      extractFromHashtags: true,
      supportTagHierarchies: true,
      tagPrefix: '#'
    },
    batchSettings: {
      enabled: true,
      batchSize: 100,
      maxConcurrency: 4
    }
  },
  organizer: {
    operationTimeout: 30000,
    createParentDirectories: true,
    preserveTimestamps: true,
    conflictResolution: {
      defaultStrategy: 'prompt',
      promptForConflicts: true,
      autoResolveSimilar: false,
      conflictNamingPattern: '{name} ({conflict})'
    },
    safety: {
      enableBackups: true,
      backupLocation: '',
      backupRetentionDays: 7,
      requireConfirmationForBatch: true,
      maxBatchSize: 50
    },
    performance: {
      maxConcurrentOperations: 5,
      throttleInterval: 100,
      progressUpdateInterval: 10
    }
  },
  linkUpdater: {
    linkTypes: ['wiki-link', 'wiki-link-alias', 'wiki-link-heading', 'wiki-link-block', 'markdown-link'],
    updateSettings: {
      createBackups: true,
      updateEmbeddedFiles: true,
      updateAliases: true,
      normalizePaths: true,
      preserveWhitespace: true
    },
    validation: {
      validateAfterUpdate: true,
      reportBrokenLinks: true,
      autoFixBrokenLinks: false,
      checkForCircularReferences: true
    },
    performance: {
      batchSize: 100,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      skipLargeFiles: true
    }
  },
  ui: {
    display: {
      showProgressNotifications: true,
      showStatisticsInStatus: false,
      showPreviewBeforeExecution: true,
      compactMode: false
    },
    statusBar: {
      showTagCount: false,
      showOperationCount: false,
      showLastOperation: false,
      refreshInterval: 5000
    },
    colors: {
      highlightConflicts: '#ff6b6b',
      highlightSuccess: '#51cf66',
      highlightWarning: '#ffd43b',
      highlightError: '#ff6b6b'
    },
    shortcuts: {
      'organize-current': 'Ctrl+Shift+O',
      'show-paths': 'Ctrl+Shift+P'
    }
  },
  advanced: {
    debug: {
      enableDebugLogging: false,
      logToFile: false,
      logFilePath: '',
      includeStackTrace: true
    },
    performance: {
      enableProfiling: false,
      profileOutputPath: '',
      memoryMonitoring: false,
      operationTiming: false
    },
    experimental: {
      enableExperimentalFeatures: false,
      features: {}
    },
    api: {
      enableExternalAPI: false,
      allowedOrigins: [],
      rateLimiting: {
        enabled: false,
        maxRequests: 100,
        windowMs: 60000
      }
    }
  },
  tagMappings: []
}

export default class TagFolderPluginWrapper extends Plugin {
  private pluginInstance: TagFolderPlugin | null = null
  settings: PluginSettings = DEFAULT_SETTINGS

  override async onload() {
    console.log('Loading TagFolder Plugin...')

    // Load settings
    await this.loadSettings()

    try {
      // Create plugin instance
      this.pluginInstance = new TagFolderPlugin(this.app, this.settings)

      // Initialize the plugin
      await this.pluginInstance.initialize()

      // Register commands
      this.addCommands()

      console.log('TagFolder Plugin loaded successfully')

    } catch (error) {
      console.error('Failed to load TagFolder Plugin:', error)
      new Notice('Failed to load TagFolder Plugin. Check console for details.')
    }

    // Add settings tab
    this.addSettingTab(new TagFolderSettingTab(this.app, this))
  }

  /**
   * Register plugin commands
   */
  private addCommands() {
    // Command: Organize current note
    this.addCommand({
      id: 'organize-current-note',
      name: 'Organize Current Note',
      callback: async () => {
        try {
          await this.pluginInstance?.organizeCurrentNote()
        } catch (error) {
          console.error('Command failed:', error)
          new Notice('Failed to organize current note')
        }
      }
    })

    // Command: Show organization paths preview
    this.addCommand({
      id: 'show-organization-paths',
      name: 'Show Organization Paths',
      callback: async () => {
        try {
          await this.pluginInstance?.showOrganizationPaths()
        } catch (error) {
          console.error('Command failed:', error)
          new Notice('Failed to show organization paths')
        }
      }
    })

    // Command: Test plugin
    this.addCommand({
      id: 'test-plugin',
      name: 'Test TagFolder Plugin',
      callback: async () => {
        try {
          const success = await this.pluginInstance?.testPlugin()
          if (success) {
            new Notice('Plugin test passed')
          }
        } catch (error) {
          console.error('Test failed:', error)
          new Notice('Plugin test failed')
        }
      }
    })

    console.log('TagFolder Plugin commands registered')
  }

  override async onunload() {
    console.log('Unloading TagFolder Plugin...')

    try {
      if (this.pluginInstance) {
        await this.pluginInstance.cleanup()
        this.pluginInstance = null
      }

      console.log('TagFolder Plugin unloaded successfully')
    } catch (error) {
      console.error('Error unloading TagFolder Plugin:', error)
    }
  }

  async loadSettings() {
    try {
      const savedSettings = await this.loadData()
      if (savedSettings) {
        // Merge with defaults to ensure all properties exist
        this.settings = this.mergeSettings(DEFAULT_SETTINGS, savedSettings)
      } else {
        this.settings = { ...DEFAULT_SETTINGS }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.settings = { ...DEFAULT_SETTINGS }
      new Notice('Failed to load settings. Using defaults.')
    }
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings)
    } catch (error) {
      console.error('Failed to save settings:', error)
      new Notice('Failed to save settings.')
    }
  }

  private mergeSettings(defaults: PluginSettings, saved: any): PluginSettings {
    const merged = { ...defaults }

    // Recursively merge nested objects
    for (const key in saved) {
      if (key in merged) {
        const defaultValue = (merged as any)[key]
        const savedValue = saved[key]

        if (typeof defaultValue === 'object' && !Array.isArray(defaultValue) && defaultValue !== null) {
          (merged as any)[key] = this.mergeSettings(defaultValue, savedValue)
        } else {
          (merged as any)[key] = savedValue
        }
      }
    }

    return merged
  }

  /**
   * Get the plugin instance
   */
  getPluginInstance(): TagFolderPlugin | null {
    return this.pluginInstance
  }

  /**
   * Get current settings
   */
  getSettings(): PluginSettings {
    return this.settings
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<PluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings }
    await this.saveSettings()

    // Notify plugin instance of settings change
    if (this.pluginInstance) {
      await this.pluginInstance.onSettingsChanged(this.settings)
    }
  }
}

class TagFolderSettingTab extends PluginSettingTab {
  plugin: TagFolderPluginWrapper

  constructor(app: App, plugin: TagFolderPluginWrapper) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'TagFolder Plugin Settings' })

    // General settings
    containerEl.createEl('h3', { text: 'General' })

    new Setting(containerEl)
      .setName('Enable notifications')
      .setDesc('Show notifications for plugin operations')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.general.enableNotifications)
        .onChange(async (value) => {
          this.plugin.settings.general.enableNotifications = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Log level')
      .setDesc('Verbosity of logging output')
      .addDropdown(dropdown => dropdown
        .addOption('error', 'Error')
        .addOption('warn', 'Warning')
        .addOption('info', 'Info')
        .addOption('debug', 'Debug')
        .setValue(this.plugin.settings.general.logLevel)
        .onChange(async (value) => {
          this.plugin.settings.general.logLevel = value as any
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Default conflict resolution')
      .setDesc('How to handle file conflicts by default')
      .addDropdown(dropdown => dropdown
        .addOption('prompt', 'Always Ask')
        .addOption('skip', 'Skip')
        .addOption('rename', 'Rename')
        .addOption('replace', 'Replace')
        .setValue(this.plugin.settings.general.defaultConflictResolution)
        .onChange(async (value) => {
          this.plugin.settings.general.defaultConflictResolution = value as any
          await this.plugin.saveSettings()
        }))

    // Scanner settings
    containerEl.createEl('h3', { text: 'Tag Scanner' })

    new Setting(containerEl)
      .setName('Extract from YAML frontmatter')
      .setDesc('Extract tags from YAML frontmatter')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.scanner.tagExtraction.extractFromFrontmatter)
        .onChange(async (value) => {
          this.plugin.settings.scanner.tagExtraction.extractFromFrontmatter = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Extract inline hashtags')
      .setDesc('Extract inline hashtag tags (#tag)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.scanner.tagExtraction.extractFromHashtags)
        .onChange(async (value) => {
          this.plugin.settings.scanner.tagExtraction.extractFromHashtags = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Extract wiki-link tags')
      .setDesc('Extract tags from wiki-links ([[#tag]])')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.scanner.tagExtraction.extractFromWikiLinks)
        .onChange(async (value) => {
          this.plugin.settings.scanner.tagExtraction.extractFromWikiLinks = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Support tag hierarchies')
      .setDesc('Support nested tags like #parent/child')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.scanner.tagExtraction.supportTagHierarchies)
        .onChange(async (value) => {
          this.plugin.settings.scanner.tagExtraction.supportTagHierarchies = value
          await this.plugin.saveSettings()
        }))

    // Organization settings
    containerEl.createEl('h3', { text: 'File Organization' })

    new Setting(containerEl)
      .setName('Create parent directories')
      .setDesc('Automatically create parent directories if they don\'t exist')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.organizer.createParentDirectories)
        .onChange(async (value) => {
          this.plugin.settings.organizer.createParentDirectories = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Preserve timestamps')
      .setDesc('Keep original file modification times when moving files')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.organizer.preserveTimestamps)
        .onChange(async (value) => {
          this.plugin.settings.organizer.preserveTimestamps = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Enable backups')
      .setDesc('Create backup copies before major operations')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.organizer.safety.enableBackups)
        .onChange(async (value) => {
          this.plugin.settings.organizer.safety.enableBackups = value
          await this.plugin.saveSettings()
        }))

    // Link update settings
    containerEl.createEl('h3', { text: 'Link Updates' })

    new Setting(containerEl)
      .setName('Update wiki-links')
      .setDesc('Update [[file]] links when files are moved')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.linkUpdater.linkTypes.includes('wiki-link'))
        .onChange(async (value) => {
          if (value) {
            this.plugin.settings.linkUpdater.linkTypes.push('wiki-link')
          } else {
            const index = this.plugin.settings.linkUpdater.linkTypes.indexOf('wiki-link')
            if (index > -1) {
              this.plugin.settings.linkUpdater.linkTypes.splice(index, 1)
            }
          }
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Update markdown links')
      .setDesc('Update [text](path) links when files are moved')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.linkUpdater.linkTypes.includes('markdown-link'))
        .onChange(async (value) => {
          if (value) {
            this.plugin.settings.linkUpdater.linkTypes.push('markdown-link')
          } else {
            const index = this.plugin.settings.linkUpdater.linkTypes.indexOf('markdown-link')
            if (index > -1) {
              this.plugin.settings.linkUpdater.linkTypes.splice(index, 1)
            }
          }
          await this.plugin.saveSettings()
        }))

    // UI settings
    containerEl.createEl('h3', { text: 'User Interface' })

    new Setting(containerEl)
      .setName('Show progress notifications')
      .setDesc('Show progress notifications during operations')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.ui.display.showProgressNotifications)
        .onChange(async (value) => {
          this.plugin.settings.ui.display.showProgressNotifications = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Show preview before execution')
      .setDesc('Show preview dialog before executing file operations')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.ui.display.showPreviewBeforeExecution)
        .onChange(async (value) => {
          this.plugin.settings.ui.display.showPreviewBeforeExecution = value
          await this.plugin.saveSettings()
        }))

    // Reset button
    containerEl.createEl('div', { cls: 'setting-item' })

    const resetContainer = containerEl.createEl('div', { cls: 'setting-item-control' })

    const resetButton = resetContainer.createEl('button', {
      text: 'Reset to Defaults',
      cls: 'mod-cta'
    })

    resetButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        this.plugin.settings = { ...DEFAULT_SETTINGS }
        await this.plugin.saveSettings()
        this.display()
        new Notice('Settings reset to defaults')
      }
    })
  }
}