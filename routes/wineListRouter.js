import { Router } from 'express';
import { WineListController } from '../controllers/wineListController.js';
import { fallbackController } from '../services/fallbackService.js';

const router = Router();

// Hämta alla vinblad
router.get('/', WineListController.getAll);

// Hämta ett specifikt vinblad (t.ex. red-wine, white-wine, bubbles-wine)
router.get('/:id', WineListController.getById);

// Uppdatera ett helt vinblad (skicka in hela objektet)
router.put('/:id', WineListController.updateWineList);

// Uppdatera ett vin i en vinlista (namn, pris, area, country)
router.put('/:listId/wine/:wineId', WineListController.updateWine);

// Lägg till nytt vin i en vinlista
router.post('/:id/wine', WineListController.addWine);

// Toggle active på ett vin i en vinlista
router.patch(
	'/:listId/wine/:wineId/toggle',
	WineListController.toggleWineActive
);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
