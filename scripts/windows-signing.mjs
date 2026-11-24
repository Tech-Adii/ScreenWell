import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

export async function windowsSigning() {
  const thumbprint = process.env.SCREENWELL_SIGN_CERT_SHA1?.replace(/\s/g, '');
  if (!thumbprint || !/^[a-f\d]{40}$/i.test(thumbprint)) {
    throw new Error(
      'Set SCREENWELL_SIGN_CERT_SHA1 to the thumbprint of your trusted code-signing certificate.',
    );
  }
  const tool = process.env.SCREENWELL_SIGNTOOL;
  // NSIS passes the uninstaller signing command to the shell. Keep its path literal.
  if (
    !tool ||
    !/^[A-Z]:\\[\p{L}\p{N}_. ()\\-]*signtool\.exe$/iu.test(tool) ||
    path.basename(tool).toLowerCase() !== 'signtool.exe'
  ) {
    throw new Error(
      'Set SCREENWELL_SIGNTOOL to the absolute path of the Windows SDK signtool.exe.',
    );
  }
  await access(tool);
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      String.raw`
    $ErrorActionPreference = 'Stop'
    $thumbprint = $env:SCREENWELL_SIGN_CERT_SHA1 -replace '\s', ''
    $certificate = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object Thumbprint -eq $thumbprint | Select-Object -First 1
    if (-not $certificate -or -not $certificate.HasPrivateKey) { throw 'The signing certificate and private key must be available in Current User Personal.' }
    $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
    $chain.ChainPolicy.ApplicationPolicy.Add([System.Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.3')) | Out-Null
    if (-not $chain.Build($certificate) -or $chain.ChainElements.Count -lt 2) { throw 'The code-signing certificate must chain to a trusted issuer.' }
  `,
    ],
    { stdio: 'inherit', windowsHide: true },
  );

  const signArgs = [
    'sign',
    '/sha1',
    thumbprint,
    '/fd',
    'SHA256',
    '/tr',
    'http://timestamp.digicert.com',
    '/td',
    'SHA256',
  ];
  const verifyArgs = ['verify', '/pa', '/tw'];
  const run = (args, file) =>
    execFileSync(tool, [...args, file], { stdio: 'inherit', windowsHide: true });
  return {
    sign(file) {
      run(signArgs, file);
      run(verifyArgs, file);
    },
    uninstallerDirectives: [signArgs, verifyArgs]
      .map((args) => `!uninstfinalize '"${tool}" ${args.join(' ')} "%1"' = 0`)
      .join('\n'),
  };
}
