"""Compruebo el tamaño carta y los límites físicos de todos los PDF ficticios."""
from pathlib import Path
import json
import fitz

carpeta = Path(__file__).resolve().parents[1] / 'output/consulta-popular-pdf'
resultados = []
margen = 15 * 72 / 25.4
for archivo in sorted(carpeta.glob('*.pdf')):
    documento = fitz.open(archivo)
    firmas = 0
    for numero, pagina in enumerate(documento, 1):
        assert abs(pagina.rect.width - 792) < .01 and abs(pagina.rect.height - 612) < .01, archivo.name
        texto = pagina.get_text()
        assert 'Consulta Popular 18 de Octubre' in texto, (archivo.name, numero, 'encabezado')
        assert f'Página {numero} de {len(documento)}' in texto, (archivo.name, numero, 'paginación')
        if not archivo.name.startswith('territorio'):
            assert 'Firma' in texto, (archivo.name, numero, 'columna de firma')
            assert 'Datos del jefe o responsable de la planilla' in texto and 'Firma del jefe o responsable:' in texto, 'Falta la ficha del jefe'
            assert 'Sexo' in texto and 'Edad' in texto and 'Teléfono' in texto, 'Faltan columnas personales'
            inicio_firma = (264.4-48) * 72 / 25.4
            espacios = {tuple(round(v,2) for v in dibujo['rect']) for dibujo in pagina.get_drawings()
                        if abs(dibujo['rect'].x0-inicio_firma)<.5 and abs(dibujo['rect'].x1-(792-margen))<.5
                        and dibujo['rect'].height >= 7.5*72/25.4-.3}
            firmas += len(espacios)
        for palabra in pagina.get_text('words'):
            assert palabra[0] >= margen - .8 and palabra[2] <= 792 - margen + .8, (archivo.name, numero, 'margen lateral')
            assert palabra[1] >= margen - .8 and palabra[3] <= 612 - margen + .8, (archivo.name, numero, 'margen vertical')
        for dibujo in pagina.get_drawings():
            r = dibujo['rect']
            assert r.x0 >= margen - .8 and r.x1 <= 792 - margen + .8, (archivo.name, numero, 'bordes laterales')
            assert r.y0 >= margen - .8 and r.y1 <= 612 - margen + .8, (archivo.name, numero, 'bordes verticales')
    resultados.append({'archivo': archivo.name, 'paginas': len(documento), 'espacios_firma': firmas})
    if archivo.name == 'lista-completa-carta.pdf':
        assert firmas == 151, 'Cada registro debe tener su espacio de firma compacto'
        assert 'Femenino' in '\n'.join(p.get_text() for p in documento) and 'Masculino' in '\n'.join(p.get_text() for p in documento), 'No se conservó el sexo registrado'
        texto = '\n'.join(p.get_text() for p in documento)
        for numero in range(100001, 100151):
            assert str(numero) in texto, ('Falta un registro', numero)
        jovenes = [i for i,p in enumerate(documento) if 'Jóvenes (15 a 35 años)' in p.get_text()]
        adultos = [i for i,p in enumerate(documento) if 'Adultos (36 años en adelante)' in p.get_text()]
        territorios = []
        for p in documento:
            t = p.get_text()
            territorio = ('Comuna Z de prueba', 'MILAGRO DE DIOS II') if 'Comuna: Comuna Z de prueba' in t else ('Comuna de prueba', 'MILAGRO DE DIOS I')
            assert 'Comuna: ' + territorio[0] in t and 'Comunidad: ' + territorio[1] in t, 'Falta el territorio en el encabezado'
            territorios.append(territorio)
        assert list(dict.fromkeys(territorios)) == [('Comuna de prueba','MILAGRO DE DIOS I'),('Comuna Z de prueba','MILAGRO DE DIOS II')]
        for territorio in set(territorios):
            indices = [i for i,t in enumerate(territorios) if t == territorio]
            assert indices == list(range(min(indices),max(indices)+1)), 'Una comunidad quedó mezclada'
            j = [i for i in jovenes if territorios[i] == territorio]
            a = [i for i in adultos if territorios[i] == territorio]
            assert j and a and max(j) < min(a), 'Dentro de cada comunidad deben salir jóvenes y después adultos'
        texto_jovenes = '\n'.join(documento[i].get_text() for i in jovenes)
        texto_adultos = '\n'.join(documento[i].get_text() for i in adultos)
        for indice in range(150):
            cedula = str(100001 + indice)
            correcto, otro = (texto_adultos, texto_jovenes) if indice % 2 else (texto_jovenes, texto_adultos)
            assert cedula in correcto and cedula not in otro, 'Una persona aparece en la sección incorrecta'
            for i,p in enumerate(documento):
                if cedula in p.get_text():
                    assert territorios[i][0] == ('Comuna de prueba' if indice < 100 else 'Comuna Z de prueba'), 'Una persona aparece en el territorio incorrecto'
    if archivo.name == 'comunidad-carta.pdf':
        assert firmas == 33, 'Cada persona de la comunidad debe tener su espacio para firmar'
assert len(resultados) == 10, 'Faltan salidas por verificar'
for nombre,etiqueta in [('adultos-carta.pdf','Adultos (36+)'),('jovenes-carta.pdf','Jóvenes (15-35)')]:
    with fitz.open(carpeta / nombre) as documento:
        assert etiqueta in documento[0].get_text(), ('Falta el grupo de edad en el PDF', nombre)
print(json.dumps({'carta_horizontal': True, 'margenes_15_mm_todas_las_paginas': True, 'encabezados_y_paginacion': True, 'registros_completos': True, 'pdf': resultados}, ensure_ascii=False))
