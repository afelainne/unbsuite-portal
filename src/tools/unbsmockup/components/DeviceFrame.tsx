import React, { forwardRef } from 'react';
import { MockupTemplate } from '../templates';

interface DeviceFrameProps {
  template: MockupTemplate;
  imageSrc: string | null;
  bgColor: string;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

const DeviceFrame = forwardRef<SVGSVGElement, DeviceFrameProps>(
  ({ template, imageSrc, bgColor, zoom = 1, offsetX = 0, offsetY = 0 }, ref) => {
    const { viewBox, screen, frameSvg, bgSvg } = template;
    const clipId = `clip-${template.id}`;

    // Calculate image dimensions with zoom and offset
    const imageWidth = screen.width * zoom;
    const imageHeight = screen.height * zoom;
    const imageX = screen.x - (imageWidth - screen.width) / 2 + offsetX * screen.width;
    const imageY = screen.y - (imageHeight - screen.height) / 2 + offsetY * screen.height;

    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ maxHeight: '70vh' }}
      >
        {bgSvg ? (
          <g dangerouslySetInnerHTML={{ __html: bgSvg }} />
        ) : (
          <rect x="0" y="0" width={template.width} height={template.height} fill={bgColor} rx="8" />
        )}

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

        <rect
          x={screen.x}
          y={screen.y}
          width={screen.width}
          height={screen.height}
          rx={screen.rx || 0}
          fill={imageSrc ? 'transparent' : '#1a1a1a'}
        />

        {imageSrc && (
          <image
            href={imageSrc}
            x={imageX}
            y={imageY}
            width={imageWidth}
            height={imageHeight}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        <g dangerouslySetInnerHTML={{ __html: frameSvg }} />
      </svg>
    );
  }
);

DeviceFrame.displayName = 'DeviceFrame';
export default DeviceFrame;
