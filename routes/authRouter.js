import { Router } from 'express';
import { fallbackController } from '../services/fallbackService.js';
import { AuthController } from '../controllers/authController.js';
import { validateAuthBody } from '../middlewares/validators.js';
import { authenticateUser } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';

const router = Router();

// GET logout
router.get('/logout', AuthController.logout);

// GET me – checks that the sent token is still valid
router.get('/me', authenticateUser, AuthController.me);

// POST register – only a logged-in admin can create another user.
// The first user is created with `npm run create-user`.
router.post(
	'/register',
	authenticateUser,
	validateAuthBody,
	AuthController.register
);

// POST login (validera body först)
router.post('/login', loginLimiter, validateAuthBody, AuthController.login);

// Fallback
router.use(fallbackController);

export default router;
