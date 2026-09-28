import { Router } from 'express';
import { HeroController } from '../controllers/heroController.js';
import { uploadHeroImageMiddleware } from '../services/cloudinaryService.js';
import { fallbackController } from '../services/fallbackService.js';
import { protectWrites } from '../middlewares/auth.js';

const router = Router();

// The photos at the top of the home page (the admin's Startbild). Reads are public,
// changes need a login. Runs before multer so files from someone not logged in are never read.
router.use(protectWrites);

// GET – { settings: { slideshow, intervalSeconds, shuffle }, images: [...in order] }
router.get('/', HeroController.get);

// POST – upload a photo (multipart: file), added last and shown
router.post('/images', uploadHeroImageMiddleware, HeroController.upload);

// PATCH – show/hide or move the focus point, { "shown"?: true, "focus"?: { "x": 50, "y": 30 } }
router.patch('/images/:id', HeroController.update);

// DELETE – the photo and its file in Cloudinary
router.delete('/images/:id', HeroController.remove);

// PUT – new order, { "ids": [every photo's id] }. The first shown photo is shown first.
router.put('/order', HeroController.reorder);

// PUT – { "slideshow"?: true, "intervalSeconds"?: 10, "shuffle"?: false }
router.put('/settings', HeroController.updateSettings);

// ==== FALLBACK ====
router.use(fallbackController);

export default router;
