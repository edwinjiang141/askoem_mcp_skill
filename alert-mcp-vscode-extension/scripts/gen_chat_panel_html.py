from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "src" / "views" / "chatPanel.ts"
lines = src.read_text(encoding="utf-8").splitlines()
# Line 114-992: template from `return `<!DOCTYPE` through closing `</html>` `;
block = "\n".join(lines[113:992])
first_nl = block.find("\n")
first_line = block[:first_nl]
rest = block[first_nl + 1 :]
if not first_line.strip().startswith("return"):
    raise SystemExit("unexpected first line: " + first_line[:80])
# first_line: '    return `<!DOCTYPE html>' or with more on same line
tick = first_line.find("`")
if tick < 0:
    raise SystemExit("no backtick")
inner = first_line[tick + 1 :].lstrip() + "\n" + rest
if inner.rstrip().endswith("`;"):
    inner = inner.rstrip()[:-2].rstrip()
elif inner.rstrip().endswith("`"):
    inner = inner.rstrip()[:-1].rstrip()
else:
    raise SystemExit("bad trailer: " + repr(inner[-20:]))
assert inner.startswith("<!DOCTYPE"), inner[:80]

header = """import type { ChatPanelMode } from './chatPanelTypes';

export function buildChatPanelHtml(options: {
  mode: ChatPanelMode;
  chartSrc: string;
  csp: string;
}): string {
  const isOem = options.mode === 'oem';
  const { chartSrc, csp } = options;
  return `"""

footer = """`;
}
"""

out = ROOT / "src" / "views" / "chatPanelHtml.ts"
out.write_text(header + inner + footer, encoding="utf-8")
print("written", out, "bytes", len(inner))
