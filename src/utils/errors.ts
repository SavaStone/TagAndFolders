/**
 * Error handling classes and utilities for TagFolder plugin
 */

/**
 * Base error class for all TagFolder errors
 */
export abstract class TagFolderError extends Error {
  /** Error code */
  public readonly code: string

  /** Error severity */
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'

  /** Whether this error can be recovered from */
  public readonly recoverable: boolean

  /** Context information */
  public readonly context?: Record<string, any>

  /** Inner error that caused this error */
  public readonly cause: Error | undefined

  constructor(
    code: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.severity = severity
    this.recoverable = recoverable
    this.context = context || {}
    this.cause = cause

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get error details as plain object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined,
      stack: this.stack
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message
  }
}

/**
 * Validation errors
 */
export class ValidationError extends TagFolderError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super('VALIDATION_ERROR', message, 'medium', true, context, cause)
  }

  override getUserMessage(): string {
    return `Validation error: ${this.message}`
  }
}

/**
 * File operation errors
 */
export class FileOperationError extends TagFolderError {
  public readonly operation: string
  public readonly filePath: string

  constructor(
    operation: string,
    filePath: string,
    message: string,
    severity: 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super('FILE_OPERATION_ERROR', message, severity, recoverable, { ...context, operation, filePath }, cause)
    this.operation = operation
    this.filePath = filePath
  }

  override getUserMessage(): string {
    return `File operation error: Failed to ${this.operation} '${this.filePath}'. ${this.message}`
  }
}

/**
 * Permission errors
 */
export class PermissionError extends FileOperationError {
  constructor(filePath: string, operation: string, cause?: Error) {
    super(
      operation,
      filePath,
      `Permission denied: insufficient permissions to ${operation}`,
      'high',
      false,
      { permissionDenied: true },
      cause
    )
  }

  override getUserMessage(): string {
    return `Permission denied: You don't have permission to ${this.operation} '${this.filePath}'. Check file permissions and try again.`
  }
}

/**
 * File not found errors
 */
export class FileNotFoundError extends FileOperationError {
  constructor(filePath: string, operation?: string, cause?: Error) {
    super(
      operation || 'access',
      filePath,
      `File not found: '${filePath}' does not exist`,
      'high',
      true,
      { fileNotFound: true },
      cause
    )
  }

  override getUserMessage(): string {
    return `File not found: '${this.filePath}' could not be found. It may have been moved, renamed, or deleted.`
  }
}

/**
 * File conflict errors
 */
export class FileConflictError extends FileOperationError {
  public readonly targetPath: string
  public readonly conflictType: 'exists' | 'read-only' | 'directory'

  constructor(
    sourcePath: string,
    targetPath: string,
    conflictType: 'exists' | 'read-only' | 'directory',
    message?: string
  ) {
    const defaultMessage = `File conflict: ${conflictType === 'exists' ? 'target file already exists' : conflictType === 'read-only' ? 'target file is read-only' : 'target is a directory'}`
    super(
      'move/copy',
      sourcePath,
      message || defaultMessage,
      'medium',
      true,
      { targetPath, conflictType }
    )
    this.targetPath = targetPath
    this.conflictType = conflictType
  }

  override getUserMessage(): string {
    switch (this.conflictType) {
      case 'exists':
        return `A file named '${this.filePath}' already exists at the target location. Choose how to resolve this conflict.`
      case 'read-only':
        return `The file '${this.filePath}' is read-only and cannot be overwritten.`
      case 'directory':
        return `Cannot move file '${this.filePath}' - target location is a directory.`
      default:
        return this.message
    }
  }
}

/**
 * Scanner errors
 */
export class ScannerError extends TagFolderError {
  public readonly filePath: string | undefined

  constructor(
    message: string,
    filePath?: string,
    severity: 'medium' | 'high' = 'medium',
    recoverable: boolean = true,
    context?: Record<string, any>,
    cause?: Error
  ) {
    const contextWithFilePath = { ...context }
    if (filePath !== undefined) {
      contextWithFilePath.filePath = filePath
    }
    super('SCANNER_ERROR', message, severity, recoverable, contextWithFilePath, cause)
    this.filePath = filePath
  }

  override getUserMessage(): string {
    if (this.filePath) {
      return `Scanning error: Failed to scan '${this.filePath}'. ${this.message}`
    }
    return `Scanning error: ${this.message}`
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends TagFolderError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super('CONFIGURATION_ERROR', message, 'medium', true, context, cause)
  }

  override getUserMessage(): string {
    return `Configuration error: ${this.message}.`
  }
}

/**
 * Network or API errors
 */
export class NetworkError extends TagFolderError {
  constructor(message: string, cause?: Error) {
    super('NETWORK_ERROR', message, 'medium', true, { networkError: true }, cause)
  }

  override getUserMessage(): string {
    return `Network error: ${this.message}. Please check your connection and try again.`
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends TagFolderError {
  public readonly operation: string
  public readonly timeout: number

  constructor(operation: string, timeout: number, message?: string) {
    super(
      'TIMEOUT_ERROR',
      message || `Operation '${operation}' timed out after ${timeout}ms`,
      'medium',
      true,
      { operation, timeout },
      undefined
    )
    this.operation = operation
    this.timeout = timeout
  }

  override getUserMessage(): string {
    return `Timeout error: The '${this.operation}' operation took too long and was cancelled. Try with smaller batches or check if something is blocking the operation.`
  }
}

/**
 * Cancellation errors
 */
export class CancellationError extends TagFolderError {
  public readonly operation: string

  constructor(operation: string) {
    super(
      'CANCELLATION_ERROR',
      `Operation '${operation}' was cancelled by user`,
      'low',
      true,
      { operation, cancelled: true },
      undefined
    )
    this.operation = operation
  }

  override getUserMessage(): string {
    return `The '${this.operation}' operation was cancelled.`
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errors: TagFolderError[] = []
  private maxErrors: number = 100

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Handle an error
   */
  handleError(error: Error | TagFolderError, context?: Record<string, any>): void {
    const tagFolderError = error instanceof TagFolderError ? error : this.wrapError(error, context)

    // Add to error history
    this.errors.push(tagFolderError)

    // Trim error history if needed
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Log error
    console.error(`[TagFolder] ${tagFolderError.code}: ${tagFolderError.message}`, {
      error: tagFolderError.toJSON()
    })
  }

  /**
   * Wrap a generic Error into TagFolderError
   */
  private wrapError(error: Error, context?: Record<string, any>): TagFolderError {
    // Create a concrete implementation instead of abstract class
    class ConcreteTagFolderError extends TagFolderError {
      constructor(code: string, message: string, severity: 'low' | 'medium' | 'high', recoverable: boolean, context?: Record<string, any>, cause?: Error) {
        super(code, message, severity, recoverable, context, cause)
      }
    }

    return new ConcreteTagFolderError(
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      'medium',
      true,
      { ...context, originalError: error.name },
      error
    )
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): TagFolderError[] {
    return this.errors.slice(-count)
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): TagFolderError[] {
    return this.errors.filter(error => error.severity === severity)
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
    recoverable: number
    nonRecoverable: number
  } {
    const stats = {
      total: this.errors.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      recoverable: 0,
      nonRecoverable: 0
    }

    this.errors.forEach(error => {
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1

      // Count by type
      const typeName = error.constructor.name
      stats.byType[typeName] = (stats.byType[typeName] || 0) + 1

      // Count by recoverability
      if (error.recoverable) {
        stats.recoverable++
      } else {
        stats.nonRecoverable++
      }
    })

    return stats
  }
}

/**
 * Create appropriate error based on error code and context
 */
export function createError(
  code: string,
  message: string,
  context?: Record<string, any>,
  cause?: Error
): TagFolderError {
  switch (code) {
    case 'VALIDATION_ERROR':
      return new ValidationError(message, context, cause)
    case 'FILE_OPERATION_ERROR':
      return new FileOperationError(
        context?.operation || 'unknown',
        context?.filePath || 'unknown',
        message,
        'medium',
        true,
        context,
        cause
      )
    case 'PERMISSION_ERROR':
      return new PermissionError(
        context?.filePath || 'unknown',
        context?.operation || 'access',
        cause
      )
    case 'FILE_NOT_FOUND_ERROR':
      return new FileNotFoundError(
        context?.filePath || 'unknown',
        context?.operation,
        cause
      )
    case 'FILE_CONFLICT_ERROR':
      return new FileConflictError(
        context?.sourcePath || 'unknown',
        context?.targetPath || 'unknown',
        context?.conflictType || 'exists',
        message
      )
    case 'SCANNER_ERROR':
      return new ScannerError(message, context?.filePath, 'medium', true, context, cause)
    case 'CONFIGURATION_ERROR':
      return new ConfigurationError(message, context, cause)
    case 'NETWORK_ERROR':
      return new NetworkError(message, cause)
    case 'TIMEOUT_ERROR':
      return new TimeoutError(
        context?.operation || 'unknown',
        context?.timeout || 5000,
        message
      )
    case 'CANCELLATION_ERROR':
      return new CancellationError(context?.operation || 'unknown')
    default:
      // Create a concrete error instance
      class DefaultTagFolderError extends TagFolderError {
        constructor(errorCode: string, errorMessage: string, errorSeverity: 'low' | 'medium' | 'high' | 'critical', errorRecoverable: boolean, errorContext?: Record<string, any>, errorCause?: Error) {
          super(errorCode, errorMessage, errorSeverity, errorRecoverable, errorContext, errorCause)
        }
      }
      return new DefaultTagFolderError(code, message, 'medium', true, context, cause)
  }
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  return error instanceof TagFolderError ? error.recoverable : true
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: Error): string {
  if (error instanceof TagFolderError) {
    return error.getUserMessage()
  }
  return error.message || 'An unknown error occurred'
}

/**
 * Global error handler
 */
export const errorHandler = ErrorHandler.getInstance()