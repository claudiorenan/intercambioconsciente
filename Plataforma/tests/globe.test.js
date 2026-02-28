import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load globe.js into the jsdom global scope
beforeAll(() => {
  const code = readFileSync(resolve(__dirname, '../js/globe.js'), 'utf-8');
  eval(code);
});

// ---------------------------------------------------------------------------
// Globe.init — graceful degradation when THREE is missing
// ---------------------------------------------------------------------------

describe('Globe.init', () => {
  beforeEach(() => {
    // Ensure THREE is NOT defined so we test the fallback path
    delete window.THREE;
  });

  it('should be available on window.Globe', () => {
    expect(window.Globe).toBeDefined();
    expect(typeof window.Globe.init).toBe('function');
    expect(typeof window.Globe.animateCounters).toBe('function');
  });

  it('should return false when THREE is not defined', () => {
    // Create container and canvas in the DOM
    const container = document.createElement('div');
    container.id = 'heroMapSection';
    const canvas = document.createElement('canvas');
    canvas.id = 'mapCanvas';
    document.body.appendChild(container);
    document.body.appendChild(canvas);

    const result = window.Globe.init('heroMapSection', 'mapCanvas');

    expect(result).toBe(false);

    // Cleanup
    container.remove();
    canvas.remove();
  });

  it('should return false when container element is missing', () => {
    const result = window.Globe.init('nonExistentContainer', 'nonExistentCanvas');
    expect(result).toBe(false);
  });

  it('should not throw when THREE is undefined', () => {
    const container = document.createElement('div');
    container.id = 'testGlobeContainer';
    const canvas = document.createElement('canvas');
    canvas.id = 'testGlobeCanvas';
    document.body.appendChild(container);
    document.body.appendChild(canvas);

    expect(() => {
      window.Globe.init('testGlobeContainer', 'testGlobeCanvas');
    }).not.toThrow();

    container.remove();
    canvas.remove();
  });
});

// ---------------------------------------------------------------------------
// Globe.animateCounters — IntersectionObserver integration
// ---------------------------------------------------------------------------

describe('Globe.animateCounters', () => {
  let observedElements;
  let observerCallback;

  beforeEach(() => {
    observedElements = [];

    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn((callback) => {
      observerCallback = callback;
      return {
        observe: vi.fn((el) => observedElements.push(el)),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });
  });

  it('should observe all .map-stat-number[data-target] elements', () => {
    // Create stat elements
    const stat1 = document.createElement('span');
    stat1.className = 'map-stat-number';
    stat1.dataset.target = '15';
    stat1.textContent = '0';
    document.body.appendChild(stat1);

    const stat2 = document.createElement('span');
    stat2.className = 'map-stat-number';
    stat2.dataset.target = '247';
    stat2.textContent = '0';
    document.body.appendChild(stat2);

    window.Globe.animateCounters();

    expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(observedElements).toHaveLength(2);
    expect(observedElements[0]).toBe(stat1);
    expect(observedElements[1]).toBe(stat2);

    // Cleanup
    stat1.remove();
    stat2.remove();
  });

  it('should start count-up animation when element intersects', () => {
    vi.useFakeTimers();

    const stat = document.createElement('span');
    stat.className = 'map-stat-number';
    stat.dataset.target = '100';
    stat.textContent = '0';
    document.body.appendChild(stat);

    window.Globe.animateCounters();

    // Simulate intersection
    observerCallback([
      { isIntersecting: true, target: stat },
    ]);

    // Run rAF callbacks — vitest fake timers handle requestAnimationFrame
    vi.advanceTimersByTime(2000);

    // After 2s (well past the 1500ms duration) the counter should reach 100
    expect(parseInt(stat.textContent, 10)).toBe(100);

    stat.remove();
    vi.useRealTimers();
  });

  it('should not animate elements that are not intersecting', () => {
    const stat = document.createElement('span');
    stat.className = 'map-stat-number';
    stat.dataset.target = '50';
    stat.textContent = '0';
    document.body.appendChild(stat);

    window.Globe.animateCounters();

    // Simulate non-intersection
    observerCallback([
      { isIntersecting: false, target: stat },
    ]);

    expect(stat.textContent).toBe('0');

    stat.remove();
  });

  it('should handle no stat elements gracefully', () => {
    // Remove any stat elements that might exist
    document.querySelectorAll('.map-stat-number').forEach(el => el.remove());

    expect(() => {
      window.Globe.animateCounters();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Globe._countUp — unit test for the eased animation helper
// ---------------------------------------------------------------------------

describe('Globe._countUp', () => {
  it('should animate element textContent from 0 to target', () => {
    vi.useFakeTimers();

    const el = document.createElement('span');
    el.textContent = '0';
    document.body.appendChild(el);

    window.Globe._countUp(el, 200);

    // After full duration + buffer
    vi.advanceTimersByTime(2000);

    expect(parseInt(el.textContent, 10)).toBe(200);

    el.remove();
    vi.useRealTimers();
  });

  it('should show intermediate values during animation', () => {
    vi.useFakeTimers();

    const el = document.createElement('span');
    el.textContent = '0';
    document.body.appendChild(el);

    window.Globe._countUp(el, 1000);

    // Advance ~half the duration
    vi.advanceTimersByTime(750);

    const midValue = parseInt(el.textContent, 10);
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(1000);

    // Finish
    vi.advanceTimersByTime(1000);
    expect(parseInt(el.textContent, 10)).toBe(1000);

    el.remove();
    vi.useRealTimers();
  });

  it('should handle target of 0', () => {
    vi.useFakeTimers();

    const el = document.createElement('span');
    el.textContent = '5';
    document.body.appendChild(el);

    window.Globe._countUp(el, 0);

    vi.advanceTimersByTime(2000);

    expect(parseInt(el.textContent, 10)).toBe(0);

    el.remove();
    vi.useRealTimers();
  });
});
