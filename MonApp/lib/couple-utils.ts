import { eventDisplayName, isWedding } from './event-type';

type CoupleUser = {
  event_type?: string | null;
  bride_name?: string;
  groom_name?: string;
  prenom?: string;
  nom?: string;
};

/** Affichage « Odaya & Aaron » pour l'accueil et le profil. */
export function getCoupleDisplayName(user?: CoupleUser | null): string | null {
  // Bar/Bat Mitsva, Brit Mila : « Bar Mitsva de Nathan » au lieu de « Nathan & Cohen ».
  if (user && !isWedding(user.event_type)) return eventDisplayName(user);
  const bride = user?.bride_name?.trim();
  const groom = user?.groom_name?.trim();
  if (bride && groom) return `${bride} & ${groom}`;
  if (bride) return bride;
  if (groom) return groom;
  const prenom = user?.prenom?.trim();
  const nom = user?.nom?.trim();
  if (prenom && nom) return `${prenom} & ${nom}`;
  if (prenom) return prenom;
  return null;
}

export function getCoupleInitials(user?: CoupleUser | null): string {
  if (user && !isWedding(user.event_type)) {
    const child = user.bride_name?.trim();
    const family = user.groom_name?.trim();
    if (child) return child[0].toUpperCase();
    if (family) return family[0].toUpperCase();
  }
  const bride = user?.bride_name?.trim();
  const groom = user?.groom_name?.trim();
  if (bride && groom) return `${bride[0]}${groom[0]}`.toUpperCase();
  const prenom = user?.prenom?.trim();
  const nom = user?.nom?.trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  if (prenom) return prenom[0].toUpperCase();
  return '?';
}
