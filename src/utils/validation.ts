/**
 * Validation utilities for TagFolder plugin
 */

import type { TagPathMapping, FileOperation } from '@/types/entities.js'
import type { PluginConfig } from '@/types/settings.js'

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: 'required' | 'format' | 'range' | 'logic' | 'security'
  /** Error message */
  message: string
  /** Path to error in data structure */
  path?: string
  /** Invalid value */
  value?: any
  /** Expected value/type */
  expected?: any
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'deprecated' | 'performance' | 'recommendation'
  /** Warning message */
  message: string
  /** Path to warning in data structure */
  path?: string
  /** Current value */
  value?: any
}

/**
 * Validate tag path mapping
 */
export function validateTagMapping(mapping: TagPathMapping): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate tag
  if (!mapping.tag || typeof mapping.tag !== 'string') {
    errors.push({
      type: 'required',
      message: 'Tag is required and must be a string',
      path: 'tag',
      value: mapping.tag
    })
  } else if (!mapping.tag.startsWith('#')) {
    warnings.push({
      type: 'recommendation',
      message: 'Tags should start with #',
      path: 'tag',
      value: mapping.tag
    })
  }

  // Validate path
  if (!mapping.path || typeof mapping.path !== 'string') {
    errors.push({
      type: 'required',
      message: 'Path is required and must be a string',
      path: 'path',
      value: mapping.path
    })
  } else if (mapping.path.includes('..') || mapping.path.includes('~')) {
    errors.push({
      type: 'security',
      message: 'Path contains potentially dangerous navigation',
      path: 'path',
      value: mapping.path
    })
  }

  // Validate priority
  if (typeof mapping.priority !== 'number' || mapping.priority < 0) {
    errors.push({
      type: 'range',
      message: 'Priority must be a non-negative number',
      path: 'priority',
      value: mapping.priority,
      expected: 'number >= 0'
    })
  }

  // Validate enabled
  if (typeof mapping.enabled !== 'boolean') {
    errors.push({
      type: 'format',
      message: 'Enabled must be a boolean',
      path: 'enabled',
      value: mapping.enabled
    })
  }

  // Validate dates
  if (!(mapping.createdAt instanceof Date) || isNaN(mapping.createdAt.getTime())) {
    errors.push({
      type: 'format',
      message: 'CreatedAt must be a valid Date',
      path: 'createdAt',
      value: mapping.createdAt
    })
  }

  if (!(mapping.modifiedAt instanceof Date) || isNaN(mapping.modifiedAt.getTime())) {
    errors.push({
      type: 'format',
      message: 'ModifiedAt must be a valid Date',
      path: 'modifiedAt',
      value: mapping.modifiedAt
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate file operation
 */
export function validateFileOperation(operation: FileOperation): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate ID
  if (!operation.id || typeof operation.id !== 'string') {
    errors.push({
      type: 'required',
      message: 'Operation ID is required and must be a string',
      path: 'id',
      value: operation.id
    })
  }

  // Validate type
  const validTypes = ['move', 'copy', 'rename', 'create-folder']
  if (!validTypes.includes(operation.type)) {
    errors.push({
      type: 'range',
      message: `Type must be one of: ${validTypes.join(', ')}`,
      path: 'type',
      value: operation.type
    })
  }

  // Validate source
  if (!operation.source || typeof operation.source !== 'string') {
    errors.push({
      type: 'required',
      message: 'Source path is required and must be a string',
      path: 'source',
      value: operation.source
    })
  }

  // Validate target
  if (!operation.target || typeof operation.target !== 'string') {
    errors.push({
      type: 'required',
      message: 'Target path is required and must be a string',
      path: 'target',
      value: operation.target
    })
  }

  // Validate status
  const validStatuses = ['pending', 'in-progress', 'completed', 'failed', 'cancelled']
  if (!validStatuses.includes(operation.status)) {
    errors.push({
      type: 'range',
      message: `Status must be one of: ${validStatuses.join(', ')}`,
      path: 'status',
      value: operation.status
    })
  }

  // Validate dates
  if (!(operation.createdAt instanceof Date) || isNaN(operation.createdAt.getTime())) {
    errors.push({
      type: 'format',
      message: 'CreatedAt must be a valid Date',
      path: 'createdAt',
      value: operation.createdAt
    })
  }

  // Validate completedAt if present
  if (operation.completedAt && (!(operation.completedAt instanceof Date) || isNaN(operation.completedAt.getTime()))) {
    errors.push({
      type: 'format',
      message: 'CompletedAt must be a valid Date',
      path: 'completedAt',
      value: operation.completedAt
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate plugin configuration
 */
export function validatePluginConfig(config: PluginConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Validate tag mappings array
  if (!Array.isArray(config.tagMappings)) {
    errors.push({
      type: 'format',
      message: 'Tag mappings must be an array',
      path: 'tagMappings',
      value: config.tagMappings
    })
  } else {
    // Validate each tag mapping
    config.tagMappings.forEach((mapping, index) => {
      const mappingResult = validateTagMapping(mapping)
      if (!mappingResult.valid) {
        mappingResult.errors.forEach(error => {
          errors.push({
            ...error,
            path: error.path ? `tagMappings[${index}].${error.path}` : `tagMappings[${index}]`
          })
        })
      }
    })
  }

  // Check for duplicate tags in mappings
  const tags = config.tagMappings.map(m => m.tag).filter(Boolean)
  const duplicateTags = tags.filter((tag, index) => tags.indexOf(tag) !== index)
  if (duplicateTags.length > 0) {
    warnings.push({
      type: 'recommendation',
      message: `Duplicate tag mappings found: ${duplicateTags.join(', ')}`,
      path: 'tagMappings'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate file path
 */
export function validateFilePath(path: string, options: PathValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!path || typeof path !== 'string') {
    errors.push({
      type: 'required',
      message: 'Path is required and must be a string',
      value: path
    })
    return { valid: false, errors, warnings }
  }

  // Check for dangerous patterns
  const dangerousPatterns = ['..', '~', '$', '%', '&']
  if (dangerousPatterns.some(pattern => path.includes(pattern))) {
    errors.push({
      type: 'security',
      message: 'Path contains potentially dangerous characters',
      value: path
    })
  }

  // Check for absolute paths if not allowed
  if (!options.allowAbsolute && (path.startsWith('/') || /^[A-Za-z]:/.test(path))) {
    errors.push({
      type: 'logic',
      message: 'Absolute paths are not allowed',
      value: path
    })
  }

  // Check file extension if required
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const extension = path.split('.').pop()?.toLowerCase()
    if (!extension || !options.allowedExtensions.includes(extension)) {
      errors.push({
        type: 'range',
        message: `File extension not allowed. Allowed: ${options.allowedExtensions.join(', ')}`,
        value: path
      })
    }
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(path)) {
    errors.push({
      type: 'format',
      message: 'Path contains invalid characters',
      value: path
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Path validation options
 */
export interface PathValidationOptions {
  /** Allow absolute paths */
  allowAbsolute?: boolean
  /** Allow relative paths */
  allowRelative?: boolean
  /** Allowed file extensions */
  allowedExtensions?: string[]
  /** Maximum path length */
  maxLength?: number
  /** Whether path must exist */
  mustExist?: boolean
}

/**
 * Validate tag format
 */
export function validateTag(tag: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!tag || typeof tag !== 'string') {
    errors.push({
      type: 'required',
      message: 'Tag is required and must be a string',
      value: tag
    })
    return { valid: false, errors, warnings }
  }

  // Check if tag starts with #
  if (!tag.startsWith('#')) {
    warnings.push({
      type: 'recommendation',
      message: 'Tags should start with #',
      value: tag
    })
  }

  // Check for invalid characters
  const invalidChars = /[\s<>:"|?*()[\]{}]/
  if (invalidChars.test(tag)) {
    errors.push({
      type: 'format',
      message: 'Tag contains invalid characters',
      value: tag
    })
  }

  // Check length
  if (tag.length > 100) {
    warnings.push({
      type: 'recommendation',
      message: 'Tag is very long, consider shortening it',
      value: tag
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}