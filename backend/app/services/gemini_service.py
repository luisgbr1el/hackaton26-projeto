import json
import logging
from typing import Dict, List, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai package not available. Gemini AI features will use fallback logic.")


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"
        self.live_model_name = settings.GEMINI_LIVE_MODEL or "gemini-3.8-live"
        # Fallback models in case of temporary 503 spikes in high demand
        self.fallback_models = [self.model_name, "gemini-flash-latest", "gemini-3.5-flash"]
        self._client = None
        self._circuit_breaker_until = 0.0

        if GENAI_AVAILABLE and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini Client initialized with primary model {self.model_name} and live model {self.live_model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None

    def _generate_with_fallback(self, prompt: str, is_json: bool = False) -> Optional[str]:
        """Tenta gerar conteúdo com o modelo principal e faz fallback transparente se houver 503/sobrecarga."""
        import time
        if not self._client or time.time() < self._circuit_breaker_until:
            return None

        for model in self.fallback_models:
            try:
                config = None
                if is_json and hasattr(types, "GenerateContentConfig"):
                    config = types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    )
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Model {model} returned error ({err_str[:120]}), tentando próximo modelo na fila...")
                if "503" in err_str or "UNAVAILABLE" in err_str or "quota" in err_str.lower():
                    # Temporarily avoid spamming API for 60 seconds
                    self._circuit_breaker_until = time.time() + 60.0
                continue
        return None

    def parse_dispatch_prompt(
        self,
        user_prompt: str,
        cities_in_batch: List[str],
        sample_rows: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Interpreta o comando de despacho do operador e ajusta os parâmetros
        de rota para os 5 veículos oficiais e regras de segurança (90% serra vs 95% plano).
        """
        is_mountain = any(c in ["BURITI DOS MONTES", "PORANGA", "IPAPORANGA", "MONTE NEBO"] for c in cities_in_batch)
        fallback_result = {
            "apply_pickup_filter": True,
            "route_topography_profile": "serra_distante" if is_mountain else "urbana_plana",
            "safety_capacity_factor": 0.90 if is_mountain else 0.95,
            "allocated_vehicles": [
                {"vehicle_id": 0, "name": "Accelo Médio 1", "color": "Azul", "emoji": "🔵", "capacity_kg": 4320 if is_mountain else 4560},
                {"vehicle_id": 1, "name": "HR Pequeno", "color": "Laranja", "emoji": "🟠", "capacity_kg": 1530 if is_mountain else 1615},
            ],
            "topic_hub_address": "Terminal Rodoviário de Crateús, CE",
            "crateus_sla_max_hours": 15,
            "interior_urgent_sla_days": 3,
            "reasoning": "Configuração calculada via regras de contingência (fallback)."
        }

        if not self.is_available or not user_prompt:
            return fallback_result

        prompt = f"""
Você é o Especialista em Logística da Distribuidora em Crateús-CE.
Configure os parâmetros para o solucionador Google OR-Tools considerando:

### Frota Oficial da Empresa:
- 🔵 Azul: Accelo Médio 1 (4.800 kg nominal) - Médio / Interior
- 🔴 Vermelho: Accelo Médio 2 (4.800 kg nominal) - Médio / Interior
- 🟢 Verde: Kia Pequeno (1.700 kg nominal) - Médio
- 🟠 Laranja: HR Pequeno (1.700 kg nominal) - Médio / Urbano
- 🟡 Amarelo: Moto Titan 160 Start (300 kg nominal | 0.3833 m³) - Cargas pequenas, Ponto das Topics e Crateús urbano

### Regras Mandatórias:
1. Pedidos com 'RETIRADA' são balcão e nunca entram na rota.
2. Cidades com serra ou longa distância (ex: Buriti dos Montes, Poranga, Ipaporanga, Monte Nebo): teto de 90% da capacidade do veículo por segurança.
3. Trecho urbano ou plano: permite até 95% da capacidade.
4. Urgência: Crateús prazo de 11h-15h; Interior urgente prazo de até 3 dias.
5. Cargas maiores que 300 kg nunca podem ser alocadas na Moto Titan 160 Start.
6. Pedidos URGENTES são o gatilho para completar a carga mínima viável do caminhão.

### Dados da Operação:
Instrução do Despachante: "{user_prompt}"
Cidades identificadas no lote: {cities_in_batch}

Responda ESTRITAMENTE com um objeto JSON válido (sem texto antes ou depois):
{{
  "apply_pickup_filter": true,
  "route_topography_profile": "serra_distante" ou "urbana_plana",
  "safety_capacity_factor": 0.90 ou 0.95,
  "allocated_vehicle_ids": [0, 1],
  "reasoning": "Breve justificativa técnica da alocação."
}}
"""
        raw_text = self._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("\n", 1)[1]
                    if raw_text.endswith("```"):
                        raw_text = raw_text.rsplit("\n", 1)[0]
                return json.loads(raw_text)
            except Exception as e:
                logger.error(f"Error decoding JSON from Gemini: {e}")

        return fallback_result

    def generate_operational_manifest(
        self,
        vehicle_name: str,
        emoji: str,
        color: str,
        total_distance_km: float,
        total_weight_kg: float,
        effective_capacity_kg: int,
        safety_factor: str,
        stops_summary: List[Dict[str, Any]],
        has_topics: bool = False,
        has_urgent: bool = False,
        license_plate: str = "",
    ) -> str:
        """
        Gera o Manifesto Operacional do Motorista em Markdown formatado.
        """
        plate_str = f" | Placa: {license_plate}" if license_plate else ""
        fallback_manifest = f"""
# {emoji} MANIFESTO DE CARGA — ROTA {color.upper()} ({vehicle_name})

**Data do Despacho:** Hoje  
**Veículo:** {vehicle_name} ({color}{plate_str})  
**Distância Prevista:** {total_distance_km:.1f} km  
**Carga Total Transportada:** {total_weight_kg:.1f} kg / {effective_capacity_kg} kg ({safety_factor})  

---

### ⚠️ Avisos Operacionais:
- **Segurança:** {safety_factor} respeitado contra sobreaquecimento e desgaste.
{"- **Ponto das Topics:** Parada obrigatória no Terminal de Crateús no primeiro horário." if has_topics else ""}
{"- **Atenção Máxima:** Contém pedidos URGENTES com prioridade de entrega (SLA 11-15h em Crateús ou até 3 dias no interior)." if has_urgent else ""}

### 📦 Sequência das Paradas (Ordem LIFO de Carregamento):
*O que for entregue primeiro fica por último no baú (porta).*
"""
        if not self.is_available:
            return fallback_manifest

        prompt = f"""
Você é o Chefe de Expedição do Centro de Distribuição em Crateús-CE.
Gere um Manifesto de Carga executivo e motivador para o motorista do veículo {emoji} {vehicle_name} (Cor: {color}).

Dados da Viagem:
- Veículo: {vehicle_name} ({emoji} {color})
- Distância Total: {total_distance_km} km
- Carga Total: {total_weight_kg} kg de {effective_capacity_kg} kg permitidos ({safety_factor})
- Contém Parada no Ponto das Topics de Crateús: {has_topics}
- Contém Pedidos URGENTES: {has_urgent}
- Paradas: {json.dumps(stops_summary[:10], ensure_ascii=False)}

O documento DEVE conter em Markdown executivo:
1. Cabeçalho com {emoji} Cor e Nome Oficial do Veículo.
2. Medidor de Capacidade Segura e alertas de serra (teto de 90% para serra ou 95% para urbano).
3. Regra de Carregamento LIFO (o primeiro a entregar entra por último no baú).
4. Roteiro passo a passo das paradas.
5. Mensagem de segurança na estrada para o motorista.
"""
        generated = self._generate_with_fallback(prompt)
        return generated if generated else fallback_manifest


# Singleton instance
gemini_service = GeminiService()
