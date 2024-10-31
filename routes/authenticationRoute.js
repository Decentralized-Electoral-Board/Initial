import express from "express";
import { authenticateUser, authorizeAdmin } from '../middleware/jwt.js';
import {registerAdmin, authenticateAdmin} from "../controllers/adminAuthentication.js"

const router = express.Router()

router.post('/register', registerAdmin)
router.post('/login', authenticateAdmin) 

export default router 