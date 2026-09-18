import * as React from 'react';

/**
 * 40x22 toggle. On = mint track with a black knob (the brand's on-state pairing);
 * off = light-gray track with a white knob.
 */
export interface SwitchProps extends React.HTMLAttributes<HTMLLabelElement> {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}
export function Switch(props: SwitchProps): JSX.Element;
