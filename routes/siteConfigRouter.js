import { Router } from 'express';
import { SiteConfigController } from '../controllers/siteConfigController.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// GET – publik, används av hemsidan (sidor som visas + aktiva PDF-länkar)
router.get('/', SiteConfigController.getSiteConfig);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
