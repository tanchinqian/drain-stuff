"""Convert the bounded OSM extract to the offline Phase 1 display geometry."""
import json
import math
import pathlib
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
tree = ET.parse(root / 'site-source-osm.xml').getroot()
nodes = {n.attrib['id']: (float(n.attrib['lat']), float(n.attrib['lon'])) for n in tree.findall('node')}
origin = (3.08495, 101.43130)
bounds = (-33, 33, -14, 14)

def project(p):
    return [round((p[1] - origin[1]) * 111320 * math.cos(math.radians(origin[0])) / 20, 3),
            round((origin[0] - p[0]) * 111320 / 20, 3)]

def clip(a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    lo, hi = 0, 1
    for p, q in [(-dx, a[0] - bounds[0]), (dx, bounds[1] - a[0]),
                 (-dz, a[1] - bounds[2]), (dz, bounds[3] - a[1])]:
        if p == 0:
            if q < 0: return None
        elif p < 0: lo = max(lo, q / p)
        else: hi = min(hi, q / p)
    if lo > hi: return None
    return [[round(a[0] + dx * t, 3), round(a[1] + dz * t, 3)] for t in [lo, hi]]

houses, roads, areas = [], [], []
for way in tree.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    points = [project(nodes[n.attrib['ref']]) for n in way.findall('nd')]
    if tags.get('building') == 'house':
        outline = points[:-1]
        x, z = [sum(p[i] for p in outline) / len(outline) for i in [0, 1]]
        if not (bounds[0] < x < bounds[1] and bounds[2] < z < bounds[3]): continue
        edges = [(math.dist(a, b), a, b) for a, b in zip(outline, outline[1:] + outline[:1])]
        depth, a, b = max(edges)
        width = min(e[0] for e in edges)
        houses.append(dict(id='OSM-' + way.attrib['id'], x=round(x, 3), z=round(z, 3),
                           width=round(width, 3), depth=round(depth, 3),
                           rotation=round(math.atan2(b[0] - a[0], b[1] - a[1]), 4), outline=outline))
    elif tags.get('highway') in ['residential', 'unclassified', 'tertiary', 'secondary', 'service']:
        segments = [c for a, b in zip(points, points[1:]) if (c := clip(a, b))]
        if segments:
            roads.append(dict(id=way.attrib['id'], name=tags.get('name', ''),
                              width=.65 if tags['highway'] in ['tertiary', 'secondary'] else .34,
                              segments=segments))
    elif tags.get('natural') == 'water' or tags.get('leisure') == 'park':
        if all(bounds[0] < p[0] < bounds[1] and bounds[2] < p[1] < bounds[3] for p in points):
            areas.append(dict(id=way.attrib['id'], name=tags.get('name', ''),
                              kind='water' if tags.get('natural') == 'water' else 'park', outline=points))

# The monitoring assignment is synthetic; only the underlying footprint geometry is mapped.
anchors = {'A': [-18, -4], 'B': [4, -4], 'C': [-18, 7], 'D': [5, 7]}
pilots = {}
for zone, anchor in anchors.items():
    candidates = sorted([h for h in houses if h['id'] not in pilots.values()],
                        key=lambda h: math.dist([h['x'], h['z']], anchor))[:6]
    for i, h in enumerate(candidates): pilots[f'{zone}{i + 1:02}'] = h['id']
data = dict(source='OpenStreetMap contributors', license='ODbL 1.0',
            fetchedAt='2026-10-13', sourceUrl='https://www.openstreetmap.org/#map=17/3.08495/101.43130',
            googleMapsUrl='https://www.google.com/maps/@3.08495,101.43130,16z',
            extractUrl='https://api.openstreetmap.org/api/0.6/map?bbox=101.426,3.082,101.440,3.091',
            origin=origin, metresPerUnit=20, bounds=bounds, houses=houses,
            roads=roads, areas=areas, pilots=pilots, anchors=anchors)
assert houses and roads and len(set(pilots.values())) == 24
assert all(bounds[0] <= p[0] <= bounds[1] and bounds[2] <= p[1] <= bounds[3]
           for road in roads for segment in road['segments'] for p in segment)
target = root / 'src' / 'site' / 'bandar-bukit-raja.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
print(f'Exported {len(houses)} house footprints, {len(roads)} roads, {len(areas)} areas; 24 synthetic pilot assignments.')
