<?php
/**
 * One-off: render PHP pages to static HTML for GitHub Pages.
 * Usage: php export_static.php /path/to/output [base_url]
 */
$src = __DIR__;
$out = $argv[1] ?? '';
$baseUrl = rtrim($argv[2] ?? 'https://example.github.io/cade-stories', '/');

if ($out === '') {
    fwrite(STDERR, "Usage: php export_static.php OUTPUT_DIR [BASE_URL]\n");
    exit(1);
}

$pages = array(
    'index.php',
    'aprender.php',
    'glosario.php',
    'blog.php',
    'blog-blockchain-mas-alla-monedas.php',
    'blog-como-aprende-una-ia.php',
    'blog-seguridad-digital-basica.php',
    'sobre-nosotros.php',
    'contacto.php',
    'privacidad.php',
    'terminos.php',
    'cookies.php',
);

function rrmdir($dir) {
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . '/' . $item;
        is_dir($path) ? rrmdir($path) : unlink($path);
    }
    rmdir($dir);
}

function rcopy($src, $dst) {
    if (!is_dir($dst)) {
        mkdir($dst, 0755, true);
    }
    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $from = $src . '/' . $item;
        $to = $dst . '/' . $item;
        if (is_dir($from)) {
            rcopy($from, $to);
        } else {
            copy($from, $to);
        }
    }
}

if (is_dir($out)) {
    rrmdir($out);
}
mkdir($out, 0755, true);

rcopy($src . '/assets', $out . '/assets');

foreach ($pages as $page) {
    $renderScript = $src . '/_render_page.php';
    $cmd = sprintf(
        '%s %s %s',
        escapeshellarg(PHP_BINARY),
        escapeshellarg($renderScript),
        escapeshellarg($page)
    );
    $html = shell_exec($cmd);
    if ($html === null || $html === '') {
        fwrite(STDERR, "FAIL $page\n");
        exit(1);
    }

    $html = preg_replace('/href="([^"]+)\.php([^"]*)"/', 'href="$1.html$2"', $html);
    $html = preg_replace('/href=\'([^\']+)\.php([^\']*)\'/', 'href=\'$1.html$2\'', $html);
    $html = str_replace('.php"', '.html"', $html);
    $html = preg_replace('/https:\/\/cadestories\.com\/([a-z0-9\-]+\.php)/', $baseUrl . '/$1', $html);
    $html = str_replace('https://cadestories.com', $baseUrl, $html);
    $html = str_replace('https://cadestories.com/', $baseUrl . '/', $html);

    $name = $page === 'index.php' ? 'index.html' : str_replace('.php', '.html', $page);
    file_put_contents($out . '/' . $name, $html);
    echo "OK $name\n";
}

file_put_contents($out . '/.nojekyll', '');
file_put_contents($out . '/README.md', "# Cade Stories\n\nStatic preview of cadestories.com educational portal.\n");

echo "Done: $out\n";
