"""Run one independent study: blender -b -t 4 --python scripts/modeling-trials/run.py -- treehouse|island|observatory"""
import sys,runpy
from pathlib import Path
folder=Path(__file__).resolve().parent;sys.path.insert(0,str(folder));name=sys.argv[sys.argv.index('--')+1]
if name not in {'treehouse','island','observatory'}:raise SystemExit('Choose a single trial')
runpy.run_path(str(folder/(name+'.py')),run_name='__main__')
