<?php
// php_client/includes/config.php

define('API_BASE_URL', 'http://64.235.45.179:8787');
define('API_TOKEN', 'anohimitahananonamaewobokutachiwamadashiranai'); // Ganti dengan token di .env bot

define('DB_PATH', __DIR__ . '/../db/database.sqlite');

// Session security
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Strict');
?>
