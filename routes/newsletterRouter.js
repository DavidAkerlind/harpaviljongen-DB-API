import { Router } from 'express';
import { NewsletterController } from '../controllers/newsletterController.js';
import { newsletterLimiter } from '../middlewares/newsletterLimiter.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// POST – public, the website's signup field: { email } → Get a Newsletter
router.post('/', newsletterLimiter, NewsletterController.subscribe);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
