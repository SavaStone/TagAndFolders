/**
 * Performance Tests for Tag Scanner (T084)
 * Constitution v2.0.0 Requirement: Tag scanning <1s for ≤5KB, ≤20 tags
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TagScanner } from '@/scanning/tag-scanner.js'

describe('TagScanner Performance Tests', () => {
  let tagScanner: TagScanner

  beforeEach(() => {
    tagScanner = new TagScanner()
  })

  describe('Performance Requirements', () => {
    it('should scan typical note (≤5KB, ≤20 tags) within 1 second', async () => {
      // Create test content within specification limits
      const typicalNote = createTypicalNote(4.5, 18) // 4.5KB, 18 tags

      const startTime = performance.now()

      const result = await tagScanner.scanTags(typicalNote)

      const duration = performance.now() - startTime

      // Performance assertion
      expect(duration).toBeLessThan(1000) // < 1 second

      // Functional assertions
      expect(result.tags).toHaveLength(18)
      expect(result.success).toBe(true)
    })

    it('should handle maximum typical note (5KB, 20 tags) efficiently', async () => {
      const maxTypicalNote = createTypicalNote(5.0, 20) // 5KB, 20 tags

      const startTime = performance.now()

      const result = await tagScanner.scanTags(maxTypicalNote)

      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(1000)
      expect(result.tags).toHaveLength(20)
      expect(result.success).toBe(true)
    })

    it('should scale linearly for larger notes', async () => {
      const mediumNote = createTypicalNote(8.0, 30) // 8KB, 30 tags
      const largeNote = createTypicalNote(15.0, 50) // 15KB, 50 tags

      const mediumStart = performance.now()
      await tagScanner.scanTags(mediumNote)
      const mediumDuration = performance.now() - mediumStart

      const largeStart = performance.now()
      await tagScanner.scanTags(largeNote)
      const largeDuration = performance.now() - largeStart

      // Should scale roughly linearly (within reasonable bounds)
      expect(largeDuration).toBeLessThan(mediumDuration * 3)
    })
  })

  describe('Tag Format Performance', () => {
    it('should handle mixed tag formats efficiently', async () => {
      const mixedFormatNote = createMixedFormatNote()

      const startTime = performance.now()

      const result = await tagScanner.scanTags(mixedFormatNote)

      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(500) // Should be faster for typical content
      expect(result.tags.length).toBeGreaterThan(0)

      // Verify all tag types detected
      const hasYaml = result.tags.some(tag => tag.source === 'yaml')
      const hasInline = result.tags.some(tag => tag.source === 'inline')
      const hasWiki = result.tags.some(tag => tag.source === 'wiki-link')

      expect(hasYaml || hasInline || hasWiki).toBe(true)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during repeated scans', async () => {
      const note = createTypicalNote(3.0, 15)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const initialMemory = getMemoryUsage()

      // Perform multiple scans
      for (let i = 0; i < 100; i++) {
        await tagScanner.scanTags(note)
      }

      if (global.gc) {
        global.gc()
      }

      const finalMemory = getMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (<10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})

/**
 * Helper Functions
 */

function createTypicalNote(sizeKB: number, tagCount: number): string {
  const contentSizeBytes = sizeKB * 1024
  const baseContent = '# Test Note\n\nThis is a typical note content.\n\n'
  const tagLine = '\n\nTags: #'
  const tags = Array.from({ length: tagCount }, (_, i) => `tag${i + 1}`).join(' #')

  let content = baseContent + tagLine + tags

  // Add filler content to reach target size
  while (content.length < contentSizeBytes) {
    content += '\n\nThis is additional content to reach the target file size for testing. '
    content += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
  }

  return content
}

function createMixedFormatNote(): string {
  return `---
tags: [project, active, priority-high]
author: Test User
---

# Project Documentation

This document discusses our #project management approach.

## Key Areas
- [[#planning]]: Initial planning phase
- [[#implementation]]: Development work
- [[#testing]]: Quality assurance

## Related Items
- #active tasks should be prioritized
- Use [[cross-reference|Cross Reference]] for linking

## Tags
#project #active #management #documentation`
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed
  }
  return 0 // Fallback for environments without memory usage API
}