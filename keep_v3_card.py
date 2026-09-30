"""只保留 PNG 角色卡的 V3 元数据，原图和其他区块保持不变。

用法：python keep_v3_card.py
      （不带参数时打开图形界面）
      python keep_v3_card.py 角色卡.png [输出.png]
默认输出到原文件旁的「文件名-仅V3.png」，不会覆盖已有文件。
"""

import argparse
import base64
import json
import struct
from pathlib import Path


PNG_SIGNATURE = bytes.fromhex("89504e470d0a1a0a")


def inspect_card(source: Path) -> tuple[list[tuple[int, int, bytes]], int]:
    chunks: list[tuple[int, int, bytes]] = []
    removed = 0
    v3_count = 0

    with source.open("rb") as image:
        if image.read(8) != PNG_SIGNATURE:
            raise ValueError("输入文件不是 PNG。")

        while True:
            start = image.tell()
            header = image.read(8)
            if len(header) != 8:
                raise ValueError("PNG 缺少有效结尾。")
            length, kind = struct.unpack(">I4s", header)
            data_start = image.tell()
            keyword = b""

            if kind == b"tEXt":
                while image.tell() - data_start < length:
                    character = image.read(1)
                    if character == b"\0":
                        break
                    keyword += character
                else:
                    raise ValueError("PNG 文本区块无效。")

                if keyword == b"ccv3":
                    payload = image.read(length - (image.tell() - data_start))
                    try:
                        card = json.loads(base64.b64decode(payload, validate=True))
                    except (ValueError, UnicodeDecodeError) as error:
                        raise ValueError("ccv3 区块无法解析。") from error
                    if not isinstance(card, dict) or card.get("spec") != "chara_card_v3":
                        raise ValueError("ccv3 区块不是 V3 角色卡。")
                    v3_count += 1

            image.seek(data_start + length)
            if len(image.read(4)) != 4:
                raise ValueError("PNG 区块长度无效。")
            size = image.tell() - start
            if keyword == b"chara":
                removed += 1
            else:
                chunks.append((start, size, kind))

            if kind == b"IEND":
                if image.read(1):
                    raise ValueError("PNG 结尾后含有数据。")
                break

    if v3_count != 1:
        raise ValueError("PNG 必须恰好包含一个 ccv3 区块。")
    return chunks, removed


def keep_v3_card(source: Path, destination: Path) -> tuple[int, int]:
    source = source.resolve()
    destination = destination.resolve()
    if source == destination:
        raise ValueError("输出路径不能与原文件相同。")
    if destination.exists():
        raise FileExistsError("输出文件已存在，未覆盖。")

    chunks, removed = inspect_card(source)
    created = False
    try:
        with source.open("rb") as image, destination.open("xb") as output:
            created = True
            output.write(PNG_SIGNATURE)
            for start, size, _ in chunks:
                image.seek(start)
                remaining = size
                while remaining:
                    block = image.read(min(1024 * 1024, remaining))
                    if not block:
                        raise ValueError("读取 PNG 区块失败。")
                    output.write(block)
                    remaining -= len(block)
            return removed, output.tell()
    except Exception:
        if created:
            destination.unlink(missing_ok=True)
        raise


def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("角色卡仅保留 V3 元数据")
    root.resizable(False, False)

    source_text = tk.StringVar()
    destination_text = tk.StringVar()
    status_text = tk.StringVar(value="请选择 PNG 角色卡。")

    def choose_source() -> None:
        filename = filedialog.askopenfilename(
            parent=root, title="选择 PNG 角色卡", filetypes=[("PNG 图片", "*.png"), ("所有文件", "*.*")]
        )
        if filename:
            source = Path(filename)
            source_text.set(str(source))
            destination_text.set(str(source.with_name(f"{source.stem}-仅V3.png")))
            status_text.set("已选择原图，可以修改输出位置。")

    def choose_destination() -> None:
        initial = Path(destination_text.get()) if destination_text.get() else None
        filename = filedialog.asksaveasfilename(
            parent=root,
            title="选择输出位置",
            initialdir=str(initial.parent) if initial else None,
            initialfile=initial.name if initial else "仅V3.png",
            defaultextension=".png",
            filetypes=[("PNG 图片", "*.png")],
        )
        if filename:
            destination_text.set(filename)

    def process() -> None:
        source_name = source_text.get().strip()
        destination_name = destination_text.get().strip()
        if not source_name or not destination_name:
            messagebox.showerror("缺少路径", "请选择原图和输出位置。", parent=root)
            return
        try:
            removed, size = keep_v3_card(Path(source_name), Path(destination_name))
        except (OSError, ValueError) as error:
            status_text.set("处理失败。")
            messagebox.showerror("处理失败", str(error), parent=root)
            return
        status_text.set(f"处理完成：移除 {removed} 个 chara 区块，文件大小 {size} 字节。")
        messagebox.showinfo("处理完成", f"已生成：\n{destination_name}", parent=root)

    frame = ttk.Frame(root, padding=16)
    frame.grid(sticky="nsew")
    ttk.Label(frame, text="原始 PNG").grid(row=0, column=0, sticky="w", pady=6)
    ttk.Entry(frame, textvariable=source_text, width=58).grid(row=0, column=1, padx=8)
    ttk.Button(frame, text="浏览…", command=choose_source).grid(row=0, column=2)
    ttk.Label(frame, text="输出 PNG").grid(row=1, column=0, sticky="w", pady=6)
    ttk.Entry(frame, textvariable=destination_text, width=58).grid(row=1, column=1, padx=8)
    ttk.Button(frame, text="浏览…", command=choose_destination).grid(row=1, column=2)
    ttk.Label(frame, textvariable=status_text, wraplength=470).grid(row=2, column=0, columnspan=3, sticky="w", pady=12)
    ttk.Button(frame, text="生成仅 V3 角色卡", command=process).grid(row=3, column=0, columnspan=3, pady=4)
    root.mainloop()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, help="原始 PNG 角色卡")
    parser.add_argument("destination", nargs="?", type=Path, help="输出 PNG 路径")
    args = parser.parse_args()
    if args.source is None:
        run_gui()
        return
    destination = args.destination or args.source.with_name(f"{args.source.stem}-仅V3.png")
    removed, size = keep_v3_card(args.source, destination)
    print(f"已生成 {destination}；移除 {removed} 个 chara 区块，文件大小 {size} 字节。")


if __name__ == "__main__":
    main()
