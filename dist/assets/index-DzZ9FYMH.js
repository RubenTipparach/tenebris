var ac=Object.defineProperty;var lc=(o,e,t)=>e in o?ac(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var y=(o,e,t)=>lc(o,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function t(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=t(i);fetch(i.href,s)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ko="181",cc=0,ra=1,hc=2,_l=1,bl=2,Mn=3,zn=0,Bt=1,Yt=2,An=0,ri=1,Wr=2,oa=3,aa=4,uc=5,Qn=100,dc=101,fc=102,pc=103,mc=104,gc=200,xc=201,yc=202,vc=203,Vr=204,qr=205,_c=206,bc=207,Sc=208,Tc=209,Ec=210,Mc=211,Cc=212,Ac=213,wc=214,Xr=0,$r=1,Yr=2,Ei=3,Kr=4,jr=5,Jr=6,Zr=7,Go=0,Ic=1,Rc=2,Bn=0,Pc=1,Dc=2,Lc=3,Oc=4,Fc=5,Nc=6,Uc=7,Sl=300,Mi=301,Ci=302,Qr=303,eo=304,Js=306,In=1e3,Ct=1001,to=1002,ct=1003,kc=1004,as=1005,rn=1006,or=1007,si=1008,gn=1009,Tl=1010,El=1011,Ki=1012,Bo=1013,Hn=1014,Cn=1015,Pi=1016,zo=1017,Ho=1018,ji=1020,Ml=35902,Cl=35899,Al=1021,wl=1022,un=1023,Ai=1026,Ji=1027,Il=1028,Wo=1029,Vo=1030,qo=1031,Xo=1033,Ns=33776,Us=33777,ks=33778,Gs=33779,no=35840,io=35841,so=35842,ro=35843,oo=36196,ao=37492,lo=37496,co=37808,ho=37809,uo=37810,fo=37811,po=37812,mo=37813,go=37814,xo=37815,yo=37816,vo=37817,_o=37818,bo=37819,So=37820,To=37821,Eo=36492,Mo=36494,Co=36495,Ao=36283,wo=36284,Io=36285,Ro=36286,Gc=3200,Bc=3201,Rl=0,zc=1,kn="",sn="srgb",wi="srgb-linear",$s="linear",yt="srgb",li=7680,la=519,Hc=512,Wc=513,Vc=514,Pl=515,qc=516,Xc=517,$c=518,Yc=519,ca=35044,ha="300 es",mn=2e3,Ys=2001;function Dl(o){for(let e=o.length-1;e>=0;--e)if(o[e]>=65535)return!0;return!1}function Zi(o){return document.createElementNS("http://www.w3.org/1999/xhtml",o)}function Kc(){const o=Zi("canvas");return o.style.display="block",o}const ua={};function da(...o){const e="THREE."+o.shift();console.log(e,...o)}function Qe(...o){const e="THREE."+o.shift();console.warn(e,...o)}function It(...o){const e="THREE."+o.shift();console.error(e,...o)}function Qi(...o){const e=o.join(" ");e in ua||(ua[e]=!0,Qe(...o))}function jc(o,e,t){return new Promise(function(n,i){function s(){switch(o.clientWaitSync(e,o.SYNC_FLUSH_COMMANDS_BIT,0)){case o.WAIT_FAILED:i();break;case o.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}class Di{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let s=0,r=i.length;s<r;s++)i[s].call(this,e);e.target=null}}}const Ut=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],ar=Math.PI/180,Po=180/Math.PI;function ts(){const o=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ut[o&255]+Ut[o>>8&255]+Ut[o>>16&255]+Ut[o>>24&255]+"-"+Ut[e&255]+Ut[e>>8&255]+"-"+Ut[e>>16&15|64]+Ut[e>>24&255]+"-"+Ut[t&63|128]+Ut[t>>8&255]+"-"+Ut[t>>16&255]+Ut[t>>24&255]+Ut[n&255]+Ut[n>>8&255]+Ut[n>>16&255]+Ut[n>>24&255]).toLowerCase()}function lt(o,e,t){return Math.max(e,Math.min(t,o))}function Jc(o,e){return(o%e+e)%e}function lr(o,e,t){return(1-t)*o+t*e}function Fi(o,e){switch(e.constructor){case Float32Array:return o;case Uint32Array:return o/4294967295;case Uint16Array:return o/65535;case Uint8Array:return o/255;case Int32Array:return Math.max(o/2147483647,-1);case Int16Array:return Math.max(o/32767,-1);case Int8Array:return Math.max(o/127,-1);default:throw new Error("Invalid component type.")}}function $t(o,e){switch(e.constructor){case Float32Array:return o;case Uint32Array:return Math.round(o*4294967295);case Uint16Array:return Math.round(o*65535);case Uint8Array:return Math.round(o*255);case Int32Array:return Math.round(o*2147483647);case Int16Array:return Math.round(o*32767);case Int8Array:return Math.round(o*127);default:throw new Error("Invalid component type.")}}class ht{constructor(e=0,t=0){ht.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(lt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,r=this.y-e.y;return this.x=s*n-r*i+e.x,this.y=s*i+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class je{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,r,a){let l=n[i+0],c=n[i+1],h=n[i+2],d=n[i+3],u=s[r+0],f=s[r+1],p=s[r+2],m=s[r+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d;return}if(a>=1){e[t+0]=u,e[t+1]=f,e[t+2]=p,e[t+3]=m;return}if(d!==m||l!==u||c!==f||h!==p){let x=l*u+c*f+h*p+d*m;x<0&&(u=-u,f=-f,p=-p,m=-m,x=-x);let g=1-a;if(x<.9995){const v=Math.acos(x),_=Math.sin(v);g=Math.sin(g*v)/_,a=Math.sin(a*v)/_,l=l*g+u*a,c=c*g+f*a,h=h*g+p*a,d=d*g+m*a}else{l=l*g+u*a,c=c*g+f*a,h=h*g+p*a,d=d*g+m*a;const v=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=v,c*=v,h*=v,d*=v}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,i,s,r){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],d=s[r],u=s[r+1],f=s[r+2],p=s[r+3];return e[t]=a*p+h*d+l*f-c*u,e[t+1]=l*p+h*u+c*d-a*f,e[t+2]=c*p+h*f+a*u-l*d,e[t+3]=h*p-a*d-l*u-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,s=e._z,r=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),d=a(s/2),u=l(n/2),f=l(i/2),p=l(s/2);switch(r){case"XYZ":this._x=u*h*d+c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d+u*f*p;break;case"YZX":this._x=u*h*d+c*f*p,this._y=c*f*d+u*h*p,this._z=c*h*p-u*f*d,this._w=c*h*d-u*f*p;break;case"XZY":this._x=u*h*d-c*f*p,this._y=c*f*d-u*h*p,this._z=c*h*p+u*f*d,this._w=c*h*d+u*f*p;break;default:Qe("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],s=t[8],r=t[1],a=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=n+a+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(r-i)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(i+r)/f,this._z=(s+c)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(s-c)/f,this._x=(i+r)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(r-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(lt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,s=e._z,r=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+r*a+i*c-s*l,this._y=i*h+r*l+s*a-n*c,this._z=s*h+r*c+n*l-i*a,this._w=r*h-n*a-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,s=e._z,r=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,s=-s,r=-r,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+r*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+r*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class R{constructor(e=0,t=0,n=0){R.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(fa.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(fa.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=e.elements,r=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*r,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*r,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*r,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,s=e.x,r=e.y,a=e.z,l=e.w,c=2*(r*i-a*n),h=2*(a*t-s*i),d=2*(s*n-r*t);return this.x=t+l*c+r*d-a*h,this.y=n+l*h+a*c-s*d,this.z=i+l*d+s*h-r*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this.z=lt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this.z=lt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,s=e.z,r=t.x,a=t.y,l=t.z;return this.x=i*l-s*a,this.y=s*r-n*l,this.z=n*a-i*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return cr.copy(this).projectOnVector(e),this.sub(cr)}reflect(e){return this.sub(cr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(lt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const cr=new R,fa=new je;class nt{constructor(e,t,n,i,s,r,a,l,c){nt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,r,a,l,c)}set(e,t,n,i,s,r,a,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=s,h[5]=l,h[6]=n,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,r=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],m=i[0],x=i[3],g=i[6],v=i[1],_=i[4],C=i[7],S=i[2],b=i[5],w=i[8];return s[0]=r*m+a*v+l*S,s[3]=r*x+a*_+l*b,s[6]=r*g+a*C+l*w,s[1]=c*m+h*v+d*S,s[4]=c*x+h*_+d*b,s[7]=c*g+h*C+d*w,s[2]=u*m+f*v+p*S,s[5]=u*x+f*_+p*b,s[8]=u*g+f*C+p*w,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*r*h-t*a*c-n*s*h+n*a*l+i*s*c-i*r*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=h*r-a*c,u=a*l-h*s,f=c*s-r*l,p=t*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const m=1/p;return e[0]=d*m,e[1]=(i*c-h*n)*m,e[2]=(a*n-i*r)*m,e[3]=u*m,e[4]=(h*t-i*l)*m,e[5]=(i*s-a*t)*m,e[6]=f*m,e[7]=(n*l-c*t)*m,e[8]=(r*t-n*s)*m,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,r,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*r+c*a)+r+e,-i*c,i*l,-i*(-c*r+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(hr.makeScale(e,t)),this}rotate(e){return this.premultiply(hr.makeRotation(-e)),this}translate(e,t){return this.premultiply(hr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const hr=new nt,pa=new nt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ma=new nt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Zc(){const o={enabled:!0,workingColorSpace:wi,spaces:{},convert:function(i,s,r){return this.enabled===!1||s===r||!s||!r||(this.spaces[s].transfer===yt&&(i.r=wn(i.r),i.g=wn(i.g),i.b=wn(i.b)),this.spaces[s].primaries!==this.spaces[r].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===yt&&(i.r=Ti(i.r),i.g=Ti(i.g),i.b=Ti(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===kn?$s:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,r){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[r].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return Qi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),o.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return Qi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),o.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return o.define({[wi]:{primaries:e,whitePoint:n,transfer:$s,toXYZ:pa,fromXYZ:ma,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:sn},outputColorSpaceConfig:{drawingBufferColorSpace:sn}},[sn]:{primaries:e,whitePoint:n,transfer:yt,toXYZ:pa,fromXYZ:ma,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:sn}}}),o}const dt=Zc();function wn(o){return o<.04045?o*.0773993808:Math.pow(o*.9478672986+.0521327014,2.4)}function Ti(o){return o<.0031308?o*12.92:1.055*Math.pow(o,.41666)-.055}let ci;class Qc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ci===void 0&&(ci=Zi("canvas")),ci.width=e.width,ci.height=e.height;const i=ci.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=ci}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Zi("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let r=0;r<s.length;r++)s[r]=wn(s[r]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(wn(t[n]/255)*255):t[n]=wn(t[n]);return{data:t,width:e.width,height:e.height}}else return Qe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let eh=0;class $o{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:eh++}),this.uuid=ts(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let r=0,a=i.length;r<a;r++)i[r].isDataTexture?s.push(ur(i[r].image)):s.push(ur(i[r]))}else s=ur(i);n.url=s}return t||(e.images[this.uuid]=n),n}}function ur(o){return typeof HTMLImageElement<"u"&&o instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&o instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&o instanceof ImageBitmap?Qc.getDataURL(o):o.data?{data:Array.from(o.data),width:o.width,height:o.height,type:o.data.constructor.name}:(Qe("Texture: Unable to serialize Texture."),{})}let th=0;const dr=new R;class zt extends Di{constructor(e=zt.DEFAULT_IMAGE,t=zt.DEFAULT_MAPPING,n=Ct,i=Ct,s=rn,r=si,a=un,l=gn,c=zt.DEFAULT_ANISOTROPY,h=kn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:th++}),this.uuid=ts(),this.name="",this.source=new $o(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=r,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ht(0,0),this.repeat=new ht(1,1),this.center=new ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new nt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(dr).x}get height(){return this.source.getSize(dr).y}get depth(){return this.source.getSize(dr).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Qe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Qe(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Sl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case In:e.x=e.x-Math.floor(e.x);break;case Ct:e.x=e.x<0?0:1;break;case to:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case In:e.y=e.y-Math.floor(e.y);break;case Ct:e.y=e.y<0?0:1;break;case to:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}zt.DEFAULT_IMAGE=null;zt.DEFAULT_MAPPING=Sl;zt.DEFAULT_ANISOTROPY=1;class vt{constructor(e=0,t=0,n=0,i=1){vt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i+r[12]*s,this.y=r[1]*t+r[5]*n+r[9]*i+r[13]*s,this.z=r[2]*t+r[6]*n+r[10]*i+r[14]*s,this.w=r[3]*t+r[7]*n+r[11]*i+r[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s;const l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],p=l[9],m=l[2],x=l[6],g=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-m)<.01&&Math.abs(p-x)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+m)<.1&&Math.abs(p+x)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,C=(f+1)/2,S=(g+1)/2,b=(h+u)/4,w=(d+m)/4,O=(p+x)/4;return _>C&&_>S?_<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(_),i=b/n,s=w/n):C>S?C<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(C),n=b/i,s=O/i):S<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(S),n=w/s,i=O/s),this.set(n,i,s,t),this}let v=Math.sqrt((x-p)*(x-p)+(d-m)*(d-m)+(u-h)*(u-h));return Math.abs(v)<.001&&(v=1),this.x=(x-p)/v,this.y=(d-m)/v,this.z=(u-h)/v,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=lt(this.x,e.x,t.x),this.y=lt(this.y,e.y,t.y),this.z=lt(this.z,e.z,t.z),this.w=lt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=lt(this.x,e,t),this.y=lt(this.y,e,t),this.z=lt(this.z,e,t),this.w=lt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(lt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class nh extends Di{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:rn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new vt(0,0,e,t),this.scissorTest=!1,this.viewport=new vt(0,0,e,t);const i={width:e,height:t,depth:n.depth},s=new zt(i);this.textures=[];const r=n.count;for(let a=0;a<r;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:rn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new $o(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Wn extends nh{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Ll extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ct,this.minFilter=ct,this.wrapR=Ct,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class ih extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ct,this.minFilter=ct,this.wrapR=Ct,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ns{constructor(e=new R(1/0,1/0,1/0),t=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(an.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(an.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=an.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let r=0,a=s.count;r<a;r++)e.isMesh===!0?e.getVertexPosition(r,an):an.fromBufferAttribute(s,r),an.applyMatrix4(e.matrixWorld),this.expandByPoint(an);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ls.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ls.copy(n.boundingBox)),ls.applyMatrix4(e.matrixWorld),this.union(ls)}const i=e.children;for(let s=0,r=i.length;s<r;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,an),an.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ni),cs.subVectors(this.max,Ni),hi.subVectors(e.a,Ni),ui.subVectors(e.b,Ni),di.subVectors(e.c,Ni),Dn.subVectors(ui,hi),Ln.subVectors(di,ui),Xn.subVectors(hi,di);let t=[0,-Dn.z,Dn.y,0,-Ln.z,Ln.y,0,-Xn.z,Xn.y,Dn.z,0,-Dn.x,Ln.z,0,-Ln.x,Xn.z,0,-Xn.x,-Dn.y,Dn.x,0,-Ln.y,Ln.x,0,-Xn.y,Xn.x,0];return!fr(t,hi,ui,di,cs)||(t=[1,0,0,0,1,0,0,0,1],!fr(t,hi,ui,di,cs))?!1:(hs.crossVectors(Dn,Ln),t=[hs.x,hs.y,hs.z],fr(t,hi,ui,di,cs))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,an).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(an).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(vn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),vn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),vn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),vn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),vn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),vn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),vn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),vn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(vn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const vn=[new R,new R,new R,new R,new R,new R,new R,new R],an=new R,ls=new ns,hi=new R,ui=new R,di=new R,Dn=new R,Ln=new R,Xn=new R,Ni=new R,cs=new R,hs=new R,$n=new R;function fr(o,e,t,n,i){for(let s=0,r=o.length-3;s<=r;s+=3){$n.fromArray(o,s);const a=i.x*Math.abs($n.x)+i.y*Math.abs($n.y)+i.z*Math.abs($n.z),l=e.dot($n),c=t.dot($n),h=n.dot($n);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const sh=new ns,Ui=new R,pr=new R;class oi{constructor(e=new R,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):sh.setFromPoints(e).getCenter(n);let i=0;for(let s=0,r=e.length;s<r;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ui.subVectors(e,this.center);const t=Ui.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Ui,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(pr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ui.copy(e.center).add(pr)),this.expandByPoint(Ui.copy(e.center).sub(pr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const _n=new R,mr=new R,us=new R,On=new R,gr=new R,ds=new R,xr=new R;class Zs{constructor(e=new R,t=new R(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,_n)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=_n.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(_n.copy(this.origin).addScaledVector(this.direction,t),_n.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){mr.copy(e).add(t).multiplyScalar(.5),us.copy(t).sub(e).normalize(),On.copy(this.origin).sub(mr);const s=e.distanceTo(t)*.5,r=-this.direction.dot(us),a=On.dot(this.direction),l=-On.dot(us),c=On.lengthSq(),h=Math.abs(1-r*r);let d,u,f,p;if(h>0)if(d=r*l-a,u=r*a-l,p=s*h,d>=0)if(u>=-p)if(u<=p){const m=1/h;d*=m,u*=m,f=d*(d+r*u+2*a)+u*(r*d+u+2*l)+c}else u=s,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*l)+c;else u=-s,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-p?(d=Math.max(0,-(-r*s+a)),u=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+u*(u+2*l)+c):u<=p?(d=0,u=Math.min(Math.max(-s,-l),s),f=u*(u+2*l)+c):(d=Math.max(0,-(r*s+a)),u=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+u*(u+2*l)+c);else u=r>0?-s:s,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(mr).addScaledVector(us,u),f}intersectSphere(e,t){_n.subVectors(e.center,this.origin);const n=_n.dot(this.direction),i=_n.dot(_n)-n*n,s=e.radius*e.radius;if(i>s)return null;const r=Math.sqrt(s-i),a=n-r,l=n+r;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,r,a,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,i=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,i=(e.min.x-u.x)*c),h>=0?(s=(e.min.y-u.y)*h,r=(e.max.y-u.y)*h):(s=(e.max.y-u.y)*h,r=(e.min.y-u.y)*h),n>r||s>i||((s>n||isNaN(n))&&(n=s),(r<i||isNaN(i))&&(i=r),d>=0?(a=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(a=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,_n)!==null}intersectTriangle(e,t,n,i,s){gr.subVectors(t,e),ds.subVectors(n,e),xr.crossVectors(gr,ds);let r=this.direction.dot(xr),a;if(r>0){if(i)return null;a=1}else if(r<0)a=-1,r=-r;else return null;On.subVectors(this.origin,e);const l=a*this.direction.dot(ds.crossVectors(On,ds));if(l<0)return null;const c=a*this.direction.dot(gr.cross(On));if(c<0||l+c>r)return null;const h=-a*On.dot(xr);return h<0?null:this.at(h/r,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class pt{constructor(e,t,n,i,s,r,a,l,c,h,d,u,f,p,m,x){pt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,r,a,l,c,h,d,u,f,p,m,x)}set(e,t,n,i,s,r,a,l,c,h,d,u,f,p,m,x){const g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=i,g[1]=s,g[5]=r,g[9]=a,g[13]=l,g[2]=c,g[6]=h,g[10]=d,g[14]=u,g[3]=f,g[7]=p,g[11]=m,g[15]=x,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new pt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/fi.setFromMatrixColumn(e,0).length(),s=1/fi.setFromMatrixColumn(e,1).length(),r=1/fi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,s=e.z,r=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const u=r*h,f=r*d,p=a*h,m=a*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=f+p*c,t[5]=u-m*c,t[9]=-a*l,t[2]=m-u*c,t[6]=p+f*c,t[10]=r*l}else if(e.order==="YXZ"){const u=l*h,f=l*d,p=c*h,m=c*d;t[0]=u+m*a,t[4]=p*a-f,t[8]=r*c,t[1]=r*d,t[5]=r*h,t[9]=-a,t[2]=f*a-p,t[6]=m+u*a,t[10]=r*l}else if(e.order==="ZXY"){const u=l*h,f=l*d,p=c*h,m=c*d;t[0]=u-m*a,t[4]=-r*d,t[8]=p+f*a,t[1]=f+p*a,t[5]=r*h,t[9]=m-u*a,t[2]=-r*c,t[6]=a,t[10]=r*l}else if(e.order==="ZYX"){const u=r*h,f=r*d,p=a*h,m=a*d;t[0]=l*h,t[4]=p*c-f,t[8]=u*c+m,t[1]=l*d,t[5]=m*c+u,t[9]=f*c-p,t[2]=-c,t[6]=a*l,t[10]=r*l}else if(e.order==="YZX"){const u=r*l,f=r*c,p=a*l,m=a*c;t[0]=l*h,t[4]=m-u*d,t[8]=p*d+f,t[1]=d,t[5]=r*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*d+p,t[10]=u-m*d}else if(e.order==="XZY"){const u=r*l,f=r*c,p=a*l,m=a*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+m,t[5]=r*h,t[9]=f*d-p,t[2]=p*d-f,t[6]=a*h,t[10]=m*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(rh,e,oh)}lookAt(e,t,n){const i=this.elements;return Jt.subVectors(e,t),Jt.lengthSq()===0&&(Jt.z=1),Jt.normalize(),Fn.crossVectors(n,Jt),Fn.lengthSq()===0&&(Math.abs(n.z)===1?Jt.x+=1e-4:Jt.z+=1e-4,Jt.normalize(),Fn.crossVectors(n,Jt)),Fn.normalize(),fs.crossVectors(Jt,Fn),i[0]=Fn.x,i[4]=fs.x,i[8]=Jt.x,i[1]=Fn.y,i[5]=fs.y,i[9]=Jt.y,i[2]=Fn.z,i[6]=fs.z,i[10]=Jt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,r=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],m=n[6],x=n[10],g=n[14],v=n[3],_=n[7],C=n[11],S=n[15],b=i[0],w=i[4],O=i[8],E=i[12],T=i[1],A=i[5],U=i[9],G=i[13],z=i[2],$=i[6],W=i[10],ee=i[14],q=i[3],ne=i[7],te=i[11],xe=i[15];return s[0]=r*b+a*T+l*z+c*q,s[4]=r*w+a*A+l*$+c*ne,s[8]=r*O+a*U+l*W+c*te,s[12]=r*E+a*G+l*ee+c*xe,s[1]=h*b+d*T+u*z+f*q,s[5]=h*w+d*A+u*$+f*ne,s[9]=h*O+d*U+u*W+f*te,s[13]=h*E+d*G+u*ee+f*xe,s[2]=p*b+m*T+x*z+g*q,s[6]=p*w+m*A+x*$+g*ne,s[10]=p*O+m*U+x*W+g*te,s[14]=p*E+m*G+x*ee+g*xe,s[3]=v*b+_*T+C*z+S*q,s[7]=v*w+_*A+C*$+S*ne,s[11]=v*O+_*U+C*W+S*te,s[15]=v*E+_*G+C*ee+S*xe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],r=e[1],a=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],f=e[14],p=e[3],m=e[7],x=e[11],g=e[15];return p*(+s*l*d-i*c*d-s*a*u+n*c*u+i*a*f-n*l*f)+m*(+t*l*f-t*c*u+s*r*u-i*r*f+i*c*h-s*l*h)+x*(+t*c*d-t*a*f-s*r*d+n*r*f+s*a*h-n*c*h)+g*(-i*a*h-t*l*d+t*a*u+i*r*d-n*r*u+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],r=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],f=e[11],p=e[12],m=e[13],x=e[14],g=e[15],v=d*x*c-m*u*c+m*l*f-a*x*f-d*l*g+a*u*g,_=p*u*c-h*x*c-p*l*f+r*x*f+h*l*g-r*u*g,C=h*m*c-p*d*c+p*a*f-r*m*f-h*a*g+r*d*g,S=p*d*l-h*m*l-p*a*u+r*m*u+h*a*x-r*d*x,b=t*v+n*_+i*C+s*S;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const w=1/b;return e[0]=v*w,e[1]=(m*u*s-d*x*s-m*i*f+n*x*f+d*i*g-n*u*g)*w,e[2]=(a*x*s-m*l*s+m*i*c-n*x*c-a*i*g+n*l*g)*w,e[3]=(d*l*s-a*u*s-d*i*c+n*u*c+a*i*f-n*l*f)*w,e[4]=_*w,e[5]=(h*x*s-p*u*s+p*i*f-t*x*f-h*i*g+t*u*g)*w,e[6]=(p*l*s-r*x*s-p*i*c+t*x*c+r*i*g-t*l*g)*w,e[7]=(r*u*s-h*l*s+h*i*c-t*u*c-r*i*f+t*l*f)*w,e[8]=C*w,e[9]=(p*d*s-h*m*s-p*n*f+t*m*f+h*n*g-t*d*g)*w,e[10]=(r*m*s-p*a*s+p*n*c-t*m*c-r*n*g+t*a*g)*w,e[11]=(h*a*s-r*d*s-h*n*c+t*d*c+r*n*f-t*a*f)*w,e[12]=S*w,e[13]=(h*m*i-p*d*i+p*n*u-t*m*u-h*n*x+t*d*x)*w,e[14]=(p*a*i-r*m*i-p*n*l+t*m*l+r*n*x-t*a*x)*w,e[15]=(r*d*i-h*a*i+h*n*l-t*d*l-r*n*u+t*a*u)*w,this}scale(e){const t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),s=1-n,r=e.x,a=e.y,l=e.z,c=s*r,h=s*a;return this.set(c*r+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*r,0,c*l-i*a,h*l+i*r,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,r){return this.set(1,n,s,0,e,1,r,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,s=t._x,r=t._y,a=t._z,l=t._w,c=s+s,h=r+r,d=a+a,u=s*c,f=s*h,p=s*d,m=r*h,x=r*d,g=a*d,v=l*c,_=l*h,C=l*d,S=n.x,b=n.y,w=n.z;return i[0]=(1-(m+g))*S,i[1]=(f+C)*S,i[2]=(p-_)*S,i[3]=0,i[4]=(f-C)*b,i[5]=(1-(u+g))*b,i[6]=(x+v)*b,i[7]=0,i[8]=(p+_)*w,i[9]=(x-v)*w,i[10]=(1-(u+m))*w,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let s=fi.set(i[0],i[1],i[2]).length();const r=fi.set(i[4],i[5],i[6]).length(),a=fi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],ln.copy(this);const c=1/s,h=1/r,d=1/a;return ln.elements[0]*=c,ln.elements[1]*=c,ln.elements[2]*=c,ln.elements[4]*=h,ln.elements[5]*=h,ln.elements[6]*=h,ln.elements[8]*=d,ln.elements[9]*=d,ln.elements[10]*=d,t.setFromRotationMatrix(ln),n.x=s,n.y=r,n.z=a,this}makePerspective(e,t,n,i,s,r,a=mn,l=!1){const c=this.elements,h=2*s/(t-e),d=2*s/(n-i),u=(t+e)/(t-e),f=(n+i)/(n-i);let p,m;if(l)p=s/(r-s),m=r*s/(r-s);else if(a===mn)p=-(r+s)/(r-s),m=-2*r*s/(r-s);else if(a===Ys)p=-r/(r-s),m=-r*s/(r-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,r,a=mn,l=!1){const c=this.elements,h=2/(t-e),d=2/(n-i),u=-(t+e)/(t-e),f=-(n+i)/(n-i);let p,m;if(l)p=1/(r-s),m=r/(r-s);else if(a===mn)p=-2/(r-s),m=-(r+s)/(r-s);else if(a===Ys)p=-1/(r-s),m=-s/(r-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const fi=new R,ln=new pt,rh=new R(0,0,0),oh=new R(1,1,1),Fn=new R,fs=new R,Jt=new R,ga=new pt,xa=new je;class en{constructor(e=0,t=0,n=0,i=en.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,s=i[0],r=i[4],a=i[8],l=i[1],c=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(lt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,s)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-lt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(lt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-lt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(lt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-lt(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Qe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ga.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ga,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xa.setFromEuler(this),this.setFromQuaternion(xa,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}en.DEFAULT_ORDER="XYZ";class Yo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let ah=0;const ya=new R,pi=new je,bn=new pt,ps=new R,ki=new R,lh=new R,ch=new je,va=new R(1,0,0),_a=new R(0,1,0),ba=new R(0,0,1),Sa={type:"added"},hh={type:"removed"},mi={type:"childadded",child:null},yr={type:"childremoved",child:null};class Dt extends Di{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ah++}),this.uuid=ts(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Dt.DEFAULT_UP.clone();const e=new R,t=new en,n=new je,i=new R(1,1,1);function s(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new pt},normalMatrix:{value:new nt}}),this.matrix=new pt,this.matrixWorld=new pt,this.matrixAutoUpdate=Dt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Yo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return pi.setFromAxisAngle(e,t),this.quaternion.multiply(pi),this}rotateOnWorldAxis(e,t){return pi.setFromAxisAngle(e,t),this.quaternion.premultiply(pi),this}rotateX(e){return this.rotateOnAxis(va,e)}rotateY(e){return this.rotateOnAxis(_a,e)}rotateZ(e){return this.rotateOnAxis(ba,e)}translateOnAxis(e,t){return ya.copy(e).applyQuaternion(this.quaternion),this.position.add(ya.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(va,e)}translateY(e){return this.translateOnAxis(_a,e)}translateZ(e){return this.translateOnAxis(ba,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(bn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ps.copy(e):ps.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),ki.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bn.lookAt(ki,ps,this.up):bn.lookAt(ps,ki,this.up),this.quaternion.setFromRotationMatrix(bn),i&&(bn.extractRotation(i.matrixWorld),pi.setFromRotationMatrix(bn),this.quaternion.premultiply(pi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(It("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Sa),mi.child=e,this.dispatchEvent(mi),mi.child=null):It("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(hh),yr.child=e,this.dispatchEvent(yr),yr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),bn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),bn.multiply(e.parent.matrixWorld)),e.applyMatrix4(bn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Sa),mi.child=e,this.dispatchEvent(mi),mi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,e,lh),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ki,ch,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let s=0,r=i.length;s<r;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));i.material=a}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(s(e.animations,l))}}if(t){const a=r(e.geometries),l=r(e.materials),c=r(e.textures),h=r(e.images),d=r(e.shapes),u=r(e.skeletons),f=r(e.animations),p=r(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}Dt.DEFAULT_UP=new R(0,1,0);Dt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const cn=new R,Sn=new R,vr=new R,Tn=new R,gi=new R,xi=new R,Ta=new R,_r=new R,br=new R,Sr=new R,Tr=new vt,Er=new vt,Mr=new vt;class hn{constructor(e=new R,t=new R,n=new R){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),cn.subVectors(e,t),i.cross(cn);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){cn.subVectors(i,t),Sn.subVectors(n,t),vr.subVectors(e,t);const r=cn.dot(cn),a=cn.dot(Sn),l=cn.dot(vr),c=Sn.dot(Sn),h=Sn.dot(vr),d=r*c-a*a;if(d===0)return s.set(0,0,0),null;const u=1/d,f=(c*l-a*h)*u,p=(r*h-a*l)*u;return s.set(1-f-p,p,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Tn)===null?!1:Tn.x>=0&&Tn.y>=0&&Tn.x+Tn.y<=1}static getInterpolation(e,t,n,i,s,r,a,l){return this.getBarycoord(e,t,n,i,Tn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Tn.x),l.addScaledVector(r,Tn.y),l.addScaledVector(a,Tn.z),l)}static getInterpolatedAttribute(e,t,n,i,s,r){return Tr.setScalar(0),Er.setScalar(0),Mr.setScalar(0),Tr.fromBufferAttribute(e,t),Er.fromBufferAttribute(e,n),Mr.fromBufferAttribute(e,i),r.setScalar(0),r.addScaledVector(Tr,s.x),r.addScaledVector(Er,s.y),r.addScaledVector(Mr,s.z),r}static isFrontFacing(e,t,n,i){return cn.subVectors(n,t),Sn.subVectors(e,t),cn.cross(Sn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return cn.subVectors(this.c,this.b),Sn.subVectors(this.a,this.b),cn.cross(Sn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return hn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return hn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return hn.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return hn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return hn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,s=this.c;let r,a;gi.subVectors(i,n),xi.subVectors(s,n),_r.subVectors(e,n);const l=gi.dot(_r),c=xi.dot(_r);if(l<=0&&c<=0)return t.copy(n);br.subVectors(e,i);const h=gi.dot(br),d=xi.dot(br);if(h>=0&&d<=h)return t.copy(i);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return r=l/(l-h),t.copy(n).addScaledVector(gi,r);Sr.subVectors(e,s);const f=gi.dot(Sr),p=xi.dot(Sr);if(p>=0&&f<=p)return t.copy(s);const m=f*c-l*p;if(m<=0&&c>=0&&p<=0)return a=c/(c-p),t.copy(n).addScaledVector(xi,a);const x=h*p-f*d;if(x<=0&&d-h>=0&&f-p>=0)return Ta.subVectors(s,i),a=(d-h)/(d-h+(f-p)),t.copy(i).addScaledVector(Ta,a);const g=1/(x+m+u);return r=m*g,a=u*g,t.copy(n).addScaledVector(gi,r).addScaledVector(xi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ol={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Nn={h:0,s:0,l:0},ms={h:0,s:0,l:0};function Cr(o,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?o+(e-o)*6*t:t<1/2?e:t<2/3?o+(e-o)*6*(2/3-t):o}class Ne{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=sn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,dt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=dt.workingColorSpace){return this.r=e,this.g=t,this.b=n,dt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=dt.workingColorSpace){if(e=Jc(e,1),t=lt(t,0,1),n=lt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,r=2*n-s;this.r=Cr(r,s,e+1/3),this.g=Cr(r,s,e),this.b=Cr(r,s,e-1/3)}return dt.colorSpaceToWorking(this,i),this}setStyle(e,t=sn){function n(s){s!==void 0&&parseFloat(s)<1&&Qe("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Qe("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=i[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(s,16),t);Qe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=sn){const n=Ol[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Qe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=wn(e.r),this.g=wn(e.g),this.b=wn(e.b),this}copyLinearToSRGB(e){return this.r=Ti(e.r),this.g=Ti(e.g),this.b=Ti(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=sn){return dt.workingToColorSpace(kt.copy(this),e),Math.round(lt(kt.r*255,0,255))*65536+Math.round(lt(kt.g*255,0,255))*256+Math.round(lt(kt.b*255,0,255))}getHexString(e=sn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=dt.workingColorSpace){dt.workingToColorSpace(kt.copy(this),t);const n=kt.r,i=kt.g,s=kt.b,r=Math.max(n,i,s),a=Math.min(n,i,s);let l,c;const h=(a+r)/2;if(a===r)l=0,c=0;else{const d=r-a;switch(c=h<=.5?d/(r+a):d/(2-r-a),r){case n:l=(i-s)/d+(i<s?6:0);break;case i:l=(s-n)/d+2;break;case s:l=(n-i)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=dt.workingColorSpace){return dt.workingToColorSpace(kt.copy(this),t),e.r=kt.r,e.g=kt.g,e.b=kt.b,e}getStyle(e=sn){dt.workingToColorSpace(kt.copy(this),e);const t=kt.r,n=kt.g,i=kt.b;return e!==sn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Nn),this.setHSL(Nn.h+e,Nn.s+t,Nn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Nn),e.getHSL(ms);const n=lr(Nn.h,ms.h,t),i=lr(Nn.s,ms.s,t),s=lr(Nn.l,ms.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const kt=new Ne;Ne.NAMES=Ol;let uh=0;class xn extends Di{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:uh++}),this.uuid=ts(),this.name="",this.type="Material",this.blending=ri,this.side=zn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Vr,this.blendDst=qr,this.blendEquation=Qn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ne(0,0,0),this.blendAlpha=0,this.depthFunc=Ei,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=la,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=li,this.stencilZFail=li,this.stencilZPass=li,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Qe(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Qe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ri&&(n.blending=this.blending),this.side!==zn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Vr&&(n.blendSrc=this.blendSrc),this.blendDst!==qr&&(n.blendDst=this.blendDst),this.blendEquation!==Qn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ei&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==la&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==li&&(n.stencilFail=this.stencilFail),this.stencilZFail!==li&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==li&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){const r=[];for(const a in s){const l=s[a];delete l.metadata,r.push(l)}return r}if(t){const s=i(e.textures),r=i(e.images);s.length>0&&(n.textures=s),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class is extends xn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ne(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new en,this.combine=Go,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Rt=new R,gs=new ht;let dh=0;class Tt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:dh++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=ca,this.updateRanges=[],this.gpuType=Cn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)gs.fromBufferAttribute(this,t),gs.applyMatrix3(e),this.setXY(t,gs.x,gs.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix3(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix4(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyNormalMatrix(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.transformDirection(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Fi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=$t(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Fi(t,this.array)),t}setX(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Fi(t,this.array)),t}setY(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Fi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Fi(t,this.array)),t}setW(e,t){return this.normalized&&(t=$t(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array),i=$t(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=$t(t,this.array),n=$t(n,this.array),i=$t(i,this.array),s=$t(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ca&&(e.usage=this.usage),e}}class Fl extends Tt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Nl extends Tt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ge extends Tt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let fh=0;const nn=new pt,Ar=new Dt,yi=new R,Zt=new ns,Gi=new ns,Ft=new R;class mt extends Di{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:fh++}),this.uuid=ts(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Dl(e)?Nl:Fl)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new nt().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return nn.makeRotationFromQuaternion(e),this.applyMatrix4(nn),this}rotateX(e){return nn.makeRotationX(e),this.applyMatrix4(nn),this}rotateY(e){return nn.makeRotationY(e),this.applyMatrix4(nn),this}rotateZ(e){return nn.makeRotationZ(e),this.applyMatrix4(nn),this}translate(e,t,n){return nn.makeTranslation(e,t,n),this.applyMatrix4(nn),this}scale(e,t,n){return nn.makeScale(e,t,n),this.applyMatrix4(nn),this}lookAt(e){return Ar.lookAt(e),Ar.updateMatrix(),this.applyMatrix4(Ar.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(yi).negate(),this.translate(yi.x,yi.y,yi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,s=e.length;i<s;i++){const r=e[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Ge(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&Qe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ns);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){It("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const s=t[n];Zt.setFromBufferAttribute(s),this.morphTargetsRelative?(Ft.addVectors(this.boundingBox.min,Zt.min),this.boundingBox.expandByPoint(Ft),Ft.addVectors(this.boundingBox.max,Zt.max),this.boundingBox.expandByPoint(Ft)):(this.boundingBox.expandByPoint(Zt.min),this.boundingBox.expandByPoint(Zt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&It('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new oi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){It("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(e){const n=this.boundingSphere.center;if(Zt.setFromBufferAttribute(e),t)for(let s=0,r=t.length;s<r;s++){const a=t[s];Gi.setFromBufferAttribute(a),this.morphTargetsRelative?(Ft.addVectors(Zt.min,Gi.min),Zt.expandByPoint(Ft),Ft.addVectors(Zt.max,Gi.max),Zt.expandByPoint(Ft)):(Zt.expandByPoint(Gi.min),Zt.expandByPoint(Gi.max))}Zt.getCenter(n);let i=0;for(let s=0,r=e.count;s<r;s++)Ft.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(Ft));if(t)for(let s=0,r=t.length;s<r;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Ft.fromBufferAttribute(a,c),l&&(yi.fromBufferAttribute(e,c),Ft.add(yi)),i=Math.max(i,n.distanceToSquared(Ft))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&It('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){It("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Tt(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),a=[],l=[];for(let O=0;O<n.count;O++)a[O]=new R,l[O]=new R;const c=new R,h=new R,d=new R,u=new ht,f=new ht,p=new ht,m=new R,x=new R;function g(O,E,T){c.fromBufferAttribute(n,O),h.fromBufferAttribute(n,E),d.fromBufferAttribute(n,T),u.fromBufferAttribute(s,O),f.fromBufferAttribute(s,E),p.fromBufferAttribute(s,T),h.sub(c),d.sub(c),f.sub(u),p.sub(u);const A=1/(f.x*p.y-p.x*f.y);isFinite(A)&&(m.copy(h).multiplyScalar(p.y).addScaledVector(d,-f.y).multiplyScalar(A),x.copy(d).multiplyScalar(f.x).addScaledVector(h,-p.x).multiplyScalar(A),a[O].add(m),a[E].add(m),a[T].add(m),l[O].add(x),l[E].add(x),l[T].add(x))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let O=0,E=v.length;O<E;++O){const T=v[O],A=T.start,U=T.count;for(let G=A,z=A+U;G<z;G+=3)g(e.getX(G+0),e.getX(G+1),e.getX(G+2))}const _=new R,C=new R,S=new R,b=new R;function w(O){S.fromBufferAttribute(i,O),b.copy(S);const E=a[O];_.copy(E),_.sub(S.multiplyScalar(S.dot(E))).normalize(),C.crossVectors(b,E);const A=C.dot(l[O])<0?-1:1;r.setXYZW(O,_.x,_.y,_.z,A)}for(let O=0,E=v.length;O<E;++O){const T=v[O],A=T.start,U=T.count;for(let G=A,z=A+U;G<z;G+=3)w(e.getX(G+0)),w(e.getX(G+1)),w(e.getX(G+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Tt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new R,s=new R,r=new R,a=new R,l=new R,c=new R,h=new R,d=new R;if(e)for(let u=0,f=e.count;u<f;u+=3){const p=e.getX(u+0),m=e.getX(u+1),x=e.getX(u+2);i.fromBufferAttribute(t,p),s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,x),h.subVectors(r,s),d.subVectors(i,s),h.cross(d),a.fromBufferAttribute(n,p),l.fromBufferAttribute(n,m),c.fromBufferAttribute(n,x),a.add(h),l.add(h),c.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(m,l.x,l.y,l.z),n.setXYZ(x,c.x,c.y,c.z)}else for(let u=0,f=t.count;u<f;u+=3)i.fromBufferAttribute(t,u+0),s.fromBufferAttribute(t,u+1),r.fromBufferAttribute(t,u+2),h.subVectors(r,s),d.subVectors(i,s),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Ft.fromBufferAttribute(e,t),Ft.normalize(),e.setXYZ(t,Ft.x,Ft.y,Ft.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h);let f=0,p=0;for(let m=0,x=l.length;m<x;m++){a.isInterleavedBufferAttribute?f=l[m]*a.data.stride+a.offset:f=l[m]*h;for(let g=0;g<h;g++)u[p++]=c[f++]}return new Tt(u,h,d)}if(this.index===null)return Qe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new mt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=e(u,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let a=0,l=r.length;a<l;a++){const c=r[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(e.data))}h.length>0&&(i[l]=h,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const s=e.morphAttributes;for(const c in s){const h=[],d=s[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let c=0,h=r.length;c<h;c++){const d=r[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ea=new pt,Yn=new Zs,xs=new oi,Ma=new R,ys=new R,vs=new R,_s=new R,wr=new R,bs=new R,Ca=new R,Ss=new R;class Ce extends Dt{constructor(e=new mt,t=new is){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,r=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(s&&a){bs.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=a[l],d=s[l];h!==0&&(wr.fromBufferAttribute(d,e),r?bs.addScaledVector(wr,h):bs.addScaledVector(wr.sub(t),h))}t.add(bs)}return t}raycast(e,t){const n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),xs.copy(n.boundingSphere),xs.applyMatrix4(s),Yn.copy(e.ray).recast(e.near),!(xs.containsPoint(Yn.origin)===!1&&(Yn.intersectSphere(xs,Ma)===null||Yn.origin.distanceToSquared(Ma)>(e.far-e.near)**2))&&(Ea.copy(s).invert(),Yn.copy(e.ray).applyMatrix4(Ea),!(n.boundingBox!==null&&Yn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Yn)))}_computeIntersections(e,t,n){let i;const s=this.geometry,r=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,d=s.attributes.normal,u=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(r))for(let p=0,m=u.length;p<m;p++){const x=u[p],g=r[x.materialIndex],v=Math.max(x.start,f.start),_=Math.min(a.count,Math.min(x.start+x.count,f.start+f.count));for(let C=v,S=_;C<S;C+=3){const b=a.getX(C),w=a.getX(C+1),O=a.getX(C+2);i=Ts(this,g,e,n,c,h,d,b,w,O),i&&(i.faceIndex=Math.floor(C/3),i.face.materialIndex=x.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),m=Math.min(a.count,f.start+f.count);for(let x=p,g=m;x<g;x+=3){const v=a.getX(x),_=a.getX(x+1),C=a.getX(x+2);i=Ts(this,r,e,n,c,h,d,v,_,C),i&&(i.faceIndex=Math.floor(x/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(r))for(let p=0,m=u.length;p<m;p++){const x=u[p],g=r[x.materialIndex],v=Math.max(x.start,f.start),_=Math.min(l.count,Math.min(x.start+x.count,f.start+f.count));for(let C=v,S=_;C<S;C+=3){const b=C,w=C+1,O=C+2;i=Ts(this,g,e,n,c,h,d,b,w,O),i&&(i.faceIndex=Math.floor(C/3),i.face.materialIndex=x.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),m=Math.min(l.count,f.start+f.count);for(let x=p,g=m;x<g;x+=3){const v=x,_=x+1,C=x+2;i=Ts(this,r,e,n,c,h,d,v,_,C),i&&(i.faceIndex=Math.floor(x/3),t.push(i))}}}}function ph(o,e,t,n,i,s,r,a){let l;if(e.side===Bt?l=n.intersectTriangle(r,s,i,!0,a):l=n.intersectTriangle(i,s,r,e.side===zn,a),l===null)return null;Ss.copy(a),Ss.applyMatrix4(o.matrixWorld);const c=t.ray.origin.distanceTo(Ss);return c<t.near||c>t.far?null:{distance:c,point:Ss.clone(),object:o}}function Ts(o,e,t,n,i,s,r,a,l,c){o.getVertexPosition(a,ys),o.getVertexPosition(l,vs),o.getVertexPosition(c,_s);const h=ph(o,e,t,n,ys,vs,_s,Ca);if(h){const d=new R;hn.getBarycoord(Ca,ys,vs,_s,d),i&&(h.uv=hn.getInterpolatedAttribute(i,a,l,c,d,new ht)),s&&(h.uv1=hn.getInterpolatedAttribute(s,a,l,c,d,new ht)),r&&(h.normal=hn.getInterpolatedAttribute(r,a,l,c,d,new R),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:l,c,normal:new R,materialIndex:0};hn.getNormal(ys,vs,_s,u.normal),h.face=u,h.barycoord=d}return h}class Ht extends mt{constructor(e=1,t=1,n=1,i=1,s=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:r};const a=this;i=Math.floor(i),s=Math.floor(s),r=Math.floor(r);const l=[],c=[],h=[],d=[];let u=0,f=0;p("z","y","x",-1,-1,n,t,e,r,s,0),p("z","y","x",1,-1,n,t,-e,r,s,1),p("x","z","y",1,1,e,n,t,i,r,2),p("x","z","y",1,-1,e,n,-t,i,r,3),p("x","y","z",1,-1,e,t,n,i,s,4),p("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Ge(c,3)),this.setAttribute("normal",new Ge(h,3)),this.setAttribute("uv",new Ge(d,2));function p(m,x,g,v,_,C,S,b,w,O,E){const T=C/w,A=S/O,U=C/2,G=S/2,z=b/2,$=w+1,W=O+1;let ee=0,q=0;const ne=new R;for(let te=0;te<W;te++){const xe=te*A-G;for(let ze=0;ze<$;ze++){const He=ze*T-U;ne[m]=He*v,ne[x]=xe*_,ne[g]=z,c.push(ne.x,ne.y,ne.z),ne[m]=0,ne[x]=0,ne[g]=b>0?1:-1,h.push(ne.x,ne.y,ne.z),d.push(ze/w),d.push(1-te/O),ee+=1}}for(let te=0;te<O;te++)for(let xe=0;xe<w;xe++){const ze=u+xe+$*te,He=u+xe+$*(te+1),be=u+(xe+1)+$*(te+1),Pe=u+(xe+1)+$*te;l.push(ze,He,Pe),l.push(He,be,Pe),q+=6}a.addGroup(f,q,E),f+=q,u+=ee}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ht(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ii(o){const e={};for(const t in o){e[t]={};for(const n in o[t]){const i=o[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(Qe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Vt(o){const e={};for(let t=0;t<o.length;t++){const n=Ii(o[t]);for(const i in n)e[i]=n[i]}return e}function mh(o){const e=[];for(let t=0;t<o.length;t++)e.push(o[t].clone());return e}function Ul(o){const e=o.getRenderTarget();return e===null?o.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:dt.workingColorSpace}const gh={clone:Ii,merge:Vt};var xh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,yh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class qe extends xn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=xh,this.fragmentShader=yh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ii(e.uniforms),this.uniformsGroups=mh(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?t.uniforms[i]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[i]={type:"m4",value:r.toArray()}:t.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class kl extends Dt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new pt,this.projectionMatrix=new pt,this.projectionMatrixInverse=new pt,this.coordinateSystem=mn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Un=new R,Aa=new ht,wa=new ht;class Qt extends kl{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Po*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ar*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Po*2*Math.atan(Math.tan(ar*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Un.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Un.x,Un.y).multiplyScalar(-e/Un.z),Un.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Un.x,Un.y).multiplyScalar(-e/Un.z)}getViewSize(e,t){return this.getViewBounds(e,Aa,wa),t.subVectors(wa,Aa)}setViewOffset(e,t,n,i,s,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ar*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,c=r.fullHeight;s+=r.offsetX*i/l,t-=r.offsetY*n/c,i*=r.width/l,n*=r.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const vi=-90,_i=1;class vh extends Dt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Qt(vi,_i,e,t);i.layers=this.layers,this.add(i);const s=new Qt(vi,_i,e,t);s.layers=this.layers,this.add(s);const r=new Qt(vi,_i,e,t);r.layers=this.layers,this.add(r);const a=new Qt(vi,_i,e,t);a.layers=this.layers,this.add(a);const l=new Qt(vi,_i,e,t);l.layers=this.layers,this.add(l);const c=new Qt(vi,_i,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,s,r,a,l]=t;for(const c of t)this.remove(c);if(e===mn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ys)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,r,a,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;const m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,s),e.setRenderTarget(n,1,i),e.render(t,r),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class Gl extends zt{constructor(e=[],t=Mi,n,i,s,r,a,l,c,h){super(e,t,n,i,s,r,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class _h extends Wn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Gl(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Ht(5,5,5),s=new qe({name:"CubemapFromEquirect",uniforms:Ii(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Bt,blending:An});s.uniforms.tEquirect.value=t;const r=new Ce(i,s),a=t.minFilter;return t.minFilter===si&&(t.minFilter=rn),new vh(1,10,this).update(e,r),t.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const s=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,n,i);e.setRenderTarget(s)}}class Gt extends Dt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const bh={type:"move"};class Ir{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Gt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Gt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Gt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,r=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){r=!0;for(const m of e.hand.values()){const x=t.getJointPose(m,n),g=this._getHandJoint(c,m);x!==null&&(g.matrix.fromArray(x.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=x.radius),g.visible=x!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;c.inputState.pinching&&u>f+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=f-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(bh)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Gt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Ko{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Ne(e),this.near=t,this.far=n}clone(){return new Ko(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Sh extends Dt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new en,this.environmentIntensity=1,this.environmentRotation=new en,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Th extends zt{constructor(e=null,t=1,n=1,i,s,r,a,l,c=ct,h=ct,d,u){super(null,r,a,l,c,h,i,s,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Rr=new R,Eh=new R,Mh=new nt;class Zn{constructor(e=new R(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Rr.subVectors(n,t).cross(Eh.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Rr),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Mh.getNormalMatrix(e),i=this.coplanarPoint(Rr).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Kn=new oi,Ch=new ht(.5,.5),Es=new R;class ss{constructor(e=new Zn,t=new Zn,n=new Zn,i=new Zn,s=new Zn,r=new Zn){this.planes=[e,t,n,i,s,r]}set(e,t,n,i,s,r){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(r),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=mn,n=!1){const i=this.planes,s=e.elements,r=s[0],a=s[1],l=s[2],c=s[3],h=s[4],d=s[5],u=s[6],f=s[7],p=s[8],m=s[9],x=s[10],g=s[11],v=s[12],_=s[13],C=s[14],S=s[15];if(i[0].setComponents(c-r,f-h,g-p,S-v).normalize(),i[1].setComponents(c+r,f+h,g+p,S+v).normalize(),i[2].setComponents(c+a,f+d,g+m,S+_).normalize(),i[3].setComponents(c-a,f-d,g-m,S-_).normalize(),n)i[4].setComponents(l,u,x,C).normalize(),i[5].setComponents(c-l,f-u,g-x,S-C).normalize();else if(i[4].setComponents(c-l,f-u,g-x,S-C).normalize(),t===mn)i[5].setComponents(c+l,f+u,g+x,S+C).normalize();else if(t===Ys)i[5].setComponents(l,u,x,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Kn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Kn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Kn)}intersectsSprite(e){Kn.center.set(0,0,0);const t=Ch.distanceTo(e.center);return Kn.radius=.7071067811865476+t,Kn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Kn)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Es.x=i.normal.x>0?e.max.x:e.min.x,Es.y=i.normal.y>0?e.max.y:e.min.y,Es.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Es)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Bl extends xn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ne(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Ks=new R,js=new R,Ia=new pt,Bi=new Zs,Ms=new oi,Pr=new R,Ra=new R;class Ah extends Dt{constructor(e=new mt,t=new Bl){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Ks.fromBufferAttribute(t,i-1),js.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Ks.distanceTo(js);e.setAttribute("lineDistance",new Ge(n,1))}else Qe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ms.copy(n.boundingSphere),Ms.applyMatrix4(i),Ms.radius+=s,e.ray.intersectsSphere(Ms)===!1)return;Ia.copy(i).invert(),Bi.copy(e.ray).applyMatrix4(Ia);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){const f=Math.max(0,r.start),p=Math.min(h.count,r.start+r.count);for(let m=f,x=p-1;m<x;m+=c){const g=h.getX(m),v=h.getX(m+1),_=Cs(this,e,Bi,l,g,v,m);_&&t.push(_)}if(this.isLineLoop){const m=h.getX(p-1),x=h.getX(f),g=Cs(this,e,Bi,l,m,x,p-1);g&&t.push(g)}}else{const f=Math.max(0,r.start),p=Math.min(u.count,r.start+r.count);for(let m=f,x=p-1;m<x;m+=c){const g=Cs(this,e,Bi,l,m,m+1,m);g&&t.push(g)}if(this.isLineLoop){const m=Cs(this,e,Bi,l,p-1,f,p-1);m&&t.push(m)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Cs(o,e,t,n,i,s,r){const a=o.geometry.attributes.position;if(Ks.fromBufferAttribute(a,i),js.fromBufferAttribute(a,s),t.distanceSqToSegment(Ks,js,Pr,Ra)>n)return;Pr.applyMatrix4(o.matrixWorld);const c=e.ray.origin.distanceTo(Pr);if(!(c<e.near||c>e.far))return{distance:c,point:Ra.clone().applyMatrix4(o.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:o}}const Pa=new R,Da=new R;class wh extends Ah{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)Pa.fromBufferAttribute(t,i),Da.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Pa.distanceTo(Da);e.setAttribute("lineDistance",new Ge(n,1))}else Qe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ih extends xn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ne(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const La=new pt,Do=new Zs,As=new oi,ws=new R;class Rh extends Dt{constructor(e=new mt,t=new Ih){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),As.copy(n.boundingSphere),As.applyMatrix4(i),As.radius+=s,e.ray.intersectsSphere(As)===!1)return;La.copy(i).invert(),Do.copy(e.ray).applyMatrix4(La);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){const u=Math.max(0,r.start),f=Math.min(c.count,r.start+r.count);for(let p=u,m=f;p<m;p++){const x=c.getX(p);ws.fromBufferAttribute(d,x),Oa(ws,x,l,i,e,t,this)}}else{const u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let p=u,m=f;p<m;p++)ws.fromBufferAttribute(d,p),Oa(ws,p,l,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=i.length;s<r;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Oa(o,e,t,n,i,s,r){const a=Do.distanceSqToPoint(o);if(a<t){const l=new R;Do.closestPointToPoint(o,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:r})}}class jo extends zt{constructor(e,t,n=Hn,i,s,r,a=ct,l=ct,c,h=Ai,d=1){if(h!==Ai&&h!==Ji)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,i,s,r,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new $o(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class zl extends zt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ri extends mt{constructor(e=1,t=1,n=1,i=32,s=1,r=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:s,openEnded:r,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const h=[],d=[],u=[],f=[];let p=0;const m=[],x=n/2;let g=0;v(),r===!1&&(e>0&&_(!0),t>0&&_(!1)),this.setIndex(h),this.setAttribute("position",new Ge(d,3)),this.setAttribute("normal",new Ge(u,3)),this.setAttribute("uv",new Ge(f,2));function v(){const C=new R,S=new R;let b=0;const w=(t-e)/n;for(let O=0;O<=s;O++){const E=[],T=O/s,A=T*(t-e)+e;for(let U=0;U<=i;U++){const G=U/i,z=G*l+a,$=Math.sin(z),W=Math.cos(z);S.x=A*$,S.y=-T*n+x,S.z=A*W,d.push(S.x,S.y,S.z),C.set($,w,W).normalize(),u.push(C.x,C.y,C.z),f.push(G,1-T),E.push(p++)}m.push(E)}for(let O=0;O<i;O++)for(let E=0;E<s;E++){const T=m[E][O],A=m[E+1][O],U=m[E+1][O+1],G=m[E][O+1];(e>0||E!==0)&&(h.push(T,A,G),b+=3),(t>0||E!==s-1)&&(h.push(A,U,G),b+=3)}c.addGroup(g,b,0),g+=b}function _(C){const S=p,b=new ht,w=new R;let O=0;const E=C===!0?e:t,T=C===!0?1:-1;for(let U=1;U<=i;U++)d.push(0,x*T,0),u.push(0,T,0),f.push(.5,.5),p++;const A=p;for(let U=0;U<=i;U++){const z=U/i*l+a,$=Math.cos(z),W=Math.sin(z);w.x=E*W,w.y=x*T,w.z=E*$,d.push(w.x,w.y,w.z),u.push(0,T,0),b.x=$*.5+.5,b.y=W*.5*T+.5,f.push(b.x,b.y),p++}for(let U=0;U<i;U++){const G=S+U,z=A+U;C===!0?h.push(z,z+1,G):h.push(z+1,z,G),O+=3}c.addGroup(g,O,C===!0?1:2),g+=O}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ri(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Qs extends Ri{constructor(e=1,t=1,n=32,i=1,s=!1,r=0,a=Math.PI*2){super(0,e,t,n,i,s,r,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:r,thetaLength:a}}static fromJSON(e){return new Qs(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class er extends mt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const s=e/2,r=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,d=e/a,u=t/l,f=[],p=[],m=[],x=[];for(let g=0;g<h;g++){const v=g*u-r;for(let _=0;_<c;_++){const C=_*d-s;p.push(C,-v,0),m.push(0,0,1),x.push(_/a),x.push(1-g/l)}}for(let g=0;g<l;g++)for(let v=0;v<a;v++){const _=v+c*g,C=v+c*(g+1),S=v+1+c*(g+1),b=v+1+c*g;f.push(_,C,b),f.push(C,S,b)}this.setIndex(f),this.setAttribute("position",new Ge(p,3)),this.setAttribute("normal",new Ge(m,3)),this.setAttribute("uv",new Ge(x,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new er(e.width,e.height,e.widthSegments,e.heightSegments)}}class es extends mt{constructor(e=1,t=32,n=16,i=0,s=Math.PI*2,r=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:r,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(r+a,Math.PI);let c=0;const h=[],d=new R,u=new R,f=[],p=[],m=[],x=[];for(let g=0;g<=n;g++){const v=[],_=g/n;let C=0;g===0&&r===0?C=.5/t:g===n&&l===Math.PI&&(C=-.5/t);for(let S=0;S<=t;S++){const b=S/t;d.x=-e*Math.cos(i+b*s)*Math.sin(r+_*a),d.y=e*Math.cos(r+_*a),d.z=e*Math.sin(i+b*s)*Math.sin(r+_*a),p.push(d.x,d.y,d.z),u.copy(d).normalize(),m.push(u.x,u.y,u.z),x.push(b+C,1-_),v.push(c++)}h.push(v)}for(let g=0;g<n;g++)for(let v=0;v<t;v++){const _=h[g][v+1],C=h[g][v],S=h[g+1][v],b=h[g+1][v+1];(g!==0||r>0)&&f.push(_,C,b),(g!==n-1||l<Math.PI)&&f.push(C,S,b)}this.setIndex(f),this.setAttribute("position",new Ge(p,3)),this.setAttribute("normal",new Ge(m,3)),this.setAttribute("uv",new Ge(x,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new es(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Fa extends xn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Ne(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ne(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Rl,this.normalScale=new ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new en,this.combine=Go,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Ph extends xn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Gc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Dh extends xn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Dr={enabled:!1,files:{},add:function(o,e){this.enabled!==!1&&(this.files[o]=e)},get:function(o){if(this.enabled!==!1)return this.files[o]},remove:function(o){delete this.files[o]},clear:function(){this.files={}}};class Lh{constructor(e,t,n){const i=this;let s=!1,r=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,s===!1&&i.onStart!==void 0&&i.onStart(h,r,a),s=!0},this.itemEnd=function(h){r++,i.onProgress!==void 0&&i.onProgress(h,r,a),r===a&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){const d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){const f=c[d],p=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Oh=new Lh;class Jo{constructor(e){this.manager=e!==void 0?e:Oh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Jo.DEFAULT_MATERIAL_NAME="__DEFAULT";const bi=new WeakMap;class Fh extends Jo{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,r=Dr.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(r),s.manager.itemEnd(e)},0);else{let d=bi.get(r);d===void 0&&(d=[],bi.set(r,d)),d.push({onLoad:t,onError:i})}return r}const a=Zi("img");function l(){h(),t&&t(this);const d=bi.get(this)||[];for(let u=0;u<d.length;u++){const f=d[u];f.onLoad&&f.onLoad(this)}bi.delete(this),s.manager.itemEnd(e)}function c(d){h(),i&&i(d),Dr.remove(`image:${e}`);const u=bi.get(this)||[];for(let f=0;f<u.length;f++){const p=u[f];p.onError&&p.onError(d)}bi.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Dr.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}}class yn extends Jo{constructor(e){super(e)}load(e,t,n,i){const s=new zt,r=new Fh(this.manager);return r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(a){s.image=a,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}}class tr extends Dt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ne(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Nh extends tr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ne(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Lr=new pt,Na=new R,Ua=new R;class Hl{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ht(512,512),this.mapType=gn,this.map=null,this.mapPass=null,this.matrix=new pt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ss,this._frameExtents=new ht(1,1),this._viewportCount=1,this._viewports=[new vt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Na.setFromMatrixPosition(e.matrixWorld),t.position.copy(Na),Ua.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ua),t.updateMatrixWorld(),Lr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Lr,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Lr)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const ka=new pt,zi=new R,Or=new R;class Uh extends Hl{constructor(){super(new Qt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ht(4,2),this._viewportCount=6,this._viewports=[new vt(2,1,1,1),new vt(0,1,1,1),new vt(3,1,1,1),new vt(1,1,1,1),new vt(3,0,1,1),new vt(1,0,1,1)],this._cubeDirections=[new R(1,0,0),new R(-1,0,0),new R(0,0,1),new R(0,0,-1),new R(0,1,0),new R(0,-1,0)],this._cubeUps=[new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,0,1),new R(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),zi.setFromMatrixPosition(e.matrixWorld),n.position.copy(zi),Or.copy(n.position),Or.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Or),n.updateMatrixWorld(),i.makeTranslation(-zi.x,-zi.y,-zi.z),ka.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ka,n.coordinateSystem,n.reversedDepth)}}class kh extends tr{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Uh}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Wl extends kl{constructor(e=-1,t=1,n=1,i=-1,s=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-e,r=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,r=s+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,r,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Gh extends Hl{constructor(){super(new Wl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Bh extends tr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.target=new Dt,this.shadow=new Gh}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class zh extends tr{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Hh extends Qt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Wh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Ga=new pt;class Vh{constructor(e,t,n=0,i=1/0){this.ray=new Zs(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Yo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):It("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ga.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ga),this}intersectObject(e,t=!0,n=[]){return Lo(e,this,n,t),n.sort(Ba),n}intersectObjects(e,t=!0,n=[]){for(let i=0,s=e.length;i<s;i++)Lo(e[i],this,n,t);return n.sort(Ba),n}}function Ba(o,e){return o.distance-e.distance}function Lo(o,e,t,n){let i=!0;if(o.layers.test(e.layers)&&o.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const s=o.children;for(let r=0,a=s.length;r<a;r++)Lo(s[r],e,t,!0)}}function za(o,e,t,n){const i=qh(n);switch(t){case Al:return o*e;case Il:return o*e/i.components*i.byteLength;case Wo:return o*e/i.components*i.byteLength;case Vo:return o*e*2/i.components*i.byteLength;case qo:return o*e*2/i.components*i.byteLength;case wl:return o*e*3/i.components*i.byteLength;case un:return o*e*4/i.components*i.byteLength;case Xo:return o*e*4/i.components*i.byteLength;case Ns:case Us:return Math.floor((o+3)/4)*Math.floor((e+3)/4)*8;case ks:case Gs:return Math.floor((o+3)/4)*Math.floor((e+3)/4)*16;case io:case ro:return Math.max(o,16)*Math.max(e,8)/4;case no:case so:return Math.max(o,8)*Math.max(e,8)/2;case oo:case ao:return Math.floor((o+3)/4)*Math.floor((e+3)/4)*8;case lo:return Math.floor((o+3)/4)*Math.floor((e+3)/4)*16;case co:return Math.floor((o+3)/4)*Math.floor((e+3)/4)*16;case ho:return Math.floor((o+4)/5)*Math.floor((e+3)/4)*16;case uo:return Math.floor((o+4)/5)*Math.floor((e+4)/5)*16;case fo:return Math.floor((o+5)/6)*Math.floor((e+4)/5)*16;case po:return Math.floor((o+5)/6)*Math.floor((e+5)/6)*16;case mo:return Math.floor((o+7)/8)*Math.floor((e+4)/5)*16;case go:return Math.floor((o+7)/8)*Math.floor((e+5)/6)*16;case xo:return Math.floor((o+7)/8)*Math.floor((e+7)/8)*16;case yo:return Math.floor((o+9)/10)*Math.floor((e+4)/5)*16;case vo:return Math.floor((o+9)/10)*Math.floor((e+5)/6)*16;case _o:return Math.floor((o+9)/10)*Math.floor((e+7)/8)*16;case bo:return Math.floor((o+9)/10)*Math.floor((e+9)/10)*16;case So:return Math.floor((o+11)/12)*Math.floor((e+9)/10)*16;case To:return Math.floor((o+11)/12)*Math.floor((e+11)/12)*16;case Eo:case Mo:case Co:return Math.ceil(o/4)*Math.ceil(e/4)*16;case Ao:case wo:return Math.ceil(o/4)*Math.ceil(e/4)*8;case Io:case Ro:return Math.ceil(o/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function qh(o){switch(o){case gn:case Tl:return{byteLength:1,components:1};case Ki:case El:case Pi:return{byteLength:2,components:1};case zo:case Ho:return{byteLength:2,components:4};case Hn:case Bo:case Cn:return{byteLength:4,components:1};case Ml:case Cl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${o}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ko}}));typeof window<"u"&&(window.__THREE__?Qe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ko);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Vl(){let o=null,e=!1,t=null,n=null;function i(s,r){t(s,r),n=o.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=o.requestAnimationFrame(i),e=!0)},stop:function(){o.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){o=s}}}function Xh(o){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,d=c.byteLength,u=o.createBuffer();o.bindBuffer(l,u),o.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=o.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=o.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=o.HALF_FLOAT:f=o.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=o.SHORT;else if(c instanceof Uint32Array)f=o.UNSIGNED_INT;else if(c instanceof Int32Array)f=o.INT;else if(c instanceof Int8Array)f=o.BYTE;else if(c instanceof Uint8Array)f=o.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=o.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){const h=l.array,d=l.updateRanges;if(o.bindBuffer(c,a),d.length===0)o.bufferSubData(c,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){const p=d[u],m=d[f];m.start<=p.start+p.count+1?p.count=Math.max(p.count,m.start+m.count-p.start):(++u,d[u]=m)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){const m=d[f];o.bufferSubData(c,m.start*h.BYTES_PER_ELEMENT,h,m.start,m.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(o.deleteBuffer(l.buffer),e.delete(a))}function r(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:s,update:r}}var $h=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Yh=`#ifdef USE_ALPHAHASH
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
#endif`,Kh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,jh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Jh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Zh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Qh=`#ifdef USE_AOMAP
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
#endif`,eu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,tu=`#ifdef USE_BATCHING
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
#endif`,nu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,iu=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,su=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ru=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,ou=`#ifdef USE_IRIDESCENCE
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
#endif`,au=`#ifdef USE_BUMPMAP
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
#endif`,lu=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,cu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,hu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,uu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,du=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,fu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,pu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,mu=`#if defined( USE_COLOR_ALPHA )
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
#endif`,gu=`#define PI 3.141592653589793
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
} // validated`,xu=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,yu=`vec3 transformedNormal = objectNormal;
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
#endif`,_u=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,bu=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Su=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Tu="gl_FragColor = linearToOutputTexel( gl_FragColor );",Eu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Mu=`#ifdef USE_ENVMAP
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
#endif`,Cu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Au=`#ifdef USE_ENVMAP
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
#endif`,wu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Iu=`#ifdef USE_ENVMAP
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
#endif`,Ru=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Pu=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Du=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Lu=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ou=`#ifdef USE_GRADIENTMAP
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
#endif`,Nu=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Uu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ku=`uniform bool receiveShadow;
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
#endif`,Gu=`#ifdef USE_ENVMAP
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
#endif`,Bu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,zu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Hu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Wu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Vu=`PhysicalMaterial material;
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
#endif`,qu=`uniform sampler2D dfgLUT;
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
}`,Xu=`
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
#endif`,$u=`#if defined( RE_IndirectDiffuse )
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
#endif`,Yu=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ku=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ju=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ju=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Zu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Qu=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ed=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,td=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,nd=`#if defined( USE_POINTS_UV )
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
#endif`,id=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,sd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,rd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,od=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ad=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ld=`#ifdef USE_MORPHTARGETS
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
#endif`,cd=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,hd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,ud=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,dd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,fd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,pd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,md=`#ifdef USE_NORMALMAP
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
#endif`,gd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,xd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,yd=`#ifdef USE_CLEARCOATMAP
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
#endif`,_d=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,bd=`vec3 packNormalToRGB( const in vec3 normal ) {
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
#endif`,Td=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ed=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Md=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Cd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ad=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,wd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Id=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Rd=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Pd=`float getShadowMask() {
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
}`,Dd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ld=`#ifdef USE_SKINNING
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
#endif`,Od=`#ifdef USE_SKINNING
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
#endif`,Nd=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Ud=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,kd=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Gd=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Bd=`#ifdef USE_TRANSMISSION
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
#endif`,zd=`#ifdef USE_TRANSMISSION
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
#endif`,Hd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Wd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Vd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,qd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Xd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,$d=`uniform sampler2D t2D;
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
}`,Yd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Kd=`#ifdef ENVMAP_TYPE_CUBE
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
}`,jd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Jd=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Zd=`#include <common>
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
}`,Qd=`#if DEPTH_PACKING == 3200
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
}`,ef=`#define DISTANCE
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
}`,tf=`#define DISTANCE
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
}`,nf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,sf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rf=`uniform float scale;
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
}`,of=`uniform vec3 diffuse;
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
}`,af=`#include <common>
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
}`,lf=`uniform vec3 diffuse;
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
}`,cf=`#define LAMBERT
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
}`,hf=`#define LAMBERT
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
}`,uf=`#define MATCAP
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
}`,df=`#define MATCAP
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
}`,ff=`#define NORMAL
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
}`,pf=`#define NORMAL
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
}`,mf=`#define PHONG
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
}`,gf=`#define PHONG
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
}`,xf=`#define STANDARD
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
}`,yf=`#define STANDARD
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
}`,_f=`#define TOON
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
}`,bf=`uniform float size;
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
}`,Tf=`#include <common>
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
}`,Ef=`uniform vec3 color;
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
}`,Mf=`uniform float rotation;
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
}`,Cf=`uniform vec3 diffuse;
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
}`,it={alphahash_fragment:$h,alphahash_pars_fragment:Yh,alphamap_fragment:Kh,alphamap_pars_fragment:jh,alphatest_fragment:Jh,alphatest_pars_fragment:Zh,aomap_fragment:Qh,aomap_pars_fragment:eu,batching_pars_vertex:tu,batching_vertex:nu,begin_vertex:iu,beginnormal_vertex:su,bsdfs:ru,iridescence_fragment:ou,bumpmap_pars_fragment:au,clipping_planes_fragment:lu,clipping_planes_pars_fragment:cu,clipping_planes_pars_vertex:hu,clipping_planes_vertex:uu,color_fragment:du,color_pars_fragment:fu,color_pars_vertex:pu,color_vertex:mu,common:gu,cube_uv_reflection_fragment:xu,defaultnormal_vertex:yu,displacementmap_pars_vertex:vu,displacementmap_vertex:_u,emissivemap_fragment:bu,emissivemap_pars_fragment:Su,colorspace_fragment:Tu,colorspace_pars_fragment:Eu,envmap_fragment:Mu,envmap_common_pars_fragment:Cu,envmap_pars_fragment:Au,envmap_pars_vertex:wu,envmap_physical_pars_fragment:Gu,envmap_vertex:Iu,fog_vertex:Ru,fog_pars_vertex:Pu,fog_fragment:Du,fog_pars_fragment:Lu,gradientmap_pars_fragment:Ou,lightmap_pars_fragment:Fu,lights_lambert_fragment:Nu,lights_lambert_pars_fragment:Uu,lights_pars_begin:ku,lights_toon_fragment:Bu,lights_toon_pars_fragment:zu,lights_phong_fragment:Hu,lights_phong_pars_fragment:Wu,lights_physical_fragment:Vu,lights_physical_pars_fragment:qu,lights_fragment_begin:Xu,lights_fragment_maps:$u,lights_fragment_end:Yu,logdepthbuf_fragment:Ku,logdepthbuf_pars_fragment:ju,logdepthbuf_pars_vertex:Ju,logdepthbuf_vertex:Zu,map_fragment:Qu,map_pars_fragment:ed,map_particle_fragment:td,map_particle_pars_fragment:nd,metalnessmap_fragment:id,metalnessmap_pars_fragment:sd,morphinstance_vertex:rd,morphcolor_vertex:od,morphnormal_vertex:ad,morphtarget_pars_vertex:ld,morphtarget_vertex:cd,normal_fragment_begin:hd,normal_fragment_maps:ud,normal_pars_fragment:dd,normal_pars_vertex:fd,normal_vertex:pd,normalmap_pars_fragment:md,clearcoat_normal_fragment_begin:gd,clearcoat_normal_fragment_maps:xd,clearcoat_pars_fragment:yd,iridescence_pars_fragment:vd,opaque_fragment:_d,packing:bd,premultiplied_alpha_fragment:Sd,project_vertex:Td,dithering_fragment:Ed,dithering_pars_fragment:Md,roughnessmap_fragment:Cd,roughnessmap_pars_fragment:Ad,shadowmap_pars_fragment:wd,shadowmap_pars_vertex:Id,shadowmap_vertex:Rd,shadowmask_pars_fragment:Pd,skinbase_vertex:Dd,skinning_pars_vertex:Ld,skinning_vertex:Od,skinnormal_vertex:Fd,specularmap_fragment:Nd,specularmap_pars_fragment:Ud,tonemapping_fragment:kd,tonemapping_pars_fragment:Gd,transmission_fragment:Bd,transmission_pars_fragment:zd,uv_pars_fragment:Hd,uv_pars_vertex:Wd,uv_vertex:Vd,worldpos_vertex:qd,background_vert:Xd,background_frag:$d,backgroundCube_vert:Yd,backgroundCube_frag:Kd,cube_vert:jd,cube_frag:Jd,depth_vert:Zd,depth_frag:Qd,distanceRGBA_vert:ef,distanceRGBA_frag:tf,equirect_vert:nf,equirect_frag:sf,linedashed_vert:rf,linedashed_frag:of,meshbasic_vert:af,meshbasic_frag:lf,meshlambert_vert:cf,meshlambert_frag:hf,meshmatcap_vert:uf,meshmatcap_frag:df,meshnormal_vert:ff,meshnormal_frag:pf,meshphong_vert:mf,meshphong_frag:gf,meshphysical_vert:xf,meshphysical_frag:yf,meshtoon_vert:vf,meshtoon_frag:_f,points_vert:bf,points_frag:Sf,shadow_vert:Tf,shadow_frag:Ef,sprite_vert:Mf,sprite_frag:Cf},_e={common:{diffuse:{value:new Ne(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new nt},alphaMap:{value:null},alphaMapTransform:{value:new nt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new nt}},envmap:{envMap:{value:null},envMapRotation:{value:new nt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new nt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new nt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new nt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new nt},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new nt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new nt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new nt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new nt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ne(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ne(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new nt},alphaTest:{value:0},uvTransform:{value:new nt}},sprite:{diffuse:{value:new Ne(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new nt},alphaMap:{value:null},alphaMapTransform:{value:new nt},alphaTest:{value:0}}},pn={basic:{uniforms:Vt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.fog]),vertexShader:it.meshbasic_vert,fragmentShader:it.meshbasic_frag},lambert:{uniforms:Vt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new Ne(0)}}]),vertexShader:it.meshlambert_vert,fragmentShader:it.meshlambert_frag},phong:{uniforms:Vt([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new Ne(0)},specular:{value:new Ne(1118481)},shininess:{value:30}}]),vertexShader:it.meshphong_vert,fragmentShader:it.meshphong_frag},standard:{uniforms:Vt([_e.common,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.roughnessmap,_e.metalnessmap,_e.fog,_e.lights,{emissive:{value:new Ne(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag},toon:{uniforms:Vt([_e.common,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.gradientmap,_e.fog,_e.lights,{emissive:{value:new Ne(0)}}]),vertexShader:it.meshtoon_vert,fragmentShader:it.meshtoon_frag},matcap:{uniforms:Vt([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,{matcap:{value:null}}]),vertexShader:it.meshmatcap_vert,fragmentShader:it.meshmatcap_frag},points:{uniforms:Vt([_e.points,_e.fog]),vertexShader:it.points_vert,fragmentShader:it.points_frag},dashed:{uniforms:Vt([_e.common,_e.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:it.linedashed_vert,fragmentShader:it.linedashed_frag},depth:{uniforms:Vt([_e.common,_e.displacementmap]),vertexShader:it.depth_vert,fragmentShader:it.depth_frag},normal:{uniforms:Vt([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,{opacity:{value:1}}]),vertexShader:it.meshnormal_vert,fragmentShader:it.meshnormal_frag},sprite:{uniforms:Vt([_e.sprite,_e.fog]),vertexShader:it.sprite_vert,fragmentShader:it.sprite_frag},background:{uniforms:{uvTransform:{value:new nt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:it.background_vert,fragmentShader:it.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new nt}},vertexShader:it.backgroundCube_vert,fragmentShader:it.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:it.cube_vert,fragmentShader:it.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:it.equirect_vert,fragmentShader:it.equirect_frag},distanceRGBA:{uniforms:Vt([_e.common,_e.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:it.distanceRGBA_vert,fragmentShader:it.distanceRGBA_frag},shadow:{uniforms:Vt([_e.lights,_e.fog,{color:{value:new Ne(0)},opacity:{value:1}}]),vertexShader:it.shadow_vert,fragmentShader:it.shadow_frag}};pn.physical={uniforms:Vt([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new nt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new nt},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new nt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new nt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new nt},sheen:{value:0},sheenColor:{value:new Ne(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new nt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new nt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new nt},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new nt},attenuationDistance:{value:0},attenuationColor:{value:new Ne(0)},specularColor:{value:new Ne(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new nt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new nt},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new nt}}]),vertexShader:it.meshphysical_vert,fragmentShader:it.meshphysical_frag};const Is={r:0,b:0,g:0},jn=new en,Af=new pt;function wf(o,e,t,n,i,s,r){const a=new Ne(0);let l=s===!0?0:1,c,h,d=null,u=0,f=null;function p(_){let C=_.isScene===!0?_.background:null;return C&&C.isTexture&&(C=(_.backgroundBlurriness>0?t:e).get(C)),C}function m(_){let C=!1;const S=p(_);S===null?g(a,l):S&&S.isColor&&(g(S,1),C=!0);const b=o.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,r):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,r),(o.autoClear||C)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),o.clear(o.autoClearColor,o.autoClearDepth,o.autoClearStencil))}function x(_,C){const S=p(C);S&&(S.isCubeTexture||S.mapping===Js)?(h===void 0&&(h=new Ce(new Ht(1,1,1),new qe({name:"BackgroundCubeMaterial",uniforms:Ii(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:Bt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(b,w,O){this.matrixWorld.copyPosition(O.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),jn.copy(C.backgroundRotation),jn.x*=-1,jn.y*=-1,jn.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(jn.y*=-1,jn.z*=-1),h.material.uniforms.envMap.value=S,h.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Af.makeRotationFromEuler(jn)),h.material.toneMapped=dt.getTransfer(S.colorSpace)!==yt,(d!==S||u!==S.version||f!==o.toneMapping)&&(h.material.needsUpdate=!0,d=S,u=S.version,f=o.toneMapping),h.layers.enableAll(),_.unshift(h,h.geometry,h.material,0,0,null)):S&&S.isTexture&&(c===void 0&&(c=new Ce(new er(2,2),new qe({name:"BackgroundMaterial",uniforms:Ii(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:zn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=S,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.toneMapped=dt.getTransfer(S.colorSpace)!==yt,S.matrixAutoUpdate===!0&&S.updateMatrix(),c.material.uniforms.uvTransform.value.copy(S.matrix),(d!==S||u!==S.version||f!==o.toneMapping)&&(c.material.needsUpdate=!0,d=S,u=S.version,f=o.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function g(_,C){_.getRGB(Is,Ul(o)),n.buffers.color.setClear(Is.r,Is.g,Is.b,C,r)}function v(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(_,C=1){a.set(_),l=C,g(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,g(a,l)},render:m,addToRenderList:x,dispose:v}}function If(o,e){const t=o.getParameter(o.MAX_VERTEX_ATTRIBS),n={},i=u(null);let s=i,r=!1;function a(T,A,U,G,z){let $=!1;const W=d(G,U,A);s!==W&&(s=W,c(s.object)),$=f(T,G,U,z),$&&p(T,G,U,z),z!==null&&e.update(z,o.ELEMENT_ARRAY_BUFFER),($||r)&&(r=!1,C(T,A,U,G),z!==null&&o.bindBuffer(o.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function l(){return o.createVertexArray()}function c(T){return o.bindVertexArray(T)}function h(T){return o.deleteVertexArray(T)}function d(T,A,U){const G=U.wireframe===!0;let z=n[T.id];z===void 0&&(z={},n[T.id]=z);let $=z[A.id];$===void 0&&($={},z[A.id]=$);let W=$[G];return W===void 0&&(W=u(l()),$[G]=W),W}function u(T){const A=[],U=[],G=[];for(let z=0;z<t;z++)A[z]=0,U[z]=0,G[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:U,attributeDivisors:G,object:T,attributes:{},index:null}}function f(T,A,U,G){const z=s.attributes,$=A.attributes;let W=0;const ee=U.getAttributes();for(const q in ee)if(ee[q].location>=0){const te=z[q];let xe=$[q];if(xe===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(xe=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(xe=T.instanceColor)),te===void 0||te.attribute!==xe||xe&&te.data!==xe.data)return!0;W++}return s.attributesNum!==W||s.index!==G}function p(T,A,U,G){const z={},$=A.attributes;let W=0;const ee=U.getAttributes();for(const q in ee)if(ee[q].location>=0){let te=$[q];te===void 0&&(q==="instanceMatrix"&&T.instanceMatrix&&(te=T.instanceMatrix),q==="instanceColor"&&T.instanceColor&&(te=T.instanceColor));const xe={};xe.attribute=te,te&&te.data&&(xe.data=te.data),z[q]=xe,W++}s.attributes=z,s.attributesNum=W,s.index=G}function m(){const T=s.newAttributes;for(let A=0,U=T.length;A<U;A++)T[A]=0}function x(T){g(T,0)}function g(T,A){const U=s.newAttributes,G=s.enabledAttributes,z=s.attributeDivisors;U[T]=1,G[T]===0&&(o.enableVertexAttribArray(T),G[T]=1),z[T]!==A&&(o.vertexAttribDivisor(T,A),z[T]=A)}function v(){const T=s.newAttributes,A=s.enabledAttributes;for(let U=0,G=A.length;U<G;U++)A[U]!==T[U]&&(o.disableVertexAttribArray(U),A[U]=0)}function _(T,A,U,G,z,$,W){W===!0?o.vertexAttribIPointer(T,A,U,z,$):o.vertexAttribPointer(T,A,U,G,z,$)}function C(T,A,U,G){m();const z=G.attributes,$=U.getAttributes(),W=A.defaultAttributeValues;for(const ee in $){const q=$[ee];if(q.location>=0){let ne=z[ee];if(ne===void 0&&(ee==="instanceMatrix"&&T.instanceMatrix&&(ne=T.instanceMatrix),ee==="instanceColor"&&T.instanceColor&&(ne=T.instanceColor)),ne!==void 0){const te=ne.normalized,xe=ne.itemSize,ze=e.get(ne);if(ze===void 0)continue;const He=ze.buffer,be=ze.type,Pe=ze.bytesPerElement,j=be===o.INT||be===o.UNSIGNED_INT||ne.gpuType===Bo;if(ne.isInterleavedBufferAttribute){const X=ne.data,he=X.stride,oe=ne.offset;if(X.isInstancedInterleavedBuffer){for(let de=0;de<q.locationSize;de++)g(q.location+de,X.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=X.meshPerAttribute*X.count)}else for(let de=0;de<q.locationSize;de++)x(q.location+de);o.bindBuffer(o.ARRAY_BUFFER,He);for(let de=0;de<q.locationSize;de++)_(q.location+de,xe/q.locationSize,be,te,he*Pe,(oe+xe/q.locationSize*de)*Pe,j)}else{if(ne.isInstancedBufferAttribute){for(let X=0;X<q.locationSize;X++)g(q.location+X,ne.meshPerAttribute);T.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let X=0;X<q.locationSize;X++)x(q.location+X);o.bindBuffer(o.ARRAY_BUFFER,He);for(let X=0;X<q.locationSize;X++)_(q.location+X,xe/q.locationSize,be,te,xe*Pe,xe/q.locationSize*X*Pe,j)}}else if(W!==void 0){const te=W[ee];if(te!==void 0)switch(te.length){case 2:o.vertexAttrib2fv(q.location,te);break;case 3:o.vertexAttrib3fv(q.location,te);break;case 4:o.vertexAttrib4fv(q.location,te);break;default:o.vertexAttrib1fv(q.location,te)}}}}v()}function S(){O();for(const T in n){const A=n[T];for(const U in A){const G=A[U];for(const z in G)h(G[z].object),delete G[z];delete A[U]}delete n[T]}}function b(T){if(n[T.id]===void 0)return;const A=n[T.id];for(const U in A){const G=A[U];for(const z in G)h(G[z].object),delete G[z];delete A[U]}delete n[T.id]}function w(T){for(const A in n){const U=n[A];if(U[T.id]===void 0)continue;const G=U[T.id];for(const z in G)h(G[z].object),delete G[z];delete U[T.id]}}function O(){E(),r=!0,s!==i&&(s=i,c(s.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:O,resetDefaultState:E,dispose:S,releaseStatesOfGeometry:b,releaseStatesOfProgram:w,initAttributes:m,enableAttribute:x,disableUnusedAttributes:v}}function Rf(o,e,t){let n;function i(c){n=c}function s(c,h){o.drawArrays(n,c,h),t.update(h,n,1)}function r(c,h,d){d!==0&&(o.drawArraysInstanced(n,c,h,d),t.update(h,n,d))}function a(c,h,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,d);let f=0;for(let p=0;p<d;p++)f+=h[p];t.update(f,n,1)}function l(c,h,d,u){if(d===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let p=0;p<c.length;p++)r(c[p],h[p],u[p]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,u,0,d);let p=0;for(let m=0;m<d;m++)p+=h[m]*u[m];t.update(p,n,1)}}this.setMode=i,this.render=s,this.renderInstances=r,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Pf(o,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const w=e.get("EXT_texture_filter_anisotropic");i=o.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(w){return!(w!==un&&n.convert(w)!==o.getParameter(o.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(w){const O=w===Pi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==gn&&n.convert(w)!==o.getParameter(o.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Cn&&!O)}function l(w){if(w==="highp"){if(o.getShaderPrecisionFormat(o.VERTEX_SHADER,o.HIGH_FLOAT).precision>0&&o.getShaderPrecisionFormat(o.FRAGMENT_SHADER,o.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&o.getShaderPrecisionFormat(o.VERTEX_SHADER,o.MEDIUM_FLOAT).precision>0&&o.getShaderPrecisionFormat(o.FRAGMENT_SHADER,o.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Qe("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=o.getParameter(o.MAX_TEXTURE_IMAGE_UNITS),p=o.getParameter(o.MAX_VERTEX_TEXTURE_IMAGE_UNITS),m=o.getParameter(o.MAX_TEXTURE_SIZE),x=o.getParameter(o.MAX_CUBE_MAP_TEXTURE_SIZE),g=o.getParameter(o.MAX_VERTEX_ATTRIBS),v=o.getParameter(o.MAX_VERTEX_UNIFORM_VECTORS),_=o.getParameter(o.MAX_VARYING_VECTORS),C=o.getParameter(o.MAX_FRAGMENT_UNIFORM_VECTORS),S=p>0,b=o.getParameter(o.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:p,maxTextureSize:m,maxCubemapSize:x,maxAttributes:g,maxVertexUniforms:v,maxVaryings:_,maxFragmentUniforms:C,vertexTextures:S,maxSamples:b}}function Df(o){const e=this;let t=null,n=0,i=!1,s=!1;const r=new Zn,a=new nt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const p=d.clippingPlanes,m=d.clipIntersection,x=d.clipShadows,g=o.get(d);if(!i||p===null||p.length===0||s&&!x)s?h(null):c();else{const v=s?0:n,_=v*4;let C=g.clippingState||null;l.value=C,C=h(p,u,_,f);for(let S=0;S!==_;++S)C[S]=t[S];g.clippingState=C,this.numIntersection=m?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,p){const m=d!==null?d.length:0;let x=null;if(m!==0){if(x=l.value,p!==!0||x===null){const g=f+m*4,v=u.matrixWorldInverse;a.getNormalMatrix(v),(x===null||x.length<g)&&(x=new Float32Array(g));for(let _=0,C=f;_!==m;++_,C+=4)r.copy(d[_]).applyMatrix4(v,a),r.normal.toArray(x,C),x[C+3]=r.constant}l.value=x,l.needsUpdate=!0}return e.numPlanes=m,e.numIntersection=0,x}}function Lf(o){let e=new WeakMap;function t(r,a){return a===Qr?r.mapping=Mi:a===eo&&(r.mapping=Ci),r}function n(r){if(r&&r.isTexture){const a=r.mapping;if(a===Qr||a===eo)if(e.has(r)){const l=e.get(r).texture;return t(l,r.mapping)}else{const l=r.image;if(l&&l.height>0){const c=new _h(l.height);return c.fromEquirectangularTexture(o,r),e.set(r,c),r.addEventListener("dispose",i),t(c.texture,r.mapping)}else return null}}return r}function i(r){const a=r.target;a.removeEventListener("dispose",i);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const Gn=4,Ha=[.125,.215,.35,.446,.526,.582],ei=20,Of=256,Hi=new Wl,Wa=new Ne;let Fr=null,Nr=0,Ur=0,kr=!1;const Ff=new R;class Va{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){const{size:r=256,position:a=Ff}=s;Fr=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Ur=this._renderer.getActiveMipmapLevel(),kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$a(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Fr,Nr,Ur),this._renderer.xr.enabled=kr,e.scissorTest=!1,Si(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Mi||e.mapping===Ci?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Fr=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Ur=this._renderer.getActiveMipmapLevel(),kr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:rn,minFilter:rn,generateMipmaps:!1,type:Pi,format:un,colorSpace:wi,depthBuffer:!1},i=qa(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=qa(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Nf(s)),this._blurMaterial=kf(s,e,t),this._ggxMaterial=Uf(s,e,t)}return i}_compileMaterial(e){const t=new Ce(new mt,e);this._renderer.compile(t,Hi)}_sceneToCubeUV(e,t,n,i,s){const l=new Qt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Wa),d.toneMapping=Bn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(i),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ce(new Ht,new is({name:"PMREM.Background",side:Bt,depthWrite:!1,depthTest:!1})));const m=this._backgroundBox,x=m.material;let g=!1;const v=e.background;v?v.isColor&&(x.color.copy(v),e.background=null,g=!0):(x.color.copy(Wa),g=!0);for(let _=0;_<6;_++){const C=_%3;C===0?(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+h[_],s.y,s.z)):C===1?(l.up.set(0,0,c[_]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+h[_],s.z)):(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+h[_]));const S=this._cubeSize;Si(i,C*S,_>2?S:0,S,S),d.setRenderTarget(i),g&&d.render(m,l),d.render(e,l)}d.toneMapping=f,d.autoClear=u,e.background=v}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===Mi||e.mapping===Ci;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=$a()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Xa());const s=i?this._cubemapMaterial:this._equirectMaterial,r=this._lodMeshes[0];r.material=s;const a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;Si(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(r,Hi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,s=this._pingPongRenderTarget,r=this._ggxMaterial,a=this._lodMeshes[n];a.material=r;const l=r.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=.05+c*.95,f=d*u,{_lodMax:p}=this,m=this._sizeLods[n],x=3*m*(n>p-Gn?n-p+Gn:0),g=4*(this._cubeSize-m);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=p-t,Si(s,x,g,3*m,2*m),i.setRenderTarget(s),i.render(a,Hi),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=p-n,Si(e,x,g,3*m,2*m),i.setRenderTarget(e),i.render(a,Hi)}_blur(e,t,n,i,s){const r=this._pingPongRenderTarget;this._halfBlur(e,r,t,n,i,"latitudinal",s),this._halfBlur(r,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,r,a){const l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&It("blur direction must be either latitudinal or longitudinal!");const h=3,d=this._lodMeshes[i];d.material=c;const u=c.uniforms,f=this._sizeLods[n]-1,p=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ei-1),m=s/p,x=isFinite(s)?1+Math.floor(h*m):ei;x>ei&&Qe(`sigmaRadians, ${s}, is too large and will clip, as it requested ${x} samples when the maximum is set to ${ei}`);const g=[];let v=0;for(let w=0;w<ei;++w){const O=w/m,E=Math.exp(-O*O/2);g.push(E),w===0?v+=E:w<x&&(v+=2*E)}for(let w=0;w<g.length;w++)g[w]=g[w]/v;u.envMap.value=e.texture,u.samples.value=x,u.weights.value=g,u.latitudinal.value=r==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:_}=this;u.dTheta.value=p,u.mipInt.value=_-n;const C=this._sizeLods[i],S=3*C*(i>_-Gn?i-_+Gn:0),b=4*(this._cubeSize-C);Si(t,S,b,3*C,2*C),l.setRenderTarget(t),l.render(d,Hi)}}function Nf(o){const e=[],t=[],n=[];let i=o;const s=o-Gn+1+Ha.length;for(let r=0;r<s;r++){const a=Math.pow(2,i);e.push(a);let l=1/a;r>o-Gn?l=Ha[r-o+Gn-1]:r===0&&(l=0),t.push(l);const c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,p=6,m=3,x=2,g=1,v=new Float32Array(m*p*f),_=new Float32Array(x*p*f),C=new Float32Array(g*p*f);for(let b=0;b<f;b++){const w=b%3*2/3-1,O=b>2?0:-1,E=[w,O,0,w+2/3,O,0,w+2/3,O+1,0,w,O,0,w+2/3,O+1,0,w,O+1,0];v.set(E,m*p*b),_.set(u,x*p*b);const T=[b,b,b,b,b,b];C.set(T,g*p*b)}const S=new mt;S.setAttribute("position",new Tt(v,m)),S.setAttribute("uv",new Tt(_,x)),S.setAttribute("faceIndex",new Tt(C,g)),n.push(new Ce(S,null)),i>Gn&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function qa(o,e,t){const n=new Wn(o,e,t);return n.texture.mapping=Js,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Si(o,e,t,n,i){o.viewport.set(e,t,n,i),o.scissor.set(e,t,n,i)}function Uf(o,e,t){return new qe({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Of,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${o}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:nr(),fragmentShader:`

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
		`,blending:An,depthTest:!1,depthWrite:!1})}function kf(o,e,t){const n=new Float32Array(ei),i=new R(0,1,0);return new qe({name:"SphericalGaussianBlur",defines:{n:ei,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${o}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:nr(),fragmentShader:`

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
		`,blending:An,depthTest:!1,depthWrite:!1})}function Xa(){return new qe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:nr(),fragmentShader:`

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
		`,blending:An,depthTest:!1,depthWrite:!1})}function $a(){return new qe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:nr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:An,depthTest:!1,depthWrite:!1})}function nr(){return`

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
	`}function Gf(o){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Qr||l===eo,h=l===Mi||l===Ci;if(c||h){let d=e.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return t===null&&(t=new Va(o)),d=c?t.fromEquirectangular(a,d):t.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),d.texture;if(d!==void 0)return d.texture;{const f=a.image;return c&&f&&f.height>0||h&&f&&i(f)?(t===null&&(t=new Va(o)),d=c?t.fromEquirectangular(a):t.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,e.set(a,d),a.addEventListener("dispose",s),d.texture):null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function r(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:r}}function Bf(o){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=o.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Qi("WebGLRenderer: "+n+" extension not supported."),i}}}function zf(o,e,t,n){const i={},s=new WeakMap;function r(d){const u=d.target;u.index!==null&&e.remove(u.index);for(const p in u.attributes)e.remove(u.attributes[p]);u.removeEventListener("dispose",r),delete i[u.id];const f=s.get(u);f&&(e.remove(f),s.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",r),i[u.id]=!0,t.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)e.update(u[f],o.ARRAY_BUFFER)}function c(d){const u=[],f=d.index,p=d.attributes.position;let m=0;if(f!==null){const v=f.array;m=f.version;for(let _=0,C=v.length;_<C;_+=3){const S=v[_+0],b=v[_+1],w=v[_+2];u.push(S,b,b,w,w,S)}}else if(p!==void 0){const v=p.array;m=p.version;for(let _=0,C=v.length/3-1;_<C;_+=3){const S=_+0,b=_+1,w=_+2;u.push(S,b,b,w,w,S)}}else return;const x=new(Dl(u)?Nl:Fl)(u,1);x.version=m;const g=s.get(d);g&&e.remove(g),s.set(d,x)}function h(d){const u=s.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Hf(o,e,t){let n;function i(u){n=u}let s,r;function a(u){s=u.type,r=u.bytesPerElement}function l(u,f){o.drawElements(n,f,s,u*r),t.update(f,n,1)}function c(u,f,p){p!==0&&(o.drawElementsInstanced(n,f,s,u*r,p),t.update(f,n,p))}function h(u,f,p){if(p===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,u,0,p);let x=0;for(let g=0;g<p;g++)x+=f[g];t.update(x,n,1)}function d(u,f,p,m){if(p===0)return;const x=e.get("WEBGL_multi_draw");if(x===null)for(let g=0;g<u.length;g++)c(u[g]/r,f[g],m[g]);else{x.multiDrawElementsInstancedWEBGL(n,f,0,s,u,0,m,0,p);let g=0;for(let v=0;v<p;v++)g+=f[v]*m[v];t.update(g,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function Wf(o){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,r,a){switch(t.calls++,r){case o.TRIANGLES:t.triangles+=a*(s/3);break;case o.LINES:t.lines+=a*(s/2);break;case o.LINE_STRIP:t.lines+=a*(s-1);break;case o.LINE_LOOP:t.lines+=a*s;break;case o.POINTS:t.points+=a*s;break;default:It("WebGLInfo: Unknown draw mode:",r);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Vf(o,e,t){const n=new WeakMap,i=new vt;function s(r,a,l){const c=r.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let E=function(){w.dispose(),n.delete(a),a.removeEventListener("dispose",E)};u!==void 0&&u.texture.dispose();const f=a.morphAttributes.position!==void 0,p=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,x=a.morphAttributes.position||[],g=a.morphAttributes.normal||[],v=a.morphAttributes.color||[];let _=0;f===!0&&(_=1),p===!0&&(_=2),m===!0&&(_=3);let C=a.attributes.position.count*_,S=1;C>e.maxTextureSize&&(S=Math.ceil(C/e.maxTextureSize),C=e.maxTextureSize);const b=new Float32Array(C*S*4*d),w=new Ll(b,C,S,d);w.type=Cn,w.needsUpdate=!0;const O=_*4;for(let T=0;T<d;T++){const A=x[T],U=g[T],G=v[T],z=C*S*4*T;for(let $=0;$<A.count;$++){const W=$*O;f===!0&&(i.fromBufferAttribute(A,$),b[z+W+0]=i.x,b[z+W+1]=i.y,b[z+W+2]=i.z,b[z+W+3]=0),p===!0&&(i.fromBufferAttribute(U,$),b[z+W+4]=i.x,b[z+W+5]=i.y,b[z+W+6]=i.z,b[z+W+7]=0),m===!0&&(i.fromBufferAttribute(G,$),b[z+W+8]=i.x,b[z+W+9]=i.y,b[z+W+10]=i.z,b[z+W+11]=G.itemSize===4?i.w:1)}}u={count:d,texture:w,size:new ht(C,S)},n.set(a,u),a.addEventListener("dispose",E)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(o,"morphTexture",r.morphTexture,t);else{let f=0;for(let m=0;m<c.length;m++)f+=c[m];const p=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(o,"morphTargetBaseInfluence",p),l.getUniforms().setValue(o,"morphTargetInfluences",c)}l.getUniforms().setValue(o,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(o,"morphTargetsTextureSize",u.size)}return{update:s}}function qf(o,e,t,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,d=e.get(l,h);if(i.get(d)!==c&&(e.update(d),i.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(t.update(l.instanceMatrix,o.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,o.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const u=l.skeleton;i.get(u)!==c&&(u.update(),i.set(u,c))}return d}function r(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:r}}const ql=new zt,Ya=new jo(1,1),Xl=new Ll,$l=new ih,Yl=new Gl,Ka=[],ja=[],Ja=new Float32Array(16),Za=new Float32Array(9),Qa=new Float32Array(4);function Li(o,e,t){const n=o[0];if(n<=0||n>0)return o;const i=e*t;let s=Ka[i];if(s===void 0&&(s=new Float32Array(i),Ka[i]=s),e!==0){n.toArray(s,0);for(let r=1,a=0;r!==e;++r)a+=t,o[r].toArray(s,a)}return s}function Lt(o,e){if(o.length!==e.length)return!1;for(let t=0,n=o.length;t<n;t++)if(o[t]!==e[t])return!1;return!0}function Ot(o,e){for(let t=0,n=e.length;t<n;t++)o[t]=e[t]}function ir(o,e){let t=ja[e];t===void 0&&(t=new Int32Array(e),ja[e]=t);for(let n=0;n!==e;++n)t[n]=o.allocateTextureUnit();return t}function Xf(o,e){const t=this.cache;t[0]!==e&&(o.uniform1f(this.addr,e),t[0]=e)}function $f(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(o.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;o.uniform2fv(this.addr,e),Ot(t,e)}}function Yf(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(o.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(o.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Lt(t,e))return;o.uniform3fv(this.addr,e),Ot(t,e)}}function Kf(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(o.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;o.uniform4fv(this.addr,e),Ot(t,e)}}function jf(o,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;o.uniformMatrix2fv(this.addr,!1,e),Ot(t,e)}else{if(Lt(t,n))return;Qa.set(n),o.uniformMatrix2fv(this.addr,!1,Qa),Ot(t,n)}}function Jf(o,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;o.uniformMatrix3fv(this.addr,!1,e),Ot(t,e)}else{if(Lt(t,n))return;Za.set(n),o.uniformMatrix3fv(this.addr,!1,Za),Ot(t,n)}}function Zf(o,e){const t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;o.uniformMatrix4fv(this.addr,!1,e),Ot(t,e)}else{if(Lt(t,n))return;Ja.set(n),o.uniformMatrix4fv(this.addr,!1,Ja),Ot(t,n)}}function Qf(o,e){const t=this.cache;t[0]!==e&&(o.uniform1i(this.addr,e),t[0]=e)}function ep(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(o.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;o.uniform2iv(this.addr,e),Ot(t,e)}}function tp(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(o.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;o.uniform3iv(this.addr,e),Ot(t,e)}}function np(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(o.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;o.uniform4iv(this.addr,e),Ot(t,e)}}function ip(o,e){const t=this.cache;t[0]!==e&&(o.uniform1ui(this.addr,e),t[0]=e)}function sp(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(o.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;o.uniform2uiv(this.addr,e),Ot(t,e)}}function rp(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(o.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;o.uniform3uiv(this.addr,e),Ot(t,e)}}function op(o,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(o.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;o.uniform4uiv(this.addr,e),Ot(t,e)}}function ap(o,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(o.uniform1i(this.addr,i),n[0]=i);let s;this.type===o.SAMPLER_2D_SHADOW?(Ya.compareFunction=Pl,s=Ya):s=ql,t.setTexture2D(e||s,i)}function lp(o,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(o.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||$l,i)}function cp(o,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(o.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Yl,i)}function hp(o,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(o.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Xl,i)}function up(o){switch(o){case 5126:return Xf;case 35664:return $f;case 35665:return Yf;case 35666:return Kf;case 35674:return jf;case 35675:return Jf;case 35676:return Zf;case 5124:case 35670:return Qf;case 35667:case 35671:return ep;case 35668:case 35672:return tp;case 35669:case 35673:return np;case 5125:return ip;case 36294:return sp;case 36295:return rp;case 36296:return op;case 35678:case 36198:case 36298:case 36306:case 35682:return ap;case 35679:case 36299:case 36307:return lp;case 35680:case 36300:case 36308:case 36293:return cp;case 36289:case 36303:case 36311:case 36292:return hp}}function dp(o,e){o.uniform1fv(this.addr,e)}function fp(o,e){const t=Li(e,this.size,2);o.uniform2fv(this.addr,t)}function pp(o,e){const t=Li(e,this.size,3);o.uniform3fv(this.addr,t)}function mp(o,e){const t=Li(e,this.size,4);o.uniform4fv(this.addr,t)}function gp(o,e){const t=Li(e,this.size,4);o.uniformMatrix2fv(this.addr,!1,t)}function xp(o,e){const t=Li(e,this.size,9);o.uniformMatrix3fv(this.addr,!1,t)}function yp(o,e){const t=Li(e,this.size,16);o.uniformMatrix4fv(this.addr,!1,t)}function vp(o,e){o.uniform1iv(this.addr,e)}function _p(o,e){o.uniform2iv(this.addr,e)}function bp(o,e){o.uniform3iv(this.addr,e)}function Sp(o,e){o.uniform4iv(this.addr,e)}function Tp(o,e){o.uniform1uiv(this.addr,e)}function Ep(o,e){o.uniform2uiv(this.addr,e)}function Mp(o,e){o.uniform3uiv(this.addr,e)}function Cp(o,e){o.uniform4uiv(this.addr,e)}function Ap(o,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(o.uniform1iv(this.addr,s),Ot(n,s));for(let r=0;r!==i;++r)t.setTexture2D(e[r]||ql,s[r])}function wp(o,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(o.uniform1iv(this.addr,s),Ot(n,s));for(let r=0;r!==i;++r)t.setTexture3D(e[r]||$l,s[r])}function Ip(o,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(o.uniform1iv(this.addr,s),Ot(n,s));for(let r=0;r!==i;++r)t.setTextureCube(e[r]||Yl,s[r])}function Rp(o,e,t){const n=this.cache,i=e.length,s=ir(t,i);Lt(n,s)||(o.uniform1iv(this.addr,s),Ot(n,s));for(let r=0;r!==i;++r)t.setTexture2DArray(e[r]||Xl,s[r])}function Pp(o){switch(o){case 5126:return dp;case 35664:return fp;case 35665:return pp;case 35666:return mp;case 35674:return gp;case 35675:return xp;case 35676:return yp;case 5124:case 35670:return vp;case 35667:case 35671:return _p;case 35668:case 35672:return bp;case 35669:case 35673:return Sp;case 5125:return Tp;case 36294:return Ep;case 36295:return Mp;case 36296:return Cp;case 35678:case 36198:case 36298:case 36306:case 35682:return Ap;case 35679:case 36299:case 36307:return wp;case 35680:case 36300:case 36308:case 36293:return Ip;case 36289:case 36303:case 36311:case 36292:return Rp}}class Dp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=up(t.type)}}class Lp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Pp(t.type)}}class Op{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let s=0,r=i.length;s!==r;++s){const a=i[s];a.setValue(e,t[a.id],n)}}}const Gr=/(\w+)(\])?(\[|\.)?/g;function el(o,e){o.seq.push(e),o.map[e.id]=e}function Fp(o,e,t){const n=o.name,i=n.length;for(Gr.lastIndex=0;;){const s=Gr.exec(n),r=Gr.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&r+2===i){el(t,c===void 0?new Dp(a,o,e):new Lp(a,o,e));break}else{let d=t.map[a];d===void 0&&(d=new Op(a),el(t,d)),t=d}}}class Bs{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const s=e.getActiveUniform(t,i),r=e.getUniformLocation(t,s.name);Fp(s,r,this)}}setValue(e,t,n,i){const s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,r=t.length;s!==r;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,s=e.length;i!==s;++i){const r=e[i];r.id in t&&n.push(r)}return n}}function tl(o,e,t){const n=o.createShader(e);return o.shaderSource(n,t),o.compileShader(n),n}const Np=37297;let Up=0;function kp(o,e){const t=o.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let r=i;r<s;r++){const a=r+1;n.push(`${a===e?">":" "} ${a}: ${t[r]}`)}return n.join(`
`)}const nl=new nt;function Gp(o){dt._getMatrix(nl,dt.workingColorSpace,o);const e=`mat3( ${nl.elements.map(t=>t.toFixed(4))} )`;switch(dt.getTransfer(o)){case $s:return[e,"LinearTransferOETF"];case yt:return[e,"sRGBTransferOETF"];default:return Qe("WebGLProgram: Unsupported color space: ",o),[e,"LinearTransferOETF"]}}function il(o,e,t){const n=o.getShaderParameter(e,o.COMPILE_STATUS),s=(o.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const a=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+kp(o.getShaderSource(e),a)}else return s}function Bp(o,e){const t=Gp(e);return[`vec4 ${o}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function zp(o,e){let t;switch(e){case Pc:t="Linear";break;case Dc:t="Reinhard";break;case Lc:t="Cineon";break;case Oc:t="ACESFilmic";break;case Nc:t="AgX";break;case Uc:t="Neutral";break;case Fc:t="Custom";break;default:Qe("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+o+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Rs=new R;function Hp(){dt.getLuminanceCoefficients(Rs);const o=Rs.x.toFixed(4),e=Rs.y.toFixed(4),t=Rs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${o}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Wp(o){return[o.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",o.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($i).join(`
`)}function Vp(o){const e=[];for(const t in o){const n=o[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function qp(o,e){const t={},n=o.getProgramParameter(e,o.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const s=o.getActiveAttrib(e,i),r=s.name;let a=1;s.type===o.FLOAT_MAT2&&(a=2),s.type===o.FLOAT_MAT3&&(a=3),s.type===o.FLOAT_MAT4&&(a=4),t[r]={type:s.type,location:o.getAttribLocation(e,r),locationSize:a}}return t}function $i(o){return o!==""}function sl(o,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return o.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function rl(o,e){return o.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Xp=/^[ \t]*#include +<([\w\d./]+)>/gm;function Oo(o){return o.replace(Xp,Yp)}const $p=new Map;function Yp(o,e){let t=it[e];if(t===void 0){const n=$p.get(e);if(n!==void 0)t=it[n],Qe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Oo(t)}const Kp=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ol(o){return o.replace(Kp,jp)}function jp(o,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function al(o){let e=`precision ${o.precision} float;
	precision ${o.precision} int;
	precision ${o.precision} sampler2D;
	precision ${o.precision} samplerCube;
	precision ${o.precision} sampler3D;
	precision ${o.precision} sampler2DArray;
	precision ${o.precision} sampler2DShadow;
	precision ${o.precision} samplerCubeShadow;
	precision ${o.precision} sampler2DArrayShadow;
	precision ${o.precision} isampler2D;
	precision ${o.precision} isampler3D;
	precision ${o.precision} isamplerCube;
	precision ${o.precision} isampler2DArray;
	precision ${o.precision} usampler2D;
	precision ${o.precision} usampler3D;
	precision ${o.precision} usamplerCube;
	precision ${o.precision} usampler2DArray;
	`;return o.precision==="highp"?e+=`
#define HIGH_PRECISION`:o.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:o.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Jp(o){let e="SHADOWMAP_TYPE_BASIC";return o.shadowMapType===_l?e="SHADOWMAP_TYPE_PCF":o.shadowMapType===bl?e="SHADOWMAP_TYPE_PCF_SOFT":o.shadowMapType===Mn&&(e="SHADOWMAP_TYPE_VSM"),e}function Zp(o){let e="ENVMAP_TYPE_CUBE";if(o.envMap)switch(o.envMapMode){case Mi:case Ci:e="ENVMAP_TYPE_CUBE";break;case Js:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Qp(o){let e="ENVMAP_MODE_REFLECTION";if(o.envMap)switch(o.envMapMode){case Ci:e="ENVMAP_MODE_REFRACTION";break}return e}function em(o){let e="ENVMAP_BLENDING_NONE";if(o.envMap)switch(o.combine){case Go:e="ENVMAP_BLENDING_MULTIPLY";break;case Ic:e="ENVMAP_BLENDING_MIX";break;case Rc:e="ENVMAP_BLENDING_ADD";break}return e}function tm(o){const e=o.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function nm(o,e,t,n){const i=o.getContext(),s=t.defines;let r=t.vertexShader,a=t.fragmentShader;const l=Jp(t),c=Zp(t),h=Qp(t),d=em(t),u=tm(t),f=Wp(t),p=Vp(s),m=i.createProgram();let x,g,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter($i).join(`
`),x.length>0&&(x+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter($i).join(`
`),g.length>0&&(g+=`
`)):(x=[al(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($i).join(`
`),g=[al(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Bn?"#define TONE_MAPPING":"",t.toneMapping!==Bn?it.tonemapping_pars_fragment:"",t.toneMapping!==Bn?zp("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",it.colorspace_pars_fragment,Bp("linearToOutputTexel",t.outputColorSpace),Hp(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter($i).join(`
`)),r=Oo(r),r=sl(r,t),r=rl(r,t),a=Oo(a),a=sl(a,t),a=rl(a,t),r=ol(r),a=ol(a),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,x=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+x,g=["#define varying in",t.glslVersion===ha?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ha?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const _=v+x+r,C=v+g+a,S=tl(i,i.VERTEX_SHADER,_),b=tl(i,i.FRAGMENT_SHADER,C);i.attachShader(m,S),i.attachShader(m,b),t.index0AttributeName!==void 0?i.bindAttribLocation(m,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(m,0,"position"),i.linkProgram(m);function w(A){if(o.debug.checkShaderErrors){const U=i.getProgramInfoLog(m)||"",G=i.getShaderInfoLog(S)||"",z=i.getShaderInfoLog(b)||"",$=U.trim(),W=G.trim(),ee=z.trim();let q=!0,ne=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1)if(q=!1,typeof o.debug.onShaderError=="function")o.debug.onShaderError(i,m,S,b);else{const te=il(i,S,"vertex"),xe=il(i,b,"fragment");It("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+$+`
`+te+`
`+xe)}else $!==""?Qe("WebGLProgram: Program Info Log:",$):(W===""||ee==="")&&(ne=!1);ne&&(A.diagnostics={runnable:q,programLog:$,vertexShader:{log:W,prefix:x},fragmentShader:{log:ee,prefix:g}})}i.deleteShader(S),i.deleteShader(b),O=new Bs(i,m),E=qp(i,m)}let O;this.getUniforms=function(){return O===void 0&&w(this),O};let E;this.getAttributes=function(){return E===void 0&&w(this),E};let T=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,Np)),T},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Up++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=S,this.fragmentShader=b,this}let im=0;class sm{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),r=this._getShaderCacheForMaterial(e);return r.has(i)===!1&&(r.add(i),i.usedTimes++),r.has(s)===!1&&(r.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new rm(e),t.set(e,n)),n}}class rm{constructor(e){this.id=im++,this.code=e,this.usedTimes=0}}function om(o,e,t,n,i,s,r){const a=new Yo,l=new sm,c=new Set,h=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let f=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(E){return c.add(E),E===0?"uv":`uv${E}`}function x(E,T,A,U,G){const z=U.fog,$=G.geometry,W=E.isMeshStandardMaterial?U.environment:null,ee=(E.isMeshStandardMaterial?t:e).get(E.envMap||W),q=ee&&ee.mapping===Js?ee.image.height:null,ne=p[E.type];E.precision!==null&&(f=i.getMaxPrecision(E.precision),f!==E.precision&&Qe("WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));const te=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,xe=te!==void 0?te.length:0;let ze=0;$.morphAttributes.position!==void 0&&(ze=1),$.morphAttributes.normal!==void 0&&(ze=2),$.morphAttributes.color!==void 0&&(ze=3);let He,be,Pe,j;if(ne){const gt=pn[ne];He=gt.vertexShader,be=gt.fragmentShader}else He=E.vertexShader,be=E.fragmentShader,l.update(E),Pe=l.getVertexShaderID(E),j=l.getFragmentShaderID(E);const X=o.getRenderTarget(),he=o.state.buffers.depth.getReversed(),oe=G.isInstancedMesh===!0,de=G.isBatchedMesh===!0,pe=!!E.map,Je=!!E.matcap,Be=!!ee,et=!!E.aoMap,F=!!E.lightMap,De=!!E.bumpMap,Ue=!!E.normalMap,Xe=!!E.displacementMap,me=!!E.emissiveMap,st=!!E.metalnessMap,Me=!!E.roughnessMap,Le=E.anisotropy>0,D=E.clearcoat>0,M=E.dispersion>0,B=E.iridescence>0,Z=E.sheen>0,se=E.transmission>0,J=Le&&!!E.anisotropyMap,Re=D&&!!E.clearcoatMap,ge=D&&!!E.clearcoatNormalMap,ke=D&&!!E.clearcoatRoughnessMap,we=B&&!!E.iridescenceMap,ie=B&&!!E.iridescenceThicknessMap,le=Z&&!!E.sheenColorMap,ue=Z&&!!E.sheenRoughnessMap,Q=!!E.specularMap,ae=!!E.specularColorMap,Ie=!!E.specularIntensityMap,k=se&&!!E.transmissionMap,Se=se&&!!E.thicknessMap,ye=!!E.gradientMap,ve=!!E.alphaMap,ce=E.alphaTest>0,re=!!E.alphaHash,Oe=!!E.extensions;let Ze=Bn;E.toneMapped&&(X===null||X.isXRRenderTarget===!0)&&(Ze=o.toneMapping);const bt={shaderID:ne,shaderType:E.type,shaderName:E.name,vertexShader:He,fragmentShader:be,defines:E.defines,customVertexShaderID:Pe,customFragmentShaderID:j,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:de,batchingColor:de&&G._colorsTexture!==null,instancing:oe,instancingColor:oe&&G.instanceColor!==null,instancingMorph:oe&&G.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:X===null?o.outputColorSpace:X.isXRRenderTarget===!0?X.texture.colorSpace:wi,alphaToCoverage:!!E.alphaToCoverage,map:pe,matcap:Je,envMap:Be,envMapMode:Be&&ee.mapping,envMapCubeUVHeight:q,aoMap:et,lightMap:F,bumpMap:De,normalMap:Ue,displacementMap:u&&Xe,emissiveMap:me,normalMapObjectSpace:Ue&&E.normalMapType===zc,normalMapTangentSpace:Ue&&E.normalMapType===Rl,metalnessMap:st,roughnessMap:Me,anisotropy:Le,anisotropyMap:J,clearcoat:D,clearcoatMap:Re,clearcoatNormalMap:ge,clearcoatRoughnessMap:ke,dispersion:M,iridescence:B,iridescenceMap:we,iridescenceThicknessMap:ie,sheen:Z,sheenColorMap:le,sheenRoughnessMap:ue,specularMap:Q,specularColorMap:ae,specularIntensityMap:Ie,transmission:se,transmissionMap:k,thicknessMap:Se,gradientMap:ye,opaque:E.transparent===!1&&E.blending===ri&&E.alphaToCoverage===!1,alphaMap:ve,alphaTest:ce,alphaHash:re,combine:E.combine,mapUv:pe&&m(E.map.channel),aoMapUv:et&&m(E.aoMap.channel),lightMapUv:F&&m(E.lightMap.channel),bumpMapUv:De&&m(E.bumpMap.channel),normalMapUv:Ue&&m(E.normalMap.channel),displacementMapUv:Xe&&m(E.displacementMap.channel),emissiveMapUv:me&&m(E.emissiveMap.channel),metalnessMapUv:st&&m(E.metalnessMap.channel),roughnessMapUv:Me&&m(E.roughnessMap.channel),anisotropyMapUv:J&&m(E.anisotropyMap.channel),clearcoatMapUv:Re&&m(E.clearcoatMap.channel),clearcoatNormalMapUv:ge&&m(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ke&&m(E.clearcoatRoughnessMap.channel),iridescenceMapUv:we&&m(E.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&m(E.iridescenceThicknessMap.channel),sheenColorMapUv:le&&m(E.sheenColorMap.channel),sheenRoughnessMapUv:ue&&m(E.sheenRoughnessMap.channel),specularMapUv:Q&&m(E.specularMap.channel),specularColorMapUv:ae&&m(E.specularColorMap.channel),specularIntensityMapUv:Ie&&m(E.specularIntensityMap.channel),transmissionMapUv:k&&m(E.transmissionMap.channel),thicknessMapUv:Se&&m(E.thicknessMap.channel),alphaMapUv:ve&&m(E.alphaMap.channel),vertexTangents:!!$.attributes.tangent&&(Ue||Le),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,pointsUvs:G.isPoints===!0&&!!$.attributes.uv&&(pe||ve),fog:!!z,useFog:E.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:E.flatShading===!0&&E.wireframe===!1,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:he,skinning:G.isSkinnedMesh===!0,morphTargets:$.morphAttributes.position!==void 0,morphNormals:$.morphAttributes.normal!==void 0,morphColors:$.morphAttributes.color!==void 0,morphTargetsCount:xe,morphTextureStride:ze,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:E.dithering,shadowMapEnabled:o.shadowMap.enabled&&A.length>0,shadowMapType:o.shadowMap.type,toneMapping:Ze,decodeVideoTexture:pe&&E.map.isVideoTexture===!0&&dt.getTransfer(E.map.colorSpace)===yt,decodeVideoTextureEmissive:me&&E.emissiveMap.isVideoTexture===!0&&dt.getTransfer(E.emissiveMap.colorSpace)===yt,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===Yt,flipSided:E.side===Bt,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:Oe&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Oe&&E.extensions.multiDraw===!0||de)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return bt.vertexUv1s=c.has(1),bt.vertexUv2s=c.has(2),bt.vertexUv3s=c.has(3),c.clear(),bt}function g(E){const T=[];if(E.shaderID?T.push(E.shaderID):(T.push(E.customVertexShaderID),T.push(E.customFragmentShaderID)),E.defines!==void 0)for(const A in E.defines)T.push(A),T.push(E.defines[A]);return E.isRawShaderMaterial===!1&&(v(T,E),_(T,E),T.push(o.outputColorSpace)),T.push(E.customProgramCacheKey),T.join()}function v(E,T){E.push(T.precision),E.push(T.outputColorSpace),E.push(T.envMapMode),E.push(T.envMapCubeUVHeight),E.push(T.mapUv),E.push(T.alphaMapUv),E.push(T.lightMapUv),E.push(T.aoMapUv),E.push(T.bumpMapUv),E.push(T.normalMapUv),E.push(T.displacementMapUv),E.push(T.emissiveMapUv),E.push(T.metalnessMapUv),E.push(T.roughnessMapUv),E.push(T.anisotropyMapUv),E.push(T.clearcoatMapUv),E.push(T.clearcoatNormalMapUv),E.push(T.clearcoatRoughnessMapUv),E.push(T.iridescenceMapUv),E.push(T.iridescenceThicknessMapUv),E.push(T.sheenColorMapUv),E.push(T.sheenRoughnessMapUv),E.push(T.specularMapUv),E.push(T.specularColorMapUv),E.push(T.specularIntensityMapUv),E.push(T.transmissionMapUv),E.push(T.thicknessMapUv),E.push(T.combine),E.push(T.fogExp2),E.push(T.sizeAttenuation),E.push(T.morphTargetsCount),E.push(T.morphAttributeCount),E.push(T.numDirLights),E.push(T.numPointLights),E.push(T.numSpotLights),E.push(T.numSpotLightMaps),E.push(T.numHemiLights),E.push(T.numRectAreaLights),E.push(T.numDirLightShadows),E.push(T.numPointLightShadows),E.push(T.numSpotLightShadows),E.push(T.numSpotLightShadowsWithMaps),E.push(T.numLightProbes),E.push(T.shadowMapType),E.push(T.toneMapping),E.push(T.numClippingPlanes),E.push(T.numClipIntersection),E.push(T.depthPacking)}function _(E,T){a.disableAll(),T.supportsVertexTextures&&a.enable(0),T.instancing&&a.enable(1),T.instancingColor&&a.enable(2),T.instancingMorph&&a.enable(3),T.matcap&&a.enable(4),T.envMap&&a.enable(5),T.normalMapObjectSpace&&a.enable(6),T.normalMapTangentSpace&&a.enable(7),T.clearcoat&&a.enable(8),T.iridescence&&a.enable(9),T.alphaTest&&a.enable(10),T.vertexColors&&a.enable(11),T.vertexAlphas&&a.enable(12),T.vertexUv1s&&a.enable(13),T.vertexUv2s&&a.enable(14),T.vertexUv3s&&a.enable(15),T.vertexTangents&&a.enable(16),T.anisotropy&&a.enable(17),T.alphaHash&&a.enable(18),T.batching&&a.enable(19),T.dispersion&&a.enable(20),T.batchingColor&&a.enable(21),T.gradientMap&&a.enable(22),E.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),E.push(a.mask)}function C(E){const T=p[E.type];let A;if(T){const U=pn[T];A=gh.clone(U.uniforms)}else A=E.uniforms;return A}function S(E,T){let A;for(let U=0,G=h.length;U<G;U++){const z=h[U];if(z.cacheKey===T){A=z,++A.usedTimes;break}}return A===void 0&&(A=new nm(o,T,E,s),h.push(A)),A}function b(E){if(--E.usedTimes===0){const T=h.indexOf(E);h[T]=h[h.length-1],h.pop(),E.destroy()}}function w(E){l.remove(E)}function O(){l.dispose()}return{getParameters:x,getProgramCacheKey:g,getUniforms:C,acquireProgram:S,releaseProgram:b,releaseShaderCache:w,programs:h,dispose:O}}function am(){let o=new WeakMap;function e(r){return o.has(r)}function t(r){let a=o.get(r);return a===void 0&&(a={},o.set(r,a)),a}function n(r){o.delete(r)}function i(r,a,l){o.get(r)[a]=l}function s(){o=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function lm(o,e){return o.groupOrder!==e.groupOrder?o.groupOrder-e.groupOrder:o.renderOrder!==e.renderOrder?o.renderOrder-e.renderOrder:o.material.id!==e.material.id?o.material.id-e.material.id:o.z!==e.z?o.z-e.z:o.id-e.id}function ll(o,e){return o.groupOrder!==e.groupOrder?o.groupOrder-e.groupOrder:o.renderOrder!==e.renderOrder?o.renderOrder-e.renderOrder:o.z!==e.z?e.z-o.z:o.id-e.id}function cl(){const o=[];let e=0;const t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function r(d,u,f,p,m,x){let g=o[e];return g===void 0?(g={id:d.id,object:d,geometry:u,material:f,groupOrder:p,renderOrder:d.renderOrder,z:m,group:x},o[e]=g):(g.id=d.id,g.object=d,g.geometry=u,g.material=f,g.groupOrder=p,g.renderOrder=d.renderOrder,g.z=m,g.group=x),e++,g}function a(d,u,f,p,m,x){const g=r(d,u,f,p,m,x);f.transmission>0?n.push(g):f.transparent===!0?i.push(g):t.push(g)}function l(d,u,f,p,m,x){const g=r(d,u,f,p,m,x);f.transmission>0?n.unshift(g):f.transparent===!0?i.unshift(g):t.unshift(g)}function c(d,u){t.length>1&&t.sort(d||lm),n.length>1&&n.sort(u||ll),i.length>1&&i.sort(u||ll)}function h(){for(let d=e,u=o.length;d<u;d++){const f=o[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:a,unshift:l,finish:h,sort:c}}function cm(){let o=new WeakMap;function e(n,i){const s=o.get(n);let r;return s===void 0?(r=new cl,o.set(n,[r])):i>=s.length?(r=new cl,s.push(r)):r=s[i],r}function t(){o=new WeakMap}return{get:e,dispose:t}}function hm(){const o={};return{get:function(e){if(o[e.id]!==void 0)return o[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new R,color:new Ne};break;case"SpotLight":t={position:new R,direction:new R,color:new Ne,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new R,color:new Ne,distance:0,decay:0};break;case"HemisphereLight":t={direction:new R,skyColor:new Ne,groundColor:new Ne};break;case"RectAreaLight":t={color:new Ne,position:new R,halfWidth:new R,halfHeight:new R};break}return o[e.id]=t,t}}}function um(){const o={};return{get:function(e){if(o[e.id]!==void 0)return o[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return o[e.id]=t,t}}}let dm=0;function fm(o,e){return(e.castShadow?2:0)-(o.castShadow?2:0)+(e.map?1:0)-(o.map?1:0)}function pm(o){const e=new hm,t=um(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new R);const i=new R,s=new pt,r=new pt;function a(c){let h=0,d=0,u=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,p=0,m=0,x=0,g=0,v=0,_=0,C=0,S=0,b=0,w=0;c.sort(fm);for(let E=0,T=c.length;E<T;E++){const A=c[E],U=A.color,G=A.intensity,z=A.distance,$=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)h+=U.r*G,d+=U.g*G,u+=U.b*G;else if(A.isLightProbe){for(let W=0;W<9;W++)n.probe[W].addScaledVector(A.sh.coefficients[W],G);w++}else if(A.isDirectionalLight){const W=e.get(A);if(W.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const ee=A.shadow,q=t.get(A);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,n.directionalShadow[f]=q,n.directionalShadowMap[f]=$,n.directionalShadowMatrix[f]=A.shadow.matrix,v++}n.directional[f]=W,f++}else if(A.isSpotLight){const W=e.get(A);W.position.setFromMatrixPosition(A.matrixWorld),W.color.copy(U).multiplyScalar(G),W.distance=z,W.coneCos=Math.cos(A.angle),W.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),W.decay=A.decay,n.spot[m]=W;const ee=A.shadow;if(A.map&&(n.spotLightMap[S]=A.map,S++,ee.updateMatrices(A),A.castShadow&&b++),n.spotLightMatrix[m]=ee.matrix,A.castShadow){const q=t.get(A);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,n.spotShadow[m]=q,n.spotShadowMap[m]=$,C++}m++}else if(A.isRectAreaLight){const W=e.get(A);W.color.copy(U).multiplyScalar(G),W.halfWidth.set(A.width*.5,0,0),W.halfHeight.set(0,A.height*.5,0),n.rectArea[x]=W,x++}else if(A.isPointLight){const W=e.get(A);if(W.color.copy(A.color).multiplyScalar(A.intensity),W.distance=A.distance,W.decay=A.decay,A.castShadow){const ee=A.shadow,q=t.get(A);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,q.shadowCameraNear=ee.camera.near,q.shadowCameraFar=ee.camera.far,n.pointShadow[p]=q,n.pointShadowMap[p]=$,n.pointShadowMatrix[p]=A.shadow.matrix,_++}n.point[p]=W,p++}else if(A.isHemisphereLight){const W=e.get(A);W.skyColor.copy(A.color).multiplyScalar(G),W.groundColor.copy(A.groundColor).multiplyScalar(G),n.hemi[g]=W,g++}}x>0&&(o.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=_e.LTC_FLOAT_1,n.rectAreaLTC2=_e.LTC_FLOAT_2):(n.rectAreaLTC1=_e.LTC_HALF_1,n.rectAreaLTC2=_e.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const O=n.hash;(O.directionalLength!==f||O.pointLength!==p||O.spotLength!==m||O.rectAreaLength!==x||O.hemiLength!==g||O.numDirectionalShadows!==v||O.numPointShadows!==_||O.numSpotShadows!==C||O.numSpotMaps!==S||O.numLightProbes!==w)&&(n.directional.length=f,n.spot.length=m,n.rectArea.length=x,n.point.length=p,n.hemi.length=g,n.directionalShadow.length=v,n.directionalShadowMap.length=v,n.pointShadow.length=_,n.pointShadowMap.length=_,n.spotShadow.length=C,n.spotShadowMap.length=C,n.directionalShadowMatrix.length=v,n.pointShadowMatrix.length=_,n.spotLightMatrix.length=C+S-b,n.spotLightMap.length=S,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=w,O.directionalLength=f,O.pointLength=p,O.spotLength=m,O.rectAreaLength=x,O.hemiLength=g,O.numDirectionalShadows=v,O.numPointShadows=_,O.numSpotShadows=C,O.numSpotMaps=S,O.numLightProbes=w,n.version=dm++)}function l(c,h){let d=0,u=0,f=0,p=0,m=0;const x=h.matrixWorldInverse;for(let g=0,v=c.length;g<v;g++){const _=c[g];if(_.isDirectionalLight){const C=n.directional[d];C.direction.setFromMatrixPosition(_.matrixWorld),i.setFromMatrixPosition(_.target.matrixWorld),C.direction.sub(i),C.direction.transformDirection(x),d++}else if(_.isSpotLight){const C=n.spot[f];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),C.direction.setFromMatrixPosition(_.matrixWorld),i.setFromMatrixPosition(_.target.matrixWorld),C.direction.sub(i),C.direction.transformDirection(x),f++}else if(_.isRectAreaLight){const C=n.rectArea[p];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),r.identity(),s.copy(_.matrixWorld),s.premultiply(x),r.extractRotation(s),C.halfWidth.set(_.width*.5,0,0),C.halfHeight.set(0,_.height*.5,0),C.halfWidth.applyMatrix4(r),C.halfHeight.applyMatrix4(r),p++}else if(_.isPointLight){const C=n.point[u];C.position.setFromMatrixPosition(_.matrixWorld),C.position.applyMatrix4(x),u++}else if(_.isHemisphereLight){const C=n.hemi[m];C.direction.setFromMatrixPosition(_.matrixWorld),C.direction.transformDirection(x),m++}}}return{setup:a,setupView:l,state:n}}function hl(o){const e=new pm(o),t=[],n=[];function i(h){c.camera=h,t.length=0,n.length=0}function s(h){t.push(h)}function r(h){n.push(h)}function a(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:r}}function mm(o){let e=new WeakMap;function t(i,s=0){const r=e.get(i);let a;return r===void 0?(a=new hl(o),e.set(i,[a])):s>=r.length?(a=new hl(o),r.push(a)):a=r[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const gm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,xm=`uniform sampler2D shadow_pass;
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
}`;function ym(o,e,t){let n=new ss;const i=new ht,s=new ht,r=new vt,a=new Ph({depthPacking:Bc}),l=new Dh,c={},h=t.maxTextureSize,d={[zn]:Bt,[Bt]:zn,[Yt]:Yt},u=new qe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:gm,fragmentShader:xm}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const p=new mt;p.setAttribute("position",new Tt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const m=new Ce(p,u),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=_l;let g=this.type;this.render=function(b,w,O){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||b.length===0)return;const E=o.getRenderTarget(),T=o.getActiveCubeFace(),A=o.getActiveMipmapLevel(),U=o.state;U.setBlending(An),U.buffers.depth.getReversed()===!0?U.buffers.color.setClear(0,0,0,0):U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);const G=g!==Mn&&this.type===Mn,z=g===Mn&&this.type!==Mn;for(let $=0,W=b.length;$<W;$++){const ee=b[$],q=ee.shadow;if(q===void 0){Qe("WebGLShadowMap:",ee,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;i.copy(q.mapSize);const ne=q.getFrameExtents();if(i.multiply(ne),s.copy(q.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/ne.x),i.x=s.x*ne.x,q.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/ne.y),i.y=s.y*ne.y,q.mapSize.y=s.y)),q.map===null||G===!0||z===!0){const xe=this.type!==Mn?{minFilter:ct,magFilter:ct}:{};q.map!==null&&q.map.dispose(),q.map=new Wn(i.x,i.y,xe),q.map.texture.name=ee.name+".shadowMap",q.camera.updateProjectionMatrix()}o.setRenderTarget(q.map),o.clear();const te=q.getViewportCount();for(let xe=0;xe<te;xe++){const ze=q.getViewport(xe);r.set(s.x*ze.x,s.y*ze.y,s.x*ze.z,s.y*ze.w),U.viewport(r),q.updateMatrices(ee,xe),n=q.getFrustum(),C(w,O,q.camera,ee,this.type)}q.isPointLightShadow!==!0&&this.type===Mn&&v(q,O),q.needsUpdate=!1}g=this.type,x.needsUpdate=!1,o.setRenderTarget(E,T,A)};function v(b,w){const O=e.update(m);u.defines.VSM_SAMPLES!==b.blurSamples&&(u.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new Wn(i.x,i.y)),u.uniforms.shadow_pass.value=b.map.texture,u.uniforms.resolution.value=b.mapSize,u.uniforms.radius.value=b.radius,o.setRenderTarget(b.mapPass),o.clear(),o.renderBufferDirect(w,null,O,u,m,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,o.setRenderTarget(b.map),o.clear(),o.renderBufferDirect(w,null,O,f,m,null)}function _(b,w,O,E){let T=null;const A=O.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(A!==void 0)T=A;else if(T=O.isPointLight===!0?l:a,o.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){const U=T.uuid,G=w.uuid;let z=c[U];z===void 0&&(z={},c[U]=z);let $=z[G];$===void 0&&($=T.clone(),z[G]=$,w.addEventListener("dispose",S)),T=$}if(T.visible=w.visible,T.wireframe=w.wireframe,E===Mn?T.side=w.shadowSide!==null?w.shadowSide:w.side:T.side=w.shadowSide!==null?w.shadowSide:d[w.side],T.alphaMap=w.alphaMap,T.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,T.map=w.map,T.clipShadows=w.clipShadows,T.clippingPlanes=w.clippingPlanes,T.clipIntersection=w.clipIntersection,T.displacementMap=w.displacementMap,T.displacementScale=w.displacementScale,T.displacementBias=w.displacementBias,T.wireframeLinewidth=w.wireframeLinewidth,T.linewidth=w.linewidth,O.isPointLight===!0&&T.isMeshDistanceMaterial===!0){const U=o.properties.get(T);U.light=O}return T}function C(b,w,O,E,T){if(b.visible===!1)return;if(b.layers.test(w.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&T===Mn)&&(!b.frustumCulled||n.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,b.matrixWorld);const G=e.update(b),z=b.material;if(Array.isArray(z)){const $=G.groups;for(let W=0,ee=$.length;W<ee;W++){const q=$[W],ne=z[q.materialIndex];if(ne&&ne.visible){const te=_(b,ne,E,T);b.onBeforeShadow(o,b,w,O,G,te,q),o.renderBufferDirect(O,null,G,te,b,q),b.onAfterShadow(o,b,w,O,G,te,q)}}}else if(z.visible){const $=_(b,z,E,T);b.onBeforeShadow(o,b,w,O,G,$,null),o.renderBufferDirect(O,null,G,$,b,null),b.onAfterShadow(o,b,w,O,G,$,null)}}const U=b.children;for(let G=0,z=U.length;G<z;G++)C(U[G],w,O,E,T)}function S(b){b.target.removeEventListener("dispose",S);for(const O in c){const E=c[O],T=b.target.uuid;T in E&&(E[T].dispose(),delete E[T])}}}const vm={[Xr]:$r,[Yr]:Jr,[Kr]:Zr,[Ei]:jr,[$r]:Xr,[Jr]:Yr,[Zr]:Kr,[jr]:Ei};function _m(o,e){function t(){let k=!1;const Se=new vt;let ye=null;const ve=new vt(0,0,0,0);return{setMask:function(ce){ye!==ce&&!k&&(o.colorMask(ce,ce,ce,ce),ye=ce)},setLocked:function(ce){k=ce},setClear:function(ce,re,Oe,Ze,bt){bt===!0&&(ce*=Ze,re*=Ze,Oe*=Ze),Se.set(ce,re,Oe,Ze),ve.equals(Se)===!1&&(o.clearColor(ce,re,Oe,Ze),ve.copy(Se))},reset:function(){k=!1,ye=null,ve.set(-1,0,0,0)}}}function n(){let k=!1,Se=!1,ye=null,ve=null,ce=null;return{setReversed:function(re){if(Se!==re){const Oe=e.get("EXT_clip_control");re?Oe.clipControlEXT(Oe.LOWER_LEFT_EXT,Oe.ZERO_TO_ONE_EXT):Oe.clipControlEXT(Oe.LOWER_LEFT_EXT,Oe.NEGATIVE_ONE_TO_ONE_EXT),Se=re;const Ze=ce;ce=null,this.setClear(Ze)}},getReversed:function(){return Se},setTest:function(re){re?X(o.DEPTH_TEST):he(o.DEPTH_TEST)},setMask:function(re){ye!==re&&!k&&(o.depthMask(re),ye=re)},setFunc:function(re){if(Se&&(re=vm[re]),ve!==re){switch(re){case Xr:o.depthFunc(o.NEVER);break;case $r:o.depthFunc(o.ALWAYS);break;case Yr:o.depthFunc(o.LESS);break;case Ei:o.depthFunc(o.LEQUAL);break;case Kr:o.depthFunc(o.EQUAL);break;case jr:o.depthFunc(o.GEQUAL);break;case Jr:o.depthFunc(o.GREATER);break;case Zr:o.depthFunc(o.NOTEQUAL);break;default:o.depthFunc(o.LEQUAL)}ve=re}},setLocked:function(re){k=re},setClear:function(re){ce!==re&&(Se&&(re=1-re),o.clearDepth(re),ce=re)},reset:function(){k=!1,ye=null,ve=null,ce=null,Se=!1}}}function i(){let k=!1,Se=null,ye=null,ve=null,ce=null,re=null,Oe=null,Ze=null,bt=null;return{setTest:function(gt){k||(gt?X(o.STENCIL_TEST):he(o.STENCIL_TEST))},setMask:function(gt){Se!==gt&&!k&&(o.stencilMask(gt),Se=gt)},setFunc:function(gt,dn,on){(ye!==gt||ve!==dn||ce!==on)&&(o.stencilFunc(gt,dn,on),ye=gt,ve=dn,ce=on)},setOp:function(gt,dn,on){(re!==gt||Oe!==dn||Ze!==on)&&(o.stencilOp(gt,dn,on),re=gt,Oe=dn,Ze=on)},setLocked:function(gt){k=gt},setClear:function(gt){bt!==gt&&(o.clearStencil(gt),bt=gt)},reset:function(){k=!1,Se=null,ye=null,ve=null,ce=null,re=null,Oe=null,Ze=null,bt=null}}}const s=new t,r=new n,a=new i,l=new WeakMap,c=new WeakMap;let h={},d={},u=new WeakMap,f=[],p=null,m=!1,x=null,g=null,v=null,_=null,C=null,S=null,b=null,w=new Ne(0,0,0),O=0,E=!1,T=null,A=null,U=null,G=null,z=null;const $=o.getParameter(o.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,ee=0;const q=o.getParameter(o.VERSION);q.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(q)[1]),W=ee>=1):q.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),W=ee>=2);let ne=null,te={};const xe=o.getParameter(o.SCISSOR_BOX),ze=o.getParameter(o.VIEWPORT),He=new vt().fromArray(xe),be=new vt().fromArray(ze);function Pe(k,Se,ye,ve){const ce=new Uint8Array(4),re=o.createTexture();o.bindTexture(k,re),o.texParameteri(k,o.TEXTURE_MIN_FILTER,o.NEAREST),o.texParameteri(k,o.TEXTURE_MAG_FILTER,o.NEAREST);for(let Oe=0;Oe<ye;Oe++)k===o.TEXTURE_3D||k===o.TEXTURE_2D_ARRAY?o.texImage3D(Se,0,o.RGBA,1,1,ve,0,o.RGBA,o.UNSIGNED_BYTE,ce):o.texImage2D(Se+Oe,0,o.RGBA,1,1,0,o.RGBA,o.UNSIGNED_BYTE,ce);return re}const j={};j[o.TEXTURE_2D]=Pe(o.TEXTURE_2D,o.TEXTURE_2D,1),j[o.TEXTURE_CUBE_MAP]=Pe(o.TEXTURE_CUBE_MAP,o.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[o.TEXTURE_2D_ARRAY]=Pe(o.TEXTURE_2D_ARRAY,o.TEXTURE_2D_ARRAY,1,1),j[o.TEXTURE_3D]=Pe(o.TEXTURE_3D,o.TEXTURE_3D,1,1),s.setClear(0,0,0,1),r.setClear(1),a.setClear(0),X(o.DEPTH_TEST),r.setFunc(Ei),De(!1),Ue(ra),X(o.CULL_FACE),et(An);function X(k){h[k]!==!0&&(o.enable(k),h[k]=!0)}function he(k){h[k]!==!1&&(o.disable(k),h[k]=!1)}function oe(k,Se){return d[k]!==Se?(o.bindFramebuffer(k,Se),d[k]=Se,k===o.DRAW_FRAMEBUFFER&&(d[o.FRAMEBUFFER]=Se),k===o.FRAMEBUFFER&&(d[o.DRAW_FRAMEBUFFER]=Se),!0):!1}function de(k,Se){let ye=f,ve=!1;if(k){ye=u.get(Se),ye===void 0&&(ye=[],u.set(Se,ye));const ce=k.textures;if(ye.length!==ce.length||ye[0]!==o.COLOR_ATTACHMENT0){for(let re=0,Oe=ce.length;re<Oe;re++)ye[re]=o.COLOR_ATTACHMENT0+re;ye.length=ce.length,ve=!0}}else ye[0]!==o.BACK&&(ye[0]=o.BACK,ve=!0);ve&&o.drawBuffers(ye)}function pe(k){return p!==k?(o.useProgram(k),p=k,!0):!1}const Je={[Qn]:o.FUNC_ADD,[dc]:o.FUNC_SUBTRACT,[fc]:o.FUNC_REVERSE_SUBTRACT};Je[pc]=o.MIN,Je[mc]=o.MAX;const Be={[gc]:o.ZERO,[xc]:o.ONE,[yc]:o.SRC_COLOR,[Vr]:o.SRC_ALPHA,[Ec]:o.SRC_ALPHA_SATURATE,[Sc]:o.DST_COLOR,[_c]:o.DST_ALPHA,[vc]:o.ONE_MINUS_SRC_COLOR,[qr]:o.ONE_MINUS_SRC_ALPHA,[Tc]:o.ONE_MINUS_DST_COLOR,[bc]:o.ONE_MINUS_DST_ALPHA,[Mc]:o.CONSTANT_COLOR,[Cc]:o.ONE_MINUS_CONSTANT_COLOR,[Ac]:o.CONSTANT_ALPHA,[wc]:o.ONE_MINUS_CONSTANT_ALPHA};function et(k,Se,ye,ve,ce,re,Oe,Ze,bt,gt){if(k===An){m===!0&&(he(o.BLEND),m=!1);return}if(m===!1&&(X(o.BLEND),m=!0),k!==uc){if(k!==x||gt!==E){if((g!==Qn||C!==Qn)&&(o.blendEquation(o.FUNC_ADD),g=Qn,C=Qn),gt)switch(k){case ri:o.blendFuncSeparate(o.ONE,o.ONE_MINUS_SRC_ALPHA,o.ONE,o.ONE_MINUS_SRC_ALPHA);break;case Wr:o.blendFunc(o.ONE,o.ONE);break;case oa:o.blendFuncSeparate(o.ZERO,o.ONE_MINUS_SRC_COLOR,o.ZERO,o.ONE);break;case aa:o.blendFuncSeparate(o.DST_COLOR,o.ONE_MINUS_SRC_ALPHA,o.ZERO,o.ONE);break;default:It("WebGLState: Invalid blending: ",k);break}else switch(k){case ri:o.blendFuncSeparate(o.SRC_ALPHA,o.ONE_MINUS_SRC_ALPHA,o.ONE,o.ONE_MINUS_SRC_ALPHA);break;case Wr:o.blendFuncSeparate(o.SRC_ALPHA,o.ONE,o.ONE,o.ONE);break;case oa:It("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case aa:It("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:It("WebGLState: Invalid blending: ",k);break}v=null,_=null,S=null,b=null,w.set(0,0,0),O=0,x=k,E=gt}return}ce=ce||Se,re=re||ye,Oe=Oe||ve,(Se!==g||ce!==C)&&(o.blendEquationSeparate(Je[Se],Je[ce]),g=Se,C=ce),(ye!==v||ve!==_||re!==S||Oe!==b)&&(o.blendFuncSeparate(Be[ye],Be[ve],Be[re],Be[Oe]),v=ye,_=ve,S=re,b=Oe),(Ze.equals(w)===!1||bt!==O)&&(o.blendColor(Ze.r,Ze.g,Ze.b,bt),w.copy(Ze),O=bt),x=k,E=!1}function F(k,Se){k.side===Yt?he(o.CULL_FACE):X(o.CULL_FACE);let ye=k.side===Bt;Se&&(ye=!ye),De(ye),k.blending===ri&&k.transparent===!1?et(An):et(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),r.setFunc(k.depthFunc),r.setTest(k.depthTest),r.setMask(k.depthWrite),s.setMask(k.colorWrite);const ve=k.stencilWrite;a.setTest(ve),ve&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),me(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?X(o.SAMPLE_ALPHA_TO_COVERAGE):he(o.SAMPLE_ALPHA_TO_COVERAGE)}function De(k){T!==k&&(k?o.frontFace(o.CW):o.frontFace(o.CCW),T=k)}function Ue(k){k!==cc?(X(o.CULL_FACE),k!==A&&(k===ra?o.cullFace(o.BACK):k===hc?o.cullFace(o.FRONT):o.cullFace(o.FRONT_AND_BACK))):he(o.CULL_FACE),A=k}function Xe(k){k!==U&&(W&&o.lineWidth(k),U=k)}function me(k,Se,ye){k?(X(o.POLYGON_OFFSET_FILL),(G!==Se||z!==ye)&&(o.polygonOffset(Se,ye),G=Se,z=ye)):he(o.POLYGON_OFFSET_FILL)}function st(k){k?X(o.SCISSOR_TEST):he(o.SCISSOR_TEST)}function Me(k){k===void 0&&(k=o.TEXTURE0+$-1),ne!==k&&(o.activeTexture(k),ne=k)}function Le(k,Se,ye){ye===void 0&&(ne===null?ye=o.TEXTURE0+$-1:ye=ne);let ve=te[ye];ve===void 0&&(ve={type:void 0,texture:void 0},te[ye]=ve),(ve.type!==k||ve.texture!==Se)&&(ne!==ye&&(o.activeTexture(ye),ne=ye),o.bindTexture(k,Se||j[k]),ve.type=k,ve.texture=Se)}function D(){const k=te[ne];k!==void 0&&k.type!==void 0&&(o.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function M(){try{o.compressedTexImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function B(){try{o.compressedTexImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function Z(){try{o.texSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function se(){try{o.texSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function J(){try{o.compressedTexSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function Re(){try{o.compressedTexSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function ge(){try{o.texStorage2D(...arguments)}catch(k){k("WebGLState:",k)}}function ke(){try{o.texStorage3D(...arguments)}catch(k){k("WebGLState:",k)}}function we(){try{o.texImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function ie(){try{o.texImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function le(k){He.equals(k)===!1&&(o.scissor(k.x,k.y,k.z,k.w),He.copy(k))}function ue(k){be.equals(k)===!1&&(o.viewport(k.x,k.y,k.z,k.w),be.copy(k))}function Q(k,Se){let ye=c.get(Se);ye===void 0&&(ye=new WeakMap,c.set(Se,ye));let ve=ye.get(k);ve===void 0&&(ve=o.getUniformBlockIndex(Se,k.name),ye.set(k,ve))}function ae(k,Se){const ve=c.get(Se).get(k);l.get(Se)!==ve&&(o.uniformBlockBinding(Se,ve,k.__bindingPointIndex),l.set(Se,ve))}function Ie(){o.disable(o.BLEND),o.disable(o.CULL_FACE),o.disable(o.DEPTH_TEST),o.disable(o.POLYGON_OFFSET_FILL),o.disable(o.SCISSOR_TEST),o.disable(o.STENCIL_TEST),o.disable(o.SAMPLE_ALPHA_TO_COVERAGE),o.blendEquation(o.FUNC_ADD),o.blendFunc(o.ONE,o.ZERO),o.blendFuncSeparate(o.ONE,o.ZERO,o.ONE,o.ZERO),o.blendColor(0,0,0,0),o.colorMask(!0,!0,!0,!0),o.clearColor(0,0,0,0),o.depthMask(!0),o.depthFunc(o.LESS),r.setReversed(!1),o.clearDepth(1),o.stencilMask(4294967295),o.stencilFunc(o.ALWAYS,0,4294967295),o.stencilOp(o.KEEP,o.KEEP,o.KEEP),o.clearStencil(0),o.cullFace(o.BACK),o.frontFace(o.CCW),o.polygonOffset(0,0),o.activeTexture(o.TEXTURE0),o.bindFramebuffer(o.FRAMEBUFFER,null),o.bindFramebuffer(o.DRAW_FRAMEBUFFER,null),o.bindFramebuffer(o.READ_FRAMEBUFFER,null),o.useProgram(null),o.lineWidth(1),o.scissor(0,0,o.canvas.width,o.canvas.height),o.viewport(0,0,o.canvas.width,o.canvas.height),h={},ne=null,te={},d={},u=new WeakMap,f=[],p=null,m=!1,x=null,g=null,v=null,_=null,C=null,S=null,b=null,w=new Ne(0,0,0),O=0,E=!1,T=null,A=null,U=null,G=null,z=null,He.set(0,0,o.canvas.width,o.canvas.height),be.set(0,0,o.canvas.width,o.canvas.height),s.reset(),r.reset(),a.reset()}return{buffers:{color:s,depth:r,stencil:a},enable:X,disable:he,bindFramebuffer:oe,drawBuffers:de,useProgram:pe,setBlending:et,setMaterial:F,setFlipSided:De,setCullFace:Ue,setLineWidth:Xe,setPolygonOffset:me,setScissorTest:st,activeTexture:Me,bindTexture:Le,unbindTexture:D,compressedTexImage2D:M,compressedTexImage3D:B,texImage2D:we,texImage3D:ie,updateUBOMapping:Q,uniformBlockBinding:ae,texStorage2D:ge,texStorage3D:ke,texSubImage2D:Z,texSubImage3D:se,compressedTexSubImage2D:J,compressedTexSubImage3D:Re,scissor:le,viewport:ue,reset:Ie}}function bm(o,e,t,n,i,s,r){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ht,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(D,M){return f?new OffscreenCanvas(D,M):Zi("canvas")}function m(D,M,B){let Z=1;const se=Le(D);if((se.width>B||se.height>B)&&(Z=B/Math.max(se.width,se.height)),Z<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const J=Math.floor(Z*se.width),Re=Math.floor(Z*se.height);d===void 0&&(d=p(J,Re));const ge=M?p(J,Re):d;return ge.width=J,ge.height=Re,ge.getContext("2d").drawImage(D,0,0,J,Re),Qe("WebGLRenderer: Texture has been resized from ("+se.width+"x"+se.height+") to ("+J+"x"+Re+")."),ge}else return"data"in D&&Qe("WebGLRenderer: Image in DataTexture is too big ("+se.width+"x"+se.height+")."),D;return D}function x(D){return D.generateMipmaps}function g(D){o.generateMipmap(D)}function v(D){return D.isWebGLCubeRenderTarget?o.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?o.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?o.TEXTURE_2D_ARRAY:o.TEXTURE_2D}function _(D,M,B,Z,se=!1){if(D!==null){if(o[D]!==void 0)return o[D];Qe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let J=M;if(M===o.RED&&(B===o.FLOAT&&(J=o.R32F),B===o.HALF_FLOAT&&(J=o.R16F),B===o.UNSIGNED_BYTE&&(J=o.R8)),M===o.RED_INTEGER&&(B===o.UNSIGNED_BYTE&&(J=o.R8UI),B===o.UNSIGNED_SHORT&&(J=o.R16UI),B===o.UNSIGNED_INT&&(J=o.R32UI),B===o.BYTE&&(J=o.R8I),B===o.SHORT&&(J=o.R16I),B===o.INT&&(J=o.R32I)),M===o.RG&&(B===o.FLOAT&&(J=o.RG32F),B===o.HALF_FLOAT&&(J=o.RG16F),B===o.UNSIGNED_BYTE&&(J=o.RG8)),M===o.RG_INTEGER&&(B===o.UNSIGNED_BYTE&&(J=o.RG8UI),B===o.UNSIGNED_SHORT&&(J=o.RG16UI),B===o.UNSIGNED_INT&&(J=o.RG32UI),B===o.BYTE&&(J=o.RG8I),B===o.SHORT&&(J=o.RG16I),B===o.INT&&(J=o.RG32I)),M===o.RGB_INTEGER&&(B===o.UNSIGNED_BYTE&&(J=o.RGB8UI),B===o.UNSIGNED_SHORT&&(J=o.RGB16UI),B===o.UNSIGNED_INT&&(J=o.RGB32UI),B===o.BYTE&&(J=o.RGB8I),B===o.SHORT&&(J=o.RGB16I),B===o.INT&&(J=o.RGB32I)),M===o.RGBA_INTEGER&&(B===o.UNSIGNED_BYTE&&(J=o.RGBA8UI),B===o.UNSIGNED_SHORT&&(J=o.RGBA16UI),B===o.UNSIGNED_INT&&(J=o.RGBA32UI),B===o.BYTE&&(J=o.RGBA8I),B===o.SHORT&&(J=o.RGBA16I),B===o.INT&&(J=o.RGBA32I)),M===o.RGB&&(B===o.UNSIGNED_INT_5_9_9_9_REV&&(J=o.RGB9_E5),B===o.UNSIGNED_INT_10F_11F_11F_REV&&(J=o.R11F_G11F_B10F)),M===o.RGBA){const Re=se?$s:dt.getTransfer(Z);B===o.FLOAT&&(J=o.RGBA32F),B===o.HALF_FLOAT&&(J=o.RGBA16F),B===o.UNSIGNED_BYTE&&(J=Re===yt?o.SRGB8_ALPHA8:o.RGBA8),B===o.UNSIGNED_SHORT_4_4_4_4&&(J=o.RGBA4),B===o.UNSIGNED_SHORT_5_5_5_1&&(J=o.RGB5_A1)}return(J===o.R16F||J===o.R32F||J===o.RG16F||J===o.RG32F||J===o.RGBA16F||J===o.RGBA32F)&&e.get("EXT_color_buffer_float"),J}function C(D,M){let B;return D?M===null||M===Hn||M===ji?B=o.DEPTH24_STENCIL8:M===Cn?B=o.DEPTH32F_STENCIL8:M===Ki&&(B=o.DEPTH24_STENCIL8,Qe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Hn||M===ji?B=o.DEPTH_COMPONENT24:M===Cn?B=o.DEPTH_COMPONENT32F:M===Ki&&(B=o.DEPTH_COMPONENT16),B}function S(D,M){return x(D)===!0||D.isFramebufferTexture&&D.minFilter!==ct&&D.minFilter!==rn?Math.log2(Math.max(M.width,M.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?M.mipmaps.length:1}function b(D){const M=D.target;M.removeEventListener("dispose",b),O(M),M.isVideoTexture&&h.delete(M)}function w(D){const M=D.target;M.removeEventListener("dispose",w),T(M)}function O(D){const M=n.get(D);if(M.__webglInit===void 0)return;const B=D.source,Z=u.get(B);if(Z){const se=Z[M.__cacheKey];se.usedTimes--,se.usedTimes===0&&E(D),Object.keys(Z).length===0&&u.delete(B)}n.remove(D)}function E(D){const M=n.get(D);o.deleteTexture(M.__webglTexture);const B=D.source,Z=u.get(B);delete Z[M.__cacheKey],r.memory.textures--}function T(D){const M=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(M.__webglFramebuffer[Z]))for(let se=0;se<M.__webglFramebuffer[Z].length;se++)o.deleteFramebuffer(M.__webglFramebuffer[Z][se]);else o.deleteFramebuffer(M.__webglFramebuffer[Z]);M.__webglDepthbuffer&&o.deleteRenderbuffer(M.__webglDepthbuffer[Z])}else{if(Array.isArray(M.__webglFramebuffer))for(let Z=0;Z<M.__webglFramebuffer.length;Z++)o.deleteFramebuffer(M.__webglFramebuffer[Z]);else o.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&o.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&o.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let Z=0;Z<M.__webglColorRenderbuffer.length;Z++)M.__webglColorRenderbuffer[Z]&&o.deleteRenderbuffer(M.__webglColorRenderbuffer[Z]);M.__webglDepthRenderbuffer&&o.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const B=D.textures;for(let Z=0,se=B.length;Z<se;Z++){const J=n.get(B[Z]);J.__webglTexture&&(o.deleteTexture(J.__webglTexture),r.memory.textures--),n.remove(B[Z])}n.remove(D)}let A=0;function U(){A=0}function G(){const D=A;return D>=i.maxTextures&&Qe("WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+i.maxTextures),A+=1,D}function z(D){const M=[];return M.push(D.wrapS),M.push(D.wrapT),M.push(D.wrapR||0),M.push(D.magFilter),M.push(D.minFilter),M.push(D.anisotropy),M.push(D.internalFormat),M.push(D.format),M.push(D.type),M.push(D.generateMipmaps),M.push(D.premultiplyAlpha),M.push(D.flipY),M.push(D.unpackAlignment),M.push(D.colorSpace),M.join()}function $(D,M){const B=n.get(D);if(D.isVideoTexture&&st(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&B.__version!==D.version){const Z=D.image;if(Z===null)Qe("WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)Qe("WebGLRenderer: Texture marked for update but image is incomplete");else{j(B,D,M);return}}else D.isExternalTexture&&(B.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(o.TEXTURE_2D,B.__webglTexture,o.TEXTURE0+M)}function W(D,M){const B=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&B.__version!==D.version){j(B,D,M);return}else D.isExternalTexture&&(B.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(o.TEXTURE_2D_ARRAY,B.__webglTexture,o.TEXTURE0+M)}function ee(D,M){const B=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&B.__version!==D.version){j(B,D,M);return}t.bindTexture(o.TEXTURE_3D,B.__webglTexture,o.TEXTURE0+M)}function q(D,M){const B=n.get(D);if(D.version>0&&B.__version!==D.version){X(B,D,M);return}t.bindTexture(o.TEXTURE_CUBE_MAP,B.__webglTexture,o.TEXTURE0+M)}const ne={[In]:o.REPEAT,[Ct]:o.CLAMP_TO_EDGE,[to]:o.MIRRORED_REPEAT},te={[ct]:o.NEAREST,[kc]:o.NEAREST_MIPMAP_NEAREST,[as]:o.NEAREST_MIPMAP_LINEAR,[rn]:o.LINEAR,[or]:o.LINEAR_MIPMAP_NEAREST,[si]:o.LINEAR_MIPMAP_LINEAR},xe={[Hc]:o.NEVER,[Yc]:o.ALWAYS,[Wc]:o.LESS,[Pl]:o.LEQUAL,[Vc]:o.EQUAL,[$c]:o.GEQUAL,[qc]:o.GREATER,[Xc]:o.NOTEQUAL};function ze(D,M){if(M.type===Cn&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===rn||M.magFilter===or||M.magFilter===as||M.magFilter===si||M.minFilter===rn||M.minFilter===or||M.minFilter===as||M.minFilter===si)&&Qe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),o.texParameteri(D,o.TEXTURE_WRAP_S,ne[M.wrapS]),o.texParameteri(D,o.TEXTURE_WRAP_T,ne[M.wrapT]),(D===o.TEXTURE_3D||D===o.TEXTURE_2D_ARRAY)&&o.texParameteri(D,o.TEXTURE_WRAP_R,ne[M.wrapR]),o.texParameteri(D,o.TEXTURE_MAG_FILTER,te[M.magFilter]),o.texParameteri(D,o.TEXTURE_MIN_FILTER,te[M.minFilter]),M.compareFunction&&(o.texParameteri(D,o.TEXTURE_COMPARE_MODE,o.COMPARE_REF_TO_TEXTURE),o.texParameteri(D,o.TEXTURE_COMPARE_FUNC,xe[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===ct||M.minFilter!==as&&M.minFilter!==si||M.type===Cn&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const B=e.get("EXT_texture_filter_anisotropic");o.texParameterf(D,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function He(D,M){let B=!1;D.__webglInit===void 0&&(D.__webglInit=!0,M.addEventListener("dispose",b));const Z=M.source;let se=u.get(Z);se===void 0&&(se={},u.set(Z,se));const J=z(M);if(J!==D.__cacheKey){se[J]===void 0&&(se[J]={texture:o.createTexture(),usedTimes:0},r.memory.textures++,B=!0),se[J].usedTimes++;const Re=se[D.__cacheKey];Re!==void 0&&(se[D.__cacheKey].usedTimes--,Re.usedTimes===0&&E(M)),D.__cacheKey=J,D.__webglTexture=se[J].texture}return B}function be(D,M,B){return Math.floor(Math.floor(D/B)/M)}function Pe(D,M,B,Z){const J=D.updateRanges;if(J.length===0)t.texSubImage2D(o.TEXTURE_2D,0,0,0,M.width,M.height,B,Z,M.data);else{J.sort((ie,le)=>ie.start-le.start);let Re=0;for(let ie=1;ie<J.length;ie++){const le=J[Re],ue=J[ie],Q=le.start+le.count,ae=be(ue.start,M.width,4),Ie=be(le.start,M.width,4);ue.start<=Q+1&&ae===Ie&&be(ue.start+ue.count-1,M.width,4)===ae?le.count=Math.max(le.count,ue.start+ue.count-le.start):(++Re,J[Re]=ue)}J.length=Re+1;const ge=o.getParameter(o.UNPACK_ROW_LENGTH),ke=o.getParameter(o.UNPACK_SKIP_PIXELS),we=o.getParameter(o.UNPACK_SKIP_ROWS);o.pixelStorei(o.UNPACK_ROW_LENGTH,M.width);for(let ie=0,le=J.length;ie<le;ie++){const ue=J[ie],Q=Math.floor(ue.start/4),ae=Math.ceil(ue.count/4),Ie=Q%M.width,k=Math.floor(Q/M.width),Se=ae,ye=1;o.pixelStorei(o.UNPACK_SKIP_PIXELS,Ie),o.pixelStorei(o.UNPACK_SKIP_ROWS,k),t.texSubImage2D(o.TEXTURE_2D,0,Ie,k,Se,ye,B,Z,M.data)}D.clearUpdateRanges(),o.pixelStorei(o.UNPACK_ROW_LENGTH,ge),o.pixelStorei(o.UNPACK_SKIP_PIXELS,ke),o.pixelStorei(o.UNPACK_SKIP_ROWS,we)}}function j(D,M,B){let Z=o.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(Z=o.TEXTURE_2D_ARRAY),M.isData3DTexture&&(Z=o.TEXTURE_3D);const se=He(D,M),J=M.source;t.bindTexture(Z,D.__webglTexture,o.TEXTURE0+B);const Re=n.get(J);if(J.version!==Re.__version||se===!0){t.activeTexture(o.TEXTURE0+B);const ge=dt.getPrimaries(dt.workingColorSpace),ke=M.colorSpace===kn?null:dt.getPrimaries(M.colorSpace),we=M.colorSpace===kn||ge===ke?o.NONE:o.BROWSER_DEFAULT_WEBGL;o.pixelStorei(o.UNPACK_FLIP_Y_WEBGL,M.flipY),o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),o.pixelStorei(o.UNPACK_ALIGNMENT,M.unpackAlignment),o.pixelStorei(o.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);let ie=m(M.image,!1,i.maxTextureSize);ie=Me(M,ie);const le=s.convert(M.format,M.colorSpace),ue=s.convert(M.type);let Q=_(M.internalFormat,le,ue,M.colorSpace,M.isVideoTexture);ze(Z,M);let ae;const Ie=M.mipmaps,k=M.isVideoTexture!==!0,Se=Re.__version===void 0||se===!0,ye=J.dataReady,ve=S(M,ie);if(M.isDepthTexture)Q=C(M.format===Ji,M.type),Se&&(k?t.texStorage2D(o.TEXTURE_2D,1,Q,ie.width,ie.height):t.texImage2D(o.TEXTURE_2D,0,Q,ie.width,ie.height,0,le,ue,null));else if(M.isDataTexture)if(Ie.length>0){k&&Se&&t.texStorage2D(o.TEXTURE_2D,ve,Q,Ie[0].width,Ie[0].height);for(let ce=0,re=Ie.length;ce<re;ce++)ae=Ie[ce],k?ye&&t.texSubImage2D(o.TEXTURE_2D,ce,0,0,ae.width,ae.height,le,ue,ae.data):t.texImage2D(o.TEXTURE_2D,ce,Q,ae.width,ae.height,0,le,ue,ae.data);M.generateMipmaps=!1}else k?(Se&&t.texStorage2D(o.TEXTURE_2D,ve,Q,ie.width,ie.height),ye&&Pe(M,ie,le,ue)):t.texImage2D(o.TEXTURE_2D,0,Q,ie.width,ie.height,0,le,ue,ie.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){k&&Se&&t.texStorage3D(o.TEXTURE_2D_ARRAY,ve,Q,Ie[0].width,Ie[0].height,ie.depth);for(let ce=0,re=Ie.length;ce<re;ce++)if(ae=Ie[ce],M.format!==un)if(le!==null)if(k){if(ye)if(M.layerUpdates.size>0){const Oe=za(ae.width,ae.height,M.format,M.type);for(const Ze of M.layerUpdates){const bt=ae.data.subarray(Ze*Oe/ae.data.BYTES_PER_ELEMENT,(Ze+1)*Oe/ae.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(o.TEXTURE_2D_ARRAY,ce,0,0,Ze,ae.width,ae.height,1,le,bt)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(o.TEXTURE_2D_ARRAY,ce,0,0,0,ae.width,ae.height,ie.depth,le,ae.data)}else t.compressedTexImage3D(o.TEXTURE_2D_ARRAY,ce,Q,ae.width,ae.height,ie.depth,0,ae.data,0,0);else Qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else k?ye&&t.texSubImage3D(o.TEXTURE_2D_ARRAY,ce,0,0,0,ae.width,ae.height,ie.depth,le,ue,ae.data):t.texImage3D(o.TEXTURE_2D_ARRAY,ce,Q,ae.width,ae.height,ie.depth,0,le,ue,ae.data)}else{k&&Se&&t.texStorage2D(o.TEXTURE_2D,ve,Q,Ie[0].width,Ie[0].height);for(let ce=0,re=Ie.length;ce<re;ce++)ae=Ie[ce],M.format!==un?le!==null?k?ye&&t.compressedTexSubImage2D(o.TEXTURE_2D,ce,0,0,ae.width,ae.height,le,ae.data):t.compressedTexImage2D(o.TEXTURE_2D,ce,Q,ae.width,ae.height,0,ae.data):Qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):k?ye&&t.texSubImage2D(o.TEXTURE_2D,ce,0,0,ae.width,ae.height,le,ue,ae.data):t.texImage2D(o.TEXTURE_2D,ce,Q,ae.width,ae.height,0,le,ue,ae.data)}else if(M.isDataArrayTexture)if(k){if(Se&&t.texStorage3D(o.TEXTURE_2D_ARRAY,ve,Q,ie.width,ie.height,ie.depth),ye)if(M.layerUpdates.size>0){const ce=za(ie.width,ie.height,M.format,M.type);for(const re of M.layerUpdates){const Oe=ie.data.subarray(re*ce/ie.data.BYTES_PER_ELEMENT,(re+1)*ce/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(o.TEXTURE_2D_ARRAY,0,0,0,re,ie.width,ie.height,1,le,ue,Oe)}M.clearLayerUpdates()}else t.texSubImage3D(o.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,le,ue,ie.data)}else t.texImage3D(o.TEXTURE_2D_ARRAY,0,Q,ie.width,ie.height,ie.depth,0,le,ue,ie.data);else if(M.isData3DTexture)k?(Se&&t.texStorage3D(o.TEXTURE_3D,ve,Q,ie.width,ie.height,ie.depth),ye&&t.texSubImage3D(o.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,le,ue,ie.data)):t.texImage3D(o.TEXTURE_3D,0,Q,ie.width,ie.height,ie.depth,0,le,ue,ie.data);else if(M.isFramebufferTexture){if(Se)if(k)t.texStorage2D(o.TEXTURE_2D,ve,Q,ie.width,ie.height);else{let ce=ie.width,re=ie.height;for(let Oe=0;Oe<ve;Oe++)t.texImage2D(o.TEXTURE_2D,Oe,Q,ce,re,0,le,ue,null),ce>>=1,re>>=1}}else if(Ie.length>0){if(k&&Se){const ce=Le(Ie[0]);t.texStorage2D(o.TEXTURE_2D,ve,Q,ce.width,ce.height)}for(let ce=0,re=Ie.length;ce<re;ce++)ae=Ie[ce],k?ye&&t.texSubImage2D(o.TEXTURE_2D,ce,0,0,le,ue,ae):t.texImage2D(o.TEXTURE_2D,ce,Q,le,ue,ae);M.generateMipmaps=!1}else if(k){if(Se){const ce=Le(ie);t.texStorage2D(o.TEXTURE_2D,ve,Q,ce.width,ce.height)}ye&&t.texSubImage2D(o.TEXTURE_2D,0,0,0,le,ue,ie)}else t.texImage2D(o.TEXTURE_2D,0,Q,le,ue,ie);x(M)&&g(Z),Re.__version=J.version,M.onUpdate&&M.onUpdate(M)}D.__version=M.version}function X(D,M,B){if(M.image.length!==6)return;const Z=He(D,M),se=M.source;t.bindTexture(o.TEXTURE_CUBE_MAP,D.__webglTexture,o.TEXTURE0+B);const J=n.get(se);if(se.version!==J.__version||Z===!0){t.activeTexture(o.TEXTURE0+B);const Re=dt.getPrimaries(dt.workingColorSpace),ge=M.colorSpace===kn?null:dt.getPrimaries(M.colorSpace),ke=M.colorSpace===kn||Re===ge?o.NONE:o.BROWSER_DEFAULT_WEBGL;o.pixelStorei(o.UNPACK_FLIP_Y_WEBGL,M.flipY),o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),o.pixelStorei(o.UNPACK_ALIGNMENT,M.unpackAlignment),o.pixelStorei(o.UNPACK_COLORSPACE_CONVERSION_WEBGL,ke);const we=M.isCompressedTexture||M.image[0].isCompressedTexture,ie=M.image[0]&&M.image[0].isDataTexture,le=[];for(let re=0;re<6;re++)!we&&!ie?le[re]=m(M.image[re],!0,i.maxCubemapSize):le[re]=ie?M.image[re].image:M.image[re],le[re]=Me(M,le[re]);const ue=le[0],Q=s.convert(M.format,M.colorSpace),ae=s.convert(M.type),Ie=_(M.internalFormat,Q,ae,M.colorSpace),k=M.isVideoTexture!==!0,Se=J.__version===void 0||Z===!0,ye=se.dataReady;let ve=S(M,ue);ze(o.TEXTURE_CUBE_MAP,M);let ce;if(we){k&&Se&&t.texStorage2D(o.TEXTURE_CUBE_MAP,ve,Ie,ue.width,ue.height);for(let re=0;re<6;re++){ce=le[re].mipmaps;for(let Oe=0;Oe<ce.length;Oe++){const Ze=ce[Oe];M.format!==un?Q!==null?k?ye&&t.compressedTexSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe,0,0,Ze.width,Ze.height,Q,Ze.data):t.compressedTexImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe,Ie,Ze.width,Ze.height,0,Ze.data):Qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?ye&&t.texSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe,0,0,Ze.width,Ze.height,Q,ae,Ze.data):t.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe,Ie,Ze.width,Ze.height,0,Q,ae,Ze.data)}}}else{if(ce=M.mipmaps,k&&Se){ce.length>0&&ve++;const re=Le(le[0]);t.texStorage2D(o.TEXTURE_CUBE_MAP,ve,Ie,re.width,re.height)}for(let re=0;re<6;re++)if(ie){k?ye&&t.texSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,le[re].width,le[re].height,Q,ae,le[re].data):t.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,Ie,le[re].width,le[re].height,0,Q,ae,le[re].data);for(let Oe=0;Oe<ce.length;Oe++){const bt=ce[Oe].image[re].image;k?ye&&t.texSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe+1,0,0,bt.width,bt.height,Q,ae,bt.data):t.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe+1,Ie,bt.width,bt.height,0,Q,ae,bt.data)}}else{k?ye&&t.texSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,0,0,Q,ae,le[re]):t.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,0,Ie,Q,ae,le[re]);for(let Oe=0;Oe<ce.length;Oe++){const Ze=ce[Oe];k?ye&&t.texSubImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe+1,0,0,Q,ae,Ze.image[re]):t.texImage2D(o.TEXTURE_CUBE_MAP_POSITIVE_X+re,Oe+1,Ie,Q,ae,Ze.image[re])}}}x(M)&&g(o.TEXTURE_CUBE_MAP),J.__version=se.version,M.onUpdate&&M.onUpdate(M)}D.__version=M.version}function he(D,M,B,Z,se,J){const Re=s.convert(B.format,B.colorSpace),ge=s.convert(B.type),ke=_(B.internalFormat,Re,ge,B.colorSpace),we=n.get(M),ie=n.get(B);if(ie.__renderTarget=M,!we.__hasExternalTextures){const le=Math.max(1,M.width>>J),ue=Math.max(1,M.height>>J);se===o.TEXTURE_3D||se===o.TEXTURE_2D_ARRAY?t.texImage3D(se,J,ke,le,ue,M.depth,0,Re,ge,null):t.texImage2D(se,J,ke,le,ue,0,Re,ge,null)}t.bindFramebuffer(o.FRAMEBUFFER,D),me(M)?a.framebufferTexture2DMultisampleEXT(o.FRAMEBUFFER,Z,se,ie.__webglTexture,0,Xe(M)):(se===o.TEXTURE_2D||se>=o.TEXTURE_CUBE_MAP_POSITIVE_X&&se<=o.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&o.framebufferTexture2D(o.FRAMEBUFFER,Z,se,ie.__webglTexture,J),t.bindFramebuffer(o.FRAMEBUFFER,null)}function oe(D,M,B){if(o.bindRenderbuffer(o.RENDERBUFFER,D),M.depthBuffer){const Z=M.depthTexture,se=Z&&Z.isDepthTexture?Z.type:null,J=C(M.stencilBuffer,se),Re=M.stencilBuffer?o.DEPTH_STENCIL_ATTACHMENT:o.DEPTH_ATTACHMENT,ge=Xe(M);me(M)?a.renderbufferStorageMultisampleEXT(o.RENDERBUFFER,ge,J,M.width,M.height):B?o.renderbufferStorageMultisample(o.RENDERBUFFER,ge,J,M.width,M.height):o.renderbufferStorage(o.RENDERBUFFER,J,M.width,M.height),o.framebufferRenderbuffer(o.FRAMEBUFFER,Re,o.RENDERBUFFER,D)}else{const Z=M.textures;for(let se=0;se<Z.length;se++){const J=Z[se],Re=s.convert(J.format,J.colorSpace),ge=s.convert(J.type),ke=_(J.internalFormat,Re,ge,J.colorSpace),we=Xe(M);B&&me(M)===!1?o.renderbufferStorageMultisample(o.RENDERBUFFER,we,ke,M.width,M.height):me(M)?a.renderbufferStorageMultisampleEXT(o.RENDERBUFFER,we,ke,M.width,M.height):o.renderbufferStorage(o.RENDERBUFFER,ke,M.width,M.height)}}o.bindRenderbuffer(o.RENDERBUFFER,null)}function de(D,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(o.FRAMEBUFFER,D),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=n.get(M.depthTexture);Z.__renderTarget=M,(!Z.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),$(M.depthTexture,0);const se=Z.__webglTexture,J=Xe(M);if(M.depthTexture.format===Ai)me(M)?a.framebufferTexture2DMultisampleEXT(o.FRAMEBUFFER,o.DEPTH_ATTACHMENT,o.TEXTURE_2D,se,0,J):o.framebufferTexture2D(o.FRAMEBUFFER,o.DEPTH_ATTACHMENT,o.TEXTURE_2D,se,0);else if(M.depthTexture.format===Ji)me(M)?a.framebufferTexture2DMultisampleEXT(o.FRAMEBUFFER,o.DEPTH_STENCIL_ATTACHMENT,o.TEXTURE_2D,se,0,J):o.framebufferTexture2D(o.FRAMEBUFFER,o.DEPTH_STENCIL_ATTACHMENT,o.TEXTURE_2D,se,0);else throw new Error("Unknown depthTexture format")}function pe(D){const M=n.get(D),B=D.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==D.depthTexture){const Z=D.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),Z){const se=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,Z.removeEventListener("dispose",se)};Z.addEventListener("dispose",se),M.__depthDisposeCallback=se}M.__boundDepthTexture=Z}if(D.depthTexture&&!M.__autoAllocateDepthBuffer){if(B)throw new Error("target.depthTexture not supported in Cube render targets");const Z=D.texture.mipmaps;Z&&Z.length>0?de(M.__webglFramebuffer[0],D):de(M.__webglFramebuffer,D)}else if(B){M.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(o.FRAMEBUFFER,M.__webglFramebuffer[Z]),M.__webglDepthbuffer[Z]===void 0)M.__webglDepthbuffer[Z]=o.createRenderbuffer(),oe(M.__webglDepthbuffer[Z],D,!1);else{const se=D.stencilBuffer?o.DEPTH_STENCIL_ATTACHMENT:o.DEPTH_ATTACHMENT,J=M.__webglDepthbuffer[Z];o.bindRenderbuffer(o.RENDERBUFFER,J),o.framebufferRenderbuffer(o.FRAMEBUFFER,se,o.RENDERBUFFER,J)}}else{const Z=D.texture.mipmaps;if(Z&&Z.length>0?t.bindFramebuffer(o.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(o.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=o.createRenderbuffer(),oe(M.__webglDepthbuffer,D,!1);else{const se=D.stencilBuffer?o.DEPTH_STENCIL_ATTACHMENT:o.DEPTH_ATTACHMENT,J=M.__webglDepthbuffer;o.bindRenderbuffer(o.RENDERBUFFER,J),o.framebufferRenderbuffer(o.FRAMEBUFFER,se,o.RENDERBUFFER,J)}}t.bindFramebuffer(o.FRAMEBUFFER,null)}function Je(D,M,B){const Z=n.get(D);M!==void 0&&he(Z.__webglFramebuffer,D,D.texture,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,0),B!==void 0&&pe(D)}function Be(D){const M=D.texture,B=n.get(D),Z=n.get(M);D.addEventListener("dispose",w);const se=D.textures,J=D.isWebGLCubeRenderTarget===!0,Re=se.length>1;if(Re||(Z.__webglTexture===void 0&&(Z.__webglTexture=o.createTexture()),Z.__version=M.version,r.memory.textures++),J){B.__webglFramebuffer=[];for(let ge=0;ge<6;ge++)if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer[ge]=[];for(let ke=0;ke<M.mipmaps.length;ke++)B.__webglFramebuffer[ge][ke]=o.createFramebuffer()}else B.__webglFramebuffer[ge]=o.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer=[];for(let ge=0;ge<M.mipmaps.length;ge++)B.__webglFramebuffer[ge]=o.createFramebuffer()}else B.__webglFramebuffer=o.createFramebuffer();if(Re)for(let ge=0,ke=se.length;ge<ke;ge++){const we=n.get(se[ge]);we.__webglTexture===void 0&&(we.__webglTexture=o.createTexture(),r.memory.textures++)}if(D.samples>0&&me(D)===!1){B.__webglMultisampledFramebuffer=o.createFramebuffer(),B.__webglColorRenderbuffer=[],t.bindFramebuffer(o.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let ge=0;ge<se.length;ge++){const ke=se[ge];B.__webglColorRenderbuffer[ge]=o.createRenderbuffer(),o.bindRenderbuffer(o.RENDERBUFFER,B.__webglColorRenderbuffer[ge]);const we=s.convert(ke.format,ke.colorSpace),ie=s.convert(ke.type),le=_(ke.internalFormat,we,ie,ke.colorSpace,D.isXRRenderTarget===!0),ue=Xe(D);o.renderbufferStorageMultisample(o.RENDERBUFFER,ue,le,D.width,D.height),o.framebufferRenderbuffer(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0+ge,o.RENDERBUFFER,B.__webglColorRenderbuffer[ge])}o.bindRenderbuffer(o.RENDERBUFFER,null),D.depthBuffer&&(B.__webglDepthRenderbuffer=o.createRenderbuffer(),oe(B.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(o.FRAMEBUFFER,null)}}if(J){t.bindTexture(o.TEXTURE_CUBE_MAP,Z.__webglTexture),ze(o.TEXTURE_CUBE_MAP,M);for(let ge=0;ge<6;ge++)if(M.mipmaps&&M.mipmaps.length>0)for(let ke=0;ke<M.mipmaps.length;ke++)he(B.__webglFramebuffer[ge][ke],D,M,o.COLOR_ATTACHMENT0,o.TEXTURE_CUBE_MAP_POSITIVE_X+ge,ke);else he(B.__webglFramebuffer[ge],D,M,o.COLOR_ATTACHMENT0,o.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0);x(M)&&g(o.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let ge=0,ke=se.length;ge<ke;ge++){const we=se[ge],ie=n.get(we);let le=o.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(le=D.isWebGL3DRenderTarget?o.TEXTURE_3D:o.TEXTURE_2D_ARRAY),t.bindTexture(le,ie.__webglTexture),ze(le,we),he(B.__webglFramebuffer,D,we,o.COLOR_ATTACHMENT0+ge,le,0),x(we)&&g(le)}t.unbindTexture()}else{let ge=o.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ge=D.isWebGL3DRenderTarget?o.TEXTURE_3D:o.TEXTURE_2D_ARRAY),t.bindTexture(ge,Z.__webglTexture),ze(ge,M),M.mipmaps&&M.mipmaps.length>0)for(let ke=0;ke<M.mipmaps.length;ke++)he(B.__webglFramebuffer[ke],D,M,o.COLOR_ATTACHMENT0,ge,ke);else he(B.__webglFramebuffer,D,M,o.COLOR_ATTACHMENT0,ge,0);x(M)&&g(ge),t.unbindTexture()}D.depthBuffer&&pe(D)}function et(D){const M=D.textures;for(let B=0,Z=M.length;B<Z;B++){const se=M[B];if(x(se)){const J=v(D),Re=n.get(se).__webglTexture;t.bindTexture(J,Re),g(J),t.unbindTexture()}}}const F=[],De=[];function Ue(D){if(D.samples>0){if(me(D)===!1){const M=D.textures,B=D.width,Z=D.height;let se=o.COLOR_BUFFER_BIT;const J=D.stencilBuffer?o.DEPTH_STENCIL_ATTACHMENT:o.DEPTH_ATTACHMENT,Re=n.get(D),ge=M.length>1;if(ge)for(let we=0;we<M.length;we++)t.bindFramebuffer(o.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),o.framebufferRenderbuffer(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0+we,o.RENDERBUFFER,null),t.bindFramebuffer(o.FRAMEBUFFER,Re.__webglFramebuffer),o.framebufferTexture2D(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0+we,o.TEXTURE_2D,null,0);t.bindFramebuffer(o.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);const ke=D.texture.mipmaps;ke&&ke.length>0?t.bindFramebuffer(o.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):t.bindFramebuffer(o.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let we=0;we<M.length;we++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(se|=o.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(se|=o.STENCIL_BUFFER_BIT)),ge){o.framebufferRenderbuffer(o.READ_FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.RENDERBUFFER,Re.__webglColorRenderbuffer[we]);const ie=n.get(M[we]).__webglTexture;o.framebufferTexture2D(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,ie,0)}o.blitFramebuffer(0,0,B,Z,0,0,B,Z,se,o.NEAREST),l===!0&&(F.length=0,De.length=0,F.push(o.COLOR_ATTACHMENT0+we),D.depthBuffer&&D.resolveDepthBuffer===!1&&(F.push(J),De.push(J),o.invalidateFramebuffer(o.DRAW_FRAMEBUFFER,De)),o.invalidateFramebuffer(o.READ_FRAMEBUFFER,F))}if(t.bindFramebuffer(o.READ_FRAMEBUFFER,null),t.bindFramebuffer(o.DRAW_FRAMEBUFFER,null),ge)for(let we=0;we<M.length;we++){t.bindFramebuffer(o.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),o.framebufferRenderbuffer(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0+we,o.RENDERBUFFER,Re.__webglColorRenderbuffer[we]);const ie=n.get(M[we]).__webglTexture;t.bindFramebuffer(o.FRAMEBUFFER,Re.__webglFramebuffer),o.framebufferTexture2D(o.DRAW_FRAMEBUFFER,o.COLOR_ATTACHMENT0+we,o.TEXTURE_2D,ie,0)}t.bindFramebuffer(o.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const M=D.stencilBuffer?o.DEPTH_STENCIL_ATTACHMENT:o.DEPTH_ATTACHMENT;o.invalidateFramebuffer(o.DRAW_FRAMEBUFFER,[M])}}}function Xe(D){return Math.min(i.maxSamples,D.samples)}function me(D){const M=n.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function st(D){const M=r.render.frame;h.get(D)!==M&&(h.set(D,M),D.update())}function Me(D,M){const B=D.colorSpace,Z=D.format,se=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||B!==wi&&B!==kn&&(dt.getTransfer(B)===yt?(Z!==un||se!==gn)&&Qe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):It("WebGLTextures: Unsupported texture color space:",B)),M}function Le(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=G,this.resetTextureUnits=U,this.setTexture2D=$,this.setTexture2DArray=W,this.setTexture3D=ee,this.setTextureCube=q,this.rebindTextures=Je,this.setupRenderTarget=Be,this.updateRenderTargetMipmap=et,this.updateMultisampleRenderTarget=Ue,this.setupDepthRenderbuffer=pe,this.setupFrameBufferTexture=he,this.useMultisampledRTT=me}function Sm(o,e){function t(n,i=kn){let s;const r=dt.getTransfer(i);if(n===gn)return o.UNSIGNED_BYTE;if(n===zo)return o.UNSIGNED_SHORT_4_4_4_4;if(n===Ho)return o.UNSIGNED_SHORT_5_5_5_1;if(n===Ml)return o.UNSIGNED_INT_5_9_9_9_REV;if(n===Cl)return o.UNSIGNED_INT_10F_11F_11F_REV;if(n===Tl)return o.BYTE;if(n===El)return o.SHORT;if(n===Ki)return o.UNSIGNED_SHORT;if(n===Bo)return o.INT;if(n===Hn)return o.UNSIGNED_INT;if(n===Cn)return o.FLOAT;if(n===Pi)return o.HALF_FLOAT;if(n===Al)return o.ALPHA;if(n===wl)return o.RGB;if(n===un)return o.RGBA;if(n===Ai)return o.DEPTH_COMPONENT;if(n===Ji)return o.DEPTH_STENCIL;if(n===Il)return o.RED;if(n===Wo)return o.RED_INTEGER;if(n===Vo)return o.RG;if(n===qo)return o.RG_INTEGER;if(n===Xo)return o.RGBA_INTEGER;if(n===Ns||n===Us||n===ks||n===Gs)if(r===yt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Ns)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Us)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ks)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Gs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Ns)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Us)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ks)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Gs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===no||n===io||n===so||n===ro)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===no)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===io)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===so)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ro)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===oo||n===ao||n===lo)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===oo||n===ao)return r===yt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===lo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===co||n===ho||n===uo||n===fo||n===po||n===mo||n===go||n===xo||n===yo||n===vo||n===_o||n===bo||n===So||n===To)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===co)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ho)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===uo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===fo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===po)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===mo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===go)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===xo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===yo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===vo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===_o)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===bo)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===So)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===To)return r===yt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Eo||n===Mo||n===Co)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Eo)return r===yt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Mo)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Co)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ao||n===wo||n===Io||n===Ro)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===Ao)return s.COMPRESSED_RED_RGTC1_EXT;if(n===wo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Io)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ro)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ji?o.UNSIGNED_INT_24_8:o[n]!==void 0?o[n]:null}return{convert:t}}const Tm=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Em=`
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

}`;class Mm{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new zl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new qe({vertexShader:Tm,fragmentShader:Em,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ce(new er(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Cm extends Di{constructor(e,t){super();const n=this;let i=null,s=1,r=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,p=null;const m=typeof XRWebGLBinding<"u",x=new Mm,g={},v=t.getContextAttributes();let _=null,C=null;const S=[],b=[],w=new ht;let O=null;const E=new Qt;E.viewport=new vt;const T=new Qt;T.viewport=new vt;const A=[E,T],U=new Hh;let G=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let X=S[j];return X===void 0&&(X=new Ir,S[j]=X),X.getTargetRaySpace()},this.getControllerGrip=function(j){let X=S[j];return X===void 0&&(X=new Ir,S[j]=X),X.getGripSpace()},this.getHand=function(j){let X=S[j];return X===void 0&&(X=new Ir,S[j]=X),X.getHandSpace()};function $(j){const X=b.indexOf(j.inputSource);if(X===-1)return;const he=S[X];he!==void 0&&(he.update(j.inputSource,j.frame,c||r),he.dispatchEvent({type:j.type,data:j.inputSource}))}function W(){i.removeEventListener("select",$),i.removeEventListener("selectstart",$),i.removeEventListener("selectend",$),i.removeEventListener("squeeze",$),i.removeEventListener("squeezestart",$),i.removeEventListener("squeezeend",$),i.removeEventListener("end",W),i.removeEventListener("inputsourceschange",ee);for(let j=0;j<S.length;j++){const X=b[j];X!==null&&(b[j]=null,S[j].disconnect(X))}G=null,z=null,x.reset();for(const j in g)delete g[j];e.setRenderTarget(_),f=null,u=null,d=null,i=null,C=null,Pe.stop(),n.isPresenting=!1,e.setPixelRatio(O),e.setSize(w.width,w.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){s=j,n.isPresenting===!0&&Qe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,n.isPresenting===!0&&Qe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(j){c=j},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&m&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(j){if(i=j,i!==null){if(_=e.getRenderTarget(),i.addEventListener("select",$),i.addEventListener("selectstart",$),i.addEventListener("selectend",$),i.addEventListener("squeeze",$),i.addEventListener("squeezestart",$),i.addEventListener("squeezeend",$),i.addEventListener("end",W),i.addEventListener("inputsourceschange",ee),v.xrCompatible!==!0&&await t.makeXRCompatible(),O=e.getPixelRatio(),e.getSize(w),m&&"createProjectionLayer"in XRWebGLBinding.prototype){let he=null,oe=null,de=null;v.depth&&(de=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,he=v.stencil?Ji:Ai,oe=v.stencil?ji:Hn);const pe={colorFormat:t.RGBA8,depthFormat:de,scaleFactor:s};d=this.getBinding(),u=d.createProjectionLayer(pe),i.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),C=new Wn(u.textureWidth,u.textureHeight,{format:un,type:gn,depthTexture:new jo(u.textureWidth,u.textureHeight,oe,void 0,void 0,void 0,void 0,void 0,void 0,he),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const he={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,he),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),C=new Wn(f.framebufferWidth,f.framebufferHeight,{format:un,type:gn,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await i.requestReferenceSpace(a),Pe.setContext(i),Pe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function ee(j){for(let X=0;X<j.removed.length;X++){const he=j.removed[X],oe=b.indexOf(he);oe>=0&&(b[oe]=null,S[oe].disconnect(he))}for(let X=0;X<j.added.length;X++){const he=j.added[X];let oe=b.indexOf(he);if(oe===-1){for(let pe=0;pe<S.length;pe++)if(pe>=b.length){b.push(he),oe=pe;break}else if(b[pe]===null){b[pe]=he,oe=pe;break}if(oe===-1)break}const de=S[oe];de&&de.connect(he)}}const q=new R,ne=new R;function te(j,X,he){q.setFromMatrixPosition(X.matrixWorld),ne.setFromMatrixPosition(he.matrixWorld);const oe=q.distanceTo(ne),de=X.projectionMatrix.elements,pe=he.projectionMatrix.elements,Je=de[14]/(de[10]-1),Be=de[14]/(de[10]+1),et=(de[9]+1)/de[5],F=(de[9]-1)/de[5],De=(de[8]-1)/de[0],Ue=(pe[8]+1)/pe[0],Xe=Je*De,me=Je*Ue,st=oe/(-De+Ue),Me=st*-De;if(X.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Me),j.translateZ(st),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),de[10]===-1)j.projectionMatrix.copy(X.projectionMatrix),j.projectionMatrixInverse.copy(X.projectionMatrixInverse);else{const Le=Je+st,D=Be+st,M=Xe-Me,B=me+(oe-Me),Z=et*Be/D*Le,se=F*Be/D*Le;j.projectionMatrix.makePerspective(M,B,Z,se,Le,D),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function xe(j,X){X===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(X.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(i===null)return;let X=j.near,he=j.far;x.texture!==null&&(x.depthNear>0&&(X=x.depthNear),x.depthFar>0&&(he=x.depthFar)),U.near=T.near=E.near=X,U.far=T.far=E.far=he,(G!==U.near||z!==U.far)&&(i.updateRenderState({depthNear:U.near,depthFar:U.far}),G=U.near,z=U.far),U.layers.mask=j.layers.mask|6,E.layers.mask=U.layers.mask&3,T.layers.mask=U.layers.mask&5;const oe=j.parent,de=U.cameras;xe(U,oe);for(let pe=0;pe<de.length;pe++)xe(de[pe],oe);de.length===2?te(U,E,T):U.projectionMatrix.copy(E.projectionMatrix),ze(j,U,oe)};function ze(j,X,he){he===null?j.matrix.copy(X.matrixWorld):(j.matrix.copy(he.matrixWorld),j.matrix.invert(),j.matrix.multiply(X.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(X.projectionMatrix),j.projectionMatrixInverse.copy(X.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Po*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return U},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(j){l=j,u!==null&&(u.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(U)},this.getCameraTexture=function(j){return g[j]};let He=null;function be(j,X){if(h=X.getViewerPose(c||r),p=X,h!==null){const he=h.views;f!==null&&(e.setRenderTargetFramebuffer(C,f.framebuffer),e.setRenderTarget(C));let oe=!1;he.length!==U.cameras.length&&(U.cameras.length=0,oe=!0);for(let Be=0;Be<he.length;Be++){const et=he[Be];let F=null;if(f!==null)F=f.getViewport(et);else{const Ue=d.getViewSubImage(u,et);F=Ue.viewport,Be===0&&(e.setRenderTargetTextures(C,Ue.colorTexture,Ue.depthStencilTexture),e.setRenderTarget(C))}let De=A[Be];De===void 0&&(De=new Qt,De.layers.enable(Be),De.viewport=new vt,A[Be]=De),De.matrix.fromArray(et.transform.matrix),De.matrix.decompose(De.position,De.quaternion,De.scale),De.projectionMatrix.fromArray(et.projectionMatrix),De.projectionMatrixInverse.copy(De.projectionMatrix).invert(),De.viewport.set(F.x,F.y,F.width,F.height),Be===0&&(U.matrix.copy(De.matrix),U.matrix.decompose(U.position,U.quaternion,U.scale)),oe===!0&&U.cameras.push(De)}const de=i.enabledFeatures;if(de&&de.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&m){d=n.getBinding();const Be=d.getDepthInformation(he[0]);Be&&Be.isValid&&Be.texture&&x.init(Be,i.renderState)}if(de&&de.includes("camera-access")&&m){e.state.unbindTexture(),d=n.getBinding();for(let Be=0;Be<he.length;Be++){const et=he[Be].camera;if(et){let F=g[et];F||(F=new zl,g[et]=F);const De=d.getCameraImage(et);F.sourceTexture=De}}}}for(let he=0;he<S.length;he++){const oe=b[he],de=S[he];oe!==null&&de!==void 0&&de.update(oe,X,c||r)}He&&He(j,X),X.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:X}),p=null}const Pe=new Vl;Pe.setAnimationLoop(be),this.setAnimationLoop=function(j){He=j},this.dispose=function(){}}}const Jn=new en,Am=new pt;function wm(o,e){function t(x,g){x.matrixAutoUpdate===!0&&x.updateMatrix(),g.value.copy(x.matrix)}function n(x,g){g.color.getRGB(x.fogColor.value,Ul(o)),g.isFog?(x.fogNear.value=g.near,x.fogFar.value=g.far):g.isFogExp2&&(x.fogDensity.value=g.density)}function i(x,g,v,_,C){g.isMeshBasicMaterial||g.isMeshLambertMaterial?s(x,g):g.isMeshToonMaterial?(s(x,g),d(x,g)):g.isMeshPhongMaterial?(s(x,g),h(x,g)):g.isMeshStandardMaterial?(s(x,g),u(x,g),g.isMeshPhysicalMaterial&&f(x,g,C)):g.isMeshMatcapMaterial?(s(x,g),p(x,g)):g.isMeshDepthMaterial?s(x,g):g.isMeshDistanceMaterial?(s(x,g),m(x,g)):g.isMeshNormalMaterial?s(x,g):g.isLineBasicMaterial?(r(x,g),g.isLineDashedMaterial&&a(x,g)):g.isPointsMaterial?l(x,g,v,_):g.isSpriteMaterial?c(x,g):g.isShadowMaterial?(x.color.value.copy(g.color),x.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function s(x,g){x.opacity.value=g.opacity,g.color&&x.diffuse.value.copy(g.color),g.emissive&&x.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(x.map.value=g.map,t(g.map,x.mapTransform)),g.alphaMap&&(x.alphaMap.value=g.alphaMap,t(g.alphaMap,x.alphaMapTransform)),g.bumpMap&&(x.bumpMap.value=g.bumpMap,t(g.bumpMap,x.bumpMapTransform),x.bumpScale.value=g.bumpScale,g.side===Bt&&(x.bumpScale.value*=-1)),g.normalMap&&(x.normalMap.value=g.normalMap,t(g.normalMap,x.normalMapTransform),x.normalScale.value.copy(g.normalScale),g.side===Bt&&x.normalScale.value.negate()),g.displacementMap&&(x.displacementMap.value=g.displacementMap,t(g.displacementMap,x.displacementMapTransform),x.displacementScale.value=g.displacementScale,x.displacementBias.value=g.displacementBias),g.emissiveMap&&(x.emissiveMap.value=g.emissiveMap,t(g.emissiveMap,x.emissiveMapTransform)),g.specularMap&&(x.specularMap.value=g.specularMap,t(g.specularMap,x.specularMapTransform)),g.alphaTest>0&&(x.alphaTest.value=g.alphaTest);const v=e.get(g),_=v.envMap,C=v.envMapRotation;_&&(x.envMap.value=_,Jn.copy(C),Jn.x*=-1,Jn.y*=-1,Jn.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(Jn.y*=-1,Jn.z*=-1),x.envMapRotation.value.setFromMatrix4(Am.makeRotationFromEuler(Jn)),x.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,x.reflectivity.value=g.reflectivity,x.ior.value=g.ior,x.refractionRatio.value=g.refractionRatio),g.lightMap&&(x.lightMap.value=g.lightMap,x.lightMapIntensity.value=g.lightMapIntensity,t(g.lightMap,x.lightMapTransform)),g.aoMap&&(x.aoMap.value=g.aoMap,x.aoMapIntensity.value=g.aoMapIntensity,t(g.aoMap,x.aoMapTransform))}function r(x,g){x.diffuse.value.copy(g.color),x.opacity.value=g.opacity,g.map&&(x.map.value=g.map,t(g.map,x.mapTransform))}function a(x,g){x.dashSize.value=g.dashSize,x.totalSize.value=g.dashSize+g.gapSize,x.scale.value=g.scale}function l(x,g,v,_){x.diffuse.value.copy(g.color),x.opacity.value=g.opacity,x.size.value=g.size*v,x.scale.value=_*.5,g.map&&(x.map.value=g.map,t(g.map,x.uvTransform)),g.alphaMap&&(x.alphaMap.value=g.alphaMap,t(g.alphaMap,x.alphaMapTransform)),g.alphaTest>0&&(x.alphaTest.value=g.alphaTest)}function c(x,g){x.diffuse.value.copy(g.color),x.opacity.value=g.opacity,x.rotation.value=g.rotation,g.map&&(x.map.value=g.map,t(g.map,x.mapTransform)),g.alphaMap&&(x.alphaMap.value=g.alphaMap,t(g.alphaMap,x.alphaMapTransform)),g.alphaTest>0&&(x.alphaTest.value=g.alphaTest)}function h(x,g){x.specular.value.copy(g.specular),x.shininess.value=Math.max(g.shininess,1e-4)}function d(x,g){g.gradientMap&&(x.gradientMap.value=g.gradientMap)}function u(x,g){x.metalness.value=g.metalness,g.metalnessMap&&(x.metalnessMap.value=g.metalnessMap,t(g.metalnessMap,x.metalnessMapTransform)),x.roughness.value=g.roughness,g.roughnessMap&&(x.roughnessMap.value=g.roughnessMap,t(g.roughnessMap,x.roughnessMapTransform)),g.envMap&&(x.envMapIntensity.value=g.envMapIntensity)}function f(x,g,v){x.ior.value=g.ior,g.sheen>0&&(x.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),x.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(x.sheenColorMap.value=g.sheenColorMap,t(g.sheenColorMap,x.sheenColorMapTransform)),g.sheenRoughnessMap&&(x.sheenRoughnessMap.value=g.sheenRoughnessMap,t(g.sheenRoughnessMap,x.sheenRoughnessMapTransform))),g.clearcoat>0&&(x.clearcoat.value=g.clearcoat,x.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(x.clearcoatMap.value=g.clearcoatMap,t(g.clearcoatMap,x.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(x.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,t(g.clearcoatRoughnessMap,x.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(x.clearcoatNormalMap.value=g.clearcoatNormalMap,t(g.clearcoatNormalMap,x.clearcoatNormalMapTransform),x.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Bt&&x.clearcoatNormalScale.value.negate())),g.dispersion>0&&(x.dispersion.value=g.dispersion),g.iridescence>0&&(x.iridescence.value=g.iridescence,x.iridescenceIOR.value=g.iridescenceIOR,x.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],x.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(x.iridescenceMap.value=g.iridescenceMap,t(g.iridescenceMap,x.iridescenceMapTransform)),g.iridescenceThicknessMap&&(x.iridescenceThicknessMap.value=g.iridescenceThicknessMap,t(g.iridescenceThicknessMap,x.iridescenceThicknessMapTransform))),g.transmission>0&&(x.transmission.value=g.transmission,x.transmissionSamplerMap.value=v.texture,x.transmissionSamplerSize.value.set(v.width,v.height),g.transmissionMap&&(x.transmissionMap.value=g.transmissionMap,t(g.transmissionMap,x.transmissionMapTransform)),x.thickness.value=g.thickness,g.thicknessMap&&(x.thicknessMap.value=g.thicknessMap,t(g.thicknessMap,x.thicknessMapTransform)),x.attenuationDistance.value=g.attenuationDistance,x.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(x.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(x.anisotropyMap.value=g.anisotropyMap,t(g.anisotropyMap,x.anisotropyMapTransform))),x.specularIntensity.value=g.specularIntensity,x.specularColor.value.copy(g.specularColor),g.specularColorMap&&(x.specularColorMap.value=g.specularColorMap,t(g.specularColorMap,x.specularColorMapTransform)),g.specularIntensityMap&&(x.specularIntensityMap.value=g.specularIntensityMap,t(g.specularIntensityMap,x.specularIntensityMapTransform))}function p(x,g){g.matcap&&(x.matcap.value=g.matcap)}function m(x,g){const v=e.get(g).light;x.referencePosition.value.setFromMatrixPosition(v.matrixWorld),x.nearDistance.value=v.shadow.camera.near,x.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function Im(o,e,t,n){let i={},s={},r=[];const a=o.getParameter(o.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,_){const C=_.program;n.uniformBlockBinding(v,C)}function c(v,_){let C=i[v.id];C===void 0&&(p(v),C=h(v),i[v.id]=C,v.addEventListener("dispose",x));const S=_.program;n.updateUBOMapping(v,S);const b=e.render.frame;s[v.id]!==b&&(u(v),s[v.id]=b)}function h(v){const _=d();v.__bindingPointIndex=_;const C=o.createBuffer(),S=v.__size,b=v.usage;return o.bindBuffer(o.UNIFORM_BUFFER,C),o.bufferData(o.UNIFORM_BUFFER,S,b),o.bindBuffer(o.UNIFORM_BUFFER,null),o.bindBufferBase(o.UNIFORM_BUFFER,_,C),C}function d(){for(let v=0;v<a;v++)if(r.indexOf(v)===-1)return r.push(v),v;return It("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(v){const _=i[v.id],C=v.uniforms,S=v.__cache;o.bindBuffer(o.UNIFORM_BUFFER,_);for(let b=0,w=C.length;b<w;b++){const O=Array.isArray(C[b])?C[b]:[C[b]];for(let E=0,T=O.length;E<T;E++){const A=O[E];if(f(A,b,E,S)===!0){const U=A.__offset,G=Array.isArray(A.value)?A.value:[A.value];let z=0;for(let $=0;$<G.length;$++){const W=G[$],ee=m(W);typeof W=="number"||typeof W=="boolean"?(A.__data[0]=W,o.bufferSubData(o.UNIFORM_BUFFER,U+z,A.__data)):W.isMatrix3?(A.__data[0]=W.elements[0],A.__data[1]=W.elements[1],A.__data[2]=W.elements[2],A.__data[3]=0,A.__data[4]=W.elements[3],A.__data[5]=W.elements[4],A.__data[6]=W.elements[5],A.__data[7]=0,A.__data[8]=W.elements[6],A.__data[9]=W.elements[7],A.__data[10]=W.elements[8],A.__data[11]=0):(W.toArray(A.__data,z),z+=ee.storage/Float32Array.BYTES_PER_ELEMENT)}o.bufferSubData(o.UNIFORM_BUFFER,U,A.__data)}}}o.bindBuffer(o.UNIFORM_BUFFER,null)}function f(v,_,C,S){const b=v.value,w=_+"_"+C;if(S[w]===void 0)return typeof b=="number"||typeof b=="boolean"?S[w]=b:S[w]=b.clone(),!0;{const O=S[w];if(typeof b=="number"||typeof b=="boolean"){if(O!==b)return S[w]=b,!0}else if(O.equals(b)===!1)return O.copy(b),!0}return!1}function p(v){const _=v.uniforms;let C=0;const S=16;for(let w=0,O=_.length;w<O;w++){const E=Array.isArray(_[w])?_[w]:[_[w]];for(let T=0,A=E.length;T<A;T++){const U=E[T],G=Array.isArray(U.value)?U.value:[U.value];for(let z=0,$=G.length;z<$;z++){const W=G[z],ee=m(W),q=C%S,ne=q%ee.boundary,te=q+ne;C+=ne,te!==0&&S-te<ee.storage&&(C+=S-te),U.__data=new Float32Array(ee.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=C,C+=ee.storage}}}const b=C%S;return b>0&&(C+=S-b),v.__size=C,v.__cache={},this}function m(v){const _={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(_.boundary=4,_.storage=4):v.isVector2?(_.boundary=8,_.storage=8):v.isVector3||v.isColor?(_.boundary=16,_.storage=12):v.isVector4?(_.boundary=16,_.storage=16):v.isMatrix3?(_.boundary=48,_.storage=48):v.isMatrix4?(_.boundary=64,_.storage=64):v.isTexture?Qe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Qe("WebGLRenderer: Unsupported uniform value type.",v),_}function x(v){const _=v.target;_.removeEventListener("dispose",x);const C=r.indexOf(_.__bindingPointIndex);r.splice(C,1),o.deleteBuffer(i[_.id]),delete i[_.id],delete s[_.id]}function g(){for(const v in i)o.deleteBuffer(i[v]);r=[],i={},s={}}return{bind:l,update:c,dispose:g}}const Rm=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let En=null;function Pm(){return En===null&&(En=new Th(Rm,32,32,Vo,Pi),En.minFilter=rn,En.magFilter=rn,En.wrapS=Ct,En.wrapT=Ct,En.generateMipmaps=!1,En.needsUpdate=!0),En}class Dm{constructor(e={}){const{canvas:t=Kc(),context:n=null,depth:i=!0,stencil:s=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=r;const p=new Set([Xo,qo,Wo]),m=new Set([gn,Hn,Ki,ji,zo,Ho]),x=new Uint32Array(4),g=new Int32Array(4);let v=null,_=null;const C=[],S=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Bn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const b=this;let w=!1;this._outputColorSpace=sn;let O=0,E=0,T=null,A=-1,U=null;const G=new vt,z=new vt;let $=null;const W=new Ne(0);let ee=0,q=t.width,ne=t.height,te=1,xe=null,ze=null;const He=new vt(0,0,q,ne),be=new vt(0,0,q,ne);let Pe=!1;const j=new ss;let X=!1,he=!1;const oe=new pt,de=new R,pe=new vt,Je={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Be=!1;function et(){return T===null?te:1}let F=n;function De(I,H){return t.getContext(I,H)}try{const I={alpha:!0,depth:i,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${ko}`),t.addEventListener("webglcontextlost",ce,!1),t.addEventListener("webglcontextrestored",re,!1),t.addEventListener("webglcontextcreationerror",Oe,!1),F===null){const H="webgl2";if(F=De(H,I),F===null)throw De(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(I){throw I("WebGLRenderer: "+I.message),I}let Ue,Xe,me,st,Me,Le,D,M,B,Z,se,J,Re,ge,ke,we,ie,le,ue,Q,ae,Ie,k,Se;function ye(){Ue=new Bf(F),Ue.init(),Ie=new Sm(F,Ue),Xe=new Pf(F,Ue,e,Ie),me=new _m(F,Ue),Xe.reversedDepthBuffer&&u&&me.buffers.depth.setReversed(!0),st=new Wf(F),Me=new am,Le=new bm(F,Ue,me,Me,Xe,Ie,st),D=new Lf(b),M=new Gf(b),B=new Xh(F),k=new If(F,B),Z=new zf(F,B,st,k),se=new qf(F,Z,B,st),ue=new Vf(F,Xe,Le),we=new Df(Me),J=new om(b,D,M,Ue,Xe,k,we),Re=new wm(b,Me),ge=new cm,ke=new mm(Ue),le=new wf(b,D,M,me,se,f,l),ie=new ym(b,se,Xe),Se=new Im(F,st,Xe,me),Q=new Rf(F,Ue,st),ae=new Hf(F,Ue,st),st.programs=J.programs,b.capabilities=Xe,b.extensions=Ue,b.properties=Me,b.renderLists=ge,b.shadowMap=ie,b.state=me,b.info=st}ye();const ve=new Cm(b,F);this.xr=ve,this.getContext=function(){return F},this.getContextAttributes=function(){return F.getContextAttributes()},this.forceContextLoss=function(){const I=Ue.get("WEBGL_lose_context");I&&I.loseContext()},this.forceContextRestore=function(){const I=Ue.get("WEBGL_lose_context");I&&I.restoreContext()},this.getPixelRatio=function(){return te},this.setPixelRatio=function(I){I!==void 0&&(te=I,this.setSize(q,ne,!1))},this.getSize=function(I){return I.set(q,ne)},this.setSize=function(I,H,Y=!0){if(ve.isPresenting){Qe("WebGLRenderer: Can't change size while VR device is presenting.");return}q=I,ne=H,t.width=Math.floor(I*te),t.height=Math.floor(H*te),Y===!0&&(t.style.width=I+"px",t.style.height=H+"px"),this.setViewport(0,0,I,H)},this.getDrawingBufferSize=function(I){return I.set(q*te,ne*te).floor()},this.setDrawingBufferSize=function(I,H,Y){q=I,ne=H,te=Y,t.width=Math.floor(I*Y),t.height=Math.floor(H*Y),this.setViewport(0,0,I,H)},this.getCurrentViewport=function(I){return I.copy(G)},this.getViewport=function(I){return I.copy(He)},this.setViewport=function(I,H,Y,K){I.isVector4?He.set(I.x,I.y,I.z,I.w):He.set(I,H,Y,K),me.viewport(G.copy(He).multiplyScalar(te).round())},this.getScissor=function(I){return I.copy(be)},this.setScissor=function(I,H,Y,K){I.isVector4?be.set(I.x,I.y,I.z,I.w):be.set(I,H,Y,K),me.scissor(z.copy(be).multiplyScalar(te).round())},this.getScissorTest=function(){return Pe},this.setScissorTest=function(I){me.setScissorTest(Pe=I)},this.setOpaqueSort=function(I){xe=I},this.setTransparentSort=function(I){ze=I},this.getClearColor=function(I){return I.copy(le.getClearColor())},this.setClearColor=function(){le.setClearColor(...arguments)},this.getClearAlpha=function(){return le.getClearAlpha()},this.setClearAlpha=function(){le.setClearAlpha(...arguments)},this.clear=function(I=!0,H=!0,Y=!0){let K=0;if(I){let V=!1;if(T!==null){const fe=T.texture.format;V=p.has(fe)}if(V){const fe=T.texture.type,Ee=m.has(fe),Fe=le.getClearColor(),Ae=le.getClearAlpha(),$e=Fe.r,Ke=Fe.g,We=Fe.b;Ee?(x[0]=$e,x[1]=Ke,x[2]=We,x[3]=Ae,F.clearBufferuiv(F.COLOR,0,x)):(g[0]=$e,g[1]=Ke,g[2]=We,g[3]=Ae,F.clearBufferiv(F.COLOR,0,g))}else K|=F.COLOR_BUFFER_BIT}H&&(K|=F.DEPTH_BUFFER_BIT),Y&&(K|=F.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ce,!1),t.removeEventListener("webglcontextrestored",re,!1),t.removeEventListener("webglcontextcreationerror",Oe,!1),le.dispose(),ge.dispose(),ke.dispose(),Me.dispose(),D.dispose(),M.dispose(),se.dispose(),k.dispose(),Se.dispose(),J.dispose(),ve.dispose(),ve.removeEventListener("sessionstart",Zo),ve.removeEventListener("sessionend",Qo),Vn.stop()};function ce(I){I.preventDefault(),da("WebGLRenderer: Context Lost."),w=!0}function re(){da("WebGLRenderer: Context Restored."),w=!1;const I=st.autoReset,H=ie.enabled,Y=ie.autoUpdate,K=ie.needsUpdate,V=ie.type;ye(),st.autoReset=I,ie.enabled=H,ie.autoUpdate=Y,ie.needsUpdate=K,ie.type=V}function Oe(I){It("WebGLRenderer: A WebGL context could not be created. Reason: ",I.statusMessage)}function Ze(I){const H=I.target;H.removeEventListener("dispose",Ze),bt(H)}function bt(I){gt(I),Me.remove(I)}function gt(I){const H=Me.get(I).programs;H!==void 0&&(H.forEach(function(Y){J.releaseProgram(Y)}),I.isShaderMaterial&&J.releaseShaderCache(I))}this.renderBufferDirect=function(I,H,Y,K,V,fe){H===null&&(H=Je);const Ee=V.isMesh&&V.matrixWorld.determinant()<0,Fe=tc(I,H,Y,K,V);me.setMaterial(K,Ee);let Ae=Y.index,$e=1;if(K.wireframe===!0){if(Ae=Z.getWireframeAttribute(Y),Ae===void 0)return;$e=2}const Ke=Y.drawRange,We=Y.attributes.position;let at=Ke.start*$e,xt=(Ke.start+Ke.count)*$e;fe!==null&&(at=Math.max(at,fe.start*$e),xt=Math.min(xt,(fe.start+fe.count)*$e)),Ae!==null?(at=Math.max(at,0),xt=Math.min(xt,Ae.count)):We!=null&&(at=Math.max(at,0),xt=Math.min(xt,We.count));const At=xt-at;if(At<0||At===1/0)return;k.setup(V,K,Fe,Y,Ae);let wt,_t=Q;if(Ae!==null&&(wt=B.get(Ae),_t=ae,_t.setIndex(wt)),V.isMesh)K.wireframe===!0?(me.setLineWidth(K.wireframeLinewidth*et()),_t.setMode(F.LINES)):_t.setMode(F.TRIANGLES);else if(V.isLine){let Ve=K.linewidth;Ve===void 0&&(Ve=1),me.setLineWidth(Ve*et()),V.isLineSegments?_t.setMode(F.LINES):V.isLineLoop?_t.setMode(F.LINE_LOOP):_t.setMode(F.LINE_STRIP)}else V.isPoints?_t.setMode(F.POINTS):V.isSprite&&_t.setMode(F.TRIANGLES);if(V.isBatchedMesh)if(V._multiDrawInstances!==null)Qi("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),_t.renderMultiDrawInstances(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount,V._multiDrawInstances);else if(Ue.get("WEBGL_multi_draw"))_t.renderMultiDraw(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount);else{const Ve=V._multiDrawStarts,Et=V._multiDrawCounts,ut=V._multiDrawCount,Kt=Ae?B.get(Ae).bytesPerElement:1,ai=Me.get(K).currentProgram.getUniforms();for(let jt=0;jt<ut;jt++)ai.setValue(F,"_gl_DrawID",jt),_t.render(Ve[jt]/Kt,Et[jt])}else if(V.isInstancedMesh)_t.renderInstances(at,At,V.count);else if(Y.isInstancedBufferGeometry){const Ve=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,Et=Math.min(Y.instanceCount,Ve);_t.renderInstances(at,At,Et)}else _t.render(at,At)};function dn(I,H,Y){I.transparent===!0&&I.side===Yt&&I.forceSinglePass===!1?(I.side=Bt,I.needsUpdate=!0,os(I,H,Y),I.side=zn,I.needsUpdate=!0,os(I,H,Y),I.side=Yt):os(I,H,Y)}this.compile=function(I,H,Y=null){Y===null&&(Y=I),_=ke.get(Y),_.init(H),S.push(_),Y.traverseVisible(function(V){V.isLight&&V.layers.test(H.layers)&&(_.pushLight(V),V.castShadow&&_.pushShadow(V))}),I!==Y&&I.traverseVisible(function(V){V.isLight&&V.layers.test(H.layers)&&(_.pushLight(V),V.castShadow&&_.pushShadow(V))}),_.setupLights();const K=new Set;return I.traverse(function(V){if(!(V.isMesh||V.isPoints||V.isLine||V.isSprite))return;const fe=V.material;if(fe)if(Array.isArray(fe))for(let Ee=0;Ee<fe.length;Ee++){const Fe=fe[Ee];dn(Fe,Y,V),K.add(Fe)}else dn(fe,Y,V),K.add(fe)}),_=S.pop(),K},this.compileAsync=function(I,H,Y=null){const K=this.compile(I,H,Y);return new Promise(V=>{function fe(){if(K.forEach(function(Ee){Me.get(Ee).currentProgram.isReady()&&K.delete(Ee)}),K.size===0){V(I);return}setTimeout(fe,10)}Ue.get("KHR_parallel_shader_compile")!==null?fe():setTimeout(fe,10)})};let on=null;function ec(I){on&&on(I)}function Zo(){Vn.stop()}function Qo(){Vn.start()}const Vn=new Vl;Vn.setAnimationLoop(ec),typeof self<"u"&&Vn.setContext(self),this.setAnimationLoop=function(I){on=I,ve.setAnimationLoop(I),I===null?Vn.stop():Vn.start()},ve.addEventListener("sessionstart",Zo),ve.addEventListener("sessionend",Qo),this.render=function(I,H){if(H!==void 0&&H.isCamera!==!0){It("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(w===!0)return;if(I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),ve.enabled===!0&&ve.isPresenting===!0&&(ve.cameraAutoUpdate===!0&&ve.updateCamera(H),H=ve.getCamera()),I.isScene===!0&&I.onBeforeRender(b,I,H,T),_=ke.get(I,S.length),_.init(H),S.push(_),oe.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),j.setFromProjectionMatrix(oe,mn,H.reversedDepth),he=this.localClippingEnabled,X=we.init(this.clippingPlanes,he),v=ge.get(I,C.length),v.init(),C.push(v),ve.enabled===!0&&ve.isPresenting===!0){const fe=b.xr.getDepthSensingMesh();fe!==null&&sr(fe,H,-1/0,b.sortObjects)}sr(I,H,0,b.sortObjects),v.finish(),b.sortObjects===!0&&v.sort(xe,ze),Be=ve.enabled===!1||ve.isPresenting===!1||ve.hasDepthSensing()===!1,Be&&le.addToRenderList(v,I),this.info.render.frame++,X===!0&&we.beginShadows();const Y=_.state.shadowsArray;ie.render(Y,I,H),X===!0&&we.endShadows(),this.info.autoReset===!0&&this.info.reset();const K=v.opaque,V=v.transmissive;if(_.setupLights(),H.isArrayCamera){const fe=H.cameras;if(V.length>0)for(let Ee=0,Fe=fe.length;Ee<Fe;Ee++){const Ae=fe[Ee];ta(K,V,I,Ae)}Be&&le.render(I);for(let Ee=0,Fe=fe.length;Ee<Fe;Ee++){const Ae=fe[Ee];ea(v,I,Ae,Ae.viewport)}}else V.length>0&&ta(K,V,I,H),Be&&le.render(I),ea(v,I,H);T!==null&&E===0&&(Le.updateMultisampleRenderTarget(T),Le.updateRenderTargetMipmap(T)),I.isScene===!0&&I.onAfterRender(b,I,H),k.resetDefaultState(),A=-1,U=null,S.pop(),S.length>0?(_=S[S.length-1],X===!0&&we.setGlobalState(b.clippingPlanes,_.state.camera)):_=null,C.pop(),C.length>0?v=C[C.length-1]:v=null};function sr(I,H,Y,K){if(I.visible===!1)return;if(I.layers.test(H.layers)){if(I.isGroup)Y=I.renderOrder;else if(I.isLOD)I.autoUpdate===!0&&I.update(H);else if(I.isLight)_.pushLight(I),I.castShadow&&_.pushShadow(I);else if(I.isSprite){if(!I.frustumCulled||j.intersectsSprite(I)){K&&pe.setFromMatrixPosition(I.matrixWorld).applyMatrix4(oe);const Ee=se.update(I),Fe=I.material;Fe.visible&&v.push(I,Ee,Fe,Y,pe.z,null)}}else if((I.isMesh||I.isLine||I.isPoints)&&(!I.frustumCulled||j.intersectsObject(I))){const Ee=se.update(I),Fe=I.material;if(K&&(I.boundingSphere!==void 0?(I.boundingSphere===null&&I.computeBoundingSphere(),pe.copy(I.boundingSphere.center)):(Ee.boundingSphere===null&&Ee.computeBoundingSphere(),pe.copy(Ee.boundingSphere.center)),pe.applyMatrix4(I.matrixWorld).applyMatrix4(oe)),Array.isArray(Fe)){const Ae=Ee.groups;for(let $e=0,Ke=Ae.length;$e<Ke;$e++){const We=Ae[$e],at=Fe[We.materialIndex];at&&at.visible&&v.push(I,Ee,at,Y,pe.z,We)}}else Fe.visible&&v.push(I,Ee,Fe,Y,pe.z,null)}}const fe=I.children;for(let Ee=0,Fe=fe.length;Ee<Fe;Ee++)sr(fe[Ee],H,Y,K)}function ea(I,H,Y,K){const{opaque:V,transmissive:fe,transparent:Ee}=I;_.setupLightsView(Y),X===!0&&we.setGlobalState(b.clippingPlanes,Y),K&&me.viewport(G.copy(K)),V.length>0&&rs(V,H,Y),fe.length>0&&rs(fe,H,Y),Ee.length>0&&rs(Ee,H,Y),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function ta(I,H,Y,K){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;_.state.transmissionRenderTarget[K.id]===void 0&&(_.state.transmissionRenderTarget[K.id]=new Wn(1,1,{generateMipmaps:!0,type:Ue.has("EXT_color_buffer_half_float")||Ue.has("EXT_color_buffer_float")?Pi:gn,minFilter:si,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:dt.workingColorSpace}));const fe=_.state.transmissionRenderTarget[K.id],Ee=K.viewport||G;fe.setSize(Ee.z*b.transmissionResolutionScale,Ee.w*b.transmissionResolutionScale);const Fe=b.getRenderTarget(),Ae=b.getActiveCubeFace(),$e=b.getActiveMipmapLevel();b.setRenderTarget(fe),b.getClearColor(W),ee=b.getClearAlpha(),ee<1&&b.setClearColor(16777215,.5),b.clear(),Be&&le.render(Y);const Ke=b.toneMapping;b.toneMapping=Bn;const We=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),_.setupLightsView(K),X===!0&&we.setGlobalState(b.clippingPlanes,K),rs(I,Y,K),Le.updateMultisampleRenderTarget(fe),Le.updateRenderTargetMipmap(fe),Ue.has("WEBGL_multisampled_render_to_texture")===!1){let at=!1;for(let xt=0,At=H.length;xt<At;xt++){const wt=H[xt],{object:_t,geometry:Ve,material:Et,group:ut}=wt;if(Et.side===Yt&&_t.layers.test(K.layers)){const Kt=Et.side;Et.side=Bt,Et.needsUpdate=!0,na(_t,Y,K,Ve,Et,ut),Et.side=Kt,Et.needsUpdate=!0,at=!0}}at===!0&&(Le.updateMultisampleRenderTarget(fe),Le.updateRenderTargetMipmap(fe))}b.setRenderTarget(Fe,Ae,$e),b.setClearColor(W,ee),We!==void 0&&(K.viewport=We),b.toneMapping=Ke}function rs(I,H,Y){const K=H.isScene===!0?H.overrideMaterial:null;for(let V=0,fe=I.length;V<fe;V++){const Ee=I[V],{object:Fe,geometry:Ae,group:$e}=Ee;let Ke=Ee.material;Ke.allowOverride===!0&&K!==null&&(Ke=K),Fe.layers.test(Y.layers)&&na(Fe,H,Y,Ae,Ke,$e)}}function na(I,H,Y,K,V,fe){I.onBeforeRender(b,H,Y,K,V,fe),I.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,I.matrixWorld),I.normalMatrix.getNormalMatrix(I.modelViewMatrix),V.onBeforeRender(b,H,Y,K,I,fe),V.transparent===!0&&V.side===Yt&&V.forceSinglePass===!1?(V.side=Bt,V.needsUpdate=!0,b.renderBufferDirect(Y,H,K,V,I,fe),V.side=zn,V.needsUpdate=!0,b.renderBufferDirect(Y,H,K,V,I,fe),V.side=Yt):b.renderBufferDirect(Y,H,K,V,I,fe),I.onAfterRender(b,H,Y,K,V,fe)}function os(I,H,Y){H.isScene!==!0&&(H=Je);const K=Me.get(I),V=_.state.lights,fe=_.state.shadowsArray,Ee=V.state.version,Fe=J.getParameters(I,V.state,fe,H,Y),Ae=J.getProgramCacheKey(Fe);let $e=K.programs;K.environment=I.isMeshStandardMaterial?H.environment:null,K.fog=H.fog,K.envMap=(I.isMeshStandardMaterial?M:D).get(I.envMap||K.environment),K.envMapRotation=K.environment!==null&&I.envMap===null?H.environmentRotation:I.envMapRotation,$e===void 0&&(I.addEventListener("dispose",Ze),$e=new Map,K.programs=$e);let Ke=$e.get(Ae);if(Ke!==void 0){if(K.currentProgram===Ke&&K.lightsStateVersion===Ee)return sa(I,Fe),Ke}else Fe.uniforms=J.getUniforms(I),I.onBeforeCompile(Fe,b),Ke=J.acquireProgram(Fe,Ae),$e.set(Ae,Ke),K.uniforms=Fe.uniforms;const We=K.uniforms;return(!I.isShaderMaterial&&!I.isRawShaderMaterial||I.clipping===!0)&&(We.clippingPlanes=we.uniform),sa(I,Fe),K.needsLights=ic(I),K.lightsStateVersion=Ee,K.needsLights&&(We.ambientLightColor.value=V.state.ambient,We.lightProbe.value=V.state.probe,We.directionalLights.value=V.state.directional,We.directionalLightShadows.value=V.state.directionalShadow,We.spotLights.value=V.state.spot,We.spotLightShadows.value=V.state.spotShadow,We.rectAreaLights.value=V.state.rectArea,We.ltc_1.value=V.state.rectAreaLTC1,We.ltc_2.value=V.state.rectAreaLTC2,We.pointLights.value=V.state.point,We.pointLightShadows.value=V.state.pointShadow,We.hemisphereLights.value=V.state.hemi,We.directionalShadowMap.value=V.state.directionalShadowMap,We.directionalShadowMatrix.value=V.state.directionalShadowMatrix,We.spotShadowMap.value=V.state.spotShadowMap,We.spotLightMatrix.value=V.state.spotLightMatrix,We.spotLightMap.value=V.state.spotLightMap,We.pointShadowMap.value=V.state.pointShadowMap,We.pointShadowMatrix.value=V.state.pointShadowMatrix),K.currentProgram=Ke,K.uniformsList=null,Ke}function ia(I){if(I.uniformsList===null){const H=I.currentProgram.getUniforms();I.uniformsList=Bs.seqWithValue(H.seq,I.uniforms)}return I.uniformsList}function sa(I,H){const Y=Me.get(I);Y.outputColorSpace=H.outputColorSpace,Y.batching=H.batching,Y.batchingColor=H.batchingColor,Y.instancing=H.instancing,Y.instancingColor=H.instancingColor,Y.instancingMorph=H.instancingMorph,Y.skinning=H.skinning,Y.morphTargets=H.morphTargets,Y.morphNormals=H.morphNormals,Y.morphColors=H.morphColors,Y.morphTargetsCount=H.morphTargetsCount,Y.numClippingPlanes=H.numClippingPlanes,Y.numIntersection=H.numClipIntersection,Y.vertexAlphas=H.vertexAlphas,Y.vertexTangents=H.vertexTangents,Y.toneMapping=H.toneMapping}function tc(I,H,Y,K,V){H.isScene!==!0&&(H=Je),Le.resetTextureUnits();const fe=H.fog,Ee=K.isMeshStandardMaterial?H.environment:null,Fe=T===null?b.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:wi,Ae=(K.isMeshStandardMaterial?M:D).get(K.envMap||Ee),$e=K.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,Ke=!!Y.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),We=!!Y.morphAttributes.position,at=!!Y.morphAttributes.normal,xt=!!Y.morphAttributes.color;let At=Bn;K.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(At=b.toneMapping);const wt=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,_t=wt!==void 0?wt.length:0,Ve=Me.get(K),Et=_.state.lights;if(X===!0&&(he===!0||I!==U)){const Wt=I===U&&K.id===A;we.setState(K,I,Wt)}let ut=!1;K.version===Ve.__version?(Ve.needsLights&&Ve.lightsStateVersion!==Et.state.version||Ve.outputColorSpace!==Fe||V.isBatchedMesh&&Ve.batching===!1||!V.isBatchedMesh&&Ve.batching===!0||V.isBatchedMesh&&Ve.batchingColor===!0&&V.colorTexture===null||V.isBatchedMesh&&Ve.batchingColor===!1&&V.colorTexture!==null||V.isInstancedMesh&&Ve.instancing===!1||!V.isInstancedMesh&&Ve.instancing===!0||V.isSkinnedMesh&&Ve.skinning===!1||!V.isSkinnedMesh&&Ve.skinning===!0||V.isInstancedMesh&&Ve.instancingColor===!0&&V.instanceColor===null||V.isInstancedMesh&&Ve.instancingColor===!1&&V.instanceColor!==null||V.isInstancedMesh&&Ve.instancingMorph===!0&&V.morphTexture===null||V.isInstancedMesh&&Ve.instancingMorph===!1&&V.morphTexture!==null||Ve.envMap!==Ae||K.fog===!0&&Ve.fog!==fe||Ve.numClippingPlanes!==void 0&&(Ve.numClippingPlanes!==we.numPlanes||Ve.numIntersection!==we.numIntersection)||Ve.vertexAlphas!==$e||Ve.vertexTangents!==Ke||Ve.morphTargets!==We||Ve.morphNormals!==at||Ve.morphColors!==xt||Ve.toneMapping!==At||Ve.morphTargetsCount!==_t)&&(ut=!0):(ut=!0,Ve.__version=K.version);let Kt=Ve.currentProgram;ut===!0&&(Kt=os(K,H,V));let ai=!1,jt=!1,Oi=!1;const Mt=Kt.getUniforms(),qt=Ve.uniforms;if(me.useProgram(Kt.program)&&(ai=!0,jt=!0,Oi=!0),K.id!==A&&(A=K.id,jt=!0),ai||U!==I){me.buffers.depth.getReversed()&&I.reversedDepth!==!0&&(I._reversedDepth=!0,I.updateProjectionMatrix()),Mt.setValue(F,"projectionMatrix",I.projectionMatrix),Mt.setValue(F,"viewMatrix",I.matrixWorldInverse);const Xt=Mt.map.cameraPosition;Xt!==void 0&&Xt.setValue(F,de.setFromMatrixPosition(I.matrixWorld)),Xe.logarithmicDepthBuffer&&Mt.setValue(F,"logDepthBufFC",2/(Math.log(I.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&Mt.setValue(F,"isOrthographic",I.isOrthographicCamera===!0),U!==I&&(U=I,jt=!0,Oi=!0)}if(V.isSkinnedMesh){Mt.setOptional(F,V,"bindMatrix"),Mt.setOptional(F,V,"bindMatrixInverse");const Wt=V.skeleton;Wt&&(Wt.boneTexture===null&&Wt.computeBoneTexture(),Mt.setValue(F,"boneTexture",Wt.boneTexture,Le))}V.isBatchedMesh&&(Mt.setOptional(F,V,"batchingTexture"),Mt.setValue(F,"batchingTexture",V._matricesTexture,Le),Mt.setOptional(F,V,"batchingIdTexture"),Mt.setValue(F,"batchingIdTexture",V._indirectTexture,Le),Mt.setOptional(F,V,"batchingColorTexture"),V._colorsTexture!==null&&Mt.setValue(F,"batchingColorTexture",V._colorsTexture,Le));const tn=Y.morphAttributes;if((tn.position!==void 0||tn.normal!==void 0||tn.color!==void 0)&&ue.update(V,Y,Kt),(jt||Ve.receiveShadow!==V.receiveShadow)&&(Ve.receiveShadow=V.receiveShadow,Mt.setValue(F,"receiveShadow",V.receiveShadow)),K.isMeshGouraudMaterial&&K.envMap!==null&&(qt.envMap.value=Ae,qt.flipEnvMap.value=Ae.isCubeTexture&&Ae.isRenderTargetTexture===!1?-1:1),K.isMeshStandardMaterial&&K.envMap===null&&H.environment!==null&&(qt.envMapIntensity.value=H.environmentIntensity),qt.dfgLUT!==void 0&&(qt.dfgLUT.value=Pm()),jt&&(Mt.setValue(F,"toneMappingExposure",b.toneMappingExposure),Ve.needsLights&&nc(qt,Oi),fe&&K.fog===!0&&Re.refreshFogUniforms(qt,fe),Re.refreshMaterialUniforms(qt,K,te,ne,_.state.transmissionRenderTarget[I.id]),Bs.upload(F,ia(Ve),qt,Le)),K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(Bs.upload(F,ia(Ve),qt,Le),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&Mt.setValue(F,"center",V.center),Mt.setValue(F,"modelViewMatrix",V.modelViewMatrix),Mt.setValue(F,"normalMatrix",V.normalMatrix),Mt.setValue(F,"modelMatrix",V.matrixWorld),K.isShaderMaterial||K.isRawShaderMaterial){const Wt=K.uniformsGroups;for(let Xt=0,rr=Wt.length;Xt<rr;Xt++){const qn=Wt[Xt];Se.update(qn,Kt),Se.bind(qn,Kt)}}return Kt}function nc(I,H){I.ambientLightColor.needsUpdate=H,I.lightProbe.needsUpdate=H,I.directionalLights.needsUpdate=H,I.directionalLightShadows.needsUpdate=H,I.pointLights.needsUpdate=H,I.pointLightShadows.needsUpdate=H,I.spotLights.needsUpdate=H,I.spotLightShadows.needsUpdate=H,I.rectAreaLights.needsUpdate=H,I.hemisphereLights.needsUpdate=H}function ic(I){return I.isMeshLambertMaterial||I.isMeshToonMaterial||I.isMeshPhongMaterial||I.isMeshStandardMaterial||I.isShadowMaterial||I.isShaderMaterial&&I.lights===!0}this.getActiveCubeFace=function(){return O},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(I,H,Y){const K=Me.get(I);K.__autoAllocateDepthBuffer=I.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),Me.get(I.texture).__webglTexture=H,Me.get(I.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:Y,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(I,H){const Y=Me.get(I);Y.__webglFramebuffer=H,Y.__useDefaultFramebuffer=H===void 0};const sc=F.createFramebuffer();this.setRenderTarget=function(I,H=0,Y=0){T=I,O=H,E=Y;let K=!0,V=null,fe=!1,Ee=!1;if(I){const Ae=Me.get(I);if(Ae.__useDefaultFramebuffer!==void 0)me.bindFramebuffer(F.FRAMEBUFFER,null),K=!1;else if(Ae.__webglFramebuffer===void 0)Le.setupRenderTarget(I);else if(Ae.__hasExternalTextures)Le.rebindTextures(I,Me.get(I.texture).__webglTexture,Me.get(I.depthTexture).__webglTexture);else if(I.depthBuffer){const We=I.depthTexture;if(Ae.__boundDepthTexture!==We){if(We!==null&&Me.has(We)&&(I.width!==We.image.width||I.height!==We.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Le.setupDepthRenderbuffer(I)}}const $e=I.texture;($e.isData3DTexture||$e.isDataArrayTexture||$e.isCompressedArrayTexture)&&(Ee=!0);const Ke=Me.get(I).__webglFramebuffer;I.isWebGLCubeRenderTarget?(Array.isArray(Ke[H])?V=Ke[H][Y]:V=Ke[H],fe=!0):I.samples>0&&Le.useMultisampledRTT(I)===!1?V=Me.get(I).__webglMultisampledFramebuffer:Array.isArray(Ke)?V=Ke[Y]:V=Ke,G.copy(I.viewport),z.copy(I.scissor),$=I.scissorTest}else G.copy(He).multiplyScalar(te).floor(),z.copy(be).multiplyScalar(te).floor(),$=Pe;if(Y!==0&&(V=sc),me.bindFramebuffer(F.FRAMEBUFFER,V)&&K&&me.drawBuffers(I,V),me.viewport(G),me.scissor(z),me.setScissorTest($),fe){const Ae=Me.get(I.texture);F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_CUBE_MAP_POSITIVE_X+H,Ae.__webglTexture,Y)}else if(Ee){const Ae=H;for(let $e=0;$e<I.textures.length;$e++){const Ke=Me.get(I.textures[$e]);F.framebufferTextureLayer(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0+$e,Ke.__webglTexture,Y,Ae)}}else if(I!==null&&Y!==0){const Ae=Me.get(I.texture);F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,Ae.__webglTexture,Y)}A=-1},this.readRenderTargetPixels=function(I,H,Y,K,V,fe,Ee,Fe=0){if(!(I&&I.isWebGLRenderTarget)){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ae=Me.get(I).__webglFramebuffer;if(I.isWebGLCubeRenderTarget&&Ee!==void 0&&(Ae=Ae[Ee]),Ae){me.bindFramebuffer(F.FRAMEBUFFER,Ae);try{const $e=I.textures[Fe],Ke=$e.format,We=$e.type;if(!Xe.textureFormatReadable(Ke)){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Xe.textureTypeReadable(We)){It("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=I.width-K&&Y>=0&&Y<=I.height-V&&(I.textures.length>1&&F.readBuffer(F.COLOR_ATTACHMENT0+Fe),F.readPixels(H,Y,K,V,Ie.convert(Ke),Ie.convert(We),fe))}finally{const $e=T!==null?Me.get(T).__webglFramebuffer:null;me.bindFramebuffer(F.FRAMEBUFFER,$e)}}},this.readRenderTargetPixelsAsync=async function(I,H,Y,K,V,fe,Ee,Fe=0){if(!(I&&I.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ae=Me.get(I).__webglFramebuffer;if(I.isWebGLCubeRenderTarget&&Ee!==void 0&&(Ae=Ae[Ee]),Ae)if(H>=0&&H<=I.width-K&&Y>=0&&Y<=I.height-V){me.bindFramebuffer(F.FRAMEBUFFER,Ae);const $e=I.textures[Fe],Ke=$e.format,We=$e.type;if(!Xe.textureFormatReadable(Ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Xe.textureTypeReadable(We))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const at=F.createBuffer();F.bindBuffer(F.PIXEL_PACK_BUFFER,at),F.bufferData(F.PIXEL_PACK_BUFFER,fe.byteLength,F.STREAM_READ),I.textures.length>1&&F.readBuffer(F.COLOR_ATTACHMENT0+Fe),F.readPixels(H,Y,K,V,Ie.convert(Ke),Ie.convert(We),0);const xt=T!==null?Me.get(T).__webglFramebuffer:null;me.bindFramebuffer(F.FRAMEBUFFER,xt);const At=F.fenceSync(F.SYNC_GPU_COMMANDS_COMPLETE,0);return F.flush(),await jc(F,At,4),F.bindBuffer(F.PIXEL_PACK_BUFFER,at),F.getBufferSubData(F.PIXEL_PACK_BUFFER,0,fe),F.deleteBuffer(at),F.deleteSync(At),fe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(I,H=null,Y=0){const K=Math.pow(2,-Y),V=Math.floor(I.image.width*K),fe=Math.floor(I.image.height*K),Ee=H!==null?H.x:0,Fe=H!==null?H.y:0;Le.setTexture2D(I,0),F.copyTexSubImage2D(F.TEXTURE_2D,Y,0,0,Ee,Fe,V,fe),me.unbindTexture()};const rc=F.createFramebuffer(),oc=F.createFramebuffer();this.copyTextureToTexture=function(I,H,Y=null,K=null,V=0,fe=null){fe===null&&(V!==0?(Qi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),fe=V,V=0):fe=0);let Ee,Fe,Ae,$e,Ke,We,at,xt,At;const wt=I.isCompressedTexture?I.mipmaps[fe]:I.image;if(Y!==null)Ee=Y.max.x-Y.min.x,Fe=Y.max.y-Y.min.y,Ae=Y.isBox3?Y.max.z-Y.min.z:1,$e=Y.min.x,Ke=Y.min.y,We=Y.isBox3?Y.min.z:0;else{const tn=Math.pow(2,-V);Ee=Math.floor(wt.width*tn),Fe=Math.floor(wt.height*tn),I.isDataArrayTexture?Ae=wt.depth:I.isData3DTexture?Ae=Math.floor(wt.depth*tn):Ae=1,$e=0,Ke=0,We=0}K!==null?(at=K.x,xt=K.y,At=K.z):(at=0,xt=0,At=0);const _t=Ie.convert(H.format),Ve=Ie.convert(H.type);let Et;H.isData3DTexture?(Le.setTexture3D(H,0),Et=F.TEXTURE_3D):H.isDataArrayTexture||H.isCompressedArrayTexture?(Le.setTexture2DArray(H,0),Et=F.TEXTURE_2D_ARRAY):(Le.setTexture2D(H,0),Et=F.TEXTURE_2D),F.pixelStorei(F.UNPACK_FLIP_Y_WEBGL,H.flipY),F.pixelStorei(F.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),F.pixelStorei(F.UNPACK_ALIGNMENT,H.unpackAlignment);const ut=F.getParameter(F.UNPACK_ROW_LENGTH),Kt=F.getParameter(F.UNPACK_IMAGE_HEIGHT),ai=F.getParameter(F.UNPACK_SKIP_PIXELS),jt=F.getParameter(F.UNPACK_SKIP_ROWS),Oi=F.getParameter(F.UNPACK_SKIP_IMAGES);F.pixelStorei(F.UNPACK_ROW_LENGTH,wt.width),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,wt.height),F.pixelStorei(F.UNPACK_SKIP_PIXELS,$e),F.pixelStorei(F.UNPACK_SKIP_ROWS,Ke),F.pixelStorei(F.UNPACK_SKIP_IMAGES,We);const Mt=I.isDataArrayTexture||I.isData3DTexture,qt=H.isDataArrayTexture||H.isData3DTexture;if(I.isDepthTexture){const tn=Me.get(I),Wt=Me.get(H),Xt=Me.get(tn.__renderTarget),rr=Me.get(Wt.__renderTarget);me.bindFramebuffer(F.READ_FRAMEBUFFER,Xt.__webglFramebuffer),me.bindFramebuffer(F.DRAW_FRAMEBUFFER,rr.__webglFramebuffer);for(let qn=0;qn<Ae;qn++)Mt&&(F.framebufferTextureLayer(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,Me.get(I).__webglTexture,V,We+qn),F.framebufferTextureLayer(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,Me.get(H).__webglTexture,fe,At+qn)),F.blitFramebuffer($e,Ke,Ee,Fe,at,xt,Ee,Fe,F.DEPTH_BUFFER_BIT,F.NEAREST);me.bindFramebuffer(F.READ_FRAMEBUFFER,null),me.bindFramebuffer(F.DRAW_FRAMEBUFFER,null)}else if(V!==0||I.isRenderTargetTexture||Me.has(I)){const tn=Me.get(I),Wt=Me.get(H);me.bindFramebuffer(F.READ_FRAMEBUFFER,rc),me.bindFramebuffer(F.DRAW_FRAMEBUFFER,oc);for(let Xt=0;Xt<Ae;Xt++)Mt?F.framebufferTextureLayer(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,tn.__webglTexture,V,We+Xt):F.framebufferTexture2D(F.READ_FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,tn.__webglTexture,V),qt?F.framebufferTextureLayer(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,Wt.__webglTexture,fe,At+Xt):F.framebufferTexture2D(F.DRAW_FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,Wt.__webglTexture,fe),V!==0?F.blitFramebuffer($e,Ke,Ee,Fe,at,xt,Ee,Fe,F.COLOR_BUFFER_BIT,F.NEAREST):qt?F.copyTexSubImage3D(Et,fe,at,xt,At+Xt,$e,Ke,Ee,Fe):F.copyTexSubImage2D(Et,fe,at,xt,$e,Ke,Ee,Fe);me.bindFramebuffer(F.READ_FRAMEBUFFER,null),me.bindFramebuffer(F.DRAW_FRAMEBUFFER,null)}else qt?I.isDataTexture||I.isData3DTexture?F.texSubImage3D(Et,fe,at,xt,At,Ee,Fe,Ae,_t,Ve,wt.data):H.isCompressedArrayTexture?F.compressedTexSubImage3D(Et,fe,at,xt,At,Ee,Fe,Ae,_t,wt.data):F.texSubImage3D(Et,fe,at,xt,At,Ee,Fe,Ae,_t,Ve,wt):I.isDataTexture?F.texSubImage2D(F.TEXTURE_2D,fe,at,xt,Ee,Fe,_t,Ve,wt.data):I.isCompressedTexture?F.compressedTexSubImage2D(F.TEXTURE_2D,fe,at,xt,wt.width,wt.height,_t,wt.data):F.texSubImage2D(F.TEXTURE_2D,fe,at,xt,Ee,Fe,_t,Ve,wt);F.pixelStorei(F.UNPACK_ROW_LENGTH,ut),F.pixelStorei(F.UNPACK_IMAGE_HEIGHT,Kt),F.pixelStorei(F.UNPACK_SKIP_PIXELS,ai),F.pixelStorei(F.UNPACK_SKIP_ROWS,jt),F.pixelStorei(F.UNPACK_SKIP_IMAGES,Oi),fe===0&&H.generateMipmaps&&F.generateMipmap(Et),me.unbindTexture()},this.initRenderTarget=function(I){Me.get(I).__webglFramebuffer===void 0&&Le.setupRenderTarget(I)},this.initTexture=function(I){I.isCubeTexture?Le.setTextureCube(I,0):I.isData3DTexture?Le.setTexture3D(I,0):I.isDataArrayTexture||I.isCompressedArrayTexture?Le.setTexture2DArray(I,0):Le.setTexture2D(I,0),me.unbindTexture()},this.resetState=function(){O=0,E=0,T=null,me.reset(),k.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=dt._getDrawingBufferColorSpace(e),t.unpackColorSpace=dt._getUnpackColorSpace()}}const N={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:1.8,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:.8,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_LOD_OFFSET:1,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,POLAR_THRESHOLD:.9,EARTH_SPAWN_LAT:52.5,EARTH_SPAWN_LON:127,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TORCH_LIGHT_RANGE:4,TORCH_LIGHT_INTENSITY:1.5,TORCH_FLICKER_SPEED:8,TORCH_FLICKER_AMOUNT:.2,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,PLANET_DARK_SIDE_AMBIENT:.06,PLANET_TORCH_LIGHT_RADIUS:4,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:12,TECH_BLOCK_ROTATION_OFFSET:0,TECH_BLOCK_HEX_SNAP:!1,DEBUG_BYPASS_CRAFTING_INGREDIENTS:!1,DEBUG_JETPACK_ENABLED:!1};var Lm=`varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Om=`precision highp float;

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
}`;const ti=class ti{constructor(){y(this,"sections",new Map);y(this,"enabled",!1);y(this,"sampleWindow",60);y(this,"displayElement",null);y(this,"lastUpdateTime",0);y(this,"updateInterval",200);y(this,"spikeLoggingEnabled",!0);y(this,"frameSpikeThresholdMs",50);y(this,"lastFrameStartTime",0);y(this,"frameSections",new Map);y(this,"oneTimeOperations",[]);y(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return ti.instance||(ti.instance=new ti),ti.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
`);console.warn(`[FRAME SPIKE] Total: ${e.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)
Breakdown:
${t}`)}}logOneTimeOperation(e,t){this.oneTimeOperations.push({name:e,time:t,timestamp:performance.now()}),console.log(`[ONE-TIME] ${e}: ${t.toFixed(2)}ms`)}measureOneTime(e,t){const n=performance.now(),i=t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}async measureOneTimeAsync(e,t){const n=performance.now(),i=await t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}begin(e){this.sections.has(e)||this.sections.set(e,{startTime:0,samples:[],callCount:0});const t=this.sections.get(e);t.startTime=performance.now()}end(e){const t=this.sections.get(e);if(!t||t.startTime===0)return;const n=performance.now()-t.startTime;if(this.spikeLoggingEnabled){const i=this.frameSections.get(e)??0;this.frameSections.set(e,i+n)}this.enabled&&(t.samples.push(n),t.callCount++,t.samples.length>this.sampleWindow&&t.samples.shift()),t.startTime=0}wrap(e,t){this.begin(e);const n=t();return this.end(e),n}getMetrics(){const e=[];for(const[t,n]of this.sections){if(n.samples.length===0)continue;const i=n.samples,s=i[i.length-1],r=i.reduce((c,h)=>c+h,0)/i.length,a=Math.max(...i),l=Math.min(...i);e.push({name:t,lastTime:s,avgTime:r,maxTime:a,minTime:l,callCount:n.callCount})}return e.sort((t,n)=>n.avgTime-t.avgTime),e}createDisplay(){this.displayElement||(this.displayElement=document.createElement("div"),this.displayElement.id="profiler-display",this.displayElement.style.cssText=`
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
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let s="<b>PROFILER (F3 to toggle)</b><br>";s+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let h="#0f0";c.avgTime>5?h="#f44":c.avgTime>1&&(h="#ff0");const d=i>0?(c.avgTime/i*100).toFixed(0):"0",u=c.avgTime.toFixed(2).padStart(6),f=c.maxTime.toFixed(2).padStart(6),p=d.padStart(3);s+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${u}ms</span>`,s+=`<span style="color:#666"> max:${f}ms</span>`,c.name!=="Frame Total"&&(s+=`<span style="color:#888"> ${p}%</span>`),s+="<br>"}const r=window.__gameRenderer,a=window.__gameScene;if(r!=null&&r.info){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#88f">GPU Stats</b><br>';const c=r.info.render.calls;let h="#0f0";c>500?h="#f44":c>100&&(h="#ff0");const d=r.info.render.triangles;let u="#0f0";d>5e5?u="#f44":d>1e5&&(u="#ff0"),s+=`<span style="color:${h}">Draw Calls: ${c}</span><br>`,s+=`<span style="color:${u}">Triangles: ${d.toLocaleString()}</span><br>`,s+=`<span style="color:#88f">Geometries: ${r.info.memory.geometries}</span><br>`,s+=`<span style="color:#88f">Textures: ${r.info.memory.textures}</span><br>`,r.info.programs&&(s+=`<span style="color:#88f">Shader Programs: ${r.info.programs.length}</span><br>`)}if(a){let c=0,h=0,d=0,u=0;a.traverse(f=>{f.isMesh&&(c++,f.visible&&h++),f.isGroup&&d++,f.isLight&&u++}),s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#a8f">Scene Stats</b><br>',s+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,s+=`<span style="color:#a8f">Visible Meshes: ${h}</span><br>`,s+=`<span style="color:#a8f">Groups: ${d}</span><br>`,s+=`<span style="color:#a8f">Lights: ${u}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const h=((l-c.timestamp)/1e3).toFixed(1);let d="#f80";c.time>100?d="#f44":c.time>50&&(d="#ff0"),s+=`<span style="color:${d}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,s+=`<span style="color:#666"> (${h}s ago)</span><br>`}}this.displayElement.innerHTML=s}reset(){this.sections.clear()}};y(ti,"instance");let Fo=ti;const Te=Fo.getInstance();function Kl(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class Fm{constructor(){y(this,"keys",new Set);y(this,"keysJustPressed",new Set);y(this,"mouseMovement",{x:0,y:0});y(this,"mouseButtons",{left:!1,right:!1});y(this,"mouseWheelDelta",0);y(this,"isPointerLocked",!1);y(this,"onPointerLockChange");y(this,"onInventoryToggle");y(this,"onPauseToggle");y(this,"isMobile");y(this,"mobileGameActive",!1);y(this,"touchLookMovement",{x:0,y:0});y(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});y(this,"touchJump",!1);y(this,"touchJumpJustPressed",!1);y(this,"touchCrouch",!1);y(this,"touchLeftClick",!1);y(this,"touchRightClick",!1);y(this,"moveJoystickTouch",null);y(this,"lookJoystickTouch",null);y(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=Kl(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){window.addEventListener("keydown",t=>{if((this.isPointerLocked||this.mobileGameActive)&&t.ctrlKey&&(t.code==="KeyS"||t.code==="KeyR"||t.code==="KeyN"))return t.preventDefault(),t.stopPropagation(),!1},{capture:!0}),window.addEventListener("beforeunload",t=>{if(this.isPointerLocked||this.mobileGameActive)return document.pointerLockElement&&document.exitPointerLock(),t.preventDefault(),t.returnValue="You have an active game. Are you sure you want to leave?",t.returnValue}),document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("wheel",t=>{this.isPointerLocked&&(this.mouseWheelDelta+=t.deltaY)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
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
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(r=>r.style.display="none");const s=document.createElement("p");s.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",s.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(s)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),s=document.getElementById("btn-break"),r=document.getElementById("btn-place");if(e){const c=e.querySelector(".joystick-base"),h=e.querySelector(".joystick-thumb"),d=35,u=p=>{const m=c.getBoundingClientRect(),x=m.left+m.width/2,g=m.top+m.height/2,v=p.clientX-x,_=p.clientY-g,C=Math.sqrt(v*v+_*_),S=Math.min(C,d),b=Math.atan2(_,v),w=Math.cos(b)*S,O=Math.sin(b)*S;h.style.transform=`translate(${w}px, ${O}px)`;const E=w/d,T=O/d,A=.2;this.touchMoveInput.forward=T<-A,this.touchMoveInput.backward=T>A,this.touchMoveInput.left=E<-A,this.touchMoveInput.right=E>A};e.addEventListener("touchstart",p=>{p.preventDefault();const m=p.changedTouches[0];this.moveJoystickTouch={id:m.identifier,startX:0,startY:0},u(m)},{passive:!1}),e.addEventListener("touchmove",p=>{if(p.preventDefault(),!!this.moveJoystickTouch)for(let m=0;m<p.touches.length;m++){const x=p.touches[m];if(x.identifier===this.moveJoystickTouch.id){u(x);break}}},{passive:!1});const f=p=>{for(let m=0;m<p.changedTouches.length;m++)if(this.moveJoystickTouch&&p.changedTouches[m].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,h.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",f),e.addEventListener("touchcancel",f)}if(t){const c=t.querySelector(".joystick-base"),h=t.querySelector(".joystick-thumb"),d=35,u=p=>{const m=c.getBoundingClientRect(),x=m.left+m.width/2,g=m.top+m.height/2,v=p.clientX-x,_=p.clientY-g,C=Math.sqrt(v*v+_*_),S=Math.min(C,d),b=Math.atan2(_,v),w=Math.cos(b)*S,O=Math.sin(b)*S;h.style.transform=`translate(${w}px, ${O}px)`;const E=w/d,T=O/d,A=.15;Math.abs(E)>A||Math.abs(T)>A?(this.lookJoystickPosition.x=E,this.lookJoystickPosition.y=T):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",p=>{p.preventDefault();const m=p.changedTouches[0];this.lookJoystickTouch={id:m.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",p=>{if(p.preventDefault(),!!this.lookJoystickTouch)for(let m=0;m<p.touches.length;m++){const x=p.touches[m];if(x.identifier===this.lookJoystickTouch.id){u(x);break}}},{passive:!1});const f=p=>{for(let m=0;m<p.changedTouches.length;m++)if(this.lookJoystickTouch&&p.changedTouches[m].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},h.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",f),t.addEventListener("touchcancel",f)}n&&(n.addEventListener("touchstart",c=>{c.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",c=>{c.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",c=>{c.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",c=>{c.preventDefault(),this.touchCrouch=!1},{passive:!1})),s&&(s.addEventListener("touchstart",c=>{c.preventDefault(),this.touchLeftClick=!0},{passive:!1}),s.addEventListener("touchend",c=>{c.preventDefault(),this.touchLeftClick=!1},{passive:!1})),r&&(r.addEventListener("touchstart",c=>{c.preventDefault(),this.touchRightClick=!0},{passive:!1}),r.addEventListener("touchend",c=>{c.preventDefault(),this.touchRightClick=!1},{passive:!1}));const a=document.getElementById("btn-inventory");a&&a.addEventListener("touchstart",c=>{c.preventDefault(),this.onInventoryToggle&&this.onInventoryToggle()},{passive:!1});const l=document.getElementById("btn-pause");l&&l.addEventListener("touchstart",c=>{c.preventDefault(),this.onPauseToggle&&this.onPauseToggle()},{passive:!1})}setPointerLockCallback(e){this.onPointerLockChange=e}setInventoryToggleCallback(e){this.onInventoryToggle=e}setPauseToggleCallback(e){this.onPauseToggle=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyR"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}getWheelDelta(){const e=this.mouseWheelDelta;return this.mouseWheelDelta=0,e}resetMouseButtons(){this.mouseButtons.left=!1,this.mouseButtons.right=!1}}const ni=class ni{constructor(){y(this,"registeredMenus",new Map);y(this,"pendingPointerLock",!1);y(this,"initialized",!1);y(this,"onMenuCloseCallback",null)}static getInstance(){return ni.instance||(ni.instance=new ni),ni.instance}init(){this.initialized||(this.initialized=!0,document.addEventListener("keyup",e=>{this.pendingPointerLock&&(e.key==="e"||e.key==="E"||e.key==="Escape")&&(this.pendingPointerLock=!1,this.isAnyMenuOpen()||this.requestPointerLock())}))}registerMenu(e,t){this.registeredMenus.set(e,t)}unregisterMenu(e){this.registeredMenus.delete(e)}isAnyMenuOpen(){for(const e of this.registeredMenus.values())if(e.isOpen())return!0;return!1}requestPointerLock(){const e=document.getElementById("game-container");e&&e.requestPointerLock()}schedulePointerLockOnKeyup(){this.pendingPointerLock=!0}restorePointerLockOnClick(){this.triggerMenuCloseCallback(),setTimeout(()=>{this.isAnyMenuOpen()||this.requestPointerLock()},0)}setupCloseButton(e,t,n){if(!t)return;const i=t.querySelector(e);i&&i.addEventListener("click",()=>{n(),this.restorePointerLockOnClick()})}openMenu(){document.exitPointerLock()}closeMenuViaKeyboard(){this.schedulePointerLockOnKeyup(),this.triggerMenuCloseCallback()}setOnMenuCloseCallback(e){this.onMenuCloseCallback=e}triggerMenuCloseCallback(){this.onMenuCloseCallback&&this.onMenuCloseCallback()}};y(ni,"instance",null);let No=ni;const Pt=No.getInstance();class jl{constructor(e){y(this,"menuElement",null);y(this,"contentElement",null);y(this,"isMenuOpen",!1);y(this,"config");y(this,"onCloseCallback",null);this.config={closeOnE:!0,...e},this.createBaseUI(),this.setupKeyboardHandler(),this.registerWithMenuManager()}createBaseUI(){this.menuElement=document.createElement("div"),this.menuElement.id=this.config.id,this.menuElement.className="modal-menu",this.menuElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{if(!this.isMenuOpen)return;const t=e.key.toLowerCase();(t==="escape"||this.config.closeOnE&&t==="e")&&(e.preventDefault(),e.stopPropagation(),this.close(),Pt.closeMenuViaKeyboard())})}registerWithMenuManager(){Pt.registerMenu(this.config.id,{isOpen:()=>this.isMenuOpen,close:()=>this.close()})}open(){this.isMenuOpen||(this.isMenuOpen=!0,this.menuElement&&(this.menuElement.style.display="flex"),Pt.openMenu(),this.onOpen())}close(){this.isMenuOpen&&(this.isMenuOpen=!1,this.menuElement&&(this.menuElement.style.display="none"),this.onClose(),this.onCloseCallback&&this.onCloseCallback())}toggle(){this.isMenuOpen?(this.close(),Pt.closeMenuViaKeyboard()):this.open()}isOpen(){return this.isMenuOpen}setOnCloseCallback(e){this.onCloseCallback=e}getContentElement(){return this.contentElement}getMenuElement(){return this.menuElement}onOpen(){}onClose(){}}const ii=class ii{constructor(){y(this,"managers",new Map);y(this,"onUpdateCallbacks",new Set)}static getInstance(){return ii.instance||(ii.instance=new ii),ii.instance}registerManager(e){this.managers.set(e.type,e),this.notifyUpdate()}unregisterManager(e){this.managers.delete(e),this.notifyUpdate()}getAllBlocks(){const e=[];for(const t of this.managers.values())e.push(...t.getBlocks());return e}getBlocksByType(e){const t=this.managers.get(e);return t?t.getBlocks():[]}getManagerTypes(){return Array.from(this.managers.keys())}onUpdate(e){this.onUpdateCallbacks.add(e)}offUpdate(e){this.onUpdateCallbacks.delete(e)}notifyUpdate(){for(const e of this.onUpdateCallbacks)e()}};y(ii,"instance",null);let Uo=ii;const fn=Uo.getInstance();window.__techBlockRegistry=fn;class Nm extends jl{constructor(){super({id:"tech-blocks-menu",title:"Tech Blocks",closeOnE:!0});y(this,"updateInterval",null);y(this,"UPDATE_INTERVAL_MS",200);this.addCustomStyles()}addCustomStyles(){const t=document.createElement("style");t.textContent=`
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
    `,document.head.appendChild(t)}onOpen(){this.updateContent(),this.updateInterval=window.setInterval(()=>{this.isMenuOpen&&this.updateContent()},this.UPDATE_INTERVAL_MS)}onClose(){this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null)}updateContent(){const t=this.getContentElement();if(!t)return;const n=fn.getAllBlocks();if(n.length===0){t.innerHTML=`
        <div class="tech-blocks-empty">
          No tech blocks placed yet.<br>
          Build furnaces, steam engines, hydro generators, storage chests, or copper pipes!
        </div>
      `;return}const i=new Map;for(const a of n){const l=i.get(a.type)||[];l.push(a),i.set(a.type,l)}const s=this.renderSummary(i);let r='<div class="tech-blocks-list">';for(const[a,l]of i)r+=this.renderTypeGroup(a,l);r+="</div>",t.innerHTML=s+r,this.attachClickHandlers(t,n)}renderSummary(t){var s;const n=["Furnace","Steam Engine","Hydro Generator","Storage Chest","Copper Pipe"];let i='<div class="tech-blocks-summary">';for(const r of n){const a=((s=t.get(r))==null?void 0:s.length)||0,l=r.split(" ")[0];i+=`
        <div class="tech-blocks-summary-item">
          <div class="tech-blocks-summary-count">${a}</div>
          <div class="tech-blocks-summary-label">${l}${a!==1?"s":""}</div>
        </div>
      `}return i+="</div>",i}renderTypeGroup(t,n){let i=`
      <div class="tech-block-type-group">
        <div class="tech-block-type-header">${t} (${n.length})</div>
    `;for(const s of n){const r=s.getStatus(),a=this.getStatusClass(r);i+=`
        <div class="tech-block-entry" data-block-id="${s.id}">
          <div class="tech-block-entry-info">
            <span class="tech-block-entry-tile">Tile ${s.tileIndex}</span>
          </div>
          <span class="tech-block-entry-status ${a}">${r}</span>
        </div>
      `}return i+="</div>",i}getStatusClass(t){const n=t.toLowerCase();return n.includes("running")||n.includes("active")||n.includes("smelting")?"active":n.includes("no fuel")||n.includes("no water")?"warning":"idle"}attachClickHandlers(t,n){t.querySelectorAll(".tech-block-entry").forEach(s=>{s.addEventListener("click",()=>{const r=s.getAttribute("data-block-id");if(r){const a=n.find(l=>l.id===r);a&&(this.close(),a.openUI())}})})}}let Br=null;function Um(){return Br||(Br=new Nm),Br}function km(){return new qe({uniforms:{time:{value:0}},vertexShader:Lm,fragmentShader:Om,side:Bt})}class Gm{constructor(e){y(this,"scene");y(this,"camera");y(this,"renderer");y(this,"sunDirection");y(this,"clock");y(this,"frameCount",0);y(this,"lastFpsUpdate",0);y(this,"currentFps",0);y(this,"sunMesh",null);y(this,"starfield",null);y(this,"isUnderwater",!1);y(this,"underwaterFog",null);y(this,"depthRenderTarget",null);y(this,"waterMaterials",new Set);y(this,"waterMeshes",new Set);y(this,"isMobile");y(this,"updateCallbacks",[]);y(this,"animate",()=>{requestAnimationFrame(this.animate),Te.beginFrame(),Te.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}Te.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(Te.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),Te.begin("Render"),this.depthRenderTarget&&this.waterMeshes.size>0){const n=new Map;for(const i of this.waterMeshes)n.set(i,i.visible),i.visible=!1;this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);for(const i of this.waterMeshes)i.visible=n.get(i)??!0}this.renderer.render(this.scene,this.camera),Te.end("Render"),Te.end("Frame Total"),Te.endFrame(),Te.updateDisplay()});this.isMobile=Kl(),this.scene=new Sh,this.camera=new Qt(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new Dm({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=bl,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new Wh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),Te.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),Te.toggle()),t.code==="F2"&&(t.preventDefault(),Um().toggle())})}setupLighting(){this.sunDirection=new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize();const e=new es(900,64,64),t=km();this.starfield=new Ce(e,t),this.scene.add(this.starfield);const n=new es(60,32,32),i=new is({color:16768324,fog:!1});this.sunMesh=new Ce(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const s=new zh(16777215,N.AMBIENT_LIGHT_INTENSITY);this.scene.add(s);const r=new Bh(16777215,N.DIRECTIONAL_LIGHT_INTENSITY);r.position.copy(this.sunDirection.clone().multiplyScalar(500)),r.castShadow=!0,r.shadow.mapSize.width=1024,r.shadow.mapSize.height=1024,r.shadow.camera.near=.5,r.shadow.camera.far=500,r.shadow.camera.left=-100,r.shadow.camera.right=100,r.shadow.camera.top=100,r.shadow.camera.bottom=-100,this.scene.add(r);const a=new Nh(8900331,2236962,N.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(a)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e),i=new jo(t,n);i.format=Ai,i.type=Hn,this.depthRenderTarget=new Wn(t,n,{minFilter:ct,magFilter:ct,depthBuffer:!0,depthTexture:i})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.has(e)||(this.waterMaterials.add(e),this.updateWaterMaterialUniforms(e))}registerWaterMesh(e){this.waterMeshes.add(e)}unregisterWaterMesh(e){this.waterMeshes.delete(e)}updateWaterMaterialUniforms(e){if(this.depthRenderTarget){const t=this.renderer.getPixelRatio();e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new ht(window.innerWidth*t,window.innerHeight*t)},e.uniforms.useDepthFog={value:1}}else e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new Ne(N.UNDERWATER_FOG_COLOR);this.underwaterFog=new Ko(t,N.UNDERWATER_FOG_NEAR,N.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class ul{constructor(e=50,t=3){y(this,"tiles",[]);y(this,"radius");y(this,"subdivisions");y(this,"vertexMap",new Map);y(this,"vertices",[]);y(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new R(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],s=this.vertices[t],r=new R().addVectors(i,s).multiplyScalar(.5).normalize().multiplyScalar(this.radius),a=this.vertices.length;return this.vertices.push(r),this.vertexMap.set(n,a),a}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),s=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,s]),e.push([t[1],i,n]),e.push([t[2],s,i]),e.push([n,i,s])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const s=this.faces[i];for(const r of s)e.get(r).push(i)}const t=[];for(const i of this.faces){const s=new R;for(const r of i)s.add(this.vertices[r]);s.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(s)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const s=e.get(i),r=s.length===5,a=[];for(const d of s)a.push(t[d].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(a,l);const c=Array.from(n.get(i)),h={index:i,center:l.clone(),vertices:a,neighbors:c,isPentagon:r};this.tiles.push(h)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new R(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const s=new R().crossVectors(n,i).normalize();i.crossVectors(s,n).normalize();const r=[];for(const a of e){const l=a.clone().sub(t),c=l.dot(i),h=l.dot(s);r.push({vertex:a,angle:Math.atan2(h,c)})}r.sort((a,l)=>a.angle-l.angle);for(let a=0;a<e.length;a++)e[a]=r[a].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const s of this.tiles){const r=s.center.distanceToSquared(t);r<i&&(i=r,n=s)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,s=i.center.distanceToSquared(n),r=!0;for(;r;){r=!1;for(const a of i.neighbors){const l=this.tiles[a],c=l.center.distanceToSquared(n);if(c<s){i=l,s=c,r=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function ft(o){const e="/tenebris/";return o.startsWith("/")?e+o.slice(1):e+o}var Bm=`uniform float time;
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
}`,zm=`precision highp float;

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
}`,Hm=`uniform vec3 planetCenter;\r
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
}`,Wm=`precision highp float;

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
}`,P=(o=>(o[o.AIR=0]="AIR",o[o.STONE=1]="STONE",o[o.DIRT=2]="DIRT",o[o.GRASS=3]="GRASS",o[o.WATER=4]="WATER",o[o.SAND=5]="SAND",o[o.WOOD=6]="WOOD",o[o.LEAVES=7]="LEAVES",o[o.ORE_COAL=8]="ORE_COAL",o[o.ORE_COPPER=9]="ORE_COPPER",o[o.ORE_IRON=10]="ORE_IRON",o[o.ORE_GOLD=11]="ORE_GOLD",o[o.ORE_LITHIUM=12]="ORE_LITHIUM",o[o.ORE_ALUMINUM=13]="ORE_ALUMINUM",o[o.ORE_COBALT=14]="ORE_COBALT",o[o.SNOW=15]="SNOW",o[o.DIRT_SNOW=16]="DIRT_SNOW",o[o.ICE=17]="ICE",o[o.FURNACE=18]="FURNACE",o))(P||{});function Vm(o){return o!==0&&o!==4}function qm(o){return o===4}class Xm{constructor(){y(this,"textureLoader");y(this,"textures",new Map);y(this,"materials",new Map);y(this,"waterShaderMaterial",null);y(this,"terrainMaterials",[]);y(this,"sunDirection",new R(1,.5,.3).normalize());y(this,"planetCenter",new R(0,0,0));this.textureLoader=new yn}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=q=>{q.magFilter=ct,q.minFilter=ct,q.wrapS=In,q.wrapT=In},s=(q,ne)=>{const te=q.clone();return te.needsUpdate=!0,new Fa({map:te,color:ne,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const q=await this.loadTexture(e);i(q),this.textures.set("primary",q);const ne=new Ne(N.UNDERWATER_FOG_COLOR),xe=(be=>{const Pe=new qe({uniforms:{terrainTexture:{value:be},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:ne},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return this.terrainMaterials.push(Pe),Pe})(q);this.materials.set("top",xe),this.materials.set("side",xe),this.materials.set("bottom",xe),this.materials.set("stone",xe);const He=(be=>{const Pe=new qe({uniforms:{terrainTexture:{value:be},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:ne},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(Pe),Pe})(q);this.materials.set("topLOD",He),this.materials.set("sideLOD",He),this.materials.set("waterLOD",s(q));return}const r=await this.loadTexture("/textures/rocks.png"),a=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png"),h=await this.loadTexture("/textures/wood.png"),d=await this.loadTexture("/textures/sand.png"),u=await this.loadTexture("/textures/minerals/earth/rocks_coal.png"),f=await this.loadTexture("/textures/minerals/earth/rocks_copper.png"),p=await this.loadTexture("/textures/minerals/earth/rocks_iron.png"),m=await this.loadTexture("/textures/minerals/earth/rocks_gold.png"),x=await this.loadTexture("/textures/minerals/earth/rocks_lythium.png"),g=await this.loadTexture("/textures/minerals/earth/rocks_aluminum.png"),v=await this.loadTexture("/textures/minerals/earth/rocks_cobalt.png"),_=await this.loadTexture("/textures/snow.png"),C=await this.loadTexture("/textures/dirt_snow.png"),S=await this.loadTexture("/textures/ice.png");[r,a,l,c,h,d,u,f,p,m,x,g,v,_,C,S].forEach(i),this.textures.set("stone",r),this.textures.set("dirt",a),this.textures.set("grass",l),this.textures.set("dirtGrass",c),this.textures.set("wood",h),this.textures.set("sand",d),this.textures.set("oreCoal",u),this.textures.set("oreCopper",f),this.textures.set("oreIron",p),this.textures.set("oreGold",m),this.textures.set("oreLithium",x),this.textures.set("oreAluminum",g),this.textures.set("oreCobalt",v),this.textures.set("snow",_),this.textures.set("dirtSnow",C),this.textures.set("ice",S);const b=new Ne(N.UNDERWATER_FOG_COLOR),w=q=>{const ne=new qe({uniforms:{terrainTexture:{value:q},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:b},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return this.terrainMaterials.push(ne),ne};this.materials.set("top",w(l)),this.materials.set("side",w(a)),this.materials.set("grassSide",w(c)),this.materials.set("bottom",w(r)),this.materials.set("stone",w(r)),this.materials.set("wood",w(h)),this.materials.set("sand",w(d)),this.materials.set("oreCoal",w(u)),this.materials.set("oreCopper",w(f)),this.materials.set("oreIron",w(p)),this.materials.set("oreGold",w(m)),this.materials.set("oreLithium",w(x)),this.materials.set("oreAluminum",w(g)),this.materials.set("oreCobalt",w(v)),this.materials.set("snow",w(_)),this.materials.set("dirtSnow",w(C)),this.materials.set("snowSide",w(C));const O=new qe({uniforms:{terrainTexture:{value:S},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},opacity:{value:.5},specularPower:{value:64},specularStrength:{value:.6},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:b},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Hm,fragmentShader:Wm,transparent:!0,depthWrite:!0,side:Yt});this.terrainMaterials.push(O),this.materials.set("ice",O);const E=new Ne(N.SEA_WALL_COLOR),T=new is({color:E,side:Yt,fog:!1});this.materials.set("seaWall",T);const A=await this.loadTexture("/textures/water.png");i(A),this.textures.set("water",A);const U=new Ne(N.WATER_COLOR),G=new Ne(N.WATER_DEEP_COLOR),z=new Ne(N.UNDERWATER_FOG_COLOR),$=new Ne(N.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new qe({uniforms:{time:{value:0},waterTexture:{value:A},uvTiling:{value:N.WATER_UV_TILING},waterColor:{value:U},deepWaterColor:{value:G},sunDirection:{value:this.sunDirection.clone()},opacity:{value:N.WATER_TRANSPARENCY},fresnelPower:{value:N.WATER_FRESNEL_POWER},reflectionStrength:{value:N.WATER_REFLECTION_STRENGTH},distortionStrength:{value:N.WATER_DISTORTION_STRENGTH},specularPower:{value:N.WATER_SPECULAR_POWER},specularStrength:{value:N.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:N.WATER_WAVE_AMPLITUDE},waveFrequency:{value:N.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:z},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:$},aboveWaterFogNear:{value:N.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:N.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new R(0,0,0)},textureStrength:{value:N.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:N.WATER_SCROLL_SPEED},causticStrength:{value:N.WATER_CAUSTIC_STRENGTH},foamStrength:{value:N.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new ht(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:Bm,fragmentShader:zm,transparent:!0,side:Yt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const W=q=>{const ne=q.clone();ne.needsUpdate=!0;const te=new qe({uniforms:{terrainTexture:{value:ne},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:b},underwaterFogNear:{value:N.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:N.UNDERWATER_FOG_FAR},underwaterDimming:{value:N.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Ps,fragmentShader:Ds});return te.polygonOffset=!0,te.polygonOffsetFactor=4,te.polygonOffsetUnits=4,this.terrainMaterials.push(te),te};this.materials.set("topLOD",W(l)),this.materials.set("sideLOD",W(a)),this.materials.set("stoneLOD",W(r)),this.materials.set("sandLOD",W(d)),this.materials.set("woodLOD",W(h)),this.materials.set("snowLOD",W(_)),this.materials.set("iceLOD",W(S));const ee=s(A,U);ee.side=Yt,ee.transparent=!1,this.materials.set("waterLOD",ee)}loadTexture(e){const t=ft(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new Fa({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getWoodMaterial(){return this.materials.get("wood")}getSandMaterial(){return this.materials.get("sand")}getSnowMaterial(){return this.materials.get("snow")}getDirtSnowMaterial(){return this.materials.get("dirtSnow")}getSnowSideMaterial(){return this.materials.get("snowSide")??this.materials.get("snow")}getIceMaterial(){return this.materials.get("ice")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}getStoneLODMaterial(){return this.materials.get("stoneLOD")}getSandLODMaterial(){return this.materials.get("sandLOD")}getWoodLODMaterial(){return this.materials.get("woodLOD")}getSnowLODMaterial(){return this.materials.get("snowLOD")}getIceLODMaterial(){return this.materials.get("iceLOD")}createSeparateGeometries(e,t,n,i=new R(0,0,0),s=!0,r=!0,a=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),h=[],d=[];for(const b of e.vertices){const w=b.clone().sub(i).normalize();h.push(w.clone().multiplyScalar(t)),d.push(w.clone().multiplyScalar(n))}const u=c.clone().multiplyScalar(t),f=c.clone().multiplyScalar(n),p=c.clone();let m=new R(1,0,0);Math.abs(p.dot(m))>.9&&(m=new R(0,0,1));const x=new R().crossVectors(p,m).normalize();m=new R().crossVectors(x,p).normalize();let g=null,v=null,_=null;const C=.5,S=[];for(let b=0;b<l;b++){const w=b/l*Math.PI*2-Math.PI/2;S.push({u:.5+Math.cos(w)*C,v:.5+Math.sin(w)*C})}if(s){const b=[],w=[],O=[],E=[],T=c.clone();b.push(f.x,f.y,f.z),w.push(T.x,T.y,T.z),O.push(.5,.5);for(let A=0;A<l;A++){const U=d[A];b.push(U.x,U.y,U.z),w.push(T.x,T.y,T.z),O.push(S[A].u,S[A].v)}for(let A=0;A<l;A++){const U=(A+1)%l;E.push(0,1+A,1+U)}g=new mt,g.setAttribute("position",new Ge(b,3)),g.setAttribute("normal",new Ge(w,3)),g.setAttribute("uv",new Ge(O,2)),g.setIndex(E)}if(r){const b=[],w=[],O=[],E=[],T=c.clone().negate();b.push(u.x,u.y,u.z),w.push(T.x,T.y,T.z),O.push(.5,.5);for(let A=0;A<l;A++){const U=h[A];b.push(U.x,U.y,U.z),w.push(T.x,T.y,T.z),O.push(S[A].u,S[A].v)}for(let A=0;A<l;A++){const U=(A+1)%l;E.push(0,1+U,1+A)}v=new mt,v.setAttribute("position",new Ge(b,3)),v.setAttribute("normal",new Ge(w,3)),v.setAttribute("uv",new Ge(O,2)),v.setIndex(E)}if(a){const b=[],w=[],O=[],E=[];let T=0;for(let A=0;A<l;A++){const U=(A+1)%l,G=d[A],z=d[U],$=h[A],W=h[U],ee=W.clone().sub($),q=G.clone().sub($),ne=ee.clone().cross(q).normalize();b.push($.x,$.y,$.z,W.x,W.y,W.z,z.x,z.y,z.z,G.x,G.y,G.z);for(let xe=0;xe<4;xe++)w.push(ne.x,ne.y,ne.z);O.push(0,0,1,0,1,1,0,1);const te=T;E.push(te,te+1,te+2,te,te+2,te+3),T+=4}_=new mt,_.setAttribute("position",new Ge(b,3)),_.setAttribute("normal",new Ge(w,3)),_.setAttribute("uv",new Ge(O,2)),_.setIndex(E)}return{top:g,bottom:v,sides:_}}createHexPrismGeometry(e,t,n,i=new R(0,0,0),s=!0,r=!0,a=!0){const{top:l,bottom:c,sides:h}=this.createSeparateGeometries(e,t,n,i,s,r,a),d=[],u=[],f=[],p=[],m=[];let x=0;const g=(_,C)=>{if(!_)return;const S=_.getAttribute("position"),b=_.getAttribute("normal"),w=_.getAttribute("uv"),O=_.getIndex();if(!(!S||!b||!w||!O)){for(let E=0;E<S.count;E++)d.push(S.getX(E),S.getY(E),S.getZ(E)),u.push(b.getX(E),b.getY(E),b.getZ(E)),f.push(w.getX(E),w.getY(E));for(let E=0;E<O.count;E+=3)p.push(O.getX(E)+x,O.getX(E+1)+x,O.getX(E+2)+x),m.push(C);x+=S.count,_.dispose()}};g(l,"top"),g(c,"bottom"),g(h,"side");const v=new mt;return v.setAttribute("position",new Ge(d,3)),v.setAttribute("normal",new Ge(u,3)),v.setAttribute("uv",new Ge(f,2)),v.setIndex(p),{geometry:v,faceTypes:m}}isSolid(e){return Vm(e)}isLiquid(e){return qm(e)}}const $m=`// Planet distant LOD vertex shader with day/night lighting\r
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
`,Ym=`// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights\r
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
`;function dl(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],torchLight:[],indices:[],vertexOffset:0}}class fl{constructor(e,t=50,n=3,i={}){y(this,"radius");y(this,"center");y(this,"polyhedron");y(this,"columns",new Map);y(this,"meshBuilder");y(this,"scene");y(this,"frustum",new ss);y(this,"projScreenMatrix",new pt);y(this,"config");y(this,"lodChunks",[]);y(this,"lodChunkBounds",[]);y(this,"lodChunkDirections",[]);y(this,"tileToChunk",new Map);y(this,"lodMesh",null);y(this,"lodWaterMesh",null);y(this,"lodTileVisibility",new Map);y(this,"needsLODRebuild",!1);y(this,"LOD_CHUNK_COUNT",12);y(this,"distantLODMeshes",[]);y(this,"distantLODMaterials",[]);y(this,"currentDistantLODLevel",-1);y(this,"boundaryWallsGroup",null);y(this,"cachedRenderDistance",-1);y(this,"cachedNearbyTiles",new Set);y(this,"bufferCenterTiles",new Set);y(this,"pendingTilesToAdd",[]);y(this,"pendingTilesToRemove",[]);y(this,"isIncrementalRebuildActive",!1);y(this,"batchedMeshGroup",null);y(this,"needsRebatch",!0);y(this,"currentWaterMesh",null);y(this,"waterMeshCallback",null);y(this,"geometryWorker",null);y(this,"lodGeometryWorker",null);y(this,"isWorkerBuildActive",!1);y(this,"isLODWorkerBuildActive",!1);y(this,"isLODRebuildScheduled",!1);y(this,"isWaterWallsScheduled",!1);y(this,"needsWaterWallsRebuild",!1);y(this,"currentLODExcludedTileCount",0);y(this,"pendingLODExcludedCount",0);y(this,"initialTerrainBuilt",!1);y(this,"initialLODBuilt",!1);y(this,"initialBuildResolve",null);y(this,"serializedTileData",null);y(this,"serializedTileToChunk",null);y(this,"BLOCK_HEIGHT",1);y(this,"MAX_DEPTH");y(this,"MAX_HEIGHT");y(this,"DEEP_THRESHOLD",4);y(this,"SEA_LEVEL");y(this,"seed");y(this,"sunDirection",new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize());y(this,"torchData",[]);y(this,"tilesWithTorches",new Set);y(this,"ORE_CONFIGS",[{type:P.ORE_LITHIUM,minDepth:0,maxDepth:4,veinChance:.004,veinSize:4,spreadFactor:.6},{type:P.ORE_GOLD,minDepth:0,maxDepth:6,veinChance:.006,veinSize:5,spreadFactor:.65},{type:P.ORE_COBALT,minDepth:0,maxDepth:8,veinChance:.008,veinSize:6,spreadFactor:.7},{type:P.ORE_IRON,minDepth:4,maxDepth:14,veinChance:.012,veinSize:8,spreadFactor:.75},{type:P.ORE_ALUMINUM,minDepth:2,maxDepth:12,veinChance:.01,veinSize:7,spreadFactor:.72},{type:P.ORE_COPPER,minDepth:10,maxDepth:18,veinChance:.015,veinSize:10,spreadFactor:.8},{type:P.ORE_COAL,minDepth:12,maxDepth:20,veinChance:.018,veinSize:12,spreadFactor:.85}]);y(this,"oreVeinCache",new Map);y(this,"oreVeinsGenerated",!1);y(this,"BLOCK_MATERIALS",[{key:"top",getMaterial:()=>this.meshBuilder.getTopMaterial()},{key:"side",getMaterial:()=>this.meshBuilder.getSideMaterial()},{key:"grassSide",getMaterial:()=>this.meshBuilder.getGrassSideMaterial()},{key:"stone",getMaterial:()=>this.meshBuilder.getStoneMaterial()},{key:"sand",getMaterial:()=>this.meshBuilder.getSandMaterial()},{key:"wood",getMaterial:()=>this.meshBuilder.getWoodMaterial()},{key:"water",getMaterial:()=>this.meshBuilder.getWaterMaterial(),renderOrder:1},{key:"oreCoal",getMaterial:()=>this.meshBuilder.getMaterial("oreCoal")},{key:"oreCopper",getMaterial:()=>this.meshBuilder.getMaterial("oreCopper")},{key:"oreIron",getMaterial:()=>this.meshBuilder.getMaterial("oreIron")},{key:"oreGold",getMaterial:()=>this.meshBuilder.getMaterial("oreGold")},{key:"oreLithium",getMaterial:()=>this.meshBuilder.getMaterial("oreLithium")},{key:"oreAluminum",getMaterial:()=>this.meshBuilder.getMaterial("oreAluminum")},{key:"oreCobalt",getMaterial:()=>this.meshBuilder.getMaterial("oreCobalt")},{key:"snow",getMaterial:()=>this.meshBuilder.getSnowMaterial()},{key:"snowSide",getMaterial:()=>this.meshBuilder.getSnowSideMaterial()},{key:"dirtSnow",getMaterial:()=>this.meshBuilder.getDirtSnowMaterial()},{key:"ice",getMaterial:()=>this.meshBuilder.getIceMaterial(),renderOrder:2}]);y(this,"dirtyColumnsQueue",new Set);y(this,"lastQueriedTile",null);this.scene=e,this.radius=t,this.center=new R(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??N.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+N.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=N.TERRAIN_MAX_HEIGHT,this.seed=N.TERRAIN_SEED,this.polyhedron=new ul(t,n),this.meshBuilder=new Xm}depthToRadius(e){return this.radius-(this.MAX_DEPTH-1-e)*this.BLOCK_HEIGHT}getSeaLevelDepth(){return this.MAX_DEPTH-1-this.SEA_LEVEL}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.depthToRadius(this.getSeaLevelDepth())-N.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new Gt,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2;this.lodChunkDirections=[new R(-1,e,0).normalize(),new R(1,e,0).normalize(),new R(-1,-e,0).normalize(),new R(1,-e,0).normalize(),new R(0,-1,e).normalize(),new R(0,1,e).normalize(),new R(0,-1,-e).normalize(),new R(0,1,-e).normalize(),new R(e,0,-1).normalize(),new R(e,0,1).normalize(),new R(-e,0,-1).normalize(),new R(-e,0,1).normalize()];const t=this.lodChunkDirections;for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let s=0,r=1/0;for(let a=0;a<t.length;a++){const l=i.distanceToSquared(t[a]);l<r&&(r=l,s=a)}this.tileToChunk.set(n.index,s)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new Gt;this.lodChunks.push(i);const s=t[n].clone().multiplyScalar(this.radius).add(this.center),r=this.radius*.7;this.lodChunkBounds.push(new oi(s,r))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-CjW9m9fr.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;Te.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CPNS1EKh.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;Te.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;Te.begin("Planet.workerResult"),Te.begin("Planet.workerResult.createMeshes");const t=[],n=[{dataKey:"topData",materialKey:"top"},{dataKey:"sideData",materialKey:"side"},{dataKey:"grassSideData",materialKey:"grassSide"},{dataKey:"stoneData",materialKey:"stone"},{dataKey:"sandData",materialKey:"sand"},{dataKey:"woodData",materialKey:"wood"},{dataKey:"waterData",materialKey:"water",renderOrder:1},{dataKey:"oreCoalData",materialKey:"oreCoal"},{dataKey:"oreCopperData",materialKey:"oreCopper"},{dataKey:"oreIronData",materialKey:"oreIron"},{dataKey:"oreGoldData",materialKey:"oreGold"},{dataKey:"oreLithiumData",materialKey:"oreLithium"},{dataKey:"oreAluminumData",materialKey:"oreAluminum"},{dataKey:"oreCobaltData",materialKey:"oreCobalt"},{dataKey:"snowData",materialKey:"snow"},{dataKey:"snowSideData",materialKey:"snowSide"},{dataKey:"dirtSnowData",materialKey:"dirtSnow"},{dataKey:"iceData",materialKey:"ice",renderOrder:2}];let i=null;for(const{dataKey:a,materialKey:l,renderOrder:c}of n){const h=e[a];if(h.positions.length>0){const d=this.createBufferGeometry(h),u=this.BLOCK_MATERIALS.find(f=>f.key===l);if(u){const f=new Ce(d,u.getMaterial());c!==void 0&&(f.renderOrder=c),t.push(f),l==="water"&&(i=f)}}}Te.end("Planet.workerResult.createMeshes"),this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),Te.begin("Planet.workerResult.swap");const s=[];for(;this.batchedMeshGroup.children.length>0;){const a=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(a),s.push(a)}for(const a of t)this.batchedMeshGroup.add(a);for(const a of s)a.geometry&&a.geometry.dispose();Te.end("Planet.workerResult.swap"),this.currentWaterMesh=i,i&&this.waterMeshCallback&&this.waterMeshCallback(i,!0),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,Te.end("Planet.workerResult"),this.initialTerrainBuilt||(this.initialTerrainBuilt=!0,this.checkInitialBuildComplete())}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(p=>{p instanceof Ce&&p.geometry&&p.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const p of this.lodChunks)for(;p.children.length>0;){const m=p.children[0];m instanceof Ce&&m.geometry&&m.geometry.dispose(),p.remove(m)}const i=performance.now()-n,s=new Gt,r=(p,m,x,g,v,_)=>{const C=new mt;C.setAttribute("position",new Tt(new Float32Array(p),3)),C.setAttribute("normal",new Tt(new Float32Array(m),3)),C.setAttribute("uv",new Tt(new Float32Array(x),2)),v&&v.length>0&&C.setAttribute("skyLight",new Tt(new Float32Array(v),1));const S=p.length/3;return _&&_.length>0?C.setAttribute("torchLight",new Tt(new Float32Array(_),1)):C.setAttribute("torchLight",new Tt(new Float32Array(S).fill(0),1)),C.setIndex(g),C},a=performance.now();let l=0,c=0;for(let p=0;p<this.LOD_CHUNK_COUNT;p++){const m=e.chunkGeometries[p];if(!m)continue;const x=this.lodChunks[p];if(m.grassPositions.length>0){const g=r(m.grassPositions,m.grassNormals,m.grassUvs,m.grassIndices,m.grassSkyLight,m.grassTorchLight),v=new Ce(g,this.meshBuilder.getTopLODMaterial());x.add(v),l++,c+=m.grassPositions.length/3}if(m.dirtPositions.length>0){const g=r(m.dirtPositions,m.dirtNormals,m.dirtUvs,m.dirtIndices,m.dirtSkyLight,m.dirtTorchLight),v=new Ce(g,this.meshBuilder.getSideLODMaterial());x.add(v),l++,c+=m.dirtPositions.length/3}if(m.stonePositions.length>0){const g=r(m.stonePositions,m.stoneNormals,m.stoneUvs,m.stoneIndices,m.stoneSkyLight,m.stoneTorchLight),v=new Ce(g,this.meshBuilder.getStoneLODMaterial());x.add(v),l++,c+=m.stonePositions.length/3}if(m.sandPositions.length>0){const g=r(m.sandPositions,m.sandNormals,m.sandUvs,m.sandIndices,m.sandSkyLight,m.sandTorchLight),v=new Ce(g,this.meshBuilder.getSandLODMaterial());x.add(v),l++,c+=m.sandPositions.length/3}if(m.woodPositions.length>0){const g=r(m.woodPositions,m.woodNormals,m.woodUvs,m.woodIndices,m.woodSkyLight,m.woodTorchLight),v=new Ce(g,this.meshBuilder.getWoodLODMaterial());x.add(v),l++,c+=m.woodPositions.length/3}if(m.waterPositions.length>0){const g=r(m.waterPositions,m.waterNormals,m.waterUvs,m.waterIndices),v=new Ce(g,this.meshBuilder.getWaterLODMaterial());v.renderOrder=-2,x.add(v),l++,c+=m.waterPositions.length/3}if(m.sidePositions.length>0){const g=r(m.sidePositions,m.sideNormals,m.sideUvs,m.sideIndices,m.sideSkyLight,m.sideTorchLight),v=new Ce(g,this.meshBuilder.getSideLODMaterial());x.add(v),l++,c+=m.sidePositions.length/3}if(m.waterSidePositions.length>0){const g=r(m.waterSidePositions,m.waterSideNormals,m.waterSideUvs,m.waterSideIndices),v=new Ce(g,this.meshBuilder.getWaterLODMaterial());v.renderOrder=-2,x.add(v),l++,c+=m.waterSidePositions.length/3}if(m.snowPositions&&m.snowPositions.length>0){const g=r(m.snowPositions,m.snowNormals,m.snowUvs,m.snowIndices,m.snowSkyLight,m.snowTorchLight),v=new Ce(g,this.meshBuilder.getSnowLODMaterial());x.add(v),l++,c+=m.snowPositions.length/3}if(m.icePositions&&m.icePositions.length>0){const g=r(m.icePositions,m.iceNormals,m.iceUvs,m.iceIndices,m.iceSkyLight,m.iceTorchLight),v=new Ce(g,this.meshBuilder.getIceLODMaterial());x.add(v),l++,c+=m.icePositions.length/3}s.add(x)}const h=performance.now()-a,d=performance.now();s.position.copy(this.center),s.renderOrder=-1,this.scene.add(s),this.lodMesh=s;const u=performance.now()-d,f=performance.now()-t;console.log(`[LOD Build] Total: ${f.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${h.toFixed(1)}ms | Scene add: ${u.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1,this.initialLODBuilt||(this.initialLODBuilt=!0,this.checkInitialBuildComplete())}checkInitialBuildComplete(){this.initialTerrainBuilt&&this.initialLODBuilt&&this.initialBuildResolve&&(this.initialBuildResolve(),this.initialBuildResolve=null)}async buildInitialTerrain(e){const t=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(!t){console.warn("Could not find spawn tile, using default position");return}const n=N.TERRAIN_MIN_RENDER_DISTANCE,i=this.getTilesInRange(t.index,n);return this.cachedNearbyTiles=i,this.bufferCenterTiles=this.getTilesInRange(t.index,N.TERRAIN_BUFFER_ZONE),this.cachedRenderDistance=n,this.needsRebatch=!0,this.needsLODRebuild=!0,this.geometryWorker&&this.startWorkerBuild(),this.lodGeometryWorker&&this.startLODWorkerBuild(),new Promise(s=>{if(this.initialTerrainBuilt&&this.initialLODBuilt){s();return}this.initialBuildResolve=s})}isInitialTerrainReady(){return this.initialTerrainBuilt&&this.initialLODBuilt}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;Te.begin("Planet.workerBuild.serialize");const e=[],t={};for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(s){e.push({tileIndex:i,tile:{index:s.tile.index,vertices:s.tile.vertices.map(r=>({x:r.x,y:r.y,z:r.z})),center:{x:s.tile.center.x,y:s.tile.center.y,z:s.tile.center.z},neighbors:s.tile.neighbors},blocks:[...s.blocks]});for(const r of s.tile.neighbors)if(!t[r]){const a=this.columns.get(r);a&&(t[r]={blocks:[...a.blocks],vertices:a.tile.vertices.map(l=>({x:l.x,y:l.y,z:l.z}))})}s.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1;const n=this.filterRelevantTorches(e);Te.end("Planet.workerBuild.serialize"),Te.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:N.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z},uvScale:N.TERRAIN_UV_SCALE,torches:n}}),Te.end("Planet.workerBuild.postMessage")}filterRelevantTorches(e){if(this.torchData.length===0||e.length===0)return this.torchData;let t=0,n=0,i=0;for(const h of e)t+=h.tile.center.x,n+=h.tile.center.y,i+=h.tile.center.z;t/=e.length,n/=e.length,i/=e.length;let s=0;for(const h of e){const d=h.tile.center.x-t,u=h.tile.center.y-n,f=h.tile.center.z-i,p=d*d+u*u+f*f;p>s&&(s=p)}const r=Math.sqrt(s),a=N.TORCH_LIGHT_RANGE+2,l=r+a,c=l*l;return this.torchData.filter(h=>{const d=h.position.x-t,u=h.position.y-n,f=h.position.z-i;return d*d+u*u+f*f<=c})}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(Te.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,Te.end("Planet.lodWorkerBuild.serialize"),Te.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,waterSurfaceOffset:N.WATER_SURFACE_OFFSET,lodOffset:N.TERRAIN_LOD_OFFSET,chunkCount:this.LOD_CHUNK_COUNT},torches:this.torchData}),Te.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new Gt,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new ul(this.radius,t[n]),s=new mt,r=[],a=[],l=[],c=[],h=[],d=[];let u=0;const f=new Map,p=this.getSeaLevelDepth(),m=this.depthToRadius(p),x=!!this.config.texturePath;for(const _ of i.tiles){const C=this.getHeightVariation(_.center),S=this.depthToRadius(C),b=!x&&C<p,w=b?m:S,O=_.center.clone().normalize().y,E=N.POLAR_THRESHOLD,T=Math.abs(O)>E;let A;if(x){const U=Math.max(.4,Math.min(1,.6+C*.02));A=new Ne(U*.7,U*.7,U*.7)}else b&&T?A=new Ne(12116208):b?A=new Ne(3381708):C<=0?A=new Ne(8947848):T?A=new Ne(15790320):A=new Ne(4885578);f.set(_.index,{radius:w,isWater:b,color:A})}for(const _ of i.tiles){const C=f.get(_.index),S=C.radius,b=C.color,w=_.center.clone().normalize().multiplyScalar(S),O=_.vertices.map(oe=>oe.clone().normalize().multiplyScalar(S)),E=w.clone().normalize(),T=Math.abs(E.y)<.9?new R(0,1,0):new R(1,0,0),A=new R().crossVectors(T,E).normalize(),U=new R().crossVectors(E,A),G=[];let z=1/0,$=-1/0,W=1/0,ee=-1/0;for(const oe of _.vertices){const de=oe.clone().sub(_.center),pe=de.dot(A),Je=de.dot(U);G.push({u:pe,v:Je}),z=Math.min(z,pe),$=Math.max($,pe),W=Math.min(W,Je),ee=Math.max(ee,Je)}const q=$-z,ne=ee-W,te=G.map(oe=>({u:(oe.u-z)/q,v:(oe.v-W)/ne})),xe={u:(0-z)/q,v:(0-W)/ne},ze=_.center.clone().normalize(),He=_.vertices[0].clone().normalize(),be=ze.angleTo(He);let Pe=!1;for(const oe of this.torchData)if(new R(oe.position.x,oe.position.y,oe.position.z).normalize().angleTo(ze)<be){Pe=!0;break}const j=Pe?1:0,X=Pe?.3:0,he=u;r.push(w.x,w.y,w.z),a.push(E.x,E.y,E.z),l.push(xe.u,xe.v),c.push(b.r,b.g,b.b),h.push(j),u++;for(let oe=0;oe<O.length;oe++)r.push(O[oe].x,O[oe].y,O[oe].z),a.push(E.x,E.y,E.z),l.push(te[oe].u,te[oe].v),c.push(b.r,b.g,b.b),h.push(X),u++,d.push(he,he+1+oe,he+1+(oe+1)%O.length);if(!C.isWater){const oe=x?new Ne(.5,.5,.5):new Ne(9139029),de=_.vertices.length;for(let pe=0;pe<de;pe++){const Je=(pe+1)%de,Be=_.vertices[pe],et=_.vertices[Je],F=Be.clone().add(et).normalize();let De,Ue=1/0;for(const Xe of _.neighbors){const me=f.get(Xe);if(!me)continue;const st=i.tiles[Xe];if(!st)continue;const Me=st.center.clone().normalize().distanceToSquared(F);Me<Ue&&(Ue=Me,De=me)}if(De&&De.radius<S){const Xe=Be.clone().normalize().multiplyScalar(De.radius),me=et.clone().normalize().multiplyScalar(De.radius),st=et.clone().normalize().multiplyScalar(S),Me=Be.clone().normalize().multiplyScalar(S),Le=u;r.push(Xe.x,Xe.y,Xe.z),r.push(me.x,me.y,me.z),r.push(st.x,st.y,st.z),r.push(Me.x,Me.y,Me.z);const D=me.clone().sub(Xe),M=Me.clone().sub(Xe),B=D.clone().cross(M).normalize();a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),a.push(B.x,B.y,B.z),l.push(0,0,1,0,1,1,0,1),c.push(oe.r,oe.g,oe.b),c.push(oe.r,oe.g,oe.b),c.push(oe.r,oe.g,oe.b),c.push(oe.r,oe.g,oe.b),h.push(X),h.push(X),h.push(X),h.push(X),d.push(Le,Le+1,Le+2),d.push(Le,Le+2,Le+3),u+=4}}}}s.setAttribute("position",new Ge(r,3)),s.setAttribute("normal",new Ge(a,3)),s.setAttribute("uv",new Ge(l,2)),s.setAttribute("color",new Ge(c,3)),s.setAttribute("torchLight",new Ge(h,1)),s.setIndex(d);const g=new qe({uniforms:{planetCenter:{value:this.center.clone()},sunDirection:{value:new R(1,0,0)},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},darkSideAmbient:{value:N.PLANET_DARK_SIDE_AMBIENT}},vertexShader:$m,fragmentShader:Ym,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),v=new Ce(s,g);v.position.copy(this.center),v.visible=!1,v.renderOrder=-2,this.scene.add(v),this.distantLODMeshes.push(v),this.distantLODMaterials.push(g)}}rebuildDistantLODMeshes(){const e=this.currentDistantLODLevel;for(const t of this.distantLODMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof xn&&t.material.dispose();this.distantLODMeshes=[],this.distantLODMaterials=[],this.currentDistantLODLevel=-1,this.createDistantLODMeshes(),e>=0&&this.setDistantLODVisible(e)}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(Te.begin("Planet.rebuildLODMesh"),Te.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const a=this.lodMesh;a.traverse(l=>{l instanceof Ce&&l.geometry&&l.geometry.dispose()}),this.scene.remove(a),this.lodMesh=null,this.lodWaterMesh=null}for(const a of this.lodChunks)for(;a.children.length>0;){const l=a.children[0];l instanceof Ce&&l.geometry&&l.geometry.dispose(),a.remove(l)}Te.end("Planet.rebuildLODMesh.cleanup");const e=N.TERRAIN_LOD_OFFSET,t=this.depthToRadius(this.getSeaLevelDepth())-e,n=[];for(let a=0;a<this.LOD_CHUNK_COUNT;a++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassTorchLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtTorchLight:[],dirtIndices:[],dirtVertexOffset:0,stonePositions:[],stoneNormals:[],stoneUvs:[],stoneSkyLight:[],stoneTorchLight:[],stoneIndices:[],stoneVertexOffset:0,sandPositions:[],sandNormals:[],sandUvs:[],sandSkyLight:[],sandTorchLight:[],sandIndices:[],sandVertexOffset:0,woodPositions:[],woodNormals:[],woodUvs:[],woodSkyLight:[],woodTorchLight:[],woodIndices:[],woodVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideTorchLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0,snowPositions:[],snowNormals:[],snowUvs:[],snowSkyLight:[],snowTorchLight:[],snowIndices:[],snowVertexOffset:0,icePositions:[],iceNormals:[],iceUvs:[],iceSkyLight:[],iceTorchLight:[],iceIndices:[],iceVertexOffset:0});const i=new Map;for(const[a,l]of this.columns){const c=l.tile,h=c.center.clone().normalize(),d=c.vertices.map(O=>O.clone().normalize()),u=Math.abs(h.y)<.9?new R(0,1,0):new R(1,0,0),f=new R().crossVectors(u,h).normalize(),p=new R().crossVectors(h,f),m=[];let x=1/0,g=-1/0,v=1/0,_=-1/0;for(const O of c.vertices){const E=O.clone().sub(c.center),T=E.dot(f),A=E.dot(p);m.push({u:T,v:A}),x=Math.min(x,T),g=Math.max(g,T),v=Math.min(v,A),_=Math.max(_,A)}const C=g-x,S=_-v,b=m.map(O=>({u:(O.u-x)/C,v:(O.v-v)/S})),w={u:(0-x)/C,v:(0-v)/S};i.set(a,{normalizedCenter:h,normalizedVertices:d,normalizedUVs:b,centerUV:w})}Te.begin("Planet.rebuildLODMesh.pass1");const s=new Map;for(const[a,l]of this.columns){let c=0,h=P.GRASS,d=0;for(let m=l.blocks.length-1;m>=0;m--)if(l.blocks[m]!==P.AIR&&(h===P.GRASS&&(c=m,h=l.blocks[m]),l.blocks[m]!==P.WATER)){d=m;break}let u;const f=h===P.WATER;f?u=t:u=this.depthToRadius(c)-e;const p=this.depthToRadius(d)-e;s.set(a,{radius:u,isWater:f,surfaceBlockType:h,terrainRadius:p})}Te.end("Planet.rebuildLODMesh.pass1"),Te.begin("Planet.rebuildLODMesh.pass2");for(const[a]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const l=s.get(a);if(!l)continue;const c=l.surfaceBlockType,h=l.radius,d=i.get(a);if(!d)continue;const u=d.normalizedCenter,f=u.clone().multiplyScalar(h),p=d.normalizedVertices.map(A=>A.clone().multiplyScalar(h)),m=this.tileToChunk.get(a)??0,x=n[m];let g,v,_,C,S,b,w;c===P.WATER?(g=x.waterPositions,v=x.waterNormals,_=x.waterUvs,C=null,S=null,b=x.waterIndices,w=x.waterVertexOffset):c===P.DIRT?(g=x.dirtPositions,v=x.dirtNormals,_=x.dirtUvs,C=x.dirtSkyLight,S=x.dirtTorchLight,b=x.dirtIndices,w=x.dirtVertexOffset):c===P.STONE?(g=x.stonePositions,v=x.stoneNormals,_=x.stoneUvs,C=x.stoneSkyLight,S=x.stoneTorchLight,b=x.stoneIndices,w=x.stoneVertexOffset):c===P.SAND?(g=x.sandPositions,v=x.sandNormals,_=x.sandUvs,C=x.sandSkyLight,S=x.sandTorchLight,b=x.sandIndices,w=x.sandVertexOffset):c===P.WOOD?(g=x.woodPositions,v=x.woodNormals,_=x.woodUvs,C=x.woodSkyLight,S=x.woodTorchLight,b=x.woodIndices,w=x.woodVertexOffset):c===P.SNOW||c===P.DIRT_SNOW?(g=x.snowPositions,v=x.snowNormals,_=x.snowUvs,C=x.snowSkyLight,S=x.snowTorchLight,b=x.snowIndices,w=x.snowVertexOffset):c===P.ICE?(g=x.icePositions,v=x.iceNormals,_=x.iceUvs,C=x.iceSkyLight,S=x.iceTorchLight,b=x.iceIndices,w=x.iceVertexOffset):(g=x.grassPositions,v=x.grassNormals,_=x.grassUvs,C=x.grassSkyLight,S=x.grassTorchLight,b=x.grassIndices,w=x.grassVertexOffset);const E=this.tilesWithTorches.has(a)?1:0,T=w;g.push(f.x,f.y,f.z),v.push(u.x,u.y,u.z),_.push(d.centerUV.u,d.centerUV.v),C&&C.push(1),S&&S.push(E),w++;for(let A=0;A<p.length;A++)g.push(p[A].x,p[A].y,p[A].z),v.push(u.x,u.y,u.z),_.push(d.normalizedUVs[A].u,d.normalizedUVs[A].v),C&&C.push(1),S&&S.push(E),w++,b.push(T,T+1+A,T+1+(A+1)%p.length);c===P.WATER?x.waterVertexOffset=w:c===P.DIRT?x.dirtVertexOffset=w:c===P.STONE?x.stoneVertexOffset=w:c===P.SAND?x.sandVertexOffset=w:c===P.WOOD?x.woodVertexOffset=w:c===P.SNOW||c===P.DIRT_SNOW?x.snowVertexOffset=w:c===P.ICE?x.iceVertexOffset=w:x.grassVertexOffset=w,this.lodTileVisibility.set(a,!0)}Te.end("Planet.rebuildLODMesh.pass2"),Te.begin("Planet.rebuildLODMesh.pass3");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=l.tile,h=s.get(a),d=(h==null?void 0:h.radius)??this.radius,u=(h==null?void 0:h.isWater)??!1,f=c.vertices.length,p=i.get(a);if(!p)continue;const m=p.normalizedVertices,x=this.tileToChunk.get(a)??0,g=n[x];for(let v=0;v<f;v++){const _=(v+1)%f,C=m[v],S=m[_],b=C.x+S.x,w=C.y+S.y,O=C.z+S.z,E=Math.sqrt(b*b+w*w+O*O),T=b/E,A=w/E,U=O/E;let G,z=1/0,$=!1;for(const se of c.neighbors){const J=i.get(se);if(!J)continue;const Re=J.normalizedCenter,ge=Re.x-T,ke=Re.y-A,we=Re.z-U,ie=ge*ge+ke*ke+we*we;if(ie<z){z=ie;const le=s.get(se);G=le==null?void 0:le.radius,$=(le==null?void 0:le.isWater)??!1}}if(G===void 0||!(d>G||u&&!$))continue;const ee=C.x*G,q=C.y*G,ne=C.z*G,te=S.x*G,xe=S.y*G,ze=S.z*G,He=S.x*d,be=S.y*d,Pe=S.z*d,j=C.x*d,X=C.y*d,he=C.z*d,oe=te-ee,de=xe-q,pe=ze-ne,Je=j-ee,Be=X-q,et=he-ne;let F=de*et-pe*Be,De=pe*Je-oe*et,Ue=oe*Be-de*Je;const Xe=Math.sqrt(F*F+De*De+Ue*Ue);Xe>0&&(F/=Xe,De/=Xe,Ue/=Xe);const me=u?g.waterSidePositions:g.sidePositions,st=u?g.waterSideNormals:g.sideNormals,Me=u?g.waterSideUvs:g.sideUvs,Le=u?null:g.sideSkyLight,D=u?null:g.sideTorchLight,M=u?g.waterSideIndices:g.sideIndices,B=u?g.waterSideVertexOffset:g.sideVertexOffset,Z=this.tilesWithTorches.has(a)?1:0;me.push(ee,q,ne,te,xe,ze,He,be,Pe,j,X,he),st.push(F,De,Ue,F,De,Ue,F,De,Ue,F,De,Ue),Me.push(0,0,1,0,1,1,0,1),Le&&Le.push(1,1,1,1),D&&D.push(Z,Z,Z,Z),M.push(B,B+1,B+2,B,B+2,B+3),u?g.waterSideVertexOffset+=4:g.sideVertexOffset+=4}}Te.end("Planet.rebuildLODMesh.pass3"),Te.begin("Planet.rebuildLODMesh.pass4");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=s.get(a);if(!((c==null?void 0:c.isWater)??!1))continue;const d=l.tile,u=d.vertices.length,f=i.get(a);if(!f)continue;const p=f.normalizedVertices,m=this.tileToChunk.get(a)??0,x=n[m];for(let g=0;g<u;g++){const v=(g+1)%u,_=p[g],C=p[v],S=_.x+C.x,b=_.y+C.y,w=_.z+C.z,O=Math.sqrt(S*S+b*b+w*w),E=S/O,T=b/O,A=w/O;let U,G=1/0;for(const st of d.neighbors){const Me=i.get(st);if(!Me)continue;const Le=Me.normalizedCenter,D=Le.x-E,M=Le.y-T,B=Le.z-A,Z=D*D+M*M+B*B;Z<G&&(G=Z,U=st)}if(U===void 0||!this.cachedNearbyTiles.has(U))continue;const z=s.get(U);if(!z)continue;const $=z.terrainRadius,W=t;if($>=W)continue;const ee=_.x*$,q=_.y*$,ne=_.z*$,te=C.x*$,xe=C.y*$,ze=C.z*$,He=C.x*W,be=C.y*W,Pe=C.z*W,j=_.x*W,X=_.y*W,he=_.z*W,oe=te-ee,de=xe-q,pe=ze-ne,Je=j-ee,Be=X-q,et=he-ne;let F=de*et-pe*Be,De=pe*Je-oe*et,Ue=oe*Be-de*Je;const Xe=Math.sqrt(F*F+De*De+Ue*Ue);Xe>0&&(F/=Xe,De/=Xe,Ue/=Xe);const me=x.waterSideVertexOffset;x.waterSidePositions.push(ee,q,ne,te,xe,ze,He,be,Pe,j,X,he),x.waterSideNormals.push(F,De,Ue,F,De,Ue,F,De,Ue,F,De,Ue),x.waterSideUvs.push(0,0,1,0,1,1,0,1),x.waterSideIndices.push(me,me+1,me+2,me,me+2,me+3),x.waterSideVertexOffset+=4}}Te.end("Planet.rebuildLODMesh.pass4"),Te.begin("Planet.rebuildLODMesh.createMeshes");const r=new Gt;for(let a=0;a<this.LOD_CHUNK_COUNT;a++){const l=n[a],c=this.lodChunks[a];for(;c.children.length>0;)c.remove(c.children[0]);const h=(d,u,f,p,m,x)=>{const g=new mt;if(g.setAttribute("position",new Ge(d,3)),g.setAttribute("normal",new Ge(u,3)),g.setAttribute("uv",new Ge(f,2)),m&&m.length>0&&g.setAttribute("skyLight",new Ge(m,1)),x&&x.length>0)g.setAttribute("torchLight",new Ge(x,1));else{const v=d.length/3;g.setAttribute("torchLight",new Ge(new Float32Array(v).fill(0),1))}return g.setIndex(p),g};if(l.grassPositions.length>0){const d=h(l.grassPositions,l.grassNormals,l.grassUvs,l.grassIndices,l.grassSkyLight,l.grassTorchLight),u=new Ce(d,this.meshBuilder.getTopLODMaterial());c.add(u)}if(l.dirtPositions.length>0){const d=h(l.dirtPositions,l.dirtNormals,l.dirtUvs,l.dirtIndices,l.dirtSkyLight,l.dirtTorchLight),u=new Ce(d,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.stonePositions.length>0){const d=h(l.stonePositions,l.stoneNormals,l.stoneUvs,l.stoneIndices,l.stoneSkyLight,l.stoneTorchLight),u=new Ce(d,this.meshBuilder.getStoneLODMaterial());c.add(u)}if(l.sandPositions.length>0){const d=h(l.sandPositions,l.sandNormals,l.sandUvs,l.sandIndices,l.sandSkyLight,l.sandTorchLight),u=new Ce(d,this.meshBuilder.getSandLODMaterial());c.add(u)}if(l.woodPositions.length>0){const d=h(l.woodPositions,l.woodNormals,l.woodUvs,l.woodIndices,l.woodSkyLight,l.woodTorchLight),u=new Ce(d,this.meshBuilder.getWoodLODMaterial());c.add(u)}if(l.snowPositions.length>0){const d=h(l.snowPositions,l.snowNormals,l.snowUvs,l.snowIndices,l.snowSkyLight,l.snowTorchLight),u=new Ce(d,this.meshBuilder.getSnowLODMaterial());c.add(u)}if(l.icePositions.length>0){const d=h(l.icePositions,l.iceNormals,l.iceUvs,l.iceIndices,l.iceSkyLight,l.iceTorchLight),u=new Ce(d,this.meshBuilder.getIceLODMaterial());c.add(u)}if(l.waterPositions.length>0){const d=new mt;d.setAttribute("position",new Ge(l.waterPositions,3)),d.setAttribute("normal",new Ge(l.waterNormals,3)),d.setAttribute("uv",new Ge(l.waterUvs,2)),d.setIndex(l.waterIndices);const u=new Ce(d,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}if(l.sidePositions.length>0){const d=h(l.sidePositions,l.sideNormals,l.sideUvs,l.sideIndices,l.sideSkyLight,l.sideTorchLight),u=new Ce(d,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.waterSidePositions.length>0){const d=new mt;d.setAttribute("position",new Ge(l.waterSidePositions,3)),d.setAttribute("normal",new Ge(l.waterSideNormals,3)),d.setAttribute("uv",new Ge(l.waterSideUvs,2)),d.setIndex(l.waterSideIndices);const u=new Ce(d,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}r.add(c)}r.position.copy(this.center),r.renderOrder=-1,this.scene.add(r),this.lodMesh=r,Te.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,Te.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath;this.generateOreVeins();const t=new Map;for(const s of this.polyhedron.tiles){const r=this.getHeightVariation(s.center);t.set(s.index,r)}const n=this.MAX_DEPTH-1-this.SEA_LEVEL,i=new Set;if(e){for(const s of this.polyhedron.tiles)if((t.get(s.index)??n)>=n){for(const a of s.neighbors)if((t.get(a)??n)<n){i.add(s.index);break}}console.log(`[Beach detection] Found ${i.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`)}for(const s of this.polyhedron.tiles){const r=[],a=t.get(s.index)??n,l=i.has(s.index),c=s.center.clone().normalize().y,h=N.POLAR_THRESHOLD,d=Math.abs(c)>h,u=e&&a<n;for(let m=0;m<this.MAX_DEPTH;m++)if(m>a)r.push(P.AIR);else if(m===a)l&&!d?r.push(P.SAND):u?r.push(P.DIRT):d?r.push(P.SNOW):r.push(P.GRASS);else if(m>a-3)l&&!d?r.push(P.SAND):r.push(P.DIRT);else{const x=this.getOreAtDepth(m,s.index);r.push(x)}const f=new oi(s.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),p={tile:s,blocks:r,isDirty:!0,boundingSphere:f};this.columns.set(s.index,p)}e&&this.fillOceans()}generateOreVeins(){if(this.oreVeinsGenerated)return;const e=n=>{const i=Math.sin(n)*43758.5453;return i-Math.floor(i)},t=new Map;for(const n of this.polyhedron.tiles)t.set(n.index,n.neighbors);for(const n of this.ORE_CONFIGS){const i=n.type*31337;for(const s of this.polyhedron.tiles){const r=s.index;for(let a=n.minDepth;a<=n.maxDepth;a++){const l=`${r},${a}`;if(this.oreVeinCache.has(l))continue;const c=N.TERRAIN_SEED+i+r*7919+a*104729;e(c)<n.veinChance&&this.spreadOreVein(r,a,n,e,c,t)}}}this.oreVeinsGenerated=!0}spreadOreVein(e,t,n,i,s,r){const a=[],l=new Set;a.push({tileIndex:e,depth:t,probability:1});let c=0;const h=n.veinSize+Math.floor(i(s+999)*n.veinSize*.5);for(;a.length>0&&c<h;){const d=a.shift(),u=`${d.tileIndex},${d.depth}`;if(l.has(u)||(l.add(u),d.depth<n.minDepth||d.depth>n.maxDepth))continue;const f=s+d.tileIndex*13+d.depth*17;if(i(f)>d.probability||this.oreVeinCache.has(u))continue;this.oreVeinCache.set(u,n.type),c++;const p=d.probability*n.spreadFactor;if(p<.1)continue;a.push({tileIndex:d.tileIndex,depth:d.depth-1,probability:p}),a.push({tileIndex:d.tileIndex,depth:d.depth+1,probability:p});const m=r.get(d.tileIndex);if(m)for(const x of m)a.push({tileIndex:x,depth:d.depth,probability:p*.9})}}getOreAtDepth(e,t){const n=`${t},${e}`;return this.oreVeinCache.get(n)||P.STONE}fillOceans(){const e=this.MAX_DEPTH-1-this.SEA_LEVEL,t=N.POLAR_THRESHOLD;for(const[n,i]of this.columns){const s=i.tile.center.clone().normalize().y,r=Math.abs(s)>t;let a=!1;for(let l=i.blocks.length-1;l>=0&&i.blocks[l]===P.AIR;l--)l<=e&&(r&&!a&&l===e?(i.blocks[l]=P.ICE,a=!0):i.blocks[l]=P.WATER,i.isDirty=!0)}this.cascadeWaterInColumns()}cascadeWaterInColumns(){let e=0;for(const[t,n]of this.columns){let i=!1;for(let s=n.blocks.length-1;s>=0;s--){const r=n.blocks[s];r===P.WATER?i=!0:r===P.AIR?i&&(n.blocks[s]=P.WATER,n.isDirty=!0,e++):i=!1}}e>0&&console.log(`[Water cascade] Filled ${e} air blocks below water in columns`)}updateWaterFlow(e){let t=0;for(const n of e){const i=this.columns.get(n);if(!i)continue;let s=!0;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?s||(i.blocks[a]=P.AIR,i.isDirty=!0,t++):l===P.AIR||(s=!1)}let r=!1;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?r=!0:l===P.AIR?r&&(i.blocks[a]=P.WATER,i.isDirty=!0,t++):r=!1}}return t}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkDirections[e];this.lodChunkBounds[e].center.set(t.x*this.radius+this.center.x,t.y*this.radius+this.center.y,t.z*this.radius+this.center.z)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=N.TERRAIN_CONTINENT_SCALE,s=N.TERRAIN_MOUNTAIN_SCALE,r=N.TERRAIN_DETAIL_SCALE,a=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(a)*Math.pow(Math.abs(a),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,s,4,.5,2.2),h=Math.max(0,l),d=c*h*N.TERRAIN_MOUNTAIN_HEIGHT,u=this.fractalSimplex3D(n.x,n.y,n.z,N.TERRAIN_HILL_SCALE,3,.5,2),f=this.fractalSimplex3D(n.x,n.y,n.z,r,2,.5,2);let p=l*N.TERRAIN_CONTINENT_WEIGHT;p+=d,p+=u*N.TERRAIN_HILL_WEIGHT*(h>.1?1:.3),p+=f*N.TERRAIN_DETAIL_WEIGHT;const m=this.MAX_DEPTH-1-this.SEA_LEVEL;let x;if(p>=0){const g=p*this.MAX_HEIGHT*t;x=m+g}else{const v=Math.pow(Math.abs(p),N.TERRAIN_OCEAN_DEPTH_POWER)*N.TERRAIN_MAX_DEPTH*t;x=m-v}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(x)))}simplex3D(e,t,n){const i=.3333333333333333,s=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const r=(e+t+n)*i,a=Math.floor(e+r),l=Math.floor(t+r),c=Math.floor(n+r),h=(a+l+c)*s,d=a-h,u=l-h,f=c-h,p=e-d,m=t-u,x=n-f;let g,v,_,C,S,b;p>=m?m>=x?(g=1,v=0,_=0,C=1,S=1,b=0):p>=x?(g=1,v=0,_=0,C=1,S=0,b=1):(g=0,v=0,_=1,C=1,S=0,b=1):m<x?(g=0,v=0,_=1,C=0,S=1,b=1):p<x?(g=0,v=1,_=0,C=0,S=1,b=1):(g=0,v=1,_=0,C=1,S=1,b=0);const w=p-g+s,O=m-v+s,E=x-_+s,T=p-C+2*s,A=m-S+2*s,U=x-b+2*s,G=p-1+3*s,z=m-1+3*s,$=x-1+3*s;let W=0,ee=0,q=0,ne=0,te=.6-p*p-m*m-x*x;te>=0&&(te*=te,W=te*te*this.grad3D(a,l,c,p,m,x));let xe=.6-w*w-O*O-E*E;xe>=0&&(xe*=xe,ee=xe*xe*this.grad3D(a+g,l+v,c+_,w,O,E));let ze=.6-T*T-A*A-U*U;ze>=0&&(ze*=ze,q=ze*ze*this.grad3D(a+C,l+S,c+b,T,A,U));let He=.6-G*G-z*z-$*$;return He>=0&&(He*=He,ne=He*He*this.grad3D(a+1,l+1,c+1,G,z,$)),32*(W+ee+q+ne)}grad3D(e,t,n,i,s,r){const a=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][a];return c[0]*i+c[1]*s+c[2]*r}fractalSimplex3D(e,t,n,i,s,r,a){let l=0,c=1,h=i,d=0;for(let u=0;u<s;u++)l+=this.simplex3D(e*h,t*h,n*h)*c,d+=c,c*=r,h*=a;return l/d}ridgeSimplex3D(e,t,n,i,s,r,a){let l=0,c=1,h=i,d=0;for(let u=0;u<s;u++){const f=this.simplex3D(e*h,t*h,n*h),p=1-Math.abs(f);l+=p*p*c,d+=c,c*=r,h*=a}return l/d}hash3D(e,t,n){const i=this.seed;let s=e*374761393+t*668265263+n*1274126177+i|0;return s=(s^s>>13)*1274126177|0,s^s>>16}update(e,t,n,i){i?this.frustum.copy(i):(Te.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),Te.end("Planet.frustum"));const s=n;s&&s>100&&console.log("you got serious issues lol "+n);const r=e.distanceTo(this.center),a=r-this.radius,l=this.getDistantLODLevel(r);if(l>=0){this.setDistantLODVisible(l),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(a>N.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const g=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!g);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const c=Math.min(1,Math.max(0,a/100)),h=N.TERRAIN_MIN_RENDER_DISTANCE,d=N.TERRAIN_MAX_RENDER_DISTANCE,u=Math.floor(h+c*(d-h));Te.begin("Planet.getTile");const f=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(Te.end("Planet.getTile"),!f)return;const p=f.index;this.isIncrementalRebuildActive&&(Te.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),Te.end("Planet.incrementalRebuild"));const m=N.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(p)||u!==this.cachedRenderDistance){Te.begin("Planet.tilesInRange");const g=this.getTilesInRange(p,u),v=[],_=[];for(const C of g)this.cachedNearbyTiles.has(C)||v.push(C);for(const C of this.cachedNearbyTiles)g.has(C)||_.push(C);if(this.bufferCenterTiles=this.getTilesInRange(p,m),this.cachedRenderDistance=u,v.length>0||_.length>0){this.cachedNearbyTiles=g;const C=this.polyhedron.tiles[p].center;v.sort((S,b)=>{const w=this.polyhedron.tiles[S].center.distanceToSquared(C);return this.polyhedron.tiles[b].center.distanceToSquared(C)-w}),_.sort((S,b)=>{const w=this.polyhedron.tiles[S].center.distanceToSquared(C),O=this.polyhedron.tiles[b].center.distanceToSquared(C);return w-O}),this.pendingTilesToAdd.push(...v),this.pendingTilesToRemove.push(..._),this.isIncrementalRebuildActive=!0,console.log("[needsRebatch=true] cachedNearbyTiles changed"),this.needsRebatch=!0,this.needsLODRebuild=!0,Te.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),Te.end("Planet.boundaryWalls")}Te.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(Te.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),Te.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(console.log("[startWorkerBuild] needsRebatch was true, starting worker build"),this.geometryWorker?(Te.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),Te.end("Planet.startWorkerBuild")):(Te.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),Te.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(v=>setTimeout(v,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(Te.begin("Planet.LODRebuild"),this.rebuildLODMesh(),Te.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(v=>setTimeout(v,0)))(()=>{this.needsWaterWallsRebuild&&(Te.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),Te.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=N.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,console.log("[needsRebatch=true] incremental rebuild complete"),this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),this.currentWaterMesh=null;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=dl();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const s=this.createBufferGeometry(i),r=new Ce(s,n.getMaterial());n.renderOrder!==void 0&&(r.renderOrder=n.renderOrder),this.batchedMeshGroup.add(r),n.key==="water"&&(this.currentWaterMesh=r,this.waterMeshCallback&&this.waterMeshCallback(r,!0))}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}getBlockTopMaterialKey(e){switch(e){case P.WATER:return"water";case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"top";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"top"}}getBlockSideMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"grassSide";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snowSide";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}getBlockBottomMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.WOOD:return"wood";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"dirtSnow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}buildColumnGeometry(e,t){let n=0;for(let i=e.blocks.length-1;i>=0;i--)if(e.blocks[i]!==P.AIR&&e.blocks[i]!==P.WATER){n=i;break}for(let i=0;i<e.blocks.length;i++){const s=e.blocks[i];if(s===P.AIR)continue;const r=s===P.WATER,a=i>=e.blocks.length-1?P.AIR:e.blocks[i+1],l=i===0?P.AIR:e.blocks[i-1],c=a===P.AIR||!r&&a===P.WATER,h=l===P.AIR||!r&&l===P.WATER;if(r&&a!==P.AIR)continue;const d=this.hasExposedSide(e,i);if(!r&&!c&&!h&&!d)continue;let u=this.depthToRadius(i),f=u-this.BLOCK_HEIGHT;if(r&&(u-=N.WATER_SURFACE_OFFSET,f-=N.WATER_SURFACE_OFFSET),f<=0)continue;const p=n-i,m=.8,x=.05;let g=1;p>0&&(g=Math.max(x,Math.pow(m,p)));const{top:v,bottom:_,sides:C}=this.meshBuilder.createSeparateGeometries(e.tile,f,u,new R(0,0,0),r?!0:c,r?!1:h,r?!1:d);if(v){const S=v.getAttribute("position"),b=v.getAttribute("normal"),w=v.getAttribute("uv"),O=v.getIndex();if(S&&b&&w&&O){const E=this.getBlockTopMaterialKey(s),T=r?1:g;this.mergeGeometry(t[E],S,b,w,O,this.sunDirection,T)}v.dispose()}if(_&&!r){const S=_.getAttribute("position"),b=_.getAttribute("normal"),w=_.getAttribute("uv"),O=_.getIndex();if(S&&b&&w&&O){const E=Math.max(x,g*m),T=this.getBlockBottomMaterialKey(s);this.mergeGeometry(t[T],S,b,w,O,this.sunDirection,E)}_.dispose()}if(C){const S=C.getAttribute("position"),b=C.getAttribute("normal"),w=C.getAttribute("uv"),O=C.getIndex();if(S&&b&&w&&O){const E=this.getBlockSideMaterialKey(s);this.mergeGeometry(t[E],S,b,w,O,this.sunDirection,g)}C.dispose()}r&&this.buildWaterSideFaces(e,i,f,u,t.water)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e);for(const t of this.distantLODMaterials)t.uniforms.sunDirection.value.copy(e)}setTorchData(e){this.torchData=e.map(t=>({position:{x:t.position.x-this.center.x,y:t.position.y-this.center.y,z:t.position.z-this.center.z},range:t.range,intensity:t.intensity})),this.rebuildDistantLODMeshes()}setTilesWithTorches(e){this.tilesWithTorches=e}markTilesNearTorchDirty(e,t){const n=this.getTileAtPoint(e);if(!n)return;const i=this.columns.get(n.index);if(i&&this.cachedNearbyTiles.has(n.index)){i.isDirty=!0,this.queueDirtyColumnRebuild(n.index);for(const s of i.tile.neighbors){const r=this.columns.get(s);r&&this.cachedNearbyTiles.has(s)&&(r.isDirty=!0,this.queueDirtyColumnRebuild(s))}}}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}setWaterMeshCallback(e){this.waterMeshCallback=e,this.currentWaterMesh&&e(this.currentWaterMesh,!0)}getTilesInRange(e,t){const n=new Set,i=new Set,s=[{index:e,distance:0}];let r=0;for(;r<s.length;){const a=s[r++];if(!i.has(a.index)&&(i.add(a.index),a.distance<=t)){n.add(a.index);const l=this.polyhedron.tiles[a.index];for(const c of l.neighbors)i.has(c)||s.push({index:c,distance:a.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Ce&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,s,r,a=1){for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),d=t.getZ(l),u=n.getX(l),f=n.getY(l),p=n.getZ(l);e.positions.push(c,h,d),e.normals.push(u,f,p),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(a),e.torchLight.push(this.calculateTorchLightAtPosition(c,h,d));{const m=Math.sqrt(c*c+h*h+d*d);let x=1;if(m>0){const g=c/m,v=h/m,_=d/m,C=g*r.x+v*r.y+_*r.z;x=Math.max(.2,C*.5+.5)}e.colors.push(x,x,x)}}for(let l=0;l<s.count;l++)e.indices.push(s.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}calculateTorchLightAtPosition(e,t,n){let i=0;for(const s of this.torchData){const r=e-s.position.x,a=t-s.position.y,l=n-s.position.z,c=Math.sqrt(r*r+a*a+l*l);if(c<s.range){const h=1/(1+2*c*c/(s.range*s.range));i+=h*s.intensity}}return Math.min(i,1.5)}createBufferGeometry(e){const t=new mt;if(t.setAttribute("position",new Ge(e.positions,3)),t.setAttribute("normal",new Ge(e.normals,3)),t.setAttribute("uv",new Ge(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new Ge(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new Ge(e.skyLight,1)),e.torchLight&&e.torchLight.length>0)t.setAttribute("torchLight",new Ge(e.torchLight,1));else{const n=e.positions.length/3;t.setAttribute("torchLight",new Ge(new Float32Array(n).fill(0),1))}return t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const s of e.tile.neighbors){const r=this.columns.get(s);if(r&&t<r.blocks.length){const a=r.blocks[t];if(i&&(a===P.AIR||a===P.WATER)||n===P.WATER&&a===P.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,s){const r=e.tile,a=r.vertices.length,l=.001;for(let c=0;c<a;c++){const h=(c+1)%a,d=r.vertices[c],u=r.vertices[h];let f;for(const G of r.neighbors){const z=this.columns.get(G);if(!z)continue;const $=z.tile;let W=!1,ee=!1;for(const q of $.vertices)q.distanceTo(d)<l&&(W=!0),q.distanceTo(u)<l&&(ee=!0);if(W&&ee){f=z;break}}if(!f||f.blocks[t]!==P.AIR)continue;let p=0;for(let G=t-1;G>=0;G--){const z=e.blocks[G];if(z!==P.AIR&&z!==P.WATER){p=G;break}}let m=0;for(let G=t-1;G>=0;G--){const z=f.blocks[G];if(z!==P.AIR&&z!==P.WATER){m=G;break}}const x=Math.max(p,m),g=i,v=this.depthToRadius(x);if(v>=g)continue;const _=d.clone().normalize(),C=u.clone().normalize(),S=_.clone().multiplyScalar(g),b=C.clone().multiplyScalar(g),w=_.clone().multiplyScalar(v),O=C.clone().multiplyScalar(v),E=O.clone().sub(w),T=S.clone().sub(w),A=E.clone().cross(T).normalize(),U=s.vertexOffset;s.positions.push(w.x,w.y,w.z,O.x,O.y,O.z,b.x,b.y,b.z,S.x,S.y,S.z);for(let G=0;G<4;G++)s.normals.push(A.x,A.y,A.z);s.uvs.push(0,0,1,0,1,1,0,1),s.skyLight.push(1,1,1,1),s.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),s.indices.push(U,U+1,U+2,U,U+2,U+3),s.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?P.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const s=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const a of i.tile.neighbors){const l=this.columns.get(a);l&&(l.isDirty=!0)}let r=0;for(let a=0;a<i.blocks.length;a++)if(i.blocks[a]!==P.AIR&&i.blocks[a]!==P.WATER){r=a;break}t<=r+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const a of i.tile.neighbors)this.cachedNearbyTiles.has(a)&&this.queueDirtyColumnRebuild(a);this.meshBuilder.isSolid(s)&&n===P.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0||this.isWorkerBuildActive||this.geometryWorker&&(console.log("[needsRebatch=true] rebuildDirtyColumns"),this.needsRebatch=!0,this.dirtyColumnsQueue.clear())}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=dl(),t=this.getSeaLevelDepth(),n=this.depthToRadius(t)-N.WATER_SURFACE_OFFSET;for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(!s)continue;const r=s.tile;for(let a=0;a<r.vertices.length;a++){const l=(a+1)%r.vertices.length,c=r.vertices[a],h=r.vertices[l],d=c.clone().add(h).normalize();let u,f=1/0;for(const A of r.neighbors){const U=this.columns.get(A);if(!U)continue;const G=U.tile.center.clone().normalize().distanceToSquared(d);G<f&&(f=G,u=A)}if(u===void 0||this.cachedNearbyTiles.has(u))continue;let p=!1,m=0;for(let A=s.blocks.length-1;A>=0;A--){const U=s.blocks[A];if(U===P.WATER)p=!0;else if(U!==P.AIR){m=A;break}}if(!p||m>=t)continue;const g=this.depthToRadius(m),v=n;if(g>=v)continue;const _=c.clone().normalize().multiplyScalar(g),C=h.clone().normalize().multiplyScalar(g),S=h.clone().normalize().multiplyScalar(v),b=c.clone().normalize().multiplyScalar(v),w=C.clone().sub(_),O=b.clone().sub(_),E=w.clone().cross(O).normalize(),T=e.vertexOffset;e.positions.push(_.x,_.y,_.z,C.x,C.y,C.z,S.x,S.y,S.z,b.x,b.y,b.z);for(let A=0;A<4;A++)e.normals.push(E.x,E.y,E.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(T,T+1,T+2),e.indices.push(T,T+2,T+3),e.vertexOffset+=4}}if(e.positions.length>0){const i=this.createBufferGeometry(e),s=this.meshBuilder.getSeaWallMaterial();if(s){const r=new Ce(i,s);r.renderOrder=2,this.batchedMeshGroup.add(r)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t<n.blocks.length-1&&n.blocks[t+1]===P.WATER&&(i=!0);for(const s of n.tile.neighbors){const r=this.columns.get(s);r&&r.blocks[t]===P.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],s=[],r=500;for(;i.length>0;){const{tileIndex:d,depth:u}=i.shift(),f=`${d}-${u}`;if(n.has(f))continue;if(n.add(f),n.size>r)return;const p=this.columns.get(d);if(!p||u<0||u>=p.blocks.length)continue;const m=p.blocks[u];if(!(m!==P.AIR&&m!==P.WATER)){if(s.push({tileIndex:d,depth:u,isWater:m===P.WATER}),u>0){const x=p.blocks[u-1];(x===P.AIR||x===P.WATER)&&i.push({tileIndex:d,depth:u-1})}if(u<p.blocks.length-1){const x=p.blocks[u+1];(x===P.AIR||x===P.WATER)&&i.push({tileIndex:d,depth:u+1})}for(const x of p.tile.neighbors){const g=this.columns.get(x);if(g){const v=g.blocks[u];(v===P.AIR||v===P.WATER)&&i.push({tileIndex:x,depth:u})}}}}const a=s.filter(d=>d.isWater).length;if(a===0)return;s.sort((d,u)=>d.depth-u.depth);let l=a;const c=[],h=[];for(const d of s)l>0?(c.push(d),l--):h.push(d);for(const d of c){const u=this.columns.get(d.tileIndex);if(u&&u.blocks[d.depth]===P.AIR){u.blocks[d.depth]=P.WATER,u.isDirty=!0,this.needsRebatch=!0;for(const f of u.tile.neighbors){const p=this.columns.get(f);p&&(p.isDirty=!0)}}}for(const d of h){const u=this.columns.get(d.tileIndex);if(u&&u.blocks[d.depth]===P.WATER){u.blocks[d.depth]=P.AIR,u.isDirty=!0,this.needsRebatch=!0;for(const f of u.tile.neighbors){const p=this.columns.get(f);p&&(p.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getTileAtPointFast(e){const t=e.clone().sub(this.center);return this.lastQueriedTile?(this.lastQueriedTile=this.polyhedron.getTileAtPointFromHint(t,this.lastQueriedTile),this.lastQueriedTile):(this.lastQueriedTile=this.polyhedron.getTileAtPoint(t),this.lastQueriedTile)}resetTileCache(){this.lastQueriedTile=null}getDepthAtPoint(e){const t=e.distanceTo(this.center),n=Math.ceil(this.MAX_DEPTH-1-(this.radius-t)/this.BLOCK_HEIGHT);return Math.max(0,Math.min(this.MAX_DEPTH,n))}getCoordinatesAtPoint(e){const t=this.getDepthAtPoint(e),n=e.clone().sub(this.center).normalize(),i=Math.asin(n.y)*(180/Math.PI),s=Math.atan2(n.z,n.x)*(180/Math.PI);return{lat:i,lon:s,depth:t}}getDirectionFromLatLon(e,t){const n=e*(Math.PI/180),i=t*(Math.PI/180),s=Math.sin(n),r=Math.cos(n),a=r*Math.cos(i),l=r*Math.sin(i);return new R(a,s,l).normalize()}getSpawnPositionAtLatLon(e,t,n=1){const i=this.getDirectionFromLatLon(e,t),s=this.getSurfaceHeightInDirection(i);return this.center.clone().add(i.multiplyScalar(s+n))}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=t.blocks.length-1;n>=0;n--)if(t.blocks[n]!==P.AIR&&t.blocks[n]!==P.WATER){const i=this.depthToRadius(n);return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s!==P.AIR&&s!==P.WATER)return this.depthToRadius(i)}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s===P.WATER)return!0;if(s!==P.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getTileNeighbors(e){const t=this.polyhedron.tiles[e];return t?t.neighbors:[]}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getTileCenterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.center.clone().add(this.center):null}getVisibleTileIndices(){return this.cachedNearbyTiles}isTileInDetailRange(e){return this.cachedNearbyTiles.has(e)}getTileChunkIndex(e){return this.tileToChunk.get(e)??-1}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;const i=this.getDepthAtPoint(e);return i>=0&&i<n.blocks.length?n.blocks[i]===P.WATER:!1}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);if(i>=0&&i<n.blocks.length&&n.blocks[i]!==P.WATER)return 0;let s=-1;for(let r=n.blocks.length-1;r>=0;r--)if(n.blocks[r]===P.WATER){s=r;break}return s<0?0:i<=s?(s-i)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let s=n.blocks.length-1;s>=0;s--)if(n.blocks[s]===P.WATER){i=s;break}return i<0?-1:this.depthToRadius(i)}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const r=t.clone().normalize(),a=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,h=l,d=this.getDepthAtPoint(e);for(let u=0;u<n;u+=.2){a.copy(e).addScaledVector(r,u);const f=this.polyhedron.getTileAtPointFromHint(a.clone().sub(this.center),c),p=this.getDepthAtPoint(a);if(p<0||p>=this.MAX_DEPTH){h=c,d=p,c=f;continue}const m=this.getBlock(f.index,p);if(m===P.AIR){h=f,d=p,c=f;continue}if(m===P.WATER&&!i){h=f,d=p,c=f;continue}const x=a.clone().sub(this.center).normalize();return{tileIndex:f.index,depth:p,blockType:m,point:a.clone(),normal:x,prevTileIndex:h.index,prevDepth:d}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=N.PLANET_LOD_DISTANCE_3?2:e>=N.PLANET_LOD_DISTANCE_2?1:e>=N.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}isInOrbitView(){return this.currentDistantLODLevel>=0}isIncrementalActive(){return this.isIncrementalRebuildActive}getNeedsRebatch(){return this.needsRebatch}}function pl(o,e=3e3){const t=document.getElementById("transition-toast");t&&t.remove();const n=document.createElement("div");n.id="transition-toast",n.textContent=o,n.style.cssText=`
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
  `,document.body.appendChild(n),requestAnimationFrame(()=>{n.style.opacity="1"}),setTimeout(()=>{n.style.opacity="0",setTimeout(()=>n.remove(),300)},e)}const rt=N.TERRAIN_SEA_LEVEL+N.TERRAIN_MAX_DEPTH;let zs=new Map,ml=null;function St(o,e,t){o!==ml&&(zs.clear(),ml=o);let n=zs.get(e);if(!n){n=new Array(rt);for(let i=0;i<rt;i++)n[i]=o.getBlock(e,i);zs.set(e,n)}return t>=0&&t<rt?n[t]:P.AIR}function Km(){zs.clear()}function Wi(o,e,t){let n=-1,i=1/0;for(let s=0;s<rt;s++){const r=s<rt-1?St(o,e,s+1):P.AIR,a=St(o,e,s),l=r===P.AIR||r===P.WATER,c=a!==P.AIR&&a!==P.WATER;if(l&&c){const h=o.depthToRadius(s),d=Math.abs(h-t);d<i&&(i=d,n=s)}}return n}class jm{constructor(e,t,n){y(this,"camera");y(this,"position");y(this,"velocity");y(this,"inputManager");y(this,"planets",[]);y(this,"currentPlanet",null);y(this,"localUp",new R(0,1,0));y(this,"localForward",new R(0,0,-1));y(this,"localRight",new R(1,0,0));y(this,"orientation",new je);y(this,"isInSpace",!1);y(this,"surfacePitch",0);y(this,"surfaceForward",new R(0,0,-1));y(this,"transitionTimer",0);y(this,"isGrounded",!1);y(this,"isJetpacking",!1);y(this,"isInWater",!1);y(this,"feetInWater",!1);y(this,"isFloatingAtSurface",!1);y(this,"hasDoubleJumped",!1);y(this,"jetpackEnabled",!0);y(this,"lastPosition",new R);y(this,"stuckFrameCount",0);y(this,"wasdActiveFrames",0);y(this,"lastStuckLogTime",0);y(this,"jumpStartPosition",null);y(this,"jumpStartSpherical",null);y(this,"wasdPressedDuringJump",!1);y(this,"jumpDirection",null);y(this,"didJumpThisFrame",!1);y(this,"getTechBlockDataCallback",null);y(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new R,this.position=n.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,1),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new pt;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new pt().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new R(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new R().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new R().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),s=Math.atan2(n.x,n.z),r=Math.acos(n.y/i);return{theta:s,phi:r,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}checkEdgeNudge(){if(!this.currentPlanet)return;const e=this.currentPlanet.getTileAtPointFast(this.position);if(!e)return;const t=new R(e.center.x+this.currentPlanet.center.x,e.center.y+this.currentPlanet.center.y,e.center.z+this.currentPlanet.center.z),n=this.position.distanceTo(this.currentPlanet.center);let i=-1,s=1/0;for(let u=0;u<rt-1;u++){const f=u<rt-1?St(this.currentPlanet,e.index,u+1):P.AIR,p=St(this.currentPlanet,e.index,u),m=f===P.AIR||f===P.WATER,x=p!==P.AIR&&p!==P.WATER;if(m&&x){const g=this.currentPlanet.depthToRadius(u),v=Math.abs(g-n);g<=n+.5&&v<s&&(i=u,s=v)}}if(i<0)return;const r=this.currentPlanet.depthToRadius(i),a=e.neighbors;if(!a||a.length===0)return;const l=this.currentPlanet.getSurfaceNormal(this.position),c=this.position.clone().sub(l.clone().multiplyScalar(this.position.dot(l)-t.dot(l)));let h=!1;const d=new R;for(const u of a){const f=this.currentPlanet.getTileByIndex(u);if(!f)continue;let p=-1,m=1/0;for(let O=0;O<rt-1;O++){const E=O<rt-1?St(this.currentPlanet,u,O+1):P.AIR,T=St(this.currentPlanet,u,O),A=E===P.AIR||E===P.WATER,U=T!==P.AIR&&T!==P.WATER;if(A&&U){const G=this.currentPlanet.depthToRadius(O),z=Math.abs(G-n);G<=n+.5&&z<m&&(p=O,m=z)}}if(p<0||this.currentPlanet.depthToRadius(p)-r<=N.AUTO_STEP_HEIGHT)continue;const v=new R(f.center.x+this.currentPlanet.center.x,f.center.y+this.currentPlanet.center.y,f.center.z+this.currentPlanet.center.z),C=v.clone().sub(l.clone().multiplyScalar(v.dot(l)-t.dot(l))).clone().sub(t).normalize(),b=c.clone().sub(t).dot(C),w=t.distanceTo(v)*.45;b>w-N.PLAYER_RADIUS*2&&(h=!0,d.sub(C))}if(h&&d.lengthSq()>1e-4){d.normalize();const f=d.multiplyScalar(.075),p=f.clone().sub(l.clone().multiplyScalar(f.dot(l)));this.position.add(p);const m=this.currentPlanet.getSurfaceNormal(this.position);this.position.copy(this.currentPlanet.center).addScaledVector(m,n)}}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const s=this.position.distanceTo(i.planet.center),r=s-i.planet.radius,a=i.gravityFullRadius??i.planet.radius*N.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*N.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(s<l){let h=0;if(s<=a)h=1;else{const d=l-a,u=s-a;h=1-Math.min(1,u/d)}h*=c,h>t&&(t=h,e=i.planet,n=r)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(Km(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),s=this.isInSpace;this.isInSpace=i===0;const r=a=>{const l=new en().setFromQuaternion(this.orientation,"YXZ"),c=(l.x*180/Math.PI).toFixed(1),h=(l.y*180/Math.PI).toFixed(1),d=(l.z*180/Math.PI).toFixed(1);console.log(`[${a}] pitch: ${c}° yaw: ${h}° roll: ${d}° | surfacePitch: ${(this.surfacePitch*180/Math.PI).toFixed(1)}°`)};if(s&&!this.isInSpace&&n&&(r("ENTERING ATMOSPHERE - BEFORE"),pl("Entering Atmosphere",3e3),this.transitionTimer=N.ROLL_SLERP_DURATION,this.currentPlanet=n,r("ENTERING ATMOSPHERE - AFTER")),!s&&this.isInSpace&&(r("ENTERING SPACE - BEFORE"),pl("Entering Space",3e3),this.transitionTimer=0,this.updateOrientationFromLocal(),r("ENTERING SPACE - AFTER")),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{if(this.transitionTimer>0){this.handleTransitionMouseLook(t,e),this.slerpRollToLevel(e);const l=new en().setFromQuaternion(this.orientation,"YXZ"),c=(l.z*180/Math.PI).toFixed(1),h=(l.x*180/Math.PI).toFixed(1);console.log(`[TRANSITIONING] timer: ${this.transitionTimer.toFixed(2)}s | roll: ${c}° pitch: ${h}°`),this.transitionTimer-=e,this.transitionTimer<=0&&(this.syncSurfaceStateFromOrientation(),console.log("[TRANSITION COMPLETE] Synced surfaceForward from orientation"))}else this.handleSpaceMouseLook(t,e);const a=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const l=this.position.distanceTo(this.currentPlanet.center),c=l-a;if(c>.5){const h=this.currentPlanet.getTileAtPointFast(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${a.toFixed(2)} -> ${l.toFixed(2)} (+${c.toFixed(2)})`),console.error(`Current tile: ${h==null?void 0:h.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),h){console.error("Block column at current tile:");for(let d=0;d<20;d++){const u=this.currentPlanet.getBlock(h.index,d),f=this.currentPlanet.depthToRadius(d);let p=u===0?".":u===4?"~":"#";const m=Math.abs(f-l)<1?" <-- PLAYER":"";console.error(`  d${d} (r${f}): ${p}${m}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+N.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPointFast(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1,s=1/0;for(let l=0;l<rt-1;l++){const c=this.currentPlanet.getBlock(n.index,l),h=l<rt-1?this.currentPlanet.getBlock(n.index,l+1):P.AIR,d=c!==P.AIR&&c!==P.WATER,u=h===P.AIR||h===P.WATER;if(d&&u){const f=this.currentPlanet.depthToRadius(l),p=Math.abs(f-e);f<=e+.5&&p<s&&(i=l,s=p)}}const r=i>=0?this.currentPlanet.depthToRadius(i):0;console.log(`  Ground depth: ${i} (radius: ${r.toFixed(2)})`);const a=e-r;console.log(`  Player feet vs ground: ${a.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${a>N.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let l=0;l<8;l++){const c=this.currentPlanet.getBlock(n.index,l),h=P[c],d=this.currentPlanet.depthToRadius(l),u=d>e&&d<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${l}: ${h} (r=${d.toFixed(1)})${u}`)}console.log(`
Neighbor Tiles:`);for(const l of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[l])continue;let h=-1;for(let f=0;f<rt;f++){const p=this.currentPlanet.getBlock(l,f);if(p!==P.AIR&&p!==P.WATER){h=f;break}}const d=h>=0?this.currentPlanet.depthToRadius(h):0,u=d-r;console.log(`  Neighbor ${l}: ground_r=${d.toFixed(1)}, heightDiff=${u.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPointFast(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+N.PLAYER_HEIGHT,s=Wi(this.currentPlanet,t.index,n),r=s>=0?this.currentPlanet.depthToRadius(s):0;console.log("========== Hex STRUCTURE (Shift+X) ==========");const a=this.currentPlanet.getSurfaceNormal(this.position),l=this.localForward.clone().negate(),c=l.dot(a),d=Math.asin(Math.max(-1,Math.min(1,c)))*180/Math.PI,u=l.clone().sub(a.clone().multiplyScalar(c)).normalize(),p=Math.atan2(u.dot(this.localRight),-u.dot(this.localForward.clone().sub(a.clone().multiplyScalar(this.localForward.dot(a))).normalize()))*180/Math.PI;console.log(`Camera pitch: ${d.toFixed(2)}° (max: ±89°), yaw: ${p.toFixed(2)}°`),console.log(`lookDir: (${l.x.toFixed(3)}, ${l.y.toFixed(3)}, ${l.z.toFixed(3)})`),console.log(`planetUp: (${a.x.toFixed(3)}, ${a.y.toFixed(3)}, ${a.z.toFixed(3)})`),console.log(`localUp: (${this.localUp.x.toFixed(3)}, ${this.localUp.y.toFixed(3)}, ${this.localUp.z.toFixed(3)})`),console.log(`localUp·planetUp: ${this.localUp.dot(a).toFixed(3)} (should be ~1.0)`),console.log(""),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${s} (radius: ${r.toFixed(2)})`),console.log(`isGrounded: ${this.isGrounded}, velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`),console.log(`Planet radius: ${this.currentPlanet.radius}`);const m=this.currentPlanet.isTileInDetailRange(t.index),x=this.currentPlanet.getTileChunkIndex(t.index);console.log(`Terrain type: ${m?"DETAILED":"LOD"} (chunk ${x})`),console.log("");const g=N.DEBUG_CAVE_TILE_RINGS,v=N.DEBUG_CAVE_DEPTH_ROWS,_=new Set([t.index]);let C=new Set([t.index]);for(let be=0;be<g;be++){const Pe=new Set;for(const j of C){const X=this.currentPlanet.getPolyhedron().tiles[j];if(X)for(const he of X.neighbors)_.has(he)||(_.add(he),Pe.add(he))}C=Pe}let S=0;for(let be=0;be<rt;be++)if(this.currentPlanet.depthToRadius(be)>=n){S=be;break}const b=Math.floor(v/2),w=Math.max(0,S-b),O=Math.min(rt-1,S+b);console.log(`Sampling ${_.size} tiles, depths ${w} to ${O}`),console.log("Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, P = PIPE, C = CABLE, @ = PLAYER BODY OVERLAP"),console.log("(Higher depths = closer to sky, displayed at top)"),console.log("");const E=Array.from(_),T=["Depth/Radius"].concat(E.map(be=>`T${be}`));console.log(T.join("	"));const A=this.getTechBlockDataCallback?this.getTechBlockDataCallback(E):null,U=new Set,G=new Set;if(A){for(const be of A.copperPipes)U.add(`${be.tileIndex}-${be.depth}`);for(const be of A.cables)G.add(`${be.tileIndex}-${be.depth}`)}for(let be=O;be>=w;be--){const Pe=this.currentPlanet.depthToRadius(be),j=Pe-1,X=Pe>n&&j<i,he=[`d${be} (r${Pe.toFixed(0)})`];for(const oe of E){const de=this.currentPlanet.getBlock(oe,be);let pe="?";U.has(`${oe}-${be}`)?pe="P":G.has(`${oe}-${be}`)?pe="C":de===P.AIR?pe=".":de===P.WATER?pe="~":de===P.SAND?pe="S":de===P.GRASS?pe="G":pe="#",X&&oe===t.index&&(pe=pe==="."?"@":pe.toUpperCase()),he.push(pe)}console.log(he.join("	"))}if(console.log(""),A&&(A.torches.length>0||A.furnaces.length>0||A.electricFurnaces.length>0||A.electronicsWorkbenches.length>0||A.storageChests.length>0||A.steamEngines.length>0||A.hydroGenerators.length>0||A.copperPipes.length>0||A.cables.length>0)){console.log("=== Tech Blocks in Area ==="),A.torches.length>0&&console.log(`Torches: ${A.torches.map(X=>`T${X.tileIndex}`).join(", ")}`),A.furnaces.length>0&&console.log(`Furnaces: ${A.furnaces.map(X=>`T${X.tileIndex}`).join(", ")}`),A.electricFurnaces.length>0&&console.log(`Electric Furnaces: ${A.electricFurnaces.map(X=>`T${X.tileIndex}`).join(", ")}`),A.electronicsWorkbenches.length>0&&console.log(`Electronics Workbenches: ${A.electronicsWorkbenches.map(X=>`T${X.tileIndex}`).join(", ")}`),A.storageChests.length>0&&console.log(`Storage Chests: ${A.storageChests.map(X=>`T${X.tileIndex}`).join(", ")}`),A.steamEngines.length>0&&console.log(`Steam Engines: ${A.steamEngines.map(X=>`T${X.tileIndex}`).join(", ")}`),A.hydroGenerators.length>0&&console.log(`Hydro Generators: ${A.hydroGenerators.map(X=>`T${X.tileIndex}`).join(", ")}`),A.copperPipes.length>0&&console.log(`Copper Pipes: ${A.copperPipes.map(X=>`T${X.tileIndex}@d${X.depth}`).join(", ")}`),A.cables.length>0&&console.log(`Cables: ${A.cables.map(X=>`T${X.tileIndex}@d${X.depth}`).join(", ")}`);const Pe=new Set(A.cables.map(X=>X.tileIndex)),j=[...A.electricFurnaces.map(X=>({type:"E-Furnace",tileIndex:X.tileIndex})),...A.electronicsWorkbenches.map(X=>({type:"E-Workbench",tileIndex:X.tileIndex}))];if(j.length>0&&A.cables.length>0){console.log("--- Cable Connections ---");for(const X of j){const he=this.currentPlanet.getPolyhedron().tiles[X.tileIndex];if(he){const oe=he.neighbors,de=oe.filter(Je=>Pe.has(Je)),pe=Pe.has(X.tileIndex);pe||de.length>0?console.log(`  ${X.type} T${X.tileIndex}: connected via ${pe?"same tile":""} ${de.map(Je=>`T${Je}`).join(", ")}`):console.log(`  ${X.type} T${X.tileIndex}: NOT CONNECTED (neighbors: ${oe.slice(0,6).map(Je=>`T${Je}`).join(", ")})`)}}}console.log("")}const z=this.currentPlanet.depthToRadius(s);console.log(`Current ground depth: ${s} (r${z.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const $=this.currentPlanet.getPolyhedron().tiles[t.index];if($)for(const be of $.neighbors){const Pe=this.currentPlanet.getPolyhedron().tiles[be];if(!Pe)continue;const j=[];for(let pe=0;pe<rt-1;pe++){const Je=pe<rt-1?this.currentPlanet.getBlock(be,pe+1):P.AIR,Be=this.currentPlanet.getBlock(be,pe),et=Je===P.AIR||Je===P.WATER,F=Be!==P.AIR&&Be!==P.WATER;et&&F&&j.push(pe)}const X=new R(Pe.center.x,Pe.center.y,Pe.center.z).normalize().multiplyScalar(this.currentPlanet.radius),he=this.checkStepHeight(X),oe=this.checkHeadroomCollision(X),de=this.checkWallCollision(X);console.log(`  T${be}: floors=[${j.join(",")}] step=${he} headroom=${oe} wall=${de}`)}const W=this.localForward.clone().negate(),ee=this.position.clone().addScaledVector(W,.5),q=this.currentPlanet.getTileAtPoint(ee);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${W.x.toFixed(2)}, ${W.y.toFixed(2)}, ${W.z.toFixed(2)})`),console.log(`  Test position tile: ${q?q.index:"none"} (same=${(q==null?void 0:q.index)===t.index})`);const ne=this.checkCollision(ee),te=this.checkStepHeight(ee),xe=this.checkHeadroomCollision(ee),ze=this.checkWallCollision(ee);console.log(`  checkCollision: ${ne}, step=${te}, headroom=${xe}, wall=${ze}`);const He=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(W,2));if(He&&He.index!==t.index){console.log(`  Forward tile (2 units ahead): ${He.index}`);const be=this.currentPlanet.getPolyhedron().tiles[He.index];if(be){const Pe=[];for(let de=0;de<rt-1;de++){const pe=de<rt-1?this.currentPlanet.getBlock(He.index,de+1):P.AIR,Je=this.currentPlanet.getBlock(He.index,de),Be=pe===P.AIR||pe===P.WATER,et=Je!==P.AIR&&Je!==P.WATER;Be&&et&&Pe.push(de)}const j=new R(be.center.x,be.center.y,be.center.z).normalize().multiplyScalar(this.currentPlanet.radius),X=this.checkStepHeight(j),he=this.checkHeadroomCollision(j),oe=this.checkWallCollision(j);console.log(`  T${He.index} (center): floors=[${Pe.join(",")}] step=${X} headroom=${he} wall=${oe}`)}}console.log("==============================================")}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const s=Math.min(1,N.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,s).normalize(),this.localRight=new R().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new R().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal()}handleTransitionMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=N.INVERT_Y_AXIS?-1:1,i=e.mouseY*N.MOUSE_SENSITIVITY*n,s=-e.mouseX*N.MOUSE_SENSITIVITY;if(this.currentPlanet){const a=this.currentPlanet.getSurfaceNormal(this.position),l=new je().setFromAxisAngle(a,s);this.orientation.premultiply(l)}const r=new je().setFromAxisAngle(this.localRight,i);this.orientation.premultiply(r),this.updateLocalFromOrientation()}syncSurfaceStateFromOrientation(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=new R(0,0,-1).applyQuaternion(this.orientation);this.surfaceForward.copy(t),this.surfaceForward.sub(e.clone().multiplyScalar(t.dot(e))),this.surfaceForward.lengthSq()<.001&&(this.surfaceForward.copy(this.localForward).negate(),this.surfaceForward.sub(e.clone().multiplyScalar(this.surfaceForward.dot(e)))),this.surfaceForward.normalize();const n=Math.asin(Math.max(-1,Math.min(1,t.dot(e))));this.surfacePitch=n}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=N.INVERT_Y_AXIS?-1:1;let i=e.mouseY*N.MOUSE_SENSITIVITY*n;const s=-e.mouseX*N.MOUSE_SENSITIVITY;if(!this.isInSpace&&this.currentPlanet){const r=this.currentPlanet.getSurfaceNormal(this.position),a=89.9*Math.PI/180;this.surfacePitch=(this.surfacePitch||0)+i,this.surfacePitch=Math.max(-a,Math.min(a,this.surfacePitch));let l=this.surfaceForward.clone();if(l.sub(r.clone().multiplyScalar(l.dot(r))),l.lengthSq()<.001&&(l=new R(0,0,-1),l.sub(r.clone().multiplyScalar(l.dot(r))),l.lengthSq()<.001&&(l=new R(1,0,0),l.sub(r.clone().multiplyScalar(l.dot(r))))),l.normalize(),s!==0){const x=new je().setFromAxisAngle(r,s);l.applyQuaternion(x)}this.surfaceForward.copy(l);const c=new R().crossVectors(r,l).normalize(),h=new je().setFromAxisAngle(c,-this.surfacePitch),d=l.clone().applyQuaternion(h),u=r.clone().applyQuaternion(h),f=new R(0,0,0),p=d.clone(),m=new pt().lookAt(f,p,u);this.orientation.setFromRotationMatrix(m)}else{const r=new je().setFromAxisAngle(this.localUp,s);this.orientation.premultiply(r);const a=new je().setFromAxisAngle(this.localRight,i);this.orientation.premultiply(a)}this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=N.ROLL_SPEED*t),e.rollRight&&(n-=N.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),s=new je().setFromAxisAngle(i,n);this.orientation.premultiply(s),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new R,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const s=e.sprint?N.SPRINT_SPEED:N.SPACE_THRUST;this.velocity.addScaledVector(n,s*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,N.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const s=this.position.clone().addScaledVector(n,N.WATER_BODY_CHECK_HEIGHT),r=this.currentPlanet.isInWater(s);this.feetInWater=this.currentPlanet.isInWater(this.position);const a=new R;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new R().crossVectors(l,n).normalize();if(e.forward&&a.add(l),e.backward&&a.sub(l),e.left&&a.sub(c),e.right&&a.add(c),a.lengthSq()>0){a.normalize();let u=e.sprint?N.SPRINT_SPEED:N.WALK_SPEED*N.WALK_SPEED_MULTIPLIER;r&&(u*=N.WATER_MOVEMENT_MULTIPLIER);const f=a.clone().multiplyScalar(u*t);this.resolveMovement(f)}const d=this.velocity.dot(n)>N.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!d){const u=this.currentPlanet.getWaterSurfaceRadius(this.position),f=this.position.distanceTo(this.currentPlanet.center),p=u+N.WATER_SURFACE_FLOAT_HEIGHT,m=f-p;if(u>0&&m<=.3)if(m>=-.1){this.isFloatingAtSurface=!0;const x=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(x))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,N.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(console.log(`Jump pressed! isGrounded=${this.isGrounded}, feetInWater=${this.feetInWater}`),this.isGrounded){const u=n,f=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(f));let p=N.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(p=N.JUMP_FORCE*N.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(u,p),console.log(`After jump: velocity=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)}), jumpForce=${p}`),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const m=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:m.theta,phi:m.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),s=this.position.clone().add(n);if(this.checkCollision(s)){const r=this.position.clone().add(i);this.checkCollision(r)||this.position.copy(r)}else{this.position.copy(s);const r=this.position.clone().add(i);this.checkCollision(r)||this.position.copy(r)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPointFast(this.position),n=this.currentPlanet.getTileAtPointFast(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPointFast(e);if(!t)return!0;const n=this.currentPlanet.getDepthAtPoint(this.position),i=this.currentPlanet.depthToRadius(n);let s=!1,r=!1;for(let a=0;a<rt-1;a++){const l=a<rt-1?St(this.currentPlanet,t.index,a+1):P.AIR,c=St(this.currentPlanet,t.index,a),h=l===P.AIR||l===P.WATER,d=c!==P.AIR&&c!==P.WATER;if(h&&d&&(s=!0,this.currentPlanet.depthToRadius(a)-i<=N.AUTO_STEP_HEIGHT)){r=!0;break}}return s?r:!0}checkWallCollision(e,t=!1){if(!this.currentPlanet)return!1;const n=this.currentPlanet.getTileAtPointFast(e);if(!n)return!1;const i=this.currentPlanet.getTileAtPointFast(this.position),s=i?i.index:-1;let r,a;if(this.isGrounded){const f=this.position.distanceTo(this.currentPlanet.center),p=this.currentPlanet.getTileAtPointFast(this.position);let m=-1;if(p&&(m=Wi(this.currentPlanet,p.index,f)),m<0)r=e.distanceTo(this.currentPlanet.center),a=r+N.PLAYER_HEIGHT;else{const x=this.currentPlanet.depthToRadius(m);let g=-1,v=1/0;for(let _=0;_<rt-1;_++){const C=_<rt-1?St(this.currentPlanet,n.index,_+1):P.AIR,S=St(this.currentPlanet,n.index,_),b=C===P.AIR||C===P.WATER,w=S!==P.AIR&&S!==P.WATER;if(b&&w){const E=this.currentPlanet.depthToRadius(_)-x;E<=N.AUTO_STEP_HEIGHT&&Math.abs(E)<Math.abs(v)&&(g=_,v=E)}}if(g>=0){const _=this.currentPlanet.depthToRadius(g);r=_,a=_+N.PLAYER_HEIGHT}else r=e.distanceTo(this.currentPlanet.center),a=r+N.PLAYER_HEIGHT}}else r=e.distanceTo(this.currentPlanet.center),a=r+N.PLAYER_HEIGHT;const l=this.currentPlanet.getSurfaceNormal(e),c=[n.index];if(!t){const f=this.currentPlanet.getPolyhedron().tiles[n.index];if(f)for(const p of f.neighbors){const m=this.currentPlanet.getPolyhedron().tiles[p];if(m){const g=new R(m.center.x,m.center.y,m.center.z).add(this.currentPlanet.center).clone().sub(e),v=g.dot(l);g.clone().sub(l.clone().multiplyScalar(v)).length()<N.PLAYER_RADIUS+1&&c.push(p)}}}const h=this.currentPlanet.radius*.02;let d=r;if(i){const f=Wi(this.currentPlanet,s,this.position.distanceTo(this.currentPlanet.center));f>=0&&(d=this.currentPlanet.depthToRadius(f))}const u=Math.max(d,r)+N.AUTO_STEP_HEIGHT;for(const f of c){if(f===s)continue;const p=this.currentPlanet.getPolyhedron().tiles[f];if(!p)continue;let m=-1;for(let S=rt-2;S>=0;S--){const b=St(this.currentPlanet,f,S+1),w=St(this.currentPlanet,f,S);if((b===P.AIR||b===P.WATER)&&w!==P.AIR&&w!==P.WATER){m=S;break}}if(m>=0&&this.currentPlanet.depthToRadius(m)<=u)continue;const g=new R(p.center.x,p.center.y,p.center.z).add(this.currentPlanet.center).clone().sub(e),v=g.dot(l),_=g.clone().sub(l.clone().multiplyScalar(v)).length(),C=Math.max(0,_-h);for(let S=0;S<rt;S++){const b=St(this.currentPlanet,f,S);if(b===P.AIR||b===P.WATER)continue;const w=this.currentPlanet.depthToRadius(S),O=w-1;if(w<=u)continue;if(O<a&&w>r){const T=Math.abs(w-r)<.1;if(this.isGrounded&&f===n.index&&T)continue;if(C<N.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPointFast(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPointFast(this.position);let s=-1;if(i&&(s=Wi(this.currentPlanet,i.index,n)),s<0)return!1;const r=this.currentPlanet.depthToRadius(s);let a=-1,l=1/0;for(let u=0;u<rt-1;u++){const f=u<rt-1?St(this.currentPlanet,t.index,u+1):P.AIR,p=St(this.currentPlanet,t.index,u),m=f===P.AIR||f===P.WATER,x=p!==P.AIR&&p!==P.WATER;if(m&&x){const v=this.currentPlanet.depthToRadius(u)-r;v<=N.AUTO_STEP_HEIGHT&&Math.abs(v)<Math.abs(l)&&(a=u,l=v)}}if(a<0)return!1;const c=this.currentPlanet.depthToRadius(a),h=c,d=c+N.PLAYER_HEIGHT;for(let u=0;u<rt;u++){const f=St(this.currentPlanet,t.index,u);if(f===P.AIR||f===P.WATER)continue;const p=this.currentPlanet.depthToRadius(u),m=p-1;if(p>h&&m<d){if(u===a)continue;return!0}}return!1}isPositionValid(e,t=!1){if(!this.currentPlanet)return!0;const n=this.currentPlanet.getSurfaceNormal(e),i=e.distanceTo(this.currentPlanet.center),s=this.currentPlanet.getTileAtPoint(e);if(s){let l=-1;for(let c=0;c<rt;c++){const h=St(this.currentPlanet,s.index,c);if(h!==P.AIR&&h!==P.WATER){l=c;break}}if(l>=0){const c=this.currentPlanet.depthToRadius(l)-1;if(i<c)return console.log(`isPositionValid BLOCKED by floor: feetR=${i.toFixed(2)}, floorR=${c.toFixed(2)}, floorD=${l}`),!1}}const r=[.1,N.PLAYER_HEIGHT*.5,N.PLAYER_HEIGHT],a=s;for(const l of r){const c=i+l;let h,d;if(t&&a){h=a;for(let f=0;f<rt;f++){const p=this.currentPlanet.depthToRadius(f);if(c<=p){d=f;break}}d=d??rt-1}else{const f=this.currentPlanet.center.clone().add(n.clone().multiplyScalar(c));if(h=this.currentPlanet.getTileAtPoint(f),!h)continue;d=this.currentPlanet.getDepthAtPoint(f)}if(d<0||d>=rt)continue;const u=St(this.currentPlanet,h.index,d);if(u!==P.AIR&&u!==P.WATER){const f=this.currentPlanet.depthToRadius(d);if(c<f)return console.log(`isPositionValid BLOCKED: offset=${l.toFixed(2)}, checkR=${c.toFixed(2)}, depth=${d}, blockTopR=${f.toFixed(2)}, block=${u}, tile=${h.index}`),!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPointFast(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+N.PLAYER_HEIGHT,s=[];for(let f=0;f<rt;f++){const p=f<rt-1?St(this.currentPlanet,t.index,f+1):P.AIR,m=St(this.currentPlanet,t.index,f),x=p===P.AIR||p===P.WATER,g=m!==P.AIR&&m!==P.WATER;if(x&&g){const v=this.currentPlanet.depthToRadius(f);s.push({depth:f,radius:v})}}if(s.length===0)return;let r=s[0],a=Math.abs(n-r.radius);for(const f of s){const p=Math.abs(n-f.radius);p<a&&(a=p,r=f)}const l=r.radius,c=l+N.PLAYER_HEIGHT;let h=!0;for(let f=0;f<rt;f++){const p=St(this.currentPlanet,t.index,f);if(p===P.AIR||p===P.WATER)continue;const m=this.currentPlanet.depthToRadius(f),x=m-1;if(f!==r.depth&&m>l&&x<c){h=!1;break}}if(!h)return;let d=!1;for(let f=0;f<rt;f++){const p=St(this.currentPlanet,t.index,f);if(p===P.AIR||p===P.WATER)continue;const m=this.currentPlanet.depthToRadius(f),x=m-1;if(m>n&&x<i){if(Math.abs(m-n)<.2)continue;d=!0;break}}if(!d)return;const u=r.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,u),this.isInWater){const f=this.velocity.dot(e);f<0&&this.velocity.sub(e.clone().multiplyScalar(f))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,N.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPointFast(this.position);let s=-1;i&&(s=Wi(this.currentPlanet,i.index,n));const r=s>=0?this.currentPlanet.depthToRadius(s):0,a=r;if(s>=0&&n<=a+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,a),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const h=this.getGravityMultiplier();let d=N.BASE_GRAVITY*h;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?d=0:d*=N.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-N.WATER_DRAG*e)),d>0&&this.velocity.addScaledVector(c,d*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const f=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),p=f.distanceTo(this.currentPlanet.center),m=this.currentPlanet.getTileAtPointFast(f);let x=-1,g=1/0;if(m)for(let b=0;b<rt-1;b++){const w=b<rt-1?St(this.currentPlanet,m.index,b+1):P.AIR,O=St(this.currentPlanet,m.index,b),E=w===P.AIR||w===P.WATER,T=O!==P.AIR&&O!==P.WATER;if(E&&T){const U=this.currentPlanet.depthToRadius(b)-r;U<=N.AUTO_STEP_HEIGHT&&Math.abs(U)<Math.abs(g)&&(x=b,g=U)}}const v=x>=0?this.currentPlanet.depthToRadius(x):0,_=v,C=v-r,S=!this.isInWater&&C>N.AUTO_STEP_HEIGHT;if(x>=0&&p<=_)if(S){const b=this.velocity.dot(t);b<0&&this.velocity.sub(t.clone().multiplyScalar(b)),this.velocity.multiplyScalar(.5)}else{const b=f.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(b,_);const w=this.velocity.dot(b);w<0&&this.velocity.sub(b.clone().multiplyScalar(w)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const b=this.isPositionValid(f),w=this.checkWallCollision(f);if(b&&!w)this.position.copy(f);else{const O=t.clone().multiplyScalar(this.velocity.dot(t)),E=this.velocity.clone().sub(O),T=O.clone().multiplyScalar(e),A=this.position.clone().add(T),U=this.velocity.dot(t)>0;let G;if(U){const z=this.isPositionValid(A,!0),$=this.checkWallCollision(A,!0);if(G=z&&!$,!G){const W=A.distanceTo(this.currentPlanet.center),ee=W+N.PLAYER_HEIGHT;console.log(`Jump blocked: posValid=${z}, wallBlock=${$}, newFeetR=${W.toFixed(2)}, newHeadR=${ee.toFixed(2)}`)}}else if(G=!this.checkWallCollision(A,!0),G){const z=this.currentPlanet.getTileAtPoint(A);if(z){const $=A.distanceTo(this.currentPlanet.center),W=this.currentPlanet.getDepthAtPoint(A);if(W>=0&&W<rt){const ee=St(this.currentPlanet,z.index,W);if(ee!==P.AIR&&ee!==P.WATER){const q=this.currentPlanet.depthToRadius(W);$<q&&(G=!1)}}}}if(G)this.position.copy(A),U||this.checkEdgeNudge();else{const z=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(z))}if(E.lengthSq()>.001){const z=E.clone().multiplyScalar(e),$=this.position.clone().add(z);this.isPositionValid($)&&!this.checkWallCollision($)?this.position.copy($):this.velocity.sub(E.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(N.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),s=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(s)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let s="";this.isInSpace?s=" [SPACE FLIGHT]":this.transitionTimer>0?s=" [ENTERING GRAVITY]":this.isJetpacking?s=" [JETPACK]":this.isGrounded||(s=" [AIRBORNE]");const r=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${r} | Grav: ${(i*100).toFixed(0)}%${s}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getCoordinatesAtPoint(this.position),i=n.lat>=0?"N":"S",s=n.lon>=0?"E":"W";t.textContent=`${Math.abs(n.lat).toFixed(1)}°${i} ${Math.abs(n.lon).toFixed(1)}°${s} D:${n.depth}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}setTechBlockDataCallback(e){this.getTechBlockDataCallback=e}exportForSave(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},orientation:{x:this.orientation.x,y:this.orientation.y,z:this.orientation.z,w:this.orientation.w},velocity:{x:this.velocity.x,y:this.velocity.y,z:this.velocity.z}}}importFromSave(e){this.position.set(e.position.x,e.position.y,e.position.z),this.orientation.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w),this.velocity.set(e.velocity.x,e.velocity.y,e.velocity.z),this.updateLocalFromOrientation()}}var L=(o=>(o[o.NONE=0]="NONE",o[o.STONE=1]="STONE",o[o.DIRT=2]="DIRT",o[o.GRASS=3]="GRASS",o[o.WOOD=4]="WOOD",o[o.LEAVES=5]="LEAVES",o[o.LOG=6]="LOG",o[o.SAND=7]="SAND",o[o.ORE_COAL=8]="ORE_COAL",o[o.ORE_COPPER=9]="ORE_COPPER",o[o.ORE_IRON=10]="ORE_IRON",o[o.ORE_GOLD=11]="ORE_GOLD",o[o.ORE_LITHIUM=12]="ORE_LITHIUM",o[o.ORE_ALUMINUM=13]="ORE_ALUMINUM",o[o.ORE_COBALT=14]="ORE_COBALT",o[o.STICK=15]="STICK",o[o.COAL=16]="COAL",o[o.TORCH=17]="TORCH",o[o.FISHING_ROD=18]="FISHING_ROD",o[o.SNOW=19]="SNOW",o[o.ICE=20]="ICE",o[o.FURNACE=21]="FURNACE",o[o.INGOT_COPPER=22]="INGOT_COPPER",o[o.INGOT_IRON=23]="INGOT_IRON",o[o.INGOT_GOLD=24]="INGOT_GOLD",o[o.INGOT_ALUMINUM=25]="INGOT_ALUMINUM",o[o.STORAGE_CHEST=26]="STORAGE_CHEST",o[o.STEAM_ENGINE=27]="STEAM_ENGINE",o[o.HYDRO_GENERATOR=28]="HYDRO_GENERATOR",o[o.COPPER_PIPE=29]="COPPER_PIPE",o[o.ELECTRIC_FURNACE=30]="ELECTRIC_FURNACE",o[o.CABLE=31]="CABLE",o[o.INGOT_LITHIUM=32]="INGOT_LITHIUM",o[o.INGOT_COBALT=33]="INGOT_COBALT",o[o.ELECTRONICS_WORKBENCH=34]="ELECTRONICS_WORKBENCH",o[o.CPU_CHIP=35]="CPU_CHIP",o[o.RAM_MODULE=36]="RAM_MODULE",o[o.MOTHERBOARD=37]="MOTHERBOARD",o))(L||{});const ot={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2},7:{name:"Sand",stackSize:64,texture:"/textures/sand.png",mineTime:.5},8:{name:"Coal Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_coal.png",mineTime:2},9:{name:"Copper Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_copper.png",mineTime:2},10:{name:"Iron Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_iron.png",mineTime:2.5},11:{name:"Gold Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_gold.png",mineTime:3},12:{name:"Lithium Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_lythium.png",mineTime:3},13:{name:"Aluminum Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_aluminum.png",mineTime:2},14:{name:"Cobalt Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_cobalt.png",mineTime:2.5},15:{name:"Stick",stackSize:64,texture:"/textures/sticks.png",mineTime:.3},16:{name:"Coal",stackSize:64,texture:"/textures/coal.png",mineTime:.3},17:{name:"Torch",stackSize:64,texture:"/textures/torch_sprite.png",mineTime:.3},18:{name:"Fishing Rod",stackSize:1,texture:"/textures/fishing_rod.png",mineTime:.3},19:{name:"Snow",stackSize:64,texture:"/textures/snow.png",mineTime:.5},20:{name:"Ice",stackSize:64,texture:"/textures/ice.png",mineTime:.5},21:{name:"Furnace",stackSize:8,texture:"/textures/technology/furnace_face.png",mineTime:2},22:{name:"Copper Ingot",stackSize:64,texture:"/textures/minerals/earth/copper.png",mineTime:.3},23:{name:"Iron Ingot",stackSize:64,texture:"/textures/minerals/earth/iron.png",mineTime:.3},24:{name:"Gold Ingot",stackSize:64,texture:"/textures/minerals/earth/gold.png",mineTime:.3},25:{name:"Aluminum Ingot",stackSize:64,texture:"/textures/minerals/earth/aluminum.png",mineTime:.3},26:{name:"Storage Chest",stackSize:8,texture:"/textures/technology/storage_face.png",mineTime:1.5},27:{name:"Steam Engine",stackSize:8,texture:"/textures/technology/steam_engine_face.png",mineTime:2.5},28:{name:"Hydro Generator",stackSize:8,texture:"/textures/technology/hydro_generator_face.png",mineTime:2.5},29:{name:"Copper Pipe",stackSize:64,texture:"/textures/technology/copper_pipe.png",mineTime:.5},30:{name:"Electric Furnace",stackSize:8,texture:"/textures/technology/electric_furnace_face.png",mineTime:2.5},31:{name:"Cable",stackSize:64,texture:"/textures/technology/cable.png",mineTime:.5},32:{name:"Lithium Ingot",stackSize:64,texture:"/textures/minerals/earth/lythium.png",mineTime:.3},33:{name:"Cobalt Ingot",stackSize:64,texture:"/textures/minerals/earth/cobalt.png",mineTime:.3},34:{name:"Electronics Workbench",stackSize:8,texture:"/textures/technology/electronics_workbench_face.png",mineTime:2.5},35:{name:"CPU Chip",stackSize:64,texture:"/textures/technology/cpu_chip.png",mineTime:.3},36:{name:"RAM Module",stackSize:64,texture:"/textures/technology/ram_module.png",mineTime:.3},37:{name:"Motherboard",stackSize:64,texture:"/textures/technology/motherboard.png",mineTime:.3}};class Jm{constructor(){y(this,"slots");y(this,"selectedSlot",0);y(this,"hotbarSize",9);y(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=ot[e];let i=t;for(let s=0;s<this.totalSlots&&i>0;s++){const r=this.slots[s];if(r.itemType===e&&r.quantity<n.stackSize){const a=Math.min(i,n.stackSize-r.quantity);r.quantity+=a,i-=a}}for(let s=0;s<this.totalSlots&&i>0;s++){const r=this.slots[s];if(r.itemType===0){const a=Math.min(i,n.stackSize);r.itemType=e,r.quantity=a,i-=a}}return i}setSlot(e,t,n){e<0||e>=this.totalSlots||(this.slots[e].itemType=t,this.slots[e].quantity=n,n<=0&&(this.slots[e].itemType=0,this.slots[e].quantity=0))}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let s=this.totalSlots-1;s>=0&&n>0;s--){const r=this.slots[s];if(r.itemType===e){const a=Math.min(n,r.quantity);r.quantity-=a,n-=a,i+=a,r.quantity===0&&(r.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}swapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n={...this.slots[e]};this.slots[e]={...this.slots[t]},this.slots[t]=n}mergeOrSwapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n=this.slots[e],i=this.slots[t],s=64;if(i.itemType===0){this.slots[t]={...n},this.slots[e]={itemType:0,quantity:0};return}if(n.itemType===0)return;if(n.itemType===i.itemType){const a=n.quantity+i.quantity;a<=s?(this.slots[t].quantity=a,this.slots[e]={itemType:0,quantity:0}):(this.slots[t].quantity=s,this.slots[e].quantity=a-s);return}const r={...n};this.slots[e]={...i},this.slots[t]=r}getSlot(e){return e<0||e>=this.totalSlots?null:this.slots[e]}exportForSave(){return this.slots.map(e=>({itemType:e.itemType,quantity:e.quantity}))}importFromSave(e){for(let t=0;t<Math.min(e.length,this.totalSlots);t++)this.slots[t]={itemType:e[t].itemType,quantity:e[t].quantity}}}function Jl(o,e=!1){const t=o[0].index!==null,n=new Set(Object.keys(o[0].attributes)),i=new Set(Object.keys(o[0].morphAttributes)),s={},r={},a=o[0].morphTargetsRelative,l=new mt;let c=0;for(let h=0;h<o.length;++h){const d=o[h];let u=0;if(t!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in d.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;s[f]===void 0&&(s[f]=[]),s[f].push(d.attributes[f]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in d.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;r[f]===void 0&&(r[f]=[]),r[f].push(d.morphAttributes[f])}if(e){let f;if(t)f=d.index.count;else if(d.attributes.position!==void 0)f=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,h),c+=f}}if(t){let h=0;const d=[];for(let u=0;u<o.length;++u){const f=o[u].index;for(let p=0;p<f.count;++p)d.push(f.getX(p)+h);h+=o[u].attributes.position.count}l.setIndex(d)}for(const h in s){const d=gl(s[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,d)}for(const h in r){const d=r[h][0].length;if(d===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<d;++u){const f=[];for(let m=0;m<r[h].length;++m)f.push(r[h][m][u]);const p=gl(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(p)}}return l}function gl(o){let e,t,n,i=-1,s=0;for(let c=0;c<o.length;++c){const h=o[c];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;s+=h.count*t}const r=new e(s),a=new Tt(r,t,n);let l=0;for(let c=0;c<o.length;++c){const h=o[c];if(h.isInterleavedBufferAttribute){const d=l/t;for(let u=0,f=h.count;u<f;u++)for(let p=0;p<t;p++){const m=h.getComponent(u,p);a.setComponent(u+d,p,m)}}else r.set(h.array,l);l+=h.count*t}return i!==void 0&&(a.gpuType=i),a}var Zm=`uniform float time;\r
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
}`,Qm=`varying vec3 vColor;

void main() {\r
  gl_FragColor = vec4(vColor, 1.0);\r
}`;const tt={LIGHT_COLOR:16755268,get LIGHT_INTENSITY(){return N.TORCH_LIGHT_INTENSITY},get LIGHT_RANGE(){return N.TORCH_LIGHT_RANGE},LIGHT_DECAY:2,get FLICKER_SPEED(){return N.TORCH_FLICKER_SPEED},get FLICKER_AMOUNT(){return N.TORCH_FLICKER_AMOUNT},HANDLE_HEIGHT:.4,HANDLE_RADIUS:.03,HEAD_RADIUS:.06,HEAD_HEIGHT:.1,FLAME_HEIGHT:.15,FLAME_RADIUS:.05,HELD_OFFSET:new R(.25,-.2,-.4),HELD_ROTATION:new en(-.3,.2,.1)};let Yi=null;function eg(){return Yi||(Yi=new qe({uniforms:{time:{value:0},flickerAmount:{value:.15}},vertexShader:Zm,fragmentShader:Qm,vertexColors:!0})),Yi}function Zl(o){Yi&&(Yi.uniforms.time.value=o)}function Ql(){const o=new Gt,e=new Ri(tt.HANDLE_RADIUS,tt.HANDLE_RADIUS,tt.HANDLE_HEIGHT,8);e.translate(0,tt.HANDLE_HEIGHT/2,0);const t=new Ri(tt.HEAD_RADIUS,tt.HEAD_RADIUS*.8,tt.HEAD_HEIGHT,8);t.translate(0,tt.HANDLE_HEIGHT+tt.HEAD_HEIGHT/2,0);const n=new Qs(tt.FLAME_RADIUS,tt.FLAME_HEIGHT,8);n.translate(0,tt.HANDLE_HEIGHT+tt.HEAD_HEIGHT+tt.FLAME_HEIGHT/2,0);const i=new Ne(9127187),s=new Ne(3355443),r=new Ne(tt.LIGHT_COLOR);zr(e,i),zr(t,s),zr(n,r),Hr(e,0),Hr(t,0),Hr(n,1);const a=Jl([e,t,n]),l=eg(),c=new Ce(a,l);return c.name="torchMesh",o.add(c),e.dispose(),t.dispose(),n.dispose(),o}function zr(o,e){const t=o.attributes.position.count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;o.setAttribute("color",new Tt(n,3))}function Hr(o,e){const t=o.attributes.position.count,n=new Float32Array(t);for(let i=0;i<t;i++)n[i]=e;o.setAttribute("animWeight",new Tt(n,1))}class tg{constructor(e,t){y(this,"torchGroup");y(this,"pointLight");y(this,"camera");y(this,"isVisible",!1);y(this,"flickerTime",0);y(this,"baseIntensity");this.camera=e,this.baseIntensity=tt.LIGHT_INTENSITY,this.torchGroup=Ql(),this.torchGroup.visible=!1,this.torchGroup.position.copy(tt.HELD_OFFSET),this.torchGroup.rotation.copy(tt.HELD_ROTATION),this.pointLight=new kh(tt.LIGHT_COLOR,0,tt.LIGHT_RANGE,tt.LIGHT_DECAY),e.add(this.torchGroup),e.add(this.pointLight);const n=tt.HELD_OFFSET.y+tt.HANDLE_HEIGHT+tt.HEAD_HEIGHT+tt.FLAME_HEIGHT;this.pointLight.position.set(tt.HELD_OFFSET.x,n,tt.HELD_OFFSET.z)}setVisible(e){this.isVisible=e,this.torchGroup.visible=e,this.pointLight.intensity=e?this.baseIntensity:0}update(e){if(!this.isVisible)return;this.flickerTime+=e*tt.FLICKER_SPEED;const t=Math.sin(this.flickerTime)*Math.sin(this.flickerTime*2.3)*Math.sin(this.flickerTime*.7);this.pointLight.intensity=this.baseIntensity*(1+t*tt.FLICKER_AMOUNT),Zl(this.flickerTime)}dispose(){this.camera.remove(this.torchGroup),this.camera.remove(this.pointLight),this.torchGroup.traverse(e=>{e instanceof Ce&&(e.geometry.dispose(),e.material instanceof xn&&e.material.dispose())}),this.pointLight.dispose()}}class ng{constructor(e){y(this,"scene");y(this,"placedTorches",[]);y(this,"torchesByTile",new Map);y(this,"flickerTime",0);y(this,"torchLightData",new Map);this.scene=e}placeTorch(e,t,n){const i=Ql(),s=e.clone().sub(t).normalize(),r=new R(0,1,0),a=new je().setFromUnitVectors(r,s);i.quaternion.copy(a),i.position.copy(e);const l={group:i,tileIndex:n,position:e.clone(),flickerOffset:Math.random()*Math.PI*2};return this.scene.add(i),this.torchesByTile.has(n)||this.torchesByTile.set(n,[]),this.torchesByTile.get(n).push(l),this.placedTorches.push(l),l}removeTorch(e){const t=this.placedTorches.indexOf(e);if(t>=0){this.placedTorches.splice(t,1);const n=this.torchesByTile.get(e.tileIndex);if(n){const i=n.indexOf(e);i>=0&&n.splice(i,1)}this.scene.remove(e.group),e.group.traverse(i=>{i instanceof Ce&&(i.geometry.dispose(),i.material instanceof xn&&i.material.dispose())})}}update(e){this.flickerTime+=e*tt.FLICKER_SPEED,Zl(this.flickerTime)}updateVisibility(e){for(const[t,n]of this.torchesByTile){const i=e.has(t);for(const s of n)s.group.visible=i}}getTorchLightAt(e){let t=0;for(const n of this.placedTorches){const i=e.distanceTo(n.position);if(i<tt.LIGHT_RANGE){const s=1/(1+tt.LIGHT_DECAY*i*i/(tt.LIGHT_RANGE*tt.LIGHT_RANGE));t+=s}}return Math.min(1,t)}getTorchLightData(){return this.torchLightData}getPlacedTorches(){return this.placedTorches}getTorchDataForBaking(){return this.placedTorches.map(e=>{const t=tt.HANDLE_HEIGHT+tt.HEAD_HEIGHT+tt.FLAME_HEIGHT,n=e.position.clone().normalize();return{position:e.position.clone().add(n.multiplyScalar(t)),range:tt.LIGHT_RANGE,intensity:tt.LIGHT_INTENSITY}})}hasTorchOnTile(e){const t=this.torchesByTile.get(e);return t!==void 0&&t.length>0}getTilesWithTorches(){const e=new Set;for(const[t,n]of this.torchesByTile)n.length>0&&e.add(t);return e}getNearestTorchPositions(e,t=16){const n=this.placedTorches.map(i=>{const s=tt.HANDLE_HEIGHT+tt.HEAD_HEIGHT+tt.FLAME_HEIGHT,r=i.position.clone().normalize(),a=i.position.clone().add(r.multiplyScalar(s));return{position:a,distance:e.distanceTo(a)}});return n.sort((i,s)=>i.distance-s.distance),n.slice(0,t).map(i=>i.position)}getTorchMeshes(){const e=[];for(const t of this.placedTorches)t.group.traverse(n=>{n instanceof Ce&&e.push(n)});return e}dispose(){for(const e of[...this.placedTorches])this.removeTorch(e)}}var Rn=`uniform vec3 planetCenter;\r
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
}`,Pn=`precision highp float;

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
}`;const Hs=[{input:L.ORE_COPPER,output:L.INGOT_COPPER,outputQuantity:1},{input:L.ORE_IRON,output:L.INGOT_IRON,outputQuantity:1},{input:L.ORE_GOLD,output:L.INGOT_GOLD,outputQuantity:1},{input:L.ORE_ALUMINUM,output:L.INGOT_ALUMINUM,outputQuantity:1}];class ig{constructor(e,t,n){y(this,"scene");y(this,"furnaces",[]);y(this,"furnaceMeshes",[]);y(this,"textureLoader");y(this,"furnaceGeometry",null);y(this,"furnaceMaterial",null);y(this,"onSmeltCompleteCallback",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"FURNACE_SIZE",.8);y(this,"SMELT_TIME",10);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/furnace.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.furnaceGeometry=new Ht(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),r=new Ce(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));r.position.copy(l);const c=l.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(c.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(c,h).normalize();h.crossVectors(d,c).normalize();let u=0;if(i){const g=i.clone();g.sub(c.clone().multiplyScalar(g.dot(c))),g.normalize();const v=g.clone().negate();u=Math.atan2(v.dot(d),v.dot(h))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);u+=f;const p=new je;p.setFromUnitVectors(new R(0,1,0),c);const m=new je;m.setFromAxisAngle(c,u),r.quaternion.copy(m).multiply(p),r.userData.isFurnace=!0,r.userData.tileIndex=n,this.scene.add(r);const x={mesh:r,position:l.clone(),tileIndex:n,rotation:u,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(x),this.furnaceMeshes.push(r),x}async restoreFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),r=new Ce(this.furnaceGeometry,s);r.position.copy(e);const a=e.clone().sub(t).normalize(),l=new je;l.setFromUnitVectors(new R(0,1,0),a);const c=new je;c.setFromAxisAngle(a,i),r.quaternion.copy(c).multiply(l),r.userData.isFurnace=!0,r.userData.tileIndex=n,this.scene.add(r);const h={mesh:r,position:e.clone(),tileIndex:n,rotation:i,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(h),this.furnaceMeshes.push(r),h}removeFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getFurnaceMeshes(){return this.furnaceMeshes}getPlacedFurnaces(){return this.furnaces}getFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.fuelAmount>0&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=Hs.find(r=>r.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.fuelAmount--,n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,fuelAmount:e.fuelAmount,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}const Ws=27;class sg{constructor(e,t,n){y(this,"scene");y(this,"chests",[]);y(this,"chestMeshes",[]);y(this,"textureLoader");y(this,"chestGeometry",null);y(this,"chestMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"CHEST_SIZE",.8);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/storage_chest.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.chestGeometry=new Ht(this.CHEST_SIZE,this.CHEST_SIZE,this.CHEST_SIZE);const t=this.calculateFaceUVs(),n=this.chestGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.chestMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createEmptySlots(){const e=[];for(let t=0;t<Ws;t++)e.push({itemType:L.NONE,quantity:0});return e}async placeChest(e,t,n,i){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const s=this.chestMaterial.clone(),r=new Ce(this.chestGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.CHEST_SIZE/2));r.position.copy(l);const c=l.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(c.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(c,h).normalize();h.crossVectors(d,c).normalize();let u=0;if(i){const g=i.clone();g.sub(c.clone().multiplyScalar(g.dot(c))),g.normalize();const v=g.clone().negate();u=Math.atan2(v.dot(d),v.dot(h))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);u+=f;const p=new je;p.setFromUnitVectors(new R(0,1,0),c);const m=new je;m.setFromAxisAngle(c,u),r.quaternion.copy(m).multiply(p),r.userData.isStorageChest=!0,r.userData.tileIndex=n,this.scene.add(r);const x={mesh:r,position:l.clone(),tileIndex:n,rotation:u,slots:this.createEmptySlots()};return this.chests.push(x),this.chestMeshes.push(r),x}async restoreChest(e,t,n,i,s){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const r=this.chestMaterial.clone(),a=new Ce(this.chestGeometry,r);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new je;c.setFromUnitVectors(new R(0,1,0),l);const h=new je;h.setFromAxisAngle(l,i),a.quaternion.copy(h).multiply(c),a.userData.isStorageChest=!0,a.userData.tileIndex=n,this.scene.add(a);const d={mesh:a,position:e.clone(),tileIndex:n,rotation:i,slots:s||this.createEmptySlots()};return this.chests.push(d),this.chestMeshes.push(a),d}addItemsToChest(e,t,n){if(t===L.NONE)return n;const i=ot[t];let s=n;for(let r=0;r<Ws&&s>0;r++){const a=e.slots[r];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let r=0;r<Ws&&s>0;r++){const a=e.slots[r];if(a.itemType===L.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromChest(e){const t=[];for(const n of e.slots)n.itemType!==L.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}removeChest(e){const t=this.chests.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.chests.splice(t,1);const n=this.chestMeshes.indexOf(e.mesh);n!==-1&&this.chestMeshes.splice(n,1)}getChestMeshes(){return this.chestMeshes}getPlacedChests(){return this.chests}getChestByMesh(e){return this.chests.find(t=>t.mesh===e)}getChestAtTile(e){return this.chests.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.chests){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}exportForSave(){return this.chests.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}const Vs=27;class rg{constructor(e,t,n){y(this,"scene");y(this,"piles",[]);y(this,"pileMeshes",[]);y(this,"textureLoader");y(this,"pileGeometry",null);y(this,"pileMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"PILE_WIDTH",.7);y(this,"PILE_HEIGHT",.3);y(this,"PILE_DEPTH",.7);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((t,n)=>{this.textureLoader.load(ft("/textures/technology/garbage_pile.png"),t,void 0,n)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.pileGeometry=new Ht(this.PILE_WIDTH,this.PILE_HEIGHT,this.PILE_DEPTH),this.pileMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}createEmptySlots(){const e=[];for(let t=0;t<Vs;t++)e.push({itemType:L.NONE,quantity:0});return e}async placePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),r=new Ce(this.pileGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.PILE_HEIGHT/2));r.position.copy(l);const c=l.clone().sub(t).normalize(),h=new je;h.setFromUnitVectors(new R(0,1,0),c),r.quaternion.copy(h),r.userData.isGarbagePile=!0,r.userData.tileIndex=n,this.scene.add(r);const d={mesh:r,position:l.clone(),tileIndex:n,slots:this.createEmptySlots()};if(i)for(const u of i)this.addItemsToPile(d,u.itemType,u.quantity);return this.piles.push(d),this.pileMeshes.push(r),d}async restorePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),r=new Ce(this.pileGeometry,s);r.position.copy(e);const a=e.clone().sub(t).normalize(),l=new je;l.setFromUnitVectors(new R(0,1,0),a),r.quaternion.copy(l),r.userData.isGarbagePile=!0,r.userData.tileIndex=n,this.scene.add(r);const c={mesh:r,position:e.clone(),tileIndex:n,slots:i||this.createEmptySlots()};return this.piles.push(c),this.pileMeshes.push(r),c}addItemsToPile(e,t,n){if(t===L.NONE)return n;const i=ot[t];let s=n;for(let r=0;r<Vs&&s>0;r++){const a=e.slots[r];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let r=0;r<Vs&&s>0;r++){const a=e.slots[r];if(a.itemType===L.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromPile(e){const t=[];for(const n of e.slots)n.itemType!==L.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}isPileEmpty(e){return e.slots.every(t=>t.itemType===L.NONE||t.quantity===0)}removePile(e){const t=this.piles.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.piles.splice(t,1);const n=this.pileMeshes.indexOf(e.mesh);n!==-1&&this.pileMeshes.splice(n,1)}getPileMeshes(){return this.pileMeshes}getPlacedPiles(){return this.piles}getPileByMesh(e){return this.piles.find(t=>t.mesh===e)}getPileAtTile(e){return this.piles.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.piles){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}exportForSave(){return this.piles.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}var og=`uniform float time;\r
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
}`,ag=`uniform float time;

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
}`;class lg{constructor(e,t,n){y(this,"scene");y(this,"steamEngines",[]);y(this,"steamEngineMeshes",[]);y(this,"textureLoader");y(this,"steamEngineGeometry",null);y(this,"steamEngineMaterial",null);y(this,"steamParticleMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"STEAM_ENGINE_SIZE",.8);y(this,"MAX_PARTICLES_PER_ENGINE",30);y(this,"PARTICLE_SPAWN_RATE",8);y(this,"PARTICLE_LIFETIME",1.5);y(this,"PARTICLE_SPEED",.8);y(this,"PARTICLE_SPREAD",.15);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/steam_engine.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.steamEngineGeometry=new Ht(this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE);const t=this.calculateFaceUVs(),n=this.steamEngineGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.steamEngineMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn}),this.steamParticleMaterial=new qe({uniforms:{time:{value:0},particleSize:{value:12}},vertexShader:og,fragmentShader:ag,transparent:!0,depthWrite:!1,depthTest:!0,blending:ri})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),r=new Ce(this.steamEngineGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.STEAM_ENGINE_SIZE/2));r.position.copy(l);const c=l.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(c.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(c,h).normalize();h.crossVectors(d,c).normalize();let u=0;if(i){const g=i.clone();g.sub(c.clone().multiplyScalar(g.dot(c))),g.normalize();const v=g.clone().negate();u=Math.atan2(v.dot(d),v.dot(h))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);u+=f;const p=new je;p.setFromUnitVectors(new R(0,1,0),c);const m=new je;m.setFromAxisAngle(c,u),r.quaternion.copy(m).multiply(p),r.userData.isSteamEngine=!0,r.userData.tileIndex=n,this.scene.add(r);const x={mesh:r,position:l.clone(),tileIndex:n,rotation:u,steamParticles:[],steamMesh:null,steamGeometry:null,isRunning:!1,spawnAccumulator:0};return this.createSteamParticleSystem(x,t),this.steamEngines.push(x),this.steamEngineMeshes.push(r),x}async restoreSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),r=new Ce(this.steamEngineGeometry,s);r.position.copy(e);const a=e.clone().sub(t).normalize(),l=new je;l.setFromUnitVectors(new R(0,1,0),a);const c=new je;c.setFromAxisAngle(a,i),r.quaternion.copy(c).multiply(l),r.userData.isSteamEngine=!0,r.userData.tileIndex=n,this.scene.add(r);const h={mesh:r,position:e.clone(),tileIndex:n,rotation:i,steamParticles:[],steamMesh:null,steamGeometry:null,isRunning:!1,spawnAccumulator:0};return this.createSteamParticleSystem(h,t),this.steamEngines.push(h),this.steamEngineMeshes.push(r),h}removeSteamEngine(e){const t=this.steamEngines.indexOf(e);if(t===-1)return;e.steamMesh&&this.scene.remove(e.steamMesh),e.steamGeometry&&e.steamGeometry.dispose(),this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.steamEngines.splice(t,1);const n=this.steamEngineMeshes.indexOf(e.mesh);n!==-1&&this.steamEngineMeshes.splice(n,1)}getSteamEngineMeshes(){return this.steamEngineMeshes}getPlacedSteamEngines(){return this.steamEngines}getSteamEngineByMesh(e){return this.steamEngines.find(t=>t.mesh===e)}getSteamEngineAtTile(e){return this.steamEngines.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.steamEngines){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}exportForSave(){return this.steamEngines.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation}))}createSteamParticleSystem(e,t){if(!this.steamParticleMaterial)return;const n=new mt,i=new Float32Array(this.MAX_PARTICLES_PER_ENGINE*3),s=new Float32Array(this.MAX_PARTICLES_PER_ENGINE),r=new Float32Array(this.MAX_PARTICLES_PER_ENGINE),a=new Float32Array(this.MAX_PARTICLES_PER_ENGINE*3);for(let f=0;f<this.MAX_PARTICLES_PER_ENGINE;f++)s[f]=1,r[f]=Math.random();n.setAttribute("position",new Tt(i,3)),n.setAttribute("particleLife",new Tt(s,1)),n.setAttribute("particleSeed",new Tt(r,1)),n.setAttribute("particleVelocity",new Tt(a,3));const l=this.steamParticleMaterial.clone(),c=new Rh(n,l),h=e.position.clone().sub(t).normalize(),d=e.position.clone().add(h.clone().multiplyScalar(this.STEAM_ENGINE_SIZE/2+.1));c.position.copy(d);const u=new je;u.setFromUnitVectors(new R(0,1,0),h),c.quaternion.copy(u),c.renderOrder=100,c.userData.upDirection=h,c.userData.emitterPosition=d.clone(),this.scene.add(c),e.steamGeometry=n,e.steamMesh=c}setEngineRunning(e,t){const n=this.getSteamEngineAtTile(e);n&&(n.isRunning=t)}update(e){const t=Math.min(e,.05),n=performance.now()/1e3;for(const i of this.steamEngines){if(!i.steamMesh||!i.steamGeometry)continue;const s=i.steamGeometry,r=s.attributes.position.array,a=s.attributes.particleLife.array,l=s.attributes.particleSeed.array,c=[];for(let d=0;d<this.MAX_PARTICLES_PER_ENGINE;d++)if(a[d]<1)if(a[d]+=t/this.PARTICLE_LIFETIME,a[d]>=1)a[d]=1,c.push(d);else{const u=this.PARTICLE_SPEED*t;r[d*3+1]+=u;const f=Math.sin(n*2+l[d]*10)*.02*t;r[d*3]+=f,r[d*3+2]+=Math.cos(n*2+l[d]*10)*.02*t}else c.push(d);if(i.isRunning&&c.length>0){const d=1/this.PARTICLE_SPAWN_RATE,u=d*2;i.spawnAccumulator=Math.min(i.spawnAccumulator+t,u);let f=0;const p=2;for(;i.spawnAccumulator>=d&&f<c.length&&f<p;){i.spawnAccumulator-=d;const m=c[f],x=(Math.random()-.5)*this.PARTICLE_SPREAD*2,g=(Math.random()-.5)*this.PARTICLE_SPREAD*2;r[m*3]=x,r[m*3+1]=0,r[m*3+2]=g,a[m]=0,l[m]=Math.random(),f++}}else i.isRunning||(i.spawnAccumulator=0);s.attributes.position.needsUpdate=!0,s.attributes.particleLife.needsUpdate=!0,s.attributes.particleSeed.needsUpdate=!0;const h=i.steamMesh.material;h.uniforms.time&&(h.uniforms.time.value=n)}}}class cg{constructor(e,t,n){y(this,"scene");y(this,"hydroGenerators",[]);y(this,"hydroGeneratorMeshes",[]);y(this,"textureLoader");y(this,"hydroGeneratorGeometry",null);y(this,"hydroGeneratorMaterial",null);y(this,"strutMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"HYDRO_GENERATOR_SIZE",.8);y(this,"STRUT_WIDTH",.05);y(this,"STRUT_COLOR",6710886);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/hydro_generator.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.hydroGeneratorGeometry=new Ht(this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE);const t=this.calculateFaceUVs(),n=this.hydroGeneratorGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.hydroGeneratorMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn}),this.strutMaterial=new is({color:this.STRUT_COLOR})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createStruts(e,t,n){if(n<=0)return null;const i=e.clone().sub(t).normalize(),s=[new R(-.3,0,-.3),new R(.3,0,-.3),new R(-.3,0,.3),new R(.3,0,.3)],r=new R(0,1,0),a=new je().setFromUnitVectors(r,i),l=[],c=[],h=[];let d=0;const u=this.STRUT_WIDTH/2;for(const m of s){const x=m.clone().applyQuaternion(a),g=e.clone().add(x).sub(i.clone().multiplyScalar(this.HYDRO_GENERATOR_SIZE/2)),v=g.clone().sub(i.clone().multiplyScalar(n));let _=new R(1,0,0);Math.abs(i.dot(_))>.9&&(_=new R(0,0,1));const C=new R().crossVectors(i,_).normalize();_.crossVectors(C,i).normalize();const S=[g.clone().add(_.clone().multiplyScalar(-u)).add(C.clone().multiplyScalar(-u)),g.clone().add(_.clone().multiplyScalar(u)).add(C.clone().multiplyScalar(-u)),g.clone().add(_.clone().multiplyScalar(u)).add(C.clone().multiplyScalar(u)),g.clone().add(_.clone().multiplyScalar(-u)).add(C.clone().multiplyScalar(u)),v.clone().add(_.clone().multiplyScalar(-u)).add(C.clone().multiplyScalar(-u)),v.clone().add(_.clone().multiplyScalar(u)).add(C.clone().multiplyScalar(-u)),v.clone().add(_.clone().multiplyScalar(u)).add(C.clone().multiplyScalar(u)),v.clone().add(_.clone().multiplyScalar(-u)).add(C.clone().multiplyScalar(u))],b=i.clone();l.push(S[0].x,S[0].y,S[0].z),l.push(S[3].x,S[3].y,S[3].z),l.push(S[2].x,S[2].y,S[2].z),l.push(S[1].x,S[1].y,S[1].z);for(let U=0;U<4;U++)c.push(b.x,b.y,b.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4;const w=i.clone().negate();l.push(S[4].x,S[4].y,S[4].z),l.push(S[5].x,S[5].y,S[5].z),l.push(S[6].x,S[6].y,S[6].z),l.push(S[7].x,S[7].y,S[7].z);for(let U=0;U<4;U++)c.push(w.x,w.y,w.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4;const O=_.clone();l.push(S[1].x,S[1].y,S[1].z),l.push(S[2].x,S[2].y,S[2].z),l.push(S[6].x,S[6].y,S[6].z),l.push(S[5].x,S[5].y,S[5].z);for(let U=0;U<4;U++)c.push(O.x,O.y,O.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4;const E=_.clone().negate();l.push(S[3].x,S[3].y,S[3].z),l.push(S[0].x,S[0].y,S[0].z),l.push(S[4].x,S[4].y,S[4].z),l.push(S[7].x,S[7].y,S[7].z);for(let U=0;U<4;U++)c.push(E.x,E.y,E.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4;const T=C.clone();l.push(S[2].x,S[2].y,S[2].z),l.push(S[3].x,S[3].y,S[3].z),l.push(S[7].x,S[7].y,S[7].z),l.push(S[6].x,S[6].y,S[6].z);for(let U=0;U<4;U++)c.push(T.x,T.y,T.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4;const A=C.clone().negate();l.push(S[0].x,S[0].y,S[0].z),l.push(S[1].x,S[1].y,S[1].z),l.push(S[5].x,S[5].y,S[5].z),l.push(S[4].x,S[4].y,S[4].z);for(let U=0;U<4;U++)c.push(A.x,A.y,A.z);h.push(d,d+2,d+1,d,d+3,d+2),d+=4}const f=new mt;f.setAttribute("position",new Ge(l,3)),f.setAttribute("normal",new Ge(c,3)),f.setIndex(h);const p=new Ce(f,this.strutMaterial);return p.userData.isHydroGeneratorStrut=!0,p}async placeHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const r=this.hydroGeneratorMaterial.clone(),a=new Ce(this.hydroGeneratorGeometry,r),l=e.clone().sub(t).normalize(),c=e.clone().add(l.multiplyScalar(this.HYDRO_GENERATOR_SIZE/2));a.position.copy(c);const h=c.clone().sub(t).normalize();let d=new R(1,0,0);Math.abs(h.dot(d))>.9&&(d=new R(0,0,1));const u=new R().crossVectors(h,d).normalize();d.crossVectors(u,h).normalize();let f=0;if(s){const C=s.clone();C.sub(h.clone().multiplyScalar(C.dot(h))),C.normalize();const S=C.clone().negate();f=Math.atan2(S.dot(u),S.dot(d))}const p=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);f+=p;const m=new je;m.setFromUnitVectors(new R(0,1,0),h);const x=new je;x.setFromAxisAngle(h,f),a.quaternion.copy(x).multiply(m),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const g=this.createStruts(c,t,i);g&&this.scene.add(g);const v=i>0,_={mesh:a,strutMesh:g,position:c.clone(),tileIndex:n,rotation:f,waterDepth:i,isActive:v,waterPumpedIn:v?i*10:0,waterPumpedOut:v?i*8:0};return this.hydroGenerators.push(_),this.hydroGeneratorMeshes.push(a),_}async restoreHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const r=this.hydroGeneratorMaterial.clone(),a=new Ce(this.hydroGeneratorGeometry,r);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new je;c.setFromUnitVectors(new R(0,1,0),l);const h=new je;h.setFromAxisAngle(l,i),a.quaternion.copy(h).multiply(c),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const d=this.createStruts(e,t,s);d&&this.scene.add(d);const u=s>0,f={mesh:a,strutMesh:d,position:e.clone(),tileIndex:n,rotation:i,waterDepth:s,isActive:u,waterPumpedIn:u?s*10:0,waterPumpedOut:u?s*8:0};return this.hydroGenerators.push(f),this.hydroGeneratorMeshes.push(a),f}removeHydroGenerator(e){const t=this.hydroGenerators.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),e.strutMesh&&(this.scene.remove(e.strutMesh),e.strutMesh.geometry.dispose()),this.hydroGenerators.splice(t,1);const n=this.hydroGeneratorMeshes.indexOf(e.mesh);n!==-1&&this.hydroGeneratorMeshes.splice(n,1)}getHydroGeneratorMeshes(){return this.hydroGeneratorMeshes}getPlacedHydroGenerators(){return this.hydroGenerators}getHydroGeneratorByMesh(e){return this.hydroGenerators.find(t=>t.mesh===e)}getHydroGeneratorAtTile(e){return this.hydroGenerators.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.hydroGenerators){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}exportForSave(){return this.hydroGenerators.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,waterDepth:e.waterDepth}))}dispose(){for(const e of[...this.hydroGenerators])this.removeHydroGenerator(e);this.hydroGeneratorGeometry&&this.hydroGeneratorGeometry.dispose(),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.dispose(),this.strutMaterial&&this.strutMaterial.dispose()}}class hg{constructor(e,t,n){y(this,"scene");y(this,"pipes",new Map);y(this,"networks",new Map);y(this,"textureLoader");y(this,"pipeMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"PIPE_SIZE",.3);y(this,"CONNECTOR_SIZE",.12);y(this,"getHydroGeneratorAtTile",null);y(this,"getSteamEngineAtTile",null);y(this,"getNeighborTiles",null);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initMaterial()}setMachineCallbacks(e,t,n){this.getHydroGeneratorAtTile=e,this.getSteamEngineAtTile=t,this.getNeighborTiles=n}setSunDirection(e){this.sunDirection.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.planetCenter.value.copy(e)}async initMaterial(){const e=await new Promise((t,n)=>{this.textureLoader.load(ft("/textures/technology/copper_pipe.png"),t,void 0,n)});e.magFilter=ct,e.minFilter=ct,e.wrapS=In,e.wrapT=In,this.pipeMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}generatePipeId(e,t){return`pipe_${e}_${t}`}createPipeMesh(e){const t=new Ht(this.PIPE_SIZE,this.PIPE_SIZE,this.PIPE_SIZE),n=this.pipeMaterial.clone(),i=new Ce(t,n),s=e.clone().sub(this.planetCenter).normalize(),r=new je().setFromUnitVectors(new R(0,1,0),s);return i.quaternion.copy(r),i.position.copy(e),i.userData.isCopperPipe=!0,i}createConnectorMesh(e,t){const n=e.clone().add(t).multiplyScalar(.5),i=t.clone().sub(e),s=i.length(),r=new Ht(this.CONNECTOR_SIZE,this.CONNECTOR_SIZE,s),a=s/this.CONNECTOR_SIZE*.5,l=r.getAttribute("uv"),c=l.array;for(let p=0;p<4;p++){const m=c[p*2],x=c[p*2+1];c[p*2]=m*a,c[p*2+1]=x}for(let p=0;p<4;p++){const m=c[8+p*2],x=c[8+p*2+1];c[8+p*2]=m*a,c[8+p*2+1]=1-x}for(let p=0;p<4;p++){const m=c[16+p*2],x=c[16+p*2+1];c[16+p*2]=x*a,c[16+p*2+1]=m}for(let p=0;p<4;p++){const m=c[24+p*2],x=c[24+p*2+1];c[24+p*2]=(1-x)*a,c[24+p*2+1]=m}l.needsUpdate=!0;const h=this.pipeMaterial.clone(),d=new Ce(r,h);d.position.copy(n);const u=i.normalize(),f=new je;return f.setFromUnitVectors(new R(0,0,1),u),d.quaternion.copy(f),d.userData.isPipeConnector=!0,d}async placePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return console.error("Failed to initialize pipe material"),null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=e.clone().sub(this.planetCenter).normalize(),r=e.clone().add(s.clone().multiplyScalar(this.PIPE_SIZE/2)),a=this.createPipeMesh(r);a.userData.pipeId=i,a.userData.tileIndex=t,a.userData.depth=n,this.scene.add(a);const l={id:i,mesh:a,position:r.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,l),this.updatePipeConnections(l),this.updateVisualConnectors(l),this.rebuildNetworks(),l}updateVisualConnectors(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);if(s&&e.id<s.id){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}else if(i.type==="hydro-generator"){const s=(t=this.getHydroGeneratorAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}else if(i.type==="steam-engine"){const s=(n=this.getSteamEngineAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);s&&s.id<e.id&&this.rebuildConnectorsForPipe(s)}}rebuildConnectorsForPipe(e){var t,n;for(const i of e.connectorMeshes)this.scene.remove(i),i.geometry.dispose(),i.material instanceof qe&&i.material.dispose();e.connectorMeshes=[];for(const i of e.connections)if(i.type==="pipe"){const s=this.pipes.get(i.pipeId);if(s&&e.id<s.id){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}else if(i.type==="hydro-generator"){const s=(t=this.getHydroGeneratorAtTile)==null?void 0:t.call(this,i.tileIndex);if(s){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}else if(i.type==="steam-engine"){const s=(n=this.getSteamEngineAtTile)==null?void 0:n.call(this,i.tileIndex);if(s){const r=this.createConnectorMesh(e.position,s.position);this.scene.add(r),e.connectorMeshes.push(r)}}}updatePipeConnections(e){if(e.connections=[],!this.getNeighborTiles)return;const t=this.getNeighborTiles(e.tileIndex);for(const n of t){const i=this.generatePipeId(n,e.depth),s=this.pipes.get(i);s&&(e.connections.push({type:"pipe",pipeId:i}),s.connections.find(r=>r.type==="pipe"&&r.pipeId===e.id)||s.connections.push({type:"pipe",pipeId:e.id})),this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(n)&&e.connections.push({type:"hydro-generator",tileIndex:n}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(n)&&e.connections.push({type:"steam-engine",tileIndex:n})}this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(e.tileIndex)&&e.connections.push({type:"hydro-generator",tileIndex:e.tileIndex}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(e.tileIndex)&&e.connections.push({type:"steam-engine",tileIndex:e.tileIndex})}rebuildNetworks(){this.networks.clear();const e=new Set;for(const[t,n]of this.pipes){if(e.has(t))continue;const i={id:`network_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,pipes:[],connectedHydroGenerators:[],connectedSteamEngines:[]},s=[t];for(;s.length>0;){const r=s.pop();if(e.has(r))continue;e.add(r);const a=this.pipes.get(r);if(a){i.pipes.push(r);for(const l of a.connections)l.type==="pipe"?e.has(l.pipeId)||s.push(l.pipeId):l.type==="hydro-generator"?i.connectedHydroGenerators.includes(l.tileIndex)||i.connectedHydroGenerators.push(l.tileIndex):l.type==="steam-engine"&&(i.connectedSteamEngines.includes(l.tileIndex)||i.connectedSteamEngines.push(l.tileIndex))}}this.networks.set(i.id,i)}}isHydroConnectedToSteam(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e)&&t.connectedSteamEngines.length>0)return!0;return!1}getConnectedSteamEngines(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e))return t.connectedSteamEngines;return[]}getConnectedHydroGenerators(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e))return t.connectedHydroGenerators;return[]}getPipeNetwork(e){for(const t of this.networks.values())if(t.pipes.includes(e))return t;return null}getPipeAt(e,t){const n=this.generatePipeId(e,t);return this.pipes.get(n)}getPipeByMesh(e){const t=e.userData.pipeId;if(t)return this.pipes.get(t)}removePipe(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();e.connectorMeshes=[],this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose();for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);n&&(n.connections=n.connections.filter(i=>!(i.type==="pipe"&&i.pipeId===e.id)),this.rebuildConnectorsForPipe(n))}this.pipes.delete(e.id),this.rebuildNetworks()}getPipeMeshes(){return Array.from(this.pipes.values()).map(e=>e.mesh)}getPlacedPipes(){return Array.from(this.pipes.values())}updateTorchLighting(e,t,n){for(const i of this.pipes.values()){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s);for(const a of i.connectorMeshes){const l=a.material;l.uniforms&&l.uniforms.torchLight&&(l.uniforms.torchLight.value=s)}}}exportForSave(){return Array.from(this.pipes.values()).map(e=>({tileIndex:e.tileIndex,depth:e.depth,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}async restorePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=this.createPipeMesh(e);s.userData.pipeId=i,s.userData.tileIndex=t,s.userData.depth=n,this.scene.add(s);const r={id:i,mesh:s,position:e.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,r),r}rebuildAllConnections(){for(const e of this.pipes.values())this.updatePipeConnections(e);for(const e of this.pipes.values())this.rebuildConnectorsForPipe(e);this.rebuildNetworks()}updatePipesNearTile(e){if(!this.getNeighborTiles)return;const t=this.getNeighborTiles(e),n=[e,...t];for(const i of this.pipes.values())n.includes(i.tileIndex)&&(this.updatePipeConnections(i),this.rebuildConnectorsForPipe(i));this.rebuildNetworks()}dispose(){for(const e of this.pipes.values()){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose()}this.pipes.clear(),this.networks.clear(),this.pipeMaterial&&this.pipeMaterial.dispose()}}class ug{constructor(e,t,n){y(this,"scene");y(this,"cables",new Map);y(this,"networks",new Map);y(this,"textureLoader");y(this,"cableMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"CABLE_SIZE",.2);y(this,"CONNECTOR_SIZE",.08);y(this,"getSteamEngineAtTile",null);y(this,"getElectricFurnaceAtTile",null);y(this,"getElectronicsWorkbenchAtTile",null);y(this,"getNeighborTiles",null);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initMaterial()}setMachineCallbacks(e,t,n,i){this.getSteamEngineAtTile=e,this.getElectricFurnaceAtTile=t,this.getElectronicsWorkbenchAtTile=n,this.getNeighborTiles=i}setSunDirection(e){this.sunDirection.copy(e),this.cableMaterial&&this.cableMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.cableMaterial&&this.cableMaterial.uniforms.planetCenter.value.copy(e)}async initMaterial(){const e=await new Promise((t,n)=>{this.textureLoader.load(ft("/textures/technology/cable.png"),t,void 0,n)});e.magFilter=ct,e.minFilter=ct,e.wrapS=In,e.wrapT=In,this.cableMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}generateCableId(e,t){return`cable_${e}_${t}`}createCableMesh(e){const t=new Ht(this.CABLE_SIZE,this.CABLE_SIZE,this.CABLE_SIZE),n=this.cableMaterial.clone(),i=new Ce(t,n),s=e.clone().sub(this.planetCenter).normalize(),r=new je().setFromUnitVectors(new R(0,1,0),s);return i.quaternion.copy(r),i.position.copy(e),i.userData.isCable=!0,i}createConnectorMesh(e,t){const n=e.clone().add(t).multiplyScalar(.5),i=t.clone().sub(e),s=i.length(),r=new Ht(this.CONNECTOR_SIZE,this.CONNECTOR_SIZE,s),a=s/this.CONNECTOR_SIZE*.5,l=r.getAttribute("uv"),c=l.array;for(let p=0;p<4;p++){const m=c[p*2],x=c[p*2+1];c[p*2]=m*a,c[p*2+1]=x}for(let p=0;p<4;p++){const m=c[8+p*2],x=c[8+p*2+1];c[8+p*2]=m*a,c[8+p*2+1]=1-x}for(let p=0;p<4;p++){const m=c[16+p*2],x=c[16+p*2+1];c[16+p*2]=x*a,c[16+p*2+1]=m}for(let p=0;p<4;p++){const m=c[24+p*2],x=c[24+p*2+1];c[24+p*2]=(1-x)*a,c[24+p*2+1]=m}l.needsUpdate=!0;const h=this.cableMaterial.clone(),d=new Ce(r,h);d.position.copy(n);const u=i.normalize(),f=new je;return f.setFromUnitVectors(new R(0,0,1),u),d.quaternion.copy(f),d.userData.isCableConnector=!0,d}async placeCable(e,t,n){if(this.cableMaterial||await this.initMaterial(),!this.cableMaterial)return console.error("Failed to initialize cable material"),null;const i=this.generateCableId(t,n);if(this.cables.has(i))return null;const s=e.clone().sub(this.planetCenter).normalize(),r=e.clone().add(s.clone().multiplyScalar(this.CABLE_SIZE/2)),a=this.createCableMesh(r);a.userData.cableId=i,a.userData.tileIndex=t,a.userData.depth=n,this.scene.add(a);const l={id:i,mesh:a,position:r.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.cables.set(i,l),this.updateCableConnections(l),this.updateVisualConnectors(l),this.rebuildNetworks(),l}updateVisualConnectors(e){var t,n,i;for(const s of e.connectorMeshes)this.scene.remove(s),s.geometry.dispose(),s.material instanceof qe&&s.material.dispose();e.connectorMeshes=[];for(const s of e.connections)if(s.type==="cable"){const r=this.cables.get(s.cableId);if(r&&e.id<r.id){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="steam-engine"){const r=(t=this.getSteamEngineAtTile)==null?void 0:t.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="electric-furnace"){const r=(n=this.getElectricFurnaceAtTile)==null?void 0:n.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="electronics-workbench"){const r=(i=this.getElectronicsWorkbenchAtTile)==null?void 0:i.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}for(const s of e.connections)if(s.type==="cable"){const r=this.cables.get(s.cableId);r&&r.id<e.id&&this.rebuildConnectorsForCable(r)}}rebuildConnectorsForCable(e){var t,n,i;for(const s of e.connectorMeshes)this.scene.remove(s),s.geometry.dispose(),s.material instanceof qe&&s.material.dispose();e.connectorMeshes=[];for(const s of e.connections)if(s.type==="cable"){const r=this.cables.get(s.cableId);if(r&&e.id<r.id){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="steam-engine"){const r=(t=this.getSteamEngineAtTile)==null?void 0:t.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="electric-furnace"){const r=(n=this.getElectricFurnaceAtTile)==null?void 0:n.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}else if(s.type==="electronics-workbench"){const r=(i=this.getElectronicsWorkbenchAtTile)==null?void 0:i.call(this,s.tileIndex);if(r){const a=this.createConnectorMesh(e.position,r.position);this.scene.add(a),e.connectorMeshes.push(a)}}}updateCableConnections(e){if(e.connections=[],!this.getNeighborTiles)return;const t=this.getNeighborTiles(e.tileIndex);for(const a of t){const l=this.generateCableId(a,e.depth),c=this.cables.get(l);c&&(e.connections.push({type:"cable",cableId:l}),c.connections.find(h=>h.type==="cable"&&h.cableId===e.id)||c.connections.push({type:"cable",cableId:e.id}))}const n=this.generateCableId(e.tileIndex,e.depth+1),i=this.cables.get(n);i&&(e.connections.push({type:"cable",cableId:n}),i.connections.find(a=>a.type==="cable"&&a.cableId===e.id)||i.connections.push({type:"cable",cableId:e.id}));const s=this.generateCableId(e.tileIndex,e.depth-1),r=this.cables.get(s);r&&(e.connections.push({type:"cable",cableId:s}),r.connections.find(a=>a.type==="cable"&&a.cableId===e.id)||r.connections.push({type:"cable",cableId:e.id}));for(const a of t)this.getSteamEngineAtTile&&this.getSteamEngineAtTile(a)&&e.connections.push({type:"steam-engine",tileIndex:a}),this.getElectricFurnaceAtTile&&this.getElectricFurnaceAtTile(a)&&e.connections.push({type:"electric-furnace",tileIndex:a}),this.getElectronicsWorkbenchAtTile&&this.getElectronicsWorkbenchAtTile(a)&&e.connections.push({type:"electronics-workbench",tileIndex:a});this.getSteamEngineAtTile&&this.getSteamEngineAtTile(e.tileIndex)&&e.connections.push({type:"steam-engine",tileIndex:e.tileIndex}),this.getElectricFurnaceAtTile&&this.getElectricFurnaceAtTile(e.tileIndex)&&e.connections.push({type:"electric-furnace",tileIndex:e.tileIndex}),this.getElectronicsWorkbenchAtTile&&this.getElectronicsWorkbenchAtTile(e.tileIndex)&&e.connections.push({type:"electronics-workbench",tileIndex:e.tileIndex})}rebuildNetworks(){this.networks.clear();const e=new Set;for(const[t,n]of this.cables){if(e.has(t))continue;const i={id:`network_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,cables:[],connectedSteamEngines:[],connectedElectricFurnaces:[],connectedElectronicsWorkbenches:[]},s=[t];for(;s.length>0;){const r=s.pop();if(e.has(r))continue;e.add(r);const a=this.cables.get(r);if(a){i.cables.push(r);for(const l of a.connections)l.type==="cable"?e.has(l.cableId)||s.push(l.cableId):l.type==="steam-engine"?i.connectedSteamEngines.includes(l.tileIndex)||i.connectedSteamEngines.push(l.tileIndex):l.type==="electric-furnace"?i.connectedElectricFurnaces.includes(l.tileIndex)||i.connectedElectricFurnaces.push(l.tileIndex):l.type==="electronics-workbench"&&(i.connectedElectronicsWorkbenches.includes(l.tileIndex)||i.connectedElectronicsWorkbenches.push(l.tileIndex))}}this.networks.set(i.id,i)}}isSteamConnectedToElectricFurnace(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e)&&t.connectedElectricFurnaces.length>0)return!0;return!1}getConnectedElectricFurnaces(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e))return t.connectedElectricFurnaces;return[]}getConnectedSteamEngines(e){for(const t of this.networks.values())if(t.connectedElectricFurnaces.includes(e)||t.connectedElectronicsWorkbenches.includes(e))return t.connectedSteamEngines;return[]}isElectricFurnaceConnectedToRunningSteamEngine(e,t){const n=this.getConnectedSteamEngines(e);for(const i of n)if(t(i))return!0;return!1}getCableNetwork(e){for(const t of this.networks.values())if(t.cables.includes(e))return t;return null}getCableAt(e,t){const n=this.generateCableId(e,t);return this.cables.get(n)}getCableByMesh(e){const t=e.userData.cableId;if(t)return this.cables.get(t)}removeCable(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();e.connectorMeshes=[],this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose();for(const t of e.connections)if(t.type==="cable"){const n=this.cables.get(t.cableId);n&&(n.connections=n.connections.filter(i=>!(i.type==="cable"&&i.cableId===e.id)),this.rebuildConnectorsForCable(n))}this.cables.delete(e.id),this.rebuildNetworks()}getCableMeshes(){return Array.from(this.cables.values()).map(e=>e.mesh)}getPlacedCables(){return Array.from(this.cables.values())}updateTorchLighting(e,t,n){for(const i of this.cables.values()){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s);for(const a of i.connectorMeshes){const l=a.material;l.uniforms&&l.uniforms.torchLight&&(l.uniforms.torchLight.value=s)}}}exportForSave(){return Array.from(this.cables.values()).map(e=>({tileIndex:e.tileIndex,depth:e.depth,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}async restoreCable(e,t,n){if(this.cableMaterial||await this.initMaterial(),!this.cableMaterial)return null;const i=this.generateCableId(t,n);if(this.cables.has(i))return null;const s=this.createCableMesh(e);s.userData.cableId=i,s.userData.tileIndex=t,s.userData.depth=n,this.scene.add(s);const r={id:i,mesh:s,position:e.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.cables.set(i,r),r}rebuildAllConnections(){for(const e of this.cables.values())this.updateCableConnections(e);for(const e of this.cables.values())this.rebuildConnectorsForCable(e);this.rebuildNetworks()}updateCablesNearTile(e){if(!this.getNeighborTiles)return;const t=this.getNeighborTiles(e),n=[e,...t];for(const i of this.cables.values())n.includes(i.tileIndex)&&(this.updateCableConnections(i),this.rebuildConnectorsForCable(i));this.rebuildNetworks()}dispose(){for(const e of this.cables.values()){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof qe&&t.material.dispose();this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose()}this.cables.clear(),this.networks.clear(),this.cableMaterial&&this.cableMaterial.dispose()}}const qs=[{input:L.ORE_LITHIUM,output:L.INGOT_LITHIUM,outputQuantity:1},{input:L.ORE_COBALT,output:L.INGOT_COBALT,outputQuantity:1},{input:L.ORE_COPPER,output:L.INGOT_COPPER,outputQuantity:1},{input:L.ORE_IRON,output:L.INGOT_IRON,outputQuantity:1},{input:L.ORE_GOLD,output:L.INGOT_GOLD,outputQuantity:1},{input:L.ORE_ALUMINUM,output:L.INGOT_ALUMINUM,outputQuantity:1}];class dg{constructor(e,t,n){y(this,"scene");y(this,"furnaces",[]);y(this,"furnaceMeshes",[]);y(this,"textureLoader");y(this,"furnaceGeometry",null);y(this,"furnaceMaterial",null);y(this,"onSmeltCompleteCallback",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"FURNACE_SIZE",.8);y(this,"SMELT_TIME",2);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/electric_furnace.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.furnaceGeometry=new Ht(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeElectricFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize electric furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),r=new Ce(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));r.position.copy(l);const c=l.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(c.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(c,h).normalize();h.crossVectors(d,c).normalize();let u=0;if(i){const g=i.clone();g.sub(c.clone().multiplyScalar(g.dot(c))),g.normalize();const v=g.clone().negate();u=Math.atan2(v.dot(d),v.dot(h))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);u+=f;const p=new je;p.setFromUnitVectors(new R(0,1,0),c);const m=new je;m.setFromAxisAngle(c,u),r.quaternion.copy(m).multiply(p),r.userData.isElectricFurnace=!0,r.userData.tileIndex=n,this.scene.add(r);const x={mesh:r,position:l.clone(),tileIndex:n,rotation:u,isPowered:!1,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(x),this.furnaceMeshes.push(r),x}async restoreElectricFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize electric furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),r=new Ce(this.furnaceGeometry,s);r.position.copy(e);const a=e.clone().sub(t).normalize(),l=new je;l.setFromUnitVectors(new R(0,1,0),a);const c=new je;c.setFromAxisAngle(a,i),r.quaternion.copy(c).multiply(l),r.userData.isElectricFurnace=!0,r.userData.tileIndex=n,this.scene.add(r);const h={mesh:r,position:e.clone(),tileIndex:n,rotation:i,isPowered:!1,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(h),this.furnaceMeshes.push(r),h}removeElectricFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getElectricFurnaceMeshes(){return this.furnaceMeshes}getPlacedElectricFurnaces(){return this.furnaces}getElectricFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getElectricFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}setFurnacePowered(e,t){const n=this.getElectricFurnaceAtTile(e);n&&(n.isPowered=t)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.isPowered&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=qs.find(r=>r.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}class fg{constructor(e,t,n){y(this,"scene");y(this,"workbenches",[]);y(this,"workbenchMeshes",[]);y(this,"textureLoader");y(this,"workbenchGeometry",null);y(this,"workbenchMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"WORKBENCH_SIZE",.8);this.scene=e,this.textureLoader=new yn,this.planetCenter=(t==null?void 0:t.clone())||new R(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new R(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.workbenchMaterial&&this.workbenchMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.workbenchMaterial&&this.workbenchMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((r,a)=>{this.textureLoader.load(ft("/textures/technology/electronics_workbench.png"),r,void 0,a)});e.magFilter=ct,e.minFilter=ct,e.wrapS=Ct,e.wrapT=Ct,this.workbenchGeometry=new Ht(this.WORKBENCH_SIZE,this.WORKBENCH_SIZE,this.WORKBENCH_SIZE);const t=this.calculateFaceUVs(),n=this.workbenchGeometry.attributes.uv,i=n.array,s=(r,a,l=!1,c=!1)=>{const h=r*8,d=l?a.u2:a.u1,u=l?a.u1:a.u2,f=c?a.v2:a.v1,p=c?a.v1:a.v2;i[h+0]=d,i[h+1]=f,i[h+2]=u,i[h+3]=f,i[h+4]=d,i[h+5]=p,i[h+6]=u,i[h+7]=p};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.workbenchMaterial=new qe({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Rn,fragmentShader:Pn})}calculateFaceUVs(){const i=(s,r,a,l)=>({u1:s/48,v1:1-(r+l)/32,u2:(s+a)/48,v2:1-r/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeElectronicsWorkbench(e,t,n,i){if((!this.workbenchGeometry||!this.workbenchMaterial)&&await this.initGeometryAndMaterials(),!this.workbenchGeometry||!this.workbenchMaterial)return console.error("Failed to initialize electronics workbench geometry/materials"),null;const s=this.workbenchMaterial.clone(),r=new Ce(this.workbenchGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.WORKBENCH_SIZE/2));r.position.copy(l);const c=l.clone().sub(t).normalize();let h=new R(1,0,0);Math.abs(c.dot(h))>.9&&(h=new R(0,0,1));const d=new R().crossVectors(c,h).normalize();h.crossVectors(d,c).normalize();let u=0;if(i){const g=i.clone();g.sub(c.clone().multiplyScalar(g.dot(c))),g.normalize();const v=g.clone().negate();u=Math.atan2(v.dot(d),v.dot(h))}const f=N.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);u+=f;const p=new je;p.setFromUnitVectors(new R(0,1,0),c);const m=new je;m.setFromAxisAngle(c,u),r.quaternion.copy(m).multiply(p),r.userData.isElectronicsWorkbench=!0,r.userData.tileIndex=n,this.scene.add(r);const x={mesh:r,position:l.clone(),tileIndex:n,rotation:u};return this.workbenches.push(x),this.workbenchMeshes.push(r),x}async restoreElectronicsWorkbench(e,t,n,i){if((!this.workbenchGeometry||!this.workbenchMaterial)&&await this.initGeometryAndMaterials(),!this.workbenchGeometry||!this.workbenchMaterial)return console.error("Failed to initialize electronics workbench geometry/materials"),null;const s=this.workbenchMaterial.clone(),r=new Ce(this.workbenchGeometry,s);r.position.copy(e);const a=e.clone().sub(t).normalize(),l=new je;l.setFromUnitVectors(new R(0,1,0),a);const c=new je;c.setFromAxisAngle(a,i),r.quaternion.copy(c).multiply(l),r.userData.isElectronicsWorkbench=!0,r.userData.tileIndex=n,this.scene.add(r);const h={mesh:r,position:e.clone(),tileIndex:n,rotation:i};return this.workbenches.push(h),this.workbenchMeshes.push(r),h}removeElectronicsWorkbench(e){const t=this.workbenches.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof qe&&e.mesh.material.dispose(),this.workbenches.splice(t,1);const n=this.workbenchMeshes.indexOf(e.mesh);n!==-1&&this.workbenchMeshes.splice(n,1)}getElectronicsWorkbenchMeshes(){return this.workbenchMeshes}getPlacedElectronicsWorkbenches(){return this.workbenches}getElectronicsWorkbenchByMesh(e){return this.workbenches.find(t=>t.mesh===e)}getElectronicsWorkbenchAtTile(e){return this.workbenches.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.workbenches){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const r=i.mesh.material;r.uniforms&&r.uniforms.torchLight&&(r.uniforms.torchLight.value=s)}}exportForSave(){return this.workbenches.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation}))}}const Ls=[{name:"Wood Planks",inputs:[{itemType:L.LOG,quantity:1,slot:4}],output:{itemType:L.WOOD,quantity:4}},{name:"Sticks",inputs:[{itemType:L.WOOD,quantity:1,slot:1},{itemType:L.WOOD,quantity:1,slot:4}],output:{itemType:L.STICK,quantity:4}},{name:"Coal",inputs:[{itemType:L.ORE_COAL,quantity:1,slot:4}],output:{itemType:L.COAL,quantity:8}},{name:"Torch",inputs:[{itemType:L.COAL,quantity:1,slot:1},{itemType:L.STICK,quantity:1,slot:4}],output:{itemType:L.TORCH,quantity:4}},{name:"Fishing Rod",inputs:[{itemType:L.STICK,quantity:1,slot:1},{itemType:L.STICK,quantity:1,slot:4},{itemType:L.STICK,quantity:1,slot:7}],output:{itemType:L.FISHING_ROD,quantity:1}},{name:"Furnace",inputs:[{itemType:L.STONE,quantity:1,slot:0},{itemType:L.STONE,quantity:1,slot:1},{itemType:L.STONE,quantity:1,slot:2},{itemType:L.STONE,quantity:1,slot:3},{itemType:L.STONE,quantity:1,slot:5},{itemType:L.STONE,quantity:1,slot:6},{itemType:L.STONE,quantity:1,slot:7},{itemType:L.STONE,quantity:1,slot:8}],output:{itemType:L.FURNACE,quantity:1}},{name:"Storage Chest",inputs:[{itemType:L.WOOD,quantity:1,slot:0},{itemType:L.WOOD,quantity:1,slot:1},{itemType:L.WOOD,quantity:1,slot:2},{itemType:L.WOOD,quantity:1,slot:3},{itemType:L.WOOD,quantity:1,slot:5},{itemType:L.WOOD,quantity:1,slot:6},{itemType:L.WOOD,quantity:1,slot:7},{itemType:L.WOOD,quantity:1,slot:8}],output:{itemType:L.STORAGE_CHEST,quantity:1}},{name:"Steam Engine",inputs:[{itemType:L.INGOT_IRON,quantity:1,slot:0},{itemType:L.INGOT_IRON,quantity:1,slot:1},{itemType:L.INGOT_IRON,quantity:1,slot:2},{itemType:L.INGOT_COPPER,quantity:1,slot:3},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:L.INGOT_COPPER,quantity:1,slot:5},{itemType:L.INGOT_IRON,quantity:1,slot:6},{itemType:L.INGOT_IRON,quantity:1,slot:7},{itemType:L.INGOT_IRON,quantity:1,slot:8}],output:{itemType:L.STEAM_ENGINE,quantity:1}},{name:"Hydro Generator",inputs:[{itemType:L.INGOT_IRON,quantity:1,slot:0},{itemType:L.INGOT_IRON,quantity:1,slot:1},{itemType:L.INGOT_IRON,quantity:1,slot:2},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:3},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:5},{itemType:L.INGOT_IRON,quantity:1,slot:6},{itemType:L.INGOT_IRON,quantity:1,slot:7},{itemType:L.INGOT_IRON,quantity:1,slot:8}],output:{itemType:L.HYDRO_GENERATOR,quantity:1}},{name:"Copper Pipe",inputs:[{itemType:L.INGOT_COPPER,quantity:1,slot:4}],output:{itemType:L.COPPER_PIPE,quantity:4}},{name:"Cable",inputs:[{itemType:L.INGOT_COPPER,quantity:1,slot:3},{itemType:L.INGOT_COPPER,quantity:1,slot:4},{itemType:L.INGOT_COPPER,quantity:1,slot:5}],output:{itemType:L.CABLE,quantity:8}},{name:"Electric Furnace",inputs:[{itemType:L.INGOT_IRON,quantity:1,slot:0},{itemType:L.INGOT_IRON,quantity:1,slot:1},{itemType:L.INGOT_IRON,quantity:1,slot:2},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:3},{itemType:L.INGOT_COPPER,quantity:1,slot:4},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:5},{itemType:L.INGOT_IRON,quantity:1,slot:6},{itemType:L.INGOT_IRON,quantity:1,slot:7},{itemType:L.INGOT_IRON,quantity:1,slot:8}],output:{itemType:L.ELECTRIC_FURNACE,quantity:1}},{name:"Electronics Workbench",inputs:[{itemType:L.INGOT_ALUMINUM,quantity:1,slot:0},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:1},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:2},{itemType:L.INGOT_COPPER,quantity:1,slot:3},{itemType:L.INGOT_COBALT,quantity:1,slot:4},{itemType:L.INGOT_COPPER,quantity:1,slot:5},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:6},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:7},{itemType:L.INGOT_ALUMINUM,quantity:1,slot:8}],output:{itemType:L.ELECTRONICS_WORKBENCH,quantity:1}}];class pg{constructor(e){y(this,"inventory");y(this,"menuElement",null);y(this,"recipeSelectElement",null);y(this,"craftingGridElement",null);y(this,"craftingOutputElement",null);y(this,"craftBtnElement",null);y(this,"inventoryGridElement",null);y(this,"inventoryHotbarElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onSaveCallback",null);y(this,"customDropdown",null);y(this,"dropdownSelected",null);y(this,"dropdownList",null);y(this,"isDropdownOpen",!1);y(this,"selectedRecipe",null);y(this,"draggedSlotIndex",null);y(this,"dragGhost",null);y(this,"touchDragSlotIndex",null);y(this,"touchDragGhost",null);y(this,"onFurnaceDropCallback",null);y(this,"onElectricFurnaceDropCallback",null);y(this,"onStorageDropCallback",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler(),Pt.registerMenu("inventory",{isOpen:()=>this.isOpen,close:()=>this.close()})}setupUI(){this.menuElement=document.getElementById("inventory-menu"),this.recipeSelectElement=document.getElementById("recipe-select"),this.craftingGridElement=document.getElementById("crafting-grid"),this.craftingOutputElement=document.getElementById("crafting-output"),this.craftBtnElement=document.getElementById("craft-btn"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.menuElement&&this.menuElement.addEventListener("contextmenu",e=>e.preventDefault()),this.createInventorySlots(),Pt.setupCloseButton(".close-inventory",this.menuElement,()=>this.close()),this.createCustomDropdown(),this.craftBtnElement&&this.craftBtnElement.addEventListener("click",()=>this.craftSelectedRecipe()),document.addEventListener("click",e=>{this.customDropdown&&!this.customDropdown.contains(e.target)&&this.closeDropdown()})}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString(),t.draggable=!0;const n=document.createElement("img");n.style.display="none",n.draggable=!1,t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t.addEventListener("dragstart",s=>this.handleDragStart(s,e)),t.addEventListener("dragend",()=>this.handleDragEnd()),t.addEventListener("dragover",s=>this.handleDragOver(s)),t.addEventListener("dragleave",s=>this.handleDragLeave(s)),t.addEventListener("drop",s=>this.handleDrop(s,e)),t.addEventListener("touchstart",s=>this.handleTouchStart(s,e),{passive:!1}),t.addEventListener("touchmove",s=>this.handleTouchMove(s),{passive:!1}),t.addEventListener("touchend",s=>this.handleTouchEnd(s),{passive:!1}),t}handleTouchStart(e,t){const n=this.inventory.getSlot(t);if(!n||n.itemType===L.NONE)return;e.preventDefault(),this.touchDragSlotIndex=t;const i=e.touches[0];e.currentTarget.classList.add("dragging");const r=document.createElement("div");r.className="drag-ghost";const a=ot[n.itemType];r.innerHTML=`<img src="${ft(a.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(r.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),r.style.position="fixed",r.style.left=`${i.clientX-25}px`,r.style.top=`${i.clientY-25}px`,r.style.pointerEvents="none",r.style.zIndex="9999",r.style.background="rgba(0,0,0,0.8)",r.style.border="2px solid #4CAF50",r.style.borderRadius="4px",r.style.padding="4px",document.body.appendChild(r),this.touchDragGhost=r}handleTouchMove(e){if(this.touchDragSlotIndex===null||!this.touchDragGhost)return;e.preventDefault();const t=e.touches[0];this.touchDragGhost.style.left=`${t.clientX-25}px`,this.touchDragGhost.style.top=`${t.clientY-25}px`,document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")});const n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");i&&i.classList.add("drag-over")}handleTouchEnd(e){if(this.touchDragSlotIndex===null)return;e.preventDefault();const t=e.changedTouches[0],n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");if(i){const s=parseInt(i.dataset.slot||"-1");s>=0&&s!==this.touchDragSlotIndex&&(this.inventory.swapSlots(this.touchDragSlotIndex,s),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}document.querySelectorAll(".inventory-slot.dragging").forEach(s=>{s.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")}),this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null),this.touchDragSlotIndex=null}handleDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===L.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const r=ot[n.itemType];s.innerHTML=`<img src="${ft(r.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e,t){var r;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(r=e.dataTransfer)==null?void 0:r.getData("text/plain");if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.onFurnaceDropCallback&&this.onFurnaceDropCallback(t,a)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}if(i&&i.startsWith("electric-furnace:")){const a=i.substring(17);this.onElectricFurnaceDropCallback&&this.onElectricFurnaceDropCallback(t,a)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}if(i&&i.startsWith("storage:")){this.onStorageDropCallback&&this.onStorageDropCallback(t,i)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.mergeOrSwapSlots(s,t),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),Pt.closeMenuViaKeyboard(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),Pt.closeMenuViaKeyboard(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,Pt.openMenu(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.cancelDrag(),this.onCloseCallback&&this.onCloseCallback())}cancelDrag(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null),this.touchDragSlotIndex=null,this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null)}isMenuOpen(){return this.isOpen}toggle(){this.isOpen?this.close():this.open()}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnFurnaceDropCallback(e){this.onFurnaceDropCallback=e}setOnElectricFurnaceDropCallback(e){this.onElectricFurnaceDropCallback=e}setOnStorageDropCallback(e){this.onStorageDropCallback=e}updateInventorySlotsPublic(){this.updateInventorySlots()}updateUI(){this.updateInventorySlots(),this.updateCraftingGrid()}updateInventorySlots(){var i,s;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((r,a)=>{const l=9+a;this.updateSlotElement(r,e[l])});const n=(s=this.inventoryHotbarElement)==null?void 0:s.querySelectorAll(".inventory-slot");n==null||n.forEach((r,a)=>{this.updateSlotElement(r,e[a])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");let s=e.querySelector(".item-tooltip");if(t.itemType!==L.NONE&&t.quantity>0){const r=ot[t.itemType];n&&(n.src=ft(r.texture),n.style.display="block",this.applyAtlasRegionStyle(n,r)),i&&(i.textContent=t.quantity>1?t.quantity.toString():""),s||(s=document.createElement("span"),s.className="item-tooltip",e.appendChild(s)),s.textContent=r.name}else n&&(n.style.display="none",this.resetAtlasRegionStyle(n)),i&&(i.textContent=""),s&&s.remove()}applyAtlasRegionStyle(e,t){this.applyAtlasRegionStyleWithSize(e,t,40)}applyAtlasRegionStyleWithSize(e,t,n){if(t.atlasRegion){const{x:i,y:s,width:r,height:a,atlasWidth:l,atlasHeight:c}=t.atlasRegion,h=l/r,d=c/a;e.style.objectFit="none",e.style.objectPosition=`${-i*(n/r)}px ${-s*(n/a)}px`,e.style.width=`${n*h}px`,e.style.height=`${n*d}px`,e.style.transform=`scale(${1/h}, ${1/d})`,e.style.transformOrigin="top left"}else this.resetAtlasRegionStyleWithSize(e,n)}resetAtlasRegionStyle(e){this.resetAtlasRegionStyleWithSize(e,40)}resetAtlasRegionStyleWithSize(e,t){e.style.objectFit="",e.style.objectPosition="",e.style.width=`${t}px`,e.style.height=`${t}px`,e.style.transform="",e.style.transformOrigin=""}createCustomDropdown(){this.recipeSelectElement&&(this.recipeSelectElement.style.display="none"),this.customDropdown=document.createElement("div"),this.customDropdown.className="custom-recipe-dropdown",this.customDropdown.style.cssText=`
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
      min-width: 180px;
    `,this.dropdownSelected.innerHTML=`
      <span style="color: #888;">Select Recipe</span>
      <span style="margin-left: auto;">▼</span>
    `,this.dropdownSelected.addEventListener("click",e=>{e.stopPropagation(),this.toggleDropdown()}),this.dropdownList=document.createElement("div"),this.dropdownList.className="dropdown-list",this.dropdownList.style.cssText=`
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
      overflow-x: hidden;
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
    `,e.innerHTML="<span>Select Recipe</span>",e.addEventListener("click",()=>this.selectRecipe(-1)),e.addEventListener("mouseenter",()=>e.style.background="#3a3a3a"),e.addEventListener("mouseleave",()=>e.style.background=""),this.dropdownList.appendChild(e);for(let t=0;t<Ls.length;t++){const n=Ls[t],i=ot[n.output.itemType],s=document.createElement("div");s.className="dropdown-item",s.style.cssText=`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
      `;const r=document.createElement("img");r.src=ft(i.texture),r.style.cssText=`
        width: 24px;
        height: 24px;
        image-rendering: pixelated;
      `;const a=document.createElement("span");a.textContent=n.name,a.style.color="#fff";const l=document.createElement("span");l.textContent=`x${n.output.quantity}`,l.style.cssText=`
        margin-left: auto;
        color: #888;
        font-size: 12px;
      `,s.appendChild(r),s.appendChild(a),s.appendChild(l),s.addEventListener("click",()=>this.selectRecipe(t)),s.addEventListener("mouseenter",()=>s.style.background="#3a3a3a"),s.addEventListener("mouseleave",()=>s.style.background=""),this.dropdownList.appendChild(s)}}toggleDropdown(){this.isDropdownOpen?this.closeDropdown():this.openDropdown()}openDropdown(){this.dropdownList&&(this.dropdownList.style.display="block",this.isDropdownOpen=!0)}closeDropdown(){this.dropdownList&&(this.dropdownList.style.display="none",this.isDropdownOpen=!1)}selectRecipe(e){if(e<0||e>=Ls.length)this.selectedRecipe=null,this.dropdownSelected&&(this.dropdownSelected.innerHTML=`
          <span style="color: #888;">Select Recipe</span>
          <span style="margin-left: auto;">▼</span>
        `);else{this.selectedRecipe=Ls[e];const t=ot[this.selectedRecipe.output.itemType];this.dropdownSelected&&(this.dropdownSelected.innerHTML=`
          <img src="${ft(t.texture)}" style="width: 24px; height: 24px; image-rendering: pixelated;">
          <span style="color: #fff;">${this.selectedRecipe.name}</span>
          <span style="margin-left: auto;">▼</span>
        `)}this.closeDropdown(),this.updateCraftingGrid()}updateCraftingGrid(){var i;const e=(i=this.craftingGridElement)==null?void 0:i.querySelectorAll(".crafting-slot");if(e==null||e.forEach(s=>{const r=s.querySelector("img"),a=s.querySelector(".slot-count"),l=s.querySelector(".item-tooltip");r&&(r.style.display="none"),a&&(a.textContent=""),l&&l.remove(),s.classList.remove("has-item","missing-item")}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),r=this.craftingOutputElement.querySelector(".slot-count");s&&(s.style.display="none"),r&&(r.textContent=""),this.craftingOutputElement.classList.remove("has-item")}if(this.craftBtnElement&&(this.craftBtnElement.disabled=!0),!this.selectedRecipe)return;const t=new Map;for(const s of this.selectedRecipe.inputs){const r=t.get(s.itemType)||0;t.set(s.itemType,r+s.quantity)}let n=!0;if(!N.DEBUG_BYPASS_CRAFTING_INGREDIENTS){for(const[s,r]of t)if(!this.inventory.hasItem(s,r)){n=!1;break}}if(this.selectedRecipe.inputs.forEach((s,r)=>{const a=s.slot!==void 0?s.slot:r;if(a<9&&e&&e[a]){const l=e[a],c=l.querySelector("img"),h=l.querySelector(".slot-count"),d=ot[s.itemType];c&&(c.src=ft(d.texture),c.style.display="block",this.applyAtlasRegionStyle(c,d)),h&&(h.textContent=s.quantity>1?s.quantity.toString():"");let u=l.querySelector(".item-tooltip");if(u||(u=document.createElement("span"),u.className="item-tooltip",l.appendChild(u)),u.textContent=d.name,n)l.classList.add("has-item");else{const f=t.get(s.itemType)||0;this.inventory.hasItem(s.itemType,f)?l.classList.add("has-item"):l.classList.add("missing-item")}}}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),r=this.craftingOutputElement.querySelector(".slot-count"),a=ot[this.selectedRecipe.output.itemType];s&&(s.src=ft(a.texture),s.style.display="block",this.applyAtlasRegionStyleWithSize(s,a,48)),r&&(r.textContent=this.selectedRecipe.output.quantity>1?this.selectedRecipe.output.quantity.toString():""),n&&this.craftingOutputElement.classList.add("has-item")}this.craftBtnElement&&(this.craftBtnElement.disabled=!n)}canCraft(e){if(N.DEBUG_BYPASS_CRAFTING_INGREDIENTS)return!0;for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craftSelectedRecipe(){if(!(!this.selectedRecipe||!this.canCraft(this.selectedRecipe))){if(!N.DEBUG_BYPASS_CRAFTING_INGREDIENTS)for(const e of this.selectedRecipe.inputs)this.inventory.removeItem(e.itemType,e.quantity);this.inventory.addItem(this.selectedRecipe.output.itemType,this.selectedRecipe.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback()}}}class mg{constructor(){y(this,"currentHydroGenerator",null);y(this,"hydroGeneratorSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"waterInElement",null);y(this,"poweredElement",null);y(this,"waterOutElement",null);y(this,"statusIndicatorElement",null);y(this,"waterCanvas",null);y(this,"waterCtx",null);y(this,"animationFrameId",null);y(this,"waterLevel",0);y(this,"targetWaterLevel",0);y(this,"waveOffset",0);y(this,"turbineRotation",0);y(this,"lastAnimationTime",0);y(this,"isConnectedToSteamEngine",null);y(this,"connectedToSteam",!1);this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("hydro-generator",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.hydroGeneratorSectionElement=document.createElement("div"),this.hydroGeneratorSectionElement.id="hydro-generator-section",this.hydroGeneratorSectionElement.className="hydro-generator-section",this.hydroGeneratorSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){var t;this.currentHydroGenerator=e,this.isOpen=!0,this.connectedToSteam=((t=this.isConnectedToSteamEngine)==null?void 0:t.call(this,e.tileIndex))??!1,this.waterLevel=0,this.targetWaterLevel=e.isActive?.75:0,this.waveOffset=0,this.turbineRotation=0,this.lastAnimationTime=performance.now(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startWaterAnimation()}close(){this.currentHydroGenerator=null,this.isOpen=!1,this.stopWaterAnimation(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentHydroGenerator(){return this.currentHydroGenerator}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setConnectionCallback(e){this.isConnectedToSteamEngine=e}updateUI(){var i;if(!this.currentHydroGenerator)return;const e=this.currentHydroGenerator;this.connectedToSteam=((i=this.isConnectedToSteamEngine)==null?void 0:i.call(this,e.tileIndex))??!1;const t=e.isActive&&this.connectedToSteam;if(this.statusIndicatorElement){this.statusIndicatorElement.classList.remove("active","inactive"),this.statusIndicatorElement.classList.add(t?"active":"inactive");const s=this.statusIndicatorElement.querySelector(".status-text");s&&(t?s.textContent="Online":e.isActive?s.textContent="Offline":s.textContent="No Water")}this.waterInElement&&(this.waterInElement.textContent=`${e.waterPumpedIn.toFixed(1)} units/s`),this.poweredElement&&(this.connectedToSteam?(this.poweredElement.textContent="Connected",this.poweredElement.style.color="#44FF44"):(this.poweredElement.textContent="Disconnected",this.poweredElement.style.color="#FF4444")),this.waterOutElement&&(this.connectedToSteam&&e.isActive?this.waterOutElement.textContent=`${e.waterPumpedOut.toFixed(1)} units/s`:this.waterOutElement.textContent="0 units/s");const n=document.getElementById("hydro-water-depth");n&&(n.textContent=Math.round(e.waterDepth).toString())}startWaterAnimation(){if(this.animationFrameId!==null)return;const e=t=>{var s;if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t;const i=.15;this.waterLevel<this.targetWaterLevel?this.waterLevel=Math.min(this.targetWaterLevel,this.waterLevel+i*n):this.waterLevel>this.targetWaterLevel&&(this.waterLevel=Math.max(this.targetWaterLevel,this.waterLevel-i*n)),this.waveOffset+=n*2,this.connectedToSteam&&((s=this.currentHydroGenerator)!=null&&s.isActive)&&(this.turbineRotation+=n*3),this.drawWaterAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopWaterAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}drawWaterAnimation(){if(!this.waterCanvas||!this.waterCtx)return;const e=this.waterCtx,t=this.waterCanvas.width,n=this.waterCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#0a0a1a",e.fillRect(0,0,t,n);const i=n*this.waterLevel,s=n-i;if(this.waterLevel>.01){const r=e.createLinearGradient(0,s,0,n);r.addColorStop(0,"rgba(30, 100, 150, 0.9)"),r.addColorStop(.5,"rgba(20, 80, 130, 0.95)"),r.addColorStop(1,"rgba(10, 50, 100, 1)"),e.fillStyle=r,e.fillRect(0,s,t,i),e.beginPath(),e.moveTo(0,s);for(let c=0;c<=t;c+=2){const h=Math.sin(c*.1+this.waveOffset)*2,d=Math.sin(c*.15+this.waveOffset*1.3)*1.5,u=s+h+d;e.lineTo(c,u)}e.lineTo(t,s),e.lineTo(t,s-10),e.lineTo(0,s-10),e.closePath();const a=e.createLinearGradient(0,s-5,0,s+5);a.addColorStop(0,"rgba(60, 140, 200, 0.3)"),a.addColorStop(1,"rgba(30, 100, 150, 0.9)"),e.fillStyle=a,e.fill(),e.fillStyle="rgba(150, 200, 255, 0.3)";const l=Math.floor(this.waterLevel*5);for(let c=0;c<l;c++){const h=(Math.sin(this.waveOffset*.5+c*1.7)*.5+.5)*t,d=s+(Math.cos(this.waveOffset+c*2.3)*.5+.5)*i*.7,u=1+Math.sin(this.waveOffset+c)*.5;e.beginPath(),e.arc(h,d,u,0,Math.PI*2),e.fill()}}this.drawTurbine(e,t/2,n/2),e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2),e.fillStyle="#555",e.fillRect(0,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(2,n*.3-2,4,4),e.fillStyle="#555",e.fillRect(t-8,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(t-6,n*.3-2,4,4)}drawTurbine(e,t,n){e.save(),e.translate(t,n),e.rotate(this.turbineRotation);for(let l=0;l<6;l++){const c=l/6*Math.PI*2;e.save(),e.rotate(c),e.fillStyle="#666",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(24,-4/3),e.lineTo(24,4/3),e.lineTo(6,4/2),e.closePath(),e.fill(),e.fillStyle="#888",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(6+18*.7,-4/3),e.lineTo(6+18*.7,0),e.lineTo(6,0),e.closePath(),e.fill(),e.restore()}e.beginPath(),e.arc(0,0,6,0,Math.PI*2),e.fillStyle="#555",e.fill(),e.strokeStyle="#777",e.lineWidth=1,e.stroke(),e.beginPath(),e.arc(0,0,2,0,Math.PI*2),e.fillStyle="#888",e.fill(),e.restore()}}class gg{constructor(){y(this,"currentSteamEngine",null);y(this,"steamEngineSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"inventory",null);y(this,"onSaveCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"engineStates",new Map);y(this,"fuelAmountElement",null);y(this,"waterInputElement",null);y(this,"steamOutputElement",null);y(this,"statusIndicatorElement",null);y(this,"addFuelBtnElement",null);y(this,"steamCanvas",null);y(this,"steamCtx",null);y(this,"animationFrameId",null);y(this,"lastAnimationTime",0);y(this,"steamParticles",[]);y(this,"getConnectedHydroGenerators",null);y(this,"getHydroGeneratorWaterOutput",null);this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("steam-engine",{isOpen:()=>this.isOpen,close:()=>this.close()})}setInventory(e){this.inventory=e}setSaveCallback(e){this.onSaveCallback=e}setUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setConnectionCallbacks(e,t){this.getConnectedHydroGenerators=e,this.getHydroGeneratorWaterOutput=t}createUI(){this.steamEngineSectionElement=document.createElement("div"),this.steamEngineSectionElement.id="steam-engine-section",this.steamEngineSectionElement.className="steam-engine-section",this.steamEngineSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){this.currentSteamEngine=e,this.isOpen=!0,this.engineStates.has(e.tileIndex)||this.engineStates.set(e.tileIndex,{hasFuel:!1,fuelAmount:0,isRunning:!1,waterInput:0,steamOutput:0}),this.steamParticles=[],this.lastAnimationTime=performance.now(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startAnimation()}close(){this.currentSteamEngine=null,this.isOpen=!1,this.stopAnimation(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentSteamEngine(){return this.currentSteamEngine}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}getEngineState(e){return this.engineStates.get(e)}addFuel(){if(!this.currentSteamEngine||!this.inventory)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);e&&this.inventory.hasItem(L.COAL,1)&&(this.inventory.removeItem(L.COAL,1),e.fuelAmount+=1,e.hasFuel=!0,this.updateRunningState(e),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback())}updateRunningState(e){let t=0;if(this.currentSteamEngine&&this.getConnectedHydroGenerators&&this.getHydroGeneratorWaterOutput){const n=this.getConnectedHydroGenerators(this.currentSteamEngine.tileIndex);for(const i of n)t+=this.getHydroGeneratorWaterOutput(i)}e.waterInput=t,e.isRunning=e.hasFuel&&e.fuelAmount>0&&t>0,e.steamOutput=e.isRunning?t*.8:0}updateUI(){if(!this.currentSteamEngine)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);if(e&&(this.updateRunningState(e),this.statusIndicatorElement&&(this.statusIndicatorElement.classList.remove("running","idle","no-water"),e.isRunning?(this.statusIndicatorElement.classList.add("running"),this.statusIndicatorElement.querySelector(".status-text").textContent="Running"):e.hasFuel&&e.waterInput===0?(this.statusIndicatorElement.classList.add("no-water"),this.statusIndicatorElement.querySelector(".status-text").textContent="No Water"):(this.statusIndicatorElement.classList.add("idle"),this.statusIndicatorElement.querySelector(".status-text").textContent="Idle")),this.fuelAmountElement&&(this.fuelAmountElement.textContent=e.fuelAmount.toString()),this.waterInputElement&&(this.waterInputElement.textContent=`${e.waterInput.toFixed(1)} units/s`),this.steamOutputElement&&(this.steamOutputElement.textContent=`${e.steamOutput.toFixed(1)} units/s`),this.addFuelBtnElement&&this.inventory)){const t=this.inventory.hasItem(L.COAL,1);this.addFuelBtnElement.disabled=!t,this.addFuelBtnElement.textContent=t?"Add Coal":"No Coal"}}startAnimation(){if(this.animationFrameId!==null)return;const e=t=>{if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t,this.updateSteamParticles(n),this.drawSteamAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}updateSteamParticles(e){const t=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;((t==null?void 0:t.isRunning)??!1)&&Math.random()<e*10&&this.steamParticles.push({x:60+(Math.random()-.5)*20,y:70,size:3+Math.random()*4,opacity:.6+Math.random()*.3,vx:(Math.random()-.5)*10,vy:-20-Math.random()*15});for(let i=this.steamParticles.length-1;i>=0;i--){const s=this.steamParticles[i];s.x+=s.vx*e,s.y+=s.vy*e,s.size+=e*8,s.opacity-=e*.5,(s.opacity<=0||s.y<-10)&&this.steamParticles.splice(i,1)}}drawSteamAnimation(){if(!this.steamCanvas||!this.steamCtx)return;const e=this.steamCtx,t=this.steamCanvas.width,n=this.steamCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#1a1a2e",e.fillRect(0,0,t,n);const i=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;if(e.fillStyle="#444",e.fillRect(35,45,50,30),e.fillStyle="#555",e.fillRect(50,25,20,25),e.fillStyle="#666",e.fillRect(47,20,26,8),i!=null&&i.isRunning){e.fillStyle="#a55",e.fillRect(40,50,40,20);const s=e.createRadialGradient(60,60,0,60,60,25);s.addColorStop(0,"rgba(255, 100, 50, 0.3)"),s.addColorStop(1,"rgba(255, 100, 50, 0)"),e.fillStyle=s,e.fillRect(35,45,50,30)}else e.fillStyle="#444",e.fillRect(40,50,40,20);for(const s of this.steamParticles)e.beginPath(),e.arc(s.x,s.y,s.size,0,Math.PI*2),e.fillStyle=`rgba(200, 200, 220, ${s.opacity})`,e.fill();e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2)}exportStatesForSave(){return Array.from(this.engineStates.entries()).map(([e,t])=>({tileIndex:e,state:t}))}restoreState(e,t){this.engineStates.set(e,t)}updateAllEngines(e){if(!(!this.getConnectedHydroGenerators||!this.getHydroGeneratorWaterOutput))for(const t of e){this.engineStates.has(t)||this.engineStates.set(t,{hasFuel:!1,fuelAmount:0,isRunning:!1,waterInput:0,steamOutput:0});const n=this.engineStates.get(t);let i=0;const s=this.getConnectedHydroGenerators(t);for(const r of s)i+=this.getHydroGeneratorWaterOutput(r);n.waterInput=i,n.isRunning=n.hasFuel&&n.fuelAmount>0&&i>0,n.steamOutput=n.isRunning?i*.8:0}}}class xg extends jl{constructor(){super({id:"copper-pipe-menu",title:"Copper Pipe Network",closeOnE:!0});y(this,"currentPipe",null);y(this,"currentNetwork",null);y(this,"getHydroGeneratorInfo",null);y(this,"getSteamEngineInfo",null);this.addCustomStyles(),this.buildContent()}setMachineInfoCallbacks(t,n){this.getHydroGeneratorInfo=t,this.getSteamEngineInfo=n}addCustomStyles(){const t=document.createElement("style");t.textContent=`
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
    `)}openPipe(t,n){this.currentPipe=t,this.currentNetwork=n,this.open()}onOpen(){this.updateContent()}onClose(){this.currentPipe=null,this.currentNetwork=null}getCurrentPipe(){return this.currentPipe}updateContent(){var d,u;if(!this.currentPipe)return;const t=this.getMenuElement();if(!t)return;const n=t.querySelector("#pipe-status-indicator"),i=t.querySelector("#pipe-hydro-count"),s=t.querySelector("#pipe-steam-count"),r=t.querySelector("#pipe-segment-count"),a=t.querySelector("#pipe-machine-list");if(!this.currentNetwork){if(n){n.className="pipe-status-indicator disconnected";const f=n.querySelector(".status-text");f&&(f.textContent="Not Connected")}i&&(i.textContent="0"),s&&(s.textContent="0"),r&&(r.textContent="1"),a&&(a.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>');return}const l=this.currentNetwork.connectedHydroGenerators.length>0,c=this.currentNetwork.connectedSteamEngines.length>0,h=l&&c;if(n){const f=n.querySelector(".status-text");h?(n.className="pipe-status-indicator connected",f&&(f.textContent="Network Active")):(n.className="pipe-status-indicator disconnected",f&&(f.textContent=l||c?"Partial Connection":"Not Connected"))}if(i&&(i.textContent=this.currentNetwork.connectedHydroGenerators.length.toString()),s&&(s.textContent=this.currentNetwork.connectedSteamEngines.length.toString()),r&&(r.textContent=this.currentNetwork.pipes.length.toString()),a){a.innerHTML="";for(const f of this.currentNetwork.connectedHydroGenerators){const p=(d=this.getHydroGeneratorInfo)==null?void 0:d.call(this,f),m=document.createElement("div");m.className="pipe-machine-item hydro",m.innerHTML=`
          <span class="machine-name">Hydro Generator (Tile ${f})</span>
          <span class="machine-status ${p!=null&&p.active?"active":"inactive"}">
            ${p!=null&&p.active?"Active":"Inactive"}
          </span>
        `,a.appendChild(m)}for(const f of this.currentNetwork.connectedSteamEngines){const p=(u=this.getSteamEngineInfo)==null?void 0:u.call(this,f),m=document.createElement("div");m.className="pipe-machine-item steam",m.innerHTML=`
          <span class="machine-name">Steam Engine (Tile ${f})</span>
          <span class="machine-status ${p!=null&&p.isRunning?"active":"inactive"}">
            ${p!=null&&p.isRunning?"Running":p!=null&&p.hasFuel?"Has Fuel":"No Fuel"}
          </span>
        `,a.appendChild(m)}a.children.length===0&&(a.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>')}}getIsOpen(){return this.isOpen()}}class yg{constructor(e){y(this,"inventory");y(this,"currentFurnace",null);y(this,"furnaceSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onSaveCallback",null);y(this,"updateInterval",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);y(this,"fuelSlotElement",null);y(this,"inputSlotElement",null);y(this,"outputSlotElement",null);y(this,"progressBarElement",null);y(this,"fuelBarElement",null);y(this,"FUEL_PER_COAL",8);y(this,"SLOT_FUEL","furnace-fuel");y(this,"SLOT_INPUT","furnace-input");y(this,"SLOT_OUTPUT","furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="furnace-section",this.furnaceSectionElement.className="furnace-section",this.furnaceSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupSlotInteractions(){this.fuelSlotElement&&(this.fuelSlotElement.dataset.furnaceSlot=this.SLOT_FUEL,this.setupFurnaceSlot(this.fuelSlotElement,this.SLOT_FUEL)),this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,h;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT?(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)):t===this.SLOT_FUEL&&(n=this.currentFurnace.fuelAmount>0,n&&(i=L.COAL,s=Math.ceil(this.currentFurnace.fuelAmount/this.FUEL_PER_COAL))),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=ot[i];a.innerHTML=`<img src="${ft(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(h=e.dataTransfer)==null||h.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===L.NONE)return;const s=i.quantity;if(t===this.SLOT_FUEL)i.itemType===L.COAL&&(this.currentFurnace.fuelAmount+=s*this.FUEL_PER_COAL,this.inventory.removeItem(L.COAL,s),this.updateUI(),this.notifyChanges());else if(t===this.SLOT_INPUT){const r=Hs.find(a=>a.input===i.itemType);if(r){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputItem!==r.output)return;(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=s,this.inventory.removeItem(i.itemType,s),this.updateUI(),this.notifyChanges())}}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_FUEL?this.handleFuelSlotClick():e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();if(t.itemType===L.COAL&&t.quantity>0){const n=Math.ceil(t.quantity/2);this.currentFurnace.fuelAmount+=n*this.FUEL_PER_COAL,this.inventory.removeItem(L.COAL,n),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0,this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(Hs.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();t.itemType===L.COAL&&t.quantity>0&&(this.currentFurnace.fuelAmount+=t.quantity*this.FUEL_PER_COAL,this.inventory.removeItem(L.COAL,t.quantity),this.updateUI(),this.notifyChanges())}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleFuelSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();e.itemType===L.COAL&&e.quantity>0&&(this.currentFurnace.fuelAmount+=this.FUEL_PER_COAL,this.inventory.removeItem(L.COAL,1),this.updateUI(),this.notifyChanges())}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem(),t=Hs.find(n=>n.input===e.itemType);if(t&&e.quantity>0){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputItem!==t.output)return;if(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType){this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0);const n=e.quantity;this.currentFurnace.inputCount+=n,this.inventory.removeItem(e.itemType,n),this.updateUI(),this.notifyChanges()}}}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===L.NONE||i.itemType===n)){const r=i.itemType===n?i.quantity:0,a=64-r,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,r+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===L.NONE||i.itemType===n)){const r=i.itemType===n?i.quantity:0,a=64-r,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,r+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.fuelSlotElement){const n=this.fuelSlotElement.querySelector("img"),i=this.fuelSlotElement.querySelector(".slot-count");if(e.fuelAmount>0){n.src=ft(ot[L.COAL].texture),n.style.display="block";const s=Math.ceil(e.fuelAmount/this.FUEL_PER_COAL);i.textContent=s>1?s.toString():""}else n.style.display="none",i.textContent=""}if(this.fuelBarElement){const n=Math.min(100,e.fuelAmount/this.FUEL_PER_COAL*100);this.fuelBarElement.style.width=`${n}%`}const t=document.getElementById("fuel-remaining");if(t&&(t.textContent=`${e.fuelAmount} items remaining`),this.inputSlotElement){const n=this.inputSlotElement.querySelector("img"),i=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const s=ot[e.smeltingItem];s&&(n.src=ft(s.texture),n.style.display="block"),i.textContent=e.inputCount>1?e.inputCount.toString():""}else n.style.display="none",i.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const n=this.outputSlotElement.querySelector("img"),i=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const s=ot[e.outputItem];s&&(n.src=ft(s.texture),n.style.display="block"),i.textContent=e.outputCount>1?e.outputCount.toString():""}else n.style.display="none",i.textContent=""}}}class vg{constructor(e){y(this,"inventory");y(this,"currentFurnace",null);y(this,"furnaceSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onSaveCallback",null);y(this,"updateInterval",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);y(this,"inputSlotElement",null);y(this,"outputSlotElement",null);y(this,"progressBarElement",null);y(this,"powerStatusElement",null);y(this,"SLOT_INPUT","electric-furnace-input");y(this,"SLOT_OUTPUT","electric-furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("electric-furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="electric-furnace-section",this.furnaceSectionElement.className="electric-furnace-section",this.furnaceSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupSlotInteractions(){this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,h;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT&&(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`electric-furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=ot[i];a.innerHTML=`<img src="${ft(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(h=e.dataTransfer)==null||h.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("electric-furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===L.NONE)return;const s=i.quantity;if(t===this.SLOT_INPUT){const r=qs.find(a=>a.input===i.itemType);if(r){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputItem!==r.output)return;(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=s,this.inventory.removeItem(i.itemType,s),this.updateUI(),this.notifyChanges())}}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.inputCount--,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(qs.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem(),t=qs.find(n=>n.input===e.itemType);if(t&&e.quantity>0){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputItem!==t.output)return;if(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType){this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0);const n=e.quantity;this.currentFurnace.inputCount+=n,this.inventory.removeItem(e.itemType,n),this.updateUI(),this.notifyChanges()}}}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===L.NONE||i.itemType===n)){const r=i.itemType===n?i.quantity:0,a=64-r,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,r+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===L.NONE||i.itemType===n)){const r=i.itemType===n?i.quantity:0,a=64-r,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,r+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.powerStatusElement)if(e.isPowered){this.powerStatusElement.classList.add("powered");const t=this.powerStatusElement.querySelector(".power-text");t&&(t.textContent="Powered")}else{this.powerStatusElement.classList.remove("powered");const t=this.powerStatusElement.querySelector(".power-text");t&&(t.textContent="No Power")}if(this.inputSlotElement){const t=this.inputSlotElement.querySelector("img"),n=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const i=ot[e.smeltingItem];i&&(t.src=ft(i.texture),t.style.display="block"),n.textContent=e.inputCount>1?e.inputCount.toString():""}else t.style.display="none",n.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const t=this.outputSlotElement.querySelector("img"),n=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const i=ot[e.outputItem];i&&(t.src=ft(i.texture),t.style.display="block"),n.textContent=e.outputCount>1?e.outputCount.toString():""}else t.style.display="none",n.textContent=""}}}const xl=[{name:"CPU Chip",inputs:[{itemType:L.STONE,quantity:1,slot:0},{itemType:L.STONE,quantity:1,slot:1},{itemType:L.STONE,quantity:1,slot:2},{itemType:L.INGOT_COPPER,quantity:1,slot:3},{itemType:L.INGOT_COBALT,quantity:1,slot:4},{itemType:L.INGOT_GOLD,quantity:1,slot:5},{itemType:L.INGOT_COPPER,quantity:1,slot:6},{itemType:L.STONE,quantity:1,slot:7},{itemType:L.STONE,quantity:1,slot:8}],output:{itemType:L.CPU_CHIP,quantity:1}},{name:"RAM Module",inputs:[{itemType:L.STONE,quantity:1,slot:0},{itemType:L.STONE,quantity:1,slot:1},{itemType:L.STONE,quantity:1,slot:2},{itemType:L.INGOT_COPPER,quantity:1,slot:3},{itemType:L.INGOT_COPPER,quantity:1,slot:4},{itemType:L.INGOT_COPPER,quantity:1,slot:5}],output:{itemType:L.RAM_MODULE,quantity:1}},{name:"Motherboard",inputs:[{itemType:L.STONE,quantity:1,slot:0},{itemType:L.STONE,quantity:1,slot:1},{itemType:L.STONE,quantity:1,slot:2},{itemType:L.STONE,quantity:1,slot:3},{itemType:L.INGOT_GOLD,quantity:1,slot:4},{itemType:L.STONE,quantity:1,slot:5},{itemType:L.STONE,quantity:1,slot:6},{itemType:L.STONE,quantity:1,slot:7},{itemType:L.STONE,quantity:1,slot:8}],output:{itemType:L.MOTHERBOARD,quantity:1}}];class _g{constructor(e){y(this,"inventory");y(this,"currentWorkbench",null);y(this,"workbenchSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);y(this,"craftingSlots",[]);y(this,"craftingSlotElements",[]);y(this,"outputSlotElement",null);y(this,"powerStatusElement",null);y(this,"isPowered",!1);y(this,"isPoweredCallback",null);this.inventory=e;for(let t=0;t<9;t++)this.craftingSlots.push({itemType:L.NONE,quantity:0});this.createUI(),this.setupKeyboardHandler(),Pt.registerMenu("electronics-workbench",{isOpen:()=>this.isOpen,close:()=>this.close()})}setIsPoweredCallback(e){this.isPoweredCallback=e}createUI(){this.workbenchSectionElement=document.createElement("div"),this.workbenchSectionElement.id="electronics-workbench-section",this.workbenchSectionElement.className="electronics-workbench-section",this.workbenchSectionElement.innerHTML=`
      <h3>Electronics Workbench</h3>

      <div class="electronics-power-status" id="electronics-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="electronics-workbench-grid">
        <div class="electronics-crafting-section">
          <div class="electronics-crafting-grid">
            ${[0,1,2,3,4,5,6,7,8].map(t=>`
              <div class="electronics-slot" id="electronics-slot-${t}" data-slot="${t}">
                <img style="display:none;">
                <span class="slot-count"></span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="electronics-arrow-section">
          <span class="arrow-icon">→</span>
        </div>

        <div class="electronics-output-section">
          <div class="slot-label">Output</div>
          <div class="electronics-slot electronics-output-slot" id="electronics-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="electronics-recipe-list">
        <div class="recipe-label">Recipes:</div>
        <div class="recipe-items">
          ${xl.map(t=>`<span class="recipe-item">${t.name}</span>`).join("")}
        </div>
      </div>

      <div class="electronics-hint">
        <p>Requires power from Steam Engine or Hydro Generator</p>
        <p>Connect via cables to power</p>
      </div>
    `;const e=document.querySelector(".inventory-container");if(e){const t=e.querySelector(".inventory-section");t?e.insertBefore(this.workbenchSectionElement,t):e.appendChild(this.workbenchSectionElement)}for(let t=0;t<9;t++){const n=document.getElementById(`electronics-slot-${t}`);n&&this.craftingSlotElements.push(n)}this.outputSlotElement=document.getElementById("electronics-output-slot"),this.powerStatusElement=document.getElementById("electronics-power-status"),this.setupSlotInteractions(),this.addStyles()}addStyles(){const e="electronics-workbench-styles";if(document.getElementById(e))return;const t=document.createElement("style");t.id=e,t.textContent=`
      .electronics-workbench-section {
        display: none;
        background: rgba(40, 35, 30, 0.95);
        border: 2px solid #8B7355;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .electronics-workbench-section.open {
        display: block;
      }

      .electronics-workbench-section h3 {
        margin: 0 0 10px 0;
        color: #FFD700;
        text-align: center;
        font-size: 16px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .electronics-power-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px;
        margin-bottom: 10px;
        background: rgba(60, 40, 40, 0.8);
        border-radius: 4px;
        font-size: 14px;
      }

      .electronics-power-status.powered {
        background: rgba(40, 80, 40, 0.8);
      }

      .electronics-power-status .power-icon {
        font-size: 18px;
      }

      .electronics-power-status.powered .power-text {
        color: #90EE90;
      }

      .electronics-workbench-grid {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin-bottom: 10px;
      }

      .electronics-crafting-grid {
        display: grid;
        grid-template-columns: repeat(3, 48px);
        grid-template-rows: repeat(3, 48px);
        gap: 4px;
      }

      .electronics-slot {
        width: 48px;
        height: 48px;
        background: rgba(60, 50, 40, 0.9);
        border: 2px solid #5C4033;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .electronics-slot:hover {
        border-color: #8B7355;
      }

      .electronics-slot img {
        max-width: 40px;
        max-height: 40px;
        image-rendering: pixelated;
      }

      .electronics-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 1px black;
        font-weight: bold;
      }

      .electronics-output-slot {
        background: rgba(80, 60, 40, 0.9);
        border-color: #8B7355;
      }

      .electronics-arrow-section {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .electronics-arrow-section .arrow-icon {
        font-size: 32px;
        color: #8B7355;
      }

      .electronics-output-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .electronics-output-section .slot-label {
        font-size: 12px;
        color: #B8A080;
      }

      .electronics-recipe-list {
        background: rgba(50, 40, 35, 0.8);
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 10px;
      }

      .electronics-recipe-list .recipe-label {
        font-size: 12px;
        color: #B8A080;
        margin-bottom: 4px;
      }

      .electronics-recipe-list .recipe-items {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .electronics-recipe-list .recipe-item {
        font-size: 11px;
        color: #90EE90;
        background: rgba(40, 60, 40, 0.6);
        padding: 2px 6px;
        border-radius: 3px;
      }

      .electronics-hint {
        text-align: center;
        font-size: 11px;
        color: #999;
      }

      .electronics-hint p {
        margin: 2px 0;
      }
    `,document.head.appendChild(t)}setupSlotInteractions(){this.craftingSlotElements.forEach((e,t)=>{e.addEventListener("click",()=>this.handleCraftingSlotClick(t)),e.addEventListener("dragover",n=>{n.preventDefault(),e.style.borderColor="#FFD700"}),e.addEventListener("dragleave",()=>{e.style.borderColor="#5C4033"}),e.addEventListener("drop",n=>{n.preventDefault(),e.style.borderColor="#5C4033",this.handleDrop(n,t)})}),this.outputSlotElement&&this.outputSlotElement.addEventListener("click",()=>this.handleOutputClick())}handleCraftingSlotClick(e){if(!this.isPowered)return;const t=this.inventory.getSelectedItem(),n=this.craftingSlots[e];if(t.itemType!==L.NONE&&t.quantity>0)n.itemType===L.NONE?(this.craftingSlots[e]={itemType:t.itemType,quantity:1},this.inventory.removeItem(t.itemType,1)):n.itemType===t.itemType&&n.quantity<64&&(this.craftingSlots[e].quantity+=1,this.inventory.removeItem(t.itemType,1));else if(n.itemType!==L.NONE){const i=this.inventory.addItem(n.itemType,n.quantity);i===0?this.craftingSlots[e]={itemType:L.NONE,quantity:0}:this.craftingSlots[e].quantity=i}this.updateUI(),this.notifyChanges()}handleDrop(e,t){var i;if(!this.isPowered)return;const n=(i=e.dataTransfer)==null?void 0:i.getData("text/plain");if(n&&n.startsWith("inventory:")){const s=parseInt(n.replace("inventory:",""),10);this.handleDropFromInventory(s,t)}}handleDropFromInventory(e,t){const n=this.inventory.getSlot(e);if(!n||n.itemType===L.NONE)return;const i=this.craftingSlots[t],s=n.quantity;if(i.itemType===L.NONE)this.craftingSlots[t]={itemType:n.itemType,quantity:s},this.inventory.removeItem(n.itemType,s);else if(i.itemType===n.itemType){const r=Math.min(64-i.quantity,s);this.craftingSlots[t].quantity+=r,this.inventory.removeItem(n.itemType,r)}this.updateUI(),this.notifyChanges()}handleOutputClick(){if(!this.isPowered)return;const e=this.findMatchingRecipe();if(e){for(const t of e.inputs){const n=this.craftingSlots[t.slot];n.quantity-=t.quantity,n.quantity<=0&&(this.craftingSlots[t.slot]={itemType:L.NONE,quantity:0})}this.inventory.addItem(e.output.itemType,e.output.quantity),this.updateUI(),this.notifyChanges()}}findMatchingRecipe(){for(const e of xl){let t=!0;for(const n of e.inputs){const i=this.craftingSlots[n.slot];if(i.itemType!==n.itemType||i.quantity<n.quantity){t=!1;break}}if(t){const n=new Set(e.inputs.map(i=>i.slot));for(let i=0;i<9;i++)if(!n.has(i)&&this.craftingSlots[i].itemType!==L.NONE){t=!1;break}}if(t)return e}return null}open(e){this.currentWorkbench=e,this.isOpen=!0,this.isPoweredCallback&&(this.isPowered=this.isPoweredCallback(e.tileIndex)),this.workbenchSectionElement&&(this.workbenchSectionElement.style.display="block"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI()}close(){for(let e=0;e<9;e++){const t=this.craftingSlots[e];t.itemType!==L.NONE&&t.quantity>0&&(this.inventory.addItem(t.itemType,t.quantity),this.craftingSlots[e]={itemType:L.NONE,quantity:0})}this.isOpen=!1,this.currentWorkbench=null,this.isPowered=!1,this.workbenchSectionElement&&(this.workbenchSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback(),this.notifyChanges()}isMenuOpen(){return this.isOpen}setupKeyboardHandler(){document.addEventListener("keydown",e=>{this.isOpen&&(e.key==="Escape"||e.key==="e"||e.key==="E")&&(e.preventDefault(),this.close())})}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}notifyChanges(){this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}updateUI(){if(this.currentWorkbench&&(this.powerStatusElement&&(this.isPowered?(this.powerStatusElement.classList.add("powered"),this.powerStatusElement.querySelector(".power-text").textContent="Powered"):(this.powerStatusElement.classList.remove("powered"),this.powerStatusElement.querySelector(".power-text").textContent="No Power")),this.craftingSlotElements.forEach((e,t)=>{const n=this.craftingSlots[t],i=e.querySelector("img"),s=e.querySelector(".slot-count");if(n.itemType!==L.NONE&&n.quantity>0){const r=ot[n.itemType];i.src=ft(r.texture),i.style.display="block",s.textContent=n.quantity>1?n.quantity.toString():""}else i.style.display="none",s.textContent="";e.style.opacity=this.isPowered?"1":"0.5"}),this.outputSlotElement)){const e=this.isPowered?this.findMatchingRecipe():null,t=this.outputSlotElement.querySelector("img"),n=this.outputSlotElement.querySelector(".slot-count");if(e){const i=ot[e.output.itemType];t.src=ft(i.texture),t.style.display="block",n.textContent=e.output.quantity>1?e.output.quantity.toString():""}else t.style.display="none",n.textContent="";this.outputSlotElement.style.opacity=this.isPowered?"1":"0.5"}}}class bg{constructor(e){y(this,"inventory");y(this,"currentStorage",null);y(this,"storageType",null);y(this,"storageSectionElement",null);y(this,"storageGridElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onSaveCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);this.inventory=e,this.createUI(),Pt.registerMenu("storage",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.storageSectionElement=document.createElement("div"),this.storageSectionElement.id="storage-section",this.storageSectionElement.className="storage-section",this.storageSectionElement.innerHTML=`
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
    `,document.head.appendChild(t)}createStorageSlots(){if(!this.storageGridElement)return;this.storageGridElement.innerHTML="";const e=this.storageType==="garbage"?Vs:Ws;for(let t=0;t<e;t++){const n=document.createElement("div");n.className="storage-slot",n.dataset.storageSlot=t.toString(),n.draggable=!0;const i=document.createElement("img");i.style.display="none",i.draggable=!1,n.appendChild(i);const s=document.createElement("span");s.className="slot-count",n.appendChild(s),this.setupSlotEvents(n,t),this.storageGridElement.appendChild(n)}}setupSlotEvents(e,t){e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDrop(n,t)})}handleDragStart(e,t){var r,a;if(!this.currentStorage){e.preventDefault();return}const n=this.currentStorage.slots[t];if(!n||n.itemType===L.NONE){e.preventDefault();return}(r=e.dataTransfer)==null||r.setData("text/plain",`storage:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const i=document.createElement("div");i.className="drag-ghost";const s=ot[n.itemType];i.innerHTML=`<img src="${ft(s.texture)}" style="width:32px;height:32px;image-rendering:pixelated;">`,n.quantity>1&&(i.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),i.style.cssText="position:fixed;top:-100px;left:-100px;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.8);border:2px solid #4CAF50;border-radius:4px;padding:4px;",document.body.appendChild(i),(a=e.dataTransfer)==null||a.setDragImage(i,20,20),setTimeout(()=>i.remove(),0)}handleDrop(e,t){var s;if(!this.currentStorage)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.transferFromInventory(i,t);return}if(n.startsWith("storage:")){const r=parseInt(n.replace("storage:",""));this.swapStorageSlots(r,t)}}transferFromInventory(e,t){if(!this.currentStorage)return;const n=this.inventory.getSlot(e);if(!n||n.itemType===L.NONE)return;const i=this.currentStorage.slots[t],s=ot[n.itemType];if(i.itemType===L.NONE)i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,L.NONE,0);else if(i.itemType===n.itemType){const r=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=r;const a=n.quantity-r;a>0?this.inventory.setSlot(e,n.itemType,a):this.inventory.setSlot(e,L.NONE,0)}else{const r=i.itemType,a=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,r,a)}this.updateUI(),this.notifyChanges()}swapStorageSlots(e,t){if(!this.currentStorage||e===t)return;const n=this.currentStorage.slots[e],i=this.currentStorage.slots[t];if(i.itemType===L.NONE)i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=L.NONE,n.quantity=0;else if(i.itemType===n.itemType){const s=ot[n.itemType],r=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=r,n.quantity-=r,n.quantity===0&&(n.itemType=L.NONE)}else{const s=i.itemType,r=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=s,n.quantity=r}this.updateUI(),this.notifyChanges()}handleSlotClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];t.itemType!==L.NONE&&t.quantity>0&&this.inventory.addItem(t.itemType,1)===0&&(t.quantity--,t.quantity===0&&(t.itemType=L.NONE),this.updateUI(),this.notifyChanges())}handleRightClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===L.NONE||t.quantity===0)return;const n=Math.ceil(t.quantity/2),i=this.inventory.addItem(t.itemType,n),s=n-i;s>0&&(t.quantity-=s,t.quantity===0&&(t.itemType=L.NONE),this.updateUI(),this.notifyChanges())}handleShiftClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===L.NONE||t.quantity===0)return;const n=this.inventory.addItem(t.itemType,t.quantity);n<t.quantity&&(t.quantity=n,n===0&&(t.itemType=L.NONE),this.updateUI(),this.notifyChanges())}handleDropToInventory(e,t){if(!this.currentStorage||!t.startsWith("storage:"))return!1;const n=parseInt(t.replace("storage:","")),i=this.currentStorage.slots[n];if(!i||i.itemType===L.NONE)return!1;const s=this.inventory.getSlot(e);if(!s)return!1;const r=ot[i.itemType];if(s.itemType===L.NONE)this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=L.NONE,i.quantity=0;else if(s.itemType===i.itemType){const a=Math.min(i.quantity,r.stackSize-s.quantity);a>0&&(this.inventory.setSlot(e,s.itemType,s.quantity+a),i.quantity-=a,i.quantity===0&&(i.itemType=L.NONE))}else{const a=s.itemType,l=s.quantity;this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=a,i.quantity=l}return this.updateUI(),this.notifyChanges(),!0}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}open(e){"rotation"in e?this.openChest(e):this.openGarbagePile(e)}openChest(e){this.currentStorage=e,this.storageType="chest",this.openStorage("Storage Chest")}openGarbagePile(e){this.currentStorage=e,this.storageType="garbage",this.openStorage("Garbage Pile")}openStorage(e){if(!this.storageSectionElement)return;const t=document.getElementById("storage-title");t&&(t.textContent=e),this.storageSectionElement.classList.toggle("garbage",this.storageType==="garbage"),this.createStorageSlots(),this.storageSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback()}close(){this.storageSectionElement&&(this.storageSectionElement.style.display="none",this.isOpen=!1,this.currentStorage=null,this.storageType=null,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}getCurrentStorage(){return this.currentStorage}getStorageType(){return this.storageType}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}updateUI(){if(!this.currentStorage||!this.storageGridElement)return;this.storageGridElement.querySelectorAll(".storage-slot").forEach((t,n)=>{const i=this.currentStorage.slots[n],s=t.querySelector("img"),r=t.querySelector(".slot-count");if(i&&i.itemType!==L.NONE&&i.quantity>0){const a=ot[i.itemType];a&&(s.src=ft(a.texture),s.style.display="block",r.textContent=i.quantity>1?i.quantity.toString():"")}else s.style.display="none",r.textContent=""})}}const Vi="tenebris_player",Os="tenebris_earth",Fs="tenebris_moon",qi="tenebris_save",Xi=2;class Sg{constructor(){y(this,"playerData",null);y(this,"inventory",[]);y(this,"planetData",new Map);y(this,"autoSaveInterval",null);y(this,"onPlayerSave",null);this.planetData.set("earth",{tileChanges:new Map,torches:[],furnaces:[],electricFurnaces:[],electronicsWorkbenches:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],cables:[],removedTrees:[]}),this.planetData.set("moon",{tileChanges:new Map,torches:[],furnaces:[],electricFurnaces:[],electronicsWorkbenches:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],cables:[],removedTrees:[]})}setPlayerSaveCallback(e){this.onPlayerSave=e}startAutoSave(e=5){this.autoSaveInterval!==null&&clearInterval(this.autoSaveInterval),this.autoSaveInterval=window.setInterval(()=>{this.savePlayerPosition()},e*1e3)}stopAutoSave(){this.autoSaveInterval!==null&&(clearInterval(this.autoSaveInterval),this.autoSaveInterval=null)}saveTileChange(e,t,n,i){const s=this.planetData.get(e);if(!s)return;const r=`${t}:${n}`;s.tileChanges.set(r,{tileIndex:t,depth:n,blockType:i}),this.persistPlanetToStorage(e)}saveInventory(e){this.inventory=[...e],this.persistPlayerToStorage()}saveTorch(e,t,n){const i=this.planetData.get(e);i&&(i.torches.push({tileIndex:t,position:n}),this.persistPlanetToStorage(e))}removeTorch(e){for(const[n,i]of this.planetData){const s=i.torches.length;i.torches=i.torches.filter(r=>Math.abs(r.position.x-e.x)>.01||Math.abs(r.position.y-e.y)>.01||Math.abs(r.position.z-e.z)>.01),i.torches.length!==s&&this.persistPlanetToStorage(n)}}getTorches(){const e=[];for(const[t,n]of this.planetData)for(const i of n.torches)e.push({...i,planetId:t});return e}saveFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.furnaces=i.furnaces.filter(s=>s.tileIndex!==t),i.furnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeFurnace(e,t){const n=this.planetData.get(e);n&&(n.furnaces=n.furnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.furnaces)e.push({...i,planetId:t});return e}saveElectricFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.electricFurnaces=i.electricFurnaces.filter(s=>s.tileIndex!==t),i.electricFurnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeElectricFurnace(e,t){const n=this.planetData.get(e);n&&(n.electricFurnaces=n.electricFurnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getElectricFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.electricFurnaces)e.push({...i,planetId:t});return e}saveElectronicsWorkbench(e,t,n){const i=this.planetData.get(e);i&&(i.electronicsWorkbenches=i.electronicsWorkbenches.filter(s=>s.tileIndex!==t),i.electronicsWorkbenches.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeElectronicsWorkbench(e,t){const n=this.planetData.get(e);n&&(n.electronicsWorkbenches=n.electronicsWorkbenches.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getElectronicsWorkbenches(){const e=[];for(const[t,n]of this.planetData)for(const i of n.electronicsWorkbenches)e.push({...i,planetId:t});return e}saveStorageChest(e,t,n){const i=this.planetData.get(e);i&&(i.storageChests=i.storageChests.filter(s=>s.tileIndex!==t),i.storageChests.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeStorageChest(e,t){const n=this.planetData.get(e);n&&(n.storageChests=n.storageChests.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getStorageChests(){const e=[];for(const[t,n]of this.planetData)for(const i of n.storageChests)e.push({...i,planetId:t});return e}saveGarbagePile(e,t,n){const i=this.planetData.get(e);i&&(i.garbagePiles=i.garbagePiles.filter(s=>s.tileIndex!==t),i.garbagePiles.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeGarbagePile(e,t){const n=this.planetData.get(e);n&&(n.garbagePiles=n.garbagePiles.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getGarbagePiles(){const e=[];for(const[t,n]of this.planetData)for(const i of n.garbagePiles)e.push({...i,planetId:t});return e}saveSteamEngine(e,t,n){const i=this.planetData.get(e);i&&(i.steamEngines=i.steamEngines.filter(s=>s.tileIndex!==t),i.steamEngines.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeSteamEngine(e,t){const n=this.planetData.get(e);n&&(n.steamEngines=n.steamEngines.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getSteamEngines(){const e=[];for(const[t,n]of this.planetData)for(const i of n.steamEngines)e.push({...i,planetId:t});return e}saveHydroGenerator(e,t,n){const i=this.planetData.get(e);i&&(i.hydroGenerators=i.hydroGenerators.filter(s=>s.tileIndex!==t),i.hydroGenerators.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeHydroGenerator(e,t){const n=this.planetData.get(e);n&&(n.hydroGenerators=n.hydroGenerators.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getHydroGenerators(){const e=[];for(const[t,n]of this.planetData)for(const i of n.hydroGenerators)e.push({...i,planetId:t});return e}saveCopperPipe(e,t,n,i){const s=this.planetData.get(e);s&&(s.copperPipes=s.copperPipes.filter(r=>!(r.tileIndex===t&&r.depth===n)),s.copperPipes.push({tileIndex:t,depth:n,...i}),this.persistPlanetToStorage(e))}removeCopperPipe(e,t,n){const i=this.planetData.get(e);i&&(i.copperPipes=i.copperPipes.filter(s=>!(s.tileIndex===t&&s.depth===n)),this.persistPlanetToStorage(e))}getCopperPipes(){const e=[];for(const[t,n]of this.planetData)for(const i of n.copperPipes)e.push({...i,planetId:t});return e}saveCable(e,t,n,i){const s=this.planetData.get(e);s&&(s.cables=s.cables.filter(r=>!(r.tileIndex===t&&r.depth===n)),s.cables.push({tileIndex:t,depth:n,...i}),this.persistPlanetToStorage(e))}removeCable(e,t,n){const i=this.planetData.get(e);i&&(i.cables=i.cables.filter(s=>!(s.tileIndex===t&&s.depth===n)),this.persistPlanetToStorage(e))}getCables(){const e=[];for(const[t,n]of this.planetData)for(const i of n.cables)e.push({...i,planetId:t});return e}saveRemovedTree(e,t){const n=this.planetData.get(e);n&&(n.removedTrees.some(i=>i.tileIndex===t)||(n.removedTrees.push({tileIndex:t}),this.persistPlanetToStorage(e)))}getRemovedTrees(e){const t=this.planetData.get(e);return(t==null?void 0:t.removedTrees)||[]}savePlayerPosition(){if(this.onPlayerSave){const e=this.onPlayerSave();this.playerData={version:Xi,timestamp:Date.now(),position:e.position,orientation:e.orientation,velocity:e.velocity,inventory:this.inventory},this.persistPlayerToStorage()}}load(){if(this.migrateLegacySave(),this.loadPlayerData(),this.loadPlanetData("earth"),this.loadPlanetData("moon"),!this.playerData&&this.inventory.length===0){let t=!1;for(const n of this.planetData.values())if(n.tileChanges.size>0||n.torches.length>0||n.furnaces.length>0){t=!0;break}if(!t)return null}const e=[];for(const[t,n]of this.planetData)for(const i of n.tileChanges.values())e.push({...i,planetId:t});return{version:Xi,timestamp:Date.now(),tileChanges:e,inventory:this.inventory,player:this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:{position:{x:0,y:0,z:0},orientation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0}},torches:this.getTorches(),furnaces:this.getFurnaces()}}loadPlayerData(){try{const e=localStorage.getItem(Vi);if(!e)return;const t=JSON.parse(e);this.playerData=t,this.inventory=t.inventory||[]}catch(e){console.error("Failed to load player data:",e)}}loadPlanetData(e){try{const t=e==="earth"?Os:Fs,n=localStorage.getItem(t);if(!n)return;const i=JSON.parse(n),s=this.planetData.get(e);if(!s)return;s.tileChanges.clear();for(const r of i.tileChanges){const a=`${r.tileIndex}:${r.depth}`;s.tileChanges.set(a,r)}s.torches=i.torches||[],s.furnaces=i.furnaces||[],s.electricFurnaces=i.electricFurnaces||[],s.electronicsWorkbenches=i.electronicsWorkbenches||[],s.storageChests=i.storageChests||[],s.garbagePiles=i.garbagePiles||[],s.steamEngines=i.steamEngines||[],s.hydroGenerators=i.hydroGenerators||[],s.copperPipes=i.copperPipes||[],s.cables=i.cables||[],s.removedTrees=i.removedTrees||[]}catch(t){console.error(`Failed to load ${e} data:`,t)}}migrateLegacySave(){var e,t,n;try{const i=localStorage.getItem(qi);if(!i)return;if(localStorage.getItem(Vi)!==null){localStorage.removeItem(qi);return}console.log("Migrating legacy save data to new format...");const s=JSON.parse(i);this.inventory=s.inventory||[],this.playerData={version:Xi,timestamp:s.timestamp,position:((e=s.player)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=s.player)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=s.player)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};for(const r of s.tileChanges||[]){const a=this.planetData.get(r.planetId);if(a){const l=`${r.tileIndex}:${r.depth}`;a.tileChanges.set(l,{tileIndex:r.tileIndex,depth:r.depth,blockType:r.blockType})}}for(const r of s.torches||[]){const a=this.planetData.get(r.planetId);a&&a.torches.push({tileIndex:r.tileIndex,position:r.position})}for(const r of s.furnaces||[]){const a=this.planetData.get(r.planetId);a&&a.furnaces.push({tileIndex:r.tileIndex,position:r.position,rotation:r.rotation,fuelAmount:r.fuelAmount,smeltingItem:r.smeltingItem,smeltingProgress:r.smeltingProgress,inputCount:r.inputCount??0,outputItem:r.outputItem,outputCount:r.outputCount})}this.persistPlayerToStorage(),this.persistPlanetToStorage("earth"),this.persistPlanetToStorage("moon"),localStorage.removeItem(qi),console.log("Migration complete!")}catch(i){console.error("Failed to migrate legacy save:",i)}}getTileChangesForPlanet(e){const t=this.planetData.get(e);if(!t)return[];const n=[];for(const i of t.tileChanges.values())n.push({...i,planetId:e});return n}getInventory(){return this.inventory}getPlayerData(){return this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:null}clearSave(){this.playerData=null,this.inventory=[];for(const e of this.planetData.values())e.tileChanges.clear(),e.torches=[],e.furnaces=[],e.electricFurnaces=[],e.electronicsWorkbenches=[],e.storageChests=[],e.garbagePiles=[],e.steamEngines=[],e.hydroGenerators=[],e.copperPipes=[],e.cables=[],e.removedTrees=[];localStorage.removeItem(Vi),localStorage.removeItem(Os),localStorage.removeItem(Fs),localStorage.removeItem(qi)}persistPlayerToStorage(){var e,t,n;try{const i={version:Xi,timestamp:Date.now(),position:((e=this.playerData)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=this.playerData)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=this.playerData)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};localStorage.setItem(Vi,JSON.stringify(i))}catch(i){console.error("Failed to save player data:",i)}}persistPlanetToStorage(e){try{const t=this.planetData.get(e);if(!t)return;const n={version:Xi,timestamp:Date.now(),tileChanges:Array.from(t.tileChanges.values()),torches:t.torches,furnaces:t.furnaces,electricFurnaces:t.electricFurnaces,electronicsWorkbenches:t.electronicsWorkbenches,storageChests:t.storageChests,garbagePiles:t.garbagePiles,steamEngines:t.steamEngines,hydroGenerators:t.hydroGenerators,copperPipes:t.copperPipes,cables:t.cables,removedTrees:t.removedTrees},i=e==="earth"?Os:Fs;localStorage.setItem(i,JSON.stringify(n))}catch(t){console.error(`Failed to save ${e} data:`,t)}}hasSavedData(){return localStorage.getItem(Vi)!==null||localStorage.getItem(Os)!==null||localStorage.getItem(Fs)!==null||localStorage.getItem(qi)!==null}}const Ye=new Sg;function yl(o){switch(o){case P.STONE:return L.STONE;case P.DIRT:return L.DIRT;case P.GRASS:return L.DIRT;case P.WOOD:return L.WOOD;case P.SAND:return L.SAND;case P.ORE_COAL:return L.ORE_COAL;case P.ORE_COPPER:return L.ORE_COPPER;case P.ORE_IRON:return L.ORE_IRON;case P.ORE_GOLD:return L.ORE_GOLD;case P.ORE_LITHIUM:return L.ORE_LITHIUM;case P.ORE_ALUMINUM:return L.ORE_ALUMINUM;case P.ORE_COBALT:return L.ORE_COBALT;case P.SNOW:return L.SNOW;case P.DIRT_SNOW:return L.DIRT;case P.ICE:return L.ICE;default:return L.NONE}}function Tg(o){switch(o){case L.STONE:return P.STONE;case L.DIRT:return P.DIRT;case L.GRASS:return P.DIRT;case L.WOOD:return P.WOOD;case L.SAND:return P.SAND;case L.ORE_COAL:return P.ORE_COAL;case L.ORE_COPPER:return P.ORE_COPPER;case L.ORE_IRON:return P.ORE_IRON;case L.ORE_GOLD:return P.ORE_GOLD;case L.ORE_LITHIUM:return P.ORE_LITHIUM;case L.ORE_ALUMINUM:return P.ORE_ALUMINUM;case L.ORE_COBALT:return P.ORE_COBALT;case L.SNOW:return P.SNOW;case L.ICE:return P.ICE;default:return P.AIR}}class Eg{constructor(e,t,n){y(this,"planets");y(this,"player");y(this,"scene");y(this,"raycaster");y(this,"inventory");y(this,"craftingSystem");y(this,"blockWireframe",null);y(this,"wireframeCache",null);y(this,"wireframeVertPool",[]);y(this,"treeManager",null);y(this,"heldTorch",null);y(this,"torchManager");y(this,"furnaceManager");y(this,"furnaceUI");y(this,"miningFurnaceTarget",null);y(this,"storageChestManager");y(this,"garbagePileManager");y(this,"storageUI");y(this,"miningStorageTarget",null);y(this,"miningGarbageTarget",null);y(this,"steamEngineManager");y(this,"miningSteamEngineTarget",null);y(this,"hydroGeneratorManager");y(this,"hydroGeneratorUI");y(this,"miningHydroGeneratorTarget",null);y(this,"copperPipeManager");y(this,"copperPipeUI");y(this,"steamEngineUI");y(this,"miningCopperPipeTarget",null);y(this,"pipeConnectionRebuildTimer",0);y(this,"PIPE_CONNECTION_REBUILD_INTERVAL",1);y(this,"cableNodeManager");y(this,"miningCableTarget",null);y(this,"cableConnectionRebuildTimer",0);y(this,"electricFurnaceManager");y(this,"electricFurnaceUI");y(this,"miningElectricFurnaceTarget",null);y(this,"electronicsWorkbenchManager");y(this,"electronicsWorkbenchUI");y(this,"miningElectronicsWorkbenchTarget",null);y(this,"rightClickCooldown",0);y(this,"CLICK_COOLDOWN",.25);y(this,"MAX_REACH",8);y(this,"miningTarget",null);y(this,"miningTreeTarget",null);y(this,"miningProgress",0);y(this,"miningProgressContainer",null);y(this,"miningProgressBar",null);y(this,"draggedSlotIndex",null);y(this,"dragGhost",null);y(this,"selectionLabelTimeout",null);y(this,"selectionLabelElement",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new Vh,this.inventory=new Jm,this.torchManager=new ng(n),this.heldTorch=new tg(t.camera,n);const i=e.find(a=>a.radius>50),s=(i==null?void 0:i.center)||new R(0,0,0),r=new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize();this.furnaceManager=new ig(n,s,r),this.furnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllFurnaceStates()}),this.furnaceUI=new yg(this.inventory),this.furnaceUI.setOnCloseCallback(()=>{}),this.furnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllFurnaceStates()}),this.furnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.furnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.furnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.storageChestManager=new sg(n,s,r),this.garbagePileManager=new rg(n,s,r),this.steamEngineManager=new lg(n,s,r),this.hydroGeneratorManager=new cg(n,s,r),this.hydroGeneratorUI=new mg,this.hydroGeneratorUI.setOnCloseCallback(()=>{}),this.hydroGeneratorUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.copperPipeManager=new hg(n,s,r),this.copperPipeUI=new xg,this.copperPipeUI.setOnCloseCallback(()=>{}),this.steamEngineUI=new gg,this.steamEngineUI.setInventory(this.inventory),this.steamEngineUI.setOnCloseCallback(()=>{}),this.steamEngineUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.steamEngineUI.setSaveCallback(()=>{this.saveInventory(),this.saveSteamEngineStates()}),this.steamEngineUI.setUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.copperPipeManager.setMachineCallbacks(a=>this.hydroGeneratorManager.getHydroGeneratorAtTile(a),a=>this.steamEngineManager.getSteamEngineAtTile(a),a=>this.getNeighborTileIndices(a)),this.cableNodeManager=new ug(n,s,r),this.electricFurnaceManager=new dg(n,s,r),this.electricFurnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllElectricFurnaceStates()}),this.electricFurnaceUI=new vg(this.inventory),this.electricFurnaceUI.setOnCloseCallback(()=>{}),this.electricFurnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllElectricFurnaceStates()}),this.electricFurnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.electricFurnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.electricFurnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.electronicsWorkbenchManager=new fg(n,s,r),this.electronicsWorkbenchUI=new _g(this.inventory),this.electronicsWorkbenchUI.setOnCloseCallback(()=>{}),this.electronicsWorkbenchUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.electronicsWorkbenchUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.electronicsWorkbenchUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.electronicsWorkbenchUI.setIsPoweredCallback(a=>this.cableNodeManager.isElectricFurnaceConnectedToRunningSteamEngine(a,l=>{const c=this.steamEngineManager.getSteamEngineAtTile(l);return(c==null?void 0:c.isRunning)??!1})),this.cableNodeManager.setMachineCallbacks(a=>this.steamEngineManager.getSteamEngineAtTile(a),a=>this.electricFurnaceManager.getElectricFurnaceAtTile(a),a=>this.electronicsWorkbenchManager.getElectronicsWorkbenchAtTile(a),a=>this.getNeighborTileIndices(a)),this.hydroGeneratorUI.setConnectionCallback(a=>this.copperPipeManager.isHydroConnectedToSteam(a)),this.steamEngineUI.setConnectionCallbacks(a=>this.copperPipeManager.getConnectedHydroGenerators(a),a=>{const l=this.hydroGeneratorManager.getHydroGeneratorAtTile(a);return l!=null&&l.isActive?l.waterPumpedOut:0}),this.storageUI=new bg(this.inventory),this.storageUI.setOnCloseCallback(()=>{}),this.storageUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllStorageStates()}),this.storageUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.storageUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.storageUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.craftingSystem=new pg(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{this.furnaceUI.close(),this.electricFurnaceUI.close(),this.electronicsWorkbenchUI.close(),this.storageUI.close(),this.hydroGeneratorUI.close(),this.steamEngineUI.close(),this.copperPipeUI.close()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.craftingSystem.setOnSaveCallback(()=>{this.saveInventory()}),this.craftingSystem.setOnFurnaceDropCallback((a,l)=>this.furnaceUI.handleDropToInventory(a,l)),this.craftingSystem.setOnElectricFurnaceDropCallback((a,l)=>this.electricFurnaceUI.handleDropToInventory(a,l)),this.craftingSystem.setOnStorageDropCallback((a,l)=>this.storageUI.handleDropToInventory(a,l)),this.player.setTechBlockDataCallback(a=>{const l=new Set(a);return{torches:this.torchManager.getPlacedTorches().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),furnaces:this.furnaceManager.getPlacedFurnaces().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),electricFurnaces:this.electricFurnaceManager.getPlacedElectricFurnaces().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),electronicsWorkbenches:this.electronicsWorkbenchManager.getPlacedElectronicsWorkbenches().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),storageChests:this.storageChestManager.getPlacedChests().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),steamEngines:this.steamEngineManager.getPlacedSteamEngines().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),hydroGenerators:this.hydroGeneratorManager.getPlacedHydroGenerators().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),copperPipes:this.copperPipeManager.getPlacedPipes().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex,depth:c.depth})),cables:this.cableNodeManager.getPlacedCables().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex,depth:c.depth}))}}),this.registerTechBlocksWithRegistry(),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.setupHotbarDragDrop(),this.selectionLabelElement=document.getElementById("hotbar-selection-label"),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}setupHotbarDragDrop(){document.querySelectorAll(".hotbar-slot").forEach((t,n)=>{const i=t;i.draggable=!0;const s=i.querySelector("img");s&&(s.draggable=!1),i.addEventListener("dragstart",r=>this.handleHotbarDragStart(r,n)),i.addEventListener("dragend",()=>this.handleHotbarDragEnd()),i.addEventListener("dragover",r=>this.handleHotbarDragOver(r)),i.addEventListener("dragleave",r=>this.handleHotbarDragLeave(r)),i.addEventListener("drop",r=>this.handleHotbarDrop(r,n)),i.addEventListener("touchstart",r=>{r.preventDefault(),this.inventory.setSelectedSlot(n),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()},{passive:!1})})}handleHotbarDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===L.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const r=ot[n.itemType];s.innerHTML=`<img src="${ft(r.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleHotbarDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".hotbar-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".hotbar-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleHotbarDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleHotbarDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleHotbarDrop(e,t){var r;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(r=e.dataTransfer)==null?void 0:r.getData("text/plain");if(i&&i.startsWith("storage:")){this.storageUI.handleDropToInventory(t,i)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.furnaceUI.handleDropToInventory(t,a)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateHotbarUI())}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const s=e[i],r=n.querySelector("img");let a=n.querySelector(".item-count"),l=n.querySelector(".item-tooltip");if(s.itemType!==L.NONE&&s.quantity>0){const c=ot[s.itemType];r&&(r.src=ft(c.texture),r.style.display="block",this.applyAtlasRegionStyle(r,c)),a||(a=document.createElement("span"),a.className="item-count",n.appendChild(a)),a.textContent=s.quantity>1?s.quantity.toString():"",l||(l=document.createElement("span"),l.className="item-tooltip",n.appendChild(l)),l.textContent=c.name}else r&&(r.style.display="none",r.style.objectFit="",r.style.objectPosition=""),a&&(a.textContent=""),l&&l.remove();n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}applyAtlasRegionStyle(e,t){if(t.atlasRegion){const{x:n,y:i,width:s,height:r,atlasWidth:a,atlasHeight:l}=t.atlasRegion,c=a/s,h=l/r;e.style.objectFit="none",e.style.objectPosition=`${-n*(40/s)}px ${-i*(40/r)}px`,e.style.width=`${40*c}px`,e.style.height=`${40*h}px`,e.style.transform=`scale(${1/c}, ${1/h})`,e.style.transformOrigin="top left"}else e.style.objectFit="",e.style.objectPosition="",e.style.width="40px",e.style.height="40px",e.style.transform="",e.style.transformOrigin=""}showSelectionLabel(){const e=this.inventory.getSelectedItem();if(this.selectionLabelElement){if(this.selectionLabelTimeout!==null&&(window.clearTimeout(this.selectionLabelTimeout),this.selectionLabelTimeout=null),e.itemType!==L.NONE&&e.quantity>0){const t=ot[e.itemType];this.selectionLabelElement.textContent=t.name}else this.selectionLabelElement.textContent="Empty";this.selectionLabelElement.classList.add("visible"),this.selectionLabelTimeout=window.setTimeout(()=>{this.selectionLabelElement&&this.selectionLabelElement.classList.remove("visible"),this.selectionLabelTimeout=null},5e3)}}createHighlightMesh(){const e=new Bl({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new mt;this.blockWireframe=new wh(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){if(this.wireframeCache&&this.wireframeCache.tileIndex===t&&this.wireframeCache.depth===n)return;const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;this.wireframeCache={tileIndex:t,depth:n};const s=e.getBlockHeight(),r=e.depthToRadius(n),a=r-s,l=[],c=i.vertices.length,h=c*2;for(;this.wireframeVertPool.length<h;)this.wireframeVertPool.push(new R);for(let u=0;u<c;u++){const f=i.vertices[u];this.wireframeVertPool[u].set(f.x,f.y,f.z).normalize().multiplyScalar(r).add(e.center),this.wireframeVertPool[c+u].set(f.x,f.y,f.z).normalize().multiplyScalar(a).add(e.center)}for(let u=0;u<c;u++){const f=(u+1)%c,p=this.wireframeVertPool[u],m=this.wireframeVertPool[f];l.push(p.x,p.y,p.z),l.push(m.x,m.y,m.z)}for(let u=0;u<c;u++){const f=(u+1)%c,p=this.wireframeVertPool[c+u],m=this.wireframeVertPool[c+f];l.push(p.x,p.y,p.z),l.push(m.x,m.y,m.z)}for(let u=0;u<c;u++){const f=this.wireframeVertPool[u],p=this.wireframeVertPool[c+u];l.push(f.x,f.y,f.z),l.push(p.x,p.y,p.z)}this.blockWireframe.geometry.dispose();const d=new mt;d.setAttribute("position",new Ge(l,3)),this.blockWireframe.geometry=d}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==L.NONE?t.textContent=`Block: ${ot[e.itemType].name}`:t.textContent="Block: None")}updateSteamEngineParticles(e){const t=this.steamEngineManager.getPlacedSteamEngines(),n=t.map(i=>i.tileIndex);this.steamEngineUI.updateAllEngines(n);for(const i of t){const s=this.steamEngineUI.getEngineState(i.tileIndex),r=(s==null?void 0:s.isRunning)??!1;this.steamEngineManager.setEngineRunning(i.tileIndex,r)}this.steamEngineManager.update(e)}update(e,t,n,i=0){var le;if(this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e),i!==0){const ue=this.inventory.getSelectedSlot(),Q=9,ae=i>0?1:-1;let Ie=ue+ae;Ie<0&&(Ie=Q-1),Ie>=Q&&(Ie=0),this.inventory.setSelectedSlot(Ie),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()}const s=this.inventory.getSelectedItem(),r=s.itemType===L.TORCH&&s.quantity>0;this.heldTorch&&(this.heldTorch.setVisible(r),r&&this.heldTorch.update(e)),this.torchManager.update(e),this.furnaceManager.update(e),this.electricFurnaceManager.update(e),this.updateSteamEngineParticles(e),this.pipeConnectionRebuildTimer+=e,this.pipeConnectionRebuildTimer>=this.PIPE_CONNECTION_REBUILD_INTERVAL&&(this.pipeConnectionRebuildTimer=0,this.copperPipeManager.rebuildAllConnections()),this.cableConnectionRebuildTimer+=e,this.cableConnectionRebuildTimer>=this.PIPE_CONNECTION_REBUILD_INTERVAL&&(this.cableConnectionRebuildTimer=0,this.cableNodeManager.rebuildAllConnections(),this.updateElectricFurnacePowerStatus());const a=this.torchManager.getTorchDataForBaking();if(a.length>0){const ue=a.map(Ie=>Ie.position),Q=a[0].range,ae=a[0].intensity;this.furnaceManager.updateTorchLighting(ue,Q,ae),this.electricFurnaceManager.updateTorchLighting(ue,Q,ae),this.electronicsWorkbenchManager.updateTorchLighting(ue,Q,ae),this.storageChestManager.updateTorchLighting(ue,Q,ae),this.garbagePileManager.updateTorchLighting(ue,Q,ae),this.steamEngineManager.updateTorchLighting(ue,Q,ae),this.hydroGeneratorManager.updateTorchLighting(ue,Q,ae),this.copperPipeManager.updateTorchLighting(ue,Q,ae),this.cableNodeManager.updateTorchLighting(ue,Q,ae)}if(this.craftingSystem.isMenuOpen()){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining();return}const l=this.player.getRaycastOrigin(),c=this.player.getForwardVector();this.raycaster.set(l,c),this.raycaster.far=this.MAX_REACH;const h=((le=this.treeManager)==null?void 0:le.getTreeMeshes())??[],d=this.torchManager.getTorchMeshes(),u=this.furnaceManager.getFurnaceMeshes(),f=this.storageChestManager.getChestMeshes(),p=this.garbagePileManager.getPileMeshes(),m=this.steamEngineManager.getSteamEngineMeshes(),x=this.hydroGeneratorManager.getHydroGeneratorMeshes(),g=this.copperPipeManager.getPipeMeshes(),v=this.cableNodeManager.getCableMeshes(),_=this.electricFurnaceManager.getElectricFurnaceMeshes(),C=this.electronicsWorkbenchManager.getElectronicsWorkbenchMeshes(),S=this.raycaster.intersectObjects(h,!1),b=this.raycaster.intersectObjects(d,!1),w=this.raycaster.intersectObjects(u,!1),O=this.raycaster.intersectObjects(f,!1),E=this.raycaster.intersectObjects(p,!1),T=this.raycaster.intersectObjects(m,!1),A=this.raycaster.intersectObjects(x,!1),U=this.raycaster.intersectObjects(g,!1),G=this.raycaster.intersectObjects(v,!1),z=this.raycaster.intersectObjects(_,!1),$=this.raycaster.intersectObjects(C,!1);let W=null,ee=null,q=1/0;for(const ue of this.planets){const Q=ue.raycast(l,c,this.MAX_REACH);if(Q){const ae=l.distanceTo(Q.point);ae<q&&(q=ae,W=Q,ee=ue)}}let ne=!1,te=!1,xe=!1,ze=!1,He=!1,be=!1,Pe=!1,j=!1,X=!1,he=!1,oe=!1,de=!1,pe=null,Je=null,Be=null,et=null,F=null,De=null,Ue=null,Xe=null,me=null,st=null,Me=null;const Le=S.length>0?S[0].distance:1/0,D=b.length>0?b[0].distance:1/0,M=w.length>0?w[0].distance:1/0,B=O.length>0?O[0].distance:1/0,Z=E.length>0?E[0].distance:1/0,se=T.length>0?T[0].distance:1/0,J=A.length>0?A[0].distance:1/0,Re=U.length>0?U[0].distance:1/0,ge=G.length>0?G[0].distance:1/0,ke=z.length>0?z[0].distance:1/0,we=$.length>0?$[0].distance:1/0,ie=Math.min(Le,D,M,B,Z,se,J,Re,ge,ke,we);if(W&&q<ie?te=!0:ge<=ie&&ge<1/0?(he=!0,me=G[0]):ke<=ie&&ke<1/0?(oe=!0,st=z[0]):we<=ie&&we<1/0?(de=!0,Me=$[0]):Re<=ie&&Re<1/0?(X=!0,Xe=U[0]):J<=ie&&J<1/0?(j=!0,Ue=A[0]):se<=ie&&se<1/0?(Pe=!0,De=T[0]):B<=ie&&B<1/0?(He=!0,et=O[0]):Z<=ie&&Z<1/0?(be=!0,F=E[0]):M<=D&&M<=Le&&M<1/0?(ze=!0,Be=w[0]):D<Le&&D<1/0?(xe=!0,Je=b[0]):Le<1/0?(ne=!0,pe=S[0]):W&&(te=!0),he&&me){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=me.object,Q=this.cableNodeManager.getCableByMesh(ue),ae=this.inventory.getSelectedItem();if(n&&this.rightClickCooldown===0&&Q){if(ae.itemType===L.CABLE&&ae.quantity>0){for(const Ie of this.planets)if(Ie.getTileByIndex(Q.tileIndex)){this.placeCable(Ie,Q.tileIndex,Q.depth+1);break}this.rightClickCooldown=this.CLICK_COOLDOWN}}else t&&Q?this.handleCableMining(e,Q):this.resetMining()}else if(oe&&st){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=st.object,Q=this.electricFurnaceManager.getElectricFurnaceByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.electricFurnaceUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleElectricFurnaceMining(e,Q):this.resetMining()}else if(de&&Me){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=Me.object,Q=this.electronicsWorkbenchManager.getElectronicsWorkbenchByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.electronicsWorkbenchUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleElectronicsWorkbenchMining(e,Q):this.resetMining()}else if(X&&Xe){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=Xe.object,Q=this.copperPipeManager.getPipeByMesh(ue),ae=this.inventory.getSelectedItem();if(n&&this.rightClickCooldown===0&&Q)if(ae.itemType===L.COPPER_PIPE&&ae.quantity>0){for(const Ie of this.planets)if(Ie.getTileByIndex(Q.tileIndex)){this.placeCopperPipe(Ie,Q.tileIndex,Q.depth+1);break}this.rightClickCooldown=this.CLICK_COOLDOWN}else{const Ie=this.copperPipeManager.getPipeNetwork(Q.id);this.copperPipeUI.openPipe(Q,Ie),this.rightClickCooldown=this.CLICK_COOLDOWN}else t&&Q?this.handleCopperPipeMining(e,Q):this.resetMining()}else if(j&&Ue){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=Ue.object,Q=this.hydroGeneratorManager.getHydroGeneratorByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.hydroGeneratorUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleHydroGeneratorMining(e,Q):this.resetMining()}else if(Pe&&De){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=De.object,Q=this.steamEngineManager.getSteamEngineByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.steamEngineUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleSteamEngineMining(e,Q):this.resetMining()}else if(He&&et){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=et.object,Q=this.storageChestManager.getChestByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.storageUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleStorageChestMining(e,Q):this.resetMining()}else if(be&&F){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=F.object,Q=this.garbagePileManager.getPileByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.storageUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleGarbagePileMining(e,Q):this.resetMining()}else if(ze&&Be){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ue=Be.object,Q=this.furnaceManager.getFurnaceByMesh(ue);n&&this.rightClickCooldown===0&&Q?(this.furnaceUI.open(Q),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&Q?this.handleFurnaceMining(e,Q):this.resetMining()}else if(xe&&Je)this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),t&&this.pickupTorch(Je.object),this.resetMining();else if(ne&&pe){const ue=pe.object;this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Q=ue.userData.treeType;t?this.handleTreeMining(e,ue,Q):this.resetMining()}else if(te&&W&&ee){const{tileIndex:ue,depth:Q,blockType:ae,prevTileIndex:Ie,prevDepth:k}=W;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(ee,ue,Q)),t&&ae!==P.AIR?this.handleMining(e,ee,ue,Q,ae):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(ee,Ie,k),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining()}handleMining(e,t,n,i,s){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:s},this.miningProgress=0);const r=yl(s),a=ot[r].mineTime;this.miningProgress+=e/a,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,s),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?L.LOG:L.LEAVES,s=ot[i].mineTime;this.miningProgress+=e/s,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){if(t==="trunk"){const n=Math.floor(Math.random()*5)+4,i=Math.floor(Math.random()*5)+4;this.inventory.addItem(L.LOG,n),this.inventory.addItem(L.STICK,i)}else{const n=Math.floor(Math.random()*3)+1;this.inventory.addItem(L.STICK,n)}if(this.updateHotbarUI(),this.saveInventory(),this.treeManager){let n=e.parent;for(;n&&!(n instanceof Gt&&n.children.some(i=>i.userData.isTree));)n=n.parent;if(n instanceof Gt){const i=n.userData.tileIndex;i!==void 0&&Ye.saveRemovedTree("earth",i),this.treeManager.removeTree(n)}}}handleFurnaceMining(e,t){(this.miningFurnaceTarget===null||this.miningFurnaceTarget.furnace!==t)&&(this.miningFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0);const n=ot[L.FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakFurnace(t),this.resetMining())}breakFurnace(e){if(this.inventory.addItem(L.FURNACE,1),e.smeltingItem!==null&&this.inventory.addItem(e.smeltingItem,1),e.outputItem!==null&&e.outputCount>0&&this.inventory.addItem(e.outputItem,e.outputCount),e.fuelAmount>0){const t=Math.ceil(e.fuelAmount/8);this.inventory.addItem(L.COAL,t)}this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ye.removeFurnace(n,e.tileIndex)}this.furnaceManager.removeFurnace(e)}handleStorageChestMining(e,t){(this.miningStorageTarget===null||this.miningStorageTarget.chest!==t)&&(this.miningStorageTarget={chest:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=ot[L.STORAGE_CHEST].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakStorageChest(t),this.resetMining())}breakStorageChest(e){this.inventory.addItem(L.STORAGE_CHEST,1);const t=this.storageChestManager.getAllItemsFromChest(e),n=[];for(const i of t){const s=this.inventory.addItem(i.itemType,i.quantity);s>0&&n.push({itemType:i.itemType,quantity:s})}this.updateHotbarUI(),this.saveInventory();for(let i=0;i<this.planets.length;i++){const s=i===0?"earth":"moon";Ye.removeStorageChest(s,e.tileIndex)}n.length>0&&this.createGarbagePileWithItems(e.position.clone(),e.tileIndex,n),this.storageChestManager.removeChest(e)}handleGarbagePileMining(e,t){(this.miningGarbageTarget===null||this.miningGarbageTarget.pile!==t)&&(this.miningGarbageTarget={pile:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningProgress=0);const n=.5;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakGarbagePile(t),this.resetMining())}breakGarbagePile(e){const t=this.garbagePileManager.getAllItemsFromPile(e),n=[];for(const r of t){const a=this.inventory.addItem(r.itemType,r.quantity);a>0&&n.push({itemType:r.itemType,quantity:a})}this.updateHotbarUI(),this.saveInventory();for(let r=0;r<this.planets.length;r++){const a=r===0?"earth":"moon";Ye.removeGarbagePile(a,e.tileIndex)}const i=e.position.clone(),s=e.tileIndex;this.garbagePileManager.removePile(e),n.length>0&&this.createGarbagePileWithItems(i,s,n)}handleSteamEngineMining(e,t){(this.miningSteamEngineTarget===null||this.miningSteamEngineTarget.steamEngine!==t)&&(this.miningSteamEngineTarget={steamEngine:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=ot[L.STEAM_ENGINE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakSteamEngine(t),this.resetMining())}breakSteamEngine(e){this.inventory.addItem(L.STEAM_ENGINE,1),this.updateHotbarUI(),this.saveInventory();const t=e.tileIndex;for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ye.removeSteamEngine(i,t)}this.steamEngineManager.removeSteamEngine(e),this.copperPipeManager.updatePipesNearTile(t)}handleHydroGeneratorMining(e,t){(this.miningHydroGeneratorTarget===null||this.miningHydroGeneratorTarget.hydroGenerator!==t)&&(this.miningHydroGeneratorTarget={hydroGenerator:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningProgress=0);const n=ot[L.HYDRO_GENERATOR].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakHydroGenerator(t),this.resetMining())}breakHydroGenerator(e){this.inventory.addItem(L.HYDRO_GENERATOR,1),this.updateHotbarUI(),this.saveInventory();const t=e.tileIndex;for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ye.removeHydroGenerator(i,t)}this.hydroGeneratorManager.removeHydroGenerator(e),this.copperPipeManager.updatePipesNearTile(t)}handleCopperPipeMining(e,t){(this.miningCopperPipeTarget===null||this.miningCopperPipeTarget.pipe!==t)&&(this.miningCopperPipeTarget={pipe:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningProgress=0);const n=ot[L.COPPER_PIPE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakCopperPipe(t),this.resetMining())}breakCopperPipe(e){this.inventory.addItem(L.COPPER_PIPE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ye.removeCopperPipe(n,e.tileIndex,e.depth)}this.copperPipeManager.removePipe(e)}handleCableMining(e,t){(this.miningCableTarget===null||this.miningCableTarget.cable!==t)&&(this.miningCableTarget={cable:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningElectricFurnaceTarget=null,this.miningProgress=0);const n=ot[L.CABLE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakCable(t),this.resetMining())}breakCable(e){this.inventory.addItem(L.CABLE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ye.removeCable(n,e.tileIndex,e.depth)}this.cableNodeManager.removeCable(e)}handleElectricFurnaceMining(e,t){(this.miningElectricFurnaceTarget===null||this.miningElectricFurnaceTarget.furnace!==t)&&(this.miningElectricFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningCableTarget=null,this.miningProgress=0);const n=ot[L.ELECTRIC_FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakElectricFurnace(t),this.resetMining())}handleElectronicsWorkbenchMining(e,t){(this.miningElectronicsWorkbenchTarget===null||this.miningElectronicsWorkbenchTarget.workbench!==t)&&(this.miningElectronicsWorkbenchTarget={workbench:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningCableTarget=null,this.miningElectricFurnaceTarget=null,this.miningProgress=0);const n=ot[L.ELECTRONICS_WORKBENCH].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakElectronicsWorkbench(t),this.resetMining())}breakElectronicsWorkbench(e){this.inventory.addItem(L.ELECTRONICS_WORKBENCH,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";Ye.removeElectronicsWorkbench(n,e.tileIndex)}this.electronicsWorkbenchManager.removeElectronicsWorkbench(e)}breakElectricFurnace(e){this.inventory.addItem(L.ELECTRIC_FURNACE,1);const t=[];e.smeltingItem!==null&&e.inputCount>0&&t.push({itemType:e.smeltingItem,quantity:e.inputCount}),e.outputItem!==null&&e.outputCount>0&&t.push({itemType:e.outputItem,quantity:e.outputCount});for(const n of t){const i=this.inventory.addItem(n.itemType,n.quantity);i>0&&this.createGarbagePileWithItems(e.position,e.tileIndex,[{itemType:n.itemType,quantity:i}])}this.updateHotbarUI(),this.saveInventory();for(let n=0;n<this.planets.length;n++){const i=n===0?"earth":"moon";Ye.removeElectricFurnace(i,e.tileIndex)}this.electricFurnaceManager.removeElectricFurnace(e)}async createGarbagePileWithItems(e,t,n){let i=null;for(const r of this.planets)if(r.getTileByIndex(t)){i=r;break}if(!i)return;const s=await this.garbagePileManager.placePile(e,i.center,t,n);if(s){const r=this.getPlanetId(i);Ye.saveGarbagePile(r,t,{position:{x:s.position.x,y:s.position.y,z:s.position.z},slots:s.slots.map(a=>({itemType:a.itemType,quantity:a.quantity}))})}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningCableTarget=null,this.miningElectricFurnaceTarget=null,this.miningElectronicsWorkbenchTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){if(n<=0)return;const s=yl(i);s!==L.NONE&&(this.inventory.addItem(s,1),this.updateHotbarUI(),this.saveInventory());const r=this.getPlanetId(e);let a=!1;const l=e.getMaxDepth();for(let h=n+1;h<l;h++){const d=e.getBlock(t,h);if(d===P.WATER){a=!0;break}else if(d!==P.AIR)break}if(!a){const h=e.getTileNeighbors(t);for(const d of h){if(e.getBlock(d,n)===P.WATER){a=!0;break}if(e.getBlock(d,n+1)===P.WATER){a=!0;break}}}const c=a?P.WATER:P.AIR;if(e.setBlock(t,n,c),Ye.saveTileChange(r,t,n,c),c===P.WATER)for(let h=n-1;h>0&&e.getBlock(t,h)===P.AIR;h--)e.setBlock(t,h,P.WATER),Ye.saveTileChange(r,t,h,P.WATER)}placeBlock(e,t,n){if(n<0||n>=e.getMaxDepth())return;const i=this.inventory.getSelectedItem();if(i.itemType===L.NONE||i.quantity===0)return;if(i.itemType===L.TORCH){this.placeTorch(e,t,n);return}if(i.itemType===L.FURNACE){this.placeFurnace(e,t,n);return}if(i.itemType===L.STORAGE_CHEST){this.placeStorageChest(e,t,n);return}if(i.itemType===L.STEAM_ENGINE){this.placeSteamEngine(e,t,n);return}if(i.itemType===L.HYDRO_GENERATOR){this.placeHydroGenerator(e,t,n);return}if(i.itemType===L.COPPER_PIPE){this.placeCopperPipe(e,t,n);return}if(i.itemType===L.CABLE){this.placeCable(e,t,n);return}if(i.itemType===L.ELECTRIC_FURNACE){this.placeElectricFurnace(e,t,n);return}if(i.itemType===L.ELECTRONICS_WORKBENCH){this.placeElectronicsWorkbench(e,t,n);return}const s=Tg(i.itemType);if(s===P.AIR)return;const r=e.getTileAtPoint(this.player.position);if(r&&r.index===t){const a=this.player.position.distanceTo(e.center),l=a+1.8,c=e.depthToRadius(n),h=c-1;if(c>a&&h<l)return}if(this.inventory.useSelectedItem()){e.setBlock(t,n,s),this.updateHotbarUI(),this.saveInventory();const a=this.getPlanetId(e);Ye.saveTileChange(a,t,n,s)}}placeTorch(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center);if(this.inventory.useSelectedItem()){this.torchManager.placeTorch(a,e.center,t),this.updateHotbarUI(),this.saveInventory();const l=this.getPlanetId(e);Ye.saveTorch(l,t,{x:a.x,y:a.y,z:a.z});const c=this.torchManager.getTorchDataForBaking();e.setTorchData(c),e.setTilesWithTorches(this.torchManager.getTilesWithTorches()),e.markTilesNearTorchDirty(a,N.TORCH_LIGHT_RANGE)}}async placeFurnace(e,t,n){if(this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.furnaceManager.placeFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);Ye.saveFurnace(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,fuelAmount:c.fuelAmount,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount})}}}async placeStorageChest(e,t,n){if(this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.storageChestManager.placeChest(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);Ye.saveStorageChest(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,slots:c.slots.map(d=>({itemType:d.itemType,quantity:d.quantity}))})}}}async placeSteamEngine(e,t,n){if(this.steamEngineManager.getSteamEngineAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.steamEngineManager.placeSteamEngine(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);Ye.saveSteamEngine(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,hasFuel:!1,fuelAmount:0}),this.copperPipeManager.updatePipesNearTile(t)}}}async placeHydroGenerator(e,t,n){if(this.hydroGeneratorManager.getHydroGeneratorAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t)||this.steamEngineManager.getSteamEngineAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),r=e.getBlock(t,n);let a,l,c;if(r!==P.AIR&&r!==P.WATER){c=n;let p=!1,m=!1;for(let x=n+1;x<s;x++){const g=e.getBlock(t,x);if(g===P.WATER)p=!0;else if(g===P.AIR){p&&(a=x,m=!0);break}else break}if(!p||!m||(l=a-c-1,l<=0))return}else if(r===P.AIR){if(e.getBlock(t,n-1)!==P.WATER)return;a=n,l=0;for(let m=n-1;m>=0;m--)if(e.getBlock(t,m)===P.WATER)l++;else{c=m;break}}else if(r===P.WATER){a=n;for(let p=n+1;p<s;p++){const m=e.getBlock(t,p);if(m===P.AIR){a=p;break}else if(m!==P.WATER)return}l=0;for(let p=a-1;p>=0;p--)if(e.getBlock(t,p)===P.WATER)l++;else{c=p;break}if(l<=0)return}else return;const h=e.depthToRadius(a)-e.getBlockHeight(),u=i.center.clone().normalize().multiplyScalar(h).add(e.center),f=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const p=await this.hydroGeneratorManager.placeHydroGenerator(u,e.center,t,l*e.getBlockHeight(),f);if(this.updateHotbarUI(),this.saveInventory(),p){const m=this.getPlanetId(e);Ye.saveHydroGenerator(m,t,{position:{x:p.position.x,y:p.position.y,z:p.position.z},rotation:p.rotation,waterDepth:p.waterDepth}),this.copperPipeManager.updatePipesNearTile(t)}}}async placeCopperPipe(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),r=e.getBlock(t,n);let a=n,l;if(r===P.WATER){let d=n;for(let u=n+1;u<s;u++){const f=e.getBlock(t,u);if(f===P.AIR){d=u;break}else if(f!==P.WATER)return}a=d,l=e.depthToRadius(a)-e.getBlockHeight()}else if(r!==P.AIR){let d=!1,u=n;for(let f=n+1;f<s;f++){const p=e.getBlock(t,f);if(p===P.WATER)d=!0;else if(p===P.AIR){d&&(u=f);break}else break}d?(a=u,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight()}else r===P.AIR&&e.getBlock(t,n-1)===P.WATER?(a=n,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight();if(this.copperPipeManager.getPipeAt(t,a))return;const h=i.center.clone().normalize().multiplyScalar(l).add(e.center);if(this.inventory.useSelectedItem()){const d=await this.copperPipeManager.placePipe(h,t,a);if(this.updateHotbarUI(),this.saveInventory(),d){const u=this.getPlanetId(e);Ye.saveCopperPipe(u,t,a,{position:{x:d.position.x,y:d.position.y,z:d.position.z}})}}}async placeCable(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),r=e.getBlock(t,n);let a=n,l;if(r===P.WATER){let d=n;for(let u=n+1;u<s;u++){const f=e.getBlock(t,u);if(f===P.AIR){d=u;break}else if(f!==P.WATER)return}a=d,l=e.depthToRadius(a)-e.getBlockHeight()}else P.AIR,l=e.depthToRadius(n)-e.getBlockHeight();if(this.cableNodeManager.getCableAt(t,a))return;const h=i.center.clone().normalize().multiplyScalar(l).add(e.center);if(this.inventory.useSelectedItem()){const d=await this.cableNodeManager.placeCable(h,t,a);if(this.updateHotbarUI(),this.saveInventory(),d){const u=this.getPlanetId(e);Ye.saveCable(u,t,a,{position:{x:d.position.x,y:d.position.y,z:d.position.z}})}}}async placeElectricFurnace(e,t,n){if(this.electricFurnaceManager.getElectricFurnaceAtTile(t)||this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.electricFurnaceManager.placeElectricFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);Ye.saveElectricFurnace(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount}),this.cableNodeManager.rebuildAllConnections()}}}async placeElectronicsWorkbench(e,t,n){if(this.electronicsWorkbenchManager.getElectronicsWorkbenchAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.electricFurnaceManager.getElectricFurnaceAtTile(t)||this.steamEngineManager.getSteamEngineAtTile(t)||this.storageChestManager.getChestAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.electronicsWorkbenchManager.placeElectronicsWorkbench(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);Ye.saveElectronicsWorkbench(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation}),this.cableNodeManager.rebuildAllConnections()}}}pickupTorch(e){let t=e.parent;for(;t&&!(t instanceof Gt);)t=t.parent;if(t instanceof Gt){const i=this.torchManager.getPlacedTorches().find(s=>s.group===t);if(i){const s=i.position.clone();Ye.removeTorch({x:i.position.x,y:i.position.y,z:i.position.z}),this.torchManager.removeTorch(i),this.inventory.addItem(L.TORCH,1),this.updateHotbarUI(),this.saveInventory();const r=this.torchManager.getTorchDataForBaking(),a=this.torchManager.getTilesWithTorches();for(const l of this.planets)l.setTorchData(r),l.setTilesWithTorches(a),l.markTilesNearTorchDirty(s,N.TORCH_LIGHT_RANGE)}}}getInventory(){return this.inventory}getCraftingSystem(){return this.craftingSystem}getTorchManager(){return this.torchManager}setTreeManager(e){this.treeManager=e}getPlanetId(e){return this.planets.indexOf(e)===0?"earth":"moon"}getNeighborTileIndices(e){for(const t of this.planets){const n=t.getTileByIndex(e);if(n&&n.neighbors)return n.neighbors}return[]}saveInventory(){Ye.saveInventory(this.inventory.exportForSave())}saveSteamEngineStates(){const e=this.steamEngineManager.getPlacedSteamEngines();for(const t of e){let n="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(t.tileIndex)){n=s===0?"earth":"moon";break}const i=this.steamEngineUI.getEngineState(t.tileIndex);Ye.saveSteamEngine(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,hasFuel:(i==null?void 0:i.hasFuel)??!1,fuelAmount:(i==null?void 0:i.fuelAmount)??0})}}saveAllFurnaceStates(){const e=this.furnaceManager.getPlacedFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}Ye.saveFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,fuelAmount:t.fuelAmount,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}saveAllElectricFurnaceStates(){const e=this.electricFurnaceManager.getPlacedElectricFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}Ye.saveElectricFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}updateElectricFurnacePowerStatus(){const e=this.electricFurnaceManager.getPlacedElectricFurnaces();for(const t of e){const n=this.cableNodeManager.isElectricFurnaceConnectedToRunningSteamEngine(t.tileIndex,i=>{if(!this.steamEngineManager.getSteamEngineAtTile(i))return!1;const r=this.steamEngineUI.getEngineState(i);return(r==null?void 0:r.isRunning)??!1});this.electricFurnaceManager.setFurnacePowered(t.tileIndex,n)}}saveAllStorageStates(){const e=this.storageChestManager.getPlacedChests();for(const n of e){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}Ye.saveStorageChest(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},rotation:n.rotation,slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}const t=this.garbagePileManager.getPlacedPiles();for(const n of t){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}Ye.saveGarbagePile(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}}loadSavedData(){const e=Ye.load();if(!e)return;e.inventory&&e.inventory.length>0&&(this.inventory.importFromSave(e.inventory),this.updateHotbarUI());for(const u of this.planets){const f=this.getPlanetId(u),p=Ye.getTileChangesForPlanet(f);for(const m of p)u.setBlock(m.tileIndex,m.depth,m.blockType)}const t=Ye.getTorches();for(const u of t){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.torchManager.placeTorch(p,f.center,u.tileIndex)}}if(t.length>0){const u=this.torchManager.getTorchDataForBaking(),f=this.torchManager.getTilesWithTorches();for(const p of this.planets)p.setTorchData(u),p.setTilesWithTorches(f);for(const p of t){const m=new R(p.position.x,p.position.y,p.position.z);for(const x of this.planets)x.markTilesNearTorchDirty(m,N.TORCH_LIGHT_RANGE)}}const n=Ye.getFurnaces();for(const u of n){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.furnaceManager.restoreFurnace(p,f.center,u.tileIndex,u.rotation).then(m=>{m&&(m.fuelAmount=u.fuelAmount,m.smeltingItem=u.smeltingItem,m.smeltingProgress=u.smeltingProgress,m.inputCount=u.inputCount??0,m.outputItem=u.outputItem,m.outputCount=u.outputCount)})}}const i=Ye.getStorageChests();for(const u of i){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z),m=u.slots.map(x=>({itemType:x.itemType,quantity:x.quantity}));this.storageChestManager.restoreChest(p,f.center,u.tileIndex,u.rotation,m)}}const s=Ye.getGarbagePiles();for(const u of s){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z),m=u.slots.map(x=>({itemType:x.itemType,quantity:x.quantity}));this.garbagePileManager.restorePile(p,f.center,u.tileIndex,m)}}const r=Ye.getSteamEngines();for(const u of r){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.steamEngineManager.restoreSteamEngine(p,f.center,u.tileIndex,u.rotation),this.steamEngineUI.restoreState(u.tileIndex,{hasFuel:u.hasFuel??!1,fuelAmount:u.fuelAmount??0,isRunning:!1,waterInput:0,steamOutput:0})}}const a=Ye.getHydroGenerators();for(const u of a){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.hydroGeneratorManager.restoreHydroGenerator(p,f.center,u.tileIndex,u.rotation,u.waterDepth)}}const l=Ye.getCopperPipes();for(const u of l)if(this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId)){const p=new R(u.position.x,u.position.y,u.position.z);this.copperPipeManager.restorePipe(p,u.tileIndex,u.depth)}this.copperPipeManager.rebuildAllConnections();const c=Ye.getCables();for(const u of c)if(this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId)){const p=new R(u.position.x,u.position.y,u.position.z);this.cableNodeManager.restoreCable(p,u.tileIndex,u.depth)}const h=Ye.getElectricFurnaces();for(const u of h){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.electricFurnaceManager.restoreElectricFurnace(p,f.center,u.tileIndex,u.rotation).then(m=>{m&&(m.smeltingItem=u.smeltingItem,m.smeltingProgress=u.smeltingProgress,m.inputCount=u.inputCount,m.outputItem=u.outputItem,m.outputCount=u.outputCount)})}}const d=Ye.getElectronicsWorkbenches();for(const u of d){const f=this.planets.find((p,m)=>(m===0?"earth":"moon")===u.planetId);if(f){const p=new R(u.position.x,u.position.y,u.position.z);this.electronicsWorkbenchManager.restoreElectronicsWorkbench(p,f.center,u.tileIndex,u.rotation)}}console.log(`Loaded save: ${e.tileChanges.length} tile changes, ${t.length} torches, ${n.length} furnaces, ${h.length} electric furnaces, ${d.length} electronics workbenches, ${i.length} chests, ${s.length} piles, ${r.length} steam engines, ${a.length} hydro generators, ${l.length} copper pipes, ${c.length} cables, inventory restored`)}registerTechBlocksWithRegistry(){fn.registerManager({type:"Furnace",getBlocks:()=>this.furnaceManager.getPlacedFurnaces().map(e=>({type:"Furnace",id:`furnace-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.smeltingItem!==null&&e.fuelAmount>0?`Smelting ${Math.round(e.smeltingProgress*100)}%`:e.smeltingItem!==null&&e.fuelAmount===0?"No Fuel":e.outputCount>0?`Output: ${e.outputCount}`:"Idle",openUI:()=>{this.furnaceUI.open(e),this.craftingSystem.open()}}))}),fn.registerManager({type:"Steam Engine",getBlocks:()=>this.steamEngineManager.getPlacedSteamEngines().map(e=>{const t=this.steamEngineUI.getEngineState(e.tileIndex);return{type:"Steam Engine",id:`steam-engine-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>t!=null&&t.isRunning?`Running (${t.steamOutput.toFixed(1)} steam/s)`:t!=null&&t.hasFuel&&t.waterInput===0?"No Water":t!=null&&t.hasFuel?"Idle":"No Fuel",openUI:()=>{this.steamEngineUI.open(e),this.craftingSystem.open()}}})}),fn.registerManager({type:"Hydro Generator",getBlocks:()=>this.hydroGeneratorManager.getPlacedHydroGenerators().map(e=>({type:"Hydro Generator",id:`hydro-generator-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.isActive?`Active (${e.waterPumpedOut.toFixed(1)} water/s)`:"Inactive",openUI:()=>{this.hydroGeneratorUI.open(e),this.craftingSystem.open()}}))}),fn.registerManager({type:"Storage Chest",getBlocks:()=>this.storageChestManager.getPlacedChests().map(e=>{const t=e.slots.filter(n=>n.itemType!==L.NONE).length;return{type:"Storage Chest",id:`storage-chest-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>t===0?"Empty":`${t}/27 slots`,openUI:()=>{this.storageUI.open(e),this.craftingSystem.open()}}})}),fn.registerManager({type:"Copper Pipe",getBlocks:()=>this.copperPipeManager.getPlacedPipes().map(e=>{const t=this.copperPipeManager.getPipeNetwork(e.id);return{type:"Copper Pipe",id:`copper-pipe-${e.tileIndex}-${e.depth}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>{if(!t)return"Disconnected";const n=t.connectedHydroGenerators.length>0,i=t.connectedSteamEngines.length>0;return n&&i?"Network Active":n||i?"Partial":`${t.pipes.length} pipes`},openUI:()=>{this.copperPipeUI.openPipe(e,t)}}})}),fn.registerManager({type:"Electric Furnace",getBlocks:()=>this.electricFurnaceManager.getPlacedElectricFurnaces().map(e=>({type:"Electric Furnace",id:`electric-furnace-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>e.smeltingItem!==null&&e.isPowered?`Smelting ${Math.round(e.smeltingProgress*100)}%`:e.smeltingItem!==null&&!e.isPowered?"No Power":e.outputCount>0?`Output: ${e.outputCount}`:e.isPowered?"Powered":"No Power",openUI:()=>{this.electricFurnaceUI.open(e),this.craftingSystem.open()}}))}),fn.registerManager({type:"Electronics Workbench",getBlocks:()=>this.electronicsWorkbenchManager.getPlacedElectronicsWorkbenches().map(e=>({type:"Electronics Workbench",id:`electronics-workbench-${e.tileIndex}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>this.cableNodeManager.isElectricFurnaceConnectedToRunningSteamEngine(e.tileIndex,n=>{const i=this.steamEngineManager.getSteamEngineAtTile(n);return(i==null?void 0:i.isRunning)??!1})?"Powered":"No Power",openUI:()=>{this.electronicsWorkbenchUI.open(e),this.craftingSystem.open()}}))}),fn.registerManager({type:"Cable",getBlocks:()=>this.cableNodeManager.getPlacedCables().map(e=>{const t=this.cableNodeManager.getCableNetwork(e.id);return{type:"Cable",id:`cable-${e.tileIndex}-${e.depth}`,tileIndex:e.tileIndex,position:{x:e.position.x,y:e.position.y,z:e.position.z},getStatus:()=>{if(!t)return"Disconnected";const n=t.connectedSteamEngines.length>0,i=t.connectedElectricFurnaces.length>0;return n&&i?"Network Active":n||i?"Partial":`${t.cables.length} cables`},openUI:()=>{}}})})}}let Mg=class{constructor(e){y(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const Xs={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function vl(o,e){return new qe({uniforms:{baseColor:{value:o},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
    `})}class Cg{constructor(e){y(this,"trunkMaterial");y(this,"leavesMaterial");y(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new R(N.SUN_DIRECTION.x,N.SUN_DIRECTION.y,N.SUN_DIRECTION.z).normalize(),this.trunkMaterial=vl(new Ne(9127187),this.sunDirection),this.leavesMaterial=vl(new Ne(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...Xs,...n},s=new Gt,r=[],a=new Ne(9127187),l=new Ne(2263842),c=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6);this.addVertexColors(c,a),r.push(c);let h=i.trunkHeight,d=i.leafBaseRadius;for(let g=0;g<i.leafLayers;g++){const _=new Qs(d,1.2,6);_.translate(0,h+1.2/2,0),this.addVertexColors(_,l),r.push(_),h+=1.2*.6,d*=i.leafTaper}const u=Jl(r),f=this.createMergedTreeMaterial(),p=new Ce(u,f);p.userData.isTree=!0,p.userData.treeType="trunk",s.add(p);for(const g of r)g.dispose();const m=new R(0,1,0),x=new je().setFromUnitVectors(m,t.clone().normalize());return s.quaternion.copy(x),s.position.copy(e),s}addVertexColors(e,t){const n=e.attributes.position.count,i=new Float32Array(n*3);for(let s=0;s<n;s++)i[s*3]=t.r,i[s*3+1]=t.g,i[s*3+2]=t.b;e.setAttribute("color",new Tt(i,3))}createMergedTreeMaterial(){return new qe({uniforms:{sunDirection:{value:this.sunDirection.clone().normalize()},ambientIntensity:{value:N.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:N.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
      `})}createHexagonalPrism(e,t,n){const i=new Ri(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class Ag{constructor(e,t){y(this,"trees",[]);y(this,"treesByTile",new Map);y(this,"treeBuilder");y(this,"scene");this.scene=e,this.treeBuilder=new Cg(t)}addTree(e,t,n,i){const s=e.clone().sub(t).normalize(),r=this.treeBuilder.createTree(e,s,n);return i!==void 0&&(r.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(r)),this.trees.push(r),this.scene.add(r),r}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),s=i.indexOf(e);s>=0&&i.splice(s,1)}e.traverse(i=>{i instanceof Ce&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Ce&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,s,r=N.TERRAIN_SEED,a,l,c){const h=new Mg(r+54321);let d=0,u=0;const f=n*5,p=new Set;for(;d<n&&u<f;){u++;const m=h.next()*Math.PI*2,x=Math.acos(2*h.next()-1);let g=new R(Math.sin(x)*Math.cos(m),Math.sin(x)*Math.sin(m),Math.cos(x)).normalize();const v=a?a(g):null;if(v!==null&&(p.has(v)||c!=null&&c.has(v)))continue;if(l){const O=l(g);O&&(g=O.clone().sub(e).normalize())}if(s&&s(g))continue;const _=i(g),C=e.clone().add(g.clone().multiplyScalar(_));v!==null&&p.add(v);const S=.5+h.next()*1,b=.6+h.next()*.9,w={trunkHeight:Xs.trunkHeight*S*b,trunkRadius:Xs.trunkRadius*S,leafBaseRadius:Xs.leafBaseRadius*S,leafLayers:Math.floor(2+h.next()*4),leafTaper:.6+h.next()*.2};this.addTree(C,e,w,v??void 0),d++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const s of n)s.visible=i}}setAllVisible(e){for(const t of this.trees)t.visible=e}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var wg=`varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Ig=`precision highp float;

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
}`;function Rg(o){const e=o.planetRadius*N.ATMOSPHERE_RADIUS_MULT,t=o.planetRadius-N.ATMOSPHERE_SURFACE_OFFSET;return new qe({uniforms:{planetCenter:{value:new R(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:o.sunDirection.clone().normalize()},viewerPosition:{value:new R},rayleighScale:{value:N.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:N.ATMOSPHERE_MIE_SCALE},mieG:{value:N.ATMOSPHERE_MIE_G},sunIntensity:{value:N.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:N.ATMOSPHERE_SAMPLES},numLightSamples:{value:N.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:wg,fragmentShader:Ig,transparent:!0,side:Bt,depthWrite:!1,blending:Wr})}class Pg{constructor(e){y(this,"mesh");y(this,"material");const t=e.planetRadius*N.ATMOSPHERE_RADIUS_MULT,n=new es(t,64,48);this.material=Rg(e),this.mesh=new Ce(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function Dg(o,e){return new Pg({planetRadius:o,sunDirection:e})}var Lg=`varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Og=`precision highp float;

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
}`;const Fg={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class Ng{constructor(e){y(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function Ug(o,e,t,n){const i=[],s=[],r=[],a=o.clone().sub(t).normalize();let l=new R(1,0,0);Math.abs(a.dot(l))>.9&&(l=new R(0,0,1));const c=new R().crossVectors(a,l).normalize(),h=new R().crossVectors(c,a).normalize(),d=3+Math.floor(n.next()*4);for(let f=0;f<d;f++){const p=(n.next()-.5)*e*.8,m=(n.next()-.5)*e*.4,x=(n.next()-.5)*e*.8,g=o.clone().addScaledVector(c,p).addScaledVector(a,m).addScaledVector(h,x),v=e*(.3+n.next()*.4);kg(i,s,r,g,v,a,c,h)}if(i.length===0)return null;const u=new mt;return u.setAttribute("position",new Ge(i,3)),u.setAttribute("normal",new Ge(s,3)),u.setIndex(r),u.computeBoundingSphere(),u}function kg(o,e,t,n,i,s,r,a){const l=i/2,c=[];for(let d=0;d<8;d++){const u=d&1?l:-l,f=d&2?l:-l,p=d&4?l:-l,m=n.clone().addScaledVector(r,u).addScaledVector(s,f).addScaledVector(a,p);c.push(m)}const h=[{verts:[0,1,3,2],normal:a.clone().negate()},{verts:[4,6,7,5],normal:a.clone()},{verts:[0,2,6,4],normal:r.clone().negate()},{verts:[1,5,7,3],normal:r.clone()},{verts:[0,4,5,1],normal:s.clone().negate()},{verts:[2,3,7,6],normal:s.clone()}];for(const d of h){const u=o.length/3;for(const f of d.verts){const p=c[f];o.push(p.x,p.y,p.z),e.push(d.normal.x,d.normal.y,d.normal.z)}t.push(u,u+1,u+2,u,u+2,u+3)}}function Gg(o){return new qe({uniforms:{sunDirection:{value:o.clone().normalize()},cloudColor:{value:new Ne(16777215)},shadowColor:{value:new Ne(8947882)},ambientIntensity:{value:.4}},vertexShader:Lg,fragmentShader:Og,transparent:!0,side:Yt,depthWrite:!0})}class Bg{constructor(e={},t){y(this,"clouds");y(this,"material");y(this,"config");y(this,"cloudMesh",null);this.config={...Fg,...e},this.clouds=new Gt,this.material=Gg(t),this.generateClouds()}generateClouds(){const e=new Ng(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity),i=[],s=[],r=[];let a=0;for(let l=0;l<n;l++){const c=e.next()*Math.PI*2,h=Math.acos(2*e.next()-1),d=(e.next()-.5)*this.config.cloudThickness,u=t+d,f=u*Math.sin(h)*Math.cos(c),p=u*Math.sin(h)*Math.sin(c),m=u*Math.cos(h),x=new R(f,p,m),g=new R(0,0,0),v=Ug(x,this.config.cloudScale*(.5+e.next()*.5),g,e);if(v){const _=v.attributes.position.array,C=v.attributes.normal.array,S=v.index.array;for(let b=0;b<_.length;b++)i.push(_[b]);for(let b=0;b<C.length;b++)s.push(C[b]);for(let b=0;b<S.length;b++)r.push(S[b]+a);a+=_.length/3,v.dispose()}}if(i.length>0){const l=new mt;l.setAttribute("position",new Ge(i,3)),l.setAttribute("normal",new Ge(s,3)),l.setIndex(r),l.computeBoundingSphere(),this.cloudMesh=new Ce(l,this.material),this.clouds.add(this.cloudMesh)}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function zg(o,e){return new Bg({planetRadius:o,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:N.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:N.CLOUD_ROTATION_SPEED},e)}class Hg{constructor(){y(this,"steps",new Map);y(this,"totalWeight",0);y(this,"completedWeight",0);y(this,"onProgressCallbacks",[]);y(this,"onCompleteCallbacks",[]);y(this,"currentStatus","Initializing...")}registerStep(e,t=1){this.steps.has(e)||(this.steps.set(e,{name:e,weight:t,completed:!1}),this.totalWeight+=t)}completeStep(e){const t=this.steps.get(e);!t||t.completed||(t.completed=!0,this.completedWeight+=t.weight,this.notifyProgress(),this.completedWeight>=this.totalWeight&&this.notifyComplete())}setStatus(e){this.currentStatus=e,this.notifyProgress()}getProgress(){return this.totalWeight===0?0:Math.min(100,Math.round(this.completedWeight/this.totalWeight*100))}isComplete(){return this.completedWeight>=this.totalWeight&&this.totalWeight>0}onProgress(e){this.onProgressCallbacks.push(e),e(this.getProgress(),this.currentStatus)}onComplete(e){this.onCompleteCallbacks.push(e),this.isComplete()&&e()}updateDOM(){const e=document.getElementById("loading-progress-bar"),t=document.getElementById("loading-status"),n=document.getElementById("loading-percentage"),i=this.getProgress();e&&(e.style.width=`${i}%`),t&&(t.textContent=this.currentStatus),n&&(n.textContent=`${i}%`)}hideLoadingScreen(){const e=document.getElementById("loading-screen");e&&(e.classList.add("hidden"),setTimeout(()=>{e.style.display="none"},500));const t=document.getElementById("instructions");t&&(t.style.display="block")}notifyProgress(){const e=this.getProgress();this.updateDOM();for(const t of this.onProgressCallbacks)t(e,this.currentStatus)}notifyComplete(){for(const e of this.onCompleteCallbacks)e()}reset(){this.steps.clear(),this.totalWeight=0,this.completedWeight=0,this.currentStatus="Initializing..."}}const Nt=new Hg;class Wg{constructor(){y(this,"engine");y(this,"inputManager");y(this,"earth");y(this,"moon");y(this,"player");y(this,"blockInteraction");y(this,"treeManager");y(this,"earthAtmosphere",null);y(this,"earthClouds",null);y(this,"isReady",!1);y(this,"elapsedTime",0);y(this,"waterUpdateTimer",0);y(this,"WATER_UPDATE_INTERVAL",5);y(this,"sharedFrustum",new ss);y(this,"projScreenMatrix",new pt);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");e.addEventListener("contextmenu",n=>n.preventDefault()),this.engine=new Gm(e),this.inputManager=new Fm,this.earth=new fl(this.engine.scene,100,N.EARTH_SUBDIVISIONS),this.moon=new fl(this.engine.scene,50,N.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,Pt.init(),Pt.setOnMenuCloseCallback(()=>{this.inputManager.resetMouseButtons()});let t=!1;document.addEventListener("keydown",n=>{if(n.key==="Escape"){const i=document.getElementById("instructions"),s=(i==null?void 0:i.style.display)==="block";Pt.isAnyMenuOpen()||s&&(t=!0,n.preventDefault())}}),document.addEventListener("keyup",n=>{n.key==="Escape"&&t&&(t=!1,e==null||e.requestPointerLock())}),this.inputManager.setPointerLockCallback(n=>{const i=document.getElementById("instructions");i&&(!n&&Pt.isAnyMenuOpen()?i.style.display="none":i.style.display=n?"none":"block");const s=document.getElementById("crosshair");s&&(s.style.display=n?"block":"none")}),this.init()}async init(){try{Nt.registerStep("textures",1),Nt.registerStep("terrain-generation",2),Nt.registerStep("initial-terrain",3),Nt.registerStep("player-setup",1),Nt.registerStep("environment",1),Nt.setStatus("Loading textures..."),await this.earth.initialize(),await this.moon.initialize(),Nt.completeStep("textures"),Nt.setStatus("Generating terrain..."),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),Nt.completeStep("terrain-generation"),Nt.setStatus("Building terrain around spawn...");const e=this.earth.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,1);await this.earth.buildInitialTerrain(e),Nt.completeStep("initial-terrain"),Nt.setStatus("Initializing player..."),this.player=new jm(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new Eg([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new Ag(this.engine.scene,this.engine.sunDirection),Ye.load();const t=Ye.getRemovedTrees("earth"),n=new Set(t.map(s=>s.tileIndex));this.treeManager.scatterTrees(this.earth.center,this.earth.radius,N.TREE_COUNT,s=>this.earth.getSurfaceHeightInDirection(s),s=>this.earth.isUnderwaterInDirection(s),N.TERRAIN_SEED,s=>this.earth.getTileIndexInDirection(s),s=>this.earth.getTileCenterInDirection(s),n),this.blockInteraction.setTreeManager(this.treeManager),Nt.completeStep("player-setup"),this.inputManager.setInventoryToggleCallback(()=>{this.blockInteraction.getCraftingSystem().toggle()}),this.inputManager.setPauseToggleCallback(()=>{const s=document.getElementById("instructions"),r=document.getElementById("mobile-controls");if(s){const a=s.style.display!=="none";s.style.display=a?"none":"block",r&&(r.style.display=a?"block":"none")}}),Nt.setStatus("Creating environment..."),N.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=Dg(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=zg(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection),Nt.completeStep("environment");const i=this.earth.getWaterShaderMaterial();i&&this.engine.registerWaterMaterial(i),this.earth.setWaterMeshCallback((s,r)=>{r?this.engine.registerWaterMesh(s):this.engine.unregisterWaterMesh(s)}),this.setupSettingsMenu(),Te.setFrameSpikeThreshold(N.FRAME_SPIKE_THRESHOLD_MS),this.loadSavedGame(),Ye.setPlayerSaveCallback(()=>this.player.exportForSave()),Ye.startAutoSave(5),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),Nt.setStatus("Ready!"),Nt.hideLoadingScreen(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,Te.begin("Player"),this.player.update(e),Te.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),Te.begin("Block Interaction");const t=this.inputManager.getState(),n=this.inputManager.isLocked(),i=this.inputManager.getWheelDelta();this.blockInteraction.update(e,n&&t.leftClick,n&&t.rightClick,n?i:0),Te.end("Block Interaction"),Te.begin("Frustum Calc"),this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix,this.engine.camera.matrixWorldInverse),this.sharedFrustum.setFromProjectionMatrix(this.projScreenMatrix),Te.end("Frustum Calc"),Te.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera,e,this.sharedFrustum),Te.end("Earth Update"),Te.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera,e,this.sharedFrustum),Te.end("Moon Update");const s=this.player.getIsInWater();if(this.earth.updateWaterShader(this.elapsedTime,s),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.waterUpdateTimer+=e,this.waterUpdateTimer>=this.WATER_UPDATE_INTERVAL){this.waterUpdateTimer=0;const r=this.earth.getVisibleTileIndices(),a=this.earth.updateWaterFlow(r);a>0&&console.log(`[Water update] Fixed ${a} water blocks in ${r.size} tiles`)}this.earth.isInOrbitView()?this.treeManager.setAllVisible(!1):this.treeManager.setAllVisible(!0)}setupSettingsMenu(){var c;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),s=document.getElementById("teleport-select"),r=document.querySelectorAll(".menu-tab");if(r.forEach(h=>{h.addEventListener("click",()=>{r.forEach(f=>f.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(f=>f.classList.remove("active")),h.classList.add("active");const d=h.getAttribute("data-tab"),u=document.getElementById(`tab-${d}`);u&&u.classList.add("active")})}),!e||!t)return;e.checked=((c=this.earthAtmosphere)==null?void 0:c.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=N.DEBUG_JETPACK_ENABLED,this.player.setJetpackEnabled(N.DEBUG_JETPACK_ENABLED),n.addEventListener("change",()=>{N.DEBUG_JETPACK_ENABLED=n.checked,this.player.setJetpackEnabled(n.checked)}));const a=document.getElementById("toggle-bypass-crafting");a&&(a.checked=N.DEBUG_BYPASS_CRAFTING_INGREDIENTS,a.addEventListener("change",()=>{N.DEBUG_BYPASS_CRAFTING_INGREDIENTS=a.checked})),i&&(i.checked=N.INVERT_Y_AXIS,i.addEventListener("change",()=>{N.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),s&&s.addEventListener("change",()=>{this.teleportToPlanet(s.value)});const l=document.getElementById("reset-game-btn");l&&l.addEventListener("click",()=>{confirm("Are you sure you want to reset your game? This will delete all saved progress.")&&(Ye.stopAutoSave(),Ye.clearSave(),window.location.reload())})}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1;let i;if(e==="earth")i=t.getSpawnPositionAtLatLon(N.EARTH_SPAWN_LAT,N.EARTH_SPAWN_LON,n);else{const s=new R(-1,0,0),r=t.getSurfaceHeightInDirection(s);i=t.center.clone(),i.x-=r+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}loadSavedGame(){const e=Ye.load();if(!e){console.log("No saved game found, starting fresh");return}if(this.blockInteraction.loadSavedData(),e.player&&e.player.position){const t=e.player.position;Math.sqrt(t.x*t.x+t.y*t.y+t.z*t.z)>50&&(this.player.importFromSave(e.player),console.log(`Loaded player position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`))}console.log("Game loaded from save")}}document.addEventListener("DOMContentLoaded",()=>{new Wg});
//# sourceMappingURL=index-DzZ9FYMH.js.map
