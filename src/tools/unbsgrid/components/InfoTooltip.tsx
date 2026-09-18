import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useLanguage } from '../i18n';

interface InfoTooltipProps {
  content: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => {
  const { t } = useLanguage();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t.common.moreInfo}
          className="ctl ctl-plain ctl-icon shrink-0 text-muted-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[240px] text-footnote text-popover-foreground"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

export default InfoTooltip;
