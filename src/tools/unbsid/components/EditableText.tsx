import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

const EditableText = ({
  value,
  onChange,
  as: Tag = 'span',
  className,
  placeholder = 'Clique para editar…',
  multiline = false,
}: EditableTextProps) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Selecionar tudo
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const handleDoubleClick = () => setEditing(true);

  const commit = () => {
    setEditing(false);
    if (localValue !== value) onChange(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            'bg-transparent border-b border-dashed border-foreground/40 outline-none resize-none w-full',
            className
          )}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-transparent border-b border-dashed border-foreground/40 outline-none w-full',
          className
        )}
      />
    );
  }

  return (
    <Tag
      onDoubleClick={handleDoubleClick}
      title="Clique duplo para editar"
      className={cn(
        'cursor-text group relative',
        !value && 'opacity-40',
        className
      )}
    >
      {value || placeholder}
      <span className="absolute -top-4 left-0 text-[8px] uppercase tracking-widest text-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        duplo clique para editar
      </span>
    </Tag>
  );
};

export default EditableText;
