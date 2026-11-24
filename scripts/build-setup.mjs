// Standard NSIS installer: creates its uninstaller at install time, without
// executing an unsigned generated helper on the build machine.
import { readdir, readFile, writeFile, mkdir, access, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { getNsisPluginsPath } from 'app-builder-lib/out/toolsets/windows.js';
import { windowsSigning } from './windows-signing.mjs';
if (process.platform !== 'win32') throw new Error('Build this Windows installer on Windows.');
const checkSigning = process.argv.includes('--check-signing');
const signing = checkSigning || process.argv.includes('--signed') ? await windowsSigning() : null;
const root = path.resolve('.');
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a numeric release version.');
const input = path.join(root, 'release/win-unpacked');
const artifact = `ScreenWell-${version}${signing ? '-Signed' : ''}-Setup.exe`;
const output = path.join(root, 'release', artifact);
const buildOutput = signing ? path.join(root, 'release/installer-source', artifact) : output;
const compiler =
  process.env.SCREENWELL_MAKENSIS ??
  path.join(process.env.LOCALAPPDATA, 'electron-builder/Cache/nsis/nsis-3.0.4.1/makensis.exe');
await access(compiler);
if (signing) {
  const compilerVersion = execFileSync(compiler, ['/VERSION'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const parts = compilerVersion.match(/\bv?(\d+)\.(\d+)\b/i);
  if (!parts || Number(parts[1]) < 3 || (Number(parts[1]) === 3 && Number(parts[2]) < 12)) {
    throw new Error(
      'Set SCREENWELL_MAKENSIS to NSIS 3.12 or newer for signed uninstaller support.',
    );
  }
}
if (checkSigning) {
  console.log('Windows signing prerequisites verified.');
  process.exit(0);
}
const validation = JSON.parse(await readFile('release/PACKAGE-VALIDATION.json', 'utf8'));
if (validation.version !== version || !validation.allSourceFilesMatch)
  throw new Error('Verify the unpacked package before compiling setup.');
async function walk(dir) {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isSymbolicLink()) throw new Error(`Unexpected symlink: ${file}`);
    if (item.isDirectory()) result.push(...(await walk(file)));
    else result.push(file);
  }
  return result.sort();
}
const files = await walk(input);
const plugins = path.join(await getNsisPluginsPath(null), 'x86-unicode');
await access(path.join(plugins, 'WinShell.dll'));
const relative = files.map((file) => path.relative(input, file));
if (!relative.includes('ScreenWell.exe') || !relative.includes('resources\\app.asar'))
  throw new Error('Missing packaged runtime.');
if (signing) {
  for (const file of files.filter((name) => /\.(exe|dll|node)$/i.test(name))) signing.sign(file);
}
const nsis = (value) => value.replaceAll('$', '$$').replaceAll('"', '$\\"');
const NS = '$';
const installed = relative.map((file) => `  Delete "$INSTDIR\\${nsis(file)}"`).join('\n');
const directories = [
  ...new Set(
    relative.flatMap((file) => {
      const result = [];
      let dir = path.dirname(file);
      while (dir !== '.') {
        result.push(dir);
        dir = path.dirname(dir);
      }
      return result;
    }),
  ),
].sort((a, b) => b.length - a.length);
await mkdir('release/installer-source', { recursive: true });
const script = `Unicode true
${signing?.uninstallerDirectives ?? ''}
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!addplugindir /x86-unicode "${nsis(plugins)}"
Name "ScreenWell"
OutFile "${nsis(buildOutput)}"
InstallDir "$LOCALAPPDATA\\Programs\\ScreenWell"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
SetDatablockOptimize on
VIProductVersion "${version}.0"
VIAddVersionKey /LANG=1033 "ProductName" "ScreenWell"
VIAddVersionKey /LANG=1033 "FileDescription" "ScreenWell Setup"
VIAddVersionKey /LANG=1033 "ProductVersion" "${version}"
VIAddVersionKey /LANG=1033 "FileVersion" "${version}"
VIAddVersionKey /LANG=1033 "LegalCopyright" "ScreenWell · CS238DL"
!define MUI_ICON "${nsis(path.join(root, 'assets/icon.ico'))}"
!define MUI_UNICON "${nsis(path.join(root, 'assets/icon.ico'))}"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "English"
!macro RequireAppClosed
  retryClose:
  ${NS}{If} ${NS}{FileExists} "$INSTDIR\\ScreenWell.exe"
    ; OPEN_EXISTING, with write access, fails for a running Windows executable.
    ; No bytes are written. This also detects a minimized or tray-only app.
    System::Call 'kernel32::CreateFileW(w "$INSTDIR\\ScreenWell.exe", i 0x40000000, i 7, p 0, i 3, i 0, p 0) p.r0'
    ${NS}{If} $0 == -1
      IfSilent abortClose
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "The installed app is in use or cannot be updated. Quit ScreenWell from its tray menu and retry." IDRETRY retryClose
      abortClose:
      SetErrorLevel 1
      Abort
    ${NS}{EndIf}
    System::Call 'kernel32::CloseHandle(p r0)'
  ${NS}{EndIf}
!macroend
Function .onInit
  SetShellVarContext current
  ${NS}{IfNot} ${NS}{RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "ScreenWell requires 64-bit Windows."
    Abort
  ${NS}{EndIf}
  ReadRegStr $0 HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "InstallLocation"
  ${NS}{If} $0 != ""
    StrCpy $INSTDIR $0
  ${NS}{EndIf}
FunctionEnd
Function un.onInit
  SetShellVarContext current
FunctionEnd
Section "ScreenWell" SEC_MAIN
  SetShellVarContext current
  !insertmacro RequireAppClosed
  SetOutPath "$INSTDIR"
  SetOverwrite on
  ClearErrors
  File /r "${nsis(input)}\\*"
  ${NS}{If} ${NS}{Errors}
    MessageBox MB_OK|MB_ICONSTOP "Could not copy all files. Quit ScreenWell from its tray menu, then run Setup again."
    SetErrorLevel 1
    Abort
  ${NS}{EndIf}
  WriteUninstaller "$INSTDIR\\Uninstall ScreenWell.exe"
  CreateDirectory "$SMPROGRAMS\\ScreenWell"
  CreateShortcut "$SMPROGRAMS\\ScreenWell\\ScreenWell.lnk" "$INSTDIR\\ScreenWell.exe"
  CreateShortcut "$SMPROGRAMS\\ScreenWell\\Uninstall ScreenWell.lnk" "$INSTDIR\\Uninstall ScreenWell.exe"
  CreateShortcut "$DESKTOP\\ScreenWell.lnk" "$INSTDIR\\ScreenWell.exe"
  WinShell::SetLnkAUMI "$SMPROGRAMS\\ScreenWell\\ScreenWell.lnk" "${nsis(manifest.build.appId)}"
  WinShell::SetLnkAUMI "$DESKTOP\\ScreenWell.lnk" "${nsis(manifest.build.appId)}"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "DisplayName" "ScreenWell"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "DisplayVersion" "${version}"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "Publisher" "ScreenWell · CS238DL"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "UninstallString" '$\\"$INSTDIR\\Uninstall ScreenWell.exe$\\"'
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "QuietUninstallString" '$\\"$INSTDIR\\Uninstall ScreenWell.exe$\\" /S'
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "DisplayIcon" "$INSTDIR\\ScreenWell.exe"
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "NoModify" 1
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell" "NoRepair" 1
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  !insertmacro RequireAppClosed
  ; Remove only installed filenames, never recursively delete a user-selected folder.
${installed}
  Delete "$INSTDIR\\Uninstall ScreenWell.exe"
${directories.map((dir) => `  RMDir "$INSTDIR\\${nsis(dir)}"`).join('\n')}
  RMDir "$INSTDIR"
  Delete "$DESKTOP\\ScreenWell.lnk"
  Delete "$SMPROGRAMS\\ScreenWell\\ScreenWell.lnk"
  Delete "$SMPROGRAMS\\ScreenWell\\Uninstall ScreenWell.lnk"
  RMDir "$SMPROGRAMS\\ScreenWell"
  DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ScreenWell"
  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "ScreenWell"
  ; Keep study history and settings in userData.
SectionEnd
`;
await writeFile('release/installer-source/ScreenWell.nsi', script, 'utf8');
execFileSync(compiler, ['/V2', path.resolve('release/installer-source/ScreenWell.nsi')], {
  stdio: 'inherit',
  windowsHide: true,
});
if (signing) {
  signing.sign(buildOutput);
  await rename(buildOutput, output);
}
const payload = [];
for (let i = 0; i < files.length; i++)
  payload.push({
    file: relative[i],
    sha256: createHash('sha256')
      .update(await readFile(files[i]))
      .digest('hex'),
  });
await writeFile(
  `release/installer-source/${signing ? 'signed-' : ''}payload.json`,
  JSON.stringify({ version, artifact, signed: Boolean(signing), files: payload }, null, 2),
);
console.log(`Built ${output} with ${files.length} runtime files and a per-user uninstaller.`);
