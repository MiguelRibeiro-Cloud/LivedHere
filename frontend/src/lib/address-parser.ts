export interface ParsedAddressSuggestion {
  streetName: string | null;
  streetNumber: number | null;
}

export interface AddressParser {
  parseFreeformAddress(input: string, locale: 'en' | 'pt'): ParsedAddressSuggestion;
}

class DeterministicAddressParser implements AddressParser {
  parseFreeformAddress(input: string): ParsedAddressSuggestion {
    const match = input.match(/^(.*?)(?:\s*,\s*|\s+)(\d{1,5})\s*$/);
    if (!match) {
      return { streetName: input.trim() || null, streetNumber: null };
    }

    const streetName = match[1]?.trim() || null;
    const streetNumber = match[2] ? Number(match[2]) : null;

    return { streetName, streetNumber };
  }
}

export const addressParser: AddressParser = new DeterministicAddressParser();
