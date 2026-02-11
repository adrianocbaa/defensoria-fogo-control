import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DIAGRAM_MAIN = `graph TD
    START([Início]) --> A[Admin cadastra Nova Obra]
    A --> A1{Dados obrigatórios\npreenchidos?}
    A1 -->|Não| A2[Preencher: Nome, Município,\nTipo, Valor, Empresa, Fiscal]
    A2 --> A1
    A1 -->|Sim| A3[Obra criada com status\n'Em Andamento']

    A3 --> B{Fiscal titular\ndefine acessos}
    B --> B1[Adicionar Fiscais Substitutos]
    B --> B2[Vincular Contratada]
    B --> B3[Conceder Acesso Autorizado]
    B1 & B2 & B3 --> C

    C[Obra pronta para gestão] --> D{Qual processo\niniciar?}

    D -->|Orçamento| E1[Importar Planilha\nou cadastrar itens]
    E1 --> E2{Itens válidos?}
    E2 -->|Não| E1
    E2 -->|Sim| E3[Orçamento salvo]
    E3 --> E4[Gerar Curva ABC]
    E4 --> D

    D -->|Cronograma| F1[Importar cronograma\nfinanceiro .xlsx]
    F1 --> F2[Definir etapas e períodos]
    F2 --> F3[Comparar Previsto x Executado]
    F3 --> D

    D -->|RDO| G1[Criar RDO do dia]
    G1 --> G2[Preencher:\nAtividades, Mão de Obra,\nEquipamentos, Ocorrências]
    G2 --> G3[Anexar Evidências fotográficas]
    G3 --> G4{Fiscal assina?}
    G4 -->|Sim| G5[RDO bloqueado p/ edição]
    G4 -->|Não| G2
    G5 --> G6{Contratada assina?}
    G6 -->|Sim| G7[RDO aprovado\nAmbas assinaturas]
    G6 -->|Não| G8{Reprovar?}
    G8 -->|Sim| G9[Limpar assinaturas\nStatus: preenchendo]
    G9 --> G2
    G8 -->|Não| G6
    G7 --> G10[PDF disponível\np/ download]
    G10 --> D

    D -->|Medição| H1[Criar sessão de medição\nsequência N]
    H1 --> H2{Modo de\npreenchimento?}
    H2 -->|Manual| H3[Preencher itens\nqtd e percentual]
    H2 -->|Importar do RDO| H4[Selecionar período\nde RDOs]
    H4 --> H5[Importar atividades\nexecutadas automaticamente]
    H5 --> H3
    H3 --> H6{Valores consistentes?\nPai = Soma Filhos}
    H6 -->|Não| H3
    H6 -->|Sim| H7[Fechar medição]
    H7 --> H8[Gerar relatório\nWord / PDF]
    H8 --> D

    D -->|Aditivos| I1{Tipo de aditivo?}
    I1 -->|Valor| I2[Adicionar itens\nnovos ou suprimidos]
    I1 -->|Prazo| I3[Informar dias\nadicionais]
    I2 --> I4[Salvar sessão de aditivo]
    I3 --> I5[Atualizar previsão\nde término]
    I4 & I5 --> D

    D -->|Checklist| J1[Itens padrão criados\nautomaticamente]
    J1 --> J2[Fiscal atualiza situação\nde cada item]
    J2 --> J3{Todos concluídos?}
    J3 -->|Sim| J4[Checklist 100%]
    J3 -->|Não| J2
    J4 --> D

    D -->|Concluir Obra| K1{Fiscal altera status\np/ Concluída}
    K1 --> K2[Informar Data de\nTérmino Real]
    K2 --> K3[RDO bloqueado:\nnovos e existentes]
    K3 --> K4[Notificações de\natraso desativadas]
    K4 --> K5([Obra Concluída])

    D -->|Paralisar| L1[Alterar status\np/ Paralisada]
    L1 --> L2{Retomar?}
    L2 -->|Sim| L3[Status volta p/\nEm Andamento]
    L3 --> D
    L2 -->|Não| L4([Obra Paralisada])

    D -->|Tornar Pública| M1[Ativar flag is_public]
    M1 --> M2[Páginas públicas:\nDetalhes, Medições,\nRDO, Checklist]
    M2 --> D`;

const DIAGRAM_PERMISSIONS = `graph TD
    subgraph Permissões por Ação
        P1[Admin] -->|Todas as ações\nem todas as obras| TUDO["✅ Acesso total"]
        
        P2[Fiscal Titular] -->|Editar obra\nassignada| ED1["✅ Editar sempre"]
        P2 -->|Gerenciar substitutos\ne acessos| ED2["✅ Exclusivo"]
        
        P3[Fiscal Substituto] --> SC1{Status da obra?}
        SC1 -->|Em Andamento| ED3["✅ Pode editar"]
        SC1 -->|Outro status| ED4["❌ Somente leitura"]
        
        P4[Contratada] -->|Vinculada à obra| CT1["✅ Ver medições\n✅ Preencher RDO\n✅ Assinar RDO"]
        P4 -->|Não vinculada| CT2["❌ Sem acesso"]
        
        P5[Setor DIF] -->|Editar obras| DIF1["✅ Permitido"]
        P6["Setor 2ª SUB"] -->|Editar obras| SUB1["❌ Bloqueado"]
    end`;

export default function FluxogramaObras() {
  const mainRef = useRef<HTMLDivElement>(null);
  const permRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 30,
        rankSpacing: 40,
      },
      themeVariables: {
        fontSize: '14px',
      },
    });

    const renderDiagrams = async () => {
      try {
        if (mainRef.current) {
          const { svg: svg1 } = await mermaid.render('mermaid-main', DIAGRAM_MAIN);
          mainRef.current.innerHTML = svg1;
        }
        if (permRef.current) {
          const { svg: svg2 } = await mermaid.render('mermaid-perm', DIAGRAM_PERMISSIONS);
          permRef.current.innerHTML = svg2;
        }
        setRendered(true);
      } catch (e) {
        console.error('Mermaid render error:', e);
      }
    };

    renderDiagrams();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fluxograma-print-page">
      {/* Controls - hidden on print */}
      <div className="no-print fixed top-4 left-4 z-50 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir A3
        </Button>
      </div>

      {/* Page 1 - Main flowchart */}
      <div className="print-page-a3">
        <div className="print-header">
          <h1>Fluxograma do Módulo Obras — SIDIF</h1>
          <p>Sistema de Gestão de Obras Públicas — DPE-MT</p>
        </div>
        <div className="print-diagram-container" ref={mainRef}>
          <p className="text-muted-foreground text-center py-10">Carregando diagrama...</p>
        </div>
      </div>

      {/* Page 2 - Permissions */}
      <div className="print-page-a3 print-page-break">
        <div className="print-header">
          <h1>Permissões e Papéis — Módulo Obras</h1>
          <p>Matriz de acesso por perfil de usuário</p>
        </div>
        <div className="print-diagram-container" ref={permRef}>
          <p className="text-muted-foreground text-center py-10">Carregando diagrama...</p>
        </div>
      </div>

      <style>{`
        .fluxograma-print-page {
          background: white;
          color: black;
        }

        .print-page-a3 {
          width: 420mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          box-sizing: border-box;
          background: white;
        }

        .print-header {
          text-align: center;
          margin-bottom: 10mm;
          padding-bottom: 5mm;
          border-bottom: 2px solid #333;
        }

        .print-header h1 {
          font-size: 24pt;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #1a1a1a;
        }

        .print-header p {
          font-size: 12pt;
          color: #555;
          margin: 0;
        }

        .print-diagram-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: visible;
        }

        .print-diagram-container svg {
          max-width: 100%;
          height: auto;
        }

        .print-page-break {
          page-break-before: always;
        }

        @media print {
          @page {
            size: A3 landscape;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page-a3 {
            width: 100%;
            min-height: auto;
            padding: 5mm;
            margin: 0;
          }

          .print-diagram-container svg {
            max-width: 100%;
            max-height: 260mm;
          }
        }

        @media screen {
          .fluxograma-print-page {
            padding: 80px 20px 40px;
          }

          .print-page-a3 {
            border: 1px solid #ddd;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
        }
      `}</style>
    </div>
  );
}
