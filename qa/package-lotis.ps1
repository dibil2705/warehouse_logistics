param([string]$Output = 'artifacts/skladno-lotis-landing.zip')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$archivePath = [IO.Path]::GetFullPath((Join-Path $projectRoot $Output))
if (-not $archivePath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Archive must stay inside the project directory.'
}
if (Test-Path -LiteralPath $archivePath) { throw 'Archive already exists. Choose a new Output filename.' }
$inputs = @('index.php','index.html','palette-variants.css','landing-structure.css','rocket.css','rocket.js','brand-assets.css','header-effects.css','header-effects.js','orange-refinements.css','hero-variants.css','hero-variants.js','warehouse-dot-map.css','warehouse-dot-map.js','site-config.js','script.js','cabinet.css','README.md','assets','external/jquery','integration/lotis','LOTIS/newlotis','LOTIS/LICENSE')
$files = foreach ($inputPath in $inputs) {
    $absolute = Join-Path $projectRoot $inputPath
    if (Test-Path -LiteralPath $absolute -PathType Container) { Get-ChildItem -LiteralPath $absolute -Recurse -File }
    else { Get-Item -LiteralPath $absolute }
}
New-Item -ItemType Directory -Path (Split-Path -Parent $archivePath) -Force | Out-Null
$stream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Get-Item -LiteralPath $archivePath | Select-Object FullName,Length
