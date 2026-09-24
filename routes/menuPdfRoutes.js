import { Router } from 'express';
import { MenuPdfController } from '../controllers/menuPdfController.js';
import { uploadPdfMiddleware } from '../services/cloudinaryService.js';
import { fallbackController } from '../services/fallbackService.js';
import { protectWrites } from '../middlewares/auth.js';

const router = Router();

// Reads are public, everything else needs a login token.
// Runs before multer so files from someone not logged in are never read.
router.use(protectWrites);

// POST - Upload a PDF (multipart: file, type, title?, activate?)
router.post('/upload', uploadPdfMiddleware, MenuPdfController.uploadPdf);

// GET - Fetch active PDF by type (public)
router.get('/active', MenuPdfController.getActivePdf);

// GET - Fetch all PDFs, optionally ?type=food (public)
router.get('/', MenuPdfController.getAllPdfs);

// PATCH - Show this PDF on the website / stop showing it
router.patch('/:id/activate', MenuPdfController.activatePdf);
router.patch('/:id/deactivate', MenuPdfController.deactivatePdf);

// DELETE - Delete a PDF by id (also removes the file from Cloudinary)
router.delete('/:id', MenuPdfController.deletePdf);

// ==== FALLBACK ====
router.use(fallbackController);

export default router;
