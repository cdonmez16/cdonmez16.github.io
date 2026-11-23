#!/usr/bin/env python3
"""Merge only Teaching & Mentoring content into a fresh Content Studio JSON download."""
import json,sys
from pathlib import Path
if len(sys.argv)!=3:
    sys.exit("Usage: python merge_teaching.py CURRENT_SITE_JSON OUTPUT_JSON")
live=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
source=json.loads((Path(__file__).parent/"content/site.json").read_text(encoding="utf-8"))
live.setdefault("pages",{})["teaching"]=source["pages"]["teaching"]
live["sections"]=[s for s in live.get("sections",[]) if s.get("page")!="teaching"]
live["sections"].extend(s for s in source["sections"] if s.get("page")=="teaching")
Path(sys.argv[2]).write_text(json.dumps(live,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Merged teaching page and 3 sections; all other current content preserved.")
