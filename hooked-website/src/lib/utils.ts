import clsx from 'clsx';

export function cn(...inputs: (string | number | boolean | undefined | null | object)[]) {
  return clsx(inputs);
}
