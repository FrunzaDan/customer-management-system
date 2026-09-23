// The API sends audit actions by their enum name ("SalaryChanged"); this is how they read in
// the UI ("Salary changed"). One-word names read the same either way. Takes any action name,
// so this file is the same in the customer, employee and Imalo apps.
export function auditActionLabel(action: string): string {
  return action
    .replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
    .replace(/ ([A-Z])/g, (_, letter: string) => ` ${letter.toLowerCase()}`);
}
