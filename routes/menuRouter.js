import { Router } from 'express';
import { constructResObj } from '../utils/constructResObj.js';
import Menu from '../models/menu.js';

const router = Router();

router.get('/', async (req, res) => {
	let result = await Menu.find();

	res.json(constructResObj(200, 'Success!', true, result));
});
