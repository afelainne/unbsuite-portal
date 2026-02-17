import React, { forwardRef } from 'react';
import { MockupTemplate } from '../templates';

interface DeviceFrameProps {
  template: MockupTemplate;
  imageSrc: string | null;
  bgColor: string;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  fieldValues?: Record<string, string>;
  avatarSrc?: string | null;
}

const DeviceFrame = forwardRef<SVGSVGElement, DeviceFrameProps>(
  ({ template, imageSrc, bgColor, zoom = 1, offsetX = 0, offsetY = 0, fieldValues = {}, avatarSrc = null }, ref) => {
    const { viewBox, screen, frameSvg, bgSvg, editableFields } = template;
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
          {/* Avatar clip paths */}
          {editableFields?.filter(f => f.type === 'avatar').map(f => (
            <clipPath key={`avatar-clip-${f.id}`} id={`avatar-clip-${template.id}-${f.id}`}>
              <circle cx={f.cx!} cy={f.cy!} r={f.r!} />
            </clipPath>
          ))}
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

        {/* Render editable fields */}
        {editableFields?.map(field => {
          if (field.type === 'avatar') {
            const avatarClipId = `avatar-clip-${template.id}-${field.id}`;
            if (avatarSrc) {
              return (
                <image
                  key={field.id}
                  href={avatarSrc}
                  x={field.cx! - field.r!}
                  y={field.cy! - field.r!}
                  width={field.r! * 2}
                  height={field.r! * 2}
                  clipPath={`url(#${avatarClipId})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              );
            }
            // Placeholder circle
            return (
              <circle
                key={field.id}
                cx={field.cx!}
                cy={field.cy!}
                r={field.r!}
                fill={template.id.includes('story') ? 'none' : '#e0e0e0'}
                stroke={template.id.includes('story') ? '#fff' : '#ccc'}
                strokeWidth={template.id.includes('story') ? 2 : 1.5}
              />
            );
          }

          // Text field
          const value = fieldValues[field.id] ?? field.defaultValue;
          return (
            <text
              key={field.id}
              x={field.x}
              y={field.y}
              fontFamily={field.fontFamily || 'sans-serif'}
              fontSize={field.fontSize || 13}
              fontWeight={field.fontWeight || 'normal'}
              fill={field.fill || '#262626'}
              textAnchor={field.textAnchor}
            >
              {value}
            </text>
          );
        })}
      </svg>
    );
  }
);

DeviceFrame.displayName = 'DeviceFrame';
export default DeviceFrame;
