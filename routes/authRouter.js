import { Router } from 'express';
import { fallbackController } from '../services/fallbackService.js';
import { AuthController } from '../controllers/authController.js';
import { validateAuthBody } from '../middlewares/validators.js';

const router = Router();

// GET logout
router.get('/logout', AuthController.logout);

// POST register (validera body först)
router.post('/register', validateAuthBody, AuthController.register);

// POST login (validera body först)
router.post('/login', validateAuthBody, AuthController.login);

// Fallback
router.use(fallbackController);

export default router;
