"""只保留 PNG 角色卡的 V3 元数据，原图和其他区块保持不变。

用法：python keep_v3_card.py 角色卡.png [输出.png]
默认输出到原文件旁的「文件名-仅V3.png」，不会覆盖已有文件。
"""

import argparse
import base64
import json
import struct
import sys
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="原始 PNG 角色卡")
    parser.add_argument("destination", nargs="?", type=Path, help="输出 PNG 路径")
    args = parser.parse_args()
    destination = args.destination or args.source.with_name(f"{args.source.stem}-仅V3.png")
    removed, size = keep_v3_card(args.source, destination)
    print(f"已生成 {destination}；移除 {removed} 个 chara 区块，文件大小 {size} 字节。")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
