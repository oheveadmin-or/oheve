import { useAuth } from '@/contexts/auth-context';

const ADMIN_EMAIL = 'oheveadmin@gmail.com';

export function usePremiumAccess() {
  const { user } = useAuth();
  const isAdmin =
    user?.role === 'admin' ||
    user?.email?.trim().toLowerCase() === ADMIN_EMAIL;

  const hasPremium = isAdmin || user?.premium === true;

  return {
    isAdmin,
    hasPremiumAccess: hasPremium,
    canExportSeatingPdf: hasPremium,
    canUseWeddingCard: hasPremium,
  };
}
