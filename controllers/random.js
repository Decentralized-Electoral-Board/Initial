import {db} from "../../config/connectDB.js"
import {authenticateAdmin} from "../middleware/jwt.js"
import moment from "moment"
import { authenticateAdmin } from "./adminAuthentication.js";

export const newPoll = (req, res) => {
    authenticateAdmin(req, res, () => {
        const { description, categories } = req.body;

        // First, check if poll exists
        const checkPoll = 'SELECT * FROM polls WHERE description = ?';
        db.execute(checkPoll, [description], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.length > 0) {
                return res.status(400).json({ message: 'Poll already exists' });
            }

            // Create new poll
            const createPoll = "INSERT INTO polls (description, created_at) VALUES (?, ?)";     
            const pollValues = [
                description,
                moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")
            ];

            db.query(createPoll, pollValues, (err, pollResult) => {
                if (err) return res.status(500).json(err);
                
                const pollId = newPoll.insertId;

                // Insert categories
                const categoryPromises = categories.map(category => {
                    return new Promise((resolve, reject) => {
                        const createCategory = "INSERT INTO poll_categories (poll_id, category_name) VALUES (?, ?)";
                        db.query(createCategory, [pollId, category.name], (err, categoryResult) => {
                            if (err) reject(err);

                            const categoryId = categoryResult.insertId;

                            // Insert candidates for this category
                            const candidatePromises = category.candidates.map(candidate => {
                                return new Promise((resolve, reject) => {
                                    const createCandidate = `
                                        INSERT INTO candidates 
                                        (category_id, name, description, wallet_address) 
                                        VALUES (?, ?, ?, ?)
                                    `;
                                    db.query(createCandidate, [
                                        categoryId,
                                        candidate.name,
                                        candidate.description,
                                        candidate.walletAddress
                                    ], (err, result) => {
                                        if (err) reject(err);
                                        resolve(result);
                                    });
                                });
                            });

                            Promise.all(candidatePromises)
                                .then(() => resolve())
                                .catch(err => reject(err));
                        });
                    });
                });

                Promise.all(categoryPromises)
                    .then(() => {
                        res.status(200).json({
                            message: "Poll created successfully",
                            pollId: pollId
                        });
                    })
                    .catch(err => {
                        res.status(500).json({
                            message: "Error creating poll categories and candidates",
                            error: err
                        });
                    });
            });
        });
    });
};

// Add endpoint to store votes
export const storeVote = (req, res) => {
    authenticateAdmin(req, res, () => {
        const { candidateId, voterAddress, transactionHash } = req.body;

        const storeVoteQuery = `
            INSERT INTO votes 
            (candidate_id, voter_address, transaction_hash, voted_at) 
            VALUES (?, ?, ?, ?)
        `;

        const voteValues = [
            candidateId,
            voterAddress,
            transactionHash,
            moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")
        ];

        db.query(storeVoteQuery, voteValues, (err, result) => {
            if (err) return res.status(500).json(err);
            res.status(200).json({
                message: "Vote recorded successfully",
                voteId: result.insertId
            });
        });
    });
};