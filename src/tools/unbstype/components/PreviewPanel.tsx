import React from 'react';

interface PreviewPanelProps {
  headingFont: string;
  bodyFont: string;
  context: string;
}

const LOREM = "A tipografia é a arte e o processo de criação na composição de um texto, física ou digitalmente. Sua composição é realizada através da seleção de fontes, arranjo de layout e ajustes de espaçamento entre caracteres.";

const LOREM_LONG = `${LOREM}\n\nA escolha de uma boa combinação tipográfica é essencial para criar hierarquia visual, transmitir personalidade e garantir legibilidade. Um par tipográfico bem escolhido pode elevar completamente o design de qualquer projeto.`;

const PreviewPanel: React.FC<PreviewPanelProps> = ({ headingFont, bodyFont, context }) => {
  const h = `'${headingFont}', serif`;
  const b = `'${bodyFont}', sans-serif`;

  if (context === 'hero') {
    return (
      <div className="space-y-6 text-center max-w-2xl mx-auto">
        <h1 style={{ fontFamily: h, fontSize: '56px', lineHeight: 1.1, fontWeight: 700 }}>
          Design que transforma ideias em realidade
        </h1>
        <p style={{ fontFamily: b, fontSize: '20px', lineHeight: 1.6, opacity: 0.7 }}>
          Ferramentas profissionais para designers que buscam excelência visual.
        </p>
        <p style={{ fontFamily: b, fontSize: '15px', lineHeight: 1.8, opacity: 0.5, maxWidth: '500px', margin: '0 auto' }}>
          {LOREM}
        </p>
      </div>
    );
  }

  if (context === 'article') {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <h1 style={{ fontFamily: h, fontSize: '34px', lineHeight: 1.2, fontWeight: 700 }}>
          A importância da tipografia no design moderno
        </h1>
        <p style={{ fontFamily: b, fontSize: '11px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Por Designer Studio · 5 min de leitura
        </p>
        <p style={{ fontFamily: b, fontSize: '16px', lineHeight: 1.9 }}>{LOREM_LONG}</p>
        <h2 style={{ fontFamily: h, fontSize: '24px', lineHeight: 1.3, fontWeight: 700 }}>
          Hierarquia e contraste
        </h2>
        <p style={{ fontFamily: b, fontSize: '16px', lineHeight: 1.9 }}>{LOREM}</p>
      </div>
    );
  }

  if (context === 'ui') {
    return (
      <div className="max-w-md mx-auto space-y-5">
        {/* Simulated card */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h3 style={{ fontFamily: h, fontSize: '18px', fontWeight: 700 }}>Dashboard</h3>
          <p style={{ fontFamily: b, fontSize: '13px', opacity: 0.6 }}>Bem-vindo de volta ao seu painel de controle.</p>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-lg bg-foreground text-background" style={{ fontFamily: b, fontSize: '12px', fontWeight: 600 }}>
              Criar Projeto
            </div>
            <div className="px-4 py-2 rounded-lg border border-border" style={{ fontFamily: b, fontSize: '12px' }}>
              Configurações
            </div>
          </div>
        </div>
        {/* Simulated form */}
        <div className="border border-border rounded-xl p-5 space-y-3">
          <label style={{ fontFamily: b, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
            Nome do Projeto
          </label>
          <div className="w-full px-3 py-2 rounded-lg border border-border" style={{ fontFamily: b, fontSize: '14px' }}>
            Meu novo projeto
          </div>
          <label style={{ fontFamily: b, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>
            Descrição
          </label>
          <div className="w-full px-3 py-2 rounded-lg border border-border h-20" style={{ fontFamily: b, fontSize: '14px', opacity: 0.5 }}>
            Adicione uma descrição...
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Projetos', value: '12' }, { label: 'Tarefas', value: '48' }, { label: 'Equipe', value: '5' }].map(s => (
            <div key={s.label} className="border border-border rounded-lg p-3 text-center">
              <div style={{ fontFamily: h, fontSize: '24px', fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontFamily: b, fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // poster
  return (
    <div className="text-center space-y-4 py-8">
      <h1 style={{ fontFamily: h, fontSize: '100px', lineHeight: 0.95, fontWeight: 700, letterSpacing: '-0.03em' }}>
        DESIGN<br />FEST
      </h1>
      <div style={{ fontFamily: b, fontSize: '14px', opacity: 0.5, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
        São Paulo · 2026
      </div>
      <div className="w-16 h-px bg-foreground/20 mx-auto" />
      <p style={{ fontFamily: b, fontSize: '13px', opacity: 0.4, maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>
        Festival internacional de design gráfico e tipografia experimental
      </p>
    </div>
  );
};

export default PreviewPanel;
