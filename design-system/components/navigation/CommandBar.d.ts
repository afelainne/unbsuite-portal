import * as React from 'react';

/**
 * The floating black AI composer. Mint launcher square on the left, centred
 * placeholder, translucent utility squares on the right, and an optional rail
 * of suggested prompts tucked in behind its top edge. One per screen, pinned
 * to the bottom centre.
 *
 * @startingPoint section="Navigation" subtitle="Floating black AI composer with suggested prompts" viewport="700x200"
 */
export interface CommandBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "Ask anything or search" */
  placeholder?: string;
  value?: string;
  onChange?: (next: string) => void;
  onSubmit?: (value: string) => void;
  /** Prompt strings shown in the rail above the bar. */
  suggestions?: string[];
  onSuggestion?: (value: string) => void;
  /** Replaces the default microphone + grid utility squares. */
  actions?: React.ReactNode;
  /** px width of the bar. @default 640 */
  width?: number;
  /** Applies the large drop shadow. @default true */
  floating?: boolean;
}
export function CommandBar(props: CommandBarProps): JSX.Element;
