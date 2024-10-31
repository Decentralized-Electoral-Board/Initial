import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const registerAdmin = (req, res) => {
    const { username, password } = req.body;
    const checkAdmin = 'SELECT * FROM admins WHERE username = ?';
    db.execute(checkAdmin, [username], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length > 0) {
            return res.status(400).json({ message: 'Admin already exists' });
        } 
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ message: 'Error hashing password' });
            const insertAdmin = 'INSERT INTO admins (username, password) VALUES (?, ?)';
            db.execute(insertAdmin, [username, hashedPassword], (err, result) => {
                if (err) return res.status(500).json({ message: 'Database error' });
                const payload = { id: userId };
                            const token = jwt.sign(payload, process.env.KEY, { expiresIn: '1hr' });
                            res.cookie('accessToken', token, {
                                httpOnly: true
                            }).status(200).json({ message: "Admin created successfully.", token});
            });
        });
    });
};

export const authenticateAdmin = (req, res) => {
    const { username, password } = req.body;  
    const query = 'SELECT * FROM admins WHERE username = ?';
    db.execute(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const admin = results[0];
            bcrypt.compare(password, admin.password, (err, isMatch) => {
                if (isMatch) {
                    const token = jwt.sign({ id: admin.id }, 'secret_key', { expiresIn: '1h' });
                    res.json({ token });
                } else {
                    res.status(401).send('Invalid credentials');
                }
            });
        } else {
            res.status(404).send('Admin not found');
        }
    });
};
