import { Router } from 'express';
import { fallbackController } from '../services/fallbackService.js';
import { AuthController } from '../controllers/authController.js';
import { validateAuthBody } from '../middlewares/validators.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { UserController } from '../controllers/userController.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';
import { uploadImageMiddleware } from '../services/cloudinaryService.js';

const router = Router();

// GET logout
router.get('/logout', AuthController.logout);

// GET me – checks that the sent token is still valid
router.get('/me', authenticateUser, AuthController.me);

// PATCH me – ditt eget användarnamn och namn, { "username": "anna", "name": "Anna Svensson" }
router.patch('/me', authenticateUser, AuthController.updateMe);

// PUT / DELETE avatar – profilbild (multipart "file": JPG, PNG eller WebP, max 5 MB)
// authenticateUser runs first so files from someone not logged in are never read
router.put(
	'/avatar',
	authenticateUser,
	uploadImageMiddleware,
	AuthController.uploadAvatar
);
router.delete('/avatar', authenticateUser, AuthController.deleteAvatar);

// POST register – same as POST /api/users, kept for older clients. Admins only.
// The first user is created with `npm run create-user`.
router.post(
	'/register',
	authenticateUser,
	requireRole('admin'),
	validateAuthBody,
	UserController.createUser
);

// PUT password – byt ditt eget lösenord, { "currentPassword": "...", "newPassword": "..." }
router.put('/password', loginLimiter, authenticateUser, AuthController.changePassword);

// POST login (validera body först)
router.post('/login', loginLimiter, validateAuthBody, AuthController.login);

// Fallback
router.use(fallbackController);

export default router;
