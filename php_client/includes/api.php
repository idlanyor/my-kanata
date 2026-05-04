<?php
// php_client/includes/api.php
require_once __DIR__ . '/config.php';

function send_api_request($method, $endpoint, $data = null) {
    $url = API_BASE_URL . $endpoint;
    
    // Handle GET query params
    if ($method === 'GET' && $data) {
        $url .= '?' . http_build_query($data);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5); // Timeout 5 detik untuk koneksi
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);        // Timeout 15 detik untuk eksekusi
    
    $headers = [
        'Authorization: Bearer ' . API_TOKEN,
        'Content-Type: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if (in_array($method, ['POST', 'DELETE']) && $data && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        error_log("cURL Error: $error_msg");
        curl_close($ch);
        return ['ok' => false, 'error' => "cURL Error: $error_msg"];
    }

    curl_close($ch);
    
    $decoded = json_decode($response, true);
    if (!$decoded) {
        error_log("Invalid API Response: $response (HTTP $httpCode)");
        return ['ok' => false, 'error' => "Invalid API Response", 'details' => $response, 'http_code' => $httpCode];
    }

    if (isset($decoded['ok']) && !$decoded['ok']) {
        error_log("API returned error: " . json_encode($decoded));
    }

    return $decoded;
}
?>
