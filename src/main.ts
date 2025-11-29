/**
 * Tag and Folders Plugin for Obsidian
 *
 * A manual-only file organization plugin that helps users organize their notes
 * into folders based on tags with complete user control and link preservation.
 */

import { App, Plugin, Notice } from 'obsidian'
import type { PluginConfig } from '@/types/settings.js'
import { TagAndFoldersPlugin } from '@/core/plugin.js'

/**
 * Hardcoded plugin configuration for first version
 */
const PLUGIN_CONFIG: PluginConfig = {
  tagExtraction: {
    extractFromFrontmatter: true,
    extractFromHashtags: true,
    extractFromInlineTags: true,
    extractFromWikiLinks: true,
    supportTagHierarchies: true,
    tagPrefix: '#'
  },
  fileOperations: {
    createParentDirectories: true,
    preserveTimestamps: true,
    operationTimeout: 30000 // 30 seconds
  },
  tagMappings: []
}

export default class TagAndFoldersPluginWrapper extends Plugin {
  private pluginInstance: TagAndFoldersPlugin | null = null

  override async onload() {
    console.log('Loading Tag and Folders Plugin...')

    try {
      // Create plugin instance with hardcoded configuration
      this.pluginInstance = new TagAndFoldersPlugin(this.app, PLUGIN_CONFIG)

      // Initialize the plugin
      await this.pluginInstance.initialize()

      // Register commands
      this.addCommands()

      console.log('Tag and Folders Plugin loaded successfully')

    } catch (error) {
      console.error('Failed to load Tag and Folders Plugin:', error)
      new Notice('Failed to load Tag and Folders Plugin. Check console for details.')
    }
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
      name: 'Test Tag and Folders Plugin',
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

    console.log('Tag and Folders Plugin commands registered')
  }

  override async onunload() {
    console.log('Unloading Tag and Folders Plugin...')

    try {
      if (this.pluginInstance) {
        await this.pluginInstance.cleanup()
        this.pluginInstance = null
      }

      console.log('Tag and Folders Plugin unloaded successfully')
    } catch (error) {
      console.error('Error unloading Tag and Folders Plugin:', error)
    }
  }

  /**
   * Get the plugin instance
   */
  getPluginInstance(): TagAndFoldersPlugin | null {
    return this.pluginInstance
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(): PluginConfig {
    return PLUGIN_CONFIG
  }
}

