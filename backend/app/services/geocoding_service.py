import math
import logging
import hashlib
import requests
from typing import Dict, List, Tuple, Any, Optional

logger = logging.getLogger(__name__)

HUB_CRATEUS = {"lat": -5.1764, "lon": -40.6728, "name": "Centro de Distribuição (Crateús)"}
PONTO_TOPICS = {"lat": -5.1735, "lon": -40.6702, "name": "Ponto das Topics (Terminal de Crateús)"}

# Polos centrais das cidades e distritos da região dos Sertões de Crateús
CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Hub e Sede
    "CRATEUS": (-5.1764, -40.6728),
    "CRATEÚS": (-5.1764, -40.6728),
    "PONTO DAS TOPICS": (-5.1735, -40.6702),
    "TERMINAL DAS TOPICS": (-5.1735, -40.6702),
    "TOPIC": (-5.1735, -40.6702),
    # Eixo Oeste (Serra / Divisa PI)
    "IPAPORANGA": (-5.0744, -40.9167),
    "PORANGA": (-4.7547, -40.9172),
    "ARARENDA": (-4.7478, -40.8228),
    "ARARENDÁ": (-4.7478, -40.8228),
    "BURITI DOS MONTES": (-5.3094, -41.3431),
    # Eixo Sul
    "INDEPENDENCIA": (-5.3958, -40.3097),
    "INDEPENDÊNCIA": (-5.3958, -40.3097),
    "NOVO ORIENTE": (-5.5342, -40.7733),
    "REALEJO": (-5.2411, -40.5892),
    "SANTANA": (-5.3120, -40.7150),
    "MONTE NEBO": (-5.4510, -40.8850),
    # Eixo Leste
    "SUCESSO": (-5.0436, -40.3842),
    "TAMBORIL": (-4.9317, -40.3247),
    "NOVA RUSSAS": (-4.7072, -40.5636),
    "MONSENHOR TABOSA": (-4.7861, -40.0636),
    "CATUNDA": (-4.6617, -40.2017),
    "SANTA QUITERIA": (-4.3319, -40.1569),
    "SANTA QUITÉRIA": (-4.3319, -40.1569),
    # Distritos e Povoados dos datasets de Crateús
    "TUCUNS": (-5.1583, -40.7850),
    "JATOBA DOS UMBELINOS": (-5.2200, -40.7300),
    "JATOBÁ DOS UMBELINOS": (-5.2200, -40.7300),
    "ROSARIO": (-5.1100, -40.5900),
    "ROSÁRIO": (-5.1100, -40.5900),
    "LAGOA DAS PEDRAS": (-5.1950, -40.6100),
    "SAO GONCALO": (-5.2800, -40.6400),
    "SÃO GONÇALO": (-5.2800, -40.6400),
    "PAU DE OLEIO": (-5.3400, -40.6200),
    "PAU DE ÓLEO": (-5.3400, -40.6200),
    "UMBURANA": (-5.3200, -40.5500),
    "SITIO GIRA SOL": (-5.1850, -40.7100),
    "SÍTIO GIRA SOL": (-5.1850, -40.7100),
    "VILA GRACA": (-5.1680, -40.6500),
    "VILA GRAÇA": (-5.1680, -40.6500),
    "BARRA DOS SIMIOES": (-5.2600, -40.8100),
    "BARRA DOS SIMIÕES": (-5.2600, -40.8100),
    "IBIAPABA": (-5.0410, -40.9100),
}

# Catálogo de bairros urbanos de Crateús para geocodificação detalhada rua-a-rua
CRATEUS_NEIGHBORHOODS: Dict[str, Tuple[float, float]] = {
    "CENTRO": (-5.1780, -40.6740),
    "SAO VICENTE": (-5.1695, -40.6680),
    "SÃO VICENTE": (-5.1695, -40.6680),
    "VENANCIOS": (-5.1840, -40.6690),
    "VENÂNCIOS": (-5.1840, -40.6690),
    "FATIMA": (-5.1820, -40.6820),
    "FÁTIMA": (-5.1820, -40.6820),
    "MARATOAN": (-5.1710, -40.6850),
    "PLANALTO": (-5.1650, -40.6800),
    "CIDADE NOVA": (-5.1900, -40.6600),
    "ALTO DA BELA VISTA": (-5.1880, -40.6800),
    "BELA VISTA": (-5.1880, -40.6800),
    "ILHA": (-5.1670, -40.6730),
    "SANTA LUZIA": (-5.1740, -40.6620),
    "CAMPO VELHO": (-5.1860, -40.6770),
    "SAO JOSE": (-5.1810, -40.6650),
    "SÃO JOSÉ": (-5.1810, -40.6650),
    "CACHOEIRA": (-5.1630, -40.6710),
    "IPEROSA": (-5.1890, -40.6720),
    "ALTO DOS VIEIRAS": (-5.1870, -40.6870),
}

# Principais vias urbanas de Crateús para resolução precisa
CRATEUS_STREETS: Dict[str, Tuple[float, float]] = {
    "DR MOREIRA DA ROCHA": (-5.1775, -40.6735),
    "CEL ZEZE": (-5.1760, -40.6720),
    "CORONEL ZEZE": (-5.1760, -40.6720),
    "FREI VIDAL": (-5.1750, -40.6710),
    "DOM PEDRO II": (-5.1790, -40.6750),
    "EDILBERTO FROTA": (-5.1720, -40.6690),
    "SARGENTO HERMINIO": (-5.1830, -40.6700),
    "SARGENTO HERMÍNIO": (-5.1830, -40.6700),
    "UBALDINO BRANDAO": (-5.1785, -40.6760),
    "UBALDINO BRANDÃO": (-5.1785, -40.6760),
    "JOSE CORREIA": (-5.1765, -40.6745),
}

MOUNTAIN_CITIES = {
    "BURITI DOS MONTES",
    "PORANGA",
    "IPAPORANGA",
    "MONTE NEBO",
    "IBIAPABA",
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula a distância em linha reta (Haversine) em quilômetros."""
    r = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class LocationResolution:
    def __init__(
        self,
        base_city: str,
        address: str,
        display_address: str,
        lat: float,
        lon: float,
        is_intra_city: bool,
        route_type: str,
    ):
        self.base_city = base_city
        self.address = address
        self.display_address = display_address
        self.lat = lat
        self.lon = lon
        self.is_intra_city = is_intra_city
        self.route_type = route_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_city": self.base_city,
            "address": self.address,
            "display_address": self.display_address,
            "lat": self.lat,
            "lon": self.lon,
            "is_intra_city": self.is_intra_city,
            "route_type": self.route_type,
        }


class GeocodingService:
    def resolve_location(
        self,
        city_raw: str,
        address_raw: Optional[str] = None,
        delivery_type: str = "",
        order_index: int = 0,
    ) -> LocationResolution:
        """
        Diferencia de forma inteligente:
        1. Se no CSV tiver SÓ A CIDADE (ex: 'CRATEUS', 'IPAPORANGA'):
           - is_intra_city = False, route_type = 'POLO_LOCALIDADE'
           - Coordenadas fixas do polo central da localidade.
           - Permite cálculo estrito de rotas ENTRE LOCALIDADES sem deslocamentos fictícios.
        2. Se no CSV tiver UM ENDEREÇO OU BAIRRO DENTRO DA CIDADE:
           - is_intra_city = True, route_type = 'URBANO_DETALHADO'
           - Coordenadas específicas na malha urbana daquela cidade.
           - Permite ao OR-Tools calcular a melhor rota DENTRO da cidade (rua-a-rua), além do entre-cidades.
        """
        clean_city_input = str(city_raw or "").strip().upper()
        clean_address_input = str(address_raw or "").strip()

        # Caso especial: TOPIC é sempre no Ponto das Topics em Crateús
        if delivery_type.upper() == "TOPIC":
            return LocationResolution(
                base_city="CRATEUS",
                address="Ponto das Topics (Terminal Rodoviário)",
                display_address="CRATEÚS - Ponto das Topics (Terminal de Crateús)",
                lat=PONTO_TOPICS["lat"],
                lon=PONTO_TOPICS["lon"],
                is_intra_city=True,
                route_type="URBANO_DETALHADO",
            )

        # 1. Identificar cidade base e verificar se há endereço/bairro embutido
        base_city = "CRATEUS"
        address_detail = ""

        # Procurar cidade base conhecida
        matched_city = None
        for known_city in CITY_COORDINATES.keys():
            if known_city in clean_city_input:
                matched_city = known_city
                break

        if matched_city:
            base_city = matched_city
            # Verificar se a string de cidade traz bairro ou rua após delimitador
            # Ex: "CRATEUS - SAO VICENTE", "CRATEUS (CENTRO)", "CRATEUS, RUA CEL ZEZE"
            for sep in [" - ", " / ", ", ", " (", ";"]:
                if sep in clean_city_input:
                    parts = clean_city_input.split(sep, 1)
                    cand_addr = parts[1].replace(")", "").strip()
                    if cand_addr and cand_addr != base_city:
                        address_detail = cand_addr
                        break
        else:
            base_city = clean_city_input if clean_city_input else "CRATEUS"

        # Se veio uma coluna de endereço preenchida, usar ela com prioridade
        if clean_address_input and clean_address_input.upper() != base_city:
            address_detail = clean_address_input

        # 2. Avaliar se é endereço específico ou apenas a localidade
        has_specific_address = False
        if address_detail:
            addr_norm = address_detail.strip().upper()
            if addr_norm not in ("NAO INFORMADO", "N/A", "SEM ENDERECO", "BALCAO", "LOJA", base_city):
                has_specific_address = True

        # Obter polo central da cidade
        base_coords = CITY_COORDINATES.get(base_city, (HUB_CRATEUS["lat"], HUB_CRATEUS["lon"]))

        if not has_specific_address:
            # SÓ A CIDADE: Roteamento entre localidades apenas
            return LocationResolution(
                base_city=base_city,
                address="",
                display_address=f"{base_city} (Polo da Cidade)",
                lat=round(base_coords[0], 6),
                lon=round(base_coords[1], 6),
                is_intra_city=False,
                route_type="POLO_LOCALIDADE",
            )

        # ENDEREÇO DENTRO DA CIDADE: Roteamento detalhado intra-urbano
        addr_upper = address_detail.upper()
        lat, lon = base_coords

        if base_city in ("CRATEUS", "CRATEÚS"):
            # Buscar no catálogo de vias de Crateús
            street_found = False
            for street_key, coords in CRATEUS_STREETS.items():
                if street_key in addr_upper:
                    lat, lon = coords
                    street_found = True
                    break

            # Buscar no catálogo de bairros de Crateús
            if not street_found:
                for b_key, coords in CRATEUS_NEIGHBORHOODS.items():
                    if b_key in addr_upper:
                        lat, lon = coords
                        street_found = True
                        break

            # Se não catalogado explicitamente, dispersar deterministicamente na malha urbana de Crateús (raio ~1.5 km)
            if not street_found:
                h = int(hashlib.md5(addr_upper.encode("utf-8")).hexdigest()[:8], 16)
                angle = (h % 360)
                dist_km = 0.4 + (h % 11) * 0.1  # 0.4km a 1.4km do centro
                lat = base_coords[0] + (dist_km / 111.0) * math.sin(math.radians(angle))
                lon = base_coords[1] + (dist_km / (111.0 * math.cos(math.radians(base_coords[0])))) * math.cos(math.radians(angle))
        else:
            # Endereço dentro de outra cidade (ex: Ipaporanga, Independência)
            h = int(hashlib.md5(addr_upper.encode("utf-8")).hexdigest()[:8], 16)
            angle = (h % 360)
            dist_km = 0.2 + (h % 5) * 0.08  # raio de 200m a 600m do centro da cidade
            lat = base_coords[0] + (dist_km / 111.0) * math.sin(math.radians(angle))
            lon = base_coords[1] + (dist_km / (111.0 * math.cos(math.radians(base_coords[0])))) * math.cos(math.radians(angle))

        return LocationResolution(
            base_city=base_city,
            address=address_detail,
            display_address=f"{base_city} - {address_detail}",
            lat=round(lat, 6),
            lon=round(lon, 6),
            is_intra_city=True,
            route_type="URBANO_DETALHADO",
        )

    def get_coordinates(self, city_name: str, delivery_type: str = "", order_index: int = 0) -> Tuple[float, float]:
        """Wrapper retrocompatível para retorno direto de tupla (lat, lon)."""
        loc = self.resolve_location(city_raw=city_name, delivery_type=delivery_type, order_index=order_index)
        return loc.lat, loc.lon

    def is_mountain_region(self, cities: List[str]) -> bool:
        for c in cities:
            c_norm = c.strip().upper()
            if c_norm in MOUNTAIN_CITIES:
                return True
        return False

    def build_distance_matrix(
        self, nodes: List[Any]
    ) -> Tuple[List[List[int]], List[List[int]]]:
        """
        Calcula matrizes de distância (em metros) e tempo (em segundos).
        Aplica a regra de ouro do negócio:
        - Se no nó tem SÓ A CIDADE (is_intra_city = False):
          Nós na mesma localidade sem endereço específico possuem distância = 0 m (e 0 s)
          entre si, garantindo que o cálculo seja puramente ENTRE LOCALIDADES.
        - Se o nó tem ENDEREÇO DENTRO DA CIDADE (is_intra_city = True):
          Calcula a distância e tempo viários reais pelas ruas da cidade (malha urbana Manhattan / OSRM),
          permitindo ao OR-Tools encontrar o melhor trajeto intra-urbano sem ziguezague.
        """
        num_locs = len(nodes)
        if num_locs == 0:
            return [], []

        # Padronizar formato dos nós
        parsed_nodes = []
        for n in nodes:
            if isinstance(n, dict):
                lat = float(n.get("lat", HUB_CRATEUS["lat"]))
                lon = float(n.get("lon", HUB_CRATEUS["lon"]))
                base_city = str(n.get("base_city", "CRATEUS")).strip().upper()
                is_intra = bool(n.get("is_intra_city", False))
            elif hasattr(n, "lat") and hasattr(n, "lon"):
                lat = float(n.lat)
                lon = float(n.lon)
                base_city = getattr(n, "city", "CRATEUS").strip().upper()
                is_intra = getattr(n, "is_intra_city", False)
            elif isinstance(n, (tuple, list)):
                lat = float(n[0])
                lon = float(n[1])
                base_city = "CRATEUS"
                is_intra = False
            else:
                lat, lon = HUB_CRATEUS["lat"], HUB_CRATEUS["lon"]
                base_city = "CRATEUS"
                is_intra = False

            parsed_nodes.append({
                "lat": lat,
                "lon": lon,
                "base_city": base_city,
                "is_intra_city": is_intra,
            })

        dist_matrix = [[0] * num_locs for _ in range(num_locs)]
        time_matrix = [[0] * num_locs for _ in range(num_locs)]

        ROAD_FACTOR = 1.30       # Fator de sinuosidade em rodovias do Sertão
        AVG_ROAD_SPEED_KMH = 55.0  # Velocidade média em estrada
        URBAN_GRID_FACTOR = 1.414  # Fator de malha viária em quarteirões (Manhattan)
        AVG_URBAN_SPEED_KMH = 25.0 # Velocidade média no trânsito urbano

        for i in range(num_locs):
            for j in range(num_locs):
                if i == j:
                    dist_matrix[i][j] = 0
                    time_matrix[i][j] = 0
                    continue

                node_i = parsed_nodes[i]
                node_j = parsed_nodes[j]

                # Caso 1: Ambos os nós estão na MESMA cidade/localidade
                if node_i["base_city"] == node_j["base_city"]:
                    # Se AMBOS têm apenas a cidade (sem endereço detalhado)
                    if not node_i["is_intra_city"] and not node_j["is_intra_city"]:
                        # Mesmo polo: distância zero entre entregas da mesma cidade!
                        dist_matrix[i][j] = 0
                        time_matrix[i][j] = 0
                    else:
                        # Pelo menos um tem endereço específico dentro da cidade:
                        # Calcular percurso viário real pelas ruas da cidade
                        d_straight = haversine_distance_km(
                            node_i["lat"], node_i["lon"], node_j["lat"], node_j["lon"]
                        )
                        d_urban_km = d_straight * URBAN_GRID_FACTOR
                        # Mínimo de 100m se forem endereços distintos na mesma cidade
                        if d_urban_km < 0.10:
                            d_urban_km = 0.10
                        dist_matrix[i][j] = int(d_urban_km * 1000)
                        time_matrix[i][j] = int((d_urban_km / AVG_URBAN_SPEED_KMH) * 3600)

                # Caso 2: Cidades/localidades DIFERENTES (ou Depósito -> Cidade)
                else:
                    d_straight = haversine_distance_km(
                        node_i["lat"], node_i["lon"], node_j["lat"], node_j["lon"]
                    )
                    d_road_km = d_straight * ROAD_FACTOR
                    dist_matrix[i][j] = int(d_road_km * 1000)
                    time_matrix[i][j] = int((d_road_km / AVG_ROAD_SPEED_KMH) * 3600)

        # Otimização OSRM para nós urbanos se quantidade moderada e OSRM acessível
        if num_locs <= 35 and any(n["is_intra_city"] for n in parsed_nodes):
            try:
                coords_str = ";".join([f"{n['lon']},{n['lat']}" for n in parsed_nodes])
                url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=distance,duration"
                res = requests.get(url, timeout=2.0)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and "distances" in data:
                        osrm_dist = data["distances"]
                        osrm_dur = data.get("durations", osrm_dist)
                        for i in range(num_locs):
                            for j in range(num_locs):
                                if i != j:
                                    # Se for mesma cidade sem endereço, respeitar distância zero de polo
                                    if (
                                        parsed_nodes[i]["base_city"] == parsed_nodes[j]["base_city"]
                                        and not parsed_nodes[i]["is_intra_city"]
                                        and not parsed_nodes[j]["is_intra_city"]
                                    ):
                                        dist_matrix[i][j] = 0
                                        time_matrix[i][j] = 0
                                    else:
                                        dist_matrix[i][j] = int(osrm_dist[i][j] or dist_matrix[i][j])
                                        time_matrix[i][j] = int(osrm_dur[i][j] or time_matrix[i][j])
            except Exception as e:
                logger.debug(f"OSRM table check failed ({e}), fallback mantido com sucesso.")

        return dist_matrix, time_matrix

    def get_route_geometry(
        self, ordered_stops: List[Tuple[float, float]]
    ) -> Dict[str, Any]:
        """
        Retorna a geometria GeoJSON LineString conectando as paradas na ordem fornecida.
        """
        if len(ordered_stops) < 2:
            return {"type": "LineString", "coordinates": []}

        # Format coordinates for GeoJSON: [lon, lat]
        coordinates = [[lon, lat] for lat, lon in ordered_stops]
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates,
            },
            "properties": {
                "num_stops": len(ordered_stops),
            },
        }


geocoding_service = GeocodingService()

