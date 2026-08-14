export function isInternalTemplateLabel(value: string) {
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(value) && !value.includes(' ');
}
