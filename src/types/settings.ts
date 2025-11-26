/**
 * Plugin configuration - hardcoded settings for first version
 */

import type { TagPathMapping } from './entities.js'

/**
 * Simplified plugin configuration with hardcoded settings
 */
export interface PluginConfig {
  /** Tag extraction settings */
  tagExtraction: {
    /** Extract from YAML frontmatter */
    extractFromFrontmatter: boolean
    /** Extract from inline hashtags */
    extractFromHashtags: boolean
    /** Extract from inline tags */
    extractFromInlineTags: boolean
    /** Extract from wiki-link tags */
    extractFromWikiLinks: boolean
    /** Support tag hierarchies */
    supportTagHierarchies: boolean
    /** Tag prefix (default '#') */
    tagPrefix: string
  }
  /** File operation settings */
  fileOperations: {
    /** Create parent directories if they don't exist */
    createParentDirectories: boolean
    /** Preserve file timestamps when moving */
    preserveTimestamps: boolean
    /** Operation timeout in milliseconds */
    operationTimeout: number
  }
  /** Tag mappings */
  tagMappings: TagPathMapping[]
}