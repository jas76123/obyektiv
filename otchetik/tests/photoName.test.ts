import { describe, expect, it } from 'vitest';
import { parsePhotoFile, photoFileName } from '../lib/photoName';

describe('photoFileName', () => {
  it('бригада, наряд и uuid через точку', () => {
    expect(photoFileName('br-1', 't-doors-0922', '9a1b')).toBe('br-1.t-doors-0922.9a1b.jpg');
  });
  it('без бригады — unknown', () => {
    expect(photoFileName(null, 't', 'u')).toBe('unknown.t.u.jpg');
    expect(photoFileName('', 't', 'u')).toBe('unknown.t.u.jpg');
  });
});

describe('parsePhotoFile', () => {
  it('имя из /photos: server_id, подчёркивание, наше имя', () => {
    expect(parsePhotoFile('997c7740-90dd_br-1.t-doors-0922.9a1b.jpg')).toEqual({ brigade_id: 'br-1', task_id: 't-doors-0922', local_uuid: '9a1b' });
    expect(parsePhotoFile('1790352918.505692_br-2.t-rebar-0922.u.JPG')).toEqual({ brigade_id: 'br-2', task_id: 't-rebar-0922', local_uuid: 'u' });
  });
  it('чужие и старые имена → null', () => {
    expect(parsePhotoFile('997c7740-90dd-445d-a7dc-d517b2c794ec_t.jpg')).toBeNull();
    expect(parsePhotoFile('1790352918.505692_1000_F_220676590_4zfuo3TKXbys7xkC4Nx0YYFcMzkCkHTf.jpg')).toBeNull();
    expect(parsePhotoFile('abc_9a1b.jpg')).toBeNull();
    expect(parsePhotoFile('')).toBeNull();
  });
  it('обратно к photoFileName', () => {
    expect(parsePhotoFile('srv_' + photoFileName('br-3', 't-x', 'u-1'))).toEqual({ brigade_id: 'br-3', task_id: 't-x', local_uuid: 'u-1' });
  });
});
