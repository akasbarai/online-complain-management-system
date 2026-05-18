CREATE DATABASE IF NOT EXISTS civicresolve;
USE civicresolve;

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('Active', 'Inactive', 'Blocked', 'Pending') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hierarchy_levels (
    id VARCHAR(50) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id VARCHAR(50) DEFAULT NULL,
    status ENUM('Active', 'Inactive', 'Blocked', 'Pending') DEFAULT 'Active',
    level_depth INT DEFAULT 0,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES hierarchy_levels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS officers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    hierarchy_level_id VARCHAR(50) DEFAULT NULL,
    role ENUM('Officer', 'Admin') DEFAULT 'Officer',
    jurisdiction VARCHAR(100),
    status ENUM('Active', 'Inactive', 'Blocked', 'Pending') DEFAULT 'Pending',
    profile_photo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (hierarchy_level_id) REFERENCES hierarchy_levels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mobile VARCHAR(20),
    address TEXT,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('Active', 'Inactive', 'Blocked', 'Pending') DEFAULT 'Pending',
    password_reset_requested BOOLEAN DEFAULT FALSE,
    password_reset_requested_at DATETIME DEFAULT NULL,
    profile_picture LONGTEXT,
    id_card_url LONGTEXT,
    registered_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    image_url LONGTEXT,
    status ENUM('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Materials', 'Escalated', 'Resolved', 'Closed', 'Rejected') DEFAULT 'Submitted',
    priority ENUM('Unassigned', 'Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    assigned_officer_id VARCHAR(50) DEFAULT NULL,
    current_hierarchy_level_id VARCHAR(50) DEFAULT NULL,
    sla_deadline DATETIME DEFAULT NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_officer_id) REFERENCES officers(id) ON DELETE SET NULL,
    FOREIGN KEY (current_hierarchy_level_id) REFERENCES hierarchy_levels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS complaint_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS escalation_rules (
    id VARCHAR(50) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL,
    hierarchy_level_id VARCHAR(50) NOT NULL,
    time_limit_hours INT NOT NULL,
    target_level_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (hierarchy_level_id) REFERENCES hierarchy_levels(id) ON DELETE CASCADE,
    FOREIGN KEY (target_level_id) REFERENCES hierarchy_levels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target ENUM('All', 'Users', 'Officers', 'Admins') DEFAULT 'All',
    recipient_type ENUM('User', 'Officer', 'Admin') DEFAULT NULL,
    recipient_id VARCHAR(50) DEFAULT NULL,
    priority ENUM('Normal', 'Important', 'Urgent') DEFAULT 'Normal',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_reads (
    id VARCHAR(50) PRIMARY KEY,
    notification_id VARCHAR(50) NOT NULL,
    recipient_type ENUM('User', 'Officer', 'Admin') NOT NULL,
    recipient_id VARCHAR(50) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_notification_recipient (notification_id, recipient_type, recipient_id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_officer_id ON complaints(assigned_officer_id);
CREATE INDEX idx_complaints_department ON complaints(department_id);
CREATE INDEX idx_complaints_sla ON complaints(sla_deadline);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notification_reads_recipient ON notification_reads(recipient_type, recipient_id);

-- Migration: Fix base64 image storage (run if DB already exists)
-- ALTER TABLE users MODIFY COLUMN profile_picture LONGTEXT;
-- ALTER TABLE users MODIFY COLUMN id_card_url LONGTEXT;
-- ALTER TABLE complaints MODIFY COLUMN image_url LONGTEXT;
