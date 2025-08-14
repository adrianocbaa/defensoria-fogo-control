import { Chart, registerables } from 'chart.js';
import { OLSResult } from './statisticsApi';

Chart.register(...registerables);

export interface ChartArtifact {
  name: string;
  url: string;
  type: 'qq-plot' | 'residuals-fitted' | 'observed-predicted' | 'elasticities';
}

export class ChartService {
  static async generateQQPlot(residuals: number[]): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Sort residuals
    const sortedResiduals = [...residuals].sort((a, b) => a - b);
    const n = sortedResiduals.length;
    
    // Calculate theoretical quantiles (normal distribution)
    const theoreticalQuantiles = sortedResiduals.map((_, i) => {
      const p = (i + 0.5) / n;
      return this.normalInverse(p);
    });

    const chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Resíduos',
          data: theoreticalQuantiles.map((theoretical, i) => ({
            x: theoretical,
            y: sortedResiduals[i]
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          pointRadius: 4
        }, {
          label: 'Linha de Referência',
          data: [
            { x: Math.min(...theoreticalQuantiles), y: Math.min(...sortedResiduals) },
            { x: Math.max(...theoreticalQuantiles), y: Math.max(...sortedResiduals) }
          ],
          type: 'line',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Q-Q Plot dos Resíduos'
          },
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Quantis Teóricos (Normal)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Quantis Amostrais (Resíduos)'
            }
          }
        }
      }
    });

    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataUrl = canvas.toDataURL('image/png');
    chart.destroy();
    return dataUrl;
  }

  static async generateResidualsVsFitted(residuals: number[], fitted: number[]): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Resíduos vs. Ajustados',
          data: fitted.map((fit, i) => ({
            x: fit,
            y: residuals[i]
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          pointRadius: 4
        }, {
          label: 'Linha Zero',
          data: [
            { x: Math.min(...fitted), y: 0 },
            { x: Math.max(...fitted), y: 0 }
          ],
          type: 'line',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Resíduos vs. Valores Ajustados'
          },
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Valores Ajustados'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Resíduos'
            }
          }
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataUrl = canvas.toDataURL('image/png');
    chart.destroy();
    return dataUrl;
  }

  static async generateObservedVsPredicted(observed: number[], fitted: number[]): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const minVal = Math.min(...observed, ...fitted);
    const maxVal = Math.max(...observed, ...fitted);

    const chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Observado vs. Previsto',
          data: observed.map((obs, i) => ({
            x: fitted[i],
            y: obs
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          pointRadius: 4
        }, {
          label: 'Linha Perfeita (Y=X)',
          data: [
            { x: minVal, y: minVal },
            { x: maxVal, y: maxVal }
          ],
          type: 'line',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Valores Observados vs. Previstos'
          },
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Valores Previstos'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Valores Observados'
            }
          }
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataUrl = canvas.toDataURL('image/png');
    chart.destroy();
    return dataUrl;
  }

  static async generateElasticitiesChart(elasticities: Record<string, number>): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const features = Object.keys(elasticities);
    const values = Object.values(elasticities);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: features,
        datasets: [{
          label: 'Elasticidades',
          data: values,
          backgroundColor: values.map(val => 
            val > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
          ),
          borderColor: values.map(val => 
            val > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Elasticidades das Variáveis'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Variáveis'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Elasticidade'
            }
          }
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataUrl = canvas.toDataURL('image/png');
    chart.destroy();
    return dataUrl;
  }

  static async generateAllCharts(results: OLSResult, observed: number[]): Promise<ChartArtifact[]> {
    const artifacts: ChartArtifact[] = [];

    try {
      const qqPlot = await this.generateQQPlot(results.residuals);
      artifacts.push({
        name: 'Q-Q Plot dos Resíduos',
        url: qqPlot,
        type: 'qq-plot'
      });

      const residualsFitted = await this.generateResidualsVsFitted(results.residuals, results.fitted);
      artifacts.push({
        name: 'Resíduos vs. Ajustados',
        url: residualsFitted,
        type: 'residuals-fitted'
      });

      const observedPredicted = await this.generateObservedVsPredicted(observed, results.fitted);
      artifacts.push({
        name: 'Observado vs. Previsto',
        url: observedPredicted,
        type: 'observed-predicted'
      });

      const elasticities = await this.generateElasticitiesChart(results.elasticities);
      artifacts.push({
        name: 'Elasticidades',
        url: elasticities,
        type: 'elasticities'
      });
    } catch (error) {
      console.error('Error generating charts:', error);
    }

    return artifacts;
  }

  // Helper function for normal inverse (approximation)
  private static normalInverse(p: number): number {
    // Beasley-Springer-Moro algorithm approximation
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
             ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
             (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
              ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }
  }
}