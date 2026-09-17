import AsyncStorage from '@react-native-async-storage/async-storage';

import { bootstrapScope, pushScope, readCache } from './planning-sync';

export type TodoTask = {
  id: string;
  title: string;
  category: string;
  done: boolean;
  status?: 'todo' | 'in_progress' | 'done';
  dueDate?: string; // YYYY-MM-DD
};

const STORAGE_KEY = '@oheve:todo_tasks';

const DEFAULT_TASKS: TodoTask[] = [
  { id: 'mariage-1', title: 'Liste invité', category: 'Mariage', done: false },
  { id: 'mariage-2', title: 'Carte', category: 'Mariage', done: false },

  { id: 'mairie-1', title: 'Dossier mairie', category: 'Mairie', done: false },
  { id: 'mairie-2', title: 'Robe', category: 'Mairie', done: false },
  { id: 'mairie-3', title: 'Chaussures', category: 'Mairie', done: false },
  { id: 'mairie-4', title: 'Maquilleuse', category: 'Mairie', done: false },
  { id: 'mairie-5', title: 'Coiffeuse', category: 'Mairie', done: false },
  { id: 'mairie-6', title: 'Location de salle', category: 'Mairie', done: false },
  { id: 'mairie-7', title: 'Traiteur', category: 'Mairie', done: false },
  { id: 'mairie-8', title: 'Préparation du discours à donner au maire bien à l\'avance', category: 'Mairie', done: false },
  { id: 'mairie-9', title: 'Choix des musiques', category: 'Mairie', done: false },
  { id: 'mairie-10', title: 'Contrat de mariage', category: 'Mairie', done: false },
  { id: 'mairie-11', title: 'Responsable du livret de famille', category: 'Mairie', done: false },

  { id: 'mikve-1', title: 'Apporter attestation de cours', category: 'Mikvé', done: false },
  { id: 'mikve-2', title: 'Poches invités CF liste Mikvé', category: 'Mikvé', done: false },
  { id: 'mikve-3', title: 'Dragées', category: 'Mikvé', done: false },
  { id: 'mikve-4', title: 'Poule', category: 'Mikvé', done: false },
  { id: 'mikve-5', title: 'Traiteur', category: 'Mikvé', done: false },
  { id: 'mikve-6', title: 'Trousse de toilette', category: 'Mikvé', done: false },

  { id: 'kala-1', title: 'Cours de préparation s\'y prendre 3 mois à l\'avance', category: 'Kala', done: false },
  { id: 'kala-2', title: 'Robe de mariée', category: 'Kala', done: false },
  { id: 'kala-3', title: 'Bolero pour la houppa', category: 'Kala', done: false },
  { id: 'kala-4', title: 'Chaussures à talons', category: 'Kala', done: false },
  { id: 'kala-5', title: 'Baskets pour la soirée', category: 'Kala', done: false },
  { id: 'kala-6', title: 'Maquilleuse', category: 'Kala', done: false },
  { id: 'kala-7', title: 'Coiffeuse', category: 'Kala', done: false },
  { id: 'kala-8', title: 'Bijoux, accessoires de tête', category: 'Kala', done: false },
  { id: 'kala-9', title: 'Ongles', category: 'Kala', done: false },
  { id: 'kala-10', title: 'Lingerie pour le mariage', category: 'Kala', done: false },
  { id: 'kala-11', title: 'Vêtements pour la préparation (peignoir)', category: 'Kala', done: false },
  { id: 'kala-12', title: 'Liste de Bérahot à faire remplir', category: 'Kala', done: false },

  { id: 'henne-1', title: 'Robe henné', category: 'Henné', done: false },
  { id: 'henne-2', title: 'Chaussures', category: 'Henné', done: false },
  { id: 'henne-3', title: 'Bijoux, accessoires de tete', category: 'Henné', done: false },
  { id: 'henne-4', title: 'Poudre de henné et Eau de cologne', category: 'Henné', done: false },
  { id: 'henne-5', title: 'Rubans', category: 'Henné', done: false },
  { id: 'henne-6', title: 'Grandes bougies', category: 'Henné', done: false },
  { id: 'henne-7', title: 'Corbeilles CF liste Corbeille', category: 'Henné', done: false },
  { id: 'henne-8', title: 'Tente henné', category: 'Henné', done: false },
  { id: 'henne-9', title: 'Louis d\'or', category: 'Henné', done: false },
  { id: 'henne-10', title: 'Cadeaux invités', category: 'Henné', done: false },
  { id: 'henne-11', title: 'Maquilleuse', category: 'Henné', done: false },
  { id: 'henne-12', title: 'Coiffeuse', category: 'Henné', done: false },
  { id: 'henne-13', title: 'Traiteur', category: 'Henné', done: false },
  { id: 'henne-14', title: 'Salle', category: 'Henné', done: false },
  { id: 'henne-15', title: 'Chanteur', category: 'Henné', done: false },
  { id: 'henne-16', title: 'Liste invité', category: 'Henné', done: false },

  { id: 'houppa-1', title: 'Verre à casser', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-2', title: 'Ketouba', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-3', title: 'Dossier consistoire', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-4', title: 'Choisir le rabbin', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-5', title: 'Salle', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-6', title: 'Traiteur et pièce montée', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-7', title: 'Orchestre', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-8', title: 'Photographe-vidéo', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-9', title: 'Décorateur', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-10', title: 'Coin photo', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-11', title: 'Voiture mariage', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-12', title: 'Alliances', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-13', title: 'Save the date', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-14', title: 'Faire parts', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-15', title: 'Placement de table', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-16', title: 'Noms des tables à faire encadrer ou plastifier au choix', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-17', title: 'Cartons invités', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-18', title: 'Sujets-dragées', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-19', title: 'Kippots et foulard', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-20', title: 'Chanteur houppa', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-21', title: 'Prières pour les invités houppa', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-22', title: 'Birkat Kala (Ne pas oublier de l\'apprendre par coeur qlqs semaines à l\'avance)', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-23', title: 'Coussins pour les alliances', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-24', title: 'Distribuer les Sheva brahots', category: 'Houppa/Soirée', done: false },
  { id: 'houppa-25', title: 'Les enveloppes pour les prestas à payer le soir même', category: 'Houppa/Soirée', done: false },

  { id: 'planning-jj-1', title: 'Réserver DJ (Mai)', category: 'Planning Jour J', done: false },
  { id: 'planning-jj-2', title: 'Commander la robe (Juin)', category: 'Planning Jour J', done: false },
  { id: 'planning-jj-3', title: 'Envoyer invitations (Août)', category: 'Planning Jour J', done: false },
  { id: 'planning-jj-4', title: 'Confirmer planning jour J (Sept)', category: 'Planning Jour J', done: false },

  { id: 'sac-jj-1', title: 'Rouleau matifiant', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-2', title: 'Tenue de préparation (peignoir bride...)', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-3', title: 'Brosse à dent', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-4', title: 'Déodorant', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-5', title: 'Parfum', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-6', title: 'Trousse retouche make up (poudre, RAL, pinces plates...)', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-7', title: 'Eau', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-8', title: 'Sucre (gâteau, bonbons)', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-9', title: 'Lingettes', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-10', title: 'Pansements et compeed (trousse de secours)', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-11', title: 'Sous vêtements de rechange', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-12', title: 'Épingles à nourrice fil et aiguilles', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-13', title: 'Baskets', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-14', title: 'Chemises de rechanges pour le marié', category: 'Sac de secours J-J', done: false },
  { id: 'sac-jj-15', title: 'Foulard pour le 1e sheva brahot du soir', category: 'Sac de secours J-J', done: false },

  { id: 'apres-1', title: 'Tenue du lendemain', category: 'Après-mariage', done: false },
  { id: 'apres-2', title: 'Pyjama', category: 'Après-mariage', done: false },
  { id: 'apres-3', title: 'Sous vêtements', category: 'Après-mariage', done: false },
  { id: 'apres-4', title: 'Gel douche shampoing démêlant', category: 'Après-mariage', done: false },
  { id: 'apres-5', title: 'Démaquillant et coton', category: 'Après-mariage', done: false },
  { id: 'apres-6', title: 'Brosse à dent', category: 'Après-mariage', done: false },
  { id: 'apres-7', title: 'Brosse à cheveux', category: 'Après-mariage', done: false },
  { id: 'apres-8', title: 'Trousse à maquillage', category: 'Après-mariage', done: false },
  { id: 'apres-9', title: 'House pour ranger la robe de mariage', category: 'Après-mariage', done: false },
  { id: 'apres-10', title: 'Trousse pour les pince et chouchou', category: 'Après-mariage', done: false },
];

const todoStore: { tasks: TodoTask[] } = {
  tasks: [...DEFAULT_TASKS],
};

let _loaded = false;
const _subs = new Set<() => void>();

/** Notifie les écrans (la progression de l'accueil doit suivre le serveur). */
function _notify(): void {
  _subs.forEach((fn) => fn());
}

export function subscribeTodo(fn: () => void): () => void {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

/**
 * Première rencontre entre cet appareil et le compte : on ne perd aucune
 * case cochée, des deux côtés. Une tâche est faite si elle l'est ici OU
 * là-bas, et les tâches ajoutées à la main sur un seul appareil sont
 * conservées. Les synchros suivantes suivent simplement le serveur.
 */
export function mergeTasks(local: TodoTask[], serveur: TodoTask[]): TodoTask[] {
  const parId = new Map<string, TodoTask>();
  for (const t of serveur) parId.set(t.id, { ...t });
  for (const t of local) {
    const existant = parId.get(t.id);
    if (!existant) {
      parId.set(t.id, { ...t });
      continue;
    }
    const done = existant.done || t.done;
    parId.set(t.id, {
      ...existant,
      done,
      status: done ? 'done' : (existant.status ?? t.status),
      dueDate: existant.dueDate ?? t.dueDate,
    });
  }
  // Ordre du serveur d'abord, puis les tâches propres à cet appareil.
  const vus = new Set(serveur.map((t) => t.id));
  return [
    ...serveur.map((t) => parId.get(t.id)!),
    ...local.filter((t) => !vus.has(t.id)).map((t) => parId.get(t.id)!),
  ];
}

/** Recharge depuis le serveur au prochain `loadTodoTasks()` (changement de compte). */
export function invalidateTodoTasks(): void {
  _loaded = false;
}

export async function loadTodoTasks(): Promise<TodoTask[]> {
  if (_loaded) return todoStore.tasks;

  // 1. Cache du compte (nouveau format), sinon ancien stockage local du
  //    téléphone — ce qui reprend les tâches déjà cochées avant la synchro.
  const cache = await readCache<TodoTask[]>('todo');
  if (cache && Array.isArray(cache) && cache.length > 0) {
    todoStore.tasks = cache;
  } else {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) todoStore.tasks = JSON.parse(raw) as TodoTask[];
    } catch {
      // on garde les tâches par défaut
    }
  }

  // 2. Serveur : source de vérité partagée entre les appareils du compte.
  try {
    todoStore.tasks = await bootstrapScope<TodoTask[]>('todo', todoStore.tasks, mergeTasks);
  } catch {
    // hors-ligne : on reste sur le cache
  }

  _loaded = true;
  _notify();
  return todoStore.tasks;
}

export function getTodoTasks(): TodoTask[] {
  return todoStore.tasks;
}

export function setTodoTasks(next: TodoTask[]): void {
  todoStore.tasks = next;
  // Cache hérité conservé : une version antérieure de l'app lit encore cette clé.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  pushScope<TodoTask[]>('todo', next, (serveur) => {
    // L'autre appareil a écrit entre-temps : on s'aligne sur sa version.
    todoStore.tasks = serveur;
    _notify();
  });
  _notify();
}
