import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ManualTheme } from '../themes';

interface PageSlideProps {
  children: ReactNode;
  className?: string;
  bgColor?: string;
  id?: string;
  /** Se true, remove o padding padrão para slides que controlam o próprio layout */
  noPadding?: boolean;
  theme?: ManualTheme;
}

const PageSlide = ({ children, className, bgColor, id, noPadding = false, theme }: PageSlideProps) => {
  const bg = bgColor || theme?.slideBackground || undefined;
  const textColor = theme?.slideTextColor || undefined;

  return (
    <div
      id={id}
      className={cn(
        'unbsid-slide relative w-full overflow-hidden',
        !noPadding && 'px-12 py-10',
        className
      )}
      style={{
        aspectRatio: '16/9',
        backgroundColor: bg,
        color: textColor,
        fontFamily: theme?.headingFont,
        // Grid base de 8pt como guia visual sutil
        backgroundImage: bg
          ? undefined
          : 'radial-gradient(circle, hsl(var(--foreground)/0.04) 1px, transparent 1px)',
        backgroundSize: bg ? undefined : '8px 8px',
      }}
    >
      {children}
    </div>
  );
};

export default PageSlide;
