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

    def _parse_float(self, val_str: Any) -> float:
        if val_str is None:
            return 0.0
        cleaned = (
            str(val_str)
            .replace("≈", "")
            .replace("~", "")
            .replace("R$", "")
            .replace("/caixa", "")
            .strip()
        )
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

    def parse_dimensions_to_volume(
        self,
        dim_str: Optional[str] = None,
        length: Optional[float] = None,
        width: Optional[float] = None,
        height: Optional[float] = None,
    ) -> Optional[float]:
        """
        Calcula o volume em m³ a partir de medidas de comprimento, largura e altura.
        Se os valores forem informados em centímetros (ex.: > 5), converte para m³ dividindo por 1.000.000.
        Se informados em metros, calcula diretamente.
        """
        # 1. Tenta extrair da string de dimensões (ex.: "120x80x60", "1.2 x 0.8 x 0.6 m", "60x60cm")
        if dim_str and str(dim_str).strip():
            text = str(dim_str).replace(",", ".")
            match = re.search(r"(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)", text)
            if match:
                try:
                    c, l, a = float(match.group(1)), float(match.group(2)), float(match.group(3))
                    if c > 0 and l > 0 and a > 0:
                        # Se as medidas forem > 5, assume que estão em centímetros
                        if max(c, l, a) > 5.0:
                            return round((c * l * a) / 1_000_000.0, 4)
                        else:
                            return round(c * l * a, 4)
                except Exception:
                    pass

        # 2. Tenta a partir das colunas numéricas individuais
        if length is not None and width is not None and height is not None:
            c, l, a = float(length), float(width), float(height)
            if c > 0 and l > 0 and a > 0:
                if max(c, l, a) > 5.0:
                    return round((c * l * a) / 1_000_000.0, 4)
                else:
                    return round(c * l * a, 4)

        return None

    def estimate_item_volume_from_text(
        self,
        text: str,
        qty: float = 1.0,
        estimated_weight_kg: float = 10.0,
    ) -> float:
        """
        Quando as dimensões físicas NÃO forem informadas, estima o volume em m³
        utilizando análise semântica do produto (materiais de construção e varejo)
        e densidade volumétrica rodoviária média.
        """
        upper = text.upper()

        # Caixas d'água / Tanques / Reservatórios
        if any(w in upper for w in ["CX. DAGUA", "CX DAGUA", "CX D'AGUA", "CX. D'AGUA", "CAIXA DAGUA", "CAIXA DE AGUA", "CAIXA D AGUA", "CAIXA D'AGUA", "CAIXA D'ÁGUA", "RESERVATORIO", "TANQUE"]):
            if "5000" in upper or "5.000" in upper:
                return round(5.20 * qty, 3)
            if "3000" in upper or "3.000" in upper:
                return round(3.10 * qty, 3)
            if "2000" in upper or "2.000" in upper:
                return round(2.15 * qty, 3)
            if "1000" in upper or "1.000" in upper:
                return round(1.20 * qty, 3)
            if "500" in upper:
                return round(0.65 * qty, 3)
            if "310" in upper:
                return round(0.42 * qty, 3)
            if "250" in upper:
                return round(0.35 * qty, 3)
            return round(0.55 * qty, 3)

        # Portas / Janelas / Esquadrias / Vitrôs
        if "PORTA" in upper and "ADAPTADOR" not in upper and "SUPORTE" not in upper:
            return round(0.12 * qty, 3)
        if any(w in upper for w in ["VITRO", "VITRÔ", "JANELA", "BASCULANTE"]):
            return round(0.065 * qty, 3)
        if "PORTAO" in upper or "PORTÃO" in upper or "GRADE" in upper:
            return round(0.18 * qty, 3)

        # Telhas
        if "TELHA" in upper:
            if any(w in upper for w in ["FIBROCIMENTO", "BRASILIT", "ONDULADA", "2,44", "1,83"]):
                return round(0.045 * qty, 3)
            return round(0.012 * qty, 3)

        # Cimento / Argamassa / Gesso / Cal
        if "CIMENTO" in upper:
            return round(0.036 * qty, 3)  # saco de 50kg tem ~36 litros
        if any(w in upper for w in ["ARGAMASSA", "REJUNTE"]):
            return round(0.015 * qty, 3)
        if any(w in upper for w in ["GESSO", "CAL "]):
            return round(0.020 * qty, 3)

        # Pisos / Porcelanatos / Cerâmicas / Revestimentos
        if any(w in upper for w in ["PISO", "PORCELANATO", "CERAMICA", "CERÂMICA", "REVESTIMENTO"]):
            return round(0.025 * qty, 3)

        # Tintas / Texturas / Impermeabilizantes
        if any(w in upper for w in ["TINTA", "LATEX", "LÁTEX", "ESMALTE", "VERNIZ", "TEXTURA", "MASSA"]):
            if any(w in upper for w in ["18L", "16L", "15L", "BALDE"]):
                return round(0.026 * qty, 3)
            if any(w in upper for w in ["3,6L", "3.6L", "GALAO", "GALÃO"]):
                return round(0.006 * qty, 3)
            return round(0.018 * qty, 3)

        # Louças Sanitárias / Banheiro
        if any(w in upper for w in ["BACIA", "VASO", "SANITARIO", "SANITÁRIO"]):
            return round(0.075 * qty, 3)
        if any(w in upper for w in ["PIA", "CUBA", "LAVATORIO", "LAVATÓRIO"]):
            return round(0.045 * qty, 3)
        if "CHUVEIRO" in upper or "DUCHA" in upper:
            return round(0.005 * qty, 3)

        # Tubos / Conexões / Eletrodutos
        if any(w in upper for w in ["TUBO", "CANO", "BARRA", "ELETRODUTO"]):
            return round(0.032 * qty, 3)
        if any(w in upper for w in ["CONEXAO", "CONEXÃO", "JOELHO", "CURVA", "LUVA", "TE "]):
            return round(0.003 * qty, 3)

        # Móveis / Colchões / Eletros
        if any(w in upper for w in ["COLCHAO", "COLCHÃO"]):
            return round(0.38 * qty, 3)
        if any(w in upper for w in ["GELADEIRA", "FOGAO", "FOGÃO", "LAVADORA"]):
            return round(0.48 * qty, 3)
        if any(w in upper for w in ["ARMARIO", "ARMÁRIO", "GUARDA-ROUPA", "BALCAO", "BALCÃO"]):
            return round(0.28 * qty, 3)

        # Fallback inteligente baseado no peso: densidade média rodoviária de carga fracionada (~450 kg/m³)
        vol_pelo_peso = (estimated_weight_kg / 450.0)
        vol_minimo = 0.008 * qty
        return round(max(vol_pelo_peso, vol_minimo), 3)

    def estimate_order_metrics(
        self,
        itens_resumo: str,
        qtd_itens: int = 1,
        direct_weight: Optional[float] = None,
        direct_volume: Optional[float] = None,
        length: Optional[float] = None,
        width: Optional[float] = None,
        height: Optional[float] = None,
        dimensions_str: Optional[str] = None,
    ) -> Tuple[float, float]:
        """
        Estima ou calcula com precisão o peso total (kg) e o volume total (m³).
        Se dimensões ou volume estiverem informados, calcula diretamente.
        Se NÃO informados, estima de forma precisa através do catálogo ou heurística semântica.
        """
        # 1. Se o volume em m³ já veio diretamente informado e válido no CSV
        if direct_volume is not None and direct_volume > 0.0001:
            computed_vol = round(float(direct_volume), 4)
            computed_weight = float(direct_weight) if direct_weight and direct_weight > 0 else max(1.0, qtd_itens * 12.0)
            return round(computed_weight, 2), computed_vol

        # 2. Se as dimensões físicas foram informadas nas colunas do CSV
        vol_from_dims = self.parse_dimensions_to_volume(
            dim_str=dimensions_str,
            length=length,
            width=width,
            height=height,
        )
        if vol_from_dims is not None and vol_from_dims > 0:
            computed_weight = float(direct_weight) if direct_weight and direct_weight > 0 else max(1.0, qtd_itens * 12.0)
            return round(computed_weight, 2), round(vol_from_dims, 4)

        # 3. Se dimensões NÃO informadas: estimar a partir do resumo dos itens e catálogo
        if not itens_resumo or not str(itens_resumo).strip():
            qty = max(1, qtd_itens)
            w = float(direct_weight) if direct_weight and direct_weight > 0 else round(qty * 15.0, 2)
            # Volume estimado pelo peso ou quantidade mínima
            v = round(max(qty * 0.012, w / 450.0), 3)
            return round(w, 2), round(v, 3)

        total_weight = 0.0
        total_volume = 0.0
        parts = str(itens_resumo).split("|")

        for part in parts:
            part = part.strip()
            if not part:
                continue

            code_match = re.match(r"^(\d+)\s*[-–]", part)
            code = code_match.group(1).strip() if code_match else None

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
                # Produto fora do catálogo Top 85: estimar peso e volume pelas regras semânticas
                item_w = 12.0 * qty
                item_v = self.estimate_item_volume_from_text(part, qty=qty, estimated_weight_kg=item_w)
                total_weight += item_w
                total_volume += item_v

        # Se veio peso direto do CSV, priorizar o peso real informado
        if direct_weight is not None and direct_weight > 0:
            total_weight = float(direct_weight)

        if total_weight <= 0:
            qty = max(1, qtd_itens)
            total_weight = qty * 15.0

        if total_volume <= 0:
            total_volume = max(0.010 * max(1, qtd_itens), total_weight / 450.0)

        return round(max(total_weight, 1.0), 2), round(max(total_volume, 0.005), 3)


catalog_service = CatalogService()
