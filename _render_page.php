<?php
$page = $argv[1] ?? '';
if ($page === '' || !preg_match('/^[a-z0-9\-]+\.php$/', $page)) {
    exit(1);
}
$src = __DIR__;
$_SERVER['SCRIPT_NAME'] = '/' . $page;
$_SERVER['REQUEST_URI'] = '/' . $page;
chdir($src);
ob_start();
include $src . '/' . $page;
echo ob_get_clean();
