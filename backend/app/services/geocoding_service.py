import math
import logging
import requests
from typing import Dict, List, Tuple, Any, Optional

logger = logging.getLogger(__name__)

HUB_CRATEUS = {"lat": -5.1764, "lon": -40.6728, "name": "Centro de Distribuição (Crateús)"}
PONTO_TOPICS = {"lat": -5.1735, "lon": -40.6702, "name": "Ponto das Topics (Terminal de Crateús)"}

CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
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


class GeocodingService:
    def get_coordinates(self, city_name: str, delivery_type: str = "", order_index: int = 0) -> Tuple[float, float]:
        """
        Retorna (lat, lon) para a cidade ou ponto de entrega.
        Para pedidos TOPIC, sempre direciona para o Ponto das Topics em Crateús.
        Para pedidos urbanos em Crateús, adiciona micro-deslocamento ordenado para dispersão no mapa.
        """
        if delivery_type.upper() == "TOPIC":
            return PONTO_TOPICS["lat"], PONTO_TOPICS["lon"]

        clean_name = city_name.strip().upper() if city_name else "CRATEUS"
        coords = CITY_COORDINATES.get(clean_name)
        if not coords:
            # Try partial match
            for k, v in CITY_COORDINATES.items():
                if k in clean_name or clean_name in k:
                    coords = v
                    break

        if not coords:
            coords = (HUB_CRATEUS["lat"], HUB_CRATEUS["lon"])

        # If it is Crateús and has multiple orders, disperse slightly around town (radius ~1.5 km)
        if clean_name in ("CRATEUS", "CRATEÚS") and order_index > 0:
            angle = (order_index * 137.5) % 360  # golden ratio angle
            radius = 0.003 + (order_index % 7) * 0.002
            lat = coords[0] + radius * math.sin(math.radians(angle))
            lon = coords[1] + radius * math.cos(math.radians(angle))
            return round(lat, 6), round(lon, 6)

        return coords

    def is_mountain_region(self, cities: List[str]) -> bool:
        for c in cities:
            c_norm = c.strip().upper()
            if c_norm in MOUNTAIN_CITIES:
                return True
        return False

    def build_distance_matrix(
        self, locations: List[Tuple[float, float]]
    ) -> Tuple[List[List[int]], List[List[int]]]:
        """
        Calcula matrizes de distância (em metros) e tempo (em segundos)
        para todos os pares de coordenadas.
        Tenta OSRM se a quantidade de nós for moderada (< 50),
        com fallback imediato para Haversine com fator de curvatura rodoviária (1.30).
        """
        num_locs = len(locations)
        # Fallback generator
        def compute_fallback():
            dist_matrix = [[0] * num_locs for _ in range(num_locs)]
            time_matrix = [[0] * num_locs for _ in range(num_locs)]
            road_factor = 1.30  # Real road winding factor in the Sertão
            avg_speed_kmh = 55.0  # Average speed with road conditions

            for i in range(num_locs):
                for j in range(num_locs):
                    if i != j:
                        d_km = (
                            haversine_distance_km(
                                locations[i][0], locations[i][1],
                                locations[j][0], locations[j][1]
                            )
                            * road_factor
                        )
                        dist_m = int(d_km * 1000)
                        time_s = int((d_km / avg_speed_kmh) * 3600)
                        dist_matrix[i][j] = dist_m
                        time_matrix[i][j] = time_s
            return dist_matrix, time_matrix

        if num_locs <= 40:
            try:
                coords_str = ";".join([f"{lon},{lat}" for lat, lon in locations])
                url = f"http://router.project-osrm.org/table/v1/driving/{coords_str}?annotations=distance,duration"
                res = requests.get(url, timeout=3.0)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and "distances" in data:
                        distances = [[int(d or 0) for d in row] for row in data["distances"]]
                        durations = [[int(t or 0) for t in row] for row in data.get("durations", distances)]
                        return distances, durations
            except Exception as e:
                logger.debug(f"OSRM table request failed ({e}), using road haversine fallback.")

        return compute_fallback()

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
