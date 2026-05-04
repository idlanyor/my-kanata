<?php
// php_client/includes/auth.php
require_once __DIR__ . '/api.php';

session_start();

/**
 * Melakukan login dengan memverifikasi kredensial ke Bot API
 */
function login($username, $password) {
    $res = send_api_request('POST', '/api/webhook/auth/login', [
        'username' => $username,
        'password' => $password
    ]);

    if (isset($res['ok']) && $res['ok'] && isset($res['data'])) {
        $userData = $res['data'];
        $_SESSION['user_id'] = $userData['userId'];
        $_SESSION['username'] = $userData['username'];
        $_SESSION['whatsapp_number'] = $userData['userId']; // JID Lengkap (misal: 62812@s.whatsapp.net)
        $_SESSION['is_owner'] = $userData['isOwner'] ?? false;
        return true;
    }
    return false;
}

/**
 * Menghapus session untuk logout
 */
function logout() {
    $_SESSION = array();
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}

/**
 * Mengecek apakah user sudah terautentikasi di session
 */
function check_auth() {
    return isset($_SESSION['user_id']);
}

/**
 * Memastikan user login, jika tidak redirect ke login.php
 */
function require_login() {
    if (!check_auth()) {
        header("Location: login.php");
        exit;
    }
}
?>
