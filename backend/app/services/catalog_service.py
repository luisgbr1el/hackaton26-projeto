import os
import re
import csv
from typing import Dict, Any, Tuple, Optional

CATALOG_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "produtos_materiais",
    "Ranking_Top85_Materiais.csv",
)


class CatalogService:
    def __init__(self, csv_path: str = CATALOG_CSV_PATH):
        self.csv_path = csv_path
        self.catalog: Dict[str, Dict[str, float]] = {}
        self._load_catalog()

    def _parse_float(self, val_str: str) -> float:
        if not val_str:
            return 0.0
        cleaned = (
            str(val_str)
            .replace("≈", "")
            .replace("~", "")
            .replace("R$", "")
            .replace("/caixa", "")
            .strip()
        )
        # Extract first numeric part
        match = re.search(r"[-+]?\d*[.,]?\d+", cleaned)
        if match:
            num = match.group().replace(",", ".")
            try:
                return float(num)
            except ValueError:
                return 0.0
        return 0.0

    def _load_catalog(self) -> None:
        if not os.path.exists(self.csv_path):
            return

        with open(self.csv_path, mode="r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f, delimiter=";")
            for row in reader:
                code = str(row.get("Codigo", "")).strip()
                if not code:
                    continue
                weight = self._parse_float(row.get("Peso_kg", "0"))
                volume = self._parse_float(row.get("Volume_m3", "0"))
                self.catalog[code] = {
                    "peso_kg": weight if weight > 0 else 10.0,
                    "volume_m3": volume if volume > 0 else 0.01,
                }

    def estimate_order_metrics(
        self, itens_resumo: str, qtd_itens: int = 1
    ) -> Tuple[float, float]:
        """
        Estima o peso total em kg e volume total em m³ a partir do resumo dos itens.
        """
        if not itens_resumo or not str(itens_resumo).strip():
            qty = max(1, qtd_itens)
            return round(qty * 15.0, 2), round(qty * 0.012, 3)

        total_weight = 0.0
        total_volume = 0.0
        parts = str(itens_resumo).split("|")

        for part in parts:
            part = part.strip()
            if not part:
                continue

            # Extract code at the beginning: e.g. "21503 - CIMENTO..."
            code_match = re.match(r"^(\d+)\s*[-–]", part)
            code = code_match.group(1).strip() if code_match else None

            # Extract quantity: e.g. "(80,00 UN)" or "(25,30 MT)"
            qty_match = re.search(r"\(([\d.,]+)\s*[A-Za-z]+\)", part)
            qty = 1.0
            if qty_match:
                qty_str = qty_match.group(1).replace(".", "").replace(",", ".")
                try:
                    qty = float(qty_str)
                except ValueError:
                    qty = 1.0

            if code and code in self.catalog:
                item_w = self.catalog[code]["peso_kg"]
                item_v = self.catalog[code]["volume_m3"]
                total_weight += item_w * qty
                total_volume += item_v * qty
            else:
                # Default heuristics for construction materials
                total_weight += 12.0 * qty
                total_volume += 0.010 * qty

        if total_weight <= 0:
            qty = max(1, qtd_itens)
            total_weight = qty * 15.0
            total_volume = qty * 0.012

        return round(max(total_weight, 1.0), 2), round(max(total_volume, 0.005), 3)


catalog_service = CatalogService()
