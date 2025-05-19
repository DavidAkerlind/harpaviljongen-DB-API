import { Router } from 'express';
import { constructResObj } from '../utils/constructResObj.js';
import Menu from '../models/menu.js';
import { fallbackController } from '../controllers/fallbackController.js';
import {
	filterById,
	getAllMenus,
	deleteMenu,
	postMenu,
} from '../controllers/menuController.js';

const router = Router();

// ==== GET ====
router.get('/', getAllMenus);
router.get('/:menuId', filterById);

// ==== POST ====
router.post('/', postMenu);

// ==== DELETE ====
router.delete('/:menuId', deleteMenu);
// menuRouter.delete('/:menuId', deleteMenu); // Ex: DELETE /api/menus/weekly-wine för att ta bort den menyn helt

// // ==== PUT ====
// menuRouter.put('/:menuId/:field', updateMenu); // Ex: PUT /api/menus/menu-always/title med en body på { "value": "nyttVärde"}
// menuRouter.put('/:menuId/:itemId/:field', updateMenuItem); // Ex: PUT /api/menus/menu-always/1/title med en body på { "value": "nyttVärde"} 	const allowedFields = ['title', 'description', 'price', 'active'];

// ==== FALLBACK ====
router.use(fallbackController);

// ==== EXPORT ====
export default router;
