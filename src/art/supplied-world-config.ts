import transforms from '../../assets/art/user-models/RUNTIME_TRANSFORMS.json';
export type SuppliedWorldId=keyof typeof transforms;
export function suppliedPoint(id:SuppliedWorldId,p:readonly number[]):[number,number,number]{
 const t=transforms[id],c=Math.cos(t.rotationY),s=Math.sin(t.rotationY);
 return [(c*p[0]+s*p[2])*t.scale+t.translation[0],p[1]*t.scale+t.translation[1],(-s*p[0]+c*p[2])*t.scale+t.translation[2]];
}
export function suppliedLamp(id:SuppliedWorldId):[number,number,number]{
 if(id==='b612')return suppliedPoint(id,[.0841,.5183,.2028]);
 if(id==='rose')return suppliedPoint(id,[-.06716,.51492,.14857]);
 const t=transforms[id];return [.62,.14+t.deskHeight+.64,.23+t.deskDistance+.08];
}
export function suppliedBook(id:SuppliedWorldId):[number,number,number]{
 if(id==='b612')return suppliedPoint(id,[.07221,.44014,.15472]);
 if(id==='rose')return suppliedPoint(id,[.00849,.43434,.13159]);
 const t=transforms[id];return [.8,.14+t.deskHeight+.07,.23+t.deskDistance];
}
export function suppliedFlower(id:SuppliedWorldId):[number,number,number]{
 const points={b612:[.28,.35,.25],moon:[-.22,.41,.20],rose:[-.30,.38,.23],forest:[.26,.34,.18]};
 return suppliedPoint(id,points[id]);
}
export function suppliedView(id:SuppliedWorldId,scale=1){
 const b=transforms[id].bounds;
 const focus:[number,number,number]=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2+.2,(b[0][2]+b[1][2])/2];
 const offset=id==='forest'?[11,6.35,-17]:[8.8,6.35,17];
 const position:[number,number,number]=[focus[0]+offset[0]*scale,focus[1]+offset[1]*scale,focus[2]+offset[2]*scale];
 return {focus,position};
}
