#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Signs a Tizen widget (.wgt) the way Tizen Studio does - author-signature.xml + signature1.xml
  (W3C XML Digital Signatures for Widgets) - without Tizen Studio. Also verifies signed packages.

.EXAMPLE
  pwsh tools/sign.ps1 -In LumenLauncher.wgt -Author author.p12 -AuthorPassword *** `
                      -Distributor distributor.p12 -DistributorPassword ***
  pwsh tools/sign.ps1 -Verify LumenLauncher.wgt

.NOTES
  * Digest SHA-256 by default: accepted from Tizen 2.3 to 9 (Tizen 2.4's runtime rejects SHA-512).
  * Each .p12 must contain the signer's certificate + private key, and may contain its CA; every
    certificate in it is written to KeyInfo, signer first.
  * Older TVs (Tizen < 7) do NOT re-sign packages installed by TizenBrew: the release .wgt must
    arrive already signed with a Tizen author certificate + the Tizen public distributor certificate.
  * Signature layout mirrors packages produced by Tizen Studio (exc-c14n for SignedInfo, c14n 1.1
    for the #prop object, base64 wrapped at 76 columns, '\n' line endings).
#>
param(
  [string]$In,
  [string]$Out,
  [string]$Author,
  [string]$AuthorPassword,
  [string]$Distributor,
  [string]$DistributorPassword,
  [string]$Verify,
  [ValidateSet('sha256', 'sha512')][string]$Hash = 'sha256'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.ZipFile

$NS = 'http://www.w3.org/2000/09/xmldsig#'
$EXC_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
$C14N11 = 'http://www.w3.org/2006/12/xml-c14n11'
$ALGS = @{
  sha256 = @{ digest = 'http://www.w3.org/2001/04/xmlenc#sha256'; sig = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' }
  sha512 = @{ digest = 'http://www.w3.org/2001/04/xmlenc#sha512'; sig = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512' }
}
$UTF8 = [System.Text.UTF8Encoding]::new($false)

function Get-HashName([string]$h) {
  if ($h -eq 'sha512') { return [System.Security.Cryptography.HashAlgorithmName]::SHA512 }
  return [System.Security.Cryptography.HashAlgorithmName]::SHA256
}

function Get-Digest([byte[]]$data, [string]$h) {
  if ($h -eq 'sha512') { return [System.Security.Cryptography.SHA512]::HashData($data) }
  return [System.Security.Cryptography.SHA256]::HashData($data)
}

function ConvertTo-B64([byte[]]$bytes) {
  $s = [Convert]::ToBase64String($bytes)
  $lines = for ($i = 0; $i -lt $s.Length; $i += 76) { $s.Substring($i, [Math]::Min(76, $s.Length - $i)) }
  return ($lines -join "`n")
}

function Read-Wgt([string]$path) {
  $files = [ordered]@{}
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $path).Path)
  try {
    foreach ($e in $zip.Entries) {
      if ($e.FullName.EndsWith('/')) { continue }
      $ms = [System.IO.MemoryStream]::new()
      $s = $e.Open(); $s.CopyTo($ms); $s.Dispose()
      $files[$e.FullName] = $ms.ToArray()
    }
  } finally { $zip.Dispose() }
  return $files
}

function Write-Wgt([string]$path, $files) {
  if (Test-Path $path) { Remove-Item $path -Force }
  $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew)
  $zip = [System.IO.Compression.ZipArchive]::new($fs, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($name in $files.Keys) {
      $entry = $zip.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
      $s = $entry.Open(); $s.Write($files[$name], 0, $files[$name].Length); $s.Dispose()
    }
  } finally { $zip.Dispose(); $fs.Dispose() }
}

function Get-UriFor([string]$name) {
  # Same as JavaScript's encodeURIComponent for the characters used in file names ('/' becomes %2F)
  return [Uri]::EscapeDataString($name)
}

function Import-Signer([string]$p12, [string]$password) {
  $flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet
  if ($IsWindows) { $flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable }
  $col = [System.Security.Cryptography.X509Certificates.X509Certificate2Collection]::new()
  $col.Import((Resolve-Path $p12).Path, $password, $flags)
  $signer = $col | Where-Object { $_.HasPrivateKey } | Select-Object -First 1
  if (-not $signer) { throw "No private key in $p12" }
  $chain = @($signer) + @($col | Where-Object { $_.Thumbprint -ne $signer.Thumbprint })
  return @{ cert = $signer; key = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($signer); chain = $chain }
}

function New-PropObject([string]$sigId, [string]$role) {
  return '<Object Id="prop"><SignatureProperties xmlns:dsp="http://www.w3.org/2009/xmldsig-properties">' +
    "<SignatureProperty Id=`"profile`" Target=`"#$sigId`"><dsp:Profile URI=`"http://www.w3.org/ns/widgets-digsig#profile`"></dsp:Profile></SignatureProperty>" +
    "<SignatureProperty Id=`"role`" Target=`"#$sigId`"><dsp:Role URI=`"http://www.w3.org/ns/widgets-digsig#role-$role`"></dsp:Role></SignatureProperty>" +
    "<SignatureProperty Id=`"identifier`" Target=`"#$sigId`"><dsp:Identifier></dsp:Identifier></SignatureProperty>" +
    '</SignatureProperties></Object>'
}

# Canonical forms of a subset whose only inherited namespace is the default xmldsig one.
function Get-CanonicalObject([string]$objectXml) { return $objectXml -replace '^<Object ', "<Object xmlns=`"$NS`" " }
function Get-CanonicalSignedInfo([string]$signedInfoXml) { return $signedInfoXml -replace '^<SignedInfo>', "<SignedInfo xmlns=`"$NS`">" }

function New-Signature($files, [string[]]$names, $signer, [string]$sigId, [string]$role, [string]$h) {
  $a = $ALGS[$h]
  $sb = [System.Text.StringBuilder]::new()
  [void]$sb.Append("<SignedInfo>`n<CanonicalizationMethod Algorithm=`"$EXC_C14N`"></CanonicalizationMethod>`n")
  [void]$sb.Append("<SignatureMethod Algorithm=`"$($a.sig)`"></SignatureMethod>`n")
  foreach ($name in $names) {
    $d = ConvertTo-B64 (Get-Digest $files[$name] $h)
    [void]$sb.Append("<Reference URI=`"$(Get-UriFor $name)`">`n<DigestMethod Algorithm=`"$($a.digest)`"></DigestMethod>`n<DigestValue>$d</DigestValue>`n</Reference>`n")
  }
  $prop = New-PropObject $sigId $role
  $pd = ConvertTo-B64 (Get-Digest $UTF8.GetBytes((Get-CanonicalObject $prop)) $h)
  [void]$sb.Append("<Reference URI=`"#prop`">`n<Transforms>`n<Transform Algorithm=`"$C14N11`"></Transform>`n</Transforms>`n")
  [void]$sb.Append("<DigestMethod Algorithm=`"$($a.digest)`"></DigestMethod>`n<DigestValue>$pd</DigestValue>`n</Reference>`n</SignedInfo>")
  $signedInfo = $sb.ToString()

  $sig = $signer.key.SignData($UTF8.GetBytes((Get-CanonicalSignedInfo $signedInfo)), (Get-HashName $h),
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)

  $certs = ($signer.chain | ForEach-Object { "<X509Certificate>`n$(ConvertTo-B64 $_.RawData)`n</X509Certificate>" }) -join "`n"
  $xml = "<Signature xmlns=`"$NS`" Id=`"$sigId`">`n$signedInfo`n<SignatureValue>`n$(ConvertTo-B64 $sig)`n</SignatureValue>`n" +
    "<KeyInfo>`n<X509Data>`n$certs`n</X509Data>`n</KeyInfo>`n$prop`n</Signature>"
  return $UTF8.GetBytes($xml)
}

function Test-SignatureFile($files, [string]$sigName) {
  $text = $UTF8.GetString($files[$sigName])
  $ok = $true
  $si = [regex]::Match($text, '<SignedInfo>[\s\S]*?</SignedInfo>').Value
  $obj = [regex]::Match($text, '<Object Id="prop">[\s\S]*?</Object>').Value
  $digestAlg = [regex]::Match($si, '<DigestMethod Algorithm="[^"]*#(sha\d+)"').Groups[1].Value
  $refs = [regex]::Matches($si, '<Reference URI="([^"]+)">[\s\S]*?<DigestValue>([\s\S]*?)</DigestValue>')
  $covered = @{}
  foreach ($r in $refs) {
    $uri = $r.Groups[1].Value
    $expected = ($r.Groups[2].Value -replace '\s', '')
    if ($uri -eq '#prop') { $data = $UTF8.GetBytes((Get-CanonicalObject $obj)) }
    else {
      $name = [Uri]::UnescapeDataString($uri)
      $covered[$name] = $true
      if (-not $files.Contains($name)) { Write-Host "  MISSING $name"; $ok = $false; continue }
      $data = $files[$name]
    }
    if ([Convert]::ToBase64String((Get-Digest $data $digestAlg)) -ne $expected) { Write-Host "  BAD DIGEST $uri"; $ok = $false }
  }
  foreach ($name in $files.Keys) {
    if ($name -eq $sigName -or $name -eq 'signature1.xml' -or ($sigName -eq 'author-signature.xml' -and $name -like 'signature*.xml')) { continue }
    if (-not $covered.ContainsKey($name)) { Write-Host "  NOT SIGNED $name"; $ok = $false }
  }
  $certB64 = ([regex]::Match($text, '<X509Certificate>([\s\S]*?)</X509Certificate>').Groups[1].Value -replace '\s', '')
  $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new([Convert]::FromBase64String($certB64))
  $sigValue = [Convert]::FromBase64String(([regex]::Match($text, '<SignatureValue>([\s\S]*?)</SignatureValue>').Groups[1].Value -replace '\s', ''))
  $valid = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPublicKey($cert).VerifyData($UTF8.GetBytes((Get-CanonicalSignedInfo $si)), $sigValue,
    (Get-HashName $digestAlg), [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
  if (-not $valid) { Write-Host '  BAD SIGNATURE VALUE'; $ok = $false }
  Write-Host ("{0}: {1} ({2} references, {3}, signer: {4}, valid until {5:yyyy-MM-dd})" -f $sigName,
    $(if ($ok) { 'OK' } else { 'FAILED' }), $refs.Count, $digestAlg, $cert.Subject, $cert.NotAfter)
  return $ok
}

if ($Verify) {
  $files = Read-Wgt $Verify
  $ok = $true
  foreach ($s in 'author-signature.xml', 'signature1.xml') {
    if (-not $files.Contains($s)) { Write-Host "$s missing"; $ok = $false; continue }
    if (-not (Test-SignatureFile $files $s)) { $ok = $false }
  }
  if (-not $ok) { exit 1 }
  exit 0
}

if (-not $In -or -not $Author -or -not $Distributor) { throw 'Usage: -In pkg.wgt -Author a.p12 -AuthorPassword p -Distributor d.p12 -DistributorPassword p [-Out out.wgt]' }
if (-not $Out) { $Out = $In }

$files = Read-Wgt $In
foreach ($s in @('author-signature.xml', 'signature1.xml')) { if ($files.Contains($s)) { $files.Remove($s) } }
$names = @($files.Keys | Sort-Object -CaseSensitive)

$authorSigner = Import-Signer $Author $AuthorPassword
$distSigner = Import-Signer $Distributor $DistributorPassword

$files['author-signature.xml'] = New-Signature $files $names $authorSigner 'AuthorSignature' 'author' $Hash
$distNames = @('author-signature.xml') + $names
$files['signature1.xml'] = New-Signature $files $distNames $distSigner 'DistributorSignature' 'distributor' $Hash

Write-Wgt $Out $files
Write-Host "Signed $Out ($($names.Count) files, $Hash, author: $($authorSigner.cert.Subject))"
