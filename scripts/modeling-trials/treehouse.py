"""Authored silhouette study from the uploaded main-island tree/door closeups."""
import common as C
import math
root=C.setup('treehouse');trunk_root=C.empty('Trunk_and_root_system',root)
# Individually placed, tapered controls follow the widening roots and twisting fork.
parts=[C.curve('Main_swept_bole',[(0,.48,0),(-.16,1.15,-.04),(-.10,1.9,-.12),(.05,2.55,-.12)],.48,[1.65,1.60,1.40,.85])]
roots=[([(-1.65,.46,.54),(-.87,.55,.30),(-.35,.9,.1),(0,1.3,0)],[.12,.85,1.1,1.0]),([(1.45,.46,.42),(.82,.60,.31),(.32,.98,.10),(0,1.35,0)],[.12,.72,1.0,.8]),([(-.5,.47,1.12),(-.38,.59,.71),(-.33,1.02,.35),(-.17,1.6,-.03)],[.15,.75,.8,.65]),([(.75,.47,-1.0),(.46,.70,-.55),(.17,1.3,-.22),(0,1.8,-.12)],[.18,.8,1,.7]),([(-1.17,.47,-.60),(-.69,.74,-.38),(-.26,1.2,-.13)],[.12,.9,1])]
for i,(p,r) in enumerate(roots):parts.append(C.curve('Root_flow_'+str(i),p,.31,r))
branches=[([(-.12,1.75,-.1),(-.70,2.18,-.17),(-1.42,2.52,-.20),(-2.0,3.12,-.1)],[1.15,1,.64,.22]),([(-.10,1.9,-.1),(.48,2.43,-.13),(1.12,2.75,-.25),(1.8,3.25,-.25)],[1.05,.9,.66,.20]),([(-.10,2.05,-.15),(-.20,2.8,-.56),(-.55,3.3,-.80)],[1,.74,.22]),([(.08,2.4,-.12),(.30,3.02,.30),(.92,3.33,.45)],[.86,.62,.22])]
for i,(p,r) in enumerate(branches):parts.append(C.curve('Structural_fork_'+str(i),p,.32,r))
trunk=C.union(parts,'Continuous_sculpted_root_trunk_branches',.047,trunk_root)
# A genuine recessed opening, not an arch stuck against an intact trunk.
C.difference(trunk,C.arch('Door_recess_cutter',(0,.49,.50),1.02,1.52,1.05))
entrance=C.empty('Treehouse_entrance',root)
C.archrim('Outer_bark_arch',(0,.50,.65),1.10,1.60,.10,entrance)
C.archrim('Inner_door_casing',(0,.51,.28),.91,1.39,.045,entrance,C.LIGHT)
door=C.arch('Arched_door_leaf',(0,.52,.18),.88,1.35,.085,C.CLAY,entrance);C.bevel(door,.022,3)
# Actual recessed plank seams and a round window aperture.
for x in [-.29,-.145,0,.145,.29]:
 cut=C.box('Plank_groove_cutter',(x,1.02,.23),(.012,1.3,.055),r=.004);C.difference(door,cut)
window=C.ellipsoid('Round_window_cutter',(0,1.53,.19),(.245,.245,.30));C.difference(door,window)
C.ellipsoid('Recessed_window_pane',(0,1.53,.13),(.23,.23,.018),C.INSET,entrance)
C.rod('Window_cross_vertical',(0,1.29,.25),(0,1.77,.25),.033,parent=entrance)
C.rod('Window_cross_horizontal',(-.24,1.53,.25),(.24,1.53,.25),.033,parent=entrance)
C.ellipsoid('Door_handle',(.28,.98,.255),(.043,.043,.025),C.INSET,entrance)
# Bark channels are cut into the connected trunk, not floating decorative rods.
from mathutils import Vector
strokes=[[(-.66,.65),(-.64,1.05),(-.58,1.65),(-.72,2.15),(-1.15,2.6)],[(.67,.62),(.65,1.05),(.59,1.6),(.75,2.15),(1.15,2.58)],[(-.34,2.0),(-.44,2.35),(-.70,2.68)],[(.29,2.0),(.48,2.37),(.74,2.66)]]
for i,stroke in enumerate(strokes):
 points=[]
 for x,y in stroke:
  hit,loc,normal,_=trunk.ray_cast(C.V((x,y,3.0)),C.V((0,0,-1)))
  if hit:
   loc=loc+normal*.004;points.append((loc.x,loc.z,-loc.y))
 if len(points)>1:
  radii=[.15]+[1]*(len(points)-2)+[.15];C.difference(trunk,C.curve('Bark_flow_channel_'+str(i),points,.032,radii))
# Crown masses are individually designed and welded within each cloud-like cluster.
crown=C.empty('Layered_canopy',root)
clusters=[('Left_low',(-1.65,3.33,.05),[(0,0,0,.90,.58,.76),(-.86,.04,-.1,.66,.57,.62),(.64,.18,.06,.72,.61,.69)]),('Left_upper',(-.92,4.0,-.25),[(0,0,0,1.02,.70,.85),(-.82,-.02,.18,.70,.61,.69),(.75,.18,-.05,.80,.67,.72)]),('Crown_apex',(.1,4.25,-.40),[(0,0,0,1.10,.73,.82),(-.82,.12,-.1,.72,.61,.73),(.91,-.05,.03,.76,.69,.71)]),('Right', (1.40,3.85,-.15),[(0,0,0,.94,.69,.86),(.65,-.13,.0,.60,.54,.64),(-.35,.16,.15,.78,.59,.70)]),('Front_lobes',(.10,3.52,.57),[(0,0,0,.98,.63,.67),(-.85,-.04,.02,.70,.56,.65),(.85,.05,-.04,.74,.59,.68),(0,-.36,.32,.55,.41,.46)])]
for name,center,lobes in clusters:
 pieces=[C.ellipsoid(name+'_volume_'+str(i),(center[0]+x,center[1]+y,center[2]+z),(sx,sy,sz)) for i,(x,y,z,sx,sy,sz) in enumerate(lobes)]
 C.union(pieces,'Canopy_'+name,.065,crown)
base=C.empty('Root_terrace_and_steps',root)
# An asymmetrical supporting terrace; the trial is not a complete planet.
outline=[(-1.9,-.9),(-1.2,-1.35),(.3,-1.25),(1.65,-.85),(1.9,.3),(1.15,1.0),(-.5,1.15),(-1.85,.65)]
verts=[(x,y,z) for y in [.02,.46] for x,z in outline];n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
C.bevel(C.mesh('Root_support_terrace',verts,faces,parent=base),.18,5)
for i in range(5):
 top=.46-i*.085;C.box('Entrance_step_'+str(i+1),(0,top/2,1.08+i*.31),(1.15+.035*i,top,.37),parent=base,r=.065)
C.output('treehouse',{'method':'Individually authored tapered branch/root curves; voxel-welded continuous trunk; actual boolean door recess and bark channels; welded multi-lobed canopy clusters; separate arched door, window aperture and stair meshes. Editable construction curves retained.','limits':['Not interactive hand-brush sculpting: curve controls and mesh operations were authored through Blender Python.','Reference small alternate views do not fully specify the rear branch arrangement; rear is inferred.','Canopy lobe rhythm and trunk/door proportions require user art approval; this is not a claim of a reference-quality pass.']})
