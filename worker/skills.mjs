import catalog from '../shared/skills.json' with {type:'json'};
const available=new Map(catalog.flatMap(category=>category.skills).map(skill=>[skill.toLowerCase(),skill]));
const fail=message=>{throw Object.assign(new Error(message),{status:400})};
export function normalizeSkills(value){
 if(!Array.isArray(value))fail('Select skills using an array.');
 if(value.length>250)fail('Select up to 250 skills from the catalog.');
 const selected=[];
 for(const raw of value){if(typeof raw!=='string')fail('Choose skills from the catalog.');const skill=available.get(raw.trim().toLowerCase());if(!skill)fail('Choose skills from the catalog.');if(!selected.includes(skill))selected.push(skill);}
 return selected;
}
