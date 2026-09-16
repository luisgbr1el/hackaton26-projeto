import os
import sys
import argparse
import re
import pandas as pd

def limpar_valor_monetario(val) -> float:
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).replace("R$", "").strip()
    val_str = val_str.replace(".", "").replace(",", ".")
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def padronizar_data(serie: pd.Series) -> pd.Series:
    datas = pd.to_datetime(serie, format="%d/%m/%y", errors="coerce")
    nulos = datas.isna()
    if nulos.any():
        datas[nulos] = pd.to_datetime(serie[nulos], format="%d/%m/%Y", errors="coerce")
    return datas

def tratar_csv_entregas(caminho_entrada: str, caminho_saida: str = None) -> pd.DataFrame:
    if not os.path.exists(caminho_entrada):
        raise FileNotFoundError(f"Arquivo não encontrado: {caminho_entrada}")

    with open(caminho_entrada, "r", encoding="utf-8", errors="ignore") as f:
        primeira_linha = f.readline()
        separador = ";" if primeira_linha.count(";") > primeira_linha.count(",") else ","

    df = pd.read_csv(caminho_entrada, sep=separador, encoding="utf-8")
    total_inicial = len(df)

    print("=" * 65)
    print("RELATÓRIO DE TRATAMENTO DE DADOS - NOBRELOG IA")
    print(f"Arquivo recebido: {os.path.basename(caminho_entrada)}")
    print(f"Total de registros originais: {total_inicial}")
    print("=" * 65)

    def encontrar_coluna(prioridades):
        for termo in prioridades:
            for col in df.columns:
                if termo == col.strip().upper():
                    return col
        for termo in prioridades:
            for col in df.columns:
                if termo in col.strip().upper():
                    return col
        return None

    col_situacao = encontrar_coluna(["SITUACAO_CSV_ENTREGA", "SITUACAO"])
    col_logistica = encontrar_coluna(["LOGISTICA"])
    col_faturamento = encontrar_coluna(["FATURAMENTO"])
    col_cidade = encontrar_coluna(["CIDADE"])
    col_valor = encontrar_coluna(["VALOR DO PEDIDO", "VALOR_PEDIDO", "VALOR"])
    col_data = encontrar_coluna(["DATA"])

    serie_sit = df[col_situacao].fillna("").astype(str).str.strip().str.upper() if col_situacao else pd.Series([""] * total_inicial)
    serie_log = df[col_logistica].fillna("").astype(str).str.strip().str.upper() if col_logistica else pd.Series([""] * total_inicial)
    serie_fat = df[col_faturamento].fillna("").astype(str).str.strip().str.upper() if col_faturamento else pd.Series([""] * total_inicial)

    mask_retirada = (serie_sit == "RETIRADA") | (serie_log == "RETIRADA")

    mask_cancelado = (
        (serie_log == "CANCELADO")
        | (serie_fat == "PENDENTE")
        | (serie_sit == "CANCELADO")
        | (col_faturamento is not None and serie_fat.isin(["NAO", "NÃO", "CANCELADO"]))
    )

    mask_descarte = mask_retirada | mask_cancelado

    qtd_retiradas = mask_retirada.sum()
    qtd_cancelados = mask_cancelado.sum()

    df_limpo = df[~mask_descarte].copy()
    total_removido = total_inicial - len(df_limpo)
    total_valido = len(df_limpo)

    if col_valor:
        df_limpo["VALOR_NUMERICO"] = df_limpo[col_valor].apply(limpar_valor_monetario)
    if col_data:
        df_limpo["DATA_FORMATADA"] = padronizar_data(df_limpo[col_data])
    if col_cidade:
        df_limpo[col_cidade] = df_limpo[col_cidade].fillna("NÃO INFORMADO").astype(str).str.strip().str.upper()

    print("\n--- CASOS REMOVIDOS NO TRATAMENTO ---")
    print(f" [-] Retiradas no Balcão:                   {qtd_retiradas:>5} pedidos")
    print(f" [-] Cancelados ou Pendentes:               {qtd_cancelados:>5} pedidos")
    print("---------------------------------------------------")
    print(f" Total de registros excluídos:              {total_removido:>5} registros")
    print(f" TOTAL DE PEDIDOS PARA ENTREGA MANTIDOS:    {total_valido:>5} pedidos ({total_valido/total_inicial:.1%})")
    print("=" * 65)

    if col_situacao:
        print("\n--- DISTRIBUIÇÃO DAS ENTREGAS POR TIPO DE SITUAÇÃO MANTIDAS ---")
        dist_sit = df_limpo[col_situacao].value_counts()
        for sit_nome, qtd in dist_sit.items():
            print(f"  * {sit_nome:<20} {qtd:>5} pedidos ({qtd/total_valido:.1%})")
        print("=" * 65)

    if col_cidade:
        print("\n--- TOP CIDADES DE DESTINO DAS ENTREGAS ---")
        dist_cidades = df_limpo[col_cidade].value_counts().head(12)
        print(dist_cidades.to_string())
        print("=" * 65)

    if caminho_saida is None:
        caminho_saida = "pedidos_tratados.csv"

    df_limpo.to_csv(caminho_saida, sep=";", index=False, encoding="utf-8-sig")
    print(f"\n[SUCESSO] Novo arquivo tratado exportado com sucesso!")
    print(f"   Salvo em: {os.path.abspath(caminho_saida)}")
    print(f"   Total de linhas gravadas: {len(df_limpo)}")
    print("=" * 65)

    return df_limpo

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tratamento e limpeza de pedidos NobreLOG IA")
    parser.add_argument(
        "--input",
        "-i",
        default=r"Pasta CSV\DADOS DE ENTREGAS  - Vendas_Faturamento_Entregas.csv",
        help="Caminho do CSV de entrada para processamento",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="pedidos_tratados.csv",
        help="Caminho do CSV de saída após o tratamento",
    )
    args = parser.parse_args()

    tratar_csv_entregas(args.input, args.output)
