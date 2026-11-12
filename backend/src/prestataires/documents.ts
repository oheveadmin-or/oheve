/**
 * Documents PDF d'un prestataire (brochure, menu, tarifs…), affichés sur sa
 * fiche publique. Ajout/suppression par le prestataire (/me/documents) ou par
 * l'admin (/:userId/documents). Le même PDF (même empreinte) n'est pas ajouté
 * deux fois à la même fiche.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, Router } from 'express';
import multer from 'multer';

import { pool } from '../config/database';
import { requireAdmin } from '../middleware/requireAdmin';
import { requireAuth } from '../middleware/requireAuth';
import { forgetFile, persistUploadedFile } from '../utils/persistent-uploads';

export const CREATE_PRESTATAIRE_DOCUMENTS = `
  CREATE TABLE IF NOT EXISTS prestataire_documents (
    id SERIAL PRIMARY KEY,
    prestataire_id INTEGER NOT NULL REFERENCES prestataire_profiles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    size INTEGER,
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
export const MAX_DOCUMENTS = 20;

const DIR = path.join(process.cwd(), 'uploads', 'documents');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { fs.mkdirSync(DIR, { recursive: true }); cb(null, DIR); },
    filename: (_req, _file, cb) => cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    if (ok) cb(null, true);
    else cb(new Error('Seuls les fichiers PDF sont acceptés'));
  },
});

/** multer renvoie ses erreurs (taille, type) en 500 par défaut : message clair à la place. */
function uploadPdf(req: Request, res: Response, next: () => void) {
  upload.single('document')(req, res, (err: unknown) => {
    if (!err) return next();
    const tooBig = (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({ success: false, message: tooBig ? 'PDF trop lourd (25 Mo maximum)' : (err as Error).message });
  });
}

function fileUrl(req: Request, filename: string): string {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  return `${protocol}://${host}/uploads/documents/${filename}`;
}

async function prestaIdOf(userId: number): Promise<number | null> {
  if (!Number.isInteger(userId) || userId <= 0) return null;
  const r = await pool.query(`SELECT id FROM prestataire_profiles WHERE user_id=$1`, [userId]);
  return r.rows[0]?.id ?? null;
}

function dropUpload(req: Request) {
  if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
}

async function list(req: Request, res: Response, userId: number) {
  try {
    const pid = await prestaIdOf(userId);
    if (pid === null) return res.json({ success: true, data: [] });
    const r = await pool.query(
      `SELECT id, title, size, created_at, filename FROM prestataire_documents WHERE prestataire_id=$1 ORDER BY created_at ASC`, [pid]
    );
    return res.json({ success: true, data: r.rows.map(({ filename, ...d }) => ({ ...d, url: fileUrl(req, filename) })) });
  } catch (err) {
    console.error('documents.list:', err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
}

async function add(req: Request, res: Response, userId: number) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Aucun PDF reçu' });
  try {
    const pid = await prestaIdOf(userId);
    if (pid === null) {
      dropUpload(req);
      return res.status(404).json({ success: false, message: "Enregistrez d'abord la fiche prestataire avant d'ajouter des PDF." });
    }
    const buf = await fs.promises.readFile(req.file.path);
    if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      dropUpload(req);
      return res.status(400).json({ success: false, message: "Ce fichier n'est pas un PDF valide" });
    }
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const dup = await pool.query(`SELECT title FROM prestataire_documents WHERE prestataire_id=$1 AND content_hash=$2`, [pid, hash]);
    if (dup.rowCount) {
      dropUpload(req);
      return res.status(409).json({ success: false, duplicate: true, message: `Ce PDF est déjà sur la fiche (« ${dup.rows[0].title} »).` });
    }
    const count = Number((await pool.query(`SELECT COUNT(*) FROM prestataire_documents WHERE prestataire_id=$1`, [pid])).rows[0].count);
    if (count >= MAX_DOCUMENTS) {
      dropUpload(req);
      return res.status(403).json({ success: false, message: `${MAX_DOCUMENTS} PDF maximum par fiche` });
    }
    const typed = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const original = path.basename(req.file.originalname || '', path.extname(req.file.originalname || '')).trim();
    const title = (typed || (original && original !== 'upload' ? original : '') || 'Document').slice(0, 120);
    await persistUploadedFile()(req, res, () => {});
    const r = await pool.query(
      `INSERT INTO prestataire_documents (prestataire_id, filename, title, size, content_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, title, size, created_at`,
      [pid, req.file.filename, title, buf.length, hash]
    );
    return res.status(201).json({ success: true, data: { ...r.rows[0], url: fileUrl(req, req.file.filename) } });
  } catch (err) {
    console.error('documents.add:', err);
    dropUpload(req);
    return res.status(500).json({ success: false, message: 'Erreur upload' });
  }
}

async function remove(req: Request, res: Response, userId: number) {
  try {
    const pid = await prestaIdOf(userId);
    if (pid === null) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
    const r = await pool.query(
      `DELETE FROM prestataire_documents WHERE id=$1 AND prestataire_id=$2 RETURNING filename`, [Number(req.params.docId), pid]
    );
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'Document introuvable' });
    const filename = r.rows[0].filename as string;
    try { fs.unlinkSync(path.join(DIR, filename)); } catch { /* ignoré */ }
    await forgetFile(`documents/${filename}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('documents.remove:', err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
}

/** Routes /me/documents : à monter AVANT les routes /:userId (sinon « me » = un id). */
export const myDocumentRoutes = Router();
myDocumentRoutes.get('/me/documents', requireAuth, (req, res) => list(req, res, req.auth!.sub));
myDocumentRoutes.post('/me/documents', requireAuth, uploadPdf, (req, res) => add(req, res, req.auth!.sub));
myDocumentRoutes.delete('/me/documents/:docId', requireAuth, (req, res) => remove(req, res, req.auth!.sub));

/** Routes publiques (lecture) et admin (ajout/suppression sur n'importe quelle fiche). */
export const userDocumentRoutes = Router();
userDocumentRoutes.get('/:userId/documents', (req, res) => list(req, res, Number(req.params.userId)));
userDocumentRoutes.post('/:userId/documents', requireAdmin, uploadPdf, (req, res) => add(req, res, Number(req.params.userId)));
userDocumentRoutes.delete('/:userId/documents/:docId', requireAdmin, (req, res) => remove(req, res, Number(req.params.userId)));
