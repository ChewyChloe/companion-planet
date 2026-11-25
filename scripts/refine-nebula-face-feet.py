"""Soften the two existing feet and remove baked facial ink from the runtime copy."""
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, distance_transform_edt, gaussian_filter

def refine(path):
    data = path.read_bytes()
    size = struct.unpack_from("<I", data, 12)[0]
    model = json.loads(data[20:20+size])
    binary = bytearray(data[28+size:])
    primitive = model["meshes"][0]["primitives"][0]

    def view(index):
        accessor = model["accessors"][index]
        block = model["bufferViews"][accessor["bufferView"]]
        dtype = {5126:"<f4", 5121:"u1", 5123:"<u2", 5125:"<u4"}[accessor["componentType"]]
        columns = {"SCALAR":1, "VEC2":2, "VEC3":3, "VEC4":4}[accessor["type"]]
        return np.ndarray((accessor["count"], columns), dtype, binary,
                          block.get("byteOffset", 0) + accessor.get("byteOffset", 0))

    attrs = primitive["attributes"]
    pos, normals, uv, joints, weights = [view(attrs[key]) for key in
        ("POSITION", "NORMAL", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0")]
    faces = view(primitive["indices"]).reshape(-1,3)
    original = pos.copy()
    x, y, z = original.T
    def ramp(a,b,t):
        u = np.clip((t-a)/(b-a),0,1)
        return u*u*(3-2*u)

    # The existing foot tips are shortened and rounded in place. Retain UVs,
    # topology, and every vertex above the feet.
    old_foot_weights = ((joints==3)|(joints==7)) & (weights>0)
    for side, foot in [(-1,7),(1,3)]:
        radial = np.hypot((x-side*.155)/.112, (z-.027)/.138)
        envelope = (1-ramp(.75,1.32,radial))*(1-ramp(.045,.128,y))
        active = (side*x>0)&(y<.128)&(radial<1.32)
        pos[active,1] += (envelope*(.010 + .021*ramp(.42,1.12,radial)))[active]
        pos[active,2] -= (envelope*(z-.027)*.23)[active]
        weighted = (side*x>0)&(active|old_foot_weights.any(axis=1))
        influence = ((1-ramp(.62,1.34,radial))*(1-ramp(.014,.137,y)))[weighted]
        joints[weighted] = [1,foot,0,0]
        weights[weighted] = np.column_stack([1-influence,influence,np.zeros_like(influence),np.zeros_like(influence)])

    texture=model["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    image_index=model["textures"][texture]["source"]
    source=model["images"][image_index]
    block=model["bufferViews"][source["bufferView"]]
    start=block.get("byteOffset",0)
    image=Image.open(io.BytesIO(binary[start:start+block["byteLength"]])).convert("RGB")
    pixels=np.array(image)
    width,height=image.size
    selection=Image.new("1",image.size)
    draw=ImageDraw.Draw(selection)
    face_regions=[(-.145,.544,.049,.050),(.138,.541,.049,.050),(.003,.504,.039,.024)]
    in_face=(z>.25)&np.logical_or.reduce([
        ((x-cx)/rx)**2+((y-cy)/ry)**2<1 for cx,cy,rx,ry in face_regions
    ])
    for face in faces[in_face[faces].any(axis=1)]:
        draw.polygon([tuple(v) for v in uv[face]*[width,height]],fill=1)
    selection_array=binary_dilation(np.array(selection,dtype=bool),iterations=12)
    color=pixels.astype(np.int16)
    clean_skin=(color[:,:,2]>145)&(color[:,:,2]-color[:,:,0]>12)
    mask=binary_dilation(selection_array,iterations=8)
    _, nearest=distance_transform_edt(~(clean_skin&~mask),return_indices=True)
    filled=pixels.copy()
    filled[mask]=pixels[nearest[0][mask],nearest[1][mask]]
    for channel in range(3):
        blurred=gaussian_filter(filled[:,:,channel].astype(np.float32),2.2)
        pixels[:,:,channel][mask]=blurred[mask]

    # Remove the shallow baked eye/mouth relief locally so it cannot show
    # through closed-eye expressions. Reconstruct from neighboring skin.
    facial_normals=[]
    for cx,cy,rx,ry in [(-.145,.544,.067,.073),(.138,.541,.067,.073),(.003,.504,.045,.027)]:
        dx=(x-cx)/rx;dy=(y-cy)/ry;radius=np.hypot(dx,dy)
        patch=(z>.25)&(radius>1.12)&(radius<1.52)
        features=np.column_stack([np.ones(len(x)),dx,dy,dx*dx,dy*dy,dx*dy])
        coefficients=np.linalg.lstsq(features[patch],z[patch],rcond=None)[0]
        predicted=features@coefficients
        _,sx,sy,sxx,syy,sxy=coefficients
        normal=np.column_stack([-(sx+2*sxx*dx+sxy*dy)/rx,
                                -(sy+2*syy*dy+sxy*dx)/ry,np.ones(len(x))])
        strength=.97*(1-ramp(.93,1.33,radius))*(z>.25)
        pos[:,2]+=strength*(predicted-z)
        facial_normals.append((normal, (1-ramp(.96,1.36,radius))*(z>.25)))
    # Accumulate only neighboring face-normal changes, keeping the existing
    # authored normals everywhere outside the underside.
    old_tri, new_tri = original[faces], pos[faces]
    old_n=np.cross(old_tri[:,1]-old_tri[:,0],old_tri[:,2]-old_tri[:,0])
    new_n=np.cross(new_tri[:,1]-new_tri[:,0],new_tri[:,2]-new_tri[:,0])
    delta=np.zeros_like(pos); area=np.zeros(len(pos),np.float32)
    for corner in range(3):
        np.add.at(delta,faces[:,corner],new_n-old_n)
        np.add.at(area,faces[:,corner],np.linalg.norm(old_n,axis=1))
    changed=np.linalg.norm(delta,axis=1)>1e-11
    corrected=normals[changed]+delta[changed]/np.maximum(area[changed,None],1e-10)
    normals[changed]=corrected/np.maximum(np.linalg.norm(corrected,axis=1,keepdims=True),1e-10)
    for normal,strength in facial_normals:
        normal/=np.linalg.norm(normal,axis=1,keepdims=True)
        normals[:]=normals*(1-strength[:,None])+normal*strength[:,None]
        normals[:]/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-10)
    bounds=model["accessors"][attrs["POSITION"]]
    bounds.update(min=pos.min(0).tolist(),max=pos.max(0).tolist())

    out=io.BytesIO()
    Image.fromarray(pixels).save(out,format="JPEG",quality=95,subsampling=0)
    replacement=out.getvalue()
    # Keep the source image bytes and append the cleaned face atlas.
    del pos,normals,uv,joints,weights,faces
    binary.extend(b"\0"*(-len(binary)%4))
    model["bufferViews"].append({"buffer":0,"byteOffset":len(binary),"byteLength":len(replacement)})
    binary.extend(replacement)
    binary.extend(b"\0"*(-len(binary)%4))
    model["images"].append({"bufferView":len(model["bufferViews"])-1,"mimeType":"image/jpeg"})
    model["textures"].append({**model["textures"][texture],"source":len(model["images"])-1})
    material=model["materials"][0]
    clean_texture=len(model["textures"])-1
    material["pbrMetallicRoughness"]["baseColorTexture"]["index"]=clean_texture
    if "emissiveTexture" in material:
        material["emissiveTexture"]["index"]=clean_texture
    transmission=material.get("extensions",{}).get("KHR_materials_transmission",{})
    if "transmissionTexture" in transmission:
        transmission["transmissionTexture"]["index"]=clean_texture
    model["buffers"][0]["byteLength"]=len(binary)
    raw=json.dumps(model,separators=(",",":")).encode()
    raw+=b" "*(-len(raw)%4)
    path.write_bytes(struct.pack("<III",0x46546C67,2,28+len(raw)+len(binary))+
                    struct.pack("<II",len(raw),0x4E4F534A)+raw+
                    struct.pack("<II",len(binary),0x004E4942)+binary)
    print(f"Refined {int(changed.sum())} affected foot and facial vertices; cleaned {int(mask.sum())} face texels.")

if __name__ == "__main__":
    refine(Path(__file__).resolve().parents[1]/"public/models/user-residents/nebula.glb")
