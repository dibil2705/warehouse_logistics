<?php
// Local navigation fixture. This file is never copied into the deployed landing.
$template = file_get_contents(dirname(__DIR__) . '/index.html');
$config = ['routes' => [
    'login' => '/qa/lotis-destination.html?view=login',
    'request' => '/qa/lotis-destination.html?view=request&from=landing#form',
    'partner' => '/qa/lotis-destination.html?view=partner',
]];
$script = '<script>window.SKLADNO_APP=' . json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';</script>';
$template = str_replace('<head>', '<head><base href="/">', $template);
echo str_replace('<script src="site-config.js">', $script . '<script src="site-config.js">', $template);
