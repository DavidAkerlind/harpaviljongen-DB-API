import MenuService from '../services/menuService.js';
import { constructResObj } from '../utils/constructResObj.js';

export class MenuController {
	static async getAllMenus(req, res) {
		try {
			const menus = await MenuService.findAllMenus();
			if (!menus?.length) {
				return res
					.status(404)
					.json(constructResObj(404, 'No menus found', false));
			}
			res.json(
				constructResObj(
					200,
					'Menus retrieved successfully',
					true,
					menus
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async searchMenuItems(req, res) {
		try {
			const { query } = req.query;
			if (!query) {
				return res
					.status(400)
					.json(
						constructResObj(400, 'Search query is required', false)
					);
			}

			const searchResults = await MenuService.searchMenuItems(query);
			if (searchResults.length === 0) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`No items found matching: "${query}"`,
							false
						)
					);
			}

			const totalItems = searchResults.reduce(
				(sum, menu) => sum + menu.items.length,
				0
			);
			res.json(
				constructResObj(
					200,
					`Found ${totalItems} items matching: "${query}"`,
					true,
					searchResults
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async getMenuById(req, res) {
		try {
			const { menuId } = req.params;
			const menu = await MenuService.findMenuById(menuId);
			if (!menu) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Menu not found: ${menuId}`, false)
					);
			}
			res.json(
				constructResObj(200, 'Menu retrieved successfully', true, menu)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async getMenuItems(req, res) {
		try {
			const { menuId } = req.params;
			const items = await MenuService.getMenuItems(menuId);
			if (!items) {
				return res
					.status(404)
					.json(
						constructResObj(
							404,
							`No items found in menu: ${menuId}`,
							false
						)
					);
			}
			res.json(
				constructResObj(
					200,
					'Menu items retrieved successfully',
					true,
					items
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async createMenu(req, res) {
		try {
			const menu = await MenuService.createMenu(req.body);
			res.status(201).json(
				constructResObj(201, 'Menu created successfully', true, menu)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async createBulkMenus(req, res) {
		try {
			if (!Array.isArray(req.body)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							'Request body must be an array',
							false
						)
					);
			}
			const menus = await MenuService.createBulkMenus(req.body);
			res.status(201).json(
				constructResObj(201, 'Menus created successfully', true, menus)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async addMenuItem(req, res) {
		try {
			const { menuId } = req.params;
			const newItem = await MenuService.addMenuItem(menuId, req.body);
			if (!newItem) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Menu not found: ${menuId}`, false)
					);
			}
			res.status(201).json(
				constructResObj(201, 'Item added successfully', true, newItem)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateMenu(req, res) {
		try {
			const { menuId, field } = req.params;
			const { value } = req.body;

			let allowedFields = ['title', 'description', 'type'];

			if (menuId === 'menu-wine') {
				allowedFields.push('price');
			}

			if (!allowedFields.includes(field)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Cannot update field: ${field}. Allowed fields are: ${allowedFields.join(
								', '
							)}`,
							false
						)
					);
			}

			const menu = await MenuService.updateMenu(menuId, field, value);
			if (!menu) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Menu not found: ${menuId}`, false)
					);
			}
			res.json(
				constructResObj(200, 'Menu updated successfully', true, menu)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async updateMenuItem(req, res) {
		try {
			const { menuId, itemId, field } = req.params;
			const { value } = req.body;

			const allowedFields = ['title', 'description', 'price', 'active'];
			if (!allowedFields.includes(field)) {
				return res
					.status(400)
					.json(
						constructResObj(
							400,
							`Cannot update field: ${field}. Allowed fields are: ${allowedFields.join(
								', '
							)}`,
							false
						)
					);
			}

			const item = await MenuService.updateMenuItem(
				menuId,
				itemId,
				field,
				value
			);
			if (!item) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Item or menu not found`, false)
					);
			}
			res.json(
				constructResObj(200, 'Item updated successfully', true, item)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async toggleMenuItem(req, res) {
		try {
			const { menuId, itemId } = req.params;
			const item = await MenuService.toggleMenuItem(menuId, itemId);
			if (!item) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Item or menu not found`, false)
					);
			}
			res.json(
				constructResObj(
					200,
					`Item toggled successfully to ${item.active}`,
					true,
					item
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async deleteMenu(req, res) {
		try {
			const { menuId } = req.params;
			const menu = await MenuService.deleteMenu(menuId);
			if (!menu) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Menu not found: ${menuId}`, false)
					);
			}
			res.json(
				constructResObj(200, 'Menu deleted successfully', true, menu)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async deleteMenuItem(req, res) {
		try {
			const { menuId, itemId } = req.params;
			const item = await MenuService.deleteMenuItem(menuId, itemId);
			if (!item) {
				return res
					.status(404)
					.json(
						constructResObj(404, `Item or menu not found`, false)
					);
			}
			res.json(
				constructResObj(200, 'Item deleted successfully', true, item)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}

	static async deleteAllMenus(req, res) {
		try {
			const result = await MenuService.deleteAllMenus();
			if (!result.deletedCount) {
				return res
					.status(404)
					.json(
						constructResObj(404, 'No menus found to delete', false)
					);
			}
			res.json(
				constructResObj(
					200,
					`Successfully deleted ${result.deletedCount} menus`,
					true
				)
			);
		} catch (error) {
			res.status(500).json(
				constructResObj(500, 'Server error', false, error.message)
			);
		}
	}
}
