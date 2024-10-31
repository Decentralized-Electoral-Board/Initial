CREATE TABLE polls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL
);

CREATE TABLE poll_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    poll_id INT NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id)
);

CREATE TABLE candidates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    wallet_address VARCHAR(42),
    FOREIGN KEY (category_id) REFERENCES poll_categories(id)
);

CREATE TABLE votes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    candidate_id INT NOT NULL,
    voter_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    voted_at DATETIME NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);