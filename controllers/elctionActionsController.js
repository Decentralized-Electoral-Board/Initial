import {db} from "../config/db.js";
import moment from "moment";
import { authenticateAdmin } from "./adminAuthentication.js";
import multer from "multer";
//MULTER SETUP FOR IMAGES
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/candidates');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
const cpUpload = upload.single('photo');

 //API FUNCTIONS
 export const createElection = (req, res) => {
    const { description, categories, duration } = req.body;
    if (!description || !categories || !Array.isArray(categories) || categories.length === 0 || !duration) {
        return res.status(400).json({ 
            message: 'Description, duration (in hours), and categories array with at least one item are required' 
        });
    }
    if (isNaN(duration) || duration <= 0) {
        return res.status(400).json({ 
            message: 'Duration must be a positive number of hours' 
        });
    }
    for (let category of categories) {
        if (!category.name) {
            return res.status(400).json({ 
                message: 'Each category must have a valid name' 
            });
        }
    }
    const checkPoll = 'SELECT * FROM polls WHERE description = ?';
    db.execute(checkPoll, [description], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length > 0) {
            return res.status(400).json({ message: 'Poll already exists' }); 
        }
        const createdAt = moment(Date.now());
        const endTime = createdAt.clone().add(duration, 'hours').format("YYYY-MM-DD HH:mm:ss");
        const createPoll = "INSERT INTO polls (`description`, `created_at`, `end_time`) VALUES (?, ?, ?)";
        const pollValues = [
            description,
            createdAt.format("YYYY-MM-DD HH:mm:ss"),
            endTime
        ];
        db.query(createPoll, pollValues, (err, newPoll) => {
            if (err) return res.status(500).json({ message: 'Error creating poll', error: err });
            const pollId = newPoll.insertId;
            const categoryPromises = categories.map(category => {
                return new Promise((resolve, reject) => {
                    const createCategory = "INSERT INTO poll_categories (poll_id, category_name) VALUES (?, ?)";
                    db.query(createCategory, [pollId, category.name], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            });
            Promise.all(categoryPromises)
                .then(() => {
                    res.status(200).json({
                        message: "Election created successfully",
                        pollId: pollId,
                        endTime: endTime
                    });
                })
                .catch(err => {
                    res.status(500).json({
                        message: "Error creating poll categories",
                        error: err.message
                    });
                });
        });
    });
};
  
export const getElectionCategories = (req, res) => {
    const pollId = req.params.pollId;

    const query = `
        SELECT id, category_name 
        FROM poll_categories 
        WHERE poll_id = ?
    `;
    db.query(query, [pollId], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error fetching categories",
                error: err
            });
        }
        res.status(200).json({
            message: "Categories fetched successfully",
            categories: results
        });
    });
};

export const addCandidate = (req, res) => {
    const upload = multer({ storage: storage }).single('photo');

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: 'File upload error', error: err.message });
        } else if (err) {
            return res.status(500).json({ message: 'Unknown upload error', error: err.message });
        }
        const { categoryId, name, description } = req.body;
        if (!categoryId || !name) {
            return res.status(400).json({
                message: 'Category ID and candidate name are required'
            });
        }
        const photoPath = req.file ? `/uploads/candidates/${req.file.filename}` : null;
        const createCandidate = `
            INSERT INTO candidates 
            (category_id, name, description, photo) 
            VALUES (?, ?, ?, ?)
        `;
        const candidateValues = [
            categoryId,
            name,
            description || null,
            photoPath
        ];
        db.query(createCandidate, candidateValues, (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error creating candidate",
                    error: err
                });
            }
            res.status(200).json({
                message: "Candidate added successfully",
                candidateId: result.insertId
            });
        });
    });
};

export const getAllElections = (req, res) => {
    const query = `
        SELECT 
            p.id AS poll_id,
            p.description AS poll_description,
            p.created_at AS poll_created_at,
            pc.id AS category_id,
            pc.category_name,
            c.id AS candidate_id,
            c.name AS candidate_name,
            c.description AS candidate_description,
            c.photo AS candidate_photo
        FROM polls p
        LEFT JOIN poll_categories pc ON p.id = pc.poll_id
        LEFT JOIN candidates c ON pc.id = c.category_id
        ORDER BY p.created_at DESC, pc.id, c.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error fetching elections",
                error: err
            });
        }

        const elections = [];
        let currentPoll = null;
        let currentCategory = null;
         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/candidates/`

        results.forEach(row => {
            if (!currentPoll || currentPoll.id !== row.poll_id) {
                currentPoll = {
                    id: row.poll_id,
                    description: row.poll_description,
                    created_at: row.poll_created_at,
                    categories: []
                };
                elections.push(currentPoll);
                currentCategory = null; 
            }
            if (row.category_id && (!currentCategory || currentCategory.id !== row.category_id)) {
                currentCategory = {
                    id: row.category_id,
                    name: row.category_name,
                    candidates: []
                };
                currentPoll.categories.push(currentCategory);
            }
            if (currentCategory && row.candidate_id) {
                currentCategory.candidates.push({
                    id: row.candidate_id,
                    name: row.candidate_name,
                    description: row.candidate_description,
                    photo_url: row.candidate_photo ? `${baseUrl}${row.candidate_photo}` : null
                });
            }
        });
        res.status(200).json({
            message: "Elections fetched successfully",
            data: elections
        });
    });
};

export const getElectionById = (req, res) => {
    const pollId = req.params.id;
    
    const query = `
        SELECT 
            p.id AS poll_id,
            p.description AS poll_description,
            p.created_at AS poll_created_at,
            pc.id AS category_id,
            pc.category_name,
            c.id AS candidate_id,
            c.name AS candidate_name,
            c.description AS candidate_description,
            c.photo AS candidate_photo
        FROM polls p
        LEFT JOIN poll_categories pc ON p.id = pc.poll_id
        LEFT JOIN candidates c ON pc.id = c.category_id
        WHERE p.id = ?
        ORDER BY pc.id, c.id
    `;
    db.query(query, [pollId], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error fetching election",
                error: err
            });
        }
        if (results.length === 0) {
            return res.status(404).json({
                message: "Election not found"
            });
        }
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/candidates/`;
        const election = {
            id: results[0].poll_id,
            description: results[0].poll_description,
            created_at: results[0].poll_created_at,
            categories: [],
        };
        let currentCategory = null;
        results.forEach(row => {
            if (row.category_id && (!currentCategory || currentCategory.id !== row.category_id)) {
                currentCategory = {
                    id: row.category_id,
                    name: row.category_name,
                    candidates: []
                };
                election.categories.push(currentCategory);
            }

            if (row.candidate_id) {
                currentCategory.candidates.push({
                    id: row.candidate_id,
                    name: row.candidate_name,
                    description: row.candidate_description,
                    photo_url: row.candidate_photo ? `${baseUrl}${row.candidate_photo}` : null
                });
            }
        });

        res.status(200).json({
            message: "Election fetched successfully",
            data: election
        });
    });
};
