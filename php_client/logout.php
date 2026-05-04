<?php
// php_client/logout.php
require_once __DIR__ . '/includes/auth.php';
logout();
header("Location: login.php");
exit;
?>
