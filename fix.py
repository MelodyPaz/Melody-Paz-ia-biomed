import json
import pathlib

p = pathlib.Path(r'c:\Users\Usuario\Desktop\ia\Melody-Paz-ia-biomed\Clase 5 - RAG, MCP e Intro a Agentes\Entrega2Parte1.ipynb')
with open(p, 'r', encoding='utf-8') as f:
    data = json.load(f)

changed = False
for cell in data.get('cells', []):
    if cell.get('cell_type') == 'code':
        src = cell.get('source', [])
        for i, line in enumerate(src):
            if "tool_declarations=,\n" in line:
                src[i] = line.replace("tool_declarations=,\n", "tool_declarations=TOOL_DECLARATIONS,\n")
                changed = True
            if ")TOOL_DECLARATIONS" in line:
                src[i] = line.replace(")TOOL_DECLARATIONS", ")")
                changed = True

if changed:
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    print("Notebook Fixed!")
