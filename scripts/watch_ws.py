#!/usr/bin/env python3
"""
scripts/watch_ws.py - Command-line client that prints live health updates from /ws/live.
Default: target joint (J02) rows, state changes, and one conveyor summary per lap.
Flags: --verbose, --target <ID>, --count <N>, --ascii.
"""

import sys
import json
import asyncio
import argparse
from typing import Dict, Optional
from datetime import datetime

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package not found. Please activate your virtual environment (.venv).")
    sys.exit(1)


# State format mappings: ANSI color vs ASCII plain
STATE_FORMATS_COLOR = {
    "HEALTHY": "\033[92m● HEALTHY\033[0m",
    "WATCH": "\033[93m▲ WATCH\033[0m",
    "MAINTENANCE_REQUIRED": "\033[38;5;208m◆ MAINT REQ\033[0m",
    "CRITICAL": "\033[91m🛑 CRITICAL\033[0m",
}

STATE_FORMATS_ASCII = {
    "HEALTHY": "[OK]",
    "WATCH": "[WARN]",
    "MAINTENANCE_REQUIRED": "[MAINT]",
    "CRITICAL": "[CRIT]",
}


def format_state(state_name: str, use_ascii: bool = False) -> str:
    if use_ascii or not sys.stdout.isatty():
        return STATE_FORMATS_ASCII.get(state_name, state_name)
    return STATE_FORMATS_COLOR.get(state_name, state_name)


async def watch(
    url: str,
    target: str = "J02",
    verbose: bool = False,
    count: int = 0,
    use_ascii: bool = False,
):
    print(f"\n=======================================================")
    print(f" BeltScanX AI Live WebSocket Stream Monitor")
    print(f" Target Endpoint: {url}")
    print(f" Monitored Target: {target} (Mode: {'VERBOSE - All joints' if verbose else 'FILTERED - Target & State Changes'})")
    print(f" Format: {'ASCII' if use_ascii else 'ANSI Color'}")
    print(f" Provenance: SIMULATED (DEMO DATA)")
    print(f" Press Ctrl+C to disconnect")
    print(f"=======================================================\n")

    msg_counter = 0
    joint_states: Dict[str, str] = {}

    while True:
        try:
            async with websockets.connect(url) as ws:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Connected to {url}\n")

                async for message in ws:
                    try:
                        data = json.loads(message)
                        msg_type = data.get("type", "unknown")

                        if msg_type == "connection_ack":
                            if use_ascii:
                                print(f"--> Handshake Ack: {data.get('message')} (Endpoint: {data.get('endpoint')})\n")
                            else:
                                print(f"\033[94m--> Handshake Ack: {data.get('message')} (Endpoint: {data.get('endpoint')})\033[0m\n")

                        elif msg_type == "health_update":
                            joint_id = data.get("joint_id", "")
                            health = data.get("health", 0.0)
                            state = data.get("state", "UNKNOWN")
                            lap = data.get("lap_no", 0)
                            run_id = data.get("run_id", "--")
                            rul = data.get("rul", {})
                            rul_status = rul.get("status", "UNAVAILABLE")
                            rul_reason = rul.get("reason")
                            low_days = rul.get("low_days")
                            high_days = rul.get("high_days")

                            if low_days is not None and high_days is not None:
                                rul_str = f"{rul_status} ({low_days}-{high_days}d)"
                            elif rul_reason:
                                rul_str = f"{rul_status} ({rul_reason})"
                            else:
                                rul_str = f"{rul_status}"

                            # Detect state changes across all joints
                            prev_state = joint_states.get(joint_id)
                            joint_states[joint_id] = state
                            is_state_change = (prev_state is not None and prev_state != state)

                            # Print state change notification
                            if is_state_change:
                                prev_fmt = format_state(prev_state, use_ascii)
                                curr_fmt = format_state(state, use_ascii)
                                if use_ascii:
                                    print(f"*** [STATE CHANGE] Lap {lap:02d} | Joint {joint_id}: {prev_fmt} -> {curr_fmt} (Health: {health:5.1f}%) ***")
                                else:
                                    print(f"\033[1;95m*** [STATE CHANGE] Lap {lap:02d} | Joint {joint_id}: {prev_fmt} -> {curr_fmt} (Health: {health:5.1f}%) ***\033[0m")

                            # Determine whether to print this specific row
                            should_print = verbose or (joint_id == target) or is_state_change

                            if should_print:
                                state_str = format_state(state, use_ascii)
                                prefix = ">>> [TARGET]" if joint_id == target else "   "
                                print(
                                    f"{prefix} Lap {lap:02d} | Joint {joint_id:<3} | Health: {health:5.1f}% | "
                                    f"State: {state_str:<22} | RUL: {rul_str}"
                                )

                        elif msg_type == "conveyor_summary":
                            risk_idx = data.get("conveyor_risk_index", 0.0)
                            avg_h = data.get("average_health", 0.0)
                            worst_j = data.get("worst_joint_id", "--")
                            worst_h = data.get("worst_joint_health", 0.0)
                            alerts = data.get("active_alerts_count", 0)
                            lap = data.get("lap_no", 0)

                            if use_ascii:
                                print(
                                    f"--- Conveyor Lap {lap:02d} Summary | Risk Index: {risk_idx:5.1f}% | "
                                    f"Avg Health: {avg_h:5.1f}% | Worst: {worst_j} ({worst_h:5.1f}%) | Alerts: {alerts} ---"
                                )
                            else:
                                print(
                                    f"\033[90m--- Conveyor Lap {lap:02d} Summary | Risk Index: {risk_idx:5.1f}% | "
                                    f"Avg Health: {avg_h:5.1f}% | Worst: {worst_j} ({worst_h:5.1f}%) | Alerts: {alerts} ---\033[0m"
                                )

                        elif msg_type == "alert":
                            severity = data.get("severity", "ALERT")
                            title = data.get("title", "")
                            joint = data.get("joint_id", "")
                            if use_ascii:
                                print(f"\n[ALERT FIRED] {severity} on {joint}: {title}\n")
                            else:
                                print(f"\n\033[91m[ALERT FIRED] {severity} on {joint}: {title}\033[0m\n")

                        elif msg_type == "scenario_event":
                            event_name = data.get("event", "SCENARIO_EVENT")
                            action = data.get("action", "")
                            held = data.get("critical_laps_held", 0)
                            target_j = data.get("target_joint", "")
                            if use_ascii:
                                print(f"\n=== [SCENARIO EVENT: {event_name}] Target {target_j} held Critical for {held} laps. Action: {action} ===\n")
                            else:
                                print(f"\n\033[1;96m=== [SCENARIO EVENT: {event_name}] Target {target_j} held Critical for {held} laps. Action: {action} ===\033[0m\n")

                        msg_counter += 1
                        if count > 0 and msg_counter >= count:
                            return

                    except json.JSONDecodeError:
                        print(f"Raw message: {message}")

        except (websockets.exceptions.ConnectionClosedError, ConnectionRefusedError) as e:
            print(f"Connection lost ({e}). Retrying in 2 seconds...")
            await asyncio.sleep(2)
        except asyncio.CancelledError:
            break
        except KeyboardInterrupt:
            break


def main():
    parser = argparse.ArgumentParser(description="Watch NEXVION Live WebSocket Stream")
    parser.add_argument(
        "--url",
        default="ws://127.0.0.1:8000/ws/live",
        help="WebSocket URL (default: ws://127.0.0.1:8000/ws/live)",
    )
    parser.add_argument(
        "--target",
        default="J02",
        help="Target joint to track in default filtered mode (default: J02)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print every joint on every pass instead of filtering to target and state changes",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="Number of messages to receive before exiting (0 = run indefinitely)",
    )
    parser.add_argument(
        "--ascii",
        action="store_true",
        help="Force plain ASCII symbols ([OK], [WARN], [MAINT], [CRIT]) without ANSI colors",
    )
    args = parser.parse_args()

    try:
        asyncio.run(watch(
            url=args.url,
            target=args.target,
            verbose=args.verbose,
            count=args.count,
            use_ascii=args.ascii,
        ))
    except KeyboardInterrupt:
        print("\nDisconnected from BeltScanX AI stream. Goodbye!")


if __name__ == "__main__":
    main()
