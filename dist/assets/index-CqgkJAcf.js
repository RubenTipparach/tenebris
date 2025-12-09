var oc=Object.defineProperty;var ac=(r,e,t)=>e in r?oc(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var v=(r,e,t)=>ac(r,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=t(i);fetch(i.href,s)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ko="181",lc=0,ra=1,cc=2,yl=1,_l=2,Tn=3,Gn=0,Bt=1,Yt=2,Cn=0,ri=1,Wr=2,oa=3,aa=4,hc=5,Qn=100,uc=101,dc=102,fc=103,pc=104,mc=200,gc=201,xc=202,vc=203,Vr=204,qr=205,yc=206,_c=207,Sc=208,bc=209,Tc=210,Ec=211,Mc=212,Cc=213,Ac=214,Xr=0,$r=1,Yr=2,Ei=3,Kr=4,jr=5,Jr=6,Zr=7,Go=0,wc=1,Ic=2,kn=0,Rc=1,Pc=2,Dc=3,Lc=4,Fc=5,Oc=6,Nc=7,Sl=300,Mi=301,Ci=302,Qr=303,eo=304,Js=306,wn=1e3,It=1001,to=1002,ht=1003,Uc=1004,as=1005,rn=1006,or=1007,si=1008,mn=1009,bl=1010,Tl=1011,Ki=1012,Bo=1013,Bn=1014,Mn=1015,Pi=1016,zo=1017,Ho=1018,ji=1020,El=35902,Ml=35899,Cl=1021,Al=1022,un=1023,Ai=1026,Ji=1027,wl=1028,Wo=1029,Vo=1030,qo=1031,Xo=1033,Ns=33776,Us=33777,ks=33778,Gs=33779,no=35840,io=35841,so=35842,ro=35843,oo=36196,ao=37492,lo=37496,co=37808,ho=37809,uo=37810,fo=37811,po=37812,mo=37813,go=37814,xo=37815,vo=37816,yo=37817,_o=37818,So=37819,bo=37820,To=37821,Eo=36492,Mo=36494,Co=36495,Ao=36283,wo=36284,Io=36285,Ro=36286,kc=3200,Gc=3201,Il=0,Bc=1,Nn="",sn="srgb",wi="srgb-linear",$s="linear",xt="srgb",li=7680,la=519,zc=512,Hc=513,Wc=514,Rl=515,Vc=516,qc=517,Xc=518,$c=519,ca=35044,ha="300 es",pn=2e3,Ys=2001;function Pl(r){for(let e=r.length-1;e>=0;--e)if(r[e]>=65535)return!0;return!1}function Zi(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Yc(){const r=Zi("canvas");return r.style.display="block",r}const ua={};function da(...r){const e="THREE."+r.shift();console.log(e,...r)}function Je(...r){const e="THREE."+r.shift();console.warn(e,...r)}function wt(...r){const e="THREE."+r.shift();console.error(e,...r)}function Qi(...r){const e=r.join(" ");e in ua||(ua[e]=!0,Je(...r))}function Kc(r,e,t){return new Promise(function(n,i){function s(){switch(r.clientWaitSync(e,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:i();break;case r.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}class Di{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let s=0,o=i.length;s<o;s++)i[s].call(this,e);e.target=null}}}const Ut=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],ar=Math.PI/180,Po=180/Math.PI;function ts(){const r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ut[r&255]+Ut[r>>8&255]+Ut[r>>16&255]+Ut[r>>24&255]+"-"+Ut[e&255]+Ut[e>>8&255]+"-"+Ut[e>>16&15|64]+Ut[e>>24&255]+"-"+Ut[t&63|128]+Ut[t>>8&255]+"-"+Ut[t>>16&255]+Ut[t>>24&255]+Ut[n&255]+Ut[n>>8&255]+Ut[n>>16&255]+Ut[n>>24&255]).toLowerCase()}function lt(r,e,t){return Math.max(e,Math.min(t,r))}function jc(r,e){return(r%e+e)%e}function lr(r,e,t){return(1-t)*r+t*e}function Oi(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function $t(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}class ct{constructor(e=0,t=0){ct.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(lt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*n-o*i+e.x,this.y=s*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ze{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,o,a){let l=n[i+0],c=n[i+1],u=n[i+2],h=n[i+3],d=s[o+0],f=s[o+1],p=s[o+2],g=s[o+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h;return}if(a>=1){e[t+0]=d,e[t+1]=f,e[t+2]=p,e[t+3]=g;return}if(h!==g||l!==d||c!==f||u!==p){let x=l*d+c*f+u*p+h*g;x<0&&(d=-d,f=-f,p=-p,g=-g,x=-x);let m=1-a;if(x<.9995){const y=Math.acos(x),_=Math.sin(y);m=Math.sin(m*y)/_,a=Math.sin(a*y)/_,l=l*m+d*a,c=c*m+f*a,u=u*m+p*a,h=h*m+g*a}else{l=l*m+d*a,c=c*m+f*a,u=u*m+p*a,h=h*m+g*a;const y=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=y,c*=y,u*=y,h*=y}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,i,s,o){const a=n[i],l=n[i+1],c=n[i+2],u=n[i+3],h=s[o],d=s[o+1],f=s[o+2],p=s[o+3];return e[t]=a*p+u*h+l*f-c*d,e[t+1]=l*p+u*d+c*h-a*f,e[t+2]=c*p+u*f+a*d-l*h,e[t+3]=u*p-a*h-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(i/2),h=a(s/2),d=l(n/2),f=l(i/2),p=l(s/2);switch(o){case"XYZ":this._x=d*u*h+c*f*p,this._y=c*f*h-d*u*p,this._z=c*u*p+d*f*h,this._w=c*u*h-d*f*p;break;case"YXZ":this._x=d*u*h+c*f*p,this._y=c*f*h-d*u*p,this._z=c*u*p-d*f*h,this._w=c*u*h+d*f*p;break;case"ZXY":this._x=d*u*h-c*f*p,this._y=c*f*h+d*u*p,this._z=c*u*p+d*f*h,this._w=c*u*h-d*f*p;break;case"ZYX":this._x=d*u*h-c*f*p,this._y=c*f*h+d*u*p,this._z=c*u*p-d*f*h,this._w=c*u*h+d*f*p;break;case"YZX":this._x=d*u*h+c*f*p,this._y=c*f*h+d*u*p,this._z=c*u*p-d*f*h,this._w=c*u*h-d*f*p;break;case"XZY":this._x=d*u*h-c*f*p,this._y=c*f*h-d*u*p,this._z=c*u*p+d*f*h,this._w=c*u*h+d*f*p;break;default:Je("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],h=t[10],d=n+a+h;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(o-i)*f}else if(n>a&&n>h){const f=2*Math.sqrt(1+n-a-h);this._w=(u-l)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(s+c)/f}else if(a>h){const f=2*Math.sqrt(1+a-n-h);this._w=(s-c)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(l+u)/f}else{const f=2*Math.sqrt(1+h-n-a);this._w=(o-i)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(lt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+i*c-s*l,this._y=i*u+o*l+s*a-n*c,this._z=s*u+o*c+n*l-i*a,this._w=o*u-n*a-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,s=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,s=-s,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class R{constructor(e=0,t=0,n=0){R.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(fa.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(fa.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=e.elements,o=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*o,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*o,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*i-a*n),u=2*(a*t-s*i),h=2*(s*n-o*t);return this.x=t+l*c+o*h-a*u,this.y=n+l*u+a*c-s*h,this.z=i+l*h+s*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this.z=lt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this.z=lt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=i*l-s*a,this.y=s*o-n*l,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return cr.copy(this).projectOnVector(e),this.sub(cr)}reflect(e){return this.sub(cr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(lt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const cr=new R,fa=new Ze;class et{constructor(e,t,n,i,s,o,a,l,c){et.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c)}set(e,t,n,i,s,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=i,u[2]=a,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],h=n[7],d=n[2],f=n[5],p=n[8],g=i[0],x=i[3],m=i[6],y=i[1],_=i[4],C=i[7],b=i[2],S=i[5],A=i[8];return s[0]=o*g+a*y+l*b,s[3]=o*x+a*_+l*S,s[6]=o*m+a*C+l*A,s[1]=c*g+u*y+h*b,s[4]=c*x+u*_+h*S,s[7]=c*m+u*C+h*A,s[2]=d*g+f*y+p*b,s[5]=d*x+f*_+p*S,s[8]=d*m+f*C+p*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*s*u+n*a*l+i*s*c-i*o*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=u*o-a*c,d=a*l-u*s,f=c*s-o*l,p=t*h+n*d+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/p;return e[0]=h*g,e[1]=(i*c-u*n)*g,e[2]=(a*n-i*o)*g,e[3]=d*g,e[4]=(u*t-i*l)*g,e[5]=(i*s-a*t)*g,e[6]=f*g,e[7]=(n*l-c*t)*g,e[8]=(o*t-n*s)*g,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-i*c,i*l,-i*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(hr.makeScale(e,t)),this}rotate(e){return this.premultiply(hr.makeRotation(-e)),this}translate(e,t){return this.premultiply(hr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const hr=new et,pa=new et().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ma=new et().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Jc(){const r={enabled:!0,workingColorSpace:wi,spaces:{},convert:function(i,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===xt&&(i.r=An(i.r),i.g=An(i.g),i.b=An(i.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===xt&&(i.r=Ti(i.r),i.g=Ti(i.g),i.b=Ti(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Nn?$s:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,o){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return Qi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return Qi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return r.define({[wi]:{primaries:e,whitePoint:n,transfer:$s,toXYZ:pa,fromXYZ:ma,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:sn},outputColorSpaceConfig:{drawingBufferColorSpace:sn}},[sn]:{primaries:e,whitePoint:n,transfer:xt,toXYZ:pa,fromXYZ:ma,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:sn}}}),r}const dt=Jc();function An(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function Ti(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}let ci;class Zc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ci===void 0&&(ci=Zi("canvas")),ci.width=e.width,ci.height=e.height;const i=ci.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=ci}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Zi("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let o=0;o<s.length;o++)s[o]=An(s[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(An(t[n]/255)*255):t[n]=An(t[n]);return{data:t,width:e.width,height:e.height}}else return Je("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Qc=0;class $o{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Qc++}),this.uuid=ts(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?s.push(ur(i[o].image)):s.push(ur(i[o]))}else s=ur(i);n.url=s}return t||(e.images[this.uuid]=n),n}}function ur(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Zc.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(Je("Texture: Unable to serialize Texture."),{})}let eh=0;const dr=new R;class zt extends Di{constructor(e=zt.DEFAULT_IMAGE,t=zt.DEFAULT_MAPPING,n=It,i=It,s=rn,o=si,a=un,l=mn,c=zt.DEFAULT_ANISOTROPY,u=Nn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:eh++}),this.uuid=ts(),this.name="",this.source=new $o(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ct(0,0),this.repeat=new ct(1,1),this.center=new ct(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new et,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(dr).x}get height(){return this.source.getSize(dr).y}get depth(){return this.source.getSize(dr).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Je(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Je(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Sl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case wn:e.x=e.x-Math.floor(e.x);break;case It:e.x=e.x<0?0:1;break;case to:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case wn:e.y=e.y-Math.floor(e.y);break;case It:e.y=e.y<0?0:1;break;case to:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}zt.DEFAULT_IMAGE=null;zt.DEFAULT_MAPPING=Sl;zt.DEFAULT_ANISOTROPY=1;class vt{constructor(e=0,t=0,n=0,i=1){vt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*s,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*s,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*s,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s;const l=e.elements,c=l[0],u=l[4],h=l[8],d=l[1],f=l[5],p=l[9],g=l[2],x=l[6],m=l[10];if(Math.abs(u-d)<.01&&Math.abs(h-g)<.01&&Math.abs(p-x)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+g)<.1&&Math.abs(p+x)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,C=(f+1)/2,b=(m+1)/2,S=(u+d)/4,A=(h+g)/4,L=(p+x)/4;return _>C&&_>b?_<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(_),i=S/n,s=A/n):C>b?C<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(C),n=S/i,s=L/i):b<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(b),n=A/s,i=L/s),this.set(n,i,s,t),this}let y=Math.sqrt((x-p)*(x-p)+(h-g)*(h-g)+(d-u)*(d-u));return Math.abs(y)<.001&&(y=1),this.x=(x-p)/y,this.y=(h-g)/y,this.z=(d-u)/y,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this.z=lt(this.z,e.z,t.z),this.w=lt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this.z=lt(this.z,e,t),this.w=lt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class th extends Di{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:rn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new vt(0,0,e,t),this.scissorTest=!1,this.viewport=new vt(0,0,e,t);const i={width:e,height:t,depth:n.depth},s=new zt(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:rn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new $o(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class zn extends th{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Dl extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ht,this.minFilter=ht,this.wrapR=It,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class nh extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ht,this.minFilter=ht,this.wrapR=It,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ns{constructor(e=new R(1/0,1/0,1/0),t=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(an.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(an.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=an.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,an):an.fromBufferAttribute(s,o),an.applyMatrix4(e.matrixWorld),this.expandByPoint(an);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ls.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ls.copy(n.boundingBox)),ls.applyMatrix4(e.matrixWorld),this.union(ls)}const i=e.children;for(let s=0,o=i.length;s<o;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,an),an.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ni),cs.subVectors(this.max,Ni),hi.subVectors(e.a,Ni),ui.subVectors(e.b,Ni),di.subVectors(e.c,Ni),Rn.subVectors(ui,hi),Pn.subVectors(di,ui),Xn.subVectors(hi,di);let t=[0,-Rn.z,Rn.y,0,-Pn.z,Pn.y,0,-Xn.z,Xn.y,Rn.z,0,-Rn.x,Pn.z,0,-Pn.x,Xn.z,0,-Xn.x,-Rn.y,Rn.x,0,-Pn.y,Pn.x,0,-Xn.y,Xn.x,0];return!fr(t,hi,ui,di,cs)||(t=[1,0,0,0,1,0,0,0,1],!fr(t,hi,ui,di,cs))?!1:(hs.crossVectors(Rn,Pn),t=[hs.x,hs.y,hs.z],fr(t,hi,ui,di,cs))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,an).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(an).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(xn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const xn=[new R,new R,new R,new R,new R,new R,new R,new R],an=new R,ls=new ns,hi=new R,ui=new R,di=new R,Rn=new R,Pn=new R,Xn=new R,Ni=new R,cs=new R,hs=new R,$n=new R;function fr(r,e,t,n,i){for(let s=0,o=r.length-3;s<=o;s+=3){$n.fromArray(r,s);const a=i.x*Math.abs($n.x)+i.y*Math.abs($n.y)+i.z*Math.abs($n.z),l=e.dot($n),c=t.dot($n),u=n.dot($n);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const ih=new ns,Ui=new R,pr=new R;class oi{constructor(e=new R,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):ih.setFromPoints(e).getCenter(n);let i=0;for(let s=0,o=e.length;s<o;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ui.subVectors(e,this.center);const t=Ui.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Ui,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(pr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ui.copy(e.center).add(pr)),this.expandByPoint(Ui.copy(e.center).sub(pr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const vn=new R,mr=new R,us=new R,Dn=new R,gr=new R,ds=new R,xr=new R;class Zs{constructor(e=new R,t=new R(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,vn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=vn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(vn.copy(this.origin).addScaledVector(this.direction,t),vn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){mr.copy(e).add(t).multiplyScalar(.5),us.copy(t).sub(e).normalize(),Dn.copy(this.origin).sub(mr);const s=e.distanceTo(t)*.5,o=-this.direction.dot(us),a=Dn.dot(this.direction),l=-Dn.dot(us),c=Dn.lengthSq(),u=Math.abs(1-o*o);let h,d,f,p;if(u>0)if(h=o*l-a,d=o*a-l,p=s*u,h>=0)if(d>=-p)if(d<=p){const g=1/u;h*=g,d*=g,f=h*(h+o*d+2*a)+d*(o*h+d+2*l)+c}else d=s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d=-s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d<=-p?(h=Math.max(0,-(-o*s+a)),d=h>0?-s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c):d<=p?(h=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(h=Math.max(0,-(o*s+a)),d=h>0?s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c);else d=o>0?-s:s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,h),i&&i.copy(mr).addScaledVector(us,d),f}intersectSphere(e,t){vn.subVectors(e.center,this.origin);const n=vn.dot(this.direction),i=vn.dot(vn)-n*n,s=e.radius*e.radius;if(i>s)return null;const o=Math.sqrt(s-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,i=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,i=(e.min.x-d.x)*c),u>=0?(s=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),n>o||s>i||((s>n||isNaN(n))&&(n=s),(o<i||isNaN(i))&&(i=o),h>=0?(a=(e.min.z-d.z)*h,l=(e.max.z-d.z)*h):(a=(e.max.z-d.z)*h,l=(e.min.z-d.z)*h),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,vn)!==null}intersectTriangle(e,t,n,i,s){gr.subVectors(t,e),ds.subVectors(n,e),xr.crossVectors(gr,ds);let o=this.direction.dot(xr),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Dn.subVectors(this.origin,e);const l=a*this.direction.dot(ds.crossVectors(Dn,ds));if(l<0)return null;const c=a*this.direction.dot(gr.cross(Dn));if(c<0||l+c>o)return null;const u=-a*Dn.dot(xr);return u<0?null:this.at(u/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ft{constructor(e,t,n,i,s,o,a,l,c,u,h,d,f,p,g,x){ft.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c,u,h,d,f,p,g,x)}set(e,t,n,i,s,o,a,l,c,u,h,d,f,p,g,x){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=i,m[1]=s,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=u,m[10]=h,m[14]=d,m[3]=f,m[7]=p,m[11]=g,m[15]=x,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ft().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/fi.setFromMatrixColumn(e,0).length(),s=1/fi.setFromMatrixColumn(e,1).length(),o=1/fi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,s=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const d=o*u,f=o*h,p=a*u,g=a*h;t[0]=l*u,t[4]=-l*h,t[8]=c,t[1]=f+p*c,t[5]=d-g*c,t[9]=-a*l,t[2]=g-d*c,t[6]=p+f*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*u,f=l*h,p=c*u,g=c*h;t[0]=d+g*a,t[4]=p*a-f,t[8]=o*c,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=f*a-p,t[6]=g+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*u,f=l*h,p=c*u,g=c*h;t[0]=d-g*a,t[4]=-o*h,t[8]=p+f*a,t[1]=f+p*a,t[5]=o*u,t[9]=g-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*u,f=o*h,p=a*u,g=a*h;t[0]=l*u,t[4]=p*c-f,t[8]=d*c+g,t[1]=l*h,t[5]=g*c+d,t[9]=f*c-p,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,f=o*c,p=a*l,g=a*c;t[0]=l*u,t[4]=g-d*h,t[8]=p*h+f,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=f*h+p,t[10]=d-g*h}else if(e.order==="XZY"){const d=o*l,f=o*c,p=a*l,g=a*c;t[0]=l*u,t[4]=-h,t[8]=c*u,t[1]=d*h+g,t[5]=o*u,t[9]=f*h-p,t[2]=p*h-f,t[6]=a*u,t[10]=g*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(sh,e,rh)}lookAt(e,t,n){const i=this.elements;return Jt.subVectors(e,t),Jt.lengthSq()===0&&(Jt.z=1),Jt.normalize(),Ln.crossVectors(n,Jt),Ln.lengthSq()===0&&(Math.abs(n.z)===1?Jt.x+=1e-4:Jt.z+=1e-4,Jt.normalize(),Ln.crossVectors(n,Jt)),Ln.normalize(),fs.crossVectors(Jt,Ln),i[0]=Ln.x,i[4]=fs.x,i[8]=Jt.x,i[1]=Ln.y,i[5]=fs.y,i[9]=Jt.y,i[2]=Ln.z,i[6]=fs.z,i[10]=Jt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],h=n[5],d=n[9],f=n[13],p=n[2],g=n[6],x=n[10],m=n[14],y=n[3],_=n[7],C=n[11],b=n[15],S=i[0],A=i[4],L=i[8],E=i[12],T=i[1],I=i[5],F=i[9],G=i[13],z=i[2],X=i[6],V=i[10],Q=i[14],q=i[3],ee=i[7],te=i[11],pe=i[15];return s[0]=o*S+a*T+l*z+c*q,s[4]=o*A+a*I+l*X+c*ee,s[8]=o*L+a*F+l*V+c*te,s[12]=o*E+a*G+l*Q+c*pe,s[1]=u*S+h*T+d*z+f*q,s[5]=u*A+h*I+d*X+f*ee,s[9]=u*L+h*F+d*V+f*te,s[13]=u*E+h*G+d*Q+f*pe,s[2]=p*S+g*T+x*z+m*q,s[6]=p*A+g*I+x*X+m*ee,s[10]=p*L+g*F+x*V+m*te,s[14]=p*E+g*G+x*Q+m*pe,s[3]=y*S+_*T+C*z+b*q,s[7]=y*A+_*I+C*X+b*ee,s[11]=y*L+_*F+C*V+b*te,s[15]=y*E+_*G+C*Q+b*pe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],h=e[6],d=e[10],f=e[14],p=e[3],g=e[7],x=e[11],m=e[15];return p*(+s*l*h-i*c*h-s*a*d+n*c*d+i*a*f-n*l*f)+g*(+t*l*f-t*c*d+s*o*d-i*o*f+i*c*u-s*l*u)+x*(+t*c*h-t*a*f-s*o*h+n*o*f+s*a*u-n*c*u)+m*(-i*a*u-t*l*h+t*a*d+i*o*h-n*o*d+n*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],d=e[10],f=e[11],p=e[12],g=e[13],x=e[14],m=e[15],y=h*x*c-g*d*c+g*l*f-a*x*f-h*l*m+a*d*m,_=p*d*c-u*x*c-p*l*f+o*x*f+u*l*m-o*d*m,C=u*g*c-p*h*c+p*a*f-o*g*f-u*a*m+o*h*m,b=p*h*l-u*g*l-p*a*d+o*g*d+u*a*x-o*h*x,S=t*y+n*_+i*C+s*b;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/S;return e[0]=y*A,e[1]=(g*d*s-h*x*s-g*i*f+n*x*f+h*i*m-n*d*m)*A,e[2]=(a*x*s-g*l*s+g*i*c-n*x*c-a*i*m+n*l*m)*A,e[3]=(h*l*s-a*d*s-h*i*c+n*d*c+a*i*f-n*l*f)*A,e[4]=_*A,e[5]=(u*x*s-p*d*s+p*i*f-t*x*f-u*i*m+t*d*m)*A,e[6]=(p*l*s-o*x*s-p*i*c+t*x*c+o*i*m-t*l*m)*A,e[7]=(o*d*s-u*l*s+u*i*c-t*d*c-o*i*f+t*l*f)*A,e[8]=C*A,e[9]=(p*h*s-u*g*s-p*n*f+t*g*f+u*n*m-t*h*m)*A,e[10]=(o*g*s-p*a*s+p*n*c-t*g*c-o*n*m+t*a*m)*A,e[11]=(u*a*s-o*h*s-u*n*c+t*h*c+o*n*f-t*a*f)*A,e[12]=b*A,e[13]=(u*g*i-p*h*i+p*n*d-t*g*d-u*n*x+t*h*x)*A,e[14]=(p*a*i-o*g*i-p*n*l+t*g*l+o*n*x-t*a*x)*A,e[15]=(o*h*i-u*a*i+u*n*l-t*h*l-o*n*d+t*a*d)*A,this}scale(e){const t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),s=1-n,o=e.x,a=e.y,l=e.z,c=s*o,u=s*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,u*a+n,u*l-i*o,0,c*l-i*a,u*l+i*o,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,o){return this.set(1,n,s,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,u=o+o,h=a+a,d=s*c,f=s*u,p=s*h,g=o*u,x=o*h,m=a*h,y=l*c,_=l*u,C=l*h,b=n.x,S=n.y,A=n.z;return i[0]=(1-(g+m))*b,i[1]=(f+C)*b,i[2]=(p-_)*b,i[3]=0,i[4]=(f-C)*S,i[5]=(1-(d+m))*S,i[6]=(x+y)*S,i[7]=0,i[8]=(p+_)*A,i[9]=(x-y)*A,i[10]=(1-(d+g))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let s=fi.set(i[0],i[1],i[2]).length();const o=fi.set(i[4],i[5],i[6]).length(),a=fi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],ln.copy(this);const c=1/s,u=1/o,h=1/a;return ln.elements[0]*=c,ln.elements[1]*=c,ln.elements[2]*=c,ln.elements[4]*=u,ln.elements[5]*=u,ln.elements[6]*=u,ln.elements[8]*=h,ln.elements[9]*=h,ln.elements[10]*=h,t.setFromRotationMatrix(ln),n.x=s,n.y=o,n.z=a,this}makePerspective(e,t,n,i,s,o,a=pn,l=!1){const c=this.elements,u=2*s/(t-e),h=2*s/(n-i),d=(t+e)/(t-e),f=(n+i)/(n-i);let p,g;if(l)p=s/(o-s),g=o*s/(o-s);else if(a===pn)p=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===Ys)p=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,o,a=pn,l=!1){const c=this.elements,u=2/(t-e),h=2/(n-i),d=-(t+e)/(t-e),f=-(n+i)/(n-i);let p,g;if(l)p=1/(o-s),g=o/(o-s);else if(a===pn)p=-2/(o-s),g=-(o+s)/(o-s);else if(a===Ys)p=-1/(o-s),g=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=h,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const fi=new R,ln=new ft,sh=new R(0,0,0),rh=new R(1,1,1),Ln=new R,fs=new R,Jt=new R,ga=new ft,xa=new Ze;class en{constructor(e=0,t=0,n=0,i=en.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,s=i[0],o=i[4],a=i[8],l=i[1],c=i[5],u=i[9],h=i[2],d=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(lt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-lt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(lt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-lt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(lt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-lt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:Je("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ga.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ga,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xa.setFromEuler(this),this.setFromQuaternion(xa,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}en.DEFAULT_ORDER="XYZ";class Yo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let oh=0;const va=new R,pi=new Ze,yn=new ft,ps=new R,ki=new R,ah=new R,lh=new Ze,ya=new R(1,0,0),_a=new R(0,1,0),Sa=new R(0,0,1),ba={type:"added"},ch={type:"removed"},mi={type:"childadded",child:null},vr={type:"childremoved",child:null};class Dt extends Di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:oh++}),this.uuid=ts(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Dt.DEFAULT_UP.clone();const e=new R,t=new en,n=new Ze,i=new R(1,1,1);function s(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ft},normalMatrix:{value:new et}}),this.matrix=new ft,this.matrixWorld=new ft,this.matrixAutoUpdate=Dt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Yo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return pi.setFromAxisAngle(e,t),this.quaternion.multiply(pi),this}rotateOnWorldAxis(e,t){return pi.setFromAxisAngle(e,t),this.quaternion.premultiply(pi),this}rotateX(e){return this.rotateOnAxis(ya,e)}rotateY(e){return this.rotateOnAxis(_a,e)}rotateZ(e){return this.rotateOnAxis(Sa,e)}translateOnAxis(e,t){return va.copy(e).applyQuaternion(this.quaternion),this.position.add(va.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ya,e)}translateY(e){return this.translateOnAxis(_a,e)}translateZ(e){return this.translateOnAxis(Sa,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(yn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ps.copy(e):ps.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),ki.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?yn.lookAt(ki,ps,this.up):yn.lookAt(ps,ki,this.up),this.quaternion.setFromRotationMatrix(yn),i&&(yn.extractRotation(i.matrixWorld),pi.setFromRotationMatrix(yn),this.quaternion.premultiply(pi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(wt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ba),mi.child=e,this.dispatchEvent(mi),mi.child=null):wt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ch),vr.child=e,this.dispatchEvent(vr),vr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),yn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),yn.multiply(e.parent.matrixWorld)),e.applyMatrix4(yn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ba),mi.child=e,this.dispatchEvent(mi),mi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,e,ah),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,lh,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(e.shapes,h)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));i.material=a}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),h=o(e.shapes),d=o(e.skeletons),f=o(e.animations),p=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}Dt.DEFAULT_UP=new R(0,1,0);Dt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const cn=new R,_n=new R,yr=new R,Sn=new R,gi=new R,xi=new R,Ta=new R,_r=new R,Sr=new R,br=new R,Tr=new vt,Er=new vt,Mr=new vt;class hn{constructor(e=new R,t=new R,n=new R){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),cn.subVectors(e,t),i.cross(cn);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){cn.subVectors(i,t),_n.subVectors(n,t),yr.subVectors(e,t);const o=cn.dot(cn),a=cn.dot(_n),l=cn.dot(yr),c=_n.dot(_n),u=_n.dot(yr),h=o*c-a*a;if(h===0)return s.set(0,0,0),null;const d=1/h,f=(c*l-a*u)*d,p=(o*u-a*l)*d;return s.set(1-f-p,p,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Sn)===null?!1:Sn.x>=0&&Sn.y>=0&&Sn.x+Sn.y<=1}static getInterpolation(e,t,n,i,s,o,a,l){return this.getBarycoord(e,t,n,i,Sn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Sn.x),l.addScaledVector(o,Sn.y),l.addScaledVector(a,Sn.z),l)}static getInterpolatedAttribute(e,t,n,i,s,o){return Tr.setScalar(0),Er.setScalar(0),Mr.setScalar(0),Tr.fromBufferAttribute(e,t),Er.fromBufferAttribute(e,n),Mr.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(Tr,s.x),o.addScaledVector(Er,s.y),o.addScaledVector(Mr,s.z),o}static isFrontFacing(e,t,n,i){return cn.subVectors(n,t),_n.subVectors(e,t),cn.cross(_n).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return cn.subVectors(this.c,this.b),_n.subVectors(this.a,this.b),cn.cross(_n).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return hn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return hn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return hn.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return hn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return hn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,s=this.c;let o,a;gi.subVectors(i,n),xi.subVectors(s,n),_r.subVectors(e,n);const l=gi.dot(_r),c=xi.dot(_r);if(l<=0&&c<=0)return t.copy(n);Sr.subVectors(e,i);const u=gi.dot(Sr),h=xi.dot(Sr);if(u>=0&&h<=u)return t.copy(i);const d=l*h-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(n).addScaledVector(gi,o);br.subVectors(e,s);const f=gi.dot(br),p=xi.dot(br);if(p>=0&&f<=p)return t.copy(s);const g=f*c-l*p;if(g<=0&&c>=0&&p<=0)return a=c/(c-p),t.copy(n).addScaledVector(xi,a);const x=u*p-f*h;if(x<=0&&h-u>=0&&f-p>=0)return Ta.subVectors(s,i),a=(h-u)/(h-u+(f-p)),t.copy(i).addScaledVector(Ta,a);const m=1/(x+g+d);return o=g*m,a=d*m,t.copy(n).addScaledVector(gi,o).addScaledVector(xi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ll={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Fn={h:0,s:0,l:0},ms={h:0,s:0,l:0};function Cr(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}class Oe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=sn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,dt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=dt.workingColorSpace){return this.r=e,this.g=t,this.b=n,dt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=dt.workingColorSpace){if(e=jc(e,1),t=lt(t,0,1),n=lt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,o=2*n-s;this.r=Cr(o,s,e+1/3),this.g=Cr(o,s,e),this.b=Cr(o,s,e-1/3)}return dt.colorSpaceToWorking(this,i),this}setStyle(e,t=sn){function n(s){s!==void 0&&parseFloat(s)<1&&Je("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Je("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=i[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);Je("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=sn){const n=Ll[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Je("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=An(e.r),this.g=An(e.g),this.b=An(e.b),this}copyLinearToSRGB(e){return this.r=Ti(e.r),this.g=Ti(e.g),this.b=Ti(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=sn){return dt.workingToColorSpace(kt.copy(this),e),Math.round(lt(kt.r*255,0,255))*65536+Math.round(lt(kt.g*255,0,255))*256+Math.round(lt(kt.b*255,0,255))}getHexString(e=sn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=dt.workingColorSpace){dt.workingToColorSpace(kt.copy(this),t);const n=kt.r,i=kt.g,s=kt.b,o=Math.max(n,i,s),a=Math.min(n,i,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const h=o-a;switch(c=u<=.5?h/(o+a):h/(2-o-a),o){case n:l=(i-s)/h+(i<s?6:0);break;case i:l=(s-n)/h+2;break;case s:l=(n-i)/h+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=dt.workingColorSpace){return dt.workingToColorSpace(kt.copy(this),t),e.r=kt.r,e.g=kt.g,e.b=kt.b,e}getStyle(e=sn){dt.workingToColorSpace(kt.copy(this),e);const t=kt.r,n=kt.g,i=kt.b;return e!==sn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Fn),this.setHSL(Fn.h+e,Fn.s+t,Fn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Fn),e.getHSL(ms);const n=lr(Fn.h,ms.h,t),i=lr(Fn.s,ms.s,t),s=lr(Fn.l,ms.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const kt=new Oe;Oe.NAMES=Ll;let hh=0;class gn extends Di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:hh++}),this.uuid=ts(),this.name="",this.type="Material",this.blending=ri,this.side=Gn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Vr,this.blendDst=qr,this.blendEquation=Qn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Oe(0,0,0),this.blendAlpha=0,this.depthFunc=Ei,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=la,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=li,this.stencilZFail=li,this.stencilZPass=li,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Je(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Je(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ri&&(n.blending=this.blending),this.side!==Gn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Vr&&(n.blendSrc=this.blendSrc),this.blendDst!==qr&&(n.blendDst=this.blendDst),this.blendEquation!==Qn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ei&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==la&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==li&&(n.stencilFail=this.stencilFail),this.stencilZFail!==li&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==li&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=i(e.textures),o=i(e.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class is extends gn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new en,this.combine=Go,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Rt=new R,gs=new ct;let uh=0;class Tt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:uh++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=ca,this.updateRanges=[],this.gpuType=Mn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)gs.fromBufferAttribute(this,t),gs.applyMatrix3(e),this.setXY(t,gs.x,gs.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix3(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix4(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyNormalMatrix(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.transformDirection(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Oi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=$t(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Oi(t,this.array)),t}setX(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Oi(t,this.array)),t}setY(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Oi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Oi(t,this.array)),t}setW(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array),i=$t(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array),i=$t(i,this.array),s=$t(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ca&&(e.usage=this.usage),e}}class Fl extends Tt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Ol extends Tt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ue extends Tt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let dh=0;const nn=new ft,Ar=new Dt,vi=new R,Zt=new ns,Gi=new ns,Ot=new R;class pt extends Di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:dh++}),this.uuid=ts(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Pl(e)?Ol:Fl)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new et().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return nn.makeRotationFromQuaternion(e),this.applyMatrix4(nn),this}rotateX(e){return nn.makeRotationX(e),this.applyMatrix4(nn),this}rotateY(e){return nn.makeRotationY(e),this.applyMatrix4(nn),this}rotateZ(e){return nn.makeRotationZ(e),this.applyMatrix4(nn),this}translate(e,t,n){return nn.makeTranslation(e,t,n),this.applyMatrix4(nn),this}scale(e,t,n){return nn.makeScale(e,t,n),this.applyMatrix4(nn),this}lookAt(e){return Ar.lookAt(e),Ar.updateMatrix(),this.applyMatrix4(Ar.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(vi).negate(),this.translate(vi.x,vi.y,vi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,s=e.length;i<s;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ue(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&Je("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ns);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){wt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const s=t[n];Zt.setFromBufferAttribute(s),this.morphTargetsRelative?(Ot.addVectors(this.boundingBox.min,Zt.min),this.boundingBox.expandByPoint(Ot),Ot.addVectors(this.boundingBox.max,Zt.max),this.boundingBox.expandByPoint(Ot)):(this.boundingBox.expandByPoint(Zt.min),this.boundingBox.expandByPoint(Zt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&wt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new oi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){wt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(e){const n=this.boundingSphere.center;if(Zt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Gi.setFromBufferAttribute(a),this.morphTargetsRelative?(Ot.addVectors(Zt.min,Gi.min),Zt.expandByPoint(Ot),Ot.addVectors(Zt.max,Gi.max),Zt.expandByPoint(Ot)):(Zt.expandByPoint(Gi.min),Zt.expandByPoint(Gi.max))}Zt.getCenter(n);let i=0;for(let s=0,o=e.count;s<o;s++)Ot.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(Ot));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Ot.fromBufferAttribute(a,c),l&&(vi.fromBufferAttribute(e,c),Ot.add(vi)),i=Math.max(i,n.distanceToSquared(Ot))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&wt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){wt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Tt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<n.count;L++)a[L]=new R,l[L]=new R;const c=new R,u=new R,h=new R,d=new ct,f=new ct,p=new ct,g=new R,x=new R;function m(L,E,T){c.fromBufferAttribute(n,L),u.fromBufferAttribute(n,E),h.fromBufferAttribute(n,T),d.fromBufferAttribute(s,L),f.fromBufferAttribute(s,E),p.fromBufferAttribute(s,T),u.sub(c),h.sub(c),f.sub(d),p.sub(d);const I=1/(f.x*p.y-p.x*f.y);isFinite(I)&&(g.copy(u).multiplyScalar(p.y).addScaledVector(h,-f.y).multiplyScalar(I),x.copy(h).multiplyScalar(f.x).addScaledVector(u,-p.x).multiplyScalar(I),a[L].add(g),a[E].add(g),a[T].add(g),l[L].add(x),l[E].add(x),l[T].add(x))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let L=0,E=y.length;L<E;++L){const T=y[L],I=T.start,F=T.count;for(let G=I,z=I+F;G<z;G+=3)m(e.getX(G+0),e.getX(G+1),e.getX(G+2))}const _=new R,C=new R,b=new R,S=new R;function A(L){b.fromBufferAttribute(i,L),S.copy(b);const E=a[L];_.copy(E),_.sub(b.multiplyScalar(b.dot(E))).normalize(),C.crossVectors(S,E);const I=C.dot(l[L])<0?-1:1;o.setXYZW(L,_.x,_.y,_.z,I)}for(let L=0,E=y.length;L<E;++L){const T=y[L],I=T.start,F=T.count;for(let G=I,z=I+F;G<z;G+=3)A(e.getX(G+0)),A(e.getX(G+1)),A(e.getX(G+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Tt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new R,s=new R,o=new R,a=new R,l=new R,c=new R,u=new R,h=new R;if(e)for(let d=0,f=e.count;d<f;d+=3){const p=e.getX(d+0),g=e.getX(d+1),x=e.getX(d+2);i.fromBufferAttribute(t,p),s.fromBufferAttribute(t,g),o.fromBufferAttribute(t,x),u.subVectors(o,s),h.subVectors(i,s),u.cross(h),a.fromBufferAttribute(n,p),l.fromBufferAttribute(n,g),c.fromBufferAttribute(n,x),a.add(u),l.add(u),c.add(u),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(x,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,s),h.subVectors(i,s),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Ot.fromBufferAttribute(e,t),Ot.normalize(),e.setXYZ(t,Ot.x,Ot.y,Ot.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,h=a.normalized,d=new c.constructor(l.length*u);let f=0,p=0;for(let g=0,x=l.length;g<x;g++){a.isInterleavedBufferAttribute?f=l[g]*a.data.stride+a.offset:f=l[g]*u;for(let m=0;m<u;m++)d[p++]=c[f++]}return new Tt(d,u,h)}if(this.index===null)return Je("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new pt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,h=c.length;u<h;u++){const d=c[u],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,d=c.length;h<d;h++){const f=c[h];u.push(f.toJSON(e.data))}u.length>0&&(i[l]=u,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const u=i[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],h=s[c];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const h=o[c];this.addGroup(h.start,h.count,h.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ea=new ft,Yn=new Zs,xs=new oi,Ma=new R,vs=new R,ys=new R,_s=new R,wr=new R,Ss=new R,Ca=new R,bs=new R;class Ae extends Dt{constructor(e=new pt,t=new is){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(s&&a){Ss.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],h=s[l];u!==0&&(wr.fromBufferAttribute(h,e),o?Ss.addScaledVector(wr,u):Ss.addScaledVector(wr.sub(t),u))}t.add(Ss)}return t}raycast(e,t){const n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),xs.copy(n.boundingSphere),xs.applyMatrix4(s),Yn.copy(e.ray).recast(e.near),!(xs.containsPoint(Yn.origin)===!1&&(Yn.intersectSphere(xs,Ma)===null||Yn.origin.distanceToSquared(Ma)>(e.far-e.near)**2))&&(Ea.copy(s).invert(),Yn.copy(e.ray).applyMatrix4(Ea),!(n.boundingBox!==null&&Yn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Yn)))}_computeIntersections(e,t,n){let i;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let p=0,g=d.length;p<g;p++){const x=d[p],m=o[x.materialIndex],y=Math.max(x.start,f.start),_=Math.min(a.count,Math.min(x.start+x.count,f.start+f.count));for(let C=y,b=_;C<b;C+=3){const S=a.getX(C),A=a.getX(C+1),L=a.getX(C+2);i=Ts(this,m,e,n,c,u,h,S,A,L),i&&(i.faceIndex=Math.floor(C/3),i.face.materialIndex=x.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),g=Math.min(a.count,f.start+f.count);for(let x=p,m=g;x<m;x+=3){const y=a.getX(x),_=a.getX(x+1),C=a.getX(x+2);i=Ts(this,o,e,n,c,u,h,y,_,C),i&&(i.faceIndex=Math.floor(x/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let p=0,g=d.length;p<g;p++){const x=d[p],m=o[x.materialIndex],y=Math.max(x.start,f.start),_=Math.min(l.count,Math.min(x.start+x.count,f.start+f.count));for(let C=y,b=_;C<b;C+=3){const S=C,A=C+1,L=C+2;i=Ts(this,m,e,n,c,u,h,S,A,L),i&&(i.faceIndex=Math.floor(C/3),i.face.materialIndex=x.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let x=p,m=g;x<m;x+=3){const y=x,_=x+1,C=x+2;i=Ts(this,o,e,n,c,u,h,y,_,C),i&&(i.faceIndex=Math.floor(x/3),t.push(i))}}}}function fh(r,e,t,n,i,s,o,a){let l;if(e.side===Bt?l=n.intersectTriangle(o,s,i,!0,a):l=n.intersectTriangle(i,s,o,e.side===Gn,a),l===null)return null;bs.copy(a),bs.applyMatrix4(r.matrixWorld);const c=t.ray.origin.distanceTo(bs);return c<t.near||c>t.far?null:{distance:c,point:bs.clone(),object:r}}function Ts(r,e,t,n,i,s,o,a,l,c){r.getVertexPosition(a,vs),r.getVertexPosition(l,ys),r.getVertexPosition(c,_s);const u=fh(r,e,t,n,vs,ys,_s,Ca);if(u){const h=new R;hn.getBarycoord(Ca,vs,ys,_s,h),i&&(u.uv=hn.getInterpolatedAttribute(i,a,l,c,h,new ct)),s&&(u.uv1=hn.getInterpolatedAttribute(s,a,l,c,h,new ct)),o&&(u.normal=hn.getInterpolatedAttribute(o,a,l,c,h,new R),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new R,materialIndex:0};hn.getNormal(vs,ys,_s,d.normal),u.face=d,u.barycoord=h}return u}class Vt extends pt{constructor(e=1,t=1,n=1,i=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:o};const a=this;i=Math.floor(i),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],h=[];let d=0,f=0;p("z","y","x",-1,-1,n,t,e,o,s,0),p("z","y","x",1,-1,n,t,-e,o,s,1),p("x","z","y",1,1,e,n,t,i,o,2),p("x","z","y",1,-1,e,n,-t,i,o,3),p("x","y","z",1,-1,e,t,n,i,s,4),p("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Ue(c,3)),this.setAttribute("normal",new Ue(u,3)),this.setAttribute("uv",new Ue(h,2));function p(g,x,m,y,_,C,b,S,A,L,E){const T=C/A,I=b/L,F=C/2,G=b/2,z=S/2,X=A+1,V=L+1;let Q=0,q=0;const ee=new R;for(let te=0;te<V;te++){const pe=te*I-G;for(let Pe=0;Pe<X;Pe++){const ve=Pe*T-F;ee[g]=ve*y,ee[x]=pe*_,ee[m]=z,c.push(ee.x,ee.y,ee.z),ee[g]=0,ee[x]=0,ee[m]=S>0?1:-1,u.push(ee.x,ee.y,ee.z),h.push(Pe/A),h.push(1-te/L),Q+=1}}for(let te=0;te<L;te++)for(let pe=0;pe<A;pe++){const Pe=d+pe+X*te,ve=d+pe+X*(te+1),Me=d+(pe+1)+X*(te+1),Ge=d+(pe+1)+X*te;l.push(Pe,ve,Ge),l.push(ve,Me,Ge),q+=6}a.addGroup(f,q,E),f+=q,d+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vt(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ii(r){const e={};for(const t in r){e[t]={};for(const n in r[t]){const i=r[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(Je("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Wt(r){const e={};for(let t=0;t<r.length;t++){const n=Ii(r[t]);for(const i in n)e[i]=n[i]}return e}function ph(r){const e=[];for(let t=0;t<r.length;t++)e.push(r[t].clone());return e}function Nl(r){const e=r.getRenderTarget();return e===null?r.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:dt.workingColorSpace}const mh={clone:Ii,merge:Wt};var gh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,xh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class qe extends gn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=gh,this.fragmentShader=xh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ii(e.uniforms),this.uniformsGroups=ph(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Ul extends Dt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ft,this.projectionMatrix=new ft,this.projectionMatrixInverse=new ft,this.coordinateSystem=pn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const On=new R,Aa=new ct,wa=new ct;class Qt extends Ul{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Po*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ar*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Po*2*Math.atan(Math.tan(ar*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){On.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(On.x,On.y).multiplyScalar(-e/On.z),On.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(On.x,On.y).multiplyScalar(-e/On.z)}getViewSize(e,t){return this.getViewBounds(e,Aa,wa),t.subVectors(wa,Aa)}setViewOffset(e,t,n,i,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ar*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*i/l,t-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const yi=-90,_i=1;class vh extends Dt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Qt(yi,_i,e,t);i.layers=this.layers,this.add(i);const s=new Qt(yi,_i,e,t);s.layers=this.layers,this.add(s);const o=new Qt(yi,_i,e,t);o.layers=this.layers,this.add(o);const a=new Qt(yi,_i,e,t);a.layers=this.layers,this.add(a);const l=new Qt(yi,_i,e,t);l.layers=this.layers,this.add(l);const c=new Qt(yi,_i,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===pn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ys)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,h=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,s),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=g,e.setRenderTarget(n,5,i),e.render(t,u),e.setRenderTarget(h,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class kl extends zt{constructor(e=[],t=Mi,n,i,s,o,a,l,c,u){super(e,t,n,i,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class yh extends zn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new kl(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Vt(5,5,5),s=new qe({name:"CubemapFromEquirect",uniforms:Ii(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Bt,blending:Cn});s.uniforms.tEquirect.value=t;const o=new Ae(i,s),a=t.minFilter;return t.minFilter===si&&(t.minFilter=rn),new vh(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(s)}}class Gt extends Dt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const _h={type:"move"};class Ir{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Gt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Gt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Gt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const g of e.hand.values()){const x=t.getJointPose(g,n),m=this._getHandJoint(c,g);x!==null&&(m.matrix.fromArray(x.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=x.radius),m.visible=x!==null}const u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,p=.005;c.inputState.pinching&&d>f+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(_h)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Gt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Ko{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Oe(e),this.near=t,this.far=n}clone(){return new Ko(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Sh extends Dt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new en,this.environmentIntensity=1,this.environmentRotation=new en,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class bh extends zt{constructor(e=null,t=1,n=1,i,s,o,a,l,c=ht,u=ht,h,d){super(null,o,a,l,c,u,i,s,h,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Rr=new R,Th=new R,Eh=new et;class Zn{constructor(e=new R(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Rr.subVectors(n,t).cross(Th.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Rr),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Eh.getNormalMatrix(e),i=this.coplanarPoint(Rr).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Kn=new oi,Mh=new ct(.5,.5),Es=new R;class ss{constructor(e=new Zn,t=new Zn,n=new Zn,i=new Zn,s=new Zn,o=new Zn){this.planes=[e,t,n,i,s,o]}set(e,t,n,i,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=pn,n=!1){const i=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],u=s[4],h=s[5],d=s[6],f=s[7],p=s[8],g=s[9],x=s[10],m=s[11],y=s[12],_=s[13],C=s[14],b=s[15];if(i[0].setComponents(c-o,f-u,m-p,b-y).normalize(),i[1].setComponents(c+o,f+u,m+p,b+y).normalize(),i[2].setComponents(c+a,f+h,m+g,b+_).normalize(),i[3].setComponents(c-a,f-h,m-g,b-_).normalize(),n)i[4].setComponents(l,d,x,C).normalize(),i[5].setComponents(c-l,f-d,m-x,b-C).normalize();else if(i[4].setComponents(c-l,f-d,m-x,b-C).normalize(),t===pn)i[5].setComponents(c+l,f+d,m+x,b+C).normalize();else if(t===Ys)i[5].setComponents(l,d,x,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Kn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Kn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Kn)}intersectsSprite(e){Kn.center.set(0,0,0);const t=Mh.distanceTo(e.center);return Kn.radius=.7071067811865476+t,Kn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Kn)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Es.x=i.normal.x>0?e.max.x:e.min.x,Es.y=i.normal.y>0?e.max.y:e.min.y,Es.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Es)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Gl extends gn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Oe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Ks=new R,js=new R,Ia=new ft,Bi=new Zs,Ms=new oi,Pr=new R,Ra=new R;class Ch extends Dt{constructor(e=new pt,t=new Gl){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Ks.fromBufferAttribute(t,i-1),js.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Ks.distanceTo(js);e.setAttribute("lineDistance",new Ue(n,1))}else Je("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ms.copy(n.boundingSphere),Ms.applyMatrix4(i),Ms.radius+=s,e.ray.intersectsSphere(Ms)===!1)return;Ia.copy(i).invert(),Bi.copy(e.ray).applyMatrix4(Ia);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=n.index,d=n.attributes.position;if(u!==null){const f=Math.max(0,o.start),p=Math.min(u.count,o.start+o.count);for(let g=f,x=p-1;g<x;g+=c){const m=u.getX(g),y=u.getX(g+1),_=Cs(this,e,Bi,l,m,y,g);_&&t.push(_)}if(this.isLineLoop){const g=u.getX(p-1),x=u.getX(f),m=Cs(this,e,Bi,l,g,x,p-1);m&&t.push(m)}}else{const f=Math.max(0,o.start),p=Math.min(d.count,o.start+o.count);for(let g=f,x=p-1;g<x;g+=c){const m=Cs(this,e,Bi,l,g,g+1,g);m&&t.push(m)}if(this.isLineLoop){const g=Cs(this,e,Bi,l,p-1,f,p-1);g&&t.push(g)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Cs(r,e,t,n,i,s,o){const a=r.geometry.attributes.position;if(Ks.fromBufferAttribute(a,i),js.fromBufferAttribute(a,s),t.distanceSqToSegment(Ks,js,Pr,Ra)>n)return;Pr.applyMatrix4(r.matrixWorld);const c=e.ray.origin.distanceTo(Pr);if(!(c<e.near||c>e.far))return{distance:c,point:Ra.clone().applyMatrix4(r.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:r}}const Pa=new R,Da=new R;class Ah extends Ch{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)Pa.fromBufferAttribute(t,i),Da.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Pa.distanceTo(Da);e.setAttribute("lineDistance",new Ue(n,1))}else Je("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class wh extends gn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const La=new ft,Do=new Zs,As=new oi,ws=new R;class Ih extends Dt{constructor(e=new pt,t=new wh){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),As.copy(n.boundingSphere),As.applyMatrix4(i),As.radius+=s,e.ray.intersectsSphere(As)===!1)return;La.copy(i).invert(),Do.copy(e.ray).applyMatrix4(La);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,h=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let p=d,g=f;p<g;p++){const x=c.getX(p);ws.fromBufferAttribute(h,x),Fa(ws,x,l,i,e,t,this)}}else{const d=Math.max(0,o.start),f=Math.min(h.count,o.start+o.count);for(let p=d,g=f;p<g;p++)ws.fromBufferAttribute(h,p),Fa(ws,p,l,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Fa(r,e,t,n,i,s,o){const a=Do.distanceSqToPoint(r);if(a<t){const l=new R;Do.closestPointToPoint(r,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class jo extends zt{constructor(e,t,n=Bn,i,s,o,a=ht,l=ht,c,u=Ai,h=1){if(u!==Ai&&u!==Ji)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:h};super(d,i,s,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new $o(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Bl extends zt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ri extends pt{constructor(e=1,t=1,n=1,i=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const u=[],h=[],d=[],f=[];let p=0;const g=[],x=n/2;let m=0;y(),o===!1&&(e>0&&_(!0),t>0&&_(!1)),this.setIndex(u),this.setAttribute("position",new Ue(h,3)),this.setAttribute("normal",new Ue(d,3)),this.setAttribute("uv",new Ue(f,2));function y(){const C=new R,b=new R;let S=0;const A=(t-e)/n;for(let L=0;L<=s;L++){const E=[],T=L/s,I=T*(t-e)+e;for(let F=0;F<=i;F++){const G=F/i,z=G*l+a,X=Math.sin(z),V=Math.cos(z);b.x=I*X,b.y=-T*n+x,b.z=I*V,h.push(b.x,b.y,b.z),C.set(X,A,V).normalize(),d.push(C.x,C.y,C.z),f.push(G,1-T),E.push(p++)}g.push(E)}for(let L=0;L<i;L++)for(let E=0;E<s;E++){const T=g[E][L],I=g[E+1][L],F=g[E+1][L+1],G=g[E][L+1];(e>0||E!==0)&&(u.push(T,I,G),S+=3),(t>0||E!==s-1)&&(u.push(I,F,G),S+=3)}c.addGroup(m,S,0),m+=S}function _(C){const b=p,S=new ct,A=new R;let L=0;const E=C===!0?e:t,T=C===!0?1:-1;for(let F=1;F<=i;F++)h.push(0,x*T,0),d.push(0,T,0),f.push(.5,.5),p++;const I=p;for(let F=0;F<=i;F++){const z=F/i*l+a,X=Math.cos(z),V=Math.sin(z);A.x=E*V,A.y=x*T,A.z=E*X,h.push(A.x,A.y,A.z),d.push(0,T,0),S.x=X*.5+.5,S.y=V*.5*T+.5,f.push(S.x,S.y),p++}for(let F=0;F<i;F++){const G=b+F,z=I+F;C===!0?u.push(z,z+1,G):u.push(z+1,z,G),L+=3}c.addGroup(m,L,C===!0?1:2),m+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ri(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Qs extends Ri{constructor(e=1,t=1,n=32,i=1,s=!1,o=0,a=Math.PI*2){super(0,e,t,n,i,s,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(e){return new Qs(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class er extends pt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const s=e/2,o=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,u=l+1,h=e/a,d=t/l,f=[],p=[],g=[],x=[];for(let m=0;m<u;m++){const y=m*d-o;for(let _=0;_<c;_++){const C=_*h-s;p.push(C,-y,0),g.push(0,0,1),x.push(_/a),x.push(1-m/l)}}for(let m=0;m<l;m++)for(let y=0;y<a;y++){const _=y+c*m,C=y+c*(m+1),b=y+1+c*(m+1),S=y+1+c*m;f.push(_,C,S),f.push(C,b,S)}this.setIndex(f),this.setAttribute("position",new Ue(p,3)),this.setAttribute("normal",new Ue(g,3)),this.setAttribute("uv",new Ue(x,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new er(e.width,e.height,e.widthSegments,e.heightSegments)}}class es extends pt{constructor(e=1,t=32,n=16,i=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const u=[],h=new R,d=new R,f=[],p=[],g=[],x=[];for(let m=0;m<=n;m++){const y=[],_=m/n;let C=0;m===0&&o===0?C=.5/t:m===n&&l===Math.PI&&(C=-.5/t);for(let b=0;b<=t;b++){const S=b/t;h.x=-e*Math.cos(i+S*s)*Math.sin(o+_*a),h.y=e*Math.cos(o+_*a),h.z=e*Math.sin(i+S*s)*Math.sin(o+_*a),p.push(h.x,h.y,h.z),d.copy(h).normalize(),g.push(d.x,d.y,d.z),x.push(S+C,1-_),y.push(c++)}u.push(y)}for(let m=0;m<n;m++)for(let y=0;y<t;y++){const _=u[m][y+1],C=u[m][y],b=u[m+1][y],S=u[m+1][y+1];(m!==0||o>0)&&f.push(_,C,S),(m!==n-1||l<Math.PI)&&f.push(C,b,S)}this.setIndex(f),this.setAttribute("position",new Ue(p,3)),this.setAttribute("normal",new Ue(g,3)),this.setAttribute("uv",new Ue(x,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new es(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Oa extends gn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Oe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Il,this.normalScale=new ct(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new en,this.combine=Go,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Rh extends gn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=kc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Ph extends gn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Dr={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(this.files[r]=e)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class Dh{constructor(e,t,n){const i=this;let s=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){a++,s===!1&&i.onStart!==void 0&&i.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,i.onProgress!==void 0&&i.onProgress(u,o,a),o===a&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(u){i.onError!==void 0&&i.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,h){return c.push(u,h),this},this.removeHandler=function(u){const h=c.indexOf(u);return h!==-1&&c.splice(h,2),this},this.getHandler=function(u){for(let h=0,d=c.length;h<d;h+=2){const f=c[h],p=c[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Lh=new Dh;class Jo{constructor(e){this.manager=e!==void 0?e:Lh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Jo.DEFAULT_MATERIAL_NAME="__DEFAULT";const Si=new WeakMap;class Fh extends Jo{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,o=Dr.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(o),s.manager.itemEnd(e)},0);else{let h=Si.get(o);h===void 0&&(h=[],Si.set(o,h)),h.push({onLoad:t,onError:i})}return o}const a=Zi("img");function l(){u(),t&&t(this);const h=Si.get(this)||[];for(let d=0;d<h.length;d++){const f=h[d];f.onLoad&&f.onLoad(this)}Si.delete(this),s.manager.itemEnd(e)}function c(h){u(),i&&i(h),Dr.remove(`image:${e}`);const d=Si.get(this)||[];for(let f=0;f<d.length;f++){const p=d[f];p.onError&&p.onError(h)}Si.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Dr.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}}class In extends Jo{constructor(e){super(e)}load(e,t,n,i){const s=new zt,o=new Fh(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}}class tr extends Dt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Oe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Oh extends tr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Oe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Lr=new ft,Na=new R,Ua=new R;class zl{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ct(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new ft,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ss,this._frameExtents=new ct(1,1),this._viewportCount=1,this._viewports=[new vt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Na.setFromMatrixPosition(e.matrixWorld),t.position.copy(Na),Ua.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ua),t.updateMatrixWorld(),Lr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Lr,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Lr)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const ka=new ft,zi=new R,Fr=new R;class Nh extends zl{constructor(){super(new Qt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ct(4,2),this._viewportCount=6,this._viewports=[new vt(2,1,1,1),new vt(0,1,1,1),new vt(3,1,1,1),new vt(1,1,1,1),new vt(3,0,1,1),new vt(1,0,1,1)],this._cubeDirections=[new R(1,0,0),new R(-1,0,0),new R(0,0,1),new R(0,0,-1),new R(0,1,0),new R(0,-1,0)],this._cubeUps=[new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,0,1),new R(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),zi.setFromMatrixPosition(e.matrixWorld),n.position.copy(zi),Fr.copy(n.position),Fr.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Fr),n.updateMatrixWorld(),i.makeTranslation(-zi.x,-zi.y,-zi.z),ka.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ka,n.coordinateSystem,n.reversedDepth)}}class Uh extends tr{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Nh}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Hl extends Ul{constructor(e=-1,t=1,n=1,i=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-e,o=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class kh extends zl{constructor(){super(new Hl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Gh extends tr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.target=new Dt,this.shadow=new kh}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Bh extends tr{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class zh extends Qt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Hh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Ga=new ft;class Wh{constructor(e,t,n=0,i=1/0){this.ray=new Zs(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Yo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):wt("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ga.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ga),this}intersectObject(e,t=!0,n=[]){return Lo(e,this,n,t),n.sort(Ba),n}intersectObjects(e,t=!0,n=[]){for(let i=0,s=e.length;i<s;i++)Lo(e[i],this,n,t);return n.sort(Ba),n}}function Ba(r,e){return r.distance-e.distance}function Lo(r,e,t,n){let i=!0;if(r.layers.test(e.layers)&&r.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const s=r.children;for(let o=0,a=s.length;o<a;o++)Lo(s[o],e,t,!0)}}function za(r,e,t,n){const i=Vh(n);switch(t){case Cl:return r*e;case wl:return r*e/i.components*i.byteLength;case Wo:return r*e/i.components*i.byteLength;case Vo:return r*e*2/i.components*i.byteLength;case qo:return r*e*2/i.components*i.byteLength;case Al:return r*e*3/i.components*i.byteLength;case un:return r*e*4/i.components*i.byteLength;case Xo:return r*e*4/i.components*i.byteLength;case Ns:case Us:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case ks:case Gs:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case io:case ro:return Math.max(r,16)*Math.max(e,8)/4;case no:case so:return Math.max(r,8)*Math.max(e,8)/2;case oo:case ao:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case lo:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case co:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case ho:return Math.floor((r+4)/5)*Math.floor((e+3)/4)*16;case uo:return Math.floor((r+4)/5)*Math.floor((e+4)/5)*16;case fo:return Math.floor((r+5)/6)*Math.floor((e+4)/5)*16;case po:return Math.floor((r+5)/6)*Math.floor((e+5)/6)*16;case mo:return Math.floor((r+7)/8)*Math.floor((e+4)/5)*16;case go:return Math.floor((r+7)/8)*Math.floor((e+5)/6)*16;case xo:return Math.floor((r+7)/8)*Math.floor((e+7)/8)*16;case vo:return Math.floor((r+9)/10)*Math.floor((e+4)/5)*16;case yo:return Math.floor((r+9)/10)*Math.floor((e+5)/6)*16;case _o:return Math.floor((r+9)/10)*Math.floor((e+7)/8)*16;case So:return Math.floor((r+9)/10)*Math.floor((e+9)/10)*16;case bo:return Math.floor((r+11)/12)*Math.floor((e+9)/10)*16;case To:return Math.floor((r+11)/12)*Math.floor((e+11)/12)*16;case Eo:case Mo:case Co:return Math.ceil(r/4)*Math.ceil(e/4)*16;case Ao:case wo:return Math.ceil(r/4)*Math.ceil(e/4)*8;case Io:case Ro:return Math.ceil(r/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Vh(r){switch(r){case mn:case bl:return{byteLength:1,components:1};case Ki:case Tl:case Pi:return{byteLength:2,components:1};case zo:case Ho:return{byteLength:2,components:4};case Bn:case Bo:case Mn:return{byteLength:4,components:1};case El:case Ml:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ko}}));typeof window<"u"&&(window.__THREE__?Je("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ko);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Wl(){let r=null,e=!1,t=null,n=null;function i(s,o){t(s,o),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function qh(r){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,h=c.byteLength,d=r.createBuffer();r.bindBuffer(l,d),r.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=r.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=r.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=r.HALF_FLOAT:f=r.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=r.SHORT;else if(c instanceof Uint32Array)f=r.UNSIGNED_INT;else if(c instanceof Int32Array)f=r.INT;else if(c instanceof Int8Array)f=r.BYTE;else if(c instanceof Uint8Array)f=r.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:h}}function n(a,l,c){const u=l.array,h=l.updateRanges;if(r.bindBuffer(c,a),h.length===0)r.bufferSubData(c,0,u);else{h.sort((f,p)=>f.start-p.start);let d=0;for(let f=1;f<h.length;f++){const p=h[d],g=h[f];g.start<=p.start+p.count+1?p.count=Math.max(p.count,g.start+g.count-p.start):(++d,h[d]=g)}h.length=d+1;for(let f=0,p=h.length;f<p;f++){const g=h[f];r.bufferSubData(c,g.start*u.BYTES_PER_ELEMENT,u,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(r.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:s,update:o}}var Xh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,$h=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Yh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Kh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Jh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Zh=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Qh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,eu=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,tu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,nu=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,iu=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,su=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,ru=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ou=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,au=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,lu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,cu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,hu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,uu=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,du=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,fu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,pu=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,mu=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,gu=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,xu=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,vu=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,yu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,_u=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Su=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,bu="gl_FragColor = linearToOutputTexel( gl_FragColor );",Tu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Eu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Mu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Cu=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Au=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,wu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Iu=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ru=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Pu=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Du=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Lu=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Fu=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ou=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Nu=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Uu=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,ku=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Gu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Bu=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,zu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Hu=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Wu=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Vu=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,qu=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Xu=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,$u=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Yu=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ku=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ju=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ju=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Zu=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Qu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ed=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,td=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nd=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,id=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,sd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,rd=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,od=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ad=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,ld=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,cd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,hd=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ud=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,fd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,pd=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,md=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,gd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,xd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,vd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,yd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,_d=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Sd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,bd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Td=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Ed=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Md=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Cd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Ad=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,wd=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Id=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Rd=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Pd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Dd=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Ld=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Fd=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Od=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Nd=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Ud=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,kd=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Gd=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Bd=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,zd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Hd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Wd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Vd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const qd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Xd=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$d=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Yd=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Kd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,jd=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jd=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Zd=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Qd=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,ef=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,tf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,nf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,rf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,of=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,af=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hf=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,uf=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,df=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,ff=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,pf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,mf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,xf=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vf=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_f=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Sf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,bf=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Tf=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ef=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Mf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,it={alphahash_fragment:Xh,alphahash_pars_fragment:$h,alphamap_fragment:Yh,alphamap_pars_fragment:Kh,alphatest_fragment:jh,alphatest_pars_fragment:Jh,aomap_fragment:Zh,aomap_pars_fragment:Qh,batching_pars_vertex:eu,batching_vertex:tu,begin_vertex:nu,beginnormal_vertex:iu,bsdfs:su,iridescence_fragment:ru,bumpmap_pars_fragment:ou,clipping_planes_fragment:au,clipping_planes_pars_fragment:lu,clipping_planes_pars_vertex:cu,clipping_planes_vertex:hu,color_fragment:uu,color_pars_fragment:du,color_pars_vertex:fu,color_vertex:pu,common:mu,cube_uv_reflection_fragment:gu,defaultnormal_vertex:xu,displacementmap_pars_vertex:vu,displacementmap_vertex:yu,emissivemap_fragment:_u,emissivemap_pars_fragment:Su,colorspace_fragment:bu,colorspace_pars_fragment:Tu,envmap_fragment:Eu,envmap_common_pars_fragment:Mu,envmap_pars_fragment:Cu,envmap_pars_vertex:Au,envmap_physical_pars_fragment:ku,envmap_vertex:wu,fog_vertex:Iu,fog_pars_vertex:Ru,fog_fragment:Pu,fog_pars_fragment:Du,gradientmap_pars_fragment:Lu,lightmap_pars_fragment:Fu,lights_lambert_fragment:Ou,lights_lambert_pars_fragment:Nu,lights_pars_begin:Uu,lights_toon_fragment:Gu,lights_toon_pars_fragment:Bu,lights_phong_fragment:zu,lights_phong_pars_fragment:Hu,lights_physical_fragment:Wu,lights_physical_pars_fragment:Vu,lights_fragment_begin:qu,lights_fragment_maps:Xu,lights_fragment_end:$u,logdepthbuf_fragment:Yu,logdepthbuf_pars_fragment:Ku,logdepthbuf_pars_vertex:ju,logdepthbuf_vertex:Ju,map_fragment:Zu,map_pars_fragment:Qu,map_particle_fragment:ed,map_particle_pars_fragment:td,metalnessmap_fragment:nd,metalnessmap_pars_fragment:id,morphinstance_vertex:sd,morphcolor_vertex:rd,morphnormal_vertex:od,morphtarget_pars_vertex:ad,morphtarget_vertex:ld,normal_fragment_begin:cd,normal_fragment_maps:hd,normal_pars_fragment:ud,normal_pars_vertex:dd,normal_vertex:fd,normalmap_pars_fragment:pd,clearcoat_normal_fragment_begin:md,clearcoat_normal_fragment_maps:gd,clearcoat_pars_fragment:xd,iridescence_pars_fragment:vd,opaque_fragment:yd,packing:_d,premultiplied_alpha_fragment:Sd,project_vertex:bd,dithering_fragment:Td,dithering_pars_fragment:Ed,roughnessmap_fragment:Md,roughnessmap_pars_fragment:Cd,shadowmap_pars_fragment:Ad,shadowmap_pars_vertex:wd,shadowmap_vertex:Id,shadowmask_pars_fragment:Rd,skinbase_vertex:Pd,skinning_pars_vertex:Dd,skinning_vertex:Ld,skinnormal_vertex:Fd,specularmap_fragment:Od,specularmap_pars_fragment:Nd,tonemapping_fragment:Ud,tonemapping_pars_fragment:kd,transmission_fragment:Gd,transmission_pars_fragment:Bd,uv_pars_fragment:zd,uv_pars_vertex:Hd,uv_vertex:Wd,worldpos_vertex:Vd,background_vert:qd,background_frag:Xd,backgroundCube_vert:$d,backgroundCube_frag:Yd,cube_vert:Kd,cube_frag:jd,depth_vert:Jd,depth_frag:Zd,distanceRGBA_vert:Qd,distanceRGBA_frag:ef,equirect_vert:tf,equirect_frag:nf,linedashed_vert:sf,linedashed_frag:rf,meshbasic_vert:of,meshbasic_frag:af,meshlambert_vert:lf,meshlambert_frag:cf,meshmatcap_vert:hf,meshmatcap_frag:uf,meshnormal_vert:df,meshnormal_frag:ff,meshphong_vert:pf,meshphong_frag:mf,meshphysical_vert:gf,meshphysical_frag:xf,meshtoon_vert:vf,meshtoon_frag:yf,points_vert:_f,points_frag:Sf,shadow_vert:bf,shadow_frag:Tf,sprite_vert:Ef,sprite_frag:Mf},ye={common:{diffuse:{value:new Oe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new et},alphaMap:{value:null},alphaMapTransform:{value:new et},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new et}},envmap:{envMap:{value:null},envMapRotation:{value:new et},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new et}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new et}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new et},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new et},normalScale:{value:new ct(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new et},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new et}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new et}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new et}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Oe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Oe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new et},alphaTest:{value:0},uvTransform:{value:new et}},sprite:{diffuse:{value:new Oe(16777215)},opacity:{value:1},center:{value:new ct(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new et},alphaMap:{value:null},alphaMapTransform:{value:new et},alphaTest:{value:0}}},fn={basic:{uniforms:Wt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.fog]),vertexShader:it.meshbasic_vert,fragmentShader:it.meshbasic_frag},lambert:{uniforms:Wt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,ye.lights,{emissive:{value:new Oe(0)}}]),vertexShader:it.meshlambert_vert,fragmentShader:it.meshlambert_frag},phong:{uniforms:Wt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,ye.lights,{emissive:{value:new Oe(0)},specular:{value:new Oe(1118481)},shininess:{value:30}}]),vertexShader:it.meshphong_vert,fragmentShader:it.meshphong_frag},standard:{uniforms:Wt([ye.common,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.roughnessmap,ye.metalnessmap,ye.fog,ye.lights,{emissive:{value:new Oe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag},toon:{uniforms:Wt([ye.common,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.gradientmap,ye.fog,ye.lights,{emissive:{value:new Oe(0)}}]),vertexShader:it.meshtoon_vert,fragmentShader:it.meshtoon_frag},matcap:{uniforms:Wt([ye.common,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,{matcap:{value:null}}]),vertexShader:it.meshmatcap_vert,fragmentShader:it.meshmatcap_frag},points:{uniforms:Wt([ye.points,ye.fog]),vertexShader:it.points_vert,fragmentShader:it.points_frag},dashed:{uniforms:Wt([ye.common,ye.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:it.linedashed_vert,fragmentShader:it.linedashed_frag},depth:{uniforms:Wt([ye.common,ye.displacementmap]),vertexShader:it.depth_vert,fragmentShader:it.depth_frag},normal:{uniforms:Wt([ye.common,ye.bumpmap,ye.normalmap,ye.displacementmap,{opacity:{value:1}}]),vertexShader:it.meshnormal_vert,fragmentShader:it.meshnormal_frag},sprite:{uniforms:Wt([ye.sprite,ye.fog]),vertexShader:it.sprite_vert,fragmentShader:it.sprite_frag},background:{uniforms:{uvTransform:{value:new et},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:it.background_vert,fragmentShader:it.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new et}},vertexShader:it.backgroundCube_vert,fragmentShader:it.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:it.cube_vert,fragmentShader:it.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:it.equirect_vert,fragmentShader:it.equirect_frag},distanceRGBA:{uniforms:Wt([ye.common,ye.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:it.distanceRGBA_vert,fragmentShader:it.distanceRGBA_frag},shadow:{uniforms:Wt([ye.lights,ye.fog,{color:{value:new Oe(0)},opacity:{value:1}}]),vertexShader:it.shadow_vert,fragmentShader:it.shadow_frag}};fn.physical={uniforms:Wt([fn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new et},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new et},clearcoatNormalScale:{value:new ct(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new et},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new et},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new et},sheen:{value:0},sheenColor:{value:new Oe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new et},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new et},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new et},transmissionSamplerSize:{value:new ct},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new et},attenuationDistance:{value:0},attenuationColor:{value:new Oe(0)},specularColor:{value:new Oe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new et},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new et},anisotropyVector:{value:new ct},anisotropyMap:{value:null},anisotropyMapTransform:{value:new et}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag};const Is={r:0,b:0,g:0},jn=new en,Cf=new ft;function Af(r,e,t,n,i,s,o){const a=new Oe(0);let l=s===!0?0:1,c,u,h=null,d=0,f=null;function p(_){let C=_.isScene===!0?_.background:null;return C&&C.isTexture&&(C=(_.backgroundBlurriness>0?t:e).get(C)),C}function g(_){let C=!1;const b=p(_);b===null?m(a,l):b&&b.isColor&&(m(b,1),C=!0);const S=r.xr.getEnvironmentBlendMode();S==="additive"?n.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(r.autoClear||C)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function x(_,C){const b=p(C);b&&(b.isCubeTexture||b.mapping===Js)?(u===void 0&&(u=new Ae(new Vt(1,1,1),new qe({name:"BackgroundCubeMaterial",uniforms:Ii(fn.backgroundCube.uniforms),vertexShader:fn.backgroundCube.vertexShader,fragmentShader:fn.backgroundCube.fragmentShader,side:Bt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(S,A,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(u)),jn.copy(C.backgroundRotation),jn.x*=-1,jn.y*=-1,jn.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(jn.y*=-1,jn.z*=-1),u.material.uniforms.envMap.value=b,u.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Cf.makeRotationFromEuler(jn)),u.material.toneMapped=dt.getTransfer(b.colorSpace)!==xt,(h!==b||d!==b.version||f!==r.toneMapping)&&(u.material.needsUpdate=!0,h=b,d=b.version,f=r.toneMapping),u.layers.enableAll(),_.unshift(u,u.geometry,u.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new Ae(new er(2,2),new qe({name:"BackgroundMaterial",uniforms:Ii(fn.background.uniforms),vertexShader:fn.background.vertexShader,fragmentShader:fn.background.fragmentShader,side:Gn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.toneMapped=dt.getTransfer(b.colorSpace)!==xt,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(h!==b||d!==b.version||f!==r.toneMapping)&&(c.material.needsUpdate=!0,h=b,d=b.version,f=r.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function m(_,C){_.getRGB(Is,Nl(r)),n.buffers.color.setClear(Is.r,Is.g,Is.b,C,o)}function y(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(_,C=1){a.set(_),l=C,m(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,m(a,l)},render:g,addToRenderList:x,dispose:y}}function wf(r,e){const t=r.getParameter(r.MAX_VERTEX_ATTRIBS),n={},i=d(null);let s=i,o=!1;function a(T,I,F,G,z){let X=!1;const V=h(G,F,I);s!==V&&(s=V,c(s.object)),X=f(T,G,F,z),X&&p(T,G,F,z),z!==null&&e.update(z,r.ELEMENT_ARRAY_BUFFER),(X||o)&&(o=!1,C(T,I,F,G),z!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function l(){return r.createVertexArray()}function c(T){return r.bindVertexArray(T)}function u(T){return r.deleteVertexArray(T)}function h(T,I,F){const G=F.wireframe===!0;let z=n[T.id];z===void 0&&(z={},n[T.id]=z);let X=z[I.id];X===void 0&&(X={},z[I.id]=X);let V=X[G];return V===void 0&&(V=d(l()),X[G]=V),V}function d(T){const I=[],F=[],G=[];for(let z=0;z<t;z++)I[z]=0,F[z]=0,G[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:F,attributeDivisors:G,object:T,attributes:{},index:null}}function f(T,I,F,G){const z=s.attributes,X=I.attributes;let V=0;const Q=F.getAttributes();for(const q in Q)if(Q[q].location>=0){const te=z[q];let pe=X[q];if(pe===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(pe=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(pe=T.instanceColor)),te===void 0||te.attribute!==pe||pe&&te.data!==pe.data)return!0;V++}return s.attributesNum!==V||s.index!==G}function p(T,I,F,G){const z={},X=I.attributes;let V=0;const Q=F.getAttributes();for(const q in Q)if(Q[q].location>=0){let te=X[q];te===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(te=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(te=T.instanceColor));const pe={};pe.attribute=te,te&&te.data&&(pe.data=te.data),z[q]=pe,V++}s.attributes=z,s.attributesNum=V,s.index=G}function g(){const T=s.newAttributes;for(let I=0,F=T.length;I<F;I++)T[I]=0}function x(T){m(T,0)}function m(T,I){const F=s.newAttributes,G=s.enabledAttributes,z=s.attributeDivisors;F[T]=1,G[T]===0&&(r.enableVertexAttribArray(T),G[T]=1),z[T]!==I&&(r.vertexAttribDivisor(T,I),z[T]=I)}function y(){const T=s.newAttributes,I=s.enabledAttributes;for(let F=0,G=I.length;F<G;F++)I[F]!==T[F]&&(r.disableVertexAttribArray(F),I[F]=0)}function _(T,I,F,G,z,X,V){V===!0?r.vertexAttribIPointer(T,I,F,z,X):r.vertexAttribPointer(T,I,F,G,z,X)}function C(T,I,F,G){g();const z=G.attributes,X=F.getAttributes(),V=I.defaultAttributeValues;for(const Q in X){const q=X[Q];if(q.location>=0){let ee=z[Q];if(ee===void 0&&(Q==="instanceMatrix"&&T.instanceMatrix&&(ee=T.instanceMatrix),Q==="instanceColor"&&T.instanceColor&&(ee=T.instanceColor)),ee!==void 0){const te=ee.normalized,pe=ee.itemSize,Pe=e.get(ee);if(Pe===void 0)continue;const ve=Pe.buffer,Me=Pe.type,Ge=Pe.bytesPerElement,j=Me===r.INT||Me===r.UNSIGNED_INT||ee.gpuType===Bo;if(ee.isInterleavedBufferAttribute){const J=ee.data,ue=J.stride,ae=ee.offset;if(J.isInstancedInterleavedBuffer){for(let le=0;le<q.locationSize;le++)m(q.location+le,J.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let le=0;le<q.locationSize;le++)x(q.location+le);r.bindBuffer(r.ARRAY_BUFFER,ve);for(let le=0;le<q.locationSize;le++)_(q.location+le,pe/q.locationSize,Me,te,ue*Ge,(ae+pe/q.locationSize*le)*Ge,j)}else{if(ee.isInstancedBufferAttribute){for(let J=0;J<q.locationSize;J++)m(q.location+J,ee.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let J=0;J<q.locationSize;J++)x(q.location+J);r.bindBuffer(r.ARRAY_BUFFER,ve);for(let J=0;J<q.locationSize;J++)_(q.location+J,pe/q.locationSize,Me,te,pe*Ge,pe/q.locationSize*J*Ge,j)}}else if(V!==void 0){const te=V[Q];if(te!==void 0)switch(te.length){case 2:r.vertexAttrib2fv(q.location,te);break;case 3:r.vertexAttrib3fv(q.location,te);break;case 4:r.vertexAttrib4fv(q.location,te);break;default:r.vertexAttrib1fv(q.location,te)}}}}y()}function b(){L();for(const T in n){const I=n[T];for(const F in I){const G=I[F];for(const z in G)u(G[z].object),delete G[z];delete I[F]}delete n[T]}}function S(T){if(n[T.id]===void 0)return;const I=n[T.id];for(const F in I){const G=I[F];for(const z in G)u(G[z].object),delete G[z];delete I[F]}delete n[T.id]}function A(T){for(const I in n){const F=n[I];if(F[T.id]===void 0)continue;const G=F[T.id];for(const z in G)u(G[z].object),delete G[z];delete F[T.id]}}function L(){E(),o=!0,s!==i&&(s=i,c(s.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:L,resetDefaultState:E,dispose:b,releaseStatesOfGeometry:S,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:x,disableUnusedAttributes:y}}function If(r,e,t){let n;function i(c){n=c}function s(c,u){r.drawArrays(n,c,u),t.update(u,n,1)}function o(c,u,h){h!==0&&(r.drawArraysInstanced(n,c,u,h),t.update(u,n,h))}function a(c,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,u,0,h);let f=0;for(let p=0;p<h;p++)f+=u[p];t.update(f,n,1)}function l(c,u,h,d){if(h===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let p=0;p<c.length;p++)o(c[p],u[p],d[p]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,u,0,d,0,h);let p=0;for(let g=0;g<h;g++)p+=u[g]*d[g];t.update(p,n,1)}}this.setMode=i,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Rf(r,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");i=r.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(A){return!(A!==un&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){const L=A===Pi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==mn&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==Mn&&!L)}function l(A){if(A==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(Je("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),p=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=r.getParameter(r.MAX_TEXTURE_SIZE),x=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),m=r.getParameter(r.MAX_VERTEX_ATTRIBS),y=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),_=r.getParameter(r.MAX_VARYING_VECTORS),C=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),b=p>0,S=r.getParameter(r.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:p,maxTextureSize:g,maxCubemapSize:x,maxAttributes:m,maxVertexUniforms:y,maxVaryings:_,maxFragmentUniforms:C,vertexTextures:b,maxSamples:S}}function Pf(r){const e=this;let t=null,n=0,i=!1,s=!1;const o=new Zn,a=new et,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||n!==0||i;return i=d,n=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){t=u(h,d,0)},this.setState=function(h,d,f){const p=h.clippingPlanes,g=h.clipIntersection,x=h.clipShadows,m=r.get(h);if(!i||p===null||p.length===0||s&&!x)s?u(null):c();else{const y=s?0:n,_=y*4;let C=m.clippingState||null;l.value=C,C=u(p,d,_,f);for(let b=0;b!==_;++b)C[b]=t[b];m.clippingState=C,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,p){const g=h!==null?h.length:0;let x=null;if(g!==0){if(x=l.value,p!==!0||x===null){const m=f+g*4,y=d.matrixWorldInverse;a.getNormalMatrix(y),(x===null||x.length<m)&&(x=new Float32Array(m));for(let _=0,C=f;_!==g;++_,C+=4)o.copy(h[_]).applyMatrix4(y,a),o.normal.toArray(x,C),x[C+3]=o.constant}l.value=x,l.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,x}}function Df(r){let e=new WeakMap;function t(o,a){return a===Qr?o.mapping=Mi:a===eo&&(o.mapping=Ci),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Qr||a===eo)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new yh(l.height);return c.fromEquirectangularTexture(r,o),e.set(o,c),o.addEventListener("dispose",i),t(c.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const Un=4,Ha=[.125,.215,.35,.446,.526,.582],ei=20,Lf=256,Hi=new Hl,Wa=new Oe;let Or=null,Nr=0,Ur=0,kr=!1;const Ff=new R;class Va{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){const{size:o=256,position:a=Ff}=s;Or=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Ur=this._renderer.getActiveMipmapLevel(),kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$a(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Or,Nr,Ur),this._renderer.xr.enabled=kr,e.scissorTest=!1,bi(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Mi||e.mapping===Ci?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Or=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Ur=this._renderer.getActiveMipmapLevel(),kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:rn,minFilter:rn,generateMipmaps:!1,type:Pi,format:un,colorSpace:wi,depthBuffer:!1},i=qa(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=qa(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Of(s)),this._blurMaterial=Uf(s,e,t),this._ggxMaterial=Nf(s,e,t)}return i}_compileMaterial(e){const t=new Ae(new pt,e);this._renderer.compile(t,Hi)}_sceneToCubeUV(e,t,n,i,s){const l=new Qt(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(Wa),h.toneMapping=kn,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(i),h.clearDepth(),h.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ae(new Vt,new is({name:"PMREM.Background",side:Bt,depthWrite:!1,depthTest:!1})));const g=this._backgroundBox,x=g.material;let m=!1;const y=e.background;y?y.isColor&&(x.color.copy(y),e.background=null,m=!0):(x.color.copy(Wa),m=!0);for(let _=0;_<6;_++){const C=_%3;C===0?(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[_],s.y,s.z)):C===1?(l.up.set(0,0,c[_]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[_],s.z)):(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[_]));const b=this._cubeSize;bi(i,C*b,_>2?b:0,b,b),h.setRenderTarget(i),m&&h.render(g,l),h.render(e,l)}h.toneMapping=f,h.autoClear=d,e.background=y}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===Mi||e.mapping===Ci;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=$a()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Xa());const s=i?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=s;const a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;bi(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Hi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,s=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),h=Math.sqrt(c*c-u*u),d=.05+c*.95,f=h*d,{_lodMax:p}=this,g=this._sizeLods[n],x=3*g*(n>p-Un?n-p+Un:0),m=4*(this._cubeSize-g);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=p-t,bi(s,x,m,3*g,2*g),i.setRenderTarget(s),i.render(a,Hi),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=p-n,bi(e,x,m,3*g,2*g),i.setRenderTarget(e),i.render(a,Hi)}_blur(e,t,n,i,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",s),this._halfBlur(o,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&wt("blur direction must be either latitudinal or longitudinal!");const u=3,h=this._lodMeshes[i];h.material=c;const d=c.uniforms,f=this._sizeLods[n]-1,p=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ei-1),g=s/p,x=isFinite(s)?1+Math.floor(u*g):ei;x>ei&&Je(`sigmaRadians, ${s}, is too large and will clip, as it requested ${x} samples when the maximum is set to ${ei}`);const m=[];let y=0;for(let A=0;A<ei;++A){const L=A/g,E=Math.exp(-L*L/2);m.push(E),A===0?y+=E:A<x&&(y+=2*E)}for(let A=0;A<m.length;A++)m[A]=m[A]/y;d.envMap.value=e.texture,d.samples.value=x,d.weights.value=m,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:_}=this;d.dTheta.value=p,d.mipInt.value=_-n;const C=this._sizeLods[i],b=3*C*(i>_-Un?i-_+Un:0),S=4*(this._cubeSize-C);bi(t,b,S,3*C,2*C),l.setRenderTarget(t),l.render(h,Hi)}}function Of(r){const e=[],t=[],n=[];let i=r;const s=r-Un+1+Ha.length;for(let o=0;o<s;o++){const a=Math.pow(2,i);e.push(a);let l=1/a;o>r-Un?l=Ha[o-r+Un-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),u=-c,h=1+c,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,p=6,g=3,x=2,m=1,y=new Float32Array(g*p*f),_=new Float32Array(x*p*f),C=new Float32Array(m*p*f);for(let S=0;S<f;S++){const A=S%3*2/3-1,L=S>2?0:-1,E=[A,L,0,A+2/3,L,0,A+2/3,L+1,0,A,L,0,A+2/3,L+1,0,A,L+1,0];y.set(E,g*p*S),_.set(d,x*p*S);const T=[S,S,S,S,S,S];C.set(T,m*p*S)}const b=new pt;b.setAttribute("position",new Tt(y,g)),b.setAttribute("uv",new Tt(_,x)),b.setAttribute("faceIndex",new Tt(C,m)),n.push(new Ae(b,null)),i>Un&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function qa(r,e,t){const n=new zn(r,e,t);return n.texture.mapping=Js,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function bi(r,e,t,n,i){r.viewport.set(e,t,n,i),r.scissor.set(e,t,n,i)}function Nf(r,e,t){return new qe({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Lf,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:nr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function Uf(r,e,t){const n=new Float32Array(ei),i=new R(0,1,0);return new qe({name:"SphericalGaussianBlur",defines:{n:ei,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:nr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function Xa(){return new qe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:nr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function $a(){return new qe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:nr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Cn,depthTest:!1,depthWrite:!1})}function nr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function kf(r){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Qr||l===eo,u=l===Mi||l===Ci;if(c||u){let h=e.get(a);const d=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new Va(r)),h=c?t.fromEquirectangular(a,h):t.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),h.texture;if(h!==void 0)return h.texture;{const f=a.image;return c&&f&&f.height>0||u&&f&&i(f)?(t===null&&(t=new Va(r)),h=c?t.fromEquirectangular(a):t.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),a.addEventListener("dispose",s),h.texture):null}}}return a}function i(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Gf(r){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=r.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Qi("WebGLRenderer: "+n+" extension not supported."),i}}}function Bf(r,e,t,n){const i={},s=new WeakMap;function o(h){const d=h.target;d.index!==null&&e.remove(d.index);for(const p in d.attributes)e.remove(d.attributes[p]);d.removeEventListener("dispose",o),delete i[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(h,d){return i[d.id]===!0||(d.addEventListener("dispose",o),i[d.id]=!0,t.memory.geometries++),d}function l(h){const d=h.attributes;for(const f in d)e.update(d[f],r.ARRAY_BUFFER)}function c(h){const d=[],f=h.index,p=h.attributes.position;let g=0;if(f!==null){const y=f.array;g=f.version;for(let _=0,C=y.length;_<C;_+=3){const b=y[_+0],S=y[_+1],A=y[_+2];d.push(b,S,S,A,A,b)}}else if(p!==void 0){const y=p.array;g=p.version;for(let _=0,C=y.length/3-1;_<C;_+=3){const b=_+0,S=_+1,A=_+2;d.push(b,S,S,A,A,b)}}else return;const x=new(Pl(d)?Ol:Fl)(d,1);x.version=g;const m=s.get(h);m&&e.remove(m),s.set(h,x)}function u(h){const d=s.get(h);if(d){const f=h.index;f!==null&&d.version<f.version&&c(h)}else c(h);return s.get(h)}return{get:a,update:l,getWireframeAttribute:u}}function zf(r,e,t){let n;function i(d){n=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,f){r.drawElements(n,f,s,d*o),t.update(f,n,1)}function c(d,f,p){p!==0&&(r.drawElementsInstanced(n,f,s,d*o,p),t.update(f,n,p))}function u(d,f,p){if(p===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,d,0,p);let x=0;for(let m=0;m<p;m++)x+=f[m];t.update(x,n,1)}function h(d,f,p,g){if(p===0)return;const x=e.get("WEBGL_multi_draw");if(x===null)for(let m=0;m<d.length;m++)c(d[m]/o,f[m],g[m]);else{x.multiDrawElementsInstancedWEBGL(n,f,0,s,d,0,g,0,p);let m=0;for(let y=0;y<p;y++)m+=f[y]*g[y];t.update(m,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function Hf(r){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(t.calls++,o){case r.TRIANGLES:t.triangles+=a*(s/3);break;case r.LINES:t.lines+=a*(s/2);break;case r.LINE_STRIP:t.lines+=a*(s-1);break;case r.LINE_LOOP:t.lines+=a*s;break;case r.POINTS:t.points+=a*s;break;default:wt("WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Wf(r,e,t){const n=new WeakMap,i=new vt;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0;let d=n.get(a);if(d===void 0||d.count!==h){let E=function(){A.dispose(),n.delete(a),a.removeEventListener("dispose",E)};d!==void 0&&d.texture.dispose();const f=a.morphAttributes.position!==void 0,p=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,x=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let _=0;f===!0&&(_=1),p===!0&&(_=2),g===!0&&(_=3);let C=a.attributes.position.count*_,b=1;C>e.maxTextureSize&&(b=Math.ceil(C/e.maxTextureSize),C=e.maxTextureSize);const S=new Float32Array(C*b*4*h),A=new Dl(S,C,b,h);A.type=Mn,A.needsUpdate=!0;const L=_*4;for(let T=0;T<h;T++){const I=x[T],F=m[T],G=y[T],z=C*b*4*T;for(let X=0;X<I.count;X++){const V=X*L;f===!0&&(i.fromBufferAttribute(I,X),S[z+V+0]=i.x,S[z+V+1]=i.y,S[z+V+2]=i.z,S[z+V+3]=0),p===!0&&(i.fromBufferAttribute(F,X),S[z+V+4]=i.x,S[z+V+5]=i.y,S[z+V+6]=i.z,S[z+V+7]=0),g===!0&&(i.fromBufferAttribute(G,X),S[z+V+8]=i.x,S[z+V+9]=i.y,S[z+V+10]=i.z,S[z+V+11]=G.itemSize===4?i.w:1)}}d={count:h,texture:A,size:new ct(C,b)},n.set(a,d),a.addEventListener("dispose",E)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(r,"morphTexture",o.morphTexture,t);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];const p=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(r,"morphTargetBaseInfluence",p),l.getUniforms().setValue(r,"morphTargetInfluences",c)}l.getUniforms().setValue(r,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(r,"morphTargetsTextureSize",d.size)}return{update:s}}function Vf(r,e,t,n){let i=new WeakMap;function s(l){const c=n.render.frame,u=l.geometry,h=e.get(l,u);if(i.get(h)!==c&&(e.update(h),i.set(h,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(t.update(l.instanceMatrix,r.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,r.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;i.get(d)!==c&&(d.update(),i.set(d,c))}return h}function o(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}const Vl=new zt,Ya=new jo(1,1),ql=new Dl,Xl=new nh,$l=new kl,Ka=[],ja=[],Ja=new Float32Array(16),Za=new Float32Array(9),Qa=new Float32Array(4);function Li(r,e,t){const n=r[0];if(n<=0||n>0)return r;const i=e*t;let s=Ka[i];if(s===void 0&&(s=new Float32Array(i),Ka[i]=s),e!==0){n.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,r[o].toArray(s,a)}return s}function Lt(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function Ft(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function ir(r,e){let t=ja[e];t===void 0&&(t=new Int32Array(e),ja[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function qf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function Xf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;r.uniform2fv(this.addr,e),Ft(t,e)}}function $f(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Lt(t,e))return;r.uniform3fv(this.addr,e),Ft(t,e)}}function Yf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;r.uniform4fv(this.addr,e),Ft(t,e)}}function Kf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),Ft(t,e)}else{if(Lt(t,n))return;Qa.set(n),r.uniformMatrix2fv(this.addr,!1,Qa),Ft(t,n)}}function jf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),Ft(t,e)}else{if(Lt(t,n))return;Za.set(n),r.uniformMatrix3fv(this.addr,!1,Za),Ft(t,n)}}function Jf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),Ft(t,e)}else{if(Lt(t,n))return;Ja.set(n),r.uniformMatrix4fv(this.addr,!1,Ja),Ft(t,n)}}function Zf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function Qf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;r.uniform2iv(this.addr,e),Ft(t,e)}}function ep(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;r.uniform3iv(this.addr,e),Ft(t,e)}}function tp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;r.uniform4iv(this.addr,e),Ft(t,e)}}function np(r,e){const t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function ip(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;r.uniform2uiv(this.addr,e),Ft(t,e)}}function sp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;r.uniform3uiv(this.addr,e),Ft(t,e)}}function rp(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;r.uniform4uiv(this.addr,e),Ft(t,e)}}function op(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);let s;this.type===r.SAMPLER_2D_SHADOW?(Ya.compareFunction=Rl,s=Ya):s=Vl,t.setTexture2D(e||s,i)}function ap(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Xl,i)}function lp(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||$l,i)}function cp(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||ql,i)}function hp(r){switch(r){case 5126:return qf;case 35664:return Xf;case 35665:return $f;case 35666:return Yf;case 35674:return Kf;case 35675:return jf;case 35676:return Jf;case 5124:case 35670:return Zf;case 35667:case 35671:return Qf;case 35668:case 35672:return ep;case 35669:case 35673:return tp;case 5125:return np;case 36294:return ip;case 36295:return sp;case 36296:return rp;case 35678:case 36198:case 36298:case 36306:case 35682:return op;case 35679:case 36299:case 36307:return ap;case 35680:case 36300:case 36308:case 36293:return lp;case 36289:case 36303:case 36311:case 36292:return cp}}function up(r,e){r.uniform1fv(this.addr,e)}function dp(r,e){const t=Li(e,this.size,2);r.uniform2fv(this.addr,t)}function fp(r,e){const t=Li(e,this.size,3);r.uniform3fv(this.addr,t)}function pp(r,e){const t=Li(e,this.size,4);r.uniform4fv(this.addr,t)}function mp(r,e){const t=Li(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function gp(r,e){const t=Li(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function xp(r,e){const t=Li(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function vp(r,e){r.uniform1iv(this.addr,e)}function yp(r,e){r.uniform2iv(this.addr,e)}function _p(r,e){r.uniform3iv(this.addr,e)}function Sp(r,e){r.uniform4iv(this.addr,e)}function bp(r,e){r.uniform1uiv(this.addr,e)}function Tp(r,e){r.uniform2uiv(this.addr,e)}function Ep(r,e){r.uniform3uiv(this.addr,e)}function Mp(r,e){r.uniform4uiv(this.addr,e)}function Cp(r,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(r.uniform1iv(this.addr,s),Ft(n,s));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||Vl,s[o])}function Ap(r,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(r.uniform1iv(this.addr,s),Ft(n,s));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Xl,s[o])}function wp(r,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(r.uniform1iv(this.addr,s),Ft(n,s));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||$l,s[o])}function Ip(r,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(r.uniform1iv(this.addr,s),Ft(n,s));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||ql,s[o])}function Rp(r){switch(r){case 5126:return up;case 35664:return dp;case 35665:return fp;case 35666:return pp;case 35674:return mp;case 35675:return gp;case 35676:return xp;case 5124:case 35670:return vp;case 35667:case 35671:return yp;case 35668:case 35672:return _p;case 35669:case 35673:return Sp;case 5125:return bp;case 36294:return Tp;case 36295:return Ep;case 36296:return Mp;case 35678:case 36198:case 36298:case 36306:case 35682:return Cp;case 35679:case 36299:case 36307:return Ap;case 35680:case 36300:case 36308:case 36293:return wp;case 36289:case 36303:case 36311:case 36292:return Ip}}class Pp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=hp(t.type)}}class Dp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Rp(t.type)}}class Lp{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let s=0,o=i.length;s!==o;++s){const a=i[s];a.setValue(e,t[a.id],n)}}}const Gr=/(\w+)(\])?(\[|\.)?/g;function el(r,e){r.seq.push(e),r.map[e.id]=e}function Fp(r,e,t){const n=r.name,i=n.length;for(Gr.lastIndex=0;;){const s=Gr.exec(n),o=Gr.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){el(t,c===void 0?new Pp(a,r,e):new Dp(a,r,e));break}else{let h=t.map[a];h===void 0&&(h=new Lp(a),el(t,h)),t=h}}}class Bs{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const s=e.getActiveUniform(t,i),o=e.getUniformLocation(t,s.name);Fp(s,o,this)}}setValue(e,t,n,i){const s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,s=e.length;i!==s;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function tl(r,e,t){const n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}const Op=37297;let Np=0;function Up(r,e){const t=r.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=i;o<s;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const nl=new et;function kp(r){dt._getMatrix(nl,dt.workingColorSpace,r);const e=`mat3( ${nl.elements.map(t=>t.toFixed(4))} )`;switch(dt.getTransfer(r)){case $s:return[e,"LinearTransferOETF"];case xt:return[e,"sRGBTransferOETF"];default:return Je("WebGLProgram: Unsupported color space: ",r),[e,"LinearTransferOETF"]}}function il(r,e,t){const n=r.getShaderParameter(e,r.COMPILE_STATUS),s=(r.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+Up(r.getShaderSource(e),a)}else return s}function Gp(r,e){const t=kp(e);return[`vec4 ${r}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Bp(r,e){let t;switch(e){case Rc:t="Linear";break;case Pc:t="Reinhard";break;case Dc:t="Cineon";break;case Lc:t="ACESFilmic";break;case Oc:t="AgX";break;case Nc:t="Neutral";break;case Fc:t="Custom";break;default:Je("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Rs=new R;function zp(){dt.getLuminanceCoefficients(Rs);const r=Rs.x.toFixed(4),e=Rs.y.toFixed(4),t=Rs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Hp(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($i).join(`
`)}function Wp(r){const e=[];for(const t in r){const n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Vp(r,e){const t={},n=r.getProgramParameter(e,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const s=r.getActiveAttrib(e,i),o=s.name;let a=1;s.type===r.FLOAT_MAT2&&(a=2),s.type===r.FLOAT_MAT3&&(a=3),s.type===r.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:r.getAttribLocation(e,o),locationSize:a}}return t}function $i(r){return r!==""}function sl(r,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function rl(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const qp=/^[ \t]*#include +<([\w\d./]+)>/gm;function Fo(r){return r.replace(qp,$p)}const Xp=new Map;function $p(r,e){let t=it[e];if(t===void 0){const n=Xp.get(e);if(n!==void 0)t=it[n],Je('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Fo(t)}const Yp=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ol(r){return r.replace(Yp,Kp)}function Kp(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function al(r){let e=`precision ${r.precision} float;
	precision ${r.precision} int;
	precision ${r.precision} sampler2D;
	precision ${r.precision} samplerCube;
	precision ${r.precision} sampler3D;
	precision ${r.precision} sampler2DArray;
	precision ${r.precision} sampler2DShadow;
	precision ${r.precision} samplerCubeShadow;
	precision ${r.precision} sampler2DArrayShadow;
	precision ${r.precision} isampler2D;
	precision ${r.precision} isampler3D;
	precision ${r.precision} isamplerCube;
	precision ${r.precision} isampler2DArray;
	precision ${r.precision} usampler2D;
	precision ${r.precision} usampler3D;
	precision ${r.precision} usamplerCube;
	precision ${r.precision} usampler2DArray;
	`;return r.precision==="highp"?e+=`
#define HIGH_PRECISION`:r.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function jp(r){let e="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===yl?e="SHADOWMAP_TYPE_PCF":r.shadowMapType===_l?e="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===Tn&&(e="SHADOWMAP_TYPE_VSM"),e}function Jp(r){let e="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case Mi:case Ci:e="ENVMAP_TYPE_CUBE";break;case Js:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Zp(r){let e="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case Ci:e="ENVMAP_MODE_REFRACTION";break}return e}function Qp(r){let e="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case Go:e="ENVMAP_BLENDING_MULTIPLY";break;case wc:e="ENVMAP_BLENDING_MIX";break;case Ic:e="ENVMAP_BLENDING_ADD";break}return e}function em(r){const e=r.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function tm(r,e,t,n){const i=r.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=jp(t),c=Jp(t),u=Zp(t),h=Qp(t),d=em(t),f=Hp(t),p=Wp(s),g=i.createProgram();let x,m,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter($i).join(`
`),x.length>0&&(x+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter($i).join(`
`),m.length>0&&(m+=`
`)):(x=[al(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($i).join(`
`),m=[al(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==kn?"#define TONE_MAPPING":"",t.toneMapping!==kn?it.tonemapping_pars_fragment:"",t.toneMapping!==kn?Bp("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",it.colorspace_pars_fragment,Gp("linearToOutputTexel",t.outputColorSpace),zp(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter($i).join(`
`)),o=Fo(o),o=sl(o,t),o=rl(o,t),a=Fo(a),a=sl(a,t),a=rl(a,t),o=ol(o),a=ol(a),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,x=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+x,m=["#define varying in",t.glslVersion===ha?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ha?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const _=y+x+o,C=y+m+a,b=tl(i,i.VERTEX_SHADER,_),S=tl(i,i.FRAGMENT_SHADER,C);i.attachShader(g,b),i.attachShader(g,S),t.index0AttributeName!==void 0?i.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(g,0,"position"),i.linkProgram(g);function A(I){if(r.debug.checkShaderErrors){const F=i.getProgramInfoLog(g)||"",G=i.getShaderInfoLog(b)||"",z=i.getShaderInfoLog(S)||"",X=F.trim(),V=G.trim(),Q=z.trim();let q=!0,ee=!0;if(i.getProgramParameter(g,i.LINK_STATUS)===!1)if(q=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,g,b,S);else{const te=il(i,b,"vertex"),pe=il(i,S,"fragment");wt("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(g,i.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+X+`
`+te+`
`+pe)}else X!==""?Je("WebGLProgram: Program Info Log:",X):(V===""||Q==="")&&(ee=!1);ee&&(I.diagnostics={runnable:q,programLog:X,vertexShader:{log:V,prefix:x},fragmentShader:{log:Q,prefix:m}})}i.deleteShader(b),i.deleteShader(S),L=new Bs(i,g),E=Vp(i,g)}let L;this.getUniforms=function(){return L===void 0&&A(this),L};let E;this.getAttributes=function(){return E===void 0&&A(this),E};let T=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(g,Op)),T},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Np++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=b,this.fragmentShader=S,this}let nm=0;class im{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new sm(e),t.set(e,n)),n}}class sm{constructor(e){this.id=nm++,this.code=e,this.usedTimes=0}}function rm(r,e,t,n,i,s,o){const a=new Yo,l=new im,c=new Set,u=[],h=i.logarithmicDepthBuffer,d=i.vertexTextures;let f=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(E){return c.add(E),E===0?"uv":`uv${E}`}function x(E,T,I,F,G){const z=F.fog,X=G.geometry,V=E.isMeshStandardMaterial?F.environment:null,Q=(E.isMeshStandardMaterial?t:e).get(E.envMap||V),q=Q&&Q.mapping===Js?Q.image.height:null,ee=p[E.type];E.precision!==null&&(f=i.getMaxPrecision(E.precision),f!==E.precision&&Je("WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));const te=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,pe=te!==void 0?te.length:0;let Pe=0;X.morphAttributes.position!==void 0&&(Pe=1),X.morphAttributes.normal!==void 0&&(Pe=2),X.morphAttributes.color!==void 0&&(Pe=3);let ve,Me,Ge,j;if(ee){const mt=fn[ee];ve=mt.vertexShader,Me=mt.fragmentShader}else ve=E.vertexShader,Me=E.fragmentShader,l.update(E),Ge=l.getVertexShaderID(E),j=l.getFragmentShaderID(E);const J=r.getRenderTarget(),ue=r.state.buffers.depth.getReversed(),ae=G.isInstancedMesh===!0,le=G.isBatchedMesh===!0,we=!!E.map,st=!!E.matcap,ke=!!Q,tt=!!E.aoMap,O=!!E.lightMap,Ie=!!E.bumpMap,Ne=!!E.normalMap,He=!!E.displacementMap,fe=!!E.emissiveMap,nt=!!E.metalnessMap,Te=!!E.roughnessMap,De=E.anisotropy>0,D=E.clearcoat>0,M=E.dispersion>0,B=E.iridescence>0,Z=E.sheen>0,re=E.transmission>0,$=De&&!!E.anisotropyMap,Re=D&&!!E.clearcoatMap,ie=D&&!!E.clearcoatNormalMap,ne=D&&!!E.clearcoatRoughnessMap,me=B&&!!E.iridescenceMap,se=B&&!!E.iridescenceThicknessMap,he=Z&&!!E.sheenColorMap,Xe=Z&&!!E.sheenRoughnessMap,We=!!E.specularMap,Ee=!!E.specularColorMap,Ye=!!E.specularIntensityMap,U=re&&!!E.transmissionMap,_e=re&&!!E.thicknessMap,ge=!!E.gradientMap,xe=!!E.alphaMap,ce=E.alphaTest>0,oe=!!E.alphaHash,Le=!!E.extensions;let je=kn;E.toneMapped&&(J===null||J.isXRRenderTarget===!0)&&(je=r.toneMapping);const St={shaderID:ee,shaderType:E.type,shaderName:E.name,vertexShader:ve,fragmentShader:Me,defines:E.defines,customVertexShaderID:Ge,customFragmentShaderID:j,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:le,batchingColor:le&&G._colorsTexture!==null,instancing:ae,instancingColor:ae&&G.instanceColor!==null,instancingMorph:ae&&G.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:J===null?r.outputColorSpace:J.isXRRenderTarget===!0?J.texture.colorSpace:wi,alphaToCoverage:!!E.alphaToCoverage,map:we,matcap:st,envMap:ke,envMapMode:ke&&Q.mapping,envMapCubeUVHeight:q,aoMap:tt,lightMap:O,bumpMap:Ie,normalMap:Ne,displacementMap:d&&He,emissiveMap:fe,normalMapObjectSpace:Ne&&E.normalMapType===Bc,normalMapTangentSpace:Ne&&E.normalMapType===Il,metalnessMap:nt,roughnessMap:Te,anisotropy:De,anisotropyMap:$,clearcoat:D,clearcoatMap:Re,clearcoatNormalMap:ie,clearcoatRoughnessMap:ne,dispersion:M,iridescence:B,iridescenceMap:me,iridescenceThicknessMap:se,sheen:Z,sheenColorMap:he,sheenRoughnessMap:Xe,specularMap:We,specularColorMap:Ee,specularIntensityMap:Ye,transmission:re,transmissionMap:U,thicknessMap:_e,gradientMap:ge,opaque:E.transparent===!1&&E.blending===ri&&E.alphaToCoverage===!1,alphaMap:xe,alphaTest:ce,alphaHash:oe,combine:E.combine,mapUv:we&&g(E.map.channel),aoMapUv:tt&&g(E.aoMap.channel),lightMapUv:O&&g(E.lightMap.channel),bumpMapUv:Ie&&g(E.bumpMap.channel),normalMapUv:Ne&&g(E.normalMap.channel),displacementMapUv:He&&g(E.displacementMap.channel),emissiveMapUv:fe&&g(E.emissiveMap.channel),metalnessMapUv:nt&&g(E.metalnessMap.channel),roughnessMapUv:Te&&g(E.roughnessMap.channel),anisotropyMapUv:$&&g(E.anisotropyMap.channel),clearcoatMapUv:Re&&g(E.clearcoatMap.channel),clearcoatNormalMapUv:ie&&g(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ne&&g(E.clearcoatRoughnessMap.channel),iridescenceMapUv:me&&g(E.iridescenceMap.channel),iridescenceThicknessMapUv:se&&g(E.iridescenceThicknessMap.channel),sheenColorMapUv:he&&g(E.sheenColorMap.channel),sheenRoughnessMapUv:Xe&&g(E.sheenRoughnessMap.channel),specularMapUv:We&&g(E.specularMap.channel),specularColorMapUv:Ee&&g(E.specularColorMap.channel),specularIntensityMapUv:Ye&&g(E.specularIntensityMap.channel),transmissionMapUv:U&&g(E.transmissionMap.channel),thicknessMapUv:_e&&g(E.thicknessMap.channel),alphaMapUv:xe&&g(E.alphaMap.channel),vertexTangents:!!X.attributes.tangent&&(Ne||De),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,pointsUvs:G.isPoints===!0&&!!X.attributes.uv&&(we||xe),fog:!!z,useFog:E.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:E.flatShading===!0&&E.wireframe===!1,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:ue,skinning:G.isSkinnedMesh===!0,morphTargets:X.morphAttributes.position!==void 0,morphNormals:X.morphAttributes.normal!==void 0,morphColors:X.morphAttributes.color!==void 0,morphTargetsCount:pe,morphTextureStride:Pe,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:E.dithering,shadowMapEnabled:r.shadowMap.enabled&&I.length>0,shadowMapType:r.shadowMap.type,toneMapping:je,decodeVideoTexture:we&&E.map.isVideoTexture===!0&&dt.getTransfer(E.map.colorSpace)===xt,decodeVideoTextureEmissive:fe&&E.emissiveMap.isVideoTexture===!0&&dt.getTransfer(E.emissiveMap.colorSpace)===xt,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===Yt,flipSided:E.side===Bt,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:Le&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Le&&E.extensions.multiDraw===!0||le)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return St.vertexUv1s=c.has(1),St.vertexUv2s=c.has(2),St.vertexUv3s=c.has(3),c.clear(),St}function m(E){const T=[];if(E.shaderID?T.push(E.shaderID):(T.push(E.customVertexShaderID),T.push(E.customFragmentShaderID)),E.defines!==void 0)for(const I in E.defines)T.push(I),T.push(E.defines[I]);return E.isRawShaderMaterial===!1&&(y(T,E),_(T,E),T.push(r.outputColorSpace)),T.push(E.customProgramCacheKey),T.join()}function y(E,T){E.push(T.precision),E.push(T.outputColorSpace),E.push(T.envMapMode),E.push(T.envMapCubeUVHeight),E.push(T.mapUv),E.push(T.alphaMapUv),E.push(T.lightMapUv),E.push(T.aoMapUv),E.push(T.bumpMapUv),E.push(T.normalMapUv),E.push(T.displacementMapUv),E.push(T.emissiveMapUv),E.push(T.metalnessMapUv),E.push(T.roughnessMapUv),E.push(T.anisotropyMapUv),E.push(T.clearcoatMapUv),E.push(T.clearcoatNormalMapUv),E.push(T.clearcoatRoughnessMapUv),E.push(T.iridescenceMapUv),E.push(T.iridescenceThicknessMapUv),E.push(T.sheenColorMapUv),E.push(T.sheenRoughnessMapUv),E.push(T.specularMapUv),E.push(T.specularColorMapUv),E.push(T.specularIntensityMapUv),E.push(T.transmissionMapUv),E.push(T.thicknessMapUv),E.push(T.combine),E.push(T.fogExp2),E.push(T.sizeAttenuation),E.push(T.morphTargetsCount),E.push(T.morphAttributeCount),E.push(T.numDirLights),E.push(T.numPointLights),E.push(T.numSpotLights),E.push(T.numSpotLightMaps),E.push(T.numHemiLights),E.push(T.numRectAreaLights),E.push(T.numDirLightShadows),E.push(T.numPointLightShadows),E.push(T.numSpotLightShadows),E.push(T.numSpotLightShadowsWithMaps),E.push(T.numLightProbes),E.push(T.shadowMapType),E.push(T.toneMapping),E.push(T.numClippingPlanes),E.push(T.numClipIntersection),E.push(T.depthPacking)}function _(E,T){a.disableAll(),T.supportsVertexTextures&&a.enable(0),T.instancing&&a.enable(1),T.instancingColor&&a.enable(2),T.instancingMorph&&a.enable(3),T.matcap&&a.enable(4),T.envMap&&a.enable(5),T.normalMapObjectSpace&&a.enable(6),T.normalMapTangentSpace&&a.enable(7),T.clearcoat&&a.enable(8),T.iridescence&&a.enable(9),T.alphaTest&&a.enable(10),T.vertexColors&&a.enable(11),T.vertexAlphas&&a.enable(12),T.vertexUv1s&&a.enable(13),T.vertexUv2s&&a.enable(14),T.vertexUv3s&&a.enable(15),T.vertexTangents&&a.enable(16),T.anisotropy&&a.enable(17),T.alphaHash&&a.enable(18),T.batching&&a.enable(19),T.dispersion&&a.enable(20),T.batchingColor&&a.enable(21),T.gradientMap&&a.enable(22),E.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),E.push(a.mask)}function C(E){const T=p[E.type];let I;if(T){const F=fn[T];I=mh.clone(F.uniforms)}else I=E.uniforms;return I}function b(E,T){let I;for(let F=0,G=u.length;F<G;F++){const z=u[F];if(z.cacheKey===T){I=z,++I.usedTimes;break}}return I===void 0&&(I=new tm(r,T,E,s),u.push(I)),I}function S(E){if(--E.usedTimes===0){const T=u.indexOf(E);u[T]=u[u.length-1],u.pop(),E.destroy()}}function A(E){l.remove(E)}function L(){l.dispose()}return{getParameters:x,getProgramCacheKey:m,getUniforms:C,acquireProgram:b,releaseProgram:S,releaseShaderCache:A,programs:u,dispose:L}}function om(){let r=new WeakMap;function e(o){return r.has(o)}function t(o){let a=r.get(o);return a===void 0&&(a={},r.set(o,a)),a}function n(o){r.delete(o)}function i(o,a,l){r.get(o)[a]=l}function s(){r=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function am(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.material.id!==e.material.id?r.material.id-e.material.id:r.z!==e.z?r.z-e.z:r.id-e.id}function ll(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function cl(){const r=[];let e=0;const t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function o(h,d,f,p,g,x){let m=r[e];return m===void 0?(m={id:h.id,object:h,geometry:d,material:f,groupOrder:p,renderOrder:h.renderOrder,z:g,group:x},r[e]=m):(m.id=h.id,m.object=h,m.geometry=d,m.material=f,m.groupOrder=p,m.renderOrder=h.renderOrder,m.z=g,m.group=x),e++,m}function a(h,d,f,p,g,x){const m=o(h,d,f,p,g,x);f.transmission>0?n.push(m):f.transparent===!0?i.push(m):t.push(m)}function l(h,d,f,p,g,x){const m=o(h,d,f,p,g,x);f.transmission>0?n.unshift(m):f.transparent===!0?i.unshift(m):t.unshift(m)}function c(h,d){t.length>1&&t.sort(h||am),n.length>1&&n.sort(d||ll),i.length>1&&i.sort(d||ll)}function u(){for(let h=e,d=r.length;h<d;h++){const f=r[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:a,unshift:l,finish:u,sort:c}}function lm(){let r=new WeakMap;function e(n,i){const s=r.get(n);let o;return s===void 0?(o=new cl,r.set(n,[o])):i>=s.length?(o=new cl,s.push(o)):o=s[i],o}function t(){r=new WeakMap}return{get:e,dispose:t}}function cm(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new R,color:new Oe};break;case"SpotLight":t={position:new R,direction:new R,color:new Oe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new R,color:new Oe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new R,skyColor:new Oe,groundColor:new Oe};break;case"RectAreaLight":t={color:new Oe,position:new R,halfWidth:new R,halfHeight:new R};break}return r[e.id]=t,t}}}function hm(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ct,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}let um=0;function dm(r,e){return(e.castShadow?2:0)-(r.castShadow?2:0)+(e.map?1:0)-(r.map?1:0)}function fm(r){const e=new cm,t=hm(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new R);const i=new R,s=new ft,o=new ft;function a(c){let u=0,h=0,d=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,p=0,g=0,x=0,m=0,y=0,_=0,C=0,b=0,S=0,A=0;c.sort(dm);for(let E=0,T=c.length;E<T;E++){const I=c[E],F=I.color,G=I.intensity,z=I.distance,X=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)u+=F.r*G,h+=F.g*G,d+=F.b*G;else if(I.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(I.sh.coefficients[V],G);A++}else if(I.isDirectionalLight){const V=e.get(I);if(V.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){const Q=I.shadow,q=t.get(I);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,n.directionalShadow[f]=q,n.directionalShadowMap[f]=X,n.directionalShadowMatrix[f]=I.shadow.matrix,y++}n.directional[f]=V,f++}else if(I.isSpotLight){const V=e.get(I);V.position.setFromMatrixPosition(I.matrixWorld),V.color.copy(F).multiplyScalar(G),V.distance=z,V.coneCos=Math.cos(I.angle),V.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),V.decay=I.decay,n.spot[g]=V;const Q=I.shadow;if(I.map&&(n.spotLightMap[b]=I.map,b++,Q.updateMatrices(I),I.castShadow&&S++),n.spotLightMatrix[g]=Q.matrix,I.castShadow){const q=t.get(I);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,n.spotShadow[g]=q,n.spotShadowMap[g]=X,C++}g++}else if(I.isRectAreaLight){const V=e.get(I);V.color.copy(F).multiplyScalar(G),V.halfWidth.set(I.width*.5,0,0),V.halfHeight.set(0,I.height*.5,0),n.rectArea[x]=V,x++}else if(I.isPointLight){const V=e.get(I);if(V.color.copy(I.color).multiplyScalar(I.intensity),V.distance=I.distance,V.decay=I.decay,I.castShadow){const Q=I.shadow,q=t.get(I);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,q.shadowCameraNear=Q.camera.near,q.shadowCameraFar=Q.camera.far,n.pointShadow[p]=q,n.pointShadowMap[p]=X,n.pointShadowMatrix[p]=I.shadow.matrix,_++}n.point[p]=V,p++}else if(I.isHemisphereLight){const V=e.get(I);V.skyColor.copy(I.color).multiplyScalar(G),V.groundColor.copy(I.groundColor).multiplyScalar(G),n.hemi[m]=V,m++}}x>0&&(r.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ye.LTC_FLOAT_1,n.rectAreaLTC2=ye.LTC_FLOAT_2):(n.rectAreaLTC1=ye.LTC_HALF_1,n.rectAreaLTC2=ye.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;const L=n.hash;(L.directionalLength!==f||L.pointLength!==p||L.spotLength!==g||L.rectAreaLength!==x||L.hemiLength!==m||L.numDirectionalShadows!==y||L.numPointShadows!==_||L.numSpotShadows!==C||L.numSpotMaps!==b||L.numLightProbes!==A)&&(n.directional.length=f,n.spot.length=g,n.rectArea.length=x,n.point.length=p,n.hemi.length=m,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=_,n.pointShadowMap.length=_,n.spotShadow.length=C,n.spotShadowMap.length=C,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=_,n.spotLightMatrix.length=C+b-S,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=A,L.directionalLength=f,L.pointLength=p,L.spotLength=g,L.rectAreaLength=x,L.hemiLength=m,L.numDirectionalShadows=y,L.numPointShadows=_,L.numSpotShadows=C,L.numSpotMaps=b,L.numLightProbes=A,n.version=um++)}function l(c,u){let h=0,d=0,f=0,p=0,g=0;const x=u.matrixWorldInverse;for(let m=0,y=c.length;m<y;m++){const _=c[m];if(_.isDirectionalLight){const C=n.directional[h];C.direction.setFromMatrixPosition(_.matrixWorld),i.setFromMatrixPosition(_.target.matrixWorld),C.direction.sub(i),C.direction.transformDirection(x),h++}else if(_.isSpotLight){const C=n.spot[f];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),C.direction.setFromMatrixPosition(_.matrixWorld),i.setFromMatrixPosition(_.target.matrixWorld),C.direction.sub(i),C.direction.transformDirection(x),f++}else if(_.isRectAreaLight){const C=n.rectArea[p];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),o.identity(),s.copy(_.matrixWorld),s.premultiply(x),o.extractRotation(s),C.halfWidth.set(_.width*.5,0,0),C.halfHeight.set(0,_.height*.5,0),C.halfWidth.applyMatrix4(o),C.halfHeight.applyMatrix4(o),p++}else if(_.isPointLight){const C=n.point[d];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),d++}else if(_.isHemisphereLight){const C=n.hemi[g];C.direction.setFromMatrixPosition(_.matrixWorld),C.direction.transformDirection(x),g++}}}return{setup:a,setupView:l,state:n}}function hl(r){const e=new fm(r),t=[],n=[];function i(u){c.camera=u,t.length=0,n.length=0}function s(u){t.push(u)}function o(u){n.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function pm(r){let e=new WeakMap;function t(i,s=0){const o=e.get(i);let a;return o===void 0?(a=new hl(r),e.set(i,[a])):s>=o.length?(a=new hl(r),o.push(a)):a=o[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const mm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,gm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function xm(r,e,t){let n=new ss;const i=new ct,s=new ct,o=new vt,a=new Rh({depthPacking:Gc}),l=new Ph,c={},u=t.maxTextureSize,h={[Gn]:Bt,[Bt]:Gn,[Yt]:Yt},d=new qe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ct},radius:{value:4}},vertexShader:mm,fragmentShader:gm}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const p=new pt;p.setAttribute("position",new Tt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new Ae(p,d),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=yl;let m=this.type;this.render=function(S,A,L){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||S.length===0)return;const E=r.getRenderTarget(),T=r.getActiveCubeFace(),I=r.getActiveMipmapLevel(),F=r.state;F.setBlending(Cn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const G=m!==Tn&&this.type===Tn,z=m===Tn&&this.type!==Tn;for(let X=0,V=S.length;X<V;X++){const Q=S[X],q=Q.shadow;if(q===void 0){Je("WebGLShadowMap:",Q,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;i.copy(q.mapSize);const ee=q.getFrameExtents();if(i.multiply(ee),s.copy(q.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(s.x=Math.floor(u/ee.x),i.x=s.x*ee.x,q.mapSize.x=s.x),i.y>u&&(s.y=Math.floor(u/ee.y),i.y=s.y*ee.y,q.mapSize.y=s.y)),q.map===null||G===!0||z===!0){const pe=this.type!==Tn?{minFilter:ht,magFilter:ht}:{};q.map!==null&&q.map.dispose(),q.map=new zn(i.x,i.y,pe),q.map.texture.name=Q.name+".shadowMap",q.camera.updateProjectionMatrix()}r.setRenderTarget(q.map),r.clear();const te=q.getViewportCount();for(let pe=0;pe<te;pe++){const Pe=q.getViewport(pe);o.set(s.x*Pe.x,s.y*Pe.y,s.x*Pe.z,s.y*Pe.w),F.viewport(o),q.updateMatrices(Q,pe),n=q.getFrustum(),C(A,L,q.camera,Q,this.type)}q.isPointLightShadow!==!0&&this.type===Tn&&y(q,L),q.needsUpdate=!1}m=this.type,x.needsUpdate=!1,r.setRenderTarget(E,T,I)};function y(S,A){const L=e.update(g);d.defines.VSM_SAMPLES!==S.blurSamples&&(d.defines.VSM_SAMPLES=S.blurSamples,f.defines.VSM_SAMPLES=S.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new zn(i.x,i.y)),d.uniforms.shadow_pass.value=S.map.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,r.setRenderTarget(S.mapPass),r.clear(),r.renderBufferDirect(A,null,L,d,g,null),f.uniforms.shadow_pass.value=S.mapPass.texture,f.uniforms.resolution.value=S.mapSize,f.uniforms.radius.value=S.radius,r.setRenderTarget(S.map),r.clear(),r.renderBufferDirect(A,null,L,f,g,null)}function _(S,A,L,E){let T=null;const I=L.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(I!==void 0)T=I;else if(T=L.isPointLight===!0?l:a,r.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){const F=T.uuid,G=A.uuid;let z=c[F];z===void 0&&(z={},c[F]=z);let X=z[G];X===void 0&&(X=T.clone(),z[G]=X,A.addEventListener("dispose",b)),T=X}if(T.visible=A.visible,T.wireframe=A.wireframe,E===Tn?T.side=A.shadowSide!==null?A.shadowSide:A.side:T.side=A.shadowSide!==null?A.shadowSide:h[A.side],T.alphaMap=A.alphaMap,T.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,T.map=A.map,T.clipShadows=A.clipShadows,T.clippingPlanes=A.clippingPlanes,T.clipIntersection=A.clipIntersection,T.displacementMap=A.displacementMap,T.displacementScale=A.displacementScale,T.displacementBias=A.displacementBias,T.wireframeLinewidth=A.wireframeLinewidth,T.linewidth=A.linewidth,L.isPointLight===!0&&T.isMeshDistanceMaterial===!0){const F=r.properties.get(T);F.light=L}return T}function C(S,A,L,E,T){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&T===Tn)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,S.matrixWorld);const G=e.update(S),z=S.material;if(Array.isArray(z)){const X=G.groups;for(let V=0,Q=X.length;V<Q;V++){const q=X[V],ee=z[q.materialIndex];if(ee&&ee.visible){const te=_(S,ee,E,T);S.onBeforeShadow(r,S,A,L,G,te,q),r.renderBufferDirect(L,null,G,te,S,q),S.onAfterShadow(r,S,A,L,G,te,q)}}}else if(z.visible){const X=_(S,z,E,T);S.onBeforeShadow(r,S,A,L,G,X,null),r.renderBufferDirect(L,null,G,X,S,null),S.onAfterShadow(r,S,A,L,G,X,null)}}const F=S.children;for(let G=0,z=F.length;G<z;G++)C(F[G],A,L,E,T)}function b(S){S.target.removeEventListener("dispose",b);for(const L in c){const E=c[L],T=S.target.uuid;T in E&&(E[T].dispose(),delete E[T])}}}const vm={[Xr]:$r,[Yr]:Jr,[Kr]:Zr,[Ei]:jr,[$r]:Xr,[Jr]:Yr,[Zr]:Kr,[jr]:Ei};function ym(r,e){function t(){let U=!1;const _e=new vt;let ge=null;const xe=new vt(0,0,0,0);return{setMask:function(ce){ge!==ce&&!U&&(r.colorMask(ce,ce,ce,ce),ge=ce)},setLocked:function(ce){U=ce},setClear:function(ce,oe,Le,je,St){St===!0&&(ce*=je,oe*=je,Le*=je),_e.set(ce,oe,Le,je),xe.equals(_e)===!1&&(r.clearColor(ce,oe,Le,je),xe.copy(_e))},reset:function(){U=!1,ge=null,xe.set(-1,0,0,0)}}}function n(){let U=!1,_e=!1,ge=null,xe=null,ce=null;return{setReversed:function(oe){if(_e!==oe){const Le=e.get("EXT_clip_control");oe?Le.clipControlEXT(Le.LOWER_LEFT_EXT,Le.ZERO_TO_ONE_EXT):Le.clipControlEXT(Le.LOWER_LEFT_EXT,Le.NEGATIVE_ONE_TO_ONE_EXT),_e=oe;const je=ce;ce=null,this.setClear(je)}},getReversed:function(){return _e},setTest:function(oe){oe?J(r.DEPTH_TEST):ue(r.DEPTH_TEST)},setMask:function(oe){ge!==oe&&!U&&(r.depthMask(oe),ge=oe)},setFunc:function(oe){if(_e&&(oe=vm[oe]),xe!==oe){switch(oe){case Xr:r.depthFunc(r.NEVER);break;case $r:r.depthFunc(r.ALWAYS);break;case Yr:r.depthFunc(r.LESS);break;case Ei:r.depthFunc(r.LEQUAL);break;case Kr:r.depthFunc(r.EQUAL);break;case jr:r.depthFunc(r.GEQUAL);break;case Jr:r.depthFunc(r.GREATER);break;case Zr:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}xe=oe}},setLocked:function(oe){U=oe},setClear:function(oe){ce!==oe&&(_e&&(oe=1-oe),r.clearDepth(oe),ce=oe)},reset:function(){U=!1,ge=null,xe=null,ce=null,_e=!1}}}function i(){let U=!1,_e=null,ge=null,xe=null,ce=null,oe=null,Le=null,je=null,St=null;return{setTest:function(mt){U||(mt?J(r.STENCIL_TEST):ue(r.STENCIL_TEST))},setMask:function(mt){_e!==mt&&!U&&(r.stencilMask(mt),_e=mt)},setFunc:function(mt,dn,on){(ge!==mt||xe!==dn||ce!==on)&&(r.stencilFunc(mt,dn,on),ge=mt,xe=dn,ce=on)},setOp:function(mt,dn,on){(oe!==mt||Le!==dn||je!==on)&&(r.stencilOp(mt,dn,on),oe=mt,Le=dn,je=on)},setLocked:function(mt){U=mt},setClear:function(mt){St!==mt&&(r.clearStencil(mt),St=mt)},reset:function(){U=!1,_e=null,ge=null,xe=null,ce=null,oe=null,Le=null,je=null,St=null}}}const s=new t,o=new n,a=new i,l=new WeakMap,c=new WeakMap;let u={},h={},d=new WeakMap,f=[],p=null,g=!1,x=null,m=null,y=null,_=null,C=null,b=null,S=null,A=new Oe(0,0,0),L=0,E=!1,T=null,I=null,F=null,G=null,z=null;const X=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,Q=0;const q=r.getParameter(r.VERSION);q.indexOf("WebGL")!==-1?(Q=parseFloat(/^WebGL (\d)/.exec(q)[1]),V=Q>=1):q.indexOf("OpenGL ES")!==-1&&(Q=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),V=Q>=2);let ee=null,te={};const pe=r.getParameter(r.SCISSOR_BOX),Pe=r.getParameter(r.VIEWPORT),ve=new vt().fromArray(pe),Me=new vt().fromArray(Pe);function Ge(U,_e,ge,xe){const ce=new Uint8Array(4),oe=r.createTexture();r.bindTexture(U,oe),r.texParameteri(U,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(U,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let Le=0;Le<ge;Le++)U===r.TEXTURE_3D||U===r.TEXTURE_2D_ARRAY?r.texImage3D(_e,0,r.RGBA,1,1,xe,0,r.RGBA,r.UNSIGNED_BYTE,ce):r.texImage2D(_e+Le,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,ce);return oe}const j={};j[r.TEXTURE_2D]=Ge(r.TEXTURE_2D,r.TEXTURE_2D,1),j[r.TEXTURE_CUBE_MAP]=Ge(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[r.TEXTURE_2D_ARRAY]=Ge(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),j[r.TEXTURE_3D]=Ge(r.TEXTURE_3D,r.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),J(r.DEPTH_TEST),o.setFunc(Ei),Ie(!1),Ne(ra),J(r.CULL_FACE),tt(Cn);function J(U){u[U]!==!0&&(r.enable(U),u[U]=!0)}function ue(U){u[U]!==!1&&(r.disable(U),u[U]=!1)}function ae(U,_e){return h[U]!==_e?(r.bindFramebuffer(U,_e),h[U]=_e,U===r.DRAW_FRAMEBUFFER&&(h[r.FRAMEBUFFER]=_e),U===r.FRAMEBUFFER&&(h[r.DRAW_FRAMEBUFFER]=_e),!0):!1}function le(U,_e){let ge=f,xe=!1;if(U){ge=d.get(_e),ge===void 0&&(ge=[],d.set(_e,ge));const ce=U.textures;if(ge.length!==ce.length||ge[0]!==r.COLOR_ATTACHMENT0){for(let oe=0,Le=ce.length;oe<Le;oe++)ge[oe]=r.COLOR_ATTACHMENT0+oe;ge.length=ce.length,xe=!0}}else ge[0]!==r.BACK&&(ge[0]=r.BACK,xe=!0);xe&&r.drawBuffers(ge)}function we(U){return p!==U?(r.useProgram(U),p=U,!0):!1}const st={[Qn]:r.FUNC_ADD,[uc]:r.FUNC_SUBTRACT,[dc]:r.FUNC_REVERSE_SUBTRACT};st[fc]=r.MIN,st[pc]=r.MAX;const ke={[mc]:r.ZERO,[gc]:r.ONE,[xc]:r.SRC_COLOR,[Vr]:r.SRC_ALPHA,[Tc]:r.SRC_ALPHA_SATURATE,[Sc]:r.DST_COLOR,[yc]:r.DST_ALPHA,[vc]:r.ONE_MINUS_SRC_COLOR,[qr]:r.ONE_MINUS_SRC_ALPHA,[bc]:r.ONE_MINUS_DST_COLOR,[_c]:r.ONE_MINUS_DST_ALPHA,[Ec]:r.CONSTANT_COLOR,[Mc]:r.ONE_MINUS_CONSTANT_COLOR,[Cc]:r.CONSTANT_ALPHA,[Ac]:r.ONE_MINUS_CONSTANT_ALPHA};function tt(U,_e,ge,xe,ce,oe,Le,je,St,mt){if(U===Cn){g===!0&&(ue(r.BLEND),g=!1);return}if(g===!1&&(J(r.BLEND),g=!0),U!==hc){if(U!==x||mt!==E){if((m!==Qn||C!==Qn)&&(r.blendEquation(r.FUNC_ADD),m=Qn,C=Qn),mt)switch(U){case ri:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Wr:r.blendFunc(r.ONE,r.ONE);break;case oa:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case aa:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:wt("WebGLState: Invalid blending: ",U);break}else switch(U){case ri:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Wr:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case oa:wt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case aa:wt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:wt("WebGLState: Invalid blending: ",U);break}y=null,_=null,b=null,S=null,A.set(0,0,0),L=0,x=U,E=mt}return}ce=ce||_e,oe=oe||ge,Le=Le||xe,(_e!==m||ce!==C)&&(r.blendEquationSeparate(st[_e],st[ce]),m=_e,C=ce),(ge!==y||xe!==_||oe!==b||Le!==S)&&(r.blendFuncSeparate(ke[ge],ke[xe],ke[oe],ke[Le]),y=ge,_=xe,b=oe,S=Le),(je.equals(A)===!1||St!==L)&&(r.blendColor(je.r,je.g,je.b,St),A.copy(je),L=St),x=U,E=!1}function O(U,_e){U.side===Yt?ue(r.CULL_FACE):J(r.CULL_FACE);let ge=U.side===Bt;_e&&(ge=!ge),Ie(ge),U.blending===ri&&U.transparent===!1?tt(Cn):tt(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),s.setMask(U.colorWrite);const xe=U.stencilWrite;a.setTest(xe),xe&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),fe(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?J(r.SAMPLE_ALPHA_TO_COVERAGE):ue(r.SAMPLE_ALPHA_TO_COVERAGE)}function Ie(U){T!==U&&(U?r.frontFace(r.CW):r.frontFace(r.CCW),T=U)}function Ne(U){U!==lc?(J(r.CULL_FACE),U!==I&&(U===ra?r.cullFace(r.BACK):U===cc?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):ue(r.CULL_FACE),I=U}function He(U){U!==F&&(V&&r.lineWidth(U),F=U)}function fe(U,_e,ge){U?(J(r.POLYGON_OFFSET_FILL),(G!==_e||z!==ge)&&(r.polygonOffset(_e,ge),G=_e,z=ge)):ue(r.POLYGON_OFFSET_FILL)}function nt(U){U?J(r.SCISSOR_TEST):ue(r.SCISSOR_TEST)}function Te(U){U===void 0&&(U=r.TEXTURE0+X-1),ee!==U&&(r.activeTexture(U),ee=U)}function De(U,_e,ge){ge===void 0&&(ee===null?ge=r.TEXTURE0+X-1:ge=ee);let xe=te[ge];xe===void 0&&(xe={type:void 0,texture:void 0},te[ge]=xe),(xe.type!==U||xe.texture!==_e)&&(ee!==ge&&(r.activeTexture(ge),ee=ge),r.bindTexture(U,_e||j[U]),xe.type=U,xe.texture=_e)}function D(){const U=te[ee];U!==void 0&&U.type!==void 0&&(r.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function M(){try{r.compressedTexImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function B(){try{r.compressedTexImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function Z(){try{r.texSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function re(){try{r.texSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function $(){try{r.compressedTexSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function Re(){try{r.compressedTexSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function ie(){try{r.texStorage2D(...arguments)}catch(U){U("WebGLState:",U)}}function ne(){try{r.texStorage3D(...arguments)}catch(U){U("WebGLState:",U)}}function me(){try{r.texImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function se(){try{r.texImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function he(U){ve.equals(U)===!1&&(r.scissor(U.x,U.y,U.z,U.w),ve.copy(U))}function Xe(U){Me.equals(U)===!1&&(r.viewport(U.x,U.y,U.z,U.w),Me.copy(U))}function We(U,_e){let ge=c.get(_e);ge===void 0&&(ge=new WeakMap,c.set(_e,ge));let xe=ge.get(U);xe===void 0&&(xe=r.getUniformBlockIndex(_e,U.name),ge.set(U,xe))}function Ee(U,_e){const xe=c.get(_e).get(U);l.get(_e)!==xe&&(r.uniformBlockBinding(_e,xe,U.__bindingPointIndex),l.set(_e,xe))}function Ye(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),o.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),u={},ee=null,te={},h={},d=new WeakMap,f=[],p=null,g=!1,x=null,m=null,y=null,_=null,C=null,b=null,S=null,A=new Oe(0,0,0),L=0,E=!1,T=null,I=null,F=null,G=null,z=null,ve.set(0,0,r.canvas.width,r.canvas.height),Me.set(0,0,r.canvas.width,r.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:J,disable:ue,bindFramebuffer:ae,drawBuffers:le,useProgram:we,setBlending:tt,setMaterial:O,setFlipSided:Ie,setCullFace:Ne,setLineWidth:He,setPolygonOffset:fe,setScissorTest:nt,activeTexture:Te,bindTexture:De,unbindTexture:D,compressedTexImage2D:M,compressedTexImage3D:B,texImage2D:me,texImage3D:se,updateUBOMapping:We,uniformBlockBinding:Ee,texStorage2D:ie,texStorage3D:ne,texSubImage2D:Z,texSubImage3D:re,compressedTexSubImage2D:$,compressedTexSubImage3D:Re,scissor:he,viewport:Xe,reset:Ye}}function _m(r,e,t,n,i,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ct,u=new WeakMap;let h;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(D,M){return f?new OffscreenCanvas(D,M):Zi("canvas")}function g(D,M,B){let Z=1;const re=De(D);if((re.width>B||re.height>B)&&(Z=B/Math.max(re.width,re.height)),Z<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const $=Math.floor(Z*re.width),Re=Math.floor(Z*re.height);h===void 0&&(h=p($,Re));const ie=M?p($,Re):h;return ie.width=$,ie.height=Re,ie.getContext("2d").drawImage(D,0,0,$,Re),Je("WebGLRenderer: Texture has been resized from ("+re.width+"x"+re.height+") to ("+$+"x"+Re+")."),ie}else return"data"in D&&Je("WebGLRenderer: Image in DataTexture is too big ("+re.width+"x"+re.height+")."),D;return D}function x(D){return D.generateMipmaps}function m(D){r.generateMipmap(D)}function y(D){return D.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?r.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function _(D,M,B,Z,re=!1){if(D!==null){if(r[D]!==void 0)return r[D];Je("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let $=M;if(M===r.RED&&(B===r.FLOAT&&($=r.R32F),B===r.HALF_FLOAT&&($=r.R16F),B===r.UNSIGNED_BYTE&&($=r.R8)),M===r.RED_INTEGER&&(B===r.UNSIGNED_BYTE&&($=r.R8UI),B===r.UNSIGNED_SHORT&&($=r.R16UI),B===r.UNSIGNED_INT&&($=r.R32UI),B===r.BYTE&&($=r.R8I),B===r.SHORT&&($=r.R16I),B===r.INT&&($=r.R32I)),M===r.RG&&(B===r.FLOAT&&($=r.RG32F),B===r.HALF_FLOAT&&($=r.RG16F),B===r.UNSIGNED_BYTE&&($=r.RG8)),M===r.RG_INTEGER&&(B===r.UNSIGNED_BYTE&&($=r.RG8UI),B===r.UNSIGNED_SHORT&&($=r.RG16UI),B===r.UNSIGNED_INT&&($=r.RG32UI),B===r.BYTE&&($=r.RG8I),B===r.SHORT&&($=r.RG16I),B===r.INT&&($=r.RG32I)),M===r.RGB_INTEGER&&(B===r.UNSIGNED_BYTE&&($=r.RGB8UI),B===r.UNSIGNED_SHORT&&($=r.RGB16UI),B===r.UNSIGNED_INT&&($=r.RGB32UI),B===r.BYTE&&($=r.RGB8I),B===r.SHORT&&($=r.RGB16I),B===r.INT&&($=r.RGB32I)),M===r.RGBA_INTEGER&&(B===r.UNSIGNED_BYTE&&($=r.RGBA8UI),B===r.UNSIGNED_SHORT&&($=r.RGBA16UI),B===r.UNSIGNED_INT&&($=r.RGBA32UI),B===r.BYTE&&($=r.RGBA8I),B===r.SHORT&&($=r.RGBA16I),B===r.INT&&($=r.RGBA32I)),M===r.RGB&&(B===r.UNSIGNED_INT_5_9_9_9_REV&&($=r.RGB9_E5),B===r.UNSIGNED_INT_10F_11F_11F_REV&&($=r.R11F_G11F_B10F)),M===r.RGBA){const Re=re?$s:dt.getTransfer(Z);B===r.FLOAT&&($=r.RGBA32F),B===r.HALF_FLOAT&&($=r.RGBA16F),B===r.UNSIGNED_BYTE&&($=Re===xt?r.SRGB8_ALPHA8:r.RGBA8),B===r.UNSIGNED_SHORT_4_4_4_4&&($=r.RGBA4),B===r.UNSIGNED_SHORT_5_5_5_1&&($=r.RGB5_A1)}return($===r.R16F||$===r.R32F||$===r.RG16F||$===r.RG32F||$===r.RGBA16F||$===r.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function C(D,M){let B;return D?M===null||M===Bn||M===ji?B=r.DEPTH24_STENCIL8:M===Mn?B=r.DEPTH32F_STENCIL8:M===Ki&&(B=r.DEPTH24_STENCIL8,Je("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Bn||M===ji?B=r.DEPTH_COMPONENT24:M===Mn?B=r.DEPTH_COMPONENT32F:M===Ki&&(B=r.DEPTH_COMPONENT16),B}function b(D,M){return x(D)===!0||D.isFramebufferTexture&&D.minFilter!==ht&&D.minFilter!==rn?Math.log2(Math.max(M.width,M.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?M.mipmaps.length:1}function S(D){const M=D.target;M.removeEventListener("dispose",S),L(M),M.isVideoTexture&&u.delete(M)}function A(D){const M=D.target;M.removeEventListener("dispose",A),T(M)}function L(D){const M=n.get(D);if(M.__webglInit===void 0)return;const B=D.source,Z=d.get(B);if(Z){const re=Z[M.__cacheKey];re.usedTimes--,re.usedTimes===0&&E(D),Object.keys(Z).length===0&&d.delete(B)}n.remove(D)}function E(D){const M=n.get(D);r.deleteTexture(M.__webglTexture);const B=D.source,Z=d.get(B);delete Z[M.__cacheKey],o.memory.textures--}function T(D){const M=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(M.__webglFramebuffer[Z]))for(let re=0;re<M.__webglFramebuffer[Z].length;re++)r.deleteFramebuffer(M.__webglFramebuffer[Z][re]);else r.deleteFramebuffer(M.__webglFramebuffer[Z]);M.__webglDepthbuffer&&r.deleteRenderbuffer(M.__webglDepthbuffer[Z])}else{if(Array.isArray(M.__webglFramebuffer))for(let Z=0;Z<M.__webglFramebuffer.length;Z++)r.deleteFramebuffer(M.__webglFramebuffer[Z]);else r.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&r.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&r.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Z=0;Z<M.__webglColorRenderbuffer.length;Z++)M.__webglColorRenderbuffer[Z]&&r.deleteRenderbuffer(M.__webglColorRenderbuffer[Z]);M.__webglDepthRenderbuffer&&r.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const B=D.textures;for(let Z=0,re=B.length;Z<re;Z++){const $=n.get(B[Z]);$.__webglTexture&&(r.deleteTexture($.__webglTexture),o.memory.textures--),n.remove(B[Z])}n.remove(D)}let I=0;function F(){I=0}function G(){const D=I;return D>=i.maxTextures&&Je("WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+i.maxTextures),I+=1,D}function z(D){const M=[];return M.push(D.wrapS),M.push(D.wrapT),M.push(D.wrapR||0),M.push(D.magFilter),M.push(D.minFilter),M.push(D.anisotropy),M.push(D.internalFormat),M.push(D.format),M.push(D.type),M.push(D.generateMipmaps),M.push(D.premultiplyAlpha),M.push(D.flipY),M.push(D.unpackAlignment),M.push(D.colorSpace),M.join()}function X(D,M){const B=n.get(D);if(D.isVideoTexture&&nt(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&B.__version!==D.version){const Z=D.image;if(Z===null)Je("WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)Je("WebGLRenderer: Texture marked for update but image is incomplete");else{j(B,D,M);return}}else D.isExternalTexture&&(B.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D,B.__webglTexture,r.TEXTURE0+M)}function V(D,M){const B=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&B.__version!==D.version){j(B,D,M);return}else D.isExternalTexture&&(B.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D_ARRAY,B.__webglTexture,r.TEXTURE0+M)}function Q(D,M){const B=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&B.__version!==D.version){j(B,D,M);return}t.bindTexture(r.TEXTURE_3D,B.__webglTexture,r.TEXTURE0+M)}function q(D,M){const B=n.get(D);if(D.version>0&&B.__version!==D.version){J(B,D,M);return}t.bindTexture(r.TEXTURE_CUBE_MAP,B.__webglTexture,r.TEXTURE0+M)}const ee={[wn]:r.REPEAT,[It]:r.CLAMP_TO_EDGE,[to]:r.MIRRORED_REPEAT},te={[ht]:r.NEAREST,[Uc]:r.NEAREST_MIPMAP_NEAREST,[as]:r.NEAREST_MIPMAP_LINEAR,[rn]:r.LINEAR,[or]:r.LINEAR_MIPMAP_NEAREST,[si]:r.LINEAR_MIPMAP_LINEAR},pe={[zc]:r.NEVER,[$c]:r.ALWAYS,[Hc]:r.LESS,[Rl]:r.LEQUAL,[Wc]:r.EQUAL,[Xc]:r.GEQUAL,[Vc]:r.GREATER,[qc]:r.NOTEQUAL};function Pe(D,M){if(M.type===Mn&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===rn||M.magFilter===or||M.magFilter===as||M.magFilter===si||M.minFilter===rn||M.minFilter===or||M.minFilter===as||M.minFilter===si)&&Je("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(D,r.TEXTURE_WRAP_S,ee[M.wrapS]),r.texParameteri(D,r.TEXTURE_WRAP_T,ee[M.wrapT]),(D===r.TEXTURE_3D||D===r.TEXTURE_2D_ARRAY)&&r.texParameteri(D,r.TEXTURE_WRAP_R,ee[M.wrapR]),r.texParameteri(D,r.TEXTURE_MAG_FILTER,te[M.magFilter]),r.texParameteri(D,r.TEXTURE_MIN_FILTER,te[M.minFilter]),M.compareFunction&&(r.texParameteri(D,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(D,r.TEXTURE_COMPARE_FUNC,pe[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===ht||M.minFilter!==as&&M.minFilter!==si||M.type===Mn&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const B=e.get("EXT_texture_filter_anisotropic");r.texParameterf(D,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function ve(D,M){let B=!1;D.__webglInit===void 0&&(D.__webglInit=!0,M.addEventListener("dispose",S));const Z=M.source;let re=d.get(Z);re===void 0&&(re={},d.set(Z,re));const $=z(M);if($!==D.__cacheKey){re[$]===void 0&&(re[$]={texture:r.createTexture(),usedTimes:0},o.memory.textures++,B=!0),re[$].usedTimes++;const Re=re[D.__cacheKey];Re!==void 0&&(re[D.__cacheKey].usedTimes--,Re.usedTimes===0&&E(M)),D.__cacheKey=$,D.__webglTexture=re[$].texture}return B}function Me(D,M,B){return Math.floor(Math.floor(D/B)/M)}function Ge(D,M,B,Z){const $=D.updateRanges;if($.length===0)t.texSubImage2D(r.TEXTURE_2D,0,0,0,M.width,M.height,B,Z,M.data);else{$.sort((se,he)=>se.start-he.start);let Re=0;for(let se=1;se<$.length;se++){const he=$[Re],Xe=$[se],We=he.start+he.count,Ee=Me(Xe.start,M.width,4),Ye=Me(he.start,M.width,4);Xe.start<=We+1&&Ee===Ye&&Me(Xe.start+Xe.count-1,M.width,4)===Ee?he.count=Math.max(he.count,Xe.start+Xe.count-he.start):(++Re,$[Re]=Xe)}$.length=Re+1;const ie=r.getParameter(r.UNPACK_ROW_LENGTH),ne=r.getParameter(r.UNPACK_SKIP_PIXELS),me=r.getParameter(r.UNPACK_SKIP_ROWS);r.pixelStorei(r.UNPACK_ROW_LENGTH,M.width);for(let se=0,he=$.length;se<he;se++){const Xe=$[se],We=Math.floor(Xe.start/4),Ee=Math.ceil(Xe.count/4),Ye=We%M.width,U=Math.floor(We/M.width),_e=Ee,ge=1;r.pixelStorei(r.UNPACK_SKIP_PIXELS,Ye),r.pixelStorei(r.UNPACK_SKIP_ROWS,U),t.texSubImage2D(r.TEXTURE_2D,0,Ye,U,_e,ge,B,Z,M.data)}D.clearUpdateRanges(),r.pixelStorei(r.UNPACK_ROW_LENGTH,ie),r.pixelStorei(r.UNPACK_SKIP_PIXELS,ne),r.pixelStorei(r.UNPACK_SKIP_ROWS,me)}}function j(D,M,B){let Z=r.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(Z=r.TEXTURE_2D_ARRAY),M.isData3DTexture&&(Z=r.TEXTURE_3D);const re=ve(D,M),$=M.source;t.bindTexture(Z,D.__webglTexture,r.TEXTURE0+B);const Re=n.get($);if($.version!==Re.__version||re===!0){t.activeTexture(r.TEXTURE0+B);const ie=dt.getPrimaries(dt.workingColorSpace),ne=M.colorSpace===Nn?null:dt.getPrimaries(M.colorSpace),me=M.colorSpace===Nn||ie===ne?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,M.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,M.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,me);let se=g(M.image,!1,i.maxTextureSize);se=Te(M,se);const he=s.convert(M.format,M.colorSpace),Xe=s.convert(M.type);let We=_(M.internalFormat,he,Xe,M.colorSpace,M.isVideoTexture);Pe(Z,M);let Ee;const Ye=M.mipmaps,U=M.isVideoTexture!==!0,_e=Re.__version===void 0||re===!0,ge=$.dataReady,xe=b(M,se);if(M.isDepthTexture)We=C(M.format===Ji,M.type),_e&&(U?t.texStorage2D(r.TEXTURE_2D,1,We,se.width,se.height):t.texImage2D(r.TEXTURE_2D,0,We,se.width,se.height,0,he,Xe,null));else if(M.isDataTexture)if(Ye.length>0){U&&_e&&t.texStorage2D(r.TEXTURE_2D,xe,We,Ye[0].width,Ye[0].height);for(let ce=0,oe=Ye.length;ce<oe;ce++)Ee=Ye[ce],U?ge&&t.texSubImage2D(r.TEXTURE_2D,ce,0,0,Ee.width,Ee.height,he,Xe,Ee.data):t.texImage2D(r.TEXTURE_2D,ce,We,Ee.width,Ee.height,0,he,Xe,Ee.data);M.generateMipmaps=!1}else U?(_e&&t.texStorage2D(r.TEXTURE_2D,xe,We,se.width,se.height),ge&&Ge(M,se,he,Xe)):t.texImage2D(r.TEXTURE_2D,0,We,se.width,se.height,0,he,Xe,se.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){U&&_e&&t.texStorage3D(r.TEXTURE_2D_ARRAY,xe,We,Ye[0].width,Ye[0].height,se.depth);for(let ce=0,oe=Ye.length;ce<oe;ce++)if(Ee=Ye[ce],M.format!==un)if(he!==null)if(U){if(ge)if(M.layerUpdates.size>0){const Le=za(Ee.width,Ee.height,M.format,M.type);for(const je of M.layerUpdates){const St=Ee.data.subarray(je*Le/Ee.data.BYTES_PER_ELEMENT,(je+1)*Le/Ee.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ce,0,0,je,Ee.width,Ee.height,1,he,St)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ce,0,0,0,Ee.width,Ee.height,se.depth,he,Ee.data)}else t.compressedTexImage3D(r.TEXTURE_2D_ARRAY,ce,We,Ee.width,Ee.height,se.depth,0,Ee.data,0,0);else Je("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?ge&&t.texSubImage3D(r.TEXTURE_2D_ARRAY,ce,0,0,0,Ee.width,Ee.height,se.depth,he,Xe,Ee.data):t.texImage3D(r.TEXTURE_2D_ARRAY,ce,We,Ee.width,Ee.height,se.depth,0,he,Xe,Ee.data)}else{U&&_e&&t.texStorage2D(r.TEXTURE_2D,xe,We,Ye[0].width,Ye[0].height);for(let ce=0,oe=Ye.length;ce<oe;ce++)Ee=Ye[ce],M.format!==un?he!==null?U?ge&&t.compressedTexSubImage2D(r.TEXTURE_2D,ce,0,0,Ee.width,Ee.height,he,Ee.data):t.compressedTexImage2D(r.TEXTURE_2D,ce,We,Ee.width,Ee.height,0,Ee.data):Je("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?ge&&t.texSubImage2D(r.TEXTURE_2D,ce,0,0,Ee.width,Ee.height,he,Xe,Ee.data):t.texImage2D(r.TEXTURE_2D,ce,We,Ee.width,Ee.height,0,he,Xe,Ee.data)}else if(M.isDataArrayTexture)if(U){if(_e&&t.texStorage3D(r.TEXTURE_2D_ARRAY,xe,We,se.width,se.height,se.depth),ge)if(M.layerUpdates.size>0){const ce=za(se.width,se.height,M.format,M.type);for(const oe of M.layerUpdates){const Le=se.data.subarray(oe*ce/se.data.BYTES_PER_ELEMENT,(oe+1)*ce/se.data.BYTES_PER_ELEMENT);t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,oe,se.width,se.height,1,he,Xe,Le)}M.clearLayerUpdates()}else t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,se.width,se.height,se.depth,he,Xe,se.data)}else t.texImage3D(r.TEXTURE_2D_ARRAY,0,We,se.width,se.height,se.depth,0,he,Xe,se.data);else if(M.isData3DTexture)U?(_e&&t.texStorage3D(r.TEXTURE_3D,xe,We,se.width,se.height,se.depth),ge&&t.texSubImage3D(r.TEXTURE_3D,0,0,0,0,se.width,se.height,se.depth,he,Xe,se.data)):t.texImage3D(r.TEXTURE_3D,0,We,se.width,se.height,se.depth,0,he,Xe,se.data);else if(M.isFramebufferTexture){if(_e)if(U)t.texStorage2D(r.TEXTURE_2D,xe,We,se.width,se.height);else{let ce=se.width,oe=se.height;for(let Le=0;Le<xe;Le++)t.texImage2D(r.TEXTURE_2D,Le,We,ce,oe,0,he,Xe,null),ce>>=1,oe>>=1}}else if(Ye.length>0){if(U&&_e){const ce=De(Ye[0]);t.texStorage2D(r.TEXTURE_2D,xe,We,ce.width,ce.height)}for(let ce=0,oe=Ye.length;ce<oe;ce++)Ee=Ye[ce],U?ge&&t.texSubImage2D(r.TEXTURE_2D,ce,0,0,he,Xe,Ee):t.texImage2D(r.TEXTURE_2D,ce,We,he,Xe,Ee);M.generateMipmaps=!1}else if(U){if(_e){const ce=De(se);t.texStorage2D(r.TEXTURE_2D,xe,We,ce.width,ce.height)}ge&&t.texSubImage2D(r.TEXTURE_2D,0,0,0,he,Xe,se)}else t.texImage2D(r.TEXTURE_2D,0,We,he,Xe,se);x(M)&&m(Z),Re.__version=$.version,M.onUpdate&&M.onUpdate(M)}D.__version=M.version}function J(D,M,B){if(M.image.length!==6)return;const Z=ve(D,M),re=M.source;t.bindTexture(r.TEXTURE_CUBE_MAP,D.__webglTexture,r.TEXTURE0+B);const $=n.get(re);if(re.version!==$.__version||Z===!0){t.activeTexture(r.TEXTURE0+B);const Re=dt.getPrimaries(dt.workingColorSpace),ie=M.colorSpace===Nn?null:dt.getPrimaries(M.colorSpace),ne=M.colorSpace===Nn||Re===ie?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,M.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,M.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,ne);const me=M.isCompressedTexture||M.image[0].isCompressedTexture,se=M.image[0]&&M.image[0].isDataTexture,he=[];for(let oe=0;oe<6;oe++)!me&&!se?he[oe]=g(M.image[oe],!0,i.maxCubemapSize):he[oe]=se?M.image[oe].image:M.image[oe],he[oe]=Te(M,he[oe]);const Xe=he[0],We=s.convert(M.format,M.colorSpace),Ee=s.convert(M.type),Ye=_(M.internalFormat,We,Ee,M.colorSpace),U=M.isVideoTexture!==!0,_e=$.__version===void 0||Z===!0,ge=re.dataReady;let xe=b(M,Xe);Pe(r.TEXTURE_CUBE_MAP,M);let ce;if(me){U&&_e&&t.texStorage2D(r.TEXTURE_CUBE_MAP,xe,Ye,Xe.width,Xe.height);for(let oe=0;oe<6;oe++){ce=he[oe].mipmaps;for(let Le=0;Le<ce.length;Le++){const je=ce[Le];M.format!==un?We!==null?U?ge&&t.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le,0,0,je.width,je.height,We,je.data):t.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le,Ye,je.width,je.height,0,je.data):Je("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?ge&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le,0,0,je.width,je.height,We,Ee,je.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le,Ye,je.width,je.height,0,We,Ee,je.data)}}}else{if(ce=M.mipmaps,U&&_e){ce.length>0&&xe++;const oe=De(he[0]);t.texStorage2D(r.TEXTURE_CUBE_MAP,xe,Ye,oe.width,oe.height)}for(let oe=0;oe<6;oe++)if(se){U?ge&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,0,0,he[oe].width,he[oe].height,We,Ee,he[oe].data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,Ye,he[oe].width,he[oe].height,0,We,Ee,he[oe].data);for(let Le=0;Le<ce.length;Le++){const St=ce[Le].image[oe].image;U?ge&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le+1,0,0,St.width,St.height,We,Ee,St.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le+1,Ye,St.width,St.height,0,We,Ee,St.data)}}else{U?ge&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,0,0,We,Ee,he[oe]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0,Ye,We,Ee,he[oe]);for(let Le=0;Le<ce.length;Le++){const je=ce[Le];U?ge&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le+1,0,0,We,Ee,je.image[oe]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+oe,Le+1,Ye,We,Ee,je.image[oe])}}}x(M)&&m(r.TEXTURE_CUBE_MAP),$.__version=re.version,M.onUpdate&&M.onUpdate(M)}D.__version=M.version}function ue(D,M,B,Z,re,$){const Re=s.convert(B.format,B.colorSpace),ie=s.convert(B.type),ne=_(B.internalFormat,Re,ie,B.colorSpace),me=n.get(M),se=n.get(B);if(se.__renderTarget=M,!me.__hasExternalTextures){const he=Math.max(1,M.width>>$),Xe=Math.max(1,M.height>>$);re===r.TEXTURE_3D||re===r.TEXTURE_2D_ARRAY?t.texImage3D(re,$,ne,he,Xe,M.depth,0,Re,ie,null):t.texImage2D(re,$,ne,he,Xe,0,Re,ie,null)}t.bindFramebuffer(r.FRAMEBUFFER,D),fe(M)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,Z,re,se.__webglTexture,0,He(M)):(re===r.TEXTURE_2D||re>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&re<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,Z,re,se.__webglTexture,$),t.bindFramebuffer(r.FRAMEBUFFER,null)}function ae(D,M,B){if(r.bindRenderbuffer(r.RENDERBUFFER,D),M.depthBuffer){const Z=M.depthTexture,re=Z&&Z.isDepthTexture?Z.type:null,$=C(M.stencilBuffer,re),Re=M.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ie=He(M);fe(M)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,ie,$,M.width,M.height):B?r.renderbufferStorageMultisample(r.RENDERBUFFER,ie,$,M.width,M.height):r.renderbufferStorage(r.RENDERBUFFER,$,M.width,M.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,Re,r.RENDERBUFFER,D)}else{const Z=M.textures;for(let re=0;re<Z.length;re++){const $=Z[re],Re=s.convert($.format,$.colorSpace),ie=s.convert($.type),ne=_($.internalFormat,Re,ie,$.colorSpace),me=He(M);B&&fe(M)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,me,ne,M.width,M.height):fe(M)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,me,ne,M.width,M.height):r.renderbufferStorage(r.RENDERBUFFER,ne,M.width,M.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function le(D,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(r.FRAMEBUFFER,D),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=n.get(M.depthTexture);Z.__renderTarget=M,(!Z.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),X(M.depthTexture,0);const re=Z.__webglTexture,$=He(M);if(M.depthTexture.format===Ai)fe(M)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,re,0,$):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,re,0);else if(M.depthTexture.format===Ji)fe(M)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,re,0,$):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,re,0);else throw new Error("Unknown depthTexture format")}function we(D){const M=n.get(D),B=D.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==D.depthTexture){const Z=D.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),Z){const re=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,Z.removeEventListener("dispose",re)};Z.addEventListener("dispose",re),M.__depthDisposeCallback=re}M.__boundDepthTexture=Z}if(D.depthTexture&&!M.__autoAllocateDepthBuffer){if(B)throw new Error("target.depthTexture not supported in Cube render targets");const Z=D.texture.mipmaps;Z&&Z.length>0?le(M.__webglFramebuffer[0],D):le(M.__webglFramebuffer,D)}else if(B){M.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(r.FRAMEBUFFER,M.__webglFramebuffer[Z]),M.__webglDepthbuffer[Z]===void 0)M.__webglDepthbuffer[Z]=r.createRenderbuffer(),ae(M.__webglDepthbuffer[Z],D,!1);else{const re=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,$=M.__webglDepthbuffer[Z];r.bindRenderbuffer(r.RENDERBUFFER,$),r.framebufferRenderbuffer(r.FRAMEBUFFER,re,r.RENDERBUFFER,$)}}else{const Z=D.texture.mipmaps;if(Z&&Z.length>0?t.bindFramebuffer(r.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(r.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=r.createRenderbuffer(),ae(M.__webglDepthbuffer,D,!1);else{const re=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,$=M.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,$),r.framebufferRenderbuffer(r.FRAMEBUFFER,re,r.RENDERBUFFER,$)}}t.bindFramebuffer(r.FRAMEBUFFER,null)}function st(D,M,B){const Z=n.get(D);M!==void 0&&ue(Z.__webglFramebuffer,D,D.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),B!==void 0&&we(D)}function ke(D){const M=D.texture,B=n.get(D),Z=n.get(M);D.addEventListener("dispose",A);const re=D.textures,$=D.isWebGLCubeRenderTarget===!0,Re=re.length>1;if(Re||(Z.__webglTexture===void 0&&(Z.__webglTexture=r.createTexture()),Z.__version=M.version,o.memory.textures++),$){B.__webglFramebuffer=[];for(let ie=0;ie<6;ie++)if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer[ie]=[];for(let ne=0;ne<M.mipmaps.length;ne++)B.__webglFramebuffer[ie][ne]=r.createFramebuffer()}else B.__webglFramebuffer[ie]=r.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer=[];for(let ie=0;ie<M.mipmaps.length;ie++)B.__webglFramebuffer[ie]=r.createFramebuffer()}else B.__webglFramebuffer=r.createFramebuffer();if(Re)for(let ie=0,ne=re.length;ie<ne;ie++){const me=n.get(re[ie]);me.__webglTexture===void 0&&(me.__webglTexture=r.createTexture(),o.memory.textures++)}if(D.samples>0&&fe(D)===!1){B.__webglMultisampledFramebuffer=r.createFramebuffer(),B.__webglColorRenderbuffer=[],t.bindFramebuffer(r.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let ie=0;ie<re.length;ie++){const ne=re[ie];B.__webglColorRenderbuffer[ie]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,B.__webglColorRenderbuffer[ie]);const me=s.convert(ne.format,ne.colorSpace),se=s.convert(ne.type),he=_(ne.internalFormat,me,se,ne.colorSpace,D.isXRRenderTarget===!0),Xe=He(D);r.renderbufferStorageMultisample(r.RENDERBUFFER,Xe,he,D.width,D.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+ie,r.RENDERBUFFER,B.__webglColorRenderbuffer[ie])}r.bindRenderbuffer(r.RENDERBUFFER,null),D.depthBuffer&&(B.__webglDepthRenderbuffer=r.createRenderbuffer(),ae(B.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(r.FRAMEBUFFER,null)}}if($){t.bindTexture(r.TEXTURE_CUBE_MAP,Z.__webglTexture),Pe(r.TEXTURE_CUBE_MAP,M);for(let ie=0;ie<6;ie++)if(M.mipmaps&&M.mipmaps.length>0)for(let ne=0;ne<M.mipmaps.length;ne++)ue(B.__webglFramebuffer[ie][ne],D,M,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ne);else ue(B.__webglFramebuffer[ie],D,M,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0);x(M)&&m(r.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let ie=0,ne=re.length;ie<ne;ie++){const me=re[ie],se=n.get(me);let he=r.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(he=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(he,se.__webglTexture),Pe(he,me),ue(B.__webglFramebuffer,D,me,r.COLOR_ATTACHMENT0+ie,he,0),x(me)&&m(he)}t.unbindTexture()}else{let ie=r.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ie=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(ie,Z.__webglTexture),Pe(ie,M),M.mipmaps&&M.mipmaps.length>0)for(let ne=0;ne<M.mipmaps.length;ne++)ue(B.__webglFramebuffer[ne],D,M,r.COLOR_ATTACHMENT0,ie,ne);else ue(B.__webglFramebuffer,D,M,r.COLOR_ATTACHMENT0,ie,0);x(M)&&m(ie),t.unbindTexture()}D.depthBuffer&&we(D)}function tt(D){const M=D.textures;for(let B=0,Z=M.length;B<Z;B++){const re=M[B];if(x(re)){const $=y(D),Re=n.get(re).__webglTexture;t.bindTexture($,Re),m($),t.unbindTexture()}}}const O=[],Ie=[];function Ne(D){if(D.samples>0){if(fe(D)===!1){const M=D.textures,B=D.width,Z=D.height;let re=r.COLOR_BUFFER_BIT;const $=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,Re=n.get(D),ie=M.length>1;if(ie)for(let me=0;me<M.length;me++)t.bindFramebuffer(r.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+me,r.RENDERBUFFER,null),t.bindFramebuffer(r.FRAMEBUFFER,Re.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+me,r.TEXTURE_2D,null,0);t.bindFramebuffer(r.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);const ne=D.texture.mipmaps;ne&&ne.length>0?t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let me=0;me<M.length;me++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(re|=r.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(re|=r.STENCIL_BUFFER_BIT)),ie){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,Re.__webglColorRenderbuffer[me]);const se=n.get(M[me]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,se,0)}r.blitFramebuffer(0,0,B,Z,0,0,B,Z,re,r.NEAREST),l===!0&&(O.length=0,Ie.length=0,O.push(r.COLOR_ATTACHMENT0+me),D.depthBuffer&&D.resolveDepthBuffer===!1&&(O.push($),Ie.push($),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,Ie)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,O))}if(t.bindFramebuffer(r.READ_FRAMEBUFFER,null),t.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),ie)for(let me=0;me<M.length;me++){t.bindFramebuffer(r.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+me,r.RENDERBUFFER,Re.__webglColorRenderbuffer[me]);const se=n.get(M[me]).__webglTexture;t.bindFramebuffer(r.FRAMEBUFFER,Re.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+me,r.TEXTURE_2D,se,0)}t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const M=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[M])}}}function He(D){return Math.min(i.maxSamples,D.samples)}function fe(D){const M=n.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function nt(D){const M=o.render.frame;u.get(D)!==M&&(u.set(D,M),D.update())}function Te(D,M){const B=D.colorSpace,Z=D.format,re=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||B!==wi&&B!==Nn&&(dt.getTransfer(B)===xt?(Z!==un||re!==mn)&&Je("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):wt("WebGLTextures: Unsupported texture color space:",B)),M}function De(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=G,this.resetTextureUnits=F,this.setTexture2D=X,this.setTexture2DArray=V,this.setTexture3D=Q,this.setTextureCube=q,this.rebindTextures=st,this.setupRenderTarget=ke,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=Ne,this.setupDepthRenderbuffer=we,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=fe}function Sm(r,e){function t(n,i=Nn){let s;const o=dt.getTransfer(i);if(n===mn)return r.UNSIGNED_BYTE;if(n===zo)return r.UNSIGNED_SHORT_4_4_4_4;if(n===Ho)return r.UNSIGNED_SHORT_5_5_5_1;if(n===El)return r.UNSIGNED_INT_5_9_9_9_REV;if(n===Ml)return r.UNSIGNED_INT_10F_11F_11F_REV;if(n===bl)return r.BYTE;if(n===Tl)return r.SHORT;if(n===Ki)return r.UNSIGNED_SHORT;if(n===Bo)return r.INT;if(n===Bn)return r.UNSIGNED_INT;if(n===Mn)return r.FLOAT;if(n===Pi)return r.HALF_FLOAT;if(n===Cl)return r.ALPHA;if(n===Al)return r.RGB;if(n===un)return r.RGBA;if(n===Ai)return r.DEPTH_COMPONENT;if(n===Ji)return r.DEPTH_STENCIL;if(n===wl)return r.RED;if(n===Wo)return r.RED_INTEGER;if(n===Vo)return r.RG;if(n===qo)return r.RG_INTEGER;if(n===Xo)return r.RGBA_INTEGER;if(n===Ns||n===Us||n===ks||n===Gs)if(o===xt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Ns)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Us)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ks)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Gs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Ns)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Us)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ks)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Gs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===no||n===io||n===so||n===ro)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===no)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===io)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===so)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ro)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===oo||n===ao||n===lo)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===oo||n===ao)return o===xt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===lo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===co||n===ho||n===uo||n===fo||n===po||n===mo||n===go||n===xo||n===vo||n===yo||n===_o||n===So||n===bo||n===To)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===co)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ho)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===uo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===fo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===po)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===mo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===go)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===xo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===vo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===yo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===_o)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===So)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===bo)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===To)return o===xt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Eo||n===Mo||n===Co)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Eo)return o===xt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Mo)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Co)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ao||n===wo||n===Io||n===Ro)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===Ao)return s.COMPRESSED_RED_RGTC1_EXT;if(n===wo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Io)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ro)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ji?r.UNSIGNED_INT_24_8:r[n]!==void 0?r[n]:null}return{convert:t}}const bm=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Tm=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Em{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Bl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new qe({vertexShader:bm,fragmentShader:Tm,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ae(new er(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Mm extends Di{constructor(e,t){super();const n=this;let i=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,h=null,d=null,f=null,p=null;const g=typeof XRWebGLBinding<"u",x=new Em,m={},y=t.getContextAttributes();let _=null,C=null;const b=[],S=[],A=new ct;let L=null;const E=new Qt;E.viewport=new vt;const T=new Qt;T.viewport=new vt;const I=[E,T],F=new zh;let G=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let J=b[j];return J===void 0&&(J=new Ir,b[j]=J),J.getTargetRaySpace()},this.getControllerGrip=function(j){let J=b[j];return J===void 0&&(J=new Ir,b[j]=J),J.getGripSpace()},this.getHand=function(j){let J=b[j];return J===void 0&&(J=new Ir,b[j]=J),J.getHandSpace()};function X(j){const J=S.indexOf(j.inputSource);if(J===-1)return;const ue=b[J];ue!==void 0&&(ue.update(j.inputSource,j.frame,c||o),ue.dispatchEvent({type:j.type,data:j.inputSource}))}function V(){i.removeEventListener("select",X),i.removeEventListener("selectstart",X),i.removeEventListener("selectend",X),i.removeEventListener("squeeze",X),i.removeEventListener("squeezestart",X),i.removeEventListener("squeezeend",X),i.removeEventListener("end",V),i.removeEventListener("inputsourceschange",Q);for(let j=0;j<b.length;j++){const J=S[j];J!==null&&(S[j]=null,b[j].disconnect(J))}G=null,z=null,x.reset();for(const j in m)delete m[j];e.setRenderTarget(_),f=null,d=null,h=null,i=null,C=null,Ge.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){s=j,n.isPresenting===!0&&Je("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,n.isPresenting===!0&&Je("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(j){c=j},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&g&&(h=new XRWebGLBinding(i,t)),h},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(j){if(i=j,i!==null){if(_=e.getRenderTarget(),i.addEventListener("select",X),i.addEventListener("selectstart",X),i.addEventListener("selectend",X),i.addEventListener("squeeze",X),i.addEventListener("squeezestart",X),i.addEventListener("squeezeend",X),i.addEventListener("end",V),i.addEventListener("inputsourceschange",Q),y.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(A),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,ae=null,le=null;y.depth&&(le=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=y.stencil?Ji:Ai,ae=y.stencil?ji:Bn);const we={colorFormat:t.RGBA8,depthFormat:le,scaleFactor:s};h=this.getBinding(),d=h.createProjectionLayer(we),i.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),C=new zn(d.textureWidth,d.textureHeight,{format:un,type:mn,depthTexture:new jo(d.textureWidth,d.textureHeight,ae,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const ue={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,ue),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),C=new zn(f.framebufferWidth,f.framebufferHeight,{format:un,type:mn,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),Ge.setContext(i),Ge.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function Q(j){for(let J=0;J<j.removed.length;J++){const ue=j.removed[J],ae=S.indexOf(ue);ae>=0&&(S[ae]=null,b[ae].disconnect(ue))}for(let J=0;J<j.added.length;J++){const ue=j.added[J];let ae=S.indexOf(ue);if(ae===-1){for(let we=0;we<b.length;we++)if(we>=S.length){S.push(ue),ae=we;break}else if(S[we]===null){S[we]=ue,ae=we;break}if(ae===-1)break}const le=b[ae];le&&le.connect(ue)}}const q=new R,ee=new R;function te(j,J,ue){q.setFromMatrixPosition(J.matrixWorld),ee.setFromMatrixPosition(ue.matrixWorld);const ae=q.distanceTo(ee),le=J.projectionMatrix.elements,we=ue.projectionMatrix.elements,st=le[14]/(le[10]-1),ke=le[14]/(le[10]+1),tt=(le[9]+1)/le[5],O=(le[9]-1)/le[5],Ie=(le[8]-1)/le[0],Ne=(we[8]+1)/we[0],He=st*Ie,fe=st*Ne,nt=ae/(-Ie+Ne),Te=nt*-Ie;if(J.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Te),j.translateZ(nt),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),le[10]===-1)j.projectionMatrix.copy(J.projectionMatrix),j.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const De=st+nt,D=ke+nt,M=He-Te,B=fe+(ae-Te),Z=tt*ke/D*De,re=O*ke/D*De;j.projectionMatrix.makePerspective(M,B,Z,re,De,D),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function pe(j,J){J===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(J.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(i===null)return;let J=j.near,ue=j.far;x.texture!==null&&(x.depthNear>0&&(J=x.depthNear),x.depthFar>0&&(ue=x.depthFar)),F.near=T.near=E.near=J,F.far=T.far=E.far=ue,(G!==F.near||z!==F.far)&&(i.updateRenderState({depthNear:F.near,depthFar:F.far}),G=F.near,z=F.far),F.layers.mask=j.layers.mask|6,E.layers.mask=F.layers.mask&3,T.layers.mask=F.layers.mask&5;const ae=j.parent,le=F.cameras;pe(F,ae);for(let we=0;we<le.length;we++)pe(le[we],ae);le.length===2?te(F,E,T):F.projectionMatrix.copy(E.projectionMatrix),Pe(j,F,ae)};function Pe(j,J,ue){ue===null?j.matrix.copy(J.matrixWorld):(j.matrix.copy(ue.matrixWorld),j.matrix.invert(),j.matrix.multiply(J.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(J.projectionMatrix),j.projectionMatrixInverse.copy(J.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Po*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(j){l=j,d!==null&&(d.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(F)},this.getCameraTexture=function(j){return m[j]};let ve=null;function Me(j,J){if(u=J.getViewerPose(c||o),p=J,u!==null){const ue=u.views;f!==null&&(e.setRenderTargetFramebuffer(C,f.framebuffer),e.setRenderTarget(C));let ae=!1;ue.length!==F.cameras.length&&(F.cameras.length=0,ae=!0);for(let ke=0;ke<ue.length;ke++){const tt=ue[ke];let O=null;if(f!==null)O=f.getViewport(tt);else{const Ne=h.getViewSubImage(d,tt);O=Ne.viewport,ke===0&&(e.setRenderTargetTextures(C,Ne.colorTexture,Ne.depthStencilTexture),e.setRenderTarget(C))}let Ie=I[ke];Ie===void 0&&(Ie=new Qt,Ie.layers.enable(ke),Ie.viewport=new vt,I[ke]=Ie),Ie.matrix.fromArray(tt.transform.matrix),Ie.matrix.decompose(Ie.position,Ie.quaternion,Ie.scale),Ie.projectionMatrix.fromArray(tt.projectionMatrix),Ie.projectionMatrixInverse.copy(Ie.projectionMatrix).invert(),Ie.viewport.set(O.x,O.y,O.width,O.height),ke===0&&(F.matrix.copy(Ie.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),ae===!0&&F.cameras.push(Ie)}const le=i.enabledFeatures;if(le&&le.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&g){h=n.getBinding();const ke=h.getDepthInformation(ue[0]);ke&&ke.isValid&&ke.texture&&x.init(ke,i.renderState)}if(le&&le.includes("camera-access")&&g){e.state.unbindTexture(),h=n.getBinding();for(let ke=0;ke<ue.length;ke++){const tt=ue[ke].camera;if(tt){let O=m[tt];O||(O=new Bl,m[tt]=O);const Ie=h.getCameraImage(tt);O.sourceTexture=Ie}}}}for(let ue=0;ue<b.length;ue++){const ae=S[ue],le=b[ue];ae!==null&&le!==void 0&&le.update(ae,J,c||o)}ve&&ve(j,J),J.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:J}),p=null}const Ge=new Wl;Ge.setAnimationLoop(Me),this.setAnimationLoop=function(j){ve=j},this.dispose=function(){}}}const Jn=new en,Cm=new ft;function Am(r,e){function t(x,m){x.matrixAutoUpdate===!0&&x.updateMatrix(),m.value.copy(x.matrix)}function n(x,m){m.color.getRGB(x.fogColor.value,Nl(r)),m.isFog?(x.fogNear.value=m.near,x.fogFar.value=m.far):m.isFogExp2&&(x.fogDensity.value=m.density)}function i(x,m,y,_,C){m.isMeshBasicMaterial||m.isMeshLambertMaterial?s(x,m):m.isMeshToonMaterial?(s(x,m),h(x,m)):m.isMeshPhongMaterial?(s(x,m),u(x,m)):m.isMeshStandardMaterial?(s(x,m),d(x,m),m.isMeshPhysicalMaterial&&f(x,m,C)):m.isMeshMatcapMaterial?(s(x,m),p(x,m)):m.isMeshDepthMaterial?s(x,m):m.isMeshDistanceMaterial?(s(x,m),g(x,m)):m.isMeshNormalMaterial?s(x,m):m.isLineBasicMaterial?(o(x,m),m.isLineDashedMaterial&&a(x,m)):m.isPointsMaterial?l(x,m,y,_):m.isSpriteMaterial?c(x,m):m.isShadowMaterial?(x.color.value.copy(m.color),x.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function s(x,m){x.opacity.value=m.opacity,m.color&&x.diffuse.value.copy(m.color),m.emissive&&x.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(x.map.value=m.map,t(m.map,x.mapTransform)),m.alphaMap&&(x.alphaMap.value=m.alphaMap,t(m.alphaMap,x.alphaMapTransform)),m.bumpMap&&(x.bumpMap.value=m.bumpMap,t(m.bumpMap,x.bumpMapTransform),x.bumpScale.value=m.bumpScale,m.side===Bt&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,t(m.normalMap,x.normalMapTransform),x.normalScale.value.copy(m.normalScale),m.side===Bt&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,t(m.displacementMap,x.displacementMapTransform),x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias),m.emissiveMap&&(x.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,x.emissiveMapTransform)),m.specularMap&&(x.specularMap.value=m.specularMap,t(m.specularMap,x.specularMapTransform)),m.alphaTest>0&&(x.alphaTest.value=m.alphaTest);const y=e.get(m),_=y.envMap,C=y.envMapRotation;_&&(x.envMap.value=_,Jn.copy(C),Jn.x*=-1,Jn.y*=-1,Jn.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(Jn.y*=-1,Jn.z*=-1),x.envMapRotation.value.setFromMatrix4(Cm.makeRotationFromEuler(Jn)),x.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,x.reflectivity.value=m.reflectivity,x.ior.value=m.ior,x.refractionRatio.value=m.refractionRatio),m.lightMap&&(x.lightMap.value=m.lightMap,x.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,x.lightMapTransform)),m.aoMap&&(x.aoMap.value=m.aoMap,x.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,x.aoMapTransform))}function o(x,m){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity,m.map&&(x.map.value=m.map,t(m.map,x.mapTransform))}function a(x,m){x.dashSize.value=m.dashSize,x.totalSize.value=m.dashSize+m.gapSize,x.scale.value=m.scale}function l(x,m,y,_){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity,x.size.value=m.size*y,x.scale.value=_*.5,m.map&&(x.map.value=m.map,t(m.map,x.uvTransform)),m.alphaMap&&(x.alphaMap.value=m.alphaMap,t(m.alphaMap,x.alphaMapTransform)),m.alphaTest>0&&(x.alphaTest.value=m.alphaTest)}function c(x,m){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity,x.rotation.value=m.rotation,m.map&&(x.map.value=m.map,t(m.map,x.mapTransform)),m.alphaMap&&(x.alphaMap.value=m.alphaMap,t(m.alphaMap,x.alphaMapTransform)),m.alphaTest>0&&(x.alphaTest.value=m.alphaTest)}function u(x,m){x.specular.value.copy(m.specular),x.shininess.value=Math.max(m.shininess,1e-4)}function h(x,m){m.gradientMap&&(x.gradientMap.value=m.gradientMap)}function d(x,m){x.metalness.value=m.metalness,m.metalnessMap&&(x.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,x.metalnessMapTransform)),x.roughness.value=m.roughness,m.roughnessMap&&(x.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,x.roughnessMapTransform)),m.envMap&&(x.envMapIntensity.value=m.envMapIntensity)}function f(x,m,y){x.ior.value=m.ior,m.sheen>0&&(x.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),x.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(x.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,x.sheenColorMapTransform)),m.sheenRoughnessMap&&(x.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,x.sheenRoughnessMapTransform))),m.clearcoat>0&&(x.clearcoat.value=m.clearcoat,x.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(x.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,x.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(x.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,x.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(x.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,x.clearcoatNormalMapTransform),x.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Bt&&x.clearcoatNormalScale.value.negate())),m.dispersion>0&&(x.dispersion.value=m.dispersion),m.iridescence>0&&(x.iridescence.value=m.iridescence,x.iridescenceIOR.value=m.iridescenceIOR,x.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],x.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(x.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,x.iridescenceMapTransform)),m.iridescenceThicknessMap&&(x.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,x.iridescenceThicknessMapTransform))),m.transmission>0&&(x.transmission.value=m.transmission,x.transmissionSamplerMap.value=y.texture,x.transmissionSamplerSize.value.set(y.width,y.height),m.transmissionMap&&(x.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,x.transmissionMapTransform)),x.thickness.value=m.thickness,m.thicknessMap&&(x.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,x.thicknessMapTransform)),x.attenuationDistance.value=m.attenuationDistance,x.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(x.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(x.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,x.anisotropyMapTransform))),x.specularIntensity.value=m.specularIntensity,x.specularColor.value.copy(m.specularColor),m.specularColorMap&&(x.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,x.specularColorMapTransform)),m.specularIntensityMap&&(x.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,x.specularIntensityMapTransform))}function p(x,m){m.matcap&&(x.matcap.value=m.matcap)}function g(x,m){const y=e.get(m).light;x.referencePosition.value.setFromMatrixPosition(y.matrixWorld),x.nearDistance.value=y.shadow.camera.near,x.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function wm(r,e,t,n){let i={},s={},o=[];const a=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,_){const C=_.program;n.uniformBlockBinding(y,C)}function c(y,_){let C=i[y.id];C===void 0&&(p(y),C=u(y),i[y.id]=C,y.addEventListener("dispose",x));const b=_.program;n.updateUBOMapping(y,b);const S=e.render.frame;s[y.id]!==S&&(d(y),s[y.id]=S)}function u(y){const _=h();y.__bindingPointIndex=_;const C=r.createBuffer(),b=y.__size,S=y.usage;return r.bindBuffer(r.UNIFORM_BUFFER,C),r.bufferData(r.UNIFORM_BUFFER,b,S),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,_,C),C}function h(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return wt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(y){const _=i[y.id],C=y.uniforms,b=y.__cache;r.bindBuffer(r.UNIFORM_BUFFER,_);for(let S=0,A=C.length;S<A;S++){const L=Array.isArray(C[S])?C[S]:[C[S]];for(let E=0,T=L.length;E<T;E++){const I=L[E];if(f(I,S,E,b)===!0){const F=I.__offset,G=Array.isArray(I.value)?I.value:[I.value];let z=0;for(let X=0;X<G.length;X++){const V=G[X],Q=g(V);typeof V=="number"||typeof V=="boolean"?(I.__data[0]=V,r.bufferSubData(r.UNIFORM_BUFFER,F+z,I.__data)):V.isMatrix3?(I.__data[0]=V.elements[0],I.__data[1]=V.elements[1],I.__data[2]=V.elements[2],I.__data[3]=0,I.__data[4]=V.elements[3],I.__data[5]=V.elements[4],I.__data[6]=V.elements[5],I.__data[7]=0,I.__data[8]=V.elements[6],I.__data[9]=V.elements[7],I.__data[10]=V.elements[8],I.__data[11]=0):(V.toArray(I.__data,z),z+=Q.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,F,I.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(y,_,C,b){const S=y.value,A=_+"_"+C;if(b[A]===void 0)return typeof S=="number"||typeof S=="boolean"?b[A]=S:b[A]=S.clone(),!0;{const L=b[A];if(typeof S=="number"||typeof S=="boolean"){if(L!==S)return b[A]=S,!0}else if(L.equals(S)===!1)return L.copy(S),!0}return!1}function p(y){const _=y.uniforms;let C=0;const b=16;for(let A=0,L=_.length;A<L;A++){const E=Array.isArray(_[A])?_[A]:[_[A]];for(let T=0,I=E.length;T<I;T++){const F=E[T],G=Array.isArray(F.value)?F.value:[F.value];for(let z=0,X=G.length;z<X;z++){const V=G[z],Q=g(V),q=C%b,ee=q%Q.boundary,te=q+ee;C+=ee,te!==0&&b-te<Q.storage&&(C+=b-te),F.__data=new Float32Array(Q.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=C,C+=Q.storage}}}const S=C%b;return S>0&&(C+=b-S),y.__size=C,y.__cache={},this}function g(y){const _={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(_.boundary=4,_.storage=4):y.isVector2?(_.boundary=8,_.storage=8):y.isVector3||y.isColor?(_.boundary=16,_.storage=12):y.isVector4?(_.boundary=16,_.storage=16):y.isMatrix3?(_.boundary=48,_.storage=48):y.isMatrix4?(_.boundary=64,_.storage=64):y.isTexture?Je("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Je("WebGLRenderer: Unsupported uniform value type.",y),_}function x(y){const _=y.target;_.removeEventListener("dispose",x);const C=o.indexOf(_.__bindingPointIndex);o.splice(C,1),r.deleteBuffer(i[_.id]),delete i[_.id],delete s[_.id]}function m(){for(const y in i)r.deleteBuffer(i[y]);o=[],i={},s={}}return{bind:l,update:c,dispose:m}}const Im=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let bn=null;function Rm(){return bn===null&&(bn=new bh(Im,32,32,Vo,Pi),bn.minFilter=rn,bn.magFilter=rn,bn.wrapS=It,bn.wrapT=It,bn.generateMipmaps=!1,bn.needsUpdate=!0),bn}class Pm{constructor(e={}){const{canvas:t=Yc(),context:n=null,depth:i=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const p=new Set([Xo,qo,Wo]),g=new Set([mn,Bn,Ki,ji,zo,Ho]),x=new Uint32Array(4),m=new Int32Array(4);let y=null,_=null;const C=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=kn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const S=this;let A=!1;this._outputColorSpace=sn;let L=0,E=0,T=null,I=-1,F=null;const G=new vt,z=new vt;let X=null;const V=new Oe(0);let Q=0,q=t.width,ee=t.height,te=1,pe=null,Pe=null;const ve=new vt(0,0,q,ee),Me=new vt(0,0,q,ee);let Ge=!1;const j=new ss;let J=!1,ue=!1;const ae=new ft,le=new R,we=new vt,st={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ke=!1;function tt(){return T===null?te:1}let O=n;function Ie(w,H){return t.getContext(w,H)}try{const w={alpha:!0,depth:i,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${ko}`),t.addEventListener("webglcontextlost",ce,!1),t.addEventListener("webglcontextrestored",oe,!1),t.addEventListener("webglcontextcreationerror",Le,!1),O===null){const H="webgl2";if(O=Ie(H,w),O===null)throw Ie(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(w){throw w("WebGLRenderer: "+w.message),w}let Ne,He,fe,nt,Te,De,D,M,B,Z,re,$,Re,ie,ne,me,se,he,Xe,We,Ee,Ye,U,_e;function ge(){Ne=new Gf(O),Ne.init(),Ye=new Sm(O,Ne),He=new Rf(O,Ne,e,Ye),fe=new ym(O,Ne),He.reversedDepthBuffer&&d&&fe.buffers.depth.setReversed(!0),nt=new Hf(O),Te=new om,De=new _m(O,Ne,fe,Te,He,Ye,nt),D=new Df(S),M=new kf(S),B=new qh(O),U=new wf(O,B),Z=new Bf(O,B,nt,U),re=new Vf(O,Z,B,nt),Xe=new Wf(O,He,De),me=new Pf(Te),$=new rm(S,D,M,Ne,He,U,me),Re=new Am(S,Te),ie=new lm,ne=new pm(Ne),he=new Af(S,D,M,fe,re,f,l),se=new xm(S,re,He),_e=new wm(O,nt,He,fe),We=new If(O,Ne,nt),Ee=new zf(O,Ne,nt),nt.programs=$.programs,S.capabilities=He,S.extensions=Ne,S.properties=Te,S.renderLists=ie,S.shadowMap=se,S.state=fe,S.info=nt}ge();const xe=new Mm(S,O);this.xr=xe,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const w=Ne.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){const w=Ne.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return te},this.setPixelRatio=function(w){w!==void 0&&(te=w,this.setSize(q,ee,!1))},this.getSize=function(w){return w.set(q,ee)},this.setSize=function(w,H,Y=!0){if(xe.isPresenting){Je("WebGLRenderer: Can't change size while VR device is presenting.");return}q=w,ee=H,t.width=Math.floor(w*te),t.height=Math.floor(H*te),Y===!0&&(t.style.width=w+"px",t.style.height=H+"px"),this.setViewport(0,0,w,H)},this.getDrawingBufferSize=function(w){return w.set(q*te,ee*te).floor()},this.setDrawingBufferSize=function(w,H,Y){q=w,ee=H,te=Y,t.width=Math.floor(w*Y),t.height=Math.floor(H*Y),this.setViewport(0,0,w,H)},this.getCurrentViewport=function(w){return w.copy(G)},this.getViewport=function(w){return w.copy(ve)},this.setViewport=function(w,H,Y,K){w.isVector4?ve.set(w.x,w.y,w.z,w.w):ve.set(w,H,Y,K),fe.viewport(G.copy(ve).multiplyScalar(te).round())},this.getScissor=function(w){return w.copy(Me)},this.setScissor=function(w,H,Y,K){w.isVector4?Me.set(w.x,w.y,w.z,w.w):Me.set(w,H,Y,K),fe.scissor(z.copy(Me).multiplyScalar(te).round())},this.getScissorTest=function(){return Ge},this.setScissorTest=function(w){fe.setScissorTest(Ge=w)},this.setOpaqueSort=function(w){pe=w},this.setTransparentSort=function(w){Pe=w},this.getClearColor=function(w){return w.copy(he.getClearColor())},this.setClearColor=function(){he.setClearColor(...arguments)},this.getClearAlpha=function(){return he.getClearAlpha()},this.setClearAlpha=function(){he.setClearAlpha(...arguments)},this.clear=function(w=!0,H=!0,Y=!0){let K=0;if(w){let W=!1;if(T!==null){const de=T.texture.format;W=p.has(de)}if(W){const de=T.texture.type,be=g.has(de),Fe=he.getClearColor(),Ce=he.getClearAlpha(),Ve=Fe.r,$e=Fe.g,Be=Fe.b;be?(x[0]=Ve,x[1]=$e,x[2]=Be,x[3]=Ce,O.clearBufferuiv(O.COLOR,0,x)):(m[0]=Ve,m[1]=$e,m[2]=Be,m[3]=Ce,O.clearBufferiv(O.COLOR,0,m))}else K|=O.COLOR_BUFFER_BIT}H&&(K|=O.DEPTH_BUFFER_BIT),Y&&(K|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ce,!1),t.removeEventListener("webglcontextrestored",oe,!1),t.removeEventListener("webglcontextcreationerror",Le,!1),he.dispose(),ie.dispose(),ne.dispose(),Te.dispose(),D.dispose(),M.dispose(),re.dispose(),U.dispose(),_e.dispose(),$.dispose(),xe.dispose(),xe.removeEventListener("sessionstart",Zo),xe.removeEventListener("sessionend",Qo),Vn.stop()};function ce(w){w.preventDefault(),da("WebGLRenderer: Context Lost."),A=!0}function oe(){da("WebGLRenderer: Context Restored."),A=!1;const w=nt.autoReset,H=se.enabled,Y=se.autoUpdate,K=se.needsUpdate,W=se.type;ge(),nt.autoReset=w,se.enabled=H,se.autoUpdate=Y,se.needsUpdate=K,se.type=W}function Le(w){wt("WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function je(w){const H=w.target;H.removeEventListener("dispose",je),St(H)}function St(w){mt(w),Te.remove(w)}function mt(w){const H=Te.get(w).programs;H!==void 0&&(H.forEach(function(Y){$.releaseProgram(Y)}),w.isShaderMaterial&&$.releaseShaderCache(w))}this.renderBufferDirect=function(w,H,Y,K,W,de){H===null&&(H=st);const be=W.isMesh&&W.matrixWorld.determinant()<0,Fe=ec(w,H,Y,K,W);fe.setMaterial(K,be);let Ce=Y.index,Ve=1;if(K.wireframe===!0){if(Ce=Z.getWireframeAttribute(Y),Ce===void 0)return;Ve=2}const $e=Y.drawRange,Be=Y.attributes.position;let ot=$e.start*Ve,gt=($e.start+$e.count)*Ve;de!==null&&(ot=Math.max(ot,de.start*Ve),gt=Math.min(gt,(de.start+de.count)*Ve)),Ce!==null?(ot=Math.max(ot,0),gt=Math.min(gt,Ce.count)):Be!=null&&(ot=Math.max(ot,0),gt=Math.min(gt,Be.count));const Ct=gt-ot;if(Ct<0||Ct===1/0)return;U.setup(W,K,Fe,Y,Ce);let At,yt=We;if(Ce!==null&&(At=B.get(Ce),yt=Ee,yt.setIndex(At)),W.isMesh)K.wireframe===!0?(fe.setLineWidth(K.wireframeLinewidth*tt()),yt.setMode(O.LINES)):yt.setMode(O.TRIANGLES);else if(W.isLine){let ze=K.linewidth;ze===void 0&&(ze=1),fe.setLineWidth(ze*tt()),W.isLineSegments?yt.setMode(O.LINES):W.isLineLoop?yt.setMode(O.LINE_LOOP):yt.setMode(O.LINE_STRIP)}else W.isPoints?yt.setMode(O.POINTS):W.isSprite&&yt.setMode(O.TRIANGLES);if(W.isBatchedMesh)if(W._multiDrawInstances!==null)Qi("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),yt.renderMultiDrawInstances(W._multiDrawStarts,W._multiDrawCounts,W._multiDrawCount,W._multiDrawInstances);else if(Ne.get("WEBGL_multi_draw"))yt.renderMultiDraw(W._multiDrawStarts,W._multiDrawCounts,W._multiDrawCount);else{const ze=W._multiDrawStarts,Et=W._multiDrawCounts,ut=W._multiDrawCount,Kt=Ce?B.get(Ce).bytesPerElement:1,ai=Te.get(K).currentProgram.getUniforms();for(let jt=0;jt<ut;jt++)ai.setValue(O,"_gl_DrawID",jt),yt.render(ze[jt]/Kt,Et[jt])}else if(W.isInstancedMesh)yt.renderInstances(ot,Ct,W.count);else if(Y.isInstancedBufferGeometry){const ze=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,Et=Math.min(Y.instanceCount,ze);yt.renderInstances(ot,Ct,Et)}else yt.render(ot,Ct)};function dn(w,H,Y){w.transparent===!0&&w.side===Yt&&w.forceSinglePass===!1?(w.side=Bt,w.needsUpdate=!0,os(w,H,Y),w.side=Gn,w.needsUpdate=!0,os(w,H,Y),w.side=Yt):os(w,H,Y)}this.compile=function(w,H,Y=null){Y===null&&(Y=w),_=ne.get(Y),_.init(H),b.push(_),Y.traverseVisible(function(W){W.isLight&&W.layers.test(H.layers)&&(_.pushLight(W),W.castShadow&&_.pushShadow(W))}),w!==Y&&w.traverseVisible(function(W){W.isLight&&W.layers.test(H.layers)&&(_.pushLight(W),W.castShadow&&_.pushShadow(W))}),_.setupLights();const K=new Set;return w.traverse(function(W){if(!(W.isMesh||W.isPoints||W.isLine||W.isSprite))return;const de=W.material;if(de)if(Array.isArray(de))for(let be=0;be<de.length;be++){const Fe=de[be];dn(Fe,Y,W),K.add(Fe)}else dn(de,Y,W),K.add(de)}),_=b.pop(),K},this.compileAsync=function(w,H,Y=null){const K=this.compile(w,H,Y);return new Promise(W=>{function de(){if(K.forEach(function(be){Te.get(be).currentProgram.isReady()&&K.delete(be)}),K.size===0){W(w);return}setTimeout(de,10)}Ne.get("KHR_parallel_shader_compile")!==null?de():setTimeout(de,10)})};let on=null;function Ql(w){on&&on(w)}function Zo(){Vn.stop()}function Qo(){Vn.start()}const Vn=new Wl;Vn.setAnimationLoop(Ql),typeof self<"u"&&Vn.setContext(self),this.setAnimationLoop=function(w){on=w,xe.setAnimationLoop(w),w===null?Vn.stop():Vn.start()},xe.addEventListener("sessionstart",Zo),xe.addEventListener("sessionend",Qo),this.render=function(w,H){if(H!==void 0&&H.isCamera!==!0){wt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),xe.enabled===!0&&xe.isPresenting===!0&&(xe.cameraAutoUpdate===!0&&xe.updateCamera(H),H=xe.getCamera()),w.isScene===!0&&w.onBeforeRender(S,w,H,T),_=ne.get(w,b.length),_.init(H),b.push(_),ae.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),j.setFromProjectionMatrix(ae,pn,H.reversedDepth),ue=this.localClippingEnabled,J=me.init(this.clippingPlanes,ue),y=ie.get(w,C.length),y.init(),C.push(y),xe.enabled===!0&&xe.isPresenting===!0){const de=S.xr.getDepthSensingMesh();de!==null&&sr(de,H,-1/0,S.sortObjects)}sr(w,H,0,S.sortObjects),y.finish(),S.sortObjects===!0&&y.sort(pe,Pe),ke=xe.enabled===!1||xe.isPresenting===!1||xe.hasDepthSensing()===!1,ke&&he.addToRenderList(y,w),this.info.render.frame++,J===!0&&me.beginShadows();const Y=_.state.shadowsArray;se.render(Y,w,H),J===!0&&me.endShadows(),this.info.autoReset===!0&&this.info.reset();const K=y.opaque,W=y.transmissive;if(_.setupLights(),H.isArrayCamera){const de=H.cameras;if(W.length>0)for(let be=0,Fe=de.length;be<Fe;be++){const Ce=de[be];ta(K,W,w,Ce)}ke&&he.render(w);for(let be=0,Fe=de.length;be<Fe;be++){const Ce=de[be];ea(y,w,Ce,Ce.viewport)}}else W.length>0&&ta(K,W,w,H),ke&&he.render(w),ea(y,w,H);T!==null&&E===0&&(De.updateMultisampleRenderTarget(T),De.updateRenderTargetMipmap(T)),w.isScene===!0&&w.onAfterRender(S,w,H),U.resetDefaultState(),I=-1,F=null,b.pop(),b.length>0?(_=b[b.length-1],J===!0&&me.setGlobalState(S.clippingPlanes,_.state.camera)):_=null,C.pop(),C.length>0?y=C[C.length-1]:y=null};function sr(w,H,Y,K){if(w.visible===!1)return;if(w.layers.test(H.layers)){if(w.isGroup)Y=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(H);else if(w.isLight)_.pushLight(w),w.castShadow&&_.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||j.intersectsSprite(w)){K&&we.setFromMatrixPosition(w.matrixWorld).applyMatrix4(ae);const be=re.update(w),Fe=w.material;Fe.visible&&y.push(w,be,Fe,Y,we.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||j.intersectsObject(w))){const be=re.update(w),Fe=w.material;if(K&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),we.copy(w.boundingSphere.center)):(be.boundingSphere===null&&be.computeBoundingSphere(),we.copy(be.boundingSphere.center)),we.applyMatrix4(w.matrixWorld).applyMatrix4(ae)),Array.isArray(Fe)){const Ce=be.groups;for(let Ve=0,$e=Ce.length;Ve<$e;Ve++){const Be=Ce[Ve],ot=Fe[Be.materialIndex];ot&&ot.visible&&y.push(w,be,ot,Y,we.z,Be)}}else Fe.visible&&y.push(w,be,Fe,Y,we.z,null)}}const de=w.children;for(let be=0,Fe=de.length;be<Fe;be++)sr(de[be],H,Y,K)}function ea(w,H,Y,K){const{opaque:W,transmissive:de,transparent:be}=w;_.setupLightsView(Y),J===!0&&me.setGlobalState(S.clippingPlanes,Y),K&&fe.viewport(G.copy(K)),W.length>0&&rs(W,H,Y),de.length>0&&rs(de,H,Y),be.length>0&&rs(be,H,Y),fe.buffers.depth.setTest(!0),fe.buffers.depth.setMask(!0),fe.buffers.color.setMask(!0),fe.setPolygonOffset(!1)}function ta(w,H,Y,K){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;_.state.transmissionRenderTarget[K.id]===void 0&&(_.state.transmissionRenderTarget[K.id]=new zn(1,1,{generateMipmaps:!0,type:Ne.has("EXT_color_buffer_half_float")||Ne.has("EXT_color_buffer_float")?Pi:mn,minFilter:si,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:dt.workingColorSpace}));const de=_.state.transmissionRenderTarget[K.id],be=K.viewport||G;de.setSize(be.z*S.transmissionResolutionScale,be.w*S.transmissionResolutionScale);const Fe=S.getRenderTarget(),Ce=S.getActiveCubeFace(),Ve=S.getActiveMipmapLevel();S.setRenderTarget(de),S.getClearColor(V),Q=S.getClearAlpha(),Q<1&&S.setClearColor(16777215,.5),S.clear(),ke&&he.render(Y);const $e=S.toneMapping;S.toneMapping=kn;const Be=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),_.setupLightsView(K),J===!0&&me.setGlobalState(S.clippingPlanes,K),rs(w,Y,K),De.updateMultisampleRenderTarget(de),De.updateRenderTargetMipmap(de),Ne.has("WEBGL_multisampled_render_to_texture")===!1){let ot=!1;for(let gt=0,Ct=H.length;gt<Ct;gt++){const At=H[gt],{object:yt,geometry:ze,material:Et,group:ut}=At;if(Et.side===Yt&&yt.layers.test(K.layers)){const Kt=Et.side;Et.side=Bt,Et.needsUpdate=!0,na(yt,Y,K,ze,Et,ut),Et.side=Kt,Et.needsUpdate=!0,ot=!0}}ot===!0&&(De.updateMultisampleRenderTarget(de),De.updateRenderTargetMipmap(de))}S.setRenderTarget(Fe,Ce,Ve),S.setClearColor(V,Q),Be!==void 0&&(K.viewport=Be),S.toneMapping=$e}function rs(w,H,Y){const K=H.isScene===!0?H.overrideMaterial:null;for(let W=0,de=w.length;W<de;W++){const be=w[W],{object:Fe,geometry:Ce,group:Ve}=be;let $e=be.material;$e.allowOverride===!0&&K!==null&&($e=K),Fe.layers.test(Y.layers)&&na(Fe,H,Y,Ce,$e,Ve)}}function na(w,H,Y,K,W,de){w.onBeforeRender(S,H,Y,K,W,de),w.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),W.onBeforeRender(S,H,Y,K,w,de),W.transparent===!0&&W.side===Yt&&W.forceSinglePass===!1?(W.side=Bt,W.needsUpdate=!0,S.renderBufferDirect(Y,H,K,W,w,de),W.side=Gn,W.needsUpdate=!0,S.renderBufferDirect(Y,H,K,W,w,de),W.side=Yt):S.renderBufferDirect(Y,H,K,W,w,de),w.onAfterRender(S,H,Y,K,W,de)}function os(w,H,Y){H.isScene!==!0&&(H=st);const K=Te.get(w),W=_.state.lights,de=_.state.shadowsArray,be=W.state.version,Fe=$.getParameters(w,W.state,de,H,Y),Ce=$.getProgramCacheKey(Fe);let Ve=K.programs;K.environment=w.isMeshStandardMaterial?H.environment:null,K.fog=H.fog,K.envMap=(w.isMeshStandardMaterial?M:D).get(w.envMap||K.environment),K.envMapRotation=K.environment!==null&&w.envMap===null?H.environmentRotation:w.envMapRotation,Ve===void 0&&(w.addEventListener("dispose",je),Ve=new Map,K.programs=Ve);let $e=Ve.get(Ce);if($e!==void 0){if(K.currentProgram===$e&&K.lightsStateVersion===be)return sa(w,Fe),$e}else Fe.uniforms=$.getUniforms(w),w.onBeforeCompile(Fe,S),$e=$.acquireProgram(Fe,Ce),Ve.set(Ce,$e),K.uniforms=Fe.uniforms;const Be=K.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(Be.clippingPlanes=me.uniform),sa(w,Fe),K.needsLights=nc(w),K.lightsStateVersion=be,K.needsLights&&(Be.ambientLightColor.value=W.state.ambient,Be.lightProbe.value=W.state.probe,Be.directionalLights.value=W.state.directional,Be.directionalLightShadows.value=W.state.directionalShadow,Be.spotLights.value=W.state.spot,Be.spotLightShadows.value=W.state.spotShadow,Be.rectAreaLights.value=W.state.rectArea,Be.ltc_1.value=W.state.rectAreaLTC1,Be.ltc_2.value=W.state.rectAreaLTC2,Be.pointLights.value=W.state.point,Be.pointLightShadows.value=W.state.pointShadow,Be.hemisphereLights.value=W.state.hemi,Be.directionalShadowMap.value=W.state.directionalShadowMap,Be.directionalShadowMatrix.value=W.state.directionalShadowMatrix,Be.spotShadowMap.value=W.state.spotShadowMap,Be.spotLightMatrix.value=W.state.spotLightMatrix,Be.spotLightMap.value=W.state.spotLightMap,Be.pointShadowMap.value=W.state.pointShadowMap,Be.pointShadowMatrix.value=W.state.pointShadowMatrix),K.currentProgram=$e,K.uniformsList=null,$e}function ia(w){if(w.uniformsList===null){const H=w.currentProgram.getUniforms();w.uniformsList=Bs.seqWithValue(H.seq,w.uniforms)}return w.uniformsList}function sa(w,H){const Y=Te.get(w);Y.outputColorSpace=H.outputColorSpace,Y.batching=H.batching,Y.batchingColor=H.batchingColor,Y.instancing=H.instancing,Y.instancingColor=H.instancingColor,Y.instancingMorph=H.instancingMorph,Y.skinning=H.skinning,Y.morphTargets=H.morphTargets,Y.morphNormals=H.morphNormals,Y.morphColors=H.morphColors,Y.morphTargetsCount=H.morphTargetsCount,Y.numClippingPlanes=H.numClippingPlanes,Y.numIntersection=H.numClipIntersection,Y.vertexAlphas=H.vertexAlphas,Y.vertexTangents=H.vertexTangents,Y.toneMapping=H.toneMapping}function ec(w,H,Y,K,W){H.isScene!==!0&&(H=st),De.resetTextureUnits();const de=H.fog,be=K.isMeshStandardMaterial?H.environment:null,Fe=T===null?S.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:wi,Ce=(K.isMeshStandardMaterial?M:D).get(K.envMap||be),Ve=K.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,$e=!!Y.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),Be=!!Y.morphAttributes.position,ot=!!Y.morphAttributes.normal,gt=!!Y.morphAttributes.color;let Ct=kn;K.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(Ct=S.toneMapping);const At=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,yt=At!==void 0?At.length:0,ze=Te.get(K),Et=_.state.lights;if(J===!0&&(ue===!0||w!==F)){const Ht=w===F&&K.id===I;me.setState(K,w,Ht)}let ut=!1;K.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==Et.state.version||ze.outputColorSpace!==Fe||W.isBatchedMesh&&ze.batching===!1||!W.isBatchedMesh&&ze.batching===!0||W.isBatchedMesh&&ze.batchingColor===!0&&W.colorTexture===null||W.isBatchedMesh&&ze.batchingColor===!1&&W.colorTexture!==null||W.isInstancedMesh&&ze.instancing===!1||!W.isInstancedMesh&&ze.instancing===!0||W.isSkinnedMesh&&ze.skinning===!1||!W.isSkinnedMesh&&ze.skinning===!0||W.isInstancedMesh&&ze.instancingColor===!0&&W.instanceColor===null||W.isInstancedMesh&&ze.instancingColor===!1&&W.instanceColor!==null||W.isInstancedMesh&&ze.instancingMorph===!0&&W.morphTexture===null||W.isInstancedMesh&&ze.instancingMorph===!1&&W.morphTexture!==null||ze.envMap!==Ce||K.fog===!0&&ze.fog!==de||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==me.numPlanes||ze.numIntersection!==me.numIntersection)||ze.vertexAlphas!==Ve||ze.vertexTangents!==$e||ze.morphTargets!==Be||ze.morphNormals!==ot||ze.morphColors!==gt||ze.toneMapping!==Ct||ze.morphTargetsCount!==yt)&&(ut=!0):(ut=!0,ze.__version=K.version);let Kt=ze.currentProgram;ut===!0&&(Kt=os(K,H,W));let ai=!1,jt=!1,Fi=!1;const Mt=Kt.getUniforms(),qt=ze.uniforms;if(fe.useProgram(Kt.program)&&(ai=!0,jt=!0,Fi=!0),K.id!==I&&(I=K.id,jt=!0),ai||F!==w){fe.buffers.depth.getReversed()&&w.reversedDepth!==!0&&(w._reversedDepth=!0,w.updateProjectionMatrix()),Mt.setValue(O,"projectionMatrix",w.projectionMatrix),Mt.setValue(O,"viewMatrix",w.matrixWorldInverse);const Xt=Mt.map.cameraPosition;Xt!==void 0&&Xt.setValue(O,le.setFromMatrixPosition(w.matrixWorld)),He.logarithmicDepthBuffer&&Mt.setValue(O,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&Mt.setValue(O,"isOrthographic",w.isOrthographicCamera===!0),F!==w&&(F=w,jt=!0,Fi=!0)}if(W.isSkinnedMesh){Mt.setOptional(O,W,"bindMatrix"),Mt.setOptional(O,W,"bindMatrixInverse");const Ht=W.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),Mt.setValue(O,"boneTexture",Ht.boneTexture,De))}W.isBatchedMesh&&(Mt.setOptional(O,W,"batchingTexture"),Mt.setValue(O,"batchingTexture",W._matricesTexture,De),Mt.setOptional(O,W,"batchingIdTexture"),Mt.setValue(O,"batchingIdTexture",W._indirectTexture,De),Mt.setOptional(O,W,"batchingColorTexture"),W._colorsTexture!==null&&Mt.setValue(O,"batchingColorTexture",W._colorsTexture,De));const tn=Y.morphAttributes;if((tn.position!==void 0||tn.normal!==void 0||tn.color!==void 0)&&Xe.update(W,Y,Kt),(jt||ze.receiveShadow!==W.receiveShadow)&&(ze.receiveShadow=W.receiveShadow,Mt.setValue(O,"receiveShadow",W.receiveShadow)),K.isMeshGouraudMaterial&&K.envMap!==null&&(qt.envMap.value=Ce,qt.flipEnvMap.value=Ce.isCubeTexture&&Ce.isRenderTargetTexture===!1?-1:1),K.isMeshStandardMaterial&&K.envMap===null&&H.environment!==null&&(qt.envMapIntensity.value=H.environmentIntensity),qt.dfgLUT!==void 0&&(qt.dfgLUT.value=Rm()),jt&&(Mt.setValue(O,"toneMappingExposure",S.toneMappingExposure),ze.needsLights&&tc(qt,Fi),de&&K.fog===!0&&Re.refreshFogUniforms(qt,de),Re.refreshMaterialUniforms(qt,K,te,ee,_.state.transmissionRenderTarget[w.id]),Bs.upload(O,ia(ze),qt,De)),K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(Bs.upload(O,ia(ze),qt,De),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&Mt.setValue(O,"center",W.center),Mt.setValue(O,"modelViewMatrix",W.modelViewMatrix),Mt.setValue(O,"normalMatrix",W.normalMatrix),Mt.setValue(O,"modelMatrix",W.matrixWorld),K.isShaderMaterial||K.isRawShaderMaterial){const Ht=K.uniformsGroups;for(let Xt=0,rr=Ht.length;Xt<rr;Xt++){const qn=Ht[Xt];_e.update(qn,Kt),_e.bind(qn,Kt)}}return Kt}function tc(w,H){w.ambientLightColor.needsUpdate=H,w.lightProbe.needsUpdate=H,w.directionalLights.needsUpdate=H,w.directionalLightShadows.needsUpdate=H,w.pointLights.needsUpdate=H,w.pointLightShadows.needsUpdate=H,w.spotLights.needsUpdate=H,w.spotLightShadows.needsUpdate=H,w.rectAreaLights.needsUpdate=H,w.hemisphereLights.needsUpdate=H}function nc(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return L},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(w,H,Y){const K=Te.get(w);K.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),Te.get(w.texture).__webglTexture=H,Te.get(w.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:Y,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,H){const Y=Te.get(w);Y.__webglFramebuffer=H,Y.__useDefaultFramebuffer=H===void 0};const ic=O.createFramebuffer();this.setRenderTarget=function(w,H=0,Y=0){T=w,L=H,E=Y;let K=!0,W=null,de=!1,be=!1;if(w){const Ce=Te.get(w);if(Ce.__useDefaultFramebuffer!==void 0)fe.bindFramebuffer(O.FRAMEBUFFER,null),K=!1;else if(Ce.__webglFramebuffer===void 0)De.setupRenderTarget(w);else if(Ce.__hasExternalTextures)De.rebindTextures(w,Te.get(w.texture).__webglTexture,Te.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){const Be=w.depthTexture;if(Ce.__boundDepthTexture!==Be){if(Be!==null&&Te.has(Be)&&(w.width!==Be.image.width||w.height!==Be.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");De.setupDepthRenderbuffer(w)}}const Ve=w.texture;(Ve.isData3DTexture||Ve.isDataArrayTexture||Ve.isCompressedArrayTexture)&&(be=!0);const $e=Te.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray($e[H])?W=$e[H][Y]:W=$e[H],de=!0):w.samples>0&&De.useMultisampledRTT(w)===!1?W=Te.get(w).__webglMultisampledFramebuffer:Array.isArray($e)?W=$e[Y]:W=$e,G.copy(w.viewport),z.copy(w.scissor),X=w.scissorTest}else G.copy(ve).multiplyScalar(te).floor(),z.copy(Me).multiplyScalar(te).floor(),X=Ge;if(Y!==0&&(W=ic),fe.bindFramebuffer(O.FRAMEBUFFER,W)&&K&&fe.drawBuffers(w,W),fe.viewport(G),fe.scissor(z),fe.setScissorTest(X),de){const Ce=Te.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+H,Ce.__webglTexture,Y)}else if(be){const Ce=H;for(let Ve=0;Ve<w.textures.length;Ve++){const $e=Te.get(w.textures[Ve]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Ve,$e.__webglTexture,Y,Ce)}}else if(w!==null&&Y!==0){const Ce=Te.get(w.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Ce.__webglTexture,Y)}I=-1},this.readRenderTargetPixels=function(w,H,Y,K,W,de,be,Fe=0){if(!(w&&w.isWebGLRenderTarget)){wt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ce=Te.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&be!==void 0&&(Ce=Ce[be]),Ce){fe.bindFramebuffer(O.FRAMEBUFFER,Ce);try{const Ve=w.textures[Fe],$e=Ve.format,Be=Ve.type;if(!He.textureFormatReadable($e)){wt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!He.textureTypeReadable(Be)){wt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=w.width-K&&Y>=0&&Y<=w.height-W&&(w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Fe),O.readPixels(H,Y,K,W,Ye.convert($e),Ye.convert(Be),de))}finally{const Ve=T!==null?Te.get(T).__webglFramebuffer:null;fe.bindFramebuffer(O.FRAMEBUFFER,Ve)}}},this.readRenderTargetPixelsAsync=async function(w,H,Y,K,W,de,be,Fe=0){if(!(w&&w.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ce=Te.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&be!==void 0&&(Ce=Ce[be]),Ce)if(H>=0&&H<=w.width-K&&Y>=0&&Y<=w.height-W){fe.bindFramebuffer(O.FRAMEBUFFER,Ce);const Ve=w.textures[Fe],$e=Ve.format,Be=Ve.type;if(!He.textureFormatReadable($e))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!He.textureTypeReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const ot=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,ot),O.bufferData(O.PIXEL_PACK_BUFFER,de.byteLength,O.STREAM_READ),w.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Fe),O.readPixels(H,Y,K,W,Ye.convert($e),Ye.convert(Be),0);const gt=T!==null?Te.get(T).__webglFramebuffer:null;fe.bindFramebuffer(O.FRAMEBUFFER,gt);const Ct=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Kc(O,Ct,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,ot),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,de),O.deleteBuffer(ot),O.deleteSync(Ct),de}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,H=null,Y=0){const K=Math.pow(2,-Y),W=Math.floor(w.image.width*K),de=Math.floor(w.image.height*K),be=H!==null?H.x:0,Fe=H!==null?H.y:0;De.setTexture2D(w,0),O.copyTexSubImage2D(O.TEXTURE_2D,Y,0,0,be,Fe,W,de),fe.unbindTexture()};const sc=O.createFramebuffer(),rc=O.createFramebuffer();this.copyTextureToTexture=function(w,H,Y=null,K=null,W=0,de=null){de===null&&(W!==0?(Qi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),de=W,W=0):de=0);let be,Fe,Ce,Ve,$e,Be,ot,gt,Ct;const At=w.isCompressedTexture?w.mipmaps[de]:w.image;if(Y!==null)be=Y.max.x-Y.min.x,Fe=Y.max.y-Y.min.y,Ce=Y.isBox3?Y.max.z-Y.min.z:1,Ve=Y.min.x,$e=Y.min.y,Be=Y.isBox3?Y.min.z:0;else{const tn=Math.pow(2,-W);be=Math.floor(At.width*tn),Fe=Math.floor(At.height*tn),w.isDataArrayTexture?Ce=At.depth:w.isData3DTexture?Ce=Math.floor(At.depth*tn):Ce=1,Ve=0,$e=0,Be=0}K!==null?(ot=K.x,gt=K.y,Ct=K.z):(ot=0,gt=0,Ct=0);const yt=Ye.convert(H.format),ze=Ye.convert(H.type);let Et;H.isData3DTexture?(De.setTexture3D(H,0),Et=O.TEXTURE_3D):H.isDataArrayTexture||H.isCompressedArrayTexture?(De.setTexture2DArray(H,0),Et=O.TEXTURE_2D_ARRAY):(De.setTexture2D(H,0),Et=O.TEXTURE_2D),O.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,H.flipY),O.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),O.pixelStorei(O.UNPACK_ALIGNMENT,H.unpackAlignment);const ut=O.getParameter(O.UNPACK_ROW_LENGTH),Kt=O.getParameter(O.UNPACK_IMAGE_HEIGHT),ai=O.getParameter(O.UNPACK_SKIP_PIXELS),jt=O.getParameter(O.UNPACK_SKIP_ROWS),Fi=O.getParameter(O.UNPACK_SKIP_IMAGES);O.pixelStorei(O.UNPACK_ROW_LENGTH,At.width),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,At.height),O.pixelStorei(O.UNPACK_SKIP_PIXELS,Ve),O.pixelStorei(O.UNPACK_SKIP_ROWS,$e),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Be);const Mt=w.isDataArrayTexture||w.isData3DTexture,qt=H.isDataArrayTexture||H.isData3DTexture;if(w.isDepthTexture){const tn=Te.get(w),Ht=Te.get(H),Xt=Te.get(tn.__renderTarget),rr=Te.get(Ht.__renderTarget);fe.bindFramebuffer(O.READ_FRAMEBUFFER,Xt.__webglFramebuffer),fe.bindFramebuffer(O.DRAW_FRAMEBUFFER,rr.__webglFramebuffer);for(let qn=0;qn<Ce;qn++)Mt&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Te.get(w).__webglTexture,W,Be+qn),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Te.get(H).__webglTexture,de,Ct+qn)),O.blitFramebuffer(Ve,$e,be,Fe,ot,gt,be,Fe,O.DEPTH_BUFFER_BIT,O.NEAREST);fe.bindFramebuffer(O.READ_FRAMEBUFFER,null),fe.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(W!==0||w.isRenderTargetTexture||Te.has(w)){const tn=Te.get(w),Ht=Te.get(H);fe.bindFramebuffer(O.READ_FRAMEBUFFER,sc),fe.bindFramebuffer(O.DRAW_FRAMEBUFFER,rc);for(let Xt=0;Xt<Ce;Xt++)Mt?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,tn.__webglTexture,W,Be+Xt):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,tn.__webglTexture,W),qt?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Ht.__webglTexture,de,Ct+Xt):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Ht.__webglTexture,de),W!==0?O.blitFramebuffer(Ve,$e,be,Fe,ot,gt,be,Fe,O.COLOR_BUFFER_BIT,O.NEAREST):qt?O.copyTexSubImage3D(Et,de,ot,gt,Ct+Xt,Ve,$e,be,Fe):O.copyTexSubImage2D(Et,de,ot,gt,Ve,$e,be,Fe);fe.bindFramebuffer(O.READ_FRAMEBUFFER,null),fe.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else qt?w.isDataTexture||w.isData3DTexture?O.texSubImage3D(Et,de,ot,gt,Ct,be,Fe,Ce,yt,ze,At.data):H.isCompressedArrayTexture?O.compressedTexSubImage3D(Et,de,ot,gt,Ct,be,Fe,Ce,yt,At.data):O.texSubImage3D(Et,de,ot,gt,Ct,be,Fe,Ce,yt,ze,At):w.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,de,ot,gt,be,Fe,yt,ze,At.data):w.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,de,ot,gt,At.width,At.height,yt,At.data):O.texSubImage2D(O.TEXTURE_2D,de,ot,gt,be,Fe,yt,ze,At);O.pixelStorei(O.UNPACK_ROW_LENGTH,ut),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Kt),O.pixelStorei(O.UNPACK_SKIP_PIXELS,ai),O.pixelStorei(O.UNPACK_SKIP_ROWS,jt),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Fi),de===0&&H.generateMipmaps&&O.generateMipmap(Et),fe.unbindTexture()},this.initRenderTarget=function(w){Te.get(w).__webglFramebuffer===void 0&&De.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?De.setTextureCube(w,0):w.isData3DTexture?De.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?De.setTexture2DArray(w,0):De.setTexture2D(w,0),fe.unbindTexture()},this.resetState=function(){L=0,E=0,T=null,fe.reset(),U.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=dt._getDrawingBufferColorSpace(e),t.unpackColorSpace=dt._getUnpackColorSpace()}}const N={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:1.8,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:.8,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_LOD_OFFSET:1,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,POLAR_THRESHOLD:.9,EARTH_SPAWN_LAT:52.5,EARTH_SPAWN_LON:127,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TORCH_LIGHT_RANGE:4,TORCH_LIGHT_INTENSITY:1.5,TORCH_FLICKER_SPEED:8,TORCH_FLICKER_AMOUNT:.2,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,PLANET_DARK_SIDE_AMBIENT:.06,PLANET_TORCH_LIGHT_RADIUS:4,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:12,TECH_BLOCK_ROTATION_OFFSET:0,TECH_BLOCK_HEX_SNAP:!1,DEBUG_BYPASS_CRAFTING_INGREDIENTS:!1,DEBUG_JETPACK_ENABLED:!1};var Dm=`varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Lm=`precision highp float;

varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  
  vec3 dir = normalize(vWorldPosition);

  
  float theta = atan(dir.x, dir.z); 
  float phi = acos(dir.y); 

  
  float scale = 80.0;
  vec2 uv = vec2(theta * scale, phi * scale);
  vec2 gridId = floor(uv);
  vec2 gridUv = fract(uv) - 0.5; 

  float star = 0.0;

  
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighborId = gridId + vec2(float(x), float(y));
      vec2 neighborOffset = vec2(float(x), float(y));

      
      vec2 starOffset = hash2(neighborId) - 0.5;

      
      vec2 toStar = neighborOffset + starOffset - gridUv;
      float dist = length(toStar);

      
      float rand = hash(neighborId);

      
      if (rand > 0.97) {
        
        float brightness = (rand - 0.97) / 0.03;
        brightness = pow(brightness, 0.3); 

        
        float starSize = 0.02 + brightness * 0.03; 
        float starBrightness = smoothstep(starSize, 0.0, dist) * brightness;

        
        if (brightness > 0.5) {
          starBrightness += smoothstep(starSize * 4.0, starSize, dist) * brightness * 0.3;
        }

        star = max(star, starBrightness);
      }

      
      if (rand > 0.998) {
        float starSize = 0.04;
        float starBrightness = smoothstep(starSize, 0.0, dist);
        starBrightness += smoothstep(starSize * 3.0, starSize, dist) * 0.5; 
        star = max(star, starBrightness);
      }
    }
  }

  
  vec3 spaceColor = vec3(0.0, 0.0, 0.02);
  vec3 starColor = vec3(1.0, 0.98, 0.9); 

  vec3 finalColor = spaceColor + starColor * star;

  gl_FragColor = vec4(finalColor, 1.0);
}`;const ti=class ti{constructor(){v(this,"sections",new Map);v(this,"enabled",!1);v(this,"sampleWindow",60);v(this,"displayElement",null);v(this,"lastUpdateTime",0);v(this,"updateInterval",200);v(this,"spikeLoggingEnabled",!0);v(this,"frameSpikeThresholdMs",50);v(this,"lastFrameStartTime",0);v(this,"frameSections",new Map);v(this,"oneTimeOperations",[]);v(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return ti.instance||(ti.instance=new ti),ti.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
`);console.warn(`[FRAME SPIKE] Total: ${e.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)
Breakdown:
${t}`)}}logOneTimeOperation(e,t){this.oneTimeOperations.push({name:e,time:t,timestamp:performance.now()}),console.log(`[ONE-TIME] ${e}: ${t.toFixed(2)}ms`)}measureOneTime(e,t){const n=performance.now(),i=t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}async measureOneTimeAsync(e,t){const n=performance.now(),i=await t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}begin(e){this.sections.has(e)||this.sections.set(e,{startTime:0,samples:[],callCount:0});const t=this.sections.get(e);t.startTime=performance.now()}end(e){const t=this.sections.get(e);if(!t||t.startTime===0)return;const n=performance.now()-t.startTime;if(this.spikeLoggingEnabled){const i=this.frameSections.get(e)??0;this.frameSections.set(e,i+n)}this.enabled&&(t.samples.push(n),t.callCount++,t.samples.length>this.sampleWindow&&t.samples.shift()),t.startTime=0}wrap(e,t){this.begin(e);const n=t();return this.end(e),n}getMetrics(){const e=[];for(const[t,n]of this.sections){if(n.samples.length===0)continue;const i=n.samples,s=i[i.length-1],o=i.reduce((c,u)=>c+u,0)/i.length,a=Math.max(...i),l=Math.min(...i);e.push({name:t,lastTime:s,avgTime:o,maxTime:a,minTime:l,callCount:n.callCount})}return e.sort((t,n)=>n.avgTime-t.avgTime),e}createDisplay(){this.displayElement||(this.displayElement=document.createElement("div"),this.displayElement.id="profiler-display",this.displayElement.style.cssText=`
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      min-width: 280px;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      pointer-events: none;
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let s="<b>PROFILER (F3 to toggle)</b><br>";s+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let u="#0f0";c.avgTime>5?u="#f44":c.avgTime>1&&(u="#ff0");const h=i>0?(c.avgTime/i*100).toFixed(0):"0",d=c.avgTime.toFixed(2).padStart(6),f=c.maxTime.toFixed(2).padStart(6),p=h.padStart(3);s+=`<span style="color:${u}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${d}ms</span>`,s+=`<span style="color:#666"> max:${f}ms</span>`,c.name!=="Frame Total"&&(s+=`<span style="color:#888"> ${p}%</span>`),s+="<br>"}const o=window.__gameRenderer,a=window.__gameScene;if(o!=null&&o.info){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#88f">GPU Stats</b><br>';const c=o.info.render.calls;let u="#0f0";c>500?u="#f44":c>100&&(u="#ff0");const h=o.info.render.triangles;let d="#0f0";h>5e5?d="#f44":h>1e5&&(d="#ff0"),s+=`<span style="color:${u}">Draw Calls: ${c}</span><br>`,s+=`<span style="color:${d}">Triangles: ${h.toLocaleString()}</span><br>`,s+=`<span style="color:#88f">Geometries: ${o.info.memory.geometries}</span><br>`,s+=`<span style="color:#88f">Textures: ${o.info.memory.textures}</span><br>`,o.info.programs&&(s+=`<span style="color:#88f">Shader Programs: ${o.info.programs.length}</span><br>`)}if(a){let c=0,u=0,h=0,d=0;a.traverse(f=>{f.isMesh&&(c++,f.visible&&u++),f.isGroup&&h++,f.isLight&&d++}),s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#a8f">Scene Stats</b><br>',s+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,s+=`<span style="color:#a8f">Visible Meshes: ${u}</span><br>`,s+=`<span style="color:#a8f">Groups: ${h}</span><br>`,s+=`<span style="color:#a8f">Lights: ${d}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const u=((l-c.timestamp)/1e3).toFixed(1);let h="#f80";c.time>100?h="#f44":c.time>50&&(h="#ff0"),s+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,s+=`<span style="color:#666"> (${u}s ago)</span><br>`}}this.displayElement.innerHTML=s}reset(){this.sections.clear()}};v(ti,"instance");let Oo=ti;const Se=Oo.getInstance();function Yl(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class Fm{constructor(){v(this,"keys",new Set);v(this,"keysJustPressed",new Set);v(this,"mouseMovement",{x:0,y:0});v(this,"mouseButtons",{left:!1,right:!1});v(this,"mouseWheelDelta",0);v(this,"isPointerLocked",!1);v(this,"onPointerLockChange");v(this,"onInventoryToggle");v(this,"onPauseToggle");v(this,"isMobile");v(this,"mobileGameActive",!1);v(this,"touchLookMovement",{x:0,y:0});v(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});v(this,"touchJump",!1);v(this,"touchJumpJustPressed",!1);v(this,"touchCrouch",!1);v(this,"touchLeftClick",!1);v(this,"touchRightClick",!1);v(this,"moveJoystickTouch",null);v(this,"lookJoystickTouch",null);v(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=Yl(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){window.addEventListener("keydown",t=>{if((this.isPointerLocked||this.mobileGameActive)&&t.ctrlKey&&(t.code==="KeyS"||t.code==="KeyR"||t.code==="KeyN"))return t.preventDefault(),t.stopPropagation(),!1},{capture:!0}),window.addEventListener("beforeunload",t=>{if(this.isPointerLocked||this.mobileGameActive)return document.pointerLockElement&&document.exitPointerLock(),t.preventDefault(),t.returnValue="You have an active game. Are you sure you want to leave?",t.returnValue}),document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("wheel",t=>{this.isPointerLocked&&(this.mouseWheelDelta+=t.deltaY)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
      <!-- Top corner buttons -->
      <button id="btn-pause" class="action-btn pause top-left">| |</button>
      <button id="btn-inventory" class="action-btn inventory top-right">INV</button>

      <!-- Left side controls -->
      <div id="left-controls">
        <!-- Left action buttons: Break/Place -->
        <div id="left-buttons">
          <button id="btn-break" class="action-btn attack">BREAK</button>
          <button id="btn-place" class="action-btn">PLACE</button>
        </div>
        <!-- Left joystick for movement (WASD) -->
        <div id="move-joystick" class="joystick-container">
          <div class="joystick-base">
            <div class="joystick-thumb"></div>
          </div>
        </div>
      </div>

      <!-- Right side controls -->
      <div id="right-controls">
        <!-- Right action buttons: Jump/Down -->
        <div id="right-buttons">
          <button id="btn-jump" class="action-btn">JUMP</button>
          <button id="btn-crouch" class="action-btn">DOWN</button>
        </div>
        <!-- Right joystick for looking around -->
        <div id="look-joystick" class="joystick-container">
          <div class="joystick-base">
            <div class="joystick-thumb"></div>
          </div>
        </div>
      </div>
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(o=>o.style.display="none");const s=document.createElement("p");s.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",s.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(s)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),s=document.getElementById("btn-break"),o=document.getElementById("btn-place");if(e){const c=e.querySelector(".joystick-base"),u=e.querySelector(".joystick-thumb"),h=35,d=p=>{const g=c.getBoundingClientRect(),x=g.left+g.width/2,m=g.top+g.height/2,y=p.clientX-x,_=p.clientY-m,C=Math.sqrt(y*y+_*_),b=Math.min(C,h),S=Math.atan2(_,y),A=Math.cos(S)*b,L=Math.sin(S)*b;u.style.transform=`translate(${A}px, ${L}px)`;const E=A/h,T=L/h,I=.2;this.touchMoveInput.forward=T<-I,this.touchMoveInput.backward=T>I,this.touchMoveInput.left=E<-I,this.touchMoveInput.right=E>I};e.addEventListener("touchstart",p=>{p.preventDefault();const g=p.changedTouches[0];this.moveJoystickTouch={id:g.identifier,startX:0,startY:0},d(g)},{passive:!1}),e.addEventListener("touchmove",p=>{if(p.preventDefault(),!!this.moveJoystickTouch)for(let g=0;g<p.touches.length;g++){const x=p.touches[g];if(x.identifier===this.moveJoystickTouch.id){d(x);break}}},{passive:!1});const f=p=>{for(let g=0;g<p.changedTouches.length;g++)if(this.moveJoystickTouch&&p.changedTouches[g].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,u.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",f),e.addEventListener("touchcancel",f)}if(t){const c=t.querySelector(".joystick-base"),u=t.querySelector(".joystick-thumb"),h=35,d=p=>{const g=c.getBoundingClientRect(),x=g.left+g.width/2,m=g.top+g.height/2,y=p.clientX-x,_=p.clientY-m,C=Math.sqrt(y*y+_*_),b=Math.min(C,h),S=Math.atan2(_,y),A=Math.cos(S)*b,L=Math.sin(S)*b;u.style.transform=`translate(${A}px, ${L}px)`;const E=A/h,T=L/h,I=.15;Math.abs(E)>I||Math.abs(T)>I?(this.lookJoystickPosition.x=E,this.lookJoystickPosition.y=T):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",p=>{p.preventDefault();const g=p.changedTouches[0];this.lookJoystickTouch={id:g.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",p=>{if(p.preventDefault(),!!this.lookJoystickTouch)for(let g=0;g<p.touches.length;g++){const x=p.touches[g];if(x.identifier===this.lookJoystickTouch.id){d(x);break}}},{passive:!1});const f=p=>{for(let g=0;g<p.changedTouches.length;g++)if(this.lookJoystickTouch&&p.changedTouches[g].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},u.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",f),t.addEventListener("touchcancel",f)}n&&(n.addEventListener("touchstart",c=>{c.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",c=>{c.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",c=>{c.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",c=>{c.preventDefault(),this.touchCrouch=!1},{passive:!1})),s&&(s.addEventListener("touchstart",c=>{c.preventDefault(),this.touchLeftClick=!0},{passive:!1}),s.addEventListener("touchend",c=>{c.preventDefault(),this.touchLeftClick=!1},{passive:!1})),o&&(o.addEventListener("touchstart",c=>{c.preventDefault(),this.touchRightClick=!0},{passive:!1}),o.addEventListener("touchend",c=>{c.preventDefault(),this.touchRightClick=!1},{passive:!1}));const a=document.getElementById("btn-inventory");a&&a.addEventListener("touchstart",c=>{c.preventDefault(),this.onInventoryToggle&&this.onInventoryToggle()},{passive:!1});const l=document.getElementById("btn-pause");l&&l.addEventListener("touchstart",c=>{c.preventDefault(),this.onPauseToggle&&this.onPauseToggle()},{passive:!1})}setPointerLockCallback(e){this.onPointerLockChange=e}setInventoryToggleCallback(e){this.onInventoryToggle=e}setPauseToggleCallback(e){this.onPauseToggle=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyR"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}getWheelDelta(){const e=this.mouseWheelDelta;return this.mouseWheelDelta=0,e}resetMouseButtons(){this.mouseButtons.left=!1,this.mouseButtons.right=!1}}const ni=class ni{constructor(){v(this,"registeredMenus",new Map);v(this,"pendingPointerLock",!1);v(this,"initialized",!1);v(this,"onMenuCloseCallback",null)}static getInstance(){return ni.instance||(ni.instance=new ni),ni.instance}init(){this.initialized||(this.initialized=!0,document.addEventListener("keyup",e=>{this.pendingPointerLock&&(e.key==="e"||e.key==="E"||e.key==="Escape")&&(this.pendingPointerLock=!1,this.isAnyMenuOpen()||this.requestPointerLock())}))}registerMenu(e,t){this.registeredMenus.set(e,t)}unregisterMenu(e){this.registeredMenus.delete(e)}isAnyMenuOpen(){for(const e of this.registeredMenus.values())if(e.isOpen())return!0;return!1}requestPointerLock(){const e=document.getElementById("game-container");e&&e.requestPointerLock()}schedulePointerLockOnKeyup(){this.pendingPointerLock=!0}restorePointerLockOnClick(){this.triggerMenuCloseCallback(),setTimeout(()=>{this.isAnyMenuOpen()||this.requestPointerLock()},0)}setupCloseButton(e,t,n){if(!t)return;const i=t.querySelector(e);i&&i.addEventListener("click",()=>{n(),this.restorePointerLockOnClick()})}openMenu(){document.exitPointerLock()}closeMenuViaKeyboard(){this.schedulePointerLockOnKeyup(),this.triggerMenuCloseCallback()}setOnMenuCloseCallback(e){this.onMenuCloseCallback=e}triggerMenuCloseCallback(){this.onMenuCloseCallback&&this.onMenuCloseCallback()}};v(ni,"instance",null);let No=ni;const Pt=No.getInstance();class Kl{constructor(e){v(this,"menuElement",null);v(this,"contentElement",null);v(this,"isMenuOpen",!1);v(this,"config");v(this,"onCloseCallback",null);this.config={closeOnE:!0,...e},this.createBaseUI(),this.setupKeyboardHandler(),this.registerWithMenuManager()}createBaseUI(){this.menuElement=document.createElement("div"),this.menuElement.id=this.config.id,this.menuElement.className="modal-menu",this.menuElement.innerHTML=`
      <div class="modal-menu-panel">
        <button class="modal-menu-close">&times;</button>
        <h2 class="modal-menu-title">${this.config.title}</h2>
        <div class="modal-menu-content"></div>
        <p class="modal-menu-hint">Press ${this.config.closeOnE?"E or ":""}ESC to close</p>
      </div>
    `,this.menuElement.style.display="none",document.body.appendChild(this.menuElement),this.contentElement=this.menuElement.querySelector(".modal-menu-content");const e=this.menuElement.querySelector(".modal-menu-close");e&&e.addEventListener("click",()=>{this.close(),Pt.restorePointerLockOnClick()}),this.addBaseStyles()}addBaseStyles(){if(document.getElementById("modal-menu-base-styles"))return;const e=document.createElement("style");e.id="modal-menu-base-styles",e.textContent=`
      .modal-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
      }

      .modal-menu-panel {
        position: relative;
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #555;
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        color: #fff;
        font-family: 'Courier New', monospace;
      }

      .modal-menu-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: #888;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.2s;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-menu-close:hover {
        color: #fff;
      }

      .modal-menu-title {
        margin: 0 0 15px 0;
        padding-right: 30px;
        text-align: center;
        color: #4f8;
        font-size: 18px;
        border-bottom: 1px solid #444;
        padding-bottom: 10px;
      }

      .modal-menu-content {
        margin-bottom: 15px;
      }

      .modal-menu-hint {
        text-align: center;
        color: #666;
        font-size: 11px;
        margin: 15px 0 0 0;
      }
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{if(!this.isMenuOpen)return;const t=e.key.toLowerCase();(t==="escape"||this.config.closeOnE&&t==="e")&&(e.preventDefault(),e.stopPropagation(),this.close(),Pt.closeMenuViaKeyboard())})}registerWithMenuManager(){Pt.registerMenu(this.config.id,{isOpen:()=>this.isMenuOpen,close:()=>this.close()})}open(){this.isMenuOpen||(this.isMenuOpen=!0,this.menuElement&&(this.menuElement.style.display="flex"),Pt.openMenu(),this.onOpen())}close(){this.isMenuOpen&&(this.isMenuOpen=!1,this.menuElement&&(this.menuElement.style.display="none"),this.onClose(),this.onCloseCallback&&this.onCloseCallback())}toggle(){this.isMenuOpen?(this.close(),Pt.closeMenuViaKeyboard()):this.open()}isOpen(){return this.isMenuOpen}setOnCloseCallback(e){this.onCloseCallback=e}getContentElement(){return this.contentElement}getMenuElement(){return this.menuElement}onOpen(){}onClose(){}}const ii=class ii{constructor(){v(this,"managers",new Map);v(this,"onUpdateCallbacks",new Set)}static getInstance(){return ii.instance||(ii.instance=new ii),ii.instance}registerManager(e){this.managers.set(e.type,e),this.notifyUpdate()}unregisterManager(e){this.managers.delete(e),this.notifyUpdate()}getAllBlocks(){const e=[];for(const t of this.managers.values())e.push(...t.getBlocks());return e}getBlocksByType(e){const t=this.managers.get(e);return t?t.getBlocks():[]}getManagerTypes(){return Array.from(this.managers.keys())}onUpdate(e){this.onUpdateCallbacks.add(e)}offUpdate(e){this.onUpdateCallbacks.delete(e)}notifyUpdate(){for(const e of this.onUpdateCallbacks)e()}};v(ii,"instance",null);let Uo=ii;const En=Uo.getInstance();window.__techBlockRegistry=En;class Om extends Kl{constructor(){super({id:"tech-blocks-menu",title:"Tech Blocks",closeOnE:!0});v(this,"updateInterval",null);v(this,"UPDATE_INTERVAL_MS",200);this.addCustomStyles()}addCustomStyles(){const t=document.createElement("style");t.textContent=`
      #tech-blocks-menu .modal-menu-panel {
        min-width: 400px;
        border-color: #4f8;
      }

      #tech-blocks-menu .modal-menu-title {
        color: #4f8;
      }

      .tech-blocks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tech-block-type-group {
        margin-bottom: 10px;
      }

      .tech-block-type-header {
        color: #4f8;
        font-size: 14px;
        font-weight: bold;
        padding: 6px 10px;
        background: rgba(79, 255, 136, 0.1);
        border-radius: 4px;
        margin-bottom: 6px;
      }

      .tech-block-entry {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        border: 1px solid transparent;
      }

      .tech-block-entry:hover {
        background: rgba(79, 255, 136, 0.15);
        border-color: #4f8;
      }

      .tech-block-entry-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tech-block-entry-tile {
        color: #aaa;
        font-size: 12px;
      }

      .tech-block-entry-type {
        color: #fff;
        font-size: 13px;
      }

      .tech-block-entry-status {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 3px;
        font-weight: bold;
      }

      .tech-block-entry-status.active {
        color: #4f4;
        background: rgba(68, 255, 68, 0.15);
      }

      .tech-block-entry-status.idle {
        color: #888;
        background: rgba(136, 136, 136, 0.15);
      }

      .tech-block-entry-status.warning {
        color: #f84;
        background: rgba(255, 136, 68, 0.15);
      }

      .tech-blocks-empty {
        text-align: center;
        color: #666;
        padding: 30px;
        font-style: italic;
      }

      .tech-blocks-summary {
        display: flex;
        justify-content: center;
        gap: 20px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        margin-bottom: 15px;
      }

      .tech-blocks-summary-item {
        text-align: center;
      }

      .tech-blocks-summary-count {
        font-size: 20px;
        font-weight: bold;
        color: #4f8;
      }

      .tech-blocks-summary-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
      }
    `,document.head.appendChild(t)}onOpen(){this.updateContent(),this.updateInterval=window.setInterval(()=>{this.isMenuOpen&&this.updateContent()},this.UPDATE_INTERVAL_MS)}onClose(){this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null)}updateContent(){const t=this.getContentElement();if(!t)return;const n=En.getAllBlocks();if(n.length===0){t.innerHTML=`
        <div class="tech-blocks-empty">
          No tech blocks placed yet.<br>
          Build furnaces, steam engines, hydro generators, storage chests, or copper pipes!
        </div>
      `;return}const i=new Map;for(const a of n){const l=i.get(a.type)||[];l.push(a),i.set(a.type,l)}const s=this.renderSummary(i);let o='<div class="tech-blocks-list">';for(const[a,l]of i)o+=this.renderTypeGroup(a,l);o+="</div>",t.innerHTML=s+o,this.attachClickHandlers(t,n)}renderSummary(t){var s;const n=["Furnace","Steam Engine","Hydro Generator","Storage Chest","Copper Pipe"];let i='<div class="tech-blocks-summary">';for(const o of n){const a=((s=t.get(o))==null?void 0:s.length)||0,l=o.split(" ")[0];i+=`
        <div class="tech-blocks-summary-item">
          <div class="tech-blocks-summary-count">${a}</div>
          <div class="tech-blocks-summary-label">${l}${a!==1?"s":""}</div>
        </div>
      `}return i+="</div>",i}renderTypeGroup(t,n){let i=`
      <div class="tech-block-type-group">
        <div class="tech-block-type-header">${t} (${n.length})</div>
    `;for(const s of n){const o=s.getStatus(),a=this.getStatusClass(o);i+=`
        <div class="tech-block-entry" data-block-id="${s.id}">
          <div class="tech-block-entry-info">
            <span class="tech-block-entry-tile">Tile ${s.tileIndex}</span>
          </div>
          <span class="tech-block-entry-status ${a}">${o}</span>
        </div>
      `}return i+="</div>",i}getStatusClass(t){const n=t.toLowerCase();return n.includes("running")||n.includes("active")||n.includes("smelting")?"active":n.includes("no fuel")||n.includes("no water")?"warning":"idle"}attachClickHandlers(t,n){t.querySelectorAll(".tech-block-entry").forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("data-block-id");if(o){const a=n.find(l=>l.id===o);a&&(this.close(),a.openUI())}})})}}let Br=null;function Nm(){return Br||(Br=new Om),Br}function Um(){return new qe({uniforms:{time:{value:0}},vertexShader:Dm,fragmentShader:Lm,side:Bt})}class km{constructor(e){v(this,"scene");v(this,"camera");v(this,"renderer");v(this,"sunDirection");v(this,"clock");v(this,"frameCount",0);v(this,"lastFpsUpdate",0);v(this,"currentFps",0);v(this,"sunMesh",null);v(this,"starfield",null);v(this,"isUnderwater",!1);v(this,"underwaterFog",null);v(this,"depthRenderTarget",null);v(this,"waterMaterials",new Set);v(this,"waterMeshes",new Set);v(this,"isMobile");v(this,"updateCallbacks",[]);v(this,"animate",()=>{requestAnimationFrame(this.animate),Se.beginFrame(),Se.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}Se.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(Se.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),Se.begin("Render"),this.depthRenderTarget&&this.waterMeshes.size>0){const n=new Map;for(const i of this.waterMeshes)n.set(i,i.visible),i.visible=!1;this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);for(const i of this.waterMeshes)i.visible=n.get(i)??!0}this.renderer.render(this.scene,this.camera),Se.end("Render"),Se.end("Frame Total"),Se.endFrame(),Se.updateDisplay()});this.isMobile=Yl(),this.scene=new Sh,this.camera=new Qt(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new Pm({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=_l,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new Hh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),Se.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),Se.toggle()),t.code==="F2"&&(t.preventDefault(),Nm().toggle())})}setupLighting(){this.sunDirection=new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize();const e=new es(900,64,64),t=Um();this.starfield=new Ae(e,t),this.scene.add(this.starfield);const n=new es(60,32,32),i=new is({color:16768324,fog:!1});this.sunMesh=new Ae(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const s=new Bh(16777215,N.AMBIENT_LIGHT_INTENSITY);this.scene.add(s);const o=new Gh(16777215,N.DIRECTIONAL_LIGHT_INTENSITY);o.position.copy(this.sunDirection.clone().multiplyScalar(500)),o.castShadow=!0,o.shadow.mapSize.width=1024,o.shadow.mapSize.height=1024,o.shadow.camera.near=.5,o.shadow.camera.far=500,o.shadow.camera.left=-100,o.shadow.camera.right=100,o.shadow.camera.top=100,o.shadow.camera.bottom=-100,this.scene.add(o);const a=new Oh(8900331,2236962,N.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(a)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e),i=new jo(t,n);i.format=Ai,i.type=Bn,this.depthRenderTarget=new zn(t,n,{minFilter:ht,magFilter:ht,depthBuffer:!0,depthTexture:i})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.has(e)||(this.waterMaterials.add(e),this.updateWaterMaterialUniforms(e))}registerWaterMesh(e){this.waterMeshes.add(e)}unregisterWaterMesh(e){this.waterMeshes.delete(e)}updateWaterMaterialUniforms(e){if(this.depthRenderTarget){const t=this.renderer.getPixelRatio();e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new ct(window.innerWidth*t,window.innerHeight*t)},e.uniforms.useDepthFog={value:1}}else e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new Oe(N.UNDERWATER_FOG_COLOR);this.underwaterFog=new Ko(t,N.UNDERWATER_FOG_NEAR,N.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class ul{constructor(e=50,t=3){v(this,"tiles",[]);v(this,"radius");v(this,"subdivisions");v(this,"vertexMap",new Map);v(this,"vertices",[]);v(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new R(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],s=this.vertices[t],o=new R().addVectors(i,s).multiplyScalar(.5).normalize().multiplyScalar(this.radius),a=this.vertices.length;return this.vertices.push(o),this.vertexMap.set(n,a),a}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),s=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,s]),e.push([t[1],i,n]),e.push([t[2],s,i]),e.push([n,i,s])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const s=this.faces[i];for(const o of s)e.get(o).push(i)}const t=[];for(const i of this.faces){const s=new R;for(const o of i)s.add(this.vertices[o]);s.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(s)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const s=e.get(i),o=s.length===5,a=[];for(const h of s)a.push(t[h].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(a,l);const c=Array.from(n.get(i)),u={index:i,center:l.clone(),vertices:a,neighbors:c,isPentagon:o};this.tiles.push(u)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new R(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const s=new R().crossVectors(n,i).normalize();i.crossVectors(s,n).normalize();const o=[];for(const a of e){const l=a.clone().sub(t),c=l.dot(i),u=l.dot(s);o.push({vertex:a,angle:Math.atan2(u,c)})}o.sort((a,l)=>a.angle-l.angle);for(let a=0;a<e.length;a++)e[a]=o[a].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const s of this.tiles){const o=s.center.distanceToSquared(t);o<i&&(i=o,n=s)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,s=i.center.distanceToSquared(n),o=!0;for(;o;){o=!1;for(const a of i.neighbors){const l=this.tiles[a],c=l.center.distanceToSquared(n);if(c<s){i=l,s=c,o=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function _t(r){const e="/tenebris/";return r.startsWith("/")?e+r.slice(1):e+r}var Gm=`uniform float time;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform vec3 planetCenter;
uniform vec3 sunDirection;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;
varying float vSunBrightness; 

void main() {
  vUv = uv;

  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  
  vec3 radialDir = normalize(worldPos.xyz - planetCenter);

  
  
  float wave1 = sin(worldPos.x * waveFrequency + time * 1.5) * 0.5;
  float wave2 = sin(worldPos.z * waveFrequency * 0.8 + time * 1.2) * 0.5;
  float wave3 = sin((worldPos.x + worldPos.z) * waveFrequency * 0.6 + time * 0.8) * 0.3;
  float waveHeight = (wave1 + wave2 + wave3) * waveAmplitude;

  
  vec3 displacedPos = worldPos.xyz + radialDir * waveHeight;

  
  vec3 baseNormal = normalize(normalMatrix * normal);

  
  float dx = cos(worldPos.x * waveFrequency + time * 1.5) * waveFrequency * waveAmplitude;
  float dz = cos(worldPos.z * waveFrequency * 0.8 + time * 1.2) * waveFrequency * 0.8 * waveAmplitude;

  
  vec3 tangent = normalize(cross(baseNormal, vec3(0.0, 0.0, 1.0)));
  if (length(tangent) < 0.1) {
    tangent = normalize(cross(baseNormal, vec3(1.0, 0.0, 0.0)));
  }
  vec3 bitangent = normalize(cross(baseNormal, tangent));

  vNormal = normalize(baseNormal - tangent * dx * 0.3 - bitangent * dz * 0.3);

  
  vViewDirection = normalize(cameraPosition - displacedPos);

  
  vDepth = length(cameraPosition - displacedPos);

  
  
  float sunDot = dot(radialDir, sunDirection);
  
  vSunBrightness = smoothstep(-0.2, 0.2, sunDot);

  
  gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
}`,Bm=`precision highp float;

uniform float time;
uniform vec3 waterColor;
uniform vec3 deepWaterColor;
uniform vec3 sunDirection;
uniform float opacity;
uniform float fresnelPower;
uniform float reflectionStrength;
uniform float distortionStrength;
uniform float specularPower;
uniform float specularStrength;
uniform sampler2D waterTexture;
uniform float uvTiling;

uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;

uniform vec3 aboveWaterFogColor;
uniform float aboveWaterFogNear;
uniform float aboveWaterFogFar;

uniform float isUnderwater; 

uniform sampler2D depthTexture;
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 resolution;

uniform float textureStrength;
uniform float scrollSpeed;
uniform float causticStrength;
uniform float foamStrength;

uniform float useDepthFog;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;
varying float vSunBrightness; 

float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; 
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

void main() {
  
  vec2 baseUv = vUv * uvTiling;

  
  vec2 scrollUv1 = baseUv + vec2(time * scrollSpeed, time * scrollSpeed * 0.66);
  vec2 scrollUv2 = baseUv * 1.2 + vec2(-time * scrollSpeed * 0.83, time * scrollSpeed);

  
  vec4 texSample1 = texture2D(waterTexture, scrollUv1);
  vec4 texSample2 = texture2D(waterTexture, scrollUv2);

  
  vec4 texColor = mix(texSample1, texSample2, 0.5);

  
  vec2 finalUv = baseUv;

  
  float depthFogFactor = 0.0;
  vec3 currentFogColor = aboveWaterFogColor;

  
  if (useDepthFog > 0.5) {
    
    vec2 screenCoord = gl_FragCoord.xy / resolution;

    
    float sceneDepthRaw = texture2D(depthTexture, screenCoord).r;
    float sceneDepthZ = linearizeDepth(sceneDepthRaw);
    float waterSurfaceDepthZ = linearizeDepth(gl_FragCoord.z);

    
    
    
    
    
    
    
    
    
    

    float sceneWorldDist = vDepth * (sceneDepthZ / max(waterSurfaceDepthZ, 0.001));
    float underwaterWorldDist = max(0.0, sceneWorldDist - vDepth);

    if (isUnderwater < 0.5) {
      
      depthFogFactor = clamp((underwaterWorldDist - aboveWaterFogNear) / (aboveWaterFogFar - aboveWaterFogNear), 0.0, 1.0);
      currentFogColor = aboveWaterFogColor;
    } else {
      
      depthFogFactor = clamp((vDepth - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
      currentFogColor = underwaterFogColor;
    }
  }

  
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), fresnelPower);

  
  vec3 reflectDir = reflect(-vViewDirection, vNormal);

  
  float skyGradient = reflectDir.y * 0.5 + 0.5;
  vec3 skyColor = mix(vec3(0.4, 0.5, 0.6), vec3(0.6, 0.7, 0.9), skyGradient);

  
  float sunDot = max(dot(reflectDir, sunDirection), 0.0);
  float specular = pow(sunDot, specularPower) * specularStrength;
  vec3 sunColor = vec3(1.0, 0.95, 0.8);

  
  vec3 reflectionColor = skyColor + sunColor * specular;

  
  vec3 baseWaterColor = mix(waterColor, deepWaterColor, 0.5);

  
  vec3 texturedWater = mix(baseWaterColor, texColor.rgb, textureStrength);

  
  float reflectionAmount = fresnel * reflectionStrength;
  vec3 finalColor = mix(texturedWater, reflectionColor, reflectionAmount);

  
  float caustic = fbm(finalUv * 6.0 + time * 0.15) * causticStrength;
  finalColor += vec3(caustic);

  
  float foamNoise = fbm(finalUv * 15.0 + time * 0.3);
  float foam = smoothstep(0.4, 0.6, foamNoise) * foamStrength;
  vec3 foamColor = vec3(0.9, 0.95, 1.0);
  finalColor = mix(finalColor, foamColor, foam);

  
  float finalOpacity = mix(opacity, 0.95, fresnel * 0.5);

  
  
  float dayNightFactor = mix(0.1, 1.0, vSunBrightness); 
  finalColor *= dayNightFactor;

  
  

  
  finalColor = mix(finalColor, currentFogColor * dayNightFactor, depthFogFactor);

  
  finalOpacity = mix(finalOpacity, 1.0, depthFogFactor);

  gl_FragColor = vec4(finalColor, finalOpacity);
}`,Ps=`uniform vec3 planetCenter;\r
uniform vec3 sunDirection;\r
uniform float waterLevel; 

attribute float skyLight;

attribute float torchLight;

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
varying float vTorchLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;

void main() {\r
  vUv = uv;\r
  vSkyLight = skyLight;\r
  vTorchLight = torchLight;

  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldPosition = worldPos.xyz;

  
  
  
  vNormal = normalize(normal);

  
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  
  
  float sunFacing = dot(surfaceDir, sunDirection);

  
  
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  
  float distFromCenter = length(worldPos.xyz - planetCenter);\r
  vWaterDepth = max(0.0, waterLevel - distFromCenter);

  
  vDistanceFromCamera = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}`,Ds=`precision highp float;

uniform sampler2D terrainTexture;\r
uniform vec3 sunDirection;\r
uniform float ambientIntensity;\r
uniform float directionalIntensity;

uniform float isUnderwater; 
uniform vec3 underwaterFogColor;\r
uniform float underwaterFogNear;\r
uniform float underwaterFogFar;\r
uniform float underwaterDimming; 

const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
varying float vTorchLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;

void main() {\r
  
  vec4 texColor = texture2D(terrainTexture, vUv);

  
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  
  
  float directional = meshDiffuse * vSunBrightness * directionalIntensity * vSkyLight;

  
  
  
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness); 
  float ambient = ambientIntensity * ambientDayNight * vSkyLight;

  
  float lighting = ambient + directional;\r
  vec3 finalColor = texColor.rgb * lighting;

  
  
  
  vec3 torchContribution = texColor.rgb * TORCH_LIGHT_COLOR * vTorchLight;

  
  
  if (vWaterDepth > 0.0) {\r
    
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);\r
    finalColor *= depthDimFactor;

    
    float tintFactor = 1.0 - depthDimFactor;\r
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);\r
  }

  
  finalColor += torchContribution;

  
  if (isUnderwater > 0.5) {\r
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);\r
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);\r
  }

  gl_FragColor = vec4(finalColor, texColor.a);\r
}`,zm=`uniform vec3 planetCenter;\r
uniform vec3 sunDirection;\r
uniform float waterLevel; 

attribute float skyLight;

attribute float torchLight;

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
varying float vTorchLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;\r
varying vec3 vViewDirection;

void main() {\r
  vUv = uv;\r
  vSkyLight = skyLight;\r
  vTorchLight = torchLight;

  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldPosition = worldPos.xyz;

  
  vNormal = normalize(normal);

  
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  
  float sunFacing = dot(surfaceDir, sunDirection);

  
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  
  float distFromCenter = length(worldPos.xyz - planetCenter);\r
  vWaterDepth = max(0.0, waterLevel - distFromCenter);

  
  vDistanceFromCamera = length(cameraPosition - worldPos.xyz);

  
  vViewDirection = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}`,Hm=`precision highp float;

uniform sampler2D terrainTexture;\r
uniform vec3 sunDirection;\r
uniform float ambientIntensity;\r
uniform float directionalIntensity;\r
uniform float opacity; 
uniform float specularPower;\r
uniform float specularStrength;

uniform float isUnderwater; 
uniform vec3 underwaterFogColor;\r
uniform float underwaterFogNear;\r
uniform float underwaterFogFar;\r
uniform float underwaterDimming; 

const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
varying float vTorchLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;\r
varying vec3 vViewDirection;

void main() {\r
  
  vec4 texColor = texture2D(terrainTexture, vUv);

  
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  
  float directional = meshDiffuse * vSunBrightness * directionalIntensity * vSkyLight;

  
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness);\r
  float ambient = ambientIntensity * ambientDayNight * vSkyLight;

  
  float lighting = ambient + directional;\r
  vec3 finalColor = texColor.rgb * lighting;

  
  vec3 reflectDir = reflect(-sunDirection, vNormal);\r
  float spec = pow(max(dot(vViewDirection, reflectDir), 0.0), specularPower);\r
  
  vec3 specularColor = vec3(1.0, 1.0, 1.0) * spec * specularStrength * vSunBrightness * vSkyLight;\r
  finalColor += specularColor;

  
  vec3 torchContribution = texColor.rgb * TORCH_LIGHT_COLOR * vTorchLight;

  
  if (vWaterDepth > 0.0) {\r
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);\r
    finalColor *= depthDimFactor;\r
    float tintFactor = 1.0 - depthDimFactor;\r
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);\r
  }

  
  finalColor += torchContribution;

  
  if (isUnderwater > 0.5) {\r
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);\r
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);\r
  }

  
  gl_FragColor = vec4(finalColor, opacity);\r
}`,P=(r=>(r[r.AIR=0]="AIR",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WATER=4]="WATER",r[r.SAND=5]="SAND",r[r.WOOD=6]="WOOD",r[r.LEAVES=7]="LEAVES",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.SNOW=15]="SNOW",r[r.DIRT_SNOW=16]="DIRT_SNOW",r[r.ICE=17]="ICE",r[r.FURNACE=18]="FURNACE",r))(P||{});function Wm(r){return r!==0&&r!==4}function Vm(r){return r===4}class qm{constructor(){v(this,"textureLoader");v(this,"textures",new Map);v(this,"materials",new Map);v(this,"waterShaderMaterial",null);v(this,"terrainMaterials",[]);v(this,"sunDirection",new R(1,.5,.3).normalize());v(this,"planetCenter",new R(0,0,0));this.textureLoader=new In}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=q=>{q.magFilter=ht,q.minFilter=ht,q.wrapS=wn,q.wrapT=wn},s=(q,ee)=>{const te=q.clone();return te.needsUpdate=!0,new Oa({map:te,color:ee,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const q=await this.loadTexture(e);i(q),this.textures.set("primary",q);const ee=new Oe(N.UNDERWATER_FOG_COLOR),pe=(Me=>{const Ge=new qe({uniforms:{terrainTexture:{value:Me},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:ee},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return this.terrainMaterials.push(Ge),Ge})(q);this.materials.set("top",pe),this.materials.set("side",pe),this.materials.set("bottom",pe),this.materials.set("stone",pe);const ve=(Me=>{const Ge=new qe({uniforms:{terrainTexture:{value:Me},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:ee},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(Ge),Ge})(q);this.materials.set("topLOD",ve),this.materials.set("sideLOD",ve),this.materials.set("waterLOD",s(q));return}const o=await this.loadTexture("/textures/rocks.png"),a=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png"),u=await this.loadTexture("/textures/wood.png"),h=await this.loadTexture("/textures/sand.png"),d=await this.loadTexture("/textures/minerals/earth/rocks_coal.png"),f=await this.loadTexture("/textures/minerals/earth/rocks_copper.png"),p=await this.loadTexture("/textures/minerals/earth/rocks_iron.png"),g=await this.loadTexture("/textures/minerals/earth/rocks_gold.png"),x=await this.loadTexture("/textures/minerals/earth/rocks_lythium.png"),m=await this.loadTexture("/textures/minerals/earth/rocks_aluminum.png"),y=await this.loadTexture("/textures/minerals/earth/rocks_cobalt.png"),_=await this.loadTexture("/textures/snow.png"),C=await this.loadTexture("/textures/dirt_snow.png"),b=await this.loadTexture("/textures/ice.png");[o,a,l,c,u,h,d,f,p,g,x,m,y,_,C,b].forEach(i),this.textures.set("stone",o),this.textures.set("dirt",a),this.textures.set("grass",l),this.textures.set("dirtGrass",c),this.textures.set("wood",u),this.textures.set("sand",h),this.textures.set("oreCoal",d),this.textures.set("oreCopper",f),this.textures.set("oreIron",p),this.textures.set("oreGold",g),this.textures.set("oreLithium",x),this.textures.set("oreAluminum",m),this.textures.set("oreCobalt",y),this.textures.set("snow",_),this.textures.set("dirtSnow",C),this.textures.set("ice",b);const S=new Oe(N.UNDERWATER_FOG_COLOR),A=q=>{const ee=new qe({uniforms:{terrainTexture:{value:q},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return this.terrainMaterials.push(ee),ee};this.materials.set("top",A(l)),this.materials.set("side",A(a)),this.materials.set("grassSide",A(c)),this.materials.set("bottom",A(o)),this.materials.set("stone",A(o)),this.materials.set("wood",A(u)),this.materials.set("sand",A(h)),this.materials.set("oreCoal",A(d)),this.materials.set("oreCopper",A(f)),this.materials.set("oreIron",A(p)),this.materials.set("oreGold",A(g)),this.materials.set("oreLithium",A(x)),this.materials.set("oreAluminum",A(m)),this.materials.set("oreCobalt",A(y)),this.materials.set("snow",A(_)),this.materials.set("dirtSnow",A(C)),this.materials.set("snowSide",A(C));const L=new qe({uniforms:{terrainTexture:{value:b},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},opacity:{value:.5},specularPower:{value:64},specularStrength:{value:.6},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:zm,fragmentShader:Hm,transparent:!0,depthWrite:!0,side:Yt});this.terrainMaterials.push(L),this.materials.set("ice",L);const E=new Oe(N.SEA_WALL_COLOR),T=new is({color:E,side:Yt,fog:!1});this.materials.set("seaWall",T);const I=await this.loadTexture("/textures/water.png");i(I),this.textures.set("water",I);const F=new Oe(N.WATER_COLOR),G=new Oe(N.WATER_DEEP_COLOR),z=new Oe(N.UNDERWATER_FOG_COLOR),X=new Oe(N.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new qe({uniforms:{time:{value:0},waterTexture:{value:I},uvTiling:{value:N.WATER_UV_TILING},waterColor:{value:F},deepWaterColor:{value:G},sunDirection:{value:this.sunDirection.clone()},opacity:{value:N.WATER_TRANSPARENCY},fresnelPower:{value:N.WATER_FRESNEL_POWER},reflectionStrength:{value:N.WATER_REFLECTION_STRENGTH},distortionStrength:{value:N.WATER_DISTORTION_STRENGTH},specularPower:{value:N.WATER_SPECULAR_POWER},specularStrength:{value:N.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:N.WATER_WAVE_AMPLITUDE},waveFrequency:{value:N.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:z},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:X},aboveWaterFogNear:{value:N.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:N.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new R(0,0,0)},textureStrength:{value:N.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:N.WATER_SCROLL_SPEED},causticStrength:{value:N.WATER_CAUSTIC_STRENGTH},foamStrength:{value:N.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new ct(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:Gm,fragmentShader:Bm,transparent:!0,side:Yt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const V=q=>{const ee=q.clone();ee.needsUpdate=!0;const te=new qe({uniforms:{terrainTexture:{value:ee},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return te.polygonOffset=!0,te.polygonOffsetFactor=4,te.polygonOffsetUnits=4,this.terrainMaterials.push(te),te};this.materials.set("topLOD",V(l)),this.materials.set("sideLOD",V(a)),this.materials.set("stoneLOD",V(o)),this.materials.set("sandLOD",V(h)),this.materials.set("woodLOD",V(u)),this.materials.set("snowLOD",V(_)),this.materials.set("iceLOD",V(b));const Q=s(I,F);Q.side=Yt,Q.transparent=!1,this.materials.set("waterLOD",Q)}loadTexture(e){const t=_t(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new Oa({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getWoodMaterial(){return this.materials.get("wood")}getSandMaterial(){return this.materials.get("sand")}getSnowMaterial(){return this.materials.get("snow")}getDirtSnowMaterial(){return this.materials.get("dirtSnow")}getSnowSideMaterial(){return this.materials.get("snowSide")??this.materials.get("snow")}getIceMaterial(){return this.materials.get("ice")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}getStoneLODMaterial(){return this.materials.get("stoneLOD")}getSandLODMaterial(){return this.materials.get("sandLOD")}getWoodLODMaterial(){return this.materials.get("woodLOD")}getSnowLODMaterial(){return this.materials.get("snowLOD")}getIceLODMaterial(){return this.materials.get("iceLOD")}createSeparateGeometries(e,t,n,i=new R(0,0,0),s=!0,o=!0,a=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),u=[],h=[];for(const S of e.vertices){const A=S.clone().sub(i).normalize();u.push(A.clone().multiplyScalar(t)),h.push(A.clone().multiplyScalar(n))}const d=c.clone().multiplyScalar(t),f=c.clone().multiplyScalar(n),p=c.clone();let g=new R(1,0,0);Math.abs(p.dot(g))>.9&&(g=new R(0,0,1));const x=new R().crossVectors(p,g).normalize();g=new R().crossVectors(x,p).normalize();let m=null,y=null,_=null;const C=.5,b=[];for(let S=0;S<l;S++){const A=S/l*Math.PI*2-Math.PI/2;b.push({u:.5+Math.cos(A)*C,v:.5+Math.sin(A)*C})}if(s){const S=[],A=[],L=[],E=[],T=c.clone();S.push(f.x,f.y,f.z),A.push(T.x,T.y,T.z),L.push(.5,.5);for(let I=0;I<l;I++){const F=h[I];S.push(F.x,F.y,F.z),A.push(T.x,T.y,T.z),L.push(b[I].u,b[I].v)}for(let I=0;I<l;I++){const F=(I+1)%l;E.push(0,1+I,1+F)}m=new pt,m.setAttribute("position",new Ue(S,3)),m.setAttribute("normal",new Ue(A,3)),m.setAttribute("uv",new Ue(L,2)),m.setIndex(E)}if(o){const S=[],A=[],L=[],E=[],T=c.clone().negate();S.push(d.x,d.y,d.z),A.push(T.x,T.y,T.z),L.push(.5,.5);for(let I=0;I<l;I++){const F=u[I];S.push(F.x,F.y,F.z),A.push(T.x,T.y,T.z),L.push(b[I].u,b[I].v)}for(let I=0;I<l;I++){const F=(I+1)%l;E.push(0,1+F,1+I)}y=new pt,y.setAttribute("position",new Ue(S,3)),y.setAttribute("normal",new Ue(A,3)),y.setAttribute("uv",new Ue(L,2)),y.setIndex(E)}if(a){const S=[],A=[],L=[],E=[];let T=0;for(let I=0;I<l;I++){const F=(I+1)%l,G=h[I],z=h[F],X=u[I],V=u[F],Q=V.clone().sub(X),q=G.clone().sub(X),ee=Q.clone().cross(q).normalize();S.push(X.x,X.y,X.z,V.x,V.y,V.z,z.x,z.y,z.z,G.x,G.y,G.z);for(let pe=0;pe<4;pe++)A.push(ee.x,ee.y,ee.z);L.push(0,0,1,0,1,1,0,1);const te=T;E.push(te,te+1,te+2,te,te+2,te+3),T+=4}_=new pt,_.setAttribute("position",new Ue(S,3)),_.setAttribute("normal",new Ue(A,3)),_.setAttribute("uv",new Ue(L,2)),_.setIndex(E)}return{top:m,bottom:y,sides:_}}createHexPrismGeometry(e,t,n,i=new R(0,0,0),s=!0,o=!0,a=!0){const{top:l,bottom:c,sides:u}=this.createSeparateGeometries(e,t,n,i,s,o,a),h=[],d=[],f=[],p=[],g=[];let x=0;const m=(_,C)=>{if(!_)return;const b=_.getAttribute("position"),S=_.getAttribute("normal"),A=_.getAttribute("uv"),L=_.getIndex();if(!(!b||!S||!A||!L)){for(let E=0;E<b.count;E++)h.push(b.getX(E),b.getY(E),b.getZ(E)),d.push(S.getX(E),S.getY(E),S.getZ(E)),f.push(A.getX(E),A.getY(E));for(let E=0;E<L.count;E+=3)p.push(L.getX(E)+x,L.getX(E+1)+x,L.getX(E+2)+x),g.push(C);x+=b.count,_.dispose()}};m(l,"top"),m(c,"bottom"),m(u,"side");const y=new pt;return y.setAttribute("position",new Ue(h,3)),y.setAttribute("normal",new Ue(d,3)),y.setAttribute("uv",new Ue(f,2)),y.setIndex(p),{geometry:y,faceTypes:g}}isSolid(e){return Wm(e)}isLiquid(e){return Vm(e)}}const Xm=`// Planet distant LOD vertex shader with day/night lighting\r
uniform vec3 planetCenter;\r
uniform vec3 sunDirection;\r
\r
attribute vec3 color;\r
attribute float torchLight; // Pre-baked torch light per vertex (0-1)\r
\r
varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec3 vColor;\r
varying float vSunFacing;\r
varying float vTorchLight;\r
\r
void main() {\r
  vColor = color;\r
  vTorchLight = torchLight;\r
\r
  // Transform to world space\r
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldPosition = worldPos.xyz;\r
\r
  // Transform normal to world space\r
  vNormal = normalize(mat3(modelMatrix) * normal);\r
\r
  // Calculate surface direction (from planet center)\r
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);\r
\r
  // Compute sun facing value for day/night calculation\r
  // This is passed to fragment shader for smooth per-pixel lighting\r
  vSunFacing = dot(surfaceDir, sunDirection);\r
\r
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,$m=`// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights\r
precision highp float;\r
\r
uniform vec3 sunDirection;\r
uniform float ambientIntensity;\r
uniform float directionalIntensity;\r
uniform float darkSideAmbient; // Minimum ambient on dark side (0-1)\r
\r
varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec3 vColor;\r
varying float vSunFacing;\r
varying float vTorchLight; // Pre-baked torch light from vertex shader (0-1)\r
\r
// Warm torch light color\r
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);\r
\r
void main() {\r
  // Calculate day/night factor with smooth terminator\r
  // vSunFacing: 1 = full day, -1 = full night\r
  float dayFactor = smoothstep(-0.1, 0.3, vSunFacing);\r
\r
  // Lambert diffuse lighting on the mesh face\r
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));\r
\r
  // Directional light: direct sunlight on the face\r
  float directional = meshDiffuse * dayFactor * directionalIntensity;\r
\r
  // Ambient light: transitions from full intensity on day side to dim on dark side\r
  float ambientDayNight = mix(darkSideAmbient, 1.0, dayFactor);\r
  float ambient = ambientIntensity * ambientDayNight;\r
\r
  // Final lighting\r
  float lighting = ambient + directional;\r
  vec3 finalColor = vColor * lighting;\r
\r
  // Add vertex-baked torch light (visible on dark side, fades on day side)\r
  if (vTorchLight > 0.0) {\r
    // Night factor - torch light is more visible in darkness\r
    float nightFactor = smoothstep(0.5, 0.0, dayFactor);\r
    finalColor += vColor * TORCH_LIGHT_COLOR * vTorchLight * nightFactor;\r
  }\r
\r
  gl_FragColor = vec4(finalColor, 1.0);\r
}\r
`;function dl(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],torchLight:[],indices:[],vertexOffset:0}}class fl{constructor(e,t=50,n=3,i={}){v(this,"radius");v(this,"center");v(this,"polyhedron");v(this,"columns",new Map);v(this,"meshBuilder");v(this,"scene");v(this,"frustum",new ss);v(this,"projScreenMatrix",new ft);v(this,"config");v(this,"lodChunks",[]);v(this,"lodChunkBounds",[]);v(this,"lodChunkDirections",[]);v(this,"tileToChunk",new Map);v(this,"lodMesh",null);v(this,"lodWaterMesh",null);v(this,"lodTileVisibility",new Map);v(this,"needsLODRebuild",!1);v(this,"LOD_CHUNK_COUNT",12);v(this,"distantLODMeshes",[]);v(this,"distantLODMaterials",[]);v(this,"currentDistantLODLevel",-1);v(this,"boundaryWallsGroup",null);v(this,"cachedRenderDistance",-1);v(this,"cachedNearbyTiles",new Set);v(this,"bufferCenterTiles",new Set);v(this,"pendingTilesToAdd",[]);v(this,"pendingTilesToRemove",[]);v(this,"isIncrementalRebuildActive",!1);v(this,"batchedMeshGroup",null);v(this,"needsRebatch",!0);v(this,"currentWaterMesh",null);v(this,"waterMeshCallback",null);v(this,"geometryWorker",null);v(this,"lodGeometryWorker",null);v(this,"isWorkerBuildActive",!1);v(this,"isLODWorkerBuildActive",!1);v(this,"isLODRebuildScheduled",!1);v(this,"isWaterWallsScheduled",!1);v(this,"needsWaterWallsRebuild",!1);v(this,"currentLODExcludedTileCount",0);v(this,"pendingLODExcludedCount",0);v(this,"initialTerrainBuilt",!1);v(this,"initialLODBuilt",!1);v(this,"initialBuildResolve",null);v(this,"serializedTileData",null);v(this,"serializedTileToChunk",null);v(this,"BLOCK_HEIGHT",1);v(this,"MAX_DEPTH");v(this,"MAX_HEIGHT");v(this,"DEEP_THRESHOLD",4);v(this,"SEA_LEVEL");v(this,"seed");v(this,"sunDirection",new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize());v(this,"torchData",[]);v(this,"tilesWithTorches",new Set);v(this,"ORE_CONFIGS",[{type:P.ORE_LITHIUM,minDepth:0,maxDepth:4,veinChance:.004,veinSize:4,spreadFactor:.6},{type:P.ORE_GOLD,minDepth:0,maxDepth:6,veinChance:.006,veinSize:5,spreadFactor:.65},{type:P.ORE_COBALT,minDepth:0,maxDepth:8,veinChance:.008,veinSize:6,spreadFactor:.7},{type:P.ORE_IRON,minDepth:4,maxDepth:14,veinChance:.012,veinSize:8,spreadFactor:.75},{type:P.ORE_ALUMINUM,minDepth:2,maxDepth:12,veinChance:.01,veinSize:7,spreadFactor:.72},{type:P.ORE_COPPER,minDepth:10,maxDepth:18,veinChance:.015,veinSize:10,spreadFactor:.8},{type:P.ORE_COAL,minDepth:12,maxDepth:20,veinChance:.018,veinSize:12,spreadFactor:.85}]);v(this,"oreVeinCache",new Map);v(this,"oreVeinsGenerated",!1);v(this,"BLOCK_MATERIALS",[{key:"top",getMaterial:()=>this.meshBuilder.getTopMaterial()},{key:"side",getMaterial:()=>this.meshBuilder.getSideMaterial()},{key:"grassSide",getMaterial:()=>this.meshBuilder.getGrassSideMaterial()},{key:"stone",getMaterial:()=>this.meshBuilder.getStoneMaterial()},{key:"sand",getMaterial:()=>this.meshBuilder.getSandMaterial()},{key:"wood",getMaterial:()=>this.meshBuilder.getWoodMaterial()},{key:"water",getMaterial:()=>this.meshBuilder.getWaterMaterial(),renderOrder:1},{key:"oreCoal",getMaterial:()=>this.meshBuilder.getMaterial("oreCoal")},{key:"oreCopper",getMaterial:()=>this.meshBuilder.getMaterial("oreCopper")},{key:"oreIron",getMaterial:()=>this.meshBuilder.getMaterial("oreIron")},{key:"oreGold",getMaterial:()=>this.meshBuilder.getMaterial("oreGold")},{key:"oreLithium",getMaterial:()=>this.meshBuilder.getMaterial("oreLithium")},{key:"oreAluminum",getMaterial:()=>this.meshBuilder.getMaterial("oreAluminum")},{key:"oreCobalt",getMaterial:()=>this.meshBuilder.getMaterial("oreCobalt")},{key:"snow",getMaterial:()=>this.meshBuilder.getSnowMaterial()},{key:"snowSide",getMaterial:()=>this.meshBuilder.getSnowSideMaterial()},{key:"dirtSnow",getMaterial:()=>this.meshBuilder.getDirtSnowMaterial()},{key:"ice",getMaterial:()=>this.meshBuilder.getIceMaterial(),renderOrder:2}]);v(this,"dirtyColumnsQueue",new Set);this.scene=e,this.radius=t,this.center=new R(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??N.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+N.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=N.TERRAIN_MAX_HEIGHT,this.seed=N.TERRAIN_SEED,this.polyhedron=new ul(t,n),this.meshBuilder=new qm}depthToRadius(e){return this.radius-(this.MAX_DEPTH-1-e)*this.BLOCK_HEIGHT}getSeaLevelDepth(){return this.MAX_DEPTH-1-this.SEA_LEVEL}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.depthToRadius(this.getSeaLevelDepth())-N.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new Gt,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2;this.lodChunkDirections=[new R(-1,e,0).normalize(),new R(1,e,0).normalize(),new R(-1,-e,0).normalize(),new R(1,-e,0).normalize(),new R(0,-1,e).normalize(),new R(0,1,e).normalize(),new R(0,-1,-e).normalize(),new R(0,1,-e).normalize(),new R(e,0,-1).normalize(),new R(e,0,1).normalize(),new R(-e,0,-1).normalize(),new R(-e,0,1).normalize()];const t=this.lodChunkDirections;for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let s=0,o=1/0;for(let a=0;a<t.length;a++){const l=i.distanceToSquared(t[a]);l<o&&(o=l,s=a)}this.tileToChunk.set(n.index,s)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new Gt;this.lodChunks.push(i);const s=t[n].clone().multiplyScalar(this.radius).add(this.center),o=this.radius*.7;this.lodChunkBounds.push(new oi(s,o))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-CjW9m9fr.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;Se.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CPNS1EKh.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;Se.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;Se.begin("Planet.workerResult"),Se.begin("Planet.workerResult.createMeshes");const t=[],n=[{dataKey:"topData",materialKey:"top"},{dataKey:"sideData",materialKey:"side"},{dataKey:"grassSideData",materialKey:"grassSide"},{dataKey:"stoneData",materialKey:"stone"},{dataKey:"sandData",materialKey:"sand"},{dataKey:"woodData",materialKey:"wood"},{dataKey:"waterData",materialKey:"water",renderOrder:1},{dataKey:"oreCoalData",materialKey:"oreCoal"},{dataKey:"oreCopperData",materialKey:"oreCopper"},{dataKey:"oreIronData",materialKey:"oreIron"},{dataKey:"oreGoldData",materialKey:"oreGold"},{dataKey:"oreLithiumData",materialKey:"oreLithium"},{dataKey:"oreAluminumData",materialKey:"oreAluminum"},{dataKey:"oreCobaltData",materialKey:"oreCobalt"},{dataKey:"snowData",materialKey:"snow"},{dataKey:"snowSideData",materialKey:"snowSide"},{dataKey:"dirtSnowData",materialKey:"dirtSnow"},{dataKey:"iceData",materialKey:"ice",renderOrder:2}];let i=null;for(const{dataKey:a,materialKey:l,renderOrder:c}of n){const u=e[a];if(u.positions.length>0){const h=this.createBufferGeometry(u),d=this.BLOCK_MATERIALS.find(f=>f.key===l);if(d){const f=new Ae(h,d.getMaterial());c!==void 0&&(f.renderOrder=c),t.push(f),l==="water"&&(i=f)}}}Se.end("Planet.workerResult.createMeshes"),this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),Se.begin("Planet.workerResult.swap");const s=[];for(;this.batchedMeshGroup.children.length>0;){const a=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(a),s.push(a)}for(const a of t)this.batchedMeshGroup.add(a);for(const a of s)a.geometry&&a.geometry.dispose();Se.end("Planet.workerResult.swap"),this.currentWaterMesh=i,i&&this.waterMeshCallback&&this.waterMeshCallback(i,!0),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,Se.end("Planet.workerResult"),this.initialTerrainBuilt||(this.initialTerrainBuilt=!0,this.checkInitialBuildComplete())}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(p=>{p instanceof Ae&&p.geometry&&p.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const p of this.lodChunks)for(;p.children.length>0;){const g=p.children[0];g instanceof Ae&&g.geometry&&g.geometry.dispose(),p.remove(g)}const i=performance.now()-n,s=new Gt,o=(p,g,x,m,y,_)=>{const C=new pt;C.setAttribute("position",new Tt(new Float32Array(p),3)),C.setAttribute("normal",new Tt(new Float32Array(g),3)),C.setAttribute("uv",new Tt(new Float32Array(x),2)),y&&y.length>0&&C.setAttribute("skyLight",new Tt(new Float32Array(y),1));const b=p.length/3;return _&&_.length>0?C.setAttribute("torchLight",new Tt(new Float32Array(_),1)):C.setAttribute("torchLight",new Tt(new Float32Array(b).fill(0),1)),C.setIndex(m),C},a=performance.now();let l=0,c=0;for(let p=0;p<this.LOD_CHUNK_COUNT;p++){const g=e.chunkGeometries[p];if(!g)continue;const x=this.lodChunks[p];if(g.grassPositions.length>0){const m=o(g.grassPositions,g.grassNormals,g.grassUvs,g.grassIndices,g.grassSkyLight,g.grassTorchLight),y=new Ae(m,this.meshBuilder.getTopLODMaterial());x.add(y),l++,c+=g.grassPositions.length/3}if(g.dirtPositions.length>0){const m=o(g.dirtPositions,g.dirtNormals,g.dirtUvs,g.dirtIndices,g.dirtSkyLight,g.dirtTorchLight),y=new Ae(m,this.meshBuilder.getSideLODMaterial());x.add(y),l++,c+=g.dirtPositions.length/3}if(g.stonePositions.length>0){const m=o(g.stonePositions,g.stoneNormals,g.stoneUvs,g.stoneIndices,g.stoneSkyLight,g.stoneTorchLight),y=new Ae(m,this.meshBuilder.getStoneLODMaterial());x.add(y),l++,c+=g.stonePositions.length/3}if(g.sandPositions.length>0){const m=o(g.sandPositions,g.sandNormals,g.sandUvs,g.sandIndices,g.sandSkyLight,g.sandTorchLight),y=new Ae(m,this.meshBuilder.getSandLODMaterial());x.add(y),l++,c+=g.sandPositions.length/3}if(g.woodPositions.length>0){const m=o(g.woodPositions,g.woodNormals,g.woodUvs,g.woodIndices,g.woodSkyLight,g.woodTorchLight),y=new Ae(m,this.meshBuilder.getWoodLODMaterial());x.add(y),l++,c+=g.woodPositions.length/3}if(g.waterPositions.length>0){const m=o(g.waterPositions,g.waterNormals,g.waterUvs,g.waterIndices),y=new Ae(m,this.meshBuilder.getWaterLODMaterial());y.renderOrder=-2,x.add(y),l++,c+=g.waterPositions.length/3}if(g.sidePositions.length>0){const m=o(g.sidePositions,g.sideNormals,g.sideUvs,g.sideIndices,g.sideSkyLight,g.sideTorchLight),y=new Ae(m,this.meshBuilder.getSideLODMaterial());x.add(y),l++,c+=g.sidePositions.length/3}if(g.waterSidePositions.length>0){const m=o(g.waterSidePositions,g.waterSideNormals,g.waterSideUvs,g.waterSideIndices),y=new Ae(m,this.meshBuilder.getWaterLODMaterial());y.renderOrder=-2,x.add(y),l++,c+=g.waterSidePositions.length/3}if(g.snowPositions&&g.snowPositions.length>0){const m=o(g.snowPositions,g.snowNormals,g.snowUvs,g.snowIndices,g.snowSkyLight,g.snowTorchLight),y=new Ae(m,this.meshBuilder.getSnowLODMaterial());x.add(y),l++,c+=g.snowPositions.length/3}if(g.icePositions&&g.icePositions.length>0){const m=o(g.icePositions,g.iceNormals,g.iceUvs,g.iceIndices,g.iceSkyLight,g.iceTorchLight),y=new Ae(m,this.meshBuilder.getIceLODMaterial());x.add(y),l++,c+=g.icePositions.length/3}s.add(x)}const u=performance.now()-a,h=performance.now();s.position.copy(this.center),s.renderOrder=-1,this.scene.add(s),this.lodMesh=s;const d=performance.now()-h,f=performance.now()-t;console.log(`[LOD Build] Total: ${f.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${u.toFixed(1)}ms | Scene add: ${d.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1,this.initialLODBuilt||(this.initialLODBuilt=!0,this.checkInitialBuildComplete())}checkInitialBuildComplete(){this.initialTerrainBuilt&&this.initialLODBuilt&&this.initialBuildResolve&&(this.initialBuildResolve(),this.initialBuildResolve=null)}async buildInitialTerrain(e){const t=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(!t){console.warn("Could not find spawn tile, using default position");return}const n=N.TERRAIN_MIN_RENDER_DISTANCE,i=this.getTilesInRange(t.index,n);return this.cachedNearbyTiles=i,this.bufferCenterTiles=this.getTilesInRange(t.index,N.TERRAIN_BUFFER_ZONE),this.cachedRenderDistance=n,this.needsRebatch=!0,this.needsLODRebuild=!0,this.geometryWorker&&this.startWorkerBuild(),this.lodGeometryWorker&&this.startLODWorkerBuild(),new Promise(s=>{if(this.initialTerrainBuilt&&this.initialLODBuilt){s();return}this.initialBuildResolve=s})}isInitialTerrainReady(){return this.initialTerrainBuilt&&this.initialLODBuilt}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;Se.begin("Planet.workerBuild.serialize");const e=[],t={};for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(s){e.push({tileIndex:i,tile:{index:s.tile.index,vertices:s.tile.vertices.map(o=>({x:o.x,y:o.y,z:o.z})),center:{x:s.tile.center.x,y:s.tile.center.y,z:s.tile.center.z},neighbors:s.tile.neighbors},blocks:[...s.blocks]});for(const o of s.tile.neighbors)if(!t[o]){const a=this.columns.get(o);a&&(t[o]={blocks:[...a.blocks],vertices:a.tile.vertices.map(l=>({x:l.x,y:l.y,z:l.z}))})}s.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1;const n=this.filterRelevantTorches(e);Se.end("Planet.workerBuild.serialize"),Se.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:N.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z},uvScale:N.TERRAIN_UV_SCALE,torches:n}}),Se.end("Planet.workerBuild.postMessage")}filterRelevantTorches(e){if(this.torchData.length===0||e.length===0)return this.torchData;let t=0,n=0,i=0;for(const u of e)t+=u.tile.center.x,n+=u.tile.center.y,i+=u.tile.center.z;t/=e.length,n/=e.length,i/=e.length;let s=0;for(const u of e){const h=u.tile.center.x-t,d=u.tile.center.y-n,f=u.tile.center.z-i,p=h*h+d*d+f*f;p>s&&(s=p)}const o=Math.sqrt(s),a=N.TORCH_LIGHT_RANGE+2,l=o+a,c=l*l;return this.torchData.filter(u=>{const h=u.position.x-t,d=u.position.y-n,f=u.position.z-i;return h*h+d*d+f*f<=c})}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(Se.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,Se.end("Planet.lodWorkerBuild.serialize"),Se.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,waterSurfaceOffset:N.WATER_SURFACE_OFFSET,lodOffset:N.TERRAIN_LOD_OFFSET,chunkCount:this.LOD_CHUNK_COUNT},torches:this.torchData}),Se.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new Gt,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new ul(this.radius,t[n]),s=new pt,o=[],a=[],l=[],c=[],u=[],h=[];let d=0;const f=new Map,p=this.getSeaLevelDepth(),g=this.depthToRadius(p),x=!!this.config.texturePath;for(const _ of i.tiles){const C=this.getHeightVariation(_.center),b=this.depthToRadius(C),S=!x&&C<p,A=S?g:b,L=_.center.clone().normalize().y,E=N.POLAR_THRESHOLD,T=Math.abs(L)>E;let I;if(x){const F=Math.max(.4,Math.min(1,.6+C*.02));I=new Oe(F*.7,F*.7,F*.7)}else S&&T?I=new Oe(12116208):S?I=new Oe(3381708):C<=0?I=new Oe(8947848):T?I=new Oe(15790320):I=new Oe(4885578);f.set(_.index,{radius:A,isWater:S,color:I})}for(const _ of i.tiles){const C=f.get(_.index),b=C.radius,S=C.color,A=_.center.clone().normalize().multiplyScalar(b),L=_.vertices.map(ae=>ae.clone().normalize().multiplyScalar(b)),E=A.clone().normalize(),T=Math.abs(E.y)<.9?new R(0,1,0):new R(1,0,0),I=new R().crossVectors(T,E).normalize(),F=new R().crossVectors(E,I),G=[];let z=1/0,X=-1/0,V=1/0,Q=-1/0;for(const ae of _.vertices){const le=ae.clone().sub(_.center),we=le.dot(I),st=le.dot(F);G.push({u:we,v:st}),z=Math.min(z,we),X=Math.max(X,we),V=Math.min(V,st),Q=Math.max(Q,st)}const q=X-z,ee=Q-V,te=G.map(ae=>({u:(ae.u-z)/q,v:(ae.v-V)/ee})),pe={u:(0-z)/q,v:(0-V)/ee},Pe=_.center.clone().normalize(),ve=_.vertices[0].clone().normalize(),Me=Pe.angleTo(ve);let Ge=!1;for(const ae of this.torchData)if(new R(ae.position.x,ae.position.y,ae.position.z).normalize().angleTo(Pe)<Me){Ge=!0;break}const j=Ge?1:0,J=Ge?.3:0,ue=d;o.push(A.x,A.y,A.z),a.push(E.x,E.y,E.z),l.push(pe.u,pe.v),c.push(S.r,S.g,S.b),u.push(j),d++;for(let ae=0;ae<L.length;ae++)o.push(L[ae].x,L[ae].y,L[ae].z),a.push(E.x,E.y,E.z),l.push(te[ae].u,te[ae].v),c.push(S.r,S.g,S.b),u.push(J),d++,h.push(ue,ue+1+ae,ue+1+(ae+1)%L.length);if(!C.isWater){const ae=x?new Oe(.5,.5,.5):new Oe(9139029),le=_.vertices.length;for(let we=0;we<le;we++){const st=(we+1)%le,ke=_.vertices[we],tt=_.vertices[st],O=ke.clone().add(tt).normalize();let Ie,Ne=1/0;for(const He of _.neighbors){const fe=f.get(He);if(!fe)continue;const nt=i.tiles[He];if(!nt)continue;const Te=nt.center.clone().normalize().distanceToSquared(O);Te<Ne&&(Ne=Te,Ie=fe)}if(Ie&&Ie.radius<b){const He=ke.clone().normalize().multiplyScalar(Ie.radius),fe=tt.clone().normalize().multiplyScalar(Ie.radius),nt=tt.clone().normalize().multiplyScalar(b),Te=ke.clone().normalize().multiplyScalar(b),De=d;o.push(He.x,He.y,He.z),o.push(fe.x,fe.y,fe.z),o.push(nt.x,nt.y,nt.z),o.push(Te.x,Te.y,Te.z);const D=fe.clone().sub(He),M=Te.clone().sub(He),B=D.clone().cross(M).normalize();a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),l.push(0,0,1,0,1,1,0,1),c.push(ae.r,ae.g,ae.b),c.push(ae.r,ae.g,ae.b),c.push(ae.r,ae.g,ae.b),c.push(ae.r,ae.g,ae.b),u.push(J),u.push(J),u.push(J),u.push(J),h.push(De,De+1,De+2),h.push(De,De+2,De+3),d+=4}}}}s.setAttribute("position",new Ue(o,3)),s.setAttribute("normal",new Ue(a,3)),s.setAttribute("uv",new Ue(l,2)),s.setAttribute("color",new Ue(c,3)),s.setAttribute("torchLight",new Ue(u,1)),s.setIndex(h);const m=new qe({uniforms:{planetCenter:{value:this.center.clone()},sunDirection:{value:new R(1,0,0)},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},darkSideAmbient:{value:N.PLANET_DARK_SIDE_AMBIENT}},vertexShader:Xm,fragmentShader:$m,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),y=new Ae(s,m);y.position.copy(this.center),y.visible=!1,y.renderOrder=-2,this.scene.add(y),this.distantLODMeshes.push(y),this.distantLODMaterials.push(m)}}rebuildDistantLODMeshes(){const e=this.currentDistantLODLevel;for(const t of this.distantLODMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof gn&&t.material.dispose();this.distantLODMeshes=[],this.distantLODMaterials=[],this.currentDistantLODLevel=-1,this.createDistantLODMeshes(),e>=0&&this.setDistantLODVisible(e)}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(Se.begin("Planet.rebuildLODMesh"),Se.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const a=this.lodMesh;a.traverse(l=>{l instanceof Ae&&l.geometry&&l.geometry.dispose()}),this.scene.remove(a),this.lodMesh=null,this.lodWaterMesh=null}for(const a of this.lodChunks)for(;a.children.length>0;){const l=a.children[0];l instanceof Ae&&l.geometry&&l.geometry.dispose(),a.remove(l)}Se.end("Planet.rebuildLODMesh.cleanup");const e=N.TERRAIN_LOD_OFFSET,t=this.depthToRadius(this.getSeaLevelDepth())-e,n=[];for(let a=0;a<this.LOD_CHUNK_COUNT;a++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassTorchLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtTorchLight:[],dirtIndices:[],dirtVertexOffset:0,stonePositions:[],stoneNormals:[],stoneUvs:[],stoneSkyLight:[],stoneTorchLight:[],stoneIndices:[],stoneVertexOffset:0,sandPositions:[],sandNormals:[],sandUvs:[],sandSkyLight:[],sandTorchLight:[],sandIndices:[],sandVertexOffset:0,woodPositions:[],woodNormals:[],woodUvs:[],woodSkyLight:[],woodTorchLight:[],woodIndices:[],woodVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideTorchLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0,snowPositions:[],snowNormals:[],snowUvs:[],snowSkyLight:[],snowTorchLight:[],snowIndices:[],snowVertexOffset:0,icePositions:[],iceNormals:[],iceUvs:[],iceSkyLight:[],iceTorchLight:[],iceIndices:[],iceVertexOffset:0});const i=new Map;for(const[a,l]of this.columns){const c=l.tile,u=c.center.clone().normalize(),h=c.vertices.map(L=>L.clone().normalize()),d=Math.abs(u.y)<.9?new R(0,1,0):new R(1,0,0),f=new R().crossVectors(d,u).normalize(),p=new R().crossVectors(u,f),g=[];let x=1/0,m=-1/0,y=1/0,_=-1/0;for(const L of c.vertices){const E=L.clone().sub(c.center),T=E.dot(f),I=E.dot(p);g.push({u:T,v:I}),x=Math.min(x,T),m=Math.max(m,T),y=Math.min(y,I),_=Math.max(_,I)}const C=m-x,b=_-y,S=g.map(L=>({u:(L.u-x)/C,v:(L.v-y)/b})),A={u:(0-x)/C,v:(0-y)/b};i.set(a,{normalizedCenter:u,normalizedVertices:h,normalizedUVs:S,centerUV:A})}Se.begin("Planet.rebuildLODMesh.pass1");const s=new Map;for(const[a,l]of this.columns){let c=0,u=P.GRASS,h=0;for(let g=l.blocks.length-1;g>=0;g--)if(l.blocks[g]!==P.AIR&&(u===P.GRASS&&(c=g,u=l.blocks[g]),l.blocks[g]!==P.WATER)){h=g;break}let d;const f=u===P.WATER;f?d=t:d=this.depthToRadius(c)-e;const p=this.depthToRadius(h)-e;s.set(a,{radius:d,isWater:f,surfaceBlockType:u,terrainRadius:p})}Se.end("Planet.rebuildLODMesh.pass1"),Se.begin("Planet.rebuildLODMesh.pass2");for(const[a]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const l=s.get(a);if(!l)continue;const c=l.surfaceBlockType,u=l.radius,h=i.get(a);if(!h)continue;const d=h.normalizedCenter,f=d.clone().multiplyScalar(u),p=h.normalizedVertices.map(I=>I.clone().multiplyScalar(u)),g=this.tileToChunk.get(a)??0,x=n[g];let m,y,_,C,b,S,A;c===P.WATER?(m=x.waterPositions,y=x.waterNormals,_=x.waterUvs,C=null,b=null,S=x.waterIndices,A=x.waterVertexOffset):c===P.DIRT?(m=x.dirtPositions,y=x.dirtNormals,_=x.dirtUvs,C=x.dirtSkyLight,b=x.dirtTorchLight,S=x.dirtIndices,A=x.dirtVertexOffset):c===P.STONE?(m=x.stonePositions,y=x.stoneNormals,_=x.stoneUvs,C=x.stoneSkyLight,b=x.stoneTorchLight,S=x.stoneIndices,A=x.stoneVertexOffset):c===P.SAND?(m=x.sandPositions,y=x.sandNormals,_=x.sandUvs,C=x.sandSkyLight,b=x.sandTorchLight,S=x.sandIndices,A=x.sandVertexOffset):c===P.WOOD?(m=x.woodPositions,y=x.woodNormals,_=x.woodUvs,C=x.woodSkyLight,b=x.woodTorchLight,S=x.woodIndices,A=x.woodVertexOffset):c===P.SNOW||c===P.DIRT_SNOW?(m=x.snowPositions,y=x.snowNormals,_=x.snowUvs,C=x.snowSkyLight,b=x.snowTorchLight,S=x.snowIndices,A=x.snowVertexOffset):c===P.ICE?(m=x.icePositions,y=x.iceNormals,_=x.iceUvs,C=x.iceSkyLight,b=x.iceTorchLight,S=x.iceIndices,A=x.iceVertexOffset):(m=x.grassPositions,y=x.grassNormals,_=x.grassUvs,C=x.grassSkyLight,b=x.grassTorchLight,S=x.grassIndices,A=x.grassVertexOffset);const E=this.tilesWithTorches.has(a)?1:0,T=A;m.push(f.x,f.y,f.z),y.push(d.x,d.y,d.z),_.push(h.centerUV.u,h.centerUV.v),C&&C.push(1),b&&b.push(E),A++;for(let I=0;I<p.length;I++)m.push(p[I].x,p[I].y,p[I].z),y.push(d.x,d.y,d.z),_.push(h.normalizedUVs[I].u,h.normalizedUVs[I].v),C&&C.push(1),b&&b.push(E),A++,S.push(T,T+1+I,T+1+(I+1)%p.length);c===P.WATER?x.waterVertexOffset=A:c===P.DIRT?x.dirtVertexOffset=A:c===P.STONE?x.stoneVertexOffset=A:c===P.SAND?x.sandVertexOffset=A:c===P.WOOD?x.woodVertexOffset=A:c===P.SNOW||c===P.DIRT_SNOW?x.snowVertexOffset=A:c===P.ICE?x.iceVertexOffset=A:x.grassVertexOffset=A,this.lodTileVisibility.set(a,!0)}Se.end("Planet.rebuildLODMesh.pass2"),Se.begin("Planet.rebuildLODMesh.pass3");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=l.tile,u=s.get(a),h=(u==null?void 0:u.radius)??this.radius,d=(u==null?void 0:u.isWater)??!1,f=c.vertices.length,p=i.get(a);if(!p)continue;const g=p.normalizedVertices,x=this.tileToChunk.get(a)??0,m=n[x];for(let y=0;y<f;y++){const _=(y+1)%f,C=g[y],b=g[_],S=C.x+b.x,A=C.y+b.y,L=C.z+b.z,E=Math.sqrt(S*S+A*A+L*L),T=S/E,I=A/E,F=L/E;let G,z=1/0,X=!1;for(const re of c.neighbors){const $=i.get(re);if(!$)continue;const Re=$.normalizedCenter,ie=Re.x-T,ne=Re.y-I,me=Re.z-F,se=ie*ie+ne*ne+me*me;if(se<z){z=se;const he=s.get(re);G=he==null?void 0:he.radius,X=(he==null?void 0:he.isWater)??!1}}if(G===void 0||!(h>G||d&&!X))continue;const Q=C.x*G,q=C.y*G,ee=C.z*G,te=b.x*G,pe=b.y*G,Pe=b.z*G,ve=b.x*h,Me=b.y*h,Ge=b.z*h,j=C.x*h,J=C.y*h,ue=C.z*h,ae=te-Q,le=pe-q,we=Pe-ee,st=j-Q,ke=J-q,tt=ue-ee;let O=le*tt-we*ke,Ie=we*st-ae*tt,Ne=ae*ke-le*st;const He=Math.sqrt(O*O+Ie*Ie+Ne*Ne);He>0&&(O/=He,Ie/=He,Ne/=He);const fe=d?m.waterSidePositions:m.sidePositions,nt=d?m.waterSideNormals:m.sideNormals,Te=d?m.waterSideUvs:m.sideUvs,De=d?null:m.sideSkyLight,D=d?null:m.sideTorchLight,M=d?m.waterSideIndices:m.sideIndices,B=d?m.waterSideVertexOffset:m.sideVertexOffset,Z=this.tilesWithTorches.has(a)?1:0;fe.push(Q,q,ee,te,pe,Pe,ve,Me,Ge,j,J,ue),nt.push(O,Ie,Ne,O,Ie,Ne,O,Ie,Ne,O,Ie,Ne),Te.push(0,0,1,0,1,1,0,1),De&&De.push(1,1,1,1),D&&D.push(Z,Z,Z,Z),M.push(B,B+1,B+2,B,B+2,B+3),d?m.waterSideVertexOffset+=4:m.sideVertexOffset+=4}}Se.end("Planet.rebuildLODMesh.pass3"),Se.begin("Planet.rebuildLODMesh.pass4");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=s.get(a);if(!((c==null?void 0:c.isWater)??!1))continue;const h=l.tile,d=h.vertices.length,f=i.get(a);if(!f)continue;const p=f.normalizedVertices,g=this.tileToChunk.get(a)??0,x=n[g];for(let m=0;m<d;m++){const y=(m+1)%d,_=p[m],C=p[y],b=_.x+C.x,S=_.y+C.y,A=_.z+C.z,L=Math.sqrt(b*b+S*S+A*A),E=b/L,T=S/L,I=A/L;let F,G=1/0;for(const nt of h.neighbors){const Te=i.get(nt);if(!Te)continue;const De=Te.normalizedCenter,D=De.x-E,M=De.y-T,B=De.z-I,Z=D*D+M*M+B*B;Z<G&&(G=Z,F=nt)}if(F===void 0||!this.cachedNearbyTiles.has(F))continue;const z=s.get(F);if(!z)continue;const X=z.terrainRadius,V=t;if(X>=V)continue;const Q=_.x*X,q=_.y*X,ee=_.z*X,te=C.x*X,pe=C.y*X,Pe=C.z*X,ve=C.x*V,Me=C.y*V,Ge=C.z*V,j=_.x*V,J=_.y*V,ue=_.z*V,ae=te-Q,le=pe-q,we=Pe-ee,st=j-Q,ke=J-q,tt=ue-ee;let O=le*tt-we*ke,Ie=we*st-ae*tt,Ne=ae*ke-le*st;const He=Math.sqrt(O*O+Ie*Ie+Ne*Ne);He>0&&(O/=He,Ie/=He,Ne/=He);const fe=x.waterSideVertexOffset;x.waterSidePositions.push(Q,q,ee,te,pe,Pe,ve,Me,Ge,j,J,ue),x.waterSideNormals.push(O,Ie,Ne,O,Ie,Ne,O,Ie,Ne,O,Ie,Ne),x.waterSideUvs.push(0,0,1,0,1,1,0,1),x.waterSideIndices.push(fe,fe+1,fe+2,fe,fe+2,fe+3),x.waterSideVertexOffset+=4}}Se.end("Planet.rebuildLODMesh.pass4"),Se.begin("Planet.rebuildLODMesh.createMeshes");const o=new Gt;for(let a=0;a<this.LOD_CHUNK_COUNT;a++){const l=n[a],c=this.lodChunks[a];for(;c.children.length>0;)c.remove(c.children[0]);const u=(h,d,f,p,g,x)=>{const m=new pt;if(m.setAttribute("position",new Ue(h,3)),m.setAttribute("normal",new Ue(d,3)),m.setAttribute("uv",new Ue(f,2)),g&&g.length>0&&m.setAttribute("skyLight",new Ue(g,1)),x&&x.length>0)m.setAttribute("torchLight",new Ue(x,1));else{const y=h.length/3;m.setAttribute("torchLight",new Ue(new Float32Array(y).fill(0),1))}return m.setIndex(p),m};if(l.grassPositions.length>0){const h=u(l.grassPositions,l.grassNormals,l.grassUvs,l.grassIndices,l.grassSkyLight,l.grassTorchLight),d=new Ae(h,this.meshBuilder.getTopLODMaterial());c.add(d)}if(l.dirtPositions.length>0){const h=u(l.dirtPositions,l.dirtNormals,l.dirtUvs,l.dirtIndices,l.dirtSkyLight,l.dirtTorchLight),d=new Ae(h,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.stonePositions.length>0){const h=u(l.stonePositions,l.stoneNormals,l.stoneUvs,l.stoneIndices,l.stoneSkyLight,l.stoneTorchLight),d=new Ae(h,this.meshBuilder.getStoneLODMaterial());c.add(d)}if(l.sandPositions.length>0){const h=u(l.sandPositions,l.sandNormals,l.sandUvs,l.sandIndices,l.sandSkyLight,l.sandTorchLight),d=new Ae(h,this.meshBuilder.getSandLODMaterial());c.add(d)}if(l.woodPositions.length>0){const h=u(l.woodPositions,l.woodNormals,l.woodUvs,l.woodIndices,l.woodSkyLight,l.woodTorchLight),d=new Ae(h,this.meshBuilder.getWoodLODMaterial());c.add(d)}if(l.snowPositions.length>0){const h=u(l.snowPositions,l.snowNormals,l.snowUvs,l.snowIndices,l.snowSkyLight,l.snowTorchLight),d=new Ae(h,this.meshBuilder.getSnowLODMaterial());c.add(d)}if(l.icePositions.length>0){const h=u(l.icePositions,l.iceNormals,l.iceUvs,l.iceIndices,l.iceSkyLight,l.iceTorchLight),d=new Ae(h,this.meshBuilder.getIceLODMaterial());c.add(d)}if(l.waterPositions.length>0){const h=new pt;h.setAttribute("position",new Ue(l.waterPositions,3)),h.setAttribute("normal",new Ue(l.waterNormals,3)),h.setAttribute("uv",new Ue(l.waterUvs,2)),h.setIndex(l.waterIndices);const d=new Ae(h,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}if(l.sidePositions.length>0){const h=u(l.sidePositions,l.sideNormals,l.sideUvs,l.sideIndices,l.sideSkyLight,l.sideTorchLight),d=new Ae(h,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.waterSidePositions.length>0){const h=new pt;h.setAttribute("position",new Ue(l.waterSidePositions,3)),h.setAttribute("normal",new Ue(l.waterSideNormals,3)),h.setAttribute("uv",new Ue(l.waterSideUvs,2)),h.setIndex(l.waterSideIndices);const d=new Ae(h,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}o.add(c)}o.position.copy(this.center),o.renderOrder=-1,this.scene.add(o),this.lodMesh=o,Se.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,Se.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath;this.generateOreVeins();const t=new Map;for(const s of this.polyhedron.tiles){const o=this.getHeightVariation(s.center);t.set(s.index,o)}const n=this.MAX_DEPTH-1-this.SEA_LEVEL,i=new Set;if(e){for(const s of this.polyhedron.tiles)if((t.get(s.index)??n)>=n){for(const a of s.neighbors)if((t.get(a)??n)<n){i.add(s.index);break}}console.log(`[Beach detection] Found ${i.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`)}for(const s of this.polyhedron.tiles){const o=[],a=t.get(s.index)??n,l=i.has(s.index),c=s.center.clone().normalize().y,u=N.POLAR_THRESHOLD,h=Math.abs(c)>u,d=e&&a<n;for(let g=0;g<this.MAX_DEPTH;g++)if(g>a)o.push(P.AIR);else if(g===a)l&&!h?o.push(P.SAND):d?o.push(P.DIRT):h?o.push(P.SNOW):o.push(P.GRASS);else if(g>a-3)l&&!h?o.push(P.SAND):o.push(P.DIRT);else{const x=this.getOreAtDepth(g,s.index);o.push(x)}const f=new oi(s.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),p={tile:s,blocks:o,isDirty:!0,boundingSphere:f};this.columns.set(s.index,p)}e&&this.fillOceans()}generateOreVeins(){if(this.oreVeinsGenerated)return;const e=n=>{const i=Math.sin(n)*43758.5453;return i-Math.floor(i)},t=new Map;for(const n of this.polyhedron.tiles)t.set(n.index,n.neighbors);for(const n of this.ORE_CONFIGS){const i=n.type*31337;for(const s of this.polyhedron.tiles){const o=s.index;for(let a=n.minDepth;a<=n.maxDepth;a++){const l=`${o},${a}`;if(this.oreVeinCache.has(l))continue;const c=N.TERRAIN_SEED+i+o*7919+a*104729;e(c)<n.veinChance&&this.spreadOreVein(o,a,n,e,c,t)}}}this.oreVeinsGenerated=!0}spreadOreVein(e,t,n,i,s,o){const a=[],l=new Set;a.push({tileIndex:e,depth:t,probability:1});let c=0;const u=n.veinSize+Math.floor(i(s+999)*n.veinSize*.5);for(;a.length>0&&c<u;){const h=a.shift(),d=`${h.tileIndex},${h.depth}`;if(l.has(d)||(l.add(d),h.depth<n.minDepth||h.depth>n.maxDepth))continue;const f=s+h.tileIndex*13+h.depth*17;if(i(f)>h.probability||this.oreVeinCache.has(d))continue;this.oreVeinCache.set(d,n.type),c++;const p=h.probability*n.spreadFactor;if(p<.1)continue;a.push({tileIndex:h.tileIndex,depth:h.depth-1,probability:p}),a.push({tileIndex:h.tileIndex,depth:h.depth+1,probability:p});const g=o.get(h.tileIndex);if(g)for(const x of g)a.push({tileIndex:x,depth:h.depth,probability:p*.9})}}getOreAtDepth(e,t){const n=`${t},${e}`;return this.oreVeinCache.get(n)||P.STONE}fillOceans(){const e=this.MAX_DEPTH-1-this.SEA_LEVEL,t=N.POLAR_THRESHOLD;for(const[n,i]of this.columns){const s=i.tile.center.clone().normalize().y,o=Math.abs(s)>t;let a=!1;for(let l=i.blocks.length-1;l>=0&&i.blocks[l]===P.AIR;l--)l<=e&&(o&&!a&&l===e?(i.blocks[l]=P.ICE,a=!0):i.blocks[l]=P.WATER,i.isDirty=!0)}this.cascadeWaterInColumns()}cascadeWaterInColumns(){let e=0;for(const[t,n]of this.columns){let i=!1;for(let s=n.blocks.length-1;s>=0;s--){const o=n.blocks[s];o===P.WATER?i=!0:o===P.AIR?i&&(n.blocks[s]=P.WATER,n.isDirty=!0,e++):i=!1}}e>0&&console.log(`[Water cascade] Filled ${e} air blocks below water in columns`)}updateWaterFlow(e){let t=0;for(const n of e){const i=this.columns.get(n);if(!i)continue;let s=!0;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?s||(i.blocks[a]=P.AIR,i.isDirty=!0,t++):l===P.AIR||(s=!1)}let o=!1;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?o=!0:l===P.AIR?o&&(i.blocks[a]=P.WATER,i.isDirty=!0,t++):o=!1}}return t}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkDirections[e];this.lodChunkBounds[e].center.set(t.x*this.radius+this.center.x,t.y*this.radius+this.center.y,t.z*this.radius+this.center.z)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=N.TERRAIN_CONTINENT_SCALE,s=N.TERRAIN_MOUNTAIN_SCALE,o=N.TERRAIN_DETAIL_SCALE,a=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(a)*Math.pow(Math.abs(a),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,s,4,.5,2.2),u=Math.max(0,l),h=c*u*N.TERRAIN_MOUNTAIN_HEIGHT,d=this.fractalSimplex3D(n.x,n.y,n.z,N.TERRAIN_HILL_SCALE,3,.5,2),f=this.fractalSimplex3D(n.x,n.y,n.z,o,2,.5,2);let p=l*N.TERRAIN_CONTINENT_WEIGHT;p+=h,p+=d*N.TERRAIN_HILL_WEIGHT*(u>.1?1:.3),p+=f*N.TERRAIN_DETAIL_WEIGHT;const g=this.MAX_DEPTH-1-this.SEA_LEVEL;let x;if(p>=0){const m=p*this.MAX_HEIGHT*t;x=g+m}else{const y=Math.pow(Math.abs(p),N.TERRAIN_OCEAN_DEPTH_POWER)*N.TERRAIN_MAX_DEPTH*t;x=g-y}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(x)))}simplex3D(e,t,n){const i=.3333333333333333,s=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const o=(e+t+n)*i,a=Math.floor(e+o),l=Math.floor(t+o),c=Math.floor(n+o),u=(a+l+c)*s,h=a-u,d=l-u,f=c-u,p=e-h,g=t-d,x=n-f;let m,y,_,C,b,S;p>=g?g>=x?(m=1,y=0,_=0,C=1,b=1,S=0):p>=x?(m=1,y=0,_=0,C=1,b=0,S=1):(m=0,y=0,_=1,C=1,b=0,S=1):g<x?(m=0,y=0,_=1,C=0,b=1,S=1):p<x?(m=0,y=1,_=0,C=0,b=1,S=1):(m=0,y=1,_=0,C=1,b=1,S=0);const A=p-m+s,L=g-y+s,E=x-_+s,T=p-C+2*s,I=g-b+2*s,F=x-S+2*s,G=p-1+3*s,z=g-1+3*s,X=x-1+3*s;let V=0,Q=0,q=0,ee=0,te=.6-p*p-g*g-x*x;te>=0&&(te*=te,V=te*te*this.grad3D(a,l,c,p,g,x));let pe=.6-A*A-L*L-E*E;pe>=0&&(pe*=pe,Q=pe*pe*this.grad3D(a+m,l+y,c+_,A,L,E));let Pe=.6-T*T-I*I-F*F;Pe>=0&&(Pe*=Pe,q=Pe*Pe*this.grad3D(a+C,l+b,c+S,T,I,F));let ve=.6-G*G-z*z-X*X;return ve>=0&&(ve*=ve,ee=ve*ve*this.grad3D(a+1,l+1,c+1,G,z,X)),32*(V+Q+q+ee)}grad3D(e,t,n,i,s,o){const a=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][a];return c[0]*i+c[1]*s+c[2]*o}fractalSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,u=i,h=0;for(let d=0;d<s;d++)l+=this.simplex3D(e*u,t*u,n*u)*c,h+=c,c*=o,u*=a;return l/h}ridgeSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,u=i,h=0;for(let d=0;d<s;d++){const f=this.simplex3D(e*u,t*u,n*u),p=1-Math.abs(f);l+=p*p*c,h+=c,c*=o,u*=a}return l/h}hash3D(e,t,n){const i=this.seed;let s=e*374761393+t*668265263+n*1274126177+i|0;return s=(s^s>>13)*1274126177|0,s^s>>16}update(e,t,n,i){i?this.frustum.copy(i):(Se.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),Se.end("Planet.frustum"));const s=n;s&&s>100&&console.log("you got serious issues lol "+n);const o=e.distanceTo(this.center),a=o-this.radius,l=this.getDistantLODLevel(o);if(l>=0){this.setDistantLODVisible(l),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(a>N.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const m=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!m);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const c=Math.min(1,Math.max(0,a/100)),u=N.TERRAIN_MIN_RENDER_DISTANCE,h=N.TERRAIN_MAX_RENDER_DISTANCE,d=Math.floor(u+c*(h-u));Se.begin("Planet.getTile");const f=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(Se.end("Planet.getTile"),!f)return;const p=f.index;this.isIncrementalRebuildActive&&(Se.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),Se.end("Planet.incrementalRebuild"));const g=N.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(p)||d!==this.cachedRenderDistance){Se.begin("Planet.tilesInRange");const m=this.getTilesInRange(p,d),y=[],_=[];for(const C of m)this.cachedNearbyTiles.has(C)||y.push(C);for(const C of this.cachedNearbyTiles)m.has(C)||_.push(C);if(this.bufferCenterTiles=this.getTilesInRange(p,g),this.cachedRenderDistance=d,y.length>0||_.length>0){this.cachedNearbyTiles=m;const C=this.polyhedron.tiles[p].center;y.sort((b,S)=>{const A=this.polyhedron.tiles[b].center.distanceToSquared(C);return this.polyhedron.tiles[S].center.distanceToSquared(C)-A}),_.sort((b,S)=>{const A=this.polyhedron.tiles[b].center.distanceToSquared(C),L=this.polyhedron.tiles[S].center.distanceToSquared(C);return A-L}),this.pendingTilesToAdd.push(...y),this.pendingTilesToRemove.push(..._),this.isIncrementalRebuildActive=!0,console.log("[needsRebatch=true] cachedNearbyTiles changed"),this.needsRebatch=!0,this.needsLODRebuild=!0,Se.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),Se.end("Planet.boundaryWalls")}Se.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(Se.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),Se.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(console.log("[startWorkerBuild] needsRebatch was true, starting worker build"),this.geometryWorker?(Se.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),Se.end("Planet.startWorkerBuild")):(Se.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),Se.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(y=>setTimeout(y,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(Se.begin("Planet.LODRebuild"),this.rebuildLODMesh(),Se.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(y=>setTimeout(y,0)))(()=>{this.needsWaterWallsRebuild&&(Se.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),Se.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=N.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,console.log("[needsRebatch=true] incremental rebuild complete"),this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),this.currentWaterMesh=null;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=dl();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const s=this.createBufferGeometry(i),o=new Ae(s,n.getMaterial());n.renderOrder!==void 0&&(o.renderOrder=n.renderOrder),this.batchedMeshGroup.add(o),n.key==="water"&&(this.currentWaterMesh=o,this.waterMeshCallback&&this.waterMeshCallback(o,!0))}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}getBlockTopMaterialKey(e){switch(e){case P.WATER:return"water";case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"top";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"top"}}getBlockSideMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"grassSide";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snowSide";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}getBlockBottomMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.WOOD:return"wood";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"dirtSnow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}buildColumnGeometry(e,t){let n=0;for(let i=e.blocks.length-1;i>=0;i--)if(e.blocks[i]!==P.AIR&&e.blocks[i]!==P.WATER){n=i;break}for(let i=0;i<e.blocks.length;i++){const s=e.blocks[i];if(s===P.AIR)continue;const o=s===P.WATER,a=i>=e.blocks.length-1?P.AIR:e.blocks[i+1],l=i===0?P.AIR:e.blocks[i-1],c=a===P.AIR||!o&&a===P.WATER,u=l===P.AIR||!o&&l===P.WATER;if(o&&a!==P.AIR)continue;const h=this.hasExposedSide(e,i);if(!o&&!c&&!u&&!h)continue;let d=this.depthToRadius(i),f=d-this.BLOCK_HEIGHT;if(o&&(d-=N.WATER_SURFACE_OFFSET,f-=N.WATER_SURFACE_OFFSET),f<=0)continue;const p=n-i,g=.8,x=.05;let m=1;p>0&&(m=Math.max(x,Math.pow(g,p)));const{top:y,bottom:_,sides:C}=this.meshBuilder.createSeparateGeometries(e.tile,f,d,new R(0,0,0),o?!0:c,o?!1:u,o?!1:h);if(y){const b=y.getAttribute("position"),S=y.getAttribute("normal"),A=y.getAttribute("uv"),L=y.getIndex();if(b&&S&&A&&L){const E=this.getBlockTopMaterialKey(s),T=o?1:m;this.mergeGeometry(t[E],b,S,A,L,this.sunDirection,T)}y.dispose()}if(_&&!o){const b=_.getAttribute("position"),S=_.getAttribute("normal"),A=_.getAttribute("uv"),L=_.getIndex();if(b&&S&&A&&L){const E=Math.max(x,m*g),T=this.getBlockBottomMaterialKey(s);this.mergeGeometry(t[T],b,S,A,L,this.sunDirection,E)}_.dispose()}if(C){const b=C.getAttribute("position"),S=C.getAttribute("normal"),A=C.getAttribute("uv"),L=C.getIndex();if(b&&S&&A&&L){const E=this.getBlockSideMaterialKey(s);this.mergeGeometry(t[E],b,S,A,L,this.sunDirection,m)}C.dispose()}o&&this.buildWaterSideFaces(e,i,f,d,t.water)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e);for(const t of this.distantLODMaterials)t.uniforms.sunDirection.value.copy(e)}setTorchData(e){this.torchData=e.map(t=>({position:{x:t.position.x-this.center.x,y:t.position.y-this.center.y,z:t.position.z-this.center.z},range:t.range,intensity:t.intensity})),this.rebuildDistantLODMeshes()}setTilesWithTorches(e){this.tilesWithTorches=e}markTilesNearTorchDirty(e,t){const n=this.getTileAtPoint(e);if(!n)return;const i=this.columns.get(n.index);if(i&&this.cachedNearbyTiles.has(n.index)){i.isDirty=!0,this.queueDirtyColumnRebuild(n.index);for(const s of i.tile.neighbors){const o=this.columns.get(s);o&&this.cachedNearbyTiles.has(s)&&(o.isDirty=!0,this.queueDirtyColumnRebuild(s))}}}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}setWaterMeshCallback(e){this.waterMeshCallback=e,this.currentWaterMesh&&e(this.currentWaterMesh,!0)}getTilesInRange(e,t){const n=new Set,i=new Set,s=[{index:e,distance:0}];let o=0;for(;o<s.length;){const a=s[o++];if(!i.has(a.index)&&(i.add(a.index),a.distance<=t)){n.add(a.index);const l=this.polyhedron.tiles[a.index];for(const c of l.neighbors)i.has(c)||s.push({index:c,distance:a.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Ae&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,s,o,a=1){for(let l=0;l<t.count;l++){const c=t.getX(l),u=t.getY(l),h=t.getZ(l),d=n.getX(l),f=n.getY(l),p=n.getZ(l);e.positions.push(c,u,h),e.normals.push(d,f,p),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(a),e.torchLight.push(this.calculateTorchLightAtPosition(c,u,h));{const g=Math.sqrt(c*c+u*u+h*h);let x=1;if(g>0){const m=c/g,y=u/g,_=h/g,C=m*o.x+y*o.y+_*o.z;x=Math.max(.2,C*.5+.5)}e.colors.push(x,x,x)}}for(let l=0;l<s.count;l++)e.indices.push(s.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}calculateTorchLightAtPosition(e,t,n){let i=0;for(const s of this.torchData){const o=e-s.position.x,a=t-s.position.y,l=n-s.position.z,c=Math.sqrt(o*o+a*a+l*l);if(c<s.range){const u=1/(1+2*c*c/(s.range*s.range));i+=u*s.intensity}}return Math.min(i,1.5)}createBufferGeometry(e){const t=new pt;if(t.setAttribute("position",new Ue(e.positions,3)),t.setAttribute("normal",new Ue(e.normals,3)),t.setAttribute("uv",new Ue(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new Ue(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new Ue(e.skyLight,1)),e.torchLight&&e.torchLight.length>0)t.setAttribute("torchLight",new Ue(e.torchLight,1));else{const n=e.positions.length/3;t.setAttribute("torchLight",new Ue(new Float32Array(n).fill(0),1))}return t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const s of e.tile.neighbors){const o=this.columns.get(s);if(o&&t<o.blocks.length){const a=o.blocks[t];if(i&&(a===P.AIR||a===P.WATER)||n===P.WATER&&a===P.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,s){const o=e.tile,a=o.vertices.length,l=.001;for(let c=0;c<a;c++){const u=(c+1)%a,h=o.vertices[c],d=o.vertices[u];let f;for(const G of o.neighbors){const z=this.columns.get(G);if(!z)continue;const X=z.tile;let V=!1,Q=!1;for(const q of X.vertices)q.distanceTo(h)<l&&(V=!0),q.distanceTo(d)<l&&(Q=!0);if(V&&Q){f=z;break}}if(!f||f.blocks[t]!==P.AIR)continue;let p=0;for(let G=t-1;G>=0;G--){const z=e.blocks[G];if(z!==P.AIR&&z!==P.WATER){p=G;break}}let g=0;for(let G=t-1;G>=0;G--){const z=f.blocks[G];if(z!==P.AIR&&z!==P.WATER){g=G;break}}const x=Math.max(p,g),m=i,y=this.depthToRadius(x);if(y>=m)continue;const _=h.clone().normalize(),C=d.clone().normalize(),b=_.clone().multiplyScalar(m),S=C.clone().multiplyScalar(m),A=_.clone().multiplyScalar(y),L=C.clone().multiplyScalar(y),E=L.clone().sub(A),T=b.clone().sub(A),I=E.clone().cross(T).normalize(),F=s.vertexOffset;s.positions.push(A.x,A.y,A.z,L.x,L.y,L.z,S.x,S.y,S.z,b.x,b.y,b.z);for(let G=0;G<4;G++)s.normals.push(I.x,I.y,I.z);s.uvs.push(0,0,1,0,1,1,0,1),s.skyLight.push(1,1,1,1),s.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),s.indices.push(F,F+1,F+2,F,F+2,F+3),s.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?P.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const s=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const a of i.tile.neighbors){const l=this.columns.get(a);l&&(l.isDirty=!0)}let o=0;for(let a=0;a<i.blocks.length;a++)if(i.blocks[a]!==P.AIR&&i.blocks[a]!==P.WATER){o=a;break}t<=o+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const a of i.tile.neighbors)this.cachedNearbyTiles.has(a)&&this.queueDirtyColumnRebuild(a);this.meshBuilder.isSolid(s)&&n===P.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0||this.isWorkerBuildActive||this.geometryWorker&&(console.log("[needsRebatch=true] rebuildDirtyColumns"),this.needsRebatch=!0,this.dirtyColumnsQueue.clear())}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=dl(),t=this.getSeaLevelDepth(),n=this.depthToRadius(t)-N.WATER_SURFACE_OFFSET;for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(!s)continue;const o=s.tile;for(let a=0;a<o.vertices.length;a++){const l=(a+1)%o.vertices.length,c=o.vertices[a],u=o.vertices[l],h=c.clone().add(u).normalize();let d,f=1/0;for(const I of o.neighbors){const F=this.columns.get(I);if(!F)continue;const G=F.tile.center.clone().normalize().distanceToSquared(h);G<f&&(f=G,d=I)}if(d===void 0||this.cachedNearbyTiles.has(d))continue;let p=!1,g=0;for(let I=s.blocks.length-1;I>=0;I--){const F=s.blocks[I];if(F===P.WATER)p=!0;else if(F!==P.AIR){g=I;break}}if(!p||g>=t)continue;const m=this.depthToRadius(g),y=n;if(m>=y)continue;const _=c.clone().normalize().multiplyScalar(m),C=u.clone().normalize().multiplyScalar(m),b=u.clone().normalize().multiplyScalar(y),S=c.clone().normalize().multiplyScalar(y),A=C.clone().sub(_),L=S.clone().sub(_),E=A.clone().cross(L).normalize(),T=e.vertexOffset;e.positions.push(_.x,_.y,_.z,C.x,C.y,C.z,b.x,b.y,b.z,S.x,S.y,S.z);for(let I=0;I<4;I++)e.normals.push(E.x,E.y,E.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(T,T+1,T+2),e.indices.push(T,T+2,T+3),e.vertexOffset+=4}}if(e.positions.length>0){const i=this.createBufferGeometry(e),s=this.meshBuilder.getSeaWallMaterial();if(s){const o=new Ae(i,s);o.renderOrder=2,this.batchedMeshGroup.add(o)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t<n.blocks.length-1&&n.blocks[t+1]===P.WATER&&(i=!0);for(const s of n.tile.neighbors){const o=this.columns.get(s);o&&o.blocks[t]===P.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],s=[],o=500;for(;i.length>0;){const{tileIndex:h,depth:d}=i.shift(),f=`${h}-${d}`;if(n.has(f))continue;if(n.add(f),n.size>o)return;const p=this.columns.get(h);if(!p||d<0||d>=p.blocks.length)continue;const g=p.blocks[d];if(!(g!==P.AIR&&g!==P.WATER)){if(s.push({tileIndex:h,depth:d,isWater:g===P.WATER}),d>0){const x=p.blocks[d-1];(x===P.AIR||x===P.WATER)&&i.push({tileIndex:h,depth:d-1})}if(d<p.blocks.length-1){const x=p.blocks[d+1];(x===P.AIR||x===P.WATER)&&i.push({tileIndex:h,depth:d+1})}for(const x of p.tile.neighbors){const m=this.columns.get(x);if(m){const y=m.blocks[d];(y===P.AIR||y===P.WATER)&&i.push({tileIndex:x,depth:d})}}}}const a=s.filter(h=>h.isWater).length;if(a===0)return;s.sort((h,d)=>h.depth-d.depth);let l=a;const c=[],u=[];for(const h of s)l>0?(c.push(h),l--):u.push(h);for(const h of c){const d=this.columns.get(h.tileIndex);if(d&&d.blocks[h.depth]===P.AIR){d.blocks[h.depth]=P.WATER,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const p=this.columns.get(f);p&&(p.isDirty=!0)}}}for(const h of u){const d=this.columns.get(h.tileIndex);if(d&&d.blocks[h.depth]===P.WATER){d.blocks[h.depth]=P.AIR,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const p=this.columns.get(f);p&&(p.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getDepthAtPoint(e){const t=e.distanceTo(this.center),n=Math.ceil(this.MAX_DEPTH-1-(this.radius-t)/this.BLOCK_HEIGHT);return Math.max(0,Math.min(this.MAX_DEPTH,n))}getCoordinatesAtPoint(e){const t=this.getDepthAtPoint(e),n=e.clone().sub(this.center).normalize(),i=Math.asin(n.y)*(180/Math.PI),s=Math.atan2(n.z,n.x)*(180/Math.PI);return{lat:i,lon:s,depth:t}}getDirectionFromLatLon(e,t){const n=e*(Math.PI/180),i=t*(Math.PI/180),s=Math.sin(n),o=Math.cos(n),a=o*Math.cos(i),l=o*Math.sin(i);return new R(a,s,l).normalize()}getSpawnPositionAtLatLon(e,t,n=1){const i=this.getDirectionFromLatLon(e,t),s=this.getSurfaceHeightInDirection(i);return this.center.clone().add(i.multiplyScalar(s+n))}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=t.blocks.length-1;n>=0;n--)if(t.blocks[n]!==P.AIR&&t.blocks[n]!==P.WATER){const i=this.depthToRadius(n);return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s!==P.AIR&&s!==P.WATER)return this.depthToRadius(i)}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s===P.WATER)return!0;if(s!==P.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getTileNeighbors(e){const t=this.polyhedron.tiles[e];return t?t.neighbors:[]}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getTileCenterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.center.clone().add(this.center):null}getVisibleTileIndices(){return this.cachedNearbyTiles}isTileInDetailRange(e){return this.cachedNearbyTiles.has(e)}getTileChunkIndex(e){return this.tileToChunk.get(e)??-1}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;const i=this.getDepthAtPoint(e);return i>=0&&i<n.blocks.length?n.blocks[i]===P.WATER:!1}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);if(i>=0&&i<n.blocks.length&&n.blocks[i]!==P.WATER)return 0;let s=-1;for(let o=n.blocks.length-1;o>=0;o--)if(n.blocks[o]===P.WATER){s=o;break}return s<0?0:i<=s?(s-i)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let s=n.blocks.length-1;s>=0;s--)if(n.blocks[s]===P.WATER){i=s;break}return i<0?-1:this.depthToRadius(i)}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const o=t.clone().normalize(),a=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,u=l,h=this.getDepthAtPoint(e);for(let d=0;d<n;d+=.2){a.copy(e).addScaledVector(o,d);const f=this.polyhedron.getTileAtPointFromHint(a.clone().sub(this.center),c),p=this.getDepthAtPoint(a);if(p<0||p>=this.MAX_DEPTH){u=c,h=p,c=f;continue}const g=this.getBlock(f.index,p);if(g===P.AIR){u=f,h=p,c=f;continue}if(g===P.WATER&&!i){u=f,h=p,c=f;continue}const x=a.clone().sub(this.center).normalize();return{tileIndex:f.index,depth:p,blockType:g,point:a.clone(),normal:x,prevTileIndex:u.index,prevDepth:h}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=N.PLANET_LOD_DISTANCE_3?2:e>=N.PLANET_LOD_DISTANCE_2?1:e>=N.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}isInOrbitView(){return this.currentDistantLODLevel>=0}isIncrementalActive(){return this.isIncrementalRebuildActive}getNeedsRebatch(){return this.needsRebatch}}function pl(r,e=3e3){const t=document.getElementById("transition-toast");t&&t.remove();const n=document.createElement("div");n.id="transition-toast",n.textContent=r,n.style.cssText=`
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #4CAF50;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Jersey 10', monospace;
    font-size: 24px;
    border: 2px solid #4CAF50;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `,document.body.appendChild(n),requestAnimationFrame(()=>{n.style.opacity="1"}),setTimeout(()=>{n.style.opacity="0",setTimeout(()=>n.remove(),300)},e)}const rt=N.TERRAIN_SEA_LEVEL+N.TERRAIN_MAX_DEPTH;let zs=new Map,ml=null;function bt(r,e,t){r!==ml&&(zs.clear(),ml=r);let n=zs.get(e);if(!n){n=new Array(rt);for(let i=0;i<rt;i++)n[i]=r.getBlock(e,i);zs.set(e,n)}return t>=0&&t<rt?n[t]:P.AIR}function Ym(){zs.clear()}function Wi(r,e,t){let n=-1,i=1/0;for(let s=0;s<rt;s++){const o=s<rt-1?bt(r,e,s+1):P.AIR,a=bt(r,e,s),l=o===P.AIR||o===P.WATER,c=a!==P.AIR&&a!==P.WATER;if(l&&c){const u=r.depthToRadius(s),h=Math.abs(u-t);h<i&&(i=h,n=s)}}return n}class Km{constructor(e,t,n){v(this,"camera");v(this,"position");v(this,"velocity");v(this,"inputManager");v(this,"planets",[]);v(this,"currentPlanet",null);v(this,"localUp",new R(0,1,0));v(this,"localForward",new R(0,0,-1));v(this,"localRight",new R(1,0,0));v(this,"orientation",new Ze);v(this,"isInSpace",!1);v(this,"surfacePitch",0);v(this,"surfaceForward",new R(0,0,-1));v(this,"transitionTimer",0);v(this,"isGrounded",!1);v(this,"isJetpacking",!1);v(this,"isInWater",!1);v(this,"feetInWater",!1);v(this,"isFloatingAtSurface",!1);v(this,"hasDoubleJumped",!1);v(this,"jetpackEnabled",!0);v(this,"lastPosition",new R);v(this,"stuckFrameCount",0);v(this,"wasdActiveFrames",0);v(this,"lastStuckLogTime",0);v(this,"jumpStartPosition",null);v(this,"jumpStartSpherical",null);v(this,"wasdPressedDuringJump",!1);v(this,"jumpDirection",null);v(this,"didJumpThisFrame",!1);v(this,"getTechBlockDataCallback",null);v(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new R,this.position=n.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,1),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new ft;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new ft().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new R(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new R().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new R().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),s=Math.atan2(n.x,n.z),o=Math.acos(n.y/i);return{theta:s,phi:o,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}checkEdgeNudge(){if(!this.currentPlanet)return;const e=this.currentPlanet.getTileAtPoint(this.position);if(!e)return;const t=new R(e.center.x+this.currentPlanet.center.x,e.center.y+this.currentPlanet.center.y,e.center.z+this.currentPlanet.center.z),n=this.position.distanceTo(this.currentPlanet.center);let i=-1,s=1/0;for(let d=0;d<rt-1;d++){const f=d<rt-1?bt(this.currentPlanet,e.index,d+1):P.AIR,p=bt(this.currentPlanet,e.index,d),g=f===P.AIR||f===P.WATER,x=p!==P.AIR&&p!==P.WATER;if(g&&x){const m=this.currentPlanet.depthToRadius(d),y=Math.abs(m-n);m<=n+.5&&y<s&&(i=d,s=y)}}if(i<0)return;const o=this.currentPlanet.depthToRadius(i),a=e.neighbors;if(!a||a.length===0)return;const l=this.currentPlanet.getSurfaceNormal(this.position),c=this.position.clone().sub(l.clone().multiplyScalar(this.position.dot(l)-t.dot(l)));let u=!1;const h=new R;for(const d of a){const f=this.currentPlanet.getTileByIndex(d);if(!f)continue;let p=-1,g=1/0;for(let L=0;L<rt-1;L++){const E=L<rt-1?bt(this.currentPlanet,d,L+1):P.AIR,T=bt(this.currentPlanet,d,L),I=E===P.AIR||E===P.WATER,F=T!==P.AIR&&T!==P.WATER;if(I&&F){const G=this.currentPlanet.depthToRadius(L),z=Math.abs(G-n);G<=n+.5&&z<g&&(p=L,g=z)}}if(p<0||this.currentPlanet.depthToRadius(p)-o<=N.AUTO_STEP_HEIGHT)continue;const y=new R(f.center.x+this.currentPlanet.center.x,f.center.y+this.currentPlanet.center.y,f.center.z+this.currentPlanet.center.z),C=y.clone().sub(l.clone().multiplyScalar(y.dot(l)-t.dot(l))).clone().sub(t).normalize(),S=c.clone().sub(t).dot(C),A=t.distanceTo(y)*.45;S>A-N.PLAYER_RADIUS*2&&(u=!0,h.sub(C))}if(u&&h.lengthSq()>1e-4){h.normalize();const f=h.multiplyScalar(.075),p=f.clone().sub(l.clone().multiplyScalar(f.dot(l)));this.position.add(p);const g=this.currentPlanet.getSurfaceNormal(this.position);this.position.copy(this.currentPlanet.center).addScaledVector(g,n)}}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const s=this.position.distanceTo(i.planet.center),o=s-i.planet.radius,a=i.gravityFullRadius??i.planet.radius*N.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*N.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(s<l){let u=0;if(s<=a)u=1;else{const h=l-a,d=s-a;u=1-Math.min(1,d/h)}u*=c,u>t&&(t=u,e=i.planet,n=o)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(Ym(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),s=this.isInSpace;this.isInSpace=i===0;const o=a=>{const l=new en().setFromQuaternion(this.orientation,"YXZ"),c=(l.x*180/Math.PI).toFixed(1),u=(l.y*180/Math.PI).toFixed(1),h=(l.z*180/Math.PI).toFixed(1);console.log(`[${a}] pitch: ${c}° yaw: ${u}° roll: ${h}° | surfacePitch: ${(this.surfacePitch*180/Math.PI).toFixed(1)}°`)};if(s&&!this.isInSpace&&n&&(o("ENTERING ATMOSPHERE - BEFORE"),pl("Entering Atmosphere",3e3),this.transitionTimer=N.ROLL_SLERP_DURATION,this.currentPlanet=n,o("ENTERING ATMOSPHERE - AFTER")),!s&&this.isInSpace&&(o("ENTERING SPACE - BEFORE"),pl("Entering Space",3e3),this.transitionTimer=0,this.updateOrientationFromLocal(),o("ENTERING SPACE - AFTER")),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{if(this.transitionTimer>0){this.handleTransitionMouseLook(t,e),this.slerpRollToLevel(e);const l=new en().setFromQuaternion(this.orientation,"YXZ"),c=(l.z*180/Math.PI).toFixed(1),u=(l.x*180/Math.PI).toFixed(1);console.log(`[TRANSITIONING] timer: ${this.transitionTimer.toFixed(2)}s | roll: ${c}° pitch: ${u}°`),this.transitionTimer-=e,this.transitionTimer<=0&&(this.syncSurfaceStateFromOrientation(),console.log("[TRANSITION COMPLETE] Synced surfaceForward from orientation"))}else this.handleSpaceMouseLook(t,e);const a=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const l=this.position.distanceTo(this.currentPlanet.center),c=l-a;if(c>.5){const u=this.currentPlanet.getTileAtPoint(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${a.toFixed(2)} -> ${l.toFixed(2)} (+${c.toFixed(2)})`),console.error(`Current tile: ${u==null?void 0:u.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),u){console.error("Block column at current tile:");for(let h=0;h<20;h++){const d=this.currentPlanet.getBlock(u.index,h),f=this.currentPlanet.depthToRadius(h);let p=d===0?".":d===4?"~":"#";const g=Math.abs(f-l)<1?" <-- PLAYER":"";console.error(`  d${h} (r${f}): ${p}${g}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+N.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPoint(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1,s=1/0;for(let l=0;l<rt-1;l++){const c=this.currentPlanet.getBlock(n.index,l),u=l<rt-1?this.currentPlanet.getBlock(n.index,l+1):P.AIR,h=c!==P.AIR&&c!==P.WATER,d=u===P.AIR||u===P.WATER;if(h&&d){const f=this.currentPlanet.depthToRadius(l),p=Math.abs(f-e);f<=e+.5&&p<s&&(i=l,s=p)}}const o=i>=0?this.currentPlanet.depthToRadius(i):0;console.log(`  Ground depth: ${i} (radius: ${o.toFixed(2)})`);const a=e-o;console.log(`  Player feet vs ground: ${a.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${a>N.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let l=0;l<8;l++){const c=this.currentPlanet.getBlock(n.index,l),u=P[c],h=this.currentPlanet.depthToRadius(l),d=h>e&&h<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${l}: ${u} (r=${h.toFixed(1)})${d}`)}console.log(`
Neighbor Tiles:`);for(const l of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[l])continue;let u=-1;for(let f=0;f<rt;f++){const p=this.currentPlanet.getBlock(l,f);if(p!==P.AIR&&p!==P.WATER){u=f;break}}const h=u>=0?this.currentPlanet.depthToRadius(u):0,d=h-o;console.log(`  Neighbor ${l}: ground_r=${h.toFixed(1)}, heightDiff=${d.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+N.PLAYER_HEIGHT,s=Wi(this.currentPlanet,t.index,n),o=s>=0?this.currentPlanet.depthToRadius(s):0;console.log("========== Hex STRUCTURE (Shift+X) ==========");const a=this.currentPlanet.getSurfaceNormal(this.position),l=this.localForward.clone().negate(),c=l.dot(a),h=Math.asin(Math.max(-1,Math.min(1,c)))*180/Math.PI,d=l.clone().sub(a.clone().multiplyScalar(c)).normalize(),p=Math.atan2(d.dot(this.localRight),-d.dot(this.localForward.clone().sub(a.clone().multiplyScalar(this.localForward.dot(a))).normalize()))*180/Math.PI;console.log(`Camera pitch: ${h.toFixed(2)}° (max: ±89°), yaw: ${p.toFixed(2)}°`),console.log(`lookDir: (${l.x.toFixed(3)}, ${l.y.toFixed(3)}, ${l.z.toFixed(3)})`),console.log(`planetUp: (${a.x.toFixed(3)}, ${a.y.toFixed(3)}, ${a.z.toFixed(3)})`),console.log(`localUp: (${this.localUp.x.toFixed(3)}, ${this.localUp.y.toFixed(3)}, ${this.localUp.z.toFixed(3)})`),console.log(`localUp·planetUp: ${this.localUp.dot(a).toFixed(3)} (should be ~1.0)`),console.log(""),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${s} (radius: ${o.toFixed(2)})`),console.log(`isGrounded: ${this.isGrounded}, velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`),console.log(`Planet radius: ${this.currentPlanet.radius}`);const g=this.currentPlanet.isTileInDetailRange(t.index),x=this.currentPlanet.getTileChunkIndex(t.index);console.log(`Terrain type: ${g?"DETAILED":"LOD"} (chunk ${x})`),console.log("");const m=N.DEBUG_CAVE_TILE_RINGS,y=N.DEBUG_CAVE_DEPTH_ROWS,_=new Set([t.index]);let C=new Set([t.index]);for(let ve=0;ve<m;ve++){const Me=new Set;for(const Ge of C){const j=this.currentPlanet.getPolyhedron().tiles[Ge];if(j)for(const J of j.neighbors)_.has(J)||(_.add(J),Me.add(J))}C=Me}let b=0;for(let ve=0;ve<rt;ve++)if(this.currentPlanet.depthToRadius(ve)>=n){b=ve;break}const S=Math.floor(y/2),A=Math.max(0,b-S),L=Math.min(rt-1,b+S);console.log(`Sampling ${_.size} tiles, depths ${A} to ${L}`),console.log("Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, P = PIPE, @ = PLAYER BODY OVERLAP"),console.log("(Higher depths = closer to sky, displayed at top)"),console.log("");const E=Array.from(_),T=["Depth/Radius"].concat(E.map(ve=>`T${ve}`));console.log(T.join("	"));const I=this.getTechBlockDataCallback?this.getTechBlockDataCallback(E):null,F=new Set;if(I)for(const ve of I.copperPipes)F.add(`${ve.tileIndex}-${ve.depth}`);for(let ve=L;ve>=A;ve--){const Me=this.currentPlanet.depthToRadius(ve),Ge=Me-1,j=Me>n&&Ge<i,J=[`d${ve} (r${Me.toFixed(0)})`];for(const ue of E){const ae=this.currentPlanet.getBlock(ue,ve);let le="?";F.has(`${ue}-${ve}`)?le="P":ae===P.AIR?le=".":ae===P.WATER?le="~":ae===P.SAND?le="S":ae===P.GRASS?le="G":le="#",j&&ue===t.index&&(le=le==="."?"@":le.toUpperCase()),J.push(le)}console.log(J.join("	"))}console.log(""),I&&(I.torches.length>0||I.furnaces.length>0||I.steamEngines.length>0||I.hydroGenerators.length>0||I.copperPipes.length>0)&&(console.log("=== Tech Blocks in Area ==="),I.torches.length>0&&console.log(`Torches: ${I.torches.map(Me=>`T${Me.tileIndex}`).join(", ")}`),I.furnaces.length>0&&console.log(`Furnaces: ${I.furnaces.map(Me=>`T${Me.tileIndex}`).join(", ")}`),I.steamEngines.length>0&&console.log(`Steam Engines: ${I.steamEngines.map(Me=>`T${Me.tileIndex}`).join(", ")}`),I.hydroGenerators.length>0&&console.log(`Hydro Generators: ${I.hydroGenerators.map(Me=>`T${Me.tileIndex}`).join(", ")}`),I.copperPipes.length>0&&console.log(`Copper Pipes: ${I.copperPipes.map(Me=>`T${Me.tileIndex}@d${Me.depth}`).join(", ")}`),console.log(""));const G=this.currentPlanet.depthToRadius(s);console.log(`Current ground depth: ${s} (r${G.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const z=this.currentPlanet.getPolyhedron().tiles[t.index];if(z)for(const ve of z.neighbors){const Me=this.currentPlanet.getPolyhedron().tiles[ve];if(!Me)continue;const Ge=[];for(let le=0;le<rt-1;le++){const we=le<rt-1?this.currentPlanet.getBlock(ve,le+1):P.AIR,st=this.currentPlanet.getBlock(ve,le),ke=we===P.AIR||we===P.WATER,tt=st!==P.AIR&&st!==P.WATER;ke&&tt&&Ge.push(le)}const j=new R(Me.center.x,Me.center.y,Me.center.z).normalize().multiplyScalar(this.currentPlanet.radius),J=this.checkStepHeight(j),ue=this.checkHeadroomCollision(j),ae=this.checkWallCollision(j);console.log(`  T${ve}: floors=[${Ge.join(",")}] step=${J} headroom=${ue} wall=${ae}`)}const X=this.localForward.clone().negate(),V=this.position.clone().addScaledVector(X,.5),Q=this.currentPlanet.getTileAtPoint(V);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${X.x.toFixed(2)}, ${X.y.toFixed(2)}, ${X.z.toFixed(2)})`),console.log(`  Test position tile: ${Q?Q.index:"none"} (same=${(Q==null?void 0:Q.index)===t.index})`);const q=this.checkCollision(V),ee=this.checkStepHeight(V),te=this.checkHeadroomCollision(V),pe=this.checkWallCollision(V);console.log(`  checkCollision: ${q}, step=${ee}, headroom=${te}, wall=${pe}`);const Pe=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(X,2));if(Pe&&Pe.index!==t.index){console.log(`  Forward tile (2 units ahead): ${Pe.index}`);const ve=this.currentPlanet.getPolyhedron().tiles[Pe.index];if(ve){const Me=[];for(let ae=0;ae<rt-1;ae++){const le=ae<rt-1?this.currentPlanet.getBlock(Pe.index,ae+1):P.AIR,we=this.currentPlanet.getBlock(Pe.index,ae),st=le===P.AIR||le===P.WATER,ke=we!==P.AIR&&we!==P.WATER;st&&ke&&Me.push(ae)}const Ge=new R(ve.center.x,ve.center.y,ve.center.z).normalize().multiplyScalar(this.currentPlanet.radius),j=this.checkStepHeight(Ge),J=this.checkHeadroomCollision(Ge),ue=this.checkWallCollision(Ge);console.log(`  T${Pe.index} (center): floors=[${Me.join(",")}] step=${j} headroom=${J} wall=${ue}`)}}console.log("==============================================")}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const s=Math.min(1,N.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,s).normalize(),this.localRight=new R().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new R().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal()}handleTransitionMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=N.INVERT_Y_AXIS?-1:1,i=e.mouseY*N.MOUSE_SENSITIVITY*n,s=-e.mouseX*N.MOUSE_SENSITIVITY;if(this.currentPlanet){const a=this.currentPlanet.getSurfaceNormal(this.position),l=new Ze().setFromAxisAngle(a,s);this.orientation.premultiply(l)}const o=new Ze().setFromAxisAngle(this.localRight,i);this.orientation.premultiply(o),this.updateLocalFromOrientation()}syncSurfaceStateFromOrientation(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=new R(0,0,-1).applyQuaternion(this.orientation);this.surfaceForward.copy(t),this.surfaceForward.sub(e.clone().multiplyScalar(t.dot(e))),this.surfaceForward.lengthSq()<.001&&(this.surfaceForward.copy(this.localForward).negate(),this.surfaceForward.sub(e.clone().multiplyScalar(this.surfaceForward.dot(e)))),this.surfaceForward.normalize();const n=Math.asin(Math.max(-1,Math.min(1,t.dot(e))));this.surfacePitch=n}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=N.INVERT_Y_AXIS?-1:1;let i=e.mouseY*N.MOUSE_SENSITIVITY*n;const s=-e.mouseX*N.MOUSE_SENSITIVITY;if(!this.isInSpace&&this.currentPlanet){const o=this.currentPlanet.getSurfaceNormal(this.position),a=89.9*Math.PI/180;this.surfacePitch=(this.surfacePitch||0)+i,this.surfacePitch=Math.max(-a,Math.min(a,this.surfacePitch));let l=this.surfaceForward.clone();if(l.sub(o.clone().multiplyScalar(l.dot(o))),l.lengthSq()<.001&&(l=new R(0,0,-1),l.sub(o.clone().multiplyScalar(l.dot(o))),l.lengthSq()<.001&&(l=new R(1,0,0),l.sub(o.clone().multiplyScalar(l.dot(o))))),l.normalize(),s!==0){const x=new Ze().setFromAxisAngle(o,s);l.applyQuaternion(x)}this.surfaceForward.copy(l);const c=new R().crossVectors(o,l).normalize(),u=new Ze().setFromAxisAngle(c,-this.surfacePitch),h=l.clone().applyQuaternion(u),d=o.clone().applyQuaternion(u),f=new R(0,0,0),p=h.clone(),g=new ft().lookAt(f,p,d);this.orientation.setFromRotationMatrix(g)}else{const o=new Ze().setFromAxisAngle(this.localUp,s);this.orientation.premultiply(o);const a=new Ze().setFromAxisAngle(this.localRight,i);this.orientation.premultiply(a)}this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=N.ROLL_SPEED*t),e.rollRight&&(n-=N.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),s=new Ze().setFromAxisAngle(i,n);this.orientation.premultiply(s),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new R,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const s=e.sprint?N.SPRINT_SPEED:N.SPACE_THRUST;this.velocity.addScaledVector(n,s*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,N.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const s=this.position.clone().addScaledVector(n,N.WATER_BODY_CHECK_HEIGHT),o=this.currentPlanet.isInWater(s);this.feetInWater=this.currentPlanet.isInWater(this.position);const a=new R;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new R().crossVectors(l,n).normalize();if(e.forward&&a.add(l),e.backward&&a.sub(l),e.left&&a.sub(c),e.right&&a.add(c),a.lengthSq()>0){a.normalize();let d=e.sprint?N.SPRINT_SPEED:N.WALK_SPEED*N.WALK_SPEED_MULTIPLIER;o&&(d*=N.WATER_MOVEMENT_MULTIPLIER);const f=a.clone().multiplyScalar(d*t);this.resolveMovement(f)}const h=this.velocity.dot(n)>N.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!h){const d=this.currentPlanet.getWaterSurfaceRadius(this.position),f=this.position.distanceTo(this.currentPlanet.center),p=d+N.WATER_SURFACE_FLOAT_HEIGHT,g=f-p;if(d>0&&g<=.3)if(g>=-.1){this.isFloatingAtSurface=!0;const x=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(x))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,N.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(console.log(`Jump pressed! isGrounded=${this.isGrounded}, feetInWater=${this.feetInWater}`),this.isGrounded){const d=n,f=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(f));let p=N.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(p=N.JUMP_FORCE*N.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(d,p),console.log(`After jump: velocity=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)}), jumpForce=${p}`),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const g=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:g.theta,phi:g.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),s=this.position.clone().add(n);if(this.checkCollision(s)){const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}else{this.position.copy(s);const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPoint(this.position),n=this.currentPlanet.getTileAtPoint(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!0;const n=this.currentPlanet.getDepthAtPoint(this.position),i=this.currentPlanet.depthToRadius(n);let s=!1,o=!1;for(let a=0;a<rt-1;a++){const l=a<rt-1?bt(this.currentPlanet,t.index,a+1):P.AIR,c=bt(this.currentPlanet,t.index,a),u=l===P.AIR||l===P.WATER,h=c!==P.AIR&&c!==P.WATER;if(u&&h&&(s=!0,this.currentPlanet.depthToRadius(a)-i<=N.AUTO_STEP_HEIGHT)){o=!0;break}}return s?o:!0}checkWallCollision(e,t=!1){if(!this.currentPlanet)return!1;const n=this.currentPlanet.getTileAtPoint(e);if(!n)return!1;const i=this.currentPlanet.getTileAtPoint(this.position),s=i?i.index:-1;let o,a;if(this.isGrounded){const f=this.position.distanceTo(this.currentPlanet.center),p=this.currentPlanet.getTileAtPoint(this.position);let g=-1;if(p&&(g=Wi(this.currentPlanet,p.index,f)),g<0)o=e.distanceTo(this.currentPlanet.center),a=o+N.PLAYER_HEIGHT;else{const x=this.currentPlanet.depthToRadius(g);let m=-1,y=1/0;for(let _=0;_<rt-1;_++){const C=_<rt-1?bt(this.currentPlanet,n.index,_+1):P.AIR,b=bt(this.currentPlanet,n.index,_),S=C===P.AIR||C===P.WATER,A=b!==P.AIR&&b!==P.WATER;if(S&&A){const E=this.currentPlanet.depthToRadius(_)-x;E<=N.AUTO_STEP_HEIGHT&&Math.abs(E)<Math.abs(y)&&(m=_,y=E)}}if(m>=0){const _=this.currentPlanet.depthToRadius(m);o=_,a=_+N.PLAYER_HEIGHT}else o=e.distanceTo(this.currentPlanet.center),a=o+N.PLAYER_HEIGHT}}else o=e.distanceTo(this.currentPlanet.center),a=o+N.PLAYER_HEIGHT;const l=this.currentPlanet.getSurfaceNormal(e),c=[n.index];if(!t){const f=this.currentPlanet.getPolyhedron().tiles[n.index];if(f)for(const p of f.neighbors){const g=this.currentPlanet.getPolyhedron().tiles[p];if(g){const m=new R(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),y=m.dot(l);m.clone().sub(l.clone().multiplyScalar(y)).length()<N.PLAYER_RADIUS+1&&c.push(p)}}}const u=this.currentPlanet.radius*.02;let h=o;if(i){const f=Wi(this.currentPlanet,s,this.position.distanceTo(this.currentPlanet.center));f>=0&&(h=this.currentPlanet.depthToRadius(f))}const d=Math.max(h,o)+N.AUTO_STEP_HEIGHT;for(const f of c){if(f===s)continue;const p=this.currentPlanet.getPolyhedron().tiles[f];if(!p)continue;let g=-1;for(let b=rt-2;b>=0;b--){const S=bt(this.currentPlanet,f,b+1),A=bt(this.currentPlanet,f,b);if((S===P.AIR||S===P.WATER)&&A!==P.AIR&&A!==P.WATER){g=b;break}}if(g>=0&&this.currentPlanet.depthToRadius(g)<=d)continue;const m=new R(p.center.x,p.center.y,p.center.z).add(this.currentPlanet.center).clone().sub(e),y=m.dot(l),_=m.clone().sub(l.clone().multiplyScalar(y)).length(),C=Math.max(0,_-u);for(let b=0;b<rt;b++){const S=bt(this.currentPlanet,f,b);if(S===P.AIR||S===P.WATER)continue;const A=this.currentPlanet.depthToRadius(b),L=A-1;if(A<=d)continue;if(L<a&&A>o){const T=Math.abs(A-o)<.1;if(this.isGrounded&&f===n.index&&T)continue;if(C<N.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;if(i&&(s=Wi(this.currentPlanet,i.index,n)),s<0)return!1;const o=this.currentPlanet.depthToRadius(s);let a=-1,l=1/0;for(let d=0;d<rt-1;d++){const f=d<rt-1?bt(this.currentPlanet,t.index,d+1):P.AIR,p=bt(this.currentPlanet,t.index,d),g=f===P.AIR||f===P.WATER,x=p!==P.AIR&&p!==P.WATER;if(g&&x){const y=this.currentPlanet.depthToRadius(d)-o;y<=N.AUTO_STEP_HEIGHT&&Math.abs(y)<Math.abs(l)&&(a=d,l=y)}}if(a<0)return!1;const c=this.currentPlanet.depthToRadius(a),u=c,h=c+N.PLAYER_HEIGHT;for(let d=0;d<rt;d++){const f=bt(this.currentPlanet,t.index,d);if(f===P.AIR||f===P.WATER)continue;const p=this.currentPlanet.depthToRadius(d),g=p-1;if(p>u&&g<h){if(d===a)continue;return!0}}return!1}isPositionValid(e,t=!1){if(!this.currentPlanet)return!0;const n=this.currentPlanet.getSurfaceNormal(e),i=e.distanceTo(this.currentPlanet.center),s=this.currentPlanet.getTileAtPoint(e);if(s){let l=-1;for(let c=0;c<rt;c++){const u=bt(this.currentPlanet,s.index,c);if(u!==P.AIR&&u!==P.WATER){l=c;break}}if(l>=0){const c=this.currentPlanet.depthToRadius(l)-1;if(i<c)return console.log(`isPositionValid BLOCKED by floor: feetR=${i.toFixed(2)}, floorR=${c.toFixed(2)}, floorD=${l}`),!1}}const o=[.1,N.PLAYER_HEIGHT*.5,N.PLAYER_HEIGHT],a=s;for(const l of o){const c=i+l;let u,h;if(t&&a){u=a;for(let f=0;f<rt;f++){const p=this.currentPlanet.depthToRadius(f);if(c<=p){h=f;break}}h=h??rt-1}else{const f=this.currentPlanet.center.clone().add(n.clone().multiplyScalar(c));if(u=this.currentPlanet.getTileAtPoint(f),!u)continue;h=this.currentPlanet.getDepthAtPoint(f)}if(h<0||h>=rt)continue;const d=bt(this.currentPlanet,u.index,h);if(d!==P.AIR&&d!==P.WATER){const f=this.currentPlanet.depthToRadius(h);if(c<f)return console.log(`isPositionValid BLOCKED: offset=${l.toFixed(2)}, checkR=${c.toFixed(2)}, depth=${h}, blockTopR=${f.toFixed(2)}, block=${d}, tile=${u.index}`),!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+N.PLAYER_HEIGHT,s=[];for(let f=0;f<rt;f++){const p=f<rt-1?bt(this.currentPlanet,t.index,f+1):P.AIR,g=bt(this.currentPlanet,t.index,f),x=p===P.AIR||p===P.WATER,m=g!==P.AIR&&g!==P.WATER;if(x&&m){const y=this.currentPlanet.depthToRadius(f);s.push({depth:f,radius:y})}}if(s.length===0)return;let o=s[0],a=Math.abs(n-o.radius);for(const f of s){const p=Math.abs(n-f.radius);p<a&&(a=p,o=f)}const l=o.radius,c=l+N.PLAYER_HEIGHT;let u=!0;for(let f=0;f<rt;f++){const p=bt(this.currentPlanet,t.index,f);if(p===P.AIR||p===P.WATER)continue;const g=this.currentPlanet.depthToRadius(f),x=g-1;if(f!==o.depth&&g>l&&x<c){u=!1;break}}if(!u)return;let h=!1;for(let f=0;f<rt;f++){const p=bt(this.currentPlanet,t.index,f);if(p===P.AIR||p===P.WATER)continue;const g=this.currentPlanet.depthToRadius(f),x=g-1;if(g>n&&x<i){if(Math.abs(g-n)<.2)continue;h=!0;break}}if(!h)return;const d=o.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,d),this.isInWater){const f=this.velocity.dot(e);f<0&&this.velocity.sub(e.clone().multiplyScalar(f))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,N.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;i&&(s=Wi(this.currentPlanet,i.index,n));const o=s>=0?this.currentPlanet.depthToRadius(s):0,a=o;if(s>=0&&n<=a+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,a),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const u=this.getGravityMultiplier();let h=N.BASE_GRAVITY*u;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?h=0:h*=N.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-N.WATER_DRAG*e)),h>0&&this.velocity.addScaledVector(c,h*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const f=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),p=f.distanceTo(this.currentPlanet.center),g=this.currentPlanet.getTileAtPoint(f);let x=-1,m=1/0;if(g)for(let S=0;S<rt-1;S++){const A=S<rt-1?bt(this.currentPlanet,g.index,S+1):P.AIR,L=bt(this.currentPlanet,g.index,S),E=A===P.AIR||A===P.WATER,T=L!==P.AIR&&L!==P.WATER;if(E&&T){const F=this.currentPlanet.depthToRadius(S)-o;F<=N.AUTO_STEP_HEIGHT&&Math.abs(F)<Math.abs(m)&&(x=S,m=F)}}const y=x>=0?this.currentPlanet.depthToRadius(x):0,_=y,C=y-o,b=!this.isInWater&&C>N.AUTO_STEP_HEIGHT;if(x>=0&&p<=_)if(b){const S=this.velocity.dot(t);S<0&&this.velocity.sub(t.clone().multiplyScalar(S)),this.velocity.multiplyScalar(.5)}else{const S=f.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(S,_);const A=this.velocity.dot(S);A<0&&this.velocity.sub(S.clone().multiplyScalar(A)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const S=this.isPositionValid(f),A=this.checkWallCollision(f);if(S&&!A)this.position.copy(f);else{const L=t.clone().multiplyScalar(this.velocity.dot(t)),E=this.velocity.clone().sub(L),T=L.clone().multiplyScalar(e),I=this.position.clone().add(T),F=this.velocity.dot(t)>0;let G;if(F){const z=this.isPositionValid(I,!0),X=this.checkWallCollision(I,!0);if(G=z&&!X,!G){const V=I.distanceTo(this.currentPlanet.center),Q=V+N.PLAYER_HEIGHT;console.log(`Jump blocked: posValid=${z}, wallBlock=${X}, newFeetR=${V.toFixed(2)}, newHeadR=${Q.toFixed(2)}`)}}else if(G=!this.checkWallCollision(I,!0),G){const z=this.currentPlanet.getTileAtPoint(I);if(z){const X=I.distanceTo(this.currentPlanet.center),V=this.currentPlanet.getDepthAtPoint(I);if(V>=0&&V<rt){const Q=bt(this.currentPlanet,z.index,V);if(Q!==P.AIR&&Q!==P.WATER){const q=this.currentPlanet.depthToRadius(V);X<q&&(G=!1)}}}}if(G)this.position.copy(I),F||this.checkEdgeNudge();else{const z=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(z))}if(E.lengthSq()>.001){const z=E.clone().multiplyScalar(e),X=this.position.clone().add(z);this.isPositionValid(X)&&!this.checkWallCollision(X)?this.position.copy(X):this.velocity.sub(E.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(N.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),s=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(s)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let s="";this.isInSpace?s=" [SPACE FLIGHT]":this.transitionTimer>0?s=" [ENTERING GRAVITY]":this.isJetpacking?s=" [JETPACK]":this.isGrounded||(s=" [AIRBORNE]");const o=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${o} | Grav: ${(i*100).toFixed(0)}%${s}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getCoordinatesAtPoint(this.position),i=n.lat>=0?"N":"S",s=n.lon>=0?"E":"W";t.textContent=`${Math.abs(n.lat).toFixed(1)}°${i} ${Math.abs(n.lon).toFixed(1)}°${s} D:${n.depth}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}setTechBlockDataCallback(e){this.getTechBlockDataCallback=e}exportForSave(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},orientation:{x:this.orientation.x,y:this.orientation.y,z:this.orientation.z,w:this.orientation.w},velocity:{x:this.velocity.x,y:this.velocity.y,z:this.velocity.z}}}importFromSave(e){this.position.set(e.position.x,e.position.y,e.position.z),this.orientation.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w),this.velocity.set(e.velocity.x,e.velocity.y,e.velocity.z),this.updateLocalFromOrientation()}}var k=(r=>(r[r.NONE=0]="NONE",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WOOD=4]="WOOD",r[r.LEAVES=5]="LEAVES",r[r.LOG=6]="LOG",r[r.SAND=7]="SAND",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.STICK=15]="STICK",r[r.COAL=16]="COAL",r[r.TORCH=17]="TORCH",r[r.FISHING_ROD=18]="FISHING_ROD",r[r.SNOW=19]="SNOW",r[r.ICE=20]="ICE",r[r.FURNACE=21]="FURNACE",r[r.INGOT_COPPER=22]="INGOT_COPPER",r[r.INGOT_IRON=23]="INGOT_IRON",r[r.INGOT_GOLD=24]="INGOT_GOLD",r[r.INGOT_ALUMINUM=25]="INGOT_ALUMINUM",r[r.STORAGE_CHEST=26]="STORAGE_CHEST",r[r.STEAM_ENGINE=27]="STEAM_ENGINE",r[r.HYDRO_GENERATOR=28]="HYDRO_GENERATOR",r[r.COPPER_PIPE=29]="COPPER_PIPE",r[r.ELECTRIC_FURNACE=30]="ELECTRIC_FURNACE",r[r.CABLE=31]="CABLE",r[r.INGOT_LITHIUM=32]="INGOT_LITHIUM",r[r.INGOT_COBALT=33]="INGOT_COBALT",r))(k||{});const at={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2},7:{name:"Sand",stackSize:64,texture:"/textures/sand.png",mineTime:.5},8:{name:"Coal Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_coal.png",mineTime:2},9:{name:"Copper Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_copper.png",mineTime:2},10:{name:"Iron Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_iron.png",mineTime:2.5},11:{name:"Gold Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_gold.png",mineTime:3},12:{name:"Lithium Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_lythium.png",mineTime:3},13:{name:"Aluminum Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_aluminum.png",mineTime:2},14:{name:"Cobalt Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_cobalt.png",mineTime:2.5},15:{name:"Stick",stackSize:64,texture:"/textures/sticks.png",mineTime:.3},16:{name:"Coal",stackSize:64,texture:"/textures/coal.png",mineTime:.3},17:{name:"Torch",stackSize:64,texture:"/textures/torch_sprite.png",mineTime:.3},18:{name:"Fishing Rod",stackSize:1,texture:"/textures/fishing_rod.png",mineTime:.3},19:{name:"Snow",stackSize:64,texture:"/textures/snow.png",mineTime:.5},20:{name:"Ice",stackSize:64,texture:"/textures/ice.png",mineTime:.5},21:{name:"Furnace",stackSize:8,texture:"/textures/technology/furnace_face.png",mineTime:2},22:{name:"Copper Ingot",stackSize:64,texture:"/textures/minerals/earth/copper.png",mineTime:.3},23:{name:"Iron Ingot",stackSize:64,texture:"/textures/minerals/earth/iron.png",mineTime:.3},24:{name:"Gold Ingot",stackSize:64,texture:"/textures/minerals/earth/gold.png",mineTime:.3},25:{name:"Aluminum Ingot",stackSize:64,texture:"/textures/minerals/earth/aluminum.png",mineTime:.3},26:{name:"Storage Chest",stackSize:8,texture:"/textures/technology/storage_face.png",mineTime:1.5},27:{name:"Steam Engine",stackSize:8,texture:"/textures/technology/steam_engine_face.png",mineTime:2.5},28:{name:"Hydro Generator",stackSize:8,texture:"/textures/technology/hydro_generator_face.png",mineTime:2.5},29:{name:"Copper Pipe",stackSize:64,texture:"/textures/technology/copper_pipe.png",mineTime:.5},30:{name:"Electric Furnace",stackSize:8,texture:"/textures/technology/electric_furnace_face.png",mineTime:2.5},31:{name:"Cable",stackSize:64,texture:"/textures/technology/cable.png",mineTime:.5},32:{name:"Lithium Ingot",stackSize:64,texture:"/textures/minerals/earth/lythium.png",mineTime:.3},33:{name:"Cobalt Ingot",stackSize:64,texture:"/textures/minerals/earth/cobalt.png",mineTime:.3}};class jm{constructor(){v(this,"slots");v(this,"selectedSlot",0);v(this,"hotbarSize",9);v(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=at[e];let i=t;for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===e&&o.quantity<n.stackSize){const a=Math.min(i,n.stackSize-o.quantity);o.quantity+=a,i-=a}}for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===0){const a=Math.min(i,n.stackSize);o.itemType=e,o.quantity=a,i-=a}}return i}setSlot(e,t,n){e<0||e>=this.totalSlots||(this.slots[e].itemType=t,this.slots[e].quantity=n,n<=0&&(this.slots[e].itemType=0,this.slots[e].quantity=0))}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let s=this.totalSlots-1;s>=0&&n>0;s--){const o=this.slots[s];if(o.itemType===e){const a=Math.min(n,o.quantity);o.quantity-=a,n-=a,i+=a,o.quantity===0&&(o.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}swapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n={...this.slots[e]};this.slots[e]={...this.slots[t]},this.slots[t]=n}getSlot(e){return e<0||e>=this.totalSlots?null:this.slots[e]}exportForSave(){return this.slots.map(e=>({itemType:e.itemType,quantity:e.quantity}))}importFromSave(e){for(let t=0;t<Math.min(e.length,this.totalSlots);t++)this.slots[t]={itemType:e[t].itemType,quantity:e[t].quantity}}}function jl(r,e=!1){const t=r[0].index!==null,n=new Set(Object.keys(r[0].attributes)),i=new Set(Object.keys(r[0].morphAttributes)),s={},o={},a=r[0].morphTargetsRelative,l=new pt;let c=0;for(let u=0;u<r.length;++u){const h=r[u];let d=0;if(t!==(h.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in h.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;s[f]===void 0&&(s[f]=[]),s[f].push(h.attributes[f]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". Make sure all geometries have the same number of attributes."),null;if(a!==h.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in h.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(h.morphAttributes[f])}if(e){let f;if(t)f=h.index.count;else if(h.attributes.position!==void 0)f=h.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,u),c+=f}}if(t){let u=0;const h=[];for(let d=0;d<r.length;++d){const f=r[d].index;for(let p=0;p<f.count;++p)h.push(f.getX(p)+u);u+=r[d].attributes.position.count}l.setIndex(h)}for(const u in s){const h=gl(s[u]);if(!h)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" attribute."),null;l.setAttribute(u,h)}for(const u in o){const h=o[u][0].length;if(h===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[u]=[];for(let d=0;d<h;++d){const f=[];for(let g=0;g<o[u].length;++g)f.push(o[u][g][d]);const p=gl(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" morphAttribute."),null;l.morphAttributes[u].push(p)}}return l}function gl(r){let e,t,n,i=-1,s=0;for(let c=0;c<r.length;++c){const u=r[c];if(e===void 0&&(e=u.array.constructor),e!==u.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=u.itemSize),t!==u.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=u.normalized),n!==u.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=u.gpuType),i!==u.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;s+=u.count*t}const o=new e(s),a=new Tt(o,t,n);let l=0;for(let c=0;c<r.length;++c){const u=r[c];if(u.isInterleavedBufferAttribute){const h=l/t;for(let d=0,f=u.count;d<f;d++)for(let p=0;p<t;p++){const g=u.getComponent(d,p);a.setComponent(d+h,p,g)}}else o.set(u.array,l);l+=u.count*t}return i!==void 0&&(a.gpuType=i),a}var Jm=`uniform float time;\r
uniform float flickerAmount;

attribute float animWeight; 

varying vec3 vColor;

void main() {\r
  vColor = color;

  
  float t = time;\r
  float flicker = sin(t) * sin(t * 2.3) * sin(t * 0.7);

  
  vec3 animatedPosition = position;

  if (animWeight > 0.0) {\r
    
    
    float flameBaseY = 0.5;

    
    
    float heightAboveBase = position.y - flameBaseY;\r
    float scaleY = 1.0 + flicker * flickerAmount * animWeight;

    
    animatedPosition.y = flameBaseY + heightAboveBase * scaleY;

    
    float heightFactor = max(0.0, heightAboveBase * 4.0); 
    animatedPosition.x += sin(t * 1.7) * 0.008 * heightFactor * animWeight;\r
    animatedPosition.z += cos(t * 1.3) * 0.008 * heightFactor * animWeight;\r
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);\r
}`,Zm=`varying vec3 vColor;

void main() {\r
  gl_FragColor = vec4(vColor, 1.0);\r
}`;const Qe={LIGHT_COLOR:16755268,get LIGHT_INTENSITY(){return N.TORCH_LIGHT_INTENSITY},get LIGHT_RANGE(){return N.TORCH_LIGHT_RANGE},LIGHT_DECAY:2,get FLICKER_SPEED(){return N.TORCH_FLICKER_SPEED},get FLICKER_AMOUNT(){return N.TORCH_FLICKER_AMOUNT},HANDLE_HEIGHT:.4,HANDLE_RADIUS:.03,HEAD_RADIUS:.06,HEAD_HEIGHT:.1,FLAME_HEIGHT:.15,FLAME_RADIUS:.05,HELD_OFFSET:new R(.25,-.2,-.4),HELD_ROTATION:new en(-.3,.2,.1)};let Yi=null;function Qm(){return Yi||(Yi=new qe({uniforms:{time:{value:0},flickerAmount:{value:.15}},vertexShader:Jm,fragmentShader:Zm,vertexColors:!0})),Yi}function Jl(r){Yi&&(Yi.uniforms.time.value=r)}function Zl(){const r=new Gt,e=new Ri(Qe.HANDLE_RADIUS,Qe.HANDLE_RADIUS,Qe.HANDLE_HEIGHT,8);e.translate(0,Qe.HANDLE_HEIGHT/2,0);const t=new Ri(Qe.HEAD_RADIUS,Qe.HEAD_RADIUS*.8,Qe.HEAD_HEIGHT,8);t.translate(0,Qe.HANDLE_HEIGHT+Qe.HEAD_HEIGHT/2,0);const n=new Qs(Qe.FLAME_RADIUS,Qe.FLAME_HEIGHT,8);n.translate(0,Qe.HANDLE_HEIGHT+Qe.HEAD_HEIGHT+Qe.FLAME_HEIGHT/2,0);const i=new Oe(9127187),s=new Oe(3355443),o=new Oe(Qe.LIGHT_COLOR);zr(e,i),zr(t,s),zr(n,o),Hr(e,0),Hr(t,0),Hr(n,1);const a=jl([e,t,n]),l=Qm(),c=new Ae(a,l);return c.name="torchMesh",r.add(c),e.dispose(),t.dispose(),n.dispose(),r}function zr(r,e){const t=r.attributes.position.count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;r.setAttribute("color",new Tt(n,3))}function Hr(r,e){const t=r.attributes.position.count,n=new Float32Array(t);for(let i=0;i<t;i++)n[i]=e;r.setAttribute("animWeight",new Tt(n,1))}class eg{constructor(e,t){v(this,"torchGroup");v(this,"pointLight");v(this,"camera");v(this,"isVisible",!1);v(this,"flickerTime",0);v(this,"baseIntensity");this.camera=e,this.baseIntensity=Qe.LIGHT_INTENSITY,this.torchGroup=Zl(),this.torchGroup.visible=!1,this.torchGroup.position.copy(Qe.HELD_OFFSET),this.torchGroup.rotation.copy(Qe.HELD_ROTATION),this.pointLight=new Uh(Qe.LIGHT_COLOR,0,Qe.LIGHT_RANGE,Qe.LIGHT_DECAY),e.add(this.torchGroup),e.add(this.pointLight);const n=Qe.HELD_OFFSET.y+Qe.HANDLE_HEIGHT+Qe.HEAD_HEIGHT+Qe.FLAME_HEIGHT;this.pointLight.position.set(Qe.HELD_OFFSET.x,n,Qe.HELD_OFFSET.z)}setVisible(e){this.isVisible=e,this.torchGroup.visible=e,this.pointLight.intensity=e?this.baseIntensity:0}update(e){if(!this.isVisible)return;this.flickerTime+=e*Qe.FLICKER_SPEED;const t=Math.sin(this.flickerTime)*Math.sin(this.flickerTime*2.3)*Math.sin(this.flickerTime*.7);this.pointLight.intensity=this.baseIntensity*(1+t*Qe.FLICKER_AMOUNT),Jl(this.flickerTime)}dispose(){this.camera.remove(this.torchGroup),this.camera.remove(this.pointLight),this.torchGroup.traverse(e=>{e instanceof Ae&&(e.geometry.dispose(),e.material instanceof gn&&e.material.dispose())}),this.pointLight.dispose()}}class tg{constructor(e){v(this,"scene");v(this,"placedTorches",[]);v(this,"torchesByTile",new Map);v(this,"flickerTime",0);v(this,"torchLightData",new Map);this.scene=e}placeTorch(e,t,n){const i=Zl(),s=e.clone().sub(t).normalize(),o=new R(0,1,0),a=new Ze().setFromUnitVectors(o,s);i.quaternion.copy(a),i.position.copy(e);const l={group:i,tileIndex:n,position:e.clone(),flickerOffset:Math.random()*Math.PI*2};return this.scene.add(i),this.torchesByTile.has(n)||this.torchesByTile.set(n,[]),this.torchesByTile.get(n).push(l),this.placedTorches.push(l),l}removeTorch(e){const t=this.placedTorches.indexOf(e);if(t>=0){this.placedTorches.splice(t,1);const n=this.torchesByTile.get(e.tileIndex);if(n){const i=n.indexOf(e);i>=0&&n.splice(i,1)}this.scene.remove(e.group),e.group.traverse(i=>{i instanceof Ae&&(i.geometry.dispose(),i.material instanceof gn&&i.material.dispose())})}}update(e){this.flickerTime+=e*Qe.FLICKER_SPEED,Jl(this.flickerTime)}updateVisibility(e){for(const[t,n]of this.torchesByTile){const i=e.has(t);for(const s of n)s.group.visible=i}}getTorchLightAt(e){let t=0;for(const n of this.placedTorches){const i=e.distanceTo(n.position);if(i<Qe.LIGHT_RANGE){const s=1/(1+Qe.LIGHT_DECAY*i*i/(Qe.LIGHT_RANGE*Qe.LIGHT_RANGE));t+=s}}return Math.min(1,t)}getTorchLightData(){return this.torchLightData}getPlacedTorches(){return this.placedTorches}getTorchDataForBaking(){return this.placedTorches.map(e=>{const t=Qe.HANDLE_HEIGHT+Qe.HEAD_HEIGHT+Qe.FLAME_HEIGHT,n=e.position.clone().normalize();return{position:e.position.clone().add(n.multiplyScalar(t)),range:Qe.LIGHT_RANGE,intensity:Qe.LIGHT_INTENSITY}})}hasTorchOnTile(e){const t=this.torchesByTile.get(e);return t!==void 0&&t.length>0}getTilesWithTorches(){const e=new Set;for(const[t,n]of this.torchesByTile)n.length>0&&e.add(t);return e}getNearestTorchPositions(e,t=16){const n=this.placedTorches.map(i=>{const s=Qe.HANDLE_HEIGHT+Qe.HEAD_HEIGHT+Qe.FLAME_HEIGHT,o=i.position.clone().normalize(),a=i.position.clone().add(o.multiplyScalar(s));return{position:a,distance:e.distanceTo(a)}});return n.sort((i,s)=>i.distance-s.distance),n.slice(0,t).map(i=>i.position)}getTorchMeshes(){const e=[];for(const t of this.placedTorches)t.group.traverse(n=>{n instanceof Ae&&e.push(n)});return e}dispose(){for(const e of[...this.placedTorches])this.removeTorch(e)}}var Hn=`uniform vec3 planetCenter;\r
uniform vec3 sunDirection;

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;

void main() {\r
  vUv = uv;

  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);\r
  vWorldPosition = worldPos.xyz;

  
  vNormal = normalize(mat3(modelMatrix) * normal);

  
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  
  float sunFacing = dot(surfaceDir, sunDirection);

  
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}`,Wn=`precision highp float;

uniform sampler2D techTexture;\r
uniform vec3 sunDirection;\r
uniform float ambientIntensity;\r
uniform float directionalIntensity;\r
uniform float torchLight; 

const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;

void main() {\r
  
  vec4 texColor = texture2D(techTexture, vUv);

  
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  
  
  float directional = meshDiffuse * vSunBrightness * directionalIntensity;

  
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness);\r
  float ambient = ambientIntensity * ambientDayNight;

  
  float lighting = ambient + directional;\r
  vec3 finalColor = texColor.rgb * lighting;

  
  if (torchLight > 0.0) {\r
    
    float nightFactor = mix(0.3, 1.0, 1.0 - vSunBrightness);\r
    finalColor += texColor.rgb * TORCH_LIGHT_COLOR * torchLight * nightFactor;\r
  }

  gl_FragColor = vec4(finalColor, texColor.a);\r
}`;const Hs=[{input:k.ORE_COPPER,output:k.INGOT_COPPER,outputQuantity:1},{input:k.ORE_IRON,output:k.INGOT_IRON,outputQuantity:1},{input:k.ORE_GOLD,output:k.INGOT_GOLD,outputQuantity:1},{input:k.ORE_ALUMINUM,output:k.INGOT_ALUMINUM,outputQuantity:1}];class ng{constructor(e,t,n){v(this,"scene");v(this,"furnaces",[]);v(this,"furnaceMeshes",[]);v(this,"textureLoader");v(this,"furnaceGeometry",null);v(this,"furnaceMaterial",null);v(this,"onSmeltCompleteCallback",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"FURNACE_SIZE",.8);v(this,"SMELT_TIME",10);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(_t("/textures/technology/furnace.png"),o,void 0,a)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.furnaceGeometry=new Vt(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const u=o*8,h=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[u+0]=h,i[u+1]=f,i[u+2]=d,i[u+3]=f,i[u+4]=h,i[u+5]=p,i[u+6]=d,i[u+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Ae(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let u=new R(1,0,0);Math.abs(c.dot(u))>.9&&(u=new R(0,0,1));const h=new R().crossVectors(c,u).normalize();u.crossVectors(h,c).normalize();let d=0;if(i){const m=i.clone();m.sub(c.clone().multiplyScalar(m.dot(c))),m.normalize();const y=m.clone().negate();d=Math.atan2(y.dot(h),y.dot(u))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const p=new Ze;p.setFromUnitVectors(new R(0,1,0),c);const g=new Ze;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(p),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const x={mesh:o,position:l.clone(),tileIndex:n,rotation:d,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(x),this.furnaceMeshes.push(o),x}async restoreFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Ae(this.furnaceGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new Ze;l.setFromUnitVectors(new R(0,1,0),a);const c=new Ze;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const u={mesh:o,position:e.clone(),tileIndex:n,rotation:i,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(u),this.furnaceMeshes.push(o),u}removeFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getFurnaceMeshes(){return this.furnaceMeshes}getPlacedFurnaces(){return this.furnaces}getFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.fuelAmount>0&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=Hs.find(o=>o.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.fuelAmount--,n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,fuelAmount:e.fuelAmount,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}const Ws=27;class ig{constructor(e,t,n){v(this,"scene");v(this,"chests",[]);v(this,"chestMeshes",[]);v(this,"textureLoader");v(this,"chestGeometry",null);v(this,"chestMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"CHEST_SIZE",.8);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(_t("/textures/technology/storage_chest.png"),o,void 0,a)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.chestGeometry=new Vt(this.CHEST_SIZE,this.CHEST_SIZE,this.CHEST_SIZE);const t=this.calculateFaceUVs(),n=this.chestGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const u=o*8,h=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[u+0]=h,i[u+1]=f,i[u+2]=d,i[u+3]=f,i[u+4]=h,i[u+5]=p,i[u+6]=d,i[u+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.chestMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createEmptySlots(){const e=[];for(let t=0;t<Ws;t++)e.push({itemType:k.NONE,quantity:0});return e}async placeChest(e,t,n,i){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const s=this.chestMaterial.clone(),o=new Ae(this.chestGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.CHEST_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let u=new R(1,0,0);Math.abs(c.dot(u))>.9&&(u=new R(0,0,1));const h=new R().crossVectors(c,u).normalize();u.crossVectors(h,c).normalize();let d=0;if(i){const m=i.clone();m.sub(c.clone().multiplyScalar(m.dot(c))),m.normalize();const y=m.clone().negate();d=Math.atan2(y.dot(h),y.dot(u))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const p=new Ze;p.setFromUnitVectors(new R(0,1,0),c);const g=new Ze;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(p),o.userData.isStorageChest=!0,o.userData.tileIndex=n,this.scene.add(o);const x={mesh:o,position:l.clone(),tileIndex:n,rotation:d,slots:this.createEmptySlots()};return this.chests.push(x),this.chestMeshes.push(o),x}async restoreChest(e,t,n,i,s){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const o=this.chestMaterial.clone(),a=new Ae(this.chestGeometry,o);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new Ze;c.setFromUnitVectors(new R(0,1,0),l);const u=new Ze;u.setFromAxisAngle(l,i),a.quaternion.copy(u).multiply(c),a.userData.isStorageChest=!0,a.userData.tileIndex=n,this.scene.add(a);const h={mesh:a,position:e.clone(),tileIndex:n,rotation:i,slots:s||this.createEmptySlots()};return this.chests.push(h),this.chestMeshes.push(a),h}addItemsToChest(e,t,n){if(t===k.NONE)return n;const i=at[t];let s=n;for(let o=0;o<Ws&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Ws&&s>0;o++){const a=e.slots[o];if(a.itemType===k.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromChest(e){const t=[];for(const n of e.slots)n.itemType!==k.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}removeChest(e){const t=this.chests.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.chests.splice(t,1);const n=this.chestMeshes.indexOf(e.mesh);n!==-1&&this.chestMeshes.splice(n,1)}getChestMeshes(){return this.chestMeshes}getPlacedChests(){return this.chests}getChestByMesh(e){return this.chests.find(t=>t.mesh===e)}getChestAtTile(e){return this.chests.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.chests){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.chests.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}const Vs=27;class sg{constructor(e,t,n){v(this,"scene");v(this,"piles",[]);v(this,"pileMeshes",[]);v(this,"textureLoader");v(this,"pileGeometry",null);v(this,"pileMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"PILE_WIDTH",.7);v(this,"PILE_HEIGHT",.3);v(this,"PILE_DEPTH",.7);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((t,n)=>{this.textureLoader.load(_t("/textures/technology/garbage_pile.png"),t,void 0,n)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.pileGeometry=new Vt(this.PILE_WIDTH,this.PILE_HEIGHT,this.PILE_DEPTH),this.pileMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}createEmptySlots(){const e=[];for(let t=0;t<Vs;t++)e.push({itemType:k.NONE,quantity:0});return e}async placePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Ae(this.pileGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.PILE_HEIGHT/2));o.position.copy(l);const c=l.clone().sub(t).normalize(),u=new Ze;u.setFromUnitVectors(new R(0,1,0),c),o.quaternion.copy(u),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const h={mesh:o,position:l.clone(),tileIndex:n,slots:this.createEmptySlots()};if(i)for(const d of i)this.addItemsToPile(h,d.itemType,d.quantity);return this.piles.push(h),this.pileMeshes.push(o),h}async restorePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Ae(this.pileGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new Ze;l.setFromUnitVectors(new R(0,1,0),a),o.quaternion.copy(l),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const c={mesh:o,position:e.clone(),tileIndex:n,slots:i||this.createEmptySlots()};return this.piles.push(c),this.pileMeshes.push(o),c}addItemsToPile(e,t,n){if(t===k.NONE)return n;const i=at[t];let s=n;for(let o=0;o<Vs&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Vs&&s>0;o++){const a=e.slots[o];if(a.itemType===k.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromPile(e){const t=[];for(const n of e.slots)n.itemType!==k.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}isPileEmpty(e){return e.slots.every(t=>t.itemType===k.NONE||t.quantity===0)}removePile(e){const t=this.piles.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.piles.splice(t,1);const n=this.pileMeshes.indexOf(e.mesh);n!==-1&&this.pileMeshes.splice(n,1)}getPileMeshes(){return this.pileMeshes}getPlacedPiles(){return this.piles}getPileByMesh(e){return this.piles.find(t=>t.mesh===e)}getPileAtTile(e){return this.piles.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.piles){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.piles.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}var rg=`uniform float time;\r
uniform float particleSize;

attribute float particleLife;    
attribute float particleSeed;    
attribute vec3 particleVelocity; 

varying float vLife;\r
varying float vSeed;

void main() {\r
  vLife = particleLife;\r
  vSeed = particleSeed;

  
  float sizeMultiplier = 1.0 + particleLife * 0.5;

  
  float fadeOut = 1.0 - smoothstep(0.7, 1.0, particleLife);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  
  float dist = length(mvPosition.xyz);

  
  
  float scale = 80.0 / max(dist, 0.5);

  gl_PointSize = particleSize * sizeMultiplier * fadeOut * scale;

  
  gl_PointSize = clamp(gl_PointSize, 1.0, 48.0);

  gl_Position = projectionMatrix * mvPosition;\r
}`,og=`uniform float time;

varying float vLife;\r
varying float vSeed;

void main() {\r
  
  vec2 center = gl_PointCoord - vec2(0.5);\r
  float dist = length(center);

  
  if (dist > 0.45) discard;

  
  float lifeFade = 1.0 - smoothstep(0.6, 1.0, vLife);\r
  float alpha = lifeFade * 0.7;

  
  alpha = floor(alpha * 3.0 + 0.5) / 3.0;

  
  if (alpha < 0.1) discard;

  
  vec3 steamColor = vec3(0.85, 0.88, 0.92);

  
  float colorVar = floor(vSeed * 3.0) / 3.0 - 0.5;\r
  steamColor += colorVar * 0.08;

  gl_FragColor = vec4(steamColor, alpha);\r
}`;class ag{constructor(e,t,n){v(this,"scene");v(this,"steamEngines",[]);v(this,"steamEngineMeshes",[]);v(this,"textureLoader");v(this,"steamEngineGeometry",null);v(this,"steamEngineMaterial",null);v(this,"steamParticleMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"STEAM_ENGINE_SIZE",.8);v(this,"MAX_PARTICLES_PER_ENGINE",30);v(this,"PARTICLE_SPAWN_RATE",8);v(this,"PARTICLE_LIFETIME",1.5);v(this,"PARTICLE_SPEED",.8);v(this,"PARTICLE_SPREAD",.15);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(_t("/textures/technology/steam_engine.png"),o,void 0,a)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.steamEngineGeometry=new Vt(this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE);const t=this.calculateFaceUVs(),n=this.steamEngineGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const u=o*8,h=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[u+0]=h,i[u+1]=f,i[u+2]=d,i[u+3]=f,i[u+4]=h,i[u+5]=p,i[u+6]=d,i[u+7]=p};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.steamEngineMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn}),this.steamParticleMaterial=new qe({uniforms:{time:{value:0},particleSize:{value:12}},vertexShader:rg,fragmentShader:og,transparent:!0,depthWrite:!1,depthTest:!0,blending:ri})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Ae(this.steamEngineGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.STEAM_ENGINE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let u=new R(1,0,0);Math.abs(c.dot(u))>.9&&(u=new R(0,0,1));const h=new R().crossVectors(c,u).normalize();u.crossVectors(h,c).normalize();let d=0;if(i){const m=i.clone();m.sub(c.clone().multiplyScalar(m.dot(c))),m.normalize();const y=m.clone().negate();d=Math.atan2(y.dot(h),y.dot(u))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const p=new Ze;p.setFromUnitVectors(new R(0,1,0),c);const g=new Ze;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(p),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const x={mesh:o,position:l.clone(),tileIndex:n,rotation:d,steamParticles:[],steamMesh:null,steamGeometry:null,isRunning:!1,spawnAccumulator:0};return this.createSteamParticleSystem(x,t),this.steamEngines.push(x),this.steamEngineMeshes.push(o),x}async restoreSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Ae(this.steamEngineGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new Ze;l.setFromUnitVectors(new R(0,1,0),a);const c=new Ze;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const u={mesh:o,position:e.clone(),tileIndex:n,rotation:i,steamParticles:[],steamMesh:null,steamGeometry:null,isRunning:!1,spawnAccumulator:0};return this.createSteamParticleSystem(u,t),this.steamEngines.push(u),this.steamEngineMeshes.push(o),u}removeSteamEngine(e){const t=this.steamEngines.indexOf(e);if(t===-1)return;e.steamMesh&&this.scene.remove(e.steamMesh),e.steamGeometry&&e.steamGeometry.dispose(),this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.steamEngines.splice(t,1);const n=this.steamEngineMeshes.indexOf(e.mesh);n!==-1&&this.steamEngineMeshes.splice(n,1)}getSteamEngineMeshes(){return this.steamEngineMeshes}getPlacedSteamEngines(){return this.steamEngines}getSteamEngineByMesh(e){return this.steamEngines.find(t=>t.mesh===e)}getSteamEngineAtTile(e){return this.steamEngines.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.steamEngines){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.steamEngines.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation}))}createSteamParticleSystem(e,t){if(!this.steamParticleMaterial)return;const n=new pt,i=new Float32Array(this.MAX_PARTICLES_PER_ENGINE*3),s=new Float32Array(this.MAX_PARTICLES_PER_ENGINE),o=new Float32Array(this.MAX_PARTICLES_PER_ENGINE),a=new Float32Array(this.MAX_PARTICLES_PER_ENGINE*3);for(let f=0;f<this.MAX_PARTICLES_PER_ENGINE;f++)s[f]=1,o[f]=Math.random();n.setAttribute("position",new Tt(i,3)),n.setAttribute("particleLife",new Tt(s,1)),n.setAttribute("particleSeed",new Tt(o,1)),n.setAttribute("particleVelocity",new Tt(a,3));const l=this.steamParticleMaterial.clone(),c=new Ih(n,l),u=e.position.clone().sub(t).normalize(),h=e.position.clone().add(u.clone().multiplyScalar(this.STEAM_ENGINE_SIZE/2+.1));c.position.copy(h);const d=new Ze;d.setFromUnitVectors(new R(0,1,0),u),c.quaternion.copy(d),c.renderOrder=100,c.userData.upDirection=u,c.userData.emitterPosition=h.clone(),this.scene.add(c),e.steamGeometry=n,e.steamMesh=c}setEngineRunning(e,t){const n=this.getSteamEngineAtTile(e);n&&(n.isRunning=t)}update(e){const t=Math.min(e,.05),n=performance.now()/1e3;for(const i of this.steamEngines){if(!i.steamMesh||!i.steamGeometry)continue;const s=i.steamGeometry,o=s.attributes.position.array,a=s.attributes.particleLife.array,l=s.attributes.particleSeed.array,c=[];for(let h=0;h<this.MAX_PARTICLES_PER_ENGINE;h++)if(a[h]<1)if(a[h]+=t/this.PARTICLE_LIFETIME,a[h]>=1)a[h]=1,c.push(h);else{const d=this.PARTICLE_SPEED*t;o[h*3+1]+=d;const f=Math.sin(n*2+l[h]*10)*.02*t;o[h*3]+=f,o[h*3+2]+=Math.cos(n*2+l[h]*10)*.02*t}else c.push(h);if(i.isRunning&&c.length>0){const h=1/this.PARTICLE_SPAWN_RATE,d=h*2;i.spawnAccumulator=Math.min(i.spawnAccumulator+t,d);let f=0;const p=2;for(;i.spawnAccumulator>=h&&f<c.length&&f<p;){i.spawnAccumulator-=h;const g=c[f],x=(Math.random()-.5)*this.PARTICLE_SPREAD*2,m=(Math.random()-.5)*this.PARTICLE_SPREAD*2;o[g*3]=x,o[g*3+1]=0,o[g*3+2]=m,a[g]=0,l[g]=Math.random(),f++}}else i.isRunning||(i.spawnAccumulator=0);s.attributes.position.needsUpdate=!0,s.attributes.particleLife.needsUpdate=!0,s.attributes.particleSeed.needsUpdate=!0;const u=i.steamMesh.material;u.uniforms.time&&(u.uniforms.time.value=n)}}}class lg{constructor(e,t,n){v(this,"scene");v(this,"hydroGenerators",[]);v(this,"hydroGeneratorMeshes",[]);v(this,"textureLoader");v(this,"hydroGeneratorGeometry",null);v(this,"hydroGeneratorMaterial",null);v(this,"strutMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"HYDRO_GENERATOR_SIZE",.8);v(this,"STRUT_WIDTH",.05);v(this,"STRUT_COLOR",6710886);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(_t("/textures/technology/hydro_generator.png"),o,void 0,a)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.hydroGeneratorGeometry=new Vt(this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE);const t=this.calculateFaceUVs(),n=this.hydroGeneratorGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const u=o*8,h=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[u+0]=h,i[u+1]=f,i[u+2]=d,i[u+3]=f,i[u+4]=h,i[u+5]=p,i[u+6]=d,i[u+7]=p};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.hydroGeneratorMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn}),this.strutMaterial=new is({color:this.STRUT_COLOR})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createStruts(e,t,n){if(n<=0)return null;const i=e.clone().sub(t).normalize(),s=[new R(-.3,0,-.3),new R(.3,0,-.3),new R(-.3,0,.3),new R(.3,0,.3)],o=new R(0,1,0),a=new Ze().setFromUnitVectors(o,i),l=[],c=[],u=[];let h=0;const d=this.STRUT_WIDTH/2;for(const g of s){const x=g.clone().applyQuaternion(a),m=e.clone().add(x).sub(i.clone().multiplyScalar(this.HYDRO_GENERATOR_SIZE/2)),y=m.clone().sub(i.clone().multiplyScalar(n));let _=new R(1,0,0);Math.abs(i.dot(_))>.9&&(_=new R(0,0,1));const C=new R().crossVectors(i,_).normalize();_.crossVectors(C,i).normalize();const b=[m.clone().add(_.clone().multiplyScalar(-d)).add(C.clone().multiplyScalar(-d)),m.clone().add(_.clone().multiplyScalar(d)).add(C.clone().multiplyScalar(-d)),m.clone().add(_.clone().multiplyScalar(d)).add(C.clone().multiplyScalar(d)),m.clone().add(_.clone().multiplyScalar(-d)).add(C.clone().multiplyScalar(d)),y.clone().add(_.clone().multiplyScalar(-d)).add(C.clone().multiplyScalar(-d)),y.clone().add(_.clone().multiplyScalar(d)).add(C.clone().multiplyScalar(-d)),y.clone().add(_.clone().multiplyScalar(d)).add(C.clone().multiplyScalar(d)),y.clone().add(_.clone().multiplyScalar(-d)).add(C.clone().multiplyScalar(d))],S=i.clone();l.push(b[0].x,b[0].y,b[0].z),l.push(b[3].x,b[3].y,b[3].z),l.push(b[2].x,b[2].y,b[2].z),l.push(b[1].x,b[1].y,b[1].z);for(let F=0;F<4;F++)c.push(S.x,S.y,S.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4;const A=i.clone().negate();l.push(b[4].x,b[4].y,b[4].z),l.push(b[5].x,b[5].y,b[5].z),l.push(b[6].x,b[6].y,b[6].z),l.push(b[7].x,b[7].y,b[7].z);for(let F=0;F<4;F++)c.push(A.x,A.y,A.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4;const L=_.clone();l.push(b[1].x,b[1].y,b[1].z),l.push(b[2].x,b[2].y,b[2].z),l.push(b[6].x,b[6].y,b[6].z),l.push(b[5].x,b[5].y,b[5].z);for(let F=0;F<4;F++)c.push(L.x,L.y,L.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4;const E=_.clone().negate();l.push(b[3].x,b[3].y,b[3].z),l.push(b[0].x,b[0].y,b[0].z),l.push(b[4].x,b[4].y,b[4].z),l.push(b[7].x,b[7].y,b[7].z);for(let F=0;F<4;F++)c.push(E.x,E.y,E.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4;const T=C.clone();l.push(b[2].x,b[2].y,b[2].z),l.push(b[3].x,b[3].y,b[3].z),l.push(b[7].x,b[7].y,b[7].z),l.push(b[6].x,b[6].y,b[6].z);for(let F=0;F<4;F++)c.push(T.x,T.y,T.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4;const I=C.clone().negate();l.push(b[0].x,b[0].y,b[0].z),l.push(b[1].x,b[1].y,b[1].z),l.push(b[5].x,b[5].y,b[5].z),l.push(b[4].x,b[4].y,b[4].z);for(let F=0;F<4;F++)c.push(I.x,I.y,I.z);u.push(h,h+2,h+1,h,h+3,h+2),h+=4}const f=new pt;f.setAttribute("position",new Ue(l,3)),f.setAttribute("normal",new Ue(c,3)),f.setIndex(u);const p=new Ae(f,this.strutMaterial);return p.userData.isHydroGeneratorStrut=!0,p}async placeHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const o=this.hydroGeneratorMaterial.clone(),a=new Ae(this.hydroGeneratorGeometry,o),l=e.clone().sub(t).normalize(),c=e.clone().add(l.multiplyScalar(this.HYDRO_GENERATOR_SIZE/2));a.position.copy(c);const u=c.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(u.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(u,h).normalize();h.crossVectors(d,u).normalize();let f=0;if(s){const C=s.clone();C.sub(u.clone().multiplyScalar(C.dot(u))),C.normalize();const b=C.clone().negate();f=Math.atan2(b.dot(d),b.dot(h))}const p=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);f+=p;const g=new Ze;g.setFromUnitVectors(new R(0,1,0),u);const x=new Ze;x.setFromAxisAngle(u,f),a.quaternion.copy(x).multiply(g),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const m=this.createStruts(c,t,i);m&&this.scene.add(m);const y=i>0,_={mesh:a,strutMesh:m,position:c.clone(),tileIndex:n,rotation:f,waterDepth:i,isActive:y,waterPumpedIn:y?i*10:0,waterPumpedOut:y?i*8:0};return this.hydroGenerators.push(_),this.hydroGeneratorMeshes.push(a),_}async restoreHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const o=this.hydroGeneratorMaterial.clone(),a=new Ae(this.hydroGeneratorGeometry,o);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new Ze;c.setFromUnitVectors(new R(0,1,0),l);const u=new Ze;u.setFromAxisAngle(l,i),a.quaternion.copy(u).multiply(c),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const h=this.createStruts(e,t,s);h&&this.scene.add(h);const d=s>0,f={mesh:a,strutMesh:h,position:e.clone(),tileIndex:n,rotation:i,waterDepth:s,isActive:d,waterPumpedIn:d?s*10:0,waterPumpedOut:d?s*8:0};return this.hydroGenerators.push(f),this.hydroGeneratorMeshes.push(a),f}removeHydroGenerator(e){const t=this.hydroGenerators.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),e.strutMesh&&(this.scene.remove(e.strutMesh),e.strutMesh.geometry.dispose()),this.hydroGenerators.splice(t,1);const n=this.hydroGeneratorMeshes.indexOf(e.mesh);n!==-1&&this.hydroGeneratorMeshes.splice(n,1)}getHydroGeneratorMeshes(){return this.hydroGeneratorMeshes}getPlacedHydroGenerators(){return this.hydroGenerators}getHydroGeneratorByMesh(e){return this.hydroGenerators.find(t=>t.mesh===e)}getHydroGeneratorAtTile(e){return this.hydroGenerators.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.hydroGenerators){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.hydroGenerators.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,waterDepth:e.waterDepth}))}dispose(){for(const e of[...this.hydroGenerators])this.removeHydroGenerator(e);this.hydroGeneratorGeometry&&this.hydroGeneratorGeometry.dispose(),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.dispose(),this.strutMaterial&&this.strutMaterial.dispose()}}class cg{constructor(e,t,n){v(this,"scene");v(this,"pipes",new Map);v(this,"networks",new Map);v(this,"textureLoader");v(this,"pipeMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"PIPE_SIZE",.2);v(this,"CONNECTOR_SIZE",.08);v(this,"getHydroGeneratorAtTile",null);v(this,"getSteamEngineAtTile",null);v(this,"getNeighborTiles",null);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initMaterial()}setMachineCallbacks(e,t,n){this.getHydroGeneratorAtTile=e,this.getSteamEngineAtTile=t,this.getNeighborTiles=n}setSunDirection(e){this.sunDirection.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.planetCenter.value.copy(e)}async initMaterial(){const e=await new Promise((t,n)=>{this.textureLoader.load(_t("/textures/technology/copper_pipe.png"),t,void 0,n)});e.magFilter=ht,e.minFilter=ht,e.wrapS=wn,e.wrapT=wn,this.pipeMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}generatePipeId(e,t){return`pipe_${e}_${t}`}createPipeMesh(e){const t=new Vt(this.PIPE_SIZE,this.PIPE_SIZE,this.PIPE_SIZE),n=this.pipeMaterial.clone(),i=new Ae(t,n),s=e.clone().sub(this.planetCenter).normalize(),o=new Ze().setFromUnitVectors(new R(0,1,0),s);return i.quaternion.copy(o),i.position.copy(e),i.userData.isCopperPipe=!0,i}createConnectorMesh(e,t){const n=e.clone().add(t).multiplyScalar(.5),i=t.clone().sub(e),s=i.length(),o=new Vt(this.CONNECTOR_SIZE,this.CONNECTOR_SIZE,s),a=this.pipeMaterial.clone(),l=new Ae(o,a);l.position.copy(n);const c=i.normalize(),u=new Ze;return u.setFromUnitVectors(new R(0,0,1),c),l.quaternion.copy(u),l.userData.isPipeConnector=!0,l}async placePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return console.error("Failed to initialize pipe material"),null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=e.clone().sub(this.planetCenter).normalize(),o=e.clone().add(s.clone().multiplyScalar(this.PIPE_SIZE/2)),a=this.createPipeMesh(o);a.userData.pipeId=i,a.userData.tileIndex=t,a.userData.depth=n,this.scene.add(a);const l={id:i,mesh:a,position:o.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,l),this.updatePipeConnections(l),this.updateVisualConnectors(l),this.rebuildNetworks(),l}updateVisualConnectors(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);if(s&&e.id<s.id){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="hydro-generator"){const s=(t=this.getHydroGeneratorAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="steam-engine"){const s=(n=this.getSteamEngineAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);s&&s.id<e.id&&this.rebuildConnectorsForPipe(s)}}rebuildConnectorsForPipe(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);if(s&&e.id<s.id){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="hydro-generator"){const s=(t=this.getHydroGeneratorAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="steam-engine"){const s=(n=this.getSteamEngineAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}}updatePipeConnections(e){if(e.connections=[],!this.getNeighborTiles)return;const t=this.getNeighborTiles(e.tileIndex);for(const n of t){const i=this.generatePipeId(n,e.depth),s=this.pipes.get(i);s&&(e.connections.push({type:"pipe",pipeId:i}),s.connections.find(o=>o.type==="pipe"&&o.pipeId===e.id)||s.connections.push({type:"pipe",pipeId:e.id})),this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(n)&&e.connections.push({type:"hydro-generator",tileIndex:n}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(n)&&e.connections.push({type:"steam-engine",tileIndex:n})}this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(e.tileIndex)&&e.connections.push({type:"hydro-generator",tileIndex:e.tileIndex}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(e.tileIndex)&&e.connections.push({type:"steam-engine",tileIndex:e.tileIndex})}rebuildNetworks(){this.networks.clear();const e=new Set;for(const[t,n]of this.pipes){if(e.has(t))continue;const i={id:`network_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,pipes:[],connectedHydroGenerators:[],connectedSteamEngines:[]},s=[t];for(;s.length>0;){const o=s.pop();if(e.has(o))continue;e.add(o);const a=this.pipes.get(o);if(a){i.pipes.push(o);for(const l of a.connections)l.type==="pipe"?e.has(l.pipeId)||s.push(l.pipeId):l.type==="hydro-generator"?i.connectedHydroGenerators.includes(l.tileIndex)||i.connectedHydroGenerators.push(l.tileIndex):l.type==="steam-engine"&&(i.connectedSteamEngines.includes(l.tileIndex)||i.connectedSteamEngines.push(l.tileIndex))}}this.networks.set(i.id,i)}}isHydroConnectedToSteam(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e)&&t.connectedSteamEngines.length>0)return!0;return!1}getConnectedSteamEngines(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e))return t.connectedSteamEngines;return[]}getConnectedHydroGenerators(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e))return t.connectedHydroGenerators;return[]}getPipeNetwork(e){for(const t of this.networks.values())if(t.pipes.includes(e))return t;return null}getPipeAt(e,t){const n=this.generatePipeId(e,t);return this.pipes.get(n)}getPipeByMesh(e){const t=e.userData.pipeId;if(t)return this.pipes.get(t)}removePipe(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();e.connectorMeshes=[],this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose();for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);n&&(n.connections=n.connections.filter(i=>!(i.type==="pipe"&&i.pipeId===e.id)),this.rebuildConnectorsForPipe(n))}this.pipes.delete(e.id),this.rebuildNetworks()}getPipeMeshes(){return Array.from(this.pipes.values()).map(e=>e.mesh)}getPlacedPipes(){return Array.from(this.pipes.values())}updateTorchLighting(e,t,n){for(const i of this.pipes.values()){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s);for(const a of i.connectorMeshes){const l=a.material;l.uniforms&&l.uniforms.torchLight&&(l.uniforms.torchLight.value=s)}}}exportForSave(){return Array.from(this.pipes.values()).map(e=>({tileIndex:e.tileIndex,depth:e.depth,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}async restorePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=this.createPipeMesh(e);s.userData.pipeId=i,s.userData.tileIndex=t,s.userData.depth=n,this.scene.add(s);const o={id:i,mesh:s,position:e.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,o),o}rebuildAllConnections(){for(const e of this.pipes.values())this.updatePipeConnections(e);for(const e of this.pipes.values())this.rebuildConnectorsForPipe(e);this.rebuildNetworks()}updatePipesNearTile(e){if(!this.getNeighborTiles)return;const t=this.getNeighborTiles(e),n=[e,...t];for(const i of this.pipes.values())n.includes(i.tileIndex)&&(this.updatePipeConnections(i),this.rebuildConnectorsForPipe(i));this.rebuildNetworks()}dispose(){for(const e of this.pipes.values()){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose()}this.pipes.clear(),this.networks.clear(),this.pipeMaterial&&this.pipeMaterial.dispose()}}class hg{constructor(e,t,n){v(this,"scene");v(this,"cables",new Map);v(this,"networks",new Map);v(this,"textureLoader");v(this,"cableMaterial",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"CABLE_SIZE",.2);v(this,"CONNECTOR_SIZE",.08);v(this,"getSteamEngineAtTile",null);v(this,"getElectricFurnaceAtTile",null);v(this,"getNeighborTiles",null);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initMaterial()}setMachineCallbacks(e,t,n){this.getSteamEngineAtTile=e,this.getElectricFurnaceAtTile=t,this.getNeighborTiles=n}setSunDirection(e){this.sunDirection.copy(e),this.cableMaterial&&this.cableMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.cableMaterial&&this.cableMaterial.uniforms.planetCenter.value.copy(e)}async initMaterial(){const e=await new Promise((t,n)=>{this.textureLoader.load(_t("/textures/technology/cable.png"),t,void 0,n)});e.magFilter=ht,e.minFilter=ht,e.wrapS=wn,e.wrapT=wn,this.cableMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}generateCableId(e,t){return`cable_${e}_${t}`}createCableMesh(e){const t=new Vt(this.CABLE_SIZE,this.CABLE_SIZE,this.CABLE_SIZE),n=this.cableMaterial.clone(),i=new Ae(t,n),s=e.clone().sub(this.planetCenter).normalize(),o=new Ze().setFromUnitVectors(new R(0,1,0),s);return i.quaternion.copy(o),i.position.copy(e),i.userData.isCable=!0,i}createConnectorMesh(e,t){const n=e.clone().add(t).multiplyScalar(.5),i=t.clone().sub(e),s=i.length(),o=new Vt(this.CONNECTOR_SIZE,this.CONNECTOR_SIZE,s),a=this.cableMaterial.clone(),l=new Ae(o,a);l.position.copy(n);const c=i.normalize(),u=new Ze;return u.setFromUnitVectors(new R(0,0,1),c),l.quaternion.copy(u),l.userData.isCableConnector=!0,l}async placeCable(e,t,n){if(this.cableMaterial||await this.initMaterial(),!this.cableMaterial)return console.error("Failed to initialize cable material"),null;const i=this.generateCableId(t,n);if(this.cables.has(i))return null;const s=e.clone().sub(this.planetCenter).normalize(),o=e.clone().add(s.clone().multiplyScalar(this.CABLE_SIZE/2)),a=this.createCableMesh(o);a.userData.cableId=i,a.userData.tileIndex=t,a.userData.depth=n,this.scene.add(a);const l={id:i,mesh:a,position:o.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.cables.set(i,l),this.updateCableConnections(l),this.updateVisualConnectors(l),this.rebuildNetworks(),l}updateVisualConnectors(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="cable"){const s=this.cables.get(i.cableId);if(s&&e.id<s.id){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="steam-engine"){const s=(t=this.getSteamEngineAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="electric-furnace"){const s=(n=this.getElectricFurnaceAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}for(const i of e.connections)if(i.type==="cable"){const s=this.cables.get(i.cableId);s&&s.id<e.id&&this.rebuildConnectorsForCable(s)}}rebuildConnectorsForCable(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="cable"){const s=this.cables.get(i.cableId);if(s&&e.id<s.id){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="steam-engine"){const s=(t=this.getSteamEngineAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}else if(i.type==="electric-furnace"){const s=(n=this.getElectricFurnaceAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const o=this.createConnectorMesh(e.position,s.position);this.scene.add(o),e.connectorMeshes.push(o)}}}updateCableConnections(e){if(e.connections=[],!this.getNeighborTiles)return;const t=this.getNeighborTiles(e.tileIndex);for(const n of t){const i=this.generateCableId(n,e.depth),s=this.cables.get(i);s&&(e.connections.push({type:"cable",cableId:i}),s.connections.find(o=>o.type==="cable"&&o.cableId===e.id)||s.connections.push({type:"cable",cableId:e.id})),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(n)&&e.connections.push({type:"steam-engine",tileIndex:n}),this.getElectricFurnaceAtTile&&this.getElectricFurnaceAtTile(n)&&e.connections.push({type:"electric-furnace",tileIndex:n})}this.getSteamEngineAtTile&&this.getSteamEngineAtTile(e.tileIndex)&&e.connections.push({type:"steam-engine",tileIndex:e.tileIndex}),this.getElectricFurnaceAtTile&&this.getElectricFurnaceAtTile(e.tileIndex)&&e.connections.push({type:"electric-furnace",tileIndex:e.tileIndex})}rebuildNetworks(){this.networks.clear();const e=new Set;for(const[t,n]of this.cables){if(e.has(t))continue;const i={id:`network_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,cables:[],connectedSteamEngines:[],connectedElectricFurnaces:[]},s=[t];for(;s.length>0;){const o=s.pop();if(e.has(o))continue;e.add(o);const a=this.cables.get(o);if(a){i.cables.push(o);for(const l of a.connections)l.type==="cable"?e.has(l.cableId)||s.push(l.cableId):l.type==="steam-engine"?i.connectedSteamEngines.includes(l.tileIndex)||i.connectedSteamEngines.push(l.tileIndex):l.type==="electric-furnace"&&(i.connectedElectricFurnaces.includes(l.tileIndex)||i.connectedElectricFurnaces.push(l.tileIndex))}}this.networks.set(i.id,i)}}isSteamConnectedToElectricFurnace(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e)&&t.connectedElectricFurnaces.length>0)return!0;return!1}getConnectedElectricFurnaces(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e))return t.connectedElectricFurnaces;return[]}getConnectedSteamEngines(e){for(const t of this.networks.values())if(t.connectedElectricFurnaces.includes(e))return t.connectedSteamEngines;return[]}isElectricFurnaceConnectedToRunningSteamEngine(e,t){const n=this.getConnectedSteamEngines(e);for(const i of n)if(t(i))return!0;return!1}getCableNetwork(e){for(const t of this.networks.values())if(t.cables.includes(e))return t;return null}getCableAt(e,t){const n=this.generateCableId(e,t);return this.cables.get(n)}getCableByMesh(e){const t=e.userData.cableId;if(t)return this.cables.get(t)}removeCable(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();e.connectorMeshes=[],this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose();for(const t of e.connections)if(t.type==="cable"){const n=this.cables.get(t.cableId);n&&(n.connections=n.connections.filter(i=>!(i.type==="cable"&&i.cableId===e.id)),this.rebuildConnectorsForCable(n))}this.cables.delete(e.id),this.rebuildNetworks()}getCableMeshes(){return Array.from(this.cables.values()).map(e=>e.mesh)}getPlacedCables(){return Array.from(this.cables.values())}updateTorchLighting(e,t,n){for(const i of this.cables.values()){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s);for(const a of i.connectorMeshes){const l=a.material;l.uniforms&&l.uniforms.torchLight&&(l.uniforms.torchLight.value=s)}}}exportForSave(){return Array.from(this.cables.values()).map(e=>({tileIndex:e.tileIndex,depth:e.depth,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}async restoreCable(e,t,n){if(this.cableMaterial||await this.initMaterial(),!this.cableMaterial)return null;const i=this.generateCableId(t,n);if(this.cables.has(i))return null;const s=this.createCableMesh(e);s.userData.cableId=i,s.userData.tileIndex=t,s.userData.depth=n,this.scene.add(s);const o={id:i,mesh:s,position:e.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.cables.set(i,o),o}rebuildAllConnections(){for(const e of this.cables.values())this.updateCableConnections(e);for(const e of this.cables.values())this.rebuildConnectorsForCable(e);this.rebuildNetworks()}updateCablesNearTile(e){if(!this.getNeighborTiles)return;const t=this.getNeighborTiles(e),n=[e,...t];for(const i of this.cables.values())n.includes(i.tileIndex)&&(this.updateCableConnections(i),this.rebuildConnectorsForCable(i));this.rebuildNetworks()}dispose(){for(const e of this.cables.values()){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose()}this.cables.clear(),this.networks.clear(),this.cableMaterial&&this.cableMaterial.dispose()}}const qs=[{input:k.ORE_LITHIUM,output:k.INGOT_LITHIUM,outputQuantity:1},{input:k.ORE_COBALT,output:k.INGOT_COBALT,outputQuantity:1},{input:k.ORE_COPPER,output:k.INGOT_COPPER,outputQuantity:1},{input:k.ORE_IRON,output:k.INGOT_IRON,outputQuantity:1},{input:k.ORE_GOLD,output:k.INGOT_GOLD,outputQuantity:1},{input:k.ORE_ALUMINUM,output:k.INGOT_ALUMINUM,outputQuantity:1}];class ug{constructor(e,t,n){v(this,"scene");v(this,"furnaces",[]);v(this,"furnaceMeshes",[]);v(this,"textureLoader");v(this,"furnaceGeometry",null);v(this,"furnaceMaterial",null);v(this,"onSmeltCompleteCallback",null);v(this,"planetCenter");v(this,"sunDirection");v(this,"FURNACE_SIZE",.8);v(this,"SMELT_TIME",2);this.scene=e,this.textureLoader=new In,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(_t("/textures/technology/electric_furnace.png"),o,void 0,a)});e.magFilter=ht,e.minFilter=ht,e.wrapS=It,e.wrapT=It,this.furnaceGeometry=new Vt(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const u=o*8,h=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[u+0]=h,i[u+1]=f,i[u+2]=d,i[u+3]=f,i[u+4]=h,i[u+5]=p,i[u+6]=d,i[u+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Hn,fragmentShader:Wn})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeElectricFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize electric furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Ae(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let u=new R(1,0,0);Math.abs(c.dot(u))>.9&&(u=new R(0,0,1));const h=new R().crossVectors(c,u).normalize();u.crossVectors(h,c).normalize();let d=0;if(i){const m=i.clone();m.sub(c.clone().multiplyScalar(m.dot(c))),m.normalize();const y=m.clone().negate();d=Math.atan2(y.dot(h),y.dot(u))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const p=new Ze;p.setFromUnitVectors(new R(0,1,0),c);const g=new Ze;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(p),o.userData.isElectricFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const x={mesh:o,position:l.clone(),tileIndex:n,rotation:d,isPowered:!1,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(x),this.furnaceMeshes.push(o),x}async restoreElectricFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize electric furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Ae(this.furnaceGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new Ze;l.setFromUnitVectors(new R(0,1,0),a);const c=new Ze;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isElectricFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const u={mesh:o,position:e.clone(),tileIndex:n,rotation:i,isPowered:!1,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(u),this.furnaceMeshes.push(o),u}removeElectricFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getElectricFurnaceMeshes(){return this.furnaceMeshes}getPlacedElectricFurnaces(){return this.furnaces}getElectricFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getElectricFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}setFurnacePowered(e,t){const n=this.getElectricFurnaceAtTile(e);n&&(n.isPowered=t)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const u=1/(1+2*l*l/(t*t));s+=u*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.isPowered&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=qs.find(o=>o.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}const Ls=[{name:"Wood Planks",inputs:[{itemType:k.LOG,quantity:1,slot:4}],output:{itemType:k.WOOD,quantity:4}},{name:"Sticks",inputs:[{itemType:k.WOOD,quantity:1,slot:1},{itemType:k.WOOD,quantity:1,slot:4}],output:{itemType:k.STICK,quantity:4}},{name:"Coal",inputs:[{itemType:k.ORE_COAL,quantity:1,slot:4}],output:{itemType:k.COAL,quantity:8}},{name:"Torch",inputs:[{itemType:k.COAL,quantity:1,slot:1},{itemType:k.STICK,quantity:1,slot:4}],output:{itemType:k.TORCH,quantity:4}},{name:"Fishing Rod",inputs:[{itemType:k.STICK,quantity:1,slot:1},{itemType:k.STICK,quantity:1,slot:4},{itemType:k.STICK,quantity:1,slot:7}],output:{itemType:k.FISHING_ROD,quantity:1}},{name:"Furnace",inputs:[{itemType:k.STONE,quantity:1,slot:0},{itemType:k.STONE,quantity:1,slot:1},{itemType:k.STONE,quantity:1,slot:2},{itemType:k.STONE,quantity:1,slot:3},{itemType:k.STONE,quantity:1,slot:5},{itemType:k.STONE,quantity:1,slot:6},{itemType:k.STONE,quantity:1,slot:7},{itemType:k.STONE,quantity:1,slot:8}],output:{itemType:k.FURNACE,quantity:1}},{name:"Storage Chest",inputs:[{itemType:k.WOOD,quantity:1,slot:0},{itemType:k.WOOD,quantity:1,slot:1},{itemType:k.WOOD,quantity:1,slot:2},{itemType:k.WOOD,quantity:1,slot:3},{itemType:k.WOOD,quantity:1,slot:5},{itemType:k.WOOD,quantity:1,slot:6},{itemType:k.WOOD,quantity:1,slot:7},{itemType:k.WOOD,quantity:1,slot:8}],output:{itemType:k.STORAGE_CHEST,quantity:1}},{name:"Steam Engine",inputs:[{itemType:k.INGOT_IRON,quantity:1,slot:0},{itemType:k.INGOT_IRON,quantity:1,slot:1},{itemType:k.INGOT_IRON,quantity:1,slot:2},{itemType:k.INGOT_COPPER,quantity:1,slot:3},{itemType:k.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:k.INGOT_COPPER,quantity:1,slot:5},{itemType:k.INGOT_IRON,quantity:1,slot:6},{itemType:k.INGOT_IRON,quantity:1,slot:7},{itemType:k.INGOT_IRON,quantity:1,slot:8}],output:{itemType:k.STEAM_ENGINE,quantity:1}},{name:"Hydro Generator",inputs:[{itemType:k.INGOT_IRON,quantity:1,slot:0},{itemType:k.INGOT_IRON,quantity:1,slot:1},{itemType:k.INGOT_IRON,quantity:1,slot:2},{itemType:k.INGOT_ALUMINUM,quantity:1,slot:3},{itemType:k.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:k.INGOT_ALUMINUM,quantity:1,slot:5},{itemType:k.INGOT_IRON,quantity:1,slot:6},{itemType:k.INGOT_IRON,quantity:1,slot:7},{itemType:k.INGOT_IRON,quantity:1,slot:8}],output:{itemType:k.HYDRO_GENERATOR,quantity:1}},{name:"Copper Pipe",inputs:[{itemType:k.INGOT_COPPER,quantity:1,slot:4}],output:{itemType:k.COPPER_PIPE,quantity:4}},{name:"Cable",inputs:[{itemType:k.INGOT_COPPER,quantity:1,slot:3},{itemType:k.INGOT_COPPER,quantity:1,slot:4},{itemType:k.INGOT_COPPER,quantity:1,slot:5}],output:{itemType:k.CABLE,quantity:8}},{name:"Electric Furnace",inputs:[{itemType:k.INGOT_IRON,quantity:1,slot:0},{itemType:k.INGOT_COPPER,quantity:1,slot:1},{itemType:k.INGOT_IRON,quantity:1,slot:2},{itemType:k.INGOT_COBALT,quantity:1,slot:3},{itemType:k.INGOT_COBALT,quantity:1,slot:4},{itemType:k.INGOT_COBALT,quantity:1,slot:5},{itemType:k.INGOT_IRON,quantity:1,slot:6},{itemType:k.INGOT_COPPER,quantity:1,slot:7},{itemType:k.INGOT_IRON,quantity:1,slot:8}],output:{itemType:k.ELECTRIC_FURNACE,quantity:1}}];class dg{constructor(e){v(this,"inventory");v(this,"menuElement",null);v(this,"recipeSelectElement",null);v(this,"craftingGridElement",null);v(this,"craftingOutputElement",null);v(this,"craftBtnElement",null);v(this,"inventoryGridElement",null);v(this,"inventoryHotbarElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onUpdateHotbarCallback",null);v(this,"onSaveCallback",null);v(this,"customDropdown",null);v(this,"dropdownSelected",null);v(this,"dropdownList",null);v(this,"isDropdownOpen",!1);v(this,"selectedRecipe",null);v(this,"draggedSlotIndex",null);v(this,"dragGhost",null);v(this,"touchDragSlotIndex",null);v(this,"touchDragGhost",null);v(this,"onFurnaceDropCallback",null);v(this,"onStorageDropCallback",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler(),Pt.registerMenu("inventory",{isOpen:()=>this.isOpen,close:()=>this.close()})}setupUI(){this.menuElement=document.getElementById("inventory-menu"),this.recipeSelectElement=document.getElementById("recipe-select"),this.craftingGridElement=document.getElementById("crafting-grid"),this.craftingOutputElement=document.getElementById("crafting-output"),this.craftBtnElement=document.getElementById("craft-btn"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.menuElement&&this.menuElement.addEventListener("contextmenu",e=>e.preventDefault()),this.createInventorySlots(),Pt.setupCloseButton(".close-inventory",this.menuElement,()=>this.close()),this.createCustomDropdown(),this.craftBtnElement&&this.craftBtnElement.addEventListener("click",()=>this.craftSelectedRecipe()),document.addEventListener("click",e=>{this.customDropdown&&!this.customDropdown.contains(e.target)&&this.closeDropdown()})}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString(),t.draggable=!0;const n=document.createElement("img");n.style.display="none",n.draggable=!1,t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t.addEventListener("dragstart",s=>this.handleDragStart(s,e)),t.addEventListener("dragend",()=>this.handleDragEnd()),t.addEventListener("dragover",s=>this.handleDragOver(s)),t.addEventListener("dragleave",s=>this.handleDragLeave(s)),t.addEventListener("drop",s=>this.handleDrop(s,e)),t.addEventListener("touchstart",s=>this.handleTouchStart(s,e),{passive:!1}),t.addEventListener("touchmove",s=>this.handleTouchMove(s),{passive:!1}),t.addEventListener("touchend",s=>this.handleTouchEnd(s),{passive:!1}),t}handleTouchStart(e,t){const n=this.inventory.getSlot(t);if(!n||n.itemType===k.NONE)return;e.preventDefault(),this.touchDragSlotIndex=t;const i=e.touches[0];e.currentTarget.classList.add("dragging");const o=document.createElement("div");o.className="drag-ghost";const a=at[n.itemType];o.innerHTML=`<img src="${_t(a.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(o.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),o.style.position="fixed",o.style.left=`${i.clientX-25}px`,o.style.top=`${i.clientY-25}px`,o.style.pointerEvents="none",o.style.zIndex="9999",o.style.background="rgba(0,0,0,0.8)",o.style.border="2px solid #4CAF50",o.style.borderRadius="4px",o.style.padding="4px",document.body.appendChild(o),this.touchDragGhost=o}handleTouchMove(e){if(this.touchDragSlotIndex===null||!this.touchDragGhost)return;e.preventDefault();const t=e.touches[0];this.touchDragGhost.style.left=`${t.clientX-25}px`,this.touchDragGhost.style.top=`${t.clientY-25}px`,document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")});const n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");i&&i.classList.add("drag-over")}handleTouchEnd(e){if(this.touchDragSlotIndex===null)return;e.preventDefault();const t=e.changedTouches[0],n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");if(i){const s=parseInt(i.dataset.slot||"-1");s>=0&&s!==this.touchDragSlotIndex&&(this.inventory.swapSlots(this.touchDragSlotIndex,s),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}document.querySelectorAll(".inventory-slot.dragging").forEach(s=>{s.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")}),this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null),this.touchDragSlotIndex=null}handleDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===k.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=at[n.itemType];s.innerHTML=`<img src="${_t(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.onFurnaceDropCallback&&this.onFurnaceDropCallback(t,a)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}if(i&&i.startsWith("storage:")){this.onStorageDropCallback&&this.onStorageDropCallback(t,i)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),Pt.closeMenuViaKeyboard(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),Pt.closeMenuViaKeyboard(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,Pt.openMenu(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.cancelDrag(),this.onCloseCallback&&this.onCloseCallback())}cancelDrag(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null),this.touchDragSlotIndex=null,this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null)}isMenuOpen(){return this.isOpen}toggle(){this.isOpen?this.close():this.open()}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnFurnaceDropCallback(e){this.onFurnaceDropCallback=e}setOnStorageDropCallback(e){this.onStorageDropCallback=e}updateInventorySlotsPublic(){this.updateInventorySlots()}updateUI(){this.updateInventorySlots(),this.updateCraftingGrid()}updateInventorySlots(){var i,s;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((o,a)=>{const l=9+a;this.updateSlotElement(o,e[l])});const n=(s=this.inventoryHotbarElement)==null?void 0:s.querySelectorAll(".inventory-slot");n==null||n.forEach((o,a)=>{this.updateSlotElement(o,e[a])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");let s=e.querySelector(".item-tooltip");if(t.itemType!==k.NONE&&t.quantity>0){const o=at[t.itemType];n&&(n.src=_t(o.texture),n.style.display="block",this.applyAtlasRegionStyle(n,o)),i&&(i.textContent=t.quantity>1?t.quantity.toString():""),s||(s=document.createElement("span"),s.className="item-tooltip",e.appendChild(s)),s.textContent=o.name}else n&&(n.style.display="none",this.resetAtlasRegionStyle(n)),i&&(i.textContent=""),s&&s.remove()}applyAtlasRegionStyle(e,t){this.applyAtlasRegionStyleWithSize(e,t,40)}applyAtlasRegionStyleWithSize(e,t,n){if(t.atlasRegion){const{x:i,y:s,width:o,height:a,atlasWidth:l,atlasHeight:c}=t.atlasRegion,u=l/o,h=c/a;e.style.objectFit="none",e.style.objectPosition=`${-i*(n/o)}px ${-s*(n/a)}px`,e.style.width=`${n*u}px`,e.style.height=`${n*h}px`,e.style.transform=`scale(${1/u}, ${1/h})`,e.style.transformOrigin="top left"}else this.resetAtlasRegionStyleWithSize(e,n)}resetAtlasRegionStyle(e){this.resetAtlasRegionStyleWithSize(e,40)}resetAtlasRegionStyleWithSize(e,t){e.style.objectFit="",e.style.objectPosition="",e.style.width=`${t}px`,e.style.height=`${t}px`,e.style.transform="",e.style.transformOrigin=""}createCustomDropdown(){this.recipeSelectElement&&(this.recipeSelectElement.style.display="none"),this.customDropdown=document.createElement("div"),this.customDropdown.className="custom-recipe-dropdown",this.customDropdown.style.cssText=`
      position: relative;
      width: 100%;
      font-family: inherit;
      user-select: none;
    `,this.dropdownSelected=document.createElement("div"),this.dropdownSelected.className="dropdown-selected",this.dropdownSelected.style.cssText=`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #2a2a2a;
      border: 2px solid #444;
      border-radius: 4px;
      cursor: pointer;
      min-height: 40px;
    `,this.dropdownSelected.innerHTML=`
      <span style="color: #888;">-- Select Recipe --</span>
      <span style="margin-left: auto;">▼</span>
    `,this.dropdownSelected.addEventListener("click",e=>{e.stopPropagation(),this.toggleDropdown()}),this.dropdownList=document.createElement("div"),this.dropdownList.className="dropdown-list",this.dropdownList.style.cssText=`
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background: #2a2a2a;
      border: 2px solid #444;
      border-top: none;
      border-radius: 0 0 4px 4px;
      z-index: 1000;
      display: none;
    `,this.populateDropdownList(),this.customDropdown.appendChild(this.dropdownSelected),this.customDropdown.appendChild(this.dropdownList),this.recipeSelectElement&&this.recipeSelectElement.parentNode&&this.recipeSelectElement.parentNode.insertBefore(this.customDropdown,this.recipeSelectElement.nextSibling)}populateDropdownList(){if(!this.dropdownList)return;this.dropdownList.innerHTML="";const e=document.createElement("div");e.className="dropdown-item",e.style.cssText=`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      color: #888;
    `,e.innerHTML="<span>-- Select Recipe --</span>",e.addEventListener("click",()=>this.selectRecipe(-1)),e.addEventListener("mouseenter",()=>e.style.background="#3a3a3a"),e.addEventListener("mouseleave",()=>e.style.background=""),this.dropdownList.appendChild(e);for(let t=0;t<Ls.length;t++){const n=Ls[t],i=at[n.output.itemType],s=document.createElement("div");s.className="dropdown-item",s.style.cssText=`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
      `;const o=document.createElement("img");o.src=_t(i.texture),o.style.cssText=`
        width: 24px;
        height: 24px;
        image-rendering: pixelated;
      `;const a=document.createElement("span");a.textContent=n.name,a.style.color="#fff";const l=document.createElement("span");l.textContent=`x${n.output.quantity}`,l.style.cssText=`
        margin-left: auto;
        color: #888;
        font-size: 12px;
      `,s.appendChild(o),s.appendChild(a),s.appendChild(l),s.addEventListener("click",()=>this.selectRecipe(t)),s.addEventListener("mouseenter",()=>s.style.background="#3a3a3a"),s.addEventListener("mouseleave",()=>s.style.background=""),this.dropdownList.appendChild(s)}}toggleDropdown(){this.isDropdownOpen?this.closeDropdown():this.openDropdown()}openDropdown(){this.dropdownList&&(this.dropdownList.style.display="block",this.isDropdownOpen=!0)}closeDropdown(){this.dropdownList&&(this.dropdownList.style.display="none",this.isDropdownOpen=!1)}selectRecipe(e){if(e<0||e>=Ls.length)this.selectedRecipe=null,this.dropdownSelected&&(this.dropdownSelected.innerHTML=`
          <span style="color: #888;">-- Select Recipe --</span>
          <span style="margin-left: auto;">▼</span>
        `);else{this.selectedRecipe=Ls[e];const t=at[this.selectedRecipe.output.itemType];this.dropdownSelected&&(this.dropdownSelected.innerHTML=`
          <img src="${_t(t.texture)}" style="width: 24px; height: 24px; image-rendering: pixelated;">
          <span style="color: #fff;">${this.selectedRecipe.name}</span>
          <span style="margin-left: auto;">▼</span>
        `)}this.closeDropdown(),this.updateCraftingGrid()}updateCraftingGrid(){var i;const e=(i=this.craftingGridElement)==null?void 0:i.querySelectorAll(".crafting-slot");if(e==null||e.forEach(s=>{const o=s.querySelector("img"),a=s.querySelector(".slot-count"),l=s.querySelector(".item-tooltip");o&&(o.style.display="none"),a&&(a.textContent=""),l&&l.remove(),s.classList.remove("has-item","missing-item")}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count");s&&(s.style.display="none"),o&&(o.textContent=""),this.craftingOutputElement.classList.remove("has-item")}if(this.craftBtnElement&&(this.craftBtnElement.disabled=!0),!this.selectedRecipe)return;const t=new Map;for(const s of this.selectedRecipe.inputs){const o=t.get(s.itemType)||0;t.set(s.itemType,o+s.quantity)}let n=!0;if(!N.DEBUG_BYPASS_CRAFTING_INGREDIENTS){for(const[s,o]of t)if(!this.inventory.hasItem(s,o)){n=!1;break}}if(this.selectedRecipe.inputs.forEach((s,o)=>{const a=s.slot!==void 0?s.slot:o;if(a<9&&e&&e[a]){const l=e[a],c=l.querySelector("img"),u=l.querySelector(".slot-count"),h=at[s.itemType];c&&(c.src=_t(h.texture),c.style.display="block",this.applyAtlasRegionStyle(c,h)),u&&(u.textContent=s.quantity>1?s.quantity.toString():"");let d=l.querySelector(".item-tooltip");if(d||(d=document.createElement("span"),d.className="item-tooltip",l.appendChild(d)),d.textContent=h.name,n)l.classList.add("has-item");else{const f=t.get(s.itemType)||0;this.inventory.hasItem(s.itemType,f)?l.classList.add("has-item"):l.classList.add("missing-item")}}}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count"),a=at[this.selectedRecipe.output.itemType];s&&(s.src=_t(a.texture),s.style.display="block",this.applyAtlasRegionStyleWithSize(s,a,48)),o&&(o.textContent=this.selectedRecipe.output.quantity>1?this.selectedRecipe.output.quantity.toString():""),n&&this.craftingOutputElement.classList.add("has-item")}this.craftBtnElement&&(this.craftBtnElement.disabled=!n)}canCraft(e){if(N.DEBUG_BYPASS_CRAFTING_INGREDIENTS)return!0;for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craftSelectedRecipe(){if(!(!this.selectedRecipe||!this.canCraft(this.selectedRecipe))){if(!N.DEBUG_BYPASS_CRAFTING_INGREDIENTS)for(const e of this.selectedRecipe.inputs)this.inventory.removeItem(e.itemType,e.quantity);this.inventory.addItem(this.selectedRecipe.output.itemType,this.selectedRecipe.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback()}}}class fg{constructor(){v(this,"currentHydroGenerator",null);v(this,"hydroGeneratorSectionElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onOpenInventoryCallback",null);v(this,"waterInElement",null);v(this,"poweredElement",null);v(this,"waterOutElement",null);v(this,"statusIndicatorElement",null);v(this,"waterCanvas",null);v(this,"waterCtx",null);v(this,"animationFrameId",null);v(this,"waterLevel",0);v(this,"targetWaterLevel",0);v(this,"waveOffset",0);v(this,"turbineRotation",0);v(this,"lastAnimationTime",0);v(this,"isConnectedToSteamEngine",null);v(this,"connectedToSteam",!1);this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("hydro-generator",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.hydroGeneratorSectionElement=document.createElement("div"),this.hydroGeneratorSectionElement.id="hydro-generator-section",this.hydroGeneratorSectionElement.className="hydro-generator-section",this.hydroGeneratorSectionElement.innerHTML=`
      <h3>Hydro Generator</h3>

      <div class="hydro-status-container">
        <div class="hydro-status-indicator" id="hydro-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Inactive</span>
        </div>

        <div class="hydro-water-visual">
          <canvas id="hydro-water-canvas" width="120" height="80"></canvas>
        </div>

        <div class="hydro-stats">
          <div class="hydro-stat">
            <span class="stat-label">Water In:</span>
            <span class="stat-value" id="hydro-water-in">0 units/s</span>
          </div>

          <div class="hydro-stat">
            <span class="stat-label">Turbine:</span>
            <span class="stat-value" id="hydro-powered">Disconnected</span>
          </div>

          <div class="hydro-stat">
            <span class="stat-label">Water Out:</span>
            <span class="stat-value" id="hydro-water-out">0 units/s</span>
          </div>
        </div>

        <div class="hydro-info">
          <p>Water Depth: <span id="hydro-water-depth">0</span> blocks</p>
        </div>
      </div>

      <div class="hydro-hint">
        <p>Must be placed on water to function</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.hydroGeneratorSectionElement,t):e.appendChild(this.hydroGeneratorSectionElement)}this.waterInElement=document.getElementById("hydro-water-in"),this.poweredElement=document.getElementById("hydro-powered"),this.waterOutElement=document.getElementById("hydro-water-out"),this.statusIndicatorElement=document.getElementById("hydro-status-indicator"),this.waterCanvas=document.getElementById("hydro-water-canvas"),this.waterCanvas&&(this.waterCtx=this.waterCanvas.getContext("2d")),this.addStyles(),this.hydroGeneratorSectionElement.style.display="none"}addStyles(){const e=document.createElement("style");e.textContent=`
      .hydro-generator-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 180px;
      }

      .hydro-generator-section h3 {
        font-size: 14px;
        color: #4488FF;
        margin-bottom: 10px;
      }

      .hydro-status-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        width: 100%;
      }

      .hydro-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
        justify-content: center;
      }

      .hydro-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      .hydro-status-indicator.active .status-dot {
        background: #44FF44;
        box-shadow: 0 0 8px rgba(68, 255, 68, 0.5);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .hydro-status-indicator.inactive .status-dot {
        background: #FF4444;
        box-shadow: 0 0 4px rgba(255, 68, 68, 0.3);
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .hydro-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
      }

      .hydro-water-visual {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }

      .hydro-water-visual canvas {
        border: 2px solid #333;
        border-radius: 4px;
        background: #1a1a2e;
      }

      .hydro-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .hydro-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .hydro-stat:last-child {
        border-bottom: none;
      }

      .hydro-stat .stat-label {
        color: #888;
        font-size: 12px;
      }

      .hydro-stat .stat-value {
        color: #4488FF;
        font-size: 12px;
        font-weight: bold;
      }

      .hydro-info {
        text-align: center;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .hydro-info p {
        color: #888;
        font-size: 11px;
        margin: 0;
      }

      .hydro-info span {
        color: #4488FF;
        font-weight: bold;
      }

      .hydro-hint {
        margin-top: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .hydro-hint p {
        font-size: 10px;
        color: #666;
        margin: 0;
        text-align: center;
      }
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){var t;this.currentHydroGenerator=e,this.isOpen=!0,this.connectedToSteam=((t=this.isConnectedToSteamEngine)==null?void 0:t.call(this,e.tileIndex))??!1,this.waterLevel=0,this.targetWaterLevel=e.isActive?.75:0,this.waveOffset=0,this.turbineRotation=0,this.lastAnimationTime=performance.now(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startWaterAnimation()}close(){this.currentHydroGenerator=null,this.isOpen=!1,this.stopWaterAnimation(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentHydroGenerator(){return this.currentHydroGenerator}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setConnectionCallback(e){this.isConnectedToSteamEngine=e}updateUI(){var i;if(!this.currentHydroGenerator)return;const e=this.currentHydroGenerator;this.connectedToSteam=((i=this.isConnectedToSteamEngine)==null?void 0:i.call(this,e.tileIndex))??!1;const t=e.isActive&&this.connectedToSteam;if(this.statusIndicatorElement){this.statusIndicatorElement.classList.remove("active","inactive"),this.statusIndicatorElement.classList.add(t?"active":"inactive");const s=this.statusIndicatorElement.querySelector(".status-text");s&&(t?s.textContent="Online":e.isActive?s.textContent="Offline":s.textContent="No Water")}this.waterInElement&&(this.waterInElement.textContent=`${e.waterPumpedIn.toFixed(1)} units/s`),this.poweredElement&&(this.connectedToSteam?(this.poweredElement.textContent="Connected",this.poweredElement.style.color="#44FF44"):(this.poweredElement.textContent="Disconnected",this.poweredElement.style.color="#FF4444")),this.waterOutElement&&(this.connectedToSteam&&e.isActive?this.waterOutElement.textContent=`${e.waterPumpedOut.toFixed(1)} units/s`:this.waterOutElement.textContent="0 units/s");const n=document.getElementById("hydro-water-depth");n&&(n.textContent=Math.round(e.waterDepth).toString())}startWaterAnimation(){if(this.animationFrameId!==null)return;const e=t=>{var s;if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t;const i=.15;this.waterLevel<this.targetWaterLevel?this.waterLevel=Math.min(this.targetWaterLevel,this.waterLevel+i*n):this.waterLevel>this.targetWaterLevel&&(this.waterLevel=Math.max(this.targetWaterLevel,this.waterLevel-i*n)),this.waveOffset+=n*2,this.connectedToSteam&&((s=this.currentHydroGenerator)!=null&&s.isActive)&&(this.turbineRotation+=n*3),this.drawWaterAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopWaterAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}drawWaterAnimation(){if(!this.waterCanvas||!this.waterCtx)return;const e=this.waterCtx,t=this.waterCanvas.width,n=this.waterCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#0a0a1a",e.fillRect(0,0,t,n);const i=n*this.waterLevel,s=n-i;if(this.waterLevel>.01){const o=e.createLinearGradient(0,s,0,n);o.addColorStop(0,"rgba(30, 100, 150, 0.9)"),o.addColorStop(.5,"rgba(20, 80, 130, 0.95)"),o.addColorStop(1,"rgba(10, 50, 100, 1)"),e.fillStyle=o,e.fillRect(0,s,t,i),e.beginPath(),e.moveTo(0,s);for(let c=0;c<=t;c+=2){const u=Math.sin(c*.1+this.waveOffset)*2,h=Math.sin(c*.15+this.waveOffset*1.3)*1.5,d=s+u+h;e.lineTo(c,d)}e.lineTo(t,s),e.lineTo(t,s-10),e.lineTo(0,s-10),e.closePath();const a=e.createLinearGradient(0,s-5,0,s+5);a.addColorStop(0,"rgba(60, 140, 200, 0.3)"),a.addColorStop(1,"rgba(30, 100, 150, 0.9)"),e.fillStyle=a,e.fill(),e.fillStyle="rgba(150, 200, 255, 0.3)";const l=Math.floor(this.waterLevel*5);for(let c=0;c<l;c++){const u=(Math.sin(this.waveOffset*.5+c*1.7)*.5+.5)*t,h=s+(Math.cos(this.waveOffset+c*2.3)*.5+.5)*i*.7,d=1+Math.sin(this.waveOffset+c)*.5;e.beginPath(),e.arc(u,h,d,0,Math.PI*2),e.fill()}}this.drawTurbine(e,t/2,n/2),e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2),e.fillStyle="#555",e.fillRect(0,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(2,n*.3-2,4,4),e.fillStyle="#555",e.fillRect(t-8,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(t-6,n*.3-2,4,4)}drawTurbine(e,t,n){e.save(),e.translate(t,n),e.rotate(this.turbineRotation);for(let l=0;l<6;l++){const c=l/6*Math.PI*2;e.save(),e.rotate(c),e.fillStyle="#666",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(24,-4/3),e.lineTo(24,4/3),e.lineTo(6,4/2),e.closePath(),e.fill(),e.fillStyle="#888",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(6+18*.7,-4/3),e.lineTo(6+18*.7,0),e.lineTo(6,0),e.closePath(),e.fill(),e.restore()}e.beginPath(),e.arc(0,0,6,0,Math.PI*2),e.fillStyle="#555",e.fill(),e.strokeStyle="#777",e.lineWidth=1,e.stroke(),e.beginPath(),e.arc(0,0,2,0,Math.PI*2),e.fillStyle="#888",e.fill(),e.restore()}}class pg{constructor(){v(this,"currentSteamEngine",null);v(this,"steamEngineSectionElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onOpenInventoryCallback",null);v(this,"inventory",null);v(this,"onSaveCallback",null);v(this,"onUpdateHotbarCallback",null);v(this,"engineStates",new Map);v(this,"fuelAmountElement",null);v(this,"waterInputElement",null);v(this,"steamOutputElement",null);v(this,"statusIndicatorElement",null);v(this,"addFuelBtnElement",null);v(this,"steamCanvas",null);v(this,"steamCtx",null);v(this,"animationFrameId",null);v(this,"lastAnimationTime",0);v(this,"steamParticles",[]);v(this,"getConnectedHydroGenerators",null);v(this,"getHydroGeneratorWaterOutput",null);this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("steam-engine",{isOpen:()=>this.isOpen,close:()=>this.close()})}setInventory(e){this.inventory=e}setSaveCallback(e){this.onSaveCallback=e}setUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setConnectionCallbacks(e,t){this.getConnectedHydroGenerators=e,this.getHydroGeneratorWaterOutput=t}createUI(){this.steamEngineSectionElement=document.createElement("div"),this.steamEngineSectionElement.id="steam-engine-section",this.steamEngineSectionElement.className="steam-engine-section",this.steamEngineSectionElement.innerHTML=`
      <h3>Steam Engine</h3>

      <div class="steam-status-container">
        <div class="steam-status-indicator" id="steam-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Idle</span>
        </div>

        <div class="steam-visual">
          <canvas id="steam-canvas" width="120" height="80"></canvas>
        </div>

        <div class="steam-stats">
          <div class="steam-stat">
            <span class="stat-label">Fuel:</span>
            <span class="stat-value" id="steam-fuel-amount">0</span>
          </div>

          <div class="steam-stat">
            <span class="stat-label">Water In:</span>
            <span class="stat-value" id="steam-water-input">0 units/s</span>
          </div>

          <div class="steam-stat">
            <span class="stat-label">Steam Out:</span>
            <span class="stat-value" id="steam-output">0 units/s</span>
          </div>
        </div>

        <button class="steam-fuel-btn" id="steam-add-fuel">Add Coal</button>
      </div>

      <div class="steam-hint">
        <p>Connect to Hydro Generator with copper pipes</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.steamEngineSectionElement,t):e.appendChild(this.steamEngineSectionElement)}this.fuelAmountElement=document.getElementById("steam-fuel-amount"),this.waterInputElement=document.getElementById("steam-water-input"),this.steamOutputElement=document.getElementById("steam-output"),this.statusIndicatorElement=document.getElementById("steam-status-indicator"),this.addFuelBtnElement=document.getElementById("steam-add-fuel"),this.steamCanvas=document.getElementById("steam-canvas"),this.steamCanvas&&(this.steamCtx=this.steamCanvas.getContext("2d")),this.addFuelBtnElement&&this.addFuelBtnElement.addEventListener("click",()=>this.addFuel()),this.addStyles(),this.steamEngineSectionElement.style.display="none"}addStyles(){const e=document.createElement("style");e.textContent=`
      .steam-engine-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 180px;
      }

      .steam-engine-section h3 {
        font-size: 14px;
        color: #FF8844;
        margin-bottom: 10px;
      }

      .steam-status-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        width: 100%;
      }

      .steam-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
        justify-content: center;
      }

      .steam-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      .steam-status-indicator.running .status-dot {
        background: #FF8844;
        box-shadow: 0 0 8px rgba(255, 136, 68, 0.5);
        animation: pulse-steam 1s ease-in-out infinite;
      }

      .steam-status-indicator.idle .status-dot {
        background: #666;
      }

      .steam-status-indicator.no-water .status-dot {
        background: #4488FF;
      }

      @keyframes pulse-steam {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }

      .steam-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
      }

      .steam-visual {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }

      .steam-visual canvas {
        border: 2px solid #333;
        border-radius: 4px;
        background: #1a1a2e;
      }

      .steam-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .steam-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .steam-stat:last-child {
        border-bottom: none;
      }

      .steam-stat .stat-label {
        color: #888;
        font-size: 12px;
      }

      .steam-stat .stat-value {
        color: #FF8844;
        font-size: 12px;
        font-weight: bold;
      }

      .steam-fuel-btn {
        padding: 8px 16px;
        background: linear-gradient(180deg, #5a4030, #3a2820);
        border: 1px solid #6a5040;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .steam-fuel-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #7a5040, #4a3830);
        border-color: #8a6050;
      }

      .steam-fuel-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .steam-hint {
        margin-top: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .steam-hint p {
        font-size: 10px;
        color: #666;
        margin: 0;
        text-align: center;
      }
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){this.currentSteamEngine=e,this.isOpen=!0,this.engineStates.has(e.tileIndex)||this.engineStates.set(e.tileIndex,{hasFuel:!1,fuelAmount:0,isRunning:!1,waterInput:0,steamOutput:0}),this.steamParticles=[],this.lastAnimationTime=performance.now(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startAnimation()}close(){this.currentSteamEngine=null,this.isOpen=!1,this.stopAnimation(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentSteamEngine(){return this.currentSteamEngine}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}getEngineState(e){return this.engineStates.get(e)}addFuel(){if(!this.currentSteamEngine||!this.inventory)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);e&&this.inventory.hasItem(k.COAL,1)&&(this.inventory.removeItem(k.COAL,1),e.fuelAmount+=1,e.hasFuel=!0,this.updateRunningState(e),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback())}updateRunningState(e){let t=0;if(this.currentSteamEngine&&this.getConnectedHydroGenerators&&this.getHydroGeneratorWaterOutput){const n=this.getConnectedHydroGenerators(this.currentSteamEngine.tileIndex);for(const i of n)t+=this.getHydroGeneratorWaterOutput(i)}e.waterInput=t,e.isRunning=e.hasFuel&&e.fuelAmount>0&&t>0,e.steamOutput=e.isRunning?t*.8:0}updateUI(){if(!this.currentSteamEngine)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);if(e&&(this.updateRunningState(e),this.statusIndicatorElement&&(this.statusIndicatorElement.classList.remove("running","idle","no-water"),e.isRunning?(this.statusIndicatorElement.classList.add("running"),this.statusIndicatorElement.querySelector(".status-text").textContent="Running"):e.hasFuel&&e.waterInput===0?(this.statusIndicatorElement.classList.add("no-water"),this.statusIndicatorElement.querySelector(".status-text").textContent="No Water"):(this.statusIndicatorElement.classList.add("idle"),this.statusIndicatorElement.querySelector(".status-text").textContent="Idle")),this.fuelAmountElement&&(this.fuelAmountElement.textContent=e.fuelAmount.toString()),this.waterInputElement&&(this.waterInputElement.textContent=`${e.waterInput.toFixed(1)} units/s`),this.steamOutputElement&&(this.steamOutputElement.textContent=`${e.steamOutput.toFixed(1)} units/s`),this.addFuelBtnElement&&this.inventory)){const t=this.inventory.hasItem(k.COAL,1);this.addFuelBtnElement.disabled=!t,this.addFuelBtnElement.textContent=t?"Add Coal":"No Coal"}}startAnimation(){if(this.animationFrameId!==null)return;const e=t=>{if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t,this.updateSteamParticles(n),this.drawSteamAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}updateSteamParticles(e){const t=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;((t==null?void 0:t.isRunning)??!1)&&Math.random()<e*10&&this.steamParticles.push({x:60+(Math.random()-.5)*20,y:70,size:3+Math.random()*4,opacity:.6+Math.random()*.3,vx:(Math.random()-.5)*10,vy:-20-Math.random()*15});for(let i=this.steamParticles.length-1;i>=0;i--){const s=this.steamParticles[i];s.x+=s.vx*e,s.y+=s.vy*e,s.size+=e*8,s.opacity-=e*.5,(s.opacity<=0||s.y<-10)&&this.steamParticles.splice(i,1)}}drawSteamAnimation(){if(!this.steamCanvas||!this.steamCtx)return;const e=this.steamCtx,t=this.steamCanvas.width,n=this.steamCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#1a1a2e",e.fillRect(0,0,t,n);const i=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;if(e.fillStyle="#444",e.fillRect(35,45,50,30),e.fillStyle="#555",e.fillRect(50,25,20,25),e.fillStyle="#666",e.fillRect(47,20,26,8),i!=null&&i.isRunning){e.fillStyle="#a55",e.fillRect(40,50,40,20);const s=e.createRadialGradient(60,60,0,60,60,25);s.addColorStop(0,"rgba(255, 100, 50, 0.3)"),s.addColorStop(1,"rgba(255, 100, 50, 0)"),e.fillStyle=s,e.fillRect(35,45,50,30)}else e.fillStyle="#444",e.fillRect(40,50,40,20);for(const s of this.steamParticles)e.beginPath(),e.arc(s.x,s.y,s.size,0,Math.PI*2),e.fillStyle=`rgba(200, 200, 220, ${s.opacity})`,e.fill();e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2)}exportStatesForSave(){return Array.from(this.engineStates.entries()).map(([e,t])=>({tileIndex:e,state:t}))}restoreState(e,t){this.engineStates.set(e,t)}updateAllEngines(e){if(!(!this.getConnectedHydroGenerators||!this.getHydroGeneratorWaterOutput))for(const t of e){this.engineStates.has(t)||this.engineStates.set(t,{hasFuel:!1,fuelAmount:0,isRunning:!1,waterInput:0,steamOutput:0});const n=this.engineStates.get(t);let i=0;const s=this.getConnectedHydroGenerators(t);for(const o of s)i+=this.getHydroGeneratorWaterOutput(o);n.waterInput=i,n.isRunning=n.hasFuel&&n.fuelAmount>0&&i>0,n.steamOutput=n.isRunning?i*.8:0}}}class mg extends Kl{constructor(){super({id:"copper-pipe-menu",title:"Copper Pipe Network",closeOnE:!0});v(this,"currentPipe",null);v(this,"currentNetwork",null);v(this,"getHydroGeneratorInfo",null);v(this,"getSteamEngineInfo",null);this.addCustomStyles(),this.buildContent()}setMachineInfoCallbacks(t,n){this.getHydroGeneratorInfo=t,this.getSteamEngineInfo=n}addCustomStyles(){const t=document.createElement("style");t.textContent=`
      #copper-pipe-menu .modal-menu-panel {
        min-width: 320px;
        border-color: #b87333;
      }

      #copper-pipe-menu .modal-menu-title {
        color: #b87333;
      }

      .pipe-status-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pipe-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }

      .pipe-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        transition: background 0.3s;
      }

      .pipe-status-indicator.connected .status-dot {
        background: #4a4;
        box-shadow: 0 0 8px #4a4;
      }

      .pipe-status-indicator.disconnected .status-dot {
        background: #a44;
      }

      .pipe-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
      }

      .pipe-connections {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .connection-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .connection-label {
        color: #aaa;
      }

      .connection-value {
        color: #b87333;
        font-weight: bold;
      }

      .pipe-machine-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 200px;
        overflow-y: auto;
      }

      .pipe-machine-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border-left: 3px solid #666;
      }

      .pipe-machine-item.hydro {
        border-left-color: #4a9;
      }

      .pipe-machine-item.steam {
        border-left-color: #94a;
      }

      .pipe-machine-item .machine-name {
        font-size: 13px;
      }

      .pipe-machine-item .machine-status {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.3);
      }

      .pipe-machine-item .machine-status.active {
        color: #4a4;
      }

      .pipe-machine-item .machine-status.inactive {
        color: #a44;
      }
    `,document.head.appendChild(t)}buildContent(){const t=this.getContentElement();t&&(t.innerHTML=`
      <div class="pipe-status-container">
        <div class="pipe-status-indicator" id="pipe-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Not Connected</span>
        </div>

        <div class="pipe-connections">
          <div class="connection-section">
            <span class="connection-label">Hydro Generators:</span>
            <span class="connection-value" id="pipe-hydro-count">0</span>
          </div>
          <div class="connection-section">
            <span class="connection-label">Steam Engines:</span>
            <span class="connection-value" id="pipe-steam-count">0</span>
          </div>
          <div class="connection-section">
            <span class="connection-label">Pipe Segments:</span>
            <span class="connection-value" id="pipe-segment-count">1</span>
          </div>
        </div>

        <div class="pipe-machine-list" id="pipe-machine-list">
          <!-- Machine list populated dynamically -->
        </div>
      </div>
    `)}openPipe(t,n){this.currentPipe=t,this.currentNetwork=n,this.open()}onOpen(){this.updateContent()}onClose(){this.currentPipe=null,this.currentNetwork=null}getCurrentPipe(){return this.currentPipe}updateContent(){var h,d;if(!this.currentPipe)return;const t=this.getMenuElement();if(!t)return;const n=t.querySelector("#pipe-status-indicator"),i=t.querySelector("#pipe-hydro-count"),s=t.querySelector("#pipe-steam-count"),o=t.querySelector("#pipe-segment-count"),a=t.querySelector("#pipe-machine-list");if(!this.currentNetwork){if(n){n.className="pipe-status-indicator disconnected";const f=n.querySelector(".status-text");f&&(f.textContent="Not Connected")}i&&(i.textContent="0"),s&&(s.textContent="0"),o&&(o.textContent="1"),a&&(a.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>');return}const l=this.currentNetwork.connectedHydroGenerators.length>0,c=this.currentNetwork.connectedSteamEngines.length>0,u=l&&c;if(n){const f=n.querySelector(".status-text");u?(n.className="pipe-status-indicator connected",f&&(f.textContent="Network Active")):(n.className="pipe-status-indicator disconnected",f&&(f.textContent=l||c?"Partial Connection":"Not Connected"))}if(i&&(i.textContent=this.currentNetwork.connectedHydroGenerators.length.toString()),s&&(s.textContent=this.currentNetwork.connectedSteamEngines.length.toString()),o&&(o.textContent=this.currentNetwork.pipes.length.toString()),a){a.innerHTML="";for(const f of this.currentNetwork.connectedHydroGenerators){const p=(h=this.getHydroGeneratorInfo)==null?void 0:h.call(this,f),g=document.createElement("div");g.className="pipe-machine-item hydro",g.innerHTML=`
          <span class="machine-name">Hydro Generator (Tile ${f})</span>
          <span class="machine-status ${p!=null&&p.active?"active":"inactive"}">
            ${p!=null&&p.active?"Active":"Inactive"}
          </span>
        `,a.appendChild(g)}for(const f of this.currentNetwork.connectedSteamEngines){const p=(d=this.getSteamEngineInfo)==null?void 0:d.call(this,f),g=document.createElement("div");g.className="pipe-machine-item steam",g.innerHTML=`
          <span class="machine-name">Steam Engine (Tile ${f})</span>
          <span class="machine-status ${p!=null&&p.isRunning?"active":"inactive"}">
            ${p!=null&&p.isRunning?"Running":p!=null&&p.hasFuel?"Has Fuel":"No Fuel"}
          </span>
        `,a.appendChild(g)}a.children.length===0&&(a.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>')}}getIsOpen(){return this.isOpen()}}class gg{constructor(e){v(this,"inventory");v(this,"currentFurnace",null);v(this,"furnaceSectionElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onSaveCallback",null);v(this,"updateInterval",null);v(this,"onOpenInventoryCallback",null);v(this,"onUpdateHotbarCallback",null);v(this,"onUpdateInventoryCallback",null);v(this,"fuelSlotElement",null);v(this,"inputSlotElement",null);v(this,"outputSlotElement",null);v(this,"progressBarElement",null);v(this,"fuelBarElement",null);v(this,"FUEL_PER_COAL",8);v(this,"SLOT_FUEL","furnace-fuel");v(this,"SLOT_INPUT","furnace-input");v(this,"SLOT_OUTPUT","furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="furnace-section",this.furnaceSectionElement.className="furnace-section",this.furnaceSectionElement.innerHTML=`
      <h3>Furnace</h3>

      <div class="furnace-grid">
        <div class="furnace-input-section">
          <div class="slot-label">Input</div>
          <div class="furnace-slot" id="furnace-input-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>

        <div class="furnace-progress-section">
          <div class="furnace-arrow">
            <div class="progress-bar-container">
              <div class="progress-bar" id="furnace-progress-bar"></div>
            </div>
            <span class="arrow-icon">→</span>
          </div>
        </div>

        <div class="furnace-output-section">
          <div class="slot-label">Output</div>
          <div class="furnace-slot" id="furnace-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="furnace-fuel-section">
        <div class="slot-label">Fuel (Coal)</div>
        <div class="furnace-slot" id="furnace-fuel-slot">
          <img style="display:none;">
          <span class="slot-count"></span>
        </div>
        <div class="fuel-bar-container">
          <div class="fuel-bar" id="furnace-fuel-bar"></div>
        </div>
        <div class="fuel-label" id="fuel-remaining">0 items remaining</div>
      </div>

      <div class="furnace-hint">
        <p>Drag items or Shift+Click to transfer</p>
        <p>Right-click for half stack</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.furnaceSectionElement,t):e.appendChild(this.furnaceSectionElement)}this.fuelSlotElement=document.getElementById("furnace-fuel-slot"),this.inputSlotElement=document.getElementById("furnace-input-slot"),this.outputSlotElement=document.getElementById("furnace-output-slot"),this.progressBarElement=document.getElementById("furnace-progress-bar"),this.fuelBarElement=document.getElementById("furnace-fuel-bar"),this.setupSlotInteractions(),this.addStyles(),this.furnaceSectionElement.style.display="none"}addStyles(){const e=document.createElement("style");e.textContent=`
      .furnace-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .furnace-section h3 {
        font-size: 14px;
        color: #FF6600;
        margin-bottom: 10px;
      }

      .furnace-grid {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .furnace-input-section,
      .furnace-output-section {
        text-align: center;
      }

      .furnace-section .slot-label {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }

      .furnace-slot {
        width: 50px;
        height: 50px;
        background: rgba(139, 69, 19, 0.3);
        border: 2px solid #8B4513;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .furnace-slot:hover {
        border-color: #FF6600;
      }

      .furnace-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .furnace-slot.dragging {
        opacity: 0.5;
      }

      .furnace-slot img {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .furnace-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 2px black;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        padding: 1px 3px;
        border-radius: 2px;
      }

      .furnace-progress-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .furnace-arrow {
        position: relative;
        width: 40px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .arrow-icon {
        font-size: 24px;
        color: #666;
      }

      .furnace-section .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .furnace-section .progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #FF6600, #FF9933);
        border-radius: 2px;
        transition: width 0.1s;
      }

      .furnace-fuel-section {
        text-align: center;
        padding: 10px;
        background: rgba(139, 69, 19, 0.2);
        border-radius: 4px;
        margin-bottom: 10px;
        width: 100%;
      }

      .fuel-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin-top: 8px;
      }

      .fuel-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #FF3300, #FF6600);
        border-radius: 3px;
        transition: width 0.3s;
      }

      .fuel-label {
        margin-top: 4px;
        font-size: 11px;
        color: #888;
      }

      .furnace-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .furnace-hint p {
        margin: 2px 0;
      }
    `,document.head.appendChild(e)}setupSlotInteractions(){this.fuelSlotElement&&(this.fuelSlotElement.dataset.furnaceSlot=this.SLOT_FUEL,this.setupFurnaceSlot(this.fuelSlotElement,this.SLOT_FUEL)),this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,u;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT?(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)):t===this.SLOT_FUEL&&(n=this.currentFurnace.fuelAmount>0,n&&(i=k.COAL,s=Math.ceil(this.currentFurnace.fuelAmount/this.FUEL_PER_COAL))),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=at[i];a.innerHTML=`<img src="${_t(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(u=e.dataTransfer)==null||u.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===k.NONE)return;const s=n?i.quantity:1;if(t===this.SLOT_FUEL){if(i.itemType===k.COAL){const o=Math.min(s,i.quantity);this.currentFurnace.fuelAmount+=o*this.FUEL_PER_COAL,this.inventory.removeItem(k.COAL,o),this.updateUI(),this.notifyChanges()}}else if(t===this.SLOT_INPUT&&Hs.find(a=>a.input===i.itemType)&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)){const a=Math.min(s,i.quantity);this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=a,this.inventory.removeItem(i.itemType,a),this.updateUI(),this.notifyChanges()}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_FUEL?this.handleFuelSlotClick():e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();if(t.itemType===k.COAL&&t.quantity>0){const n=Math.ceil(t.quantity/2);this.currentFurnace.fuelAmount+=n*this.FUEL_PER_COAL,this.inventory.removeItem(k.COAL,n),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0,this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(Hs.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();t.itemType===k.COAL&&t.quantity>0&&(this.currentFurnace.fuelAmount+=t.quantity*this.FUEL_PER_COAL,this.inventory.removeItem(k.COAL,t.quantity),this.updateUI(),this.notifyChanges())}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleFuelSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();e.itemType===k.COAL&&e.quantity>0&&(this.currentFurnace.fuelAmount+=this.FUEL_PER_COAL,this.inventory.removeItem(k.COAL,1),this.updateUI(),this.notifyChanges())}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();Hs.find(n=>n.input===e.itemType)&&e.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount++,this.inventory.removeItem(e.itemType,1),this.updateUI(),this.notifyChanges())}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===k.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===k.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.fuelSlotElement){const n=this.fuelSlotElement.querySelector("img"),i=this.fuelSlotElement.querySelector(".slot-count");if(e.fuelAmount>0){n.src=_t(at[k.COAL].texture),n.style.display="block";const s=Math.ceil(e.fuelAmount/this.FUEL_PER_COAL);i.textContent=s>1?s.toString():""}else n.style.display="none",i.textContent=""}if(this.fuelBarElement){const n=Math.min(100,e.fuelAmount/this.FUEL_PER_COAL*100);this.fuelBarElement.style.width=`${n}%`}const t=document.getElementById("fuel-remaining");if(t&&(t.textContent=`${e.fuelAmount} items remaining`),this.inputSlotElement){const n=this.inputSlotElement.querySelector("img"),i=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const s=at[e.smeltingItem];s&&(n.src=_t(s.texture),n.style.display="block"),i.textContent=e.inputCount>1?e.inputCount.toString():""}else n.style.display="none",i.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const n=this.outputSlotElement.querySelector("img"),i=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const s=at[e.outputItem];s&&(n.src=_t(s.texture),n.style.display="block"),i.textContent=e.outputCount>1?e.outputCount.toString():""}else n.style.display="none",i.textContent=""}}}class xg{constructor(e){v(this,"inventory");v(this,"currentFurnace",null);v(this,"furnaceSectionElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onSaveCallback",null);v(this,"updateInterval",null);v(this,"onOpenInventoryCallback",null);v(this,"onUpdateHotbarCallback",null);v(this,"onUpdateInventoryCallback",null);v(this,"inputSlotElement",null);v(this,"outputSlotElement",null);v(this,"progressBarElement",null);v(this,"powerStatusElement",null);v(this,"SLOT_INPUT","electric-furnace-input");v(this,"SLOT_OUTPUT","electric-furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("electric-furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="electric-furnace-section",this.furnaceSectionElement.className="electric-furnace-section",this.furnaceSectionElement.innerHTML=`
      <h3>Electric Furnace</h3>

      <div class="electric-furnace-power-status" id="electric-furnace-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="electric-furnace-grid">
        <div class="electric-furnace-input-section">
          <div class="slot-label">Input</div>
          <div class="electric-furnace-slot" id="electric-furnace-input-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>

        <div class="electric-furnace-progress-section">
          <div class="electric-furnace-arrow">
            <div class="progress-bar-container">
              <div class="progress-bar" id="electric-furnace-progress-bar"></div>
            </div>
            <span class="arrow-icon">→</span>
          </div>
        </div>

        <div class="electric-furnace-output-section">
          <div class="slot-label">Output</div>
          <div class="electric-furnace-slot" id="electric-furnace-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="electric-furnace-hint">
        <p>No fuel needed - uses power from Steam Engine</p>
        <p>Connect via cables to power</p>
        <p>Can smelt Lithium and Cobalt ore</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.furnaceSectionElement,t):e.appendChild(this.furnaceSectionElement)}this.inputSlotElement=document.getElementById("electric-furnace-input-slot"),this.outputSlotElement=document.getElementById("electric-furnace-output-slot"),this.progressBarElement=document.getElementById("electric-furnace-progress-bar"),this.powerStatusElement=document.getElementById("electric-furnace-power-status"),this.setupSlotInteractions(),this.addStyles(),this.furnaceSectionElement.style.display="none"}addStyles(){const e=document.createElement("style");e.textContent=`
      .electric-furnace-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .electric-furnace-section h3 {
        font-size: 14px;
        color: #00BFFF;
        margin-bottom: 10px;
      }

      .electric-furnace-power-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff4444;
      }

      .electric-furnace-power-status.powered {
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #44ff44;
      }

      .power-icon {
        font-size: 18px;
      }

      .electric-furnace-power-status.powered .power-icon {
        color: #44ff44;
      }

      .power-text {
        font-size: 12px;
        color: #888;
      }

      .electric-furnace-power-status.powered .power-text {
        color: #44ff44;
      }

      .electric-furnace-grid {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .electric-furnace-input-section,
      .electric-furnace-output-section {
        text-align: center;
      }

      .electric-furnace-section .slot-label {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }

      .electric-furnace-slot {
        width: 50px;
        height: 50px;
        background: rgba(0, 191, 255, 0.2);
        border: 2px solid #00BFFF;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .electric-furnace-slot:hover {
        border-color: #00FFFF;
      }

      .electric-furnace-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .electric-furnace-slot.dragging {
        opacity: 0.5;
      }

      .electric-furnace-slot img {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .electric-furnace-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 2px black;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        padding: 1px 3px;
        border-radius: 2px;
      }

      .electric-furnace-progress-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .electric-furnace-arrow {
        position: relative;
        width: 40px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .electric-furnace-section .arrow-icon {
        font-size: 24px;
        color: #666;
      }

      .electric-furnace-section .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .electric-furnace-section .progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00BFFF, #00FFFF);
        border-radius: 2px;
        transition: width 0.1s;
      }

      .electric-furnace-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .electric-furnace-hint p {
        margin: 2px 0;
      }
    `,document.head.appendChild(e)}setupSlotInteractions(){this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,u;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT&&(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`electric-furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=at[i];a.innerHTML=`<img src="${_t(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(u=e.dataTransfer)==null||u.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("electric-furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===k.NONE)return;const s=n?i.quantity:1;if(t===this.SLOT_INPUT&&qs.find(a=>a.input===i.itemType)&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)){const a=Math.min(s,i.quantity);this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=a,this.inventory.removeItem(i.itemType,a),this.updateUI(),this.notifyChanges()}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.inputCount--,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(qs.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();qs.find(n=>n.input===e.itemType)&&e.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount++,this.inventory.removeItem(e.itemType,1),this.updateUI(),this.notifyChanges())}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===k.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===k.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.powerStatusElement)if(e.isPowered){this.powerStatusElement.classList.add("powered");const t=this.powerStatusElement.querySelector(".power-text");t&&(t.textContent="Powered")}else{this.powerStatusElement.classList.remove("powered");const t=this.powerStatusElement.querySelector(".power-text");t&&(t.textContent="No Power")}if(this.inputSlotElement){const t=this.inputSlotElement.querySelector("img"),n=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const i=at[e.smeltingItem];i&&(t.src=_t(i.texture),t.style.display="block"),n.textContent=e.inputCount>1?e.inputCount.toString():""}else t.style.display="none",n.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const t=this.outputSlotElement.querySelector("img"),n=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const i=at[e.outputItem];i&&(t.src=_t(i.texture),t.style.display="block"),n.textContent=e.outputCount>1?e.outputCount.toString():""}else t.style.display="none",n.textContent=""}}}class vg{constructor(e){v(this,"inventory");v(this,"currentStorage",null);v(this,"storageType",null);v(this,"storageSectionElement",null);v(this,"storageGridElement",null);v(this,"isOpen",!1);v(this,"onCloseCallback",null);v(this,"onSaveCallback",null);v(this,"onOpenInventoryCallback",null);v(this,"onUpdateHotbarCallback",null);v(this,"onUpdateInventoryCallback",null);this.inventory=e,this.createUI(),Pt.registerMenu("storage",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.storageSectionElement=document.createElement("div"),this.storageSectionElement.id="storage-section",this.storageSectionElement.className="storage-section",this.storageSectionElement.innerHTML=`
      <h3 id="storage-title">Storage</h3>
      <div class="storage-grid" id="storage-grid"></div>
      <div class="storage-hint">
        <p>Drag items or Shift+Click to transfer</p>
        <p>Right-click for half stack</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.storageSectionElement,t):e.appendChild(this.storageSectionElement)}this.storageGridElement=document.getElementById("storage-grid"),this.addStyles(),this.storageSectionElement.style.display="none"}addStyles(){if(document.getElementById("storage-ui-styles"))return;const t=document.createElement("style");t.id="storage-ui-styles",t.textContent=`
      .storage-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .storage-section h3 {
        font-size: 14px;
        color: #8B4513;
        margin-bottom: 10px;
      }

      .storage-section.garbage h3 {
        color: #666;
      }

      .storage-grid {
        display: grid;
        grid-template-columns: repeat(9, 40px);
        grid-template-rows: repeat(3, 40px);
        gap: 4px;
        margin-bottom: 10px;
      }

      .storage-slot {
        width: 40px;
        height: 40px;
        background: rgba(139, 69, 19, 0.3);
        border: 2px solid #8B4513;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .storage-section.garbage .storage-slot {
        background: rgba(100, 100, 100, 0.3);
        border-color: #666;
      }

      .storage-slot:hover {
        border-color: #FF6600;
      }

      .storage-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .storage-slot.dragging {
        opacity: 0.5;
      }

      .storage-slot img {
        width: 32px;
        height: 32px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .storage-slot .slot-count {
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 11px;
        color: white;
        text-shadow: 1px 1px 2px black;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        padding: 1px 3px;
        border-radius: 2px;
      }

      .storage-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .storage-hint p {
        margin: 2px 0;
      }
    `,document.head.appendChild(t)}createStorageSlots(){if(!this.storageGridElement)return;this.storageGridElement.innerHTML="";const e=this.storageType==="garbage"?Vs:Ws;for(let t=0;t<e;t++){const n=document.createElement("div");n.className="storage-slot",n.dataset.storageSlot=t.toString(),n.draggable=!0;const i=document.createElement("img");i.style.display="none",i.draggable=!1,n.appendChild(i);const s=document.createElement("span");s.className="slot-count",n.appendChild(s),this.setupSlotEvents(n,t),this.storageGridElement.appendChild(n)}}setupSlotEvents(e,t){e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDrop(n,t)})}handleDragStart(e,t){var o,a;if(!this.currentStorage){e.preventDefault();return}const n=this.currentStorage.slots[t];if(!n||n.itemType===k.NONE){e.preventDefault();return}(o=e.dataTransfer)==null||o.setData("text/plain",`storage:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const i=document.createElement("div");i.className="drag-ghost";const s=at[n.itemType];i.innerHTML=`<img src="${_t(s.texture)}" style="width:32px;height:32px;image-rendering:pixelated;">`,n.quantity>1&&(i.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),i.style.cssText="position:fixed;top:-100px;left:-100px;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.8);border:2px solid #4CAF50;border-radius:4px;padding:4px;",document.body.appendChild(i),(a=e.dataTransfer)==null||a.setDragImage(i,20,20),setTimeout(()=>i.remove(),0)}handleDrop(e,t){var s;if(!this.currentStorage)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.transferFromInventory(i,t);return}if(n.startsWith("storage:")){const o=parseInt(n.replace("storage:",""));this.swapStorageSlots(o,t)}}transferFromInventory(e,t){if(!this.currentStorage)return;const n=this.inventory.getSlot(e);if(!n||n.itemType===k.NONE)return;const i=this.currentStorage.slots[t],s=at[n.itemType];if(i.itemType===k.NONE)i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,k.NONE,0);else if(i.itemType===n.itemType){const o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o;const a=n.quantity-o;a>0?this.inventory.setSlot(e,n.itemType,a):this.inventory.setSlot(e,k.NONE,0)}else{const o=i.itemType,a=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,o,a)}this.updateUI(),this.notifyChanges()}swapStorageSlots(e,t){if(!this.currentStorage||e===t)return;const n=this.currentStorage.slots[e],i=this.currentStorage.slots[t];if(i.itemType===k.NONE)i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=k.NONE,n.quantity=0;else if(i.itemType===n.itemType){const s=at[n.itemType],o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o,n.quantity-=o,n.quantity===0&&(n.itemType=k.NONE)}else{const s=i.itemType,o=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=s,n.quantity=o}this.updateUI(),this.notifyChanges()}handleSlotClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];t.itemType!==k.NONE&&t.quantity>0&&this.inventory.addItem(t.itemType,1)===0&&(t.quantity--,t.quantity===0&&(t.itemType=k.NONE),this.updateUI(),this.notifyChanges())}handleRightClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===k.NONE||t.quantity===0)return;const n=Math.ceil(t.quantity/2),i=this.inventory.addItem(t.itemType,n),s=n-i;s>0&&(t.quantity-=s,t.quantity===0&&(t.itemType=k.NONE),this.updateUI(),this.notifyChanges())}handleShiftClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===k.NONE||t.quantity===0)return;const n=this.inventory.addItem(t.itemType,t.quantity);n<t.quantity&&(t.quantity=n,n===0&&(t.itemType=k.NONE),this.updateUI(),this.notifyChanges())}handleDropToInventory(e,t){if(!this.currentStorage||!t.startsWith("storage:"))return!1;const n=parseInt(t.replace("storage:","")),i=this.currentStorage.slots[n];if(!i||i.itemType===k.NONE)return!1;const s=this.inventory.getSlot(e);if(!s)return!1;const o=at[i.itemType];if(s.itemType===k.NONE)this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=k.NONE,i.quantity=0;else if(s.itemType===i.itemType){const a=Math.min(i.quantity,o.stackSize-s.quantity);a>0&&(this.inventory.setSlot(e,s.itemType,s.quantity+a),i.quantity-=a,i.quantity===0&&(i.itemType=k.NONE))}else{const a=s.itemType,l=s.quantity;this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=a,i.quantity=l}return this.updateUI(),this.notifyChanges(),!0}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}open(e){"rotation"in e?this.openChest(e):this.openGarbagePile(e)}openChest(e){this.currentStorage=e,this.storageType="chest",this.openStorage("Storage Chest")}openGarbagePile(e){this.currentStorage=e,this.storageType="garbage",this.openStorage("Garbage Pile")}openStorage(e){if(!this.storageSectionElement)return;const t=document.getElementById("storage-title");t&&(t.textContent=e),this.storageSectionElement.classList.toggle("garbage",this.storageType==="garbage"),this.createStorageSlots(),this.storageSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback()}close(){this.storageSectionElement&&(this.storageSectionElement.style.display="none",this.isOpen=!1,this.currentStorage=null,this.storageType=null,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}getCurrentStorage(){return this.currentStorage}getStorageType(){return this.storageType}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}updateUI(){if(!this.currentStorage||!this.storageGridElement)return;this.storageGridElement.querySelectorAll(".storage-slot").forEach((t,n)=>{const i=this.currentStorage.slots[n],s=t.querySelector("img"),o=t.querySelector(".slot-count");if(i&&i.itemType!==k.NONE&&i.quantity>0){const a=at[i.itemType];a&&(s.src=_t(a.texture),s.style.display="block",o.textContent=i.quantity>1?i.quantity.toString():"")}else s.style.display="none",o.textContent=""})}}const Vi="tenebris_player",Fs="tenebris_earth",Os="tenebris_moon",qi="tenebris_save",Xi=2;class yg{constructor(){v(this,"playerData",null);v(this,"inventory",[]);v(this,"planetData",new Map);v(this,"autoSaveInterval",null);v(this,"onPlayerSave",null);this.planetData.set("earth",{tileChanges:new Map,torches:[],furnaces:[],electricFurnaces:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],cables:[],removedTrees:[]}),this.planetData.set("moon",{tileChanges:new Map,torches:[],furnaces:[],electricFurnaces:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],cables:[],removedTrees:[]})}setPlayerSaveCallback(e){this.onPlayerSave=e}startAutoSave(e=5){this.autoSaveInterval!==null&&clearInterval(this.autoSaveInterval),this.autoSaveInterval=window.setInterval(()=>{this.savePlayerPosition()},e*1e3)}stopAutoSave(){this.autoSaveInterval!==null&&(clearInterval(this.autoSaveInterval),this.autoSaveInterval=null)}saveTileChange(e,t,n,i){const s=this.planetData.get(e);if(!s)return;const o=`${t}:${n}`;s.tileChanges.set(o,{tileIndex:t,depth:n,blockType:i}),this.persistPlanetToStorage(e)}saveInventory(e){this.inventory=[...e],this.persistPlayerToStorage()}saveTorch(e,t,n){const i=this.planetData.get(e);i&&(i.torches.push({tileIndex:t,position:n}),this.persistPlanetToStorage(e))}removeTorch(e){for(const[n,i]of this.planetData){const s=i.torches.length;i.torches=i.torches.filter(o=>Math.abs(o.position.x-e.x)>.01||Math.abs(o.position.y-e.y)>.01||Math.abs(o.position.z-e.z)>.01),i.torches.length!==s&&this.persistPlanetToStorage(n)}}getTorches(){const e=[];for(const[t,n]of this.planetData)for(const i of n.torches)e.push({...i,planetId:t});return e}saveFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.furnaces=i.furnaces.filter(s=>s.tileIndex!==t),i.furnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeFurnace(e,t){const n=this.planetData.get(e);n&&(n.furnaces=n.furnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.furnaces)e.push({...i,planetId:t});return e}saveElectricFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.electricFurnaces=i.electricFurnaces.filter(s=>s.tileIndex!==t),i.electricFurnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeElectricFurnace(e,t){const n=this.planetData.get(e);n&&(n.electricFurnaces=n.electricFurnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getElectricFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.electricFurnaces)e.push({...i,planetId:t});return e}saveStorageChest(e,t,n){const i=this.planetData.get(e);i&&(i.storageChests=i.storageChests.filter(s=>s.tileIndex!==t),i.storageChests.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeStorageChest(e,t){const n=this.planetData.get(e);n&&(n.storageChests=n.storageChests.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getStorageChests(){const e=[];for(const[t,n]of this.planetData)for(const i of n.storageChests)e.push({...i,planetId:t});return e}saveGarbagePile(e,t,n){const i=this.planetData.get(e);i&&(i.garbagePiles=i.garbagePiles.filter(s=>s.tileIndex!==t),i.garbagePiles.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeGarbagePile(e,t){const n=this.planetData.get(e);n&&(n.garbagePiles=n.garbagePiles.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getGarbagePiles(){const e=[];for(const[t,n]of this.planetData)for(const i of n.garbagePiles)e.push({...i,planetId:t});return e}saveSteamEngine(e,t,n){const i=this.planetData.get(e);i&&(i.steamEngines=i.steamEngines.filter(s=>s.tileIndex!==t),i.steamEngines.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeSteamEngine(e,t){const n=this.planetData.get(e);n&&(n.steamEngines=n.steamEngines.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getSteamEngines(){const e=[];for(const[t,n]of this.planetData)for(const i of n.steamEngines)e.push({...i,planetId:t});return e}saveHydroGenerator(e,t,n){const i=this.planetData.get(e);i&&(i.hydroGenerators=i.hydroGenerators.filter(s=>s.tileIndex!==t),i.hydroGenerators.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeHydroGenerator(e,t){const n=this.planetData.get(e);n&&(n.hydroGenerators=n.hydroGenerators.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getHydroGenerators(){const e=[];for(const[t,n]of this.planetData)for(const i of n.hydroGenerators)e.push({...i,planetId:t});return e}saveCopperPipe(e,t,n,i){const s=this.planetData.get(e);s&&(s.copperPipes=s.copperPipes.filter(o=>!(o.tileIndex===t&&o.depth===n)),s.copperPipes.push({tileIndex:t,depth:n,...i}),this.persistPlanetToStorage(e))}removeCopperPipe(e,t,n){const i=this.planetData.get(e);i&&(i.copperPipes=i.copperPipes.filter(s=>!(s.tileIndex===t&&s.depth===n)),this.persistPlanetToStorage(e))}getCopperPipes(){const e=[];for(const[t,n]of this.planetData)for(const i of n.copperPipes)e.push({...i,planetId:t});return e}saveCable(e,t,n,i){const s=this.planetData.get(e);s&&(s.cables=s.cables.filter(o=>!(o.tileIndex===t&&o.depth===n)),s.cables.push({tileIndex:t,depth:n,...i}),this.persistPlanetToStorage(e))}removeCable(e,t,n){const i=this.planetData.get(e);i&&(i.cables=i.cables.filter(s=>!(s.tileIndex===t&&s.depth===n)),this.persistPlanetToStorage(e))}getCables(){const e=[];for(const[t,n]of this.planetData)for(const i of n.cables)e.push({...i,planetId:t});return e}saveRemovedTree(e,t){const n=this.planetData.get(e);n&&(n.removedTrees.some(i=>i.tileIndex===t)||(n.removedTrees.push({tileIndex:t}),this.persistPlanetToStorage(e)))}getRemovedTrees(e){const t=this.planetData.get(e);return(t==null?void 0:t.removedTrees)||[]}savePlayerPosition(){if(this.onPlayerSave){const e=this.onPlayerSave();this.playerData={version:Xi,timestamp:Date.now(),position:e.position,orientation:e.orientation,velocity:e.velocity,inventory:this.inventory},this.persistPlayerToStorage()}}load(){if(this.migrateLegacySave(),this.loadPlayerData(),this.loadPlanetData("earth"),this.loadPlanetData("moon"),!this.playerData&&this.inventory.length===0){let t=!1;for(const n of this.planetData.values())if(n.tileChanges.size>0||n.torches.length>0||n.furnaces.length>0){t=!0;break}if(!t)return null}const e=[];for(const[t,n]of this.planetData)for(const i of n.tileChanges.values())e.push({...i,planetId:t});return{version:Xi,timestamp:Date.now(),tileChanges:e,inventory:this.inventory,player:this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:{position:{x:0,y:0,z:0},orientation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0}},torches:this.getTorches(),furnaces:this.getFurnaces()}}loadPlayerData(){try{const e=localStorage.getItem(Vi);if(!e)return;const t=JSON.parse(e);this.playerData=t,this.inventory=t.inventory||[]}catch(e){console.error("Failed to load player data:",e)}}loadPlanetData(e){try{const t=e==="earth"?Fs:Os,n=localStorage.getItem(t);if(!n)return;const i=JSON.parse(n),s=this.planetData.get(e);if(!s)return;s.tileChanges.clear();for(const o of i.tileChanges){const a=`${o.tileIndex}:${o.depth}`;s.tileChanges.set(a,o)}s.torches=i.torches||[],s.furnaces=i.furnaces||[],s.electricFurnaces=i.electricFurnaces||[],s.storageChests=i.storageChests||[],s.garbagePiles=i.garbagePiles||[],s.steamEngines=i.steamEngines||[],s.hydroGenerators=i.hydroGenerators||[],s.copperPipes=i.copperPipes||[],s.cables=i.cables||[],s.removedTrees=i.removedTrees||[]}catch(t){console.error(`Failed to load ${e} data:`,t)}}migrateLegacySave(){var e,t,n;try{const i=localStorage.getItem(qi);if(!i)return;if(localStorage.getItem(Vi)!==null){localStorage.removeItem(qi);return}console.log("Migrating legacy save data to new format...");const s=JSON.parse(i);this.inventory=s.inventory||[],this.playerData={version:Xi,timestamp:s.timestamp,position:((e=s.player)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=s.player)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=s.player)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};for(const o of s.tileChanges||[]){const a=this.planetData.get(o.planetId);if(a){const l=`${o.tileIndex}:${o.depth}`;a.tileChanges.set(l,{tileIndex:o.tileIndex,depth:o.depth,blockType:o.blockType})}}for(const o of s.torches||[]){const a=this.planetData.get(o.planetId);a&&a.torches.push({tileIndex:o.tileIndex,position:o.position})}for(const o of s.furnaces||[]){const a=this.planetData.get(o.planetId);a&&a.furnaces.push({tileIndex:o.tileIndex,position:o.position,rotation:o.rotation,fuelAmount:o.fuelAmount,smeltingItem:o.smeltingItem,smeltingProgress:o.smeltingProgress,inputCount:o.inputCount??0,outputItem:o.outputItem,outputCount:o.outputCount})}this.persistPlayerToStorage(),this.persistPlanetToStorage("earth"),this.persistPlanetToStorage("moon"),localStorage.removeItem(qi),console.log("Migration complete!")}catch(i){console.error("Failed to migrate legacy save:",i)}}getTileChangesForPlanet(e){const t=this.planetData.get(e);if(!t)return[];const n=[];for(const i of t.tileChanges.values())n.push({...i,planetId:e});return n}getInventory(){return this.inventory}getPlayerData(){return this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:null}clearSave(){this.playerData=null,this.inventory=[];for(const e of this.planetData.values())e.tileChanges.clear(),e.torches=[],e.furnaces=[],e.electricFurnaces=[],e.storageChests=[],e.garbagePiles=[],e.steamEngines=[],e.hydroGenerators=[],e.copperPipes=[],e.cables=[],e.removedTrees=[];localStorage.removeItem(Vi),localStorage.removeItem(Fs),localStorage.removeItem(Os),localStorage.removeItem(qi)}persistPlayerToStorage(){var e,t,n;try{const i={version:Xi,timestamp:Date.now(),position:((e=this.playerData)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=this.playerData)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=this.playerData)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};localStorage.setItem(Vi,JSON.stringify(i))}catch(i){console.error("Failed to save player data:",i)}}persistPlanetToStorage(e){try{const t=this.planetData.get(e);if(!t)return;const n={version:Xi,timestamp:Date.now(),tileChanges:Array.from(t.tileChanges.values()),torches:t.torches,furnaces:t.furnaces,electricFurnaces:t.electricFurnaces,storageChests:t.storageChests,garbagePiles:t.garbagePiles,steamEngines:t.steamEngines,hydroGenerators:t.hydroGenerators,copperPipes:t.copperPipes,cables:t.cables,removedTrees:t.removedTrees},i=e==="earth"?Fs:Os;localStorage.setItem(i,JSON.stringify(n))}catch(t){console.error(`Failed to save ${e} data:`,t)}}hasSavedData(){return localStorage.getItem(Vi)!==null||localStorage.getItem(Fs)!==null||localStorage.getItem(Os)!==null||localStorage.getItem(qi)!==null}}const Ke=new yg;function xl(r){switch(r){case P.STONE:return k.STONE;case P.DIRT:return k.DIRT;case P.GRASS:return k.DIRT;case P.WOOD:return k.WOOD;case P.SAND:return k.SAND;case P.ORE_COAL:return k.ORE_COAL;case P.ORE_COPPER:return k.ORE_COPPER;case P.ORE_IRON:return k.ORE_IRON;case P.ORE_GOLD:return k.ORE_GOLD;case P.ORE_LITHIUM:return k.ORE_LITHIUM;case P.ORE_ALUMINUM:return k.ORE_ALUMINUM;case P.ORE_COBALT:return k.ORE_COBALT;case P.SNOW:return k.SNOW;case P.DIRT_SNOW:return k.DIRT;case P.ICE:return k.ICE;default:return k.NONE}}function _g(r){switch(r){case k.STONE:return P.STONE;case k.DIRT:return P.DIRT;case k.GRASS:return P.DIRT;case k.WOOD:return P.WOOD;case k.SAND:return P.SAND;case k.ORE_COAL:return P.ORE_COAL;case k.ORE_COPPER:return P.ORE_COPPER;case k.ORE_IRON:return P.ORE_IRON;case k.ORE_GOLD:return P.ORE_GOLD;case k.ORE_LITHIUM:return P.ORE_LITHIUM;case k.ORE_ALUMINUM:return P.ORE_ALUMINUM;case k.ORE_COBALT:return P.ORE_COBALT;case k.SNOW:return P.SNOW;case k.ICE:return P.ICE;default:return P.AIR}}class Sg{constructor(e,t,n){v(this,"planets");v(this,"player");v(this,"scene");v(this,"raycaster");v(this,"inventory");v(this,"craftingSystem");v(this,"blockWireframe",null);v(this,"wireframeCache",null);v(this,"wireframeVertPool",[]);v(this,"treeManager",null);v(this,"heldTorch",null);v(this,"torchManager");v(this,"furnaceManager");v(this,"furnaceUI");v(this,"miningFurnaceTarget",null);v(this,"storageChestManager");v(this,"garbagePileManager");v(this,"storageUI");v(this,"miningStorageTarget",null);v(this,"miningGarbageTarget",null);v(this,"steamEngineManager");v(this,"miningSteamEngineTarget",null);v(this,"hydroGeneratorManager");v(this,"hydroGeneratorUI");v(this,"miningHydroGeneratorTarget",null);v(this,"copperPipeManager");v(this,"copperPipeUI");v(this,"steamEngineUI");v(this,"miningCopperPipeTarget",null);v(this,"pipeConnectionRebuildTimer",0);v(this,"PIPE_CONNECTION_REBUILD_INTERVAL",1);v(this,"cableNodeManager");v(this,"miningCableTarget",null);v(this,"cableConnectionRebuildTimer",0);v(this,"electricFurnaceManager");v(this,"electricFurnaceUI");v(this,"miningElectricFurnaceTarget",null);v(this,"rightClickCooldown",0);v(this,"CLICK_COOLDOWN",.25);v(this,"MAX_REACH",8);v(this,"miningTarget",null);v(this,"miningTreeTarget",null);v(this,"miningProgress",0);v(this,"miningProgressContainer",null);v(this,"miningProgressBar",null);v(this,"draggedSlotIndex",null);v(this,"dragGhost",null);v(this,"selectionLabelTimeout",null);v(this,"selectionLabelElement",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new Wh,this.inventory=new jm,this.torchManager=new tg(n),this.heldTorch=new eg(t.camera,n);const i=e.find(a=>a.radius>50),s=(i==null?void 0:i.center)||new R(0,0,0),o=new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize();this.furnaceManager=new ng(n,s,o),this.furnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllFurnaceStates()}),this.furnaceUI=new gg(this.inventory),this.furnaceUI.setOnCloseCallback(()=>{}),this.furnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllFurnaceStates()}),this.furnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.furnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.furnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.storageChestManager=new ig(n,s,o),this.garbagePileManager=new sg(n,s,o),this.steamEngineManager=new ag(n,s,o),this.hydroGeneratorManager=new lg(n,s,o),this.hydroGeneratorUI=new fg,this.hydroGeneratorUI.setOnCloseCallback(()=>{}),this.hydroGeneratorUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.copperPipeManager=new cg(n,s,o),this.copperPipeUI=new mg,this.copperPipeUI.setOnCloseCallback(()=>{}),this.steamEngineUI=new pg,this.steamEngineUI.setInventory(this.inventory),this.steamEngineUI.setOnCloseCallback(()=>{}),this.steamEngineUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.steamEngineUI.setSaveCallback(()=>{this.saveInventory(),this.saveSteamEngineStates()}),this.steamEngineUI.setUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.copperPipeManager.setMachineCallbacks(a=>this.hydroGeneratorManager.getHydroGeneratorAtTile(a),a=>this.steamEngineManager.getSteamEngineAtTile(a),a=>this.getNeighborTileIndices(a)),this.cableNodeManager=new hg(n,s,o),this.cableNodeManager.setMachineCallbacks(a=>this.steamEngineManager.getSteamEngineAtTile(a),a=>this.electricFurnaceManager.getElectricFurnaceAtTile(a),a=>this.getNeighborTileIndices(a)),this.electricFurnaceManager=new ug(n,s,o),this.electricFurnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllElectricFurnaceStates()}),this.electricFurnaceUI=new xg(this.inventory),this.electricFurnaceUI.setOnCloseCallback(()=>{}),this.electricFurnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllElectricFurnaceStates()}),this.electricFurnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.electricFurnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.electricFurnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.hydroGeneratorUI.setConnectionCallback(a=>this.copperPipeManager.isHydroConnectedToSteam(a)),this.steamEngineUI.setConnectionCallbacks(a=>this.copperPipeManager.getConnectedHydroGenerators(a),a=>{const l=this.hydroGeneratorManager.getHydroGeneratorAtTile(a);return l!=null&&l.isActive?l.waterPumpedOut:0}),this.storageUI=new vg(this.inventory),this.storageUI.setOnCloseCallback(()=>{}),this.storageUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllStorageStates()}),this.storageUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.storageUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.storageUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.craftingSystem=new dg(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{this.furnaceUI.close(),this.electricFurnaceUI.close(),this.storageUI.close(),this.hydroGeneratorUI.close(),this.steamEngineUI.close(),this.copperPipeUI.close()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.craftingSystem.setOnSaveCallback(()=>{this.saveInventory()}),this.craftingSystem.setOnFurnaceDropCallback((a,l)=>this.furnaceUI.handleDropToInventory(a,l)),this.craftingSystem.setOnStorageDropCallback((a,l)=>this.storageUI.handleDropToInventory(a,l)),this.player.setTechBlockDataCallback(a=>{const l=new Set(a);return{torches:this.torchManager.getPlacedTorches().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),furnaces:this.furnaceManager.getPlacedFurnaces().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),steamEngines:this.steamEngineManager.getPlacedSteamEngines().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),hydroGenerators:this.hydroGeneratorManager.getPlacedHydroGenerators().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),copperPipes:this.copperPipeManager.getPlacedPipes().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex,depth:c.depth}))}}),this.registerTechBlocksWithRegistry(),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.setupHotbarDragDrop(),this.selectionLabelElement=document.getElementById("hotbar-selection-label"),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}setupHotbarDragDrop(){document.querySelectorAll(".hotbar-slot").forEach((t,n)=>{const i=t;i.draggable=!0;const s=i.querySelector("img");s&&(s.draggable=!1),i.addEventListener("dragstart",o=>this.handleHotbarDragStart(o,n)),i.addEventListener("dragend",()=>this.handleHotbarDragEnd()),i.addEventListener("dragover",o=>this.handleHotbarDragOver(o)),i.addEventListener("dragleave",o=>this.handleHotbarDragLeave(o)),i.addEventListener("drop",o=>this.handleHotbarDrop(o,n)),i.addEventListener("touchstart",o=>{o.preventDefault(),this.inventory.setSelectedSlot(n),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()},{passive:!1})})}handleHotbarDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===k.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=at[n.itemType];s.innerHTML=`<img src="${_t(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleHotbarDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".hotbar-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".hotbar-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleHotbarDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleHotbarDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleHotbarDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("storage:")){this.storageUI.handleDropToInventory(t,i)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.furnaceUI.handleDropToInventory(t,a)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateHotbarUI())}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const s=e[i],o=n.querySelector("img");let a=n.querySelector(".item-count"),l=n.querySelector(".item-tooltip");if(s.itemType!==k.NONE&&s.quantity>0){const c=at[s.itemType];o&&(o.src=_t(c.texture),o.style.display="block",this.applyAtlasRegionStyle(o,c)),a||(a=document.createElement("span"),a.className="item-count",n.appendChild(a)),a.textContent=s.quantity>1?s.quantity.toString():"",l||(l=document.createElement("span"),l.className="item-tooltip",n.appendChild(l)),l.textContent=c.name}else o&&(o.style.display="none",o.style.objectFit="",o.style.objectPosition=""),a&&(a.textContent=""),l&&l.remove();n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}applyAtlasRegionStyle(e,t){if(t.atlasRegion){const{x:n,y:i,width:s,height:o,atlasWidth:a,atlasHeight:l}=t.atlasRegion,c=a/s,u=l/o;e.style.objectFit="none",e.style.objectPosition=`${-n*(40/s)}px ${-i*(40/o)}px`,e.style.width=`${40*c}px`,e.style.height=`${40*u}px`,e.style.transform=`scale(${1/c}, ${1/u})`,e.style.transformOrigin="top left"}else e.style.objectFit="",e.style.objectPosition="",e.style.width="40px",e.style.height="40px",e.style.transform="",e.style.transformOrigin=""}showSelectionLabel(){const e=this.inventory.getSelectedItem();if(this.selectionLabelElement){if(this.selectionLabelTimeout!==null&&(window.clearTimeout(this.selectionLabelTimeout),this.selectionLabelTimeout=null),e.itemType!==k.NONE&&e.quantity>0){const t=at[e.itemType];this.selectionLabelElement.textContent=t.name}else this.selectionLabelElement.textContent="Empty";this.selectionLabelElement.classList.add("visible"),this.selectionLabelTimeout=window.setTimeout(()=>{this.selectionLabelElement&&this.selectionLabelElement.classList.remove("visible"),this.selectionLabelTimeout=null},5e3)}}createHighlightMesh(){const e=new Gl({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new pt;this.blockWireframe=new Ah(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){if(this.wireframeCache&&this.wireframeCache.tileIndex===t&&this.wireframeCache.depth===n)return;const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;this.wireframeCache={tileIndex:t,depth:n};const s=e.getBlockHeight(),o=e.depthToRadius(n),a=o-s,l=[],c=i.vertices.length,u=c*2;for(;this.wireframeVertPool.length<u;)this.wireframeVertPool.push(new R);for(let d=0;d<c;d++){const f=i.vertices[d];this.wireframeVertPool[d].set(f.x,f.y,f.z).normalize().multiplyScalar(o).add(e.center),this.wireframeVertPool[c+d].set(f.x,f.y,f.z).normalize().multiplyScalar(a).add(e.center)}for(let d=0;d<c;d++){const f=(d+1)%c,p=this.wireframeVertPool[d],g=this.wireframeVertPool[f];l.push(p.x,p.y,p.z),l.push(g.x,g.y,g.z)}for(let d=0;d<c;d++){const f=(d+1)%c,p=this.wireframeVertPool[c+d],g=this.wireframeVertPool[c+f];l.push(p.x,p.y,p.z),l.push(g.x,g.y,g.z)}for(let d=0;d<c;d++){const f=this.wireframeVertPool[d],p=this.wireframeVertPool[c+d];l.push(f.x,f.y,f.z),l.push(p.x,p.y,p.z)}this.blockWireframe.geometry.dispose();const h=new pt;h.setAttribute("position",new Ue(l,3)),this.blockWireframe.geometry=h}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==k.NONE?t.textContent=`Block: ${at[e.itemType].name}`:t.textContent="Block: None")}updateSteamEngineParticles(e){const t=this.steamEngineManager.getPlacedSteamEngines(),n=t.map(i=>i.tileIndex);this.steamEngineUI.updateAllEngines(n);for(const i of t){const s=this.steamEngineUI.getEngineState(i.tileIndex),o=(s==null?void 0:s.isRunning)??!1;this.steamEngineManager.setEngineRunning(i.tileIndex,o)}this.steamEngineManager.update(e)}update(e,t,n,i=0){var Re;if(this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e),i!==0){const ie=this.inventory.getSelectedSlot(),ne=9,me=i>0?1:-1;let se=ie+me;se<0&&(se=ne-1),se>=ne&&(se=0),this.inventory.setSelectedSlot(se),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()}const s=this.inventory.getSelectedItem(),o=s.itemType===k.TORCH&&s.quantity>0;this.heldTorch&&(this.heldTorch.setVisible(o),o&&this.heldTorch.update(e)),this.torchManager.update(e),this.furnaceManager.update(e),this.electricFurnaceManager.update(e),this.updateSteamEngineParticles(e),this.pipeConnectionRebuildTimer+=e,this.pipeConnectionRebuildTimer>=this.PIPE_CONNECTION_REBUILD_INTERVAL&&(this.pipeConnectionRebuildTimer=0,this.copperPipeManager.rebuildAllConnections()),this.cableConnectionRebuildTimer+=e,this.cableConnectionRebuildTimer>=this.PIPE_CONNECTION_REBUILD_INTERVAL&&(this.cableConnectionRebuildTimer=0,this.cableNodeManager.rebuildAllConnections(),this.updateElectricFurnacePowerStatus());const a=this.torchManager.getTorchDataForBaking();if(a.length>0){const ie=a.map(se=>se.position),ne=a[0].range,me=a[0].intensity;this.furnaceManager.updateTorchLighting(ie,ne,me),this.electricFurnaceManager.updateTorchLighting(ie,ne,me),this.storageChestManager.updateTorchLighting(ie,ne,me),this.garbagePileManager.updateTorchLighting(ie,ne,me),this.steamEngineManager.updateTorchLighting(ie,ne,me),this.hydroGeneratorManager.updateTorchLighting(ie,ne,me),this.copperPipeManager.updateTorchLighting(ie,ne,me),this.cableNodeManager.updateTorchLighting(ie,ne,me)}if(this.craftingSystem.isMenuOpen()){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining();return}const l=this.player.getRaycastOrigin(),c=this.player.getForwardVector();this.raycaster.set(l,c),this.raycaster.far=this.MAX_REACH;const u=((Re=this.treeManager)==null?void 0:Re.getTreeMeshes())??[],h=this.torchManager.getTorchMeshes(),d=this.furnaceManager.getFurnaceMeshes(),f=this.storageChestManager.getChestMeshes(),p=this.garbagePileManager.getPileMeshes(),g=this.steamEngineManager.getSteamEngineMeshes(),x=this.hydroGeneratorManager.getHydroGeneratorMeshes(),m=this.copperPipeManager.getPipeMeshes(),y=this.cableNodeManager.getCableMeshes(),_=this.electricFurnaceManager.getElectricFurnaceMeshes(),C=this.raycaster.intersectObjects(u,!1),b=this.raycaster.intersectObjects(h,!1),S=this.raycaster.intersectObjects(d,!1),A=this.raycaster.intersectObjects(f,!1),L=this.raycaster.intersectObjects(p,!1),E=this.raycaster.intersectObjects(g,!1),T=this.raycaster.intersectObjects(x,!1),I=this.raycaster.intersectObjects(m,!1),F=this.raycaster.intersectObjects(y,!1),G=this.raycaster.intersectObjects(_,!1);let z=null,X=null,V=1/0;for(const ie of this.planets){const ne=ie.raycast(l,c,this.MAX_REACH);if(ne){const me=l.distanceTo(ne.point);me<V&&(V=me,z=ne,X=ie)}}let Q=!1,q=!1,ee=!1,te=!1,pe=!1,Pe=!1,ve=!1,Me=!1,Ge=!1,j=!1,J=!1,ue=null,ae=null,le=null,we=null,st=null,ke=null,tt=null,O=null,Ie=null,Ne=null;const He=C.length>0?C[0].distance:1/0,fe=b.length>0?b[0].distance:1/0,nt=S.length>0?S[0].distance:1/0,Te=A.length>0?A[0].distance:1/0,De=L.length>0?L[0].distance:1/0,D=E.length>0?E[0].distance:1/0,M=T.length>0?T[0].distance:1/0,B=I.length>0?I[0].distance:1/0,Z=F.length>0?F[0].distance:1/0,re=G.length>0?G[0].distance:1/0,$=Math.min(He,fe,nt,Te,De,D,M,B,Z,re);if(z&&V<$?q=!0:Z<=$&&Z<1/0?(j=!0,Ie=F[0]):re<=$&&re<1/0?(J=!0,Ne=G[0]):B<=$&&B<1/0?(Ge=!0,O=I[0]):M<=$&&M<1/0?(Me=!0,tt=T[0]):D<=$&&D<1/0?(ve=!0,ke=E[0]):Te<=$&&Te<1/0?(pe=!0,we=A[0]):De<=$&&De<1/0?(Pe=!0,st=L[0]):nt<=fe&&nt<=He&&nt<1/0?(te=!0,le=S[0]):fe<He&&fe<1/0?(ee=!0,ae=b[0]):He<1/0?(Q=!0,ue=C[0]):z&&(q=!0),j&&Ie){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=Ie.object,ne=this.cableNodeManager.getCableByMesh(ie);t&&ne?this.handleCableMining(e,ne):this.resetMining()}else if(J&&Ne){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=Ne.object,ne=this.electricFurnaceManager.getElectricFurnaceByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.electricFurnaceUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleElectricFurnaceMining(e,ne):this.resetMining()}else if(Ge&&O){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=O.object,ne=this.copperPipeManager.getPipeByMesh(ie);if(n&&this.rightClickCooldown===0&&ne){const me=this.copperPipeManager.getPipeNetwork(ne.id);this.copperPipeUI.openPipe(ne,me),this.rightClickCooldown=this.CLICK_COOLDOWN}else t&&ne?this.handleCopperPipeMining(e,ne):this.resetMining()}else if(Me&&tt){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=tt.object,ne=this.hydroGeneratorManager.getHydroGeneratorByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.hydroGeneratorUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleHydroGeneratorMining(e,ne):this.resetMining()}else if(ve&&ke){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=ke.object,ne=this.steamEngineManager.getSteamEngineByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.steamEngineUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleSteamEngineMining(e,ne):this.resetMining()}else if(pe&&we){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=we.object,ne=this.storageChestManager.getChestByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.storageUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleStorageChestMining(e,ne):this.resetMining()}else if(Pe&&st){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=st.object,ne=this.garbagePileManager.getPileByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.storageUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleGarbagePileMining(e,ne):this.resetMining()}else if(te&&le){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ie=le.object,ne=this.furnaceManager.getFurnaceByMesh(ie);n&&this.rightClickCooldown===0&&ne?(this.furnaceUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleFurnaceMining(e,ne):this.resetMining()}else if(ee&&ae)this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),t&&this.pickupTorch(ae.object),this.resetMining();else if(Q&&ue){const ie=ue.object;this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ne=ie.userData.treeType;t?this.handleTreeMining(e,ie,ne):this.resetMining()}else if(q&&z&&X){const{tileIndex:ie,depth:ne,blockType:me,prevTileIndex:se,prevDepth:he}=z;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(X,ie,ne)),t&&me!==P.AIR?this.handleMining(e,X,ie,ne,me):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(X,se,he),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining()}handleMining(e,t,n,i,s){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:s},this.miningProgress=0);const o=xl(s),a=at[o].mineTime;this.miningProgress+=e/a,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,s),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?k.LOG:k.LEAVES,s=at[i].mineTime;this.miningProgress+=e/s,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){if(t==="trunk"){const n=Math.floor(Math.random()*5)+4,i=Math.floor(Math.random()*5)+4;this.inventory.addItem(k.LOG,n),this.inventory.addItem(k.STICK,i)}else{const n=Math.floor(Math.random()*3)+1;this.inventory.addItem(k.STICK,n)}if(this.updateHotbarUI(),this.saveInventory(),this.treeManager){let n=e.parent;for(;n&&!(n instanceof Gt&&n.children.some(i=>i.userData.isTree));)n=n.parent;if(n instanceof Gt){const i=n.userData.tileIndex;i!==void 0&&Ke.saveRemovedTree("earth",i),this.treeManager.removeTree(n)}}}handleFurnaceMining(e,t){(this.miningFurnaceTarget===null||this.miningFurnaceTarget.furnace!==t)&&(this.miningFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0);const n=at[k.FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakFurnace(t),this.resetMining())}breakFurnace(e){if(this.inventory.addItem(k.FURNACE,1),e.smeltingItem!==null&&this.inventory.addItem(e.smeltingItem,1),e.outputItem!==null&&e.outputCount>0&&this.inventory.addItem(e.outputItem,e.outputCount),e.fuelAmount>0){const t=Math.ceil(e.fuelAmount/8);this.inventory.addItem(k.COAL,t)}this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ke.removeFurnace(n,e.tileIndex)}this.furnaceManager.removeFurnace(e)}handleStorageChestMining(e,t){(this.miningStorageTarget===null||this.miningStorageTarget.chest!==t)&&(this.miningStorageTarget={chest:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=at[k.STORAGE_CHEST].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakStorageChest(t),this.resetMining())}breakStorageChest(e){this.inventory.addItem(k.STORAGE_CHEST,1);const t=this.storageChestManager.getAllItemsFromChest(e),n=[];for(const i of t){const s=this.inventory.addItem(i.itemType,i.quantity);s>0&&n.push({itemType:i.itemType,quantity:s})}this.updateHotbarUI(),this.saveInventory();for(let i=0;i<this.planets.length;i++){const s=i===0?"earth":"moon";Ke.removeStorageChest(s,e.tileIndex)}n.length>0&&this.createGarbagePileWithItems(e.position.clone(),e.tileIndex,n),this.storageChestManager.removeChest(e)}handleGarbagePileMining(e,t){(this.miningGarbageTarget===null||this.miningGarbageTarget.pile!==t)&&(this.miningGarbageTarget={pile:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningProgress=0);const n=.5;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakGarbagePile(t),this.resetMining())}breakGarbagePile(e){const t=this.garbagePileManager.getAllItemsFromPile(e),n=[];for(const o of t){const a=this.inventory.addItem(o.itemType,o.quantity);a>0&&n.push({itemType:o.itemType,quantity:a})}this.updateHotbarUI(),this.saveInventory();for(let o=0;o<this.planets.length;o++){const a=o===0?"earth":"moon";Ke.removeGarbagePile(a,e.tileIndex)}const i=e.position.clone(),s=e.tileIndex;this.garbagePileManager.removePile(e),n.length>0&&this.createGarbagePileWithItems(i,s,n)}handleSteamEngineMining(e,t){(this.miningSteamEngineTarget===null||this.miningSteamEngineTarget.steamEngine!==t)&&(this.miningSteamEngineTarget={steamEngine:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=at[k.STEAM_ENGINE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakSteamEngine(t),this.resetMining())}breakSteamEngine(e){this.inventory.addItem(k.STEAM_ENGINE,1),this.updateHotbarUI(),this.saveInventory();const t=e.tileIndex;for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ke.removeSteamEngine(i,t)}this.steamEngineManager.removeSteamEngine(e),this.copperPipeManager.updatePipesNearTile(t)}handleHydroGeneratorMining(e,t){(this.miningHydroGeneratorTarget===null||this.miningHydroGeneratorTarget.hydroGenerator!==t)&&(this.miningHydroGeneratorTarget={hydroGenerator:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningProgress=0);const n=at[k.HYDRO_GENERATOR].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakHydroGenerator(t),this.resetMining())}breakHydroGenerator(e){this.inventory.addItem(k.HYDRO_GENERATOR,1),this.updateHotbarUI(),this.saveInventory();const t=e.tileIndex;for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ke.removeHydroGenerator(i,t)}this.hydroGeneratorManager.removeHydroGenerator(e),this.copperPipeManager.updatePipesNearTile(t)}handleCopperPipeMining(e,t){(this.miningCopperPipeTarget===null||this.miningCopperPipeTarget.pipe!==t)&&(this.miningCopperPipeTarget={pipe:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningProgress=0);const n=at[k.COPPER_PIPE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakCopperPipe(t),this.resetMining())}breakCopperPipe(e){this.inventory.addItem(k.COPPER_PIPE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ke.removeCopperPipe(n,e.tileIndex,e.depth)}this.copperPipeManager.removePipe(e)}handleCableMining(e,t){(this.miningCableTarget===null||this.miningCableTarget.cable!==t)&&(this.miningCableTarget={cable:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningElectricFurnaceTarget=null,this.miningProgress=0);const n=at[k.CABLE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakCable(t),this.resetMining())}breakCable(e){this.inventory.addItem(k.CABLE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ke.removeCable(n,e.tileIndex,e.depth)}this.cableNodeManager.removeCable(e)}handleElectricFurnaceMining(e,t){(this.miningElectricFurnaceTarget===null||this.miningElectricFurnaceTarget.furnace!==t)&&(this.miningElectricFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningCableTarget=null,this.miningProgress=0);const n=at[k.ELECTRIC_FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakElectricFurnace(t),this.resetMining())}breakElectricFurnace(e){this.inventory.addItem(k.ELECTRIC_FURNACE,1);const t=[];e.smeltingItem!==null&&e.inputCount>0&&t.push({itemType:e.smeltingItem,quantity:e.inputCount}),e.outputItem!==null&&e.outputCount>0&&t.push({itemType:e.outputItem,quantity:e.outputCount});for(const n of t){const i=this.inventory.addItem(n.itemType,n.quantity);i>0&&this.createGarbagePileWithItems(e.position,e.tileIndex,[{itemType:n.itemType,quantity:i}])}this.updateHotbarUI(),this.saveInventory();for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ke.removeElectricFurnace(i,e.tileIndex)}this.electricFurnaceManager.removeElectricFurnace(e)}async createGarbagePileWithItems(e,t,n){let i=null;for(const o of this.planets)if(o.getTileByIndex(t)){i=o;break}if(!i)return;const s=await this.garbagePileManager.placePile(e,i.center,t,n);if(s){const o=this.getPlanetId(i);Ke.saveGarbagePile(o,t,{position:{x:s.position.x,y:s.position.y,z:s.position.z},slots:s.slots.map(a=>({itemType:a.itemType,quantity:a.quantity}))})}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningCableTarget=null,this.miningElectricFurnaceTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){if(n<=0)return;const s=xl(i);s!==k.NONE&&(this.inventory.addItem(s,1),this.updateHotbarUI(),this.saveInventory());const o=this.getPlanetId(e);let a=!1;const l=e.getMaxDepth();for(let u=n+1;u<l;u++){const h=e.getBlock(t,u);if(h===P.WATER){a=!0;break}else if(h!==P.AIR)break}if(!a){const u=e.getTileNeighbors(t);for(const h of u){if(e.getBlock(h,n)===P.WATER){a=!0;break}if(e.getBlock(h,n+1)===P.WATER){a=!0;break}}}const c=a?P.WATER:P.AIR;if(e.setBlock(t,n,c),Ke.saveTileChange(o,t,n,c),c===P.WATER)for(let u=n-1;u>0&&e.getBlock(t,u)===P.AIR;u--)e.setBlock(t,u,P.WATER),Ke.saveTileChange(o,t,u,P.WATER)}placeBlock(e,t,n){if(n<0||n>=e.getMaxDepth())return;const i=this.inventory.getSelectedItem();if(i.itemType===k.NONE||i.quantity===0)return;if(i.itemType===k.TORCH){this.placeTorch(e,t,n);return}if(i.itemType===k.FURNACE){this.placeFurnace(e,t,n);return}if(i.itemType===k.STORAGE_CHEST){this.placeStorageChest(e,t,n);return}if(i.itemType===k.STEAM_ENGINE){this.placeSteamEngine(e,t,n);return}if(i.itemType===k.HYDRO_GENERATOR){this.placeHydroGenerator(e,t,n);return}if(i.itemType===k.COPPER_PIPE){this.placeCopperPipe(e,t,n);return}if(i.itemType===k.CABLE){this.placeCable(e,t,n);return}if(i.itemType===k.ELECTRIC_FURNACE){this.placeElectricFurnace(e,t,n);return}const s=_g(i.itemType);if(s===P.AIR)return;const o=e.getTileAtPoint(this.player.position);if(o&&o.index===t){const a=this.player.position.distanceTo(e.center),l=a+1.8,c=e.depthToRadius(n),u=c-1;if(c>a&&u<l)return}if(this.inventory.useSelectedItem()){e.setBlock(t,n,s),this.updateHotbarUI(),this.saveInventory();const a=this.getPlanetId(e);Ke.saveTileChange(a,t,n,s)}}placeTorch(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center);if(this.inventory.useSelectedItem()){this.torchManager.placeTorch(a,e.center,t),this.updateHotbarUI(),this.saveInventory();const l=this.getPlanetId(e);Ke.saveTorch(l,t,{x:a.x,y:a.y,z:a.z});const c=this.torchManager.getTorchDataForBaking();e.setTorchData(c),e.setTilesWithTorches(this.torchManager.getTilesWithTorches()),e.markTilesNearTorchDirty(a,N.TORCH_LIGHT_RANGE)}}async placeFurnace(e,t,n){if(this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.furnaceManager.placeFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const u=this.getPlanetId(e);Ke.saveFurnace(u,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,fuelAmount:c.fuelAmount,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount})}}}async placeStorageChest(e,t,n){if(this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.storageChestManager.placeChest(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const u=this.getPlanetId(e);Ke.saveStorageChest(u,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,slots:c.slots.map(h=>({itemType:h.itemType,quantity:h.quantity}))})}}}async placeSteamEngine(e,t,n){if(this.steamEngineManager.getSteamEngineAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.steamEngineManager.placeSteamEngine(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const u=this.getPlanetId(e);Ke.saveSteamEngine(u,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,hasFuel:!1,fuelAmount:0}),this.copperPipeManager.updatePipesNearTile(t)}}}async placeHydroGenerator(e,t,n){if(this.hydroGeneratorManager.getHydroGeneratorAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t)||this.steamEngineManager.getSteamEngineAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),o=e.getBlock(t,n);let a,l,c;if(o!==P.AIR&&o!==P.WATER){c=n;let p=!1,g=!1;for(let x=n+1;x<s;x++){const m=e.getBlock(t,x);if(m===P.WATER)p=!0;else if(m===P.AIR){p&&(a=x,g=!0);break}else break}if(!p||!g||(l=a-c-1,l<=0))return}else if(o===P.AIR){if(e.getBlock(t,n-1)!==P.WATER)return;a=n,l=0;for(let g=n-1;g>=0;g--)if(e.getBlock(t,g)===P.WATER)l++;else{c=g;break}}else if(o===P.WATER){a=n;for(let p=n+1;p<s;p++){const g=e.getBlock(t,p);if(g===P.AIR){a=p;break}else if(g!==P.WATER)return}l=0;for(let p=a-1;p>=0;p--)if(e.getBlock(t,p)===P.WATER)l++;else{c=p;break}if(l<=0)return}else return;const u=e.depthToRadius(a)-e.getBlockHeight(),d=i.center.clone().normalize().multiplyScalar(u).add(e.center),f=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const p=await this.hydroGeneratorManager.placeHydroGenerator(d,e.center,t,l*e.getBlockHeight(),f);if(this.updateHotbarUI(),this.saveInventory(),p){const g=this.getPlanetId(e);Ke.saveHydroGenerator(g,t,{position:{x:p.position.x,y:p.position.y,z:p.position.z},rotation:p.rotation,waterDepth:p.waterDepth}),this.copperPipeManager.updatePipesNearTile(t)}}}async placeCopperPipe(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),o=e.getBlock(t,n);let a=n,l;if(o===P.WATER){let h=n;for(let d=n+1;d<s;d++){const f=e.getBlock(t,d);if(f===P.AIR){h=d;break}else if(f!==P.WATER)return}a=h,l=e.depthToRadius(a)-e.getBlockHeight()}else if(o!==P.AIR){let h=!1,d=n;for(let f=n+1;f<s;f++){const p=e.getBlock(t,f);if(p===P.WATER)h=!0;else if(p===P.AIR){h&&(d=f);break}else break}h?(a=d,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight()}else o===P.AIR&&e.getBlock(t,n-1)===P.WATER?(a=n,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight();if(this.copperPipeManager.getPipeAt(t,a))return;const u=i.center.clone().normalize().multiplyScalar(l).add(e.center);if(this.inventory.useSelectedItem()){const h=await this.copperPipeManager.placePipe(u,t,a);if(this.updateHotbarUI(),this.saveInventory(),h){const d=this.getPlanetId(e);Ke.saveCopperPipe(d,t,a,{position:{x:h.position.x,y:h.position.y,z:h.position.z}})}}}async placeCable(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),o=e.getBlock(t,n);let a=n,l;if(o===P.WATER){let h=n;for(let d=n+1;d<s;d++){const f=e.getBlock(t,d);if(f===P.AIR){h=d;break}else if(f!==P.WATER)return}a=h,l=e.depthToRadius(a)-e.getBlockHeight()}else P.AIR,l=e.depthToRadius(n)-e.getBlockHeight();if(this.cableNodeManager.getCableAt(t,a))return;const u=i.center.clone().normalize().multiplyScalar(l).add(e.center);if(this.inventory.useSelectedItem()){const h=await this.cableNodeManager.placeCable(u,t,a);if(this.updateHotbarUI(),this.saveInventory(),h){const d=this.getPlanetId(e);Ke.saveCable(d,t,a,{position:{x:h.position.x,y:h.position.y,z:h.position.z}})}}}async placeElectricFurnace(e,t,n){if(this.electricFurnaceManager.getElectricFurnaceAtTile(t)||this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.electricFurnaceManager.placeElectricFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const u=this.getPlanetId(e);Ke.saveElectricFurnace(u,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount})}}}pickupTorch(e){let t=e.parent;for(;t&&!(t instanceof Gt);)t=t.parent;if(t instanceof Gt){const i=this.torchManager.getPlacedTorches().find(s=>s.group===t);if(i){const s=i.position.clone();Ke.removeTorch({x:i.position.x,y:i.position.y,z:i.position.z}),this.torchManager.removeTorch(i),this.inventory.addItem(k.TORCH,1),this.updateHotbarUI(),this.saveInventory();const o=this.torchManager.getTorchDataForBaking(),a=this.torchManager.getTilesWithTorches();for(const l of this.planets)l.setTorchData(o),l.setTilesWithTorches(a),l.markTilesNearTorchDirty(s,N.TORCH_LIGHT_RANGE)}}}getInventory(){return this.inventory}getCraftingSystem(){return this.craftingSystem}getTorchManager(){return this.torchManager}setTreeManager(e){this.treeManager=e}getPlanetId(e){return this.planets.indexOf(e)===0?"earth":"moon"}getNeighborTileIndices(e){for(const t of this.planets){const n=t.getTileByIndex(e);if(n&&n.neighbors)return n.neighbors}return[]}saveInventory(){Ke.saveInventory(this.inventory.exportForSave())}saveSteamEngineStates(){const e=this.steamEngineManager.getPlacedSteamEngines();for(const t of e){let n="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(t.tileIndex)){n=s===0?"earth":"moon";break}const i=this.steamEngineUI.getEngineState(t.tileIndex);Ke.saveSteamEngine(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,hasFuel:(i==null?void 0:i.hasFuel)??!1,fuelAmount:(i==null?void 0:i.fuelAmount)??0})}}saveAllFurnaceStates(){const e=this.furnaceManager.getPlacedFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}Ke.saveFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,fuelAmount:t.fuelAmount,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}saveAllElectricFurnaceStates(){const e=this.electricFurnaceManager.getPlacedElectricFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}Ke.saveElectricFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}updateElectricFurnacePowerStatus(){const e=this.electricFurnaceManager.getPlacedElectricFurnaces();for(const t of e){const n=this.cableNodeManager.isElectricFurnaceConnectedToRunningSteamEngine(t.tileIndex,i=>{if(!this.steamEngineManager.getSteamEngineAtTile(i))return!1;const o=this.steamEngineUI.getEngineState(i);return(o==null?void 0:o.isRunning)??!1});this.electricFurnaceManager.setFurnacePowered(t.tileIndex,n)}}saveAllStorageStates(){const e=this.storageChestManager.getPlacedChests();for(const n of e){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}Ke.saveStorageChest(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},rotation:n.rotation,slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}const t=this.garbagePileManager.getPlacedPiles();for(const n of t){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}Ke.saveGarbagePile(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}}loadSavedData(){const e=Ke.load();if(!e)return;e.inventory&&e.inventory.length>0&&(this.inventory.importFromSave(e.inventory),this.updateHotbarUI());for(const h of this.planets){const d=this.getPlanetId(h),f=Ke.getTileChangesForPlanet(d);for(const p of f)h.setBlock(p.tileIndex,p.depth,p.blockType)}const t=Ke.getTorches();for(const h of t){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z);this.torchManager.placeTorch(f,d.center,h.tileIndex)}}if(t.length>0){const h=this.torchManager.getTorchDataForBaking(),d=this.torchManager.getTilesWithTorches();for(const f of this.planets)f.setTorchData(h),f.setTilesWithTorches(d);for(const f of t){const p=new R(f.position.x,f.position.y,f.position.z);for(const g of this.planets)g.markTilesNearTorchDirty(p,N.TORCH_LIGHT_RANGE)}}const n=Ke.getFurnaces();for(const h of n){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z);this.furnaceManager.restoreFurnace(f,d.center,h.tileIndex,h.rotation).then(p=>{p&&(p.fuelAmount=h.fuelAmount,p.smeltingItem=h.smeltingItem,p.smeltingProgress=h.smeltingProgress,p.inputCount=h.inputCount??0,p.outputItem=h.outputItem,p.outputCount=h.outputCount)})}}const i=Ke.getStorageChests();for(const h of i){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z),p=h.slots.map(g=>({itemType:g.itemType,quantity:g.quantity}));this.storageChestManager.restoreChest(f,d.center,h.tileIndex,h.rotation,p)}}const s=Ke.getGarbagePiles();for(const h of s){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z),p=h.slots.map(g=>({itemType:g.itemType,quantity:g.quantity}));this.garbagePileManager.restorePile(f,d.center,h.tileIndex,p)}}const o=Ke.getSteamEngines();for(const h of o){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z);this.steamEngineManager.restoreSteamEngine(f,d.center,h.tileIndex,h.rotation),this.steamEngineUI.restoreState(h.tileIndex,{hasFuel:h.hasFuel??!1,fuelAmount:h.fuelAmount??0,isRunning:!1,waterInput:0,steamOutput:0})}}const a=Ke.getHydroGenerators();for(const h of a){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z);this.hydroGeneratorManager.restoreHydroGenerator(f,d.center,h.tileIndex,h.rotation,h.waterDepth)}}const l=Ke.getCopperPipes();for(const h of l)if(this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId)){const f=new R(h.position.x,h.position.y,h.position.z);this.copperPipeManager.restorePipe(f,h.tileIndex,h.depth)}this.copperPipeManager.rebuildAllConnections();const c=Ke.getCables();for(const h of c)if(this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId)){const f=new R(h.position.x,h.position.y,h.position.z);this.cableNodeManager.restoreCable(f,h.tileIndex,h.depth)}this.cableNodeManager.rebuildAllConnections();const u=Ke.getElectricFurnaces();for(const h of u){const d=this.planets.find((f,p)=>(p===0?"earth":"moon")===h.planetId);if(d){const f=new R(h.position.x,h.position.y,h.position.z);this.electricFurnaceManager.restoreElectricFurnace(f,d.center,h.tileIndex,h.rotation).then(p=>{p&&(p.smeltingItem=h.smeltingItem,p.smeltingProgress=h.smeltingProgress,p.inputCount=h.inputCount,p.outputItem=h.outputItem,p.outputCount=h.outputCount)})}}console.log(`Loaded save: ${e.tileChanges.length} tile changes, ${t.length} torches, ${n.length} furnaces, ${u.length} electric furnaces, ${i.length} chests, ${s.length} piles, ${o.length} steam engines, ${a.length} hydro generators, ${l.length} copper pipes, ${c.length} cables, inventory restored`)}registerTechBlocksWithRegistry(){En.registerManager({type:"Furnace",getBlocks:()=>this.furnaceManager.getPlacedFurnaces().map(e=>({type:"Furnace",id:`furnace-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.smeltingItem!==null&&e.fuelAmount>0?`Smelting ${Math.round(e.smeltingProgress*100)}%`:e.smeltingItem!==null&&e.fuelAmount===0?"No Fuel":e.outputCount>0?`Output: ${e.outputCount}`:"Idle",openUI:()=>{this.furnaceUI.open(e),this.craftingSystem.open()}}))}),En.registerManager({type:"Steam Engine",getBlocks:()=>this.steamEngineManager.getPlacedSteamEngines().map(e=>{const t=this.steamEngineUI.getEngineState(e.tileIndex);return{type:"Steam Engine",id:`steam-engine-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>t!=null&&t.isRunning?`Running (${t.steamOutput.toFixed(1)} steam/s)`:t!=null&&t.hasFuel&&t.waterInput===0?"No Water":t!=null&&t.hasFuel?"Idle":"No Fuel",openUI:()=>{this.steamEngineUI.open(e),this.craftingSystem.open()}}})}),En.registerManager({type:"Hydro Generator",getBlocks:()=>this.hydroGeneratorManager.getPlacedHydroGenerators().map(e=>({type:"Hydro Generator",id:`hydro-generator-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.isActive?`Active (${e.waterPumpedOut.toFixed(1)} water/s)`:"Inactive",openUI:()=>{this.hydroGeneratorUI.open(e),this.craftingSystem.open()}}))}),En.registerManager({type:"Storage Chest",getBlocks:()=>this.storageChestManager.getPlacedChests().map(e=>{const t=e.slots.filter(n=>n.itemType!==k.NONE).length;return{type:"Storage Chest",id:`storage-chest-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>t===0?"Empty":`${t}/27 slots`,openUI:()=>{this.storageUI.open(e),this.craftingSystem.open()}}})}),En.registerManager({type:"Copper Pipe",getBlocks:()=>this.copperPipeManager.getPlacedPipes().map(e=>{const t=this.copperPipeManager.getPipeNetwork(e.id);return{type:"Copper Pipe",id:`copper-pipe-${e.tileIndex}-${e.depth}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>{if(!t)return"Disconnected";const n=t.connectedHydroGenerators.length>0,i=t.connectedSteamEngines.length>0;return n&&i?"Network Active":n||i?"Partial":`${t.pipes.length} pipes`},openUI:()=>{this.copperPipeUI.openPipe(e,t)}}})}),En.registerManager({type:"Electric Furnace",getBlocks:()=>this.electricFurnaceManager.getPlacedElectricFurnaces().map(e=>({type:"Electric Furnace",id:`electric-furnace-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.smeltingItem!==null&&e.isPowered?`Smelting ${Math.round(e.smeltingProgress*100)}%`:e.smeltingItem!==null&&!e.isPowered?"No Power":e.outputCount>0?`Output: ${e.outputCount}`:e.isPowered?"Powered":"No Power",openUI:()=>{this.electricFurnaceUI.open(e),this.craftingSystem.open()}}))}),En.registerManager({type:"Cable",getBlocks:()=>this.cableNodeManager.getPlacedCables().map(e=>{const t=this.cableNodeManager.getCableNetwork(e.id);return{type:"Cable",id:`cable-${e.tileIndex}-${e.depth}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>{if(!t)return"Disconnected";const n=t.connectedSteamEngines.length>0,i=t.connectedElectricFurnaces.length>0;return n&&i?"Network Active":n||i?"Partial":`${t.cables.length} cables`},openUI:()=>{}}})})}}let bg=class{constructor(e){v(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const Xs={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function vl(r,e){return new qe({uniforms:{baseColor:{value:r},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Transform normal to world space (not view space)
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform vec3 baseColor;
      uniform vec3 sunDirection;
      uniform float ambientIntensity;
      uniform float directionalIntensity;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Calculate surface normal (direction from planet center)
        // Trees are placed relative to planet center at origin or offset
        // Use world position normalized as approximation of planet surface normal
        vec3 surfaceNormal = normalize(vWorldPosition);

        // Check if this side of planet faces the sun
        // dot > 0 means facing sun, dot < 0 means in shadow
        float planetSunFacing = dot(surfaceNormal, sunDirection);

        // Smooth transition at terminator (day/night boundary)
        float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);

        // Standard Lambert diffuse lighting on the mesh itself
        float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

        // Combine: directional light only applies if planet surface faces sun
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
        float ambient = ambientIntensity;

        vec3 finalColor = baseColor * (ambient + directional);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `})}class Tg{constructor(e){v(this,"trunkMaterial");v(this,"leavesMaterial");v(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize(),this.trunkMaterial=vl(new Oe(9127187),this.sunDirection),this.leavesMaterial=vl(new Oe(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...Xs,...n},s=new Gt,o=[],a=new Oe(9127187),l=new Oe(2263842),c=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6);this.addVertexColors(c,a),o.push(c);let u=i.trunkHeight,h=i.leafBaseRadius;for(let m=0;m<i.leafLayers;m++){const _=new Qs(h,1.2,6);_.translate(0,u+1.2/2,0),this.addVertexColors(_,l),o.push(_),u+=1.2*.6,h*=i.leafTaper}const d=jl(o),f=this.createMergedTreeMaterial(),p=new Ae(d,f);p.userData.isTree=!0,p.userData.treeType="trunk",s.add(p);for(const m of o)m.dispose();const g=new R(0,1,0),x=new Ze().setFromUnitVectors(g,t.clone().normalize());return s.quaternion.copy(x),s.position.copy(e),s}addVertexColors(e,t){const n=e.attributes.position.count,i=new Float32Array(n*3);for(let s=0;s<n;s++)i[s*3]=t.r,i[s*3+1]=t.g,i[s*3+2]=t.b;e.setAttribute("color",new Tt(i,3))}createMergedTreeMaterial(){return new qe({uniforms:{sunDirection:{value:this.sunDirection.clone().normalize()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vColor = color;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 surfaceNormal = normalize(vWorldPosition);
          float planetSunFacing = dot(surfaceNormal, sunDirection);
          float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
          float meshDiffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = meshDiffuse * shadowFactor * directionalIntensity;
          float ambient = ambientIntensity;
          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `})}createHexagonalPrism(e,t,n){const i=new Ri(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class Eg{constructor(e,t){v(this,"trees",[]);v(this,"treesByTile",new Map);v(this,"treeBuilder");v(this,"scene");this.scene=e,this.treeBuilder=new Tg(t)}addTree(e,t,n,i){const s=e.clone().sub(t).normalize(),o=this.treeBuilder.createTree(e,s,n);return i!==void 0&&(o.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(o)),this.trees.push(o),this.scene.add(o),o}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),s=i.indexOf(e);s>=0&&i.splice(s,1)}e.traverse(i=>{i instanceof Ae&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Ae&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,s,o=N.TERRAIN_SEED,a,l,c){const u=new bg(o+54321);let h=0,d=0;const f=n*5,p=new Set;for(;h<n&&d<f;){d++;const g=u.next()*Math.PI*2,x=Math.acos(2*u.next()-1);let m=new R(Math.sin(x)*Math.cos(g),Math.sin(x)*Math.sin(g),Math.cos(x)).normalize();const y=a?a(m):null;if(y!==null&&(p.has(y)||c!=null&&c.has(y)))continue;if(l){const L=l(m);L&&(m=L.clone().sub(e).normalize())}if(s&&s(m))continue;const _=i(m),C=e.clone().add(m.clone().multiplyScalar(_));y!==null&&p.add(y);const b=.5+u.next()*1,S=.6+u.next()*.9,A={trunkHeight:Xs.trunkHeight*b*S,trunkRadius:Xs.trunkRadius*b,leafBaseRadius:Xs.leafBaseRadius*b,leafLayers:Math.floor(2+u.next()*4),leafTaper:.6+u.next()*.2};this.addTree(C,e,A,y??void 0),h++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const s of n)s.visible=i}}setAllVisible(e){for(const t of this.trees)t.visible=e}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var Mg=`varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Cg=`precision highp float;

uniform vec3 planetCenter;
uniform float planetRadius;
uniform float atmosphereRadius;
uniform vec3 sunDirection;
uniform vec3 viewerPosition;

uniform float rayleighScale;      
uniform float mieScale;           
uniform float mieG;               
uniform float sunIntensity;       

uniform int numSamples;           
uniform int numLightSamples;      

varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359
#define MAX_SAMPLES 16
#define MAX_LIGHT_SAMPLES 8

const vec3 wavelengthsInv4 = vec3(5.602, 9.473, 19.644); 

const float scaleHeight = 0.25; 

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float rayleighPhase(float cosTheta) {
  return 0.75 * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
}

vec2 raySphereIntersect(vec3 ro, vec3 rd, vec3 center, float radius) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float disc = b * b - c;

  if (disc < 0.0) return vec2(-1.0);

  float sqrtDisc = sqrt(disc);
  return vec2(-b - sqrtDisc, -b + sqrtDisc);
}

float getDensity(float altitude) {
  return exp(-altitude / scaleHeight);
}

float opticalDepth(vec3 rayOrigin, vec3 rayDir, float rayLength) {
  float stepSize = rayLength / float(numLightSamples);
  float depth = 0.0;

  for (int i = 0; i < MAX_LIGHT_SAMPLES; i++) {
    if (i >= numLightSamples) break;
    vec3 samplePos = rayOrigin + rayDir * (stepSize * (float(i) + 0.5));
    float altitude = (length(samplePos - planetCenter) - planetRadius) / (atmosphereRadius - planetRadius);
    altitude = clamp(altitude, 0.0, 1.0);
    depth += getDensity(altitude) * stepSize;
  }

  return depth;
}

void main() {
  vec3 rayOrigin = viewerPosition;
  vec3 rayDir = normalize(vWorldPosition - viewerPosition);

  
  vec2 atmosHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, atmosphereRadius);

  if (atmosHit.y < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  
  float rayStart = max(0.0, atmosHit.x);
  float rayEnd = atmosHit.y;

  
  vec2 planetHit = raySphereIntersect(rayOrigin, rayDir, planetCenter, planetRadius);
  if (planetHit.x > 0.0) {
    rayEnd = min(rayEnd, planetHit.x);
  }

  if (rayStart >= rayEnd) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float rayLength = rayEnd - rayStart;
  float stepSize = rayLength / float(numSamples);

  
  vec3 sunDir = normalize(sunDirection);

  
  float dither = hash(gl_FragCoord.xy) * 0.5;

  
  vec3 rayleighSum = vec3(0.0);
  vec3 mieSum = vec3(0.0);
  float opticalDepthR = 0.0;
  float opticalDepthM = 0.0;

  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (i >= numSamples) break;
    
    vec3 samplePos = rayOrigin + rayDir * (rayStart + stepSize * (float(i) + dither));
    float height = length(samplePos - planetCenter);

    
    if (height < planetRadius) continue;

    
    float altitude = (height - planetRadius) / (atmosphereRadius - planetRadius);
    altitude = clamp(altitude, 0.0, 1.0);

    
    float localDensity = getDensity(altitude);

    
    float segmentDepthR = localDensity * stepSize;
    float segmentDepthM = localDensity * stepSize;
    opticalDepthR += segmentDepthR;
    opticalDepthM += segmentDepthM;

    
    vec2 sunPlanetHit = raySphereIntersect(samplePos, sunDir, planetCenter, planetRadius);
    if (sunPlanetHit.x > 0.0) continue; 

    
    vec2 sunAtmosHit = raySphereIntersect(samplePos, sunDir, planetCenter, atmosphereRadius);
    float sunRayLength = max(0.0, sunAtmosHit.y);

    
    float sunOpticalDepth = opticalDepth(samplePos, sunDir, sunRayLength);

    
    
    vec3 tauR = rayleighScale * wavelengthsInv4 * (opticalDepthR + sunOpticalDepth);
    
    vec3 tauM = vec3(mieScale * (opticalDepthM + sunOpticalDepth));

    vec3 attenuation = exp(-(tauR + tauM));

    
    rayleighSum += localDensity * attenuation * stepSize;
    mieSum += localDensity * attenuation * stepSize;
  }

  
  rayleighSum *= rayleighScale * wavelengthsInv4;
  mieSum *= mieScale;

  
  float cosTheta = dot(rayDir, sunDir);
  float phaseR = rayleighPhase(cosTheta);
  float phaseM = miePhase(cosTheta, mieG);

  
  vec3 color = sunIntensity * (rayleighSum * phaseR + mieSum * phaseM);

  
  color = 1.0 - exp(-color);

  
  float alpha = clamp(length(color) * 1.5, 0.0, 0.95);

  gl_FragColor = vec4(color, alpha);
}`;function Ag(r){const e=r.planetRadius*N.ATMOSPHERE_RADIUS_MULT,t=r.planetRadius-N.ATMOSPHERE_SURFACE_OFFSET;return new qe({uniforms:{planetCenter:{value:new R(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:r.sunDirection.clone().normalize()},viewerPosition:{value:new R},rayleighScale:{value:N.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:N.ATMOSPHERE_MIE_SCALE},mieG:{value:N.ATMOSPHERE_MIE_G},sunIntensity:{value:N.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:N.ATMOSPHERE_SAMPLES},numLightSamples:{value:N.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:Mg,fragmentShader:Cg,transparent:!0,side:Bt,depthWrite:!1,blending:Wr})}class wg{constructor(e){v(this,"mesh");v(this,"material");const t=e.planetRadius*N.ATMOSPHERE_RADIUS_MULT,n=new es(t,64,48);this.material=Ag(e),this.mesh=new Ae(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function Ig(r,e){return new wg({planetRadius:r,sunDirection:e})}var Rg=`varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Pg=`precision highp float;

uniform vec3 sunDirection;
uniform vec3 cloudColor;
uniform vec3 shadowColor;
uniform float ambientIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  
  float diffuse = max(0.0, dot(vNormal, sunDirection));

  
  vec3 color = mix(shadowColor, cloudColor, diffuse * (1.0 - ambientIntensity) + ambientIntensity);

  
  float alpha = 0.9;

  gl_FragColor = vec4(color, alpha);
}`;const Dg={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class Lg{constructor(e){v(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function Fg(r,e,t,n){const i=[],s=[],o=[],a=r.clone().sub(t).normalize();let l=new R(1,0,0);Math.abs(a.dot(l))>.9&&(l=new R(0,0,1));const c=new R().crossVectors(a,l).normalize(),u=new R().crossVectors(c,a).normalize(),h=3+Math.floor(n.next()*4);for(let f=0;f<h;f++){const p=(n.next()-.5)*e*.8,g=(n.next()-.5)*e*.4,x=(n.next()-.5)*e*.8,m=r.clone().addScaledVector(c,p).addScaledVector(a,g).addScaledVector(u,x),y=e*(.3+n.next()*.4);Og(i,s,o,m,y,a,c,u)}if(i.length===0)return null;const d=new pt;return d.setAttribute("position",new Ue(i,3)),d.setAttribute("normal",new Ue(s,3)),d.setIndex(o),d.computeBoundingSphere(),d}function Og(r,e,t,n,i,s,o,a){const l=i/2,c=[];for(let h=0;h<8;h++){const d=h&1?l:-l,f=h&2?l:-l,p=h&4?l:-l,g=n.clone().addScaledVector(o,d).addScaledVector(s,f).addScaledVector(a,p);c.push(g)}const u=[{verts:[0,1,3,2],normal:a.clone().negate()},{verts:[4,6,7,5],normal:a.clone()},{verts:[0,2,6,4],normal:o.clone().negate()},{verts:[1,5,7,3],normal:o.clone()},{verts:[0,4,5,1],normal:s.clone().negate()},{verts:[2,3,7,6],normal:s.clone()}];for(const h of u){const d=r.length/3;for(const f of h.verts){const p=c[f];r.push(p.x,p.y,p.z),e.push(h.normal.x,h.normal.y,h.normal.z)}t.push(d,d+1,d+2,d,d+2,d+3)}}function Ng(r){return new qe({uniforms:{sunDirection:{value:r.clone().normalize()},cloudColor:{value:new Oe(16777215)},shadowColor:{value:new Oe(8947882)},ambientIntensity:{value:.4}},vertexShader:Rg,fragmentShader:Pg,transparent:!0,side:Yt,depthWrite:!0})}class Ug{constructor(e={},t){v(this,"clouds");v(this,"material");v(this,"config");v(this,"cloudMesh",null);this.config={...Dg,...e},this.clouds=new Gt,this.material=Ng(t),this.generateClouds()}generateClouds(){const e=new Lg(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity),i=[],s=[],o=[];let a=0;for(let l=0;l<n;l++){const c=e.next()*Math.PI*2,u=Math.acos(2*e.next()-1),h=(e.next()-.5)*this.config.cloudThickness,d=t+h,f=d*Math.sin(u)*Math.cos(c),p=d*Math.sin(u)*Math.sin(c),g=d*Math.cos(u),x=new R(f,p,g),m=new R(0,0,0),y=Fg(x,this.config.cloudScale*(.5+e.next()*.5),m,e);if(y){const _=y.attributes.position.array,C=y.attributes.normal.array,b=y.index.array;for(let S=0;S<_.length;S++)i.push(_[S]);for(let S=0;S<C.length;S++)s.push(C[S]);for(let S=0;S<b.length;S++)o.push(b[S]+a);a+=_.length/3,y.dispose()}}if(i.length>0){const l=new pt;l.setAttribute("position",new Ue(i,3)),l.setAttribute("normal",new Ue(s,3)),l.setIndex(o),l.computeBoundingSphere(),this.cloudMesh=new Ae(l,this.material),this.clouds.add(this.cloudMesh)}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function kg(r,e){return new Ug({planetRadius:r,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:N.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:N.CLOUD_ROTATION_SPEED},e)}class Gg{constructor(){v(this,"steps",new Map);v(this,"totalWeight",0);v(this,"completedWeight",0);v(this,"onProgressCallbacks",[]);v(this,"onCompleteCallbacks",[]);v(this,"currentStatus","Initializing...")}registerStep(e,t=1){this.steps.has(e)||(this.steps.set(e,{name:e,weight:t,completed:!1}),this.totalWeight+=t)}completeStep(e){const t=this.steps.get(e);!t||t.completed||(t.completed=!0,this.completedWeight+=t.weight,this.notifyProgress(),this.completedWeight>=this.totalWeight&&this.notifyComplete())}setStatus(e){this.currentStatus=e,this.notifyProgress()}getProgress(){return this.totalWeight===0?0:Math.min(100,Math.round(this.completedWeight/this.totalWeight*100))}isComplete(){return this.completedWeight>=this.totalWeight&&this.totalWeight>0}onProgress(e){this.onProgressCallbacks.push(e),e(this.getProgress(),this.currentStatus)}onComplete(e){this.onCompleteCallbacks.push(e),this.isComplete()&&e()}updateDOM(){const e=document.getElementById("loading-progress-bar"),t=document.getElementById("loading-status"),n=document.getElementById("loading-percentage"),i=this.getProgress();e&&(e.style.width=`${i}%`),t&&(t.textContent=this.currentStatus),n&&(n.textContent=`${i}%`)}hideLoadingScreen(){const e=document.getElementById("loading-screen");e&&(e.classList.add("hidden"),setTimeout(()=>{e.style.display="none"},500));const t=document.getElementById("instructions");t&&(t.style.display="block")}notifyProgress(){const e=this.getProgress();this.updateDOM();for(const t of this.onProgressCallbacks)t(e,this.currentStatus)}notifyComplete(){for(const e of this.onCompleteCallbacks)e()}reset(){this.steps.clear(),this.totalWeight=0,this.completedWeight=0,this.currentStatus="Initializing..."}}const Nt=new Gg;class Bg{constructor(){v(this,"engine");v(this,"inputManager");v(this,"earth");v(this,"moon");v(this,"player");v(this,"blockInteraction");v(this,"treeManager");v(this,"earthAtmosphere",null);v(this,"earthClouds",null);v(this,"isReady",!1);v(this,"elapsedTime",0);v(this,"waterUpdateTimer",0);v(this,"WATER_UPDATE_INTERVAL",5);v(this,"sharedFrustum",new ss);v(this,"projScreenMatrix",new ft);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");e.addEventListener("contextmenu",n=>n.preventDefault()),this.engine=new km(e),this.inputManager=new Fm,this.earth=new fl(this.engine.scene,100,N.EARTH_SUBDIVISIONS),this.moon=new fl(this.engine.scene,50,N.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,Pt.init(),Pt.setOnMenuCloseCallback(()=>{this.inputManager.resetMouseButtons()});let t=!1;document.addEventListener("keydown",n=>{if(n.key==="Escape"){const i=document.getElementById("instructions"),s=(i==null?void 0:i.style.display)==="block";Pt.isAnyMenuOpen()||s&&(t=!0,n.preventDefault())}}),document.addEventListener("keyup",n=>{n.key==="Escape"&&t&&(t=!1,e==null||e.requestPointerLock())}),this.inputManager.setPointerLockCallback(n=>{const i=document.getElementById("instructions");i&&(!n&&Pt.isAnyMenuOpen()?i.style.display="none":i.style.display=n?"none":"block");const s=document.getElementById("crosshair");s&&(s.style.display=n?"block":"none")}),this.init()}async init(){try{Nt.registerStep("textures",1),Nt.registerStep("terrain-generation",2),Nt.registerStep("initial-terrain",3),Nt.registerStep("player-setup",1),Nt.registerStep("environment",1),Nt.setStatus("Loading textures..."),await this.earth.initialize(),await this.moon.initialize(),Nt.completeStep("textures"),Nt.setStatus("Generating terrain..."),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),Nt.completeStep("terrain-generation"),Nt.setStatus("Building terrain around spawn...");const e=this.earth.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,1);await this.earth.buildInitialTerrain(e),Nt.completeStep("initial-terrain"),Nt.setStatus("Initializing player..."),this.player=new Km(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new Sg([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new Eg(this.engine.scene,this.engine.sunDirection),Ke.load();const t=Ke.getRemovedTrees("earth"),n=new Set(t.map(s=>s.tileIndex));this.treeManager.scatterTrees(this.earth.center,this.earth.radius,N.TREE_COUNT,s=>this.earth.getSurfaceHeightInDirection(s),s=>this.earth.isUnderwaterInDirection(s),N.TERRAIN_SEED,s=>this.earth.getTileIndexInDirection(s),s=>this.earth.getTileCenterInDirection(s),n),this.blockInteraction.setTreeManager(this.treeManager),Nt.completeStep("player-setup"),this.inputManager.setInventoryToggleCallback(()=>{this.blockInteraction.getCraftingSystem().toggle()}),this.inputManager.setPauseToggleCallback(()=>{const s=document.getElementById("instructions"),o=document.getElementById("mobile-controls");if(s){const a=s.style.display!=="none";s.style.display=a?"none":"block",o&&(o.style.display=a?"block":"none")}}),Nt.setStatus("Creating environment..."),N.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=Ig(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=kg(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection),Nt.completeStep("environment");const i=this.earth.getWaterShaderMaterial();i&&this.engine.registerWaterMaterial(i),this.earth.setWaterMeshCallback((s,o)=>{o?this.engine.registerWaterMesh(s):this.engine.unregisterWaterMesh(s)}),this.setupSettingsMenu(),Se.setFrameSpikeThreshold(N.FRAME_SPIKE_THRESHOLD_MS),this.loadSavedGame(),Ke.setPlayerSaveCallback(()=>this.player.exportForSave()),Ke.startAutoSave(5),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),Nt.setStatus("Ready!"),Nt.hideLoadingScreen(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,Se.begin("Player"),this.player.update(e),Se.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),Se.begin("Block Interaction");const t=this.inputManager.getState(),n=this.inputManager.isLocked(),i=this.inputManager.getWheelDelta();this.blockInteraction.update(e,n&&t.leftClick,n&&t.rightClick,n?i:0),Se.end("Block Interaction"),Se.begin("Frustum Calc"),this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix,this.engine.camera.matrixWorldInverse),this.sharedFrustum.setFromProjectionMatrix(this.projScreenMatrix),Se.end("Frustum Calc"),Se.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera,e,this.sharedFrustum),Se.end("Earth Update"),Se.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera,e,this.sharedFrustum),Se.end("Moon Update");const s=this.player.getIsInWater();if(this.earth.updateWaterShader(this.elapsedTime,s),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.waterUpdateTimer+=e,this.waterUpdateTimer>=this.WATER_UPDATE_INTERVAL){this.waterUpdateTimer=0;const o=this.earth.getVisibleTileIndices(),a=this.earth.updateWaterFlow(o);a>0&&console.log(`[Water update] Fixed ${a} water blocks in ${o.size} tiles`)}this.earth.isInOrbitView()?this.treeManager.setAllVisible(!1):this.treeManager.setAllVisible(!0)}setupSettingsMenu(){var c;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),s=document.getElementById("teleport-select"),o=document.querySelectorAll(".menu-tab");if(o.forEach(u=>{u.addEventListener("click",()=>{o.forEach(f=>f.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(f=>f.classList.remove("active")),u.classList.add("active");const h=u.getAttribute("data-tab"),d=document.getElementById(`tab-${h}`);d&&d.classList.add("active")})}),!e||!t)return;e.checked=((c=this.earthAtmosphere)==null?void 0:c.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=N.DEBUG_JETPACK_ENABLED,this.player.setJetpackEnabled(N.DEBUG_JETPACK_ENABLED),n.addEventListener("change",()=>{N.DEBUG_JETPACK_ENABLED=n.checked,this.player.setJetpackEnabled(n.checked)}));const a=document.getElementById("toggle-bypass-crafting");a&&(a.checked=N.DEBUG_BYPASS_CRAFTING_INGREDIENTS,a.addEventListener("change",()=>{N.DEBUG_BYPASS_CRAFTING_INGREDIENTS=a.checked})),i&&(i.checked=N.INVERT_Y_AXIS,i.addEventListener("change",()=>{N.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),s&&s.addEventListener("change",()=>{this.teleportToPlanet(s.value)});const l=document.getElementById("reset-game-btn");l&&l.addEventListener("click",()=>{confirm("Are you sure you want to reset your game? This will delete all saved progress.")&&(Ke.stopAutoSave(),Ke.clearSave(),window.location.reload())})}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1;let i;if(e==="earth")i=t.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,n);else{const s=new R(-1,0,0),o=t.getSurfaceHeightInDirection(s);i=t.center.clone(),i.x-=o+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}loadSavedGame(){const e=Ke.load();if(!e){console.log("No saved game found, starting fresh");return}if(this.blockInteraction.loadSavedData(),e.player&&e.player.position){const t=e.player.position;Math.sqrt(t.x*t.x+t.y*t.y+t.z*t.z)>50&&(this.player.importFromSave(e.player),console.log(`Loaded player position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`))}console.log("Game loaded from save")}}document.addEventListener("DOMContentLoaded",()=>{new Bg});
//# sourceMappingURL=index-CqgkJAcf.js.map
