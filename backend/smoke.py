"""Exercise a real experiment without starting the web server."""
import argparse
import json
from time import perf_counter
from . import game, neural


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["demo", "flywire"], default="demo")
    parser.add_argument("--issue", choices=game.ISSUES, default="water")
    parser.add_argument("--focus", choices=game.FOCUSES, default="neutral")
    args = parser.parse_args()
    if args.mode == "flywire" and (why := neural.unavailable()):
        parser.exit(1, why+"\n")
    issue, state = game.ISSUES[args.issue], game.State()
    rates = game.encode(issue, state, args.focus)
    start = perf_counter()
    scored_window = None
    for event in neural.simulate(args.mode, rates):
        if event["type"] == "ready":
            scored_window = event["score_until"]
            print(json.dumps(event), flush=True)
        elif event["elapsed"] == neural.DURATION:
            print(json.dumps({key: value for key, value in event.items() if key != "events"} | {
                 "scored_window_ms": scored_window, "rates_hz": rates,
                 "ruling": game.resolve(state, issue, event["counts"])["ruling"]["title"],
                 "wall_seconds": round(perf_counter()-start, 2)}, ensure_ascii=True), flush=True)


if __name__ == "__main__":
    main()
