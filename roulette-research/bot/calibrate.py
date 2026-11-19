"""ეკრანის რეგიონების მონიშვნა მაუსით.

  python calibrate.py

1. გახსენი კაზინოს მაგიდა ეკრანზე (ისე, როგორც თამაშისას იქნება).
2. გაუშვი ეს სკრიპტი — 3 წამში გადაიღებს ეკრანს.
3. თითოეული რეგიონისთვის მაუსით მონიშნე მართკუთხედი და დააჭირე Enter.
   s = გამოტოვება (მხოლოდ არასავალდებულოზე), r = თავიდან მონიშვნა.
შედეგი: config.json და calib_preview.png (შესამოწმებლად).
"""
import json
import time
import tkinter as tk

import mss
from PIL import Image, ImageDraw, ImageTk

REGIONS = [
    ("history", True, "ისტორიის ზოლი — ბოლო ნომრების მთელი რიგი (ახალი სპინის აღმოსაჩენად)"),
    ("last_number", True, "ყველაზე ბოლო ნომერი ისტორიის ზოლში (მხოლოდ ერთი ფილა)"),
    ("dealer", False, "დილერის სახელი"),
    ("wheel", False, "ბორბალი ვიდეოში (მომავალი ვიდეოანალიზისთვის)"),
]


def main():
    print("3 წამში გადავიღებ ეკრანს — გადადი კაზინოს ფანჯარაზე...")
    time.sleep(3)
    with mss.mss() as sct:
        mon = sct.monitors[1]
        shot = sct.grab(mon)
        img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")

    root = tk.Tk()
    root.title("რეგიონების მონიშვნა")
    scale = min(1, (root.winfo_screenwidth() - 80) / img.width, (root.winfo_screenheight() - 160) / img.height)
    view = img.resize((int(img.width * scale), int(img.height * scale)))
    tkimg = ImageTk.PhotoImage(view)
    label = tk.Label(root, font=("Arial", 13), fg="#b00")
    label.pack()
    cv = tk.Canvas(root, width=view.width, height=view.height, cursor="cross")
    cv.pack()
    cv.create_image(0, 0, anchor="nw", image=tkimg)

    result, state = {}, {"i": 0, "start": None, "rect": None, "box": None}

    def prompt():
        if state["i"] >= len(REGIONS):
            finish()
            return
        name, req, desc = REGIONS[state["i"]]
        label.config(text=f"[{state['i']+1}/{len(REGIONS)}] {desc}  —  Enter = დადასტურება"
                          + ("" if req else ", s = გამოტოვება") + ", r = თავიდან")

    def down(e):
        state["start"] = (e.x, e.y)
        if state["rect"]:
            cv.delete(state["rect"])
        state["rect"] = cv.create_rectangle(e.x, e.y, e.x, e.y, outline="red", width=2)

    def drag(e):
        x0, y0 = state["start"]
        cv.coords(state["rect"], x0, y0, e.x, e.y)
        state["box"] = (min(x0, e.x), min(y0, e.y), abs(e.x - x0), abs(e.y - y0))

    def confirm(_=None):
        if not state["box"] or state["box"][2] < 4 or state["box"][3] < 4:
            return
        x, y, w, h = state["box"]
        name = REGIONS[state["i"]][0]
        result[name] = [int(x / scale) + mon["left"], int(y / scale) + mon["top"], int(w / scale), int(h / scale)]
        cv.itemconfig(state["rect"], outline="lime")
        cv.create_text(x + 4, y - 8, text=name, anchor="w", fill="lime", font=("Arial", 11, "bold"))
        state.update(rect=None, box=None, i=state["i"] + 1)
        prompt()

    def skip(_=None):
        if not REGIONS[state["i"]][1]:
            state["i"] += 1
            prompt()

    def redo(_=None):
        if state["rect"]:
            cv.delete(state["rect"])
        state.update(rect=None, box=None)

    def finish():
        with open("config.json", "w", encoding="utf-8") as f:
            json.dump({"regions": result}, f, ensure_ascii=False, indent=2)
        prev = img.copy()
        d = ImageDraw.Draw(prev)
        for n, (x, y, w, h) in result.items():
            x -= mon["left"]; y -= mon["top"]
            d.rectangle([x, y, x + w, y + h], outline=(0, 255, 0), width=3)
            d.text((x + 3, y - 14), n, fill=(0, 255, 0))
        prev.save("calib_preview.png")
        print("შენახულია: config.json, calib_preview.png")
        root.destroy()

    cv.bind("<ButtonPress-1>", down)
    cv.bind("<B1-Motion>", drag)
    root.bind("<Return>", confirm)
    root.bind("s", skip)
    root.bind("r", redo)
    prompt()
    root.mainloop()


if __name__ == "__main__":
    main()
