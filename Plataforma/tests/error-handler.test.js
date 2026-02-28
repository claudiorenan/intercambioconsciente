import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load error-handler.js into the jsdom global scope
beforeAll(() => {
  const code = readFileSync(resolve(__dirname, '../js/error-handler.js'), 'utf-8');
  eval(code);
});

// Reset the toast container between tests
beforeEach(() => {
  const container = document.getElementById('toastContainer');
  if (container) container.innerHTML = '';
});

// ---------------------------------------------------------------------------
// ErrorHandler.handle
// ---------------------------------------------------------------------------

describe('ErrorHandler.handle', () => {
  it('should log the error to console.error with context prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('test error');
    ErrorHandler.handle('TestCtx', err);
    expect(spy).toHaveBeenCalledWith('[TestCtx]', 'test error', err);
    spy.mockRestore();
  });

  it('should show a toast for non-silent errors', () => {
    ErrorHandler.handle('Ctx', new Error('visible error'));
    const container = document.getElementById('toastContainer');
    expect(container.children.length).toBe(1);
    expect(container.children[0].textContent).toBe('visible error');
  });

  it('should NOT show a toast when opts.silent is true', () => {
    ErrorHandler.handle('Ctx', new Error('silent error'), { silent: true });
    const container = document.getElementById('toastContainer');
    expect(container.children.length).toBe(0);
  });

  it('should handle string errors (not Error objects)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ErrorHandler.handle('Ctx', 'raw string error');
    // String(error) falls through because error?.message is undefined
    expect(spy).toHaveBeenCalledWith('[Ctx]', 'raw string error', 'raw string error');
    spy.mockRestore();
  });

  it('should display the error message in the toast', () => {
    ErrorHandler.handle('Ctx', new Error('user-facing msg'));
    const toast = document.querySelector('#toastContainer .toast');
    expect(toast.textContent).toBe('user-facing msg');
  });
});

// ---------------------------------------------------------------------------
// ErrorHandler.showToast
// ---------------------------------------------------------------------------

describe('ErrorHandler.showToast', () => {
  it('should create a toast element inside the container', () => {
    ErrorHandler.showToast('info message', 'info');
    const container = document.getElementById('toastContainer');
    expect(container.children.length).toBe(1);
  });

  it('should apply the correct CSS class based on type', () => {
    ErrorHandler.showToast('msg', 'info');
    const toast = document.querySelector('#toastContainer .toast');
    expect(toast.className).toBe('toast info');
  });

  it('should default the type to "info"', () => {
    ErrorHandler.showToast('default type');
    const toast = document.querySelector('#toastContainer .toast');
    expect(toast.className).toBe('toast info');
  });

  it('should set the toast text content', () => {
    ErrorHandler.showToast('hello world', 'info');
    const toast = document.querySelector('#toastContainer .toast');
    expect(toast.textContent).toBe('hello world');
  });

  it('should auto-remove the toast after duration + animation time', () => {
    vi.useFakeTimers();

    ErrorHandler.showToast('temp', 'info', 1000);
    const container = document.getElementById('toastContainer');
    expect(container.children.length).toBe(1);

    // After duration (1000ms) the fade-out starts
    vi.advanceTimersByTime(1000);
    // After the 300ms animation the element is removed
    vi.advanceTimersByTime(300);
    expect(container.children.length).toBe(0);

    vi.useRealTimers();
  });

  it('should do nothing when toastContainer does not exist', () => {
    // Temporarily remove the container
    const container = document.getElementById('toastContainer');
    container.remove();

    // Should not throw
    expect(() => ErrorHandler.showToast('orphan', 'info')).not.toThrow();

    // Restore for subsequent tests
    document.body.appendChild(container);
  });

  it('should support multiple toasts at the same time', () => {
    ErrorHandler.showToast('first', 'info');
    ErrorHandler.showToast('second', 'error');
    const container = document.getElementById('toastContainer');
    expect(container.children.length).toBe(2);
  });
});
