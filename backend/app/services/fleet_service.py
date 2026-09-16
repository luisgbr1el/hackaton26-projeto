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
    fuel_type: str = "Diesel S10"
    fuel_tank_capacity_l: float = 150.0
    fuel_consumption_kml: float = 4.2
    fuel_cost_per_liter: float = 6.10

    def calculate_fuel_metrics(self, distance_km: float) -> Dict[str, Any]:
        """
        Calcula o consumo de combustível da rota completa (incluindo ida e retorno),
        avaliando se a capacidade total do tanque é suficiente ou se necessita abastecimento.
        """
        kml = self.fuel_consumption_kml if self.fuel_consumption_kml > 0 else 4.2
        tank = self.fuel_tank_capacity_l if self.fuel_tank_capacity_l > 0 else 150.0
        cost_l = self.fuel_cost_per_liter if self.fuel_cost_per_liter > 0 else 6.10

        liters_needed = round(distance_km / kml, 2)
        total_cost = round(liters_needed * cost_l, 2)
        max_autonomy_km = round(tank * kml, 1)
        remaining_liters = round(tank - liters_needed, 2)
        burn_percent = round((liters_needed / tank) * 100.0, 1)

        # Regra de abastecimento baseada na capacidade total do tanque
        if liters_needed > tank:
            needs_refuel = True
            fuel_status = "NECESSITA_ABASTECIMENTO"
            deficit_l = round(liters_needed - tank, 1)
            message = (
                f"A rota consome {liters_needed:.1f}L ({burn_percent:.1f}% da capacidade do tanque de {tank:.1f}L). "
                f"É OBRIGATÓRIO abastecer durante a viagem (déficit de {deficit_l:.1f}L)."
            )
        elif liters_needed > (tank * 0.85):
            needs_refuel = True
            fuel_status = "ALERTA_RESERVA"
            message = (
                f"A rota consome {liters_needed:.1f}L ({burn_percent:.1f}% do tanque de {tank:.1f}L), "
                f"atingindo a margem de reserva ({tank*0.15:.1f}L). Recomenda-se abastecimento preventivo no trajeto."
            )
        else:
            needs_refuel = False
            fuel_status = "SUFICIENTE"
            message = (
                f"A capacidade total do tanque ({tank:.1f}L de {self.fuel_type}) é SUFICIENTE para o percurso "
                f"completo de ida e retorno ({distance_km:.1f} km). Consumo previsto: {liters_needed:.1f}L "
                f"({burn_percent:.1f}% do tanque), com sobra estimada de {remaining_liters:.1f}L."
            )

        return {
            "fuel_type": self.fuel_type,
            "tank_capacity_liters": tank,
            "avg_consumption_kml": kml,
            "estimated_consumption_liters": liters_needed,
            "estimated_cost_reais": total_cost,
            "max_autonomy_km": max_autonomy_km,
            "remaining_fuel_liters": remaining_liters,
            "needs_refuel": needs_refuel,
            "fuel_status": fuel_status,
            "message": message,
        }


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
        fuel_type="Diesel S10",
        fuel_tank_capacity_l=150.0,
        fuel_consumption_kml=4.2,
        fuel_cost_per_liter=6.10,
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
        fuel_type="Diesel S10",
        fuel_tank_capacity_l=150.0,
        fuel_consumption_kml=4.2,
        fuel_cost_per_liter=6.10,
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
        fuel_type="Diesel S10",
        fuel_tank_capacity_l=60.0,
        fuel_consumption_kml=7.8,
        fuel_cost_per_liter=6.10,
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
        fuel_type="Diesel S10",
        fuel_tank_capacity_l=65.0,
        fuel_consumption_kml=7.5,
        fuel_cost_per_liter=6.10,
    ),
    VehicleConfig(
        id=4,
        name="Moto Titan 160 Start",
        color="Amarelo",
        hex_color="#EAB308",
        emoji="🟡",
        nominal_weight_kg=300,
        nominal_volume_m3=0.3833,
        serra_weight_kg=0,
        serra_volume_m3=0.0,
        urbano_weight_kg=285,
        urbano_volume_m3=0.3641,
        operates_in_mountain=False,
        profile="Expresso / Ponto das Topics e Crateús urbano (Titan 160 Start)",
        fuel_type="Gasolina Comum",
        fuel_tank_capacity_l=16.1,
        fuel_consumption_kml=38.0,
        fuel_cost_per_liter=5.95,
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
