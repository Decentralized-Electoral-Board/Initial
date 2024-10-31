import express from "express";
import { authenticateUser, authorizeAdmin } from '../middleware/jwt.js';
import {newPoll} from "../controllers/elctionActionsController.js"

const router = express.Router()

router.post('/add-poll', newPoll); 

export default router  