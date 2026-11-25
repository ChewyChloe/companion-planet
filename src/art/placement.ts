import {navigationLanding,WALK_RADIUS,HOME} from "./terrain";
/** Drop only onto reachable ground with space for the complete resident body. */
export function safeDrop(x:number,z:number):[number,number]{
 if(!Number.isFinite(x)||!Number.isFinite(z))return [...HOME];
 const radius=Math.hypot(x,z);if(radius>WALK_RADIUS){x*=WALK_RADIUS/radius;z*=WALK_RADIUS/radius;}
 return navigationLanding(x,z);
}
