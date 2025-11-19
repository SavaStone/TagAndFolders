/**
 * Test setup file for Vitest
 */

import { vi } from 'vitest'

// Mock Obsidian API
global.vi = vi

// Mock Obsidian module
vi.mock('obsidian', () => ({
  App: vi.fn(),
  TFile: vi.fn(),
  TFolder: vi.fn(),
  TAbstractFile: vi.fn(),
  Notice: vi.fn(),
  Modal: vi.fn(),
  Setting: vi.fn(),
  Plugin: vi.fn(),
  Workspace: vi.fn(),
  Vault: vi.fn(),
  FileSystemAdapter: vi.fn(),
  Platform: {
    isMac: false,
    isWin: false,
    isLinux: true
  }
}))

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
} as any

// Set up test environment
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  writable: true
})