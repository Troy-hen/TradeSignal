/**
 * Accept either a postcode district (NR15) or a full UK postcode (NR15 4AB)
 * and return the district used by the territory data model.
 */
export function normalisePostcodeDistrict(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ");
  const compact = cleaned.replace(/\s/g, "");
  const fullPostcode = compact.match(/^([A-Z]{1,2}\d[A-Z]?)(\d[A-Z]{2})$/);

  return fullPostcode?.[1] ?? cleaned.split(" ")[0] ?? "";
}
