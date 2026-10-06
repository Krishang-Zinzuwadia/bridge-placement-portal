// Used by both API validation and student eligibility views.
export function isOpenDeadline(value,now=Date.now()) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const end=new Date(value+'T23:59:59Z');
 return Number.isFinite(end.getTime())&&end.toISOString().slice(0,10)===value&&end.getTime()>=now;
}
