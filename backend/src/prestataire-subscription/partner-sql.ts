/**
 * Règle « prestataire partenaire » (abonnement en cours) en SQL, sans aucune
 * dépendance : importable partout (demandes, messagerie…) sans cycle d'import.
 *
 * ── Plusieurs profils sous un même compte ─────────────────────────────────
 * Un compte prestataire peut gérer plusieurs profils (groupe hôtelier…) reliés
 * par users.presta_owner_id = compte principal. On ne paie QU'UNE fois : un
 * seul abonnement actif dans le groupe (en pratique celui du profil principal)
 * rend partenaires TOUS les profils du groupe.
 */

/** Abonnement actif sur la ligne users `g` elle-même. */
export function sqlOwnSubActive(g: string): string {
  return `(COALESCE(${g}.presta_sub_status,'') IN ('trialing','active')
    AND (COALESCE(${g}.presta_sub_id,'') NOT LIKE 'apple:%'
         AND COALESCE(${g}.presta_sub_id,'') NOT LIKE 'google:%'
         AND COALESCE(${g}.presta_sub_id,'') <> 'admin:grant'
         OR ${g}.presta_current_period_end IS NULL
         OR ${g}.presta_current_period_end > NOW()))`;
}

/**
 * Partenaire = abonnement actif sur ce profil OU sur n'importe quel autre
 * profil du même groupe (compte principal + profils rattachés).
 * Les abonnements store / admin ont une date de fin locale qui fait foi.
 */
export function sqlIsPartner(u = 'u'): string {
  const g = `grp_${u.replace(/\W/g, '')}`;
  const groupe = `COALESCE(${u}.presta_owner_id, ${u}.id)`;
  return `(${sqlOwnSubActive(u)} OR EXISTS (
    SELECT 1 FROM users ${g}
     WHERE ${g}.role = 'prestataire'
       AND (${g}.id = ${groupe} OR ${g}.presta_owner_id = ${groupe})
       AND ${sqlOwnSubActive(g)}))`;
}
