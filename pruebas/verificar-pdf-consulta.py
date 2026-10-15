"""Compruebo el tamaño carta y los límites físicos de todos los PDF ficticios."""
from pathlib import Path
import json
import fitz

carpeta = Path(__file__).resolve().parents[1] / 'output/consulta-popular-pdf'
resultados = []
margen = 15 * 72 / 25.4
for archivo in sorted(carpeta.glob('*.pdf')):
    documento = fitz.open(archivo)
    for numero, pagina in enumerate(documento, 1):
        assert abs(pagina.rect.width - 792) < .01 and abs(pagina.rect.height - 612) < .01, archivo.name
        texto = pagina.get_text()
        assert 'Consulta Popular 18 de Octubre' in texto, (archivo.name, numero, 'encabezado')
        assert f'Página {numero} de {len(documento)}' in texto, (archivo.name, numero, 'paginación')
        for palabra in pagina.get_text('words'):
            assert palabra[0] >= margen - .8 and palabra[2] <= 792 - margen + .8, (archivo.name, numero, 'margen lateral')
            assert palabra[1] >= margen - .8 and palabra[3] <= 612 - margen + .8, (archivo.name, numero, 'margen vertical')
        for dibujo in pagina.get_drawings():
            r = dibujo['rect']
            assert r.x0 >= margen - .8 and r.x1 <= 792 - margen + .8, (archivo.name, numero, 'bordes laterales')
            assert r.y0 >= margen - .8 and r.y1 <= 612 - margen + .8, (archivo.name, numero, 'bordes verticales')
    resultados.append({'archivo': archivo.name, 'paginas': len(documento)})
    if archivo.name == 'lista-completa-carta.pdf':
        texto = '\n'.join(p.get_text() for p in documento)
        for numero in range(100001, 100151):
            assert str(numero) in texto, ('Falta un registro', numero)
assert len(resultados) == 8, 'Faltan salidas por verificar'
print(json.dumps({'carta_horizontal': True, 'margenes_15_mm_todas_las_paginas': True, 'encabezados_y_paginacion': True, 'registros_completos': True, 'pdf': resultados}, ensure_ascii=False))
