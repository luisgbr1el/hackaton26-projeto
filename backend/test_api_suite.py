import os
import sys
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.fleet_service import fleet_service
from app.services.catalog_service import catalog_service
from app.db.sqlite import init_db, list_reports, get_report_by_id, delete_report, save_report


class TestAPIProductionSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_01_health_endpoint(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["project"], settings.PROJECT_NAME)

    def test_02_auth_workflow(self):
        # Invalid credentials
        bad_res = self.client.post("/api/v1/auth/login", json={"username": "wrong", "password": "bad"})
        self.assertEqual(bad_res.status_code, 401)

        # Valid credentials
        res = self.client.post("/api/v1/auth/login", json={
            "username": settings.ADMIN_USERNAME,
            "password": settings.ADMIN_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        token_data = res.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]

        # Access /me with token
        me_res = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["username"], settings.ADMIN_USERNAME)
        self.assertEqual(me_data["role"], "admin")

    def test_03_fleet_specifications(self):
        fleet = fleet_service.get_all_vehicles()
        self.assertEqual(len(fleet), 5)
        names = [v.name for v in fleet]
        self.assertIn("Accelo Médio 1", names)
        self.assertIn("Accelo Médio 2", names)
        self.assertIn("Kia Pequeno", names)
        self.assertIn("HR Pequeno", names)
        self.assertIn("Moto Titan 160 Start", names)

        # Check Moto limits
        moto = [v for v in fleet if v.name == "Moto Titan 160 Start"][0]
        self.assertEqual(moto.nominal_weight_kg, 300)
        self.assertEqual(moto.nominal_volume_m3, 0.3833)
        self.assertEqual(moto.urbano_weight_kg, 285)
        self.assertEqual(moto.urbano_volume_m3, 0.3641)
        self.assertFalse(moto.operates_in_mountain)

        # Check Accelo 1 limits
        accelo = [v for v in fleet if v.name == "Accelo Médio 1"][0]
        self.assertEqual(accelo.nominal_weight_kg, 4800)
        self.assertEqual(accelo.serra_weight_kg, 4320)  # 90%
        self.assertEqual(accelo.urbano_weight_kg, 4560)  # 95%

    def test_04_catalog_metrics(self):
        # Poty cement: 50kg
        w, v = catalog_service.estimate_order_metrics("21503 - CIMENTO POTY TODAS OBRAS 50KG (10,00 UN)")
        self.assertEqual(w, 500.0)
        self.assertAlmostEqual(v, 0.36, places=2)

    def test_05_reports_sqlite(self):
        rep_id = save_report(
            filename="teste.csv",
            user_prompt="Priorizar serra",
            total_orders=15,
            total_weight_kg=1250.5,
            total_distance_km=142.3,
            manifest_markdown="# Manifesto Teste",
            routes_json='[{"vehicle": "🔵 Accelo Médio 1"}]',
            vehicles_used="🔵 Accelo Médio 1",
        )
        self.assertGreater(rep_id, 0)

        # Get by id
        rep = get_report_by_id(rep_id)
        self.assertIsNotNone(rep)
        self.assertEqual(rep["filename"], "teste.csv")
        self.assertEqual(rep["total_orders"], 15)

        # List reports
        reps = list_reports(limit=10)
        self.assertTrue(any(r["id"] == rep_id for r in reps))

        # Delete report
        deleted = delete_report(rep_id)
        self.assertTrue(deleted)
        self.assertIsNone(get_report_by_id(rep_id))

    def test_06_csv_preview_endpoint(self):
        csv_path = os.path.join(
            os.path.dirname(__file__),
            "data", "pedidos", "Pedidos_Filtrados_Semana_1_Anonimizado (1).csv"
        )
        self.assertTrue(os.path.exists(csv_path), f"Arquivo não encontrado: {csv_path}")

        with open(csv_path, "rb") as f:
            res = self.client.post(
                "/api/v1/routing/preview",
                files={"file": ("semana1.csv", f, "text/csv")},
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["total_orders"], 0)
        self.assertIn("RETIRADA", data["delivery_types_count"])
        self.assertGreater(data["pickup_orders_count"], 0)

    def test_07_csv_optimize_endpoint(self):
        csv_path = os.path.join(
            os.path.dirname(__file__),
            "data", "pedidos", "Pedidos_Filtrados_Semana_1_Anonimizado (1).csv"
        )
        with open(csv_path, "rb") as f:
            res = self.client.post(
                "/api/v1/routing/optimize",
                files={"file": ("semana1.csv", f, "text/csv")},
                data={"user_prompt": "Otimizar despachos com prioridade de segurança nas serras"},
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("routes", data)
        self.assertGreater(len(data["routes"]), 0)
        self.assertIn("report_id", data)
        self.assertGreater(data["total_orders_routed"], 0)
        self.assertGreater(data["total_pickup_orders"], 0)

        # Verify LIFO loading order in first route
        first_route = data["routes"][0]
        self.assertIn("stops", first_route)
        self.assertIn("geojson", first_route)
        if first_route["stops"]:
            first_stop = first_route["stops"][0]
            self.assertIn("loading_order_label", first_stop)
            self.assertIn("loading_order_position", first_stop)

    def test_08_intra_city_vs_between_locality_routing(self):
        """
        Valida que:
        1. Se no CSV tiver SÓ A CIDADE (ex: apenas 'CRATEUS' ou 'IPAPORANGA'):
           - is_intra_city é False, route_type é 'POLO_LOCALIDADE'.
           - Pedidos na mesma localidade têm distância 0 entre si (consolidação de polo).
        2. Se no CSV tiver ENDEREÇO/BAIRRO DENTRO DA CIDADE (ex: 'CRATEUS - SAO VICENTE', 'VENANCIOS'):
           - is_intra_city é True, route_type é 'URBANO_DETALHADO'.
           - As distâncias entre os bairros são calculadas e otimizadas rua-a-rua pelo OR-Tools.
        """
        # Caso 1: CSV apenas com cidades (sem endereço detalhado)
        csv_cities_only = (
            "Pedido;Data;Vendedor;Situacao;Cidade;Logistica;Situacao_CSV_Entrega;Valor_Pedido;Qtd_Itens;Itens_Resumo\n"
            "P1;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 100,00;1;PROD A (10 UN)\n"
            "P2;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 150,00;1;PROD B (10 UN)\n"
            "P3;01/08/2026;V1;Faturado;IPAPORANGA;ENTREGUE;NORMAL;R$ 200,00;1;PROD C (10 UN)\n"
        )
        res1 = self.client.post(
            "/api/v1/routing/optimize",
            files={"file": ("cities_only.csv", csv_cities_only.encode("utf-8"), "text/csv")},
            data={"user_prompt": "Despacho padrão"},
        )
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertGreater(data1["total_inter_city_stops"], 0)
        for r in data1["routes"]:
            for s in r["stops"]:
                self.assertFalse(s["is_intra_city"])
                self.assertEqual(s["route_type"], "POLO_LOCALIDADE")

        # Caso 2: CSV com endereços / bairros dentro da cidade
        csv_with_addresses = (
            "Pedido;Data;Vendedor;Situacao;Cidade;Logistica;Situacao_CSV_Entrega;Valor_Pedido;Qtd_Itens;Itens_Resumo;Endereco\n"
            "P10;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 100,00;1;PROD A (10 UN);Bairro Sao Vicente\n"
            "P11;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 150,00;1;PROD B (10 UN);Bairro Venancios\n"
            "P12;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 200,00;1;PROD C (10 UN);Centro\n"
            "P13;01/08/2026;V1;Faturado;IPAPORANGA;ENTREGUE;NORMAL;R$ 200,00;1;PROD D (10 UN);Centro\n"
        )
        res2 = self.client.post(
            "/api/v1/routing/optimize",
            files={"file": ("with_addresses.csv", csv_with_addresses.encode("utf-8"), "text/csv")},
            data={"user_prompt": "Otimizar percurso urbano"},
        )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertGreater(data2["total_intra_city_stops"], 0)
        stops_with_intra = [
            s for r in data2["routes"] for s in r["stops"] if s["is_intra_city"]
        ]
        self.assertGreater(len(stops_with_intra), 0)
        first_intra = stops_with_intra[0]
        self.assertTrue(first_intra["is_intra_city"])
        self.assertEqual(first_intra["route_type"], "URBANO_DETALHADO")
        self.assertIsNotNone(first_intra["address"])


if __name__ == "__main__":
    unittest.main()
