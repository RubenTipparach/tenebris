var vl=Object.defineProperty;var Sl=(s,e,t)=>e in s?vl(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var N=(s,e,t)=>Sl(s,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const so="181",bl=0,Do=1,yl=2,Oa=1,ka=2,gn=3,Dn=0,Pt=1,Vt=2,_n=0,li=1,dr=2,Po=3,Lo=4,Ml=5,Gn=100,El=101,Tl=102,Al=103,Rl=104,wl=200,Cl=201,Dl=202,Pl=203,fr=204,pr=205,Ll=206,Il=207,Ul=208,Nl=209,Fl=210,Ol=211,kl=212,Bl=213,zl=214,mr=0,gr=1,xr=2,hi=3,_r=4,vr=5,Sr=6,br=7,ro=0,Gl=1,Hl=2,Cn=0,Vl=1,Wl=2,Xl=3,ql=4,Yl=5,$l=6,Kl=7,Ba=300,ui=301,di=302,yr=303,Mr=304,Es=306,Ci=1e3,xn=1001,Er=1002,Rt=1003,Jl=1004,Hi=1005,Kt=1006,Ls=1007,Wn=1008,ln=1009,za=1010,Ga=1011,Di=1012,oo=1013,Xn=1014,tn=1015,gi=1016,ao=1017,lo=1018,Pi=1020,Ha=35902,Va=35899,Wa=1021,Xa=1022,nn=1023,Li=1026,Ii=1027,qa=1028,co=1029,ho=1030,uo=1031,fo=1033,fs=33776,ps=33777,ms=33778,gs=33779,Tr=35840,Ar=35841,Rr=35842,wr=35843,Cr=36196,Dr=37492,Pr=37496,Lr=37808,Ir=37809,Ur=37810,Nr=37811,Fr=37812,Or=37813,kr=37814,Br=37815,zr=37816,Gr=37817,Hr=37818,Vr=37819,Wr=37820,Xr=37821,qr=36492,Yr=36494,$r=36495,Kr=36283,Jr=36284,jr=36285,Zr=36286,jl=3200,Zl=3201,Ya=0,Ql=1,An="",Yt="srgb",fi="srgb-linear",Ss="linear",ct="srgb",Yn=7680,Io=519,ec=512,tc=513,nc=514,$a=515,ic=516,sc=517,rc=518,oc=519,Uo=35044,No="300 es",on=2e3,bs=2001;function Ka(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Ui(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function ac(){const s=Ui("canvas");return s.style.display="block",s}const Fo={};function Oo(...s){const e="THREE."+s.shift();console.log(e,...s)}function qe(...s){const e="THREE."+s.shift();console.warn(e,...s)}function _t(...s){const e="THREE."+s.shift();console.error(e,...s)}function Ni(...s){const e=s.join(" ");e in Fo||(Fo[e]=!0,qe(...s))}function lc(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}class xi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,e);e.target=null}}}const Ct=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Is=Math.PI/180,Qr=180/Math.PI;function Oi(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ct[s&255]+Ct[s>>8&255]+Ct[s>>16&255]+Ct[s>>24&255]+"-"+Ct[e&255]+Ct[e>>8&255]+"-"+Ct[e>>16&15|64]+Ct[e>>24&255]+"-"+Ct[t&63|128]+Ct[t>>8&255]+"-"+Ct[t>>16&255]+Ct[t>>24&255]+Ct[n&255]+Ct[n>>8&255]+Ct[n>>16&255]+Ct[n>>24&255]).toLowerCase()}function Qe(s,e,t){return Math.max(e,Math.min(t,s))}function cc(s,e){return(s%e+e)%e}function Us(s,e,t){return(1-t)*s+t*e}function bi(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Ft(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}class et{constructor(e=0,t=0){et.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*i+e.x,this.y=r*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class an{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3],f=r[o+0],d=r[o+1],g=r[o+2],x=r[o+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(a>=1){e[t+0]=f,e[t+1]=d,e[t+2]=g,e[t+3]=x;return}if(u!==x||l!==f||c!==d||h!==g){let m=l*f+c*d+h*g+u*x;m<0&&(f=-f,d=-d,g=-g,x=-x,m=-m);let p=1-a;if(m<.9995){const S=Math.acos(m),y=Math.sin(S);p=Math.sin(p*S)/y,a=Math.sin(a*S)/y,l=l*p+f*a,c=c*p+d*a,h=h*p+g*a,u=u*p+x*a}else{l=l*p+f*a,c=c*p+d*a,h=h*p+g*a,u=u*p+x*a;const S=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=S,c*=S,h*=S,u*=S}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,o){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=r[o],f=r[o+1],d=r[o+2],g=r[o+3];return e[t]=a*g+h*u+l*d-c*f,e[t+1]=l*g+h*f+c*u-a*d,e[t+2]=c*g+h*d+a*f-l*u,e[t+3]=h*g-a*u-l*f-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),u=a(r/2),f=l(n/2),d=l(i/2),g=l(r/2);switch(o){case"XYZ":this._x=f*h*u+c*d*g,this._y=c*d*u-f*h*g,this._z=c*h*g+f*d*u,this._w=c*h*u-f*d*g;break;case"YXZ":this._x=f*h*u+c*d*g,this._y=c*d*u-f*h*g,this._z=c*h*g-f*d*u,this._w=c*h*u+f*d*g;break;case"ZXY":this._x=f*h*u-c*d*g,this._y=c*d*u+f*h*g,this._z=c*h*g+f*d*u,this._w=c*h*u-f*d*g;break;case"ZYX":this._x=f*h*u-c*d*g,this._y=c*d*u+f*h*g,this._z=c*h*g-f*d*u,this._w=c*h*u+f*d*g;break;case"YZX":this._x=f*h*u+c*d*g,this._y=c*d*u+f*h*g,this._z=c*h*g-f*d*u,this._w=c*h*u-f*d*g;break;case"XZY":this._x=f*h*u-c*d*g,this._y=c*d*u-f*h*g,this._z=c*h*g+f*d*u,this._w=c*h*u+f*d*g;break;default:qe("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],u=t[10],f=n+a+u;if(f>0){const d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(h-l)*d,this._y=(r-c)*d,this._z=(o-i)*d}else if(n>a&&n>u){const d=2*Math.sqrt(1+n-a-u);this._w=(h-l)/d,this._x=.25*d,this._y=(i+o)/d,this._z=(r+c)/d}else if(a>u){const d=2*Math.sqrt(1+a-n-u);this._w=(r-c)/d,this._x=(i+o)/d,this._y=.25*d,this._z=(l+h)/d}else{const d=2*Math.sqrt(1+u-n-a);this._w=(o-i)/d,this._x=(r+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Qe(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+i*c-r*l,this._y=i*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,i=-i,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class L{constructor(e=0,t=0,n=0){L.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ko.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ko.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*i-a*n),h=2*(a*t-r*i),u=2*(r*n-o*t);return this.x=t+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=i+l*u+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=i*l-r*a,this.y=r*o-n*l,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ns.copy(this).projectOnVector(e),this.sub(Ns)}reflect(e){return this.sub(Ns.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ns=new L,ko=new an;class Ye{constructor(e,t,n,i,r,o,a,l,c){Ye.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,l,c)}set(e,t,n,i,r,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],f=n[2],d=n[5],g=n[8],x=i[0],m=i[3],p=i[6],S=i[1],y=i[4],T=i[7],A=i[2],b=i[5],R=i[8];return r[0]=o*x+a*S+l*A,r[3]=o*m+a*y+l*b,r[6]=o*p+a*T+l*R,r[1]=c*x+h*S+u*A,r[4]=c*m+h*y+u*b,r[7]=c*p+h*T+u*R,r[2]=f*x+d*S+g*A,r[5]=f*m+d*y+g*b,r[8]=f*p+d*T+g*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+i*r*c-i*o*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=h*o-a*c,f=a*l-h*r,d=c*r-o*l,g=t*u+n*f+i*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=u*x,e[1]=(i*c-h*n)*x,e[2]=(a*n-i*o)*x,e[3]=f*x,e[4]=(h*t-i*l)*x,e[5]=(i*r-a*t)*x,e[6]=d*x,e[7]=(n*l-c*t)*x,e[8]=(o*t-n*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-i*c,i*l,-i*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Fs.makeScale(e,t)),this}rotate(e){return this.premultiply(Fs.makeRotation(-e)),this}translate(e,t){return this.premultiply(Fs.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Fs=new Ye,Bo=new Ye().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),zo=new Ye().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function hc(){const s={enabled:!0,workingColorSpace:fi,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ct&&(i.r=vn(i.r),i.g=vn(i.g),i.b=vn(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ct&&(i.r=ci(i.r),i.g=ci(i.g),i.b=ci(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===An?Ss:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return Ni("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return Ni("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[fi]:{primaries:e,whitePoint:n,transfer:Ss,toXYZ:Bo,fromXYZ:zo,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Yt},outputColorSpaceConfig:{drawingBufferColorSpace:Yt}},[Yt]:{primaries:e,whitePoint:n,transfer:ct,toXYZ:Bo,fromXYZ:zo,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Yt}}}),s}const nt=hc();function vn(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ci(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let $n;class uc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{$n===void 0&&($n=Ui("canvas")),$n.width=e.width,$n.height=e.height;const i=$n.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=$n}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ui("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=vn(r[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(vn(t[n]/255)*255):t[n]=vn(t[n]);return{data:t,width:e.width,height:e.height}}else return qe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let dc=0;class po{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:dc++}),this.uuid=Oi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(Os(i[o].image)):r.push(Os(i[o]))}else r=Os(i);n.url=r}return t||(e.images[this.uuid]=n),n}}function Os(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?uc.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(qe("Texture: Unable to serialize Texture."),{})}let fc=0;const ks=new L;class wt extends xi{constructor(e=wt.DEFAULT_IMAGE,t=wt.DEFAULT_MAPPING,n=xn,i=xn,r=Kt,o=Wn,a=nn,l=ln,c=wt.DEFAULT_ANISOTROPY,h=An){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fc++}),this.uuid=Oi(),this.name="",this.source=new po(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new et(0,0),this.repeat=new et(1,1),this.center=new et(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ye,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(ks).x}get height(){return this.source.getSize(ks).y}get depth(){return this.source.getSize(ks).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){qe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){qe(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Ba)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ci:e.x=e.x-Math.floor(e.x);break;case xn:e.x=e.x<0?0:1;break;case Er:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ci:e.y=e.y-Math.floor(e.y);break;case xn:e.y=e.y<0?0:1;break;case Er:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}wt.DEFAULT_IMAGE=null;wt.DEFAULT_MAPPING=Ba;wt.DEFAULT_ANISOTROPY=1;class vt{constructor(e=0,t=0,n=0,i=1){vt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const l=e.elements,c=l[0],h=l[4],u=l[8],f=l[1],d=l[5],g=l[9],x=l[2],m=l[6],p=l[10];if(Math.abs(h-f)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(c+1)/2,T=(d+1)/2,A=(p+1)/2,b=(h+f)/4,R=(u+x)/4,w=(g+m)/4;return y>T&&y>A?y<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(y),i=b/n,r=R/n):T>A?T<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(T),n=b/i,r=w/i):A<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(A),n=R/r,i=w/r),this.set(n,i,r,t),this}let S=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(f-h)*(f-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(u-x)/S,this.z=(f-h)/S,this.w=Math.acos((c+d+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this.w=Qe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this.w=Qe(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class pc extends xi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Kt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new vt(0,0,e,t),this.scissorTest=!1,this.viewport=new vt(0,0,e,t);const i={width:e,height:t,depth:n.depth},r=new wt(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:Kt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new po(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Pn extends pc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Ja extends wt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class mc extends wt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ki{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(jt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(jt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=jt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,jt):jt.fromBufferAttribute(r,o),jt.applyMatrix4(e.matrixWorld),this.expandByPoint(jt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Vi.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Vi.copy(n.boundingBox)),Vi.applyMatrix4(e.matrixWorld),this.union(Vi)}const i=e.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,jt),jt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(yi),Wi.subVectors(this.max,yi),Kn.subVectors(e.a,yi),Jn.subVectors(e.b,yi),jn.subVectors(e.c,yi),Sn.subVectors(Jn,Kn),bn.subVectors(jn,Jn),Un.subVectors(Kn,jn);let t=[0,-Sn.z,Sn.y,0,-bn.z,bn.y,0,-Un.z,Un.y,Sn.z,0,-Sn.x,bn.z,0,-bn.x,Un.z,0,-Un.x,-Sn.y,Sn.x,0,-bn.y,bn.x,0,-Un.y,Un.x,0];return!Bs(t,Kn,Jn,jn,Wi)||(t=[1,0,0,0,1,0,0,0,1],!Bs(t,Kn,Jn,jn,Wi))?!1:(Xi.crossVectors(Sn,bn),t=[Xi.x,Xi.y,Xi.z],Bs(t,Kn,Jn,jn,Wi))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,jt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(jt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(hn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),hn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),hn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),hn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),hn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),hn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),hn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),hn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(hn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const hn=[new L,new L,new L,new L,new L,new L,new L,new L],jt=new L,Vi=new ki,Kn=new L,Jn=new L,jn=new L,Sn=new L,bn=new L,Un=new L,yi=new L,Wi=new L,Xi=new L,Nn=new L;function Bs(s,e,t,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Nn.fromArray(s,r);const a=i.x*Math.abs(Nn.x)+i.y*Math.abs(Nn.y)+i.z*Math.abs(Nn.z),l=e.dot(Nn),c=t.dot(Nn),h=n.dot(Nn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const gc=new ki,Mi=new L,zs=new L;class pi{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):gc.setFromPoints(e).getCenter(n);let i=0;for(let r=0,o=e.length;r<o;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Mi.subVectors(e,this.center);const t=Mi.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Mi,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(zs.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Mi.copy(e.center).add(zs)),this.expandByPoint(Mi.copy(e.center).sub(zs))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const un=new L,Gs=new L,qi=new L,yn=new L,Hs=new L,Yi=new L,Vs=new L;class mo{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,un)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=un.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(un.copy(this.origin).addScaledVector(this.direction,t),un.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Gs.copy(e).add(t).multiplyScalar(.5),qi.copy(t).sub(e).normalize(),yn.copy(this.origin).sub(Gs);const r=e.distanceTo(t)*.5,o=-this.direction.dot(qi),a=yn.dot(this.direction),l=-yn.dot(qi),c=yn.lengthSq(),h=Math.abs(1-o*o);let u,f,d,g;if(h>0)if(u=o*l-a,f=o*a-l,g=r*h,u>=0)if(f>=-g)if(f<=g){const x=1/h;u*=x,f*=x,d=u*(u+o*f+2*a)+f*(o*u+f+2*l)+c}else f=r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*l)+c;else f=-r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*l)+c;else f<=-g?(u=Math.max(0,-(-o*r+a)),f=u>0?-r:Math.min(Math.max(-r,-l),r),d=-u*u+f*(f+2*l)+c):f<=g?(u=0,f=Math.min(Math.max(-r,-l),r),d=f*(f+2*l)+c):(u=Math.max(0,-(o*r+a)),f=u>0?r:Math.min(Math.max(-r,-l),r),d=-u*u+f*(f+2*l)+c);else f=o>0?-r:r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Gs).addScaledVector(qi,f),d}intersectSphere(e,t){un.subVectors(e.center,this.origin);const n=un.dot(this.direction),i=un.dot(un)-n*n,r=e.radius*e.radius;if(i>r)return null;const o=Math.sqrt(r-i),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return c>=0?(n=(e.min.x-f.x)*c,i=(e.max.x-f.x)*c):(n=(e.max.x-f.x)*c,i=(e.min.x-f.x)*c),h>=0?(r=(e.min.y-f.y)*h,o=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,o=(e.min.y-f.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-f.z)*u,l=(e.max.z-f.z)*u):(a=(e.max.z-f.z)*u,l=(e.min.z-f.z)*u),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,un)!==null}intersectTriangle(e,t,n,i,r){Hs.subVectors(t,e),Yi.subVectors(n,e),Vs.crossVectors(Hs,Yi);let o=this.direction.dot(Vs),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;yn.subVectors(this.origin,e);const l=a*this.direction.dot(Yi.crossVectors(yn,Yi));if(l<0)return null;const c=a*this.direction.dot(Hs.cross(yn));if(c<0||l+c>o)return null;const h=-a*yn.dot(Vs);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class dt{constructor(e,t,n,i,r,o,a,l,c,h,u,f,d,g,x,m){dt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,l,c,h,u,f,d,g,x,m)}set(e,t,n,i,r,o,a,l,c,h,u,f,d,g,x,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=f,p[3]=d,p[7]=g,p[11]=x,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new dt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/Zn.setFromMatrixColumn(e,0).length(),r=1/Zn.setFromMatrixColumn(e,1).length(),o=1/Zn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const f=o*h,d=o*u,g=a*h,x=a*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=d+g*c,t[5]=f-x*c,t[9]=-a*l,t[2]=x-f*c,t[6]=g+d*c,t[10]=o*l}else if(e.order==="YXZ"){const f=l*h,d=l*u,g=c*h,x=c*u;t[0]=f+x*a,t[4]=g*a-d,t[8]=o*c,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=d*a-g,t[6]=x+f*a,t[10]=o*l}else if(e.order==="ZXY"){const f=l*h,d=l*u,g=c*h,x=c*u;t[0]=f-x*a,t[4]=-o*u,t[8]=g+d*a,t[1]=d+g*a,t[5]=o*h,t[9]=x-f*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const f=o*h,d=o*u,g=a*h,x=a*u;t[0]=l*h,t[4]=g*c-d,t[8]=f*c+x,t[1]=l*u,t[5]=x*c+f,t[9]=d*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const f=o*l,d=o*c,g=a*l,x=a*c;t[0]=l*h,t[4]=x-f*u,t[8]=g*u+d,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=d*u+g,t[10]=f-x*u}else if(e.order==="XZY"){const f=o*l,d=o*c,g=a*l,x=a*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=f*u+x,t[5]=o*h,t[9]=d*u-g,t[2]=g*u-d,t[6]=a*h,t[10]=x*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(xc,e,_c)}lookAt(e,t,n){const i=this.elements;return zt.subVectors(e,t),zt.lengthSq()===0&&(zt.z=1),zt.normalize(),Mn.crossVectors(n,zt),Mn.lengthSq()===0&&(Math.abs(n.z)===1?zt.x+=1e-4:zt.z+=1e-4,zt.normalize(),Mn.crossVectors(n,zt)),Mn.normalize(),$i.crossVectors(zt,Mn),i[0]=Mn.x,i[4]=$i.x,i[8]=zt.x,i[1]=Mn.y,i[5]=$i.y,i[9]=zt.y,i[2]=Mn.z,i[6]=$i.z,i[10]=zt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],f=n[9],d=n[13],g=n[2],x=n[6],m=n[10],p=n[14],S=n[3],y=n[7],T=n[11],A=n[15],b=i[0],R=i[4],w=i[8],v=i[12],_=i[1],D=i[5],I=i[9],F=i[13],B=i[2],G=i[6],W=i[10],Z=i[14],X=i[3],te=i[7],ne=i[11],pe=i[15];return r[0]=o*b+a*_+l*B+c*X,r[4]=o*R+a*D+l*G+c*te,r[8]=o*w+a*I+l*W+c*ne,r[12]=o*v+a*F+l*Z+c*pe,r[1]=h*b+u*_+f*B+d*X,r[5]=h*R+u*D+f*G+d*te,r[9]=h*w+u*I+f*W+d*ne,r[13]=h*v+u*F+f*Z+d*pe,r[2]=g*b+x*_+m*B+p*X,r[6]=g*R+x*D+m*G+p*te,r[10]=g*w+x*I+m*W+p*ne,r[14]=g*v+x*F+m*Z+p*pe,r[3]=S*b+y*_+T*B+A*X,r[7]=S*R+y*D+T*G+A*te,r[11]=S*w+y*I+T*W+A*ne,r[15]=S*v+y*F+T*Z+A*pe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],u=e[6],f=e[10],d=e[14],g=e[3],x=e[7],m=e[11],p=e[15];return g*(+r*l*u-i*c*u-r*a*f+n*c*f+i*a*d-n*l*d)+x*(+t*l*d-t*c*f+r*o*f-i*o*d+i*c*h-r*l*h)+m*(+t*c*u-t*a*d-r*o*u+n*o*d+r*a*h-n*c*h)+p*(-i*a*h-t*l*u+t*a*f+i*o*u-n*o*f+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=e[9],f=e[10],d=e[11],g=e[12],x=e[13],m=e[14],p=e[15],S=u*m*c-x*f*c+x*l*d-a*m*d-u*l*p+a*f*p,y=g*f*c-h*m*c-g*l*d+o*m*d+h*l*p-o*f*p,T=h*x*c-g*u*c+g*a*d-o*x*d-h*a*p+o*u*p,A=g*u*l-h*x*l-g*a*f+o*x*f+h*a*m-o*u*m,b=t*S+n*y+i*T+r*A;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/b;return e[0]=S*R,e[1]=(x*f*r-u*m*r-x*i*d+n*m*d+u*i*p-n*f*p)*R,e[2]=(a*m*r-x*l*r+x*i*c-n*m*c-a*i*p+n*l*p)*R,e[3]=(u*l*r-a*f*r-u*i*c+n*f*c+a*i*d-n*l*d)*R,e[4]=y*R,e[5]=(h*m*r-g*f*r+g*i*d-t*m*d-h*i*p+t*f*p)*R,e[6]=(g*l*r-o*m*r-g*i*c+t*m*c+o*i*p-t*l*p)*R,e[7]=(o*f*r-h*l*r+h*i*c-t*f*c-o*i*d+t*l*d)*R,e[8]=T*R,e[9]=(g*u*r-h*x*r-g*n*d+t*x*d+h*n*p-t*u*p)*R,e[10]=(o*x*r-g*a*r+g*n*c-t*x*c-o*n*p+t*a*p)*R,e[11]=(h*a*r-o*u*r-h*n*c+t*u*c+o*n*d-t*a*d)*R,e[12]=A*R,e[13]=(h*x*i-g*u*i+g*n*f-t*x*f-h*n*m+t*u*m)*R,e[14]=(g*a*i-o*x*i-g*n*l+t*x*l+o*n*m-t*a*m)*R,e[15]=(o*u*i-h*a*i+h*n*l-t*u*l-o*n*f+t*a*f)*R,this}scale(e){const t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,o){return this.set(1,n,r,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,u=a+a,f=r*c,d=r*h,g=r*u,x=o*h,m=o*u,p=a*u,S=l*c,y=l*h,T=l*u,A=n.x,b=n.y,R=n.z;return i[0]=(1-(x+p))*A,i[1]=(d+T)*A,i[2]=(g-y)*A,i[3]=0,i[4]=(d-T)*b,i[5]=(1-(f+p))*b,i[6]=(m+S)*b,i[7]=0,i[8]=(g+y)*R,i[9]=(m-S)*R,i[10]=(1-(f+x))*R,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let r=Zn.set(i[0],i[1],i[2]).length();const o=Zn.set(i[4],i[5],i[6]).length(),a=Zn.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14],Zt.copy(this);const c=1/r,h=1/o,u=1/a;return Zt.elements[0]*=c,Zt.elements[1]*=c,Zt.elements[2]*=c,Zt.elements[4]*=h,Zt.elements[5]*=h,Zt.elements[6]*=h,Zt.elements[8]*=u,Zt.elements[9]*=u,Zt.elements[10]*=u,t.setFromRotationMatrix(Zt),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,i,r,o,a=on,l=!1){const c=this.elements,h=2*r/(t-e),u=2*r/(n-i),f=(t+e)/(t-e),d=(n+i)/(n-i);let g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===on)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===bs)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=f,c[12]=0,c[1]=0,c[5]=u,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,r,o,a=on,l=!1){const c=this.elements,h=2/(t-e),u=2/(n-i),f=-(t+e)/(t-e),d=-(n+i)/(n-i);let g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===on)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===bs)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=f,c[1]=0,c[5]=u,c[9]=0,c[13]=d,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Zn=new L,Zt=new dt,xc=new L(0,0,0),_c=new L(1,1,1),Mn=new L,$i=new L,zt=new L,Go=new dt,Ho=new an;class cn{constructor(e=0,t=0,n=0,i=cn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,r=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],u=i[2],f=i[6],d=i[10];switch(t){case"XYZ":this._y=Math.asin(Qe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Qe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Qe(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Qe(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Qe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-Qe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:qe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Go.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Go,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ho.setFromEuler(this),this.setFromQuaternion(Ho,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}cn.DEFAULT_ORDER="XYZ";class go{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let vc=0;const Vo=new L,Qn=new an,dn=new dt,Ki=new L,Ei=new L,Sc=new L,bc=new an,Wo=new L(1,0,0),Xo=new L(0,1,0),qo=new L(0,0,1),Yo={type:"added"},yc={type:"removed"},ei={type:"childadded",child:null},Ws={type:"childremoved",child:null};class At extends xi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:vc++}),this.uuid=Oi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=At.DEFAULT_UP.clone();const e=new L,t=new cn,n=new an,i=new L(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new dt},normalMatrix:{value:new Ye}}),this.matrix=new dt,this.matrixWorld=new dt,this.matrixAutoUpdate=At.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new go,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Qn.setFromAxisAngle(e,t),this.quaternion.multiply(Qn),this}rotateOnWorldAxis(e,t){return Qn.setFromAxisAngle(e,t),this.quaternion.premultiply(Qn),this}rotateX(e){return this.rotateOnAxis(Wo,e)}rotateY(e){return this.rotateOnAxis(Xo,e)}rotateZ(e){return this.rotateOnAxis(qo,e)}translateOnAxis(e,t){return Vo.copy(e).applyQuaternion(this.quaternion),this.position.add(Vo.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Wo,e)}translateY(e){return this.translateOnAxis(Xo,e)}translateZ(e){return this.translateOnAxis(qo,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(dn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ki.copy(e):Ki.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ei.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?dn.lookAt(Ei,Ki,this.up):dn.lookAt(Ki,Ei,this.up),this.quaternion.setFromRotationMatrix(dn),i&&(dn.extractRotation(i.matrixWorld),Qn.setFromRotationMatrix(dn),this.quaternion.premultiply(Qn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(_t("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Yo),ei.child=e,this.dispatchEvent(ei),ei.child=null):_t("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(yc),Ws.child=e,this.dispatchEvent(Ws),Ws.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(dn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Yo),ei.child=e,this.dispatchEvent(ei),ei.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ei,e,Sc),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ei,bc,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));i.material=a}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),u=o(e.shapes),f=o(e.skeletons),d=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=i,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}At.DEFAULT_UP=new L(0,1,0);At.DEFAULT_MATRIX_AUTO_UPDATE=!0;At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Qt=new L,fn=new L,Xs=new L,pn=new L,ti=new L,ni=new L,$o=new L,qs=new L,Ys=new L,$s=new L,Ks=new vt,Js=new vt,js=new vt;class en{constructor(e=new L,t=new L,n=new L){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),Qt.subVectors(e,t),i.cross(Qt);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){Qt.subVectors(i,t),fn.subVectors(n,t),Xs.subVectors(e,t);const o=Qt.dot(Qt),a=Qt.dot(fn),l=Qt.dot(Xs),c=fn.dot(fn),h=fn.dot(Xs),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const f=1/u,d=(c*l-a*h)*f,g=(o*h-a*l)*f;return r.set(1-d-g,g,d)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,pn)===null?!1:pn.x>=0&&pn.y>=0&&pn.x+pn.y<=1}static getInterpolation(e,t,n,i,r,o,a,l){return this.getBarycoord(e,t,n,i,pn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,pn.x),l.addScaledVector(o,pn.y),l.addScaledVector(a,pn.z),l)}static getInterpolatedAttribute(e,t,n,i,r,o){return Ks.setScalar(0),Js.setScalar(0),js.setScalar(0),Ks.fromBufferAttribute(e,t),Js.fromBufferAttribute(e,n),js.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(Ks,r.x),o.addScaledVector(Js,r.y),o.addScaledVector(js,r.z),o}static isFrontFacing(e,t,n,i){return Qt.subVectors(n,t),fn.subVectors(e,t),Qt.cross(fn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Qt.subVectors(this.c,this.b),fn.subVectors(this.a,this.b),Qt.cross(fn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return en.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return en.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return en.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return en.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return en.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,r=this.c;let o,a;ti.subVectors(i,n),ni.subVectors(r,n),qs.subVectors(e,n);const l=ti.dot(qs),c=ni.dot(qs);if(l<=0&&c<=0)return t.copy(n);Ys.subVectors(e,i);const h=ti.dot(Ys),u=ni.dot(Ys);if(h>=0&&u<=h)return t.copy(i);const f=l*u-h*c;if(f<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(ti,o);$s.subVectors(e,r);const d=ti.dot($s),g=ni.dot($s);if(g>=0&&d<=g)return t.copy(r);const x=d*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(ni,a);const m=h*g-d*u;if(m<=0&&u-h>=0&&d-g>=0)return $o.subVectors(r,i),a=(u-h)/(u-h+(d-g)),t.copy(i).addScaledVector($o,a);const p=1/(m+x+f);return o=x*p,a=f*p,t.copy(n).addScaledVector(ti,o).addScaledVector(ni,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const ja={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},En={h:0,s:0,l:0},Ji={h:0,s:0,l:0};function Zs(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class Le{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Yt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,nt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=nt.workingColorSpace){return this.r=e,this.g=t,this.b=n,nt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=nt.workingColorSpace){if(e=cc(e,1),t=Qe(t,0,1),n=Qe(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Zs(o,r,e+1/3),this.g=Zs(o,r,e),this.b=Zs(o,r,e-1/3)}return nt.colorSpaceToWorking(this,i),this}setStyle(e,t=Yt){function n(r){r!==void 0&&parseFloat(r)<1&&qe("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:qe("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);qe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Yt){const n=ja[e.toLowerCase()];return n!==void 0?this.setHex(n,t):qe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=vn(e.r),this.g=vn(e.g),this.b=vn(e.b),this}copyLinearToSRGB(e){return this.r=ci(e.r),this.g=ci(e.g),this.b=ci(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Yt){return nt.workingToColorSpace(Dt.copy(this),e),Math.round(Qe(Dt.r*255,0,255))*65536+Math.round(Qe(Dt.g*255,0,255))*256+Math.round(Qe(Dt.b*255,0,255))}getHexString(e=Yt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=nt.workingColorSpace){nt.workingToColorSpace(Dt.copy(this),t);const n=Dt.r,i=Dt.g,r=Dt.b,o=Math.max(n,i,r),a=Math.min(n,i,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(i-r)/u+(i<r?6:0);break;case i:l=(r-n)/u+2;break;case r:l=(n-i)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=nt.workingColorSpace){return nt.workingToColorSpace(Dt.copy(this),t),e.r=Dt.r,e.g=Dt.g,e.b=Dt.b,e}getStyle(e=Yt){nt.workingToColorSpace(Dt.copy(this),e);const t=Dt.r,n=Dt.g,i=Dt.b;return e!==Yt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(En),this.setHSL(En.h+e,En.s+t,En.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(En),e.getHSL(Ji);const n=Us(En.h,Ji.h,t),i=Us(En.s,Ji.s,t),r=Us(En.l,Ji.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Dt=new Le;Le.NAMES=ja;let Mc=0;class _i extends xi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Mc++}),this.uuid=Oi(),this.name="",this.type="Material",this.blending=li,this.side=Dn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=fr,this.blendDst=pr,this.blendEquation=Gn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Le(0,0,0),this.blendAlpha=0,this.depthFunc=hi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Io,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Yn,this.stencilZFail=Yn,this.stencilZPass=Yn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){qe(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){qe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==li&&(n.blending=this.blending),this.side!==Dn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==fr&&(n.blendSrc=this.blendSrc),this.blendDst!==pr&&(n.blendDst=this.blendDst),this.blendEquation!==Gn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==hi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Io&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Yn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Yn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Yn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=i(e.textures),o=i(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class xo extends _i{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Le(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.combine=ro,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const St=new L,ji=new et;let Ec=0;class Ot{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ec++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Uo,this.updateRanges=[],this.gpuType=tn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ji.fromBufferAttribute(this,t),ji.applyMatrix3(e),this.setXY(t,ji.x,ji.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyMatrix3(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyMatrix4(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyNormalMatrix(e),this.setXYZ(t,St.x,St.y,St.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.transformDirection(e),this.setXYZ(t,St.x,St.y,St.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=bi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ft(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bi(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bi(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bi(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array),i=Ft(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array),i=Ft(i,this.array),r=Ft(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Uo&&(e.usage=this.usage),e}}class Za extends Ot{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Qa extends Ot{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class _e extends Ot{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Tc=0;const qt=new dt,Qs=new At,ii=new L,Gt=new ki,Ti=new ki,Et=new L;class rt extends xi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Tc++}),this.uuid=Oi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Ka(e)?Qa:Za)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Ye().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return qt.makeRotationFromQuaternion(e),this.applyMatrix4(qt),this}rotateX(e){return qt.makeRotationX(e),this.applyMatrix4(qt),this}rotateY(e){return qt.makeRotationY(e),this.applyMatrix4(qt),this}rotateZ(e){return qt.makeRotationZ(e),this.applyMatrix4(qt),this}translate(e,t,n){return qt.makeTranslation(e,t,n),this.applyMatrix4(qt),this}scale(e,t,n){return qt.makeScale(e,t,n),this.applyMatrix4(qt),this}lookAt(e){return Qs.lookAt(e),Qs.updateMatrix(),this.applyMatrix4(Qs.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ii).negate(),this.translate(ii.x,ii.y,ii.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,r=e.length;i<r;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new _e(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&qe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ki);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){_t("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const r=t[n];Gt.setFromBufferAttribute(r),this.morphTargetsRelative?(Et.addVectors(this.boundingBox.min,Gt.min),this.boundingBox.expandByPoint(Et),Et.addVectors(this.boundingBox.max,Gt.max),this.boundingBox.expandByPoint(Et)):(this.boundingBox.expandByPoint(Gt.min),this.boundingBox.expandByPoint(Gt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&_t('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new pi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){_t("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(e){const n=this.boundingSphere.center;if(Gt.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Ti.setFromBufferAttribute(a),this.morphTargetsRelative?(Et.addVectors(Gt.min,Ti.min),Gt.expandByPoint(Et),Et.addVectors(Gt.max,Ti.max),Gt.expandByPoint(Et)):(Gt.expandByPoint(Ti.min),Gt.expandByPoint(Ti.max))}Gt.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)Et.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(Et));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Et.fromBufferAttribute(a,c),l&&(ii.fromBufferAttribute(e,c),Et.add(ii)),i=Math.max(i,n.distanceToSquared(Et))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&_t('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){_t("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ot(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let w=0;w<n.count;w++)a[w]=new L,l[w]=new L;const c=new L,h=new L,u=new L,f=new et,d=new et,g=new et,x=new L,m=new L;function p(w,v,_){c.fromBufferAttribute(n,w),h.fromBufferAttribute(n,v),u.fromBufferAttribute(n,_),f.fromBufferAttribute(r,w),d.fromBufferAttribute(r,v),g.fromBufferAttribute(r,_),h.sub(c),u.sub(c),d.sub(f),g.sub(f);const D=1/(d.x*g.y-g.x*d.y);isFinite(D)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-d.y).multiplyScalar(D),m.copy(u).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(D),a[w].add(x),a[v].add(x),a[_].add(x),l[w].add(m),l[v].add(m),l[_].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let w=0,v=S.length;w<v;++w){const _=S[w],D=_.start,I=_.count;for(let F=D,B=D+I;F<B;F+=3)p(e.getX(F+0),e.getX(F+1),e.getX(F+2))}const y=new L,T=new L,A=new L,b=new L;function R(w){A.fromBufferAttribute(i,w),b.copy(A);const v=a[w];y.copy(v),y.sub(A.multiplyScalar(A.dot(v))).normalize(),T.crossVectors(b,v);const D=T.dot(l[w])<0?-1:1;o.setXYZW(w,y.x,y.y,y.z,D)}for(let w=0,v=S.length;w<v;++w){const _=S[w],D=_.start,I=_.count;for(let F=D,B=D+I;F<B;F+=3)R(e.getX(F+0)),R(e.getX(F+1)),R(e.getX(F+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ot(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,d=n.count;f<d;f++)n.setXYZ(f,0,0,0);const i=new L,r=new L,o=new L,a=new L,l=new L,c=new L,h=new L,u=new L;if(e)for(let f=0,d=e.count;f<d;f+=3){const g=e.getX(f+0),x=e.getX(f+1),m=e.getX(f+2);i.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),o.fromBufferAttribute(t,m),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let f=0,d=t.count;f<d;f+=3)i.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Et.fromBufferAttribute(e,t),Et.normalize(),e.setXYZ(t,Et.x,Et.y,Et.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,u=a.normalized,f=new c.constructor(l.length*h);let d=0,g=0;for(let x=0,m=l.length;x<m;x++){a.isInterleavedBufferAttribute?d=l[x]*a.data.stride+a.offset:d=l[x]*h;for(let p=0;p<h;p++)f[g++]=c[d++]}return new Ot(f,h,u)}if(this.index===null)return qe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new rt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=e(l,n);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const f=c[h],d=e(f,n);l.push(d)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,f=c.length;u<f;u++){const d=c[u];h.push(d.toJSON(e.data))}h.length>0&&(i[l]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],u=r[c];for(let f=0,d=u.length;f<d;f++)h.push(u[f].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ko=new dt,Fn=new mo,Zi=new pi,Jo=new L,Qi=new L,es=new L,ts=new L,er=new L,ns=new L,jo=new L,is=new L;class Xe extends At{constructor(e=new rt,t=new xo){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(r&&a){ns.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(er.fromBufferAttribute(u,e),o?ns.addScaledVector(er,h):ns.addScaledVector(er.sub(t),h))}t.add(ns)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Zi.copy(n.boundingSphere),Zi.applyMatrix4(r),Fn.copy(e.ray).recast(e.near),!(Zi.containsPoint(Fn.origin)===!1&&(Fn.intersectSphere(Zi,Jo)===null||Fn.origin.distanceToSquared(Jo)>(e.far-e.near)**2))&&(Ko.copy(r).invert(),Fn.copy(e.ray).applyMatrix4(Ko),!(n.boundingBox!==null&&Fn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Fn)))}_computeIntersections(e,t,n){let i;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=f.length;g<x;g++){const m=f[g],p=o[m.materialIndex],S=Math.max(m.start,d.start),y=Math.min(a.count,Math.min(m.start+m.count,d.start+d.count));for(let T=S,A=y;T<A;T+=3){const b=a.getX(T),R=a.getX(T+1),w=a.getX(T+2);i=ss(this,p,e,n,c,h,u,b,R,w),i&&(i.faceIndex=Math.floor(T/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const g=Math.max(0,d.start),x=Math.min(a.count,d.start+d.count);for(let m=g,p=x;m<p;m+=3){const S=a.getX(m),y=a.getX(m+1),T=a.getX(m+2);i=ss(this,o,e,n,c,h,u,S,y,T),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=f.length;g<x;g++){const m=f[g],p=o[m.materialIndex],S=Math.max(m.start,d.start),y=Math.min(l.count,Math.min(m.start+m.count,d.start+d.count));for(let T=S,A=y;T<A;T+=3){const b=T,R=T+1,w=T+2;i=ss(this,p,e,n,c,h,u,b,R,w),i&&(i.faceIndex=Math.floor(T/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const g=Math.max(0,d.start),x=Math.min(l.count,d.start+d.count);for(let m=g,p=x;m<p;m+=3){const S=m,y=m+1,T=m+2;i=ss(this,o,e,n,c,h,u,S,y,T),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}}}function Ac(s,e,t,n,i,r,o,a){let l;if(e.side===Pt?l=n.intersectTriangle(o,r,i,!0,a):l=n.intersectTriangle(i,r,o,e.side===Dn,a),l===null)return null;is.copy(a),is.applyMatrix4(s.matrixWorld);const c=t.ray.origin.distanceTo(is);return c<t.near||c>t.far?null:{distance:c,point:is.clone(),object:s}}function ss(s,e,t,n,i,r,o,a,l,c){s.getVertexPosition(a,Qi),s.getVertexPosition(l,es),s.getVertexPosition(c,ts);const h=Ac(s,e,t,n,Qi,es,ts,jo);if(h){const u=new L;en.getBarycoord(jo,Qi,es,ts,u),i&&(h.uv=en.getInterpolatedAttribute(i,a,l,c,u,new et)),r&&(h.uv1=en.getInterpolatedAttribute(r,a,l,c,u,new et)),o&&(h.normal=en.getInterpolatedAttribute(o,a,l,c,u,new L),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const f={a,b:l,c,normal:new L,materialIndex:0};en.getNormal(Qi,es,ts,f.normal),h.face=f,h.barycoord=u}return h}class Bi extends rt{constructor(e=1,t=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};const a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let f=0,d=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,i,o,2),g("x","z","y",1,-1,e,n,-t,i,o,3),g("x","y","z",1,-1,e,t,n,i,r,4),g("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(l),this.setAttribute("position",new _e(c,3)),this.setAttribute("normal",new _e(h,3)),this.setAttribute("uv",new _e(u,2));function g(x,m,p,S,y,T,A,b,R,w,v){const _=T/R,D=A/w,I=T/2,F=A/2,B=b/2,G=R+1,W=w+1;let Z=0,X=0;const te=new L;for(let ne=0;ne<W;ne++){const pe=ne*D-F;for(let he=0;he<G;he++){const Ve=he*_-I;te[x]=Ve*S,te[m]=pe*y,te[p]=B,c.push(te.x,te.y,te.z),te[x]=0,te[m]=0,te[p]=b>0?1:-1,h.push(te.x,te.y,te.z),u.push(he/R),u.push(1-ne/w),Z+=1}}for(let ne=0;ne<w;ne++)for(let pe=0;pe<R;pe++){const he=f+pe+G*ne,Ve=f+pe+G*(ne+1),Ke=f+(pe+1)+G*(ne+1),je=f+(pe+1)+G*ne;l.push(he,Ve,je),l.push(Ve,Ke,je),X+=6}a.addGroup(d,X,v),d+=X,f+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Bi(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function mi(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(qe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function It(s){const e={};for(let t=0;t<s.length;t++){const n=mi(s[t]);for(const i in n)e[i]=n[i]}return e}function Rc(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function el(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:nt.workingColorSpace}const wc={clone:mi,merge:It};var Cc=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Dc=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Tt extends _i{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Cc,this.fragmentShader=Dc,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=mi(e.uniforms),this.uniformsGroups=Rc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class tl extends At{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new dt,this.projectionMatrix=new dt,this.projectionMatrixInverse=new dt,this.coordinateSystem=on,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Tn=new L,Zo=new et,Qo=new et;class $t extends tl{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Qr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Is*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Qr*2*Math.atan(Math.tan(Is*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Tn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Tn.x,Tn.y).multiplyScalar(-e/Tn.z),Tn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Tn.x,Tn.y).multiplyScalar(-e/Tn.z)}getViewSize(e,t){return this.getViewBounds(e,Zo,Qo),t.subVectors(Qo,Zo)}setViewOffset(e,t,n,i,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Is*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*i/l,t-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const si=-90,ri=1;class Pc extends At{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new $t(si,ri,e,t);i.layers=this.layers,this.add(i);const r=new $t(si,ri,e,t);r.layers=this.layers,this.add(r);const o=new $t(si,ri,e,t);o.layers=this.layers,this.add(o);const a=new $t(si,ri,e,t);a.layers=this.layers,this.add(a);const l=new $t(si,ri,e,t);l.layers=this.layers,this.add(l);const c=new $t(si,ri,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===on)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===bs)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,r),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,f,d),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class nl extends wt{constructor(e=[],t=ui,n,i,r,o,a,l,c,h){super(e,t,n,i,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Lc extends Pn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new nl(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Bi(5,5,5),r=new Tt({name:"CubemapFromEquirect",uniforms:mi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Pt,blending:_n});r.uniforms.tEquirect.value=t;const o=new Xe(i,r),a=t.minFilter;return t.minFilter===Wn&&(t.minFilter=Kt),new Pc(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(r)}}class Wt extends At{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ic={type:"move"};class tr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Wt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Wt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Wt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const x of e.hand.values()){const m=t.getJointPose(x,n),p=this._getHandJoint(c,x);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],f=h.position.distanceTo(u.position),d=.02,g=.005;c.inputState.pinching&&f>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&f<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ic)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Wt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class _o{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new Le(e),this.near=t,this.far=n}clone(){return new _o(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Uc extends At{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new cn,this.environmentIntensity=1,this.environmentRotation=new cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Nc extends wt{constructor(e=null,t=1,n=1,i,r,o,a,l,c=Rt,h=Rt,u,f){super(null,o,a,l,c,h,i,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const nr=new L,Fc=new L,Oc=new Ye;class zn{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=nr.subVectors(n,t).cross(Fc.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(nr),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Oc.getNormalMatrix(e),i=this.coplanarPoint(nr).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const On=new pi,kc=new et(.5,.5),rs=new L;class Ts{constructor(e=new zn,t=new zn,n=new zn,i=new zn,r=new zn,o=new zn){this.planes=[e,t,n,i,r,o]}set(e,t,n,i,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=on,n=!1){const i=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],f=r[6],d=r[7],g=r[8],x=r[9],m=r[10],p=r[11],S=r[12],y=r[13],T=r[14],A=r[15];if(i[0].setComponents(c-o,d-h,p-g,A-S).normalize(),i[1].setComponents(c+o,d+h,p+g,A+S).normalize(),i[2].setComponents(c+a,d+u,p+x,A+y).normalize(),i[3].setComponents(c-a,d-u,p-x,A-y).normalize(),n)i[4].setComponents(l,f,m,T).normalize(),i[5].setComponents(c-l,d-f,p-m,A-T).normalize();else if(i[4].setComponents(c-l,d-f,p-m,A-T).normalize(),t===on)i[5].setComponents(c+l,d+f,p+m,A+T).normalize();else if(t===bs)i[5].setComponents(l,f,m,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),On.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),On.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(On)}intersectsSprite(e){On.center.set(0,0,0);const t=kc.distanceTo(e.center);return On.radius=.7071067811865476+t,On.applyMatrix4(e.matrixWorld),this.intersectsSphere(On)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(rs.x=i.normal.x>0?e.max.x:e.min.x,rs.y=i.normal.y>0?e.max.y:e.min.y,rs.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(rs)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class il extends _i{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Le(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ys=new L,Ms=new L,ea=new dt,Ai=new mo,os=new pi,ir=new L,ta=new L;class Bc extends At{constructor(e=new rt,t=new il){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)ys.fromBufferAttribute(t,i-1),Ms.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=ys.distanceTo(Ms);e.setAttribute("lineDistance",new _e(n,1))}else qe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),os.copy(n.boundingSphere),os.applyMatrix4(i),os.radius+=r,e.ray.intersectsSphere(os)===!1)return;ea.copy(i).invert(),Ai.copy(e.ray).applyMatrix4(ea);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,f=n.attributes.position;if(h!==null){const d=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let x=d,m=g-1;x<m;x+=c){const p=h.getX(x),S=h.getX(x+1),y=as(this,e,Ai,l,p,S,x);y&&t.push(y)}if(this.isLineLoop){const x=h.getX(g-1),m=h.getX(d),p=as(this,e,Ai,l,x,m,g-1);p&&t.push(p)}}else{const d=Math.max(0,o.start),g=Math.min(f.count,o.start+o.count);for(let x=d,m=g-1;x<m;x+=c){const p=as(this,e,Ai,l,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){const x=as(this,e,Ai,l,g-1,d,g-1);x&&t.push(x)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function as(s,e,t,n,i,r,o){const a=s.geometry.attributes.position;if(ys.fromBufferAttribute(a,i),Ms.fromBufferAttribute(a,r),t.distanceSqToSegment(ys,Ms,ir,ta)>n)return;ir.applyMatrix4(s.matrixWorld);const c=e.ray.origin.distanceTo(ir);if(!(c<e.near||c>e.far))return{distance:c,point:ta.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}const na=new L,ia=new L;class zc extends Bc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)na.fromBufferAttribute(t,i),ia.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+na.distanceTo(ia);e.setAttribute("lineDistance",new _e(n,1))}else qe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Gc extends wt{constructor(e,t,n,i,r,o,a,l,c){super(e,t,n,i,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class vo extends wt{constructor(e,t,n=Xn,i,r,o,a=Rt,l=Rt,c,h=Li,u=1){if(h!==Li&&h!==Ii)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:u};super(f,i,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new po(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class sl extends wt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class As extends rt{constructor(e=1,t=1,n=1,i=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),r=Math.floor(r);const h=[],u=[],f=[],d=[];let g=0;const x=[],m=n/2;let p=0;S(),o===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new _e(u,3)),this.setAttribute("normal",new _e(f,3)),this.setAttribute("uv",new _e(d,2));function S(){const T=new L,A=new L;let b=0;const R=(t-e)/n;for(let w=0;w<=r;w++){const v=[],_=w/r,D=_*(t-e)+e;for(let I=0;I<=i;I++){const F=I/i,B=F*l+a,G=Math.sin(B),W=Math.cos(B);A.x=D*G,A.y=-_*n+m,A.z=D*W,u.push(A.x,A.y,A.z),T.set(G,R,W).normalize(),f.push(T.x,T.y,T.z),d.push(F,1-_),v.push(g++)}x.push(v)}for(let w=0;w<i;w++)for(let v=0;v<r;v++){const _=x[v][w],D=x[v+1][w],I=x[v+1][w+1],F=x[v][w+1];(e>0||v!==0)&&(h.push(_,D,F),b+=3),(t>0||v!==r-1)&&(h.push(D,I,F),b+=3)}c.addGroup(p,b,0),p+=b}function y(T){const A=g,b=new et,R=new L;let w=0;const v=T===!0?e:t,_=T===!0?1:-1;for(let I=1;I<=i;I++)u.push(0,m*_,0),f.push(0,_,0),d.push(.5,.5),g++;const D=g;for(let I=0;I<=i;I++){const B=I/i*l+a,G=Math.cos(B),W=Math.sin(B);R.x=v*W,R.y=m*_,R.z=v*G,u.push(R.x,R.y,R.z),f.push(0,_,0),b.x=G*.5+.5,b.y=W*.5*_+.5,d.push(b.x,b.y),g++}for(let I=0;I<i;I++){const F=A+I,B=D+I;T===!0?h.push(B,B+1,F):h.push(B+1,B,F),w+=3}c.addGroup(p,w,T===!0?1:2),p+=w}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new As(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class So extends As{constructor(e=1,t=1,n=32,i=1,r=!1,o=0,a=Math.PI*2){super(0,e,t,n,i,r,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(e){return new So(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Rs extends rt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,u=e/a,f=t/l,d=[],g=[],x=[],m=[];for(let p=0;p<h;p++){const S=p*f-o;for(let y=0;y<c;y++){const T=y*u-r;g.push(T,-S,0),x.push(0,0,1),m.push(y/a),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let S=0;S<a;S++){const y=S+c*p,T=S+c*(p+1),A=S+1+c*(p+1),b=S+1+c*p;d.push(y,T,b),d.push(T,A,b)}this.setIndex(d),this.setAttribute("position",new _e(g,3)),this.setAttribute("normal",new _e(x,3)),this.setAttribute("uv",new _e(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rs(e.width,e.height,e.widthSegments,e.heightSegments)}}class Fi extends rt{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new L,f=new L,d=[],g=[],x=[],m=[];for(let p=0;p<=n;p++){const S=[],y=p/n;let T=0;p===0&&o===0?T=.5/t:p===n&&l===Math.PI&&(T=-.5/t);for(let A=0;A<=t;A++){const b=A/t;u.x=-e*Math.cos(i+b*r)*Math.sin(o+y*a),u.y=e*Math.cos(o+y*a),u.z=e*Math.sin(i+b*r)*Math.sin(o+y*a),g.push(u.x,u.y,u.z),f.copy(u).normalize(),x.push(f.x,f.y,f.z),m.push(b+T,1-y),S.push(c++)}h.push(S)}for(let p=0;p<n;p++)for(let S=0;S<t;S++){const y=h[p][S+1],T=h[p][S],A=h[p+1][S],b=h[p+1][S+1];(p!==0||o>0)&&d.push(y,T,b),(p!==n-1||l<Math.PI)&&d.push(T,A,b)}this.setIndex(d),this.setAttribute("position",new _e(g,3)),this.setAttribute("normal",new _e(x,3)),this.setAttribute("uv",new _e(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fi(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class eo extends _i{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Le(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Le(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ya,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.combine=ro,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Hc extends _i{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=jl,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Vc extends _i{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const sr={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class Wc{constructor(e,t,n){const i=this;let r=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=c.length;u<f;u+=2){const d=c[u],g=c[u+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Xc=new Wc;class bo{constructor(e){this.manager=e!==void 0?e:Xc,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}bo.DEFAULT_MATERIAL_NAME="__DEFAULT";const oi=new WeakMap;class qc extends bo{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=sr.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let u=oi.get(o);u===void 0&&(u=[],oi.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=Ui("img");function l(){h(),t&&t(this);const u=oi.get(this)||[];for(let f=0;f<u.length;f++){const d=u[f];d.onLoad&&d.onLoad(this)}oi.delete(this),r.manager.itemEnd(e)}function c(u){h(),i&&i(u),sr.remove(`image:${e}`);const f=oi.get(this)||[];for(let d=0;d<f.length;d++){const g=f[d];g.onError&&g.onError(u)}oi.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),sr.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}}class Yc extends bo{constructor(e){super(e)}load(e,t,n,i){const r=new wt,o=new qc(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}}class yo extends At{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Le(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class $c extends yo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(At.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Le(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const rr=new dt,sa=new L,ra=new L;class Kc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new et(512,512),this.mapType=ln,this.map=null,this.mapPass=null,this.matrix=new dt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ts,this._frameExtents=new et(1,1),this._viewportCount=1,this._viewports=[new vt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;sa.setFromMatrixPosition(e.matrixWorld),t.position.copy(sa),ra.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(ra),t.updateMatrixWorld(),rr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(rr,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(rr)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class rl extends tl{constructor(e=-1,t=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Jc extends Kc{constructor(){super(new rl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class jc extends yo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(At.DEFAULT_UP),this.updateMatrix(),this.target=new At,this.shadow=new Jc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Zc extends yo{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Qc extends $t{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class eh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const oa=new dt;class th{constructor(e,t,n=0,i=1/0){this.ray=new mo(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new go,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):_t("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return oa.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(oa),this}intersectObject(e,t=!0,n=[]){return to(e,this,n,t),n.sort(aa),n}intersectObjects(e,t=!0,n=[]){for(let i=0,r=e.length;i<r;i++)to(e[i],this,n,t);return n.sort(aa),n}}function aa(s,e){return s.distance-e.distance}function to(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const r=s.children;for(let o=0,a=r.length;o<a;o++)to(r[o],e,t,!0)}}function la(s,e,t,n){const i=nh(n);switch(t){case Wa:return s*e;case qa:return s*e/i.components*i.byteLength;case co:return s*e/i.components*i.byteLength;case ho:return s*e*2/i.components*i.byteLength;case uo:return s*e*2/i.components*i.byteLength;case Xa:return s*e*3/i.components*i.byteLength;case nn:return s*e*4/i.components*i.byteLength;case fo:return s*e*4/i.components*i.byteLength;case fs:case ps:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case ms:case gs:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ar:case wr:return Math.max(s,16)*Math.max(e,8)/4;case Tr:case Rr:return Math.max(s,8)*Math.max(e,8)/2;case Cr:case Dr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Pr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Lr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ir:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Ur:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Nr:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Fr:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Or:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case kr:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Br:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case zr:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Gr:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Hr:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Vr:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Wr:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Xr:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case qr:case Yr:case $r:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Kr:case Jr:return Math.ceil(s/4)*Math.ceil(e/4)*8;case jr:case Zr:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function nh(s){switch(s){case ln:case za:return{byteLength:1,components:1};case Di:case Ga:case gi:return{byteLength:2,components:1};case ao:case lo:return{byteLength:2,components:4};case Xn:case oo:case tn:return{byteLength:4,components:1};case Ha:case Va:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:so}}));typeof window<"u"&&(window.__THREE__?qe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=so);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ol(){let s=null,e=!1,t=null,n=null;function i(r,o){t(r,o),n=s.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function ih(s){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,u=c.byteLength,f=s.createBuffer();s.bindBuffer(l,f),s.bufferData(l,c,h),a.onUploadCallback();let d;if(c instanceof Float32Array)d=s.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)d=s.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?d=s.HALF_FLOAT:d=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=s.SHORT;else if(c instanceof Uint32Array)d=s.UNSIGNED_INT;else if(c instanceof Int32Array)d=s.INT;else if(c instanceof Int8Array)d=s.BYTE;else if(c instanceof Uint8Array)d=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:f,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(s.bindBuffer(c,a),u.length===0)s.bufferSubData(c,0,h);else{u.sort((d,g)=>d.start-g.start);let f=0;for(let d=1;d<u.length;d++){const g=u[f],x=u[d];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++f,u[f]=x)}u.length=f+1;for(let d=0,g=u.length;d<g;d++){const x=u[d];s.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(s.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:r,update:o}}var sh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,rh=`#ifdef USE_ALPHAHASH
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
#endif`,oh=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ah=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ch=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,hh=`#ifdef USE_AOMAP
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
#endif`,uh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,dh=`#ifdef USE_BATCHING
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
#endif`,fh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ph=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,gh=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,xh=`#ifdef USE_IRIDESCENCE
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
#endif`,_h=`#ifdef USE_BUMPMAP
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
#endif`,vh=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Sh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,bh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,yh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Mh=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Eh=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Th=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Ah=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Rh=`#define PI 3.141592653589793
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
} // validated`,wh=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Ch=`vec3 transformedNormal = objectNormal;
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
#endif`,Dh=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ph=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Lh=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ih=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Uh="gl_FragColor = linearToOutputTexel( gl_FragColor );",Nh=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Fh=`#ifdef USE_ENVMAP
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
#endif`,Oh=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,kh=`#ifdef USE_ENVMAP
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
#endif`,Bh=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,zh=`#ifdef USE_ENVMAP
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
#endif`,Gh=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Hh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Vh=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Wh=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Xh=`#ifdef USE_GRADIENTMAP
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
}`,qh=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Yh=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,$h=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Kh=`uniform bool receiveShadow;
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
#endif`,Jh=`#ifdef USE_ENVMAP
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
#endif`,jh=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Zh=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Qh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,eu=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tu=`PhysicalMaterial material;
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
#endif`,nu=`uniform sampler2D dfgLUT;
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
}`,iu=`
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
#endif`,su=`#if defined( RE_IndirectDiffuse )
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
#endif`,ru=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ou=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,au=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,hu=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,uu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,du=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,fu=`#if defined( USE_POINTS_UV )
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
#endif`,pu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,mu=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,gu=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,xu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_u=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vu=`#ifdef USE_MORPHTARGETS
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
#endif`,Su=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bu=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,yu=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Mu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Eu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Tu=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Au=`#ifdef USE_NORMALMAP
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
#endif`,Ru=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wu=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Cu=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Du=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Pu=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Lu=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Iu=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Uu=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Nu=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Fu=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ou=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ku=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Bu=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,zu=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Gu=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Hu=`float getShadowMask() {
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
}`,Vu=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Wu=`#ifdef USE_SKINNING
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
#endif`,Xu=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,qu=`#ifdef USE_SKINNING
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
#endif`,Yu=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,$u=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Ku=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Ju=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,ju=`#ifdef USE_TRANSMISSION
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
#endif`,Zu=`#ifdef USE_TRANSMISSION
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
#endif`,Qu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,ed=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,td=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,nd=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const id=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sd=`uniform sampler2D t2D;
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
}`,rd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,od=`#ifdef ENVMAP_TYPE_CUBE
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
}`,ad=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ld=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cd=`#include <common>
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
}`,hd=`#if DEPTH_PACKING == 3200
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
}`,ud=`#define DISTANCE
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
}`,dd=`#define DISTANCE
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
}`,fd=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pd=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,md=`uniform float scale;
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
}`,gd=`uniform vec3 diffuse;
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
}`,xd=`#include <common>
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
}`,_d=`uniform vec3 diffuse;
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
}`,vd=`#define LAMBERT
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
}`,Sd=`#define LAMBERT
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
}`,bd=`#define MATCAP
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
}`,yd=`#define MATCAP
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
}`,Md=`#define NORMAL
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
}`,Ed=`#define NORMAL
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
}`,Td=`#define PHONG
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
}`,Ad=`#define PHONG
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
}`,Rd=`#define STANDARD
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
}`,wd=`#define STANDARD
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
}`,Cd=`#define TOON
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
}`,Dd=`#define TOON
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
}`,Pd=`uniform float size;
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
}`,Ld=`uniform vec3 diffuse;
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
}`,Id=`#include <common>
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
}`,Ud=`uniform vec3 color;
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
}`,Nd=`uniform float rotation;
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
}`,Fd=`uniform vec3 diffuse;
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
}`,$e={alphahash_fragment:sh,alphahash_pars_fragment:rh,alphamap_fragment:oh,alphamap_pars_fragment:ah,alphatest_fragment:lh,alphatest_pars_fragment:ch,aomap_fragment:hh,aomap_pars_fragment:uh,batching_pars_vertex:dh,batching_vertex:fh,begin_vertex:ph,beginnormal_vertex:mh,bsdfs:gh,iridescence_fragment:xh,bumpmap_pars_fragment:_h,clipping_planes_fragment:vh,clipping_planes_pars_fragment:Sh,clipping_planes_pars_vertex:bh,clipping_planes_vertex:yh,color_fragment:Mh,color_pars_fragment:Eh,color_pars_vertex:Th,color_vertex:Ah,common:Rh,cube_uv_reflection_fragment:wh,defaultnormal_vertex:Ch,displacementmap_pars_vertex:Dh,displacementmap_vertex:Ph,emissivemap_fragment:Lh,emissivemap_pars_fragment:Ih,colorspace_fragment:Uh,colorspace_pars_fragment:Nh,envmap_fragment:Fh,envmap_common_pars_fragment:Oh,envmap_pars_fragment:kh,envmap_pars_vertex:Bh,envmap_physical_pars_fragment:Jh,envmap_vertex:zh,fog_vertex:Gh,fog_pars_vertex:Hh,fog_fragment:Vh,fog_pars_fragment:Wh,gradientmap_pars_fragment:Xh,lightmap_pars_fragment:qh,lights_lambert_fragment:Yh,lights_lambert_pars_fragment:$h,lights_pars_begin:Kh,lights_toon_fragment:jh,lights_toon_pars_fragment:Zh,lights_phong_fragment:Qh,lights_phong_pars_fragment:eu,lights_physical_fragment:tu,lights_physical_pars_fragment:nu,lights_fragment_begin:iu,lights_fragment_maps:su,lights_fragment_end:ru,logdepthbuf_fragment:ou,logdepthbuf_pars_fragment:au,logdepthbuf_pars_vertex:lu,logdepthbuf_vertex:cu,map_fragment:hu,map_pars_fragment:uu,map_particle_fragment:du,map_particle_pars_fragment:fu,metalnessmap_fragment:pu,metalnessmap_pars_fragment:mu,morphinstance_vertex:gu,morphcolor_vertex:xu,morphnormal_vertex:_u,morphtarget_pars_vertex:vu,morphtarget_vertex:Su,normal_fragment_begin:bu,normal_fragment_maps:yu,normal_pars_fragment:Mu,normal_pars_vertex:Eu,normal_vertex:Tu,normalmap_pars_fragment:Au,clearcoat_normal_fragment_begin:Ru,clearcoat_normal_fragment_maps:wu,clearcoat_pars_fragment:Cu,iridescence_pars_fragment:Du,opaque_fragment:Pu,packing:Lu,premultiplied_alpha_fragment:Iu,project_vertex:Uu,dithering_fragment:Nu,dithering_pars_fragment:Fu,roughnessmap_fragment:Ou,roughnessmap_pars_fragment:ku,shadowmap_pars_fragment:Bu,shadowmap_pars_vertex:zu,shadowmap_vertex:Gu,shadowmask_pars_fragment:Hu,skinbase_vertex:Vu,skinning_pars_vertex:Wu,skinning_vertex:Xu,skinnormal_vertex:qu,specularmap_fragment:Yu,specularmap_pars_fragment:$u,tonemapping_fragment:Ku,tonemapping_pars_fragment:Ju,transmission_fragment:ju,transmission_pars_fragment:Zu,uv_pars_fragment:Qu,uv_pars_vertex:ed,uv_vertex:td,worldpos_vertex:nd,background_vert:id,background_frag:sd,backgroundCube_vert:rd,backgroundCube_frag:od,cube_vert:ad,cube_frag:ld,depth_vert:cd,depth_frag:hd,distanceRGBA_vert:ud,distanceRGBA_frag:dd,equirect_vert:fd,equirect_frag:pd,linedashed_vert:md,linedashed_frag:gd,meshbasic_vert:xd,meshbasic_frag:_d,meshlambert_vert:vd,meshlambert_frag:Sd,meshmatcap_vert:bd,meshmatcap_frag:yd,meshnormal_vert:Md,meshnormal_frag:Ed,meshphong_vert:Td,meshphong_frag:Ad,meshphysical_vert:Rd,meshphysical_frag:wd,meshtoon_vert:Cd,meshtoon_frag:Dd,points_vert:Pd,points_frag:Ld,shadow_vert:Id,shadow_frag:Ud,sprite_vert:Nd,sprite_frag:Fd},ue={common:{diffuse:{value:new Le(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ye},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ye}},envmap:{envMap:{value:null},envMapRotation:{value:new Ye},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ye}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ye}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ye},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ye},normalScale:{value:new et(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ye},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ye}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ye}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ye}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Le(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Le(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0},uvTransform:{value:new Ye}},sprite:{diffuse:{value:new Le(16777215)},opacity:{value:1},center:{value:new et(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ye},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0}}},rn={basic:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:$e.meshbasic_vert,fragmentShader:$e.meshbasic_frag},lambert:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Le(0)}}]),vertexShader:$e.meshlambert_vert,fragmentShader:$e.meshlambert_frag},phong:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Le(0)},specular:{value:new Le(1118481)},shininess:{value:30}}]),vertexShader:$e.meshphong_vert,fragmentShader:$e.meshphong_frag},standard:{uniforms:It([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new Le(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag},toon:{uniforms:It([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new Le(0)}}]),vertexShader:$e.meshtoon_vert,fragmentShader:$e.meshtoon_frag},matcap:{uniforms:It([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:$e.meshmatcap_vert,fragmentShader:$e.meshmatcap_frag},points:{uniforms:It([ue.points,ue.fog]),vertexShader:$e.points_vert,fragmentShader:$e.points_frag},dashed:{uniforms:It([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:$e.linedashed_vert,fragmentShader:$e.linedashed_frag},depth:{uniforms:It([ue.common,ue.displacementmap]),vertexShader:$e.depth_vert,fragmentShader:$e.depth_frag},normal:{uniforms:It([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:$e.meshnormal_vert,fragmentShader:$e.meshnormal_frag},sprite:{uniforms:It([ue.sprite,ue.fog]),vertexShader:$e.sprite_vert,fragmentShader:$e.sprite_frag},background:{uniforms:{uvTransform:{value:new Ye},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:$e.background_vert,fragmentShader:$e.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ye}},vertexShader:$e.backgroundCube_vert,fragmentShader:$e.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:$e.cube_vert,fragmentShader:$e.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:$e.equirect_vert,fragmentShader:$e.equirect_frag},distanceRGBA:{uniforms:It([ue.common,ue.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:$e.distanceRGBA_vert,fragmentShader:$e.distanceRGBA_frag},shadow:{uniforms:It([ue.lights,ue.fog,{color:{value:new Le(0)},opacity:{value:1}}]),vertexShader:$e.shadow_vert,fragmentShader:$e.shadow_frag}};rn.physical={uniforms:It([rn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ye},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ye},clearcoatNormalScale:{value:new et(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ye},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ye},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ye},sheen:{value:0},sheenColor:{value:new Le(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ye},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ye},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ye},transmissionSamplerSize:{value:new et},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ye},attenuationDistance:{value:0},attenuationColor:{value:new Le(0)},specularColor:{value:new Le(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ye},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ye},anisotropyVector:{value:new et},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ye}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag};const ls={r:0,b:0,g:0},kn=new cn,Od=new dt;function kd(s,e,t,n,i,r,o){const a=new Le(0);let l=r===!0?0:1,c,h,u=null,f=0,d=null;function g(y){let T=y.isScene===!0?y.background:null;return T&&T.isTexture&&(T=(y.backgroundBlurriness>0?t:e).get(T)),T}function x(y){let T=!1;const A=g(y);A===null?p(a,l):A&&A.isColor&&(p(A,1),T=!0);const b=s.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,o):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(s.autoClear||T)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function m(y,T){const A=g(T);A&&(A.isCubeTexture||A.mapping===Es)?(h===void 0&&(h=new Xe(new Bi(1,1,1),new Tt({name:"BackgroundCubeMaterial",uniforms:mi(rn.backgroundCube.uniforms),vertexShader:rn.backgroundCube.vertexShader,fragmentShader:rn.backgroundCube.fragmentShader,side:Pt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(b,R,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),kn.copy(T.backgroundRotation),kn.x*=-1,kn.y*=-1,kn.z*=-1,A.isCubeTexture&&A.isRenderTargetTexture===!1&&(kn.y*=-1,kn.z*=-1),h.material.uniforms.envMap.value=A,h.material.uniforms.flipEnvMap.value=A.isCubeTexture&&A.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Od.makeRotationFromEuler(kn)),h.material.toneMapped=nt.getTransfer(A.colorSpace)!==ct,(u!==A||f!==A.version||d!==s.toneMapping)&&(h.material.needsUpdate=!0,u=A,f=A.version,d=s.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):A&&A.isTexture&&(c===void 0&&(c=new Xe(new Rs(2,2),new Tt({name:"BackgroundMaterial",uniforms:mi(rn.background.uniforms),vertexShader:rn.background.vertexShader,fragmentShader:rn.background.fragmentShader,side:Dn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=A,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.toneMapped=nt.getTransfer(A.colorSpace)!==ct,A.matrixAutoUpdate===!0&&A.updateMatrix(),c.material.uniforms.uvTransform.value.copy(A.matrix),(u!==A||f!==A.version||d!==s.toneMapping)&&(c.material.needsUpdate=!0,u=A,f=A.version,d=s.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null))}function p(y,T){y.getRGB(ls,el(s)),n.buffers.color.setClear(ls.r,ls.g,ls.b,T,o)}function S(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(y,T=1){a.set(y),l=T,p(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(y){l=y,p(a,l)},render:x,addToRenderList:m,dispose:S}}function Bd(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=f(null);let r=i,o=!1;function a(_,D,I,F,B){let G=!1;const W=u(F,I,D);r!==W&&(r=W,c(r.object)),G=d(_,F,I,B),G&&g(_,F,I,B),B!==null&&e.update(B,s.ELEMENT_ARRAY_BUFFER),(G||o)&&(o=!1,T(_,D,I,F),B!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return s.createVertexArray()}function c(_){return s.bindVertexArray(_)}function h(_){return s.deleteVertexArray(_)}function u(_,D,I){const F=I.wireframe===!0;let B=n[_.id];B===void 0&&(B={},n[_.id]=B);let G=B[D.id];G===void 0&&(G={},B[D.id]=G);let W=G[F];return W===void 0&&(W=f(l()),G[F]=W),W}function f(_){const D=[],I=[],F=[];for(let B=0;B<t;B++)D[B]=0,I[B]=0,F[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:I,attributeDivisors:F,object:_,attributes:{},index:null}}function d(_,D,I,F){const B=r.attributes,G=D.attributes;let W=0;const Z=I.getAttributes();for(const X in Z)if(Z[X].location>=0){const ne=B[X];let pe=G[X];if(pe===void 0&&(X==="instanceMatrix"&&_.instanceMatrix&&(pe=_.instanceMatrix),X==="instanceColor"&&_.instanceColor&&(pe=_.instanceColor)),ne===void 0||ne.attribute!==pe||pe&&ne.data!==pe.data)return!0;W++}return r.attributesNum!==W||r.index!==F}function g(_,D,I,F){const B={},G=D.attributes;let W=0;const Z=I.getAttributes();for(const X in Z)if(Z[X].location>=0){let ne=G[X];ne===void 0&&(X==="instanceMatrix"&&_.instanceMatrix&&(ne=_.instanceMatrix),X==="instanceColor"&&_.instanceColor&&(ne=_.instanceColor));const pe={};pe.attribute=ne,ne&&ne.data&&(pe.data=ne.data),B[X]=pe,W++}r.attributes=B,r.attributesNum=W,r.index=F}function x(){const _=r.newAttributes;for(let D=0,I=_.length;D<I;D++)_[D]=0}function m(_){p(_,0)}function p(_,D){const I=r.newAttributes,F=r.enabledAttributes,B=r.attributeDivisors;I[_]=1,F[_]===0&&(s.enableVertexAttribArray(_),F[_]=1),B[_]!==D&&(s.vertexAttribDivisor(_,D),B[_]=D)}function S(){const _=r.newAttributes,D=r.enabledAttributes;for(let I=0,F=D.length;I<F;I++)D[I]!==_[I]&&(s.disableVertexAttribArray(I),D[I]=0)}function y(_,D,I,F,B,G,W){W===!0?s.vertexAttribIPointer(_,D,I,B,G):s.vertexAttribPointer(_,D,I,F,B,G)}function T(_,D,I,F){x();const B=F.attributes,G=I.getAttributes(),W=D.defaultAttributeValues;for(const Z in G){const X=G[Z];if(X.location>=0){let te=B[Z];if(te===void 0&&(Z==="instanceMatrix"&&_.instanceMatrix&&(te=_.instanceMatrix),Z==="instanceColor"&&_.instanceColor&&(te=_.instanceColor)),te!==void 0){const ne=te.normalized,pe=te.itemSize,he=e.get(te);if(he===void 0)continue;const Ve=he.buffer,Ke=he.type,je=he.bytesPerElement,K=Ke===s.INT||Ke===s.UNSIGNED_INT||te.gpuType===oo;if(te.isInterleavedBufferAttribute){const j=te.data,fe=j.stride,Re=te.offset;if(j.isInstancedInterleavedBuffer){for(let ye=0;ye<X.locationSize;ye++)p(X.location+ye,j.meshPerAttribute);_.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let ye=0;ye<X.locationSize;ye++)m(X.location+ye);s.bindBuffer(s.ARRAY_BUFFER,Ve);for(let ye=0;ye<X.locationSize;ye++)y(X.location+ye,pe/X.locationSize,Ke,ne,fe*je,(Re+pe/X.locationSize*ye)*je,K)}else{if(te.isInstancedBufferAttribute){for(let j=0;j<X.locationSize;j++)p(X.location+j,te.meshPerAttribute);_.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let j=0;j<X.locationSize;j++)m(X.location+j);s.bindBuffer(s.ARRAY_BUFFER,Ve);for(let j=0;j<X.locationSize;j++)y(X.location+j,pe/X.locationSize,Ke,ne,pe*je,pe/X.locationSize*j*je,K)}}else if(W!==void 0){const ne=W[Z];if(ne!==void 0)switch(ne.length){case 2:s.vertexAttrib2fv(X.location,ne);break;case 3:s.vertexAttrib3fv(X.location,ne);break;case 4:s.vertexAttrib4fv(X.location,ne);break;default:s.vertexAttrib1fv(X.location,ne)}}}}S()}function A(){w();for(const _ in n){const D=n[_];for(const I in D){const F=D[I];for(const B in F)h(F[B].object),delete F[B];delete D[I]}delete n[_]}}function b(_){if(n[_.id]===void 0)return;const D=n[_.id];for(const I in D){const F=D[I];for(const B in F)h(F[B].object),delete F[B];delete D[I]}delete n[_.id]}function R(_){for(const D in n){const I=n[D];if(I[_.id]===void 0)continue;const F=I[_.id];for(const B in F)h(F[B].object),delete F[B];delete I[_.id]}}function w(){v(),o=!0,r!==i&&(r=i,c(r.object))}function v(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:w,resetDefaultState:v,dispose:A,releaseStatesOfGeometry:b,releaseStatesOfProgram:R,initAttributes:x,enableAttribute:m,disableUnusedAttributes:S}}function zd(s,e,t){let n;function i(c){n=c}function r(c,h){s.drawArrays(n,c,h),t.update(h,n,1)}function o(c,h,u){u!==0&&(s.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function a(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let d=0;for(let g=0;g<u;g++)d+=h[g];t.update(d,n,1)}function l(c,h,u,f){if(u===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let g=0;g<c.length;g++)o(c[g],h[g],f[g]);else{d.multiDrawArraysInstancedWEBGL(n,c,0,h,0,f,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*f[x];t.update(g,n,1)}}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function Gd(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(R){return!(R!==nn&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){const w=R===gi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==ln&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==tn&&!w)}function l(R){if(R==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(qe("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),d=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),m=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),S=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),y=s.getParameter(s.MAX_VARYING_VECTORS),T=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),A=g>0,b=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:y,maxFragmentUniforms:T,vertexTextures:A,maxSamples:b}}function Hd(s){const e=this;let t=null,n=0,i=!1,r=!1;const o=new zn,a=new Ye,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const d=u.length!==0||f||n!==0||i;return i=f,n=u.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,d){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,p=s.get(u);if(!i||g===null||g.length===0||r&&!m)r?h(null):c();else{const S=r?0:n,y=S*4;let T=p.clippingState||null;l.value=T,T=h(g,f,y,d);for(let A=0;A!==y;++A)T[A]=t[A];p.clippingState=T,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,d,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const p=d+x*4,S=f.matrixWorldInverse;a.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,T=d;y!==x;++y,T+=4)o.copy(u[y]).applyMatrix4(S,a),o.normal.toArray(m,T),m[T+3]=o.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function Vd(s){let e=new WeakMap;function t(o,a){return a===yr?o.mapping=ui:a===Mr&&(o.mapping=di),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===yr||a===Mr)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Lc(l.height);return c.fromEquirectangularTexture(s,o),e.set(o,c),o.addEventListener("dispose",i),t(c.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const wn=4,ca=[.125,.215,.35,.446,.526,.582],Hn=20,Wd=256,Ri=new rl,ha=new Le;let or=null,ar=0,lr=0,cr=!1;const Xd=new L;class ua{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,r={}){const{size:o=256,position:a=Xd}=r;or=this._renderer.getRenderTarget(),ar=this._renderer.getActiveCubeFace(),lr=this._renderer.getActiveMipmapLevel(),cr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=pa(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=fa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(or,ar,lr),this._renderer.xr.enabled=cr,e.scissorTest=!1,ai(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ui||e.mapping===di?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),or=this._renderer.getRenderTarget(),ar=this._renderer.getActiveCubeFace(),lr=this._renderer.getActiveMipmapLevel(),cr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Kt,minFilter:Kt,generateMipmaps:!1,type:gi,format:nn,colorSpace:fi,depthBuffer:!1},i=da(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=da(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=qd(r)),this._blurMaterial=$d(r,e,t),this._ggxMaterial=Yd(r,e,t)}return i}_compileMaterial(e){const t=new Xe(new rt,e);this._renderer.compile(t,Ri)}_sceneToCubeUV(e,t,n,i,r){const l=new $t(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,d=u.toneMapping;u.getClearColor(ha),u.toneMapping=Cn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Xe(new Bi,new xo({name:"PMREM.Background",side:Pt,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,m=x.material;let p=!1;const S=e.background;S?S.isColor&&(m.color.copy(S),e.background=null,p=!0):(m.color.copy(ha),p=!0);for(let y=0;y<6;y++){const T=y%3;T===0?(l.up.set(0,c[y],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[y],r.y,r.z)):T===1?(l.up.set(0,0,c[y]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[y],r.z)):(l.up.set(0,c[y],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[y]));const A=this._cubeSize;ai(i,T*A,y>2?A:0,A,A),u.setRenderTarget(i),p&&u.render(x,l),u.render(e,l)}u.toneMapping=d,u.autoClear=f,e.background=S}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===ui||e.mapping===di;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=pa()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=fa());const r=i?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;ai(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Ri)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let r=1;r<i;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),f=.05+c*.95,d=u*f,{_lodMax:g}=this,x=this._sizeLods[n],m=3*x*(n>g-wn?n-g+wn:0),p=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=d,l.mipInt.value=g-t,ai(r,m,p,3*x,2*x),i.setRenderTarget(r),i.render(a,Ri),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,ai(e,m,p,3*x,2*x),i.setRenderTarget(e),i.render(a,Ri)}_blur(e,t,n,i,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",r),this._halfBlur(o,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&_t("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[i];u.material=c;const f=c.uniforms,d=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*d):2*Math.PI/(2*Hn-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):Hn;m>Hn&&qe(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Hn}`);const p=[];let S=0;for(let R=0;R<Hn;++R){const w=R/x,v=Math.exp(-w*w/2);p.push(v),R===0?S+=v:R<m&&(S+=2*v)}for(let R=0;R<p.length;R++)p[R]=p[R]/S;f.envMap.value=e.texture,f.samples.value=m,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);const{_lodMax:y}=this;f.dTheta.value=g,f.mipInt.value=y-n;const T=this._sizeLods[i],A=3*T*(i>y-wn?i-y+wn:0),b=4*(this._cubeSize-T);ai(t,A,b,3*T,2*T),l.setRenderTarget(t),l.render(u,Ri)}}function qd(s){const e=[],t=[],n=[];let i=s;const r=s-wn+1+ca.length;for(let o=0;o<r;o++){const a=Math.pow(2,i);e.push(a);let l=1/a;o>s-wn?l=ca[o-s+wn-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),h=-c,u=1+c,f=[h,h,u,h,u,u,h,h,u,u,h,u],d=6,g=6,x=3,m=2,p=1,S=new Float32Array(x*g*d),y=new Float32Array(m*g*d),T=new Float32Array(p*g*d);for(let b=0;b<d;b++){const R=b%3*2/3-1,w=b>2?0:-1,v=[R,w,0,R+2/3,w,0,R+2/3,w+1,0,R,w,0,R+2/3,w+1,0,R,w+1,0];S.set(v,x*g*b),y.set(f,m*g*b);const _=[b,b,b,b,b,b];T.set(_,p*g*b)}const A=new rt;A.setAttribute("position",new Ot(S,x)),A.setAttribute("uv",new Ot(y,m)),A.setAttribute("faceIndex",new Ot(T,p)),n.push(new Xe(A,null)),i>wn&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function da(s,e,t){const n=new Pn(s,e,t);return n.texture.mapping=Es,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ai(s,e,t,n,i){s.viewport.set(e,t,n,i),s.scissor.set(e,t,n,i)}function Yd(s,e,t){return new Tt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Wd,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:ws(),fragmentShader:`

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
		`,blending:_n,depthTest:!1,depthWrite:!1})}function $d(s,e,t){const n=new Float32Array(Hn),i=new L(0,1,0);return new Tt({name:"SphericalGaussianBlur",defines:{n:Hn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:ws(),fragmentShader:`

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
		`,blending:_n,depthTest:!1,depthWrite:!1})}function fa(){return new Tt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ws(),fragmentShader:`

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
		`,blending:_n,depthTest:!1,depthWrite:!1})}function pa(){return new Tt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ws(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:_n,depthTest:!1,depthWrite:!1})}function ws(){return`

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
	`}function Kd(s){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===yr||l===Mr,h=l===ui||l===di;if(c||h){let u=e.get(a);const f=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return t===null&&(t=new ua(s)),u=c?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const d=a.image;return c&&d&&d.height>0||h&&d&&i(d)?(t===null&&(t=new ua(s)),u=c?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Jd(s){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=s.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Ni("WebGLRenderer: "+n+" extension not supported."),i}}}function jd(s,e,t,n){const i={},r=new WeakMap;function o(u){const f=u.target;f.index!==null&&e.remove(f.index);for(const g in f.attributes)e.remove(f.attributes[g]);f.removeEventListener("dispose",o),delete i[f.id];const d=r.get(f);d&&(e.remove(d),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(u,f){return i[f.id]===!0||(f.addEventListener("dispose",o),i[f.id]=!0,t.memory.geometries++),f}function l(u){const f=u.attributes;for(const d in f)e.update(f[d],s.ARRAY_BUFFER)}function c(u){const f=[],d=u.index,g=u.attributes.position;let x=0;if(d!==null){const S=d.array;x=d.version;for(let y=0,T=S.length;y<T;y+=3){const A=S[y+0],b=S[y+1],R=S[y+2];f.push(A,b,b,R,R,A)}}else if(g!==void 0){const S=g.array;x=g.version;for(let y=0,T=S.length/3-1;y<T;y+=3){const A=y+0,b=y+1,R=y+2;f.push(A,b,b,R,R,A)}}else return;const m=new(Ka(f)?Qa:Za)(f,1);m.version=x;const p=r.get(u);p&&e.remove(p),r.set(u,m)}function h(u){const f=r.get(u);if(f){const d=u.index;d!==null&&f.version<d.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Zd(s,e,t){let n;function i(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function l(f,d){s.drawElements(n,d,r,f*o),t.update(d,n,1)}function c(f,d,g){g!==0&&(s.drawElementsInstanced(n,d,r,f*o,g),t.update(d,n,g))}function h(f,d,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,f,0,g);let m=0;for(let p=0;p<g;p++)m+=d[p];t.update(m,n,1)}function u(f,d,g,x){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<f.length;p++)c(f[p]/o,d[p],x[p]);else{m.multiDrawElementsInstancedWEBGL(n,d,0,r,f,0,x,0,g);let p=0;for(let S=0;S<g;S++)p+=d[S]*x[S];t.update(p,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Qd(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:_t("WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function ef(s,e,t){const n=new WeakMap,i=new vt;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let f=n.get(a);if(f===void 0||f.count!==u){let v=function(){R.dispose(),n.delete(a),a.removeEventListener("dispose",v)};f!==void 0&&f.texture.dispose();const d=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],S=a.morphAttributes.color||[];let y=0;d===!0&&(y=1),g===!0&&(y=2),x===!0&&(y=3);let T=a.attributes.position.count*y,A=1;T>e.maxTextureSize&&(A=Math.ceil(T/e.maxTextureSize),T=e.maxTextureSize);const b=new Float32Array(T*A*4*u),R=new Ja(b,T,A,u);R.type=tn,R.needsUpdate=!0;const w=y*4;for(let _=0;_<u;_++){const D=m[_],I=p[_],F=S[_],B=T*A*4*_;for(let G=0;G<D.count;G++){const W=G*w;d===!0&&(i.fromBufferAttribute(D,G),b[B+W+0]=i.x,b[B+W+1]=i.y,b[B+W+2]=i.z,b[B+W+3]=0),g===!0&&(i.fromBufferAttribute(I,G),b[B+W+4]=i.x,b[B+W+5]=i.y,b[B+W+6]=i.z,b[B+W+7]=0),x===!0&&(i.fromBufferAttribute(F,G),b[B+W+8]=i.x,b[B+W+9]=i.y,b[B+W+10]=i.z,b[B+W+11]=F.itemSize===4?i.w:1)}}f={count:u,texture:R,size:new et(T,A)},n.set(a,f),a.addEventListener("dispose",v)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let d=0;for(let x=0;x<c.length;x++)d+=c[x];const g=a.morphTargetsRelative?1:1-d;l.getUniforms().setValue(s,"morphTargetBaseInfluence",g),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",f.texture,t),l.getUniforms().setValue(s,"morphTargetsTextureSize",f.size)}return{update:r}}function tf(s,e,t,n){let i=new WeakMap;function r(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);if(i.get(u)!==c&&(e.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(t.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,s.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const f=l.skeleton;i.get(f)!==c&&(f.update(),i.set(f,c))}return u}function o(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:o}}const al=new wt,ma=new vo(1,1),ll=new Ja,cl=new mc,hl=new nl,ga=[],xa=[],_a=new Float32Array(16),va=new Float32Array(9),Sa=new Float32Array(4);function vi(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let r=ga[i];if(r===void 0&&(r=new Float32Array(i),ga[i]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function yt(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function Mt(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function Cs(s,e){let t=xa[e];t===void 0&&(t=new Int32Array(e),xa[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function nf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function sf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(yt(t,e))return;s.uniform2fv(this.addr,e),Mt(t,e)}}function rf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(yt(t,e))return;s.uniform3fv(this.addr,e),Mt(t,e)}}function of(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(yt(t,e))return;s.uniform4fv(this.addr,e),Mt(t,e)}}function af(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(yt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Mt(t,e)}else{if(yt(t,n))return;Sa.set(n),s.uniformMatrix2fv(this.addr,!1,Sa),Mt(t,n)}}function lf(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(yt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Mt(t,e)}else{if(yt(t,n))return;va.set(n),s.uniformMatrix3fv(this.addr,!1,va),Mt(t,n)}}function cf(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(yt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Mt(t,e)}else{if(yt(t,n))return;_a.set(n),s.uniformMatrix4fv(this.addr,!1,_a),Mt(t,n)}}function hf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function uf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(yt(t,e))return;s.uniform2iv(this.addr,e),Mt(t,e)}}function df(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(yt(t,e))return;s.uniform3iv(this.addr,e),Mt(t,e)}}function ff(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(yt(t,e))return;s.uniform4iv(this.addr,e),Mt(t,e)}}function pf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function mf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(yt(t,e))return;s.uniform2uiv(this.addr,e),Mt(t,e)}}function gf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(yt(t,e))return;s.uniform3uiv(this.addr,e),Mt(t,e)}}function xf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(yt(t,e))return;s.uniform4uiv(this.addr,e),Mt(t,e)}}function _f(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(ma.compareFunction=$a,r=ma):r=al,t.setTexture2D(e||r,i)}function vf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||cl,i)}function Sf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||hl,i)}function bf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||ll,i)}function yf(s){switch(s){case 5126:return nf;case 35664:return sf;case 35665:return rf;case 35666:return of;case 35674:return af;case 35675:return lf;case 35676:return cf;case 5124:case 35670:return hf;case 35667:case 35671:return uf;case 35668:case 35672:return df;case 35669:case 35673:return ff;case 5125:return pf;case 36294:return mf;case 36295:return gf;case 36296:return xf;case 35678:case 36198:case 36298:case 36306:case 35682:return _f;case 35679:case 36299:case 36307:return vf;case 35680:case 36300:case 36308:case 36293:return Sf;case 36289:case 36303:case 36311:case 36292:return bf}}function Mf(s,e){s.uniform1fv(this.addr,e)}function Ef(s,e){const t=vi(e,this.size,2);s.uniform2fv(this.addr,t)}function Tf(s,e){const t=vi(e,this.size,3);s.uniform3fv(this.addr,t)}function Af(s,e){const t=vi(e,this.size,4);s.uniform4fv(this.addr,t)}function Rf(s,e){const t=vi(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function wf(s,e){const t=vi(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Cf(s,e){const t=vi(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Df(s,e){s.uniform1iv(this.addr,e)}function Pf(s,e){s.uniform2iv(this.addr,e)}function Lf(s,e){s.uniform3iv(this.addr,e)}function If(s,e){s.uniform4iv(this.addr,e)}function Uf(s,e){s.uniform1uiv(this.addr,e)}function Nf(s,e){s.uniform2uiv(this.addr,e)}function Ff(s,e){s.uniform3uiv(this.addr,e)}function Of(s,e){s.uniform4uiv(this.addr,e)}function kf(s,e,t){const n=this.cache,i=e.length,r=Cs(t,i);yt(n,r)||(s.uniform1iv(this.addr,r),Mt(n,r));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||al,r[o])}function Bf(s,e,t){const n=this.cache,i=e.length,r=Cs(t,i);yt(n,r)||(s.uniform1iv(this.addr,r),Mt(n,r));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||cl,r[o])}function zf(s,e,t){const n=this.cache,i=e.length,r=Cs(t,i);yt(n,r)||(s.uniform1iv(this.addr,r),Mt(n,r));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||hl,r[o])}function Gf(s,e,t){const n=this.cache,i=e.length,r=Cs(t,i);yt(n,r)||(s.uniform1iv(this.addr,r),Mt(n,r));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||ll,r[o])}function Hf(s){switch(s){case 5126:return Mf;case 35664:return Ef;case 35665:return Tf;case 35666:return Af;case 35674:return Rf;case 35675:return wf;case 35676:return Cf;case 5124:case 35670:return Df;case 35667:case 35671:return Pf;case 35668:case 35672:return Lf;case 35669:case 35673:return If;case 5125:return Uf;case 36294:return Nf;case 36295:return Ff;case 36296:return Of;case 35678:case 36198:case 36298:case 36306:case 35682:return kf;case 35679:case 36299:case 36307:return Bf;case 35680:case 36300:case 36308:case 36293:return zf;case 36289:case 36303:case 36311:case 36292:return Gf}}class Vf{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=yf(t.type)}}class Wf{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Hf(t.type)}}class Xf{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,o=i.length;r!==o;++r){const a=i[r];a.setValue(e,t[a.id],n)}}}const hr=/(\w+)(\])?(\[|\.)?/g;function ba(s,e){s.seq.push(e),s.map[e.id]=e}function qf(s,e,t){const n=s.name,i=n.length;for(hr.lastIndex=0;;){const r=hr.exec(n),o=hr.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){ba(t,c===void 0?new Vf(a,s,e):new Wf(a,s,e));break}else{let u=t.map[a];u===void 0&&(u=new Xf(a),ba(t,u)),t=u}}}class xs{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=e.getActiveUniform(t,i),o=e.getUniformLocation(t,r.name);qf(r,o,this)}}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function ya(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const Yf=37297;let $f=0;function Kf(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=i;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Ma=new Ye;function Jf(s){nt._getMatrix(Ma,nt.workingColorSpace,s);const e=`mat3( ${Ma.elements.map(t=>t.toFixed(4))} )`;switch(nt.getTransfer(s)){case Ss:return[e,"LinearTransferOETF"];case ct:return[e,"sRGBTransferOETF"];default:return qe("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function Ea(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Kf(s.getShaderSource(e),a)}else return r}function jf(s,e){const t=Jf(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Zf(s,e){let t;switch(e){case Vl:t="Linear";break;case Wl:t="Reinhard";break;case Xl:t="Cineon";break;case ql:t="ACESFilmic";break;case $l:t="AgX";break;case Kl:t="Neutral";break;case Yl:t="Custom";break;default:qe("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const cs=new L;function Qf(){nt.getLuminanceCoefficients(cs);const s=cs.x.toFixed(4),e=cs.y.toFixed(4),t=cs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ep(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(wi).join(`
`)}function tp(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function np(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(e,i),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function wi(s){return s!==""}function Ta(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Aa(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ip=/^[ \t]*#include +<([\w\d./]+)>/gm;function no(s){return s.replace(ip,rp)}const sp=new Map;function rp(s,e){let t=$e[e];if(t===void 0){const n=sp.get(e);if(n!==void 0)t=$e[n],qe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return no(t)}const op=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ra(s){return s.replace(op,ap)}function ap(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function wa(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function lp(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Oa?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===ka?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===gn&&(e="SHADOWMAP_TYPE_VSM"),e}function cp(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ui:case di:e="ENVMAP_TYPE_CUBE";break;case Es:e="ENVMAP_TYPE_CUBE_UV";break}return e}function hp(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case di:e="ENVMAP_MODE_REFRACTION";break}return e}function up(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case ro:e="ENVMAP_BLENDING_MULTIPLY";break;case Gl:e="ENVMAP_BLENDING_MIX";break;case Hl:e="ENVMAP_BLENDING_ADD";break}return e}function dp(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function fp(s,e,t,n){const i=s.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=lp(t),c=cp(t),h=hp(t),u=up(t),f=dp(t),d=ep(t),g=tp(r),x=i.createProgram();let m,p,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(wi).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(wi).join(`
`),p.length>0&&(p+=`
`)):(m=[wa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(wi).join(`
`),p=[wa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Cn?"#define TONE_MAPPING":"",t.toneMapping!==Cn?$e.tonemapping_pars_fragment:"",t.toneMapping!==Cn?Zf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",$e.colorspace_pars_fragment,jf("linearToOutputTexel",t.outputColorSpace),Qf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(wi).join(`
`)),o=no(o),o=Ta(o,t),o=Aa(o,t),a=no(a),a=Ta(a,t),a=Aa(a,t),o=Ra(o),a=Ra(a),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===No?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===No?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=S+m+o,T=S+p+a,A=ya(i,i.VERTEX_SHADER,y),b=ya(i,i.FRAGMENT_SHADER,T);i.attachShader(x,A),i.attachShader(x,b),t.index0AttributeName!==void 0?i.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function R(D){if(s.debug.checkShaderErrors){const I=i.getProgramInfoLog(x)||"",F=i.getShaderInfoLog(A)||"",B=i.getShaderInfoLog(b)||"",G=I.trim(),W=F.trim(),Z=B.trim();let X=!0,te=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(X=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,A,b);else{const ne=Ea(i,A,"vertex"),pe=Ea(i,b,"fragment");_t("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+G+`
`+ne+`
`+pe)}else G!==""?qe("WebGLProgram: Program Info Log:",G):(W===""||Z==="")&&(te=!1);te&&(D.diagnostics={runnable:X,programLog:G,vertexShader:{log:W,prefix:m},fragmentShader:{log:Z,prefix:p}})}i.deleteShader(A),i.deleteShader(b),w=new xs(i,x),v=np(i,x)}let w;this.getUniforms=function(){return w===void 0&&R(this),w};let v;this.getAttributes=function(){return v===void 0&&R(this),v};let _=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return _===!1&&(_=i.getProgramParameter(x,Yf)),_},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=$f++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=A,this.fragmentShader=b,this}let pp=0;class mp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new gp(e),t.set(e,n)),n}}class gp{constructor(e){this.id=pp++,this.code=e,this.usedTimes=0}}function xp(s,e,t,n,i,r,o){const a=new go,l=new mp,c=new Set,h=[],u=i.logarithmicDepthBuffer,f=i.vertexTextures;let d=i.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(v){return c.add(v),v===0?"uv":`uv${v}`}function m(v,_,D,I,F){const B=I.fog,G=F.geometry,W=v.isMeshStandardMaterial?I.environment:null,Z=(v.isMeshStandardMaterial?t:e).get(v.envMap||W),X=Z&&Z.mapping===Es?Z.image.height:null,te=g[v.type];v.precision!==null&&(d=i.getMaxPrecision(v.precision),d!==v.precision&&qe("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));const ne=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,pe=ne!==void 0?ne.length:0;let he=0;G.morphAttributes.position!==void 0&&(he=1),G.morphAttributes.normal!==void 0&&(he=2),G.morphAttributes.color!==void 0&&(he=3);let Ve,Ke,je,K;if(te){const at=rn[te];Ve=at.vertexShader,Ke=at.fragmentShader}else Ve=v.vertexShader,Ke=v.fragmentShader,l.update(v),je=l.getVertexShaderID(v),K=l.getFragmentShaderID(v);const j=s.getRenderTarget(),fe=s.state.buffers.depth.getReversed(),Re=F.isInstancedMesh===!0,ye=F.isBatchedMesh===!0,Ie=!!v.map,it=!!v.matcap,Ne=!!Z,Je=!!v.aoMap,P=!!v.lightMap,we=!!v.bumpMap,Ce=!!v.normalMap,ke=!!v.displacementMap,xe=!!v.emissiveMap,ot=!!v.metalnessMap,Ae=!!v.roughnessMap,Fe=v.anisotropy>0,C=v.clearcoat>0,M=v.dispersion>0,H=v.iridescence>0,J=v.sheen>0,ee=v.transmission>0,$=Fe&&!!v.anisotropyMap,Te=C&&!!v.clearcoatMap,ce=C&&!!v.clearcoatNormalMap,De=C&&!!v.clearcoatRoughnessMap,be=H&&!!v.iridescenceMap,ie=H&&!!v.iridescenceThicknessMap,oe=J&&!!v.sheenColorMap,ze=J&&!!v.sheenRoughnessMap,Oe=!!v.specularMap,ve=!!v.specularColorMap,He=!!v.specularIntensityMap,U=ee&&!!v.transmissionMap,de=ee&&!!v.thicknessMap,ae=!!v.gradientMap,le=!!v.alphaMap,se=v.alphaTest>0,Q=!!v.alphaHash,Me=!!v.extensions;let We=Cn;v.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(We=s.toneMapping);const ft={shaderID:te,shaderType:v.type,shaderName:v.name,vertexShader:Ve,fragmentShader:Ke,defines:v.defines,customVertexShaderID:je,customFragmentShaderID:K,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:ye,batchingColor:ye&&F._colorsTexture!==null,instancing:Re,instancingColor:Re&&F.instanceColor!==null,instancingMorph:Re&&F.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:j===null?s.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:fi,alphaToCoverage:!!v.alphaToCoverage,map:Ie,matcap:it,envMap:Ne,envMapMode:Ne&&Z.mapping,envMapCubeUVHeight:X,aoMap:Je,lightMap:P,bumpMap:we,normalMap:Ce,displacementMap:f&&ke,emissiveMap:xe,normalMapObjectSpace:Ce&&v.normalMapType===Ql,normalMapTangentSpace:Ce&&v.normalMapType===Ya,metalnessMap:ot,roughnessMap:Ae,anisotropy:Fe,anisotropyMap:$,clearcoat:C,clearcoatMap:Te,clearcoatNormalMap:ce,clearcoatRoughnessMap:De,dispersion:M,iridescence:H,iridescenceMap:be,iridescenceThicknessMap:ie,sheen:J,sheenColorMap:oe,sheenRoughnessMap:ze,specularMap:Oe,specularColorMap:ve,specularIntensityMap:He,transmission:ee,transmissionMap:U,thicknessMap:de,gradientMap:ae,opaque:v.transparent===!1&&v.blending===li&&v.alphaToCoverage===!1,alphaMap:le,alphaTest:se,alphaHash:Q,combine:v.combine,mapUv:Ie&&x(v.map.channel),aoMapUv:Je&&x(v.aoMap.channel),lightMapUv:P&&x(v.lightMap.channel),bumpMapUv:we&&x(v.bumpMap.channel),normalMapUv:Ce&&x(v.normalMap.channel),displacementMapUv:ke&&x(v.displacementMap.channel),emissiveMapUv:xe&&x(v.emissiveMap.channel),metalnessMapUv:ot&&x(v.metalnessMap.channel),roughnessMapUv:Ae&&x(v.roughnessMap.channel),anisotropyMapUv:$&&x(v.anisotropyMap.channel),clearcoatMapUv:Te&&x(v.clearcoatMap.channel),clearcoatNormalMapUv:ce&&x(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:De&&x(v.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&x(v.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&x(v.iridescenceThicknessMap.channel),sheenColorMapUv:oe&&x(v.sheenColorMap.channel),sheenRoughnessMapUv:ze&&x(v.sheenRoughnessMap.channel),specularMapUv:Oe&&x(v.specularMap.channel),specularColorMapUv:ve&&x(v.specularColorMap.channel),specularIntensityMapUv:He&&x(v.specularIntensityMap.channel),transmissionMapUv:U&&x(v.transmissionMap.channel),thicknessMapUv:de&&x(v.thicknessMap.channel),alphaMapUv:le&&x(v.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(Ce||Fe),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!G.attributes.uv&&(Ie||le),fog:!!B,useFog:v.fog===!0,fogExp2:!!B&&B.isFogExp2,flatShading:v.flatShading===!0&&v.wireframe===!1,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:fe,skinning:F.isSkinnedMesh===!0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:pe,morphTextureStride:he,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:v.dithering,shadowMapEnabled:s.shadowMap.enabled&&D.length>0,shadowMapType:s.shadowMap.type,toneMapping:We,decodeVideoTexture:Ie&&v.map.isVideoTexture===!0&&nt.getTransfer(v.map.colorSpace)===ct,decodeVideoTextureEmissive:xe&&v.emissiveMap.isVideoTexture===!0&&nt.getTransfer(v.emissiveMap.colorSpace)===ct,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Vt,flipSided:v.side===Pt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:Me&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&v.extensions.multiDraw===!0||ye)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return ft.vertexUv1s=c.has(1),ft.vertexUv2s=c.has(2),ft.vertexUv3s=c.has(3),c.clear(),ft}function p(v){const _=[];if(v.shaderID?_.push(v.shaderID):(_.push(v.customVertexShaderID),_.push(v.customFragmentShaderID)),v.defines!==void 0)for(const D in v.defines)_.push(D),_.push(v.defines[D]);return v.isRawShaderMaterial===!1&&(S(_,v),y(_,v),_.push(s.outputColorSpace)),_.push(v.customProgramCacheKey),_.join()}function S(v,_){v.push(_.precision),v.push(_.outputColorSpace),v.push(_.envMapMode),v.push(_.envMapCubeUVHeight),v.push(_.mapUv),v.push(_.alphaMapUv),v.push(_.lightMapUv),v.push(_.aoMapUv),v.push(_.bumpMapUv),v.push(_.normalMapUv),v.push(_.displacementMapUv),v.push(_.emissiveMapUv),v.push(_.metalnessMapUv),v.push(_.roughnessMapUv),v.push(_.anisotropyMapUv),v.push(_.clearcoatMapUv),v.push(_.clearcoatNormalMapUv),v.push(_.clearcoatRoughnessMapUv),v.push(_.iridescenceMapUv),v.push(_.iridescenceThicknessMapUv),v.push(_.sheenColorMapUv),v.push(_.sheenRoughnessMapUv),v.push(_.specularMapUv),v.push(_.specularColorMapUv),v.push(_.specularIntensityMapUv),v.push(_.transmissionMapUv),v.push(_.thicknessMapUv),v.push(_.combine),v.push(_.fogExp2),v.push(_.sizeAttenuation),v.push(_.morphTargetsCount),v.push(_.morphAttributeCount),v.push(_.numDirLights),v.push(_.numPointLights),v.push(_.numSpotLights),v.push(_.numSpotLightMaps),v.push(_.numHemiLights),v.push(_.numRectAreaLights),v.push(_.numDirLightShadows),v.push(_.numPointLightShadows),v.push(_.numSpotLightShadows),v.push(_.numSpotLightShadowsWithMaps),v.push(_.numLightProbes),v.push(_.shadowMapType),v.push(_.toneMapping),v.push(_.numClippingPlanes),v.push(_.numClipIntersection),v.push(_.depthPacking)}function y(v,_){a.disableAll(),_.supportsVertexTextures&&a.enable(0),_.instancing&&a.enable(1),_.instancingColor&&a.enable(2),_.instancingMorph&&a.enable(3),_.matcap&&a.enable(4),_.envMap&&a.enable(5),_.normalMapObjectSpace&&a.enable(6),_.normalMapTangentSpace&&a.enable(7),_.clearcoat&&a.enable(8),_.iridescence&&a.enable(9),_.alphaTest&&a.enable(10),_.vertexColors&&a.enable(11),_.vertexAlphas&&a.enable(12),_.vertexUv1s&&a.enable(13),_.vertexUv2s&&a.enable(14),_.vertexUv3s&&a.enable(15),_.vertexTangents&&a.enable(16),_.anisotropy&&a.enable(17),_.alphaHash&&a.enable(18),_.batching&&a.enable(19),_.dispersion&&a.enable(20),_.batchingColor&&a.enable(21),_.gradientMap&&a.enable(22),v.push(a.mask),a.disableAll(),_.fog&&a.enable(0),_.useFog&&a.enable(1),_.flatShading&&a.enable(2),_.logarithmicDepthBuffer&&a.enable(3),_.reversedDepthBuffer&&a.enable(4),_.skinning&&a.enable(5),_.morphTargets&&a.enable(6),_.morphNormals&&a.enable(7),_.morphColors&&a.enable(8),_.premultipliedAlpha&&a.enable(9),_.shadowMapEnabled&&a.enable(10),_.doubleSided&&a.enable(11),_.flipSided&&a.enable(12),_.useDepthPacking&&a.enable(13),_.dithering&&a.enable(14),_.transmission&&a.enable(15),_.sheen&&a.enable(16),_.opaque&&a.enable(17),_.pointsUvs&&a.enable(18),_.decodeVideoTexture&&a.enable(19),_.decodeVideoTextureEmissive&&a.enable(20),_.alphaToCoverage&&a.enable(21),v.push(a.mask)}function T(v){const _=g[v.type];let D;if(_){const I=rn[_];D=wc.clone(I.uniforms)}else D=v.uniforms;return D}function A(v,_){let D;for(let I=0,F=h.length;I<F;I++){const B=h[I];if(B.cacheKey===_){D=B,++D.usedTimes;break}}return D===void 0&&(D=new fp(s,_,v,r),h.push(D)),D}function b(v){if(--v.usedTimes===0){const _=h.indexOf(v);h[_]=h[h.length-1],h.pop(),v.destroy()}}function R(v){l.remove(v)}function w(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:T,acquireProgram:A,releaseProgram:b,releaseShaderCache:R,programs:h,dispose:w}}function _p(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,l){s.get(o)[a]=l}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function vp(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function Ca(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Da(){const s=[];let e=0;const t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function o(u,f,d,g,x,m){let p=s[e];return p===void 0?(p={id:u.id,object:u,geometry:f,material:d,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},s[e]=p):(p.id=u.id,p.object=u,p.geometry=f,p.material=d,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=x,p.group=m),e++,p}function a(u,f,d,g,x,m){const p=o(u,f,d,g,x,m);d.transmission>0?n.push(p):d.transparent===!0?i.push(p):t.push(p)}function l(u,f,d,g,x,m){const p=o(u,f,d,g,x,m);d.transmission>0?n.unshift(p):d.transparent===!0?i.unshift(p):t.unshift(p)}function c(u,f){t.length>1&&t.sort(u||vp),n.length>1&&n.sort(f||Ca),i.length>1&&i.sort(f||Ca)}function h(){for(let u=e,f=s.length;u<f;u++){const d=s[u];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:a,unshift:l,finish:h,sort:c}}function Sp(){let s=new WeakMap;function e(n,i){const r=s.get(n);let o;return r===void 0?(o=new Da,s.set(n,[o])):i>=r.length?(o=new Da,r.push(o)):o=r[i],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function bp(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new L,color:new Le};break;case"SpotLight":t={position:new L,direction:new L,color:new Le,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new Le,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new Le,groundColor:new Le};break;case"RectAreaLight":t={color:new Le,position:new L,halfWidth:new L,halfHeight:new L};break}return s[e.id]=t,t}}}function yp(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let Mp=0;function Ep(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function Tp(s){const e=new bp,t=yp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new L);const i=new L,r=new dt,o=new dt;function a(c){let h=0,u=0,f=0;for(let v=0;v<9;v++)n.probe[v].set(0,0,0);let d=0,g=0,x=0,m=0,p=0,S=0,y=0,T=0,A=0,b=0,R=0;c.sort(Ep);for(let v=0,_=c.length;v<_;v++){const D=c[v],I=D.color,F=D.intensity,B=D.distance,G=D.shadow&&D.shadow.map?D.shadow.map.texture:null;if(D.isAmbientLight)h+=I.r*F,u+=I.g*F,f+=I.b*F;else if(D.isLightProbe){for(let W=0;W<9;W++)n.probe[W].addScaledVector(D.sh.coefficients[W],F);R++}else if(D.isDirectionalLight){const W=e.get(D);if(W.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const Z=D.shadow,X=t.get(D);X.shadowIntensity=Z.intensity,X.shadowBias=Z.bias,X.shadowNormalBias=Z.normalBias,X.shadowRadius=Z.radius,X.shadowMapSize=Z.mapSize,n.directionalShadow[d]=X,n.directionalShadowMap[d]=G,n.directionalShadowMatrix[d]=D.shadow.matrix,S++}n.directional[d]=W,d++}else if(D.isSpotLight){const W=e.get(D);W.position.setFromMatrixPosition(D.matrixWorld),W.color.copy(I).multiplyScalar(F),W.distance=B,W.coneCos=Math.cos(D.angle),W.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),W.decay=D.decay,n.spot[x]=W;const Z=D.shadow;if(D.map&&(n.spotLightMap[A]=D.map,A++,Z.updateMatrices(D),D.castShadow&&b++),n.spotLightMatrix[x]=Z.matrix,D.castShadow){const X=t.get(D);X.shadowIntensity=Z.intensity,X.shadowBias=Z.bias,X.shadowNormalBias=Z.normalBias,X.shadowRadius=Z.radius,X.shadowMapSize=Z.mapSize,n.spotShadow[x]=X,n.spotShadowMap[x]=G,T++}x++}else if(D.isRectAreaLight){const W=e.get(D);W.color.copy(I).multiplyScalar(F),W.halfWidth.set(D.width*.5,0,0),W.halfHeight.set(0,D.height*.5,0),n.rectArea[m]=W,m++}else if(D.isPointLight){const W=e.get(D);if(W.color.copy(D.color).multiplyScalar(D.intensity),W.distance=D.distance,W.decay=D.decay,D.castShadow){const Z=D.shadow,X=t.get(D);X.shadowIntensity=Z.intensity,X.shadowBias=Z.bias,X.shadowNormalBias=Z.normalBias,X.shadowRadius=Z.radius,X.shadowMapSize=Z.mapSize,X.shadowCameraNear=Z.camera.near,X.shadowCameraFar=Z.camera.far,n.pointShadow[g]=X,n.pointShadowMap[g]=G,n.pointShadowMatrix[g]=D.shadow.matrix,y++}n.point[g]=W,g++}else if(D.isHemisphereLight){const W=e.get(D);W.skyColor.copy(D.color).multiplyScalar(F),W.groundColor.copy(D.groundColor).multiplyScalar(F),n.hemi[p]=W,p++}}m>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ue.LTC_FLOAT_1,n.rectAreaLTC2=ue.LTC_FLOAT_2):(n.rectAreaLTC1=ue.LTC_HALF_1,n.rectAreaLTC2=ue.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=f;const w=n.hash;(w.directionalLength!==d||w.pointLength!==g||w.spotLength!==x||w.rectAreaLength!==m||w.hemiLength!==p||w.numDirectionalShadows!==S||w.numPointShadows!==y||w.numSpotShadows!==T||w.numSpotMaps!==A||w.numLightProbes!==R)&&(n.directional.length=d,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=T,n.spotShadowMap.length=T,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=T+A-b,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=R,w.directionalLength=d,w.pointLength=g,w.spotLength=x,w.rectAreaLength=m,w.hemiLength=p,w.numDirectionalShadows=S,w.numPointShadows=y,w.numSpotShadows=T,w.numSpotMaps=A,w.numLightProbes=R,n.version=Mp++)}function l(c,h){let u=0,f=0,d=0,g=0,x=0;const m=h.matrixWorldInverse;for(let p=0,S=c.length;p<S;p++){const y=c[p];if(y.isDirectionalLight){const T=n.directional[u];T.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),T.direction.sub(i),T.direction.transformDirection(m),u++}else if(y.isSpotLight){const T=n.spot[d];T.position.setFromMatrixPosition(y.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),T.direction.sub(i),T.direction.transformDirection(m),d++}else if(y.isRectAreaLight){const T=n.rectArea[g];T.position.setFromMatrixPosition(y.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(y.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(y.width*.5,0,0),T.halfHeight.set(0,y.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),g++}else if(y.isPointLight){const T=n.point[f];T.position.setFromMatrixPosition(y.matrixWorld),T.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){const T=n.hemi[x];T.direction.setFromMatrixPosition(y.matrixWorld),T.direction.transformDirection(m),x++}}}return{setup:a,setupView:l,state:n}}function Pa(s){const e=new Tp(s),t=[],n=[];function i(h){c.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function Ap(s){let e=new WeakMap;function t(i,r=0){const o=e.get(i);let a;return o===void 0?(a=new Pa(s),e.set(i,[a])):r>=o.length?(a=new Pa(s),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const Rp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wp=`uniform sampler2D shadow_pass;
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
}`;function Cp(s,e,t){let n=new Ts;const i=new et,r=new et,o=new vt,a=new Hc({depthPacking:Zl}),l=new Vc,c={},h=t.maxTextureSize,u={[Dn]:Pt,[Pt]:Dn,[Vt]:Vt},f=new Tt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new et},radius:{value:4}},vertexShader:Rp,fragmentShader:wp}),d=f.clone();d.defines.HORIZONTAL_PASS=1;const g=new rt;g.setAttribute("position",new Ot(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Xe(g,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Oa;let p=this.type;this.render=function(b,R,w){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;const v=s.getRenderTarget(),_=s.getActiveCubeFace(),D=s.getActiveMipmapLevel(),I=s.state;I.setBlending(_n),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const F=p!==gn&&this.type===gn,B=p===gn&&this.type!==gn;for(let G=0,W=b.length;G<W;G++){const Z=b[G],X=Z.shadow;if(X===void 0){qe("WebGLShadowMap:",Z,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;i.copy(X.mapSize);const te=X.getFrameExtents();if(i.multiply(te),r.copy(X.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/te.x),i.x=r.x*te.x,X.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/te.y),i.y=r.y*te.y,X.mapSize.y=r.y)),X.map===null||F===!0||B===!0){const pe=this.type!==gn?{minFilter:Rt,magFilter:Rt}:{};X.map!==null&&X.map.dispose(),X.map=new Pn(i.x,i.y,pe),X.map.texture.name=Z.name+".shadowMap",X.camera.updateProjectionMatrix()}s.setRenderTarget(X.map),s.clear();const ne=X.getViewportCount();for(let pe=0;pe<ne;pe++){const he=X.getViewport(pe);o.set(r.x*he.x,r.y*he.y,r.x*he.z,r.y*he.w),I.viewport(o),X.updateMatrices(Z,pe),n=X.getFrustum(),T(R,w,X.camera,Z,this.type)}X.isPointLightShadow!==!0&&this.type===gn&&S(X,w),X.needsUpdate=!1}p=this.type,m.needsUpdate=!1,s.setRenderTarget(v,_,D)};function S(b,R){const w=e.update(x);f.defines.VSM_SAMPLES!==b.blurSamples&&(f.defines.VSM_SAMPLES=b.blurSamples,d.defines.VSM_SAMPLES=b.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new Pn(i.x,i.y)),f.uniforms.shadow_pass.value=b.map.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,s.setRenderTarget(b.mapPass),s.clear(),s.renderBufferDirect(R,null,w,f,x,null),d.uniforms.shadow_pass.value=b.mapPass.texture,d.uniforms.resolution.value=b.mapSize,d.uniforms.radius.value=b.radius,s.setRenderTarget(b.map),s.clear(),s.renderBufferDirect(R,null,w,d,x,null)}function y(b,R,w,v){let _=null;const D=w.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(D!==void 0)_=D;else if(_=w.isPointLight===!0?l:a,s.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const I=_.uuid,F=R.uuid;let B=c[I];B===void 0&&(B={},c[I]=B);let G=B[F];G===void 0&&(G=_.clone(),B[F]=G,R.addEventListener("dispose",A)),_=G}if(_.visible=R.visible,_.wireframe=R.wireframe,v===gn?_.side=R.shadowSide!==null?R.shadowSide:R.side:_.side=R.shadowSide!==null?R.shadowSide:u[R.side],_.alphaMap=R.alphaMap,_.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,_.map=R.map,_.clipShadows=R.clipShadows,_.clippingPlanes=R.clippingPlanes,_.clipIntersection=R.clipIntersection,_.displacementMap=R.displacementMap,_.displacementScale=R.displacementScale,_.displacementBias=R.displacementBias,_.wireframeLinewidth=R.wireframeLinewidth,_.linewidth=R.linewidth,w.isPointLight===!0&&_.isMeshDistanceMaterial===!0){const I=s.properties.get(_);I.light=w}return _}function T(b,R,w,v,_){if(b.visible===!1)return;if(b.layers.test(R.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&_===gn)&&(!b.frustumCulled||n.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,b.matrixWorld);const F=e.update(b),B=b.material;if(Array.isArray(B)){const G=F.groups;for(let W=0,Z=G.length;W<Z;W++){const X=G[W],te=B[X.materialIndex];if(te&&te.visible){const ne=y(b,te,v,_);b.onBeforeShadow(s,b,R,w,F,ne,X),s.renderBufferDirect(w,null,F,ne,b,X),b.onAfterShadow(s,b,R,w,F,ne,X)}}}else if(B.visible){const G=y(b,B,v,_);b.onBeforeShadow(s,b,R,w,F,G,null),s.renderBufferDirect(w,null,F,G,b,null),b.onAfterShadow(s,b,R,w,F,G,null)}}const I=b.children;for(let F=0,B=I.length;F<B;F++)T(I[F],R,w,v,_)}function A(b){b.target.removeEventListener("dispose",A);for(const w in c){const v=c[w],_=b.target.uuid;_ in v&&(v[_].dispose(),delete v[_])}}}const Dp={[mr]:gr,[xr]:Sr,[_r]:br,[hi]:vr,[gr]:mr,[Sr]:xr,[br]:_r,[vr]:hi};function Pp(s,e){function t(){let U=!1;const de=new vt;let ae=null;const le=new vt(0,0,0,0);return{setMask:function(se){ae!==se&&!U&&(s.colorMask(se,se,se,se),ae=se)},setLocked:function(se){U=se},setClear:function(se,Q,Me,We,ft){ft===!0&&(se*=We,Q*=We,Me*=We),de.set(se,Q,Me,We),le.equals(de)===!1&&(s.clearColor(se,Q,Me,We),le.copy(de))},reset:function(){U=!1,ae=null,le.set(-1,0,0,0)}}}function n(){let U=!1,de=!1,ae=null,le=null,se=null;return{setReversed:function(Q){if(de!==Q){const Me=e.get("EXT_clip_control");Q?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),de=Q;const We=se;se=null,this.setClear(We)}},getReversed:function(){return de},setTest:function(Q){Q?j(s.DEPTH_TEST):fe(s.DEPTH_TEST)},setMask:function(Q){ae!==Q&&!U&&(s.depthMask(Q),ae=Q)},setFunc:function(Q){if(de&&(Q=Dp[Q]),le!==Q){switch(Q){case mr:s.depthFunc(s.NEVER);break;case gr:s.depthFunc(s.ALWAYS);break;case xr:s.depthFunc(s.LESS);break;case hi:s.depthFunc(s.LEQUAL);break;case _r:s.depthFunc(s.EQUAL);break;case vr:s.depthFunc(s.GEQUAL);break;case Sr:s.depthFunc(s.GREATER);break;case br:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}le=Q}},setLocked:function(Q){U=Q},setClear:function(Q){se!==Q&&(de&&(Q=1-Q),s.clearDepth(Q),se=Q)},reset:function(){U=!1,ae=null,le=null,se=null,de=!1}}}function i(){let U=!1,de=null,ae=null,le=null,se=null,Q=null,Me=null,We=null,ft=null;return{setTest:function(at){U||(at?j(s.STENCIL_TEST):fe(s.STENCIL_TEST))},setMask:function(at){de!==at&&!U&&(s.stencilMask(at),de=at)},setFunc:function(at,sn,Jt){(ae!==at||le!==sn||se!==Jt)&&(s.stencilFunc(at,sn,Jt),ae=at,le=sn,se=Jt)},setOp:function(at,sn,Jt){(Q!==at||Me!==sn||We!==Jt)&&(s.stencilOp(at,sn,Jt),Q=at,Me=sn,We=Jt)},setLocked:function(at){U=at},setClear:function(at){ft!==at&&(s.clearStencil(at),ft=at)},reset:function(){U=!1,de=null,ae=null,le=null,se=null,Q=null,Me=null,We=null,ft=null}}}const r=new t,o=new n,a=new i,l=new WeakMap,c=new WeakMap;let h={},u={},f=new WeakMap,d=[],g=null,x=!1,m=null,p=null,S=null,y=null,T=null,A=null,b=null,R=new Le(0,0,0),w=0,v=!1,_=null,D=null,I=null,F=null,B=null;const G=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,Z=0;const X=s.getParameter(s.VERSION);X.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(X)[1]),W=Z>=1):X.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),W=Z>=2);let te=null,ne={};const pe=s.getParameter(s.SCISSOR_BOX),he=s.getParameter(s.VIEWPORT),Ve=new vt().fromArray(pe),Ke=new vt().fromArray(he);function je(U,de,ae,le){const se=new Uint8Array(4),Q=s.createTexture();s.bindTexture(U,Q),s.texParameteri(U,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(U,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Me=0;Me<ae;Me++)U===s.TEXTURE_3D||U===s.TEXTURE_2D_ARRAY?s.texImage3D(de,0,s.RGBA,1,1,le,0,s.RGBA,s.UNSIGNED_BYTE,se):s.texImage2D(de+Me,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,se);return Q}const K={};K[s.TEXTURE_2D]=je(s.TEXTURE_2D,s.TEXTURE_2D,1),K[s.TEXTURE_CUBE_MAP]=je(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[s.TEXTURE_2D_ARRAY]=je(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),K[s.TEXTURE_3D]=je(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),j(s.DEPTH_TEST),o.setFunc(hi),we(!1),Ce(Do),j(s.CULL_FACE),Je(_n);function j(U){h[U]!==!0&&(s.enable(U),h[U]=!0)}function fe(U){h[U]!==!1&&(s.disable(U),h[U]=!1)}function Re(U,de){return u[U]!==de?(s.bindFramebuffer(U,de),u[U]=de,U===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=de),U===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=de),!0):!1}function ye(U,de){let ae=d,le=!1;if(U){ae=f.get(de),ae===void 0&&(ae=[],f.set(de,ae));const se=U.textures;if(ae.length!==se.length||ae[0]!==s.COLOR_ATTACHMENT0){for(let Q=0,Me=se.length;Q<Me;Q++)ae[Q]=s.COLOR_ATTACHMENT0+Q;ae.length=se.length,le=!0}}else ae[0]!==s.BACK&&(ae[0]=s.BACK,le=!0);le&&s.drawBuffers(ae)}function Ie(U){return g!==U?(s.useProgram(U),g=U,!0):!1}const it={[Gn]:s.FUNC_ADD,[El]:s.FUNC_SUBTRACT,[Tl]:s.FUNC_REVERSE_SUBTRACT};it[Al]=s.MIN,it[Rl]=s.MAX;const Ne={[wl]:s.ZERO,[Cl]:s.ONE,[Dl]:s.SRC_COLOR,[fr]:s.SRC_ALPHA,[Fl]:s.SRC_ALPHA_SATURATE,[Ul]:s.DST_COLOR,[Ll]:s.DST_ALPHA,[Pl]:s.ONE_MINUS_SRC_COLOR,[pr]:s.ONE_MINUS_SRC_ALPHA,[Nl]:s.ONE_MINUS_DST_COLOR,[Il]:s.ONE_MINUS_DST_ALPHA,[Ol]:s.CONSTANT_COLOR,[kl]:s.ONE_MINUS_CONSTANT_COLOR,[Bl]:s.CONSTANT_ALPHA,[zl]:s.ONE_MINUS_CONSTANT_ALPHA};function Je(U,de,ae,le,se,Q,Me,We,ft,at){if(U===_n){x===!0&&(fe(s.BLEND),x=!1);return}if(x===!1&&(j(s.BLEND),x=!0),U!==Ml){if(U!==m||at!==v){if((p!==Gn||T!==Gn)&&(s.blendEquation(s.FUNC_ADD),p=Gn,T=Gn),at)switch(U){case li:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case dr:s.blendFunc(s.ONE,s.ONE);break;case Po:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Lo:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:_t("WebGLState: Invalid blending: ",U);break}else switch(U){case li:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case dr:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case Po:_t("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Lo:_t("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:_t("WebGLState: Invalid blending: ",U);break}S=null,y=null,A=null,b=null,R.set(0,0,0),w=0,m=U,v=at}return}se=se||de,Q=Q||ae,Me=Me||le,(de!==p||se!==T)&&(s.blendEquationSeparate(it[de],it[se]),p=de,T=se),(ae!==S||le!==y||Q!==A||Me!==b)&&(s.blendFuncSeparate(Ne[ae],Ne[le],Ne[Q],Ne[Me]),S=ae,y=le,A=Q,b=Me),(We.equals(R)===!1||ft!==w)&&(s.blendColor(We.r,We.g,We.b,ft),R.copy(We),w=ft),m=U,v=!1}function P(U,de){U.side===Vt?fe(s.CULL_FACE):j(s.CULL_FACE);let ae=U.side===Pt;de&&(ae=!ae),we(ae),U.blending===li&&U.transparent===!1?Je(_n):Je(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),r.setMask(U.colorWrite);const le=U.stencilWrite;a.setTest(le),le&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),xe(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?j(s.SAMPLE_ALPHA_TO_COVERAGE):fe(s.SAMPLE_ALPHA_TO_COVERAGE)}function we(U){_!==U&&(U?s.frontFace(s.CW):s.frontFace(s.CCW),_=U)}function Ce(U){U!==bl?(j(s.CULL_FACE),U!==D&&(U===Do?s.cullFace(s.BACK):U===yl?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):fe(s.CULL_FACE),D=U}function ke(U){U!==I&&(W&&s.lineWidth(U),I=U)}function xe(U,de,ae){U?(j(s.POLYGON_OFFSET_FILL),(F!==de||B!==ae)&&(s.polygonOffset(de,ae),F=de,B=ae)):fe(s.POLYGON_OFFSET_FILL)}function ot(U){U?j(s.SCISSOR_TEST):fe(s.SCISSOR_TEST)}function Ae(U){U===void 0&&(U=s.TEXTURE0+G-1),te!==U&&(s.activeTexture(U),te=U)}function Fe(U,de,ae){ae===void 0&&(te===null?ae=s.TEXTURE0+G-1:ae=te);let le=ne[ae];le===void 0&&(le={type:void 0,texture:void 0},ne[ae]=le),(le.type!==U||le.texture!==de)&&(te!==ae&&(s.activeTexture(ae),te=ae),s.bindTexture(U,de||K[U]),le.type=U,le.texture=de)}function C(){const U=ne[te];U!==void 0&&U.type!==void 0&&(s.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function M(){try{s.compressedTexImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function H(){try{s.compressedTexImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function J(){try{s.texSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function ee(){try{s.texSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function $(){try{s.compressedTexSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function Te(){try{s.compressedTexSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function ce(){try{s.texStorage2D(...arguments)}catch(U){U("WebGLState:",U)}}function De(){try{s.texStorage3D(...arguments)}catch(U){U("WebGLState:",U)}}function be(){try{s.texImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function ie(){try{s.texImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function oe(U){Ve.equals(U)===!1&&(s.scissor(U.x,U.y,U.z,U.w),Ve.copy(U))}function ze(U){Ke.equals(U)===!1&&(s.viewport(U.x,U.y,U.z,U.w),Ke.copy(U))}function Oe(U,de){let ae=c.get(de);ae===void 0&&(ae=new WeakMap,c.set(de,ae));let le=ae.get(U);le===void 0&&(le=s.getUniformBlockIndex(de,U.name),ae.set(U,le))}function ve(U,de){const le=c.get(de).get(U);l.get(de)!==le&&(s.uniformBlockBinding(de,le,U.__bindingPointIndex),l.set(de,le))}function He(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},te=null,ne={},u={},f=new WeakMap,d=[],g=null,x=!1,m=null,p=null,S=null,y=null,T=null,A=null,b=null,R=new Le(0,0,0),w=0,v=!1,_=null,D=null,I=null,F=null,B=null,Ve.set(0,0,s.canvas.width,s.canvas.height),Ke.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:j,disable:fe,bindFramebuffer:Re,drawBuffers:ye,useProgram:Ie,setBlending:Je,setMaterial:P,setFlipSided:we,setCullFace:Ce,setLineWidth:ke,setPolygonOffset:xe,setScissorTest:ot,activeTexture:Ae,bindTexture:Fe,unbindTexture:C,compressedTexImage2D:M,compressedTexImage3D:H,texImage2D:be,texImage3D:ie,updateUBOMapping:Oe,uniformBlockBinding:ve,texStorage2D:ce,texStorage3D:De,texSubImage2D:J,texSubImage3D:ee,compressedTexSubImage2D:$,compressedTexSubImage3D:Te,scissor:oe,viewport:ze,reset:He}}function Lp(s,e,t,n,i,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new et,h=new WeakMap;let u;const f=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(C,M){return d?new OffscreenCanvas(C,M):Ui("canvas")}function x(C,M,H){let J=1;const ee=Fe(C);if((ee.width>H||ee.height>H)&&(J=H/Math.max(ee.width,ee.height)),J<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const $=Math.floor(J*ee.width),Te=Math.floor(J*ee.height);u===void 0&&(u=g($,Te));const ce=M?g($,Te):u;return ce.width=$,ce.height=Te,ce.getContext("2d").drawImage(C,0,0,$,Te),qe("WebGLRenderer: Texture has been resized from ("+ee.width+"x"+ee.height+") to ("+$+"x"+Te+")."),ce}else return"data"in C&&qe("WebGLRenderer: Image in DataTexture is too big ("+ee.width+"x"+ee.height+")."),C;return C}function m(C){return C.generateMipmaps}function p(C){s.generateMipmap(C)}function S(C){return C.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?s.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function y(C,M,H,J,ee=!1){if(C!==null){if(s[C]!==void 0)return s[C];qe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let $=M;if(M===s.RED&&(H===s.FLOAT&&($=s.R32F),H===s.HALF_FLOAT&&($=s.R16F),H===s.UNSIGNED_BYTE&&($=s.R8)),M===s.RED_INTEGER&&(H===s.UNSIGNED_BYTE&&($=s.R8UI),H===s.UNSIGNED_SHORT&&($=s.R16UI),H===s.UNSIGNED_INT&&($=s.R32UI),H===s.BYTE&&($=s.R8I),H===s.SHORT&&($=s.R16I),H===s.INT&&($=s.R32I)),M===s.RG&&(H===s.FLOAT&&($=s.RG32F),H===s.HALF_FLOAT&&($=s.RG16F),H===s.UNSIGNED_BYTE&&($=s.RG8)),M===s.RG_INTEGER&&(H===s.UNSIGNED_BYTE&&($=s.RG8UI),H===s.UNSIGNED_SHORT&&($=s.RG16UI),H===s.UNSIGNED_INT&&($=s.RG32UI),H===s.BYTE&&($=s.RG8I),H===s.SHORT&&($=s.RG16I),H===s.INT&&($=s.RG32I)),M===s.RGB_INTEGER&&(H===s.UNSIGNED_BYTE&&($=s.RGB8UI),H===s.UNSIGNED_SHORT&&($=s.RGB16UI),H===s.UNSIGNED_INT&&($=s.RGB32UI),H===s.BYTE&&($=s.RGB8I),H===s.SHORT&&($=s.RGB16I),H===s.INT&&($=s.RGB32I)),M===s.RGBA_INTEGER&&(H===s.UNSIGNED_BYTE&&($=s.RGBA8UI),H===s.UNSIGNED_SHORT&&($=s.RGBA16UI),H===s.UNSIGNED_INT&&($=s.RGBA32UI),H===s.BYTE&&($=s.RGBA8I),H===s.SHORT&&($=s.RGBA16I),H===s.INT&&($=s.RGBA32I)),M===s.RGB&&(H===s.UNSIGNED_INT_5_9_9_9_REV&&($=s.RGB9_E5),H===s.UNSIGNED_INT_10F_11F_11F_REV&&($=s.R11F_G11F_B10F)),M===s.RGBA){const Te=ee?Ss:nt.getTransfer(J);H===s.FLOAT&&($=s.RGBA32F),H===s.HALF_FLOAT&&($=s.RGBA16F),H===s.UNSIGNED_BYTE&&($=Te===ct?s.SRGB8_ALPHA8:s.RGBA8),H===s.UNSIGNED_SHORT_4_4_4_4&&($=s.RGBA4),H===s.UNSIGNED_SHORT_5_5_5_1&&($=s.RGB5_A1)}return($===s.R16F||$===s.R32F||$===s.RG16F||$===s.RG32F||$===s.RGBA16F||$===s.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function T(C,M){let H;return C?M===null||M===Xn||M===Pi?H=s.DEPTH24_STENCIL8:M===tn?H=s.DEPTH32F_STENCIL8:M===Di&&(H=s.DEPTH24_STENCIL8,qe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Xn||M===Pi?H=s.DEPTH_COMPONENT24:M===tn?H=s.DEPTH_COMPONENT32F:M===Di&&(H=s.DEPTH_COMPONENT16),H}function A(C,M){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==Rt&&C.minFilter!==Kt?Math.log2(Math.max(M.width,M.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?M.mipmaps.length:1}function b(C){const M=C.target;M.removeEventListener("dispose",b),w(M),M.isVideoTexture&&h.delete(M)}function R(C){const M=C.target;M.removeEventListener("dispose",R),_(M)}function w(C){const M=n.get(C);if(M.__webglInit===void 0)return;const H=C.source,J=f.get(H);if(J){const ee=J[M.__cacheKey];ee.usedTimes--,ee.usedTimes===0&&v(C),Object.keys(J).length===0&&f.delete(H)}n.remove(C)}function v(C){const M=n.get(C);s.deleteTexture(M.__webglTexture);const H=C.source,J=f.get(H);delete J[M.__cacheKey],o.memory.textures--}function _(C){const M=n.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),n.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(M.__webglFramebuffer[J]))for(let ee=0;ee<M.__webglFramebuffer[J].length;ee++)s.deleteFramebuffer(M.__webglFramebuffer[J][ee]);else s.deleteFramebuffer(M.__webglFramebuffer[J]);M.__webglDepthbuffer&&s.deleteRenderbuffer(M.__webglDepthbuffer[J])}else{if(Array.isArray(M.__webglFramebuffer))for(let J=0;J<M.__webglFramebuffer.length;J++)s.deleteFramebuffer(M.__webglFramebuffer[J]);else s.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&s.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&s.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let J=0;J<M.__webglColorRenderbuffer.length;J++)M.__webglColorRenderbuffer[J]&&s.deleteRenderbuffer(M.__webglColorRenderbuffer[J]);M.__webglDepthRenderbuffer&&s.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const H=C.textures;for(let J=0,ee=H.length;J<ee;J++){const $=n.get(H[J]);$.__webglTexture&&(s.deleteTexture($.__webglTexture),o.memory.textures--),n.remove(H[J])}n.remove(C)}let D=0;function I(){D=0}function F(){const C=D;return C>=i.maxTextures&&qe("WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+i.maxTextures),D+=1,C}function B(C){const M=[];return M.push(C.wrapS),M.push(C.wrapT),M.push(C.wrapR||0),M.push(C.magFilter),M.push(C.minFilter),M.push(C.anisotropy),M.push(C.internalFormat),M.push(C.format),M.push(C.type),M.push(C.generateMipmaps),M.push(C.premultiplyAlpha),M.push(C.flipY),M.push(C.unpackAlignment),M.push(C.colorSpace),M.join()}function G(C,M){const H=n.get(C);if(C.isVideoTexture&&ot(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&H.__version!==C.version){const J=C.image;if(J===null)qe("WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)qe("WebGLRenderer: Texture marked for update but image is incomplete");else{K(H,C,M);return}}else C.isExternalTexture&&(H.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,H.__webglTexture,s.TEXTURE0+M)}function W(C,M){const H=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&H.__version!==C.version){K(H,C,M);return}else C.isExternalTexture&&(H.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,H.__webglTexture,s.TEXTURE0+M)}function Z(C,M){const H=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&H.__version!==C.version){K(H,C,M);return}t.bindTexture(s.TEXTURE_3D,H.__webglTexture,s.TEXTURE0+M)}function X(C,M){const H=n.get(C);if(C.version>0&&H.__version!==C.version){j(H,C,M);return}t.bindTexture(s.TEXTURE_CUBE_MAP,H.__webglTexture,s.TEXTURE0+M)}const te={[Ci]:s.REPEAT,[xn]:s.CLAMP_TO_EDGE,[Er]:s.MIRRORED_REPEAT},ne={[Rt]:s.NEAREST,[Jl]:s.NEAREST_MIPMAP_NEAREST,[Hi]:s.NEAREST_MIPMAP_LINEAR,[Kt]:s.LINEAR,[Ls]:s.LINEAR_MIPMAP_NEAREST,[Wn]:s.LINEAR_MIPMAP_LINEAR},pe={[ec]:s.NEVER,[oc]:s.ALWAYS,[tc]:s.LESS,[$a]:s.LEQUAL,[nc]:s.EQUAL,[rc]:s.GEQUAL,[ic]:s.GREATER,[sc]:s.NOTEQUAL};function he(C,M){if(M.type===tn&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===Kt||M.magFilter===Ls||M.magFilter===Hi||M.magFilter===Wn||M.minFilter===Kt||M.minFilter===Ls||M.minFilter===Hi||M.minFilter===Wn)&&qe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(C,s.TEXTURE_WRAP_S,te[M.wrapS]),s.texParameteri(C,s.TEXTURE_WRAP_T,te[M.wrapT]),(C===s.TEXTURE_3D||C===s.TEXTURE_2D_ARRAY)&&s.texParameteri(C,s.TEXTURE_WRAP_R,te[M.wrapR]),s.texParameteri(C,s.TEXTURE_MAG_FILTER,ne[M.magFilter]),s.texParameteri(C,s.TEXTURE_MIN_FILTER,ne[M.minFilter]),M.compareFunction&&(s.texParameteri(C,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(C,s.TEXTURE_COMPARE_FUNC,pe[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===Rt||M.minFilter!==Hi&&M.minFilter!==Wn||M.type===tn&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");s.texParameterf(C,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function Ve(C,M){let H=!1;C.__webglInit===void 0&&(C.__webglInit=!0,M.addEventListener("dispose",b));const J=M.source;let ee=f.get(J);ee===void 0&&(ee={},f.set(J,ee));const $=B(M);if($!==C.__cacheKey){ee[$]===void 0&&(ee[$]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,H=!0),ee[$].usedTimes++;const Te=ee[C.__cacheKey];Te!==void 0&&(ee[C.__cacheKey].usedTimes--,Te.usedTimes===0&&v(M)),C.__cacheKey=$,C.__webglTexture=ee[$].texture}return H}function Ke(C,M,H){return Math.floor(Math.floor(C/H)/M)}function je(C,M,H,J){const $=C.updateRanges;if($.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,M.width,M.height,H,J,M.data);else{$.sort((ie,oe)=>ie.start-oe.start);let Te=0;for(let ie=1;ie<$.length;ie++){const oe=$[Te],ze=$[ie],Oe=oe.start+oe.count,ve=Ke(ze.start,M.width,4),He=Ke(oe.start,M.width,4);ze.start<=Oe+1&&ve===He&&Ke(ze.start+ze.count-1,M.width,4)===ve?oe.count=Math.max(oe.count,ze.start+ze.count-oe.start):(++Te,$[Te]=ze)}$.length=Te+1;const ce=s.getParameter(s.UNPACK_ROW_LENGTH),De=s.getParameter(s.UNPACK_SKIP_PIXELS),be=s.getParameter(s.UNPACK_SKIP_ROWS);s.pixelStorei(s.UNPACK_ROW_LENGTH,M.width);for(let ie=0,oe=$.length;ie<oe;ie++){const ze=$[ie],Oe=Math.floor(ze.start/4),ve=Math.ceil(ze.count/4),He=Oe%M.width,U=Math.floor(Oe/M.width),de=ve,ae=1;s.pixelStorei(s.UNPACK_SKIP_PIXELS,He),s.pixelStorei(s.UNPACK_SKIP_ROWS,U),t.texSubImage2D(s.TEXTURE_2D,0,He,U,de,ae,H,J,M.data)}C.clearUpdateRanges(),s.pixelStorei(s.UNPACK_ROW_LENGTH,ce),s.pixelStorei(s.UNPACK_SKIP_PIXELS,De),s.pixelStorei(s.UNPACK_SKIP_ROWS,be)}}function K(C,M,H){let J=s.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(J=s.TEXTURE_2D_ARRAY),M.isData3DTexture&&(J=s.TEXTURE_3D);const ee=Ve(C,M),$=M.source;t.bindTexture(J,C.__webglTexture,s.TEXTURE0+H);const Te=n.get($);if($.version!==Te.__version||ee===!0){t.activeTexture(s.TEXTURE0+H);const ce=nt.getPrimaries(nt.workingColorSpace),De=M.colorSpace===An?null:nt.getPrimaries(M.colorSpace),be=M.colorSpace===An||ce===De?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,M.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,M.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);let ie=x(M.image,!1,i.maxTextureSize);ie=Ae(M,ie);const oe=r.convert(M.format,M.colorSpace),ze=r.convert(M.type);let Oe=y(M.internalFormat,oe,ze,M.colorSpace,M.isVideoTexture);he(J,M);let ve;const He=M.mipmaps,U=M.isVideoTexture!==!0,de=Te.__version===void 0||ee===!0,ae=$.dataReady,le=A(M,ie);if(M.isDepthTexture)Oe=T(M.format===Ii,M.type),de&&(U?t.texStorage2D(s.TEXTURE_2D,1,Oe,ie.width,ie.height):t.texImage2D(s.TEXTURE_2D,0,Oe,ie.width,ie.height,0,oe,ze,null));else if(M.isDataTexture)if(He.length>0){U&&de&&t.texStorage2D(s.TEXTURE_2D,le,Oe,He[0].width,He[0].height);for(let se=0,Q=He.length;se<Q;se++)ve=He[se],U?ae&&t.texSubImage2D(s.TEXTURE_2D,se,0,0,ve.width,ve.height,oe,ze,ve.data):t.texImage2D(s.TEXTURE_2D,se,Oe,ve.width,ve.height,0,oe,ze,ve.data);M.generateMipmaps=!1}else U?(de&&t.texStorage2D(s.TEXTURE_2D,le,Oe,ie.width,ie.height),ae&&je(M,ie,oe,ze)):t.texImage2D(s.TEXTURE_2D,0,Oe,ie.width,ie.height,0,oe,ze,ie.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){U&&de&&t.texStorage3D(s.TEXTURE_2D_ARRAY,le,Oe,He[0].width,He[0].height,ie.depth);for(let se=0,Q=He.length;se<Q;se++)if(ve=He[se],M.format!==nn)if(oe!==null)if(U){if(ae)if(M.layerUpdates.size>0){const Me=la(ve.width,ve.height,M.format,M.type);for(const We of M.layerUpdates){const ft=ve.data.subarray(We*Me/ve.data.BYTES_PER_ELEMENT,(We+1)*Me/ve.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,se,0,0,We,ve.width,ve.height,1,oe,ft)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,se,0,0,0,ve.width,ve.height,ie.depth,oe,ve.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,se,Oe,ve.width,ve.height,ie.depth,0,ve.data,0,0);else qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?ae&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,se,0,0,0,ve.width,ve.height,ie.depth,oe,ze,ve.data):t.texImage3D(s.TEXTURE_2D_ARRAY,se,Oe,ve.width,ve.height,ie.depth,0,oe,ze,ve.data)}else{U&&de&&t.texStorage2D(s.TEXTURE_2D,le,Oe,He[0].width,He[0].height);for(let se=0,Q=He.length;se<Q;se++)ve=He[se],M.format!==nn?oe!==null?U?ae&&t.compressedTexSubImage2D(s.TEXTURE_2D,se,0,0,ve.width,ve.height,oe,ve.data):t.compressedTexImage2D(s.TEXTURE_2D,se,Oe,ve.width,ve.height,0,ve.data):qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?ae&&t.texSubImage2D(s.TEXTURE_2D,se,0,0,ve.width,ve.height,oe,ze,ve.data):t.texImage2D(s.TEXTURE_2D,se,Oe,ve.width,ve.height,0,oe,ze,ve.data)}else if(M.isDataArrayTexture)if(U){if(de&&t.texStorage3D(s.TEXTURE_2D_ARRAY,le,Oe,ie.width,ie.height,ie.depth),ae)if(M.layerUpdates.size>0){const se=la(ie.width,ie.height,M.format,M.type);for(const Q of M.layerUpdates){const Me=ie.data.subarray(Q*se/ie.data.BYTES_PER_ELEMENT,(Q+1)*se/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Q,ie.width,ie.height,1,oe,ze,Me)}M.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,oe,ze,ie.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Oe,ie.width,ie.height,ie.depth,0,oe,ze,ie.data);else if(M.isData3DTexture)U?(de&&t.texStorage3D(s.TEXTURE_3D,le,Oe,ie.width,ie.height,ie.depth),ae&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,oe,ze,ie.data)):t.texImage3D(s.TEXTURE_3D,0,Oe,ie.width,ie.height,ie.depth,0,oe,ze,ie.data);else if(M.isFramebufferTexture){if(de)if(U)t.texStorage2D(s.TEXTURE_2D,le,Oe,ie.width,ie.height);else{let se=ie.width,Q=ie.height;for(let Me=0;Me<le;Me++)t.texImage2D(s.TEXTURE_2D,Me,Oe,se,Q,0,oe,ze,null),se>>=1,Q>>=1}}else if(He.length>0){if(U&&de){const se=Fe(He[0]);t.texStorage2D(s.TEXTURE_2D,le,Oe,se.width,se.height)}for(let se=0,Q=He.length;se<Q;se++)ve=He[se],U?ae&&t.texSubImage2D(s.TEXTURE_2D,se,0,0,oe,ze,ve):t.texImage2D(s.TEXTURE_2D,se,Oe,oe,ze,ve);M.generateMipmaps=!1}else if(U){if(de){const se=Fe(ie);t.texStorage2D(s.TEXTURE_2D,le,Oe,se.width,se.height)}ae&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,oe,ze,ie)}else t.texImage2D(s.TEXTURE_2D,0,Oe,oe,ze,ie);m(M)&&p(J),Te.__version=$.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function j(C,M,H){if(M.image.length!==6)return;const J=Ve(C,M),ee=M.source;t.bindTexture(s.TEXTURE_CUBE_MAP,C.__webglTexture,s.TEXTURE0+H);const $=n.get(ee);if(ee.version!==$.__version||J===!0){t.activeTexture(s.TEXTURE0+H);const Te=nt.getPrimaries(nt.workingColorSpace),ce=M.colorSpace===An?null:nt.getPrimaries(M.colorSpace),De=M.colorSpace===An||Te===ce?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,M.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,M.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,De);const be=M.isCompressedTexture||M.image[0].isCompressedTexture,ie=M.image[0]&&M.image[0].isDataTexture,oe=[];for(let Q=0;Q<6;Q++)!be&&!ie?oe[Q]=x(M.image[Q],!0,i.maxCubemapSize):oe[Q]=ie?M.image[Q].image:M.image[Q],oe[Q]=Ae(M,oe[Q]);const ze=oe[0],Oe=r.convert(M.format,M.colorSpace),ve=r.convert(M.type),He=y(M.internalFormat,Oe,ve,M.colorSpace),U=M.isVideoTexture!==!0,de=$.__version===void 0||J===!0,ae=ee.dataReady;let le=A(M,ze);he(s.TEXTURE_CUBE_MAP,M);let se;if(be){U&&de&&t.texStorage2D(s.TEXTURE_CUBE_MAP,le,He,ze.width,ze.height);for(let Q=0;Q<6;Q++){se=oe[Q].mipmaps;for(let Me=0;Me<se.length;Me++){const We=se[Me];M.format!==nn?Oe!==null?U?ae&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,0,0,We.width,We.height,Oe,We.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,He,We.width,We.height,0,We.data):qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,0,0,We.width,We.height,Oe,ve,We.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,He,We.width,We.height,0,Oe,ve,We.data)}}}else{if(se=M.mipmaps,U&&de){se.length>0&&le++;const Q=Fe(oe[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,le,He,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(ie){U?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,oe[Q].width,oe[Q].height,Oe,ve,oe[Q].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,He,oe[Q].width,oe[Q].height,0,Oe,ve,oe[Q].data);for(let Me=0;Me<se.length;Me++){const ft=se[Me].image[Q].image;U?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,0,0,ft.width,ft.height,Oe,ve,ft.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,He,ft.width,ft.height,0,Oe,ve,ft.data)}}else{U?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,Oe,ve,oe[Q]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,He,Oe,ve,oe[Q]);for(let Me=0;Me<se.length;Me++){const We=se[Me];U?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,0,0,Oe,ve,We.image[Q]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,He,Oe,ve,We.image[Q])}}}m(M)&&p(s.TEXTURE_CUBE_MAP),$.__version=ee.version,M.onUpdate&&M.onUpdate(M)}C.__version=M.version}function fe(C,M,H,J,ee,$){const Te=r.convert(H.format,H.colorSpace),ce=r.convert(H.type),De=y(H.internalFormat,Te,ce,H.colorSpace),be=n.get(M),ie=n.get(H);if(ie.__renderTarget=M,!be.__hasExternalTextures){const oe=Math.max(1,M.width>>$),ze=Math.max(1,M.height>>$);ee===s.TEXTURE_3D||ee===s.TEXTURE_2D_ARRAY?t.texImage3D(ee,$,De,oe,ze,M.depth,0,Te,ce,null):t.texImage2D(ee,$,De,oe,ze,0,Te,ce,null)}t.bindFramebuffer(s.FRAMEBUFFER,C),xe(M)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,J,ee,ie.__webglTexture,0,ke(M)):(ee===s.TEXTURE_2D||ee>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&ee<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,J,ee,ie.__webglTexture,$),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Re(C,M,H){if(s.bindRenderbuffer(s.RENDERBUFFER,C),M.depthBuffer){const J=M.depthTexture,ee=J&&J.isDepthTexture?J.type:null,$=T(M.stencilBuffer,ee),Te=M.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ce=ke(M);xe(M)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ce,$,M.width,M.height):H?s.renderbufferStorageMultisample(s.RENDERBUFFER,ce,$,M.width,M.height):s.renderbufferStorage(s.RENDERBUFFER,$,M.width,M.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Te,s.RENDERBUFFER,C)}else{const J=M.textures;for(let ee=0;ee<J.length;ee++){const $=J[ee],Te=r.convert($.format,$.colorSpace),ce=r.convert($.type),De=y($.internalFormat,Te,ce,$.colorSpace),be=ke(M);H&&xe(M)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,be,De,M.width,M.height):xe(M)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,be,De,M.width,M.height):s.renderbufferStorage(s.RENDERBUFFER,De,M.width,M.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function ye(C,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,C),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=n.get(M.depthTexture);J.__renderTarget=M,(!J.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),G(M.depthTexture,0);const ee=J.__webglTexture,$=ke(M);if(M.depthTexture.format===Li)xe(M)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,ee,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,ee,0);else if(M.depthTexture.format===Ii)xe(M)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,ee,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,ee,0);else throw new Error("Unknown depthTexture format")}function Ie(C){const M=n.get(C),H=C.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==C.depthTexture){const J=C.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),J){const ee=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,J.removeEventListener("dispose",ee)};J.addEventListener("dispose",ee),M.__depthDisposeCallback=ee}M.__boundDepthTexture=J}if(C.depthTexture&&!M.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");const J=C.texture.mipmaps;J&&J.length>0?ye(M.__webglFramebuffer[0],C):ye(M.__webglFramebuffer,C)}else if(H){M.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(t.bindFramebuffer(s.FRAMEBUFFER,M.__webglFramebuffer[J]),M.__webglDepthbuffer[J]===void 0)M.__webglDepthbuffer[J]=s.createRenderbuffer(),Re(M.__webglDepthbuffer[J],C,!1);else{const ee=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,$=M.__webglDepthbuffer[J];s.bindRenderbuffer(s.RENDERBUFFER,$),s.framebufferRenderbuffer(s.FRAMEBUFFER,ee,s.RENDERBUFFER,$)}}else{const J=C.texture.mipmaps;if(J&&J.length>0?t.bindFramebuffer(s.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=s.createRenderbuffer(),Re(M.__webglDepthbuffer,C,!1);else{const ee=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,$=M.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,$),s.framebufferRenderbuffer(s.FRAMEBUFFER,ee,s.RENDERBUFFER,$)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function it(C,M,H){const J=n.get(C);M!==void 0&&fe(J.__webglFramebuffer,C,C.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),H!==void 0&&Ie(C)}function Ne(C){const M=C.texture,H=n.get(C),J=n.get(M);C.addEventListener("dispose",R);const ee=C.textures,$=C.isWebGLCubeRenderTarget===!0,Te=ee.length>1;if(Te||(J.__webglTexture===void 0&&(J.__webglTexture=s.createTexture()),J.__version=M.version,o.memory.textures++),$){H.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(M.mipmaps&&M.mipmaps.length>0){H.__webglFramebuffer[ce]=[];for(let De=0;De<M.mipmaps.length;De++)H.__webglFramebuffer[ce][De]=s.createFramebuffer()}else H.__webglFramebuffer[ce]=s.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){H.__webglFramebuffer=[];for(let ce=0;ce<M.mipmaps.length;ce++)H.__webglFramebuffer[ce]=s.createFramebuffer()}else H.__webglFramebuffer=s.createFramebuffer();if(Te)for(let ce=0,De=ee.length;ce<De;ce++){const be=n.get(ee[ce]);be.__webglTexture===void 0&&(be.__webglTexture=s.createTexture(),o.memory.textures++)}if(C.samples>0&&xe(C)===!1){H.__webglMultisampledFramebuffer=s.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let ce=0;ce<ee.length;ce++){const De=ee[ce];H.__webglColorRenderbuffer[ce]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,H.__webglColorRenderbuffer[ce]);const be=r.convert(De.format,De.colorSpace),ie=r.convert(De.type),oe=y(De.internalFormat,be,ie,De.colorSpace,C.isXRRenderTarget===!0),ze=ke(C);s.renderbufferStorageMultisample(s.RENDERBUFFER,ze,oe,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ce,s.RENDERBUFFER,H.__webglColorRenderbuffer[ce])}s.bindRenderbuffer(s.RENDERBUFFER,null),C.depthBuffer&&(H.__webglDepthRenderbuffer=s.createRenderbuffer(),Re(H.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if($){t.bindTexture(s.TEXTURE_CUBE_MAP,J.__webglTexture),he(s.TEXTURE_CUBE_MAP,M);for(let ce=0;ce<6;ce++)if(M.mipmaps&&M.mipmaps.length>0)for(let De=0;De<M.mipmaps.length;De++)fe(H.__webglFramebuffer[ce][De],C,M,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ce,De);else fe(H.__webglFramebuffer[ce],C,M,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);m(M)&&p(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Te){for(let ce=0,De=ee.length;ce<De;ce++){const be=ee[ce],ie=n.get(be);let oe=s.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(oe=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(oe,ie.__webglTexture),he(oe,be),fe(H.__webglFramebuffer,C,be,s.COLOR_ATTACHMENT0+ce,oe,0),m(be)&&p(oe)}t.unbindTexture()}else{let ce=s.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ce=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ce,J.__webglTexture),he(ce,M),M.mipmaps&&M.mipmaps.length>0)for(let De=0;De<M.mipmaps.length;De++)fe(H.__webglFramebuffer[De],C,M,s.COLOR_ATTACHMENT0,ce,De);else fe(H.__webglFramebuffer,C,M,s.COLOR_ATTACHMENT0,ce,0);m(M)&&p(ce),t.unbindTexture()}C.depthBuffer&&Ie(C)}function Je(C){const M=C.textures;for(let H=0,J=M.length;H<J;H++){const ee=M[H];if(m(ee)){const $=S(C),Te=n.get(ee).__webglTexture;t.bindTexture($,Te),p($),t.unbindTexture()}}}const P=[],we=[];function Ce(C){if(C.samples>0){if(xe(C)===!1){const M=C.textures,H=C.width,J=C.height;let ee=s.COLOR_BUFFER_BIT;const $=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Te=n.get(C),ce=M.length>1;if(ce)for(let be=0;be<M.length;be++)t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer);const De=C.texture.mipmaps;De&&De.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let be=0;be<M.length;be++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(ee|=s.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(ee|=s.STENCIL_BUFFER_BIT)),ce){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Te.__webglColorRenderbuffer[be]);const ie=n.get(M[be]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,ie,0)}s.blitFramebuffer(0,0,H,J,0,0,H,J,ee,s.NEAREST),l===!0&&(P.length=0,we.length=0,P.push(s.COLOR_ATTACHMENT0+be),C.depthBuffer&&C.resolveDepthBuffer===!1&&(P.push($),we.push($),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,we)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,P))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ce)for(let be=0;be<M.length;be++){t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.RENDERBUFFER,Te.__webglColorRenderbuffer[be]);const ie=n.get(M[be]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.TEXTURE_2D,ie,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&l){const M=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[M])}}}function ke(C){return Math.min(i.maxSamples,C.samples)}function xe(C){const M=n.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function ot(C){const M=o.render.frame;h.get(C)!==M&&(h.set(C,M),C.update())}function Ae(C,M){const H=C.colorSpace,J=C.format,ee=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||H!==fi&&H!==An&&(nt.getTransfer(H)===ct?(J!==nn||ee!==ln)&&qe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):_t("WebGLTextures: Unsupported texture color space:",H)),M}function Fe(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=F,this.resetTextureUnits=I,this.setTexture2D=G,this.setTexture2DArray=W,this.setTexture3D=Z,this.setTextureCube=X,this.rebindTextures=it,this.setupRenderTarget=Ne,this.updateRenderTargetMipmap=Je,this.updateMultisampleRenderTarget=Ce,this.setupDepthRenderbuffer=Ie,this.setupFrameBufferTexture=fe,this.useMultisampledRTT=xe}function Ip(s,e){function t(n,i=An){let r;const o=nt.getTransfer(i);if(n===ln)return s.UNSIGNED_BYTE;if(n===ao)return s.UNSIGNED_SHORT_4_4_4_4;if(n===lo)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Ha)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Va)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===za)return s.BYTE;if(n===Ga)return s.SHORT;if(n===Di)return s.UNSIGNED_SHORT;if(n===oo)return s.INT;if(n===Xn)return s.UNSIGNED_INT;if(n===tn)return s.FLOAT;if(n===gi)return s.HALF_FLOAT;if(n===Wa)return s.ALPHA;if(n===Xa)return s.RGB;if(n===nn)return s.RGBA;if(n===Li)return s.DEPTH_COMPONENT;if(n===Ii)return s.DEPTH_STENCIL;if(n===qa)return s.RED;if(n===co)return s.RED_INTEGER;if(n===ho)return s.RG;if(n===uo)return s.RG_INTEGER;if(n===fo)return s.RGBA_INTEGER;if(n===fs||n===ps||n===ms||n===gs)if(o===ct)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===fs)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ps)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ms)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===gs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===fs)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ps)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ms)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===gs)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Tr||n===Ar||n===Rr||n===wr)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Tr)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ar)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Rr)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===wr)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Cr||n===Dr||n===Pr)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Cr||n===Dr)return o===ct?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Pr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Lr||n===Ir||n===Ur||n===Nr||n===Fr||n===Or||n===kr||n===Br||n===zr||n===Gr||n===Hr||n===Vr||n===Wr||n===Xr)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Lr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ir)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ur)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Nr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Fr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Or)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===kr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Br)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===zr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Gr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Hr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Vr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Wr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Xr)return o===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===qr||n===Yr||n===$r)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===qr)return o===ct?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Yr)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===$r)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Kr||n===Jr||n===jr||n===Zr)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Kr)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Jr)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===jr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Zr)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Pi?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const Up=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Np=`
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

}`;class Fp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new sl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Tt({vertexShader:Up,fragmentShader:Np,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Xe(new Rs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Op extends xi{constructor(e,t){super();const n=this;let i=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,f=null,d=null,g=null;const x=typeof XRWebGLBinding<"u",m=new Fp,p={},S=t.getContextAttributes();let y=null,T=null;const A=[],b=[],R=new et;let w=null;const v=new $t;v.viewport=new vt;const _=new $t;_.viewport=new vt;const D=[v,_],I=new Qc;let F=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let j=A[K];return j===void 0&&(j=new tr,A[K]=j),j.getTargetRaySpace()},this.getControllerGrip=function(K){let j=A[K];return j===void 0&&(j=new tr,A[K]=j),j.getGripSpace()},this.getHand=function(K){let j=A[K];return j===void 0&&(j=new tr,A[K]=j),j.getHandSpace()};function G(K){const j=b.indexOf(K.inputSource);if(j===-1)return;const fe=A[j];fe!==void 0&&(fe.update(K.inputSource,K.frame,c||o),fe.dispatchEvent({type:K.type,data:K.inputSource}))}function W(){i.removeEventListener("select",G),i.removeEventListener("selectstart",G),i.removeEventListener("selectend",G),i.removeEventListener("squeeze",G),i.removeEventListener("squeezestart",G),i.removeEventListener("squeezeend",G),i.removeEventListener("end",W),i.removeEventListener("inputsourceschange",Z);for(let K=0;K<A.length;K++){const j=b[K];j!==null&&(b[K]=null,A[K].disconnect(j))}F=null,B=null,m.reset();for(const K in p)delete p[K];e.setRenderTarget(y),d=null,f=null,u=null,i=null,T=null,je.stop(),n.isPresenting=!1,e.setPixelRatio(w),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&qe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,n.isPresenting===!0&&qe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function(K){if(i=K,i!==null){if(y=e.getRenderTarget(),i.addEventListener("select",G),i.addEventListener("selectstart",G),i.addEventListener("selectend",G),i.addEventListener("squeeze",G),i.addEventListener("squeezestart",G),i.addEventListener("squeezeend",G),i.addEventListener("end",W),i.addEventListener("inputsourceschange",Z),S.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(R),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let fe=null,Re=null,ye=null;S.depth&&(ye=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,fe=S.stencil?Ii:Li,Re=S.stencil?Pi:Xn);const Ie={colorFormat:t.RGBA8,depthFormat:ye,scaleFactor:r};u=this.getBinding(),f=u.createProjectionLayer(Ie),i.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),T=new Pn(f.textureWidth,f.textureHeight,{format:nn,type:ln,depthTexture:new vo(f.textureWidth,f.textureHeight,Re,void 0,void 0,void 0,void 0,void 0,void 0,fe),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const fe={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(i,t,fe),i.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),T=new Pn(d.framebufferWidth,d.framebufferHeight,{format:nn,type:ln,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await i.requestReferenceSpace(a),je.setContext(i),je.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function Z(K){for(let j=0;j<K.removed.length;j++){const fe=K.removed[j],Re=b.indexOf(fe);Re>=0&&(b[Re]=null,A[Re].disconnect(fe))}for(let j=0;j<K.added.length;j++){const fe=K.added[j];let Re=b.indexOf(fe);if(Re===-1){for(let Ie=0;Ie<A.length;Ie++)if(Ie>=b.length){b.push(fe),Re=Ie;break}else if(b[Ie]===null){b[Ie]=fe,Re=Ie;break}if(Re===-1)break}const ye=A[Re];ye&&ye.connect(fe)}}const X=new L,te=new L;function ne(K,j,fe){X.setFromMatrixPosition(j.matrixWorld),te.setFromMatrixPosition(fe.matrixWorld);const Re=X.distanceTo(te),ye=j.projectionMatrix.elements,Ie=fe.projectionMatrix.elements,it=ye[14]/(ye[10]-1),Ne=ye[14]/(ye[10]+1),Je=(ye[9]+1)/ye[5],P=(ye[9]-1)/ye[5],we=(ye[8]-1)/ye[0],Ce=(Ie[8]+1)/Ie[0],ke=it*we,xe=it*Ce,ot=Re/(-we+Ce),Ae=ot*-we;if(j.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Ae),K.translateZ(ot),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),ye[10]===-1)K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{const Fe=it+ot,C=Ne+ot,M=ke-Ae,H=xe+(Re-Ae),J=Je*Ne/C*Fe,ee=P*Ne/C*Fe;K.projectionMatrix.makePerspective(M,H,J,ee,Fe,C),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function pe(K,j){j===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(j.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(i===null)return;let j=K.near,fe=K.far;m.texture!==null&&(m.depthNear>0&&(j=m.depthNear),m.depthFar>0&&(fe=m.depthFar)),I.near=_.near=v.near=j,I.far=_.far=v.far=fe,(F!==I.near||B!==I.far)&&(i.updateRenderState({depthNear:I.near,depthFar:I.far}),F=I.near,B=I.far),I.layers.mask=K.layers.mask|6,v.layers.mask=I.layers.mask&3,_.layers.mask=I.layers.mask&5;const Re=K.parent,ye=I.cameras;pe(I,Re);for(let Ie=0;Ie<ye.length;Ie++)pe(ye[Ie],Re);ye.length===2?ne(I,v,_):I.projectionMatrix.copy(v.projectionMatrix),he(K,I,Re)};function he(K,j,fe){fe===null?K.matrix.copy(j.matrixWorld):(K.matrix.copy(fe.matrixWorld),K.matrix.invert(),K.matrix.multiply(j.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Qr*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return I},this.getFoveation=function(){if(!(f===null&&d===null))return l},this.setFoveation=function(K){l=K,f!==null&&(f.fixedFoveation=K),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=K)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(I)},this.getCameraTexture=function(K){return p[K]};let Ve=null;function Ke(K,j){if(h=j.getViewerPose(c||o),g=j,h!==null){const fe=h.views;d!==null&&(e.setRenderTargetFramebuffer(T,d.framebuffer),e.setRenderTarget(T));let Re=!1;fe.length!==I.cameras.length&&(I.cameras.length=0,Re=!0);for(let Ne=0;Ne<fe.length;Ne++){const Je=fe[Ne];let P=null;if(d!==null)P=d.getViewport(Je);else{const Ce=u.getViewSubImage(f,Je);P=Ce.viewport,Ne===0&&(e.setRenderTargetTextures(T,Ce.colorTexture,Ce.depthStencilTexture),e.setRenderTarget(T))}let we=D[Ne];we===void 0&&(we=new $t,we.layers.enable(Ne),we.viewport=new vt,D[Ne]=we),we.matrix.fromArray(Je.transform.matrix),we.matrix.decompose(we.position,we.quaternion,we.scale),we.projectionMatrix.fromArray(Je.projectionMatrix),we.projectionMatrixInverse.copy(we.projectionMatrix).invert(),we.viewport.set(P.x,P.y,P.width,P.height),Ne===0&&(I.matrix.copy(we.matrix),I.matrix.decompose(I.position,I.quaternion,I.scale)),Re===!0&&I.cameras.push(we)}const ye=i.enabledFeatures;if(ye&&ye.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const Ne=u.getDepthInformation(fe[0]);Ne&&Ne.isValid&&Ne.texture&&m.init(Ne,i.renderState)}if(ye&&ye.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let Ne=0;Ne<fe.length;Ne++){const Je=fe[Ne].camera;if(Je){let P=p[Je];P||(P=new sl,p[Je]=P);const we=u.getCameraImage(Je);P.sourceTexture=we}}}}for(let fe=0;fe<A.length;fe++){const Re=b[fe],ye=A[fe];Re!==null&&ye!==void 0&&ye.update(Re,j,c||o)}Ve&&Ve(K,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),g=null}const je=new ol;je.setAnimationLoop(Ke),this.setAnimationLoop=function(K){Ve=K},this.dispose=function(){}}}const Bn=new cn,kp=new dt;function Bp(s,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,el(s)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function i(m,p,S,y,T){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),f(m,p),p.isMeshPhysicalMaterial&&d(m,p,T)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),x(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?l(m,p,S,y):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Pt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Pt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const S=e.get(p),y=S.envMap,T=S.envMapRotation;y&&(m.envMap.value=y,Bn.copy(T),Bn.x*=-1,Bn.y*=-1,Bn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Bn.y*=-1,Bn.z*=-1),m.envMapRotation.value.setFromMatrix4(kp.makeRotationFromEuler(Bn)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,S,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=y*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function f(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Pt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function x(m,p){const S=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function zp(s,e,t,n){let i={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,y){const T=y.program;n.uniformBlockBinding(S,T)}function c(S,y){let T=i[S.id];T===void 0&&(g(S),T=h(S),i[S.id]=T,S.addEventListener("dispose",m));const A=y.program;n.updateUBOMapping(S,A);const b=e.render.frame;r[S.id]!==b&&(f(S),r[S.id]=b)}function h(S){const y=u();S.__bindingPointIndex=y;const T=s.createBuffer(),A=S.__size,b=S.usage;return s.bindBuffer(s.UNIFORM_BUFFER,T),s.bufferData(s.UNIFORM_BUFFER,A,b),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,y,T),T}function u(){for(let S=0;S<a;S++)if(o.indexOf(S)===-1)return o.push(S),S;return _t("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(S){const y=i[S.id],T=S.uniforms,A=S.__cache;s.bindBuffer(s.UNIFORM_BUFFER,y);for(let b=0,R=T.length;b<R;b++){const w=Array.isArray(T[b])?T[b]:[T[b]];for(let v=0,_=w.length;v<_;v++){const D=w[v];if(d(D,b,v,A)===!0){const I=D.__offset,F=Array.isArray(D.value)?D.value:[D.value];let B=0;for(let G=0;G<F.length;G++){const W=F[G],Z=x(W);typeof W=="number"||typeof W=="boolean"?(D.__data[0]=W,s.bufferSubData(s.UNIFORM_BUFFER,I+B,D.__data)):W.isMatrix3?(D.__data[0]=W.elements[0],D.__data[1]=W.elements[1],D.__data[2]=W.elements[2],D.__data[3]=0,D.__data[4]=W.elements[3],D.__data[5]=W.elements[4],D.__data[6]=W.elements[5],D.__data[7]=0,D.__data[8]=W.elements[6],D.__data[9]=W.elements[7],D.__data[10]=W.elements[8],D.__data[11]=0):(W.toArray(D.__data,B),B+=Z.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,I,D.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function d(S,y,T,A){const b=S.value,R=y+"_"+T;if(A[R]===void 0)return typeof b=="number"||typeof b=="boolean"?A[R]=b:A[R]=b.clone(),!0;{const w=A[R];if(typeof b=="number"||typeof b=="boolean"){if(w!==b)return A[R]=b,!0}else if(w.equals(b)===!1)return w.copy(b),!0}return!1}function g(S){const y=S.uniforms;let T=0;const A=16;for(let R=0,w=y.length;R<w;R++){const v=Array.isArray(y[R])?y[R]:[y[R]];for(let _=0,D=v.length;_<D;_++){const I=v[_],F=Array.isArray(I.value)?I.value:[I.value];for(let B=0,G=F.length;B<G;B++){const W=F[B],Z=x(W),X=T%A,te=X%Z.boundary,ne=X+te;T+=te,ne!==0&&A-ne<Z.storage&&(T+=A-ne),I.__data=new Float32Array(Z.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=T,T+=Z.storage}}}const b=T%A;return b>0&&(T+=A-b),S.__size=T,S.__cache={},this}function x(S){const y={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(y.boundary=4,y.storage=4):S.isVector2?(y.boundary=8,y.storage=8):S.isVector3||S.isColor?(y.boundary=16,y.storage=12):S.isVector4?(y.boundary=16,y.storage=16):S.isMatrix3?(y.boundary=48,y.storage=48):S.isMatrix4?(y.boundary=64,y.storage=64):S.isTexture?qe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):qe("WebGLRenderer: Unsupported uniform value type.",S),y}function m(S){const y=S.target;y.removeEventListener("dispose",m);const T=o.indexOf(y.__bindingPointIndex);o.splice(T,1),s.deleteBuffer(i[y.id]),delete i[y.id],delete r[y.id]}function p(){for(const S in i)s.deleteBuffer(i[S]);o=[],i={},r={}}return{bind:l,update:c,dispose:p}}const Gp=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let mn=null;function Hp(){return mn===null&&(mn=new Nc(Gp,32,32,ho,gi),mn.minFilter=Kt,mn.magFilter=Kt,mn.wrapS=xn,mn.wrapT=xn,mn.generateMipmaps=!1,mn.needsUpdate=!0),mn}class Vp{constructor(e={}){const{canvas:t=ac(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let d;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=n.getContextAttributes().alpha}else d=o;const g=new Set([fo,uo,co]),x=new Set([ln,Xn,Di,Pi,ao,lo]),m=new Uint32Array(4),p=new Int32Array(4);let S=null,y=null;const T=[],A=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Cn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const b=this;let R=!1;this._outputColorSpace=Yt;let w=0,v=0,_=null,D=-1,I=null;const F=new vt,B=new vt;let G=null;const W=new Le(0);let Z=0,X=t.width,te=t.height,ne=1,pe=null,he=null;const Ve=new vt(0,0,X,te),Ke=new vt(0,0,X,te);let je=!1;const K=new Ts;let j=!1,fe=!1;const Re=new dt,ye=new L,Ie=new vt,it={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ne=!1;function Je(){return _===null?ne:1}let P=n;function we(E,O){return t.getContext(E,O)}try{const E={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${so}`),t.addEventListener("webglcontextlost",se,!1),t.addEventListener("webglcontextrestored",Q,!1),t.addEventListener("webglcontextcreationerror",Me,!1),P===null){const O="webgl2";if(P=we(O,E),P===null)throw we(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw E("WebGLRenderer: "+E.message),E}let Ce,ke,xe,ot,Ae,Fe,C,M,H,J,ee,$,Te,ce,De,be,ie,oe,ze,Oe,ve,He,U,de;function ae(){Ce=new Jd(P),Ce.init(),He=new Ip(P,Ce),ke=new Gd(P,Ce,e,He),xe=new Pp(P,Ce),ke.reversedDepthBuffer&&f&&xe.buffers.depth.setReversed(!0),ot=new Qd(P),Ae=new _p,Fe=new Lp(P,Ce,xe,Ae,ke,He,ot),C=new Vd(b),M=new Kd(b),H=new ih(P),U=new Bd(P,H),J=new jd(P,H,ot,U),ee=new tf(P,J,H,ot),ze=new ef(P,ke,Fe),be=new Hd(Ae),$=new xp(b,C,M,Ce,ke,U,be),Te=new Bp(b,Ae),ce=new Sp,De=new Ap(Ce),oe=new kd(b,C,M,xe,ee,d,l),ie=new Cp(b,ee,ke),de=new zp(P,ot,ke,xe),Oe=new zd(P,Ce,ot),ve=new Zd(P,Ce,ot),ot.programs=$.programs,b.capabilities=ke,b.extensions=Ce,b.properties=Ae,b.renderLists=ce,b.shadowMap=ie,b.state=xe,b.info=ot}ae();const le=new Op(b,P);this.xr=le,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){const E=Ce.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Ce.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return ne},this.setPixelRatio=function(E){E!==void 0&&(ne=E,this.setSize(X,te,!1))},this.getSize=function(E){return E.set(X,te)},this.setSize=function(E,O,q=!0){if(le.isPresenting){qe("WebGLRenderer: Can't change size while VR device is presenting.");return}X=E,te=O,t.width=Math.floor(E*ne),t.height=Math.floor(O*ne),q===!0&&(t.style.width=E+"px",t.style.height=O+"px"),this.setViewport(0,0,E,O)},this.getDrawingBufferSize=function(E){return E.set(X*ne,te*ne).floor()},this.setDrawingBufferSize=function(E,O,q){X=E,te=O,ne=q,t.width=Math.floor(E*q),t.height=Math.floor(O*q),this.setViewport(0,0,E,O)},this.getCurrentViewport=function(E){return E.copy(F)},this.getViewport=function(E){return E.copy(Ve)},this.setViewport=function(E,O,q,Y){E.isVector4?Ve.set(E.x,E.y,E.z,E.w):Ve.set(E,O,q,Y),xe.viewport(F.copy(Ve).multiplyScalar(ne).round())},this.getScissor=function(E){return E.copy(Ke)},this.setScissor=function(E,O,q,Y){E.isVector4?Ke.set(E.x,E.y,E.z,E.w):Ke.set(E,O,q,Y),xe.scissor(B.copy(Ke).multiplyScalar(ne).round())},this.getScissorTest=function(){return je},this.setScissorTest=function(E){xe.setScissorTest(je=E)},this.setOpaqueSort=function(E){pe=E},this.setTransparentSort=function(E){he=E},this.getClearColor=function(E){return E.copy(oe.getClearColor())},this.setClearColor=function(){oe.setClearColor(...arguments)},this.getClearAlpha=function(){return oe.getClearAlpha()},this.setClearAlpha=function(){oe.setClearAlpha(...arguments)},this.clear=function(E=!0,O=!0,q=!0){let Y=0;if(E){let z=!1;if(_!==null){const re=_.texture.format;z=g.has(re)}if(z){const re=_.texture.type,me=x.has(re),Ee=oe.getClearColor(),Se=oe.getClearAlpha(),Be=Ee.r,Ge=Ee.g,Pe=Ee.b;me?(m[0]=Be,m[1]=Ge,m[2]=Pe,m[3]=Se,P.clearBufferuiv(P.COLOR,0,m)):(p[0]=Be,p[1]=Ge,p[2]=Pe,p[3]=Se,P.clearBufferiv(P.COLOR,0,p))}else Y|=P.COLOR_BUFFER_BIT}O&&(Y|=P.DEPTH_BUFFER_BIT),q&&(Y|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",se,!1),t.removeEventListener("webglcontextrestored",Q,!1),t.removeEventListener("webglcontextcreationerror",Me,!1),oe.dispose(),ce.dispose(),De.dispose(),Ae.dispose(),C.dispose(),M.dispose(),ee.dispose(),U.dispose(),de.dispose(),$.dispose(),le.dispose(),le.removeEventListener("sessionstart",Mo),le.removeEventListener("sessionend",Eo),Ln.stop()};function se(E){E.preventDefault(),Oo("WebGLRenderer: Context Lost."),R=!0}function Q(){Oo("WebGLRenderer: Context Restored."),R=!1;const E=ot.autoReset,O=ie.enabled,q=ie.autoUpdate,Y=ie.needsUpdate,z=ie.type;ae(),ot.autoReset=E,ie.enabled=O,ie.autoUpdate=q,ie.needsUpdate=Y,ie.type=z}function Me(E){_t("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function We(E){const O=E.target;O.removeEventListener("dispose",We),ft(O)}function ft(E){at(E),Ae.remove(E)}function at(E){const O=Ae.get(E).programs;O!==void 0&&(O.forEach(function(q){$.releaseProgram(q)}),E.isShaderMaterial&&$.releaseShaderCache(E))}this.renderBufferDirect=function(E,O,q,Y,z,re){O===null&&(O=it);const me=z.isMesh&&z.matrixWorld.determinant()<0,Ee=fl(E,O,q,Y,z);xe.setMaterial(Y,me);let Se=q.index,Be=1;if(Y.wireframe===!0){if(Se=J.getWireframeAttribute(q),Se===void 0)return;Be=2}const Ge=q.drawRange,Pe=q.attributes.position;let Ze=Ge.start*Be,lt=(Ge.start+Ge.count)*Be;re!==null&&(Ze=Math.max(Ze,re.start*Be),lt=Math.min(lt,(re.start+re.count)*Be)),Se!==null?(Ze=Math.max(Ze,0),lt=Math.min(lt,Se.count)):Pe!=null&&(Ze=Math.max(Ze,0),lt=Math.min(lt,Pe.count));const gt=lt-Ze;if(gt<0||gt===1/0)return;U.setup(z,Y,Ee,q,Se);let xt,ht=Oe;if(Se!==null&&(xt=H.get(Se),ht=ve,ht.setIndex(xt)),z.isMesh)Y.wireframe===!0?(xe.setLineWidth(Y.wireframeLinewidth*Je()),ht.setMode(P.LINES)):ht.setMode(P.TRIANGLES);else if(z.isLine){let Ue=Y.linewidth;Ue===void 0&&(Ue=1),xe.setLineWidth(Ue*Je()),z.isLineSegments?ht.setMode(P.LINES):z.isLineLoop?ht.setMode(P.LINE_LOOP):ht.setMode(P.LINE_STRIP)}else z.isPoints?ht.setMode(P.POINTS):z.isSprite&&ht.setMode(P.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Ni("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ht.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(Ce.get("WEBGL_multi_draw"))ht.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const Ue=z._multiDrawStarts,pt=z._multiDrawCounts,tt=z._multiDrawCount,kt=Se?H.get(Se).bytesPerElement:1,qn=Ae.get(Y).currentProgram.getUniforms();for(let Bt=0;Bt<tt;Bt++)qn.setValue(P,"_gl_DrawID",Bt),ht.render(Ue[Bt]/kt,pt[Bt])}else if(z.isInstancedMesh)ht.renderInstances(Ze,gt,z.count);else if(q.isInstancedBufferGeometry){const Ue=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,pt=Math.min(q.instanceCount,Ue);ht.renderInstances(Ze,gt,pt)}else ht.render(Ze,gt)};function sn(E,O,q){E.transparent===!0&&E.side===Vt&&E.forceSinglePass===!1?(E.side=Pt,E.needsUpdate=!0,Gi(E,O,q),E.side=Dn,E.needsUpdate=!0,Gi(E,O,q),E.side=Vt):Gi(E,O,q)}this.compile=function(E,O,q=null){q===null&&(q=E),y=De.get(q),y.init(O),A.push(y),q.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(y.pushLight(z),z.castShadow&&y.pushShadow(z))}),E!==q&&E.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(y.pushLight(z),z.castShadow&&y.pushShadow(z))}),y.setupLights();const Y=new Set;return E.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const re=z.material;if(re)if(Array.isArray(re))for(let me=0;me<re.length;me++){const Ee=re[me];sn(Ee,q,z),Y.add(Ee)}else sn(re,q,z),Y.add(re)}),y=A.pop(),Y},this.compileAsync=function(E,O,q=null){const Y=this.compile(E,O,q);return new Promise(z=>{function re(){if(Y.forEach(function(me){Ae.get(me).currentProgram.isReady()&&Y.delete(me)}),Y.size===0){z(E);return}setTimeout(re,10)}Ce.get("KHR_parallel_shader_compile")!==null?re():setTimeout(re,10)})};let Jt=null;function dl(E){Jt&&Jt(E)}function Mo(){Ln.stop()}function Eo(){Ln.start()}const Ln=new ol;Ln.setAnimationLoop(dl),typeof self<"u"&&Ln.setContext(self),this.setAnimationLoop=function(E){Jt=E,le.setAnimationLoop(E),E===null?Ln.stop():Ln.start()},le.addEventListener("sessionstart",Mo),le.addEventListener("sessionend",Eo),this.render=function(E,O){if(O!==void 0&&O.isCamera!==!0){_t("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),le.enabled===!0&&le.isPresenting===!0&&(le.cameraAutoUpdate===!0&&le.updateCamera(O),O=le.getCamera()),E.isScene===!0&&E.onBeforeRender(b,E,O,_),y=De.get(E,A.length),y.init(O),A.push(y),Re.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),K.setFromProjectionMatrix(Re,on,O.reversedDepth),fe=this.localClippingEnabled,j=be.init(this.clippingPlanes,fe),S=ce.get(E,T.length),S.init(),T.push(S),le.enabled===!0&&le.isPresenting===!0){const re=b.xr.getDepthSensingMesh();re!==null&&Ds(re,O,-1/0,b.sortObjects)}Ds(E,O,0,b.sortObjects),S.finish(),b.sortObjects===!0&&S.sort(pe,he),Ne=le.enabled===!1||le.isPresenting===!1||le.hasDepthSensing()===!1,Ne&&oe.addToRenderList(S,E),this.info.render.frame++,j===!0&&be.beginShadows();const q=y.state.shadowsArray;ie.render(q,E,O),j===!0&&be.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=S.opaque,z=S.transmissive;if(y.setupLights(),O.isArrayCamera){const re=O.cameras;if(z.length>0)for(let me=0,Ee=re.length;me<Ee;me++){const Se=re[me];Ao(Y,z,E,Se)}Ne&&oe.render(E);for(let me=0,Ee=re.length;me<Ee;me++){const Se=re[me];To(S,E,Se,Se.viewport)}}else z.length>0&&Ao(Y,z,E,O),Ne&&oe.render(E),To(S,E,O);_!==null&&v===0&&(Fe.updateMultisampleRenderTarget(_),Fe.updateRenderTargetMipmap(_)),E.isScene===!0&&E.onAfterRender(b,E,O),U.resetDefaultState(),D=-1,I=null,A.pop(),A.length>0?(y=A[A.length-1],j===!0&&be.setGlobalState(b.clippingPlanes,y.state.camera)):y=null,T.pop(),T.length>0?S=T[T.length-1]:S=null};function Ds(E,O,q,Y){if(E.visible===!1)return;if(E.layers.test(O.layers)){if(E.isGroup)q=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(O);else if(E.isLight)y.pushLight(E),E.castShadow&&y.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||K.intersectsSprite(E)){Y&&Ie.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Re);const me=ee.update(E),Ee=E.material;Ee.visible&&S.push(E,me,Ee,q,Ie.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||K.intersectsObject(E))){const me=ee.update(E),Ee=E.material;if(Y&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Ie.copy(E.boundingSphere.center)):(me.boundingSphere===null&&me.computeBoundingSphere(),Ie.copy(me.boundingSphere.center)),Ie.applyMatrix4(E.matrixWorld).applyMatrix4(Re)),Array.isArray(Ee)){const Se=me.groups;for(let Be=0,Ge=Se.length;Be<Ge;Be++){const Pe=Se[Be],Ze=Ee[Pe.materialIndex];Ze&&Ze.visible&&S.push(E,me,Ze,q,Ie.z,Pe)}}else Ee.visible&&S.push(E,me,Ee,q,Ie.z,null)}}const re=E.children;for(let me=0,Ee=re.length;me<Ee;me++)Ds(re[me],O,q,Y)}function To(E,O,q,Y){const{opaque:z,transmissive:re,transparent:me}=E;y.setupLightsView(q),j===!0&&be.setGlobalState(b.clippingPlanes,q),Y&&xe.viewport(F.copy(Y)),z.length>0&&zi(z,O,q),re.length>0&&zi(re,O,q),me.length>0&&zi(me,O,q),xe.buffers.depth.setTest(!0),xe.buffers.depth.setMask(!0),xe.buffers.color.setMask(!0),xe.setPolygonOffset(!1)}function Ao(E,O,q,Y){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;y.state.transmissionRenderTarget[Y.id]===void 0&&(y.state.transmissionRenderTarget[Y.id]=new Pn(1,1,{generateMipmaps:!0,type:Ce.has("EXT_color_buffer_half_float")||Ce.has("EXT_color_buffer_float")?gi:ln,minFilter:Wn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:nt.workingColorSpace}));const re=y.state.transmissionRenderTarget[Y.id],me=Y.viewport||F;re.setSize(me.z*b.transmissionResolutionScale,me.w*b.transmissionResolutionScale);const Ee=b.getRenderTarget(),Se=b.getActiveCubeFace(),Be=b.getActiveMipmapLevel();b.setRenderTarget(re),b.getClearColor(W),Z=b.getClearAlpha(),Z<1&&b.setClearColor(16777215,.5),b.clear(),Ne&&oe.render(q);const Ge=b.toneMapping;b.toneMapping=Cn;const Pe=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),y.setupLightsView(Y),j===!0&&be.setGlobalState(b.clippingPlanes,Y),zi(E,q,Y),Fe.updateMultisampleRenderTarget(re),Fe.updateRenderTargetMipmap(re),Ce.has("WEBGL_multisampled_render_to_texture")===!1){let Ze=!1;for(let lt=0,gt=O.length;lt<gt;lt++){const xt=O[lt],{object:ht,geometry:Ue,material:pt,group:tt}=xt;if(pt.side===Vt&&ht.layers.test(Y.layers)){const kt=pt.side;pt.side=Pt,pt.needsUpdate=!0,Ro(ht,q,Y,Ue,pt,tt),pt.side=kt,pt.needsUpdate=!0,Ze=!0}}Ze===!0&&(Fe.updateMultisampleRenderTarget(re),Fe.updateRenderTargetMipmap(re))}b.setRenderTarget(Ee,Se,Be),b.setClearColor(W,Z),Pe!==void 0&&(Y.viewport=Pe),b.toneMapping=Ge}function zi(E,O,q){const Y=O.isScene===!0?O.overrideMaterial:null;for(let z=0,re=E.length;z<re;z++){const me=E[z],{object:Ee,geometry:Se,group:Be}=me;let Ge=me.material;Ge.allowOverride===!0&&Y!==null&&(Ge=Y),Ee.layers.test(q.layers)&&Ro(Ee,O,q,Se,Ge,Be)}}function Ro(E,O,q,Y,z,re){E.onBeforeRender(b,O,q,Y,z,re),E.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),z.onBeforeRender(b,O,q,Y,E,re),z.transparent===!0&&z.side===Vt&&z.forceSinglePass===!1?(z.side=Pt,z.needsUpdate=!0,b.renderBufferDirect(q,O,Y,z,E,re),z.side=Dn,z.needsUpdate=!0,b.renderBufferDirect(q,O,Y,z,E,re),z.side=Vt):b.renderBufferDirect(q,O,Y,z,E,re),E.onAfterRender(b,O,q,Y,z,re)}function Gi(E,O,q){O.isScene!==!0&&(O=it);const Y=Ae.get(E),z=y.state.lights,re=y.state.shadowsArray,me=z.state.version,Ee=$.getParameters(E,z.state,re,O,q),Se=$.getProgramCacheKey(Ee);let Be=Y.programs;Y.environment=E.isMeshStandardMaterial?O.environment:null,Y.fog=O.fog,Y.envMap=(E.isMeshStandardMaterial?M:C).get(E.envMap||Y.environment),Y.envMapRotation=Y.environment!==null&&E.envMap===null?O.environmentRotation:E.envMapRotation,Be===void 0&&(E.addEventListener("dispose",We),Be=new Map,Y.programs=Be);let Ge=Be.get(Se);if(Ge!==void 0){if(Y.currentProgram===Ge&&Y.lightsStateVersion===me)return Co(E,Ee),Ge}else Ee.uniforms=$.getUniforms(E),E.onBeforeCompile(Ee,b),Ge=$.acquireProgram(Ee,Se),Be.set(Se,Ge),Y.uniforms=Ee.uniforms;const Pe=Y.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Pe.clippingPlanes=be.uniform),Co(E,Ee),Y.needsLights=ml(E),Y.lightsStateVersion=me,Y.needsLights&&(Pe.ambientLightColor.value=z.state.ambient,Pe.lightProbe.value=z.state.probe,Pe.directionalLights.value=z.state.directional,Pe.directionalLightShadows.value=z.state.directionalShadow,Pe.spotLights.value=z.state.spot,Pe.spotLightShadows.value=z.state.spotShadow,Pe.rectAreaLights.value=z.state.rectArea,Pe.ltc_1.value=z.state.rectAreaLTC1,Pe.ltc_2.value=z.state.rectAreaLTC2,Pe.pointLights.value=z.state.point,Pe.pointLightShadows.value=z.state.pointShadow,Pe.hemisphereLights.value=z.state.hemi,Pe.directionalShadowMap.value=z.state.directionalShadowMap,Pe.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Pe.spotShadowMap.value=z.state.spotShadowMap,Pe.spotLightMatrix.value=z.state.spotLightMatrix,Pe.spotLightMap.value=z.state.spotLightMap,Pe.pointShadowMap.value=z.state.pointShadowMap,Pe.pointShadowMatrix.value=z.state.pointShadowMatrix),Y.currentProgram=Ge,Y.uniformsList=null,Ge}function wo(E){if(E.uniformsList===null){const O=E.currentProgram.getUniforms();E.uniformsList=xs.seqWithValue(O.seq,E.uniforms)}return E.uniformsList}function Co(E,O){const q=Ae.get(E);q.outputColorSpace=O.outputColorSpace,q.batching=O.batching,q.batchingColor=O.batchingColor,q.instancing=O.instancing,q.instancingColor=O.instancingColor,q.instancingMorph=O.instancingMorph,q.skinning=O.skinning,q.morphTargets=O.morphTargets,q.morphNormals=O.morphNormals,q.morphColors=O.morphColors,q.morphTargetsCount=O.morphTargetsCount,q.numClippingPlanes=O.numClippingPlanes,q.numIntersection=O.numClipIntersection,q.vertexAlphas=O.vertexAlphas,q.vertexTangents=O.vertexTangents,q.toneMapping=O.toneMapping}function fl(E,O,q,Y,z){O.isScene!==!0&&(O=it),Fe.resetTextureUnits();const re=O.fog,me=Y.isMeshStandardMaterial?O.environment:null,Ee=_===null?b.outputColorSpace:_.isXRRenderTarget===!0?_.texture.colorSpace:fi,Se=(Y.isMeshStandardMaterial?M:C).get(Y.envMap||me),Be=Y.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Ge=!!q.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Pe=!!q.morphAttributes.position,Ze=!!q.morphAttributes.normal,lt=!!q.morphAttributes.color;let gt=Cn;Y.toneMapped&&(_===null||_.isXRRenderTarget===!0)&&(gt=b.toneMapping);const xt=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,ht=xt!==void 0?xt.length:0,Ue=Ae.get(Y),pt=y.state.lights;if(j===!0&&(fe===!0||E!==I)){const Lt=E===I&&Y.id===D;be.setState(Y,E,Lt)}let tt=!1;Y.version===Ue.__version?(Ue.needsLights&&Ue.lightsStateVersion!==pt.state.version||Ue.outputColorSpace!==Ee||z.isBatchedMesh&&Ue.batching===!1||!z.isBatchedMesh&&Ue.batching===!0||z.isBatchedMesh&&Ue.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&Ue.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&Ue.instancing===!1||!z.isInstancedMesh&&Ue.instancing===!0||z.isSkinnedMesh&&Ue.skinning===!1||!z.isSkinnedMesh&&Ue.skinning===!0||z.isInstancedMesh&&Ue.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Ue.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&Ue.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&Ue.instancingMorph===!1&&z.morphTexture!==null||Ue.envMap!==Se||Y.fog===!0&&Ue.fog!==re||Ue.numClippingPlanes!==void 0&&(Ue.numClippingPlanes!==be.numPlanes||Ue.numIntersection!==be.numIntersection)||Ue.vertexAlphas!==Be||Ue.vertexTangents!==Ge||Ue.morphTargets!==Pe||Ue.morphNormals!==Ze||Ue.morphColors!==lt||Ue.toneMapping!==gt||Ue.morphTargetsCount!==ht)&&(tt=!0):(tt=!0,Ue.__version=Y.version);let kt=Ue.currentProgram;tt===!0&&(kt=Gi(Y,O,z));let qn=!1,Bt=!1,Si=!1;const mt=kt.getUniforms(),Ut=Ue.uniforms;if(xe.useProgram(kt.program)&&(qn=!0,Bt=!0,Si=!0),Y.id!==D&&(D=Y.id,Bt=!0),qn||I!==E){xe.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),mt.setValue(P,"projectionMatrix",E.projectionMatrix),mt.setValue(P,"viewMatrix",E.matrixWorldInverse);const Nt=mt.map.cameraPosition;Nt!==void 0&&Nt.setValue(P,ye.setFromMatrixPosition(E.matrixWorld)),ke.logarithmicDepthBuffer&&mt.setValue(P,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&mt.setValue(P,"isOrthographic",E.isOrthographicCamera===!0),I!==E&&(I=E,Bt=!0,Si=!0)}if(z.isSkinnedMesh){mt.setOptional(P,z,"bindMatrix"),mt.setOptional(P,z,"bindMatrixInverse");const Lt=z.skeleton;Lt&&(Lt.boneTexture===null&&Lt.computeBoneTexture(),mt.setValue(P,"boneTexture",Lt.boneTexture,Fe))}z.isBatchedMesh&&(mt.setOptional(P,z,"batchingTexture"),mt.setValue(P,"batchingTexture",z._matricesTexture,Fe),mt.setOptional(P,z,"batchingIdTexture"),mt.setValue(P,"batchingIdTexture",z._indirectTexture,Fe),mt.setOptional(P,z,"batchingColorTexture"),z._colorsTexture!==null&&mt.setValue(P,"batchingColorTexture",z._colorsTexture,Fe));const Xt=q.morphAttributes;if((Xt.position!==void 0||Xt.normal!==void 0||Xt.color!==void 0)&&ze.update(z,q,kt),(Bt||Ue.receiveShadow!==z.receiveShadow)&&(Ue.receiveShadow=z.receiveShadow,mt.setValue(P,"receiveShadow",z.receiveShadow)),Y.isMeshGouraudMaterial&&Y.envMap!==null&&(Ut.envMap.value=Se,Ut.flipEnvMap.value=Se.isCubeTexture&&Se.isRenderTargetTexture===!1?-1:1),Y.isMeshStandardMaterial&&Y.envMap===null&&O.environment!==null&&(Ut.envMapIntensity.value=O.environmentIntensity),Ut.dfgLUT!==void 0&&(Ut.dfgLUT.value=Hp()),Bt&&(mt.setValue(P,"toneMappingExposure",b.toneMappingExposure),Ue.needsLights&&pl(Ut,Si),re&&Y.fog===!0&&Te.refreshFogUniforms(Ut,re),Te.refreshMaterialUniforms(Ut,Y,ne,te,y.state.transmissionRenderTarget[E.id]),xs.upload(P,wo(Ue),Ut,Fe)),Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(xs.upload(P,wo(Ue),Ut,Fe),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&mt.setValue(P,"center",z.center),mt.setValue(P,"modelViewMatrix",z.modelViewMatrix),mt.setValue(P,"normalMatrix",z.normalMatrix),mt.setValue(P,"modelMatrix",z.matrixWorld),Y.isShaderMaterial||Y.isRawShaderMaterial){const Lt=Y.uniformsGroups;for(let Nt=0,Ps=Lt.length;Nt<Ps;Nt++){const In=Lt[Nt];de.update(In,kt),de.bind(In,kt)}}return kt}function pl(E,O){E.ambientLightColor.needsUpdate=O,E.lightProbe.needsUpdate=O,E.directionalLights.needsUpdate=O,E.directionalLightShadows.needsUpdate=O,E.pointLights.needsUpdate=O,E.pointLightShadows.needsUpdate=O,E.spotLights.needsUpdate=O,E.spotLightShadows.needsUpdate=O,E.rectAreaLights.needsUpdate=O,E.hemisphereLights.needsUpdate=O}function ml(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return v},this.getRenderTarget=function(){return _},this.setRenderTargetTextures=function(E,O,q){const Y=Ae.get(E);Y.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),Ae.get(E.texture).__webglTexture=O,Ae.get(E.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:q,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,O){const q=Ae.get(E);q.__webglFramebuffer=O,q.__useDefaultFramebuffer=O===void 0};const gl=P.createFramebuffer();this.setRenderTarget=function(E,O=0,q=0){_=E,w=O,v=q;let Y=!0,z=null,re=!1,me=!1;if(E){const Se=Ae.get(E);if(Se.__useDefaultFramebuffer!==void 0)xe.bindFramebuffer(P.FRAMEBUFFER,null),Y=!1;else if(Se.__webglFramebuffer===void 0)Fe.setupRenderTarget(E);else if(Se.__hasExternalTextures)Fe.rebindTextures(E,Ae.get(E.texture).__webglTexture,Ae.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Pe=E.depthTexture;if(Se.__boundDepthTexture!==Pe){if(Pe!==null&&Ae.has(Pe)&&(E.width!==Pe.image.width||E.height!==Pe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Fe.setupDepthRenderbuffer(E)}}const Be=E.texture;(Be.isData3DTexture||Be.isDataArrayTexture||Be.isCompressedArrayTexture)&&(me=!0);const Ge=Ae.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Ge[O])?z=Ge[O][q]:z=Ge[O],re=!0):E.samples>0&&Fe.useMultisampledRTT(E)===!1?z=Ae.get(E).__webglMultisampledFramebuffer:Array.isArray(Ge)?z=Ge[q]:z=Ge,F.copy(E.viewport),B.copy(E.scissor),G=E.scissorTest}else F.copy(Ve).multiplyScalar(ne).floor(),B.copy(Ke).multiplyScalar(ne).floor(),G=je;if(q!==0&&(z=gl),xe.bindFramebuffer(P.FRAMEBUFFER,z)&&Y&&xe.drawBuffers(E,z),xe.viewport(F),xe.scissor(B),xe.setScissorTest(G),re){const Se=Ae.get(E.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+O,Se.__webglTexture,q)}else if(me){const Se=O;for(let Be=0;Be<E.textures.length;Be++){const Ge=Ae.get(E.textures[Be]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+Be,Ge.__webglTexture,q,Se)}}else if(E!==null&&q!==0){const Se=Ae.get(E.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Se.__webglTexture,q)}D=-1},this.readRenderTargetPixels=function(E,O,q,Y,z,re,me,Ee=0){if(!(E&&E.isWebGLRenderTarget)){_t("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=Ae.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&me!==void 0&&(Se=Se[me]),Se){xe.bindFramebuffer(P.FRAMEBUFFER,Se);try{const Be=E.textures[Ee],Ge=Be.format,Pe=Be.type;if(!ke.textureFormatReadable(Ge)){_t("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ke.textureTypeReadable(Pe)){_t("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=E.width-Y&&q>=0&&q<=E.height-z&&(E.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+Ee),P.readPixels(O,q,Y,z,He.convert(Ge),He.convert(Pe),re))}finally{const Be=_!==null?Ae.get(_).__webglFramebuffer:null;xe.bindFramebuffer(P.FRAMEBUFFER,Be)}}},this.readRenderTargetPixelsAsync=async function(E,O,q,Y,z,re,me,Ee=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=Ae.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&me!==void 0&&(Se=Se[me]),Se)if(O>=0&&O<=E.width-Y&&q>=0&&q<=E.height-z){xe.bindFramebuffer(P.FRAMEBUFFER,Se);const Be=E.textures[Ee],Ge=Be.format,Pe=Be.type;if(!ke.textureFormatReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ke.textureTypeReadable(Pe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ze=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Ze),P.bufferData(P.PIXEL_PACK_BUFFER,re.byteLength,P.STREAM_READ),E.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+Ee),P.readPixels(O,q,Y,z,He.convert(Ge),He.convert(Pe),0);const lt=_!==null?Ae.get(_).__webglFramebuffer:null;xe.bindFramebuffer(P.FRAMEBUFFER,lt);const gt=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await lc(P,gt,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Ze),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,re),P.deleteBuffer(Ze),P.deleteSync(gt),re}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,O=null,q=0){const Y=Math.pow(2,-q),z=Math.floor(E.image.width*Y),re=Math.floor(E.image.height*Y),me=O!==null?O.x:0,Ee=O!==null?O.y:0;Fe.setTexture2D(E,0),P.copyTexSubImage2D(P.TEXTURE_2D,q,0,0,me,Ee,z,re),xe.unbindTexture()};const xl=P.createFramebuffer(),_l=P.createFramebuffer();this.copyTextureToTexture=function(E,O,q=null,Y=null,z=0,re=null){re===null&&(z!==0?(Ni("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),re=z,z=0):re=0);let me,Ee,Se,Be,Ge,Pe,Ze,lt,gt;const xt=E.isCompressedTexture?E.mipmaps[re]:E.image;if(q!==null)me=q.max.x-q.min.x,Ee=q.max.y-q.min.y,Se=q.isBox3?q.max.z-q.min.z:1,Be=q.min.x,Ge=q.min.y,Pe=q.isBox3?q.min.z:0;else{const Xt=Math.pow(2,-z);me=Math.floor(xt.width*Xt),Ee=Math.floor(xt.height*Xt),E.isDataArrayTexture?Se=xt.depth:E.isData3DTexture?Se=Math.floor(xt.depth*Xt):Se=1,Be=0,Ge=0,Pe=0}Y!==null?(Ze=Y.x,lt=Y.y,gt=Y.z):(Ze=0,lt=0,gt=0);const ht=He.convert(O.format),Ue=He.convert(O.type);let pt;O.isData3DTexture?(Fe.setTexture3D(O,0),pt=P.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(Fe.setTexture2DArray(O,0),pt=P.TEXTURE_2D_ARRAY):(Fe.setTexture2D(O,0),pt=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,O.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,O.unpackAlignment);const tt=P.getParameter(P.UNPACK_ROW_LENGTH),kt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),qn=P.getParameter(P.UNPACK_SKIP_PIXELS),Bt=P.getParameter(P.UNPACK_SKIP_ROWS),Si=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,xt.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,xt.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Be),P.pixelStorei(P.UNPACK_SKIP_ROWS,Ge),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Pe);const mt=E.isDataArrayTexture||E.isData3DTexture,Ut=O.isDataArrayTexture||O.isData3DTexture;if(E.isDepthTexture){const Xt=Ae.get(E),Lt=Ae.get(O),Nt=Ae.get(Xt.__renderTarget),Ps=Ae.get(Lt.__renderTarget);xe.bindFramebuffer(P.READ_FRAMEBUFFER,Nt.__webglFramebuffer),xe.bindFramebuffer(P.DRAW_FRAMEBUFFER,Ps.__webglFramebuffer);for(let In=0;In<Se;In++)mt&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Ae.get(E).__webglTexture,z,Pe+In),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Ae.get(O).__webglTexture,re,gt+In)),P.blitFramebuffer(Be,Ge,me,Ee,Ze,lt,me,Ee,P.DEPTH_BUFFER_BIT,P.NEAREST);xe.bindFramebuffer(P.READ_FRAMEBUFFER,null),xe.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(z!==0||E.isRenderTargetTexture||Ae.has(E)){const Xt=Ae.get(E),Lt=Ae.get(O);xe.bindFramebuffer(P.READ_FRAMEBUFFER,xl),xe.bindFramebuffer(P.DRAW_FRAMEBUFFER,_l);for(let Nt=0;Nt<Se;Nt++)mt?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Xt.__webglTexture,z,Pe+Nt):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Xt.__webglTexture,z),Ut?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,Lt.__webglTexture,re,gt+Nt):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Lt.__webglTexture,re),z!==0?P.blitFramebuffer(Be,Ge,me,Ee,Ze,lt,me,Ee,P.COLOR_BUFFER_BIT,P.NEAREST):Ut?P.copyTexSubImage3D(pt,re,Ze,lt,gt+Nt,Be,Ge,me,Ee):P.copyTexSubImage2D(pt,re,Ze,lt,Be,Ge,me,Ee);xe.bindFramebuffer(P.READ_FRAMEBUFFER,null),xe.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else Ut?E.isDataTexture||E.isData3DTexture?P.texSubImage3D(pt,re,Ze,lt,gt,me,Ee,Se,ht,Ue,xt.data):O.isCompressedArrayTexture?P.compressedTexSubImage3D(pt,re,Ze,lt,gt,me,Ee,Se,ht,xt.data):P.texSubImage3D(pt,re,Ze,lt,gt,me,Ee,Se,ht,Ue,xt):E.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,re,Ze,lt,me,Ee,ht,Ue,xt.data):E.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,re,Ze,lt,xt.width,xt.height,ht,xt.data):P.texSubImage2D(P.TEXTURE_2D,re,Ze,lt,me,Ee,ht,Ue,xt);P.pixelStorei(P.UNPACK_ROW_LENGTH,tt),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,kt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,qn),P.pixelStorei(P.UNPACK_SKIP_ROWS,Bt),P.pixelStorei(P.UNPACK_SKIP_IMAGES,Si),re===0&&O.generateMipmaps&&P.generateMipmap(pt),xe.unbindTexture()},this.initRenderTarget=function(E){Ae.get(E).__webglFramebuffer===void 0&&Fe.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?Fe.setTextureCube(E,0):E.isData3DTexture?Fe.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?Fe.setTexture2DArray(E,0):Fe.setTexture2D(E,0),xe.unbindTexture()},this.resetState=function(){w=0,v=0,_=null,xe.reset(),U.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return on}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=nt._getDrawingBufferColorSpace(e),t.unpackColorSpace=nt._getUnpackColorSpace()}}const V={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:2.4,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:2,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:6};var Wp=`varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Xp=`precision highp float;

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
}`;const Vn=class Vn{constructor(){N(this,"sections",new Map);N(this,"enabled",!1);N(this,"sampleWindow",60);N(this,"displayElement",null);N(this,"lastUpdateTime",0);N(this,"updateInterval",200);N(this,"spikeLoggingEnabled",!0);N(this,"frameSpikeThresholdMs",50);N(this,"lastFrameStartTime",0);N(this,"frameSections",new Map);N(this,"oneTimeOperations",[]);N(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return Vn.instance||(Vn.instance=new Vn),Vn.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
`);console.warn(`[FRAME SPIKE] Total: ${e.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)
Breakdown:
${t}`)}}logOneTimeOperation(e,t){this.oneTimeOperations.push({name:e,time:t,timestamp:performance.now()}),console.log(`[ONE-TIME] ${e}: ${t.toFixed(2)}ms`)}measureOneTime(e,t){const n=performance.now(),i=t(),r=performance.now()-n;return this.logOneTimeOperation(e,r),i}async measureOneTimeAsync(e,t){const n=performance.now(),i=await t(),r=performance.now()-n;return this.logOneTimeOperation(e,r),i}begin(e){this.sections.has(e)||this.sections.set(e,{startTime:0,samples:[],callCount:0});const t=this.sections.get(e);t.startTime=performance.now()}end(e){const t=this.sections.get(e);if(!t||t.startTime===0)return;const n=performance.now()-t.startTime;if(this.spikeLoggingEnabled){const i=this.frameSections.get(e)??0;this.frameSections.set(e,i+n)}this.enabled&&(t.samples.push(n),t.callCount++,t.samples.length>this.sampleWindow&&t.samples.shift()),t.startTime=0}wrap(e,t){this.begin(e);const n=t();return this.end(e),n}getMetrics(){const e=[];for(const[t,n]of this.sections){if(n.samples.length===0)continue;const i=n.samples,r=i[i.length-1],o=i.reduce((c,h)=>c+h,0)/i.length,a=Math.max(...i),l=Math.min(...i);e.push({name:t,lastTime:r,avgTime:o,maxTime:a,minTime:l,callCount:n.callCount})}return e.sort((t,n)=>n.avgTime-t.avgTime),e}createDisplay(){this.displayElement||(this.displayElement=document.createElement("div"),this.displayElement.id="profiler-display",this.displayElement.style.cssText=`
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
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let r="<b>PROFILER (F3 to toggle)</b><br>";r+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let h="#0f0";c.avgTime>5?h="#f44":c.avgTime>1&&(h="#ff0");const u=i>0?(c.avgTime/i*100).toFixed(0):"0",f=c.avgTime.toFixed(2).padStart(6),d=c.maxTime.toFixed(2).padStart(6),g=u.padStart(3);r+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,r+=`<span style="color:#aaa">${f}ms</span>`,r+=`<span style="color:#666"> max:${d}ms</span>`,c.name!=="Frame Total"&&(r+=`<span style="color:#888"> ${g}%</span>`),r+="<br>"}const o=window.__gameRenderer,a=window.__gameScene;if(o!=null&&o.info){r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#88f">GPU Stats</b><br>';const c=o.info.render.calls;let h="#0f0";c>500?h="#f44":c>100&&(h="#ff0");const u=o.info.render.triangles;let f="#0f0";u>5e5?f="#f44":u>1e5&&(f="#ff0"),r+=`<span style="color:${h}">Draw Calls: ${c}</span><br>`,r+=`<span style="color:${f}">Triangles: ${u.toLocaleString()}</span><br>`,r+=`<span style="color:#88f">Geometries: ${o.info.memory.geometries}</span><br>`,r+=`<span style="color:#88f">Textures: ${o.info.memory.textures}</span><br>`,o.info.programs&&(r+=`<span style="color:#88f">Shader Programs: ${o.info.programs.length}</span><br>`)}if(a){let c=0,h=0,u=0,f=0;a.traverse(d=>{d.isMesh&&(c++,d.visible&&h++),d.isGroup&&u++,d.isLight&&f++}),r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#a8f">Scene Stats</b><br>',r+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,r+=`<span style="color:#a8f">Visible Meshes: ${h}</span><br>`,r+=`<span style="color:#a8f">Groups: ${u}</span><br>`,r+=`<span style="color:#a8f">Lights: ${f}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const h=((l-c.timestamp)/1e3).toFixed(1);let u="#f80";c.time>100?u="#f44":c.time>50&&(u="#ff0"),r+=`<span style="color:${u}">${c.name.padEnd(20)}</span>`,r+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,r+=`<span style="color:#666"> (${h}s ago)</span><br>`}}this.displayElement.innerHTML=r}reset(){this.sections.clear()}};N(Vn,"instance");let io=Vn;const ge=io.getInstance();function ul(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class qp{constructor(){N(this,"keys",new Set);N(this,"keysJustPressed",new Set);N(this,"mouseMovement",{x:0,y:0});N(this,"mouseButtons",{left:!1,right:!1});N(this,"isPointerLocked",!1);N(this,"onPointerLockChange");N(this,"onInventoryToggle");N(this,"isMobile");N(this,"mobileGameActive",!1);N(this,"touchLookMovement",{x:0,y:0});N(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});N(this,"touchJump",!1);N(this,"touchJumpJustPressed",!1);N(this,"touchCrouch",!1);N(this,"touchLeftClick",!1);N(this,"touchRightClick",!1);N(this,"moveJoystickTouch",null);N(this,"lookJoystickTouch",null);N(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=ul(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
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
        <!-- Right action buttons: Jump/Down/Inventory -->
        <div id="right-buttons">
          <button id="btn-jump" class="action-btn">JUMP</button>
          <button id="btn-crouch" class="action-btn">DOWN</button>
          <button id="btn-inventory" class="action-btn inventory">INV</button>
        </div>
        <!-- Right joystick for looking around -->
        <div id="look-joystick" class="joystick-container">
          <div class="joystick-base">
            <div class="joystick-thumb"></div>
          </div>
        </div>
      </div>
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(o=>o.style.display="none");const r=document.createElement("p");r.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",r.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(r)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),r=document.getElementById("btn-break"),o=document.getElementById("btn-place");if(e){const l=e.querySelector(".joystick-base"),c=e.querySelector(".joystick-thumb"),h=35,u=d=>{const g=l.getBoundingClientRect(),x=g.left+g.width/2,m=g.top+g.height/2,p=d.clientX-x,S=d.clientY-m,y=Math.sqrt(p*p+S*S),T=Math.min(y,h),A=Math.atan2(S,p),b=Math.cos(A)*T,R=Math.sin(A)*T;c.style.transform=`translate(${b}px, ${R}px)`;const w=b/h,v=R/h,_=.2;this.touchMoveInput.forward=v<-_,this.touchMoveInput.backward=v>_,this.touchMoveInput.left=w<-_,this.touchMoveInput.right=w>_};e.addEventListener("touchstart",d=>{d.preventDefault();const g=d.changedTouches[0];this.moveJoystickTouch={id:g.identifier,startX:0,startY:0},u(g)},{passive:!1}),e.addEventListener("touchmove",d=>{if(d.preventDefault(),!!this.moveJoystickTouch)for(let g=0;g<d.touches.length;g++){const x=d.touches[g];if(x.identifier===this.moveJoystickTouch.id){u(x);break}}},{passive:!1});const f=d=>{for(let g=0;g<d.changedTouches.length;g++)if(this.moveJoystickTouch&&d.changedTouches[g].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,c.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",f),e.addEventListener("touchcancel",f)}if(t){const l=t.querySelector(".joystick-base"),c=t.querySelector(".joystick-thumb"),h=35,u=d=>{const g=l.getBoundingClientRect(),x=g.left+g.width/2,m=g.top+g.height/2,p=d.clientX-x,S=d.clientY-m,y=Math.sqrt(p*p+S*S),T=Math.min(y,h),A=Math.atan2(S,p),b=Math.cos(A)*T,R=Math.sin(A)*T;c.style.transform=`translate(${b}px, ${R}px)`;const w=b/h,v=R/h,_=.15;Math.abs(w)>_||Math.abs(v)>_?(this.lookJoystickPosition.x=w,this.lookJoystickPosition.y=v):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",d=>{d.preventDefault();const g=d.changedTouches[0];this.lookJoystickTouch={id:g.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",d=>{if(d.preventDefault(),!!this.lookJoystickTouch)for(let g=0;g<d.touches.length;g++){const x=d.touches[g];if(x.identifier===this.lookJoystickTouch.id){u(x);break}}},{passive:!1});const f=d=>{for(let g=0;g<d.changedTouches.length;g++)if(this.lookJoystickTouch&&d.changedTouches[g].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},c.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",f),t.addEventListener("touchcancel",f)}n&&(n.addEventListener("touchstart",l=>{l.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",l=>{l.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",l=>{l.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",l=>{l.preventDefault(),this.touchCrouch=!1},{passive:!1})),r&&(r.addEventListener("touchstart",l=>{l.preventDefault(),this.touchLeftClick=!0},{passive:!1}),r.addEventListener("touchend",l=>{l.preventDefault(),this.touchLeftClick=!1},{passive:!1})),o&&(o.addEventListener("touchstart",l=>{l.preventDefault(),this.touchRightClick=!0},{passive:!1}),o.addEventListener("touchend",l=>{l.preventDefault(),this.touchRightClick=!1},{passive:!1}));const a=document.getElementById("btn-inventory");a&&a.addEventListener("touchstart",l=>{l.preventDefault(),this.onInventoryToggle&&this.onInventoryToggle()},{passive:!1})}setPointerLockCallback(e){this.onPointerLockChange=e}setInventoryToggleCallback(e){this.onInventoryToggle=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyE"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}}function Yp(){return new Tt({uniforms:{time:{value:0}},vertexShader:Wp,fragmentShader:Xp,side:Pt})}class $p{constructor(e){N(this,"scene");N(this,"camera");N(this,"renderer");N(this,"sunDirection");N(this,"clock");N(this,"frameCount",0);N(this,"lastFpsUpdate",0);N(this,"currentFps",0);N(this,"sunMesh",null);N(this,"starfield",null);N(this,"isUnderwater",!1);N(this,"underwaterFog",null);N(this,"depthRenderTarget",null);N(this,"waterMaterials",[]);N(this,"isMobile");N(this,"updateCallbacks",[]);N(this,"animate",()=>{requestAnimationFrame(this.animate),ge.beginFrame(),ge.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}ge.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(ge.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),ge.begin("Render"),this.depthRenderTarget&&this.waterMaterials.length>0){const n=[];this.scene.traverse(r=>{r instanceof Xe&&this.waterMaterials.includes(r.material)&&(n.push(r.visible),r.visible=!1)}),this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);let i=0;this.scene.traverse(r=>{r instanceof Xe&&this.waterMaterials.includes(r.material)&&(r.visible=n[i++])})}this.renderer.render(this.scene,this.camera),ge.end("Render"),ge.end("Frame Total"),ge.endFrame(),ge.updateDisplay()});this.isMobile=ul(),this.scene=new Uc,this.camera=new $t(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new Vp({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=ka,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new eh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),ge.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),ge.toggle())})}setupLighting(){this.sunDirection=new L(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize();const e=new Fi(900,64,64),t=Yp();this.starfield=new Xe(e,t),this.scene.add(this.starfield);const n=new Fi(60,32,32),i=new xo({color:16768324,fog:!1});this.sunMesh=new Xe(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const r=new Zc(16777215,V.AMBIENT_LIGHT_INTENSITY);this.scene.add(r);const o=new jc(16777215,V.DIRECTIONAL_LIGHT_INTENSITY);o.position.copy(this.sunDirection.clone().multiplyScalar(500)),o.castShadow=!0,o.shadow.mapSize.width=1024,o.shadow.mapSize.height=1024,o.shadow.camera.near=.5,o.shadow.camera.far=500,o.shadow.camera.left=-100,o.shadow.camera.right=100,o.shadow.camera.top=100,o.shadow.camera.bottom=-100,this.scene.add(o);const a=new $c(8900331,2236962,V.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(a)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e);this.depthRenderTarget=new Pn(t,n,{minFilter:Rt,magFilter:Rt,type:tn,depthBuffer:!0,depthTexture:new vo(t,n,tn)})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.includes(e)||(this.waterMaterials.push(e),this.updateWaterMaterialUniforms(e))}updateWaterMaterialUniforms(e){if(this.depthRenderTarget){const t=this.renderer.getPixelRatio();e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new et(window.innerWidth*t,window.innerHeight*t)},e.uniforms.useDepthFog={value:1}}else e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new Le(V.UNDERWATER_FOG_COLOR);this.underwaterFog=new _o(t,V.UNDERWATER_FOG_NEAR,V.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class La{constructor(e=50,t=3){N(this,"tiles",[]);N(this,"radius");N(this,"subdivisions");N(this,"vertexMap",new Map);N(this,"vertices",[]);N(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new L(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],r=this.vertices[t],o=new L().addVectors(i,r).multiplyScalar(.5).normalize().multiplyScalar(this.radius),a=this.vertices.length;return this.vertices.push(o),this.vertexMap.set(n,a),a}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),r=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,r]),e.push([t[1],i,n]),e.push([t[2],r,i]),e.push([n,i,r])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const r=this.faces[i];for(const o of r)e.get(o).push(i)}const t=[];for(const i of this.faces){const r=new L;for(const o of i)r.add(this.vertices[o]);r.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(r)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const r=e.get(i),o=r.length===5,a=[];for(const u of r)a.push(t[u].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(a,l);const c=Array.from(n.get(i)),h={index:i,center:l.clone(),vertices:a,neighbors:c,isPentagon:o};this.tiles.push(h)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new L(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const r=new L().crossVectors(n,i).normalize();i.crossVectors(r,n).normalize();const o=[];for(const a of e){const l=a.clone().sub(t),c=l.dot(i),h=l.dot(r);o.push({vertex:a,angle:Math.atan2(h,c)})}o.sort((a,l)=>a.angle-l.angle);for(let a=0;a<e.length;a++)e[a]=o[a].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const r of this.tiles){const o=r.center.distanceToSquared(t);o<i&&(i=o,n=r)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,r=i.center.distanceToSquared(n),o=!0;for(;o;){o=!1;for(const a of i.neighbors){const l=this.tiles[a],c=l.center.distanceToSquared(n);if(c<r){i=l,r=c,o=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function Rn(s){const e="/tenebris/";return s.startsWith("/")?e+s.slice(1):e+s}var Kp=`uniform float time;
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
}`,Jp=`precision highp float;

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
}`,hs=`uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float waterLevel; 

attribute float skyLight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSkyLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;

void main() {
  vUv = uv;
  vSkyLight = skyLight;

  
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  
  
  
  vNormal = normalize(normal);

  
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  
  
  float sunFacing = dot(surfaceDir, sunDirection);

  
  
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  
  float distFromCenter = length(worldPos.xyz - planetCenter);
  vWaterDepth = max(0.0, waterLevel - distFromCenter);

  
  vDistanceFromCamera = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,us=`precision highp float;

uniform sampler2D terrainTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;

uniform float isUnderwater; 
uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;
uniform float underwaterDimming; 

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSkyLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;

void main() {
  
  vec4 texColor = texture2D(terrainTexture, vUv);

  
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  
  
  float directional = meshDiffuse * vSunBrightness * directionalIntensity * vSkyLight;

  
  
  
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness); 
  float ambient = ambientIntensity * ambientDayNight * vSkyLight;

  
  float lighting = ambient + directional;
  vec3 finalColor = texColor.rgb * lighting;

  
  if (vWaterDepth > 0.0) {
    
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);
    finalColor *= depthDimFactor;

    
    float tintFactor = 1.0 - depthDimFactor;
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);
  }

  
  if (isUnderwater > 0.5) {
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}`,k=(s=>(s[s.AIR=0]="AIR",s[s.STONE=1]="STONE",s[s.DIRT=2]="DIRT",s[s.GRASS=3]="GRASS",s[s.WATER=4]="WATER",s[s.SAND=5]="SAND",s[s.WOOD=6]="WOOD",s[s.LEAVES=7]="LEAVES",s))(k||{});function jp(s){return s!==0&&s!==4}function Zp(s){return s===4}class Qp{constructor(){N(this,"textureLoader");N(this,"textures",new Map);N(this,"materials",new Map);N(this,"waterShaderMaterial",null);N(this,"terrainMaterials",[]);N(this,"sunDirection",new L(1,.5,.3).normalize());N(this,"planetCenter",new L(0,0,0));this.textureLoader=new Yc}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=_=>{_.magFilter=Rt,_.minFilter=Rt,_.wrapS=Ci,_.wrapT=Ci},r=(_,D)=>{const I=_.clone();return I.needsUpdate=!0,new eo({map:I,color:D,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const _=await this.loadTexture(e);i(_),this.textures.set("primary",_);const D=new Le(V.UNDERWATER_FOG_COLOR),F=(W=>{const Z=new Tt({uniforms:{terrainTexture:{value:W},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:D},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:hs,fragmentShader:us});return this.terrainMaterials.push(Z),Z})(_);this.materials.set("top",F),this.materials.set("side",F),this.materials.set("bottom",F),this.materials.set("stone",F);const G=(W=>{const Z=new Tt({uniforms:{terrainTexture:{value:W},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:D},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:hs,fragmentShader:us,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(Z),Z})(_);this.materials.set("topLOD",G),this.materials.set("sideLOD",G),this.materials.set("waterLOD",r(_));return}const o=await this.loadTexture("/textures/rocks.png"),a=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png"),h=await this.loadTexture("/textures/wood.png"),u=await this.loadTexture("/textures/sand.png");[o,a,l,c,h,u].forEach(i),this.textures.set("stone",o),this.textures.set("dirt",a),this.textures.set("grass",l),this.textures.set("dirtGrass",c),this.textures.set("wood",h),this.textures.set("sand",u);const f=new Le(V.UNDERWATER_FOG_COLOR),d=_=>{const D=new Tt({uniforms:{terrainTexture:{value:_},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:f},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:hs,fragmentShader:us});return this.terrainMaterials.push(D),D};this.materials.set("top",d(l)),this.materials.set("side",d(a)),this.materials.set("grassSide",d(c)),this.materials.set("bottom",d(o)),this.materials.set("stone",d(o)),this.materials.set("wood",d(h)),this.materials.set("sand",d(u));const g=new Le(V.SEA_WALL_COLOR),x=document.createElement("canvas");x.width=1,x.height=1;const m=x.getContext("2d");m.fillStyle=`rgb(${Math.floor(g.r*255)}, ${Math.floor(g.g*255)}, ${Math.floor(g.b*255)})`,m.fillRect(0,0,1,1);const p=new Gc(x);p.needsUpdate=!0;const S=d(p);S.side=Vt,this.materials.set("seaWall",S);const y=await this.loadTexture("/textures/water.png");i(y),this.textures.set("water",y);const T=new Le(V.WATER_COLOR),A=new Le(V.WATER_DEEP_COLOR),b=new Le(V.UNDERWATER_FOG_COLOR),R=new Le(V.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new Tt({uniforms:{time:{value:0},waterTexture:{value:y},uvTiling:{value:V.WATER_UV_TILING},waterColor:{value:T},deepWaterColor:{value:A},sunDirection:{value:this.sunDirection.clone()},opacity:{value:V.WATER_TRANSPARENCY},fresnelPower:{value:V.WATER_FRESNEL_POWER},reflectionStrength:{value:V.WATER_REFLECTION_STRENGTH},distortionStrength:{value:V.WATER_DISTORTION_STRENGTH},specularPower:{value:V.WATER_SPECULAR_POWER},specularStrength:{value:V.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:V.WATER_WAVE_AMPLITUDE},waveFrequency:{value:V.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:b},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:R},aboveWaterFogNear:{value:V.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:V.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new L(0,0,0)},textureStrength:{value:V.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:V.WATER_SCROLL_SPEED},causticStrength:{value:V.WATER_CAUSTIC_STRENGTH},foamStrength:{value:V.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new et(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:Kp,fragmentShader:Jp,transparent:!0,side:Vt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const w=_=>{const D=_.clone();D.needsUpdate=!0;const I=new Tt({uniforms:{terrainTexture:{value:D},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:f},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:hs,fragmentShader:us});return I.polygonOffset=!0,I.polygonOffsetFactor=4,I.polygonOffsetUnits=4,this.terrainMaterials.push(I),I};this.materials.set("topLOD",w(l)),this.materials.set("sideLOD",w(a)),this.materials.set("stoneLOD",w(o)),this.materials.set("sandLOD",w(u)),this.materials.set("woodLOD",w(h));const v=r(y,T);v.side=Vt,v.transparent=!1,this.materials.set("waterLOD",v)}loadTexture(e){const t=Rn(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new eo({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getWoodMaterial(){return this.materials.get("wood")}getSandMaterial(){return this.materials.get("sand")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}getStoneLODMaterial(){return this.materials.get("stoneLOD")}getSandLODMaterial(){return this.materials.get("sandLOD")}getWoodLODMaterial(){return this.materials.get("woodLOD")}createSeparateGeometries(e,t,n,i=new L(0,0,0),r=!0,o=!0,a=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),h=[],u=[];for(const b of e.vertices){const R=b.clone().sub(i).normalize();h.push(R.clone().multiplyScalar(t)),u.push(R.clone().multiplyScalar(n))}const f=c.clone().multiplyScalar(t),d=c.clone().multiplyScalar(n),g=c.clone();let x=new L(1,0,0);Math.abs(g.dot(x))>.9&&(x=new L(0,0,1));const m=new L().crossVectors(g,x).normalize();x=new L().crossVectors(m,g).normalize();let p=null,S=null,y=null;const T=.5,A=[];for(let b=0;b<l;b++){const R=b/l*Math.PI*2-Math.PI/2;A.push({u:.5+Math.cos(R)*T,v:.5+Math.sin(R)*T})}if(r){const b=[],R=[],w=[],v=[],_=c.clone();b.push(d.x,d.y,d.z),R.push(_.x,_.y,_.z),w.push(.5,.5);for(let D=0;D<l;D++){const I=u[D];b.push(I.x,I.y,I.z),R.push(_.x,_.y,_.z),w.push(A[D].u,A[D].v)}for(let D=0;D<l;D++){const I=(D+1)%l;v.push(0,1+D,1+I)}p=new rt,p.setAttribute("position",new _e(b,3)),p.setAttribute("normal",new _e(R,3)),p.setAttribute("uv",new _e(w,2)),p.setIndex(v)}if(o){const b=[],R=[],w=[],v=[],_=c.clone().negate();b.push(f.x,f.y,f.z),R.push(_.x,_.y,_.z),w.push(.5,.5);for(let D=0;D<l;D++){const I=h[D];b.push(I.x,I.y,I.z),R.push(_.x,_.y,_.z),w.push(A[D].u,A[D].v)}for(let D=0;D<l;D++){const I=(D+1)%l;v.push(0,1+I,1+D)}S=new rt,S.setAttribute("position",new _e(b,3)),S.setAttribute("normal",new _e(R,3)),S.setAttribute("uv",new _e(w,2)),S.setIndex(v)}if(a){const b=[],R=[],w=[],v=[];let _=0;for(let D=0;D<l;D++){const I=(D+1)%l,F=u[D],B=u[I],G=h[D],W=h[I],Z=W.clone().sub(G),X=F.clone().sub(G),te=Z.clone().cross(X).normalize();b.push(G.x,G.y,G.z,W.x,W.y,W.z,B.x,B.y,B.z,F.x,F.y,F.z);for(let pe=0;pe<4;pe++)R.push(te.x,te.y,te.z);w.push(0,0,1,0,1,1,0,1);const ne=_;v.push(ne,ne+1,ne+2,ne,ne+2,ne+3),_+=4}y=new rt,y.setAttribute("position",new _e(b,3)),y.setAttribute("normal",new _e(R,3)),y.setAttribute("uv",new _e(w,2)),y.setIndex(v)}return{top:p,bottom:S,sides:y}}createHexPrismGeometry(e,t,n,i=new L(0,0,0),r=!0,o=!0,a=!0){const{top:l,bottom:c,sides:h}=this.createSeparateGeometries(e,t,n,i,r,o,a),u=[],f=[],d=[],g=[],x=[];let m=0;const p=(y,T)=>{if(!y)return;const A=y.getAttribute("position"),b=y.getAttribute("normal"),R=y.getAttribute("uv"),w=y.getIndex();if(!(!A||!b||!R||!w)){for(let v=0;v<A.count;v++)u.push(A.getX(v),A.getY(v),A.getZ(v)),f.push(b.getX(v),b.getY(v),b.getZ(v)),d.push(R.getX(v),R.getY(v));for(let v=0;v<w.count;v+=3)g.push(w.getX(v)+m,w.getX(v+1)+m,w.getX(v+2)+m),x.push(T);m+=A.count,y.dispose()}};p(l,"top"),p(c,"bottom"),p(h,"side");const S=new rt;return S.setAttribute("position",new _e(u,3)),S.setAttribute("normal",new _e(f,3)),S.setAttribute("uv",new _e(d,2)),S.setIndex(g),{geometry:S,faceTypes:x}}isSolid(e){return jp(e)}isLiquid(e){return Zp(e)}}function ur(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],indices:[],vertexOffset:0}}class Ia{constructor(e,t=50,n=3,i={}){N(this,"radius");N(this,"center");N(this,"polyhedron");N(this,"columns",new Map);N(this,"meshBuilder");N(this,"scene");N(this,"frustum",new Ts);N(this,"projScreenMatrix",new dt);N(this,"config");N(this,"lodChunks",[]);N(this,"lodChunkBounds",[]);N(this,"tileToChunk",new Map);N(this,"lodMesh",null);N(this,"lodWaterMesh",null);N(this,"lodTileVisibility",new Map);N(this,"needsLODRebuild",!1);N(this,"LOD_CHUNK_COUNT",12);N(this,"distantLODMeshes",[]);N(this,"currentDistantLODLevel",-1);N(this,"boundaryWallsGroup",null);N(this,"cachedRenderDistance",-1);N(this,"cachedNearbyTiles",new Set);N(this,"bufferCenterTiles",new Set);N(this,"pendingTilesToAdd",[]);N(this,"pendingTilesToRemove",[]);N(this,"isIncrementalRebuildActive",!1);N(this,"batchedMeshGroup",null);N(this,"needsRebatch",!0);N(this,"geometryWorker",null);N(this,"lodGeometryWorker",null);N(this,"isWorkerBuildActive",!1);N(this,"isLODWorkerBuildActive",!1);N(this,"isLODRebuildScheduled",!1);N(this,"isWaterWallsScheduled",!1);N(this,"needsWaterWallsRebuild",!1);N(this,"currentLODExcludedTileCount",0);N(this,"pendingLODExcludedCount",0);N(this,"cachedCameraDir",{x:0,y:1,z:0});N(this,"serializedTileData",null);N(this,"serializedTileToChunk",null);N(this,"BLOCK_HEIGHT",1);N(this,"MAX_DEPTH");N(this,"MAX_HEIGHT");N(this,"DEEP_THRESHOLD",4);N(this,"SEA_LEVEL");N(this,"seed");N(this,"sunDirection",new L(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize());N(this,"BLOCK_MATERIALS",[{key:"top",getMaterial:()=>this.meshBuilder.getTopMaterial()},{key:"side",getMaterial:()=>this.meshBuilder.getSideMaterial()},{key:"grassSide",getMaterial:()=>this.meshBuilder.getGrassSideMaterial()},{key:"stone",getMaterial:()=>this.meshBuilder.getStoneMaterial()},{key:"sand",getMaterial:()=>this.meshBuilder.getSandMaterial()},{key:"wood",getMaterial:()=>this.meshBuilder.getWoodMaterial()},{key:"water",getMaterial:()=>this.meshBuilder.getWaterMaterial(),renderOrder:1}]);N(this,"dirtyColumnsQueue",new Set);this.scene=e,this.radius=t,this.center=new L(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??V.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+V.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=V.TERRAIN_MAX_HEIGHT,this.seed=V.TERRAIN_SEED,this.polyhedron=new La(t,n),this.meshBuilder=new Qp}depthToRadius(e){return this.radius-(this.MAX_DEPTH-1-e)*this.BLOCK_HEIGHT}getSeaLevelDepth(){return this.MAX_DEPTH-1-this.SEA_LEVEL}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.depthToRadius(this.getSeaLevelDepth())-V.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new Wt,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2,t=[new L(-1,e,0).normalize(),new L(1,e,0).normalize(),new L(-1,-e,0).normalize(),new L(1,-e,0).normalize(),new L(0,-1,e).normalize(),new L(0,1,e).normalize(),new L(0,-1,-e).normalize(),new L(0,1,-e).normalize(),new L(e,0,-1).normalize(),new L(e,0,1).normalize(),new L(-e,0,-1).normalize(),new L(-e,0,1).normalize()];for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let r=0,o=1/0;for(let a=0;a<t.length;a++){const l=i.distanceToSquared(t[a]);l<o&&(o=l,r=a)}this.tileToChunk.set(n.index,r)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new Wt;this.lodChunks.push(i);const r=t[n].clone().multiplyScalar(this.radius).add(this.center),o=this.radius*.7;this.lodChunkBounds.push(new pi(r,o))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-p-M4JYg9.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;ge.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CZ0tWubb.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;ge.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;ge.begin("Planet.workerResult"),ge.begin("Planet.workerResult.createMeshes");const t=[],n=[{dataKey:"topData",materialKey:"top"},{dataKey:"sideData",materialKey:"side"},{dataKey:"grassSideData",materialKey:"grassSide"},{dataKey:"stoneData",materialKey:"stone"},{dataKey:"sandData",materialKey:"sand"},{dataKey:"woodData",materialKey:"wood"},{dataKey:"waterData",materialKey:"water",renderOrder:1}];for(const{dataKey:o,materialKey:a,renderOrder:l}of n){const c=e[o];if(c.positions.length>0){const h=this.createBufferGeometry(c),u=this.BLOCK_MATERIALS.find(f=>f.key===a);if(u){const f=new Xe(h,u.getMaterial());l!==void 0&&(f.renderOrder=l),t.push(f)}}}ge.end("Planet.workerResult.createMeshes"),ge.begin("Planet.workerResult.swap");const i=[];for(;this.batchedMeshGroup.children.length>0;){const o=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(o),i.push(o)}for(const o of t)this.batchedMeshGroup.add(o);for(const o of i)o.geometry&&o.geometry.dispose();ge.end("Planet.workerResult.swap"),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,ge.end("Planet.workerResult")}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(g=>{g instanceof Xe&&g.geometry&&g.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const g of this.lodChunks)for(;g.children.length>0;){const x=g.children[0];x instanceof Xe&&x.geometry&&x.geometry.dispose(),g.remove(x)}const i=performance.now()-n,r=new Wt,o=(g,x,m,p,S)=>{const y=new rt;return y.setAttribute("position",new Ot(new Float32Array(g),3)),y.setAttribute("normal",new Ot(new Float32Array(x),3)),y.setAttribute("uv",new Ot(new Float32Array(m),2)),S&&S.length>0&&y.setAttribute("skyLight",new Ot(new Float32Array(S),1)),y.setIndex(p),y},a=performance.now();let l=0,c=0;for(let g=0;g<this.LOD_CHUNK_COUNT;g++){const x=e.chunkGeometries[g];if(!x)continue;const m=this.lodChunks[g];if(x.grassPositions.length>0){const p=o(x.grassPositions,x.grassNormals,x.grassUvs,x.grassIndices,x.grassSkyLight),S=new Xe(p,this.meshBuilder.getTopLODMaterial());m.add(S),l++,c+=x.grassPositions.length/3}if(x.dirtPositions.length>0){const p=o(x.dirtPositions,x.dirtNormals,x.dirtUvs,x.dirtIndices,x.dirtSkyLight),S=new Xe(p,this.meshBuilder.getSideLODMaterial());m.add(S),l++,c+=x.dirtPositions.length/3}if(x.stonePositions.length>0){const p=o(x.stonePositions,x.stoneNormals,x.stoneUvs,x.stoneIndices,x.stoneSkyLight),S=new Xe(p,this.meshBuilder.getStoneLODMaterial());m.add(S),l++,c+=x.stonePositions.length/3}if(x.sandPositions.length>0){const p=o(x.sandPositions,x.sandNormals,x.sandUvs,x.sandIndices,x.sandSkyLight),S=new Xe(p,this.meshBuilder.getSandLODMaterial());m.add(S),l++,c+=x.sandPositions.length/3}if(x.woodPositions.length>0){const p=o(x.woodPositions,x.woodNormals,x.woodUvs,x.woodIndices,x.woodSkyLight),S=new Xe(p,this.meshBuilder.getWoodLODMaterial());m.add(S),l++,c+=x.woodPositions.length/3}if(x.waterPositions.length>0){const p=o(x.waterPositions,x.waterNormals,x.waterUvs,x.waterIndices),S=new Xe(p,this.meshBuilder.getWaterLODMaterial());S.renderOrder=-2,m.add(S),l++,c+=x.waterPositions.length/3}if(x.sidePositions.length>0){const p=o(x.sidePositions,x.sideNormals,x.sideUvs,x.sideIndices,x.sideSkyLight),S=new Xe(p,this.meshBuilder.getSideLODMaterial());m.add(S),l++,c+=x.sidePositions.length/3}if(x.waterSidePositions.length>0){const p=o(x.waterSidePositions,x.waterSideNormals,x.waterSideUvs,x.waterSideIndices),S=new Xe(p,this.meshBuilder.getWaterLODMaterial());S.renderOrder=-2,m.add(S),l++,c+=x.waterSidePositions.length/3}r.add(m)}const h=performance.now()-a,u=performance.now();r.position.copy(this.center),r.renderOrder=-1,this.scene.add(r),this.lodMesh=r;const f=performance.now()-u,d=performance.now()-t;console.log(`[LOD Build] Total: ${d.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${h.toFixed(1)}ms | Scene add: ${f.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;ge.begin("Planet.workerBuild.serialize");const e=[],t={};for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);if(i){e.push({tileIndex:n,tile:{index:i.tile.index,vertices:i.tile.vertices.map(r=>({x:r.x,y:r.y,z:r.z})),center:{x:i.tile.center.x,y:i.tile.center.y,z:i.tile.center.z},neighbors:i.tile.neighbors},blocks:[...i.blocks]});for(const r of i.tile.neighbors)if(!t[r]){const o=this.columns.get(r);o&&(t[r]={blocks:[...o.blocks],vertices:o.tile.vertices.map(a=>({x:a.x,y:a.y,z:a.z}))})}i.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1,ge.end("Planet.workerBuild.serialize"),ge.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:V.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z},uvScale:V.TERRAIN_UV_SCALE}}),ge.end("Planet.workerBuild.postMessage")}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(ge.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,ge.end("Planet.lodWorkerBuild.serialize"),ge.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,maxDepth:this.MAX_DEPTH,waterSurfaceOffset:V.WATER_SURFACE_OFFSET,lodOffset:.3,chunkCount:this.LOD_CHUNK_COUNT,cameraDir:this.cachedCameraDir}}),ge.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new Wt,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new La(this.radius,t[n]),r=new rt,o=[],a=[],l=[],c=[],h=[];let u=0;const f=new Map,d=this.getSeaLevelDepth(),g=this.depthToRadius(d),x=!!this.config.texturePath;for(const S of i.tiles){const y=this.getHeightVariation(S.center),T=this.depthToRadius(y),A=!x&&y<d,b=A?g:T;let R;if(x){const w=Math.max(.4,Math.min(1,.6+y*.02));R=new Le(w*.7,w*.7,w*.7)}else A?R=new Le(3381708):y<=0?R=new Le(8947848):R=new Le(4885578);f.set(S.index,{radius:b,isWater:A,color:R})}for(const S of i.tiles){const y=f.get(S.index),T=y.radius,A=y.color,b=S.center.clone().normalize().multiplyScalar(T),R=S.vertices.map(he=>he.clone().normalize().multiplyScalar(T)),w=b.clone().normalize(),v=Math.abs(w.y)<.9?new L(0,1,0):new L(1,0,0),_=new L().crossVectors(v,w).normalize(),D=new L().crossVectors(w,_),I=[];let F=1/0,B=-1/0,G=1/0,W=-1/0;for(const he of S.vertices){const Ve=he.clone().sub(S.center),Ke=Ve.dot(_),je=Ve.dot(D);I.push({u:Ke,v:je}),F=Math.min(F,Ke),B=Math.max(B,Ke),G=Math.min(G,je),W=Math.max(W,je)}const Z=B-F,X=W-G,te=I.map(he=>({u:(he.u-F)/Z,v:(he.v-G)/X})),ne={u:(0-F)/Z,v:(0-G)/X},pe=u;o.push(b.x,b.y,b.z),a.push(w.x,w.y,w.z),l.push(ne.u,ne.v),c.push(A.r,A.g,A.b),u++;for(let he=0;he<R.length;he++)o.push(R[he].x,R[he].y,R[he].z),a.push(w.x,w.y,w.z),l.push(te[he].u,te[he].v),c.push(A.r,A.g,A.b),u++,h.push(pe,pe+1+he,pe+1+(he+1)%R.length);if(!y.isWater){const he=x?new Le(.5,.5,.5):new Le(9139029),Ve=S.vertices.length;for(let Ke=0;Ke<Ve;Ke++){const je=(Ke+1)%Ve,K=S.vertices[Ke],j=S.vertices[je],fe=K.clone().add(j).normalize();let Re,ye=1/0;for(const Ie of S.neighbors){const it=f.get(Ie);if(!it)continue;const Ne=i.tiles[Ie];if(!Ne)continue;const Je=Ne.center.clone().normalize().distanceToSquared(fe);Je<ye&&(ye=Je,Re=it)}if(Re&&Re.radius<T){const Ie=K.clone().normalize().multiplyScalar(Re.radius),it=j.clone().normalize().multiplyScalar(Re.radius),Ne=j.clone().normalize().multiplyScalar(T),Je=K.clone().normalize().multiplyScalar(T),P=u;o.push(Ie.x,Ie.y,Ie.z),o.push(it.x,it.y,it.z),o.push(Ne.x,Ne.y,Ne.z),o.push(Je.x,Je.y,Je.z);const we=it.clone().sub(Ie),Ce=Je.clone().sub(Ie),ke=we.clone().cross(Ce).normalize();a.push(ke.x,ke.y,ke.z),a.push(ke.x,ke.y,ke.z),a.push(ke.x,ke.y,ke.z),a.push(ke.x,ke.y,ke.z),l.push(0,0,1,0,1,1,0,1),c.push(he.r,he.g,he.b),c.push(he.r,he.g,he.b),c.push(he.r,he.g,he.b),c.push(he.r,he.g,he.b),h.push(P,P+1,P+2),h.push(P,P+2,P+3),u+=4}}}}r.setAttribute("position",new _e(o,3)),r.setAttribute("normal",new _e(a,3)),r.setAttribute("uv",new _e(l,2)),r.setAttribute("color",new _e(c,3)),r.setIndex(h);const m=new eo({vertexColors:!0,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),p=new Xe(r,m);p.position.copy(this.center),p.visible=!1,p.renderOrder=-2,this.scene.add(p),this.distantLODMeshes.push(p)}}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(ge.begin("Planet.rebuildLODMesh"),ge.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const a=this.lodMesh;a.traverse(l=>{l instanceof Xe&&l.geometry&&l.geometry.dispose()}),this.scene.remove(a),this.lodMesh=null,this.lodWaterMesh=null}for(const a of this.lodChunks)for(;a.children.length>0;){const l=a.children[0];l instanceof Xe&&l.geometry&&l.geometry.dispose(),a.remove(l)}ge.end("Planet.rebuildLODMesh.cleanup");const e=.3,t=this.depthToRadius(this.getSeaLevelDepth())-e,n=[];for(let a=0;a<this.LOD_CHUNK_COUNT;a++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtIndices:[],dirtVertexOffset:0,stonePositions:[],stoneNormals:[],stoneUvs:[],stoneSkyLight:[],stoneIndices:[],stoneVertexOffset:0,sandPositions:[],sandNormals:[],sandUvs:[],sandSkyLight:[],sandIndices:[],sandVertexOffset:0,woodPositions:[],woodNormals:[],woodUvs:[],woodSkyLight:[],woodIndices:[],woodVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0});const i=new Map;for(const[a,l]of this.columns){const c=l.tile,h=c.center.clone().normalize(),u=c.vertices.map(w=>w.clone().normalize()),f=Math.abs(h.y)<.9?new L(0,1,0):new L(1,0,0),d=new L().crossVectors(f,h).normalize(),g=new L().crossVectors(h,d),x=[];let m=1/0,p=-1/0,S=1/0,y=-1/0;for(const w of c.vertices){const v=w.clone().sub(c.center),_=v.dot(d),D=v.dot(g);x.push({u:_,v:D}),m=Math.min(m,_),p=Math.max(p,_),S=Math.min(S,D),y=Math.max(y,D)}const T=p-m,A=y-S,b=x.map(w=>({u:(w.u-m)/T,v:(w.v-S)/A})),R={u:(0-m)/T,v:(0-S)/A};i.set(a,{normalizedCenter:h,normalizedVertices:u,normalizedUVs:b,centerUV:R})}ge.begin("Planet.rebuildLODMesh.pass1");const r=new Map;for(const[a,l]of this.columns){let c=0,h=k.GRASS;for(let d=l.blocks.length-1;d>=0;d--)if(l.blocks[d]!==k.AIR){c=d,h=l.blocks[d];break}let u;const f=h===k.WATER;f?u=t:u=this.depthToRadius(c)-e,r.set(a,{radius:u,isWater:f,surfaceBlockType:h})}ge.end("Planet.rebuildLODMesh.pass1"),ge.begin("Planet.rebuildLODMesh.pass2");for(const[a]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const l=r.get(a);if(!l)continue;const c=l.surfaceBlockType,h=l.radius,u=i.get(a);if(!u)continue;const f=u.normalizedCenter,d=f.clone().multiplyScalar(h),g=u.normalizedVertices.map(w=>w.clone().multiplyScalar(h)),x=this.tileToChunk.get(a)??0,m=n[x];let p,S,y,T,A,b;c===k.WATER?(p=m.waterPositions,S=m.waterNormals,y=m.waterUvs,T=null,A=m.waterIndices,b=m.waterVertexOffset):c===k.DIRT?(p=m.dirtPositions,S=m.dirtNormals,y=m.dirtUvs,T=m.dirtSkyLight,A=m.dirtIndices,b=m.dirtVertexOffset):c===k.STONE?(p=m.stonePositions,S=m.stoneNormals,y=m.stoneUvs,T=m.stoneSkyLight,A=m.stoneIndices,b=m.stoneVertexOffset):c===k.SAND?(p=m.sandPositions,S=m.sandNormals,y=m.sandUvs,T=m.sandSkyLight,A=m.sandIndices,b=m.sandVertexOffset):c===k.WOOD?(p=m.woodPositions,S=m.woodNormals,y=m.woodUvs,T=m.woodSkyLight,A=m.woodIndices,b=m.woodVertexOffset):(p=m.grassPositions,S=m.grassNormals,y=m.grassUvs,T=m.grassSkyLight,A=m.grassIndices,b=m.grassVertexOffset);const R=b;p.push(d.x,d.y,d.z),S.push(f.x,f.y,f.z),y.push(u.centerUV.u,u.centerUV.v),T&&T.push(1),b++;for(let w=0;w<g.length;w++)p.push(g[w].x,g[w].y,g[w].z),S.push(f.x,f.y,f.z),y.push(u.normalizedUVs[w].u,u.normalizedUVs[w].v),T&&T.push(1),b++,A.push(R,R+1+w,R+1+(w+1)%g.length);c===k.WATER?m.waterVertexOffset=b:c===k.DIRT?m.dirtVertexOffset=b:c===k.STONE?m.stoneVertexOffset=b:c===k.SAND?m.sandVertexOffset=b:c===k.WOOD?m.woodVertexOffset=b:m.grassVertexOffset=b,this.lodTileVisibility.set(a,!0)}ge.end("Planet.rebuildLODMesh.pass2"),ge.begin("Planet.rebuildLODMesh.pass3");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=l.tile,h=r.get(a),u=(h==null?void 0:h.radius)??this.radius,f=(h==null?void 0:h.isWater)??!1,d=c.vertices.length,g=i.get(a);if(!g)continue;const x=g.normalizedVertices,m=this.tileToChunk.get(a)??0,p=n[m];for(let S=0;S<d;S++){const y=(S+1)%d,T=x[S],A=x[y],b=T.x+A.x,R=T.y+A.y,w=T.z+A.z,v=Math.sqrt(b*b+R*R+w*w),_=b/v,D=R/v,I=w/v;let F,B=1/0,G=!1;for(const H of c.neighbors){const J=i.get(H);if(!J)continue;const ee=J.normalizedCenter,$=ee.x-_,Te=ee.y-D,ce=ee.z-I,De=$*$+Te*Te+ce*ce;if(De<B){B=De;const be=r.get(H);F=be==null?void 0:be.radius,G=(be==null?void 0:be.isWater)??!1}}if(F===void 0||!(u>F||f&&!G))continue;const Z=T.x*F,X=T.y*F,te=T.z*F,ne=A.x*F,pe=A.y*F,he=A.z*F,Ve=A.x*u,Ke=A.y*u,je=A.z*u,K=T.x*u,j=T.y*u,fe=T.z*u,Re=ne-Z,ye=pe-X,Ie=he-te,it=K-Z,Ne=j-X,Je=fe-te;let P=ye*Je-Ie*Ne,we=Ie*it-Re*Je,Ce=Re*Ne-ye*it;const ke=Math.sqrt(P*P+we*we+Ce*Ce);ke>0&&(P/=ke,we/=ke,Ce/=ke);const xe=f?p.waterSidePositions:p.sidePositions,ot=f?p.waterSideNormals:p.sideNormals,Ae=f?p.waterSideUvs:p.sideUvs,Fe=f?null:p.sideSkyLight,C=f?p.waterSideIndices:p.sideIndices,M=f?p.waterSideVertexOffset:p.sideVertexOffset;xe.push(Z,X,te,ne,pe,he,Ve,Ke,je,K,j,fe),ot.push(P,we,Ce,P,we,Ce,P,we,Ce,P,we,Ce),Ae.push(0,0,1,0,1,1,0,1),Fe&&Fe.push(1,1,1,1),C.push(M,M+1,M+2,M,M+2,M+3),f?p.waterSideVertexOffset+=4:p.sideVertexOffset+=4}}ge.end("Planet.rebuildLODMesh.pass3"),ge.begin("Planet.rebuildLODMesh.pass4");for(const[a,l]of this.columns){if(this.cachedNearbyTiles.has(a))continue;const c=r.get(a);if(!((c==null?void 0:c.isWater)??!1))continue;const u=l.tile,f=u.vertices.length,d=i.get(a);if(!d)continue;const g=d.normalizedVertices,x=this.tileToChunk.get(a)??0,m=n[x];for(let p=0;p<f;p++){const S=(p+1)%f,y=g[p],T=g[S],A=y.x+T.x,b=y.y+T.y,R=y.z+T.z,w=Math.sqrt(A*A+b*b+R*R),v=A/w,_=b/w,D=R/w;let I,F=1/0;for(const ot of u.neighbors){const Ae=i.get(ot);if(!Ae)continue;const Fe=Ae.normalizedCenter,C=Fe.x-v,M=Fe.y-_,H=Fe.z-D,J=C*C+M*M+H*H;J<F&&(F=J,I=ot)}if(I===void 0||!this.cachedNearbyTiles.has(I))continue;const B=r.get(I);if(!B)continue;const G=B.radius,W=t;if(G>=W)continue;const Z=y.x*G,X=y.y*G,te=y.z*G,ne=T.x*G,pe=T.y*G,he=T.z*G,Ve=T.x*W,Ke=T.y*W,je=T.z*W,K=y.x*W,j=y.y*W,fe=y.z*W,Re=ne-Z,ye=pe-X,Ie=he-te,it=K-Z,Ne=j-X,Je=fe-te;let P=ye*Je-Ie*Ne,we=Ie*it-Re*Je,Ce=Re*Ne-ye*it;const ke=Math.sqrt(P*P+we*we+Ce*Ce);ke>0&&(P/=ke,we/=ke,Ce/=ke);const xe=m.waterSideVertexOffset;m.waterSidePositions.push(Z,X,te,ne,pe,he,Ve,Ke,je,K,j,fe),m.waterSideNormals.push(P,we,Ce,P,we,Ce,P,we,Ce,P,we,Ce),m.waterSideUvs.push(0,0,1,0,1,1,0,1),m.waterSideIndices.push(xe,xe+1,xe+2,xe,xe+2,xe+3),m.waterSideVertexOffset+=4}}ge.end("Planet.rebuildLODMesh.pass4"),ge.begin("Planet.rebuildLODMesh.createMeshes");const o=new Wt;for(let a=0;a<this.LOD_CHUNK_COUNT;a++){const l=n[a],c=this.lodChunks[a];for(;c.children.length>0;)c.remove(c.children[0]);if(l.grassPositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.grassPositions,3)),h.setAttribute("normal",new _e(l.grassNormals,3)),h.setAttribute("uv",new _e(l.grassUvs,2)),l.grassSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.grassSkyLight,1)),h.setIndex(l.grassIndices);const u=new Xe(h,this.meshBuilder.getTopLODMaterial());c.add(u)}if(l.dirtPositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.dirtPositions,3)),h.setAttribute("normal",new _e(l.dirtNormals,3)),h.setAttribute("uv",new _e(l.dirtUvs,2)),l.dirtSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.dirtSkyLight,1)),h.setIndex(l.dirtIndices);const u=new Xe(h,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.stonePositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.stonePositions,3)),h.setAttribute("normal",new _e(l.stoneNormals,3)),h.setAttribute("uv",new _e(l.stoneUvs,2)),l.stoneSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.stoneSkyLight,1)),h.setIndex(l.stoneIndices);const u=new Xe(h,this.meshBuilder.getStoneLODMaterial());c.add(u)}if(l.sandPositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.sandPositions,3)),h.setAttribute("normal",new _e(l.sandNormals,3)),h.setAttribute("uv",new _e(l.sandUvs,2)),l.sandSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.sandSkyLight,1)),h.setIndex(l.sandIndices);const u=new Xe(h,this.meshBuilder.getSandLODMaterial());c.add(u)}if(l.woodPositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.woodPositions,3)),h.setAttribute("normal",new _e(l.woodNormals,3)),h.setAttribute("uv",new _e(l.woodUvs,2)),l.woodSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.woodSkyLight,1)),h.setIndex(l.woodIndices);const u=new Xe(h,this.meshBuilder.getWoodLODMaterial());c.add(u)}if(l.waterPositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.waterPositions,3)),h.setAttribute("normal",new _e(l.waterNormals,3)),h.setAttribute("uv",new _e(l.waterUvs,2)),h.setIndex(l.waterIndices);const u=new Xe(h,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}if(l.sidePositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.sidePositions,3)),h.setAttribute("normal",new _e(l.sideNormals,3)),h.setAttribute("uv",new _e(l.sideUvs,2)),l.sideSkyLight.length>0&&h.setAttribute("skyLight",new _e(l.sideSkyLight,1)),h.setIndex(l.sideIndices);const u=new Xe(h,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.waterSidePositions.length>0){const h=new rt;h.setAttribute("position",new _e(l.waterSidePositions,3)),h.setAttribute("normal",new _e(l.waterSideNormals,3)),h.setAttribute("uv",new _e(l.waterSideUvs,2)),h.setIndex(l.waterSideIndices);const u=new Xe(h,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}o.add(c)}o.position.copy(this.center),o.renderOrder=-1,this.scene.add(o),this.lodMesh=o,ge.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,ge.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath,t=new Map;for(const r of this.polyhedron.tiles){const o=this.getHeightVariation(r.center);t.set(r.index,o)}const n=this.MAX_DEPTH-1-this.SEA_LEVEL,i=new Set;if(e){for(const r of this.polyhedron.tiles)if((t.get(r.index)??n)>=n){for(const a of r.neighbors)if((t.get(a)??n)<n){i.add(r.index);break}}console.log(`[Beach detection] Found ${i.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`)}for(const r of this.polyhedron.tiles){const o=[],a=t.get(r.index)??n,l=i.has(r.index);for(let u=0;u<this.MAX_DEPTH;u++)u>a?o.push(k.AIR):u===a?l?o.push(k.SAND):e&&a<n?o.push(k.DIRT):o.push(k.GRASS):u>a-3?l?o.push(k.SAND):o.push(k.DIRT):o.push(k.STONE);const c=new pi(r.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),h={tile:r,blocks:o,isDirty:!0,boundingSphere:c};this.columns.set(r.index,h)}e&&this.fillOceans()}fillOceans(){const e=this.MAX_DEPTH-1-this.SEA_LEVEL;for(const[t,n]of this.columns){let i=0;for(let r=n.blocks.length-1;r>=0;r--)if(n.blocks[r]!==k.AIR){i=r;break}if(i<e){for(let r=i+1;r<=e;r++)n.blocks[r]===k.AIR&&(n.blocks[r]=k.WATER);n.isDirty=!0}}}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){const e=(1+Math.sqrt(5))/2,t=[new L(-1,e,0).normalize(),new L(1,e,0).normalize(),new L(-1,-e,0).normalize(),new L(1,-e,0).normalize(),new L(0,-1,e).normalize(),new L(0,1,e).normalize(),new L(0,-1,-e).normalize(),new L(0,1,-e).normalize(),new L(e,0,-1).normalize(),new L(e,0,1).normalize(),new L(-e,0,-1).normalize(),new L(-e,0,1).normalize()];for(let n=0;n<this.lodChunkBounds.length;n++){const i=t[n].clone().multiplyScalar(this.radius).add(this.center);this.lodChunkBounds[n].center.copy(i)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=V.TERRAIN_CONTINENT_SCALE,r=V.TERRAIN_MOUNTAIN_SCALE,o=V.TERRAIN_DETAIL_SCALE,a=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(a)*Math.pow(Math.abs(a),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,r,4,.5,2.2),h=Math.max(0,l),u=c*h*V.TERRAIN_MOUNTAIN_HEIGHT,f=this.fractalSimplex3D(n.x,n.y,n.z,V.TERRAIN_HILL_SCALE,3,.5,2),d=this.fractalSimplex3D(n.x,n.y,n.z,o,2,.5,2);let g=l*V.TERRAIN_CONTINENT_WEIGHT;g+=u,g+=f*V.TERRAIN_HILL_WEIGHT*(h>.1?1:.3),g+=d*V.TERRAIN_DETAIL_WEIGHT;const x=this.MAX_DEPTH-1-this.SEA_LEVEL;let m;if(g>=0){const p=g*this.MAX_HEIGHT*t;m=x+p}else{const S=Math.pow(Math.abs(g),V.TERRAIN_OCEAN_DEPTH_POWER)*V.TERRAIN_MAX_DEPTH*t;m=x-S}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(m)))}simplex3D(e,t,n){const i=.3333333333333333,r=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const o=(e+t+n)*i,a=Math.floor(e+o),l=Math.floor(t+o),c=Math.floor(n+o),h=(a+l+c)*r,u=a-h,f=l-h,d=c-h,g=e-u,x=t-f,m=n-d;let p,S,y,T,A,b;g>=x?x>=m?(p=1,S=0,y=0,T=1,A=1,b=0):g>=m?(p=1,S=0,y=0,T=1,A=0,b=1):(p=0,S=0,y=1,T=1,A=0,b=1):x<m?(p=0,S=0,y=1,T=0,A=1,b=1):g<m?(p=0,S=1,y=0,T=0,A=1,b=1):(p=0,S=1,y=0,T=1,A=1,b=0);const R=g-p+r,w=x-S+r,v=m-y+r,_=g-T+2*r,D=x-A+2*r,I=m-b+2*r,F=g-1+3*r,B=x-1+3*r,G=m-1+3*r;let W=0,Z=0,X=0,te=0,ne=.6-g*g-x*x-m*m;ne>=0&&(ne*=ne,W=ne*ne*this.grad3D(a,l,c,g,x,m));let pe=.6-R*R-w*w-v*v;pe>=0&&(pe*=pe,Z=pe*pe*this.grad3D(a+p,l+S,c+y,R,w,v));let he=.6-_*_-D*D-I*I;he>=0&&(he*=he,X=he*he*this.grad3D(a+T,l+A,c+b,_,D,I));let Ve=.6-F*F-B*B-G*G;return Ve>=0&&(Ve*=Ve,te=Ve*Ve*this.grad3D(a+1,l+1,c+1,F,B,G)),32*(W+Z+X+te)}grad3D(e,t,n,i,r,o){const a=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][a];return c[0]*i+c[1]*r+c[2]*o}fractalSimplex3D(e,t,n,i,r,o,a){let l=0,c=1,h=i,u=0;for(let f=0;f<r;f++)l+=this.simplex3D(e*h,t*h,n*h)*c,u+=c,c*=o,h*=a;return l/u}ridgeSimplex3D(e,t,n,i,r,o,a){let l=0,c=1,h=i,u=0;for(let f=0;f<r;f++){const d=this.simplex3D(e*h,t*h,n*h),g=1-Math.abs(d);l+=g*g*c,u+=c,c*=o,h*=a}return l/u}hash3D(e,t,n){const i=this.seed;let r=e*374761393+t*668265263+n*1274126177+i|0;return r=(r^r>>13)*1274126177|0,r^r>>16}update(e,t){ge.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),ge.end("Planet.frustum");const n=t.position.x-this.center.x,i=t.position.y-this.center.y,r=t.position.z-this.center.z,o=Math.sqrt(n*n+i*i+r*r);o>0&&(this.cachedCameraDir.x=n/o,this.cachedCameraDir.y=i/o,this.cachedCameraDir.z=r/o);const a=e.distanceTo(this.center),l=a-this.radius,c=this.getDistantLODLevel(a);if(c>=0){this.setDistantLODVisible(c),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(l>V.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const S=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!S);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const h=Math.min(1,Math.max(0,l/100)),u=V.TERRAIN_MIN_RENDER_DISTANCE,f=V.TERRAIN_MAX_RENDER_DISTANCE,d=Math.floor(u+h*(f-u));ge.begin("Planet.getTile");const g=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(ge.end("Planet.getTile"),!g)return;const x=g.index;this.isIncrementalRebuildActive&&(ge.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),ge.end("Planet.incrementalRebuild"));const m=V.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(x)||d!==this.cachedRenderDistance){ge.begin("Planet.tilesInRange");const S=this.getTilesInRange(x,d),y=[],T=[];for(const A of S)this.cachedNearbyTiles.has(A)||y.push(A);for(const A of this.cachedNearbyTiles)S.has(A)||T.push(A);if(this.bufferCenterTiles=this.getTilesInRange(x,m),this.cachedRenderDistance=d,y.length>0||T.length>0){this.cachedNearbyTiles=S;const A=this.polyhedron.tiles[x].center;y.sort((b,R)=>{const w=this.polyhedron.tiles[b].center.distanceToSquared(A);return this.polyhedron.tiles[R].center.distanceToSquared(A)-w}),T.sort((b,R)=>{const w=this.polyhedron.tiles[b].center.distanceToSquared(A),v=this.polyhedron.tiles[R].center.distanceToSquared(A);return w-v}),this.pendingTilesToAdd.push(...y),this.pendingTilesToRemove.push(...T),this.isIncrementalRebuildActive=!0,this.needsRebatch=!0,this.needsLODRebuild=!0,ge.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),ge.end("Planet.boundaryWalls")}ge.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(ge.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),ge.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(this.geometryWorker?(ge.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),ge.end("Planet.startWorkerBuild")):(ge.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),ge.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(y=>setTimeout(y,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(ge.begin("Planet.LODRebuild"),this.rebuildLODMesh(),ge.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(y=>setTimeout(y,0)))(()=>{this.needsWaterWallsRebuild&&(ge.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),ge.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=V.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=ur();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&this.frustum.intersectsSphere(i.boundingSphere)&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const r=this.createBufferGeometry(i),o=new Xe(r,n.getMaterial());n.renderOrder!==void 0&&(o.renderOrder=n.renderOrder),this.batchedMeshGroup.add(o)}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}getBlockTopMaterialKey(e){switch(e){case k.WATER:return"water";case k.STONE:return"stone";case k.SAND:return"sand";case k.DIRT:return"side";case k.WOOD:return"wood";case k.GRASS:return"top";default:return"top"}}getBlockSideMaterialKey(e){switch(e){case k.STONE:return"stone";case k.SAND:return"sand";case k.DIRT:return"side";case k.WOOD:return"wood";case k.GRASS:return"grassSide";default:return"side"}}getBlockBottomMaterialKey(e){switch(e){case k.STONE:return"stone";case k.SAND:return"sand";case k.WOOD:return"wood";default:return"side"}}buildColumnGeometry(e,t){let n=0;for(let i=e.blocks.length-1;i>=0;i--)if(e.blocks[i]!==k.AIR&&e.blocks[i]!==k.WATER){n=i;break}for(let i=0;i<e.blocks.length;i++){const r=e.blocks[i];if(r===k.AIR)continue;const o=r===k.WATER,a=i>=e.blocks.length-1?k.AIR:e.blocks[i+1],l=i===0?k.AIR:e.blocks[i-1],c=a===k.AIR||!o&&a===k.WATER,h=l===k.AIR||!o&&l===k.WATER;if(o&&a!==k.AIR)continue;const u=this.hasExposedSide(e,i);if(!o&&!c&&!h&&!u)continue;let f=this.depthToRadius(i),d=f-this.BLOCK_HEIGHT;if(o&&(f-=V.WATER_SURFACE_OFFSET,d-=V.WATER_SURFACE_OFFSET),d<=0)continue;const g=n-i,x=.8,m=.05;let p=1;g>0&&(p=Math.max(m,Math.pow(x,g)));const{top:S,bottom:y,sides:T}=this.meshBuilder.createSeparateGeometries(e.tile,d,f,new L(0,0,0),o?!0:c,o?!1:h,o?!1:u);if(S){const A=S.getAttribute("position"),b=S.getAttribute("normal"),R=S.getAttribute("uv"),w=S.getIndex();if(A&&b&&R&&w){const v=this.getBlockTopMaterialKey(r),_=o?1:p;this.mergeGeometry(t[v],A,b,R,w,this.sunDirection,_)}S.dispose()}if(y&&!o){const A=y.getAttribute("position"),b=y.getAttribute("normal"),R=y.getAttribute("uv"),w=y.getIndex();if(A&&b&&R&&w){const v=Math.max(m,p*x),_=this.getBlockBottomMaterialKey(r);this.mergeGeometry(t[_],A,b,R,w,this.sunDirection,v)}y.dispose()}if(T){const A=T.getAttribute("position"),b=T.getAttribute("normal"),R=T.getAttribute("uv"),w=T.getIndex();if(A&&b&&R&&w){const v=this.getBlockSideMaterialKey(r);this.mergeGeometry(t[v],A,b,R,w,this.sunDirection,p)}T.dispose()}o&&this.buildWaterSideFaces(e,i,d,f,t.water)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e)}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}getTilesInRange(e,t){const n=new Set,i=new Set,r=[{index:e,distance:0}];let o=0;for(;o<r.length;){const a=r[o++];if(!i.has(a.index)&&(i.add(a.index),a.distance<=t)){n.add(a.index);const l=this.polyhedron.tiles[a.index];for(const c of l.neighbors)i.has(c)||r.push({index:c,distance:a.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Xe&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,r,o,a=1){for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),u=t.getZ(l),f=n.getX(l),d=n.getY(l),g=n.getZ(l);e.positions.push(c,h,u),e.normals.push(f,d,g),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(a);{const x=Math.sqrt(c*c+h*h+u*u);let m=1;if(x>0){const p=c/x,S=h/x,y=u/x,T=p*o.x+S*o.y+y*o.z;m=Math.max(.2,T*.5+.5)}e.colors.push(m,m,m)}}for(let l=0;l<r.count;l++)e.indices.push(r.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}createBufferGeometry(e){const t=new rt;return t.setAttribute("position",new _e(e.positions,3)),t.setAttribute("normal",new _e(e.normals,3)),t.setAttribute("uv",new _e(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new _e(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new _e(e.skyLight,1)),t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const r of e.tile.neighbors){const o=this.columns.get(r);if(o&&t<o.blocks.length){const a=o.blocks[t];if(i&&(a===k.AIR||a===k.WATER)||n===k.WATER&&a===k.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,r){const o=e.tile,a=o.vertices.length,l=.001;for(let c=0;c<a;c++){const h=(c+1)%a,u=o.vertices[c],f=o.vertices[h];let d;for(const F of o.neighbors){const B=this.columns.get(F);if(!B)continue;const G=B.tile;let W=!1,Z=!1;for(const X of G.vertices)X.distanceTo(u)<l&&(W=!0),X.distanceTo(f)<l&&(Z=!0);if(W&&Z){d=B;break}}if(!d||d.blocks[t]!==k.AIR)continue;let g=t+1;for(let F=t+1;F<e.blocks.length;F++){const B=e.blocks[F];if(B!==k.AIR&&B!==k.WATER){g=F;break}}let x=t+1;for(let F=t+1;F<d.blocks.length;F++){const B=d.blocks[F];if(B!==k.AIR&&B!==k.WATER){x=F;break}else if(B===k.AIR)x=F+1;else break}const m=Math.min(g,x),p=i,S=this.radius-m*this.BLOCK_HEIGHT;if(S>=p)continue;const y=u.clone().normalize(),T=f.clone().normalize(),A=y.clone().multiplyScalar(p),b=T.clone().multiplyScalar(p),R=y.clone().multiplyScalar(S),w=T.clone().multiplyScalar(S),v=w.clone().sub(R),_=A.clone().sub(R),D=v.clone().cross(_).normalize(),I=r.vertexOffset;r.positions.push(R.x,R.y,R.z,w.x,w.y,w.z,b.x,b.y,b.z,A.x,A.y,A.z);for(let F=0;F<4;F++)r.normals.push(D.x,D.y,D.z);r.uvs.push(0,0,1,0,1,1,0,1),r.skyLight.push(1,1,1,1),r.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),r.indices.push(I,I+1,I+2,I,I+2,I+3),r.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?k.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const r=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const a of i.tile.neighbors){const l=this.columns.get(a);l&&(l.isDirty=!0)}let o=0;for(let a=0;a<i.blocks.length;a++)if(i.blocks[a]!==k.AIR&&i.blocks[a]!==k.WATER){o=a;break}t<=o+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const a of i.tile.neighbors)this.cachedNearbyTiles.has(a)&&this.queueDirtyColumnRebuild(a);this.meshBuilder.isSolid(r)&&n===k.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){if(!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0)return;if(this.dirtyColumnsQueue.size>20){this.needsRebatch=!0,this.dirtyColumnsQueue.clear();return}for(;this.batchedMeshGroup.children.length>0;){const n=this.batchedMeshGroup.children[0];n.geometry&&n.geometry.dispose(),this.batchedMeshGroup.remove(n)}const e={};for(const n of this.BLOCK_MATERIALS)e[n.key]=ur();for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);i&&(this.buildColumnGeometry(i,e),i.isDirty=!1)}for(const n of this.BLOCK_MATERIALS){const i=e[n.key];if(i.positions.length>0){const r=this.createBufferGeometry(i),o=new Xe(r,n.getMaterial());n.renderOrder!==void 0&&(o.renderOrder=n.renderOrder),this.batchedMeshGroup.add(o)}}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.dirtyColumnsQueue.clear()}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=ur(),t=this.depthToRadius(this.getSeaLevelDepth())-V.WATER_SURFACE_OFFSET;for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);if(!i)continue;const r=i.tile;for(let o=0;o<r.vertices.length;o++){const a=(o+1)%r.vertices.length,l=r.vertices[o],c=r.vertices[a],h=l.clone().add(c).normalize();let u,f=1/0;for(const v of r.neighbors){const _=this.columns.get(v);if(!_)continue;const D=_.tile.center.clone().normalize().distanceToSquared(h);D<f&&(f=D,u=v)}if(u===void 0||this.cachedNearbyTiles.has(u))continue;let d=this.SEA_LEVEL;for(let v=0;v<i.blocks.length;v++)if(i.blocks[v]!==k.AIR&&i.blocks[v]!==k.WATER){d=v;break}if(d<=this.SEA_LEVEL)continue;const x=this.radius-d*this.BLOCK_HEIGHT,m=t;if(x>=m)continue;const p=l.clone().normalize().multiplyScalar(x),S=c.clone().normalize().multiplyScalar(x),y=c.clone().normalize().multiplyScalar(m),T=l.clone().normalize().multiplyScalar(m),A=S.clone().sub(p),b=T.clone().sub(p),R=A.clone().cross(b).normalize(),w=e.vertexOffset;e.positions.push(p.x,p.y,p.z,S.x,S.y,S.z,y.x,y.y,y.z,T.x,T.y,T.z);for(let v=0;v<4;v++)e.normals.push(R.x,R.y,R.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(w,w+1,w+2),e.indices.push(w,w+2,w+3),e.vertexOffset+=4}}if(e.positions.length>0){const n=this.createBufferGeometry(e),i=this.meshBuilder.getSeaWallMaterial();if(i){const r=new Xe(n,i);r.renderOrder=2,this.batchedMeshGroup.add(r)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t<n.blocks.length-1&&n.blocks[t+1]===k.WATER&&(i=!0);for(const r of n.tile.neighbors){const o=this.columns.get(r);o&&o.blocks[t]===k.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],r=[],o=500;for(;i.length>0;){const{tileIndex:u,depth:f}=i.shift(),d=`${u}-${f}`;if(n.has(d))continue;if(n.add(d),n.size>o)return;const g=this.columns.get(u);if(!g||f<0||f>=g.blocks.length)continue;const x=g.blocks[f];if(!(x!==k.AIR&&x!==k.WATER)){if(r.push({tileIndex:u,depth:f,isWater:x===k.WATER}),f>0){const m=g.blocks[f-1];(m===k.AIR||m===k.WATER)&&i.push({tileIndex:u,depth:f-1})}if(f<g.blocks.length-1){const m=g.blocks[f+1];(m===k.AIR||m===k.WATER)&&i.push({tileIndex:u,depth:f+1})}for(const m of g.tile.neighbors){const p=this.columns.get(m);if(p){const S=p.blocks[f];(S===k.AIR||S===k.WATER)&&i.push({tileIndex:m,depth:f})}}}}const a=r.filter(u=>u.isWater).length;if(a===0)return;r.sort((u,f)=>u.depth-f.depth);let l=a;const c=[],h=[];for(const u of r)l>0?(c.push(u),l--):h.push(u);for(const u of c){const f=this.columns.get(u.tileIndex);if(f&&f.blocks[u.depth]===k.AIR){f.blocks[u.depth]=k.WATER,f.isDirty=!0,this.needsRebatch=!0;for(const d of f.tile.neighbors){const g=this.columns.get(d);g&&(g.isDirty=!0)}}}for(const u of h){const f=this.columns.get(u.tileIndex);if(f&&f.blocks[u.depth]===k.WATER){f.blocks[u.depth]=k.AIR,f.isDirty=!0,this.needsRebatch=!0;for(const d of f.tile.neighbors){const g=this.columns.get(d);g&&(g.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getDepthAtPoint(e){const t=e.distanceTo(this.center),n=Math.floor((t-(this.radius-(this.MAX_DEPTH-1)*this.BLOCK_HEIGHT))/this.BLOCK_HEIGHT);return Math.max(0,Math.min(this.MAX_DEPTH-1,n))}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=t.blocks.length-1;n>=0;n--)if(t.blocks[n]!==k.AIR&&t.blocks[n]!==k.WATER){const i=this.depthToRadius(n);return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=n.blocks.length-1;i>=0;i--){const r=n.blocks[i];if(r!==k.AIR&&r!==k.WATER)return this.depthToRadius(i)}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=0;i<n.blocks.length;i++){const r=n.blocks[i];if(r===k.WATER)return!0;if(r!==k.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getVisibleTileIndices(){return this.cachedNearbyTiles}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;let i=-1;for(let o=n.blocks.length-1;o>=0;o--)if(n.blocks[o]===k.WATER){i=o;break}return i<0?!1:this.getDepthAtPoint(e)<i}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);let r=-1;for(let o=n.blocks.length-1;o>=0;o--)if(n.blocks[o]===k.WATER){r=o;break}return r<0?0:i<r?(r-i)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let r=n.blocks.length-1;r>=0;r--)if(n.blocks[r]===k.WATER){i=r;break}return i<0?-1:this.depthToRadius(i)}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const o=t.clone().normalize(),a=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,h=l,u=this.getDepthAtPoint(e);for(let f=0;f<n;f+=.2){a.copy(e).addScaledVector(o,f);const d=this.polyhedron.getTileAtPointFromHint(a.clone().sub(this.center),c),g=this.getDepthAtPoint(a);if(g<0||g>=this.MAX_DEPTH){h=c,u=g,c=d;continue}const x=this.getBlock(d.index,g);if(x===k.AIR){h=d,u=g,c=d;continue}if(x===k.WATER&&!i){h=d,u=g,c=d;continue}const m=a.clone().sub(this.center).normalize();return{tileIndex:d.index,depth:g,blockType:x,point:a.clone(),normal:m,prevTileIndex:h.index,prevDepth:u}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=V.PLANET_LOD_DISTANCE_3?2:e>=V.PLANET_LOD_DISTANCE_2?1:e>=V.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}isInOrbitView(){return this.currentDistantLODLevel>=0}}const st=V.TERRAIN_SEA_LEVEL+V.TERRAIN_MAX_DEPTH;let _s=new Map,Ua=null;function bt(s,e,t){s!==Ua&&(_s.clear(),Ua=s);let n=_s.get(e);if(!n){n=new Array(st);for(let i=0;i<st;i++)n[i]=s.getBlock(e,i);_s.set(e,n)}return t>=0&&t<st?n[t]:k.AIR}function em(){_s.clear()}function ds(s,e,t){let n=-1,i=1/0;for(let r=0;r<st;r++){const o=r<st-1?bt(s,e,r+1):k.AIR,a=bt(s,e,r),l=o===k.AIR||o===k.WATER,c=a!==k.AIR&&a!==k.WATER;if(l&&c){const h=s.depthToRadius(r),u=Math.abs(h-t);u<i&&(i=u,n=r)}}return n}class tm{constructor(e,t,n){N(this,"camera");N(this,"position");N(this,"velocity");N(this,"inputManager");N(this,"planets",[]);N(this,"currentPlanet",null);N(this,"localUp",new L(0,1,0));N(this,"localForward",new L(0,0,-1));N(this,"localRight",new L(1,0,0));N(this,"orientation",new an);N(this,"isInSpace",!1);N(this,"transitionTimer",0);N(this,"isGrounded",!1);N(this,"isJetpacking",!1);N(this,"isInWater",!1);N(this,"feetInWater",!1);N(this,"isFloatingAtSurface",!1);N(this,"hasDoubleJumped",!1);N(this,"jetpackEnabled",!0);N(this,"lastPosition",new L);N(this,"stuckFrameCount",0);N(this,"wasdActiveFrames",0);N(this,"lastStuckLogTime",0);N(this,"jumpStartPosition",null);N(this,"jumpStartSpherical",null);N(this,"wasdPressedDuringJump",!1);N(this,"jumpDirection",null);N(this,"didJumpThisFrame",!1);N(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new L;const i=new L(0,1,0),r=n.getSurfaceHeightInDirection(i);this.position=new L(0,r+1,0),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new dt;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new dt().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new L(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new L().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new L().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),r=Math.atan2(n.x,n.z),o=Math.acos(n.y/i);return{theta:r,phi:o,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const r=this.position.distanceTo(i.planet.center),o=r-i.planet.radius,a=i.gravityFullRadius??i.planet.radius*V.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*V.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(r<l){let h=0;if(r<=a)h=1;else{const u=l-a,f=r-a;h=1-Math.min(1,f/u)}h*=c,h>t&&(t=h,e=i.planet,n=o)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(em(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),r=this.isInSpace;if(this.isInSpace=i===0,r&&!this.isInSpace&&n&&(this.transitionTimer=V.ROLL_SLERP_DURATION,this.currentPlanet=n),!r&&this.isInSpace&&(this.transitionTimer=0,this.updateOrientationFromLocal()),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{this.handleSpaceMouseLook(t,e),this.transitionTimer>0?(this.transitionTimer-=e,this.slerpRollToLevel(e)):this.alignUpWithGravity();const o=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const a=this.position.distanceTo(this.currentPlanet.center),l=a-o;if(l>.5){const c=this.currentPlanet.getTileAtPoint(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${o.toFixed(2)} -> ${a.toFixed(2)} (+${l.toFixed(2)})`),console.error(`Current tile: ${c==null?void 0:c.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),c){console.error("Block column at current tile:");for(let h=0;h<20;h++){const u=this.currentPlanet.getBlock(c.index,h),f=this.currentPlanet.depthToRadius(h);let d=u===0?".":u===4?"~":"#";const g=Math.abs(f-a)<1?" <-- PLAYER":"";console.error(`  d${h} (r${f}): ${d}${g}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+V.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPoint(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1;for(let a=0;a<st;a++){const l=this.currentPlanet.getBlock(n.index,a);if(l!==k.AIR&&l!==k.WATER){i=a;break}}const r=i>=0?this.currentPlanet.depthToRadius(i):0;console.log(`  Ground depth: ${i} (radius: ${r.toFixed(2)})`);const o=e-r;console.log(`  Player feet vs ground: ${o.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${o>V.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let a=0;a<8;a++){const l=this.currentPlanet.getBlock(n.index,a),c=k[l],h=this.currentPlanet.depthToRadius(a),u=h>e&&h<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${a}: ${c} (r=${h.toFixed(1)})${u}`)}console.log(`
Neighbor Tiles:`);for(const a of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[a])continue;let c=-1;for(let f=0;f<st;f++){const d=this.currentPlanet.getBlock(a,f);if(d!==k.AIR&&d!==k.WATER){c=f;break}}const h=c>=0?this.currentPlanet.depthToRadius(c):0,u=h-r;console.log(`  Neighbor ${a}: ground_r=${h.toFixed(1)}, heightDiff=${u.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+V.PLAYER_HEIGHT;let r=-1;for(let w=0;w<st;w++){const v=this.currentPlanet.getBlock(t.index,w);if(v!==k.AIR&&v!==k.WATER){r=w;break}}console.log("========== Hex STRUCTURE (Shift+X) =========="),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${r}`),console.log(`Planet radius: ${this.currentPlanet.radius}`),console.log("");const o=V.DEBUG_CAVE_TILE_RINGS,a=V.DEBUG_CAVE_DEPTH_ROWS,l=new Set([t.index]);let c=new Set([t.index]);for(let w=0;w<o;w++){const v=new Set;for(const _ of c){const D=this.currentPlanet.getPolyhedron().tiles[_];if(D)for(const I of D.neighbors)l.has(I)||(l.add(I),v.add(I))}c=v}const h=Math.max(0,r-a+1),u=r+1;console.log(`Sampling ${l.size} tiles, depths ${h} to ${u}`),console.log("Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, @ = PLAYER BODY OVERLAP"),console.log("");const f=Array.from(l),d=["Depth/Radius"].concat(f.map(w=>`T${w}`));console.log(d.join("	"));for(let w=h;w<=u;w++){const v=this.currentPlanet.depthToRadius(w),_=v-1,D=v>n&&_<i,I=[`d${w} (r${v.toFixed(0)})`];for(const F of f){const B=this.currentPlanet.getBlock(F,w);let G="?";B===k.AIR?G=".":B===k.WATER?G="~":B===k.SAND?G="S":B===k.GRASS?G="G":G="#",D&&F===t.index&&(G=G==="."?"@":G.toUpperCase()),I.push(G)}console.log(I.join("	"))}console.log("");const g=this.currentPlanet.depthToRadius(r);console.log(`Current ground depth: ${r} (r${g.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const x=this.currentPlanet.getPolyhedron().tiles[t.index];if(x)for(const w of x.neighbors){const v=this.currentPlanet.getPolyhedron().tiles[w];if(!v)continue;const _=[];for(let G=0;G<st-1;G++){const W=G<st-1?this.currentPlanet.getBlock(w,G+1):k.AIR,Z=this.currentPlanet.getBlock(w,G),X=W===k.AIR||W===k.WATER,te=Z!==k.AIR&&Z!==k.WATER;X&&te&&_.push(G)}const D=new L(v.center.x,v.center.y,v.center.z).normalize().multiplyScalar(this.currentPlanet.radius),I=this.checkStepHeight(D),F=this.checkHeadroomCollision(D),B=this.checkWallCollision(D);console.log(`  T${w}: floors=[${_.join(",")}] step=${I} headroom=${F} wall=${B}`)}const m=this.localForward.clone().negate(),p=this.position.clone().addScaledVector(m,.5),S=this.currentPlanet.getTileAtPoint(p);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${m.x.toFixed(2)}, ${m.y.toFixed(2)}, ${m.z.toFixed(2)})`),console.log(`  Test position tile: ${S?S.index:"none"} (same=${(S==null?void 0:S.index)===t.index})`);const y=this.checkCollision(p),T=this.checkStepHeight(p),A=this.checkHeadroomCollision(p),b=this.checkWallCollision(p);console.log(`  checkCollision: ${y}, step=${T}, headroom=${A}, wall=${b}`);const R=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(m,2));if(R&&R.index!==t.index){console.log(`  Forward tile (2 units ahead): ${R.index}`);const w=this.currentPlanet.getPolyhedron().tiles[R.index];if(w){const v=[];for(let B=0;B<st-1;B++){const G=B<st-1?this.currentPlanet.getBlock(R.index,B+1):k.AIR,W=this.currentPlanet.getBlock(R.index,B),Z=G===k.AIR||G===k.WATER,X=W!==k.AIR&&W!==k.WATER;Z&&X&&v.push(B)}const _=new L(w.center.x,w.center.y,w.center.z).normalize().multiplyScalar(this.currentPlanet.radius),D=this.checkStepHeight(_),I=this.checkHeadroomCollision(_),F=this.checkWallCollision(_);console.log(`  T${R.index} (center): floors=[${v.join(",")}] step=${D} headroom=${I} wall=${F}`)}}console.log("==============================================")}alignUpWithGravity(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=this.localForward.clone().negate(),n=e.clone();n.sub(t.clone().multiplyScalar(e.dot(t))),!(n.lengthSq()<.001)&&(n.normalize(),this.localUp.copy(n),this.localRight=new L().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new L().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal())}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const r=Math.min(1,V.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,r).normalize(),this.localRight=new L().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new L().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal(),this.localUp.angleTo(i)<.01&&(this.transitionTimer=0)}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=-e.mouseX*V.MOUSE_SENSITIVITY,i=new an().setFromAxisAngle(this.localUp,n);this.orientation.premultiply(i);const r=V.INVERT_Y_AXIS?-1:1;let o=e.mouseY*V.MOUSE_SENSITIVITY*r;if(!this.isInSpace&&this.currentPlanet){const l=this.currentPlanet.getSurfaceNormal(this.position),h=this.localForward.clone().negate().dot(l),u=Math.asin(Math.max(-1,Math.min(1,h))),f=89.5*Math.PI/180,d=u+o;d>f?o=f-u:d<-f&&(o=-f-u)}const a=new an().setFromAxisAngle(this.localRight,o);this.orientation.premultiply(a),this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=V.ROLL_SPEED*t),e.rollRight&&(n-=V.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),r=new an().setFromAxisAngle(i,n);this.orientation.premultiply(r),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new L,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const r=e.sprint?V.SPRINT_SPEED:V.SPACE_THRUST;this.velocity.addScaledVector(n,r*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,V.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const r=this.position.clone().addScaledVector(n,V.WATER_BODY_CHECK_HEIGHT),o=this.currentPlanet.isInWater(r);this.feetInWater=this.currentPlanet.isInWater(this.position);const a=new L;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new L().crossVectors(l,n).normalize();if(e.forward&&a.add(l),e.backward&&a.sub(l),e.left&&a.sub(c),e.right&&a.add(c),a.lengthSq()>0){a.normalize();let f=e.sprint?V.SPRINT_SPEED:V.WALK_SPEED*V.WALK_SPEED_MULTIPLIER;o&&(f*=V.WATER_MOVEMENT_MULTIPLIER);const d=a.clone().multiplyScalar(f*t);this.resolveMovement(d)}const u=this.velocity.dot(n)>V.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!u){const f=this.currentPlanet.getWaterSurfaceRadius(this.position),d=this.position.distanceTo(this.currentPlanet.center),g=f+V.WATER_SURFACE_FLOAT_HEIGHT,x=d-g;if(f>0&&x<=.3)if(x>=-.1){this.isFloatingAtSurface=!0;const m=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(m))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,V.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(this.isGrounded){const f=n,d=this.velocity.dot(n);this.velocity.copy(n).multiplyScalar(d);let g=V.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(g=V.JUMP_FORCE*V.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(f,g),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const x=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:x.theta,phi:x.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),r=this.position.clone().add(n);if(this.checkCollision(r)){const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}else{this.position.copy(r);const o=this.position.clone().add(i);this.checkCollision(o)||this.position.copy(o)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPoint(this.position),n=this.currentPlanet.getTileAtPoint(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!0;const n=this.currentPlanet.getDepthAtPoint(this.position),i=this.currentPlanet.depthToRadius(n);let r=!1,o=!1;for(let a=0;a<st-1;a++){const l=a<st-1?bt(this.currentPlanet,t.index,a+1):k.AIR,c=bt(this.currentPlanet,t.index,a),h=l===k.AIR||l===k.WATER,u=c!==k.AIR&&c!==k.WATER;if(h&&u&&(r=!0,this.currentPlanet.depthToRadius(a)-i<=V.AUTO_STEP_HEIGHT)){o=!0;break}}return r?o:!0}checkWallCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.currentPlanet.getTileAtPoint(this.position),i=n?n.index:-1;let r,o;if(this.isGrounded){const d=this.position.distanceTo(this.currentPlanet.center),g=this.currentPlanet.getTileAtPoint(this.position);let x=-1;if(g&&(x=ds(this.currentPlanet,g.index,d)),x<0)r=e.distanceTo(this.currentPlanet.center),o=r+V.PLAYER_HEIGHT;else{const m=this.currentPlanet.depthToRadius(x);let p=-1,S=1/0;for(let y=0;y<st-1;y++){const T=y<st-1?bt(this.currentPlanet,t.index,y+1):k.AIR,A=bt(this.currentPlanet,t.index,y),b=T===k.AIR||T===k.WATER,R=A!==k.AIR&&A!==k.WATER;if(b&&R){const v=this.currentPlanet.depthToRadius(y)-m;v<=V.AUTO_STEP_HEIGHT&&Math.abs(v)<Math.abs(S)&&(p=y,S=v)}}if(p>=0){const y=this.currentPlanet.depthToRadius(p);r=y,o=y+V.PLAYER_HEIGHT}else r=e.distanceTo(this.currentPlanet.center),o=r+V.PLAYER_HEIGHT}}else r=e.distanceTo(this.currentPlanet.center),o=r+V.PLAYER_HEIGHT;const a=this.currentPlanet.getSurfaceNormal(e),l=[t.index],c=this.currentPlanet.getPolyhedron().tiles[t.index];if(c)for(const d of c.neighbors){const g=this.currentPlanet.getPolyhedron().tiles[d];if(g){const m=new L(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),p=m.dot(a);m.clone().sub(a.clone().multiplyScalar(p)).length()<V.PLAYER_RADIUS+1&&l.push(d)}}const h=this.currentPlanet.radius*.02;let u=r;if(n){const d=ds(this.currentPlanet,i,this.position.distanceTo(this.currentPlanet.center));d>=0&&(u=this.currentPlanet.depthToRadius(d))}const f=Math.max(u,r)+V.AUTO_STEP_HEIGHT;for(const d of l){if(d===i)continue;const g=this.currentPlanet.getPolyhedron().tiles[d];if(!g)continue;let x=-1;for(let A=st-2;A>=0;A--){const b=bt(this.currentPlanet,d,A+1),R=bt(this.currentPlanet,d,A);if((b===k.AIR||b===k.WATER)&&R!==k.AIR&&R!==k.WATER){x=A;break}}if(x>=0&&this.currentPlanet.depthToRadius(x)<=f)continue;const p=new L(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),S=p.dot(a),y=p.clone().sub(a.clone().multiplyScalar(S)).length(),T=Math.max(0,y-h);for(let A=0;A<st;A++){const b=bt(this.currentPlanet,d,A);if(b===k.AIR||b===k.WATER)continue;const R=this.currentPlanet.depthToRadius(A),w=R-1;if(R<=f)continue;if(w<o&&R>r){const _=Math.abs(R-r)<.1;if(this.isGrounded&&d===t.index&&_)continue;if(T<V.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(this.position);let r=-1;if(i&&(r=ds(this.currentPlanet,i.index,n)),r<0)return!1;const o=this.currentPlanet.depthToRadius(r);let a=-1,l=1/0;for(let f=0;f<st-1;f++){const d=f<st-1?bt(this.currentPlanet,t.index,f+1):k.AIR,g=bt(this.currentPlanet,t.index,f),x=d===k.AIR||d===k.WATER,m=g!==k.AIR&&g!==k.WATER;if(x&&m){const S=this.currentPlanet.depthToRadius(f)-o;S<=V.AUTO_STEP_HEIGHT&&Math.abs(S)<Math.abs(l)&&(a=f,l=S)}}if(a<0)return!1;const c=this.currentPlanet.depthToRadius(a),h=c,u=c+V.PLAYER_HEIGHT;for(let f=0;f<st;f++){const d=bt(this.currentPlanet,t.index,f);if(d===k.AIR||d===k.WATER)continue;const g=this.currentPlanet.depthToRadius(f),x=g-1;if(g>h&&x<u){if(f===a)continue;return!0}}return!1}isPositionValid(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getSurfaceNormal(e),n=e.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(e);if(i){let o=-1;for(let a=0;a<st;a++){const l=bt(this.currentPlanet,i.index,a);l!==k.AIR&&l!==k.WATER&&(o=a)}if(o>=0){const a=this.currentPlanet.depthToRadius(o)-1;if(n<a)return!1}}const r=[.1,V.PLAYER_HEIGHT*.5,V.PLAYER_HEIGHT];for(const o of r){const a=n+o,l=this.currentPlanet.center.clone().add(t.clone().multiplyScalar(a)),c=this.currentPlanet.getTileAtPoint(l);if(!c)continue;const h=this.currentPlanet.getDepthAtPoint(l);if(h<0||h>=st)continue;const u=bt(this.currentPlanet,c.index,h);if(u!==k.AIR&&u!==k.WATER){const f=this.currentPlanet.depthToRadius(h);if(a<f)return!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+V.PLAYER_HEIGHT,r=[];for(let d=0;d<st;d++){const g=d<st-1?bt(this.currentPlanet,t.index,d+1):k.AIR,x=bt(this.currentPlanet,t.index,d),m=g===k.AIR||g===k.WATER,p=x!==k.AIR&&x!==k.WATER;if(m&&p){const S=this.currentPlanet.depthToRadius(d);r.push({depth:d,radius:S})}}if(r.length===0)return;let o=r[0],a=Math.abs(n-o.radius);for(const d of r){const g=Math.abs(n-d.radius);g<a&&(a=g,o=d)}const l=o.radius,c=l+V.PLAYER_HEIGHT;let h=!0;for(let d=0;d<st;d++){const g=bt(this.currentPlanet,t.index,d);if(g===k.AIR||g===k.WATER)continue;const x=this.currentPlanet.depthToRadius(d),m=x-1;if(d!==o.depth&&x>l&&m<c){h=!1;break}}if(!h)return;let u=!1;for(let d=0;d<st;d++){const g=bt(this.currentPlanet,t.index,d);if(g===k.AIR||g===k.WATER)continue;const x=this.currentPlanet.depthToRadius(d),m=x-1;if(x>n&&m<i){if(Math.abs(x-n)<.2)continue;u=!0;break}}if(!u)return;const f=o.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,f),this.isInWater){const d=this.velocity.dot(e);d<0&&this.velocity.sub(e.clone().multiplyScalar(d))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,V.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPoint(this.position);let r=-1;i&&(r=ds(this.currentPlanet,i.index,n));const o=r>=0?this.currentPlanet.depthToRadius(r):0,a=o;if(r>=0&&n<=a+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,a),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const h=this.getGravityMultiplier();let u=V.BASE_GRAVITY*h;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?u=0:u*=V.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-V.WATER_DRAG*e)),u>0&&this.velocity.addScaledVector(c,u*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const d=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),g=d.distanceTo(this.currentPlanet.center),x=this.currentPlanet.getTileAtPoint(d);let m=-1,p=1/0;if(x)for(let b=0;b<st-1;b++){const R=b<st-1?bt(this.currentPlanet,x.index,b+1):k.AIR,w=bt(this.currentPlanet,x.index,b),v=R===k.AIR||R===k.WATER,_=w!==k.AIR&&w!==k.WATER;if(v&&_){const I=this.currentPlanet.depthToRadius(b)-o;I<=V.AUTO_STEP_HEIGHT&&Math.abs(I)<Math.abs(p)&&(m=b,p=I)}}const S=m>=0?this.currentPlanet.depthToRadius(m):0,y=S,T=S-o,A=!this.isInWater&&T>V.AUTO_STEP_HEIGHT;if(m>=0&&g<=y)if(A){const b=this.velocity.dot(t);b<0&&this.velocity.sub(t.clone().multiplyScalar(b)),this.velocity.multiplyScalar(.5)}else{const b=d.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(b,y);const R=this.velocity.dot(b);R<0&&this.velocity.sub(b.clone().multiplyScalar(R)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const b=this.isPositionValid(d),R=this.checkWallCollision(d);if(b&&!R)this.position.copy(d);else{const w=t.clone().multiplyScalar(this.velocity.dot(t)),v=this.velocity.clone().sub(w),_=w.clone().multiplyScalar(e),D=this.position.clone().add(_);if(this.isPositionValid(D)&&!this.checkWallCollision(D))this.position.copy(D);else{const F=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(F))}if(v.lengthSq()>.001){const F=v.clone().multiplyScalar(e),B=this.position.clone().add(F);this.isPositionValid(B)&&!this.checkWallCollision(B)?this.position.copy(B):this.velocity.sub(v.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(V.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),r=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(r)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let r="";this.isInSpace?r=" [SPACE FLIGHT]":this.transitionTimer>0?r=" [ENTERING GRAVITY]":this.isJetpacking?r=" [JETPACK]":this.isGrounded||(r=" [AIRBORNE]");const o=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${o} | Grav: ${(i*100).toFixed(0)}%${r}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getDepthAtPoint(this.position);t.textContent=`Depth: ${n}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}}var ut=(s=>(s[s.NONE=0]="NONE",s[s.STONE=1]="STONE",s[s.DIRT=2]="DIRT",s[s.GRASS=3]="GRASS",s[s.WOOD=4]="WOOD",s[s.LEAVES=5]="LEAVES",s[s.LOG=6]="LOG",s[s.SAND=7]="SAND",s))(ut||{});const Ht={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2},7:{name:"Sand",stackSize:64,texture:"/textures/sand.png",mineTime:.5}};class nm{constructor(){N(this,"slots");N(this,"selectedSlot",0);N(this,"hotbarSize",9);N(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=Ht[e];let i=t;for(let r=0;r<this.totalSlots&&i>0;r++){const o=this.slots[r];if(o.itemType===e&&o.quantity<n.stackSize){const a=Math.min(i,n.stackSize-o.quantity);o.quantity+=a,i-=a}}for(let r=0;r<this.totalSlots&&i>0;r++){const o=this.slots[r];if(o.itemType===0){const a=Math.min(i,n.stackSize);o.itemType=e,o.quantity=a,i-=a}}return i}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let r=this.totalSlots-1;r>=0&&n>0;r--){const o=this.slots[r];if(o.itemType===e){const a=Math.min(n,o.quantity);o.quantity-=a,n-=a,i+=a,o.quantity===0&&(o.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}swapSlots(e,t){if(e<0||e>=this.totalSlots||t<0||t>=this.totalSlots||e===t)return;const n={...this.slots[e]};this.slots[e]={...this.slots[t]},this.slots[t]=n}getSlot(e){return e<0||e>=this.totalSlots?null:this.slots[e]}}const im=[{name:"Wood Planks",inputs:[{itemType:ut.LOG,quantity:1}],output:{itemType:ut.WOOD,quantity:4}}];class sm{constructor(e){N(this,"inventory");N(this,"menuElement",null);N(this,"recipeListElement",null);N(this,"inventoryGridElement",null);N(this,"inventoryHotbarElement",null);N(this,"isOpen",!1);N(this,"onCloseCallback",null);N(this,"onUpdateHotbarCallback",null);N(this,"draggedSlotIndex",null);N(this,"dragGhost",null);N(this,"touchDragSlotIndex",null);N(this,"touchDragGhost",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler()}setupUI(){var t;this.menuElement=document.getElementById("inventory-menu"),this.recipeListElement=document.getElementById("recipe-list"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.createInventorySlots();const e=(t=this.menuElement)==null?void 0:t.querySelector(".close-inventory");e&&e.addEventListener("click",()=>this.close()),this.updateRecipeList()}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString(),t.draggable=!0;const n=document.createElement("img");n.style.display="none",n.draggable=!1,t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t.addEventListener("dragstart",r=>this.handleDragStart(r,e)),t.addEventListener("dragend",()=>this.handleDragEnd()),t.addEventListener("dragover",r=>this.handleDragOver(r)),t.addEventListener("dragleave",r=>this.handleDragLeave(r)),t.addEventListener("drop",r=>this.handleDrop(r,e)),t.addEventListener("touchstart",r=>this.handleTouchStart(r,e),{passive:!1}),t.addEventListener("touchmove",r=>this.handleTouchMove(r),{passive:!1}),t.addEventListener("touchend",r=>this.handleTouchEnd(r),{passive:!1}),t}handleTouchStart(e,t){const n=this.inventory.getSlot(t);if(!n||n.itemType===ut.NONE)return;e.preventDefault(),this.touchDragSlotIndex=t;const i=e.touches[0];e.currentTarget.classList.add("dragging");const o=document.createElement("div");o.className="drag-ghost";const a=Ht[n.itemType];o.innerHTML=`<img src="${Rn(a.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(o.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),o.style.position="fixed",o.style.left=`${i.clientX-25}px`,o.style.top=`${i.clientY-25}px`,o.style.pointerEvents="none",o.style.zIndex="9999",o.style.background="rgba(0,0,0,0.8)",o.style.border="2px solid #4CAF50",o.style.borderRadius="4px",o.style.padding="4px",document.body.appendChild(o),this.touchDragGhost=o}handleTouchMove(e){if(this.touchDragSlotIndex===null||!this.touchDragGhost)return;e.preventDefault();const t=e.touches[0];this.touchDragGhost.style.left=`${t.clientX-25}px`,this.touchDragGhost.style.top=`${t.clientY-25}px`,document.querySelectorAll(".inventory-slot.drag-over").forEach(r=>{r.classList.remove("drag-over")});const n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");i&&i.classList.add("drag-over")}handleTouchEnd(e){if(this.touchDragSlotIndex===null)return;e.preventDefault();const t=e.changedTouches[0],n=document.elementFromPoint(t.clientX,t.clientY),i=n==null?void 0:n.closest(".inventory-slot");if(i){const r=parseInt(i.dataset.slot||"-1");r>=0&&r!==this.touchDragSlotIndex&&(this.inventory.swapSlots(this.touchDragSlotIndex,r),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}document.querySelectorAll(".inventory-slot.dragging").forEach(r=>{r.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(r=>{r.classList.remove("drag-over")}),this.touchDragGhost&&(this.touchDragGhost.remove(),this.touchDragGhost=null),this.touchDragSlotIndex=null}handleDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===ut.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const r=document.createElement("div");r.className="drag-ghost";const o=Ht[n.itemType];r.innerHTML=`<img src="${Rn(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(r.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(r),this.dragGhost=r,r.style.position="fixed",r.style.top="-100px",r.style.left="-100px",r.style.pointerEvents="none",r.style.zIndex="9999",r.style.background="rgba(0,0,0,0.8)",r.style.border="2px solid #4CAF50",r.style.borderRadius="4px",r.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(r,25,25)}handleDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".inventory-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".inventory-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e,t){e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=this.draggedSlotIndex;i===null||i===t||(this.inventory.swapSlots(i,t),this.updateInventorySlots(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback())}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,document.exitPointerLock(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}toggle(){this.isOpen?this.close():this.open()}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}updateUI(){this.updateInventorySlots(),this.updateRecipeList()}updateInventorySlots(){var i,r;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((o,a)=>{const l=9+a;this.updateSlotElement(o,e[l])});const n=(r=this.inventoryHotbarElement)==null?void 0:r.querySelectorAll(".inventory-slot");n==null||n.forEach((o,a)=>{this.updateSlotElement(o,e[a])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");if(t.itemType!==ut.NONE&&t.quantity>0){const r=Ht[t.itemType];n&&(n.src=Rn(r.texture),n.style.display="block"),i&&(i.textContent=t.quantity>1?t.quantity.toString():"")}else n&&(n.style.display="none"),i&&(i.textContent="")}updateRecipeList(){if(this.recipeListElement){this.recipeListElement.innerHTML="";for(const e of im){const t=this.createRecipeElement(e);this.recipeListElement.appendChild(t)}}}createRecipeElement(e){const t=document.createElement("div");t.className="recipe-item";const n=this.canCraft(e);n||t.classList.add("disabled");for(const l of e.inputs){const c=document.createElement("img");c.src=Rn(Ht[l.itemType].texture),c.title=`${l.quantity}x ${Ht[l.itemType].name}`,t.appendChild(c);const h=document.createElement("span");h.textContent=`x${l.quantity}`,t.appendChild(h)}const i=document.createElement("span");i.className="recipe-arrow",i.textContent=" → ",t.appendChild(i);const r=document.createElement("img");r.src=Rn(Ht[e.output.itemType].texture),r.title=`${e.output.quantity}x ${Ht[e.output.itemType].name}`,t.appendChild(r);const o=document.createElement("span");o.textContent=`x${e.output.quantity}`,t.appendChild(o);const a=document.createElement("span");return a.textContent=` (${e.name})`,a.style.color="#888",t.appendChild(a),n&&t.addEventListener("click",()=>this.craft(e)),t}canCraft(e){for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craft(e){if(this.canCraft(e)){for(const t of e.inputs)this.inventory.removeItem(t.itemType,t.quantity);this.inventory.addItem(e.output.itemType,e.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback()}}}function Na(s){switch(s){case k.STONE:return ut.STONE;case k.DIRT:return ut.DIRT;case k.GRASS:return ut.DIRT;case k.WOOD:return ut.WOOD;case k.SAND:return ut.SAND;default:return ut.NONE}}function rm(s){switch(s){case ut.STONE:return k.STONE;case ut.DIRT:return k.DIRT;case ut.GRASS:return k.DIRT;case ut.WOOD:return k.WOOD;case ut.SAND:return k.SAND;default:return k.AIR}}class om{constructor(e,t,n){N(this,"planets");N(this,"player");N(this,"scene");N(this,"raycaster");N(this,"inventory");N(this,"craftingSystem");N(this,"blockWireframe",null);N(this,"treeManager",null);N(this,"rightClickCooldown",0);N(this,"CLICK_COOLDOWN",.25);N(this,"MAX_REACH",8);N(this,"miningTarget",null);N(this,"miningTreeTarget",null);N(this,"miningProgress",0);N(this,"miningProgressContainer",null);N(this,"miningProgressBar",null);N(this,"draggedSlotIndex",null);N(this,"dragGhost",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new th,this.inventory=new nm,this.craftingSystem=new sm(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{const i=document.getElementById("game-container");i&&i.requestPointerLock()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.setupHotbarDragDrop(),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}setupHotbarDragDrop(){document.querySelectorAll(".hotbar-slot").forEach((t,n)=>{const i=t;i.draggable=!0;const r=i.querySelector("img");r&&(r.draggable=!1),i.addEventListener("dragstart",o=>this.handleHotbarDragStart(o,n)),i.addEventListener("dragend",()=>this.handleHotbarDragEnd()),i.addEventListener("dragover",o=>this.handleHotbarDragOver(o)),i.addEventListener("dragleave",o=>this.handleHotbarDragLeave(o)),i.addEventListener("drop",o=>this.handleHotbarDrop(o,n)),i.addEventListener("touchstart",o=>{o.preventDefault(),this.inventory.setSelectedSlot(n),this.updateHotbarUI(),this.updateBlockTypeUI()},{passive:!1})})}handleHotbarDragStart(e,t){var a,l;const n=this.inventory.getSlot(t);if(!n||n.itemType===ut.NONE){e.preventDefault();return}this.draggedSlotIndex=t,(a=e.dataTransfer)==null||a.setData("text/plain",t.toString()),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),e.target.classList.add("dragging");const r=document.createElement("div");r.className="drag-ghost";const o=Ht[n.itemType];r.innerHTML=`<img src="${Rn(o.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`,n.quantity>1&&(r.innerHTML+=`<span class="ghost-count">${n.quantity}</span>`),document.body.appendChild(r),this.dragGhost=r,r.style.position="fixed",r.style.top="-100px",r.style.left="-100px",r.style.pointerEvents="none",r.style.zIndex="9999",r.style.background="rgba(0,0,0,0.8)",r.style.border="2px solid #4CAF50",r.style.borderRadius="4px",r.style.padding="4px",(l=e.dataTransfer)==null||l.setDragImage(r,25,25)}handleHotbarDragEnd(){this.draggedSlotIndex=null,document.querySelectorAll(".hotbar-slot.dragging").forEach(e=>{e.classList.remove("dragging")}),document.querySelectorAll(".hotbar-slot.drag-over").forEach(e=>{e.classList.remove("drag-over")}),this.dragGhost&&(this.dragGhost.remove(),this.dragGhost=null)}handleHotbarDragOver(e){e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.currentTarget.classList.add("drag-over")}handleHotbarDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleHotbarDrop(e,t){e.preventDefault(),e.currentTarget.classList.remove("drag-over");const i=this.draggedSlotIndex;i===null||i===t||(this.inventory.swapSlots(i,t),this.updateHotbarUI())}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const r=e[i],o=n.querySelector("img");let a=n.querySelector(".item-count");if(r.itemType!==ut.NONE&&r.quantity>0){const l=Ht[r.itemType];o&&(o.src=Rn(l.texture),o.style.display="block"),a||(a=document.createElement("span"),a.className="item-count",n.appendChild(a)),a.textContent=r.quantity>1?r.quantity.toString():""}else o&&(o.style.display="none"),a&&(a.textContent="");n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}createHighlightMesh(){const e=new il({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new rt;this.blockWireframe=new zc(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;const r=e.getBlockHeight(),o=e.depthToRadius(n),a=o-r,l=[],c=i.vertices.length,h=[],u=[];for(const d of i.vertices){const g=d.clone().normalize();h.push(g.clone().multiplyScalar(a).add(e.center)),u.push(g.clone().multiplyScalar(o).add(e.center))}for(let d=0;d<c;d++){const g=(d+1)%c;l.push(u[d].x,u[d].y,u[d].z),l.push(u[g].x,u[g].y,u[g].z)}for(let d=0;d<c;d++){const g=(d+1)%c;l.push(h[d].x,h[d].y,h[d].z),l.push(h[g].x,h[g].y,h[g].z)}for(let d=0;d<c;d++)l.push(u[d].x,u[d].y,u[d].z),l.push(h[d].x,h[d].y,h[d].z);this.blockWireframe.geometry.dispose();const f=new rt;f.setAttribute("position",new _e(l,3)),this.blockWireframe.geometry=f}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==ut.NONE?t.textContent=`Block: ${Ht[e.itemType].name}`:t.textContent="Block: None")}update(e,t,n){var g;if(this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e),this.craftingSystem.isMenuOpen()){this.blockWireframe&&(this.blockWireframe.visible=!1),this.resetMining();return}const i=this.player.getRaycastOrigin(),r=this.player.getForwardVector();this.raycaster.set(i,r),this.raycaster.far=this.MAX_REACH;const o=((g=this.treeManager)==null?void 0:g.getTreeMeshes())??[],a=this.raycaster.intersectObjects(o,!1);let l=null,c=null,h=1/0;for(const x of this.planets){const m=x.raycast(i,r,this.MAX_REACH);if(m){const p=i.distanceTo(m.point);p<h&&(h=p,l=m,c=x)}}let u=!1,f=!1,d=null;if(a.length>0&&l?a[0].distance<h?(u=!0,d=a[0]):f=!0:a.length>0?(u=!0,d=a[0]):l&&(f=!0),u&&d){const x=d.object;this.blockWireframe&&(this.blockWireframe.visible=!1);const m=x.userData.treeType;t?this.handleTreeMining(e,x,m):this.resetMining()}else if(f&&l&&c){const{tileIndex:x,depth:m,blockType:p,prevTileIndex:S,prevDepth:y}=l;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(c,x,m)),t&&p!==k.AIR?this.handleMining(e,c,x,m,p):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(c,S,y),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1),this.resetMining()}handleMining(e,t,n,i,r){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:r},this.miningProgress=0);const o=Na(r),a=Ht[o].mineTime;this.miningProgress+=e/a,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,r),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?ut.LOG:ut.LEAVES,r=Ht[i].mineTime;this.miningProgress+=e/r,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){const n=t==="trunk"?ut.LOG:ut.LEAVES,i=t==="trunk"?Math.floor(Math.random()*5)+4:Math.floor(Math.random()*3)+1;if(this.inventory.addItem(n,i),this.updateHotbarUI(),this.treeManager){let r=e.parent;for(;r&&!(r instanceof Wt&&r.children.some(o=>o.userData.isTree));)r=r.parent;r instanceof Wt&&this.treeManager.removeTree(r)}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){const r=e.getMaxDepth();if(n>=r-1)return;const o=Na(i);o!==ut.NONE&&(this.inventory.addItem(o,1),this.updateHotbarUI()),e.setBlock(t,n,k.AIR)}placeBlock(e,t,n){if(n<0)return;const i=this.inventory.getSelectedItem();if(i.itemType===ut.NONE||i.quantity===0)return;const r=rm(i.itemType);if(r===k.AIR)return;const o=e.getTileAtPoint(this.player.position);if(o&&o.index===t){const a=this.player.position.distanceTo(e.center),l=a+1.8,c=e.depthToRadius(n),h=c-1;if(c>a&&h<l)return}this.inventory.useSelectedItem()&&(e.setBlock(t,n,r),this.updateHotbarUI())}getInventory(){return this.inventory}getCraftingSystem(){return this.craftingSystem}setTreeManager(e){this.treeManager=e}}let am=class{constructor(e){N(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const vs={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function Fa(s,e){return new Tt({uniforms:{baseColor:{value:s},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
    `})}class lm{constructor(e){N(this,"trunkMaterial");N(this,"leavesMaterial");N(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new L(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize(),this.trunkMaterial=Fa(new Le(9127187),this.sunDirection),this.leavesMaterial=Fa(new Le(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...vs,...n},r=new Wt,o=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6),a=new Xe(o,this.trunkMaterial);a.userData.isTree=!0,a.userData.treeType="trunk",r.add(a);let l=i.trunkHeight,c=i.leafBaseRadius;for(let f=0;f<i.leafLayers;f++){const g=new So(c,1.2,6),x=new Xe(g,this.leavesMaterial);x.position.y=l+1.2/2,x.userData.isTree=!0,x.userData.treeType="leaves",r.add(x),l+=1.2*.6,c*=i.leafTaper}const h=new L(0,1,0),u=new an().setFromUnitVectors(h,t.clone().normalize());return r.quaternion.copy(u),r.position.copy(e),r}createHexagonalPrism(e,t,n){const i=new As(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class cm{constructor(e,t){N(this,"trees",[]);N(this,"treesByTile",new Map);N(this,"treeBuilder");N(this,"scene");this.scene=e,this.treeBuilder=new lm(t)}addTree(e,t,n,i){const r=e.clone().sub(t).normalize(),o=this.treeBuilder.createTree(e,r,n);return i!==void 0&&(o.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(o)),this.trees.push(o),this.scene.add(o),o}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),r=i.indexOf(e);r>=0&&i.splice(r,1)}e.traverse(i=>{i instanceof Xe&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Xe&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,r,o=V.TERRAIN_SEED,a){const l=new am(o+54321);let c=0,h=0;const u=n*5;for(;c<n&&h<u;){h++;const f=l.next()*Math.PI*2,d=Math.acos(2*l.next()-1),g=new L(Math.sin(d)*Math.cos(f),Math.sin(d)*Math.sin(f),Math.cos(d)).normalize();if(r&&r(g))continue;const x=i(g),m=e.clone().add(g.clone().multiplyScalar(x)),p=a?a(g):void 0,S=.5+l.next()*1,y=.6+l.next()*.9,T={trunkHeight:vs.trunkHeight*S*y,trunkRadius:vs.trunkRadius*S,leafBaseRadius:vs.leafBaseRadius*S,leafLayers:Math.floor(2+l.next()*4),leafTaper:.6+l.next()*.2};this.addTree(m,e,T,p??void 0),c++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const r of n)r.visible=i}}setAllVisible(e){for(const t of this.trees)t.visible=e}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var hm=`varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,um=`precision highp float;

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
}`;function dm(s){const e=s.planetRadius*V.ATMOSPHERE_RADIUS_MULT,t=s.planetRadius-V.ATMOSPHERE_SURFACE_OFFSET;return new Tt({uniforms:{planetCenter:{value:new L(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:s.sunDirection.clone().normalize()},viewerPosition:{value:new L},rayleighScale:{value:V.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:V.ATMOSPHERE_MIE_SCALE},mieG:{value:V.ATMOSPHERE_MIE_G},sunIntensity:{value:V.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:V.ATMOSPHERE_SAMPLES},numLightSamples:{value:V.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:hm,fragmentShader:um,transparent:!0,side:Pt,depthWrite:!1,blending:dr})}class fm{constructor(e){N(this,"mesh");N(this,"material");const t=e.planetRadius*V.ATMOSPHERE_RADIUS_MULT,n=new Fi(t,64,48);this.material=dm(e),this.mesh=new Xe(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function pm(s,e){return new fm({planetRadius:s,sunDirection:e})}var mm=`varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,gm=`precision highp float;

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
}`;const xm={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class _m{constructor(e){N(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function vm(s,e,t,n){const i=[],r=[],o=[],a=s.clone().sub(t).normalize();let l=new L(1,0,0);Math.abs(a.dot(l))>.9&&(l=new L(0,0,1));const c=new L().crossVectors(a,l).normalize(),h=new L().crossVectors(c,a).normalize(),u=3+Math.floor(n.next()*4);for(let d=0;d<u;d++){const g=(n.next()-.5)*e*.8,x=(n.next()-.5)*e*.4,m=(n.next()-.5)*e*.8,p=s.clone().addScaledVector(c,g).addScaledVector(a,x).addScaledVector(h,m),S=e*(.3+n.next()*.4);Sm(i,r,o,p,S,a,c,h)}if(i.length===0)return null;const f=new rt;return f.setAttribute("position",new _e(i,3)),f.setAttribute("normal",new _e(r,3)),f.setIndex(o),f.computeBoundingSphere(),f}function Sm(s,e,t,n,i,r,o,a){const l=i/2,c=[];for(let u=0;u<8;u++){const f=u&1?l:-l,d=u&2?l:-l,g=u&4?l:-l,x=n.clone().addScaledVector(o,f).addScaledVector(r,d).addScaledVector(a,g);c.push(x)}const h=[{verts:[0,1,3,2],normal:a.clone().negate()},{verts:[4,6,7,5],normal:a.clone()},{verts:[0,2,6,4],normal:o.clone().negate()},{verts:[1,5,7,3],normal:o.clone()},{verts:[0,4,5,1],normal:r.clone().negate()},{verts:[2,3,7,6],normal:r.clone()}];for(const u of h){const f=s.length/3;for(const d of u.verts){const g=c[d];s.push(g.x,g.y,g.z),e.push(u.normal.x,u.normal.y,u.normal.z)}t.push(f,f+1,f+2,f,f+2,f+3)}}function bm(s){return new Tt({uniforms:{sunDirection:{value:s.clone().normalize()},cloudColor:{value:new Le(16777215)},shadowColor:{value:new Le(8947882)},ambientIntensity:{value:.4}},vertexShader:mm,fragmentShader:gm,transparent:!0,side:Vt,depthWrite:!0})}class ym{constructor(e={},t){N(this,"clouds");N(this,"material");N(this,"config");this.config={...xm,...e},this.clouds=new Wt,this.material=bm(t),this.generateClouds()}generateClouds(){const e=new _m(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity);for(let i=0;i<n;i++){const r=e.next()*Math.PI*2,o=Math.acos(2*e.next()-1),a=(e.next()-.5)*this.config.cloudThickness,l=t+a,c=l*Math.sin(o)*Math.cos(r),h=l*Math.sin(o)*Math.sin(r),u=l*Math.cos(o),f=new L(c,h,u),d=new L(0,0,0),g=vm(f,this.config.cloudScale*(.5+e.next()*.5),d,e);if(g){const x=new Xe(g,this.material);this.clouds.add(x)}}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function Mm(s,e){return new ym({planetRadius:s,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:V.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:V.CLOUD_ROTATION_SPEED},e)}class Em{constructor(){N(this,"engine");N(this,"inputManager");N(this,"earth");N(this,"moon");N(this,"player");N(this,"blockInteraction");N(this,"treeManager");N(this,"earthAtmosphere",null);N(this,"earthClouds",null);N(this,"isReady",!1);N(this,"elapsedTime",0);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");this.engine=new $p(e),this.inputManager=new qp,this.earth=new Ia(this.engine.scene,100,V.EARTH_SUBDIVISIONS),this.moon=new Ia(this.engine.scene,50,V.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,this.inputManager.setPointerLockCallback(t=>{const n=document.getElementById("instructions"),i=document.getElementById("inventory-menu"),r=i==null?void 0:i.classList.contains("active");n&&(n.style.display=t||r?"none":"block",!t&&!r&&console.log("Menu opened"));const o=document.getElementById("crosshair");o&&(o.style.display=t?"block":"none")}),this.init()}async init(){try{await this.earth.initialize(),await this.moon.initialize(),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),this.player=new tm(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new om([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new cm(this.engine.scene,this.engine.sunDirection),this.treeManager.scatterTrees(this.earth.center,this.earth.radius,V.TREE_COUNT,t=>this.earth.getSurfaceHeightInDirection(t),t=>this.earth.isUnderwaterInDirection(t),V.TERRAIN_SEED,t=>this.earth.getTileIndexInDirection(t)),this.blockInteraction.setTreeManager(this.treeManager),this.inputManager.setInventoryToggleCallback(()=>{this.blockInteraction.getCraftingSystem().toggle()}),V.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=pm(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=Mm(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection);const e=this.earth.getWaterShaderMaterial();e&&this.engine.registerWaterMaterial(e),this.setupSettingsMenu(),ge.setFrameSpikeThreshold(V.FRAME_SPIKE_THRESHOLD_MS),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,ge.begin("Player"),this.player.update(e),ge.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),ge.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera),ge.end("Earth Update"),ge.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera),ge.end("Moon Update");const t=this.player.getIsInWater();this.earth.updateWaterShader(this.elapsedTime,t),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.earth.isInOrbitView()?this.treeManager.setAllVisible(!1):this.treeManager.setAllVisible(!0),ge.begin("Block Interaction");const n=this.inputManager.getState(),i=this.inputManager.isLocked();this.blockInteraction.update(e,i&&n.leftClick,i&&n.rightClick),ge.end("Block Interaction")}setupSettingsMenu(){var a;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),r=document.getElementById("teleport-select"),o=document.querySelectorAll(".menu-tab");o.forEach(l=>{l.addEventListener("click",()=>{o.forEach(u=>u.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(u=>u.classList.remove("active")),l.classList.add("active");const c=l.getAttribute("data-tab"),h=document.getElementById(`tab-${c}`);h&&h.classList.add("active")})}),!(!e||!t)&&(e.checked=((a=this.earthAtmosphere)==null?void 0:a.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=!1,this.player.setJetpackEnabled(!1),n.addEventListener("change",()=>{this.player.setJetpackEnabled(n.checked)})),i&&(i.checked=V.INVERT_Y_AXIS,i.addEventListener("change",()=>{V.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),r&&r.addEventListener("change",()=>{this.teleportToPlanet(r.value)}))}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1,i=t.center.clone();if(e==="earth"){const r=new L(0,1,0),o=t.getSurfaceHeightInDirection(r);i.y+=o+n}else{const r=new L(-1,0,0),o=t.getSurfaceHeightInDirection(r);i.x-=o+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}}document.addEventListener("DOMContentLoaded",()=>{new Em});
//# sourceMappingURL=index-DqvxYE7V.js.map
