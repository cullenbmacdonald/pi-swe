#!/usr/bin/env python3
import argparse
import glob
import json
import os
from typing import Any


def latest_session_file(session_dir: str) -> str:
    files = sorted(glob.glob(os.path.join(session_dir, "*.jsonl")), key=os.path.getmtime, reverse=True)
    if not files:
        raise FileNotFoundError(f"No session files in {session_dir}")
    return files[0]


def safe_int(value: Any) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except Exception:
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Check Pi session cache usage for model/provider.")
    parser.add_argument("--session-dir", default=os.path.expanduser("~/.pi/agent/sessions/--Users-cmacdonald-dev-pi-swe--"))
    parser.add_argument("--model-substr", default="gpt-5.3-codex", help="Case-insensitive substring match")
    parser.add_argument("--provider", default=None, help="Optional provider exact match")
    parser.add_argument("--api", default=None, help="Optional api exact match")
    parser.add_argument("--tail", type=int, default=8, help="How many matching rows to print")
    args = parser.parse_args()

    session_file = latest_session_file(args.session_dir)
    rows = []

    with open(session_file, "r", encoding="utf-8") as f:
        for line in f:
            try:
                evt = json.loads(line)
            except Exception:
                continue

            msg = evt.get("message", {})
            if msg.get("role") != "assistant":
                continue

            model = (msg.get("model") or "")
            provider = msg.get("provider")
            api = msg.get("api")

            if args.model_substr.lower() not in model.lower():
                continue
            if args.provider and provider != args.provider:
                continue
            if args.api and api != args.api:
                continue

            usage = msg.get("usage") or {}
            rows.append(
                {
                    "ts": evt.get("timestamp"),
                    "provider": provider,
                    "api": api,
                    "model": model,
                    "input": safe_int(usage.get("input")),
                    "output": safe_int(usage.get("output")),
                    "cacheRead": safe_int(usage.get("cacheRead")),
                    "cacheWrite": safe_int(usage.get("cacheWrite")),
                }
            )

    print(f"latest session: {os.path.basename(session_file)}")
    print(f"matching assistant turns: {len(rows)}")
    for row in rows[-args.tail :]:
        print(row)

    any_cache = any(r["cacheRead"] > 0 or r["cacheWrite"] > 0 for r in rows)
    print(f"any_cache_activity={any_cache}")
    if rows:
        last = rows[-1]
        print(
            f"latest_cache_read={last['cacheRead']} latest_cache_write={last['cacheWrite']} latest_input={last['input']} latest_output={last['output']}"
        )


if __name__ == "__main__":
    main()
