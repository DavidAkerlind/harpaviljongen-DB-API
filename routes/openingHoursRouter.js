import { Router } from 'express';
import { OpeningHoursController } from '../controllers/openingHoursController.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();
// ==== GET ====
router.get('/', OpeningHoursController.getAllOpeningHours);

// POST routes
router.post('/', OpeningHoursController.createOpeningHours);
/*
{
    "day": "Tisdag",
    "hours": {
        "from": "11:00",
        "to": "22:00"
    }
*/

// PUT routes
router.put('/:dayId', OpeningHoursController.updateOpeningHours);
router.put('/day/:day', OpeningHoursController.updateOpeningHoursByDay);
/*{
    "hours": {
        "from": "10:00",
        "to": "23:00"
    }
*/
// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
