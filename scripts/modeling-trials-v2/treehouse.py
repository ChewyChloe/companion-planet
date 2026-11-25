"""Treehouse v2 only: native continuous branch topology and authored non-spherical crown surfaces."""
import bpy,bmesh,math,json
from mathutils import Vector,Matrix
import common as C
root=C.setup('treehouse');structure=C.empty('Continuous_root_trunk_branch_topology',root)
# The surface is extracted from a smooth-union implicit field of tapering spline volumes.
# No native Skin modifier: its high-valence root junction produced fins in the rejected test.
import numpy as np
from pathlib import Path
data=np.load(Path(__file__).with_name('implicit-trunk.npz'))
body=C.mesh('Continuous_tree_surface',data['vertices'].tolist(),data['faces'].tolist(),parent=structure)
# Broad, non-periodic growth channels follow the actual twisting trunk surface.
for vertex in body.data.vertices:
 p=vertex.co;y=p.z
 if .42<y<2.55:
  cx=-.15+.10*math.sin(y*2.1);cz=-.05-.06*math.sin(y*1.7);dx=p.x-cx;dz=-p.y-cz;r=math.hypot(dx,dz)
  if r>.1:
   phi=math.atan2(dz,dx);taper=math.sin(math.pi*(y-.42)/2.13)**.65;cut=0
   for a,w,d in [(-2.1,.18,.032),(-.85,.21,.043),(.35,.16,.035),(1.55,.22,.047),(2.55,.15,.029)]:
    flow=a+.29*math.sin(y*1.9+a*.5);angle=math.atan2(math.sin(phi-flow),math.cos(phi-flow));cut+=d*math.exp(-(angle/w)**2)
   p.x-=dx/r*cut*taper;p.y+=dz/r*cut*taper
C.normals(body)
# A smaller, inward-set door cut rotates with the tree's front-right root face.
yaw=math.radians(25);cutter=C.arch('Tree_cavity_cutter',(0,.35,.47),1.03,1.34,.63);cutter.rotation_euler.z=yaw;C.difference(body,cutter);C.bevel(body,.025,3)
for poly in body.data.polygons:poly.use_smooth=True
entry=C.empty('Inset_treehouse_door',root)
C.archrim('Recessed_inner_wood_casing',(0,.44,.275),.94,1.25,.035,entry,C.LIGHT)
door=C.arch('Arched_door_leaf',(0,.45,.235),.86,1.18,.07,C.CLAY,entry);C.bevel(door,.018,3)
for x in [-.285,-.142,0,.142,.285]:C.difference(door,C.box('Door_seam_cutter',(x,.99,.275),(.010,1.1,.045),r=.003))
C.difference(door,C.ellipsoid('Window_cutter',(0,1.30,.235),(.235,.235,.18)))
C.ellipsoid('Inset_window_back',(0,1.30,.20),(.22,.22,.016),C.INSET,entry)
C.rod('Window_vertical',(0,1.08,.28),(0,1.52,.28),.028,parent=entry);C.rod('Window_horizontal',(-.22,1.30,.28),(.22,1.30,.28),.028,parent=entry)
C.ellipsoid('Door_knob',(.27,.87,.29),(.03,.03,.02),C.INSET,entry);entry.rotation_euler.z=yaw
# Crown shells are individually authored closed, lobed surfaces, not joined spheres.
crown=C.empty('Asymmetric_layered_canopy',root)
clumps=[('Back_left',(-1.0,4.02,-.65),(1.0,.62,.82),.2),('Back_right',(.75,4.03,-.61),(1.05,.65,.81),1.4),('Crown_high',(-.2,4.45,-.62),(.95,.57,.79),2.0),('Left_middle',(-1.8,3.61,-.20),(.91,.64,.75),.5),('Right_middle',(1.68,3.73,-.05),(.92,.61,.74),2.4),('Left_hanging',(-2.37,3.29,.26),(.59,.49,.58),1.1),('Right_hanging',(2.30,3.40,.22),(.63,.52,.60),3.1),('Front_left',(-1.15,3.44,.60),(.89,.63,.71),2.8),('Front_middle',(-.10,3.55,.86),(.90,.62,.75),.9),('Front_right',(.95,3.48,.64),(.88,.57,.68),1.8),('Upper_left',(-1.20,4.50,-.31),(.65,.47,.61),3.6)]
clumps.extend([('Front_lobe_left',(-1.91,3.43,.83),(.52,.43,.48),.7),('Front_lobe_center',(-.55,3.85,1.04),(.58,.47,.5),1.7),('Front_lobe_right',(1.57,3.71,.87),(.55,.46,.5),2.2),('Top_lobe',(.52,4.63,-.23),(.65,.46,.59),.4)])
cloud_data=np.load(Path(__file__).with_name('implicit-canopy.npz'))
for name,center,scale,phase in clumps:
 C.mesh('Crown_'+name,cloud_data[name+'_v'].tolist(),cloud_data[name+'_f'].tolist(),parent=crown)
# The same necessary approach is kept, with no new ornamental objects.
platform=C.empty('Root_platform_and_approach',root)
outline=[(-1.9,-1.05),(-1.05,-1.40),(.45,-1.30),(1.60,-.65),(1.78,.33),(.98,1.05),(-.55,1.12),(-1.86,.60)]
v=[(x,y,z) for y in [.02,.38] for x,z in outline];n=len(outline);f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];C.bevel(C.mesh('Root_support',v,f,parent=platform),.12,4)
steps=C.empty('Entrance_steps',platform)
for i in range(5):
 h=.38-i*.07;C.box('Approach_step_'+str(i+1),(0,h/2,.95+i*.29),(1.02+.035*i,h,.34),parent=steps,r=.045)
C.box('Entrance_landing',(0,.225,.58),(1.15,.45,.84),parent=steps,r=.045)
steps.rotation_euler.z=yaw
C.output('treehouse',{'method':'Smooth-union implicit field sampled from authored tapering cubic-spline growth columns and roots; marching-cubes extraction at 0.032 m, without subdivision; geometry-level non-periodic growth channels; recessed angled door; individually authored smooth-union cloud volumes. No voxel union, no additional decoration, no hand-brush sculpt claim.','limits':['The method remains Blender Python assisted; interactive brush sculpting was not available or performed.','Reference camera is not calibrated; the primary camera is a true 45-degree review view.','Back branches and hidden crown volumes are inferred from the supplied small alternate views.','The implicit surface and crown composition require visual approval; technical continuity alone is not an art-quality pass.']})
