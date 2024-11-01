import express from 'express';
import { createElection, getElectionCategories, addCandidate, getAllElections, getElectionById } from '../controllers/elctionActionsController.js';

const router = express.Router();

router.post('/create', createElection);
router.get('/:pollId/categories', getElectionCategories);
router.post('/candidate/add', addCandidate);
router.get('/elections', getAllElections);
router.get('/elections/:id', getElectionById);

export default router;