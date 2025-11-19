/**
 * Unit Tests for Tag Scanner (T076)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TagScanner } from '@/scanning/tag-scanner.js'

// Mock the Obsidian API and dependencies
vi.mock('obsidian', () => ({
  App: vi.fn(),
  TFile: vi.fn(),
  Vault: vi.fn()
}))

// Mock the file system adapter
vi.mock('@/utils/path-utils.js', () => ({
  Platform: {
    isMac: false,
    isWin: false,
    isLinux: true
  }
}))

describe('TagScanner', () => {
  let tagScanner: TagScanner

  beforeEach(() => {
    tagScanner = new TagScanner()
  })

  describe('YAML Frontmatter Tags', () => {
    it('should extract tags from YAML frontmatter', async () => {
      // Mock the file reading since TagScanner expects file paths
      const mockContent = `---
tags: [project, active, priority-high]
author: Test User
---

# Project Note

This is a project note.`

      // We'll need to mock the vault adapter to return our test content
      const result = await tagScanner.scanFile('test-note.md')

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(3)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames).toContain('project')
      expect(tagNames).toContain('active')
      expect(tagNames).toContain('priority-high')
    })

    it('should handle YAML frontmatter with different formats', async () => {
      const content = `---
tags:
  - project
  - active
  - review-needed
status: in-progress
---

Content here`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(3)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames).toContain('project')
      expect(tagNames).toContain('active')
      expect(tagNames).toContain('review-needed')
    })

    it('should handle malformed YAML gracefully', async () => {
      const content = `---
tags: [project, active
invalid-yaml: unclosed-bracket
---

Content here`

      const result = await tagScanner.scanTags(content)

      // Should still succeed, potentially with fewer tags
      expect(result.success).toBe(true)
      expect(result.tags.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Inline Hashtag Tags', () => {
    it('should extract inline hashtags', async () => {
      const content = `# Project Documentation

This document discusses our #project management approach.

Key features:
- #scalability considerations
- #performance optimization
- #user-experience design

Use #documentation to track all related files.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags.length).toBeGreaterThan(4)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames).toContain('project')
      expect(tagNames).toContain('scalability')
      expect(tagNames).toContain('performance')
      expect(tagNames).toContain('user-experience')
      expect(tagNames).toContain('documentation')
    })

    it('should handle hashtags with special characters', async () => {
      const content = `Tags with special characters:
#tag-with-hyphens
#tag_with_underscores
#tag123
#CAPS-LOCK-TAG`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(4)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames).toContain('tag-with-hyphens')
      expect(tagNames).toContain('tag_with_underscores')
      expect(tagNames).toContain('tag123')
      expect(tagNames).toContain('CAPS-LOCK-TAG')
    })
  })

  describe('Wiki-Link Tags', () => {
    it('should extract wiki-link tags', async () => {
      const content = `# Planning Phase

Reference materials:
- [[#planning]]: Initial planning tasks
- [[#timeline|Milestone Timeline]]: Important dates
- [[#requirements]]: System requirements

See also [[cross-reference]] for related information.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames).toContain('planning')
      expect(tagNames).toContain('timeline')
      expect(tagNames).toContain('requirements')
    })

    it('should handle nested wiki-link tags', async () => {
      const content = `Nested structure:
[[#projects/web-dev/frontend]]
[[#projects/web-dev/backend]]
[[#projects/mobile/ios]]`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags.length).toBeGreaterThan(0)

      const tagNames = result.tags.map(tag => tag.name)
      expect(tagNames.some(tag => tag.includes('projects/web-dev'))).toBe(true)
    })
  })

  describe('Mixed Tag Formats', () => {
    it('should handle all tag formats in one document', async () => {
      const content = `---
tags: [project, active]
---

# Project Overview

This #project involves #web-development using #modern-stack.

## Planning
- [[#planning]]: Detailed planning phase
- [[#timeline|Project Timeline]]: Important milestones

All #tasks should be tracked properly.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags.length).toBeGreaterThan(7)

      const tagNames = result.tags.map(tag => tag.name)

      // YAML tags
      expect(tagNames).toContain('project')
      expect(tagNames).toContain('active')

      // Inline hashtags
      expect(tagNames).toContain('web-development')
      expect(tagNames).toContain('modern-stack')
      expect(tagNames).toContain('tasks')

      // Wiki-link tags
      expect(tagNames).toContain('planning')
      expect(tagNames).toContain('timeline')
    })

    it('should avoid duplicate tags from different sources', async () => {
      const content = `---
tags: [project, active]
---

This #project is #active and [[#project]] is important.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)

      // Should have unique tags
      const tagNames = result.tags.map(tag => tag.name)
      const uniqueTagNames = [...new Set(tagNames)]

      expect(tagNames).toEqual(uniqueTagNames)
      expect(tagNames).toContain('project')
      expect(tagNames).toContain('active')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      const result = await tagScanner.scanTags('')

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(0)
    })

    it('should handle content without tags', async () => {
      const content = `# Just a Regular Document

This document has no tags at all.
Just regular markdown content.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(0)
    })

    it('should handle very large content', async () => {
      // Create content larger than typical note size
      let largeContent = '# Large Document\n\n'
      for (let i = 0; i < 1000; i++) {
        largeContent += `Section ${i}: This is content with #tag${i} mentioned.\n\n`
      }

      const result = await tagScanner.scanTags(largeContent)

      expect(result.success).toBe(true)
      expect(result.tags.length).toBeGreaterThan(0)
      expect(result.tags.length).toBeLessThan(2000) // Reasonable upper bound
    })
  })

  describe('Tag Metadata', () => {
    it('should include source information for each tag', async () => {
      const content = `---
tags: [yaml-tag]
---

# Document with #inline-tag and [[#wiki-link-tag]] references.`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)
      expect(result.tags).toHaveLength(3)

      const yamlTag = result.tags.find(tag => tag.name === 'yaml-tag')
      const inlineTag = result.tags.find(tag => tag.name === 'inline-tag')
      const wikiTag = result.tags.find(tag => tag.name === 'wiki-link-tag')

      expect(yamlTag?.source).toBe('yaml')
      expect(inlineTag?.source).toBe('inline')
      expect(wikiTag?.source).toBe('wiki-link')
    })

    it('should include line numbers for tag locations', async () => {
      const content = `# Line 1: First line

Line 3: #tag-on-line-3

Line 5: Another line
Line 6: #tag-on-line-6`

      const result = await tagScanner.scanTags(content)

      expect(result.success).toBe(true)

      const tagOnLine3 = result.tags.find(tag => tag.name === 'tag-on-line-3')
      const tagOnLine6 = result.tags.find(tag => tag.name === 'tag-on-line-6')

      expect(tagOnLine3?.line).toBe(3)
      expect(tagOnLine6?.line).toBe(6)
    })
  })
})