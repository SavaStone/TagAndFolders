/**
 * Integration Tests for Manual Organization Workflow (T081)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the Obsidian API
const mockApp = {
  vault: {
    getAbstractFileByPath: vi.fn(),
    read: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    rename: vi.fn()
  },
  workspace: {
    getLeaf: vi.fn(() => ({
      openFile: vi.fn()
    }))
  }
} as any

// Mock Obsidian module
vi.mock('obsidian', () => ({
  App: vi.fn(),
  TFile: vi.fn(),
  Notice: vi.fn(),
  Modal: vi.fn(),
  Setting: vi.fn()
}))

describe('Manual Organization Integration Tests', () => {
  describe('Plugin Loading', () => {
    it('should be able to import core modules', async () => {
      // Test that core modules can be imported
      const { TagFolderPlugin } = await import('@/core/plugin.js')
      const { ManualOrganizer } = await import('@/manual/organizer.js')
      const { TagScanner } = await import('@/scanning/tag-scanner.js')
      const { PathMapper } = await import('@/scanning/path-mapper.js')
      const { FileMover } = await import('@/file-ops/file-mover.js')
      const { LinkUpdater } = await import('@/file-ops/link-updater.js')

      expect(TagFolderPlugin).toBeDefined()
      expect(ManualOrganizer).toBeDefined()
      expect(TagScanner).toBeDefined()
      expect(PathMapper).toBeDefined()
      expect(FileMover).toBeDefined()
      expect(LinkUpdater).toBeDefined()
    })

    it('should initialize plugin without errors', async () => {
      const { TagFolderPlugin } = await import('@/core/plugin.js')
      const { DEFAULT_SETTINGS } = await import('@/main.js')

      const plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)

      expect(plugin).toBeDefined()
      expect(plugin.isInitialized).toBe(false)

      // Initialize should not throw
      await expect(plugin.initialize()).resolves.not.toThrow()
      expect(plugin.isInitialized).toBe(true)
    })
  })

  describe('Event System', () => {
    it('should handle event emission and listening', async () => {
      const { eventEmitter } = await import('@/utils/events.js')

      let eventReceived = false
      let eventData: any = null

      // Set up listener
      eventEmitter.on('test-event', (data) => {
        eventReceived = true
        eventData = data
      })

      // Emit event
      const testData = { message: 'test data' }
      await eventEmitter.emit('test-event', testData)

      expect(eventReceived).toBe(true)
      expect(eventData).toEqual(testData)
    })
  })

  describe('Type System Validation', () => {
    it('should have consistent type definitions', async () => {
      // Import all major interfaces to ensure they're consistent
      const types = await import('@/types/entities.js')

      expect(types.TagPathMapping).toBeDefined()
      expect(types.FileOperation).toBeDefined()
      expect(types.WikiLink).toBeDefined()
      expect(types.ConflictResolution).toBeDefined()
      expect(types.UpdateResult).toBeDefined()
      expect(types.UpdateOptions).toBeDefined()
      expect(types.LinkUpdateConfig).toBeDefined()
    })
  })

  describe('Configuration Validation', () => {
    it('should validate default settings structure', async () => {
      const { DEFAULT_SETTINGS } = await import('@/main.js')

      expect(DEFAULT_SETTINGS).toBeDefined()
      expect(DEFAULT_SETTINGS.version).toBeDefined()
      expect(DEFAULT_SETTINGS.general).toBeDefined()
      expect(DEFAULT_SETTINGS.scanner).toBeDefined()
      expect(DEFAULT_SETTINGS.organizer).toBeDefined()
      expect(DEFAULT_SETTINGS.linkUpdater).toBeDefined()
      expect(DEFAULT_SETTINGS.ui).toBeDefined()
      expect(DEFAULT_SETTINGS.advanced).toBeDefined()
      expect(DEFAULT_SETTINGS.tagMappings).toBeDefined()
    })
  })

  describe('Core Functionality Integration', () => {
    it('should create and configure core components', async () => {
      const { TagFolderPlugin } = await import('@/core/plugin.js')
      const { DEFAULT_SETTINGS } = await import('@/main.js')

      const plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      // Test that the plugin can perform basic operations
      expect(plugin.isInitialized).toBe(true)

      // Test plugin metadata
      const metadata = plugin.getMetadata()
      expect(metadata.version).toBeDefined()
      expect(metadata.name).toBeDefined()
    })
  })

  describe('Constitution Compliance', () => {
    it('should enforce manual-only organization principles', async () => {
      const { TagFolderPlugin } = await import('@/core/plugin.js')
      const { DEFAULT_SETTINGS } = await import('@/main.js')

      const plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      // Verify manual organization settings
      const settings = plugin.getSettings()

      // Manual organization should be enabled
      expect(settings.organizer.requireUserConfirmation).toBe(true)

      // Automatic organization should be disabled
      expect(settings.scanner.realTimeMonitoring).toBe(false)
      expect(settings.advanced.enableScheduledOrganization).toBe(false)
    })

    it('should prioritize data integrity', async () => {
      const { DEFAULT_SETTINGS } = await import('@/main.js')

      // Verify safety settings
      expect(DEFAULT_SETTINGS.organizer.safety.enableBackups).toBe(true)
      expect(DEFAULT_SETTINGS.organizer.safety.conflictResolution).toBe('prompt')
      expect(DEFAULT_SETTINGS.linkUpdater.createBackup).toBe(true)
    })
  })
})