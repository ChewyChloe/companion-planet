import common as C
import math,bpy
from mathutils import Vector
root=C.setup('observatory');base=C.empty('Terraced_foundation_and_stair',root)
C.lathe('Lower_plinth',(0,0,0),[(1.37,0),(1.44,.06),(1.44,.30),(1.39,.36),(1.18,.36)],parent=base)
C.lathe('Upper_plinth',(0,.35,0),[(1.18,0),(1.23,.065),(1.23,.26),(1.17,.32),(1.02,.32)],parent=base)
C.lathe('Dome_sill',(0,.66,0),[(1.02,0),(1.08,.045),(1.08,.15),(1.04,.19),(.94,.19)],parent=base)
for i in range(5):
 h=.84-i*.16;C.box('Approach_step_'+str(i+1),(0,h/2,1.16+i*.28),(.94,h,.34),parent=base,r=.045)
frame=C.empty('Complete_dome_frame',root)
for i in range(8):
 a=i*C.TAU/8;x=math.cos(a)*1.0;z=math.sin(a)*1.0
 C.lathe('Arch_column_foot_'+str(i),(x,.85,z),[(.09,0),(.10,.035),(.065,.07),(.056,.28),(.075,.31)],parent=frame,n=32)
 pts=[(math.cos(a)*math.cos(t)*1.0,1.14+math.sin(t)*1.07,math.sin(a)*math.cos(t)*1.0) for t in [j*math.pi/2/18 for j in range(19)]]
 C.curve('Meridian_dome_rib_'+str(i),pts,.034,parent=frame)
 b=(i+1)*C.TAU/8;xa,za=math.cos(b),math.sin(b);C.curve('Between_column_arch_'+str(i),[(x,1.06,z),((x+xa)*.51,1.28,(z+za)*.51),(xa,1.06,za)],.027,parent=frame)
C.lathe('Apex_collar',(0,2.19,0),[(.09,0),(.095,.055),(.045,.09)],parent=frame,n=32);C.star('Five_point_roof_finial',(0,2.47,0),.23,frame)
# Thin modeled dome panels use neutral alpha solely for structural inspection.
panels=C.empty('Separate_dome_panels',root);pane=C.CLAY.copy();pane.name='Neutral_panel_review_alpha';pane.diffuse_color=(.48,.46,.51,.055);pane.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.055
for k in range(8):
 verts=[];faces=[];N=12;M=14
 for i in range(M+1):
  t=i/M*math.pi/2
  for j in range(N+1):
   a=(k+j/N)*C.TAU/8;verts.append((math.cos(t)*math.cos(a)*.985,1.14+math.sin(t)*1.055,math.cos(t)*math.sin(a)*.985))
 for i in range(M):
  for j in range(N):a=i*(N+1)+j;faces.append((a,a+1,a+N+2,a+N+1))
 o=C.mesh('Dome_panel_'+str(k),verts,faces,pane,panels);mod=o.modifiers.new('Panel thickness','SOLIDIFY');mod.thickness=.012;C.apply(o,mod)
scope=C.empty('Telescope_assembly',root)
for i in range(3):
 a=.3+i*C.TAU/3;foot=(.61*math.cos(a),.87,.61*math.sin(a));top=(0,1.50,0)
 C.rod('Tripod_leg_'+str(i),foot,top,.036,parent=scope);C.ellipsoid('Tripod_pad_'+str(i),(foot[0],.88,foot[2]),(.09,.032,.07),parent=scope)
 C.rod('Tripod_cross_brace_'+str(i),(0,1.16,0),(.36*math.cos(a),1.14,.36*math.sin(a)),.017,parent=scope)
C.lathe('Tilt_pedestal',(0,1.43,0),[(.13,0),(.14,.07),(.09,.12)],parent=scope,n=40)
start=Vector((-.40,1.57,.05));end=Vector((.48,1.96,.14));axis=(end-start).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u).normalized();length=(end-start).length
profile=[(.13,0),(.16,.025),(.16,.13),(.145,.16),(.145,length-.12),(.18,length-.1),(.18,length),(.135,length),(.135,length-.17)]
verts=[];faces=[];N=64
for r,d in profile:
 for i in range(N):p=start+axis*d+u*(r*math.cos(i*C.TAU/N))+v*(r*math.sin(i*C.TAU/N));verts.append(tuple(p))
for row in range(len(profile)-1):
 for j in range(N):a=row*N+j;b=row*N+(j+1)%N;faces.append((a,b,b+N,a+N))
C.mesh('Hollow_optical_barrel',verts,faces,parent=scope)
for name,dist,r,mat in [('Recessed_objective',length-.17,.133,C.INSET),('Rear_eyepiece',-.09,.065,C.CLAY)]:
 a=start+axis*dist;b=a+axis*.045;C.rod(name,tuple(a),tuple(b),r,mat,scope)
C.curve('U_shaped_tilt_cradle',[(-.12,1.48,-.12),(-.2,1.61,-.15),(0,1.70,-.14),(.18,1.69,-.1)],.035,parent=scope)
C.rod('Focus_knob_axle',(-.05,1.64,.12),(-.08,1.64,.26),.027,parent=scope);C.ellipsoid('Focus_knob',(-.08,1.64,.28),(.065,.065,.025),parent=scope)
C.output('observatory',{'method':'Custom revolved molding profiles and hollow optical tube; individually modeled hemisphere meridians, bay arches, pane surfaces, tripod and focusing assembly.','limits':['Dome panes use a neutral low-alpha inspection material only; this is not a finished glass/PBR look.','Bay arches are added in response to the requested trial brief; the reference primarily shows dome meridians.','Rear details and mounting hardware are inferred where hidden in the supplied design.']})
