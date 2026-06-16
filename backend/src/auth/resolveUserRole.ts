import { pool } from '../config/database';
import { UserRole } from './jwt';
import { isAdminEmail, resolveRole } from './admin';

/** Synchronise le rôle en base si nécessaire et retourne le rôle effectif. */
export async function ensureAndGetRole(
  userId: number,
  email: string,
  currentRole: UserRole,
): Promise<UserRole> {
  const effective = resolveRole(email, currentRole);
  if (effective !== currentRole) {
    await pool.query(`UPDATE users SET role=$1 WHERE id=$2`, [effective, userId]);
  }
  return effective;
}

export async function getUserEffectiveRole(userId: number): Promise<UserRole | null> {
  const r = await pool.query(`SELECT email, role FROM users WHERE id=$1`, [userId]);
  const row = r.rows[0];
  if (!row) return null;
  return ensureAndGetRole(userId, row.email, row.role as UserRole);
}

export function isPremiumBypass(role: UserRole, email?: string): boolean {
  return role === 'admin' || (email ? isAdminEmail(email) : false);
}
