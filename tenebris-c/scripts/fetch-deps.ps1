# Vendor third-party single-header libraries + sokol-shdc binary into
# third_party/. Idempotent — safe to run repeatedly. Windows port of
# scripts/fetch-deps.sh; uses native Git + PowerShell so it works
# without WSL or Git Bash.

$ErrorActionPreference = 'Stop'
$ProgressPreference   = 'SilentlyContinue'   # speeds up Invoke-WebRequest

$Root       = Resolve-Path (Join-Path $PSScriptRoot '..')
$ThirdParty = Join-Path $Root 'third_party'
New-Item -ItemType Directory -Force -Path $ThirdParty | Out-Null

function Fetch-Repo {
    param([string]$Name, [string]$Repo, [string]$Ref)
    $dst = Join-Path $ThirdParty $Name
    if (Test-Path (Join-Path $dst '.git')) {
        Write-Host "==> updating $Name"
        git -C $dst fetch --depth=1 origin $Ref
        if ($LASTEXITCODE -ne 0) { throw "git fetch failed for $Name" }
        git -C $dst checkout --quiet FETCH_HEAD
        if ($LASTEXITCODE -ne 0) { throw "git checkout failed for $Name" }
    } else {
        Write-Host "==> cloning $Name"
        if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
        git clone --depth=1 --branch $Ref $Repo $dst
        if ($LASTEXITCODE -ne 0) { throw "git clone failed for $Name" }
    }
}

Fetch-Repo 'sokol'        'https://github.com/floooh/sokol.git'              'master'
Fetch-Repo 'stb'          'https://github.com/nothings/stb.git'              'master'
Fetch-Repo 'HandmadeMath' 'https://github.com/HandmadeMath/HandmadeMath.git' 'master'

# sokol-shdc — shader cross-compiler binary. Authored by floooh alongside
# sokol_gfx; emits a C header with sg_shader_desc reflection so renderer.c
# never has to hand-write uniform offset tables. Only fetch the win32 build.
$ShdcDir = Join-Path $ThirdParty 'sokol-tools-bin'
$ShdcExe = Join-Path $ShdcDir 'sokol-shdc.exe'
New-Item -ItemType Directory -Force -Path $ShdcDir | Out-Null
if (Test-Path $ShdcExe) {
    Write-Host "==> sokol-shdc already present at third_party\sokol-tools-bin\sokol-shdc.exe"
} else {
    $Url = 'https://github.com/floooh/sokol-tools-bin/raw/master/bin/win32/sokol-shdc.exe'
    Write-Host "==> downloading sokol-shdc from $Url"
    Invoke-WebRequest -Uri $Url -OutFile $ShdcExe
}

Write-Host ''
Write-Host 'Done. Headers + tools available under third_party\{sokol,stb,HandmadeMath,sokol-tools-bin}\.'
