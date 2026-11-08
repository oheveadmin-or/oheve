/**
 * Type d'événement organisé par un compte « client ».
 *
 * Oheve était 100 % mariage. Un client peut maintenant organiser une Bar Mitsva,
 * une Bat Mitsva ou une Brit Mila : ce fichier est la SEULE source de vérité de
 * tout ce qui change selon l'événement (libellés, prestataires proposés,
 * catégories de budget, to-do par défaut).
 *
 * Valeur stockée côté serveur : users.event_type (null / absent = mariage, pour
 * tous les comptes créés avant cette option).
 */
import type { TodoTask } from './todo-store';

export type EventType = 'mariage' | 'bar_mitsva' | 'bat_mitsva' | 'brit_mila';

export const EVENT_TYPES: EventType[] = ['mariage', 'bar_mitsva', 'bat_mitsva', 'brit_mila'];

export function normalizeEventType(v?: string | null): EventType {
  return (EVENT_TYPES as string[]).includes(String(v)) ? (v as EventType) : 'mariage';
}

export function isWedding(v?: string | null): boolean {
  return normalizeEventType(v) === 'mariage';
}

// ── Prestataires ──────────────────────────────────────────────────────────────
// `key` = clé de catégorie du budget (identique pour tous les événements, pour
// que les paiements prestataires retombent dans la bonne case). Le libellé,
// lui, change selon l'événement (ex. « rabbin » = Mohel pour une Brit Mila).
export type ProviderNeed = { key: string; label: string; icon: string; ratio: number };

type EventConfig = {
  label: string;          // « Bar Mitsva »
  emoji: string;
  /** « votre mariage » / « la Bar Mitsva » — avec article, pour les phrases. */
  withArticle: string;
  /** « du mariage » / « de la Bar Mitsva » */
  ofThe: string;
  /** Sous-titre de la carte d'inscription. */
  desc: string;
  /** Champs de noms à l'inscription. */
  names: { first: string; firstPlaceholder: string; second: string; secondPlaceholder: string; hint: string; firstOptional?: boolean };
  /** Tous les prestataires proposables pour cet événement (ordre d'affichage). */
  providers: ProviderNeed[];
  /** Clés pré-cochées à l'onboarding. */
  defaultProviders: string[];
  /** To-do initiale. */
  tasks: TodoTask[];
  /** Icône de chaque catégorie de to-do (ordre = ordre d'affichage). */
  todoCategories: Record<string, string>;
};

const P = {
  salle:      { key: 'salle',      label: 'Salle de réception',    icon: '🏛️' },
  traiteur:   { key: 'traiteur',   label: 'Traiteur / Buffet',     icon: '🍽️' },
  rabbin:     { key: 'rabbin',     label: 'Rabbin / Cérémonie',    icon: '✡️' },
  dj:         { key: 'dj',         label: 'DJ / Orchestre',        icon: '🎵' },
  animation:  { key: 'animation',  label: 'Animation / Danseurs',  icon: '🎉' },
  photo:      { key: 'photo',      label: 'Photographe',           icon: '📸' },
  video:      { key: 'video',      label: 'Vidéaste',              icon: '🎬' },
  deco:       { key: 'deco',       label: 'Décoration & Fleurs',   icon: '💐' },
  tenues:     { key: 'tenues',     label: 'Tenues',                icon: '👗' },
  beaute:     { key: 'beaute',     label: 'Coiffure & Maquillage', icon: '💄' },
  patisserie: { key: 'patisserie', label: 'Pâtisserie / Gâteau',   icon: '🎂' },
  fairepart:  { key: 'fairepart',  label: 'Faire-part / Papeterie', icon: '💌' },
};

function t(prefix: string, category: string, titles: string[]): TodoTask[] {
  return titles.map((title, i) => ({ id: `${prefix}-${i + 1}`, title, category, done: false }));
}

// ── To-do Bar Mitsva ──────────────────────────────────────────────────────────
const BAR_TASKS: TodoTask[] = [
  ...t('bm-prep', 'Préparation religieuse', [
    'Fixer la date (paracha) avec le rabbin',
    'Trouver un professeur pour la paracha',
    'Apprendre la paracha et la haftara',
    'Préparer la drasha (discours)',
    'Acheter les téfilines',
    'Faire vérifier les téfilines par un sofer',
    'Acheter le talit et le sac à talit',
    'Réserver la montée à la Torah à la synagogue',
    'Première mise des téfilines (date et lieu)',
  ]),
  ...t('bm-recep', 'Réception', [
    'Liste des invités', 'Faire-part', 'Salle', 'Traiteur', 'DJ / Animation',
    'Photographe', 'Vidéaste', 'Décoration', 'Gâteau / pièce montée',
    'Placement de table', 'Cadeaux invités', 'Montage photo / vidéo de l\'enfance',
  ]),
  ...t('bm-chabbat', 'Chabbat', [
    'Organiser le Chabbat de la Bar Mitsva', 'Kiddouch à la synagogue',
    'Bonbons à lancer', 'Hébergement de la famille',
  ]),
  ...t('bm-tenue', 'Tenues', [
    'Costume', 'Kippa', 'Chaussures', 'Coiffeur', 'Tenues des parents',
  ]),
  ...t('bm-jj', 'Jour J', [
    'Planning du jour J', 'Discours des parents',
    'Enveloppes pour les prestataires à payer le soir même',
  ]),
];

// ── To-do Bat Mitsva ──────────────────────────────────────────────────────────
const BAT_TASKS: TodoTask[] = [
  ...t('bt-prep', 'Préparation religieuse', [
    'Choisir la date et le format de la cérémonie',
    'Trouver une madricha / un professeur',
    'Choisir le projet de Bat Mitsva (hessed, mitsvot)',
    'Apprendre les mitsvot (hala, bougies de Chabbat…)',
    'Préparer la drasha (discours)',
    'Réserver la synagogue ou le lieu de la cérémonie',
  ]),
  ...t('bt-recep', 'Réception', [
    'Liste des invités', 'Faire-part', 'Salle', 'Traiteur', 'DJ / Animation',
    'Photographe', 'Vidéaste', 'Décoration', 'Gâteau / pièce montée',
    'Placement de table', 'Cadeaux invités', 'Montage photo / vidéo de l\'enfance',
  ]),
  ...t('bt-tenue', 'Tenues & beauté', [
    'Robe de cérémonie', 'Robe de soirée', 'Chaussures', 'Coiffeuse', 'Maquilleuse',
    'Bijoux / accessoires', 'Tenues des parents',
  ]),
  ...t('bt-jj', 'Jour J', [
    'Planning du jour J', 'Discours des parents',
    'Enveloppes pour les prestataires à payer le soir même',
  ]),
];

// ── To-do Brit Mila ───────────────────────────────────────────────────────────
const BRIT_TASKS: TodoTask[] = [
  ...t('br-rel', 'Cérémonie', [
    'Choisir le mohel',
    'Choisir le sandak',
    'Choisir le kvater et la kvaterine',
    'Réserver la synagogue ou le lieu',
    'Chaise d\'Eliahou et coussin de Brit Mila',
    'Choisir le prénom hébraïque',
    'Prévenir le rabbin pour l\'annonce du prénom',
    'Minyane (10 hommes) confirmé',
  ]),
  ...t('br-veille', 'Veille (Brit Itshak / Chalom Zakhar)', [
    'Organiser la veille (lecture du Zohar)',
    'Gâteaux et boissons pour la veille',
  ]),
  ...t('br-recep', 'Réception', [
    'Liste des invités', 'Message d\'annonce / faire-part', 'Traiteur (séouda)',
    'Pâtisseries / gâteaux', 'Décoration', 'Photographe', 'Dragées',
  ]),
  ...t('br-bebe', 'Bébé', [
    'Tenue de Brit', 'Matériel demandé par le mohel (compresses, vaseline…)',
    'Couches et bavoirs de rechange',
  ]),
];

/** Liste historique du mariage : vit dans todo-store (DEFAULT_TASKS). */
const WEDDING_TODO_CATEGORIES: Record<string, string> = {
  'Mariage': '💍',
  'Mairie': '🏛️',
  'Mikvé': '🕊️',
  'Kala': '👗',
  'Henné': '🌿',
  'Houppa/Soirée': '🎊',
  'Sac de secours J-J': '🎒',
  'Après-mariage': '✈️',
  'Planning Jour J': '📋',
};

const MITSVA_PROVIDERS = (extra: ProviderNeed[] = []): ProviderNeed[] => [
  { ...P.salle, ratio: 0.30 },
  { ...P.traiteur, ratio: 0.28 },
  { ...P.rabbin, label: 'Rabbin / Professeur', ratio: 0.03 },
  { ...P.dj, ratio: 0.09 },
  { ...P.animation, ratio: 0.05 },
  { ...P.photo, ratio: 0.06 },
  { ...P.video, ratio: 0.04 },
  { ...P.deco, ratio: 0.07 },
  { ...P.tenues, ratio: 0.04 },
  ...extra,
  { ...P.patisserie, ratio: 0.02 },
  { ...P.fairepart, ratio: 0.02 },
];

const CONFIG: Record<EventType, EventConfig> = {
  mariage: {
    label: 'Mariage',
    emoji: '💍',
    withArticle: 'votre mariage',
    ofThe: 'du mariage',
    desc: 'Organise ton mariage',
    names: {
      first: 'Prénom mariée', firstPlaceholder: 'Léa',
      second: 'Prénom marié', secondPlaceholder: 'Thomas',
      hint: 'Ces prénoms apparaîtront sur votre accueil et votre profil',
    },
    providers: [
      { ...P.salle, ratio: 0.32 },
      { ...P.traiteur, ratio: 0.25 },
      { ...P.rabbin, ratio: 0.03 },
      { ...P.dj, ratio: 0.08 },
      { ...P.photo, ratio: 0.07 },
      { ...P.video, ratio: 0.05 },
      { ...P.deco, ratio: 0.08 },
      { ...P.tenues, ratio: 0.06 },
      { ...P.beaute, ratio: 0.03 },
      { ...P.patisserie, ratio: 0.03 },
    ],
    defaultProviders: ['salle', 'traiteur', 'rabbin', 'dj', 'photo', 'video', 'deco', 'tenues', 'beaute', 'patisserie'],
    tasks: [], // → DEFAULT_TASKS de todo-store
    todoCategories: WEDDING_TODO_CATEGORIES,
  },
  bar_mitsva: {
    label: 'Bar Mitsva',
    emoji: '📜',
    withArticle: 'la Bar Mitsva',
    ofThe: 'de la Bar Mitsva',
    desc: 'Organise sa Bar Mitsva',
    names: {
      first: 'Prénom du garçon', firstPlaceholder: 'Nathan',
      second: 'Nom de famille', secondPlaceholder: 'Cohen',
      hint: 'Ces informations apparaîtront sur votre accueil et votre profil',
    },
    providers: MITSVA_PROVIDERS(),
    defaultProviders: ['salle', 'traiteur', 'rabbin', 'dj', 'photo', 'video', 'deco', 'tenues', 'patisserie'],
    tasks: BAR_TASKS,
    todoCategories: {
      'Préparation religieuse': '📜', 'Réception': '🎊', 'Chabbat': '🕯️', 'Tenues': '👔', 'Jour J': '📋',
    },
  },
  bat_mitsva: {
    label: 'Bat Mitsva',
    emoji: '🌸',
    withArticle: 'la Bat Mitsva',
    ofThe: 'de la Bat Mitsva',
    desc: 'Organise sa Bat Mitsva',
    names: {
      first: 'Prénom de la fille', firstPlaceholder: 'Sarah',
      second: 'Nom de famille', secondPlaceholder: 'Cohen',
      hint: 'Ces informations apparaîtront sur votre accueil et votre profil',
    },
    providers: MITSVA_PROVIDERS([{ ...P.beaute, ratio: 0.03 }]),
    defaultProviders: ['salle', 'traiteur', 'dj', 'photo', 'video', 'deco', 'tenues', 'beaute', 'patisserie'],
    tasks: BAT_TASKS,
    todoCategories: {
      'Préparation religieuse': '📜', 'Réception': '🎊', 'Tenues & beauté': '👗', 'Jour J': '📋',
    },
  },
  brit_mila: {
    label: 'Brit Mila',
    emoji: '👶',
    withArticle: 'la Brit Mila',
    ofThe: 'de la Brit Mila',
    desc: 'Organise la Brit Mila',
    names: {
      first: 'Prénom du bébé', firstPlaceholder: 'Facultatif',
      second: 'Nom de famille', secondPlaceholder: 'Cohen',
      hint: 'Le prénom est souvent révélé le jour J : vous pourrez l\'ajouter plus tard',
      firstOptional: true,
    },
    providers: [
      { ...P.rabbin, label: 'Mohel', icon: '✡️', ratio: 0.12 },
      { ...P.traiteur, label: 'Traiteur (séouda)', ratio: 0.45 },
      { ...P.salle, label: 'Salle / Synagogue', ratio: 0.15 },
      { ...P.photo, ratio: 0.10 },
      { ...P.deco, ratio: 0.08 },
      { ...P.patisserie, ratio: 0.07 },
      { ...P.fairepart, ratio: 0.03 },
    ],
    defaultProviders: ['rabbin', 'traiteur', 'photo', 'patisserie'],
    tasks: BRIT_TASKS,
    todoCategories: {
      'Cérémonie': '✡️', 'Veille (Brit Itshak / Chalom Zakhar)': '🕯️', 'Réception': '🍽️', 'Bébé': '👶',
    },
  },
};

/** Préfixe du site invités : /wedding, /bar-mitsva, /bat-mitsva, /brit-mila
 *  (doit rester aligné avec guest-site/src/wedding-sites/utils/eventRoutes.ts). */
const SITE_PATH: Record<EventType, string> = {
  mariage: 'wedding', bar_mitsva: 'bar-mitsva', bat_mitsva: 'bat-mitsva', brit_mila: 'brit-mila',
};

/** https://oheve.pages.dev/bar-mitsva pour une Bar Mitsva, …/wedding pour un mariage. */
export function sitePublicBase(eventType?: string | null): string {
  return `https://oheve.pages.dev/${SITE_PATH[normalizeEventType(eventType)]}`;
}

export function eventConfig(v?: string | null): EventConfig {
  return CONFIG[normalizeEventType(v)];
}

/** Prestataires retenus (cochés à l'onboarding), dans l'ordre d'affichage. */
export function selectedProviders(eventType?: string | null, needed?: string[] | null): ProviderNeed[] {
  const cfg = eventConfig(eventType);
  const keys = needed && needed.length > 0 ? needed : cfg.defaultProviders;
  return cfg.providers.filter(p => keys.includes(p.key));
}

/**
 * Répartition d'un budget global entre les prestataires retenus : les ratios
 * sont renormalisés pour que la somme fasse 100 % même si on en a décoché.
 */
export function budgetRatios(providers: ProviderNeed[]): Record<string, number> {
  const sum = providers.reduce((s, p) => s + p.ratio, 0) || 1;
  return Object.fromEntries(providers.map(p => [p.key, p.ratio / sum]));
}

/** « Bar Mitsva de Nathan » / « Brit Mila — famille Cohen ». */
export function eventDisplayName(user?: { event_type?: string | null; bride_name?: string; groom_name?: string } | null): string | null {
  if (!user || isWedding(user.event_type)) return null;
  const cfg = eventConfig(user.event_type);
  const child = user.bride_name?.trim();
  const family = user.groom_name?.trim();
  if (child) return `${cfg.label} de ${child}`;
  if (family) return `${cfg.label} · famille ${family}`;
  return cfg.label;
}

// ── Site invités (écran « Site », aperçu WhatsApp, message d'invitation) ────
type SiteTexts = {
  /** Titre de l'écran : « Site Mariage » / « Site Bar Mitsva » */
  screenTitle: string;
  /** Surtitre de l'aperçu WhatsApp : « NOUS NOUS MARIONS » / « BAR MITSVA » */
  kicker: string;
  /** « au mariage de » / « à la Bar Mitsva de » */
  invitedTo: string;
  /** Formulaire de création du lien */
  createSub: string;
  /** Phrase du message d'invitation : « célébrer notre mariage » */
  celebrate: string;
  /** « concernant le mariage » */
  about: string;
};

const SITE_TEXTS: Record<EventType, SiteTexts> = {
  mariage: {
    screenTitle: 'Site Mariage', kicker: 'NOUS NOUS MARIONS', invitedTo: 'au mariage de',
    createSub: 'Entrez les prénoms des mariés pour générer votre lien personnalisé.',
    celebrate: 'célébrer notre mariage', about: 'le mariage',
  },
  bar_mitsva: {
    screenTitle: 'Site Bar Mitsva', kicker: 'BAR MITSVA', invitedTo: 'à la Bar Mitsva de',
    createSub: 'Entrez le prénom du garçon et le nom de famille pour générer votre lien personnalisé.',
    celebrate: 'célébrer la Bar Mitsva de notre fils', about: 'la Bar Mitsva',
  },
  bat_mitsva: {
    screenTitle: 'Site Bat Mitsva', kicker: 'BAT MITSVA', invitedTo: 'à la Bat Mitsva de',
    createSub: 'Entrez le prénom de la fille et le nom de famille pour générer votre lien personnalisé.',
    celebrate: 'célébrer la Bat Mitsva de notre fille', about: 'la Bat Mitsva',
  },
  brit_mila: {
    screenTitle: 'Site Brit Mila', kicker: 'BRIT MILA', invitedTo: 'à la Brit Mila de',
    createSub: 'Entrez le nom de famille (et le prénom du bébé si vous le souhaitez) pour générer votre lien personnalisé.',
    celebrate: 'célébrer la Brit Mila de notre fils', about: 'la Brit Mila',
  },
};

export function siteTexts(v?: string | null): SiteTexts {
  return SITE_TEXTS[normalizeEventType(v)];
}

/**
 * Noms affichés pour un site.
 *  - mariage : « Léa & Thomas » (titre ET signature)
 *  - autres  : titre = prénom de l'enfant (sinon « Famille Cohen »),
 *              signature du message = « Famille Cohen » (sinon le prénom).
 */
export function siteNames(
  eventType: string | null | undefined,
  first?: string | null,
  second?: string | null,
  coupleName?: string | null,
): { title: string; signature: string } {
  const a = (first ?? '').trim();
  const b = (second ?? '').trim();
  if (isWedding(eventType)) {
    const couple = (coupleName ?? '').trim() || [a, b].filter(Boolean).join(' & ');
    return { title: couple, signature: couple };
  }
  const family = b ? `Famille ${b}` : '';
  const label = eventConfig(eventType).label;
  return { title: a || family || label, signature: family || a || label };
}
