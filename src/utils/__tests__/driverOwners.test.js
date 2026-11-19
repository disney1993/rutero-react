import { driverOwnerEntries } from '../driverOwners';

const TODAY = '2026-11-19';
const owner = (id) => ({ id, first_name: `Owner ${id}` });
const monthCode = (ownerId, month = '2026-11') => ({
  id: `m${ownerId}${month}`,
  owner_month_code: { owner_id: ownerId, owner: owner(ownerId), type: 'month', month },
});
const dayCode = (ownerId, validOn = TODAY) => ({
  id: `d${ownerId}${validOn}`,
  owner_month_code: { owner_id: ownerId, owner: owner(ownerId), type: 'day', valid_on: validOn, month: validOn.slice(0, 7) },
});
const ownerIds = (entries) => entries.map((e) => e.owner_month_code.owner_id);

describe('driverOwnerEntries', () => {
  it('shows one entry per owner when the driver used the month and today codes of the same owner', () => {
    expect(ownerIds(driverOwnerEntries([monthCode(2), dayCode(2)], [], TODAY))).toEqual([2]);
  });

  it('prefers the team link over codes of the same owner', () => {
    const entries = driverOwnerEntries([monthCode(2), dayCode(2)], [{ id: 9, owner_id: 2, owner: owner(2) }], TODAY);
    expect(entries).toHaveLength(1);
    expect(entries[0].team).toBe(true);
  });

  it('keeps different owners and drops codes that are not valid today', () => {
    const codes = [monthCode(2), dayCode(3), monthCode(4, '2026-10'), dayCode(5, '2026-11-18')];
    expect(ownerIds(driverOwnerEntries(codes, [], TODAY))).toEqual([2, 3]);
  });
});
