import sharp from 'sharp';
const MOCK='/Users/geiere/Downloads/PhotographerSite/Website/02 Portfolio/2d03c979-f10a-4f0c-b5a9-7a1ffa9d3276.png';
async function load(p){const img=sharp(p);const m=await img.metadata();const{data,info}=await img.ensureAlpha().raw().toBuffer({resolveWithObject:true});return{W:m.width,H:m.height,data,ch:info.channels};}
const im=await load(MOCK);
const S=1440/im.W;
const lum=(x,y)=>{const i=(y*im.W+x)*im.ch;return 0.299*im.data[i]+0.587*im.data[i+1]+0.114*im.data[i+2];};
const px=(x,y)=>{const i=(y*im.W+x)*im.ch;return[im.data[i],im.data[i+1],im.data[i+2]];};
const hex=([r,g,b])=>'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
console.log('mock',im.W,'x',im.H,'| scale->1440',S.toFixed(3),'| design H',(im.H*S).toFixed(0));
// bg at left edge x=6 classify
function bgRow(y){let s=0,n=0;for(let x=4;x<30;x++){s+=lum(x,y);n++;}return s/n;}
function cls(v){if(v<70)return 'DARK';if(v>245)return 'WHITE';if(v>232)return 'IVORY';return 'MID';}
let segs=[],cur=null,st=0;
for(let y=0;y<im.H;y++){const c=cls(bgRow(y));if(c!==cur){if(cur)segs.push([cur,st*S,y*S]);cur=c;st=y;}}
segs.push([cur,st*S,im.H*S]);
console.log('\nleft-edge bg segments (design px):');
for(const[c,a,b]of segs)if(b-a>12)console.log('  ',c.padEnd(6),`${a.toFixed(0)}-${b.toFixed(0)} h=${(b-a).toFixed(0)}`);
// sample bg colors
console.log('\nbg colors:');
console.log('  hero(top-left):',hex(px(8,120)));
console.log('  process band (~ y 1560 mock? use design 1560 -> mock):',hex(px(8,Math.round(1560/S))));
// hero left margin (dark serif on ivory, upper-left)
function leftEdge(yA,yB,frac=0.5,th=120){let mx=1e9;for(let y=yA;y<yB;y++)for(let x=0;x<im.W*frac;x++)if(lum(x,y)<th&&x<mx)mx=x;return mx*S;}
console.log('\nhero title left margin (design px):', leftEdge(Math.round(130/S),Math.round(220/S)).toFixed(0));
// hero "YOU, IN FULL" cap height: measure "Y" cap
function bbox(yA,yB,xA,xB,th=120){let miny=1e9,maxy=-1;for(let y=yA;y<yB;y++)for(let x=xA;x<xB;x++)if(lum(x,y)<th){if(y<miny)miny=y;if(y>maxy)maxy=y;}return{miny,maxy,h:maxy-miny};}
// YOU is around design y ~ 150-230; find in mock coords
const you=bbox(Math.round(140/S),Math.round(240/S),Math.round(80/S),Math.round(130/S));
console.log('hero "Y" cap:',JSON.stringify(you),'-> capPx@1440',(you.h*S).toFixed(0),'=> fontSize~',(you.h*S/0.70).toFixed(0));
