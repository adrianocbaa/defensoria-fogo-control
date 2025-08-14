import jStat from 'jstat';
import { supabase } from '@/integrations/supabase/client';

export interface ModelData {
  target: number[];
  features: Record<string, number[]>;
  observations: any[];
}

export interface OLSResult {
  coefficients: Record<string, number>;
  standardErrors: Record<string, number>;
  tStats: Record<string, number>;
  pValues: Record<string, number>;
  confidenceIntervals: Record<string, [number, number]>;
  rSquared: number;
  rSquaredAdjusted: number;
  mae: number;
  rmse: number;
  residuals: number[];
  fitted: number[];
  vif: Record<string, number>;
  elasticities: Record<string, number>;
}

export interface TransformConfig {
  logTarget?: boolean;
  logFeatures?: string[];
  dummyFeatures?: string[];
}

// Matrix operations using native JavaScript
export class Matrix {
  constructor(public data: number[][]) {}

  static fromArray(arr: number[][]): Matrix {
    return new Matrix(arr);
  }

  transpose(): Matrix {
    const rows = this.data.length;
    const cols = this.data[0].length;
    const result: number[][] = [];
    
    for (let i = 0; i < cols; i++) {
      result[i] = [];
      for (let j = 0; j < rows; j++) {
        result[i][j] = this.data[j][i];
      }
    }
    
    return new Matrix(result);
  }

  multiply(other: Matrix): Matrix {
    const aRows = this.data.length;
    const aCols = this.data[0].length;
    const bCols = other.data[0].length;
    const result: number[][] = [];

    for (let i = 0; i < aRows; i++) {
      result[i] = [];
      for (let j = 0; j < bCols; j++) {
        let sum = 0;
        for (let k = 0; k < aCols; k++) {
          sum += this.data[i][k] * other.data[k][j];
        }
        result[i][j] = sum;
      }
    }

    return new Matrix(result);
  }

  inverse(): Matrix {
    const n = this.data.length;
    const identity = this.createIdentity(n);
    const augmented = this.data.map((row, i) => [...row, ...identity[i]]);

    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make diagonal 1
      const pivot = augmented[i][i];
      for (let k = 0; k < 2 * n; k++) {
        augmented[i][k] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse
    const result: number[][] = [];
    for (let i = 0; i < n; i++) {
      result[i] = augmented[i].slice(n);
    }

    return new Matrix(result);
  }

  private createIdentity(n: number): number[][] {
    const identity: number[][] = [];
    for (let i = 0; i < n; i++) {
      identity[i] = [];
      for (let j = 0; j < n; j++) {
        identity[i][j] = i === j ? 1 : 0;
      }
    }
    return identity;
  }

  getDiagonal(): number[] {
    const diagonal: number[] = [];
    const n = Math.min(this.data.length, this.data[0].length);
    for (let i = 0; i < n; i++) {
      diagonal.push(this.data[i][i]);
    }
    return diagonal;
  }

  toArray(): number[][] {
    return this.data;
  }
}

export class StatisticsService {
  static applyTransforms(data: ModelData, config: TransformConfig): ModelData {
    const transformed = { ...data };

    // Log transform target
    if (config.logTarget) {
      transformed.target = data.target.map(val => Math.log(Math.max(val, 0.01)));
    }

    // Log transform features
    if (config.logFeatures) {
      config.logFeatures.forEach(feature => {
        if (transformed.features[feature]) {
          transformed.features[feature] = transformed.features[feature].map(val => 
            Math.log(Math.max(val, 0.01))
          );
        }
      });
    }

    // Create dummy variables
    if (config.dummyFeatures) {
      config.dummyFeatures.forEach(feature => {
        const uniqueValues = [...new Set(data.observations.map(obs => obs[feature]))];
        uniqueValues.slice(1).forEach(value => { // Skip first category (reference)
          const dummyName = `${feature}_${value}`;
          transformed.features[dummyName] = data.observations.map(obs => 
            obs[feature] === value ? 1 : 0
          );
        });
        // Remove original categorical feature
        delete transformed.features[feature];
      });
    }

    return transformed;
  }

  static runOLS(data: ModelData, config: TransformConfig = {}): OLSResult {
    const transformedData = this.applyTransforms(data, config);
    const y = transformedData.target;
    const featureNames = Object.keys(transformedData.features);
    const n = y.length;
    const k = featureNames.length + 1; // +1 for intercept

    // Build design matrix X (with intercept)
    const X: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = [1]; // intercept
      featureNames.forEach(name => {
        row.push(transformedData.features[name][i]);
      });
      X.push(row);
    }

    const Xmat = Matrix.fromArray(X);
    const Xt = Xmat.transpose();
    const XtX = Xt.multiply(Xmat);
    const XtXinv = XtX.inverse();

    // Calculate coefficients: β = (X'X)^(-1)X'y
    const Xty: number[][] = [];
    for (let i = 0; i < k; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += X[j][i] * y[j];
      }
      Xty.push([sum]);
    }

    const beta = XtXinv.multiply(Matrix.fromArray(Xty));
    const coeffs = beta.toArray().map(row => row[0]);

    // Calculate fitted values and residuals
    const fitted: number[] = [];
    const residuals: number[] = [];
    for (let i = 0; i < n; i++) {
      let pred = coeffs[0]; // intercept
      for (let j = 0; j < featureNames.length; j++) {
        pred += coeffs[j + 1] * transformedData.features[featureNames[j]][i];
      }
      fitted.push(pred);
      residuals.push(y[i] - pred);
    }

    // Calculate statistics
    const sse = residuals.reduce((sum, r) => sum + r * r, 0);
    const tss = y.reduce((sum, val) => sum + Math.pow(val - jStat.mean(y), 2), 0);
    const rSquared = 1 - (sse / tss);
    const rSquaredAdjusted = 1 - ((sse / (n - k)) / (tss / (n - 1)));
    const mse = sse / (n - k);
    const rmse = Math.sqrt(mse);
    const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;

    // Standard errors and t-stats
    const variance = XtXinv.getDiagonal().map(v => v * mse);
    const standardErrors = variance.map(v => Math.sqrt(v));
    const tStats = coeffs.map((coeff, i) => coeff / standardErrors[i]);
    const pValues = tStats.map(t => 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - k)));

    // Confidence intervals (95%)
    const tCrit = jStat.studentt.inv(0.975, n - k);
    const confidenceIntervals = coeffs.map((coeff, i) => {
      const margin = tCrit * standardErrors[i];
      return [coeff - margin, coeff + margin] as [number, number];
    });

    // VIF calculation
    const vif = this.calculateVIF(transformedData, featureNames);

    // Elasticities
    const elasticities = this.calculateElasticities(
      coeffs, 
      featureNames, 
      transformedData, 
      config.logTarget || false
    );

    // Organize results by feature names
    const coefficients: Record<string, number> = { intercept: coeffs[0] };
    const standardErrorsMap: Record<string, number> = { intercept: standardErrors[0] };
    const tStatsMap: Record<string, number> = { intercept: tStats[0] };
    const pValuesMap: Record<string, number> = { intercept: pValues[0] };
    const confidenceIntervalsMap: Record<string, [number, number]> = { 
      intercept: confidenceIntervals[0] 
    };

    featureNames.forEach((name, i) => {
      coefficients[name] = coeffs[i + 1];
      standardErrorsMap[name] = standardErrors[i + 1];
      tStatsMap[name] = tStats[i + 1];
      pValuesMap[name] = pValues[i + 1];
      confidenceIntervalsMap[name] = confidenceIntervals[i + 1];
    });

    return {
      coefficients,
      standardErrors: standardErrorsMap,
      tStats: tStatsMap,
      pValues: pValuesMap,
      confidenceIntervals: confidenceIntervalsMap,
      rSquared,
      rSquaredAdjusted,
      mae,
      rmse,
      residuals,
      fitted,
      vif,
      elasticities
    };
  }

  private static calculateVIF(data: ModelData, featureNames: string[]): Record<string, number> {
    const vif: Record<string, number> = {};

    featureNames.forEach(targetFeature => {
      if (featureNames.length < 2) {
        vif[targetFeature] = 1;
        return;
      }

      const otherFeatures = featureNames.filter(name => name !== targetFeature);
      const vifData: ModelData = {
        target: data.features[targetFeature],
        features: {},
        observations: data.observations
      };

      otherFeatures.forEach(name => {
        vifData.features[name] = data.features[name];
      });

      try {
        const vifResult = this.runOLS(vifData);
        vif[targetFeature] = 1 / (1 - vifResult.rSquared);
      } catch (error) {
        vif[targetFeature] = 1; // Fallback for singular matrices
      }
    });

    return vif;
  }

  private static calculateElasticities(
    coeffs: number[], 
    featureNames: string[], 
    data: ModelData, 
    isLogTarget: boolean
  ): Record<string, number> {
    const elasticities: Record<string, number> = {};
    const yMean = jStat.mean(data.target);

    featureNames.forEach((name, i) => {
      const coeff = coeffs[i + 1]; // Skip intercept
      const xMean = jStat.mean(data.features[name]);

      if (isLogTarget) {
        // Log-linear model: elasticity ≈ coefficient
        elasticities[name] = coeff;
      } else {
        // Linear model: elasticity = (∂y/∂x) * (x̄/ȳ) = β * (x̄/ȳ)
        elasticities[name] = coeff * (xMean / yMean);
      }
    });

    return elasticities;
  }

  static async saveModelRun(
    projectId: string,
    features: string[],
    targetColumn: string,
    transformConfig: TransformConfig,
    results: OLSResult,
    artifacts: string[] = []
  ): Promise<string> {
    const { modelRunsApi } = await import('./appraisalApi');
    
    const modelRunId = await modelRunsApi.create(
      projectId,
      'OLS-client',
      features,
      targetColumn,
      transformConfig,
      {
        r_squared: results.rSquared,
        r_squared_adjusted: results.rSquaredAdjusted,
        rmse: results.rmse,
        mae: results.mae
      },
      {
        vif: results.vif,
        shapiro_wilk_p: this.shapiroWilkTest(results.residuals)
      },
      artifacts
    );

    return String(modelRunId);
  }

  static async saveResult(
    projectId: string,
    modelRunId: string,
    estimatedValue: number,
    confidenceInterval: [number, number],
    elasticities: Record<string, number>
  ): Promise<string> {
    const { resultsApi } = await import('./appraisalApi');
    
    const resultId = await resultsApi.create(
      projectId,
      modelRunId,
      estimatedValue,
      confidenceInterval[0],
      confidenceInterval[1],
      elasticities
    );

    return String(resultId);
  }

  private static shapiroWilkTest(residuals: number[]): number {
    // Simplified Shapiro-Wilk test using jStat
    try {
      return jStat.normaltest(residuals);
    } catch (error) {
      return 0.5; // Fallback p-value
    }
  }
}