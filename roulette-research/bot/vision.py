"""ეკრანიდან წაკითხვა: ცვლილების აღმოჩენა, ნომრის OCR, ფერის ამოცნობა."""
import re

import numpy as np
from PIL import Image, ImageOps

try:
    import pytesseract
except ImportError:  # OCR-ის გარეშე მუშაობს ხელით რეჟიმი
    pytesseract = None


def signature(img: Image.Image) -> np.ndarray:
    """რეგიონის პატარა ნაცრისფერი „ანაბეჭდი“ ცვლილების აღმოსაჩენად."""
    return np.asarray(img.convert("L").resize((48, 12)), dtype=np.float32)


def changed(a, b, thr=12.0) -> bool:
    return a is None or b is None or float(np.abs(a - b).mean()) > thr


def dominant_color(img: Image.Image) -> str:
    """წითელი / შავი / მწვანე — ნომრის ფილის ფერი."""
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = ((r > 140) & (r - g > 60) & (r - b > 50)).mean()
    green = ((g > 100) & (g - r > 40) & (g - b > 20)).mean()
    if green > 0.15 and green > red:
        return "green"
    if red > 0.15:
        return "red"
    return "black"


def _prep(img: Image.Image) -> Image.Image:
    g = img.convert("L")
    g = g.resize((g.width * 3, g.height * 3), Image.LANCZOS)
    arr = np.asarray(g)
    thr = arr.mean()
    bw = Image.fromarray(((arr > thr) * 255).astype(np.uint8))
    # tesseract-ს ურჩევნია მუქი ტექსტი ღია ფონზე
    if np.asarray(bw).mean() < 128:
        bw = ImageOps.invert(bw)
    return ImageOps.expand(bw, border=20, fill=255)


def ocr_number(img: Image.Image):
    if pytesseract is None:
        return None
    txt = pytesseract.image_to_string(_prep(img), config="--psm 7 -c tessedit_char_whitelist=0123456789")
    m = re.search(r"\d{1,2}", txt)
    if not m:
        return None
    n = int(m.group())
    return n if 0 <= n <= 36 else None


def ocr_text(img: Image.Image) -> str:
    if pytesseract is None:
        return ""
    txt = pytesseract.image_to_string(_prep(img), config="--psm 7")
    return re.sub(r"[^\w\- ]", "", txt).strip()
