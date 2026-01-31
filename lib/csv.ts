export function escapeCsv(value: string | undefined | null): string {
    if (value === undefined || value === null) {
        return '';
    }

    const stringValue = String(value);

    // If the value contains quotes, commas, or newlines, it needs to be quoted.
    // Quotes inside the value must be doubled.
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}
