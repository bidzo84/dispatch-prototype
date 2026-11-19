"""საერთო: ბორბლის წყობა, ფერები, მანძილები, მონაცემების ჩატვირთვა."""
import csv
import os

# ევროპული ბორბლის თანმიმდევრობა (საათის ისრის მიმართულებით)
WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
         5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
POS = {n: i for i, n in enumerate(WHEEL)}
RED = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}

FIELDS = ["timestamp", "table", "dealer", "session_id", "spin_in_session",
          "number", "color", "direction", "ocr_ok"]


def color(n: int) -> str:
    if n == 0:
        return "green"
    return "red" if n in RED else "black"


def distance(prev: int, cur: int, direction: str = "") -> int:
    """მანძილი ბორბალზე (უჯრებში, 0..36) წინა ნომრიდან მიმდინარემდე.
    თუ მიმართულება 'ccw'-ია, ვითვლით საპირისპიროდ, რომ სხვადასხვა
    მიმართულების სპინები ერთ სკალაზე შედარდეს."""
    d = (POS[cur] - POS[prev]) % 37
    return (-d) % 37 if direction == "ccw" else d


def sector_numbers(center_number: int, offset: int, k: int, direction: str = "") -> list:
    """k ნომერი ბორბალზე, ცენტრით `center_number`-დან `offset` უჯრაზე."""
    sign = -1 if direction == "ccw" else 1
    c = (POS[center_number] + sign * offset) % 37
    half = k // 2
    return [WHEEL[(c + i) % 37] for i in range(-half, -half + k)]


def load_spins(path: str) -> list:
    if not os.path.exists(path):
        return []
    out = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                r["number"] = int(r["number"])
            except (ValueError, KeyError):
                continue
            r["spin_in_session"] = int(r.get("spin_in_session") or 0)
            out.append(r)
    return out


def append_spin(path: str, row: dict) -> None:
    new = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in FIELDS})
