import { constructResObj } from '../utils/constructResObj.js';
import Menu from '../models/menu.js';

// =====================================================
// =============  GET REQUEST FUNCTIONS   ==============
// =====================================================

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

// =====================================================
// =============  POST REQUEST FUNCTIONS   ==============
// =====================================================

export async function postMenu(req, res) {
	try {
		const newMenu = await Menu.insertOne(req.body);

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

		await Menu.deleteMany({});
		const result = await Menu.insertMany(menusArray);

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

		const nextId =
			menu.items.length > 0
				? Math.max(...menu.items.map((item) => item.id)) + 1
				: 1;

		newItem = {
			id: nextId,
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
// =====================================================
// =============  PATCH REQUEST FUNCTIONS   ==============
// =====================================================
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
		const item = menu.items.find((item) => item.id === Number(itemId));

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
// =====================================================
// =============  DELETE REQUEST FUNCTIONS   ==============
// =====================================================
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
		const itemIndex = menu.items.findIndex(
			(item) => item.id === Number(itemId)
		);

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
				`Menu with id:${menuId} deleted successful`,
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
