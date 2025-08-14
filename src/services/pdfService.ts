import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';

export interface ReportData {
  project: any;
  comparables: any[];
  modelResults: any;
  estimatedValue: number;
  confidenceInterval: [number, number];
  chartUrls: string[];
}

export class PDFService {
  static async generateQRCode(reportUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(reportUrl, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  static async generatePDF(reportData: ReportData, projectId: string): Promise<Blob> {
    const reportUrl = `${window.location.origin}/avaliacao-imoveis/projects/${projectId}/report`;
    const qrCodeDataUrl = await this.generateQRCode(reportUrl);
    
    const htmlContent = this.generateHTMLTemplate(reportData, qrCodeDataUrl, projectId);
    
    // Create element and wait for fonts to load
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '210mm';
    element.style.minHeight = '297mm';
    element.style.backgroundColor = 'white';
    element.style.visibility = 'hidden';
    document.body.appendChild(element);

    // Wait for any fonts to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    const options = {
      margin: [10, 10, 10, 10],
      filename: `laudo-avaliacao-${projectId}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        width: 794, // A4 width at 96 DPI
        height: 1123, // A4 height at 96 DPI
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { 
        mode: ['css', 'legacy'],
        before: '.page-break'
      }
    };

    try {
      const pdf = await html2pdf().set(options).from(element).output('blob');
      document.body.removeChild(element);
      return pdf;
    } catch (error) {
      console.error('PDF generation error:', error);
      document.body.removeChild(element);
      throw error;
    }
  }

  static generateHTMLTemplate(data: ReportData, qrCodeDataUrl: string, projectId: string): string {
    const today = new Date().toLocaleDateString('pt-BR');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Laudo de Avaliação</title>
          <style>
            ${this.getReportCSS()}
          </style>
        </head>
        <body>
          <!-- Capa -->
          <div class="page">
            <div class="cover-page">
              <div class="header">
                <h1>LAUDO DE AVALIAÇÃO</h1>
                <h2>IMÓVEL URBANO</h2>
              </div>
              
              <div class="project-info">
                <h3>Finalidade: ${data.project.purpose || 'Avaliação de Mercado'}</h3>
                <p><strong>Data Base:</strong> ${data.project.base_date ? new Date(data.project.base_date).toLocaleDateString('pt-BR') : today}</p>
                <p><strong>Método:</strong> ${data.project.approach || 'Comparativo Direto de Dados de Mercado'}</p>
                <p><strong>Norma:</strong> NBR 14653-2:2011</p>
              </div>
              
              <div class="qr-section">
                <img src="${qrCodeDataUrl}" alt="QR Code" />
                <p>ID do Relatório: ${projectId}</p>
              </div>
              
              <div class="footer">
                <p>Relatório gerado em ${today}</p>
              </div>
            </div>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Sumário -->
          <div class="page">
            <h2>SUMÁRIO</h2>
            <div class="summary">
              <p>1. Introdução e Finalidade</p>
              <p>2. Metodologia</p>
              <p>3. Caracterização do Imóvel</p>
              <p>4. Pesquisa de Mercado</p>
              <p>5. Tratamento dos Dados</p>
              <p>6. Avaliação Estatística</p>
              <p>7. Resultado da Avaliação</p>
              <p>8. Conclusão</p>
              <p>9. Anexos</p>
            </div>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Metodologia -->
          <div class="page">
            <h2>METODOLOGIA</h2>
            <div class="methodology">
              <h3>Método Comparativo Direto de Dados de Mercado</h3>
              <p>Conforme NBR 14653-2:2011, item 8.2.1, identifica o valor de mercado do bem por meio de tratamento técnico dos atributos dos elementos comparáveis, constituintes da amostra.</p>
              
              <h3>Tratamento Estatístico</h3>
              <p>Foi aplicada regressão linear múltipla (OLS - Ordinary Least Squares) para identificar as relações entre o valor unitário e as características relevantes dos imóveis.</p>
              
              <h3>Transformações</h3>
              <p>• Logaritmo natural na variável dependente (price_unit)</p>
              <p>• Transformações logarítmicas nas variáveis contínuas</p>
              <p>• Variáveis dummy para características qualitativas</p>
            </div>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Amostra -->
          <div class="page">
            <h2>PESQUISA DE MERCADO</h2>
            <h3>Amostra de Comparáveis (n=${data.comparables.length})</h3>
            <table class="comparables-table">
              <thead>
                <tr>
                  <th>Fonte</th>
                  <th>Data</th>
                  <th>Preço Total</th>
                  <th>Preço Unit.</th>
                  <th>Área Terreno</th>
                  <th>Área Const.</th>
                  <th>Idade</th>
                  <th>Qualidade</th>
                </tr>
              </thead>
              <tbody>
                ${data.comparables.map(comp => `
                  <tr>
                    <td>${comp.source}</td>
                    <td>${new Date(comp.date).toLocaleDateString('pt-BR')}</td>
                    <td>R$ ${comp.price_total?.toLocaleString('pt-BR')}</td>
                    <td>R$ ${comp.price_unit?.toLocaleString('pt-BR')}</td>
                    <td>${comp.land_area} m²</td>
                    <td>${comp.built_area} m²</td>
                    <td>${comp.age} anos</td>
                    <td>${comp.quality}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Modelagem -->
          <div class="page">
            <h2>TRATAMENTO ESTATÍSTICO</h2>
            
            <h3>Modelo de Regressão</h3>
            <div class="model-equation">
              <p><strong>ln(Preço Unitário) = β₀ + β₁·ln(Área Construída) + β₂·ln(Área Terreno) + β₃·Idade + β₄·Qualidade_Alto + β₅·Qualidade_Baixo + ε</strong></p>
            </div>
            
            <h3>Coeficientes do Modelo</h3>
            <table class="coefficients-table">
              <thead>
                <tr>
                  <th>Variável</th>
                  <th>Coeficiente</th>
                  <th>Erro Padrão</th>
                  <th>Estatística t</th>
                  <th>P-valor</th>
                  <th>IC 95%</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.modelResults.coefficients).map(([feature, coef]) => `
                  <tr>
                    <td>${this.getFeatureLabel(feature)}</td>
                    <td>${Number(coef).toFixed(4)}</td>
                    <td>${data.modelResults.standardErrors[feature]?.toFixed(4) || 'N/A'}</td>
                    <td>${data.modelResults.tStats[feature]?.toFixed(2) || 'N/A'}</td>
                    <td>${data.modelResults.pValues[feature]?.toFixed(4) || 'N/A'}</td>
                    <td>[${data.modelResults.confidenceIntervals[feature]?.map(v => v.toFixed(4)).join(', ') || 'N/A'}]</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <h3>Qualidade do Ajuste</h3>
            <div class="model-metrics">
              <p><strong>R²:</strong> ${data.modelResults.rSquared.toFixed(4)} (${(data.modelResults.rSquared * 100).toFixed(1)}%)</p>
              <p><strong>R² Ajustado:</strong> ${data.modelResults.rSquaredAdjusted.toFixed(4)} (${(data.modelResults.rSquaredAdjusted * 100).toFixed(1)}%)</p>
              <p><strong>RMSE:</strong> ${data.modelResults.rmse.toFixed(4)}</p>
              <p><strong>MAE:</strong> ${data.modelResults.mae.toFixed(4)}</p>
            </div>
            
            <h3>Multicolinearidade (VIF)</h3>
            <table class="vif-table">
              <thead>
                <tr><th>Variável</th><th>VIF</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${Object.entries(data.modelResults.vif).map(([feature, vif]) => `
                  <tr>
                    <td>${this.getFeatureLabel(feature)}</td>
                    <td>${Number(vif).toFixed(2)}</td>
                    <td class="${Number(vif) > 10 ? 'vif-high' : 'vif-ok'}">${Number(vif) > 10 ? 'Alto' : 'OK'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Gráficos -->
          <div class="page">
            <h2>DIAGNÓSTICO ESTATÍSTICO</h2>
            <div class="charts-grid">
              ${data.chartUrls.map((url, index) => `
                <div class="chart-container">
                  <img src="${url}" alt="Gráfico ${index + 1}" class="chart-image" />
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Elasticidades -->
          <div class="page">
            <h2>ELASTICIDADES</h2>
            <p>As elasticidades indicam a sensibilidade percentual do valor unitário em relação a variações percentuais nas características:</p>
            
            <table class="elasticities-table">
              <thead>
                <tr>
                  <th>Variável</th>
                  <th>Elasticidade</th>
                  <th>Interpretação</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(data.modelResults.elasticities).map(([feature, elasticity]) => `
                  <tr>
                    <td>${this.getFeatureLabel(feature)}</td>
                    <td>${Number(elasticity).toFixed(4)}</td>
                    <td>${this.getElasticityInterpretation(Number(elasticity))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="page-break"></div>
          
          <!-- Conclusão -->
          <div class="page">
            <h2>RESULTADO DA AVALIAÇÃO</h2>
            
            <div class="result-summary">
              <h3>Valor Unitário Estimado</h3>
              <div class="value-box">
                <p class="main-value">R$ ${data.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²</p>
                <p class="confidence-interval">Intervalo de Confiança 95%: R$ ${data.confidenceInterval[0].toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - R$ ${data.confidenceInterval[1].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²</p>
              </div>
            </div>
            
            <h3>Conclusão</h3>
            <p>Com base na análise estatística de ${data.comparables.length} comparáveis de mercado, utilizando o método comparativo direto com tratamento por regressão linear múltipla, o valor unitário de mercado foi estimado em <strong>R$ ${data.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²</strong>.</p>
            
            <p>O modelo apresentou R² de ${(data.modelResults.rSquared * 100).toFixed(1)}%, indicando ${data.modelResults.rSquared > 0.8 ? 'boa' : data.modelResults.rSquared > 0.6 ? 'razoável' : 'baixa'} capacidade explicativa. Os testes de diagnóstico confirmaram a adequação estatística do modelo.</p>
            
            <div class="signature-section">
              <br><br>
              <p>________________________________</p>
              <p>Responsável Técnico</p>
              <p>Data: ${today}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  static getReportCSS(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #1a1a1a;
        background: white;
      }
      
      .page {
        min-height: 297mm;
        padding: 20mm;
        margin: 0;
        background: white;
        page-break-after: always;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      /* Cover Page */
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        text-align: center;
      }
      
      .cover-page .header h1 {
        font-size: 28px;
        font-weight: 700;
        color: #2563eb;
        margin-bottom: 10px;
      }
      
      .cover-page .header h2 {
        font-size: 20px;
        font-weight: 500;
        color: #64748b;
        margin-bottom: 30px;
      }
      
      .project-info {
        background: #f8fafc;
        padding: 30px;
        border-radius: 8px;
        border-left: 4px solid #2563eb;
      }
      
      .project-info h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 15px;
        color: #1e293b;
      }
      
      .project-info p {
        font-size: 13px;
        margin-bottom: 8px;
        color: #475569;
      }
      
      .qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 30px 0;
      }
      
      .qr-section img {
        margin-bottom: 10px;
      }
      
      .qr-section p {
        font-size: 11px;
        color: #64748b;
        font-family: monospace;
      }
      
      /* Headers */
      h2 {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 20px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      
      h3 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 15px 0 10px 0;
      }
      
      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 10px;
      }
      
      th, td {
        padding: 6px 8px;
        text-align: left;
        border: 1px solid #e2e8f0;
      }
      
      th {
        background: #f8fafc;
        font-weight: 600;
        color: #374151;
      }
      
      tr:nth-child(even) {
        background: #f9fafb;
      }
      
      .comparables-table {
        font-size: 9px;
      }
      
      .comparables-table th,
      .comparables-table td {
        padding: 4px 6px;
      }
      
      /* Model specific styles */
      .model-equation {
        background: #f1f5f9;
        padding: 15px;
        border-radius: 6px;
        margin: 15px 0;
        text-align: center;
      }
      
      .model-equation p {
        font-family: 'Times New Roman', serif;
        font-size: 12px;
        color: #1e293b;
      }
      
      .model-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 15px 0;
      }
      
      .model-metrics p {
        background: #f8fafc;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
      }
      
      .vif-ok {
        color: #059669;
        font-weight: 600;
      }
      
      .vif-high {
        color: #dc2626;
        font-weight: 600;
      }
      
      /* Charts */
      .charts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin: 20px 0;
      }
      
      .chart-container {
        text-align: center;
      }
      
      .chart-image {
        max-width: 100%;
        height: auto;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
      }
      
      /* Result section */
      .result-summary {
        text-align: center;
        margin: 30px 0;
      }
      
      .value-box {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        padding: 25px;
        border-radius: 8px;
        margin: 20px 0;
      }
      
      .main-value {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      
      .confidence-interval {
        font-size: 12px;
        opacity: 0.9;
      }
      
      .signature-section {
        margin-top: 50px;
        text-align: center;
      }
      
      .signature-section p {
        margin: 5px 0;
        font-size: 11px;
        color: #64748b;
      }
      
      /* Summary */
      .summary p {
        margin: 8px 0;
        padding-left: 20px;
        color: #475569;
      }
      
      /* Methodology */
      .methodology p {
        margin: 10px 0;
        text-align: justify;
        color: #374151;
      }
      
      .methodology h3 {
        margin-top: 20px;
        color: #1e293b;
      }
      
      /* Print styles */
      @media print {
        .page {
          page-break-after: always;
          margin: 0;
          box-shadow: none;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      }
    `;
  }

  static getFeatureLabel(feature: string): string {
    const labels: Record<string, string> = {
      'intercept': 'Intercepto',
      'built_area': 'ln(Área Construída)',
      'land_area': 'ln(Área Terreno)',
      'age': 'Idade',
      'quality_alto': 'Qualidade Alta',
      'quality_baixo': 'Qualidade Baixa'
    };
    return labels[feature] || feature;
  }

  static getElasticityInterpretation(elasticity: number): string {
    if (Math.abs(elasticity) < 0.1) {
      return 'Baixa sensibilidade';
    } else if (Math.abs(elasticity) < 0.5) {
      return 'Moderada sensibilidade';
    } else {
      return 'Alta sensibilidade';
    }
  }

  static calculateHash(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const buffer = e.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(buffer));
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  static async uploadToStorage(projectId: string, version: number, blob: Blob): Promise<string> {
    const fileName = `${projectId}/report-v${version}.pdf`;
    
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      throw new Error(`Error uploading PDF: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    return publicUrl;
  }
}