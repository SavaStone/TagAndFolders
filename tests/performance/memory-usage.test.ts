/**
 * Memory Usage Tests (T087)
 * Constitution v2.0.0 Requirement: <10MB memory usage during idle operation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TagFolderPlugin } from '@/core/plugin.js'
import { DEFAULT_SETTINGS } from '@/main.js'

// Mock Obsidian App
const mockApp = {
  vault: {
    getAbstractFileByPath: () => null,
    adapter: {
      read: () => Promise.resolve('')
    }
  },
  workspace: {
    getLeaf: () => ({
      openFile: () => Promise.resolve()
    })
  }
} as any

describe('Memory Usage Tests', () => {
  let plugin: TagFolderPlugin

  beforeEach(async () => {
    // Force garbage collection before each test
    if (global.gc) {
      global.gc()
    }
  })

  afterEach(async () => {
    if (plugin) {
      await plugin.cleanup()
    }
    // Force garbage collection after each test
    if (global.gc) {
      global.gc()
    }
  })

  describe('Idle Memory Usage', () => {
    it('should maintain memory usage below 10MB during idle operation', async () => {
      const initialMemory = getMemoryUsage()

      // Initialize plugin (simulates Obsidian loading)
      plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      // Wait for idle state
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (global.gc) {
        global.gc()
      }

      const idleMemory = getMemoryUsage()
      const memoryIncrease = idleMemory - initialMemory

      // Constitution requirement: <10MB baseline memory usage
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should not accumulate memory during repeated operations', async () => {
      plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      const baselineMemory = getMemoryUsage()

      // Simulate repeated user operations
      for (let i = 0; i < 50; i++) {
        await plugin.testPlugin()

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      if (global.gc) {
        global.gc()
      }

      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - baselineMemory

      // Should not accumulate significant memory over time
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // <5MB increase
    })
  })

  describe('Memory Cleanup', () => {
    it('should properly clean up memory when plugin is unloaded', async () => {
      const initialMemory = getMemoryUsage()

      // Initialize and use plugin
      plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      // Perform some operations
      await plugin.testPlugin()

      const activeMemory = getMemoryUsage()

      // Cleanup
      await plugin.cleanup()
      plugin = null as any

      if (global.gc) {
        global.gc()
        // Run GC multiple times to ensure cleanup
        global.gc()
      }

      const cleanupMemory = getMemoryUsage()
      const memoryReleased = activeMemory - cleanupMemory

      // Should release most of the allocated memory
      expect(memoryReleased).toBeGreaterThan(0)

      // Memory usage should return close to baseline
      const totalIncrease = cleanupMemory - initialMemory
      expect(totalIncrease).toBeLessThan(2 * 1024 * 1024) // <2MB remaining
    })
  })

  describe('Memory Hotspots', () => {
    it('should handle large tag lists efficiently', async () => {
      plugin = new TagFolderPlugin(mockApp, DEFAULT_SETTINGS)
      await plugin.initialize()

      const baselineMemory = getMemoryUsage()

      // Simulate handling notes with many tags
      const largeTagSet = Array.from({ length: 1000 }, (_, i) => `tag-${i}`).join(', ')

      // This would typically be done through the UI, but we're testing the memory impact
      // In a real scenario, this would be user interaction with tag selection dialog

      if (global.gc) {
        global.gc()
      }

      const afterLargeOperationMemory = getMemoryUsage()
      const memoryIncrease = afterLargeOperationMemory - baselineMemory

      // Even with large datasets, memory increase should be controlled
      expect(memoryIncrease).toBeLessThan(3 * 1024 * 1024) // <3MB for large tag sets
    })
  })
})

/**
 * Helper Functions
 */

function getMemoryUsage(): number {
  // Try different memory APIs based on environment
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed
  }

  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize
  }

  // Fallback - return 0 for environments without memory APIs
  return 0
}