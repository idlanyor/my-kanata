<?php
// login.php
require_once __DIR__ . '/includes/auth.php';

if (check_auth()) {
    header("Location: index.php");
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (login($username, $password)) {
        header("Location: index.php");
        exit;
    } else {
        $error = "Nomor WA atau password salah! Pastikan kamu sudah mengatur password melalui bot dengan perintah <code>.integrate</code>";
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kanata Bot | Log in</title>

  <!-- Google Font: Source Sans Pro -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback">
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- Theme style -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
</head>
<body class="hold-transition login-page">
<div class="login-box">
  <div class="login-logo">
    <a href="index.php"><b>Kanata</b>Bot</a>
  </div>
  <!-- /.login-logo -->
  <div class="card">
    <div class="card-body login-card-body">
      <p class="login-box-msg">Masuk untuk mengelola keuangan</p>

      <?php if ($error): ?>
          <div class="alert alert-danger small"><?php echo $error; ?></div>
      <?php endif; ?>

      <form method="post">
        <div class="input-group mb-3">
          <input type="text" name="username" class="form-control" placeholder="Nomor WhatsApp (628...)" required autofocus>
          <div class="input-group-append">
            <div class="input-group-text">
              <span class="fab fa-whatsapp"></span>
            </div>
          </div>
        </div>
        <div class="input-group mb-3">
          <input type="password" name="password" class="form-control" placeholder="Password Integration" required>
          <div class="input-group-append">
            <div class="input-group-text">
              <span class="fas fa-lock"></span>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <button type="submit" class="btn btn-primary btn-block">Masuk ke Dashboard</button>
          </div>
          <!-- /.col -->
        </div>
      </form>

      <div class="mt-4 p-3 bg-light rounded small text-muted">
          <strong>Belum punya password?</strong><br>
          Buka WhatsApp kamu dan ketik:<br>
          <code>.integrate password_kamu</code>
      </div>

    </div>
    <!-- /.login-card-body -->
  </div>
</div>
<!-- /.login-box -->

<!-- jQuery -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<!-- Bootstrap 4 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.1/js/bootstrap.bundle.min.js"></script>
<!-- AdminLTE App -->
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>
</body>
</html>
