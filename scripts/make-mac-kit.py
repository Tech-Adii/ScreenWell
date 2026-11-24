"""Package only project source and public build assets, never user data or node_modules."""
from pathlib import Path
import hashlib
import json
import stat
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / 'release' / f'ScreenWell-{version}-Mac-BuildKit.zip'
folders = ['main', 'renderer', 'shared', 'vision', 'engine', 'data', 'tests', 'scripts', 'assets', '.github']
files = []
for folder in folders:
    for file in (root / folder).rglob('*'):
        if file.is_file() and '__pycache__' not in file.parts:
            if file.suffix.lower() in {'.sqlite', '.db', '.log', '.pyc'}:
                raise RuntimeError(f'Unexpected private/runtime file: {file}')
            files.append(file)
files += [file for file in root.iterdir() if file.is_file() and
          (file.suffix in {'.json', '.ts', '.mjs', '.md', '.command'} or file.name in {'.gitignore', '.prettierrc.json', 'LICENSE'})]
prefix = f'ScreenWell-{version}-Mac-BuildKit/'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(set(files)):
        name = prefix + file.relative_to(root).as_posix()
        info = zipfile.ZipInfo.from_file(file, name)
        info.create_system = 3
        info.external_attr = ((stat.S_IFREG | (0o755 if file.suffix == '.command' else 0o644)) << 16)
        archive.writestr(info, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('ZIP integrity failure')
    names = archive.namelist()
    assert prefix + 'Build-on-Mac.command' in names
    assert prefix + '.github/workflows/macos-preview.yml' in names
    assert len([name for name in names if name.endswith('.task')]) == 4
digest = hashlib.sha256(output.read_bytes()).hexdigest()
record = {'version': version, 'artifact': output.name, 'bytes': output.stat().st_size, 'sha256': digest,
          'type': 'source-build-kit', 'macAppBuilt': False, 'macRuntimeVerified': False, 'files': len(files)}
(root / 'release' / 'MAC-BUILDKIT-VALIDATION.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps(record, indent=2))
