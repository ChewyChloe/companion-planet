import sys
sys.path.insert(0,'/tmp/companion-color-tools')
import numpy as np,trimesh
from trimesh.ray.ray_pyembree import RayMeshIntersector
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('world_paint',ROOT/'scripts/paint-user-worlds.py');paint=importlib.util.module_from_spec(spec);spec.loader.exec_module(paint)
for key,t in paint.TRANS.items():
 g,b=paint.read_glb(ROOT/t['source']);p=g['meshes'][0]['primitives'][0];v=paint.attr(g,b,p['attributes']['POSITION']);f=paint.attr(g,b,p['indices']).reshape(-1,3)
 mesh=trimesh.Trimesh(vertices=v,faces=f,process=False);normal=mesh.face_normals;center=mesh.triangles_center
 caster=RayMeshIntersector(mesh);origins=center-normal*.00015;locations,ray,tri=caster.intersects_location(origins,-normal,multiple_hits=False)
 distance=np.full(len(f),.5,np.float32);distance[ray]=np.linalg.norm(locations-origins[ray],axis=1);distance=np.clip(distance,0,.5)
 from scipy.spatial import cKDTree
 d,neighbor=cKDTree(center).query(center,k=24);weights=(d<.027).astype(float)
 ns=normal[neighbor];matrix=np.einsum('nki,nkj,nk->nij',ns,ns,weights)/np.maximum(weights.sum(1)[:,None,None],1)
 planarity=np.linalg.eigvalsh(matrix)[:,-1].astype(np.float32)
 np.savez(ROOT/f'assets/art/world-color/{key}-shape.npz',thickness=distance,planarity=planarity)
 print(key,'thin faces',int((distance<.024).sum()),'of',len(f),flush=True)
