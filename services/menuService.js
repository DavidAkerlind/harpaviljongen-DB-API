import Menu from '../models/menu.js';
import { v4 as uuidv4 } from 'uuid';

class MenuService {
	async findAllMenus() {
		return await Menu.find();
	}

	async findMenuById(menuId) {
		return await Menu.findOne({ id: menuId });
	}

	async getMenuItems(menuId) {
		const menu = await this.findMenuById(menuId);
		return menu?.items || null;
	}

	async searchMenuItems(query) {
		const menus = await this.findAllMenus();
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

		return searchResults;
	}

	async createMenu(menuData) {
		if (menuData.items && Array.isArray(menuData.items)) {
			menuData.items = menuData.items.map((item) => ({
				...item,
				id: uuidv4().slice(0, 8),
				active: item.active ?? true,
			}));
		}
		return await Menu.create(menuData);
	}

	async createBulkMenus(menusArray) {
		const transformedMenus = menusArray.map((menu) => ({
			...menu,
			items: menu.items?.map((item) => ({
				...item,
				id: uuidv4().slice(0, 8),
				active: item.active ?? true,
			})),
		}));
		return await Menu.insertMany(transformedMenus);
	}

	async addMenuItem(menuId, itemData) {
		const menu = await this.findMenuById(menuId);
		if (!menu) return null;

		const newItem = {
			...itemData,
			id: uuidv4().slice(0, 8),
			active: itemData.active ?? true,
			title: itemData.title || '',
			description: itemData.description || '',
			price: itemData.price || '',
		};

		if (menuId === 'menu-wine') {
			newItem.producer = itemData.producer || '';
		}

		menu.items.push(newItem);
		await menu.save();
		return newItem;
	}

	async updateMenu(menuId, field, value) {
		const menu = await this.findMenuById(menuId);
		if (!menu) return null;

		menu[field] = value;
		return await menu.save();
	}

	async updateMenuItem(menuId, itemId, field, value) {
		const menu = await this.findMenuById(menuId);
		if (!menu) return null;

		const item = menu.items.find((item) => item.id === itemId);
		if (!item) return null;

		item[field] = value;
		await menu.save();
		return item;
	}

	async toggleMenuItem(menuId, itemId) {
		const menu = await this.findMenuById(menuId);
		if (!menu) return null;

		const item = menu.items.find((item) => item.id === itemId);
		if (!item) return null;

		item.active = !item.active;
		await menu.save();
		return item;
	}

	async deleteMenu(menuId) {
		return await Menu.findOneAndDelete({ id: menuId });
	}

	async deleteMenuItem(menuId, itemId) {
		const menu = await this.findMenuById(menuId);
		if (!menu) return null;

		const itemIndex = menu.items.findIndex((item) => item.id === itemId);
		if (itemIndex === -1) return null;

		const [removedItem] = menu.items.splice(itemIndex, 1);
		await menu.save();
		return removedItem;
	}

	async deleteAllMenus() {
		return await Menu.deleteMany({});
	}
}

export default new MenuService();
