import {db} from "../config/db.js";

export const saveWallet = (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        return res.status(400).json('Wallet address is required');
    }
    const insertWallet = 'INSERT INTO users (wallet_address) VALUES (?)';
    db.query(insertWallet, [walletAddress], (err, result) => {
        if (err) {
            return res.status(500).json('Error storing wallet address');
        }
        res.status(201).json({ id: result.insertId, walletAddress });
    });
};

export const verifySocial = (req, res) => {
    const { walletAddress, socialMediaLink } = req.body;

    if (!walletAddress || !socialMediaLink) {
        return res.status(400).json('Wallet address and social media link are required');
    }
    const insertWallet = `UPDATE users SET social_media_link = ? WHERE wallet_address = ?`;
    db.query(insertWallet, [socialMediaLink, walletAddress], (err, result) => {
        if (err) {
            return res.status(500).json('Error updating user profile');
        }      
        if (result.affectedRows === 0) {
            return res.status(404).json('Wallet address not found');
        }
        res.send({ message: 'User profile updated successfully', walletAddress, socialMediaLink });
    }); 
}
