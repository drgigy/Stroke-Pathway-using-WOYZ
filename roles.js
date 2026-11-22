// UID is an identity allowlist, not a credential. Firebase rules enforce the same owner check.
export const MASTER_ADMIN_UID = 'C7uoRRiH1XdpJzLDZMCZHLsmpNv1';
export const MASTER_ADMIN_EMAIL = 'drgigy@gmail.com';
export function isMasterAdmin(user, token) {
  return user?.uid === MASTER_ADMIN_UID && token?.claims?.admin === true;
}
