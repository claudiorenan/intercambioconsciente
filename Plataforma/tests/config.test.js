import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const configCode = readFileSync(resolve(__dirname, '../js/config.js'), 'utf-8');

// Re-evaluate config.js before each test so _loaded resets
beforeEach(() => {
  delete window.__IC_CONFIG__;
  eval(configCode);
});

// ---------------------------------------------------------------------------
// AppConfig
// ---------------------------------------------------------------------------

describe('AppConfig', () => {
  it('should start with empty supabaseUrl and supabaseAnonKey', () => {
    expect(AppConfig.supabaseUrl).toBe('');
    expect(AppConfig.supabaseAnonKey).toBe('');
  });

  it('should start with _loaded === false', () => {
    expect(AppConfig._loaded).toBe(false);
  });

  describe('load() with config.json available', () => {
    it('should populate fields from a successful fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          SUPABASE_URL: 'https://prod.supabase.co',
          SUPABASE_ANON_KEY: 'prod-key-456',
        }),
      });

      await AppConfig.load();

      expect(AppConfig.supabaseUrl).toBe('https://prod.supabase.co');
      expect(AppConfig.supabaseAnonKey).toBe('prod-key-456');
    });

    it('should set _loaded to true after loading', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k' }),
      });

      await AppConfig.load();
      expect(AppConfig._loaded).toBe(true);
    });

    it('should return the AppConfig object', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k' }),
      });

      const result = await AppConfig.load();
      expect(result).toBe(AppConfig);
    });
  });

  describe('load() with config.json unavailable', () => {
    it('should fall back to __IC_CONFIG__ when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      window.__IC_CONFIG__ = {
        SUPABASE_URL: 'https://fallback.supabase.co',
        SUPABASE_ANON_KEY: 'fallback-key',
      };

      await AppConfig.load();

      expect(AppConfig.supabaseUrl).toBe('https://fallback.supabase.co');
      expect(AppConfig.supabaseAnonKey).toBe('fallback-key');
    });

    it('should fall back to __IC_CONFIG__ when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      window.__IC_CONFIG__ = {
        SUPABASE_URL: 'https://inline.supabase.co',
        SUPABASE_ANON_KEY: 'inline-key',
      };

      await AppConfig.load();

      expect(AppConfig.supabaseUrl).toBe('https://inline.supabase.co');
      expect(AppConfig.supabaseAnonKey).toBe('inline-key');
    });

    it('should remain empty when no fallback is available', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('not found'));

      await AppConfig.load();

      expect(AppConfig.supabaseUrl).toBe('');
      expect(AppConfig.supabaseAnonKey).toBe('');
    });

    it('should not throw on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('boom'));
      await expect(AppConfig.load()).resolves.toBeDefined();
    });
  });

  describe('caching (only loads once)', () => {
    it('should not call fetch a second time', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ SUPABASE_URL: 'https://first.supabase.co', SUPABASE_ANON_KEY: 'k1' }),
      });
      global.fetch = fetchMock;

      await AppConfig.load();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call should be a no-op
      await AppConfig.load();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should keep the values from the first load', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ SUPABASE_URL: 'https://first.supabase.co', SUPABASE_ANON_KEY: 'key1' }),
      });

      await AppConfig.load();

      // Replace mock with different values
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ SUPABASE_URL: 'https://second.supabase.co', SUPABASE_ANON_KEY: 'key2' }),
      });

      await AppConfig.load();
      expect(AppConfig.supabaseUrl).toBe('https://first.supabase.co');
    });
  });

  describe('__IC_CONFIG__ is only a fallback', () => {
    it('should NOT use __IC_CONFIG__ when config.json provides values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          SUPABASE_URL: 'https://from-json.supabase.co',
          SUPABASE_ANON_KEY: 'json-key',
        }),
      });

      window.__IC_CONFIG__ = {
        SUPABASE_URL: 'https://from-global.supabase.co',
        SUPABASE_ANON_KEY: 'global-key',
      };

      await AppConfig.load();

      // config.json wins — __IC_CONFIG__ is only checked if supabaseUrl is still empty
      expect(AppConfig.supabaseUrl).toBe('https://from-json.supabase.co');
    });
  });
});
