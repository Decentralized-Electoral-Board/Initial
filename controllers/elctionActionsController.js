import {db} from "../config/db.js";
import moment from "moment";
import { authenticateAdmin } from "./adminAuthentication.js";
import multer from "multer";

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
 
export const newPoll = (req, res) => {
    upload.array('candidatePhotos')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: 'File upload error', error: err });
        } else if (err) {
            return res.status(500).json({ message: 'Unknown error', error: err });
        }
        const { description, categories } = req.body;
        
        if (!description || !categories) {
            return res.status(400).json({ message: 'Description and categories are required' });
        }
        try {
            const parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;

            authenticateAdmin(req, res, () => {
                let photoIndex = 0;
                const checkPoll = 'SELECT * FROM polls WHERE description = ?';
                
                db.execute(checkPoll, [description], (err, results) => {
                    if (err) return res.status(500).json({ message: 'Database error', error: err });
                    if (results.length > 0) {
                        return res.status(400).json({ message: 'Poll already exists' }); 
                    } 
                    const createPoll = "INSERT INTO polls (`description`, `created_at`) VALUES (?)";     
                    const pollValues = [
                        description,
                        moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")
                    ];
                    db.query(createPoll, [pollValues], (err, newPoll) => {
                        if (err) return res.status(500).json({ message: 'Error creating poll', error: err }); 
                        const pollId = newPoll.insertId;
                        const categoryPromises = parsedCategories.map(category => {
                            return new Promise((resolve, reject) => {
                                if (!category.name) {
                                    reject(new Error('Category name is required'));
                                    return;
                                }
                                const createCategory = "INSERT INTO poll_categories (poll_id, category_name) VALUES (?, ?)";
                                db.query(createCategory, [pollId, category.name], (err, categoryResult) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    const categoryId = categoryResult.insertId;
                                    const candidatePromises = category.candidates.map(candidate => {
                                        return new Promise((resolve, reject) => {
                                            if (!candidate.name) {
                                                reject(new Error('Candidate name is required'));
                                                return;
                                            }
                                            const photoPath = req.files && req.files[photoIndex] ? 
                                                `/uploads/candidates/${req.files[photoIndex].filename}` : 
                                                null;
                                            photoIndex++;

                                            const createCandidate = `
                                                INSERT INTO candidates 
                                                (category_id, name, description, photo) 
                                                VALUES (?, ?, ?, ?)
                                            `;

                                            const candidateValues = [
                                                categoryId,
                                                candidate.name,
                                                candidate.description || null,
                                                photoPath
                                            ];

                                            db.query(createCandidate, candidateValues, (err, result) => {
                                                if (err) reject(err);
                                                else resolve(result);
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
                                    error: err.message
                                });
                            });
                    });
                });
            });
        } catch (error) {
            return res.status(400).json({ message: 'Invalid categories format', error: error.message });
        }
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
            c.photo_url AS candidate_photo
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

        // Transform the flat results into a nested structure
        const elections = [];
        let currentPoll = null;
        let currentCategory = null;

        results.forEach(row => {
            // If this is a new poll
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

            // If this is a new category
            if (row.category_id && (!currentCategory || currentCategory.id !== row.category_id)) {
                currentCategory = {
                    id: row.category_id,
                    name: row.category_name,
                    candidates: []
                };
                currentPoll.categories.push(currentCategory);
            }

            // Add candidate if it exists
            if (row.candidate_id) {
                currentCategory.candidates.push({
                    id: row.candidate_id,
                    name: row.candidate_name,
                    description: row.candidate_description,
                    photo_url: row.candidate_photo
                });
            }
        });

        res.status(200).json({
            message: "Elections fetched successfully",
            data: elections
        });
    });
};

// Get a specific election by ID
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
            c.photo_url AS candidate_photo
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

        // Transform the results into a nested structure
        const election = {
            id: results[0].poll_id,
            description: results[0].poll_description,
            created_at: results[0].poll_created_at,
            categories: []
        };

        let currentCategory = null;

        results.forEach(row => {
            // If this is a new category
            if (row.category_id && (!currentCategory || currentCategory.id !== row.category_id)) {
                currentCategory = {
                    id: row.category_id,
                    name: row.category_name,
                    candidates: []
                };
                election.categories.push(currentCategory);
            }

            // Add candidate if it exists
            if (row.candidate_id) {
                currentCategory.candidates.push({
                    id: row.candidate_id,
                    name: row.candidate_name,
                    description: row.candidate_description,
                    photo_url: row.candidate_photo
                });
            }
        });

        res.status(200).json({
            message: "Election fetched successfully",
            data: election
        });
    });
};

// Get active/ongoing elections
// export const getActiveElections = (req, res) => {
//     const query = `
//         SELECT 
//             p.id AS poll_id,
//             p.description AS poll_description,
//             p.created_at AS poll_created_at,
//             pc.id AS category_id,
//             pc.category_name,
//             c.id AS candidate_id,
//             c.name AS candidate_name,
//             c.description AS candidate_description,
//             c.photo_url AS candidate_photo
//         FROM polls p
//         LEFT JOIN poll_categories pc ON p.id = pc.poll_id
//         LEFT JOIN candidates c ON pc.id = c.category_id
//         WHERE p.status = 'active'  -- Assuming you have a status field
//         ORDER BY p.created_at DESC, pc.id, c.id
//     `;

//     db.query(query, (err, results) => {
//         if (err) {
//             return res.status(500).json({
//                 message: "Error fetching active elections",
//                 error: err
//             });
//         }

//         // Transform the results similar to getAllElections
//         const elections = [];
//         let currentPoll = null;
//         let currentCategory = null;

//         results.forEach(row => {
//             // If this is a new poll
//             if (!currentPoll || currentPoll.id !== row.poll_id) {
//                 currentPoll = {
//                     id: row.poll_id,
//                     description: row.poll_description,
//                     created_at: row.poll_created_at,
//                     categories: []
//                 };
//                 elections.push(currentPoll);
//                 currentCategory = null;
//             }

//             // If this is a new category
//             if (row.category_id && (!currentCategory || currentCategory.id !== row.category_id)) {
//                 currentCategory = {
//                     id: row.category_id,
//                     name: row.category_name,
//                     candidates: []
//                 };
//                 currentPoll.categories.push(currentCategory);
//             }

//             // Add candidate if it exists
//             if (row.candidate_id) {
//                 currentCategory.candidates.push({
//                     id: row.candidate_id,
//                     name: row.candidate_name,
//                     description: row.candidate_description,
//                     photo_url: row.candidate_photo
//                 });
//             }
//         });

//         res.status(200).json({
//             message: "Active elections fetched successfully",
//             data: elections
//         });
//     });
// };