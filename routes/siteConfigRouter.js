import { Router } from 'express';
import { SiteConfigController } from '../controllers/siteConfigController.js';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { hitBody, hitLimiter } from '../middlewares/hitLimiter.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// GET – publik, används av hemsidan (sidor som visas + aktiva PDF-länkar)
router.get('/', SiteConfigController.getSiteConfig);

// POST seen – publik, hemsidan räknar en sidvisning (samma som POST /api/analytics/hit).
// A neutral address: ad blockers and privacy browsers block anything with /analytics/ in it.
router.post('/seen', hitLimiter, hitBody, AnalyticsController.hit);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
