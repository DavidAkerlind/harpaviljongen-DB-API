import { constructResObj } from '../utils/constructResObj.js';
import Menu from '../models/menu.js';
import { v4 as uuidv4 } from 'uuid';

// ===================================================================
// ============= ↆↆↆↆↆ GET REQUEST FUNCTIONS ↆↆↆↆↆ  ==============
// ===================================================================

export async function getAllMenus(req, res) {
	try {
		const result = await Menu.find();

		if (!result) {
			return res
				.status(404)
				.json(constructResObj(404, `No menus found`, false));
		}

		res.json(
			constructResObj(
				200,
				`Request for all menus successful`,
				true,
				result
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}

// GET /api/menus/:menuId
export async function filterById(req, res) {
	const { menuId } = req.params;

	try {
		const result = await Menu.findOne({ id: menuId });

		if (!result) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		res.json(
			constructResObj(
				200,
				`Request for menu with id:${menuId} successful`,
				true,
				result
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}
export async function getItemsInMenu(req, res) {
	const { menuId } = req.params;

	try {
		const menu = await Menu.findOne({ id: menuId });

		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		res.json(
			constructResObj(
				200,
				`Items in menu:${menuId} retrieved successfully`,
				true,
				menu.items
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}

export async function searchMenuItems(req, res) {
	const { query } = req.query;

	try {
		if (!query) {
			return res
				.status(400)
				.json(constructResObj(400, 'Search query is required', false));
		}

		// Get all menus
		const menus = await Menu.find();

		// Search through all items in all menus
		const searchResults = [];

		menus.forEach((menu) => {
			const matchingItems = menu.items.filter(
				(item) =>
					(item.title &&
						item.title
							.toLowerCase()
							.includes(query.toLowerCase())) ||
					(item.description &&
						item.description
							.toLowerCase()
							.includes(query.toLowerCase()))
			);

			if (matchingItems.length > 0) {
				searchResults.push({
					menuId: menu.id,
					menuTitle: menu.title,
					items: matchingItems,
				});
			}
		});

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

		res.json(
			constructResObj(
				200,
				`Found ${searchResults.reduce(
					(sum, menu) => sum + menu.items.length,
					0
				)} items matching: "${query}"`,
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

// ===================================================================
// ============= ↆↆↆↆↆ  POST REQUEST FUNCTIONS  ↆↆↆↆↆ ==============
// ===================================================================

export async function postMenu(req, res) {
	try {
		const menuData = req.body;

		if (menuData.items && Array.isArray(menuData.items)) {
			menuData.items = menuData.items.map((item) => ({
				...item,
				id: uuidv4().slice(0, 8),
			}));
		}

		const newMenu = await Menu.create(menuData);

		res.status(201).json(
			constructResObj(201, 'Menu created successfully', true, newMenu)
		);
	} catch (error) {
		console.error('Error with menu post:', error);
		res.status(500).json(
			constructResObj(
				500,
				`Server error when creating menu: ${error.message}`,
				false
			)
		);
	}
}

export async function postBulk(req, res) {
	try {
		const menusArray = req.body;
		if (!Array.isArray(menusArray)) {
			return res
				.status(400)
				.json(
					constructResObj(
						400,
						'Body needs to be an array of objects',
						false
					)
				);
		}

		// Transform the data to add UUIDs for all items in all menus
		const transformedMenus = menusArray.map((menu) => {
			if (menu.items && Array.isArray(menu.items)) {
				menu.items = menu.items.map((item) => ({
					...item,
					id: uuidv4().slice(0, 8),
					active: item.active ?? true,
				}));
			}
			return menu;
		});

		const result = await Menu.insertMany(transformedMenus);

		res.status(201).json(
			constructResObj(201, 'Menus inserted successfully', true, result)
		);
	} catch (error) {
		console.error('Error with bulk insert:', error);
		res.status(500).json(
			constructResObj(
				500,
				`Server error when inserting bulk menus: ${error.message}`,
				false
			)
		);
	}
}

export async function addMenuItem(req, res) {
	const { menuId } = req.params;
	let newItem = req.body;
	console.log(newItem);

	try {
		const menu = await Menu.findOne({ id: menuId });

		// Find the menu and add the new item

		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		const itemId = uuidv4().slice(0, 8);

		newItem = {
			id: itemId,
			active: newItem.active ?? true,
			title: newItem.title || '',
			description: newItem.description || '',
			price: newItem.price || '',
		};

		// Add producer only for wine menu
		if (menuId === 'menu-wine') {
			newItem.producer = newItem.producer || '';
		}

		// Validate title
		if (!newItem.title) {
			return res
				.status(400)
				.json(constructResObj(400, 'Title is required', false));
		}

		// Add the new item to the items array
		menu.items.push(newItem);

		// Save the updated menu
		const updatedMenu = await menu.save();

		res.status(201).json(
			constructResObj(
				201,
				`Item added successfully to menu:${menuId}`,
				true,
				newItem
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}
// ===================================================================
// ============= ↆↆↆↆↆ  PUT REQUEST FUNCTIONS ↆↆↆↆↆ  ==============
// ===================================================================
export async function updateMenu(req, res) {
	const { menuId, field } = req.params;
	const { value } = req.body;

	try {
		// Check if field is allowed to be updated
		const allowedFields = ['title', 'description', 'price', 'type'];
		if (!allowedFields.includes(field)) {
			return res
				.status(400)
				.json(
					constructResObj(
						400,
						`Cannot update field:${field}. Allowed fields are: ${allowedFields.join(
							', '
						)}`,
						false
					)
				);
		}

		const menu = await Menu.findOne({ id: menuId });

		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		menu[field] = value;
		const updatedMenu = await menu.save();

		res.json(
			constructResObj(
				200,
				`Field:${field} in menu:${menuId} updated successfully`,
				true,
				updatedMenu.title
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}

export async function updateMenuItem(req, res) {
	const { menuId, itemId, field } = req.params;
	const { value } = req.body;

	try {
		// Check if field is allowed to be updated
		const allowedFields = ['title', 'description', 'price'];
		if (!allowedFields.includes(field)) {
			return res
				.status(400)
				.json(
					constructResObj(
						400,
						`Cannot update field:${field}. Allowed fields are: ${allowedFields.join(
							', '
						)}`,
						false
					)
				);
		}

		const menu = await Menu.findOne({ id: menuId });
		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		// Find the item to update
		const item = menu.items.find((item) => item.id === itemId);
		if (!item) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No item found with id:${itemId} in menu:${menuId}`,
						false
					)
				);
		}

		// Update the field
		item[field] = value;

		// Save the updated menu
		await menu.save();

		res.json(
			constructResObj(
				200,
				`Item ${itemId} ${field} updated successfully in menu:${menuId}`,
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

// ===================================================================
// ============= ↆↆↆↆↆ PATCH REQUEST FUNCTIONS ↆↆↆↆↆ  ==============
// ===================================================================
export async function toggleMenuItem(req, res) {
	const { menuId, itemId } = req.params;

	try {
		const menu = await Menu.findOne({ id: menuId });

		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		// Find the item to toggle
		const item = menu.items.find((item) => item.id === itemId);

		if (!item) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No item found with id:${itemId} in menu:${menuId}`,
						false
					)
				);
		}

		// Toggle the active status
		item.active = !item.active;

		// Save the updated menu
		await menu.save();

		res.json(
			constructResObj(
				200,
				`Item ${itemId} active status toggled to ${item.active}`,
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
// ===================================================================
// ============= ↆↆↆↆↆ DELETE REQUEST FUNCTIONS ↆↆↆↆↆ ==============
// ===================================================================
export async function deleteMenuItem(req, res) {
	const { menuId, itemId } = req.params;

	try {
		const menu = await Menu.findOne({ id: menuId });

		if (!menu) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		// Find the index of the item to remove
		const itemIndex = menu.items.findIndex((item) => item.id === itemId);

		if (itemIndex === -1) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No item found with id:${itemId} in menu:${menuId}`,
						false
					)
				);
		}

		// Remove the item
		const removedItem = menu.items[itemIndex];
		menu.items.splice(itemIndex, 1);

		// Save the updated menu
		const updatedMenu = await menu.save();

		res.json(
			constructResObj(
				200,
				`Item with id:${itemId} deleted successfully from menu:${menuId}`,
				true,
				removedItem
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}

export async function deleteMenu(req, res) {
	const { menuId } = req.params;
	try {
		const result = await Menu.findOneAndDelete({ id: menuId });

		if (!result) {
			return res
				.status(404)
				.json(
					constructResObj(
						404,
						`No menu found with id:${menuId}`,
						false
					)
				);
		}

		res.json(
			constructResObj(
				200,
				`Menu with id:${menuId} deleted successfully`,
				true,
				result
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}

export async function deleteAllMenus(req, res) {
	try {
		const result = await Menu.deleteMany({});

		if (result.deletedCount === 0) {
			return res
				.status(404)
				.json(constructResObj(404, 'No menus found to delete', false));
		}

		res.json(
			constructResObj(
				200,
				`Successfully deleted ${result.deletedCount}(all) menus`,
				true
			)
		);
	} catch (error) {
		res.status(500).json(
			constructResObj(500, 'Server error', false, error.message)
		);
	}
}
