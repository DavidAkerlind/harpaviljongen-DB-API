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
	updateMenuItem,
	getItemsInMenu,
	searchMenuItems,
	deleteAllMenus,
} from '../controllers/menuController.js';

const router = Router();

// ==== GET ====
router.get('/', getAllMenus);
router.get('/search/items', searchMenuItems);
router.get('/:menuId', filterById);
router.get('/:menuId/items', getItemsInMenu);

// ==== POST ====
router.post('/', postMenu);
router.post('/bulk', postBulk);
router.post('/:menuId/items', addMenuItem);

// ==== DELETE ====
router.delete('/:menuId', deleteMenu); // Ex: DELETE /api/menus/weekly-wine för att ta bort den menyn helt
router.delete('/:menuId/items/:itemId', deleteMenuItem);
router.delete('/', deleteAllMenus);

// ==== PUT ====
router.put('/:menuId/:field', updateMenu); // Ex: PUT /api/menus/menu-always/title med en body på { "value": "nyttVärde"}
router.put('/:menuId/items/:itemId/:field', updateMenuItem); // Ex: PUT /api/menus/menu-always/items/1/title med en body på { "value": "nyttVärde"} 	const allowedFields = ['title', 'description', 'price', 'active'];

// ==== PATCH ====
router.patch('/:menuId/items/:itemId/toggle', toggleMenuItem);

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
