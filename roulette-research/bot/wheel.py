"""ბორბლის ვიდეოანალიზი: მიმართულება, სიჩქარე, ბურთის გაშვება და გაშვების უჯრა.

იდეა: ბორბლის რეგიონს „ვშლით“ პოლარულ კოორდინატებში (კუთხე × რადიუსი).
  • უჯრების რგოლი (pocket ring) — ორი კადრის შედარებით ვიგებთ, რამდენით და
    რა მიმართულებით შებრუნდა ბორბალი; მწვანე 0 გვაძლევს ბორბლის ზუსტ კუთხეს.
  • ბურთის ბილიკი (ball track) — თეთრი ბურთის კუთხე. როცა ბურთი ბილიკზე
    გამოჩნდება და სწრაფად მოძრაობს → გაშვება. იმ წამს ბურთის ქვეშ მყოფი
    უჯრა = გაშვების უჯრა (release_number).

კონფიგურაცია (config.json → "wheel_geom"), წილები ბორბლის რადიუსიდან:
  pocket_r: [0.55, 0.75]   ball_r: [0.80, 0.95]   center: [0.5, 0.5]   mirror: false
`python wheel.py preview` — ხატავს რგოლებს wheel_preview.png-ზე, რომ სწორად მოარგო.
"""
import json
import math
import threading
import time

import numpy as np

from common import POS, WHEEL

N_ANG = 720  # კუთხის ბიჯი 0.5°
POCKET = 360 / 37

DEFAULT_GEOM = {"pocket_r": [0.55, 0.75], "ball_r": [0.80, 0.95], "center": [0.5, 0.5], "mirror": False}


class Polar:
    """ელიფსური რეგიონის პოლარული ამონარიდი (ირიბი კამერისთვის ელიფსი)."""

    def __init__(self, w, h, geom):
        self.w, self.h, self.g = w, h, {**DEFAULT_GEOM, **(geom or {})}
        cx, cy = self.g["center"][0] * w, self.g["center"][1] * h
        th = np.deg2rad(np.arange(N_ANG) * 360 / N_ANG)

        def grid(r0, r1, n=6):
            rs = np.linspace(r0, r1, n)
            x = cx + np.outer(np.cos(th), rs) * w / 2
            y = cy - np.outer(np.sin(th), rs) * h / 2
            return np.clip(y.round().astype(int), 0, h - 1), np.clip(x.round().astype(int), 0, w - 1)

        self.pocket = grid(*self.g["pocket_r"])
        self.ball = grid(*self.g["ball_r"])

    def sample(self, arr, which):
        yy, xx = getattr(self, which)
        return arr[yy, xx].astype(np.float32)  # N_ANG × n × 3


def _shift(a, b):
    """რამდენი კუთხის ბიჯით არის a ჩამოცურებული b-სთან შედარებით (წრიული კორელაცია)."""
    a, b = a - a.mean(), b - b.mean()
    c = np.fft.ifft(np.fft.fft(a) * np.conj(np.fft.fft(b))).real
    s = int(c.argmax())
    return s - N_ANG if s > N_ANG // 2 else s


class WheelTracker:
    def __init__(self, geom=None, ball_thr=60.0, launch_speed=150.0):
        self.geom, self.ball_thr, self.launch_speed = geom, ball_thr, launch_speed
        self.polar = None
        self.prev_prof = self.prev_t = None
        self.rotor_speed = 0.0  # °/წმ, მათემატიკური ნიშნით (+ = საათის ისრის საწინააღმდეგოდ ეკრანზე)
        self.zero_angle = None
        self.ball_hist = []  # [(t, angle)] ბოლო კადრები, როცა ბურთი ბილიკზეა
        self.absent = 0
        self.launched = False
        self.last_launch = None  # dict: t, release_number, rotor_speed, direction
        self.frames = 0
        self.lock = threading.Lock()

    @property
    def direction(self):
        if abs(self.rotor_speed) < 5:
            return ""
        cw = self.rotor_speed < 0
        if self.polar and self.polar.g["mirror"]:
            cw = not cw
        return "cw" if cw else "ccw"

    def pocket_at(self, angle, zero):
        if zero is None:
            return None
        rel = (zero - angle) % 360  # WHEEL საათის ისრის მიმართულებითაა ჩამოწერილი
        if self.polar.g["mirror"]:
            rel = (angle - zero) % 360
        return WHEEL[int(round(rel / POCKET)) % 37]

    def update(self, arr, t):
        """arr: H×W×3 uint8 კადრი ბორბლის რეგიონიდან, t: დრო წამებში."""
        if self.polar is None or (self.polar.w, self.polar.h) != (arr.shape[1], arr.shape[0]):
            self.polar = Polar(arr.shape[1], arr.shape[0], self.geom)
        self.frames += 1
        P = self.polar.sample(arr, "pocket")
        r, g, b = P[..., 0].mean(1), P[..., 1].mean(1), P[..., 2].mean(1)
        prof = np.concatenate([r - (g + b) / 2, g - (r + b) / 2])  # წითელი + მწვანე პროფილი
        prof = prof[:N_ANG] + 2 * prof[N_ANG:]
        green = g - (r + b) / 2
        if green.max() > 25:
            k = int(green.argmax())
            # მწვანე უჯრის ცენტრი: წონითი საშუალო მაქსიმუმის გარშემო
            idx = np.arange(k - 10, k + 11) % N_ANG
            wts = np.clip(green[idx], 0, None)
            self.zero_angle = (k + (wts * (np.arange(-10, 11))).sum() / (wts.sum() + 1e-9)) * 360 / N_ANG % 360
        if self.prev_prof is not None and t > self.prev_t:
            s = _shift(prof, self.prev_prof) * 360 / N_ANG
            sp = s / (t - self.prev_t)
            self.rotor_speed = sp if self.frames < 4 else 0.7 * self.rotor_speed + 0.3 * sp
        self.prev_prof, self.prev_t = prof, t

        B = self.polar.sample(arr, "ball").min(2).max(1)  # თეთრი = ყველა არხი მაღალი
        bg = np.median(B)
        k = int(B.argmax())
        present = B[k] - bg > self.ball_thr
        if present:
            # ბურთის ცენტრი: წონითი საშუალო პიკის გარშემო (არა უბრალოდ მაქსიმუმი)
            idx = np.arange(k - 12, k + 13) % N_ANG
            wts = np.clip(B[idx] - bg - self.ball_thr / 2, 0, None)
            ang = (k + (wts * np.arange(-12, 13)).sum() / (wts.sum() + 1e-9)) * 360 / N_ANG % 360
            self.ball_hist = (self.ball_hist + [(t, ang, self.zero_angle)])[-5:]
            self.absent = 0
            if not self.launched and len(self.ball_hist) >= 2:
                (t0, a0, _), (t1, a1, _) = self.ball_hist[-2:]
                d = (a1 - a0 + 180) % 360 - 180
                if t1 > t0 and abs(d / (t1 - t0)) > self.launch_speed:
                    self.launched = True
                    t_l, a_l, z_l = self.ball_hist[0] if len(self.ball_hist) <= 3 else self.ball_hist[-2]
                    with self.lock:
                        self.last_launch = dict(t=t_l, release_number=self.pocket_at(a_l, z_l),
                                                rotor_speed=round(abs(self.rotor_speed), 1),
                                                direction=self.direction, ball_speed=round(float(abs(d / (t1 - t0))), 1))
        else:
            self.absent += 1
            if self.absent >= 5:  # ბურთი ბილიკიდან წავიდა (ჩავარდა უჯრაში) → შემდეგი გაშვებისთვის მზადაა
                self.launched = False
                self.ball_hist = []

    def pop_launch(self):
        with self.lock:
            x, self.last_launch = self.last_launch, None
            return x


def run_thread(region, geom, fps=15):
    """ტრეკერი ცალკე ნაკადში — ეკრანიდან ბორბლის რეგიონს იღებს fps სიხშირით."""
    tr = WheelTracker(geom)

    def loop():
        import mss
        x, y, w, h = region
        with mss.mss() as sct:
            while True:
                t = time.time()
                s = sct.grab({"left": x, "top": y, "width": w, "height": h})
                arr = np.frombuffer(s.bgra, np.uint8).reshape(s.height, s.width, 4)[..., [2, 1, 0]]
                tr.update(arr, t)
                time.sleep(max(0, 1 / fps - (time.time() - t)))

    threading.Thread(target=loop, daemon=True).start()
    return tr


# ---------------------------------------------------------------- სინთეტიკური ბორბალი (ტესტისთვის)
def render(size, zero_angle, ball_angle=None, geom=None):
    g = {**DEFAULT_GEOM, **(geom or {})}
    yy, xx = np.mgrid[0:size, 0:size]
    cx = cy = size / 2
    dx, dy = (xx - cx) / (size / 2), -(yy - cy) / (size / 2)
    r = np.hypot(dx, dy)
    th = np.degrees(np.arctan2(dy, dx)) % 360
    img = np.full((size, size, 3), 40, np.uint8)
    ring = (r >= g["pocket_r"][0] - 0.05) & (r <= g["pocket_r"][1] + 0.05)
    idx = (np.round(((zero_angle - th) % 360) / POCKET).astype(int)) % 37
    num = np.array(WHEEL)[idx]
    red = np.isin(num, [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
    col = np.where(num[..., None] == 0, [20, 160, 60], np.where(red[..., None], [190, 20, 30], [25, 25, 25]))
    img[ring] = col[ring]
    track = (r >= g["ball_r"][0] - 0.03) & (r <= g["ball_r"][1] + 0.03)
    img[track] = [110, 95, 70]
    if ball_angle is not None:
        br = np.mean(g["ball_r"])
        bx, by = cx + br * math.cos(math.radians(ball_angle)) * size / 2, cy - br * math.sin(math.radians(ball_angle)) * size / 2
        img[(xx - bx) ** 2 + (yy - by) ** 2 <= (size * 0.025) ** 2] = [245, 245, 245]
    return img


def _self_test():
    rng = np.random.default_rng(0)
    ok = near = dir_ok = 0
    trials = 40
    for trial in range(trials):
        cw = trial % 2 == 0
        omega = (-1 if cw else 1) * rng.uniform(90, 200)  # ბორბალი °/წმ
        z0, launch_t, ball0 = rng.uniform(0, 360), 1.0, rng.uniform(0, 360)
        tr = WheelTracker()
        fps, t = 15, 0.0
        while t < 3.0:
            z = (z0 + omega * t) % 360
            ball = None
            if t >= launch_t:
                ball = (ball0 - np.sign(omega) * 700 * (t - launch_t)) % 360  # ბურთი საპირისპიროდ
            frame = render(200, z, ball).astype(np.int16) + rng.integers(-8, 9, (200, 200, 3))
            tr.update(np.clip(frame, 0, 255).astype(np.uint8), t)
            t += 1 / fps
        L = tr.pop_launch()
        # მოსალოდნელი: პირველ კადრში, სადაც ბურთი ჩანს, მის ქვეშ მყოფი უჯრა
        tl = L["t"] if L else launch_t
        z_l = (z0 + omega * tl) % 360
        b_l = (ball0 - np.sign(omega) * 700 * (tl - launch_t)) % 360
        exp = WHEEL[int(round(((z_l - b_l) % 360) / POCKET)) % 37]
        if not L:
            continue
        dir_ok += L["direction"] == ("cw" if cw else "ccw")
        diff = (POS[L["release_number"]] - POS[exp] + 18) % 37 - 18 if L["release_number"] is not None else 99
        ok += diff == 0
        near += abs(diff) <= 1
    print(f"მიმართულება: {dir_ok}/{trials} | გაშვების უჯრა ზუსტად: {ok}/{trials} | ±1 უჯრით: {near}/{trials}")


def _preview():
    import mss
    from PIL import Image, ImageDraw
    cfg = json.load(open("config.json", encoding="utf-8"))
    x, y, w, h = cfg["regions"]["wheel"]
    g = {**DEFAULT_GEOM, **cfg.get("wheel_geom", {})}
    with mss.mss() as sct:
        s = sct.grab({"left": x, "top": y, "width": w, "height": h})
    img = Image.frombytes("RGB", s.size, s.bgra, "raw", "BGRX")
    d = ImageDraw.Draw(img)
    w, h = img.size  # Mac Retina-ზე სურათი რეგიონზე 2×-ით დიდია
    cx, cy = g["center"][0] * w, g["center"][1] * h
    for r, c in [(g["pocket_r"][0], "lime"), (g["pocket_r"][1], "lime"), (g["ball_r"][0], "cyan"), (g["ball_r"][1], "cyan")]:
        d.ellipse([cx - r * w / 2, cy - r * h / 2, cx + r * w / 2, cy + r * h / 2], outline=c, width=2)
    img.save("wheel_preview.png")
    print("wheel_preview.png — მწვანე რგოლები უჯრებზე უნდა იყოს, ცისფერი ბურთის ბილიკზე. "
          "საჭიროებისას შეცვალე config.json → wheel_geom.")


if __name__ == "__main__":
    import sys
    _preview() if len(sys.argv) > 1 and sys.argv[1] == "preview" else _self_test()
