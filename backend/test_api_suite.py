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
        self.assertIn("report_id", data)
        self.assertIn("strategies_summary", data)
        self.assertEqual(len(data["strategies_summary"]), 5)
        self.assertGreater(data["total_orders_routed"], 0)
        self.assertGreater(data["total_pickup_orders"], 0)

        # Consultar o detalhamento da rota via endpoint de resumo
        rep_id = data["report_id"]
        sum_res = self.client.get(f"/api/v1/routing/summary/{rep_id}")
        self.assertEqual(sum_res.status_code, 200)
        sum_data = sum_res.json()
        self.assertIn("vehicles", sum_data)
        self.assertGreater(len(sum_data["vehicles"]), 0)
        first_vehicle = sum_data["vehicles"][0]
        self.assertIn("loading_order", first_vehicle)
        if first_vehicle["loading_order"]:
            first_item = first_vehicle["loading_order"][0]
            self.assertIn("loading_order_label", first_item)
            self.assertIn("loading_order_position", first_item)

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
        rep1_id = res1.json()["report_id"]

        sum1 = self.client.get(f"/api/v1/routing/summary/{rep1_id}").json()
        self.assertIn("routes", sum1)
        for r in sum1["routes"]:
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
        rep2_id = res2.json()["report_id"]

        sum2 = self.client.get(f"/api/v1/routing/summary/{rep2_id}").json()
        self.assertIn("routes", sum2)
        stops_with_intra = [
            s for r in sum2["routes"] for s in r["stops"] if s["is_intra_city"]
        ]
        self.assertGreater(len(stops_with_intra), 0)
        first_intra = stops_with_intra[0]
        self.assertTrue(first_intra["is_intra_city"])
        self.assertEqual(first_intra["route_type"], "URBANO_DETALHADO")
        self.assertIsNotNone(first_intra["address"])

    def test_09_multi_strategy_route_options(self):
        """
        Valida que o endpoint /optimize gera o comparativo executivo das 5 estratégias
        sem que o usuário precise informar previamente nenhuma estratégia:
        recomendada, menor_custo, menor_tempo, menor_peso, menor_volume.
        """
        csv_sample = (
            "Pedido;Data;Vendedor;Situacao;Cidade;Logistica;Situacao_CSV_Entrega;Valor_Pedido;Qtd_Itens;Itens_Resumo;Endereco\n"
            "P101;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 500,00;5;CIMENTO POTY TODAS OBRAS 50KG (10 UN);Bairro Sao Vicente\n"
            "P102;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 800,00;2;PISO CERBRAS (20 MT);Bairro Venancios\n"
            "P103;01/08/2026;V1;Faturado;IPAPORANGA;ENTREGUE;NORMAL;R$ 1200,00;1;CIMENTO POTY (20 UN);\n"
            "P104;01/08/2026;V1;Faturado;TAMBORIL;ENTREGUE;NORMAL;R$ 450,00;1;TINTA FORTCRYL 3,6L (3 UN);\n"
        )
        # Envio direto sem campo 'strategy'
        res = self.client.post(
            "/api/v1/routing/optimize",
            files={"file": ("lote_estrategias.csv", csv_sample.encode("utf-8"), "text/csv")},
            data={"user_prompt": "Comparar estratégias de despacho"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Verificar se os 5 cards executivos foram gerados
        self.assertIn("strategies_summary", data)
        self.assertEqual(len(data["strategies_summary"]), 5)

        strategy_ids = [opt["strategy_id"] for opt in data["strategies_summary"]]
        self.assertIn("recomendada", strategy_ids)
        self.assertIn("menor_custo", strategy_ids)
        self.assertIn("menor_tempo", strategy_ids)
        self.assertIn("menor_peso", strategy_ids)
        self.assertIn("menor_volume", strategy_ids)

        # Verificar campos numéricos de cada estratégia no card
        for opt in data["strategies_summary"]:
            self.assertGreater(opt["total_distance_km"], 0)
            self.assertGreater(opt["total_time_hours"], 0)
            self.assertGreater(opt["total_fuel_liters"], 0)
            self.assertGreater(opt["total_fuel_cost_reais"], 0)
            self.assertIn("badge_label", opt)
            self.assertIn("description", opt)

    def test_10_fuel_consumption_and_refuel_status(self):
        """
        Valida que o cálculo de combustível por veículo (incluindo ida e retorno)
        retorna o gasto estimado em litros e R$, e avalia se precisa abastecer.
        """
        csv_sample = (
            "Pedido;Data;Vendedor;Situacao;Cidade;Logistica;Situacao_CSV_Entrega;Valor_Pedido;Qtd_Itens;Itens_Resumo\n"
            "P201;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;NORMAL;R$ 300,00;1;CIMENTO POTY (5 UN)\n"
            "P202;01/08/2026;V1;Faturado;IPAPORANGA;ENTREGUE;NORMAL;R$ 600,00;1;CIMENTO POTY (10 UN)\n"
        )
        res = self.client.post(
            "/api/v1/routing/optimize",
            files={"file": ("combustivel.csv", csv_sample.encode("utf-8"), "text/csv")},
            data={"user_prompt": "Cálculo de autonomia"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        rep_id = data["report_id"]

        # Recuperar resumo detalhado
        sum_res = self.client.get(f"/api/v1/routing/summary/{rep_id}")
        self.assertEqual(sum_res.status_code, 200)
        sum_data = sum_res.json()

        self.assertIn("total_fuel_liters", sum_data)
        self.assertGreater(sum_data["total_fuel_liters"], 0.0)
        self.assertIn("total_fuel_cost_reais", sum_data)
        self.assertGreater(sum_data["total_fuel_cost_reais"], 0.0)

        # Verificar dados de combustível em cada veículo
        self.assertGreater(len(sum_data["vehicles"]), 0)
        for v in sum_data["vehicles"]:
            self.assertIn("fuel_info", v)
            fuel = v["fuel_info"]
            self.assertIsNotNone(fuel)
            self.assertIn("fuel_type", fuel)
            self.assertIn("tank_capacity_liters", fuel)
            self.assertIn("estimated_consumption_liters", fuel)
            self.assertIn("estimated_cost_reais", fuel)
            self.assertIn("needs_refuel", fuel)
            self.assertIn("fuel_status", fuel)
            self.assertIn(fuel["fuel_status"], ["SUFICIENTE", "ALERTA_RESERVA", "NECESSITA_ABASTECIMENTO"])
            self.assertIn("message", fuel)

    def test_11_dispatch_summary_json_endpoint(self):
        """
        Valida o endpoint único de resumo consolidado em JSON para renderização de PDF no front:
        - valor total, peso total, volume total, distância total e ocupação (%);
        - qual o caminhão selecionado com capacidades e status de combustível;
        - qual a rota definida (estratégia);
        - ordem de carregamento física LIFO (fundo à porta).
        """
        csv_sample = (
            "Pedido;Data;Vendedor;Situacao;Cidade;Logistica;Situacao_CSV_Entrega;Valor_Pedido;Qtd_Itens;Itens_Resumo;Endereco\n"
            "P301;01/08/2026;V1;Faturado;CRATEUS;ENTREGUE;URGENTE;R$ 1500,00;2;POTY (20 UN);Bairro Sao Vicente\n"
            "P302;01/08/2026;V1;Faturado;IPAPORANGA;ENTREGUE;NORMAL;R$ 800,00;1;PISO CERBRAS (10 MT);Centro\n"
        )
        # 1. Otimizar CSV para gerar e persistir as 5 estratégias no SQLite (sem campo strategy)
        opt_res = self.client.post(
            "/api/v1/routing/optimize",
            files={"file": ("relatorio_resumo.csv", csv_sample.encode("utf-8"), "text/csv")},
            data={"user_prompt": "Gerar despacho"},
        )
        self.assertEqual(opt_res.status_code, 200)
        rep_id = opt_res.json()["report_id"]

        # 2. Consultar o endpoint único de resumo em JSON escolhendo a estratégia 'menor_custo'
        sum_res = self.client.get(f"/api/v1/routing/summary/{rep_id}?strategy=menor_custo")
        self.assertEqual(sum_res.status_code, 200)
        summary = sum_res.json()

        # Validação dos campos obrigatórios exigidos
        self.assertEqual(summary["report_id"], rep_id)
        self.assertGreater(summary["total_value_reais"], 0.0)
        self.assertGreater(summary["total_weight_kg"], 0.0)
        self.assertGreater(summary["total_volume_m3"], 0.0)
        self.assertGreater(summary["total_distance_km"], 0.0)
        self.assertGreaterEqual(summary["overall_occupancy_rate_percent"], 0.0)

        # Rota definida (estratégia escolhida)
        self.assertIn("defined_route", summary)
        self.assertEqual(summary["defined_route"]["strategy_id"], "menor_custo")
        self.assertIn("Menor Custo", summary["defined_route"]["strategy_name"])
        self.assertIn("badge_label", summary["defined_route"])

        # Caminhões selecionados e ordem de carregamento
        self.assertIn("vehicles", summary)
        self.assertGreater(len(summary["vehicles"]), 0)
        for v in summary["vehicles"]:
            self.assertIn("vehicle_name", v)
            self.assertIn("effective_capacity_kg", v)
            self.assertIn("effective_capacity_m3", v)
            self.assertIn("occupancy_rate_percent", v)
            self.assertIn("fuel_info", v)
            self.assertIsNotNone(v["fuel_info"])
            self.assertIn("fuel_status", v["fuel_info"])
            self.assertIn("needs_refuel", v["fuel_info"])

            # Ordem de carregamento dentro do caminhão (LIFO)
            self.assertIn("loading_order", v)
            self.assertGreater(len(v["loading_order"]), 0)
            for item in v["loading_order"]:
                self.assertIn("loading_order_position", item)
                self.assertIn("loading_order_label", item)
                self.assertIn("order_id", item)
                self.assertIn("city", item)
                self.assertIn("weight_kg", item)
                self.assertIn("volume_m3", item)
                self.assertIn("value_reais", item)

        # Resumo global de carregamento e combustíveis
        self.assertIn("all_loading_orders", summary)
        self.assertGreater(len(summary["all_loading_orders"]), 0)
        self.assertGreater(summary["total_fuel_liters"], 0.0)
        self.assertGreater(summary["total_fuel_cost_reais"], 0.0)


if __name__ == "__main__":
    unittest.main()
