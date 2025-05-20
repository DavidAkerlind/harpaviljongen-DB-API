import { Router } from 'express';
import { fallbackController } from '../controllers/fallbackController.js';
import {
	filterById,
	getAllMenus,
	deleteMenu,
	postMenu,
	updateMenu,
	postBulk,
	addMenuItem,
	deleteMenuItem,
	toggleMenuItem,
} from '../controllers/menuController.js';

const router = Router();

// ==== GET ====
router.get('/', getAllMenus);
router.get('/:menuId', filterById);

// ==== POST ====
router.post('/', postMenu);
router.post('/bulk', postBulk);
router.post('/:menuId/items', addMenuItem);

// ==== DELETE ====
router.delete('/:menuId', deleteMenu); // Ex: DELETE /api/menus/weekly-wine för att ta bort den menyn helt
router.delete('/:menuId/items/:itemId', deleteMenuItem);
// // ==== PUT ====
router.put('/:menuId/:field', updateMenu);
router.patch('/:menuId/items/:itemId/toggle', toggleMenuItem);
// menuRouter.put('/:menuId/:field', updateMenu); // Ex: PUT /api/menus/menu-always/title med en body på { "value": "nyttVärde"}
// menuRouter.put('/:menuId/:itemId/:field', updateMenuItem); // Ex: PUT /api/menus/menu-always/1/title med en body på { "value": "nyttVärde"} 	const allowedFields = ['title', 'description', 'price', 'active'];

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
