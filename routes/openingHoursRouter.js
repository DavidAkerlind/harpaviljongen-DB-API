import { Router } from 'express';
import { OpeningHoursController } from '../controllers/openingHoursController.js';
import { fallbackController } from '../services/fallbackService.js';
import { protectWrites } from '../middlewares/auth.js';

const router = Router();

// Reads are public, everything else needs a login token
router.use(protectWrites);

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
router.put('/', OpeningHoursController.updateAllOpeningHours);
/*{
    "days": [
        { "day": "Måndag", "hours": { "from": "", "to": "" } },
        { "day": "Torsdag", "hours": { "from": "17:00", "to": "00:00" } }
    ]
*/
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
