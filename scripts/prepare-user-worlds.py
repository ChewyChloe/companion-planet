"""Create rigidly placed runtime copies and preserve every original triangle.
No geometry is generated for the main landscapes. Embedded textures are resized for mobile.
"""
import json,struct,hashlib,io,math
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/user-worlds';OUT.mkdir(parents=True,exist_ok=True)
# Raw coordinates measured against real R3F views; seat is a reserved reading-zone anchor.
SPECS={
'b612':('同頻星球',(0.2086,.1221),(.0896,.1740),.320,11),
'moon':('月光書原',(.190,.180),(.0597,.1575),.35656,11),
'rose':('玫瑰花園',(.0758,.0433),(-.0322,.1394),.33943,11),
'forest':('微風森林',(.27,.24),(.0878,.1975),.27055405,11),
}
reports={};navigation={}
for key,(name,seat,desk,floor,scale) in SPECS.items():
 src=ROOT/f'assets/art/user-models/{name}.glb';data=src.read_bytes();n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);binary=data[28+n:]
 def accessor(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dims={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
  return np.frombuffer(binary,dtype=dtype,count=a['count']*dims,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).copy().reshape(-1,dims)
 p=g['meshes'][0]['primitives'][0];pos=accessor(p['attributes']['POSITION']);norm=accessor(p['attributes']['NORMAL']);idx=accessor(p['indices']).reshape(-1,3)
 angle=math.atan2(-(desk[0]-seat[0]),desk[1]-seat[1]);c,s=math.cos(angle),math.sin(angle)
 rotation=np.array([[c,0,s],[0,1,0],[-s,0,c]])
 translation=np.array([.72,.14,.23])-np.array([seat[0],floor,seat[1]])@rotation.T*scale
 world=pos@rotation.T*scale+translation
 correction_count=0
 if key=='rose':
  # The merged original chair back is too close for the approved resident depth.
  # A compact smooth displacement deepens this chair without cutting the scene.
  def ease(a,b,v):
   t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
  def shift(v):
   return .34*(1-ease(.65,.95,abs(v[:,0]-.72)))*ease(.55,.85,v[:,1])*(1-ease(1.85,2.10,v[:,1]))*ease(-1.6,-.8,v[:,2])*(1-ease(.0,.30,v[:,2]))
  displacement=shift(world);correction_count=int((displacement>1e-5).sum())
  derivative=[]
  for axis in range(3):
   delta=np.zeros_like(world);delta[:,axis]=.0001;derivative.append((shift(world+delta)-shift(world-delta))/.0002)
  transformed_normals=norm@rotation.T;denom=1-derivative[2];nz=transformed_normals[:,2]/denom
  transformed_normals[:,0]+=derivative[0]*nz;transformed_normals[:,1]+=derivative[1]*nz;transformed_normals[:,2]=nz
  transformed_normals/=np.maximum(np.linalg.norm(transformed_normals,axis=1,keepdims=True),1e-12)
  world[:,2]-=displacement

 # Track topology preservation explicitly; no triangles are removed.
 crop=np.zeros(len(idx),dtype=bool) # Preserve all supplied landscape and furniture geometry.
 # Bake the rigid transform in the derivative; source geometry and files remain untouched.
 newpos=world.astype('<f4');newnorm=(transformed_normals if key=='rose' else norm@rotation.T).astype('<f4')
 chunks=[];views=[]
 def block(b,target=None):
  offset=sum(map(len,chunks));b=bytes(b);v={'buffer':0,'byteOffset':offset,'byteLength':len(b)}
  if target:v['target']=target
  views.append(v);chunks.append(b+b'\0'*((-len(b))%4));return len(views)-1
 access=[]
 for attr,a in [('POSITION',newpos),('NORMAL',newnorm),('TEXCOORD_0',accessor(p['attributes']['TEXCOORD_0']).astype('<f4'))]:
  j=block(a.tobytes(),34962);d={'bufferView':j,'componentType':5126,'count':len(a),'type':f'VEC{a.shape[1]}'}
  if attr=='POSITION':d.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  access.append(d)
 flat=idx.astype('<u4').flatten();j=block(flat.tobytes(),34963);access.append({'bufferView':j,'componentType':5125,'count':len(flat),'type':'SCALAR'})
 images=[]
 for im in g['images']:
  v=g['bufferViews'][im['bufferView']];blob=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];image=Image.open(io.BytesIO(blob));size=2048 if max(image.size)>=4096 else 1024;image.thumbnail((size,size),Image.Resampling.LANCZOS);out=io.BytesIO();iscolor=im.get('mimeType')=='image/jpeg'
  image.convert('RGB').save(out,format='JPEG' if iscolor else 'PNG',**({'quality':90} if iscolor else {'optimize':True}));images.append({'bufferView':block(out.getvalue()),'mimeType':'image/jpeg' if iscolor else 'image/png'})
 binaryout=b''.join(chunks);gout={k:g[k] for k in ['materials','textures','samplers'] if k in g};gout.update(asset={'version':'2.0','generator':'Companion Planet rigid placement + mobile textures; source Tripo'},scene=0,scenes=[{'nodes':[0]}],nodes=[{'name':f'UserWorld_{key}','mesh':0}],meshes=[{'name':name,'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0}]}],accessors=access,bufferViews=views,buffers=[{'byteLength':len(binaryout)}],images=images)
 js=json.dumps(gout,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);(OUT/f'{key}.glb').write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binaryout))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binaryout),0x004e4942)+binaryout)
 # Heightfield: only upward terrain below the furniture/canopy band. Full vertical extent retained visually.
 step=.15;origin=-7.5;count=101
 q=np.indices((count,count)).reshape(2,-1).T*step+origin
 heights=np.full(len(q),-999.,dtype=float);tri=world[idx];cross=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normalY=cross[:,1]/np.maximum(np.linalg.norm(cross,axis=1),1e-12)
 candidates=tri[(normalY>.60)&(tri[:,:,1].min(axis=1)<1.6)&(tri[:,:,1].max(axis=1)>-.9)]
 for t in candidates:
  a,b,d=t;det=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2])
  if abs(det)<1e-10:continue
  hit=(q[:,0]>=t[:,0].min())&(q[:,0]<=t[:,0].max())&(q[:,1]>=t[:,2].min())&(q[:,1]<=t[:,2].max());ids=np.where(hit)[0];x,z=q[ids].T
  u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/det;v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/det;h=u*a[1]+v*b[1]+(1-u-v)*d[1];ok=(u>=0)&(v>=0)&(u+v<=1)&(h<1.6)&(h>-.9);ids=ids[ok];heights[ids]=np.maximum(heights[ids],h[ok])
 # Block overhead solid geometry (roots, walls, books, rails), but permit the separately controlled chair.
 blocked=np.zeros(len(q),dtype=bool)
 for t in tri:
  a,b,d=t;det=(b[2]-d[2])*(a[0]-d[0])+(d[0]-b[0])*(a[2]-d[2])
  if abs(det)<1e-10:continue
  ids=np.where((q[:,0]>=t[:,0].min())&(q[:,0]<=t[:,0].max())&(q[:,1]>=t[:,2].min())&(q[:,1]<=t[:,2].max()))[0];x,z=q[ids].T;u=((b[2]-d[2])*(x-d[0])+(d[0]-b[0])*(z-d[2]))/det;v=((d[2]-a[2])*(x-d[0])+(a[0]-d[0])*(z-d[2]))/det
  y=u*a[1]+v*b[1]+(1-u-v)*d[1];blocked[ids[(u>=0)&(v>=0)&(u+v<=1)&(y>heights[ids]+.18)&(y<heights[ids]+1.9)]]=True
 chairzone=(abs(q[:,0]-.72)<.65)&(abs(q[:,1]-.23)<.48)
 heights[chairzone]=.14;blocked[chairzone]=False
 valid=(heights>-900)&~blocked
 # Erode by two grid cells for resident body clearance, avoid choosing a disconnected terrace.
 mask=valid.reshape(count,count)
 for _ in range(2):
  mask=mask&np.roll(mask,1,0)&np.roll(mask,-1,0)&np.roll(mask,1,1)&np.roll(mask,-1,1)
 # Reinstate the measured boarding area: approach motion already lifts above the chair.
 mask |= valid.reshape(count,count)&((q[:,0]-.72)**2+(q[:,1]-.23)**2<1.5**2).reshape(count,count)
 # Keep the largest coherent terrace, then choose a safe spawn on that terrace.
 visited=np.zeros_like(mask);components=[]
 for start in np.where(mask.flatten())[0]:
  ix,iz=divmod(int(start),count)
  if visited[ix,iz]:continue
  pending=[(ix,iz)];component=[]
  while pending:
   x,z=pending.pop()
   if x<0 or z<0 or x>=count or z>=count or visited[x,z] or not mask[x,z]:continue
   visited[x,z]=True;component.append((x,z));pending.extend([(x-1,z),(x+1,z),(x,z-1),(x,z+1)])
  components.append(component)
 connected=np.zeros_like(mask)
 for x,z in max(components,key=len):connected[x,z]=True
 start=np.argmin(np.where(connected.flatten(),(q[:,0]+.72)**2+(q[:,1]-.12)**2,np.inf))
 navigation[key]={'origin':origin,'step':step,'count':count,'heights':[round(float(v),4) if v>-900 else None for v in heights],'walkable':np.where(connected.flatten())[0].tolist(),'home':q[start].round(3).tolist()}
 reports[key]={'source':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(data).hexdigest(),'scale':scale,'rotationY':angle,'translation':translation.tolist(),'sourceTriangles':len(crop),'chairBackAdjustedVertices':correction_count,'chairBackMaxOffset':.34 if key=='rose' else 0,'removedReadingZoneTriangles':int(crop.sum()),'runtimeTriangles':len(idx),'walkableCells':int(connected.sum()),'deskDistance':math.dist(seat,desk)*scale,'seatClearance':.04 if key=='b612' else 0,'seatHeight':(.349-floor)*scale+.04 if key=='b612' else (.395-floor)*scale if key=='rose' else .38,'deskHeight':({'b612':.3976,'moon':.433,'rose':.4135,'forest':.3558}[key]-floor)*scale,'bounds':[newpos.min(axis=0).tolist(),newpos.max(axis=0).tolist()]}
 print(key,reports[key])
(ROOT/'src/art/user-world-navigation.json').write_text(json.dumps(navigation,separators=(',',':')))
(ROOT/'assets/art/user-models/RUNTIME_TRANSFORMS.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
