#!/usr/bin/env python3
"""Packages Lumen Launcher for Samsung TVs (Tizen): LumenLauncher.wgt.

    python3 tools/build.py                 # -> LumenLauncher.wgt, NOT signed (what GitHub releases ship)
    python3 tools/build.py --sign PROFILE  # signed with a certificate profile made in Tizen Studio

A .wgt is a zip of src/. TVs only install SIGNED packages:
  - TizenBrew Installer signs the release .wgt with your own Samsung certificate.
  - --sign uses Samsung's `tizen package` CLI (Tizen Studio) with a profile made in its Certificate Manager.

Adapted from Free My TV's tizen/build.py (MIT): https://github.com/simbasjungles/free-my-tv
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.dom.minidom
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
WGT = os.path.join(ROOT, 'LumenLauncher.wgt')
SKIP = re.compile(r'(^|/)(\.|Thumbs\.db$|author-signature\.xml$|signature\d*\.xml$)')


def tizen_cli():
    """Samsung's `tizen` command (Tizen Studio), or None."""
    name = 'tizen.bat' if os.name == 'nt' else 'tizen'
    home = os.path.expanduser('~')
    for base in (os.environ.get('TIZEN_STUDIO', ''), os.path.join(home, 'tizen-studio'),
                 os.path.join(home, 'tizen-sdk'), 'C:\\tizen-studio'):
        path = os.path.join(base, 'tools', 'ide', 'bin', name)
        if base and os.path.exists(path):
            return path
    return shutil.which('tizen')


def sign(profile):
    cli = tizen_cli()
    if not cli:
        sys.exit('Signing needs Tizen Studio\'s `tizen` CLI. Not found: set TIZEN_STUDIO to its install folder.')
    out = tempfile.mkdtemp()
    try:
        run = subprocess.run([cli, 'package', '-t', 'wgt', '-s', profile, '-o', out, '--', WGT],
                             capture_output=True, text=True, shell=(os.name == 'nt'))
        made = [n for n in os.listdir(out) if n.endswith('.wgt')]
        if run.returncode != 0 or not made:
            sys.exit('`tizen package` did not sign it:\n' + (run.stdout + run.stderr).strip())
        shutil.move(os.path.join(out, made[0]), WGT)
    finally:
        shutil.rmtree(out, ignore_errors=True)
    with zipfile.ZipFile(WGT) as z:
        names = z.namelist()
    if 'author-signature.xml' not in names or 'signature1.xml' not in names:
        sys.exit('The package came back without its signatures.')


def build(profile):
    with open(os.path.join(SRC, 'config.xml'), encoding='utf-8') as f:
        manifest = f.read()
    xml.dom.minidom.parseString(manifest.encode('utf-8'))   # a broken manifest only fails on the TV otherwise
    app_id = re.search(r'<tizen:application id="([^"]+)"', manifest).group(1)
    version = re.search(r'<widget [^>]*version="([^"]+)"', manifest, re.S).group(1)

    with zipfile.ZipFile(WGT, 'w', zipfile.ZIP_DEFLATED) as z:
        for folder, _, files in os.walk(SRC):
            for name in sorted(files):
                path = os.path.join(folder, name)
                rel = os.path.relpath(path, SRC).replace(os.sep, '/')
                if SKIP.search(rel):
                    continue
                z.write(path, rel)
    if profile:
        sign(profile)
    print('Built %s (%s %s, %d KB, %s)' % (os.path.basename(WGT), app_id, version, os.path.getsize(WGT) // 1024,
                                           'signed with "%s"' % profile if profile else 'not signed'))


if __name__ == '__main__':
    args = sys.argv[1:]
    build(args[args.index('--sign') + 1] if '--sign' in args else None)
