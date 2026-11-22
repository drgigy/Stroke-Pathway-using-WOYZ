"""Import the supplied nine-page PDF without editing it; export vector views.

Requires pypdf and Poppler pdftocairo. No authentication or cloud access occurs.
Usage: python import-protocol.py /path/to/form.pdf --pdftocairo /path/to/pdftocairo
"""
from pathlib import Path
import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--pdftocairo', default=shutil.which('pdftocairo'))
args = parser.parse_args()
if not args.pdftocairo:
    parser.error('pdftocairo is required')
root = Path(__file__).resolve().parents[1]
assets = root / 'protocol'
source = args.source.resolve()
reader = PdfReader(source)
assert not reader.is_encrypted and len(reader.pages) == 9, 'Expected nine unencrypted protocol pages'
titles = ['Stroke Protocol Form', 'Quality Assessment Timings', 'Radiology Form',
          'mRS / ASPECTS', 'Counselling Form', 'Thrombolytic Checklist',
          'Thrombolysis Consent (English)', 'Thrombolysis Consent (Malayalam)', 'NIHSS']
anchors = ['PROTOCOL FORM', 'QUALITY ASSESSMENT TIMINGS', 'RADIOLOGY FORM', 'ASPECTS',
           'COUNSELLING FORM', 'THROMBOLYTIC CHECKLIST', 'INFORMED CONSENT',
           'INFORMED CONSENT', 'National Institutes of Health Stroke']
for page, anchor in zip(reader.pages, anchors):
    assert anchor in (page.extract_text() or ''), f'Unexpected protocol page order: {anchor}'
digest = lambda data: hashlib.sha256(data).hexdigest()
original_bytes = source.read_bytes()
pages = []
with tempfile.TemporaryDirectory(prefix='protocol-import-') as temporary:
    temp = Path(temporary)
    for number, page in enumerate(reader.pages, 1):
        target = temp / f'page-{number}.svg'
        subprocess.run([args.pdftocairo, '-svg', '-f', str(number), '-l', str(number),
                        str(source), str(target)], check=True, capture_output=True)
        svg = target.read_text()
        # Only the display viewport units change; the PDF's native viewBox,
        # glyph paths, form rules, images and clipping remain untouched.
        width = round(float(page.mediabox.width) * 2)
        height = round(float(page.mediabox.height) * 2)
        svg = re.sub(r'(<svg\b[^>]*\bwidth=")[^"]+', rf'\g<1>{width}', svg, count=1)
        svg = re.sub(r'(<svg\b[^>]*\bheight=")[^"]+', rf'\g<1>{height}', svg, count=1)
        tree = ET.fromstring(svg)
        assert tree.findall('.//{*}path'), 'Vector content missing'
        for element in tree.iter():
            assert element.tag.rsplit('}', 1)[-1] not in ['script', 'foreignObject']
            for attr, value in element.attrib.items():
                assert not attr.lower().startswith('on'), 'Unexpected event handler'
                if attr.rsplit('}', 1)[-1] == 'href':
                    assert value.startswith(('#', 'data:image/')), 'External SVG dependency'
        target.write_text(svg)
        pages.append({'number': number, 'title': titles[number-1],
                      'src': f'protocol/page-{number}.svg', 'width': width, 'height': height,
                      'pdfWidthPoints': float(page.mediabox.width),
                      'pdfHeightPoints': float(page.mediabox.height),
                      'sha256': digest(target.read_bytes()),
                      'sourceTextCharacters': len(page.extract_text() or '')})
    # Publish local assets only after all nine exports have passed validation.
    assets.mkdir(exist_ok=True)
    for page in pages:
        shutil.copyfile(temp / Path(page['src']).name, root / page['src'])
    (assets / 'stroke-protocol.pdf').write_bytes(original_bytes)
    assert digest((assets / 'stroke-protocol.pdf').read_bytes()) == digest(original_bytes)
    (root / 'protocol-pages.js').write_text('export const protocolPages = ' + json.dumps(pages, indent=2) + ';\n')
    manifest = {'pageCount': 9, 'sourceFileName': source.name,
                'sourcePdfSha256': digest(original_bytes), 'pdfByteIdentical': True,
                'sourceType': 'text-based-pdf', 'vectorPageExports': True, 'pages': pages}
    (assets / 'source-manifest.json').write_text(json.dumps(manifest, indent=2))
    sections = ''.join(f'<section class="page" aria-label="Page {p["number"]}: {html.escape(p["title"])}"><img src="{p["src"]}" width="{p["width"]}" height="{p["height"]}" alt="{html.escape(p["title"])}"></section>' for p in pages)
    (root / 'protocol.html').write_text('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stroke Protocol Form</title><style>html,body{margin:0;padding:0;background:white}.page{max-width:1100px;margin:0 auto;break-after:page}.page:last-child{break-after:auto}.page img{display:block;width:100%;height:auto}@media print{@page{size:A4;margin:0}.page{max-width:none}}</style></head><body>' + sections + '</body></html>\n')
print(json.dumps({'pages': len(pages), 'pdfByteIdentical': True,
                  'sourcePdfSha256': digest(original_bytes), 'vectorPageExports': True}))
