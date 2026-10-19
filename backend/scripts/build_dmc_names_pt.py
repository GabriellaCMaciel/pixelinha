"""Build app/data/dmc_names_pt.json: a Brazilian Portuguese name for every DMC thread.

The English catalog names follow a pattern, "<base color> <shade>" (for example
"Salmon Very Light"), so each name is translated from a table of base colors plus a
table of shades. Run it again after editing the tables:

    python scripts/build_dmc_names_pt.py
"""

import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "app" / "data"

# English names that the catalog writes in short or misspelled form.
FIXES = {
    r"\bVy\b": "Very",
    r"\bVD\b": "Very Dark",
    r"\bGrn\b": "Green",
    r"Darkv\b": "Dark",
    r"\bmedium\b": "Medium",
}

# Shade words, longest first so "Ultra Very Light" wins over "Light".
SHADES = {
    "Ultra Very Light": "Ultraclaro",
    "Ultra Very Dark": "Ultraescuro",
    "Ultra Light": "Ultraclaro",
    "Ultra Dark": "Ultraescuro",
    "Ultra Pale": "Ultrapálido",
    "Very Light": "Muito Claro",
    "Very Dark": "Muito Escuro",
    "Medium Very Light": "Médio Muito Claro",
    "Medium Light": "Médio Claro",
    "Medium Dark": "Médio Escuro",
    "Light": "Claro",
    "Medium": "Médio",
    "Dark": "Escuro",
    "Pale": "Pálido",
}

BASES = {
    "Salmon": "Salmão",
    "Peach": "Pêssego",
    "Coral": "Coral",
    "Coral Red": "Vermelho Coral",
    "Melon": "Melão",
    "Bright Red": "Vermelho Vivo",
    "Red": "Vermelho",
    "Garnet": "Granada",
    "Carnation": "Cravo",
    "Baby Pink": "Rosa Bebê",
    "Geranium": "Gerânio",
    "Rose": "Rosa",
    "Pink": "Rosa Pink",
    "Dusty Rose": "Rosa Envelhecido",
    "Raspberry": "Framboesa",
    "Mauve": "Malva",
    "Cranberry": "Cranberry",
    "Cyclamen Pink": "Rosa Ciclame",
    "Plum": "Ameixa",
    "Shell Pink": "Rosa Concha",
    "Antique Mauve": "Malva Antigo",
    "Antique Violet": "Violeta Antigo",
    "Grape": "Uva",
    "Lavender": "Lavanda",
    "Violet": "Violeta",
    "Blue Violet": "Azul Violeta",
    "Cornflower Blue": "Azul Centáurea",
    "Lavender Blue": "Azul Lavanda",
    "Delft Blue": "Azul Delft",
    "Royal Blue": "Azul Royal",
    "Blue": "Azul",
    "Electric Blue": "Azul Elétrico",
    "Turquoise Bright": "Turquesa Vivo",
    "Blue Gray": "Cinza Azulado",
    "Baby Blue": "Azul Bebê",
    "Navy Blue": "Azul Marinho",
    "Antique Blue": "Azul Antigo",
    "Sky Blue": "Azul Céu",
    "Wedgewood": "Azul Wedgwood",
    "Peacock Blue": "Azul Pavão",
    "Turquoise": "Turquesa",
    "Gray Green": "Verde Acinzentado",
    "Teal Green": "Verde Petróleo",
    "Sea Green": "Verde Mar",
    "Green Bright": "Verde Vivo",
    "Aquamarine": "Água-marinha",
    "Jade": "Jade",
    "Jade Green": "Verde Jade",
    "Celadon Green": "Verde Celadon",
    "Blue Green": "Azul Esverdeado",
    "Nile Green": "Verde Nilo",
    "Emerald Green": "Verde Esmeralda",
    "Pistachio Green": "Verde Pistache",
    "Forest Green": "Verde Floresta",
    "Yellow Green": "Verde Amarelado",
    "Hunter Green": "Verde Caçador",
    "Chartreuse": "Chartreuse",
    "Chartreuse Bright": "Chartreuse Vivo",
    "Kelly Green": "Verde Kelly",
    "Green": "Verde",
    "Parrot Green": "Verde Papagaio",
    "Avocado Green": "Verde Abacate",
    "Avocado Green Black": "Verde Abacate Preto",
    "Fern Green": "Verde Samambaia",
    "Green Gray": "Cinza Esverdeado",
    "Pine Green": "Verde Pinheiro",
    "Moss Green": "Verde Musgo",
    "Olive Green": "Verde Oliva",
    "Khaki Green": "Verde Cáqui",
    "Mustard": "Mostarda",
    "Golden Olive": "Oliva Dourado",
    "Drab Brown": "Marrom Fosco",
    "Yellow Beige": "Bege Amarelado",
    "Off White": "Off-White",
    "Old Gold": "Ouro Velho",
    "Hazelnut Brown": "Marrom Avelã",
    "Topaz": "Topázio",
    "Straw": "Palha",
    "Lemon": "Limão",
    "Canary Bright": "Canário Vivo",
    "Canary Deep": "Canário Intenso",
    "Golden Yellow": "Amarelo Dourado",
    "Yellow": "Amarelo",
    "Yellow Pale": "Amarelo Pálido",
    "Tangerine": "Tangerina",
    "Pumpkin": "Abóbora",
    "Burnt Orange": "Laranja Queimado",
    "Burnt Orange Bright": "Laranja Queimado Vivo",
    "Apricot": "Damasco",
    "Orange Red Bright": "Vermelho Alaranjado Vivo",
    "Tawny": "Fulvo",
    "Mahogany": "Mogno",
    "Orange Spice": "Laranja Especiaria",
    "Copper": "Cobre",
    "Red Copper": "Cobre Avermelhado",
    "Autumn Gold": "Ouro de Outono",
    "Golden Brown": "Marrom Dourado",
    "Terra Cotta": "Terracota",
    "Rosewood": "Pau-rosa",
    "Desert Sand": "Areia do Deserto",
    "Shell Gray": "Cinza Concha",
    "Cocoa": "Cacau",
    "Cream": "Creme",
    "Tan": "Camelo",
    "Brown": "Marrom",
    "Coffee Brown": "Marrom Café",
    "Black Brown": "Marrom Quase Preto",
    "Beige Brown": "Bege Amarronzado",
    "Mocha Beige": "Bege Mocha",
    "Mocha Brown": "Marrom Mocha",
    "Snow White": "Branco Neve",
    "White": "Branco",
    "Winter White": "Branco de Inverno",
    "Ecru": "Cru",
    "Beige Gray": "Bege Acinzentado",
    "Brown Gray": "Cinza Amarronzado",
    "Ash Gray": "Cinza Fumaça",
    "Beaver Gray": "Cinza Castor",
    "Pearl Gray": "Cinza Pérola",
    "Steel Gray": "Cinza Aço",
    "Pewter": "Peltre",
    "Pewter Gray": "Cinza Peltre",
    "Black": "Preto",
    "White Tin": "Branco Estanho",
    "Tin": "Estanho",
    "Driftwood": "Madeira Flutuante",
    "Tender Green": "Verde Suave",
    "Apple Green": "Verde Maçã",
    "Yellow Plum": "Ameixa Amarela",
    "Shrimp": "Camarão",
    "Alizarin": "Alizarina",
    "Apple Blossom": "Flor de Macieira",
    "White Lavender": "Lavanda Branca",
    "White Violet": "Violeta Branco",
    "Eggplant": "Berinjela",
    "Blueberry": "Mirtilo",
    "Fuschia": "Fúcsia",
}

# Names that read better translated whole than built from parts.
WHOLE = {
    "Blanc": "Branco",
    "B5200": "Branco Neve",
}


def normalize(name: str) -> str:
    for pattern, replacement in FIXES.items():
        name = re.sub(pattern, replacement, name)
    return re.sub(r"\s+", " ", name).strip()


def translate(code: str, english: str) -> str:
    if code in WHOLE:
        return WHOLE[code]
    name = normalize(english)
    if name in BASES:
        return BASES[name]
    for shade, shade_pt in SHADES.items():
        suffix = f" {shade}"
        if name.endswith(suffix):
            base = name[: -len(suffix)]
            if base in BASES:
                return f"{BASES[base]} {shade_pt}"
    raise KeyError(f"No translation for DMC {code}: {english!r}")


def main() -> None:
    catalog = json.loads((DATA / "dmc.json").read_text(encoding="utf-8"))["colors"]
    names = {item["code"]: translate(item["code"], item["name"]) for item in catalog}
    (DATA / "dmc_names_pt.json").write_text(
        json.dumps(names, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"{len(names)} names written")


if __name__ == "__main__":
    main()
