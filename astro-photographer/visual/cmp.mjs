import sharp from 'sharp';
const MOCK='/Users/geiere/Downloads/PhotographerSite/Website/02 Portfolio/2d03c979-f10a-4f0c-b5a9-7a1ffa9d3276.png';
const REND='visual/out/portfolio-desktop.png';
async function load(p){const img=sharp(p);const m=await img.metadata();const{data,info}=await img.ensureAlpha().raw().toBuffer({resolveWithObject:true});return{W:m.width,H:m.height,data,ch:info.channels};}
const lum=(im,x,y)=>{const i=(y*im.W+x)*im.ch;return 0.299*im.data[i]+0.587*im.data[i+1]+0.114*im.data[i+2];};
function bgRow(im,y){let s=0,n=0;for(let x=4;x<30;x++){s+=lum(im,x,y);n++;}return s/n;}
function cls(v){if(v<70)return 'DARK';if(v>245)return 'WHITE';if(v>232)return 'IVORY';return 'MID';}
function segs(im,S){let r=[],cur=null,st=0;for(let y=0;y<im.H;y++){const c=cls(bgRow(im,y));if(c!==cur){if(cur)r.push([cur,st*S,y*S]);cur=c;st=y;}}r.push([cur,st*S,im.H*S]);return r.filter(([c,a,b])=>b-a>12);}
const mock=await load(MOCK),rend=await load(REND);
const ms=1440/mock.W, rs=1440/rend.W;
console.log('MOCK design H',(mock.H*ms).toFixed(0),' REND design H',(rend.H*rs).toFixed(0));
console.log('\nMOCK left-edge segments:');for(const[c,a,b]of segs(mock,ms))console.log('  ',c.padEnd(6),`${a.toFixed(0)}-${b.toFixed(0)} h=${(b-a).toFixed(0)}`);
console.log('\nREND left-edge segments:');for(const[c,a,b]of segs(rend,rs))console.log('  ',c.padEnd(6),`${a.toFixed(0)}-${b.toFixed(0)} h=${(b-a).toFixed(0)}`);
