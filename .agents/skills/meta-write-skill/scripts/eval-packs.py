"""Builds one grading pack per eval run (prompt, graders, compact trace, files the agent changed).

Usage: eval-packs.py <result.json> <plugin dir> <packs dir>. Called by run-evals.sh.
The eval tool's own judge sees a truncated trace; grade these packs instead."""
import json,sys,os,glob,subprocess
def compact(trace):
    out=[]
    for l in open(trace):
        o=json.loads(l); t=o.get('type')
        if t=='assistant':
            for b in o['message']['content']:
                if b['type']=='text': out.append('AGENT: '+b['text'])
                elif b['type']=='tool_use':
                    i=b['input']; s=json.dumps(i)
                    if b['name'] in ('Write','Edit'): s=json.dumps({k:(v if k!='content' else v[:8000]) for k,v in i.items()})[:9000]
                    else: s=s[:300]
                    out.append(f"TOOL {b['name']}: {s}")
        elif t=='user':
            c=o['message']['content']
            if isinstance(c,list):
                for b in c:
                    if b.get('type')=='tool_result':
                        x=b['content'] if isinstance(b['content'],str) else json.dumps(b['content'])
                        out.append('  result: '+x[:250].replace('\n',' '))
    return '\n'.join(out)
def changed(ws):
    ref=os.path.join(ws,'.gitdata','index')
    if not os.path.exists(ref): return '(workspace missing)'
    r=subprocess.run(['find',ws,'-newer',ref,'-type','f','-not','-path','*/node_modules/*','-not','-path','*/.gitdata/*','-not','-path','*/.git-remote/*'],capture_output=True,text=True).stdout.split()
    parts=[]
    for f in r[:15]:
        rel=os.path.relpath(f,ws)
        try: body=open(f,errors='replace').read()
        except Exception: body='(unreadable)'
        parts.append(f"--- {rel}\n{body[:8000]}")
    return '\n'.join(parts) or '(no files changed)'
res,plugin,packs=sys.argv[1:4]
d=json.load(open(res)); os.makedirs(packs,exist_ok=True)
for c in [c for c in d['cases'] if c['dir'].startswith('evals/')]:
    for i,r in enumerate(c['arms']['with']):
        tp=r.get('tracePath') or ''
        base=os.path.dirname(os.path.dirname(tp)) if tp else ''
        graders=[open(g).read().split('---',2)[-1].strip() for g in sorted(glob.glob(f"{plugin}/{c['dir']}/graders/*.md"))]
        pack=f"# Case {c['name']} (run {i+1})\n\n## Prompt\n{c['promptMarkdown']}\n\n## Graders\n"+'\n'.join(f"{k+1}. {g}" for k,g in enumerate(graders))
        pack+=f"\n\n## Run\nturns {r['turns']}, error: {r.get('error') or 'none'}\n\n## Trace (compact)\n"+(compact(tp) if tp and os.path.exists(tp) else '(no trace)')
        pack+="\n\n## Files the agent changed\n"+(changed(os.path.join(base,'home','cwd')) if base else '(none)')
        open(f"{packs}/{c['name']}__run{i+1}.md","w").write(pack)
        print(c['name'],i+1,len(pack))
