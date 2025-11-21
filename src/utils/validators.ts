/**
 * Data validation utilities for TagFolder plugin
 */

import type { TagPathMapping, FileOperation } from '@/types/entities.js'
import type { PluginConfig } from '@/types/settings.js'
import { validateTag, validateFilePath } from './validation.js'

/**
 * Tag validation rules
 */
export const TagValidationRules = {
  // Tag must start with # (optional, can be enforced)
  MUST_START_WITH_HASH: false,

  // Maximum tag length
  MAX_LENGTH: 100,

  // Minimum tag length (excluding #)
  MIN_LENGTH: 1,

  // Characters not allowed in tags
  INVALID_CHARACTERS: /[\s<>:"|?*()[\]{}\0]/,

  // Characters that should be avoided
  DISCOURAGED_CHARACTERS: /[!@#$%^&*+=,;?]/,

  // Reserved words that cannot be used as tags
  RESERVED_WORDS: ['tag', 'folder', 'file', 'undefined', 'null', 'true', 'false'],

  // Maximum nesting depth for hierarchical tags
  MAX_NESTING_DEPTH: 10
}

/**
 * Path validation rules
 */
export const PathValidationRules = {
  // Maximum path length
  MAX_PATH_LENGTH: 260, // Windows limit

  // Maximum filename length
  MAX_FILENAME_LENGTH: 255,

  // Characters not allowed in paths
  INVALID_CHARACTERS: /[<>:"|?*]/,

  // Reserved names (Windows)
  RESERVED_NAMES: [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ],

  // File extensions that are considered safe
  SAFE_EXTENSIONS: [
    '.md', '.txt', '.mdx', '.markdown',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
    '.pdf', '.doc', '.docx', '.odt',
    '.txt', '.csv', '.json', '.xml', '.yaml', '.yml',
    '.mp3', '.wav', '.ogg', '.flac',
    '.mp4', '.avi', '.mov', '.mkv',
    '.zip', '.rar', '.7z', '.tar', '.gz'
  ]
}

/**
 * Tag validator with enhanced rules
 */
export class TagValidator {
  /**
   * Validate tag format
   */
  static validateTag(tag: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
    cleanTag?: string
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!tag || typeof tag !== 'string') {
      errors.push('Tag is required and must be a string')
      return { valid: false, errors, warnings }
    }

    // Clean tag (trim whitespace)
    let cleanTag = tag.trim()

    // Check minimum length
    if (cleanTag.length < TagValidationRules.MIN_LENGTH) {
      errors.push(`Tag must be at least ${TagValidationRules.MIN_LENGTH} character long`)
    }

    // Check maximum length
    if (cleanTag.length > TagValidationRules.MAX_LENGTH) {
      errors.push(`Tag cannot exceed ${TagValidationRules.MAX_LENGTH} characters`)
    }

    // Check for hash prefix
    if (!cleanTag.startsWith('#')) {
      if (TagValidationRules.MUST_START_WITH_HASH) {
        errors.push('Tag must start with #')
      } else {
        warnings.push('Tags should start with #')
        cleanTag = `#${cleanTag}`
      }
    }

    // Check for invalid characters
    if (TagValidationRules.INVALID_CHARACTERS.test(cleanTag)) {
      errors.push('Tag contains invalid characters (spaces, brackets, quotes, etc.)')
    }

    // Check for discouraged characters
    if (TagValidationRules.DISCOURAGED_CHARACTERS.test(cleanTag)) {
      warnings.push('Tag contains special characters that may cause issues')
    }

    // Check for reserved words
    const tagWithoutHash = cleanTag.substring(1).toLowerCase()
    if (TagValidationRules.RESERVED_WORDS.includes(tagWithoutHash)) {
      errors.push(`'${tagWithoutHash}' is a reserved word and cannot be used as a tag`)
    }

    // Check nesting depth for hierarchical tags
    const nestingDepth = (cleanTag.match(/\//g) || []).length
    if (nestingDepth > TagValidationRules.MAX_NESTING_DEPTH) {
      warnings.push(`Tag nesting depth (${nestingDepth}) exceeds recommended maximum (${TagValidationRules.MAX_NESTING_DEPTH})`)
    }

    // Check for consecutive separators
    if (cleanTag.includes('//')) {
      errors.push('Tag contains consecutive separators (//)')
    }

    // Check for trailing separator
    if (cleanTag.endsWith('/') && cleanTag !== '/') {
      errors.push('Tag cannot end with a separator')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      cleanTag
    }
  }

  /**
   * Validate tag hierarchy
   */
  static validateTagHierarchy(tag: string): {
    valid: boolean
    errors: string[]
    hierarchy: string[]
    depth: number
  } {
    const result = this.validateTag(tag)
    const hierarchy = tag.split('/').map(part => part.trim())
    const depth = hierarchy.length - 1

    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors,
        hierarchy,
        depth
      }
    }

    // Check each level of hierarchy
    hierarchy.forEach((level, index) => {
      if (level.length === 0) {
        result.errors.push(`Hierarchy level ${index + 1} is empty`)
      }
    })

    return {
      valid: result.errors.length === 0,
      errors: result.errors,
      hierarchy,
      depth
    }
  }

  /**
   * Extract tags from text with validation
   */
  static extractAndValidateTags(text: string): {
    valid: boolean
    tags: string[]
    invalidTags: string[]
    errors: string[]
  } {
    const tags: string[] = []
    const invalidTags: string[] = []
    const errors: string[] = []

    // Extract hashtags (#tag)
    const hashtagMatches = text.matchAll(/#[\w\-\/]+/g)
    for (const match of hashtagMatches) {
      const tag = match[0]
      const validation = this.validateTag(tag || '')

      if (validation.valid) {
        tags.push(validation.cleanTag || tag || '')
      } else {
        invalidTags.push(tag || '')
        errors.push(...validation.errors.map(error => `${tag || ''}: ${error}`))
      }
    }

    return {
      valid: invalidTags.length === 0,
      tags,
      invalidTags,
      errors
    }
  }
}

/**
 * Path validator with enhanced rules
 */
export class PathValidator {
  /**
   * Validate file path
   */
  static validatePath(
    path: string,
    options: {
      allowAbsolute?: boolean
      allowRelative?: boolean
      allowedExtensions?: string[]
      mustExist?: boolean
    } = {}
  ): {
    valid: boolean
    errors: string[]
    warnings: string[]
    sanitizedPath?: string
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!path || typeof path !== 'string') {
      errors.push('Path is required and must be a string')
      return { valid: false, errors, warnings }
    }

    let sanitizedPath = path.trim()

    // Check for dangerous patterns
    if (sanitizedPath.includes('..')) {
      errors.push('Path contains potentially dangerous parent directory references')
    }

    if (sanitizedPath.includes('~') && !sanitizedPath.startsWith('~')) {
      warnings.push('Path contains tilde (~) which may have unexpected behavior')
    }

    // Check absolute/relative path rules
    const isAbs = sanitizedPath.startsWith('/') || /^[A-Za-z]:/.test(sanitizedPath)

    if (isAbs && !options.allowAbsolute) {
      errors.push('Absolute paths are not allowed')
    }

    if (!isAbs && !options.allowRelative) {
      errors.push('Relative paths are not allowed')
    }

    // Check for invalid characters
    if (PathValidationRules.INVALID_CHARACTERS.test(sanitizedPath)) {
      errors.push('Path contains invalid characters')
    }

    // Check path length
    if (sanitizedPath.length > PathValidationRules.MAX_PATH_LENGTH) {
      errors.push(`Path exceeds maximum length (${PathValidationRules.MAX_PATH_LENGTH} characters)`)
    }

    // Check filename length
    const fileName = sanitizedPath.split(/[\/\\]/).pop() || ''
    if (fileName.length > PathValidationRules.MAX_FILENAME_LENGTH) {
      errors.push(`Filename exceeds maximum length (${PathValidationRules.MAX_FILENAME_LENGTH} characters)`)
    }

    // Check reserved names
    const baseName = fileName.split('.')[0]?.toUpperCase()
    if (baseName && PathValidationRules.RESERVED_NAMES.includes(baseName)) {
      errors.push(`'${baseName}' is a reserved name and cannot be used as a filename`)
    }

    // Check file extension
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const extension = fileName.split('.').pop()?.toLowerCase()
      if (!extension) {
        warnings.push('File has no extension')
      } else if (!options.allowedExtensions.includes(`.${extension}`)) {
        errors.push(`File extension '.${extension}' is not allowed`)
      }
    } else {
      // Check for unsafe extensions
      const extension = fileName.split('.').pop()?.toLowerCase()
      const safeExtensions = PathValidationRules.SAFE_EXTENSIONS
      if (extension && !safeExtensions.includes(`.${extension}`)) {
        warnings.push(`File extension '.${extension}' may not be supported`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedPath
    }
  }

  /**
   * Sanitize file path
   */
  static sanitizePath(path: string): string {
    return path
      .replace(/[<>:"|?*]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\/+/g, '/')
      .replace(/\\+/g, '\\')
      .trim()
  }

  /**
   * Check if path is safe
   */
  static isPathSafe(path: string): boolean {
    const validation = this.validatePath(path)
    return validation.valid && validation.warnings.length === 0
  }
}

/**
 * Configuration validator
 */
export class ConfigurationValidator {
  /**
   * Validate plugin configuration comprehensively
   */
  static validateConfig(config: PluginConfig): {
    valid: boolean
    errors: string[]
    warnings: string[]
    criticalIssues: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const criticalIssues: string[] = []

    // Validate tag mappings
    if (!Array.isArray(config.tagMappings)) {
      errors.push('Tag mappings must be an array')
    } else {
      const tagNames = new Set<string>()

      config.tagMappings.forEach((mapping, index) => {
        // Validate tag
        const tagValidation = TagValidator.validateTag(mapping.tag)
        if (!tagValidation.valid) {
          errors.push(`Tag mapping ${index + 1}: ${tagValidation.errors.join(', ')}`)
        }

        // Check for duplicate tags
        if (tagNames.has(mapping.tag)) {
          errors.push(`Duplicate tag mapping: ${mapping.tag}`)
        } else {
          tagNames.add(mapping.tag)
        }

        // Validate path
        const pathValidation = PathValidator.validatePath(mapping.path)
        if (!pathValidation.valid) {
          errors.push(`Tag mapping ${mapping.tag}: ${pathValidation.errors.join(', ')}`)
        }

        // Validate priority
        if (typeof mapping.priority !== 'number' || mapping.priority < 0) {
          errors.push(`Tag mapping ${mapping.tag}: Priority must be a non-negative number`)
        }
      })

      // Check for potential conflicts in tag mappings
      const conflicts = this.findTagMappingConflicts(config.tagMappings)
      warnings.push(...conflicts)
    }

    return {
      valid: errors.length === 0 && criticalIssues.length === 0,
      errors,
      warnings,
      criticalIssues
    }
  }

  /**
   * Find potential conflicts in tag mappings
   */
  private static findTagMappingConflicts(mappings: TagPathMapping[]): string[] {
    const conflicts: string[] = []

    // Check for overlapping paths
    const paths = mappings.map(m => m.path.toLowerCase())
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        if (paths[i] === paths[j]) {
          conflicts.push(`Multiple tags map to the same path: ${mappings[i]?.tag || 'unknown'} and ${mappings[j]?.tag || 'unknown'} both map to '${mappings[i]?.path || 'unknown'}'`)
        }

        // Check for nested paths
        if (paths[i]?.startsWith(paths[j] + '/') || paths[j]?.startsWith(paths[i] + '/')) {
          conflicts.push(`Nested paths detected: ${mappings[i]?.tag || 'unknown'} (${mappings[i]?.path || 'unknown'}) and ${mappings[j]?.tag || 'unknown'} (${mappings[j]?.path || 'unknown'})`)
        }
      }
    }

    return conflicts
  }
}

/**
 * Batch validator for multiple items
 */
export class BatchValidator {
  /**
   * Validate multiple items in parallel
   */
  static async validateBatch<T>(
    items: T[],
    validator: (item: T) => Promise<{ valid: boolean; errors: string[] }>,
    options: {
      concurrency?: number
      continueOnError?: boolean
    } = {}
  ): Promise<{
    valid: boolean
    results: Array<{ item: T; valid: boolean; errors: string[] }>
    totalErrors: number
  }> {
    const concurrency = options.concurrency || 10
    const continueOnError = options.continueOnError || true

    const results: Array<{ item: T; valid: boolean; errors: string[] }> = []
    let totalErrors = 0

    // Process items in batches
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency)

      try {
        const batchResults = await Promise.all(
          batch.map(async item => {
            const result = await validator(item)
            if (!result.valid) {
              totalErrors += result.errors.length
            }
            return { item, ...result }
          })
        )

        results.push(...batchResults)

        // Stop on first error if not continuing
        if (!continueOnError && batchResults.some(r => !r.valid)) {
          break
        }
      } catch (error) {
        console.error('Batch validation error:', error)
        if (!continueOnError) {
          break
        }
      }
    }

    return {
      valid: totalErrors === 0,
      results,
      totalErrors
    }
  }
}