<?php
declare(strict_types=1);

// The landing is read-only. LOTIS events and request submission belong to the cabinet.
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    http_response_code(405);
    header('Allow: GET, HEAD');
    exit;
}

$root = __DIR__;
ini_set('display_errors', '0');
ini_set('log_errors', '1');
$framework = $root . '/LOTIS/newlotis/lotis.php';
if (!is_file($framework)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Не найден LOTIS. Поместите репозиторий в папку LOTIS рядом с index.php.');
}

$template = file_get_contents($root . '/index.html');
$bodyClass = 'rocket-page palette-page palette-orange';
if ($template === false
    || !preg_match('~<head>(.*?)</head>~si', $template, $headMatch)
    || !preg_match('~<body\b[^>]*>(.*?)</body>~si', $template, $bodyMatch)) {
    throw new RuntimeException('Landing template must contain head and body.');
}

$config = require $root . '/integration/lotis/config.php';
$publicConfig = json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
$head = $headMatch[1];
preg_match('~<title>(.*?)</title>~si', $head, $titleMatch);
preg_match('~<meta name="description" content="([^"]*)">~i', $head, $descriptionMatch);
$head = preg_replace('~<meta charset="[^"]*">|<title>.*?</title>|<meta name="description" content="[^"]*">~si', '', $head);

// LOTIS starts a session; release it after rendering so the landing cannot block the cabinet.
// Its default logger prints errors into HTML. Let the host PHP logger handle them instead.
if (!defined('LOTIS_LOG_DISABLED')) {
    define('LOTIS_LOG_DISABLED', true);
}
require_once $framework;

LTS\Space::$title = html_entity_decode($titleMatch[1] ?? 'ЛАДСКЛАД', ENT_QUOTES, 'UTF-8');
LTS\Space::$description = html_entity_decode($descriptionMatch[1] ?? '', ENT_QUOTES, 'UTF-8');
LTS::meta('<script>window.SKLADNO_APP=' . $publicConfig . ';</script>' . $head);

// Reuse the single HTML source. No nested html/head/body documents and no iframe.
$landing = LTS::Html('div')->setid('landing-root')->capt($bodyMatch[1]);
$space = LTS::Space();
$space->jqueryui = false;
$space->ltsjs = false; // The landing has no LOTIS events; its own scripts handle presentation.
header('Content-Type: text/html; charset=UTF-8');
ob_start();
$space->build($landing);
$html = ob_get_clean();
$html = str_replace('<body>', '<body class="' . $bodyClass . '">', $html);
// LOTIS hard-codes /newlotis URLs. Our unmodified checkout lives under LOTIS/.
// Rewrite only generated framework asset attributes, preserving all landing URLs.
$html = str_replace(
    ['src="' . _LOTIS_JSDIR, 'href="' . _LOTIS_CSSDIR],
    ['src="LOTIS/newlotis/JS/', 'href="LOTIS/newlotis/CSS/'],
    $html
);
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
echo $html;
