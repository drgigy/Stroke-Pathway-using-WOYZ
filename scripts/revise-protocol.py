"""Apply the two approved November 25 edits to the original text-based PDF.

Usage: python scripts/revise-protocol.py /path/to/original-v1.pdf [/path/to/pdftocairo]
Requires pypdf, reportlab and Poppler pdftocairo. No cloud access.
Only page 1 and page 6 display assets are re-exported; other SVGs stay byte-identical.
"""
import hashlib, html, io, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, ByteStringObject
from reportlab.pdfgen import canvas

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
original = source.read_bytes()
old_hash = '4a1d6157a582d92a14c8fa9eaa49f3d850950057526d25095b1965d219e54eed'
assert hashlib.sha256(original).hexdigest() == old_hash, 'Expected the unmodified source PDF'
reader = PdfReader(io.BytesIO(original))
assert len(reader.pages) == 9
writer = PdfWriter()
writer.clone_document_from_reader(reader)

def cmap(font):
    result = {}
    text = font['/ToUnicode'].get_data().decode('ascii')
    for block in re.findall(r'beginbfchar(.*?)endbfchar', text, re.S):
        for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            result[bytes.fromhex(a)] = bytes.fromhex(b).decode('utf-16-be')
    for block in re.findall(r'beginbfrange(.*?)endbfrange', text, re.S):
        for a, b, dest in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            for i, code in enumerate(range(int(a, 16), int(b, 16) + 1)):
                result[code.to_bytes(len(a)//2, 'big')] = (int(dest, 16)+i).to_bytes(len(dest)//2, 'big').decode('utf-16-be')
    assert result
    return result

# Remove actual glyph operands, not a white visual cover hiding searchable TSH.
page = writer.pages[0]
maps = {name: cmap(font.get_object()) for name, font in page['/Resources']['/Font'].items()}
stream = ContentStream(page.get_contents(), writer)
characters, refs = [], []
font_name = None
for index, (operands, operator) in enumerate(stream.operations):
    if operator == b'Tf': font_name = operands[0]
    if operator != b'Tj': continue
    obj = operands[0]
    data = obj.original_bytes if hasattr(obj, 'original_bytes') else bytes(obj)
    mapping = maps[font_name]
    width = len(next(iter(mapping)))
    for offset in range(0, len(data), width):
        value = mapping.get(data[offset:offset+width], '\ufffd')
        for char in value:
            characters.append(' ' if char == '\xa0' else char)
            refs.append((index, offset, offset+width))
joined = ''.join(characters)
needle = 'Blood urea / Creatinine / TSH'
assert joined.count(needle) == 1, 'Expected one precise laboratory label'
start = joined.index(needle) + len('Blood urea / Creatinine')
end = joined.index(needle) + len(needle)
removals = {}
for index, a, b in refs[start:end]: removals.setdefault(index, set()).update(range(a, b))
for index, offsets in removals.items():
    operands, _ = stream.operations[index]
    obj = operands[0]
    data = obj.original_bytes if hasattr(obj, 'original_bytes') else bytes(obj)
    operands[0] = ByteStringObject(bytes(v for i, v in enumerate(data) if i not in offsets))
page.replace_contents(stream)

# Add the label to the existing bottom-right empty row, beside its existing cell.
page = writer.pages[5]
w, h = float(page.mediabox.width), float(page.mediabox.height)
overlay = io.BytesIO()
c = canvas.Canvas(overlay, pagesize=(w, h), invariant=1)
c.setFont('Helvetica', 9)
c.drawString(335.824, h-717.12, 'Patient on anticoagulation')
c.save()
page.merge_page(PdfReader(overlay).pages[0])
output = io.BytesIO()
writer.write(output)
updated = output.getvalue()
check = PdfReader(io.BytesIO(updated))
assert 'TSH' not in check.pages[0].extract_text()
assert 'Blood urea / Creatinine' in check.pages[0].extract_text()
assert 'Patient on anticoagulation' in check.pages[5].extract_text()
for index in [1, 2, 3, 4, 6, 7, 8]:
    assert check.pages[index].extract_text() == reader.pages[index].extract_text()

manifest = json.loads((root/'protocol/source-manifest.json').read_text())
assert manifest.get('originalSourcePdfSha256',manifest['sourcePdfSha256']) == old_hash and manifest.get('templateRevision',1) in (1,2), 'Expected the original or this approved revision manifest'
pdftocairo = sys.argv[2] if len(sys.argv)>2 else shutil.which('pdftocairo')
assert pdftocairo, 'Poppler pdftocairo required'
with tempfile.TemporaryDirectory(prefix='protocol-revision-') as temp:
    pdf = Path(temp)/'revised.pdf';pdf.write_bytes(updated)
    exports = {}
    for number in [1, 6]:
        svg = Path(temp)/f'page-{number}.svg'
        subprocess.run([pdftocairo, '-svg', '-f', str(number), '-l', str(number), str(pdf), str(svg)], check=True, capture_output=True)
        value = svg.read_text()
        entry = manifest['pages'][number-1]
        value = re.sub(r'(<svg\b[^>]*\bwidth=")[^"]+', rf'\g<1>{entry["width"]}', value, count=1)
        value = re.sub(r'(<svg\b[^>]*\bheight=")[^"]+', rf'\g<1>{entry["height"]}', value, count=1)
        exports[number] = value
        entry['sha256'] = hashlib.sha256(value.encode()).hexdigest()
        entry['sourceTextCharacters'] = len(check.pages[number-1].extract_text())
    (root/'protocol/stroke-protocol.pdf').write_bytes(updated)
    for number, value in exports.items(): (root/f'protocol/page-{number}.svg').write_text(value)

manifest.update(sourcePdfSha256=hashlib.sha256(updated).hexdigest(), originalSourcePdfSha256=old_hash,
                pdfByteIdentical=False, templateRevision=2,
                modifications=[{'page':1,'change':'Remove TSH; retain Blood urea / Creatinine'},
                               {'page':6,'change':'Add Patient on anticoagulation in the final non-treatment row'}])
(root/'protocol/source-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
(root/'protocol-pages.js').write_text('export const protocolPages = '+json.dumps(manifest['pages'], indent=2)+';\n')
print(json.dumps({'pages':9,'modifiedPages':[1,6],'originalSha256':old_hash,'revisedSha256':manifest['sourcePdfSha256']}))
