var ql=Object.defineProperty;var Xl=(r,e,t)=>e in r?ql(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var M=(r,e,t)=>Xl(r,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=t(i);fetch(i.href,s)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ro="181",Yl=0,Ko=1,$l=2,ol=1,al=2,Sn=3,Fn=0,Bt=1,Xt=2,Tn=0,mi=1,Or=2,jo=3,Jo=4,Kl=5,$n=100,jl=101,Jl=102,Zl=103,Ql=104,ec=200,tc=201,nc=202,ic=203,Nr=204,Fr=205,sc=206,rc=207,oc=208,ac=209,lc=210,cc=211,hc=212,uc=213,dc=214,Ur=0,kr=1,Br=2,xi=3,zr=4,Gr=5,Hr=6,Wr=7,Co=0,fc=1,pc=2,Nn=0,mc=1,gc=2,xc=3,vc=4,_c=5,yc=6,Sc=7,ll=300,vi=301,_i=302,Vr=303,qr=304,Ws=306,Hi=1e3,Nt=1001,Xr=1002,St=1003,bc=1004,ns=1005,tn=1006,Qs=1007,Zn=1008,pn=1009,cl=1010,hl=1011,Wi=1012,wo=1013,Un=1014,bn=1015,Mi=1016,Io=1017,Do=1018,Vi=1020,ul=35902,dl=35899,fl=1021,pl=1022,cn=1023,yi=1026,qi=1027,ml=1028,Po=1029,Lo=1030,Oo=1031,No=1033,ws=33776,Is=33777,Ds=33778,Ps=33779,Yr=35840,$r=35841,Kr=35842,jr=35843,Jr=36196,Zr=37492,Qr=37496,eo=37808,to=37809,no=37810,io=37811,so=37812,ro=37813,oo=37814,ao=37815,lo=37816,co=37817,ho=37818,uo=37819,fo=37820,po=37821,mo=36492,go=36494,xo=36495,vo=36283,_o=36284,yo=36285,So=36286,Tc=3200,Ec=3201,gl=0,Mc=1,Ln="",en="srgb",Si="srgb-linear",Bs="linear",dt="srgb",ei=7680,Zo=519,Ac=512,Rc=513,Cc=514,xl=515,wc=516,Ic=517,Dc=518,Pc=519,Qo=35044,ea="300 es",fn=2e3,zs=2001;function vl(r){for(let e=r.length-1;e>=0;--e)if(r[e]>=65535)return!0;return!1}function Xi(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Lc(){const r=Xi("canvas");return r.style.display="block",r}const ta={};function na(...r){const e="THREE."+r.shift();console.log(e,...r)}function $e(...r){const e="THREE."+r.shift();console.warn(e,...r)}function At(...r){const e="THREE."+r.shift();console.error(e,...r)}function Yi(...r){const e=r.join(" ");e in ta||(ta[e]=!0,$e(...r))}function Oc(r,e,t){return new Promise(function(n,i){function s(){switch(r.clientWaitSync(e,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:i();break;case r.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}class Ai{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let s=0,o=i.length;s<o;s++)i[s].call(this,e);e.target=null}}}const Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],er=Math.PI/180,bo=180/Math.PI;function Ki(){const r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ft[r&255]+Ft[r>>8&255]+Ft[r>>16&255]+Ft[r>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]).toLowerCase()}function st(r,e,t){return Math.max(e,Math.min(t,r))}function Nc(r,e){return(r%e+e)%e}function tr(r,e,t){return(1-t)*r+t*e}function wi(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function qt(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}class rt{constructor(e=0,t=0){rt.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*n-o*i+e.x,this.y=s*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class yt{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3],d=s[o+0],f=s[o+1],x=s[o+2],g=s[o+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(a>=1){e[t+0]=d,e[t+1]=f,e[t+2]=x,e[t+3]=g;return}if(u!==g||l!==d||c!==f||h!==x){let m=l*d+c*f+h*x+u*g;m<0&&(d=-d,f=-f,x=-x,g=-g,m=-m);let p=1-a;if(m<.9995){const _=Math.acos(m),y=Math.sin(_);p=Math.sin(p*_)/y,a=Math.sin(a*_)/y,l=l*p+d*a,c=c*p+f*a,h=h*p+x*a,u=u*p+g*a}else{l=l*p+d*a,c=c*p+f*a,h=h*p+x*a,u=u*p+g*a;const _=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=_,c*=_,h*=_,u*=_}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,s,o){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=s[o],d=s[o+1],f=s[o+2],x=s[o+3];return e[t]=a*x+h*u+l*f-c*d,e[t+1]=l*x+h*d+c*u-a*f,e[t+2]=c*x+h*f+a*d-l*u,e[t+3]=h*x-a*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),u=a(s/2),d=l(n/2),f=l(i/2),x=l(s/2);switch(o){case"XYZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"YXZ":this._x=d*h*u+c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"ZXY":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u-d*f*x;break;case"ZYX":this._x=d*h*u-c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u+d*f*x;break;case"YZX":this._x=d*h*u+c*f*x,this._y=c*f*u+d*h*x,this._z=c*h*x-d*f*u,this._w=c*h*u-d*f*x;break;case"XZY":this._x=d*h*u-c*f*x,this._y=c*f*u-d*h*x,this._z=c*h*x+d*f*u,this._w=c*h*u+d*f*x;break;default:$e("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(o-i)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(s+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(s-c)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(st(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+i*c-s*l,this._y=i*h+o*l+s*a-n*c,this._z=s*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,s=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,s=-s,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(e=0,t=0,n=0){P.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ia.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ia.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=e.elements,o=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*o,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*o,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*i-a*n),h=2*(a*t-s*i),u=2*(s*n-o*t);return this.x=t+l*c+o*u-a*h,this.y=n+l*h+a*c-s*u,this.z=i+l*u+s*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=i*l-s*a,this.y=s*o-n*l,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return nr.copy(this).projectOnVector(e),this.sub(nr)}reflect(e){return this.sub(nr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const nr=new P,ia=new yt;class Ze{constructor(e,t,n,i,s,o,a,l,c){Ze.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c)}set(e,t,n,i,s,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=s,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],x=n[8],g=i[0],m=i[3],p=i[6],_=i[1],y=i[4],E=i[7],C=i[2],v=i[5],A=i[8];return s[0]=o*g+a*_+l*C,s[3]=o*m+a*y+l*v,s[6]=o*p+a*E+l*A,s[1]=c*g+h*_+u*C,s[4]=c*m+h*y+u*v,s[7]=c*p+h*E+u*A,s[2]=d*g+f*_+x*C,s[5]=d*m+f*y+x*v,s[8]=d*p+f*E+x*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*s*h+n*a*l+i*s*c-i*o*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=h*o-a*c,d=a*l-h*s,f=c*s-o*l,x=t*u+n*d+i*f;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/x;return e[0]=u*g,e[1]=(i*c-h*n)*g,e[2]=(a*n-i*o)*g,e[3]=d*g,e[4]=(h*t-i*l)*g,e[5]=(i*s-a*t)*g,e[6]=f*g,e[7]=(n*l-c*t)*g,e[8]=(o*t-n*s)*g,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-i*c,i*l,-i*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(ir.makeScale(e,t)),this}rotate(e){return this.premultiply(ir.makeRotation(-e)),this}translate(e,t){return this.premultiply(ir.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const ir=new Ze,sa=new Ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ra=new Ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Fc(){const r={enabled:!0,workingColorSpace:Si,spaces:{},convert:function(i,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===dt&&(i.r=En(i.r),i.g=En(i.g),i.b=En(i.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===dt&&(i.r=gi(i.r),i.g=gi(i.g),i.b=gi(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Ln?Bs:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,o){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return Yi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return Yi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return r.define({[Si]:{primaries:e,whitePoint:n,transfer:Bs,toXYZ:sa,fromXYZ:ra,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:en},outputColorSpaceConfig:{drawingBufferColorSpace:en}},[en]:{primaries:e,whitePoint:n,transfer:dt,toXYZ:sa,fromXYZ:ra,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:en}}}),r}const at=Fc();function En(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function gi(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}let ti;class Uc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ti===void 0&&(ti=Xi("canvas")),ti.width=e.width,ti.height=e.height;const i=ti.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=ti}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Xi("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let o=0;o<s.length;o++)s[o]=En(s[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(En(t[n]/255)*255):t[n]=En(t[n]);return{data:t,width:e.width,height:e.height}}else return $e("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let kc=0;class Fo{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:kc++}),this.uuid=Ki(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?s.push(sr(i[o].image)):s.push(sr(i[o]))}else s=sr(i);n.url=s}return t||(e.images[this.uuid]=n),n}}function sr(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Uc.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:($e("Texture: Unable to serialize Texture."),{})}let Bc=0;const rr=new P;class zt extends Ai{constructor(e=zt.DEFAULT_IMAGE,t=zt.DEFAULT_MAPPING,n=Nt,i=Nt,s=tn,o=Zn,a=cn,l=pn,c=zt.DEFAULT_ANISOTROPY,h=Ln){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Bc++}),this.uuid=Ki(),this.name="",this.source=new Fo(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new rt(0,0),this.repeat=new rt(1,1),this.center=new rt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(rr).x}get height(){return this.source.getSize(rr).y}get depth(){return this.source.getSize(rr).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){$e(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){$e(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ll)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Hi:e.x=e.x-Math.floor(e.x);break;case Nt:e.x=e.x<0?0:1;break;case Xr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Hi:e.y=e.y-Math.floor(e.y);break;case Nt:e.y=e.y<0?0:1;break;case Xr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}zt.DEFAULT_IMAGE=null;zt.DEFAULT_MAPPING=ll;zt.DEFAULT_ANISOTROPY=1;class ft{constructor(e=0,t=0,n=0,i=1){ft.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*s,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*s,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*s,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],x=l[9],g=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-g)<.01&&Math.abs(x-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+g)<.1&&Math.abs(x+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(c+1)/2,E=(f+1)/2,C=(p+1)/2,v=(h+d)/4,A=(u+g)/4,L=(x+m)/4;return y>E&&y>C?y<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(y),i=v/n,s=A/n):E>C?E<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(E),n=v/i,s=L/i):C<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(C),n=A/s,i=L/s),this.set(n,i,s,t),this}let _=Math.sqrt((m-x)*(m-x)+(u-g)*(u-g)+(d-h)*(d-h));return Math.abs(_)<.001&&(_=1),this.x=(m-x)/_,this.y=(u-g)/_,this.z=(d-h)/_,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this.w=st(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this.w=st(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class zc extends Ai{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:tn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ft(0,0,e,t),this.scissorTest=!1,this.viewport=new ft(0,0,e,t);const i={width:e,height:t,depth:n.depth},s=new zt(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:tn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new Fo(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class kn extends zc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class _l extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=St,this.minFilter=St,this.wrapR=Nt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Gc extends zt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=St,this.minFilter=St,this.wrapR=Nt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ji{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(sn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(sn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=sn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,sn):sn.fromBufferAttribute(s,o),sn.applyMatrix4(e.matrixWorld),this.expandByPoint(sn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),is.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),is.copy(n.boundingBox)),is.applyMatrix4(e.matrixWorld),this.union(is)}const i=e.children;for(let s=0,o=i.length;s<o;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,sn),sn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ii),ss.subVectors(this.max,Ii),ni.subVectors(e.a,Ii),ii.subVectors(e.b,Ii),si.subVectors(e.c,Ii),Rn.subVectors(ii,ni),Cn.subVectors(si,ii),Gn.subVectors(ni,si);let t=[0,-Rn.z,Rn.y,0,-Cn.z,Cn.y,0,-Gn.z,Gn.y,Rn.z,0,-Rn.x,Cn.z,0,-Cn.x,Gn.z,0,-Gn.x,-Rn.y,Rn.x,0,-Cn.y,Cn.x,0,-Gn.y,Gn.x,0];return!or(t,ni,ii,si,ss)||(t=[1,0,0,0,1,0,0,0,1],!or(t,ni,ii,si,ss))?!1:(rs.crossVectors(Rn,Cn),t=[rs.x,rs.y,rs.z],or(t,ni,ii,si,ss))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,sn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(sn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(mn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),mn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),mn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),mn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),mn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),mn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),mn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),mn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(mn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const mn=[new P,new P,new P,new P,new P,new P,new P,new P],sn=new P,is=new ji,ni=new P,ii=new P,si=new P,Rn=new P,Cn=new P,Gn=new P,Ii=new P,ss=new P,rs=new P,Hn=new P;function or(r,e,t,n,i){for(let s=0,o=r.length-3;s<=o;s+=3){Hn.fromArray(r,s);const a=i.x*Math.abs(Hn.x)+i.y*Math.abs(Hn.y)+i.z*Math.abs(Hn.z),l=e.dot(Hn),c=t.dot(Hn),h=n.dot(Hn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const Hc=new ji,Di=new P,ar=new P;class bi{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Hc.setFromPoints(e).getCenter(n);let i=0;for(let s=0,o=e.length;s<o;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Di.subVectors(e,this.center);const t=Di.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Di,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(ar.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Di.copy(e.center).add(ar)),this.expandByPoint(Di.copy(e.center).sub(ar))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const gn=new P,lr=new P,os=new P,wn=new P,cr=new P,as=new P,hr=new P;class Uo{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,gn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=gn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(gn.copy(this.origin).addScaledVector(this.direction,t),gn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){lr.copy(e).add(t).multiplyScalar(.5),os.copy(t).sub(e).normalize(),wn.copy(this.origin).sub(lr);const s=e.distanceTo(t)*.5,o=-this.direction.dot(os),a=wn.dot(this.direction),l=-wn.dot(os),c=wn.lengthSq(),h=Math.abs(1-o*o);let u,d,f,x;if(h>0)if(u=o*l-a,d=o*a-l,x=s*h,u>=0)if(d>=-x)if(d<=x){const g=1/h;u*=g,d*=g,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-x?(u=Math.max(0,-(-o*s+a)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=x?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(o*s+a)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=o>0?-s:s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(lr).addScaledVector(os,d),f}intersectSphere(e,t){gn.subVectors(e.center,this.origin);const n=gn.dot(this.direction),i=gn.dot(gn)-n*n,s=e.radius*e.radius;if(i>s)return null;const o=Math.sqrt(s-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,i=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,i=(e.min.x-d.x)*c),h>=0?(s=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),n>o||s>i||((s>n||isNaN(n))&&(n=s),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,gn)!==null}intersectTriangle(e,t,n,i,s){cr.subVectors(t,e),as.subVectors(n,e),hr.crossVectors(cr,as);let o=this.direction.dot(hr),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;wn.subVectors(this.origin,e);const l=a*this.direction.dot(as.crossVectors(wn,as));if(l<0)return null;const c=a*this.direction.dot(cr.cross(wn));if(c<0||l+c>o)return null;const h=-a*wn.dot(hr);return h<0?null:this.at(h/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class pt{constructor(e,t,n,i,s,o,a,l,c,h,u,d,f,x,g,m){pt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c,h,u,d,f,x,g,m)}set(e,t,n,i,s,o,a,l,c,h,u,d,f,x,g,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=s,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=x,p[11]=g,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new pt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/ri.setFromMatrixColumn(e,0).length(),s=1/ri.setFromMatrixColumn(e,1).length(),o=1/ri.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,s=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){const d=o*h,f=o*u,x=a*h,g=a*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+x*c,t[5]=d-g*c,t[9]=-a*l,t[2]=g-d*c,t[6]=x+f*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,x=c*h,g=c*u;t[0]=d+g*a,t[4]=x*a-f,t[8]=o*c,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=f*a-x,t[6]=g+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,x=c*h,g=c*u;t[0]=d-g*a,t[4]=-o*u,t[8]=x+f*a,t[1]=f+x*a,t[5]=o*h,t[9]=g-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*h,f=o*u,x=a*h,g=a*u;t[0]=l*h,t[4]=x*c-f,t[8]=d*c+g,t[1]=l*u,t[5]=g*c+d,t[9]=f*c-x,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,f=o*c,x=a*l,g=a*c;t[0]=l*h,t[4]=g-d*u,t[8]=x*u+f,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*u+x,t[10]=d-g*u}else if(e.order==="XZY"){const d=o*l,f=o*c,x=a*l,g=a*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+g,t[5]=o*h,t[9]=f*u-x,t[2]=x*u-f,t[6]=a*h,t[10]=g*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Wc,e,Vc)}lookAt(e,t,n){const i=this.elements;return Kt.subVectors(e,t),Kt.lengthSq()===0&&(Kt.z=1),Kt.normalize(),In.crossVectors(n,Kt),In.lengthSq()===0&&(Math.abs(n.z)===1?Kt.x+=1e-4:Kt.z+=1e-4,Kt.normalize(),In.crossVectors(n,Kt)),In.normalize(),ls.crossVectors(Kt,In),i[0]=In.x,i[4]=ls.x,i[8]=Kt.x,i[1]=In.y,i[5]=ls.y,i[9]=Kt.y,i[2]=In.z,i[6]=ls.z,i[10]=Kt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],x=n[2],g=n[6],m=n[10],p=n[14],_=n[3],y=n[7],E=n[11],C=n[15],v=i[0],A=i[4],L=i[8],b=i[12],S=i[1],w=i[5],N=i[9],F=i[13],B=i[2],q=i[6],H=i[10],Z=i[14],W=i[3],J=i[7],K=i[11],he=i[15];return s[0]=o*v+a*S+l*B+c*W,s[4]=o*A+a*w+l*q+c*J,s[8]=o*L+a*N+l*H+c*K,s[12]=o*b+a*F+l*Z+c*he,s[1]=h*v+u*S+d*B+f*W,s[5]=h*A+u*w+d*q+f*J,s[9]=h*L+u*N+d*H+f*K,s[13]=h*b+u*F+d*Z+f*he,s[2]=x*v+g*S+m*B+p*W,s[6]=x*A+g*w+m*q+p*J,s[10]=x*L+g*N+m*H+p*K,s[14]=x*b+g*F+m*Z+p*he,s[3]=_*v+y*S+E*B+C*W,s[7]=_*A+y*w+E*q+C*J,s[11]=_*L+y*N+E*H+C*K,s[15]=_*b+y*F+E*Z+C*he,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],x=e[3],g=e[7],m=e[11],p=e[15];return x*(+s*l*u-i*c*u-s*a*d+n*c*d+i*a*f-n*l*f)+g*(+t*l*f-t*c*d+s*o*d-i*o*f+i*c*h-s*l*h)+m*(+t*c*u-t*a*f-s*o*u+n*o*f+s*a*h-n*c*h)+p*(-i*a*h-t*l*u+t*a*d+i*o*u-n*o*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],x=e[12],g=e[13],m=e[14],p=e[15],_=u*m*c-g*d*c+g*l*f-a*m*f-u*l*p+a*d*p,y=x*d*c-h*m*c-x*l*f+o*m*f+h*l*p-o*d*p,E=h*g*c-x*u*c+x*a*f-o*g*f-h*a*p+o*u*p,C=x*u*l-h*g*l-x*a*d+o*g*d+h*a*m-o*u*m,v=t*_+n*y+i*E+s*C;if(v===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/v;return e[0]=_*A,e[1]=(g*d*s-u*m*s-g*i*f+n*m*f+u*i*p-n*d*p)*A,e[2]=(a*m*s-g*l*s+g*i*c-n*m*c-a*i*p+n*l*p)*A,e[3]=(u*l*s-a*d*s-u*i*c+n*d*c+a*i*f-n*l*f)*A,e[4]=y*A,e[5]=(h*m*s-x*d*s+x*i*f-t*m*f-h*i*p+t*d*p)*A,e[6]=(x*l*s-o*m*s-x*i*c+t*m*c+o*i*p-t*l*p)*A,e[7]=(o*d*s-h*l*s+h*i*c-t*d*c-o*i*f+t*l*f)*A,e[8]=E*A,e[9]=(x*u*s-h*g*s-x*n*f+t*g*f+h*n*p-t*u*p)*A,e[10]=(o*g*s-x*a*s+x*n*c-t*g*c-o*n*p+t*a*p)*A,e[11]=(h*a*s-o*u*s-h*n*c+t*u*c+o*n*f-t*a*f)*A,e[12]=C*A,e[13]=(h*g*i-x*u*i+x*n*d-t*g*d-h*n*m+t*u*m)*A,e[14]=(x*a*i-o*g*i-x*n*l+t*g*l+o*n*m-t*a*m)*A,e[15]=(o*u*i-h*a*i+h*n*l-t*u*l-o*n*d+t*a*d)*A,this}scale(e){const t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),s=1-n,o=e.x,a=e.y,l=e.z,c=s*o,h=s*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,o){return this.set(1,n,s,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,h=o+o,u=a+a,d=s*c,f=s*h,x=s*u,g=o*h,m=o*u,p=a*u,_=l*c,y=l*h,E=l*u,C=n.x,v=n.y,A=n.z;return i[0]=(1-(g+p))*C,i[1]=(f+E)*C,i[2]=(x-y)*C,i[3]=0,i[4]=(f-E)*v,i[5]=(1-(d+p))*v,i[6]=(m+_)*v,i[7]=0,i[8]=(x+y)*A,i[9]=(m-_)*A,i[10]=(1-(d+g))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let s=ri.set(i[0],i[1],i[2]).length();const o=ri.set(i[4],i[5],i[6]).length(),a=ri.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],rn.copy(this);const c=1/s,h=1/o,u=1/a;return rn.elements[0]*=c,rn.elements[1]*=c,rn.elements[2]*=c,rn.elements[4]*=h,rn.elements[5]*=h,rn.elements[6]*=h,rn.elements[8]*=u,rn.elements[9]*=u,rn.elements[10]*=u,t.setFromRotationMatrix(rn),n.x=s,n.y=o,n.z=a,this}makePerspective(e,t,n,i,s,o,a=fn,l=!1){const c=this.elements,h=2*s/(t-e),u=2*s/(n-i),d=(t+e)/(t-e),f=(n+i)/(n-i);let x,g;if(l)x=s/(o-s),g=o*s/(o-s);else if(a===fn)x=-(o+s)/(o-s),g=-2*o*s/(o-s);else if(a===zs)x=-o/(o-s),g=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,o,a=fn,l=!1){const c=this.elements,h=2/(t-e),u=2/(n-i),d=-(t+e)/(t-e),f=-(n+i)/(n-i);let x,g;if(l)x=1/(o-s),g=o/(o-s);else if(a===fn)x=-2/(o-s),g=-(o+s)/(o-s);else if(a===zs)x=-1/(o-s),g=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ri=new P,rn=new pt,Wc=new P(0,0,0),Vc=new P(1,1,1),In=new P,ls=new P,Kt=new P,oa=new pt,aa=new yt;class hn{constructor(e=0,t=0,n=0,i=hn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,s=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],u=i[2],d=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(st(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-st(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(st(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-st(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(st(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-st(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:$e("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return oa.makeRotationFromQuaternion(e),this.setFromRotationMatrix(oa,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return aa.setFromEuler(this),this.setFromQuaternion(aa,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}hn.DEFAULT_ORDER="XYZ";class ko{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let qc=0;const la=new P,oi=new yt,xn=new pt,cs=new P,Pi=new P,Xc=new P,Yc=new yt,ca=new P(1,0,0),ha=new P(0,1,0),ua=new P(0,0,1),da={type:"added"},$c={type:"removed"},ai={type:"childadded",child:null},ur={type:"childremoved",child:null};class Lt extends Ai{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:qc++}),this.uuid=Ki(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Lt.DEFAULT_UP.clone();const e=new P,t=new hn,n=new yt,i=new P(1,1,1);function s(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new pt},normalMatrix:{value:new Ze}}),this.matrix=new pt,this.matrixWorld=new pt,this.matrixAutoUpdate=Lt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Lt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ko,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return oi.setFromAxisAngle(e,t),this.quaternion.multiply(oi),this}rotateOnWorldAxis(e,t){return oi.setFromAxisAngle(e,t),this.quaternion.premultiply(oi),this}rotateX(e){return this.rotateOnAxis(ca,e)}rotateY(e){return this.rotateOnAxis(ha,e)}rotateZ(e){return this.rotateOnAxis(ua,e)}translateOnAxis(e,t){return la.copy(e).applyQuaternion(this.quaternion),this.position.add(la.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ca,e)}translateY(e){return this.translateOnAxis(ha,e)}translateZ(e){return this.translateOnAxis(ua,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(xn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?cs.copy(e):cs.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Pi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?xn.lookAt(Pi,cs,this.up):xn.lookAt(cs,Pi,this.up),this.quaternion.setFromRotationMatrix(xn),i&&(xn.extractRotation(i.matrixWorld),oi.setFromRotationMatrix(xn),this.quaternion.premultiply(oi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(At("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(da),ai.child=e,this.dispatchEvent(ai),ai.child=null):At("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent($c),ur.child=e,this.dispatchEvent(ur),ur.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),xn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),xn.multiply(e.parent.matrixWorld)),e.applyMatrix4(xn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(da),ai.child=e,this.dispatchEvent(ai),ai.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Pi,e,Xc),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Pi,Yc,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));i.material=a}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),f=o(e.animations),x=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),x.length>0&&(n.nodes=x)}return n.object=i,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}Lt.DEFAULT_UP=new P(0,1,0);Lt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Lt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const on=new P,vn=new P,dr=new P,_n=new P,li=new P,ci=new P,fa=new P,fr=new P,pr=new P,mr=new P,gr=new ft,xr=new ft,vr=new ft;class an{constructor(e=new P,t=new P,n=new P){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),on.subVectors(e,t),i.cross(on);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){on.subVectors(i,t),vn.subVectors(n,t),dr.subVectors(e,t);const o=on.dot(on),a=on.dot(vn),l=on.dot(dr),c=vn.dot(vn),h=vn.dot(dr),u=o*c-a*a;if(u===0)return s.set(0,0,0),null;const d=1/u,f=(c*l-a*h)*d,x=(o*h-a*l)*d;return s.set(1-f-x,x,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,_n)===null?!1:_n.x>=0&&_n.y>=0&&_n.x+_n.y<=1}static getInterpolation(e,t,n,i,s,o,a,l){return this.getBarycoord(e,t,n,i,_n)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,_n.x),l.addScaledVector(o,_n.y),l.addScaledVector(a,_n.z),l)}static getInterpolatedAttribute(e,t,n,i,s,o){return gr.setScalar(0),xr.setScalar(0),vr.setScalar(0),gr.fromBufferAttribute(e,t),xr.fromBufferAttribute(e,n),vr.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(gr,s.x),o.addScaledVector(xr,s.y),o.addScaledVector(vr,s.z),o}static isFrontFacing(e,t,n,i){return on.subVectors(n,t),vn.subVectors(e,t),on.cross(vn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return on.subVectors(this.c,this.b),vn.subVectors(this.a,this.b),on.cross(vn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return an.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return an.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return an.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return an.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return an.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,s=this.c;let o,a;li.subVectors(i,n),ci.subVectors(s,n),fr.subVectors(e,n);const l=li.dot(fr),c=ci.dot(fr);if(l<=0&&c<=0)return t.copy(n);pr.subVectors(e,i);const h=li.dot(pr),u=ci.dot(pr);if(h>=0&&u<=h)return t.copy(i);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(li,o);mr.subVectors(e,s);const f=li.dot(mr),x=ci.dot(mr);if(x>=0&&f<=x)return t.copy(s);const g=f*c-l*x;if(g<=0&&c>=0&&x<=0)return a=c/(c-x),t.copy(n).addScaledVector(ci,a);const m=h*x-f*u;if(m<=0&&u-h>=0&&f-x>=0)return fa.subVectors(s,i),a=(u-h)/(u-h+(f-x)),t.copy(i).addScaledVector(fa,a);const p=1/(m+g+d);return o=g*p,a=d*p,t.copy(n).addScaledVector(li,o).addScaledVector(ci,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const yl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Dn={h:0,s:0,l:0},hs={h:0,s:0,l:0};function _r(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}class we{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=en){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,at.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=at.workingColorSpace){return this.r=e,this.g=t,this.b=n,at.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=at.workingColorSpace){if(e=Nc(e,1),t=st(t,0,1),n=st(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,o=2*n-s;this.r=_r(o,s,e+1/3),this.g=_r(o,s,e),this.b=_r(o,s,e-1/3)}return at.colorSpaceToWorking(this,i),this}setStyle(e,t=en){function n(s){s!==void 0&&parseFloat(s)<1&&$e("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:$e("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=i[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);$e("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=en){const n=yl[e.toLowerCase()];return n!==void 0?this.setHex(n,t):$e("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=En(e.r),this.g=En(e.g),this.b=En(e.b),this}copyLinearToSRGB(e){return this.r=gi(e.r),this.g=gi(e.g),this.b=gi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=en){return at.workingToColorSpace(Ut.copy(this),e),Math.round(st(Ut.r*255,0,255))*65536+Math.round(st(Ut.g*255,0,255))*256+Math.round(st(Ut.b*255,0,255))}getHexString(e=en){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=at.workingColorSpace){at.workingToColorSpace(Ut.copy(this),t);const n=Ut.r,i=Ut.g,s=Ut.b,o=Math.max(n,i,s),a=Math.min(n,i,s);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(i-s)/u+(i<s?6:0);break;case i:l=(s-n)/u+2;break;case s:l=(n-i)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=at.workingColorSpace){return at.workingToColorSpace(Ut.copy(this),t),e.r=Ut.r,e.g=Ut.g,e.b=Ut.b,e}getStyle(e=en){at.workingToColorSpace(Ut.copy(this),e);const t=Ut.r,n=Ut.g,i=Ut.b;return e!==en?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Dn),this.setHSL(Dn.h+e,Dn.s+t,Dn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Dn),e.getHSL(hs);const n=tr(Dn.h,hs.h,t),i=tr(Dn.s,hs.s,t),s=tr(Dn.l,hs.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ut=new we;we.NAMES=yl;let Kc=0;class Mn extends Ai{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Kc++}),this.uuid=Ki(),this.name="",this.type="Material",this.blending=mi,this.side=Fn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Nr,this.blendDst=Fr,this.blendEquation=$n,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new we(0,0,0),this.blendAlpha=0,this.depthFunc=xi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Zo,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ei,this.stencilZFail=ei,this.stencilZPass=ei,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){$e(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){$e(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==mi&&(n.blending=this.blending),this.side!==Fn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Nr&&(n.blendSrc=this.blendSrc),this.blendDst!==Fr&&(n.blendDst=this.blendDst),this.blendEquation!==$n&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==xi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Zo&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ei&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ei&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ei&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=i(e.textures),o=i(e.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Ji extends Mn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new we(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hn,this.combine=Co,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Rt=new P,us=new rt;let jc=0;class Ct{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:jc++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Qo,this.updateRanges=[],this.gpuType=bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)us.fromBufferAttribute(this,t),us.applyMatrix3(e),this.setXY(t,us.x,us.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix3(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix4(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyNormalMatrix(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.transformDirection(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=wi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=qt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=wi(t,this.array)),t}setX(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=wi(t,this.array)),t}setY(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=wi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=wi(t,this.array)),t}setW(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array),i=qt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array),i=qt(i,this.array),s=qt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Qo&&(e.usage=this.usage),e}}class Sl extends Ct{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class bl extends Ct{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Oe extends Ct{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Jc=0;const Qt=new pt,yr=new Lt,hi=new P,jt=new ji,Li=new ji,Dt=new P;class xt extends Ai{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Jc++}),this.uuid=Ki(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(vl(e)?bl:Sl)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Ze().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Qt.makeRotationFromQuaternion(e),this.applyMatrix4(Qt),this}rotateX(e){return Qt.makeRotationX(e),this.applyMatrix4(Qt),this}rotateY(e){return Qt.makeRotationY(e),this.applyMatrix4(Qt),this}rotateZ(e){return Qt.makeRotationZ(e),this.applyMatrix4(Qt),this}translate(e,t,n){return Qt.makeTranslation(e,t,n),this.applyMatrix4(Qt),this}scale(e,t,n){return Qt.makeScale(e,t,n),this.applyMatrix4(Qt),this}lookAt(e){return yr.lookAt(e),yr.updateMatrix(),this.applyMatrix4(yr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(hi).negate(),this.translate(hi.x,hi.y,hi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,s=e.length;i<s;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Oe(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&$e("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ji);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){At("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const s=t[n];jt.setFromBufferAttribute(s),this.morphTargetsRelative?(Dt.addVectors(this.boundingBox.min,jt.min),this.boundingBox.expandByPoint(Dt),Dt.addVectors(this.boundingBox.max,jt.max),this.boundingBox.expandByPoint(Dt)):(this.boundingBox.expandByPoint(jt.min),this.boundingBox.expandByPoint(jt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&At('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new bi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){At("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(e){const n=this.boundingSphere.center;if(jt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Li.setFromBufferAttribute(a),this.morphTargetsRelative?(Dt.addVectors(jt.min,Li.min),jt.expandByPoint(Dt),Dt.addVectors(jt.max,Li.max),jt.expandByPoint(Dt)):(jt.expandByPoint(Li.min),jt.expandByPoint(Li.max))}jt.getCenter(n);let i=0;for(let s=0,o=e.count;s<o;s++)Dt.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(Dt));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Dt.fromBufferAttribute(a,c),l&&(hi.fromBufferAttribute(e,c),Dt.add(hi)),i=Math.max(i,n.distanceToSquared(Dt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&At('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){At("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ct(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<n.count;L++)a[L]=new P,l[L]=new P;const c=new P,h=new P,u=new P,d=new rt,f=new rt,x=new rt,g=new P,m=new P;function p(L,b,S){c.fromBufferAttribute(n,L),h.fromBufferAttribute(n,b),u.fromBufferAttribute(n,S),d.fromBufferAttribute(s,L),f.fromBufferAttribute(s,b),x.fromBufferAttribute(s,S),h.sub(c),u.sub(c),f.sub(d),x.sub(d);const w=1/(f.x*x.y-x.x*f.y);isFinite(w)&&(g.copy(h).multiplyScalar(x.y).addScaledVector(u,-f.y).multiplyScalar(w),m.copy(u).multiplyScalar(f.x).addScaledVector(h,-x.x).multiplyScalar(w),a[L].add(g),a[b].add(g),a[S].add(g),l[L].add(m),l[b].add(m),l[S].add(m))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let L=0,b=_.length;L<b;++L){const S=_[L],w=S.start,N=S.count;for(let F=w,B=w+N;F<B;F+=3)p(e.getX(F+0),e.getX(F+1),e.getX(F+2))}const y=new P,E=new P,C=new P,v=new P;function A(L){C.fromBufferAttribute(i,L),v.copy(C);const b=a[L];y.copy(b),y.sub(C.multiplyScalar(C.dot(b))).normalize(),E.crossVectors(v,b);const w=E.dot(l[L])<0?-1:1;o.setXYZW(L,y.x,y.y,y.z,w)}for(let L=0,b=_.length;L<b;++L){const S=_[L],w=S.start,N=S.count;for(let F=w,B=w+N;F<B;F+=3)A(e.getX(F+0)),A(e.getX(F+1)),A(e.getX(F+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ct(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new P,s=new P,o=new P,a=new P,l=new P,c=new P,h=new P,u=new P;if(e)for(let d=0,f=e.count;d<f;d+=3){const x=e.getX(d+0),g=e.getX(d+1),m=e.getX(d+2);i.fromBufferAttribute(t,x),s.fromBufferAttribute(t,g),o.fromBufferAttribute(t,m),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),a.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(x,a.x,a.y,a.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Dt.fromBufferAttribute(e,t),Dt.normalize(),e.setXYZ(t,Dt.x,Dt.y,Dt.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,x=0;for(let g=0,m=l.length;g<m;g++){a.isInterleavedBufferAttribute?f=l[g]*a.data.stride+a.offset:f=l[g]*h;for(let p=0;p<h;p++)d[x++]=c[f++]}return new Ct(d,h,u)}if(this.index===null)return $e("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new xt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(i[l]=h,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const s=e.morphAttributes;for(const c in s){const h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const pa=new pt,Wn=new Uo,ds=new bi,ma=new P,fs=new P,ps=new P,ms=new P,Sr=new P,gs=new P,ga=new P,xs=new P;class Le extends Lt{constructor(e=new xt,t=new Ji){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(s&&a){gs.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=a[l],u=s[l];h!==0&&(Sr.fromBufferAttribute(u,e),o?gs.addScaledVector(Sr,h):gs.addScaledVector(Sr.sub(t),h))}t.add(gs)}return t}raycast(e,t){const n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ds.copy(n.boundingSphere),ds.applyMatrix4(s),Wn.copy(e.ray).recast(e.near),!(ds.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(ds,ma)===null||Wn.origin.distanceToSquared(ma)>(e.far-e.near)**2))&&(pa.copy(s).invert(),Wn.copy(e.ray).applyMatrix4(pa),!(n.boundingBox!==null&&Wn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Wn)))}_computeIntersections(e,t,n){let i;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){const m=d[x],p=o[m.materialIndex],_=Math.max(m.start,f.start),y=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let E=_,C=y;E<C;E+=3){const v=a.getX(E),A=a.getX(E+1),L=a.getX(E+2);i=vs(this,p,e,n,c,h,u,v,A,L),i&&(i.faceIndex=Math.floor(E/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const x=Math.max(0,f.start),g=Math.min(a.count,f.start+f.count);for(let m=x,p=g;m<p;m+=3){const _=a.getX(m),y=a.getX(m+1),E=a.getX(m+2);i=vs(this,o,e,n,c,h,u,_,y,E),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let x=0,g=d.length;x<g;x++){const m=d[x],p=o[m.materialIndex],_=Math.max(m.start,f.start),y=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let E=_,C=y;E<C;E+=3){const v=E,A=E+1,L=E+2;i=vs(this,p,e,n,c,h,u,v,A,L),i&&(i.faceIndex=Math.floor(E/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const x=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let m=x,p=g;m<p;m+=3){const _=m,y=m+1,E=m+2;i=vs(this,o,e,n,c,h,u,_,y,E),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}}}function Zc(r,e,t,n,i,s,o,a){let l;if(e.side===Bt?l=n.intersectTriangle(o,s,i,!0,a):l=n.intersectTriangle(i,s,o,e.side===Fn,a),l===null)return null;xs.copy(a),xs.applyMatrix4(r.matrixWorld);const c=t.ray.origin.distanceTo(xs);return c<t.near||c>t.far?null:{distance:c,point:xs.clone(),object:r}}function vs(r,e,t,n,i,s,o,a,l,c){r.getVertexPosition(a,fs),r.getVertexPosition(l,ps),r.getVertexPosition(c,ms);const h=Zc(r,e,t,n,fs,ps,ms,ga);if(h){const u=new P;an.getBarycoord(ga,fs,ps,ms,u),i&&(h.uv=an.getInterpolatedAttribute(i,a,l,c,u,new rt)),s&&(h.uv1=an.getInterpolatedAttribute(s,a,l,c,u,new rt)),o&&(h.normal=an.getInterpolatedAttribute(o,a,l,c,u,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new P,materialIndex:0};an.getNormal(fs,ps,ms,d.normal),h.face=d,h.barycoord=u}return h}class An extends xt{constructor(e=1,t=1,n=1,i=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:o};const a=this;i=Math.floor(i),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;x("z","y","x",-1,-1,n,t,e,o,s,0),x("z","y","x",1,-1,n,t,-e,o,s,1),x("x","z","y",1,1,e,n,t,i,o,2),x("x","z","y",1,-1,e,n,-t,i,o,3),x("x","y","z",1,-1,e,t,n,i,s,4),x("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Oe(c,3)),this.setAttribute("normal",new Oe(h,3)),this.setAttribute("uv",new Oe(u,2));function x(g,m,p,_,y,E,C,v,A,L,b){const S=E/A,w=C/L,N=E/2,F=C/2,B=v/2,q=A+1,H=L+1;let Z=0,W=0;const J=new P;for(let K=0;K<H;K++){const he=K*w-F;for(let Ae=0;Ae<q;Ae++){const ke=Ae*S-N;J[g]=ke*_,J[m]=he*y,J[p]=B,c.push(J.x,J.y,J.z),J[g]=0,J[m]=0,J[p]=v>0?1:-1,h.push(J.x,J.y,J.z),u.push(Ae/A),u.push(1-K/L),Z+=1}}for(let K=0;K<L;K++)for(let he=0;he<A;he++){const Ae=d+he+q*K,ke=d+he+q*(K+1),Ke=d+(he+1)+q*(K+1),Xe=d+(he+1)+q*K;l.push(Ae,ke,Xe),l.push(ke,Ke,Xe),W+=6}a.addGroup(f,W,b),f+=W,d+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new An(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ti(r){const e={};for(const t in r){e[t]={};for(const n in r[t]){const i=r[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?($e("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Ht(r){const e={};for(let t=0;t<r.length;t++){const n=Ti(r[t]);for(const i in n)e[i]=n[i]}return e}function Qc(r){const e=[];for(let t=0;t<r.length;t++)e.push(r[t].clone());return e}function Tl(r){const e=r.getRenderTarget();return e===null?r.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:at.workingColorSpace}const eh={clone:Ti,merge:Ht};var th=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,nh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ct extends Mn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=th,this.fragmentShader=nh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ti(e.uniforms),this.uniformsGroups=Qc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class El extends Lt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new pt,this.projectionMatrix=new pt,this.projectionMatrixInverse=new pt,this.coordinateSystem=fn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Pn=new P,xa=new rt,va=new rt;class Jt extends El{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=bo*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(er*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return bo*2*Math.atan(Math.tan(er*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Pn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Pn.x,Pn.y).multiplyScalar(-e/Pn.z),Pn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Pn.x,Pn.y).multiplyScalar(-e/Pn.z)}getViewSize(e,t){return this.getViewBounds(e,xa,va),t.subVectors(va,xa)}setViewOffset(e,t,n,i,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(er*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*i/l,t-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ui=-90,di=1;class ih extends Lt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Jt(ui,di,e,t);i.layers=this.layers,this.add(i);const s=new Jt(ui,di,e,t);s.layers=this.layers,this.add(s);const o=new Jt(ui,di,e,t);o.layers=this.layers,this.add(o);const a=new Jt(ui,di,e,t);a.layers=this.layers,this.add(a);const l=new Jt(ui,di,e,t);l.layers=this.layers,this.add(l);const c=new Jt(ui,di,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===fn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===zs)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),x=e.xr.enabled;e.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,s),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=g,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=x,n.texture.needsPMREMUpdate=!0}}class Ml extends zt{constructor(e=[],t=vi,n,i,s,o,a,l,c,h){super(e,t,n,i,s,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class sh extends kn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Ml(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new An(5,5,5),s=new ct({name:"CubemapFromEquirect",uniforms:Ti(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Bt,blending:Tn});s.uniforms.tEquirect.value=t;const o=new Le(i,s),a=t.minFilter;return t.minFilter===Zn&&(t.minFilter=tn),new ih(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(s)}}class kt extends Lt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const rh={type:"move"};class br{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new kt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new kt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new kt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const g of e.hand.values()){const m=t.getJointPose(g,n),p=this._getHandJoint(c,g);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,x=.005;c.inputState.pinching&&d>f+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(rh)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new kt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Bo{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new we(e),this.near=t,this.far=n}clone(){return new Bo(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class oh extends Lt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hn,this.environmentIntensity=1,this.environmentRotation=new hn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class ah extends zt{constructor(e=null,t=1,n=1,i,s,o,a,l,c=St,h=St,u,d){super(null,o,a,l,c,h,i,s,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Tr=new P,lh=new P,ch=new Ze;class Yn{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Tr.subVectors(n,t).cross(lh.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Tr),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||ch.getNormalMatrix(e),i=this.coplanarPoint(Tr).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Vn=new bi,hh=new rt(.5,.5),_s=new P;class Zi{constructor(e=new Yn,t=new Yn,n=new Yn,i=new Yn,s=new Yn,o=new Yn){this.planes=[e,t,n,i,s,o]}set(e,t,n,i,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=fn,n=!1){const i=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],h=s[4],u=s[5],d=s[6],f=s[7],x=s[8],g=s[9],m=s[10],p=s[11],_=s[12],y=s[13],E=s[14],C=s[15];if(i[0].setComponents(c-o,f-h,p-x,C-_).normalize(),i[1].setComponents(c+o,f+h,p+x,C+_).normalize(),i[2].setComponents(c+a,f+u,p+g,C+y).normalize(),i[3].setComponents(c-a,f-u,p-g,C-y).normalize(),n)i[4].setComponents(l,d,m,E).normalize(),i[5].setComponents(c-l,f-d,p-m,C-E).normalize();else if(i[4].setComponents(c-l,f-d,p-m,C-E).normalize(),t===fn)i[5].setComponents(c+l,f+d,p+m,C+E).normalize();else if(t===zs)i[5].setComponents(l,d,m,E).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Vn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Vn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Vn)}intersectsSprite(e){Vn.center.set(0,0,0);const t=hh.distanceTo(e.center);return Vn.radius=.7071067811865476+t,Vn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Vn)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(_s.x=i.normal.x>0?e.max.x:e.min.x,_s.y=i.normal.y>0?e.max.y:e.min.y,_s.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(_s)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Al extends Mn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new we(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Gs=new P,Hs=new P,_a=new pt,Oi=new Uo,ys=new bi,Er=new P,ya=new P;class uh extends Lt{constructor(e=new xt,t=new Al){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Gs.fromBufferAttribute(t,i-1),Hs.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Gs.distanceTo(Hs);e.setAttribute("lineDistance",new Oe(n,1))}else $e("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ys.copy(n.boundingSphere),ys.applyMatrix4(i),ys.radius+=s,e.ray.intersectsSphere(ys)===!1)return;_a.copy(i).invert(),Oi.copy(e.ray).applyMatrix4(_a);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const f=Math.max(0,o.start),x=Math.min(h.count,o.start+o.count);for(let g=f,m=x-1;g<m;g+=c){const p=h.getX(g),_=h.getX(g+1),y=Ss(this,e,Oi,l,p,_,g);y&&t.push(y)}if(this.isLineLoop){const g=h.getX(x-1),m=h.getX(f),p=Ss(this,e,Oi,l,g,m,x-1);p&&t.push(p)}}else{const f=Math.max(0,o.start),x=Math.min(d.count,o.start+o.count);for(let g=f,m=x-1;g<m;g+=c){const p=Ss(this,e,Oi,l,g,g+1,g);p&&t.push(p)}if(this.isLineLoop){const g=Ss(this,e,Oi,l,x-1,f,x-1);g&&t.push(g)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Ss(r,e,t,n,i,s,o){const a=r.geometry.attributes.position;if(Gs.fromBufferAttribute(a,i),Hs.fromBufferAttribute(a,s),t.distanceSqToSegment(Gs,Hs,Er,ya)>n)return;Er.applyMatrix4(r.matrixWorld);const c=e.ray.origin.distanceTo(Er);if(!(c<e.near||c>e.far))return{distance:c,point:ya.clone().applyMatrix4(r.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:r}}const Sa=new P,ba=new P;class dh extends uh{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)Sa.fromBufferAttribute(t,i),ba.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Sa.distanceTo(ba);e.setAttribute("lineDistance",new Oe(n,1))}else $e("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class zo extends zt{constructor(e,t,n=Un,i,s,o,a=St,l=St,c,h=yi,u=1){if(h!==yi&&h!==qi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:u};super(d,i,s,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Fo(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Rl extends zt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ei extends xt{constructor(e=1,t=1,n=1,i=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const h=[],u=[],d=[],f=[];let x=0;const g=[],m=n/2;let p=0;_(),o===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new Oe(u,3)),this.setAttribute("normal",new Oe(d,3)),this.setAttribute("uv",new Oe(f,2));function _(){const E=new P,C=new P;let v=0;const A=(t-e)/n;for(let L=0;L<=s;L++){const b=[],S=L/s,w=S*(t-e)+e;for(let N=0;N<=i;N++){const F=N/i,B=F*l+a,q=Math.sin(B),H=Math.cos(B);C.x=w*q,C.y=-S*n+m,C.z=w*H,u.push(C.x,C.y,C.z),E.set(q,A,H).normalize(),d.push(E.x,E.y,E.z),f.push(F,1-S),b.push(x++)}g.push(b)}for(let L=0;L<i;L++)for(let b=0;b<s;b++){const S=g[b][L],w=g[b+1][L],N=g[b+1][L+1],F=g[b][L+1];(e>0||b!==0)&&(h.push(S,w,F),v+=3),(t>0||b!==s-1)&&(h.push(w,N,F),v+=3)}c.addGroup(p,v,0),p+=v}function y(E){const C=x,v=new rt,A=new P;let L=0;const b=E===!0?e:t,S=E===!0?1:-1;for(let N=1;N<=i;N++)u.push(0,m*S,0),d.push(0,S,0),f.push(.5,.5),x++;const w=x;for(let N=0;N<=i;N++){const B=N/i*l+a,q=Math.cos(B),H=Math.sin(B);A.x=b*H,A.y=m*S,A.z=b*q,u.push(A.x,A.y,A.z),d.push(0,S,0),v.x=q*.5+.5,v.y=H*.5*S+.5,f.push(v.x,v.y),x++}for(let N=0;N<i;N++){const F=C+N,B=w+N;E===!0?h.push(B,B+1,F):h.push(B+1,B,F),L+=3}c.addGroup(p,L,E===!0?1:2),p+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ei(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Vs extends Ei{constructor(e=1,t=1,n=32,i=1,s=!1,o=0,a=Math.PI*2){super(0,e,t,n,i,s,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(e){return new Vs(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class qs extends xt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const s=e/2,o=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,u=e/a,d=t/l,f=[],x=[],g=[],m=[];for(let p=0;p<h;p++){const _=p*d-o;for(let y=0;y<c;y++){const E=y*u-s;x.push(E,-_,0),g.push(0,0,1),m.push(y/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let _=0;_<a;_++){const y=_+c*p,E=_+c*(p+1),C=_+1+c*(p+1),v=_+1+c*p;f.push(y,E,v),f.push(E,C,v)}this.setIndex(f),this.setAttribute("position",new Oe(x,3)),this.setAttribute("normal",new Oe(g,3)),this.setAttribute("uv",new Oe(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new qs(e.width,e.height,e.widthSegments,e.heightSegments)}}class $i extends xt{constructor(e=1,t=32,n=16,i=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new P,d=new P,f=[],x=[],g=[],m=[];for(let p=0;p<=n;p++){const _=[],y=p/n;let E=0;p===0&&o===0?E=.5/t:p===n&&l===Math.PI&&(E=-.5/t);for(let C=0;C<=t;C++){const v=C/t;u.x=-e*Math.cos(i+v*s)*Math.sin(o+y*a),u.y=e*Math.cos(o+y*a),u.z=e*Math.sin(i+v*s)*Math.sin(o+y*a),x.push(u.x,u.y,u.z),d.copy(u).normalize(),g.push(d.x,d.y,d.z),m.push(v+E,1-y),_.push(c++)}h.push(_)}for(let p=0;p<n;p++)for(let _=0;_<t;_++){const y=h[p][_+1],E=h[p][_],C=h[p+1][_],v=h[p+1][_+1];(p!==0||o>0)&&f.push(y,E,v),(p!==n-1||l<Math.PI)&&f.push(E,C,v)}this.setIndex(f),this.setAttribute("position",new Oe(x,3)),this.setAttribute("normal",new Oe(g,3)),this.setAttribute("uv",new Oe(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Ta extends Mn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new we(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new we(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=gl,this.normalScale=new rt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hn,this.combine=Co,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class fh extends Mn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Tc,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class ph extends Mn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Mr={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(this.files[r]=e)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class mh{constructor(e,t,n){const i=this;let s=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,s===!1&&i.onStart!==void 0&&i.onStart(h,o,a),s=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],x=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const gh=new mh;class Go{constructor(e){this.manager=e!==void 0?e:gh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Go.DEFAULT_MATERIAL_NAME="__DEFAULT";const fi=new WeakMap;class xh extends Go{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,o=Mr.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(o),s.manager.itemEnd(e)},0);else{let u=fi.get(o);u===void 0&&(u=[],fi.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=Xi("img");function l(){h(),t&&t(this);const u=fi.get(this)||[];for(let d=0;d<u.length;d++){const f=u[d];f.onLoad&&f.onLoad(this)}fi.delete(this),s.manager.itemEnd(e)}function c(u){h(),i&&i(u),Mr.remove(`image:${e}`);const d=fi.get(this)||[];for(let f=0;f<d.length;f++){const x=d[f];x.onError&&x.onError(u)}fi.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Mr.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}}class Qi extends Go{constructor(e){super(e)}load(e,t,n,i){const s=new zt,o=new xh(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}}class Xs extends Lt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new we(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class vh extends Xs{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Lt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new we(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Ar=new pt,Ea=new P,Ma=new P;class Cl{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new rt(512,512),this.mapType=pn,this.map=null,this.mapPass=null,this.matrix=new pt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Zi,this._frameExtents=new rt(1,1),this._viewportCount=1,this._viewports=[new ft(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Ea.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ea),Ma.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ma),t.updateMatrixWorld(),Ar.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ar,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Ar)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Aa=new pt,Ni=new P,Rr=new P;class _h extends Cl{constructor(){super(new Jt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new rt(4,2),this._viewportCount=6,this._viewports=[new ft(2,1,1,1),new ft(0,1,1,1),new ft(3,1,1,1),new ft(1,1,1,1),new ft(3,0,1,1),new ft(1,0,1,1)],this._cubeDirections=[new P(1,0,0),new P(-1,0,0),new P(0,0,1),new P(0,0,-1),new P(0,1,0),new P(0,-1,0)],this._cubeUps=[new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,0,1),new P(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),Ni.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ni),Rr.copy(n.position),Rr.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Rr),n.updateMatrixWorld(),i.makeTranslation(-Ni.x,-Ni.y,-Ni.z),Aa.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Aa,n.coordinateSystem,n.reversedDepth)}}class yh extends Xs{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new _h}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class wl extends El{constructor(e=-1,t=1,n=1,i=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-e,o=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Sh extends Cl{constructor(){super(new wl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class bh extends Xs{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Lt.DEFAULT_UP),this.updateMatrix(),this.target=new Lt,this.shadow=new Sh}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Th extends Xs{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Eh extends Jt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Mh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Ra=new pt;class Ah{constructor(e,t,n=0,i=1/0){this.ray=new Uo(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new ko,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):At("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ra.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ra),this}intersectObject(e,t=!0,n=[]){return To(e,this,n,t),n.sort(Ca),n}intersectObjects(e,t=!0,n=[]){for(let i=0,s=e.length;i<s;i++)To(e[i],this,n,t);return n.sort(Ca),n}}function Ca(r,e){return r.distance-e.distance}function To(r,e,t,n){let i=!0;if(r.layers.test(e.layers)&&r.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const s=r.children;for(let o=0,a=s.length;o<a;o++)To(s[o],e,t,!0)}}function wa(r,e,t,n){const i=Rh(n);switch(t){case fl:return r*e;case ml:return r*e/i.components*i.byteLength;case Po:return r*e/i.components*i.byteLength;case Lo:return r*e*2/i.components*i.byteLength;case Oo:return r*e*2/i.components*i.byteLength;case pl:return r*e*3/i.components*i.byteLength;case cn:return r*e*4/i.components*i.byteLength;case No:return r*e*4/i.components*i.byteLength;case ws:case Is:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case Ds:case Ps:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case $r:case jr:return Math.max(r,16)*Math.max(e,8)/4;case Yr:case Kr:return Math.max(r,8)*Math.max(e,8)/2;case Jr:case Zr:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case Qr:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case eo:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case to:return Math.floor((r+4)/5)*Math.floor((e+3)/4)*16;case no:return Math.floor((r+4)/5)*Math.floor((e+4)/5)*16;case io:return Math.floor((r+5)/6)*Math.floor((e+4)/5)*16;case so:return Math.floor((r+5)/6)*Math.floor((e+5)/6)*16;case ro:return Math.floor((r+7)/8)*Math.floor((e+4)/5)*16;case oo:return Math.floor((r+7)/8)*Math.floor((e+5)/6)*16;case ao:return Math.floor((r+7)/8)*Math.floor((e+7)/8)*16;case lo:return Math.floor((r+9)/10)*Math.floor((e+4)/5)*16;case co:return Math.floor((r+9)/10)*Math.floor((e+5)/6)*16;case ho:return Math.floor((r+9)/10)*Math.floor((e+7)/8)*16;case uo:return Math.floor((r+9)/10)*Math.floor((e+9)/10)*16;case fo:return Math.floor((r+11)/12)*Math.floor((e+9)/10)*16;case po:return Math.floor((r+11)/12)*Math.floor((e+11)/12)*16;case mo:case go:case xo:return Math.ceil(r/4)*Math.ceil(e/4)*16;case vo:case _o:return Math.ceil(r/4)*Math.ceil(e/4)*8;case yo:case So:return Math.ceil(r/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Rh(r){switch(r){case pn:case cl:return{byteLength:1,components:1};case Wi:case hl:case Mi:return{byteLength:2,components:1};case Io:case Do:return{byteLength:2,components:4};case Un:case wo:case bn:return{byteLength:4,components:1};case ul:case dl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ro}}));typeof window<"u"&&(window.__THREE__?$e("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ro);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Il(){let r=null,e=!1,t=null,n=null;function i(s,o){t(s,o),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function Ch(r){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=r.createBuffer();r.bindBuffer(l,d),r.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=r.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=r.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=r.HALF_FLOAT:f=r.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=r.SHORT;else if(c instanceof Uint32Array)f=r.UNSIGNED_INT;else if(c instanceof Int32Array)f=r.INT;else if(c instanceof Int8Array)f=r.BYTE;else if(c instanceof Uint8Array)f=r.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(r.bindBuffer(c,a),u.length===0)r.bufferSubData(c,0,h);else{u.sort((f,x)=>f.start-x.start);let d=0;for(let f=1;f<u.length;f++){const x=u[d],g=u[f];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++d,u[d]=g)}u.length=d+1;for(let f=0,x=u.length;f<x;f++){const g=u[f];r.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(r.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:s,update:o}}var wh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ih=`#ifdef USE_ALPHAHASH
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
#endif`,Dh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ph=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Lh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Oh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Nh=`#ifdef USE_AOMAP
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
#endif`,Fh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Uh=`#ifdef USE_BATCHING
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
#endif`,kh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Bh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,zh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Gh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Hh=`#ifdef USE_IRIDESCENCE
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
#endif`,Wh=`#ifdef USE_BUMPMAP
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
#endif`,Vh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,qh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Xh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Yh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,$h=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Kh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,jh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Jh=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Zh=`#define PI 3.141592653589793
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
} // validated`,Qh=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,eu=`vec3 transformedNormal = objectNormal;
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
#endif`,tu=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,nu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,iu=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,su=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ru="gl_FragColor = linearToOutputTexel( gl_FragColor );",ou=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,au=`#ifdef USE_ENVMAP
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
#endif`,lu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,cu=`#ifdef USE_ENVMAP
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
#endif`,hu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,uu=`#ifdef USE_ENVMAP
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
#endif`,du=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fu=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,pu=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,mu=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gu=`#ifdef USE_GRADIENTMAP
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
}`,xu=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,vu=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,_u=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,yu=`uniform bool receiveShadow;
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
#endif`,Su=`#ifdef USE_ENVMAP
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
#endif`,bu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Tu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Eu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Mu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Au=`PhysicalMaterial material;
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
#endif`,Ru=`uniform sampler2D dfgLUT;
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
}`,Cu=`
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
#endif`,wu=`#if defined( RE_IndirectDiffuse )
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
#endif`,Iu=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Du=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Pu=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Lu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ou=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Nu=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Fu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Uu=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,ku=`#if defined( USE_POINTS_UV )
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
#endif`,Bu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,zu=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Gu=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Hu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Wu=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vu=`#ifdef USE_MORPHTARGETS
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
#endif`,qu=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Xu=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Yu=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,$u=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ku=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ju=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ju=`#ifdef USE_NORMALMAP
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
#endif`,Zu=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Qu=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ed=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,td=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,nd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,id=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,sd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,rd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,od=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,ad=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ld=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,cd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,hd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,ud=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,dd=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,fd=`float getShadowMask() {
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
}`,pd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,md=`#ifdef USE_SKINNING
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
#endif`,gd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,xd=`#ifdef USE_SKINNING
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
#endif`,vd=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,_d=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,yd=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Sd=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,bd=`#ifdef USE_TRANSMISSION
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
#endif`,Td=`#ifdef USE_TRANSMISSION
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
#endif`,Ed=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Md=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Ad=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Cd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wd=`uniform sampler2D t2D;
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
}`,Id=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Dd=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Pd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ld=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Od=`#include <common>
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
}`,Nd=`#if DEPTH_PACKING == 3200
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
}`,Fd=`#define DISTANCE
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
}`,Ud=`#define DISTANCE
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
}`,kd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Bd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zd=`uniform float scale;
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
}`,Gd=`uniform vec3 diffuse;
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
}`,Hd=`#include <common>
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
}`,Wd=`uniform vec3 diffuse;
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
}`,Vd=`#define LAMBERT
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
}`,qd=`#define LAMBERT
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
}`,Xd=`#define MATCAP
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
}`,Yd=`#define MATCAP
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
}`,$d=`#define NORMAL
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
}`,Kd=`#define NORMAL
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
}`,jd=`#define PHONG
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
}`,Jd=`#define PHONG
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
}`,Zd=`#define STANDARD
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
}`,Qd=`#define STANDARD
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
}`,ef=`#define TOON
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
}`,tf=`#define TOON
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
}`,nf=`uniform float size;
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
}`,sf=`uniform vec3 diffuse;
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
}`,rf=`#include <common>
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
}`,of=`uniform vec3 color;
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
}`,af=`uniform float rotation;
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
}`,lf=`uniform vec3 diffuse;
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
}`,Qe={alphahash_fragment:wh,alphahash_pars_fragment:Ih,alphamap_fragment:Dh,alphamap_pars_fragment:Ph,alphatest_fragment:Lh,alphatest_pars_fragment:Oh,aomap_fragment:Nh,aomap_pars_fragment:Fh,batching_pars_vertex:Uh,batching_vertex:kh,begin_vertex:Bh,beginnormal_vertex:zh,bsdfs:Gh,iridescence_fragment:Hh,bumpmap_pars_fragment:Wh,clipping_planes_fragment:Vh,clipping_planes_pars_fragment:qh,clipping_planes_pars_vertex:Xh,clipping_planes_vertex:Yh,color_fragment:$h,color_pars_fragment:Kh,color_pars_vertex:jh,color_vertex:Jh,common:Zh,cube_uv_reflection_fragment:Qh,defaultnormal_vertex:eu,displacementmap_pars_vertex:tu,displacementmap_vertex:nu,emissivemap_fragment:iu,emissivemap_pars_fragment:su,colorspace_fragment:ru,colorspace_pars_fragment:ou,envmap_fragment:au,envmap_common_pars_fragment:lu,envmap_pars_fragment:cu,envmap_pars_vertex:hu,envmap_physical_pars_fragment:Su,envmap_vertex:uu,fog_vertex:du,fog_pars_vertex:fu,fog_fragment:pu,fog_pars_fragment:mu,gradientmap_pars_fragment:gu,lightmap_pars_fragment:xu,lights_lambert_fragment:vu,lights_lambert_pars_fragment:_u,lights_pars_begin:yu,lights_toon_fragment:bu,lights_toon_pars_fragment:Tu,lights_phong_fragment:Eu,lights_phong_pars_fragment:Mu,lights_physical_fragment:Au,lights_physical_pars_fragment:Ru,lights_fragment_begin:Cu,lights_fragment_maps:wu,lights_fragment_end:Iu,logdepthbuf_fragment:Du,logdepthbuf_pars_fragment:Pu,logdepthbuf_pars_vertex:Lu,logdepthbuf_vertex:Ou,map_fragment:Nu,map_pars_fragment:Fu,map_particle_fragment:Uu,map_particle_pars_fragment:ku,metalnessmap_fragment:Bu,metalnessmap_pars_fragment:zu,morphinstance_vertex:Gu,morphcolor_vertex:Hu,morphnormal_vertex:Wu,morphtarget_pars_vertex:Vu,morphtarget_vertex:qu,normal_fragment_begin:Xu,normal_fragment_maps:Yu,normal_pars_fragment:$u,normal_pars_vertex:Ku,normal_vertex:ju,normalmap_pars_fragment:Ju,clearcoat_normal_fragment_begin:Zu,clearcoat_normal_fragment_maps:Qu,clearcoat_pars_fragment:ed,iridescence_pars_fragment:td,opaque_fragment:nd,packing:id,premultiplied_alpha_fragment:sd,project_vertex:rd,dithering_fragment:od,dithering_pars_fragment:ad,roughnessmap_fragment:ld,roughnessmap_pars_fragment:cd,shadowmap_pars_fragment:hd,shadowmap_pars_vertex:ud,shadowmap_vertex:dd,shadowmask_pars_fragment:fd,skinbase_vertex:pd,skinning_pars_vertex:md,skinning_vertex:gd,skinnormal_vertex:xd,specularmap_fragment:vd,specularmap_pars_fragment:_d,tonemapping_fragment:yd,tonemapping_pars_fragment:Sd,transmission_fragment:bd,transmission_pars_fragment:Td,uv_pars_fragment:Ed,uv_pars_vertex:Md,uv_vertex:Ad,worldpos_vertex:Rd,background_vert:Cd,background_frag:wd,backgroundCube_vert:Id,backgroundCube_frag:Dd,cube_vert:Pd,cube_frag:Ld,depth_vert:Od,depth_frag:Nd,distanceRGBA_vert:Fd,distanceRGBA_frag:Ud,equirect_vert:kd,equirect_frag:Bd,linedashed_vert:zd,linedashed_frag:Gd,meshbasic_vert:Hd,meshbasic_frag:Wd,meshlambert_vert:Vd,meshlambert_frag:qd,meshmatcap_vert:Xd,meshmatcap_frag:Yd,meshnormal_vert:$d,meshnormal_frag:Kd,meshphong_vert:jd,meshphong_frag:Jd,meshphysical_vert:Zd,meshphysical_frag:Qd,meshtoon_vert:ef,meshtoon_frag:tf,points_vert:nf,points_frag:sf,shadow_vert:rf,shadow_frag:of,sprite_vert:af,sprite_frag:lf},xe={common:{diffuse:{value:new we(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ze}},envmap:{envMap:{value:null},envMapRotation:{value:new Ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ze},normalScale:{value:new rt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new we(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new we(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0},uvTransform:{value:new Ze}},sprite:{diffuse:{value:new we(16777215)},opacity:{value:1},center:{value:new rt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}}},dn={basic:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new we(0)}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new we(0)},specular:{value:new we(1118481)},shininess:{value:30}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:Ht([xe.common,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.roughnessmap,xe.metalnessmap,xe.fog,xe.lights,{emissive:{value:new we(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:Ht([xe.common,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.gradientmap,xe.fog,xe.lights,{emissive:{value:new we(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:Ht([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:Ht([xe.points,xe.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:Ht([xe.common,xe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:Ht([xe.common,xe.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:Ht([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:Ht([xe.sprite,xe.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ze}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distanceRGBA:{uniforms:Ht([xe.common,xe.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distanceRGBA_vert,fragmentShader:Qe.distanceRGBA_frag},shadow:{uniforms:Ht([xe.lights,xe.fog,{color:{value:new we(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};dn.physical={uniforms:Ht([dn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ze},clearcoatNormalScale:{value:new rt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ze},sheen:{value:0},sheenColor:{value:new we(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ze},transmissionSamplerSize:{value:new rt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ze},attenuationDistance:{value:0},attenuationColor:{value:new we(0)},specularColor:{value:new we(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ze},anisotropyVector:{value:new rt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ze}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};const bs={r:0,b:0,g:0},qn=new hn,cf=new pt;function hf(r,e,t,n,i,s,o){const a=new we(0);let l=s===!0?0:1,c,h,u=null,d=0,f=null;function x(y){let E=y.isScene===!0?y.background:null;return E&&E.isTexture&&(E=(y.backgroundBlurriness>0?t:e).get(E)),E}function g(y){let E=!1;const C=x(y);C===null?p(a,l):C&&C.isColor&&(p(C,1),E=!0);const v=r.xr.getEnvironmentBlendMode();v==="additive"?n.buffers.color.setClear(0,0,0,1,o):v==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(r.autoClear||E)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function m(y,E){const C=x(E);C&&(C.isCubeTexture||C.mapping===Ws)?(h===void 0&&(h=new Le(new An(1,1,1),new ct({name:"BackgroundCubeMaterial",uniforms:Ti(dn.backgroundCube.uniforms),vertexShader:dn.backgroundCube.vertexShader,fragmentShader:dn.backgroundCube.fragmentShader,side:Bt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(v,A,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),qn.copy(E.backgroundRotation),qn.x*=-1,qn.y*=-1,qn.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1&&(qn.y*=-1,qn.z*=-1),h.material.uniforms.envMap.value=C,h.material.uniforms.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(cf.makeRotationFromEuler(qn)),h.material.toneMapped=at.getTransfer(C.colorSpace)!==dt,(u!==C||d!==C.version||f!==r.toneMapping)&&(h.material.needsUpdate=!0,u=C,d=C.version,f=r.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):C&&C.isTexture&&(c===void 0&&(c=new Le(new qs(2,2),new ct({name:"BackgroundMaterial",uniforms:Ti(dn.background.uniforms),vertexShader:dn.background.vertexShader,fragmentShader:dn.background.fragmentShader,side:Fn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=C,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.toneMapped=at.getTransfer(C.colorSpace)!==dt,C.matrixAutoUpdate===!0&&C.updateMatrix(),c.material.uniforms.uvTransform.value.copy(C.matrix),(u!==C||d!==C.version||f!==r.toneMapping)&&(c.material.needsUpdate=!0,u=C,d=C.version,f=r.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null))}function p(y,E){y.getRGB(bs,Tl(r)),n.buffers.color.setClear(bs.r,bs.g,bs.b,E,o)}function _(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,E=1){a.set(y),l=E,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(y){l=y,p(a,l)},render:g,addToRenderList:m,dispose:_}}function uf(r,e){const t=r.getParameter(r.MAX_VERTEX_ATTRIBS),n={},i=d(null);let s=i,o=!1;function a(S,w,N,F,B){let q=!1;const H=u(F,N,w);s!==H&&(s=H,c(s.object)),q=f(S,F,N,B),q&&x(S,F,N,B),B!==null&&e.update(B,r.ELEMENT_ARRAY_BUFFER),(q||o)&&(o=!1,E(S,w,N,F),B!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return r.createVertexArray()}function c(S){return r.bindVertexArray(S)}function h(S){return r.deleteVertexArray(S)}function u(S,w,N){const F=N.wireframe===!0;let B=n[S.id];B===void 0&&(B={},n[S.id]=B);let q=B[w.id];q===void 0&&(q={},B[w.id]=q);let H=q[F];return H===void 0&&(H=d(l()),q[F]=H),H}function d(S){const w=[],N=[],F=[];for(let B=0;B<t;B++)w[B]=0,N[B]=0,F[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:w,enabledAttributes:N,attributeDivisors:F,object:S,attributes:{},index:null}}function f(S,w,N,F){const B=s.attributes,q=w.attributes;let H=0;const Z=N.getAttributes();for(const W in Z)if(Z[W].location>=0){const K=B[W];let he=q[W];if(he===void 0&&(W==="instanceMatrix"&&S.instanceMatrix&&(he=S.instanceMatrix),W==="instanceColor"&&S.instanceColor&&(he=S.instanceColor)),K===void 0||K.attribute!==he||he&&K.data!==he.data)return!0;H++}return s.attributesNum!==H||s.index!==F}function x(S,w,N,F){const B={},q=w.attributes;let H=0;const Z=N.getAttributes();for(const W in Z)if(Z[W].location>=0){let K=q[W];K===void 0&&(W==="instanceMatrix"&&S.instanceMatrix&&(K=S.instanceMatrix),W==="instanceColor"&&S.instanceColor&&(K=S.instanceColor));const he={};he.attribute=K,K&&K.data&&(he.data=K.data),B[W]=he,H++}s.attributes=B,s.attributesNum=H,s.index=F}function g(){const S=s.newAttributes;for(let w=0,N=S.length;w<N;w++)S[w]=0}function m(S){p(S,0)}function p(S,w){const N=s.newAttributes,F=s.enabledAttributes,B=s.attributeDivisors;N[S]=1,F[S]===0&&(r.enableVertexAttribArray(S),F[S]=1),B[S]!==w&&(r.vertexAttribDivisor(S,w),B[S]=w)}function _(){const S=s.newAttributes,w=s.enabledAttributes;for(let N=0,F=w.length;N<F;N++)w[N]!==S[N]&&(r.disableVertexAttribArray(N),w[N]=0)}function y(S,w,N,F,B,q,H){H===!0?r.vertexAttribIPointer(S,w,N,B,q):r.vertexAttribPointer(S,w,N,F,B,q)}function E(S,w,N,F){g();const B=F.attributes,q=N.getAttributes(),H=w.defaultAttributeValues;for(const Z in q){const W=q[Z];if(W.location>=0){let J=B[Z];if(J===void 0&&(Z==="instanceMatrix"&&S.instanceMatrix&&(J=S.instanceMatrix),Z==="instanceColor"&&S.instanceColor&&(J=S.instanceColor)),J!==void 0){const K=J.normalized,he=J.itemSize,Ae=e.get(J);if(Ae===void 0)continue;const ke=Ae.buffer,Ke=Ae.type,Xe=Ae.bytesPerElement,Q=Ke===r.INT||Ke===r.UNSIGNED_INT||J.gpuType===wo;if(J.isInterleavedBufferAttribute){const te=J.data,pe=te.stride,ce=J.offset;if(te.isInstancedInterleavedBuffer){for(let oe=0;oe<W.locationSize;oe++)p(W.location+oe,te.meshPerAttribute);S.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let oe=0;oe<W.locationSize;oe++)m(W.location+oe);r.bindBuffer(r.ARRAY_BUFFER,ke);for(let oe=0;oe<W.locationSize;oe++)y(W.location+oe,he/W.locationSize,Ke,K,pe*Xe,(ce+he/W.locationSize*oe)*Xe,Q)}else{if(J.isInstancedBufferAttribute){for(let te=0;te<W.locationSize;te++)p(W.location+te,J.meshPerAttribute);S.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let te=0;te<W.locationSize;te++)m(W.location+te);r.bindBuffer(r.ARRAY_BUFFER,ke);for(let te=0;te<W.locationSize;te++)y(W.location+te,he/W.locationSize,Ke,K,he*Xe,he/W.locationSize*te*Xe,Q)}}else if(H!==void 0){const K=H[Z];if(K!==void 0)switch(K.length){case 2:r.vertexAttrib2fv(W.location,K);break;case 3:r.vertexAttrib3fv(W.location,K);break;case 4:r.vertexAttrib4fv(W.location,K);break;default:r.vertexAttrib1fv(W.location,K)}}}}_()}function C(){L();for(const S in n){const w=n[S];for(const N in w){const F=w[N];for(const B in F)h(F[B].object),delete F[B];delete w[N]}delete n[S]}}function v(S){if(n[S.id]===void 0)return;const w=n[S.id];for(const N in w){const F=w[N];for(const B in F)h(F[B].object),delete F[B];delete w[N]}delete n[S.id]}function A(S){for(const w in n){const N=n[w];if(N[S.id]===void 0)continue;const F=N[S.id];for(const B in F)h(F[B].object),delete F[B];delete N[S.id]}}function L(){b(),o=!0,s!==i&&(s=i,c(s.object))}function b(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:L,resetDefaultState:b,dispose:C,releaseStatesOfGeometry:v,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:m,disableUnusedAttributes:_}}function df(r,e,t){let n;function i(c){n=c}function s(c,h){r.drawArrays(n,c,h),t.update(h,n,1)}function o(c,h,u){u!==0&&(r.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function a(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let f=0;for(let x=0;x<u;x++)f+=h[x];t.update(f,n,1)}function l(c,h,u,d){if(u===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let x=0;x<c.length;x++)o(c[x],h[x],d[x]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let x=0;for(let g=0;g<u;g++)x+=h[g]*d[g];t.update(x,n,1)}}this.setMode=i,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function ff(r,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");i=r.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(A){return!(A!==cn&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){const L=A===Mi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==pn&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==bn&&!L)}function l(A){if(A==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&($e("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),x=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=r.getParameter(r.MAX_TEXTURE_SIZE),m=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),p=r.getParameter(r.MAX_VERTEX_ATTRIBS),_=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),y=r.getParameter(r.MAX_VARYING_VECTORS),E=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),C=x>0,v=r.getParameter(r.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:_,maxVaryings:y,maxFragmentUniforms:E,vertexTextures:C,maxSamples:v}}function pf(r){const e=this;let t=null,n=0,i=!1,s=!1;const o=new Yn,a=new Ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||i;return i=d,n=u.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){const x=u.clippingPlanes,g=u.clipIntersection,m=u.clipShadows,p=r.get(u);if(!i||x===null||x.length===0||s&&!m)s?h(null):c();else{const _=s?0:n,y=_*4;let E=p.clippingState||null;l.value=E,E=h(x,d,y,f);for(let C=0;C!==y;++C)E[C]=t[C];p.clippingState=E,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,x){const g=u!==null?u.length:0;let m=null;if(g!==0){if(m=l.value,x!==!0||m===null){const p=f+g*4,_=d.matrixWorldInverse;a.getNormalMatrix(_),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,E=f;y!==g;++y,E+=4)o.copy(u[y]).applyMatrix4(_,a),o.normal.toArray(m,E),m[E+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,m}}function mf(r){let e=new WeakMap;function t(o,a){return a===Vr?o.mapping=vi:a===qr&&(o.mapping=_i),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Vr||a===qr)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new sh(l.height);return c.fromEquirectangularTexture(r,o),e.set(o,c),o.addEventListener("dispose",i),t(c.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const On=4,Ia=[.125,.215,.35,.446,.526,.582],Kn=20,gf=256,Fi=new wl,Da=new we;let Cr=null,wr=0,Ir=0,Dr=!1;const xf=new P;class Pa{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){const{size:o=256,position:a=xf}=s;Cr=this._renderer.getRenderTarget(),wr=this._renderer.getActiveCubeFace(),Ir=this._renderer.getActiveMipmapLevel(),Dr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Na(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Oa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Cr,wr,Ir),this._renderer.xr.enabled=Dr,e.scissorTest=!1,pi(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===vi||e.mapping===_i?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Cr=this._renderer.getRenderTarget(),wr=this._renderer.getActiveCubeFace(),Ir=this._renderer.getActiveMipmapLevel(),Dr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:tn,minFilter:tn,generateMipmaps:!1,type:Mi,format:cn,colorSpace:Si,depthBuffer:!1},i=La(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=La(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=vf(s)),this._blurMaterial=yf(s,e,t),this._ggxMaterial=_f(s,e,t)}return i}_compileMaterial(e){const t=new Le(new xt,e);this._renderer.compile(t,Fi)}_sceneToCubeUV(e,t,n,i,s){const l=new Jt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(Da),u.toneMapping=Nn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Le(new An,new Ji({name:"PMREM.Background",side:Bt,depthWrite:!1,depthTest:!1})));const g=this._backgroundBox,m=g.material;let p=!1;const _=e.background;_?_.isColor&&(m.color.copy(_),e.background=null,p=!0):(m.color.copy(Da),p=!0);for(let y=0;y<6;y++){const E=y%3;E===0?(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+h[y],s.y,s.z)):E===1?(l.up.set(0,0,c[y]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+h[y],s.z)):(l.up.set(0,c[y],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+h[y]));const C=this._cubeSize;pi(i,E*C,y>2?C:0,C,C),u.setRenderTarget(i),p&&u.render(g,l),u.render(e,l)}u.toneMapping=f,u.autoClear=d,e.background=_}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===vi||e.mapping===_i;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Na()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Oa());const s=i?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=s;const a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;pi(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Fi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,s=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=.05+c*.95,f=u*d,{_lodMax:x}=this,g=this._sizeLods[n],m=3*g*(n>x-On?n-x+On:0),p=4*(this._cubeSize-g);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=x-t,pi(s,m,p,3*g,2*g),i.setRenderTarget(s),i.render(a,Fi),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=x-n,pi(e,m,p,3*g,2*g),i.setRenderTarget(e),i.render(a,Fi)}_blur(e,t,n,i,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",s),this._halfBlur(o,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&At("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[i];u.material=c;const d=c.uniforms,f=this._sizeLods[n]-1,x=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*Kn-1),g=s/x,m=isFinite(s)?1+Math.floor(h*g):Kn;m>Kn&&$e(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Kn}`);const p=[];let _=0;for(let A=0;A<Kn;++A){const L=A/g,b=Math.exp(-L*L/2);p.push(b),A===0?_+=b:A<m&&(_+=2*b)}for(let A=0;A<p.length;A++)p[A]=p[A]/_;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:y}=this;d.dTheta.value=x,d.mipInt.value=y-n;const E=this._sizeLods[i],C=3*E*(i>y-On?i-y+On:0),v=4*(this._cubeSize-E);pi(t,C,v,3*E,2*E),l.setRenderTarget(t),l.render(u,Fi)}}function vf(r){const e=[],t=[],n=[];let i=r;const s=r-On+1+Ia.length;for(let o=0;o<s;o++){const a=Math.pow(2,i);e.push(a);let l=1/a;o>r-On?l=Ia[o-r+On-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,x=6,g=3,m=2,p=1,_=new Float32Array(g*x*f),y=new Float32Array(m*x*f),E=new Float32Array(p*x*f);for(let v=0;v<f;v++){const A=v%3*2/3-1,L=v>2?0:-1,b=[A,L,0,A+2/3,L,0,A+2/3,L+1,0,A,L,0,A+2/3,L+1,0,A,L+1,0];_.set(b,g*x*v),y.set(d,m*x*v);const S=[v,v,v,v,v,v];E.set(S,p*x*v)}const C=new xt;C.setAttribute("position",new Ct(_,g)),C.setAttribute("uv",new Ct(y,m)),C.setAttribute("faceIndex",new Ct(E,p)),n.push(new Le(C,null)),i>On&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function La(r,e,t){const n=new kn(r,e,t);return n.texture.mapping=Ws,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function pi(r,e,t,n,i){r.viewport.set(e,t,n,i),r.scissor.set(e,t,n,i)}function _f(r,e,t){return new ct({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:gf,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ys(),fragmentShader:`

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
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function yf(r,e,t){const n=new Float32Array(Kn),i=new P(0,1,0);return new ct({name:"SphericalGaussianBlur",defines:{n:Kn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Ys(),fragmentShader:`

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
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Oa(){return new ct({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ys(),fragmentShader:`

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
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Na(){return new ct({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ys(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Ys(){return`

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
	`}function Sf(r){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Vr||l===qr,h=l===vi||l===_i;if(c||h){let u=e.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new Pa(r)),u=c?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const f=a.image;return c&&f&&f.height>0||h&&f&&i(f)?(t===null&&(t=new Pa(r)),u=c?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",s),u.texture):null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function bf(r){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=r.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Yi("WebGLRenderer: "+n+" extension not supported."),i}}}function Tf(r,e,t,n){const i={},s=new WeakMap;function o(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const x in d.attributes)e.remove(d.attributes[x]);d.removeEventListener("dispose",o),delete i[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(u,d){return i[d.id]===!0||(d.addEventListener("dispose",o),i[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const f in d)e.update(d[f],r.ARRAY_BUFFER)}function c(u){const d=[],f=u.index,x=u.attributes.position;let g=0;if(f!==null){const _=f.array;g=f.version;for(let y=0,E=_.length;y<E;y+=3){const C=_[y+0],v=_[y+1],A=_[y+2];d.push(C,v,v,A,A,C)}}else if(x!==void 0){const _=x.array;g=x.version;for(let y=0,E=_.length/3-1;y<E;y+=3){const C=y+0,v=y+1,A=y+2;d.push(C,v,v,A,A,C)}}else return;const m=new(vl(d)?bl:Sl)(d,1);m.version=g;const p=s.get(u);p&&e.remove(p),s.set(u,m)}function h(u){const d=s.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Ef(r,e,t){let n;function i(d){n=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,f){r.drawElements(n,f,s,d*o),t.update(f,n,1)}function c(d,f,x){x!==0&&(r.drawElementsInstanced(n,f,s,d*o,x),t.update(f,n,x))}function h(d,f,x){if(x===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,d,0,x);let m=0;for(let p=0;p<x;p++)m+=f[p];t.update(m,n,1)}function u(d,f,x,g){if(x===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],g[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,d,0,g,0,x);let p=0;for(let _=0;_<x;_++)p+=f[_]*g[_];t.update(p,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Mf(r){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(t.calls++,o){case r.TRIANGLES:t.triangles+=a*(s/3);break;case r.LINES:t.lines+=a*(s/2);break;case r.LINE_STRIP:t.lines+=a*(s-1);break;case r.LINE_LOOP:t.lines+=a*s;break;case r.POINTS:t.points+=a*s;break;default:At("WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Af(r,e,t){const n=new WeakMap,i=new ft;function s(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let b=function(){A.dispose(),n.delete(a),a.removeEventListener("dispose",b)};d!==void 0&&d.texture.dispose();const f=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let y=0;f===!0&&(y=1),x===!0&&(y=2),g===!0&&(y=3);let E=a.attributes.position.count*y,C=1;E>e.maxTextureSize&&(C=Math.ceil(E/e.maxTextureSize),E=e.maxTextureSize);const v=new Float32Array(E*C*4*u),A=new _l(v,E,C,u);A.type=bn,A.needsUpdate=!0;const L=y*4;for(let S=0;S<u;S++){const w=m[S],N=p[S],F=_[S],B=E*C*4*S;for(let q=0;q<w.count;q++){const H=q*L;f===!0&&(i.fromBufferAttribute(w,q),v[B+H+0]=i.x,v[B+H+1]=i.y,v[B+H+2]=i.z,v[B+H+3]=0),x===!0&&(i.fromBufferAttribute(N,q),v[B+H+4]=i.x,v[B+H+5]=i.y,v[B+H+6]=i.z,v[B+H+7]=0),g===!0&&(i.fromBufferAttribute(F,q),v[B+H+8]=i.x,v[B+H+9]=i.y,v[B+H+10]=i.z,v[B+H+11]=F.itemSize===4?i.w:1)}}d={count:u,texture:A,size:new rt(E,C)},n.set(a,d),a.addEventListener("dispose",b)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(r,"morphTexture",o.morphTexture,t);else{let f=0;for(let g=0;g<c.length;g++)f+=c[g];const x=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(r,"morphTargetBaseInfluence",x),l.getUniforms().setValue(r,"morphTargetInfluences",c)}l.getUniforms().setValue(r,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(r,"morphTargetsTextureSize",d.size)}return{update:s}}function Rf(r,e,t,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);if(i.get(u)!==c&&(e.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(t.update(l.instanceMatrix,r.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,r.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;i.get(d)!==c&&(d.update(),i.set(d,c))}return u}function o(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}const Dl=new zt,Fa=new zo(1,1),Pl=new _l,Ll=new Gc,Ol=new Ml,Ua=[],ka=[],Ba=new Float32Array(16),za=new Float32Array(9),Ga=new Float32Array(4);function Ri(r,e,t){const n=r[0];if(n<=0||n>0)return r;const i=e*t;let s=Ua[i];if(s===void 0&&(s=new Float32Array(i),Ua[i]=s),e!==0){n.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,r[o].toArray(s,a)}return s}function wt(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function It(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function $s(r,e){let t=ka[e];t===void 0&&(t=new Int32Array(e),ka[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function Cf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function wf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;r.uniform2fv(this.addr,e),It(t,e)}}function If(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wt(t,e))return;r.uniform3fv(this.addr,e),It(t,e)}}function Df(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;r.uniform4fv(this.addr,e),It(t,e)}}function Pf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(wt(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),It(t,e)}else{if(wt(t,n))return;Ga.set(n),r.uniformMatrix2fv(this.addr,!1,Ga),It(t,n)}}function Lf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(wt(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),It(t,e)}else{if(wt(t,n))return;za.set(n),r.uniformMatrix3fv(this.addr,!1,za),It(t,n)}}function Of(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(wt(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),It(t,e)}else{if(wt(t,n))return;Ba.set(n),r.uniformMatrix4fv(this.addr,!1,Ba),It(t,n)}}function Nf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function Ff(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;r.uniform2iv(this.addr,e),It(t,e)}}function Uf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wt(t,e))return;r.uniform3iv(this.addr,e),It(t,e)}}function kf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;r.uniform4iv(this.addr,e),It(t,e)}}function Bf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function zf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wt(t,e))return;r.uniform2uiv(this.addr,e),It(t,e)}}function Gf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wt(t,e))return;r.uniform3uiv(this.addr,e),It(t,e)}}function Hf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wt(t,e))return;r.uniform4uiv(this.addr,e),It(t,e)}}function Wf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);let s;this.type===r.SAMPLER_2D_SHADOW?(Fa.compareFunction=xl,s=Fa):s=Dl,t.setTexture2D(e||s,i)}function Vf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Ll,i)}function qf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Ol,i)}function Xf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Pl,i)}function Yf(r){switch(r){case 5126:return Cf;case 35664:return wf;case 35665:return If;case 35666:return Df;case 35674:return Pf;case 35675:return Lf;case 35676:return Of;case 5124:case 35670:return Nf;case 35667:case 35671:return Ff;case 35668:case 35672:return Uf;case 35669:case 35673:return kf;case 5125:return Bf;case 36294:return zf;case 36295:return Gf;case 36296:return Hf;case 35678:case 36198:case 36298:case 36306:case 35682:return Wf;case 35679:case 36299:case 36307:return Vf;case 35680:case 36300:case 36308:case 36293:return qf;case 36289:case 36303:case 36311:case 36292:return Xf}}function $f(r,e){r.uniform1fv(this.addr,e)}function Kf(r,e){const t=Ri(e,this.size,2);r.uniform2fv(this.addr,t)}function jf(r,e){const t=Ri(e,this.size,3);r.uniform3fv(this.addr,t)}function Jf(r,e){const t=Ri(e,this.size,4);r.uniform4fv(this.addr,t)}function Zf(r,e){const t=Ri(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function Qf(r,e){const t=Ri(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function ep(r,e){const t=Ri(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function tp(r,e){r.uniform1iv(this.addr,e)}function np(r,e){r.uniform2iv(this.addr,e)}function ip(r,e){r.uniform3iv(this.addr,e)}function sp(r,e){r.uniform4iv(this.addr,e)}function rp(r,e){r.uniform1uiv(this.addr,e)}function op(r,e){r.uniform2uiv(this.addr,e)}function ap(r,e){r.uniform3uiv(this.addr,e)}function lp(r,e){r.uniform4uiv(this.addr,e)}function cp(r,e,t){const n=this.cache,i=e.length,s=$s(t,i);wt(n,s)||(r.uniform1iv(this.addr,s),It(n,s));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||Dl,s[o])}function hp(r,e,t){const n=this.cache,i=e.length,s=$s(t,i);wt(n,s)||(r.uniform1iv(this.addr,s),It(n,s));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Ll,s[o])}function up(r,e,t){const n=this.cache,i=e.length,s=$s(t,i);wt(n,s)||(r.uniform1iv(this.addr,s),It(n,s));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||Ol,s[o])}function dp(r,e,t){const n=this.cache,i=e.length,s=$s(t,i);wt(n,s)||(r.uniform1iv(this.addr,s),It(n,s));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||Pl,s[o])}function fp(r){switch(r){case 5126:return $f;case 35664:return Kf;case 35665:return jf;case 35666:return Jf;case 35674:return Zf;case 35675:return Qf;case 35676:return ep;case 5124:case 35670:return tp;case 35667:case 35671:return np;case 35668:case 35672:return ip;case 35669:case 35673:return sp;case 5125:return rp;case 36294:return op;case 36295:return ap;case 36296:return lp;case 35678:case 36198:case 36298:case 36306:case 35682:return cp;case 35679:case 36299:case 36307:return hp;case 35680:case 36300:case 36308:case 36293:return up;case 36289:case 36303:case 36311:case 36292:return dp}}class pp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Yf(t.type)}}class mp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=fp(t.type)}}class gp{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let s=0,o=i.length;s!==o;++s){const a=i[s];a.setValue(e,t[a.id],n)}}}const Pr=/(\w+)(\])?(\[|\.)?/g;function Ha(r,e){r.seq.push(e),r.map[e.id]=e}function xp(r,e,t){const n=r.name,i=n.length;for(Pr.lastIndex=0;;){const s=Pr.exec(n),o=Pr.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){Ha(t,c===void 0?new pp(a,r,e):new mp(a,r,e));break}else{let u=t.map[a];u===void 0&&(u=new gp(a),Ha(t,u)),t=u}}}class Ls{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const s=e.getActiveUniform(t,i),o=e.getUniformLocation(t,s.name);xp(s,o,this)}}setValue(e,t,n,i){const s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,s=e.length;i!==s;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function Wa(r,e,t){const n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}const vp=37297;let _p=0;function yp(r,e){const t=r.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=i;o<s;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Va=new Ze;function Sp(r){at._getMatrix(Va,at.workingColorSpace,r);const e=`mat3( ${Va.elements.map(t=>t.toFixed(4))} )`;switch(at.getTransfer(r)){case Bs:return[e,"LinearTransferOETF"];case dt:return[e,"sRGBTransferOETF"];default:return $e("WebGLProgram: Unsupported color space: ",r),[e,"LinearTransferOETF"]}}function qa(r,e,t){const n=r.getShaderParameter(e,r.COMPILE_STATUS),s=(r.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+yp(r.getShaderSource(e),a)}else return s}function bp(r,e){const t=Sp(e);return[`vec4 ${r}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Tp(r,e){let t;switch(e){case mc:t="Linear";break;case gc:t="Reinhard";break;case xc:t="Cineon";break;case vc:t="ACESFilmic";break;case yc:t="AgX";break;case Sc:t="Neutral";break;case _c:t="Custom";break;default:$e("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ts=new P;function Ep(){at.getLuminanceCoefficients(Ts);const r=Ts.x.toFixed(4),e=Ts.y.toFixed(4),t=Ts.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Mp(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Gi).join(`
`)}function Ap(r){const e=[];for(const t in r){const n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Rp(r,e){const t={},n=r.getProgramParameter(e,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const s=r.getActiveAttrib(e,i),o=s.name;let a=1;s.type===r.FLOAT_MAT2&&(a=2),s.type===r.FLOAT_MAT3&&(a=3),s.type===r.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:r.getAttribLocation(e,o),locationSize:a}}return t}function Gi(r){return r!==""}function Xa(r,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ya(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Cp=/^[ \t]*#include +<([\w\d./]+)>/gm;function Eo(r){return r.replace(Cp,Ip)}const wp=new Map;function Ip(r,e){let t=Qe[e];if(t===void 0){const n=wp.get(e);if(n!==void 0)t=Qe[n],$e('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Eo(t)}const Dp=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function $a(r){return r.replace(Dp,Pp)}function Pp(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Ka(r){let e=`precision ${r.precision} float;
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
#define LOW_PRECISION`),e}function Lp(r){let e="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===ol?e="SHADOWMAP_TYPE_PCF":r.shadowMapType===al?e="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===Sn&&(e="SHADOWMAP_TYPE_VSM"),e}function Op(r){let e="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case vi:case _i:e="ENVMAP_TYPE_CUBE";break;case Ws:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Np(r){let e="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case _i:e="ENVMAP_MODE_REFRACTION";break}return e}function Fp(r){let e="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case Co:e="ENVMAP_BLENDING_MULTIPLY";break;case fc:e="ENVMAP_BLENDING_MIX";break;case pc:e="ENVMAP_BLENDING_ADD";break}return e}function Up(r){const e=r.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function kp(r,e,t,n){const i=r.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=Lp(t),c=Op(t),h=Np(t),u=Fp(t),d=Up(t),f=Mp(t),x=Ap(s),g=i.createProgram();let m,p,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Gi).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Gi).join(`
`),p.length>0&&(p+=`
`)):(m=[Ka(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Gi).join(`
`),p=[Ka(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Nn?"#define TONE_MAPPING":"",t.toneMapping!==Nn?Qe.tonemapping_pars_fragment:"",t.toneMapping!==Nn?Tp("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,bp("linearToOutputTexel",t.outputColorSpace),Ep(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Gi).join(`
`)),o=Eo(o),o=Xa(o,t),o=Ya(o,t),a=Eo(a),a=Xa(a,t),a=Ya(a,t),o=$a(o),a=$a(a),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===ea?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ea?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=_+m+o,E=_+p+a,C=Wa(i,i.VERTEX_SHADER,y),v=Wa(i,i.FRAGMENT_SHADER,E);i.attachShader(g,C),i.attachShader(g,v),t.index0AttributeName!==void 0?i.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(g,0,"position"),i.linkProgram(g);function A(w){if(r.debug.checkShaderErrors){const N=i.getProgramInfoLog(g)||"",F=i.getShaderInfoLog(C)||"",B=i.getShaderInfoLog(v)||"",q=N.trim(),H=F.trim(),Z=B.trim();let W=!0,J=!0;if(i.getProgramParameter(g,i.LINK_STATUS)===!1)if(W=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,g,C,v);else{const K=qa(i,C,"vertex"),he=qa(i,v,"fragment");At("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(g,i.VALIDATE_STATUS)+`

Material Name: `+w.name+`
Material Type: `+w.type+`

Program Info Log: `+q+`
`+K+`
`+he)}else q!==""?$e("WebGLProgram: Program Info Log:",q):(H===""||Z==="")&&(J=!1);J&&(w.diagnostics={runnable:W,programLog:q,vertexShader:{log:H,prefix:m},fragmentShader:{log:Z,prefix:p}})}i.deleteShader(C),i.deleteShader(v),L=new Ls(i,g),b=Rp(i,g)}let L;this.getUniforms=function(){return L===void 0&&A(this),L};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=i.getProgramParameter(g,vp)),S},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=_p++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=C,this.fragmentShader=v,this}let Bp=0;class zp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Gp(e),t.set(e,n)),n}}class Gp{constructor(e){this.id=Bp++,this.code=e,this.usedTimes=0}}function Hp(r,e,t,n,i,s,o){const a=new ko,l=new zp,c=new Set,h=[],u=i.logarithmicDepthBuffer,d=i.vertexTextures;let f=i.precision;const x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(b){return c.add(b),b===0?"uv":`uv${b}`}function m(b,S,w,N,F){const B=N.fog,q=F.geometry,H=b.isMeshStandardMaterial?N.environment:null,Z=(b.isMeshStandardMaterial?t:e).get(b.envMap||H),W=Z&&Z.mapping===Ws?Z.image.height:null,J=x[b.type];b.precision!==null&&(f=i.getMaxPrecision(b.precision),f!==b.precision&&$e("WebGLProgram.getParameters:",b.precision,"not supported, using",f,"instead."));const K=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,he=K!==void 0?K.length:0;let Ae=0;q.morphAttributes.position!==void 0&&(Ae=1),q.morphAttributes.normal!==void 0&&(Ae=2),q.morphAttributes.color!==void 0&&(Ae=3);let ke,Ke,Xe,Q;if(J){const ht=dn[J];ke=ht.vertexShader,Ke=ht.fragmentShader}else ke=b.vertexShader,Ke=b.fragmentShader,l.update(b),Xe=l.getVertexShaderID(b),Q=l.getFragmentShaderID(b);const te=r.getRenderTarget(),pe=r.state.buffers.depth.getReversed(),ce=F.isInstancedMesh===!0,oe=F.isBatchedMesh===!0,le=!!b.map,je=!!b.matcap,De=!!Z,tt=!!b.aoMap,O=!!b.lightMap,Ie=!!b.bumpMap,Ne=!!b.normalMap,qe=!!b.displacementMap,me=!!b.emissiveMap,it=!!b.metalnessMap,be=!!b.roughnessMap,Pe=b.anisotropy>0,D=b.clearcoat>0,T=b.dispersion>0,z=b.iridescence>0,ee=b.sheen>0,ie=b.transmission>0,j=Pe&&!!b.anisotropyMap,Ce=D&&!!b.clearcoatMap,ge=D&&!!b.clearcoatNormalMap,Fe=D&&!!b.clearcoatRoughnessMap,Re=z&&!!b.iridescenceMap,se=z&&!!b.iridescenceThicknessMap,ae=ee&&!!b.sheenColorMap,He=ee&&!!b.sheenRoughnessMap,ze=!!b.specularMap,Se=!!b.specularColorMap,Ve=!!b.specularIntensityMap,k=ie&&!!b.transmissionMap,ve=ie&&!!b.thicknessMap,de=!!b.gradientMap,fe=!!b.alphaMap,re=b.alphaTest>0,ne=!!b.alphaHash,Ee=!!b.extensions;let Ye=Nn;b.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(Ye=r.toneMapping);const vt={shaderID:J,shaderType:b.type,shaderName:b.name,vertexShader:ke,fragmentShader:Ke,defines:b.defines,customVertexShaderID:Xe,customFragmentShaderID:Q,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:f,batching:oe,batchingColor:oe&&F._colorsTexture!==null,instancing:ce,instancingColor:ce&&F.instanceColor!==null,instancingMorph:ce&&F.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:te===null?r.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:Si,alphaToCoverage:!!b.alphaToCoverage,map:le,matcap:je,envMap:De,envMapMode:De&&Z.mapping,envMapCubeUVHeight:W,aoMap:tt,lightMap:O,bumpMap:Ie,normalMap:Ne,displacementMap:d&&qe,emissiveMap:me,normalMapObjectSpace:Ne&&b.normalMapType===Mc,normalMapTangentSpace:Ne&&b.normalMapType===gl,metalnessMap:it,roughnessMap:be,anisotropy:Pe,anisotropyMap:j,clearcoat:D,clearcoatMap:Ce,clearcoatNormalMap:ge,clearcoatRoughnessMap:Fe,dispersion:T,iridescence:z,iridescenceMap:Re,iridescenceThicknessMap:se,sheen:ee,sheenColorMap:ae,sheenRoughnessMap:He,specularMap:ze,specularColorMap:Se,specularIntensityMap:Ve,transmission:ie,transmissionMap:k,thicknessMap:ve,gradientMap:de,opaque:b.transparent===!1&&b.blending===mi&&b.alphaToCoverage===!1,alphaMap:fe,alphaTest:re,alphaHash:ne,combine:b.combine,mapUv:le&&g(b.map.channel),aoMapUv:tt&&g(b.aoMap.channel),lightMapUv:O&&g(b.lightMap.channel),bumpMapUv:Ie&&g(b.bumpMap.channel),normalMapUv:Ne&&g(b.normalMap.channel),displacementMapUv:qe&&g(b.displacementMap.channel),emissiveMapUv:me&&g(b.emissiveMap.channel),metalnessMapUv:it&&g(b.metalnessMap.channel),roughnessMapUv:be&&g(b.roughnessMap.channel),anisotropyMapUv:j&&g(b.anisotropyMap.channel),clearcoatMapUv:Ce&&g(b.clearcoatMap.channel),clearcoatNormalMapUv:ge&&g(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Fe&&g(b.clearcoatRoughnessMap.channel),iridescenceMapUv:Re&&g(b.iridescenceMap.channel),iridescenceThicknessMapUv:se&&g(b.iridescenceThicknessMap.channel),sheenColorMapUv:ae&&g(b.sheenColorMap.channel),sheenRoughnessMapUv:He&&g(b.sheenRoughnessMap.channel),specularMapUv:ze&&g(b.specularMap.channel),specularColorMapUv:Se&&g(b.specularColorMap.channel),specularIntensityMapUv:Ve&&g(b.specularIntensityMap.channel),transmissionMapUv:k&&g(b.transmissionMap.channel),thicknessMapUv:ve&&g(b.thicknessMap.channel),alphaMapUv:fe&&g(b.alphaMap.channel),vertexTangents:!!q.attributes.tangent&&(Ne||Pe),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!q.attributes.uv&&(le||fe),fog:!!B,useFog:b.fog===!0,fogExp2:!!B&&B.isFogExp2,flatShading:b.flatShading===!0&&b.wireframe===!1,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:pe,skinning:F.isSkinnedMesh===!0,morphTargets:q.morphAttributes.position!==void 0,morphNormals:q.morphAttributes.normal!==void 0,morphColors:q.morphAttributes.color!==void 0,morphTargetsCount:he,morphTextureStride:Ae,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:r.shadowMap.enabled&&w.length>0,shadowMapType:r.shadowMap.type,toneMapping:Ye,decodeVideoTexture:le&&b.map.isVideoTexture===!0&&at.getTransfer(b.map.colorSpace)===dt,decodeVideoTextureEmissive:me&&b.emissiveMap.isVideoTexture===!0&&at.getTransfer(b.emissiveMap.colorSpace)===dt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Xt,flipSided:b.side===Bt,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Ee&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ee&&b.extensions.multiDraw===!0||oe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return vt.vertexUv1s=c.has(1),vt.vertexUv2s=c.has(2),vt.vertexUv3s=c.has(3),c.clear(),vt}function p(b){const S=[];if(b.shaderID?S.push(b.shaderID):(S.push(b.customVertexShaderID),S.push(b.customFragmentShaderID)),b.defines!==void 0)for(const w in b.defines)S.push(w),S.push(b.defines[w]);return b.isRawShaderMaterial===!1&&(_(S,b),y(S,b),S.push(r.outputColorSpace)),S.push(b.customProgramCacheKey),S.join()}function _(b,S){b.push(S.precision),b.push(S.outputColorSpace),b.push(S.envMapMode),b.push(S.envMapCubeUVHeight),b.push(S.mapUv),b.push(S.alphaMapUv),b.push(S.lightMapUv),b.push(S.aoMapUv),b.push(S.bumpMapUv),b.push(S.normalMapUv),b.push(S.displacementMapUv),b.push(S.emissiveMapUv),b.push(S.metalnessMapUv),b.push(S.roughnessMapUv),b.push(S.anisotropyMapUv),b.push(S.clearcoatMapUv),b.push(S.clearcoatNormalMapUv),b.push(S.clearcoatRoughnessMapUv),b.push(S.iridescenceMapUv),b.push(S.iridescenceThicknessMapUv),b.push(S.sheenColorMapUv),b.push(S.sheenRoughnessMapUv),b.push(S.specularMapUv),b.push(S.specularColorMapUv),b.push(S.specularIntensityMapUv),b.push(S.transmissionMapUv),b.push(S.thicknessMapUv),b.push(S.combine),b.push(S.fogExp2),b.push(S.sizeAttenuation),b.push(S.morphTargetsCount),b.push(S.morphAttributeCount),b.push(S.numDirLights),b.push(S.numPointLights),b.push(S.numSpotLights),b.push(S.numSpotLightMaps),b.push(S.numHemiLights),b.push(S.numRectAreaLights),b.push(S.numDirLightShadows),b.push(S.numPointLightShadows),b.push(S.numSpotLightShadows),b.push(S.numSpotLightShadowsWithMaps),b.push(S.numLightProbes),b.push(S.shadowMapType),b.push(S.toneMapping),b.push(S.numClippingPlanes),b.push(S.numClipIntersection),b.push(S.depthPacking)}function y(b,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),S.gradientMap&&a.enable(22),b.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reversedDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),b.push(a.mask)}function E(b){const S=x[b.type];let w;if(S){const N=dn[S];w=eh.clone(N.uniforms)}else w=b.uniforms;return w}function C(b,S){let w;for(let N=0,F=h.length;N<F;N++){const B=h[N];if(B.cacheKey===S){w=B,++w.usedTimes;break}}return w===void 0&&(w=new kp(r,S,b,s),h.push(w)),w}function v(b){if(--b.usedTimes===0){const S=h.indexOf(b);h[S]=h[h.length-1],h.pop(),b.destroy()}}function A(b){l.remove(b)}function L(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:E,acquireProgram:C,releaseProgram:v,releaseShaderCache:A,programs:h,dispose:L}}function Wp(){let r=new WeakMap;function e(o){return r.has(o)}function t(o){let a=r.get(o);return a===void 0&&(a={},r.set(o,a)),a}function n(o){r.delete(o)}function i(o,a,l){r.get(o)[a]=l}function s(){r=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function Vp(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.material.id!==e.material.id?r.material.id-e.material.id:r.z!==e.z?r.z-e.z:r.id-e.id}function ja(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function Ja(){const r=[];let e=0;const t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function o(u,d,f,x,g,m){let p=r[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:x,renderOrder:u.renderOrder,z:g,group:m},r[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=x,p.renderOrder=u.renderOrder,p.z=g,p.group=m),e++,p}function a(u,d,f,x,g,m){const p=o(u,d,f,x,g,m);f.transmission>0?n.push(p):f.transparent===!0?i.push(p):t.push(p)}function l(u,d,f,x,g,m){const p=o(u,d,f,x,g,m);f.transmission>0?n.unshift(p):f.transparent===!0?i.unshift(p):t.unshift(p)}function c(u,d){t.length>1&&t.sort(u||Vp),n.length>1&&n.sort(d||ja),i.length>1&&i.sort(d||ja)}function h(){for(let u=e,d=r.length;u<d;u++){const f=r[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:a,unshift:l,finish:h,sort:c}}function qp(){let r=new WeakMap;function e(n,i){const s=r.get(n);let o;return s===void 0?(o=new Ja,r.set(n,[o])):i>=s.length?(o=new Ja,s.push(o)):o=s[i],o}function t(){r=new WeakMap}return{get:e,dispose:t}}function Xp(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new we};break;case"SpotLight":t={position:new P,direction:new P,color:new we,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new we,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new we,groundColor:new we};break;case"RectAreaLight":t={color:new we,position:new P,halfWidth:new P,halfHeight:new P};break}return r[e.id]=t,t}}}function Yp(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new rt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new rt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new rt,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}let $p=0;function Kp(r,e){return(e.castShadow?2:0)-(r.castShadow?2:0)+(e.map?1:0)-(r.map?1:0)}function jp(r){const e=new Xp,t=Yp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new P);const i=new P,s=new pt,o=new pt;function a(c){let h=0,u=0,d=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,x=0,g=0,m=0,p=0,_=0,y=0,E=0,C=0,v=0,A=0;c.sort(Kp);for(let b=0,S=c.length;b<S;b++){const w=c[b],N=w.color,F=w.intensity,B=w.distance,q=w.shadow&&w.shadow.map?w.shadow.map.texture:null;if(w.isAmbientLight)h+=N.r*F,u+=N.g*F,d+=N.b*F;else if(w.isLightProbe){for(let H=0;H<9;H++)n.probe[H].addScaledVector(w.sh.coefficients[H],F);A++}else if(w.isDirectionalLight){const H=e.get(w);if(H.color.copy(w.color).multiplyScalar(w.intensity),w.castShadow){const Z=w.shadow,W=t.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,n.directionalShadow[f]=W,n.directionalShadowMap[f]=q,n.directionalShadowMatrix[f]=w.shadow.matrix,_++}n.directional[f]=H,f++}else if(w.isSpotLight){const H=e.get(w);H.position.setFromMatrixPosition(w.matrixWorld),H.color.copy(N).multiplyScalar(F),H.distance=B,H.coneCos=Math.cos(w.angle),H.penumbraCos=Math.cos(w.angle*(1-w.penumbra)),H.decay=w.decay,n.spot[g]=H;const Z=w.shadow;if(w.map&&(n.spotLightMap[C]=w.map,C++,Z.updateMatrices(w),w.castShadow&&v++),n.spotLightMatrix[g]=Z.matrix,w.castShadow){const W=t.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,n.spotShadow[g]=W,n.spotShadowMap[g]=q,E++}g++}else if(w.isRectAreaLight){const H=e.get(w);H.color.copy(N).multiplyScalar(F),H.halfWidth.set(w.width*.5,0,0),H.halfHeight.set(0,w.height*.5,0),n.rectArea[m]=H,m++}else if(w.isPointLight){const H=e.get(w);if(H.color.copy(w.color).multiplyScalar(w.intensity),H.distance=w.distance,H.decay=w.decay,w.castShadow){const Z=w.shadow,W=t.get(w);W.shadowIntensity=Z.intensity,W.shadowBias=Z.bias,W.shadowNormalBias=Z.normalBias,W.shadowRadius=Z.radius,W.shadowMapSize=Z.mapSize,W.shadowCameraNear=Z.camera.near,W.shadowCameraFar=Z.camera.far,n.pointShadow[x]=W,n.pointShadowMap[x]=q,n.pointShadowMatrix[x]=w.shadow.matrix,y++}n.point[x]=H,x++}else if(w.isHemisphereLight){const H=e.get(w);H.skyColor.copy(w.color).multiplyScalar(F),H.groundColor.copy(w.groundColor).multiplyScalar(F),n.hemi[p]=H,p++}}m>0&&(r.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=xe.LTC_FLOAT_1,n.rectAreaLTC2=xe.LTC_FLOAT_2):(n.rectAreaLTC1=xe.LTC_HALF_1,n.rectAreaLTC2=xe.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const L=n.hash;(L.directionalLength!==f||L.pointLength!==x||L.spotLength!==g||L.rectAreaLength!==m||L.hemiLength!==p||L.numDirectionalShadows!==_||L.numPointShadows!==y||L.numSpotShadows!==E||L.numSpotMaps!==C||L.numLightProbes!==A)&&(n.directional.length=f,n.spot.length=g,n.rectArea.length=m,n.point.length=x,n.hemi.length=p,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=E,n.spotShadowMap.length=E,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=E+C-v,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=v,n.numLightProbes=A,L.directionalLength=f,L.pointLength=x,L.spotLength=g,L.rectAreaLength=m,L.hemiLength=p,L.numDirectionalShadows=_,L.numPointShadows=y,L.numSpotShadows=E,L.numSpotMaps=C,L.numLightProbes=A,n.version=$p++)}function l(c,h){let u=0,d=0,f=0,x=0,g=0;const m=h.matrixWorldInverse;for(let p=0,_=c.length;p<_;p++){const y=c[p];if(y.isDirectionalLight){const E=n.directional[u];E.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(i),E.direction.transformDirection(m),u++}else if(y.isSpotLight){const E=n.spot[f];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(m),E.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),E.direction.sub(i),E.direction.transformDirection(m),f++}else if(y.isRectAreaLight){const E=n.rectArea[x];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(m),o.identity(),s.copy(y.matrixWorld),s.premultiply(m),o.extractRotation(s),E.halfWidth.set(y.width*.5,0,0),E.halfHeight.set(0,y.height*.5,0),E.halfWidth.applyMatrix4(o),E.halfHeight.applyMatrix4(o),x++}else if(y.isPointLight){const E=n.point[d];E.position.setFromMatrixPosition(y.matrixWorld),E.position.applyMatrix4(m),d++}else if(y.isHemisphereLight){const E=n.hemi[g];E.direction.setFromMatrixPosition(y.matrixWorld),E.direction.transformDirection(m),g++}}}return{setup:a,setupView:l,state:n}}function Za(r){const e=new jp(r),t=[],n=[];function i(h){c.camera=h,t.length=0,n.length=0}function s(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function Jp(r){let e=new WeakMap;function t(i,s=0){const o=e.get(i);let a;return o===void 0?(a=new Za(r),e.set(i,[a])):s>=o.length?(a=new Za(r),o.push(a)):a=o[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const Zp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Qp=`uniform sampler2D shadow_pass;
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
}`;function em(r,e,t){let n=new Zi;const i=new rt,s=new rt,o=new ft,a=new fh({depthPacking:Ec}),l=new ph,c={},h=t.maxTextureSize,u={[Fn]:Bt,[Bt]:Fn,[Xt]:Xt},d=new ct({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new rt},radius:{value:4}},vertexShader:Zp,fragmentShader:Qp}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const x=new xt;x.setAttribute("position",new Ct(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new Le(x,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ol;let p=this.type;this.render=function(v,A,L){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||v.length===0)return;const b=r.getRenderTarget(),S=r.getActiveCubeFace(),w=r.getActiveMipmapLevel(),N=r.state;N.setBlending(Tn),N.buffers.depth.getReversed()===!0?N.buffers.color.setClear(0,0,0,0):N.buffers.color.setClear(1,1,1,1),N.buffers.depth.setTest(!0),N.setScissorTest(!1);const F=p!==Sn&&this.type===Sn,B=p===Sn&&this.type!==Sn;for(let q=0,H=v.length;q<H;q++){const Z=v[q],W=Z.shadow;if(W===void 0){$e("WebGLShadowMap:",Z,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;i.copy(W.mapSize);const J=W.getFrameExtents();if(i.multiply(J),s.copy(W.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/J.x),i.x=s.x*J.x,W.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/J.y),i.y=s.y*J.y,W.mapSize.y=s.y)),W.map===null||F===!0||B===!0){const he=this.type!==Sn?{minFilter:St,magFilter:St}:{};W.map!==null&&W.map.dispose(),W.map=new kn(i.x,i.y,he),W.map.texture.name=Z.name+".shadowMap",W.camera.updateProjectionMatrix()}r.setRenderTarget(W.map),r.clear();const K=W.getViewportCount();for(let he=0;he<K;he++){const Ae=W.getViewport(he);o.set(s.x*Ae.x,s.y*Ae.y,s.x*Ae.z,s.y*Ae.w),N.viewport(o),W.updateMatrices(Z,he),n=W.getFrustum(),E(A,L,W.camera,Z,this.type)}W.isPointLightShadow!==!0&&this.type===Sn&&_(W,L),W.needsUpdate=!1}p=this.type,m.needsUpdate=!1,r.setRenderTarget(b,S,w)};function _(v,A){const L=e.update(g);d.defines.VSM_SAMPLES!==v.blurSamples&&(d.defines.VSM_SAMPLES=v.blurSamples,f.defines.VSM_SAMPLES=v.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),v.mapPass===null&&(v.mapPass=new kn(i.x,i.y)),d.uniforms.shadow_pass.value=v.map.texture,d.uniforms.resolution.value=v.mapSize,d.uniforms.radius.value=v.radius,r.setRenderTarget(v.mapPass),r.clear(),r.renderBufferDirect(A,null,L,d,g,null),f.uniforms.shadow_pass.value=v.mapPass.texture,f.uniforms.resolution.value=v.mapSize,f.uniforms.radius.value=v.radius,r.setRenderTarget(v.map),r.clear(),r.renderBufferDirect(A,null,L,f,g,null)}function y(v,A,L,b){let S=null;const w=L.isPointLight===!0?v.customDistanceMaterial:v.customDepthMaterial;if(w!==void 0)S=w;else if(S=L.isPointLight===!0?l:a,r.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){const N=S.uuid,F=A.uuid;let B=c[N];B===void 0&&(B={},c[N]=B);let q=B[F];q===void 0&&(q=S.clone(),B[F]=q,A.addEventListener("dispose",C)),S=q}if(S.visible=A.visible,S.wireframe=A.wireframe,b===Sn?S.side=A.shadowSide!==null?A.shadowSide:A.side:S.side=A.shadowSide!==null?A.shadowSide:u[A.side],S.alphaMap=A.alphaMap,S.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,S.map=A.map,S.clipShadows=A.clipShadows,S.clippingPlanes=A.clippingPlanes,S.clipIntersection=A.clipIntersection,S.displacementMap=A.displacementMap,S.displacementScale=A.displacementScale,S.displacementBias=A.displacementBias,S.wireframeLinewidth=A.wireframeLinewidth,S.linewidth=A.linewidth,L.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const N=r.properties.get(S);N.light=L}return S}function E(v,A,L,b,S){if(v.visible===!1)return;if(v.layers.test(A.layers)&&(v.isMesh||v.isLine||v.isPoints)&&(v.castShadow||v.receiveShadow&&S===Sn)&&(!v.frustumCulled||n.intersectsObject(v))){v.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,v.matrixWorld);const F=e.update(v),B=v.material;if(Array.isArray(B)){const q=F.groups;for(let H=0,Z=q.length;H<Z;H++){const W=q[H],J=B[W.materialIndex];if(J&&J.visible){const K=y(v,J,b,S);v.onBeforeShadow(r,v,A,L,F,K,W),r.renderBufferDirect(L,null,F,K,v,W),v.onAfterShadow(r,v,A,L,F,K,W)}}}else if(B.visible){const q=y(v,B,b,S);v.onBeforeShadow(r,v,A,L,F,q,null),r.renderBufferDirect(L,null,F,q,v,null),v.onAfterShadow(r,v,A,L,F,q,null)}}const N=v.children;for(let F=0,B=N.length;F<B;F++)E(N[F],A,L,b,S)}function C(v){v.target.removeEventListener("dispose",C);for(const L in c){const b=c[L],S=v.target.uuid;S in b&&(b[S].dispose(),delete b[S])}}}const tm={[Ur]:kr,[Br]:Hr,[zr]:Wr,[xi]:Gr,[kr]:Ur,[Hr]:Br,[Wr]:zr,[Gr]:xi};function nm(r,e){function t(){let k=!1;const ve=new ft;let de=null;const fe=new ft(0,0,0,0);return{setMask:function(re){de!==re&&!k&&(r.colorMask(re,re,re,re),de=re)},setLocked:function(re){k=re},setClear:function(re,ne,Ee,Ye,vt){vt===!0&&(re*=Ye,ne*=Ye,Ee*=Ye),ve.set(re,ne,Ee,Ye),fe.equals(ve)===!1&&(r.clearColor(re,ne,Ee,Ye),fe.copy(ve))},reset:function(){k=!1,de=null,fe.set(-1,0,0,0)}}}function n(){let k=!1,ve=!1,de=null,fe=null,re=null;return{setReversed:function(ne){if(ve!==ne){const Ee=e.get("EXT_clip_control");ne?Ee.clipControlEXT(Ee.LOWER_LEFT_EXT,Ee.ZERO_TO_ONE_EXT):Ee.clipControlEXT(Ee.LOWER_LEFT_EXT,Ee.NEGATIVE_ONE_TO_ONE_EXT),ve=ne;const Ye=re;re=null,this.setClear(Ye)}},getReversed:function(){return ve},setTest:function(ne){ne?te(r.DEPTH_TEST):pe(r.DEPTH_TEST)},setMask:function(ne){de!==ne&&!k&&(r.depthMask(ne),de=ne)},setFunc:function(ne){if(ve&&(ne=tm[ne]),fe!==ne){switch(ne){case Ur:r.depthFunc(r.NEVER);break;case kr:r.depthFunc(r.ALWAYS);break;case Br:r.depthFunc(r.LESS);break;case xi:r.depthFunc(r.LEQUAL);break;case zr:r.depthFunc(r.EQUAL);break;case Gr:r.depthFunc(r.GEQUAL);break;case Hr:r.depthFunc(r.GREATER);break;case Wr:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}fe=ne}},setLocked:function(ne){k=ne},setClear:function(ne){re!==ne&&(ve&&(ne=1-ne),r.clearDepth(ne),re=ne)},reset:function(){k=!1,de=null,fe=null,re=null,ve=!1}}}function i(){let k=!1,ve=null,de=null,fe=null,re=null,ne=null,Ee=null,Ye=null,vt=null;return{setTest:function(ht){k||(ht?te(r.STENCIL_TEST):pe(r.STENCIL_TEST))},setMask:function(ht){ve!==ht&&!k&&(r.stencilMask(ht),ve=ht)},setFunc:function(ht,un,nn){(de!==ht||fe!==un||re!==nn)&&(r.stencilFunc(ht,un,nn),de=ht,fe=un,re=nn)},setOp:function(ht,un,nn){(ne!==ht||Ee!==un||Ye!==nn)&&(r.stencilOp(ht,un,nn),ne=ht,Ee=un,Ye=nn)},setLocked:function(ht){k=ht},setClear:function(ht){vt!==ht&&(r.clearStencil(ht),vt=ht)},reset:function(){k=!1,ve=null,de=null,fe=null,re=null,ne=null,Ee=null,Ye=null,vt=null}}}const s=new t,o=new n,a=new i,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,f=[],x=null,g=!1,m=null,p=null,_=null,y=null,E=null,C=null,v=null,A=new we(0,0,0),L=0,b=!1,S=null,w=null,N=null,F=null,B=null;const q=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let H=!1,Z=0;const W=r.getParameter(r.VERSION);W.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(W)[1]),H=Z>=1):W.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),H=Z>=2);let J=null,K={};const he=r.getParameter(r.SCISSOR_BOX),Ae=r.getParameter(r.VIEWPORT),ke=new ft().fromArray(he),Ke=new ft().fromArray(Ae);function Xe(k,ve,de,fe){const re=new Uint8Array(4),ne=r.createTexture();r.bindTexture(k,ne),r.texParameteri(k,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(k,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let Ee=0;Ee<de;Ee++)k===r.TEXTURE_3D||k===r.TEXTURE_2D_ARRAY?r.texImage3D(ve,0,r.RGBA,1,1,fe,0,r.RGBA,r.UNSIGNED_BYTE,re):r.texImage2D(ve+Ee,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,re);return ne}const Q={};Q[r.TEXTURE_2D]=Xe(r.TEXTURE_2D,r.TEXTURE_2D,1),Q[r.TEXTURE_CUBE_MAP]=Xe(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),Q[r.TEXTURE_2D_ARRAY]=Xe(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),Q[r.TEXTURE_3D]=Xe(r.TEXTURE_3D,r.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),te(r.DEPTH_TEST),o.setFunc(xi),Ie(!1),Ne(Ko),te(r.CULL_FACE),tt(Tn);function te(k){h[k]!==!0&&(r.enable(k),h[k]=!0)}function pe(k){h[k]!==!1&&(r.disable(k),h[k]=!1)}function ce(k,ve){return u[k]!==ve?(r.bindFramebuffer(k,ve),u[k]=ve,k===r.DRAW_FRAMEBUFFER&&(u[r.FRAMEBUFFER]=ve),k===r.FRAMEBUFFER&&(u[r.DRAW_FRAMEBUFFER]=ve),!0):!1}function oe(k,ve){let de=f,fe=!1;if(k){de=d.get(ve),de===void 0&&(de=[],d.set(ve,de));const re=k.textures;if(de.length!==re.length||de[0]!==r.COLOR_ATTACHMENT0){for(let ne=0,Ee=re.length;ne<Ee;ne++)de[ne]=r.COLOR_ATTACHMENT0+ne;de.length=re.length,fe=!0}}else de[0]!==r.BACK&&(de[0]=r.BACK,fe=!0);fe&&r.drawBuffers(de)}function le(k){return x!==k?(r.useProgram(k),x=k,!0):!1}const je={[$n]:r.FUNC_ADD,[jl]:r.FUNC_SUBTRACT,[Jl]:r.FUNC_REVERSE_SUBTRACT};je[Zl]=r.MIN,je[Ql]=r.MAX;const De={[ec]:r.ZERO,[tc]:r.ONE,[nc]:r.SRC_COLOR,[Nr]:r.SRC_ALPHA,[lc]:r.SRC_ALPHA_SATURATE,[oc]:r.DST_COLOR,[sc]:r.DST_ALPHA,[ic]:r.ONE_MINUS_SRC_COLOR,[Fr]:r.ONE_MINUS_SRC_ALPHA,[ac]:r.ONE_MINUS_DST_COLOR,[rc]:r.ONE_MINUS_DST_ALPHA,[cc]:r.CONSTANT_COLOR,[hc]:r.ONE_MINUS_CONSTANT_COLOR,[uc]:r.CONSTANT_ALPHA,[dc]:r.ONE_MINUS_CONSTANT_ALPHA};function tt(k,ve,de,fe,re,ne,Ee,Ye,vt,ht){if(k===Tn){g===!0&&(pe(r.BLEND),g=!1);return}if(g===!1&&(te(r.BLEND),g=!0),k!==Kl){if(k!==m||ht!==b){if((p!==$n||E!==$n)&&(r.blendEquation(r.FUNC_ADD),p=$n,E=$n),ht)switch(k){case mi:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Or:r.blendFunc(r.ONE,r.ONE);break;case jo:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case Jo:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:At("WebGLState: Invalid blending: ",k);break}else switch(k){case mi:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Or:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case jo:At("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Jo:At("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:At("WebGLState: Invalid blending: ",k);break}_=null,y=null,C=null,v=null,A.set(0,0,0),L=0,m=k,b=ht}return}re=re||ve,ne=ne||de,Ee=Ee||fe,(ve!==p||re!==E)&&(r.blendEquationSeparate(je[ve],je[re]),p=ve,E=re),(de!==_||fe!==y||ne!==C||Ee!==v)&&(r.blendFuncSeparate(De[de],De[fe],De[ne],De[Ee]),_=de,y=fe,C=ne,v=Ee),(Ye.equals(A)===!1||vt!==L)&&(r.blendColor(Ye.r,Ye.g,Ye.b,vt),A.copy(Ye),L=vt),m=k,b=!1}function O(k,ve){k.side===Xt?pe(r.CULL_FACE):te(r.CULL_FACE);let de=k.side===Bt;ve&&(de=!de),Ie(de),k.blending===mi&&k.transparent===!1?tt(Tn):tt(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),o.setFunc(k.depthFunc),o.setTest(k.depthTest),o.setMask(k.depthWrite),s.setMask(k.colorWrite);const fe=k.stencilWrite;a.setTest(fe),fe&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),me(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?te(r.SAMPLE_ALPHA_TO_COVERAGE):pe(r.SAMPLE_ALPHA_TO_COVERAGE)}function Ie(k){S!==k&&(k?r.frontFace(r.CW):r.frontFace(r.CCW),S=k)}function Ne(k){k!==Yl?(te(r.CULL_FACE),k!==w&&(k===Ko?r.cullFace(r.BACK):k===$l?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):pe(r.CULL_FACE),w=k}function qe(k){k!==N&&(H&&r.lineWidth(k),N=k)}function me(k,ve,de){k?(te(r.POLYGON_OFFSET_FILL),(F!==ve||B!==de)&&(r.polygonOffset(ve,de),F=ve,B=de)):pe(r.POLYGON_OFFSET_FILL)}function it(k){k?te(r.SCISSOR_TEST):pe(r.SCISSOR_TEST)}function be(k){k===void 0&&(k=r.TEXTURE0+q-1),J!==k&&(r.activeTexture(k),J=k)}function Pe(k,ve,de){de===void 0&&(J===null?de=r.TEXTURE0+q-1:de=J);let fe=K[de];fe===void 0&&(fe={type:void 0,texture:void 0},K[de]=fe),(fe.type!==k||fe.texture!==ve)&&(J!==de&&(r.activeTexture(de),J=de),r.bindTexture(k,ve||Q[k]),fe.type=k,fe.texture=ve)}function D(){const k=K[J];k!==void 0&&k.type!==void 0&&(r.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function T(){try{r.compressedTexImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function z(){try{r.compressedTexImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function ee(){try{r.texSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function ie(){try{r.texSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function j(){try{r.compressedTexSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function Ce(){try{r.compressedTexSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function ge(){try{r.texStorage2D(...arguments)}catch(k){k("WebGLState:",k)}}function Fe(){try{r.texStorage3D(...arguments)}catch(k){k("WebGLState:",k)}}function Re(){try{r.texImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function se(){try{r.texImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function ae(k){ke.equals(k)===!1&&(r.scissor(k.x,k.y,k.z,k.w),ke.copy(k))}function He(k){Ke.equals(k)===!1&&(r.viewport(k.x,k.y,k.z,k.w),Ke.copy(k))}function ze(k,ve){let de=c.get(ve);de===void 0&&(de=new WeakMap,c.set(ve,de));let fe=de.get(k);fe===void 0&&(fe=r.getUniformBlockIndex(ve,k.name),de.set(k,fe))}function Se(k,ve){const fe=c.get(ve).get(k);l.get(ve)!==fe&&(r.uniformBlockBinding(ve,fe,k.__bindingPointIndex),l.set(ve,fe))}function Ve(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),o.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),h={},J=null,K={},u={},d=new WeakMap,f=[],x=null,g=!1,m=null,p=null,_=null,y=null,E=null,C=null,v=null,A=new we(0,0,0),L=0,b=!1,S=null,w=null,N=null,F=null,B=null,ke.set(0,0,r.canvas.width,r.canvas.height),Ke.set(0,0,r.canvas.width,r.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:te,disable:pe,bindFramebuffer:ce,drawBuffers:oe,useProgram:le,setBlending:tt,setMaterial:O,setFlipSided:Ie,setCullFace:Ne,setLineWidth:qe,setPolygonOffset:me,setScissorTest:it,activeTexture:be,bindTexture:Pe,unbindTexture:D,compressedTexImage2D:T,compressedTexImage3D:z,texImage2D:Re,texImage3D:se,updateUBOMapping:ze,uniformBlockBinding:Se,texStorage2D:ge,texStorage3D:Fe,texSubImage2D:ee,texSubImage3D:ie,compressedTexSubImage2D:j,compressedTexSubImage3D:Ce,scissor:ae,viewport:He,reset:Ve}}function im(r,e,t,n,i,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new rt,h=new WeakMap;let u;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(D,T){return f?new OffscreenCanvas(D,T):Xi("canvas")}function g(D,T,z){let ee=1;const ie=Pe(D);if((ie.width>z||ie.height>z)&&(ee=z/Math.max(ie.width,ie.height)),ee<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const j=Math.floor(ee*ie.width),Ce=Math.floor(ee*ie.height);u===void 0&&(u=x(j,Ce));const ge=T?x(j,Ce):u;return ge.width=j,ge.height=Ce,ge.getContext("2d").drawImage(D,0,0,j,Ce),$e("WebGLRenderer: Texture has been resized from ("+ie.width+"x"+ie.height+") to ("+j+"x"+Ce+")."),ge}else return"data"in D&&$e("WebGLRenderer: Image in DataTexture is too big ("+ie.width+"x"+ie.height+")."),D;return D}function m(D){return D.generateMipmaps}function p(D){r.generateMipmap(D)}function _(D){return D.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?r.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function y(D,T,z,ee,ie=!1){if(D!==null){if(r[D]!==void 0)return r[D];$e("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let j=T;if(T===r.RED&&(z===r.FLOAT&&(j=r.R32F),z===r.HALF_FLOAT&&(j=r.R16F),z===r.UNSIGNED_BYTE&&(j=r.R8)),T===r.RED_INTEGER&&(z===r.UNSIGNED_BYTE&&(j=r.R8UI),z===r.UNSIGNED_SHORT&&(j=r.R16UI),z===r.UNSIGNED_INT&&(j=r.R32UI),z===r.BYTE&&(j=r.R8I),z===r.SHORT&&(j=r.R16I),z===r.INT&&(j=r.R32I)),T===r.RG&&(z===r.FLOAT&&(j=r.RG32F),z===r.HALF_FLOAT&&(j=r.RG16F),z===r.UNSIGNED_BYTE&&(j=r.RG8)),T===r.RG_INTEGER&&(z===r.UNSIGNED_BYTE&&(j=r.RG8UI),z===r.UNSIGNED_SHORT&&(j=r.RG16UI),z===r.UNSIGNED_INT&&(j=r.RG32UI),z===r.BYTE&&(j=r.RG8I),z===r.SHORT&&(j=r.RG16I),z===r.INT&&(j=r.RG32I)),T===r.RGB_INTEGER&&(z===r.UNSIGNED_BYTE&&(j=r.RGB8UI),z===r.UNSIGNED_SHORT&&(j=r.RGB16UI),z===r.UNSIGNED_INT&&(j=r.RGB32UI),z===r.BYTE&&(j=r.RGB8I),z===r.SHORT&&(j=r.RGB16I),z===r.INT&&(j=r.RGB32I)),T===r.RGBA_INTEGER&&(z===r.UNSIGNED_BYTE&&(j=r.RGBA8UI),z===r.UNSIGNED_SHORT&&(j=r.RGBA16UI),z===r.UNSIGNED_INT&&(j=r.RGBA32UI),z===r.BYTE&&(j=r.RGBA8I),z===r.SHORT&&(j=r.RGBA16I),z===r.INT&&(j=r.RGBA32I)),T===r.RGB&&(z===r.UNSIGNED_INT_5_9_9_9_REV&&(j=r.RGB9_E5),z===r.UNSIGNED_INT_10F_11F_11F_REV&&(j=r.R11F_G11F_B10F)),T===r.RGBA){const Ce=ie?Bs:at.getTransfer(ee);z===r.FLOAT&&(j=r.RGBA32F),z===r.HALF_FLOAT&&(j=r.RGBA16F),z===r.UNSIGNED_BYTE&&(j=Ce===dt?r.SRGB8_ALPHA8:r.RGBA8),z===r.UNSIGNED_SHORT_4_4_4_4&&(j=r.RGBA4),z===r.UNSIGNED_SHORT_5_5_5_1&&(j=r.RGB5_A1)}return(j===r.R16F||j===r.R32F||j===r.RG16F||j===r.RG32F||j===r.RGBA16F||j===r.RGBA32F)&&e.get("EXT_color_buffer_float"),j}function E(D,T){let z;return D?T===null||T===Un||T===Vi?z=r.DEPTH24_STENCIL8:T===bn?z=r.DEPTH32F_STENCIL8:T===Wi&&(z=r.DEPTH24_STENCIL8,$e("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===Un||T===Vi?z=r.DEPTH_COMPONENT24:T===bn?z=r.DEPTH_COMPONENT32F:T===Wi&&(z=r.DEPTH_COMPONENT16),z}function C(D,T){return m(D)===!0||D.isFramebufferTexture&&D.minFilter!==St&&D.minFilter!==tn?Math.log2(Math.max(T.width,T.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?T.mipmaps.length:1}function v(D){const T=D.target;T.removeEventListener("dispose",v),L(T),T.isVideoTexture&&h.delete(T)}function A(D){const T=D.target;T.removeEventListener("dispose",A),S(T)}function L(D){const T=n.get(D);if(T.__webglInit===void 0)return;const z=D.source,ee=d.get(z);if(ee){const ie=ee[T.__cacheKey];ie.usedTimes--,ie.usedTimes===0&&b(D),Object.keys(ee).length===0&&d.delete(z)}n.remove(D)}function b(D){const T=n.get(D);r.deleteTexture(T.__webglTexture);const z=D.source,ee=d.get(z);delete ee[T.__cacheKey],o.memory.textures--}function S(D){const T=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let ee=0;ee<6;ee++){if(Array.isArray(T.__webglFramebuffer[ee]))for(let ie=0;ie<T.__webglFramebuffer[ee].length;ie++)r.deleteFramebuffer(T.__webglFramebuffer[ee][ie]);else r.deleteFramebuffer(T.__webglFramebuffer[ee]);T.__webglDepthbuffer&&r.deleteRenderbuffer(T.__webglDepthbuffer[ee])}else{if(Array.isArray(T.__webglFramebuffer))for(let ee=0;ee<T.__webglFramebuffer.length;ee++)r.deleteFramebuffer(T.__webglFramebuffer[ee]);else r.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&r.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&r.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let ee=0;ee<T.__webglColorRenderbuffer.length;ee++)T.__webglColorRenderbuffer[ee]&&r.deleteRenderbuffer(T.__webglColorRenderbuffer[ee]);T.__webglDepthRenderbuffer&&r.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const z=D.textures;for(let ee=0,ie=z.length;ee<ie;ee++){const j=n.get(z[ee]);j.__webglTexture&&(r.deleteTexture(j.__webglTexture),o.memory.textures--),n.remove(z[ee])}n.remove(D)}let w=0;function N(){w=0}function F(){const D=w;return D>=i.maxTextures&&$e("WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+i.maxTextures),w+=1,D}function B(D){const T=[];return T.push(D.wrapS),T.push(D.wrapT),T.push(D.wrapR||0),T.push(D.magFilter),T.push(D.minFilter),T.push(D.anisotropy),T.push(D.internalFormat),T.push(D.format),T.push(D.type),T.push(D.generateMipmaps),T.push(D.premultiplyAlpha),T.push(D.flipY),T.push(D.unpackAlignment),T.push(D.colorSpace),T.join()}function q(D,T){const z=n.get(D);if(D.isVideoTexture&&it(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&z.__version!==D.version){const ee=D.image;if(ee===null)$e("WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)$e("WebGLRenderer: Texture marked for update but image is incomplete");else{Q(z,D,T);return}}else D.isExternalTexture&&(z.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D,z.__webglTexture,r.TEXTURE0+T)}function H(D,T){const z=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&z.__version!==D.version){Q(z,D,T);return}else D.isExternalTexture&&(z.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D_ARRAY,z.__webglTexture,r.TEXTURE0+T)}function Z(D,T){const z=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&z.__version!==D.version){Q(z,D,T);return}t.bindTexture(r.TEXTURE_3D,z.__webglTexture,r.TEXTURE0+T)}function W(D,T){const z=n.get(D);if(D.version>0&&z.__version!==D.version){te(z,D,T);return}t.bindTexture(r.TEXTURE_CUBE_MAP,z.__webglTexture,r.TEXTURE0+T)}const J={[Hi]:r.REPEAT,[Nt]:r.CLAMP_TO_EDGE,[Xr]:r.MIRRORED_REPEAT},K={[St]:r.NEAREST,[bc]:r.NEAREST_MIPMAP_NEAREST,[ns]:r.NEAREST_MIPMAP_LINEAR,[tn]:r.LINEAR,[Qs]:r.LINEAR_MIPMAP_NEAREST,[Zn]:r.LINEAR_MIPMAP_LINEAR},he={[Ac]:r.NEVER,[Pc]:r.ALWAYS,[Rc]:r.LESS,[xl]:r.LEQUAL,[Cc]:r.EQUAL,[Dc]:r.GEQUAL,[wc]:r.GREATER,[Ic]:r.NOTEQUAL};function Ae(D,T){if(T.type===bn&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===tn||T.magFilter===Qs||T.magFilter===ns||T.magFilter===Zn||T.minFilter===tn||T.minFilter===Qs||T.minFilter===ns||T.minFilter===Zn)&&$e("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(D,r.TEXTURE_WRAP_S,J[T.wrapS]),r.texParameteri(D,r.TEXTURE_WRAP_T,J[T.wrapT]),(D===r.TEXTURE_3D||D===r.TEXTURE_2D_ARRAY)&&r.texParameteri(D,r.TEXTURE_WRAP_R,J[T.wrapR]),r.texParameteri(D,r.TEXTURE_MAG_FILTER,K[T.magFilter]),r.texParameteri(D,r.TEXTURE_MIN_FILTER,K[T.minFilter]),T.compareFunction&&(r.texParameteri(D,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(D,r.TEXTURE_COMPARE_FUNC,he[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===St||T.minFilter!==ns&&T.minFilter!==Zn||T.type===bn&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){const z=e.get("EXT_texture_filter_anisotropic");r.texParameterf(D,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,i.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function ke(D,T){let z=!1;D.__webglInit===void 0&&(D.__webglInit=!0,T.addEventListener("dispose",v));const ee=T.source;let ie=d.get(ee);ie===void 0&&(ie={},d.set(ee,ie));const j=B(T);if(j!==D.__cacheKey){ie[j]===void 0&&(ie[j]={texture:r.createTexture(),usedTimes:0},o.memory.textures++,z=!0),ie[j].usedTimes++;const Ce=ie[D.__cacheKey];Ce!==void 0&&(ie[D.__cacheKey].usedTimes--,Ce.usedTimes===0&&b(T)),D.__cacheKey=j,D.__webglTexture=ie[j].texture}return z}function Ke(D,T,z){return Math.floor(Math.floor(D/z)/T)}function Xe(D,T,z,ee){const j=D.updateRanges;if(j.length===0)t.texSubImage2D(r.TEXTURE_2D,0,0,0,T.width,T.height,z,ee,T.data);else{j.sort((se,ae)=>se.start-ae.start);let Ce=0;for(let se=1;se<j.length;se++){const ae=j[Ce],He=j[se],ze=ae.start+ae.count,Se=Ke(He.start,T.width,4),Ve=Ke(ae.start,T.width,4);He.start<=ze+1&&Se===Ve&&Ke(He.start+He.count-1,T.width,4)===Se?ae.count=Math.max(ae.count,He.start+He.count-ae.start):(++Ce,j[Ce]=He)}j.length=Ce+1;const ge=r.getParameter(r.UNPACK_ROW_LENGTH),Fe=r.getParameter(r.UNPACK_SKIP_PIXELS),Re=r.getParameter(r.UNPACK_SKIP_ROWS);r.pixelStorei(r.UNPACK_ROW_LENGTH,T.width);for(let se=0,ae=j.length;se<ae;se++){const He=j[se],ze=Math.floor(He.start/4),Se=Math.ceil(He.count/4),Ve=ze%T.width,k=Math.floor(ze/T.width),ve=Se,de=1;r.pixelStorei(r.UNPACK_SKIP_PIXELS,Ve),r.pixelStorei(r.UNPACK_SKIP_ROWS,k),t.texSubImage2D(r.TEXTURE_2D,0,Ve,k,ve,de,z,ee,T.data)}D.clearUpdateRanges(),r.pixelStorei(r.UNPACK_ROW_LENGTH,ge),r.pixelStorei(r.UNPACK_SKIP_PIXELS,Fe),r.pixelStorei(r.UNPACK_SKIP_ROWS,Re)}}function Q(D,T,z){let ee=r.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(ee=r.TEXTURE_2D_ARRAY),T.isData3DTexture&&(ee=r.TEXTURE_3D);const ie=ke(D,T),j=T.source;t.bindTexture(ee,D.__webglTexture,r.TEXTURE0+z);const Ce=n.get(j);if(j.version!==Ce.__version||ie===!0){t.activeTexture(r.TEXTURE0+z);const ge=at.getPrimaries(at.workingColorSpace),Fe=T.colorSpace===Ln?null:at.getPrimaries(T.colorSpace),Re=T.colorSpace===Ln||ge===Fe?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,T.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,T.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re);let se=g(T.image,!1,i.maxTextureSize);se=be(T,se);const ae=s.convert(T.format,T.colorSpace),He=s.convert(T.type);let ze=y(T.internalFormat,ae,He,T.colorSpace,T.isVideoTexture);Ae(ee,T);let Se;const Ve=T.mipmaps,k=T.isVideoTexture!==!0,ve=Ce.__version===void 0||ie===!0,de=j.dataReady,fe=C(T,se);if(T.isDepthTexture)ze=E(T.format===qi,T.type),ve&&(k?t.texStorage2D(r.TEXTURE_2D,1,ze,se.width,se.height):t.texImage2D(r.TEXTURE_2D,0,ze,se.width,se.height,0,ae,He,null));else if(T.isDataTexture)if(Ve.length>0){k&&ve&&t.texStorage2D(r.TEXTURE_2D,fe,ze,Ve[0].width,Ve[0].height);for(let re=0,ne=Ve.length;re<ne;re++)Se=Ve[re],k?de&&t.texSubImage2D(r.TEXTURE_2D,re,0,0,Se.width,Se.height,ae,He,Se.data):t.texImage2D(r.TEXTURE_2D,re,ze,Se.width,Se.height,0,ae,He,Se.data);T.generateMipmaps=!1}else k?(ve&&t.texStorage2D(r.TEXTURE_2D,fe,ze,se.width,se.height),de&&Xe(T,se,ae,He)):t.texImage2D(r.TEXTURE_2D,0,ze,se.width,se.height,0,ae,He,se.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){k&&ve&&t.texStorage3D(r.TEXTURE_2D_ARRAY,fe,ze,Ve[0].width,Ve[0].height,se.depth);for(let re=0,ne=Ve.length;re<ne;re++)if(Se=Ve[re],T.format!==cn)if(ae!==null)if(k){if(de)if(T.layerUpdates.size>0){const Ee=wa(Se.width,Se.height,T.format,T.type);for(const Ye of T.layerUpdates){const vt=Se.data.subarray(Ye*Ee/Se.data.BYTES_PER_ELEMENT,(Ye+1)*Ee/Se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,re,0,0,Ye,Se.width,Se.height,1,ae,vt)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,re,0,0,0,Se.width,Se.height,se.depth,ae,Se.data)}else t.compressedTexImage3D(r.TEXTURE_2D_ARRAY,re,ze,Se.width,Se.height,se.depth,0,Se.data,0,0);else $e("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else k?de&&t.texSubImage3D(r.TEXTURE_2D_ARRAY,re,0,0,0,Se.width,Se.height,se.depth,ae,He,Se.data):t.texImage3D(r.TEXTURE_2D_ARRAY,re,ze,Se.width,Se.height,se.depth,0,ae,He,Se.data)}else{k&&ve&&t.texStorage2D(r.TEXTURE_2D,fe,ze,Ve[0].width,Ve[0].height);for(let re=0,ne=Ve.length;re<ne;re++)Se=Ve[re],T.format!==cn?ae!==null?k?de&&t.compressedTexSubImage2D(r.TEXTURE_2D,re,0,0,Se.width,Se.height,ae,Se.data):t.compressedTexImage2D(r.TEXTURE_2D,re,ze,Se.width,Se.height,0,Se.data):$e("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):k?de&&t.texSubImage2D(r.TEXTURE_2D,re,0,0,Se.width,Se.height,ae,He,Se.data):t.texImage2D(r.TEXTURE_2D,re,ze,Se.width,Se.height,0,ae,He,Se.data)}else if(T.isDataArrayTexture)if(k){if(ve&&t.texStorage3D(r.TEXTURE_2D_ARRAY,fe,ze,se.width,se.height,se.depth),de)if(T.layerUpdates.size>0){const re=wa(se.width,se.height,T.format,T.type);for(const ne of T.layerUpdates){const Ee=se.data.subarray(ne*re/se.data.BYTES_PER_ELEMENT,(ne+1)*re/se.data.BYTES_PER_ELEMENT);t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,ne,se.width,se.height,1,ae,He,Ee)}T.clearLayerUpdates()}else t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,se.width,se.height,se.depth,ae,He,se.data)}else t.texImage3D(r.TEXTURE_2D_ARRAY,0,ze,se.width,se.height,se.depth,0,ae,He,se.data);else if(T.isData3DTexture)k?(ve&&t.texStorage3D(r.TEXTURE_3D,fe,ze,se.width,se.height,se.depth),de&&t.texSubImage3D(r.TEXTURE_3D,0,0,0,0,se.width,se.height,se.depth,ae,He,se.data)):t.texImage3D(r.TEXTURE_3D,0,ze,se.width,se.height,se.depth,0,ae,He,se.data);else if(T.isFramebufferTexture){if(ve)if(k)t.texStorage2D(r.TEXTURE_2D,fe,ze,se.width,se.height);else{let re=se.width,ne=se.height;for(let Ee=0;Ee<fe;Ee++)t.texImage2D(r.TEXTURE_2D,Ee,ze,re,ne,0,ae,He,null),re>>=1,ne>>=1}}else if(Ve.length>0){if(k&&ve){const re=Pe(Ve[0]);t.texStorage2D(r.TEXTURE_2D,fe,ze,re.width,re.height)}for(let re=0,ne=Ve.length;re<ne;re++)Se=Ve[re],k?de&&t.texSubImage2D(r.TEXTURE_2D,re,0,0,ae,He,Se):t.texImage2D(r.TEXTURE_2D,re,ze,ae,He,Se);T.generateMipmaps=!1}else if(k){if(ve){const re=Pe(se);t.texStorage2D(r.TEXTURE_2D,fe,ze,re.width,re.height)}de&&t.texSubImage2D(r.TEXTURE_2D,0,0,0,ae,He,se)}else t.texImage2D(r.TEXTURE_2D,0,ze,ae,He,se);m(T)&&p(ee),Ce.__version=j.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function te(D,T,z){if(T.image.length!==6)return;const ee=ke(D,T),ie=T.source;t.bindTexture(r.TEXTURE_CUBE_MAP,D.__webglTexture,r.TEXTURE0+z);const j=n.get(ie);if(ie.version!==j.__version||ee===!0){t.activeTexture(r.TEXTURE0+z);const Ce=at.getPrimaries(at.workingColorSpace),ge=T.colorSpace===Ln?null:at.getPrimaries(T.colorSpace),Fe=T.colorSpace===Ln||Ce===ge?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,T.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,T.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe);const Re=T.isCompressedTexture||T.image[0].isCompressedTexture,se=T.image[0]&&T.image[0].isDataTexture,ae=[];for(let ne=0;ne<6;ne++)!Re&&!se?ae[ne]=g(T.image[ne],!0,i.maxCubemapSize):ae[ne]=se?T.image[ne].image:T.image[ne],ae[ne]=be(T,ae[ne]);const He=ae[0],ze=s.convert(T.format,T.colorSpace),Se=s.convert(T.type),Ve=y(T.internalFormat,ze,Se,T.colorSpace),k=T.isVideoTexture!==!0,ve=j.__version===void 0||ee===!0,de=ie.dataReady;let fe=C(T,He);Ae(r.TEXTURE_CUBE_MAP,T);let re;if(Re){k&&ve&&t.texStorage2D(r.TEXTURE_CUBE_MAP,fe,Ve,He.width,He.height);for(let ne=0;ne<6;ne++){re=ae[ne].mipmaps;for(let Ee=0;Ee<re.length;Ee++){const Ye=re[Ee];T.format!==cn?ze!==null?k?de&&t.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee,0,0,Ye.width,Ye.height,ze,Ye.data):t.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee,Ve,Ye.width,Ye.height,0,Ye.data):$e("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee,0,0,Ye.width,Ye.height,ze,Se,Ye.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee,Ve,Ye.width,Ye.height,0,ze,Se,Ye.data)}}}else{if(re=T.mipmaps,k&&ve){re.length>0&&fe++;const ne=Pe(ae[0]);t.texStorage2D(r.TEXTURE_CUBE_MAP,fe,Ve,ne.width,ne.height)}for(let ne=0;ne<6;ne++)if(se){k?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,ae[ne].width,ae[ne].height,ze,Se,ae[ne].data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,Ve,ae[ne].width,ae[ne].height,0,ze,Se,ae[ne].data);for(let Ee=0;Ee<re.length;Ee++){const vt=re[Ee].image[ne].image;k?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee+1,0,0,vt.width,vt.height,ze,Se,vt.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee+1,Ve,vt.width,vt.height,0,ze,Se,vt.data)}}else{k?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,ze,Se,ae[ne]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,Ve,ze,Se,ae[ne]);for(let Ee=0;Ee<re.length;Ee++){const Ye=re[Ee];k?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee+1,0,0,ze,Se,Ye.image[ne]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ee+1,Ve,ze,Se,Ye.image[ne])}}}m(T)&&p(r.TEXTURE_CUBE_MAP),j.__version=ie.version,T.onUpdate&&T.onUpdate(T)}D.__version=T.version}function pe(D,T,z,ee,ie,j){const Ce=s.convert(z.format,z.colorSpace),ge=s.convert(z.type),Fe=y(z.internalFormat,Ce,ge,z.colorSpace),Re=n.get(T),se=n.get(z);if(se.__renderTarget=T,!Re.__hasExternalTextures){const ae=Math.max(1,T.width>>j),He=Math.max(1,T.height>>j);ie===r.TEXTURE_3D||ie===r.TEXTURE_2D_ARRAY?t.texImage3D(ie,j,Fe,ae,He,T.depth,0,Ce,ge,null):t.texImage2D(ie,j,Fe,ae,He,0,Ce,ge,null)}t.bindFramebuffer(r.FRAMEBUFFER,D),me(T)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,ee,ie,se.__webglTexture,0,qe(T)):(ie===r.TEXTURE_2D||ie>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&ie<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,ee,ie,se.__webglTexture,j),t.bindFramebuffer(r.FRAMEBUFFER,null)}function ce(D,T,z){if(r.bindRenderbuffer(r.RENDERBUFFER,D),T.depthBuffer){const ee=T.depthTexture,ie=ee&&ee.isDepthTexture?ee.type:null,j=E(T.stencilBuffer,ie),Ce=T.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ge=qe(T);me(T)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,ge,j,T.width,T.height):z?r.renderbufferStorageMultisample(r.RENDERBUFFER,ge,j,T.width,T.height):r.renderbufferStorage(r.RENDERBUFFER,j,T.width,T.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,Ce,r.RENDERBUFFER,D)}else{const ee=T.textures;for(let ie=0;ie<ee.length;ie++){const j=ee[ie],Ce=s.convert(j.format,j.colorSpace),ge=s.convert(j.type),Fe=y(j.internalFormat,Ce,ge,j.colorSpace),Re=qe(T);z&&me(T)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,Re,Fe,T.width,T.height):me(T)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Re,Fe,T.width,T.height):r.renderbufferStorage(r.RENDERBUFFER,Fe,T.width,T.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function oe(D,T){if(T&&T.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(r.FRAMEBUFFER,D),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ee=n.get(T.depthTexture);ee.__renderTarget=T,(!ee.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),q(T.depthTexture,0);const ie=ee.__webglTexture,j=qe(T);if(T.depthTexture.format===yi)me(T)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,ie,0,j):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,ie,0);else if(T.depthTexture.format===qi)me(T)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,ie,0,j):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,ie,0);else throw new Error("Unknown depthTexture format")}function le(D){const T=n.get(D),z=D.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==D.depthTexture){const ee=D.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),ee){const ie=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,ee.removeEventListener("dispose",ie)};ee.addEventListener("dispose",ie),T.__depthDisposeCallback=ie}T.__boundDepthTexture=ee}if(D.depthTexture&&!T.__autoAllocateDepthBuffer){if(z)throw new Error("target.depthTexture not supported in Cube render targets");const ee=D.texture.mipmaps;ee&&ee.length>0?oe(T.__webglFramebuffer[0],D):oe(T.__webglFramebuffer,D)}else if(z){T.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)if(t.bindFramebuffer(r.FRAMEBUFFER,T.__webglFramebuffer[ee]),T.__webglDepthbuffer[ee]===void 0)T.__webglDepthbuffer[ee]=r.createRenderbuffer(),ce(T.__webglDepthbuffer[ee],D,!1);else{const ie=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,j=T.__webglDepthbuffer[ee];r.bindRenderbuffer(r.RENDERBUFFER,j),r.framebufferRenderbuffer(r.FRAMEBUFFER,ie,r.RENDERBUFFER,j)}}else{const ee=D.texture.mipmaps;if(ee&&ee.length>0?t.bindFramebuffer(r.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(r.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=r.createRenderbuffer(),ce(T.__webglDepthbuffer,D,!1);else{const ie=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,j=T.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,j),r.framebufferRenderbuffer(r.FRAMEBUFFER,ie,r.RENDERBUFFER,j)}}t.bindFramebuffer(r.FRAMEBUFFER,null)}function je(D,T,z){const ee=n.get(D);T!==void 0&&pe(ee.__webglFramebuffer,D,D.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),z!==void 0&&le(D)}function De(D){const T=D.texture,z=n.get(D),ee=n.get(T);D.addEventListener("dispose",A);const ie=D.textures,j=D.isWebGLCubeRenderTarget===!0,Ce=ie.length>1;if(Ce||(ee.__webglTexture===void 0&&(ee.__webglTexture=r.createTexture()),ee.__version=T.version,o.memory.textures++),j){z.__webglFramebuffer=[];for(let ge=0;ge<6;ge++)if(T.mipmaps&&T.mipmaps.length>0){z.__webglFramebuffer[ge]=[];for(let Fe=0;Fe<T.mipmaps.length;Fe++)z.__webglFramebuffer[ge][Fe]=r.createFramebuffer()}else z.__webglFramebuffer[ge]=r.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){z.__webglFramebuffer=[];for(let ge=0;ge<T.mipmaps.length;ge++)z.__webglFramebuffer[ge]=r.createFramebuffer()}else z.__webglFramebuffer=r.createFramebuffer();if(Ce)for(let ge=0,Fe=ie.length;ge<Fe;ge++){const Re=n.get(ie[ge]);Re.__webglTexture===void 0&&(Re.__webglTexture=r.createTexture(),o.memory.textures++)}if(D.samples>0&&me(D)===!1){z.__webglMultisampledFramebuffer=r.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(r.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let ge=0;ge<ie.length;ge++){const Fe=ie[ge];z.__webglColorRenderbuffer[ge]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,z.__webglColorRenderbuffer[ge]);const Re=s.convert(Fe.format,Fe.colorSpace),se=s.convert(Fe.type),ae=y(Fe.internalFormat,Re,se,Fe.colorSpace,D.isXRRenderTarget===!0),He=qe(D);r.renderbufferStorageMultisample(r.RENDERBUFFER,He,ae,D.width,D.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+ge,r.RENDERBUFFER,z.__webglColorRenderbuffer[ge])}r.bindRenderbuffer(r.RENDERBUFFER,null),D.depthBuffer&&(z.__webglDepthRenderbuffer=r.createRenderbuffer(),ce(z.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(r.FRAMEBUFFER,null)}}if(j){t.bindTexture(r.TEXTURE_CUBE_MAP,ee.__webglTexture),Ae(r.TEXTURE_CUBE_MAP,T);for(let ge=0;ge<6;ge++)if(T.mipmaps&&T.mipmaps.length>0)for(let Fe=0;Fe<T.mipmaps.length;Fe++)pe(z.__webglFramebuffer[ge][Fe],D,T,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ge,Fe);else pe(z.__webglFramebuffer[ge],D,T,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0);m(T)&&p(r.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ce){for(let ge=0,Fe=ie.length;ge<Fe;ge++){const Re=ie[ge],se=n.get(Re);let ae=r.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ae=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(ae,se.__webglTexture),Ae(ae,Re),pe(z.__webglFramebuffer,D,Re,r.COLOR_ATTACHMENT0+ge,ae,0),m(Re)&&p(ae)}t.unbindTexture()}else{let ge=r.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(ge=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(ge,ee.__webglTexture),Ae(ge,T),T.mipmaps&&T.mipmaps.length>0)for(let Fe=0;Fe<T.mipmaps.length;Fe++)pe(z.__webglFramebuffer[Fe],D,T,r.COLOR_ATTACHMENT0,ge,Fe);else pe(z.__webglFramebuffer,D,T,r.COLOR_ATTACHMENT0,ge,0);m(T)&&p(ge),t.unbindTexture()}D.depthBuffer&&le(D)}function tt(D){const T=D.textures;for(let z=0,ee=T.length;z<ee;z++){const ie=T[z];if(m(ie)){const j=_(D),Ce=n.get(ie).__webglTexture;t.bindTexture(j,Ce),p(j),t.unbindTexture()}}}const O=[],Ie=[];function Ne(D){if(D.samples>0){if(me(D)===!1){const T=D.textures,z=D.width,ee=D.height;let ie=r.COLOR_BUFFER_BIT;const j=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,Ce=n.get(D),ge=T.length>1;if(ge)for(let Re=0;Re<T.length;Re++)t.bindFramebuffer(r.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Re,r.RENDERBUFFER,null),t.bindFramebuffer(r.FRAMEBUFFER,Ce.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Re,r.TEXTURE_2D,null,0);t.bindFramebuffer(r.READ_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer);const Fe=D.texture.mipmaps;Fe&&Fe.length>0?t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer[0]):t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer);for(let Re=0;Re<T.length;Re++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(ie|=r.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(ie|=r.STENCIL_BUFFER_BIT)),ge){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,Ce.__webglColorRenderbuffer[Re]);const se=n.get(T[Re]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,se,0)}r.blitFramebuffer(0,0,z,ee,0,0,z,ee,ie,r.NEAREST),l===!0&&(O.length=0,Ie.length=0,O.push(r.COLOR_ATTACHMENT0+Re),D.depthBuffer&&D.resolveDepthBuffer===!1&&(O.push(j),Ie.push(j),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,Ie)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,O))}if(t.bindFramebuffer(r.READ_FRAMEBUFFER,null),t.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),ge)for(let Re=0;Re<T.length;Re++){t.bindFramebuffer(r.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Re,r.RENDERBUFFER,Ce.__webglColorRenderbuffer[Re]);const se=n.get(T[Re]).__webglTexture;t.bindFramebuffer(r.FRAMEBUFFER,Ce.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Re,r.TEXTURE_2D,se,0)}t.bindFramebuffer(r.DRAW_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const T=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[T])}}}function qe(D){return Math.min(i.maxSamples,D.samples)}function me(D){const T=n.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function it(D){const T=o.render.frame;h.get(D)!==T&&(h.set(D,T),D.update())}function be(D,T){const z=D.colorSpace,ee=D.format,ie=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||z!==Si&&z!==Ln&&(at.getTransfer(z)===dt?(ee!==cn||ie!==pn)&&$e("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):At("WebGLTextures: Unsupported texture color space:",z)),T}function Pe(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=F,this.resetTextureUnits=N,this.setTexture2D=q,this.setTexture2DArray=H,this.setTexture3D=Z,this.setTextureCube=W,this.rebindTextures=je,this.setupRenderTarget=De,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=Ne,this.setupDepthRenderbuffer=le,this.setupFrameBufferTexture=pe,this.useMultisampledRTT=me}function sm(r,e){function t(n,i=Ln){let s;const o=at.getTransfer(i);if(n===pn)return r.UNSIGNED_BYTE;if(n===Io)return r.UNSIGNED_SHORT_4_4_4_4;if(n===Do)return r.UNSIGNED_SHORT_5_5_5_1;if(n===ul)return r.UNSIGNED_INT_5_9_9_9_REV;if(n===dl)return r.UNSIGNED_INT_10F_11F_11F_REV;if(n===cl)return r.BYTE;if(n===hl)return r.SHORT;if(n===Wi)return r.UNSIGNED_SHORT;if(n===wo)return r.INT;if(n===Un)return r.UNSIGNED_INT;if(n===bn)return r.FLOAT;if(n===Mi)return r.HALF_FLOAT;if(n===fl)return r.ALPHA;if(n===pl)return r.RGB;if(n===cn)return r.RGBA;if(n===yi)return r.DEPTH_COMPONENT;if(n===qi)return r.DEPTH_STENCIL;if(n===ml)return r.RED;if(n===Po)return r.RED_INTEGER;if(n===Lo)return r.RG;if(n===Oo)return r.RG_INTEGER;if(n===No)return r.RGBA_INTEGER;if(n===ws||n===Is||n===Ds||n===Ps)if(o===dt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===ws)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Is)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ds)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ps)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===ws)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Is)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ds)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ps)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Yr||n===$r||n===Kr||n===jr)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===Yr)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===$r)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Kr)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===jr)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Jr||n===Zr||n===Qr)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Jr||n===Zr)return o===dt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===Qr)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===eo||n===to||n===no||n===io||n===so||n===ro||n===oo||n===ao||n===lo||n===co||n===ho||n===uo||n===fo||n===po)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===eo)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===to)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===no)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===io)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===so)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ro)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===oo)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ao)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===lo)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===co)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ho)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===uo)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===fo)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===po)return o===dt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===mo||n===go||n===xo)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===mo)return o===dt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===go)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===xo)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===vo||n===_o||n===yo||n===So)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===vo)return s.COMPRESSED_RED_RGTC1_EXT;if(n===_o)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===yo)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===So)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Vi?r.UNSIGNED_INT_24_8:r[n]!==void 0?r[n]:null}return{convert:t}}const rm=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,om=`
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

}`;class am{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Rl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ct({vertexShader:rm,fragmentShader:om,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Le(new qs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class lm extends Ai{constructor(e,t){super();const n=this;let i=null,s=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,x=null;const g=typeof XRWebGLBinding<"u",m=new am,p={},_=t.getContextAttributes();let y=null,E=null;const C=[],v=[],A=new rt;let L=null;const b=new Jt;b.viewport=new ft;const S=new Jt;S.viewport=new ft;const w=[b,S],N=new Eh;let F=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let te=C[Q];return te===void 0&&(te=new br,C[Q]=te),te.getTargetRaySpace()},this.getControllerGrip=function(Q){let te=C[Q];return te===void 0&&(te=new br,C[Q]=te),te.getGripSpace()},this.getHand=function(Q){let te=C[Q];return te===void 0&&(te=new br,C[Q]=te),te.getHandSpace()};function q(Q){const te=v.indexOf(Q.inputSource);if(te===-1)return;const pe=C[te];pe!==void 0&&(pe.update(Q.inputSource,Q.frame,c||o),pe.dispatchEvent({type:Q.type,data:Q.inputSource}))}function H(){i.removeEventListener("select",q),i.removeEventListener("selectstart",q),i.removeEventListener("selectend",q),i.removeEventListener("squeeze",q),i.removeEventListener("squeezestart",q),i.removeEventListener("squeezeend",q),i.removeEventListener("end",H),i.removeEventListener("inputsourceschange",Z);for(let Q=0;Q<C.length;Q++){const te=v[Q];te!==null&&(v[Q]=null,C[Q].disconnect(te))}F=null,B=null,m.reset();for(const Q in p)delete p[Q];e.setRenderTarget(y),f=null,d=null,u=null,i=null,E=null,Xe.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){s=Q,n.isPresenting===!0&&$e("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&$e("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&g&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return x},this.getSession=function(){return i},this.setSession=async function(Q){if(i=Q,i!==null){if(y=e.getRenderTarget(),i.addEventListener("select",q),i.addEventListener("selectstart",q),i.addEventListener("selectend",q),i.addEventListener("squeeze",q),i.addEventListener("squeezestart",q),i.addEventListener("squeezeend",q),i.addEventListener("end",H),i.addEventListener("inputsourceschange",Z),_.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(A),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let pe=null,ce=null,oe=null;_.depth&&(oe=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,pe=_.stencil?qi:yi,ce=_.stencil?Vi:Un);const le={colorFormat:t.RGBA8,depthFormat:oe,scaleFactor:s};u=this.getBinding(),d=u.createProjectionLayer(le),i.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),E=new kn(d.textureWidth,d.textureHeight,{format:cn,type:pn,depthTexture:new zo(d.textureWidth,d.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,pe),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const pe={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,pe),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),E=new kn(f.framebufferWidth,f.framebufferHeight,{format:cn,type:pn,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),Xe.setContext(i),Xe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function Z(Q){for(let te=0;te<Q.removed.length;te++){const pe=Q.removed[te],ce=v.indexOf(pe);ce>=0&&(v[ce]=null,C[ce].disconnect(pe))}for(let te=0;te<Q.added.length;te++){const pe=Q.added[te];let ce=v.indexOf(pe);if(ce===-1){for(let le=0;le<C.length;le++)if(le>=v.length){v.push(pe),ce=le;break}else if(v[le]===null){v[le]=pe,ce=le;break}if(ce===-1)break}const oe=C[ce];oe&&oe.connect(pe)}}const W=new P,J=new P;function K(Q,te,pe){W.setFromMatrixPosition(te.matrixWorld),J.setFromMatrixPosition(pe.matrixWorld);const ce=W.distanceTo(J),oe=te.projectionMatrix.elements,le=pe.projectionMatrix.elements,je=oe[14]/(oe[10]-1),De=oe[14]/(oe[10]+1),tt=(oe[9]+1)/oe[5],O=(oe[9]-1)/oe[5],Ie=(oe[8]-1)/oe[0],Ne=(le[8]+1)/le[0],qe=je*Ie,me=je*Ne,it=ce/(-Ie+Ne),be=it*-Ie;if(te.matrixWorld.decompose(Q.position,Q.quaternion,Q.scale),Q.translateX(be),Q.translateZ(it),Q.matrixWorld.compose(Q.position,Q.quaternion,Q.scale),Q.matrixWorldInverse.copy(Q.matrixWorld).invert(),oe[10]===-1)Q.projectionMatrix.copy(te.projectionMatrix),Q.projectionMatrixInverse.copy(te.projectionMatrixInverse);else{const Pe=je+it,D=De+it,T=qe-be,z=me+(ce-be),ee=tt*De/D*Pe,ie=O*De/D*Pe;Q.projectionMatrix.makePerspective(T,z,ee,ie,Pe,D),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert()}}function he(Q,te){te===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(te.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(i===null)return;let te=Q.near,pe=Q.far;m.texture!==null&&(m.depthNear>0&&(te=m.depthNear),m.depthFar>0&&(pe=m.depthFar)),N.near=S.near=b.near=te,N.far=S.far=b.far=pe,(F!==N.near||B!==N.far)&&(i.updateRenderState({depthNear:N.near,depthFar:N.far}),F=N.near,B=N.far),N.layers.mask=Q.layers.mask|6,b.layers.mask=N.layers.mask&3,S.layers.mask=N.layers.mask&5;const ce=Q.parent,oe=N.cameras;he(N,ce);for(let le=0;le<oe.length;le++)he(oe[le],ce);oe.length===2?K(N,b,S):N.projectionMatrix.copy(b.projectionMatrix),Ae(Q,N,ce)};function Ae(Q,te,pe){pe===null?Q.matrix.copy(te.matrixWorld):(Q.matrix.copy(pe.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(te.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(te.projectionMatrix),Q.projectionMatrixInverse.copy(te.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=bo*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return N},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(Q){l=Q,d!==null&&(d.fixedFoveation=Q),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Q)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(N)},this.getCameraTexture=function(Q){return p[Q]};let ke=null;function Ke(Q,te){if(h=te.getViewerPose(c||o),x=te,h!==null){const pe=h.views;f!==null&&(e.setRenderTargetFramebuffer(E,f.framebuffer),e.setRenderTarget(E));let ce=!1;pe.length!==N.cameras.length&&(N.cameras.length=0,ce=!0);for(let De=0;De<pe.length;De++){const tt=pe[De];let O=null;if(f!==null)O=f.getViewport(tt);else{const Ne=u.getViewSubImage(d,tt);O=Ne.viewport,De===0&&(e.setRenderTargetTextures(E,Ne.colorTexture,Ne.depthStencilTexture),e.setRenderTarget(E))}let Ie=w[De];Ie===void 0&&(Ie=new Jt,Ie.layers.enable(De),Ie.viewport=new ft,w[De]=Ie),Ie.matrix.fromArray(tt.transform.matrix),Ie.matrix.decompose(Ie.position,Ie.quaternion,Ie.scale),Ie.projectionMatrix.fromArray(tt.projectionMatrix),Ie.projectionMatrixInverse.copy(Ie.projectionMatrix).invert(),Ie.viewport.set(O.x,O.y,O.width,O.height),De===0&&(N.matrix.copy(Ie.matrix),N.matrix.decompose(N.position,N.quaternion,N.scale)),ce===!0&&N.cameras.push(Ie)}const oe=i.enabledFeatures;if(oe&&oe.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&g){u=n.getBinding();const De=u.getDepthInformation(pe[0]);De&&De.isValid&&De.texture&&m.init(De,i.renderState)}if(oe&&oe.includes("camera-access")&&g){e.state.unbindTexture(),u=n.getBinding();for(let De=0;De<pe.length;De++){const tt=pe[De].camera;if(tt){let O=p[tt];O||(O=new Rl,p[tt]=O);const Ie=u.getCameraImage(tt);O.sourceTexture=Ie}}}}for(let pe=0;pe<C.length;pe++){const ce=v[pe],oe=C[pe];ce!==null&&oe!==void 0&&oe.update(ce,te,c||o)}ke&&ke(Q,te),te.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:te}),x=null}const Xe=new Il;Xe.setAnimationLoop(Ke),this.setAnimationLoop=function(Q){ke=Q},this.dispose=function(){}}}const Xn=new hn,cm=new pt;function hm(r,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Tl(r)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function i(m,p,_,y,E){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),u(m,p)):p.isMeshPhongMaterial?(s(m,p),h(m,p)):p.isMeshStandardMaterial?(s(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,E)):p.isMeshMatcapMaterial?(s(m,p),x(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),g(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,_,y):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Bt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Bt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const _=e.get(p),y=_.envMap,E=_.envMapRotation;y&&(m.envMap.value=y,Xn.copy(E),Xn.x*=-1,Xn.y*=-1,Xn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Xn.y*=-1,Xn.z*=-1),m.envMapRotation.value.setFromMatrix4(cm.makeRotationFromEuler(Xn)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,_,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*_,m.scale.value=y*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,_){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Bt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=_.texture,m.transmissionSamplerSize.value.set(_.width,_.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function x(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){const _=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(_.matrixWorld),m.nearDistance.value=_.shadow.camera.near,m.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function um(r,e,t,n){let i={},s={},o=[];const a=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,y){const E=y.program;n.uniformBlockBinding(_,E)}function c(_,y){let E=i[_.id];E===void 0&&(x(_),E=h(_),i[_.id]=E,_.addEventListener("dispose",m));const C=y.program;n.updateUBOMapping(_,C);const v=e.render.frame;s[_.id]!==v&&(d(_),s[_.id]=v)}function h(_){const y=u();_.__bindingPointIndex=y;const E=r.createBuffer(),C=_.__size,v=_.usage;return r.bindBuffer(r.UNIFORM_BUFFER,E),r.bufferData(r.UNIFORM_BUFFER,C,v),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,y,E),E}function u(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return At("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){const y=i[_.id],E=_.uniforms,C=_.__cache;r.bindBuffer(r.UNIFORM_BUFFER,y);for(let v=0,A=E.length;v<A;v++){const L=Array.isArray(E[v])?E[v]:[E[v]];for(let b=0,S=L.length;b<S;b++){const w=L[b];if(f(w,v,b,C)===!0){const N=w.__offset,F=Array.isArray(w.value)?w.value:[w.value];let B=0;for(let q=0;q<F.length;q++){const H=F[q],Z=g(H);typeof H=="number"||typeof H=="boolean"?(w.__data[0]=H,r.bufferSubData(r.UNIFORM_BUFFER,N+B,w.__data)):H.isMatrix3?(w.__data[0]=H.elements[0],w.__data[1]=H.elements[1],w.__data[2]=H.elements[2],w.__data[3]=0,w.__data[4]=H.elements[3],w.__data[5]=H.elements[4],w.__data[6]=H.elements[5],w.__data[7]=0,w.__data[8]=H.elements[6],w.__data[9]=H.elements[7],w.__data[10]=H.elements[8],w.__data[11]=0):(H.toArray(w.__data,B),B+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,N,w.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(_,y,E,C){const v=_.value,A=y+"_"+E;if(C[A]===void 0)return typeof v=="number"||typeof v=="boolean"?C[A]=v:C[A]=v.clone(),!0;{const L=C[A];if(typeof v=="number"||typeof v=="boolean"){if(L!==v)return C[A]=v,!0}else if(L.equals(v)===!1)return L.copy(v),!0}return!1}function x(_){const y=_.uniforms;let E=0;const C=16;for(let A=0,L=y.length;A<L;A++){const b=Array.isArray(y[A])?y[A]:[y[A]];for(let S=0,w=b.length;S<w;S++){const N=b[S],F=Array.isArray(N.value)?N.value:[N.value];for(let B=0,q=F.length;B<q;B++){const H=F[B],Z=g(H),W=E%C,J=W%Z.boundary,K=W+J;E+=J,K!==0&&C-K<Z.storage&&(E+=C-K),N.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),N.__offset=E,E+=Z.storage}}}const v=E%C;return v>0&&(E+=C-v),_.__size=E,_.__cache={},this}function g(_){const y={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(y.boundary=4,y.storage=4):_.isVector2?(y.boundary=8,y.storage=8):_.isVector3||_.isColor?(y.boundary=16,y.storage=12):_.isVector4?(y.boundary=16,y.storage=16):_.isMatrix3?(y.boundary=48,y.storage=48):_.isMatrix4?(y.boundary=64,y.storage=64):_.isTexture?$e("WebGLRenderer: Texture samplers can not be part of an uniforms group."):$e("WebGLRenderer: Unsupported uniform value type.",_),y}function m(_){const y=_.target;y.removeEventListener("dispose",m);const E=o.indexOf(y.__bindingPointIndex);o.splice(E,1),r.deleteBuffer(i[y.id]),delete i[y.id],delete s[y.id]}function p(){for(const _ in i)r.deleteBuffer(i[_]);o=[],i={},s={}}return{bind:l,update:c,dispose:p}}const dm=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let yn=null;function fm(){return yn===null&&(yn=new ah(dm,32,32,Lo,Mi),yn.minFilter=tn,yn.magFilter=tn,yn.wrapS=Nt,yn.wrapT=Nt,yn.generateMipmaps=!1,yn.needsUpdate=!0),yn}class pm{constructor(e={}){const{canvas:t=Lc(),context:n=null,depth:i=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const x=new Set([No,Oo,Po]),g=new Set([pn,Un,Wi,Vi,Io,Do]),m=new Uint32Array(4),p=new Int32Array(4);let _=null,y=null;const E=[],C=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Nn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const v=this;let A=!1;this._outputColorSpace=en;let L=0,b=0,S=null,w=-1,N=null;const F=new ft,B=new ft;let q=null;const H=new we(0);let Z=0,W=t.width,J=t.height,K=1,he=null,Ae=null;const ke=new ft(0,0,W,J),Ke=new ft(0,0,W,J);let Xe=!1;const Q=new Zi;let te=!1,pe=!1;const ce=new pt,oe=new P,le=new ft,je={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let De=!1;function tt(){return S===null?K:1}let O=n;function Ie(R,G){return t.getContext(R,G)}try{const R={alpha:!0,depth:i,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ro}`),t.addEventListener("webglcontextlost",re,!1),t.addEventListener("webglcontextrestored",ne,!1),t.addEventListener("webglcontextcreationerror",Ee,!1),O===null){const G="webgl2";if(O=Ie(G,R),O===null)throw Ie(G)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw R("WebGLRenderer: "+R.message),R}let Ne,qe,me,it,be,Pe,D,T,z,ee,ie,j,Ce,ge,Fe,Re,se,ae,He,ze,Se,Ve,k,ve;function de(){Ne=new bf(O),Ne.init(),Ve=new sm(O,Ne),qe=new ff(O,Ne,e,Ve),me=new nm(O,Ne),qe.reversedDepthBuffer&&d&&me.buffers.depth.setReversed(!0),it=new Mf(O),be=new Wp,Pe=new im(O,Ne,me,be,qe,Ve,it),D=new mf(v),T=new Sf(v),z=new Ch(O),k=new uf(O,z),ee=new Tf(O,z,it,k),ie=new Rf(O,ee,z,it),He=new Af(O,qe,Pe),Re=new pf(be),j=new Hp(v,D,T,Ne,qe,k,Re),Ce=new hm(v,be),ge=new qp,Fe=new Jp(Ne),ae=new hf(v,D,T,me,ie,f,l),se=new em(v,ie,qe),ve=new um(O,it,qe,me),ze=new df(O,Ne,it),Se=new Ef(O,Ne,it),it.programs=j.programs,v.capabilities=qe,v.extensions=Ne,v.properties=be,v.renderLists=ge,v.shadowMap=se,v.state=me,v.info=it}de();const fe=new lm(v,O);this.xr=fe,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const R=Ne.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=Ne.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return K},this.setPixelRatio=function(R){R!==void 0&&(K=R,this.setSize(W,J,!1))},this.getSize=function(R){return R.set(W,J)},this.setSize=function(R,G,Y=!0){if(fe.isPresenting){$e("WebGLRenderer: Can't change size while VR device is presenting.");return}W=R,J=G,t.width=Math.floor(R*K),t.height=Math.floor(G*K),Y===!0&&(t.style.width=R+"px",t.style.height=G+"px"),this.setViewport(0,0,R,G)},this.getDrawingBufferSize=function(R){return R.set(W*K,J*K).floor()},this.setDrawingBufferSize=function(R,G,Y){W=R,J=G,K=Y,t.width=Math.floor(R*Y),t.height=Math.floor(G*Y),this.setViewport(0,0,R,G)},this.getCurrentViewport=function(R){return R.copy(F)},this.getViewport=function(R){return R.copy(ke)},this.setViewport=function(R,G,Y,$){R.isVector4?ke.set(R.x,R.y,R.z,R.w):ke.set(R,G,Y,$),me.viewport(F.copy(ke).multiplyScalar(K).round())},this.getScissor=function(R){return R.copy(Ke)},this.setScissor=function(R,G,Y,$){R.isVector4?Ke.set(R.x,R.y,R.z,R.w):Ke.set(R,G,Y,$),me.scissor(B.copy(Ke).multiplyScalar(K).round())},this.getScissorTest=function(){return Xe},this.setScissorTest=function(R){me.setScissorTest(Xe=R)},this.setOpaqueSort=function(R){he=R},this.setTransparentSort=function(R){Ae=R},this.getClearColor=function(R){return R.copy(ae.getClearColor())},this.setClearColor=function(){ae.setClearColor(...arguments)},this.getClearAlpha=function(){return ae.getClearAlpha()},this.setClearAlpha=function(){ae.setClearAlpha(...arguments)},this.clear=function(R=!0,G=!0,Y=!0){let $=0;if(R){let V=!1;if(S!==null){const ue=S.texture.format;V=x.has(ue)}if(V){const ue=S.texture.type,ye=g.has(ue),Me=ae.getClearColor(),Te=ae.getClearAlpha(),Ge=Me.r,We=Me.g,Ue=Me.b;ye?(m[0]=Ge,m[1]=We,m[2]=Ue,m[3]=Te,O.clearBufferuiv(O.COLOR,0,m)):(p[0]=Ge,p[1]=We,p[2]=Ue,p[3]=Te,O.clearBufferiv(O.COLOR,0,p))}else $|=O.COLOR_BUFFER_BIT}G&&($|=O.DEPTH_BUFFER_BIT),Y&&($|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),O.clear($)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",re,!1),t.removeEventListener("webglcontextrestored",ne,!1),t.removeEventListener("webglcontextcreationerror",Ee,!1),ae.dispose(),ge.dispose(),Fe.dispose(),be.dispose(),D.dispose(),T.dispose(),ie.dispose(),k.dispose(),ve.dispose(),j.dispose(),fe.dispose(),fe.removeEventListener("sessionstart",Ho),fe.removeEventListener("sessionend",Wo),Bn.stop()};function re(R){R.preventDefault(),na("WebGLRenderer: Context Lost."),A=!0}function ne(){na("WebGLRenderer: Context Restored."),A=!1;const R=it.autoReset,G=se.enabled,Y=se.autoUpdate,$=se.needsUpdate,V=se.type;de(),it.autoReset=R,se.enabled=G,se.autoUpdate=Y,se.needsUpdate=$,se.type=V}function Ee(R){At("WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function Ye(R){const G=R.target;G.removeEventListener("dispose",Ye),vt(G)}function vt(R){ht(R),be.remove(R)}function ht(R){const G=be.get(R).programs;G!==void 0&&(G.forEach(function(Y){j.releaseProgram(Y)}),R.isShaderMaterial&&j.releaseShaderCache(R))}this.renderBufferDirect=function(R,G,Y,$,V,ue){G===null&&(G=je);const ye=V.isMesh&&V.matrixWorld.determinant()<0,Me=Bl(R,G,Y,$,V);me.setMaterial($,ye);let Te=Y.index,Ge=1;if($.wireframe===!0){if(Te=ee.getWireframeAttribute(Y),Te===void 0)return;Ge=2}const We=Y.drawRange,Ue=Y.attributes.position;let nt=We.start*Ge,ut=(We.start+We.count)*Ge;ue!==null&&(nt=Math.max(nt,ue.start*Ge),ut=Math.min(ut,(ue.start+ue.count)*Ge)),Te!==null?(nt=Math.max(nt,0),ut=Math.min(ut,Te.count)):Ue!=null&&(nt=Math.max(nt,0),ut=Math.min(ut,Ue.count));const Et=ut-nt;if(Et<0||Et===1/0)return;k.setup(V,$,Me,Y,Te);let Mt,mt=ze;if(Te!==null&&(Mt=z.get(Te),mt=Se,mt.setIndex(Mt)),V.isMesh)$.wireframe===!0?(me.setLineWidth($.wireframeLinewidth*tt()),mt.setMode(O.LINES)):mt.setMode(O.TRIANGLES);else if(V.isLine){let Be=$.linewidth;Be===void 0&&(Be=1),me.setLineWidth(Be*tt()),V.isLineSegments?mt.setMode(O.LINES):V.isLineLoop?mt.setMode(O.LINE_LOOP):mt.setMode(O.LINE_STRIP)}else V.isPoints?mt.setMode(O.POINTS):V.isSprite&&mt.setMode(O.TRIANGLES);if(V.isBatchedMesh)if(V._multiDrawInstances!==null)Yi("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),mt.renderMultiDrawInstances(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount,V._multiDrawInstances);else if(Ne.get("WEBGL_multi_draw"))mt.renderMultiDraw(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount);else{const Be=V._multiDrawStarts,bt=V._multiDrawCounts,ot=V._multiDrawCount,Yt=Te?z.get(Te).bytesPerElement:1,Qn=be.get($).currentProgram.getUniforms();for(let $t=0;$t<ot;$t++)Qn.setValue(O,"_gl_DrawID",$t),mt.render(Be[$t]/Yt,bt[$t])}else if(V.isInstancedMesh)mt.renderInstances(nt,Et,V.count);else if(Y.isInstancedBufferGeometry){const Be=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,bt=Math.min(Y.instanceCount,Be);mt.renderInstances(nt,Et,bt)}else mt.render(nt,Et)};function un(R,G,Y){R.transparent===!0&&R.side===Xt&&R.forceSinglePass===!1?(R.side=Bt,R.needsUpdate=!0,ts(R,G,Y),R.side=Fn,R.needsUpdate=!0,ts(R,G,Y),R.side=Xt):ts(R,G,Y)}this.compile=function(R,G,Y=null){Y===null&&(Y=R),y=Fe.get(Y),y.init(G),C.push(y),Y.traverseVisible(function(V){V.isLight&&V.layers.test(G.layers)&&(y.pushLight(V),V.castShadow&&y.pushShadow(V))}),R!==Y&&R.traverseVisible(function(V){V.isLight&&V.layers.test(G.layers)&&(y.pushLight(V),V.castShadow&&y.pushShadow(V))}),y.setupLights();const $=new Set;return R.traverse(function(V){if(!(V.isMesh||V.isPoints||V.isLine||V.isSprite))return;const ue=V.material;if(ue)if(Array.isArray(ue))for(let ye=0;ye<ue.length;ye++){const Me=ue[ye];un(Me,Y,V),$.add(Me)}else un(ue,Y,V),$.add(ue)}),y=C.pop(),$},this.compileAsync=function(R,G,Y=null){const $=this.compile(R,G,Y);return new Promise(V=>{function ue(){if($.forEach(function(ye){be.get(ye).currentProgram.isReady()&&$.delete(ye)}),$.size===0){V(R);return}setTimeout(ue,10)}Ne.get("KHR_parallel_shader_compile")!==null?ue():setTimeout(ue,10)})};let nn=null;function kl(R){nn&&nn(R)}function Ho(){Bn.stop()}function Wo(){Bn.start()}const Bn=new Il;Bn.setAnimationLoop(kl),typeof self<"u"&&Bn.setContext(self),this.setAnimationLoop=function(R){nn=R,fe.setAnimationLoop(R),R===null?Bn.stop():Bn.start()},fe.addEventListener("sessionstart",Ho),fe.addEventListener("sessionend",Wo),this.render=function(R,G){if(G!==void 0&&G.isCamera!==!0){At("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),G.parent===null&&G.matrixWorldAutoUpdate===!0&&G.updateMatrixWorld(),fe.enabled===!0&&fe.isPresenting===!0&&(fe.cameraAutoUpdate===!0&&fe.updateCamera(G),G=fe.getCamera()),R.isScene===!0&&R.onBeforeRender(v,R,G,S),y=Fe.get(R,C.length),y.init(G),C.push(y),ce.multiplyMatrices(G.projectionMatrix,G.matrixWorldInverse),Q.setFromProjectionMatrix(ce,fn,G.reversedDepth),pe=this.localClippingEnabled,te=Re.init(this.clippingPlanes,pe),_=ge.get(R,E.length),_.init(),E.push(_),fe.enabled===!0&&fe.isPresenting===!0){const ue=v.xr.getDepthSensingMesh();ue!==null&&Js(ue,G,-1/0,v.sortObjects)}Js(R,G,0,v.sortObjects),_.finish(),v.sortObjects===!0&&_.sort(he,Ae),De=fe.enabled===!1||fe.isPresenting===!1||fe.hasDepthSensing()===!1,De&&ae.addToRenderList(_,R),this.info.render.frame++,te===!0&&Re.beginShadows();const Y=y.state.shadowsArray;se.render(Y,R,G),te===!0&&Re.endShadows(),this.info.autoReset===!0&&this.info.reset();const $=_.opaque,V=_.transmissive;if(y.setupLights(),G.isArrayCamera){const ue=G.cameras;if(V.length>0)for(let ye=0,Me=ue.length;ye<Me;ye++){const Te=ue[ye];qo($,V,R,Te)}De&&ae.render(R);for(let ye=0,Me=ue.length;ye<Me;ye++){const Te=ue[ye];Vo(_,R,Te,Te.viewport)}}else V.length>0&&qo($,V,R,G),De&&ae.render(R),Vo(_,R,G);S!==null&&b===0&&(Pe.updateMultisampleRenderTarget(S),Pe.updateRenderTargetMipmap(S)),R.isScene===!0&&R.onAfterRender(v,R,G),k.resetDefaultState(),w=-1,N=null,C.pop(),C.length>0?(y=C[C.length-1],te===!0&&Re.setGlobalState(v.clippingPlanes,y.state.camera)):y=null,E.pop(),E.length>0?_=E[E.length-1]:_=null};function Js(R,G,Y,$){if(R.visible===!1)return;if(R.layers.test(G.layers)){if(R.isGroup)Y=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(G);else if(R.isLight)y.pushLight(R),R.castShadow&&y.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||Q.intersectsSprite(R)){$&&le.setFromMatrixPosition(R.matrixWorld).applyMatrix4(ce);const ye=ie.update(R),Me=R.material;Me.visible&&_.push(R,ye,Me,Y,le.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||Q.intersectsObject(R))){const ye=ie.update(R),Me=R.material;if($&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),le.copy(R.boundingSphere.center)):(ye.boundingSphere===null&&ye.computeBoundingSphere(),le.copy(ye.boundingSphere.center)),le.applyMatrix4(R.matrixWorld).applyMatrix4(ce)),Array.isArray(Me)){const Te=ye.groups;for(let Ge=0,We=Te.length;Ge<We;Ge++){const Ue=Te[Ge],nt=Me[Ue.materialIndex];nt&&nt.visible&&_.push(R,ye,nt,Y,le.z,Ue)}}else Me.visible&&_.push(R,ye,Me,Y,le.z,null)}}const ue=R.children;for(let ye=0,Me=ue.length;ye<Me;ye++)Js(ue[ye],G,Y,$)}function Vo(R,G,Y,$){const{opaque:V,transmissive:ue,transparent:ye}=R;y.setupLightsView(Y),te===!0&&Re.setGlobalState(v.clippingPlanes,Y),$&&me.viewport(F.copy($)),V.length>0&&es(V,G,Y),ue.length>0&&es(ue,G,Y),ye.length>0&&es(ye,G,Y),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function qo(R,G,Y,$){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;y.state.transmissionRenderTarget[$.id]===void 0&&(y.state.transmissionRenderTarget[$.id]=new kn(1,1,{generateMipmaps:!0,type:Ne.has("EXT_color_buffer_half_float")||Ne.has("EXT_color_buffer_float")?Mi:pn,minFilter:Zn,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:at.workingColorSpace}));const ue=y.state.transmissionRenderTarget[$.id],ye=$.viewport||F;ue.setSize(ye.z*v.transmissionResolutionScale,ye.w*v.transmissionResolutionScale);const Me=v.getRenderTarget(),Te=v.getActiveCubeFace(),Ge=v.getActiveMipmapLevel();v.setRenderTarget(ue),v.getClearColor(H),Z=v.getClearAlpha(),Z<1&&v.setClearColor(16777215,.5),v.clear(),De&&ae.render(Y);const We=v.toneMapping;v.toneMapping=Nn;const Ue=$.viewport;if($.viewport!==void 0&&($.viewport=void 0),y.setupLightsView($),te===!0&&Re.setGlobalState(v.clippingPlanes,$),es(R,Y,$),Pe.updateMultisampleRenderTarget(ue),Pe.updateRenderTargetMipmap(ue),Ne.has("WEBGL_multisampled_render_to_texture")===!1){let nt=!1;for(let ut=0,Et=G.length;ut<Et;ut++){const Mt=G[ut],{object:mt,geometry:Be,material:bt,group:ot}=Mt;if(bt.side===Xt&&mt.layers.test($.layers)){const Yt=bt.side;bt.side=Bt,bt.needsUpdate=!0,Xo(mt,Y,$,Be,bt,ot),bt.side=Yt,bt.needsUpdate=!0,nt=!0}}nt===!0&&(Pe.updateMultisampleRenderTarget(ue),Pe.updateRenderTargetMipmap(ue))}v.setRenderTarget(Me,Te,Ge),v.setClearColor(H,Z),Ue!==void 0&&($.viewport=Ue),v.toneMapping=We}function es(R,G,Y){const $=G.isScene===!0?G.overrideMaterial:null;for(let V=0,ue=R.length;V<ue;V++){const ye=R[V],{object:Me,geometry:Te,group:Ge}=ye;let We=ye.material;We.allowOverride===!0&&$!==null&&(We=$),Me.layers.test(Y.layers)&&Xo(Me,G,Y,Te,We,Ge)}}function Xo(R,G,Y,$,V,ue){R.onBeforeRender(v,G,Y,$,V,ue),R.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),V.onBeforeRender(v,G,Y,$,R,ue),V.transparent===!0&&V.side===Xt&&V.forceSinglePass===!1?(V.side=Bt,V.needsUpdate=!0,v.renderBufferDirect(Y,G,$,V,R,ue),V.side=Fn,V.needsUpdate=!0,v.renderBufferDirect(Y,G,$,V,R,ue),V.side=Xt):v.renderBufferDirect(Y,G,$,V,R,ue),R.onAfterRender(v,G,Y,$,V,ue)}function ts(R,G,Y){G.isScene!==!0&&(G=je);const $=be.get(R),V=y.state.lights,ue=y.state.shadowsArray,ye=V.state.version,Me=j.getParameters(R,V.state,ue,G,Y),Te=j.getProgramCacheKey(Me);let Ge=$.programs;$.environment=R.isMeshStandardMaterial?G.environment:null,$.fog=G.fog,$.envMap=(R.isMeshStandardMaterial?T:D).get(R.envMap||$.environment),$.envMapRotation=$.environment!==null&&R.envMap===null?G.environmentRotation:R.envMapRotation,Ge===void 0&&(R.addEventListener("dispose",Ye),Ge=new Map,$.programs=Ge);let We=Ge.get(Te);if(We!==void 0){if($.currentProgram===We&&$.lightsStateVersion===ye)return $o(R,Me),We}else Me.uniforms=j.getUniforms(R),R.onBeforeCompile(Me,v),We=j.acquireProgram(Me,Te),Ge.set(Te,We),$.uniforms=Me.uniforms;const Ue=$.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Ue.clippingPlanes=Re.uniform),$o(R,Me),$.needsLights=Gl(R),$.lightsStateVersion=ye,$.needsLights&&(Ue.ambientLightColor.value=V.state.ambient,Ue.lightProbe.value=V.state.probe,Ue.directionalLights.value=V.state.directional,Ue.directionalLightShadows.value=V.state.directionalShadow,Ue.spotLights.value=V.state.spot,Ue.spotLightShadows.value=V.state.spotShadow,Ue.rectAreaLights.value=V.state.rectArea,Ue.ltc_1.value=V.state.rectAreaLTC1,Ue.ltc_2.value=V.state.rectAreaLTC2,Ue.pointLights.value=V.state.point,Ue.pointLightShadows.value=V.state.pointShadow,Ue.hemisphereLights.value=V.state.hemi,Ue.directionalShadowMap.value=V.state.directionalShadowMap,Ue.directionalShadowMatrix.value=V.state.directionalShadowMatrix,Ue.spotShadowMap.value=V.state.spotShadowMap,Ue.spotLightMatrix.value=V.state.spotLightMatrix,Ue.spotLightMap.value=V.state.spotLightMap,Ue.pointShadowMap.value=V.state.pointShadowMap,Ue.pointShadowMatrix.value=V.state.pointShadowMatrix),$.currentProgram=We,$.uniformsList=null,We}function Yo(R){if(R.uniformsList===null){const G=R.currentProgram.getUniforms();R.uniformsList=Ls.seqWithValue(G.seq,R.uniforms)}return R.uniformsList}function $o(R,G){const Y=be.get(R);Y.outputColorSpace=G.outputColorSpace,Y.batching=G.batching,Y.batchingColor=G.batchingColor,Y.instancing=G.instancing,Y.instancingColor=G.instancingColor,Y.instancingMorph=G.instancingMorph,Y.skinning=G.skinning,Y.morphTargets=G.morphTargets,Y.morphNormals=G.morphNormals,Y.morphColors=G.morphColors,Y.morphTargetsCount=G.morphTargetsCount,Y.numClippingPlanes=G.numClippingPlanes,Y.numIntersection=G.numClipIntersection,Y.vertexAlphas=G.vertexAlphas,Y.vertexTangents=G.vertexTangents,Y.toneMapping=G.toneMapping}function Bl(R,G,Y,$,V){G.isScene!==!0&&(G=je),Pe.resetTextureUnits();const ue=G.fog,ye=$.isMeshStandardMaterial?G.environment:null,Me=S===null?v.outputColorSpace:S.isXRRenderTarget===!0?S.texture.colorSpace:Si,Te=($.isMeshStandardMaterial?T:D).get($.envMap||ye),Ge=$.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,We=!!Y.attributes.tangent&&(!!$.normalMap||$.anisotropy>0),Ue=!!Y.morphAttributes.position,nt=!!Y.morphAttributes.normal,ut=!!Y.morphAttributes.color;let Et=Nn;$.toneMapped&&(S===null||S.isXRRenderTarget===!0)&&(Et=v.toneMapping);const Mt=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,mt=Mt!==void 0?Mt.length:0,Be=be.get($),bt=y.state.lights;if(te===!0&&(pe===!0||R!==N)){const Gt=R===N&&$.id===w;Re.setState($,R,Gt)}let ot=!1;$.version===Be.__version?(Be.needsLights&&Be.lightsStateVersion!==bt.state.version||Be.outputColorSpace!==Me||V.isBatchedMesh&&Be.batching===!1||!V.isBatchedMesh&&Be.batching===!0||V.isBatchedMesh&&Be.batchingColor===!0&&V.colorTexture===null||V.isBatchedMesh&&Be.batchingColor===!1&&V.colorTexture!==null||V.isInstancedMesh&&Be.instancing===!1||!V.isInstancedMesh&&Be.instancing===!0||V.isSkinnedMesh&&Be.skinning===!1||!V.isSkinnedMesh&&Be.skinning===!0||V.isInstancedMesh&&Be.instancingColor===!0&&V.instanceColor===null||V.isInstancedMesh&&Be.instancingColor===!1&&V.instanceColor!==null||V.isInstancedMesh&&Be.instancingMorph===!0&&V.morphTexture===null||V.isInstancedMesh&&Be.instancingMorph===!1&&V.morphTexture!==null||Be.envMap!==Te||$.fog===!0&&Be.fog!==ue||Be.numClippingPlanes!==void 0&&(Be.numClippingPlanes!==Re.numPlanes||Be.numIntersection!==Re.numIntersection)||Be.vertexAlphas!==Ge||Be.vertexTangents!==We||Be.morphTargets!==Ue||Be.morphNormals!==nt||Be.morphColors!==ut||Be.toneMapping!==Et||Be.morphTargetsCount!==mt)&&(ot=!0):(ot=!0,Be.__version=$.version);let Yt=Be.currentProgram;ot===!0&&(Yt=ts($,G,V));let Qn=!1,$t=!1,Ci=!1;const Tt=Yt.getUniforms(),Wt=Be.uniforms;if(me.useProgram(Yt.program)&&(Qn=!0,$t=!0,Ci=!0),$.id!==w&&(w=$.id,$t=!0),Qn||N!==R){me.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Tt.setValue(O,"projectionMatrix",R.projectionMatrix),Tt.setValue(O,"viewMatrix",R.matrixWorldInverse);const Vt=Tt.map.cameraPosition;Vt!==void 0&&Vt.setValue(O,oe.setFromMatrixPosition(R.matrixWorld)),qe.logarithmicDepthBuffer&&Tt.setValue(O,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),($.isMeshPhongMaterial||$.isMeshToonMaterial||$.isMeshLambertMaterial||$.isMeshBasicMaterial||$.isMeshStandardMaterial||$.isShaderMaterial)&&Tt.setValue(O,"isOrthographic",R.isOrthographicCamera===!0),N!==R&&(N=R,$t=!0,Ci=!0)}if(V.isSkinnedMesh){Tt.setOptional(O,V,"bindMatrix"),Tt.setOptional(O,V,"bindMatrixInverse");const Gt=V.skeleton;Gt&&(Gt.boneTexture===null&&Gt.computeBoneTexture(),Tt.setValue(O,"boneTexture",Gt.boneTexture,Pe))}V.isBatchedMesh&&(Tt.setOptional(O,V,"batchingTexture"),Tt.setValue(O,"batchingTexture",V._matricesTexture,Pe),Tt.setOptional(O,V,"batchingIdTexture"),Tt.setValue(O,"batchingIdTexture",V._indirectTexture,Pe),Tt.setOptional(O,V,"batchingColorTexture"),V._colorsTexture!==null&&Tt.setValue(O,"batchingColorTexture",V._colorsTexture,Pe));const Zt=Y.morphAttributes;if((Zt.position!==void 0||Zt.normal!==void 0||Zt.color!==void 0)&&He.update(V,Y,Yt),($t||Be.receiveShadow!==V.receiveShadow)&&(Be.receiveShadow=V.receiveShadow,Tt.setValue(O,"receiveShadow",V.receiveShadow)),$.isMeshGouraudMaterial&&$.envMap!==null&&(Wt.envMap.value=Te,Wt.flipEnvMap.value=Te.isCubeTexture&&Te.isRenderTargetTexture===!1?-1:1),$.isMeshStandardMaterial&&$.envMap===null&&G.environment!==null&&(Wt.envMapIntensity.value=G.environmentIntensity),Wt.dfgLUT!==void 0&&(Wt.dfgLUT.value=fm()),$t&&(Tt.setValue(O,"toneMappingExposure",v.toneMappingExposure),Be.needsLights&&zl(Wt,Ci),ue&&$.fog===!0&&Ce.refreshFogUniforms(Wt,ue),Ce.refreshMaterialUniforms(Wt,$,K,J,y.state.transmissionRenderTarget[R.id]),Ls.upload(O,Yo(Be),Wt,Pe)),$.isShaderMaterial&&$.uniformsNeedUpdate===!0&&(Ls.upload(O,Yo(Be),Wt,Pe),$.uniformsNeedUpdate=!1),$.isSpriteMaterial&&Tt.setValue(O,"center",V.center),Tt.setValue(O,"modelViewMatrix",V.modelViewMatrix),Tt.setValue(O,"normalMatrix",V.normalMatrix),Tt.setValue(O,"modelMatrix",V.matrixWorld),$.isShaderMaterial||$.isRawShaderMaterial){const Gt=$.uniformsGroups;for(let Vt=0,Zs=Gt.length;Vt<Zs;Vt++){const zn=Gt[Vt];ve.update(zn,Yt),ve.bind(zn,Yt)}}return Yt}function zl(R,G){R.ambientLightColor.needsUpdate=G,R.lightProbe.needsUpdate=G,R.directionalLights.needsUpdate=G,R.directionalLightShadows.needsUpdate=G,R.pointLights.needsUpdate=G,R.pointLightShadows.needsUpdate=G,R.spotLights.needsUpdate=G,R.spotLightShadows.needsUpdate=G,R.rectAreaLights.needsUpdate=G,R.hemisphereLights.needsUpdate=G}function Gl(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return L},this.getActiveMipmapLevel=function(){return b},this.getRenderTarget=function(){return S},this.setRenderTargetTextures=function(R,G,Y){const $=be.get(R);$.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,$.__autoAllocateDepthBuffer===!1&&($.__useRenderToTexture=!1),be.get(R.texture).__webglTexture=G,be.get(R.depthTexture).__webglTexture=$.__autoAllocateDepthBuffer?void 0:Y,$.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,G){const Y=be.get(R);Y.__webglFramebuffer=G,Y.__useDefaultFramebuffer=G===void 0};const Hl=O.createFramebuffer();this.setRenderTarget=function(R,G=0,Y=0){S=R,L=G,b=Y;let $=!0,V=null,ue=!1,ye=!1;if(R){const Te=be.get(R);if(Te.__useDefaultFramebuffer!==void 0)me.bindFramebuffer(O.FRAMEBUFFER,null),$=!1;else if(Te.__webglFramebuffer===void 0)Pe.setupRenderTarget(R);else if(Te.__hasExternalTextures)Pe.rebindTextures(R,be.get(R.texture).__webglTexture,be.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const Ue=R.depthTexture;if(Te.__boundDepthTexture!==Ue){if(Ue!==null&&be.has(Ue)&&(R.width!==Ue.image.width||R.height!==Ue.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Pe.setupDepthRenderbuffer(R)}}const Ge=R.texture;(Ge.isData3DTexture||Ge.isDataArrayTexture||Ge.isCompressedArrayTexture)&&(ye=!0);const We=be.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(We[G])?V=We[G][Y]:V=We[G],ue=!0):R.samples>0&&Pe.useMultisampledRTT(R)===!1?V=be.get(R).__webglMultisampledFramebuffer:Array.isArray(We)?V=We[Y]:V=We,F.copy(R.viewport),B.copy(R.scissor),q=R.scissorTest}else F.copy(ke).multiplyScalar(K).floor(),B.copy(Ke).multiplyScalar(K).floor(),q=Xe;if(Y!==0&&(V=Hl),me.bindFramebuffer(O.FRAMEBUFFER,V)&&$&&me.drawBuffers(R,V),me.viewport(F),me.scissor(B),me.setScissorTest(q),ue){const Te=be.get(R.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+G,Te.__webglTexture,Y)}else if(ye){const Te=G;for(let Ge=0;Ge<R.textures.length;Ge++){const We=be.get(R.textures[Ge]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+Ge,We.__webglTexture,Y,Te)}}else if(R!==null&&Y!==0){const Te=be.get(R.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Te.__webglTexture,Y)}w=-1},this.readRenderTargetPixels=function(R,G,Y,$,V,ue,ye,Me=0){if(!(R&&R.isWebGLRenderTarget)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Te=be.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&ye!==void 0&&(Te=Te[ye]),Te){me.bindFramebuffer(O.FRAMEBUFFER,Te);try{const Ge=R.textures[Me],We=Ge.format,Ue=Ge.type;if(!qe.textureFormatReadable(We)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!qe.textureTypeReadable(Ue)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}G>=0&&G<=R.width-$&&Y>=0&&Y<=R.height-V&&(R.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Me),O.readPixels(G,Y,$,V,Ve.convert(We),Ve.convert(Ue),ue))}finally{const Ge=S!==null?be.get(S).__webglFramebuffer:null;me.bindFramebuffer(O.FRAMEBUFFER,Ge)}}},this.readRenderTargetPixelsAsync=async function(R,G,Y,$,V,ue,ye,Me=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Te=be.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&ye!==void 0&&(Te=Te[ye]),Te)if(G>=0&&G<=R.width-$&&Y>=0&&Y<=R.height-V){me.bindFramebuffer(O.FRAMEBUFFER,Te);const Ge=R.textures[Me],We=Ge.format,Ue=Ge.type;if(!qe.textureFormatReadable(We))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!qe.textureTypeReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const nt=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,nt),O.bufferData(O.PIXEL_PACK_BUFFER,ue.byteLength,O.STREAM_READ),R.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+Me),O.readPixels(G,Y,$,V,Ve.convert(We),Ve.convert(Ue),0);const ut=S!==null?be.get(S).__webglFramebuffer:null;me.bindFramebuffer(O.FRAMEBUFFER,ut);const Et=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Oc(O,Et,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,nt),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,ue),O.deleteBuffer(nt),O.deleteSync(Et),ue}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,G=null,Y=0){const $=Math.pow(2,-Y),V=Math.floor(R.image.width*$),ue=Math.floor(R.image.height*$),ye=G!==null?G.x:0,Me=G!==null?G.y:0;Pe.setTexture2D(R,0),O.copyTexSubImage2D(O.TEXTURE_2D,Y,0,0,ye,Me,V,ue),me.unbindTexture()};const Wl=O.createFramebuffer(),Vl=O.createFramebuffer();this.copyTextureToTexture=function(R,G,Y=null,$=null,V=0,ue=null){ue===null&&(V!==0?(Yi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ue=V,V=0):ue=0);let ye,Me,Te,Ge,We,Ue,nt,ut,Et;const Mt=R.isCompressedTexture?R.mipmaps[ue]:R.image;if(Y!==null)ye=Y.max.x-Y.min.x,Me=Y.max.y-Y.min.y,Te=Y.isBox3?Y.max.z-Y.min.z:1,Ge=Y.min.x,We=Y.min.y,Ue=Y.isBox3?Y.min.z:0;else{const Zt=Math.pow(2,-V);ye=Math.floor(Mt.width*Zt),Me=Math.floor(Mt.height*Zt),R.isDataArrayTexture?Te=Mt.depth:R.isData3DTexture?Te=Math.floor(Mt.depth*Zt):Te=1,Ge=0,We=0,Ue=0}$!==null?(nt=$.x,ut=$.y,Et=$.z):(nt=0,ut=0,Et=0);const mt=Ve.convert(G.format),Be=Ve.convert(G.type);let bt;G.isData3DTexture?(Pe.setTexture3D(G,0),bt=O.TEXTURE_3D):G.isDataArrayTexture||G.isCompressedArrayTexture?(Pe.setTexture2DArray(G,0),bt=O.TEXTURE_2D_ARRAY):(Pe.setTexture2D(G,0),bt=O.TEXTURE_2D),O.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,G.flipY),O.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),O.pixelStorei(O.UNPACK_ALIGNMENT,G.unpackAlignment);const ot=O.getParameter(O.UNPACK_ROW_LENGTH),Yt=O.getParameter(O.UNPACK_IMAGE_HEIGHT),Qn=O.getParameter(O.UNPACK_SKIP_PIXELS),$t=O.getParameter(O.UNPACK_SKIP_ROWS),Ci=O.getParameter(O.UNPACK_SKIP_IMAGES);O.pixelStorei(O.UNPACK_ROW_LENGTH,Mt.width),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Mt.height),O.pixelStorei(O.UNPACK_SKIP_PIXELS,Ge),O.pixelStorei(O.UNPACK_SKIP_ROWS,We),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Ue);const Tt=R.isDataArrayTexture||R.isData3DTexture,Wt=G.isDataArrayTexture||G.isData3DTexture;if(R.isDepthTexture){const Zt=be.get(R),Gt=be.get(G),Vt=be.get(Zt.__renderTarget),Zs=be.get(Gt.__renderTarget);me.bindFramebuffer(O.READ_FRAMEBUFFER,Vt.__webglFramebuffer),me.bindFramebuffer(O.DRAW_FRAMEBUFFER,Zs.__webglFramebuffer);for(let zn=0;zn<Te;zn++)Tt&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,be.get(R).__webglTexture,V,Ue+zn),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,be.get(G).__webglTexture,ue,Et+zn)),O.blitFramebuffer(Ge,We,ye,Me,nt,ut,ye,Me,O.DEPTH_BUFFER_BIT,O.NEAREST);me.bindFramebuffer(O.READ_FRAMEBUFFER,null),me.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(V!==0||R.isRenderTargetTexture||be.has(R)){const Zt=be.get(R),Gt=be.get(G);me.bindFramebuffer(O.READ_FRAMEBUFFER,Wl),me.bindFramebuffer(O.DRAW_FRAMEBUFFER,Vl);for(let Vt=0;Vt<Te;Vt++)Tt?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Zt.__webglTexture,V,Ue+Vt):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Zt.__webglTexture,V),Wt?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Gt.__webglTexture,ue,Et+Vt):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Gt.__webglTexture,ue),V!==0?O.blitFramebuffer(Ge,We,ye,Me,nt,ut,ye,Me,O.COLOR_BUFFER_BIT,O.NEAREST):Wt?O.copyTexSubImage3D(bt,ue,nt,ut,Et+Vt,Ge,We,ye,Me):O.copyTexSubImage2D(bt,ue,nt,ut,Ge,We,ye,Me);me.bindFramebuffer(O.READ_FRAMEBUFFER,null),me.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else Wt?R.isDataTexture||R.isData3DTexture?O.texSubImage3D(bt,ue,nt,ut,Et,ye,Me,Te,mt,Be,Mt.data):G.isCompressedArrayTexture?O.compressedTexSubImage3D(bt,ue,nt,ut,Et,ye,Me,Te,mt,Mt.data):O.texSubImage3D(bt,ue,nt,ut,Et,ye,Me,Te,mt,Be,Mt):R.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,ue,nt,ut,ye,Me,mt,Be,Mt.data):R.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,ue,nt,ut,Mt.width,Mt.height,mt,Mt.data):O.texSubImage2D(O.TEXTURE_2D,ue,nt,ut,ye,Me,mt,Be,Mt);O.pixelStorei(O.UNPACK_ROW_LENGTH,ot),O.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Yt),O.pixelStorei(O.UNPACK_SKIP_PIXELS,Qn),O.pixelStorei(O.UNPACK_SKIP_ROWS,$t),O.pixelStorei(O.UNPACK_SKIP_IMAGES,Ci),ue===0&&G.generateMipmaps&&O.generateMipmap(bt),me.unbindTexture()},this.initRenderTarget=function(R){be.get(R).__webglFramebuffer===void 0&&Pe.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?Pe.setTextureCube(R,0):R.isData3DTexture?Pe.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?Pe.setTexture2DArray(R,0):Pe.setTexture2D(R,0),me.unbindTexture()},this.resetState=function(){L=0,b=0,S=null,me.reset(),k.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return fn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=at._getDrawingBufferColorSpace(e),t.unpackColorSpace=at._getUnpackColorSpace()}}const U={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:1.8,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:2,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_LOD_OFFSET:1,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,POLAR_THRESHOLD:.9,EARTH_SPAWN_LAT:52.5,EARTH_SPAWN_LON:127,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TORCH_LIGHT_RANGE:4,TORCH_LIGHT_INTENSITY:1.5,TORCH_FLICKER_SPEED:8,TORCH_FLICKER_AMOUNT:.2,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,PLANET_DARK_SIDE_AMBIENT:.06,PLANET_TORCH_LIGHT_RADIUS:4,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:12,TECH_BLOCK_ROTATION_OFFSET:0,TECH_BLOCK_HEX_SNAP:!1};var mm=`varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,gm=`precision highp float;

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
}`;const jn=class jn{constructor(){M(this,"sections",new Map);M(this,"enabled",!1);M(this,"sampleWindow",60);M(this,"displayElement",null);M(this,"lastUpdateTime",0);M(this,"updateInterval",200);M(this,"spikeLoggingEnabled",!0);M(this,"frameSpikeThresholdMs",50);M(this,"lastFrameStartTime",0);M(this,"frameSections",new Map);M(this,"oneTimeOperations",[]);M(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return jn.instance||(jn.instance=new jn),jn.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
`);console.warn(`[FRAME SPIKE] Total: ${e.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)
Breakdown:
${t}`)}}logOneTimeOperation(e,t){this.oneTimeOperations.push({name:e,time:t,timestamp:performance.now()}),console.log(`[ONE-TIME] ${e}: ${t.toFixed(2)}ms`)}measureOneTime(e,t){const n=performance.now(),i=t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}async measureOneTimeAsync(e,t){const n=performance.now(),i=await t(),s=performance.now()-n;return this.logOneTimeOperation(e,s),i}begin(e){this.sections.has(e)||this.sections.set(e,{startTime:0,samples:[],callCount:0});const t=this.sections.get(e);t.startTime=performance.now()}end(e){const t=this.sections.get(e);if(!t||t.startTime===0)return;const n=performance.now()-t.startTime;if(this.spikeLoggingEnabled){const i=this.frameSections.get(e)??0;this.frameSections.set(e,i+n)}this.enabled&&(t.samples.push(n),t.callCount++,t.samples.length>this.sampleWindow&&t.samples.shift()),t.startTime=0}wrap(e,t){this.begin(e);const n=t();return this.end(e),n}getMetrics(){const e=[];for(const[t,n]of this.sections){if(n.samples.length===0)continue;const i=n.samples,s=i[i.length-1],o=i.reduce((c,h)=>c+h,0)/i.length,a=Math.max(...i),l=Math.min(...i);e.push({name:t,lastTime:s,avgTime:o,maxTime:a,minTime:l,callCount:n.callCount})}return e.sort((t,n)=>n.avgTime-t.avgTime),e}createDisplay(){this.displayElement||(this.displayElement=document.createElement("div"),this.displayElement.id="profiler-display",this.displayElement.style.cssText=`
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
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let s="<b>PROFILER (F3 to toggle)</b><br>";s+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let h="#0f0";c.avgTime>5?h="#f44":c.avgTime>1&&(h="#ff0");const u=i>0?(c.avgTime/i*100).toFixed(0):"0",d=c.avgTime.toFixed(2).padStart(6),f=c.maxTime.toFixed(2).padStart(6),x=u.padStart(3);s+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${d}ms</span>`,s+=`<span style="color:#666"> max:${f}ms</span>`,c.name!=="Frame Total"&&(s+=`<span style="color:#888"> ${x}%</span>`),s+="<br>"}const o=window.__gameRenderer,a=window.__gameScene;if(o!=null&&o.info){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#88f">GPU Stats</b><br>';const c=o.info.render.calls;let h="#0f0";c>500?h="#f44":c>100&&(h="#ff0");const u=o.info.render.triangles;let d="#0f0";u>5e5?d="#f44":u>1e5&&(d="#ff0"),s+=`<span style="color:${h}">Draw Calls: ${c}</span><br>`,s+=`<span style="color:${d}">Triangles: ${u.toLocaleString()}</span><br>`,s+=`<span style="color:#88f">Geometries: ${o.info.memory.geometries}</span><br>`,s+=`<span style="color:#88f">Textures: ${o.info.memory.textures}</span><br>`,o.info.programs&&(s+=`<span style="color:#88f">Shader Programs: ${o.info.programs.length}</span><br>`)}if(a){let c=0,h=0,u=0,d=0;a.traverse(f=>{f.isMesh&&(c++,f.visible&&h++),f.isGroup&&u++,f.isLight&&d++}),s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#a8f">Scene Stats</b><br>',s+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,s+=`<span style="color:#a8f">Visible Meshes: ${h}</span><br>`,s+=`<span style="color:#a8f">Groups: ${u}</span><br>`,s+=`<span style="color:#a8f">Lights: ${d}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const h=((l-c.timestamp)/1e3).toFixed(1);let u="#f80";c.time>100?u="#f44":c.time>50&&(u="#ff0"),s+=`<span style="color:${u}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,s+=`<span style="color:#666"> (${h}s ago)</span><br>`}}this.displayElement.innerHTML=s}reset(){this.sections.clear()}};M(jn,"instance");let Mo=jn;const _e=Mo.getInstance();function Nl(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class xm{constructor(){M(this,"keys",new Set);M(this,"keysJustPressed",new Set);M(this,"mouseMovement",{x:0,y:0});M(this,"mouseButtons",{left:!1,right:!1});M(this,"mouseWheelDelta",0);M(this,"isPointerLocked",!1);M(this,"onPointerLockChange");M(this,"onInventoryToggle");M(this,"onPauseToggle");M(this,"isMobile");M(this,"mobileGameActive",!1);M(this,"touchLookMovement",{x:0,y:0});M(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});M(this,"touchJump",!1);M(this,"touchJumpJustPressed",!1);M(this,"touchCrouch",!1);M(this,"touchLeftClick",!1);M(this,"touchRightClick",!1);M(this,"moveJoystickTouch",null);M(this,"lookJoystickTouch",null);M(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=Nl(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){window.addEventListener("keydown",t=>{if((this.isPointerLocked||this.mobileGameActive)&&t.ctrlKey&&(t.code==="KeyS"||t.code==="KeyR"||t.code==="KeyN"))return t.preventDefault(),t.stopPropagation(),!1},{capture:!0}),window.addEventListener("beforeunload",t=>{if(this.isPointerLocked||this.mobileGameActive)return document.pointerLockElement&&document.exitPointerLock(),t.preventDefault(),t.returnValue="You have an active game. Are you sure you want to leave?",t.returnValue}),document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("wheel",t=>{this.isPointerLocked&&(this.mouseWheelDelta+=t.deltaY)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
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
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(o=>o.style.display="none");const s=document.createElement("p");s.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",s.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(s)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),s=document.getElementById("btn-break"),o=document.getElementById("btn-place");if(e){const c=e.querySelector(".joystick-base"),h=e.querySelector(".joystick-thumb"),u=35,d=x=>{const g=c.getBoundingClientRect(),m=g.left+g.width/2,p=g.top+g.height/2,_=x.clientX-m,y=x.clientY-p,E=Math.sqrt(_*_+y*y),C=Math.min(E,u),v=Math.atan2(y,_),A=Math.cos(v)*C,L=Math.sin(v)*C;h.style.transform=`translate(${A}px, ${L}px)`;const b=A/u,S=L/u,w=.2;this.touchMoveInput.forward=S<-w,this.touchMoveInput.backward=S>w,this.touchMoveInput.left=b<-w,this.touchMoveInput.right=b>w};e.addEventListener("touchstart",x=>{x.preventDefault();const g=x.changedTouches[0];this.moveJoystickTouch={id:g.identifier,startX:0,startY:0},d(g)},{passive:!1}),e.addEventListener("touchmove",x=>{if(x.preventDefault(),!!this.moveJoystickTouch)for(let g=0;g<x.touches.length;g++){const m=x.touches[g];if(m.identifier===this.moveJoystickTouch.id){d(m);break}}},{passive:!1});const f=x=>{for(let g=0;g<x.changedTouches.length;g++)if(this.moveJoystickTouch&&x.changedTouches[g].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,h.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",f),e.addEventListener("touchcancel",f)}if(t){const c=t.querySelector(".joystick-base"),h=t.querySelector(".joystick-thumb"),u=35,d=x=>{const g=c.getBoundingClientRect(),m=g.left+g.width/2,p=g.top+g.height/2,_=x.clientX-m,y=x.clientY-p,E=Math.sqrt(_*_+y*y),C=Math.min(E,u),v=Math.atan2(y,_),A=Math.cos(v)*C,L=Math.sin(v)*C;h.style.transform=`translate(${A}px, ${L}px)`;const b=A/u,S=L/u,w=.15;Math.abs(b)>w||Math.abs(S)>w?(this.lookJoystickPosition.x=b,this.lookJoystickPosition.y=S):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",x=>{x.preventDefault();const g=x.changedTouches[0];this.lookJoystickTouch={id:g.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",x=>{if(x.preventDefault(),!!this.lookJoystickTouch)for(let g=0;g<x.touches.length;g++){const m=x.touches[g];if(m.identifier===this.lookJoystickTouch.id){d(m);break}}},{passive:!1});const f=x=>{for(let g=0;g<x.changedTouches.length;g++)if(this.lookJoystickTouch&&x.changedTouches[g].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},h.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",f),t.addEventListener("touchcancel",f)}n&&(n.addEventListener("touchstart",c=>{c.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",c=>{c.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",c=>{c.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",c=>{c.preventDefault(),this.touchCrouch=!1},{passive:!1})),s&&(s.addEventListener("touchstart",c=>{c.preventDefault(),this.touchLeftClick=!0},{passive:!1}),s.addEventListener("touchend",c=>{c.preventDefault(),this.touchLeftClick=!1},{passive:!1})),o&&(o.addEventListener("touchstart",c=>{c.preventDefault(),this.touchRightClick=!0},{passive:!1}),o.addEventListener("touchend",c=>{c.preventDefault(),this.touchRightClick=!1},{passive:!1}));const a=document.getElementById("btn-inventory");a&&a.addEventListener("touchstart",c=>{c.preventDefault(),this.onInventoryToggle&&this.onInventoryToggle()},{passive:!1});const l=document.getElementById("btn-pause");l&&l.addEventListener("touchstart",c=>{c.preventDefault(),this.onPauseToggle&&this.onPauseToggle()},{passive:!1})}setPointerLockCallback(e){this.onPointerLockChange=e}setInventoryToggleCallback(e){this.onInventoryToggle=e}setPauseToggleCallback(e){this.onPauseToggle=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyR"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}getWheelDelta(){const e=this.mouseWheelDelta;return this.mouseWheelDelta=0,e}resetMouseButtons(){this.mouseButtons.left=!1,this.mouseButtons.right=!1}}function vm(){return new ct({uniforms:{time:{value:0}},vertexShader:mm,fragmentShader:gm,side:Bt})}class _m{constructor(e){M(this,"scene");M(this,"camera");M(this,"renderer");M(this,"sunDirection");M(this,"clock");M(this,"frameCount",0);M(this,"lastFpsUpdate",0);M(this,"currentFps",0);M(this,"sunMesh",null);M(this,"starfield",null);M(this,"isUnderwater",!1);M(this,"underwaterFog",null);M(this,"depthRenderTarget",null);M(this,"waterMaterials",new Set);M(this,"waterMeshes",new Set);M(this,"isMobile");M(this,"updateCallbacks",[]);M(this,"animate",()=>{requestAnimationFrame(this.animate),_e.beginFrame(),_e.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}_e.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(_e.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),_e.begin("Render"),this.depthRenderTarget&&this.waterMeshes.size>0){const n=new Map;for(const i of this.waterMeshes)n.set(i,i.visible),i.visible=!1;this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);for(const i of this.waterMeshes)i.visible=n.get(i)??!0}this.renderer.render(this.scene,this.camera),_e.end("Render"),_e.end("Frame Total"),_e.endFrame(),_e.updateDisplay()});this.isMobile=Nl(),this.scene=new oh,this.camera=new Jt(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new pm({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=al,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new Mh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),_e.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),_e.toggle())})}setupLighting(){this.sunDirection=new P(U.SUN_DIRECTION.x,U.SUN_DIRECTION.y,U.SUN_DIRECTION.z).normalize();const e=new $i(900,64,64),t=vm();this.starfield=new Le(e,t),this.scene.add(this.starfield);const n=new $i(60,32,32),i=new Ji({color:16768324,fog:!1});this.sunMesh=new Le(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const s=new Th(16777215,U.AMBIENT_LIGHT_INTENSITY);this.scene.add(s);const o=new bh(16777215,U.DIRECTIONAL_LIGHT_INTENSITY);o.position.copy(this.sunDirection.clone().multiplyScalar(500)),o.castShadow=!0,o.shadow.mapSize.width=1024,o.shadow.mapSize.height=1024,o.shadow.camera.near=.5,o.shadow.camera.far=500,o.shadow.camera.left=-100,o.shadow.camera.right=100,o.shadow.camera.top=100,o.shadow.camera.bottom=-100,this.scene.add(o);const a=new vh(8900331,2236962,U.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(a)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e),i=new zo(t,n);i.format=yi,i.type=Un,this.depthRenderTarget=new kn(t,n,{minFilter:St,magFilter:St,depthBuffer:!0,depthTexture:i})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.has(e)||(this.waterMaterials.add(e),this.updateWaterMaterialUniforms(e))}registerWaterMesh(e){this.waterMeshes.add(e)}unregisterWaterMesh(e){this.waterMeshes.delete(e)}updateWaterMaterialUniforms(e){if(this.depthRenderTarget){const t=this.renderer.getPixelRatio();e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new rt(window.innerWidth*t,window.innerHeight*t)},e.uniforms.useDepthFog={value:1}}else e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new we(U.UNDERWATER_FOG_COLOR);this.underwaterFog=new Bo(t,U.UNDERWATER_FOG_NEAR,U.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class Qa{constructor(e=50,t=3){M(this,"tiles",[]);M(this,"radius");M(this,"subdivisions");M(this,"vertexMap",new Map);M(this,"vertices",[]);M(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new P(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],s=this.vertices[t],o=new P().addVectors(i,s).multiplyScalar(.5).normalize().multiplyScalar(this.radius),a=this.vertices.length;return this.vertices.push(o),this.vertexMap.set(n,a),a}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),s=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,s]),e.push([t[1],i,n]),e.push([t[2],s,i]),e.push([n,i,s])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const s=this.faces[i];for(const o of s)e.get(o).push(i)}const t=[];for(const i of this.faces){const s=new P;for(const o of i)s.add(this.vertices[o]);s.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(s)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const s=e.get(i),o=s.length===5,a=[];for(const u of s)a.push(t[u].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(a,l);const c=Array.from(n.get(i)),h={index:i,center:l.clone(),vertices:a,neighbors:c,isPentagon:o};this.tiles.push(h)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new P(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const s=new P().crossVectors(n,i).normalize();i.crossVectors(s,n).normalize();const o=[];for(const a of e){const l=a.clone().sub(t),c=l.dot(i),h=l.dot(s);o.push({vertex:a,angle:Math.atan2(h,c)})}o.sort((a,l)=>a.angle-l.angle);for(let a=0;a<e.length;a++)e[a]=o[a].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const s of this.tiles){const o=s.center.distanceToSquared(t);o<i&&(i=o,n=s)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,s=i.center.distanceToSquared(n),o=!0;for(;o;){o=!1;for(const a of i.neighbors){const l=this.tiles[a],c=l.center.distanceToSquared(n);if(c<s){i=l,s=c,o=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function Pt(r){const e="/tenebris/";return r.startsWith("/")?e+r.slice(1):e+r}var ym=`uniform float time;
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
}`,Sm=`precision highp float;

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
}`,Es=`uniform vec3 planetCenter;\r
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
}`,Ms=`precision highp float;

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
}`,bm=`uniform vec3 planetCenter;\r
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
}`,Tm=`precision highp float;

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
}`,I=(r=>(r[r.AIR=0]="AIR",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WATER=4]="WATER",r[r.SAND=5]="SAND",r[r.WOOD=6]="WOOD",r[r.LEAVES=7]="LEAVES",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.SNOW=15]="SNOW",r[r.DIRT_SNOW=16]="DIRT_SNOW",r[r.ICE=17]="ICE",r[r.FURNACE=18]="FURNACE",r))(I||{});function Em(r){return r!==0&&r!==4}function Mm(r){return r===4}class Am{constructor(){M(this,"textureLoader");M(this,"textures",new Map);M(this,"materials",new Map);M(this,"waterShaderMaterial",null);M(this,"terrainMaterials",[]);M(this,"sunDirection",new P(1,.5,.3).normalize());M(this,"planetCenter",new P(0,0,0));this.textureLoader=new Qi}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=W=>{W.magFilter=St,W.minFilter=St,W.wrapS=Hi,W.wrapT=Hi},s=(W,J)=>{const K=W.clone();return K.needsUpdate=!0,new Ta({map:K,color:J,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const W=await this.loadTexture(e);i(W),this.textures.set("primary",W);const J=new we(U.UNDERWATER_FOG_COLOR),he=(Ke=>{const Xe=new ct({uniforms:{terrainTexture:{value:Ke},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:J},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},underwaterDimming:{value:U.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Es,fragmentShader:Ms});return this.terrainMaterials.push(Xe),Xe})(W);this.materials.set("top",he),this.materials.set("side",he),this.materials.set("bottom",he),this.materials.set("stone",he);const ke=(Ke=>{const Xe=new ct({uniforms:{terrainTexture:{value:Ke},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:J},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},underwaterDimming:{value:U.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Es,fragmentShader:Ms,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(Xe),Xe})(W);this.materials.set("topLOD",ke),this.materials.set("sideLOD",ke),this.materials.set("waterLOD",s(W));return}const o=await this.loadTexture("/textures/rocks.png"),a=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png"),h=await this.loadTexture("/textures/wood.png"),u=await this.loadTexture("/textures/sand.png"),d=await this.loadTexture("/textures/minerals/earth/rocks_coal.png"),f=await this.loadTexture("/textures/minerals/earth/rocks_copper.png"),x=await this.loadTexture("/textures/minerals/earth/rocks_iron.png"),g=await this.loadTexture("/textures/minerals/earth/rocks_gold.png"),m=await this.loadTexture("/textures/minerals/earth/rocks_lythium.png"),p=await this.loadTexture("/textures/minerals/earth/rocks_aluminum.png"),_=await this.loadTexture("/textures/minerals/earth/rocks_cobalt.png"),y=await this.loadTexture("/textures/snow.png"),E=await this.loadTexture("/textures/dirt_snow.png"),C=await this.loadTexture("/textures/ice.png");[o,a,l,c,h,u,d,f,x,g,m,p,_,y,E,C].forEach(i),this.textures.set("stone",o),this.textures.set("dirt",a),this.textures.set("grass",l),this.textures.set("dirtGrass",c),this.textures.set("wood",h),this.textures.set("sand",u),this.textures.set("oreCoal",d),this.textures.set("oreCopper",f),this.textures.set("oreIron",x),this.textures.set("oreGold",g),this.textures.set("oreLithium",m),this.textures.set("oreAluminum",p),this.textures.set("oreCobalt",_),this.textures.set("snow",y),this.textures.set("dirtSnow",E),this.textures.set("ice",C);const v=new we(U.UNDERWATER_FOG_COLOR),A=W=>{const J=new ct({uniforms:{terrainTexture:{value:W},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:v},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},underwaterDimming:{value:U.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Es,fragmentShader:Ms});return this.terrainMaterials.push(J),J};this.materials.set("top",A(l)),this.materials.set("side",A(a)),this.materials.set("grassSide",A(c)),this.materials.set("bottom",A(o)),this.materials.set("stone",A(o)),this.materials.set("wood",A(h)),this.materials.set("sand",A(u)),this.materials.set("oreCoal",A(d)),this.materials.set("oreCopper",A(f)),this.materials.set("oreIron",A(x)),this.materials.set("oreGold",A(g)),this.materials.set("oreLithium",A(m)),this.materials.set("oreAluminum",A(p)),this.materials.set("oreCobalt",A(_)),this.materials.set("snow",A(y)),this.materials.set("dirtSnow",A(E)),this.materials.set("snowSide",A(E));const L=new ct({uniforms:{terrainTexture:{value:C},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},opacity:{value:.5},specularPower:{value:64},specularStrength:{value:.6},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:v},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},underwaterDimming:{value:U.UNDERWATER_TERRAIN_DIMMING}},vertexShader:bm,fragmentShader:Tm,transparent:!0,depthWrite:!0,side:Xt});this.terrainMaterials.push(L),this.materials.set("ice",L);const b=new we(U.SEA_WALL_COLOR),S=new Ji({color:b,side:Xt,fog:!1});this.materials.set("seaWall",S);const w=await this.loadTexture("/textures/water.png");i(w),this.textures.set("water",w);const N=new we(U.WATER_COLOR),F=new we(U.WATER_DEEP_COLOR),B=new we(U.UNDERWATER_FOG_COLOR),q=new we(U.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new ct({uniforms:{time:{value:0},waterTexture:{value:w},uvTiling:{value:U.WATER_UV_TILING},waterColor:{value:N},deepWaterColor:{value:F},sunDirection:{value:this.sunDirection.clone()},opacity:{value:U.WATER_TRANSPARENCY},fresnelPower:{value:U.WATER_FRESNEL_POWER},reflectionStrength:{value:U.WATER_REFLECTION_STRENGTH},distortionStrength:{value:U.WATER_DISTORTION_STRENGTH},specularPower:{value:U.WATER_SPECULAR_POWER},specularStrength:{value:U.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:U.WATER_WAVE_AMPLITUDE},waveFrequency:{value:U.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:B},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:q},aboveWaterFogNear:{value:U.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:U.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new P(0,0,0)},textureStrength:{value:U.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:U.WATER_SCROLL_SPEED},causticStrength:{value:U.WATER_CAUSTIC_STRENGTH},foamStrength:{value:U.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new rt(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:ym,fragmentShader:Sm,transparent:!0,side:Xt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const H=W=>{const J=W.clone();J.needsUpdate=!0;const K=new ct({uniforms:{terrainTexture:{value:J},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:v},underwaterFogNear:{value:U.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:U.UNDERWATER_FOG_FAR},underwaterDimming:{value:U.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Es,fragmentShader:Ms});return K.polygonOffset=!0,K.polygonOffsetFactor=4,K.polygonOffsetUnits=4,this.terrainMaterials.push(K),K};this.materials.set("topLOD",H(l)),this.materials.set("sideLOD",H(a)),this.materials.set("stoneLOD",H(o)),this.materials.set("sandLOD",H(u)),this.materials.set("woodLOD",H(h)),this.materials.set("snowLOD",H(y)),this.materials.set("iceLOD",H(C));const Z=s(w,N);Z.side=Xt,Z.transparent=!1,this.materials.set("waterLOD",Z)}loadTexture(e){const t=Pt(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new Ta({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getWoodMaterial(){return this.materials.get("wood")}getSandMaterial(){return this.materials.get("sand")}getSnowMaterial(){return this.materials.get("snow")}getDirtSnowMaterial(){return this.materials.get("dirtSnow")}getSnowSideMaterial(){return this.materials.get("snowSide")??this.materials.get("snow")}getIceMaterial(){return this.materials.get("ice")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}getStoneLODMaterial(){return this.materials.get("stoneLOD")}getSandLODMaterial(){return this.materials.get("sandLOD")}getWoodLODMaterial(){return this.materials.get("woodLOD")}getSnowLODMaterial(){return this.materials.get("snowLOD")}getIceLODMaterial(){return this.materials.get("iceLOD")}createSeparateGeometries(e,t,n,i=new P(0,0,0),s=!0,o=!0,a=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),h=[],u=[];for(const v of e.vertices){const A=v.clone().sub(i).normalize();h.push(A.clone().multiplyScalar(t)),u.push(A.clone().multiplyScalar(n))}const d=c.clone().multiplyScalar(t),f=c.clone().multiplyScalar(n),x=c.clone();let g=new P(1,0,0);Math.abs(x.dot(g))>.9&&(g=new P(0,0,1));const m=new P().crossVectors(x,g).normalize();g=new P().crossVectors(m,x).normalize();let p=null,_=null,y=null;const E=.5,C=[];for(let v=0;v<l;v++){const A=v/l*Math.PI*2-Math.PI/2;C.push({u:.5+Math.cos(A)*E,v:.5+Math.sin(A)*E})}if(s){const v=[],A=[],L=[],b=[],S=c.clone();v.push(f.x,f.y,f.z),A.push(S.x,S.y,S.z),L.push(.5,.5);for(let w=0;w<l;w++){const N=u[w];v.push(N.x,N.y,N.z),A.push(S.x,S.y,S.z),L.push(C[w].u,C[w].v)}for(let w=0;w<l;w++){const N=(w+1)%l;b.push(0,1+w,1+N)}p=new xt,p.setAttribute("position",new Oe(v,3)),p.setAttribute("normal",new Oe(A,3)),p.setAttribute("uv",new Oe(L,2)),p.setIndex(b)}if(o){const v=[],A=[],L=[],b=[],S=c.clone().negate();v.push(d.x,d.y,d.z),A.push(S.x,S.y,S.z),L.push(.5,.5);for(let w=0;w<l;w++){const N=h[w];v.push(N.x,N.y,N.z),A.push(S.x,S.y,S.z),L.push(C[w].u,C[w].v)}for(let w=0;w<l;w++){const N=(w+1)%l;b.push(0,1+N,1+w)}_=new xt,_.setAttribute("position",new Oe(v,3)),_.setAttribute("normal",new Oe(A,3)),_.setAttribute("uv",new Oe(L,2)),_.setIndex(b)}if(a){const v=[],A=[],L=[],b=[];let S=0;for(let w=0;w<l;w++){const N=(w+1)%l,F=u[w],B=u[N],q=h[w],H=h[N],Z=H.clone().sub(q),W=F.clone().sub(q),J=Z.clone().cross(W).normalize();v.push(q.x,q.y,q.z,H.x,H.y,H.z,B.x,B.y,B.z,F.x,F.y,F.z);for(let he=0;he<4;he++)A.push(J.x,J.y,J.z);L.push(0,0,1,0,1,1,0,1);const K=S;b.push(K,K+1,K+2,K,K+2,K+3),S+=4}y=new xt,y.setAttribute("position",new Oe(v,3)),y.setAttribute("normal",new Oe(A,3)),y.setAttribute("uv",new Oe(L,2)),y.setIndex(b)}return{top:p,bottom:_,sides:y}}createHexPrismGeometry(e,t,n,i=new P(0,0,0),s=!0,o=!0,a=!0){const{top:l,bottom:c,sides:h}=this.createSeparateGeometries(e,t,n,i,s,o,a),u=[],d=[],f=[],x=[],g=[];let m=0;const p=(y,E)=>{if(!y)return;const C=y.getAttribute("position"),v=y.getAttribute("normal"),A=y.getAttribute("uv"),L=y.getIndex();if(!(!C||!v||!A||!L)){for(let b=0;b<C.count;b++)u.push(C.getX(b),C.getY(b),C.getZ(b)),d.push(v.getX(b),v.getY(b),v.getZ(b)),f.push(A.getX(b),A.getY(b));for(let b=0;b<L.count;b+=3)x.push(L.getX(b)+m,L.getX(b+1)+m,L.getX(b+2)+m),g.push(E);m+=C.count,y.dispose()}};p(l,"top"),p(c,"bottom"),p(h,"side");const _=new xt;return _.setAttribute("position",new Oe(u,3)),_.setAttribute("normal",new Oe(d,3)),_.setAttribute("uv",new Oe(f,2)),_.setIndex(x),{geometry:_,faceTypes:g}}isSolid(e){return Em(e)}isLiquid(e){return Mm(e)}}const Rm=`// Planet distant LOD vertex shader with day/night lighting\r
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
`,Cm=`// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights\r
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
`;function el(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],torchLight:[],indices:[],vertexOffset:0}}class tl{constructor(e,t=50,n=3,i={}){M(this,"radius");M(this,"center");M(this,"polyhedron");M(this,"columns",new Map);M(this,"meshBuilder");M(this,"scene");M(this,"frustum",new Zi);M(this,"projScreenMatrix",new pt);M(this,"config");M(this,"lodChunks",[]);M(this,"lodChunkBounds",[]);M(this,"lodChunkDirections",[]);M(this,"tileToChunk",new Map);M(this,"lodMesh",null);M(this,"lodWaterMesh",null);M(this,"lodTileVisibility",new Map);M(this,"needsLODRebuild",!1);M(this,"LOD_CHUNK_COUNT",12);M(this,"distantLODMeshes",[]);M(this,"distantLODMaterials",[]);M(this,"currentDistantLODLevel",-1);M(this,"boundaryWallsGroup",null);M(this,"cachedRenderDistance",-1);M(this,"cachedNearbyTiles",new Set);M(this,"bufferCenterTiles",new Set);M(this,"pendingTilesToAdd",[]);M(this,"pendingTilesToRemove",[]);M(this,"isIncrementalRebuildActive",!1);M(this,"batchedMeshGroup",null);M(this,"needsRebatch",!0);M(this,"currentWaterMesh",null);M(this,"waterMeshCallback",null);M(this,"geometryWorker",null);M(this,"lodGeometryWorker",null);M(this,"isWorkerBuildActive",!1);M(this,"isLODWorkerBuildActive",!1);M(this,"isLODRebuildScheduled",!1);M(this,"isWaterWallsScheduled",!1);M(this,"needsWaterWallsRebuild",!1);M(this,"currentLODExcludedTileCount",0);M(this,"pendingLODExcludedCount",0);M(this,"initialTerrainBuilt",!1);M(this,"initialLODBuilt",!1);M(this,"initialBuildResolve",null);M(this,"serializedTileData",null);M(this,"serializedTileToChunk",null);M(this,"BLOCK_HEIGHT",1);M(this,"MAX_DEPTH");M(this,"MAX_HEIGHT");M(this,"DEEP_THRESHOLD",4);M(this,"SEA_LEVEL");M(this,"seed");M(this,"sunDirection",new P(U.SUN_DIRECTION.x,U.SUN_DIRECTION.y,U.SUN_DIRECTION.z).normalize());M(this,"torchData",[]);M(this,"tilesWithTorches",new Set);M(this,"ORE_CONFIGS",[{type:I.ORE_LITHIUM,minDepth:0,maxDepth:4,veinChance:.004,veinSize:4,spreadFactor:.6},{type:I.ORE_GOLD,minDepth:0,maxDepth:6,veinChance:.006,veinSize:5,spreadFactor:.65},{type:I.ORE_COBALT,minDepth:0,maxDepth:8,veinChance:.008,veinSize:6,spreadFactor:.7},{type:I.ORE_IRON,minDepth:4,maxDepth:14,veinChance:.012,veinSize:8,spreadFactor:.75},{type:I.ORE_ALUMINUM,minDepth:2,maxDepth:12,veinChance:.01,veinSize:7,spreadFactor:.72},{type:I.ORE_COPPER,minDepth:10,maxDepth:18,veinChance:.015,veinSize:10,spreadFactor:.8},{type:I.ORE_COAL,minDepth:12,maxDepth:20,veinChance:.018,veinSize:12,spreadFactor:.85}]);M(this,"oreVeinCache",new Map);M(this,"oreVeinsGenerated",!1);M(this,"BLOCK_MATERIALS",[{key:"top",getMaterial:()=>this.meshBuilder.getTopMaterial()},{key:"side",getMaterial:()=>this.meshBuilder.getSideMaterial()},{key:"grassSide",getMaterial:()=>this.meshBuilder.getGrassSideMaterial()},{key:"stone",getMaterial:()=>this.meshBuilder.getStoneMaterial()},{key:"sand",getMaterial:()=>this.meshBuilder.getSandMaterial()},{key:"wood",getMaterial:()=>this.meshBuilder.getWoodMaterial()},{key:"water",getMaterial:()=>this.meshBuilder.getWaterMaterial(),renderOrder:1},{key:"oreCoal",getMaterial:()=>this.meshBuilder.getMaterial("oreCoal")},{key:"oreCopper",getMaterial:()=>this.meshBuilder.getMaterial("oreCopper")},{key:"oreIron",getMaterial:()=>this.meshBuilder.getMaterial("oreIron")},{key:"oreGold",getMaterial:()=>this.meshBuilder.getMaterial("oreGold")},{key:"oreLithium",getMaterial:()=>this.meshBuilder.getMaterial("oreLithium")},{key:"oreAluminum",getMaterial:()=>this.meshBuilder.getMaterial("oreAluminum")},{key:"oreCobalt",getMaterial:()=>this.meshBuilder.getMaterial("oreCobalt")},{key:"snow",getMaterial:()=>this.meshBuilder.getSnowMaterial()},{key:"snowSide",getMaterial:()=>this.meshBuilder.getSnowSideMaterial()},{key:"dirtSnow",getMaterial:()=>this.meshBuilder.getDirtSnowMaterial()},{key:"ice",getMaterial:()=>this.meshBuilder.getIceMaterial(),renderOrder:2}]);M(this,"dirtyColumnsQueue",new Set);this.scene=e,this.radius=t,this.center=new P(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??U.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+U.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=U.TERRAIN_MAX_HEIGHT,this.seed=U.TERRAIN_SEED,this.polyhedron=new Qa(t,n),this.meshBuilder=new Am}depthToRadius(e){return this.radius-(this.MAX_DEPTH-1-e)*this.BLOCK_HEIGHT}getSeaLevelDepth(){return this.MAX_DEPTH-1-this.SEA_LEVEL}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.depthToRadius(this.getSeaLevelDepth())-U.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new kt,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2;this.lodChunkDirections=[new P(-1,e,0).normalize(),new P(1,e,0).normalize(),new P(-1,-e,0).normalize(),new P(1,-e,0).normalize(),new P(0,-1,e).normalize(),new P(0,1,e).normalize(),new P(0,-1,-e).normalize(),new P(0,1,-e).normalize(),new P(e,0,-1).normalize(),new P(e,0,1).normalize(),new P(-e,0,-1).normalize(),new P(-e,0,1).normalize()];const t=this.lodChunkDirections;for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let s=0,o=1/0;for(let a=0;a<t.length;a++){const l=i.distanceToSquared(t[a]);l<o&&(o=l,s=a)}this.tileToChunk.set(n.index,s)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new kt;this.lodChunks.push(i);const s=t[n].clone().multiplyScalar(this.radius).add(this.center),o=this.radius*.7;this.lodChunkBounds.push(new bi(s,o))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-CjW9m9fr.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;_e.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CPNS1EKh.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;_e.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;_e.begin("Planet.workerResult"),_e.begin("Planet.workerResult.createMeshes");const t=[],n=[{dataKey:"topData",materialKey:"top"},{dataKey:"sideData",materialKey:"side"},{dataKey:"grassSideData",materialKey:"grassSide"},{dataKey:"stoneData",materialKey:"stone"},{dataKey:"sandData",materialKey:"sand"},{dataKey:"woodData",materialKey:"wood"},{dataKey:"waterData",materialKey:"water",renderOrder:1},{dataKey:"oreCoalData",materialKey:"oreCoal"},{dataKey:"oreCopperData",materialKey:"oreCopper"},{dataKey:"oreIronData",materialKey:"oreIron"},{dataKey:"oreGoldData",materialKey:"oreGold"},{dataKey:"oreLithiumData",materialKey:"oreLithium"},{dataKey:"oreAluminumData",materialKey:"oreAluminum"},{dataKey:"oreCobaltData",materialKey:"oreCobalt"},{dataKey:"snowData",materialKey:"snow"},{dataKey:"snowSideData",materialKey:"snowSide"},{dataKey:"dirtSnowData",materialKey:"dirtSnow"},{dataKey:"iceData",materialKey:"ice",renderOrder:2}];let i=null;for(const{dataKey:a,materialKey:l,renderOrder:c}of n){const h=e[a];if(h.positions.length>0){const u=this.createBufferGeometry(h),d=this.BLOCK_MATERIALS.find(f=>f.key===l);if(d){const f=new Le(u,d.getMaterial());c!==void 0&&(f.renderOrder=c),t.push(f),l==="water"&&(i=f)}}}_e.end("Planet.workerResult.createMeshes"),this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),_e.begin("Planet.workerResult.swap");const s=[];for(;this.batchedMeshGroup.children.length>0;){const a=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(a),s.push(a)}for(const a of t)this.batchedMeshGroup.add(a);for(const a of s)a.geometry&&a.geometry.dispose();_e.end("Planet.workerResult.swap"),this.currentWaterMesh=i,i&&this.waterMeshCallback&&this.waterMeshCallback(i,!0),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,_e.end("Planet.workerResult"),this.initialTerrainBuilt||(this.initialTerrainBuilt=!0,this.checkInitialBuildComplete())}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(x=>{x instanceof Le&&x.geometry&&x.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const x of this.lodChunks)for(;x.children.length>0;){const g=x.children[0];g instanceof Le&&g.geometry&&g.geometry.dispose(),x.remove(g)}const i=performance.now()-n,s=new kt,o=(x,g,m,p,_,y)=>{const E=new xt;E.setAttribute("position",new Ct(new Float32Array(x),3)),E.setAttribute("normal",new Ct(new Float32Array(g),3)),E.setAttribute("uv",new Ct(new Float32Array(m),2)),_&&_.length>0&&E.setAttribute("skyLight",new Ct(new Float32Array(_),1));const C=x.length/3;return y&&y.length>0?E.setAttribute("torchLight",new Ct(new Float32Array(y),1)):E.setAttribute("torchLight",new Ct(new Float32Array(C).fill(0),1)),E.setIndex(p),E},a=performance.now();let l=0,c=0;for(let x=0;x<this.LOD_CHUNK_COUNT;x++){const g=e.chunkGeometries[x];if(!g)continue;const m=this.lodChunks[x];if(g.grassPositions.length>0){const p=o(g.grassPositions,g.grassNormals,g.grassUvs,g.grassIndices,g.grassSkyLight,g.grassTorchLight),_=new Le(p,this.meshBuilder.getTopLODMaterial());m.add(_),l++,c+=g.grassPositions.length/3}if(g.dirtPositions.length>0){const p=o(g.dirtPositions,g.dirtNormals,g.dirtUvs,g.dirtIndices,g.dirtSkyLight,g.dirtTorchLight),_=new Le(p,this.meshBuilder.getSideLODMaterial());m.add(_),l++,c+=g.dirtPositions.length/3}if(g.stonePositions.length>0){const p=o(g.stonePositions,g.stoneNormals,g.stoneUvs,g.stoneIndices,g.stoneSkyLight,g.stoneTorchLight),_=new Le(p,this.meshBuilder.getStoneLODMaterial());m.add(_),l++,c+=g.stonePositions.length/3}if(g.sandPositions.length>0){const p=o(g.sandPositions,g.sandNormals,g.sandUvs,g.sandIndices,g.sandSkyLight,g.sandTorchLight),_=new Le(p,this.meshBuilder.getSandLODMaterial());m.add(_),l++,c+=g.sandPositions.length/3}if(g.woodPositions.length>0){const p=o(g.woodPositions,g.woodNormals,g.woodUvs,g.woodIndices,g.woodSkyLight,g.woodTorchLight),_=new Le(p,this.meshBuilder.getWoodLODMaterial());m.add(_),l++,c+=g.woodPositions.length/3}if(g.waterPositions.length>0){const p=o(g.waterPositions,g.waterNormals,g.waterUvs,g.waterIndices),_=new Le(p,this.meshBuilder.getWaterLODMaterial());_.renderOrder=-2,m.add(_),l++,c+=g.waterPositions.length/3}if(g.sidePositions.length>0){const p=o(g.sidePositions,g.sideNormals,g.sideUvs,g.sideIndices,g.sideSkyLight,g.sideTorchLight),_=new Le(p,this.meshBuilder.getSideLODMaterial());m.add(_),l++,c+=g.sidePositions.length/3}if(g.waterSidePositions.length>0){const p=o(g.waterSidePositions,g.waterSideNormals,g.waterSideUvs,g.waterSideIndices),_=new Le(p,this.meshBuilder.getWaterLODMaterial());_.renderOrder=-2,m.add(_),l++,c+=g.waterSidePositions.length/3}if(g.snowPositions&&g.snowPositions.length>0){const p=o(g.snowPositions,g.snowNormals,g.snowUvs,g.snowIndices,g.snowSkyLight,g.snowTorchLight),_=new Le(p,this.meshBuilder.getSnowLODMaterial());m.add(_),l++,c+=g.snowPositions.length/3}if(g.icePositions&&g.icePositions.length>0){const p=o(g.icePositions,g.iceNormals,g.iceUvs,g.iceIndices,g.iceSkyLight,g.iceTorchLight),_=new Le(p,this.meshBuilder.getIceLODMaterial());m.add(_),l++,c+=g.icePositions.length/3}s.add(m)}const h=performance.now()-a,u=performance.now();s.position.copy(this.center),s.renderOrder=-1,this.scene.add(s),this.lodMesh=s;const d=performance.now()-u,f=performance.now()-t;console.log(`[LOD Build] Total: ${f.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${h.toFixed(1)}ms | Scene add: ${d.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1,this.initialLODBuilt||(this.initialLODBuilt=!0,this.checkInitialBuildComplete())}checkInitialBuildComplete(){this.initialTerrainBuilt&&this.initialLODBuilt&&this.initialBuildResolve&&(this.initialBuildResolve(),this.initialBuildResolve=null)}async buildInitialTerrain(e){const t=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(!t){console.warn("Could not find spawn tile, using default position");return}const n=U.TERRAIN_MIN_RENDER_DISTANCE,i=this.getTilesInRange(t.index,n);return this.cachedNearbyTiles=i,this.bufferCenterTiles=this.getTilesInRange(t.index,U.TERRAIN_BUFFER_ZONE),this.cachedRenderDistance=n,this.needsRebatch=!0,this.needsLODRebuild=!0,this.geometryWorker&&this.startWorkerBuild(),this.lodGeometryWorker&&this.startLODWorkerBuild(),new Promise(s=>{if(this.initialTerrainBuilt&&this.initialLODBuilt){s();return}this.initialBuildResolve=s})}isInitialTerrainReady(){return this.initialTerrainBuilt&&this.initialLODBuilt}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;_e.begin("Planet.workerBuild.serialize");const e=[],t={};for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(s){e.push({tileIndex:i,tile:{index:s.tile.index,vertices:s.tile.vertices.map(o=>({x:o.x,y:o.y,z:o.z})),center:{x:s.tile.center.x,y:s.tile.center.y,z:s.tile.center.z},neighbors:s.tile.neighbors},blocks:[...s.blocks]});for(const o of s.tile.neighbors)if(!t[o]){const a=this.columns.get(o);a&&(t[o]={blocks:[...a.blocks],vertices:a.tile.vertices.map(l=>({x:l.x,y:l.y,z:l.z}))})}s.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1;const n=this.filterRelevantTorches(e);_e.end("Planet.workerBuild.serialize"),_e.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:U.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z},uvScale:U.TERRAIN_UV_SCALE,torches:n}}),_e.end("Planet.workerBuild.postMessage")}filterRelevantTorches(e){if(this.torchData.length===0||e.length===0)return this.torchData;let t=0,n=0,i=0;for(const h of e)t+=h.tile.center.x,n+=h.tile.center.y,i+=h.tile.center.z;t/=e.length,n/=e.length,i/=e.length;let s=0;for(const h of e){const u=h.tile.center.x-t,d=h.tile.center.y-n,f=h.tile.center.z-i,x=u*u+d*d+f*f;x>s&&(s=x)}const o=Math.sqrt(s),a=U.TORCH_LIGHT_RANGE+2,l=o+a,c=l*l;return this.torchData.filter(h=>{const u=h.position.x-t,d=h.position.y-n,f=h.position.z-i;return u*u+d*d+f*f<=c})}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(_e.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,_e.end("Planet.lodWorkerBuild.serialize"),_e.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,waterSurfaceOffset:U.WATER_SURFACE_OFFSET,lodOffset:U.TERRAIN_LOD_OFFSET,chunkCount:this.LOD_CHUNK_COUNT},torches:this.torchData}),_e.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new kt,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new Qa(this.radius,t[n]),s=new xt,o=[],a=[],l=[],c=[],h=[],u=[];let d=0;const f=new Map,x=this.getSeaLevelDepth(),g=this.depthToRadius(x),m=!!this.config.texturePath;for(const y of i.tiles){const E=this.getHeightVariation(y.center),C=this.depthToRadius(E),v=!m&&E<x,A=v?g:C,L=y.center.clone().normalize().y,b=U.POLAR_THRESHOLD,S=Math.abs(L)>b;let w;if(m){const N=Math.max(.4,Math.min(1,.6+E*.02));w=new we(N*.7,N*.7,N*.7)}else v&&S?w=new we(12116208):v?w=new we(3381708):E<=0?w=new we(8947848):S?w=new we(15790320):w=new we(4885578);f.set(y.index,{radius:A,isWater:v,color:w})}for(const y of i.tiles){const E=f.get(y.index),C=E.radius,v=E.color,A=y.center.clone().normalize().multiplyScalar(C),L=y.vertices.map(ce=>ce.clone().normalize().multiplyScalar(C)),b=A.clone().normalize(),S=Math.abs(b.y)<.9?new P(0,1,0):new P(1,0,0),w=new P().crossVectors(S,b).normalize(),N=new P().crossVectors(b,w),F=[];let B=1/0,q=-1/0,H=1/0,Z=-1/0;for(const ce of y.vertices){const oe=ce.clone().sub(y.center),le=oe.dot(w),je=oe.dot(N);F.push({u:le,v:je}),B=Math.min(B,le),q=Math.max(q,le),H=Math.min(H,je),Z=Math.max(Z,je)}const W=q-B,J=Z-H,K=F.map(ce=>({u:(ce.u-B)/W,v:(ce.v-H)/J})),he={u:(0-B)/W,v:(0-H)/J},Ae=y.center.clone().normalize(),ke=y.vertices[0].clone().normalize(),Ke=Ae.angleTo(ke);let Xe=!1;for(const ce of this.torchData)if(new P(ce.position.x,ce.position.y,ce.position.z).normalize().angleTo(Ae)<Ke){Xe=!0;break}const Q=Xe?1:0,te=Xe?.3:0,pe=d;o.push(A.x,A.y,A.z),a.push(b.x,b.y,b.z),l.push(he.u,he.v),c.push(v.r,v.g,v.b),h.push(Q),d++;for(let ce=0;ce<L.length;ce++)o.push(L[ce].x,L[ce].y,L[ce].z),a.push(b.x,b.y,b.z),l.push(K[ce].u,K[ce].v),c.push(v.r,v.g,v.b),h.push(te),d++,u.push(pe,pe+1+ce,pe+1+(ce+1)%L.length);if(!E.isWater){const ce=m?new we(.5,.5,.5):new we(9139029),oe=y.vertices.length;for(let le=0;le<oe;le++){const je=(le+1)%oe,De=y.vertices[le],tt=y.vertices[je],O=De.clone().add(tt).normalize();let Ie,Ne=1/0;for(const qe of y.neighbors){const me=f.get(qe);if(!me)continue;const it=i.tiles[qe];if(!it)continue;const be=it.center.clone().normalize().distanceToSquared(O);be<Ne&&(Ne=be,Ie=me)}if(Ie&&Ie.radius<C){const qe=De.clone().normalize().multiplyScalar(Ie.radius),me=tt.clone().normalize().multiplyScalar(Ie.radius),it=tt.clone().normalize().multiplyScalar(C),be=De.clone().normalize().multiplyScalar(C),Pe=d;o.push(qe.x,qe.y,qe.z),o.push(me.x,me.y,me.z),o.push(it.x,it.y,it.z),o.push(be.x,be.y,be.z);const D=me.clone().sub(qe),T=be.clone().sub(qe),z=D.clone().cross(T).normalize();a.push(z.x,z.y,z.z),a.push(z.x,z.y,z.z),a.push(z.x,z.y,z.z),a.push(z.x,z.y,z.z),l.push(0,0,1,0,1,1,0,1),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),h.push(te),h.push(te),h.push(te),h.push(te),u.push(Pe,Pe+1,Pe+2),u.push(Pe,Pe+2,Pe+3),d+=4}}}}s.setAttribute("position",new Oe(o,3)),s.setAttribute("normal",new Oe(a,3)),s.setAttribute("uv",new Oe(l,2)),s.setAttribute("color",new Oe(c,3)),s.setAttribute("torchLight",new Oe(h,1)),s.setIndex(u);const p=new ct({uniforms:{planetCenter:{value:this.center.clone()},sunDirection:{value:new P(1,0,0)},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},darkSideAmbient:{value:U.PLANET_DARK_SIDE_AMBIENT}},vertexShader:Rm,fragmentShader:Cm,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),_=new Le(s,p);_.position.copy(this.center),_.visible=!1,_.renderOrder=-2,this.scene.add(_),this.distantLODMeshes.push(_),this.distantLODMaterials.push(p)}}rebuildDistantLODMeshes(){const e=this.currentDistantLODLevel;for(const t of this.distantLODMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof Mn&&t.material.dispose();this.distantLODMeshes=[],this.distantLODMaterials=[],this.currentDistantLODLevel=-1,this.createDistantLODMeshes(),e>=0&&this.setDistantLODVisible(e)}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(_e.begin("Planet.rebuildLODMesh"),_e.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const a=this.lodMesh;a.traverse(l=>{l instanceof Le&&l.geometry&&l.geometry.dispose()}),this.scene.remove(a),this.lodMesh=null,this.lodWaterMesh=null}for(const a of this.lodChunks)for(;a.children.length>0;){const l=a.children[0];l instanceof Le&&l.geometry&&l.geometry.dispose(),a.remove(l)}_e.end("Planet.rebuildLODMesh.cleanup");const e=U.TERRAIN_LOD_OFFSET,t=this.depthToRadius(this.getSeaLevelDepth())-e,n=[];for(let a=0;a<this.LOD_CHUNK_COUNT;a++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassTorchLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtTorchLight:[],dirtIndices:[],dirtVertexOffset:0,stonePositions:[],stoneNormals:[],stoneUvs:[],stoneSkyLight:[],stoneTorchLight:[],stoneIndices:[],stoneVertexOffset:0,sandPositions:[],sandNormals:[],sandUvs:[],sandSkyLight:[],sandTorchLight:[],sandIndices:[],sandVertexOffset:0,woodPositions:[],woodNormals:[],woodUvs:[],woodSkyLight:[],woodTorchLight:[],woodIndices:[],woodVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideTorchLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0,snowPositions:[],snowNormals:[],snowUvs:[],snowSkyLight:[],snowTorchLight:[],snowIndices:[],snowVertexOffset:0,icePositions:[],iceNormals:[],iceUvs:[],iceSkyLight:[],iceTorchLight:[],iceIndices:[],iceVertexOffset:0});const i=new Map;for(const[a,l]of this.columns){const c=l.tile,h=c.center.clone().normalize(),u=c.vertices.map(L=>L.clone().normalize()),d=Math.abs(h.y)<.9?new P(0,1,0):new P(1,0,0),f=new P().crossVectors(d,h).normalize(),x=new P().crossVectors(h,f),g=[];let m=1/0,p=-1/0,_=1/0,y=-1/0;for(const L of c.vertices){const b=L.clone().sub(c.center),S=b.dot(f),w=b.dot(x);g.push({u:S,v:w}),m=Math.min(m,S),p=Math.max(p,S),_=Math.min(_,w),y=Math.max(y,w)}const E=p-m,C=y-_,v=g.map(L=>({u:(L.u-m)/E,v:(L.v-_)/C})),A={u:(0-m)/E,v:(0-_)/C};i.set(a,{normalizedCenter:h,normalizedVertices:u,normalizedUVs:v,centerUV:A})}_e.begin("Planet.rebuildLODMesh.pass1");const s=new Map;for(const[a,l]of this.columns){let c=0,h=I.GRASS,u=0;for(let g=l.blocks.length-1;g>=0;g--)if(l.blocks[g]!==I.AIR&&(h===I.GRASS&&(c=g,h=l.blocks[g]),l.blocks[g]!==I.WATER)){u=g;break}let d;const f=h===I.WATER;f?d=t:d=this.depthToRadius(c)-e;const x=this.depthToRadius(u)-e;s.set(a,{radius:d,isWater:f,surfaceBlockType:h,terrainRadius:x})}_e.end("Planet.rebuildLODMesh.pass1"),_e.begin("Planet.rebuildLODMesh.pass2");for(const[a]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const l=s.get(a);if(!l)continue;const c=l.surfaceBlockType,h=l.radius,u=i.get(a);if(!u)continue;const d=u.normalizedCenter,f=d.clone().multiplyScalar(h),x=u.normalizedVertices.map(w=>w.clone().multiplyScalar(h)),g=this.tileToChunk.get(a)??0,m=n[g];let p,_,y,E,C,v,A;c===I.WATER?(p=m.waterPositions,_=m.waterNormals,y=m.waterUvs,E=null,C=null,v=m.waterIndices,A=m.waterVertexOffset):c===I.DIRT?(p=m.dirtPositions,_=m.dirtNormals,y=m.dirtUvs,E=m.dirtSkyLight,C=m.dirtTorchLight,v=m.dirtIndices,A=m.dirtVertexOffset):c===I.STONE?(p=m.stonePositions,_=m.stoneNormals,y=m.stoneUvs,E=m.stoneSkyLight,C=m.stoneTorchLight,v=m.stoneIndices,A=m.stoneVertexOffset):c===I.SAND?(p=m.sandPositions,_=m.sandNormals,y=m.sandUvs,E=m.sandSkyLight,C=m.sandTorchLight,v=m.sandIndices,A=m.sandVertexOffset):c===I.WOOD?(p=m.woodPositions,_=m.woodNormals,y=m.woodUvs,E=m.woodSkyLight,C=m.woodTorchLight,v=m.woodIndices,A=m.woodVertexOffset):c===I.SNOW||c===I.DIRT_SNOW?(p=m.snowPositions,_=m.snowNormals,y=m.snowUvs,E=m.snowSkyLight,C=m.snowTorchLight,v=m.snowIndices,A=m.snowVertexOffset):c===I.ICE?(p=m.icePositions,_=m.iceNormals,y=m.iceUvs,E=m.iceSkyLight,C=m.iceTorchLight,v=m.iceIndices,A=m.iceVertexOffset):(p=m.grassPositions,_=m.grassNormals,y=m.grassUvs,E=m.grassSkyLight,C=m.grassTorchLight,v=m.grassIndices,A=m.grassVertexOffset);const b=this.tilesWithTorches.has(a)?1:0,S=A;p.push(f.x,f.y,f.z),_.push(d.x,d.y,d.z),y.push(u.centerUV.u,u.centerUV.v),E&&E.push(1),C&&C.push(b),A++;for(let w=0;w<x.length;w++)p.push(x[w].x,x[w].y,x[w].z),_.push(d.x,d.y,d.z),y.push(u.normalizedUVs[w].u,u.normalizedUVs[w].v),E&&E.push(1),C&&C.push(b),A++,v.push(S,S+1+w,S+1+(w+1)%x.length);c===I.WATER?m.waterVertexOffset=A:c===I.DIRT?m.dirtVertexOffset=A:c===I.STONE?m.stoneVertexOffset=A:c===I.SAND?m.sandVertexOffset=A:c===I.WOOD?m.woodVertexOffset=A:c===I.SNOW||c===I.DIRT_SNOW?m.snowVertexOffset=A:c===I.ICE?m.iceVertexOffset=A:m.grassVertexOffset=A,this.lodTileVisibility.set(a,!0)}_e.end("Planet.rebuildLODMesh.pass2"),_e.begin("Planet.rebuildLODMesh.pass3");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=l.tile,h=s.get(a),u=(h==null?void 0:h.radius)??this.radius,d=(h==null?void 0:h.isWater)??!1,f=c.vertices.length,x=i.get(a);if(!x)continue;const g=x.normalizedVertices,m=this.tileToChunk.get(a)??0,p=n[m];for(let _=0;_<f;_++){const y=(_+1)%f,E=g[_],C=g[y],v=E.x+C.x,A=E.y+C.y,L=E.z+C.z,b=Math.sqrt(v*v+A*A+L*L),S=v/b,w=A/b,N=L/b;let F,B=1/0,q=!1;for(const ie of c.neighbors){const j=i.get(ie);if(!j)continue;const Ce=j.normalizedCenter,ge=Ce.x-S,Fe=Ce.y-w,Re=Ce.z-N,se=ge*ge+Fe*Fe+Re*Re;if(se<B){B=se;const ae=s.get(ie);F=ae==null?void 0:ae.radius,q=(ae==null?void 0:ae.isWater)??!1}}if(F===void 0||!(u>F||d&&!q))continue;const Z=E.x*F,W=E.y*F,J=E.z*F,K=C.x*F,he=C.y*F,Ae=C.z*F,ke=C.x*u,Ke=C.y*u,Xe=C.z*u,Q=E.x*u,te=E.y*u,pe=E.z*u,ce=K-Z,oe=he-W,le=Ae-J,je=Q-Z,De=te-W,tt=pe-J;let O=oe*tt-le*De,Ie=le*je-ce*tt,Ne=ce*De-oe*je;const qe=Math.sqrt(O*O+Ie*Ie+Ne*Ne);qe>0&&(O/=qe,Ie/=qe,Ne/=qe);const me=d?p.waterSidePositions:p.sidePositions,it=d?p.waterSideNormals:p.sideNormals,be=d?p.waterSideUvs:p.sideUvs,Pe=d?null:p.sideSkyLight,D=d?null:p.sideTorchLight,T=d?p.waterSideIndices:p.sideIndices,z=d?p.waterSideVertexOffset:p.sideVertexOffset,ee=this.tilesWithTorches.has(a)?1:0;me.push(Z,W,J,K,he,Ae,ke,Ke,Xe,Q,te,pe),it.push(O,Ie,Ne,O,Ie,Ne,O,Ie,Ne,O,Ie,Ne),be.push(0,0,1,0,1,1,0,1),Pe&&Pe.push(1,1,1,1),D&&D.push(ee,ee,ee,ee),T.push(z,z+1,z+2,z,z+2,z+3),d?p.waterSideVertexOffset+=4:p.sideVertexOffset+=4}}_e.end("Planet.rebuildLODMesh.pass3"),_e.begin("Planet.rebuildLODMesh.pass4");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=s.get(a);if(!((c==null?void 0:c.isWater)??!1))continue;const u=l.tile,d=u.vertices.length,f=i.get(a);if(!f)continue;const x=f.normalizedVertices,g=this.tileToChunk.get(a)??0,m=n[g];for(let p=0;p<d;p++){const _=(p+1)%d,y=x[p],E=x[_],C=y.x+E.x,v=y.y+E.y,A=y.z+E.z,L=Math.sqrt(C*C+v*v+A*A),b=C/L,S=v/L,w=A/L;let N,F=1/0;for(const it of u.neighbors){const be=i.get(it);if(!be)continue;const Pe=be.normalizedCenter,D=Pe.x-b,T=Pe.y-S,z=Pe.z-w,ee=D*D+T*T+z*z;ee<F&&(F=ee,N=it)}if(N===void 0||!this.cachedNearbyTiles.has(N))continue;const B=s.get(N);if(!B)continue;const q=B.terrainRadius,H=t;if(q>=H)continue;const Z=y.x*q,W=y.y*q,J=y.z*q,K=E.x*q,he=E.y*q,Ae=E.z*q,ke=E.x*H,Ke=E.y*H,Xe=E.z*H,Q=y.x*H,te=y.y*H,pe=y.z*H,ce=K-Z,oe=he-W,le=Ae-J,je=Q-Z,De=te-W,tt=pe-J;let O=oe*tt-le*De,Ie=le*je-ce*tt,Ne=ce*De-oe*je;const qe=Math.sqrt(O*O+Ie*Ie+Ne*Ne);qe>0&&(O/=qe,Ie/=qe,Ne/=qe);const me=m.waterSideVertexOffset;m.waterSidePositions.push(Z,W,J,K,he,Ae,ke,Ke,Xe,Q,te,pe),m.waterSideNormals.push(O,Ie,Ne,O,Ie,Ne,O,Ie,Ne,O,Ie,Ne),m.waterSideUvs.push(0,0,1,0,1,1,0,1),m.waterSideIndices.push(me,me+1,me+2,me,me+2,me+3),m.waterSideVertexOffset+=4}}_e.end("Planet.rebuildLODMesh.pass4"),_e.begin("Planet.rebuildLODMesh.createMeshes");const o=new kt;for(let a=0;a<this.LOD_CHUNK_COUNT;a++){const l=n[a],c=this.lodChunks[a];for(;c.children.length>0;)c.remove(c.children[0]);const h=(u,d,f,x,g,m)=>{const p=new xt;if(p.setAttribute("position",new Oe(u,3)),p.setAttribute("normal",new Oe(d,3)),p.setAttribute("uv",new Oe(f,2)),g&&g.length>0&&p.setAttribute("skyLight",new Oe(g,1)),m&&m.length>0)p.setAttribute("torchLight",new Oe(m,1));else{const _=u.length/3;p.setAttribute("torchLight",new Oe(new Float32Array(_).fill(0),1))}return p.setIndex(x),p};if(l.grassPositions.length>0){const u=h(l.grassPositions,l.grassNormals,l.grassUvs,l.grassIndices,l.grassSkyLight,l.grassTorchLight),d=new Le(u,this.meshBuilder.getTopLODMaterial());c.add(d)}if(l.dirtPositions.length>0){const u=h(l.dirtPositions,l.dirtNormals,l.dirtUvs,l.dirtIndices,l.dirtSkyLight,l.dirtTorchLight),d=new Le(u,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.stonePositions.length>0){const u=h(l.stonePositions,l.stoneNormals,l.stoneUvs,l.stoneIndices,l.stoneSkyLight,l.stoneTorchLight),d=new Le(u,this.meshBuilder.getStoneLODMaterial());c.add(d)}if(l.sandPositions.length>0){const u=h(l.sandPositions,l.sandNormals,l.sandUvs,l.sandIndices,l.sandSkyLight,l.sandTorchLight),d=new Le(u,this.meshBuilder.getSandLODMaterial());c.add(d)}if(l.woodPositions.length>0){const u=h(l.woodPositions,l.woodNormals,l.woodUvs,l.woodIndices,l.woodSkyLight,l.woodTorchLight),d=new Le(u,this.meshBuilder.getWoodLODMaterial());c.add(d)}if(l.snowPositions.length>0){const u=h(l.snowPositions,l.snowNormals,l.snowUvs,l.snowIndices,l.snowSkyLight,l.snowTorchLight),d=new Le(u,this.meshBuilder.getSnowLODMaterial());c.add(d)}if(l.icePositions.length>0){const u=h(l.icePositions,l.iceNormals,l.iceUvs,l.iceIndices,l.iceSkyLight,l.iceTorchLight),d=new Le(u,this.meshBuilder.getIceLODMaterial());c.add(d)}if(l.waterPositions.length>0){const u=new xt;u.setAttribute("position",new Oe(l.waterPositions,3)),u.setAttribute("normal",new Oe(l.waterNormals,3)),u.setAttribute("uv",new Oe(l.waterUvs,2)),u.setIndex(l.waterIndices);const d=new Le(u,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}if(l.sidePositions.length>0){const u=h(l.sidePositions,l.sideNormals,l.sideUvs,l.sideIndices,l.sideSkyLight,l.sideTorchLight),d=new Le(u,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.waterSidePositions.length>0){const u=new xt;u.setAttribute("position",new Oe(l.waterSidePositions,3)),u.setAttribute("normal",new Oe(l.waterSideNormals,3)),u.setAttribute("uv",new Oe(l.waterSideUvs,2)),u.setIndex(l.waterSideIndices);const d=new Le(u,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}o.add(c)}o.position.copy(this.center),o.renderOrder=-1,this.scene.add(o),this.lodMesh=o,_e.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,_e.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath;this.generateOreVeins();const t=new Map;for(const s of this.polyhedron.tiles){const o=this.getHeightVariation(s.center);t.set(s.index,o)}const n=this.MAX_DEPTH-1-this.SEA_LEVEL,i=new Set;if(e){for(const s of this.polyhedron.tiles)if((t.get(s.index)??n)>=n){for(const a of s.neighbors)if((t.get(a)??n)<n){i.add(s.index);break}}console.log(`[Beach detection] Found ${i.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`)}for(const s of this.polyhedron.tiles){const o=[],a=t.get(s.index)??n,l=i.has(s.index),c=s.center.clone().normalize().y,h=U.POLAR_THRESHOLD,u=Math.abs(c)>h,d=e&&a<n;for(let g=0;g<this.MAX_DEPTH;g++)if(g>a)o.push(I.AIR);else if(g===a)l&&!u?o.push(I.SAND):d?o.push(I.DIRT):u?o.push(I.SNOW):o.push(I.GRASS);else if(g>a-3)l&&!u?o.push(I.SAND):o.push(I.DIRT);else{const m=this.getOreAtDepth(g,s.index);o.push(m)}const f=new bi(s.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),x={tile:s,blocks:o,isDirty:!0,boundingSphere:f};this.columns.set(s.index,x)}e&&this.fillOceans()}generateOreVeins(){if(this.oreVeinsGenerated)return;const e=n=>{const i=Math.sin(n)*43758.5453;return i-Math.floor(i)},t=new Map;for(const n of this.polyhedron.tiles)t.set(n.index,n.neighbors);for(const n of this.ORE_CONFIGS){const i=n.type*31337;for(const s of this.polyhedron.tiles){const o=s.index;for(let a=n.minDepth;a<=n.maxDepth;a++){const l=`${o},${a}`;if(this.oreVeinCache.has(l))continue;const c=U.TERRAIN_SEED+i+o*7919+a*104729;e(c)<n.veinChance&&this.spreadOreVein(o,a,n,e,c,t)}}}this.oreVeinsGenerated=!0}spreadOreVein(e,t,n,i,s,o){const a=[],l=new Set;a.push({tileIndex:e,depth:t,probability:1});let c=0;const h=n.veinSize+Math.floor(i(s+999)*n.veinSize*.5);for(;a.length>0&&c<h;){const u=a.shift(),d=`${u.tileIndex},${u.depth}`;if(l.has(d)||(l.add(d),u.depth<n.minDepth||u.depth>n.maxDepth))continue;const f=s+u.tileIndex*13+u.depth*17;if(i(f)>u.probability||this.oreVeinCache.has(d))continue;this.oreVeinCache.set(d,n.type),c++;const x=u.probability*n.spreadFactor;if(x<.1)continue;a.push({tileIndex:u.tileIndex,depth:u.depth-1,probability:x}),a.push({tileIndex:u.tileIndex,depth:u.depth+1,probability:x});const g=o.get(u.tileIndex);if(g)for(const m of g)a.push({tileIndex:m,depth:u.depth,probability:x*.9})}}getOreAtDepth(e,t){const n=`${t},${e}`;return this.oreVeinCache.get(n)||I.STONE}fillOceans(){const e=this.MAX_DEPTH-1-this.SEA_LEVEL,t=U.POLAR_THRESHOLD;for(const[n,i]of this.columns){const s=i.tile.center.clone().normalize().y,o=Math.abs(s)>t;let a=!1;for(let l=i.blocks.length-1;l>=0&&i.blocks[l]===I.AIR;l--)l<=e&&(o&&!a&&l===e?(i.blocks[l]=I.ICE,a=!0):i.blocks[l]=I.WATER,i.isDirty=!0)}this.cascadeWaterInColumns()}cascadeWaterInColumns(){let e=0;for(const[t,n]of this.columns){let i=!1;for(let s=n.blocks.length-1;s>=0;s--){const o=n.blocks[s];o===I.WATER?i=!0:o===I.AIR?i&&(n.blocks[s]=I.WATER,n.isDirty=!0,e++):i=!1}}e>0&&console.log(`[Water cascade] Filled ${e} air blocks below water in columns`)}updateWaterFlow(e){let t=0;for(const n of e){const i=this.columns.get(n);if(!i)continue;let s=!0;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===I.WATER?s||(i.blocks[a]=I.AIR,i.isDirty=!0,t++):l===I.AIR||(s=!1)}let o=!1;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===I.WATER?o=!0:l===I.AIR?o&&(i.blocks[a]=I.WATER,i.isDirty=!0,t++):o=!1}}return t}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkDirections[e];this.lodChunkBounds[e].center.set(t.x*this.radius+this.center.x,t.y*this.radius+this.center.y,t.z*this.radius+this.center.z)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=U.TERRAIN_CONTINENT_SCALE,s=U.TERRAIN_MOUNTAIN_SCALE,o=U.TERRAIN_DETAIL_SCALE,a=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(a)*Math.pow(Math.abs(a),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,s,4,.5,2.2),h=Math.max(0,l),u=c*h*U.TERRAIN_MOUNTAIN_HEIGHT,d=this.fractalSimplex3D(n.x,n.y,n.z,U.TERRAIN_HILL_SCALE,3,.5,2),f=this.fractalSimplex3D(n.x,n.y,n.z,o,2,.5,2);let x=l*U.TERRAIN_CONTINENT_WEIGHT;x+=u,x+=d*U.TERRAIN_HILL_WEIGHT*(h>.1?1:.3),x+=f*U.TERRAIN_DETAIL_WEIGHT;const g=this.MAX_DEPTH-1-this.SEA_LEVEL;let m;if(x>=0){const p=x*this.MAX_HEIGHT*t;m=g+p}else{const _=Math.pow(Math.abs(x),U.TERRAIN_OCEAN_DEPTH_POWER)*U.TERRAIN_MAX_DEPTH*t;m=g-_}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(m)))}simplex3D(e,t,n){const i=.3333333333333333,s=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const o=(e+t+n)*i,a=Math.floor(e+o),l=Math.floor(t+o),c=Math.floor(n+o),h=(a+l+c)*s,u=a-h,d=l-h,f=c-h,x=e-u,g=t-d,m=n-f;let p,_,y,E,C,v;x>=g?g>=m?(p=1,_=0,y=0,E=1,C=1,v=0):x>=m?(p=1,_=0,y=0,E=1,C=0,v=1):(p=0,_=0,y=1,E=1,C=0,v=1):g<m?(p=0,_=0,y=1,E=0,C=1,v=1):x<m?(p=0,_=1,y=0,E=0,C=1,v=1):(p=0,_=1,y=0,E=1,C=1,v=0);const A=x-p+s,L=g-_+s,b=m-y+s,S=x-E+2*s,w=g-C+2*s,N=m-v+2*s,F=x-1+3*s,B=g-1+3*s,q=m-1+3*s;let H=0,Z=0,W=0,J=0,K=.6-x*x-g*g-m*m;K>=0&&(K*=K,H=K*K*this.grad3D(a,l,c,x,g,m));let he=.6-A*A-L*L-b*b;he>=0&&(he*=he,Z=he*he*this.grad3D(a+p,l+_,c+y,A,L,b));let Ae=.6-S*S-w*w-N*N;Ae>=0&&(Ae*=Ae,W=Ae*Ae*this.grad3D(a+E,l+C,c+v,S,w,N));let ke=.6-F*F-B*B-q*q;return ke>=0&&(ke*=ke,J=ke*ke*this.grad3D(a+1,l+1,c+1,F,B,q)),32*(H+Z+W+J)}grad3D(e,t,n,i,s,o){const a=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][a];return c[0]*i+c[1]*s+c[2]*o}fractalSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,h=i,u=0;for(let d=0;d<s;d++)l+=this.simplex3D(e*h,t*h,n*h)*c,u+=c,c*=o,h*=a;return l/u}ridgeSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,h=i,u=0;for(let d=0;d<s;d++){const f=this.simplex3D(e*h,t*h,n*h),x=1-Math.abs(f);l+=x*x*c,u+=c,c*=o,h*=a}return l/u}hash3D(e,t,n){const i=this.seed;let s=e*374761393+t*668265263+n*1274126177+i|0;return s=(s^s>>13)*1274126177|0,s^s>>16}update(e,t,n,i){i?this.frustum.copy(i):(_e.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),_e.end("Planet.frustum"));const s=n;s&&s>100&&console.log("you got serious issues lol "+n);const o=e.distanceTo(this.center),a=o-this.radius,l=this.getDistantLODLevel(o);if(l>=0){this.setDistantLODVisible(l),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(a>U.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const p=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!p);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const c=Math.min(1,Math.max(0,a/100)),h=U.TERRAIN_MIN_RENDER_DISTANCE,u=U.TERRAIN_MAX_RENDER_DISTANCE,d=Math.floor(h+c*(u-h));_e.begin("Planet.getTile");const f=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(_e.end("Planet.getTile"),!f)return;const x=f.index;this.isIncrementalRebuildActive&&(_e.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),_e.end("Planet.incrementalRebuild"));const g=U.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(x)||d!==this.cachedRenderDistance){_e.begin("Planet.tilesInRange");const p=this.getTilesInRange(x,d),_=[],y=[];for(const E of p)this.cachedNearbyTiles.has(E)||_.push(E);for(const E of this.cachedNearbyTiles)p.has(E)||y.push(E);if(this.bufferCenterTiles=this.getTilesInRange(x,g),this.cachedRenderDistance=d,_.length>0||y.length>0){this.cachedNearbyTiles=p;const E=this.polyhedron.tiles[x].center;_.sort((C,v)=>{const A=this.polyhedron.tiles[C].center.distanceToSquared(E);return this.polyhedron.tiles[v].center.distanceToSquared(E)-A}),y.sort((C,v)=>{const A=this.polyhedron.tiles[C].center.distanceToSquared(E),L=this.polyhedron.tiles[v].center.distanceToSquared(E);return A-L}),this.pendingTilesToAdd.push(..._),this.pendingTilesToRemove.push(...y),this.isIncrementalRebuildActive=!0,console.log("[needsRebatch=true] cachedNearbyTiles changed"),this.needsRebatch=!0,this.needsLODRebuild=!0,_e.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),_e.end("Planet.boundaryWalls")}_e.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(_e.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),_e.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(console.log("[startWorkerBuild] needsRebatch was true, starting worker build"),this.geometryWorker?(_e.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),_e.end("Planet.startWorkerBuild")):(_e.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),_e.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(_=>setTimeout(_,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(_e.begin("Planet.LODRebuild"),this.rebuildLODMesh(),_e.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(_=>setTimeout(_,0)))(()=>{this.needsWaterWallsRebuild&&(_e.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),_e.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=U.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,console.log("[needsRebatch=true] incremental rebuild complete"),this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),this.currentWaterMesh=null;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=el();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const s=this.createBufferGeometry(i),o=new Le(s,n.getMaterial());n.renderOrder!==void 0&&(o.renderOrder=n.renderOrder),this.batchedMeshGroup.add(o),n.key==="water"&&(this.currentWaterMesh=o,this.waterMeshCallback&&this.waterMeshCallback(o,!0))}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}getBlockTopMaterialKey(e){switch(e){case I.WATER:return"water";case I.STONE:return"stone";case I.SAND:return"sand";case I.DIRT:return"side";case I.WOOD:return"wood";case I.GRASS:return"top";case I.ORE_COAL:return"oreCoal";case I.ORE_COPPER:return"oreCopper";case I.ORE_IRON:return"oreIron";case I.ORE_GOLD:return"oreGold";case I.ORE_LITHIUM:return"oreLithium";case I.ORE_ALUMINUM:return"oreAluminum";case I.ORE_COBALT:return"oreCobalt";case I.SNOW:return"snow";case I.DIRT_SNOW:return"dirtSnow";case I.ICE:return"ice";default:return"top"}}getBlockSideMaterialKey(e){switch(e){case I.STONE:return"stone";case I.SAND:return"sand";case I.DIRT:return"side";case I.WOOD:return"wood";case I.GRASS:return"grassSide";case I.ORE_COAL:return"oreCoal";case I.ORE_COPPER:return"oreCopper";case I.ORE_IRON:return"oreIron";case I.ORE_GOLD:return"oreGold";case I.ORE_LITHIUM:return"oreLithium";case I.ORE_ALUMINUM:return"oreAluminum";case I.ORE_COBALT:return"oreCobalt";case I.SNOW:return"snowSide";case I.DIRT_SNOW:return"dirtSnow";case I.ICE:return"ice";default:return"side"}}getBlockBottomMaterialKey(e){switch(e){case I.STONE:return"stone";case I.SAND:return"sand";case I.WOOD:return"wood";case I.ORE_COAL:return"oreCoal";case I.ORE_COPPER:return"oreCopper";case I.ORE_IRON:return"oreIron";case I.ORE_GOLD:return"oreGold";case I.ORE_LITHIUM:return"oreLithium";case I.ORE_ALUMINUM:return"oreAluminum";case I.ORE_COBALT:return"oreCobalt";case I.SNOW:return"dirtSnow";case I.DIRT_SNOW:return"dirtSnow";case I.ICE:return"ice";default:return"side"}}buildColumnGeometry(e,t){let n=0;for(let i=e.blocks.length-1;i>=0;i--)if(e.blocks[i]!==I.AIR&&e.blocks[i]!==I.WATER){n=i;break}for(let i=0;i<e.blocks.length;i++){const s=e.blocks[i];if(s===I.AIR)continue;const o=s===I.WATER,a=i>=e.blocks.length-1?I.AIR:e.blocks[i+1],l=i===0?I.AIR:e.blocks[i-1],c=a===I.AIR||!o&&a===I.WATER,h=l===I.AIR||!o&&l===I.WATER;if(o&&a!==I.AIR)continue;const u=this.hasExposedSide(e,i);if(!o&&!c&&!h&&!u)continue;let d=this.depthToRadius(i),f=d-this.BLOCK_HEIGHT;if(o&&(d-=U.WATER_SURFACE_OFFSET,f-=U.WATER_SURFACE_OFFSET),f<=0)continue;const x=n-i,g=.8,m=.05;let p=1;x>0&&(p=Math.max(m,Math.pow(g,x)));const{top:_,bottom:y,sides:E}=this.meshBuilder.createSeparateGeometries(e.tile,f,d,new P(0,0,0),o?!0:c,o?!1:h,o?!1:u);if(_){const C=_.getAttribute("position"),v=_.getAttribute("normal"),A=_.getAttribute("uv"),L=_.getIndex();if(C&&v&&A&&L){const b=this.getBlockTopMaterialKey(s),S=o?1:p;this.mergeGeometry(t[b],C,v,A,L,this.sunDirection,S)}_.dispose()}if(y&&!o){const C=y.getAttribute("position"),v=y.getAttribute("normal"),A=y.getAttribute("uv"),L=y.getIndex();if(C&&v&&A&&L){const b=Math.max(m,p*g),S=this.getBlockBottomMaterialKey(s);this.mergeGeometry(t[S],C,v,A,L,this.sunDirection,b)}y.dispose()}if(E){const C=E.getAttribute("position"),v=E.getAttribute("normal"),A=E.getAttribute("uv"),L=E.getIndex();if(C&&v&&A&&L){const b=this.getBlockSideMaterialKey(s);this.mergeGeometry(t[b],C,v,A,L,this.sunDirection,p)}E.dispose()}o&&this.buildWaterSideFaces(e,i,f,d,t.water)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e);for(const t of this.distantLODMaterials)t.uniforms.sunDirection.value.copy(e)}setTorchData(e){this.torchData=e.map(t=>({position:{x:t.position.x-this.center.x,y:t.position.y-this.center.y,z:t.position.z-this.center.z},range:t.range,intensity:t.intensity})),this.rebuildDistantLODMeshes()}setTilesWithTorches(e){this.tilesWithTorches=e}markTilesNearTorchDirty(e,t){const n=this.getTileAtPoint(e);if(!n)return;const i=this.columns.get(n.index);if(i&&this.cachedNearbyTiles.has(n.index)){i.isDirty=!0,this.queueDirtyColumnRebuild(n.index);for(const s of i.tile.neighbors){const o=this.columns.get(s);o&&this.cachedNearbyTiles.has(s)&&(o.isDirty=!0,this.queueDirtyColumnRebuild(s))}}}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}setWaterMeshCallback(e){this.waterMeshCallback=e,this.currentWaterMesh&&e(this.currentWaterMesh,!0)}getTilesInRange(e,t){const n=new Set,i=new Set,s=[{index:e,distance:0}];let o=0;for(;o<s.length;){const a=s[o++];if(!i.has(a.index)&&(i.add(a.index),a.distance<=t)){n.add(a.index);const l=this.polyhedron.tiles[a.index];for(const c of l.neighbors)i.has(c)||s.push({index:c,distance:a.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Le&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,s,o,a=1){for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),u=t.getZ(l),d=n.getX(l),f=n.getY(l),x=n.getZ(l);e.positions.push(c,h,u),e.normals.push(d,f,x),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(a),e.torchLight.push(this.calculateTorchLightAtPosition(c,h,u));{const g=Math.sqrt(c*c+h*h+u*u);let m=1;if(g>0){const p=c/g,_=h/g,y=u/g,E=p*o.x+_*o.y+y*o.z;m=Math.max(.2,E*.5+.5)}e.colors.push(m,m,m)}}for(let l=0;l<s.count;l++)e.indices.push(s.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}calculateTorchLightAtPosition(e,t,n){let i=0;for(const s of this.torchData){const o=e-s.position.x,a=t-s.position.y,l=n-s.position.z,c=Math.sqrt(o*o+a*a+l*l);if(c<s.range){const h=1/(1+2*c*c/(s.range*s.range));i+=h*s.intensity}}return Math.min(i,1.5)}createBufferGeometry(e){const t=new xt;if(t.setAttribute("position",new Oe(e.positions,3)),t.setAttribute("normal",new Oe(e.normals,3)),t.setAttribute("uv",new Oe(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new Oe(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new Oe(e.skyLight,1)),e.torchLight&&e.torchLight.length>0)t.setAttribute("torchLight",new Oe(e.torchLight,1));else{const n=e.positions.length/3;t.setAttribute("torchLight",new Oe(new Float32Array(n).fill(0),1))}return t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const s of e.tile.neighbors){const o=this.columns.get(s);if(o&&t<o.blocks.length){const a=o.blocks[t];if(i&&(a===I.AIR||a===I.WATER)||n===I.WATER&&a===I.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,s){const o=e.tile,a=o.vertices.length,l=.001;for(let c=0;c<a;c++){const h=(c+1)%a,u=o.vertices[c],d=o.vertices[h];let f;for(const F of o.neighbors){const B=this.columns.get(F);if(!B)continue;const q=B.tile;let H=!1,Z=!1;for(const W of q.vertices)W.distanceTo(u)<l&&(H=!0),W.distanceTo(d)<l&&(Z=!0);if(H&&Z){f=B;break}}if(!f||f.blocks[t]!==I.AIR)continue;let x=0;for(let F=t-1;F>=0;F--){const B=e.blocks[F];if(B!==I.AIR&&B!==I.WATER){x=F;break}}let g=0;for(let F=t-1;F>=0;F--){const B=f.blocks[F];if(B!==I.AIR&&B!==I.WATER){g=F;break}}const m=Math.max(x,g),p=i,_=this.depthToRadius(m);if(_>=p)continue;const y=u.clone().normalize(),E=d.clone().normalize(),C=y.clone().multiplyScalar(p),v=E.clone().multiplyScalar(p),A=y.clone().multiplyScalar(_),L=E.clone().multiplyScalar(_),b=L.clone().sub(A),S=C.clone().sub(A),w=b.clone().cross(S).normalize(),N=s.vertexOffset;s.positions.push(A.x,A.y,A.z,L.x,L.y,L.z,v.x,v.y,v.z,C.x,C.y,C.z);for(let F=0;F<4;F++)s.normals.push(w.x,w.y,w.z);s.uvs.push(0,0,1,0,1,1,0,1),s.skyLight.push(1,1,1,1),s.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),s.indices.push(N,N+1,N+2,N,N+2,N+3),s.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?I.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const s=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const a of i.tile.neighbors){const l=this.columns.get(a);l&&(l.isDirty=!0)}let o=0;for(let a=0;a<i.blocks.length;a++)if(i.blocks[a]!==I.AIR&&i.blocks[a]!==I.WATER){o=a;break}t<=o+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const a of i.tile.neighbors)this.cachedNearbyTiles.has(a)&&this.queueDirtyColumnRebuild(a);this.meshBuilder.isSolid(s)&&n===I.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0||this.isWorkerBuildActive||this.geometryWorker&&(console.log("[needsRebatch=true] rebuildDirtyColumns"),this.needsRebatch=!0,this.dirtyColumnsQueue.clear())}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=el(),t=this.getSeaLevelDepth(),n=this.depthToRadius(t)-U.WATER_SURFACE_OFFSET;for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(!s)continue;const o=s.tile;for(let a=0;a<o.vertices.length;a++){const l=(a+1)%o.vertices.length,c=o.vertices[a],h=o.vertices[l],u=c.clone().add(h).normalize();let d,f=1/0;for(const w of o.neighbors){const N=this.columns.get(w);if(!N)continue;const F=N.tile.center.clone().normalize().distanceToSquared(u);F<f&&(f=F,d=w)}if(d===void 0||this.cachedNearbyTiles.has(d))continue;let x=!1,g=0;for(let w=s.blocks.length-1;w>=0;w--){const N=s.blocks[w];if(N===I.WATER)x=!0;else if(N!==I.AIR){g=w;break}}if(!x||g>=t)continue;const p=this.depthToRadius(g),_=n;if(p>=_)continue;const y=c.clone().normalize().multiplyScalar(p),E=h.clone().normalize().multiplyScalar(p),C=h.clone().normalize().multiplyScalar(_),v=c.clone().normalize().multiplyScalar(_),A=E.clone().sub(y),L=v.clone().sub(y),b=A.clone().cross(L).normalize(),S=e.vertexOffset;e.positions.push(y.x,y.y,y.z,E.x,E.y,E.z,C.x,C.y,C.z,v.x,v.y,v.z);for(let w=0;w<4;w++)e.normals.push(b.x,b.y,b.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(S,S+1,S+2),e.indices.push(S,S+2,S+3),e.vertexOffset+=4}}if(e.positions.length>0){const i=this.createBufferGeometry(e),s=this.meshBuilder.getSeaWallMaterial();if(s){const o=new Le(i,s);o.renderOrder=2,this.batchedMeshGroup.add(o)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t<n.blocks.length-1&&n.blocks[t+1]===I.WATER&&(i=!0);for(const s of n.tile.neighbors){const o=this.columns.get(s);o&&o.blocks[t]===I.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],s=[],o=500;for(;i.length>0;){const{tileIndex:u,depth:d}=i.shift(),f=`${u}-${d}`;if(n.has(f))continue;if(n.add(f),n.size>o)return;const x=this.columns.get(u);if(!x||d<0||d>=x.blocks.length)continue;const g=x.blocks[d];if(!(g!==I.AIR&&g!==I.WATER)){if(s.push({tileIndex:u,depth:d,isWater:g===I.WATER}),d>0){const m=x.blocks[d-1];(m===I.AIR||m===I.WATER)&&i.push({tileIndex:u,depth:d-1})}if(d<x.blocks.length-1){const m=x.blocks[d+1];(m===I.AIR||m===I.WATER)&&i.push({tileIndex:u,depth:d+1})}for(const m of x.tile.neighbors){const p=this.columns.get(m);if(p){const _=p.blocks[d];(_===I.AIR||_===I.WATER)&&i.push({tileIndex:m,depth:d})}}}}const a=s.filter(u=>u.isWater).length;if(a===0)return;s.sort((u,d)=>u.depth-d.depth);let l=a;const c=[],h=[];for(const u of s)l>0?(c.push(u),l--):h.push(u);for(const u of c){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===I.AIR){d.blocks[u.depth]=I.WATER,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const x=this.columns.get(f);x&&(x.isDirty=!0)}}}for(const u of h){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===I.WATER){d.blocks[u.depth]=I.AIR,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const x=this.columns.get(f);x&&(x.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getDepthAtPoint(e){const t=e.distanceTo(this.center),n=Math.ceil(this.MAX_DEPTH-1-(this.radius-t)/this.BLOCK_HEIGHT);return Math.max(0,Math.min(this.MAX_DEPTH,n))}getCoordinatesAtPoint(e){const t=this.getDepthAtPoint(e),n=e.clone().sub(this.center).normalize(),i=Math.asin(n.y)*(180/Math.PI),s=Math.atan2(n.z,n.x)*(180/Math.PI);return{lat:i,lon:s,depth:t}}getDirectionFromLatLon(e,t){const n=e*(Math.PI/180),i=t*(Math.PI/180),s=Math.sin(n),o=Math.cos(n),a=o*Math.cos(i),l=o*Math.sin(i);return new P(a,s,l).normalize()}getSpawnPositionAtLatLon(e,t,n=1){const i=this.getDirectionFromLatLon(e,t),s=this.getSurfaceHeightInDirection(i);return this.center.clone().add(i.multiplyScalar(s+n))}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=t.blocks.length-1;n>=0;n--)if(t.blocks[n]!==I.AIR&&t.blocks[n]!==I.WATER){const i=this.depthToRadius(n);return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s!==I.AIR&&s!==I.WATER)return this.depthToRadius(i)}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s===I.WATER)return!0;if(s!==I.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getTileNeighbors(e){const t=this.polyhedron.tiles[e];return t?t.neighbors:[]}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getTileCenterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.center.clone().add(this.center):null}getVisibleTileIndices(){return this.cachedNearbyTiles}isTileInDetailRange(e){return this.cachedNearbyTiles.has(e)}getTileChunkIndex(e){return this.tileToChunk.get(e)??-1}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;const i=this.getDepthAtPoint(e);return i>=0&&i<n.blocks.length?n.blocks[i]===I.WATER:!1}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);if(i>=0&&i<n.blocks.length&&n.blocks[i]!==I.WATER)return 0;let s=-1;for(let o=n.blocks.length-1;o>=0;o--)if(n.blocks[o]===I.WATER){s=o;break}return s<0?0:i<=s?(s-i)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let s=n.blocks.length-1;s>=0;s--)if(n.blocks[s]===I.WATER){i=s;break}return i<0?-1:this.depthToRadius(i)}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const o=t.clone().normalize(),a=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,h=l,u=this.getDepthAtPoint(e);for(let d=0;d<n;d+=.2){a.copy(e).addScaledVector(o,d);const f=this.polyhedron.getTileAtPointFromHint(a.clone().sub(this.center),c),x=this.getDepthAtPoint(a);if(x<0||x>=this.MAX_DEPTH){h=c,u=x,c=f;continue}const g=this.getBlock(f.index,x);if(g===I.AIR){h=f,u=x,c=f;continue}if(g===I.WATER&&!i){h=f,u=x,c=f;continue}const m=a.clone().sub(this.center).normalize();return{tileIndex:f.index,depth:x,blockType:g,point:a.clone(),normal:m,prevTileIndex:h.index,prevDepth:u}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=U.PLANET_LOD_DISTANCE_3?2:e>=U.PLANET_LOD_DISTANCE_2?1:e>=U.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}isInOrbitView(){return this.currentDistantLODLevel>=0}isIncrementalActive(){return this.isIncrementalRebuildActive}getNeedsRebatch(){return this.needsRebatch}}const et=U.TERRAIN_SEA_LEVEL+U.TERRAIN_MAX_DEPTH;let Os=new Map,nl=null;function _t(r,e,t){r!==nl&&(Os.clear(),nl=r);let n=Os.get(e);if(!n){n=new Array(et);for(let i=0;i<et;i++)n[i]=r.getBlock(e,i);Os.set(e,n)}return t>=0&&t<et?n[t]:I.AIR}function wm(){Os.clear()}function Ui(r,e,t){let n=-1,i=1/0;for(let s=0;s<et;s++){const o=s<et-1?_t(r,e,s+1):I.AIR,a=_t(r,e,s),l=o===I.AIR||o===I.WATER,c=a!==I.AIR&&a!==I.WATER;if(l&&c){const h=r.depthToRadius(s),u=Math.abs(h-t);u<i&&(i=u,n=s)}}return n}class Im{constructor(e,t,n){M(this,"camera");M(this,"position");M(this,"velocity");M(this,"inputManager");M(this,"planets",[]);M(this,"currentPlanet",null);M(this,"localUp",new P(0,1,0));M(this,"localForward",new P(0,0,-1));M(this,"localRight",new P(1,0,0));M(this,"orientation",new yt);M(this,"isInSpace",!1);M(this,"transitionTimer",0);M(this,"isGrounded",!1);M(this,"isJetpacking",!1);M(this,"isInWater",!1);M(this,"feetInWater",!1);M(this,"isFloatingAtSurface",!1);M(this,"hasDoubleJumped",!1);M(this,"jetpackEnabled",!0);M(this,"lastPosition",new P);M(this,"stuckFrameCount",0);M(this,"wasdActiveFrames",0);M(this,"lastStuckLogTime",0);M(this,"jumpStartPosition",null);M(this,"jumpStartSpherical",null);M(this,"wasdPressedDuringJump",!1);M(this,"jumpDirection",null);M(this,"didJumpThisFrame",!1);M(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new P,this.position=n.getSpawnPositionAtLatLon(U.EARTH_SPAWN_LAT,U.EARTH_SPAWN_LON,1),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new pt;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new pt().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new P(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new P().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new P().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),s=Math.atan2(n.x,n.z),o=Math.acos(n.y/i);return{theta:s,phi:o,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}checkEdgeNudge(){if(!this.currentPlanet)return;const e=this.currentPlanet.getTileAtPoint(this.position);if(!e)return;const t=new P(e.center.x+this.currentPlanet.center.x,e.center.y+this.currentPlanet.center.y,e.center.z+this.currentPlanet.center.z),n=this.position.distanceTo(this.currentPlanet.center);let i=-1,s=1/0;for(let d=0;d<et-1;d++){const f=d<et-1?_t(this.currentPlanet,e.index,d+1):I.AIR,x=_t(this.currentPlanet,e.index,d),g=f===I.AIR||f===I.WATER,m=x!==I.AIR&&x!==I.WATER;if(g&&m){const p=this.currentPlanet.depthToRadius(d),_=Math.abs(p-n);p<=n+.5&&_<s&&(i=d,s=_)}}if(i<0)return;const o=this.currentPlanet.depthToRadius(i),a=e.neighbors;if(!a||a.length===0)return;const l=this.currentPlanet.getSurfaceNormal(this.position),c=this.position.clone().sub(l.clone().multiplyScalar(this.position.dot(l)-t.dot(l)));let h=!1;const u=new P;for(const d of a){const f=this.currentPlanet.getTileByIndex(d);if(!f)continue;let x=-1,g=1/0;for(let L=0;L<et-1;L++){const b=L<et-1?_t(this.currentPlanet,d,L+1):I.AIR,S=_t(this.currentPlanet,d,L),w=b===I.AIR||b===I.WATER,N=S!==I.AIR&&S!==I.WATER;if(w&&N){const F=this.currentPlanet.depthToRadius(L),B=Math.abs(F-n);F<=n+.5&&B<g&&(x=L,g=B)}}if(x<0||this.currentPlanet.depthToRadius(x)-o<=U.AUTO_STEP_HEIGHT)continue;const _=new P(f.center.x+this.currentPlanet.center.x,f.center.y+this.currentPlanet.center.y,f.center.z+this.currentPlanet.center.z),E=_.clone().sub(l.clone().multiplyScalar(_.dot(l)-t.dot(l))).clone().sub(t).normalize(),v=c.clone().sub(t).dot(E),A=t.distanceTo(_)*.45;v>A-U.PLAYER_RADIUS*2&&(h=!0,u.sub(E))}if(h&&u.lengthSq()>1e-4){u.normalize();const f=u.multiplyScalar(.075),x=f.clone().sub(l.clone().multiplyScalar(f.dot(l)));this.position.add(x);const g=this.currentPlanet.getSurfaceNormal(this.position);this.position.copy(this.currentPlanet.center).addScaledVector(g,n)}}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const s=this.position.distanceTo(i.planet.center),o=s-i.planet.radius,a=i.gravityFullRadius??i.planet.radius*U.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*U.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(s<l){let h=0;if(s<=a)h=1;else{const u=l-a,d=s-a;h=1-Math.min(1,d/u)}h*=c,h>t&&(t=h,e=i.planet,n=o)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(wm(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),s=this.isInSpace;if(this.isInSpace=i===0,s&&!this.isInSpace&&n&&(this.transitionTimer=U.ROLL_SLERP_DURATION,this.currentPlanet=n),!s&&this.isInSpace&&(this.transitionTimer=0,this.updateOrientationFromLocal()),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{this.handleSpaceMouseLook(t,e),this.transitionTimer>0?(this.transitionTimer-=e,this.slerpRollToLevel(e)):this.alignUpWithGravity();const o=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const a=this.position.distanceTo(this.currentPlanet.center),l=a-o;if(l>.5){const c=this.currentPlanet.getTileAtPoint(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${o.toFixed(2)} -> ${a.toFixed(2)} (+${l.toFixed(2)})`),console.error(`Current tile: ${c==null?void 0:c.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),c){console.error("Block column at current tile:");for(let h=0;h<20;h++){const u=this.currentPlanet.getBlock(c.index,h),d=this.currentPlanet.depthToRadius(h);let f=u===0?".":u===4?"~":"#";const x=Math.abs(d-a)<1?" <-- PLAYER":"";console.error(`  d${h} (r${d}): ${f}${x}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+U.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPoint(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1,s=1/0;for(let l=0;l<et-1;l++){const c=this.currentPlanet.getBlock(n.index,l),h=l<et-1?this.currentPlanet.getBlock(n.index,l+1):I.AIR,u=c!==I.AIR&&c!==I.WATER,d=h===I.AIR||h===I.WATER;if(u&&d){const f=this.currentPlanet.depthToRadius(l),x=Math.abs(f-e);f<=e+.5&&x<s&&(i=l,s=x)}}const o=i>=0?this.currentPlanet.depthToRadius(i):0;console.log(`  Ground depth: ${i} (radius: ${o.toFixed(2)})`);const a=e-o;console.log(`  Player feet vs ground: ${a.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${a>U.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let l=0;l<8;l++){const c=this.currentPlanet.getBlock(n.index,l),h=I[c],u=this.currentPlanet.depthToRadius(l),d=u>e&&u<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${l}: ${h} (r=${u.toFixed(1)})${d}`)}console.log(`
Neighbor Tiles:`);for(const l of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[l])continue;let h=-1;for(let f=0;f<et;f++){const x=this.currentPlanet.getBlock(l,f);if(x!==I.AIR&&x!==I.WATER){h=f;break}}const u=h>=0?this.currentPlanet.depthToRadius(h):0,d=u-o;console.log(`  Neighbor ${l}: ground_r=${u.toFixed(1)}, heightDiff=${d.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+U.PLAYER_HEIGHT,s=Ui(this.currentPlanet,t.index,n),o=s>=0?this.currentPlanet.depthToRadius(s):0;console.log("========== Hex STRUCTURE (Shift+X) =========="),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${s} (radius: ${o.toFixed(2)})`),console.log(`isGrounded: ${this.isGrounded}, velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`),console.log(`Planet radius: ${this.currentPlanet.radius}`);const a=this.currentPlanet.isTileInDetailRange(t.index),l=this.currentPlanet.getTileChunkIndex(t.index);console.log(`Terrain type: ${a?"DETAILED":"LOD"} (chunk ${l})`),console.log("");const c=U.DEBUG_CAVE_TILE_RINGS,h=U.DEBUG_CAVE_DEPTH_ROWS,u=new Set([t.index]);let d=new Set([t.index]);for(let F=0;F<c;F++){const B=new Set;for(const q of d){const H=this.currentPlanet.getPolyhedron().tiles[q];if(H)for(const Z of H.neighbors)u.has(Z)||(u.add(Z),B.add(Z))}d=B}let f=0;for(let F=0;F<et;F++)if(this.currentPlanet.depthToRadius(F)>=n){f=F;break}const x=Math.floor(h/2),g=Math.max(0,f-x),m=Math.min(et-1,f+x);console.log(`Sampling ${u.size} tiles, depths ${g} to ${m}`),console.log("Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, @ = PLAYER BODY OVERLAP"),console.log("(Higher depths = closer to sky, displayed at top)"),console.log("");const p=Array.from(u),_=["Depth/Radius"].concat(p.map(F=>`T${F}`));console.log(_.join("	"));for(let F=m;F>=g;F--){const B=this.currentPlanet.depthToRadius(F),q=B-1,H=B>n&&q<i,Z=[`d${F} (r${B.toFixed(0)})`];for(const W of p){const J=this.currentPlanet.getBlock(W,F);let K="?";J===I.AIR?K=".":J===I.WATER?K="~":J===I.SAND?K="S":J===I.GRASS?K="G":K="#",H&&W===t.index&&(K=K==="."?"@":K.toUpperCase()),Z.push(K)}console.log(Z.join("	"))}console.log("");const y=this.currentPlanet.depthToRadius(s);console.log(`Current ground depth: ${s} (r${y.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const E=this.currentPlanet.getPolyhedron().tiles[t.index];if(E)for(const F of E.neighbors){const B=this.currentPlanet.getPolyhedron().tiles[F];if(!B)continue;const q=[];for(let K=0;K<et-1;K++){const he=K<et-1?this.currentPlanet.getBlock(F,K+1):I.AIR,Ae=this.currentPlanet.getBlock(F,K),ke=he===I.AIR||he===I.WATER,Ke=Ae!==I.AIR&&Ae!==I.WATER;ke&&Ke&&q.push(K)}const H=new P(B.center.x,B.center.y,B.center.z).normalize().multiplyScalar(this.currentPlanet.radius),Z=this.checkStepHeight(H),W=this.checkHeadroomCollision(H),J=this.checkWallCollision(H);console.log(`  T${F}: floors=[${q.join(",")}] step=${Z} headroom=${W} wall=${J}`)}const C=this.localForward.clone().negate(),v=this.position.clone().addScaledVector(C,.5),A=this.currentPlanet.getTileAtPoint(v);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${C.x.toFixed(2)}, ${C.y.toFixed(2)}, ${C.z.toFixed(2)})`),console.log(`  Test position tile: ${A?A.index:"none"} (same=${(A==null?void 0:A.index)===t.index})`);const L=this.checkCollision(v),b=this.checkStepHeight(v),S=this.checkHeadroomCollision(v),w=this.checkWallCollision(v);console.log(`  checkCollision: ${L}, step=${b}, headroom=${S}, wall=${w}`);const N=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(C,2));if(N&&N.index!==t.index){console.log(`  Forward tile (2 units ahead): ${N.index}`);const F=this.currentPlanet.getPolyhedron().tiles[N.index];if(F){const B=[];for(let J=0;J<et-1;J++){const K=J<et-1?this.currentPlanet.getBlock(N.index,J+1):I.AIR,he=this.currentPlanet.getBlock(N.index,J),Ae=K===I.AIR||K===I.WATER,ke=he!==I.AIR&&he!==I.WATER;Ae&&ke&&B.push(J)}const q=new P(F.center.x,F.center.y,F.center.z).normalize().multiplyScalar(this.currentPlanet.radius),H=this.checkStepHeight(q),Z=this.checkHeadroomCollision(q),W=this.checkWallCollision(q);console.log(`  T${N.index} (center): floors=[${B.join(",")}] step=${H} headroom=${Z} wall=${W}`)}}console.log("==============================================")}alignUpWithGravity(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=this.localForward.clone().negate(),n=e.clone();n.sub(t.clone().multiplyScalar(e.dot(t))),!(n.lengthSq()<.001)&&(n.normalize(),this.localUp.copy(n),this.localRight=new P().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new P().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal())}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const s=Math.min(1,U.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,s).normalize(),this.localRight=new P().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new P().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal(),this.localUp.angleTo(i)<.01&&(this.transitionTimer=0)}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=-e.mouseX*U.MOUSE_SENSITIVITY,i=new yt().setFromAxisAngle(this.localUp,n);this.orientation.premultiply(i);const s=U.INVERT_Y_AXIS?-1:1;let o=e.mouseY*U.MOUSE_SENSITIVITY*s;if(!this.isInSpace&&this.currentPlanet){const l=this.currentPlanet.getSurfaceNormal(this.position),h=this.localForward.clone().negate().dot(l),u=Math.asin(Math.max(-1,Math.min(1,h))),d=89.5*Math.PI/180,f=u+o;f>d?o=d-u:f<-d&&(o=-d-u)}const a=new yt().setFromAxisAngle(this.localRight,o);this.orientation.premultiply(a),this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=U.ROLL_SPEED*t),e.rollRight&&(n-=U.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),s=new yt().setFromAxisAngle(i,n);this.orientation.premultiply(s),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new P,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const s=e.sprint?U.SPRINT_SPEED:U.SPACE_THRUST;this.velocity.addScaledVector(n,s*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,U.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const s=this.position.clone().addScaledVector(n,U.WATER_BODY_CHECK_HEIGHT),o=this.currentPlanet.isInWater(s);this.feetInWater=this.currentPlanet.isInWater(this.position);const a=new P;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new P().crossVectors(l,n).normalize();if(e.forward&&a.add(l),e.backward&&a.sub(l),e.left&&a.sub(c),e.right&&a.add(c),a.lengthSq()>0){a.normalize();let d=e.sprint?U.SPRINT_SPEED:U.WALK_SPEED*U.WALK_SPEED_MULTIPLIER;o&&(d*=U.WATER_MOVEMENT_MULTIPLIER);const f=a.clone().multiplyScalar(d*t);this.resolveMovement(f)}const u=this.velocity.dot(n)>U.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!u){const d=this.currentPlanet.getWaterSurfaceRadius(this.position),f=this.position.distanceTo(this.currentPlanet.center),x=d+U.WATER_SURFACE_FLOAT_HEIGHT,g=f-x;if(d>0&&g<=.3)if(g>=-.1){this.isFloatingAtSurface=!0;const m=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(m))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,U.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(console.log(`Jump pressed! isGrounded=${this.isGrounded}, feetInWater=${this.feetInWater}`),this.isGrounded){const d=n,f=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(f));let x=U.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(x=U.JUMP_FORCE*U.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(d,x),console.log(`After jump: velocity=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)}), jumpForce=${x}`),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const g=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:g.theta,phi:g.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),s=this.position.clone().add(n);if(this.checkCollision(s)){const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}else{this.position.copy(s);const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPoint(this.position),n=this.currentPlanet.getTileAtPoint(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!0;const n=this.currentPlanet.getDepthAtPoint(this.position),i=this.currentPlanet.depthToRadius(n);let s=!1,o=!1;for(let a=0;a<et-1;a++){const l=a<et-1?_t(this.currentPlanet,t.index,a+1):I.AIR,c=_t(this.currentPlanet,t.index,a),h=l===I.AIR||l===I.WATER,u=c!==I.AIR&&c!==I.WATER;if(h&&u&&(s=!0,this.currentPlanet.depthToRadius(a)-i<=U.AUTO_STEP_HEIGHT)){o=!0;break}}return s?o:!0}checkWallCollision(e,t=!1){if(!this.currentPlanet)return!1;const n=this.currentPlanet.getTileAtPoint(e);if(!n)return!1;const i=this.currentPlanet.getTileAtPoint(this.position),s=i?i.index:-1;let o,a;if(this.isGrounded){const f=this.position.distanceTo(this.currentPlanet.center),x=this.currentPlanet.getTileAtPoint(this.position);let g=-1;if(x&&(g=Ui(this.currentPlanet,x.index,f)),g<0)o=e.distanceTo(this.currentPlanet.center),a=o+U.PLAYER_HEIGHT;else{const m=this.currentPlanet.depthToRadius(g);let p=-1,_=1/0;for(let y=0;y<et-1;y++){const E=y<et-1?_t(this.currentPlanet,n.index,y+1):I.AIR,C=_t(this.currentPlanet,n.index,y),v=E===I.AIR||E===I.WATER,A=C!==I.AIR&&C!==I.WATER;if(v&&A){const b=this.currentPlanet.depthToRadius(y)-m;b<=U.AUTO_STEP_HEIGHT&&Math.abs(b)<Math.abs(_)&&(p=y,_=b)}}if(p>=0){const y=this.currentPlanet.depthToRadius(p);o=y,a=y+U.PLAYER_HEIGHT}else o=e.distanceTo(this.currentPlanet.center),a=o+U.PLAYER_HEIGHT}}else o=e.distanceTo(this.currentPlanet.center),a=o+U.PLAYER_HEIGHT;const l=this.currentPlanet.getSurfaceNormal(e),c=[n.index];if(!t){const f=this.currentPlanet.getPolyhedron().tiles[n.index];if(f)for(const x of f.neighbors){const g=this.currentPlanet.getPolyhedron().tiles[x];if(g){const p=new P(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),_=p.dot(l);p.clone().sub(l.clone().multiplyScalar(_)).length()<U.PLAYER_RADIUS+1&&c.push(x)}}}const h=this.currentPlanet.radius*.02;let u=o;if(i){const f=Ui(this.currentPlanet,s,this.position.distanceTo(this.currentPlanet.center));f>=0&&(u=this.currentPlanet.depthToRadius(f))}const d=Math.max(u,o)+U.AUTO_STEP_HEIGHT;for(const f of c){if(f===s)continue;const x=this.currentPlanet.getPolyhedron().tiles[f];if(!x)continue;let g=-1;for(let C=et-2;C>=0;C--){const v=_t(this.currentPlanet,f,C+1),A=_t(this.currentPlanet,f,C);if((v===I.AIR||v===I.WATER)&&A!==I.AIR&&A!==I.WATER){g=C;break}}if(g>=0&&this.currentPlanet.depthToRadius(g)<=d)continue;const p=new P(x.center.x,x.center.y,x.center.z).add(this.currentPlanet.center).clone().sub(e),_=p.dot(l),y=p.clone().sub(l.clone().multiplyScalar(_)).length(),E=Math.max(0,y-h);for(let C=0;C<et;C++){const v=_t(this.currentPlanet,f,C);if(v===I.AIR||v===I.WATER)continue;const A=this.currentPlanet.depthToRadius(C),L=A-1;if(A<=d)continue;if(L<a&&A>o){const S=Math.abs(A-o)<.1;if(this.isGrounded&&f===n.index&&S)continue;if(E<U.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;if(i&&(s=Ui(this.currentPlanet,i.index,n)),s<0)return!1;const o=this.currentPlanet.depthToRadius(s);let a=-1,l=1/0;for(let d=0;d<et-1;d++){const f=d<et-1?_t(this.currentPlanet,t.index,d+1):I.AIR,x=_t(this.currentPlanet,t.index,d),g=f===I.AIR||f===I.WATER,m=x!==I.AIR&&x!==I.WATER;if(g&&m){const _=this.currentPlanet.depthToRadius(d)-o;_<=U.AUTO_STEP_HEIGHT&&Math.abs(_)<Math.abs(l)&&(a=d,l=_)}}if(a<0)return!1;const c=this.currentPlanet.depthToRadius(a),h=c,u=c+U.PLAYER_HEIGHT;for(let d=0;d<et;d++){const f=_t(this.currentPlanet,t.index,d);if(f===I.AIR||f===I.WATER)continue;const x=this.currentPlanet.depthToRadius(d),g=x-1;if(x>h&&g<u){if(d===a)continue;return!0}}return!1}isPositionValid(e,t=!1){if(!this.currentPlanet)return!0;const n=this.currentPlanet.getSurfaceNormal(e),i=e.distanceTo(this.currentPlanet.center),s=this.currentPlanet.getTileAtPoint(e);if(s){let l=-1;for(let c=0;c<et;c++){const h=_t(this.currentPlanet,s.index,c);if(h!==I.AIR&&h!==I.WATER){l=c;break}}if(l>=0){const c=this.currentPlanet.depthToRadius(l)-1;if(i<c)return console.log(`isPositionValid BLOCKED by floor: feetR=${i.toFixed(2)}, floorR=${c.toFixed(2)}, floorD=${l}`),!1}}const o=[.1,U.PLAYER_HEIGHT*.5,U.PLAYER_HEIGHT],a=s;for(const l of o){const c=i+l;let h,u;if(t&&a){h=a;for(let f=0;f<et;f++){const x=this.currentPlanet.depthToRadius(f);if(c<=x){u=f;break}}u=u??et-1}else{const f=this.currentPlanet.center.clone().add(n.clone().multiplyScalar(c));if(h=this.currentPlanet.getTileAtPoint(f),!h)continue;u=this.currentPlanet.getDepthAtPoint(f)}if(u<0||u>=et)continue;const d=_t(this.currentPlanet,h.index,u);if(d!==I.AIR&&d!==I.WATER){const f=this.currentPlanet.depthToRadius(u);if(c<f)return console.log(`isPositionValid BLOCKED: offset=${l.toFixed(2)}, checkR=${c.toFixed(2)}, depth=${u}, blockTopR=${f.toFixed(2)}, block=${d}, tile=${h.index}`),!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+U.PLAYER_HEIGHT,s=[];for(let f=0;f<et;f++){const x=f<et-1?_t(this.currentPlanet,t.index,f+1):I.AIR,g=_t(this.currentPlanet,t.index,f),m=x===I.AIR||x===I.WATER,p=g!==I.AIR&&g!==I.WATER;if(m&&p){const _=this.currentPlanet.depthToRadius(f);s.push({depth:f,radius:_})}}if(s.length===0)return;let o=s[0],a=Math.abs(n-o.radius);for(const f of s){const x=Math.abs(n-f.radius);x<a&&(a=x,o=f)}const l=o.radius,c=l+U.PLAYER_HEIGHT;let h=!0;for(let f=0;f<et;f++){const x=_t(this.currentPlanet,t.index,f);if(x===I.AIR||x===I.WATER)continue;const g=this.currentPlanet.depthToRadius(f),m=g-1;if(f!==o.depth&&g>l&&m<c){h=!1;break}}if(!h)return;let u=!1;for(let f=0;f<et;f++){const x=_t(this.currentPlanet,t.index,f);if(x===I.AIR||x===I.WATER)continue;const g=this.currentPlanet.depthToRadius(f),m=g-1;if(g>n&&m<i){if(Math.abs(g-n)<.2)continue;u=!0;break}}if(!u)return;const d=o.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,d),this.isInWater){const f=this.velocity.dot(e);f<0&&this.velocity.sub(e.clone().multiplyScalar(f))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,U.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;i&&(s=Ui(this.currentPlanet,i.index,n));const o=s>=0?this.currentPlanet.depthToRadius(s):0,a=o;if(s>=0&&n<=a+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,a),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const h=this.getGravityMultiplier();let u=U.BASE_GRAVITY*h;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?u=0:u*=U.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-U.WATER_DRAG*e)),u>0&&this.velocity.addScaledVector(c,u*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const f=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),x=f.distanceTo(this.currentPlanet.center),g=this.currentPlanet.getTileAtPoint(f);let m=-1,p=1/0;if(g)for(let v=0;v<et-1;v++){const A=v<et-1?_t(this.currentPlanet,g.index,v+1):I.AIR,L=_t(this.currentPlanet,g.index,v),b=A===I.AIR||A===I.WATER,S=L!==I.AIR&&L!==I.WATER;if(b&&S){const N=this.currentPlanet.depthToRadius(v)-o;N<=U.AUTO_STEP_HEIGHT&&Math.abs(N)<Math.abs(p)&&(m=v,p=N)}}const _=m>=0?this.currentPlanet.depthToRadius(m):0,y=_,E=_-o,C=!this.isInWater&&E>U.AUTO_STEP_HEIGHT;if(m>=0&&x<=y)if(C){const v=this.velocity.dot(t);v<0&&this.velocity.sub(t.clone().multiplyScalar(v)),this.velocity.multiplyScalar(.5)}else{const v=f.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(v,y);const A=this.velocity.dot(v);A<0&&this.velocity.sub(v.clone().multiplyScalar(A)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const v=this.isPositionValid(f),A=this.checkWallCollision(f);if(v&&!A)this.position.copy(f);else{const L=t.clone().multiplyScalar(this.velocity.dot(t)),b=this.velocity.clone().sub(L),S=L.clone().multiplyScalar(e),w=this.position.clone().add(S),N=this.velocity.dot(t)>0;let F;if(N){const B=this.isPositionValid(w,!0),q=this.checkWallCollision(w,!0);if(F=B&&!q,!F){const H=w.distanceTo(this.currentPlanet.center),Z=H+U.PLAYER_HEIGHT;console.log(`Jump blocked: posValid=${B}, wallBlock=${q}, newFeetR=${H.toFixed(2)}, newHeadR=${Z.toFixed(2)}`)}}else if(F=!this.checkWallCollision(w,!0),F){const B=this.currentPlanet.getTileAtPoint(w);if(B){const q=w.distanceTo(this.currentPlanet.center),H=this.currentPlanet.getDepthAtPoint(w);if(H>=0&&H<et){const Z=_t(this.currentPlanet,B.index,H);if(Z!==I.AIR&&Z!==I.WATER){const W=this.currentPlanet.depthToRadius(H);q<W&&(F=!1)}}}}if(F)this.position.copy(w),N||this.checkEdgeNudge();else{const B=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(B))}if(b.lengthSq()>.001){const B=b.clone().multiplyScalar(e),q=this.position.clone().add(B);this.isPositionValid(q)&&!this.checkWallCollision(q)?this.position.copy(q):this.velocity.sub(b.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(U.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),s=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(s)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let s="";this.isInSpace?s=" [SPACE FLIGHT]":this.transitionTimer>0?s=" [ENTERING GRAVITY]":this.isJetpacking?s=" [JETPACK]":this.isGrounded||(s=" [AIRBORNE]");const o=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${o} | Grav: ${(i*100).toFixed(0)}%${s}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getCoordinatesAtPoint(this.position),i=n.lat>=0?"N":"S",s=n.lon>=0?"E":"W";t.textContent=`${Math.abs(n.lat).toFixed(1)}°${i} ${Math.abs(n.lon).toFixed(1)}°${s} D:${n.depth}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}exportForSave(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},orientation:{x:this.orientation.x,y:this.orientation.y,z:this.orientation.z,w:this.orientation.w},velocity:{x:this.velocity.x,y:this.velocity.y,z:this.velocity.z}}}importFromSave(e){this.position.set(e.position.x,e.position.y,e.position.z),this.orientation.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w),this.velocity.set(e.velocity.x,e.velocity.y,e.velocity.z),this.updateLocalFromOrientation()}}var X=(r=>(r[r.NONE=0]="NONE",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WOOD=4]="WOOD",r[r.LEAVES=5]="LEAVES",r[r.LOG=6]="LOG",r[r.SAND=7]="SAND",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.STICK=15]="STICK",r[r.COAL=16]="COAL",r[r.TORCH=17]="TORCH",r[r.FISHING_ROD=18]="FISHING_ROD",r[r.SNOW=19]="SNOW",r[r.ICE=20]="ICE",r[r.FURNACE=21]="FURNACE",r[r.INGOT_COPPER=22]="INGOT_COPPER",r[r.INGOT_IRON=23]="INGOT_IRON",r[r.INGOT_GOLD=24]="INGOT_GOLD",r[r.INGOT_ALUMINUM=25]="INGOT_ALUMINUM",r[r.STORAGE_CHEST=26]="STORAGE_CHEST",r[r.STEAM_ENGINE=27]="STEAM_ENGINE",r))(X||{});const gt={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2},7:{name:"Sand",stackSize:64,texture:"/textures/sand.png",mineTime:.5},8:{name:"Coal Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_coal.png",mineTime:2},9:{name:"Copper Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_copper.png",mineTime:2},10:{name:"Iron Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_iron.png",mineTime:2.5},11:{name:"Gold Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_gold.png",mineTime:3},12:{name:"Lithium Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_lythium.png",mineTime:3},13:{name:"Aluminum Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_aluminum.png",mineTime:2},14:{name:"Cobalt Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_cobalt.png",mineTime:2.5},15:{name:"Stick",stackSize:64,texture:"/textures/sticks.png",mineTime:.3},16:{name:"Coal",stackSize:64,texture:"/textures/coal.png",mineTime:.3},17:{name:"Torch",stackSize:64,texture:"/textures/torch_sprite.png",mineTime:.3},18:{name:"Fishing Rod",stackSize:1,texture:"/textures/fishing_rod.png",mineTime:.3},19:{name:"Snow",stackSize:64,texture:"/textures/snow.png",mineTime:.5},20:{name:"Ice",stackSize:64,texture:"/textures/ice.png",mineTime:.5},21:{name:"Furnace",stackSize:8,texture:"/textures/technology/furnace_face.png",mineTime:2},22:{name:"Copper Ingot",stackSize:64,texture:"/textures/minerals/earth/copper.png",mineTime:.3},23:{name:"Iron Ingot",stackSize:64,texture:"/textures/minerals/earth/iron.png",mineTime:.3},24:{name:"Gold Ingot",stackSize:64,texture:"/textures/minerals/earth/gold.png",mineTime:.3},25:{name:"Aluminum Ingot",stackSize:64,texture:"/textures/minerals/earth/aluminum.png",mineTime:.3},26:{name:"Storage Chest",stackSize:8,texture:"/textures/technology/storage_face.png",mineTime:1.5},27:{name:"Steam Engine",stackSize:8,texture:"/textures/technology/steam_engine_face.png",mineTime:2.5}};class Dm{constructor(){M(this,"slots");M(this,"selectedSlot",0);M(this,"hotbarSize",9);M(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=gt[e];let i=t;for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===e&&o.quantity<n.stackSize){const a=Math.min(i,n.stackSize-o.quantity);o.quantity+=a,i-=a}}for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===0){const a=Math.min(i,n.stackSize);o.itemType=e,o.quantity=a,i-=a}}return i}setSlot(e,t,n){e<0||e>=this.totalSlots||(this.slots[e].itemType=t,this.slots[e].quantity=n,n<=0&&(this.slots[e].itemType=0,this.slots[e].quantity=0))}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let s=this.totalSlots-1;s>=0&&n>0;s--){const o=this.slots[s];if(o.itemType===e){const a=Math.min(n,o.quantity);o.quantity-=a,n-=a,i+=a,o.quantity===0&&(o.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}swapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n={...this.slots[e]};this.slots[e]={...this.slots[t]},this.slots[t]=n}getSlot(e){return e<0||e>=this.totalSlots?null:this.slots[e]}exportForSave(){return this.slots.map(e=>({itemType:e.itemType,quantity:e.quantity}))}importFromSave(e){for(let t=0;t<Math.min(e.length,this.totalSlots);t++)this.slots[t]={itemType:e[t].itemType,quantity:e[t].quantity}}}function Fl(r,e=!1){const t=r[0].index!==null,n=new Set(Object.keys(r[0].attributes)),i=new Set(Object.keys(r[0].morphAttributes)),s={},o={},a=r[0].morphTargetsRelative,l=new xt;let c=0;for(let h=0;h<r.length;++h){const u=r[h];let d=0;if(t!==(u.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in u.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;s[f]===void 0&&(s[f]=[]),s[f].push(u.attributes[f]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in u.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(u.morphAttributes[f])}if(e){let f;if(t)f=u.index.count;else if(u.attributes.position!==void 0)f=u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,h),c+=f}}if(t){let h=0;const u=[];for(let d=0;d<r.length;++d){const f=r[d].index;for(let x=0;x<f.count;++x)u.push(f.getX(x)+h);h+=r[d].attributes.position.count}l.setIndex(u)}for(const h in s){const u=il(s[h]);if(!u)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,u)}for(const h in o){const u=o[h][0].length;if(u===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let d=0;d<u;++d){const f=[];for(let g=0;g<o[h].length;++g)f.push(o[h][g][d]);const x=il(f);if(!x)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(x)}}return l}function il(r){let e,t,n,i=-1,s=0;for(let c=0;c<r.length;++c){const h=r[c];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;s+=h.count*t}const o=new e(s),a=new Ct(o,t,n);let l=0;for(let c=0;c<r.length;++c){const h=r[c];if(h.isInterleavedBufferAttribute){const u=l/t;for(let d=0,f=h.count;d<f;d++)for(let x=0;x<t;x++){const g=h.getComponent(d,x);a.setComponent(d+u,x,g)}}else o.set(h.array,l);l+=h.count*t}return i!==void 0&&(a.gpuType=i),a}const Je={LIGHT_COLOR:16755268,get LIGHT_INTENSITY(){return U.TORCH_LIGHT_INTENSITY},get LIGHT_RANGE(){return U.TORCH_LIGHT_RANGE},LIGHT_DECAY:2,get FLICKER_SPEED(){return U.TORCH_FLICKER_SPEED},get FLICKER_AMOUNT(){return U.TORCH_FLICKER_AMOUNT},HANDLE_HEIGHT:.4,HANDLE_RADIUS:.03,HEAD_RADIUS:.06,HEAD_HEIGHT:.1,FLAME_HEIGHT:.15,FLAME_RADIUS:.05,HELD_OFFSET:new P(.25,-.2,-.4),HELD_ROTATION:new hn(-.3,.2,.1)};function Ul(){const r=new kt,e=new Ei(Je.HANDLE_RADIUS,Je.HANDLE_RADIUS,Je.HANDLE_HEIGHT,8);e.translate(0,Je.HANDLE_HEIGHT/2,0);const t=new Ei(Je.HEAD_RADIUS,Je.HEAD_RADIUS*.8,Je.HEAD_HEIGHT,8);t.translate(0,Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT/2,0);const n=new Vs(Je.FLAME_RADIUS,Je.FLAME_HEIGHT,8);n.translate(0,Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT/2,0);const i=new we(9127187),s=new we(3355443),o=new we(Je.LIGHT_COLOR);Lr(e,i),Lr(t,s),Lr(n,o);const a=Fl([e,t,n]),l=new Ji({vertexColors:!0}),c=new Le(a,l);return c.name="torchMesh",r.add(c),e.dispose(),t.dispose(),n.dispose(),r}function Lr(r,e){const t=r.attributes.position.count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;r.setAttribute("color",new Ct(n,3))}class Pm{constructor(e,t){M(this,"torchGroup");M(this,"pointLight");M(this,"camera");M(this,"isVisible",!1);M(this,"flickerTime",0);M(this,"baseIntensity");this.camera=e,this.baseIntensity=Je.LIGHT_INTENSITY,this.torchGroup=Ul(),this.torchGroup.visible=!1,this.torchGroup.position.copy(Je.HELD_OFFSET),this.torchGroup.rotation.copy(Je.HELD_ROTATION),this.pointLight=new yh(Je.LIGHT_COLOR,0,Je.LIGHT_RANGE,Je.LIGHT_DECAY),e.add(this.torchGroup),e.add(this.pointLight);const n=Je.HELD_OFFSET.y+Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT;this.pointLight.position.set(Je.HELD_OFFSET.x,n,Je.HELD_OFFSET.z)}setVisible(e){this.isVisible=e,this.torchGroup.visible=e,this.pointLight.intensity=e?this.baseIntensity:0}update(e){if(!this.isVisible)return;this.flickerTime+=e*Je.FLICKER_SPEED;const t=Math.sin(this.flickerTime)*Math.sin(this.flickerTime*2.3)*Math.sin(this.flickerTime*.7);this.pointLight.intensity=this.baseIntensity*(1+t*Je.FLICKER_AMOUNT);const n=this.torchGroup.getObjectByName("torchMesh");n&&(n.scale.y=1+t*.02)}dispose(){this.camera.remove(this.torchGroup),this.camera.remove(this.pointLight),this.torchGroup.traverse(e=>{e instanceof Le&&(e.geometry.dispose(),e.material instanceof Mn&&e.material.dispose())}),this.pointLight.dispose()}}class Lm{constructor(e){M(this,"scene");M(this,"placedTorches",[]);M(this,"torchesByTile",new Map);M(this,"flickerTime",0);M(this,"torchLightData",new Map);this.scene=e}placeTorch(e,t,n){const i=Ul(),s=e.clone().sub(t).normalize(),o=new P(0,1,0),a=new yt().setFromUnitVectors(o,s);i.quaternion.copy(a),i.position.copy(e);const l={group:i,tileIndex:n,position:e.clone(),flickerOffset:Math.random()*Math.PI*2};return this.scene.add(i),this.torchesByTile.has(n)||this.torchesByTile.set(n,[]),this.torchesByTile.get(n).push(l),this.placedTorches.push(l),l}removeTorch(e){const t=this.placedTorches.indexOf(e);if(t>=0){this.placedTorches.splice(t,1);const n=this.torchesByTile.get(e.tileIndex);if(n){const i=n.indexOf(e);i>=0&&n.splice(i,1)}this.scene.remove(e.group),e.group.traverse(i=>{i instanceof Le&&(i.geometry.dispose(),i.material instanceof Mn&&i.material.dispose())})}}update(e){this.flickerTime+=e*Je.FLICKER_SPEED;for(const t of this.placedTorches){if(!t.group.visible)continue;const n=this.flickerTime+t.flickerOffset,i=Math.sin(n)*Math.sin(n*2.3)*Math.sin(n*.7),s=t.group.getObjectByName("torchMesh");s&&(s.scale.y=1+i*.03)}}updateVisibility(e){for(const[t,n]of this.torchesByTile){const i=e.has(t);for(const s of n)s.group.visible=i}}getTorchLightAt(e){let t=0;for(const n of this.placedTorches){const i=e.distanceTo(n.position);if(i<Je.LIGHT_RANGE){const s=1/(1+Je.LIGHT_DECAY*i*i/(Je.LIGHT_RANGE*Je.LIGHT_RANGE));t+=s}}return Math.min(1,t)}getTorchLightData(){return this.torchLightData}getPlacedTorches(){return this.placedTorches}getTorchDataForBaking(){return this.placedTorches.map(e=>{const t=Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT,n=e.position.clone().normalize();return{position:e.position.clone().add(n.multiplyScalar(t)),range:Je.LIGHT_RANGE,intensity:Je.LIGHT_INTENSITY}})}hasTorchOnTile(e){const t=this.torchesByTile.get(e);return t!==void 0&&t.length>0}getTilesWithTorches(){const e=new Set;for(const[t,n]of this.torchesByTile)n.length>0&&e.add(t);return e}getNearestTorchPositions(e,t=16){const n=this.placedTorches.map(i=>{const s=Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT,o=i.position.clone().normalize(),a=i.position.clone().add(o.multiplyScalar(s));return{position:a,distance:e.distanceTo(a)}});return n.sort((i,s)=>i.distance-s.distance),n.slice(0,t).map(i=>i.position)}getTorchMeshes(){const e=[];for(const t of this.placedTorches)t.group.traverse(n=>{n instanceof Le&&e.push(n)});return e}dispose(){for(const e of[...this.placedTorches])this.removeTorch(e)}}var Ks=`uniform vec3 planetCenter;\r
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
}`,js=`precision highp float;

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
}`;const Ns=[{input:X.ORE_COPPER,output:X.INGOT_COPPER,outputQuantity:1},{input:X.ORE_IRON,output:X.INGOT_IRON,outputQuantity:1},{input:X.ORE_GOLD,output:X.INGOT_GOLD,outputQuantity:1},{input:X.ORE_ALUMINUM,output:X.INGOT_ALUMINUM,outputQuantity:1}];class Om{constructor(e,t,n){M(this,"scene");M(this,"furnaces",[]);M(this,"furnaceMeshes",[]);M(this,"textureLoader");M(this,"furnaceGeometry",null);M(this,"furnaceMaterial",null);M(this,"onSmeltCompleteCallback",null);M(this,"planetCenter");M(this,"sunDirection");M(this,"FURNACE_SIZE",.8);M(this,"SMELT_TIME",10);this.scene=e,this.textureLoader=new Qi,this.planetCenter=(t==null?void 0:t.clone())||new P(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new P(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Pt("/textures/technology/furnace.png"),o,void 0,a)});e.magFilter=St,e.minFilter=St,e.wrapS=Nt,e.wrapT=Nt,this.furnaceGeometry=new An(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,x=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=x,i[h+6]=d,i[h+7]=x};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new ct({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ks,fragmentShader:js})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Le(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new P(1,0,0);Math.abs(c.dot(h))>.9&&(h=new P(0,0,1));const u=new P().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=U.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const x=new yt;x.setFromUnitVectors(new P(0,1,0),c);const g=new yt;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(x),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const m={mesh:o,position:l.clone(),tileIndex:n,rotation:d,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(m),this.furnaceMeshes.push(o),m}async restoreFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Le(this.furnaceGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new yt;l.setFromUnitVectors(new P(0,1,0),a);const c=new yt;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const h={mesh:o,position:e.clone(),tileIndex:n,rotation:i,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(h),this.furnaceMeshes.push(o),h}removeFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof ct&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getFurnaceMeshes(){return this.furnaceMeshes}getPlacedFurnaces(){return this.furnaces}getFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.fuelAmount>0&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=Ns.find(o=>o.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.fuelAmount--,n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,fuelAmount:e.fuelAmount,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}const Fs=27;class Nm{constructor(e,t,n){M(this,"scene");M(this,"chests",[]);M(this,"chestMeshes",[]);M(this,"textureLoader");M(this,"chestGeometry",null);M(this,"chestMaterial",null);M(this,"planetCenter");M(this,"sunDirection");M(this,"CHEST_SIZE",.8);this.scene=e,this.textureLoader=new Qi,this.planetCenter=(t==null?void 0:t.clone())||new P(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new P(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Pt("/textures/technology/storage_chest.png"),o,void 0,a)});e.magFilter=St,e.minFilter=St,e.wrapS=Nt,e.wrapT=Nt,this.chestGeometry=new An(this.CHEST_SIZE,this.CHEST_SIZE,this.CHEST_SIZE);const t=this.calculateFaceUVs(),n=this.chestGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,x=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=x,i[h+6]=d,i[h+7]=x};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.chestMaterial=new ct({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ks,fragmentShader:js})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createEmptySlots(){const e=[];for(let t=0;t<Fs;t++)e.push({itemType:X.NONE,quantity:0});return e}async placeChest(e,t,n,i){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const s=this.chestMaterial.clone(),o=new Le(this.chestGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.CHEST_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new P(1,0,0);Math.abs(c.dot(h))>.9&&(h=new P(0,0,1));const u=new P().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=U.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const x=new yt;x.setFromUnitVectors(new P(0,1,0),c);const g=new yt;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(x),o.userData.isStorageChest=!0,o.userData.tileIndex=n,this.scene.add(o);const m={mesh:o,position:l.clone(),tileIndex:n,rotation:d,slots:this.createEmptySlots()};return this.chests.push(m),this.chestMeshes.push(o),m}async restoreChest(e,t,n,i,s){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const o=this.chestMaterial.clone(),a=new Le(this.chestGeometry,o);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new yt;c.setFromUnitVectors(new P(0,1,0),l);const h=new yt;h.setFromAxisAngle(l,i),a.quaternion.copy(h).multiply(c),a.userData.isStorageChest=!0,a.userData.tileIndex=n,this.scene.add(a);const u={mesh:a,position:e.clone(),tileIndex:n,rotation:i,slots:s||this.createEmptySlots()};return this.chests.push(u),this.chestMeshes.push(a),u}addItemsToChest(e,t,n){if(t===X.NONE)return n;const i=gt[t];let s=n;for(let o=0;o<Fs&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Fs&&s>0;o++){const a=e.slots[o];if(a.itemType===X.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromChest(e){const t=[];for(const n of e.slots)n.itemType!==X.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}removeChest(e){const t=this.chests.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof ct&&e.mesh.material.dispose(),this.chests.splice(t,1);const n=this.chestMeshes.indexOf(e.mesh);n!==-1&&this.chestMeshes.splice(n,1)}getChestMeshes(){return this.chestMeshes}getPlacedChests(){return this.chests}getChestByMesh(e){return this.chests.find(t=>t.mesh===e)}getChestAtTile(e){return this.chests.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.chests){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.chests.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}const Us=27;class Fm{constructor(e,t,n){M(this,"scene");M(this,"piles",[]);M(this,"pileMeshes",[]);M(this,"textureLoader");M(this,"pileGeometry",null);M(this,"pileMaterial",null);M(this,"planetCenter");M(this,"sunDirection");M(this,"PILE_WIDTH",.7);M(this,"PILE_HEIGHT",.3);M(this,"PILE_DEPTH",.7);this.scene=e,this.textureLoader=new Qi,this.planetCenter=(t==null?void 0:t.clone())||new P(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new P(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((t,n)=>{this.textureLoader.load(Pt("/textures/technology/garbage_pile.png"),t,void 0,n)});e.magFilter=St,e.minFilter=St,e.wrapS=Nt,e.wrapT=Nt,this.pileGeometry=new An(this.PILE_WIDTH,this.PILE_HEIGHT,this.PILE_DEPTH),this.pileMaterial=new ct({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ks,fragmentShader:js})}createEmptySlots(){const e=[];for(let t=0;t<Us;t++)e.push({itemType:X.NONE,quantity:0});return e}async placePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Le(this.pileGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.PILE_HEIGHT/2));o.position.copy(l);const c=l.clone().sub(t).normalize(),h=new yt;h.setFromUnitVectors(new P(0,1,0),c),o.quaternion.copy(h),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const u={mesh:o,position:l.clone(),tileIndex:n,slots:this.createEmptySlots()};if(i)for(const d of i)this.addItemsToPile(u,d.itemType,d.quantity);return this.piles.push(u),this.pileMeshes.push(o),u}async restorePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Le(this.pileGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new yt;l.setFromUnitVectors(new P(0,1,0),a),o.quaternion.copy(l),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const c={mesh:o,position:e.clone(),tileIndex:n,slots:i||this.createEmptySlots()};return this.piles.push(c),this.pileMeshes.push(o),c}addItemsToPile(e,t,n){if(t===X.NONE)return n;const i=gt[t];let s=n;for(let o=0;o<Us&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Us&&s>0;o++){const a=e.slots[o];if(a.itemType===X.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromPile(e){const t=[];for(const n of e.slots)n.itemType!==X.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}isPileEmpty(e){return e.slots.every(t=>t.itemType===X.NONE||t.quantity===0)}removePile(e){const t=this.piles.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof ct&&e.mesh.material.dispose(),this.piles.splice(t,1);const n=this.pileMeshes.indexOf(e.mesh);n!==-1&&this.pileMeshes.splice(n,1)}getPileMeshes(){return this.pileMeshes}getPlacedPiles(){return this.piles}getPileByMesh(e){return this.piles.find(t=>t.mesh===e)}getPileAtTile(e){return this.piles.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.piles){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.piles.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}class Um{constructor(e,t,n){M(this,"scene");M(this,"steamEngines",[]);M(this,"steamEngineMeshes",[]);M(this,"textureLoader");M(this,"steamEngineGeometry",null);M(this,"steamEngineMaterial",null);M(this,"planetCenter");M(this,"sunDirection");M(this,"STEAM_ENGINE_SIZE",.8);this.scene=e,this.textureLoader=new Qi,this.planetCenter=(t==null?void 0:t.clone())||new P(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new P(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Pt("/textures/technology/steam_engine.png"),o,void 0,a)});e.magFilter=St,e.minFilter=St,e.wrapS=Nt,e.wrapT=Nt,this.steamEngineGeometry=new An(this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE);const t=this.calculateFaceUVs(),n=this.steamEngineGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,x=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=x,i[h+6]=d,i[h+7]=x};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.steamEngineMaterial=new ct({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ks,fragmentShader:js})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Le(this.steamEngineGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.STEAM_ENGINE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new P(1,0,0);Math.abs(c.dot(h))>.9&&(h=new P(0,0,1));const u=new P().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=U.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const x=new yt;x.setFromUnitVectors(new P(0,1,0),c);const g=new yt;g.setFromAxisAngle(c,d),o.quaternion.copy(g).multiply(x),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const m={mesh:o,position:l.clone(),tileIndex:n,rotation:d};return this.steamEngines.push(m),this.steamEngineMeshes.push(o),m}async restoreSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Le(this.steamEngineGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new yt;l.setFromUnitVectors(new P(0,1,0),a);const c=new yt;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const h={mesh:o,position:e.clone(),tileIndex:n,rotation:i};return this.steamEngines.push(h),this.steamEngineMeshes.push(o),h}removeSteamEngine(e){const t=this.steamEngines.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof ct&&e.mesh.material.dispose(),this.steamEngines.splice(t,1);const n=this.steamEngineMeshes.indexOf(e.mesh);n!==-1&&this.steamEngineMeshes.splice(n,1)}getSteamEngineMeshes(){return this.steamEngineMeshes}getPlacedSteamEngines(){return this.steamEngines}getSteamEngineByMesh(e){return this.steamEngines.find(t=>t.mesh===e)}getSteamEngineAtTile(e){return this.steamEngines.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.steamEngines){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.steamEngines.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation}))}}const Jn=class Jn{constructor(){M(this,"registeredMenus",new Map);M(this,"pendingPointerLock",!1);M(this,"initialized",!1);M(this,"onMenuCloseCallback",null)}static getInstance(){return Jn.instance||(Jn.instance=new Jn),Jn.instance}init(){this.initialized||(this.initialized=!0,document.addEventListener("keyup",e=>{this.pendingPointerLock&&(e.key==="e"||e.key==="E"||e.key==="Escape")&&(this.pendingPointerLock=!1,this.isAnyMenuOpen()||this.requestPointerLock())}))}registerMenu(e,t){this.registeredMenus.set(e,t)}unregisterMenu(e){this.registeredMenus.delete(e)}isAnyMenuOpen(){for(const e of this.registeredMenus.values())if(e.isOpen())return!0;return!1}requestPointerLock(){const e=document.getElementById("game-container");e&&e.requestPointerLock()}schedulePointerLockOnKeyup(){this.pendingPointerLock=!0}restorePointerLockOnClick(){this.triggerMenuCloseCallback(),setTimeout(()=>{this.isAnyMenuOpen()||this.requestPointerLock()},0)}setupCloseButton(e,t,n){if(!t)return;const i=t.querySelector(e);i&&i.addEventListener("click",()=>{n(),this.restorePointerLockOnClick()})}openMenu(){document.exitPointerLock()}closeMenuViaKeyboard(){this.schedulePointerLockOnKeyup(),this.triggerMenuCloseCallback()}setOnMenuCloseCallback(e){this.onMenuCloseCallback=e}triggerMenuCloseCallback(){this.onMenuCloseCallback&&this.onMenuCloseCallback()}};M(Jn,"instance",null);let Ao=Jn;const ln=Ao.getInstance(),As=[{name:"Wood Planks",inputs:[{itemType:X.LOG,quantity:1,slot:4}],output:{itemType:X.WOOD,quantity:4}},{name:"Sticks",inputs:[{itemType:X.WOOD,quantity:1,slot:1},{itemType:X.WOOD,quantity:1,slot:4}],output:{itemType:X.STICK,quantity:4}},{name:"Coal",inputs:[{itemType:X.ORE_COAL,quantity:1,slot:4}],output:{itemType:X.COAL,quantity:8}},{name:"Torch",inputs:[{itemType:X.COAL,quantity:1,slot:1},{itemType:X.STICK,quantity:1,slot:4}],output:{itemType:X.TORCH,quantity:4}},{name:"Fishing Rod",inputs:[{itemType:X.STICK,quantity:1,slot:1},{itemType:X.STICK,quantity:1,slot:4},{itemType:X.STICK,quantity:1,slot:7}],output:{itemType:X.FISHING_ROD,quantity:1}},{name:"Furnace",inputs:[{itemType:X.STONE,quantity:1,slot:0},{itemType:X.STONE,quantity:1,slot:1},{itemType:X.STONE,quantity:1,slot:2},{itemType:X.STONE,quantity:1,slot:3},{itemType:X.STONE,quantity:1,slot:5},{itemType:X.STONE,quantity:1,slot:6},{itemType:X.STONE,quantity:1,slot:7},{itemType:X.STONE,quantity:1,slot:8}],output:{itemType:X.FURNACE,quantity:1}},{name:"Storage Chest",inputs:[{itemType:X.WOOD,quantity:1,slot:0},{itemType:X.WOOD,quantity:1,slot:1},{itemType:X.WOOD,quantity:1,slot:2},{itemType:X.WOOD,quantity:1,slot:3},{itemType:X.WOOD,quantity:1,slot:5},{itemType:X.WOOD,quantity:1,slot:6},{itemType:X.WOOD,quantity:1,slot:7},{itemType:X.WOOD,quantity:1,slot:8}],output:{itemType:X.STORAGE_CHEST,quantity:1}},{name:"Steam Engine",inputs:[{itemType:X.INGOT_IRON,quantity:1,slot:0},{itemType:X.INGOT_IRON,quantity:1,slot:1},{itemType:X.INGOT_IRON,quantity:1,slot:2},{itemType:X.INGOT_COPPER,quantity:1,slot:3},{itemType:X.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:X.INGOT_COPPER,quantity:1,slot:5},{itemType:X.INGOT_IRON,quantity:1,slot:6},{itemType:X.INGOT_IRON,quantity:1,slot:7},{itemType:X.INGOT_IRON,quantity:1,slot:8}],output:{itemType:X.STEAM_ENGINE,quantity:1}}];class km{constructor(e){M(this,"inventory");M(this,"menuElement",null);M(this,"recipeSelectElement",null);M(this,"craftingGridElement",null);M(this,"craftingOutputElement",null);M(this,"craftBtnElement",null);M(this,"inventoryGridElement",null);M(this,"inventoryHotbarElement",null);M(this,"isOpen",!1);M(this,"onCloseCallback",null);M(this,"onUpdateHotbarCallback",null);M(this,"onSaveCallback",null);M(this,"selectedRecipe",null);M(this,"draggedSlotIndex",null);M(this,"dragGhost",null);M(this,"touchDragSlotIndex",null);M(this,"touchDragGhost",null);M(this,"onFurnaceDropCallback",null);M(this,"onStorageDropCallback",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler(),ln.registerMenu("inventory",{isOpen:()=>this.isOpen,close:()=>this.close()})}setupUI(){this.menuElement=document.getElementById("inventory-menu"),this.recipeSelectElement=document.getElementById("recipe-select"),this.craftingGridElement=document.getElementById("crafting-grid"),this.craftingOutputElement=document.getElementById("crafting-output"),this.craftBtnElement=document.getElementById("craft-btn"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.menuElement&&this.menuElement.addEventListener("contextmenu",e=>e.preventDefault()),this.createInventorySlots(),ln.setupCloseButton(".close-inventory",this.menuElement,()=>this.close()),this.populateRecipeDropdown(),this.recipeSelectElement&&this.recipeSelectElement.addEventListener("change",()=>this.onRecipeSelect()),this.craftBtnElement&&this.craftBtnElement.addEventListener("click",()=>this.craftSelectedRecipe())}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString(),t.draggable=!0;const n=document.createElement("img");n.style.display="none",n.draggable=!1,t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t.addEventListener("dragstart",s=>this.handleDragStart(s,e)),t.addEventListener("dragend",()=>this.handleDragEnd()),t.addEventListener("dragover",s=>this.handleDragOver(s)),t.addEventListener("dragleave",s=>this.handleDragLeave(s)),t.addEventListener("drop",s=>this.handleDrop(s,e)),t.addEventListener("touchstart",s=>this.handleTouchStart(s,e),{passive:!1}),t.addEventListener("touchmove",s=>this.handleTouchMove(s),{passive:!1}),t.addEventListener("touchend",s=>this.handleTouchEnd(s),{passive:!1}),t}handleTouchStart(e,t){const n=this.inventory.getSlot(t);if(!n||n.itemType===X.NONE)return;e.preventDefault(),this.touchDragSlotIndex=t;const i=e.touches[0];e.currentTarget.classList.add("dragging");const o=document.createElement("div");o.className="drag-ghost";const a=gt[n.itemType];o.innerHTML=`<img src="${Pt(a.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(o.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),o.style.position="fixed",o.style.left=`${i.clientX-25}px`,o.style.top=`${i.clientY-25}px`,o.style.pointerEvents="none",o.style.zIndex="9999",o.style.background="rgba(0,0,0,0.8)",o.style.border="2px solid #4CAF50",o.style.borderRadius="4px",o.style.padding="4px",document.body.appendChild(o),this.touchDragGhost=o}handleTouchMove(e){if(this.touchDragSlotIndex===null||!this.touchDragGhost)return;e.preventDefault();const t=e.touches[0];this.touchDragGhost.style.left=`${t.clientX-25}px`,this.touchDragGhost.style.top=`${t.clientY-25}px`,document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")});const n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");i&&i.classList.add("drag-over")}handleTouchEnd(e){if(this.touchDragSlotIndex===null)return;e.preventDefault();const t=e.changedTouches[0],n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");if(i){const s=parseInt(i.dataset.slot||"-1");s>=0&&s!==this.touchDragSlotIndex&&(this.inventory.swapSlots(this.touchDragSlotIndex,s),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}document.querySelectorAll(".inventory-slot.dragging").forEach(s=>{s.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")}),this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null),this.touchDragSlotIndex=null}handleDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===X.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=gt[n.itemType];s.innerHTML=`<img src="${Pt(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.onFurnaceDropCallback&&this.onFurnaceDropCallback(t,a)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}if(i&&i.startsWith("storage:")){this.onStorageDropCallback&&this.onStorageDropCallback(t,i)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),ln.closeMenuViaKeyboard(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),ln.closeMenuViaKeyboard(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,ln.openMenu(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.cancelDrag(),this.onCloseCallback&&this.onCloseCallback())}cancelDrag(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null),this.touchDragSlotIndex=null,this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null)}isMenuOpen(){return this.isOpen}toggle(){this.isOpen?this.close():this.open()}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnFurnaceDropCallback(e){this.onFurnaceDropCallback=e}setOnStorageDropCallback(e){this.onStorageDropCallback=e}updateInventorySlotsPublic(){this.updateInventorySlots()}updateUI(){this.updateInventorySlots(),this.updateCraftingGrid()}updateInventorySlots(){var i,s;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((o,a)=>{const l=9+a;this.updateSlotElement(o,e[l])});const n=(s=this.inventoryHotbarElement)==null?void 0:s.querySelectorAll(".inventory-slot");n==null||n.forEach((o,a)=>{this.updateSlotElement(o,e[a])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");let s=e.querySelector(".item-tooltip");if(t.itemType!==X.NONE&&t.quantity>0){const o=gt[t.itemType];n&&(n.src=Pt(o.texture),n.style.display="block",this.applyAtlasRegionStyle(n,o)),i&&(i.textContent=t.quantity>1?t.quantity.toString():""),s||(s=document.createElement("span"),s.className="item-tooltip",e.appendChild(s)),s.textContent=o.name}else n&&(n.style.display="none",this.resetAtlasRegionStyle(n)),i&&(i.textContent=""),s&&s.remove()}applyAtlasRegionStyle(e,t){this.applyAtlasRegionStyleWithSize(e,t,40)}applyAtlasRegionStyleWithSize(e,t,n){if(t.atlasRegion){const{x:i,y:s,width:o,height:a,atlasWidth:l,atlasHeight:c}=t.atlasRegion,h=l/o,u=c/a;e.style.objectFit="none",e.style.objectPosition=`${-i*(n/o)}px ${-s*(n/a)}px`,e.style.width=`${n*h}px`,e.style.height=`${n*u}px`,e.style.transform=`scale(${1/h}, ${1/u})`,e.style.transformOrigin="top left"}else this.resetAtlasRegionStyleWithSize(e,n)}resetAtlasRegionStyle(e){this.resetAtlasRegionStyleWithSize(e,40)}resetAtlasRegionStyleWithSize(e,t){e.style.objectFit="",e.style.objectPosition="",e.style.width=`${t}px`,e.style.height=`${t}px`,e.style.transform="",e.style.transformOrigin=""}populateRecipeDropdown(){if(this.recipeSelectElement){this.recipeSelectElement.innerHTML='<option value="">-- Select Recipe --</option>';for(let e=0;e<As.length;e++){const t=As[e],n=document.createElement("option");n.value=e.toString(),n.textContent=t.name,this.recipeSelectElement.appendChild(n)}}}onRecipeSelect(){if(!this.recipeSelectElement)return;const e=parseInt(this.recipeSelectElement.value);isNaN(e)||e<0||e>=As.length?this.selectedRecipe=null:this.selectedRecipe=As[e],this.updateCraftingGrid()}updateCraftingGrid(){var i;const e=(i=this.craftingGridElement)==null?void 0:i.querySelectorAll(".crafting-slot");if(e==null||e.forEach(s=>{const o=s.querySelector("img"),a=s.querySelector(".slot-count"),l=s.querySelector(".item-tooltip");o&&(o.style.display="none"),a&&(a.textContent=""),l&&l.remove(),s.classList.remove("has-item","missing-item")}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count");s&&(s.style.display="none"),o&&(o.textContent=""),this.craftingOutputElement.classList.remove("has-item")}if(this.craftBtnElement&&(this.craftBtnElement.disabled=!0),!this.selectedRecipe)return;const t=new Map;for(const s of this.selectedRecipe.inputs){const o=t.get(s.itemType)||0;t.set(s.itemType,o+s.quantity)}let n=!0;for(const[s,o]of t)if(!this.inventory.hasItem(s,o)){n=!1;break}if(this.selectedRecipe.inputs.forEach((s,o)=>{const a=s.slot!==void 0?s.slot:o;if(a<9&&e&&e[a]){const l=e[a],c=l.querySelector("img"),h=l.querySelector(".slot-count"),u=gt[s.itemType];c&&(c.src=Pt(u.texture),c.style.display="block",this.applyAtlasRegionStyle(c,u)),h&&(h.textContent=s.quantity>1?s.quantity.toString():"");let d=l.querySelector(".item-tooltip");if(d||(d=document.createElement("span"),d.className="item-tooltip",l.appendChild(d)),d.textContent=u.name,n)l.classList.add("has-item");else{const f=t.get(s.itemType)||0;this.inventory.hasItem(s.itemType,f)?l.classList.add("has-item"):l.classList.add("missing-item")}}}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count"),a=gt[this.selectedRecipe.output.itemType];s&&(s.src=Pt(a.texture),s.style.display="block",this.applyAtlasRegionStyleWithSize(s,a,48)),o&&(o.textContent=this.selectedRecipe.output.quantity>1?this.selectedRecipe.output.quantity.toString():""),n&&this.craftingOutputElement.classList.add("has-item")}this.craftBtnElement&&(this.craftBtnElement.disabled=!n)}canCraft(e){for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craftSelectedRecipe(){if(!(!this.selectedRecipe||!this.canCraft(this.selectedRecipe))){for(const e of this.selectedRecipe.inputs)this.inventory.removeItem(e.itemType,e.quantity);this.inventory.addItem(this.selectedRecipe.output.itemType,this.selectedRecipe.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback()}}}class Bm{constructor(e){M(this,"inventory");M(this,"currentFurnace",null);M(this,"furnaceSectionElement",null);M(this,"isOpen",!1);M(this,"onCloseCallback",null);M(this,"onSaveCallback",null);M(this,"updateInterval",null);M(this,"onOpenInventoryCallback",null);M(this,"onUpdateHotbarCallback",null);M(this,"onUpdateInventoryCallback",null);M(this,"fuelSlotElement",null);M(this,"inputSlotElement",null);M(this,"outputSlotElement",null);M(this,"progressBarElement",null);M(this,"fuelBarElement",null);M(this,"FUEL_PER_COAL",8);M(this,"SLOT_FUEL","furnace-fuel");M(this,"SLOT_INPUT","furnace-input");M(this,"SLOT_OUTPUT","furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),ln.registerMenu("furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="furnace-section",this.furnaceSectionElement.className="furnace-section",this.furnaceSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupSlotInteractions(){this.fuelSlotElement&&(this.fuelSlotElement.dataset.furnaceSlot=this.SLOT_FUEL,this.setupFurnaceSlot(this.fuelSlotElement,this.SLOT_FUEL)),this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,h;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT?(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)):t===this.SLOT_FUEL&&(n=this.currentFurnace.fuelAmount>0,n&&(i=X.COAL,s=Math.ceil(this.currentFurnace.fuelAmount/this.FUEL_PER_COAL))),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=gt[i];a.innerHTML=`<img src="${Pt(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(h=e.dataTransfer)==null||h.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===X.NONE)return;const s=n?i.quantity:1;if(t===this.SLOT_FUEL){if(i.itemType===X.COAL){const o=Math.min(s,i.quantity);this.currentFurnace.fuelAmount+=o*this.FUEL_PER_COAL,this.inventory.removeItem(X.COAL,o),this.updateUI(),this.notifyChanges()}}else if(t===this.SLOT_INPUT&&Ns.find(a=>a.input===i.itemType)&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)){const a=Math.min(s,i.quantity);this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=a,this.inventory.removeItem(i.itemType,a),this.updateUI(),this.notifyChanges()}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_FUEL?this.handleFuelSlotClick():e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();if(t.itemType===X.COAL&&t.quantity>0){const n=Math.ceil(t.quantity/2);this.currentFurnace.fuelAmount+=n*this.FUEL_PER_COAL,this.inventory.removeItem(X.COAL,n),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0,this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(Ns.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();t.itemType===X.COAL&&t.quantity>0&&(this.currentFurnace.fuelAmount+=t.quantity*this.FUEL_PER_COAL,this.inventory.removeItem(X.COAL,t.quantity),this.updateUI(),this.notifyChanges())}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleFuelSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();e.itemType===X.COAL&&e.quantity>0&&(this.currentFurnace.fuelAmount+=this.FUEL_PER_COAL,this.inventory.removeItem(X.COAL,1),this.updateUI(),this.notifyChanges())}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();Ns.find(n=>n.input===e.itemType)&&e.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount++,this.inventory.removeItem(e.itemType,1),this.updateUI(),this.notifyChanges())}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===X.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===X.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.fuelSlotElement){const n=this.fuelSlotElement.querySelector("img"),i=this.fuelSlotElement.querySelector(".slot-count");if(e.fuelAmount>0){n.src=Pt(gt[X.COAL].texture),n.style.display="block";const s=Math.ceil(e.fuelAmount/this.FUEL_PER_COAL);i.textContent=s>1?s.toString():""}else n.style.display="none",i.textContent=""}if(this.fuelBarElement){const n=Math.min(100,e.fuelAmount/this.FUEL_PER_COAL*100);this.fuelBarElement.style.width=`${n}%`}const t=document.getElementById("fuel-remaining");if(t&&(t.textContent=`${e.fuelAmount} items remaining`),this.inputSlotElement){const n=this.inputSlotElement.querySelector("img"),i=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const s=gt[e.smeltingItem];s&&(n.src=Pt(s.texture),n.style.display="block"),i.textContent=e.inputCount>1?e.inputCount.toString():""}else n.style.display="none",i.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const n=this.outputSlotElement.querySelector("img"),i=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const s=gt[e.outputItem];s&&(n.src=Pt(s.texture),n.style.display="block"),i.textContent=e.outputCount>1?e.outputCount.toString():""}else n.style.display="none",i.textContent=""}}}class zm{constructor(e){M(this,"inventory");M(this,"currentStorage",null);M(this,"storageType",null);M(this,"storageSectionElement",null);M(this,"storageGridElement",null);M(this,"isOpen",!1);M(this,"onCloseCallback",null);M(this,"onSaveCallback",null);M(this,"onOpenInventoryCallback",null);M(this,"onUpdateHotbarCallback",null);M(this,"onUpdateInventoryCallback",null);this.inventory=e,this.createUI(),ln.registerMenu("storage",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.storageSectionElement=document.createElement("div"),this.storageSectionElement.id="storage-section",this.storageSectionElement.className="storage-section",this.storageSectionElement.innerHTML=`
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
    `,document.head.appendChild(t)}createStorageSlots(){if(!this.storageGridElement)return;this.storageGridElement.innerHTML="";const e=this.storageType==="garbage"?Us:Fs;for(let t=0;t<e;t++){const n=document.createElement("div");n.className="storage-slot",n.dataset.storageSlot=t.toString(),n.draggable=!0;const i=document.createElement("img");i.style.display="none",i.draggable=!1,n.appendChild(i);const s=document.createElement("span");s.className="slot-count",n.appendChild(s),this.setupSlotEvents(n,t),this.storageGridElement.appendChild(n)}}setupSlotEvents(e,t){e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDrop(n,t)})}handleDragStart(e,t){var o,a;if(!this.currentStorage){e.preventDefault();return}const n=this.currentStorage.slots[t];if(!n||n.itemType===X.NONE){e.preventDefault();return}(o=e.dataTransfer)==null||o.setData("text/plain",`storage:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const i=document.createElement("div");i.className="drag-ghost";const s=gt[n.itemType];i.innerHTML=`<img src="${Pt(s.texture)}" style="width:32px;height:32px;image-rendering:pixelated;">`,n.quantity>1&&(i.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),i.style.cssText="position:fixed;top:-100px;left:-100px;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.8);border:2px solid #4CAF50;border-radius:4px;padding:4px;",document.body.appendChild(i),(a=e.dataTransfer)==null||a.setDragImage(i,20,20),setTimeout(()=>i.remove(),0)}handleDrop(e,t){var s;if(!this.currentStorage)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.transferFromInventory(i,t);return}if(n.startsWith("storage:")){const o=parseInt(n.replace("storage:",""));this.swapStorageSlots(o,t)}}transferFromInventory(e,t){if(!this.currentStorage)return;const n=this.inventory.getSlot(e);if(!n||n.itemType===X.NONE)return;const i=this.currentStorage.slots[t],s=gt[n.itemType];if(i.itemType===X.NONE)i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,X.NONE,0);else if(i.itemType===n.itemType){const o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o;const a=n.quantity-o;a>0?this.inventory.setSlot(e,n.itemType,a):this.inventory.setSlot(e,X.NONE,0)}else{const o=i.itemType,a=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,o,a)}this.updateUI(),this.notifyChanges()}swapStorageSlots(e,t){if(!this.currentStorage||e===t)return;const n=this.currentStorage.slots[e],i=this.currentStorage.slots[t];if(i.itemType===X.NONE)i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=X.NONE,n.quantity=0;else if(i.itemType===n.itemType){const s=gt[n.itemType],o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o,n.quantity-=o,n.quantity===0&&(n.itemType=X.NONE)}else{const s=i.itemType,o=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=s,n.quantity=o}this.updateUI(),this.notifyChanges()}handleSlotClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];t.itemType!==X.NONE&&t.quantity>0&&this.inventory.addItem(t.itemType,1)===0&&(t.quantity--,t.quantity===0&&(t.itemType=X.NONE),this.updateUI(),this.notifyChanges())}handleRightClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===X.NONE||t.quantity===0)return;const n=Math.ceil(t.quantity/2),i=this.inventory.addItem(t.itemType,n),s=n-i;s>0&&(t.quantity-=s,t.quantity===0&&(t.itemType=X.NONE),this.updateUI(),this.notifyChanges())}handleShiftClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===X.NONE||t.quantity===0)return;const n=this.inventory.addItem(t.itemType,t.quantity);n<t.quantity&&(t.quantity=n,n===0&&(t.itemType=X.NONE),this.updateUI(),this.notifyChanges())}handleDropToInventory(e,t){if(!this.currentStorage||!t.startsWith("storage:"))return!1;const n=parseInt(t.replace("storage:","")),i=this.currentStorage.slots[n];if(!i||i.itemType===X.NONE)return!1;const s=this.inventory.getSlot(e);if(!s)return!1;const o=gt[i.itemType];if(s.itemType===X.NONE)this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=X.NONE,i.quantity=0;else if(s.itemType===i.itemType){const a=Math.min(i.quantity,o.stackSize-s.quantity);a>0&&(this.inventory.setSlot(e,s.itemType,s.quantity+a),i.quantity-=a,i.quantity===0&&(i.itemType=X.NONE))}else{const a=s.itemType,l=s.quantity;this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=a,i.quantity=l}return this.updateUI(),this.notifyChanges(),!0}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}open(e){"rotation"in e?this.openChest(e):this.openGarbagePile(e)}openChest(e){this.currentStorage=e,this.storageType="chest",this.openStorage("Storage Chest")}openGarbagePile(e){this.currentStorage=e,this.storageType="garbage",this.openStorage("Garbage Pile")}openStorage(e){if(!this.storageSectionElement)return;const t=document.getElementById("storage-title");t&&(t.textContent=e),this.storageSectionElement.classList.toggle("garbage",this.storageType==="garbage"),this.createStorageSlots(),this.storageSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback()}close(){this.storageSectionElement&&(this.storageSectionElement.style.display="none",this.isOpen=!1,this.currentStorage=null,this.storageType=null,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}getCurrentStorage(){return this.currentStorage}getStorageType(){return this.storageType}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}updateUI(){if(!this.currentStorage||!this.storageGridElement)return;this.storageGridElement.querySelectorAll(".storage-slot").forEach((t,n)=>{const i=this.currentStorage.slots[n],s=t.querySelector("img"),o=t.querySelector(".slot-count");if(i&&i.itemType!==X.NONE&&i.quantity>0){const a=gt[i.itemType];a&&(s.src=Pt(a.texture),s.style.display="block",o.textContent=i.quantity>1?i.quantity.toString():"")}else s.style.display="none",o.textContent=""})}}const ki="tenebris_player",Rs="tenebris_earth",Cs="tenebris_moon",Bi="tenebris_save",zi=2;class Gm{constructor(){M(this,"playerData",null);M(this,"inventory",[]);M(this,"planetData",new Map);M(this,"autoSaveInterval",null);M(this,"onPlayerSave",null);this.planetData.set("earth",{tileChanges:new Map,torches:[],furnaces:[],storageChests:[],garbagePiles:[],steamEngines:[]}),this.planetData.set("moon",{tileChanges:new Map,torches:[],furnaces:[],storageChests:[],garbagePiles:[],steamEngines:[]})}setPlayerSaveCallback(e){this.onPlayerSave=e}startAutoSave(e=5){this.autoSaveInterval!==null&&clearInterval(this.autoSaveInterval),this.autoSaveInterval=window.setInterval(()=>{this.savePlayerPosition()},e*1e3)}stopAutoSave(){this.autoSaveInterval!==null&&(clearInterval(this.autoSaveInterval),this.autoSaveInterval=null)}saveTileChange(e,t,n,i){const s=this.planetData.get(e);if(!s)return;const o=`${t}:${n}`;s.tileChanges.set(o,{tileIndex:t,depth:n,blockType:i}),this.persistPlanetToStorage(e)}saveInventory(e){this.inventory=[...e],this.persistPlayerToStorage()}saveTorch(e,t,n){const i=this.planetData.get(e);i&&(i.torches.push({tileIndex:t,position:n}),this.persistPlanetToStorage(e))}removeTorch(e){for(const[n,i]of this.planetData){const s=i.torches.length;i.torches=i.torches.filter(o=>Math.abs(o.position.x-e.x)>.01||Math.abs(o.position.y-e.y)>.01||Math.abs(o.position.z-e.z)>.01),i.torches.length!==s&&this.persistPlanetToStorage(n)}}getTorches(){const e=[];for(const[t,n]of this.planetData)for(const i of n.torches)e.push({...i,planetId:t});return e}saveFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.furnaces=i.furnaces.filter(s=>s.tileIndex!==t),i.furnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeFurnace(e,t){const n=this.planetData.get(e);n&&(n.furnaces=n.furnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.furnaces)e.push({...i,planetId:t});return e}saveStorageChest(e,t,n){const i=this.planetData.get(e);i&&(i.storageChests=i.storageChests.filter(s=>s.tileIndex!==t),i.storageChests.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeStorageChest(e,t){const n=this.planetData.get(e);n&&(n.storageChests=n.storageChests.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getStorageChests(){const e=[];for(const[t,n]of this.planetData)for(const i of n.storageChests)e.push({...i,planetId:t});return e}saveGarbagePile(e,t,n){const i=this.planetData.get(e);i&&(i.garbagePiles=i.garbagePiles.filter(s=>s.tileIndex!==t),i.garbagePiles.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeGarbagePile(e,t){const n=this.planetData.get(e);n&&(n.garbagePiles=n.garbagePiles.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getGarbagePiles(){const e=[];for(const[t,n]of this.planetData)for(const i of n.garbagePiles)e.push({...i,planetId:t});return e}saveSteamEngine(e,t,n){const i=this.planetData.get(e);i&&(i.steamEngines=i.steamEngines.filter(s=>s.tileIndex!==t),i.steamEngines.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeSteamEngine(e,t){const n=this.planetData.get(e);n&&(n.steamEngines=n.steamEngines.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getSteamEngines(){const e=[];for(const[t,n]of this.planetData)for(const i of n.steamEngines)e.push({...i,planetId:t});return e}savePlayerPosition(){if(this.onPlayerSave){const e=this.onPlayerSave();this.playerData={version:zi,timestamp:Date.now(),position:e.position,orientation:e.orientation,velocity:e.velocity,inventory:this.inventory},this.persistPlayerToStorage()}}load(){if(this.migrateLegacySave(),this.loadPlayerData(),this.loadPlanetData("earth"),this.loadPlanetData("moon"),!this.playerData&&this.inventory.length===0){let t=!1;for(const n of this.planetData.values())if(n.tileChanges.size>0||n.torches.length>0||n.furnaces.length>0){t=!0;break}if(!t)return null}const e=[];for(const[t,n]of this.planetData)for(const i of n.tileChanges.values())e.push({...i,planetId:t});return{version:zi,timestamp:Date.now(),tileChanges:e,inventory:this.inventory,player:this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:{position:{x:0,y:0,z:0},orientation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0}},torches:this.getTorches(),furnaces:this.getFurnaces()}}loadPlayerData(){try{const e=localStorage.getItem(ki);if(!e)return;const t=JSON.parse(e);this.playerData=t,this.inventory=t.inventory||[]}catch(e){console.error("Failed to load player data:",e)}}loadPlanetData(e){try{const t=e==="earth"?Rs:Cs,n=localStorage.getItem(t);if(!n)return;const i=JSON.parse(n),s=this.planetData.get(e);if(!s)return;s.tileChanges.clear();for(const o of i.tileChanges){const a=`${o.tileIndex}:${o.depth}`;s.tileChanges.set(a,o)}s.torches=i.torches||[],s.furnaces=i.furnaces||[],s.storageChests=i.storageChests||[],s.garbagePiles=i.garbagePiles||[],s.steamEngines=i.steamEngines||[]}catch(t){console.error(`Failed to load ${e} data:`,t)}}migrateLegacySave(){var e,t,n;try{const i=localStorage.getItem(Bi);if(!i)return;if(localStorage.getItem(ki)!==null){localStorage.removeItem(Bi);return}console.log("Migrating legacy save data to new format...");const s=JSON.parse(i);this.inventory=s.inventory||[],this.playerData={version:zi,timestamp:s.timestamp,position:((e=s.player)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=s.player)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=s.player)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};for(const o of s.tileChanges||[]){const a=this.planetData.get(o.planetId);if(a){const l=`${o.tileIndex}:${o.depth}`;a.tileChanges.set(l,{tileIndex:o.tileIndex,depth:o.depth,blockType:o.blockType})}}for(const o of s.torches||[]){const a=this.planetData.get(o.planetId);a&&a.torches.push({tileIndex:o.tileIndex,position:o.position})}for(const o of s.furnaces||[]){const a=this.planetData.get(o.planetId);a&&a.furnaces.push({tileIndex:o.tileIndex,position:o.position,rotation:o.rotation,fuelAmount:o.fuelAmount,smeltingItem:o.smeltingItem,smeltingProgress:o.smeltingProgress,inputCount:o.inputCount??0,outputItem:o.outputItem,outputCount:o.outputCount})}this.persistPlayerToStorage(),this.persistPlanetToStorage("earth"),this.persistPlanetToStorage("moon"),localStorage.removeItem(Bi),console.log("Migration complete!")}catch(i){console.error("Failed to migrate legacy save:",i)}}getTileChangesForPlanet(e){const t=this.planetData.get(e);if(!t)return[];const n=[];for(const i of t.tileChanges.values())n.push({...i,planetId:e});return n}getInventory(){return this.inventory}getPlayerData(){return this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:null}clearSave(){this.playerData=null,this.inventory=[];for(const e of this.planetData.values())e.tileChanges.clear(),e.torches=[],e.furnaces=[],e.storageChests=[],e.garbagePiles=[],e.steamEngines=[];localStorage.removeItem(ki),localStorage.removeItem(Rs),localStorage.removeItem(Cs),localStorage.removeItem(Bi)}persistPlayerToStorage(){var e,t,n;try{const i={version:zi,timestamp:Date.now(),position:((e=this.playerData)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=this.playerData)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=this.playerData)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};localStorage.setItem(ki,JSON.stringify(i))}catch(i){console.error("Failed to save player data:",i)}}persistPlanetToStorage(e){try{const t=this.planetData.get(e);if(!t)return;const n={version:zi,timestamp:Date.now(),tileChanges:Array.from(t.tileChanges.values()),torches:t.torches,furnaces:t.furnaces,storageChests:t.storageChests,garbagePiles:t.garbagePiles,steamEngines:t.steamEngines},i=e==="earth"?Rs:Cs;localStorage.setItem(i,JSON.stringify(n))}catch(t){console.error(`Failed to save ${e} data:`,t)}}hasSavedData(){return localStorage.getItem(ki)!==null||localStorage.getItem(Rs)!==null||localStorage.getItem(Cs)!==null||localStorage.getItem(Bi)!==null}}const lt=new Gm;function sl(r){switch(r){case I.STONE:return X.STONE;case I.DIRT:return X.DIRT;case I.GRASS:return X.DIRT;case I.WOOD:return X.WOOD;case I.SAND:return X.SAND;case I.ORE_COAL:return X.ORE_COAL;case I.ORE_COPPER:return X.ORE_COPPER;case I.ORE_IRON:return X.ORE_IRON;case I.ORE_GOLD:return X.ORE_GOLD;case I.ORE_LITHIUM:return X.ORE_LITHIUM;case I.ORE_ALUMINUM:return X.ORE_ALUMINUM;case I.ORE_COBALT:return X.ORE_COBALT;case I.SNOW:return X.SNOW;case I.DIRT_SNOW:return X.DIRT;case I.ICE:return X.ICE;default:return X.NONE}}function Hm(r){switch(r){case X.STONE:return I.STONE;case X.DIRT:return I.DIRT;case X.GRASS:return I.DIRT;case X.WOOD:return I.WOOD;case X.SAND:return I.SAND;case X.ORE_COAL:return I.ORE_COAL;case X.ORE_COPPER:return I.ORE_COPPER;case X.ORE_IRON:return I.ORE_IRON;case X.ORE_GOLD:return I.ORE_GOLD;case X.ORE_LITHIUM:return I.ORE_LITHIUM;case X.ORE_ALUMINUM:return I.ORE_ALUMINUM;case X.ORE_COBALT:return I.ORE_COBALT;case X.SNOW:return I.SNOW;case X.ICE:return I.ICE;default:return I.AIR}}class Wm{constructor(e,t,n){M(this,"planets");M(this,"player");M(this,"scene");M(this,"raycaster");M(this,"inventory");M(this,"craftingSystem");M(this,"blockWireframe",null);M(this,"wireframeCache",null);M(this,"wireframeVertPool",[]);M(this,"treeManager",null);M(this,"heldTorch",null);M(this,"torchManager");M(this,"furnaceManager");M(this,"furnaceUI");M(this,"miningFurnaceTarget",null);M(this,"storageChestManager");M(this,"garbagePileManager");M(this,"storageUI");M(this,"miningStorageTarget",null);M(this,"miningGarbageTarget",null);M(this,"steamEngineManager");M(this,"miningSteamEngineTarget",null);M(this,"rightClickCooldown",0);M(this,"CLICK_COOLDOWN",.25);M(this,"MAX_REACH",8);M(this,"miningTarget",null);M(this,"miningTreeTarget",null);M(this,"miningProgress",0);M(this,"miningProgressContainer",null);M(this,"miningProgressBar",null);M(this,"draggedSlotIndex",null);M(this,"dragGhost",null);M(this,"selectionLabelTimeout",null);M(this,"selectionLabelElement",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new Ah,this.inventory=new Dm,this.torchManager=new Lm(n),this.heldTorch=new Pm(t.camera,n);const i=e.find(a=>a.radius>50),s=(i==null?void 0:i.center)||new P(0,0,0),o=new P(U.SUN_DIRECTION.x,U.SUN_DIRECTION.y,U.SUN_DIRECTION.z).normalize();this.furnaceManager=new Om(n,s,o),this.furnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllFurnaceStates()}),this.furnaceUI=new Bm(this.inventory),this.furnaceUI.setOnCloseCallback(()=>{}),this.furnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllFurnaceStates()}),this.furnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.furnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.furnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.storageChestManager=new Nm(n,s,o),this.garbagePileManager=new Fm(n,s,o),this.steamEngineManager=new Um(n,s,o),this.storageUI=new zm(this.inventory),this.storageUI.setOnCloseCallback(()=>{}),this.storageUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllStorageStates()}),this.storageUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.storageUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.storageUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.craftingSystem=new km(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{this.furnaceUI.close(),this.storageUI.close()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.craftingSystem.setOnSaveCallback(()=>{this.saveInventory()}),this.craftingSystem.setOnFurnaceDropCallback((a,l)=>this.furnaceUI.handleDropToInventory(a,l)),this.craftingSystem.setOnStorageDropCallback((a,l)=>this.storageUI.handleDropToInventory(a,l)),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.setupHotbarDragDrop(),this.selectionLabelElement=document.getElementById("hotbar-selection-label"),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}setupHotbarDragDrop(){document.querySelectorAll(".hotbar-slot").forEach((t,n)=>{const i=t;i.draggable=!0;const s=i.querySelector("img");s&&(s.draggable=!1),i.addEventListener("dragstart",o=>this.handleHotbarDragStart(o,n)),i.addEventListener("dragend",()=>this.handleHotbarDragEnd()),i.addEventListener("dragover",o=>this.handleHotbarDragOver(o)),i.addEventListener("dragleave",o=>this.handleHotbarDragLeave(o)),i.addEventListener("drop",o=>this.handleHotbarDrop(o,n)),i.addEventListener("touchstart",o=>{o.preventDefault(),this.inventory.setSelectedSlot(n),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()},{passive:!1})})}handleHotbarDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===X.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=gt[n.itemType];s.innerHTML=`<img src="${Pt(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleHotbarDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".hotbar-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".hotbar-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleHotbarDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleHotbarDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleHotbarDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("storage:")){this.storageUI.handleDropToInventory(t,i)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.furnaceUI.handleDropToInventory(t,a)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateHotbarUI())}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const s=e[i],o=n.querySelector("img");let a=n.querySelector(".item-count"),l=n.querySelector(".item-tooltip");if(s.itemType!==X.NONE&&s.quantity>0){const c=gt[s.itemType];o&&(o.src=Pt(c.texture),o.style.display="block",this.applyAtlasRegionStyle(o,c)),a||(a=document.createElement("span"),a.className="item-count",n.appendChild(a)),a.textContent=s.quantity>1?s.quantity.toString():"",l||(l=document.createElement("span"),l.className="item-tooltip",n.appendChild(l)),l.textContent=c.name}else o&&(o.style.display="none",o.style.objectFit="",o.style.objectPosition=""),a&&(a.textContent=""),l&&l.remove();n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}applyAtlasRegionStyle(e,t){if(t.atlasRegion){const{x:n,y:i,width:s,height:o,atlasWidth:a,atlasHeight:l}=t.atlasRegion,c=a/s,h=l/o;e.style.objectFit="none",e.style.objectPosition=`${-n*(40/s)}px ${-i*(40/o)}px`,e.style.width=`${40*c}px`,e.style.height=`${40*h}px`,e.style.transform=`scale(${1/c}, ${1/h})`,e.style.transformOrigin="top left"}else e.style.objectFit="",e.style.objectPosition="",e.style.width="40px",e.style.height="40px",e.style.transform="",e.style.transformOrigin=""}showSelectionLabel(){const e=this.inventory.getSelectedItem();if(this.selectionLabelElement){if(this.selectionLabelTimeout!==null&&(window.clearTimeout(this.selectionLabelTimeout),this.selectionLabelTimeout=null),e.itemType!==X.NONE&&e.quantity>0){const t=gt[e.itemType];this.selectionLabelElement.textContent=t.name}else this.selectionLabelElement.textContent="Empty";this.selectionLabelElement.classList.add("visible"),this.selectionLabelTimeout=window.setTimeout(()=>{this.selectionLabelElement&&this.selectionLabelElement.classList.remove("visible"),this.selectionLabelTimeout=null},5e3)}}createHighlightMesh(){const e=new Al({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new xt;this.blockWireframe=new dh(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){if(this.wireframeCache&&this.wireframeCache.tileIndex===t&&this.wireframeCache.depth===n)return;const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;this.wireframeCache={tileIndex:t,depth:n};const s=e.getBlockHeight(),o=e.depthToRadius(n),a=o-s,l=[],c=i.vertices.length,h=c*2;for(;this.wireframeVertPool.length<h;)this.wireframeVertPool.push(new P);for(let d=0;d<c;d++){const f=i.vertices[d];this.wireframeVertPool[d].set(f.x,f.y,f.z).normalize().multiplyScalar(o).add(e.center),this.wireframeVertPool[c+d].set(f.x,f.y,f.z).normalize().multiplyScalar(a).add(e.center)}for(let d=0;d<c;d++){const f=(d+1)%c,x=this.wireframeVertPool[d],g=this.wireframeVertPool[f];l.push(x.x,x.y,x.z),l.push(g.x,g.y,g.z)}for(let d=0;d<c;d++){const f=(d+1)%c,x=this.wireframeVertPool[c+d],g=this.wireframeVertPool[c+f];l.push(x.x,x.y,x.z),l.push(g.x,g.y,g.z)}for(let d=0;d<c;d++){const f=this.wireframeVertPool[d],x=this.wireframeVertPool[c+d];l.push(f.x,f.y,f.z),l.push(x.x,x.y,x.z)}this.blockWireframe.geometry.dispose();const u=new xt;u.setAttribute("position",new Oe(l,3)),this.blockWireframe.geometry=u}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==X.NONE?t.textContent=`Block: ${gt[e.itemType].name}`:t.textContent="Block: None")}update(e,t,n,i=0){var ce;if(this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e),i!==0){const oe=this.inventory.getSelectedSlot(),le=9,je=i>0?1:-1;let De=oe+je;De<0&&(De=le-1),De>=le&&(De=0),this.inventory.setSelectedSlot(De),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()}const s=this.inventory.getSelectedItem(),o=s.itemType===X.TORCH&&s.quantity>0;this.heldTorch&&(this.heldTorch.setVisible(o),o&&this.heldTorch.update(e)),this.torchManager.update(e),this.furnaceManager.update(e);const a=this.torchManager.getTorchDataForBaking();if(a.length>0){const oe=a.map(De=>De.position),le=a[0].range,je=a[0].intensity;this.furnaceManager.updateTorchLighting(oe,le,je),this.storageChestManager.updateTorchLighting(oe,le,je),this.garbagePileManager.updateTorchLighting(oe,le,je),this.steamEngineManager.updateTorchLighting(oe,le,je)}if(this.craftingSystem.isMenuOpen()){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining();return}const l=this.player.getRaycastOrigin(),c=this.player.getForwardVector();this.raycaster.set(l,c),this.raycaster.far=this.MAX_REACH;const h=((ce=this.treeManager)==null?void 0:ce.getTreeMeshes())??[],u=this.torchManager.getTorchMeshes(),d=this.furnaceManager.getFurnaceMeshes(),f=this.storageChestManager.getChestMeshes(),x=this.garbagePileManager.getPileMeshes(),g=this.steamEngineManager.getSteamEngineMeshes(),m=this.raycaster.intersectObjects(h,!1),p=this.raycaster.intersectObjects(u,!1),_=this.raycaster.intersectObjects(d,!1),y=this.raycaster.intersectObjects(f,!1),E=this.raycaster.intersectObjects(x,!1),C=this.raycaster.intersectObjects(g,!1);let v=null,A=null,L=1/0;for(const oe of this.planets){const le=oe.raycast(l,c,this.MAX_REACH);if(le){const je=l.distanceTo(le.point);je<L&&(L=je,v=le,A=oe)}}let b=!1,S=!1,w=!1,N=!1,F=!1,B=!1,q=!1,H=null,Z=null,W=null,J=null,K=null,he=null;const Ae=m.length>0?m[0].distance:1/0,ke=p.length>0?p[0].distance:1/0,Ke=_.length>0?_[0].distance:1/0,Xe=y.length>0?y[0].distance:1/0,Q=E.length>0?E[0].distance:1/0,te=C.length>0?C[0].distance:1/0,pe=Math.min(Ae,ke,Ke,Xe,Q,te);if(v&&L<pe?S=!0:te<=pe&&te<1/0?(q=!0,he=C[0]):Xe<=pe&&Xe<1/0?(F=!0,J=y[0]):Q<=pe&&Q<1/0?(B=!0,K=E[0]):Ke<=ke&&Ke<=Ae&&Ke<1/0?(N=!0,W=_[0]):ke<Ae&&ke<1/0?(w=!0,Z=p[0]):Ae<1/0?(b=!0,H=m[0]):v&&(S=!0),q&&he){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const oe=he.object,le=this.steamEngineManager.getSteamEngineByMesh(oe);t&&le?this.handleSteamEngineMining(e,le):this.resetMining()}else if(F&&J){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const oe=J.object,le=this.storageChestManager.getChestByMesh(oe);n&&this.rightClickCooldown===0&&le?(this.storageUI.open(le),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&le?this.handleStorageChestMining(e,le):this.resetMining()}else if(B&&K){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const oe=K.object,le=this.garbagePileManager.getPileByMesh(oe);n&&this.rightClickCooldown===0&&le?(this.storageUI.open(le),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&le?this.handleGarbagePileMining(e,le):this.resetMining()}else if(N&&W){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const oe=W.object,le=this.furnaceManager.getFurnaceByMesh(oe);n&&this.rightClickCooldown===0&&le?(this.furnaceUI.open(le),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&le?this.handleFurnaceMining(e,le):this.resetMining()}else if(w&&Z)this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),t&&this.pickupTorch(Z.object),this.resetMining();else if(b&&H){const oe=H.object;this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const le=oe.userData.treeType;t?this.handleTreeMining(e,oe,le):this.resetMining()}else if(S&&v&&A){const{tileIndex:oe,depth:le,blockType:je,prevTileIndex:De,prevDepth:tt}=v;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(A,oe,le)),t&&je!==I.AIR?this.handleMining(e,A,oe,le,je):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(A,De,tt),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining()}handleMining(e,t,n,i,s){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:s},this.miningProgress=0);const o=sl(s),a=gt[o].mineTime;this.miningProgress+=e/a,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,s),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?X.LOG:X.LEAVES,s=gt[i].mineTime;this.miningProgress+=e/s,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){if(t==="trunk"){const n=Math.floor(Math.random()*5)+4,i=Math.floor(Math.random()*5)+4;this.inventory.addItem(X.LOG,n),this.inventory.addItem(X.STICK,i)}else{const n=Math.floor(Math.random()*3)+1;this.inventory.addItem(X.STICK,n)}if(this.updateHotbarUI(),this.saveInventory(),this.treeManager){let n=e.parent;for(;n&&!(n instanceof kt&&n.children.some(i=>i.userData.isTree));)n=n.parent;n instanceof kt&&this.treeManager.removeTree(n)}}handleFurnaceMining(e,t){(this.miningFurnaceTarget===null||this.miningFurnaceTarget.furnace!==t)&&(this.miningFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0);const n=gt[X.FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakFurnace(t),this.resetMining())}breakFurnace(e){if(this.inventory.addItem(X.FURNACE,1),e.smeltingItem!==null&&this.inventory.addItem(e.smeltingItem,1),e.outputItem!==null&&e.outputCount>0&&this.inventory.addItem(e.outputItem,e.outputCount),e.fuelAmount>0){const t=Math.ceil(e.fuelAmount/8);this.inventory.addItem(X.COAL,t)}this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";lt.removeFurnace(n,e.tileIndex)}this.furnaceManager.removeFurnace(e)}handleStorageChestMining(e,t){(this.miningStorageTarget===null||this.miningStorageTarget.chest!==t)&&(this.miningStorageTarget={chest:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=gt[X.STORAGE_CHEST].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakStorageChest(t),this.resetMining())}breakStorageChest(e){this.inventory.addItem(X.STORAGE_CHEST,1);const t=this.storageChestManager.getAllItemsFromChest(e),n=[];for(const i of t){const s=this.inventory.addItem(i.itemType,i.quantity);s>0&&n.push({itemType:i.itemType,quantity:s})}this.updateHotbarUI(),this.saveInventory();for(let i=0;i<this.planets.length;i++){const s=i===0?"earth":"moon";lt.removeStorageChest(s,e.tileIndex)}n.length>0&&this.createGarbagePileWithItems(e.position.clone(),e.tileIndex,n),this.storageChestManager.removeChest(e)}handleGarbagePileMining(e,t){(this.miningGarbageTarget===null||this.miningGarbageTarget.pile!==t)&&(this.miningGarbageTarget={pile:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningProgress=0);const n=.5;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakGarbagePile(t),this.resetMining())}breakGarbagePile(e){const t=this.garbagePileManager.getAllItemsFromPile(e),n=[];for(const o of t){const a=this.inventory.addItem(o.itemType,o.quantity);a>0&&n.push({itemType:o.itemType,quantity:a})}this.updateHotbarUI(),this.saveInventory();for(let o=0;o<this.planets.length;o++){const a=o===0?"earth":"moon";lt.removeGarbagePile(a,e.tileIndex)}const i=e.position.clone(),s=e.tileIndex;this.garbagePileManager.removePile(e),n.length>0&&this.createGarbagePileWithItems(i,s,n)}handleSteamEngineMining(e,t){(this.miningSteamEngineTarget===null||this.miningSteamEngineTarget.steamEngine!==t)&&(this.miningSteamEngineTarget={steamEngine:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=gt[X.STEAM_ENGINE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakSteamEngine(t),this.resetMining())}breakSteamEngine(e){this.inventory.addItem(X.STEAM_ENGINE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";lt.removeSteamEngine(n,e.tileIndex)}this.steamEngineManager.removeSteamEngine(e)}async createGarbagePileWithItems(e,t,n){let i=null;for(const o of this.planets)if(o.getTileByIndex(t)){i=o;break}if(!i)return;const s=await this.garbagePileManager.placePile(e,i.center,t,n);if(s){const o=this.getPlanetId(i);lt.saveGarbagePile(o,t,{position:{x:s.position.x,y:s.position.y,z:s.position.z},slots:s.slots.map(a=>({itemType:a.itemType,quantity:a.quantity}))})}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){if(n<=0)return;const s=sl(i);s!==X.NONE&&(this.inventory.addItem(s,1),this.updateHotbarUI(),this.saveInventory());const o=this.getPlanetId(e);let a=!1;const l=e.getMaxDepth();for(let h=n+1;h<l;h++){const u=e.getBlock(t,h);if(u===I.WATER){a=!0;break}else if(u!==I.AIR)break}if(!a){const h=e.getTileNeighbors(t);for(const u of h){if(e.getBlock(u,n)===I.WATER){a=!0;break}if(e.getBlock(u,n+1)===I.WATER){a=!0;break}}}const c=a?I.WATER:I.AIR;if(e.setBlock(t,n,c),lt.saveTileChange(o,t,n,c),c===I.WATER)for(let h=n-1;h>0&&e.getBlock(t,h)===I.AIR;h--)e.setBlock(t,h,I.WATER),lt.saveTileChange(o,t,h,I.WATER)}placeBlock(e,t,n){if(n<0||n>=e.getMaxDepth())return;const i=this.inventory.getSelectedItem();if(i.itemType===X.NONE||i.quantity===0)return;if(i.itemType===X.TORCH){this.placeTorch(e,t,n);return}if(i.itemType===X.FURNACE){this.placeFurnace(e,t,n);return}if(i.itemType===X.STORAGE_CHEST){this.placeStorageChest(e,t,n);return}if(i.itemType===X.STEAM_ENGINE){this.placeSteamEngine(e,t,n);return}const s=Hm(i.itemType);if(s===I.AIR)return;const o=e.getTileAtPoint(this.player.position);if(o&&o.index===t){const a=this.player.position.distanceTo(e.center),l=a+1.8,c=e.depthToRadius(n),h=c-1;if(c>a&&h<l)return}if(this.inventory.useSelectedItem()){e.setBlock(t,n,s),this.updateHotbarUI(),this.saveInventory();const a=this.getPlanetId(e);lt.saveTileChange(a,t,n,s)}}placeTorch(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center);if(this.inventory.useSelectedItem()){this.torchManager.placeTorch(a,e.center,t),this.updateHotbarUI(),this.saveInventory();const l=this.getPlanetId(e);lt.saveTorch(l,t,{x:a.x,y:a.y,z:a.z});const c=this.torchManager.getTorchDataForBaking();e.setTorchData(c),e.setTilesWithTorches(this.torchManager.getTilesWithTorches()),e.markTilesNearTorchDirty(a,U.TORCH_LIGHT_RANGE)}}async placeFurnace(e,t,n){if(this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.furnaceManager.placeFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);lt.saveFurnace(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,fuelAmount:c.fuelAmount,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount})}}}async placeStorageChest(e,t,n){if(this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.storageChestManager.placeChest(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);lt.saveStorageChest(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,slots:c.slots.map(u=>({itemType:u.itemType,quantity:u.quantity}))})}}}async placeSteamEngine(e,t,n){if(this.steamEngineManager.getSteamEngineAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.steamEngineManager.placeSteamEngine(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);lt.saveSteamEngine(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation})}}}pickupTorch(e){let t=e.parent;for(;t&&!(t instanceof kt);)t=t.parent;if(t instanceof kt){const i=this.torchManager.getPlacedTorches().find(s=>s.group===t);if(i){const s=i.position.clone();lt.removeTorch({x:i.position.x,y:i.position.y,z:i.position.z}),this.torchManager.removeTorch(i),this.inventory.addItem(X.TORCH,1),this.updateHotbarUI(),this.saveInventory();const o=this.torchManager.getTorchDataForBaking(),a=this.torchManager.getTilesWithTorches();for(const l of this.planets)l.setTorchData(o),l.setTilesWithTorches(a),l.markTilesNearTorchDirty(s,U.TORCH_LIGHT_RANGE)}}}getInventory(){return this.inventory}getCraftingSystem(){return this.craftingSystem}getTorchManager(){return this.torchManager}setTreeManager(e){this.treeManager=e}getPlanetId(e){return this.planets.indexOf(e)===0?"earth":"moon"}saveInventory(){lt.saveInventory(this.inventory.exportForSave())}saveAllFurnaceStates(){const e=this.furnaceManager.getPlacedFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}lt.saveFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,fuelAmount:t.fuelAmount,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}saveAllStorageStates(){const e=this.storageChestManager.getPlacedChests();for(const n of e){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}lt.saveStorageChest(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},rotation:n.rotation,slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}const t=this.garbagePileManager.getPlacedPiles();for(const n of t){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}lt.saveGarbagePile(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}}loadSavedData(){const e=lt.load();if(!e)return;e.inventory&&e.inventory.length>0&&(this.inventory.importFromSave(e.inventory),this.updateHotbarUI());for(const a of this.planets){const l=this.getPlanetId(a),c=lt.getTileChangesForPlanet(l);for(const h of c)a.setBlock(h.tileIndex,h.depth,h.blockType)}const t=lt.getTorches();for(const a of t){const l=this.planets.find((c,h)=>(h===0?"earth":"moon")===a.planetId);if(l){const c=new P(a.position.x,a.position.y,a.position.z);this.torchManager.placeTorch(c,l.center,a.tileIndex)}}if(t.length>0){const a=this.torchManager.getTorchDataForBaking(),l=this.torchManager.getTilesWithTorches();for(const c of this.planets)c.setTorchData(a),c.setTilesWithTorches(l);for(const c of t){const h=new P(c.position.x,c.position.y,c.position.z);for(const u of this.planets)u.markTilesNearTorchDirty(h,U.TORCH_LIGHT_RANGE)}}const n=lt.getFurnaces();for(const a of n){const l=this.planets.find((c,h)=>(h===0?"earth":"moon")===a.planetId);if(l){const c=new P(a.position.x,a.position.y,a.position.z);this.furnaceManager.restoreFurnace(c,l.center,a.tileIndex,a.rotation).then(h=>{h&&(h.fuelAmount=a.fuelAmount,h.smeltingItem=a.smeltingItem,h.smeltingProgress=a.smeltingProgress,h.inputCount=a.inputCount??0,h.outputItem=a.outputItem,h.outputCount=a.outputCount)})}}const i=lt.getStorageChests();for(const a of i){const l=this.planets.find((c,h)=>(h===0?"earth":"moon")===a.planetId);if(l){const c=new P(a.position.x,a.position.y,a.position.z),h=a.slots.map(u=>({itemType:u.itemType,quantity:u.quantity}));this.storageChestManager.restoreChest(c,l.center,a.tileIndex,a.rotation,h)}}const s=lt.getGarbagePiles();for(const a of s){const l=this.planets.find((c,h)=>(h===0?"earth":"moon")===a.planetId);if(l){const c=new P(a.position.x,a.position.y,a.position.z),h=a.slots.map(u=>({itemType:u.itemType,quantity:u.quantity}));this.garbagePileManager.restorePile(c,l.center,a.tileIndex,h)}}const o=lt.getSteamEngines();for(const a of o){const l=this.planets.find((c,h)=>(h===0?"earth":"moon")===a.planetId);if(l){const c=new P(a.position.x,a.position.y,a.position.z);this.steamEngineManager.restoreSteamEngine(c,l.center,a.tileIndex,a.rotation)}}console.log(`Loaded save: ${e.tileChanges.length} tile changes, ${t.length} torches, ${n.length} furnaces, ${i.length} chests, ${s.length} piles, ${o.length} steam engines, inventory restored`)}}let Vm=class{constructor(e){M(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const ks={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function rl(r,e){return new ct({uniforms:{baseColor:{value:r},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
    `})}class qm{constructor(e){M(this,"trunkMaterial");M(this,"leavesMaterial");M(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new P(U.SUN_DIRECTION.x,U.SUN_DIRECTION.y,U.SUN_DIRECTION.z).normalize(),this.trunkMaterial=rl(new we(9127187),this.sunDirection),this.leavesMaterial=rl(new we(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...ks,...n},s=new kt,o=[],a=new we(9127187),l=new we(2263842),c=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6);this.addVertexColors(c,a),o.push(c);let h=i.trunkHeight,u=i.leafBaseRadius;for(let p=0;p<i.leafLayers;p++){const y=new Vs(u,1.2,6);y.translate(0,h+1.2/2,0),this.addVertexColors(y,l),o.push(y),h+=1.2*.6,u*=i.leafTaper}const d=Fl(o),f=this.createMergedTreeMaterial(),x=new Le(d,f);x.userData.isTree=!0,s.add(x);for(const p of o)p.dispose();const g=new P(0,1,0),m=new yt().setFromUnitVectors(g,t.clone().normalize());return s.quaternion.copy(m),s.position.copy(e),s}addVertexColors(e,t){const n=e.attributes.position.count,i=new Float32Array(n*3);for(let s=0;s<n;s++)i[s*3]=t.r,i[s*3+1]=t.g,i[s*3+2]=t.b;e.setAttribute("color",new Ct(i,3))}createMergedTreeMaterial(){return new ct({uniforms:{sunDirection:{value:this.sunDirection.clone().normalize()},ambientIntensity:{value:U.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:U.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
      `})}createHexagonalPrism(e,t,n){const i=new Ei(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class Xm{constructor(e,t){M(this,"trees",[]);M(this,"treesByTile",new Map);M(this,"treeBuilder");M(this,"scene");this.scene=e,this.treeBuilder=new qm(t)}addTree(e,t,n,i){const s=e.clone().sub(t).normalize(),o=this.treeBuilder.createTree(e,s,n);return i!==void 0&&(o.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(o)),this.trees.push(o),this.scene.add(o),o}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),s=i.indexOf(e);s>=0&&i.splice(s,1)}e.traverse(i=>{i instanceof Le&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Le&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,s,o=U.TERRAIN_SEED,a,l){const c=new Vm(o+54321);let h=0,u=0;const d=n*5,f=new Set;for(;h<n&&u<d;){u++;const x=c.next()*Math.PI*2,g=Math.acos(2*c.next()-1);let m=new P(Math.sin(g)*Math.cos(x),Math.sin(g)*Math.sin(x),Math.cos(g)).normalize();const p=a?a(m):null;if(p!==null&&f.has(p))continue;if(l){const A=l(m);A&&(m=A.clone().sub(e).normalize())}if(s&&s(m))continue;const _=i(m),y=e.clone().add(m.clone().multiplyScalar(_));p!==null&&f.add(p);const E=.5+c.next()*1,C=.6+c.next()*.9,v={trunkHeight:ks.trunkHeight*E*C,trunkRadius:ks.trunkRadius*E,leafBaseRadius:ks.leafBaseRadius*E,leafLayers:Math.floor(2+c.next()*4),leafTaper:.6+c.next()*.2};this.addTree(y,e,v,p??void 0),h++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const s of n)s.visible=i}}setAllVisible(e){for(const t of this.trees)t.visible=e}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var Ym=`varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,$m=`precision highp float;

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
}`;function Km(r){const e=r.planetRadius*U.ATMOSPHERE_RADIUS_MULT,t=r.planetRadius-U.ATMOSPHERE_SURFACE_OFFSET;return new ct({uniforms:{planetCenter:{value:new P(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:r.sunDirection.clone().normalize()},viewerPosition:{value:new P},rayleighScale:{value:U.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:U.ATMOSPHERE_MIE_SCALE},mieG:{value:U.ATMOSPHERE_MIE_G},sunIntensity:{value:U.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:U.ATMOSPHERE_SAMPLES},numLightSamples:{value:U.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:Ym,fragmentShader:$m,transparent:!0,side:Bt,depthWrite:!1,blending:Or})}class jm{constructor(e){M(this,"mesh");M(this,"material");const t=e.planetRadius*U.ATMOSPHERE_RADIUS_MULT,n=new $i(t,64,48);this.material=Km(e),this.mesh=new Le(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function Jm(r,e){return new jm({planetRadius:r,sunDirection:e})}var Zm=`varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Qm=`precision highp float;

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
}`;const eg={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class tg{constructor(e){M(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function ng(r,e,t,n){const i=[],s=[],o=[],a=r.clone().sub(t).normalize();let l=new P(1,0,0);Math.abs(a.dot(l))>.9&&(l=new P(0,0,1));const c=new P().crossVectors(a,l).normalize(),h=new P().crossVectors(c,a).normalize(),u=3+Math.floor(n.next()*4);for(let f=0;f<u;f++){const x=(n.next()-.5)*e*.8,g=(n.next()-.5)*e*.4,m=(n.next()-.5)*e*.8,p=r.clone().addScaledVector(c,x).addScaledVector(a,g).addScaledVector(h,m),_=e*(.3+n.next()*.4);ig(i,s,o,p,_,a,c,h)}if(i.length===0)return null;const d=new xt;return d.setAttribute("position",new Oe(i,3)),d.setAttribute("normal",new Oe(s,3)),d.setIndex(o),d.computeBoundingSphere(),d}function ig(r,e,t,n,i,s,o,a){const l=i/2,c=[];for(let u=0;u<8;u++){const d=u&1?l:-l,f=u&2?l:-l,x=u&4?l:-l,g=n.clone().addScaledVector(o,d).addScaledVector(s,f).addScaledVector(a,x);c.push(g)}const h=[{verts:[0,1,3,2],normal:a.clone().negate()},{verts:[4,6,7,5],normal:a.clone()},{verts:[0,2,6,4],normal:o.clone().negate()},{verts:[1,5,7,3],normal:o.clone()},{verts:[0,4,5,1],normal:s.clone().negate()},{verts:[2,3,7,6],normal:s.clone()}];for(const u of h){const d=r.length/3;for(const f of u.verts){const x=c[f];r.push(x.x,x.y,x.z),e.push(u.normal.x,u.normal.y,u.normal.z)}t.push(d,d+1,d+2,d,d+2,d+3)}}function sg(r){return new ct({uniforms:{sunDirection:{value:r.clone().normalize()},cloudColor:{value:new we(16777215)},shadowColor:{value:new we(8947882)},ambientIntensity:{value:.4}},vertexShader:Zm,fragmentShader:Qm,transparent:!0,side:Xt,depthWrite:!0})}class rg{constructor(e={},t){M(this,"clouds");M(this,"material");M(this,"config");M(this,"cloudMesh",null);this.config={...eg,...e},this.clouds=new kt,this.material=sg(t),this.generateClouds()}generateClouds(){const e=new tg(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity),i=[],s=[],o=[];let a=0;for(let l=0;l<n;l++){const c=e.next()*Math.PI*2,h=Math.acos(2*e.next()-1),u=(e.next()-.5)*this.config.cloudThickness,d=t+u,f=d*Math.sin(h)*Math.cos(c),x=d*Math.sin(h)*Math.sin(c),g=d*Math.cos(h),m=new P(f,x,g),p=new P(0,0,0),_=ng(m,this.config.cloudScale*(.5+e.next()*.5),p,e);if(_){const y=_.attributes.position.array,E=_.attributes.normal.array,C=_.index.array;for(let v=0;v<y.length;v++)i.push(y[v]);for(let v=0;v<E.length;v++)s.push(E[v]);for(let v=0;v<C.length;v++)o.push(C[v]+a);a+=y.length/3,_.dispose()}}if(i.length>0){const l=new xt;l.setAttribute("position",new Oe(i,3)),l.setAttribute("normal",new Oe(s,3)),l.setIndex(o),l.computeBoundingSphere(),this.cloudMesh=new Le(l,this.material),this.clouds.add(this.cloudMesh)}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function og(r,e){return new rg({planetRadius:r,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:U.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:U.CLOUD_ROTATION_SPEED},e)}class ag{constructor(){M(this,"steps",new Map);M(this,"totalWeight",0);M(this,"completedWeight",0);M(this,"onProgressCallbacks",[]);M(this,"onCompleteCallbacks",[]);M(this,"currentStatus","Initializing...")}registerStep(e,t=1){this.steps.has(e)||(this.steps.set(e,{name:e,weight:t,completed:!1}),this.totalWeight+=t)}completeStep(e){const t=this.steps.get(e);!t||t.completed||(t.completed=!0,this.completedWeight+=t.weight,this.notifyProgress(),this.completedWeight>=this.totalWeight&&this.notifyComplete())}setStatus(e){this.currentStatus=e,this.notifyProgress()}getProgress(){return this.totalWeight===0?0:Math.min(100,Math.round(this.completedWeight/this.totalWeight*100))}isComplete(){return this.completedWeight>=this.totalWeight&&this.totalWeight>0}onProgress(e){this.onProgressCallbacks.push(e),e(this.getProgress(),this.currentStatus)}onComplete(e){this.onCompleteCallbacks.push(e),this.isComplete()&&e()}updateDOM(){const e=document.getElementById("loading-progress-bar"),t=document.getElementById("loading-status"),n=document.getElementById("loading-percentage"),i=this.getProgress();e&&(e.style.width=`${i}%`),t&&(t.textContent=this.currentStatus),n&&(n.textContent=`${i}%`)}hideLoadingScreen(){const e=document.getElementById("loading-screen");e&&(e.classList.add("hidden"),setTimeout(()=>{e.style.display="none"},500));const t=document.getElementById("instructions");t&&(t.style.display="block")}notifyProgress(){const e=this.getProgress();this.updateDOM();for(const t of this.onProgressCallbacks)t(e,this.currentStatus)}notifyComplete(){for(const e of this.onCompleteCallbacks)e()}reset(){this.steps.clear(),this.totalWeight=0,this.completedWeight=0,this.currentStatus="Initializing..."}}const Ot=new ag;class lg{constructor(){M(this,"engine");M(this,"inputManager");M(this,"earth");M(this,"moon");M(this,"player");M(this,"blockInteraction");M(this,"treeManager");M(this,"earthAtmosphere",null);M(this,"earthClouds",null);M(this,"isReady",!1);M(this,"elapsedTime",0);M(this,"waterUpdateTimer",0);M(this,"WATER_UPDATE_INTERVAL",5);M(this,"sharedFrustum",new Zi);M(this,"projScreenMatrix",new pt);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");e.addEventListener("contextmenu",n=>n.preventDefault()),this.engine=new _m(e),this.inputManager=new xm,this.earth=new tl(this.engine.scene,100,U.EARTH_SUBDIVISIONS),this.moon=new tl(this.engine.scene,50,U.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,ln.init(),ln.setOnMenuCloseCallback(()=>{this.inputManager.resetMouseButtons()});let t=!1;document.addEventListener("keydown",n=>{if(n.key==="Escape"){const i=document.getElementById("instructions"),s=(i==null?void 0:i.style.display)==="block";ln.isAnyMenuOpen()||s&&(t=!0,n.preventDefault())}}),document.addEventListener("keyup",n=>{n.key==="Escape"&&t&&(t=!1,e==null||e.requestPointerLock())}),this.inputManager.setPointerLockCallback(n=>{const i=document.getElementById("instructions");i&&(!n&&ln.isAnyMenuOpen()?i.style.display="none":i.style.display=n?"none":"block");const s=document.getElementById("crosshair");s&&(s.style.display=n?"block":"none")}),this.init()}async init(){try{Ot.registerStep("textures",1),Ot.registerStep("terrain-generation",2),Ot.registerStep("initial-terrain",3),Ot.registerStep("player-setup",1),Ot.registerStep("environment",1),Ot.setStatus("Loading textures..."),await this.earth.initialize(),await this.moon.initialize(),Ot.completeStep("textures"),Ot.setStatus("Generating terrain..."),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),Ot.completeStep("terrain-generation"),Ot.setStatus("Building terrain around spawn...");const e=this.earth.getSpawnPositionAtLatLon(U.EARTH_SPAWN_LAT,U.EARTH_SPAWN_LON,1);await this.earth.buildInitialTerrain(e),Ot.completeStep("initial-terrain"),Ot.setStatus("Initializing player..."),this.player=new Im(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new Wm([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new Xm(this.engine.scene,this.engine.sunDirection),this.treeManager.scatterTrees(this.earth.center,this.earth.radius,U.TREE_COUNT,n=>this.earth.getSurfaceHeightInDirection(n),n=>this.earth.isUnderwaterInDirection(n),U.TERRAIN_SEED,n=>this.earth.getTileIndexInDirection(n),n=>this.earth.getTileCenterInDirection(n)),this.blockInteraction.setTreeManager(this.treeManager),Ot.completeStep("player-setup"),this.inputManager.setInventoryToggleCallback(()=>{this.blockInteraction.getCraftingSystem().toggle()}),this.inputManager.setPauseToggleCallback(()=>{const n=document.getElementById("instructions"),i=document.getElementById("mobile-controls");if(n){const s=n.style.display!=="none";n.style.display=s?"none":"block",i&&(i.style.display=s?"block":"none")}}),Ot.setStatus("Creating environment..."),U.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=Jm(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=og(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection),Ot.completeStep("environment");const t=this.earth.getWaterShaderMaterial();t&&this.engine.registerWaterMaterial(t),this.earth.setWaterMeshCallback((n,i)=>{i?this.engine.registerWaterMesh(n):this.engine.unregisterWaterMesh(n)}),this.setupSettingsMenu(),_e.setFrameSpikeThreshold(U.FRAME_SPIKE_THRESHOLD_MS),this.loadSavedGame(),lt.setPlayerSaveCallback(()=>this.player.exportForSave()),lt.startAutoSave(5),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),Ot.setStatus("Ready!"),Ot.hideLoadingScreen(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,_e.begin("Player"),this.player.update(e),_e.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),_e.begin("Block Interaction");const t=this.inputManager.getState(),n=this.inputManager.isLocked(),i=this.inputManager.getWheelDelta();this.blockInteraction.update(e,n&&t.leftClick,n&&t.rightClick,n?i:0),_e.end("Block Interaction"),_e.begin("Frustum Calc"),this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix,this.engine.camera.matrixWorldInverse),this.sharedFrustum.setFromProjectionMatrix(this.projScreenMatrix),_e.end("Frustum Calc"),_e.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera,e,this.sharedFrustum),_e.end("Earth Update"),_e.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera,e,this.sharedFrustum),_e.end("Moon Update");const s=this.player.getIsInWater();if(this.earth.updateWaterShader(this.elapsedTime,s),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.waterUpdateTimer+=e,this.waterUpdateTimer>=this.WATER_UPDATE_INTERVAL){this.waterUpdateTimer=0;const o=this.earth.getVisibleTileIndices(),a=this.earth.updateWaterFlow(o);a>0&&console.log(`[Water update] Fixed ${a} water blocks in ${o.size} tiles`)}this.earth.isInOrbitView()?this.treeManager.setAllVisible(!1):this.treeManager.setAllVisible(!0)}setupSettingsMenu(){var l;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),s=document.getElementById("teleport-select"),o=document.querySelectorAll(".menu-tab");if(o.forEach(c=>{c.addEventListener("click",()=>{o.forEach(d=>d.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(d=>d.classList.remove("active")),c.classList.add("active");const h=c.getAttribute("data-tab"),u=document.getElementById(`tab-${h}`);u&&u.classList.add("active")})}),!e||!t)return;e.checked=((l=this.earthAtmosphere)==null?void 0:l.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=!1,this.player.setJetpackEnabled(!1),n.addEventListener("change",()=>{this.player.setJetpackEnabled(n.checked)})),i&&(i.checked=U.INVERT_Y_AXIS,i.addEventListener("change",()=>{U.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),s&&s.addEventListener("change",()=>{this.teleportToPlanet(s.value)});const a=document.getElementById("reset-game-btn");a&&a.addEventListener("click",()=>{confirm("Are you sure you want to reset your game? This will delete all saved progress.")&&(lt.stopAutoSave(),lt.clearSave(),window.location.reload())})}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1;let i;if(e==="earth")i=t.getSpawnPositionAtLatLon(U.EARTH_SPAWN_LAT,U.EARTH_SPAWN_LON,n);else{const s=new P(-1,0,0),o=t.getSurfaceHeightInDirection(s);i=t.center.clone(),i.x-=o+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}loadSavedGame(){const e=lt.load();if(!e){console.log("No saved game found, starting fresh");return}if(this.blockInteraction.loadSavedData(),e.player&&e.player.position){const t=e.player.position;Math.sqrt(t.x*t.x+t.y*t.y+t.z*t.z)>50&&(this.player.importFromSave(e.player),console.log(`Loaded player position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`))}console.log("Game loaded from save")}}document.addEventListener("DOMContentLoaded",()=>{new lg});
//# sourceMappingURL=index-DBrc4QUl.js.map
