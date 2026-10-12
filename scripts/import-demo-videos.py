#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 public/videos 下的真人演示视频接入 plan.json。

用法（在本机、有网络/有视频文件时运行）：
  python scripts/import-demo-videos.py            # 扫描并写入 plan.json 的 video 字段
  python scripts/import-demo-videos.py --check     # 只报告覆盖情况，不写文件
  python scripts/import-demo-videos.py --optimize  # 写入前先用 ffmpeg 把视频压到 480p/6s 以内

约定：
  - 视频文件名 = 动作 id（见 plan.json 的 item.id），如 hip-hinge-drill.mp4
  - 支持的扩展名：.mp4 .webm .mov
  - 写入 plan.json 的字段： "video": "./videos/<文件名>"
  - 没有对应视频的动作会被列入「待补录清单」并打印/写出 RECORDING_SPEC.md

注意：本脚本只负责「接入」，不负责找素材。免费可再分发授权不足，
请自行录制或取得授权清晰的片段后放入 public/videos。
"""
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS_DIR = os.path.join(ROOT, "public", "videos")
PLAN_PATH = os.path.join(ROOT, "public", "plan.json")
SPEC_PATH = os.path.join(ROOT, "RECORDING_SPEC.md")
EXTS = (".mp4", ".webm", ".mov")


def walk_items(o, out):
    if isinstance(o, dict):
        if "id" in o and ("name" in o or "video" in o or "title" in o):
            out.append(o)
        for v in o.values():
            walk_items(v, out)
    elif isinstance(o, list):
        for v in o:
            walk_items(v, out)


def unique_ids(items):
    seen = {}
    for it in items:
        iid = it.get("id")
        if iid and iid not in seen:
            seen[iid] = it.get("name") or it.get("title") or iid
    return seen


def optimize(src):
    """用 ffmpeg 压到 480p、最长 6s、H.264，返回新路径；失败返回原路径。"""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        alt = r"C:\Users\LENOVO\.workbuddy\binaries\ffmpeg\bin\ffmpeg.exe"
        ffmpeg = alt if os.path.exists(alt) else None
    if not ffmpeg:
        print("  [跳过压缩] 未找到 ffmpeg")
        return src
    base, _ = os.path.splitext(src)
    dst = base + ".mp4"
    if dst == src:
        dst = base + ".opt.mp4"
    cmd = [
        ffmpeg, "-y", "-i", src,
        "-vf", "scale='min(480,iw)':-2", "-t", "6",
        "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
        "-an", "-movflags", "+faststart", dst,
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(dst) and os.path.getsize(dst) > 0:
            return dst
    except Exception as e:
        print("  [压缩失败]", e)
    return src


def main():
    check_only = "--check" in sys.argv
    do_opt = "--optimize" in sys.argv

    files = [f for f in os.listdir(VIDEOS_DIR) if f.lower().endswith(EXTS)] if os.path.isdir(VIDEOS_DIR) else []
    file_by_id = {}
    for f in files:
        stem = os.path.splitext(f)[0]
        file_by_id[stem] = f

    plan = json.load(open(PLAN_PATH, encoding="utf-8"))
    items = []
    walk_items(plan, items)
    ids = unique_ids(items)

    covered = []
    missing = []
    for iid, name in ids.items():
        if iid in file_by_id:
            fn = file_by_id[iid]
            src = os.path.join(VIDEOS_DIR, fn)
            rel = "./videos/" + fn
            if do_opt:
                new = optimize(src)
                if new != src:
                    rel = "./videos/" + os.path.basename(new)
            # 写入所有同名 item
            for it in items:
                if it.get("id") == iid:
                    it["video"] = rel
            covered.append((iid, name, rel))
        else:
            missing.append((iid, name))

    print("\n=== 已接入（真人视频）===")
    for iid, name, rel in covered:
        print(f"  [OK] {iid}  {name}  -> {rel}")
    print("\n=== 待补录（无视频，当前回退为极简线条）===")
    for iid, name in missing:
        print(f"  [ ] {iid}  {name}  建议文件名: {iid}.mp4")

    if not check_only:
        json.dump(plan, open(PLAN_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"\n已写回 plan.json（覆盖 {len(covered)} 个动作）")

    # 写出录制清单（始终更新，便于手机对照）
    lines = ["# 真人演示视频 · 待补录清单", "",
             "> 把对应文件命名为 `<动作id>.mp4` 放入 `public/videos/`，再运行：",
             "> `python scripts/import-demo-videos.py`", "",
             "## 录制要点",
             "- 机位：侧方 45°，全身入镜，背景干净",
             "- 时长：2–4 秒一个循环（起→终→起）",
             "- 画质：720p 即可，横屏；穿与背景反差的衣服",
             "- 授权：自行录制 = 零版权，可离线打包", "",
             "## 待补动作", ""]
    for iid, name in missing:
        lines.append(f"- [ ] `{iid}.mp4` —— {name}")
    if not missing:
        lines.append("- 已全部覆盖 ✅")
    open(SPEC_PATH, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"录制清单已写出：{os.path.relpath(SPEC_PATH, ROOT)}")


if __name__ == "__main__":
    main()
