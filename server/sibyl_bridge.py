#!/usr/bin/env python3
"""
Sibyl Memory Bridge for Day Orchestrator - Sibyl.
Provides a clean CLI/JSON interface for Node.js to interact with the real,
official sibyl-memory-client (SQLite + FTS5 persistent memory).
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Ensure sibyl-memory-client is imported
try:
    from sibyl_memory_client import MemoryClient
except ImportError:
    print(json.dumps({
        "error": "sibyl-memory-client is not installed in the Python environment",
        "connected": False
    }))
    sys.exit(1)

# Default database location inside applet data directory
DEFAULT_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DEFAULT_DB_DIR, exist_ok=True)
DEFAULT_DB_PATH = os.getenv("SIBYL_MEMORY_DB_PATH", os.path.join(DEFAULT_DB_DIR, "sibyl_memory.db"))


def get_client(db_path: str = DEFAULT_DB_PATH) -> MemoryClient:
    return MemoryClient.local(os.path.abspath(db_path))


def cmd_status(client: MemoryClient, db_path: str):
    try:
        schema_ver = client.schema_version()
        entities = client.list_entities("workload_patterns")
        events = client.read_events(limit=20)
        has_session_a = any(e.get("name") == "high_stakes_meeting_prep" for e in entities)
        
        print(json.dumps({
            "connected": True,
            "engine": "sibyl-memory-client (SQLite + FTS5)",
            "schemaVersion": schema_ver,
            "dbPath": db_path,
            "entityCount": len(entities),
            "journalEventCount": len(events),
            "hasSessionAMemory": has_session_a,
            "recentEntities": entities[:5],
            "recentJournalEvents": events[:5]
        }))
    except Exception as e:
        print(json.dumps({
            "connected": False,
            "error": str(e),
            "dbPath": db_path
        }))
        sys.exit(1)


def cmd_record_session_a(client: MemoryClient):
    """
    Stores the consequential learning from Session A:
    - User had an overpacked schedule before the 1:00 PM Leadership Meeting
    - Prep time was interrupted and inadequate (only 10 mins)
    - Two flexible afternoon tasks failed / went unfinished
    - Consequential learning: Protect 60m prep before high-stakes syncs and defer lower-priority work
    """
    try:
        entity_body = {
            "lesson": "User historically needs 60 minutes of protected preparation buffer before high-stakes leadership meetings. When flexible tasks are scheduled in adjacent slots, prep gets compromised and lower-priority tasks (e.g. Research Block, Admin Triage) repeatedly fail.",
            "uncompleted_task_categories": ["focus_work", "admin"],
            "required_prep_buffer_minutes": 60,
            "schedule_strategy": "protect_prep_and_defer_flexible",
            "historical_failure": "Session A: Pre-meeting prep was squeezed to 10 mins; 2 afternoon flexible tasks were abandoned; user entered 1:00 PM sync unprepared.",
            "rule": "Prioritize dedicated 60m focus buffer before high-stakes syncs; automatically defer or reschedule lower-priority flexible tasks away from pre-meeting crunch.",
            "learned_from_session": "Session_A",
            "recorded_timestamp": "2026-09-05T12:00:00Z"
        }

        entity = client.set_entity("workload_patterns", "high_stakes_meeting_prep", entity_body)

        journal_id = client.write_event(
            evaluated="Session A: Overloaded afternoon schedule with 1:00 PM Leadership Meeting and 2 flexible tasks (Research Block & Backlog Triage)",
            acted="Preparation was squeezed to 10m; Research Block was interrupted and Backlog Triage went unfinished (2 failures)",
            forward="Enforce 60m protected preparation buffer before high-stakes syncs and autonomously defer or reschedule flexible afternoon tasks",
            extra={"session": "Session_A", "impact": "high_stakes_compromise"}
        )

        # Checkpoint WAL and flush to guarantee complete on-disk commit
        try:
            conn = client.storage.connection()
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            client.storage.close()
        except Exception:
            pass

        print(json.dumps({
            "success": True,
            "message": "Consequential learning from Session A recorded in Sibyl Memory",
            "entity": entity,
            "journalId": journal_id,
            "lessonSummary": entity_body["lesson"]
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


def cmd_recall(client: MemoryClient, query: str = "leadership meeting prep"):
    """
    Recalls memories using Sibyl's SQLite + FTS5 full text search and entity store
    """
    try:
        search_results = list(client.search(query, limit=10))
        entities = client.list_entities("workload_patterns")
        
        # Format clean findings
        recalled = []
        for ent in entities:
            body = ent.get("body", {})
            recalled.append({
                "source": "sibyl_entity",
                "category": ent.get("category"),
                "name": ent.get("name"),
                "lesson": body.get("lesson"),
                "requiredPrepBufferMinutes": body.get("required_prep_buffer_minutes", 60),
                "scheduleStrategy": body.get("schedule_strategy"),
                "historicalFailure": body.get("historical_failure"),
                "rule": body.get("rule"),
                "timestamp": ent.get("created_at")
            })

        journals = []
        for res in search_results:
            if res.get("tier") == "journal":
                journals.append({
                    "id": res.get("key"),
                    "snippet": res.get("snippet"),
                    "body": res.get("body"),
                    "rank": res.get("rank")
                })

        print(json.dumps({
            "success": True,
            "query": query,
            "recalledMemories": recalled,
            "matchedJournalEntries": journals,
            "hasConsequentialLearning": len(recalled) > 0
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


def cmd_clear(client: MemoryClient, db_path: str):
    """
    Clears test memory to return to the fresh initial state (No Memory)
    """
    try:
        # Delete entities
        entities = client.list_entities("workload_patterns")
        for ent in entities:
            client.delete_entity("workload_patterns", ent.get("name"))
        
        # If SQLite file exists, optionally remove or re-initialize
        if os.path.exists(db_path):
            os.remove(db_path)
        
        # Re-initialize empty client
        new_client = MemoryClient.local(db_path)
        _ = new_client.schema_version()

        print(json.dumps({
            "success": True,
            "message": "Sibyl Memory reset to pristine state (0 entities, 0 events)",
            "schemaVersion": new_client.schema_version()
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


def cmd_export_snapshot(client: MemoryClient, db_path: str, target_path: str):
    """
    Creates an atomic, transactionally consistent snapshot of the official Sibyl SQLite database
    using SQLite's online backup API. Guarantees no partial writes or uncommitted WAL frames.
    """
    import sqlite3
    try:
        try:
            conn = client.storage.connection()
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        except Exception:
            pass
        client.storage.close()

        abs_target = os.path.abspath(target_path)
        os.makedirs(os.path.dirname(abs_target), exist_ok=True)
        if os.path.exists(abs_target):
            os.remove(abs_target)

        abs_src = os.path.abspath(db_path)
        with sqlite3.connect(abs_src) as src_conn:
            with sqlite3.connect(abs_target) as dst_conn:
                src_conn.backup(dst_conn)

        print(json.dumps({
            "success": True,
            "sourcePath": abs_src,
            "targetPath": abs_target,
            "sizeBytes": os.path.getsize(abs_target)
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Sibyl Memory Bridge")
    parser.add_argument("command", choices=["status", "record-session-a", "recall", "clear", "export-snapshot"])
    parser.add_argument("--query", default="leadership meeting prep", help="Search query for recall")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Path to SQLite memory file")
    parser.add_argument("--target", default="data/.snapshot_staging.db", help="Target path for database export")

    args = parser.parse_args()

    client = get_client(args.db)

    if args.command == "status":
        cmd_status(client, args.db)
    elif args.command == "record-session-a":
        cmd_record_session_a(client)
    elif args.command == "recall":
        cmd_recall(client, args.query)
    elif args.command == "clear":
        cmd_clear(client, args.db)
    elif args.command == "export-snapshot":
        cmd_export_snapshot(client, args.db, args.target)


if __name__ == "__main__":
    main()
