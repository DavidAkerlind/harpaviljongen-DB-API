import { Router } from 'express';
import { EventController } from '../controllers/eventController.js';
import { fallbackController } from '../services/fallbackService.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateUser);

// GET routes
router.get('/', EventController.getAllEvents);
router.get('/future', EventController.getFutureEvents);
router.get('/:eventId', EventController.getEventById);

// POST routes
router.post('/', EventController.createEvent);

// PUT routes
router.put('/:eventId', EventController.updateEvent);

// DELETE routes
router.delete('/:eventId', EventController.deleteEvent);

// Fallback
router.use(fallbackController);

export default router;
