import MenuPdf from '../models/MenuPdf.js';
import { MAX_MENU_LABEL, MAX_MENUS } from '../models/menuList.js';
import MenuList from '../models/menuList.js';
import {
	createMenuList,
	getMenuList,
	labelTaken,
	listMenuLists,
} from '../services/menuListService.js';
import { deleteFromCloudinary } from '../services/cloudinaryService.js';
import { logActivity } from '../services/activityService.js';
import { constructResObj } from '../utils/constructResObj.js';

const fail = (res, status, message) =>
	res.status(status).json(constructResObj(status, message, false));

const labelProblem = (label) =>
	typeof label !== 'string' || !label.trim() || label.trim().length > MAX_MENU_LABEL
		? `Name must be 1–${MAX_MENU_LABEL} characters`
		: null;

const flagProblem = (body) =>
	['navbar', 'home'].some(
		(key) => body[key] !== undefined && typeof body[key] !== 'boolean'
	)
		? 'navbar and home must be true or false'
		: null;

const menuDetails = (menu) => ({ menuType: menu.type, label: menu.label });

export class MenuListController {
	// GET /api/menu-lists – public, in the order the tabs and buttons are shown
	static async list(req, res) {
		const menus = await listMenuLists();
		res.json(constructResObj(200, 'Menus retrieved successfully', true, menus));
	}

	// POST /api/menu-lists { label, navbar?, home? }
	static async create(req, res) {
		const body = req.body ?? {};
		const problem = labelProblem(body.label) || flagProblem(body);
		if (problem) return fail(res, 400, problem);

		const label = body.label.trim();
		if ((await MenuList.countDocuments()) >= MAX_MENUS) {
			return fail(res, 400, `There can be at most ${MAX_MENUS} menus`);
		}
		if (await labelTaken(label)) {
			return fail(res, 409, 'A menu with that name already exists');
		}

		const menu = await createMenuList({
			label,
			navbar: body.navbar,
			home: body.home,
		});
		await logActivity(req, 'menu.create', menuDetails(menu));
		res
			.status(201)
			.json(constructResObj(201, 'Menu created successfully', true, menu));
	}

	// PATCH /api/menu-lists/:type { label?, navbar?, home? }
	static async update(req, res) {
		const body = req.body ?? {};
		const problem =
			(body.label !== undefined && labelProblem(body.label)) || flagProblem(body);
		if (problem) return fail(res, 400, problem);

		const menu = await getMenuList(req.params.type);
		if (!menu) return fail(res, 404, 'Menu not found');

		const changes = {};
		if (body.label !== undefined && body.label.trim() !== menu.label) {
			const label = body.label.trim();
			if (await labelTaken(label, menu.type)) {
				return fail(res, 409, 'A menu with that name already exists');
			}
			changes.label = { from: menu.label, to: label };
			menu.label = label;
		}
		for (const key of ['navbar', 'home']) {
			if (body[key] !== undefined && body[key] !== menu[key]) {
				changes[key] = body[key];
				menu[key] = body[key];
			}
		}

		if (Object.keys(changes).length) {
			await menu.save();
			await logActivity(req, 'menu.update', { ...menuDetails(menu), changes });
		}
		res.json(constructResObj(200, 'Menu updated successfully', true, menu));
	}

	// DELETE /api/menu-lists/:type – also deletes its PDFs. Meny and Vinlista can't be deleted.
	static async remove(req, res) {
		const menu = await getMenuList(req.params.type);
		if (!menu) return fail(res, 404, 'Menu not found');
		if (menu.builtIn) {
			return fail(res, 400, 'Meny and Vinlista can not be deleted');
		}

		const pdfs = await MenuPdf.find({ type: menu.type });
		for (const pdf of pdfs) {
			try {
				await deleteFromCloudinary(pdf.publicId, pdf.resourceType);
			} catch (error) {
				// Stop here so no PDF is left without its file; deleting again continues
				return fail(
					res,
					502,
					`Could not delete the file from Cloudinary: ${error.message}`
				);
			}
			await MenuPdf.deleteOne({ _id: pdf._id });
		}

		await MenuList.deleteOne({ _id: menu._id });
		await logActivity(req, 'menu.delete', {
			...menuDetails(menu),
			pdfs: pdfs.length,
		});
		res.json(constructResObj(200, 'Menu deleted successfully', true, menu));
	}
}
