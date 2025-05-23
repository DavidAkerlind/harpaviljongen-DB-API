import { Router } from 'express';
import { fallbackController } from '../services/fallbackService.js';
import { AuthController } from '../controllers/authController.js';

const router = Router();

// GET logout
router.get('/logout', AuthController.logout);

// POST login
router.post('/login', AuthController.login);

// Fallback
router.use(fallbackController);

export default router;
