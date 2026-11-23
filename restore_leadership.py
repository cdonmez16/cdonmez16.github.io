import json,sys
from pathlib import Path
if len(sys.argv)!=3: raise SystemExit('Usage: python3 restore_leadership.py current-site.json site.json')
p=Path(__file__).with_name('leadership-content.json')
patch=json.loads(p.read_text(encoding='utf-8'))
d=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
d.setdefault('pages',{})['leadership']=patch['page']
s=d['sections']; pos=next((i for i,x in enumerate(s) if x.get('page')=='leadership'),len(s)); s=[x for x in s if x.get('page')!='leadership']; s[pos:pos]=patch['sections']; d['sections']=s
Path(sys.argv[2]).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
