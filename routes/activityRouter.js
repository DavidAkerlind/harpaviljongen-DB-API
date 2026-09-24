import { Router } from 'express';
import { ActivityController } from '../controllers/activityController.js';
import { fallbackController } from '../services/fallbackService.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

const router = Router();

// Shows usernames, so only for logged-in users (admin and employee)
router.use(authenticateUser);

// GET – ändringar, nyast först. ?limit=20&from=&to=&category=&userId=&before=
router.get('/', ActivityController.listActivity);

// GET – alla som finns i loggen (för filtret)
router.get('/users', ActivityController.listUsers);

// DELETE – rensa loggen, bara admin. ?olderThan=30d | 3m | 6m | 1y | all
// (Ändringar tas också bort automatiskt när de är ett år gamla.)
router.delete('/', requireRole('admin'), ActivityController.clearActivity);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
