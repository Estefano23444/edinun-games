<?php
// counter.php — Contador de visitas global por juego (servidor con PHP).
//
// GET (sin params)  → devuelve {"count": N}
// GET ?inc=1        → incrementa atómicamente y devuelve {"count": N+1}
//
// Almacena el conteo en ./counts/visits.txt (creado en demanda).
// Atómico vía flock(LOCK_EX) para evitar carreras entre peticiones simultáneas.
//
// Requiere Apache + PHP con permisos de escritura sobre la carpeta del juego.
// En GitHub Pages u otros servidores estáticos el archivo se sirve como
// texto plano: el cliente detecta el fallo de JSON.parse y cae al contador
// localStorage (ver useVisitorCount en screens.jsx).

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

$dir = __DIR__ . '/counts';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}
$file = $dir . '/visits.txt';

$increment = isset($_GET['inc']) && $_GET['inc'] === '1';

$fp = @fopen($file, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['error' => 'cannot open counter file']);
    exit;
}

@flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$current = (int) trim((string) $raw);
if ($increment) {
    $current += 1;
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, (string) $current);
    fflush($fp);
}
@flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['count' => $current]);
