import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateUser } from '../middlewares/auth.js';
import { hitBody, hitLimiter } from '../middlewares/hitLimiter.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// POST hit – public, a page view from the website, { "p": "/events", "r": "https://google.com/" }.
// The website uses POST /api/site-config/seen (same thing), since ad blockers block /analytics/.
router.post('/hit', hitLimiter, hitBody, AnalyticsController.hit);

// GET – statistics for the admin, ?range=7d|30d|90d
router.get('/', authenticateUser, AnalyticsController.get);

// ==== FALLBACK ====
router.use(fallbackController);

export default router;
