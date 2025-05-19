import { constructResObj } from '../utils/constructResObj.js';
import Menu from '../models/menu.js';

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

	if (!menuId) {
		return res
			.status(400)
			.json(constructResObj(400, `No menuId provided`, false));
	}

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

export async function postMenu(req, res) {
	try {
		const newMenu = req.body;
		const result = await Menu.insertOne(newMenu);

		res.status(201).json(
			constructResObj(201, 'Menu created successfully', true, result)
		);
	} catch (error) {
		console.error('Error with menu post:', error);
		res.status(500).json(
			constructResObj(
				400,
				`Error when creating menu: ${error.message}`,
				false
			)
		);
	}
}

export async function deleteMenu(req, res) {
	const { menuId } = req.params;

	if (!menuId) {
		return res
			.status(400)
			.json(constructResObj(400, `No menuId provided`, false));
	}

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
