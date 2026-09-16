from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class VehicleConfig(BaseModel):
    id: int
    name: str
    color: str
    hex_color: str
    emoji: str
    license_plate: str = "CRA-0000"
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
        license_plate="CRA-1A01",
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
        license_plate="CRA-2B02",
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
        license_plate="CRA-3C03",
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
        license_plate="CRA-4D04",
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
        license_plate="CRA-5E05",
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

    def recommend_best_truck(
        self,
        total_weight_kg: float,
        total_volume_m3: float,
        is_mountain: bool,
        intra_city_only: bool = False,
    ) -> Dict[str, Any]:
        """
        Determina e justifica tecnicamente qual o melhor caminhão recomendado para o lote
        com base no peso total, volume cúbico, topografia (serra) e eficiência de combustível.
        """
        eligible = [v for v in self.fleet if (v.operates_in_mountain or not is_mountain)]

        # Caso Moto: apenas se for perímetro urbano plano, carga leve (<= 285 kg) e volume <= 0.36 m³
        if not is_mountain and intra_city_only and total_weight_kg <= 285 and total_volume_m3 <= 0.36:
            moto = next(v for v in self.fleet if v.id == 4)
            occ = round((total_weight_kg / 285) * 100, 1) if 285 > 0 else 0.0
            return {
                "vehicle_id": moto.id,
                "vehicle_name": moto.name,
                "license_plate": moto.license_plate,
                "color": moto.color,
                "hex_color": moto.hex_color,
                "emoji": moto.emoji,
                "effective_capacity_kg": 285,
                "effective_capacity_m3": 0.364,
                "total_batch_weight_kg": round(total_weight_kg, 2),
                "total_batch_volume_m3": round(total_volume_m3, 3),
                "estimated_occupancy_percent": occ,
                "reason": (
                    f"Moto Titan 160 Start ({moto.license_plate}) é a melhor recomendação para este lote: "
                    f"carga leve de {total_weight_kg:.1f} kg (ocupação de {occ:.1f}% do limite de 285 kg) "
                    f"em perímetro urbano plano de Crateús, proporcionando máxima agilidade e consumo recorde de 38 km/l."
                ),
            }

        # Veículos pequenos (Kia / HR): capacidade efetiva 1.530 kg (serra) ou 1.615 kg (plano)
        small_limit_kg = 1530 if is_mountain else 1615
        small_limit_vol = 1.96 if is_mountain else 2.07

        if total_weight_kg <= small_limit_kg and total_volume_m3 <= small_limit_vol:
            chosen = next((v for v in eligible if v.id in [2, 3]), eligible[0])
            occ = round((total_weight_kg / small_limit_kg) * 100, 1) if small_limit_kg > 0 else 0.0
            return {
                "vehicle_id": chosen.id,
                "vehicle_name": chosen.name,
                "license_plate": chosen.license_plate,
                "color": chosen.color,
                "hex_color": chosen.hex_color,
                "emoji": chosen.emoji,
                "effective_capacity_kg": small_limit_kg,
                "effective_capacity_m3": small_limit_vol,
                "total_batch_weight_kg": round(total_weight_kg, 2),
                "total_batch_volume_m3": round(total_volume_m3, 3),
                "estimated_occupancy_percent": occ,
                "reason": (
                    f"{chosen.name} ({chosen.license_plate}) é o caminhão mais recomendado: a carga de {total_weight_kg:.1f} kg "
                    f"ocupa {occ:.1f}% da capacidade segura ({small_limit_kg} kg{' com teto de 90% para serra' if is_mountain else ''}), "
                    f"garantindo excelente economia de diesel ({chosen.fuel_consumption_kml} km/l vs 4.2 km/l do caminhão médio) "
                    f"sem desperdício de tonelagem ociosa."
                ),
            }

        # Cargas médias e pesadas (> 1.530 kg ou > 1.96 m³): Caminhões Accelo Médio
        med_limit_kg = 4320 if is_mountain else 4560
        med_limit_vol = 2.20 if is_mountain else 2.33
        accelo = next((v for v in eligible if v.id in [0, 1]), eligible[0])
        occ = round((total_weight_kg / med_limit_kg) * 100, 1) if med_limit_kg > 0 else 0.0
        return {
            "vehicle_id": accelo.id,
            "vehicle_name": accelo.name,
            "license_plate": accelo.license_plate,
            "color": accelo.color,
            "hex_color": accelo.hex_color,
            "emoji": accelo.emoji,
            "effective_capacity_kg": med_limit_kg,
            "effective_capacity_m3": med_limit_vol,
            "total_batch_weight_kg": round(total_weight_kg, 2),
            "total_batch_volume_m3": round(total_volume_m3, 3),
            "estimated_occupancy_percent": min(100.0, occ),
            "reason": (
                f"{accelo.name} ({accelo.license_plate}) é o caminhão mais recomendado: a carga total de {total_weight_kg:.1f} kg "
                f"excede o limite seguro dos veículos leves ({small_limit_kg} kg), exigindo a robustez de chassis, freios "
                f"e capacidade de carga do Accelo Médio (teto seguro de {med_limit_kg} kg{' com margem de 90% para serra' if is_mountain else ''})."
            ),
        }


fleet_service = FleetService()

