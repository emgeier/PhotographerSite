import sharp from 'sharp';
const MOCK='/Users/geiere/Downloads/PhotographerSite/Website/02 Portfolio/2d03c979-f10a-4f0c-b5a9-7a1ffa9d3276.png';
async function load(p){const img=sharp(p);const m=await img.metadata();const{data,info}=await img.ensureAlpha().raw().toBuffer({resolveWithObject:true});return{W:m.width,H:m.height,data,ch:info.channels};}
const im=await load(MOCK);const S=1440/im.W;
const lum=(x,y)=>{const i=(y*im.W+x)*im.ch;return 0.299*im.data[i]+0.587*im.data[i+1]+0.114*im.data[i+2];};
// hero: dark text left column. Scan mock rows 60-170 (design ~120-340), x in left 40%
function leftEdge(yA,yB,frac=0.4,th=120){let mx=1e9;for(let y=yA;y<yB;y++)for(let x=4;x<im.W*frac;x++)if(lum(x,y)<th&&x<mx)mx=x;return mx;}
const he=leftEdge(60,180);
console.log('hero text left edge: mock',he,'-> design',(he*S).toFixed(0));
// "YOU," cap height: find dark band rows in left col (mock x 40-120), rows 70-130
function darkRows(yA,yB,xA,xB,th=120,minDark=2){let r=[],s=-1;for(let y=yA;y<yB;y++){let c=0;for(let x=xA;x<xB;x++)if(lum(x,y)<th)c++;const on=c>minDark;if(on&&s<0)s=y;else if(!on&&s>=0){if(y-s>=2)r.push([s,y,y-s]);s=-1;}}if(s>=0)r.push([s,yB,yB-s]);return r;}
console.log('hero title bands (mock y, design h):');
for(const[a,b,h]of darkRows(55,180,Math.round(he),Math.round(he+90)))console.log('  y'+a+'-'+b,'h='+h,'->',(h*S).toFixed(0)+'px@1440','fs~'+(h*S/0.70).toFixed(0));
// grid: find the 3 image rows + gaps between 639 and ~1960 design. Use mid-column x to detect image(dark-ish) vs white gaps
const gx=Math.round(im.W*0.5);
function colProfile(yA,yB){let out=[];for(let y=yA;y<yB;y++){out.push(lum(gx,y));}return out;}
// white gaps between rows: rows where lum>245 across full width
function whiteRows(yA,yB){let r=[],s=-1;for(let y=yA;y<yB;y++){let white=true;for(let x=0;x<im.W;x+=6)if(lum(x,y)<238){white=false;break;}if(white&&s<0)s=y;else if(!white&&s>=0){if(y-s>=2)r.push([s*S,y*S]);s=-1;}}if(s>=0)r.push([s*S,yB*S]);return r;}
console.log('\nwhite gaps in grid region (design px):');
for(const[a,b]of whiteRows(Math.round(639/S),Math.round(1980/S)))if(b-a>8)console.log('  '+a.toFixed(0)+'-'+b.toFixed(0)+' h='+(b-a).toFixed(0));
