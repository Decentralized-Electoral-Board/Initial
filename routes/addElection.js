// routes/electionRoutes.js
import express from 'express';
import { createElection, getElectionCategories, addCandidate, getAllElections } from '../controllers/elctionActionsController.js';

const router = express.Router();

router.post('/create', createElection);
router.get('/:pollId/categories', getElectionCategories);
router.post('/candidate/add', addCandidate);
router.get('/elections', getAllElections);

export default router;