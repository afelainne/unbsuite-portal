import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useLanguage, LANGUAGES } from '../i18n';
import { TITLE_ICON_BTN } from './chrome-classes';

/**
 * Language picker for the title row: a square button that shows the active
 * code (EN / PT / ES) and opens the three languages in a small list. The
 * chosen one is the system's selection, black fill with white text.
 */
const LanguageSelect: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t.lang.aria}: ${t.lang[language]}`}
          title={t.lang.aria}
          aria-expanded={open}
          className={`${TITLE_ICON_BTN} text-[13px] font-medium tabular-nums ${open ? 'ctl-active' : ''} ${className}`}
        >
          {language.toUpperCase()}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-[200px] p-1.5 rounded-lg">
        <div role="group" aria-label={t.lang.aria} className="space-y-0.5">
          {LANGUAGES.map(code => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={language === code}
              data-active={language === code ? 'true' : undefined}
              className="row"
              onClick={() => { setLanguage(code); setOpen(false); }}
            >
              <span className="w-7 shrink-0 text-footnote font-medium tabular-nums opacity-70">{code.toUpperCase()}</span>
              <span className="flex-1 truncate">{t.lang[code]}</span>
              {language === code && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSelect;
