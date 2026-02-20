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
  const bg = bgColor || theme?.slideBackground || '#FFFFFF';
  const textColor = theme?.slideTextColor || '#111111';

  return (
    <div
      id={id}
      className={cn('unbsid-slide absolute inset-0 overflow-hidden', className)}
      style={{
        backgroundColor: bg,
        color: textColor,
        fontFamily: theme?.headingFont,
      }}
    >
      {noPadding ? children : (
        <div className="absolute inset-0 px-10 py-8 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageSlide;
