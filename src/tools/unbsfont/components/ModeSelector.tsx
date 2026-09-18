import React from 'react';
import { ArrowLeft, LayoutGrid, PanelsTopLeft } from 'lucide-react';
import { IconButton, TitleRow } from './ui';

interface ModeSelectorProps {
    onSelectMode: (mode: 'COMPACT' | 'ADVANCED') => void;
    isDarkMode: boolean;
    /** Nome da família aberta, para o breadcrumb. */
    familyName?: string;
    onBack?: () => void;
}

const MODES = [
    {
        id: 'COMPACT' as const,
        icon: <PanelsTopLeft className="w-4 h-4" aria-hidden="true" />,
        label: 'Compacto',
        badge: 'Recomendado',
        items: [
            'Uma tela só, com a lista de glifos ao lado',
            'Edição rápida: carregar, colar e ajustar',
            'Espaçamento e kerning automáticos',
            'Para montar uma fonte depressa',
        ],
    },
    {
        id: 'ADVANCED' as const,
        icon: <LayoutGrid className="w-4 h-4" aria-hidden="true" />,
        label: 'Avançado',
        badge: 'Controle total',
        items: [
            'Grade completa, separada por categoria',
            'Editor vetorial com guias de métrica',
            'Gerenciador de espaçamento e diagnóstico',
            'Para o trabalho tipográfico detalhado',
        ],
    },
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode, familyName, onBack }) => {
    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-[1240px] mx-auto w-full px-5 md:px-10 pt-6 md:pt-8 pb-24">
                <TitleRow
                    title="Modo de edição"
                    crumb={familyName || 'Sem nome'}
                    actions={
                        onBack && (
                            <IconButton label="Voltar aos projetos" variant="surface" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                            </IconButton>
                        )
                    }
                />
                <p className="mt-3 text-[14px] text-muted-foreground">Escolha como quer trabalhar nesta fonte. Dá para trocar depois.</p>

                <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {MODES.map(mode => (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => onSelectMode(mode.id)}
                            className="material-card group text-left flex flex-col gap-5 transition-shadow duration-fast ease-out hover:shadow-hairline-strong"
                        >
                            <span className="flex items-center justify-between gap-3 w-full">
                                <span className="w-10 h-10 rounded-md bg-fill-2 text-foreground flex items-center justify-center transition-colors duration-fast ease-out group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:w-[18px] [&_svg]:h-[18px]">
                                    {mode.icon}
                                </span>
                                <span className="chip">{mode.badge}</span>
                            </span>
                            <span className="text-[28px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{mode.label}</span>
                            <ul className="flex flex-col w-full">
                                {mode.items.map((item, i) => (
                                    <li
                                        key={item}
                                        className={`text-[14px] text-muted-foreground py-2.5 ${i < mode.items.length - 1 ? 'hairline-b' : ''}`}
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModeSelector;
