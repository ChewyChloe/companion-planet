"""Semantic UV texture painting of the four supplied GLBs; no vertex/index changes.
Named 3D brush volumes follow source sculpt regions and retain its fine texture detail.
Packed AO/roughness/metalness uses real Cycles AO from bake-world-ao.py.
"""
import io,json,struct,math,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[1];SIZE=2048
SEEDS=json.loads((ROOT/'assets/art/world-color/seeds.json').read_text())
TRANS=json.loads((ROOT/'assets/art/user-models/RUNTIME_TRANSFORMS.json').read_text())
PALETTES={
'b612':dict(rock='#a5a098',grass='#94a381',leaf='#91a17c',bark='#967559',stone='#d7cbb5',roof='#839da4',wood='#b7956e',paper='#eddfbd',cover='#768fa5',metal='#ad9363',water='#79aab2',rose='#dfbf9d',cloth='#b7b3a1',moon='#e9d3a0',light='#f2cc88',crystal='#a2bfc7'),
'moon':dict(rock='#8f91a5',grass='#a3b3ad',leaf='#86a5a7',bark='#998b8c',stone='#d4cfde',roof='#7d92af',wood='#ae9488',paper='#ede0c8',cover='#8880a3',metal='#b2a17f',water='#8cb8c5',rose='#d1b2cc',cloth='#aaa4bc',moon='#e4ce9c',light='#f2d49d',crystal='#b2bfdb'),
'rose':dict(rock='#aea0a1',grass='#a3ad8c',leaf='#7d9678',bark='#9c8069',stone='#e1d3c0',roof='#bda89e',wood='#b69c83',paper='#f1e2cd',cover='#b37f8a',metal='#ad946b',water='#88b7b8',rose='#c98198',cloth='#c4abb0',moon='#dfc59b',light='#f2cb8e',crystal='#c4b3c9'),
'forest':dict(rock='#999f94',grass='#849874',leaf='#749373',bark='#927459',stone='#c8c6b2',roof='#819b8a',wood='#b19471',paper='#e7dbbd',cover='#7b8e82',metal='#aa946d',water='#79aba8',rose='#c9b1b0',cloth='#c9bb9b',moon='#d8c99f',light='#f0cf91',crystal='#a6c1b6')}
for palette in PALETTES.values():palette['creamRose']='#e7d7c8'
ROUGH=dict(creamRose=.72,rock=.94,grass=.95,leaf=.78,bark=.87,stone=.85,roof=.48,wood=.73,paper=.94,cover=.8,metal=.34,water=.22,rose=.72,cloth=.96,moon=.59,light=.35,crystal=.24)
METAL=dict(metal=.68,roof=.16,crystal=.08,water=.04)
def read_glb(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def attr(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
 return np.frombuffer(b,dtype=dt,count=a['count']*count,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,count)
def ease(a,b,t):
 t=np.clip((t-a)/(b-a),0,1);return t*t*(3-2*t)
def rgb(h):return (np.array([int(h[i:i+2],16) for i in (1,3,5)],np.float32)/255)**2.2
def geometry_digest(g,b):
 p=g['meshes'][0]['primitives'][0];h=hashlib.sha256()
 for name,index in sorted(p['attributes'].items()):h.update(name.encode());h.update(attr(g,b,index).tobytes())
 h.update(attr(g,b,p['indices']).tobytes());return h.hexdigest()

def raster(g,b,key):
 p=g['meshes'][0]['primitives'][0];pos=attr(g,b,p['attributes']['POSITION']);nrm=attr(g,b,p['attributes']['NORMAL']);uv=attr(g,b,p['attributes']['TEXCOORD_0']);ids=attr(g,b,p['indices']).reshape(-1,3)
 xyz=np.zeros((SIZE,SIZE,3),np.float32);norm=np.zeros_like(xyz);valid=np.zeros((SIZE,SIZE),bool);shape=np.zeros((SIZE,SIZE,2),np.float32);metrics=np.load(ROOT/f'assets/art/world-color/{key}-shape.npz')
 for face_id,tri in enumerate(ids):
  t=uv[tri]*SIZE;lo=np.maximum(np.floor(t.min(0)).astype(int),0);hi=np.minimum(np.ceil(t.max(0)).astype(int),SIZE-1)
  if np.any(hi<lo):continue
  x,y=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5);a,d,c=t
  det=(d[1]-c[1])*(a[0]-c[0])+(c[0]-d[0])*(a[1]-c[1])
  if abs(det)<1e-8:continue
  u=((d[1]-c[1])*(x-c[0])+(c[0]-d[0])*(y-c[1]))/det;v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;hit=(u>=-.001)&(v>=-.001)&(u+v<=1.001)
  yy,xx=np.where(hit);U=u[hit,None];V=v[hit,None];X=xx+lo[0];Y=yy+lo[1]
  xyz[Y,X]=U*pos[tri[0]]+V*pos[tri[1]]+(1-U-V)*pos[tri[2]];norm[Y,X]=U*nrm[tri[0]]+V*nrm[tri[1]]+(1-U-V)*nrm[tri[2]];valid[Y,X]=True;shape[Y,X,0]=metrics['thickness'][face_id];shape[Y,X,1]=metrics['planarity'][face_id]
 return xyz,norm,valid,shape

def paint(key,xyz,norm,shape):
 x,y,z=xyz.T;ny=norm[:,1];n=len(y);names=list(ROUGH);palette=PALETTES[key]
 color=np.tile(rgb(palette['rock']),(n,1));rough=np.full(n,.94,np.float32);metal=np.zeros(n,np.float32);emission=np.zeros(n,np.float32);labels=np.full(n,names.index('rock'),np.uint8)
 # Non-repeating gentle mineral/leaf variation; no global horizontal bands.
 variation=(np.sin(x*57+np.sin(z*31))*np.sin(z*43-y*23)+.4*np.sin(x*151+y*83)*np.sin(z*129))*.025
 def apply(name,w):
  w=np.clip(w,0,1).astype(np.float32);c=rgb(palette[name]);color[:]=color*(1-w[:,None])+c*w[:,None];rough[:]=rough*(1-w)+ROUGH[name]*w;metal[:]=metal*(1-w)+METAL.get(name,0)*w;labels[w>.5]=names.index(name)
  if name=='light':emission[:]=np.maximum(emission,w)
 def ell(c,r):return 1-ease(.86,1.05,np.sqrt(np.sum(((xyz-np.array(c))/np.array(r))**2,axis=1)))
 leaf_confidence=(1-ease(.028,.050,shape[:,0]))*ease(.33,.56,shape[:,1])
 def seed(name,r,material=None,offset=.008):
  for s in SEEDS[key].get(name,[]):
   c=np.array(s['point'])-np.array(s['normal'])*offset;w=ell(c,r)
   if material=='leaf' or name=='plant':w*=(1-ease(.030,.055,shape[:,0]))
   if name=='wood':w*=ease(floor+.02,floor+.045,y)
   apply(material or name,w)
 floor={'b612':.32,'moon':.35,'rose':.33,'forest':.29}[key]
 ground=ease(floor-.11,floor-.015,y)*(1-ease(floor+.06,floor+.15,y))*ease(.25,.72,ny)
 apply('grass' if key!='rose' else 'stone',ground)
 if key!='rose':
  # Curved pale walking paths join the original door, desk and stairs.
  path=[[-.2,-.07],[-.12,.025],[.02,.12],[.18,.10],[.23,-.10]] if key!='forest' else [[-.17,-.02],[-.04,.11],[.10,.20],[.20,.29]]
  distance=np.full(n,99.)
  for a,b in zip(path[:-1],path[1:]):
   a=np.array(a);v=np.array(b)-a;p=xyz[:,[0,2]];t=np.clip(((p-a)*v).sum(1)/(v@v),0,1);distance=np.minimum(distance,np.linalg.norm(p-a-t[:,None]*v,axis=1))
  apply('stone',(1-ease(.027,.048,distance))*ground)
 if key in ['b612','moon','forest']:
  center={'b612':[-.19,-.10],'moon':[-.20,-.09],'forest':[-.15,-.08]}[key]
  trunk=((x-center[0])/.18)**2+((z-center[1])/.18)**2
  apply('bark',(1-ease(.85,1.18,trunk))*ease(floor-.02,floor+.04,y)*(1-ease(.65,.72,y)))
  bottom={'b612':.595,'moon':.675,'forest':.625}[key]
  canopy=ease(bottom-.012,bottom+.012,y)*(1-ease(.095,.15,x))*(1-ease(.17,.22,z))
  apply('leaf',canopy)
  if key=='forest':
   # The arching branch and the smaller far crown are distinct source geometry.
   seed('bark',[.033,.029,.033]);c=np.array(SEEDS[key]['crown'][-1]['point'])-np.array(SEEDS[key]['crown'][-1]['normal'])*.035
   apply('leaf',ell(c,[.15,.11,.15]))
  seed('door',[.052,.067,.035],material='wood')
 if key in ['b612','moon']:
  cx,cz,base,rad=([.247,-.245,.57,.145] if key=='b612' else [.292,-.156,.565,.155])
  d=np.sqrt((x-cx)**2+(z-cz)**2)
  wall=(1-ease(rad*.94,rad*1.08,d))*ease(base-.035,base+.0,y)*(1-ease(base+.04,base+.075,y));apply('stone',wall)
  roof=(1-ease(rad,rad*1.10,d))*ease(base+.035,base+.055,y);apply('roof',roof)
  az=np.arctan2(z-cz,x-cx);rib=(1-ease(.055,.10,np.abs(np.sin(az*4))))*roof;apply('metal',rib*.85)
  apply('metal',(1-ease(.007,.014,np.abs(y-(base+.045))))*(1-ease(rad,rad*1.07,d)))
 if key=='moon':
  # Giant crescent is ivory-gold; separately masked telescope / dome remain cool.
  moon=(1-ease(.22,.27,x))*(1-ease(-.09,-.045,z))*ease(.53,.59,y)*(1-ease(-.02,-.08,x));apply('moon',moon)
  seed('moon',[.13,.24,.13],material='moon',offset=.015)
  seed('metal',[.025,.045,.03]);
 # Form-aware leaf masks: thin parallel/opposed faces, not arbitrary green circles on rock.
 structural=np.zeros(n,bool)
 if key=='b612':structural=((x-.247)**2+(z+.245)**2<.18**2)&(y>.54)
 if key=='moon':structural=(((x-.292)**2+(z+.156)**2<.18**2)&(y>.54))|((x>-.04)&(z<-.08)&(y>.58))
 if key=='rose':
  structural=(((x-.265)**2+(z+.198)**2<.15**2)&(y>.40))|(((x-.35)**2+(z-.20)**2<.105**2)&(y<.50))|((x*x+(z-.18)**2<.16**2)&(y>.35)&(y<.47))|((x>0)&(x<.16)&(z>-.035)&(z<.11)&(y>.35)&(y<.55))
  structural|=((x*x+z*z)>.27**2)&(y>.325)&(y<.46)
 thin_leaf=leaf_confidence*ease(floor+.025,floor+.06,y)*(~structural)
 apply('leaf',thin_leaf)
 if key=='rose':
  # Petal cores sit inside broader foliage volumes, leaving leaf silhouettes green.
  seed('plant',[.044,.060,.043],material='leaf')
  for s in SEEDS[key]['rose']:
   c=np.array(s['point'])-np.array(s['normal'])*.027;apply('rose',ell(c,[.047,.052,.049]))
  seed('creamRose',[.039,.046,.039],material='creamRose',offset=.023)
  seed('plant',[.026,.037,.030],material='leaf')
  # Gazebo and arch stay warm limestone instead of a solid pink recolor.
 else:
  seed('plant',[.045,.048,.045],material='leaf');seed('rock',[.04,.035,.04])
 # Furniture volumes; preserve the original book / table silhouettes.
 desk={'b612':([.13,.365,.19],[.125,.07,.10]),'moon':([.09,.385,.14],[.105,.07,.09]),'rose':([.04,.39,.10],[.09,.08,.10]),'forest':([.075,.32,.17],[.13,.10,.09])}[key]
 if key!='rose':apply('wood',ell(*desk)*ease(floor+.025,floor+.050,y))
 if key=='forest':
  apply('wood',ell([.13,.245,.35],[.11,.019,.045]));seed('cloth',[.075,.075,.075],material='cloth',offset=.012)
 if key=='moon':
  # The bookshelf, its cavity and the blue book spines are separate brush groups.
  apply('wood',ell([-.20,.48,-.08],[.09,.11,.06]));apply('cover',ell([-.16,.43,-.05],[.08,.11,.065])*ease(.7,.9,shape[:,1])*ease(floor+.02,floor+.04,y));seed('wood',[.04,.045,.04],material='cover')

 if key!='rose':seed('wood',[.035,.035,.035])
 seed('cover',[.04,.025,.045]);seed('paper',[.042,.022,.045]);seed('stone',[.031,.025,.032]);seed('crystal',[.03,.055,.03])
 # Follow sampled 3D railing curves, keeping adjacent ground and leaf shapes untouched.
 rail=SEEDS[key].get('rail',[])
 for a,b in zip(rail[:-1],rail[1:]):
  a=np.array(a['point'])-np.array(a['normal'])*.004;b=np.array(b['point'])-np.array(b['normal'])*.004;v=b-a;t=np.clip(((xyz-a)*v).sum(1)/(v@v+1e-9),0,1);d=np.linalg.norm(xyz-a-t[:,None]*v,axis=1)
  apply('metal' if key=='b612' else 'wood',1-ease(.010,.017,d))
 if key=='b612':apply('metal',ease(.23,.26,x)*ease(.01,.04,z)*ease(.43,.47,y))
 if key=='moon':apply('metal',ease(.38,.41,x)*ease(.70,.73,y))
 # Continuous waterfall curtains plus basin volumes, rather than coloring isolated dots.
 if key in ['b612','forest']:
  c=[-.045,.205,.354] if key=='b612' else [.045,.185,.406]
  apply('water',ell(c,[.058,.13,.035]))
  if key=='b612':
   apply('water',ell([.06,.089,.37],[.12,.012,.095]))
   # Surveyed centerline in source coordinates, from the upper spring to the lip.
   river=[(-.139,.311,.163,.019),(-.149,.291,.188,.029),
          (-.149,.280,.214,.033),(-.109,.267,.252,.035),
          (-.087,.254,.299,.039),(-.072,.246,.329,.045),
          (-.044,.235,.353,.046)]
   channel=np.zeros_like(x)
   for start,end in zip(river,river[1:]):
    ax,ay,az,aw=start;bx,by,bz,bw=end
    dx,dz=bx-ax,bz-az
    t=np.clip(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1)
    distance=np.hypot(x-ax-t*dx,z-az-t*dz)
    width=aw+t*(bw-aw)
    bed=ay+t*(by-ay)
    mask=(1-ease(.82,1.05,distance/width))*(1-ease(.012,.026,abs(y-bed)))
    channel=np.maximum(channel,mask)
   apply('water',channel*ease(.12,.54,ny))
 if key=='moon':
  # Measured upstream bed bends toward the actual lip at source z=.31.
  center=-.08-.04*ease(.21,.27,z)+.013*ease(.28,.31,z)
  channel=(1-ease(.028,.047,abs(x-center)))*ease(.185,.216,z)*(1-ease(.307,.329,z))
  apply('water',channel*(1-ease(.009,.025,abs(y-(.375-.12*z))))*ease(.12,.55,ny))
  # Follow the slightly slanted curtain and the splash area below.
  curtain_x=-.105-.045*(1-ease(.17,.33,y))
  curtain_z=.287+.024*ease(.17,.33,y)
  curtain=(1-ease(.038,.062,abs(x-curtain_x)))*(1-ease(.013,.036,abs(z-curtain_z)))
  apply('water',curtain*ease(.14,.17,y)*(1-ease(.337,.358,y))*(1-ease(.64,.91,ny)))
  apply('water',ell([-.155,.158,.302],[.063,.025,.049]))
 if key=='rose':
  # Only the inner fountain bowls are water; their rim and pedestal stay limestone.
  apply('water',ell([.38,.368,.21],[.050,.008,.050]));apply('water',ell([.335,.37,.18],[.040,.008,.040]))
 seed('metal',[.023,.038,.023]);seed('light',[.016,.020,.016])
 if key=='forest':
  seed('metal',[.018,.024,.018],material='light')
  apply('water',ell([.125,.266,.325],[.027,.009,.045]))
 if key=='moon':
  # Hanging star / visible reading window.
  apply('light',ell([.18,.80,-.17],[.026,.035,.028]));apply('light',ell([-.11,.52,-.085],[.018,.024,.012]))
 if key=='moon':
  # This lamp is part of the uploaded island mesh, in front of the live light.
  stem=[[-.104,.380,.074],[-.104,.507,.075],[-.085,.533,.083],
        [-.072,.547,.099],[-.061,.549,.116]]
  for a,b in zip(stem,stem[1:]):
   a=np.array(a);v=np.array(b)-a
   t=np.clip(((xyz-a)*v).sum(1)/(v@v),0,1)
   apply('metal',1-ease(.011,.018,np.linalg.norm(xyz-a-t[:,None]*v,axis=1)))
  apply('metal',ell([-.104,.378,.075],[.027,.013,.029]))
  apply('paper',ell([-.058,.533,.127],[.030,.029,.030]))
 color*=np.clip(1+variation[:,None],.93,1.07);rough[:]=np.clip(rough+variation*.6,.12,.98)
 return color,rough,metal,emission,labels,names

def run(key):
 path=ROOT/f'public/models/user-worlds/{key}.glb';g,b=read_glb(path);geometry_before=geometry_digest(g,b);original_g,original_b=read_glb(ROOT/TRANS[key]['source']);xyz,norm,valid,shape=raster(original_g,original_b,key)
 yy,xx=np.where(valid);color,rough,metal,emit,labels,names=paint(key,xyz[valid],norm[valid],shape[valid]);base_im=g['images'][g['textures'][g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']];bv=g['bufferViews'][base_im['bufferView']];source_image=original_g['images'][original_g['textures'][original_g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']];source_view=original_g['bufferViews'][source_image['bufferView']];old=Image.open(io.BytesIO(original_b[source_view.get('byteOffset',0):source_view.get('byteOffset',0)+source_view['byteLength']])).convert('RGB').resize((SIZE,SIZE))
 gray=np.asarray(old,dtype=np.float32).mean(2)/255;blur=np.asarray(old.filter(ImageFilter.GaussianBlur(18)),dtype=np.float32).mean(2)/255;detail=np.clip(gray/(blur+.001),.70,1.15)
 color*=detail[valid,None]**.6
 atlas=np.full((SIZE,SIZE,3),180,np.uint8);atlas[yy,xx]=np.clip(color**(1/2.2)*255,0,255).astype(np.uint8)
 # Pad all chart edges in UV space so mipmaps do not create white seams.
 from scipy.ndimage import distance_transform_edt
 _,nearest=distance_transform_edt(~valid,return_indices=True);atlas[~valid]=atlas[nearest[0][~valid],nearest[1][~valid]]
 ao_path=ROOT/f'assets/art/world-color/{key}-ao.png'
 if not ao_path.exists():raise RuntimeError(f'Missing real AO bake: {ao_path}')
 ao=np.asarray(Image.open(ao_path).convert('RGB').resize((SIZE,SIZE)),dtype=np.uint8)[:,:,0]
 packed=np.empty((SIZE,SIZE,3),np.uint8);packed[:,:,0]=ao;packed[:,:,1]=230;packed[:,:,2]=0;packed[yy,xx,1]=(rough*255).astype(np.uint8);packed[yy,xx,2]=(metal*255).astype(np.uint8)
 for channel in [1,2]:packed[:,:,channel][~valid]=packed[nearest[0][~valid],nearest[1][~valid],channel]
 emission=np.zeros((SIZE,SIZE,3),np.uint8);emission[yy,xx]=(emit[:,None]*255).astype(np.uint8)
 target=ROOT/'assets/art/world-color';Image.fromarray(atlas).save(target/f'{key}-albedo.jpg',quality=94,subsampling=0);Image.fromarray(packed).resize((1024,1024),Image.Resampling.LANCZOS).save(target/f'{key}-orm.png');Image.fromarray(emission).resize((512,512),Image.Resampling.LANCZOS).save(target/f'{key}-emission.png')
 # Repack buffer views unchanged except the albedo image; append packed PBR textures.
 material=g['materials'][0]
 existing={}
 for suffix,slot in [('orm','occlusionTexture'),('emission','emissiveTexture')]:
  if slot in material:
   texture=material[slot]['index'];image=g['textures'][texture]['source']
   existing[suffix]=(texture,g['images'][image]['bufferView'])
 views=[];chunks=[]
 def block(blob,target=None):
  offset=sum(map(len,chunks));view={'buffer':0,'byteOffset':offset,'byteLength':len(blob)}
  if target:view['target']=target
  views.append(view);chunks.append(blob+b'\0'*((-len(blob))%4));return len(views)-1
 for i,v in enumerate(g['bufferViews']):
  blob=b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if i==base_im['bufferView']:blob=(target/f'{key}-albedo.jpg').read_bytes()
  for suffix,(_,view_index) in existing.items():
   if i==view_index:blob=(target/f'{key}-{suffix}.png').read_bytes()
  block(blob,v.get('target'))
 textures={}
 for suffix in ['orm','emission']:
  if suffix in existing:
   textures[suffix]=existing[suffix][0];continue
  textures[suffix]=len(g['textures'])
  im=len(g['images']);g['images'].append({'bufferView':block((target/f'{key}-{suffix}.png').read_bytes()),'mimeType':'image/png'});g['textures'].append({'sampler':0,'source':im})
 orm=textures['orm'];emissive=textures['emission'];m=g['materials'][0];m['name']='StorybookPaint';pbr=m['pbrMetallicRoughness'];pbr['baseColorFactor']=[1,1,1,1];pbr['metallicFactor']=1;pbr['roughnessFactor']=1;pbr['metallicRoughnessTexture']={'index':orm};m['occlusionTexture']={'index':orm,'strength':.7};m['emissiveTexture']={'index':emissive};m['emissiveFactor']=[.8,.63,.35]
 g['bufferViews']=views;binary=b''.join(chunks);g['buffers']=[{'byteLength':len(binary)}];g['asset']['generator']='Companion Planet semantic PBR painting; source Tripo';js=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
 after_g,after_b=read_glb(path);geometry_after=geometry_digest(after_g,after_b)
 if geometry_after!=geometry_before:raise RuntimeError('Painting changed the model geometry')
 report={'world':key,'geometryHashBefore':geometry_before,'geometryHashAfter':geometry_after,'uvCoverage':round(float(valid.mean()),3),'paintedPixels':int(valid.sum()),'semanticPixelCounts':{name:int((labels==i).sum()) for i,name in enumerate(names)},'geometryUnchanged':True,'ambientOcclusion':'Cycles CPU 24 samples, 1024 atlas','baseColorSize':2048,'packedOrmSize':1024,'emissionSize':512,'runtimeBytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()};(target/f'{key}-paint.json').write_text(json.dumps(report,indent=2));print('PAINTED',key,report['runtimeBytes'],flush=True)
if __name__=='__main__':
 import sys,subprocess
 if len(sys.argv)>1:
  for key in sys.argv[1:]:run(key)
  sys.exit(0)
 subprocess.run([sys.executable,str(ROOT/'scripts/prepare-user-worlds.py')],check=True,stdout=subprocess.DEVNULL)
 for key in PALETTES:run(key)
