import {buildInsights,detectSector} from './sector.ts';
const a={handle:'aristokrat_travel',name:'Aristokrat Travel Azerbaijan',category:'Travel Company',bio:'12 İLLİK PEŞƏKAR TƏCRÜBƏ\n•📱Mob:+99451 409 50 00\n•📱Mob:+99455 409 50 00',link:'https://wa.me/+994554095000',followers:18076,er:.2,avg_likes:36,avg_views:46,med_views:40,max_views:75,posts_30d:12,reels_share:50,days_since_last:6,analysed:12,top:[{likes:408},{likes:5},{likes:4}]};
console.log(JSON.stringify(buildInsights(a),null,1));
for(const x of [{category:'Education',name:'İngilis dili • SAT'},{name:'Social Baku',bio:''},{category:'Restaurant',name:'Qaysı Lounge'},{name:'Bar Atelier',bio:'Geyim mağazası'},{name:'Ruin',bio:'Lounge bar'}])console.log(x.name,'=>',detectSector(x));
