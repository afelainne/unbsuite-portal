import * as React from 'react';

/**
 * Overlapping collaborator faces. On their own they read as a plain stack; give
 * them an action label and the whole thing becomes the black Share control seen
 * in the workspace header.
 */
export interface Person { name?: string; src?: string; initials?: string }
export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  people: Person[];
  /** Avatar edge in px. @default 30 */
  size?: number;
  /** px each face overlaps the previous one. @default 8 */
  overlap?: number;
  /** Turns the stack into a black pill with this trailing label, e.g. "Share". */
  action?: React.ReactNode;
  /** Same treatment but for a count, e.g. "140+ users". */
  count?: React.ReactNode;
}
export function AvatarStack(props: AvatarStackProps): JSX.Element;
