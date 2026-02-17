
import React from 'react';
import { FORMAT_PRESETS } from '../constants';
import { FormatPreset } from '../types';

interface SidebarProps {
  selectedId: string;
  onSelect: (preset: FormatPreset) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedId, onSelect }) => {
  const printItems = FORMAT_PRESETS.filter(f => f.category === 'PRINT');
  const socialItems = FORMAT_PRESETS.filter(f => f.category === 'SOCIAL MEDIA');

  return (
    <div className="w-64 border-r border-gray-200 h-screen overflow-y-auto bg-white flex flex-col p-4 mono text-[10px] tracking-widest uppercase">
      <div className="mb-8 border-b border-black pb-2">
        <h1 className="font-bold text-sm">FORMAT LAB</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-gray-400 mb-4 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> PRINT
        </h2>
        <ul className="space-y-1">
          {printItems.map(item => (
            <li 
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex justify-between p-2 cursor-pointer transition-colors ${selectedId === item.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              <span>{item.name}</span>
              <span className="opacity-50 text-[8px]">{Math.round(item.width)}x{Math.round(item.height)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-gray-400 mb-4 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> SOCIAL MEDIA
        </h2>
        <ul className="space-y-1">
          {socialItems.map(item => (
            <li 
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex justify-between p-2 cursor-pointer transition-colors ${selectedId === item.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            >
              <span>{item.name}</span>
              <span className="opacity-50 text-[8px]">{Math.round(item.width)}x{Math.round(item.height)}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-auto pt-8 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
            <span>DIMENSIONS</span>
            <span className="opacity-50">794 x 1123 PX</span>
        </div>
        <button className="w-full border border-black p-2 hover:bg-black hover:text-white transition-all text-center">
            GO TO ACADEMY
        </button>
      </div>
    </div>
  );
};
