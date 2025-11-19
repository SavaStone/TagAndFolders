/**
 * Progress Indicators - Visual feedback for long-running operations
 */

import { App, Notice, ProgressBarComponent } from 'obsidian'
import { eventEmitter } from '@/utils/events.js'

/**
 * Progress options
 */
export interface ProgressOptions {
  /** Operation title */
  title: string
  /** Total number of items to process */
  total?: number
  /** Show item count */
  showCount?: boolean
  /** Show time remaining */
  showTimeRemaining?: boolean
  /** Show percentage */
  showPercentage?: boolean
  /** Allow cancellation */
  cancellable?: boolean
  /** Custom status message */
  statusMessage?: string
  /** Progress bar color */
  color?: string
  /** Compact mode */
  compact?: boolean
  /** Auto-hide when complete */
  autoHide?: boolean
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Progress state
 */
export interface ProgressState {
  /** Current progress (0-100) */
  percentage: number
  /** Current item being processed */
  current?: string
  /** Completed count */
  completed: number
  /** Total count */
  total: number
  /** Operation status */
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error'
  /** Start timestamp */
  startedAt: Date
  /** Estimated completion timestamp */
  estimatedCompletion?: Date
  /** Error message if applicable */
  error?: string
}

/**
 * Progress indicator types
 */
export type ProgressType = 'bar' | 'spinner' | 'steps' | 'circular'

/**
 * Progress Indicators
 */
export class ProgressIndicator {
  private containerEl: HTMLElement
  private options: Required<ProgressOptions>
  private state: ProgressState
  private intervalId: NodeJS.Timeout | null = null
  private progressBar: ProgressBarComponent | null = null
  private type: ProgressType
  private onCancel?: () => void
  private operationId: string

  constructor(
    app: App,
    container: HTMLElement,
    type: ProgressType = 'bar',
    options: Partial<ProgressOptions> = {}
  ) {
    this.containerEl = container
    this.type = type
    this.operationId = `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.options = {
      title: 'Progress',
      total: 100,
      showCount: true,
      showTimeRemaining: true,
      showPercentage: true,
      cancellable: false,
      statusMessage: '',
      color: 'var(--interactive-accent)',
      compact: false,
      autoHide: false,
      timeout: 30000,
      ...options
    } as Required<ProgressOptions>

    this.state = {
      percentage: 0,
      completed: 0,
      total: this.options.total,
      status: 'running',
      startedAt: new Date()
    }

    this.render()
    this.startProgressTracking()
  }

  /**
   * Update progress
   */
  updateProgress(
    percentage: number,
    options: {
      current?: string
      completed?: number
      status?: ProgressState['status']
      error?: string
    } = {}
  ): void {
    this.state.percentage = Math.max(0, Math.min(100, percentage))

    if (options.completed !== undefined) {
      this.state.completed = options.completed
    } else {
      // Calculate completed based on percentage and total
      this.state.completed = Math.round((this.state.percentage / 100) * this.state.total)
    }

    if (options.current) {
      this.state.current = options.current
    }

    if (options.status) {
      this.state.status = options.status
    }

    if (options.error) {
      this.state.error = options.error
      this.state.status = 'error'
    }

    // Update estimated completion time
    if (this.state.status === 'running' && this.state.percentage > 0) {
      const elapsed = Date.now() - this.state.startedAt.getTime()
      const totalEstimated = (elapsed / this.state.percentage) * 100
      this.state.estimatedCompletion = new Date(this.state.startedAt.getTime() + totalEstimated)
    }

    this.updateDisplay()

    // Auto-hide if complete and option is enabled
    if (this.options.autoHide && this.state.status === 'completed') {
      setTimeout(() => {
        this.hide()
      }, 2000)
    }
  }

  /**
   * Increment progress by amount
   */
  increment(amount: number = 1, current?: string): void {
    const newPercentage = Math.min(100, this.state.percentage + (amount / this.state.total) * 100)
    this.updateProgress(newPercentage, current ? { current } : {})
  }

  /**
   * Complete the progress
   */
  complete(): void {
    this.updateProgress(100, { status: 'completed' })
  }

  /**
   * Cancel the progress
   */
  cancel(): void {
    this.state.status = 'cancelled'
    this.updateDisplay()

    if (this.onCancel) {
      this.onCancel()
    }

    this.emitProgressEvent('cancelled')
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    this.updateProgress(this.state.percentage, {
      status: 'error',
      error
    })

    this.emitProgressEvent('error')
  }

  /**
   * Set cancellation callback
   */
  setCancellationCallback(callback: () => void): void {
    this.onCancel = callback
  }

  /**
   * Get current state
   */
  getState(): ProgressState {
    return { ...this.state }
  }

  /**
   * Hide progress indicator
   */
  hide(): void {
    this.stopProgressTracking()
    this.containerEl.empty()
    this.containerEl.remove()
  }

  /**
   * Show progress indicator
   */
  show(): void {
    this.containerEl.style.display = 'block'
    this.startProgressTracking()
  }

  /**
   * Render the progress indicator
   */
  private render(): void {
    this.containerEl.empty()
    this.containerEl.addClass('tagfolder-progress')
    this.containerEl.addClass(`tagfolder-progress-${this.type}`)
    this.containerEl.addClass(this.options.compact ? 'tagfolder-progress-compact' : '')

    switch (this.type) {
      case 'bar':
        this.renderProgressBar()
        break
      case 'spinner':
        this.renderSpinner()
        break
      case 'steps':
        this.renderSteps()
        break
      case 'circular':
        this.renderCircular()
        break
    }

    this.renderControls()
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): void {
    const progressContainer = this.containerEl.createDiv('tagfolder-progress-container')

    // Header
    this.renderHeader(progressContainer)

    // Progress bar
    const barContainer = progressContainer.createDiv('tagfolder-progress-bar-container')
    this.progressBar = new ProgressBarComponent(barContainer)
    this.progressBar.setValue(this.state.percentage / 100)

    // Apply custom color
    if (this.options.color) {
      // TODO: Implement color customization when Obsidian API supports it
      // this.progressBar.progressEl.style.backgroundColor = this.options.color
    }

    // Details
    this.renderDetails(progressContainer)
  }

  /**
   * Render spinner
   */
  private renderSpinner(): void {
    const spinnerContainer = this.containerEl.createDiv('tagfolder-spinner-container')

    // Header
    this.renderHeader(spinnerContainer)

    // Spinner
    const spinnerEl = spinnerContainer.createDiv('tagfolder-spinner')
    spinnerEl.innerHTML = this.createSpinnerSVG()

    // Details
    this.renderDetails(spinnerContainer)
  }

  /**
   * Render steps
   */
  private renderSteps(): void {
    const stepsContainer = this.containerEl.createDiv('tagfolder-steps-container')

    // Header
    this.renderHeader(stepsContainer)

    // Steps visualization
    const stepsEl = stepsContainer.createDiv('tagfolder-steps')
    const totalSteps = Math.min(10, this.state.total) // Limit visual steps
    const currentStep = Math.floor((this.state.percentage / 100) * totalSteps)

    for (let i = 0; i < totalSteps; i++) {
      const stepEl = stepsEl.createDiv('tagfolder-step')
      if (i < currentStep) {
        stepEl.addClass('tagfolder-step-completed')
        stepEl.innerHTML = '✓'
      } else if (i === currentStep) {
        stepEl.addClass('tagfolder-step-current')
        stepEl.innerHTML = this.createSpinnerSVG()
      } else {
        stepEl.addClass('tagfolder-step-pending')
      }
    }

    // Details
    this.renderDetails(stepsContainer)
  }

  /**
   * Render circular progress
   */
  private renderCircular(): void {
    const circularContainer = this.containerEl.createDiv('tagfolder-circular-container')

    // Header
    this.renderHeader(circularContainer)

    // Circular progress
    const circularEl = circularContainer.createDiv('tagfolder-circular-progress')
    circularEl.innerHTML = this.createCircularSVG()

    // Details
    this.renderDetails(circularContainer)
  }

  /**
   * Render header
   */
  private renderHeader(container: HTMLElement): void {
    const headerEl = container.createDiv('tagfolder-progress-header')

    const titleEl = headerEl.createDiv('tagfolder-progress-title')
    titleEl.textContent = this.options.title

    if (this.options.statusMessage) {
      const statusEl = headerEl.createDiv('tagfolder-progress-status')
      statusEl.textContent = this.options.statusMessage
    }

    // Error display
    if (this.state.status === 'error' && this.state.error) {
      const errorEl = headerEl.createDiv('tagfolder-progress-error')
      errorEl.textContent = this.state.error
    }
  }

  /**
   * Render details
   */
  private renderDetails(container: HTMLElement): void {
    const detailsEl = container.createDiv('tagfolder-progress-details')

    // Count display
    if (this.options.showCount && this.state.total > 0) {
      const countEl = detailsEl.createDiv('tagfolder-progress-count')
      countEl.textContent = `${this.state.completed} / ${this.state.total}`
    }

    // Percentage display
    if (this.options.showPercentage) {
      const percentageEl = detailsEl.createDiv('tagfolder-progress-percentage')
      percentageEl.textContent = `${Math.round(this.state.percentage)}%`
    }

    // Current item display
    if (this.state.current) {
      const currentEl = detailsEl.createDiv('tagfolder-progress-current')
      currentEl.textContent = this.state.current
    }

    // Time remaining display
    if (this.options.showTimeRemaining && this.state.estimatedCompletion) {
      const timeEl = detailsEl.createDiv('tagfolder-progress-time')
      const remainingMs = this.state.estimatedCompletion.getTime() - Date.now()
      const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000))
      timeEl.textContent = this.formatTimeRemaining(remainingSeconds)
    }

    // Status indicator
    const statusEl = detailsEl.createDiv('tagfolder-progress-status-indicator')
    statusEl.addClass(`tagfolder-status-${this.state.status}`)
    statusEl.textContent = this.getStatusText()
  }

  /**
   * Render controls
   */
  private renderControls(): void {
    if (!this.options.cancellable && this.state.status === 'running') {
      return
    }

    const controlsEl = this.containerEl.createDiv('tagfolder-progress-controls')

    if (this.options.cancellable && this.state.status === 'running') {
      const cancelButton = controlsEl.createEl('button', { cls: 'tagfolder-progress-cancel' })
      cancelButton.textContent = 'Cancel'
      cancelButton.addEventListener('click', () => {
        this.cancel()
      })
    }

    if (this.state.status === 'cancelled' || this.state.status === 'error') {
      const retryButton = controlsEl.createEl('button', { cls: 'tagfolder-progress-retry' })
      retryButton.textContent = 'Retry'
      retryButton.addEventListener('click', () => {
        this.state.status = 'running'
        if ('error' in this.state) {
          delete this.state.error
        }
        this.render()
      })
    }

    if (this.state.status === 'completed') {
      const dismissButton = controlsEl.createEl('button', { cls: 'tagfolder-progress-dismiss' })
      dismissButton.textContent = 'Dismiss'
      dismissButton.addEventListener('click', () => {
        this.hide()
      })
    }
  }

  /**
   * Update display elements
   */
  private updateDisplay(): void {
    if (this.progressBar) {
      this.progressBar.setValue(this.state.percentage / 100)
    }

    // Update circular SVG if present
    const circularProgress = this.containerEl.querySelector('.tagfolder-circular-progress svg circle:last-child')
    if (circularProgress) {
      const circumference = 2 * Math.PI * 45
      const offset = circumference - (this.state.percentage / 100) * circumference
      const svgElement = circularProgress as SVGElement
      svgElement.style.strokeDashoffset = String(offset)
    }

    // Update details
    const detailsEl = this.containerEl.querySelector('.tagfolder-progress-details')
    if (detailsEl) {
      detailsEl.textContent = ''
      this.renderDetails(detailsEl.parentElement as HTMLElement)
    }
  }

  /**
   * Start progress tracking interval
   */
  private startProgressTracking(): void {
    this.stopProgressTracking()

    this.intervalId = setInterval(() => {
      this.updateDisplay()
      this.emitProgressEvent('progress')
    }, 1000)
  }

  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Emit progress event
   */
  private emitProgressEvent(event: string): void {
    const eventData: { operationId: string; progress: number; message?: string } = {
      operationId: this.operationId,
      progress: this.state.percentage / 100
    }
    if (this.state.current) {
      eventData.message = this.state.current
    }
    eventEmitter.emit('operation-progress', eventData)
  }

  /**
   * Get status text
   */
  private getStatusText(): string {
    switch (this.state.status) {
      case 'running':
        return 'Processing...'
      case 'paused':
        return 'Paused'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      case 'error':
        return 'Error'
      default:
        return ''
    }
  }

  /**
   * Format time remaining
   */
  private formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s remaining`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s remaining`
    } else {
      const hours = Math.floor(seconds / 3600)
      const remainingMinutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${remainingMinutes}m remaining`
    }
  }

  /**
   * Create spinner SVG
   */
  private createSpinnerSVG(): string {
    return `
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `
  }

  /**
   * Create circular progress SVG
   */
  private createCircularSVG(): string {
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (this.state.percentage / 100) * circumference

    return `
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e0e0e0" stroke-width="8"/>
        <circle cx="60" cy="60" r="45" fill="none" stroke="${this.options.color}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 60 60)"/>
        <text x="60" y="60" text-anchor="middle" dy="0.3em" font-size="24" fill="${this.options.color}">
          ${Math.round(this.state.percentage)}%
        </text>
      </svg>
    `
  }
}

/**
 * Progress Manager - Manages multiple progress indicators
 */
export class ProgressManager {
  private indicators: Map<string, ProgressIndicator> = new Map()
  private containerEl: HTMLElement

  constructor(app: App, container: HTMLElement) {
    this.containerEl = container
  }

  /**
   * Create a new progress indicator
   */
  createProgress(id: string, type: ProgressType = 'bar', options: Partial<ProgressOptions> = {}): ProgressIndicator {
    // Remove existing indicator with same ID
    if (this.indicators.has(id)) {
      this.removeProgress(id)
    }

    const indicatorContainer = this.containerEl.createDiv('tagfolder-progress-item')
    indicatorContainer.setAttribute('data-progress-id', id)

    const indicator = new ProgressIndicator(
      {} as App, // App instance not needed for basic functionality
      indicatorContainer,
      type,
      options
    )

    this.indicators.set(id, indicator)
    return indicator
  }

  /**
   * Get progress indicator by ID
   */
  getProgress(id: string): ProgressIndicator | undefined {
    return this.indicators.get(id)
  }

  /**
   * Remove progress indicator
   */
  removeProgress(id: string): void {
    const indicator = this.indicators.get(id)
    if (indicator) {
      indicator.hide()
      this.indicators.delete(id)
    }
  }

  /**
   * Hide all progress indicators
   */
  hideAll(): void {
    for (const [id, indicator] of this.indicators.entries()) {
      indicator.hide()
    }
    this.indicators.clear()
  }

  /**
   * Show summary of all active progress
   */
  showSummary(): void {
    if (this.indicators.size === 0) return

    const summaryEl = this.containerEl.createDiv('tagfolder-progress-summary')
    summaryEl.textContent = `${this.indicators.size} operations in progress`
  }
}