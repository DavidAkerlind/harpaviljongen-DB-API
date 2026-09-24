import { Router } from 'express';
import { ActivityController } from '../controllers/activityController.js';
import { fallbackController } from '../services/fallbackService.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

// Shows usernames, so only for logged-in users (admin and employee)
router.use(authenticateUser);

// GET – senaste ändringarna, ?limit=20
router.get('/', ActivityController.listActivity);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
