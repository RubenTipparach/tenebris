var vl=Object.defineProperty;var Sl=(s,e,t)=>e in s?vl(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var F=(s,e,t)=>Sl(s,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const so="181",bl=0,Po=1,Ml=2,Oa=1,Ba=2,xn=3,Pn=0,Dt=1,Vt=2,vn=0,li=1,dr=2,Do=3,Io=4,yl=5,Gn=100,El=101,Tl=102,Al=103,Rl=104,wl=200,Cl=201,Pl=202,Dl=203,fr=204,pr=205,Il=206,Ll=207,Ul=208,Nl=209,Fl=210,Ol=211,Bl=212,kl=213,zl=214,mr=0,gr=1,xr=2,hi=3,_r=4,vr=5,Sr=6,br=7,ro=0,Gl=1,Vl=2,Cn=0,Hl=1,Wl=2,Xl=3,ql=4,Yl=5,$l=6,Kl=7,ka=300,ui=301,di=302,Mr=303,yr=304,Ts=306,Pi=1e3,_n=1001,Er=1002,Rt=1003,Jl=1004,Hi=1005,$t=1006,Ls=1007,Wn=1008,cn=1009,za=1010,Ga=1011,Di=1012,oo=1013,Xn=1014,tn=1015,gi=1016,ao=1017,lo=1018,Ii=1020,Va=35902,Ha=35899,Wa=1021,Xa=1022,nn=1023,Li=1026,Ui=1027,qa=1028,co=1029,ho=1030,uo=1031,fo=1033,ps=33776,ms=33777,gs=33778,xs=33779,Tr=35840,Ar=35841,Rr=35842,wr=35843,Cr=36196,Pr=37492,Dr=37496,Ir=37808,Lr=37809,Ur=37810,Nr=37811,Fr=37812,Or=37813,Br=37814,kr=37815,zr=37816,Gr=37817,Vr=37818,Hr=37819,Wr=37820,Xr=37821,qr=36492,Yr=36494,$r=36495,Kr=36283,Jr=36284,jr=36285,Zr=36286,jl=3200,Zl=3201,Ya=0,Ql=1,Rn="",qt="srgb",fi="srgb-linear",bs="linear",at="srgb",Yn=7680,Lo=519,ec=512,tc=513,nc=514,$a=515,ic=516,sc=517,rc=518,oc=519,Uo=35044,No="300 es",an=2e3,Ms=2001;function Ka(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Ni(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function ac(){const s=Ni("canvas");return s.style.display="block",s}const Fo={};function Oo(...s){const e="THREE."+s.shift();console.log(e,...s)}function Xe(...s){const e="THREE."+s.shift();console.warn(e,...s)}function gt(...s){const e="THREE."+s.shift();console.error(e,...s)}function Fi(...s){const e=s.join(" ");e in Fo||(Fo[e]=!0,Xe(...s))}function lc(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}class xi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,a=i.length;r<a;r++)i[r].call(this,e);e.target=null}}}const Ct=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Us=Math.PI/180,Qr=180/Math.PI;function Bi(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ct[s&255]+Ct[s>>8&255]+Ct[s>>16&255]+Ct[s>>24&255]+"-"+Ct[e&255]+Ct[e>>8&255]+"-"+Ct[e>>16&15|64]+Ct[e>>24&255]+"-"+Ct[t&63|128]+Ct[t>>8&255]+"-"+Ct[t>>16&255]+Ct[t>>24&255]+Ct[n&255]+Ct[n>>8&255]+Ct[n>>16&255]+Ct[n>>24&255]).toLowerCase()}function Ze(s,e,t){return Math.max(e,Math.min(t,s))}function cc(s,e){return(s%e+e)%e}function Ns(s,e,t){return(1-t)*s+t*e}function bi(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Ft(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}class et{constructor(e=0,t=0){et.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*i+e.x,this.y=r*i+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ln{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,a,o){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3],d=r[a+0],f=r[a+1],g=r[a+2],x=r[a+3];if(o<=0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u;return}if(o>=1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=x;return}if(u!==x||l!==d||c!==f||h!==g){let m=l*d+c*f+h*g+u*x;m<0&&(d=-d,f=-f,g=-g,x=-x,m=-m);let p=1-o;if(m<.9995){const y=Math.acos(m),M=Math.sin(y);p=Math.sin(p*y)/M,o=Math.sin(o*y)/M,l=l*p+d*o,c=c*p+f*o,h=h*p+g*o,u=u*p+x*o}else{l=l*p+d*o,c=c*p+f*o,h=h*p+g*o,u=u*p+x*o;const y=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=y,c*=y,h*=y,u*=y}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,a){const o=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=r[a],d=r[a+1],f=r[a+2],g=r[a+3];return e[t]=o*g+h*u+l*f-c*d,e[t+1]=l*g+h*d+c*u-o*f,e[t+2]=c*g+h*f+o*d-l*u,e[t+3]=h*g-o*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(i/2),u=o(r/2),d=l(n/2),f=l(i/2),g=l(r/2);switch(a){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:Xe("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(a-i)*f}else if(n>o&&n>u){const f=2*Math.sqrt(1+n-o-u);this._w=(h-l)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(r+c)/f}else if(o>u){const f=2*Math.sqrt(1+o-n-u);this._w=(r-c)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-o);this._w=(a-i)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ze(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+i*c-r*l,this._y=i*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-i*o,this._w=a*h-n*o-i*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,i=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,i=-i,r=-r,a=-a,o=-o);let l=1-t;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+r*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class I{constructor(e=0,t=0,n=0){I.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Bo.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Bo.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*i-o*n),h=2*(o*t-r*i),u=2*(r*n-a*t);return this.x=t+l*c+a*u-o*h,this.y=n+l*h+o*c-r*u,this.z=i+l*u+r*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this.z=Ze(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this.z=Ze(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,a=t.x,o=t.y,l=t.z;return this.x=i*l-r*o,this.y=r*a-n*l,this.z=n*o-i*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Fs.copy(this).projectOnVector(e),this.sub(Fs)}reflect(e){return this.sub(Fs.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ze(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Fs=new I,Bo=new ln;class qe{constructor(e,t,n,i,r,a,o,l,c){qe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,a,o,l,c)}set(e,t,n,i,r,a,o,l,c){const h=this.elements;return h[0]=e,h[1]=i,h[2]=o,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],x=i[0],m=i[3],p=i[6],y=i[1],M=i[4],T=i[7],R=i[2],b=i[5],A=i[8];return r[0]=a*x+o*y+l*R,r[3]=a*m+o*M+l*b,r[6]=a*p+o*T+l*A,r[1]=c*x+h*y+u*R,r[4]=c*m+h*M+u*b,r[7]=c*p+h*T+u*A,r[2]=d*x+f*y+g*R,r[5]=d*m+f*M+g*b,r[8]=d*p+f*T+g*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*r*h+n*o*l+i*r*c-i*a*l}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=h*a-o*c,d=o*l-h*r,f=c*r-a*l,g=t*u+n*d+i*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=u*x,e[1]=(i*c-h*n)*x,e[2]=(o*n-i*a)*x,e[3]=d*x,e[4]=(h*t-i*l)*x,e[5]=(i*r-o*t)*x,e[6]=f*x,e[7]=(n*l-c*t)*x,e[8]=(a*t-n*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-i*c,i*l,-i*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Os.makeScale(e,t)),this}rotate(e){return this.premultiply(Os.makeRotation(-e)),this}translate(e,t){return this.premultiply(Os.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Os=new qe,ko=new qe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),zo=new qe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function hc(){const s={enabled:!0,workingColorSpace:fi,spaces:{},convert:function(i,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===at&&(i.r=Sn(i.r),i.g=Sn(i.g),i.b=Sn(i.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===at&&(i.r=ci(i.r),i.g=ci(i.g),i.b=ci(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Rn?bs:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,a){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return Fi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return Fi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[fi]:{primaries:e,whitePoint:n,transfer:bs,toXYZ:ko,fromXYZ:zo,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:qt},outputColorSpaceConfig:{drawingBufferColorSpace:qt}},[qt]:{primaries:e,whitePoint:n,transfer:at,toXYZ:ko,fromXYZ:zo,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:qt}}}),s}const nt=hc();function Sn(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ci(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let $n;class uc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{$n===void 0&&($n=Ni("canvas")),$n.width=e.width,$n.height=e.height;const i=$n.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=$n}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ni("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let a=0;a<r.length;a++)r[a]=Sn(r[a]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Sn(t[n]/255)*255):t[n]=Sn(t[n]);return{data:t,width:e.width,height:e.height}}else return Xe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let dc=0;class po{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:dc++}),this.uuid=Bi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?r.push(Bs(i[a].image)):r.push(Bs(i[a]))}else r=Bs(i);n.url=r}return t||(e.images[this.uuid]=n),n}}function Bs(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?uc.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(Xe("Texture: Unable to serialize Texture."),{})}let fc=0;const ks=new I;class wt extends xi{constructor(e=wt.DEFAULT_IMAGE,t=wt.DEFAULT_MAPPING,n=_n,i=_n,r=$t,a=Wn,o=nn,l=cn,c=wt.DEFAULT_ANISOTROPY,h=Rn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fc++}),this.uuid=Bi(),this.name="",this.source=new po(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new et(0,0),this.repeat=new et(1,1),this.center=new et(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new qe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(ks).x}get height(){return this.source.getSize(ks).y}get depth(){return this.source.getSize(ks).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Xe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Xe(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ka)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Pi:e.x=e.x-Math.floor(e.x);break;case _n:e.x=e.x<0?0:1;break;case Er:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Pi:e.y=e.y-Math.floor(e.y);break;case _n:e.y=e.y<0?0:1;break;case Er:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}wt.DEFAULT_IMAGE=null;wt.DEFAULT_MAPPING=ka;wt.DEFAULT_ANISOTROPY=1;class xt{constructor(e=0,t=0,n=0,i=1){xt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*i+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*i+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*i+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],x=l[2],m=l[6],p=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const M=(c+1)/2,T=(f+1)/2,R=(p+1)/2,b=(h+d)/4,A=(u+x)/4,w=(g+m)/4;return M>T&&M>R?M<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(M),i=b/n,r=A/n):T>R?T<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(T),n=b/i,r=w/i):R<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(R),n=A/r,i=w/r),this.set(n,i,r,t),this}let y=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(y)<.001&&(y=1),this.x=(m-g)/y,this.y=(u-x)/y,this.z=(d-h)/y,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ze(this.x,e.x,t.x),this.y=Ze(this.y,e.y,t.y),this.z=Ze(this.z,e.z,t.z),this.w=Ze(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ze(this.x,e,t),this.y=Ze(this.y,e,t),this.z=Ze(this.z,e,t),this.w=Ze(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ze(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class pc extends xi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:$t,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new xt(0,0,e,t),this.scissorTest=!1,this.viewport=new xt(0,0,e,t);const i={width:e,height:t,depth:n.depth},r=new wt(i);this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:$t,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new po(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Dn extends pc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Ja extends wt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class mc extends wt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Rt,this.minFilter=Rt,this.wrapR=_n,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ki{constructor(e=new I(1/0,1/0,1/0),t=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Jt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Jt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Jt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Jt):Jt.fromBufferAttribute(r,a),Jt.applyMatrix4(e.matrixWorld),this.expandByPoint(Jt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Wi.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Wi.copy(n.boundingBox)),Wi.applyMatrix4(e.matrixWorld),this.union(Wi)}const i=e.children;for(let r=0,a=i.length;r<a;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Jt),Jt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Mi),Xi.subVectors(this.max,Mi),Kn.subVectors(e.a,Mi),Jn.subVectors(e.b,Mi),jn.subVectors(e.c,Mi),bn.subVectors(Jn,Kn),Mn.subVectors(jn,Jn),Un.subVectors(Kn,jn);let t=[0,-bn.z,bn.y,0,-Mn.z,Mn.y,0,-Un.z,Un.y,bn.z,0,-bn.x,Mn.z,0,-Mn.x,Un.z,0,-Un.x,-bn.y,bn.x,0,-Mn.y,Mn.x,0,-Un.y,Un.x,0];return!zs(t,Kn,Jn,jn,Xi)||(t=[1,0,0,0,1,0,0,0,1],!zs(t,Kn,Jn,jn,Xi))?!1:(qi.crossVectors(bn,Mn),t=[qi.x,qi.y,qi.z],zs(t,Kn,Jn,jn,Xi))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Jt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Jt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(un[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),un[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),un[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),un[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),un[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),un[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),un[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),un[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(un),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const un=[new I,new I,new I,new I,new I,new I,new I,new I],Jt=new I,Wi=new ki,Kn=new I,Jn=new I,jn=new I,bn=new I,Mn=new I,Un=new I,Mi=new I,Xi=new I,qi=new I,Nn=new I;function zs(s,e,t,n,i){for(let r=0,a=s.length-3;r<=a;r+=3){Nn.fromArray(s,r);const o=i.x*Math.abs(Nn.x)+i.y*Math.abs(Nn.y)+i.z*Math.abs(Nn.z),l=e.dot(Nn),c=t.dot(Nn),h=n.dot(Nn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const gc=new ki,yi=new I,Gs=new I;class pi{constructor(e=new I,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):gc.setFromPoints(e).getCenter(n);let i=0;for(let r=0,a=e.length;r<a;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yi.subVectors(e,this.center);const t=yi.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(yi,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Gs.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yi.copy(e.center).add(Gs)),this.expandByPoint(yi.copy(e.center).sub(Gs))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const dn=new I,Vs=new I,Yi=new I,yn=new I,Hs=new I,$i=new I,Ws=new I;class mo{constructor(e=new I,t=new I(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,dn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=dn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(dn.copy(this.origin).addScaledVector(this.direction,t),dn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Vs.copy(e).add(t).multiplyScalar(.5),Yi.copy(t).sub(e).normalize(),yn.copy(this.origin).sub(Vs);const r=e.distanceTo(t)*.5,a=-this.direction.dot(Yi),o=yn.dot(this.direction),l=-yn.dot(Yi),c=yn.lengthSq(),h=Math.abs(1-a*a);let u,d,f,g;if(h>0)if(u=a*l-o,d=a*o-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const x=1/h;u*=x,d*=x,f=u*(u+a*d+2*o)+d*(a*u+d+2*l)+c}else d=r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Vs).addScaledVector(Yi,d),f}intersectSphere(e,t){dn.subVectors(e.center,this.origin);const n=dn.dot(this.direction),i=dn.dot(dn)-n*n,r=e.radius*e.radius;if(i>r)return null;const a=Math.sqrt(r-i),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,i=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,i=(e.min.x-d.x)*c),h>=0?(r=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||r>i||((r>n||isNaN(n))&&(n=r),(a<i||isNaN(i))&&(i=a),u>=0?(o=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,dn)!==null}intersectTriangle(e,t,n,i,r){Hs.subVectors(t,e),$i.subVectors(n,e),Ws.crossVectors(Hs,$i);let a=this.direction.dot(Ws),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;yn.subVectors(this.origin,e);const l=o*this.direction.dot($i.crossVectors(yn,$i));if(l<0)return null;const c=o*this.direction.dot(Hs.cross(yn));if(c<0||l+c>a)return null;const h=-o*yn.dot(Ws);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ht{constructor(e,t,n,i,r,a,o,l,c,h,u,d,f,g,x,m){ht.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,a,o,l,c,h,u,d,f,g,x,m)}set(e,t,n,i,r,a,o,l,c,h,u,d,f,g,x,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=r,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=x,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ht().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/Zn.setFromMatrixColumn(e,0).length(),r=1/Zn.setFromMatrixColumn(e,1).length(),a=1/Zn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const d=a*h,f=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+g*c,t[5]=d-x*c,t[9]=-o*l,t[2]=x-d*c,t[6]=g+f*c,t[10]=a*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,g=c*h,x=c*u;t[0]=d+x*o,t[4]=g*o-f,t[8]=a*c,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-g,t[6]=x+d*o,t[10]=a*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,g=c*h,x=c*u;t[0]=d-x*o,t[4]=-a*u,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*h,t[9]=x-d*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const d=a*h,f=a*u,g=o*h,x=o*u;t[0]=l*h,t[4]=g*c-f,t[8]=d*c+x,t[1]=l*u,t[5]=x*c+d,t[9]=f*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const d=a*l,f=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=x-d*u,t[8]=g*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=f*u+g,t[10]=d-x*u}else if(e.order==="XZY"){const d=a*l,f=a*c,g=o*l,x=o*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+x,t[5]=a*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=o*h,t[10]=x*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(xc,e,_c)}lookAt(e,t,n){const i=this.elements;return zt.subVectors(e,t),zt.lengthSq()===0&&(zt.z=1),zt.normalize(),En.crossVectors(n,zt),En.lengthSq()===0&&(Math.abs(n.z)===1?zt.x+=1e-4:zt.z+=1e-4,zt.normalize(),En.crossVectors(n,zt)),En.normalize(),Ki.crossVectors(zt,En),i[0]=En.x,i[4]=Ki.x,i[8]=zt.x,i[1]=En.y,i[5]=Ki.y,i[9]=zt.y,i[2]=En.z,i[6]=Ki.z,i[10]=zt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],x=n[6],m=n[10],p=n[14],y=n[3],M=n[7],T=n[11],R=n[15],b=i[0],A=i[4],w=i[8],_=i[12],v=i[1],C=i[5],L=i[9],N=i[13],O=i[2],z=i[6],W=i[10],ee=i[14],X=i[3],te=i[7],ne=i[11],se=i[15];return r[0]=a*b+o*v+l*O+c*X,r[4]=a*A+o*C+l*z+c*te,r[8]=a*w+o*L+l*W+c*ne,r[12]=a*_+o*N+l*ee+c*se,r[1]=h*b+u*v+d*O+f*X,r[5]=h*A+u*C+d*z+f*te,r[9]=h*w+u*L+d*W+f*ne,r[13]=h*_+u*N+d*ee+f*se,r[2]=g*b+x*v+m*O+p*X,r[6]=g*A+x*C+m*z+p*te,r[10]=g*w+x*L+m*W+p*ne,r[14]=g*_+x*N+m*ee+p*se,r[3]=y*b+M*v+T*O+R*X,r[7]=y*A+M*C+T*z+R*te,r[11]=y*w+M*L+T*W+R*ne,r[15]=y*_+M*N+T*ee+R*se,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],x=e[7],m=e[11],p=e[15];return g*(+r*l*u-i*c*u-r*o*d+n*c*d+i*o*f-n*l*f)+x*(+t*l*f-t*c*d+r*a*d-i*a*f+i*c*h-r*l*h)+m*(+t*c*u-t*o*f-r*a*u+n*a*f+r*o*h-n*c*h)+p*(-i*o*h-t*l*u+t*o*d+i*a*u-n*a*d+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],x=e[13],m=e[14],p=e[15],y=u*m*c-x*d*c+x*l*f-o*m*f-u*l*p+o*d*p,M=g*d*c-h*m*c-g*l*f+a*m*f+h*l*p-a*d*p,T=h*x*c-g*u*c+g*o*f-a*x*f-h*o*p+a*u*p,R=g*u*l-h*x*l-g*o*d+a*x*d+h*o*m-a*u*m,b=t*y+n*M+i*T+r*R;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/b;return e[0]=y*A,e[1]=(x*d*r-u*m*r-x*i*f+n*m*f+u*i*p-n*d*p)*A,e[2]=(o*m*r-x*l*r+x*i*c-n*m*c-o*i*p+n*l*p)*A,e[3]=(u*l*r-o*d*r-u*i*c+n*d*c+o*i*f-n*l*f)*A,e[4]=M*A,e[5]=(h*m*r-g*d*r+g*i*f-t*m*f-h*i*p+t*d*p)*A,e[6]=(g*l*r-a*m*r-g*i*c+t*m*c+a*i*p-t*l*p)*A,e[7]=(a*d*r-h*l*r+h*i*c-t*d*c-a*i*f+t*l*f)*A,e[8]=T*A,e[9]=(g*u*r-h*x*r-g*n*f+t*x*f+h*n*p-t*u*p)*A,e[10]=(a*x*r-g*o*r+g*n*c-t*x*c-a*n*p+t*o*p)*A,e[11]=(h*o*r-a*u*r-h*n*c+t*u*c+a*n*f-t*o*f)*A,e[12]=R*A,e[13]=(h*x*i-g*u*i+g*n*d-t*x*d-h*n*m+t*u*m)*A,e[14]=(g*o*i-a*x*i-g*n*l+t*x*l+a*n*m-t*o*m)*A,e[15]=(a*u*i-h*o*i+h*n*l-t*u*l-a*n*d+t*o*d)*A,this}scale(e){const t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),r=1-n,a=e.x,o=e.y,l=e.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,h*o+n,h*l-i*a,0,c*l-i*o,h*l+i*a,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,a){return this.set(1,n,r,0,e,1,a,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,r=t._x,a=t._y,o=t._z,l=t._w,c=r+r,h=a+a,u=o+o,d=r*c,f=r*h,g=r*u,x=a*h,m=a*u,p=o*u,y=l*c,M=l*h,T=l*u,R=n.x,b=n.y,A=n.z;return i[0]=(1-(x+p))*R,i[1]=(f+T)*R,i[2]=(g-M)*R,i[3]=0,i[4]=(f-T)*b,i[5]=(1-(d+p))*b,i[6]=(m+y)*b,i[7]=0,i[8]=(g+M)*A,i[9]=(m-y)*A,i[10]=(1-(d+x))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let r=Zn.set(i[0],i[1],i[2]).length();const a=Zn.set(i[4],i[5],i[6]).length(),o=Zn.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14],jt.copy(this);const c=1/r,h=1/a,u=1/o;return jt.elements[0]*=c,jt.elements[1]*=c,jt.elements[2]*=c,jt.elements[4]*=h,jt.elements[5]*=h,jt.elements[6]*=h,jt.elements[8]*=u,jt.elements[9]*=u,jt.elements[10]*=u,t.setFromRotationMatrix(jt),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,i,r,a,o=an,l=!1){const c=this.elements,h=2*r/(t-e),u=2*r/(n-i),d=(t+e)/(t-e),f=(n+i)/(n-i);let g,x;if(l)g=r/(a-r),x=a*r/(a-r);else if(o===an)g=-(a+r)/(a-r),x=-2*a*r/(a-r);else if(o===Ms)g=-a/(a-r),x=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,r,a,o=an,l=!1){const c=this.elements,h=2/(t-e),u=2/(n-i),d=-(t+e)/(t-e),f=-(n+i)/(n-i);let g,x;if(l)g=1/(a-r),x=a/(a-r);else if(o===an)g=-2/(a-r),x=-(a+r)/(a-r);else if(o===Ms)g=-1/(a-r),x=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Zn=new I,jt=new ht,xc=new I(0,0,0),_c=new I(1,1,1),En=new I,Ki=new I,zt=new I,Go=new ht,Vo=new ln;class hn{constructor(e=0,t=0,n=0,i=hn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,r=i[0],a=i[4],o=i[8],l=i[1],c=i[5],h=i[9],u=i[2],d=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(Ze(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ze(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ze(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ze(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ze(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ze(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Xe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Go.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Go,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Vo.setFromEuler(this),this.setFromQuaternion(Vo,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}hn.DEFAULT_ORDER="XYZ";class go{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let vc=0;const Ho=new I,Qn=new ln,fn=new ht,Ji=new I,Ei=new I,Sc=new I,bc=new ln,Wo=new I(1,0,0),Xo=new I(0,1,0),qo=new I(0,0,1),Yo={type:"added"},Mc={type:"removed"},ei={type:"childadded",child:null},Xs={type:"childremoved",child:null};class At extends xi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:vc++}),this.uuid=Bi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=At.DEFAULT_UP.clone();const e=new I,t=new hn,n=new ln,i=new I(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ht},normalMatrix:{value:new qe}}),this.matrix=new ht,this.matrixWorld=new ht,this.matrixAutoUpdate=At.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new go,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Qn.setFromAxisAngle(e,t),this.quaternion.multiply(Qn),this}rotateOnWorldAxis(e,t){return Qn.setFromAxisAngle(e,t),this.quaternion.premultiply(Qn),this}rotateX(e){return this.rotateOnAxis(Wo,e)}rotateY(e){return this.rotateOnAxis(Xo,e)}rotateZ(e){return this.rotateOnAxis(qo,e)}translateOnAxis(e,t){return Ho.copy(e).applyQuaternion(this.quaternion),this.position.add(Ho.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Wo,e)}translateY(e){return this.translateOnAxis(Xo,e)}translateZ(e){return this.translateOnAxis(qo,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(fn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Ji.copy(e):Ji.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ei.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?fn.lookAt(Ei,Ji,this.up):fn.lookAt(Ji,Ei,this.up),this.quaternion.setFromRotationMatrix(fn),i&&(fn.extractRotation(i.matrixWorld),Qn.setFromRotationMatrix(fn),this.quaternion.premultiply(Qn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(gt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Yo),ei.child=e,this.dispatchEvent(ei),ei.child=null):gt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Mc),Xs.child=e,this.dispatchEvent(Xs),Xs.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),fn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),fn.multiply(e.parent.matrixWorld)),e.applyMatrix4(fn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Yo),ei.child=e,this.dispatchEvent(ei),ei.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ei,e,Sc),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ei,bc,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));i.material=o}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];i.animations.push(r(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=i,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}At.DEFAULT_UP=new I(0,1,0);At.DEFAULT_MATRIX_AUTO_UPDATE=!0;At.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Zt=new I,pn=new I,qs=new I,mn=new I,ti=new I,ni=new I,$o=new I,Ys=new I,$s=new I,Ks=new I,Js=new xt,js=new xt,Zs=new xt;class en{constructor(e=new I,t=new I,n=new I){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),Zt.subVectors(e,t),i.cross(Zt);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){Zt.subVectors(i,t),pn.subVectors(n,t),qs.subVectors(e,t);const a=Zt.dot(Zt),o=Zt.dot(pn),l=Zt.dot(qs),c=pn.dot(pn),h=pn.dot(qs),u=a*c-o*o;if(u===0)return r.set(0,0,0),null;const d=1/u,f=(c*l-o*h)*d,g=(a*h-o*l)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,mn)===null?!1:mn.x>=0&&mn.y>=0&&mn.x+mn.y<=1}static getInterpolation(e,t,n,i,r,a,o,l){return this.getBarycoord(e,t,n,i,mn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,mn.x),l.addScaledVector(a,mn.y),l.addScaledVector(o,mn.z),l)}static getInterpolatedAttribute(e,t,n,i,r,a){return Js.setScalar(0),js.setScalar(0),Zs.setScalar(0),Js.fromBufferAttribute(e,t),js.fromBufferAttribute(e,n),Zs.fromBufferAttribute(e,i),a.setScalar(0),a.addScaledVector(Js,r.x),a.addScaledVector(js,r.y),a.addScaledVector(Zs,r.z),a}static isFrontFacing(e,t,n,i){return Zt.subVectors(n,t),pn.subVectors(e,t),Zt.cross(pn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Zt.subVectors(this.c,this.b),pn.subVectors(this.a,this.b),Zt.cross(pn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return en.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return en.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return en.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return en.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return en.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,r=this.c;let a,o;ti.subVectors(i,n),ni.subVectors(r,n),Ys.subVectors(e,n);const l=ti.dot(Ys),c=ni.dot(Ys);if(l<=0&&c<=0)return t.copy(n);$s.subVectors(e,i);const h=ti.dot($s),u=ni.dot($s);if(h>=0&&u<=h)return t.copy(i);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector(ti,a);Ks.subVectors(e,r);const f=ti.dot(Ks),g=ni.dot(Ks);if(g>=0&&f<=g)return t.copy(r);const x=f*c-l*g;if(x<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(ni,o);const m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return $o.subVectors(r,i),o=(u-h)/(u-h+(f-g)),t.copy(i).addScaledVector($o,o);const p=1/(m+x+d);return a=x*p,o=d*p,t.copy(n).addScaledVector(ti,a).addScaledVector(ni,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const ja={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Tn={h:0,s:0,l:0},ji={h:0,s:0,l:0};function Qs(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class De{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=qt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,nt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=nt.workingColorSpace){return this.r=e,this.g=t,this.b=n,nt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=nt.workingColorSpace){if(e=cc(e,1),t=Ze(t,0,1),n=Ze(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=Qs(a,r,e+1/3),this.g=Qs(a,r,e),this.b=Qs(a,r,e-1/3)}return nt.colorSpaceToWorking(this,i),this}setStyle(e,t=qt){function n(r){r!==void 0&&parseFloat(r)<1&&Xe("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Xe("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);Xe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=qt){const n=ja[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Xe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Sn(e.r),this.g=Sn(e.g),this.b=Sn(e.b),this}copyLinearToSRGB(e){return this.r=ci(e.r),this.g=ci(e.g),this.b=ci(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=qt){return nt.workingToColorSpace(Pt.copy(this),e),Math.round(Ze(Pt.r*255,0,255))*65536+Math.round(Ze(Pt.g*255,0,255))*256+Math.round(Ze(Pt.b*255,0,255))}getHexString(e=qt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=nt.workingColorSpace){nt.workingToColorSpace(Pt.copy(this),t);const n=Pt.r,i=Pt.g,r=Pt.b,a=Math.max(n,i,r),o=Math.min(n,i,r);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case n:l=(i-r)/u+(i<r?6:0);break;case i:l=(r-n)/u+2;break;case r:l=(n-i)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=nt.workingColorSpace){return nt.workingToColorSpace(Pt.copy(this),t),e.r=Pt.r,e.g=Pt.g,e.b=Pt.b,e}getStyle(e=qt){nt.workingToColorSpace(Pt.copy(this),e);const t=Pt.r,n=Pt.g,i=Pt.b;return e!==qt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Tn),this.setHSL(Tn.h+e,Tn.s+t,Tn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Tn),e.getHSL(ji);const n=Ns(Tn.h,ji.h,t),i=Ns(Tn.s,ji.s,t),r=Ns(Tn.l,ji.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Pt=new De;De.NAMES=ja;let yc=0;class _i extends xi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:yc++}),this.uuid=Bi(),this.name="",this.type="Material",this.blending=li,this.side=Pn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=fr,this.blendDst=pr,this.blendEquation=Gn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new De(0,0,0),this.blendAlpha=0,this.depthFunc=hi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Lo,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Yn,this.stencilZFail=Yn,this.stencilZPass=Yn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Xe(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){Xe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==li&&(n.blending=this.blending),this.side!==Pn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==fr&&(n.blendSrc=this.blendSrc),this.blendDst!==pr&&(n.blendDst=this.blendDst),this.blendEquation!==Gn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==hi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Lo&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Yn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Yn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Yn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(t){const r=i(e.textures),a=i(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class xo extends _i{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new De(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hn,this.combine=ro,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const vt=new I,Zi=new et;let Ec=0;class Ot{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ec++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Uo,this.updateRanges=[],this.gpuType=tn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Zi.fromBufferAttribute(this,t),Zi.applyMatrix3(e),this.setXY(t,Zi.x,Zi.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)vt.fromBufferAttribute(this,t),vt.applyMatrix3(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)vt.fromBufferAttribute(this,t),vt.applyMatrix4(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)vt.fromBufferAttribute(this,t),vt.applyNormalMatrix(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)vt.fromBufferAttribute(this,t),vt.transformDirection(e),this.setXYZ(t,vt.x,vt.y,vt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=bi(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ft(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bi(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bi(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bi(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bi(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ft(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array),i=Ft(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=Ft(t,this.array),n=Ft(n,this.array),i=Ft(i,this.array),r=Ft(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Uo&&(e.usage=this.usage),e}}class Za extends Ot{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Qa extends Ot{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ae extends Ot{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Tc=0;const Xt=new ht,er=new At,ii=new I,Gt=new ki,Ti=new ki,Et=new I;class ct extends xi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Tc++}),this.uuid=Bi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Ka(e)?Qa:Za)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new qe().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Xt.makeRotationFromQuaternion(e),this.applyMatrix4(Xt),this}rotateX(e){return Xt.makeRotationX(e),this.applyMatrix4(Xt),this}rotateY(e){return Xt.makeRotationY(e),this.applyMatrix4(Xt),this}rotateZ(e){return Xt.makeRotationZ(e),this.applyMatrix4(Xt),this}translate(e,t,n){return Xt.makeTranslation(e,t,n),this.applyMatrix4(Xt),this}scale(e,t,n){return Xt.makeScale(e,t,n),this.applyMatrix4(Xt),this}lookAt(e){return er.lookAt(e),er.updateMatrix(),this.applyMatrix4(er.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ii).negate(),this.translate(ii.x,ii.y,ii.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,r=e.length;i<r;i++){const a=e[i];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Ae(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&Xe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ki);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){gt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const r=t[n];Gt.setFromBufferAttribute(r),this.morphTargetsRelative?(Et.addVectors(this.boundingBox.min,Gt.min),this.boundingBox.expandByPoint(Et),Et.addVectors(this.boundingBox.max,Gt.max),this.boundingBox.expandByPoint(Et)):(this.boundingBox.expandByPoint(Gt.min),this.boundingBox.expandByPoint(Gt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&gt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new pi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){gt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new I,1/0);return}if(e){const n=this.boundingSphere.center;if(Gt.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const o=t[r];Ti.setFromBufferAttribute(o),this.morphTargetsRelative?(Et.addVectors(Gt.min,Ti.min),Gt.expandByPoint(Et),Et.addVectors(Gt.max,Ti.max),Gt.expandByPoint(Et)):(Gt.expandByPoint(Ti.min),Gt.expandByPoint(Ti.max))}Gt.getCenter(n);let i=0;for(let r=0,a=e.count;r<a;r++)Et.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(Et));if(t)for(let r=0,a=t.length;r<a;r++){const o=t[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Et.fromBufferAttribute(o,c),l&&(ii.fromBufferAttribute(e,c),Et.add(ii)),i=Math.max(i,n.distanceToSquared(Et))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&gt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){gt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ot(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let w=0;w<n.count;w++)o[w]=new I,l[w]=new I;const c=new I,h=new I,u=new I,d=new et,f=new et,g=new et,x=new I,m=new I;function p(w,_,v){c.fromBufferAttribute(n,w),h.fromBufferAttribute(n,_),u.fromBufferAttribute(n,v),d.fromBufferAttribute(r,w),f.fromBufferAttribute(r,_),g.fromBufferAttribute(r,v),h.sub(c),u.sub(c),f.sub(d),g.sub(d);const C=1/(f.x*g.y-g.x*f.y);isFinite(C)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(C),m.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(C),o[w].add(x),o[_].add(x),o[v].add(x),l[w].add(m),l[_].add(m),l[v].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let w=0,_=y.length;w<_;++w){const v=y[w],C=v.start,L=v.count;for(let N=C,O=C+L;N<O;N+=3)p(e.getX(N+0),e.getX(N+1),e.getX(N+2))}const M=new I,T=new I,R=new I,b=new I;function A(w){R.fromBufferAttribute(i,w),b.copy(R);const _=o[w];M.copy(_),M.sub(R.multiplyScalar(R.dot(_))).normalize(),T.crossVectors(b,_);const C=T.dot(l[w])<0?-1:1;a.setXYZW(w,M.x,M.y,M.z,C)}for(let w=0,_=y.length;w<_;++w){const v=y[w],C=v.start,L=v.count;for(let N=C,O=C+L;N<O;N+=3)A(e.getX(N+0)),A(e.getX(N+1)),A(e.getX(N+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ot(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new I,r=new I,a=new I,o=new I,l=new I,c=new I,h=new I,u=new I;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),x=e.getX(d+1),m=e.getX(d+2);i.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),a.fromBufferAttribute(t,m),h.subVectors(a,r),u.subVectors(i,r),h.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,r),u.subVectors(i,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Et.fromBufferAttribute(e,t),Et.normalize(),e.setXYZ(t,Et.x,Et.y,Et.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,u=o.normalized,d=new c.constructor(l.length*h);let f=0,g=0;for(let x=0,m=l.length;x<m;x++){o.isInterleavedBufferAttribute?f=l[x]*o.data.stride+o.offset:f=l[x]*h;for(let p=0;p<h;p++)d[g++]=c[f++]}return new Ot(d,h,u)}if(this.index===null)return Xe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new ct,n=this.index.array,i=this.attributes;for(const o in i){const l=i[o],c=e(l,n);t.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const i={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(i[l]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,h=a.length;c<h;c++){const u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ko=new ht,Fn=new mo,Qi=new pi,Jo=new I,es=new I,ts=new I,ns=new I,tr=new I,is=new I,jo=new I,ss=new I;class Be extends At{constructor(e=new ct,t=new xo){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const o=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const o=this.morphTargetInfluences;if(r&&o){is.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=o[l],u=r[l];h!==0&&(tr.fromBufferAttribute(u,e),a?is.addScaledVector(tr,h):is.addScaledVector(tr.sub(t),h))}t.add(is)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Qi.copy(n.boundingSphere),Qi.applyMatrix4(r),Fn.copy(e.ray).recast(e.near),!(Qi.containsPoint(Fn.origin)===!1&&(Fn.intersectSphere(Qi,Jo)===null||Fn.origin.distanceToSquared(Jo)>(e.far-e.near)**2))&&(Ko.copy(r).invert(),Fn.copy(e.ray).applyMatrix4(Ko),!(n.boundingBox!==null&&Fn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Fn)))}_computeIntersections(e,t,n){let i;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=a[m.materialIndex],y=Math.max(m.start,f.start),M=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let T=y,R=M;T<R;T+=3){const b=o.getX(T),A=o.getX(T+1),w=o.getX(T+2);i=rs(this,p,e,n,c,h,u,b,A,w),i&&(i.faceIndex=Math.floor(T/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const g=Math.max(0,f.start),x=Math.min(o.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const y=o.getX(m),M=o.getX(m+1),T=o.getX(m+2);i=rs(this,a,e,n,c,h,u,y,M,T),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){const m=d[g],p=a[m.materialIndex],y=Math.max(m.start,f.start),M=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let T=y,R=M;T<R;T+=3){const b=T,A=T+1,w=T+2;i=rs(this,p,e,n,c,h,u,b,A,w),i&&(i.faceIndex=Math.floor(T/3),i.face.materialIndex=m.materialIndex,t.push(i))}}else{const g=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){const y=m,M=m+1,T=m+2;i=rs(this,a,e,n,c,h,u,y,M,T),i&&(i.faceIndex=Math.floor(m/3),t.push(i))}}}}function Ac(s,e,t,n,i,r,a,o){let l;if(e.side===Dt?l=n.intersectTriangle(a,r,i,!0,o):l=n.intersectTriangle(i,r,a,e.side===Pn,o),l===null)return null;ss.copy(o),ss.applyMatrix4(s.matrixWorld);const c=t.ray.origin.distanceTo(ss);return c<t.near||c>t.far?null:{distance:c,point:ss.clone(),object:s}}function rs(s,e,t,n,i,r,a,o,l,c){s.getVertexPosition(o,es),s.getVertexPosition(l,ts),s.getVertexPosition(c,ns);const h=Ac(s,e,t,n,es,ts,ns,jo);if(h){const u=new I;en.getBarycoord(jo,es,ts,ns,u),i&&(h.uv=en.getInterpolatedAttribute(i,o,l,c,u,new et)),r&&(h.uv1=en.getInterpolatedAttribute(r,o,l,c,u,new et)),a&&(h.normal=en.getInterpolatedAttribute(a,o,l,c,u,new I),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a:o,b:l,c,normal:new I,materialIndex:0};en.getNormal(es,ts,ns,d.normal),h.face=d,h.barycoord=u}return h}class zi extends ct{constructor(e=1,t=1,n=1,i=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:a};const o=this;i=Math.floor(i),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],h=[],u=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,i,a,2),g("x","z","y",1,-1,e,n,-t,i,a,3),g("x","y","z",1,-1,e,t,n,i,r,4),g("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(l),this.setAttribute("position",new Ae(c,3)),this.setAttribute("normal",new Ae(h,3)),this.setAttribute("uv",new Ae(u,2));function g(x,m,p,y,M,T,R,b,A,w,_){const v=T/A,C=R/w,L=T/2,N=R/2,O=b/2,z=A+1,W=w+1;let ee=0,X=0;const te=new I;for(let ne=0;ne<W;ne++){const se=ne*C-N;for(let Pe=0;Pe<z;Pe++){const Ge=Pe*v-L;te[x]=Ge*y,te[m]=se*M,te[p]=O,c.push(te.x,te.y,te.z),te[x]=0,te[m]=0,te[p]=b>0?1:-1,h.push(te.x,te.y,te.z),u.push(Pe/A),u.push(1-ne/w),ee+=1}}for(let ne=0;ne<w;ne++)for(let se=0;se<A;se++){const Pe=d+se+z*ne,Ge=d+se+z*(ne+1),Ke=d+(se+1)+z*(ne+1),Qe=d+(se+1)+z*ne;l.push(Pe,Ge,Qe),l.push(Ge,Ke,Qe),X+=6}o.addGroup(f,X,_),f+=X,d+=ee}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zi(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function mi(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(Xe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Lt(s){const e={};for(let t=0;t<s.length;t++){const n=mi(s[t]);for(const i in n)e[i]=n[i]}return e}function Rc(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function el(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:nt.workingColorSpace}const wc={clone:mi,merge:Lt};var Cc=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Pc=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Tt extends _i{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Cc,this.fragmentShader=Pc,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=mi(e.uniforms),this.uniformsGroups=Rc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const a=this.uniforms[i].value;a&&a.isTexture?t.uniforms[i]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[i]={type:"m4",value:a.toArray()}:t.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class tl extends At{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ht,this.projectionMatrix=new ht,this.projectionMatrixInverse=new ht,this.coordinateSystem=an,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const An=new I,Zo=new et,Qo=new et;class Yt extends tl{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Qr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Us*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Qr*2*Math.atan(Math.tan(Us*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){An.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(An.x,An.y).multiplyScalar(-e/An.z),An.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(An.x,An.y).multiplyScalar(-e/An.z)}getViewSize(e,t){return this.getViewBounds(e,Zo,Qo),t.subVectors(Qo,Zo)}setViewOffset(e,t,n,i,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Us*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*i/l,t-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const si=-90,ri=1;class Dc extends At{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Yt(si,ri,e,t);i.layers=this.layers,this.add(i);const r=new Yt(si,ri,e,t);r.layers=this.layers,this.add(r);const a=new Yt(si,ri,e,t);a.layers=this.layers,this.add(a);const o=new Yt(si,ri,e,t);o.layers=this.layers,this.add(o);const l=new Yt(si,ri,e,t);l.layers=this.layers,this.add(l);const c=new Yt(si,ri,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,a,o,l]=t;for(const c of t)this.remove(c);if(e===an)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Ms)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,r),e.setRenderTarget(n,1,i),e.render(t,a),e.setRenderTarget(n,2,i),e.render(t,o),e.setRenderTarget(n,3,i),e.render(t,l),e.setRenderTarget(n,4,i),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class nl extends wt{constructor(e=[],t=ui,n,i,r,a,o,l,c,h){super(e,t,n,i,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Ic extends Dn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new nl(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new zi(5,5,5),r=new Tt({name:"CubemapFromEquirect",uniforms:mi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Dt,blending:vn});r.uniforms.tEquirect.value=t;const a=new Be(i,r),o=t.minFilter;return t.minFilter===Wn&&(t.minFilter=$t),new Dc(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,i);e.setRenderTarget(r)}}class Ht extends At{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Lc={type:"move"};class nr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ht,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ht,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ht,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const x of e.hand.values()){const m=t.getJointPose(x,n),p=this._getHandJoint(c,x);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Lc)))}return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Ht;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class _o{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new De(e),this.near=t,this.far=n}clone(){return new _o(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Uc extends At{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hn,this.environmentIntensity=1,this.environmentRotation=new hn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Nc extends wt{constructor(e=null,t=1,n=1,i,r,a,o,l,c=Rt,h=Rt,u,d){super(null,a,o,l,c,h,i,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const ir=new I,Fc=new I,Oc=new qe;class zn{constructor(e=new I(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=ir.subVectors(n,t).cross(Fc.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ir),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Oc.getNormalMatrix(e),i=this.coplanarPoint(ir).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const On=new pi,Bc=new et(.5,.5),os=new I;class As{constructor(e=new zn,t=new zn,n=new zn,i=new zn,r=new zn,a=new zn){this.planes=[e,t,n,i,r,a]}set(e,t,n,i,r,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(r),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=an,n=!1){const i=this.planes,r=e.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],g=r[8],x=r[9],m=r[10],p=r[11],y=r[12],M=r[13],T=r[14],R=r[15];if(i[0].setComponents(c-a,f-h,p-g,R-y).normalize(),i[1].setComponents(c+a,f+h,p+g,R+y).normalize(),i[2].setComponents(c+o,f+u,p+x,R+M).normalize(),i[3].setComponents(c-o,f-u,p-x,R-M).normalize(),n)i[4].setComponents(l,d,m,T).normalize(),i[5].setComponents(c-l,f-d,p-m,R-T).normalize();else if(i[4].setComponents(c-l,f-d,p-m,R-T).normalize(),t===an)i[5].setComponents(c+l,f+d,p+m,R+T).normalize();else if(t===Ms)i[5].setComponents(l,d,m,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),On.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),On.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(On)}intersectsSprite(e){On.center.set(0,0,0);const t=Bc.distanceTo(e.center);return On.radius=.7071067811865476+t,On.applyMatrix4(e.matrixWorld),this.intersectsSphere(On)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(os.x=i.normal.x>0?e.max.x:e.min.x,os.y=i.normal.y>0?e.max.y:e.min.y,os.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(os)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class il extends _i{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new De(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ys=new I,Es=new I,ea=new ht,Ai=new mo,as=new pi,sr=new I,ta=new I;class kc extends At{constructor(e=new ct,t=new il){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)ys.fromBufferAttribute(t,i-1),Es.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=ys.distanceTo(Es);e.setAttribute("lineDistance",new Ae(n,1))}else Xe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),as.copy(n.boundingSphere),as.applyMatrix4(i),as.radius+=r,e.ray.intersectsSphere(as)===!1)return;ea.copy(i).invert(),Ai.copy(e.ray).applyMatrix4(ea);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const f=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let x=f,m=g-1;x<m;x+=c){const p=h.getX(x),y=h.getX(x+1),M=ls(this,e,Ai,l,p,y,x);M&&t.push(M)}if(this.isLineLoop){const x=h.getX(g-1),m=h.getX(f),p=ls(this,e,Ai,l,x,m,g-1);p&&t.push(p)}}else{const f=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let x=f,m=g-1;x<m;x+=c){const p=ls(this,e,Ai,l,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){const x=ls(this,e,Ai,l,g-1,f,g-1);x&&t.push(x)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){const o=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function ls(s,e,t,n,i,r,a){const o=s.geometry.attributes.position;if(ys.fromBufferAttribute(o,i),Es.fromBufferAttribute(o,r),t.distanceSqToSegment(ys,Es,sr,ta)>n)return;sr.applyMatrix4(s.matrixWorld);const c=e.ray.origin.distanceTo(sr);if(!(c<e.near||c>e.far))return{distance:c,point:ta.clone().applyMatrix4(s.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:s}}const na=new I,ia=new I;class zc extends kc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)na.fromBufferAttribute(t,i),ia.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+na.distanceTo(ia);e.setAttribute("lineDistance",new Ae(n,1))}else Xe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Gc extends wt{constructor(e,t,n,i,r,a,o,l,c){super(e,t,n,i,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class vo extends wt{constructor(e,t,n=Xn,i,r,a,o=Rt,l=Rt,c,h=Li,u=1){if(h!==Li&&h!==Ui)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:u};super(d,i,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new po(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class sl extends wt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Rs extends ct{constructor(e=1,t=1,n=1,i=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};const c=this;i=Math.floor(i),r=Math.floor(r);const h=[],u=[],d=[],f=[];let g=0;const x=[],m=n/2;let p=0;y(),a===!1&&(e>0&&M(!0),t>0&&M(!1)),this.setIndex(h),this.setAttribute("position",new Ae(u,3)),this.setAttribute("normal",new Ae(d,3)),this.setAttribute("uv",new Ae(f,2));function y(){const T=new I,R=new I;let b=0;const A=(t-e)/n;for(let w=0;w<=r;w++){const _=[],v=w/r,C=v*(t-e)+e;for(let L=0;L<=i;L++){const N=L/i,O=N*l+o,z=Math.sin(O),W=Math.cos(O);R.x=C*z,R.y=-v*n+m,R.z=C*W,u.push(R.x,R.y,R.z),T.set(z,A,W).normalize(),d.push(T.x,T.y,T.z),f.push(N,1-v),_.push(g++)}x.push(_)}for(let w=0;w<i;w++)for(let _=0;_<r;_++){const v=x[_][w],C=x[_+1][w],L=x[_+1][w+1],N=x[_][w+1];(e>0||_!==0)&&(h.push(v,C,N),b+=3),(t>0||_!==r-1)&&(h.push(C,L,N),b+=3)}c.addGroup(p,b,0),p+=b}function M(T){const R=g,b=new et,A=new I;let w=0;const _=T===!0?e:t,v=T===!0?1:-1;for(let L=1;L<=i;L++)u.push(0,m*v,0),d.push(0,v,0),f.push(.5,.5),g++;const C=g;for(let L=0;L<=i;L++){const O=L/i*l+o,z=Math.cos(O),W=Math.sin(O);A.x=_*W,A.y=m*v,A.z=_*z,u.push(A.x,A.y,A.z),d.push(0,v,0),b.x=z*.5+.5,b.y=W*.5*v+.5,f.push(b.x,b.y),g++}for(let L=0;L<i;L++){const N=R+L,O=C+L;T===!0?h.push(O,O+1,N):h.push(O+1,O,N),w+=3}c.addGroup(p,w,T===!0?1:2),p+=w}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rs(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class So extends Rs{constructor(e=1,t=1,n=32,i=1,r=!1,a=0,o=Math.PI*2){super(0,e,t,n,i,r,a,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(e){return new So(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class ws extends ct{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const r=e/2,a=t/2,o=Math.floor(n),l=Math.floor(i),c=o+1,h=l+1,u=e/o,d=t/l,f=[],g=[],x=[],m=[];for(let p=0;p<h;p++){const y=p*d-a;for(let M=0;M<c;M++){const T=M*u-r;g.push(T,-y,0),x.push(0,0,1),m.push(M/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let y=0;y<o;y++){const M=y+c*p,T=y+c*(p+1),R=y+1+c*(p+1),b=y+1+c*p;f.push(M,T,b),f.push(T,R,b)}this.setIndex(f),this.setAttribute("position",new Ae(g,3)),this.setAttribute("normal",new Ae(x,3)),this.setAttribute("uv",new Ae(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ws(e.width,e.height,e.widthSegments,e.heightSegments)}}class Oi extends ct{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],u=new I,d=new I,f=[],g=[],x=[],m=[];for(let p=0;p<=n;p++){const y=[],M=p/n;let T=0;p===0&&a===0?T=.5/t:p===n&&l===Math.PI&&(T=-.5/t);for(let R=0;R<=t;R++){const b=R/t;u.x=-e*Math.cos(i+b*r)*Math.sin(a+M*o),u.y=e*Math.cos(a+M*o),u.z=e*Math.sin(i+b*r)*Math.sin(a+M*o),g.push(u.x,u.y,u.z),d.copy(u).normalize(),x.push(d.x,d.y,d.z),m.push(b+T,1-M),y.push(c++)}h.push(y)}for(let p=0;p<n;p++)for(let y=0;y<t;y++){const M=h[p][y+1],T=h[p][y],R=h[p+1][y],b=h[p+1][y+1];(p!==0||a>0)&&f.push(M,T,b),(p!==n-1||l<Math.PI)&&f.push(T,R,b)}this.setIndex(f),this.setAttribute("position",new Ae(g,3)),this.setAttribute("normal",new Ae(x,3)),this.setAttribute("uv",new Ae(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Oi(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class eo extends _i{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new De(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new De(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ya,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hn,this.combine=ro,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Vc extends _i{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=jl,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Hc extends _i{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const rr={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class Wc{constructor(e,t,n){const i=this;let r=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&i.onStart!==void 0&&i.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,i.onProgress!==void 0&&i.onProgress(h,a,o),a===o&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Xc=new Wc;class bo{constructor(e){this.manager=e!==void 0?e:Xc,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}bo.DEFAULT_MATERIAL_NAME="__DEFAULT";const oi=new WeakMap;class qc extends bo{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,a=rr.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0);else{let u=oi.get(a);u===void 0&&(u=[],oi.set(a,u)),u.push({onLoad:t,onError:i})}return a}const o=Ni("img");function l(){h(),t&&t(this);const u=oi.get(this)||[];for(let d=0;d<u.length;d++){const f=u[d];f.onLoad&&f.onLoad(this)}oi.delete(this),r.manager.itemEnd(e)}function c(u){h(),i&&i(u),rr.remove(`image:${e}`);const d=oi.get(this)||[];for(let f=0;f<d.length;f++){const g=d[f];g.onError&&g.onError(u)}oi.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),rr.add(`image:${e}`,o),r.manager.itemStart(e),o.src=e,o}}class Yc extends bo{constructor(e){super(e)}load(e,t,n,i){const r=new wt,a=new qc(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}}class Mo extends At{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new De(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class $c extends Mo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(At.DEFAULT_UP),this.updateMatrix(),this.groundColor=new De(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const or=new ht,sa=new I,ra=new I;class Kc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new et(512,512),this.mapType=cn,this.map=null,this.mapPass=null,this.matrix=new ht,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new As,this._frameExtents=new et(1,1),this._viewportCount=1,this._viewports=[new xt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;sa.setFromMatrixPosition(e.matrixWorld),t.position.copy(sa),ra.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(ra),t.updateMatrixWorld(),or.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(or,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(or)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class rl extends tl{constructor(e=-1,t=1,n=1,i=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,a=n+e,o=i+t,l=i-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Jc extends Kc{constructor(){super(new rl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class jc extends Mo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(At.DEFAULT_UP),this.updateMatrix(),this.target=new At,this.shadow=new Jc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Zc extends Mo{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Qc extends Yt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class eh{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const oa=new ht;class th{constructor(e,t,n=0,i=1/0){this.ray=new mo(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new go,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):gt("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return oa.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(oa),this}intersectObject(e,t=!0,n=[]){return to(e,this,n,t),n.sort(aa),n}intersectObjects(e,t=!0,n=[]){for(let i=0,r=e.length;i<r;i++)to(e[i],this,n,t);return n.sort(aa),n}}function aa(s,e){return s.distance-e.distance}function to(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const r=s.children;for(let a=0,o=r.length;a<o;a++)to(r[a],e,t,!0)}}function la(s,e,t,n){const i=nh(n);switch(t){case Wa:return s*e;case qa:return s*e/i.components*i.byteLength;case co:return s*e/i.components*i.byteLength;case ho:return s*e*2/i.components*i.byteLength;case uo:return s*e*2/i.components*i.byteLength;case Xa:return s*e*3/i.components*i.byteLength;case nn:return s*e*4/i.components*i.byteLength;case fo:return s*e*4/i.components*i.byteLength;case ps:case ms:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case gs:case xs:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ar:case wr:return Math.max(s,16)*Math.max(e,8)/4;case Tr:case Rr:return Math.max(s,8)*Math.max(e,8)/2;case Cr:case Pr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Dr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ir:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Lr:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Ur:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Nr:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Fr:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Or:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Br:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case kr:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case zr:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Gr:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Vr:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Hr:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Wr:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Xr:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case qr:case Yr:case $r:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Kr:case Jr:return Math.ceil(s/4)*Math.ceil(e/4)*8;case jr:case Zr:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function nh(s){switch(s){case cn:case za:return{byteLength:1,components:1};case Di:case Ga:case gi:return{byteLength:2,components:1};case ao:case lo:return{byteLength:2,components:4};case Xn:case oo:case tn:return{byteLength:4,components:1};case Va:case Ha:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:so}}));typeof window<"u"&&(window.__THREE__?Xe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=so);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ol(){let s=null,e=!1,t=null,n=null;function i(r,a){t(r,a),n=s.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function ih(s){const e=new WeakMap;function t(o,l){const c=o.array,h=o.usage,u=c.byteLength,d=s.createBuffer();s.bindBuffer(l,d),s.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=s.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=s.SHORT;else if(c instanceof Uint32Array)f=s.UNSIGNED_INT;else if(c instanceof Int32Array)f=s.INT;else if(c instanceof Int8Array)f=s.BYTE;else if(c instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,l,c){const h=l.array,u=l.updateRanges;if(s.bindBuffer(c,o),u.length===0)s.bufferSubData(c,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){const g=u[d],x=u[f];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){const x=u[f];s.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(s.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:i,remove:r,update:a}}var sh=`#ifdef USE_ALPHAHASH
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
#endif`,Mh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,yh=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Ph=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Dh=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ih=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Lh=`#ifdef USE_EMISSIVEMAP
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
#endif`,Bh=`#ifdef USE_ENVMAP
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
#endif`,kh=`#ifdef USE_ENVMAP
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
#endif`,Vh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Hh=`#ifdef USE_FOG
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
vec3 nonPerturbedNormal = normal;`,Mu=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,yu=`#ifndef FLAT_SHADED
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
#endif`,Pu=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Du=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Iu=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Lu=`#ifdef PREMULTIPLIED_ALPHA
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
#endif`,Bu=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ku=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Vu=`float getShadowMask() {
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
}`,Hu=`#ifdef USE_SKINNING
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
}`,Md=`#define MATCAP
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
}`,yd=`#define NORMAL
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
}`,Pd=`#define TOON
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
}`,Dd=`uniform float size;
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
}`,Id=`uniform vec3 diffuse;
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
}`,Ld=`#include <common>
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
}`,Ye={alphahash_fragment:sh,alphahash_pars_fragment:rh,alphamap_fragment:oh,alphamap_pars_fragment:ah,alphatest_fragment:lh,alphatest_pars_fragment:ch,aomap_fragment:hh,aomap_pars_fragment:uh,batching_pars_vertex:dh,batching_vertex:fh,begin_vertex:ph,beginnormal_vertex:mh,bsdfs:gh,iridescence_fragment:xh,bumpmap_pars_fragment:_h,clipping_planes_fragment:vh,clipping_planes_pars_fragment:Sh,clipping_planes_pars_vertex:bh,clipping_planes_vertex:Mh,color_fragment:yh,color_pars_fragment:Eh,color_pars_vertex:Th,color_vertex:Ah,common:Rh,cube_uv_reflection_fragment:wh,defaultnormal_vertex:Ch,displacementmap_pars_vertex:Ph,displacementmap_vertex:Dh,emissivemap_fragment:Ih,emissivemap_pars_fragment:Lh,colorspace_fragment:Uh,colorspace_pars_fragment:Nh,envmap_fragment:Fh,envmap_common_pars_fragment:Oh,envmap_pars_fragment:Bh,envmap_pars_vertex:kh,envmap_physical_pars_fragment:Jh,envmap_vertex:zh,fog_vertex:Gh,fog_pars_vertex:Vh,fog_fragment:Hh,fog_pars_fragment:Wh,gradientmap_pars_fragment:Xh,lightmap_pars_fragment:qh,lights_lambert_fragment:Yh,lights_lambert_pars_fragment:$h,lights_pars_begin:Kh,lights_toon_fragment:jh,lights_toon_pars_fragment:Zh,lights_phong_fragment:Qh,lights_phong_pars_fragment:eu,lights_physical_fragment:tu,lights_physical_pars_fragment:nu,lights_fragment_begin:iu,lights_fragment_maps:su,lights_fragment_end:ru,logdepthbuf_fragment:ou,logdepthbuf_pars_fragment:au,logdepthbuf_pars_vertex:lu,logdepthbuf_vertex:cu,map_fragment:hu,map_pars_fragment:uu,map_particle_fragment:du,map_particle_pars_fragment:fu,metalnessmap_fragment:pu,metalnessmap_pars_fragment:mu,morphinstance_vertex:gu,morphcolor_vertex:xu,morphnormal_vertex:_u,morphtarget_pars_vertex:vu,morphtarget_vertex:Su,normal_fragment_begin:bu,normal_fragment_maps:Mu,normal_pars_fragment:yu,normal_pars_vertex:Eu,normal_vertex:Tu,normalmap_pars_fragment:Au,clearcoat_normal_fragment_begin:Ru,clearcoat_normal_fragment_maps:wu,clearcoat_pars_fragment:Cu,iridescence_pars_fragment:Pu,opaque_fragment:Du,packing:Iu,premultiplied_alpha_fragment:Lu,project_vertex:Uu,dithering_fragment:Nu,dithering_pars_fragment:Fu,roughnessmap_fragment:Ou,roughnessmap_pars_fragment:Bu,shadowmap_pars_fragment:ku,shadowmap_pars_vertex:zu,shadowmap_vertex:Gu,shadowmask_pars_fragment:Vu,skinbase_vertex:Hu,skinning_pars_vertex:Wu,skinning_vertex:Xu,skinnormal_vertex:qu,specularmap_fragment:Yu,specularmap_pars_fragment:$u,tonemapping_fragment:Ku,tonemapping_pars_fragment:Ju,transmission_fragment:ju,transmission_pars_fragment:Zu,uv_pars_fragment:Qu,uv_pars_vertex:ed,uv_vertex:td,worldpos_vertex:nd,background_vert:id,background_frag:sd,backgroundCube_vert:rd,backgroundCube_frag:od,cube_vert:ad,cube_frag:ld,depth_vert:cd,depth_frag:hd,distanceRGBA_vert:ud,distanceRGBA_frag:dd,equirect_vert:fd,equirect_frag:pd,linedashed_vert:md,linedashed_frag:gd,meshbasic_vert:xd,meshbasic_frag:_d,meshlambert_vert:vd,meshlambert_frag:Sd,meshmatcap_vert:bd,meshmatcap_frag:Md,meshnormal_vert:yd,meshnormal_frag:Ed,meshphong_vert:Td,meshphong_frag:Ad,meshphysical_vert:Rd,meshphysical_frag:wd,meshtoon_vert:Cd,meshtoon_frag:Pd,points_vert:Dd,points_frag:Id,shadow_vert:Ld,shadow_frag:Ud,sprite_vert:Nd,sprite_frag:Fd},de={common:{diffuse:{value:new De(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new qe},alphaMap:{value:null},alphaMapTransform:{value:new qe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new qe}},envmap:{envMap:{value:null},envMapRotation:{value:new qe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new qe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new qe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new qe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new qe},normalScale:{value:new et(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new qe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new qe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new qe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new qe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new De(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new De(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new qe},alphaTest:{value:0},uvTransform:{value:new qe}},sprite:{diffuse:{value:new De(16777215)},opacity:{value:1},center:{value:new et(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new qe},alphaMap:{value:null},alphaMapTransform:{value:new qe},alphaTest:{value:0}}},rn={basic:{uniforms:Lt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.fog]),vertexShader:Ye.meshbasic_vert,fragmentShader:Ye.meshbasic_frag},lambert:{uniforms:Lt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new De(0)}}]),vertexShader:Ye.meshlambert_vert,fragmentShader:Ye.meshlambert_frag},phong:{uniforms:Lt([de.common,de.specularmap,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.fog,de.lights,{emissive:{value:new De(0)},specular:{value:new De(1118481)},shininess:{value:30}}]),vertexShader:Ye.meshphong_vert,fragmentShader:Ye.meshphong_frag},standard:{uniforms:Lt([de.common,de.envmap,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.roughnessmap,de.metalnessmap,de.fog,de.lights,{emissive:{value:new De(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ye.meshphysical_vert,fragmentShader:Ye.meshphysical_frag},toon:{uniforms:Lt([de.common,de.aomap,de.lightmap,de.emissivemap,de.bumpmap,de.normalmap,de.displacementmap,de.gradientmap,de.fog,de.lights,{emissive:{value:new De(0)}}]),vertexShader:Ye.meshtoon_vert,fragmentShader:Ye.meshtoon_frag},matcap:{uniforms:Lt([de.common,de.bumpmap,de.normalmap,de.displacementmap,de.fog,{matcap:{value:null}}]),vertexShader:Ye.meshmatcap_vert,fragmentShader:Ye.meshmatcap_frag},points:{uniforms:Lt([de.points,de.fog]),vertexShader:Ye.points_vert,fragmentShader:Ye.points_frag},dashed:{uniforms:Lt([de.common,de.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ye.linedashed_vert,fragmentShader:Ye.linedashed_frag},depth:{uniforms:Lt([de.common,de.displacementmap]),vertexShader:Ye.depth_vert,fragmentShader:Ye.depth_frag},normal:{uniforms:Lt([de.common,de.bumpmap,de.normalmap,de.displacementmap,{opacity:{value:1}}]),vertexShader:Ye.meshnormal_vert,fragmentShader:Ye.meshnormal_frag},sprite:{uniforms:Lt([de.sprite,de.fog]),vertexShader:Ye.sprite_vert,fragmentShader:Ye.sprite_frag},background:{uniforms:{uvTransform:{value:new qe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ye.background_vert,fragmentShader:Ye.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new qe}},vertexShader:Ye.backgroundCube_vert,fragmentShader:Ye.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ye.cube_vert,fragmentShader:Ye.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ye.equirect_vert,fragmentShader:Ye.equirect_frag},distanceRGBA:{uniforms:Lt([de.common,de.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ye.distanceRGBA_vert,fragmentShader:Ye.distanceRGBA_frag},shadow:{uniforms:Lt([de.lights,de.fog,{color:{value:new De(0)},opacity:{value:1}}]),vertexShader:Ye.shadow_vert,fragmentShader:Ye.shadow_frag}};rn.physical={uniforms:Lt([rn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new qe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new qe},clearcoatNormalScale:{value:new et(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new qe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new qe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new qe},sheen:{value:0},sheenColor:{value:new De(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new qe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new qe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new qe},transmissionSamplerSize:{value:new et},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new qe},attenuationDistance:{value:0},attenuationColor:{value:new De(0)},specularColor:{value:new De(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new qe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new qe},anisotropyVector:{value:new et},anisotropyMap:{value:null},anisotropyMapTransform:{value:new qe}}]),vertexShader:Ye.meshphysical_vert,fragmentShader:Ye.meshphysical_frag};const cs={r:0,b:0,g:0},Bn=new hn,Od=new ht;function Bd(s,e,t,n,i,r,a){const o=new De(0);let l=r===!0?0:1,c,h,u=null,d=0,f=null;function g(M){let T=M.isScene===!0?M.background:null;return T&&T.isTexture&&(T=(M.backgroundBlurriness>0?t:e).get(T)),T}function x(M){let T=!1;const R=g(M);R===null?p(o,l):R&&R.isColor&&(p(R,1),T=!0);const b=s.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,a):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(s.autoClear||T)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function m(M,T){const R=g(T);R&&(R.isCubeTexture||R.mapping===Ts)?(h===void 0&&(h=new Be(new zi(1,1,1),new Tt({name:"BackgroundCubeMaterial",uniforms:mi(rn.backgroundCube.uniforms),vertexShader:rn.backgroundCube.vertexShader,fragmentShader:rn.backgroundCube.fragmentShader,side:Dt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(b,A,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),Bn.copy(T.backgroundRotation),Bn.x*=-1,Bn.y*=-1,Bn.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(Bn.y*=-1,Bn.z*=-1),h.material.uniforms.envMap.value=R,h.material.uniforms.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Od.makeRotationFromEuler(Bn)),h.material.toneMapped=nt.getTransfer(R.colorSpace)!==at,(u!==R||d!==R.version||f!==s.toneMapping)&&(h.material.needsUpdate=!0,u=R,d=R.version,f=s.toneMapping),h.layers.enableAll(),M.unshift(h,h.geometry,h.material,0,0,null)):R&&R.isTexture&&(c===void 0&&(c=new Be(new ws(2,2),new Tt({name:"BackgroundMaterial",uniforms:mi(rn.background.uniforms),vertexShader:rn.background.vertexShader,fragmentShader:rn.background.fragmentShader,side:Pn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=R,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.toneMapped=nt.getTransfer(R.colorSpace)!==at,R.matrixAutoUpdate===!0&&R.updateMatrix(),c.material.uniforms.uvTransform.value.copy(R.matrix),(u!==R||d!==R.version||f!==s.toneMapping)&&(c.material.needsUpdate=!0,u=R,d=R.version,f=s.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null))}function p(M,T){M.getRGB(cs,el(s)),n.buffers.color.setClear(cs.r,cs.g,cs.b,T,a)}function y(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,T=1){o.set(M),l=T,p(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(M){l=M,p(o,l)},render:x,addToRenderList:m,dispose:y}}function kd(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=d(null);let r=i,a=!1;function o(v,C,L,N,O){let z=!1;const W=u(N,L,C);r!==W&&(r=W,c(r.object)),z=f(v,N,L,O),z&&g(v,N,L,O),O!==null&&e.update(O,s.ELEMENT_ARRAY_BUFFER),(z||a)&&(a=!1,T(v,C,L,N),O!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function l(){return s.createVertexArray()}function c(v){return s.bindVertexArray(v)}function h(v){return s.deleteVertexArray(v)}function u(v,C,L){const N=L.wireframe===!0;let O=n[v.id];O===void 0&&(O={},n[v.id]=O);let z=O[C.id];z===void 0&&(z={},O[C.id]=z);let W=z[N];return W===void 0&&(W=d(l()),z[N]=W),W}function d(v){const C=[],L=[],N=[];for(let O=0;O<t;O++)C[O]=0,L[O]=0,N[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:L,attributeDivisors:N,object:v,attributes:{},index:null}}function f(v,C,L,N){const O=r.attributes,z=C.attributes;let W=0;const ee=L.getAttributes();for(const X in ee)if(ee[X].location>=0){const ne=O[X];let se=z[X];if(se===void 0&&(X==="instanceMatrix"&&v.instanceMatrix&&(se=v.instanceMatrix),X==="instanceColor"&&v.instanceColor&&(se=v.instanceColor)),ne===void 0||ne.attribute!==se||se&&ne.data!==se.data)return!0;W++}return r.attributesNum!==W||r.index!==N}function g(v,C,L,N){const O={},z=C.attributes;let W=0;const ee=L.getAttributes();for(const X in ee)if(ee[X].location>=0){let ne=z[X];ne===void 0&&(X==="instanceMatrix"&&v.instanceMatrix&&(ne=v.instanceMatrix),X==="instanceColor"&&v.instanceColor&&(ne=v.instanceColor));const se={};se.attribute=ne,ne&&ne.data&&(se.data=ne.data),O[X]=se,W++}r.attributes=O,r.attributesNum=W,r.index=N}function x(){const v=r.newAttributes;for(let C=0,L=v.length;C<L;C++)v[C]=0}function m(v){p(v,0)}function p(v,C){const L=r.newAttributes,N=r.enabledAttributes,O=r.attributeDivisors;L[v]=1,N[v]===0&&(s.enableVertexAttribArray(v),N[v]=1),O[v]!==C&&(s.vertexAttribDivisor(v,C),O[v]=C)}function y(){const v=r.newAttributes,C=r.enabledAttributes;for(let L=0,N=C.length;L<N;L++)C[L]!==v[L]&&(s.disableVertexAttribArray(L),C[L]=0)}function M(v,C,L,N,O,z,W){W===!0?s.vertexAttribIPointer(v,C,L,O,z):s.vertexAttribPointer(v,C,L,N,O,z)}function T(v,C,L,N){x();const O=N.attributes,z=L.getAttributes(),W=C.defaultAttributeValues;for(const ee in z){const X=z[ee];if(X.location>=0){let te=O[ee];if(te===void 0&&(ee==="instanceMatrix"&&v.instanceMatrix&&(te=v.instanceMatrix),ee==="instanceColor"&&v.instanceColor&&(te=v.instanceColor)),te!==void 0){const ne=te.normalized,se=te.itemSize,Pe=e.get(te);if(Pe===void 0)continue;const Ge=Pe.buffer,Ke=Pe.type,Qe=Pe.bytesPerElement,K=Ke===s.INT||Ke===s.UNSIGNED_INT||te.gpuType===oo;if(te.isInterleavedBufferAttribute){const j=te.data,ue=j.stride,Ie=te.offset;if(j.isInstancedInterleavedBuffer){for(let xe=0;xe<X.locationSize;xe++)p(X.location+xe,j.meshPerAttribute);v.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let xe=0;xe<X.locationSize;xe++)m(X.location+xe);s.bindBuffer(s.ARRAY_BUFFER,Ge);for(let xe=0;xe<X.locationSize;xe++)M(X.location+xe,se/X.locationSize,Ke,ne,ue*Qe,(Ie+se/X.locationSize*xe)*Qe,K)}else{if(te.isInstancedBufferAttribute){for(let j=0;j<X.locationSize;j++)p(X.location+j,te.meshPerAttribute);v.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let j=0;j<X.locationSize;j++)m(X.location+j);s.bindBuffer(s.ARRAY_BUFFER,Ge);for(let j=0;j<X.locationSize;j++)M(X.location+j,se/X.locationSize,Ke,ne,se*Qe,se/X.locationSize*j*Qe,K)}}else if(W!==void 0){const ne=W[ee];if(ne!==void 0)switch(ne.length){case 2:s.vertexAttrib2fv(X.location,ne);break;case 3:s.vertexAttrib3fv(X.location,ne);break;case 4:s.vertexAttrib4fv(X.location,ne);break;default:s.vertexAttrib1fv(X.location,ne)}}}}y()}function R(){w();for(const v in n){const C=n[v];for(const L in C){const N=C[L];for(const O in N)h(N[O].object),delete N[O];delete C[L]}delete n[v]}}function b(v){if(n[v.id]===void 0)return;const C=n[v.id];for(const L in C){const N=C[L];for(const O in N)h(N[O].object),delete N[O];delete C[L]}delete n[v.id]}function A(v){for(const C in n){const L=n[C];if(L[v.id]===void 0)continue;const N=L[v.id];for(const O in N)h(N[O].object),delete N[O];delete L[v.id]}}function w(){_(),a=!0,r!==i&&(r=i,c(r.object))}function _(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:w,resetDefaultState:_,dispose:R,releaseStatesOfGeometry:b,releaseStatesOfProgram:A,initAttributes:x,enableAttribute:m,disableUnusedAttributes:y}}function zd(s,e,t){let n;function i(c){n=c}function r(c,h){s.drawArrays(n,c,h),t.update(h,n,1)}function a(c,h,u){u!==0&&(s.drawArraysInstanced(n,c,h,u),t.update(h,n,u))}function o(c,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,u);let f=0;for(let g=0;g<u;g++)f+=h[g];t.update(f,n,1)}function l(c,h,u,d){if(u===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<c.length;g++)a(c[g],h[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,d,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*d[x];t.update(g,n,1)}}this.setMode=i,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function Gd(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function a(A){return!(A!==nn&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){const w=A===gi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==cn&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==tn&&!w)}function l(A){if(A==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Xe("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),m=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),y=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),M=s.getParameter(s.MAX_VARYING_VECTORS),T=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),R=g>0,b=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:M,maxFragmentUniforms:T,vertexTextures:R,maxSamples:b}}function Vd(s){const e=this;let t=null,n=0,i=!1,r=!1;const a=new zn,o=new qe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||i;return i=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){const g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,p=s.get(u);if(!i||g===null||g.length===0||r&&!m)r?h(null):c();else{const y=r?0:n,M=y*4;let T=p.clippingState||null;l.value=T,T=h(g,d,M,f);for(let R=0;R!==M;++R)T[R]=t[R];p.clippingState=T,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){const x=u!==null?u.length:0;let m=null;if(x!==0){if(m=l.value,g!==!0||m===null){const p=f+x*4,y=d.matrixWorldInverse;o.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let M=0,T=f;M!==x;++M,T+=4)a.copy(u[M]).applyMatrix4(y,o),a.normal.toArray(m,T),m[T+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function Hd(s){let e=new WeakMap;function t(a,o){return o===Mr?a.mapping=ui:o===yr&&(a.mapping=di),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Mr||o===yr)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new Ic(l.height);return c.fromEquirectangularTexture(s,a),e.set(a,c),a.addEventListener("dispose",i),t(c.texture,a.mapping)}else return null}}return a}function i(a){const o=a.target;o.removeEventListener("dispose",i);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const wn=4,ca=[.125,.215,.35,.446,.526,.582],Vn=20,Wd=256,Ri=new rl,ha=new De;let ar=null,lr=0,cr=0,hr=!1;const Xd=new I;class ua{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,r={}){const{size:a=256,position:o=Xd}=r;ar=this._renderer.getRenderTarget(),lr=this._renderer.getActiveCubeFace(),cr=this._renderer.getActiveMipmapLevel(),hr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=pa(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=fa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(ar,lr,cr),this._renderer.xr.enabled=hr,e.scissorTest=!1,ai(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ui||e.mapping===di?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ar=this._renderer.getRenderTarget(),lr=this._renderer.getActiveCubeFace(),cr=this._renderer.getActiveMipmapLevel(),hr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:$t,minFilter:$t,generateMipmaps:!1,type:gi,format:nn,colorSpace:fi,depthBuffer:!1},i=da(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=da(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=qd(r)),this._blurMaterial=$d(r,e,t),this._ggxMaterial=Yd(r,e,t)}return i}_compileMaterial(e){const t=new Be(new ct,e);this._renderer.compile(t,Ri)}_sceneToCubeUV(e,t,n,i,r){const l=new Yt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(ha),u.toneMapping=Cn,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Be(new zi,new xo({name:"PMREM.Background",side:Dt,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,m=x.material;let p=!1;const y=e.background;y?y.isColor&&(m.color.copy(y),e.background=null,p=!0):(m.color.copy(ha),p=!0);for(let M=0;M<6;M++){const T=M%3;T===0?(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[M],r.y,r.z)):T===1?(l.up.set(0,0,c[M]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[M],r.z)):(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[M]));const R=this._cubeSize;ai(i,T*R,M>2?R:0,R,R),u.setRenderTarget(i),p&&u.render(x,l),u.render(e,l)}u.toneMapping=f,u.autoClear=d,e.background=y}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===ui||e.mapping===di;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=pa()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=fa());const r=i?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;const o=r.uniforms;o.envMap.value=e;const l=this._cubeSize;ai(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,Ri)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodMeshes.length;for(let r=1;r<i;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const i=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;const l=a.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=.05+c*.95,f=u*d,{_lodMax:g}=this,x=this._sizeLods[n],m=3*x*(n>g-wn?n-g+wn:0),p=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=g-t,ai(r,m,p,3*x,2*x),i.setRenderTarget(r),i.render(o,Ri),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,ai(e,m,p,3*x,2*x),i.setRenderTarget(e),i.render(o,Ri)}_blur(e,t,n,i,r){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,i,"latitudinal",r),this._halfBlur(a,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&gt("blur direction must be either latitudinal or longitudinal!");const h=3,u=this._lodMeshes[i];u.material=c;const d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Vn-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):Vn;m>Vn&&Xe(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Vn}`);const p=[];let y=0;for(let A=0;A<Vn;++A){const w=A/x,_=Math.exp(-w*w/2);p.push(_),A===0?y+=_:A<m&&(y+=2*_)}for(let A=0;A<p.length;A++)p[A]=p[A]/y;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);const{_lodMax:M}=this;d.dTheta.value=g,d.mipInt.value=M-n;const T=this._sizeLods[i],R=3*T*(i>M-wn?i-M+wn:0),b=4*(this._cubeSize-T);ai(t,R,b,3*T,2*T),l.setRenderTarget(t),l.render(u,Ri)}}function qd(s){const e=[],t=[],n=[];let i=s;const r=s-wn+1+ca.length;for(let a=0;a<r;a++){const o=Math.pow(2,i);e.push(o);let l=1/o;a>s-wn?l=ca[a-s+wn-1]:a===0&&(l=0),t.push(l);const c=1/(o-2),h=-c,u=1+c,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,x=3,m=2,p=1,y=new Float32Array(x*g*f),M=new Float32Array(m*g*f),T=new Float32Array(p*g*f);for(let b=0;b<f;b++){const A=b%3*2/3-1,w=b>2?0:-1,_=[A,w,0,A+2/3,w,0,A+2/3,w+1,0,A,w,0,A+2/3,w+1,0,A,w+1,0];y.set(_,x*g*b),M.set(d,m*g*b);const v=[b,b,b,b,b,b];T.set(v,p*g*b)}const R=new ct;R.setAttribute("position",new Ot(y,x)),R.setAttribute("uv",new Ot(M,m)),R.setAttribute("faceIndex",new Ot(T,p)),n.push(new Be(R,null)),i>wn&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function da(s,e,t){const n=new Dn(s,e,t);return n.texture.mapping=Ts,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ai(s,e,t,n,i){s.viewport.set(e,t,n,i),s.scissor.set(e,t,n,i)}function Yd(s,e,t){return new Tt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Wd,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Cs(),fragmentShader:`

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
		`,blending:vn,depthTest:!1,depthWrite:!1})}function $d(s,e,t){const n=new Float32Array(Vn),i=new I(0,1,0);return new Tt({name:"SphericalGaussianBlur",defines:{n:Vn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Cs(),fragmentShader:`

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
		`,blending:vn,depthTest:!1,depthWrite:!1})}function fa(){return new Tt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Cs(),fragmentShader:`

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
		`,blending:vn,depthTest:!1,depthWrite:!1})}function pa(){return new Tt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Cs(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:vn,depthTest:!1,depthWrite:!1})}function Cs(){return`

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
	`}function Kd(s){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===Mr||l===yr,h=l===ui||l===di;if(c||h){let u=e.get(o);const d=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return t===null&&(t=new ua(s)),u=c?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{const f=o.image;return c&&f&&f.height>0||h&&f&&i(f)?(t===null&&(t=new ua(s)),u=c?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function i(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function r(o){const l=o.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function Jd(s){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=s.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&Fi("WebGLRenderer: "+n+" extension not supported."),i}}}function jd(s,e,t,n){const i={},r=new WeakMap;function a(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",a),delete i[d.id];const f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return i[d.id]===!0||(d.addEventListener("dispose",a),i[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const f in d)e.update(d[f],s.ARRAY_BUFFER)}function c(u){const d=[],f=u.index,g=u.attributes.position;let x=0;if(f!==null){const y=f.array;x=f.version;for(let M=0,T=y.length;M<T;M+=3){const R=y[M+0],b=y[M+1],A=y[M+2];d.push(R,b,b,A,A,R)}}else if(g!==void 0){const y=g.array;x=g.version;for(let M=0,T=y.length/3-1;M<T;M+=3){const R=M+0,b=M+1,A=M+2;d.push(R,b,b,A,A,R)}}else return;const m=new(Ka(d)?Qa:Za)(d,1);m.version=x;const p=r.get(u);p&&e.remove(p),r.set(u,m)}function h(u){const d=r.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function Zd(s,e,t){let n;function i(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function l(d,f){s.drawElements(n,f,r,d*a),t.update(f,n,1)}function c(d,f,g){g!==0&&(s.drawElementsInstanced(n,f,r,d*a,g),t.update(f,n,g))}function h(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function u(d,f,g,x){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)c(d[p]/a,f[p],x[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,x,0,g);let p=0;for(let y=0;y<g;y++)p+=f[y]*x[y];t.update(p,n,1)}}this.setMode=i,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Qd(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case s.TRIANGLES:t.triangles+=o*(r/3);break;case s.LINES:t.lines+=o*(r/2);break;case s.LINE_STRIP:t.lines+=o*(r-1);break;case s.LINE_LOOP:t.lines+=o*r;break;case s.POINTS:t.points+=o*r;break;default:gt("WebGLInfo: Unknown draw mode:",a);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function ef(s,e,t){const n=new WeakMap,i=new xt;function r(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(o);if(d===void 0||d.count!==u){let _=function(){A.dispose(),n.delete(o),o.removeEventListener("dispose",_)};d!==void 0&&d.texture.dispose();const f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,x=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let M=0;f===!0&&(M=1),g===!0&&(M=2),x===!0&&(M=3);let T=o.attributes.position.count*M,R=1;T>e.maxTextureSize&&(R=Math.ceil(T/e.maxTextureSize),T=e.maxTextureSize);const b=new Float32Array(T*R*4*u),A=new Ja(b,T,R,u);A.type=tn,A.needsUpdate=!0;const w=M*4;for(let v=0;v<u;v++){const C=m[v],L=p[v],N=y[v],O=T*R*4*v;for(let z=0;z<C.count;z++){const W=z*w;f===!0&&(i.fromBufferAttribute(C,z),b[O+W+0]=i.x,b[O+W+1]=i.y,b[O+W+2]=i.z,b[O+W+3]=0),g===!0&&(i.fromBufferAttribute(L,z),b[O+W+4]=i.x,b[O+W+5]=i.y,b[O+W+6]=i.z,b[O+W+7]=0),x===!0&&(i.fromBufferAttribute(N,z),b[O+W+8]=i.x,b[O+W+9]=i.y,b[O+W+10]=i.z,b[O+W+11]=N.itemSize===4?i.w:1)}}d={count:u,texture:A,size:new et(T,R)},n.set(o,d),o.addEventListener("dispose",_)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",a.morphTexture,t);else{let f=0;for(let x=0;x<c.length;x++)f+=c[x];const g=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(s,"morphTargetBaseInfluence",g),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(s,"morphTargetsTextureSize",d.size)}return{update:r}}function tf(s,e,t,n){let i=new WeakMap;function r(l){const c=n.render.frame,h=l.geometry,u=e.get(l,h);if(i.get(u)!==c&&(e.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),i.get(l)!==c&&(t.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,s.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const d=l.skeleton;i.get(d)!==c&&(d.update(),i.set(d,c))}return u}function a(){i=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:a}}const al=new wt,ma=new vo(1,1),ll=new Ja,cl=new mc,hl=new nl,ga=[],xa=[],_a=new Float32Array(16),va=new Float32Array(9),Sa=new Float32Array(4);function vi(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let r=ga[i];if(r===void 0&&(r=new Float32Array(i),ga[i]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,s[a].toArray(r,o)}return r}function Mt(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function yt(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function Ps(s,e){let t=xa[e];t===void 0&&(t=new Int32Array(e),xa[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function nf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function sf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mt(t,e))return;s.uniform2fv(this.addr,e),yt(t,e)}}function rf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Mt(t,e))return;s.uniform3fv(this.addr,e),yt(t,e)}}function of(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mt(t,e))return;s.uniform4fv(this.addr,e),yt(t,e)}}function af(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Mt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),yt(t,e)}else{if(Mt(t,n))return;Sa.set(n),s.uniformMatrix2fv(this.addr,!1,Sa),yt(t,n)}}function lf(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Mt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),yt(t,e)}else{if(Mt(t,n))return;va.set(n),s.uniformMatrix3fv(this.addr,!1,va),yt(t,n)}}function cf(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Mt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),yt(t,e)}else{if(Mt(t,n))return;_a.set(n),s.uniformMatrix4fv(this.addr,!1,_a),yt(t,n)}}function hf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function uf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mt(t,e))return;s.uniform2iv(this.addr,e),yt(t,e)}}function df(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Mt(t,e))return;s.uniform3iv(this.addr,e),yt(t,e)}}function ff(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mt(t,e))return;s.uniform4iv(this.addr,e),yt(t,e)}}function pf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function mf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mt(t,e))return;s.uniform2uiv(this.addr,e),yt(t,e)}}function gf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Mt(t,e))return;s.uniform3uiv(this.addr,e),yt(t,e)}}function xf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mt(t,e))return;s.uniform4uiv(this.addr,e),yt(t,e)}}function _f(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(ma.compareFunction=$a,r=ma):r=al,t.setTexture2D(e||r,i)}function vf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||cl,i)}function Sf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||hl,i)}function bf(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||ll,i)}function Mf(s){switch(s){case 5126:return nf;case 35664:return sf;case 35665:return rf;case 35666:return of;case 35674:return af;case 35675:return lf;case 35676:return cf;case 5124:case 35670:return hf;case 35667:case 35671:return uf;case 35668:case 35672:return df;case 35669:case 35673:return ff;case 5125:return pf;case 36294:return mf;case 36295:return gf;case 36296:return xf;case 35678:case 36198:case 36298:case 36306:case 35682:return _f;case 35679:case 36299:case 36307:return vf;case 35680:case 36300:case 36308:case 36293:return Sf;case 36289:case 36303:case 36311:case 36292:return bf}}function yf(s,e){s.uniform1fv(this.addr,e)}function Ef(s,e){const t=vi(e,this.size,2);s.uniform2fv(this.addr,t)}function Tf(s,e){const t=vi(e,this.size,3);s.uniform3fv(this.addr,t)}function Af(s,e){const t=vi(e,this.size,4);s.uniform4fv(this.addr,t)}function Rf(s,e){const t=vi(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function wf(s,e){const t=vi(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Cf(s,e){const t=vi(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Pf(s,e){s.uniform1iv(this.addr,e)}function Df(s,e){s.uniform2iv(this.addr,e)}function If(s,e){s.uniform3iv(this.addr,e)}function Lf(s,e){s.uniform4iv(this.addr,e)}function Uf(s,e){s.uniform1uiv(this.addr,e)}function Nf(s,e){s.uniform2uiv(this.addr,e)}function Ff(s,e){s.uniform3uiv(this.addr,e)}function Of(s,e){s.uniform4uiv(this.addr,e)}function Bf(s,e,t){const n=this.cache,i=e.length,r=Ps(t,i);Mt(n,r)||(s.uniform1iv(this.addr,r),yt(n,r));for(let a=0;a!==i;++a)t.setTexture2D(e[a]||al,r[a])}function kf(s,e,t){const n=this.cache,i=e.length,r=Ps(t,i);Mt(n,r)||(s.uniform1iv(this.addr,r),yt(n,r));for(let a=0;a!==i;++a)t.setTexture3D(e[a]||cl,r[a])}function zf(s,e,t){const n=this.cache,i=e.length,r=Ps(t,i);Mt(n,r)||(s.uniform1iv(this.addr,r),yt(n,r));for(let a=0;a!==i;++a)t.setTextureCube(e[a]||hl,r[a])}function Gf(s,e,t){const n=this.cache,i=e.length,r=Ps(t,i);Mt(n,r)||(s.uniform1iv(this.addr,r),yt(n,r));for(let a=0;a!==i;++a)t.setTexture2DArray(e[a]||ll,r[a])}function Vf(s){switch(s){case 5126:return yf;case 35664:return Ef;case 35665:return Tf;case 35666:return Af;case 35674:return Rf;case 35675:return wf;case 35676:return Cf;case 5124:case 35670:return Pf;case 35667:case 35671:return Df;case 35668:case 35672:return If;case 35669:case 35673:return Lf;case 5125:return Uf;case 36294:return Nf;case 36295:return Ff;case 36296:return Of;case 35678:case 36198:case 36298:case 36306:case 35682:return Bf;case 35679:case 36299:case 36307:return kf;case 35680:case 36300:case 36308:case 36293:return zf;case 36289:case 36303:case 36311:case 36292:return Gf}}class Hf{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Mf(t.type)}}class Wf{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Vf(t.type)}}class Xf{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,a=i.length;r!==a;++r){const o=i[r];o.setValue(e,t[o.id],n)}}}const ur=/(\w+)(\])?(\[|\.)?/g;function ba(s,e){s.seq.push(e),s.map[e.id]=e}function qf(s,e,t){const n=s.name,i=n.length;for(ur.lastIndex=0;;){const r=ur.exec(n),a=ur.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){ba(t,c===void 0?new Hf(o,s,e):new Wf(o,s,e));break}else{let u=t.map[o];u===void 0&&(u=new Xf(o),ba(t,u)),t=u}}}class _s{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=e.getActiveUniform(t,i),a=e.getUniformLocation(t,r.name);qf(r,a,this)}}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,a=t.length;r!==a;++r){const o=t[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const a=e[i];a.id in t&&n.push(a)}return n}}function Ma(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const Yf=37297;let $f=0;function Kf(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=i;a<r;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const ya=new qe;function Jf(s){nt._getMatrix(ya,nt.workingColorSpace,s);const e=`mat3( ${ya.elements.map(t=>t.toFixed(4))} )`;switch(nt.getTransfer(s)){case bs:return[e,"LinearTransferOETF"];case at:return[e,"sRGBTransferOETF"];default:return Xe("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function Ea(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+Kf(s.getShaderSource(e),o)}else return r}function jf(s,e){const t=Jf(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Zf(s,e){let t;switch(e){case Hl:t="Linear";break;case Wl:t="Reinhard";break;case Xl:t="Cineon";break;case ql:t="ACESFilmic";break;case $l:t="AgX";break;case Kl:t="Neutral";break;case Yl:t="Custom";break;default:Xe("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const hs=new I;function Qf(){nt.getLuminanceCoefficients(hs);const s=hs.x.toFixed(4),e=hs.y.toFixed(4),t=hs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ep(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(wi).join(`
`)}function tp(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function np(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(e,i),a=r.name;let o=1;r.type===s.FLOAT_MAT2&&(o=2),r.type===s.FLOAT_MAT3&&(o=3),r.type===s.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:s.getAttribLocation(e,a),locationSize:o}}return t}function wi(s){return s!==""}function Ta(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Aa(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ip=/^[ \t]*#include +<([\w\d./]+)>/gm;function no(s){return s.replace(ip,rp)}const sp=new Map;function rp(s,e){let t=Ye[e];if(t===void 0){const n=sp.get(e);if(n!==void 0)t=Ye[n],Xe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return no(t)}const op=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ra(s){return s.replace(op,ap)}function ap(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function wa(s){let e=`precision ${s.precision} float;
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
#define LOW_PRECISION`),e}function lp(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Oa?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===Ba?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===xn&&(e="SHADOWMAP_TYPE_VSM"),e}function cp(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ui:case di:e="ENVMAP_TYPE_CUBE";break;case Ts:e="ENVMAP_TYPE_CUBE_UV";break}return e}function hp(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case di:e="ENVMAP_MODE_REFRACTION";break}return e}function up(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case ro:e="ENVMAP_BLENDING_MULTIPLY";break;case Gl:e="ENVMAP_BLENDING_MIX";break;case Vl:e="ENVMAP_BLENDING_ADD";break}return e}function dp(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function fp(s,e,t,n){const i=s.getContext(),r=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=lp(t),c=cp(t),h=hp(t),u=up(t),d=dp(t),f=ep(t),g=tp(r),x=i.createProgram();let m,p,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(wi).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(wi).join(`
`),p.length>0&&(p+=`
`)):(m=[wa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(wi).join(`
`),p=[wa(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Cn?"#define TONE_MAPPING":"",t.toneMapping!==Cn?Ye.tonemapping_pars_fragment:"",t.toneMapping!==Cn?Zf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ye.colorspace_pars_fragment,jf("linearToOutputTexel",t.outputColorSpace),Qf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(wi).join(`
`)),a=no(a),a=Ta(a,t),a=Aa(a,t),o=no(o),o=Ta(o,t),o=Aa(o,t),a=Ra(a),o=Ra(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===No?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===No?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const M=y+m+a,T=y+p+o,R=Ma(i,i.VERTEX_SHADER,M),b=Ma(i,i.FRAGMENT_SHADER,T);i.attachShader(x,R),i.attachShader(x,b),t.index0AttributeName!==void 0?i.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function A(C){if(s.debug.checkShaderErrors){const L=i.getProgramInfoLog(x)||"",N=i.getShaderInfoLog(R)||"",O=i.getShaderInfoLog(b)||"",z=L.trim(),W=N.trim(),ee=O.trim();let X=!0,te=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(X=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,R,b);else{const ne=Ea(i,R,"vertex"),se=Ea(i,b,"fragment");gt("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+z+`
`+ne+`
`+se)}else z!==""?Xe("WebGLProgram: Program Info Log:",z):(W===""||ee==="")&&(te=!1);te&&(C.diagnostics={runnable:X,programLog:z,vertexShader:{log:W,prefix:m},fragmentShader:{log:ee,prefix:p}})}i.deleteShader(R),i.deleteShader(b),w=new _s(i,x),_=np(i,x)}let w;this.getUniforms=function(){return w===void 0&&A(this),w};let _;this.getAttributes=function(){return _===void 0&&A(this),_};let v=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return v===!1&&(v=i.getProgramParameter(x,Yf)),v},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=$f++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=R,this.fragmentShader=b,this}let pp=0;class mp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(i)===!1&&(a.add(i),i.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new gp(e),t.set(e,n)),n}}class gp{constructor(e){this.id=pp++,this.code=e,this.usedTimes=0}}function xp(s,e,t,n,i,r,a){const o=new go,l=new mp,c=new Set,h=[],u=i.logarithmicDepthBuffer,d=i.vertexTextures;let f=i.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return c.add(_),_===0?"uv":`uv${_}`}function m(_,v,C,L,N){const O=L.fog,z=N.geometry,W=_.isMeshStandardMaterial?L.environment:null,ee=(_.isMeshStandardMaterial?t:e).get(_.envMap||W),X=ee&&ee.mapping===Ts?ee.image.height:null,te=g[_.type];_.precision!==null&&(f=i.getMaxPrecision(_.precision),f!==_.precision&&Xe("WebGLProgram.getParameters:",_.precision,"not supported, using",f,"instead."));const ne=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,se=ne!==void 0?ne.length:0;let Pe=0;z.morphAttributes.position!==void 0&&(Pe=1),z.morphAttributes.normal!==void 0&&(Pe=2),z.morphAttributes.color!==void 0&&(Pe=3);let Ge,Ke,Qe,K;if(te){const rt=rn[te];Ge=rt.vertexShader,Ke=rt.fragmentShader}else Ge=_.vertexShader,Ke=_.fragmentShader,l.update(_),Qe=l.getVertexShaderID(_),K=l.getFragmentShaderID(_);const j=s.getRenderTarget(),ue=s.state.buffers.depth.getReversed(),Ie=N.isInstancedMesh===!0,xe=N.isBatchedMesh===!0,Ne=!!_.map,it=!!_.matcap,Le=!!ee,$e=!!_.aoMap,D=!!_.lightMap,Re=!!_.bumpMap,ve=!!_.normalMap,Je=!!_.displacementMap,ge=!!_.emissiveMap,st=!!_.metalnessMap,Te=!!_.roughnessMap,Fe=_.anisotropy>0,P=_.clearcoat>0,S=_.dispersion>0,G=_.iridescence>0,J=_.sheen>0,Q=_.transmission>0,$=Fe&&!!_.anisotropyMap,Ee=P&&!!_.clearcoatMap,he=P&&!!_.clearcoatNormalMap,we=P&&!!_.clearcoatRoughnessMap,be=G&&!!_.iridescenceMap,ie=G&&!!_.iridescenceThicknessMap,ae=J&&!!_.sheenColorMap,ze=J&&!!_.sheenRoughnessMap,Oe=!!_.specularMap,_e=!!_.specularColorMap,He=!!_.specularIntensityMap,U=Q&&!!_.transmissionMap,fe=Q&&!!_.thicknessMap,le=!!_.gradientMap,ce=!!_.alphaMap,re=_.alphaTest>0,Z=!!_.alphaHash,Me=!!_.extensions;let We=Cn;_.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(We=s.toneMapping);const ut={shaderID:te,shaderType:_.type,shaderName:_.name,vertexShader:Ge,fragmentShader:Ke,defines:_.defines,customVertexShaderID:Qe,customFragmentShaderID:K,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:f,batching:xe,batchingColor:xe&&N._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&N.instanceColor!==null,instancingMorph:Ie&&N.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:j===null?s.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:fi,alphaToCoverage:!!_.alphaToCoverage,map:Ne,matcap:it,envMap:Le,envMapMode:Le&&ee.mapping,envMapCubeUVHeight:X,aoMap:$e,lightMap:D,bumpMap:Re,normalMap:ve,displacementMap:d&&Je,emissiveMap:ge,normalMapObjectSpace:ve&&_.normalMapType===Ql,normalMapTangentSpace:ve&&_.normalMapType===Ya,metalnessMap:st,roughnessMap:Te,anisotropy:Fe,anisotropyMap:$,clearcoat:P,clearcoatMap:Ee,clearcoatNormalMap:he,clearcoatRoughnessMap:we,dispersion:S,iridescence:G,iridescenceMap:be,iridescenceThicknessMap:ie,sheen:J,sheenColorMap:ae,sheenRoughnessMap:ze,specularMap:Oe,specularColorMap:_e,specularIntensityMap:He,transmission:Q,transmissionMap:U,thicknessMap:fe,gradientMap:le,opaque:_.transparent===!1&&_.blending===li&&_.alphaToCoverage===!1,alphaMap:ce,alphaTest:re,alphaHash:Z,combine:_.combine,mapUv:Ne&&x(_.map.channel),aoMapUv:$e&&x(_.aoMap.channel),lightMapUv:D&&x(_.lightMap.channel),bumpMapUv:Re&&x(_.bumpMap.channel),normalMapUv:ve&&x(_.normalMap.channel),displacementMapUv:Je&&x(_.displacementMap.channel),emissiveMapUv:ge&&x(_.emissiveMap.channel),metalnessMapUv:st&&x(_.metalnessMap.channel),roughnessMapUv:Te&&x(_.roughnessMap.channel),anisotropyMapUv:$&&x(_.anisotropyMap.channel),clearcoatMapUv:Ee&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:he&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:we&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:ae&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:ze&&x(_.sheenRoughnessMap.channel),specularMapUv:Oe&&x(_.specularMap.channel),specularColorMapUv:_e&&x(_.specularColorMap.channel),specularIntensityMapUv:He&&x(_.specularIntensityMap.channel),transmissionMapUv:U&&x(_.transmissionMap.channel),thicknessMapUv:fe&&x(_.thicknessMap.channel),alphaMapUv:ce&&x(_.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(ve||Fe),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!z.attributes.uv&&(Ne||ce),fog:!!O,useFog:_.fog===!0,fogExp2:!!O&&O.isFogExp2,flatShading:_.flatShading===!0&&_.wireframe===!1,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:ue,skinning:N.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:se,morphTextureStride:Pe,numDirLights:v.directional.length,numPointLights:v.point.length,numSpotLights:v.spot.length,numSpotLightMaps:v.spotLightMap.length,numRectAreaLights:v.rectArea.length,numHemiLights:v.hemi.length,numDirLightShadows:v.directionalShadowMap.length,numPointLightShadows:v.pointShadowMap.length,numSpotLightShadows:v.spotShadowMap.length,numSpotLightShadowsWithMaps:v.numSpotLightShadowsWithMaps,numLightProbes:v.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&C.length>0,shadowMapType:s.shadowMap.type,toneMapping:We,decodeVideoTexture:Ne&&_.map.isVideoTexture===!0&&nt.getTransfer(_.map.colorSpace)===at,decodeVideoTextureEmissive:ge&&_.emissiveMap.isVideoTexture===!0&&nt.getTransfer(_.emissiveMap.colorSpace)===at,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Vt,flipSided:_.side===Dt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Me&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&_.extensions.multiDraw===!0||xe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return ut.vertexUv1s=c.has(1),ut.vertexUv2s=c.has(2),ut.vertexUv3s=c.has(3),c.clear(),ut}function p(_){const v=[];if(_.shaderID?v.push(_.shaderID):(v.push(_.customVertexShaderID),v.push(_.customFragmentShaderID)),_.defines!==void 0)for(const C in _.defines)v.push(C),v.push(_.defines[C]);return _.isRawShaderMaterial===!1&&(y(v,_),M(v,_),v.push(s.outputColorSpace)),v.push(_.customProgramCacheKey),v.join()}function y(_,v){_.push(v.precision),_.push(v.outputColorSpace),_.push(v.envMapMode),_.push(v.envMapCubeUVHeight),_.push(v.mapUv),_.push(v.alphaMapUv),_.push(v.lightMapUv),_.push(v.aoMapUv),_.push(v.bumpMapUv),_.push(v.normalMapUv),_.push(v.displacementMapUv),_.push(v.emissiveMapUv),_.push(v.metalnessMapUv),_.push(v.roughnessMapUv),_.push(v.anisotropyMapUv),_.push(v.clearcoatMapUv),_.push(v.clearcoatNormalMapUv),_.push(v.clearcoatRoughnessMapUv),_.push(v.iridescenceMapUv),_.push(v.iridescenceThicknessMapUv),_.push(v.sheenColorMapUv),_.push(v.sheenRoughnessMapUv),_.push(v.specularMapUv),_.push(v.specularColorMapUv),_.push(v.specularIntensityMapUv),_.push(v.transmissionMapUv),_.push(v.thicknessMapUv),_.push(v.combine),_.push(v.fogExp2),_.push(v.sizeAttenuation),_.push(v.morphTargetsCount),_.push(v.morphAttributeCount),_.push(v.numDirLights),_.push(v.numPointLights),_.push(v.numSpotLights),_.push(v.numSpotLightMaps),_.push(v.numHemiLights),_.push(v.numRectAreaLights),_.push(v.numDirLightShadows),_.push(v.numPointLightShadows),_.push(v.numSpotLightShadows),_.push(v.numSpotLightShadowsWithMaps),_.push(v.numLightProbes),_.push(v.shadowMapType),_.push(v.toneMapping),_.push(v.numClippingPlanes),_.push(v.numClipIntersection),_.push(v.depthPacking)}function M(_,v){o.disableAll(),v.supportsVertexTextures&&o.enable(0),v.instancing&&o.enable(1),v.instancingColor&&o.enable(2),v.instancingMorph&&o.enable(3),v.matcap&&o.enable(4),v.envMap&&o.enable(5),v.normalMapObjectSpace&&o.enable(6),v.normalMapTangentSpace&&o.enable(7),v.clearcoat&&o.enable(8),v.iridescence&&o.enable(9),v.alphaTest&&o.enable(10),v.vertexColors&&o.enable(11),v.vertexAlphas&&o.enable(12),v.vertexUv1s&&o.enable(13),v.vertexUv2s&&o.enable(14),v.vertexUv3s&&o.enable(15),v.vertexTangents&&o.enable(16),v.anisotropy&&o.enable(17),v.alphaHash&&o.enable(18),v.batching&&o.enable(19),v.dispersion&&o.enable(20),v.batchingColor&&o.enable(21),v.gradientMap&&o.enable(22),_.push(o.mask),o.disableAll(),v.fog&&o.enable(0),v.useFog&&o.enable(1),v.flatShading&&o.enable(2),v.logarithmicDepthBuffer&&o.enable(3),v.reversedDepthBuffer&&o.enable(4),v.skinning&&o.enable(5),v.morphTargets&&o.enable(6),v.morphNormals&&o.enable(7),v.morphColors&&o.enable(8),v.premultipliedAlpha&&o.enable(9),v.shadowMapEnabled&&o.enable(10),v.doubleSided&&o.enable(11),v.flipSided&&o.enable(12),v.useDepthPacking&&o.enable(13),v.dithering&&o.enable(14),v.transmission&&o.enable(15),v.sheen&&o.enable(16),v.opaque&&o.enable(17),v.pointsUvs&&o.enable(18),v.decodeVideoTexture&&o.enable(19),v.decodeVideoTextureEmissive&&o.enable(20),v.alphaToCoverage&&o.enable(21),_.push(o.mask)}function T(_){const v=g[_.type];let C;if(v){const L=rn[v];C=wc.clone(L.uniforms)}else C=_.uniforms;return C}function R(_,v){let C;for(let L=0,N=h.length;L<N;L++){const O=h[L];if(O.cacheKey===v){C=O,++C.usedTimes;break}}return C===void 0&&(C=new fp(s,v,_,r),h.push(C)),C}function b(_){if(--_.usedTimes===0){const v=h.indexOf(_);h[v]=h[h.length-1],h.pop(),_.destroy()}}function A(_){l.remove(_)}function w(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:T,acquireProgram:R,releaseProgram:b,releaseShaderCache:A,programs:h,dispose:w}}function _p(){let s=new WeakMap;function e(a){return s.has(a)}function t(a){let o=s.get(a);return o===void 0&&(o={},s.set(a,o)),o}function n(a){s.delete(a)}function i(a,o,l){s.get(a)[o]=l}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function vp(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function Ca(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Pa(){const s=[];let e=0;const t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function a(u,d,f,g,x,m){let p=s[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},s[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=x,p.group=m),e++,p}function o(u,d,f,g,x,m){const p=a(u,d,f,g,x,m);f.transmission>0?n.push(p):f.transparent===!0?i.push(p):t.push(p)}function l(u,d,f,g,x,m){const p=a(u,d,f,g,x,m);f.transmission>0?n.unshift(p):f.transparent===!0?i.unshift(p):t.unshift(p)}function c(u,d){t.length>1&&t.sort(u||vp),n.length>1&&n.sort(d||Ca),i.length>1&&i.sort(d||Ca)}function h(){for(let u=e,d=s.length;u<d;u++){const f=s[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:o,unshift:l,finish:h,sort:c}}function Sp(){let s=new WeakMap;function e(n,i){const r=s.get(n);let a;return r===void 0?(a=new Pa,s.set(n,[a])):i>=r.length?(a=new Pa,r.push(a)):a=r[i],a}function t(){s=new WeakMap}return{get:e,dispose:t}}function bp(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new I,color:new De};break;case"SpotLight":t={position:new I,direction:new I,color:new De,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new I,color:new De,distance:0,decay:0};break;case"HemisphereLight":t={direction:new I,skyColor:new De,groundColor:new De};break;case"RectAreaLight":t={color:new De,position:new I,halfWidth:new I,halfHeight:new I};break}return s[e.id]=t,t}}}function Mp(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let yp=0;function Ep(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function Tp(s){const e=new bp,t=Mp(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new I);const i=new I,r=new ht,a=new ht;function o(c){let h=0,u=0,d=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let f=0,g=0,x=0,m=0,p=0,y=0,M=0,T=0,R=0,b=0,A=0;c.sort(Ep);for(let _=0,v=c.length;_<v;_++){const C=c[_],L=C.color,N=C.intensity,O=C.distance,z=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)h+=L.r*N,u+=L.g*N,d+=L.b*N;else if(C.isLightProbe){for(let W=0;W<9;W++)n.probe[W].addScaledVector(C.sh.coefficients[W],N);A++}else if(C.isDirectionalLight){const W=e.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const ee=C.shadow,X=t.get(C);X.shadowIntensity=ee.intensity,X.shadowBias=ee.bias,X.shadowNormalBias=ee.normalBias,X.shadowRadius=ee.radius,X.shadowMapSize=ee.mapSize,n.directionalShadow[f]=X,n.directionalShadowMap[f]=z,n.directionalShadowMatrix[f]=C.shadow.matrix,y++}n.directional[f]=W,f++}else if(C.isSpotLight){const W=e.get(C);W.position.setFromMatrixPosition(C.matrixWorld),W.color.copy(L).multiplyScalar(N),W.distance=O,W.coneCos=Math.cos(C.angle),W.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),W.decay=C.decay,n.spot[x]=W;const ee=C.shadow;if(C.map&&(n.spotLightMap[R]=C.map,R++,ee.updateMatrices(C),C.castShadow&&b++),n.spotLightMatrix[x]=ee.matrix,C.castShadow){const X=t.get(C);X.shadowIntensity=ee.intensity,X.shadowBias=ee.bias,X.shadowNormalBias=ee.normalBias,X.shadowRadius=ee.radius,X.shadowMapSize=ee.mapSize,n.spotShadow[x]=X,n.spotShadowMap[x]=z,T++}x++}else if(C.isRectAreaLight){const W=e.get(C);W.color.copy(L).multiplyScalar(N),W.halfWidth.set(C.width*.5,0,0),W.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=W,m++}else if(C.isPointLight){const W=e.get(C);if(W.color.copy(C.color).multiplyScalar(C.intensity),W.distance=C.distance,W.decay=C.decay,C.castShadow){const ee=C.shadow,X=t.get(C);X.shadowIntensity=ee.intensity,X.shadowBias=ee.bias,X.shadowNormalBias=ee.normalBias,X.shadowRadius=ee.radius,X.shadowMapSize=ee.mapSize,X.shadowCameraNear=ee.camera.near,X.shadowCameraFar=ee.camera.far,n.pointShadow[g]=X,n.pointShadowMap[g]=z,n.pointShadowMatrix[g]=C.shadow.matrix,M++}n.point[g]=W,g++}else if(C.isHemisphereLight){const W=e.get(C);W.skyColor.copy(C.color).multiplyScalar(N),W.groundColor.copy(C.groundColor).multiplyScalar(N),n.hemi[p]=W,p++}}m>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=de.LTC_FLOAT_1,n.rectAreaLTC2=de.LTC_FLOAT_2):(n.rectAreaLTC1=de.LTC_HALF_1,n.rectAreaLTC2=de.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const w=n.hash;(w.directionalLength!==f||w.pointLength!==g||w.spotLength!==x||w.rectAreaLength!==m||w.hemiLength!==p||w.numDirectionalShadows!==y||w.numPointShadows!==M||w.numSpotShadows!==T||w.numSpotMaps!==R||w.numLightProbes!==A)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=T,n.spotShadowMap.length=T,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=T+R-b,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=A,w.directionalLength=f,w.pointLength=g,w.spotLength=x,w.rectAreaLength=m,w.hemiLength=p,w.numDirectionalShadows=y,w.numPointShadows=M,w.numSpotShadows=T,w.numSpotMaps=R,w.numLightProbes=A,n.version=yp++)}function l(c,h){let u=0,d=0,f=0,g=0,x=0;const m=h.matrixWorldInverse;for(let p=0,y=c.length;p<y;p++){const M=c[p];if(M.isDirectionalLight){const T=n.directional[u];T.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(i),T.direction.transformDirection(m),u++}else if(M.isSpotLight){const T=n.spot[f];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),T.direction.sub(i),T.direction.transformDirection(m),f++}else if(M.isRectAreaLight){const T=n.rectArea[g];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),a.identity(),r.copy(M.matrixWorld),r.premultiply(m),a.extractRotation(r),T.halfWidth.set(M.width*.5,0,0),T.halfHeight.set(0,M.height*.5,0),T.halfWidth.applyMatrix4(a),T.halfHeight.applyMatrix4(a),g++}else if(M.isPointLight){const T=n.point[d];T.position.setFromMatrixPosition(M.matrixWorld),T.position.applyMatrix4(m),d++}else if(M.isHemisphereLight){const T=n.hemi[x];T.direction.setFromMatrixPosition(M.matrixWorld),T.direction.transformDirection(m),x++}}}return{setup:o,setupView:l,state:n}}function Da(s){const e=new Tp(s),t=[],n=[];function i(h){c.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:o,setupLightsView:l,pushLight:r,pushShadow:a}}function Ap(s){let e=new WeakMap;function t(i,r=0){const a=e.get(i);let o;return a===void 0?(o=new Da(s),e.set(i,[o])):r>=a.length?(o=new Da(s),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const Rp=`void main() {
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
}`;function Cp(s,e,t){let n=new As;const i=new et,r=new et,a=new xt,o=new Vc({depthPacking:Zl}),l=new Hc,c={},h=t.maxTextureSize,u={[Pn]:Dt,[Dt]:Pn,[Vt]:Vt},d=new Tt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new et},radius:{value:4}},vertexShader:Rp,fragmentShader:wp}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new ct;g.setAttribute("position",new Ot(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Be(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Oa;let p=this.type;this.render=function(b,A,w){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;const _=s.getRenderTarget(),v=s.getActiveCubeFace(),C=s.getActiveMipmapLevel(),L=s.state;L.setBlending(vn),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);const N=p!==xn&&this.type===xn,O=p===xn&&this.type!==xn;for(let z=0,W=b.length;z<W;z++){const ee=b[z],X=ee.shadow;if(X===void 0){Xe("WebGLShadowMap:",ee,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;i.copy(X.mapSize);const te=X.getFrameExtents();if(i.multiply(te),r.copy(X.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/te.x),i.x=r.x*te.x,X.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/te.y),i.y=r.y*te.y,X.mapSize.y=r.y)),X.map===null||N===!0||O===!0){const se=this.type!==xn?{minFilter:Rt,magFilter:Rt}:{};X.map!==null&&X.map.dispose(),X.map=new Dn(i.x,i.y,se),X.map.texture.name=ee.name+".shadowMap",X.camera.updateProjectionMatrix()}s.setRenderTarget(X.map),s.clear();const ne=X.getViewportCount();for(let se=0;se<ne;se++){const Pe=X.getViewport(se);a.set(r.x*Pe.x,r.y*Pe.y,r.x*Pe.z,r.y*Pe.w),L.viewport(a),X.updateMatrices(ee,se),n=X.getFrustum(),T(A,w,X.camera,ee,this.type)}X.isPointLightShadow!==!0&&this.type===xn&&y(X,w),X.needsUpdate=!1}p=this.type,m.needsUpdate=!1,s.setRenderTarget(_,v,C)};function y(b,A){const w=e.update(x);d.defines.VSM_SAMPLES!==b.blurSamples&&(d.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new Dn(i.x,i.y)),d.uniforms.shadow_pass.value=b.map.texture,d.uniforms.resolution.value=b.mapSize,d.uniforms.radius.value=b.radius,s.setRenderTarget(b.mapPass),s.clear(),s.renderBufferDirect(A,null,w,d,x,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,s.setRenderTarget(b.map),s.clear(),s.renderBufferDirect(A,null,w,f,x,null)}function M(b,A,w,_){let v=null;const C=w.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(C!==void 0)v=C;else if(v=w.isPointLight===!0?l:o,s.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){const L=v.uuid,N=A.uuid;let O=c[L];O===void 0&&(O={},c[L]=O);let z=O[N];z===void 0&&(z=v.clone(),O[N]=z,A.addEventListener("dispose",R)),v=z}if(v.visible=A.visible,v.wireframe=A.wireframe,_===xn?v.side=A.shadowSide!==null?A.shadowSide:A.side:v.side=A.shadowSide!==null?A.shadowSide:u[A.side],v.alphaMap=A.alphaMap,v.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,v.map=A.map,v.clipShadows=A.clipShadows,v.clippingPlanes=A.clippingPlanes,v.clipIntersection=A.clipIntersection,v.displacementMap=A.displacementMap,v.displacementScale=A.displacementScale,v.displacementBias=A.displacementBias,v.wireframeLinewidth=A.wireframeLinewidth,v.linewidth=A.linewidth,w.isPointLight===!0&&v.isMeshDistanceMaterial===!0){const L=s.properties.get(v);L.light=w}return v}function T(b,A,w,_,v){if(b.visible===!1)return;if(b.layers.test(A.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&v===xn)&&(!b.frustumCulled||n.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,b.matrixWorld);const N=e.update(b),O=b.material;if(Array.isArray(O)){const z=N.groups;for(let W=0,ee=z.length;W<ee;W++){const X=z[W],te=O[X.materialIndex];if(te&&te.visible){const ne=M(b,te,_,v);b.onBeforeShadow(s,b,A,w,N,ne,X),s.renderBufferDirect(w,null,N,ne,b,X),b.onAfterShadow(s,b,A,w,N,ne,X)}}}else if(O.visible){const z=M(b,O,_,v);b.onBeforeShadow(s,b,A,w,N,z,null),s.renderBufferDirect(w,null,N,z,b,null),b.onAfterShadow(s,b,A,w,N,z,null)}}const L=b.children;for(let N=0,O=L.length;N<O;N++)T(L[N],A,w,_,v)}function R(b){b.target.removeEventListener("dispose",R);for(const w in c){const _=c[w],v=b.target.uuid;v in _&&(_[v].dispose(),delete _[v])}}}const Pp={[mr]:gr,[xr]:Sr,[_r]:br,[hi]:vr,[gr]:mr,[Sr]:xr,[br]:_r,[vr]:hi};function Dp(s,e){function t(){let U=!1;const fe=new xt;let le=null;const ce=new xt(0,0,0,0);return{setMask:function(re){le!==re&&!U&&(s.colorMask(re,re,re,re),le=re)},setLocked:function(re){U=re},setClear:function(re,Z,Me,We,ut){ut===!0&&(re*=We,Z*=We,Me*=We),fe.set(re,Z,Me,We),ce.equals(fe)===!1&&(s.clearColor(re,Z,Me,We),ce.copy(fe))},reset:function(){U=!1,le=null,ce.set(-1,0,0,0)}}}function n(){let U=!1,fe=!1,le=null,ce=null,re=null;return{setReversed:function(Z){if(fe!==Z){const Me=e.get("EXT_clip_control");Z?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),fe=Z;const We=re;re=null,this.setClear(We)}},getReversed:function(){return fe},setTest:function(Z){Z?j(s.DEPTH_TEST):ue(s.DEPTH_TEST)},setMask:function(Z){le!==Z&&!U&&(s.depthMask(Z),le=Z)},setFunc:function(Z){if(fe&&(Z=Pp[Z]),ce!==Z){switch(Z){case mr:s.depthFunc(s.NEVER);break;case gr:s.depthFunc(s.ALWAYS);break;case xr:s.depthFunc(s.LESS);break;case hi:s.depthFunc(s.LEQUAL);break;case _r:s.depthFunc(s.EQUAL);break;case vr:s.depthFunc(s.GEQUAL);break;case Sr:s.depthFunc(s.GREATER);break;case br:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}ce=Z}},setLocked:function(Z){U=Z},setClear:function(Z){re!==Z&&(fe&&(Z=1-Z),s.clearDepth(Z),re=Z)},reset:function(){U=!1,le=null,ce=null,re=null,fe=!1}}}function i(){let U=!1,fe=null,le=null,ce=null,re=null,Z=null,Me=null,We=null,ut=null;return{setTest:function(rt){U||(rt?j(s.STENCIL_TEST):ue(s.STENCIL_TEST))},setMask:function(rt){fe!==rt&&!U&&(s.stencilMask(rt),fe=rt)},setFunc:function(rt,sn,Kt){(le!==rt||ce!==sn||re!==Kt)&&(s.stencilFunc(rt,sn,Kt),le=rt,ce=sn,re=Kt)},setOp:function(rt,sn,Kt){(Z!==rt||Me!==sn||We!==Kt)&&(s.stencilOp(rt,sn,Kt),Z=rt,Me=sn,We=Kt)},setLocked:function(rt){U=rt},setClear:function(rt){ut!==rt&&(s.clearStencil(rt),ut=rt)},reset:function(){U=!1,fe=null,le=null,ce=null,re=null,Z=null,Me=null,We=null,ut=null}}}const r=new t,a=new n,o=new i,l=new WeakMap,c=new WeakMap;let h={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,y=null,M=null,T=null,R=null,b=null,A=new De(0,0,0),w=0,_=!1,v=null,C=null,L=null,N=null,O=null;const z=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,ee=0;const X=s.getParameter(s.VERSION);X.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(X)[1]),W=ee>=1):X.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),W=ee>=2);let te=null,ne={};const se=s.getParameter(s.SCISSOR_BOX),Pe=s.getParameter(s.VIEWPORT),Ge=new xt().fromArray(se),Ke=new xt().fromArray(Pe);function Qe(U,fe,le,ce){const re=new Uint8Array(4),Z=s.createTexture();s.bindTexture(U,Z),s.texParameteri(U,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(U,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Me=0;Me<le;Me++)U===s.TEXTURE_3D||U===s.TEXTURE_2D_ARRAY?s.texImage3D(fe,0,s.RGBA,1,1,ce,0,s.RGBA,s.UNSIGNED_BYTE,re):s.texImage2D(fe+Me,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,re);return Z}const K={};K[s.TEXTURE_2D]=Qe(s.TEXTURE_2D,s.TEXTURE_2D,1),K[s.TEXTURE_CUBE_MAP]=Qe(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[s.TEXTURE_2D_ARRAY]=Qe(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),K[s.TEXTURE_3D]=Qe(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),j(s.DEPTH_TEST),a.setFunc(hi),Re(!1),ve(Po),j(s.CULL_FACE),$e(vn);function j(U){h[U]!==!0&&(s.enable(U),h[U]=!0)}function ue(U){h[U]!==!1&&(s.disable(U),h[U]=!1)}function Ie(U,fe){return u[U]!==fe?(s.bindFramebuffer(U,fe),u[U]=fe,U===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=fe),U===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=fe),!0):!1}function xe(U,fe){let le=f,ce=!1;if(U){le=d.get(fe),le===void 0&&(le=[],d.set(fe,le));const re=U.textures;if(le.length!==re.length||le[0]!==s.COLOR_ATTACHMENT0){for(let Z=0,Me=re.length;Z<Me;Z++)le[Z]=s.COLOR_ATTACHMENT0+Z;le.length=re.length,ce=!0}}else le[0]!==s.BACK&&(le[0]=s.BACK,ce=!0);ce&&s.drawBuffers(le)}function Ne(U){return g!==U?(s.useProgram(U),g=U,!0):!1}const it={[Gn]:s.FUNC_ADD,[El]:s.FUNC_SUBTRACT,[Tl]:s.FUNC_REVERSE_SUBTRACT};it[Al]=s.MIN,it[Rl]=s.MAX;const Le={[wl]:s.ZERO,[Cl]:s.ONE,[Pl]:s.SRC_COLOR,[fr]:s.SRC_ALPHA,[Fl]:s.SRC_ALPHA_SATURATE,[Ul]:s.DST_COLOR,[Il]:s.DST_ALPHA,[Dl]:s.ONE_MINUS_SRC_COLOR,[pr]:s.ONE_MINUS_SRC_ALPHA,[Nl]:s.ONE_MINUS_DST_COLOR,[Ll]:s.ONE_MINUS_DST_ALPHA,[Ol]:s.CONSTANT_COLOR,[Bl]:s.ONE_MINUS_CONSTANT_COLOR,[kl]:s.CONSTANT_ALPHA,[zl]:s.ONE_MINUS_CONSTANT_ALPHA};function $e(U,fe,le,ce,re,Z,Me,We,ut,rt){if(U===vn){x===!0&&(ue(s.BLEND),x=!1);return}if(x===!1&&(j(s.BLEND),x=!0),U!==yl){if(U!==m||rt!==_){if((p!==Gn||T!==Gn)&&(s.blendEquation(s.FUNC_ADD),p=Gn,T=Gn),rt)switch(U){case li:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case dr:s.blendFunc(s.ONE,s.ONE);break;case Do:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Io:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:gt("WebGLState: Invalid blending: ",U);break}else switch(U){case li:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case dr:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case Do:gt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Io:gt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:gt("WebGLState: Invalid blending: ",U);break}y=null,M=null,R=null,b=null,A.set(0,0,0),w=0,m=U,_=rt}return}re=re||fe,Z=Z||le,Me=Me||ce,(fe!==p||re!==T)&&(s.blendEquationSeparate(it[fe],it[re]),p=fe,T=re),(le!==y||ce!==M||Z!==R||Me!==b)&&(s.blendFuncSeparate(Le[le],Le[ce],Le[Z],Le[Me]),y=le,M=ce,R=Z,b=Me),(We.equals(A)===!1||ut!==w)&&(s.blendColor(We.r,We.g,We.b,ut),A.copy(We),w=ut),m=U,_=!1}function D(U,fe){U.side===Vt?ue(s.CULL_FACE):j(s.CULL_FACE);let le=U.side===Dt;fe&&(le=!le),Re(le),U.blending===li&&U.transparent===!1?$e(vn):$e(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),a.setFunc(U.depthFunc),a.setTest(U.depthTest),a.setMask(U.depthWrite),r.setMask(U.colorWrite);const ce=U.stencilWrite;o.setTest(ce),ce&&(o.setMask(U.stencilWriteMask),o.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),o.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),ge(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?j(s.SAMPLE_ALPHA_TO_COVERAGE):ue(s.SAMPLE_ALPHA_TO_COVERAGE)}function Re(U){v!==U&&(U?s.frontFace(s.CW):s.frontFace(s.CCW),v=U)}function ve(U){U!==bl?(j(s.CULL_FACE),U!==C&&(U===Po?s.cullFace(s.BACK):U===Ml?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):ue(s.CULL_FACE),C=U}function Je(U){U!==L&&(W&&s.lineWidth(U),L=U)}function ge(U,fe,le){U?(j(s.POLYGON_OFFSET_FILL),(N!==fe||O!==le)&&(s.polygonOffset(fe,le),N=fe,O=le)):ue(s.POLYGON_OFFSET_FILL)}function st(U){U?j(s.SCISSOR_TEST):ue(s.SCISSOR_TEST)}function Te(U){U===void 0&&(U=s.TEXTURE0+z-1),te!==U&&(s.activeTexture(U),te=U)}function Fe(U,fe,le){le===void 0&&(te===null?le=s.TEXTURE0+z-1:le=te);let ce=ne[le];ce===void 0&&(ce={type:void 0,texture:void 0},ne[le]=ce),(ce.type!==U||ce.texture!==fe)&&(te!==le&&(s.activeTexture(le),te=le),s.bindTexture(U,fe||K[U]),ce.type=U,ce.texture=fe)}function P(){const U=ne[te];U!==void 0&&U.type!==void 0&&(s.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function S(){try{s.compressedTexImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function G(){try{s.compressedTexImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function J(){try{s.texSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function Q(){try{s.texSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function $(){try{s.compressedTexSubImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function Ee(){try{s.compressedTexSubImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function he(){try{s.texStorage2D(...arguments)}catch(U){U("WebGLState:",U)}}function we(){try{s.texStorage3D(...arguments)}catch(U){U("WebGLState:",U)}}function be(){try{s.texImage2D(...arguments)}catch(U){U("WebGLState:",U)}}function ie(){try{s.texImage3D(...arguments)}catch(U){U("WebGLState:",U)}}function ae(U){Ge.equals(U)===!1&&(s.scissor(U.x,U.y,U.z,U.w),Ge.copy(U))}function ze(U){Ke.equals(U)===!1&&(s.viewport(U.x,U.y,U.z,U.w),Ke.copy(U))}function Oe(U,fe){let le=c.get(fe);le===void 0&&(le=new WeakMap,c.set(fe,le));let ce=le.get(U);ce===void 0&&(ce=s.getUniformBlockIndex(fe,U.name),le.set(U,ce))}function _e(U,fe){const ce=c.get(fe).get(U);l.get(fe)!==ce&&(s.uniformBlockBinding(fe,ce,U.__bindingPointIndex),l.set(fe,ce))}function He(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),a.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},te=null,ne={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,y=null,M=null,T=null,R=null,b=null,A=new De(0,0,0),w=0,_=!1,v=null,C=null,L=null,N=null,O=null,Ge.set(0,0,s.canvas.width,s.canvas.height),Ke.set(0,0,s.canvas.width,s.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:j,disable:ue,bindFramebuffer:Ie,drawBuffers:xe,useProgram:Ne,setBlending:$e,setMaterial:D,setFlipSided:Re,setCullFace:ve,setLineWidth:Je,setPolygonOffset:ge,setScissorTest:st,activeTexture:Te,bindTexture:Fe,unbindTexture:P,compressedTexImage2D:S,compressedTexImage3D:G,texImage2D:be,texImage3D:ie,updateUBOMapping:Oe,uniformBlockBinding:_e,texStorage2D:he,texStorage3D:we,texSubImage2D:J,texSubImage3D:Q,compressedTexSubImage2D:$,compressedTexSubImage3D:Ee,scissor:ae,viewport:ze,reset:He}}function Ip(s,e,t,n,i,r,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new et,h=new WeakMap;let u;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(P,S){return f?new OffscreenCanvas(P,S):Ni("canvas")}function x(P,S,G){let J=1;const Q=Fe(P);if((Q.width>G||Q.height>G)&&(J=G/Math.max(Q.width,Q.height)),J<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const $=Math.floor(J*Q.width),Ee=Math.floor(J*Q.height);u===void 0&&(u=g($,Ee));const he=S?g($,Ee):u;return he.width=$,he.height=Ee,he.getContext("2d").drawImage(P,0,0,$,Ee),Xe("WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+$+"x"+Ee+")."),he}else return"data"in P&&Xe("WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),P;return P}function m(P){return P.generateMipmaps}function p(P){s.generateMipmap(P)}function y(P){return P.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?s.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function M(P,S,G,J,Q=!1){if(P!==null){if(s[P]!==void 0)return s[P];Xe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let $=S;if(S===s.RED&&(G===s.FLOAT&&($=s.R32F),G===s.HALF_FLOAT&&($=s.R16F),G===s.UNSIGNED_BYTE&&($=s.R8)),S===s.RED_INTEGER&&(G===s.UNSIGNED_BYTE&&($=s.R8UI),G===s.UNSIGNED_SHORT&&($=s.R16UI),G===s.UNSIGNED_INT&&($=s.R32UI),G===s.BYTE&&($=s.R8I),G===s.SHORT&&($=s.R16I),G===s.INT&&($=s.R32I)),S===s.RG&&(G===s.FLOAT&&($=s.RG32F),G===s.HALF_FLOAT&&($=s.RG16F),G===s.UNSIGNED_BYTE&&($=s.RG8)),S===s.RG_INTEGER&&(G===s.UNSIGNED_BYTE&&($=s.RG8UI),G===s.UNSIGNED_SHORT&&($=s.RG16UI),G===s.UNSIGNED_INT&&($=s.RG32UI),G===s.BYTE&&($=s.RG8I),G===s.SHORT&&($=s.RG16I),G===s.INT&&($=s.RG32I)),S===s.RGB_INTEGER&&(G===s.UNSIGNED_BYTE&&($=s.RGB8UI),G===s.UNSIGNED_SHORT&&($=s.RGB16UI),G===s.UNSIGNED_INT&&($=s.RGB32UI),G===s.BYTE&&($=s.RGB8I),G===s.SHORT&&($=s.RGB16I),G===s.INT&&($=s.RGB32I)),S===s.RGBA_INTEGER&&(G===s.UNSIGNED_BYTE&&($=s.RGBA8UI),G===s.UNSIGNED_SHORT&&($=s.RGBA16UI),G===s.UNSIGNED_INT&&($=s.RGBA32UI),G===s.BYTE&&($=s.RGBA8I),G===s.SHORT&&($=s.RGBA16I),G===s.INT&&($=s.RGBA32I)),S===s.RGB&&(G===s.UNSIGNED_INT_5_9_9_9_REV&&($=s.RGB9_E5),G===s.UNSIGNED_INT_10F_11F_11F_REV&&($=s.R11F_G11F_B10F)),S===s.RGBA){const Ee=Q?bs:nt.getTransfer(J);G===s.FLOAT&&($=s.RGBA32F),G===s.HALF_FLOAT&&($=s.RGBA16F),G===s.UNSIGNED_BYTE&&($=Ee===at?s.SRGB8_ALPHA8:s.RGBA8),G===s.UNSIGNED_SHORT_4_4_4_4&&($=s.RGBA4),G===s.UNSIGNED_SHORT_5_5_5_1&&($=s.RGB5_A1)}return($===s.R16F||$===s.R32F||$===s.RG16F||$===s.RG32F||$===s.RGBA16F||$===s.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function T(P,S){let G;return P?S===null||S===Xn||S===Ii?G=s.DEPTH24_STENCIL8:S===tn?G=s.DEPTH32F_STENCIL8:S===Di&&(G=s.DEPTH24_STENCIL8,Xe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===Xn||S===Ii?G=s.DEPTH_COMPONENT24:S===tn?G=s.DEPTH_COMPONENT32F:S===Di&&(G=s.DEPTH_COMPONENT16),G}function R(P,S){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==Rt&&P.minFilter!==$t?Math.log2(Math.max(S.width,S.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?S.mipmaps.length:1}function b(P){const S=P.target;S.removeEventListener("dispose",b),w(S),S.isVideoTexture&&h.delete(S)}function A(P){const S=P.target;S.removeEventListener("dispose",A),v(S)}function w(P){const S=n.get(P);if(S.__webglInit===void 0)return;const G=P.source,J=d.get(G);if(J){const Q=J[S.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&_(P),Object.keys(J).length===0&&d.delete(G)}n.remove(P)}function _(P){const S=n.get(P);s.deleteTexture(S.__webglTexture);const G=P.source,J=d.get(G);delete J[S.__cacheKey],a.memory.textures--}function v(P){const S=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(S.__webglFramebuffer[J]))for(let Q=0;Q<S.__webglFramebuffer[J].length;Q++)s.deleteFramebuffer(S.__webglFramebuffer[J][Q]);else s.deleteFramebuffer(S.__webglFramebuffer[J]);S.__webglDepthbuffer&&s.deleteRenderbuffer(S.__webglDepthbuffer[J])}else{if(Array.isArray(S.__webglFramebuffer))for(let J=0;J<S.__webglFramebuffer.length;J++)s.deleteFramebuffer(S.__webglFramebuffer[J]);else s.deleteFramebuffer(S.__webglFramebuffer);if(S.__webglDepthbuffer&&s.deleteRenderbuffer(S.__webglDepthbuffer),S.__webglMultisampledFramebuffer&&s.deleteFramebuffer(S.__webglMultisampledFramebuffer),S.__webglColorRenderbuffer)for(let J=0;J<S.__webglColorRenderbuffer.length;J++)S.__webglColorRenderbuffer[J]&&s.deleteRenderbuffer(S.__webglColorRenderbuffer[J]);S.__webglDepthRenderbuffer&&s.deleteRenderbuffer(S.__webglDepthRenderbuffer)}const G=P.textures;for(let J=0,Q=G.length;J<Q;J++){const $=n.get(G[J]);$.__webglTexture&&(s.deleteTexture($.__webglTexture),a.memory.textures--),n.remove(G[J])}n.remove(P)}let C=0;function L(){C=0}function N(){const P=C;return P>=i.maxTextures&&Xe("WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+i.maxTextures),C+=1,P}function O(P){const S=[];return S.push(P.wrapS),S.push(P.wrapT),S.push(P.wrapR||0),S.push(P.magFilter),S.push(P.minFilter),S.push(P.anisotropy),S.push(P.internalFormat),S.push(P.format),S.push(P.type),S.push(P.generateMipmaps),S.push(P.premultiplyAlpha),S.push(P.flipY),S.push(P.unpackAlignment),S.push(P.colorSpace),S.join()}function z(P,S){const G=n.get(P);if(P.isVideoTexture&&st(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&G.__version!==P.version){const J=P.image;if(J===null)Xe("WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)Xe("WebGLRenderer: Texture marked for update but image is incomplete");else{K(G,P,S);return}}else P.isExternalTexture&&(G.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,G.__webglTexture,s.TEXTURE0+S)}function W(P,S){const G=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&G.__version!==P.version){K(G,P,S);return}else P.isExternalTexture&&(G.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,G.__webglTexture,s.TEXTURE0+S)}function ee(P,S){const G=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&G.__version!==P.version){K(G,P,S);return}t.bindTexture(s.TEXTURE_3D,G.__webglTexture,s.TEXTURE0+S)}function X(P,S){const G=n.get(P);if(P.version>0&&G.__version!==P.version){j(G,P,S);return}t.bindTexture(s.TEXTURE_CUBE_MAP,G.__webglTexture,s.TEXTURE0+S)}const te={[Pi]:s.REPEAT,[_n]:s.CLAMP_TO_EDGE,[Er]:s.MIRRORED_REPEAT},ne={[Rt]:s.NEAREST,[Jl]:s.NEAREST_MIPMAP_NEAREST,[Hi]:s.NEAREST_MIPMAP_LINEAR,[$t]:s.LINEAR,[Ls]:s.LINEAR_MIPMAP_NEAREST,[Wn]:s.LINEAR_MIPMAP_LINEAR},se={[ec]:s.NEVER,[oc]:s.ALWAYS,[tc]:s.LESS,[$a]:s.LEQUAL,[nc]:s.EQUAL,[rc]:s.GEQUAL,[ic]:s.GREATER,[sc]:s.NOTEQUAL};function Pe(P,S){if(S.type===tn&&e.has("OES_texture_float_linear")===!1&&(S.magFilter===$t||S.magFilter===Ls||S.magFilter===Hi||S.magFilter===Wn||S.minFilter===$t||S.minFilter===Ls||S.minFilter===Hi||S.minFilter===Wn)&&Xe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(P,s.TEXTURE_WRAP_S,te[S.wrapS]),s.texParameteri(P,s.TEXTURE_WRAP_T,te[S.wrapT]),(P===s.TEXTURE_3D||P===s.TEXTURE_2D_ARRAY)&&s.texParameteri(P,s.TEXTURE_WRAP_R,te[S.wrapR]),s.texParameteri(P,s.TEXTURE_MAG_FILTER,ne[S.magFilter]),s.texParameteri(P,s.TEXTURE_MIN_FILTER,ne[S.minFilter]),S.compareFunction&&(s.texParameteri(P,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(P,s.TEXTURE_COMPARE_FUNC,se[S.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===Rt||S.minFilter!==Hi&&S.minFilter!==Wn||S.type===tn&&e.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||n.get(S).__currentAnisotropy){const G=e.get("EXT_texture_filter_anisotropic");s.texParameterf(P,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,i.getMaxAnisotropy())),n.get(S).__currentAnisotropy=S.anisotropy}}}function Ge(P,S){let G=!1;P.__webglInit===void 0&&(P.__webglInit=!0,S.addEventListener("dispose",b));const J=S.source;let Q=d.get(J);Q===void 0&&(Q={},d.set(J,Q));const $=O(S);if($!==P.__cacheKey){Q[$]===void 0&&(Q[$]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,G=!0),Q[$].usedTimes++;const Ee=Q[P.__cacheKey];Ee!==void 0&&(Q[P.__cacheKey].usedTimes--,Ee.usedTimes===0&&_(S)),P.__cacheKey=$,P.__webglTexture=Q[$].texture}return G}function Ke(P,S,G){return Math.floor(Math.floor(P/G)/S)}function Qe(P,S,G,J){const $=P.updateRanges;if($.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,S.width,S.height,G,J,S.data);else{$.sort((ie,ae)=>ie.start-ae.start);let Ee=0;for(let ie=1;ie<$.length;ie++){const ae=$[Ee],ze=$[ie],Oe=ae.start+ae.count,_e=Ke(ze.start,S.width,4),He=Ke(ae.start,S.width,4);ze.start<=Oe+1&&_e===He&&Ke(ze.start+ze.count-1,S.width,4)===_e?ae.count=Math.max(ae.count,ze.start+ze.count-ae.start):(++Ee,$[Ee]=ze)}$.length=Ee+1;const he=s.getParameter(s.UNPACK_ROW_LENGTH),we=s.getParameter(s.UNPACK_SKIP_PIXELS),be=s.getParameter(s.UNPACK_SKIP_ROWS);s.pixelStorei(s.UNPACK_ROW_LENGTH,S.width);for(let ie=0,ae=$.length;ie<ae;ie++){const ze=$[ie],Oe=Math.floor(ze.start/4),_e=Math.ceil(ze.count/4),He=Oe%S.width,U=Math.floor(Oe/S.width),fe=_e,le=1;s.pixelStorei(s.UNPACK_SKIP_PIXELS,He),s.pixelStorei(s.UNPACK_SKIP_ROWS,U),t.texSubImage2D(s.TEXTURE_2D,0,He,U,fe,le,G,J,S.data)}P.clearUpdateRanges(),s.pixelStorei(s.UNPACK_ROW_LENGTH,he),s.pixelStorei(s.UNPACK_SKIP_PIXELS,we),s.pixelStorei(s.UNPACK_SKIP_ROWS,be)}}function K(P,S,G){let J=s.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(J=s.TEXTURE_2D_ARRAY),S.isData3DTexture&&(J=s.TEXTURE_3D);const Q=Ge(P,S),$=S.source;t.bindTexture(J,P.__webglTexture,s.TEXTURE0+G);const Ee=n.get($);if($.version!==Ee.__version||Q===!0){t.activeTexture(s.TEXTURE0+G);const he=nt.getPrimaries(nt.workingColorSpace),we=S.colorSpace===Rn?null:nt.getPrimaries(S.colorSpace),be=S.colorSpace===Rn||he===we?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,S.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,S.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);let ie=x(S.image,!1,i.maxTextureSize);ie=Te(S,ie);const ae=r.convert(S.format,S.colorSpace),ze=r.convert(S.type);let Oe=M(S.internalFormat,ae,ze,S.colorSpace,S.isVideoTexture);Pe(J,S);let _e;const He=S.mipmaps,U=S.isVideoTexture!==!0,fe=Ee.__version===void 0||Q===!0,le=$.dataReady,ce=R(S,ie);if(S.isDepthTexture)Oe=T(S.format===Ui,S.type),fe&&(U?t.texStorage2D(s.TEXTURE_2D,1,Oe,ie.width,ie.height):t.texImage2D(s.TEXTURE_2D,0,Oe,ie.width,ie.height,0,ae,ze,null));else if(S.isDataTexture)if(He.length>0){U&&fe&&t.texStorage2D(s.TEXTURE_2D,ce,Oe,He[0].width,He[0].height);for(let re=0,Z=He.length;re<Z;re++)_e=He[re],U?le&&t.texSubImage2D(s.TEXTURE_2D,re,0,0,_e.width,_e.height,ae,ze,_e.data):t.texImage2D(s.TEXTURE_2D,re,Oe,_e.width,_e.height,0,ae,ze,_e.data);S.generateMipmaps=!1}else U?(fe&&t.texStorage2D(s.TEXTURE_2D,ce,Oe,ie.width,ie.height),le&&Qe(S,ie,ae,ze)):t.texImage2D(s.TEXTURE_2D,0,Oe,ie.width,ie.height,0,ae,ze,ie.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){U&&fe&&t.texStorage3D(s.TEXTURE_2D_ARRAY,ce,Oe,He[0].width,He[0].height,ie.depth);for(let re=0,Z=He.length;re<Z;re++)if(_e=He[re],S.format!==nn)if(ae!==null)if(U){if(le)if(S.layerUpdates.size>0){const Me=la(_e.width,_e.height,S.format,S.type);for(const We of S.layerUpdates){const ut=_e.data.subarray(We*Me/_e.data.BYTES_PER_ELEMENT,(We+1)*Me/_e.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,re,0,0,We,_e.width,_e.height,1,ae,ut)}S.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,re,0,0,0,_e.width,_e.height,ie.depth,ae,_e.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,re,Oe,_e.width,_e.height,ie.depth,0,_e.data,0,0);else Xe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?le&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,re,0,0,0,_e.width,_e.height,ie.depth,ae,ze,_e.data):t.texImage3D(s.TEXTURE_2D_ARRAY,re,Oe,_e.width,_e.height,ie.depth,0,ae,ze,_e.data)}else{U&&fe&&t.texStorage2D(s.TEXTURE_2D,ce,Oe,He[0].width,He[0].height);for(let re=0,Z=He.length;re<Z;re++)_e=He[re],S.format!==nn?ae!==null?U?le&&t.compressedTexSubImage2D(s.TEXTURE_2D,re,0,0,_e.width,_e.height,ae,_e.data):t.compressedTexImage2D(s.TEXTURE_2D,re,Oe,_e.width,_e.height,0,_e.data):Xe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?le&&t.texSubImage2D(s.TEXTURE_2D,re,0,0,_e.width,_e.height,ae,ze,_e.data):t.texImage2D(s.TEXTURE_2D,re,Oe,_e.width,_e.height,0,ae,ze,_e.data)}else if(S.isDataArrayTexture)if(U){if(fe&&t.texStorage3D(s.TEXTURE_2D_ARRAY,ce,Oe,ie.width,ie.height,ie.depth),le)if(S.layerUpdates.size>0){const re=la(ie.width,ie.height,S.format,S.type);for(const Z of S.layerUpdates){const Me=ie.data.subarray(Z*re/ie.data.BYTES_PER_ELEMENT,(Z+1)*re/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Z,ie.width,ie.height,1,ae,ze,Me)}S.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,ae,ze,ie.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Oe,ie.width,ie.height,ie.depth,0,ae,ze,ie.data);else if(S.isData3DTexture)U?(fe&&t.texStorage3D(s.TEXTURE_3D,ce,Oe,ie.width,ie.height,ie.depth),le&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,ae,ze,ie.data)):t.texImage3D(s.TEXTURE_3D,0,Oe,ie.width,ie.height,ie.depth,0,ae,ze,ie.data);else if(S.isFramebufferTexture){if(fe)if(U)t.texStorage2D(s.TEXTURE_2D,ce,Oe,ie.width,ie.height);else{let re=ie.width,Z=ie.height;for(let Me=0;Me<ce;Me++)t.texImage2D(s.TEXTURE_2D,Me,Oe,re,Z,0,ae,ze,null),re>>=1,Z>>=1}}else if(He.length>0){if(U&&fe){const re=Fe(He[0]);t.texStorage2D(s.TEXTURE_2D,ce,Oe,re.width,re.height)}for(let re=0,Z=He.length;re<Z;re++)_e=He[re],U?le&&t.texSubImage2D(s.TEXTURE_2D,re,0,0,ae,ze,_e):t.texImage2D(s.TEXTURE_2D,re,Oe,ae,ze,_e);S.generateMipmaps=!1}else if(U){if(fe){const re=Fe(ie);t.texStorage2D(s.TEXTURE_2D,ce,Oe,re.width,re.height)}le&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,ae,ze,ie)}else t.texImage2D(s.TEXTURE_2D,0,Oe,ae,ze,ie);m(S)&&p(J),Ee.__version=$.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function j(P,S,G){if(S.image.length!==6)return;const J=Ge(P,S),Q=S.source;t.bindTexture(s.TEXTURE_CUBE_MAP,P.__webglTexture,s.TEXTURE0+G);const $=n.get(Q);if(Q.version!==$.__version||J===!0){t.activeTexture(s.TEXTURE0+G);const Ee=nt.getPrimaries(nt.workingColorSpace),he=S.colorSpace===Rn?null:nt.getPrimaries(S.colorSpace),we=S.colorSpace===Rn||Ee===he?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,S.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,S.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);const be=S.isCompressedTexture||S.image[0].isCompressedTexture,ie=S.image[0]&&S.image[0].isDataTexture,ae=[];for(let Z=0;Z<6;Z++)!be&&!ie?ae[Z]=x(S.image[Z],!0,i.maxCubemapSize):ae[Z]=ie?S.image[Z].image:S.image[Z],ae[Z]=Te(S,ae[Z]);const ze=ae[0],Oe=r.convert(S.format,S.colorSpace),_e=r.convert(S.type),He=M(S.internalFormat,Oe,_e,S.colorSpace),U=S.isVideoTexture!==!0,fe=$.__version===void 0||J===!0,le=Q.dataReady;let ce=R(S,ze);Pe(s.TEXTURE_CUBE_MAP,S);let re;if(be){U&&fe&&t.texStorage2D(s.TEXTURE_CUBE_MAP,ce,He,ze.width,ze.height);for(let Z=0;Z<6;Z++){re=ae[Z].mipmaps;for(let Me=0;Me<re.length;Me++){const We=re[Me];S.format!==nn?Oe!==null?U?le&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,0,0,We.width,We.height,Oe,We.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,He,We.width,We.height,0,We.data):Xe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?le&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,0,0,We.width,We.height,Oe,_e,We.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,He,We.width,We.height,0,Oe,_e,We.data)}}}else{if(re=S.mipmaps,U&&fe){re.length>0&&ce++;const Z=Fe(ae[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,ce,He,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(ie){U?le&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,ae[Z].width,ae[Z].height,Oe,_e,ae[Z].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,He,ae[Z].width,ae[Z].height,0,Oe,_e,ae[Z].data);for(let Me=0;Me<re.length;Me++){const ut=re[Me].image[Z].image;U?le&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,0,0,ut.width,ut.height,Oe,_e,ut.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,He,ut.width,ut.height,0,Oe,_e,ut.data)}}else{U?le&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,Oe,_e,ae[Z]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,He,Oe,_e,ae[Z]);for(let Me=0;Me<re.length;Me++){const We=re[Me];U?le&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,0,0,Oe,_e,We.image[Z]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,He,Oe,_e,We.image[Z])}}}m(S)&&p(s.TEXTURE_CUBE_MAP),$.__version=Q.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function ue(P,S,G,J,Q,$){const Ee=r.convert(G.format,G.colorSpace),he=r.convert(G.type),we=M(G.internalFormat,Ee,he,G.colorSpace),be=n.get(S),ie=n.get(G);if(ie.__renderTarget=S,!be.__hasExternalTextures){const ae=Math.max(1,S.width>>$),ze=Math.max(1,S.height>>$);Q===s.TEXTURE_3D||Q===s.TEXTURE_2D_ARRAY?t.texImage3D(Q,$,we,ae,ze,S.depth,0,Ee,he,null):t.texImage2D(Q,$,we,ae,ze,0,Ee,he,null)}t.bindFramebuffer(s.FRAMEBUFFER,P),ge(S)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,J,Q,ie.__webglTexture,0,Je(S)):(Q===s.TEXTURE_2D||Q>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,J,Q,ie.__webglTexture,$),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Ie(P,S,G){if(s.bindRenderbuffer(s.RENDERBUFFER,P),S.depthBuffer){const J=S.depthTexture,Q=J&&J.isDepthTexture?J.type:null,$=T(S.stencilBuffer,Q),Ee=S.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,he=Je(S);ge(S)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,he,$,S.width,S.height):G?s.renderbufferStorageMultisample(s.RENDERBUFFER,he,$,S.width,S.height):s.renderbufferStorage(s.RENDERBUFFER,$,S.width,S.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Ee,s.RENDERBUFFER,P)}else{const J=S.textures;for(let Q=0;Q<J.length;Q++){const $=J[Q],Ee=r.convert($.format,$.colorSpace),he=r.convert($.type),we=M($.internalFormat,Ee,he,$.colorSpace),be=Je(S);G&&ge(S)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,be,we,S.width,S.height):ge(S)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,be,we,S.width,S.height):s.renderbufferStorage(s.RENDERBUFFER,we,S.width,S.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function xe(P,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,P),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=n.get(S.depthTexture);J.__renderTarget=S,(!J.__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),z(S.depthTexture,0);const Q=J.__webglTexture,$=Je(S);if(S.depthTexture.format===Li)ge(S)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Q,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Q,0);else if(S.depthTexture.format===Ui)ge(S)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Q,0,$):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function Ne(P){const S=n.get(P),G=P.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==P.depthTexture){const J=P.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),J){const Q=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,J.removeEventListener("dispose",Q)};J.addEventListener("dispose",Q),S.__depthDisposeCallback=Q}S.__boundDepthTexture=J}if(P.depthTexture&&!S.__autoAllocateDepthBuffer){if(G)throw new Error("target.depthTexture not supported in Cube render targets");const J=P.texture.mipmaps;J&&J.length>0?xe(S.__webglFramebuffer[0],P):xe(S.__webglFramebuffer,P)}else if(G){S.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(t.bindFramebuffer(s.FRAMEBUFFER,S.__webglFramebuffer[J]),S.__webglDepthbuffer[J]===void 0)S.__webglDepthbuffer[J]=s.createRenderbuffer(),Ie(S.__webglDepthbuffer[J],P,!1);else{const Q=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,$=S.__webglDepthbuffer[J];s.bindRenderbuffer(s.RENDERBUFFER,$),s.framebufferRenderbuffer(s.FRAMEBUFFER,Q,s.RENDERBUFFER,$)}}else{const J=P.texture.mipmaps;if(J&&J.length>0?t.bindFramebuffer(s.FRAMEBUFFER,S.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=s.createRenderbuffer(),Ie(S.__webglDepthbuffer,P,!1);else{const Q=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,$=S.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,$),s.framebufferRenderbuffer(s.FRAMEBUFFER,Q,s.RENDERBUFFER,$)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function it(P,S,G){const J=n.get(P);S!==void 0&&ue(J.__webglFramebuffer,P,P.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),G!==void 0&&Ne(P)}function Le(P){const S=P.texture,G=n.get(P),J=n.get(S);P.addEventListener("dispose",A);const Q=P.textures,$=P.isWebGLCubeRenderTarget===!0,Ee=Q.length>1;if(Ee||(J.__webglTexture===void 0&&(J.__webglTexture=s.createTexture()),J.__version=S.version,a.memory.textures++),$){G.__webglFramebuffer=[];for(let he=0;he<6;he++)if(S.mipmaps&&S.mipmaps.length>0){G.__webglFramebuffer[he]=[];for(let we=0;we<S.mipmaps.length;we++)G.__webglFramebuffer[he][we]=s.createFramebuffer()}else G.__webglFramebuffer[he]=s.createFramebuffer()}else{if(S.mipmaps&&S.mipmaps.length>0){G.__webglFramebuffer=[];for(let he=0;he<S.mipmaps.length;he++)G.__webglFramebuffer[he]=s.createFramebuffer()}else G.__webglFramebuffer=s.createFramebuffer();if(Ee)for(let he=0,we=Q.length;he<we;he++){const be=n.get(Q[he]);be.__webglTexture===void 0&&(be.__webglTexture=s.createTexture(),a.memory.textures++)}if(P.samples>0&&ge(P)===!1){G.__webglMultisampledFramebuffer=s.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let he=0;he<Q.length;he++){const we=Q[he];G.__webglColorRenderbuffer[he]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,G.__webglColorRenderbuffer[he]);const be=r.convert(we.format,we.colorSpace),ie=r.convert(we.type),ae=M(we.internalFormat,be,ie,we.colorSpace,P.isXRRenderTarget===!0),ze=Je(P);s.renderbufferStorageMultisample(s.RENDERBUFFER,ze,ae,P.width,P.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+he,s.RENDERBUFFER,G.__webglColorRenderbuffer[he])}s.bindRenderbuffer(s.RENDERBUFFER,null),P.depthBuffer&&(G.__webglDepthRenderbuffer=s.createRenderbuffer(),Ie(G.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if($){t.bindTexture(s.TEXTURE_CUBE_MAP,J.__webglTexture),Pe(s.TEXTURE_CUBE_MAP,S);for(let he=0;he<6;he++)if(S.mipmaps&&S.mipmaps.length>0)for(let we=0;we<S.mipmaps.length;we++)ue(G.__webglFramebuffer[he][we],P,S,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+he,we);else ue(G.__webglFramebuffer[he],P,S,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+he,0);m(S)&&p(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ee){for(let he=0,we=Q.length;he<we;he++){const be=Q[he],ie=n.get(be);let ae=s.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ae=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ae,ie.__webglTexture),Pe(ae,be),ue(G.__webglFramebuffer,P,be,s.COLOR_ATTACHMENT0+he,ae,0),m(be)&&p(ae)}t.unbindTexture()}else{let he=s.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(he=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(he,J.__webglTexture),Pe(he,S),S.mipmaps&&S.mipmaps.length>0)for(let we=0;we<S.mipmaps.length;we++)ue(G.__webglFramebuffer[we],P,S,s.COLOR_ATTACHMENT0,he,we);else ue(G.__webglFramebuffer,P,S,s.COLOR_ATTACHMENT0,he,0);m(S)&&p(he),t.unbindTexture()}P.depthBuffer&&Ne(P)}function $e(P){const S=P.textures;for(let G=0,J=S.length;G<J;G++){const Q=S[G];if(m(Q)){const $=y(P),Ee=n.get(Q).__webglTexture;t.bindTexture($,Ee),p($),t.unbindTexture()}}}const D=[],Re=[];function ve(P){if(P.samples>0){if(ge(P)===!1){const S=P.textures,G=P.width,J=P.height;let Q=s.COLOR_BUFFER_BIT;const $=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Ee=n.get(P),he=S.length>1;if(he)for(let be=0;be<S.length;be++)t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer);const we=P.texture.mipmaps;we&&we.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglFramebuffer);for(let be=0;be<S.length;be++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(Q|=s.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(Q|=s.STENCIL_BUFFER_BIT)),he){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Ee.__webglColorRenderbuffer[be]);const ie=n.get(S[be]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,ie,0)}s.blitFramebuffer(0,0,G,J,0,0,G,J,Q,s.NEAREST),l===!0&&(D.length=0,Re.length=0,D.push(s.COLOR_ATTACHMENT0+be),P.depthBuffer&&P.resolveDepthBuffer===!1&&(D.push($),Re.push($),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Re)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,D))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),he)for(let be=0;be<S.length;be++){t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.RENDERBUFFER,Ee.__webglColorRenderbuffer[be]);const ie=n.get(S[be]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+be,s.TEXTURE_2D,ie,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){const S=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[S])}}}function Je(P){return Math.min(i.maxSamples,P.samples)}function ge(P){const S=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function st(P){const S=a.render.frame;h.get(P)!==S&&(h.set(P,S),P.update())}function Te(P,S){const G=P.colorSpace,J=P.format,Q=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||G!==fi&&G!==Rn&&(nt.getTransfer(G)===at?(J!==nn||Q!==cn)&&Xe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):gt("WebGLTextures: Unsupported texture color space:",G)),S}function Fe(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=N,this.resetTextureUnits=L,this.setTexture2D=z,this.setTexture2DArray=W,this.setTexture3D=ee,this.setTextureCube=X,this.rebindTextures=it,this.setupRenderTarget=Le,this.updateRenderTargetMipmap=$e,this.updateMultisampleRenderTarget=ve,this.setupDepthRenderbuffer=Ne,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=ge}function Lp(s,e){function t(n,i=Rn){let r;const a=nt.getTransfer(i);if(n===cn)return s.UNSIGNED_BYTE;if(n===ao)return s.UNSIGNED_SHORT_4_4_4_4;if(n===lo)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Va)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Ha)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===za)return s.BYTE;if(n===Ga)return s.SHORT;if(n===Di)return s.UNSIGNED_SHORT;if(n===oo)return s.INT;if(n===Xn)return s.UNSIGNED_INT;if(n===tn)return s.FLOAT;if(n===gi)return s.HALF_FLOAT;if(n===Wa)return s.ALPHA;if(n===Xa)return s.RGB;if(n===nn)return s.RGBA;if(n===Li)return s.DEPTH_COMPONENT;if(n===Ui)return s.DEPTH_STENCIL;if(n===qa)return s.RED;if(n===co)return s.RED_INTEGER;if(n===ho)return s.RG;if(n===uo)return s.RG_INTEGER;if(n===fo)return s.RGBA_INTEGER;if(n===ps||n===ms||n===gs||n===xs)if(a===at)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ps)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ms)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===gs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===xs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ps)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ms)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===gs)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===xs)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Tr||n===Ar||n===Rr||n===wr)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Tr)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ar)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Rr)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===wr)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Cr||n===Pr||n===Dr)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Cr||n===Pr)return a===at?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Dr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ir||n===Lr||n===Ur||n===Nr||n===Fr||n===Or||n===Br||n===kr||n===zr||n===Gr||n===Vr||n===Hr||n===Wr||n===Xr)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ir)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Lr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ur)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Nr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Fr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Or)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Br)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===kr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===zr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Gr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Vr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Hr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Wr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Xr)return a===at?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===qr||n===Yr||n===$r)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===qr)return a===at?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Yr)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===$r)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Kr||n===Jr||n===jr||n===Zr)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Kr)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Jr)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===jr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Zr)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ii?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const Up=`
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

}`;class Fp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new sl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Tt({vertexShader:Up,fragmentShader:Np,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Be(new ws(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Op extends xi{constructor(e,t){super();const n=this;let i=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null;const x=typeof XRWebGLBinding<"u",m=new Fp,p={},y=t.getContextAttributes();let M=null,T=null;const R=[],b=[],A=new et;let w=null;const _=new Yt;_.viewport=new xt;const v=new Yt;v.viewport=new xt;const C=[_,v],L=new Qc;let N=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let j=R[K];return j===void 0&&(j=new nr,R[K]=j),j.getTargetRaySpace()},this.getControllerGrip=function(K){let j=R[K];return j===void 0&&(j=new nr,R[K]=j),j.getGripSpace()},this.getHand=function(K){let j=R[K];return j===void 0&&(j=new nr,R[K]=j),j.getHandSpace()};function z(K){const j=b.indexOf(K.inputSource);if(j===-1)return;const ue=R[j];ue!==void 0&&(ue.update(K.inputSource,K.frame,c||a),ue.dispatchEvent({type:K.type,data:K.inputSource}))}function W(){i.removeEventListener("select",z),i.removeEventListener("selectstart",z),i.removeEventListener("selectend",z),i.removeEventListener("squeeze",z),i.removeEventListener("squeezestart",z),i.removeEventListener("squeezeend",z),i.removeEventListener("end",W),i.removeEventListener("inputsourceschange",ee);for(let K=0;K<R.length;K++){const j=b[K];j!==null&&(b[K]=null,R[K].disconnect(j))}N=null,O=null,m.reset();for(const K in p)delete p[K];e.setRenderTarget(M),f=null,d=null,u=null,i=null,T=null,Qe.stop(),n.isPresenting=!1,e.setPixelRatio(w),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&Xe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,n.isPresenting===!0&&Xe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function(K){if(i=K,i!==null){if(M=e.getRenderTarget(),i.addEventListener("select",z),i.addEventListener("selectstart",z),i.addEventListener("selectend",z),i.addEventListener("squeeze",z),i.addEventListener("squeezestart",z),i.addEventListener("squeezeend",z),i.addEventListener("end",W),i.addEventListener("inputsourceschange",ee),y.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(A),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,Ie=null,xe=null;y.depth&&(xe=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=y.stencil?Ui:Li,Ie=y.stencil?Ii:Xn);const Ne={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Ne),i.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),T=new Dn(d.textureWidth,d.textureHeight,{format:nn,type:cn,depthTexture:new vo(d.textureWidth,d.textureHeight,Ie,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const ue={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(i,t,ue),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),T=new Dn(f.framebufferWidth,f.framebufferHeight,{format:nn,type:cn,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await i.requestReferenceSpace(o),Qe.setContext(i),Qe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function ee(K){for(let j=0;j<K.removed.length;j++){const ue=K.removed[j],Ie=b.indexOf(ue);Ie>=0&&(b[Ie]=null,R[Ie].disconnect(ue))}for(let j=0;j<K.added.length;j++){const ue=K.added[j];let Ie=b.indexOf(ue);if(Ie===-1){for(let Ne=0;Ne<R.length;Ne++)if(Ne>=b.length){b.push(ue),Ie=Ne;break}else if(b[Ne]===null){b[Ne]=ue,Ie=Ne;break}if(Ie===-1)break}const xe=R[Ie];xe&&xe.connect(ue)}}const X=new I,te=new I;function ne(K,j,ue){X.setFromMatrixPosition(j.matrixWorld),te.setFromMatrixPosition(ue.matrixWorld);const Ie=X.distanceTo(te),xe=j.projectionMatrix.elements,Ne=ue.projectionMatrix.elements,it=xe[14]/(xe[10]-1),Le=xe[14]/(xe[10]+1),$e=(xe[9]+1)/xe[5],D=(xe[9]-1)/xe[5],Re=(xe[8]-1)/xe[0],ve=(Ne[8]+1)/Ne[0],Je=it*Re,ge=it*ve,st=Ie/(-Re+ve),Te=st*-Re;if(j.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Te),K.translateZ(st),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),xe[10]===-1)K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{const Fe=it+st,P=Le+st,S=Je-Te,G=ge+(Ie-Te),J=$e*Le/P*Fe,Q=D*Le/P*Fe;K.projectionMatrix.makePerspective(S,G,J,Q,Fe,P),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function se(K,j){j===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(j.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(i===null)return;let j=K.near,ue=K.far;m.texture!==null&&(m.depthNear>0&&(j=m.depthNear),m.depthFar>0&&(ue=m.depthFar)),L.near=v.near=_.near=j,L.far=v.far=_.far=ue,(N!==L.near||O!==L.far)&&(i.updateRenderState({depthNear:L.near,depthFar:L.far}),N=L.near,O=L.far),L.layers.mask=K.layers.mask|6,_.layers.mask=L.layers.mask&3,v.layers.mask=L.layers.mask&5;const Ie=K.parent,xe=L.cameras;se(L,Ie);for(let Ne=0;Ne<xe.length;Ne++)se(xe[Ne],Ie);xe.length===2?ne(L,_,v):L.projectionMatrix.copy(_.projectionMatrix),Pe(K,L,Ie)};function Pe(K,j,ue){ue===null?K.matrix.copy(j.matrixWorld):(K.matrix.copy(ue.matrixWorld),K.matrix.invert(),K.matrix.multiply(j.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Qr*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(K){l=K,d!==null&&(d.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(L)},this.getCameraTexture=function(K){return p[K]};let Ge=null;function Ke(K,j){if(h=j.getViewerPose(c||a),g=j,h!==null){const ue=h.views;f!==null&&(e.setRenderTargetFramebuffer(T,f.framebuffer),e.setRenderTarget(T));let Ie=!1;ue.length!==L.cameras.length&&(L.cameras.length=0,Ie=!0);for(let Le=0;Le<ue.length;Le++){const $e=ue[Le];let D=null;if(f!==null)D=f.getViewport($e);else{const ve=u.getViewSubImage(d,$e);D=ve.viewport,Le===0&&(e.setRenderTargetTextures(T,ve.colorTexture,ve.depthStencilTexture),e.setRenderTarget(T))}let Re=C[Le];Re===void 0&&(Re=new Yt,Re.layers.enable(Le),Re.viewport=new xt,C[Le]=Re),Re.matrix.fromArray($e.transform.matrix),Re.matrix.decompose(Re.position,Re.quaternion,Re.scale),Re.projectionMatrix.fromArray($e.projectionMatrix),Re.projectionMatrixInverse.copy(Re.projectionMatrix).invert(),Re.viewport.set(D.x,D.y,D.width,D.height),Le===0&&(L.matrix.copy(Re.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),Ie===!0&&L.cameras.push(Re)}const xe=i.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const Le=u.getDepthInformation(ue[0]);Le&&Le.isValid&&Le.texture&&m.init(Le,i.renderState)}if(xe&&xe.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let Le=0;Le<ue.length;Le++){const $e=ue[Le].camera;if($e){let D=p[$e];D||(D=new sl,p[$e]=D);const Re=u.getCameraImage($e);D.sourceTexture=Re}}}}for(let ue=0;ue<R.length;ue++){const Ie=b[ue],xe=R[ue];Ie!==null&&xe!==void 0&&xe.update(Ie,j,c||a)}Ge&&Ge(K,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),g=null}const Qe=new ol;Qe.setAnimationLoop(Ke),this.setAnimationLoop=function(K){Ge=K},this.dispose=function(){}}}const kn=new hn,Bp=new ht;function kp(s,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,el(s)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function i(m,p,y,M,T){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,T)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),x(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,y,M):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Dt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Dt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=e.get(p),M=y.envMap,T=y.envMapRotation;M&&(m.envMap.value=M,kn.copy(T),kn.x*=-1,kn.y*=-1,kn.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(kn.y*=-1,kn.z*=-1),m.envMapRotation.value.setFromMatrix4(Bp.makeRotationFromEuler(kn)),m.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,y,M){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=M*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Dt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function x(m,p){const y=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function zp(s,e,t,n){let i={},r={},a=[];const o=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,M){const T=M.program;n.uniformBlockBinding(y,T)}function c(y,M){let T=i[y.id];T===void 0&&(g(y),T=h(y),i[y.id]=T,y.addEventListener("dispose",m));const R=M.program;n.updateUBOMapping(y,R);const b=e.render.frame;r[y.id]!==b&&(d(y),r[y.id]=b)}function h(y){const M=u();y.__bindingPointIndex=M;const T=s.createBuffer(),R=y.__size,b=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,T),s.bufferData(s.UNIFORM_BUFFER,R,b),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,M,T),T}function u(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return gt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(y){const M=i[y.id],T=y.uniforms,R=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,M);for(let b=0,A=T.length;b<A;b++){const w=Array.isArray(T[b])?T[b]:[T[b]];for(let _=0,v=w.length;_<v;_++){const C=w[_];if(f(C,b,_,R)===!0){const L=C.__offset,N=Array.isArray(C.value)?C.value:[C.value];let O=0;for(let z=0;z<N.length;z++){const W=N[z],ee=x(W);typeof W=="number"||typeof W=="boolean"?(C.__data[0]=W,s.bufferSubData(s.UNIFORM_BUFFER,L+O,C.__data)):W.isMatrix3?(C.__data[0]=W.elements[0],C.__data[1]=W.elements[1],C.__data[2]=W.elements[2],C.__data[3]=0,C.__data[4]=W.elements[3],C.__data[5]=W.elements[4],C.__data[6]=W.elements[5],C.__data[7]=0,C.__data[8]=W.elements[6],C.__data[9]=W.elements[7],C.__data[10]=W.elements[8],C.__data[11]=0):(W.toArray(C.__data,O),O+=ee.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,L,C.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(y,M,T,R){const b=y.value,A=M+"_"+T;if(R[A]===void 0)return typeof b=="number"||typeof b=="boolean"?R[A]=b:R[A]=b.clone(),!0;{const w=R[A];if(typeof b=="number"||typeof b=="boolean"){if(w!==b)return R[A]=b,!0}else if(w.equals(b)===!1)return w.copy(b),!0}return!1}function g(y){const M=y.uniforms;let T=0;const R=16;for(let A=0,w=M.length;A<w;A++){const _=Array.isArray(M[A])?M[A]:[M[A]];for(let v=0,C=_.length;v<C;v++){const L=_[v],N=Array.isArray(L.value)?L.value:[L.value];for(let O=0,z=N.length;O<z;O++){const W=N[O],ee=x(W),X=T%R,te=X%ee.boundary,ne=X+te;T+=te,ne!==0&&R-ne<ee.storage&&(T+=R-ne),L.__data=new Float32Array(ee.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=T,T+=ee.storage}}}const b=T%R;return b>0&&(T+=R-b),y.__size=T,y.__cache={},this}function x(y){const M={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(M.boundary=4,M.storage=4):y.isVector2?(M.boundary=8,M.storage=8):y.isVector3||y.isColor?(M.boundary=16,M.storage=12):y.isVector4?(M.boundary=16,M.storage=16):y.isMatrix3?(M.boundary=48,M.storage=48):y.isMatrix4?(M.boundary=64,M.storage=64):y.isTexture?Xe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Xe("WebGLRenderer: Unsupported uniform value type.",y),M}function m(y){const M=y.target;M.removeEventListener("dispose",m);const T=a.indexOf(M.__bindingPointIndex);a.splice(T,1),s.deleteBuffer(i[M.id]),delete i[M.id],delete r[M.id]}function p(){for(const y in i)s.deleteBuffer(i[y]);a=[],i={},r={}}return{bind:l,update:c,dispose:p}}const Gp=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let gn=null;function Vp(){return gn===null&&(gn=new Nc(Gp,32,32,ho,gi),gn.minFilter=$t,gn.magFilter=$t,gn.wrapS=_n,gn.wrapT=_n,gn.generateMipmaps=!1,gn.needsUpdate=!0),gn}class Hp{constructor(e={}){const{canvas:t=ac(),context:n=null,depth:i=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;const g=new Set([fo,uo,co]),x=new Set([cn,Xn,Di,Ii,ao,lo]),m=new Uint32Array(4),p=new Int32Array(4);let y=null,M=null;const T=[],R=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Cn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const b=this;let A=!1;this._outputColorSpace=qt;let w=0,_=0,v=null,C=-1,L=null;const N=new xt,O=new xt;let z=null;const W=new De(0);let ee=0,X=t.width,te=t.height,ne=1,se=null,Pe=null;const Ge=new xt(0,0,X,te),Ke=new xt(0,0,X,te);let Qe=!1;const K=new As;let j=!1,ue=!1;const Ie=new ht,xe=new I,Ne=new xt,it={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Le=!1;function $e(){return v===null?ne:1}let D=n;function Re(E,B){return t.getContext(E,B)}try{const E={alpha:!0,depth:i,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${so}`),t.addEventListener("webglcontextlost",re,!1),t.addEventListener("webglcontextrestored",Z,!1),t.addEventListener("webglcontextcreationerror",Me,!1),D===null){const B="webgl2";if(D=Re(B,E),D===null)throw Re(B)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw E("WebGLRenderer: "+E.message),E}let ve,Je,ge,st,Te,Fe,P,S,G,J,Q,$,Ee,he,we,be,ie,ae,ze,Oe,_e,He,U,fe;function le(){ve=new Jd(D),ve.init(),He=new Lp(D,ve),Je=new Gd(D,ve,e,He),ge=new Dp(D,ve),Je.reversedDepthBuffer&&d&&ge.buffers.depth.setReversed(!0),st=new Qd(D),Te=new _p,Fe=new Ip(D,ve,ge,Te,Je,He,st),P=new Hd(b),S=new Kd(b),G=new ih(D),U=new kd(D,G),J=new jd(D,G,st,U),Q=new tf(D,J,G,st),ze=new ef(D,Je,Fe),be=new Vd(Te),$=new xp(b,P,S,ve,Je,U,be),Ee=new kp(b,Te),he=new Sp,we=new Ap(ve),ae=new Bd(b,P,S,ge,Q,f,l),ie=new Cp(b,Q,Je),fe=new zp(D,st,Je,ge),Oe=new zd(D,ve,st),_e=new Zd(D,ve,st),st.programs=$.programs,b.capabilities=Je,b.extensions=ve,b.properties=Te,b.renderLists=he,b.shadowMap=ie,b.state=ge,b.info=st}le();const ce=new Op(b,D);this.xr=ce,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const E=ve.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=ve.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return ne},this.setPixelRatio=function(E){E!==void 0&&(ne=E,this.setSize(X,te,!1))},this.getSize=function(E){return E.set(X,te)},this.setSize=function(E,B,q=!0){if(ce.isPresenting){Xe("WebGLRenderer: Can't change size while VR device is presenting.");return}X=E,te=B,t.width=Math.floor(E*ne),t.height=Math.floor(B*ne),q===!0&&(t.style.width=E+"px",t.style.height=B+"px"),this.setViewport(0,0,E,B)},this.getDrawingBufferSize=function(E){return E.set(X*ne,te*ne).floor()},this.setDrawingBufferSize=function(E,B,q){X=E,te=B,ne=q,t.width=Math.floor(E*q),t.height=Math.floor(B*q),this.setViewport(0,0,E,B)},this.getCurrentViewport=function(E){return E.copy(N)},this.getViewport=function(E){return E.copy(Ge)},this.setViewport=function(E,B,q,Y){E.isVector4?Ge.set(E.x,E.y,E.z,E.w):Ge.set(E,B,q,Y),ge.viewport(N.copy(Ge).multiplyScalar(ne).round())},this.getScissor=function(E){return E.copy(Ke)},this.setScissor=function(E,B,q,Y){E.isVector4?Ke.set(E.x,E.y,E.z,E.w):Ke.set(E,B,q,Y),ge.scissor(O.copy(Ke).multiplyScalar(ne).round())},this.getScissorTest=function(){return Qe},this.setScissorTest=function(E){ge.setScissorTest(Qe=E)},this.setOpaqueSort=function(E){se=E},this.setTransparentSort=function(E){Pe=E},this.getClearColor=function(E){return E.copy(ae.getClearColor())},this.setClearColor=function(){ae.setClearColor(...arguments)},this.getClearAlpha=function(){return ae.getClearAlpha()},this.setClearAlpha=function(){ae.setClearAlpha(...arguments)},this.clear=function(E=!0,B=!0,q=!0){let Y=0;if(E){let k=!1;if(v!==null){const oe=v.texture.format;k=g.has(oe)}if(k){const oe=v.texture.type,pe=x.has(oe),ye=ae.getClearColor(),Se=ae.getClearAlpha(),ke=ye.r,Ve=ye.g,Ce=ye.b;pe?(m[0]=ke,m[1]=Ve,m[2]=Ce,m[3]=Se,D.clearBufferuiv(D.COLOR,0,m)):(p[0]=ke,p[1]=Ve,p[2]=Ce,p[3]=Se,D.clearBufferiv(D.COLOR,0,p))}else Y|=D.COLOR_BUFFER_BIT}B&&(Y|=D.DEPTH_BUFFER_BIT),q&&(Y|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",re,!1),t.removeEventListener("webglcontextrestored",Z,!1),t.removeEventListener("webglcontextcreationerror",Me,!1),ae.dispose(),he.dispose(),we.dispose(),Te.dispose(),P.dispose(),S.dispose(),Q.dispose(),U.dispose(),fe.dispose(),$.dispose(),ce.dispose(),ce.removeEventListener("sessionstart",yo),ce.removeEventListener("sessionend",Eo),In.stop()};function re(E){E.preventDefault(),Oo("WebGLRenderer: Context Lost."),A=!0}function Z(){Oo("WebGLRenderer: Context Restored."),A=!1;const E=st.autoReset,B=ie.enabled,q=ie.autoUpdate,Y=ie.needsUpdate,k=ie.type;le(),st.autoReset=E,ie.enabled=B,ie.autoUpdate=q,ie.needsUpdate=Y,ie.type=k}function Me(E){gt("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function We(E){const B=E.target;B.removeEventListener("dispose",We),ut(B)}function ut(E){rt(E),Te.remove(E)}function rt(E){const B=Te.get(E).programs;B!==void 0&&(B.forEach(function(q){$.releaseProgram(q)}),E.isShaderMaterial&&$.releaseShaderCache(E))}this.renderBufferDirect=function(E,B,q,Y,k,oe){B===null&&(B=it);const pe=k.isMesh&&k.matrixWorld.determinant()<0,ye=fl(E,B,q,Y,k);ge.setMaterial(Y,pe);let Se=q.index,ke=1;if(Y.wireframe===!0){if(Se=J.getWireframeAttribute(q),Se===void 0)return;ke=2}const Ve=q.drawRange,Ce=q.attributes.position;let je=Ve.start*ke,ot=(Ve.start+Ve.count)*ke;oe!==null&&(je=Math.max(je,oe.start*ke),ot=Math.min(ot,(oe.start+oe.count)*ke)),Se!==null?(je=Math.max(je,0),ot=Math.min(ot,Se.count)):Ce!=null&&(je=Math.max(je,0),ot=Math.min(ot,Ce.count));const pt=ot-je;if(pt<0||pt===1/0)return;U.setup(k,Y,ye,q,Se);let mt,lt=Oe;if(Se!==null&&(mt=G.get(Se),lt=_e,lt.setIndex(mt)),k.isMesh)Y.wireframe===!0?(ge.setLineWidth(Y.wireframeLinewidth*$e()),lt.setMode(D.LINES)):lt.setMode(D.TRIANGLES);else if(k.isLine){let Ue=Y.linewidth;Ue===void 0&&(Ue=1),ge.setLineWidth(Ue*$e()),k.isLineSegments?lt.setMode(D.LINES):k.isLineLoop?lt.setMode(D.LINE_LOOP):lt.setMode(D.LINE_STRIP)}else k.isPoints?lt.setMode(D.POINTS):k.isSprite&&lt.setMode(D.TRIANGLES);if(k.isBatchedMesh)if(k._multiDrawInstances!==null)Fi("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),lt.renderMultiDrawInstances(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount,k._multiDrawInstances);else if(ve.get("WEBGL_multi_draw"))lt.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Ue=k._multiDrawStarts,dt=k._multiDrawCounts,tt=k._multiDrawCount,Bt=Se?G.get(Se).bytesPerElement:1,qn=Te.get(Y).currentProgram.getUniforms();for(let kt=0;kt<tt;kt++)qn.setValue(D,"_gl_DrawID",kt),lt.render(Ue[kt]/Bt,dt[kt])}else if(k.isInstancedMesh)lt.renderInstances(je,pt,k.count);else if(q.isInstancedBufferGeometry){const Ue=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,dt=Math.min(q.instanceCount,Ue);lt.renderInstances(je,pt,dt)}else lt.render(je,pt)};function sn(E,B,q){E.transparent===!0&&E.side===Vt&&E.forceSinglePass===!1?(E.side=Dt,E.needsUpdate=!0,Vi(E,B,q),E.side=Pn,E.needsUpdate=!0,Vi(E,B,q),E.side=Vt):Vi(E,B,q)}this.compile=function(E,B,q=null){q===null&&(q=E),M=we.get(q),M.init(B),R.push(M),q.traverseVisible(function(k){k.isLight&&k.layers.test(B.layers)&&(M.pushLight(k),k.castShadow&&M.pushShadow(k))}),E!==q&&E.traverseVisible(function(k){k.isLight&&k.layers.test(B.layers)&&(M.pushLight(k),k.castShadow&&M.pushShadow(k))}),M.setupLights();const Y=new Set;return E.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const oe=k.material;if(oe)if(Array.isArray(oe))for(let pe=0;pe<oe.length;pe++){const ye=oe[pe];sn(ye,q,k),Y.add(ye)}else sn(oe,q,k),Y.add(oe)}),M=R.pop(),Y},this.compileAsync=function(E,B,q=null){const Y=this.compile(E,B,q);return new Promise(k=>{function oe(){if(Y.forEach(function(pe){Te.get(pe).currentProgram.isReady()&&Y.delete(pe)}),Y.size===0){k(E);return}setTimeout(oe,10)}ve.get("KHR_parallel_shader_compile")!==null?oe():setTimeout(oe,10)})};let Kt=null;function dl(E){Kt&&Kt(E)}function yo(){In.stop()}function Eo(){In.start()}const In=new ol;In.setAnimationLoop(dl),typeof self<"u"&&In.setContext(self),this.setAnimationLoop=function(E){Kt=E,ce.setAnimationLoop(E),E===null?In.stop():In.start()},ce.addEventListener("sessionstart",yo),ce.addEventListener("sessionend",Eo),this.render=function(E,B){if(B!==void 0&&B.isCamera!==!0){gt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),ce.enabled===!0&&ce.isPresenting===!0&&(ce.cameraAutoUpdate===!0&&ce.updateCamera(B),B=ce.getCamera()),E.isScene===!0&&E.onBeforeRender(b,E,B,v),M=we.get(E,R.length),M.init(B),R.push(M),Ie.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),K.setFromProjectionMatrix(Ie,an,B.reversedDepth),ue=this.localClippingEnabled,j=be.init(this.clippingPlanes,ue),y=he.get(E,T.length),y.init(),T.push(y),ce.enabled===!0&&ce.isPresenting===!0){const oe=b.xr.getDepthSensingMesh();oe!==null&&Ds(oe,B,-1/0,b.sortObjects)}Ds(E,B,0,b.sortObjects),y.finish(),b.sortObjects===!0&&y.sort(se,Pe),Le=ce.enabled===!1||ce.isPresenting===!1||ce.hasDepthSensing()===!1,Le&&ae.addToRenderList(y,E),this.info.render.frame++,j===!0&&be.beginShadows();const q=M.state.shadowsArray;ie.render(q,E,B),j===!0&&be.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=y.opaque,k=y.transmissive;if(M.setupLights(),B.isArrayCamera){const oe=B.cameras;if(k.length>0)for(let pe=0,ye=oe.length;pe<ye;pe++){const Se=oe[pe];Ao(Y,k,E,Se)}Le&&ae.render(E);for(let pe=0,ye=oe.length;pe<ye;pe++){const Se=oe[pe];To(y,E,Se,Se.viewport)}}else k.length>0&&Ao(Y,k,E,B),Le&&ae.render(E),To(y,E,B);v!==null&&_===0&&(Fe.updateMultisampleRenderTarget(v),Fe.updateRenderTargetMipmap(v)),E.isScene===!0&&E.onAfterRender(b,E,B),U.resetDefaultState(),C=-1,L=null,R.pop(),R.length>0?(M=R[R.length-1],j===!0&&be.setGlobalState(b.clippingPlanes,M.state.camera)):M=null,T.pop(),T.length>0?y=T[T.length-1]:y=null};function Ds(E,B,q,Y){if(E.visible===!1)return;if(E.layers.test(B.layers)){if(E.isGroup)q=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(B);else if(E.isLight)M.pushLight(E),E.castShadow&&M.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||K.intersectsSprite(E)){Y&&Ne.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Ie);const pe=Q.update(E),ye=E.material;ye.visible&&y.push(E,pe,ye,q,Ne.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||K.intersectsObject(E))){const pe=Q.update(E),ye=E.material;if(Y&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Ne.copy(E.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),Ne.copy(pe.boundingSphere.center)),Ne.applyMatrix4(E.matrixWorld).applyMatrix4(Ie)),Array.isArray(ye)){const Se=pe.groups;for(let ke=0,Ve=Se.length;ke<Ve;ke++){const Ce=Se[ke],je=ye[Ce.materialIndex];je&&je.visible&&y.push(E,pe,je,q,Ne.z,Ce)}}else ye.visible&&y.push(E,pe,ye,q,Ne.z,null)}}const oe=E.children;for(let pe=0,ye=oe.length;pe<ye;pe++)Ds(oe[pe],B,q,Y)}function To(E,B,q,Y){const{opaque:k,transmissive:oe,transparent:pe}=E;M.setupLightsView(q),j===!0&&be.setGlobalState(b.clippingPlanes,q),Y&&ge.viewport(N.copy(Y)),k.length>0&&Gi(k,B,q),oe.length>0&&Gi(oe,B,q),pe.length>0&&Gi(pe,B,q),ge.buffers.depth.setTest(!0),ge.buffers.depth.setMask(!0),ge.buffers.color.setMask(!0),ge.setPolygonOffset(!1)}function Ao(E,B,q,Y){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;M.state.transmissionRenderTarget[Y.id]===void 0&&(M.state.transmissionRenderTarget[Y.id]=new Dn(1,1,{generateMipmaps:!0,type:ve.has("EXT_color_buffer_half_float")||ve.has("EXT_color_buffer_float")?gi:cn,minFilter:Wn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:nt.workingColorSpace}));const oe=M.state.transmissionRenderTarget[Y.id],pe=Y.viewport||N;oe.setSize(pe.z*b.transmissionResolutionScale,pe.w*b.transmissionResolutionScale);const ye=b.getRenderTarget(),Se=b.getActiveCubeFace(),ke=b.getActiveMipmapLevel();b.setRenderTarget(oe),b.getClearColor(W),ee=b.getClearAlpha(),ee<1&&b.setClearColor(16777215,.5),b.clear(),Le&&ae.render(q);const Ve=b.toneMapping;b.toneMapping=Cn;const Ce=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),M.setupLightsView(Y),j===!0&&be.setGlobalState(b.clippingPlanes,Y),Gi(E,q,Y),Fe.updateMultisampleRenderTarget(oe),Fe.updateRenderTargetMipmap(oe),ve.has("WEBGL_multisampled_render_to_texture")===!1){let je=!1;for(let ot=0,pt=B.length;ot<pt;ot++){const mt=B[ot],{object:lt,geometry:Ue,material:dt,group:tt}=mt;if(dt.side===Vt&&lt.layers.test(Y.layers)){const Bt=dt.side;dt.side=Dt,dt.needsUpdate=!0,Ro(lt,q,Y,Ue,dt,tt),dt.side=Bt,dt.needsUpdate=!0,je=!0}}je===!0&&(Fe.updateMultisampleRenderTarget(oe),Fe.updateRenderTargetMipmap(oe))}b.setRenderTarget(ye,Se,ke),b.setClearColor(W,ee),Ce!==void 0&&(Y.viewport=Ce),b.toneMapping=Ve}function Gi(E,B,q){const Y=B.isScene===!0?B.overrideMaterial:null;for(let k=0,oe=E.length;k<oe;k++){const pe=E[k],{object:ye,geometry:Se,group:ke}=pe;let Ve=pe.material;Ve.allowOverride===!0&&Y!==null&&(Ve=Y),ye.layers.test(q.layers)&&Ro(ye,B,q,Se,Ve,ke)}}function Ro(E,B,q,Y,k,oe){E.onBeforeRender(b,B,q,Y,k,oe),E.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),k.onBeforeRender(b,B,q,Y,E,oe),k.transparent===!0&&k.side===Vt&&k.forceSinglePass===!1?(k.side=Dt,k.needsUpdate=!0,b.renderBufferDirect(q,B,Y,k,E,oe),k.side=Pn,k.needsUpdate=!0,b.renderBufferDirect(q,B,Y,k,E,oe),k.side=Vt):b.renderBufferDirect(q,B,Y,k,E,oe),E.onAfterRender(b,B,q,Y,k,oe)}function Vi(E,B,q){B.isScene!==!0&&(B=it);const Y=Te.get(E),k=M.state.lights,oe=M.state.shadowsArray,pe=k.state.version,ye=$.getParameters(E,k.state,oe,B,q),Se=$.getProgramCacheKey(ye);let ke=Y.programs;Y.environment=E.isMeshStandardMaterial?B.environment:null,Y.fog=B.fog,Y.envMap=(E.isMeshStandardMaterial?S:P).get(E.envMap||Y.environment),Y.envMapRotation=Y.environment!==null&&E.envMap===null?B.environmentRotation:E.envMapRotation,ke===void 0&&(E.addEventListener("dispose",We),ke=new Map,Y.programs=ke);let Ve=ke.get(Se);if(Ve!==void 0){if(Y.currentProgram===Ve&&Y.lightsStateVersion===pe)return Co(E,ye),Ve}else ye.uniforms=$.getUniforms(E),E.onBeforeCompile(ye,b),Ve=$.acquireProgram(ye,Se),ke.set(Se,Ve),Y.uniforms=ye.uniforms;const Ce=Y.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Ce.clippingPlanes=be.uniform),Co(E,ye),Y.needsLights=ml(E),Y.lightsStateVersion=pe,Y.needsLights&&(Ce.ambientLightColor.value=k.state.ambient,Ce.lightProbe.value=k.state.probe,Ce.directionalLights.value=k.state.directional,Ce.directionalLightShadows.value=k.state.directionalShadow,Ce.spotLights.value=k.state.spot,Ce.spotLightShadows.value=k.state.spotShadow,Ce.rectAreaLights.value=k.state.rectArea,Ce.ltc_1.value=k.state.rectAreaLTC1,Ce.ltc_2.value=k.state.rectAreaLTC2,Ce.pointLights.value=k.state.point,Ce.pointLightShadows.value=k.state.pointShadow,Ce.hemisphereLights.value=k.state.hemi,Ce.directionalShadowMap.value=k.state.directionalShadowMap,Ce.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Ce.spotShadowMap.value=k.state.spotShadowMap,Ce.spotLightMatrix.value=k.state.spotLightMatrix,Ce.spotLightMap.value=k.state.spotLightMap,Ce.pointShadowMap.value=k.state.pointShadowMap,Ce.pointShadowMatrix.value=k.state.pointShadowMatrix),Y.currentProgram=Ve,Y.uniformsList=null,Ve}function wo(E){if(E.uniformsList===null){const B=E.currentProgram.getUniforms();E.uniformsList=_s.seqWithValue(B.seq,E.uniforms)}return E.uniformsList}function Co(E,B){const q=Te.get(E);q.outputColorSpace=B.outputColorSpace,q.batching=B.batching,q.batchingColor=B.batchingColor,q.instancing=B.instancing,q.instancingColor=B.instancingColor,q.instancingMorph=B.instancingMorph,q.skinning=B.skinning,q.morphTargets=B.morphTargets,q.morphNormals=B.morphNormals,q.morphColors=B.morphColors,q.morphTargetsCount=B.morphTargetsCount,q.numClippingPlanes=B.numClippingPlanes,q.numIntersection=B.numClipIntersection,q.vertexAlphas=B.vertexAlphas,q.vertexTangents=B.vertexTangents,q.toneMapping=B.toneMapping}function fl(E,B,q,Y,k){B.isScene!==!0&&(B=it),Fe.resetTextureUnits();const oe=B.fog,pe=Y.isMeshStandardMaterial?B.environment:null,ye=v===null?b.outputColorSpace:v.isXRRenderTarget===!0?v.texture.colorSpace:fi,Se=(Y.isMeshStandardMaterial?S:P).get(Y.envMap||pe),ke=Y.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Ve=!!q.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Ce=!!q.morphAttributes.position,je=!!q.morphAttributes.normal,ot=!!q.morphAttributes.color;let pt=Cn;Y.toneMapped&&(v===null||v.isXRRenderTarget===!0)&&(pt=b.toneMapping);const mt=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,lt=mt!==void 0?mt.length:0,Ue=Te.get(Y),dt=M.state.lights;if(j===!0&&(ue===!0||E!==L)){const It=E===L&&Y.id===C;be.setState(Y,E,It)}let tt=!1;Y.version===Ue.__version?(Ue.needsLights&&Ue.lightsStateVersion!==dt.state.version||Ue.outputColorSpace!==ye||k.isBatchedMesh&&Ue.batching===!1||!k.isBatchedMesh&&Ue.batching===!0||k.isBatchedMesh&&Ue.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&Ue.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&Ue.instancing===!1||!k.isInstancedMesh&&Ue.instancing===!0||k.isSkinnedMesh&&Ue.skinning===!1||!k.isSkinnedMesh&&Ue.skinning===!0||k.isInstancedMesh&&Ue.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&Ue.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&Ue.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&Ue.instancingMorph===!1&&k.morphTexture!==null||Ue.envMap!==Se||Y.fog===!0&&Ue.fog!==oe||Ue.numClippingPlanes!==void 0&&(Ue.numClippingPlanes!==be.numPlanes||Ue.numIntersection!==be.numIntersection)||Ue.vertexAlphas!==ke||Ue.vertexTangents!==Ve||Ue.morphTargets!==Ce||Ue.morphNormals!==je||Ue.morphColors!==ot||Ue.toneMapping!==pt||Ue.morphTargetsCount!==lt)&&(tt=!0):(tt=!0,Ue.__version=Y.version);let Bt=Ue.currentProgram;tt===!0&&(Bt=Vi(Y,B,k));let qn=!1,kt=!1,Si=!1;const ft=Bt.getUniforms(),Ut=Ue.uniforms;if(ge.useProgram(Bt.program)&&(qn=!0,kt=!0,Si=!0),Y.id!==C&&(C=Y.id,kt=!0),qn||L!==E){ge.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),ft.setValue(D,"projectionMatrix",E.projectionMatrix),ft.setValue(D,"viewMatrix",E.matrixWorldInverse);const Nt=ft.map.cameraPosition;Nt!==void 0&&Nt.setValue(D,xe.setFromMatrixPosition(E.matrixWorld)),Je.logarithmicDepthBuffer&&ft.setValue(D,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&ft.setValue(D,"isOrthographic",E.isOrthographicCamera===!0),L!==E&&(L=E,kt=!0,Si=!0)}if(k.isSkinnedMesh){ft.setOptional(D,k,"bindMatrix"),ft.setOptional(D,k,"bindMatrixInverse");const It=k.skeleton;It&&(It.boneTexture===null&&It.computeBoneTexture(),ft.setValue(D,"boneTexture",It.boneTexture,Fe))}k.isBatchedMesh&&(ft.setOptional(D,k,"batchingTexture"),ft.setValue(D,"batchingTexture",k._matricesTexture,Fe),ft.setOptional(D,k,"batchingIdTexture"),ft.setValue(D,"batchingIdTexture",k._indirectTexture,Fe),ft.setOptional(D,k,"batchingColorTexture"),k._colorsTexture!==null&&ft.setValue(D,"batchingColorTexture",k._colorsTexture,Fe));const Wt=q.morphAttributes;if((Wt.position!==void 0||Wt.normal!==void 0||Wt.color!==void 0)&&ze.update(k,q,Bt),(kt||Ue.receiveShadow!==k.receiveShadow)&&(Ue.receiveShadow=k.receiveShadow,ft.setValue(D,"receiveShadow",k.receiveShadow)),Y.isMeshGouraudMaterial&&Y.envMap!==null&&(Ut.envMap.value=Se,Ut.flipEnvMap.value=Se.isCubeTexture&&Se.isRenderTargetTexture===!1?-1:1),Y.isMeshStandardMaterial&&Y.envMap===null&&B.environment!==null&&(Ut.envMapIntensity.value=B.environmentIntensity),Ut.dfgLUT!==void 0&&(Ut.dfgLUT.value=Vp()),kt&&(ft.setValue(D,"toneMappingExposure",b.toneMappingExposure),Ue.needsLights&&pl(Ut,Si),oe&&Y.fog===!0&&Ee.refreshFogUniforms(Ut,oe),Ee.refreshMaterialUniforms(Ut,Y,ne,te,M.state.transmissionRenderTarget[E.id]),_s.upload(D,wo(Ue),Ut,Fe)),Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(_s.upload(D,wo(Ue),Ut,Fe),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&ft.setValue(D,"center",k.center),ft.setValue(D,"modelViewMatrix",k.modelViewMatrix),ft.setValue(D,"normalMatrix",k.normalMatrix),ft.setValue(D,"modelMatrix",k.matrixWorld),Y.isShaderMaterial||Y.isRawShaderMaterial){const It=Y.uniformsGroups;for(let Nt=0,Is=It.length;Nt<Is;Nt++){const Ln=It[Nt];fe.update(Ln,Bt),fe.bind(Ln,Bt)}}return Bt}function pl(E,B){E.ambientLightColor.needsUpdate=B,E.lightProbe.needsUpdate=B,E.directionalLights.needsUpdate=B,E.directionalLightShadows.needsUpdate=B,E.pointLights.needsUpdate=B,E.pointLightShadows.needsUpdate=B,E.spotLights.needsUpdate=B,E.spotLightShadows.needsUpdate=B,E.rectAreaLights.needsUpdate=B,E.hemisphereLights.needsUpdate=B}function ml(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return _},this.getRenderTarget=function(){return v},this.setRenderTargetTextures=function(E,B,q){const Y=Te.get(E);Y.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),Te.get(E.texture).__webglTexture=B,Te.get(E.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:q,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,B){const q=Te.get(E);q.__webglFramebuffer=B,q.__useDefaultFramebuffer=B===void 0};const gl=D.createFramebuffer();this.setRenderTarget=function(E,B=0,q=0){v=E,w=B,_=q;let Y=!0,k=null,oe=!1,pe=!1;if(E){const Se=Te.get(E);if(Se.__useDefaultFramebuffer!==void 0)ge.bindFramebuffer(D.FRAMEBUFFER,null),Y=!1;else if(Se.__webglFramebuffer===void 0)Fe.setupRenderTarget(E);else if(Se.__hasExternalTextures)Fe.rebindTextures(E,Te.get(E.texture).__webglTexture,Te.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Ce=E.depthTexture;if(Se.__boundDepthTexture!==Ce){if(Ce!==null&&Te.has(Ce)&&(E.width!==Ce.image.width||E.height!==Ce.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Fe.setupDepthRenderbuffer(E)}}const ke=E.texture;(ke.isData3DTexture||ke.isDataArrayTexture||ke.isCompressedArrayTexture)&&(pe=!0);const Ve=Te.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Ve[B])?k=Ve[B][q]:k=Ve[B],oe=!0):E.samples>0&&Fe.useMultisampledRTT(E)===!1?k=Te.get(E).__webglMultisampledFramebuffer:Array.isArray(Ve)?k=Ve[q]:k=Ve,N.copy(E.viewport),O.copy(E.scissor),z=E.scissorTest}else N.copy(Ge).multiplyScalar(ne).floor(),O.copy(Ke).multiplyScalar(ne).floor(),z=Qe;if(q!==0&&(k=gl),ge.bindFramebuffer(D.FRAMEBUFFER,k)&&Y&&ge.drawBuffers(E,k),ge.viewport(N),ge.scissor(O),ge.setScissorTest(z),oe){const Se=Te.get(E.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+B,Se.__webglTexture,q)}else if(pe){const Se=B;for(let ke=0;ke<E.textures.length;ke++){const Ve=Te.get(E.textures[ke]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+ke,Ve.__webglTexture,q,Se)}}else if(E!==null&&q!==0){const Se=Te.get(E.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Se.__webglTexture,q)}C=-1},this.readRenderTargetPixels=function(E,B,q,Y,k,oe,pe,ye=0){if(!(E&&E.isWebGLRenderTarget)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=Te.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&pe!==void 0&&(Se=Se[pe]),Se){ge.bindFramebuffer(D.FRAMEBUFFER,Se);try{const ke=E.textures[ye],Ve=ke.format,Ce=ke.type;if(!Je.textureFormatReadable(Ve)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Je.textureTypeReadable(Ce)){gt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=E.width-Y&&q>=0&&q<=E.height-k&&(E.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ye),D.readPixels(B,q,Y,k,He.convert(Ve),He.convert(Ce),oe))}finally{const ke=v!==null?Te.get(v).__webglFramebuffer:null;ge.bindFramebuffer(D.FRAMEBUFFER,ke)}}},this.readRenderTargetPixelsAsync=async function(E,B,q,Y,k,oe,pe,ye=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=Te.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&pe!==void 0&&(Se=Se[pe]),Se)if(B>=0&&B<=E.width-Y&&q>=0&&q<=E.height-k){ge.bindFramebuffer(D.FRAMEBUFFER,Se);const ke=E.textures[ye],Ve=ke.format,Ce=ke.type;if(!Je.textureFormatReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Je.textureTypeReadable(Ce))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const je=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,je),D.bufferData(D.PIXEL_PACK_BUFFER,oe.byteLength,D.STREAM_READ),E.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ye),D.readPixels(B,q,Y,k,He.convert(Ve),He.convert(Ce),0);const ot=v!==null?Te.get(v).__webglFramebuffer:null;ge.bindFramebuffer(D.FRAMEBUFFER,ot);const pt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await lc(D,pt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,je),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,oe),D.deleteBuffer(je),D.deleteSync(pt),oe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,B=null,q=0){const Y=Math.pow(2,-q),k=Math.floor(E.image.width*Y),oe=Math.floor(E.image.height*Y),pe=B!==null?B.x:0,ye=B!==null?B.y:0;Fe.setTexture2D(E,0),D.copyTexSubImage2D(D.TEXTURE_2D,q,0,0,pe,ye,k,oe),ge.unbindTexture()};const xl=D.createFramebuffer(),_l=D.createFramebuffer();this.copyTextureToTexture=function(E,B,q=null,Y=null,k=0,oe=null){oe===null&&(k!==0?(Fi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),oe=k,k=0):oe=0);let pe,ye,Se,ke,Ve,Ce,je,ot,pt;const mt=E.isCompressedTexture?E.mipmaps[oe]:E.image;if(q!==null)pe=q.max.x-q.min.x,ye=q.max.y-q.min.y,Se=q.isBox3?q.max.z-q.min.z:1,ke=q.min.x,Ve=q.min.y,Ce=q.isBox3?q.min.z:0;else{const Wt=Math.pow(2,-k);pe=Math.floor(mt.width*Wt),ye=Math.floor(mt.height*Wt),E.isDataArrayTexture?Se=mt.depth:E.isData3DTexture?Se=Math.floor(mt.depth*Wt):Se=1,ke=0,Ve=0,Ce=0}Y!==null?(je=Y.x,ot=Y.y,pt=Y.z):(je=0,ot=0,pt=0);const lt=He.convert(B.format),Ue=He.convert(B.type);let dt;B.isData3DTexture?(Fe.setTexture3D(B,0),dt=D.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(Fe.setTexture2DArray(B,0),dt=D.TEXTURE_2D_ARRAY):(Fe.setTexture2D(B,0),dt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,B.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,B.unpackAlignment);const tt=D.getParameter(D.UNPACK_ROW_LENGTH),Bt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),qn=D.getParameter(D.UNPACK_SKIP_PIXELS),kt=D.getParameter(D.UNPACK_SKIP_ROWS),Si=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,mt.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,mt.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,ke),D.pixelStorei(D.UNPACK_SKIP_ROWS,Ve),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ce);const ft=E.isDataArrayTexture||E.isData3DTexture,Ut=B.isDataArrayTexture||B.isData3DTexture;if(E.isDepthTexture){const Wt=Te.get(E),It=Te.get(B),Nt=Te.get(Wt.__renderTarget),Is=Te.get(It.__renderTarget);ge.bindFramebuffer(D.READ_FRAMEBUFFER,Nt.__webglFramebuffer),ge.bindFramebuffer(D.DRAW_FRAMEBUFFER,Is.__webglFramebuffer);for(let Ln=0;Ln<Se;Ln++)ft&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Te.get(E).__webglTexture,k,Ce+Ln),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Te.get(B).__webglTexture,oe,pt+Ln)),D.blitFramebuffer(ke,Ve,pe,ye,je,ot,pe,ye,D.DEPTH_BUFFER_BIT,D.NEAREST);ge.bindFramebuffer(D.READ_FRAMEBUFFER,null),ge.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(k!==0||E.isRenderTargetTexture||Te.has(E)){const Wt=Te.get(E),It=Te.get(B);ge.bindFramebuffer(D.READ_FRAMEBUFFER,xl),ge.bindFramebuffer(D.DRAW_FRAMEBUFFER,_l);for(let Nt=0;Nt<Se;Nt++)ft?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Wt.__webglTexture,k,Ce+Nt):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Wt.__webglTexture,k),Ut?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,It.__webglTexture,oe,pt+Nt):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,It.__webglTexture,oe),k!==0?D.blitFramebuffer(ke,Ve,pe,ye,je,ot,pe,ye,D.COLOR_BUFFER_BIT,D.NEAREST):Ut?D.copyTexSubImage3D(dt,oe,je,ot,pt+Nt,ke,Ve,pe,ye):D.copyTexSubImage2D(dt,oe,je,ot,ke,Ve,pe,ye);ge.bindFramebuffer(D.READ_FRAMEBUFFER,null),ge.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Ut?E.isDataTexture||E.isData3DTexture?D.texSubImage3D(dt,oe,je,ot,pt,pe,ye,Se,lt,Ue,mt.data):B.isCompressedArrayTexture?D.compressedTexSubImage3D(dt,oe,je,ot,pt,pe,ye,Se,lt,mt.data):D.texSubImage3D(dt,oe,je,ot,pt,pe,ye,Se,lt,Ue,mt):E.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,oe,je,ot,pe,ye,lt,Ue,mt.data):E.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,oe,je,ot,mt.width,mt.height,lt,mt.data):D.texSubImage2D(D.TEXTURE_2D,oe,je,ot,pe,ye,lt,Ue,mt);D.pixelStorei(D.UNPACK_ROW_LENGTH,tt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Bt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,qn),D.pixelStorei(D.UNPACK_SKIP_ROWS,kt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Si),oe===0&&B.generateMipmaps&&D.generateMipmap(dt),ge.unbindTexture()},this.initRenderTarget=function(E){Te.get(E).__webglFramebuffer===void 0&&Fe.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?Fe.setTextureCube(E,0):E.isData3DTexture?Fe.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?Fe.setTexture2DArray(E,0):Fe.setTexture2D(E,0),ge.unbindTexture()},this.resetState=function(){w=0,_=0,v=null,ge.reset(),U.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return an}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=nt._getDrawingBufferColorSpace(e),t.unpackColorSpace=nt._getUnpackColorSpace()}}const V={AMBIENT_LIGHT_INTENSITY:.75,DIRECTIONAL_LIGHT_INTENSITY:1,HEMISPHERE_LIGHT_INTENSITY:.01,SUN_DIRECTION:{x:1,y:.5,z:.3},VERTEX_LIGHTING_ENABLED:!0,WALK_SPEED:4,SPRINT_SPEED:8,WALK_SPEED_MULTIPLIER:1,JUMP_FORCE:8,DOUBLE_JUMP_ENABLED:!0,DOUBLE_JUMP_ACTIVATES_JETPACK:!0,BASE_GRAVITY:20,AUTO_STEP_HEIGHT:0,GRAVITY_FULL_RADIUS:1.4,GRAVITY_FALLOFF_RADIUS:2.4,MOUSE_SENSITIVITY:.002,INVERT_Y_AXIS:!1,ROLL_SPEED:2,ROLL_SLERP_DURATION:3,ROLL_SLERP_SPEED:2,PLAYER_HEIGHT:1.8,PLAYER_EYE_HEIGHT:1.6,PLAYER_RADIUS:.2,JETPACK_FORCE:25,JETPACK_DOWN_FORCE:30,SPACE_THRUST:15,WATER_GRAVITY_MULTIPLIER:.3,WATER_SWIM_FORCE:20,WATER_MOVEMENT_MULTIPLIER:.5,WATER_DRAG:3,WATER_SURFACE_FLOAT_HEIGHT:-.8,WATER_BODY_CHECK_HEIGHT:.5,WATER_UV_TILING:4,WATER_TRANSPARENCY:.7,WATER_SURFACE_OFFSET:.1,WATER_COLOR:"#1a5577",WATER_DEEP_COLOR:"#1a5577",WATER_WAVE_AMPLITUDE:0,WATER_WAVE_FREQUENCY:0,WATER_FRESNEL_POWER:3,WATER_REFLECTION_STRENGTH:.2,WATER_DISTORTION_STRENGTH:.8,WATER_SPECULAR_POWER:64,WATER_SPECULAR_STRENGTH:1.5,WATER_TEXTURE_STRENGTH:.7,WATER_SCROLL_SPEED:.03,WATER_CAUSTIC_STRENGTH:.08,WATER_FOAM_STRENGTH:.1,UNDERWATER_FOG_COLOR:"#1a5577",UNDERWATER_FOG_NEAR:0,UNDERWATER_FOG_FAR:5,UNDERWATER_TERRAIN_DIMMING:.3,ABOVE_WATER_FOG_COLOR:"#1a5577",ABOVE_WATER_FOG_NEAR:0,ABOVE_WATER_FOG_FAR:5,SEA_WALL_COLOR:"#03172F",ATMOSPHERE_ENABLED:!0,ATMOSPHERE_RADIUS_MULT:1.1,ATMOSPHERE_SURFACE_OFFSET:70,ATMOSPHERE_RAYLEIGH_SCALE:.015,ATMOSPHERE_MIE_SCALE:.01,ATMOSPHERE_MIE_G:.85,ATMOSPHERE_SUN_INTENSITY:5,ATMOSPHERE_SAMPLES:8,ATMOSPHERE_LIGHT_SAMPLES:4,TERRAIN_MIN_RENDER_DISTANCE:16,TERRAIN_MAX_RENDER_DISTANCE:24,TERRAIN_LOD_SWITCH_ALTITUDE:50,TERRAIN_BUFFER_ZONE:12,TERRAIN_TILES_PER_FRAME:20,TERRAIN_SEED:12345,TERRAIN_MAX_DEPTH:16,TERRAIN_MAX_HEIGHT:16,TERRAIN_SEA_LEVEL:12,TERRAIN_UV_SCALE:1,TERRAIN_CONTINENT_SCALE:.8,TERRAIN_CONTINENT_WEIGHT:.7,TERRAIN_MOUNTAIN_SCALE:2.5,TERRAIN_MOUNTAIN_HEIGHT:.8,TERRAIN_HILL_SCALE:5,TERRAIN_HILL_WEIGHT:.15,TERRAIN_DETAIL_SCALE:12,TERRAIN_DETAIL_WEIGHT:.05,TERRAIN_OCEAN_DEPTH_POWER:1.3,EARTH_SUBDIVISIONS:6,MOON_SUBDIVISIONS:5,TREE_COUNT:500,CLOUD_COUNT:100,CLOUD_ROTATION_SPEED:.01,PLANET_LOD_DISTANCE_1:200,PLANET_LOD_DISTANCE_2:500,PLANET_LOD_DISTANCE_3:1e3,FRAME_SPIKE_THRESHOLD_MS:30,DEBUG_CAVE_TILE_RINGS:1,DEBUG_CAVE_DEPTH_ROWS:6};var Wp=`varying vec3 vWorldPosition;

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
}`;const Hn=class Hn{constructor(){F(this,"sections",new Map);F(this,"enabled",!1);F(this,"sampleWindow",60);F(this,"displayElement",null);F(this,"lastUpdateTime",0);F(this,"updateInterval",200);F(this,"spikeLoggingEnabled",!0);F(this,"frameSpikeThresholdMs",50);F(this,"lastFrameStartTime",0);F(this,"frameSections",new Map);F(this,"oneTimeOperations",[]);F(this,"ONE_TIME_DISPLAY_DURATION",5e3)}static getInstance(){return Hn.instance||(Hn.instance=new Hn),Hn.instance}setEnabled(e){this.enabled=e,this.displayElement&&(this.displayElement.style.display=e?"block":"none")}isEnabled(){return this.enabled}toggle(){this.setEnabled(!this.enabled)}setSpikeLogging(e){this.spikeLoggingEnabled=e}setFrameSpikeThreshold(e){this.frameSpikeThresholdMs=e}beginFrame(){this.lastFrameStartTime=performance.now(),this.frameSections.clear()}endFrame(){if(!this.spikeLoggingEnabled)return;const e=performance.now()-this.lastFrameStartTime;if(e>this.frameSpikeThresholdMs){const t=Array.from(this.frameSections.entries()).sort((n,i)=>i[1]-n[1]).map(([n,i])=>`  ${n}: ${i.toFixed(2)}ms`).join(`
`);console.warn(`[FRAME SPIKE] Total: ${e.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)
Breakdown:
${t}`)}}logOneTimeOperation(e,t){this.oneTimeOperations.push({name:e,time:t,timestamp:performance.now()}),console.log(`[ONE-TIME] ${e}: ${t.toFixed(2)}ms`)}measureOneTime(e,t){const n=performance.now(),i=t(),r=performance.now()-n;return this.logOneTimeOperation(e,r),i}async measureOneTimeAsync(e,t){const n=performance.now(),i=await t(),r=performance.now()-n;return this.logOneTimeOperation(e,r),i}begin(e){this.sections.has(e)||this.sections.set(e,{startTime:0,samples:[],callCount:0});const t=this.sections.get(e);t.startTime=performance.now()}end(e){const t=this.sections.get(e);if(!t||t.startTime===0)return;const n=performance.now()-t.startTime;if(this.spikeLoggingEnabled){const i=this.frameSections.get(e)??0;this.frameSections.set(e,i+n)}this.enabled&&(t.samples.push(n),t.callCount++,t.samples.length>this.sampleWindow&&t.samples.shift()),t.startTime=0}wrap(e,t){this.begin(e);const n=t();return this.end(e),n}getMetrics(){const e=[];for(const[t,n]of this.sections){if(n.samples.length===0)continue;const i=n.samples,r=i[i.length-1],a=i.reduce((c,h)=>c+h,0)/i.length,o=Math.max(...i),l=Math.min(...i);e.push({name:t,lastTime:r,avgTime:a,maxTime:o,minTime:l,callCount:n.callCount})}return e.sort((t,n)=>n.avgTime-t.avgTime),e}createDisplay(){this.displayElement||(this.displayElement=document.createElement("div"),this.displayElement.id="profiler-display",this.displayElement.style.cssText=`
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
    `,document.body.appendChild(this.displayElement))}updateDisplay(){if(!this.enabled||!this.displayElement)return;const e=performance.now();if(e-this.lastUpdateTime<this.updateInterval)return;this.lastUpdateTime=e;const t=this.getMetrics();if(t.length===0){this.displayElement.innerHTML="<b>PROFILER</b><br>No data yet...";return}const n=t.find(c=>c.name==="Frame Total"),i=(n==null?void 0:n.avgTime)??0;let r="<b>PROFILER (F3 to toggle)</b><br>";r+='<span style="color:#888">─────────────────────────────</span><br>';for(const c of t){let h="#0f0";c.avgTime>5?h="#f44":c.avgTime>1&&(h="#ff0");const u=i>0?(c.avgTime/i*100).toFixed(0):"0",d=c.avgTime.toFixed(2).padStart(6),f=c.maxTime.toFixed(2).padStart(6),g=u.padStart(3);r+=`<span style="color:${h}">${c.name.padEnd(20)}</span>`,r+=`<span style="color:#aaa">${d}ms</span>`,r+=`<span style="color:#666"> max:${f}ms</span>`,c.name!=="Frame Total"&&(r+=`<span style="color:#888"> ${g}%</span>`),r+="<br>"}const a=window.__gameRenderer,o=window.__gameScene;if(a!=null&&a.info){r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#88f">GPU Stats</b><br>';const c=a.info.render.calls;let h="#0f0";c>500?h="#f44":c>100&&(h="#ff0");const u=a.info.render.triangles;let d="#0f0";u>5e5?d="#f44":u>1e5&&(d="#ff0"),r+=`<span style="color:${h}">Draw Calls: ${c}</span><br>`,r+=`<span style="color:${d}">Triangles: ${u.toLocaleString()}</span><br>`,r+=`<span style="color:#88f">Geometries: ${a.info.memory.geometries}</span><br>`,r+=`<span style="color:#88f">Textures: ${a.info.memory.textures}</span><br>`,a.info.programs&&(r+=`<span style="color:#88f">Shader Programs: ${a.info.programs.length}</span><br>`)}if(o){let c=0,h=0,u=0,d=0;o.traverse(f=>{f.isMesh&&(c++,f.visible&&h++),f.isGroup&&u++,f.isLight&&d++}),r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#a8f">Scene Stats</b><br>',r+=`<span style="color:#a8f">Total Meshes: ${c}</span><br>`,r+=`<span style="color:#a8f">Visible Meshes: ${h}</span><br>`,r+=`<span style="color:#a8f">Groups: ${u}</span><br>`,r+=`<span style="color:#a8f">Lights: ${d}</span><br>`}const l=performance.now();if(this.oneTimeOperations=this.oneTimeOperations.filter(c=>l-c.timestamp<this.ONE_TIME_DISPLAY_DURATION),this.oneTimeOperations.length>0){r+='<span style="color:#888">─────────────────────────────</span><br>',r+='<b style="color:#f80">Recent One-Time Operations</b><br>';for(const c of this.oneTimeOperations){const h=((l-c.timestamp)/1e3).toFixed(1);let u="#f80";c.time>100?u="#f44":c.time>50&&(u="#ff0"),r+=`<span style="color:${u}">${c.name.padEnd(20)}</span>`,r+=`<span style="color:#aaa">${c.time.toFixed(2).padStart(8)}ms</span>`,r+=`<span style="color:#666"> (${h}s ago)</span><br>`}}this.displayElement.innerHTML=r}reset(){this.sections.clear()}};F(Hn,"instance");let io=Hn;const me=io.getInstance();function ul(){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||navigator.maxTouchPoints>0&&/Macintosh/.test(navigator.userAgent)}class qp{constructor(){F(this,"keys",new Set);F(this,"keysJustPressed",new Set);F(this,"mouseMovement",{x:0,y:0});F(this,"mouseButtons",{left:!1,right:!1});F(this,"isPointerLocked",!1);F(this,"onPointerLockChange");F(this,"isMobile");F(this,"mobileGameActive",!1);F(this,"touchLookMovement",{x:0,y:0});F(this,"touchMoveInput",{forward:!1,backward:!1,left:!1,right:!1});F(this,"touchJump",!1);F(this,"touchJumpJustPressed",!1);F(this,"touchCrouch",!1);F(this,"touchLeftClick",!1);F(this,"touchRightClick",!1);F(this,"moveJoystickTouch",null);F(this,"lookJoystickTouch",null);F(this,"lookJoystickPosition",{x:0,y:0});this.isMobile=ul(),this.setupEventListeners(),this.isMobile&&this.setupMobileControls()}setupEventListeners(){document.addEventListener("keydown",t=>{this.keys.has(t.code)||this.keysJustPressed.add(t.code),this.keys.add(t.code)}),document.addEventListener("keyup",t=>{this.keys.delete(t.code)}),document.addEventListener("mousemove",t=>{this.isPointerLocked&&(this.mouseMovement.x+=t.movementX,this.mouseMovement.y+=t.movementY)}),document.addEventListener("mousedown",t=>{t.button===0&&(this.mouseButtons.left=!0),t.button===2&&(this.mouseButtons.right=!0)}),document.addEventListener("mouseup",t=>{t.button===0&&(this.mouseButtons.left=!1),t.button===2&&(this.mouseButtons.right=!1)}),document.addEventListener("contextmenu",t=>{this.isPointerLocked&&t.preventDefault()}),document.addEventListener("pointerlockchange",()=>{this.isPointerLocked=document.pointerLockElement!==null,this.onPointerLockChange&&this.onPointerLockChange(this.isPointerLocked)});const e=document.getElementById("start-button");e&&e.addEventListener("click",()=>{this.isMobile?this.startMobileGame():this.isPointerLocked||document.body.requestPointerLock()})}startMobileGame(){this.mobileGameActive=!0;const e=document.getElementById("instructions"),t=document.getElementById("crosshair"),n=document.getElementById("mobile-controls");e&&(e.style.display="none"),t&&(t.style.display="block"),n&&(n.style.display="block"),this.requestFullscreen(),this.onPointerLockChange&&this.onPointerLockChange(!0)}requestFullscreen(){const e=document.documentElement;e.requestFullscreen?e.requestFullscreen().catch(()=>{}):e.webkitRequestFullscreen&&e.webkitRequestFullscreen()}setupMobileControls(){var n;const e=document.createElement("div");e.id="mobile-controls",e.innerHTML=`
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
    `,document.body.appendChild(e);const t=document.getElementById("instructions");if(t){t.querySelectorAll("p").forEach(a=>a.style.display="none");const r=document.createElement("p");r.innerHTML="Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place",r.style.fontSize="12px",(n=t.querySelector("h1"))==null||n.after(r)}this.setupMobileTouchHandlers()}setupMobileTouchHandlers(){const e=document.getElementById("move-joystick"),t=document.getElementById("look-joystick"),n=document.getElementById("btn-jump"),i=document.getElementById("btn-crouch"),r=document.getElementById("btn-break"),a=document.getElementById("btn-place");if(e){const o=e.querySelector(".joystick-base"),l=e.querySelector(".joystick-thumb"),c=35,h=d=>{const f=o.getBoundingClientRect(),g=f.left+f.width/2,x=f.top+f.height/2,m=d.clientX-g,p=d.clientY-x,y=Math.sqrt(m*m+p*p),M=Math.min(y,c),T=Math.atan2(p,m),R=Math.cos(T)*M,b=Math.sin(T)*M;l.style.transform=`translate(${R}px, ${b}px)`;const A=R/c,w=b/c,_=.2;this.touchMoveInput.forward=w<-_,this.touchMoveInput.backward=w>_,this.touchMoveInput.left=A<-_,this.touchMoveInput.right=A>_};e.addEventListener("touchstart",d=>{d.preventDefault();const f=d.changedTouches[0];this.moveJoystickTouch={id:f.identifier,startX:0,startY:0},h(f)},{passive:!1}),e.addEventListener("touchmove",d=>{if(d.preventDefault(),!!this.moveJoystickTouch)for(let f=0;f<d.touches.length;f++){const g=d.touches[f];if(g.identifier===this.moveJoystickTouch.id){h(g);break}}},{passive:!1});const u=d=>{for(let f=0;f<d.changedTouches.length;f++)if(this.moveJoystickTouch&&d.changedTouches[f].identifier===this.moveJoystickTouch.id){this.moveJoystickTouch=null,l.style.transform="translate(0, 0)",this.touchMoveInput={forward:!1,backward:!1,left:!1,right:!1};break}};e.addEventListener("touchend",u),e.addEventListener("touchcancel",u)}if(t){const o=t.querySelector(".joystick-base"),l=t.querySelector(".joystick-thumb"),c=35,h=d=>{const f=o.getBoundingClientRect(),g=f.left+f.width/2,x=f.top+f.height/2,m=d.clientX-g,p=d.clientY-x,y=Math.sqrt(m*m+p*p),M=Math.min(y,c),T=Math.atan2(p,m),R=Math.cos(T)*M,b=Math.sin(T)*M;l.style.transform=`translate(${R}px, ${b}px)`;const A=R/c,w=b/c,_=.15;Math.abs(A)>_||Math.abs(w)>_?(this.lookJoystickPosition.x=A,this.lookJoystickPosition.y=w):(this.lookJoystickPosition.x=0,this.lookJoystickPosition.y=0)};t.addEventListener("touchstart",d=>{d.preventDefault();const f=d.changedTouches[0];this.lookJoystickTouch={id:f.identifier,lastX:0,lastY:0}},{passive:!1}),t.addEventListener("touchmove",d=>{if(d.preventDefault(),!!this.lookJoystickTouch)for(let f=0;f<d.touches.length;f++){const g=d.touches[f];if(g.identifier===this.lookJoystickTouch.id){h(g);break}}},{passive:!1});const u=d=>{for(let f=0;f<d.changedTouches.length;f++)if(this.lookJoystickTouch&&d.changedTouches[f].identifier===this.lookJoystickTouch.id){this.lookJoystickTouch=null,this.lookJoystickPosition={x:0,y:0},l.style.transform="translate(0, 0)";break}};t.addEventListener("touchend",u),t.addEventListener("touchcancel",u)}n&&(n.addEventListener("touchstart",o=>{o.preventDefault(),this.touchJump||(this.touchJumpJustPressed=!0),this.touchJump=!0},{passive:!1}),n.addEventListener("touchend",o=>{o.preventDefault(),this.touchJump=!1},{passive:!1})),i&&(i.addEventListener("touchstart",o=>{o.preventDefault(),this.touchCrouch=!0},{passive:!1}),i.addEventListener("touchend",o=>{o.preventDefault(),this.touchCrouch=!1},{passive:!1})),r&&(r.addEventListener("touchstart",o=>{o.preventDefault(),this.touchLeftClick=!0},{passive:!1}),r.addEventListener("touchend",o=>{o.preventDefault(),this.touchLeftClick=!1},{passive:!1})),a&&(a.addEventListener("touchstart",o=>{o.preventDefault(),this.touchRightClick=!0},{passive:!1}),a.addEventListener("touchend",o=>{o.preventDefault(),this.touchRightClick=!1},{passive:!1}))}setPointerLockCallback(e){this.onPointerLockChange=e}getState(){const e={forward:this.keys.has("KeyW")||this.keys.has("ArrowUp")||this.touchMoveInput.forward,backward:this.keys.has("KeyS")||this.keys.has("ArrowDown")||this.touchMoveInput.backward,left:this.keys.has("KeyA")||this.keys.has("ArrowLeft")||this.touchMoveInput.left,right:this.keys.has("KeyD")||this.keys.has("ArrowRight")||this.touchMoveInput.right,jump:this.keys.has("Space")||this.touchJump,jumpJustPressed:this.keysJustPressed.has("Space")||this.touchJumpJustPressed,sprint:this.keys.has("ShiftLeft")||this.keys.has("ShiftRight"),crouch:this.keys.has("ControlLeft")||this.keys.has("ControlRight")||this.touchCrouch,rollLeft:this.keys.has("KeyQ"),rollRight:this.keys.has("KeyE"),mouseX:this.mouseMovement.x+this.touchLookMovement.x+this.lookJoystickPosition.x*5,mouseY:this.mouseMovement.y+this.touchLookMovement.y+this.lookJoystickPosition.y*5,leftClick:this.mouseButtons.left||this.touchLeftClick,rightClick:this.mouseButtons.right||this.touchRightClick};return this.mouseMovement.x=0,this.mouseMovement.y=0,this.touchLookMovement.x=0,this.touchLookMovement.y=0,this.keysJustPressed.clear(),this.touchJumpJustPressed=!1,e}isKeyPressed(e){return this.keys.has(e)}isLocked(){return this.isPointerLocked||this.mobileGameActive}}function Yp(){return new Tt({uniforms:{time:{value:0}},vertexShader:Wp,fragmentShader:Xp,side:Dt})}class $p{constructor(e){F(this,"scene");F(this,"camera");F(this,"renderer");F(this,"sunDirection");F(this,"clock");F(this,"frameCount",0);F(this,"lastFpsUpdate",0);F(this,"currentFps",0);F(this,"sunMesh",null);F(this,"starfield",null);F(this,"isUnderwater",!1);F(this,"underwaterFog",null);F(this,"depthRenderTarget",null);F(this,"waterMaterials",[]);F(this,"isMobile");F(this,"updateCallbacks",[]);F(this,"animate",()=>{requestAnimationFrame(this.animate),me.beginFrame(),me.begin("Frame Total");const e=this.clock.getDelta();this.frameCount++;const t=performance.now();if(t-this.lastFpsUpdate>=1e3){this.currentFps=this.frameCount,this.frameCount=0,this.lastFpsUpdate=t;const n=document.getElementById("fps");n&&(n.textContent=`FPS: ${this.currentFps}`)}me.begin("Game Update");for(const n of this.updateCallbacks)n(e);if(me.end("Game Update"),this.starfield&&this.starfield.position.copy(this.camera.position),me.begin("Render"),this.depthRenderTarget&&this.waterMaterials.length>0){const n=[];this.scene.traverse(r=>{r instanceof Be&&this.waterMaterials.includes(r.material)&&(n.push(r.visible),r.visible=!1)}),this.renderer.setRenderTarget(this.depthRenderTarget),this.renderer.render(this.scene,this.camera),this.renderer.setRenderTarget(null);let i=0;this.scene.traverse(r=>{r instanceof Be&&this.waterMaterials.includes(r.material)&&(r.visible=n[i++])})}this.renderer.render(this.scene,this.camera),me.end("Render"),me.end("Frame Total"),me.endFrame(),me.updateDisplay()});this.isMobile=ul(),this.scene=new Uc,this.camera=new Yt(75,window.innerWidth/window.innerHeight,.1,2e3),this.camera.position.set(0,20,0),this.renderer=new Hp({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ba,e.appendChild(this.renderer.domElement),this.isMobile||this.createDepthRenderTarget(),this.clock=new eh,this.setupLighting(),window.addEventListener("resize",this.onWindowResize.bind(this)),me.createDisplay(),window.__gameRenderer=this.renderer,window.__gameScene=this.scene,document.addEventListener("keydown",t=>{t.code==="F3"&&(t.preventDefault(),me.toggle())})}setupLighting(){this.sunDirection=new I(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize();const e=new Oi(900,64,64),t=Yp();this.starfield=new Be(e,t),this.scene.add(this.starfield);const n=new Oi(60,32,32),i=new xo({color:16768324,fog:!1});this.sunMesh=new Be(n,i),this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800)),this.scene.add(this.sunMesh);const r=new Zc(16777215,V.AMBIENT_LIGHT_INTENSITY);this.scene.add(r);const a=new jc(16777215,V.DIRECTIONAL_LIGHT_INTENSITY);a.position.copy(this.sunDirection.clone().multiplyScalar(500)),a.castShadow=!0,a.shadow.mapSize.width=1024,a.shadow.mapSize.height=1024,a.shadow.camera.near=.5,a.shadow.camera.far=500,a.shadow.camera.left=-100,a.shadow.camera.right=100,a.shadow.camera.top=100,a.shadow.camera.bottom=-100,this.scene.add(a);const o=new $c(8900331,2236962,V.HEMISPHERE_LIGHT_INTENSITY);this.scene.add(o)}createDepthRenderTarget(){const e=this.renderer.getPixelRatio(),t=Math.floor(window.innerWidth*e),n=Math.floor(window.innerHeight*e);this.depthRenderTarget=new Dn(t,n,{minFilter:Rt,magFilter:Rt,type:tn,depthBuffer:!0,depthTexture:new vo(t,n,tn)})}onWindowResize(){this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.depthRenderTarget&&(this.depthRenderTarget.dispose(),this.createDepthRenderTarget(),this.updateWaterDepthUniforms())}onUpdate(e){this.updateCallbacks.push(e)}registerWaterMaterial(e){this.waterMaterials.includes(e)||(this.waterMaterials.push(e),this.updateWaterMaterialUniforms(e))}updateWaterMaterialUniforms(e){this.depthRenderTarget?(e.uniforms.depthTexture={value:this.depthRenderTarget.depthTexture},e.uniforms.cameraNear={value:this.camera.near},e.uniforms.cameraFar={value:this.camera.far},e.uniforms.resolution={value:new et(window.innerWidth,window.innerHeight)},e.uniforms.useDepthFog={value:1}):e.uniforms.useDepthFog={value:0}}updateWaterDepthUniforms(){for(const e of this.waterMaterials)this.updateWaterMaterialUniforms(e)}start(){this.clock.start(),this.animate()}getFps(){return this.currentFps}setUnderwater(e){if(e!==this.isUnderwater)if(this.isUnderwater=e,e){const t=new De(V.UNDERWATER_FOG_COLOR);this.underwaterFog=new _o(t,V.UNDERWATER_FOG_NEAR,V.UNDERWATER_FOG_FAR),this.scene.fog=this.underwaterFog,this.scene.background=t,this.starfield&&(this.starfield.visible=!1)}else this.scene.fog=null,this.scene.background=null,this.starfield&&(this.starfield.visible=!0)}getIsUnderwater(){return this.isUnderwater}}class Ia{constructor(e=50,t=3){F(this,"tiles",[]);F(this,"radius");F(this,"subdivisions");F(this,"vertexMap",new Map);F(this,"vertices",[]);F(this,"faces",[]);this.radius=e,this.subdivisions=t,this.generate()}generate(){this.createIcosahedron();for(let e=0;e<this.subdivisions;e++)this.subdivide();this.createDual()}createIcosahedron(){const e=(1+Math.sqrt(5))/2,t=[[-1,e,0],[1,e,0],[-1,-e,0],[1,-e,0],[0,-1,e],[0,1,e],[0,-1,-e],[0,1,-e],[e,0,-1],[e,0,1],[-e,0,-1],[-e,0,1]];for(const n of t){const i=new I(n[0],n[1],n[2]).normalize().multiplyScalar(this.radius);this.vertices.push(i)}this.faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]}getMiddlePoint(e,t){const n=e<t?`${e}_${t}`:`${t}_${e}`;if(this.vertexMap.has(n))return this.vertexMap.get(n);const i=this.vertices[e],r=this.vertices[t],a=new I().addVectors(i,r).multiplyScalar(.5).normalize().multiplyScalar(this.radius),o=this.vertices.length;return this.vertices.push(a),this.vertexMap.set(n,o),o}subdivide(){const e=[];this.vertexMap.clear();for(const t of this.faces){const n=this.getMiddlePoint(t[0],t[1]),i=this.getMiddlePoint(t[1],t[2]),r=this.getMiddlePoint(t[2],t[0]);e.push([t[0],n,r]),e.push([t[1],i,n]),e.push([t[2],r,i]),e.push([n,i,r])}this.faces=e}createDual(){const e=new Map;for(let i=0;i<this.vertices.length;i++)e.set(i,[]);for(let i=0;i<this.faces.length;i++){const r=this.faces[i];for(const a of r)e.get(a).push(i)}const t=[];for(const i of this.faces){const r=new I;for(const a of i)r.add(this.vertices[a]);r.divideScalar(3).normalize().multiplyScalar(this.radius),t.push(r)}const n=new Map;for(let i=0;i<this.vertices.length;i++)n.set(i,new Set);for(const i of this.faces)n.get(i[0]).add(i[1]).add(i[2]),n.get(i[1]).add(i[0]).add(i[2]),n.get(i[2]).add(i[0]).add(i[1]);for(let i=0;i<this.vertices.length;i++){const r=e.get(i),a=r.length===5,o=[];for(const u of r)o.push(t[u].clone());const l=this.vertices[i].clone();this.sortVerticesCircular(o,l);const c=Array.from(n.get(i)),h={index:i,center:l.clone(),vertices:o,neighbors:c,isPentagon:a};this.tiles.push(h)}}sortVerticesCircular(e,t){const n=t.clone().normalize(),i=new I(1,0,0);Math.abs(n.dot(i))>.9&&i.set(0,1,0);const r=new I().crossVectors(n,i).normalize();i.crossVectors(r,n).normalize();const a=[];for(const o of e){const l=o.clone().sub(t),c=l.dot(i),h=l.dot(r);a.push({vertex:o,angle:Math.atan2(h,c)})}a.sort((o,l)=>o.angle-l.angle);for(let o=0;o<e.length;o++)e[o]=a[o].vertex}getTileAtPoint(e){const t=e.clone().normalize().multiplyScalar(this.radius);let n=null,i=1/0;for(const r of this.tiles){const a=r.center.distanceToSquared(t);a<i&&(i=a,n=r)}return n}getTileAtPointFromHint(e,t){const n=e.clone().normalize().multiplyScalar(this.radius);let i=t,r=i.center.distanceToSquared(n),a=!0;for(;a;){a=!1;for(const o of i.neighbors){const l=this.tiles[o],c=l.center.distanceToSquared(n);if(c<r){i=l,r=c,a=!0;break}}}return i}getTileCount(){return this.tiles.length}getPentagonCount(){return this.tiles.filter(e=>e.isPentagon).length}getHexagonCount(){return this.tiles.filter(e=>!e.isPentagon).length}}function Ci(s){const e="/tenebris/";return s.startsWith("/")?e+s.slice(1):e+s}var Kp=`uniform float time;
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
}`,us=`uniform vec3 planetCenter;\r
uniform vec3 sunDirection;\r
uniform float waterLevel; 

attribute float skyLight;

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
varying float vWaterDepth; 
varying float vDistanceFromCamera;

void main() {\r
  vUv = uv;\r
  vSkyLight = skyLight;

  
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
}`,ds=`precision highp float;

uniform sampler2D terrainTexture;\r
uniform vec3 sunDirection;\r
uniform float ambientIntensity;\r
uniform float directionalIntensity;

uniform float isUnderwater; 
uniform vec3 underwaterFogColor;\r
uniform float underwaterFogNear;\r
uniform float underwaterFogFar;\r
uniform float underwaterDimming; 

varying vec3 vNormal;\r
varying vec3 vWorldPosition;\r
varying vec2 vUv;\r
varying float vSunBrightness;\r
varying float vSkyLight; 
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

  
  if (vWaterDepth > 0.0) {\r
    
    float depthDimFactor = exp(-vWaterDepth * underwaterDimming);\r
    finalColor *= depthDimFactor;

    
    float tintFactor = 1.0 - depthDimFactor;\r
    finalColor = mix(finalColor, underwaterFogColor * depthDimFactor, tintFactor * 0.5);\r
  }

  
  if (isUnderwater > 0.5) {\r
    float fogFactor = clamp((vDistanceFromCamera - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);\r
    finalColor = mix(finalColor, underwaterFogColor, fogFactor);\r
  }

  gl_FragColor = vec4(finalColor, texColor.a);\r
}`,H=(s=>(s[s.AIR=0]="AIR",s[s.STONE=1]="STONE",s[s.DIRT=2]="DIRT",s[s.GRASS=3]="GRASS",s[s.WATER=4]="WATER",s[s.SAND=5]="SAND",s[s.WOOD=6]="WOOD",s[s.LEAVES=7]="LEAVES",s))(H||{});function jp(s){return s!==0&&s!==4}function Zp(s){return s===4}class Qp{constructor(){F(this,"textureLoader");F(this,"textures",new Map);F(this,"materials",new Map);F(this,"waterShaderMaterial",null);F(this,"terrainMaterials",[]);F(this,"sunDirection",new I(1,.5,.3).normalize());F(this,"planetCenter",new I(0,0,0));this.textureLoader=new Yc}setSunDirection(e){this.sunDirection.copy(e).normalize(),this.waterShaderMaterial&&this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);for(const t of this.terrainMaterials)t.uniforms.sunDirection.value.copy(this.sunDirection)}setPlanetCenter(e){this.planetCenter.copy(e);for(const t of this.terrainMaterials)t.uniforms.planetCenter.value.copy(this.planetCenter)}updateWaterShader(e,t,n=!1){this.waterShaderMaterial&&(this.waterShaderMaterial.uniforms.time.value=e,this.waterShaderMaterial.uniforms.planetCenter.value.copy(t),this.waterShaderMaterial.uniforms.isUnderwater.value=n?1:0)}setWaterLevel(e){for(const t of this.terrainMaterials)t.uniforms.waterLevel.value=e}setTerrainUnderwater(e){for(const t of this.terrainMaterials)t.uniforms.isUnderwater.value=e?1:0}async loadTextures(e){const i=w=>{w.magFilter=Rt,w.minFilter=Rt,w.wrapS=Pi,w.wrapT=Pi},r=(w,_)=>{const v=w.clone();return v.needsUpdate=!0,new eo({map:v,color:_,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4})};if(e){const w=await this.loadTexture(e);i(w),this.textures.set("primary",w);const _=new De(V.UNDERWATER_FOG_COLOR),C=(O=>{const z=new Tt({uniforms:{terrainTexture:{value:O},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:_},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:us,fragmentShader:ds});return this.terrainMaterials.push(z),z})(w);this.materials.set("top",C),this.materials.set("side",C),this.materials.set("bottom",C),this.materials.set("stone",C);const N=(O=>{const z=new Tt({uniforms:{terrainTexture:{value:O},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:_},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:us,fragmentShader:ds,polygonOffset:!0,polygonOffsetFactor:4,polygonOffsetUnits:4});return this.terrainMaterials.push(z),z})(w);this.materials.set("topLOD",N),this.materials.set("sideLOD",N),this.materials.set("waterLOD",r(w));return}const a=await this.loadTexture("/textures/rocks.png"),o=await this.loadTexture("/textures/dirt.png"),l=await this.loadTexture("/textures/grass.png"),c=await this.loadTexture("/textures/dirt_grass.png");[a,o,l,c].forEach(i),this.textures.set("stone",a),this.textures.set("dirt",o),this.textures.set("grass",l),this.textures.set("dirtGrass",c);const h=new De(V.UNDERWATER_FOG_COLOR),u=w=>{const _=new Tt({uniforms:{terrainTexture:{value:w},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:h},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:us,fragmentShader:ds});return this.terrainMaterials.push(_),_};this.materials.set("top",u(l)),this.materials.set("side",u(o)),this.materials.set("grassSide",u(c)),this.materials.set("bottom",u(a)),this.materials.set("stone",u(a));const d=new De(V.SEA_WALL_COLOR),f=document.createElement("canvas");f.width=1,f.height=1;const g=f.getContext("2d");g.fillStyle=`rgb(${Math.floor(d.r*255)}, ${Math.floor(d.g*255)}, ${Math.floor(d.b*255)})`,g.fillRect(0,0,1,1);const x=new Gc(f);x.needsUpdate=!0;const m=u(x);m.side=Vt,this.materials.set("seaWall",m);const p=await this.loadTexture("/textures/water.png");i(p),this.textures.set("water",p);const y=new De(V.WATER_COLOR),M=new De(V.WATER_DEEP_COLOR),T=new De(V.UNDERWATER_FOG_COLOR),R=new De(V.ABOVE_WATER_FOG_COLOR);this.waterShaderMaterial=new Tt({uniforms:{time:{value:0},waterTexture:{value:p},uvTiling:{value:V.WATER_UV_TILING},waterColor:{value:y},deepWaterColor:{value:M},sunDirection:{value:this.sunDirection.clone()},opacity:{value:V.WATER_TRANSPARENCY},fresnelPower:{value:V.WATER_FRESNEL_POWER},reflectionStrength:{value:V.WATER_REFLECTION_STRENGTH},distortionStrength:{value:V.WATER_DISTORTION_STRENGTH},specularPower:{value:V.WATER_SPECULAR_POWER},specularStrength:{value:V.WATER_SPECULAR_STRENGTH},waveAmplitude:{value:V.WATER_WAVE_AMPLITUDE},waveFrequency:{value:V.WATER_WAVE_FREQUENCY},underwaterFogColor:{value:T},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},aboveWaterFogColor:{value:R},aboveWaterFogNear:{value:V.ABOVE_WATER_FOG_NEAR},aboveWaterFogFar:{value:V.ABOVE_WATER_FOG_FAR},isUnderwater:{value:0},planetCenter:{value:new I(0,0,0)},textureStrength:{value:V.WATER_TEXTURE_STRENGTH},scrollSpeed:{value:V.WATER_SCROLL_SPEED},causticStrength:{value:V.WATER_CAUSTIC_STRENGTH},foamStrength:{value:V.WATER_FOAM_STRENGTH},depthTexture:{value:null},cameraNear:{value:.1},cameraFar:{value:2e3},resolution:{value:new et(window.innerWidth,window.innerHeight)},useDepthFog:{value:1}},vertexShader:Kp,fragmentShader:Jp,transparent:!0,side:Vt,depthWrite:!1}),this.materials.set("water",this.waterShaderMaterial);const b=w=>{const _=w.clone();_.needsUpdate=!0;const v=new Tt({uniforms:{terrainTexture:{value:_},sunDirection:{value:this.sunDirection.clone()},planetCenter:{value:this.planetCenter.clone()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY},waterLevel:{value:0},isUnderwater:{value:0},underwaterFogColor:{value:h},underwaterFogNear:{value:V.UNDERWATER_FOG_NEAR},underwaterFogFar:{value:V.UNDERWATER_FOG_FAR},underwaterDimming:{value:V.UNDERWATER_TERRAIN_DIMMING}},vertexShader:us,fragmentShader:ds});return v.polygonOffset=!0,v.polygonOffsetFactor=4,v.polygonOffsetUnits=4,this.terrainMaterials.push(v),v};this.materials.set("topLOD",b(l)),this.materials.set("sideLOD",b(o));const A=r(p,y);A.side=Vt,A.transparent=!0,A.opacity=.8,this.materials.set("waterLOD",A)}loadTexture(e){const t=Ci(e);return new Promise((n,i)=>{this.textureLoader.load(t,n,void 0,i)})}getMaterial(e){return this.materials.get(e)||new eo({color:8947848})}getTopMaterial(){return this.materials.get("top")}getSideMaterial(){return this.materials.get("side")}getGrassSideMaterial(){return this.materials.get("grassSide")??this.materials.get("top")}getBottomMaterial(){return this.materials.get("bottom")}getStoneMaterial(){return this.materials.get("stone")}getSeaWallMaterial(){return this.materials.get("seaWall")??null}getWaterMaterial(){return this.materials.get("water")}getWaterShaderMaterial(){return this.waterShaderMaterial}getWaterLODMaterial(){return this.materials.get("waterLOD")}getTopLODMaterial(){return this.materials.get("topLOD")}getSideLODMaterial(){return this.materials.get("sideLOD")}createSeparateGeometries(e,t,n,i=new I(0,0,0),r=!0,a=!0,o=!0){const l=e.vertices.length,c=e.center.clone().sub(i).normalize(),h=[],u=[];for(const b of e.vertices){const A=b.clone().sub(i).normalize();h.push(A.clone().multiplyScalar(t)),u.push(A.clone().multiplyScalar(n))}const d=c.clone().multiplyScalar(t),f=c.clone().multiplyScalar(n),g=c.clone();let x=new I(1,0,0);Math.abs(g.dot(x))>.9&&(x=new I(0,0,1));const m=new I().crossVectors(g,x).normalize();x=new I().crossVectors(m,g).normalize();let p=null,y=null,M=null;const T=.5,R=[];for(let b=0;b<l;b++){const A=b/l*Math.PI*2-Math.PI/2;R.push({u:.5+Math.cos(A)*T,v:.5+Math.sin(A)*T})}if(r){const b=[],A=[],w=[],_=[],v=c.clone();b.push(f.x,f.y,f.z),A.push(v.x,v.y,v.z),w.push(.5,.5);for(let C=0;C<l;C++){const L=u[C];b.push(L.x,L.y,L.z),A.push(v.x,v.y,v.z),w.push(R[C].u,R[C].v)}for(let C=0;C<l;C++){const L=(C+1)%l;_.push(0,1+C,1+L)}p=new ct,p.setAttribute("position",new Ae(b,3)),p.setAttribute("normal",new Ae(A,3)),p.setAttribute("uv",new Ae(w,2)),p.setIndex(_)}if(a){const b=[],A=[],w=[],_=[],v=c.clone().negate();b.push(d.x,d.y,d.z),A.push(v.x,v.y,v.z),w.push(.5,.5);for(let C=0;C<l;C++){const L=h[C];b.push(L.x,L.y,L.z),A.push(v.x,v.y,v.z),w.push(R[C].u,R[C].v)}for(let C=0;C<l;C++){const L=(C+1)%l;_.push(0,1+L,1+C)}y=new ct,y.setAttribute("position",new Ae(b,3)),y.setAttribute("normal",new Ae(A,3)),y.setAttribute("uv",new Ae(w,2)),y.setIndex(_)}if(o){const b=[],A=[],w=[],_=[];let v=0;for(let C=0;C<l;C++){const L=(C+1)%l,N=u[C],O=u[L],z=h[C],W=h[L],ee=W.clone().sub(z),X=N.clone().sub(z),te=ee.clone().cross(X).normalize();b.push(z.x,z.y,z.z,W.x,W.y,W.z,O.x,O.y,O.z,N.x,N.y,N.z);for(let se=0;se<4;se++)A.push(te.x,te.y,te.z);w.push(0,0,1,0,1,1,0,1);const ne=v;_.push(ne,ne+1,ne+2,ne,ne+2,ne+3),v+=4}M=new ct,M.setAttribute("position",new Ae(b,3)),M.setAttribute("normal",new Ae(A,3)),M.setAttribute("uv",new Ae(w,2)),M.setIndex(_)}return{top:p,bottom:y,sides:M}}createHexPrismGeometry(e,t,n,i=new I(0,0,0),r=!0,a=!0,o=!0){const{top:l,bottom:c,sides:h}=this.createSeparateGeometries(e,t,n,i,r,a,o),u=[],d=[],f=[],g=[],x=[];let m=0;const p=(M,T)=>{if(!M)return;const R=M.getAttribute("position"),b=M.getAttribute("normal"),A=M.getAttribute("uv"),w=M.getIndex();if(!(!R||!b||!A||!w)){for(let _=0;_<R.count;_++)u.push(R.getX(_),R.getY(_),R.getZ(_)),d.push(b.getX(_),b.getY(_),b.getZ(_)),f.push(A.getX(_),A.getY(_));for(let _=0;_<w.count;_+=3)g.push(w.getX(_)+m,w.getX(_+1)+m,w.getX(_+2)+m),x.push(T);m+=R.count,M.dispose()}};p(l,"top"),p(c,"bottom"),p(h,"side");const y=new ct;return y.setAttribute("position",new Ae(u,3)),y.setAttribute("normal",new Ae(d,3)),y.setAttribute("uv",new Ae(f,2)),y.setIndex(g),{geometry:y,faceTypes:x}}isSolid(e){return jp(e)}isLiquid(e){return Zp(e)}}function Qt(){return{positions:[],normals:[],uvs:[],colors:[],skyLight:[],indices:[],vertexOffset:0}}class La{constructor(e,t=50,n=3,i={}){F(this,"radius");F(this,"center");F(this,"polyhedron");F(this,"columns",new Map);F(this,"meshBuilder");F(this,"scene");F(this,"frustum",new As);F(this,"projScreenMatrix",new ht);F(this,"config");F(this,"lodChunks",[]);F(this,"lodChunkBounds",[]);F(this,"tileToChunk",new Map);F(this,"lodMesh",null);F(this,"lodWaterMesh",null);F(this,"lodTileVisibility",new Map);F(this,"needsLODRebuild",!1);F(this,"LOD_CHUNK_COUNT",12);F(this,"distantLODMeshes",[]);F(this,"currentDistantLODLevel",-1);F(this,"boundaryWallsGroup",null);F(this,"cachedRenderDistance",-1);F(this,"cachedNearbyTiles",new Set);F(this,"bufferCenterTiles",new Set);F(this,"pendingTilesToAdd",[]);F(this,"pendingTilesToRemove",[]);F(this,"isIncrementalRebuildActive",!1);F(this,"batchedMeshGroup",null);F(this,"topMesh",null);F(this,"sideMesh",null);F(this,"grassSideMesh",null);F(this,"stoneMesh",null);F(this,"waterMesh",null);F(this,"needsRebatch",!0);F(this,"geometryWorker",null);F(this,"lodGeometryWorker",null);F(this,"isWorkerBuildActive",!1);F(this,"isLODWorkerBuildActive",!1);F(this,"isLODRebuildScheduled",!1);F(this,"isWaterWallsScheduled",!1);F(this,"needsWaterWallsRebuild",!1);F(this,"currentLODExcludedTileCount",0);F(this,"pendingLODExcludedCount",0);F(this,"cachedCameraDir",{x:0,y:1,z:0});F(this,"serializedTileData",null);F(this,"serializedTileToChunk",null);F(this,"BLOCK_HEIGHT",1);F(this,"MAX_DEPTH");F(this,"MAX_HEIGHT");F(this,"DEEP_THRESHOLD",4);F(this,"SEA_LEVEL");F(this,"seed");F(this,"sunDirection",new I(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize());F(this,"dirtyColumnsQueue",new Set);this.scene=e,this.radius=t,this.center=new I(0,0,0),this.config=i,this.SEA_LEVEL=i.seaLevel??V.TERRAIN_SEA_LEVEL,this.MAX_DEPTH=this.SEA_LEVEL+V.TERRAIN_MAX_DEPTH,this.MAX_HEIGHT=V.TERRAIN_MAX_HEIGHT,this.seed=V.TERRAIN_SEED,this.polyhedron=new Ia(t,n),this.meshBuilder=new Qp}async initialize(){await this.meshBuilder.loadTextures(this.config.texturePath),this.meshBuilder.setPlanetCenter(this.center);const e=this.radius-this.SEA_LEVEL*this.BLOCK_HEIGHT-V.WATER_SURFACE_OFFSET;this.meshBuilder.setWaterLevel(e),this.generateTerrain(),this.initializeLODChunks(),this.createLODMesh(),this.createDistantLODMeshes(),this.createBatchedMeshGroup(),this.initializeGeometryWorker(),console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`)}createBatchedMeshGroup(){this.batchedMeshGroup=new Ht,this.batchedMeshGroup.position.copy(this.center),this.batchedMeshGroup.renderOrder=0,this.scene.add(this.batchedMeshGroup)}initializeLODChunks(){const e=(1+Math.sqrt(5))/2,t=[new I(-1,e,0).normalize(),new I(1,e,0).normalize(),new I(-1,-e,0).normalize(),new I(1,-e,0).normalize(),new I(0,-1,e).normalize(),new I(0,1,e).normalize(),new I(0,-1,-e).normalize(),new I(0,1,-e).normalize(),new I(e,0,-1).normalize(),new I(e,0,1).normalize(),new I(-e,0,-1).normalize(),new I(-e,0,1).normalize()];for(const n of this.polyhedron.tiles){const i=n.center.clone().normalize();let r=0,a=1/0;for(let o=0;o<t.length;o++){const l=i.distanceToSquared(t[o]);l<a&&(a=l,r=o)}this.tileToChunk.set(n.index,r)}for(let n=0;n<this.LOD_CHUNK_COUNT;n++){const i=new Ht;this.lodChunks.push(i);const r=t[n].clone().multiplyScalar(this.radius).add(this.center),a=this.radius*.7;this.lodChunkBounds.push(new pi(r,a))}}cullLODChunks(){if(!(!this.lodMesh||this.lodChunks.length===0))for(let e=0;e<this.lodChunkBounds.length;e++){const t=this.lodChunkBounds[e],n=this.frustum.intersectsSphere(t);e<this.lodChunks.length&&(this.lodChunks[e].visible=n)}}initializeGeometryWorker(){try{this.geometryWorker=new Worker(new URL("/tenebris/assets/geometryWorker-B85QpABT.js",import.meta.url),{type:"module"}),this.geometryWorker.onmessage=e=>{if(e.data.type==="geometryResult"){const t=performance.now();this.handleWorkerResult(e.data);const n=performance.now()-t;me.logOneTimeOperation("Terrain Mesh Build",n)}},this.geometryWorker.onerror=e=>{console.error("Geometry worker error:",e),this.geometryWorker=null}}catch(e){console.warn("Failed to create geometry worker, falling back to main thread:",e),this.geometryWorker=null}try{this.lodGeometryWorker=new Worker(new URL("/tenebris/assets/lodGeometryWorker-CIUgOB9L.js",import.meta.url),{type:"module"}),this.lodGeometryWorker.onmessage=e=>{if(e.data.type==="lodGeometryResult"){const t=performance.now();this.handleLODWorkerResult(e.data);const n=performance.now()-t;me.logOneTimeOperation("LOD Mesh Build",n)}},this.lodGeometryWorker.onerror=e=>{console.error("LOD geometry worker error:",e),this.lodGeometryWorker=null}}catch(e){console.warn("Failed to create LOD geometry worker, falling back to main thread:",e),this.lodGeometryWorker=null}}handleWorkerResult(e){if(!this.batchedMeshGroup)return;me.begin("Planet.workerResult"),me.begin("Planet.workerResult.createMeshes");const t=[];if(e.topData.positions.length>0){const r=this.createBufferGeometry(e.topData),a=new Be(r,this.meshBuilder.getTopMaterial());t.push(a),this.topMesh=a}else this.topMesh=null;if(e.sideData.positions.length>0){const r=this.createBufferGeometry(e.sideData),a=new Be(r,this.meshBuilder.getSideMaterial());t.push(a),this.sideMesh=a}else this.sideMesh=null;if(e.grassSideData.positions.length>0){const r=this.createBufferGeometry(e.grassSideData),a=new Be(r,this.meshBuilder.getGrassSideMaterial());t.push(a),this.grassSideMesh=a}else this.grassSideMesh=null;if(e.stoneData.positions.length>0){const r=this.createBufferGeometry(e.stoneData),a=new Be(r,this.meshBuilder.getStoneMaterial());t.push(a),this.stoneMesh=a}else this.stoneMesh=null;if(e.waterData.positions.length>0){const r=this.createBufferGeometry(e.waterData),a=new Be(r,this.meshBuilder.getWaterMaterial());a.renderOrder=1,t.push(a),this.waterMesh=a}else this.waterMesh=null;me.end("Planet.workerResult.createMeshes"),me.begin("Planet.workerResult.swap");const n=[];for(;this.batchedMeshGroup.children.length>0;){const r=this.batchedMeshGroup.children[0];this.batchedMeshGroup.remove(r),n.push(r)}for(const r of t)this.batchedMeshGroup.add(r);for(const r of n)r.geometry&&r.geometry.dispose();me.end("Planet.workerResult.swap"),this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.isWorkerBuildActive=!1,me.end("Planet.workerResult")}handleLODWorkerResult(e){const t=performance.now(),n=performance.now();this.lodMesh&&(this.lodMesh.traverse(g=>{g instanceof Be&&g.geometry&&g.geometry.dispose()}),this.scene.remove(this.lodMesh),this.lodMesh=null,this.lodWaterMesh=null);for(const g of this.lodChunks)for(;g.children.length>0;){const x=g.children[0];x instanceof Be&&x.geometry&&x.geometry.dispose(),g.remove(x)}const i=performance.now()-n,r=new Ht,a=(g,x,m,p,y)=>{const M=new ct;return M.setAttribute("position",new Ot(new Float32Array(g),3)),M.setAttribute("normal",new Ot(new Float32Array(x),3)),M.setAttribute("uv",new Ot(new Float32Array(m),2)),y&&y.length>0&&M.setAttribute("skyLight",new Ot(new Float32Array(y),1)),M.setIndex(p),M},o=performance.now();let l=0,c=0;for(let g=0;g<this.LOD_CHUNK_COUNT;g++){const x=e.chunkGeometries[g];if(!x)continue;const m=this.lodChunks[g];if(x.grassPositions.length>0){const p=a(x.grassPositions,x.grassNormals,x.grassUvs,x.grassIndices,x.grassSkyLight),y=new Be(p,this.meshBuilder.getTopLODMaterial());m.add(y),l++,c+=x.grassPositions.length/3}if(x.dirtPositions.length>0){const p=a(x.dirtPositions,x.dirtNormals,x.dirtUvs,x.dirtIndices,x.dirtSkyLight),y=new Be(p,this.meshBuilder.getSideLODMaterial());m.add(y),l++,c+=x.dirtPositions.length/3}if(x.waterPositions.length>0){const p=a(x.waterPositions,x.waterNormals,x.waterUvs,x.waterIndices),y=new Be(p,this.meshBuilder.getWaterLODMaterial());y.renderOrder=-2,m.add(y),l++,c+=x.waterPositions.length/3}if(x.sidePositions.length>0){const p=a(x.sidePositions,x.sideNormals,x.sideUvs,x.sideIndices,x.sideSkyLight),y=new Be(p,this.meshBuilder.getSideLODMaterial());m.add(y),l++,c+=x.sidePositions.length/3}if(x.waterSidePositions.length>0){const p=a(x.waterSidePositions,x.waterSideNormals,x.waterSideUvs,x.waterSideIndices),y=new Be(p,this.meshBuilder.getWaterLODMaterial());y.renderOrder=-2,m.add(y),l++,c+=x.waterSidePositions.length/3}r.add(m)}const h=performance.now()-o,u=performance.now();r.position.copy(this.center),r.renderOrder=-1,this.scene.add(r),this.lodMesh=r;const d=performance.now()-u,f=performance.now()-t;console.log(`[LOD Build] Total: ${f.toFixed(1)}ms | Dispose: ${i.toFixed(1)}ms | Create ${l} meshes (${c} verts): ${h.toFixed(1)}ms | Scene add: ${d.toFixed(1)}ms`),this.isLODWorkerBuildActive=!1,this.currentLODExcludedTileCount=this.pendingLODExcludedCount,this.currentLODExcludedTileCount>0&&this.cachedNearbyTiles.size===0?this.needsLODRebuild=!0:this.needsLODRebuild=!1}startWorkerBuild(){if(!this.geometryWorker||this.isWorkerBuildActive)return;me.begin("Planet.workerBuild.serialize");const e=[],t={};for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);if(i){e.push({tileIndex:n,tile:{index:i.tile.index,vertices:i.tile.vertices.map(r=>({x:r.x,y:r.y,z:r.z})),center:{x:i.tile.center.x,y:i.tile.center.y,z:i.tile.center.z},neighbors:i.tile.neighbors},blocks:[...i.blocks]});for(const r of i.tile.neighbors)if(!t[r]){const a=this.columns.get(r);a&&(t[r]={blocks:[...a.blocks],vertices:a.tile.vertices.map(o=>({x:o.x,y:o.y,z:o.z}))})}i.isDirty=!1}}this.isWorkerBuildActive=!0,this.needsRebatch=!1,me.end("Planet.workerBuild.serialize"),me.begin("Planet.workerBuild.postMessage"),this.geometryWorker.postMessage({type:"buildGeometry",columns:e,neighborData:t,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,deepThreshold:this.DEEP_THRESHOLD,waterSurfaceOffset:V.WATER_SURFACE_OFFSET,sunDirection:{x:this.sunDirection.x,y:this.sunDirection.y,z:this.sunDirection.z}}}),me.end("Planet.workerBuild.postMessage")}startLODWorkerBuild(){if(!this.lodGeometryWorker||this.isLODWorkerBuildActive)return;if(me.begin("Planet.lodWorkerBuild.serialize"),!this.serializedTileData){this.serializedTileData={};for(const[t,n]of this.columns)this.serializedTileData[t]={index:n.tile.index,vertices:n.tile.vertices.map(i=>({x:i.x,y:i.y,z:i.z})),center:{x:n.tile.center.x,y:n.tile.center.y,z:n.tile.center.z},neighbors:[...n.tile.neighbors]}}if(!this.serializedTileToChunk){this.serializedTileToChunk={};for(const[t,n]of this.tileToChunk)this.serializedTileToChunk[t]=n}const e={};for(const[t,n]of this.columns)e[t]=n.blocks;this.isLODWorkerBuildActive=!0,this.pendingLODExcludedCount=this.cachedNearbyTiles.size,me.end("Planet.lodWorkerBuild.serialize"),me.begin("Planet.lodWorkerBuild.postMessage"),this.lodGeometryWorker.postMessage({type:"buildLODGeometry",tileData:this.serializedTileData,blockData:e,nearbyTiles:Array.from(this.cachedNearbyTiles),tileToChunk:this.serializedTileToChunk,config:{radius:this.radius,blockHeight:this.BLOCK_HEIGHT,seaLevel:this.SEA_LEVEL,waterSurfaceOffset:V.WATER_SURFACE_OFFSET,lodOffset:.3,chunkCount:this.LOD_CHUNK_COUNT,cameraDir:this.cachedCameraDir}}),me.end("Planet.lodWorkerBuild.postMessage")}createLODMesh(){this.rebuildLODMesh(),this.boundaryWallsGroup=new Ht,this.boundaryWallsGroup.position.copy(this.center),this.scene.add(this.boundaryWallsGroup)}createDistantLODMeshes(){const e=this.polyhedron.subdivisions,t=[Math.max(1,e-2),Math.max(1,e-3),Math.max(1,e-4)];for(let n=0;n<3;n++){const i=new Ia(this.radius,t[n]),r=new ct,a=[],o=[],l=[],c=[],h=[];let u=0;const d=new Map,f=this.radius-this.SEA_LEVEL*this.BLOCK_HEIGHT,g=!!this.config.texturePath;for(const p of i.tiles){const y=this.getHeightVariation(p.center),M=this.radius-y*this.BLOCK_HEIGHT,T=!g&&y>this.SEA_LEVEL,R=T?f:M;let b;if(g){const A=Math.max(.4,Math.min(1,.6+y*.02));b=new De(A*.7,A*.7,A*.7)}else T?b=new De(3381708):y<=0?b=new De(8947848):b=new De(4885578);d.set(p.index,{radius:R,isWater:T,color:b})}for(const p of i.tiles){const y=d.get(p.index),M=y.radius,T=y.color,R=p.center.clone().normalize().multiplyScalar(M),b=p.vertices.map(se=>se.clone().normalize().multiplyScalar(M)),A=R.clone().normalize(),w=Math.abs(A.y)<.9?new I(0,1,0):new I(1,0,0),_=new I().crossVectors(w,A).normalize(),v=new I().crossVectors(A,_),C=[];let L=1/0,N=-1/0,O=1/0,z=-1/0;for(const se of p.vertices){const Pe=se.clone().sub(p.center),Ge=Pe.dot(_),Ke=Pe.dot(v);C.push({u:Ge,v:Ke}),L=Math.min(L,Ge),N=Math.max(N,Ge),O=Math.min(O,Ke),z=Math.max(z,Ke)}const W=N-L,ee=z-O,X=C.map(se=>({u:(se.u-L)/W,v:(se.v-O)/ee})),te={u:(0-L)/W,v:(0-O)/ee},ne=u;a.push(R.x,R.y,R.z),o.push(A.x,A.y,A.z),l.push(te.u,te.v),c.push(T.r,T.g,T.b),u++;for(let se=0;se<b.length;se++)a.push(b[se].x,b[se].y,b[se].z),o.push(A.x,A.y,A.z),l.push(X[se].u,X[se].v),c.push(T.r,T.g,T.b),u++,h.push(ne,ne+1+se,ne+1+(se+1)%b.length);if(!y.isWater){const se=g?new De(.5,.5,.5):new De(9139029),Pe=p.vertices.length;for(let Ge=0;Ge<Pe;Ge++){const Ke=(Ge+1)%Pe,Qe=p.vertices[Ge],K=p.vertices[Ke],j=Qe.clone().add(K).normalize();let ue,Ie=1/0;for(const xe of p.neighbors){const Ne=d.get(xe);if(!Ne)continue;const it=i.tiles[xe];if(!it)continue;const Le=it.center.clone().normalize().distanceToSquared(j);Le<Ie&&(Ie=Le,ue=Ne)}if(ue&&ue.radius<M){const xe=Qe.clone().normalize().multiplyScalar(ue.radius),Ne=K.clone().normalize().multiplyScalar(ue.radius),it=K.clone().normalize().multiplyScalar(M),Le=Qe.clone().normalize().multiplyScalar(M),$e=u;a.push(xe.x,xe.y,xe.z),a.push(Ne.x,Ne.y,Ne.z),a.push(it.x,it.y,it.z),a.push(Le.x,Le.y,Le.z);const D=Ne.clone().sub(xe),Re=Le.clone().sub(xe),ve=D.clone().cross(Re).normalize();o.push(ve.x,ve.y,ve.z),o.push(ve.x,ve.y,ve.z),o.push(ve.x,ve.y,ve.z),o.push(ve.x,ve.y,ve.z),l.push(0,0,1,0,1,1,0,1),c.push(se.r,se.g,se.b),c.push(se.r,se.g,se.b),c.push(se.r,se.g,se.b),c.push(se.r,se.g,se.b),h.push($e,$e+1,$e+2),h.push($e,$e+2,$e+3),u+=4}}}}r.setAttribute("position",new Ae(a,3)),r.setAttribute("normal",new Ae(o,3)),r.setAttribute("uv",new Ae(l,2)),r.setAttribute("color",new Ae(c,3)),r.setIndex(h);const x=new eo({vertexColors:!0,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),m=new Be(r,x);m.position.copy(this.center),m.visible=!1,m.renderOrder=-2,this.scene.add(m),this.distantLODMeshes.push(m)}}rebuildLODMesh(){if(this.lodGeometryWorker&&!this.isLODWorkerBuildActive){this.startLODWorkerBuild();return}if(me.begin("Planet.rebuildLODMesh"),me.begin("Planet.rebuildLODMesh.cleanup"),this.lodMesh){const o=this.lodMesh;o.traverse(l=>{l instanceof Be&&l.geometry&&l.geometry.dispose()}),this.scene.remove(o),this.lodMesh=null,this.lodWaterMesh=null}for(const o of this.lodChunks)for(;o.children.length>0;){const l=o.children[0];l instanceof Be&&l.geometry&&l.geometry.dispose(),o.remove(l)}me.end("Planet.rebuildLODMesh.cleanup");const e=.3,t=this.radius-this.SEA_LEVEL*this.BLOCK_HEIGHT-e,n=[];for(let o=0;o<this.LOD_CHUNK_COUNT;o++)n.push({grassPositions:[],grassNormals:[],grassUvs:[],grassSkyLight:[],grassIndices:[],grassVertexOffset:0,dirtPositions:[],dirtNormals:[],dirtUvs:[],dirtSkyLight:[],dirtIndices:[],dirtVertexOffset:0,waterPositions:[],waterNormals:[],waterUvs:[],waterIndices:[],waterVertexOffset:0,sidePositions:[],sideNormals:[],sideUvs:[],sideSkyLight:[],sideIndices:[],sideVertexOffset:0,waterSidePositions:[],waterSideNormals:[],waterSideUvs:[],waterSideIndices:[],waterSideVertexOffset:0});const i=new Map;for(const[o,l]of this.columns){const c=l.tile,h=c.center.clone().normalize(),u=c.vertices.map(w=>w.clone().normalize()),d=Math.abs(h.y)<.9?new I(0,1,0):new I(1,0,0),f=new I().crossVectors(d,h).normalize(),g=new I().crossVectors(h,f),x=[];let m=1/0,p=-1/0,y=1/0,M=-1/0;for(const w of c.vertices){const _=w.clone().sub(c.center),v=_.dot(f),C=_.dot(g);x.push({u:v,v:C}),m=Math.min(m,v),p=Math.max(p,v),y=Math.min(y,C),M=Math.max(M,C)}const T=p-m,R=M-y,b=x.map(w=>({u:(w.u-m)/T,v:(w.v-y)/R})),A={u:(0-m)/T,v:(0-y)/R};i.set(o,{normalizedCenter:h,normalizedVertices:u,normalizedUVs:b,centerUV:A})}me.begin("Planet.rebuildLODMesh.pass1");const r=new Map;for(const[o,l]of this.columns){let c=0,h=H.GRASS;for(let f=0;f<l.blocks.length;f++)if(l.blocks[f]!==H.AIR){c=f,h=l.blocks[f];break}let u;const d=h===H.WATER;d?u=t:u=this.radius-c*this.BLOCK_HEIGHT-e,r.set(o,{radius:u,isWater:d,surfaceBlockType:h})}me.end("Planet.rebuildLODMesh.pass1"),me.begin("Planet.rebuildLODMesh.pass2");for(const[o]of this.columns){if(this.cachedNearbyTiles.has(o))continue;const l=r.get(o);if(!l)continue;const c=l.surfaceBlockType,h=l.radius,u=i.get(o);if(!u)continue;const d=u.normalizedCenter,f=d.clone().multiplyScalar(h),g=u.normalizedVertices.map(w=>w.clone().multiplyScalar(h)),x=this.tileToChunk.get(o)??0,m=n[x];let p,y,M,T,R,b;c===H.WATER?(p=m.waterPositions,y=m.waterNormals,M=m.waterUvs,T=null,R=m.waterIndices,b=m.waterVertexOffset):c===H.DIRT?(p=m.dirtPositions,y=m.dirtNormals,M=m.dirtUvs,T=m.dirtSkyLight,R=m.dirtIndices,b=m.dirtVertexOffset):(p=m.grassPositions,y=m.grassNormals,M=m.grassUvs,T=m.grassSkyLight,R=m.grassIndices,b=m.grassVertexOffset);const A=b;p.push(f.x,f.y,f.z),y.push(d.x,d.y,d.z),M.push(u.centerUV.u,u.centerUV.v),T&&T.push(1),b++;for(let w=0;w<g.length;w++)p.push(g[w].x,g[w].y,g[w].z),y.push(d.x,d.y,d.z),M.push(u.normalizedUVs[w].u,u.normalizedUVs[w].v),T&&T.push(1),b++,R.push(A,A+1+w,A+1+(w+1)%g.length);c===H.WATER?m.waterVertexOffset=b:c===H.DIRT?m.dirtVertexOffset=b:m.grassVertexOffset=b,this.lodTileVisibility.set(o,!0)}me.end("Planet.rebuildLODMesh.pass2"),me.begin("Planet.rebuildLODMesh.pass3");for(const[o,l]of this.columns){if(this.cachedNearbyTiles.has(o))continue;const c=l.tile,h=r.get(o),u=(h==null?void 0:h.radius)??this.radius,d=(h==null?void 0:h.isWater)??!1,f=c.vertices.length,g=i.get(o);if(!g)continue;const x=g.normalizedVertices,m=this.tileToChunk.get(o)??0,p=n[m];for(let y=0;y<f;y++){const M=(y+1)%f,T=x[y],R=x[M],b=T.x+R.x,A=T.y+R.y,w=T.z+R.z,_=Math.sqrt(b*b+A*A+w*w),v=b/_,C=A/_,L=w/_;let N,O=1/0,z=!1;for(const G of c.neighbors){const J=i.get(G);if(!J)continue;const Q=J.normalizedCenter,$=Q.x-v,Ee=Q.y-C,he=Q.z-L,we=$*$+Ee*Ee+he*he;if(we<O){O=we;const be=r.get(G);N=be==null?void 0:be.radius,z=(be==null?void 0:be.isWater)??!1}}if(N===void 0||!(u>N||d&&!z))continue;const ee=T.x*N,X=T.y*N,te=T.z*N,ne=R.x*N,se=R.y*N,Pe=R.z*N,Ge=R.x*u,Ke=R.y*u,Qe=R.z*u,K=T.x*u,j=T.y*u,ue=T.z*u,Ie=ne-ee,xe=se-X,Ne=Pe-te,it=K-ee,Le=j-X,$e=ue-te;let D=xe*$e-Ne*Le,Re=Ne*it-Ie*$e,ve=Ie*Le-xe*it;const Je=Math.sqrt(D*D+Re*Re+ve*ve);Je>0&&(D/=Je,Re/=Je,ve/=Je);const ge=d?p.waterSidePositions:p.sidePositions,st=d?p.waterSideNormals:p.sideNormals,Te=d?p.waterSideUvs:p.sideUvs,Fe=d?null:p.sideSkyLight,P=d?p.waterSideIndices:p.sideIndices,S=d?p.waterSideVertexOffset:p.sideVertexOffset;ge.push(ee,X,te,ne,se,Pe,Ge,Ke,Qe,K,j,ue),st.push(D,Re,ve,D,Re,ve,D,Re,ve,D,Re,ve),Te.push(0,0,1,0,1,1,0,1),Fe&&Fe.push(1,1,1,1),P.push(S,S+1,S+2,S,S+2,S+3),d?p.waterSideVertexOffset+=4:p.sideVertexOffset+=4}}me.end("Planet.rebuildLODMesh.pass3"),me.begin("Planet.rebuildLODMesh.pass4");for(const[o,l]of this.columns){if(this.cachedNearbyTiles.has(o))continue;const c=r.get(o);if(!((c==null?void 0:c.isWater)??!1))continue;const u=l.tile,d=u.vertices.length,f=i.get(o);if(!f)continue;const g=f.normalizedVertices,x=this.tileToChunk.get(o)??0,m=n[x];for(let p=0;p<d;p++){const y=(p+1)%d,M=g[p],T=g[y],R=M.x+T.x,b=M.y+T.y,A=M.z+T.z,w=Math.sqrt(R*R+b*b+A*A),_=R/w,v=b/w,C=A/w;let L,N=1/0;for(const st of u.neighbors){const Te=i.get(st);if(!Te)continue;const Fe=Te.normalizedCenter,P=Fe.x-_,S=Fe.y-v,G=Fe.z-C,J=P*P+S*S+G*G;J<N&&(N=J,L=st)}if(L===void 0||!this.cachedNearbyTiles.has(L))continue;const O=r.get(L);if(!O)continue;const z=O.radius,W=t;if(z>=W)continue;const ee=M.x*z,X=M.y*z,te=M.z*z,ne=T.x*z,se=T.y*z,Pe=T.z*z,Ge=T.x*W,Ke=T.y*W,Qe=T.z*W,K=M.x*W,j=M.y*W,ue=M.z*W,Ie=ne-ee,xe=se-X,Ne=Pe-te,it=K-ee,Le=j-X,$e=ue-te;let D=xe*$e-Ne*Le,Re=Ne*it-Ie*$e,ve=Ie*Le-xe*it;const Je=Math.sqrt(D*D+Re*Re+ve*ve);Je>0&&(D/=Je,Re/=Je,ve/=Je);const ge=m.waterSideVertexOffset;m.waterSidePositions.push(ee,X,te,ne,se,Pe,Ge,Ke,Qe,K,j,ue),m.waterSideNormals.push(D,Re,ve,D,Re,ve,D,Re,ve,D,Re,ve),m.waterSideUvs.push(0,0,1,0,1,1,0,1),m.waterSideIndices.push(ge,ge+1,ge+2,ge,ge+2,ge+3),m.waterSideVertexOffset+=4}}me.end("Planet.rebuildLODMesh.pass4"),me.begin("Planet.rebuildLODMesh.createMeshes");const a=new Ht;for(let o=0;o<this.LOD_CHUNK_COUNT;o++){const l=n[o],c=this.lodChunks[o];for(;c.children.length>0;)c.remove(c.children[0]);if(l.grassPositions.length>0){const h=new ct;h.setAttribute("position",new Ae(l.grassPositions,3)),h.setAttribute("normal",new Ae(l.grassNormals,3)),h.setAttribute("uv",new Ae(l.grassUvs,2)),l.grassSkyLight.length>0&&h.setAttribute("skyLight",new Ae(l.grassSkyLight,1)),h.setIndex(l.grassIndices);const u=new Be(h,this.meshBuilder.getTopLODMaterial());c.add(u)}if(l.dirtPositions.length>0){const h=new ct;h.setAttribute("position",new Ae(l.dirtPositions,3)),h.setAttribute("normal",new Ae(l.dirtNormals,3)),h.setAttribute("uv",new Ae(l.dirtUvs,2)),l.dirtSkyLight.length>0&&h.setAttribute("skyLight",new Ae(l.dirtSkyLight,1)),h.setIndex(l.dirtIndices);const u=new Be(h,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.waterPositions.length>0){const h=new ct;h.setAttribute("position",new Ae(l.waterPositions,3)),h.setAttribute("normal",new Ae(l.waterNormals,3)),h.setAttribute("uv",new Ae(l.waterUvs,2)),h.setIndex(l.waterIndices);const u=new Be(h,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}if(l.sidePositions.length>0){const h=new ct;h.setAttribute("position",new Ae(l.sidePositions,3)),h.setAttribute("normal",new Ae(l.sideNormals,3)),h.setAttribute("uv",new Ae(l.sideUvs,2)),l.sideSkyLight.length>0&&h.setAttribute("skyLight",new Ae(l.sideSkyLight,1)),h.setIndex(l.sideIndices);const u=new Be(h,this.meshBuilder.getSideLODMaterial());c.add(u)}if(l.waterSidePositions.length>0){const h=new ct;h.setAttribute("position",new Ae(l.waterSidePositions,3)),h.setAttribute("normal",new Ae(l.waterSideNormals,3)),h.setAttribute("uv",new Ae(l.waterSideUvs,2)),h.setIndex(l.waterSideIndices);const u=new Be(h,this.meshBuilder.getWaterLODMaterial());u.renderOrder=-2,c.add(u)}a.add(c)}a.position.copy(this.center),a.renderOrder=-1,this.scene.add(a),this.lodMesh=a,me.end("Planet.rebuildLODMesh.createMeshes"),this.currentLODExcludedTileCount=this.cachedNearbyTiles.size,this.needsLODRebuild=!1,me.end("Planet.rebuildLODMesh")}generateTerrain(){const e=this.config.hasWater!==!1&&!this.config.texturePath,t=new Map;for(const n of this.polyhedron.tiles){const i=this.getHeightVariation(n.center);t.set(n.index,i)}for(const n of this.polyhedron.tiles){const i=[],r=t.get(n.index)??this.SEA_LEVEL;for(let l=0;l<this.MAX_DEPTH;l++)l<r?i.push(H.AIR):l===r?e&&r>this.SEA_LEVEL?i.push(H.DIRT):i.push(H.GRASS):l<r+3?i.push(H.DIRT):i.push(H.STONE);const a=new pi(n.center.clone().add(this.center),this.BLOCK_HEIGHT*this.MAX_DEPTH),o={tile:n,blocks:i,isDirty:!0,boundingSphere:a};this.columns.set(n.index,o)}e&&this.fillOceans()}fillOceans(){for(const[e,t]of this.columns){let n=this.MAX_DEPTH;for(let i=0;i<t.blocks.length;i++)if(t.blocks[i]!==H.AIR){n=i;break}if(n>this.SEA_LEVEL){for(let i=this.SEA_LEVEL;i<n;i++)t.blocks[i]===H.AIR&&(t.blocks[i]=H.WATER);t.isDirty=!0}}}updateBoundingSpheres(){for(const e of this.columns.values())e.boundingSphere.center.copy(e.tile.center).add(this.center);this.lodMesh&&this.lodMesh.position.copy(this.center),this.boundaryWallsGroup&&this.boundaryWallsGroup.position.copy(this.center),this.batchedMeshGroup&&this.batchedMeshGroup.position.copy(this.center),this.updateLODChunkBounds(),this.meshBuilder.setPlanetCenter(this.center),this.updateDistantLODPositions()}updateLODChunkBounds(){const e=(1+Math.sqrt(5))/2,t=[new I(-1,e,0).normalize(),new I(1,e,0).normalize(),new I(-1,-e,0).normalize(),new I(1,-e,0).normalize(),new I(0,-1,e).normalize(),new I(0,1,e).normalize(),new I(0,-1,-e).normalize(),new I(0,1,-e).normalize(),new I(e,0,-1).normalize(),new I(e,0,1).normalize(),new I(-e,0,-1).normalize(),new I(-e,0,1).normalize()];for(let n=0;n<this.lodChunkBounds.length;n++){const i=t[n].clone().multiplyScalar(this.radius).add(this.center);this.lodChunkBounds[n].center.copy(i)}}getHeightVariation(e){const t=this.config.heightVariation??1,n=e.clone().normalize(),i=V.TERRAIN_CONTINENT_SCALE,r=V.TERRAIN_MOUNTAIN_SCALE,a=V.TERRAIN_DETAIL_SCALE,o=this.fractalSimplex3D(n.x,n.y,n.z,i,6,.5,2),l=Math.sign(o)*Math.pow(Math.abs(o),.8),c=this.ridgeSimplex3D(n.x,n.y,n.z,r,4,.5,2.2),h=Math.max(0,l),u=c*h*V.TERRAIN_MOUNTAIN_HEIGHT,d=this.fractalSimplex3D(n.x,n.y,n.z,V.TERRAIN_HILL_SCALE,3,.5,2),f=this.fractalSimplex3D(n.x,n.y,n.z,a,2,.5,2);let g=l*V.TERRAIN_CONTINENT_WEIGHT;g+=u,g+=d*V.TERRAIN_HILL_WEIGHT*(h>.1?1:.3),g+=f*V.TERRAIN_DETAIL_WEIGHT;let x;if(g>=0){const m=g*this.MAX_HEIGHT*t;x=this.SEA_LEVEL-m}else{const p=Math.pow(Math.abs(g),V.TERRAIN_OCEAN_DEPTH_POWER)*V.TERRAIN_MAX_DEPTH*t;x=this.SEA_LEVEL+p}return Math.max(0,Math.min(this.MAX_DEPTH-1,Math.round(x)))}simplex3D(e,t,n){const i=.3333333333333333,r=1/6;e+=this.seed*.1,t+=this.seed*.13,n+=this.seed*.17;const a=(e+t+n)*i,o=Math.floor(e+a),l=Math.floor(t+a),c=Math.floor(n+a),h=(o+l+c)*r,u=o-h,d=l-h,f=c-h,g=e-u,x=t-d,m=n-f;let p,y,M,T,R,b;g>=x?x>=m?(p=1,y=0,M=0,T=1,R=1,b=0):g>=m?(p=1,y=0,M=0,T=1,R=0,b=1):(p=0,y=0,M=1,T=1,R=0,b=1):x<m?(p=0,y=0,M=1,T=0,R=1,b=1):g<m?(p=0,y=1,M=0,T=0,R=1,b=1):(p=0,y=1,M=0,T=1,R=1,b=0);const A=g-p+r,w=x-y+r,_=m-M+r,v=g-T+2*r,C=x-R+2*r,L=m-b+2*r,N=g-1+3*r,O=x-1+3*r,z=m-1+3*r;let W=0,ee=0,X=0,te=0,ne=.6-g*g-x*x-m*m;ne>=0&&(ne*=ne,W=ne*ne*this.grad3D(o,l,c,g,x,m));let se=.6-A*A-w*w-_*_;se>=0&&(se*=se,ee=se*se*this.grad3D(o+p,l+y,c+M,A,w,_));let Pe=.6-v*v-C*C-L*L;Pe>=0&&(Pe*=Pe,X=Pe*Pe*this.grad3D(o+T,l+R,c+b,v,C,L));let Ge=.6-N*N-O*O-z*z;return Ge>=0&&(Ge*=Ge,te=Ge*Ge*this.grad3D(o+1,l+1,c+1,N,O,z)),32*(W+ee+X+te)}grad3D(e,t,n,i,r,a){const o=this.hash3D(e,t,n)&15,c=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]][o];return c[0]*i+c[1]*r+c[2]*a}fractalSimplex3D(e,t,n,i,r,a,o){let l=0,c=1,h=i,u=0;for(let d=0;d<r;d++)l+=this.simplex3D(e*h,t*h,n*h)*c,u+=c,c*=a,h*=o;return l/u}ridgeSimplex3D(e,t,n,i,r,a,o){let l=0,c=1,h=i,u=0;for(let d=0;d<r;d++){const f=this.simplex3D(e*h,t*h,n*h),g=1-Math.abs(f);l+=g*g*c,u+=c,c*=a,h*=o}return l/u}hash3D(e,t,n){const i=this.seed;let r=e*374761393+t*668265263+n*1274126177+i|0;return r=(r^r>>13)*1274126177|0,r^r>>16}update(e,t){me.begin("Planet.frustum"),this.projScreenMatrix.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.projScreenMatrix),me.end("Planet.frustum");const n=t.position.x-this.center.x,i=t.position.y-this.center.y,r=t.position.z-this.center.z,a=Math.sqrt(n*n+i*i+r*r);a>0&&(this.cachedCameraDir.x=n/a,this.cachedCameraDir.y=i/a,this.cachedCameraDir.z=r/a);const o=e.distanceTo(this.center),l=o-this.radius,c=this.getDistantLODLevel(o);if(c>=0){this.setDistantLODVisible(c),this.lodMesh&&(this.lodMesh.visible=!1),this.lodWaterMesh&&(this.lodWaterMesh.visible=!1),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!1);return}else this.setDistantLODVisible(-1),this.boundaryWallsGroup&&(this.boundaryWallsGroup.visible=!0);if(l>V.TERRAIN_LOD_SWITCH_ALTITUDE){this.cachedNearbyTiles.size>0&&(this.cachedNearbyTiles.clear(),this.bufferCenterTiles.clear(),this.needsLODRebuild=!0),this.needsLODRebuild&&!this.isLODWorkerBuildActive&&this.rebuildLODMesh();const y=this.currentLODExcludedTileCount===0;this.lodMesh&&(this.lodMesh.visible=!0),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!y);return}this.lodMesh&&(this.lodMesh.visible=!0,this.cullLODChunks()),this.lodWaterMesh&&(this.lodWaterMesh.visible=!0),this.batchedMeshGroup&&(this.batchedMeshGroup.visible=!0);const h=Math.min(1,Math.max(0,l/100)),u=V.TERRAIN_MIN_RENDER_DISTANCE,d=V.TERRAIN_MAX_RENDER_DISTANCE,f=Math.floor(u+h*(d-u));me.begin("Planet.getTile");const g=this.polyhedron.getTileAtPoint(e.clone().sub(this.center));if(me.end("Planet.getTile"),!g)return;const x=g.index;this.isIncrementalRebuildActive&&(me.begin("Planet.incrementalRebuild"),this.processIncrementalRebuild(),me.end("Planet.incrementalRebuild"));const m=V.TERRAIN_BUFFER_ZONE;if(!this.bufferCenterTiles.has(x)||f!==this.cachedRenderDistance){me.begin("Planet.tilesInRange");const y=this.getTilesInRange(x,f),M=[],T=[];for(const R of y)this.cachedNearbyTiles.has(R)||M.push(R);for(const R of this.cachedNearbyTiles)y.has(R)||T.push(R);if(this.bufferCenterTiles=this.getTilesInRange(x,m),this.cachedRenderDistance=f,M.length>0||T.length>0){this.cachedNearbyTiles=y;const R=this.polyhedron.tiles[x].center;M.sort((b,A)=>{const w=this.polyhedron.tiles[b].center.distanceToSquared(R);return this.polyhedron.tiles[A].center.distanceToSquared(R)-w}),T.sort((b,A)=>{const w=this.polyhedron.tiles[b].center.distanceToSquared(R),_=this.polyhedron.tiles[A].center.distanceToSquared(R);return w-_}),this.pendingTilesToAdd.push(...M),this.pendingTilesToRemove.push(...T),this.isIncrementalRebuildActive=!0,this.needsRebatch=!0,this.needsLODRebuild=!0,me.begin("Planet.boundaryWalls"),this.rebuildBoundaryWalls(),me.end("Planet.boundaryWalls")}me.end("Planet.tilesInRange")}this.dirtyColumnsQueue.size>0&&(me.begin("Planet.dirtyRebatch"),this.rebuildDirtyColumns(),me.end("Planet.dirtyRebatch")),this.needsRebatch&&!this.isWorkerBuildActive&&(this.geometryWorker?(me.begin("Planet.startWorkerBuild"),this.startWorkerBuild(),me.end("Planet.startWorkerBuild")):(me.begin("Planet.rebatch"),this.rebuildBatchedMeshes(),me.end("Planet.rebatch"))),this.needsLODRebuild&&!this.isWorkerBuildActive&&!this.isLODWorkerBuildActive&&!this.isLODRebuildScheduled&&(this.isLODRebuildScheduled=!0,(window.requestIdleCallback||(M=>setTimeout(M,0)))(()=>{this.needsLODRebuild&&!this.isLODWorkerBuildActive&&(me.begin("Planet.LODRebuild"),this.rebuildLODMesh(),me.end("Planet.LODRebuild")),this.isLODRebuildScheduled=!1})),this.needsWaterWallsRebuild&&!this.isWorkerBuildActive&&!this.isWaterWallsScheduled&&(this.isWaterWallsScheduled=!0,(window.requestIdleCallback||(M=>setTimeout(M,0)))(()=>{this.needsWaterWallsRebuild&&(me.begin("Planet.waterWalls"),this.buildWaterBoundaryWalls(),me.end("Planet.waterWalls"),this.needsWaterWallsRebuild=!1),this.isWaterWallsScheduled=!1}))}processIncrementalRebuild(){const e=V.TERRAIN_TILES_PER_FRAME;let t=0;for(;this.pendingTilesToRemove.length>0&&t<e;)this.pendingTilesToRemove.pop(),t++;for(;this.pendingTilesToAdd.length>0&&t<e;)this.pendingTilesToAdd.pop(),t++;this.pendingTilesToAdd.length===0&&this.pendingTilesToRemove.length===0&&(this.isIncrementalRebuildActive=!1,this.needsRebatch=!0)}rebuildBatchedMeshes(){if(!this.batchedMeshGroup)return;for(;this.batchedMeshGroup.children.length>0;){const o=this.batchedMeshGroup.children[0];o.geometry&&o.geometry.dispose(),this.batchedMeshGroup.remove(o)}const e=Qt(),t=Qt(),n=Qt(),i=Qt(),r=Qt();for(const o of this.cachedNearbyTiles){const l=this.columns.get(o);l&&this.frustum.intersectsSphere(l.boundingSphere)&&(this.buildColumnGeometry(l,e,t,n,i,r),l.isDirty=!1)}if(e.positions.length>0){const o=this.createBufferGeometry(e);this.topMesh=new Be(o,this.meshBuilder.getTopMaterial()),this.batchedMeshGroup.add(this.topMesh)}if(t.positions.length>0){const o=this.createBufferGeometry(t);this.sideMesh=new Be(o,this.meshBuilder.getSideMaterial()),this.batchedMeshGroup.add(this.sideMesh)}if(n.positions.length>0){const o=this.createBufferGeometry(n);this.grassSideMesh=new Be(o,this.meshBuilder.getGrassSideMaterial()),this.batchedMeshGroup.add(this.grassSideMesh)}if(i.positions.length>0){const o=this.createBufferGeometry(i);this.stoneMesh=new Be(o,this.meshBuilder.getStoneMaterial()),this.batchedMeshGroup.add(this.stoneMesh)}if(r.positions.length>0){const o=this.createBufferGeometry(r);this.waterMesh=new Be(o,this.meshBuilder.getWaterMaterial()),this.waterMesh.renderOrder=1,this.batchedMeshGroup.add(this.waterMesh)}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.needsRebatch=!1}buildColumnGeometry(e,t,n,i,r,a){let o=0;for(let l=0;l<e.blocks.length;l++)if(e.blocks[l]!==H.AIR&&e.blocks[l]!==H.WATER){o=l;break}for(let l=0;l<e.blocks.length;l++){const c=e.blocks[l];if(c===H.AIR)continue;const h=c===H.WATER,u=l===0?H.AIR:e.blocks[l-1],d=l>=e.blocks.length-1?H.AIR:e.blocks[l+1],f=u===H.AIR||!h&&u===H.WATER,g=d===H.AIR||!h&&d===H.WATER;if(h&&u!==H.AIR)continue;const x=this.hasExposedSide(e,l);if(!h&&!f&&!g&&!x)continue;let m=this.radius-l*this.BLOCK_HEIGHT,p=m-this.BLOCK_HEIGHT;if(h&&(m-=V.WATER_SURFACE_OFFSET,p-=V.WATER_SURFACE_OFFSET),p<=0)continue;const y=l-o,M=c===H.STONE,T=c===H.DIRT,R=.8,b=.05;let A=1;y>0&&(A=Math.max(b,Math.pow(R,y)));const{top:w,bottom:_,sides:v}=this.meshBuilder.createSeparateGeometries(e.tile,p,m,new I(0,0,0),h?!0:f,h?!1:g,h?!1:x);if(w){const C=w.getAttribute("position"),L=w.getAttribute("normal"),N=w.getAttribute("uv"),O=w.getIndex();C&&L&&N&&O&&(h?this.mergeGeometry(a,C,L,N,O,this.sunDirection,1):M?this.mergeGeometry(r,C,L,N,O,this.sunDirection,A):T?this.mergeGeometry(n,C,L,N,O,this.sunDirection,A):this.mergeGeometry(t,C,L,N,O,this.sunDirection,A)),w.dispose()}if(_&&!h){const C=_.getAttribute("position"),L=_.getAttribute("normal"),N=_.getAttribute("uv"),O=_.getIndex();if(C&&L&&N&&O){const z=Math.max(b,A*R);M?this.mergeGeometry(r,C,L,N,O,this.sunDirection,z):this.mergeGeometry(n,C,L,N,O,this.sunDirection,z)}_.dispose()}if(v){const C=v.getAttribute("position"),L=v.getAttribute("normal"),N=v.getAttribute("uv"),O=v.getIndex();C&&L&&N&&O&&(M?this.mergeGeometry(r,C,L,N,O,this.sunDirection,A):T?this.mergeGeometry(n,C,L,N,O,this.sunDirection,A):this.mergeGeometry(i,C,L,N,O,this.sunDirection,A)),v.dispose()}h&&this.buildWaterSideFaces(e,l,p,m,a)}}updateWaterShader(e,t=!1){this.meshBuilder.updateWaterShader(e,this.center,t),this.meshBuilder.setTerrainUnderwater(t)}setSunDirection(e){this.meshBuilder.setSunDirection(e)}getWaterShaderMaterial(){return this.meshBuilder.getWaterShaderMaterial()}getTilesInRange(e,t){const n=new Set,i=new Set,r=[{index:e,distance:0}];let a=0;for(;a<r.length;){const o=r[a++];if(!i.has(o.index)&&(i.add(o.index),o.distance<=t)){n.add(o.index);const l=this.polyhedron.tiles[o.index];for(const c of l.neighbors)i.has(c)||r.push({index:c,distance:o.distance+1})}}return n}rebuildBoundaryWalls(){if(this.boundaryWallsGroup)for(;this.boundaryWallsGroup.children.length>0;){const e=this.boundaryWallsGroup.children[0];e instanceof Be&&e.geometry.dispose(),this.boundaryWallsGroup.remove(e)}}mergeGeometry(e,t,n,i,r,a,o=1){for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),u=t.getZ(l),d=n.getX(l),f=n.getY(l),g=n.getZ(l);e.positions.push(c,h,u),e.normals.push(d,f,g),e.uvs.push(i.getX(l),i.getY(l)),e.skyLight.push(o);{const x=Math.sqrt(c*c+h*h+u*u);let m=1;if(x>0){const p=c/x,y=h/x,M=u/x,T=p*a.x+y*a.y+M*a.z;m=Math.max(.2,T*.5+.5)}e.colors.push(m,m,m)}}for(let l=0;l<r.count;l++)e.indices.push(r.getX(l)+e.vertexOffset);e.vertexOffset+=t.count}createBufferGeometry(e){const t=new ct;return t.setAttribute("position",new Ae(e.positions,3)),t.setAttribute("normal",new Ae(e.normals,3)),t.setAttribute("uv",new Ae(e.uvs,2)),e.colors.length>0&&t.setAttribute("color",new Ae(e.colors,3)),e.skyLight.length>0&&t.setAttribute("skyLight",new Ae(e.skyLight,1)),t.setIndex(e.indices),t.computeBoundingSphere(),t}hasExposedSide(e,t){const n=e.blocks[t],i=this.meshBuilder.isSolid(n);for(const r of e.tile.neighbors){const a=this.columns.get(r);if(a&&t<a.blocks.length){const o=a.blocks[t];if(i&&(o===H.AIR||o===H.WATER)||n===H.WATER&&o===H.AIR)return!0}}return!1}buildWaterSideFaces(e,t,n,i,r){const a=e.tile,o=a.vertices.length,l=.001;for(let c=0;c<o;c++){const h=(c+1)%o,u=a.vertices[c],d=a.vertices[h];let f;for(const N of a.neighbors){const O=this.columns.get(N);if(!O)continue;const z=O.tile;let W=!1,ee=!1;for(const X of z.vertices)X.distanceTo(u)<l&&(W=!0),X.distanceTo(d)<l&&(ee=!0);if(W&&ee){f=O;break}}if(!f||f.blocks[t]!==H.AIR)continue;let g=t+1;for(let N=t+1;N<e.blocks.length;N++){const O=e.blocks[N];if(O!==H.AIR&&O!==H.WATER){g=N;break}}let x=t+1;for(let N=t+1;N<f.blocks.length;N++){const O=f.blocks[N];if(O!==H.AIR&&O!==H.WATER){x=N;break}else if(O===H.AIR)x=N+1;else break}const m=Math.min(g,x),p=i,y=this.radius-m*this.BLOCK_HEIGHT;if(y>=p)continue;const M=u.clone().normalize(),T=d.clone().normalize(),R=M.clone().multiplyScalar(p),b=T.clone().multiplyScalar(p),A=M.clone().multiplyScalar(y),w=T.clone().multiplyScalar(y),_=w.clone().sub(A),v=R.clone().sub(A),C=_.clone().cross(v).normalize(),L=r.vertexOffset;r.positions.push(A.x,A.y,A.z,w.x,w.y,w.z,b.x,b.y,b.z,R.x,R.y,R.z);for(let N=0;N<4;N++)r.normals.push(C.x,C.y,C.z);r.uvs.push(0,0,1,0,1,1,0,1),r.skyLight.push(1,1,1,1),r.colors.push(1,1,1,1,1,1,1,1,1,1,1,1),r.indices.push(L,L+1,L+2,L,L+2,L+3),r.vertexOffset+=4}}getBlock(e,t){const n=this.columns.get(e);return!n||t<0||t>=n.blocks.length?H.AIR:n.blocks[t]}setBlock(e,t,n){const i=this.columns.get(e);if(!i||t<0||t>=i.blocks.length)return;const r=i.blocks[t];i.blocks[t]=n,i.isDirty=!0;for(const o of i.tile.neighbors){const l=this.columns.get(o);l&&(l.isDirty=!0)}let a=0;for(let o=0;o<i.blocks.length;o++)if(i.blocks[o]!==H.AIR&&i.blocks[o]!==H.WATER){a=o;break}t<=a+2&&(this.needsLODRebuild=!0),this.queueDirtyColumnRebuild(e);for(const o of i.tile.neighbors)this.cachedNearbyTiles.has(o)&&this.queueDirtyColumnRebuild(o);this.meshBuilder.isSolid(r)&&n===H.AIR&&this.simulateWaterFlow(e,t)}queueDirtyColumnRebuild(e){this.cachedNearbyTiles.has(e)&&this.dirtyColumnsQueue.add(e)}rebuildDirtyColumns(){if(!this.batchedMeshGroup||this.dirtyColumnsQueue.size===0)return;if(this.dirtyColumnsQueue.size>20){this.needsRebatch=!0,this.dirtyColumnsQueue.clear();return}for(;this.batchedMeshGroup.children.length>0;){const o=this.batchedMeshGroup.children[0];o.geometry&&o.geometry.dispose(),this.batchedMeshGroup.remove(o)}const e=Qt(),t=Qt(),n=Qt(),i=Qt(),r=Qt();for(const o of this.cachedNearbyTiles){const l=this.columns.get(o);l&&(this.buildColumnGeometry(l,e,t,n,i,r),l.isDirty=!1)}if(e.positions.length>0){const o=this.createBufferGeometry(e);this.topMesh=new Be(o,this.meshBuilder.getTopMaterial()),this.batchedMeshGroup.add(this.topMesh)}if(t.positions.length>0){const o=this.createBufferGeometry(t);this.sideMesh=new Be(o,this.meshBuilder.getSideMaterial()),this.batchedMeshGroup.add(this.sideMesh)}if(n.positions.length>0){const o=this.createBufferGeometry(n);this.grassSideMesh=new Be(o,this.meshBuilder.getGrassSideMaterial()),this.batchedMeshGroup.add(this.grassSideMesh)}if(i.positions.length>0){const o=this.createBufferGeometry(i);this.stoneMesh=new Be(o,this.meshBuilder.getStoneMaterial()),this.batchedMeshGroup.add(this.stoneMesh)}if(r.positions.length>0){const o=this.createBufferGeometry(r);this.waterMesh=new Be(o,this.meshBuilder.getWaterMaterial()),this.waterMesh.renderOrder=1,this.batchedMeshGroup.add(this.waterMesh)}this.config.hasWater!==!1&&!this.config.texturePath&&(this.needsWaterWallsRebuild=!0),this.dirtyColumnsQueue.clear()}buildWaterBoundaryWalls(){if(!this.batchedMeshGroup)return;const e=Qt(),t=this.radius-this.SEA_LEVEL*this.BLOCK_HEIGHT-V.WATER_SURFACE_OFFSET;for(const n of this.cachedNearbyTiles){const i=this.columns.get(n);if(!i)continue;const r=i.tile;for(let a=0;a<r.vertices.length;a++){const o=(a+1)%r.vertices.length,l=r.vertices[a],c=r.vertices[o],h=l.clone().add(c).normalize();let u,d=1/0;for(const _ of r.neighbors){const v=this.columns.get(_);if(!v)continue;const C=v.tile.center.clone().normalize().distanceToSquared(h);C<d&&(d=C,u=_)}if(u===void 0||this.cachedNearbyTiles.has(u))continue;let f=this.SEA_LEVEL;for(let _=0;_<i.blocks.length;_++)if(i.blocks[_]!==H.AIR&&i.blocks[_]!==H.WATER){f=_;break}if(f<=this.SEA_LEVEL)continue;const x=this.radius-f*this.BLOCK_HEIGHT,m=t;if(x>=m)continue;const p=l.clone().normalize().multiplyScalar(x),y=c.clone().normalize().multiplyScalar(x),M=c.clone().normalize().multiplyScalar(m),T=l.clone().normalize().multiplyScalar(m),R=y.clone().sub(p),b=T.clone().sub(p),A=R.clone().cross(b).normalize(),w=e.vertexOffset;e.positions.push(p.x,p.y,p.z,y.x,y.y,y.z,M.x,M.y,M.z,T.x,T.y,T.z);for(let _=0;_<4;_++)e.normals.push(A.x,A.y,A.z);e.uvs.push(0,0,1,0,1,1,0,1),e.indices.push(w,w+1,w+2),e.indices.push(w,w+2,w+3),e.vertexOffset+=4}}if(e.positions.length>0){const n=this.createBufferGeometry(e),i=this.meshBuilder.getSeaWallMaterial();if(i){const r=new Be(n,i);r.renderOrder=2,this.batchedMeshGroup.add(r)}}}simulateWaterFlow(e,t){const n=this.columns.get(e);if(!n)return;let i=!1;t>0&&n.blocks[t-1]===H.WATER&&(i=!0);for(const r of n.tile.neighbors){const a=this.columns.get(r);a&&a.blocks[t]===H.WATER&&(i=!0)}i&&this.rebalanceWaterBasin(e,t)}rebalanceWaterBasin(e,t){const n=new Set,i=[{tileIndex:e,depth:t}],r=[],a=500;for(;i.length>0;){const{tileIndex:u,depth:d}=i.shift(),f=`${u}-${d}`;if(n.has(f))continue;if(n.add(f),n.size>a)return;const g=this.columns.get(u);if(!g||d<0||d>=g.blocks.length)continue;const x=g.blocks[d];if(!(x!==H.AIR&&x!==H.WATER)){if(r.push({tileIndex:u,depth:d,isWater:x===H.WATER}),d>0){const m=g.blocks[d-1];(m===H.AIR||m===H.WATER)&&i.push({tileIndex:u,depth:d-1})}if(d<g.blocks.length-1){const m=g.blocks[d+1];(m===H.AIR||m===H.WATER)&&i.push({tileIndex:u,depth:d+1})}for(const m of g.tile.neighbors){const p=this.columns.get(m);if(p){const y=p.blocks[d];(y===H.AIR||y===H.WATER)&&i.push({tileIndex:m,depth:d})}}}}const o=r.filter(u=>u.isWater).length;if(o===0)return;r.sort((u,d)=>d.depth-u.depth);let l=o;const c=[],h=[];for(const u of r)l>0?(c.push(u),l--):h.push(u);for(const u of c){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===H.AIR){d.blocks[u.depth]=H.WATER,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const g=this.columns.get(f);g&&(g.isDirty=!0)}}}for(const u of h){const d=this.columns.get(u.tileIndex);if(d&&d.blocks[u.depth]===H.WATER){d.blocks[u.depth]=H.AIR,d.isDirty=!0,this.needsRebatch=!0;for(const f of d.tile.neighbors){const g=this.columns.get(f);g&&(g.isDirty=!0)}}}}getTileAtPoint(e){return this.polyhedron.getTileAtPoint(e.clone().sub(this.center))}getDepthAtPoint(e){const t=e.distanceTo(this.center);return Math.floor((this.radius-t)/this.BLOCK_HEIGHT)}getSurfacePosition(e){const t=this.columns.get(e.index);if(!t)return e.center.clone().add(this.center);for(let n=0;n<t.blocks.length;n++)if(t.blocks[n]!==H.AIR){const i=this.radius-n*this.BLOCK_HEIGHT;return e.center.clone().normalize().multiplyScalar(i).add(this.center)}return e.center.clone().add(this.center)}getGravityDirection(e){return this.center.clone().sub(e).normalize()}getSurfaceNormal(e){return e.clone().sub(this.center).normalize()}getSurfaceHeightInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return this.radius;const n=this.columns.get(t.index);if(!n)return this.radius;for(let i=0;i<n.blocks.length;i++){const r=n.blocks[i];if(r!==H.AIR&&r!==H.WATER)return this.radius-i*this.BLOCK_HEIGHT}return this.radius}isUnderwaterInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;for(let i=0;i<n.blocks.length;i++){const r=n.blocks[i];if(r===H.WATER)return!0;if(r!==H.AIR)return!1}return!1}getPolyhedron(){return this.polyhedron}getTileByIndex(e){return this.polyhedron.tiles[e]||null}getBlockHeight(){return this.BLOCK_HEIGHT}getMaxDepth(){return this.MAX_DEPTH}getTileIndexInDirection(e){const t=this.polyhedron.getTileAtPoint(e.clone().multiplyScalar(this.radius));return t?t.index:null}getVisibleTileIndices(){return this.cachedNearbyTiles}getVisibleTileIndicesWithBorder(){const e=new Set(this.cachedNearbyTiles);for(const t of this.cachedNearbyTiles){const n=this.polyhedron.tiles[t];if(n)for(const i of n.neighbors)e.add(i)}return e}isInWater(e){const t=this.getTileAtPoint(e);if(!t)return!1;const n=this.columns.get(t.index);if(!n)return!1;let i=-1;for(let a=0;a<n.blocks.length;a++)if(n.blocks[a]===H.WATER){i=a;break}return i<0?!1:this.getDepthAtPoint(e)>=i}getWaterDepth(e){const t=this.getTileAtPoint(e);if(!t)return 0;const n=this.columns.get(t.index);if(!n)return 0;const i=this.getDepthAtPoint(e);let r=-1;for(let a=0;a<n.blocks.length;a++)if(n.blocks[a]===H.WATER){r=a;break}return r<0?0:i>=r?(i-r+1)*this.BLOCK_HEIGHT:0}getWaterSurfaceRadius(e){const t=this.getTileAtPoint(e);if(!t)return-1;const n=this.columns.get(t.index);if(!n)return-1;let i=-1;for(let r=0;r<n.blocks.length;r++)if(n.blocks[r]===H.WATER){i=r;break}return i<0?-1:this.radius-i}buildAllMeshes(){this.needsRebatch=!0}raycast(e,t,n,i=!1){const a=t.clone().normalize(),o=e.clone(),l=this.getTileAtPoint(e);if(!l)return null;let c=l,h=l,u=this.getDepthAtPoint(e);for(let d=0;d<n;d+=.2){o.copy(e).addScaledVector(a,d);const f=this.polyhedron.getTileAtPointFromHint(o.clone().sub(this.center),c),g=this.getDepthAtPoint(o);if(g<0||g>=this.MAX_DEPTH){h=c,u=g,c=f;continue}const x=this.getBlock(f.index,g);if(x===H.AIR){h=f,u=g,c=f;continue}if(x===H.WATER&&!i){h=f,u=g,c=f;continue}const m=o.clone().sub(this.center).normalize();return{tileIndex:f.index,depth:g,blockType:x,point:o.clone(),normal:m,prevTileIndex:h.index,prevDepth:u}}return null}getBatchedMeshGroup(){return this.batchedMeshGroup}getDistantLODLevel(e){return e>=V.PLANET_LOD_DISTANCE_3?2:e>=V.PLANET_LOD_DISTANCE_2?1:e>=V.PLANET_LOD_DISTANCE_1?0:-1}setDistantLODVisible(e){if(this.currentDistantLODLevel!==e){for(let t=0;t<this.distantLODMeshes.length;t++)this.distantLODMeshes[t].visible=t===e;this.currentDistantLODLevel=e}}updateDistantLODPositions(){for(const e of this.distantLODMeshes)e.position.copy(this.center)}}const _t=V.TERRAIN_SEA_LEVEL+V.TERRAIN_MAX_DEPTH;let vs=new Map,Ua=null;function St(s,e,t){s!==Ua&&(vs.clear(),Ua=s);let n=vs.get(e);if(!n){n=new Array(_t);for(let i=0;i<_t;i++)n[i]=s.getBlock(e,i);vs.set(e,n)}return t>=0&&t<_t?n[t]:H.AIR}function em(){vs.clear()}function fs(s,e,t){let n=-1,i=1/0;for(let r=0;r<_t;r++){const a=r>0?St(s,e,r-1):H.AIR,o=St(s,e,r),l=a===H.AIR||a===H.WATER,c=o!==H.AIR&&o!==H.WATER;if(l&&c){const h=s.radius-r,u=Math.abs(h-t);u<i&&(i=u,n=r)}}return n}class tm{constructor(e,t,n){F(this,"camera");F(this,"position");F(this,"velocity");F(this,"inputManager");F(this,"planets",[]);F(this,"currentPlanet",null);F(this,"localUp",new I(0,1,0));F(this,"localForward",new I(0,0,-1));F(this,"localRight",new I(1,0,0));F(this,"orientation",new ln);F(this,"isInSpace",!1);F(this,"transitionTimer",0);F(this,"isGrounded",!1);F(this,"isJetpacking",!1);F(this,"isInWater",!1);F(this,"feetInWater",!1);F(this,"isFloatingAtSurface",!1);F(this,"hasDoubleJumped",!1);F(this,"jetpackEnabled",!0);F(this,"lastPosition",new I);F(this,"stuckFrameCount",0);F(this,"wasdActiveFrames",0);F(this,"lastStuckLogTime",0);F(this,"jumpStartPosition",null);F(this,"jumpStartSpherical",null);F(this,"wasdPressedDuringJump",!1);F(this,"jumpDirection",null);F(this,"didJumpThisFrame",!1);F(this,"lastCaveLogTime",0);this.camera=e,this.inputManager=t,this.addPlanet(n),this.currentPlanet=n,this.velocity=new I;const i=new I(0,1,0),r=n.getSurfaceHeightInDirection(i);this.position=new I(0,r+1,0),this.updateLocalOrientation(),this.updateOrientationFromLocal()}addPlanet(e,t){this.planets.push({planet:e,gravityFullRadius:t==null?void 0:t.gravityFullRadius,gravityFalloffRadius:t==null?void 0:t.gravityFalloffRadius,gravityStrength:t==null?void 0:t.gravityStrength})}updateOrientationFromLocal(){const e=new ht;e.makeBasis(this.localRight,this.localUp,this.localForward.clone().negate()),this.orientation.setFromRotationMatrix(e)}updateLocalFromOrientation(){const e=new ht().makeRotationFromQuaternion(this.orientation);this.localRight.setFromMatrixColumn(e,0),this.localUp.setFromMatrixColumn(e,1),this.localForward.setFromMatrixColumn(e,2).negate()}updateLocalOrientation(){if(!this.currentPlanet)return;this.localUp=this.currentPlanet.getSurfaceNormal(this.position);const e=this.localForward.clone();e.sub(this.localUp.clone().multiplyScalar(e.dot(this.localUp))),e.lengthSq()>.001?this.localForward=e.normalize():(this.localForward=new I(1,0,0),this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp))),this.localForward.normalize()),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localForward=new I().crossVectors(this.localUp,this.localRight).normalize()}getAltitudeFromPlanet(e){return this.position.distanceTo(e.center)-e.radius}positionToSpherical(e,t){const n=e.clone().sub(t.center),i=n.length(),r=Math.atan2(n.x,n.z),a=Math.acos(n.y/i);return{theta:r,phi:a,radius:i}}checkJumpDrift(){if(!this.jumpStartPosition||!this.jumpStartSpherical||!this.currentPlanet)return;if(this.wasdPressedDuringJump){this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null;return}const e=this.positionToSpherical(this.position,this.currentPlanet),t=(e.theta-this.jumpStartSpherical.theta)*(180/Math.PI),n=(e.phi-this.jumpStartSpherical.phi)*(180/Math.PI),i=this.jumpStartPosition.distanceTo(this.position);(Math.abs(t)>.01||Math.abs(n)>.01||i>.01)&&(console.log("=== JUMP DRIFT DETECTED ==="),console.log("Jump start position:",{x:this.jumpStartPosition.x.toFixed(4),y:this.jumpStartPosition.y.toFixed(4),z:this.jumpStartPosition.z.toFixed(4)}),console.log("Landing position:",{x:this.position.x.toFixed(4),y:this.position.y.toFixed(4),z:this.position.z.toFixed(4)}),console.log("Spherical drift:",{theta:t.toFixed(4)+"°",phi:n.toFixed(4)+"°"}),console.log("Arc distance:",i.toFixed(4)+" units"),console.log("===========================")),this.jumpStartPosition=null,this.jumpStartSpherical=null,this.jumpDirection=null}getAltitude(){return this.currentPlanet?this.getAltitudeFromPlanet(this.currentPlanet):1/0}findClosestPlanetAndGravity(){let e=null,t=0,n=1/0;for(const i of this.planets){const r=this.position.distanceTo(i.planet.center),a=r-i.planet.radius,o=i.gravityFullRadius??i.planet.radius*V.GRAVITY_FULL_RADIUS,l=i.gravityFalloffRadius??i.planet.radius*V.GRAVITY_FALLOFF_RADIUS,c=i.gravityStrength??1;if(r<l){let h=0;if(r<=o)h=1;else{const u=l-o,d=r-o;h=1-Math.min(1,d/u)}h*=c,h>t&&(t=h,e=i.planet,n=a)}}return{planet:e,gravityMultiplier:t,altitude:n}}getGravityMultiplier(){const{gravityMultiplier:e}=this.findClosestPlanetAndGravity();return e}update(e){if(em(),!this.inputManager.isLocked()){this.updateCamera();return}const t=this.inputManager.getState(),{planet:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity(),r=this.isInSpace;if(this.isInSpace=i===0,r&&!this.isInSpace&&n&&(this.transitionTimer=V.ROLL_SLERP_DURATION,this.currentPlanet=n),!r&&this.isInSpace&&(this.transitionTimer=0,this.updateOrientationFromLocal()),n&&!this.isInSpace&&(this.currentPlanet=n),this.isInSpace)this.handleSpaceMouseLook(t,e),this.handleSpaceMovement(t,e),this.handleSpaceRoll(t,e);else{this.handleSpaceMouseLook(t,e),this.transitionTimer>0?(this.transitionTimer-=e,this.slerpRollToLevel(e)):this.alignUpWithGravity();const a=this.currentPlanet?this.position.distanceTo(this.currentPlanet.center):0;if(this.didJumpThisFrame=!1,this.handleMovement(t,e),this.handleJetpack(t,e),this.applyGravity(e),this.currentPlanet&&t.forward&&!this.didJumpThisFrame){const o=this.position.distanceTo(this.currentPlanet.center),l=o-a;if(l>.5){const c=this.currentPlanet.getTileAtPoint(this.position);if(console.error("========== UNEXPECTED UPWARD TELEPORT =========="),console.error(`Radius change: ${a.toFixed(2)} -> ${o.toFixed(2)} (+${l.toFixed(2)})`),console.error(`Current tile: ${c==null?void 0:c.index}`),console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`),c){console.error("Block column at current tile:");for(let h=0;h<20;h++){const u=this.currentPlanet.getBlock(c.index,h),d=this.currentPlanet.radius-h;let f=u===0?".":u===4?"~":"#";const g=Math.abs(d-o)<1?" <-- PLAYER":"";console.error(`  d${h} (r${d}): ${f}${g}`)}}console.error("================================================")}}this.checkIfStuck(t),t.sprint&&this.inputManager.isKeyPressed("KeyX")&&this.logCaveStructure()}this.updateCamera(),this.updateUI()}checkIfStuck(e){const t=e.forward||e.backward||e.left||e.right,n=this.position.distanceTo(this.lastPosition)>.01;if(t){this.wasdActiveFrames++,n?this.stuckFrameCount=0:this.stuckFrameCount++;const i=Date.now();this.stuckFrameCount>30&&this.wasdActiveFrames>30&&i-this.lastStuckLogTime>2e3&&(this.lastStuckLogTime=i,this.logStuckDebugInfo())}else this.wasdActiveFrames=0,this.stuckFrameCount=0;this.lastPosition.copy(this.position)}logStuckDebugInfo(){if(!this.currentPlanet)return;console.log("========== STUCK DETECTED ==========");const e=this.position.distanceTo(this.currentPlanet.center),t=e+V.PLAYER_HEIGHT;console.log("Player State:"),console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`),console.log(`  Feet radius: ${e.toFixed(2)}`),console.log(`  Head radius: ${t.toFixed(2)}`),console.log(`  Is in water: ${this.isInWater}`),console.log(`  Is grounded: ${this.isGrounded}`),console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);const n=this.currentPlanet.getTileAtPoint(this.position);if(n){console.log(`
Current Tile:`),console.log(`  Index: ${n.index}`);let i=-1;for(let o=0;o<_t;o++){const l=this.currentPlanet.getBlock(n.index,o);if(l!==H.AIR&&l!==H.WATER){i=o;break}}const r=i>=0?this.currentPlanet.radius-i:0;console.log(`  Ground depth: ${i} (radius: ${r.toFixed(2)})`);const a=e-r;console.log(`  Player feet vs ground: ${a.toFixed(2)} (should be ~0 when grounded)`),console.log(`  In air (wall check skipped): ${a>V.PLAYER_HEIGHT+.5}`),console.log("  Blocks:");for(let o=0;o<8;o++){const l=this.currentPlanet.getBlock(n.index,o),c=H[l],h=this.currentPlanet.radius-o,u=h>e&&h<t?" [IN CAPSULE RANGE]":"";console.log(`    d=${o}: ${c} (r=${h.toFixed(1)})${u}`)}console.log(`
Neighbor Tiles:`);for(const o of n.neighbors){if(!this.currentPlanet.getPolyhedron().tiles[o])continue;let c=-1;for(let d=0;d<_t;d++){const f=this.currentPlanet.getBlock(o,d);if(f!==H.AIR&&f!==H.WATER){c=d;break}}const h=c>=0?this.currentPlanet.radius-c:0,u=h-r;console.log(`  Neighbor ${o}: ground_r=${h.toFixed(1)}, heightDiff=${u.toFixed(1)}`)}console.log(`
Collision Checks:`),console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`),console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`),console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`),console.log(`  checkCollision: ${this.checkCollision(this.position)}`)}console.log("====================================")}logCaveStructure(){const e=Date.now();if(e-this.lastCaveLogTime<1e3||(this.lastCaveLogTime=e,!this.currentPlanet))return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+V.PLAYER_HEIGHT;let r=-1;for(let w=0;w<_t;w++){const _=this.currentPlanet.getBlock(t.index,w);if(_!==H.AIR&&_!==H.WATER){r=w;break}}console.log("========== Hex STRUCTURE (Shift+X) =========="),console.log(`Player feet radius: ${n.toFixed(2)}, head radius: ${i.toFixed(2)}`),console.log(`Standing on tile ${t.index}, ground depth: ${r}`),console.log(`Planet radius: ${this.currentPlanet.radius}`),console.log("");const a=V.DEBUG_CAVE_TILE_RINGS,o=V.DEBUG_CAVE_DEPTH_ROWS,l=new Set([t.index]);let c=new Set([t.index]);for(let w=0;w<a;w++){const _=new Set;for(const v of c){const C=this.currentPlanet.getPolyhedron().tiles[v];if(C)for(const L of C.neighbors)l.has(L)||(l.add(L),_.add(L))}c=_}const h=Math.max(0,r-o+1),u=r+1;console.log(`Sampling ${l.size} tiles, depths ${h} to ${u}`),console.log("Legend: . = AIR, ~ = WATER, # = SOLID, @ = PLAYER BODY OVERLAP"),console.log("");const d=Array.from(l),f=["Depth/Radius"].concat(d.map(w=>`T${w}`));console.log(f.join("	"));for(let w=h;w<=u;w++){const _=this.currentPlanet.radius-w,v=_-1,C=_>n&&v<i,L=[`d${w} (r${_.toFixed(0)})`];for(const N of d){const O=this.currentPlanet.getBlock(N,w);let z="?";O===H.AIR?z=".":O===H.WATER?z="~":z="#",C&&N===t.index&&(z=z==="."?"@":z.toUpperCase()),L.push(z)}console.log(L.join("	"))}console.log("");const g=this.currentPlanet.radius-r;console.log(`Current ground depth: ${r} (r${g.toFixed(0)})`),console.log(""),console.log("Collision checks for neighbor tiles:");const x=this.currentPlanet.getPolyhedron().tiles[t.index];if(x)for(const w of x.neighbors){const _=this.currentPlanet.getPolyhedron().tiles[w];if(!_)continue;const v=[];for(let z=0;z<_t-1;z++){const W=z>0?this.currentPlanet.getBlock(w,z-1):H.AIR,ee=this.currentPlanet.getBlock(w,z),X=W===H.AIR||W===H.WATER,te=ee!==H.AIR&&ee!==H.WATER;X&&te&&v.push(z)}const C=new I(_.center.x,_.center.y,_.center.z).normalize().multiplyScalar(this.currentPlanet.radius),L=this.checkStepHeight(C),N=this.checkHeadroomCollision(C),O=this.checkWallCollision(C);console.log(`  T${w}: floors=[${v.join(",")}] step=${L} headroom=${N} wall=${O}`)}const m=this.localForward.clone().negate(),p=this.position.clone().addScaledVector(m,.5),y=this.currentPlanet.getTileAtPoint(p);console.log(""),console.log("Movement test (actual forward step):"),console.log(`  Move direction: (${m.x.toFixed(2)}, ${m.y.toFixed(2)}, ${m.z.toFixed(2)})`),console.log(`  Test position tile: ${y?y.index:"none"} (same=${(y==null?void 0:y.index)===t.index})`);const M=this.checkCollision(p),T=this.checkStepHeight(p),R=this.checkHeadroomCollision(p),b=this.checkWallCollision(p);console.log(`  checkCollision: ${M}, step=${T}, headroom=${R}, wall=${b}`);const A=this.currentPlanet.getTileAtPoint(this.position.clone().addScaledVector(m,2));if(A&&A.index!==t.index){console.log(`  Forward tile (2 units ahead): ${A.index}`);const w=this.currentPlanet.getPolyhedron().tiles[A.index];if(w){const _=[];for(let O=0;O<_t-1;O++){const z=O>0?this.currentPlanet.getBlock(A.index,O-1):H.AIR,W=this.currentPlanet.getBlock(A.index,O),ee=z===H.AIR||z===H.WATER,X=W!==H.AIR&&W!==H.WATER;ee&&X&&_.push(O)}const v=new I(w.center.x,w.center.y,w.center.z).normalize().multiplyScalar(this.currentPlanet.radius),C=this.checkStepHeight(v),L=this.checkHeadroomCollision(v),N=this.checkWallCollision(v);console.log(`  T${A.index} (center): floors=[${_.join(",")}] step=${C} headroom=${L} wall=${N}`)}}console.log("==============================================")}alignUpWithGravity(){if(!this.currentPlanet)return;const e=this.currentPlanet.getSurfaceNormal(this.position),t=this.localForward.clone().negate(),n=e.clone();n.sub(t.clone().multiplyScalar(e.dot(t))),!(n.lengthSq()<.001)&&(n.normalize(),this.localUp.copy(n),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new I().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal())}slerpRollToLevel(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.localForward.clone().negate(),i=t.clone();if(i.sub(n.clone().multiplyScalar(t.dot(n))),i.lengthSq()<.001){this.transitionTimer=0;return}i.normalize();const r=Math.min(1,V.ROLL_SLERP_SPEED*e);this.localUp.lerp(i,r).normalize(),this.localRight=new I().crossVectors(this.localForward,this.localUp).normalize(),this.localUp=new I().crossVectors(this.localRight,this.localForward).normalize(),this.updateOrientationFromLocal(),this.localUp.angleTo(i)<.01&&(this.transitionTimer=0)}handleSpaceMouseLook(e,t){if(!this.inputManager.isLocked())return;const n=-e.mouseX*V.MOUSE_SENSITIVITY,i=new ln().setFromAxisAngle(this.localUp,n);this.orientation.premultiply(i);const r=V.INVERT_Y_AXIS?-1:1;let a=e.mouseY*V.MOUSE_SENSITIVITY*r;if(!this.isInSpace&&this.currentPlanet){const l=this.currentPlanet.getSurfaceNormal(this.position),h=this.localForward.clone().negate().dot(l),u=Math.asin(Math.max(-1,Math.min(1,h))),d=89.5*Math.PI/180,f=u+a;f>d?a=d-u:f<-d&&(a=-d-u)}const o=new ln().setFromAxisAngle(this.localRight,a);this.orientation.premultiply(o),this.orientation.normalize(),this.updateLocalFromOrientation()}handleSpaceRoll(e,t){let n=0;if(e.rollLeft&&(n+=V.ROLL_SPEED*t),e.rollRight&&(n-=V.ROLL_SPEED*t),n!==0){const i=this.localForward.clone().negate(),r=new ln().setFromAxisAngle(i,n);this.orientation.premultiply(r),this.orientation.normalize(),this.updateLocalFromOrientation()}}handleSpaceMovement(e,t){const n=new I,i=this.localForward.clone().negate();if(e.forward&&n.add(i),e.backward&&n.sub(i),e.left&&n.add(this.localRight),e.right&&n.sub(this.localRight),e.jump&&n.add(this.localUp),e.crouch&&n.sub(this.localUp),n.lengthSq()>0){n.normalize();const r=e.sprint?V.SPRINT_SPEED:V.SPACE_THRUST;this.velocity.addScaledVector(n,r*t)}this.velocity.multiplyScalar(.98),this.position.add(this.velocity.clone().multiplyScalar(t))}handleMovement(e,t){if(!this.currentPlanet)return;const n=this.currentPlanet.getSurfaceNormal(this.position),i=this.position.clone().addScaledVector(n,V.PLAYER_EYE_HEIGHT);this.isInWater=this.currentPlanet.isInWater(i);const r=this.position.clone().addScaledVector(n,V.WATER_BODY_CHECK_HEIGHT),a=this.currentPlanet.isInWater(r);this.feetInWater=this.currentPlanet.isInWater(this.position);const o=new I;let l=this.localForward.clone().negate();l.sub(n.clone().multiplyScalar(l.dot(n))),l.lengthSq()>.001||(l=this.localUp.clone(),l.sub(n.clone().multiplyScalar(l.dot(n)))),l.normalize();const c=new I().crossVectors(l,n).normalize();if(e.forward&&o.add(l),e.backward&&o.sub(l),e.left&&o.sub(c),e.right&&o.add(c),o.lengthSq()>0){o.normalize();let d=e.sprint?V.SPRINT_SPEED:V.WALK_SPEED*V.WALK_SPEED_MULTIPLIER;a&&(d*=V.WATER_MOVEMENT_MULTIPLIER);const f=o.clone().multiplyScalar(d*t);this.resolveMovement(f)}const u=this.velocity.dot(n)>V.JUMP_FORCE*.5;if(e.jump&&this.feetInWater&&!this.isGrounded&&!u){const d=this.currentPlanet.getWaterSurfaceRadius(this.position),f=this.position.distanceTo(this.currentPlanet.center),g=d+V.WATER_SURFACE_FLOAT_HEIGHT,x=f-g;if(d>0&&x<=.3)if(x>=-.1){this.isFloatingAtSurface=!0;const m=this.velocity.dot(n);this.velocity.sub(n.clone().multiplyScalar(m))}else this.isFloatingAtSurface=!1,this.velocity.addScaledVector(n,V.WATER_SWIM_FORCE*t);else this.isFloatingAtSurface=!1}else this.isFloatingAtSurface=!1;if(e.jumpJustPressed)if(this.isGrounded){const d=n,f=this.velocity.dot(n);this.velocity.copy(n).multiplyScalar(f);let g=V.JUMP_FORCE;if(this.feetInWater&&this.isInWater&&(g=V.JUMP_FORCE*V.WATER_GRAVITY_MULTIPLIER),this.velocity.addScaledVector(d,g),this.isGrounded=!1,this.hasDoubleJumped=!1,this.didJumpThisFrame=!0,this.currentPlanet){this.jumpStartPosition=this.position.clone();const x=this.positionToSpherical(this.position,this.currentPlanet);this.jumpStartSpherical={theta:x.theta,phi:x.phi},this.wasdPressedDuringJump=!1,this.jumpDirection=n.clone()}}else this.jetpackEnabled&&!this.hasDoubleJumped&&!this.feetInWater&&(this.hasDoubleJumped=!0,this.isJetpacking=!0);!this.isGrounded&&(e.forward||e.backward||e.left||e.right)&&(this.wasdPressedDuringJump=!0)}resolveMovement(e){if(!this.currentPlanet)return;const t=this.position.clone().add(e);if(!this.checkCollision(t)){this.position.copy(t);return}const n=this.localForward.clone().multiplyScalar(e.dot(this.localForward)),i=this.localRight.clone().multiplyScalar(e.dot(this.localRight)),r=this.position.clone().add(n);if(this.checkCollision(r)){const a=this.position.clone().add(i);this.checkCollision(a)||this.position.copy(a)}else{this.position.copy(r);const a=this.position.clone().add(i);this.checkCollision(a)||this.position.copy(a)}}checkCollision(e){if(!this.currentPlanet)return!1;if(this.isGrounded&&!this.isInWater){const t=this.currentPlanet.getTileAtPoint(this.position),n=this.currentPlanet.getTileAtPoint(e);if(t&&n&&t.index!==n.index&&(!this.checkStepHeight(e)||this.checkHeadroomCollision(e)))return!0}return this.checkWallCollision(e)}checkStepHeight(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!0;const n=this.position.distanceTo(this.currentPlanet.center),i=Math.round(this.currentPlanet.radius-n),r=this.currentPlanet.radius-i;let a=!1,o=!1;for(let l=0;l<_t-1;l++){const c=l>0?St(this.currentPlanet,t.index,l-1):H.AIR,h=St(this.currentPlanet,t.index,l),u=c===H.AIR||c===H.WATER,d=h!==H.AIR&&h!==H.WATER;if(u&&d&&(a=!0,this.currentPlanet.radius-l-r<=V.AUTO_STEP_HEIGHT)){o=!0;break}}return a?o:!0}checkWallCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.currentPlanet.getTileAtPoint(this.position),i=n?n.index:-1;let r,a;if(this.isGrounded){const f=this.position.distanceTo(this.currentPlanet.center),g=this.currentPlanet.getTileAtPoint(this.position);let x=-1;if(g&&(x=fs(this.currentPlanet,g.index,f)),x<0)r=e.distanceTo(this.currentPlanet.center),a=r+V.PLAYER_HEIGHT;else{const m=this.currentPlanet.radius-x;let p=-1,y=1/0;for(let M=0;M<_t-1;M++){const T=M>0?St(this.currentPlanet,t.index,M-1):H.AIR,R=St(this.currentPlanet,t.index,M),b=T===H.AIR||T===H.WATER,A=R!==H.AIR&&R!==H.WATER;if(b&&A){const _=this.currentPlanet.radius-M-m;_<=V.AUTO_STEP_HEIGHT&&Math.abs(_)<Math.abs(y)&&(p=M,y=_)}}if(p>=0){const M=this.currentPlanet.radius-p;r=M,a=M+V.PLAYER_HEIGHT}else r=e.distanceTo(this.currentPlanet.center),a=r+V.PLAYER_HEIGHT}}else r=e.distanceTo(this.currentPlanet.center),a=r+V.PLAYER_HEIGHT;const o=this.currentPlanet.getSurfaceNormal(e),l=[t.index],c=this.currentPlanet.getPolyhedron().tiles[t.index];if(c)for(const f of c.neighbors){const g=this.currentPlanet.getPolyhedron().tiles[f];if(g){const m=new I(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),p=m.dot(o);m.clone().sub(o.clone().multiplyScalar(p)).length()<V.PLAYER_RADIUS+1&&l.push(f)}}const h=this.currentPlanet.radius*.02;let u=r;if(n){const f=fs(this.currentPlanet,i,this.position.distanceTo(this.currentPlanet.center));f>=0&&(u=this.currentPlanet.radius-f)}const d=Math.max(u,r);for(const f of l){if(f===i)continue;const g=this.currentPlanet.getPolyhedron().tiles[f];if(!g)continue;let x=-1;for(let R=0;R<_t-1;R++){const b=R>0?St(this.currentPlanet,f,R-1):H.AIR,A=St(this.currentPlanet,f,R);if((b===H.AIR||b===H.WATER)&&A!==H.AIR&&A!==H.WATER){x=R;break}}if(x>=0&&this.currentPlanet.radius-x<=d)continue;const p=new I(g.center.x,g.center.y,g.center.z).add(this.currentPlanet.center).clone().sub(e),y=p.dot(o),M=p.clone().sub(o.clone().multiplyScalar(y)).length(),T=Math.max(0,M-h);for(let R=0;R<_t;R++){const b=St(this.currentPlanet,f,R);if(b===H.AIR||b===H.WATER)continue;const A=this.currentPlanet.radius-R,w=A-1;if(!(A<=d)&&w<a){if(this.isGrounded&&f===t.index&&A===r)continue;if(T<V.PLAYER_RADIUS)return!0}}}return!1}checkHeadroomCollision(e){if(!this.currentPlanet)return!1;const t=this.currentPlanet.getTileAtPoint(e);if(!t)return!1;const n=this.position.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(this.position);let r=-1;if(i&&(r=fs(this.currentPlanet,i.index,n)),r<0)return!1;const a=this.currentPlanet.radius-r;let o=-1,l=1/0;for(let d=0;d<_t-1;d++){const f=d>0?St(this.currentPlanet,t.index,d-1):H.AIR,g=St(this.currentPlanet,t.index,d),x=f===H.AIR||f===H.WATER,m=g!==H.AIR&&g!==H.WATER;if(x&&m){const y=this.currentPlanet.radius-d-a;y<=V.AUTO_STEP_HEIGHT&&Math.abs(y)<Math.abs(l)&&(o=d,l=y)}}if(o<0)return!1;const c=this.currentPlanet.radius-o,h=c,u=c+V.PLAYER_HEIGHT;for(let d=0;d<_t;d++){const f=St(this.currentPlanet,t.index,d);if(f===H.AIR||f===H.WATER)continue;const g=this.currentPlanet.radius-d,x=g-1;if(g>h&&x<u){if(d===o)continue;return!0}}return!1}isPositionValid(e){if(!this.currentPlanet)return!0;const t=this.currentPlanet.getSurfaceNormal(e),n=e.distanceTo(this.currentPlanet.center),i=this.currentPlanet.getTileAtPoint(e);if(i){let a=-1;for(let o=0;o<_t;o++){const l=St(this.currentPlanet,i.index,o);l!==H.AIR&&l!==H.WATER&&(a=o)}if(a>=0){const o=this.currentPlanet.radius-a-1;if(n<o)return!1}}const r=[.1,V.PLAYER_HEIGHT*.5,V.PLAYER_HEIGHT];for(const a of r){const o=n+a,l=this.currentPlanet.center.clone().add(t.clone().multiplyScalar(o)),c=this.currentPlanet.getTileAtPoint(l);if(!c)continue;const h=Math.floor((this.currentPlanet.radius-o)/1);if(h<0||h>=_t)continue;const u=St(this.currentPlanet,c.index,h);if(u!==H.AIR&&u!==H.WATER){const d=this.currentPlanet.radius-h;if(o<d)return!1}}return!0}resolveStuckPosition(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getTileAtPoint(this.position);if(!t)return;const n=this.position.distanceTo(this.currentPlanet.center),i=n+V.PLAYER_HEIGHT,r=[];for(let f=0;f<_t;f++){const g=f>0?St(this.currentPlanet,t.index,f-1):H.AIR,x=St(this.currentPlanet,t.index,f),m=g===H.AIR||g===H.WATER,p=x!==H.AIR&&x!==H.WATER;if(m&&p){const y=this.currentPlanet.radius-f;r.push({depth:f,radius:y})}}if(r.length===0)return;let a=r[0],o=Math.abs(n-a.radius);for(const f of r){const g=Math.abs(n-f.radius);g<o&&(o=g,a=f)}const l=a.radius,c=l+V.PLAYER_HEIGHT;let h=!0;for(let f=0;f<_t;f++){const g=St(this.currentPlanet,t.index,f);if(g===H.AIR||g===H.WATER)continue;const x=this.currentPlanet.radius-f,m=x-1;if(f!==a.depth&&x>l&&m<c){h=!1;break}}if(!h)return;let u=!1;for(let f=0;f<_t;f++){const g=St(this.currentPlanet,t.index,f);if(g===H.AIR||g===H.WATER)continue;const x=this.currentPlanet.radius-f,m=x-1;if(x>n&&m<i){if(Math.abs(x-n)<.2)continue;u=!0;break}}if(!u)return;const d=a.radius+.1;if(this.position.copy(this.currentPlanet.center).addScaledVector(e,d),this.isInWater){const f=this.velocity.dot(e);f<0&&this.velocity.sub(e.clone().multiplyScalar(f))}else this.velocity.set(0,0,0)}handleJetpack(e,t){if(!this.currentPlanet)return;if(this.isInWater){this.isJetpacking=!1;return}const n=this.jumpDirection&&!this.wasdPressedDuringJump?this.jumpDirection:this.currentPlanet.getSurfaceNormal(this.position);this.jetpackEnabled&&this.hasDoubleJumped&&e.jump&&!this.isGrounded?(this.isJetpacking=!0,this.velocity.addScaledVector(n,V.JETPACK_FORCE*t)):e.jump||(this.isJetpacking=!1),this.jetpackEnabled&&this.hasDoubleJumped&&e.crouch&&this.velocity.addScaledVector(n,-30*t)}applyGravity(e){if(!this.currentPlanet)return;const t=this.currentPlanet.getSurfaceNormal(this.position),n=this.position.distanceTo(this.currentPlanet.center);this.resolveStuckPosition(t);const i=this.currentPlanet.getTileAtPoint(this.position);let r=-1;i&&(r=fs(this.currentPlanet,i.index,n));const a=r>=0?this.currentPlanet.radius-r:0,o=a;if(r>=0&&n<=o+.05&&this.velocity.dot(t)<=0){this.isGrounded=!0,this.hasDoubleJumped=!1,this.isJetpacking=!1,this.position.copy(this.currentPlanet.center).addScaledVector(t,o),this.checkJumpDrift();const c=this.velocity.dot(t);c<0&&this.velocity.sub(t.clone().multiplyScalar(c))}else{this.isGrounded=!1;let c;this.jumpDirection&&!this.wasdPressedDuringJump?c=this.jumpDirection.clone().negate():c=this.currentPlanet.getGravityDirection(this.position);const h=this.getGravityMultiplier();let u=V.BASE_GRAVITY*h;this.feetInWater&&(this.isInWater||this.isFloatingAtSurface)&&(this.isFloatingAtSurface?u=0:u*=V.WATER_GRAVITY_MULTIPLIER,this.isFloatingAtSurface||this.velocity.multiplyScalar(1-V.WATER_DRAG*e)),u>0&&this.velocity.addScaledVector(c,u*e),this.getAltitude()>20&&!this.feetInWater&&this.velocity.multiplyScalar(.99);const f=this.position.clone().add(this.velocity.clone().multiplyScalar(e)),g=f.distanceTo(this.currentPlanet.center),x=this.currentPlanet.getTileAtPoint(f);let m=-1,p=1/0;if(x)for(let b=0;b<_t-1;b++){const A=b>0?St(this.currentPlanet,x.index,b-1):H.AIR,w=St(this.currentPlanet,x.index,b),_=A===H.AIR||A===H.WATER,v=w!==H.AIR&&w!==H.WATER;if(_&&v){const L=this.currentPlanet.radius-b-a;L<=V.AUTO_STEP_HEIGHT&&Math.abs(L)<Math.abs(p)&&(m=b,p=L)}}const y=m>=0?this.currentPlanet.radius-m:0,M=y,T=y-a,R=!this.isInWater&&T>V.AUTO_STEP_HEIGHT;if(m>=0&&g<=M)if(R){const b=this.velocity.dot(t);b<0&&this.velocity.sub(t.clone().multiplyScalar(b)),this.velocity.multiplyScalar(.5)}else{const b=f.clone().sub(this.currentPlanet.center).normalize();this.position.copy(this.currentPlanet.center).addScaledVector(b,M);const A=this.velocity.dot(b);A<0&&this.velocity.sub(b.clone().multiplyScalar(A)),this.isInWater||this.checkJumpDrift(),this.isGrounded=!this.isInWater}else{const b=this.isPositionValid(f),A=this.checkWallCollision(f);if(b&&!A)this.position.copy(f);else{const w=t.clone().multiplyScalar(this.velocity.dot(t)),_=this.velocity.clone().sub(w),v=w.clone().multiplyScalar(e),C=this.position.clone().add(v);if(this.isPositionValid(C)&&!this.checkWallCollision(C))this.position.copy(C);else{const N=this.velocity.dot(t);this.velocity.sub(t.clone().multiplyScalar(N))}if(_.lengthSq()>.001){const N=_.clone().multiplyScalar(e),O=this.position.clone().add(N);this.isPositionValid(O)&&!this.checkWallCollision(O)?this.position.copy(O):this.velocity.sub(_.clone().multiplyScalar(.5))}}}}}updateCamera(){const e=this.currentPlanet?this.position.clone().sub(this.currentPlanet.center).normalize():this.localUp.clone(),t=this.position.clone(),n=e.clone().multiplyScalar(V.PLAYER_EYE_HEIGHT);t.add(n),this.camera.position.copy(t);const i=this.localForward.clone().negate(),r=t.clone().add(i);this.camera.up.copy(this.localUp),this.camera.lookAt(r)}updateUI(){const e=document.getElementById("position");if(e){const{altitude:n,gravityMultiplier:i}=this.findClosestPlanetAndGravity();let r="";this.isInSpace?r=" [SPACE FLIGHT]":this.transitionTimer>0?r=" [ENTERING GRAVITY]":this.isJetpacking?r=" [JETPACK]":this.isGrounded||(r=" [AIRBORNE]");const a=n===1/0?"∞":n.toFixed(1);e.textContent=`Alt: ${a} | Grav: ${(i*100).toFixed(0)}%${r}`}const t=document.getElementById("block-depth");if(t&&this.currentPlanet){const n=this.currentPlanet.getDepthAtPoint(this.position);t.textContent=`Depth: ${n}`}}getCurrentPlanet(){return this.currentPlanet}getForwardVector(){return this.localForward.clone().negate()}getRaycastOrigin(){return this.camera.position.clone()}getIsInWater(){return this.isInWater}setJetpackEnabled(e){this.jetpackEnabled=e,e||(this.isJetpacking=!1)}}var bt=(s=>(s[s.NONE=0]="NONE",s[s.STONE=1]="STONE",s[s.DIRT=2]="DIRT",s[s.GRASS=3]="GRASS",s[s.WOOD=4]="WOOD",s[s.LEAVES=5]="LEAVES",s[s.LOG=6]="LOG",s))(bt||{});const on={0:{name:"Empty",stackSize:0,texture:"",mineTime:0},1:{name:"Stone",stackSize:64,texture:"/textures/rocks.png",mineTime:1.5},2:{name:"Dirt",stackSize:64,texture:"/textures/dirt.png",mineTime:.5},3:{name:"Grass",stackSize:64,texture:"/textures/grass.png",mineTime:.6},4:{name:"Wood",stackSize:64,texture:"/textures/wood.png",mineTime:1},5:{name:"Leaves",stackSize:64,texture:"/textures/leaves.png",mineTime:.3},6:{name:"Log",stackSize:64,texture:"/textures/icons/logs.png",mineTime:1.2}};class nm{constructor(){F(this,"slots");F(this,"selectedSlot",0);F(this,"hotbarSize",9);F(this,"totalSlots",36);this.slots=[];for(let e=0;e<this.totalSlots;e++)this.slots.push({itemType:0,quantity:0})}addItem(e,t){if(e===0)return t;const n=on[e];let i=t;for(let r=0;r<this.totalSlots&&i>0;r++){const a=this.slots[r];if(a.itemType===e&&a.quantity<n.stackSize){const o=Math.min(i,n.stackSize-a.quantity);a.quantity+=o,i-=o}}for(let r=0;r<this.totalSlots&&i>0;r++){const a=this.slots[r];if(a.itemType===0){const o=Math.min(i,n.stackSize);a.itemType=e,a.quantity=o,i-=o}}return i}removeItem(e,t){if(e===0)return 0;let n=t,i=0;for(let r=this.totalSlots-1;r>=0&&n>0;r--){const a=this.slots[r];if(a.itemType===e){const o=Math.min(n,a.quantity);a.quantity-=o,n-=o,i+=o,a.quantity===0&&(a.itemType=0)}}return i}hasItem(e,t){let n=0;for(const i of this.slots)if(i.itemType===e&&(n+=i.quantity,n>=t))return!0;return!1}getItemCount(e){let t=0;for(const n of this.slots)n.itemType===e&&(t+=n.quantity);return t}getHotbar(){return this.slots.slice(0,this.hotbarSize)}getSelectedSlot(){return this.selectedSlot}setSelectedSlot(e){this.selectedSlot=Math.max(0,Math.min(this.hotbarSize-1,e))}getSelectedItem(){return this.slots[this.selectedSlot]}useSelectedItem(){const e=this.slots[this.selectedSlot];return e.itemType!==0&&e.quantity>0?(e.quantity--,e.quantity===0&&(e.itemType=0),!0):!1}getAllSlots(){return this.slots}}const im=[{name:"Wood Planks",inputs:[{itemType:bt.LOG,quantity:1}],output:{itemType:bt.WOOD,quantity:4}}];class sm{constructor(e){F(this,"inventory");F(this,"menuElement",null);F(this,"recipeListElement",null);F(this,"inventoryGridElement",null);F(this,"inventoryHotbarElement",null);F(this,"isOpen",!1);F(this,"onCloseCallback",null);F(this,"onUpdateHotbarCallback",null);this.inventory=e,this.setupUI(),this.setupKeyboardHandler()}setupUI(){var t;this.menuElement=document.getElementById("inventory-menu"),this.recipeListElement=document.getElementById("recipe-list"),this.inventoryGridElement=document.getElementById("inventory-grid"),this.inventoryHotbarElement=document.getElementById("inventory-hotbar"),this.createInventorySlots();const e=(t=this.menuElement)==null?void 0:t.querySelector(".close-inventory");e&&e.addEventListener("click",()=>this.close()),this.updateRecipeList()}createInventorySlots(){if(this.inventoryGridElement){this.inventoryGridElement.innerHTML="";for(let e=9;e<36;e++){const t=this.createSlotElement(e);this.inventoryGridElement.appendChild(t)}}if(this.inventoryHotbarElement){this.inventoryHotbarElement.innerHTML="";for(let e=0;e<9;e++){const t=this.createSlotElement(e);this.inventoryHotbarElement.appendChild(t)}}}createSlotElement(e){const t=document.createElement("div");t.className="inventory-slot",t.dataset.slot=e.toString();const n=document.createElement("img");n.style.display="none",t.appendChild(n);const i=document.createElement("span");return i.className="slot-count",t.appendChild(i),t}setupKeyboardHandler(){document.addEventListener("keydown",e=>{e.key==="e"||e.key==="E"?this.isOpen?(this.close(),e.preventDefault()):document.pointerLockElement&&(this.open(),e.preventDefault()):e.key==="Escape"&&this.isOpen&&(this.close(),e.preventDefault())})}open(){this.menuElement&&(console.log("Inventory opened"),this.menuElement.classList.add("active"),this.isOpen=!0,document.exitPointerLock(),this.updateUI())}close(){this.menuElement&&(this.menuElement.classList.remove("active"),this.isOpen=!1,this.onCloseCallback&&this.onCloseCallback())}isMenuOpen(){return this.isOpen}setOnCloseCallback(e){this.onCloseCallback=e}setOnUpdateHotbarCallback(e){this.onUpdateHotbarCallback=e}updateUI(){this.updateInventorySlots(),this.updateRecipeList()}updateInventorySlots(){var i,r;const e=this.inventory.getAllSlots(),t=(i=this.inventoryGridElement)==null?void 0:i.querySelectorAll(".inventory-slot");t==null||t.forEach((a,o)=>{const l=9+o;this.updateSlotElement(a,e[l])});const n=(r=this.inventoryHotbarElement)==null?void 0:r.querySelectorAll(".inventory-slot");n==null||n.forEach((a,o)=>{this.updateSlotElement(a,e[o])})}updateSlotElement(e,t){const n=e.querySelector("img"),i=e.querySelector(".slot-count");if(t.itemType!==bt.NONE&&t.quantity>0){const r=on[t.itemType];n&&(n.src=Ci(r.texture),n.style.display="block"),i&&(i.textContent=t.quantity>1?t.quantity.toString():"")}else n&&(n.style.display="none"),i&&(i.textContent="")}updateRecipeList(){if(this.recipeListElement){this.recipeListElement.innerHTML="";for(const e of im){const t=this.createRecipeElement(e);this.recipeListElement.appendChild(t)}}}createRecipeElement(e){const t=document.createElement("div");t.className="recipe-item";const n=this.canCraft(e);n||t.classList.add("disabled");for(const l of e.inputs){const c=document.createElement("img");c.src=Ci(on[l.itemType].texture),c.title=`${l.quantity}x ${on[l.itemType].name}`,t.appendChild(c);const h=document.createElement("span");h.textContent=`x${l.quantity}`,t.appendChild(h)}const i=document.createElement("span");i.className="recipe-arrow",i.textContent=" → ",t.appendChild(i);const r=document.createElement("img");r.src=Ci(on[e.output.itemType].texture),r.title=`${e.output.quantity}x ${on[e.output.itemType].name}`,t.appendChild(r);const a=document.createElement("span");a.textContent=`x${e.output.quantity}`,t.appendChild(a);const o=document.createElement("span");return o.textContent=` (${e.name})`,o.style.color="#888",t.appendChild(o),n&&t.addEventListener("click",()=>this.craft(e)),t}canCraft(e){for(const t of e.inputs)if(!this.inventory.hasItem(t.itemType,t.quantity))return!1;return!0}craft(e){if(this.canCraft(e)){for(const t of e.inputs)this.inventory.removeItem(t.itemType,t.quantity);this.inventory.addItem(e.output.itemType,e.output.quantity),this.updateUI(),this.onUpdateHotbarCallback&&this.onUpdateHotbarCallback()}}}function Na(s){switch(s){case H.STONE:return bt.STONE;case H.DIRT:return bt.DIRT;case H.GRASS:return bt.DIRT;default:return bt.NONE}}function rm(s){switch(s){case bt.STONE:return H.STONE;case bt.DIRT:return H.DIRT;case bt.GRASS:return H.DIRT;case bt.WOOD:return H.WOOD;default:return H.AIR}}class om{constructor(e,t,n){F(this,"planets");F(this,"player");F(this,"scene");F(this,"raycaster");F(this,"inventory");F(this,"craftingSystem");F(this,"blockWireframe",null);F(this,"treeManager",null);F(this,"rightClickCooldown",0);F(this,"CLICK_COOLDOWN",.25);F(this,"MAX_REACH",8);F(this,"miningTarget",null);F(this,"miningTreeTarget",null);F(this,"miningProgress",0);F(this,"miningProgressContainer",null);F(this,"miningProgressBar",null);this.planets=e,this.player=t,this.scene=n,this.raycaster=new th,this.inventory=new nm,this.craftingSystem=new sm(this.inventory),this.craftingSystem.setOnCloseCallback(()=>{const i=document.getElementById("game-container");i&&i.requestPointerLock()}),this.craftingSystem.setOnUpdateHotbarCallback(()=>{this.updateHotbarUI()}),this.createHighlightMesh(),this.setupBlockSelection(),this.setupMiningUI(),this.updateHotbarUI()}setupMiningUI(){this.miningProgressContainer=document.getElementById("mining-progress-container"),this.miningProgressBar=document.getElementById("mining-progress-bar")}updateMiningUI(e){this.miningProgressContainer&&this.miningProgressBar&&(e>0?(this.miningProgressContainer.classList.add("active"),this.miningProgressBar.style.width=`${e*100}%`):(this.miningProgressContainer.classList.remove("active"),this.miningProgressBar.style.width="0%"))}updateHotbarUI(){const e=this.inventory.getHotbar();document.querySelectorAll(".hotbar-slot").forEach((n,i)=>{if(i<e.length){const r=e[i],a=n.querySelector("img");let o=n.querySelector(".item-count");if(r.itemType!==bt.NONE&&r.quantity>0){const l=on[r.itemType];a&&(a.src=Ci(l.texture),a.style.display="block"),o||(o=document.createElement("span"),o.className="item-count",n.appendChild(o)),o.textContent=r.quantity>1?r.quantity.toString():""}else a&&(a.style.display="none"),o&&(o.textContent="");n.classList.toggle("selected",i===this.inventory.getSelectedSlot())}})}createHighlightMesh(){const e=new il({color:16777215,transparent:!0,opacity:.8,depthTest:!0,depthWrite:!1}),t=new ct;this.blockWireframe=new zc(t,e),this.blockWireframe.visible=!1,this.scene.add(this.blockWireframe)}updateBlockWireframe(e,t,n){const i=e.getTileByIndex(t);if(!i||!this.blockWireframe)return;const r=e.getBlockHeight(),a=e.radius-n*r,o=a-r,l=[],c=i.vertices.length,h=[],u=[];for(const f of i.vertices){const g=f.clone().normalize();h.push(g.clone().multiplyScalar(o).add(e.center)),u.push(g.clone().multiplyScalar(a).add(e.center))}for(let f=0;f<c;f++){const g=(f+1)%c;l.push(u[f].x,u[f].y,u[f].z),l.push(u[g].x,u[g].y,u[g].z)}for(let f=0;f<c;f++){const g=(f+1)%c;l.push(h[f].x,h[f].y,h[f].z),l.push(h[g].x,h[g].y,h[g].z)}for(let f=0;f<c;f++)l.push(u[f].x,u[f].y,u[f].z),l.push(h[f].x,h[f].y,h[f].z);this.blockWireframe.geometry.dispose();const d=new ct;d.setAttribute("position",new Ae(l,3)),this.blockWireframe.geometry=d}setupBlockSelection(){document.addEventListener("keydown",e=>{const t=parseInt(e.key);t>=1&&t<=9&&(this.inventory.setSelectedSlot(t-1),this.updateHotbarUI(),this.updateBlockTypeUI())})}updateBlockTypeUI(){const e=this.inventory.getSelectedItem(),t=document.getElementById("block-type");t&&(e.itemType!==bt.NONE?t.textContent=`Block: ${on[e.itemType].name}`:t.textContent="Block: None")}update(e,t,n){var g;this.rightClickCooldown=Math.max(0,this.rightClickCooldown-e);const i=this.player.getRaycastOrigin(),r=this.player.getForwardVector();this.raycaster.set(i,r),this.raycaster.far=this.MAX_REACH;const a=((g=this.treeManager)==null?void 0:g.getTreeMeshes())??[],o=this.raycaster.intersectObjects(a,!1);let l=null,c=null,h=1/0;for(const x of this.planets){const m=x.raycast(i,r,this.MAX_REACH);if(m){const p=i.distanceTo(m.point);p<h&&(h=p,l=m,c=x)}}let u=!1,d=!1,f=null;if(o.length>0&&l?o[0].distance<h?(u=!0,f=o[0]):d=!0:o.length>0?(u=!0,f=o[0]):l&&(d=!0),u&&f){const x=f.object;this.blockWireframe&&(this.blockWireframe.visible=!1);const m=x.userData.treeType;t?this.handleTreeMining(e,x,m):this.resetMining()}else if(d&&l&&c){const{tileIndex:x,depth:m,blockType:p,prevTileIndex:y,prevDepth:M}=l;this.blockWireframe&&(this.blockWireframe.visible=!0,this.updateBlockWireframe(c,x,m)),t&&p!==H.AIR?this.handleMining(e,c,x,m,p):this.resetMining(),n&&this.rightClickCooldown===0&&(this.placeBlock(c,y,M),this.rightClickCooldown=this.CLICK_COOLDOWN)}else this.blockWireframe&&(this.blockWireframe.visible=!1),this.resetMining()}handleMining(e,t,n,i,r){(this.miningTarget===null||this.miningTarget.planet!==t||this.miningTarget.tileIndex!==n||this.miningTarget.depth!==i)&&(this.miningTarget={planet:t,tileIndex:n,depth:i,blockType:r},this.miningProgress=0);const a=Na(r),o=on[a].mineTime;this.miningProgress+=e/o,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakBlock(t,n,i,r),this.resetMining())}handleTreeMining(e,t,n){(this.miningTreeTarget===null||this.miningTreeTarget.mesh!==t)&&(this.miningTreeTarget={mesh:t,treeType:n},this.miningTarget=null,this.miningProgress=0);const i=n==="trunk"?bt.LOG:bt.LEAVES,r=on[i].mineTime;this.miningProgress+=e/r,this.updateMiningUI(this.miningProgress),this.miningProgress>=1&&(this.breakTree(t,n),this.resetMining())}breakTree(e,t){const n=t==="trunk"?bt.LOG:bt.LEAVES;if(this.inventory.addItem(n,1),this.updateHotbarUI(),this.treeManager){let i=e.parent;for(;i&&!(i instanceof Ht&&i.children.some(r=>r.userData.isTree));)i=i.parent;i instanceof Ht&&this.treeManager.removeTree(i)}}resetMining(){this.miningTarget=null,this.miningTreeTarget=null,this.miningProgress=0,this.updateMiningUI(0)}breakBlock(e,t,n,i){const r=e.getMaxDepth();if(n>=r-1)return;const a=Na(i);a!==bt.NONE&&(this.inventory.addItem(a,1),this.updateHotbarUI()),e.setBlock(t,n,H.AIR)}placeBlock(e,t,n){if(n<0)return;const i=this.inventory.getSelectedItem();if(i.itemType===bt.NONE||i.quantity===0)return;const r=rm(i.itemType);if(r===H.AIR)return;const a=e.getTileAtPoint(this.player.position);if(a&&a.index===t){const o=this.player.position.distanceTo(e.center),l=o+1.8,c=e.radius-n,h=c-1;if(c>o&&h<l)return}this.inventory.useSelectedItem()&&(e.setBlock(t,n,r),this.updateHotbarUI())}getInventory(){return this.inventory}setTreeManager(e){this.treeManager=e}}let am=class{constructor(e){F(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}};const Ss={trunkHeight:3,trunkRadius:.3,leafLayers:4,leafBaseRadius:2,leafTaper:.7};function Fa(s,e){return new Tt({uniforms:{baseColor:{value:s},sunDirection:{value:e.clone().normalize()},ambientIntensity:{value:V.AMBIENT_LIGHT_INTENSITY},directionalIntensity:{value:V.DIRECTIONAL_LIGHT_INTENSITY}},vertexShader:`
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
    `})}class lm{constructor(e){F(this,"trunkMaterial");F(this,"leavesMaterial");F(this,"sunDirection");this.sunDirection=(e==null?void 0:e.clone().normalize())??new I(V.SUN_DIRECTION.x,V.SUN_DIRECTION.y,V.SUN_DIRECTION.z).normalize(),this.trunkMaterial=Fa(new De(9127187),this.sunDirection),this.leavesMaterial=Fa(new De(2263842),this.sunDirection)}createTree(e,t,n={}){const i={...Ss,...n},r=new Ht,a=this.createHexagonalPrism(i.trunkRadius,i.trunkHeight,6),o=new Be(a,this.trunkMaterial);o.userData.isTree=!0,o.userData.treeType="trunk",r.add(o);let l=i.trunkHeight,c=i.leafBaseRadius;for(let d=0;d<i.leafLayers;d++){const g=new So(c,1.2,6),x=new Be(g,this.leavesMaterial);x.position.y=l+1.2/2,x.userData.isTree=!0,x.userData.treeType="leaves",r.add(x),l+=1.2*.6,c*=i.leafTaper}const h=new I(0,1,0),u=new ln().setFromUnitVectors(h,t.clone().normalize());return r.quaternion.copy(u),r.position.copy(e),r}createHexagonalPrism(e,t,n){const i=new Rs(e,e,t,n);return i.translate(0,t/2,0),i}getTrunkMaterial(){return this.trunkMaterial}getLeavesMaterial(){return this.leavesMaterial}}class cm{constructor(e,t){F(this,"trees",[]);F(this,"treesByTile",new Map);F(this,"treeBuilder");F(this,"scene");this.scene=e,this.treeBuilder=new lm(t)}addTree(e,t,n,i){const r=e.clone().sub(t).normalize(),a=this.treeBuilder.createTree(e,r,n);return i!==void 0&&(a.userData.tileIndex=i,this.treesByTile.has(i)||this.treesByTile.set(i,[]),this.treesByTile.get(i).push(a)),this.trees.push(a),this.scene.add(a),a}removeTree(e){const t=this.trees.indexOf(e);if(t>=0){this.trees.splice(t,1),this.scene.remove(e);const n=e.userData.tileIndex;if(n!==void 0&&this.treesByTile.has(n)){const i=this.treesByTile.get(n),r=i.indexOf(e);r>=0&&i.splice(r,1)}e.traverse(i=>{i instanceof Be&&i.geometry.dispose()})}}getTreeAtPosition(e,t=1){for(const n of this.trees)if(n.position.distanceTo(e)<t)return n;return null}getTreeMeshes(){const e=[];for(const t of this.trees)t.traverse(n=>{n instanceof Be&&n.userData.isTree&&e.push(n)});return e}scatterTrees(e,t,n,i,r,a=V.TERRAIN_SEED,o){const l=new am(a+54321);let c=0,h=0;const u=n*5;for(;c<n&&h<u;){h++;const d=l.next()*Math.PI*2,f=Math.acos(2*l.next()-1),g=new I(Math.sin(f)*Math.cos(d),Math.sin(f)*Math.sin(d),Math.cos(f)).normalize();if(r&&r(g))continue;const x=i(g),m=e.clone().add(g.clone().multiplyScalar(x)),p=o?o(g):void 0,y=.5+l.next()*1,M=.6+l.next()*.9,T={trunkHeight:Ss.trunkHeight*y*M,trunkRadius:Ss.trunkRadius*y,leafBaseRadius:Ss.leafBaseRadius*y,leafLayers:Math.floor(2+l.next()*4),leafTaper:.6+l.next()*.2};this.addTree(m,e,T,p??void 0),c++}}updateVisibility(e){for(const[t,n]of this.treesByTile){const i=e.has(t);for(const r of n)r.visible=i}}getTrees(){return this.trees}getTreeBuilder(){return this.treeBuilder}}var hm=`varying vec3 vWorldPosition;
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
}`;function dm(s){const e=s.planetRadius*V.ATMOSPHERE_RADIUS_MULT,t=s.planetRadius-V.ATMOSPHERE_SURFACE_OFFSET;return new Tt({uniforms:{planetCenter:{value:new I(0,0,0)},planetRadius:{value:t},atmosphereRadius:{value:e},sunDirection:{value:s.sunDirection.clone().normalize()},viewerPosition:{value:new I},rayleighScale:{value:V.ATMOSPHERE_RAYLEIGH_SCALE},mieScale:{value:V.ATMOSPHERE_MIE_SCALE},mieG:{value:V.ATMOSPHERE_MIE_G},sunIntensity:{value:V.ATMOSPHERE_SUN_INTENSITY},numSamples:{value:V.ATMOSPHERE_SAMPLES},numLightSamples:{value:V.ATMOSPHERE_LIGHT_SAMPLES}},vertexShader:hm,fragmentShader:um,transparent:!0,side:Dt,depthWrite:!1,blending:dr})}class fm{constructor(e){F(this,"mesh");F(this,"material");const t=e.planetRadius*V.ATMOSPHERE_RADIUS_MULT,n=new Oi(t,64,48);this.material=dm(e),this.mesh=new Be(n,this.material)}getMesh(){return this.mesh}setPosition(e){this.mesh.position.copy(e),this.material.uniforms.planetCenter.value.copy(e)}updateCameraPosition(e){this.material.uniforms.viewerPosition.value.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}setVisible(e){this.mesh.visible=e}isVisible(){return this.mesh.visible}}function pm(s,e){return new fm({planetRadius:s,sunDirection:e})}var mm=`varying vec3 vNormal;
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
}`;const xm={planetRadius:50,cloudHeight:5,cloudThickness:2,cloudDensity:.4,cloudScale:3,seed:12345};class _m{constructor(e){F(this,"seed");this.seed=e}next(){return this.seed=this.seed*1103515245+12345&2147483647,this.seed/2147483647}}function vm(s,e,t,n){const i=[],r=[],a=[],o=s.clone().sub(t).normalize();let l=new I(1,0,0);Math.abs(o.dot(l))>.9&&(l=new I(0,0,1));const c=new I().crossVectors(o,l).normalize(),h=new I().crossVectors(c,o).normalize(),u=3+Math.floor(n.next()*4);for(let f=0;f<u;f++){const g=(n.next()-.5)*e*.8,x=(n.next()-.5)*e*.4,m=(n.next()-.5)*e*.8,p=s.clone().addScaledVector(c,g).addScaledVector(o,x).addScaledVector(h,m),y=e*(.3+n.next()*.4);Sm(i,r,a,p,y,o,c,h)}if(i.length===0)return null;const d=new ct;return d.setAttribute("position",new Ae(i,3)),d.setAttribute("normal",new Ae(r,3)),d.setIndex(a),d.computeBoundingSphere(),d}function Sm(s,e,t,n,i,r,a,o){const l=i/2,c=[];for(let u=0;u<8;u++){const d=u&1?l:-l,f=u&2?l:-l,g=u&4?l:-l,x=n.clone().addScaledVector(a,d).addScaledVector(r,f).addScaledVector(o,g);c.push(x)}const h=[{verts:[0,1,3,2],normal:o.clone().negate()},{verts:[4,6,7,5],normal:o.clone()},{verts:[0,2,6,4],normal:a.clone().negate()},{verts:[1,5,7,3],normal:a.clone()},{verts:[0,4,5,1],normal:r.clone().negate()},{verts:[2,3,7,6],normal:r.clone()}];for(const u of h){const d=s.length/3;for(const f of u.verts){const g=c[f];s.push(g.x,g.y,g.z),e.push(u.normal.x,u.normal.y,u.normal.z)}t.push(d,d+1,d+2,d,d+2,d+3)}}function bm(s){return new Tt({uniforms:{sunDirection:{value:s.clone().normalize()},cloudColor:{value:new De(16777215)},shadowColor:{value:new De(8947882)},ambientIntensity:{value:.4}},vertexShader:mm,fragmentShader:gm,transparent:!0,side:Vt,depthWrite:!0})}class Mm{constructor(e={},t){F(this,"clouds");F(this,"material");F(this,"config");this.config={...xm,...e},this.clouds=new Ht,this.material=bm(t),this.generateClouds()}generateClouds(){const e=new _m(this.config.seed),t=this.config.planetRadius+this.config.cloudHeight,n=this.config.cloudCount??Math.floor(100*this.config.cloudDensity);for(let i=0;i<n;i++){const r=e.next()*Math.PI*2,a=Math.acos(2*e.next()-1),o=(e.next()-.5)*this.config.cloudThickness,l=t+o,c=l*Math.sin(a)*Math.cos(r),h=l*Math.sin(a)*Math.sin(r),u=l*Math.cos(a),d=new I(c,h,u),f=new I(0,0,0),g=vm(d,this.config.cloudScale*(.5+e.next()*.5),f,e);if(g){const x=new Be(g,this.material);this.clouds.add(x)}}}getGroup(){return this.clouds}setPosition(e){this.clouds.position.copy(e)}setSunDirection(e){this.material.uniforms.sunDirection.value.copy(e).normalize()}update(e){const t=this.config.rotationSpeed??.01;this.clouds.rotation.y+=e*t}setVisible(e){this.clouds.visible=e}isVisible(){return this.clouds.visible}}function ym(s,e){return new Mm({planetRadius:s,cloudHeight:4,cloudThickness:1.5,cloudDensity:.35,cloudCount:V.CLOUD_COUNT,cloudScale:2.5,seed:42,rotationSpeed:V.CLOUD_ROTATION_SPEED},e)}class Em{constructor(){F(this,"engine");F(this,"inputManager");F(this,"earth");F(this,"moon");F(this,"player");F(this,"blockInteraction");F(this,"treeManager");F(this,"earthAtmosphere",null);F(this,"earthClouds",null);F(this,"isReady",!1);F(this,"elapsedTime",0);const e=document.getElementById("game-container");if(!e)throw new Error("Game container not found");this.engine=new $p(e),this.inputManager=new qp,this.earth=new La(this.engine.scene,100,V.EARTH_SUBDIVISIONS),this.moon=new La(this.engine.scene,50,V.MOON_SUBDIVISIONS,{texturePath:"/textures/moon.png",heightVariation:.6}),this.player=null,this.blockInteraction=null,this.treeManager=null,this.inputManager.setPointerLockCallback(t=>{const n=document.getElementById("instructions"),i=document.getElementById("inventory-menu"),r=i==null?void 0:i.classList.contains("active");n&&(n.style.display=t||r?"none":"block",!t&&!r&&console.log("Menu opened"));const a=document.getElementById("crosshair");a&&(a.style.display=t?"block":"none")}),this.init()}async init(){try{await this.earth.initialize(),await this.moon.initialize(),this.moon.center.set(400,0,0),this.moon.updateBoundingSpheres(),this.player=new tm(this.engine.camera,this.inputManager,this.earth),this.player.addPlanet(this.moon,{gravityFullRadius:70,gravityFalloffRadius:120,gravityStrength:.4}),this.blockInteraction=new om([this.earth,this.moon],this.player,this.engine.scene),this.treeManager=new cm(this.engine.scene,this.engine.sunDirection),this.treeManager.scatterTrees(this.earth.center,this.earth.radius,V.TREE_COUNT,t=>this.earth.getSurfaceHeightInDirection(t),t=>this.earth.isUnderwaterInDirection(t),V.TERRAIN_SEED,t=>this.earth.getTileIndexInDirection(t)),this.blockInteraction.setTreeManager(this.treeManager),V.ATMOSPHERE_ENABLED&&(this.earthAtmosphere=pm(this.earth.radius,this.engine.sunDirection),this.earthAtmosphere.setPosition(this.earth.center),this.engine.scene.add(this.earthAtmosphere.getMesh())),this.earthClouds=ym(this.earth.radius,this.engine.sunDirection),this.earthClouds.setPosition(this.earth.center),this.engine.scene.add(this.earthClouds.getGroup()),this.earth.setSunDirection(this.engine.sunDirection);const e=this.earth.getWaterShaderMaterial();e&&this.engine.registerWaterMaterial(e),this.setupSettingsMenu(),me.setFrameSpikeThreshold(V.FRAME_SPIKE_THRESHOLD_MS),this.isReady=!0,this.engine.onUpdate(this.update.bind(this)),this.engine.start(),console.log("Planet game started with Earth and Moon!")}catch(e){console.error("Failed to initialize game:",e)}}update(e){if(!this.isReady)return;this.elapsedTime+=e,me.begin("Player"),this.player.update(e),me.end("Player"),this.engine.setUnderwater(this.player.getIsInWater()),me.begin("Earth Update"),this.earth.update(this.player.position,this.engine.camera),me.end("Earth Update"),me.begin("Moon Update"),this.moon.update(this.player.position,this.engine.camera),me.end("Moon Update");const t=this.player.getIsInWater();this.earth.updateWaterShader(this.elapsedTime,t),this.earthAtmosphere&&this.earthAtmosphere.updateCameraPosition(this.engine.camera.position),this.earthClouds.update(e),this.treeManager.updateVisibility(this.earth.getVisibleTileIndicesWithBorder()),me.begin("Block Interaction");const n=this.inputManager.getState();this.blockInteraction.update(e,n.leftClick,n.rightClick),me.end("Block Interaction")}setupSettingsMenu(){var o;const e=document.getElementById("toggle-atmosphere"),t=document.getElementById("toggle-clouds"),n=document.getElementById("toggle-jetpack"),i=document.getElementById("toggle-invert-y"),r=document.getElementById("teleport-select"),a=document.querySelectorAll(".menu-tab");a.forEach(l=>{l.addEventListener("click",()=>{a.forEach(u=>u.classList.remove("active")),document.querySelectorAll(".tab-content").forEach(u=>u.classList.remove("active")),l.classList.add("active");const c=l.getAttribute("data-tab"),h=document.getElementById(`tab-${c}`);h&&h.classList.add("active")})}),!(!e||!t)&&(e.checked=((o=this.earthAtmosphere)==null?void 0:o.isVisible())??!1,t.checked=this.earthClouds.isVisible(),n&&(n.checked=!1,this.player.setJetpackEnabled(!1),n.addEventListener("change",()=>{this.player.setJetpackEnabled(n.checked)})),i&&(i.checked=V.INVERT_Y_AXIS,i.addEventListener("change",()=>{V.INVERT_Y_AXIS=i.checked})),e.addEventListener("change",()=>{this.earthAtmosphere&&this.earthAtmosphere.setVisible(e.checked)}),t.addEventListener("change",()=>{this.earthClouds.setVisible(t.checked)}),r&&r.addEventListener("change",()=>{this.teleportToPlanet(r.value)}))}teleportToPlanet(e){let t;switch(e){case"earth":t=this.earth;break;case"moon":t=this.moon;break;default:console.warn(`Unknown planet: ${e}`);return}const n=1,i=t.center.clone();if(e==="earth"){const r=new I(0,1,0),a=t.getSurfaceHeightInDirection(r);i.y+=a+n}else{const r=new I(-1,0,0),a=t.getSurfaceHeightInDirection(r);i.x-=a+n}this.player.position.copy(i),this.player.velocity.set(0,0,0),console.log(`Teleported to ${e} at position: ${i.x.toFixed(1)}, ${i.y.toFixed(1)}, ${i.z.toFixed(1)}`)}}document.addEventListener("DOMContentLoaded",()=>{new Em});
//# sourceMappingURL=index-Xrjp0910.js.map
