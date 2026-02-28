import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the modules that feed.js depends on, then feed.js itself
beforeAll(() => {
  eval(readFileSync(resolve(__dirname, '../js/error-handler.js'), 'utf-8'));
  eval(readFileSync(resolve(__dirname, '../js/validation.js'), 'utf-8'));
  eval(readFileSync(resolve(__dirname, '../js/feed.js'), 'utf-8'));
});

// Reset global mocks before each test
beforeEach(() => {
  window.supabaseClient = null;
  window.Auth = { currentUser: null };
});

// ---------------------------------------------------------------------------
// checkRateLimit (standalone function on window)
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  it('should return allowed:true when supabaseClient is null', async () => {
    window.supabaseClient = null;
    const result = await checkRateLimit('create_post');
    expect(result.allowed).toBe(true);
  });

  it('should return allowed:true for an unknown action', async () => {
    window.supabaseClient = { rpc: vi.fn() };
    const result = await checkRateLimit('unknown_action');
    expect(result.allowed).toBe(true);
  });

  it('should call supabase rpc with correct params for create_post', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
    window.supabaseClient = { rpc: rpcMock };

    await checkRateLimit('create_post');

    expect(rpcMock).toHaveBeenCalledWith('check_rate_limit', {
      p_action: 'create_post',
      p_max: 10,
      p_window_seconds: 3600,
    });
  });

  it('should call supabase rpc with correct params for create_reply', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
    window.supabaseClient = { rpc: rpcMock };

    await checkRateLimit('create_reply');

    expect(rpcMock).toHaveBeenCalledWith('check_rate_limit', {
      p_action: 'create_reply',
      p_max: 30,
      p_window_seconds: 3600,
    });
  });

  it('should return the rpc result when successful', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    };

    const result = await checkRateLimit('create_post');
    expect(result.allowed).toBe(false);
    expect(result.max).toBe(10);
  });

  it('should return allowed:true when rpc returns an error', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    };

    const result = await checkRateLimit('create_post');
    expect(result.allowed).toBe(true);
  });

  it('should return allowed:true when rpc throws an exception', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockRejectedValue(new Error('network down')),
    };

    const result = await checkRateLimit('create_post');
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Feed.loadPosts
// ---------------------------------------------------------------------------

describe('Feed.loadPosts', () => {
  it('should return empty array when supabaseClient is null', async () => {
    window.supabaseClient = null;
    const posts = await Feed.loadPosts();
    expect(posts).toEqual([]);
  });

  it('should query feed_posts with correct defaults', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    window.supabaseClient = { from: fromMock };

    await Feed.loadPosts();

    expect(fromMock).toHaveBeenCalledWith('feed_posts');
    expect(selectMock).toHaveBeenCalledWith('*, profiles(name, photo_url)');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rangeMock).toHaveBeenCalledWith(0, 19); // offset=0, limit=20 => range(0, 19)
  });

  it('should apply topic filter when not "all"', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const rangeMock = vi.fn().mockReturnValue({ eq: eqMock });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    window.supabaseClient = { from: fromMock };

    await Feed.loadPosts('dicas');

    expect(eqMock).toHaveBeenCalledWith('topic', 'dicas');
  });

  it('should return empty array on supabase error', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    window.supabaseClient = { from: fromMock };

    const result = await Feed.loadPosts();
    expect(result).toEqual([]);
  });

  it('should return data array on success', async () => {
    const posts = [{ id: 1, content: 'hello' }];
    const rangeMock = vi.fn().mockResolvedValue({ data: posts, error: null });
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
    const selectMock = vi.fn().mockReturnValue({ order: orderMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    window.supabaseClient = { from: fromMock };

    const result = await Feed.loadPosts();
    expect(result).toEqual(posts);
  });
});

// ---------------------------------------------------------------------------
// Feed.createPost
// ---------------------------------------------------------------------------

describe('Feed.createPost', () => {
  it('should reject when rate-limited', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    };

    const result = await Feed.createPost('Hello world', 'dicas');
    expect(result.error).toContain('Limite');
    expect(result.error).toContain('10');
  });

  it('should block posts containing phone numbers', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createPost('+55 11 99999-1234', 'dicas');
    expect(result.error).toContain('bloqueado');
    expect(result.error).toContain('numero de telefone');
  });

  it('should block posts containing email addresses', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createPost('contact me@email.com', 'dicas');
    expect(result.error).toContain('bloqueado');
    expect(result.error).toContain('endereco de email');
  });

  it('should block posts containing URLs', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createPost('visit https://spam.com', 'dicas');
    expect(result.error).toContain('bloqueado');
    expect(result.error).toContain('link externo');
  });

  it('should block posts containing social handles', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createPost('follow me @myinsta', 'dicas');
    expect(result.error).toContain('bloqueado');
    expect(result.error).toContain('rede social');
  });

  it('should insert a valid post into supabase', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: fromMock,
    };
    window.Auth = { currentUser: { id: 'user-1' } };

    const result = await Feed.createPost('Great experience abroad!', 'relatos');

    expect(fromMock).toHaveBeenCalledWith('feed_posts');
    expect(insertMock).toHaveBeenCalledWith({
      content: 'Great experience abroad!',
      topic: 'relatos',
      is_anonymous: false,
      user_id: 'user-1',
    });
    expect(result.post).toEqual({ id: 'p1' });
    expect(result.error).toBeNull();
  });

  it('should return supabase error message on insert failure', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: fromMock,
    };
    window.Auth = { currentUser: { id: 'user-1' } };

    const result = await Feed.createPost('Valid post text', 'dicas');
    expect(result.error).toBe('insert failed');
  });

  it('should trim content before inserting', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'p2' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: fromMock,
    };
    window.Auth = { currentUser: { id: 'user-1' } };

    await Feed.createPost('  padded text  ', 'dicas');

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'padded text' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Feed.createReply
// ---------------------------------------------------------------------------

describe('Feed.createReply', () => {
  it('should reject when rate-limited', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    };

    const result = await Feed.createReply('post-1', 'Nice post!');
    expect(result.error).toContain('Limite');
    expect(result.error).toContain('30');
  });

  it('should block replies containing URLs', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createReply('post-1', 'check https://spam.com');
    expect(result.error).toContain('bloqueado');
  });

  it('should block replies containing emails', async () => {
    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    const result = await Feed.createReply('post-1', 'email me at a@b.com');
    expect(result.error).toContain('bloqueado');
  });

  it('should insert a valid reply into supabase', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });

    window.supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: fromMock,
    };
    window.Auth = { currentUser: { id: 'user-2' } };

    const result = await Feed.createReply('post-1', 'Great insight!');

    expect(fromMock).toHaveBeenCalledWith('post_replies');
    expect(insertMock).toHaveBeenCalledWith({
      post_id: 'post-1',
      content: 'Great insight!',
      user_id: 'user-2',
    });
    expect(result.reply).toEqual({ id: 'r1' });
    expect(result.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Feed.loadReplies
// ---------------------------------------------------------------------------

describe('Feed.loadReplies', () => {
  it('should return empty array when supabaseClient is null', async () => {
    window.supabaseClient = null;
    const replies = await Feed.loadReplies('post-1');
    expect(replies).toEqual([]);
  });

  it('should query post_replies filtered by post_id', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    window.supabaseClient = { from: fromMock };

    await Feed.loadReplies('post-42');

    expect(fromMock).toHaveBeenCalledWith('post_replies');
    expect(eqMock).toHaveBeenCalledWith('post_id', 'post-42');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});

// ---------------------------------------------------------------------------
// Feed.reactToPost
// ---------------------------------------------------------------------------

describe('Feed.reactToPost', () => {
  it('should do nothing when supabaseClient is null', async () => {
    window.supabaseClient = null;
    // Should not throw
    await expect(Feed.reactToPost('post-1')).resolves.toBeUndefined();
  });

  it('should upsert a reaction with default "apoio"', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock });

    window.supabaseClient = { from: fromMock };
    window.Auth = { currentUser: { id: 'user-1' } };

    await Feed.reactToPost('post-1');

    expect(fromMock).toHaveBeenCalledWith('post_reactions');
    expect(upsertMock).toHaveBeenCalledWith({
      post_id: 'post-1',
      user_id: 'user-1',
      reaction: 'apoio',
    });
  });

  it('should upsert with a custom reaction type', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock });

    window.supabaseClient = { from: fromMock };
    window.Auth = { currentUser: { id: 'user-1' } };

    await Feed.reactToPost('post-1', 'coracao');

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ reaction: 'coracao' }),
    );
  });
});
