import data from './user-world-navigation.json';
type Id=keyof typeof data;
export function userGround(id:string,x:number,z:number):number|null {
 const g=data[id as Id];if(!g)return null;
 const a=Math.max(0,Math.min(g.count-1,(x-g.origin)/g.step)),b=Math.max(0,Math.min(g.count-1,(z-g.origin)/g.step));
 const i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j;
 const h=(p:number,q:number)=>g.heights[Math.min(g.count-1,p)*g.count+Math.min(g.count-1,q)];
 const hs=[h(i,j),h(i+1,j),h(i,j+1),h(i+1,j+1)];
 if(hs.every(n=>n!==null)){const [a,b,c,d]=hs as number[];return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}
 return h(Math.round(a),Math.round(b)) ?? hs.find(n=>n!==null) ?? null;
}
const sets=new Map(Object.entries(data).map(([id,g])=>[id,new Set(g.walkable)]));
export function userWalkable(id:string,x:number,z:number,margin=0) {
 const g=data[id as Id];if(!g)return false;
 for(const [dx,dz] of [[0,0],[-margin,0],[margin,0],[0,-margin],[0,margin]]){
  const i=Math.round((x+dx-g.origin)/g.step),j=Math.round((z+dz-g.origin)/g.step);
  if(i<0||j<0||i>=g.count||j>=g.count||!sets.get(id)?.has(i*g.count+j))return false;
 }return true;
}
export function userHome(id:string):[number,number]{
 const g=data[id as Id];let best:[number,number]=[...g.home] as [number,number],dist=Infinity;
 for(const index of g.walkable){const x=Math.floor(index/g.count)*g.step+g.origin,z=index%g.count*g.step+g.origin;
  if(Math.hypot(x,z)>4||!userWalkable(id,x,z,.22)||(Math.abs(x-.72)<.95&&Math.abs(z-.23)<1))continue;
  const d=(x+.72)**2+(z-.12)**2;if(d<dist){dist=d;best=[x,z];}
 }return best;
}
