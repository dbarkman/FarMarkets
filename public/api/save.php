<?php
// Keeps a copy of a player's saved games on the server, so they survive when
// a phone's browser clears its own storage.
//
//   GET                      -> {"id": "...", "data": {...}} for this browser's player
//   POST {"data": {...}}     -> stores the games; makes a new player on first use
//   POST {"link": "abcdefghjk"} -> switches this browser to another player's games
//
// The player is remembered by a cookie the server sets (script-readable
// storage is what browsers clear; this cookie is not). Each player is one
// JSON file in data/saves, outside the web root.

declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store');

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const MAX_BYTES = 800000;

$dir = dirname(__DIR__, 2) . '/data/saves';

function valid($id): bool
{
    return is_string($id) && preg_match('/^[' . ALPHABET . ']{10}$/', $id) === 1;
}

function remember(string $id): void
{
    setcookie('fm_id', $id, [
        'expires' => time() + 86400 * 395,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function fail(int $code, string $why): void
{
    http_response_code($code);
    echo json_encode(['error' => $why]);
    exit;
}

function read(string $dir, string $id)
{
    $file = "$dir/$id.json";
    return is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
}

$id = $_COOKIE['fm_id'] ?? null;
if (!valid($id)) {
    $id = null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if ($id === null) {
        echo json_encode(['id' => null, 'data' => null]);
        exit;
    }
    remember($id);
    echo json_encode(['id' => $id, 'data' => read($dir, $id)]);
    exit;
}

if ($method !== 'POST') {
    fail(405, 'method not allowed');
}

$raw = (string) file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if (strlen($raw) > MAX_BYTES) {
    fail(413, 'too large');
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    fail(400, 'bad request');
}

if (isset($body['link'])) {
    $code = strtolower((string) preg_replace('/[^0-9a-z]/i', '', (string) $body['link']));
    if (!valid($code) || !is_file("$dir/$code.json")) {
        fail(404, 'unknown code');
    }
    remember($code);
    echo json_encode(['id' => $code, 'data' => read($dir, $code)]);
    exit;
}

if (!isset($body['data']) || !is_array($body['data'])) {
    fail(400, 'bad request');
}

if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
    fail(500, 'cannot store');
}
if ($id === null) {
    do {
        $id = '';
        for ($i = 0; $i < 10; $i++) {
            $id .= ALPHABET[random_int(0, strlen(ALPHABET) - 1)];
        }
    } while (is_file("$dir/$id.json"));
}

$tmp = "$dir/$id." . bin2hex(random_bytes(4)) . '.tmp';
if (file_put_contents($tmp, json_encode($body['data']), LOCK_EX) === false || !rename($tmp, "$dir/$id.json")) {
    @unlink($tmp);
    fail(500, 'cannot store');
}

remember($id);
echo json_encode(['id' => $id]);
