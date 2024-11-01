import express from "express";
import {saveWallet, verifySocial} from "../controllers/userController.js"

const router = express.Router()

router.post('/connect', saveWallet);
router.post('/add-social', verifySocial); 

export default router  