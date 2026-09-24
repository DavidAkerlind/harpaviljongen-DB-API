import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { fallbackController } from '../services/fallbackService.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

const router = Router();

// Everything here, reads included, is for logged-in admins only
router.use(authenticateUser, requireRole('admin'));

// GET – alla användare (utan lösenord)
router.get('/', UserController.listUsers);

// POST – ny användare
router.post('/', UserController.createUser);
/*{
    "username": "anna",
    "password": "minst-8-tecken",
    "role": "employee"   // eller "admin"
}*/

// PATCH – byt roll, { "role": "admin" }
router.patch('/:userId', UserController.updateUser);

// PUT – nytt lösenord åt någon annan, { "password": "minst-8-tecken" }
router.put('/:userId/password', UserController.resetPassword);

// DELETE – ta bort en personal-användare
router.delete('/:userId', UserController.deleteUser);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
