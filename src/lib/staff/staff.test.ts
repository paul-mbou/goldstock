import { describe, expect, it } from 'vitest';
import {
  asDepositStatus,
  asMemberStatus,
  asNotificationKind,
  asRole,
  dateFromDay,
  dayFromDate,
  mapDeposit,
  mapMember,
  mapNotification,
  type DepositRow,
  type MemberRow,
  type NotificationRow,
} from './types';

describe('mappers', () => {
  it('maps a shop member including shop scope and last seen', () => {
    const row: MemberRow = {
      id: 'm1',
      shop_id: 'shop-1',
      name: 'Amina Ngono',
      role: 'manager',
      phone: '+237 6 99 00 00 00',
      email: 'amina@exemple.com',
      user_id: 'auth-1',
      shop_scope: 'Akwa',
      status: 'active',
      last_seen: '2026-10-23T12:00:00.000Z',
    };
    const member = mapMember(row);
    expect(member.id).toBe('m1');
    expect(member.role).toBe('manager');
    expect(member.email).toBe('amina@exemple.com');
    expect(member.shop).toBe('Akwa');
    expect(member.lastSeen).toBe(new Date(row.last_seen!).getTime());
    expect(asRole('nope')).toBe('seller');
    expect(asMemberStatus('nope')).toBe('active');
  });

  it('maps a deposit and its Douala calendar day', () => {
    const row: DepositRow = {
      id: 'dep-1',
      shop_id: 'shop-1',
      day: '2026-10-22',
      shop_name: 'Akwa',
      manager_name: 'Amina',
      expected: 100000,
      deposited: 95000,
      deposited_at: '2026-10-22T18:00:00.000Z',
      method: 'Espèces',
      reference: '',
      comment: 'Client a payé demain',
      status: 'pending',
      note: '',
    };
    const deposit = mapDeposit(row);
    expect(deposit.id).toBe('dep-1');
    expect(deposit.day).toBe(dayFromDate('2026-10-22'));
    expect(dateFromDay(deposit.day)).toBe('2026-10-22');
    expect(deposit.status).toBe('pending');
    expect(asDepositStatus('nope')).toBe('pending');
  });

  it('maps a notification and keeps role restrictions', () => {
    const row: NotificationRow = {
      id: 'n-dep-1',
      shop_id: 'shop-1',
      kind: 'deposit',
      title: 'Versement à vérifier',
      body: 'Amina a remis 95 000 F',
      at: '2026-10-22T18:00:00.000Z',
      read: false,
      href: '/app/versements',
      roles: ['owner'],
    };
    const notification = mapNotification(row);
    expect(notification.id).toBe('n-dep-1');
    expect(notification.roles).toEqual(['owner']);
    expect(asNotificationKind('nope')).toBe('system');
  });
});
