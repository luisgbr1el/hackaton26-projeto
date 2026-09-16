from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class VehicleConfig(BaseModel):
    id: int
    name: str
    color: str
    hex_color: str
    emoji: str
    nominal_weight_kg: int
    nominal_volume_m3: float
    serra_weight_kg: int
    serra_volume_m3: float
    urbano_weight_kg: int
    urbano_volume_m3: float
    operates_in_mountain: bool
    profile: str


OFFICIAL_FLEET: List[VehicleConfig] = [
    VehicleConfig(
        id=0,
        name="Accelo Médio 1",
        color="Azul",
        hex_color="#2563EB",
        emoji="🔵",
        nominal_weight_kg=4800,
        nominal_volume_m3=2.45,
        serra_weight_kg=4320,
        serra_volume_m3=2.20,
        urbano_weight_kg=4560,
        urbano_volume_m3=2.33,
        operates_in_mountain=True,
        profile="Médio / Interior (Eixo Oeste e Sul)",
    ),
    VehicleConfig(
        id=1,
        name="Accelo Médio 2",
        color="Vermelho",
        hex_color="#DC2626",
        emoji="🔴",
        nominal_weight_kg=4800,
        nominal_volume_m3=2.45,
        serra_weight_kg=4320,
        serra_volume_m3=2.20,
        urbano_weight_kg=4560,
        urbano_volume_m3=2.33,
        operates_in_mountain=True,
        profile="Médio / Interior (Eixo Leste e Serra)",
    ),
    VehicleConfig(
        id=2,
        name="Kia Pequeno",
        color="Verde",
        hex_color="#16A34A",
        emoji="🟢",
        nominal_weight_kg=1700,
        nominal_volume_m3=2.18,
        serra_weight_kg=1530,
        serra_volume_m3=1.96,
        urbano_weight_kg=1615,
        urbano_volume_m3=2.07,
        operates_in_mountain=True,
        profile="Médio / Cargas intermediárias e interior próximo",
    ),
    VehicleConfig(
        id=3,
        name="HR Pequeno",
        color="Laranja",
        hex_color="#EA580C",
        emoji="🟠",
        nominal_weight_kg=1700,
        nominal_volume_m3=2.18,
        serra_weight_kg=1530,
        serra_volume_m3=1.96,
        urbano_weight_kg=1615,
        urbano_volume_m3=2.07,
        operates_in_mountain=True,
        profile="Médio / Cargas médias e urbanas",
    ),
    VehicleConfig(
        id=4,
        name="Moto",
        color="Amarelo",
        hex_color="#EAB308",
        emoji="🟡",
        nominal_weight_kg=300,
        nominal_volume_m3=0.38,
        serra_weight_kg=0,
        serra_volume_m3=0.0,
        urbano_weight_kg=285,
        urbano_volume_m3=0.36,
        operates_in_mountain=False,
        profile="Expresso / Ponto das Topics e Crateús urbano",
    ),
]


class FleetService:
    def __init__(self, fleet: Optional[List[VehicleConfig]] = None):
        self.fleet = fleet or OFFICIAL_FLEET

    def get_all_vehicles(self) -> List[VehicleConfig]:
        return self.fleet

    def get_vehicle_by_id(self, vehicle_id: int) -> Optional[VehicleConfig]:
        for v in self.fleet:
            if v.id == vehicle_id:
                return v
        return None

    def get_effective_capacities(
        self, vehicle_ids: List[int], is_mountain: bool
    ) -> Dict[int, Dict[str, Any]]:
        """
        Retorna as capacidades efetivas de peso (kg) e volume (m³)
        para os veículos selecionados, aplicando o teto de 90% (serra) ou 95% (plano).
        """
        capacities = {}
        for vid in vehicle_ids:
            v = self.get_vehicle_by_id(vid)
            if not v:
                continue
            if is_mountain:
                weight_cap = v.serra_weight_kg if v.operates_in_mountain else 0
                vol_cap = v.serra_volume_m3 if v.operates_in_mountain else 0.0
                safety_label = "90% (Serra / Longa Distância)"
            else:
                weight_cap = v.urbano_weight_kg
                vol_cap = v.urbano_volume_m3
                safety_label = "95% (Plano / Urbano)"

            capacities[vid] = {
                "vehicle": v,
                "weight_kg": weight_cap,
                "volume_m3": vol_cap,
                "safety_label": safety_label,
            }
        return capacities


fleet_service = FleetService()
