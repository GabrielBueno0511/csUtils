import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { APP_SETTINGS } from '../config/app-settings';
import { SupabaseService } from './supabase.service';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'player@example.com', user_metadata: { name: 'Jogador' } };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const utility = { spot_id: 'Smoke CT', spot_name: 'ct', map_name: 'mirage', throw_type: 'normal', player_position_image: png, aim_position_image: png };

describe('SupabaseService', () => {
  let service: SupabaseService;
  let auth: any;
  let storage: any;
  let query: any;
  let client: any;
  beforeEach(() => {
    auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    };
    storage = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: 'https://example.test/' + path } })),
    };
    query = { insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve, reject) };
    client = { auth, storage: { from: vi.fn().mockReturnValue(storage) }, from: vi.fn().mockReturnValue(query) };
    vi.mocked(createClient).mockReturnValue(client);
    TestBed.configureTestingModule({ providers: [{ provide: APP_SETTINGS,
      useValue: { backend: 'supabase', supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'public-test' } }] });
    service = TestBed.inject(SupabaseService);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns a confirmation notice instead of logging in an unconfirmed registration', async () => {
    expect(await service.register(' Jogador ', ' player@example.com ', 'long-password')).toEqual({user: null, confirmationRequired: true});
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: user.email, options: expect.objectContaining({data: {name: 'Jogador'}}) }));
  });

  it('requires authentication before upload and refuses external image URLs', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(service.createUtility(utility)).rejects.toMatchObject({status: 401});
    await expect(service.createUtility({...utility,player_position_image:'https://external.test/image.png'})).rejects.toMatchObject({status:400});
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('cleans uploaded images when saving the row fails', async () => {
    query.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } });
    await expect(service.createUtility(utility)).rejects.toMatchObject({status:400});
    expect(storage.upload).toHaveBeenCalledTimes(2);
    const paths = storage.upload.mock.calls.map((call: any[]) => call[0]);
    expect(paths.every((path: string) => path.startsWith(user.id + '/'))).toBe(true);
    expect(storage.remove).toHaveBeenCalledWith(paths);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ author_id: user.id, player_position_image: paths[0] }));
  });

  it('does not delete Storage objects when row deletion is denied', async () => {
    query.single.mockResolvedValue({ data: null, error: { message: 'denied', code: '42501' } });
    await expect(service.deleteUtility('5')).rejects.toBeDefined();
    expect(query.eq).toHaveBeenCalledWith('author_id',user.id);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('deletes images only after successful row deletion', async () => {
    query.single.mockResolvedValue({ data: { id: 5,player_position_image:'owner/position.png',aim_position_image:'owner/aim.png' },error:null });
    await service.deleteUtility('5');
    expect(storage.remove).toHaveBeenCalledWith(['owner/position.png','owner/aim.png']);
  });

  it('inserts new admin spots into the shared catalog', async () => {
    await service.saveAdminSpot({ mapId: 'dust2', spotId: 'altar', name: 'Altar', isCustom: true, image: null, removeImage: false });
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      map_id: 'dust2', spot_id: 'altar', name: 'Altar', is_custom: true,
    }));
    expect(query.update).not.toHaveBeenCalled();
  });

  it('updates only a spot name and image fields, leaving its map and id fixed', async () => {
    query.maybeSingle.mockResolvedValue({ data: { image_path: null, image_cleared: false }, error: null });
    await service.saveAdminSpot({ mapId: 'dust2', spotId: 'altar', name: 'Bomb/Altar', isCustom: true, image: null, removeImage: false });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bomb/Altar', image_path: null, image_cleared: false }));
    expect(query.insert).not.toHaveBeenCalled();
  });
});
