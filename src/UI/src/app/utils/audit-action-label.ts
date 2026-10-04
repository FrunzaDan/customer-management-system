export function auditActionLabel(action: string): string {
  return action
    .replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
    .replace(/ ([A-Z])/g, (_, letter: string) => ` ${letter.toLowerCase()}`);
}
