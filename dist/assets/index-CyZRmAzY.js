var $l=Object.defineProperty;var Kl=(r,e,t)=>e in r?$l(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var y=(r,e,t)=>Kl(r,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=t(i);fetch(i.href,s)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ro="181",jl=0,Jo=1,Jl=2,ll=1,cl=2,bn=3,Fn=0,Gt=1,Xt=2,En=0,xi=1,Fr=2,Zo=3,Qo=4,Zl=5,$n=100,Ql=101,ec=102,tc=103,nc=104,ic=200,sc=201,rc=202,oc=203,Ur=204,kr=205,ac=206,lc=207,cc=208,hc=209,uc=210,dc=211,fc=212,pc=213,mc=214,Gr=0,Br=1,zr=2,yi=3,Hr=4,Wr=5,Vr=6,qr=7,Io=0,gc=1,xc=2,Nn=0,vc=1,yc=2,_c=3,Sc=4,bc=5,Tc=6,Ec=7,hl=300,_i=301,Si=302,Xr=303,Yr=304,Xs=306,Qn=1e3,It=1001,$r=1002,ut=1003,Mc=1004,rs=1005,nn=1006,er=1007,Zn=1008,mn=1009,ul=1010,dl=1011,Yi=1012,Po=1013,Un=1014,Tn=1015,Ci=1016,Do=1017,Lo=1018,$i=1020,fl=35902,pl=35899,ml=1021,gl=1022,hn=1023,bi=1026,Ki=1027,xl=1028,Oo=1029,No=1030,Fo=1031,Uo=1033,Ds=33776,Ls=33777,Os=33778,Ns=33779,Kr=35840,jr=35841,Jr=35842,Zr=35843,Qr=36196,eo=37492,to=37496,no=37808,io=37809,so=37810,ro=37811,oo=37812,ao=37813,lo=37814,co=37815,ho=37816,uo=37817,fo=37818,po=37819,mo=37820,go=37821,xo=36492,vo=36494,yo=36495,_o=36283,So=36284,bo=36285,To=36286,Ac=3200,Cc=3201,vl=0,wc=1,Ln="",tn="srgb",Ti="srgb-linear",Hs="linear",pt="srgb",ni=7680,ea=519,Rc=512,Ic=513,Pc=514,yl=515,Dc=516,Lc=517,Oc=518,Nc=519,ta=35044,na="300 es",pn=2e3,Ws=2001;function _l(r){for(let e=r.length-1;e>=0;--e)if(r[e]>=65535)return!0;return!1}function ji(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Fc(){const r=ji("canvas");return r.style.display="block",r}const ia={};function sa(...r){const e="THREE."+r.shift();console.log(e,...r)}function je(...r){const e="THREE."+r.shift();console.warn(e,...r)}function At(...r){const e="THREE."+r.shift();console.error(e,...r)}function Ji(...r){const e=r.join(" ");e in ia||(ia[e]=!0,je(...r))}function Uc(r,e,t){return new Promise(function(n,i){function s(){switch(r.clientWaitSync(e,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:i();break;case r.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}class wi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let s=0,o=i.length;s<o;s++)i[s].call(this,e);e.target=null}}}const Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],tr=Math.PI/180,Eo=180/Math.PI;function Qi(){const r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ft[r&255]+Ft[r>>8&255]+Ft[r>>16&255]+Ft[r>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]).toLowerCase()}function rt(r,e,t){return Math.max(e,Math.min(t,r))}function kc(r,e){return(r%e+e)%e}function nr(r,e,t){return(1-t)*r+t*e}function Li(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function qt(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}class ot{constructor(e=0,t=0){ot.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=rt(this.x,e.x,t.x),this.y=rt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=rt(this.x,e,t),this.y=rt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(rt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(rt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*n-o*i+e.x,this.y=s*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class lt{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3],d=s[o+0],f=s[o+1],m=s[o+2],x=s[o+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(a>=1){e[t+0]=d,e[t+1]=f,e[t+2]=m,e[t+3]=x;return}if(u!==x||l!==d||c!==f||h!==m){let g=l*d+c*f+h*m+u*x;g<0&&(d=-d,f=-f,m=-m,x=-x,g=-g);let p=1-a;if(g<.9995){const _=Math.acos(g),v=Math.sin(_);p=Math.sin(p*_)/v,a=Math.sin(a*_)/v,l=l*p+d*a,c=c*p+f*a,h=h*p+m*a,u=u*p+x*a}else{l=l*p+d*a,c=c*p+f*a,h=h*p+m*a,u=u*p+x*a;const _=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=_,c*=_,h*=_,u*=_}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,s,o){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=s[o],d=s[o+1],f=s[o+2],m=s[o+3];return e[t]=a*m+h*u+l*f-c*d,e[t+1]=l*m+h*d+c*u-a*f,e[t+2]=c*m+h*f+a*d-l*u,e[t+3]=h*m-a*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),u=a(s/2),d=l(n/2),f=l(i/2),m=l(s/2);switch(o){case"XYZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"YXZ":this._x=d*h*u+c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"ZXY":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u-d*f*m;break;case"ZYX":this._x=d*h*u-c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u+d*f*m;break;case"YZX":this._x=d*h*u+c*f*m,this._y=c*f*u+d*h*m,this._z=c*h*m-d*f*u,this._w=c*h*u-d*f*m;break;case"XZY":this._x=d*h*u-c*f*m,this._y=c*f*u-d*h*m,this._z=c*h*m+d*f*u,this._w=c*h*u+d*f*m;break;default:je("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(o-i)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(s+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(s-c)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(rt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+i*c-s*l,this._y=i*h+o*l+s*a-n*c,this._z=s*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,s=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,s=-s,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class I{constructor(e=0,t=0,n=0){I.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ra.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ra.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=e.elements,o=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*o,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*o,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*i-a*n),h=2*(a*t-s*i),u=2*(s*n-o*t);return this.x=t+l*c+o*u-a*h,this.y=n+l*h+a*c-s*u,this.z=i+l*u+s*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=rt(this.x,e.x,t.x),this.y=rt(this.y,e.y,t.y),this.z=rt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=rt(this.x,e,t),this.y=rt(this.y,e,t),this.z=rt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(rt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=i*l-s*a,this.y=s*o-n*l,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ir.copy(this).projectOnVector(e),this.sub(ir)}reflect(e){return this.sub(ir.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(rt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ir=new I,ra=new lt;class Ze{constructor(e,t,n,i,s,o,a,l,c){Ze.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c)}set(e,t,n,i,s,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=s,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],m=n[8],x=i[0],g=i[3],p=i[6],_=i[1],v=i[4],M=i[7],b=i[2],S=i[5],C=i[8];return s[0]=o*x+a*_+l*b,s[3]=o*g+a*v+l*S,s[6]=o*p+a*M+l*C,s[1]=c*x+h*_+u*b,s[4]=c*g+h*v+u*S,s[7]=c*p+h*M+u*C,s[2]=d*x+f*_+m*b,s[5]=d*g+f*v+m*S,s[8]=d*p+f*M+m*C,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*s*h+n*a*l+i*s*c-i*o*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=h*o-a*c,d=a*l-h*s,f=c*s-o*l,m=t*u+n*d+i*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/m;return e[0]=u*x,e[1]=(i*c-h*n)*x,e[2]=(a*n-i*o)*x,e[3]=d*x,e[4]=(h*t-i*l)*x,e[5]=(i*s-a*t)*x,e[6]=f*x,e[7]=(n*l-c*t)*x,e[8]=(o*t-n*s)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-i*c,i*l,-i*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(sr.makeScale(e,t)),this}rotate(e){return this.premultiply(sr.makeRotation(-e)),this}translate(e,t){return this.premultiply(sr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const sr=new Ze,oa=new Ze().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),aa=new Ze().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Gc(){const r={enabled:!0,workingColorSpace:Ti,spaces:{},convert:function(i,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===pt&&(i.r=Mn(i.r),i.g=Mn(i.g),i.b=Mn(i.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===pt&&(i.r=vi(i.r),i.g=vi(i.g),i.b=vi(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Ln?Hs:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,o){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return Ji("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return Ji("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return r.define({[Ti]:{primaries:e,whitePoint:n,transfer:Hs,toXYZ:oa,fromXYZ:aa,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:tn},outputColorSpaceConfig:{drawingBufferColorSpace:tn}},[tn]:{primaries:e,whitePoint:n,transfer:pt,toXYZ:oa,fromXYZ:aa,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:tn}}}),r}const ht=Gc();function Mn(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function vi(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}let ii;class Bc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ii===void 0&&(ii=ji("canvas")),ii.width=e.width,ii.height=e.height;const i=ii.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=ii}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ji("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let o=0;o<s.length;o++)s[o]=Mn(s[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Mn(t[n]/255)*255):t[n]=Mn(t[n]);return{data:t,width:e.width,height:e.height}}else return je("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let zc=0;class ko{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:zc++}),this.uuid=Qi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?s.push(rr(i[o].image)):s.push(rr(i[o]))}else s=rr(i);n.url=s}return t||(e.images[this.uuid]=n),n}}function rr(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Bc.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(je("Texture: Unable to serialize Texture."),{})}let Hc=0;const or=new I;class Bt extends wi{constructor(e=Bt.DEFAULT_IMAGE,t=Bt.DEFAULT_MAPPING,n=It,i=It,s=nn,o=Zn,a=hn,l=mn,c=Bt.DEFAULT_ANISOTROPY,h=Ln){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Hc++}),this.uuid=Qi(),this.name="",this.source=new ko(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ot(0,0),this.repeat=new ot(1,1),this.center=new ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ze,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(or).x}get height(){return this.source.getSize(or).y}get depth(){return this.source.getSize(or).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){je(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){je(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==hl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Qn:e.x=e.x-Math.floor(e.x);break;case It:e.x=e.x<0?0:1;break;case $r:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Qn:e.y=e.y-Math.floor(e.y);break;case It:e.y=e.y<0?0:1;break;case $r:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Bt.DEFAULT_IMAGE=null;Bt.DEFAULT_MAPPING=hl;Bt.DEFAULT_ANISOTROPY=1;class gt{constructor(e=0,t=0,n=0,i=1){gt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*s,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*s,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*s,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],m=l[9],x=l[2],g=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(m+g)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(c+1)/2,M=(f+1)/2,b=(p+1)/2,S=(h+d)/4,C=(u+x)/4,L=(m+g)/4;return v>M&&v>b?v<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(v),i=S/n,s=C/n):M>b?M<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(M),n=S/i,s=L/i):b<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(b),n=C/s,i=L/s),this.set(n,i,s,t),this}let _=Math.sqrt((g-m)*(g-m)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(_)<.001&&(_=1),this.x=(g-m)/_,this.y=(u-x)/_,this.z=(d-h)/_,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=rt(this.x,e.x,t.x),this.y=rt(this.y,e.y,t.y),this.z=rt(this.z,e.z,t.z),this.w=rt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=rt(this.x,e,t),this.y=rt(this.y,e,t),this.z=rt(this.z,e,t),this.w=rt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(rt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Wc extends wi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:nn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new gt(0,0,e,t),this.scissorTest=!1,this.viewport=new gt(0,0,e,t);const i={width:e,height:t,depth:n.depth},s=new Bt(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=s.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:nn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new ko(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class kn extends Wc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Sl extends Bt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ut,this.minFilter=ut,this.wrapR=It,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Vc extends Bt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=ut,this.minFilter=ut,this.wrapR=It,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class es{constructor(e=new I(1/0,1/0,1/0),t=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(on.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(on.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=on.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,on):on.fromBufferAttribute(s,o),on.applyMatrix4(e.matrixWorld),this.expandByPoint(on);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),os.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),os.copy(n.boundingBox)),os.applyMatrix4(e.matrixWorld),this.union(os)}const i=e.children;for(let s=0,o=i.length;s<o;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,on),on.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Oi),as.subVectors(this.max,Oi),si.subVectors(e.a,Oi),ri.subVectors(e.b,Oi),oi.subVectors(e.c,Oi),Cn.subVectors(ri,si),wn.subVectors(oi,ri),zn.subVectors(si,oi);let t=[0,-Cn.z,Cn.y,0,-wn.z,wn.y,0,-zn.z,zn.y,Cn.z,0,-Cn.x,wn.z,0,-wn.x,zn.z,0,-zn.x,-Cn.y,Cn.x,0,-wn.y,wn.x,0,-zn.y,zn.x,0];return!ar(t,si,ri,oi,as)||(t=[1,0,0,0,1,0,0,0,1],!ar(t,si,ri,oi,as))?!1:(ls.crossVectors(Cn,wn),t=[ls.x,ls.y,ls.z],ar(t,si,ri,oi,as))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,on).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(on).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(gn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),gn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),gn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),gn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),gn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),gn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),gn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),gn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(gn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const gn=[new I,new I,new I,new I,new I,new I,new I,new I],on=new I,os=new es,si=new I,ri=new I,oi=new I,Cn=new I,wn=new I,zn=new I,Oi=new I,as=new I,ls=new I,Hn=new I;function ar(r,e,t,n,i){for(let s=0,o=r.length-3;s<=o;s+=3){Hn.fromArray(r,s);const a=i.x*Math.abs(Hn.x)+i.y*Math.abs(Hn.y)+i.z*Math.abs(Hn.z),l=e.dot(Hn),c=t.dot(Hn),h=n.dot(Hn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const qc=new es,Ni=new I,lr=new I;class Ei{constructor(e=new I,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):qc.setFromPoints(e).getCenter(n);let i=0;for(let s=0,o=e.length;s<o;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ni.subVectors(e,this.center);const t=Ni.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Ni,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(lr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ni.copy(e.center).add(lr)),this.expandByPoint(Ni.copy(e.center).sub(lr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const xn=new I,cr=new I,cs=new I,Rn=new I,hr=new I,hs=new I,ur=new I;class Go{constructor(e=new I,t=new I(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,xn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=xn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(xn.copy(this.origin).addScaledVector(this.direction,t),xn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){cr.copy(e).add(t).multiplyScalar(.5),cs.copy(t).sub(e).normalize(),Rn.copy(this.origin).sub(cr);const s=e.distanceTo(t)*.5,o=-this.direction.dot(cs),a=Rn.dot(this.direction),l=-Rn.dot(cs),c=Rn.lengthSq(),h=Math.abs(1-o*o);let u,d,f,m;if(h>0)if(u=o*l-a,d=o*a-l,m=s*h,u>=0)if(d>=-m)if(d<=m){const x=1/h;u*=x,d*=x,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-m?(u=Math.max(0,-(-o*s+a)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=m?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(o*s+a)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=o>0?-s:s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(cr).addScaledVector(cs,d),f}intersectSphere(e,t){xn.subVectors(e.center,this.origin);const n=xn.dot(this.direction),i=xn.dot(xn)-n*n,s=e.radius*e.radius;if(i>s)return null;const o=Math.sqrt(s-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,i=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,i=(e.min.x-d.x)*c),h>=0?(s=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),n>o||s>i||((s>n||isNaN(n))&&(n=s),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,xn)!==null}intersectTriangle(e,t,n,i,s){hr.subVectors(t,e),hs.subVectors(n,e),ur.crossVectors(hr,hs);let o=this.direction.dot(ur),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Rn.subVectors(this.origin,e);const l=a*this.direction.dot(hs.crossVectors(Rn,hs));if(l<0)return null;const c=a*this.direction.dot(hr.cross(Rn));if(c<0||l+c>o)return null;const h=-a*Rn.dot(ur);return h<0?null:this.at(h/o,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class xt{constructor(e,t,n,i,s,o,a,l,c,h,u,d,f,m,x,g){xt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,o,a,l,c,h,u,d,f,m,x,g)}set(e,t,n,i,s,o,a,l,c,h,u,d,f,m,x,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=s,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=m,p[11]=x,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new xt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/ai.setFromMatrixColumn(e,0).length(),s=1/ai.setFromMatrixColumn(e,1).length(),o=1/ai.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,s=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),u=Math.sin(s);if(e.order==="XYZ"){const d=o*h,f=o*u,m=a*h,x=a*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+m*c,t[5]=d-x*c,t[9]=-a*l,t[2]=x-d*c,t[6]=m+f*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,m=c*h,x=c*u;t[0]=d+x*a,t[4]=m*a-f,t[8]=o*c,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=f*a-m,t[6]=x+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,m=c*h,x=c*u;t[0]=d-x*a,t[4]=-o*u,t[8]=m+f*a,t[1]=f+m*a,t[5]=o*h,t[9]=x-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*h,f=o*u,m=a*h,x=a*u;t[0]=l*h,t[4]=m*c-f,t[8]=d*c+x,t[1]=l*u,t[5]=x*c+d,t[9]=f*c-m,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=x-d*u,t[8]=m*u+f,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*u+m,t[10]=d-x*u}else if(e.order==="XZY"){const d=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+x,t[5]=o*h,t[9]=f*u-m,t[2]=m*u-f,t[6]=a*h,t[10]=x*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Xc,e,Yc)}lookAt(e,t,n){const i=this.elements;return jt.subVectors(e,t),jt.lengthSq()===0&&(jt.z=1),jt.normalize(),In.crossVectors(n,jt),In.lengthSq()===0&&(Math.abs(n.z)===1?jt.x+=1e-4:jt.z+=1e-4,jt.normalize(),In.crossVectors(n,jt)),In.normalize(),us.crossVectors(jt,In),i[0]=In.x,i[4]=us.x,i[8]=jt.x,i[1]=In.y,i[5]=us.y,i[9]=jt.y,i[2]=In.z,i[6]=us.z,i[10]=jt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],m=n[2],x=n[6],g=n[10],p=n[14],_=n[3],v=n[7],M=n[11],b=n[15],S=i[0],C=i[4],L=i[8],E=i[12],T=i[1],R=i[5],O=i[9],k=i[13],z=i[2],B=i[6],G=i[10],Z=i[14],V=i[3],J=i[7],Q=i[11],oe=i[15];return s[0]=o*S+a*T+l*z+c*V,s[4]=o*C+a*R+l*B+c*J,s[8]=o*L+a*O+l*G+c*Q,s[12]=o*E+a*k+l*Z+c*oe,s[1]=h*S+u*T+d*z+f*V,s[5]=h*C+u*R+d*B+f*J,s[9]=h*L+u*O+d*G+f*Q,s[13]=h*E+u*k+d*Z+f*oe,s[2]=m*S+x*T+g*z+p*V,s[6]=m*C+x*R+g*B+p*J,s[10]=m*L+x*O+g*G+p*Q,s[14]=m*E+x*k+g*Z+p*oe,s[3]=_*S+v*T+M*z+b*V,s[7]=_*C+v*R+M*B+b*J,s[11]=_*L+v*O+M*G+b*Q,s[15]=_*E+v*k+M*Z+b*oe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],m=e[3],x=e[7],g=e[11],p=e[15];return m*(+s*l*u-i*c*u-s*a*d+n*c*d+i*a*f-n*l*f)+x*(+t*l*f-t*c*d+s*o*d-i*o*f+i*c*h-s*l*h)+g*(+t*c*u-t*a*f-s*o*u+n*o*f+s*a*h-n*c*h)+p*(-i*a*h-t*l*u+t*a*d+i*o*u-n*o*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],m=e[12],x=e[13],g=e[14],p=e[15],_=u*g*c-x*d*c+x*l*f-a*g*f-u*l*p+a*d*p,v=m*d*c-h*g*c-m*l*f+o*g*f+h*l*p-o*d*p,M=h*x*c-m*u*c+m*a*f-o*x*f-h*a*p+o*u*p,b=m*u*l-h*x*l-m*a*d+o*x*d+h*a*g-o*u*g,S=t*_+n*v+i*M+s*b;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const C=1/S;return e[0]=_*C,e[1]=(x*d*s-u*g*s-x*i*f+n*g*f+u*i*p-n*d*p)*C,e[2]=(a*g*s-x*l*s+x*i*c-n*g*c-a*i*p+n*l*p)*C,e[3]=(u*l*s-a*d*s-u*i*c+n*d*c+a*i*f-n*l*f)*C,e[4]=v*C,e[5]=(h*g*s-m*d*s+m*i*f-t*g*f-h*i*p+t*d*p)*C,e[6]=(m*l*s-o*g*s-m*i*c+t*g*c+o*i*p-t*l*p)*C,e[7]=(o*d*s-h*l*s+h*i*c-t*d*c-o*i*f+t*l*f)*C,e[8]=M*C,e[9]=(m*u*s-h*x*s-m*n*f+t*x*f+h*n*p-t*u*p)*C,e[10]=(o*x*s-m*a*s+m*n*c-t*x*c-o*n*p+t*a*p)*C,e[11]=(h*a*s-o*u*s-h*n*c+t*u*c+o*n*f-t*a*f)*C,e[12]=b*C,e[13]=(h*x*i-m*u*i+m*n*d-t*x*d-h*n*g+t*u*g)*C,e[14]=(m*a*i-o*x*i-m*n*l+t*x*l+o*n*g-t*a*g)*C,e[15]=(o*u*i-h*a*i+h*n*l-t*u*l-o*n*d+t*a*d)*C,this}scale(e){const t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),s=1-n,o=e.x,a=e.y,l=e.z,c=s*o,h=s*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,o){return this.set(1,n,s,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,h=o+o,u=a+a,d=s*c,f=s*h,m=s*u,x=o*h,g=o*u,p=a*u,_=l*c,v=l*h,M=l*u,b=n.x,S=n.y,C=n.z;return i[0]=(1-(x+p))*b,i[1]=(f+M)*b,i[2]=(m-v)*b,i[3]=0,i[4]=(f-M)*S,i[5]=(1-(d+p))*S,i[6]=(g+_)*S,i[7]=0,i[8]=(m+v)*C,i[9]=(g-_)*C,i[10]=(1-(d+x))*C,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let s=ai.set(i[0],i[1],i[2]).length();const o=ai.set(i[4],i[5],i[6]).length(),a=ai.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],an.copy(this);const c=1/s,h=1/o,u=1/a;return an.elements[0]*=c,an.elements[1]*=c,an.elements[2]*=c,an.elements[4]*=h,an.elements[5]*=h,an.elements[6]*=h,an.elements[8]*=u,an.elements[9]*=u,an.elements[10]*=u,t.setFromRotationMatrix(an),n.x=s,n.y=o,n.z=a,this}makePerspective(e,t,n,i,s,o,a=pn,l=!1){const c=this.elements,h=2*s/(t-e),u=2*s/(n-i),d=(t+e)/(t-e),f=(n+i)/(n-i);let m,x;if(l)m=s/(o-s),x=o*s/(o-s);else if(a===pn)m=-(o+s)/(o-s),x=-2*o*s/(o-s);else if(a===Ws)m=-o/(o-s),x=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,o,a=pn,l=!1){const c=this.elements,h=2/(t-e),u=2/(n-i),d=-(t+e)/(t-e),f=-(n+i)/(n-i);let m,x;if(l)m=1/(o-s),x=o/(o-s);else if(a===pn)m=-2/(o-s),x=-(o+s)/(o-s);else if(a===Ws)m=-1/(o-s),x=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ai=new I,an=new xt,Xc=new I(0,0,0),Yc=new I(1,1,1),In=new I,us=new I,jt=new I,la=new xt,ca=new lt;class un{constructor(e=0,t=0,n=0,i=un.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,s=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],u=i[2],d=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(rt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-rt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(rt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-rt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(rt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-rt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:je("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return la.makeRotationFromQuaternion(e),this.setFromRotationMatrix(la,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ca.setFromEuler(this),this.setFromQuaternion(ca,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}un.DEFAULT_ORDER="XYZ";class Bo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let $c=0;const ha=new I,li=new lt,vn=new xt,ds=new I,Fi=new I,Kc=new I,jc=new lt,ua=new I(1,0,0),da=new I(0,1,0),fa=new I(0,0,1),pa={type:"added"},Jc={type:"removed"},ci={type:"childadded",child:null},dr={type:"childremoved",child:null};class Ot extends wi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:$c++}),this.uuid=Qi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ot.DEFAULT_UP.clone();const e=new I,t=new un,n=new lt,i=new I(1,1,1);function s(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new xt},normalMatrix:{value:new Ze}}),this.matrix=new xt,this.matrixWorld=new xt,this.matrixAutoUpdate=Ot.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return li.setFromAxisAngle(e,t),this.quaternion.multiply(li),this}rotateOnWorldAxis(e,t){return li.setFromAxisAngle(e,t),this.quaternion.premultiply(li),this}rotateX(e){return this.rotateOnAxis(ua,e)}rotateY(e){return this.rotateOnAxis(da,e)}rotateZ(e){return this.rotateOnAxis(fa,e)}translateOnAxis(e,t){return ha.copy(e).applyQuaternion(this.quaternion),this.position.add(ha.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ua,e)}translateY(e){return this.translateOnAxis(da,e)}translateZ(e){return this.translateOnAxis(fa,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(vn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ds.copy(e):ds.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Fi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?vn.lookAt(Fi,ds,this.up):vn.lookAt(ds,Fi,this.up),this.quaternion.setFromRotationMatrix(vn),i&&(vn.extractRotation(i.matrixWorld),li.setFromRotationMatrix(vn),this.quaternion.premultiply(li.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(At("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(pa),ci.child=e,this.dispatchEvent(ci),ci.child=null):At("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Jc),dr.child=e,this.dispatchEvent(dr),dr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),vn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),vn.multiply(e.parent.matrixWorld)),e.applyMatrix4(vn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(pa),ci.child=e,this.dispatchEvent(ci),ci.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fi,e,Kc),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fi,jc,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];s(e.shapes,u)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));i.material=a}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),f=o(e.animations),m=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=i,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}Ot.DEFAULT_UP=new I(0,1,0);Ot.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ot.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const ln=new I,yn=new I,fr=new I,_n=new I,hi=new I,ui=new I,ma=new I,pr=new I,mr=new I,gr=new I,xr=new gt,vr=new gt,yr=new gt;class cn{constructor(e=new I,t=new I,n=new I){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),ln.subVectors(e,t),i.cross(ln);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){ln.subVectors(i,t),yn.subVectors(n,t),fr.subVectors(e,t);const o=ln.dot(ln),a=ln.dot(yn),l=ln.dot(fr),c=yn.dot(yn),h=yn.dot(fr),u=o*c-a*a;if(u===0)return s.set(0,0,0),null;const d=1/u,f=(c*l-a*h)*d,m=(o*h-a*l)*d;return s.set(1-f-m,m,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,_n)===null?!1:_n.x>=0&&_n.y>=0&&_n.x+_n.y<=1}static getInterpolation(e,t,n,i,s,o,a,l){return this.getBarycoord(e,t,n,i,_n)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,_n.x),l.addScaledVector(o,_n.y),l.addScaledVector(a,_n.z),l)}static getInterpolatedAttribute(e,t,n,i,s,o){return xr.setScalar(0),vr.setScalar(0),yr.setScalar(0),xr.fromBufferAttribute(e,t),vr.fromBufferAttribute(e,n),yr.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(xr,s.x),o.addScaledVector(vr,s.y),o.addScaledVector(yr,s.z),o}static isFrontFacing(e,t,n,i){return ln.subVectors(n,t),yn.subVectors(e,t),ln.cross(yn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ln.subVectors(this.c,this.b),yn.subVectors(this.a,this.b),ln.cross(yn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return cn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return cn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return cn.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return cn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return cn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,s=this.c;let o,a;hi.subVectors(i,n),ui.subVectors(s,n),pr.subVectors(e,n);const l=hi.dot(pr),c=ui.dot(pr);if(l<=0&&c<=0)return t.copy(n);mr.subVectors(e,i);const h=hi.dot(mr),u=ui.dot(mr);if(h>=0&&u<=h)return t.copy(i);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(hi,o);gr.subVectors(e,s);const f=hi.dot(gr),m=ui.dot(gr);if(m>=0&&f<=m)return t.copy(s);const x=f*c-l*m;if(x<=0&&c>=0&&m<=0)return a=c/(c-m),t.copy(n).addScaledVector(ui,a);const g=h*m-f*u;if(g<=0&&u-h>=0&&f-m>=0)return ma.subVectors(s,i),a=(u-h)/(u-h+(f-m)),t.copy(i).addScaledVector(ma,a);const p=1/(g+x+d);return o=x*p,a=d*p,t.copy(n).addScaledVector(hi,o).addScaledVector(ui,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const bl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Pn={h:0,s:0,l:0},fs={h:0,s:0,l:0};function _r(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}class Le{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=tn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ht.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=ht.workingColorSpace){return this.r=e,this.g=t,this.b=n,ht.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=ht.workingColorSpace){if(e=kc(e,1),t=rt(t,0,1),n=rt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,o=2*n-s;this.r=_r(o,s,e+1/3),this.g=_r(o,s,e),this.b=_r(o,s,e-1/3)}return ht.colorSpaceToWorking(this,i),this}setStyle(e,t=tn){function n(s){s!==void 0&&parseFloat(s)<1&&je("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:je("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=i[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);je("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=tn){const n=bl[e.toLowerCase()];return n!==void 0?this.setHex(n,t):je("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Mn(e.r),this.g=Mn(e.g),this.b=Mn(e.b),this}copyLinearToSRGB(e){return this.r=vi(e.r),this.g=vi(e.g),this.b=vi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=tn){return ht.workingToColorSpace(Ut.copy(this),e),Math.round(rt(Ut.r*255,0,255))*65536+Math.round(rt(Ut.g*255,0,255))*256+Math.round(rt(Ut.b*255,0,255))}getHexString(e=tn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ht.workingColorSpace){ht.workingToColorSpace(Ut.copy(this),t);const n=Ut.r,i=Ut.g,s=Ut.b,o=Math.max(n,i,s),a=Math.min(n,i,s);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(i-s)/u+(i<s?6:0);break;case i:l=(s-n)/u+2;break;case s:l=(n-i)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=ht.workingColorSpace){return ht.workingToColorSpace(Ut.copy(this),t),e.r=Ut.r,e.g=Ut.g,e.b=Ut.b,e}getStyle(e=tn){ht.workingToColorSpace(Ut.copy(this),e);const t=Ut.r,n=Ut.g,i=Ut.b;return e!==tn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Pn),this.setHSL(Pn.h+e,Pn.s+t,Pn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Pn),e.getHSL(fs);const n=nr(Pn.h,fs.h,t),i=nr(Pn.s,fs.s,t),s=nr(Pn.l,fs.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ut=new Le;Le.NAMES=bl;let Zc=0;class An extends wi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Zc++}),this.uuid=Qi(),this.name="",this.type="Material",this.blending=xi,this.side=Fn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ur,this.blendDst=kr,this.blendEquation=$n,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Le(0,0,0),this.blendAlpha=0,this.depthFunc=yi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ea,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ni,this.stencilZFail=ni,this.stencilZPass=ni,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){je(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){je(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==xi&&(n.blending=this.blending),this.side!==Fn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ur&&(n.blendSrc=this.blendSrc),this.blendDst!==kr&&(n.blendDst=this.blendDst),this.blendEquation!==$n&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==yi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ea&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ni&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ni&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ni&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=i(e.textures),o=i(e.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class ts extends An{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Le(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new un,this.combine=Io,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Ct=new I,ps=new ot;let Qc=0;class wt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Qc++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=ta,this.updateRanges=[],this.gpuType=Tn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ps.fromBufferAttribute(this,t),ps.applyMatrix3(e),this.setXY(t,ps.x,ps.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Li(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=qt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Li(t,this.array)),t}setX(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Li(t,this.array)),t}setY(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Li(t,this.array)),t}setZ(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Li(t,this.array)),t}setW(e,t){return this.normalized&&(t=qt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array),i=qt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=qt(t,this.array),n=qt(n,this.array),i=qt(i,this.array),s=qt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ta&&(e.usage=this.usage),e}}class Tl extends wt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class El extends wt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Oe extends wt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let eh=0;const en=new xt,Sr=new Ot,di=new I,Jt=new es,Ui=new es,Lt=new I;class yt extends wi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:eh++}),this.uuid=Qi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(_l(e)?El:Tl)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Ze().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return en.makeRotationFromQuaternion(e),this.applyMatrix4(en),this}rotateX(e){return en.makeRotationX(e),this.applyMatrix4(en),this}rotateY(e){return en.makeRotationY(e),this.applyMatrix4(en),this}rotateZ(e){return en.makeRotationZ(e),this.applyMatrix4(en),this}translate(e,t,n){return en.makeTranslation(e,t,n),this.applyMatrix4(en),this}scale(e,t,n){return en.makeScale(e,t,n),this.applyMatrix4(en),this}lookAt(e){return Sr.lookAt(e),Sr.updateMatrix(),this.applyMatrix4(Sr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(di).negate(),this.translate(di.x,di.y,di.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,s=e.length;i<s;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Oe(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&je("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new es);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){At("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const s=t[n];Jt.setFromBufferAttribute(s),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,Jt.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,Jt.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(Jt.min),this.boundingBox.expandByPoint(Jt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&At('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ei);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){At("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(e){const n=this.boundingSphere.center;if(Jt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Ui.setFromBufferAttribute(a),this.morphTargetsRelative?(Lt.addVectors(Jt.min,Ui.min),Jt.expandByPoint(Lt),Lt.addVectors(Jt.max,Ui.max),Jt.expandByPoint(Lt)):(Jt.expandByPoint(Ui.min),Jt.expandByPoint(Ui.max))}Jt.getCenter(n);let i=0;for(let s=0,o=e.count;s<o;s++)Lt.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(Lt));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Lt.fromBufferAttribute(a,c),l&&(di.fromBufferAttribute(e,c),Lt.add(di)),i=Math.max(i,n.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&At('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){At("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new wt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let L=0;L<n.count;L++)a[L]=new I,l[L]=new I;const c=new I,h=new I,u=new I,d=new ot,f=new ot,m=new ot,x=new I,g=new I;function p(L,E,T){c.fromBufferAttribute(n,L),h.fromBufferAttribute(n,E),u.fromBufferAttribute(n,T),d.fromBufferAttribute(s,L),f.fromBufferAttribute(s,E),m.fromBufferAttribute(s,T),h.sub(c),u.sub(c),f.sub(d),m.sub(d);const R=1/(f.x*m.y-m.x*f.y);isFinite(R)&&(x.copy(h).multiplyScalar(m.y).addScaledVector(u,-f.y).multiplyScalar(R),g.copy(u).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(R),a[L].add(x),a[E].add(x),a[T].add(x),l[L].add(g),l[E].add(g),l[T].add(g))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let L=0,E=_.length;L<E;++L){const T=_[L],R=T.start,O=T.count;for(let k=R,z=R+O;k<z;k+=3)p(e.getX(k+0),e.getX(k+1),e.getX(k+2))}const v=new I,M=new I,b=new I,S=new I;function C(L){b.fromBufferAttribute(i,L),S.copy(b);const E=a[L];v.copy(E),v.sub(b.multiplyScalar(b.dot(E))).normalize(),M.crossVectors(S,E);const R=M.dot(l[L])<0?-1:1;o.setXYZW(L,v.x,v.y,v.z,R)}for(let L=0,E=_.length;L<E;++L){const T=_[L],R=T.start,O=T.count;for(let k=R,z=R+O;k<z;k+=3)C(e.getX(k+0)),C(e.getX(k+1)),C(e.getX(k+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new wt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new I,s=new I,o=new I,a=new I,l=new I,c=new I,h=new I,u=new I;if(e)for(let d=0,f=e.count;d<f;d+=3){const m=e.getX(d+0),x=e.getX(d+1),g=e.getX(d+2);i.fromBufferAttribute(t,m),s.fromBufferAttribute(t,x),o.fromBufferAttribute(t,g),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),a.fromBufferAttribute(n,m),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,m=0;for(let x=0,g=l.length;x<g;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let p=0;p<h;p++)d[m++]=c[f++]}return new wt(d,h,u)}if(this.index===null)return je("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new yt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(i[l]=h,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const s=e.morphAttributes;for(const c in s){const h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const ga=new xt,Wn=new Go,ms=new Ei,xa=new I,gs=new I,xs=new I,vs=new I,br=new I,ys=new I,va=new I,_s=new I;class Re extends Ot{constructor(e=new yt,t=new ts){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(s&&a){ys.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=a[l],u=s[l];h!==0&&(br.fromBufferAttribute(u,e),o?ys.addScaledVector(br,h):ys.addScaledVector(br.sub(t),h))}t.add(ys)}return t}raycast(e,t){const n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ms.copy(n.boundingSphere),ms.applyMatrix4(s),Wn.copy(e.ray).recast(e.near),!(ms.containsPoint(Wn.origin)===!1&&(Wn.intersectSphere(ms,xa)===null||Wn.origin.distanceToSquared(xa)>(e.far-e.near)**2))&&(ga.copy(s).invert(),Wn.copy(e.ray).applyMatrix4(ga),!(n.boundingBox!==null&&Wn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Wn)))}_computeIntersections(e,t,n){let i;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,u=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,x=d.length;m<x;m++){const g=d[m],p=o[g.materialIndex],_=Math.max(g.start,f.start),v=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let M=_,b=v;M<b;M+=3){const S=a.getX(M),C=a.getX(M+1),L=a.getX(M+2);i=Ss(this,p,e,n,c,h,u,S,C,L),i&&(i.faceIndex=Math.floor(M/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const m=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){const _=a.getX(g),v=a.getX(g+1),M=a.getX(g+2);i=Ss(this,o,e,n,c,h,u,_,v,M),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,x=d.length;m<x;m++){const g=d[m],p=o[g.materialIndex],_=Math.max(g.start,f.start),v=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let M=_,b=v;M<b;M+=3){const S=M,C=M+1,L=M+2;i=Ss(this,p,e,n,c,h,u,S,C,L),i&&(i.faceIndex=Math.floor(M/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const m=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){const _=g,v=g+1,M=g+2;i=Ss(this,o,e,n,c,h,u,_,v,M),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function th(r,e,t,n,i,s,o,a){let l;if(e.side===Gt?l=n.intersectTriangle(o,s,i,!0,a):l=n.intersectTriangle(i,s,o,e.side===Fn,a),l===null)return null;_s.copy(a),_s.applyMatrix4(r.matrixWorld);const c=t.ray.origin.distanceTo(_s);return c<t.near||c>t.far?null:{distance:c,point:_s.clone(),object:r}}function Ss(r,e,t,n,i,s,o,a,l,c){r.getVertexPosition(a,gs),r.getVertexPosition(l,xs),r.getVertexPosition(c,vs);const h=th(r,e,t,n,gs,xs,vs,va);if(h){const u=new I;cn.getBarycoord(va,gs,xs,vs,u),i&&(h.uv=cn.getInterpolatedAttribute(i,a,l,c,u,new ot)),s&&(h.uv1=cn.getInterpolatedAttribute(s,a,l,c,u,new ot)),o&&(h.normal=cn.getInterpolatedAttribute(o,a,l,c,u,new I),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new I,materialIndex:0};cn.getNormal(gs,xs,vs,d.normal),h.face=d,h.barycoord=u}return h}class sn extends yt{constructor(e=1,t=1,n=1,i=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:o};const a=this;i=Math.floor(i),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;m("z","y","x",-1,-1,n,t,e,o,s,0),m("z","y","x",1,-1,n,t,-e,o,s,1),m("x","z","y",1,1,e,n,t,i,o,2),m("x","z","y",1,-1,e,n,-t,i,o,3),m("x","y","z",1,-1,e,t,n,i,s,4),m("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Oe(c,3)),this.setAttribute("normal",new Oe(h,3)),this.setAttribute("uv",new Oe(u,2));function m(x,g,p,_,v,M,b,S,C,L,E){const T=M/C,R=b/L,O=M/2,k=b/2,z=S/2,B=C+1,G=L+1;let Z=0,V=0;const J=new I;for(let Q=0;Q<G;Q++){const oe=Q*R-k;for(let ge=0;ge<B;ge++){const Ue=ge*T-O;J[x]=Ue*_,J[g]=oe*v,J[p]=z,c.push(J.x,J.y,J.z),J[x]=0,J[g]=0,J[p]=S>0?1:-1,h.push(J.x,J.y,J.z),u.push(ge/C),u.push(1-Q/L),Z+=1}}for(let Q=0;Q<L;Q++)for(let oe=0;oe<C;oe++){const ge=d+oe+B*Q,Ue=d+oe+B*(Q+1),$e=d+(oe+1)+B*(Q+1),Ve=d+(oe+1)+B*Q;l.push(ge,Ue,Ve),l.push(Ue,$e,Ve),V+=6}a.addGroup(f,V,E),f+=V,d+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new sn(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Mi(r){const e={};for(const t in r){e[t]={};for(const n in r[t]){const i=r[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(je("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Ht(r){const e={};for(let t=0;t<r.length;t++){const n=Mi(r[t]);for(const i in n)e[i]=n[i]}return e}function nh(r){const e=[];for(let t=0;t<r.length;t++)e.push(r[t].clone());return e}function Ml(r){const e=r.getRenderTarget();return e===null?r.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ht.workingColorSpace}const ih={clone:Mi,merge:Ht};var sh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,rh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class et extends An{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=sh,this.fragmentShader=rh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Mi(e.uniforms),this.uniformsGroups=nh(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Al extends Ot{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new xt,this.projectionMatrix=new xt,this.projectionMatrixInverse=new xt,this.coordinateSystem=pn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Dn=new I,ya=new ot,_a=new ot;class Zt extends Al{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Eo*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(tr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Eo*2*Math.atan(Math.tan(tr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Dn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Dn.x,Dn.y).multiplyScalar(-e/Dn.z),Dn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Dn.x,Dn.y).multiplyScalar(-e/Dn.z)}getViewSize(e,t){return this.getViewBounds(e,ya,_a),t.subVectors(_a,ya)}setViewOffset(e,t,n,i,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(tr*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*i/l,t-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const fi=-90,pi=1;class oh extends Ot{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Zt(fi,pi,e,t);i.layers=this.layers,this.add(i);const s=new Zt(fi,pi,e,t);s.layers=this.layers,this.add(s);const o=new Zt(fi,pi,e,t);o.layers=this.layers,this.add(o);const a=new Zt(fi,pi,e,t);a.layers=this.layers,this.add(a);const l=new Zt(fi,pi,e,t);l.layers=this.layers,this.add(l);const c=new Zt(fi,pi,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===pn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ws)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,s),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}}class Cl extends Bt{constructor(e=[],t=_i,n,i,s,o,a,l,c,h){super(e,t,n,i,s,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ah extends kn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Cl(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new sn(5,5,5),s=new et({name:"CubemapFromEquirect",uniforms:Mi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Gt,blending:En});s.uniforms.tEquirect.value=t;const o=new Re(i,s),a=t.minFilter;return t.minFilter===Zn&&(t.minFilter=nn),new oh(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(s)}}class kt extends Ot{constructor(){super(),this.isGroup=!0,this.type="Group"}}const lh={type:"move"};class Tr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new kt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new kt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new kt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const x of e.hand.values()){const g=t.getJointPose(x,n),p=this._getHandJoint(c,x);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,m=.005;c.inputState.pinching&&d>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(lh)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new kt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class zo{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Le(e),this.near=t,this.far=n}clone(){return new zo(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class ch extends Ot{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new un,this.environmentIntensity=1,this.environmentRotation=new un,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class hh extends Bt{constructor(e=null,t=1,n=1,i,s,o,a,l,c=ut,h=ut,u,d){super(null,o,a,l,c,h,i,s,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Er=new I,uh=new I,dh=new Ze;class Yn{constructor(e=new I(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Er.subVectors(n,t).cross(uh.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Er),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||dh.getNormalMatrix(e),i=this.coplanarPoint(Er).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Vn=new Ei,fh=new ot(.5,.5),bs=new I;class ns{constructor(e=new Yn,t=new Yn,n=new Yn,i=new Yn,s=new Yn,o=new Yn){this.planes=[e,t,n,i,s,o]}set(e,t,n,i,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=pn,n=!1){const i=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],h=s[4],u=s[5],d=s[6],f=s[7],m=s[8],x=s[9],g=s[10],p=s[11],_=s[12],v=s[13],M=s[14],b=s[15];if(i[0].setComponents(c-o,f-h,p-m,b-_).normalize(),i[1].setComponents(c+o,f+h,p+m,b+_).normalize(),i[2].setComponents(c+a,f+u,p+x,b+v).normalize(),i[3].setComponents(c-a,f-u,p-x,b-v).normalize(),n)i[4].setComponents(l,d,g,M).normalize(),i[5].setComponents(c-l,f-d,p-g,b-M).normalize();else if(i[4].setComponents(c-l,f-d,p-g,b-M).normalize(),t===pn)i[5].setComponents(c+l,f+d,p+g,b+M).normalize();else if(t===Ws)i[5].setComponents(l,d,g,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Vn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Vn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Vn)}intersectsSprite(e){Vn.center.set(0,0,0);const t=fh.distanceTo(e.center);return Vn.radius=.7071067811865476+t,Vn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Vn)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(bs.x=i.normal.x>0?e.max.x:e.min.x,bs.y=i.normal.y>0?e.max.y:e.min.y,bs.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(bs)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class wl extends An{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Le(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const Vs=new I,qs=new I,Sa=new xt,ki=new Go,Ts=new Ei,Mr=new I,ba=new I;class ph extends Ot{constructor(e=new yt,t=new wl){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Vs.fromBufferAttribute(t,i-1),qs.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Vs.distanceTo(qs);e.setAttribute("lineDistance",new Oe(n,1))}else je("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ts.copy(n.boundingSphere),Ts.applyMatrix4(i),Ts.radius+=s,e.ray.intersectsSphere(Ts)===!1)return;Sa.copy(i).invert(),ki.copy(e.ray).applyMatrix4(Sa);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const f=Math.max(0,o.start),m=Math.min(h.count,o.start+o.count);for(let x=f,g=m-1;x<g;x+=c){const p=h.getX(x),_=h.getX(x+1),v=Es(this,e,ki,l,p,_,x);v&&t.push(v)}if(this.isLineLoop){const x=h.getX(m-1),g=h.getX(f),p=Es(this,e,ki,l,x,g,m-1);p&&t.push(p)}}else{const f=Math.max(0,o.start),m=Math.min(d.count,o.start+o.count);for(let x=f,g=m-1;x<g;x+=c){const p=Es(this,e,ki,l,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){const x=Es(this,e,ki,l,m-1,f,m-1);x&&t.push(x)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Es(r,e,t,n,i,s,o){const a=r.geometry.attributes.position;if(Vs.fromBufferAttribute(a,i),qs.fromBufferAttribute(a,s),t.distanceSqToSegment(Vs,qs,Mr,ba)>n)return;Mr.applyMatrix4(r.matrixWorld);const c=e.ray.origin.distanceTo(Mr);if(!(c<e.near||c>e.far))return{distance:c,point:ba.clone().applyMatrix4(r.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:r}}const Ta=new I,Ea=new I;class mh extends ph{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)Ta.fromBufferAttribute(t,i),Ea.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Ta.distanceTo(Ea);e.setAttribute("lineDistance",new Oe(n,1))}else je("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ho extends Bt{constructor(e,t,n=Un,i,s,o,a=ut,l=ut,c,h=bi,u=1){if(h!==bi&&h!==Ki)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:u};super(d,i,s,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new ko(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Rl extends Bt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ai extends yt{constructor(e=1,t=1,n=1,i=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const h=[],u=[],d=[],f=[];let m=0;const x=[],g=n/2;let p=0;_(),o===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Oe(u,3)),this.setAttribute("normal",new Oe(d,3)),this.setAttribute("uv",new Oe(f,2));function _(){const M=new I,b=new I;let S=0;const C=(t-e)/n;for(let L=0;L<=s;L++){const E=[],T=L/s,R=T*(t-e)+e;for(let O=0;O<=i;O++){const k=O/i,z=k*l+a,B=Math.sin(z),G=Math.cos(z);b.x=R*B,b.y=-T*n+g,b.z=R*G,u.push(b.x,b.y,b.z),M.set(B,C,G).normalize(),d.push(M.x,M.y,M.z),f.push(k,1-T),E.push(m++)}x.push(E)}for(let L=0;L<i;L++)for(let E=0;E<s;E++){const T=x[E][L],R=x[E+1][L],O=x[E+1][L+1],k=x[E][L+1];(e>0||E!==0)&&(h.push(T,R,k),S+=3),(t>0||E!==s-1)&&(h.push(R,O,k),S+=3)}c.addGroup(p,S,0),p+=S}function v(M){const b=m,S=new ot,C=new I;let L=0;const E=M===!0?e:t,T=M===!0?1:-1;for(let O=1;O<=i;O++)u.push(0,g*T,0),d.push(0,T,0),f.push(.5,.5),m++;const R=m;for(let O=0;O<=i;O++){const z=O/i*l+a,B=Math.cos(z),G=Math.sin(z);C.x=E*G,C.y=g*T,C.z=E*B,u.push(C.x,C.y,C.z),d.push(0,T,0),S.x=B*.5+.5,S.y=G*.5*T+.5,f.push(S.x,S.y),m++}for(let O=0;O<i;O++){const k=b+O,z=R+O;M===!0?h.push(z,z+1,k):h.push(z+1,z,k),L+=3}c.addGroup(p,L,M===!0?1:2),p+=L}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ai(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Ys extends Ai{constructor(e=1,t=1,n=32,i=1,s=!1,o=0,a=Math.PI*2){super(0,e,t,n,i,s,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:o,thetaLength:a}}static fromJSON(e){return new Ys(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class $s extends yt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const s=e/2,o=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,u=e/a,d=t/l,f=[],m=[],x=[],g=[];for(let p=0;p<h;p++){const _=p*d-o;for(let v=0;v<c;v++){const M=v*u-s;m.push(M,-_,0),x.push(0,0,1),g.push(v/a),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let _=0;_<a;_++){const v=_+c*p,M=_+c*(p+1),b=_+1+c*(p+1),S=_+1+c*p;f.push(v,M,S),f.push(M,b,S)}this.setIndex(f),this.setAttribute("position",new Oe(m,3)),this.setAttribute("normal",new Oe(x,3)),this.setAttribute("uv",new Oe(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new $s(e.width,e.height,e.widthSegments,e.heightSegments)}}class Zi extends yt{constructor(e=1,t=32,n=16,i=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new I,d=new I,f=[],m=[],x=[],g=[];for(let p=0;p<=n;p++){const _=[],v=p/n;let M=0;p===0&&o===0?M=.5/t:p===n&&l===Math.PI&&(M=-.5/t);for(let b=0;b<=t;b++){const S=b/t;u.x=-e*Math.cos(i+S*s)*Math.sin(o+v*a),u.y=e*Math.cos(o+v*a),u.z=e*Math.sin(i+S*s)*Math.sin(o+v*a),m.push(u.x,u.y,u.z),d.copy(u).normalize(),x.push(d.x,d.y,d.z),g.push(S+M,1-v),_.push(c++)}h.push(_)}for(let p=0;p<n;p++)for(let _=0;_<t;_++){const v=h[p][_+1],M=h[p][_],b=h[p+1][_],S=h[p+1][_+1];(p!==0||o>0)&&f.push(v,M,S),(p!==n-1||l<Math.PI)&&f.push(M,b,S)}this.setIndex(f),this.setAttribute("position",new Oe(m,3)),this.setAttribute("normal",new Oe(x,3)),this.setAttribute("uv",new Oe(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Zi(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Ma extends An{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Le(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Le(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=vl,this.normalScale=new ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new un,this.combine=Io,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class gh extends An{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Ac,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class xh extends An{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Ar={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(this.files[r]=e)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class vh{constructor(e,t,n){const i=this;let s=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,s===!1&&i.onStart!==void 0&&i.onStart(h,o,a),s=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],m=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const yh=new vh;class Wo{constructor(e){this.manager=e!==void 0?e:yh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Wo.DEFAULT_MATERIAL_NAME="__DEFAULT";const mi=new WeakMap;class _h extends Wo{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,o=Ar.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(o),s.manager.itemEnd(e)},0);else{let u=mi.get(o);u===void 0&&(u=[],mi.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=ji("img");function l(){h(),t&&t(this);const u=mi.get(this)||[];for(let d=0;d<u.length;d++){const f=u[d];f.onLoad&&f.onLoad(this)}mi.delete(this),s.manager.itemEnd(e)}function c(u){h(),i&&i(u),Ar.remove(`image:${e}`);const d=mi.get(this)||[];for(let f=0;f<d.length;f++){const m=d[f];m.onError&&m.onError(u)}mi.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Ar.add(`image:${e}`,a),s.manager.itemStart(e),a.src=e,a}}class ei extends Wo{constructor(e){super(e)}load(e,t,n,i){const s=new Bt,o=new _h(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}}class Ks extends Ot{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Le(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Sh extends Ks{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ot.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Le(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Cr=new xt,Aa=new I,Ca=new I;class Il{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ot(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new xt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ns,this._frameExtents=new ot(1,1),this._viewportCount=1,this._viewports=[new gt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Aa.setFromMatrixPosition(e.matrixWorld),t.position.copy(Aa),Ca.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ca),t.updateMatrixWorld(),Cr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Cr,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Cr)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const wa=new xt,Gi=new I,wr=new I;class bh extends Il{constructor(){super(new Zt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ot(4,2),this._viewportCount=6,this._viewports=[new gt(2,1,1,1),new gt(0,1,1,1),new gt(3,1,1,1),new gt(1,1,1,1),new gt(3,0,1,1),new gt(1,0,1,1)],this._cubeDirections=[new I(1,0,0),new I(-1,0,0),new I(0,0,1),new I(0,0,-1),new I(0,1,0),new I(0,-1,0)],this._cubeUps=[new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,1,0),new I(0,0,1),new I(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),Gi.setFromMatrixPosition(e.matrixWorld),n.position.copy(Gi),wr.copy(n.position),wr.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(wr),n.updateMatrixWorld(),i.makeTranslation(-Gi.x,-Gi.y,-Gi.z),wa.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(wa,n.coordinateSystem,n.reversedDepth)}}class Th extends Ks{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new bh}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Pl extends Al{constructor(e=-1,t=1,n=1,i=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-e,o=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Eh extends Il{constructor(){super(new Pl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Mh extends Ks{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ot.DEFAULT_UP),this.updateMatrix(),this.target=new Ot,this.shadow=new Eh}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Ah extends Ks{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Ch extends Zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class wh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const Ra=new xt;class Rh{constructor(e,t,n=0,i=1/0){this.ray=new Go(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Bo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):At("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ra.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ra),this}intersectObject(e,t=!0,n=[]){return Mo(e,this,n,t),n.sort(Ia),n}intersectObjects(e,t=!0,n=[]){for(let i=0,s=e.length;i<s;i++)Mo(e[i],this,n,t);return n.sort(Ia),n}}function Ia(r,e){return r.distance-e.distance}function Mo(r,e,t,n){let i=!0;if(r.layers.test(e.layers)&&r.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const s=r.children;for(let o=0,a=s.length;o<a;o++)Mo(s[o],e,t,!0)}}function Pa(r,e,t,n){const i=Ih(n);switch(t){case ml:return r*e;case xl:return r*e/i.components*i.byteLength;case Oo:return r*e/i.components*i.byteLength;case No:return r*e*2/i.components*i.byteLength;case Fo:return r*e*2/i.components*i.byteLength;case gl:return r*e*3/i.components*i.byteLength;case hn:return r*e*4/i.components*i.byteLength;case Uo:return r*e*4/i.components*i.byteLength;case Ds:case Ls:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case Os:case Ns:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case jr:case Zr:return Math.max(r,16)*Math.max(e,8)/4;case Kr:case Jr:return Math.max(r,8)*Math.max(e,8)/2;case Qr:case eo:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case to:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case no:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case io:return Math.floor((r+4)/5)*Math.floor((e+3)/4)*16;case so:return Math.floor((r+4)/5)*Math.floor((e+4)/5)*16;case ro:return Math.floor((r+5)/6)*Math.floor((e+4)/5)*16;case oo:return Math.floor((r+5)/6)*Math.floor((e+5)/6)*16;case ao:return Math.floor((r+7)/8)*Math.floor((e+4)/5)*16;case lo:return Math.floor((r+7)/8)*Math.floor((e+5)/6)*16;case co:return Math.floor((r+7)/8)*Math.floor((e+7)/8)*16;case ho:return Math.floor((r+9)/10)*Math.floor((e+4)/5)*16;case uo:return Math.floor((r+9)/10)*Math.floor((e+5)/6)*16;case fo:return Math.floor((r+9)/10)*Math.floor((e+7)/8)*16;case po:return Math.floor((r+9)/10)*Math.floor((e+9)/10)*16;case mo:return Math.floor((r+11)/12)*Math.floor((e+9)/10)*16;case go:return Math.floor((r+11)/12)*Math.floor((e+11)/12)*16;case xo:case vo:case yo:return Math.ceil(r/4)*Math.ceil(e/4)*16;case _o:case So:return Math.ceil(r/4)*Math.ceil(e/4)*8;case bo:case To:return Math.ceil(r/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ih(r){switch(r){case mn:case ul:return{byteLength:1,components:1};case Yi:case dl:case Ci:return{byteLength:2,components:1};case Do:case Lo:return{byteLength:2,components:4};case Un:case Po:case Tn:return{byteLength:4,components:1};case fl:case pl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ro}}));typeof window<"u"&&(window.__THREE__?je("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ro);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Dl(){let r=null,e=!1,t=null,n=null;function i(s,o){t(s,o),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function Ph(r){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=r.createBuffer();r.bindBuffer(l,d),r.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=r.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=r.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=r.HALF_FLOAT:f=r.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=r.SHORT;else if(c instanceof Uint32Array)f=r.UNSIGNED_INT;else if(c instanceof Int32Array)f=r.INT;else if(c instanceof Int8Array)f=r.BYTE;else if(c instanceof Uint8Array)f=r.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(r.bindBuffer(c,a),u.length===0)r.bufferSubData(c,0,h);else{u.sort((f,m)=>f.start-m.start);let d=0;for(let f=1;f<u.length;f++){const m=u[d],x=u[f];x.start<=m.start+m.count+1?m.count=Math.max(m.count,x.start+x.count-m.start):(++d,u[d]=x)}u.length=d+1;for(let f=0,m=u.length;f<m;f++){const x=u[f];r.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(r.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:s,update:o}}var Dh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Lh=`#ifdef USE_ALPHAHASH
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
#endif`,Oh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Nh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Fh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Uh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,kh=`#ifdef USE_AOMAP
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
#endif`,Gh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Bh=`#ifdef USE_BATCHING
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
#endif`,zh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Hh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Wh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Vh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,qh=`#ifdef USE_IRIDESCENCE
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
#endif`,Xh=`#ifdef USE_BUMPMAP
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
#endif`,Yh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,$h=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Kh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,jh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Jh=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Zh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Qh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,eu=`#if defined( USE_COLOR_ALPHA )
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
#endif`,tu=`#define PI 3.141592653589793
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
} // validated`,nu=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,iu=`vec3 transformedNormal = objectNormal;
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
#endif`,su=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ru=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ou=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,au=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,lu="gl_FragColor = linearToOutputTexel( gl_FragColor );",cu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,hu=`#ifdef USE_ENVMAP
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
#endif`,uu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,du=`#ifdef USE_ENVMAP
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
#endif`,fu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,pu=`#ifdef USE_ENVMAP
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
#endif`,mu=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,gu=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,xu=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,vu=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,yu=`#ifdef USE_GRADIENTMAP
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
}`,_u=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Su=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,bu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Tu=`uniform bool receiveShadow;
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
#endif`,Eu=`#ifdef USE_ENVMAP
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
#endif`,Mu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Au=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Cu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,wu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ru=`PhysicalMaterial material;
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
#endif`,Iu=`uniform sampler2D dfgLUT;
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
}`,Pu=`
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
#endif`,Du=`#if defined( RE_IndirectDiffuse )
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
#endif`,Lu=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ou=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Nu=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Fu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Uu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ku=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Gu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Bu=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,zu=`#if defined( USE_POINTS_UV )
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
#endif`,Hu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Wu=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Vu=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,qu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Xu=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Yu=`#ifdef USE_MORPHTARGETS
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
#endif`,$u=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ku=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,ju=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Ju=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Zu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Qu=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ed=`#ifdef USE_NORMALMAP
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
#endif`,td=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,nd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,id=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,rd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,od=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ad=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ld=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,cd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,ud=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,dd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,pd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,md=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,gd=`float getShadowMask() {
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
}`,xd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,vd=`#ifdef USE_SKINNING
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
#endif`,yd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,_d=`#ifdef USE_SKINNING
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
#endif`,Sd=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bd=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Td=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Ed=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Md=`#ifdef USE_TRANSMISSION
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
#endif`,Ad=`#ifdef USE_TRANSMISSION
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
#endif`,Cd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,wd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rd=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Id=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Pd=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Dd=`uniform sampler2D t2D;
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
}`,Ld=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Od=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Nd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Fd=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ud=`#include <common>
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
}`,kd=`#if DEPTH_PACKING == 3200
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
}`,Gd=`#define DISTANCE
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
}`,Bd=`#define DISTANCE
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
}`,zd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Hd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wd=`uniform float scale;
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
}`,Vd=`uniform vec3 diffuse;
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
}`,qd=`#include <common>
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
}`,Xd=`uniform vec3 diffuse;
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
}`,Yd=`#define LAMBERT
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
}`,$d=`#define LAMBERT
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
}`,Kd=`#define MATCAP
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
}`,jd=`#define MATCAP
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
}`,Jd=`#define NORMAL
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
}`,Zd=`#define NORMAL
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
}`,Qd=`#define PHONG
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
}`,ef=`#define PHONG
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
}`,tf=`#define STANDARD
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
}`,nf=`#define STANDARD
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
}`,sf=`#define TOON
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
}`,rf=`#define TOON
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
}`,of=`uniform float size;
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
}`,af=`uniform vec3 diffuse;
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
}`,lf=`#include <common>
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
}`,cf=`uniform vec3 color;
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
}`,hf=`uniform float rotation;
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
}`,uf=`uniform vec3 diffuse;
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
}`,Qe={alphahash_fragment:Dh,alphahash_pars_fragment:Lh,alphamap_fragment:Oh,alphamap_pars_fragment:Nh,alphatest_fragment:Fh,alphatest_pars_fragment:Uh,aomap_fragment:kh,aomap_pars_fragment:Gh,batching_pars_vertex:Bh,batching_vertex:zh,begin_vertex:Hh,beginnormal_vertex:Wh,bsdfs:Vh,iridescence_fragment:qh,bumpmap_pars_fragment:Xh,clipping_planes_fragment:Yh,clipping_planes_pars_fragment:$h,clipping_planes_pars_vertex:Kh,clipping_planes_vertex:jh,color_fragment:Jh,color_pars_fragment:Zh,color_pars_vertex:Qh,color_vertex:eu,common:tu,cube_uv_reflection_fragment:nu,defaultnormal_vertex:iu,displacementmap_pars_vertex:su,displacementmap_vertex:ru,emissivemap_fragment:ou,emissivemap_pars_fragment:au,colorspace_fragment:lu,colorspace_pars_fragment:cu,envmap_fragment:hu,envmap_common_pars_fragment:uu,envmap_pars_fragment:du,envmap_pars_vertex:fu,envmap_physical_pars_fragment:Eu,envmap_vertex:pu,fog_vertex:mu,fog_pars_vertex:gu,fog_fragment:xu,fog_pars_fragment:vu,gradientmap_pars_fragment:yu,lightmap_pars_fragment:_u,lights_lambert_fragment:Su,lights_lambert_pars_fragment:bu,lights_pars_begin:Tu,lights_toon_fragment:Mu,lights_toon_pars_fragment:Au,lights_phong_fragment:Cu,lights_phong_pars_fragment:wu,lights_physical_fragment:Ru,lights_physical_pars_fragment:Iu,lights_fragment_begin:Pu,lights_fragment_maps:Du,lights_fragment_end:Lu,logdepthbuf_fragment:Ou,logdepthbuf_pars_fragment:Nu,logdepthbuf_pars_vertex:Fu,logdepthbuf_vertex:Uu,map_fragment:ku,map_pars_fragment:Gu,map_particle_fragment:Bu,map_particle_pars_fragment:zu,metalnessmap_fragment:Hu,metalnessmap_pars_fragment:Wu,morphinstance_vertex:Vu,morphcolor_vertex:qu,morphnormal_vertex:Xu,morphtarget_pars_vertex:Yu,morphtarget_vertex:$u,normal_fragment_begin:Ku,normal_fragment_maps:ju,normal_pars_fragment:Ju,normal_pars_vertex:Zu,normal_vertex:Qu,normalmap_pars_fragment:ed,clearcoat_normal_fragment_begin:td,clearcoat_normal_fragment_maps:nd,clearcoat_pars_fragment:id,iridescence_pars_fragment:sd,opaque_fragment:rd,packing:od,premultiplied_alpha_fragment:ad,project_vertex:ld,dithering_fragment:cd,dithering_pars_fragment:hd,roughnessmap_fragment:ud,roughnessmap_pars_fragment:dd,shadowmap_pars_fragment:fd,shadowmap_pars_vertex:pd,shadowmap_vertex:md,shadowmask_pars_fragment:gd,skinbase_vertex:xd,skinning_pars_vertex:vd,skinning_vertex:yd,skinnormal_vertex:_d,specularmap_fragment:Sd,specularmap_pars_fragment:bd,tonemapping_fragment:Td,tonemapping_pars_fragment:Ed,transmission_fragment:Md,transmission_pars_fragment:Ad,uv_pars_fragment:Cd,uv_pars_vertex:wd,uv_vertex:Rd,worldpos_vertex:Id,background_vert:Pd,background_frag:Dd,backgroundCube_vert:Ld,backgroundCube_frag:Od,cube_vert:Nd,cube_frag:Fd,depth_vert:Ud,depth_frag:kd,distanceRGBA_vert:Gd,distanceRGBA_frag:Bd,equirect_vert:zd,equirect_frag:Hd,linedashed_vert:Wd,linedashed_frag:Vd,meshbasic_vert:qd,meshbasic_frag:Xd,meshlambert_vert:Yd,meshlambert_frag:$d,meshmatcap_vert:Kd,meshmatcap_frag:jd,meshnormal_vert:Jd,meshnormal_frag:Zd,meshphong_vert:Qd,meshphong_frag:ef,meshphysical_vert:tf,meshphysical_frag:nf,meshtoon_vert:sf,meshtoon_frag:rf,points_vert:of,points_frag:af,shadow_vert:lf,shadow_frag:cf,sprite_vert:hf,sprite_frag:uf},xe={common:{diffuse:{value:new Le(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ze}},envmap:{envMap:{value:null},envMapRotation:{value:new Ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ze},normalScale:{value:new ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Le(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Le(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0},uvTransform:{value:new Ze}},sprite:{diffuse:{value:new Le(16777215)},opacity:{value:1},center:{value:new ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ze},alphaMap:{value:null},alphaMapTransform:{value:new Ze},alphaTest:{value:0}}},fn={basic:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new Le(0)}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:Ht([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new Le(0)},specular:{value:new Le(1118481)},shininess:{value:30}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:Ht([xe.common,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.roughnessmap,xe.metalnessmap,xe.fog,xe.lights,{emissive:{value:new Le(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:Ht([xe.common,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.gradientmap,xe.fog,xe.lights,{emissive:{value:new Le(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:Ht([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:Ht([xe.points,xe.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:Ht([xe.common,xe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:Ht([xe.common,xe.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:Ht([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:Ht([xe.sprite,xe.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ze}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distanceRGBA:{uniforms:Ht([xe.common,xe.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distanceRGBA_vert,fragmentShader:Qe.distanceRGBA_frag},shadow:{uniforms:Ht([xe.lights,xe.fog,{color:{value:new Le(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};fn.physical={uniforms:Ht([fn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ze},clearcoatNormalScale:{value:new ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ze},sheen:{value:0},sheenColor:{value:new Le(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ze},transmissionSamplerSize:{value:new ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ze},attenuationDistance:{value:0},attenuationColor:{value:new Le(0)},specularColor:{value:new Le(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ze},anisotropyVector:{value:new ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ze}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};const Ms={r:0,b:0,g:0},qn=new un,df=new xt;function ff(r,e,t,n,i,s,o){const a=new Le(0);let l=s===!0?0:1,c,h,u=null,d=0,f=null;function m(v){let M=v.isScene===!0?v.background:null;return M&&M.isTexture&&(M=(v.backgroundBlurriness>0?t:e).get(M)),M}function x(v){let M=!1;const b=m(v);b===null?p(a,l):b&&b.isColor&&(p(b,1),M=!0);const S=r.xr.getEnvironmentBlendMode();S==="additive"?n.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(r.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function g(v,M){const b=m(M);b&&(b.isCubeTexture||b.mapping===Xs)?(h===void 0&&(h=new Re(new sn(1,1,1),new et({name:"BackgroundCubeMaterial",uniforms:Mi(fn.backgroundCube.uniforms),vertexShader:fn.backgroundCube.vertexShader,fragmentShader:fn.backgroundCube.fragmentShader,side:Gt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(S,C,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),qn.copy(M.backgroundRotation),qn.x*=-1,qn.y*=-1,qn.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(qn.y*=-1,qn.z*=-1),h.material.uniforms.envMap.value=b,h.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(df.makeRotationFromEuler(qn)),h.material.toneMapped=ht.getTransfer(b.colorSpace)!==pt,(u!==b||d!==b.version||f!==r.toneMapping)&&(h.material.needsUpdate=!0,u=b,d=b.version,f=r.toneMapping),h.layers.enableAll(),v.unshift(h,h.geometry,h.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new Re(new $s(2,2),new et({name:"BackgroundMaterial",uniforms:Mi(fn.background.uniforms),vertexShader:fn.background.vertexShader,fragmentShader:fn.background.fragmentShader,side:Fn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=ht.getTransfer(b.colorSpace)!==pt,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(u!==b||d!==b.version||f!==r.toneMapping)&&(c.material.needsUpdate=!0,u=b,d=b.version,f=r.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null))}function p(v,M){v.getRGB(Ms,Ml(r)),n.buffers.color.setClear(Ms.r,Ms.g,Ms.b,M,o)}function _(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,M=1){a.set(v),l=M,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(v){l=v,p(a,l)},render:x,addToRenderList:g,dispose:_}}function pf(r,e){const t=r.getParameter(r.MAX_VERTEX_ATTRIBS),n={},i=d(null);let s=i,o=!1;function a(T,R,O,k,z){let B=!1;const G=u(k,O,R);s!==G&&(s=G,c(s.object)),B=f(T,k,O,z),B&&m(T,k,O,z),z!==null&&e.update(z,r.ELEMENT_ARRAY_BUFFER),(B||o)&&(o=!1,M(T,R,O,k),z!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function l(){return r.createVertexArray()}function c(T){return r.bindVertexArray(T)}function h(T){return r.deleteVertexArray(T)}function u(T,R,O){const k=O.wireframe===!0;let z=n[T.id];z===void 0&&(z={},n[T.id]=z);let B=z[R.id];B===void 0&&(B={},z[R.id]=B);let G=B[k];return G===void 0&&(G=d(l()),B[k]=G),G}function d(T){const R=[],O=[],k=[];for(let z=0;z<t;z++)R[z]=0,O[z]=0,k[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:O,attributeDivisors:k,object:T,attributes:{},index:null}}function f(T,R,O,k){const z=s.attributes,B=R.attributes;let G=0;const Z=O.getAttributes();for(const V in Z)if(Z[V].location>=0){const Q=z[V];let oe=B[V];if(oe===void 0&&(V==="instanceMatrix"&&T.instanceMatrix&&(oe=T.instanceMatrix),V==="instanceColor"&&T.instanceColor&&(oe=T.instanceColor)),Q===void 0||Q.attribute!==oe||oe&&Q.data!==oe.data)return!0;G++}return s.attributesNum!==G||s.index!==k}function m(T,R,O,k){const z={},B=R.attributes;let G=0;const Z=O.getAttributes();for(const V in Z)if(Z[V].location>=0){let Q=B[V];Q===void 0&&(V==="instanceMatrix"&&T.instanceMatrix&&(Q=T.instanceMatrix),V==="instanceColor"&&T.instanceColor&&(Q=T.instanceColor));const oe={};oe.attribute=Q,Q&&Q.data&&(oe.data=Q.data),z[V]=oe,G++}s.attributes=z,s.attributesNum=G,s.index=k}function x(){const T=s.newAttributes;for(let R=0,O=T.length;R<O;R++)T[R]=0}function g(T){p(T,0)}function p(T,R){const O=s.newAttributes,k=s.enabledAttributes,z=s.attributeDivisors;O[T]=1,k[T]===0&&(r.enableVertexAttribArray(T),k[T]=1),z[T]!==R&&(r.vertexAttribDivisor(T,R),z[T]=R)}function _(){const T=s.newAttributes,R=s.enabledAttributes;for(let O=0,k=R.length;O<k;O++)R[O]!==T[O]&&(r.disableVertexAttribArray(O),R[O]=0)}function v(T,R,O,k,z,B,G){G===!0?r.vertexAttribIPointer(T,R,O,z,B):r.vertexAttribPointer(T,R,O,k,z,B)}function M(T,R,O,k){x();const z=k.attributes,B=O.getAttributes(),G=R.defaultAttributeValues;for(const Z in B){const V=B[Z];if(V.location>=0){let J=z[Z];if(J===void 0&&(Z==="instanceMatrix"&&T.instanceMatrix&&(J=T.instanceMatrix),Z==="instanceColor"&&T.instanceColor&&(J=T.instanceColor)),J!==void 0){const Q=J.normalized,oe=J.itemSize,ge=e.get(J);if(ge===void 0)continue;const Ue=ge.buffer,$e=ge.type,Ve=ge.bytesPerElement,j=$e===r.INT||$e===r.UNSIGNED_INT||J.gpuType===Po;if(J.isInterleavedBufferAttribute){const te=J.data,pe=te.stride,ce=J.offset;if(te.isInstancedInterleavedBuffer){for(let Se=0;Se<V.locationSize;Se++)p(V.location+Se,te.meshPerAttribute);T.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let Se=0;Se<V.locationSize;Se++)g(V.location+Se);r.bindBuffer(r.ARRAY_BUFFER,Ue);for(let Se=0;Se<V.locationSize;Se++)v(V.location+Se,oe/V.locationSize,$e,Q,pe*Ve,(ce+oe/V.locationSize*Se)*Ve,j)}else{if(J.isInstancedBufferAttribute){for(let te=0;te<V.locationSize;te++)p(V.location+te,J.meshPerAttribute);T.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let te=0;te<V.locationSize;te++)g(V.location+te);r.bindBuffer(r.ARRAY_BUFFER,Ue);for(let te=0;te<V.locationSize;te++)v(V.location+te,oe/V.locationSize,$e,Q,oe*Ve,oe/V.locationSize*te*Ve,j)}}else if(G!==void 0){const Q=G[Z];if(Q!==void 0)switch(Q.length){case 2:r.vertexAttrib2fv(V.location,Q);break;case 3:r.vertexAttrib3fv(V.location,Q);break;case 4:r.vertexAttrib4fv(V.location,Q);break;default:r.vertexAttrib1fv(V.location,Q)}}}}_()}function b(){L();for(const T in n){const R=n[T];for(const O in R){const k=R[O];for(const z in k)h(k[z].object),delete k[z];delete R[O]}delete n[T]}}function S(T){if(n[T.id]===void 0)return;const R=n[T.id];for(const O in R){const k=R[O];for(const z in k)h(k[z].object),delete k[z];delete R[O]}delete n[T.id]}function C(T){for(const R in n){const O=n[R];if(O[T.id]===void 0)continue;const k=O[T.id];for(const z in k)h(k[z].object),delete k[z];delete O[T.id]}}function L(){E(),o=!0,s!==i&&(s=i,c(s.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:L,resetDefaultState:E,dispose:b,releaseStatesOfGeometry:S,releaseStatesOfProgram:C,initAttributes:x,enableAttribute:g,disableUnusedAttributes:_}}function mf(r,e,t){let n;function i(c){n=c}function s(c,h){r.drawArrays(n,c,h),t.update(h,n,1)}function o(c,h,u){u!==0&&(r.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function a(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let f=0;for(let m=0;m<u;m++)f+=h[m];t.update(f,n,1)}function l(c,h,u,d){if(u===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<c.length;m++)o(c[m],h[m],d[m]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let m=0;for(let x=0;x<u;x++)m+=h[x]*d[x];t.update(m,n,1)}}this.setMode=i,this.render=s,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function gf(r,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const C=e.get("EXT_texture_filter_anisotropic");i=r.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(C){return!(C!==hn&&n.convert(C)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){const L=C===Ci&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(C!==mn&&n.convert(C)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==Tn&&!L)}function l(C){if(C==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(je("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),m=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=r.getParameter(r.MAX_TEXTURE_SIZE),g=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),p=r.getParameter(r.MAX_VERTEX_ATTRIBS),_=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),v=r.getParameter(r.MAX_VARYING_VECTORS),M=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),b=m>0,S=r.getParameter(r.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:m,maxTextureSize:x,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:_,maxVaryings:v,maxFragmentUniforms:M,vertexTextures:b,maxSamples:S}}function xf(r){const e=this;let t=null,n=0,i=!1,s=!1;const o=new Yn,a=new Ze,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||i;return i=d,n=u.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){const m=u.clippingPlanes,x=u.clipIntersection,g=u.clipShadows,p=r.get(u);if(!i||m===null||m.length===0||s&&!g)s?h(null):c();else{const _=s?0:n,v=_*4;let M=p.clippingState||null;l.value=M,M=h(m,d,v,f);for(let b=0;b!==v;++b)M[b]=t[b];p.clippingState=M,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,m){const x=u!==null?u.length:0;let g=null;if(x!==0){if(g=l.value,m!==!0||g===null){const p=f+x*4,_=d.matrixWorldInverse;a.getNormalMatrix(_),(g===null||g.length<p)&&(g=new Float32Array(p));for(let v=0,M=f;v!==x;++v,M+=4)o.copy(u[v]).applyMatrix4(_,a),o.normal.toArray(g,M),g[M+3]=o.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,g}}function vf(r){let e=new WeakMap;function t(o,a){return a===Xr?o.mapping=_i:a===Yr&&(o.mapping=Si),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Xr||a===Yr)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new ah(l.height);return c.fromEquirectangularTexture(r,o),e.set(o,c),o.addEventListener("dispose",i),t(c.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const On=4,Da=[.125,.215,.35,.446,.526,.582],Kn=20,yf=256,Bi=new Pl,La=new Le;let Rr=null,Ir=0,Pr=0,Dr=!1;const _f=new I;class Oa{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){const{size:o=256,position:a=_f}=s;Rr=this._renderer.getRenderTarget(),Ir=this._renderer.getActiveCubeFace(),Pr=this._renderer.getActiveMipmapLevel(),Dr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ua(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Fa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Rr,Ir,Pr),this._renderer.xr.enabled=Dr,e.scissorTest=!1,gi(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===_i||e.mapping===Si?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Rr=this._renderer.getRenderTarget(),Ir=this._renderer.getActiveCubeFace(),Pr=this._renderer.getActiveMipmapLevel(),Dr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:nn,minFilter:nn,generateMipmaps:!1,type:Ci,format:hn,colorSpace:Ti,depthBuffer:!1},i=Na(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Na(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Sf(s)),this._blurMaterial=Tf(s,e,t),this._ggxMaterial=bf(s,e,t)}return i}_compileMaterial(e){const t=new Re(new yt,e);this._renderer.compile(t,Bi)}_sceneToCubeUV(e,t,n,i,s){const l=new Zt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(La),u.toneMapping=Nn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Re(new sn,new ts({name:"PMREM.Background",side:Gt,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,g=x.material;let p=!1;const _=e.background;_?_.isColor&&(g.color.copy(_),e.background=null,p=!0):(g.color.copy(La),p=!0);for(let v=0;v<6;v++){const M=v%3;M===0?(l.up.set(0,c[v],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+h[v],s.y,s.z)):M===1?(l.up.set(0,0,c[v]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+h[v],s.z)):(l.up.set(0,c[v],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+h[v]));const b=this._cubeSize;gi(i,M*b,v>2?b:0,b,b),u.setRenderTarget(i),p&&u.render(x,l),u.render(e,l)}u.toneMapping=f,u.autoClear=d,e.background=_}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===_i||e.mapping===Si;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ua()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Fa());const s=i?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=s;const a=s.uniforms;a.envMap.value=e;const l=this._cubeSize;gi(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Bi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,s=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=.05+c*.95,f=u*d,{_lodMax:m}=this,x=this._sizeLods[n],g=3*x*(n>m-On?n-m+On:0),p=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,gi(s,g,p,3*x,2*x),i.setRenderTarget(s),i.render(a,Bi),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=m-n,gi(e,g,p,3*x,2*x),i.setRenderTarget(e),i.render(a,Bi)}_blur(e,t,n,i,s){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",s),this._halfBlur(o,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&At("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[i];u.material=c;const d=c.uniforms,f=this._sizeLods[n]-1,m=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*Kn-1),x=s/m,g=isFinite(s)?1+Math.floor(h*x):Kn;g>Kn&&je(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Kn}`);const p=[];let _=0;for(let C=0;C<Kn;++C){const L=C/x,E=Math.exp(-L*L/2);p.push(E),C===0?_+=E:C<g&&(_+=2*E)}for(let C=0;C<p.length;C++)p[C]=p[C]/_;d.envMap.value=e.texture,d.samples.value=g,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:v}=this;d.dTheta.value=m,d.mipInt.value=v-n;const M=this._sizeLods[i],b=3*M*(i>v-On?i-v+On:0),S=4*(this._cubeSize-M);gi(t,b,S,3*M,2*M),l.setRenderTarget(t),l.render(u,Bi)}}function Sf(r){const e=[],t=[],n=[];let i=r;const s=r-On+1+Da.length;for(let o=0;o<s;o++){const a=Math.pow(2,i);e.push(a);let l=1/a;o>r-On?l=Da[o-r+On-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,m=6,x=3,g=2,p=1,_=new Float32Array(x*m*f),v=new Float32Array(g*m*f),M=new Float32Array(p*m*f);for(let S=0;S<f;S++){const C=S%3*2/3-1,L=S>2?0:-1,E=[C,L,0,C+2/3,L,0,C+2/3,L+1,0,C,L,0,C+2/3,L+1,0,C,L+1,0];_.set(E,x*m*S),v.set(d,g*m*S);const T=[S,S,S,S,S,S];M.set(T,p*m*S)}const b=new yt;b.setAttribute("position",new wt(_,x)),b.setAttribute("uv",new wt(v,g)),b.setAttribute("faceIndex",new wt(M,p)),n.push(new Re(b,null)),i>On&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Na(r,e,t){const n=new kn(r,e,t);return n.texture.mapping=Xs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function gi(r,e,t,n,i){r.viewport.set(e,t,n,i),r.scissor.set(e,t,n,i)}function bf(r,e,t){return new et({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:yf,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:js(),fragmentShader:`

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
		`,blending:En,depthTest:!1,depthWrite:!1})}function Tf(r,e,t){const n=new Float32Array(Kn),i=new I(0,1,0);return new et({name:"SphericalGaussianBlur",defines:{n:Kn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:js(),fragmentShader:`

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
		`,blending:En,depthTest:!1,depthWrite:!1})}function Fa(){return new et({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:js(),fragmentShader:`

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
		`,blending:En,depthTest:!1,depthWrite:!1})}function Ua(){return new et({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:js(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function js(){return`

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
	`}function Ef(r){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Xr||l===Yr,h=l===_i||l===Si;if(c||h){let u=e.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new Oa(r)),u=c?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const f=a.image;return c&&f&&f.height>0||h&&f&&i(f)?(t===null&&(t=new Oa(r)),u=c?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",s),u.texture):null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Mf(r){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=r.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Ji("WebGLRenderer: "+n+" extension not supported."),i}}}function Af(r,e,t,n){const i={},s=new WeakMap;function o(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const m in d.attributes)e.remove(d.attributes[m]);d.removeEventListener("dispose",o),delete i[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(u,d){return i[d.id]===!0||(d.addEventListener("dispose",o),i[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const f in d)e.update(d[f],r.ARRAY_BUFFER)}function c(u){const d=[],f=u.index,m=u.attributes.position;let x=0;if(f!==null){const _=f.array;x=f.version;for(let v=0,M=_.length;v<M;v+=3){const b=_[v+0],S=_[v+1],C=_[v+2];d.push(b,S,S,C,C,b)}}else if(m!==void 0){const _=m.array;x=m.version;for(let v=0,M=_.length/3-1;v<M;v+=3){const b=v+0,S=v+1,C=v+2;d.push(b,S,S,C,C,b)}}else return;const g=new(_l(d)?El:Tl)(d,1);g.version=x;const p=s.get(u);p&&e.remove(p),s.set(u,g)}function h(u){const d=s.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Cf(r,e,t){let n;function i(d){n=d}let s,o;function a(d){s=d.type,o=d.bytesPerElement}function l(d,f){r.drawElements(n,f,s,d*o),t.update(f,n,1)}function c(d,f,m){m!==0&&(r.drawElementsInstanced(n,f,s,d*o,m),t.update(f,n,m))}function h(d,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,d,0,m);let g=0;for(let p=0;p<m;p++)g+=f[p];t.update(g,n,1)}function u(d,f,m,x){if(m===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<d.length;p++)c(d[p]/o,f[p],x[p]);else{g.multiDrawElementsInstancedWEBGL(n,f,0,s,d,0,x,0,m);let p=0;for(let _=0;_<m;_++)p+=f[_]*x[_];t.update(p,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function wf(r){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(t.calls++,o){case r.TRIANGLES:t.triangles+=a*(s/3);break;case r.LINES:t.lines+=a*(s/2);break;case r.LINE_STRIP:t.lines+=a*(s-1);break;case r.LINE_LOOP:t.lines+=a*s;break;case r.POINTS:t.points+=a*s;break;default:At("WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Rf(r,e,t){const n=new WeakMap,i=new gt;function s(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let E=function(){C.dispose(),n.delete(a),a.removeEventListener("dispose",E)};d!==void 0&&d.texture.dispose();const f=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let v=0;f===!0&&(v=1),m===!0&&(v=2),x===!0&&(v=3);let M=a.attributes.position.count*v,b=1;M>e.maxTextureSize&&(b=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);const S=new Float32Array(M*b*4*u),C=new Sl(S,M,b,u);C.type=Tn,C.needsUpdate=!0;const L=v*4;for(let T=0;T<u;T++){const R=g[T],O=p[T],k=_[T],z=M*b*4*T;for(let B=0;B<R.count;B++){const G=B*L;f===!0&&(i.fromBufferAttribute(R,B),S[z+G+0]=i.x,S[z+G+1]=i.y,S[z+G+2]=i.z,S[z+G+3]=0),m===!0&&(i.fromBufferAttribute(O,B),S[z+G+4]=i.x,S[z+G+5]=i.y,S[z+G+6]=i.z,S[z+G+7]=0),x===!0&&(i.fromBufferAttribute(k,B),S[z+G+8]=i.x,S[z+G+9]=i.y,S[z+G+10]=i.z,S[z+G+11]=k.itemSize===4?i.w:1)}}d={count:u,texture:C,size:new ot(M,b)},n.set(a,d),a.addEventListener("dispose",E)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(r,"morphTexture",o.morphTexture,t);else{let f=0;for(let x=0;x<c.length;x++)f+=c[x];const m=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(r,"morphTargetBaseInfluence",m),l.getUniforms().setValue(r,"morphTargetInfluences",c)}l.getUniforms().setValue(r,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(r,"morphTargetsTextureSize",d.size)}return{update:s}}function If(r,e,t,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);if(i.get(u)!==c&&(e.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(t.update(l.instanceMatrix,r.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,r.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;i.get(d)!==c&&(d.update(),i.set(d,c))}return u}function o(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:o}}const Ll=new Bt,ka=new Ho(1,1),Ol=new Sl,Nl=new Vc,Fl=new Cl,Ga=[],Ba=[],za=new Float32Array(16),Ha=new Float32Array(9),Wa=new Float32Array(4);function Ri(r,e,t){const n=r[0];if(n<=0||n>0)return r;const i=e*t;let s=Ga[i];if(s===void 0&&(s=new Float32Array(i),Ga[i]=s),e!==0){n.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,r[o].toArray(s,a)}return s}function Pt(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function Dt(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function Js(r,e){let t=Ba[e];t===void 0&&(t=new Int32Array(e),Ba[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function Pf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function Df(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;r.uniform2fv(this.addr,e),Dt(t,e)}}function Lf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;r.uniform3fv(this.addr,e),Dt(t,e)}}function Of(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;r.uniform4fv(this.addr,e),Dt(t,e)}}function Nf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),Dt(t,e)}else{if(Pt(t,n))return;Wa.set(n),r.uniformMatrix2fv(this.addr,!1,Wa),Dt(t,n)}}function Ff(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),Dt(t,e)}else{if(Pt(t,n))return;Ha.set(n),r.uniformMatrix3fv(this.addr,!1,Ha),Dt(t,n)}}function Uf(r,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),Dt(t,e)}else{if(Pt(t,n))return;za.set(n),r.uniformMatrix4fv(this.addr,!1,za),Dt(t,n)}}function kf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function Gf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;r.uniform2iv(this.addr,e),Dt(t,e)}}function Bf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;r.uniform3iv(this.addr,e),Dt(t,e)}}function zf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;r.uniform4iv(this.addr,e),Dt(t,e)}}function Hf(r,e){const t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function Wf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;r.uniform2uiv(this.addr,e),Dt(t,e)}}function Vf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;r.uniform3uiv(this.addr,e),Dt(t,e)}}function qf(r,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;r.uniform4uiv(this.addr,e),Dt(t,e)}}function Xf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);let s;this.type===r.SAMPLER_2D_SHADOW?(ka.compareFunction=yl,s=ka):s=Ll,t.setTexture2D(e||s,i)}function Yf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Nl,i)}function $f(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Fl,i)}function Kf(r,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Ol,i)}function jf(r){switch(r){case 5126:return Pf;case 35664:return Df;case 35665:return Lf;case 35666:return Of;case 35674:return Nf;case 35675:return Ff;case 35676:return Uf;case 5124:case 35670:return kf;case 35667:case 35671:return Gf;case 35668:case 35672:return Bf;case 35669:case 35673:return zf;case 5125:return Hf;case 36294:return Wf;case 36295:return Vf;case 36296:return qf;case 35678:case 36198:case 36298:case 36306:case 35682:return Xf;case 35679:case 36299:case 36307:return Yf;case 35680:case 36300:case 36308:case 36293:return $f;case 36289:case 36303:case 36311:case 36292:return Kf}}function Jf(r,e){r.uniform1fv(this.addr,e)}function Zf(r,e){const t=Ri(e,this.size,2);r.uniform2fv(this.addr,t)}function Qf(r,e){const t=Ri(e,this.size,3);r.uniform3fv(this.addr,t)}function ep(r,e){const t=Ri(e,this.size,4);r.uniform4fv(this.addr,t)}function tp(r,e){const t=Ri(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function np(r,e){const t=Ri(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function ip(r,e){const t=Ri(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function sp(r,e){r.uniform1iv(this.addr,e)}function rp(r,e){r.uniform2iv(this.addr,e)}function op(r,e){r.uniform3iv(this.addr,e)}function ap(r,e){r.uniform4iv(this.addr,e)}function lp(r,e){r.uniform1uiv(this.addr,e)}function cp(r,e){r.uniform2uiv(this.addr,e)}function hp(r,e){r.uniform3uiv(this.addr,e)}function up(r,e){r.uniform4uiv(this.addr,e)}function dp(r,e,t){const n=this.cache,i=e.length,s=Js(t,i);Pt(n,s)||(r.uniform1iv(this.addr,s),Dt(n,s));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||Ll,s[o])}function fp(r,e,t){const n=this.cache,i=e.length,s=Js(t,i);Pt(n,s)||(r.uniform1iv(this.addr,s),Dt(n,s));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Nl,s[o])}function pp(r,e,t){const n=this.cache,i=e.length,s=Js(t,i);Pt(n,s)||(r.uniform1iv(this.addr,s),Dt(n,s));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||Fl,s[o])}function mp(r,e,t){const n=this.cache,i=e.length,s=Js(t,i);Pt(n,s)||(r.uniform1iv(this.addr,s),Dt(n,s));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||Ol,s[o])}function gp(r){switch(r){case 5126:return Jf;case 35664:return Zf;case 35665:return Qf;case 35666:return ep;case 35674:return tp;case 35675:return np;case 35676:return ip;case 5124:case 35670:return sp;case 35667:case 35671:return rp;case 35668:case 35672:return op;case 35669:case 35673:return ap;case 5125:return lp;case 36294:return cp;case 36295:return hp;case 36296:return up;case 35678:case 36198:case 36298:case 36306:case 35682:return dp;case 35679:case 36299:case 36307:return fp;case 35680:case 36300:case 36308:case 36293:return pp;case 36289:case 36303:case 36311:case 36292:return mp}}class xp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=jf(t.type)}}class vp{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=gp(t.type)}}class yp{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let s=0,o=i.length;s!==o;++s){const a=i[s];a.setValue(e,t[a.id],n)}}}const Lr=/(\w+)(\])?(\[|\.)?/g;function Va(r,e){r.seq.push(e),r.map[e.id]=e}function _p(r,e,t){const n=r.name,i=n.length;for(Lr.lastIndex=0;;){const s=Lr.exec(n),o=Lr.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){Va(t,c===void 0?new xp(a,r,e):new vp(a,r,e));break}else{let u=t.map[a];u===void 0&&(u=new yp(a),Va(t,u)),t=u}}}class Fs{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const s=e.getActiveUniform(t,i),o=e.getUniformLocation(t,s.name);_p(s,o,this)}}setValue(e,t,n,i){const s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,s=e.length;i!==s;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function qa(r,e,t){const n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}const Sp=37297;let bp=0;function Tp(r,e){const t=r.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=i;o<s;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Xa=new Ze;function Ep(r){ht._getMatrix(Xa,ht.workingColorSpace,r);const e=`mat3( ${Xa.elements.map(t=>t.toFixed(4))} )`;switch(ht.getTransfer(r)){case Hs:return[e,"LinearTransferOETF"];case pt:return[e,"sRGBTransferOETF"];default:return je("WebGLProgram: Unsupported color space: ",r),[e,"LinearTransferOETF"]}}function Ya(r,e,t){const n=r.getShaderParameter(e,r.COMPILE_STATUS),s=(r.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+Tp(r.getShaderSource(e),a)}else return s}function Mp(r,e){const t=Ep(e);return[`vec4 ${r}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Ap(r,e){let t;switch(e){case vc:t="Linear";break;case yc:t="Reinhard";break;case _c:t="Cineon";break;case Sc:t="ACESFilmic";break;case Tc:t="AgX";break;case Ec:t="Neutral";break;case bc:t="Custom";break;default:je("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const As=new I;function Cp(){ht.getLuminanceCoefficients(As);const r=As.x.toFixed(4),e=As.y.toFixed(4),t=As.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function wp(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qi).join(`
`)}function Rp(r){const e=[];for(const t in r){const n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Ip(r,e){const t={},n=r.getProgramParameter(e,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const s=r.getActiveAttrib(e,i),o=s.name;let a=1;s.type===r.FLOAT_MAT2&&(a=2),s.type===r.FLOAT_MAT3&&(a=3),s.type===r.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:r.getAttribLocation(e,o),locationSize:a}}return t}function qi(r){return r!==""}function $a(r,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ka(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Pp=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ao(r){return r.replace(Pp,Lp)}const Dp=new Map;function Lp(r,e){let t=Qe[e];if(t===void 0){const n=Dp.get(e);if(n!==void 0)t=Qe[n],je('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ao(t)}const Op=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ja(r){return r.replace(Op,Np)}function Np(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Ja(r){let e=`precision ${r.precision} float;
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
#define LOW_PRECISION`),e}function Fp(r){let e="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===ll?e="SHADOWMAP_TYPE_PCF":r.shadowMapType===cl?e="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===bn&&(e="SHADOWMAP_TYPE_VSM"),e}function Up(r){let e="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case _i:case Si:e="ENVMAP_TYPE_CUBE";break;case Xs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function kp(r){let e="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case Si:e="ENVMAP_MODE_REFRACTION";break}return e}function Gp(r){let e="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case Io:e="ENVMAP_BLENDING_MULTIPLY";break;case gc:e="ENVMAP_BLENDING_MIX";break;case xc:e="ENVMAP_BLENDING_ADD";break}return e}function Bp(r){const e=r.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function zp(r,e,t,n){const i=r.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=Fp(t),c=Up(t),h=kp(t),u=Gp(t),d=Bp(t),f=wp(t),m=Rp(s),x=i.createProgram();let g,p,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(qi).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(qi).join(`
`),p.length>0&&(p+=`
`)):(g=[Ja(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qi).join(`
`),p=[Ja(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Nn?"#define TONE_MAPPING":"",t.toneMapping!==Nn?Qe.tonemapping_pars_fragment:"",t.toneMapping!==Nn?Ap("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,Mp("linearToOutputTexel",t.outputColorSpace),Cp(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(qi).join(`
`)),o=Ao(o),o=$a(o,t),o=Ka(o,t),a=Ao(a),a=$a(a,t),a=Ka(a,t),o=ja(o),a=ja(a),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===na?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===na?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const v=_+g+o,M=_+p+a,b=qa(i,i.VERTEX_SHADER,v),S=qa(i,i.FRAGMENT_SHADER,M);i.attachShader(x,b),i.attachShader(x,S),t.index0AttributeName!==void 0?i.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function C(R){if(r.debug.checkShaderErrors){const O=i.getProgramInfoLog(x)||"",k=i.getShaderInfoLog(b)||"",z=i.getShaderInfoLog(S)||"",B=O.trim(),G=k.trim(),Z=z.trim();let V=!0,J=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(V=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,x,b,S);else{const Q=Ya(i,b,"vertex"),oe=Ya(i,S,"fragment");At("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+B+`
`+Q+`
`+oe)}else B!==""?je("WebGLProgram: Program Info Log:",B):(G===""||Z==="")&&(J=!1);J&&(R.diagnostics={runnable:V,programLog:B,vertexShader:{log:G,prefix:g},fragmentShader:{log:Z,prefix:p}})}i.deleteShader(b),i.deleteShader(S),L=new Fs(i,x),E=Ip(i,x)}let L;this.getUniforms=function(){return L===void 0&&C(this),L};let E;this.getAttributes=function(){return E===void 0&&C(this),E};let T=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(x,Sp)),T},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=bp++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=b,this.fragmentShader=S,this}let Hp=0;class Wp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Vp(e),t.set(e,n)),n}}class Vp{constructor(e){this.id=Hp++,this.code=e,this.usedTimes=0}}function qp(r,e,t,n,i,s,o){const a=new Bo,l=new Wp,c=new Set,h=[],u=i.logarithmicDepthBuffer,d=i.vertexTextures;let f=i.precision;const m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(E){return c.add(E),E===0?"uv":`uv${E}`}function g(E,T,R,O,k){const z=O.fog,B=k.geometry,G=E.isMeshStandardMaterial?O.environment:null,Z=(E.isMeshStandardMaterial?t:e).get(E.envMap||G),V=Z&&Z.mapping===Xs?Z.image.height:null,J=m[E.type];E.precision!==null&&(f=i.getMaxPrecision(E.precision),f!==E.precision&&je("WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));const Q=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,oe=Q!==void 0?Q.length:0;let ge=0;B.morphAttributes.position!==void 0&&(ge=1),B.morphAttributes.normal!==void 0&&(ge=2),B.morphAttributes.color!==void 0&&(ge=3);let Ue,$e,Ve,j;if(J){const dt=fn[J];Ue=dt.vertexShader,$e=dt.fragmentShader}else Ue=E.vertexShader,$e=E.fragmentShader,l.update(E),Ve=l.getVertexShaderID(E),j=l.getFragmentShaderID(E);const te=r.getRenderTarget(),pe=r.state.buffers.depth.getReversed(),ce=k.isInstancedMesh===!0,Se=k.isBatchedMesh===!0,Ne=!!E.map,at=!!E.matcap,Be=!!Z,tt=!!E.aoMap,N=!!E.lightMap,Ae=!!E.bumpMap,Pe=!!E.normalMap,Ge=!!E.displacementMap,ue=!!E.emissiveMap,Ee=!!E.metalnessMap,ne=!!E.roughnessMap,ve=E.anisotropy>0,D=E.clearcoat>0,A=E.dispersion>0,H=E.iridescence>0,ee=E.sheen>0,se=E.transmission>0,K=ve&&!!E.anisotropyMap,De=D&&!!E.clearcoatMap,me=D&&!!E.clearcoatNormalMap,Fe=D&&!!E.clearcoatRoughnessMap,Ie=H&&!!E.iridescenceMap,re=H&&!!E.iridescenceThicknessMap,le=ee&&!!E.sheenColorMap,qe=ee&&!!E.sheenRoughnessMap,He=!!E.specularMap,Te=!!E.specularColorMap,Ye=!!E.specularIntensityMap,U=se&&!!E.transmissionMap,ye=se&&!!E.thicknessMap,de=!!E.gradientMap,fe=!!E.alphaMap,ae=E.alphaTest>0,ie=!!E.alphaHash,Ce=!!E.extensions;let Ke=Nn;E.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(Ke=r.toneMapping);const _t={shaderID:J,shaderType:E.type,shaderName:E.name,vertexShader:Ue,fragmentShader:$e,defines:E.defines,customVertexShaderID:Ve,customFragmentShaderID:j,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:Se,batchingColor:Se&&k._colorsTexture!==null,instancing:ce,instancingColor:ce&&k.instanceColor!==null,instancingMorph:ce&&k.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:te===null?r.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:Ti,alphaToCoverage:!!E.alphaToCoverage,map:Ne,matcap:at,envMap:Be,envMapMode:Be&&Z.mapping,envMapCubeUVHeight:V,aoMap:tt,lightMap:N,bumpMap:Ae,normalMap:Pe,displacementMap:d&&Ge,emissiveMap:ue,normalMapObjectSpace:Pe&&E.normalMapType===wc,normalMapTangentSpace:Pe&&E.normalMapType===vl,metalnessMap:Ee,roughnessMap:ne,anisotropy:ve,anisotropyMap:K,clearcoat:D,clearcoatMap:De,clearcoatNormalMap:me,clearcoatRoughnessMap:Fe,dispersion:A,iridescence:H,iridescenceMap:Ie,iridescenceThicknessMap:re,sheen:ee,sheenColorMap:le,sheenRoughnessMap:qe,specularMap:He,specularColorMap:Te,specularIntensityMap:Ye,transmission:se,transmissionMap:U,thicknessMap:ye,gradientMap:de,opaque:E.transparent===!1&&E.blending===xi&&E.alphaToCoverage===!1,alphaMap:fe,alphaTest:ae,alphaHash:ie,combine:E.combine,mapUv:Ne&&x(E.map.channel),aoMapUv:tt&&x(E.aoMap.channel),lightMapUv:N&&x(E.lightMap.channel),bumpMapUv:Ae&&x(E.bumpMap.channel),normalMapUv:Pe&&x(E.normalMap.channel),displacementMapUv:Ge&&x(E.displacementMap.channel),emissiveMapUv:ue&&x(E.emissiveMap.channel),metalnessMapUv:Ee&&x(E.metalnessMap.channel),roughnessMapUv:ne&&x(E.roughnessMap.channel),anisotropyMapUv:K&&x(E.anisotropyMap.channel),clearcoatMapUv:De&&x(E.clearcoatMap.channel),clearcoatNormalMapUv:me&&x(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Fe&&x(E.clearcoatRoughnessMap.channel),iridescenceMapUv:Ie&&x(E.iridescenceMap.channel),iridescenceThicknessMapUv:re&&x(E.iridescenceThicknessMap.channel),sheenColorMapUv:le&&x(E.sheenColorMap.channel),sheenRoughnessMapUv:qe&&x(E.sheenRoughnessMap.channel),specularMapUv:He&&x(E.specularMap.channel),specularColorMapUv:Te&&x(E.specularColorMap.channel),specularIntensityMapUv:Ye&&x(E.specularIntensityMap.channel),transmissionMapUv:U&&x(E.transmissionMap.channel),thicknessMapUv:ye&&x(E.thicknessMap.channel),alphaMapUv:fe&&x(E.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(Pe||ve),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!B.attributes.uv&&(Ne||fe),fog:!!z,useFog:E.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:E.flatShading===!0&&E.wireframe===!1,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:pe,skinning:k.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:oe,morphTextureStride:ge,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:E.dithering,shadowMapEnabled:r.shadowMap.enabled&&R.length>0,shadowMapType:r.shadowMap.type,toneMapping:Ke,decodeVideoTexture:Ne&&E.map.isVideoTexture===!0&&ht.getTransfer(E.map.colorSpace)===pt,decodeVideoTextureEmissive:ue&&E.emissiveMap.isVideoTexture===!0&&ht.getTransfer(E.emissiveMap.colorSpace)===pt,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===Xt,flipSided:E.side===Gt,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:Ce&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ce&&E.extensions.multiDraw===!0||Se)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return _t.vertexUv1s=c.has(1),_t.vertexUv2s=c.has(2),_t.vertexUv3s=c.has(3),c.clear(),_t}function p(E){const T=[];if(E.shaderID?T.push(E.shaderID):(T.push(E.customVertexShaderID),T.push(E.customFragmentShaderID)),E.defines!==void 0)for(const R in E.defines)T.push(R),T.push(E.defines[R]);return E.isRawShaderMaterial===!1&&(_(T,E),v(T,E),T.push(r.outputColorSpace)),T.push(E.customProgramCacheKey),T.join()}function _(E,T){E.push(T.precision),E.push(T.outputColorSpace),E.push(T.envMapMode),E.push(T.envMapCubeUVHeight),E.push(T.mapUv),E.push(T.alphaMapUv),E.push(T.lightMapUv),E.push(T.aoMapUv),E.push(T.bumpMapUv),E.push(T.normalMapUv),E.push(T.displacementMapUv),E.push(T.emissiveMapUv),E.push(T.metalnessMapUv),E.push(T.roughnessMapUv),E.push(T.anisotropyMapUv),E.push(T.clearcoatMapUv),E.push(T.clearcoatNormalMapUv),E.push(T.clearcoatRoughnessMapUv),E.push(T.iridescenceMapUv),E.push(T.iridescenceThicknessMapUv),E.push(T.sheenColorMapUv),E.push(T.sheenRoughnessMapUv),E.push(T.specularMapUv),E.push(T.specularColorMapUv),E.push(T.specularIntensityMapUv),E.push(T.transmissionMapUv),E.push(T.thicknessMapUv),E.push(T.combine),E.push(T.fogExp2),E.push(T.sizeAttenuation),E.push(T.morphTargetsCount),E.push(T.morphAttributeCount),E.push(T.numDirLights),E.push(T.numPointLights),E.push(T.numSpotLights),E.push(T.numSpotLightMaps),E.push(T.numHemiLights),E.push(T.numRectAreaLights),E.push(T.numDirLightShadows),E.push(T.numPointLightShadows),E.push(T.numSpotLightShadows),E.push(T.numSpotLightShadowsWithMaps),E.push(T.numLightProbes),E.push(T.shadowMapType),E.push(T.toneMapping),E.push(T.numClippingPlanes),E.push(T.numClipIntersection),E.push(T.depthPacking)}function v(E,T){a.disableAll(),T.supportsVertexTextures&&a.enable(0),T.instancing&&a.enable(1),T.instancingColor&&a.enable(2),T.instancingMorph&&a.enable(3),T.matcap&&a.enable(4),T.envMap&&a.enable(5),T.normalMapObjectSpace&&a.enable(6),T.normalMapTangentSpace&&a.enable(7),T.clearcoat&&a.enable(8),T.iridescence&&a.enable(9),T.alphaTest&&a.enable(10),T.vertexColors&&a.enable(11),T.vertexAlphas&&a.enable(12),T.vertexUv1s&&a.enable(13),T.vertexUv2s&&a.enable(14),T.vertexUv3s&&a.enable(15),T.vertexTangents&&a.enable(16),T.anisotropy&&a.enable(17),T.alphaHash&&a.enable(18),T.batching&&a.enable(19),T.dispersion&&a.enable(20),T.batchingColor&&a.enable(21),T.gradientMap&&a.enable(22),E.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),E.push(a.mask)}function M(E){const T=m[E.type];let R;if(T){const O=fn[T];R=ih.clone(O.uniforms)}else R=E.uniforms;return R}function b(E,T){let R;for(let O=0,k=h.length;O<k;O++){const z=h[O];if(z.cacheKey===T){R=z,++R.usedTimes;break}}return R===void 0&&(R=new zp(r,T,E,s),h.push(R)),R}function S(E){if(--E.usedTimes===0){const T=h.indexOf(E);h[T]=h[h.length-1],h.pop(),E.destroy()}}function C(E){l.remove(E)}function L(){l.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:M,acquireProgram:b,releaseProgram:S,releaseShaderCache:C,programs:h,dispose:L}}function Xp(){let r=new WeakMap;function e(o){return r.has(o)}function t(o){let a=r.get(o);return a===void 0&&(a={},r.set(o,a)),a}function n(o){r.delete(o)}function i(o,a,l){r.get(o)[a]=l}function s(){r=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function Yp(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.material.id!==e.material.id?r.material.id-e.material.id:r.z!==e.z?r.z-e.z:r.id-e.id}function Za(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function Qa(){const r=[];let e=0;const t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function o(u,d,f,m,x,g){let p=r[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:m,renderOrder:u.renderOrder,z:x,group:g},r[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=m,p.renderOrder=u.renderOrder,p.z=x,p.group=g),e++,p}function a(u,d,f,m,x,g){const p=o(u,d,f,m,x,g);f.transmission>0?n.push(p):f.transparent===!0?i.push(p):t.push(p)}function l(u,d,f,m,x,g){const p=o(u,d,f,m,x,g);f.transmission>0?n.unshift(p):f.transparent===!0?i.unshift(p):t.unshift(p)}function c(u,d){t.length>1&&t.sort(u||Yp),n.length>1&&n.sort(d||Za),i.length>1&&i.sort(d||Za)}function h(){for(let u=e,d=r.length;u<d;u++){const f=r[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:a,unshift:l,finish:h,sort:c}}function $p(){let r=new WeakMap;function e(n,i){const s=r.get(n);let o;return s===void 0?(o=new Qa,r.set(n,[o])):i>=s.length?(o=new Qa,s.push(o)):o=s[i],o}function t(){r=new WeakMap}return{get:e,dispose:t}}function Kp(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new I,color:new Le};break;case"SpotLight":t={position:new I,direction:new I,color:new Le,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new I,color:new Le,distance:0,decay:0};break;case"HemisphereLight":t={direction:new I,skyColor:new Le,groundColor:new Le};break;case"RectAreaLight":t={color:new Le,position:new I,halfWidth:new I,halfHeight:new I};break}return r[e.id]=t,t}}}function jp(){const r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}let Jp=0;function Zp(r,e){return(e.castShadow?2:0)-(r.castShadow?2:0)+(e.map?1:0)-(r.map?1:0)}function Qp(r){const e=new Kp,t=jp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new I);const i=new I,s=new xt,o=new xt;function a(c){let h=0,u=0,d=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,m=0,x=0,g=0,p=0,_=0,v=0,M=0,b=0,S=0,C=0;c.sort(Zp);for(let E=0,T=c.length;E<T;E++){const R=c[E],O=R.color,k=R.intensity,z=R.distance,B=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)h+=O.r*k,u+=O.g*k,d+=O.b*k;else if(R.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(R.sh.coefficients[G],k);C++}else if(R.isDirectionalLight){const G=e.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const Z=R.shadow,V=t.get(R);V.shadowIntensity=Z.intensity,V.shadowBias=Z.bias,V.shadowNormalBias=Z.normalBias,V.shadowRadius=Z.radius,V.shadowMapSize=Z.mapSize,n.directionalShadow[f]=V,n.directionalShadowMap[f]=B,n.directionalShadowMatrix[f]=R.shadow.matrix,_++}n.directional[f]=G,f++}else if(R.isSpotLight){const G=e.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(O).multiplyScalar(k),G.distance=z,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,n.spot[x]=G;const Z=R.shadow;if(R.map&&(n.spotLightMap[b]=R.map,b++,Z.updateMatrices(R),R.castShadow&&S++),n.spotLightMatrix[x]=Z.matrix,R.castShadow){const V=t.get(R);V.shadowIntensity=Z.intensity,V.shadowBias=Z.bias,V.shadowNormalBias=Z.normalBias,V.shadowRadius=Z.radius,V.shadowMapSize=Z.mapSize,n.spotShadow[x]=V,n.spotShadowMap[x]=B,M++}x++}else if(R.isRectAreaLight){const G=e.get(R);G.color.copy(O).multiplyScalar(k),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),n.rectArea[g]=G,g++}else if(R.isPointLight){const G=e.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){const Z=R.shadow,V=t.get(R);V.shadowIntensity=Z.intensity,V.shadowBias=Z.bias,V.shadowNormalBias=Z.normalBias,V.shadowRadius=Z.radius,V.shadowMapSize=Z.mapSize,V.shadowCameraNear=Z.camera.near,V.shadowCameraFar=Z.camera.far,n.pointShadow[m]=V,n.pointShadowMap[m]=B,n.pointShadowMatrix[m]=R.shadow.matrix,v++}n.point[m]=G,m++}else if(R.isHemisphereLight){const G=e.get(R);G.skyColor.copy(R.color).multiplyScalar(k),G.groundColor.copy(R.groundColor).multiplyScalar(k),n.hemi[p]=G,p++}}g>0&&(r.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=xe.LTC_FLOAT_1,n.rectAreaLTC2=xe.LTC_FLOAT_2):(n.rectAreaLTC1=xe.LTC_HALF_1,n.rectAreaLTC2=xe.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const L=n.hash;(L.directionalLength!==f||L.pointLength!==m||L.spotLength!==x||L.rectAreaLength!==g||L.hemiLength!==p||L.numDirectionalShadows!==_||L.numPointShadows!==v||L.numSpotShadows!==M||L.numSpotMaps!==b||L.numLightProbes!==C)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=M,n.spotShadowMap.length=M,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=M+b-S,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=C,L.directionalLength=f,L.pointLength=m,L.spotLength=x,L.rectAreaLength=g,L.hemiLength=p,L.numDirectionalShadows=_,L.numPointShadows=v,L.numSpotShadows=M,L.numSpotMaps=b,L.numLightProbes=C,n.version=Jp++)}function l(c,h){let u=0,d=0,f=0,m=0,x=0;const g=h.matrixWorldInverse;for(let p=0,_=c.length;p<_;p++){const v=c[p];if(v.isDirectionalLight){const M=n.directional[u];M.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),M.direction.sub(i),M.direction.transformDirection(g),u++}else if(v.isSpotLight){const M=n.spot[f];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(g),M.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),M.direction.sub(i),M.direction.transformDirection(g),f++}else if(v.isRectAreaLight){const M=n.rectArea[m];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(g),o.identity(),s.copy(v.matrixWorld),s.premultiply(g),o.extractRotation(s),M.halfWidth.set(v.width*.5,0,0),M.halfHeight.set(0,v.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),m++}else if(v.isPointLight){const M=n.point[d];M.position.setFromMatrixPosition(v.matrixWorld),M.position.applyMatrix4(g),d++}else if(v.isHemisphereLight){const M=n.hemi[x];M.direction.setFromMatrixPosition(v.matrixWorld),M.direction.transformDirection(g),x++}}}return{setup:a,setupView:l,state:n}}function el(r){const e=new Qp(r),t=[],n=[];function i(h){c.camera=h,t.length=0,n.length=0}function s(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:s,pushShadow:o}}function em(r){let e=new WeakMap;function t(i,s=0){const o=e.get(i);let a;return o===void 0?(a=new el(r),e.set(i,[a])):s>=o.length?(a=new el(r),o.push(a)):a=o[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const tm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,nm=`uniform sampler2D shadow_pass;
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
}`;function im(r,e,t){let n=new ns;const i=new ot,s=new ot,o=new gt,a=new gh({depthPacking:Cc}),l=new xh,c={},h=t.maxTextureSize,u={[Fn]:Gt,[Gt]:Fn,[Xt]:Xt},d=new et({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ot},radius:{value:4}},vertexShader:tm,fragmentShader:nm}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const m=new yt;m.setAttribute("position",new wt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Re(m,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ll;let p=this.type;this.render=function(S,C,L){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||S.length===0)return;const E=r.getRenderTarget(),T=r.getActiveCubeFace(),R=r.getActiveMipmapLevel(),O=r.state;O.setBlending(En),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const k=p!==bn&&this.type===bn,z=p===bn&&this.type!==bn;for(let B=0,G=S.length;B<G;B++){const Z=S[B],V=Z.shadow;if(V===void 0){je("WebGLShadowMap:",Z,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;i.copy(V.mapSize);const J=V.getFrameExtents();if(i.multiply(J),s.copy(V.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/J.x),i.x=s.x*J.x,V.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/J.y),i.y=s.y*J.y,V.mapSize.y=s.y)),V.map===null||k===!0||z===!0){const oe=this.type!==bn?{minFilter:ut,magFilter:ut}:{};V.map!==null&&V.map.dispose(),V.map=new kn(i.x,i.y,oe),V.map.texture.name=Z.name+".shadowMap",V.camera.updateProjectionMatrix()}r.setRenderTarget(V.map),r.clear();const Q=V.getViewportCount();for(let oe=0;oe<Q;oe++){const ge=V.getViewport(oe);o.set(s.x*ge.x,s.y*ge.y,s.x*ge.z,s.y*ge.w),O.viewport(o),V.updateMatrices(Z,oe),n=V.getFrustum(),M(C,L,V.camera,Z,this.type)}V.isPointLightShadow!==!0&&this.type===bn&&_(V,L),V.needsUpdate=!1}p=this.type,g.needsUpdate=!1,r.setRenderTarget(E,T,R)};function _(S,C){const L=e.update(x);d.defines.VSM_SAMPLES!==S.blurSamples&&(d.defines.VSM_SAMPLES=S.blurSamples,f.defines.VSM_SAMPLES=S.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new kn(i.x,i.y)),d.uniforms.shadow_pass.value=S.map.texture,d.uniforms.resolution.value=S.mapSize,d.uniforms.radius.value=S.radius,r.setRenderTarget(S.mapPass),r.clear(),r.renderBufferDirect(C,null,L,d,x,null),f.uniforms.shadow_pass.value=S.mapPass.texture,f.uniforms.resolution.value=S.mapSize,f.uniforms.radius.value=S.radius,r.setRenderTarget(S.map),r.clear(),r.renderBufferDirect(C,null,L,f,x,null)}function v(S,C,L,E){let T=null;const R=L.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(R!==void 0)T=R;else if(T=L.isPointLight===!0?l:a,r.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){const O=T.uuid,k=C.uuid;let z=c[O];z===void 0&&(z={},c[O]=z);let B=z[k];B===void 0&&(B=T.clone(),z[k]=B,C.addEventListener("dispose",b)),T=B}if(T.visible=C.visible,T.wireframe=C.wireframe,E===bn?T.side=C.shadowSide!==null?C.shadowSide:C.side:T.side=C.shadowSide!==null?C.shadowSide:u[C.side],T.alphaMap=C.alphaMap,T.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,T.map=C.map,T.clipShadows=C.clipShadows,T.clippingPlanes=C.clippingPlanes,T.clipIntersection=C.clipIntersection,T.displacementMap=C.displacementMap,T.displacementScale=C.displacementScale,T.displacementBias=C.displacementBias,T.wireframeLinewidth=C.wireframeLinewidth,T.linewidth=C.linewidth,L.isPointLight===!0&&T.isMeshDistanceMaterial===!0){const O=r.properties.get(T);O.light=L}return T}function M(S,C,L,E,T){if(S.visible===!1)return;if(S.layers.test(C.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&T===bn)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(L.matrixWorldInverse,S.matrixWorld);const k=e.update(S),z=S.material;if(Array.isArray(z)){const B=k.groups;for(let G=0,Z=B.length;G<Z;G++){const V=B[G],J=z[V.materialIndex];if(J&&J.visible){const Q=v(S,J,E,T);S.onBeforeShadow(r,S,C,L,k,Q,V),r.renderBufferDirect(L,null,k,Q,S,V),S.onAfterShadow(r,S,C,L,k,Q,V)}}}else if(z.visible){const B=v(S,z,E,T);S.onBeforeShadow(r,S,C,L,k,B,null),r.renderBufferDirect(L,null,k,B,S,null),S.onAfterShadow(r,S,C,L,k,B,null)}}const O=S.children;for(let k=0,z=O.length;k<z;k++)M(O[k],C,L,E,T)}function b(S){S.target.removeEventListener("dispose",b);for(const L in c){const E=c[L],T=S.target.uuid;T in E&&(E[T].dispose(),delete E[T])}}}const sm={[Gr]:Br,[zr]:Vr,[Hr]:qr,[yi]:Wr,[Br]:Gr,[Vr]:zr,[qr]:Hr,[Wr]:yi};function rm(r,e){function t(){let U=!1;const ye=new gt;let de=null;const fe=new gt(0,0,0,0);return{setMask:function(ae){de!==ae&&!U&&(r.colorMask(ae,ae,ae,ae),de=ae)},setLocked:function(ae){U=ae},setClear:function(ae,ie,Ce,Ke,_t){_t===!0&&(ae*=Ke,ie*=Ke,Ce*=Ke),ye.set(ae,ie,Ce,Ke),fe.equals(ye)===!1&&(r.clearColor(ae,ie,Ce,Ke),fe.copy(ye))},reset:function(){U=!1,de=null,fe.set(-1,0,0,0)}}}function n(){let U=!1,ye=!1,de=null,fe=null,ae=null;return{setReversed:function(ie){if(ye!==ie){const Ce=e.get("EXT_clip_control");ie?Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.ZERO_TO_ONE_EXT):Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.NEGATIVE_ONE_TO_ONE_EXT),ye=ie;const Ke=ae;ae=null,this.setClear(Ke)}},getReversed:function(){return ye},setTest:function(ie){ie?te(r.DEPTH_TEST):pe(r.DEPTH_TEST)},setMask:function(ie){de!==ie&&!U&&(r.depthMask(ie),de=ie)},setFunc:function(ie){if(ye&&(ie=sm[ie]),fe!==ie){switch(ie){case Gr:r.depthFunc(r.NEVER);break;case Br:r.depthFunc(r.ALWAYS);break;case zr:r.depthFunc(r.LESS);break;case yi:r.depthFunc(r.LEQUAL);break;case Hr:r.depthFunc(r.EQUAL);break;case Wr:r.depthFunc(r.GEQUAL);break;case Vr:r.depthFunc(r.GREATER);break;case qr:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}fe=ie}},setLocked:function(ie){U=ie},setClear:function(ie){ae!==ie&&(ye&&(ie=1-ie),r.clearDepth(ie),ae=ie)},reset:function(){U=!1,de=null,fe=null,ae=null,ye=!1}}}function i(){let U=!1,ye=null,de=null,fe=null,ae=null,ie=null,Ce=null,Ke=null,_t=null;return{setTest:function(dt){U||(dt?te(r.STENCIL_TEST):pe(r.STENCIL_TEST))},setMask:function(dt){ye!==dt&&!U&&(r.stencilMask(dt),ye=dt)},setFunc:function(dt,dn,rn){(de!==dt||fe!==dn||ae!==rn)&&(r.stencilFunc(dt,dn,rn),de=dt,fe=dn,ae=rn)},setOp:function(dt,dn,rn){(ie!==dt||Ce!==dn||Ke!==rn)&&(r.stencilOp(dt,dn,rn),ie=dt,Ce=dn,Ke=rn)},setLocked:function(dt){U=dt},setClear:function(dt){_t!==dt&&(r.clearStencil(dt),_t=dt)},reset:function(){U=!1,ye=null,de=null,fe=null,ae=null,ie=null,Ce=null,Ke=null,_t=null}}}const s=new t,o=new n,a=new i,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,f=[],m=null,x=!1,g=null,p=null,_=null,v=null,M=null,b=null,S=null,C=new Le(0,0,0),L=0,E=!1,T=null,R=null,O=null,k=null,z=null;const B=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let G=!1,Z=0;const V=r.getParameter(r.VERSION);V.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(V)[1]),G=Z>=1):V.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),G=Z>=2);let J=null,Q={};const oe=r.getParameter(r.SCISSOR_BOX),ge=r.getParameter(r.VIEWPORT),Ue=new gt().fromArray(oe),$e=new gt().fromArray(ge);function Ve(U,ye,de,fe){const ae=new Uint8Array(4),ie=r.createTexture();r.bindTexture(U,ie),r.texParameteri(U,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(U,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let Ce=0;Ce<de;Ce++)U===r.TEXTURE_3D||U===r.TEXTURE_2D_ARRAY?r.texImage3D(ye,0,r.RGBA,1,1,fe,0,r.RGBA,r.UNSIGNED_BYTE,ae):r.texImage2D(ye+Ce,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,ae);return ie}const j={};j[r.TEXTURE_2D]=Ve(r.TEXTURE_2D,r.TEXTURE_2D,1),j[r.TEXTURE_CUBE_MAP]=Ve(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[r.TEXTURE_2D_ARRAY]=Ve(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),j[r.TEXTURE_3D]=Ve(r.TEXTURE_3D,r.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),te(r.DEPTH_TEST),o.setFunc(yi),Ae(!1),Pe(Jo),te(r.CULL_FACE),tt(En);function te(U){h[U]!==!0&&(r.enable(U),h[U]=!0)}function pe(U){h[U]!==!1&&(r.disable(U),h[U]=!1)}function ce(U,ye){return u[U]!==ye?(r.bindFramebuffer(U,ye),u[U]=ye,U===r.DRAW_FRAMEBUFFER&&(u[r.FRAMEBUFFER]=ye),U===r.FRAMEBUFFER&&(u[r.DRAW_FRAMEBUFFER]=ye),!0):!1}function Se(U,ye){let de=f,fe=!1;if(U){de=d.get(ye),de===void 0&&(de=[],d.set(ye,de));const ae=U.textures;if(de.length!==ae.length||de[0]!==r.COLOR_ATTACHMENT0){for(let ie=0,Ce=ae.length;ie<Ce;ie++)de[ie]=r.COLOR_ATTACHMENT0+ie;de.length=ae.length,fe=!0}}else de[0]!==r.BACK&&(de[0]=r.BACK,fe=!0);fe&&r.drawBuffers(de)}function Ne(U){return m!==U?(r.useProgram(U),m=U,!0):!1}const at={[$n]:r.FUNC_ADD,[Ql]:r.FUNC_SUBTRACT,[ec]:r.FUNC_REVERSE_SUBTRACT};at[tc]=r.MIN,at[nc]=r.MAX;const Be={[ic]:r.ZERO,[sc]:r.ONE,[rc]:r.SRC_COLOR,[Ur]:r.SRC_ALPHA,[uc]:r.SRC_ALPHA_SATURATE,[cc]:r.DST_COLOR,[ac]:r.DST_ALPHA,[oc]:r.ONE_MINUS_SRC_COLOR,[kr]:r.ONE_MINUS_SRC_ALPHA,[hc]:r.ONE_MINUS_DST_COLOR,[lc]:r.ONE_MINUS_DST_ALPHA,[dc]:r.CONSTANT_COLOR,[fc]:r.ONE_MINUS_CONSTANT_COLOR,[pc]:r.CONSTANT_ALPHA,[mc]:r.ONE_MINUS_CONSTANT_ALPHA};function tt(U,ye,de,fe,ae,ie,Ce,Ke,_t,dt){if(U===En){x===!0&&(pe(r.BLEND),x=!1);return}if(x===!1&&(te(r.BLEND),x=!0),U!==Zl){if(U!==g||dt!==E){if((p!==$n||M!==$n)&&(r.blendEquation(r.FUNC_ADD),p=$n,M=$n),dt)switch(U){case xi:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Fr:r.blendFunc(r.ONE,r.ONE);break;case Zo:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case Qo:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:At("WebGLState: Invalid blending: ",U);break}else switch(U){case xi:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Fr:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case Zo:At("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Qo:At("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:At("WebGLState: Invalid blending: ",U);break}_=null,v=null,b=null,S=null,C.set(0,0,0),L=0,g=U,E=dt}return}ae=ae||ye,ie=ie||de,Ce=Ce||fe,(ye!==p||ae!==M)&&(r.blendEquationSeparate(at[ye],at[ae]),p=ye,M=ae),(de!==_||fe!==v||ie!==b||Ce!==S)&&(r.blendFuncSeparate(Be[de],Be[fe],Be[ie],Be[Ce]),_=de,v=fe,b=ie,S=Ce),(Ke.equals(C)===!1||_t!==L)&&(r.blendColor(Ke.r,Ke.g,Ke.b,_t),C.copy(Ke),L=_t),g=U,E=!1}function N(U,ye){U.side===Xt?pe(r.CULL_FACE):te(r.CULL_FACE);let de=U.side===Gt;ye&&(de=!de),Ae(de),U.blending===xi&&U.transparent===!1?tt(En):tt(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),s.setMask(U.colorWrite);const fe=U.stencilWrite;a.setTest(fe),fe&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),ue(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?te(r.SAMPLE_ALPHA_TO_COVERAGE):pe(r.SAMPLE_ALPHA_TO_COVERAGE)}function Ae(U){T!==U&&(U?r.frontFace(r.CW):r.frontFace(r.CCW),T=U)}function Pe(U){U!==jl?(te(r.CULL_FACE),U!==R&&(U===Jo?r.cullFace(r.BACK):U===Jl?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):pe(r.CULL_FACE),R=U}function Ge(U){U!==O&&(G&&r.lineWidth(U),O=U)}function ue(U,ye,de){U?(te(r.POLYGON_OFFSET_FILL),(k!==ye||z!==de)&&(r.polygonOffset(ye,de),k=ye,z=de)):pe(r.POLYGON_OFFSET_FILL)}function Ee(U){U?te(r.SCISSOR_TEST):pe(r.SCISSOR_TEST)}function ne(U){U===void 0&&(U=r.TEXTURE0+B-1),J!==U&&(r.activeTexture(U),J=U)}function ve(U,ye,de){de===void 0&&(J===null?de=r.TEXTURE0+B-1:de=J);let fe=Q[de];fe===void 0&&(fe={type:void 0,texture:void 0},Q[de]=fe),(fe.type!==U||fe.texture!==ye)&&(J!==de&&(r.activeTexture(de),J=de),r.bindTexture(U,ye||j[U]),fe.type=U,fe.texture=ye)}function D(){const U=Q[J];U!==void 0&&U.type!==void 0&&(r.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function A(){try{r.compressedTexImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function H(){try{r.compressedTexImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function ee(){try{r.texSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function se(){try{r.texSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function K(){try{r.compressedTexSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function De(){try{r.compressedTexSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function me(){try{r.texStorage2D(...arguments)}catch(U){U("WebGLState:",U)}}function Fe(){try{r.texStorage3D(...arguments)}catch(U){U("WebGLState:",U)}}function Ie(){try{r.texImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function re(){try{r.texImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function le(U){Ue.equals(U)===!1&&(r.scissor(U.x,U.y,U.z,U.w),Ue.copy(U))}function qe(U){$e.equals(U)===!1&&(r.viewport(U.x,U.y,U.z,U.w),$e.copy(U))}function He(U,ye){let de=c.get(ye);de===void 0&&(de=new WeakMap,c.set(ye,de));let fe=de.get(U);fe===void 0&&(fe=r.getUniformBlockIndex(ye,U.name),de.set(U,fe))}function Te(U,ye){const fe=c.get(ye).get(U);l.get(ye)!==fe&&(r.uniformBlockBinding(ye,fe,U.__bindingPointIndex),l.set(ye,fe))}function Ye(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),o.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),h={},J=null,Q={},u={},d=new WeakMap,f=[],m=null,x=!1,g=null,p=null,_=null,v=null,M=null,b=null,S=null,C=new Le(0,0,0),L=0,E=!1,T=null,R=null,O=null,k=null,z=null,Ue.set(0,0,r.canvas.width,r.canvas.height),$e.set(0,0,r.canvas.width,r.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:te,disable:pe,bindFramebuffer:ce,drawBuffers:Se,useProgram:Ne,setBlending:tt,setMaterial:N,setFlipSided:Ae,setCullFace:Pe,setLineWidth:Ge,setPolygonOffset:ue,setScissorTest:Ee,activeTexture:ne,bindTexture:ve,unbindTexture:D,compressedTexImage2D:A,compressedTexImage3D:H,texImage2D:Ie,texImage3D:re,updateUBOMapping:He,uniformBlockBinding:Te,texStorage2D:me,texStorage3D:Fe,texSubImage2D:ee,texSubImage3D:se,compressedTexSubImage2D:K,compressedTexSubImage3D:De,scissor:le,viewport:qe,reset:Ye}}function om(r,e,t,n,i,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ot,h=new WeakMap;let u;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(D,A){return f?new OffscreenCanvas(D,A):ji("canvas")}function x(D,A,H){let ee=1;const se=ve(D);if((se.width>H||se.height>H)&&(ee=H/Math.max(se.width,se.height)),ee<1)if(typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&D instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&D instanceof ImageBitmap||typeof VideoFrame<"u"&&D instanceof VideoFrame){const K=Math.floor(ee*se.width),De=Math.floor(ee*se.height);u===void 0&&(u=m(K,De));const me=A?m(K,De):u;return me.width=K,me.height=De,me.getContext("2d").drawImage(D,0,0,K,De),je("WebGLRenderer: Texture has been resized from ("+se.width+"x"+se.height+") to ("+K+"x"+De+")."),me}else return"data"in D&&je("WebGLRenderer: Image in DataTexture is too big ("+se.width+"x"+se.height+")."),D;return D}function g(D){return D.generateMipmaps}function p(D){r.generateMipmap(D)}function _(D){return D.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:D.isWebGL3DRenderTarget?r.TEXTURE_3D:D.isWebGLArrayRenderTarget||D.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function v(D,A,H,ee,se=!1){if(D!==null){if(r[D]!==void 0)return r[D];je("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+D+"'")}let K=A;if(A===r.RED&&(H===r.FLOAT&&(K=r.R32F),H===r.HALF_FLOAT&&(K=r.R16F),H===r.UNSIGNED_BYTE&&(K=r.R8)),A===r.RED_INTEGER&&(H===r.UNSIGNED_BYTE&&(K=r.R8UI),H===r.UNSIGNED_SHORT&&(K=r.R16UI),H===r.UNSIGNED_INT&&(K=r.R32UI),H===r.BYTE&&(K=r.R8I),H===r.SHORT&&(K=r.R16I),H===r.INT&&(K=r.R32I)),A===r.RG&&(H===r.FLOAT&&(K=r.RG32F),H===r.HALF_FLOAT&&(K=r.RG16F),H===r.UNSIGNED_BYTE&&(K=r.RG8)),A===r.RG_INTEGER&&(H===r.UNSIGNED_BYTE&&(K=r.RG8UI),H===r.UNSIGNED_SHORT&&(K=r.RG16UI),H===r.UNSIGNED_INT&&(K=r.RG32UI),H===r.BYTE&&(K=r.RG8I),H===r.SHORT&&(K=r.RG16I),H===r.INT&&(K=r.RG32I)),A===r.RGB_INTEGER&&(H===r.UNSIGNED_BYTE&&(K=r.RGB8UI),H===r.UNSIGNED_SHORT&&(K=r.RGB16UI),H===r.UNSIGNED_INT&&(K=r.RGB32UI),H===r.BYTE&&(K=r.RGB8I),H===r.SHORT&&(K=r.RGB16I),H===r.INT&&(K=r.RGB32I)),A===r.RGBA_INTEGER&&(H===r.UNSIGNED_BYTE&&(K=r.RGBA8UI),H===r.UNSIGNED_SHORT&&(K=r.RGBA16UI),H===r.UNSIGNED_INT&&(K=r.RGBA32UI),H===r.BYTE&&(K=r.RGBA8I),H===r.SHORT&&(K=r.RGBA16I),H===r.INT&&(K=r.RGBA32I)),A===r.RGB&&(H===r.UNSIGNED_INT_5_9_9_9_REV&&(K=r.RGB9_E5),H===r.UNSIGNED_INT_10F_11F_11F_REV&&(K=r.R11F_G11F_B10F)),A===r.RGBA){const De=se?Hs:ht.getTransfer(ee);H===r.FLOAT&&(K=r.RGBA32F),H===r.HALF_FLOAT&&(K=r.RGBA16F),H===r.UNSIGNED_BYTE&&(K=De===pt?r.SRGB8_ALPHA8:r.RGBA8),H===r.UNSIGNED_SHORT_4_4_4_4&&(K=r.RGBA4),H===r.UNSIGNED_SHORT_5_5_5_1&&(K=r.RGB5_A1)}return(K===r.R16F||K===r.R32F||K===r.RG16F||K===r.RG32F||K===r.RGBA16F||K===r.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function M(D,A){let H;return D?A===null||A===Un||A===$i?H=r.DEPTH24_STENCIL8:A===Tn?H=r.DEPTH32F_STENCIL8:A===Yi&&(H=r.DEPTH24_STENCIL8,je("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):A===null||A===Un||A===$i?H=r.DEPTH_COMPONENT24:A===Tn?H=r.DEPTH_COMPONENT32F:A===Yi&&(H=r.DEPTH_COMPONENT16),H}function b(D,A){return g(D)===!0||D.isFramebufferTexture&&D.minFilter!==ut&&D.minFilter!==nn?Math.log2(Math.max(A.width,A.height))+1:D.mipmaps!==void 0&&D.mipmaps.length>0?D.mipmaps.length:D.isCompressedTexture&&Array.isArray(D.image)?A.mipmaps.length:1}function S(D){const A=D.target;A.removeEventListener("dispose",S),L(A),A.isVideoTexture&&h.delete(A)}function C(D){const A=D.target;A.removeEventListener("dispose",C),T(A)}function L(D){const A=n.get(D);if(A.__webglInit===void 0)return;const H=D.source,ee=d.get(H);if(ee){const se=ee[A.__cacheKey];se.usedTimes--,se.usedTimes===0&&E(D),Object.keys(ee).length===0&&d.delete(H)}n.remove(D)}function E(D){const A=n.get(D);r.deleteTexture(A.__webglTexture);const H=D.source,ee=d.get(H);delete ee[A.__cacheKey],o.memory.textures--}function T(D){const A=n.get(D);if(D.depthTexture&&(D.depthTexture.dispose(),n.remove(D.depthTexture)),D.isWebGLCubeRenderTarget)for(let ee=0;ee<6;ee++){if(Array.isArray(A.__webglFramebuffer[ee]))for(let se=0;se<A.__webglFramebuffer[ee].length;se++)r.deleteFramebuffer(A.__webglFramebuffer[ee][se]);else r.deleteFramebuffer(A.__webglFramebuffer[ee]);A.__webglDepthbuffer&&r.deleteRenderbuffer(A.__webglDepthbuffer[ee])}else{if(Array.isArray(A.__webglFramebuffer))for(let ee=0;ee<A.__webglFramebuffer.length;ee++)r.deleteFramebuffer(A.__webglFramebuffer[ee]);else r.deleteFramebuffer(A.__webglFramebuffer);if(A.__webglDepthbuffer&&r.deleteRenderbuffer(A.__webglDepthbuffer),A.__webglMultisampledFramebuffer&&r.deleteFramebuffer(A.__webglMultisampledFramebuffer),A.__webglColorRenderbuffer)for(let ee=0;ee<A.__webglColorRenderbuffer.length;ee++)A.__webglColorRenderbuffer[ee]&&r.deleteRenderbuffer(A.__webglColorRenderbuffer[ee]);A.__webglDepthRenderbuffer&&r.deleteRenderbuffer(A.__webglDepthRenderbuffer)}const H=D.textures;for(let ee=0,se=H.length;ee<se;ee++){const K=n.get(H[ee]);K.__webglTexture&&(r.deleteTexture(K.__webglTexture),o.memory.textures--),n.remove(H[ee])}n.remove(D)}let R=0;function O(){R=0}function k(){const D=R;return D>=i.maxTextures&&je("WebGLTextures: Trying to use "+D+" texture units while this GPU supports only "+i.maxTextures),R+=1,D}function z(D){const A=[];return A.push(D.wrapS),A.push(D.wrapT),A.push(D.wrapR||0),A.push(D.magFilter),A.push(D.minFilter),A.push(D.anisotropy),A.push(D.internalFormat),A.push(D.format),A.push(D.type),A.push(D.generateMipmaps),A.push(D.premultiplyAlpha),A.push(D.flipY),A.push(D.unpackAlignment),A.push(D.colorSpace),A.join()}function B(D,A){const H=n.get(D);if(D.isVideoTexture&&Ee(D),D.isRenderTargetTexture===!1&&D.isExternalTexture!==!0&&D.version>0&&H.__version!==D.version){const ee=D.image;if(ee===null)je("WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)je("WebGLRenderer: Texture marked for update but image is incomplete");else{j(H,D,A);return}}else D.isExternalTexture&&(H.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D,H.__webglTexture,r.TEXTURE0+A)}function G(D,A){const H=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&H.__version!==D.version){j(H,D,A);return}else D.isExternalTexture&&(H.__webglTexture=D.sourceTexture?D.sourceTexture:null);t.bindTexture(r.TEXTURE_2D_ARRAY,H.__webglTexture,r.TEXTURE0+A)}function Z(D,A){const H=n.get(D);if(D.isRenderTargetTexture===!1&&D.version>0&&H.__version!==D.version){j(H,D,A);return}t.bindTexture(r.TEXTURE_3D,H.__webglTexture,r.TEXTURE0+A)}function V(D,A){const H=n.get(D);if(D.version>0&&H.__version!==D.version){te(H,D,A);return}t.bindTexture(r.TEXTURE_CUBE_MAP,H.__webglTexture,r.TEXTURE0+A)}const J={[Qn]:r.REPEAT,[It]:r.CLAMP_TO_EDGE,[$r]:r.MIRRORED_REPEAT},Q={[ut]:r.NEAREST,[Mc]:r.NEAREST_MIPMAP_NEAREST,[rs]:r.NEAREST_MIPMAP_LINEAR,[nn]:r.LINEAR,[er]:r.LINEAR_MIPMAP_NEAREST,[Zn]:r.LINEAR_MIPMAP_LINEAR},oe={[Rc]:r.NEVER,[Nc]:r.ALWAYS,[Ic]:r.LESS,[yl]:r.LEQUAL,[Pc]:r.EQUAL,[Oc]:r.GEQUAL,[Dc]:r.GREATER,[Lc]:r.NOTEQUAL};function ge(D,A){if(A.type===Tn&&e.has("OES_texture_float_linear")===!1&&(A.magFilter===nn||A.magFilter===er||A.magFilter===rs||A.magFilter===Zn||A.minFilter===nn||A.minFilter===er||A.minFilter===rs||A.minFilter===Zn)&&je("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(D,r.TEXTURE_WRAP_S,J[A.wrapS]),r.texParameteri(D,r.TEXTURE_WRAP_T,J[A.wrapT]),(D===r.TEXTURE_3D||D===r.TEXTURE_2D_ARRAY)&&r.texParameteri(D,r.TEXTURE_WRAP_R,J[A.wrapR]),r.texParameteri(D,r.TEXTURE_MAG_FILTER,Q[A.magFilter]),r.texParameteri(D,r.TEXTURE_MIN_FILTER,Q[A.minFilter]),A.compareFunction&&(r.texParameteri(D,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(D,r.TEXTURE_COMPARE_FUNC,oe[A.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(A.magFilter===ut||A.minFilter!==rs&&A.minFilter!==Zn||A.type===Tn&&e.has("OES_texture_float_linear")===!1)return;if(A.anisotropy>1||n.get(A).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");r.texParameterf(D,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(A.anisotropy,i.getMaxAnisotropy())),n.get(A).__currentAnisotropy=A.anisotropy}}}function Ue(D,A){let H=!1;D.__webglInit===void 0&&(D.__webglInit=!0,A.addEventListener("dispose",S));const ee=A.source;let se=d.get(ee);se===void 0&&(se={},d.set(ee,se));const K=z(A);if(K!==D.__cacheKey){se[K]===void 0&&(se[K]={texture:r.createTexture(),usedTimes:0},o.memory.textures++,H=!0),se[K].usedTimes++;const De=se[D.__cacheKey];De!==void 0&&(se[D.__cacheKey].usedTimes--,De.usedTimes===0&&E(A)),D.__cacheKey=K,D.__webglTexture=se[K].texture}return H}function $e(D,A,H){return Math.floor(Math.floor(D/H)/A)}function Ve(D,A,H,ee){const K=D.updateRanges;if(K.length===0)t.texSubImage2D(r.TEXTURE_2D,0,0,0,A.width,A.height,H,ee,A.data);else{K.sort((re,le)=>re.start-le.start);let De=0;for(let re=1;re<K.length;re++){const le=K[De],qe=K[re],He=le.start+le.count,Te=$e(qe.start,A.width,4),Ye=$e(le.start,A.width,4);qe.start<=He+1&&Te===Ye&&$e(qe.start+qe.count-1,A.width,4)===Te?le.count=Math.max(le.count,qe.start+qe.count-le.start):(++De,K[De]=qe)}K.length=De+1;const me=r.getParameter(r.UNPACK_ROW_LENGTH),Fe=r.getParameter(r.UNPACK_SKIP_PIXELS),Ie=r.getParameter(r.UNPACK_SKIP_ROWS);r.pixelStorei(r.UNPACK_ROW_LENGTH,A.width);for(let re=0,le=K.length;re<le;re++){const qe=K[re],He=Math.floor(qe.start/4),Te=Math.ceil(qe.count/4),Ye=He%A.width,U=Math.floor(He/A.width),ye=Te,de=1;r.pixelStorei(r.UNPACK_SKIP_PIXELS,Ye),r.pixelStorei(r.UNPACK_SKIP_ROWS,U),t.texSubImage2D(r.TEXTURE_2D,0,Ye,U,ye,de,H,ee,A.data)}D.clearUpdateRanges(),r.pixelStorei(r.UNPACK_ROW_LENGTH,me),r.pixelStorei(r.UNPACK_SKIP_PIXELS,Fe),r.pixelStorei(r.UNPACK_SKIP_ROWS,Ie)}}function j(D,A,H){let ee=r.TEXTURE_2D;(A.isDataArrayTexture||A.isCompressedArrayTexture)&&(ee=r.TEXTURE_2D_ARRAY),A.isData3DTexture&&(ee=r.TEXTURE_3D);const se=Ue(D,A),K=A.source;t.bindTexture(ee,D.__webglTexture,r.TEXTURE0+H);const De=n.get(K);if(K.version!==De.__version||se===!0){t.activeTexture(r.TEXTURE0+H);const me=ht.getPrimaries(ht.workingColorSpace),Fe=A.colorSpace===Ln?null:ht.getPrimaries(A.colorSpace),Ie=A.colorSpace===Ln||me===Fe?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,A.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,A.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ie);let re=x(A.image,!1,i.maxTextureSize);re=ne(A,re);const le=s.convert(A.format,A.colorSpace),qe=s.convert(A.type);let He=v(A.internalFormat,le,qe,A.colorSpace,A.isVideoTexture);ge(ee,A);let Te;const Ye=A.mipmaps,U=A.isVideoTexture!==!0,ye=De.__version===void 0||se===!0,de=K.dataReady,fe=b(A,re);if(A.isDepthTexture)He=M(A.format===Ki,A.type),ye&&(U?t.texStorage2D(r.TEXTURE_2D,1,He,re.width,re.height):t.texImage2D(r.TEXTURE_2D,0,He,re.width,re.height,0,le,qe,null));else if(A.isDataTexture)if(Ye.length>0){U&&ye&&t.texStorage2D(r.TEXTURE_2D,fe,He,Ye[0].width,Ye[0].height);for(let ae=0,ie=Ye.length;ae<ie;ae++)Te=Ye[ae],U?de&&t.texSubImage2D(r.TEXTURE_2D,ae,0,0,Te.width,Te.height,le,qe,Te.data):t.texImage2D(r.TEXTURE_2D,ae,He,Te.width,Te.height,0,le,qe,Te.data);A.generateMipmaps=!1}else U?(ye&&t.texStorage2D(r.TEXTURE_2D,fe,He,re.width,re.height),de&&Ve(A,re,le,qe)):t.texImage2D(r.TEXTURE_2D,0,He,re.width,re.height,0,le,qe,re.data);else if(A.isCompressedTexture)if(A.isCompressedArrayTexture){U&&ye&&t.texStorage3D(r.TEXTURE_2D_ARRAY,fe,He,Ye[0].width,Ye[0].height,re.depth);for(let ae=0,ie=Ye.length;ae<ie;ae++)if(Te=Ye[ae],A.format!==hn)if(le!==null)if(U){if(de)if(A.layerUpdates.size>0){const Ce=Pa(Te.width,Te.height,A.format,A.type);for(const Ke of A.layerUpdates){const _t=Te.data.subarray(Ke*Ce/Te.data.BYTES_PER_ELEMENT,(Ke+1)*Ce/Te.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ae,0,0,Ke,Te.width,Te.height,1,le,_t)}A.clearLayerUpdates()}else t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ae,0,0,0,Te.width,Te.height,re.depth,le,Te.data)}else t.compressedTexImage3D(r.TEXTURE_2D_ARRAY,ae,He,Te.width,Te.height,re.depth,0,Te.data,0,0);else je("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?de&&t.texSubImage3D(r.TEXTURE_2D_ARRAY,ae,0,0,0,Te.width,Te.height,re.depth,le,qe,Te.data):t.texImage3D(r.TEXTURE_2D_ARRAY,ae,He,Te.width,Te.height,re.depth,0,le,qe,Te.data)}else{U&&ye&&t.texStorage2D(r.TEXTURE_2D,fe,He,Ye[0].width,Ye[0].height);for(let ae=0,ie=Ye.length;ae<ie;ae++)Te=Ye[ae],A.format!==hn?le!==null?U?de&&t.compressedTexSubImage2D(r.TEXTURE_2D,ae,0,0,Te.width,Te.height,le,Te.data):t.compressedTexImage2D(r.TEXTURE_2D,ae,He,Te.width,Te.height,0,Te.data):je("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?de&&t.texSubImage2D(r.TEXTURE_2D,ae,0,0,Te.width,Te.height,le,qe,Te.data):t.texImage2D(r.TEXTURE_2D,ae,He,Te.width,Te.height,0,le,qe,Te.data)}else if(A.isDataArrayTexture)if(U){if(ye&&t.texStorage3D(r.TEXTURE_2D_ARRAY,fe,He,re.width,re.height,re.depth),de)if(A.layerUpdates.size>0){const ae=Pa(re.width,re.height,A.format,A.type);for(const ie of A.layerUpdates){const Ce=re.data.subarray(ie*ae/re.data.BYTES_PER_ELEMENT,(ie+1)*ae/re.data.BYTES_PER_ELEMENT);t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,ie,re.width,re.height,1,le,qe,Ce)}A.clearLayerUpdates()}else t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,re.width,re.height,re.depth,le,qe,re.data)}else t.texImage3D(r.TEXTURE_2D_ARRAY,0,He,re.width,re.height,re.depth,0,le,qe,re.data);else if(A.isData3DTexture)U?(ye&&t.texStorage3D(r.TEXTURE_3D,fe,He,re.width,re.height,re.depth),de&&t.texSubImage3D(r.TEXTURE_3D,0,0,0,0,re.width,re.height,re.depth,le,qe,re.data)):t.texImage3D(r.TEXTURE_3D,0,He,re.width,re.height,re.depth,0,le,qe,re.data);else if(A.isFramebufferTexture){if(ye)if(U)t.texStorage2D(r.TEXTURE_2D,fe,He,re.width,re.height);else{let ae=re.width,ie=re.height;for(let Ce=0;Ce<fe;Ce++)t.texImage2D(r.TEXTURE_2D,Ce,He,ae,ie,0,le,qe,null),ae>>=1,ie>>=1}}else if(Ye.length>0){if(U&&ye){const ae=ve(Ye[0]);t.texStorage2D(r.TEXTURE_2D,fe,He,ae.width,ae.height)}for(let ae=0,ie=Ye.length;ae<ie;ae++)Te=Ye[ae],U?de&&t.texSubImage2D(r.TEXTURE_2D,ae,0,0,le,qe,Te):t.texImage2D(r.TEXTURE_2D,ae,He,le,qe,Te);A.generateMipmaps=!1}else if(U){if(ye){const ae=ve(re);t.texStorage2D(r.TEXTURE_2D,fe,He,ae.width,ae.height)}de&&t.texSubImage2D(r.TEXTURE_2D,0,0,0,le,qe,re)}else t.texImage2D(r.TEXTURE_2D,0,He,le,qe,re);g(A)&&p(ee),De.__version=K.version,A.onUpdate&&A.onUpdate(A)}D.__version=A.version}function te(D,A,H){if(A.image.length!==6)return;const ee=Ue(D,A),se=A.source;t.bindTexture(r.TEXTURE_CUBE_MAP,D.__webglTexture,r.TEXTURE0+H);const K=n.get(se);if(se.version!==K.__version||ee===!0){t.activeTexture(r.TEXTURE0+H);const De=ht.getPrimaries(ht.workingColorSpace),me=A.colorSpace===Ln?null:ht.getPrimaries(A.colorSpace),Fe=A.colorSpace===Ln||De===me?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,A.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,A.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,A.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe);const Ie=A.isCompressedTexture||A.image[0].isCompressedTexture,re=A.image[0]&&A.image[0].isDataTexture,le=[];for(let ie=0;ie<6;ie++)!Ie&&!re?le[ie]=x(A.image[ie],!0,i.maxCubemapSize):le[ie]=re?A.image[ie].image:A.image[ie],le[ie]=ne(A,le[ie]);const qe=le[0],He=s.convert(A.format,A.colorSpace),Te=s.convert(A.type),Ye=v(A.internalFormat,He,Te,A.colorSpace),U=A.isVideoTexture!==!0,ye=K.__version===void 0||ee===!0,de=se.dataReady;let fe=b(A,qe);ge(r.TEXTURE_CUBE_MAP,A);let ae;if(Ie){U&&ye&&t.texStorage2D(r.TEXTURE_CUBE_MAP,fe,Ye,qe.width,qe.height);for(let ie=0;ie<6;ie++){ae=le[ie].mipmaps;for(let Ce=0;Ce<ae.length;Ce++){const Ke=ae[Ce];A.format!==hn?He!==null?U?de&&t.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce,0,0,Ke.width,Ke.height,He,Ke.data):t.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce,Ye,Ke.width,Ke.height,0,Ke.data):je("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce,0,0,Ke.width,Ke.height,He,Te,Ke.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce,Ye,Ke.width,Ke.height,0,He,Te,Ke.data)}}}else{if(ae=A.mipmaps,U&&ye){ae.length>0&&fe++;const ie=ve(le[0]);t.texStorage2D(r.TEXTURE_CUBE_MAP,fe,Ye,ie.width,ie.height)}for(let ie=0;ie<6;ie++)if(re){U?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,0,0,le[ie].width,le[ie].height,He,Te,le[ie].data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,Ye,le[ie].width,le[ie].height,0,He,Te,le[ie].data);for(let Ce=0;Ce<ae.length;Ce++){const _t=ae[Ce].image[ie].image;U?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce+1,0,0,_t.width,_t.height,He,Te,_t.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce+1,Ye,_t.width,_t.height,0,He,Te,_t.data)}}else{U?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,0,0,He,Te,le[ie]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,Ye,He,Te,le[ie]);for(let Ce=0;Ce<ae.length;Ce++){const Ke=ae[Ce];U?de&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce+1,0,0,He,Te,Ke.image[ie]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Ce+1,Ye,He,Te,Ke.image[ie])}}}g(A)&&p(r.TEXTURE_CUBE_MAP),K.__version=se.version,A.onUpdate&&A.onUpdate(A)}D.__version=A.version}function pe(D,A,H,ee,se,K){const De=s.convert(H.format,H.colorSpace),me=s.convert(H.type),Fe=v(H.internalFormat,De,me,H.colorSpace),Ie=n.get(A),re=n.get(H);if(re.__renderTarget=A,!Ie.__hasExternalTextures){const le=Math.max(1,A.width>>K),qe=Math.max(1,A.height>>K);se===r.TEXTURE_3D||se===r.TEXTURE_2D_ARRAY?t.texImage3D(se,K,Fe,le,qe,A.depth,0,De,me,null):t.texImage2D(se,K,Fe,le,qe,0,De,me,null)}t.bindFramebuffer(r.FRAMEBUFFER,D),ue(A)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,ee,se,re.__webglTexture,0,Ge(A)):(se===r.TEXTURE_2D||se>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&se<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,ee,se,re.__webglTexture,K),t.bindFramebuffer(r.FRAMEBUFFER,null)}function ce(D,A,H){if(r.bindRenderbuffer(r.RENDERBUFFER,D),A.depthBuffer){const ee=A.depthTexture,se=ee&&ee.isDepthTexture?ee.type:null,K=M(A.stencilBuffer,se),De=A.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,me=Ge(A);ue(A)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,me,K,A.width,A.height):H?r.renderbufferStorageMultisample(r.RENDERBUFFER,me,K,A.width,A.height):r.renderbufferStorage(r.RENDERBUFFER,K,A.width,A.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,De,r.RENDERBUFFER,D)}else{const ee=A.textures;for(let se=0;se<ee.length;se++){const K=ee[se],De=s.convert(K.format,K.colorSpace),me=s.convert(K.type),Fe=v(K.internalFormat,De,me,K.colorSpace),Ie=Ge(A);H&&ue(A)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,Ie,Fe,A.width,A.height):ue(A)?a.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Ie,Fe,A.width,A.height):r.renderbufferStorage(r.RENDERBUFFER,Fe,A.width,A.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function Se(D,A){if(A&&A.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(r.FRAMEBUFFER,D),!(A.depthTexture&&A.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ee=n.get(A.depthTexture);ee.__renderTarget=A,(!ee.__webglTexture||A.depthTexture.image.width!==A.width||A.depthTexture.image.height!==A.height)&&(A.depthTexture.image.width=A.width,A.depthTexture.image.height=A.height,A.depthTexture.needsUpdate=!0),B(A.depthTexture,0);const se=ee.__webglTexture,K=Ge(A);if(A.depthTexture.format===bi)ue(A)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,se,0,K):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,se,0);else if(A.depthTexture.format===Ki)ue(A)?a.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,se,0,K):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,se,0);else throw new Error("Unknown depthTexture format")}function Ne(D){const A=n.get(D),H=D.isWebGLCubeRenderTarget===!0;if(A.__boundDepthTexture!==D.depthTexture){const ee=D.depthTexture;if(A.__depthDisposeCallback&&A.__depthDisposeCallback(),ee){const se=()=>{delete A.__boundDepthTexture,delete A.__depthDisposeCallback,ee.removeEventListener("dispose",se)};ee.addEventListener("dispose",se),A.__depthDisposeCallback=se}A.__boundDepthTexture=ee}if(D.depthTexture&&!A.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");const ee=D.texture.mipmaps;ee&&ee.length>0?Se(A.__webglFramebuffer[0],D):Se(A.__webglFramebuffer,D)}else if(H){A.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)if(t.bindFramebuffer(r.FRAMEBUFFER,A.__webglFramebuffer[ee]),A.__webglDepthbuffer[ee]===void 0)A.__webglDepthbuffer[ee]=r.createRenderbuffer(),ce(A.__webglDepthbuffer[ee],D,!1);else{const se=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,K=A.__webglDepthbuffer[ee];r.bindRenderbuffer(r.RENDERBUFFER,K),r.framebufferRenderbuffer(r.FRAMEBUFFER,se,r.RENDERBUFFER,K)}}else{const ee=D.texture.mipmaps;if(ee&&ee.length>0?t.bindFramebuffer(r.FRAMEBUFFER,A.__webglFramebuffer[0]):t.bindFramebuffer(r.FRAMEBUFFER,A.__webglFramebuffer),A.__webglDepthbuffer===void 0)A.__webglDepthbuffer=r.createRenderbuffer(),ce(A.__webglDepthbuffer,D,!1);else{const se=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,K=A.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,K),r.framebufferRenderbuffer(r.FRAMEBUFFER,se,r.RENDERBUFFER,K)}}t.bindFramebuffer(r.FRAMEBUFFER,null)}function at(D,A,H){const ee=n.get(D);A!==void 0&&pe(ee.__webglFramebuffer,D,D.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),H!==void 0&&Ne(D)}function Be(D){const A=D.texture,H=n.get(D),ee=n.get(A);D.addEventListener("dispose",C);const se=D.textures,K=D.isWebGLCubeRenderTarget===!0,De=se.length>1;if(De||(ee.__webglTexture===void 0&&(ee.__webglTexture=r.createTexture()),ee.__version=A.version,o.memory.textures++),K){H.__webglFramebuffer=[];for(let me=0;me<6;me++)if(A.mipmaps&&A.mipmaps.length>0){H.__webglFramebuffer[me]=[];for(let Fe=0;Fe<A.mipmaps.length;Fe++)H.__webglFramebuffer[me][Fe]=r.createFramebuffer()}else H.__webglFramebuffer[me]=r.createFramebuffer()}else{if(A.mipmaps&&A.mipmaps.length>0){H.__webglFramebuffer=[];for(let me=0;me<A.mipmaps.length;me++)H.__webglFramebuffer[me]=r.createFramebuffer()}else H.__webglFramebuffer=r.createFramebuffer();if(De)for(let me=0,Fe=se.length;me<Fe;me++){const Ie=n.get(se[me]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=r.createTexture(),o.memory.textures++)}if(D.samples>0&&ue(D)===!1){H.__webglMultisampledFramebuffer=r.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(r.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let me=0;me<se.length;me++){const Fe=se[me];H.__webglColorRenderbuffer[me]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,H.__webglColorRenderbuffer[me]);const Ie=s.convert(Fe.format,Fe.colorSpace),re=s.convert(Fe.type),le=v(Fe.internalFormat,Ie,re,Fe.colorSpace,D.isXRRenderTarget===!0),qe=Ge(D);r.renderbufferStorageMultisample(r.RENDERBUFFER,qe,le,D.width,D.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+me,r.RENDERBUFFER,H.__webglColorRenderbuffer[me])}r.bindRenderbuffer(r.RENDERBUFFER,null),D.depthBuffer&&(H.__webglDepthRenderbuffer=r.createRenderbuffer(),ce(H.__webglDepthRenderbuffer,D,!0)),t.bindFramebuffer(r.FRAMEBUFFER,null)}}if(K){t.bindTexture(r.TEXTURE_CUBE_MAP,ee.__webglTexture),ge(r.TEXTURE_CUBE_MAP,A);for(let me=0;me<6;me++)if(A.mipmaps&&A.mipmaps.length>0)for(let Fe=0;Fe<A.mipmaps.length;Fe++)pe(H.__webglFramebuffer[me][Fe],D,A,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+me,Fe);else pe(H.__webglFramebuffer[me],D,A,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+me,0);g(A)&&p(r.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(De){for(let me=0,Fe=se.length;me<Fe;me++){const Ie=se[me],re=n.get(Ie);let le=r.TEXTURE_2D;(D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(le=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(le,re.__webglTexture),ge(le,Ie),pe(H.__webglFramebuffer,D,Ie,r.COLOR_ATTACHMENT0+me,le,0),g(Ie)&&p(le)}t.unbindTexture()}else{let me=r.TEXTURE_2D;if((D.isWebGL3DRenderTarget||D.isWebGLArrayRenderTarget)&&(me=D.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(me,ee.__webglTexture),ge(me,A),A.mipmaps&&A.mipmaps.length>0)for(let Fe=0;Fe<A.mipmaps.length;Fe++)pe(H.__webglFramebuffer[Fe],D,A,r.COLOR_ATTACHMENT0,me,Fe);else pe(H.__webglFramebuffer,D,A,r.COLOR_ATTACHMENT0,me,0);g(A)&&p(me),t.unbindTexture()}D.depthBuffer&&Ne(D)}function tt(D){const A=D.textures;for(let H=0,ee=A.length;H<ee;H++){const se=A[H];if(g(se)){const K=_(D),De=n.get(se).__webglTexture;t.bindTexture(K,De),p(K),t.unbindTexture()}}}const N=[],Ae=[];function Pe(D){if(D.samples>0){if(ue(D)===!1){const A=D.textures,H=D.width,ee=D.height;let se=r.COLOR_BUFFER_BIT;const K=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,De=n.get(D),me=A.length>1;if(me)for(let Ie=0;Ie<A.length;Ie++)t.bindFramebuffer(r.FRAMEBUFFER,De.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ie,r.RENDERBUFFER,null),t.bindFramebuffer(r.FRAMEBUFFER,De.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ie,r.TEXTURE_2D,null,0);t.bindFramebuffer(r.READ_FRAMEBUFFER,De.__webglMultisampledFramebuffer);const Fe=D.texture.mipmaps;Fe&&Fe.length>0?t.bindFramebuffer(r.DRAW_FRAMEBUFFER,De.__webglFramebuffer[0]):t.bindFramebuffer(r.DRAW_FRAMEBUFFER,De.__webglFramebuffer);for(let Ie=0;Ie<A.length;Ie++){if(D.resolveDepthBuffer&&(D.depthBuffer&&(se|=r.DEPTH_BUFFER_BIT),D.stencilBuffer&&D.resolveStencilBuffer&&(se|=r.STENCIL_BUFFER_BIT)),me){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,De.__webglColorRenderbuffer[Ie]);const re=n.get(A[Ie]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,re,0)}r.blitFramebuffer(0,0,H,ee,0,0,H,ee,se,r.NEAREST),l===!0&&(N.length=0,Ae.length=0,N.push(r.COLOR_ATTACHMENT0+Ie),D.depthBuffer&&D.resolveDepthBuffer===!1&&(N.push(K),Ae.push(K),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,Ae)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,N))}if(t.bindFramebuffer(r.READ_FRAMEBUFFER,null),t.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),me)for(let Ie=0;Ie<A.length;Ie++){t.bindFramebuffer(r.FRAMEBUFFER,De.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ie,r.RENDERBUFFER,De.__webglColorRenderbuffer[Ie]);const re=n.get(A[Ie]).__webglTexture;t.bindFramebuffer(r.FRAMEBUFFER,De.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ie,r.TEXTURE_2D,re,0)}t.bindFramebuffer(r.DRAW_FRAMEBUFFER,De.__webglMultisampledFramebuffer)}else if(D.depthBuffer&&D.resolveDepthBuffer===!1&&l){const A=D.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[A])}}}function Ge(D){return Math.min(i.maxSamples,D.samples)}function ue(D){const A=n.get(D);return D.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&A.__useRenderToTexture!==!1}function Ee(D){const A=o.render.frame;h.get(D)!==A&&(h.set(D,A),D.update())}function ne(D,A){const H=D.colorSpace,ee=D.format,se=D.type;return D.isCompressedTexture===!0||D.isVideoTexture===!0||H!==Ti&&H!==Ln&&(ht.getTransfer(H)===pt?(ee!==hn||se!==mn)&&je("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):At("WebGLTextures: Unsupported texture color space:",H)),A}function ve(D){return typeof HTMLImageElement<"u"&&D instanceof HTMLImageElement?(c.width=D.naturalWidth||D.width,c.height=D.naturalHeight||D.height):typeof VideoFrame<"u"&&D instanceof VideoFrame?(c.width=D.displayWidth,c.height=D.displayHeight):(c.width=D.width,c.height=D.height),c}this.allocateTextureUnit=k,this.resetTextureUnits=O,this.setTexture2D=B,this.setTexture2DArray=G,this.setTexture3D=Z,this.setTextureCube=V,this.rebindTextures=at,this.setupRenderTarget=Be,this.updateRenderTargetMipmap=tt,this.updateMultisampleRenderTarget=Pe,this.setupDepthRenderbuffer=Ne,this.setupFrameBufferTexture=pe,this.useMultisampledRTT=ue}function am(r,e){function t(n,i=Ln){let s;const o=ht.getTransfer(i);if(n===mn)return r.UNSIGNED_BYTE;if(n===Do)return r.UNSIGNED_SHORT_4_4_4_4;if(n===Lo)return r.UNSIGNED_SHORT_5_5_5_1;if(n===fl)return r.UNSIGNED_INT_5_9_9_9_REV;if(n===pl)return r.UNSIGNED_INT_10F_11F_11F_REV;if(n===ul)return r.BYTE;if(n===dl)return r.SHORT;if(n===Yi)return r.UNSIGNED_SHORT;if(n===Po)return r.INT;if(n===Un)return r.UNSIGNED_INT;if(n===Tn)return r.FLOAT;if(n===Ci)return r.HALF_FLOAT;if(n===ml)return r.ALPHA;if(n===gl)return r.RGB;if(n===hn)return r.RGBA;if(n===bi)return r.DEPTH_COMPONENT;if(n===Ki)return r.DEPTH_STENCIL;if(n===xl)return r.RED;if(n===Oo)return r.RED_INTEGER;if(n===No)return r.RG;if(n===Fo)return r.RG_INTEGER;if(n===Uo)return r.RGBA_INTEGER;if(n===Ds||n===Ls||n===Os||n===Ns)if(o===pt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Ds)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ls)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Os)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ns)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Ds)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ls)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Os)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ns)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Kr||n===jr||n===Jr||n===Zr)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===Kr)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===jr)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Jr)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Zr)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Qr||n===eo||n===to)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Qr||n===eo)return o===pt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===to)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===no||n===io||n===so||n===ro||n===oo||n===ao||n===lo||n===co||n===ho||n===uo||n===fo||n===po||n===mo||n===go)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===no)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===io)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===so)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ro)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===oo)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ao)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===lo)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===co)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ho)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===uo)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===fo)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===po)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===mo)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===go)return o===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===xo||n===vo||n===yo)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===xo)return o===pt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===vo)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===yo)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===_o||n===So||n===bo||n===To)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===_o)return s.COMPRESSED_RED_RGTC1_EXT;if(n===So)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===bo)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===To)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===$i?r.UNSIGNED_INT_24_8:r[n]!==void 0?r[n]:null}return{convert:t}}const lm=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,cm=`
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

}`;class hm{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Rl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new et({vertexShader:lm,fragmentShader:cm,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Re(new $s(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class um extends wi{constructor(e,t){super();const n=this;let i=null,s=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,m=null;const x=typeof XRWebGLBinding<"u",g=new hm,p={},_=t.getContextAttributes();let v=null,M=null;const b=[],S=[],C=new ot;let L=null;const E=new Zt;E.viewport=new gt;const T=new Zt;T.viewport=new gt;const R=[E,T],O=new Ch;let k=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let te=b[j];return te===void 0&&(te=new Tr,b[j]=te),te.getTargetRaySpace()},this.getControllerGrip=function(j){let te=b[j];return te===void 0&&(te=new Tr,b[j]=te),te.getGripSpace()},this.getHand=function(j){let te=b[j];return te===void 0&&(te=new Tr,b[j]=te),te.getHandSpace()};function B(j){const te=S.indexOf(j.inputSource);if(te===-1)return;const pe=b[te];pe!==void 0&&(pe.update(j.inputSource,j.frame,c||o),pe.dispatchEvent({type:j.type,data:j.inputSource}))}function G(){i.removeEventListener("select",B),i.removeEventListener("selectstart",B),i.removeEventListener("selectend",B),i.removeEventListener("squeeze",B),i.removeEventListener("squeezestart",B),i.removeEventListener("squeezeend",B),i.removeEventListener("end",G),i.removeEventListener("inputsourceschange",Z);for(let j=0;j<b.length;j++){const te=S[j];te!==null&&(S[j]=null,b[j].disconnect(te))}k=null,z=null,g.reset();for(const j in p)delete p[j];e.setRenderTarget(v),f=null,d=null,u=null,i=null,M=null,Ve.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(C.width,C.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){s=j,n.isPresenting===!0&&je("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,n.isPresenting===!0&&je("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(j){c=j},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return m},this.getSession=function(){return i},this.setSession=async function(j){if(i=j,i!==null){if(v=e.getRenderTarget(),i.addEventListener("select",B),i.addEventListener("selectstart",B),i.addEventListener("selectend",B),i.addEventListener("squeeze",B),i.addEventListener("squeezestart",B),i.addEventListener("squeezeend",B),i.addEventListener("end",G),i.addEventListener("inputsourceschange",Z),_.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(C),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let pe=null,ce=null,Se=null;_.depth&&(Se=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,pe=_.stencil?Ki:bi,ce=_.stencil?$i:Un);const Ne={colorFormat:t.RGBA8,depthFormat:Se,scaleFactor:s};u=this.getBinding(),d=u.createProjectionLayer(Ne),i.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),M=new kn(d.textureWidth,d.textureHeight,{format:hn,type:mn,depthTexture:new Ho(d.textureWidth,d.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,pe),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const pe={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,pe),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new kn(f.framebufferWidth,f.framebufferHeight,{format:hn,type:mn,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),Ve.setContext(i),Ve.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function Z(j){for(let te=0;te<j.removed.length;te++){const pe=j.removed[te],ce=S.indexOf(pe);ce>=0&&(S[ce]=null,b[ce].disconnect(pe))}for(let te=0;te<j.added.length;te++){const pe=j.added[te];let ce=S.indexOf(pe);if(ce===-1){for(let Ne=0;Ne<b.length;Ne++)if(Ne>=S.length){S.push(pe),ce=Ne;break}else if(S[Ne]===null){S[Ne]=pe,ce=Ne;break}if(ce===-1)break}const Se=b[ce];Se&&Se.connect(pe)}}const V=new I,J=new I;function Q(j,te,pe){V.setFromMatrixPosition(te.matrixWorld),J.setFromMatrixPosition(pe.matrixWorld);const ce=V.distanceTo(J),Se=te.projectionMatrix.elements,Ne=pe.projectionMatrix.elements,at=Se[14]/(Se[10]-1),Be=Se[14]/(Se[10]+1),tt=(Se[9]+1)/Se[5],N=(Se[9]-1)/Se[5],Ae=(Se[8]-1)/Se[0],Pe=(Ne[8]+1)/Ne[0],Ge=at*Ae,ue=at*Pe,Ee=ce/(-Ae+Pe),ne=Ee*-Ae;if(te.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(ne),j.translateZ(Ee),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),Se[10]===-1)j.projectionMatrix.copy(te.projectionMatrix),j.projectionMatrixInverse.copy(te.projectionMatrixInverse);else{const ve=at+Ee,D=Be+Ee,A=Ge-ne,H=ue+(ce-ne),ee=tt*Be/D*ve,se=N*Be/D*ve;j.projectionMatrix.makePerspective(A,H,ee,se,ve,D),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function oe(j,te){te===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(te.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(i===null)return;let te=j.near,pe=j.far;g.texture!==null&&(g.depthNear>0&&(te=g.depthNear),g.depthFar>0&&(pe=g.depthFar)),O.near=T.near=E.near=te,O.far=T.far=E.far=pe,(k!==O.near||z!==O.far)&&(i.updateRenderState({depthNear:O.near,depthFar:O.far}),k=O.near,z=O.far),O.layers.mask=j.layers.mask|6,E.layers.mask=O.layers.mask&3,T.layers.mask=O.layers.mask&5;const ce=j.parent,Se=O.cameras;oe(O,ce);for(let Ne=0;Ne<Se.length;Ne++)oe(Se[Ne],ce);Se.length===2?Q(O,E,T):O.projectionMatrix.copy(E.projectionMatrix),ge(j,O,ce)};function ge(j,te,pe){pe===null?j.matrix.copy(te.matrixWorld):(j.matrix.copy(pe.matrixWorld),j.matrix.invert(),j.matrix.multiply(te.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(te.projectionMatrix),j.projectionMatrixInverse.copy(te.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Eo*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(j){l=j,d!==null&&(d.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(O)},this.getCameraTexture=function(j){return p[j]};let Ue=null;function $e(j,te){if(h=te.getViewerPose(c||o),m=te,h!==null){const pe=h.views;f!==null&&(e.setRenderTargetFramebuffer(M,f.framebuffer),e.setRenderTarget(M));let ce=!1;pe.length!==O.cameras.length&&(O.cameras.length=0,ce=!0);for(let Be=0;Be<pe.length;Be++){const tt=pe[Be];let N=null;if(f!==null)N=f.getViewport(tt);else{const Pe=u.getViewSubImage(d,tt);N=Pe.viewport,Be===0&&(e.setRenderTargetTextures(M,Pe.colorTexture,Pe.depthStencilTexture),e.setRenderTarget(M))}let Ae=R[Be];Ae===void 0&&(Ae=new Zt,Ae.layers.enable(Be),Ae.viewport=new gt,R[Be]=Ae),Ae.matrix.fromArray(tt.transform.matrix),Ae.matrix.decompose(Ae.position,Ae.quaternion,Ae.scale),Ae.projectionMatrix.fromArray(tt.projectionMatrix),Ae.projectionMatrixInverse.copy(Ae.projectionMatrix).invert(),Ae.viewport.set(N.x,N.y,N.width,N.height),Be===0&&(O.matrix.copy(Ae.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),ce===!0&&O.cameras.push(Ae)}const Se=i.enabledFeatures;if(Se&&Se.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const Be=u.getDepthInformation(pe[0]);Be&&Be.isValid&&Be.texture&&g.init(Be,i.renderState)}if(Se&&Se.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let Be=0;Be<pe.length;Be++){const tt=pe[Be].camera;if(tt){let N=p[tt];N||(N=new Rl,p[tt]=N);const Ae=u.getCameraImage(tt);N.sourceTexture=Ae}}}}for(let pe=0;pe<b.length;pe++){const ce=S[pe],Se=b[pe];ce!==null&&Se!==void 0&&Se.update(ce,te,c||o)}Ue&&Ue(j,te),te.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:te}),m=null}const Ve=new Dl;Ve.setAnimationLoop($e),this.setAnimationLoop=function(j){Ue=j},this.dispose=function(){}}}const Xn=new un,dm=new xt;function fm(r,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,Ml(r)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function i(g,p,_,v,M){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),u(g,p)):p.isMeshPhongMaterial?(s(g,p),h(g,p)):p.isMeshStandardMaterial?(s(g,p),d(g,p),p.isMeshPhysicalMaterial&&f(g,p,M)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),x(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?l(g,p,_,v):p.isSpriteMaterial?c(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Gt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Gt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const _=e.get(p),v=_.envMap,M=_.envMapRotation;v&&(g.envMap.value=v,Xn.copy(M),Xn.x*=-1,Xn.y*=-1,Xn.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Xn.y*=-1,Xn.z*=-1),g.envMapRotation.value.setFromMatrix4(dm.makeRotationFromEuler(Xn)),g.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,_,v){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*_,g.scale.value=v*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function u(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function d(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,_){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Gt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=_.texture,g.transmissionSamplerSize.value.set(_.width,_.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function x(g,p){const _=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(_.matrixWorld),g.nearDistance.value=_.shadow.camera.near,g.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function pm(r,e,t,n){let i={},s={},o=[];const a=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,v){const M=v.program;n.uniformBlockBinding(_,M)}function c(_,v){let M=i[_.id];M===void 0&&(m(_),M=h(_),i[_.id]=M,_.addEventListener("dispose",g));const b=v.program;n.updateUBOMapping(_,b);const S=e.render.frame;s[_.id]!==S&&(d(_),s[_.id]=S)}function h(_){const v=u();_.__bindingPointIndex=v;const M=r.createBuffer(),b=_.__size,S=_.usage;return r.bindBuffer(r.UNIFORM_BUFFER,M),r.bufferData(r.UNIFORM_BUFFER,b,S),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,v,M),M}function u(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return At("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){const v=i[_.id],M=_.uniforms,b=_.__cache;r.bindBuffer(r.UNIFORM_BUFFER,v);for(let S=0,C=M.length;S<C;S++){const L=Array.isArray(M[S])?M[S]:[M[S]];for(let E=0,T=L.length;E<T;E++){const R=L[E];if(f(R,S,E,b)===!0){const O=R.__offset,k=Array.isArray(R.value)?R.value:[R.value];let z=0;for(let B=0;B<k.length;B++){const G=k[B],Z=x(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,r.bufferSubData(r.UNIFORM_BUFFER,O+z,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):(G.toArray(R.__data,z),z+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,O,R.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(_,v,M,b){const S=_.value,C=v+"_"+M;if(b[C]===void 0)return typeof S=="number"||typeof S=="boolean"?b[C]=S:b[C]=S.clone(),!0;{const L=b[C];if(typeof S=="number"||typeof S=="boolean"){if(L!==S)return b[C]=S,!0}else if(L.equals(S)===!1)return L.copy(S),!0}return!1}function m(_){const v=_.uniforms;let M=0;const b=16;for(let C=0,L=v.length;C<L;C++){const E=Array.isArray(v[C])?v[C]:[v[C]];for(let T=0,R=E.length;T<R;T++){const O=E[T],k=Array.isArray(O.value)?O.value:[O.value];for(let z=0,B=k.length;z<B;z++){const G=k[z],Z=x(G),V=M%b,J=V%Z.boundary,Q=V+J;M+=J,Q!==0&&b-Q<Z.storage&&(M+=b-Q),O.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=M,M+=Z.storage}}}const S=M%b;return S>0&&(M+=b-S),_.__size=M,_.__cache={},this}function x(_){const v={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(v.boundary=4,v.storage=4):_.isVector2?(v.boundary=8,v.storage=8):_.isVector3||_.isColor?(v.boundary=16,v.storage=12):_.isVector4?(v.boundary=16,v.storage=16):_.isMatrix3?(v.boundary=48,v.storage=48):_.isMatrix4?(v.boundary=64,v.storage=64):_.isTexture?je("WebGLRenderer: Texture samplers can not be part of an uniforms group."):je("WebGLRenderer: Unsupported uniform value type.",_),v}function g(_){const v=_.target;v.removeEventListener("dispose",g);const M=o.indexOf(v.__bindingPointIndex);o.splice(M,1),r.deleteBuffer(i[v.id]),delete i[v.id],delete s[v.id]}function p(){for(const _ in i)r.deleteBuffer(i[_]);o=[],i={},s={}}return{bind:l,update:c,dispose:p}}const mm=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let Sn=null;function gm(){return Sn===null&&(Sn=new hh(mm,32,32,No,Ci),Sn.minFilter=nn,Sn.magFilter=nn,Sn.wrapS=It,Sn.wrapT=It,Sn.generateMipmaps=!1,Sn.needsUpdate=!0),Sn}class xm{constructor(e={}){const{canvas:t=Fc(),context:n=null,depth:i=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const m=new Set([Uo,Fo,Oo]),x=new Set([mn,Un,Yi,$i,Do,Lo]),g=new Uint32Array(4),p=new Int32Array(4);let _=null,v=null;const M=[],b=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Nn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const S=this;let C=!1;this._outputColorSpace=tn;let L=0,E=0,T=null,R=-1,O=null;const k=new gt,z=new gt;let B=null;const G=new Le(0);let Z=0,V=t.width,J=t.height,Q=1,oe=null,ge=null;const Ue=new gt(0,0,V,J),$e=new gt(0,0,V,J);let Ve=!1;const j=new ns;let te=!1,pe=!1;const ce=new xt,Se=new I,Ne=new gt,at={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Be=!1;function tt(){return T===null?Q:1}let N=n;function Ae(w,W){return t.getContext(w,W)}try{const w={alpha:!0,depth:i,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ro}`),t.addEventListener("webglcontextlost",ae,!1),t.addEventListener("webglcontextrestored",ie,!1),t.addEventListener("webglcontextcreationerror",Ce,!1),N===null){const W="webgl2";if(N=Ae(W,w),N===null)throw Ae(W)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(w){throw w("WebGLRenderer: "+w.message),w}let Pe,Ge,ue,Ee,ne,ve,D,A,H,ee,se,K,De,me,Fe,Ie,re,le,qe,He,Te,Ye,U,ye;function de(){Pe=new Mf(N),Pe.init(),Ye=new am(N,Pe),Ge=new gf(N,Pe,e,Ye),ue=new rm(N,Pe),Ge.reversedDepthBuffer&&d&&ue.buffers.depth.setReversed(!0),Ee=new wf(N),ne=new Xp,ve=new om(N,Pe,ue,ne,Ge,Ye,Ee),D=new vf(S),A=new Ef(S),H=new Ph(N),U=new pf(N,H),ee=new Af(N,H,Ee,U),se=new If(N,ee,H,Ee),qe=new Rf(N,Ge,ve),Ie=new xf(ne),K=new qp(S,D,A,Pe,Ge,U,Ie),De=new fm(S,ne),me=new $p,Fe=new em(Pe),le=new ff(S,D,A,ue,se,f,l),re=new im(S,se,Ge),ye=new pm(N,Ee,Ge,ue),He=new mf(N,Pe,Ee),Te=new Cf(N,Pe,Ee),Ee.programs=K.programs,S.capabilities=Ge,S.extensions=Pe,S.properties=ne,S.renderLists=me,S.shadowMap=re,S.state=ue,S.info=Ee}de();const fe=new um(S,N);this.xr=fe,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){const w=Pe.get("WEBGL_lose_context");w&&w.loseContext()},this.forceContextRestore=function(){const w=Pe.get("WEBGL_lose_context");w&&w.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(w){w!==void 0&&(Q=w,this.setSize(V,J,!1))},this.getSize=function(w){return w.set(V,J)},this.setSize=function(w,W,Y=!0){if(fe.isPresenting){je("WebGLRenderer: Can't change size while VR device is presenting.");return}V=w,J=W,t.width=Math.floor(w*Q),t.height=Math.floor(W*Q),Y===!0&&(t.style.width=w+"px",t.style.height=W+"px"),this.setViewport(0,0,w,W)},this.getDrawingBufferSize=function(w){return w.set(V*Q,J*Q).floor()},this.setDrawingBufferSize=function(w,W,Y){V=w,J=W,Q=Y,t.width=Math.floor(w*Y),t.height=Math.floor(W*Y),this.setViewport(0,0,w,W)},this.getCurrentViewport=function(w){return w.copy(k)},this.getViewport=function(w){return w.copy(Ue)},this.setViewport=function(w,W,Y,$){w.isVector4?Ue.set(w.x,w.y,w.z,w.w):Ue.set(w,W,Y,$),ue.viewport(k.copy(Ue).multiplyScalar(Q).round())},this.getScissor=function(w){return w.copy($e)},this.setScissor=function(w,W,Y,$){w.isVector4?$e.set(w.x,w.y,w.z,w.w):$e.set(w,W,Y,$),ue.scissor(z.copy($e).multiplyScalar(Q).round())},this.getScissorTest=function(){return Ve},this.setScissorTest=function(w){ue.setScissorTest(Ve=w)},this.setOpaqueSort=function(w){oe=w},this.setTransparentSort=function(w){ge=w},this.getClearColor=function(w){return w.copy(le.getClearColor())},this.setClearColor=function(){le.setClearColor(...arguments)},this.getClearAlpha=function(){return le.getClearAlpha()},this.setClearAlpha=function(){le.setClearAlpha(...arguments)},this.clear=function(w=!0,W=!0,Y=!0){let $=0;if(w){let X=!1;if(T!==null){const he=T.texture.format;X=m.has(he)}if(X){const he=T.texture.type,be=x.has(he),we=le.getClearColor(),Me=le.getClearAlpha(),We=we.r,Xe=we.g,ke=we.b;be?(g[0]=We,g[1]=Xe,g[2]=ke,g[3]=Me,N.clearBufferuiv(N.COLOR,0,g)):(p[0]=We,p[1]=Xe,p[2]=ke,p[3]=Me,N.clearBufferiv(N.COLOR,0,p))}else $|=N.COLOR_BUFFER_BIT}W&&($|=N.DEPTH_BUFFER_BIT),Y&&($|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),N.clear($)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ae,!1),t.removeEventListener("webglcontextrestored",ie,!1),t.removeEventListener("webglcontextcreationerror",Ce,!1),le.dispose(),me.dispose(),Fe.dispose(),ne.dispose(),D.dispose(),A.dispose(),se.dispose(),U.dispose(),ye.dispose(),K.dispose(),fe.dispose(),fe.removeEventListener("sessionstart",Vo),fe.removeEventListener("sessionend",qo),Gn.stop()};function ae(w){w.preventDefault(),sa("WebGLRenderer: Context Lost."),C=!0}function ie(){sa("WebGLRenderer: Context Restored."),C=!1;const w=Ee.autoReset,W=re.enabled,Y=re.autoUpdate,$=re.needsUpdate,X=re.type;de(),Ee.autoReset=w,re.enabled=W,re.autoUpdate=Y,re.needsUpdate=$,re.type=X}function Ce(w){At("WebGLRenderer: A WebGL context could not be created. Reason: ",w.statusMessage)}function Ke(w){const W=w.target;W.removeEventListener("dispose",Ke),_t(W)}function _t(w){dt(w),ne.remove(w)}function dt(w){const W=ne.get(w).programs;W!==void 0&&(W.forEach(function(Y){K.releaseProgram(Y)}),w.isShaderMaterial&&K.releaseShaderCache(w))}this.renderBufferDirect=function(w,W,Y,$,X,he){W===null&&(W=at);const be=X.isMesh&&X.matrixWorld.determinant()<0,we=Hl(w,W,Y,$,X);ue.setMaterial($,be);let Me=Y.index,We=1;if($.wireframe===!0){if(Me=ee.getWireframeAttribute(Y),Me===void 0)return;We=2}const Xe=Y.drawRange,ke=Y.attributes.position;let st=Xe.start*We,ft=(Xe.start+Xe.count)*We;he!==null&&(st=Math.max(st,he.start*We),ft=Math.min(ft,(he.start+he.count)*We)),Me!==null?(st=Math.max(st,0),ft=Math.min(ft,Me.count)):ke!=null&&(st=Math.max(st,0),ft=Math.min(ft,ke.count));const Et=ft-st;if(Et<0||Et===1/0)return;U.setup(X,$,we,Y,Me);let Mt,vt=He;if(Me!==null&&(Mt=H.get(Me),vt=Te,vt.setIndex(Mt)),X.isMesh)$.wireframe===!0?(ue.setLineWidth($.wireframeLinewidth*tt()),vt.setMode(N.LINES)):vt.setMode(N.TRIANGLES);else if(X.isLine){let ze=$.linewidth;ze===void 0&&(ze=1),ue.setLineWidth(ze*tt()),X.isLineSegments?vt.setMode(N.LINES):X.isLineLoop?vt.setMode(N.LINE_LOOP):vt.setMode(N.LINE_STRIP)}else X.isPoints?vt.setMode(N.POINTS):X.isSprite&&vt.setMode(N.TRIANGLES);if(X.isBatchedMesh)if(X._multiDrawInstances!==null)Ji("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),vt.renderMultiDrawInstances(X._multiDrawStarts,X._multiDrawCounts,X._multiDrawCount,X._multiDrawInstances);else if(Pe.get("WEBGL_multi_draw"))vt.renderMultiDraw(X._multiDrawStarts,X._multiDrawCounts,X._multiDrawCount);else{const ze=X._multiDrawStarts,bt=X._multiDrawCounts,ct=X._multiDrawCount,$t=Me?H.get(Me).bytesPerElement:1,ti=ne.get($).currentProgram.getUniforms();for(let Kt=0;Kt<ct;Kt++)ti.setValue(N,"_gl_DrawID",Kt),vt.render(ze[Kt]/$t,bt[Kt])}else if(X.isInstancedMesh)vt.renderInstances(st,Et,X.count);else if(Y.isInstancedBufferGeometry){const ze=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,bt=Math.min(Y.instanceCount,ze);vt.renderInstances(st,Et,bt)}else vt.render(st,Et)};function dn(w,W,Y){w.transparent===!0&&w.side===Xt&&w.forceSinglePass===!1?(w.side=Gt,w.needsUpdate=!0,ss(w,W,Y),w.side=Fn,w.needsUpdate=!0,ss(w,W,Y),w.side=Xt):ss(w,W,Y)}this.compile=function(w,W,Y=null){Y===null&&(Y=w),v=Fe.get(Y),v.init(W),b.push(v),Y.traverseVisible(function(X){X.isLight&&X.layers.test(W.layers)&&(v.pushLight(X),X.castShadow&&v.pushShadow(X))}),w!==Y&&w.traverseVisible(function(X){X.isLight&&X.layers.test(W.layers)&&(v.pushLight(X),X.castShadow&&v.pushShadow(X))}),v.setupLights();const $=new Set;return w.traverse(function(X){if(!(X.isMesh||X.isPoints||X.isLine||X.isSprite))return;const he=X.material;if(he)if(Array.isArray(he))for(let be=0;be<he.length;be++){const we=he[be];dn(we,Y,X),$.add(we)}else dn(he,Y,X),$.add(he)}),v=b.pop(),$},this.compileAsync=function(w,W,Y=null){const $=this.compile(w,W,Y);return new Promise(X=>{function he(){if($.forEach(function(be){ne.get(be).currentProgram.isReady()&&$.delete(be)}),$.size===0){X(w);return}setTimeout(he,10)}Pe.get("KHR_parallel_shader_compile")!==null?he():setTimeout(he,10)})};let rn=null;function zl(w){rn&&rn(w)}function Vo(){Gn.stop()}function qo(){Gn.start()}const Gn=new Dl;Gn.setAnimationLoop(zl),typeof self<"u"&&Gn.setContext(self),this.setAnimationLoop=function(w){rn=w,fe.setAnimationLoop(w),w===null?Gn.stop():Gn.start()},fe.addEventListener("sessionstart",Vo),fe.addEventListener("sessionend",qo),this.render=function(w,W){if(W!==void 0&&W.isCamera!==!0){At("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;if(w.matrixWorldAutoUpdate===!0&&w.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),fe.enabled===!0&&fe.isPresenting===!0&&(fe.cameraAutoUpdate===!0&&fe.updateCamera(W),W=fe.getCamera()),w.isScene===!0&&w.onBeforeRender(S,w,W,T),v=Fe.get(w,b.length),v.init(W),b.push(v),ce.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),j.setFromProjectionMatrix(ce,pn,W.reversedDepth),pe=this.localClippingEnabled,te=Ie.init(this.clippingPlanes,pe),_=me.get(w,M.length),_.init(),M.push(_),fe.enabled===!0&&fe.isPresenting===!0){const he=S.xr.getDepthSensingMesh();he!==null&&Zs(he,W,-1/0,S.sortObjects)}Zs(w,W,0,S.sortObjects),_.finish(),S.sortObjects===!0&&_.sort(oe,ge),Be=fe.enabled===!1||fe.isPresenting===!1||fe.hasDepthSensing()===!1,Be&&le.addToRenderList(_,w),this.info.render.frame++,te===!0&&Ie.beginShadows();const Y=v.state.shadowsArray;re.render(Y,w,W),te===!0&&Ie.endShadows(),this.info.autoReset===!0&&this.info.reset();const $=_.opaque,X=_.transmissive;if(v.setupLights(),W.isArrayCamera){const he=W.cameras;if(X.length>0)for(let be=0,we=he.length;be<we;be++){const Me=he[be];Yo($,X,w,Me)}Be&&le.render(w);for(let be=0,we=he.length;be<we;be++){const Me=he[be];Xo(_,w,Me,Me.viewport)}}else X.length>0&&Yo($,X,w,W),Be&&le.render(w),Xo(_,w,W);T!==null&&E===0&&(ve.updateMultisampleRenderTarget(T),ve.updateRenderTargetMipmap(T)),w.isScene===!0&&w.onAfterRender(S,w,W),U.resetDefaultState(),R=-1,O=null,b.pop(),b.length>0?(v=b[b.length-1],te===!0&&Ie.setGlobalState(S.clippingPlanes,v.state.camera)):v=null,M.pop(),M.length>0?_=M[M.length-1]:_=null};function Zs(w,W,Y,$){if(w.visible===!1)return;if(w.layers.test(W.layers)){if(w.isGroup)Y=w.renderOrder;else if(w.isLOD)w.autoUpdate===!0&&w.update(W);else if(w.isLight)v.pushLight(w),w.castShadow&&v.pushShadow(w);else if(w.isSprite){if(!w.frustumCulled||j.intersectsSprite(w)){$&&Ne.setFromMatrixPosition(w.matrixWorld).applyMatrix4(ce);const be=se.update(w),we=w.material;we.visible&&_.push(w,be,we,Y,Ne.z,null)}}else if((w.isMesh||w.isLine||w.isPoints)&&(!w.frustumCulled||j.intersectsObject(w))){const be=se.update(w),we=w.material;if($&&(w.boundingSphere!==void 0?(w.boundingSphere===null&&w.computeBoundingSphere(),Ne.copy(w.boundingSphere.center)):(be.boundingSphere===null&&be.computeBoundingSphere(),Ne.copy(be.boundingSphere.center)),Ne.applyMatrix4(w.matrixWorld).applyMatrix4(ce)),Array.isArray(we)){const Me=be.groups;for(let We=0,Xe=Me.length;We<Xe;We++){const ke=Me[We],st=we[ke.materialIndex];st&&st.visible&&_.push(w,be,st,Y,Ne.z,ke)}}else we.visible&&_.push(w,be,we,Y,Ne.z,null)}}const he=w.children;for(let be=0,we=he.length;be<we;be++)Zs(he[be],W,Y,$)}function Xo(w,W,Y,$){const{opaque:X,transmissive:he,transparent:be}=w;v.setupLightsView(Y),te===!0&&Ie.setGlobalState(S.clippingPlanes,Y),$&&ue.viewport(k.copy($)),X.length>0&&is(X,W,Y),he.length>0&&is(he,W,Y),be.length>0&&is(be,W,Y),ue.buffers.depth.setTest(!0),ue.buffers.depth.setMask(!0),ue.buffers.color.setMask(!0),ue.setPolygonOffset(!1)}function Yo(w,W,Y,$){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;v.state.transmissionRenderTarget[$.id]===void 0&&(v.state.transmissionRenderTarget[$.id]=new kn(1,1,{generateMipmaps:!0,type:Pe.has("EXT_color_buffer_half_float")||Pe.has("EXT_color_buffer_float")?Ci:mn,minFilter:Zn,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ht.workingColorSpace}));const he=v.state.transmissionRenderTarget[$.id],be=$.viewport||k;he.setSize(be.z*S.transmissionResolutionScale,be.w*S.transmissionResolutionScale);const we=S.getRenderTarget(),Me=S.getActiveCubeFace(),We=S.getActiveMipmapLevel();S.setRenderTarget(he),S.getClearColor(G),Z=S.getClearAlpha(),Z<1&&S.setClearColor(16777215,.5),S.clear(),Be&&le.render(Y);const Xe=S.toneMapping;S.toneMapping=Nn;const ke=$.viewport;if($.viewport!==void 0&&($.viewport=void 0),v.setupLightsView($),te===!0&&Ie.setGlobalState(S.clippingPlanes,$),is(w,Y,$),ve.updateMultisampleRenderTarget(he),ve.updateRenderTargetMipmap(he),Pe.has("WEBGL_multisampled_render_to_texture")===!1){let st=!1;for(let ft=0,Et=W.length;ft<Et;ft++){const Mt=W[ft],{object:vt,geometry:ze,material:bt,group:ct}=Mt;if(bt.side===Xt&&vt.layers.test($.layers)){const $t=bt.side;bt.side=Gt,bt.needsUpdate=!0,$o(vt,Y,$,ze,bt,ct),bt.side=$t,bt.needsUpdate=!0,st=!0}}st===!0&&(ve.updateMultisampleRenderTarget(he),ve.updateRenderTargetMipmap(he))}S.setRenderTarget(we,Me,We),S.setClearColor(G,Z),ke!==void 0&&($.viewport=ke),S.toneMapping=Xe}function is(w,W,Y){const $=W.isScene===!0?W.overrideMaterial:null;for(let X=0,he=w.length;X<he;X++){const be=w[X],{object:we,geometry:Me,group:We}=be;let Xe=be.material;Xe.allowOverride===!0&&$!==null&&(Xe=$),we.layers.test(Y.layers)&&$o(we,W,Y,Me,Xe,We)}}function $o(w,W,Y,$,X,he){w.onBeforeRender(S,W,Y,$,X,he),w.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,w.matrixWorld),w.normalMatrix.getNormalMatrix(w.modelViewMatrix),X.onBeforeRender(S,W,Y,$,w,he),X.transparent===!0&&X.side===Xt&&X.forceSinglePass===!1?(X.side=Gt,X.needsUpdate=!0,S.renderBufferDirect(Y,W,$,X,w,he),X.side=Fn,X.needsUpdate=!0,S.renderBufferDirect(Y,W,$,X,w,he),X.side=Xt):S.renderBufferDirect(Y,W,$,X,w,he),w.onAfterRender(S,W,Y,$,X,he)}function ss(w,W,Y){W.isScene!==!0&&(W=at);const $=ne.get(w),X=v.state.lights,he=v.state.shadowsArray,be=X.state.version,we=K.getParameters(w,X.state,he,W,Y),Me=K.getProgramCacheKey(we);let We=$.programs;$.environment=w.isMeshStandardMaterial?W.environment:null,$.fog=W.fog,$.envMap=(w.isMeshStandardMaterial?A:D).get(w.envMap||$.environment),$.envMapRotation=$.environment!==null&&w.envMap===null?W.environmentRotation:w.envMapRotation,We===void 0&&(w.addEventListener("dispose",Ke),We=new Map,$.programs=We);let Xe=We.get(Me);if(Xe!==void 0){if($.currentProgram===Xe&&$.lightsStateVersion===be)return jo(w,we),Xe}else we.uniforms=K.getUniforms(w),w.onBeforeCompile(we,S),Xe=K.acquireProgram(we,Me),We.set(Me,Xe),$.uniforms=we.uniforms;const ke=$.uniforms;return(!w.isShaderMaterial&&!w.isRawShaderMaterial||w.clipping===!0)&&(ke.clippingPlanes=Ie.uniform),jo(w,we),$.needsLights=Vl(w),$.lightsStateVersion=be,$.needsLights&&(ke.ambientLightColor.value=X.state.ambient,ke.lightProbe.value=X.state.probe,ke.directionalLights.value=X.state.directional,ke.directionalLightShadows.value=X.state.directionalShadow,ke.spotLights.value=X.state.spot,ke.spotLightShadows.value=X.state.spotShadow,ke.rectAreaLights.value=X.state.rectArea,ke.ltc_1.value=X.state.rectAreaLTC1,ke.ltc_2.value=X.state.rectAreaLTC2,ke.pointLights.value=X.state.point,ke.pointLightShadows.value=X.state.pointShadow,ke.hemisphereLights.value=X.state.hemi,ke.directionalShadowMap.value=X.state.directionalShadowMap,ke.directionalShadowMatrix.value=X.state.directionalShadowMatrix,ke.spotShadowMap.value=X.state.spotShadowMap,ke.spotLightMatrix.value=X.state.spotLightMatrix,ke.spotLightMap.value=X.state.spotLightMap,ke.pointShadowMap.value=X.state.pointShadowMap,ke.pointShadowMatrix.value=X.state.pointShadowMatrix),$.currentProgram=Xe,$.uniformsList=null,Xe}function Ko(w){if(w.uniformsList===null){const W=w.currentProgram.getUniforms();w.uniformsList=Fs.seqWithValue(W.seq,w.uniforms)}return w.uniformsList}function jo(w,W){const Y=ne.get(w);Y.outputColorSpace=W.outputColorSpace,Y.batching=W.batching,Y.batchingColor=W.batchingColor,Y.instancing=W.instancing,Y.instancingColor=W.instancingColor,Y.instancingMorph=W.instancingMorph,Y.skinning=W.skinning,Y.morphTargets=W.morphTargets,Y.morphNormals=W.morphNormals,Y.morphColors=W.morphColors,Y.morphTargetsCount=W.morphTargetsCount,Y.numClippingPlanes=W.numClippingPlanes,Y.numIntersection=W.numClipIntersection,Y.vertexAlphas=W.vertexAlphas,Y.vertexTangents=W.vertexTangents,Y.toneMapping=W.toneMapping}function Hl(w,W,Y,$,X){W.isScene!==!0&&(W=at),ve.resetTextureUnits();const he=W.fog,be=$.isMeshStandardMaterial?W.environment:null,we=T===null?S.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:Ti,Me=($.isMeshStandardMaterial?A:D).get($.envMap||be),We=$.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,Xe=!!Y.attributes.tangent&&(!!$.normalMap||$.anisotropy>0),ke=!!Y.morphAttributes.position,st=!!Y.morphAttributes.normal,ft=!!Y.morphAttributes.color;let Et=Nn;$.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(Et=S.toneMapping);const Mt=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,vt=Mt!==void 0?Mt.length:0,ze=ne.get($),bt=v.state.lights;if(te===!0&&(pe===!0||w!==O)){const zt=w===O&&$.id===R;Ie.setState($,w,zt)}let ct=!1;$.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==bt.state.version||ze.outputColorSpace!==we||X.isBatchedMesh&&ze.batching===!1||!X.isBatchedMesh&&ze.batching===!0||X.isBatchedMesh&&ze.batchingColor===!0&&X.colorTexture===null||X.isBatchedMesh&&ze.batchingColor===!1&&X.colorTexture!==null||X.isInstancedMesh&&ze.instancing===!1||!X.isInstancedMesh&&ze.instancing===!0||X.isSkinnedMesh&&ze.skinning===!1||!X.isSkinnedMesh&&ze.skinning===!0||X.isInstancedMesh&&ze.instancingColor===!0&&X.instanceColor===null||X.isInstancedMesh&&ze.instancingColor===!1&&X.instanceColor!==null||X.isInstancedMesh&&ze.instancingMorph===!0&&X.morphTexture===null||X.isInstancedMesh&&ze.instancingMorph===!1&&X.morphTexture!==null||ze.envMap!==Me||$.fog===!0&&ze.fog!==he||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==Ie.numPlanes||ze.numIntersection!==Ie.numIntersection)||ze.vertexAlphas!==We||ze.vertexTangents!==Xe||ze.morphTargets!==ke||ze.morphNormals!==st||ze.morphColors!==ft||ze.toneMapping!==Et||ze.morphTargetsCount!==vt)&&(ct=!0):(ct=!0,ze.__version=$.version);let $t=ze.currentProgram;ct===!0&&($t=ss($,W,X));let ti=!1,Kt=!1,Di=!1;const Tt=$t.getUniforms(),Wt=ze.uniforms;if(ue.useProgram($t.program)&&(ti=!0,Kt=!0,Di=!0),$.id!==R&&(R=$.id,Kt=!0),ti||O!==w){ue.buffers.depth.getReversed()&&w.reversedDepth!==!0&&(w._reversedDepth=!0,w.updateProjectionMatrix()),Tt.setValue(N,"projectionMatrix",w.projectionMatrix),Tt.setValue(N,"viewMatrix",w.matrixWorldInverse);const Vt=Tt.map.cameraPosition;Vt!==void 0&&Vt.setValue(N,Se.setFromMatrixPosition(w.matrixWorld)),Ge.logarithmicDepthBuffer&&Tt.setValue(N,"logDepthBufFC",2/(Math.log(w.far+1)/Math.LN2)),($.isMeshPhongMaterial||$.isMeshToonMaterial||$.isMeshLambertMaterial||$.isMeshBasicMaterial||$.isMeshStandardMaterial||$.isShaderMaterial)&&Tt.setValue(N,"isOrthographic",w.isOrthographicCamera===!0),O!==w&&(O=w,Kt=!0,Di=!0)}if(X.isSkinnedMesh){Tt.setOptional(N,X,"bindMatrix"),Tt.setOptional(N,X,"bindMatrixInverse");const zt=X.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),Tt.setValue(N,"boneTexture",zt.boneTexture,ve))}X.isBatchedMesh&&(Tt.setOptional(N,X,"batchingTexture"),Tt.setValue(N,"batchingTexture",X._matricesTexture,ve),Tt.setOptional(N,X,"batchingIdTexture"),Tt.setValue(N,"batchingIdTexture",X._indirectTexture,ve),Tt.setOptional(N,X,"batchingColorTexture"),X._colorsTexture!==null&&Tt.setValue(N,"batchingColorTexture",X._colorsTexture,ve));const Qt=Y.morphAttributes;if((Qt.position!==void 0||Qt.normal!==void 0||Qt.color!==void 0)&&qe.update(X,Y,$t),(Kt||ze.receiveShadow!==X.receiveShadow)&&(ze.receiveShadow=X.receiveShadow,Tt.setValue(N,"receiveShadow",X.receiveShadow)),$.isMeshGouraudMaterial&&$.envMap!==null&&(Wt.envMap.value=Me,Wt.flipEnvMap.value=Me.isCubeTexture&&Me.isRenderTargetTexture===!1?-1:1),$.isMeshStandardMaterial&&$.envMap===null&&W.environment!==null&&(Wt.envMapIntensity.value=W.environmentIntensity),Wt.dfgLUT!==void 0&&(Wt.dfgLUT.value=gm()),Kt&&(Tt.setValue(N,"toneMappingExposure",S.toneMappingExposure),ze.needsLights&&Wl(Wt,Di),he&&$.fog===!0&&De.refreshFogUniforms(Wt,he),De.refreshMaterialUniforms(Wt,$,Q,J,v.state.transmissionRenderTarget[w.id]),Fs.upload(N,Ko(ze),Wt,ve)),$.isShaderMaterial&&$.uniformsNeedUpdate===!0&&(Fs.upload(N,Ko(ze),Wt,ve),$.uniformsNeedUpdate=!1),$.isSpriteMaterial&&Tt.setValue(N,"center",X.center),Tt.setValue(N,"modelViewMatrix",X.modelViewMatrix),Tt.setValue(N,"normalMatrix",X.normalMatrix),Tt.setValue(N,"modelMatrix",X.matrixWorld),$.isShaderMaterial||$.isRawShaderMaterial){const zt=$.uniformsGroups;for(let Vt=0,Qs=zt.length;Vt<Qs;Vt++){const Bn=zt[Vt];ye.update(Bn,$t),ye.bind(Bn,$t)}}return $t}function Wl(w,W){w.ambientLightColor.needsUpdate=W,w.lightProbe.needsUpdate=W,w.directionalLights.needsUpdate=W,w.directionalLightShadows.needsUpdate=W,w.pointLights.needsUpdate=W,w.pointLightShadows.needsUpdate=W,w.spotLights.needsUpdate=W,w.spotLightShadows.needsUpdate=W,w.rectAreaLights.needsUpdate=W,w.hemisphereLights.needsUpdate=W}function Vl(w){return w.isMeshLambertMaterial||w.isMeshToonMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isShadowMaterial||w.isShaderMaterial&&w.lights===!0}this.getActiveCubeFace=function(){return L},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(w,W,Y){const $=ne.get(w);$.__autoAllocateDepthBuffer=w.resolveDepthBuffer===!1,$.__autoAllocateDepthBuffer===!1&&($.__useRenderToTexture=!1),ne.get(w.texture).__webglTexture=W,ne.get(w.depthTexture).__webglTexture=$.__autoAllocateDepthBuffer?void 0:Y,$.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(w,W){const Y=ne.get(w);Y.__webglFramebuffer=W,Y.__useDefaultFramebuffer=W===void 0};const ql=N.createFramebuffer();this.setRenderTarget=function(w,W=0,Y=0){T=w,L=W,E=Y;let $=!0,X=null,he=!1,be=!1;if(w){const Me=ne.get(w);if(Me.__useDefaultFramebuffer!==void 0)ue.bindFramebuffer(N.FRAMEBUFFER,null),$=!1;else if(Me.__webglFramebuffer===void 0)ve.setupRenderTarget(w);else if(Me.__hasExternalTextures)ve.rebindTextures(w,ne.get(w.texture).__webglTexture,ne.get(w.depthTexture).__webglTexture);else if(w.depthBuffer){const ke=w.depthTexture;if(Me.__boundDepthTexture!==ke){if(ke!==null&&ne.has(ke)&&(w.width!==ke.image.width||w.height!==ke.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");ve.setupDepthRenderbuffer(w)}}const We=w.texture;(We.isData3DTexture||We.isDataArrayTexture||We.isCompressedArrayTexture)&&(be=!0);const Xe=ne.get(w).__webglFramebuffer;w.isWebGLCubeRenderTarget?(Array.isArray(Xe[W])?X=Xe[W][Y]:X=Xe[W],he=!0):w.samples>0&&ve.useMultisampledRTT(w)===!1?X=ne.get(w).__webglMultisampledFramebuffer:Array.isArray(Xe)?X=Xe[Y]:X=Xe,k.copy(w.viewport),z.copy(w.scissor),B=w.scissorTest}else k.copy(Ue).multiplyScalar(Q).floor(),z.copy($e).multiplyScalar(Q).floor(),B=Ve;if(Y!==0&&(X=ql),ue.bindFramebuffer(N.FRAMEBUFFER,X)&&$&&ue.drawBuffers(w,X),ue.viewport(k),ue.scissor(z),ue.setScissorTest(B),he){const Me=ne.get(w.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+W,Me.__webglTexture,Y)}else if(be){const Me=W;for(let We=0;We<w.textures.length;We++){const Xe=ne.get(w.textures[We]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+We,Xe.__webglTexture,Y,Me)}}else if(w!==null&&Y!==0){const Me=ne.get(w.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Me.__webglTexture,Y)}R=-1},this.readRenderTargetPixels=function(w,W,Y,$,X,he,be,we=0){if(!(w&&w.isWebGLRenderTarget)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Me=ne.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&be!==void 0&&(Me=Me[be]),Me){ue.bindFramebuffer(N.FRAMEBUFFER,Me);try{const We=w.textures[we],Xe=We.format,ke=We.type;if(!Ge.textureFormatReadable(Xe)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ge.textureTypeReadable(ke)){At("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=w.width-$&&Y>=0&&Y<=w.height-X&&(w.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+we),N.readPixels(W,Y,$,X,Ye.convert(Xe),Ye.convert(ke),he))}finally{const We=T!==null?ne.get(T).__webglFramebuffer:null;ue.bindFramebuffer(N.FRAMEBUFFER,We)}}},this.readRenderTargetPixelsAsync=async function(w,W,Y,$,X,he,be,we=0){if(!(w&&w.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Me=ne.get(w).__webglFramebuffer;if(w.isWebGLCubeRenderTarget&&be!==void 0&&(Me=Me[be]),Me)if(W>=0&&W<=w.width-$&&Y>=0&&Y<=w.height-X){ue.bindFramebuffer(N.FRAMEBUFFER,Me);const We=w.textures[we],Xe=We.format,ke=We.type;if(!Ge.textureFormatReadable(Xe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ge.textureTypeReadable(ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const st=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,st),N.bufferData(N.PIXEL_PACK_BUFFER,he.byteLength,N.STREAM_READ),w.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+we),N.readPixels(W,Y,$,X,Ye.convert(Xe),Ye.convert(ke),0);const ft=T!==null?ne.get(T).__webglFramebuffer:null;ue.bindFramebuffer(N.FRAMEBUFFER,ft);const Et=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Uc(N,Et,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,st),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,he),N.deleteBuffer(st),N.deleteSync(Et),he}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(w,W=null,Y=0){const $=Math.pow(2,-Y),X=Math.floor(w.image.width*$),he=Math.floor(w.image.height*$),be=W!==null?W.x:0,we=W!==null?W.y:0;ve.setTexture2D(w,0),N.copyTexSubImage2D(N.TEXTURE_2D,Y,0,0,be,we,X,he),ue.unbindTexture()};const Xl=N.createFramebuffer(),Yl=N.createFramebuffer();this.copyTextureToTexture=function(w,W,Y=null,$=null,X=0,he=null){he===null&&(X!==0?(Ji("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),he=X,X=0):he=0);let be,we,Me,We,Xe,ke,st,ft,Et;const Mt=w.isCompressedTexture?w.mipmaps[he]:w.image;if(Y!==null)be=Y.max.x-Y.min.x,we=Y.max.y-Y.min.y,Me=Y.isBox3?Y.max.z-Y.min.z:1,We=Y.min.x,Xe=Y.min.y,ke=Y.isBox3?Y.min.z:0;else{const Qt=Math.pow(2,-X);be=Math.floor(Mt.width*Qt),we=Math.floor(Mt.height*Qt),w.isDataArrayTexture?Me=Mt.depth:w.isData3DTexture?Me=Math.floor(Mt.depth*Qt):Me=1,We=0,Xe=0,ke=0}$!==null?(st=$.x,ft=$.y,Et=$.z):(st=0,ft=0,Et=0);const vt=Ye.convert(W.format),ze=Ye.convert(W.type);let bt;W.isData3DTexture?(ve.setTexture3D(W,0),bt=N.TEXTURE_3D):W.isDataArrayTexture||W.isCompressedArrayTexture?(ve.setTexture2DArray(W,0),bt=N.TEXTURE_2D_ARRAY):(ve.setTexture2D(W,0),bt=N.TEXTURE_2D),N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,W.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,W.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,W.unpackAlignment);const ct=N.getParameter(N.UNPACK_ROW_LENGTH),$t=N.getParameter(N.UNPACK_IMAGE_HEIGHT),ti=N.getParameter(N.UNPACK_SKIP_PIXELS),Kt=N.getParameter(N.UNPACK_SKIP_ROWS),Di=N.getParameter(N.UNPACK_SKIP_IMAGES);N.pixelStorei(N.UNPACK_ROW_LENGTH,Mt.width),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Mt.height),N.pixelStorei(N.UNPACK_SKIP_PIXELS,We),N.pixelStorei(N.UNPACK_SKIP_ROWS,Xe),N.pixelStorei(N.UNPACK_SKIP_IMAGES,ke);const Tt=w.isDataArrayTexture||w.isData3DTexture,Wt=W.isDataArrayTexture||W.isData3DTexture;if(w.isDepthTexture){const Qt=ne.get(w),zt=ne.get(W),Vt=ne.get(Qt.__renderTarget),Qs=ne.get(zt.__renderTarget);ue.bindFramebuffer(N.READ_FRAMEBUFFER,Vt.__webglFramebuffer),ue.bindFramebuffer(N.DRAW_FRAMEBUFFER,Qs.__webglFramebuffer);for(let Bn=0;Bn<Me;Bn++)Tt&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ne.get(w).__webglTexture,X,ke+Bn),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ne.get(W).__webglTexture,he,Et+Bn)),N.blitFramebuffer(We,Xe,be,we,st,ft,be,we,N.DEPTH_BUFFER_BIT,N.NEAREST);ue.bindFramebuffer(N.READ_FRAMEBUFFER,null),ue.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(X!==0||w.isRenderTargetTexture||ne.has(w)){const Qt=ne.get(w),zt=ne.get(W);ue.bindFramebuffer(N.READ_FRAMEBUFFER,Xl),ue.bindFramebuffer(N.DRAW_FRAMEBUFFER,Yl);for(let Vt=0;Vt<Me;Vt++)Tt?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Qt.__webglTexture,X,ke+Vt):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Qt.__webglTexture,X),Wt?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,zt.__webglTexture,he,Et+Vt):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,zt.__webglTexture,he),X!==0?N.blitFramebuffer(We,Xe,be,we,st,ft,be,we,N.COLOR_BUFFER_BIT,N.NEAREST):Wt?N.copyTexSubImage3D(bt,he,st,ft,Et+Vt,We,Xe,be,we):N.copyTexSubImage2D(bt,he,st,ft,We,Xe,be,we);ue.bindFramebuffer(N.READ_FRAMEBUFFER,null),ue.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else Wt?w.isDataTexture||w.isData3DTexture?N.texSubImage3D(bt,he,st,ft,Et,be,we,Me,vt,ze,Mt.data):W.isCompressedArrayTexture?N.compressedTexSubImage3D(bt,he,st,ft,Et,be,we,Me,vt,Mt.data):N.texSubImage3D(bt,he,st,ft,Et,be,we,Me,vt,ze,Mt):w.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,he,st,ft,be,we,vt,ze,Mt.data):w.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,he,st,ft,Mt.width,Mt.height,vt,Mt.data):N.texSubImage2D(N.TEXTURE_2D,he,st,ft,be,we,vt,ze,Mt);N.pixelStorei(N.UNPACK_ROW_LENGTH,ct),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,$t),N.pixelStorei(N.UNPACK_SKIP_PIXELS,ti),N.pixelStorei(N.UNPACK_SKIP_ROWS,Kt),N.pixelStorei(N.UNPACK_SKIP_IMAGES,Di),he===0&&W.generateMipmaps&&N.generateMipmap(bt),ue.unbindTexture()},this.initRenderTarget=function(w){ne.get(w).__webglFramebuffer===void 0&&ve.setupRenderTarget(w)},this.initTexture=function(w){w.isCubeTexture?ve.setTextureCube(w,0):w.isData3DTexture?ve.setTexture3D(w,0):w.isDataArrayTexture||w.isCompressedArrayTexture?ve.setTexture2DArray(w,0):ve.setTexture2D(w,0),ue.unbindTexture()},this.resetState=function(){L=0,E=0,T=null,ue.reset(),U.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=ht._getDrawingBufferColorSpace(e),t.unpackColorSpace=ht._getUnpackColorSpace()}}const F={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:1.8,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:2,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_LOD_OFFSET:1,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,POLAR_THRESHOLD:.9,EARTH_SPAWN_LAT:52.5,EARTH_SPAWN_LON:127,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TORCH_LIGHT_RANGE:4,TORCH_LIGHT_INTENSITY:1.5,TORCH_FLICKER_SPEED:8,TORCH_FLICKER_AMOUNT:.2,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,PLANET_DARK_SIDE_AMBIENT:.06,PLANET_TORCH_LIGHT_RADIUS:4,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:12,TECH_BLOCK_ROTATION_OFFSET:0,TECH_BLOCK_HEX_SNAP:!1,DEBUG_BYPASS_CRAFTING_INGREDIENTS:!1,DEBUG_JETPACK_ENABLED:!1};var vm=`varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,ym=`precision highp float;

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
}`;const jn=class jn{constructor(){y(this,"sections",new Map);y(this,"enabled",!1);y(this,"sampleWindow",60);y(this,"displayElement",null);y(this,"lastUpdateTime",0);y(this,"updateInterval",200);y(this,"spikeLoggingEnabled",!0);y(this,"frameSpikeThresholdMs",50);y(this,"lastFrameStartTime",0);y(this,"frameSections",new Map);y(this,"oneTimeOperations",[]);y(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return jn.instance||(jn.instance=new jn),jn.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
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
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let s="<b>PROFILER (F3 to toggle)</b><br>";s+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let h="#0f0";c.avgTime>5?h="#f44":c.avgTime>1&&(h="#ff0");const u=i>0?(c.avgTime/i*100).toFixed(0):"0",d=c.avgTime.toFixed(2).padStart(6),f=c.maxTime.toFixed(2).padStart(6),m=u.padStart(3);s+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${d}ms</span>`,s+=`<span style="color:#666"> max:${f}ms</span>`,c.name!=="Frame Total"&&(s+=`<span style="color:#888"> ${m}%</span>`),s+="<br>"}const o=window.__gameRenderer,a=window.__gameScene;if(o!=null&&o.info){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#88f">GPU Stats</b><br>';const c=o.info.render.calls;let h="#0f0";c>500?h="#f44":c>100&&(h="#ff0");const u=o.info.render.triangles;let d="#0f0";u>5e5?d="#f44":u>1e5&&(d="#ff0"),s+=`<span style="color:${h}">Draw Calls: ${c}</span><br>`,s+=`<span style="color:${d}">Triangles: ${u.toLocaleString()}</span><br>`,s+=`<span style="color:#88f">Geometries: ${o.info.memory.geometries}</span><br>`,s+=`<span style="color:#88f">Textures: ${o.info.memory.textures}</span><br>`,o.info.programs&&(s+=`<span style="color:#88f">Shader Programs: ${o.info.programs.length}</span><br>`)}if(a){let c=0,h=0,u=0,d=0;a.traverse(f=>{f.isMesh&&(c++,f.visible&&h++),f.isGroup&&u++,f.isLight&&d++}),s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#a8f">Scene Stats</b><br>',s+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,s+=`<span style="color:#a8f">Visible Meshes: ${h}</span><br>`,s+=`<span style="color:#a8f">Groups: ${u}</span><br>`,s+=`<span style="color:#a8f">Lights: ${d}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){s+='<span style="color:#888">─────────────────────────────</span><br>',s+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const h=((l-c.timestamp)/1e3).toFixed(1);let u="#f80";c.time>100?u="#f44":c.time>50&&(u="#ff0"),s+=`<span style="color:${u}">${c.name.padEnd(20)}</span>`,s+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,s+=`<span style="color:#666"> (${h}s ago)</span><br>`}}this.displayElement.innerHTML=s}reset(){this.sections.clear()}};y(jn,"instance");let Co=jn;const _e=Co.getInstance();function Ul(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class _m{constructor(){y(this,"keys",new Set);y(this,"keysJustPressed",new Set);y(this,"mouseMovement",{x:0,y:0});y(this,"mouseButtons",{left:!1,right:!1});y(this,"mouseWheelDelta",0);y(this,"isPointerLocked",!1);y(this,"onPointerLockChange");y(this,"onInventoryToggle");y(this,"onPauseToggle");y(this,"isMobile");y(this,"mobileGameActive",!1);y(this,"touchLookMovement",{x:0,y:0});y(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});y(this,"touchJump",!1);y(this,"touchJumpJustPressed",!1);y(this,"touchCrouch",!1);y(this,"touchLeftClick",!1);y(this,"touchRightClick",!1);y(this,"moveJoystickTouch",null);y(this,"lookJoystickTouch",null);y(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=Ul(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){window.addEventListener("keydown",t=>{if((this.isPointerLocked||this.mobileGameActive)&&t.ctrlKey&&(t.code==="KeyS"||t.code==="KeyR"||t.code==="KeyN"))return t.preventDefault(),t.stopPropagation(),!1},{capture:!0}),window.addEventListener("beforeunload",t=>{if(this.isPointerLocked||this.mobileGameActive)return document.pointerLockElement&&document.exitPointerLock(),t.preventDefault(),t.returnValue="You have an active game. Are you sure you want to leave?",t.returnValue}),document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("wheel",t=>{this.isPointerLocked&&(this.mouseWheelDelta+=t.deltaY)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
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
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(o=>o.style.display="none");const s=document.createElement("p");s.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",s.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(s)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),s=document.getElementById("btn-break"),o=document.getElementById("btn-place");if(e){const c=e.querySelector(".joystick-base"),h=e.querySelector(".joystick-thumb"),u=35,d=m=>{const x=c.getBoundingClientRect(),g=x.left+x.width/2,p=x.top+x.height/2,_=m.clientX-g,v=m.clientY-p,M=Math.sqrt(_*_+v*v),b=Math.min(M,u),S=Math.atan2(v,_),C=Math.cos(S)*b,L=Math.sin(S)*b;h.style.transform=`translate(${C}px, ${L}px)`;const E=C/u,T=L/u,R=.2;this.touchMoveInput.forward=T<-R,this.touchMoveInput.backward=T>R,this.touchMoveInput.left=E<-R,this.touchMoveInput.right=E>R};e.addEventListener("touchstart",m=>{m.preventDefault();const x=m.changedTouches[0];this.moveJoystickTouch={id:x.identifier,startX:0,startY:0},d(x)},{passive:!1}),e.addEventListener("touchmove",m=>{if(m.preventDefault(),!!this.moveJoystickTouch)for(let x=0;x<m.touches.length;x++){const g=m.touches[x];if(g.identifier===this.moveJoystickTouch.id){d(g);break}}},{passive:!1});const f=m=>{for(let x=0;x<m.changedTouches.length;x++)if(this.moveJoystickTouch&&m.changedTouches[x].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,h.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",f),e.addEventListener("touchcancel",f)}if(t){const c=t.querySelector(".joystick-base"),h=t.querySelector(".joystick-thumb"),u=35,d=m=>{const x=c.getBoundingClientRect(),g=x.left+x.width/2,p=x.top+x.height/2,_=m.clientX-g,v=m.clientY-p,M=Math.sqrt(_*_+v*v),b=Math.min(M,u),S=Math.atan2(v,_),C=Math.cos(S)*b,L=Math.sin(S)*b;h.style.transform=`translate(${C}px, ${L}px)`;const E=C/u,T=L/u,R=.15;Math.abs(E)>R||Math.abs(T)>R?(this.lookJoystickPosition.x=E,this.lookJoystickPosition.y=T):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",m=>{m.preventDefault();const x=m.changedTouches[0];this.lookJoystickTouch={id:x.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",m=>{if(m.preventDefault(),!!this.lookJoystickTouch)for(let x=0;x<m.touches.length;x++){const g=m.touches[x];if(g.identifier===this.lookJoystickTouch.id){d(g);break}}},{passive:!1});const f=m=>{for(let x=0;x<m.changedTouches.length;x++)if(this.lookJoystickTouch&&m.changedTouches[x].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},h.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",f),t.addEventListener("touchcancel",f)}n&&(n.addEventListener("touchstart",c=>{c.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",c=>{c.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",c=>{c.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",c=>{c.preventDefault(),this.touchCrouch=!1},{passive:!1})),s&&(s.addEventListener("touchstart",c=>{c.preventDefault(),this.touchLeftClick=!0},{passive:!1}),s.addEventListener("touchend",c=>{c.preventDefault(),this.touchLeftClick=!1},{passive:!1})),o&&(o.addEventListener("touchstart",c=>{c.preventDefault(),this.touchRightClick=!0},{passive:!1}),o.addEventListener("touchend",c=>{c.preventDefault(),this.touchRightClick=!1},{passive:!1}));const a=document.getElementById("btn-inventory");a&&a.addEventListener("touchstart",c=>{c.preventDefault(),this.onInventoryToggle&&this.onInventoryToggle()},{passive:!1});const l=document.getElementById("btn-pause");l&&l.addEventListener("touchstart",c=>{c.preventDefault(),this.onPauseToggle&&this.onPauseToggle()},{passive:!1})}setPointerLockCallback(e){this.onPointerLockChange=e}setInventoryToggleCallback(e){this.onInventoryToggle=e}setPauseToggleCallback(e){this.onPauseToggle=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyR"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}getWheelDelta(){const e=this.mouseWheelDelta;return this.mouseWheelDelta=0,e}resetMouseButtons(){this.mouseButtons.left=!1,this.mouseButtons.right=!1}}function Sm(){return new et({uniforms:{time:{value:0}},vertexShader:vm,fragmentShader:ym,side:Gt})}class bm{constructor(e){y(this,"scene");y(this,"camera");y(this,"renderer");y(this,"sunDirection");y(this,"clock");y(this,"frameCount",0);y(this,"lastFpsUpdate",0);y(this,"currentFps",0);y(this,"sunMesh",null);y(this,"starfield",null);y(this,"isUnderwater",!1);y(this,"underwaterFog",null);y(this,"depthRenderTarget",null);y(this,"waterMaterials",new Set);y(this,"waterMeshes",new Set);y(this,"isMobile");y(this,"updateCallbacks",[]);y(this,"animate",()=>{requestAnimationFrame(this.animate),_e.beginFrame(),_e.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}_e.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(_e.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),_e.begin("Render"),this.depthRenderTarget&&this.waterMeshes.size>0){const n=new Map;for(const i of this.waterMeshes)n.set(i,i.visible),i.visible=!1;this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);for(const i of this.waterMeshes)i.visible=n.get(i)??!0}this.renderer.render(this.scene,this.camera),_e.end("Render"),_e.end("Frame Total"),_e.endFrame(),_e.updateDisplay()});this.isMobile=Ul(),this.scene=new ch,this.camera=new Zt(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new xm({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=cl,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new wh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),_e.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),_e.toggle())})}setupLighting(){this.sunDirection=new I(F.SUN_DIRECTION.x,F.SUN_DIRECTION.y,F.SUN_DIRECTION.z).normalize();const e=new Zi(900,64,64),t=Sm();this.starfield=new Re(e,t),this.scene.add(this.starfield);const n=new Zi(60,32,32),i=new ts({color:16768324,fog:!1});this.sunMesh=new Re(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const s=new Ah(16777215,F.AMBIENT_LIGHT_INTENSITY);this.scene.add(s);const o=new Mh(16777215,F.DIRECTIONAL_LIGHT_INTENSITY);o.position.copy(this.sunDirection.clone().multiplyScalar(500)),o.castShadow=!0,o.shadow.mapSize.width=1024,o.shadow.mapSize.height=1024,o.shadow.camera.near=.5,o.shadow.camera.far=500,o.shadow.camera.left=-100,o.shadow.camera.right=100,o.shadow.camera.top=100,o.shadow.camera.bottom=-100,this.scene.add(o);const a=new Sh(8900331,2236962,F.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(a)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e),i=new Ho(t,n);i.format=bi,i.type=Un,this.depthRenderTarget=new kn(t,n,{minFilter:ut,magFilter:ut,depthBuffer:!0,depthTexture:i})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.has(e)||(this.waterMaterials.add(e),this.updateWaterMaterialUniforms(e))}registerWaterMesh(e){this.waterMeshes.add(e)}unregisterWaterMesh(e){this.waterMeshes.delete(e)}updateWaterMaterialUniforms(e){if(this.depthRenderTarget){const t=this.renderer.getPixelRatio();e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new ot(window.innerWidth*t,window.innerHeight*t)},e.uniforms.useDepthFog={value:1}}else e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new Le(F.UNDERWATER_FOG_COLOR);this.underwaterFog=new zo(t,F.UNDERWATER_FOG_NEAR,F.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class tl{constructor(e=50,t=3){y(this,"tiles",[]);y(this,"radius");y(this,"subdivisions");y(this,"vertexMap",new Map);y(this,"vertices",[]);y(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new I(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],s=this.vertices[t],o=new I().addVectors(i,s).multiplyScalar(.5).normalize().multiplyScalar(this.radius),a=this.vertices.length;return this.vertices.push(o),this.vertexMap.set(n,a),a}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),s=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,s]),e.push([t[1],i,n]),e.push([t[2],s,i]),e.push([n,i,s])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const s=this.faces[i];for(const o of s)e.get(o).push(i)}const t=[];for(const i of this.faces){const s=new I;for(const o of i)s.add(this.vertices[o]);s.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(s)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const s=e.get(i),o=s.length===5,a=[];for(const u of s)a.push(t[u].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(a,l);const c=Array.from(n.get(i)),h={index:i,center:l.clone(),vertices:a,neighbors:c,isPentagon:o};this.tiles.push(h)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new I(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const s=new I().crossVectors(n,i).normalize();i.crossVectors(s,n).normalize();const o=[];for(const a of e){const l=a.clone().sub(t),c=l.dot(i),h=l.dot(s);o.push({vertex:a,angle:Math.atan2(h,c)})}o.sort((a,l)=>a.angle-l.angle);for(let a=0;a<e.length;a++)e[a]=o[a].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const s of this.tiles){const o=s.center.distanceToSquared(t);o<i&&(i=o,n=s)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,s=i.center.distanceToSquared(n),o=!0;for(;o;){o=!1;for(const a of i.neighbors){const l=this.tiles[a],c=l.center.distanceToSquared(n);if(c<s){i=l,s=c,o=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function Rt(r){const e="/tenebris/";return r.startsWith("/")?e+r.slice(1):e+r}var Tm=`uniform float time;
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
}`,Em=`precision highp float;

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
}`,Cs=`uniform vec3 planetCenter;\r
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
}`,ws=`precision highp float;

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
}`,Mm=`uniform vec3 planetCenter;\r
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
}`,Am=`precision highp float;

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
}`,P=(r=>(r[r.AIR=0]="AIR",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WATER=4]="WATER",r[r.SAND=5]="SAND",r[r.WOOD=6]="WOOD",r[r.LEAVES=7]="LEAVES",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.SNOW=15]="SNOW",r[r.DIRT_SNOW=16]="DIRT_SNOW",r[r.ICE=17]="ICE",r[r.FURNACE=18]="FURNACE",r))(P||{});function Cm(r){return r!==0&&r!==4}function wm(r){return r===4}class Rm{constructor(){y(this,"textureLoader");y(this,"textures",new Map);y(this,"materials",new Map);y(this,"waterShaderMaterial",null);y(this,"terrainMaterials",[]);y(this,"sunDirection",new I(1,.5,.3).normalize());y(this,"planetCenter",new I(0,0,0));this.textureLoader=new ei}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=V=>{V.magFilter=ut,V.minFilter=ut,V.wrapS=Qn,V.wrapT=Qn},s=(V,J)=>{const Q=V.clone();return Q.needsUpdate=!0,new Ma({map:Q,color:J,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const V=await this.loadTexture(e);i(V),this.textures.set("primary",V);const J=new Le(F.UNDERWATER_FOG_COLOR),oe=($e=>{const Ve=new et({uniforms:{terrainTexture:{value:$e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:J},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},underwaterDimming:{value:F.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Cs,fragmentShader:ws});return this.terrainMaterials.push(Ve),Ve})(V);this.materials.set("top",oe),this.materials.set("side",oe),this.materials.set("bottom",oe),this.materials.set("stone",oe);const Ue=($e=>{const Ve=new et({uniforms:{terrainTexture:{value:$e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:J},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},underwaterDimming:{value:F.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Cs,fragmentShader:ws,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(Ve),Ve})(V);this.materials.set("topLOD",Ue),this.materials.set("sideLOD",Ue),this.materials.set("waterLOD",s(V));return}const o=await this.loadTexture("/textures/rocks.png"),a=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png"),h=await this.loadTexture("/textures/wood.png"),u=await this.loadTexture("/textures/sand.png"),d=await this.loadTexture("/textures/minerals/earth/rocks_coal.png"),f=await this.loadTexture("/textures/minerals/earth/rocks_copper.png"),m=await this.loadTexture("/textures/minerals/earth/rocks_iron.png"),x=await this.loadTexture("/textures/minerals/earth/rocks_gold.png"),g=await this.loadTexture("/textures/minerals/earth/rocks_lythium.png"),p=await this.loadTexture("/textures/minerals/earth/rocks_aluminum.png"),_=await this.loadTexture("/textures/minerals/earth/rocks_cobalt.png"),v=await this.loadTexture("/textures/snow.png"),M=await this.loadTexture("/textures/dirt_snow.png"),b=await this.loadTexture("/textures/ice.png");[o,a,l,c,h,u,d,f,m,x,g,p,_,v,M,b].forEach(i),this.textures.set("stone",o),this.textures.set("dirt",a),this.textures.set("grass",l),this.textures.set("dirtGrass",c),this.textures.set("wood",h),this.textures.set("sand",u),this.textures.set("oreCoal",d),this.textures.set("oreCopper",f),this.textures.set("oreIron",m),this.textures.set("oreGold",x),this.textures.set("oreLithium",g),this.textures.set("oreAluminum",p),this.textures.set("oreCobalt",_),this.textures.set("snow",v),this.textures.set("dirtSnow",M),this.textures.set("ice",b);const S=new Le(F.UNDERWATER_FOG_COLOR),C=V=>{const J=new et({uniforms:{terrainTexture:{value:V},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},underwaterDimming:{value:F.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Cs,fragmentShader:ws});return this.terrainMaterials.push(J),J};this.materials.set("top",C(l)),this.materials.set("side",C(a)),this.materials.set("grassSide",C(c)),this.materials.set("bottom",C(o)),this.materials.set("stone",C(o)),this.materials.set("wood",C(h)),this.materials.set("sand",C(u)),this.materials.set("oreCoal",C(d)),this.materials.set("oreCopper",C(f)),this.materials.set("oreIron",C(m)),this.materials.set("oreGold",C(x)),this.materials.set("oreLithium",C(g)),this.materials.set("oreAluminum",C(p)),this.materials.set("oreCobalt",C(_)),this.materials.set("snow",C(v)),this.materials.set("dirtSnow",C(M)),this.materials.set("snowSide",C(M));const L=new et({uniforms:{terrainTexture:{value:b},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},opacity:{value:.5},specularPower:{value:64},specularStrength:{value:.6},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},underwaterDimming:{value:F.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Mm,fragmentShader:Am,transparent:!0,depthWrite:!0,side:Xt});this.terrainMaterials.push(L),this.materials.set("ice",L);const E=new Le(F.SEA_WALL_COLOR),T=new ts({color:E,side:Xt,fog:!1});this.materials.set("seaWall",T);const R=await this.loadTexture("/textures/water.png");i(R),this.textures.set("water",R);const O=new Le(F.WATER_COLOR),k=new Le(F.WATER_DEEP_COLOR),z=new Le(F.UNDERWATER_FOG_COLOR),B=new Le(F.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new et({uniforms:{time:{value:0},waterTexture:{value:R},uvTiling:{value:F.WATER_UV_TILING},waterColor:{value:O},deepWaterColor:{value:k},sunDirection:{value:this.sunDirection.clone()},opacity:{value:F.WATER_TRANSPARENCY},fresnelPower:{value:F.WATER_FRESNEL_POWER},reflectionStrength:{value:F.WATER_REFLECTION_STRENGTH},distortionStrength:{value:F.WATER_DISTORTION_STRENGTH},specularPower:{value:F.WATER_SPECULAR_POWER},specularStrength:{value:F.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:F.WATER_WAVE_AMPLITUDE},waveFrequency:{value:F.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:z},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:B},aboveWaterFogNear:{value:F.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:F.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new I(0,0,0)},textureStrength:{value:F.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:F.WATER_SCROLL_SPEED},causticStrength:{value:F.WATER_CAUSTIC_STRENGTH},foamStrength:{value:F.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new ot(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:Tm,fragmentShader:Em,transparent:!0,side:Xt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const G=V=>{const J=V.clone();J.needsUpdate=!0;const Q=new et({uniforms:{terrainTexture:{value:J},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:S},underwaterFogNear:{value:F.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:F.UNDERWATER_FOG_FAR},underwaterDimming:{value:F.UNDERWATER_TERRAIN_DIMMING}},vertexShader:Cs,fragmentShader:ws});return Q.polygonOffset=!0,Q.polygonOffsetFactor=4,Q.polygonOffsetUnits=4,this.terrainMaterials.push(Q),Q};this.materials.set("topLOD",G(l)),this.materials.set("sideLOD",G(a)),this.materials.set("stoneLOD",G(o)),this.materials.set("sandLOD",G(u)),this.materials.set("woodLOD",G(h)),this.materials.set("snowLOD",G(v)),this.materials.set("iceLOD",G(b));const Z=s(R,O);Z.side=Xt,Z.transparent=!1,this.materials.set("waterLOD",Z)}loadTexture(e){const t=Rt(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new Ma({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getWoodMaterial(){return this.materials.get("wood")}getSandMaterial(){return this.materials.get("sand")}getSnowMaterial(){return this.materials.get("snow")}getDirtSnowMaterial(){return this.materials.get("dirtSnow")}getSnowSideMaterial(){return this.materials.get("snowSide")??this.materials.get("snow")}getIceMaterial(){return this.materials.get("ice")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}getStoneLODMaterial(){return this.materials.get("stoneLOD")}getSandLODMaterial(){return this.materials.get("sandLOD")}getWoodLODMaterial(){return this.materials.get("woodLOD")}getSnowLODMaterial(){return this.materials.get("snowLOD")}getIceLODMaterial(){return this.materials.get("iceLOD")}createSeparateGeometries(e,t,n,i=new I(0,0,0),s=!0,o=!0,a=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),h=[],u=[];for(const S of e.vertices){const C=S.clone().sub(i).normalize();h.push(C.clone().multiplyScalar(t)),u.push(C.clone().multiplyScalar(n))}const d=c.clone().multiplyScalar(t),f=c.clone().multiplyScalar(n),m=c.clone();let x=new I(1,0,0);Math.abs(m.dot(x))>.9&&(x=new I(0,0,1));const g=new I().crossVectors(m,x).normalize();x=new I().crossVectors(g,m).normalize();let p=null,_=null,v=null;const M=.5,b=[];for(let S=0;S<l;S++){const C=S/l*Math.PI*2-Math.PI/2;b.push({u:.5+Math.cos(C)*M,v:.5+Math.sin(C)*M})}if(s){const S=[],C=[],L=[],E=[],T=c.clone();S.push(f.x,f.y,f.z),C.push(T.x,T.y,T.z),L.push(.5,.5);for(let R=0;R<l;R++){const O=u[R];S.push(O.x,O.y,O.z),C.push(T.x,T.y,T.z),L.push(b[R].u,b[R].v)}for(let R=0;R<l;R++){const O=(R+1)%l;E.push(0,1+R,1+O)}p=new yt,p.setAttribute("position",new Oe(S,3)),p.setAttribute("normal",new Oe(C,3)),p.setAttribute("uv",new Oe(L,2)),p.setIndex(E)}if(o){const S=[],C=[],L=[],E=[],T=c.clone().negate();S.push(d.x,d.y,d.z),C.push(T.x,T.y,T.z),L.push(.5,.5);for(let R=0;R<l;R++){const O=h[R];S.push(O.x,O.y,O.z),C.push(T.x,T.y,T.z),L.push(b[R].u,b[R].v)}for(let R=0;R<l;R++){const O=(R+1)%l;E.push(0,1+O,1+R)}_=new yt,_.setAttribute("position",new Oe(S,3)),_.setAttribute("normal",new Oe(C,3)),_.setAttribute("uv",new Oe(L,2)),_.setIndex(E)}if(a){const S=[],C=[],L=[],E=[];let T=0;for(let R=0;R<l;R++){const O=(R+1)%l,k=u[R],z=u[O],B=h[R],G=h[O],Z=G.clone().sub(B),V=k.clone().sub(B),J=Z.clone().cross(V).normalize();S.push(B.x,B.y,B.z,G.x,G.y,G.z,z.x,z.y,z.z,k.x,k.y,k.z);for(let oe=0;oe<4;oe++)C.push(J.x,J.y,J.z);L.push(0,0,1,0,1,1,0,1);const Q=T;E.push(Q,Q+1,Q+2,Q,Q+2,Q+3),T+=4}v=new yt,v.setAttribute("position",new Oe(S,3)),v.setAttribute("normal",new Oe(C,3)),v.setAttribute("uv",new Oe(L,2)),v.setIndex(E)}return{top:p,bottom:_,sides:v}}createHexPrismGeometry(e,t,n,i=new I(0,0,0),s=!0,o=!0,a=!0){const{top:l,bottom:c,sides:h}=this.createSeparateGeometries(e,t,n,i,s,o,a),u=[],d=[],f=[],m=[],x=[];let g=0;const p=(v,M)=>{if(!v)return;const b=v.getAttribute("position"),S=v.getAttribute("normal"),C=v.getAttribute("uv"),L=v.getIndex();if(!(!b||!S||!C||!L)){for(let E=0;E<b.count;E++)u.push(b.getX(E),b.getY(E),b.getZ(E)),d.push(S.getX(E),S.getY(E),S.getZ(E)),f.push(C.getX(E),C.getY(E));for(let E=0;E<L.count;E+=3)m.push(L.getX(E)+g,L.getX(E+1)+g,L.getX(E+2)+g),x.push(M);g+=b.count,v.dispose()}};p(l,"top"),p(c,"bottom"),p(h,"side");const _=new yt;return _.setAttribute("position",new Oe(u,3)),_.setAttribute("normal",new Oe(d,3)),_.setAttribute("uv",new Oe(f,2)),_.setIndex(m),{geometry:_,faceTypes:x}}isSolid(e){return Cm(e)}isLiquid(e){return wm(e)}}const Im=`// Planet distant LOD vertex shader with day/night lighting\r
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
`,Pm=`// Planet distant LOD fragment shader with day/night lighting and vertex-baked torch lights\r
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
`;function nl(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],torchLight:[],indices:[],vertexOffset:0}}class il{constructor(e,t=50,n=3,i={}){y(this,"radius");y(this,"center");y(this,"polyhedron");y(this,"columns",new Map);y(this,"meshBuilder");y(this,"scene");y(this,"frustum",new ns);y(this,"projScreenMatrix",new xt);y(this,"config");y(this,"lodChunks",[]);y(this,"lodChunkBounds",[]);y(this,"lodChunkDirections",[]);y(this,"tileToChunk",new Map);y(this,"lodMesh",null);y(this,"lodWaterMesh",null);y(this,"lodTileVisibility",new Map);y(this,"needsLODRebuild",!1);y(this,"LOD_CHUNK_COUNT",12);y(this,"distantLODMeshes",[]);y(this,"distantLODMaterials",[]);y(this,"currentDistantLODLevel",-1);y(this,"boundaryWallsGroup",null);y(this,"cachedRenderDistance",-1);y(this,"cachedNearbyTiles",new Set);y(this,"bufferCenterTiles",new Set);y(this,"pendingTilesToAdd",[]);y(this,"pendingTilesToRemove",[]);y(this,"isIncrementalRebuildActive",!1);y(this,"batchedMeshGroup",null);y(this,"needsRebatch",!0);y(this,"currentWaterMesh",null);y(this,"waterMeshCallback",null);y(this,"geometryWorker",null);y(this,"lodGeometryWorker",null);y(this,"isWorkerBuildActive",!1);y(this,"isLODWorkerBuildActive",!1);y(this,"isLODRebuildScheduled",!1);y(this,"isWaterWallsScheduled",!1);y(this,"needsWaterWallsRebuild",!1);y(this,"currentLODExcludedTileCount",0);y(this,"pendingLODExcludedCount",0);y(this,"initialTerrainBuilt",!1);y(this,"initialLODBuilt",!1);y(this,"initialBuildResolve",null);y(this,"serializedTileData",null);y(this,"serializedTileToChunk",null);y(this,"BLOCK_HEIGHT",1);y(this,"MAX_DEPTH");y(this,"MAX_HEIGHT");y(this,"DEEP_THRESHOLD",4);y(this,"SEA_LEVEL");y(this,"seed");y(this,"sunDirection",new I(F.SUN_DIRECTION.x,F.SUN_DIRECTION.y,F.SUN_DIRECTION.z).normalize());y(this,"torchData",[]);y(this,"tilesWithTorches",new Set);y(this,"ORE_CONFIGS",[{type:P.ORE_LITHIUM,minDepth:0,maxDepth:4,veinChance:.004,veinSize:4,spreadFactor:.6},{type:P.ORE_GOLD,minDepth:0,maxDepth:6,veinChance:.006,veinSize:5,spreadFactor:.65},{type:P.ORE_COBALT,minDepth:0,maxDepth:8,veinChance:.008,veinSize:6,spreadFactor:.7},{type:P.ORE_IRON,minDepth:4,maxDepth:14,veinChance:.012,veinSize:8,spreadFactor:.75},{type:P.ORE_ALUMINUM,minDepth:2,maxDepth:12,veinChance:.01,veinSize:7,spreadFactor:.72},{type:P.ORE_COPPER,minDepth:10,maxDepth:18,veinChance:.015,veinSize:10,spreadFactor:.8},{type:P.ORE_COAL,minDepth:12,maxDepth:20,veinChance:.018,veinSize:12,spreadFactor:.85}]);y(this,"oreVeinCache",new Map);y(this,"oreVeinsGenerated",!1);y(this,"BLOCK_MATERIALS",[{key:"top",getMaterial:()=>this.meshBuilder.getTopMaterial()},{key:"side",getMaterial:()=>this.meshBuilder.getSideMaterial()},{key:"grassSide",getMaterial:()=>this.meshBuilder.getGrassSideMaterial()},{key:"stone",getMaterial:()=>this.meshBuilder.getStoneMaterial()},{key:"sand",getMaterial:()=>this.meshBuilder.getSandMaterial()},{key:"wood",getMaterial:()=>this.meshBuilder.getWoodMaterial()},{key:"water",getMaterial:()=>this.meshBuilder.getWaterMaterial(),renderOrder:1},{key:"oreCoal",getMaterial:()=>this.meshBuilder.getMaterial("oreCoal")},{key:"oreCopper",getMaterial:()=>this.meshBuilder.getMaterial("oreCopper")},{key:"oreIron",getMaterial:()=>this.meshBuilder.getMaterial("oreIron")},{key:"oreGold",getMaterial:()=>this.meshBuilder.getMaterial("oreGold")},{key:"oreLithium",getMaterial:()=>this.meshBuilder.getMaterial("oreLithium")},{key:"oreAluminum",getMaterial:()=>this.meshBuilder.getMaterial("oreAluminum")},{key:"oreCobalt",getMaterial:()=>this.meshBuilder.getMaterial("oreCobalt")},{key:"snow",getMaterial:()=>this.meshBuilder.getSnowMaterial()},{key:"snowSide",getMaterial:()=>this.meshBuilder.getSnowSideMaterial()},{key:"dirtSnow",getMaterial:()=>this.meshBuilder.getDirtSnowMaterial()},{key:"ice",getMaterial:()=>this.meshBuilder.getIceMaterial(),renderOrder:2}]);y(this,"dirtyColumnsQueue",new Set);this.scene=e,this.radius=t,this.center=new I(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??F.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+F.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=F.TERRAIN_MAX_HEIGHT,this.seed=F.TERRAIN_SEED,this.polyhedron=new tl(t,n),this.meshBuilder=new Rm}depthToRadius(e){return this.radius-(this.MAX_DEPTH-1-e)*this.BLOCK_HEIGHT}getSeaLevelDepth(){return this.MAX_DEPTH-1-this.SEA_LEVEL}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.depthToRadius(this.getSeaLevelDepth())-F.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new kt,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2;this.lodChunkDirections=[new I(-1,e,0).normalize(),new I(1,e,0).normalize(),new I(-1,-e,0).normalize(),new I(1,-e,0).normalize(),new I(0,-1,e).normalize(),new I(0,1,e).normalize(),new I(0,-1,-e).normalize(),new I(0,1,-e).normalize(),new I(e,0,-1).normalize(),new I(e,0,1).normalize(),new I(-e,0,-1).normalize(),new I(-e,0,1).normalize()];const t=this.lodChunkDirections;for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let s=0,o=1/0;for(let a=0;a<t.length;a++){const l=i.distanceToSquared(t[a]);l<o&&(o=l,s=a)}this.tileToChunk.set(n.index,s)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new kt;this.lodChunks.push(i);const s=t[n].clone().multiplyScalar(this.radius).add(this.center),o=this.radius*.7;this.lodChunkBounds.push(new Ei(s,o))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-CjW9m9fr.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;_e.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CPNS1EKh.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;_e.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;_e.begin("Planet.workerResult"),_e.begin("Planet.workerResult.createMeshes");const t=[],n=[{dataKey:"topData",materialKey:"top"},{dataKey:"sideData",materialKey:"side"},{dataKey:"grassSideData",materialKey:"grassSide"},{dataKey:"stoneData",materialKey:"stone"},{dataKey:"sandData",materialKey:"sand"},{dataKey:"woodData",materialKey:"wood"},{dataKey:"waterData",materialKey:"water",renderOrder:1},{dataKey:"oreCoalData",materialKey:"oreCoal"},{dataKey:"oreCopperData",materialKey:"oreCopper"},{dataKey:"oreIronData",materialKey:"oreIron"},{dataKey:"oreGoldData",materialKey:"oreGold"},{dataKey:"oreLithiumData",materialKey:"oreLithium"},{dataKey:"oreAluminumData",materialKey:"oreAluminum"},{dataKey:"oreCobaltData",materialKey:"oreCobalt"},{dataKey:"snowData",materialKey:"snow"},{dataKey:"snowSideData",materialKey:"snowSide"},{dataKey:"dirtSnowData",materialKey:"dirtSnow"},{dataKey:"iceData",materialKey:"ice",renderOrder:2}];let i=null;for(const{dataKey:a,materialKey:l,renderOrder:c}of n){const h=e[a];if(h.positions.length>0){const u=this.createBufferGeometry(h),d=this.BLOCK_MATERIALS.find(f=>f.key===l);if(d){const f=new Re(u,d.getMaterial());c!==void 0&&(f.renderOrder=c),t.push(f),l==="water"&&(i=f)}}}_e.end("Planet.workerResult.createMeshes"),this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),_e.begin("Planet.workerResult.swap");const s=[];for(;this.batchedMeshGroup.children.length>0;){const a=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(a),s.push(a)}for(const a of t)this.batchedMeshGroup.add(a);for(const a of s)a.geometry&&a.geometry.dispose();_e.end("Planet.workerResult.swap"),this.currentWaterMesh=i,i&&this.waterMeshCallback&&this.waterMeshCallback(i,!0),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,_e.end("Planet.workerResult"),this.initialTerrainBuilt||(this.initialTerrainBuilt=!0,this.checkInitialBuildComplete())}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(m=>{m instanceof Re&&m.geometry&&m.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const m of this.lodChunks)for(;m.children.length>0;){const x=m.children[0];x instanceof Re&&x.geometry&&x.geometry.dispose(),m.remove(x)}const i=performance.now()-n,s=new kt,o=(m,x,g,p,_,v)=>{const M=new yt;M.setAttribute("position",new wt(new Float32Array(m),3)),M.setAttribute("normal",new wt(new Float32Array(x),3)),M.setAttribute("uv",new wt(new Float32Array(g),2)),_&&_.length>0&&M.setAttribute("skyLight",new wt(new Float32Array(_),1));const b=m.length/3;return v&&v.length>0?M.setAttribute("torchLight",new wt(new Float32Array(v),1)):M.setAttribute("torchLight",new wt(new Float32Array(b).fill(0),1)),M.setIndex(p),M},a=performance.now();let l=0,c=0;for(let m=0;m<this.LOD_CHUNK_COUNT;m++){const x=e.chunkGeometries[m];if(!x)continue;const g=this.lodChunks[m];if(x.grassPositions.length>0){const p=o(x.grassPositions,x.grassNormals,x.grassUvs,x.grassIndices,x.grassSkyLight,x.grassTorchLight),_=new Re(p,this.meshBuilder.getTopLODMaterial());g.add(_),l++,c+=x.grassPositions.length/3}if(x.dirtPositions.length>0){const p=o(x.dirtPositions,x.dirtNormals,x.dirtUvs,x.dirtIndices,x.dirtSkyLight,x.dirtTorchLight),_=new Re(p,this.meshBuilder.getSideLODMaterial());g.add(_),l++,c+=x.dirtPositions.length/3}if(x.stonePositions.length>0){const p=o(x.stonePositions,x.stoneNormals,x.stoneUvs,x.stoneIndices,x.stoneSkyLight,x.stoneTorchLight),_=new Re(p,this.meshBuilder.getStoneLODMaterial());g.add(_),l++,c+=x.stonePositions.length/3}if(x.sandPositions.length>0){const p=o(x.sandPositions,x.sandNormals,x.sandUvs,x.sandIndices,x.sandSkyLight,x.sandTorchLight),_=new Re(p,this.meshBuilder.getSandLODMaterial());g.add(_),l++,c+=x.sandPositions.length/3}if(x.woodPositions.length>0){const p=o(x.woodPositions,x.woodNormals,x.woodUvs,x.woodIndices,x.woodSkyLight,x.woodTorchLight),_=new Re(p,this.meshBuilder.getWoodLODMaterial());g.add(_),l++,c+=x.woodPositions.length/3}if(x.waterPositions.length>0){const p=o(x.waterPositions,x.waterNormals,x.waterUvs,x.waterIndices),_=new Re(p,this.meshBuilder.getWaterLODMaterial());_.renderOrder=-2,g.add(_),l++,c+=x.waterPositions.length/3}if(x.sidePositions.length>0){const p=o(x.sidePositions,x.sideNormals,x.sideUvs,x.sideIndices,x.sideSkyLight,x.sideTorchLight),_=new Re(p,this.meshBuilder.getSideLODMaterial());g.add(_),l++,c+=x.sidePositions.length/3}if(x.waterSidePositions.length>0){const p=o(x.waterSidePositions,x.waterSideNormals,x.waterSideUvs,x.waterSideIndices),_=new Re(p,this.meshBuilder.getWaterLODMaterial());_.renderOrder=-2,g.add(_),l++,c+=x.waterSidePositions.length/3}if(x.snowPositions&&x.snowPositions.length>0){const p=o(x.snowPositions,x.snowNormals,x.snowUvs,x.snowIndices,x.snowSkyLight,x.snowTorchLight),_=new Re(p,this.meshBuilder.getSnowLODMaterial());g.add(_),l++,c+=x.snowPositions.length/3}if(x.icePositions&&x.icePositions.length>0){const p=o(x.icePositions,x.iceNormals,x.iceUvs,x.iceIndices,x.iceSkyLight,x.iceTorchLight),_=new Re(p,this.meshBuilder.getIceLODMaterial());g.add(_),l++,c+=x.icePositions.length/3}s.add(g)}const h=performance.now()-a,u=performance.now();s.position.copy(this.center),s.renderOrder=-1,this.scene.add(s),this.lodMesh=s;const d=performance.now()-u,f=performance.now()-t;console.log(`[LOD Build] Total: ${f.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${h.toFixed(1)}ms | Scene add: ${d.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1,this.initialLODBuilt||(this.initialLODBuilt=!0,this.checkInitialBuildComplete())}checkInitialBuildComplete(){this.initialTerrainBuilt&&this.initialLODBuilt&&this.initialBuildResolve&&(this.initialBuildResolve(),this.initialBuildResolve=null)}async buildInitialTerrain(e){const t=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(!t){console.warn("Could not find spawn tile, using default position");return}const n=F.TERRAIN_MIN_RENDER_DISTANCE,i=this.getTilesInRange(t.index,n);return this.cachedNearbyTiles=i,this.bufferCenterTiles=this.getTilesInRange(t.index,F.TERRAIN_BUFFER_ZONE),this.cachedRenderDistance=n,this.needsRebatch=!0,this.needsLODRebuild=!0,this.geometryWorker&&this.startWorkerBuild(),this.lodGeometryWorker&&this.startLODWorkerBuild(),new Promise(s=>{if(this.initialTerrainBuilt&&this.initialLODBuilt){s();return}this.initialBuildResolve=s})}isInitialTerrainReady(){return this.initialTerrainBuilt&&this.initialLODBuilt}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;_e.begin("Planet.workerBuild.serialize");const e=[],t={};for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(s){e.push({tileIndex:i,tile:{index:s.tile.index,vertices:s.tile.vertices.map(o=>({x:o.x,y:o.y,z:o.z})),center:{x:s.tile.center.x,y:s.tile.center.y,z:s.tile.center.z},neighbors:s.tile.neighbors},blocks:[...s.blocks]});for(const o of s.tile.neighbors)if(!t[o]){const a=this.columns.get(o);a&&(t[o]={blocks:[...a.blocks],vertices:a.tile.vertices.map(l=>({x:l.x,y:l.y,z:l.z}))})}s.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1;const n=this.filterRelevantTorches(e);_e.end("Planet.workerBuild.serialize"),_e.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:F.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z},uvScale:F.TERRAIN_UV_SCALE,torches:n}}),_e.end("Planet.workerBuild.postMessage")}filterRelevantTorches(e){if(this.torchData.length===0||e.length===0)return this.torchData;let t=0,n=0,i=0;for(const h of e)t+=h.tile.center.x,n+=h.tile.center.y,i+=h.tile.center.z;t/=e.length,n/=e.length,i/=e.length;let s=0;for(const h of e){const u=h.tile.center.x-t,d=h.tile.center.y-n,f=h.tile.center.z-i,m=u*u+d*d+f*f;m>s&&(s=m)}const o=Math.sqrt(s),a=F.TORCH_LIGHT_RANGE+2,l=o+a,c=l*l;return this.torchData.filter(h=>{const u=h.position.x-t,d=h.position.y-n,f=h.position.z-i;return u*u+d*d+f*f<=c})}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(_e.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,_e.end("Planet.lodWorkerBuild.serialize"),_e.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,waterSurfaceOffset:F.WATER_SURFACE_OFFSET,lodOffset:F.TERRAIN_LOD_OFFSET,chunkCount:this.LOD_CHUNK_COUNT},torches:this.torchData}),_e.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new kt,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new tl(this.radius,t[n]),s=new yt,o=[],a=[],l=[],c=[],h=[],u=[];let d=0;const f=new Map,m=this.getSeaLevelDepth(),x=this.depthToRadius(m),g=!!this.config.texturePath;for(const v of i.tiles){const M=this.getHeightVariation(v.center),b=this.depthToRadius(M),S=!g&&M<m,C=S?x:b,L=v.center.clone().normalize().y,E=F.POLAR_THRESHOLD,T=Math.abs(L)>E;let R;if(g){const O=Math.max(.4,Math.min(1,.6+M*.02));R=new Le(O*.7,O*.7,O*.7)}else S&&T?R=new Le(12116208):S?R=new Le(3381708):M<=0?R=new Le(8947848):T?R=new Le(15790320):R=new Le(4885578);f.set(v.index,{radius:C,isWater:S,color:R})}for(const v of i.tiles){const M=f.get(v.index),b=M.radius,S=M.color,C=v.center.clone().normalize().multiplyScalar(b),L=v.vertices.map(ce=>ce.clone().normalize().multiplyScalar(b)),E=C.clone().normalize(),T=Math.abs(E.y)<.9?new I(0,1,0):new I(1,0,0),R=new I().crossVectors(T,E).normalize(),O=new I().crossVectors(E,R),k=[];let z=1/0,B=-1/0,G=1/0,Z=-1/0;for(const ce of v.vertices){const Se=ce.clone().sub(v.center),Ne=Se.dot(R),at=Se.dot(O);k.push({u:Ne,v:at}),z=Math.min(z,Ne),B=Math.max(B,Ne),G=Math.min(G,at),Z=Math.max(Z,at)}const V=B-z,J=Z-G,Q=k.map(ce=>({u:(ce.u-z)/V,v:(ce.v-G)/J})),oe={u:(0-z)/V,v:(0-G)/J},ge=v.center.clone().normalize(),Ue=v.vertices[0].clone().normalize(),$e=ge.angleTo(Ue);let Ve=!1;for(const ce of this.torchData)if(new I(ce.position.x,ce.position.y,ce.position.z).normalize().angleTo(ge)<$e){Ve=!0;break}const j=Ve?1:0,te=Ve?.3:0,pe=d;o.push(C.x,C.y,C.z),a.push(E.x,E.y,E.z),l.push(oe.u,oe.v),c.push(S.r,S.g,S.b),h.push(j),d++;for(let ce=0;ce<L.length;ce++)o.push(L[ce].x,L[ce].y,L[ce].z),a.push(E.x,E.y,E.z),l.push(Q[ce].u,Q[ce].v),c.push(S.r,S.g,S.b),h.push(te),d++,u.push(pe,pe+1+ce,pe+1+(ce+1)%L.length);if(!M.isWater){const ce=g?new Le(.5,.5,.5):new Le(9139029),Se=v.vertices.length;for(let Ne=0;Ne<Se;Ne++){const at=(Ne+1)%Se,Be=v.vertices[Ne],tt=v.vertices[at],N=Be.clone().add(tt).normalize();let Ae,Pe=1/0;for(const Ge of v.neighbors){const ue=f.get(Ge);if(!ue)continue;const Ee=i.tiles[Ge];if(!Ee)continue;const ne=Ee.center.clone().normalize().distanceToSquared(N);ne<Pe&&(Pe=ne,Ae=ue)}if(Ae&&Ae.radius<b){const Ge=Be.clone().normalize().multiplyScalar(Ae.radius),ue=tt.clone().normalize().multiplyScalar(Ae.radius),Ee=tt.clone().normalize().multiplyScalar(b),ne=Be.clone().normalize().multiplyScalar(b),ve=d;o.push(Ge.x,Ge.y,Ge.z),o.push(ue.x,ue.y,ue.z),o.push(Ee.x,Ee.y,Ee.z),o.push(ne.x,ne.y,ne.z);const D=ue.clone().sub(Ge),A=ne.clone().sub(Ge),H=D.clone().cross(A).normalize();a.push(H.x,H.y,H.z),a.push(H.x,H.y,H.z),a.push(H.x,H.y,H.z),a.push(H.x,H.y,H.z),l.push(0,0,1,0,1,1,0,1),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),c.push(ce.r,ce.g,ce.b),h.push(te),h.push(te),h.push(te),h.push(te),u.push(ve,ve+1,ve+2),u.push(ve,ve+2,ve+3),d+=4}}}}s.setAttribute("position",new Oe(o,3)),s.setAttribute("normal",new Oe(a,3)),s.setAttribute("uv",new Oe(l,2)),s.setAttribute("color",new Oe(c,3)),s.setAttribute("torchLight",new Oe(h,1)),s.setIndex(u);const p=new et({uniforms:{planetCenter:{value:this.center.clone()},sunDirection:{value:new I(1,0,0)},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},darkSideAmbient:{value:F.PLANET_DARK_SIDE_AMBIENT}},vertexShader:Im,fragmentShader:Pm,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),_=new Re(s,p);_.position.copy(this.center),_.visible=!1,_.renderOrder=-2,this.scene.add(_),this.distantLODMeshes.push(_),this.distantLODMaterials.push(p)}}rebuildDistantLODMeshes(){const e=this.currentDistantLODLevel;for(const t of this.distantLODMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof An&&t.material.dispose();this.distantLODMeshes=[],this.distantLODMaterials=[],this.currentDistantLODLevel=-1,this.createDistantLODMeshes(),e>=0&&this.setDistantLODVisible(e)}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(_e.begin("Planet.rebuildLODMesh"),_e.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const a=this.lodMesh;a.traverse(l=>{l instanceof Re&&l.geometry&&l.geometry.dispose()}),this.scene.remove(a),this.lodMesh=null,this.lodWaterMesh=null}for(const a of this.lodChunks)for(;a.children.length>0;){const l=a.children[0];l instanceof Re&&l.geometry&&l.geometry.dispose(),a.remove(l)}_e.end("Planet.rebuildLODMesh.cleanup");const e=F.TERRAIN_LOD_OFFSET,t=this.depthToRadius(this.getSeaLevelDepth())-e,n=[];for(let a=0;a<this.LOD_CHUNK_COUNT;a++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassTorchLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtTorchLight:[],dirtIndices:[],dirtVertexOffset:0,stonePositions:[],stoneNormals:[],stoneUvs:[],stoneSkyLight:[],stoneTorchLight:[],stoneIndices:[],stoneVertexOffset:0,sandPositions:[],sandNormals:[],sandUvs:[],sandSkyLight:[],sandTorchLight:[],sandIndices:[],sandVertexOffset:0,woodPositions:[],woodNormals:[],woodUvs:[],woodSkyLight:[],woodTorchLight:[],woodIndices:[],woodVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideTorchLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0,snowPositions:[],snowNormals:[],snowUvs:[],snowSkyLight:[],snowTorchLight:[],snowIndices:[],snowVertexOffset:0,icePositions:[],iceNormals:[],iceUvs:[],iceSkyLight:[],iceTorchLight:[],iceIndices:[],iceVertexOffset:0});const i=new Map;for(const[a,l]of this.columns){const c=l.tile,h=c.center.clone().normalize(),u=c.vertices.map(L=>L.clone().normalize()),d=Math.abs(h.y)<.9?new I(0,1,0):new I(1,0,0),f=new I().crossVectors(d,h).normalize(),m=new I().crossVectors(h,f),x=[];let g=1/0,p=-1/0,_=1/0,v=-1/0;for(const L of c.vertices){const E=L.clone().sub(c.center),T=E.dot(f),R=E.dot(m);x.push({u:T,v:R}),g=Math.min(g,T),p=Math.max(p,T),_=Math.min(_,R),v=Math.max(v,R)}const M=p-g,b=v-_,S=x.map(L=>({u:(L.u-g)/M,v:(L.v-_)/b})),C={u:(0-g)/M,v:(0-_)/b};i.set(a,{normalizedCenter:h,normalizedVertices:u,normalizedUVs:S,centerUV:C})}_e.begin("Planet.rebuildLODMesh.pass1");const s=new Map;for(const[a,l]of this.columns){let c=0,h=P.GRASS,u=0;for(let x=l.blocks.length-1;x>=0;x--)if(l.blocks[x]!==P.AIR&&(h===P.GRASS&&(c=x,h=l.blocks[x]),l.blocks[x]!==P.WATER)){u=x;break}let d;const f=h===P.WATER;f?d=t:d=this.depthToRadius(c)-e;const m=this.depthToRadius(u)-e;s.set(a,{radius:d,isWater:f,surfaceBlockType:h,terrainRadius:m})}_e.end("Planet.rebuildLODMesh.pass1"),_e.begin("Planet.rebuildLODMesh.pass2");for(const[a]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const l=s.get(a);if(!l)continue;const c=l.surfaceBlockType,h=l.radius,u=i.get(a);if(!u)continue;const d=u.normalizedCenter,f=d.clone().multiplyScalar(h),m=u.normalizedVertices.map(R=>R.clone().multiplyScalar(h)),x=this.tileToChunk.get(a)??0,g=n[x];let p,_,v,M,b,S,C;c===P.WATER?(p=g.waterPositions,_=g.waterNormals,v=g.waterUvs,M=null,b=null,S=g.waterIndices,C=g.waterVertexOffset):c===P.DIRT?(p=g.dirtPositions,_=g.dirtNormals,v=g.dirtUvs,M=g.dirtSkyLight,b=g.dirtTorchLight,S=g.dirtIndices,C=g.dirtVertexOffset):c===P.STONE?(p=g.stonePositions,_=g.stoneNormals,v=g.stoneUvs,M=g.stoneSkyLight,b=g.stoneTorchLight,S=g.stoneIndices,C=g.stoneVertexOffset):c===P.SAND?(p=g.sandPositions,_=g.sandNormals,v=g.sandUvs,M=g.sandSkyLight,b=g.sandTorchLight,S=g.sandIndices,C=g.sandVertexOffset):c===P.WOOD?(p=g.woodPositions,_=g.woodNormals,v=g.woodUvs,M=g.woodSkyLight,b=g.woodTorchLight,S=g.woodIndices,C=g.woodVertexOffset):c===P.SNOW||c===P.DIRT_SNOW?(p=g.snowPositions,_=g.snowNormals,v=g.snowUvs,M=g.snowSkyLight,b=g.snowTorchLight,S=g.snowIndices,C=g.snowVertexOffset):c===P.ICE?(p=g.icePositions,_=g.iceNormals,v=g.iceUvs,M=g.iceSkyLight,b=g.iceTorchLight,S=g.iceIndices,C=g.iceVertexOffset):(p=g.grassPositions,_=g.grassNormals,v=g.grassUvs,M=g.grassSkyLight,b=g.grassTorchLight,S=g.grassIndices,C=g.grassVertexOffset);const E=this.tilesWithTorches.has(a)?1:0,T=C;p.push(f.x,f.y,f.z),_.push(d.x,d.y,d.z),v.push(u.centerUV.u,u.centerUV.v),M&&M.push(1),b&&b.push(E),C++;for(let R=0;R<m.length;R++)p.push(m[R].x,m[R].y,m[R].z),_.push(d.x,d.y,d.z),v.push(u.normalizedUVs[R].u,u.normalizedUVs[R].v),M&&M.push(1),b&&b.push(E),C++,S.push(T,T+1+R,T+1+(R+1)%m.length);c===P.WATER?g.waterVertexOffset=C:c===P.DIRT?g.dirtVertexOffset=C:c===P.STONE?g.stoneVertexOffset=C:c===P.SAND?g.sandVertexOffset=C:c===P.WOOD?g.woodVertexOffset=C:c===P.SNOW||c===P.DIRT_SNOW?g.snowVertexOffset=C:c===P.ICE?g.iceVertexOffset=C:g.grassVertexOffset=C,this.lodTileVisibility.set(a,!0)}_e.end("Planet.rebuildLODMesh.pass2"),_e.begin("Planet.rebuildLODMesh.pass3");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=l.tile,h=s.get(a),u=(h==null?void 0:h.radius)??this.radius,d=(h==null?void 0:h.isWater)??!1,f=c.vertices.length,m=i.get(a);if(!m)continue;const x=m.normalizedVertices,g=this.tileToChunk.get(a)??0,p=n[g];for(let _=0;_<f;_++){const v=(_+1)%f,M=x[_],b=x[v],S=M.x+b.x,C=M.y+b.y,L=M.z+b.z,E=Math.sqrt(S*S+C*C+L*L),T=S/E,R=C/E,O=L/E;let k,z=1/0,B=!1;for(const se of c.neighbors){const K=i.get(se);if(!K)continue;const De=K.normalizedCenter,me=De.x-T,Fe=De.y-R,Ie=De.z-O,re=me*me+Fe*Fe+Ie*Ie;if(re<z){z=re;const le=s.get(se);k=le==null?void 0:le.radius,B=(le==null?void 0:le.isWater)??!1}}if(k===void 0||!(u>k||d&&!B))continue;const Z=M.x*k,V=M.y*k,J=M.z*k,Q=b.x*k,oe=b.y*k,ge=b.z*k,Ue=b.x*u,$e=b.y*u,Ve=b.z*u,j=M.x*u,te=M.y*u,pe=M.z*u,ce=Q-Z,Se=oe-V,Ne=ge-J,at=j-Z,Be=te-V,tt=pe-J;let N=Se*tt-Ne*Be,Ae=Ne*at-ce*tt,Pe=ce*Be-Se*at;const Ge=Math.sqrt(N*N+Ae*Ae+Pe*Pe);Ge>0&&(N/=Ge,Ae/=Ge,Pe/=Ge);const ue=d?p.waterSidePositions:p.sidePositions,Ee=d?p.waterSideNormals:p.sideNormals,ne=d?p.waterSideUvs:p.sideUvs,ve=d?null:p.sideSkyLight,D=d?null:p.sideTorchLight,A=d?p.waterSideIndices:p.sideIndices,H=d?p.waterSideVertexOffset:p.sideVertexOffset,ee=this.tilesWithTorches.has(a)?1:0;ue.push(Z,V,J,Q,oe,ge,Ue,$e,Ve,j,te,pe),Ee.push(N,Ae,Pe,N,Ae,Pe,N,Ae,Pe,N,Ae,Pe),ne.push(0,0,1,0,1,1,0,1),ve&&ve.push(1,1,1,1),D&&D.push(ee,ee,ee,ee),A.push(H,H+1,H+2,H,H+2,H+3),d?p.waterSideVertexOffset+=4:p.sideVertexOffset+=4}}_e.end("Planet.rebuildLODMesh.pass3"),_e.begin("Planet.rebuildLODMesh.pass4");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=s.get(a);if(!((c==null?void 0:c.isWater)??!1))continue;const u=l.tile,d=u.vertices.length,f=i.get(a);if(!f)continue;const m=f.normalizedVertices,x=this.tileToChunk.get(a)??0,g=n[x];for(let p=0;p<d;p++){const _=(p+1)%d,v=m[p],M=m[_],b=v.x+M.x,S=v.y+M.y,C=v.z+M.z,L=Math.sqrt(b*b+S*S+C*C),E=b/L,T=S/L,R=C/L;let O,k=1/0;for(const Ee of u.neighbors){const ne=i.get(Ee);if(!ne)continue;const ve=ne.normalizedCenter,D=ve.x-E,A=ve.y-T,H=ve.z-R,ee=D*D+A*A+H*H;ee<k&&(k=ee,O=Ee)}if(O===void 0||!this.cachedNearbyTiles.has(O))continue;const z=s.get(O);if(!z)continue;const B=z.terrainRadius,G=t;if(B>=G)continue;const Z=v.x*B,V=v.y*B,J=v.z*B,Q=M.x*B,oe=M.y*B,ge=M.z*B,Ue=M.x*G,$e=M.y*G,Ve=M.z*G,j=v.x*G,te=v.y*G,pe=v.z*G,ce=Q-Z,Se=oe-V,Ne=ge-J,at=j-Z,Be=te-V,tt=pe-J;let N=Se*tt-Ne*Be,Ae=Ne*at-ce*tt,Pe=ce*Be-Se*at;const Ge=Math.sqrt(N*N+Ae*Ae+Pe*Pe);Ge>0&&(N/=Ge,Ae/=Ge,Pe/=Ge);const ue=g.waterSideVertexOffset;g.waterSidePositions.push(Z,V,J,Q,oe,ge,Ue,$e,Ve,j,te,pe),g.waterSideNormals.push(N,Ae,Pe,N,Ae,Pe,N,Ae,Pe,N,Ae,Pe),g.waterSideUvs.push(0,0,1,0,1,1,0,1),g.waterSideIndices.push(ue,ue+1,ue+2,ue,ue+2,ue+3),g.waterSideVertexOffset+=4}}_e.end("Planet.rebuildLODMesh.pass4"),_e.begin("Planet.rebuildLODMesh.createMeshes");const o=new kt;for(let a=0;a<this.LOD_CHUNK_COUNT;a++){const l=n[a],c=this.lodChunks[a];for(;c.children.length>0;)c.remove(c.children[0]);const h=(u,d,f,m,x,g)=>{const p=new yt;if(p.setAttribute("position",new Oe(u,3)),p.setAttribute("normal",new Oe(d,3)),p.setAttribute("uv",new Oe(f,2)),x&&x.length>0&&p.setAttribute("skyLight",new Oe(x,1)),g&&g.length>0)p.setAttribute("torchLight",new Oe(g,1));else{const _=u.length/3;p.setAttribute("torchLight",new Oe(new Float32Array(_).fill(0),1))}return p.setIndex(m),p};if(l.grassPositions.length>0){const u=h(l.grassPositions,l.grassNormals,l.grassUvs,l.grassIndices,l.grassSkyLight,l.grassTorchLight),d=new Re(u,this.meshBuilder.getTopLODMaterial());c.add(d)}if(l.dirtPositions.length>0){const u=h(l.dirtPositions,l.dirtNormals,l.dirtUvs,l.dirtIndices,l.dirtSkyLight,l.dirtTorchLight),d=new Re(u,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.stonePositions.length>0){const u=h(l.stonePositions,l.stoneNormals,l.stoneUvs,l.stoneIndices,l.stoneSkyLight,l.stoneTorchLight),d=new Re(u,this.meshBuilder.getStoneLODMaterial());c.add(d)}if(l.sandPositions.length>0){const u=h(l.sandPositions,l.sandNormals,l.sandUvs,l.sandIndices,l.sandSkyLight,l.sandTorchLight),d=new Re(u,this.meshBuilder.getSandLODMaterial());c.add(d)}if(l.woodPositions.length>0){const u=h(l.woodPositions,l.woodNormals,l.woodUvs,l.woodIndices,l.woodSkyLight,l.woodTorchLight),d=new Re(u,this.meshBuilder.getWoodLODMaterial());c.add(d)}if(l.snowPositions.length>0){const u=h(l.snowPositions,l.snowNormals,l.snowUvs,l.snowIndices,l.snowSkyLight,l.snowTorchLight),d=new Re(u,this.meshBuilder.getSnowLODMaterial());c.add(d)}if(l.icePositions.length>0){const u=h(l.icePositions,l.iceNormals,l.iceUvs,l.iceIndices,l.iceSkyLight,l.iceTorchLight),d=new Re(u,this.meshBuilder.getIceLODMaterial());c.add(d)}if(l.waterPositions.length>0){const u=new yt;u.setAttribute("position",new Oe(l.waterPositions,3)),u.setAttribute("normal",new Oe(l.waterNormals,3)),u.setAttribute("uv",new Oe(l.waterUvs,2)),u.setIndex(l.waterIndices);const d=new Re(u,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}if(l.sidePositions.length>0){const u=h(l.sidePositions,l.sideNormals,l.sideUvs,l.sideIndices,l.sideSkyLight,l.sideTorchLight),d=new Re(u,this.meshBuilder.getSideLODMaterial());c.add(d)}if(l.waterSidePositions.length>0){const u=new yt;u.setAttribute("position",new Oe(l.waterSidePositions,3)),u.setAttribute("normal",new Oe(l.waterSideNormals,3)),u.setAttribute("uv",new Oe(l.waterSideUvs,2)),u.setIndex(l.waterSideIndices);const d=new Re(u,this.meshBuilder.getWaterLODMaterial());d.renderOrder=-2,c.add(d)}o.add(c)}o.position.copy(this.center),o.renderOrder=-1,this.scene.add(o),this.lodMesh=o,_e.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,_e.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath;this.generateOreVeins();const t=new Map;for(const s of this.polyhedron.tiles){const o=this.getHeightVariation(s.center);t.set(s.index,o)}const n=this.MAX_DEPTH-1-this.SEA_LEVEL,i=new Set;if(e){for(const s of this.polyhedron.tiles)if((t.get(s.index)??n)>=n){for(const a of s.neighbors)if((t.get(a)??n)<n){i.add(s.index);break}}console.log(`[Beach detection] Found ${i.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`)}for(const s of this.polyhedron.tiles){const o=[],a=t.get(s.index)??n,l=i.has(s.index),c=s.center.clone().normalize().y,h=F.POLAR_THRESHOLD,u=Math.abs(c)>h,d=e&&a<n;for(let x=0;x<this.MAX_DEPTH;x++)if(x>a)o.push(P.AIR);else if(x===a)l&&!u?o.push(P.SAND):d?o.push(P.DIRT):u?o.push(P.SNOW):o.push(P.GRASS);else if(x>a-3)l&&!u?o.push(P.SAND):o.push(P.DIRT);else{const g=this.getOreAtDepth(x,s.index);o.push(g)}const f=new Ei(s.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),m={tile:s,blocks:o,isDirty:!0,boundingSphere:f};this.columns.set(s.index,m)}e&&this.fillOceans()}generateOreVeins(){if(this.oreVeinsGenerated)return;const e=n=>{const i=Math.sin(n)*43758.5453;return i-Math.floor(i)},t=new Map;for(const n of this.polyhedron.tiles)t.set(n.index,n.neighbors);for(const n of this.ORE_CONFIGS){const i=n.type*31337;for(const s of this.polyhedron.tiles){const o=s.index;for(let a=n.minDepth;a<=n.maxDepth;a++){const l=`${o},${a}`;if(this.oreVeinCache.has(l))continue;const c=F.TERRAIN_SEED+i+o*7919+a*104729;e(c)<n.veinChance&&this.spreadOreVein(o,a,n,e,c,t)}}}this.oreVeinsGenerated=!0}spreadOreVein(e,t,n,i,s,o){const a=[],l=new Set;a.push({tileIndex:e,depth:t,probability:1});let c=0;const h=n.veinSize+Math.floor(i(s+999)*n.veinSize*.5);for(;a.length>0&&c<h;){const u=a.shift(),d=`${u.tileIndex},${u.depth}`;if(l.has(d)||(l.add(d),u.depth<n.minDepth||u.depth>n.maxDepth))continue;const f=s+u.tileIndex*13+u.depth*17;if(i(f)>u.probability||this.oreVeinCache.has(d))continue;this.oreVeinCache.set(d,n.type),c++;const m=u.probability*n.spreadFactor;if(m<.1)continue;a.push({tileIndex:u.tileIndex,depth:u.depth-1,probability:m}),a.push({tileIndex:u.tileIndex,depth:u.depth+1,probability:m});const x=o.get(u.tileIndex);if(x)for(const g of x)a.push({tileIndex:g,depth:u.depth,probability:m*.9})}}getOreAtDepth(e,t){const n=`${t},${e}`;return this.oreVeinCache.get(n)||P.STONE}fillOceans(){const e=this.MAX_DEPTH-1-this.SEA_LEVEL,t=F.POLAR_THRESHOLD;for(const[n,i]of this.columns){const s=i.tile.center.clone().normalize().y,o=Math.abs(s)>t;let a=!1;for(let l=i.blocks.length-1;l>=0&&i.blocks[l]===P.AIR;l--)l<=e&&(o&&!a&&l===e?(i.blocks[l]=P.ICE,a=!0):i.blocks[l]=P.WATER,i.isDirty=!0)}this.cascadeWaterInColumns()}cascadeWaterInColumns(){let e=0;for(const[t,n]of this.columns){let i=!1;for(let s=n.blocks.length-1;s>=0;s--){const o=n.blocks[s];o===P.WATER?i=!0:o===P.AIR?i&&(n.blocks[s]=P.WATER,n.isDirty=!0,e++):i=!1}}e>0&&console.log(`[Water cascade] Filled ${e} air blocks below water in columns`)}updateWaterFlow(e){let t=0;for(const n of e){const i=this.columns.get(n);if(!i)continue;let s=!0;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?s||(i.blocks[a]=P.AIR,i.isDirty=!0,t++):l===P.AIR||(s=!1)}let o=!1;for(let a=i.blocks.length-1;a>=0;a--){const l=i.blocks[a];l===P.WATER?o=!0:l===P.AIR?o&&(i.blocks[a]=P.WATER,i.isDirty=!0,t++):o=!1}}return t}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkDirections[e];this.lodChunkBounds[e].center.set(t.x*this.radius+this.center.x,t.y*this.radius+this.center.y,t.z*this.radius+this.center.z)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=F.TERRAIN_CONTINENT_SCALE,s=F.TERRAIN_MOUNTAIN_SCALE,o=F.TERRAIN_DETAIL_SCALE,a=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(a)*Math.pow(Math.abs(a),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,s,4,.5,2.2),h=Math.max(0,l),u=c*h*F.TERRAIN_MOUNTAIN_HEIGHT,d=this.fractalSimplex3D(n.x,n.y,n.z,F.TERRAIN_HILL_SCALE,3,.5,2),f=this.fractalSimplex3D(n.x,n.y,n.z,o,2,.5,2);let m=l*F.TERRAIN_CONTINENT_WEIGHT;m+=u,m+=d*F.TERRAIN_HILL_WEIGHT*(h>.1?1:.3),m+=f*F.TERRAIN_DETAIL_WEIGHT;const x=this.MAX_DEPTH-1-this.SEA_LEVEL;let g;if(m>=0){const p=m*this.MAX_HEIGHT*t;g=x+p}else{const _=Math.pow(Math.abs(m),F.TERRAIN_OCEAN_DEPTH_POWER)*F.TERRAIN_MAX_DEPTH*t;g=x-_}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(g)))}simplex3D(e,t,n){const i=.3333333333333333,s=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const o=(e+t+n)*i,a=Math.floor(e+o),l=Math.floor(t+o),c=Math.floor(n+o),h=(a+l+c)*s,u=a-h,d=l-h,f=c-h,m=e-u,x=t-d,g=n-f;let p,_,v,M,b,S;m>=x?x>=g?(p=1,_=0,v=0,M=1,b=1,S=0):m>=g?(p=1,_=0,v=0,M=1,b=0,S=1):(p=0,_=0,v=1,M=1,b=0,S=1):x<g?(p=0,_=0,v=1,M=0,b=1,S=1):m<g?(p=0,_=1,v=0,M=0,b=1,S=1):(p=0,_=1,v=0,M=1,b=1,S=0);const C=m-p+s,L=x-_+s,E=g-v+s,T=m-M+2*s,R=x-b+2*s,O=g-S+2*s,k=m-1+3*s,z=x-1+3*s,B=g-1+3*s;let G=0,Z=0,V=0,J=0,Q=.6-m*m-x*x-g*g;Q>=0&&(Q*=Q,G=Q*Q*this.grad3D(a,l,c,m,x,g));let oe=.6-C*C-L*L-E*E;oe>=0&&(oe*=oe,Z=oe*oe*this.grad3D(a+p,l+_,c+v,C,L,E));let ge=.6-T*T-R*R-O*O;ge>=0&&(ge*=ge,V=ge*ge*this.grad3D(a+M,l+b,c+S,T,R,O));let Ue=.6-k*k-z*z-B*B;return Ue>=0&&(Ue*=Ue,J=Ue*Ue*this.grad3D(a+1,l+1,c+1,k,z,B)),32*(G+Z+V+J)}grad3D(e,t,n,i,s,o){const a=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][a];return c[0]*i+c[1]*s+c[2]*o}fractalSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,h=i,u=0;for(let d=0;d<s;d++)l+=this.simplex3D(e*h,t*h,n*h)*c,u+=c,c*=o,h*=a;return l/u}ridgeSimplex3D(e,t,n,i,s,o,a){let l=0,c=1,h=i,u=0;for(let d=0;d<s;d++){const f=this.simplex3D(e*h,t*h,n*h),m=1-Math.abs(f);l+=m*m*c,u+=c,c*=o,h*=a}return l/u}hash3D(e,t,n){const i=this.seed;let s=e*374761393+t*668265263+n*1274126177+i|0;return s=(s^s>>13)*1274126177|0,s^s>>16}update(e,t,n,i){i?this.frustum.copy(i):(_e.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),_e.end("Planet.frustum"));const s=n;s&&s>100&&console.log("you got serious issues lol "+n);const o=e.distanceTo(this.center),a=o-this.radius,l=this.getDistantLODLevel(o);if(l>=0){this.setDistantLODVisible(l),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(a>F.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const p=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!p);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const c=Math.min(1,Math.max(0,a/100)),h=F.TERRAIN_MIN_RENDER_DISTANCE,u=F.TERRAIN_MAX_RENDER_DISTANCE,d=Math.floor(h+c*(u-h));_e.begin("Planet.getTile");const f=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(_e.end("Planet.getTile"),!f)return;const m=f.index;this.isIncrementalRebuildActive&&(_e.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),_e.end("Planet.incrementalRebuild"));const x=F.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(m)||d!==this.cachedRenderDistance){_e.begin("Planet.tilesInRange");const p=this.getTilesInRange(m,d),_=[],v=[];for(const M of p)this.cachedNearbyTiles.has(M)||_.push(M);for(const M of this.cachedNearbyTiles)p.has(M)||v.push(M);if(this.bufferCenterTiles=this.getTilesInRange(m,x),this.cachedRenderDistance=d,_.length>0||v.length>0){this.cachedNearbyTiles=p;const M=this.polyhedron.tiles[m].center;_.sort((b,S)=>{const C=this.polyhedron.tiles[b].center.distanceToSquared(M);return this.polyhedron.tiles[S].center.distanceToSquared(M)-C}),v.sort((b,S)=>{const C=this.polyhedron.tiles[b].center.distanceToSquared(M),L=this.polyhedron.tiles[S].center.distanceToSquared(M);return C-L}),this.pendingTilesToAdd.push(..._),this.pendingTilesToRemove.push(...v),this.isIncrementalRebuildActive=!0,console.log("[needsRebatch=true] cachedNearbyTiles changed"),this.needsRebatch=!0,this.needsLODRebuild=!0,_e.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),_e.end("Planet.boundaryWalls")}_e.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(_e.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),_e.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(console.log("[startWorkerBuild] needsRebatch was true, starting worker build"),this.geometryWorker?(_e.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),_e.end("Planet.startWorkerBuild")):(_e.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),_e.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(_=>setTimeout(_,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(_e.begin("Planet.LODRebuild"),this.rebuildLODMesh(),_e.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(_=>setTimeout(_,0)))(()=>{this.needsWaterWallsRebuild&&(_e.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),_e.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=F.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,console.log("[needsRebatch=true] incremental rebuild complete"),this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(this.currentWaterMesh&&this.waterMeshCallback&&this.waterMeshCallback(this.currentWaterMesh,!1),this.currentWaterMesh=null;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=nl();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const s=this.createBufferGeometry(i),o=new Re(s,n.getMaterial());n.renderOrder!==void 0&&(o.renderOrder=n.renderOrder),this.batchedMeshGroup.add(o),n.key==="water"&&(this.currentWaterMesh=o,this.waterMeshCallback&&this.waterMeshCallback(o,!0))}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}getBlockTopMaterialKey(e){switch(e){case P.WATER:return"water";case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"top";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"top"}}getBlockSideMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.DIRT:return"side";case P.WOOD:return"wood";case P.GRASS:return"grassSide";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"snowSide";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}getBlockBottomMaterialKey(e){switch(e){case P.STONE:return"stone";case P.SAND:return"sand";case P.WOOD:return"wood";case P.ORE_COAL:return"oreCoal";case P.ORE_COPPER:return"oreCopper";case P.ORE_IRON:return"oreIron";case P.ORE_GOLD:return"oreGold";case P.ORE_LITHIUM:return"oreLithium";case P.ORE_ALUMINUM:return"oreAluminum";case P.ORE_COBALT:return"oreCobalt";case P.SNOW:return"dirtSnow";case P.DIRT_SNOW:return"dirtSnow";case P.ICE:return"ice";default:return"side"}}buildColumnGeometry(e,t){let n=0;for(let i=e.blocks.length-1;i>=0;i--)if(e.blocks[i]!==P.AIR&&e.blocks[i]!==P.WATER){n=i;break}for(let i=0;i<e.blocks.length;i++){const s=e.blocks[i];if(s===P.AIR)continue;const o=s===P.WATER,a=i>=e.blocks.length-1?P.AIR:e.blocks[i+1],l=i===0?P.AIR:e.blocks[i-1],c=a===P.AIR||!o&&a===P.WATER,h=l===P.AIR||!o&&l===P.WATER;if(o&&a!==P.AIR)continue;const u=this.hasExposedSide(e,i);if(!o&&!c&&!h&&!u)continue;let d=this.depthToRadius(i),f=d-this.BLOCK_HEIGHT;if(o&&(d-=F.WATER_SURFACE_OFFSET,f-=F.WATER_SURFACE_OFFSET),f<=0)continue;const m=n-i,x=.8,g=.05;let p=1;m>0&&(p=Math.max(g,Math.pow(x,m)));const{top:_,bottom:v,sides:M}=this.meshBuilder.createSeparateGeometries(e.tile,f,d,new I(0,0,0),o?!0:c,o?!1:h,o?!1:u);if(_){const b=_.getAttribute("position"),S=_.getAttribute("normal"),C=_.getAttribute("uv"),L=_.getIndex();if(b&&S&&C&&L){const E=this.getBlockTopMaterialKey(s),T=o?1:p;this.mergeGeometry(t[E],b,S,C,L,this.sunDirection,T)}_.dispose()}if(v&&!o){const b=v.getAttribute("position"),S=v.getAttribute("normal"),C=v.getAttribute("uv"),L=v.getIndex();if(b&&S&&C&&L){const E=Math.max(g,p*x),T=this.getBlockBottomMaterialKey(s);this.mergeGeometry(t[T],b,S,C,L,this.sunDirection,E)}v.dispose()}if(M){const b=M.getAttribute("position"),S=M.getAttribute("normal"),C=M.getAttribute("uv"),L=M.getIndex();if(b&&S&&C&&L){const E=this.getBlockSideMaterialKey(s);this.mergeGeometry(t[E],b,S,C,L,this.sunDirection,p)}M.dispose()}o&&this.buildWaterSideFaces(e,i,f,d,t.water)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e);for(const t of this.distantLODMaterials)t.uniforms.sunDirection.value.copy(e)}setTorchData(e){this.torchData=e.map(t=>({position:{x:t.position.x-this.center.x,y:t.position.y-this.center.y,z:t.position.z-this.center.z},range:t.range,intensity:t.intensity})),this.rebuildDistantLODMeshes()}setTilesWithTorches(e){this.tilesWithTorches=e}markTilesNearTorchDirty(e,t){const n=this.getTileAtPoint(e);if(!n)return;const i=this.columns.get(n.index);if(i&&this.cachedNearbyTiles.has(n.index)){i.isDirty=!0,this.queueDirtyColumnRebuild(n.index);for(const s of i.tile.neighbors){const o=this.columns.get(s);o&&this.cachedNearbyTiles.has(s)&&(o.isDirty=!0,this.queueDirtyColumnRebuild(s))}}}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}setWaterMeshCallback(e){this.waterMeshCallback=e,this.currentWaterMesh&&e(this.currentWaterMesh,!0)}getTilesInRange(e,t){const n=new Set,i=new Set,s=[{index:e,distance:0}];let o=0;for(;o<s.length;){const a=s[o++];if(!i.has(a.index)&&(i.add(a.index),a.distance<=t)){n.add(a.index);const l=this.polyhedron.tiles[a.index];for(const c of l.neighbors)i.has(c)||s.push({index:c,distance:a.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Re&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,s,o,a=1){for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),u=t.getZ(l),d=n.getX(l),f=n.getY(l),m=n.getZ(l);e.positions.push(c,h,u),e.normals.push(d,f,m),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(a),e.torchLight.push(this.calculateTorchLightAtPosition(c,h,u));{const x=Math.sqrt(c*c+h*h+u*u);let g=1;if(x>0){const p=c/x,_=h/x,v=u/x,M=p*o.x+_*o.y+v*o.z;g=Math.max(.2,M*.5+.5)}e.colors.push(g,g,g)}}for(let l=0;l<s.count;l++)e.indices.push(s.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}calculateTorchLightAtPosition(e,t,n){let i=0;for(const s of this.torchData){const o=e-s.position.x,a=t-s.position.y,l=n-s.position.z,c=Math.sqrt(o*o+a*a+l*l);if(c<s.range){const h=1/(1+2*c*c/(s.range*s.range));i+=h*s.intensity}}return Math.min(i,1.5)}createBufferGeometry(e){const t=new yt;if(t.setAttribute("position",new Oe(e.positions,3)),t.setAttribute("normal",new Oe(e.normals,3)),t.setAttribute("uv",new Oe(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new Oe(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new Oe(e.skyLight,1)),e.torchLight&&e.torchLight.length>0)t.setAttribute("torchLight",new Oe(e.torchLight,1));else{const n=e.positions.length/3;t.setAttribute("torchLight",new Oe(new Float32Array(n).fill(0),1))}return t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const s of e.tile.neighbors){const o=this.columns.get(s);if(o&&t<o.blocks.length){const a=o.blocks[t];if(i&&(a===P.AIR||a===P.WATER)||n===P.WATER&&a===P.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,s){const o=e.tile,a=o.vertices.length,l=.001;for(let c=0;c<a;c++){const h=(c+1)%a,u=o.vertices[c],d=o.vertices[h];let f;for(const k of o.neighbors){const z=this.columns.get(k);if(!z)continue;const B=z.tile;let G=!1,Z=!1;for(const V of B.vertices)V.distanceTo(u)<l&&(G=!0),V.distanceTo(d)<l&&(Z=!0);if(G&&Z){f=z;break}}if(!f||f.blocks[t]!==P.AIR)continue;let m=0;for(let k=t-1;k>=0;k--){const z=e.blocks[k];if(z!==P.AIR&&z!==P.WATER){m=k;break}}let x=0;for(let k=t-1;k>=0;k--){const z=f.blocks[k];if(z!==P.AIR&&z!==P.WATER){x=k;break}}const g=Math.max(m,x),p=i,_=this.depthToRadius(g);if(_>=p)continue;const v=u.clone().normalize(),M=d.clone().normalize(),b=v.clone().multiplyScalar(p),S=M.clone().multiplyScalar(p),C=v.clone().multiplyScalar(_),L=M.clone().multiplyScalar(_),E=L.clone().sub(C),T=b.clone().sub(C),R=E.clone().cross(T).normalize(),O=s.vertexOffset;s.positions.push(C.x,C.y,C.z,L.x,L.y,L.z,S.x,S.y,S.z,b.x,b.y,b.z);for(let k=0;k<4;k++)s.normals.push(R.x,R.y,R.z);s.uvs.push(0,0,1,0,1,1,0,1),s.skyLight.push(1,1,1,1),s.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),s.indices.push(O,O+1,O+2,O,O+2,O+3),s.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?P.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const s=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const a of i.tile.neighbors){const l=this.columns.get(a);l&&(l.isDirty=!0)}let o=0;for(let a=0;a<i.blocks.length;a++)if(i.blocks[a]!==P.AIR&&i.blocks[a]!==P.WATER){o=a;break}t<=o+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const a of i.tile.neighbors)this.cachedNearbyTiles.has(a)&&this.queueDirtyColumnRebuild(a);this.meshBuilder.isSolid(s)&&n===P.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0||this.isWorkerBuildActive||this.geometryWorker&&(console.log("[needsRebatch=true] rebuildDirtyColumns"),this.needsRebatch=!0,this.dirtyColumnsQueue.clear())}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=nl(),t=this.getSeaLevelDepth(),n=this.depthToRadius(t)-F.WATER_SURFACE_OFFSET;for(const i of this.cachedNearbyTiles){const s=this.columns.get(i);if(!s)continue;const o=s.tile;for(let a=0;a<o.vertices.length;a++){const l=(a+1)%o.vertices.length,c=o.vertices[a],h=o.vertices[l],u=c.clone().add(h).normalize();let d,f=1/0;for(const R of o.neighbors){const O=this.columns.get(R);if(!O)continue;const k=O.tile.center.clone().normalize().distanceToSquared(u);k<f&&(f=k,d=R)}if(d===void 0||this.cachedNearbyTiles.has(d))continue;let m=!1,x=0;for(let R=s.blocks.length-1;R>=0;R--){const O=s.blocks[R];if(O===P.WATER)m=!0;else if(O!==P.AIR){x=R;break}}if(!m||x>=t)continue;const p=this.depthToRadius(x),_=n;if(p>=_)continue;const v=c.clone().normalize().multiplyScalar(p),M=h.clone().normalize().multiplyScalar(p),b=h.clone().normalize().multiplyScalar(_),S=c.clone().normalize().multiplyScalar(_),C=M.clone().sub(v),L=S.clone().sub(v),E=C.clone().cross(L).normalize(),T=e.vertexOffset;e.positions.push(v.x,v.y,v.z,M.x,M.y,M.z,b.x,b.y,b.z,S.x,S.y,S.z);for(let R=0;R<4;R++)e.normals.push(E.x,E.y,E.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(T,T+1,T+2),e.indices.push(T,T+2,T+3),e.vertexOffset+=4}}if(e.positions.length>0){const i=this.createBufferGeometry(e),s=this.meshBuilder.getSeaWallMaterial();if(s){const o=new Re(i,s);o.renderOrder=2,this.batchedMeshGroup.add(o)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t<n.blocks.length-1&&n.blocks[t+1]===P.WATER&&(i=!0);for(const s of n.tile.neighbors){const o=this.columns.get(s);o&&o.blocks[t]===P.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],s=[],o=500;for(;i.length>0;){const{tileIndex:u,depth:d}=i.shift(),f=`${u}-${d}`;if(n.has(f))continue;if(n.add(f),n.size>o)return;const m=this.columns.get(u);if(!m||d<0||d>=m.blocks.length)continue;const x=m.blocks[d];if(!(x!==P.AIR&&x!==P.WATER)){if(s.push({tileIndex:u,depth:d,isWater:x===P.WATER}),d>0){const g=m.blocks[d-1];(g===P.AIR||g===P.WATER)&&i.push({tileIndex:u,depth:d-1})}if(d<m.blocks.length-1){const g=m.blocks[d+1];(g===P.AIR||g===P.WATER)&&i.push({tileIndex:u,depth:d+1})}for(const g of m.tile.neighbors){const p=this.columns.get(g);if(p){const _=p.blocks[d];(_===P.AIR||_===P.WATER)&&i.push({tileIndex:g,depth:d})}}}}const a=s.filter(u=>u.isWater).length;if(a===0)return;s.sort((u,d)=>u.depth-d.depth);let l=a;const c=[],h=[];for(const u of s)l>0?(c.push(u),l--):h.push(u);for(const u of c){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===P.AIR){d.blocks[u.depth]=P.WATER,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const m=this.columns.get(f);m&&(m.isDirty=!0)}}}for(const u of h){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===P.WATER){d.blocks[u.depth]=P.AIR,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const m=this.columns.get(f);m&&(m.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getDepthAtPoint(e){const t=e.distanceTo(this.center),n=Math.ceil(this.MAX_DEPTH-1-(this.radius-t)/this.BLOCK_HEIGHT);return Math.max(0,Math.min(this.MAX_DEPTH,n))}getCoordinatesAtPoint(e){const t=this.getDepthAtPoint(e),n=e.clone().sub(this.center).normalize(),i=Math.asin(n.y)*(180/Math.PI),s=Math.atan2(n.z,n.x)*(180/Math.PI);return{lat:i,lon:s,depth:t}}getDirectionFromLatLon(e,t){const n=e*(Math.PI/180),i=t*(Math.PI/180),s=Math.sin(n),o=Math.cos(n),a=o*Math.cos(i),l=o*Math.sin(i);return new I(a,s,l).normalize()}getSpawnPositionAtLatLon(e,t,n=1){const i=this.getDirectionFromLatLon(e,t),s=this.getSurfaceHeightInDirection(i);return this.center.clone().add(i.multiplyScalar(s+n))}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=t.blocks.length-1;n>=0;n--)if(t.blocks[n]!==P.AIR&&t.blocks[n]!==P.WATER){const i=this.depthToRadius(n);return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s!==P.AIR&&s!==P.WATER)return this.depthToRadius(i)}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=n.blocks.length-1;i>=0;i--){const s=n.blocks[i];if(s===P.WATER)return!0;if(s!==P.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getTileNeighbors(e){const t=this.polyhedron.tiles[e];return t?t.neighbors:[]}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getTileCenterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.center.clone().add(this.center):null}getVisibleTileIndices(){return this.cachedNearbyTiles}isTileInDetailRange(e){return this.cachedNearbyTiles.has(e)}getTileChunkIndex(e){return this.tileToChunk.get(e)??-1}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;const i=this.getDepthAtPoint(e);return i>=0&&i<n.blocks.length?n.blocks[i]===P.WATER:!1}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);if(i>=0&&i<n.blocks.length&&n.blocks[i]!==P.WATER)return 0;let s=-1;for(let o=n.blocks.length-1;o>=0;o--)if(n.blocks[o]===P.WATER){s=o;break}return s<0?0:i<=s?(s-i)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let s=n.blocks.length-1;s>=0;s--)if(n.blocks[s]===P.WATER){i=s;break}return i<0?-1:this.depthToRadius(i)}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const o=t.clone().normalize(),a=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,h=l,u=this.getDepthAtPoint(e);for(let d=0;d<n;d+=.2){a.copy(e).addScaledVector(o,d);const f=this.polyhedron.getTileAtPointFromHint(a.clone().sub(this.center),c),m=this.getDepthAtPoint(a);if(m<0||m>=this.MAX_DEPTH){h=c,u=m,c=f;continue}const x=this.getBlock(f.index,m);if(x===P.AIR){h=f,u=m,c=f;continue}if(x===P.WATER&&!i){h=f,u=m,c=f;continue}const g=a.clone().sub(this.center).normalize();return{tileIndex:f.index,depth:m,blockType:x,point:a.clone(),normal:g,prevTileIndex:h.index,prevDepth:u}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=F.PLANET_LOD_DISTANCE_3?2:e>=F.PLANET_LOD_DISTANCE_2?1:e>=F.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}isInOrbitView(){return this.currentDistantLODLevel>=0}isIncrementalActive(){return this.isIncrementalRebuildActive}getNeedsRebatch(){return this.needsRebatch}}const nt=F.TERRAIN_SEA_LEVEL+F.TERRAIN_MAX_DEPTH;let Us=new Map,sl=null;function St(r,e,t){r!==sl&&(Us.clear(),sl=r);let n=Us.get(e);if(!n){n=new Array(nt);for(let i=0;i<nt;i++)n[i]=r.getBlock(e,i);Us.set(e,n)}return t>=0&&t<nt?n[t]:P.AIR}function Dm(){Us.clear()}function zi(r,e,t){let n=-1,i=1/0;for(let s=0;s<nt;s++){const o=s<nt-1?St(r,e,s+1):P.AIR,a=St(r,e,s),l=o===P.AIR||o===P.WATER,c=a!==P.AIR&&a!==P.WATER;if(l&&c){const h=r.depthToRadius(s),u=Math.abs(h-t);u<i&&(i=u,n=s)}}return n}class Lm{constructor(e,t,n){y(this,"camera");y(this,"position");y(this,"velocity");y(this,"inputManager");y(this,"planets",[]);y(this,"currentPlanet",null);y(this,"localUp",new I(0,1,0));y(this,"localForward",new I(0,0,-1));y(this,"localRight",new I(1,0,0));y(this,"orientation",new lt);y(this,"isInSpace",!1);y(this,"transitionTimer",0);y(this,"isGrounded",!1);y(this,"isJetpacking",!1);y(this,"isInWater",!1);y(this,"feetInWater",!1);y(this,"isFloatingAtSurface",!1);y(this,"hasDoubleJumped",!1);y(this,"jetpackEnabled",!0);y(this,"lastPosition",new I);y(this,"stuckFrameCount",0);y(this,"wasdActiveFrames",0);y(this,"lastStuckLogTime",0);y(this,"jumpStartPosition",null);y(this,"jumpStartSpherical",null);y(this,"wasdPressedDuringJump",!1);y(this,"jumpDirection",null);y(this,"didJumpThisFrame",!1);y(this,"getTechBlockDataCallback",null);y(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new I,this.position=n.getSpawnPositionAtLatLon(F.EARTH_SPAWN_LAT,F.EARTH_SPAWN_LON,1),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new xt;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new xt().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new I(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new I().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),s=Math.atan2(n.x,n.z),o=Math.acos(n.y/i);return{theta:s,phi:o,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}checkEdgeNudge(){if(!this.currentPlanet)return;const e=this.currentPlanet.getTileAtPoint(this.position);if(!e)return;const t=new I(e.center.x+this.currentPlanet.center.x,e.center.y+this.currentPlanet.center.y,e.center.z+this.currentPlanet.center.z),n=this.position.distanceTo(this.currentPlanet.center);let i=-1,s=1/0;for(let d=0;d<nt-1;d++){const f=d<nt-1?St(this.currentPlanet,e.index,d+1):P.AIR,m=St(this.currentPlanet,e.index,d),x=f===P.AIR||f===P.WATER,g=m!==P.AIR&&m!==P.WATER;if(x&&g){const p=this.currentPlanet.depthToRadius(d),_=Math.abs(p-n);p<=n+.5&&_<s&&(i=d,s=_)}}if(i<0)return;const o=this.currentPlanet.depthToRadius(i),a=e.neighbors;if(!a||a.length===0)return;const l=this.currentPlanet.getSurfaceNormal(this.position),c=this.position.clone().sub(l.clone().multiplyScalar(this.position.dot(l)-t.dot(l)));let h=!1;const u=new I;for(const d of a){const f=this.currentPlanet.getTileByIndex(d);if(!f)continue;let m=-1,x=1/0;for(let L=0;L<nt-1;L++){const E=L<nt-1?St(this.currentPlanet,d,L+1):P.AIR,T=St(this.currentPlanet,d,L),R=E===P.AIR||E===P.WATER,O=T!==P.AIR&&T!==P.WATER;if(R&&O){const k=this.currentPlanet.depthToRadius(L),z=Math.abs(k-n);k<=n+.5&&z<x&&(m=L,x=z)}}if(m<0||this.currentPlanet.depthToRadius(m)-o<=F.AUTO_STEP_HEIGHT)continue;const _=new I(f.center.x+this.currentPlanet.center.x,f.center.y+this.currentPlanet.center.y,f.center.z+this.currentPlanet.center.z),M=_.clone().sub(l.clone().multiplyScalar(_.dot(l)-t.dot(l))).clone().sub(t).normalize(),S=c.clone().sub(t).dot(M),C=t.distanceTo(_)*.45;S>C-F.PLAYER_RADIUS*2&&(h=!0,u.sub(M))}if(h&&u.lengthSq()>1e-4){u.normalize();const f=u.multiplyScalar(.075),m=f.clone().sub(l.clone().multiplyScalar(f.dot(l)));this.position.add(m);const x=this.currentPlanet.getSurfaceNormal(this.position);this.position.copy(this.currentPlanet.center).addScaledVector(x,n)}}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const s=this.position.distanceTo(i.planet.center),o=s-i.planet.radius,a=i.gravityFullRadius??i.planet.radius*F.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*F.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(s<l){let h=0;if(s<=a)h=1;else{const u=l-a,d=s-a;h=1-Math.min(1,d/u)}h*=c,h>t&&(t=h,e=i.planet,n=o)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(Dm(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),s=this.isInSpace;if(this.isInSpace=i===0,s&&!this.isInSpace&&n&&(this.transitionTimer=F.ROLL_SLERP_DURATION,this.currentPlanet=n),!s&&this.isInSpace&&(this.transitionTimer=0,this.updateOrientationFromLocal()),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{this.handleSpaceMouseLook(t,e),this.transitionTimer>0?(this.transitionTimer-=e,this.slerpRollToLevel(e)):this.alignUpWithGravity();const o=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const a=this.position.distanceTo(this.currentPlanet.center),l=a-o;if(l>.5){const c=this.currentPlanet.getTileAtPoint(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${o.toFixed(2)} -> ${a.toFixed(2)} (+${l.toFixed(2)})`),console.error(`Current tile: ${c==null?void 0:c.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),c){console.error("Block column at current tile:");for(let h=0;h<20;h++){const u=this.currentPlanet.getBlock(c.index,h),d=this.currentPlanet.depthToRadius(h);let f=u===0?".":u===4?"~":"#";const m=Math.abs(d-a)<1?" <-- PLAYER":"";console.error(`  d${h} (r${d}): ${f}${m}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+F.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPoint(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1,s=1/0;for(let l=0;l<nt-1;l++){const c=this.currentPlanet.getBlock(n.index,l),h=l<nt-1?this.currentPlanet.getBlock(n.index,l+1):P.AIR,u=c!==P.AIR&&c!==P.WATER,d=h===P.AIR||h===P.WATER;if(u&&d){const f=this.currentPlanet.depthToRadius(l),m=Math.abs(f-e);f<=e+.5&&m<s&&(i=l,s=m)}}const o=i>=0?this.currentPlanet.depthToRadius(i):0;console.log(`  Ground depth: ${i} (radius: ${o.toFixed(2)})`);const a=e-o;console.log(`  Player feet vs ground: ${a.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${a>F.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let l=0;l<8;l++){const c=this.currentPlanet.getBlock(n.index,l),h=P[c],u=this.currentPlanet.depthToRadius(l),d=u>e&&u<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${l}: ${h} (r=${u.toFixed(1)})${d}`)}console.log(`
Neighbor Tiles:`);for(const l of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[l])continue;let h=-1;for(let f=0;f<nt;f++){const m=this.currentPlanet.getBlock(l,f);if(m!==P.AIR&&m!==P.WATER){h=f;break}}const u=h>=0?this.currentPlanet.depthToRadius(h):0,d=u-o;console.log(`  Neighbor ${l}: ground_r=${u.toFixed(1)}, heightDiff=${d.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+F.PLAYER_HEIGHT,s=zi(this.currentPlanet,t.index,n),o=s>=0?this.currentPlanet.depthToRadius(s):0;console.log("========== Hex STRUCTURE (Shift+X) =========="),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${s} (radius: ${o.toFixed(2)})`),console.log(`isGrounded: ${this.isGrounded}, velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`),console.log(`Planet radius: ${this.currentPlanet.radius}`);const a=this.currentPlanet.isTileInDetailRange(t.index),l=this.currentPlanet.getTileChunkIndex(t.index);console.log(`Terrain type: ${a?"DETAILED":"LOD"} (chunk ${l})`),console.log("");const c=F.DEBUG_CAVE_TILE_RINGS,h=F.DEBUG_CAVE_DEPTH_ROWS,u=new Set([t.index]);let d=new Set([t.index]);for(let B=0;B<c;B++){const G=new Set;for(const Z of d){const V=this.currentPlanet.getPolyhedron().tiles[Z];if(V)for(const J of V.neighbors)u.has(J)||(u.add(J),G.add(J))}d=G}let f=0;for(let B=0;B<nt;B++)if(this.currentPlanet.depthToRadius(B)>=n){f=B;break}const m=Math.floor(h/2),x=Math.max(0,f-m),g=Math.min(nt-1,f+m);console.log(`Sampling ${u.size} tiles, depths ${x} to ${g}`),console.log("Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, P = PIPE, @ = PLAYER BODY OVERLAP"),console.log("(Higher depths = closer to sky, displayed at top)"),console.log("");const p=Array.from(u),_=["Depth/Radius"].concat(p.map(B=>`T${B}`));console.log(_.join("	"));const v=this.getTechBlockDataCallback?this.getTechBlockDataCallback(p):null,M=new Set;if(v)for(const B of v.copperPipes)M.add(`${B.tileIndex}-${B.depth}`);for(let B=g;B>=x;B--){const G=this.currentPlanet.depthToRadius(B),Z=G-1,V=G>n&&Z<i,J=[`d${B} (r${G.toFixed(0)})`];for(const Q of p){const oe=this.currentPlanet.getBlock(Q,B);let ge="?";M.has(`${Q}-${B}`)?ge="P":oe===P.AIR?ge=".":oe===P.WATER?ge="~":oe===P.SAND?ge="S":oe===P.GRASS?ge="G":ge="#",V&&Q===t.index&&(ge=ge==="."?"@":ge.toUpperCase()),J.push(ge)}console.log(J.join("	"))}console.log(""),v&&(v.torches.length>0||v.furnaces.length>0||v.steamEngines.length>0||v.hydroGenerators.length>0||v.copperPipes.length>0)&&(console.log("=== Tech Blocks in Area ==="),v.torches.length>0&&console.log(`Torches: ${v.torches.map(G=>`T${G.tileIndex}`).join(", ")}`),v.furnaces.length>0&&console.log(`Furnaces: ${v.furnaces.map(G=>`T${G.tileIndex}`).join(", ")}`),v.steamEngines.length>0&&console.log(`Steam Engines: ${v.steamEngines.map(G=>`T${G.tileIndex}`).join(", ")}`),v.hydroGenerators.length>0&&console.log(`Hydro Generators: ${v.hydroGenerators.map(G=>`T${G.tileIndex}`).join(", ")}`),v.copperPipes.length>0&&console.log(`Copper Pipes: ${v.copperPipes.map(G=>`T${G.tileIndex}@d${G.depth}`).join(", ")}`),console.log(""));const b=this.currentPlanet.depthToRadius(s);console.log(`Current ground depth: ${s} (r${b.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const S=this.currentPlanet.getPolyhedron().tiles[t.index];if(S)for(const B of S.neighbors){const G=this.currentPlanet.getPolyhedron().tiles[B];if(!G)continue;const Z=[];for(let ge=0;ge<nt-1;ge++){const Ue=ge<nt-1?this.currentPlanet.getBlock(B,ge+1):P.AIR,$e=this.currentPlanet.getBlock(B,ge),Ve=Ue===P.AIR||Ue===P.WATER,j=$e!==P.AIR&&$e!==P.WATER;Ve&&j&&Z.push(ge)}const V=new I(G.center.x,G.center.y,G.center.z).normalize().multiplyScalar(this.currentPlanet.radius),J=this.checkStepHeight(V),Q=this.checkHeadroomCollision(V),oe=this.checkWallCollision(V);console.log(`  T${B}: floors=[${Z.join(",")}] step=${J} headroom=${Q} wall=${oe}`)}const C=this.localForward.clone().negate(),L=this.position.clone().addScaledVector(C,.5),E=this.currentPlanet.getTileAtPoint(L);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${C.x.toFixed(2)}, ${C.y.toFixed(2)}, ${C.z.toFixed(2)})`),console.log(`  Test position tile: ${E?E.index:"none"} (same=${(E==null?void 0:E.index)===t.index})`);const T=this.checkCollision(L),R=this.checkStepHeight(L),O=this.checkHeadroomCollision(L),k=this.checkWallCollision(L);console.log(`  checkCollision: ${T}, step=${R}, headroom=${O}, wall=${k}`);const z=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(C,2));if(z&&z.index!==t.index){console.log(`  Forward tile (2 units ahead): ${z.index}`);const B=this.currentPlanet.getPolyhedron().tiles[z.index];if(B){const G=[];for(let oe=0;oe<nt-1;oe++){const ge=oe<nt-1?this.currentPlanet.getBlock(z.index,oe+1):P.AIR,Ue=this.currentPlanet.getBlock(z.index,oe),$e=ge===P.AIR||ge===P.WATER,Ve=Ue!==P.AIR&&Ue!==P.WATER;$e&&Ve&&G.push(oe)}const Z=new I(B.center.x,B.center.y,B.center.z).normalize().multiplyScalar(this.currentPlanet.radius),V=this.checkStepHeight(Z),J=this.checkHeadroomCollision(Z),Q=this.checkWallCollision(Z);console.log(`  T${z.index} (center): floors=[${G.join(",")}] step=${V} headroom=${J} wall=${Q}`)}}console.log("==============================================")}alignUpWithGravity(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=this.localForward.clone().negate(),n=e.clone();n.sub(t.clone().multiplyScalar(e.dot(t))),!(n.lengthSq()<.001)&&(n.normalize(),this.localUp.copy(n),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new I().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal())}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const s=Math.min(1,F.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,s).normalize(),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new I().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal(),this.localUp.angleTo(i)<.01&&(this.transitionTimer=0)}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=F.INVERT_Y_AXIS?-1:1;let i=e.mouseY*F.MOUSE_SENSITIVITY*n;const s=-e.mouseX*F.MOUSE_SENSITIVITY;if(!this.isInSpace&&this.currentPlanet){const o=this.currentPlanet.getSurfaceNormal(this.position),a=this.localForward.clone().negate();let l=new I().crossVectors(o,a).normalize();l.lengthSq()<.001&&(l=this.localRight.clone());const c=a.dot(o),h=Math.asin(Math.max(-1,Math.min(1,c))),u=89*Math.PI/180,d=h+i;d>u?i=u-h:d<-u&&(i=-u-h);const f=new lt().setFromAxisAngle(o,s);this.orientation.premultiply(f);const m=new lt().setFromAxisAngle(l,i);this.orientation.premultiply(m)}else{const o=new lt().setFromAxisAngle(this.localUp,s);this.orientation.premultiply(o);const a=new lt().setFromAxisAngle(this.localRight,i);this.orientation.premultiply(a)}this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=F.ROLL_SPEED*t),e.rollRight&&(n-=F.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),s=new lt().setFromAxisAngle(i,n);this.orientation.premultiply(s),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new I,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const s=e.sprint?F.SPRINT_SPEED:F.SPACE_THRUST;this.velocity.addScaledVector(n,s*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,F.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const s=this.position.clone().addScaledVector(n,F.WATER_BODY_CHECK_HEIGHT),o=this.currentPlanet.isInWater(s);this.feetInWater=this.currentPlanet.isInWater(this.position);const a=new I;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new I().crossVectors(l,n).normalize();if(e.forward&&a.add(l),e.backward&&a.sub(l),e.left&&a.sub(c),e.right&&a.add(c),a.lengthSq()>0){a.normalize();let d=e.sprint?F.SPRINT_SPEED:F.WALK_SPEED*F.WALK_SPEED_MULTIPLIER;o&&(d*=F.WATER_MOVEMENT_MULTIPLIER);const f=a.clone().multiplyScalar(d*t);this.resolveMovement(f)}const u=this.velocity.dot(n)>F.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!u){const d=this.currentPlanet.getWaterSurfaceRadius(this.position),f=this.position.distanceTo(this.currentPlanet.center),m=d+F.WATER_SURFACE_FLOAT_HEIGHT,x=f-m;if(d>0&&x<=.3)if(x>=-.1){this.isFloatingAtSurface=!0;const g=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(g))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,F.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(console.log(`Jump pressed! isGrounded=${this.isGrounded}, feetInWater=${this.feetInWater}`),this.isGrounded){const d=n,f=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(f));let m=F.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(m=F.JUMP_FORCE*F.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(d,m),console.log(`After jump: velocity=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)}), jumpForce=${m}`),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const x=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:x.theta,phi:x.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),s=this.position.clone().add(n);if(this.checkCollision(s)){const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}else{this.position.copy(s);const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPoint(this.position),n=this.currentPlanet.getTileAtPoint(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!0;const n=this.currentPlanet.getDepthAtPoint(this.position),i=this.currentPlanet.depthToRadius(n);let s=!1,o=!1;for(let a=0;a<nt-1;a++){const l=a<nt-1?St(this.currentPlanet,t.index,a+1):P.AIR,c=St(this.currentPlanet,t.index,a),h=l===P.AIR||l===P.WATER,u=c!==P.AIR&&c!==P.WATER;if(h&&u&&(s=!0,this.currentPlanet.depthToRadius(a)-i<=F.AUTO_STEP_HEIGHT)){o=!0;break}}return s?o:!0}checkWallCollision(e,t=!1){if(!this.currentPlanet)return!1;const n=this.currentPlanet.getTileAtPoint(e);if(!n)return!1;const i=this.currentPlanet.getTileAtPoint(this.position),s=i?i.index:-1;let o,a;if(this.isGrounded){const f=this.position.distanceTo(this.currentPlanet.center),m=this.currentPlanet.getTileAtPoint(this.position);let x=-1;if(m&&(x=zi(this.currentPlanet,m.index,f)),x<0)o=e.distanceTo(this.currentPlanet.center),a=o+F.PLAYER_HEIGHT;else{const g=this.currentPlanet.depthToRadius(x);let p=-1,_=1/0;for(let v=0;v<nt-1;v++){const M=v<nt-1?St(this.currentPlanet,n.index,v+1):P.AIR,b=St(this.currentPlanet,n.index,v),S=M===P.AIR||M===P.WATER,C=b!==P.AIR&&b!==P.WATER;if(S&&C){const E=this.currentPlanet.depthToRadius(v)-g;E<=F.AUTO_STEP_HEIGHT&&Math.abs(E)<Math.abs(_)&&(p=v,_=E)}}if(p>=0){const v=this.currentPlanet.depthToRadius(p);o=v,a=v+F.PLAYER_HEIGHT}else o=e.distanceTo(this.currentPlanet.center),a=o+F.PLAYER_HEIGHT}}else o=e.distanceTo(this.currentPlanet.center),a=o+F.PLAYER_HEIGHT;const l=this.currentPlanet.getSurfaceNormal(e),c=[n.index];if(!t){const f=this.currentPlanet.getPolyhedron().tiles[n.index];if(f)for(const m of f.neighbors){const x=this.currentPlanet.getPolyhedron().tiles[m];if(x){const p=new I(x.center.x,x.center.y,x.center.z).add(this.currentPlanet.center).clone().sub(e),_=p.dot(l);p.clone().sub(l.clone().multiplyScalar(_)).length()<F.PLAYER_RADIUS+1&&c.push(m)}}}const h=this.currentPlanet.radius*.02;let u=o;if(i){const f=zi(this.currentPlanet,s,this.position.distanceTo(this.currentPlanet.center));f>=0&&(u=this.currentPlanet.depthToRadius(f))}const d=Math.max(u,o)+F.AUTO_STEP_HEIGHT;for(const f of c){if(f===s)continue;const m=this.currentPlanet.getPolyhedron().tiles[f];if(!m)continue;let x=-1;for(let b=nt-2;b>=0;b--){const S=St(this.currentPlanet,f,b+1),C=St(this.currentPlanet,f,b);if((S===P.AIR||S===P.WATER)&&C!==P.AIR&&C!==P.WATER){x=b;break}}if(x>=0&&this.currentPlanet.depthToRadius(x)<=d)continue;const p=new I(m.center.x,m.center.y,m.center.z).add(this.currentPlanet.center).clone().sub(e),_=p.dot(l),v=p.clone().sub(l.clone().multiplyScalar(_)).length(),M=Math.max(0,v-h);for(let b=0;b<nt;b++){const S=St(this.currentPlanet,f,b);if(S===P.AIR||S===P.WATER)continue;const C=this.currentPlanet.depthToRadius(b),L=C-1;if(C<=d)continue;if(L<a&&C>o){const T=Math.abs(C-o)<.1;if(this.isGrounded&&f===n.index&&T)continue;if(M<F.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;if(i&&(s=zi(this.currentPlanet,i.index,n)),s<0)return!1;const o=this.currentPlanet.depthToRadius(s);let a=-1,l=1/0;for(let d=0;d<nt-1;d++){const f=d<nt-1?St(this.currentPlanet,t.index,d+1):P.AIR,m=St(this.currentPlanet,t.index,d),x=f===P.AIR||f===P.WATER,g=m!==P.AIR&&m!==P.WATER;if(x&&g){const _=this.currentPlanet.depthToRadius(d)-o;_<=F.AUTO_STEP_HEIGHT&&Math.abs(_)<Math.abs(l)&&(a=d,l=_)}}if(a<0)return!1;const c=this.currentPlanet.depthToRadius(a),h=c,u=c+F.PLAYER_HEIGHT;for(let d=0;d<nt;d++){const f=St(this.currentPlanet,t.index,d);if(f===P.AIR||f===P.WATER)continue;const m=this.currentPlanet.depthToRadius(d),x=m-1;if(m>h&&x<u){if(d===a)continue;return!0}}return!1}isPositionValid(e,t=!1){if(!this.currentPlanet)return!0;const n=this.currentPlanet.getSurfaceNormal(e),i=e.distanceTo(this.currentPlanet.center),s=this.currentPlanet.getTileAtPoint(e);if(s){let l=-1;for(let c=0;c<nt;c++){const h=St(this.currentPlanet,s.index,c);if(h!==P.AIR&&h!==P.WATER){l=c;break}}if(l>=0){const c=this.currentPlanet.depthToRadius(l)-1;if(i<c)return console.log(`isPositionValid BLOCKED by floor: feetR=${i.toFixed(2)}, floorR=${c.toFixed(2)}, floorD=${l}`),!1}}const o=[.1,F.PLAYER_HEIGHT*.5,F.PLAYER_HEIGHT],a=s;for(const l of o){const c=i+l;let h,u;if(t&&a){h=a;for(let f=0;f<nt;f++){const m=this.currentPlanet.depthToRadius(f);if(c<=m){u=f;break}}u=u??nt-1}else{const f=this.currentPlanet.center.clone().add(n.clone().multiplyScalar(c));if(h=this.currentPlanet.getTileAtPoint(f),!h)continue;u=this.currentPlanet.getDepthAtPoint(f)}if(u<0||u>=nt)continue;const d=St(this.currentPlanet,h.index,u);if(d!==P.AIR&&d!==P.WATER){const f=this.currentPlanet.depthToRadius(u);if(c<f)return console.log(`isPositionValid BLOCKED: offset=${l.toFixed(2)}, checkR=${c.toFixed(2)}, depth=${u}, blockTopR=${f.toFixed(2)}, block=${d}, tile=${h.index}`),!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+F.PLAYER_HEIGHT,s=[];for(let f=0;f<nt;f++){const m=f<nt-1?St(this.currentPlanet,t.index,f+1):P.AIR,x=St(this.currentPlanet,t.index,f),g=m===P.AIR||m===P.WATER,p=x!==P.AIR&&x!==P.WATER;if(g&&p){const _=this.currentPlanet.depthToRadius(f);s.push({depth:f,radius:_})}}if(s.length===0)return;let o=s[0],a=Math.abs(n-o.radius);for(const f of s){const m=Math.abs(n-f.radius);m<a&&(a=m,o=f)}const l=o.radius,c=l+F.PLAYER_HEIGHT;let h=!0;for(let f=0;f<nt;f++){const m=St(this.currentPlanet,t.index,f);if(m===P.AIR||m===P.WATER)continue;const x=this.currentPlanet.depthToRadius(f),g=x-1;if(f!==o.depth&&x>l&&g<c){h=!1;break}}if(!h)return;let u=!1;for(let f=0;f<nt;f++){const m=St(this.currentPlanet,t.index,f);if(m===P.AIR||m===P.WATER)continue;const x=this.currentPlanet.depthToRadius(f),g=x-1;if(x>n&&g<i){if(Math.abs(x-n)<.2)continue;u=!0;break}}if(!u)return;const d=o.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,d),this.isInWater){const f=this.velocity.dot(e);f<0&&this.velocity.sub(e.clone().multiplyScalar(f))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,F.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPoint(this.position);let s=-1;i&&(s=zi(this.currentPlanet,i.index,n));const o=s>=0?this.currentPlanet.depthToRadius(s):0,a=o;if(s>=0&&n<=a+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,a),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const h=this.getGravityMultiplier();let u=F.BASE_GRAVITY*h;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?u=0:u*=F.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-F.WATER_DRAG*e)),u>0&&this.velocity.addScaledVector(c,u*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const f=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),m=f.distanceTo(this.currentPlanet.center),x=this.currentPlanet.getTileAtPoint(f);let g=-1,p=1/0;if(x)for(let S=0;S<nt-1;S++){const C=S<nt-1?St(this.currentPlanet,x.index,S+1):P.AIR,L=St(this.currentPlanet,x.index,S),E=C===P.AIR||C===P.WATER,T=L!==P.AIR&&L!==P.WATER;if(E&&T){const O=this.currentPlanet.depthToRadius(S)-o;O<=F.AUTO_STEP_HEIGHT&&Math.abs(O)<Math.abs(p)&&(g=S,p=O)}}const _=g>=0?this.currentPlanet.depthToRadius(g):0,v=_,M=_-o,b=!this.isInWater&&M>F.AUTO_STEP_HEIGHT;if(g>=0&&m<=v)if(b){const S=this.velocity.dot(t);S<0&&this.velocity.sub(t.clone().multiplyScalar(S)),this.velocity.multiplyScalar(.5)}else{const S=f.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(S,v);const C=this.velocity.dot(S);C<0&&this.velocity.sub(S.clone().multiplyScalar(C)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const S=this.isPositionValid(f),C=this.checkWallCollision(f);if(S&&!C)this.position.copy(f);else{const L=t.clone().multiplyScalar(this.velocity.dot(t)),E=this.velocity.clone().sub(L),T=L.clone().multiplyScalar(e),R=this.position.clone().add(T),O=this.velocity.dot(t)>0;let k;if(O){const z=this.isPositionValid(R,!0),B=this.checkWallCollision(R,!0);if(k=z&&!B,!k){const G=R.distanceTo(this.currentPlanet.center),Z=G+F.PLAYER_HEIGHT;console.log(`Jump blocked: posValid=${z}, wallBlock=${B}, newFeetR=${G.toFixed(2)}, newHeadR=${Z.toFixed(2)}`)}}else if(k=!this.checkWallCollision(R,!0),k){const z=this.currentPlanet.getTileAtPoint(R);if(z){const B=R.distanceTo(this.currentPlanet.center),G=this.currentPlanet.getDepthAtPoint(R);if(G>=0&&G<nt){const Z=St(this.currentPlanet,z.index,G);if(Z!==P.AIR&&Z!==P.WATER){const V=this.currentPlanet.depthToRadius(G);B<V&&(k=!1)}}}}if(k)this.position.copy(R),O||this.checkEdgeNudge();else{const z=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(z))}if(E.lengthSq()>.001){const z=E.clone().multiplyScalar(e),B=this.position.clone().add(z);this.isPositionValid(B)&&!this.checkWallCollision(B)?this.position.copy(B):this.velocity.sub(E.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(F.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),s=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(s)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let s="";this.isInSpace?s=" [SPACE FLIGHT]":this.transitionTimer>0?s=" [ENTERING GRAVITY]":this.isJetpacking?s=" [JETPACK]":this.isGrounded||(s=" [AIRBORNE]");const o=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${o} | Grav: ${(i*100).toFixed(0)}%${s}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getCoordinatesAtPoint(this.position),i=n.lat>=0?"N":"S",s=n.lon>=0?"E":"W";t.textContent=`${Math.abs(n.lat).toFixed(1)}°${i} ${Math.abs(n.lon).toFixed(1)}°${s} D:${n.depth}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}setTechBlockDataCallback(e){this.getTechBlockDataCallback=e}exportForSave(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},orientation:{x:this.orientation.x,y:this.orientation.y,z:this.orientation.z,w:this.orientation.w},velocity:{x:this.velocity.x,y:this.velocity.y,z:this.velocity.z}}}importFromSave(e){this.position.set(e.position.x,e.position.y,e.position.z),this.orientation.set(e.orientation.x,e.orientation.y,e.orientation.z,e.orientation.w),this.velocity.set(e.velocity.x,e.velocity.y,e.velocity.z),this.updateLocalFromOrientation()}}var q=(r=>(r[r.NONE=0]="NONE",r[r.STONE=1]="STONE",r[r.DIRT=2]="DIRT",r[r.GRASS=3]="GRASS",r[r.WOOD=4]="WOOD",r[r.LEAVES=5]="LEAVES",r[r.LOG=6]="LOG",r[r.SAND=7]="SAND",r[r.ORE_COAL=8]="ORE_COAL",r[r.ORE_COPPER=9]="ORE_COPPER",r[r.ORE_IRON=10]="ORE_IRON",r[r.ORE_GOLD=11]="ORE_GOLD",r[r.ORE_LITHIUM=12]="ORE_LITHIUM",r[r.ORE_ALUMINUM=13]="ORE_ALUMINUM",r[r.ORE_COBALT=14]="ORE_COBALT",r[r.STICK=15]="STICK",r[r.COAL=16]="COAL",r[r.TORCH=17]="TORCH",r[r.FISHING_ROD=18]="FISHING_ROD",r[r.SNOW=19]="SNOW",r[r.ICE=20]="ICE",r[r.FURNACE=21]="FURNACE",r[r.INGOT_COPPER=22]="INGOT_COPPER",r[r.INGOT_IRON=23]="INGOT_IRON",r[r.INGOT_GOLD=24]="INGOT_GOLD",r[r.INGOT_ALUMINUM=25]="INGOT_ALUMINUM",r[r.STORAGE_CHEST=26]="STORAGE_CHEST",r[r.STEAM_ENGINE=27]="STEAM_ENGINE",r[r.HYDRO_GENERATOR=28]="HYDRO_GENERATOR",r[r.COPPER_PIPE=29]="COPPER_PIPE",r))(q||{});const mt={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2},7:{name:"Sand",stackSize:64,texture:"/textures/sand.png",mineTime:.5},8:{name:"Coal Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_coal.png",mineTime:2},9:{name:"Copper Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_copper.png",mineTime:2},10:{name:"Iron Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_iron.png",mineTime:2.5},11:{name:"Gold Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_gold.png",mineTime:3},12:{name:"Lithium Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_lythium.png",mineTime:3},13:{name:"Aluminum Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_aluminum.png",mineTime:2},14:{name:"Cobalt Ore",stackSize:64,texture:"/textures/minerals/earth/rocks_cobalt.png",mineTime:2.5},15:{name:"Stick",stackSize:64,texture:"/textures/sticks.png",mineTime:.3},16:{name:"Coal",stackSize:64,texture:"/textures/coal.png",mineTime:.3},17:{name:"Torch",stackSize:64,texture:"/textures/torch_sprite.png",mineTime:.3},18:{name:"Fishing Rod",stackSize:1,texture:"/textures/fishing_rod.png",mineTime:.3},19:{name:"Snow",stackSize:64,texture:"/textures/snow.png",mineTime:.5},20:{name:"Ice",stackSize:64,texture:"/textures/ice.png",mineTime:.5},21:{name:"Furnace",stackSize:8,texture:"/textures/technology/furnace_face.png",mineTime:2},22:{name:"Copper Ingot",stackSize:64,texture:"/textures/minerals/earth/copper.png",mineTime:.3},23:{name:"Iron Ingot",stackSize:64,texture:"/textures/minerals/earth/iron.png",mineTime:.3},24:{name:"Gold Ingot",stackSize:64,texture:"/textures/minerals/earth/gold.png",mineTime:.3},25:{name:"Aluminum Ingot",stackSize:64,texture:"/textures/minerals/earth/aluminum.png",mineTime:.3},26:{name:"Storage Chest",stackSize:8,texture:"/textures/technology/storage_face.png",mineTime:1.5},27:{name:"Steam Engine",stackSize:8,texture:"/textures/technology/steam_engine_face.png",mineTime:2.5},28:{name:"Hydro Generator",stackSize:8,texture:"/textures/technology/hydro_generator_face.png",mineTime:2.5},29:{name:"Copper Pipe",stackSize:64,texture:"/textures/technology/copper_pipe.png",mineTime:.5}};class Om{constructor(){y(this,"slots");y(this,"selectedSlot",0);y(this,"hotbarSize",9);y(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=mt[e];let i=t;for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===e&&o.quantity<n.stackSize){const a=Math.min(i,n.stackSize-o.quantity);o.quantity+=a,i-=a}}for(let s=0;s<this.totalSlots&&i>0;s++){const o=this.slots[s];if(o.itemType===0){const a=Math.min(i,n.stackSize);o.itemType=e,o.quantity=a,i-=a}}return i}setSlot(e,t,n){e<0||e>=this.totalSlots||(this.slots[e].itemType=t,this.slots[e].quantity=n,n<=0&&(this.slots[e].itemType=0,this.slots[e].quantity=0))}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let s=this.totalSlots-1;s>=0&&n>0;s--){const o=this.slots[s];if(o.itemType===e){const a=Math.min(n,o.quantity);o.quantity-=a,n-=a,i+=a,o.quantity===0&&(o.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}swapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n={...this.slots[e]};this.slots[e]={...this.slots[t]},this.slots[t]=n}getSlot(e){return e<0||e>=this.totalSlots?null:this.slots[e]}exportForSave(){return this.slots.map(e=>({itemType:e.itemType,quantity:e.quantity}))}importFromSave(e){for(let t=0;t<Math.min(e.length,this.totalSlots);t++)this.slots[t]={itemType:e[t].itemType,quantity:e[t].quantity}}}function kl(r,e=!1){const t=r[0].index!==null,n=new Set(Object.keys(r[0].attributes)),i=new Set(Object.keys(r[0].morphAttributes)),s={},o={},a=r[0].morphTargetsRelative,l=new yt;let c=0;for(let h=0;h<r.length;++h){const u=r[h];let d=0;if(t!==(u.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in u.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;s[f]===void 0&&(s[f]=[]),s[f].push(u.attributes[f]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in u.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(u.morphAttributes[f])}if(e){let f;if(t)f=u.index.count;else if(u.attributes.position!==void 0)f=u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,f,h),c+=f}}if(t){let h=0;const u=[];for(let d=0;d<r.length;++d){const f=r[d].index;for(let m=0;m<f.count;++m)u.push(f.getX(m)+h);h+=r[d].attributes.position.count}l.setIndex(u)}for(const h in s){const u=rl(s[h]);if(!u)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,u)}for(const h in o){const u=o[h][0].length;if(u===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let d=0;d<u;++d){const f=[];for(let x=0;x<o[h].length;++x)f.push(o[h][x][d]);const m=rl(f);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(m)}}return l}function rl(r){let e,t,n,i=-1,s=0;for(let c=0;c<r.length;++c){const h=r[c];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;s+=h.count*t}const o=new e(s),a=new wt(o,t,n);let l=0;for(let c=0;c<r.length;++c){const h=r[c];if(h.isInterleavedBufferAttribute){const u=l/t;for(let d=0,f=h.count;d<f;d++)for(let m=0;m<t;m++){const x=h.getComponent(d,m);a.setComponent(d+u,m,x)}}else o.set(h.array,l);l+=h.count*t}return i!==void 0&&(a.gpuType=i),a}var Nm=`uniform float time;\r
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
}`,Fm=`varying vec3 vColor;

void main() {\r
  gl_FragColor = vec4(vColor, 1.0);\r
}`;const Je={LIGHT_COLOR:16755268,get LIGHT_INTENSITY(){return F.TORCH_LIGHT_INTENSITY},get LIGHT_RANGE(){return F.TORCH_LIGHT_RANGE},LIGHT_DECAY:2,get FLICKER_SPEED(){return F.TORCH_FLICKER_SPEED},get FLICKER_AMOUNT(){return F.TORCH_FLICKER_AMOUNT},HANDLE_HEIGHT:.4,HANDLE_RADIUS:.03,HEAD_RADIUS:.06,HEAD_HEIGHT:.1,FLAME_HEIGHT:.15,FLAME_RADIUS:.05,HELD_OFFSET:new I(.25,-.2,-.4),HELD_ROTATION:new un(-.3,.2,.1)};let Xi=null;function Um(){return Xi||(Xi=new et({uniforms:{time:{value:0},flickerAmount:{value:.15}},vertexShader:Nm,fragmentShader:Fm,vertexColors:!0})),Xi}function Gl(r){Xi&&(Xi.uniforms.time.value=r)}function Bl(){const r=new kt,e=new Ai(Je.HANDLE_RADIUS,Je.HANDLE_RADIUS,Je.HANDLE_HEIGHT,8);e.translate(0,Je.HANDLE_HEIGHT/2,0);const t=new Ai(Je.HEAD_RADIUS,Je.HEAD_RADIUS*.8,Je.HEAD_HEIGHT,8);t.translate(0,Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT/2,0);const n=new Ys(Je.FLAME_RADIUS,Je.FLAME_HEIGHT,8);n.translate(0,Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT/2,0);const i=new Le(9127187),s=new Le(3355443),o=new Le(Je.LIGHT_COLOR);Or(e,i),Or(t,s),Or(n,o),Nr(e,0),Nr(t,0),Nr(n,1);const a=kl([e,t,n]),l=Um(),c=new Re(a,l);return c.name="torchMesh",r.add(c),e.dispose(),t.dispose(),n.dispose(),r}function Or(r,e){const t=r.attributes.position.count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;r.setAttribute("color",new wt(n,3))}function Nr(r,e){const t=r.attributes.position.count,n=new Float32Array(t);for(let i=0;i<t;i++)n[i]=e;r.setAttribute("animWeight",new wt(n,1))}class km{constructor(e,t){y(this,"torchGroup");y(this,"pointLight");y(this,"camera");y(this,"isVisible",!1);y(this,"flickerTime",0);y(this,"baseIntensity");this.camera=e,this.baseIntensity=Je.LIGHT_INTENSITY,this.torchGroup=Bl(),this.torchGroup.visible=!1,this.torchGroup.position.copy(Je.HELD_OFFSET),this.torchGroup.rotation.copy(Je.HELD_ROTATION),this.pointLight=new Th(Je.LIGHT_COLOR,0,Je.LIGHT_RANGE,Je.LIGHT_DECAY),e.add(this.torchGroup),e.add(this.pointLight);const n=Je.HELD_OFFSET.y+Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT;this.pointLight.position.set(Je.HELD_OFFSET.x,n,Je.HELD_OFFSET.z)}setVisible(e){this.isVisible=e,this.torchGroup.visible=e,this.pointLight.intensity=e?this.baseIntensity:0}update(e){if(!this.isVisible)return;this.flickerTime+=e*Je.FLICKER_SPEED;const t=Math.sin(this.flickerTime)*Math.sin(this.flickerTime*2.3)*Math.sin(this.flickerTime*.7);this.pointLight.intensity=this.baseIntensity*(1+t*Je.FLICKER_AMOUNT),Gl(this.flickerTime)}dispose(){this.camera.remove(this.torchGroup),this.camera.remove(this.pointLight),this.torchGroup.traverse(e=>{e instanceof Re&&(e.geometry.dispose(),e.material instanceof An&&e.material.dispose())}),this.pointLight.dispose()}}class Gm{constructor(e){y(this,"scene");y(this,"placedTorches",[]);y(this,"torchesByTile",new Map);y(this,"flickerTime",0);y(this,"torchLightData",new Map);this.scene=e}placeTorch(e,t,n){const i=Bl(),s=e.clone().sub(t).normalize(),o=new I(0,1,0),a=new lt().setFromUnitVectors(o,s);i.quaternion.copy(a),i.position.copy(e);const l={group:i,tileIndex:n,position:e.clone(),flickerOffset:Math.random()*Math.PI*2};return this.scene.add(i),this.torchesByTile.has(n)||this.torchesByTile.set(n,[]),this.torchesByTile.get(n).push(l),this.placedTorches.push(l),l}removeTorch(e){const t=this.placedTorches.indexOf(e);if(t>=0){this.placedTorches.splice(t,1);const n=this.torchesByTile.get(e.tileIndex);if(n){const i=n.indexOf(e);i>=0&&n.splice(i,1)}this.scene.remove(e.group),e.group.traverse(i=>{i instanceof Re&&(i.geometry.dispose(),i.material instanceof An&&i.material.dispose())})}}update(e){this.flickerTime+=e*Je.FLICKER_SPEED,Gl(this.flickerTime)}updateVisibility(e){for(const[t,n]of this.torchesByTile){const i=e.has(t);for(const s of n)s.group.visible=i}}getTorchLightAt(e){let t=0;for(const n of this.placedTorches){const i=e.distanceTo(n.position);if(i<Je.LIGHT_RANGE){const s=1/(1+Je.LIGHT_DECAY*i*i/(Je.LIGHT_RANGE*Je.LIGHT_RANGE));t+=s}}return Math.min(1,t)}getTorchLightData(){return this.torchLightData}getPlacedTorches(){return this.placedTorches}getTorchDataForBaking(){return this.placedTorches.map(e=>{const t=Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT,n=e.position.clone().normalize();return{position:e.position.clone().add(n.multiplyScalar(t)),range:Je.LIGHT_RANGE,intensity:Je.LIGHT_INTENSITY}})}hasTorchOnTile(e){const t=this.torchesByTile.get(e);return t!==void 0&&t.length>0}getTilesWithTorches(){const e=new Set;for(const[t,n]of this.torchesByTile)n.length>0&&e.add(t);return e}getNearestTorchPositions(e,t=16){const n=this.placedTorches.map(i=>{const s=Je.HANDLE_HEIGHT+Je.HEAD_HEIGHT+Je.FLAME_HEIGHT,o=i.position.clone().normalize(),a=i.position.clone().add(o.multiplyScalar(s));return{position:a,distance:e.distanceTo(a)}});return n.sort((i,s)=>i.distance-s.distance),n.slice(0,t).map(i=>i.position)}getTorchMeshes(){const e=[];for(const t of this.placedTorches)t.group.traverse(n=>{n instanceof Re&&e.push(n)});return e}dispose(){for(const e of[...this.placedTorches])this.removeTorch(e)}}var Ii=`uniform vec3 planetCenter;\r
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
}`,Pi=`precision highp float;

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
}`;const ks=[{input:q.ORE_COPPER,output:q.INGOT_COPPER,outputQuantity:1},{input:q.ORE_IRON,output:q.INGOT_IRON,outputQuantity:1},{input:q.ORE_GOLD,output:q.INGOT_GOLD,outputQuantity:1},{input:q.ORE_ALUMINUM,output:q.INGOT_ALUMINUM,outputQuantity:1}];class Bm{constructor(e,t,n){y(this,"scene");y(this,"furnaces",[]);y(this,"furnaceMeshes",[]);y(this,"textureLoader");y(this,"furnaceGeometry",null);y(this,"furnaceMaterial",null);y(this,"onSmeltCompleteCallback",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"FURNACE_SIZE",.8);y(this,"SMELT_TIME",10);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.furnaceMaterial&&this.furnaceMaterial.uniforms.planetCenter.value.copy(e)}setOnSmeltCompleteCallback(e){this.onSmeltCompleteCallback=e}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Rt("/textures/technology/furnace.png"),o,void 0,a)});e.magFilter=ut,e.minFilter=ut,e.wrapS=It,e.wrapT=It,this.furnaceGeometry=new sn(this.FURNACE_SIZE,this.FURNACE_SIZE,this.FURNACE_SIZE);const t=this.calculateFaceUVs(),n=this.furnaceGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,m=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=m,i[h+6]=d,i[h+7]=m};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.furnaceMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Re(this.furnaceGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.FURNACE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new I(1,0,0);Math.abs(c.dot(h))>.9&&(h=new I(0,0,1));const u=new I().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=F.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const m=new lt;m.setFromUnitVectors(new I(0,1,0),c);const x=new lt;x.setFromAxisAngle(c,d),o.quaternion.copy(x).multiply(m),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const g={mesh:o,position:l.clone(),tileIndex:n,rotation:d,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(g),this.furnaceMeshes.push(o),g}async restoreFurnace(e,t,n,i){if((!this.furnaceGeometry||!this.furnaceMaterial)&&await this.initGeometryAndMaterials(),!this.furnaceGeometry||!this.furnaceMaterial)return console.error("Failed to initialize furnace geometry/materials"),null;const s=this.furnaceMaterial.clone(),o=new Re(this.furnaceGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new lt;l.setFromUnitVectors(new I(0,1,0),a);const c=new lt;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isFurnace=!0,o.userData.tileIndex=n,this.scene.add(o);const h={mesh:o,position:e.clone(),tileIndex:n,rotation:i,fuelAmount:0,smeltingItem:null,smeltingProgress:0,inputCount:0,outputItem:null,outputCount:0};return this.furnaces.push(h),this.furnaceMeshes.push(o),h}removeFurnace(e){const t=this.furnaces.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose(),this.furnaces.splice(t,1);const n=this.furnaceMeshes.indexOf(e.mesh);n!==-1&&this.furnaceMeshes.splice(n,1)}getFurnaceMeshes(){return this.furnaceMeshes}getPlacedFurnaces(){return this.furnaces}getFurnaceByMesh(e){return this.furnaces.find(t=>t.mesh===e)}getFurnaceAtTile(e){return this.furnaces.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.furnaces){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}update(e){let t=!1;for(const n of this.furnaces)if(n.fuelAmount>0&&n.smeltingItem!==null){const i=1/this.SMELT_TIME;if(n.smeltingProgress+=e*i,n.smeltingProgress>=1){const s=ks.find(o=>o.input===n.smeltingItem);s&&((n.outputItem===null||n.outputItem===s.output)&&(n.outputItem=s.output,n.outputCount+=s.outputQuantity),n.fuelAmount--,n.inputCount--,t=!0),n.inputCount>0||(n.smeltingItem=null),n.smeltingProgress=0}}t&&this.onSmeltCompleteCallback&&this.onSmeltCompleteCallback()}exportForSave(){return this.furnaces.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,fuelAmount:e.fuelAmount,smeltingItem:e.smeltingItem,smeltingProgress:e.smeltingProgress,inputCount:e.inputCount,outputItem:e.outputItem,outputCount:e.outputCount}))}}const Gs=27;class zm{constructor(e,t,n){y(this,"scene");y(this,"chests",[]);y(this,"chestMeshes",[]);y(this,"textureLoader");y(this,"chestGeometry",null);y(this,"chestMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"CHEST_SIZE",.8);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.chestMaterial&&this.chestMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Rt("/textures/technology/storage_chest.png"),o,void 0,a)});e.magFilter=ut,e.minFilter=ut,e.wrapS=It,e.wrapT=It,this.chestGeometry=new sn(this.CHEST_SIZE,this.CHEST_SIZE,this.CHEST_SIZE);const t=this.calculateFaceUVs(),n=this.chestGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,m=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=m,i[h+6]=d,i[h+7]=m};s(0,t.side,!0,!0),s(1,t.side,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.side,!0,!0),n.needsUpdate=!0,this.chestMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),side:i(16,0,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createEmptySlots(){const e=[];for(let t=0;t<Gs;t++)e.push({itemType:q.NONE,quantity:0});return e}async placeChest(e,t,n,i){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const s=this.chestMaterial.clone(),o=new Re(this.chestGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.CHEST_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new I(1,0,0);Math.abs(c.dot(h))>.9&&(h=new I(0,0,1));const u=new I().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=F.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const m=new lt;m.setFromUnitVectors(new I(0,1,0),c);const x=new lt;x.setFromAxisAngle(c,d),o.quaternion.copy(x).multiply(m),o.userData.isStorageChest=!0,o.userData.tileIndex=n,this.scene.add(o);const g={mesh:o,position:l.clone(),tileIndex:n,rotation:d,slots:this.createEmptySlots()};return this.chests.push(g),this.chestMeshes.push(o),g}async restoreChest(e,t,n,i,s){if((!this.chestGeometry||!this.chestMaterial)&&await this.initGeometryAndMaterials(),!this.chestGeometry||!this.chestMaterial)return console.error("Failed to initialize chest geometry/materials"),null;const o=this.chestMaterial.clone(),a=new Re(this.chestGeometry,o);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new lt;c.setFromUnitVectors(new I(0,1,0),l);const h=new lt;h.setFromAxisAngle(l,i),a.quaternion.copy(h).multiply(c),a.userData.isStorageChest=!0,a.userData.tileIndex=n,this.scene.add(a);const u={mesh:a,position:e.clone(),tileIndex:n,rotation:i,slots:s||this.createEmptySlots()};return this.chests.push(u),this.chestMeshes.push(a),u}addItemsToChest(e,t,n){if(t===q.NONE)return n;const i=mt[t];let s=n;for(let o=0;o<Gs&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Gs&&s>0;o++){const a=e.slots[o];if(a.itemType===q.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromChest(e){const t=[];for(const n of e.slots)n.itemType!==q.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}removeChest(e){const t=this.chests.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose(),this.chests.splice(t,1);const n=this.chestMeshes.indexOf(e.mesh);n!==-1&&this.chestMeshes.splice(n,1)}getChestMeshes(){return this.chestMeshes}getPlacedChests(){return this.chests}getChestByMesh(e){return this.chests.find(t=>t.mesh===e)}getChestAtTile(e){return this.chests.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.chests){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.chests.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}const Bs=27;class Hm{constructor(e,t,n){y(this,"scene");y(this,"piles",[]);y(this,"pileMeshes",[]);y(this,"textureLoader");y(this,"pileGeometry",null);y(this,"pileMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"PILE_WIDTH",.7);y(this,"PILE_HEIGHT",.3);y(this,"PILE_DEPTH",.7);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pileMaterial&&this.pileMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((t,n)=>{this.textureLoader.load(Rt("/textures/technology/garbage_pile.png"),t,void 0,n)});e.magFilter=ut,e.minFilter=ut,e.wrapS=It,e.wrapT=It,this.pileGeometry=new sn(this.PILE_WIDTH,this.PILE_HEIGHT,this.PILE_DEPTH),this.pileMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi})}createEmptySlots(){const e=[];for(let t=0;t<Bs;t++)e.push({itemType:q.NONE,quantity:0});return e}async placePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Re(this.pileGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.PILE_HEIGHT/2));o.position.copy(l);const c=l.clone().sub(t).normalize(),h=new lt;h.setFromUnitVectors(new I(0,1,0),c),o.quaternion.copy(h),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const u={mesh:o,position:l.clone(),tileIndex:n,slots:this.createEmptySlots()};if(i)for(const d of i)this.addItemsToPile(u,d.itemType,d.quantity);return this.piles.push(u),this.pileMeshes.push(o),u}async restorePile(e,t,n,i){if((!this.pileGeometry||!this.pileMaterial)&&await this.initGeometryAndMaterials(),!this.pileGeometry||!this.pileMaterial)return console.error("Failed to initialize garbage pile geometry/materials"),null;const s=this.pileMaterial.clone(),o=new Re(this.pileGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new lt;l.setFromUnitVectors(new I(0,1,0),a),o.quaternion.copy(l),o.userData.isGarbagePile=!0,o.userData.tileIndex=n,this.scene.add(o);const c={mesh:o,position:e.clone(),tileIndex:n,slots:i||this.createEmptySlots()};return this.piles.push(c),this.pileMeshes.push(o),c}addItemsToPile(e,t,n){if(t===q.NONE)return n;const i=mt[t];let s=n;for(let o=0;o<Bs&&s>0;o++){const a=e.slots[o];if(a.itemType===t&&a.quantity<i.stackSize){const l=Math.min(s,i.stackSize-a.quantity);a.quantity+=l,s-=l}}for(let o=0;o<Bs&&s>0;o++){const a=e.slots[o];if(a.itemType===q.NONE){const l=Math.min(s,i.stackSize);a.itemType=t,a.quantity=l,s-=l}}return s}getAllItemsFromPile(e){const t=[];for(const n of e.slots)n.itemType!==q.NONE&&n.quantity>0&&t.push({itemType:n.itemType,quantity:n.quantity});return t}isPileEmpty(e){return e.slots.every(t=>t.itemType===q.NONE||t.quantity===0)}removePile(e){const t=this.piles.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose(),this.piles.splice(t,1);const n=this.pileMeshes.indexOf(e.mesh);n!==-1&&this.pileMeshes.splice(n,1)}getPileMeshes(){return this.pileMeshes}getPlacedPiles(){return this.piles}getPileByMesh(e){return this.piles.find(t=>t.mesh===e)}getPileAtTile(e){return this.piles.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.piles){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.piles.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,slots:e.slots.map(t=>({itemType:t.itemType,quantity:t.quantity}))}))}}class Wm{constructor(e,t,n){y(this,"scene");y(this,"steamEngines",[]);y(this,"steamEngineMeshes",[]);y(this,"textureLoader");y(this,"steamEngineGeometry",null);y(this,"steamEngineMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"STEAM_ENGINE_SIZE",.8);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.steamEngineMaterial&&this.steamEngineMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Rt("/textures/technology/steam_engine.png"),o,void 0,a)});e.magFilter=ut,e.minFilter=ut,e.wrapS=It,e.wrapT=It,this.steamEngineGeometry=new sn(this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE,this.STEAM_ENGINE_SIZE);const t=this.calculateFaceUVs(),n=this.steamEngineGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,m=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=m,i[h+6]=d,i[h+7]=m};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.steamEngineMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}async placeSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Re(this.steamEngineGeometry,s),a=e.clone().sub(t).normalize(),l=e.clone().add(a.multiplyScalar(this.STEAM_ENGINE_SIZE/2));o.position.copy(l);const c=l.clone().sub(t).normalize();let h=new I(1,0,0);Math.abs(c.dot(h))>.9&&(h=new I(0,0,1));const u=new I().crossVectors(c,h).normalize();h.crossVectors(u,c).normalize();let d=0;if(i){const p=i.clone();p.sub(c.clone().multiplyScalar(p.dot(c))),p.normalize();const _=p.clone().negate();d=Math.atan2(_.dot(u),_.dot(h))}const f=F.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);d+=f;const m=new lt;m.setFromUnitVectors(new I(0,1,0),c);const x=new lt;x.setFromAxisAngle(c,d),o.quaternion.copy(x).multiply(m),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const g={mesh:o,position:l.clone(),tileIndex:n,rotation:d};return this.steamEngines.push(g),this.steamEngineMeshes.push(o),g}async restoreSteamEngine(e,t,n,i){if((!this.steamEngineGeometry||!this.steamEngineMaterial)&&await this.initGeometryAndMaterials(),!this.steamEngineGeometry||!this.steamEngineMaterial)return console.error("Failed to initialize steam engine geometry/materials"),null;const s=this.steamEngineMaterial.clone(),o=new Re(this.steamEngineGeometry,s);o.position.copy(e);const a=e.clone().sub(t).normalize(),l=new lt;l.setFromUnitVectors(new I(0,1,0),a);const c=new lt;c.setFromAxisAngle(a,i),o.quaternion.copy(c).multiply(l),o.userData.isSteamEngine=!0,o.userData.tileIndex=n,this.scene.add(o);const h={mesh:o,position:e.clone(),tileIndex:n,rotation:i};return this.steamEngines.push(h),this.steamEngineMeshes.push(o),h}removeSteamEngine(e){const t=this.steamEngines.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose(),this.steamEngines.splice(t,1);const n=this.steamEngineMeshes.indexOf(e.mesh);n!==-1&&this.steamEngineMeshes.splice(n,1)}getSteamEngineMeshes(){return this.steamEngineMeshes}getPlacedSteamEngines(){return this.steamEngines}getSteamEngineByMesh(e){return this.steamEngines.find(t=>t.mesh===e)}getSteamEngineAtTile(e){return this.steamEngines.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.steamEngines){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.steamEngines.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation}))}}class Vm{constructor(e,t,n){y(this,"scene");y(this,"hydroGenerators",[]);y(this,"hydroGeneratorMeshes",[]);y(this,"textureLoader");y(this,"hydroGeneratorGeometry",null);y(this,"hydroGeneratorMaterial",null);y(this,"strutMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"HYDRO_GENERATOR_SIZE",.8);y(this,"STRUT_WIDTH",.05);y(this,"STRUT_COLOR",6710886);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initGeometryAndMaterials()}setSunDirection(e){this.sunDirection.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.uniforms.planetCenter.value.copy(e)}async initGeometryAndMaterials(){const e=await new Promise((o,a)=>{this.textureLoader.load(Rt("/textures/technology/hydro_generator.png"),o,void 0,a)});e.magFilter=ut,e.minFilter=ut,e.wrapS=It,e.wrapT=It,this.hydroGeneratorGeometry=new sn(this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE,this.HYDRO_GENERATOR_SIZE);const t=this.calculateFaceUVs(),n=this.hydroGeneratorGeometry.attributes.uv,i=n.array,s=(o,a,l=!1,c=!1)=>{const h=o*8,u=l?a.u2:a.u1,d=l?a.u1:a.u2,f=c?a.v2:a.v1,m=c?a.v1:a.v2;i[h+0]=u,i[h+1]=f,i[h+2]=d,i[h+3]=f,i[h+4]=u,i[h+5]=m,i[h+6]=d,i[h+7]=m};s(0,t.sideRight,!0,!0),s(1,t.sideLeft,!1,!0),s(2,t.top,!1,!1),s(3,t.bottom,!1,!1),s(4,t.front,!1,!0),s(5,t.back,!0,!0),n.needsUpdate=!0,this.hydroGeneratorMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi}),this.strutMaterial=new ts({color:this.STRUT_COLOR})}calculateFaceUVs(){const i=(s,o,a,l)=>({u1:s/48,v1:1-(o+l)/32,u2:(s+a)/48,v2:1-o/32});return{front:i(0,0,16,16),sideLeft:i(16,0,16,16),sideRight:i(32,0,16,16),back:i(0,16,16,16),top:i(16,16,16,16),bottom:i(32,16,16,16)}}createStruts(e,t,n){if(n<=0)return null;const i=e.clone().sub(t).normalize(),s=[new I(-.3,0,-.3),new I(.3,0,-.3),new I(-.3,0,.3),new I(.3,0,.3)],o=new I(0,1,0),a=new lt().setFromUnitVectors(o,i),l=[],c=[],h=[];let u=0;const d=this.STRUT_WIDTH/2;for(const x of s){const g=x.clone().applyQuaternion(a),p=e.clone().add(g).sub(i.clone().multiplyScalar(this.HYDRO_GENERATOR_SIZE/2)),_=p.clone().sub(i.clone().multiplyScalar(n));let v=new I(1,0,0);Math.abs(i.dot(v))>.9&&(v=new I(0,0,1));const M=new I().crossVectors(i,v).normalize();v.crossVectors(M,i).normalize();const b=[p.clone().add(v.clone().multiplyScalar(-d)).add(M.clone().multiplyScalar(-d)),p.clone().add(v.clone().multiplyScalar(d)).add(M.clone().multiplyScalar(-d)),p.clone().add(v.clone().multiplyScalar(d)).add(M.clone().multiplyScalar(d)),p.clone().add(v.clone().multiplyScalar(-d)).add(M.clone().multiplyScalar(d)),_.clone().add(v.clone().multiplyScalar(-d)).add(M.clone().multiplyScalar(-d)),_.clone().add(v.clone().multiplyScalar(d)).add(M.clone().multiplyScalar(-d)),_.clone().add(v.clone().multiplyScalar(d)).add(M.clone().multiplyScalar(d)),_.clone().add(v.clone().multiplyScalar(-d)).add(M.clone().multiplyScalar(d))],S=i.clone();l.push(b[0].x,b[0].y,b[0].z),l.push(b[3].x,b[3].y,b[3].z),l.push(b[2].x,b[2].y,b[2].z),l.push(b[1].x,b[1].y,b[1].z);for(let O=0;O<4;O++)c.push(S.x,S.y,S.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4;const C=i.clone().negate();l.push(b[4].x,b[4].y,b[4].z),l.push(b[5].x,b[5].y,b[5].z),l.push(b[6].x,b[6].y,b[6].z),l.push(b[7].x,b[7].y,b[7].z);for(let O=0;O<4;O++)c.push(C.x,C.y,C.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4;const L=v.clone();l.push(b[1].x,b[1].y,b[1].z),l.push(b[2].x,b[2].y,b[2].z),l.push(b[6].x,b[6].y,b[6].z),l.push(b[5].x,b[5].y,b[5].z);for(let O=0;O<4;O++)c.push(L.x,L.y,L.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4;const E=v.clone().negate();l.push(b[3].x,b[3].y,b[3].z),l.push(b[0].x,b[0].y,b[0].z),l.push(b[4].x,b[4].y,b[4].z),l.push(b[7].x,b[7].y,b[7].z);for(let O=0;O<4;O++)c.push(E.x,E.y,E.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4;const T=M.clone();l.push(b[2].x,b[2].y,b[2].z),l.push(b[3].x,b[3].y,b[3].z),l.push(b[7].x,b[7].y,b[7].z),l.push(b[6].x,b[6].y,b[6].z);for(let O=0;O<4;O++)c.push(T.x,T.y,T.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4;const R=M.clone().negate();l.push(b[0].x,b[0].y,b[0].z),l.push(b[1].x,b[1].y,b[1].z),l.push(b[5].x,b[5].y,b[5].z),l.push(b[4].x,b[4].y,b[4].z);for(let O=0;O<4;O++)c.push(R.x,R.y,R.z);h.push(u,u+2,u+1,u,u+3,u+2),u+=4}const f=new yt;f.setAttribute("position",new Oe(l,3)),f.setAttribute("normal",new Oe(c,3)),f.setIndex(h);const m=new Re(f,this.strutMaterial);return m.userData.isHydroGeneratorStrut=!0,m}async placeHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const o=this.hydroGeneratorMaterial.clone(),a=new Re(this.hydroGeneratorGeometry,o),l=e.clone().sub(t).normalize(),c=e.clone().add(l.multiplyScalar(this.HYDRO_GENERATOR_SIZE/2));a.position.copy(c);const h=c.clone().sub(t).normalize();let u=new I(1,0,0);Math.abs(h.dot(u))>.9&&(u=new I(0,0,1));const d=new I().crossVectors(h,u).normalize();u.crossVectors(d,h).normalize();let f=0;if(s){const M=s.clone();M.sub(h.clone().multiplyScalar(M.dot(h))),M.normalize();const b=M.clone().negate();f=Math.atan2(b.dot(d),b.dot(u))}const m=F.TECH_BLOCK_ROTATION_OFFSET*(Math.PI/180);f+=m;const x=new lt;x.setFromUnitVectors(new I(0,1,0),h);const g=new lt;g.setFromAxisAngle(h,f),a.quaternion.copy(g).multiply(x),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const p=this.createStruts(c,t,i);p&&this.scene.add(p);const _=i>0,v={mesh:a,strutMesh:p,position:c.clone(),tileIndex:n,rotation:f,waterDepth:i,isActive:_,waterPumpedIn:_?i*10:0,waterPumpedOut:_?i*8:0};return this.hydroGenerators.push(v),this.hydroGeneratorMeshes.push(a),v}async restoreHydroGenerator(e,t,n,i,s){if((!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)&&await this.initGeometryAndMaterials(),!this.hydroGeneratorGeometry||!this.hydroGeneratorMaterial)return console.error("Failed to initialize hydro generator geometry/materials"),null;const o=this.hydroGeneratorMaterial.clone(),a=new Re(this.hydroGeneratorGeometry,o);a.position.copy(e);const l=e.clone().sub(t).normalize(),c=new lt;c.setFromUnitVectors(new I(0,1,0),l);const h=new lt;h.setFromAxisAngle(l,i),a.quaternion.copy(h).multiply(c),a.userData.isHydroGenerator=!0,a.userData.tileIndex=n,this.scene.add(a);const u=this.createStruts(e,t,s);u&&this.scene.add(u);const d=s>0,f={mesh:a,strutMesh:u,position:e.clone(),tileIndex:n,rotation:i,waterDepth:s,isActive:d,waterPumpedIn:d?s*10:0,waterPumpedOut:d?s*8:0};return this.hydroGenerators.push(f),this.hydroGeneratorMeshes.push(a),f}removeHydroGenerator(e){const t=this.hydroGenerators.indexOf(e);if(t===-1)return;this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose(),e.strutMesh&&(this.scene.remove(e.strutMesh),e.strutMesh.geometry.dispose()),this.hydroGenerators.splice(t,1);const n=this.hydroGeneratorMeshes.indexOf(e.mesh);n!==-1&&this.hydroGeneratorMeshes.splice(n,1)}getHydroGeneratorMeshes(){return this.hydroGeneratorMeshes}getPlacedHydroGenerators(){return this.hydroGenerators}getHydroGeneratorByMesh(e){return this.hydroGenerators.find(t=>t.mesh===e)}getHydroGeneratorAtTile(e){return this.hydroGenerators.find(t=>t.tileIndex===e)}updateTorchLighting(e,t,n){for(const i of this.hydroGenerators){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s)}}exportForSave(){return this.hydroGenerators.map(e=>({position:{x:e.position.x,y:e.position.y,z:e.position.z},tileIndex:e.tileIndex,rotation:e.rotation,waterDepth:e.waterDepth}))}dispose(){for(const e of[...this.hydroGenerators])this.removeHydroGenerator(e);this.hydroGeneratorGeometry&&this.hydroGeneratorGeometry.dispose(),this.hydroGeneratorMaterial&&this.hydroGeneratorMaterial.dispose(),this.strutMaterial&&this.strutMaterial.dispose()}}class qm{constructor(e,t,n){y(this,"scene");y(this,"pipes",new Map);y(this,"networks",new Map);y(this,"textureLoader");y(this,"pipeMaterial",null);y(this,"planetCenter");y(this,"sunDirection");y(this,"PIPE_SIZE",.2);y(this,"CONNECTOR_SIZE",.08);y(this,"getHydroGeneratorAtTile",null);y(this,"getSteamEngineAtTile",null);y(this,"getNeighborTiles",null);this.scene=e,this.textureLoader=new ei,this.planetCenter=(t==null?void 0:t.clone())||new I(0,0,0),this.sunDirection=(n==null?void 0:n.clone())||new I(1,0,0),this.initMaterial()}setMachineCallbacks(e,t,n){this.getHydroGeneratorAtTile=e,this.getSteamEngineAtTile=t,this.getNeighborTiles=n}setSunDirection(e){this.sunDirection.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.sunDirection.value.copy(e)}setPlanetCenter(e){this.planetCenter.copy(e),this.pipeMaterial&&this.pipeMaterial.uniforms.planetCenter.value.copy(e)}async initMaterial(){const e=await new Promise((t,n)=>{this.textureLoader.load(Rt("/textures/technology/copper_pipe.png"),t,void 0,n)});e.magFilter=ut,e.minFilter=ut,e.wrapS=Qn,e.wrapT=Qn,this.pipeMaterial=new et({uniforms:{techTexture:{value:e},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY},torchLight:{value:0}},vertexShader:Ii,fragmentShader:Pi})}generatePipeId(e,t){return`pipe_${e}_${t}`}createPipeMesh(e){const t=new sn(this.PIPE_SIZE,this.PIPE_SIZE,this.PIPE_SIZE),n=this.pipeMaterial.clone(),i=new Re(t,n),s=e.clone().sub(this.planetCenter).normalize(),o=new lt().setFromUnitVectors(new I(0,1,0),s);return i.quaternion.copy(o),i.position.copy(e),i.userData.isCopperPipe=!0,i}createConnectorMesh(e,t){const n=e.clone().add(t).multiplyScalar(.5),i=t.clone().sub(e),s=i.length(),o=new sn(this.CONNECTOR_SIZE,this.CONNECTOR_SIZE,s),a=this.pipeMaterial.clone(),l=new Re(o,a);l.position.copy(n);const c=i.normalize(),h=new lt;return h.setFromUnitVectors(new I(0,0,1),c),l.quaternion.copy(h),l.userData.isPipeConnector=!0,l}async placePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return console.error("Failed to initialize pipe material"),null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=e.clone().sub(this.planetCenter).normalize(),o=e.clone().add(s.clone().multiplyScalar(this.PIPE_SIZE/2)),a=this.createPipeMesh(o);a.userData.pipeId=i,a.userData.tileIndex=t,a.userData.depth=n,this.scene.add(a);const l={id:i,mesh:a,position:o.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,l),this.updatePipeConnections(l),this.updateVisualConnectors(l),this.rebuildNetworks(),l}updateVisualConnectors(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof et&&t.material.dispose();e.connectorMeshes=[];for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);if(n&&e.id<n.id){const i=this.createConnectorMesh(e.position,n.position);this.scene.add(i),e.connectorMeshes.push(i)}}for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);n&&n.id<e.id&&this.rebuildConnectorsForPipe(n)}}rebuildConnectorsForPipe(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof et&&t.material.dispose();e.connectorMeshes=[];for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);if(n&&e.id<n.id){const i=this.createConnectorMesh(e.position,n.position);this.scene.add(i),e.connectorMeshes.push(i)}}}updatePipeConnections(e){if(e.connections=[],!this.getNeighborTiles)return;const t=this.getNeighborTiles(e.tileIndex);for(const n of t){const i=this.generatePipeId(n,e.depth),s=this.pipes.get(i);s&&(e.connections.push({type:"pipe",pipeId:i}),s.connections.find(o=>o.type==="pipe"&&o.pipeId===e.id)||s.connections.push({type:"pipe",pipeId:e.id})),this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(n)&&e.connections.push({type:"hydro-generator",tileIndex:n}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(n)&&e.connections.push({type:"steam-engine",tileIndex:n})}this.getHydroGeneratorAtTile&&this.getHydroGeneratorAtTile(e.tileIndex)&&e.connections.push({type:"hydro-generator",tileIndex:e.tileIndex}),this.getSteamEngineAtTile&&this.getSteamEngineAtTile(e.tileIndex)&&e.connections.push({type:"steam-engine",tileIndex:e.tileIndex})}rebuildNetworks(){this.networks.clear();const e=new Set;for(const[t,n]of this.pipes){if(e.has(t))continue;const i={id:`network_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,pipes:[],connectedHydroGenerators:[],connectedSteamEngines:[]},s=[t];for(;s.length>0;){const o=s.pop();if(e.has(o))continue;e.add(o);const a=this.pipes.get(o);if(a){i.pipes.push(o);for(const l of a.connections)l.type==="pipe"?e.has(l.pipeId)||s.push(l.pipeId):l.type==="hydro-generator"?i.connectedHydroGenerators.includes(l.tileIndex)||i.connectedHydroGenerators.push(l.tileIndex):l.type==="steam-engine"&&(i.connectedSteamEngines.includes(l.tileIndex)||i.connectedSteamEngines.push(l.tileIndex))}}this.networks.set(i.id,i)}}isHydroConnectedToSteam(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e)&&t.connectedSteamEngines.length>0)return!0;return!1}getConnectedSteamEngines(e){for(const t of this.networks.values())if(t.connectedHydroGenerators.includes(e))return t.connectedSteamEngines;return[]}getConnectedHydroGenerators(e){for(const t of this.networks.values())if(t.connectedSteamEngines.includes(e))return t.connectedHydroGenerators;return[]}getPipeNetwork(e){for(const t of this.networks.values())if(t.pipes.includes(e))return t;return null}getPipeAt(e,t){const n=this.generatePipeId(e,t);return this.pipes.get(n)}getPipeByMesh(e){const t=e.userData.pipeId;if(t)return this.pipes.get(t)}removePipe(e){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof et&&t.material.dispose();e.connectorMeshes=[],this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose();for(const t of e.connections)if(t.type==="pipe"){const n=this.pipes.get(t.pipeId);n&&(n.connections=n.connections.filter(i=>!(i.type==="pipe"&&i.pipeId===e.id)),this.rebuildConnectorsForPipe(n))}this.pipes.delete(e.id),this.rebuildNetworks()}getPipeMeshes(){return Array.from(this.pipes.values()).map(e=>e.mesh)}getPlacedPipes(){return Array.from(this.pipes.values())}updateTorchLighting(e,t,n){for(const i of this.pipes.values()){let s=0;for(const a of e){const l=i.position.distanceTo(a);if(l<t){const h=1/(1+2*l*l/(t*t));s+=h*n}}s=Math.min(1.5,s);const o=i.mesh.material;o.uniforms&&o.uniforms.torchLight&&(o.uniforms.torchLight.value=s);for(const a of i.connectorMeshes){const l=a.material;l.uniforms&&l.uniforms.torchLight&&(l.uniforms.torchLight.value=s)}}}exportForSave(){return Array.from(this.pipes.values()).map(e=>({tileIndex:e.tileIndex,depth:e.depth,position:{x:e.position.x,y:e.position.y,z:e.position.z}}))}async restorePipe(e,t,n){if(this.pipeMaterial||await this.initMaterial(),!this.pipeMaterial)return null;const i=this.generatePipeId(t,n);if(this.pipes.has(i))return null;const s=this.createPipeMesh(e);s.userData.pipeId=i,s.userData.tileIndex=t,s.userData.depth=n,this.scene.add(s);const o={id:i,mesh:s,position:e.clone(),tileIndex:t,depth:n,connections:[],connectorMeshes:[]};return this.pipes.set(i,o),o}rebuildAllConnections(){for(const e of this.pipes.values())this.updatePipeConnections(e);for(const e of this.pipes.values())this.rebuildConnectorsForPipe(e);this.rebuildNetworks()}dispose(){for(const e of this.pipes.values()){for(const t of e.connectorMeshes)this.scene.remove(t),t.geometry.dispose(),t.material instanceof et&&t.material.dispose();this.scene.remove(e.mesh),e.mesh.geometry.dispose(),e.mesh.material instanceof et&&e.mesh.material.dispose()}this.pipes.clear(),this.networks.clear(),this.pipeMaterial&&this.pipeMaterial.dispose()}}const Jn=class Jn{constructor(){y(this,"registeredMenus",new Map);y(this,"pendingPointerLock",!1);y(this,"initialized",!1);y(this,"onMenuCloseCallback",null)}static getInstance(){return Jn.instance||(Jn.instance=new Jn),Jn.instance}init(){this.initialized||(this.initialized=!0,document.addEventListener("keyup",e=>{this.pendingPointerLock&&(e.key==="e"||e.key==="E"||e.key==="Escape")&&(this.pendingPointerLock=!1,this.isAnyMenuOpen()||this.requestPointerLock())}))}registerMenu(e,t){this.registeredMenus.set(e,t)}unregisterMenu(e){this.registeredMenus.delete(e)}isAnyMenuOpen(){for(const e of this.registeredMenus.values())if(e.isOpen())return!0;return!1}requestPointerLock(){const e=document.getElementById("game-container");e&&e.requestPointerLock()}schedulePointerLockOnKeyup(){this.pendingPointerLock=!0}restorePointerLockOnClick(){this.triggerMenuCloseCallback(),setTimeout(()=>{this.isAnyMenuOpen()||this.requestPointerLock()},0)}setupCloseButton(e,t,n){if(!t)return;const i=t.querySelector(e);i&&i.addEventListener("click",()=>{n(),this.restorePointerLockOnClick()})}openMenu(){document.exitPointerLock()}closeMenuViaKeyboard(){this.schedulePointerLockOnKeyup(),this.triggerMenuCloseCallback()}setOnMenuCloseCallback(e){this.onMenuCloseCallback=e}triggerMenuCloseCallback(){this.onMenuCloseCallback&&this.onMenuCloseCallback()}};y(Jn,"instance",null);let wo=Jn;const Yt=wo.getInstance(),Rs=[{name:"Wood Planks",inputs:[{itemType:q.LOG,quantity:1,slot:4}],output:{itemType:q.WOOD,quantity:4}},{name:"Sticks",inputs:[{itemType:q.WOOD,quantity:1,slot:1},{itemType:q.WOOD,quantity:1,slot:4}],output:{itemType:q.STICK,quantity:4}},{name:"Coal",inputs:[{itemType:q.ORE_COAL,quantity:1,slot:4}],output:{itemType:q.COAL,quantity:8}},{name:"Torch",inputs:[{itemType:q.COAL,quantity:1,slot:1},{itemType:q.STICK,quantity:1,slot:4}],output:{itemType:q.TORCH,quantity:4}},{name:"Fishing Rod",inputs:[{itemType:q.STICK,quantity:1,slot:1},{itemType:q.STICK,quantity:1,slot:4},{itemType:q.STICK,quantity:1,slot:7}],output:{itemType:q.FISHING_ROD,quantity:1}},{name:"Furnace",inputs:[{itemType:q.STONE,quantity:1,slot:0},{itemType:q.STONE,quantity:1,slot:1},{itemType:q.STONE,quantity:1,slot:2},{itemType:q.STONE,quantity:1,slot:3},{itemType:q.STONE,quantity:1,slot:5},{itemType:q.STONE,quantity:1,slot:6},{itemType:q.STONE,quantity:1,slot:7},{itemType:q.STONE,quantity:1,slot:8}],output:{itemType:q.FURNACE,quantity:1}},{name:"Storage Chest",inputs:[{itemType:q.WOOD,quantity:1,slot:0},{itemType:q.WOOD,quantity:1,slot:1},{itemType:q.WOOD,quantity:1,slot:2},{itemType:q.WOOD,quantity:1,slot:3},{itemType:q.WOOD,quantity:1,slot:5},{itemType:q.WOOD,quantity:1,slot:6},{itemType:q.WOOD,quantity:1,slot:7},{itemType:q.WOOD,quantity:1,slot:8}],output:{itemType:q.STORAGE_CHEST,quantity:1}},{name:"Steam Engine",inputs:[{itemType:q.INGOT_IRON,quantity:1,slot:0},{itemType:q.INGOT_IRON,quantity:1,slot:1},{itemType:q.INGOT_IRON,quantity:1,slot:2},{itemType:q.INGOT_COPPER,quantity:1,slot:3},{itemType:q.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:q.INGOT_COPPER,quantity:1,slot:5},{itemType:q.INGOT_IRON,quantity:1,slot:6},{itemType:q.INGOT_IRON,quantity:1,slot:7},{itemType:q.INGOT_IRON,quantity:1,slot:8}],output:{itemType:q.STEAM_ENGINE,quantity:1}},{name:"Hydro Generator",inputs:[{itemType:q.INGOT_IRON,quantity:1,slot:0},{itemType:q.INGOT_IRON,quantity:1,slot:1},{itemType:q.INGOT_IRON,quantity:1,slot:2},{itemType:q.INGOT_ALUMINUM,quantity:1,slot:3},{itemType:q.INGOT_ALUMINUM,quantity:1,slot:4},{itemType:q.INGOT_ALUMINUM,quantity:1,slot:5},{itemType:q.INGOT_IRON,quantity:1,slot:6},{itemType:q.INGOT_IRON,quantity:1,slot:7},{itemType:q.INGOT_IRON,quantity:1,slot:8}],output:{itemType:q.HYDRO_GENERATOR,quantity:1}},{name:"Copper Pipe",inputs:[{itemType:q.INGOT_COPPER,quantity:1,slot:4}],output:{itemType:q.COPPER_PIPE,quantity:4}}];class Xm{constructor(e){y(this,"inventory");y(this,"menuElement",null);y(this,"recipeSelectElement",null);y(this,"craftingGridElement",null);y(this,"craftingOutputElement",null);y(this,"craftBtnElement",null);y(this,"inventoryGridElement",null);y(this,"inventoryHotbarElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onSaveCallback",null);y(this,"selectedRecipe",null);y(this,"draggedSlotIndex",null);y(this,"dragGhost",null);y(this,"touchDragSlotIndex",null);y(this,"touchDragGhost",null);y(this,"onFurnaceDropCallback",null);y(this,"onStorageDropCallback",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler(),Yt.registerMenu("inventory",{isOpen:()=>this.isOpen,close:()=>this.close()})}setupUI(){this.menuElement=document.getElementById("inventory-menu"),this.recipeSelectElement=document.getElementById("recipe-select"),this.craftingGridElement=document.getElementById("crafting-grid"),this.craftingOutputElement=document.getElementById("crafting-output"),this.craftBtnElement=document.getElementById("craft-btn"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.menuElement&&this.menuElement.addEventListener("contextmenu",e=>e.preventDefault()),this.createInventorySlots(),Yt.setupCloseButton(".close-inventory",this.menuElement,()=>this.close()),this.populateRecipeDropdown(),this.recipeSelectElement&&this.recipeSelectElement.addEventListener("change",()=>this.onRecipeSelect()),this.craftBtnElement&&this.craftBtnElement.addEventListener("click",()=>this.craftSelectedRecipe())}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString(),t.draggable=!0;const n=document.createElement("img");n.style.display="none",n.draggable=!1,t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t.addEventListener("dragstart",s=>this.handleDragStart(s,e)),t.addEventListener("dragend",()=>this.handleDragEnd()),t.addEventListener("dragover",s=>this.handleDragOver(s)),t.addEventListener("dragleave",s=>this.handleDragLeave(s)),t.addEventListener("drop",s=>this.handleDrop(s,e)),t.addEventListener("touchstart",s=>this.handleTouchStart(s,e),{passive:!1}),t.addEventListener("touchmove",s=>this.handleTouchMove(s),{passive:!1}),t.addEventListener("touchend",s=>this.handleTouchEnd(s),{passive:!1}),t}handleTouchStart(e,t){const n=this.inventory.getSlot(t);if(!n||n.itemType===q.NONE)return;e.preventDefault(),this.touchDragSlotIndex=t;const i=e.touches[0];e.currentTarget.classList.add("dragging");const o=document.createElement("div");o.className="drag-ghost";const a=mt[n.itemType];o.innerHTML=`<img src="${Rt(a.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(o.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),o.style.position="fixed",o.style.left=`${i.clientX-25}px`,o.style.top=`${i.clientY-25}px`,o.style.pointerEvents="none",o.style.zIndex="9999",o.style.background="rgba(0,0,0,0.8)",o.style.border="2px solid #4CAF50",o.style.borderRadius="4px",o.style.padding="4px",document.body.appendChild(o),this.touchDragGhost=o}handleTouchMove(e){if(this.touchDragSlotIndex===null||!this.touchDragGhost)return;e.preventDefault();const t=e.touches[0];this.touchDragGhost.style.left=`${t.clientX-25}px`,this.touchDragGhost.style.top=`${t.clientY-25}px`,document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")});const n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");i&&i.classList.add("drag-over")}handleTouchEnd(e){if(this.touchDragSlotIndex===null)return;e.preventDefault();const t=e.changedTouches[0],n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");if(i){const s=parseInt(i.dataset.slot||"-1");s>=0&&s!==this.touchDragSlotIndex&&(this.inventory.swapSlots(this.touchDragSlotIndex,s),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}document.querySelectorAll(".inventory-slot.dragging").forEach(s=>{s.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(s=>{s.classList.remove("drag-over")}),this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null),this.touchDragSlotIndex=null}handleDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===q.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=mt[n.itemType];s.innerHTML=`<img src="${Rt(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.onFurnaceDropCallback&&this.onFurnaceDropCallback(t,a)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}if(i&&i.startsWith("storage:")){this.onStorageDropCallback&&this.onStorageDropCallback(t,i)&&(this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),Yt.closeMenuViaKeyboard(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),Yt.closeMenuViaKeyboard(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,Yt.openMenu(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.cancelDrag(),this.onCloseCallback&&this.onCloseCallback())}cancelDrag(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null),this.touchDragSlotIndex=null,this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null)}isMenuOpen(){return this.isOpen}toggle(){this.isOpen?this.close():this.open()}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnFurnaceDropCallback(e){this.onFurnaceDropCallback=e}setOnStorageDropCallback(e){this.onStorageDropCallback=e}updateInventorySlotsPublic(){this.updateInventorySlots()}updateUI(){this.updateInventorySlots(),this.updateCraftingGrid()}updateInventorySlots(){var i,s;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((o,a)=>{const l=9+a;this.updateSlotElement(o,e[l])});const n=(s=this.inventoryHotbarElement)==null?void 0:s.querySelectorAll(".inventory-slot");n==null||n.forEach((o,a)=>{this.updateSlotElement(o,e[a])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");let s=e.querySelector(".item-tooltip");if(t.itemType!==q.NONE&&t.quantity>0){const o=mt[t.itemType];n&&(n.src=Rt(o.texture),n.style.display="block",this.applyAtlasRegionStyle(n,o)),i&&(i.textContent=t.quantity>1?t.quantity.toString():""),s||(s=document.createElement("span"),s.className="item-tooltip",e.appendChild(s)),s.textContent=o.name}else n&&(n.style.display="none",this.resetAtlasRegionStyle(n)),i&&(i.textContent=""),s&&s.remove()}applyAtlasRegionStyle(e,t){this.applyAtlasRegionStyleWithSize(e,t,40)}applyAtlasRegionStyleWithSize(e,t,n){if(t.atlasRegion){const{x:i,y:s,width:o,height:a,atlasWidth:l,atlasHeight:c}=t.atlasRegion,h=l/o,u=c/a;e.style.objectFit="none",e.style.objectPosition=`${-i*(n/o)}px ${-s*(n/a)}px`,e.style.width=`${n*h}px`,e.style.height=`${n*u}px`,e.style.transform=`scale(${1/h}, ${1/u})`,e.style.transformOrigin="top left"}else this.resetAtlasRegionStyleWithSize(e,n)}resetAtlasRegionStyle(e){this.resetAtlasRegionStyleWithSize(e,40)}resetAtlasRegionStyleWithSize(e,t){e.style.objectFit="",e.style.objectPosition="",e.style.width=`${t}px`,e.style.height=`${t}px`,e.style.transform="",e.style.transformOrigin=""}populateRecipeDropdown(){if(this.recipeSelectElement){this.recipeSelectElement.innerHTML='<option value="">-- Select Recipe --</option>';for(let e=0;e<Rs.length;e++){const t=Rs[e],n=document.createElement("option");n.value=e.toString(),n.textContent=t.name,this.recipeSelectElement.appendChild(n)}}}onRecipeSelect(){if(!this.recipeSelectElement)return;const e=parseInt(this.recipeSelectElement.value);isNaN(e)||e<0||e>=Rs.length?this.selectedRecipe=null:this.selectedRecipe=Rs[e],this.updateCraftingGrid()}updateCraftingGrid(){var i;const e=(i=this.craftingGridElement)==null?void 0:i.querySelectorAll(".crafting-slot");if(e==null||e.forEach(s=>{const o=s.querySelector("img"),a=s.querySelector(".slot-count"),l=s.querySelector(".item-tooltip");o&&(o.style.display="none"),a&&(a.textContent=""),l&&l.remove(),s.classList.remove("has-item","missing-item")}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count");s&&(s.style.display="none"),o&&(o.textContent=""),this.craftingOutputElement.classList.remove("has-item")}if(this.craftBtnElement&&(this.craftBtnElement.disabled=!0),!this.selectedRecipe)return;const t=new Map;for(const s of this.selectedRecipe.inputs){const o=t.get(s.itemType)||0;t.set(s.itemType,o+s.quantity)}let n=!0;if(!F.DEBUG_BYPASS_CRAFTING_INGREDIENTS){for(const[s,o]of t)if(!this.inventory.hasItem(s,o)){n=!1;break}}if(this.selectedRecipe.inputs.forEach((s,o)=>{const a=s.slot!==void 0?s.slot:o;if(a<9&&e&&e[a]){const l=e[a],c=l.querySelector("img"),h=l.querySelector(".slot-count"),u=mt[s.itemType];c&&(c.src=Rt(u.texture),c.style.display="block",this.applyAtlasRegionStyle(c,u)),h&&(h.textContent=s.quantity>1?s.quantity.toString():"");let d=l.querySelector(".item-tooltip");if(d||(d=document.createElement("span"),d.className="item-tooltip",l.appendChild(d)),d.textContent=u.name,n)l.classList.add("has-item");else{const f=t.get(s.itemType)||0;this.inventory.hasItem(s.itemType,f)?l.classList.add("has-item"):l.classList.add("missing-item")}}}),this.craftingOutputElement){const s=this.craftingOutputElement.querySelector("img"),o=this.craftingOutputElement.querySelector(".slot-count"),a=mt[this.selectedRecipe.output.itemType];s&&(s.src=Rt(a.texture),s.style.display="block",this.applyAtlasRegionStyleWithSize(s,a,48)),o&&(o.textContent=this.selectedRecipe.output.quantity>1?this.selectedRecipe.output.quantity.toString():""),n&&this.craftingOutputElement.classList.add("has-item")}this.craftBtnElement&&(this.craftBtnElement.disabled=!n)}canCraft(e){if(F.DEBUG_BYPASS_CRAFTING_INGREDIENTS)return!0;for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craftSelectedRecipe(){if(!(!this.selectedRecipe||!this.canCraft(this.selectedRecipe))){if(!F.DEBUG_BYPASS_CRAFTING_INGREDIENTS)for(const e of this.selectedRecipe.inputs)this.inventory.removeItem(e.itemType,e.quantity);this.inventory.addItem(this.selectedRecipe.output.itemType,this.selectedRecipe.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback()}}}class Ym{constructor(){y(this,"currentHydroGenerator",null);y(this,"hydroGeneratorSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"waterInElement",null);y(this,"poweredElement",null);y(this,"waterOutElement",null);y(this,"statusIndicatorElement",null);y(this,"waterCanvas",null);y(this,"waterCtx",null);y(this,"animationFrameId",null);y(this,"waterLevel",0);y(this,"targetWaterLevel",0);y(this,"waveOffset",0);y(this,"turbineRotation",0);y(this,"lastAnimationTime",0);y(this,"isConnectedToSteamEngine",null);y(this,"connectedToSteam",!1);this.createUI(),this.setupKeyboardHandler(),Yt.registerMenu("hydro-generator",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.hydroGeneratorSectionElement=document.createElement("div"),this.hydroGeneratorSectionElement.id="hydro-generator-section",this.hydroGeneratorSectionElement.className="hydro-generator-section",this.hydroGeneratorSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){var t;this.currentHydroGenerator=e,this.isOpen=!0,this.connectedToSteam=((t=this.isConnectedToSteamEngine)==null?void 0:t.call(this,e.tileIndex))??!1,this.waterLevel=0,this.targetWaterLevel=e.isActive?.75:0,this.waveOffset=0,this.turbineRotation=0,this.lastAnimationTime=performance.now(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startWaterAnimation()}close(){this.currentHydroGenerator=null,this.isOpen=!1,this.stopWaterAnimation(),this.hydroGeneratorSectionElement&&(this.hydroGeneratorSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentHydroGenerator(){return this.currentHydroGenerator}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setConnectionCallback(e){this.isConnectedToSteamEngine=e}updateUI(){var i;if(!this.currentHydroGenerator)return;const e=this.currentHydroGenerator;this.connectedToSteam=((i=this.isConnectedToSteamEngine)==null?void 0:i.call(this,e.tileIndex))??!1;const t=e.isActive&&this.connectedToSteam;if(this.statusIndicatorElement){this.statusIndicatorElement.classList.remove("active","inactive"),this.statusIndicatorElement.classList.add(t?"active":"inactive");const s=this.statusIndicatorElement.querySelector(".status-text");s&&(t?s.textContent="Online":e.isActive?s.textContent="Offline":s.textContent="No Water")}this.waterInElement&&(this.waterInElement.textContent=`${e.waterPumpedIn.toFixed(1)} units/s`),this.poweredElement&&(this.connectedToSteam?(this.poweredElement.textContent="Connected",this.poweredElement.style.color="#44FF44"):(this.poweredElement.textContent="Disconnected",this.poweredElement.style.color="#FF4444")),this.waterOutElement&&(this.connectedToSteam&&e.isActive?this.waterOutElement.textContent=`${e.waterPumpedOut.toFixed(1)} units/s`:this.waterOutElement.textContent="0 units/s");const n=document.getElementById("hydro-water-depth");n&&(n.textContent=Math.round(e.waterDepth).toString())}startWaterAnimation(){if(this.animationFrameId!==null)return;const e=t=>{var s;if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t;const i=.15;this.waterLevel<this.targetWaterLevel?this.waterLevel=Math.min(this.targetWaterLevel,this.waterLevel+i*n):this.waterLevel>this.targetWaterLevel&&(this.waterLevel=Math.max(this.targetWaterLevel,this.waterLevel-i*n)),this.waveOffset+=n*2,this.connectedToSteam&&((s=this.currentHydroGenerator)!=null&&s.isActive)&&(this.turbineRotation+=n*3),this.drawWaterAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopWaterAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}drawWaterAnimation(){if(!this.waterCanvas||!this.waterCtx)return;const e=this.waterCtx,t=this.waterCanvas.width,n=this.waterCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#0a0a1a",e.fillRect(0,0,t,n);const i=n*this.waterLevel,s=n-i;if(this.waterLevel>.01){const o=e.createLinearGradient(0,s,0,n);o.addColorStop(0,"rgba(30, 100, 150, 0.9)"),o.addColorStop(.5,"rgba(20, 80, 130, 0.95)"),o.addColorStop(1,"rgba(10, 50, 100, 1)"),e.fillStyle=o,e.fillRect(0,s,t,i),e.beginPath(),e.moveTo(0,s);for(let c=0;c<=t;c+=2){const h=Math.sin(c*.1+this.waveOffset)*2,u=Math.sin(c*.15+this.waveOffset*1.3)*1.5,d=s+h+u;e.lineTo(c,d)}e.lineTo(t,s),e.lineTo(t,s-10),e.lineTo(0,s-10),e.closePath();const a=e.createLinearGradient(0,s-5,0,s+5);a.addColorStop(0,"rgba(60, 140, 200, 0.3)"),a.addColorStop(1,"rgba(30, 100, 150, 0.9)"),e.fillStyle=a,e.fill(),e.fillStyle="rgba(150, 200, 255, 0.3)";const l=Math.floor(this.waterLevel*5);for(let c=0;c<l;c++){const h=(Math.sin(this.waveOffset*.5+c*1.7)*.5+.5)*t,u=s+(Math.cos(this.waveOffset+c*2.3)*.5+.5)*i*.7,d=1+Math.sin(this.waveOffset+c)*.5;e.beginPath(),e.arc(h,u,d,0,Math.PI*2),e.fill()}}this.drawTurbine(e,t/2,n/2),e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2),e.fillStyle="#555",e.fillRect(0,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(2,n*.3-2,4,4),e.fillStyle="#555",e.fillRect(t-8,n*.3-4,8,8),e.fillStyle="#333",e.fillRect(t-6,n*.3-2,4,4)}drawTurbine(e,t,n){e.save(),e.translate(t,n),e.rotate(this.turbineRotation);for(let l=0;l<6;l++){const c=l/6*Math.PI*2;e.save(),e.rotate(c),e.fillStyle="#666",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(24,-4/3),e.lineTo(24,4/3),e.lineTo(6,4/2),e.closePath(),e.fill(),e.fillStyle="#888",e.beginPath(),e.moveTo(6,-4/2),e.lineTo(6+18*.7,-4/3),e.lineTo(6+18*.7,0),e.lineTo(6,0),e.closePath(),e.fill(),e.restore()}e.beginPath(),e.arc(0,0,6,0,Math.PI*2),e.fillStyle="#555",e.fill(),e.strokeStyle="#777",e.lineWidth=1,e.stroke(),e.beginPath(),e.arc(0,0,2,0,Math.PI*2),e.fillStyle="#888",e.fill(),e.restore()}}class $m{constructor(){y(this,"currentSteamEngine",null);y(this,"steamEngineSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"inventory",null);y(this,"onSaveCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"engineStates",new Map);y(this,"fuelAmountElement",null);y(this,"waterInputElement",null);y(this,"steamOutputElement",null);y(this,"statusIndicatorElement",null);y(this,"addFuelBtnElement",null);y(this,"steamCanvas",null);y(this,"steamCtx",null);y(this,"animationFrameId",null);y(this,"lastAnimationTime",0);y(this,"steamParticles",[]);y(this,"getConnectedHydroGenerators",null);y(this,"getHydroGeneratorWaterOutput",null);this.createUI(),this.setupKeyboardHandler(),Yt.registerMenu("steam-engine",{isOpen:()=>this.isOpen,close:()=>this.close()})}setInventory(e){this.inventory=e}setSaveCallback(e){this.onSaveCallback=e}setUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setConnectionCallbacks(e,t){this.getConnectedHydroGenerators=e,this.getHydroGeneratorWaterOutput=t}createUI(){this.steamEngineSectionElement=document.createElement("div"),this.steamEngineSectionElement.id="steam-engine-section",this.steamEngineSectionElement.className="steam-engine-section",this.steamEngineSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(e){this.currentSteamEngine=e,this.isOpen=!0,this.engineStates.has(e.tileIndex)||this.engineStates.set(e.tileIndex,{hasFuel:!1,fuelAmount:0,isRunning:!1,waterInput:0,steamOutput:0}),this.steamParticles=[],this.lastAnimationTime=performance.now(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="flex"),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateUI(),this.startAnimation()}close(){this.currentSteamEngine=null,this.isOpen=!1,this.stopAnimation(),this.steamEngineSectionElement&&(this.steamEngineSectionElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}isMenuOpen(){return this.isOpen}getCurrentSteamEngine(){return this.currentSteamEngine}setOnCloseCallback(e){this.onCloseCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}getEngineState(e){return this.engineStates.get(e)}addFuel(){if(!this.currentSteamEngine||!this.inventory)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);e&&this.inventory.hasItem(q.COAL,1)&&(this.inventory.removeItem(q.COAL,1),e.fuelAmount+=1,e.hasFuel=!0,this.updateRunningState(e),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onSaveCallback&&this.onSaveCallback())}updateRunningState(e){let t=0;if(this.currentSteamEngine&&this.getConnectedHydroGenerators&&this.getHydroGeneratorWaterOutput){const n=this.getConnectedHydroGenerators(this.currentSteamEngine.tileIndex);for(const i of n)t+=this.getHydroGeneratorWaterOutput(i)}e.waterInput=t,e.isRunning=e.hasFuel&&e.fuelAmount>0&&t>0,e.steamOutput=e.isRunning?t*.8:0}updateUI(){if(!this.currentSteamEngine)return;const e=this.engineStates.get(this.currentSteamEngine.tileIndex);if(e&&(this.updateRunningState(e),this.statusIndicatorElement&&(this.statusIndicatorElement.classList.remove("running","idle","no-water"),e.isRunning?(this.statusIndicatorElement.classList.add("running"),this.statusIndicatorElement.querySelector(".status-text").textContent="Running"):e.hasFuel&&e.waterInput===0?(this.statusIndicatorElement.classList.add("no-water"),this.statusIndicatorElement.querySelector(".status-text").textContent="No Water"):(this.statusIndicatorElement.classList.add("idle"),this.statusIndicatorElement.querySelector(".status-text").textContent="Idle")),this.fuelAmountElement&&(this.fuelAmountElement.textContent=e.fuelAmount.toString()),this.waterInputElement&&(this.waterInputElement.textContent=`${e.waterInput.toFixed(1)} units/s`),this.steamOutputElement&&(this.steamOutputElement.textContent=`${e.steamOutput.toFixed(1)} units/s`),this.addFuelBtnElement&&this.inventory)){const t=this.inventory.hasItem(q.COAL,1);this.addFuelBtnElement.disabled=!t,this.addFuelBtnElement.textContent=t?"Add Coal":"No Coal"}}startAnimation(){if(this.animationFrameId!==null)return;const e=t=>{if(!this.isOpen)return;const n=(t-this.lastAnimationTime)/1e3;this.lastAnimationTime=t,this.updateSteamParticles(n),this.drawSteamAnimation(),this.animationFrameId=requestAnimationFrame(e)};this.animationFrameId=requestAnimationFrame(e)}stopAnimation(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}updateSteamParticles(e){const t=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;((t==null?void 0:t.isRunning)??!1)&&Math.random()<e*10&&this.steamParticles.push({x:60+(Math.random()-.5)*20,y:70,size:3+Math.random()*4,opacity:.6+Math.random()*.3,vx:(Math.random()-.5)*10,vy:-20-Math.random()*15});for(let i=this.steamParticles.length-1;i>=0;i--){const s=this.steamParticles[i];s.x+=s.vx*e,s.y+=s.vy*e,s.size+=e*8,s.opacity-=e*.5,(s.opacity<=0||s.y<-10)&&this.steamParticles.splice(i,1)}}drawSteamAnimation(){if(!this.steamCanvas||!this.steamCtx)return;const e=this.steamCtx,t=this.steamCanvas.width,n=this.steamCanvas.height;e.clearRect(0,0,t,n),e.fillStyle="#1a1a2e",e.fillRect(0,0,t,n);const i=this.currentSteamEngine?this.engineStates.get(this.currentSteamEngine.tileIndex):null;if(e.fillStyle="#444",e.fillRect(35,45,50,30),e.fillStyle="#555",e.fillRect(50,25,20,25),e.fillStyle="#666",e.fillRect(47,20,26,8),i!=null&&i.isRunning){e.fillStyle="#a55",e.fillRect(40,50,40,20);const s=e.createRadialGradient(60,60,0,60,60,25);s.addColorStop(0,"rgba(255, 100, 50, 0.3)"),s.addColorStop(1,"rgba(255, 100, 50, 0)"),e.fillStyle=s,e.fillRect(35,45,50,30)}else e.fillStyle="#444",e.fillRect(40,50,40,20);for(const s of this.steamParticles)e.beginPath(),e.arc(s.x,s.y,s.size,0,Math.PI*2),e.fillStyle=`rgba(200, 200, 220, ${s.opacity})`,e.fill();e.strokeStyle="#444",e.lineWidth=2,e.strokeRect(1,1,t-2,n-2)}exportStatesForSave(){return Array.from(this.engineStates.entries()).map(([e,t])=>({tileIndex:e,state:t}))}restoreState(e,t){this.engineStates.set(e,t)}}class Km{constructor(){y(this,"currentPipe",null);y(this,"currentNetwork",null);y(this,"isOpen",!1);y(this,"pipeInfoElement",null);y(this,"onCloseCallback",null);y(this,"getHydroGeneratorInfo",null);y(this,"getSteamEngineInfo",null);this.createUI(),this.setupKeyboardHandler(),Yt.registerMenu("copper-pipe",{isOpen:()=>this.isOpen,close:()=>this.close()})}setMachineInfoCallbacks(e,t){this.getHydroGeneratorInfo=e,this.getSteamEngineInfo=t}createUI(){this.pipeInfoElement=document.createElement("div"),this.pipeInfoElement.id="copper-pipe-info",this.pipeInfoElement.innerHTML=`
      <div class="pipe-info-panel">
        <h3>Copper Pipe Network</h3>
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
        <p class="pipe-hint">Press E or ESC to close</p>
      </div>
    `,this.pipeInfoElement.style.display="none",document.body.appendChild(this.pipeInfoElement),this.addStyles()}addStyles(){const e=document.createElement("style");e.textContent=`
      #copper-pipe-info {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1002;
      }

      .pipe-info-panel {
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #b87333;
        border-radius: 8px;
        padding: 20px;
        min-width: 280px;
        color: #fff;
        font-family: monospace;
      }

      .pipe-info-panel h3 {
        margin: 0 0 15px 0;
        text-align: center;
        color: #b87333;
        border-bottom: 1px solid #b87333;
        padding-bottom: 10px;
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

      .pipe-hint {
        text-align: center;
        color: #666;
        font-size: 12px;
        margin: 15px 0 0 0;
      }
    `,document.head.appendChild(e)}setupKeyboardHandler(){document.addEventListener("keydown",e=>{this.isOpen&&(e.key==="Escape"||e.key.toLowerCase()==="e")&&(e.preventDefault(),this.close())})}open(e,t){this.currentPipe=e,this.currentNetwork=t,this.isOpen=!0,this.pipeInfoElement&&(this.pipeInfoElement.style.display="block"),this.updateUI()}close(){this.currentPipe=null,this.currentNetwork=null,this.isOpen=!1,this.pipeInfoElement&&(this.pipeInfoElement.style.display="none"),this.onCloseCallback&&this.onCloseCallback()}setOnCloseCallback(e){this.onCloseCallback=e}getIsOpen(){return this.isOpen}updateUI(){var c,h;if(!this.currentPipe)return;const e=document.getElementById("pipe-status-indicator"),t=document.getElementById("pipe-hydro-count"),n=document.getElementById("pipe-steam-count"),i=document.getElementById("pipe-segment-count"),s=document.getElementById("pipe-machine-list");if(!this.currentNetwork){e&&(e.className="pipe-status-indicator disconnected",e.querySelector(".status-text").textContent="Not Connected"),t&&(t.textContent="0"),n&&(n.textContent="0"),i&&(i.textContent="1"),s&&(s.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>');return}const o=this.currentNetwork.connectedHydroGenerators.length>0,a=this.currentNetwork.connectedSteamEngines.length>0;if(e&&(o&&a?(e.className="pipe-status-indicator connected",e.querySelector(".status-text").textContent="Network Active"):(e.className="pipe-status-indicator disconnected",e.querySelector(".status-text").textContent=o||a?"Partial Connection":"Not Connected")),t&&(t.textContent=this.currentNetwork.connectedHydroGenerators.length.toString()),n&&(n.textContent=this.currentNetwork.connectedSteamEngines.length.toString()),i&&(i.textContent=this.currentNetwork.pipes.length.toString()),s){s.innerHTML="";for(const u of this.currentNetwork.connectedHydroGenerators){const d=(c=this.getHydroGeneratorInfo)==null?void 0:c.call(this,u),f=document.createElement("div");f.className="pipe-machine-item hydro",f.innerHTML=`
          <span class="machine-name">Hydro Generator (Tile ${u})</span>
          <span class="machine-status ${d!=null&&d.active?"active":"inactive"}">
            ${d!=null&&d.active?"Active":"Inactive"}
          </span>
        `,s.appendChild(f)}for(const u of this.currentNetwork.connectedSteamEngines){const d=(h=this.getSteamEngineInfo)==null?void 0:h.call(this,u),f=document.createElement("div");f.className="pipe-machine-item steam",f.innerHTML=`
          <span class="machine-name">Steam Engine (Tile ${u})</span>
          <span class="machine-status ${d!=null&&d.isRunning?"active":"inactive"}">
            ${d!=null&&d.isRunning?"Running":d!=null&&d.hasFuel?"Has Fuel":"No Fuel"}
          </span>
        `,s.appendChild(f)}s.children.length===0&&(s.innerHTML='<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>')}}}class jm{constructor(e){y(this,"inventory");y(this,"currentFurnace",null);y(this,"furnaceSectionElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onSaveCallback",null);y(this,"updateInterval",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);y(this,"fuelSlotElement",null);y(this,"inputSlotElement",null);y(this,"outputSlotElement",null);y(this,"progressBarElement",null);y(this,"fuelBarElement",null);y(this,"FUEL_PER_COAL",8);y(this,"SLOT_FUEL","furnace-fuel");y(this,"SLOT_INPUT","furnace-input");y(this,"SLOT_OUTPUT","furnace-output");this.inventory=e,this.createUI(),this.setupKeyboardHandler(),Yt.registerMenu("furnace",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.furnaceSectionElement=document.createElement("div"),this.furnaceSectionElement.id="furnace-section",this.furnaceSectionElement.className="furnace-section",this.furnaceSectionElement.innerHTML=`
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
    `,document.head.appendChild(e)}setupSlotInteractions(){this.fuelSlotElement&&(this.fuelSlotElement.dataset.furnaceSlot=this.SLOT_FUEL,this.setupFurnaceSlot(this.fuelSlotElement,this.SLOT_FUEL)),this.inputSlotElement&&(this.inputSlotElement.dataset.furnaceSlot=this.SLOT_INPUT,this.setupFurnaceSlot(this.inputSlotElement,this.SLOT_INPUT)),this.outputSlotElement&&(this.outputSlotElement.dataset.furnaceSlot=this.SLOT_OUTPUT,this.setupFurnaceSlot(this.outputSlotElement,this.SLOT_OUTPUT))}setupFurnaceSlot(e,t){e.draggable=!0,e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleFurnaceDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDropOnFurnace(n,t)})}handleFurnaceDragStart(e,t){var c,h;if(!this.currentFurnace){e.preventDefault();return}let n=!1,i=null,s=0;if(t===this.SLOT_OUTPUT?(n=this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0,n&&(i=this.currentFurnace.outputItem,s=this.currentFurnace.outputCount)):t===this.SLOT_INPUT?(n=this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0,n&&(i=this.currentFurnace.smeltingItem,s=this.currentFurnace.inputCount)):t===this.SLOT_FUEL&&(n=this.currentFurnace.fuelAmount>0,n&&(i=q.COAL,s=Math.ceil(this.currentFurnace.fuelAmount/this.FUEL_PER_COAL))),!n||i===null){e.preventDefault();return}(c=e.dataTransfer)==null||c.setData("text/plain",`furnace:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const a=document.createElement("div");a.className="drag-ghost";const l=mt[i];a.innerHTML=`<img src="${Rt(l.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,s>1&&(a.innerHTML+=`<span class="ghost-count">${s}</span>`),a.style.position="fixed",a.style.top="-100px",a.style.left="-100px",a.style.pointerEvents="none",a.style.zIndex="9999",a.style.background="rgba(0,0,0,0.8)",a.style.border="2px solid #4CAF50",a.style.borderRadius="4px",a.style.padding="4px",document.body.appendChild(a),(h=e.dataTransfer)==null||h.setDragImage(a,25,25),setTimeout(()=>a.remove(),0)}handleDropOnFurnace(e,t){var s;if(!this.currentFurnace)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.handleDropFromInventory(i,t,e.shiftKey);return}n.startsWith("furnace:")}handleDropFromInventory(e,t,n=!1){if(!this.currentFurnace)return;const i=this.inventory.getSlot(e);if(!i||i.itemType===q.NONE)return;const s=n?i.quantity:1;if(t===this.SLOT_FUEL){if(i.itemType===q.COAL){const o=Math.min(s,i.quantity);this.currentFurnace.fuelAmount+=o*this.FUEL_PER_COAL,this.inventory.removeItem(q.COAL,o),this.updateUI(),this.notifyChanges()}}else if(t===this.SLOT_INPUT&&ks.find(a=>a.input===i.itemType)&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===i.itemType)){const a=Math.min(s,i.quantity);this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=i.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=a,this.inventory.removeItem(i.itemType,a),this.updateUI(),this.notifyChanges()}}handleSlotClick(e){this.currentFurnace&&(e===this.SLOT_FUEL?this.handleFuelSlotClick():e===this.SLOT_INPUT?this.handleInputSlotClick():e===this.SLOT_OUTPUT&&this.handleOutputSlotClick())}handleRightClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=Math.ceil(this.currentFurnace.outputCount/2),i=this.inventory.addItem(t,n),s=n-i;s>0&&(this.currentFurnace.outputCount-=s,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();if(t.itemType===q.COAL&&t.quantity>0){const n=Math.ceil(t.quantity/2);this.currentFurnace.fuelAmount+=n*this.FUEL_PER_COAL,this.inventory.removeItem(q.COAL,n),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null){const t=this.currentFurnace.smeltingItem;this.inventory.addItem(t,1)===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0,this.updateUI(),this.notifyChanges())}}}handleShiftClick(e){if(this.currentFurnace){if(e===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const t=this.currentFurnace.outputItem,n=this.inventory.addItem(t,this.currentFurnace.outputCount);n<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=n,n===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}else if(e===this.SLOT_INPUT)if(this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const t=this.currentFurnace.smeltingItem,n=this.inventory.addItem(t,this.currentFurnace.inputCount),i=this.currentFurnace.inputCount-n;i>0&&(this.currentFurnace.inputCount-=i,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges())}else{const t=this.inventory.getSelectedItem();if(ks.find(i=>i.input===t.itemType)&&t.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===t.itemType)){const i=t.quantity;this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=t.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount+=i,this.inventory.removeItem(t.itemType,i),this.updateUI(),this.notifyChanges()}}else if(e===this.SLOT_FUEL){const t=this.inventory.getSelectedItem();t.itemType===q.COAL&&t.quantity>0&&(this.currentFurnace.fuelAmount+=t.quantity*this.FUEL_PER_COAL,this.inventory.removeItem(q.COAL,t.quantity),this.updateUI(),this.notifyChanges())}}}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}handleFuelSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();e.itemType===q.COAL&&e.quantity>0&&(this.currentFurnace.fuelAmount+=this.FUEL_PER_COAL,this.inventory.removeItem(q.COAL,1),this.updateUI(),this.notifyChanges())}handleInputSlotClick(){if(!this.currentFurnace)return;const e=this.inventory.getSelectedItem();ks.find(n=>n.input===e.itemType)&&e.quantity>0&&(this.currentFurnace.smeltingItem===null||this.currentFurnace.smeltingItem===e.itemType)&&(this.currentFurnace.smeltingItem===null&&(this.currentFurnace.smeltingItem=e.itemType,this.currentFurnace.smeltingProgress=0),this.currentFurnace.inputCount++,this.inventory.removeItem(e.itemType,1),this.updateUI(),this.notifyChanges())}handleOutputSlotClick(){if(this.currentFurnace&&this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const e=this.currentFurnace.outputItem,t=this.inventory.addItem(e,this.currentFurnace.outputCount);t<this.currentFurnace.outputCount&&(this.currentFurnace.outputCount=t,t===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges())}}handleDropToInventory(e,t){if(!this.currentFurnace)return!1;if(t===this.SLOT_OUTPUT){if(this.currentFurnace.outputItem!==null&&this.currentFurnace.outputCount>0){const n=this.currentFurnace.outputItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===q.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.outputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.outputCount-=l,this.currentFurnace.outputCount===0&&(this.currentFurnace.outputItem=null),this.updateUI(),this.notifyChanges(),!0}}}else if(t===this.SLOT_INPUT&&this.currentFurnace.smeltingItem!==null&&this.currentFurnace.inputCount>0){const n=this.currentFurnace.smeltingItem,i=this.inventory.getSlot(e);if(i&&(i.itemType===q.NONE||i.itemType===n)){const o=i.itemType===n?i.quantity:0,a=64-o,l=Math.min(this.currentFurnace.inputCount,a);if(l>0)return this.inventory.setSlot(e,n,o+l),this.currentFurnace.inputCount-=l,this.currentFurnace.inputCount===0&&(this.currentFurnace.smeltingItem=null,this.currentFurnace.smeltingProgress=0),this.updateUI(),this.notifyChanges(),!0}}return!1}setupKeyboardHandler(){}open(e){this.currentFurnace=e,this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback(),this.updateInterval=window.setInterval(()=>this.update(),100))}close(){this.furnaceSectionElement&&(this.furnaceSectionElement.style.display="none",this.isOpen=!1,this.currentFurnace=null,this.updateInterval!==null&&(clearInterval(this.updateInterval),this.updateInterval=null),this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}getCurrentFurnace(){return this.currentFurnace}update(){!this.currentFurnace||!this.isOpen||this.updateUI()}updateUI(){if(!this.currentFurnace)return;const e=this.currentFurnace;if(this.fuelSlotElement){const n=this.fuelSlotElement.querySelector("img"),i=this.fuelSlotElement.querySelector(".slot-count");if(e.fuelAmount>0){n.src=Rt(mt[q.COAL].texture),n.style.display="block";const s=Math.ceil(e.fuelAmount/this.FUEL_PER_COAL);i.textContent=s>1?s.toString():""}else n.style.display="none",i.textContent=""}if(this.fuelBarElement){const n=Math.min(100,e.fuelAmount/this.FUEL_PER_COAL*100);this.fuelBarElement.style.width=`${n}%`}const t=document.getElementById("fuel-remaining");if(t&&(t.textContent=`${e.fuelAmount} items remaining`),this.inputSlotElement){const n=this.inputSlotElement.querySelector("img"),i=this.inputSlotElement.querySelector(".slot-count");if(e.smeltingItem!==null&&e.inputCount>0){const s=mt[e.smeltingItem];s&&(n.src=Rt(s.texture),n.style.display="block"),i.textContent=e.inputCount>1?e.inputCount.toString():""}else n.style.display="none",i.textContent=""}if(this.progressBarElement&&(this.progressBarElement.style.width=`${e.smeltingProgress*100}%`),this.outputSlotElement){const n=this.outputSlotElement.querySelector("img"),i=this.outputSlotElement.querySelector(".slot-count");if(e.outputItem!==null&&e.outputCount>0){const s=mt[e.outputItem];s&&(n.src=Rt(s.texture),n.style.display="block"),i.textContent=e.outputCount>1?e.outputCount.toString():""}else n.style.display="none",i.textContent=""}}}class Jm{constructor(e){y(this,"inventory");y(this,"currentStorage",null);y(this,"storageType",null);y(this,"storageSectionElement",null);y(this,"storageGridElement",null);y(this,"isOpen",!1);y(this,"onCloseCallback",null);y(this,"onSaveCallback",null);y(this,"onOpenInventoryCallback",null);y(this,"onUpdateHotbarCallback",null);y(this,"onUpdateInventoryCallback",null);this.inventory=e,this.createUI(),Yt.registerMenu("storage",{isOpen:()=>this.isOpen,close:()=>this.close()})}createUI(){this.storageSectionElement=document.createElement("div"),this.storageSectionElement.id="storage-section",this.storageSectionElement.className="storage-section",this.storageSectionElement.innerHTML=`
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
    `,document.head.appendChild(t)}createStorageSlots(){if(!this.storageGridElement)return;this.storageGridElement.innerHTML="";const e=this.storageType==="garbage"?Bs:Gs;for(let t=0;t<e;t++){const n=document.createElement("div");n.className="storage-slot",n.dataset.storageSlot=t.toString(),n.draggable=!0;const i=document.createElement("img");i.style.display="none",i.draggable=!1,n.appendChild(i);const s=document.createElement("span");s.className="slot-count",n.appendChild(s),this.setupSlotEvents(n,t),this.storageGridElement.appendChild(n)}}setupSlotEvents(e,t){e.addEventListener("click",n=>{n.shiftKey?this.handleShiftClick(t):this.handleSlotClick(t)}),e.addEventListener("contextmenu",n=>{n.preventDefault(),this.handleRightClick(t)}),e.addEventListener("dragstart",n=>{this.handleDragStart(n,t)}),e.addEventListener("dragend",()=>{e.classList.remove("dragging")}),e.addEventListener("dragover",n=>{n.preventDefault(),n.dataTransfer&&(n.dataTransfer.dropEffect="move"),e.classList.add("drag-over")}),e.addEventListener("dragleave",()=>{e.classList.remove("drag-over")}),e.addEventListener("drop",n=>{n.preventDefault(),e.classList.remove("drag-over"),this.handleDrop(n,t)})}handleDragStart(e,t){var o,a;if(!this.currentStorage){e.preventDefault();return}const n=this.currentStorage.slots[t];if(!n||n.itemType===q.NONE){e.preventDefault();return}(o=e.dataTransfer)==null||o.setData("text/plain",`storage:${t}`),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.currentTarget.classList.add("dragging");const i=document.createElement("div");i.className="drag-ghost";const s=mt[n.itemType];i.innerHTML=`<img src="${Rt(s.texture)}" style="width:32px;height:32px;image-rendering:pixelated;">`,n.quantity>1&&(i.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),i.style.cssText="position:fixed;top:-100px;left:-100px;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.8);border:2px solid #4CAF50;border-radius:4px;padding:4px;",document.body.appendChild(i),(a=e.dataTransfer)==null||a.setDragImage(i,20,20),setTimeout(()=>i.remove(),0)}handleDrop(e,t){var s;if(!this.currentStorage)return;const n=(s=e.dataTransfer)==null?void 0:s.getData("text/plain");if(!n)return;const i=parseInt(n);if(!isNaN(i)&&i>=0){this.transferFromInventory(i,t);return}if(n.startsWith("storage:")){const o=parseInt(n.replace("storage:",""));this.swapStorageSlots(o,t)}}transferFromInventory(e,t){if(!this.currentStorage)return;const n=this.inventory.getSlot(e);if(!n||n.itemType===q.NONE)return;const i=this.currentStorage.slots[t],s=mt[n.itemType];if(i.itemType===q.NONE)i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,q.NONE,0);else if(i.itemType===n.itemType){const o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o;const a=n.quantity-o;a>0?this.inventory.setSlot(e,n.itemType,a):this.inventory.setSlot(e,q.NONE,0)}else{const o=i.itemType,a=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,this.inventory.setSlot(e,o,a)}this.updateUI(),this.notifyChanges()}swapStorageSlots(e,t){if(!this.currentStorage||e===t)return;const n=this.currentStorage.slots[e],i=this.currentStorage.slots[t];if(i.itemType===q.NONE)i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=q.NONE,n.quantity=0;else if(i.itemType===n.itemType){const s=mt[n.itemType],o=Math.min(n.quantity,s.stackSize-i.quantity);i.quantity+=o,n.quantity-=o,n.quantity===0&&(n.itemType=q.NONE)}else{const s=i.itemType,o=i.quantity;i.itemType=n.itemType,i.quantity=n.quantity,n.itemType=s,n.quantity=o}this.updateUI(),this.notifyChanges()}handleSlotClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];t.itemType!==q.NONE&&t.quantity>0&&this.inventory.addItem(t.itemType,1)===0&&(t.quantity--,t.quantity===0&&(t.itemType=q.NONE),this.updateUI(),this.notifyChanges())}handleRightClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===q.NONE||t.quantity===0)return;const n=Math.ceil(t.quantity/2),i=this.inventory.addItem(t.itemType,n),s=n-i;s>0&&(t.quantity-=s,t.quantity===0&&(t.itemType=q.NONE),this.updateUI(),this.notifyChanges())}handleShiftClick(e){if(!this.currentStorage)return;const t=this.currentStorage.slots[e];if(t.itemType===q.NONE||t.quantity===0)return;const n=this.inventory.addItem(t.itemType,t.quantity);n<t.quantity&&(t.quantity=n,n===0&&(t.itemType=q.NONE),this.updateUI(),this.notifyChanges())}handleDropToInventory(e,t){if(!this.currentStorage||!t.startsWith("storage:"))return!1;const n=parseInt(t.replace("storage:","")),i=this.currentStorage.slots[n];if(!i||i.itemType===q.NONE)return!1;const s=this.inventory.getSlot(e);if(!s)return!1;const o=mt[i.itemType];if(s.itemType===q.NONE)this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=q.NONE,i.quantity=0;else if(s.itemType===i.itemType){const a=Math.min(i.quantity,o.stackSize-s.quantity);a>0&&(this.inventory.setSlot(e,s.itemType,s.quantity+a),i.quantity-=a,i.quantity===0&&(i.itemType=q.NONE))}else{const a=s.itemType,l=s.quantity;this.inventory.setSlot(e,i.itemType,i.quantity),i.itemType=a,i.quantity=l}return this.updateUI(),this.notifyChanges(),!0}notifyChanges(){this.onSaveCallback&&this.onSaveCallback(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback(),this.onUpdateInventoryCallback&&this.onUpdateInventoryCallback()}open(e){"rotation"in e?this.openChest(e):this.openGarbagePile(e)}openChest(e){this.currentStorage=e,this.storageType="chest",this.openStorage("Storage Chest")}openGarbagePile(e){this.currentStorage=e,this.storageType="garbage",this.openStorage("Garbage Pile")}openStorage(e){if(!this.storageSectionElement)return;const t=document.getElementById("storage-title");t&&(t.textContent=e),this.storageSectionElement.classList.toggle("garbage",this.storageType==="garbage"),this.createStorageSlots(),this.storageSectionElement.style.display="flex",this.isOpen=!0,this.updateUI(),this.onOpenInventoryCallback&&this.onOpenInventoryCallback()}close(){this.storageSectionElement&&(this.storageSectionElement.style.display="none",this.isOpen=!1,this.currentStorage=null,this.storageType=null,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}getCurrentStorage(){return this.currentStorage}getStorageType(){return this.storageType}setOnCloseCallback(e){this.onCloseCallback=e}setOnSaveCallback(e){this.onSaveCallback=e}setOnOpenInventoryCallback(e){this.onOpenInventoryCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}setOnUpdateInventoryCallback(e){this.onUpdateInventoryCallback=e}updateUI(){if(!this.currentStorage||!this.storageGridElement)return;this.storageGridElement.querySelectorAll(".storage-slot").forEach((t,n)=>{const i=this.currentStorage.slots[n],s=t.querySelector("img"),o=t.querySelector(".slot-count");if(i&&i.itemType!==q.NONE&&i.quantity>0){const a=mt[i.itemType];a&&(s.src=Rt(a.texture),s.style.display="block",o.textContent=i.quantity>1?i.quantity.toString():"")}else s.style.display="none",o.textContent=""})}}const Hi="tenebris_player",Is="tenebris_earth",Ps="tenebris_moon",Wi="tenebris_save",Vi=2;class Zm{constructor(){y(this,"playerData",null);y(this,"inventory",[]);y(this,"planetData",new Map);y(this,"autoSaveInterval",null);y(this,"onPlayerSave",null);this.planetData.set("earth",{tileChanges:new Map,torches:[],furnaces:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],removedTrees:[]}),this.planetData.set("moon",{tileChanges:new Map,torches:[],furnaces:[],storageChests:[],garbagePiles:[],steamEngines:[],hydroGenerators:[],copperPipes:[],removedTrees:[]})}setPlayerSaveCallback(e){this.onPlayerSave=e}startAutoSave(e=5){this.autoSaveInterval!==null&&clearInterval(this.autoSaveInterval),this.autoSaveInterval=window.setInterval(()=>{this.savePlayerPosition()},e*1e3)}stopAutoSave(){this.autoSaveInterval!==null&&(clearInterval(this.autoSaveInterval),this.autoSaveInterval=null)}saveTileChange(e,t,n,i){const s=this.planetData.get(e);if(!s)return;const o=`${t}:${n}`;s.tileChanges.set(o,{tileIndex:t,depth:n,blockType:i}),this.persistPlanetToStorage(e)}saveInventory(e){this.inventory=[...e],this.persistPlayerToStorage()}saveTorch(e,t,n){const i=this.planetData.get(e);i&&(i.torches.push({tileIndex:t,position:n}),this.persistPlanetToStorage(e))}removeTorch(e){for(const[n,i]of this.planetData){const s=i.torches.length;i.torches=i.torches.filter(o=>Math.abs(o.position.x-e.x)>.01||Math.abs(o.position.y-e.y)>.01||Math.abs(o.position.z-e.z)>.01),i.torches.length!==s&&this.persistPlanetToStorage(n)}}getTorches(){const e=[];for(const[t,n]of this.planetData)for(const i of n.torches)e.push({...i,planetId:t});return e}saveFurnace(e,t,n){const i=this.planetData.get(e);i&&(i.furnaces=i.furnaces.filter(s=>s.tileIndex!==t),i.furnaces.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeFurnace(e,t){const n=this.planetData.get(e);n&&(n.furnaces=n.furnaces.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getFurnaces(){const e=[];for(const[t,n]of this.planetData)for(const i of n.furnaces)e.push({...i,planetId:t});return e}saveStorageChest(e,t,n){const i=this.planetData.get(e);i&&(i.storageChests=i.storageChests.filter(s=>s.tileIndex!==t),i.storageChests.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeStorageChest(e,t){const n=this.planetData.get(e);n&&(n.storageChests=n.storageChests.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getStorageChests(){const e=[];for(const[t,n]of this.planetData)for(const i of n.storageChests)e.push({...i,planetId:t});return e}saveGarbagePile(e,t,n){const i=this.planetData.get(e);i&&(i.garbagePiles=i.garbagePiles.filter(s=>s.tileIndex!==t),i.garbagePiles.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeGarbagePile(e,t){const n=this.planetData.get(e);n&&(n.garbagePiles=n.garbagePiles.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getGarbagePiles(){const e=[];for(const[t,n]of this.planetData)for(const i of n.garbagePiles)e.push({...i,planetId:t});return e}saveSteamEngine(e,t,n){const i=this.planetData.get(e);i&&(i.steamEngines=i.steamEngines.filter(s=>s.tileIndex!==t),i.steamEngines.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeSteamEngine(e,t){const n=this.planetData.get(e);n&&(n.steamEngines=n.steamEngines.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getSteamEngines(){const e=[];for(const[t,n]of this.planetData)for(const i of n.steamEngines)e.push({...i,planetId:t});return e}saveHydroGenerator(e,t,n){const i=this.planetData.get(e);i&&(i.hydroGenerators=i.hydroGenerators.filter(s=>s.tileIndex!==t),i.hydroGenerators.push({tileIndex:t,...n}),this.persistPlanetToStorage(e))}removeHydroGenerator(e,t){const n=this.planetData.get(e);n&&(n.hydroGenerators=n.hydroGenerators.filter(i=>i.tileIndex!==t),this.persistPlanetToStorage(e))}getHydroGenerators(){const e=[];for(const[t,n]of this.planetData)for(const i of n.hydroGenerators)e.push({...i,planetId:t});return e}saveCopperPipe(e,t,n,i){const s=this.planetData.get(e);s&&(s.copperPipes=s.copperPipes.filter(o=>!(o.tileIndex===t&&o.depth===n)),s.copperPipes.push({tileIndex:t,depth:n,...i}),this.persistPlanetToStorage(e))}removeCopperPipe(e,t,n){const i=this.planetData.get(e);i&&(i.copperPipes=i.copperPipes.filter(s=>!(s.tileIndex===t&&s.depth===n)),this.persistPlanetToStorage(e))}getCopperPipes(){const e=[];for(const[t,n]of this.planetData)for(const i of n.copperPipes)e.push({...i,planetId:t});return e}saveRemovedTree(e,t){const n=this.planetData.get(e);n&&(n.removedTrees.some(i=>i.tileIndex===t)||(n.removedTrees.push({tileIndex:t}),this.persistPlanetToStorage(e)))}getRemovedTrees(e){const t=this.planetData.get(e);return(t==null?void 0:t.removedTrees)||[]}savePlayerPosition(){if(this.onPlayerSave){const e=this.onPlayerSave();this.playerData={version:Vi,timestamp:Date.now(),position:e.position,orientation:e.orientation,velocity:e.velocity,inventory:this.inventory},this.persistPlayerToStorage()}}load(){if(this.migrateLegacySave(),this.loadPlayerData(),this.loadPlanetData("earth"),this.loadPlanetData("moon"),!this.playerData&&this.inventory.length===0){let t=!1;for(const n of this.planetData.values())if(n.tileChanges.size>0||n.torches.length>0||n.furnaces.length>0){t=!0;break}if(!t)return null}const e=[];for(const[t,n]of this.planetData)for(const i of n.tileChanges.values())e.push({...i,planetId:t});return{version:Vi,timestamp:Date.now(),tileChanges:e,inventory:this.inventory,player:this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:{position:{x:0,y:0,z:0},orientation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0}},torches:this.getTorches(),furnaces:this.getFurnaces()}}loadPlayerData(){try{const e=localStorage.getItem(Hi);if(!e)return;const t=JSON.parse(e);this.playerData=t,this.inventory=t.inventory||[]}catch(e){console.error("Failed to load player data:",e)}}loadPlanetData(e){try{const t=e==="earth"?Is:Ps,n=localStorage.getItem(t);if(!n)return;const i=JSON.parse(n),s=this.planetData.get(e);if(!s)return;s.tileChanges.clear();for(const o of i.tileChanges){const a=`${o.tileIndex}:${o.depth}`;s.tileChanges.set(a,o)}s.torches=i.torches||[],s.furnaces=i.furnaces||[],s.storageChests=i.storageChests||[],s.garbagePiles=i.garbagePiles||[],s.steamEngines=i.steamEngines||[],s.hydroGenerators=i.hydroGenerators||[],s.copperPipes=i.copperPipes||[],s.removedTrees=i.removedTrees||[]}catch(t){console.error(`Failed to load ${e} data:`,t)}}migrateLegacySave(){var e,t,n;try{const i=localStorage.getItem(Wi);if(!i)return;if(localStorage.getItem(Hi)!==null){localStorage.removeItem(Wi);return}console.log("Migrating legacy save data to new format...");const s=JSON.parse(i);this.inventory=s.inventory||[],this.playerData={version:Vi,timestamp:s.timestamp,position:((e=s.player)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=s.player)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=s.player)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};for(const o of s.tileChanges||[]){const a=this.planetData.get(o.planetId);if(a){const l=`${o.tileIndex}:${o.depth}`;a.tileChanges.set(l,{tileIndex:o.tileIndex,depth:o.depth,blockType:o.blockType})}}for(const o of s.torches||[]){const a=this.planetData.get(o.planetId);a&&a.torches.push({tileIndex:o.tileIndex,position:o.position})}for(const o of s.furnaces||[]){const a=this.planetData.get(o.planetId);a&&a.furnaces.push({tileIndex:o.tileIndex,position:o.position,rotation:o.rotation,fuelAmount:o.fuelAmount,smeltingItem:o.smeltingItem,smeltingProgress:o.smeltingProgress,inputCount:o.inputCount??0,outputItem:o.outputItem,outputCount:o.outputCount})}this.persistPlayerToStorage(),this.persistPlanetToStorage("earth"),this.persistPlanetToStorage("moon"),localStorage.removeItem(Wi),console.log("Migration complete!")}catch(i){console.error("Failed to migrate legacy save:",i)}}getTileChangesForPlanet(e){const t=this.planetData.get(e);if(!t)return[];const n=[];for(const i of t.tileChanges.values())n.push({...i,planetId:e});return n}getInventory(){return this.inventory}getPlayerData(){return this.playerData?{position:this.playerData.position,orientation:this.playerData.orientation,velocity:this.playerData.velocity}:null}clearSave(){this.playerData=null,this.inventory=[];for(const e of this.planetData.values())e.tileChanges.clear(),e.torches=[],e.furnaces=[],e.storageChests=[],e.garbagePiles=[],e.steamEngines=[],e.hydroGenerators=[],e.copperPipes=[],e.removedTrees=[];localStorage.removeItem(Hi),localStorage.removeItem(Is),localStorage.removeItem(Ps),localStorage.removeItem(Wi)}persistPlayerToStorage(){var e,t,n;try{const i={version:Vi,timestamp:Date.now(),position:((e=this.playerData)==null?void 0:e.position)||{x:0,y:0,z:0},orientation:((t=this.playerData)==null?void 0:t.orientation)||{x:0,y:0,z:0,w:1},velocity:((n=this.playerData)==null?void 0:n.velocity)||{x:0,y:0,z:0},inventory:this.inventory};localStorage.setItem(Hi,JSON.stringify(i))}catch(i){console.error("Failed to save player data:",i)}}persistPlanetToStorage(e){try{const t=this.planetData.get(e);if(!t)return;const n={version:Vi,timestamp:Date.now(),tileChanges:Array.from(t.tileChanges.values()),torches:t.torches,furnaces:t.furnaces,storageChests:t.storageChests,garbagePiles:t.garbagePiles,steamEngines:t.steamEngines,hydroGenerators:t.hydroGenerators,copperPipes:t.copperPipes,removedTrees:t.removedTrees},i=e==="earth"?Is:Ps;localStorage.setItem(i,JSON.stringify(n))}catch(t){console.error(`Failed to save ${e} data:`,t)}}hasSavedData(){return localStorage.getItem(Hi)!==null||localStorage.getItem(Is)!==null||localStorage.getItem(Ps)!==null||localStorage.getItem(Wi)!==null}}const it=new Zm;function ol(r){switch(r){case P.STONE:return q.STONE;case P.DIRT:return q.DIRT;case P.GRASS:return q.DIRT;case P.WOOD:return q.WOOD;case P.SAND:return q.SAND;case P.ORE_COAL:return q.ORE_COAL;case P.ORE_COPPER:return q.ORE_COPPER;case P.ORE_IRON:return q.ORE_IRON;case P.ORE_GOLD:return q.ORE_GOLD;case P.ORE_LITHIUM:return q.ORE_LITHIUM;case P.ORE_ALUMINUM:return q.ORE_ALUMINUM;case P.ORE_COBALT:return q.ORE_COBALT;case P.SNOW:return q.SNOW;case P.DIRT_SNOW:return q.DIRT;case P.ICE:return q.ICE;default:return q.NONE}}function Qm(r){switch(r){case q.STONE:return P.STONE;case q.DIRT:return P.DIRT;case q.GRASS:return P.DIRT;case q.WOOD:return P.WOOD;case q.SAND:return P.SAND;case q.ORE_COAL:return P.ORE_COAL;case q.ORE_COPPER:return P.ORE_COPPER;case q.ORE_IRON:return P.ORE_IRON;case q.ORE_GOLD:return P.ORE_GOLD;case q.ORE_LITHIUM:return P.ORE_LITHIUM;case q.ORE_ALUMINUM:return P.ORE_ALUMINUM;case q.ORE_COBALT:return P.ORE_COBALT;case q.SNOW:return P.SNOW;case q.ICE:return P.ICE;default:return P.AIR}}class eg{constructor(e,t,n){y(this,"planets");y(this,"player");y(this,"scene");y(this,"raycaster");y(this,"inventory");y(this,"craftingSystem");y(this,"blockWireframe",null);y(this,"wireframeCache",null);y(this,"wireframeVertPool",[]);y(this,"treeManager",null);y(this,"heldTorch",null);y(this,"torchManager");y(this,"furnaceManager");y(this,"furnaceUI");y(this,"miningFurnaceTarget",null);y(this,"storageChestManager");y(this,"garbagePileManager");y(this,"storageUI");y(this,"miningStorageTarget",null);y(this,"miningGarbageTarget",null);y(this,"steamEngineManager");y(this,"miningSteamEngineTarget",null);y(this,"hydroGeneratorManager");y(this,"hydroGeneratorUI");y(this,"miningHydroGeneratorTarget",null);y(this,"copperPipeManager");y(this,"copperPipeUI");y(this,"steamEngineUI");y(this,"miningCopperPipeTarget",null);y(this,"pipeConnectionRebuildTimer",0);y(this,"PIPE_CONNECTION_REBUILD_INTERVAL",1);y(this,"rightClickCooldown",0);y(this,"CLICK_COOLDOWN",.25);y(this,"MAX_REACH",8);y(this,"miningTarget",null);y(this,"miningTreeTarget",null);y(this,"miningProgress",0);y(this,"miningProgressContainer",null);y(this,"miningProgressBar",null);y(this,"draggedSlotIndex",null);y(this,"dragGhost",null);y(this,"selectionLabelTimeout",null);y(this,"selectionLabelElement",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new Rh,this.inventory=new Om,this.torchManager=new Gm(n),this.heldTorch=new km(t.camera,n);const i=e.find(a=>a.radius>50),s=(i==null?void 0:i.center)||new I(0,0,0),o=new I(F.SUN_DIRECTION.x,F.SUN_DIRECTION.y,F.SUN_DIRECTION.z).normalize();this.furnaceManager=new Bm(n,s,o),this.furnaceManager.setOnSmeltCompleteCallback(()=>{this.saveAllFurnaceStates()}),this.furnaceUI=new jm(this.inventory),this.furnaceUI.setOnCloseCallback(()=>{}),this.furnaceUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllFurnaceStates()}),this.furnaceUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.furnaceUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.furnaceUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.storageChestManager=new zm(n,s,o),this.garbagePileManager=new Hm(n,s,o),this.steamEngineManager=new Wm(n,s,o),this.hydroGeneratorManager=new Vm(n,s,o),this.hydroGeneratorUI=new Ym,this.hydroGeneratorUI.setOnCloseCallback(()=>{}),this.hydroGeneratorUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.copperPipeManager=new qm(n,s,o),this.copperPipeUI=new Km,this.copperPipeUI.setOnCloseCallback(()=>{}),this.steamEngineUI=new $m,this.steamEngineUI.setInventory(this.inventory),this.steamEngineUI.setOnCloseCallback(()=>{}),this.steamEngineUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.steamEngineUI.setSaveCallback(()=>{this.saveInventory()}),this.steamEngineUI.setUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.copperPipeManager.setMachineCallbacks(a=>this.hydroGeneratorManager.getHydroGeneratorAtTile(a),a=>this.steamEngineManager.getSteamEngineAtTile(a),a=>this.getNeighborTileIndices(a)),this.hydroGeneratorUI.setConnectionCallback(a=>this.copperPipeManager.isHydroConnectedToSteam(a)),this.steamEngineUI.setConnectionCallbacks(a=>this.copperPipeManager.getConnectedHydroGenerators(a),a=>{const l=this.hydroGeneratorManager.getHydroGeneratorAtTile(a);return l!=null&&l.isActive?l.waterPumpedOut:0}),this.storageUI=new Jm(this.inventory),this.storageUI.setOnCloseCallback(()=>{}),this.storageUI.setOnSaveCallback(()=>{this.saveInventory(),this.saveAllStorageStates()}),this.storageUI.setOnOpenInventoryCallback(()=>{this.craftingSystem.open()}),this.storageUI.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.storageUI.setOnUpdateInventoryCallback(()=>{this.craftingSystem.updateInventorySlotsPublic()}),this.craftingSystem=new Xm(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{this.furnaceUI.close(),this.storageUI.close(),this.hydroGeneratorUI.close(),this.steamEngineUI.close(),this.copperPipeUI.close()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.craftingSystem.setOnSaveCallback(()=>{this.saveInventory()}),this.craftingSystem.setOnFurnaceDropCallback((a,l)=>this.furnaceUI.handleDropToInventory(a,l)),this.craftingSystem.setOnStorageDropCallback((a,l)=>this.storageUI.handleDropToInventory(a,l)),this.player.setTechBlockDataCallback(a=>{const l=new Set(a);return{torches:this.torchManager.getPlacedTorches().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),furnaces:this.furnaceManager.getPlacedFurnaces().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),steamEngines:this.steamEngineManager.getPlacedSteamEngines().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),hydroGenerators:this.hydroGeneratorManager.getPlacedHydroGenerators().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex})),copperPipes:this.copperPipeManager.getPlacedPipes().filter(c=>l.has(c.tileIndex)).map(c=>({tileIndex:c.tileIndex,depth:c.depth}))}}),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.setupHotbarDragDrop(),this.selectionLabelElement=document.getElementById("hotbar-selection-label"),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}setupHotbarDragDrop(){document.querySelectorAll(".hotbar-slot").forEach((t,n)=>{const i=t;i.draggable=!0;const s=i.querySelector("img");s&&(s.draggable=!1),i.addEventListener("dragstart",o=>this.handleHotbarDragStart(o,n)),i.addEventListener("dragend",()=>this.handleHotbarDragEnd()),i.addEventListener("dragover",o=>this.handleHotbarDragOver(o)),i.addEventListener("dragleave",o=>this.handleHotbarDragLeave(o)),i.addEventListener("drop",o=>this.handleHotbarDrop(o,n)),i.addEventListener("touchstart",o=>{o.preventDefault(),this.inventory.setSelectedSlot(n),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()},{passive:!1})})}handleHotbarDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===q.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const s=document.createElement("div");s.className="drag-ghost";const o=mt[n.itemType];s.innerHTML=`<img src="${Rt(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(s.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(s),this.dragGhost=s,s.style.position="fixed",s.style.top="-100px",s.style.left="-100px",s.style.pointerEvents="none",s.style.zIndex="9999",s.style.background="rgba(0,0,0,0.8)",s.style.border="2px solid #4CAF50",s.style.borderRadius="4px",s.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(s,25,25)}handleHotbarDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".hotbar-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".hotbar-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleHotbarDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleHotbarDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleHotbarDrop(e,t){var o;e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=(o=e.dataTransfer)==null?void 0:o.getData("text/plain");if(i&&i.startsWith("storage:")){this.storageUI.handleDropToInventory(t,i)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}if(i&&i.startsWith("furnace:")){const a=i.substring(8);this.furnaceUI.handleDropToInventory(t,a)&&(this.updateHotbarUI(),this.craftingSystem.updateInventorySlots());return}const s=this.draggedSlotIndex;s===null||s===t||(this.inventory.swapSlots(s,t),this.updateHotbarUI())}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const s=e[i],o=n.querySelector("img");let a=n.querySelector(".item-count"),l=n.querySelector(".item-tooltip");if(s.itemType!==q.NONE&&s.quantity>0){const c=mt[s.itemType];o&&(o.src=Rt(c.texture),o.style.display="block",this.applyAtlasRegionStyle(o,c)),a||(a=document.createElement("span"),a.className="item-count",n.appendChild(a)),a.textContent=s.quantity>1?s.quantity.toString():"",l||(l=document.createElement("span"),l.className="item-tooltip",n.appendChild(l)),l.textContent=c.name}else o&&(o.style.display="none",o.style.objectFit="",o.style.objectPosition=""),a&&(a.textContent=""),l&&l.remove();n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}applyAtlasRegionStyle(e,t){if(t.atlasRegion){const{x:n,y:i,width:s,height:o,atlasWidth:a,atlasHeight:l}=t.atlasRegion,c=a/s,h=l/o;e.style.objectFit="none",e.style.objectPosition=`${-n*(40/s)}px ${-i*(40/o)}px`,e.style.width=`${40*c}px`,e.style.height=`${40*h}px`,e.style.transform=`scale(${1/c}, ${1/h})`,e.style.transformOrigin="top left"}else e.style.objectFit="",e.style.objectPosition="",e.style.width="40px",e.style.height="40px",e.style.transform="",e.style.transformOrigin=""}showSelectionLabel(){const e=this.inventory.getSelectedItem();if(this.selectionLabelElement){if(this.selectionLabelTimeout!==null&&(window.clearTimeout(this.selectionLabelTimeout),this.selectionLabelTimeout=null),e.itemType!==q.NONE&&e.quantity>0){const t=mt[e.itemType];this.selectionLabelElement.textContent=t.name}else this.selectionLabelElement.textContent="Empty";this.selectionLabelElement.classList.add("visible"),this.selectionLabelTimeout=window.setTimeout(()=>{this.selectionLabelElement&&this.selectionLabelElement.classList.remove("visible"),this.selectionLabelTimeout=null},5e3)}}createHighlightMesh(){const e=new wl({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new yt;this.blockWireframe=new mh(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){if(this.wireframeCache&&this.wireframeCache.tileIndex===t&&this.wireframeCache.depth===n)return;const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;this.wireframeCache={tileIndex:t,depth:n};const s=e.getBlockHeight(),o=e.depthToRadius(n),a=o-s,l=[],c=i.vertices.length,h=c*2;for(;this.wireframeVertPool.length<h;)this.wireframeVertPool.push(new I);for(let d=0;d<c;d++){const f=i.vertices[d];this.wireframeVertPool[d].set(f.x,f.y,f.z).normalize().multiplyScalar(o).add(e.center),this.wireframeVertPool[c+d].set(f.x,f.y,f.z).normalize().multiplyScalar(a).add(e.center)}for(let d=0;d<c;d++){const f=(d+1)%c,m=this.wireframeVertPool[d],x=this.wireframeVertPool[f];l.push(m.x,m.y,m.z),l.push(x.x,x.y,x.z)}for(let d=0;d<c;d++){const f=(d+1)%c,m=this.wireframeVertPool[c+d],x=this.wireframeVertPool[c+f];l.push(m.x,m.y,m.z),l.push(x.x,x.y,x.z)}for(let d=0;d<c;d++){const f=this.wireframeVertPool[d],m=this.wireframeVertPool[c+d];l.push(f.x,f.y,f.z),l.push(m.x,m.y,m.z)}this.blockWireframe.geometry.dispose();const u=new yt;u.setAttribute("position",new Oe(l,3)),this.blockWireframe.geometry=u}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==q.NONE?t.textContent=`Block: ${mt[e.itemType].name}`:t.textContent="Block: None")}update(e,t,n,i=0){var ue;if(this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e),i!==0){const Ee=this.inventory.getSelectedSlot(),ne=9,ve=i>0?1:-1;let D=Ee+ve;D<0&&(D=ne-1),D>=ne&&(D=0),this.inventory.setSelectedSlot(D),this.updateHotbarUI(),this.updateBlockTypeUI(),this.showSelectionLabel()}const s=this.inventory.getSelectedItem(),o=s.itemType===q.TORCH&&s.quantity>0;this.heldTorch&&(this.heldTorch.setVisible(o),o&&this.heldTorch.update(e)),this.torchManager.update(e),this.furnaceManager.update(e),this.pipeConnectionRebuildTimer+=e,this.pipeConnectionRebuildTimer>=this.PIPE_CONNECTION_REBUILD_INTERVAL&&(this.pipeConnectionRebuildTimer=0,this.copperPipeManager.rebuildAllConnections());const a=this.torchManager.getTorchDataForBaking();if(a.length>0){const Ee=a.map(D=>D.position),ne=a[0].range,ve=a[0].intensity;this.furnaceManager.updateTorchLighting(Ee,ne,ve),this.storageChestManager.updateTorchLighting(Ee,ne,ve),this.garbagePileManager.updateTorchLighting(Ee,ne,ve),this.steamEngineManager.updateTorchLighting(Ee,ne,ve),this.hydroGeneratorManager.updateTorchLighting(Ee,ne,ve),this.copperPipeManager.updateTorchLighting(Ee,ne,ve)}if(this.craftingSystem.isMenuOpen()){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining();return}const l=this.player.getRaycastOrigin(),c=this.player.getForwardVector();this.raycaster.set(l,c),this.raycaster.far=this.MAX_REACH;const h=((ue=this.treeManager)==null?void 0:ue.getTreeMeshes())??[],u=this.torchManager.getTorchMeshes(),d=this.furnaceManager.getFurnaceMeshes(),f=this.storageChestManager.getChestMeshes(),m=this.garbagePileManager.getPileMeshes(),x=this.steamEngineManager.getSteamEngineMeshes(),g=this.hydroGeneratorManager.getHydroGeneratorMeshes(),p=this.copperPipeManager.getPipeMeshes(),_=this.raycaster.intersectObjects(h,!1),v=this.raycaster.intersectObjects(u,!1),M=this.raycaster.intersectObjects(d,!1),b=this.raycaster.intersectObjects(f,!1),S=this.raycaster.intersectObjects(m,!1),C=this.raycaster.intersectObjects(x,!1),L=this.raycaster.intersectObjects(g,!1),E=this.raycaster.intersectObjects(p,!1);let T=null,R=null,O=1/0;for(const Ee of this.planets){const ne=Ee.raycast(l,c,this.MAX_REACH);if(ne){const ve=l.distanceTo(ne.point);ve<O&&(O=ve,T=ne,R=Ee)}}let k=!1,z=!1,B=!1,G=!1,Z=!1,V=!1,J=!1,Q=!1,oe=!1,ge=null,Ue=null,$e=null,Ve=null,j=null,te=null,pe=null,ce=null;const Se=_.length>0?_[0].distance:1/0,Ne=v.length>0?v[0].distance:1/0,at=M.length>0?M[0].distance:1/0,Be=b.length>0?b[0].distance:1/0,tt=S.length>0?S[0].distance:1/0,N=C.length>0?C[0].distance:1/0,Ae=L.length>0?L[0].distance:1/0,Pe=E.length>0?E[0].distance:1/0,Ge=Math.min(Se,Ne,at,Be,tt,N,Ae,Pe);if(T&&O<Ge?z=!0:Pe<=Ge&&Pe<1/0?(oe=!0,ce=E[0]):Ae<=Ge&&Ae<1/0?(Q=!0,pe=L[0]):N<=Ge&&N<1/0?(J=!0,te=C[0]):Be<=Ge&&Be<1/0?(Z=!0,Ve=b[0]):tt<=Ge&&tt<1/0?(V=!0,j=S[0]):at<=Ne&&at<=Se&&at<1/0?(G=!0,$e=M[0]):Ne<Se&&Ne<1/0?(B=!0,Ue=v[0]):Se<1/0?(k=!0,ge=_[0]):T&&(z=!0),oe&&ce){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=ce.object,ne=this.copperPipeManager.getPipeByMesh(Ee);if(n&&this.rightClickCooldown===0&&ne){const ve=this.copperPipeManager.getPipeNetwork(ne.id);this.copperPipeUI.open(ne,ve),this.rightClickCooldown=this.CLICK_COOLDOWN}else t&&ne?this.handleCopperPipeMining(e,ne):this.resetMining()}else if(Q&&pe){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=pe.object,ne=this.hydroGeneratorManager.getHydroGeneratorByMesh(Ee);n&&this.rightClickCooldown===0&&ne?(this.hydroGeneratorUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleHydroGeneratorMining(e,ne):this.resetMining()}else if(J&&te){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=te.object,ne=this.steamEngineManager.getSteamEngineByMesh(Ee);t&&ne?this.handleSteamEngineMining(e,ne):this.resetMining()}else if(Z&&Ve){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=Ve.object,ne=this.storageChestManager.getChestByMesh(Ee);n&&this.rightClickCooldown===0&&ne?(this.storageUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleStorageChestMining(e,ne):this.resetMining()}else if(V&&j){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=j.object,ne=this.garbagePileManager.getPileByMesh(Ee);n&&this.rightClickCooldown===0&&ne?(this.storageUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleGarbagePileMining(e,ne):this.resetMining()}else if(G&&$e){this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const Ee=$e.object,ne=this.furnaceManager.getFurnaceByMesh(Ee);n&&this.rightClickCooldown===0&&ne?(this.furnaceUI.open(ne),this.rightClickCooldown=this.CLICK_COOLDOWN):t&&ne?this.handleFurnaceMining(e,ne):this.resetMining()}else if(B&&Ue)this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),t&&this.pickupTorch(Ue.object),this.resetMining();else if(k&&ge){const Ee=ge.object;this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null);const ne=Ee.userData.treeType;t?this.handleTreeMining(e,Ee,ne):this.resetMining()}else if(z&&T&&R){const{tileIndex:Ee,depth:ne,blockType:ve,prevTileIndex:D,prevDepth:A}=T;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(R,Ee,ne)),t&&ve!==P.AIR?this.handleMining(e,R,Ee,ne,ve):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(R,D,A),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1,this.wireframeCache=null),this.resetMining()}handleMining(e,t,n,i,s){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:s},this.miningProgress=0);const o=ol(s),a=mt[o].mineTime;this.miningProgress+=e/a,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,s),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?q.LOG:q.LEAVES,s=mt[i].mineTime;this.miningProgress+=e/s,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){if(t==="trunk"){const n=Math.floor(Math.random()*5)+4,i=Math.floor(Math.random()*5)+4;this.inventory.addItem(q.LOG,n),this.inventory.addItem(q.STICK,i)}else{const n=Math.floor(Math.random()*3)+1;this.inventory.addItem(q.STICK,n)}if(this.updateHotbarUI(),this.saveInventory(),this.treeManager){let n=e.parent;for(;n&&!(n instanceof kt&&n.children.some(i=>i.userData.isTree));)n=n.parent;if(n instanceof kt){const i=n.userData.tileIndex;i!==void 0&&it.saveRemovedTree("earth",i),this.treeManager.removeTree(n)}}}handleFurnaceMining(e,t){(this.miningFurnaceTarget===null||this.miningFurnaceTarget.furnace!==t)&&(this.miningFurnaceTarget={furnace:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0);const n=mt[q.FURNACE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakFurnace(t),this.resetMining())}breakFurnace(e){if(this.inventory.addItem(q.FURNACE,1),e.smeltingItem!==null&&this.inventory.addItem(e.smeltingItem,1),e.outputItem!==null&&e.outputCount>0&&this.inventory.addItem(e.outputItem,e.outputCount),e.fuelAmount>0){const t=Math.ceil(e.fuelAmount/8);this.inventory.addItem(q.COAL,t)}this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";it.removeFurnace(n,e.tileIndex)}this.furnaceManager.removeFurnace(e)}handleStorageChestMining(e,t){(this.miningStorageTarget===null||this.miningStorageTarget.chest!==t)&&(this.miningStorageTarget={chest:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=mt[q.STORAGE_CHEST].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakStorageChest(t),this.resetMining())}breakStorageChest(e){this.inventory.addItem(q.STORAGE_CHEST,1);const t=this.storageChestManager.getAllItemsFromChest(e),n=[];for(const i of t){const s=this.inventory.addItem(i.itemType,i.quantity);s>0&&n.push({itemType:i.itemType,quantity:s})}this.updateHotbarUI(),this.saveInventory();for(let i=0;i<this.planets.length;i++){const s=i===0?"earth":"moon";it.removeStorageChest(s,e.tileIndex)}n.length>0&&this.createGarbagePileWithItems(e.position.clone(),e.tileIndex,n),this.storageChestManager.removeChest(e)}handleGarbagePileMining(e,t){(this.miningGarbageTarget===null||this.miningGarbageTarget.pile!==t)&&(this.miningGarbageTarget={pile:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningProgress=0);const n=.5;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakGarbagePile(t),this.resetMining())}breakGarbagePile(e){const t=this.garbagePileManager.getAllItemsFromPile(e),n=[];for(const o of t){const a=this.inventory.addItem(o.itemType,o.quantity);a>0&&n.push({itemType:o.itemType,quantity:a})}this.updateHotbarUI(),this.saveInventory();for(let o=0;o<this.planets.length;o++){const a=o===0?"earth":"moon";it.removeGarbagePile(a,e.tileIndex)}const i=e.position.clone(),s=e.tileIndex;this.garbagePileManager.removePile(e),n.length>0&&this.createGarbagePileWithItems(i,s,n)}handleSteamEngineMining(e,t){(this.miningSteamEngineTarget===null||this.miningSteamEngineTarget.steamEngine!==t)&&(this.miningSteamEngineTarget={steamEngine:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningProgress=0);const n=mt[q.STEAM_ENGINE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakSteamEngine(t),this.resetMining())}breakSteamEngine(e){this.inventory.addItem(q.STEAM_ENGINE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";it.removeSteamEngine(n,e.tileIndex)}this.steamEngineManager.removeSteamEngine(e)}handleHydroGeneratorMining(e,t){(this.miningHydroGeneratorTarget===null||this.miningHydroGeneratorTarget.hydroGenerator!==t)&&(this.miningHydroGeneratorTarget={hydroGenerator:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningProgress=0);const n=mt[q.HYDRO_GENERATOR].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakHydroGenerator(t),this.resetMining())}breakHydroGenerator(e){this.inventory.addItem(q.HYDRO_GENERATOR,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";it.removeHydroGenerator(n,e.tileIndex)}this.hydroGeneratorManager.removeHydroGenerator(e)}handleCopperPipeMining(e,t){(this.miningCopperPipeTarget===null||this.miningCopperPipeTarget.pipe!==t)&&(this.miningCopperPipeTarget={pipe:t},this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningProgress=0);const n=mt[q.COPPER_PIPE].mineTime;this.miningProgress+=e/n,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakCopperPipe(t),this.resetMining())}breakCopperPipe(e){this.inventory.addItem(q.COPPER_PIPE,1),this.updateHotbarUI(),this.saveInventory();for(let t=0;t<this.planets.length;t++){const n=t===0?"earth":"moon";it.removeCopperPipe(n,e.tileIndex,e.depth)}this.copperPipeManager.removePipe(e)}async createGarbagePileWithItems(e,t,n){let i=null;for(const o of this.planets)if(o.getTileByIndex(t)){i=o;break}if(!i)return;const s=await this.garbagePileManager.placePile(e,i.center,t,n);if(s){const o=this.getPlanetId(i);it.saveGarbagePile(o,t,{position:{x:s.position.x,y:s.position.y,z:s.position.z},slots:s.slots.map(a=>({itemType:a.itemType,quantity:a.quantity}))})}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningFurnaceTarget=null,this.miningStorageTarget=null,this.miningGarbageTarget=null,this.miningSteamEngineTarget=null,this.miningHydroGeneratorTarget=null,this.miningCopperPipeTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){if(n<=0)return;const s=ol(i);s!==q.NONE&&(this.inventory.addItem(s,1),this.updateHotbarUI(),this.saveInventory());const o=this.getPlanetId(e);let a=!1;const l=e.getMaxDepth();for(let h=n+1;h<l;h++){const u=e.getBlock(t,h);if(u===P.WATER){a=!0;break}else if(u!==P.AIR)break}if(!a){const h=e.getTileNeighbors(t);for(const u of h){if(e.getBlock(u,n)===P.WATER){a=!0;break}if(e.getBlock(u,n+1)===P.WATER){a=!0;break}}}const c=a?P.WATER:P.AIR;if(e.setBlock(t,n,c),it.saveTileChange(o,t,n,c),c===P.WATER)for(let h=n-1;h>0&&e.getBlock(t,h)===P.AIR;h--)e.setBlock(t,h,P.WATER),it.saveTileChange(o,t,h,P.WATER)}placeBlock(e,t,n){if(n<0||n>=e.getMaxDepth())return;const i=this.inventory.getSelectedItem();if(i.itemType===q.NONE||i.quantity===0)return;if(i.itemType===q.TORCH){this.placeTorch(e,t,n);return}if(i.itemType===q.FURNACE){this.placeFurnace(e,t,n);return}if(i.itemType===q.STORAGE_CHEST){this.placeStorageChest(e,t,n);return}if(i.itemType===q.STEAM_ENGINE){this.placeSteamEngine(e,t,n);return}if(i.itemType===q.HYDRO_GENERATOR){this.placeHydroGenerator(e,t,n);return}if(i.itemType===q.COPPER_PIPE){this.placeCopperPipe(e,t,n);return}const s=Qm(i.itemType);if(s===P.AIR)return;const o=e.getTileAtPoint(this.player.position);if(o&&o.index===t){const a=this.player.position.distanceTo(e.center),l=a+1.8,c=e.depthToRadius(n),h=c-1;if(c>a&&h<l)return}if(this.inventory.useSelectedItem()){e.setBlock(t,n,s),this.updateHotbarUI(),this.saveInventory();const a=this.getPlanetId(e);it.saveTileChange(a,t,n,s)}}placeTorch(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center);if(this.inventory.useSelectedItem()){this.torchManager.placeTorch(a,e.center,t),this.updateHotbarUI(),this.saveInventory();const l=this.getPlanetId(e);it.saveTorch(l,t,{x:a.x,y:a.y,z:a.z});const c=this.torchManager.getTorchDataForBaking();e.setTorchData(c),e.setTilesWithTorches(this.torchManager.getTilesWithTorches()),e.markTilesNearTorchDirty(a,F.TORCH_LIGHT_RANGE)}}async placeFurnace(e,t,n){if(this.furnaceManager.getFurnaceAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.furnaceManager.placeFurnace(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);it.saveFurnace(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,fuelAmount:c.fuelAmount,smeltingItem:c.smeltingItem,smeltingProgress:c.smeltingProgress,inputCount:c.inputCount,outputItem:c.outputItem,outputCount:c.outputCount})}}}async placeStorageChest(e,t,n){if(this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.storageChestManager.placeChest(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);it.saveStorageChest(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation,slots:c.slots.map(u=>({itemType:u.itemType,quantity:u.quantity}))})}}}async placeSteamEngine(e,t,n){if(this.steamEngineManager.getSteamEngineAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.depthToRadius(n)-e.getBlockHeight(),a=i.center.clone().normalize().multiplyScalar(s).add(e.center),l=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const c=await this.steamEngineManager.placeSteamEngine(a,e.center,t,l);if(this.updateHotbarUI(),this.saveInventory(),c){const h=this.getPlanetId(e);it.saveSteamEngine(h,t,{position:{x:c.position.x,y:c.position.y,z:c.position.z},rotation:c.rotation})}}}async placeHydroGenerator(e,t,n){if(this.hydroGeneratorManager.getHydroGeneratorAtTile(t)||this.furnaceManager.getFurnaceAtTile(t)||this.storageChestManager.getChestAtTile(t)||this.garbagePileManager.getPileAtTile(t)||this.steamEngineManager.getSteamEngineAtTile(t))return;const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),o=e.getBlock(t,n);let a,l,c;if(o!==P.AIR&&o!==P.WATER){c=n;let m=!1,x=!1;for(let g=n+1;g<s;g++){const p=e.getBlock(t,g);if(p===P.WATER)m=!0;else if(p===P.AIR){m&&(a=g,x=!0);break}else break}if(!m||!x||(l=a-c-1,l<=0))return}else if(o===P.AIR){if(e.getBlock(t,n-1)!==P.WATER)return;a=n,l=0;for(let x=n-1;x>=0;x--)if(e.getBlock(t,x)===P.WATER)l++;else{c=x;break}}else if(o===P.WATER){a=n;for(let m=n+1;m<s;m++){const x=e.getBlock(t,m);if(x===P.AIR){a=m;break}else if(x!==P.WATER)return}l=0;for(let m=a-1;m>=0;m--)if(e.getBlock(t,m)===P.WATER)l++;else{c=m;break}if(l<=0)return}else return;const h=e.depthToRadius(a)-e.getBlockHeight(),d=i.center.clone().normalize().multiplyScalar(h).add(e.center),f=this.player.getForwardVector();if(this.inventory.useSelectedItem()){const m=await this.hydroGeneratorManager.placeHydroGenerator(d,e.center,t,l*e.getBlockHeight(),f);if(this.updateHotbarUI(),this.saveInventory(),m){const x=this.getPlanetId(e);it.saveHydroGenerator(x,t,{position:{x:m.position.x,y:m.position.y,z:m.position.z},rotation:m.rotation,waterDepth:m.waterDepth})}}}async placeCopperPipe(e,t,n){const i=e.getTileByIndex(t);if(!i)return;const s=e.getMaxDepth(),o=e.getBlock(t,n);let a=n,l;if(o===P.WATER){let u=n;for(let d=n+1;d<s;d++){const f=e.getBlock(t,d);if(f===P.AIR){u=d;break}else if(f!==P.WATER)return}a=u,l=e.depthToRadius(a)-e.getBlockHeight()}else if(o!==P.AIR){let u=!1,d=n;for(let f=n+1;f<s;f++){const m=e.getBlock(t,f);if(m===P.WATER)u=!0;else if(m===P.AIR){u&&(d=f);break}else break}u?(a=d,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight()}else o===P.AIR&&e.getBlock(t,n-1)===P.WATER?(a=n,l=e.depthToRadius(a)-e.getBlockHeight()):l=e.depthToRadius(n)-e.getBlockHeight();if(this.copperPipeManager.getPipeAt(t,a))return;const h=i.center.clone().normalize().multiplyScalar(l).add(e.center);if(this.inventory.useSelectedItem()){const u=await this.copperPipeManager.placePipe(h,t,a);if(this.updateHotbarUI(),this.saveInventory(),u){const d=this.getPlanetId(e);it.saveCopperPipe(d,t,a,{position:{x:u.position.x,y:u.position.y,z:u.position.z}})}}}pickupTorch(e){let t=e.parent;for(;t&&!(t instanceof kt);)t=t.parent;if(t instanceof kt){const i=this.torchManager.getPlacedTorches().find(s=>s.group===t);if(i){const s=i.position.clone();it.removeTorch({x:i.position.x,y:i.position.y,z:i.position.z}),this.torchManager.removeTorch(i),this.inventory.addItem(q.TORCH,1),this.updateHotbarUI(),this.saveInventory();const o=this.torchManager.getTorchDataForBaking(),a=this.torchManager.getTilesWithTorches();for(const l of this.planets)l.setTorchData(o),l.setTilesWithTorches(a),l.markTilesNearTorchDirty(s,F.TORCH_LIGHT_RANGE)}}}getInventory(){return this.inventory}getCraftingSystem(){return this.craftingSystem}getTorchManager(){return this.torchManager}setTreeManager(e){this.treeManager=e}getPlanetId(e){return this.planets.indexOf(e)===0?"earth":"moon"}getNeighborTileIndices(e){for(const t of this.planets){const n=t.getTileByIndex(e);if(n&&n.neighbors)return n.neighbors}return[]}saveInventory(){it.saveInventory(this.inventory.exportForSave())}saveAllFurnaceStates(){const e=this.furnaceManager.getPlacedFurnaces();for(const t of e){let n="earth";for(let i=0;i<this.planets.length;i++)if(this.planets[i].getTileByIndex(t.tileIndex)){n=i===0?"earth":"moon";break}it.saveFurnace(n,t.tileIndex,{position:{x:t.position.x,y:t.position.y,z:t.position.z},rotation:t.rotation,fuelAmount:t.fuelAmount,smeltingItem:t.smeltingItem,smeltingProgress:t.smeltingProgress,inputCount:t.inputCount,outputItem:t.outputItem,outputCount:t.outputCount})}}saveAllStorageStates(){const e=this.storageChestManager.getPlacedChests();for(const n of e){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}it.saveStorageChest(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},rotation:n.rotation,slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}const t=this.garbagePileManager.getPlacedPiles();for(const n of t){let i="earth";for(let s=0;s<this.planets.length;s++)if(this.planets[s].getTileByIndex(n.tileIndex)){i=s===0?"earth":"moon";break}it.saveGarbagePile(i,n.tileIndex,{position:{x:n.position.x,y:n.position.y,z:n.position.z},slots:n.slots.map(s=>({itemType:s.itemType,quantity:s.quantity}))})}}loadSavedData(){const e=it.load();if(!e)return;e.inventory&&e.inventory.length>0&&(this.inventory.importFromSave(e.inventory),this.updateHotbarUI());for(const c of this.planets){const h=this.getPlanetId(c),u=it.getTileChangesForPlanet(h);for(const d of u)c.setBlock(d.tileIndex,d.depth,d.blockType)}const t=it.getTorches();for(const c of t){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z);this.torchManager.placeTorch(u,h.center,c.tileIndex)}}if(t.length>0){const c=this.torchManager.getTorchDataForBaking(),h=this.torchManager.getTilesWithTorches();for(const u of this.planets)u.setTorchData(c),u.setTilesWithTorches(h);for(const u of t){const d=new I(u.position.x,u.position.y,u.position.z);for(const f of this.planets)f.markTilesNearTorchDirty(d,F.TORCH_LIGHT_RANGE)}}const n=it.getFurnaces();for(const c of n){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z);this.furnaceManager.restoreFurnace(u,h.center,c.tileIndex,c.rotation).then(d=>{d&&(d.fuelAmount=c.fuelAmount,d.smeltingItem=c.smeltingItem,d.smeltingProgress=c.smeltingProgress,d.inputCount=c.inputCount??0,d.outputItem=c.outputItem,d.outputCount=c.outputCount)})}}const i=it.getStorageChests();for(const c of i){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z),d=c.slots.map(f=>({itemType:f.itemType,quantity:f.quantity}));this.storageChestManager.restoreChest(u,h.center,c.tileIndex,c.rotation,d)}}const s=it.getGarbagePiles();for(const c of s){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z),d=c.slots.map(f=>({itemType:f.itemType,quantity:f.quantity}));this.garbagePileManager.restorePile(u,h.center,c.tileIndex,d)}}const o=it.getSteamEngines();for(const c of o){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z);this.steamEngineManager.restoreSteamEngine(u,h.center,c.tileIndex,c.rotation)}}const a=it.getHydroGenerators();for(const c of a){const h=this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId);if(h){const u=new I(c.position.x,c.position.y,c.position.z);this.hydroGeneratorManager.restoreHydroGenerator(u,h.center,c.tileIndex,c.rotation,c.waterDepth)}}const l=it.getCopperPipes();for(const c of l)if(this.planets.find((u,d)=>(d===0?"earth":"moon")===c.planetId)){const u=new I(c.position.x,c.position.y,c.position.z);this.copperPipeManager.restorePipe(u,c.tileIndex,c.depth)}this.copperPipeManager.rebuildAllConnections(),console.log(`Loaded save: ${e.tileChanges.length} tile changes, ${t.length} torches, ${n.length} furnaces, ${i.length} chests, ${s.length} piles, ${o.length} steam engines, ${a.length} hydro generators, ${l.length} copper pipes, inventory restored`)}}let tg=class{constructor(e){y(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const zs={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function al(r,e){return new et({uniforms:{baseColor:{value:r},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
    `})}class ng{constructor(e){y(this,"trunkMaterial");y(this,"leavesMaterial");y(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new I(F.SUN_DIRECTION.x,F.SUN_DIRECTION.y,F.SUN_DIRECTION.z).normalize(),this.trunkMaterial=al(new Le(9127187),this.sunDirection),this.leavesMaterial=al(new Le(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...zs,...n},s=new kt,o=[],a=new Le(9127187),l=new Le(2263842),c=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6);this.addVertexColors(c,a),o.push(c);let h=i.trunkHeight,u=i.leafBaseRadius;for(let p=0;p<i.leafLayers;p++){const v=new Ys(u,1.2,6);v.translate(0,h+1.2/2,0),this.addVertexColors(v,l),o.push(v),h+=1.2*.6,u*=i.leafTaper}const d=kl(o),f=this.createMergedTreeMaterial(),m=new Re(d,f);m.userData.isTree=!0,m.userData.treeType="trunk",s.add(m);for(const p of o)p.dispose();const x=new I(0,1,0),g=new lt().setFromUnitVectors(x,t.clone().normalize());return s.quaternion.copy(g),s.position.copy(e),s}addVertexColors(e,t){const n=e.attributes.position.count,i=new Float32Array(n*3);for(let s=0;s<n;s++)i[s*3]=t.r,i[s*3+1]=t.g,i[s*3+2]=t.b;e.setAttribute("color",new wt(i,3))}createMergedTreeMaterial(){return new et({uniforms:{sunDirection:{value:this.sunDirection.clone().normalize()},ambientIntensity:{value:F.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:F.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
      `})}createHexagonalPrism(e,t,n){const i=new Ai(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class ig{constructor(e,t){y(this,"trees",[]);y(this,"treesByTile",new Map);y(this,"treeBuilder");y(this,"scene");this.scene=e,this.treeBuilder=new ng(t)}addTree(e,t,n,i){const s=e.clone().sub(t).normalize(),o=this.treeBuilder.createTree(e,s,n);return i!==void 0&&(o.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(o)),this.trees.push(o),this.scene.add(o),o}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),s=i.indexOf(e);s>=0&&i.splice(s,1)}e.traverse(i=>{i instanceof Re&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Re&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,s,o=F.TERRAIN_SEED,a,l,c){const h=new tg(o+54321);let u=0,d=0;const f=n*5,m=new Set;for(;u<n&&d<f;){d++;const x=h.next()*Math.PI*2,g=Math.acos(2*h.next()-1);let p=new I(Math.sin(g)*Math.cos(x),Math.sin(g)*Math.sin(x),Math.cos(g)).normalize();const _=a?a(p):null;if(_!==null&&(m.has(_)||c!=null&&c.has(_)))continue;if(l){const L=l(p);L&&(p=L.clone().sub(e).normalize())}if(s&&s(p))continue;const v=i(p),M=e.clone().add(p.clone().multiplyScalar(v));_!==null&&m.add(_);const b=.5+h.next()*1,S=.6+h.next()*.9,C={trunkHeight:zs.trunkHeight*b*S,trunkRadius:zs.trunkRadius*b,leafBaseRadius:zs.leafBaseRadius*b,leafLayers:Math.floor(2+h.next()*4),leafTaper:.6+h.next()*.2};this.addTree(M,e,C,_??void 0),u++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const s of n)s.visible=i}}setAllVisible(e){for(const t of this.trees)t.visible=e}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var sg=`varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,rg=`precision highp float;

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
}`;function og(r){const e=r.planetRadius*F.ATMOSPHERE_RADIUS_MULT,t=r.planetRadius-F.ATMOSPHERE_SURFACE_OFFSET;return new et({uniforms:{planetCenter:{value:new I(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:r.sunDirection.clone().normalize()},viewerPosition:{value:new I},rayleighScale:{value:F.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:F.ATMOSPHERE_MIE_SCALE},mieG:{value:F.ATMOSPHERE_MIE_G},sunIntensity:{value:F.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:F.ATMOSPHERE_SAMPLES},numLightSamples:{value:F.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:sg,fragmentShader:rg,transparent:!0,side:Gt,depthWrite:!1,blending:Fr})}class ag{constructor(e){y(this,"mesh");y(this,"material");const t=e.planetRadius*F.ATMOSPHERE_RADIUS_MULT,n=new Zi(t,64,48);this.material=og(e),this.mesh=new Re(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function lg(r,e){return new ag({planetRadius:r,sunDirection:e})}var cg=`varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,hg=`precision highp float;

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
}`;const ug={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class dg{constructor(e){y(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function fg(r,e,t,n){const i=[],s=[],o=[],a=r.clone().sub(t).normalize();let l=new I(1,0,0);Math.abs(a.dot(l))>.9&&(l=new I(0,0,1));const c=new I().crossVectors(a,l).normalize(),h=new I().crossVectors(c,a).normalize(),u=3+Math.floor(n.next()*4);for(let f=0;f<u;f++){const m=(n.next()-.5)*e*.8,x=(n.next()-.5)*e*.4,g=(n.next()-.5)*e*.8,p=r.clone().addScaledVector(c,m).addScaledVector(a,x).addScaledVector(h,g),_=e*(.3+n.next()*.4);pg(i,s,o,p,_,a,c,h)}if(i.length===0)return null;const d=new yt;return d.setAttribute("position",new Oe(i,3)),d.setAttribute("normal",new Oe(s,3)),d.setIndex(o),d.computeBoundingSphere(),d}function pg(r,e,t,n,i,s,o,a){const l=i/2,c=[];for(let u=0;u<8;u++){const d=u&1?l:-l,f=u&2?l:-l,m=u&4?l:-l,x=n.clone().addScaledVector(o,d).addScaledVector(s,f).addScaledVector(a,m);c.push(x)}const h=[{verts:[0,1,3,2],normal:a.clone().negate()},{verts:[4,6,7,5],normal:a.clone()},{verts:[0,2,6,4],normal:o.clone().negate()},{verts:[1,5,7,3],normal:o.clone()},{verts:[0,4,5,1],normal:s.clone().negate()},{verts:[2,3,7,6],normal:s.clone()}];for(const u of h){const d=r.length/3;for(const f of u.verts){const m=c[f];r.push(m.x,m.y,m.z),e.push(u.normal.x,u.normal.y,u.normal.z)}t.push(d,d+1,d+2,d,d+2,d+3)}}function mg(r){return new et({uniforms:{sunDirection:{value:r.clone().normalize()},cloudColor:{value:new Le(16777215)},shadowColor:{value:new Le(8947882)},ambientIntensity:{value:.4}},vertexShader:cg,fragmentShader:hg,transparent:!0,side:Xt,depthWrite:!0})}class gg{constructor(e={},t){y(this,"clouds");y(this,"material");y(this,"config");y(this,"cloudMesh",null);this.config={...ug,...e},this.clouds=new kt,this.material=mg(t),this.generateClouds()}generateClouds(){const e=new dg(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity),i=[],s=[],o=[];let a=0;for(let l=0;l<n;l++){const c=e.next()*Math.PI*2,h=Math.acos(2*e.next()-1),u=(e.next()-.5)*this.config.cloudThickness,d=t+u,f=d*Math.sin(h)*Math.cos(c),m=d*Math.sin(h)*Math.sin(c),x=d*Math.cos(h),g=new I(f,m,x),p=new I(0,0,0),_=fg(g,this.config.cloudScale*(.5+e.next()*.5),p,e);if(_){const v=_.attributes.position.array,M=_.attributes.normal.array,b=_.index.array;for(let S=0;S<v.length;S++)i.push(v[S]);for(let S=0;S<M.length;S++)s.push(M[S]);for(let S=0;S<b.length;S++)o.push(b[S]+a);a+=v.length/3,_.dispose()}}if(i.length>0){const l=new yt;l.setAttribute("position",new Oe(i,3)),l.setAttribute("normal",new Oe(s,3)),l.setIndex(o),l.computeBoundingSphere(),this.cloudMesh=new Re(l,this.material),this.clouds.add(this.cloudMesh)}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function xg(r,e){return new gg({planetRadius:r,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:F.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:F.CLOUD_ROTATION_SPEED},e)}class vg{constructor(){y(this,"steps",new Map);y(this,"totalWeight",0);y(this,"completedWeight",0);y(this,"onProgressCallbacks",[]);y(this,"onCompleteCallbacks",[]);y(this,"currentStatus","Initializing...")}registerStep(e,t=1){this.steps.has(e)||(this.steps.set(e,{name:e,weight:t,completed:!1}),this.totalWeight+=t)}completeStep(e){const t=this.steps.get(e);!t||t.completed||(t.completed=!0,this.completedWeight+=t.weight,this.notifyProgress(),this.completedWeight>=this.totalWeight&&this.notifyComplete())}setStatus(e){this.currentStatus=e,this.notifyProgress()}getProgress(){return this.totalWeight===0?0:Math.min(100,Math.round(this.completedWeight/this.totalWeight*100))}isComplete(){return this.completedWeight>=this.totalWeight&&this.totalWeight>0}onProgress(e){this.onProgressCallbacks.push(e),e(this.getProgress(),this.currentStatus)}onComplete(e){this.onCompleteCallbacks.push(e),this.isComplete()&&e()}updateDOM(){const e=document.getElementById("loading-progress-bar"),t=document.getElementById("loading-status"),n=document.getElementById("loading-percentage"),i=this.getProgress();e&&(e.style.width=`${i}%`),t&&(t.textContent=this.currentStatus),n&&(n.textContent=`${i}%`)}hideLoadingScreen(){const e=document.getElementById("loading-screen");e&&(e.classList.add("hidden"),setTimeout(()=>{e.style.display="none"},500));const t=document.getElementById("instructions");t&&(t.style.display="block")}notifyProgress(){const e=this.getProgress();this.updateDOM();for(const t of this.onProgressCallbacks)t(e,this.currentStatus)}notifyComplete(){for(const e of this.onCompleteCallbacks)e()}reset(){this.steps.clear(),this.totalWeight=0,this.completedWeight=0,this.currentStatus="Initializing..."}}const Nt=new vg;class yg{constructor(){y(this,"engine");y(this,"inputManager");y(this,"earth");y(this,"moon");y(this,"player");y(this,"blockInteraction");y(this,"treeManager");y(this,"earthAtmosphere",null);y(this,"earthClouds",null);y(this,"isReady",!1);y(this,"elapsedTime",0);y(this,"waterUpdateTimer",0);y(this,"WATER_UPDATE_INTERVAL",5);y(this,"sharedFrustum",new ns);y(this,"projScreenMatrix",new xt);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");e.addEventListener("contextmenu",n=>n.preventDefault()),this.engine=new bm(e),this.inputManager=new _m,this.earth=new il(this.engine.scene,100,F.EARTH_SUBDIVISIONS),this.moon=new il(this.engine.scene,50,F.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,Yt.init(),Yt.setOnMenuCloseCallback(()=>{this.inputManager.resetMouseButtons()});let t=!1;document.addEventListener("keydown",n=>{if(n.key==="Escape"){const i=document.getElementById("instructions"),s=(i==null?void 0:i.style.display)==="block";Yt.isAnyMenuOpen()||s&&(t=!0,n.preventDefault())}}),document.addEventListener("keyup",n=>{n.key==="Escape"&&t&&(t=!1,e==null||e.requestPointerLock())}),this.inputManager.setPointerLockCallback(n=>{const i=document.getElementById("instructions");i&&(!n&&Yt.isAnyMenuOpen()?i.style.display="none":i.style.display=n?"none":"block");const s=document.getElementById("crosshair");s&&(s.style.display=n?"block":"none")}),this.init()}async init(){try{Nt.registerStep("textures",1),Nt.registerStep("terrain-generation",2),Nt.registerStep("initial-terrain",3),Nt.registerStep("player-setup",1),Nt.registerStep("environment",1),Nt.setStatus("Loading textures..."),await this.earth.initialize(),await this.moon.initialize(),Nt.completeStep("textures"),Nt.setStatus("Generating terrain..."),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),Nt.completeStep("terrain-generation"),Nt.setStatus("Building terrain around spawn...");const e=this.earth.getSpawnPositionAtLatLon(F.EARTH_SPAWN_LAT,F.EARTH_SPAWN_LON,1);await this.earth.buildInitialTerrain(e),Nt.completeStep("initial-terrain"),Nt.setStatus("Initializing player..."),this.player=new Lm(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new eg([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new ig(this.engine.scene,this.engine.sunDirection),it.load();const t=it.getRemovedTrees("earth"),n=new Set(t.map(s=>s.tileIndex));this.treeManager.scatterTrees(this.earth.center,this.earth.radius,F.TREE_COUNT,s=>this.earth.getSurfaceHeightInDirection(s),s=>this.earth.isUnderwaterInDirection(s),F.TERRAIN_SEED,s=>this.earth.getTileIndexInDirection(s),s=>this.earth.getTileCenterInDirection(s),n),this.blockInteraction.setTreeManager(this.treeManager),Nt.completeStep("player-setup"),this.inputManager.setInventoryToggleCallback(()=>{this.blockInteraction.getCraftingSystem().toggle()}),this.inputManager.setPauseToggleCallback(()=>{const s=document.getElementById("instructions"),o=document.getElementById("mobile-controls");if(s){const a=s.style.display!=="none";s.style.display=a?"none":"block",o&&(o.style.display=a?"block":"none")}}),Nt.setStatus("Creating environment..."),F.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=lg(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=xg(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection),Nt.completeStep("environment");const i=this.earth.getWaterShaderMaterial();i&&this.engine.registerWaterMaterial(i),this.earth.setWaterMeshCallback((s,o)=>{o?this.engine.registerWaterMesh(s):this.engine.unregisterWaterMesh(s)}),this.setupSettingsMenu(),_e.setFrameSpikeThreshold(F.FRAME_SPIKE_THRESHOLD_MS),this.loadSavedGame(),it.setPlayerSaveCallback(()=>this.player.exportForSave()),it.startAutoSave(5),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),Nt.setStatus("Ready!"),Nt.hideLoadingScreen(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,_e.begin("Player"),this.player.update(e),_e.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),_e.begin("Block Interaction");const t=this.inputManager.getState(),n=this.inputManager.isLocked(),i=this.inputManager.getWheelDelta();this.blockInteraction.update(e,n&&t.leftClick,n&&t.rightClick,n?i:0),_e.end("Block Interaction"),_e.begin("Frustum Calc"),this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix,this.engine.camera.matrixWorldInverse),this.sharedFrustum.setFromProjectionMatrix(this.projScreenMatrix),_e.end("Frustum Calc"),_e.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera,e,this.sharedFrustum),_e.end("Earth Update"),_e.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera,e,this.sharedFrustum),_e.end("Moon Update");const s=this.player.getIsInWater();if(this.earth.updateWaterShader(this.elapsedTime,s),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.waterUpdateTimer+=e,this.waterUpdateTimer>=this.WATER_UPDATE_INTERVAL){this.waterUpdateTimer=0;const o=this.earth.getVisibleTileIndices(),a=this.earth.updateWaterFlow(o);a>0&&console.log(`[Water update] Fixed ${a} water blocks in ${o.size} tiles`)}this.earth.isInOrbitView()?this.treeManager.setAllVisible(!1):this.treeManager.setAllVisible(!0)}setupSettingsMenu(){var c;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),s=document.getElementById("teleport-select"),o=document.querySelectorAll(".menu-tab");if(o.forEach(h=>{h.addEventListener("click",()=>{o.forEach(f=>f.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(f=>f.classList.remove("active")),h.classList.add("active");const u=h.getAttribute("data-tab"),d=document.getElementById(`tab-${u}`);d&&d.classList.add("active")})}),!e||!t)return;e.checked=((c=this.earthAtmosphere)==null?void 0:c.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=F.DEBUG_JETPACK_ENABLED,this.player.setJetpackEnabled(F.DEBUG_JETPACK_ENABLED),n.addEventListener("change",()=>{F.DEBUG_JETPACK_ENABLED=n.checked,this.player.setJetpackEnabled(n.checked)}));const a=document.getElementById("toggle-bypass-crafting");a&&(a.checked=F.DEBUG_BYPASS_CRAFTING_INGREDIENTS,a.addEventListener("change",()=>{F.DEBUG_BYPASS_CRAFTING_INGREDIENTS=a.checked})),i&&(i.checked=F.INVERT_Y_AXIS,i.addEventListener("change",()=>{F.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),s&&s.addEventListener("change",()=>{this.teleportToPlanet(s.value)});const l=document.getElementById("reset-game-btn");l&&l.addEventListener("click",()=>{confirm("Are you sure you want to reset your game? This will delete all saved progress.")&&(it.stopAutoSave(),it.clearSave(),window.location.reload())})}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1;let i;if(e==="earth")i=t.getSpawnPositionAtLatLon(F.EARTH_SPAWN_LAT,F.EARTH_SPAWN_LON,n);else{const s=new I(-1,0,0),o=t.getSurfaceHeightInDirection(s);i=t.center.clone(),i.x-=o+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}loadSavedGame(){const e=it.load();if(!e){console.log("No saved game found, starting fresh");return}if(this.blockInteraction.loadSavedData(),e.player&&e.player.position){const t=e.player.position;Math.sqrt(t.x*t.x+t.y*t.y+t.z*t.z)>50&&(this.player.importFromSave(e.player),console.log(`Loaded player position: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}`))}console.log("Game loaded from save")}}document.addEventListener("DOMContentLoaded",()=>{new yg});
//# sourceMappingURL=index-CyZRmAzY.js.map
