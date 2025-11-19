/**
 * Cross-platform path utilities for TagFolder plugin
 */

/**
 * Platform detection
 */
export const Platform = {
  isWindows: typeof process !== 'undefined' && process.platform === 'win32',
  isMac: typeof process !== 'undefined' && process.platform === 'darwin',
  isLinux: typeof process !== 'undefined' && process.platform === 'linux',
  isPosix: typeof process !== 'undefined' && process.platform !== 'win32'
}

/**
 * Path separator based on platform
 */
export const PATH_SEPARATOR = Platform.isWindows ? '\\' : '/'

/**
 * Join path segments using the platform-appropriate separator
 */
export function joinPath(...segments: string[]): string {
  // Filter out empty segments and normalize separators
  const normalizedSegments = segments
    .filter(segment => segment && segment.length > 0)
    .map(segment => segment.replace(/[\/\\]/g, PATH_SEPARATOR))

  return normalizedSegments.join(PATH_SEPARATOR)
}

/**
 * Normalize path separators for current platform
 */
export function normalizePath(path: string): string {
  if (!path) return path

  return path.replace(/[\/\\]/g, PATH_SEPARATOR)
}

/**
 * Convert path to forward slashes (for internal consistency)
 */
export function toForwardSlashes(path: string): string {
  if (!path) return path
  return path.replace(/\\/g, '/')
}

/**
 * Convert path to platform-specific separators
 */
export function toPlatformSlashes(path: string): string {
  if (!path) return path
  return path.replace(/\//g, PATH_SEPARATOR)
}

/**
 * Get the directory name of a path
 */
export function getDirName(path: string): string {
  if (!path) return ''

  // Normalize separators first
  const normalized = normalizePath(path)

  // Find last separator
  const lastSeparator = normalized.lastIndexOf(PATH_SEPARATOR)
  if (lastSeparator === -1) return ''

  return normalized.substring(0, lastSeparator)
}

/**
 * Get the base name (filename) of a path
 */
export function getBaseName(path: string): string {
  if (!path) return ''

  // Normalize separators first
  const normalized = normalizePath(path)

  // Find last separator
  const lastSeparator = normalized.lastIndexOf(PATH_SEPARATOR)
  if (lastSeparator === -1) return normalized

  return normalized.substring(lastSeparator + PATH_SEPARATOR.length)
}

/**
 * Get the file extension from a path
 */
export function getExtension(path: string): string {
  if (!path) return ''

  const baseName = getBaseName(path)
  const lastDot = baseName.lastIndexOf('.')

  if (lastDot === -1 || lastDot === baseName.length - 1) return ''

  return baseName.substring(lastDot + 1).toLowerCase()
}

/**
 * Get the filename without extension
 */
export function getFileNameWithoutExtension(path: string): string {
  if (!path) return ''

  const baseName = getBaseName(path)
  const lastDot = baseName.lastIndexOf('.')

  if (lastDot === -1) return baseName

  return baseName.substring(0, lastDot)
}

/**
 * Check if a path is absolute
 */
export function isAbsolute(path: string): boolean {
  if (!path) return false

  // Windows paths
  if (Platform.isWindows) {
    // C:\ or \\server\share
    return /^[A-Za-z]:\\/.test(path) || /^\\\\[^\\]/.test(path)
  }

  // Unix/Mac paths
  return path.startsWith('/')
}

/**
 * Make a path relative to another path
 */
export function relativePath(from: string, to: string): string {
  if (!from || !to) return to || ''

  // Normalize both paths
  const normalizedFrom = normalizePath(from)
  const normalizedTo = normalizePath(to)

  // If both are absolute, make them relative
  if (isAbsolute(normalizedFrom) && isAbsolute(normalizedTo)) {
    const fromParts = normalizedFrom.split(PATH_SEPARATOR).filter(Boolean)
    const toParts = normalizedTo.split(PATH_SEPARATOR).filter(Boolean)

    // Find common prefix
    let commonLength = 0
    const minLength = Math.min(fromParts.length, toParts.length)

    for (let i = 0; i < minLength; i++) {
      if (fromParts[i]?.toLowerCase() === toParts[i]?.toLowerCase()) {
        commonLength++
      } else {
        break
      }
    }

    // Build relative path
    const upLevels = fromParts.length - commonLength
    const relativeParts = []

    // Add ".." for each level we need to go up
    for (let i = 0; i < upLevels; i++) {
      relativeParts.push('..')
    }

    // Add remaining path components
    relativeParts.push(...toParts.slice(commonLength))

    return relativeParts.join('/')
  }

  // If one is not absolute, return as-is
  return normalizedTo
}

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFileName(name: string): string {
  if (!name) return name

  // Remove invalid characters for all platforms
  let sanitized = name
    .replace(/[<>:"|?*]/g, '') // Windows invalid chars
    .replace(/[\0]/g, '') // Null character
    .replace(/[\/\\]/g, '-') // Path separators
    .replace(/^\./, '_') // Don't start with dot
    .trim()

  // Handle Windows reserved names
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]

  const baseName = sanitized.split('.')[0]?.toUpperCase()
  if (baseName && reservedNames.includes(baseName)) {
    sanitized = `_${sanitized}`
  }

  // Limit length
  if (sanitized.length > 255) {
    const extension = getExtension(sanitized)
    const nameWithoutExt = getFileNameWithoutExtension(sanitized)
    const maxLength = 255 - (extension.length + 1) // +1 for the dot
    sanitized = `${nameWithoutExt.substring(0, maxLength)}.${extension}`
  }

  return sanitized || 'unnamed'
}

/**
 * Generate a unique filename by adding a number suffix
 */
export function generateUniqueFileName(dirPath: string, baseName: string, extension?: string): string {
  const fullExtension = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : ''
  let fileName = `${baseName}${fullExtension}`
  let counter = 1

  // Check if file exists (this is a placeholder - actual implementation would check file system)
  // TODO: Implement actual file existence check
  // For now, just use the base name
  return fileName || `${baseName}${fullExtension}`
}

/**
 * Convert tag to path segment
 */
export function tagToPathSegment(tag: string): string {
  if (!tag) return ''

  // Remove # prefix if present
  let segment = tag.startsWith('#') ? tag.substring(1) : tag

  // Replace separators with platform-appropriate separator
  segment = segment.replace(/[\/\\]/g, PATH_SEPARATOR)

  // Sanitize the segment
  segment = sanitizeFileName(segment)

  return segment
}

/**
 * Convert full tag path to directory path
 */
export function tagToDirectoryPath(tag: string, baseDir?: string): string {
  const segment = tagToPathSegment(tag)
  const path = baseDir ? joinPath(baseDir, segment) : segment
  return normalizePath(path)
}

/**
 * Check if a path is within another path
 */
export function isPathWithin(parentPath: string, childPath: string): boolean {
  if (!parentPath || !childPath) return false

  const normalizedParent = normalizePath(parentPath)
  const normalizedChild = normalizePath(childPath)

  // Ensure parent path ends with separator for exact match
  const parentWithSeparator = normalizedParent.endsWith(PATH_SEPARATOR)
    ? normalizedParent
    : `${normalizedParent}${PATH_SEPARATOR}`

  return normalizedChild.startsWith(parentWithSeparator)
}

/**
 * Get common path prefix
 */
export function getCommonPath(paths: string[]): string {
  if (!paths || paths.length === 0) return ''
  if (paths.length === 1) return paths[0]!

  // Normalize all paths
  const normalizedPaths = paths.map(normalizePath)

  // Split first path into parts
  const firstParts = (normalizedPaths[0] || '').split(PATH_SEPARATOR)

  // Find common prefix length
  let commonLength = 0
  for (let i = 0; i < firstParts.length; i++) {
    const part = firstParts[i]

    // Check if all paths have this part at this position
    if (normalizedPaths.every(path => {
      const parts = path.split(PATH_SEPARATOR)
      return parts[i] === part
    })) {
      commonLength++
    } else {
      break
    }
  }

  // Rebuild common path
  const commonParts = firstParts.slice(0, commonLength)
  return commonParts.join(PATH_SEPARATOR)
}

/**
 * Truncate a path to fit within a maximum length
 */
export function truncatePath(path: string, maxLength: number, options: TruncateOptions = {}): string {
  if (!path || path.length <= maxLength) return path

  const { separator = '...', preserveEnd = true } = options

  if (preserveEnd) {
    const parts = path.split(PATH_SEPARATOR)
    if (parts.length <= 2) {
      // Too few parts to meaningfully truncate
      return path.substring(0, maxLength - separator.length) + separator
    }

    const fileName = parts[parts.length - 1]!
    const availableLength = maxLength - separator.length - fileName.length

    if (availableLength <= 0) {
      // Not enough space for anything but filename
      return fileName.length > maxLength
        ? fileName.substring(0, maxLength - separator.length) + separator
        : fileName
    }

    // Truncate the directory part
    let dirPath = parts.slice(0, -1).join(PATH_SEPARATOR)
    if (dirPath.length > availableLength) {
      dirPath = dirPath.substring(0, availableLength)
    }

    return `${dirPath}${separator}${PATH_SEPARATOR}${fileName}`
  } else {
    return path.substring(0, maxLength - separator.length) + separator
  }
}

/**
 * Path truncation options
 */
export interface TruncateOptions {
  /** Separator to use when truncating */
  separator?: string
  /** Whether to preserve the filename at the end */
  preserveEnd?: boolean
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}