import { Palette } from 'lucide-react';
import { THEMES, ManualTheme } from '../themes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ThemePickerProps {
  currentThemeId: string;
  onChange: (themeId: string) => void;
}

function ThemePreview({ theme }: { theme: ManualTheme }) {
  return (
    <div
      className="w-full h-9 rounded overflow-hidden flex"
      style={{ background: theme.coverBg }}
    >
      {/* Mini slide preview */}
      <div className="flex-1 p-1.5 flex flex-col justify-between">
        <div className="h-1 rounded-full w-2/3" style={{ background: theme.coverAccent, opacity: 0.9 }} />
        <div className="h-0.5 rounded-full w-1/2" style={{ background: theme.coverTextColor, opacity: 0.4 }} />
      </div>
      <div className="w-3 flex-shrink-0" style={{ background: theme.coverAccent, opacity: 0.8 }} />
    </div>
  );
}

const ThemePicker = ({ currentThemeId, onChange }: ThemePickerProps) => {
  const currentTheme = THEMES.find((t) => t.id === currentThemeId) ?? THEMES[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-foreground/10 hover:border-foreground/30 transition-colors text-xs text-muted-foreground hover:text-foreground">
          <Palette className="h-3.5 w-3.5" />
          <span>{currentTheme.emoji} {currentTheme.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tema do Manual</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => {
            const isActive = theme.id === currentThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => onChange(theme.id)}
                className="flex flex-col gap-1.5 p-2 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: isActive ? theme.accentColor : 'transparent',
                  background: isActive ? `${theme.accentColor}10` : 'hsl(var(--muted)/0.4)',
                }}
              >
                <ThemePreview theme={theme} />
                <div>
                  <p className="text-[11px] font-semibold leading-tight">{theme.emoji} {theme.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemePicker;
