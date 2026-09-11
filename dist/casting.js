import { hash, person, contractQuote, eligible } from './career.js';
import { affinity } from './relationships.js';
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const castIds = d => [d.director, ...(d.leads || []), ...(d.supports || [])].filter(Boolean);
export const projectIds = d => [d.script?.writer, ...castIds(d)].filter(Boolean);
/** The same script/team yields the same offer. Reopening a card cannot reroll it. */
export function offerFingerprint(s, d, pid) {
  return JSON.stringify([s.relationSeed ?? s.seed, d.script?.id, d.script?.quality,
    [...d.genres].sort(), d.scale, d.director === pid ? null : d.director,
    projectIds(d).filter(id => id !== pid).sort(), pid, s.relationRevision ?? 0]);
}
export function castingOffer(s, d, pid) {
  const p = person(s, pid);
  if (!p) throw Error('섭외할 인물을 찾을 수 없습니다.');
  const fingerprint = offerFingerprint(s, d, pid);
  const peers = projectIds(d).filter(id => id !== pid);
  const fee = round(contractQuote(s, p, projectIds(d), d.company ?? 'c0').fee * ({ small: .75, medium: 1, large: 1.35 }[d.scale] ?? 1));
  const busy=s.films.find(f=>['production','reshoot'].includes(f.status)&&[f.script.writer,...castIds(f),...(f.cameos??[])].includes(pid));
  if(busy)return {person:pid,fingerprint,status:'refused',blocked:true,reasons:[`「${busy.title}」 촬영·제작 일정이 진행 중입니다.`],fee,percent:0,extra:0,total:fee,message:'동시 촬영 일정으로 섭외할 수 없습니다.'};
  const company = affinity(s, pid, d.company ?? 'c0');
  const weakest = peers.map(id => ({ id, score: affinity(s, pid, id) })).sort((a, b) => a.score - b.score)[0];
  const fit = d.genres.some(g => p.genres.includes(g));
  const reasons = [];
  if (d.script.quality < 70) reasons.push({ kind: 'script', weight: 12, text: `시나리오 완성도 ${d.script.quality}점에 우려가 있습니다.` });
  if (!fit) reasons.push({ kind: 'genre', weight: 9, text: '전문 장르와 달라 준비 기간과 연기·연출 부담이 큽니다.' });
  if (company < 35) reasons.push({ kind: 'company', weight: 12, text: '제작사와의 신뢰 관계가 아직 부족합니다.' });
  if (weakest && weakest.score < 35) {
    const role = weakest.id === d.director ? '감독' : weakest.id === d.script.writer ? '작가' : '동료';
    reasons.push({ kind: 'relationship', weight: 16, text: `${person(s, weakest.id)?.name ?? '제작진'} ${role}와의 관계가 ${weakest.score}/100으로 좋지 않습니다.` });
  }
  const risk = clamp(1 + reasons.reduce((n, r) => n + r.weight * .16, 0), 1, 11);
  const roll = hash(fingerprint + ':response') % 100;
  const refusal = roll < risk && reasons.length > 0;
  const surcharge = !refusal && reasons.length > 0 && roll < risk + 48;
  const percent = surcharge ? clamp(10 + reasons.length * 5 + hash(fingerprint + ':fee') % 11, 15, 40) : 0;
  const extra = round(fee * percent / 100);
  return { person: pid, fingerprint, status: refusal ? 'refused' : surcharge ? 'counter' : 'accepted',
    reasons: reasons.map(r => r.text), fee, percent, extra, total: round(fee + extra),
    message: refusal ? '이번 작품의 섭외를 정중히 사양했습니다.' : surcharge ? `추가 개런티 ${percent}%를 조건으로 참여를 제안했습니다.` : '제안한 작품과 제작진에 동의했습니다.' };
}
export function negotiationReport(s, d) {
  return castIds(d).map(id => {
    const offer = castingOffer(s, d, id), signed = d.castingAgreements?.[id];
    return { ...offer, confirmed: offer.status === 'accepted' || (offer.status === 'counter' && signed?.fingerprint === offer.fingerprint && signed.accepted === true) };
  });
}
export function acceptOffers(s, d) {
  const reports = negotiationReport(s, d);
  if (reports.some(r => r.status === 'refused')) throw Error('섭외를 거절한 인물을 먼저 교체해 주세요.');
  d.castingAgreements ??= {};
  for (const r of reports) d.castingAgreements[r.person] = { fingerprint: r.fingerprint, accepted: true, total: r.total, extra: r.extra };
  return reports;
}
export function validateNegotiations(s, d) {
  if (!d.requireNegotiation) return;
  const reports = negotiationReport(s, d);
  if (reports.some(r => r.status === 'refused')) throw Error('섭외를 거절한 제작진이 있습니다. 인물을 교체해 주세요.');
  if (reports.some(r => !r.confirmed)) throw Error('추가 개런티 조건을 확인하고 수락해 주세요.');
}

/** Resolve a selected role from the draft, not from mutable UI indices. */
export function replacementSlot(d, id) {
  if (!id || !d) throw Error('교체할 인물을 찾을 수 없습니다.');
  if (d.director === id) return { role: 'director', index: 0 };
  for (const [field, role] of [['leads', 'lead'], ['supports', 'support']]) {
    const index = (d[field] || []).indexOf(id);
    if (index >= 0) return { role, index };
  }
  throw Error('기존 캐스팅이 변경되었습니다. 최종 섭외 조건에서 다시 교체해 주세요.');
}
/** Pure preview: replacing one role invalidates signatures for the entire team.
 * No cash, relationships, history, or original selections are changed here.
 * The caller commits this draft only after the candidate's reply is accepted.
 */
export function castingReplacement(s, d, previousId, nextId) {
  const slot = replacementSlot(d, previousId), p = person(s, nextId);
  if (!p || p.role !== slot.role) throw Error('동일한 직군의 인물을 선택해 주세요.');
  if (projectIds(d).includes(nextId)) throw Error('이미 선정된 인물은 중복 섭외할 수 없습니다.');
  if (!eligible(s, p, d.genres)) throw Error('활동 상태 또는 배역 조건상 섭외할 수 없습니다.');
  const busy = s.films.find(f => ['production', 'reshoot'].includes(f.status) &&
    [...projectIds(f), ...(f.cameos || [])].includes(nextId));
  if (busy) throw Error(`「${busy.title}」 촬영·제작 중이므로 섭외할 수 없습니다.`);
  const next = structuredClone(d);
  if (slot.role === 'director') next.director = nextId;
  else next[slot.role === 'lead' ? 'leads' : 'supports'][slot.index] = nextId;
  next.requireNegotiation = true;
  next.castingAgreements = {};
  return next;
}
