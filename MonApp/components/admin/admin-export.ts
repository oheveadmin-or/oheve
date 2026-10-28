import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { adminApi } from '@/services/auth/api';

export const EXPORT_CHOICES = [
  { key: 'utilisateurs', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'prestataires', label: 'Prestataires', icon: 'business-outline' },
  { key: 'paiements', label: 'Paiements', icon: 'card-outline' },
  { key: 'reservations', label: 'Réservations', icon: 'calendar-outline' },
  { key: 'sites', label: 'Sites mariage', icon: 'globe-outline' },
] as const;

type Sheet = { key: string; title: string; columns: string[]; rows: Record<string, unknown>[] };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Largeur de colonne d'après le contenu le plus long (bornée). */
function columnWidths(sheet: Sheet) {
  return sheet.columns.map((col) => {
    const longest = sheet.rows.reduce((max, row) => Math.max(max, String(row[col] ?? '').length), col.length);
    return { wch: Math.min(Math.max(longest + 2, 8), 45) };
  });
}

/**
 * Récupère les données admin et partage un classeur .xlsx (un onglet par
 * export). `keys` vide = tout. Renvoie un message d'erreur, ou null si OK.
 */
export async function exportAdminExcel(token: string, keys: string[]): Promise<string | null> {
  const res = await adminApi.getExport(token, keys);
  if (!res.success || !res.data) return res.message ?? "Impossible de préparer l'export.";
  const sheets = (res.data as { sheets: Sheet[] }).sheets;

  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows, { header: sheet.columns });
    ws['!cols'] = columnWidths(sheet);
    if (sheet.rows.length) ws['!autofilter'] = { ref: ws['!ref'] as string };
    XLSX.utils.book_append_sheet(wb, ws, sheet.title.slice(0, 31));
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const name = `oheve-${sheets.length === 1 ? sheets[0].key : 'export'}-${today}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, name);
    return null;
  }
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileUri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) return 'Le partage de fichiers est indisponible sur cet appareil.';
  await Sharing.shareAsync(fileUri, {
    mimeType: XLSX_MIME,
    dialogTitle: 'Export Excel Oheve',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
  return null;
}
