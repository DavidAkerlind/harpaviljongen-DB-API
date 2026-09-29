import { Router } from 'express';
import { NewsletterController } from '../controllers/newsletterController.js';
import { newsletterLimiter } from '../middlewares/newsletterLimiter.js';
import { authenticateUser } from '../middlewares/auth.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// POST – public, the website's signup field: { email } → Get a Newsletter
router.post('/', newsletterLimiter, NewsletterController.subscribe);

// GET stats – for the admin: subscribers, signups per day and newsletters sent, ?range=7d|30d|90d
router.get('/stats', authenticateUser, NewsletterController.stats);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
