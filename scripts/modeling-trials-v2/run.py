import runpy,sys
from pathlib import Path
p=Path(__file__).resolve().parent;sys.path.insert(0,str(p));runpy.run_path(str(p/'treehouse.py'),run_name='__main__')
