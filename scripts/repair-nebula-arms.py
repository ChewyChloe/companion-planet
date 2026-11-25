"""Repair folded arm rotation tracks in the runtime copy, preserving geometry."""
import json, struct, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def repair(path):
    b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=bytearray(b[28+n:])
    def append(values, dims):
        while len(binary)%4:binary.append(0)
        offset=len(binary);binary.extend(struct.pack('<'+'f'*len(values),*values))
        view=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(values)*4})
        index=len(g['accessors']);a={'bufferView':view,'componentType':5126,'count':len(values)//dims,'type':'SCALAR' if dims==1 else 'VEC4'}
        if dims==1:a.update(min=[min(values)],max=[max(values)])
        g['accessors'].append(a);return index
    def multiply(a,b):
        x,y,z,w=a;u,v,s,t=b
        return [w*u+x*t+y*s-z*v,w*v-x*s+y*t+z*u,w*s+x*v-y*u+z*t,w*t-x*u-y*v-z*s]
    for clip in g['animations']:
        duration=max(g['accessors'][s['input']].get('max',[0])[0] for s in clip['samplers'])
        times=[duration*i/64 for i in range(65)];inp=append(times,1)
        for channel in clip['channels']:
            node=g['nodes'][channel['target']['node']];name=node.get('name')
            if channel['target']['path']!='rotation' or name not in ['Hand.L','Hand.R']:continue
            rest=node.get('rotation',[0,0,0,1]);values=[]
            for t in times:
                phase=2*math.pi*t/duration
                if clip['name']=='Walk':
                    angle=.24*math.sin(phase)*(1 if name=='Hand.L' else -1);axis=[0,0,1]
                elif clip['name']=='Wave' and name=='Hand.R':
                    angle=.65+.20*math.sin(phase);axis=[1,0,0]
                elif clip['name']=='Bounce':
                    angle=.12*(1-math.cos(phase));axis=[1,0,0]
                else:angle=0;axis=[1,0,0]
                q=[v*math.sin(angle/2) for v in axis]+[math.cos(angle/2)]
                values.extend(multiply(rest,q))
            out=append(values,4);channel['sampler']=len(clip['samplers']);clip['samplers'].append({'input':inp,'output':out,'interpolation':'LINEAR'})
    g['buffers'][0]['byteLength']=len(binary)
    js=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)

if __name__=='__main__':repair(ROOT/'public/models/user-residents/nebula.glb')
