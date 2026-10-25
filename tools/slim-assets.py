"""Make light copies of the heavy brand assets for the website.

Run from the repo root:  python3 tools/slim-assets.py

The originals in assets/ stay untouched. This writes:
  site/assets/runner-cream.svg   animated runner: every other frame and point, whole pixels
  site/assets/rose-bloom.svg     animated rose: every 4th keyframe step, 2 decimals
  site/assets/fonts/hv-smegs.otf HV Smegs 1 subset to the few characters the site sets
"""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
REDUCED = "@media (prefers-reduced-motion: reduce){.p{animation:none!important}}"


def r2(m):
    t = f"{float(m.group(0)):.2f}".rstrip("0").rstrip(".")
    return "0" if t in ("-0", "") else t


def slim_runner():
    s = (ROOT / "assets" / "runner-logo-animated.svg").read_text()
    s = s.replace("#1c1b1a", "#E1DDD1")

    def thin_path(d):
        # keep the move-to and every other line-to so every frame keeps the same structure
        pts = re.findall(r"([ML])([-\d.]+) ([-\d.]+)", d)
        kept = [p for i, p in enumerate(pts) if i == 0 or i % 2 == 0 or i == len(pts) - 1]
        return "".join(f"{c}{round(float(x))} {round(float(y))}" for c, x, y in kept) + ("Z" if d.strip().endswith("Z") else "")

    def thin_values(m):
        frames = m.group(1).split(";")
        keep = frames[::2]
        if frames[-1] != keep[-1]:
            keep.append(frames[-1])
        return 'values="' + ";".join(thin_path(f) for f in keep) + '"'

    s = re.sub(r'values="([^"]*)"', thin_values, s)
    s = re.sub(r'(<path[^>]* d=")([^"]*)(")', lambda m: m.group(1) + thin_path(m.group(2)) + m.group(3), s)
    s = s.replace("<style>", "<style>" + REDUCED, 1)
    s = re.sub(r"\s*\n\s*", " ", s)
    (ROOT / "site" / "assets" / "runner-cream.svg").write_text(s)
    return len(s)


def slim_rose():
    s = (ROOT / "assets" / "rose-bloom-animated.svg").read_text()

    def thin_keyframes(m):
        name, body = m.group(1), m.group(2)
        steps = re.findall(r"([\d.]+%)\{([^}]*)\}", body)
        keep = [st for i, st in enumerate(steps) if i % 4 == 0 or i == len(steps) - 1]
        return "@keyframes " + name + "{" + "".join(f"{p}{{{v}}}" for p, v in keep) + "}"

    s = re.sub(r"@keyframes ([\w-]+)\{((?:[\d.]+%\{[^}]*\})+)\}", thin_keyframes, s)
    s = re.sub(r"-?\d+\.\d{3,}", r2, s)
    s = s.replace("<style>", "<style>" + REDUCED, 1)
    s = re.sub(r"\s*\n\s*", " ", s)
    (ROOT / "site" / "assets" / "rose-bloom.svg").write_text(s)
    return len(s)


def subset_font():
    out = ROOT / "site" / "assets" / "fonts" / "hv-smegs.otf"
    subprocess.run(["pyftsubset", str(ROOT / "assets" / "fonts" / "HV-Smegs-Style-1.otf"),
                    "--text=@*?!<3()", "--output-file=" + str(out)], check=True)
    return out.stat().st_size


if __name__ == "__main__":
    print("runner", slim_runner(), "bytes")
    print("rose", slim_rose(), "bytes")
    print("font", subset_font(), "bytes")
