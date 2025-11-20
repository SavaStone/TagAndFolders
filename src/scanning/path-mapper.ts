/**
 * Path Mapper - Converts tags to folder paths with intelligent prioritization
 */

import type { TagPathMapping } from '@/types/entities.js'
import { tagToPathSegment, tagToPathSegmentPreserveSlashes, tagToDirectoryPathPreserveSlashes, normalizePath, joinPath } from '@/utils/path-utils.js'
import { validateTagMapping, validateFilePath } from '@/utils/validation.js'
import { ConfigurationError } from '@/utils/errors.js'
import { TagValidator } from '@/utils/validators.js'

/**
 * Path mapping result
 */
export interface PathMappingResult {
  /** Original tag */
  tag: string
  /** Target path */
  path: string
  /** Mapping type */
  mappingType: 'default' | 'custom' | 'hierarchical'
  /** Priority score */
  priority: number
  /** Whether the mapping is valid */
  valid: boolean
  /** Validation errors if any */
  errors: string[]
  /** Warnings if any */
  warnings: string[]
}

/**
 * Path prioritization options
 */
export interface PrioritizationOptions {
  /** Prefer more specific tags (higher depth) */
  preferSpecific: boolean
  /** Prefer custom mappings over defaults */
  preferCustom: boolean
  /** Maximum number of paths to return */
  maxPaths?: number
}

/**
 * Default prioritization settings
 */
const DEFAULT_PRIORITIZATION: PrioritizationOptions = {
  preferSpecific: true,
  preferCustom: true,
  maxPaths: 5
}

/**
 * Path Mapper Implementation
 */
export class PathMapper {
  private tagMappings: Map<string, TagPathMapping> = new Map()
  private customMappings: Map<string, TagPathMapping> = new Map()

  constructor(
    private readonly basePath: string = '',
    private readonly options: PrioritizationOptions = DEFAULT_PRIORITIZATION
  ) {}

  /**
   * Update tag mappings
   */
  updateTagMappings(mappings: TagPathMapping[]): void {
    // Clear existing mappings
    this.tagMappings.clear()
    this.customMappings.clear()

    // Add mappings to lookup maps
    for (const mapping of mappings) {
      const validation = validateTagMapping(mapping)
      if (!validation.valid) {
        console.warn(`Invalid tag mapping ignored: ${mapping.tag} -> ${mapping.path}`, validation.errors)
        continue
      }

      this.tagMappings.set(mapping.tag, mapping)

      // If this looks like a user-defined mapping (non-default), track it separately
      if (this.isCustomMapping(mapping)) {
        this.customMappings.set(mapping.tag, mapping)
      }
    }
  }

  /**
   * Get target path for a single tag
   */
  getTargetPath(tag: string): PathMappingResult {
    const normalizedTag = this.normalizeTag(tag)
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate the tag first
      const tagValidation = TagValidator.validateTag(normalizedTag)
      if (!tagValidation.valid) {
        errors.push(...tagValidation.errors)
      }

      // Try custom mapping first
      const customMapping = this.customMappings.get(normalizedTag)
      if (customMapping && customMapping.enabled) {
        const targetPath = this.buildTargetPath(customMapping.path)
        const pathValidation = validateFilePath(targetPath, { allowRelative: true })

        return {
          tag: normalizedTag,
          path: targetPath,
          mappingType: 'custom',
          priority: customMapping.priority,
          valid: tagValidation.valid && pathValidation.valid,
          errors: [
            ...errors,
            ...tagValidation.errors,
            ...pathValidation.errors.map(err => err.message)
          ],
          warnings: [
            ...tagValidation.warnings,
            ...pathValidation.warnings.map(warn => warn.message)
          ]
        }
      }

      // Try general mapping
      const generalMapping = this.tagMappings.get(normalizedTag)
      if (generalMapping && generalMapping.enabled) {
        const targetPath = this.buildTargetPath(generalMapping.path)
        const pathValidation = validateFilePath(targetPath, { allowRelative: true })

        return {
          tag: normalizedTag,
          path: targetPath,
          mappingType: 'custom',
          priority: generalMapping.priority,
          valid: tagValidation.valid && pathValidation.valid,
          errors: [
            ...errors,
            ...tagValidation.errors,
            ...pathValidation.errors.map(err => err.message)
          ],
          warnings: [
            ...tagValidation.warnings,
            ...pathValidation.warnings.map(warn => warn.message)
          ]
        }
      }

      // Default mapping: tag → tag/ (remove # and convert to path)
      const defaultPath = this.getDefaultPath(normalizedTag)
      const pathValidation = validateFilePath(defaultPath, { allowRelative: true })

      return {
        tag: normalizedTag,
        path: defaultPath,
        mappingType: 'default',
        priority: 1,
        valid: tagValidation.valid && pathValidation.valid,
        errors: [
          ...errors,
          ...tagValidation.errors,
          ...pathValidation.errors.map(err => err.message)
        ],
        warnings: [
          ...tagValidation.warnings,
          ...pathValidation.warnings.map(warn => warn.message),
          'Using default tag-to-path mapping. Consider adding a custom mapping for better organization.'
        ]
      }

    } catch (error) {
      errors.push(`Failed to map tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        tag: normalizedTag,
        path: '',
        mappingType: 'default',
        priority: 0,
        valid: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Get target paths for multiple tags with prioritization
   */
  getTargetPaths(tags: string[], options?: Partial<PrioritizationOptions>): PathMappingResult[] {
    const opts = { ...this.options, ...options }
    const results: PathMappingResult[] = []

    // Get mapping result for each tag
    for (const tag of tags) {
      const result = this.getTargetPath(tag)
      if (result.valid) {
        results.push(result)
      }
    }

    // Sort by priority and specificity
    results.sort((a, b) => {
      // Prefer custom mappings if specified
      if (opts.preferCustom) {
        if (a.mappingType === 'custom' && b.mappingType === 'default') return -1
        if (a.mappingType === 'default' && b.mappingType === 'custom') return 1
      }

      // Prefer specific tags (higher depth) if specified
      if (opts.preferSpecific) {
        const aDepth = a.tag.split('/').length
        const bDepth = b.tag.split('/').length
        if (aDepth !== bDepth) {
          return bDepth - aDepth // Higher depth first
        }
      }

      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }

      // Finally by tag name for consistency
      return a.tag.localeCompare(b.tag)
    })

    // Limit results if specified
    if (opts.maxPaths && opts.maxPaths > 0) {
      return results.slice(0, opts.maxPaths)
    }

    return results
  }

  /**
   * Get the best target path from multiple tags
   */
  getBestTargetPath(tags: string[]): PathMappingResult | null {
    const results = this.getTargetPaths(tags)
    return results.length > 0 ? results[0] ?? null : null
  }

  /**
   * Get hierarchical path options for a nested tag
   */
  getHierarchicalPaths(tag: string): PathMappingResult[] {
    const paths: PathMappingResult[] = []
    const tagParts = tag.split('/')

    // Generate path for each level of hierarchy
    for (let i = tagParts.length; i > 0; i--) {
      const partialTag = tagParts.slice(0, i).join('/')
      const result = this.getTargetPath(partialTag)

      if (result.valid) {
        paths.push({
          ...result,
          mappingType: 'hierarchical',
          priority: i * 10 // Higher priority for more specific paths
        })
      }
    }

    return paths
  }

  /**
   * Add or update a tag mapping
   */
  addTagMapping(mapping: TagPathMapping): void {
    const validation = validateTagMapping(mapping)
    if (!validation.valid) {
      throw new ConfigurationError(
        `Invalid tag mapping: ${validation.errors.join(', ')}`,
        { mapping }
      )
    }

    this.tagMappings.set(mapping.tag, mapping)

    if (this.isCustomMapping(mapping)) {
      this.customMappings.set(mapping.tag, mapping)
    }
  }

  /**
   * Remove a tag mapping
   */
  removeTagMapping(tag: string): boolean {
    const removed = this.tagMappings.delete(tag)
    this.customMappings.delete(tag)
    return removed
  }

  /**
   * Get all current tag mappings
   */
  getTagMappings(): TagPathMapping[] {
    return Array.from(this.tagMappings.values())
  }

  /**
   * Get custom tag mappings only
   */
  getCustomMappings(): TagPathMapping[] {
    return Array.from(this.customMappings.values())
  }

  /**
   * Check if a tag has a custom mapping
   */
  hasCustomMapping(tag: string): boolean {
    return this.customMappings.has(this.normalizeTag(tag))
  }

  /**
   * Validate all current tag mappings
   */
  validateAllMappings(): {
    valid: boolean
    errors: { tag: string; errors: string[] }[]
    warnings: { tag: string; warnings: string[] }[]
  } {
    const errors: { tag: string; errors: string[] }[] = []
    const warnings: { tag: string; warnings: string[] }[] = []
    let valid = true

    for (const [tag, mapping] of this.tagMappings.entries()) {
      const validation = validateTagMapping(mapping)

      if (!validation.valid) {
        errors.push({ tag, errors: validation.errors.map(err => err.message) })
        valid = false
      }

      if (validation.warnings.length > 0) {
        warnings.push({ tag, warnings: validation.warnings.map(warn => warn.message) })
      }
    }

    return { valid, errors, warnings }
  }

  /**
   * Get mapping statistics
   */
  getStatistics(): {
    totalMappings: number
    customMappings: number
    defaultMappingsUsed: number
    averagePriority: number
    mostCommonPaths: Array<{ path: string; count: number }>
  } {
    const mappings = Array.from(this.tagMappings.values())
    const pathCounts = new Map<string, number>()

    mappings.forEach(mapping => {
      const count = pathCounts.get(mapping.path) || 0
      pathCounts.set(mapping.path, count + 1)
    })

    const mostCommonPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }))

    return {
      totalMappings: mappings.length,
      customMappings: this.customMappings.size,
      defaultMappingsUsed: mappings.length - this.customMappings.size,
      averagePriority: mappings.reduce((sum, m) => sum + m.priority, 0) / mappings.length || 0,
      mostCommonPaths
    }
  }

  /**
   * Normalize tag format
   */
  private normalizeTag(tag: string): string {
    if (!tag) return tag

    // Ensure it starts with #
    if (!tag.startsWith('#')) {
      tag = `#${tag}`
    }

    // Normalize separators
    tag = tag.replace(/\\/g, '/')

    // Remove trailing slash unless it's just #
    if (tag.length > 1 && tag.endsWith('/')) {
      tag = tag.slice(0, -1)
    }

    // Trim whitespace
    return tag.trim()
  }

  /**
   * Build target path from mapping
   */
  private buildTargetPath(mappingPath: string): string {
    // Convert tag to path segment preserving slashes for directory structure
    const pathSegment = tagToPathSegmentPreserveSlashes(mappingPath)

    // Join with base path if provided
    if (this.basePath) {
      return tagToDirectoryPathPreserveSlashes(pathSegment, this.basePath)
    }

    // Always normalize to platform-specific paths at the final step
    return normalizePath(pathSegment)
  }

  /**
   * Get default path for a tag (zero-config behavior)
   */
  private getDefaultPath(tag: string): string {
    // Remove # prefix and convert to path
    const pathSegment = tagToPathSegment(tag)
    return this.buildTargetPath(pathSegment)
  }

  /**
   * Check if a mapping is user-defined (custom)
   */
  private isCustomMapping(mapping: TagPathMapping): boolean {
    // Heuristic: if priority is higher than 1 or has description, assume custom
    return mapping.priority > 1 || !!mapping.description || mapping.path !== tagToPathSegment(mapping.tag)
  }
}