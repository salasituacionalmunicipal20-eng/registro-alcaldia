from pathlib import Path
import fitz

salida = Path(__file__).resolve().parents[1] / 'output/navidad-5k-pruebas'
archivos = ['planillas-grupo-ficticio.pdf', 'panel-Caminata.pdf', 'panel-Carrera.pdf', 'datos-extensos.pdf', 'informe-ficticio.pdf', 'todas-las-planillas.pdf']
for nombre in archivos:
    documento = fitz.open(salida / nombre)
    for numero, pagina in enumerate(documento, 1):
        horizontal = nombre == 'informe-ficticio.pdf'
        assert abs(pagina.rect.width - (792 if horizontal else 612)) < .01
        assert abs(pagina.rect.height - (612 if horizontal else 792)) < .01
        margen = 15 * 72 / 25.4
        for palabra in pagina.get_text('words'):
            assert palabra[0] >= margen - .8 and palabra[2] <= pagina.rect.width - margen + .8 and palabra[1] >= margen - .8 and palabra[3] <= pagina.rect.height - margen + .8, (nombre, numero, palabra)
        texto = pagina.get_text()
        assert 'Caminata y Carrera' in texto, (nombre, numero, 'cabecera')
        assert f'Página {numero} de {len(documento)}' in texto, (nombre, numero, 'paginación')
        pagina.get_pixmap().save(salida / f'{Path(nombre).stem}-{numero}.png')
    if not horizontal:
        texto = ''.join(p.get_text() for p in documento)
        assert 'Firma del participante' in texto and 'Recibido por' in texto
        assert 'punto de chequeo y verificación.' in texto
    if nombre in ('planillas-grupo-ficticio.pdf', 'todas-las-planillas.pdf'):
        assert len(documento) == 3
        assert all('N.º de inscripción' in p.get_text() for p in documento)
        assert all('PRUEBA ' in p.get_text() for p in documento)
    print(f'{nombre}: {len(documento)} página(s), carta y márgenes de 15 mm verificados')
