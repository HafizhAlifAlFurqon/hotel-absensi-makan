-- ======================================================================
-- DATABASE: absen_makan_hotel
-- SISTEM ABSENSI MAKAN KARYAWAN HOTEL (BeSS Mansion Hotel Surabaya)
-- ======================================================================
-- PANDUAN IMPORT:
-- 1. DI LOCALHOST (XAMPP): Bisa langsung import seluruh file ini.
-- 2. DI WEB HOSTING (cPanel): Buat database terlebih dahulu di cPanel
--    (misal: u123_absen_hotel), lalu hapus baris CREATE DATABASE & USE
--    di bawah ini sebelum menekan tombol Kirim / Go di phpMyAdmin hosting.
-- ======================================================================

CREATE DATABASE IF NOT EXISTS `absen_makan_hotel` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `absen_makan_hotel`;

-- 1. Tabel Departemen
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `departments` (`name`) VALUES
('A&G'),
('Accounting'),
('Engineering'),
('FB Product'),
('FB Service'),
('Front Office'),
('Housekeeping'),
('HR'),
('Security'),
('Training');

-- 2. Tabel Kantin / Tenants
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_key` VARCHAR(50) UNIQUE DEFAULT NULL,
  `name` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) DEFAULT 'kantin123',
  `status` VARCHAR(20) DEFAULT 'Aktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tenants` (`id`, `tenant_key`, `name`, `password`, `status`) VALUES
(1, 'tenant1', 'Depot Bu A', 'depota123', 'Aktif'),
(2, 'tenant2', 'Depot Bu Yuli', 'depotyuli123', 'Aktif')
ON DUPLICATE KEY UPDATE 
  `tenant_key` = VALUES(`tenant_key`),
  `name` = VALUES(`name`),
  `password` = VALUES(`password`),
  `status` = VALUES(`status`);

-- 3. Tabel Karyawan & Trainee / Magang
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_code` VARCHAR(50) UNIQUE NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `department_id` INT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT 'Housekeeping',
  `position` VARCHAR(100) DEFAULT 'Staff',
  `institution` VARCHAR(150) NULL,
  `is_trainee` TINYINT(1) DEFAULT 0,
  `password` VARCHAR(255) DEFAULT 'password123',
  `status` VARCHAR(20) DEFAULT 'Aktif',
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Absensi Makan
CREATE TABLE IF NOT EXISTS `meal_attendance` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `attendance_code` VARCHAR(50) UNIQUE DEFAULT NULL,
  `employee_id` INT NULL,
  `tenant_id` INT NOT NULL,
  `employee_code` VARCHAR(50) DEFAULT NULL,
  `employee_name` VARCHAR(150) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `position` VARCHAR(100) DEFAULT NULL,
  `institution` VARCHAR(150) DEFAULT NULL,
  `is_trainee` TINYINT(1) DEFAULT 0,
  `tenant_key` VARCHAR(50) DEFAULT NULL,
  `tenant_name` VARCHAR(100) DEFAULT NULL,
  `meal_date` DATE NOT NULL,
  `attended_at` DATETIME NOT NULL,
  `price` DECIMAL(12,2) DEFAULT 15000.00,
  `shift` VARCHAR(50) DEFAULT 'Makan Siang',
  `cost` DECIMAL(12,2) DEFAULT 15000.00,
  UNIQUE KEY `one_meal_per_day` (`employee_id`, `meal_date`),
  KEY `idx_meal_date` (`meal_date`),
  KEY `idx_employee_code` (`employee_code`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Pengaturan Sistem
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(50) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('hotel_name', 'BeSS Mansion Hotel Surabaya'),
('admin_username', 'admin'),
('admin_password', 'admin123'),
('meal_price', '15000'),
('bypass_time_for_testing', '0')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 6. Tabel Administrator
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `admins` (`username`, `password`, `name`) VALUES
('admin', SHA2('admin123', 256), 'Administrator Hotel');
