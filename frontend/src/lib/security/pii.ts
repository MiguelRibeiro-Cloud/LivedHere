const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/;
const handleRegex = /@[a-zA-Z0-9_]{2,}/;
const unitRegex = /\b(apt|apartment|floor|3º|esq|dir|left|right|unit|door|andar|fração|fracção)\b/i;
const severeCrimeRegex = /\b(murder|rape|traffick|pedophile|terrorist|assassin|homicide)\b/i;
const harassmentRegex = /\b(idiot|stupid|moron|scum|trash|verme|ot[áa]rio)\b/i;

export function scanPII(text: string): { flagged: boolean; reasons: string[]; block: boolean } {
  const reasons: string[] = [];
  let block = false;

  if (!text) {
    return { flagged: false, reasons, block: false };
  }

  if (emailRegex.test(text)) {
    reasons.push('email');
    block = true;
  }
  if (phoneRegex.test(text)) {
    reasons.push('phone');
    block = true;
  }
  if (handleRegex.test(text)) {
    reasons.push('social_handle');
    block = true;
  }
  if (unitRegex.test(text)) {
    reasons.push('unit_identifier');
    block = true;
  }
  if (severeCrimeRegex.test(text)) {
    reasons.push('serious_crime_accusation');
    block = true;
  }
  if (harassmentRegex.test(text)) {
    reasons.push('harassment');
  }

  return { flagged: reasons.length > 0, reasons, block };
}
