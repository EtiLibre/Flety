"""Carga (o actualiza) la tabla public.lugares con Overture Maps Places.

Uso (desde la raíz del repo, con la migración 0023 ya corrida):
    pip install duckdb
    python supabase/scripts/lugares_overture.py            # descarga y carga
    python supabase/scripts/lugares_overture.py --solo-csv # solo genera el CSV

Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local (la
clave de servidor nunca va en la app). Overture se publica una vez por mes;
volver a correrlo actualiza los lugares (upsert por id).

Datos: Overture Maps Foundation, licencia CDLA Permissive 2.0 (uso comercial
permitido citando la fuente; la app muestra "Lugares: Overture Maps Foundation").
"""

import csv
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import duckdb

RAIZ = Path(__file__).resolve().parents[2]
CSV = Path(__file__).with_name('lugares_mendoza.csv')
# Gran Mendoza. Sumar zonas acá cuando se activen otras ciudades.
ZONAS = {'Gran Mendoza': (-69.0, -68.65, -33.12, -32.78)}
CONFIANZA_MINIMA = 0.4

CATEGORIAS = {
    'fashion_and_apparel_store': 'Ropa y moda', 'restaurant': 'Restaurante',
    'food_and_beverage_store': 'Almacén y bebidas', 'personal_or_beauty_service': 'Belleza y cuidado',
    'hardware_home_and_garden_store': 'Ferretería y hogar', 'automotive_service': 'Taller y servicios para autos',
    'casual_eatery': 'Comidas', 'home_service': 'Servicios para el hogar',
    'professional_service': 'Servicios profesionales', 'real_estate_service': 'Inmobiliaria', 'bar': 'Bar',
    'shopping': 'Compras', 'event_or_party_service': 'Eventos y fiestas', 'hotel': 'Hotel',
    'financial_service': 'Servicios financieros', 'gym': 'Gimnasio', 'travel_service': 'Turismo y viajes',
    'wellness_service': 'Bienestar', 'electronics_store': 'Electrónica', 'place_of_learning': 'Educación',
    'winery': 'Bodega', 'health_care': 'Salud', 'corporate_or_business_office': 'Oficina',
    'christian_place_of_worship': 'Iglesia', 'auto_dealer': 'Concesionaria', 'manufacturer': 'Fábrica',
    'attorney_or_law_firm': 'Estudio jurídico', 'vehicle_parts_store': 'Repuestos',
    'sport_or_fitness_facility': 'Deportes', 'books_music_and_video_store': 'Librería y música',
    'social_or_community_service': 'Servicio comunitario', 'animal_or_pet_service': 'Veterinaria y mascotas',
    'education': 'Educación', 'technical_service': 'Servicio técnico',
    'building_or_construction_service': 'Construcción', 'lodging': 'Alojamiento', 'dental_clinic': 'Odontología',
    'coffee_shop': 'Café', 'printing_service': 'Imprenta', 'design_service': 'Diseño',
    'diagnostics_imaging_or_lab_service': 'Laboratorio y diagnóstico', 'pharmacy_and_drug_store': 'Farmacia',
    'private_lodging': 'Alojamiento', 'historic_site': 'Sitio histórico', 'arts_crafts_and_hobby_store': 'Arte y manualidades',
    'hospital': 'Hospital', 'sporting_goods_store': 'Artículos deportivos', 'sport_league': 'Club deportivo',
    'government_office': 'Oficina pública', 'personal_care_and_beauty_store': 'Perfumería',
    'college_university': 'Universidad', 'media_service': 'Medios', 'outpatient_care_facility': 'Centro médico',
    'gas_station': 'Estación de servicio', 'cafe': 'Café', 'specialty_school': 'Escuela',
    'b2b_service': 'Servicios a empresas', 'religious_organization': 'Organización religiosa', 'park': 'Parque',
    'fast_food_restaurant': 'Comida rápida', 'music_venue': 'Música en vivo', 'animal_and_pet_store': 'Pet shop',
    'shopping_mall': 'Shopping', 'flowers_and_gifts_store': 'Flores y regalos',
    'behavioral_or_mental_health_clinic': 'Salud mental', 'sports_and_recreation': 'Deportes y recreación',
    'convenience_store': 'Kiosco y almacén', 'arts_and_entertainment': 'Arte y entretenimiento',
    'bank_or_credit_union': 'Banco', 'dance_club': 'Boliche', 'supermarket': 'Supermercado',
    'school': 'Escuela', 'bakery': 'Panadería', 'clinic': 'Clínica', 'pizza_restaurant': 'Pizzería',
    'ice_cream_shop': 'Heladería', 'parking': 'Estacionamiento', 'museum': 'Museo', 'stadium_arena': 'Estadio',
    'bus_station': 'Terminal de ómnibus', 'airport': 'Aeropuerto',
}


def env():
    datos = {}
    for linea in (RAIZ / '.env.local').read_text(encoding='utf-8').splitlines():
        if '=' in linea and not linea.startswith('#'):
            k, v = linea.split('=', 1)
            datos[k.strip()] = v.strip().strip('"')
    return datos


def extraer():
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    rel = con.execute(
        "SELECT max(regexp_extract(file, 'release/([^/]+)/', 1)) "
        "FROM glob('s3://overturemaps-us-west-2/release/*/theme=places/type=place/*.parquet')"
    ).fetchone()[0]
    src = f"s3://overturemaps-us-west-2/release/{rel}/theme=places/type=place/*.parquet"
    filtros = ' OR '.join(
        f'(bbox.xmin BETWEEN {x0} AND {x1} AND bbox.ymin BETWEEN {y0} AND {y1})' for x0, x1, y0, y1 in ZONAS.values()
    )
    con.execute(f"""
        COPY (
          SELECT id, names.primary AS nombre, basic_category AS categoria,
                 addresses[1].freeform AS direccion, addresses[1].locality AS localidad,
                 round((bbox.ymin + bbox.ymax) / 2, 6) AS lat, round((bbox.xmin + bbox.xmax) / 2, 6) AS lng,
                 round(confidence, 3) AS confianza
          FROM read_parquet('{src}', hive_partitioning=0)
          WHERE ({filtros}) AND names.primary IS NOT NULL AND confidence >= {CONFIANZA_MINIMA}
            AND coalesce(operating_status, 'open') = 'open'
        ) TO '{CSV.as_posix()}' (HEADER, DELIMITER ',')
    """)
    print(f'Overture {rel}: {con.execute(f"SELECT count(*) FROM read_csv_auto(\'{CSV.as_posix()}\')").fetchone()[0]} lugares')


def categoria(c):
    if not c:
        return None
    return CATEGORIAS.get(c, c.replace('_', ' ').capitalize())


def cargar():
    e = env()
    url = e['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/') + '/rest/v1/lugares?on_conflict=id'
    clave = e['SUPABASE_SERVICE_ROLE_KEY']
    cab = {
        'apikey': clave,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    if clave.startswith('eyJ'):
        cab['Authorization'] = 'Bearer ' + clave
    with CSV.open(encoding='utf-8') as f:
        filas = [
            {
                'id': r['id'],
                'nombre': r['nombre'][:160],
                'categoria': categoria(r['categoria']),
                'direccion': r['direccion'] or None,
                'localidad': r['localidad'] or None,
                'lat': float(r['lat']),
                'lng': float(r['lng']),
                'fuente': 'overture',
                'confianza': float(r['confianza']) if r['confianza'] else None,
            }
            for r in csv.DictReader(f)
            if len(r['nombre'].strip()) >= 2
        ]
    for i in range(0, len(filas), 1000):
        lote = json.dumps(filas[i : i + 1000]).encode()
        req = urllib.request.Request(url, data=lote, headers=cab, method='POST')
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as err:
            sys.exit(f'Error {err.code} en el lote {i}: {err.read().decode()[:300]}')
        print(f'  {min(i + 1000, len(filas))}/{len(filas)}')
    print('Listo.')


if __name__ == '__main__':
    extraer()
    if '--solo-csv' not in sys.argv:
        cargar()
