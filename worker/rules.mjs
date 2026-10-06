export function authorize(user,role) {if(!user)throw Object.assign(new Error('Unauthorized'),{status:401});if(role&&user.role!==role)throw Object.assign(new Error('Forbidden'),{status:403});return user;}
export function eligibility(profile,job) {
 if(!profile||!profile.department||!Number.isFinite(Number(profile.cgpa))||!profile.resume)return {eligible:false,reason:'Complete your department, CGPA and resume link before applying.'};
 if(Number(profile.cgpa)<Number(job.min_cgpa))return {eligible:false,reason:`This opening requires a minimum CGPA of ${job.min_cgpa}. Your CGPA is ${profile.cgpa}.`};
 const departments=typeof job.departments==='string'?JSON.parse(job.departments):job.departments;
 if(!departments.includes(profile.department))return {eligible:false,reason:`This opening accepts ${departments.join(', ')}. Your department is ${profile.department}.`};
 return {eligible:true,reason:'Your profile meets the eligibility criteria.'};
}
export const pipeline=['Applied','Shortlisted','Interview','Offered','Selected'];
export function canTransition(from,to) {return from!=='Selected'&&from!=='Rejected'&&(to==='Rejected'||pipeline.indexOf(to)===pipeline.indexOf(from)+1);}
