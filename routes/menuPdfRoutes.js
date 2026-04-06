import { Router } from 'express';
import { MenuPdfController } from '../controllers/menuPdfController.js';
import { uploadPdfMiddleware } from '../services/cloudinaryService.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

// POST - Upload a PDF (protected)
router.post('/upload', uploadPdfMiddleware, MenuPdfController.uploadPdf);

// GET - Fetch active PDF by type (public)
router.get('/active', MenuPdfController.getActivePdf);

// GET - Fetch all PDFs (public)
router.get('/', MenuPdfController.getAllPdfs);

// DELETE - Delete a PDF by id (protected)
router.delete('/:id', MenuPdfController.deletePdf);

export default router;
