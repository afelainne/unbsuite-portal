import React, { useRef, forwardRef } from 'react';
import { MockupTemplate } from '../templates';

interface DeviceFrameProps {
  template: MockupTemplate;
  imageSrc: string | null;
  bgColor: string;
}

const DeviceFrame = forwardRef<SVGSVGElement, DeviceFrameProps>(
  ({ template, imageSrc, bgColor }, ref) => {
    const { viewBox, screen, frameSvg, bgSvg } = template;
    const clipId = `clip-${template.id}`;

    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ maxHeight: '70vh' }}
      >
        {/* Background */}
        {bgSvg ? (
          <g dangerouslySetInnerHTML={{ __html: bgSvg }} />
        ) : (
          <rect x="0" y="0" width={template.width} height={template.height} fill={bgColor} rx="8" />
        )}

        {/* Clip path for screen area */}
        <defs>
          <clipPath id={clipId}>
            <rect
              x={screen.x}
              y={screen.y}
              width={screen.width}
              height={screen.height}
              rx={screen.rx || 0}
            />
          </clipPath>
        </defs>

        {/* Screen background */}
        <rect
          x={screen.x}
          y={screen.y}
          width={screen.width}
          height={screen.height}
          rx={screen.rx || 0}
          fill={imageSrc ? 'transparent' : '#1a1a1a'}
        />

        {/* User image clipped to screen */}
        {imageSrc && (
          <image
            href={imageSrc}
            x={screen.x}
            y={screen.y}
            width={screen.width}
            height={screen.height}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* Device frame overlay */}
        <g dangerouslySetInnerHTML={{ __html: frameSvg }} />
      </svg>
    );
  }
);

DeviceFrame.displayName = 'DeviceFrame';
export default DeviceFrame;
