import { describeStatus, formatInr, formatIstDate, includedFeatures } from '../billingLogic';
import type { ProductStatus } from '@/src/api/billing';

const base: ProductStatus = {
  product: 'VERIFIED',
  active: false,
  valid_until: null,
  renewable_from: null,
  can_renew: true,
  expired_at: null,
};

describe('billingLogic', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatInr(189900)).toBe('₹1,899');
    expect(formatInr(3000000)).toBe('₹30,000');
    expect(formatInr(1234567800)).toBe('₹1,23,45,678');
    expect(formatInr(159950)).toBe('₹1,599.50');
  });

  it('formats dates in IST regardless of device zone', () => {
    // 20:00 UTC on 3 Nov is already 4 Nov in India.
    expect(formatIstDate('2027-11-03T20:00:00Z')).toBe('4 Nov 2027');
    expect(formatIstDate(null)).toBe('');
  });

  it('never shows dates for free (freemium) access', () => {
    expect(describeStatus({ ...base, active: true, trial: true, can_renew: true, valid_until: null }))
      .toEqual({ text: 'Free access', tone: 'active' });
  });

  it('describes each membership state', () => {
    expect(describeStatus(base)).toEqual({ text: 'Not active', tone: 'none' });
    expect(describeStatus({ ...base, active: true, can_renew: false, valid_until: '2027-11-04T10:00:00Z' }))
      .toEqual({ text: 'Active until 4 Nov 2027', tone: 'active' });
    expect(describeStatus({ ...base, active: true, can_renew: true, valid_until: '2027-11-04T10:00:00Z' }).tone).toBe('renew');
    expect(describeStatus({ ...base, expired_at: '2026-01-01T00:00:00Z' }))
      .toEqual({ text: 'Expired on 1 Jan 2026', tone: 'expired' });
  });

  it('lists only included features, with limits', () => {
    expect(
      includedFeatures([
        { key: 'connect', label: 'Connect', kind: 'BOOL', enabled: true, limit: 0 },
        { key: 'project_upload', label: 'Project uploads', kind: 'LIMIT', enabled: true, limit: 9 },
        { key: 'group_chat', label: 'Group chat', kind: 'BOOL', enabled: false, limit: 0 },
        { key: 'advertisement', label: 'Advertisements', kind: 'LIMIT', enabled: true, limit: 0 },
      ]),
    ).toEqual(['Connect', 'Project uploads (up to 9)']);
  });
});
