"""Gera o catalogo offline enxuto da TACO 4a edicao a partir da planilha oficial."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import pandas as pd


SOURCE_URL = "https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx"


def nutrient(value: object) -> float:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0.0
    if isinstance(value, str):
        cleaned = value.strip().replace(",", ".")
        if cleaned.lower() in {"tr", "na", "*", ""}:
            return 0.0
        value = cleaned
    try:
        return round(max(0.0, float(value)), 4)
    except (TypeError, ValueError):
        return 0.0


def build(source: Path) -> dict[str, object]:
    table = pd.read_excel(source, sheet_name=0, header=None)
    foods: list[dict[str, object]] = []
    group = "Outros"
    for _, row in table.iterrows():
        code = pd.to_numeric(row.iloc[0], errors="coerce")
        if pd.isna(code):
            heading = row.iloc[0]
            description = row.iloc[1]
            if isinstance(heading, str) and heading.strip() and pd.isna(description):
                ignored = {"Numero do", "Número do", "Alimento"}
                if heading.strip() not in ignored:
                    group = heading.strip()
            continue
        name = row.iloc[1]
        if not isinstance(name, str) or not name.strip():
            continue
        foods.append(
            {
                "id": f"taco:{int(code)}",
                "name": name.strip(),
                "group": group,
                "kcal100": nutrient(row.iloc[3]),
                "protein100": nutrient(row.iloc[5]),
                "fat100": nutrient(row.iloc[6]),
                "carbs100": nutrient(row.iloc[8]),
                "fiber100": nutrient(row.iloc[9]),
                "sodium100": nutrient(row.iloc[17]),
            }
        )
    if len(foods) != 597:
        raise RuntimeError(f"Esperados 597 alimentos TACO, encontrados {len(foods)}")
    return {
        "source": "TACO - Tabela Brasileira de Composicao de Alimentos, 4a edicao",
        "publisher": "NEPA/UNICAMP",
        "sourceUrl": SOURCE_URL,
        "basis": "100 g da parte comestivel",
        "foods": foods,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    catalog = build(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(catalog['foods'])} alimentos gravados em {args.output}")


if __name__ == "__main__":
    main()
