/**
 * Event emitter system for TagFolder plugin
 */

/**
 * Event listener function type
 */
export type EventListener<T = any> = (data: T) => void | Promise<void>

/**
 * Event listener metadata
 */
export interface EventListenerMetadata {
  /** Listener function */
  listener: EventListener
  /** Whether listener should be called once */
  once: boolean
  /** Listener identifier for removal */
  id: string
  /** Timestamp when listener was added */
  addedAt: Date
}

/**
 * Typed event emitter
 */
export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners: Map<keyof TEvents, EventListenerMetadata[]> = new Map()
  private maxListeners: number = 100

  /**
   * Add event listener
   */
  on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
    options: { once?: boolean; id?: string } = {}
  ): string {
    const id = options.id || this.generateListenerId()
    const metadata: EventListenerMetadata = {
      listener: listener as EventListener,
      once: options.once || false,
      id,
      addedAt: new Date()
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }

    const eventListeners = this.listeners.get(eventName)!

    // Check max listeners
    if (eventListeners.length >= this.maxListeners) {
      console.warn(`EventEmitter: Maximum listeners (${this.maxListeners}) exceeded for event '${String(eventName)}'`)
    }

    eventListeners.push(metadata)
    return id
  }

  /**
   * Add one-time event listener
   */
  once<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listener: EventListener<TEvents[TEventName]>,
    id?: string
  ): string {
    return this.on(eventName, listener, id ? { once: true, id } : { once: true })
  }

  /**
   * Remove event listener
   */
  off<TEventName extends keyof TEvents>(
    eventName: TEventName,
    listenerOrId: EventListener<TEvents[TEventName]> | string
  ): void {
    const eventListeners = this.listeners.get(eventName)
    if (!eventListeners) return

    let indexToRemove = -1

    if (typeof listenerOrId === 'string') {
      // Remove by ID
      indexToRemove = eventListeners.findIndex(meta => meta.id === listenerOrId)
    } else {
      // Remove by listener function
      indexToRemove = eventListeners.findIndex(meta => meta.listener === listenerOrId)
    }

    if (indexToRemove !== -1) {
      eventListeners.splice(indexToRemove, 1)
    }

    // Clean up empty listener arrays
    if (eventListeners.length === 0) {
      this.listeners.delete(eventName)
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<TEventName extends keyof TEvents>(eventName?: TEventName): void {
    if (eventName) {
      this.listeners.delete(eventName)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Emit event to all listeners
   */
  async emit<TEventName extends keyof TEvents>(
    eventName: TEventName,
    data: TEvents[TEventName]
  ): Promise<void> {
    const eventListeners = this.listeners.get(eventName)
    if (!eventListeners || eventListeners.length === 0) return

    const listenersToRemove: string[] = []

    // Call all listeners
    for (const metadata of [...eventListeners]) {
      try {
        await metadata.listener(data)

        // Remove one-time listeners
        if (metadata.once) {
          listenersToRemove.push(metadata.id)
        }
      } catch (error) {
        console.error(`Error in event listener for '${String(eventName)}':`, error)
      }
    }

    // Remove one-time listeners
    for (const id of listenersToRemove) {
      this.off(eventName, id)
    }
  }

  /**
   * Emit event synchronously (fire and forget)
   */
  emitSync<TEventName extends keyof TEvents>(
    eventName: TEventName,
    data: TEvents[TEventName]
  ): void {
    const eventListeners = this.listeners.get(eventName)
    if (!eventListeners || eventListeners.length === 0) return

    const listenersToRemove: string[] = []

    // Call all listeners without waiting
    for (const metadata of [...eventListeners]) {
      try {
        const result = metadata.listener(data)

        // Handle async listeners
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Async error in event listener for '${String(eventName)}':`, error)
          })
        }

        // Remove one-time listeners
        if (metadata.once) {
          listenersToRemove.push(metadata.id)
        }
      } catch (error) {
        console.error(`Error in event listener for '${String(eventName)}':`, error)
      }
    }

    // Remove one-time listeners
    for (const id of listenersToRemove) {
      this.off(eventName, id)
    }
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount<TEventName extends keyof TEvents>(eventName: TEventName): number {
    const eventListeners = this.listeners.get(eventName)
    return eventListeners ? eventListeners.length : 0
  }

  /**
   * Get all event names with listeners
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Get listener metadata for an event
   */
  getListeners<TEventName extends keyof TEvents>(eventName: TEventName): EventListenerMetadata[] {
    return this.listeners.get(eventName) || []
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners<TEventName extends keyof TEvents>(eventName: TEventName): boolean {
    const count = this.listenerCount(eventName)
    return count > 0
  }

  /**
   * Set maximum number of listeners per event
   */
  setMaxListeners(max: number): void {
    this.maxListeners = Math.max(0, max)
  }

  /**
   * Get maximum number of listeners per event
   */
  getMaxListeners(): number {
    return this.maxListeners
  }

  /**
   * Generate unique listener ID
   */
  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get statistics about listeners
   */
  getStats(): {
    totalEvents: number
    totalListeners: number
    eventsByListenerCount: Record<string, number>
    oldestListener: { event: string; date: Date } | null
    newestListener: { event: string; date: Date } | null
  } {
    let totalListeners = 0
    const eventsByListenerCount: Record<string, number> = {}
    let oldestListener: { event: string; date: Date } | null = null
    let newestListener: { event: string; date: Date } | null = null

    for (const [eventName, listeners] of this.listeners.entries()) {
      const count = listeners.length
      totalListeners += count
      eventsByListenerCount[String(eventName)] = count

      for (const metadata of listeners) {
        if (!oldestListener || metadata.addedAt < oldestListener.date) {
          oldestListener = { event: String(eventName), date: metadata.addedAt }
        }
        if (!newestListener || metadata.addedAt > newestListener.date) {
          newestListener = { event: String(eventName), date: metadata.addedAt }
        }
      }
    }

    return {
      totalEvents: this.listeners.size,
      totalListeners,
      eventsByListenerCount,
      oldestListener,
      newestListener
    }
  }
}

/**
 * Global event emitter instance
 */
export const globalEventEmitter = new TypedEventEmitter<TagFolderEvents>()

/**
 * TagFolder plugin events
 */
export interface TagFolderEvents {
  // Scanner events
  'scan-started': { scanId: string; startTime: Date }
  'scan-progress': { scanId: string; progress: { completed: number; total: number; currentFile?: string } }
  'scan-completed': { scanId: string; result: any; duration: number }
  'scan-failed': { scanId: string; error: Error }
  'scan-cancelled': { scanId: string }

  // File operation events
  'operation-started': { operationId: string; type: string; source: string; target: string }
  'operation-progress': { operationId: string; progress: number; message?: string }
  'operation-completed': { operationId: string; result: any }
  'operation-failed': { operationId: string; error: Error }
  'operation-cancelled': { operationId: string }

  // Conflict events
  'conflict-detected': { operationId: string; conflict: any }
  'conflict-resolved': { operationId: string; resolution: any }

  // Organization events
  'organization-started': { sessionId: string; operations: any[] }
  'organization-progress': { sessionId: string; completed: number; total: number }
  'organization-completed': { sessionId: string; result: any }
  'organization-failed': { sessionId: string; error: Error }

  // Link update events
  'links-updated': { operationId: string; updatedCount: number; fileCount: number }
  'link-update-failed': { operationId: string; error: Error }

  // Configuration events
  'settings-changed': { key: string; oldValue: any; newValue: any }
  'settings-loaded': { settings: any }
  'settings-saved': { settings: any }

  // UI events
  'dialog-opened': { type: string; data: any }
  'dialog-closed': { type: string; result?: any }
  'panel-opened': { type: string; data: any }
  'panel-closed': { type: string }

  // Error events
  'error-occurred': { error: Error; context?: any }
  'warning-occurred': { message: string; context?: any }

  // Plugin lifecycle events
  'plugin-loaded': { version: string }
  'plugin-unloaded': { reason?: string }

  // Link update events
  'updates-cancelled': { sessionId: string }
  'updates-started': { sessionId: string }
  'link-updated': { operationId: string; linkId: string; sourceFile: string }
  'updates-completed': { sessionId: string; result: any }
  'updates-failed': { error: Error; sessionId: string }
}

/**
 * Event emitter wrapper with additional functionality
 */
export class EventEmitter {
  private emitter: TypedEventEmitter<any>
  private middleware: EventMiddleware[] = []

  constructor(events?: Record<string, any>) {
    this.emitter = events ? new TypedEventEmitter(events) : globalEventEmitter
  }

  /**
   * Add event listener
   */
  on<TEventName extends keyof TagFolderEvents>(
    eventName: TEventName,
    listener: EventListener<TagFolderEvents[TEventName]>,
    options?: { once?: boolean; id?: string }
  ): string {
    return this.emitter.on(eventName, listener, options)
  }

  /**
   * Add one-time event listener
   */
  once<TEventName extends keyof TagFolderEvents>(
    eventName: TEventName,
    listener: EventListener<TagFolderEvents[TEventName]>,
    id?: string
  ): string {
    return this.emitter.once(eventName, listener, id)
  }

  /**
   * Remove event listener
   */
  off<TEventName extends keyof TagFolderEvents>(
    eventName: TEventName,
    listenerOrId: EventListener<TagFolderEvents[TEventName]> | string
  ): void {
    this.emitter.off(eventName, listenerOrId)
  }

  /**
   * Remove all listeners
   */
  removeAllListeners<TEventName extends keyof TagFolderEvents>(eventName?: TEventName): void {
    this.emitter.removeAllListeners(eventName)
  }

  /**
   * Emit event with middleware support
   */
  async emit<TEventName extends keyof TagFolderEvents>(
    eventName: TEventName,
    data: TagFolderEvents[TEventName]
  ): Promise<void> {
    let processedData = data

    // Apply middleware
    for (const middleware of this.middleware) {
      processedData = await middleware(String(eventName), processedData)
    }

    await this.emitter.emit(eventName, processedData)
  }

  /**
   * Emit event synchronously
   */
  emitSync<TEventName extends keyof TagFolderEvents>(
    eventName: TEventName,
    data: TagFolderEvents[TEventName]
  ): void {
    let processedData = data

    // Apply middleware synchronously
    for (const middleware of this.middleware) {
      try {
        const result = middleware(String(eventName), processedData)
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Middleware error for event '${String(eventName)}':`, error)
          })
        } else {
          processedData = result
        }
      } catch (error) {
        console.error(`Middleware error for event '${String(eventName)}':`, error)
      }
    }

    this.emitter.emitSync(eventName, processedData)
  }

  /**
   * Add event middleware
   */
  use(middleware: EventMiddleware): void {
    this.middleware.push(middleware)
  }

  /**
   * Remove event middleware
   */
  removeMiddleware(middleware: EventMiddleware): void {
    const index = this.middleware.indexOf(middleware)
    if (index !== -1) {
      this.middleware.splice(index, 1)
    }
  }

  /**
   * Get listener count
   */
  listenerCount<TEventName extends keyof TagFolderEvents>(eventName: TEventName): number {
    return this.emitter.listenerCount(eventName)
  }

  /**
   * Get event names
   */
  eventNames(): (keyof TagFolderEvents)[] {
    return this.emitter.eventNames()
  }
}

/**
 * Event middleware function
 */
export type EventMiddleware = (eventName: string, data: any) => any | Promise<any>

/**
 * Logging middleware for events
 */
export const loggingMiddleware: EventMiddleware = (eventName, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Event] ${eventName}:`, data)
  }
  return data
}

/**
 * Error handling middleware for events
 */
export const errorHandlingMiddleware: EventMiddleware = async (eventName, data) => {
  try {
    return data
  } catch (error) {
    console.error(`Error processing event ${eventName}:`, error)
    throw error
  }
}

/**
 * Default event emitter with middleware
 */
export const eventEmitter = new EventEmitter()
eventEmitter.use(loggingMiddleware)
eventEmitter.use(errorHandlingMiddleware)