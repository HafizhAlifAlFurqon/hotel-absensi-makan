<?php
/**
 * api.php - REST API Terpusat untuk Database MySQL (absen_makan_hotel)
 * Mendukung sinkronisasi realtime dengan Frontend (Store.js)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Konfigurasi Database (Bisa diatur langsung di config.php)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

if (!defined('DB_HOST')) define('DB_HOST', '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', '3306');
if (!defined('DB_USER')) define('DB_USER', 'root');
if (!defined('DB_PASS')) define('DB_PASS', '');
if (!defined('DB_NAME')) define('DB_NAME', 'absen_makan_hotel');

function getDb() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        return $pdo;
    } catch (PDOException $e) {
        // Coba buat database jika belum ada
        try {
            $rootDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
            $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS);
            $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            ensureSchema($pdo);
            return $pdo;
        } catch (Exception $ex) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal terhubung ke MySQL: ' . $ex->getMessage()
            ]);
            exit;
        }
    }
}

function ensureSchema($pdo) {
    // Tabel Departemen
    $pdo->exec("CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("INSERT IGNORE INTO departments (name) VALUES 
        ('A&G'), ('Accounting'), ('Engineering'), ('FB Product'), ('FB Service'), 
        ('Front Office'), ('Housekeeping'), ('HR'), ('Security'), ('Training')");

    // Tabel Tenants
    $pdo->exec("CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_key VARCHAR(50) UNIQUE DEFAULT NULL,
        name VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) DEFAULT 'kantin123',
        status VARCHAR(20) DEFAULT 'Aktif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Tabel Employees
    $pdo->exec("CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        department_id INT NULL,
        department VARCHAR(100) NOT NULL DEFAULT 'Housekeeping',
        position VARCHAR(100) DEFAULT 'Staff',
        institution VARCHAR(150) NULL,
        is_trainee TINYINT(1) DEFAULT 0,
        password VARCHAR(255) DEFAULT 'password123',
        status VARCHAR(20) DEFAULT 'Aktif',
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Tabel Meal Attendance
    $pdo->exec("CREATE TABLE IF NOT EXISTS meal_attendance (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        attendance_code VARCHAR(50) UNIQUE DEFAULT NULL,
        employee_id INT NOT NULL,
        tenant_id INT NOT NULL,
        meal_date DATE NOT NULL,
        attended_at DATETIME NOT NULL,
        price DECIMAL(12,2) DEFAULT 15000.00,
        shift VARCHAR(50) DEFAULT 'Makan Siang',
        cost DECIMAL(12,2) DEFAULT 15000.00,
        UNIQUE KEY one_meal_per_day (employee_id, meal_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Tabel Settings
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $data = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $data;
        }
    }
    return $_POST;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (empty($action)) {
    $input = getJsonInput();
    if (isset($input['action'])) {
        $action = $input['action'];
    }
}

try {
    $pdo = getDb();
    // Optimasi kecepatan: hanya buat tabel jika database masih baru/kosong
    $hasTable = $pdo->query("SHOW TABLES LIKE 'employees'")->fetch();
    if (!$hasTable) {
        ensureSchema($pdo);
    }

    switch ($action) {
        // --- 1. Status / Ping ---
        case 'ping':
        case 'status':
            $stmt = $pdo->query("SELECT COUNT(*) as emp_count FROM employees");
            $empCount = $stmt->fetch()['emp_count'];
            $stmt = $pdo->query("SELECT COUNT(*) as att_count FROM meal_attendance");
            $attCount = $stmt->fetch()['att_count'];
            echo json_encode([
                'success' => true,
                'status' => 'connected',
                'database' => DB_NAME,
                'employees_count' => (int)$empCount,
                'attendances_count' => (int)$attCount,
                'message' => 'MySQL connected successfully'
            ]);
            break;

        // --- 2. Ambil Semua Data Sekaligus (Inisialisasi Frontend) ---
        case 'get_all':
            // Employees
            $empStmt = $pdo->query("
                SELECT 
                    e.employee_code AS id,
                    e.name,
                    COALESCE(e.department, d.name, 'Housekeeping') AS department,
                    COALESCE(e.position, 'Staff') AS position,
                    COALESCE(e.institution, '') AS institution,
                    (CASE WHEN e.is_trainee = 1 OR e.department = 'Training' OR d.name = 'Training' THEN 1 ELSE 0 END) AS isTrainee,
                    COALESCE(e.password, 'password123') AS password,
                    COALESCE(e.status, 'Aktif') AS status
                FROM employees e
                LEFT JOIN departments d ON e.department_id = d.id
                ORDER BY e.name ASC
            ");
            $employees = [];
            while ($row = $empStmt->fetch()) {
                $row['isTrainee'] = (bool)$row['isTrainee'];
                $employees[] = $row;
            }

            // Attendances
            $attStmt = $pdo->query("
                SELECT 
                    COALESCE(a.attendance_code, CONCAT('ATT-', a.id)) AS id,
                    a.meal_date AS date,
                    DATE_FORMAT(a.attended_at, '%H:%i:%s') AS time,
                    e.employee_code AS employeeId,
                    e.name AS employeeName,
                    COALESCE(e.department, d.name, 'Housekeeping') AS department,
                    COALESCE(e.position, 'Staff') AS position,
                    COALESCE(t.tenant_key, CONCAT('tenant', t.id)) AS tenantKey,
                    t.name AS tenantName,
                    COALESCE(a.shift, 'Makan Siang') AS shift,
                    CAST(COALESCE(a.cost, a.price, 15000) AS UNSIGNED) AS cost
                FROM meal_attendance a
                JOIN employees e ON a.employee_id = e.id
                LEFT JOIN departments d ON e.department_id = d.id
                JOIN tenants t ON a.tenant_id = t.id
                ORDER BY a.attended_at DESC
            ");
            $attendances = $attStmt->fetchAll();

            // Settings
            $settStmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
            $settRows = $settStmt->fetchAll(PDO::FETCH_KEY_PAIR);

            // Tenants
            $tenStmt = $pdo->query("SELECT COALESCE(tenant_key, CONCAT('tenant', id)) AS id, name, COALESCE(password, 'kantin123') AS password, COALESCE(status, 'Aktif') AS status FROM tenants ORDER BY id ASC");
            $tenants = $tenStmt->fetchAll();
            if (empty($tenants)) {
                $tenants = [
                    ['id' => 'tenant1', 'name' => 'Depot Bu A', 'password' => 'depota123', 'status' => 'Aktif'],
                    ['id' => 'tenant2', 'name' => 'Depot Bu Yuli', 'password' => 'depotyuli123', 'status' => 'Aktif']
                ];
            }

            $settings = [
                'hotelName' => $settRows['hotel_name'] ?? 'BeSS Mansion Hotel Surabaya',
                'adminUsername' => $settRows['admin_username'] ?? 'admin',
                'adminPassword' => $settRows['admin_password'] ?? 'admin123',
                'mealPrice' => isset($settRows['meal_price']) ? (int)$settRows['meal_price'] : 15000,
                'bypassTimeForTesting' => isset($settRows['bypass_time_for_testing']) && $settRows['bypass_time_for_testing'] === '1',
                'tenants' => $tenants
            ];

            echo json_encode([
                'success' => true,
                'employees' => $employees,
                'attendances' => $attendances,
                'settings' => $settings
            ]);
            break;

        // --- 3. Simpan / Perbarui Karyawan ---
        case 'save_employee':
            $data = getJsonInput();
            $id = trim($data['id'] ?? '');
            $oldId = trim($data['oldId'] ?? '');
            $name = trim($data['name'] ?? '');
            $department = trim($data['department'] ?? 'Housekeeping');
            $position = trim($data['position'] ?? 'Staff');
            $institution = trim($data['institution'] ?? '');
            $isTrainee = !empty($data['isTrainee']) || $department === 'Training' ? 1 : 0;
            $password = trim($data['password'] ?? 'password123');
            $status = trim($data['status'] ?? 'Aktif');

            if (empty($id) || empty($name)) {
                echo json_encode(['success' => false, 'message' => 'ID dan Nama wajib diisi.']);
                exit;
            }

            // Cari atau buat department_id
            $depStmt = $pdo->prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 1");
            $depStmt->execute([$department]);
            $depRow = $depStmt->fetch();
            if ($depRow) {
                $departmentId = $depRow['id'];
            } else {
                $insDep = $pdo->prepare("INSERT INTO departments (name) VALUES (?)");
                $insDep->execute([$department]);
                $departmentId = $pdo->lastInsertId();
            }

            // Cek apakah ganti ID dari oldId
            if (!empty($oldId) && strtolower($oldId) !== strtolower($id)) {
                $updCode = $pdo->prepare("UPDATE employees SET employee_code = ? WHERE LOWER(employee_code) = LOWER(?)");
                $updCode->execute([$id, $oldId]);
            }

            // Cek apakah karyawan dengan ID ini sudah ada
            $checkStmt = $pdo->prepare("SELECT id FROM employees WHERE LOWER(employee_code) = LOWER(?) LIMIT 1");
            $checkStmt->execute([$id]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                $upd = $pdo->prepare("
                    UPDATE employees 
                    SET name = ?, department = ?, department_id = ?, position = ?, institution = ?, is_trainee = ?, password = ?, status = ?, active = ?
                    WHERE id = ?
                ");
                $upd->execute([
                    $name, $department, $departmentId, $position, $institution, $isTrainee, $password, $status, ($status === 'Aktif' ? 1 : 0), $existing['id']
                ]);
            } else {
                $ins = $pdo->prepare("
                    INSERT INTO employees (employee_code, name, department, department_id, position, institution, is_trainee, password, status, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $ins->execute([
                    $id, $name, $department, $departmentId, $position, $institution, $isTrainee, $password, $status, ($status === 'Aktif' ? 1 : 0)
                ]);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Data karyawan berhasil disimpan ke MySQL.',
                'employee' => [
                    'id' => $id,
                    'name' => $name,
                    'department' => $department,
                    'position' => $position,
                    'institution' => $institution,
                    'isTrainee' => (bool)$isTrainee,
                    'password' => $password,
                    'status' => $status
                ]
            ]);
            break;

        // --- 4. Batch Simpan Karyawan ---
        case 'batch_save_employees':
            $input = getJsonInput();
            $list = $input['employees'] ?? (is_array($input) && isset($input[0]) ? $input : []);
            if (!is_array($list) || empty($list)) {
                echo json_encode(['success' => false, 'count' => 0, 'message' => 'Data list kosong.']);
                exit;
            }

            $count = 0;
            $pdo->beginTransaction();
            try {
                foreach ($list as $item) {
                    $id = trim($item['id'] ?? '');
                    $name = trim($item['name'] ?? '');
                    if (empty($id) || empty($name)) continue;

                    $department = trim($item['department'] ?? 'Housekeeping');
                    $position = trim($item['position'] ?? 'Staff');
                    $institution = trim($item['institution'] ?? '');
                    $isTrainee = !empty($item['isTrainee']) || $department === 'Training' ? 1 : 0;
                    $password = trim($item['password'] ?? 'password123');
                    $status = trim($item['status'] ?? 'Aktif');

                    // Dep id
                    $depStmt = $pdo->prepare("SELECT id FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 1");
                    $depStmt->execute([$department]);
                    $depRow = $depStmt->fetch();
                    $departmentId = $depRow ? $depRow['id'] : null;
                    if (!$departmentId) {
                        $pdo->prepare("INSERT INTO departments (name) VALUES (?)")->execute([$department]);
                        $departmentId = $pdo->lastInsertId();
                    }

                    $chk = $pdo->prepare("SELECT id FROM employees WHERE LOWER(employee_code) = LOWER(?) LIMIT 1");
                    $chk->execute([$id]);
                    $row = $chk->fetch();
                    if ($row) {
                        $pdo->prepare("
                            UPDATE employees SET name=?, department=?, department_id=?, position=?, institution=?, is_trainee=?, password=?, status=?, active=? WHERE id=?
                        ")->execute([$name, $department, $departmentId, $position, $institution, $isTrainee, $password, $status, ($status==='Aktif'?1:0), $row['id']]);
                    } else {
                        $pdo->prepare("
                            INSERT INTO employees (employee_code, name, department, department_id, position, institution, is_trainee, password, status, active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ")->execute([$id, $name, $department, $departmentId, $position, $institution, $isTrainee, $password, $status, ($status==='Aktif'?1:0)]);
                    }
                    $count++;
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'count' => $count]);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;

        // --- 5. Hapus Karyawan ---
        case 'delete_employee':
            $data = getJsonInput();
            $id = trim($data['id'] ?? '');
            if (empty($id)) {
                echo json_encode(['success' => false, 'message' => 'ID wajib diisi.']);
                exit;
            }

            // Hapus absensi terkait terlebih dahulu jika perlu
            $empStmt = $pdo->prepare("SELECT id FROM employees WHERE LOWER(employee_code) = LOWER(?) LIMIT 1");
            $empStmt->execute([$id]);
            $emp = $empStmt->fetch();
            if ($emp) {
                $pdo->prepare("DELETE FROM meal_attendance WHERE employee_id = ?")->execute([$emp['id']]);
                $pdo->prepare("DELETE FROM employees WHERE id = ?")->execute([$emp['id']]);
            }

            echo json_encode(['success' => true, 'message' => 'Karyawan berhasil dihapus dari MySQL.']);
            break;

        // --- 6. Rekam Absensi Makan ---
        case 'record_attendance':
            $data = getJsonInput();
            $employeeId = trim($data['employeeId'] ?? '');
            $tenantKey = trim($data['tenantKey'] ?? 'tenant1');
            $date = trim($data['date'] ?? date('Y-m-d'));
            $time = trim($data['time'] ?? date('H:i:s'));
            $shift = trim($data['shift'] ?? 'Makan Siang');
            $cost = isset($data['cost']) ? (float)$data['cost'] : 15000.00;
            $code = trim($data['id'] ?? ('ATT-' . strtoupper(dechex(time()))));

            if (empty($employeeId)) {
                echo json_encode(['success' => false, 'message' => 'ID Karyawan wajib diisi.']);
                exit;
            }

            // Cari Karyawan di DB
            $empStmt = $pdo->prepare("SELECT id, employee_code, name, department, position, status FROM employees WHERE LOWER(employee_code) = LOWER(?) LIMIT 1");
            $empStmt->execute([$employeeId]);
            $employee = $empStmt->fetch();

            if (!$employee) {
                echo json_encode([
                    'success' => false,
                    'code' => 'NOT_FOUND',
                    'message' => "ID Karyawan '$employeeId' tidak ditemukan di database MySQL."
                ]);
                exit;
            }

            if ($employee['status'] !== 'Aktif') {
                echo json_encode([
                    'success' => false,
                    'code' => 'INACTIVE',
                    'message' => "Karyawan {$employee['name']} berstatus NON-AKTIF."
                ]);
                exit;
            }

            // Cari Tenant di DB
            $tenStmt = $pdo->prepare("SELECT id, name, tenant_key FROM tenants WHERE LOWER(tenant_key) = LOWER(?) OR id = ? LIMIT 1");
            $tenStmt->execute([$tenantKey, (int)filter_var($tenantKey, FILTER_SANITIZE_NUMBER_INT)]);
            $tenant = $tenStmt->fetch();

            if (!$tenant) {
                // Buat tenant otomatis jika belum ada
                $pdo->prepare("INSERT INTO tenants (tenant_key, name, status) VALUES (?, ?, 'Aktif')")->execute([$tenantKey, $data['tenantName'] ?? $tenantKey]);
                $tenant = ['id' => $pdo->lastInsertId(), 'name' => $data['tenantName'] ?? $tenantKey, 'tenant_key' => $tenantKey];
            }

            // Cek apakah sudah makan hari ini (1x makan per hari)
            $checkAtt = $pdo->prepare("
                SELECT a.*, t.name AS tenant_name 
                FROM meal_attendance a 
                JOIN tenants t ON a.tenant_id = t.id 
                WHERE a.employee_id = ? AND a.meal_date = ? 
                LIMIT 1
            ");
            $checkAtt->execute([$employee['id'], $date]);
            $alreadyAte = $checkAtt->fetch();

            if ($alreadyAte) {
                echo json_encode([
                    'success' => false,
                    'code' => 'ALREADY_EATEN',
                    'message' => "Karyawan {$employee['name']} ({$employee['employee_code']}) SUDAH MAKAN hari ini di '{$alreadyAte['tenant_name']}'!"
                ]);
                exit;
            }

            // Simpan absensi
            $datetimeStr = $date . ' ' . $time;
            $insAtt = $pdo->prepare("
                INSERT INTO meal_attendance (attendance_code, employee_id, tenant_id, meal_date, attended_at, price, shift, cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $insAtt->execute([
                $code,
                $employee['id'],
                $tenant['id'],
                $date,
                $datetimeStr,
                $cost,
                $shift,
                $cost
            ]);

            $record = [
                'id' => $code,
                'date' => $date,
                'time' => $time,
                'employeeId' => $employee['employee_code'],
                'employeeName' => $employee['name'],
                'department' => $employee['department'],
                'position' => $employee['position'] ?? 'Staff',
                'tenantKey' => $tenant['tenant_key'] ?? $tenantKey,
                'tenantName' => $tenant['name'],
                'shift' => $shift,
                'cost' => $cost
            ];

            echo json_encode([
                'success' => true,
                'record' => $record,
                'message' => "Absensi makan {$employee['name']} berhasil dicatat ke MySQL di {$tenant['name']}."
            ]);
            break;

        // --- 7. Simpan Pengaturan Hotel & Kantin ---
        case 'save_settings':
            $data = getJsonInput();

            $saveSetting = function($key, $val) use ($pdo) {
                $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->execute([$key, (string)$val, (string)$val]);
            };

            if (isset($data['hotelName'])) $saveSetting('hotel_name', $data['hotelName']);
            if (isset($data['adminUsername'])) $saveSetting('admin_username', $data['adminUsername']);
            if (isset($data['adminPassword'])) $saveSetting('admin_password', $data['adminPassword']);
            if (isset($data['mealPrice'])) $saveSetting('meal_price', $data['mealPrice']);
            if (isset($data['bypassTimeForTesting'])) $saveSetting('bypass_time_for_testing', $data['bypassTimeForTesting'] ? '1' : '0');

            // Simpan / update daftar kantin jika disertakan
            if (isset($data['tenants']) && is_array($data['tenants'])) {
                foreach ($data['tenants'] as $t) {
                    $tKey = trim($t['id'] ?? '');
                    $tName = trim($t['name'] ?? '');
                    $tPass = trim($t['password'] ?? 'kantin123');
                    $tStatus = trim($t['status'] ?? 'Aktif');
                    if (empty($tKey) || empty($tName)) continue;

                    $chk = $pdo->prepare("SELECT id FROM tenants WHERE LOWER(tenant_key) = LOWER(?) LIMIT 1");
                    $chk->execute([$tKey]);
                    $existingT = $chk->fetch();

                    if ($existingT) {
                        $pdo->prepare("UPDATE tenants SET name = ?, password = ?, status = ? WHERE id = ?")
                            ->execute([$tName, $tPass, $tStatus, $existingT['id']]);
                    } else {
                        $pdo->prepare("INSERT INTO tenants (tenant_key, name, password, status) VALUES (?, ?, ?, ?)")
                            ->execute([$tKey, $tName, $tPass, $tStatus]);
                    }
                }
            }

            echo json_encode(['success' => true, 'message' => 'Pengaturan hotel berhasil diperbarui di MySQL.']);
            break;

        // --- 8. Ekspor Cadangan SQL (Siap Deploy ke Hosting / cPanel) ---
        case 'export_sql':
            $sql = "-- ======================================================\n";
            $sql .= "-- CADANGAN DATABASE: absen_makan_hotel\n";
            $sql .= "-- SISTEM ABSENSI MAKAN HOTEL (BeSS Mansion Hotel Surabaya)\n";
            $sql .= "-- Waktu Ekspor: " . date('Y-m-d H:i:s') . "\n";
            $sql .= "-- ======================================================\n\n";
            $sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

            // 1. Departments
            $sql .= "-- Tabel departments\n";
            $sql .= "CREATE TABLE IF NOT EXISTS `departments` (`id` INT AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) UNIQUE NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
            $deps = $pdo->query("SELECT * FROM departments ORDER BY id ASC")->fetchAll();
            foreach ($deps as $d) {
                $sql .= "INSERT IGNORE INTO `departments` (`id`, `name`) VALUES (" . (int)$d['id'] . ", " . $pdo->quote($d['name']) . ");\n";
            }

            // 2. Tenants
            $sql .= "\n-- Tabel tenants\n";
            $sql .= "CREATE TABLE IF NOT EXISTS `tenants` (`id` INT AUTO_INCREMENT PRIMARY KEY, `tenant_key` VARCHAR(50) UNIQUE DEFAULT NULL, `name` VARCHAR(100) UNIQUE NOT NULL, `password` VARCHAR(255) DEFAULT 'kantin123', `status` VARCHAR(20) DEFAULT 'Aktif', `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
            $tens = $pdo->query("SELECT * FROM tenants ORDER BY id ASC")->fetchAll();
            foreach ($tens as $t) {
                $sql .= "INSERT INTO `tenants` (`id`, `tenant_key`, `name`, `password`, `status`) VALUES (" . (int)$t['id'] . ", " . $pdo->quote($t['tenant_key']) . ", " . $pdo->quote($t['name']) . ", " . $pdo->quote($t['password']) . ", " . $pdo->quote($t['status']) . ") ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `password`=VALUES(`password`), `status`=VALUES(`status`);\n";
            }

            // 3. Employees
            $sql .= "\n-- Tabel employees\n";
            $sql .= "CREATE TABLE IF NOT EXISTS `employees` (`id` INT AUTO_INCREMENT PRIMARY KEY, `employee_code` VARCHAR(50) UNIQUE NOT NULL, `name` VARCHAR(150) NOT NULL, `department_id` INT NULL, `department` VARCHAR(100) NOT NULL DEFAULT 'Housekeeping', `position` VARCHAR(100) DEFAULT 'Staff', `institution` VARCHAR(150) NULL, `is_trainee` TINYINT(1) DEFAULT 0, `password` VARCHAR(255) DEFAULT 'password123', `status` VARCHAR(20) DEFAULT 'Aktif', `active` TINYINT(1) DEFAULT 1, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
            $emps = $pdo->query("SELECT * FROM employees ORDER BY id ASC")->fetchAll();
            foreach ($emps as $e) {
                $sql .= "INSERT INTO `employees` (`id`, `employee_code`, `name`, `department_id`, `department`, `position`, `institution`, `is_trainee`, `password`, `status`, `active`) VALUES ("
                    . (int)$e['id'] . ", "
                    . $pdo->quote($e['employee_code']) . ", "
                    . $pdo->quote($e['name']) . ", "
                    . ($e['department_id'] ? (int)$e['department_id'] : "NULL") . ", "
                    . $pdo->quote($e['department']) . ", "
                    . $pdo->quote($e['position']) . ", "
                    . ($e['institution'] ? $pdo->quote($e['institution']) : "NULL") . ", "
                    . (int)$e['is_trainee'] . ", "
                    . $pdo->quote($e['password']) . ", "
                    . $pdo->quote($e['status']) . ", "
                    . (int)$e['active'] . ") ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `department`=VALUES(`department`), `position`=VALUES(`position`), `institution`=VALUES(`institution`), `is_trainee`=VALUES(`is_trainee`), `password`=VALUES(`password`), `status`=VALUES(`status`);\n";
            }

            // 4. Meal attendance
            $sql .= "\n-- Tabel meal_attendance\n";
            $sql .= "CREATE TABLE IF NOT EXISTS `meal_attendance` (`id` BIGINT AUTO_INCREMENT PRIMARY KEY, `attendance_code` VARCHAR(50) UNIQUE DEFAULT NULL, `employee_id` INT NOT NULL, `tenant_id` INT NOT NULL, `meal_date` DATE NOT NULL, `attended_at` DATETIME NOT NULL, `price` DECIMAL(12,2) DEFAULT 15000.00, `shift` VARCHAR(50) DEFAULT 'Makan Siang', `cost` DECIMAL(12,2) DEFAULT 15000.00, UNIQUE KEY one_meal_per_day (employee_id, meal_date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
            $atts = $pdo->query("SELECT * FROM meal_attendance ORDER BY id ASC")->fetchAll();
            foreach ($atts as $a) {
                $sql .= "INSERT IGNORE INTO `meal_attendance` (`id`, `attendance_code`, `employee_id`, `tenant_id`, `meal_date`, `attended_at`, `price`, `shift`, `cost`) VALUES ("
                    . (int)$a['id'] . ", "
                    . $pdo->quote($a['attendance_code']) . ", "
                    . (int)$a['employee_id'] . ", "
                    . (int)$a['tenant_id'] . ", "
                    . $pdo->quote($a['meal_date']) . ", "
                    . $pdo->quote($a['attended_at']) . ", "
                    . (float)$a['price'] . ", "
                    . $pdo->quote($a['shift']) . ", "
                    . (float)$a['cost'] . ");\n";
            }

            // 5. Settings
            $sql .= "\n-- Tabel settings\n";
            $sql .= "CREATE TABLE IF NOT EXISTS `settings` (`setting_key` VARCHAR(50) PRIMARY KEY, `setting_value` TEXT NOT NULL, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n";
            $setts = $pdo->query("SELECT * FROM settings")->fetchAll();
            foreach ($setts as $s) {
                $sql .= "INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES ("
                    . $pdo->quote($s['setting_key']) . ", "
                    . $pdo->quote($s['setting_value']) . ") ON DUPLICATE KEY UPDATE `setting_value`=VALUES(`setting_value`);\n";
            }

            $sql .= "\nSET FOREIGN_KEY_CHECKS = 1;\n";

            header('Content-Type: application/sql; charset=utf-8');
            header('Content-Disposition: attachment; filename="absen_makan_hotel_backup_' . date('Ymd_His') . '.sql"');
            echo $sql;
            exit;

        // --- 9. Kosongkan Data (Maintenance) ---
        case 'clear_employees':
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE meal_attendance; TRUNCATE TABLE employees; SET FOREIGN_KEY_CHECKS = 1;");
            echo json_encode(['success' => true, 'message' => 'Semua data karyawan dan absensi berhasil dikosongkan di MySQL.']);
            break;

        case 'clear_attendances':
            $pdo->exec("TRUNCATE TABLE meal_attendance;");
            echo json_encode(['success' => true, 'message' => 'Riwayat absensi makan berhasil dikosongkan di MySQL.']);
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'Aksi tidak dikenal: ' . htmlspecialchars($action)
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Terjadi kesalahan server: ' . $e->getMessage()
    ]);
}
