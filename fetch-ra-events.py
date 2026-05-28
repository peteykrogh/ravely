#!/usr/bin/env python3
"""
fetch-ra-events.py
------------------
Fetches upcoming Copenhagen rave events from the Resident Advisor GraphQL API
and writes them to ra-events.json, which events.js reads at runtime.

Usage:
    python3 fetch-ra-events.py

Run this whenever you want to refresh the event data.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta

RA_GRAPHQL = "https://ra.co/graphql"
AREA_ID    = 402          # Copenhagen on RA
PAGE_SIZE  = 50           # events per page
MONTHS_AHD = 6           # how far ahead to look
OUTPUT     = "ra-events.json"

def fetch_events(start: str, end: str, page: int = 1) -> list:
    query = """
    {
      eventListings(
        filters: {
          areas: { eq: %d }
          listingDate: { gte: "%s", lte: "%s" }
        }
        pageSize: %d
        page: %d
      ) {
        data {
          id
          event {
            id
            title
            date
            startTime
            endTime
            contentUrl
            status
            venue { name }
            artists { name }
            flyerFront
          }
        }
      }
    }
    """ % (AREA_ID, start, end, PAGE_SIZE, page)

    payload = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        RA_GRAPHQL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Referer":       "https://ra.co/events/dk",
            "User-Agent":    "Mozilla/5.0",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read())

    return body["data"]["eventListings"]["data"]


def parse_time(time_str: str) -> str:
    """Extract HH:MM from an ISO datetime string, e.g. '2026-05-28T23:00:00.000Z' → '23:00'."""
    if not time_str:
        return ""
    # Handle both "HH:MM" and full ISO "…THH:MM…"
    t = time_str[11:16] if "T" in time_str else time_str[:5]
    return t if len(t) == 5 else ""


def map_event(item: dict) -> dict:
    e = item["event"]
    date_str = e["date"][:10]   # "2026-05-28T…" → "2026-05-28"
    artists  = [a["name"] for a in (e.get("artists") or [])]
    venue    = (e.get("venue") or {}).get("name") or "Copenhagen"
    return {
        "id":        "ra-" + e["id"],
        "date":      date_str,
        "startTime": parse_time(e.get("startTime", "")),
        "endTime":   parse_time(e.get("endTime", "")),
        "title":     e["title"],
        "venue":     venue + ", Copenhagen",
        "lineup":    artists,
        "tickets":   "https://ra.co" + e["contentUrl"],
        "soldOut":   e.get("status") == "SOLD_OUT",
        "flyer":     e.get("flyerFront"),
    }


def main():
    today    = datetime.now()
    end_date = today + timedelta(days=MONTHS_AHD * 30)
    start    = today.strftime("%Y-%m-%d")
    end      = end_date.strftime("%Y-%m-%d")

    print(f"Fetching Copenhagen events from {start} to {end} …")

    all_raw = []
    page = 1
    try:
        while True:
            print(f"  page {page} …", end=" ", flush=True)
            batch = fetch_events(start, end, page)
            if not batch:
                print("done")
                break
            all_raw.extend(batch)
            print(f"{len(batch)} events")
            if len(batch) < PAGE_SIZE:
                break
            page += 1
    except urllib.error.URLError as exc:
        print(f"ERROR: {exc}")
        return

    events = [map_event(item) for item in all_raw]

    # Sort ascending by date
    events.sort(key=lambda e: e["date"])

    output = {
        "fetched": today.isoformat(timespec="seconds"),
        "area":    "Copenhagen, Denmark",
        "source":  "https://ra.co/events/dk",
        "events":  events,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(events)} events → {OUTPUT}")


if __name__ == "__main__":
    main()
