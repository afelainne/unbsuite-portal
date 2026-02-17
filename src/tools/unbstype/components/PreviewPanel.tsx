import React from 'react';

interface PreviewPanelProps {
  headingFont: string;
  bodyFont: string;
  context: string;
  fgColor?: string;
  bgColor?: string;
}

const LOREM = "A tipografia é a arte e o processo de criação na composição de um texto, física ou digitalmente. Sua composição é realizada através da seleção de fontes, arranjo de layout e ajustes de espaçamento entre caracteres.";

const LOREM_LONG = `${LOREM}\n\nA escolha de uma boa combinação tipográfica é essencial para criar hierarquia visual, transmitir personalidade e garantir legibilidade. Um par tipográfico bem escolhido pode elevar completamente o design de qualquer projeto.`;

const PreviewPanel: React.FC<PreviewPanelProps> = ({ headingFont, bodyFont, context, fgColor, bgColor }) => {
  const h = `'${headingFont}', serif`;
  const b = `'${bodyFont}', sans-serif`;
  const fg = fgColor || 'inherit';
  const bg = bgColor || 'transparent';

  const wrapStyle: React.CSSProperties = { backgroundColor: bg, color: fg, padding: bg !== 'transparent' ? '2rem' : 0, borderRadius: '0.75rem', transition: 'all 0.3s ease' };

  if (context === 'hero') {
    return (
      <div style={wrapStyle}>
        <div className="space-y-6 text-center max-w-2xl mx-auto">
          <h1 style={{ fontFamily: h, fontSize: '56px', lineHeight: 1.1, fontWeight: 700, color: fg }}>
            Design que transforma ideias em realidade
          </h1>
          <p style={{ fontFamily: b, fontSize: '20px', lineHeight: 1.6, opacity: 0.7, color: fg }}>
            Ferramentas profissionais para designers que buscam excelência visual.
          </p>
          <p style={{ fontFamily: b, fontSize: '15px', lineHeight: 1.8, opacity: 0.5, maxWidth: '500px', margin: '0 auto', color: fg }}>
            {LOREM}
          </p>
        </div>
      </div>
    );
  }

  if (context === 'article') {
    return (
      <div style={wrapStyle}>
        <div className="max-w-xl mx-auto space-y-5">
          <h1 style={{ fontFamily: h, fontSize: '34px', lineHeight: 1.2, fontWeight: 700, color: fg }}>
            A importância da tipografia no design moderno
          </h1>
          <p style={{ fontFamily: b, fontSize: '11px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.15em', color: fg }}>
            Por Designer Studio · 5 min de leitura
          </p>
          <p style={{ fontFamily: b, fontSize: '16px', lineHeight: 1.9, color: fg }}>{LOREM_LONG}</p>
          <h2 style={{ fontFamily: h, fontSize: '24px', lineHeight: 1.3, fontWeight: 700, color: fg }}>
            Hierarquia e contraste
          </h2>
          <p style={{ fontFamily: b, fontSize: '16px', lineHeight: 1.9, color: fg }}>{LOREM}</p>
        </div>
      </div>
    );
  }

  if (context === 'ui') {
    const borderColor = fgColor ? `${fgColor}22` : undefined;
    return (
      <div style={wrapStyle}>
        <div className="max-w-md mx-auto space-y-5">
          <div className="rounded-xl p-5 space-y-3" style={{ border: `1px solid ${borderColor || 'hsl(var(--border))'}` }}>
            <h3 style={{ fontFamily: h, fontSize: '18px', fontWeight: 700, color: fg }}>Dashboard</h3>
            <p style={{ fontFamily: b, fontSize: '13px', opacity: 0.6, color: fg }}>Bem-vindo de volta ao seu painel de controle.</p>
            <div className="flex gap-2">
              <div className="px-4 py-2 rounded-lg" style={{ fontFamily: b, fontSize: '12px', fontWeight: 600, backgroundColor: fg, color: bg || 'hsl(var(--background))' }}>
                Criar Projeto
              </div>
              <div className="px-4 py-2 rounded-lg" style={{ fontFamily: b, fontSize: '12px', border: `1px solid ${borderColor || 'hsl(var(--border))'}`, color: fg }}>
                Configurações
              </div>
            </div>
          </div>
          <div className="rounded-xl p-5 space-y-3" style={{ border: `1px solid ${borderColor || 'hsl(var(--border))'}` }}>
            <label style={{ fontFamily: b, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, color: fg }}>
              Nome do Projeto
            </label>
            <div className="w-full px-3 py-2 rounded-lg" style={{ fontFamily: b, fontSize: '14px', border: `1px solid ${borderColor || 'hsl(var(--border))'}`, color: fg }}>
              Meu novo projeto
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Projetos', value: '12' }, { label: 'Tarefas', value: '48' }, { label: 'Equipe', value: '5' }].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ border: `1px solid ${borderColor || 'hsl(var(--border))'}` }}>
                <div style={{ fontFamily: h, fontSize: '24px', fontWeight: 700, color: fg }}>{s.value}</div>
                <div style={{ fontFamily: b, fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: fg }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // poster
  return (
    <div style={wrapStyle}>
      <div className="text-center space-y-4 py-8">
        <h1 style={{ fontFamily: h, fontSize: '100px', lineHeight: 0.95, fontWeight: 700, letterSpacing: '-0.03em', color: fg }}>
          DESIGN<br />FEST
        </h1>
        <div style={{ fontFamily: b, fontSize: '14px', opacity: 0.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: fg }}>
          São Paulo · 2026
        </div>
        <div className="w-16 h-px mx-auto" style={{ backgroundColor: fgColor ? `${fgColor}33` : 'hsl(var(--foreground) / 0.2)' }} />
        <p style={{ fontFamily: b, fontSize: '13px', opacity: 0.4, maxWidth: '300px', margin: '0 auto', lineHeight: 1.6, color: fg }}>
          Festival internacional de design gráfico e tipografia experimental
        </p>
      </div>
    </div>
  );
};

export default PreviewPanel;
